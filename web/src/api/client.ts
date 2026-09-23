import type { Tokens } from "@/api/types";

const REFRESH_KEY = "meridian.refresh";
export const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

let accessToken: string | null = null;
let refreshInFlight: Promise<boolean> | null = null;
let onSessionExpired: (() => void) | null = null;

export class ApiError extends Error {
  status: number;
  silent: boolean;

  constructor(status: number, message: string, silent = false) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.silent = silent;
  }
}

export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

export function setSession(tokens: Tokens) {
  accessToken = tokens.access_token;
  if (!tokens.refresh_token) {
    return;
  }
  try {
    sessionStorage.setItem(REFRESH_KEY, tokens.refresh_token);
  } catch {
    accessToken = null;
    throw new Error("This browser could not store your session.");
  }
}

export function clearSession() {
  accessToken = null;
  try {
    sessionStorage.removeItem(REFRESH_KEY);
  } catch {
    accessToken = null;
  }
}

export function hasRefreshToken(): boolean {
  return Boolean(sessionStorage.getItem(REFRESH_KEY));
}

function detailMessage(path: string, status: number, payload: unknown): string {
  const detail =
    payload &&
    typeof payload === "object" &&
    "detail" in payload &&
    typeof payload.detail === "string"
      ? payload.detail
      : "";
  const isLogin = /\/login$/.test(path);
  const leaked = /response=|keycloak|traceback/i.test(detail);

  if (isLogin && (status === 401 || detail === "User not found" || detail === "Invalid username or password")) {
    return "Sign-in failed. Check your username and password.";
  }

  if (detail && !leaked) {
    return detail;
  }

  if (status === 403) {
    return "You do not have access to this page.";
  }

  if (status === 404) {
    return "Not found.";
  }

  return "Something went wrong. Try again.";
}

async function readPayload(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined;
  }
  const text = await response.text();
  if (!text) {
    return undefined;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError(response.status, "The server returned an unexpected response.");
  }
}

async function refreshSession(): Promise<boolean> {
  let refreshToken: string | null = null;
  try {
    refreshToken = sessionStorage.getItem(REFRESH_KEY);
  } catch {
    clearSession();
    return false;
  }
  if (!refreshToken) {
    clearSession();
    return false;
  }

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const response = await fetch(`${API_BASE}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        const payload = await readPayload(response);
        if (!response.ok || !payload || typeof payload !== "object" || !("access_token" in payload)) {
          clearSession();
          return false;
        }
        setSession(payload as Tokens);
        return true;
      } catch {
        clearSession();
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }

  return refreshInFlight;
}

type ApiOptions = RequestInit & {
  auth?: boolean;
};

export async function api<T>(path: string, options: ApiOptions = {}, allowRefresh = true): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (options.auth !== false && accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(0, "The network request failed. Check your connection and try again.");
  }

  const isAuthPath = path.startsWith("/auth/refresh") || path.endsWith("/login");
  if (response.status === 401 && !isAuthPath && hasRefreshToken()) {
    if (allowRefresh) {
      const refreshed = await refreshSession();
      if (refreshed) {
        return api<T>(path, options, false);
      }
    }
    clearSession();
    const expired = new ApiError(401, "Your session expired. Sign in again.", true);
    onSessionExpired?.();
    throw expired;
  }

  const payload = await readPayload(response);
  if (!response.ok) {
    throw new ApiError(response.status, detailMessage(path, response.status, payload));
  }
  return payload as T;
}

export async function restoreSession(): Promise<boolean> {
  if (!hasRefreshToken()) {
    return false;
  }
  return refreshSession();
}
