import { Link } from "react-router-dom";

import { RequireAuth } from "@/auth/guards";
import { useAuth } from "@/auth/session";
import { Button } from "@/components/ui/Button";
import { useDocumentTitle } from "@/lib/title";

const roleLabel = {
  USER: "Shopper",
  TENANT: "Brand",
  ADMIN: "Admin",
} as const;

export function AccountPage() {
  return (
    <RequireAuth>
      <Account />
    </RequireAuth>
  );
}

function Account() {
  const { user, logout } = useAuth();

  useDocumentTitle("Account · E-commerce");

  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto max-w-xl px-5 py-12 md:px-10">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-clay">Account</p>
      <h1 className="mt-2 font-display text-4xl font-light">{user.username}</h1>
      <p className="mt-3 text-sm text-muted">{roleLabel[user.role]}{user.tenant_name ? ` · ${user.tenant_name}` : ""}</p>
      <ul className="mt-8 space-y-3 text-sm">
        <li><Link to="/orders" className="underline underline-offset-4">Your orders</Link></li>
        <li><Link to="/favourites" className="underline underline-offset-4">Favourites</Link></li>
        <li><Link to="/cart" className="underline underline-offset-4">Cart</Link></li>
        {user.role === "TENANT" && user.tenant_name ? (
          <li><Link to={`/${encodeURIComponent(user.tenant_name)}/studio`} className="underline underline-offset-4">Open studio</Link></li>
        ) : null}
        {user.role === "ADMIN" ? <li><Link to="/admin" className="underline underline-offset-4">Admin</Link></li> : null}
      </ul>
      <Button className="mt-8" variant="secondary" onClick={logout}>Log out</Button>
    </div>
  );
}
