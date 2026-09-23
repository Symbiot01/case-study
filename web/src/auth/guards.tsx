import { Navigate, useLocation, useParams } from "react-router-dom";

import { useAuth } from "@/auth/session";
import { SystemState } from "@/components/ui/SystemState";
import { safeNext } from "@/lib/schemas";

function sameBrand(left: string, right: string) {
  return left.localeCompare(right, undefined, { sensitivity: "accent" }) === 0;
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return <p className="px-5 py-16 text-sm text-muted md:px-10">Loading your session…</p>;
  }

  if (!user) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return children;
}

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, status } = useAuth();

  if (status === "loading") {
    return <p className="px-5 py-16 text-sm text-muted md:px-10">Loading your session…</p>;
  }

  if (!user) {
    return <Navigate to="/login?next=/admin" replace />;
  }

  if (user.role !== "ADMIN") {
    return (
      <SystemState
        title="You can’t open this page."
        body="Only a platform admin can open this."
        action={{ href: "/", label: "Back to store" }}
      />
    );
  }

  return children;
}

export function RequireTenant({ children }: { children: React.ReactNode }) {
  const { user, status } = useAuth();
  const params = useParams();
  const tenant = params.tenant ?? "";
  const loginPath = `/${encodeURIComponent(tenant)}/login`;

  if (status === "loading") {
    return <p className="px-5 py-16 text-sm text-muted md:px-10">Loading your session…</p>;
  }

  if (!user) {
    return <Navigate to={loginPath} replace />;
  }

  if (user.role !== "TENANT" || !user.tenant_name || !sameBrand(user.tenant_name, tenant)) {
    return (
      <SystemState
        title="You can’t open this page."
        body={
          user.tenant_name
            ? `Only ${tenant} staff can manage this brand. Your studio is ${user.tenant_name}.`
            : "Only brand staff can manage a studio."
        }
        action={{ href: "/", label: "Back to store" }}
        secondary={
          user.tenant_name
            ? { href: `/${encodeURIComponent(user.tenant_name)}/studio`, label: "Go to your studio" }
            : undefined
        }
      />
    );
  }

  return children;
}

export function destinationAfterLogin(role: "USER" | "TENANT" | "ADMIN", next: string | null) {
  const safe = safeNext(next);
  if (safe) {
    return safe;
  }
  if (role === "ADMIN") {
    return "/admin";
  }
  return "/";
}
