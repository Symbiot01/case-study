import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "@/api/client";
import type { Product } from "@/api/types";
import { useAuth } from "@/auth/session";
import { Button } from "@/components/ui/Button";
import { Confirm } from "@/components/ui/Confirm";
import { Pagination } from "@/components/ui/Pagination";
import { Empty } from "@/components/ui/SystemState";
import { Skeleton } from "@/components/ui/Skeleton";
import { money } from "@/lib/money";
import { stockLabel } from "@/lib/stock";
import { toastFailure, toastStore } from "@/lib/toast";
import { useDocumentTitle } from "@/lib/title";
import { ProductSheet } from "@/pages/studio/ProductSheet";
import { StockSheet } from "@/pages/studio/StockSheet";

const limit = 10;

export function StudioPage() {
  const { user } = useAuth();
  const brand = user?.tenant_name ?? "";
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<Product | null | "new">(null);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [removing, setRemoving] = useState<Product | null>(null);
  const queryClient = useQueryClient();
  const skip = (page - 1) * limit;

  const products = useQuery({
    queryKey: ["studio", brand, skip],
    queryFn: () => api<Product[]>(`/${encodeURIComponent(brand)}/products?skip=${skip}&limit=${limit + 1}`),
    enabled: Boolean(brand),
  });
  const pageRows = useMemo(() => (products.data ?? []).slice(0, limit), [products.data]);
  const hasNext = (products.data?.length ?? 0) > limit;

  useEffect(() => {
    if (page > 1 && products.isSuccess && products.data.length === 0) {
      setPage((current) => Math.max(1, current - 1));
    }
  }, [page, products.data, products.isSuccess]);

  useDocumentTitle(`${brand} studio · E-commerce`);

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return pageRows.filter((product) => !needle || product.name.toLowerCase().includes(needle));
  }, [filter, pageRows]);

  const units = pageRows.reduce((sum, product) => sum + product.quantity, 0);
  const low = pageRows.filter((product) => product.quantity <= 1).length;

  const remove = useMutation({
    meta: { toast: false },
    mutationFn: (product: Product) => api<void>(`/${encodeURIComponent(brand)}/products/${product.id}`, { method: "DELETE" }),
    onSuccess: async () => {
      setRemoving(null);
      toastStore.success("Product removed");
      await queryClient.invalidateQueries({ queryKey: ["studio", brand] });
      await queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error) => toastFailure(error),
  });

  return (
    <div className="px-5 py-8 md:px-10 lg:px-16">
      <div className="border border-olive bg-surface px-4 py-3 text-sm">
        You are signed in as staff for {brand}. You can manage only this brand.{" "}
        <Link to="/" className="underline underline-offset-4">Shop as customer</Link>
      </div>
      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-clay">Brand studio</p>
          <h1 className="mt-2 font-display text-4xl font-light md:text-5xl">{brand}</h1>
        </div>
        <Button onClick={() => setEditing("new")}>Add product</Button>
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Stat label="On this page" value={String(products.data ? pageRows.length : "—")} />
        <Stat label="Units on this page" value={String(products.data ? units : "—")} />
        <Stat label="Low or out" value={String(products.data ? low : "—")} />
      </div>
      <div className="mt-6">
        <input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Filter this page"
          aria-label="Filter this page"
          className="w-full max-w-md border border-line-strong bg-canvas px-3 py-2 text-sm outline-none focus:border-ink"
        />
        {filter ? <p className="mt-2 text-sm text-muted">Filtering products on this page.</p> : null}
      </div>
      {products.isPending ? <Skeleton className="mt-6 h-64" /> : null}
      {products.isError ? (
        <div className="mt-6">
          <Empty title="Products could not be loaded." />
          <Button className="mt-4" variant="secondary" onClick={() => void products.refetch()}>Try again</Button>
        </div>
      ) : null}
      {products.isSuccess && visible.length === 0 ? (
        <div className="mt-6">
          <Empty title={filter ? "No products match." : `No products for ${brand} yet.`} />
          {!filter ? <Button className="mt-4" onClick={() => setEditing("new")}>Add product</Button> : null}
        </div>
      ) : null}
      {visible.length > 0 ? (
        <>
          <div className="mt-6 hidden overflow-x-auto border border-line md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-[0.6875rem] uppercase tracking-[0.12em] text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Price</th>
                  <th className="px-4 py-3 font-semibold">In stock</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((product) => (
                  <tr key={product.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-4 font-display text-xl">{product.name}</td>
                    <td className="px-4 py-4">{product.category_name}</td>
                    <td className="px-4 py-4 tabular-nums">{money(product.price)}</td>
                    <td className="px-4 py-4">{stockLabel(product.quantity).text}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-3">
                        <button type="button" className="uppercase tracking-[0.08em]" onClick={() => setStockProduct(product)}>Update stock</button>
                        <button type="button" className="uppercase tracking-[0.08em]" onClick={() => setEditing(product)}>Edit</button>
                        <button type="button" className="uppercase tracking-[0.08em] text-danger" onClick={() => setRemoving(product)}>Remove</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="mt-6 space-y-4 md:hidden">
            {visible.map((product) => (
              <li key={product.id} className="border border-line p-4">
                <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-clay">{product.category_name}</p>
                <p className="mt-1 font-display text-2xl">{product.name}</p>
                <p className="mt-2 text-sm tabular-nums">{money(product.price)} · {stockLabel(product.quantity).text}</p>
                <div className="mt-4 flex flex-wrap gap-3 text-[0.6875rem] uppercase tracking-[0.08em]">
                  <button type="button" onClick={() => setStockProduct(product)}>Update stock</button>
                  <button type="button" onClick={() => setEditing(product)}>Edit</button>
                  <button type="button" className="text-danger" onClick={() => setRemoving(product)}>Remove</button>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <Pagination
        page={page}
        limit={limit}
        hasNext={hasNext}
        onPage={setPage}
      />
      <ProductSheet
        brand={brand}
        product={editing === "new" ? null : editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
      />
      <StockSheet brand={brand} product={stockProduct} onClose={() => setStockProduct(null)} />
      <Confirm
        open={removing !== null}
        title="Remove product"
        body={removing ? `Remove ${removing.name}? This cannot be undone.` : ""}
        confirmLabel="Remove"
        destructive
        busy={remove.isPending}
        onConfirm={() => {
          if (removing) {
            remove.mutate(removing);
          }
        }}
        onClose={() => setRemoving(null)}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line bg-surface p-4">
      <p className="font-display text-3xl">{value}</p>
      <p className="mt-1 text-[0.6875rem] uppercase tracking-[0.12em] text-muted">{label}</p>
    </div>
  );
}

