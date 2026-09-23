import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { api } from "@/api/client";
import type { OrderPage, Product } from "@/api/types";
import { RequireAuth } from "@/auth/guards";
import { ProductCard } from "@/components/catalog/ProductCard";
import { Button } from "@/components/ui/Button";
import { Empty } from "@/components/ui/SystemState";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { useFavouriteActions, useFavourites } from "@/features/favourites";
import { money } from "@/lib/money";
import { useDocumentTitle } from "@/lib/title";

export function OrdersPage() {
  return (
    <RequireAuth>
      <OrdersLedger />
    </RequireAuth>
  );
}

export function FavouritesPage() {
  return (
    <RequireAuth>
      <FavouritesGrid />
    </RequireAuth>
  );
}

function OrdersLedger() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const [tab, setTab] = useState<"orders" | "favourites">("orders");
  const orders = useQuery({
    queryKey: ["orders", page],
    queryFn: () => api<OrderPage>(`/orders/?page=${page}&limit=10`),
  });

  useDocumentTitle("Your orders · E-commerce");

  return (
    <div className="px-5 py-10 md:px-10 lg:px-16">
      <div className="mb-6 flex gap-2 lg:hidden">
        <button type="button" className={tabButton(tab === "orders")} onClick={() => setTab("orders")}>Orders</button>
        <button type="button" className={tabButton(tab === "favourites")} onClick={() => setTab("favourites")}>Favourites</button>
      </div>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className={tab === "orders" ? "block" : "hidden lg:block"}>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-clay">Index 01</p>
          <h1 className="mt-2 font-display text-4xl font-light">Your orders</h1>
          {orders.isPending ? <Skeleton className="mt-6 h-48" /> : null}
          {orders.isError ? (
            <div className="mt-6">
              <Empty title="Your orders could not be loaded." />
              <Button className="mt-4" variant="secondary" onClick={() => void orders.refetch()}>Try again</Button>
            </div>
          ) : null}
          {orders.data && orders.data.orders.length === 0 ? (
            <div className="mt-6">
              <Empty title="You have no orders yet." action={{ href: "/", label: "Browse products" }} />
            </div>
          ) : null}
          <ul className="mt-6 space-y-4">
            {(orders.data?.orders ?? []).map((order) => (
              <li key={order.id} className="border border-line bg-surface">
                <Link to={`/orders/${order.id}`} className="block px-4 py-4">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em]">Order #{order.id}</p>
                    <p className="tabular-nums">{money(order.total_amount)}</p>
                  </div>
                  <p className="mt-2 text-sm text-muted">{order.total_quantity} items</p>
                  <ul className="mt-3 space-y-1 text-sm">
                    {order.items.map((item) => (
                      <li key={item.id}>
                        {item.product_name ?? `Product ${item.product_id}`} · {item.quantity} · {money(item.price)}
                      </li>
                    ))}
                  </ul>
                </Link>
              </li>
            ))}
          </ul>
          {orders.data ? (
            <Pagination
              page={orders.data.page}
              limit={orders.data.limit}
              total={orders.data.total}
              totalPages={orders.data.total_pages}
              onPage={(nextPage) => {
                setSearchParams(nextPage === 1 ? {} : { page: String(nextPage) });
              }}
            />
          ) : null}
        </section>
        <section className={tab === "favourites" ? "block" : "hidden lg:block"}>
          <FavouriteColumn />
        </section>
      </div>
    </div>
  );
}

function tabButton(active: boolean) {
  return active
    ? "border border-accent bg-accent px-3 py-2 text-sm text-white"
    : "border border-line-strong px-3 py-2 text-sm";
}

function FavouriteColumn() {
  const favourites = useFavourites();
  const actions = useFavouriteActions();

  return (
    <div>
      {actions.confirm}
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-3xl">Favourites</h2>
        <Link to="/favourites" className="text-[0.6875rem] uppercase tracking-[0.12em]">View all</Link>
      </div>
      {favourites.isPending ? <Skeleton className="mt-4 h-40" /> : null}
      {favourites.isError ? (
        <div className="mt-4">
          <Empty title="Favourites could not be loaded." />
          <Button className="mt-4" variant="secondary" onClick={() => void favourites.refetch()}>Try again</Button>
        </div>
      ) : null}
      {favourites.data && favourites.data.length === 0 ? (
        <div className="mt-4">
          <Empty title="No favourites yet." action={{ href: "/", label: "Browse products" }} />
        </div>
      ) : null}
      <ul className="mt-4 space-y-3">
        {(favourites.data ?? []).map((product) => (
          <li key={product.id} className="border border-line p-4">
            <Link to={`/products/${product.id}`} className="font-display text-xl">{product.name}</Link>
            <p className="mt-1 text-[0.6875rem] uppercase tracking-[0.12em] text-clay">{product.tenant_name}</p>
            <p className="mt-2 text-sm tabular-nums">{money(product.price)}</p>
            <button type="button" className="mt-3 text-[0.6875rem] uppercase tracking-[0.12em]" onClick={() => actions.toggle(product, true)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FavouritesGrid() {
  const favourites = useFavourites();
  const actions = useFavouriteActions();

  useDocumentTitle("Favourites · E-commerce");

  const saved = new Set((favourites.data ?? []).map((product: Product) => product.id));

  return (
    <div className="px-5 py-10 md:px-10 lg:px-16">
      {actions.confirm}
      <h1 className="font-display text-4xl font-light">Favourites</h1>
      {favourites.isPending ? <Skeleton className="mt-6 h-64" /> : null}
      {favourites.isError ? (
        <div className="mt-6">
          <Empty title="Favourites could not be loaded." />
          <Button className="mt-4" variant="secondary" onClick={() => void favourites.refetch()}>Try again</Button>
        </div>
      ) : null}
      {favourites.data && favourites.data.length === 0 ? (
        <div className="mt-6">
          <Empty title="No favourites yet." action={{ href: "/", label: "Browse products" }} />
        </div>
      ) : null}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {(favourites.data ?? []).map((product) => (
          <ProductCard key={product.id} product={product} saved={saved.has(product.id)} onToggleFavourite={actions.toggle} />
        ))}
      </div>
    </div>
  );
}
