import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/api/client";
import type { Product } from "@/api/types";
import { useAuth } from "@/auth/session";
import { useCart } from "@/cart/cart";
import { WordmarkLink } from "@/components/layout/Wordmark";

const roleLabel = {
  USER: "Shopper",
  TENANT: "Brand",
  ADMIN: "Admin",
} as const;

function navClass(active: boolean) {
  return active ? "text-sm font-medium text-ink underline underline-offset-4" : "text-sm text-muted hover:text-ink";
}

export function StoreShell() {
  const { user, status, logout, studioNote, dismissStudioNote } = useAuth();
  const { count } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const favourites = useQuery({
    queryKey: ["favourites"],
    queryFn: () => api<Product[]>("/products/favourites"),
    enabled: status === "ready" && Boolean(user),
    meta: { toast: false },
  });
  const favouriteCount = favourites.data?.length ?? 0;

  function goToFilters(event: React.MouseEvent) {
    event.preventDefault();
    if (location.pathname !== "/") {
      navigate("/#filters");
      return;
    }
    document.getElementById("filters")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="min-h-screen bg-canvas">
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[90] focus:bg-canvas focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-line bg-canvas">
        <div className="flex items-center justify-between gap-4 px-5 py-3 md:px-10 lg:px-16">
          <WordmarkLink />
          <nav className="hidden items-center gap-6 lg:flex" aria-label="Catalogue">
            <NavLink to="/" end className={({ isActive }) => navClass(isActive || location.pathname.startsWith("/products"))}>
              All products
            </NavLink>
            <a href="/#filters" className={navClass(false)} onClick={goToFilters}>
              Categories
            </a>
            <NavLink to="/brands" className={({ isActive }) => navClass(isActive)}>
              Brands
            </NavLink>
          </nav>
          <div className="flex items-center gap-3 text-sm">
            {user?.role === "TENANT" && user.tenant_name ? (
              <Link to={`/${encodeURIComponent(user.tenant_name)}/studio`} className="hidden text-muted hover:text-ink md:inline">
                Studio
              </Link>
            ) : null}
            {user?.role === "ADMIN" ? (
              <Link to="/admin" className="hidden text-muted hover:text-ink md:inline">
                Admin
              </Link>
            ) : null}
            <Link to="/favourites" className="hidden sm:inline">
              Favourites{user ? ` (${favouriteCount})` : ""}
            </Link>
            <Link to="/cart">Cart ({count})</Link>
            {user ? (
              <button type="button" onClick={logout}>
                Log out
              </button>
            ) : (
              <Link to="/login">Log in</Link>
            )}
            {user ? (
              <span className="hidden border border-line px-2 py-1 text-xs text-muted md:inline">{roleLabel[user.role]}</span>
            ) : null}
          </div>
        </div>
      </header>
      {studioNote && user?.role === "TENANT" && user.tenant_name ? (
        <div className="flex items-center justify-between gap-4 border-b border-line bg-surface px-5 py-3 text-sm md:px-10 lg:px-16">
          <p>
            You manage {user.tenant_name}.{" "}
            <Link to={`/${encodeURIComponent(user.tenant_name)}/studio`} className="underline underline-offset-4">
              Open studio
            </Link>
          </p>
          <button type="button" className="text-sm text-muted" onClick={dismissStudioNote}>
            Dismiss
          </button>
        </div>
      ) : null}
      <main id="content" className="pb-24 lg:pb-0">
        <Outlet />
      </main>
      <nav className={`fixed inset-x-0 bottom-0 z-40 grid border-t border-line bg-canvas lg:hidden ${user?.role === "TENANT" ? "grid-cols-5" : "grid-cols-4"}`} aria-label="Mobile">
        <NavLink to="/" end className="px-1 py-3 text-center text-xs">
          Shop
        </NavLink>
        <NavLink to="/brands" className="px-1 py-3 text-center text-xs">
          Brands
        </NavLink>
        {user?.role === "TENANT" && user.tenant_name ? (
          <NavLink
            to={`/${encodeURIComponent(user.tenant_name)}/studio`}
            className="px-1 py-3 text-center text-xs"
          >
            Studio
          </NavLink>
        ) : null}
        <NavLink to="/orders" className="px-1 py-3 text-center text-xs">
          Orders
        </NavLink>
        <NavLink to={user ? "/account" : "/login"} className="px-1 py-3 text-center text-xs">
          Account
        </NavLink>
      </nav>
    </div>
  );
}
