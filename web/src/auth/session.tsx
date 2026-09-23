import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { api, clearSession, restoreSession, setSession, setSessionExpiredHandler } from "@/api/client";
import type { Me, Tokens } from "@/api/types";
import { toastStore } from "@/lib/toast";

const STUDIO_NOTE = "meridian.studioNote";

type LoginInput = {
  username: string;
  password: string;
  tenantName?: string;
};

type AuthContextValue = {
  user: Me | null;
  status: "loading" | "anonymous" | "ready";
  studioNote: boolean;
  dismissStudioNote: () => void;
  login: (input: LoginInput) => Promise<Me>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location);
  const readyRef = useRef(false);
  const [user, setUser] = useState<Me | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");
  const [studioNote, setStudioNote] = useState(false);

  locationRef.current = location;

  useEffect(() => {
    setSessionExpiredHandler(() => {
      setUser(null);
      setStatus("anonymous");
      setStudioNote(false);
      sessionStorage.removeItem(STUDIO_NOTE);
      if (!readyRef.current) {
        return;
      }
      toastStore.failure("Your session expired. Sign in again.");
      const path = locationRef.current.pathname;
      const studio = path.match(/^\/([^/]+)\/studio\/?$/);
      if (studio) {
        navigate(`/${studio[1]}/login`, { replace: true });
        return;
      }
      if (path === "/login" || path.endsWith("/login")) {
        return;
      }
      const next = encodeURIComponent(`${path}${locationRef.current.search}`);
      navigate(`/login?next=${next}`, { replace: true });
    });
  }, [navigate]);

  useEffect(() => {
    let active = true;

    async function boot() {
      const restored = await restoreSession();
      if (!active) {
        return;
      }
      if (!restored) {
        setStatus("anonymous");
        readyRef.current = true;
        return;
      }
      try {
        const me = await api<Me>("/auth/me");
        if (!active) {
          return;
        }
        setUser(me);
        let noted = false;
        try {
          noted = sessionStorage.getItem(STUDIO_NOTE) === "1";
        } catch {
          noted = false;
        }
        setStudioNote(me.role === "TENANT" && noted);
        setStatus("ready");
      } catch {
        clearSession();
        if (!active) {
          return;
        }
        setStatus("anonymous");
      } finally {
        readyRef.current = true;
      }
    }

    void boot();
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      studioNote,
      dismissStudioNote() {
        sessionStorage.removeItem(STUDIO_NOTE);
        setStudioNote(false);
      },
      async login(input) {
        const path = input.tenantName
          ? `/auth/${encodeURIComponent(input.tenantName)}/login`
          : "/auth/login";
        const tokens = await api<Tokens>(path, {
          method: "POST",
          auth: false,
          body: JSON.stringify({ username: input.username, password: input.password }),
        });
        setSession(tokens);
        const me = await api<Me>("/auth/me");
        setUser(me);
        setStatus("ready");
        const showNote = !input.tenantName && me.role === "TENANT";
        try {
          if (showNote) {
            sessionStorage.setItem(STUDIO_NOTE, "1");
          } else {
            sessionStorage.removeItem(STUDIO_NOTE);
          }
        } catch {
          // The studio reminder is optional. Sign-in still stands.
        }
        setStudioNote(showNote);
        return me;
      },
      logout() {
        clearSession();
        sessionStorage.removeItem(STUDIO_NOTE);
        setUser(null);
        setStudioNote(false);
        setStatus("anonymous");
        navigate("/");
      },
    }),
    [navigate, status, studioNote, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return value;
}
