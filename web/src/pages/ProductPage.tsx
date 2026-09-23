import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api, ApiError } from "@/api/client";
import type { Product } from "@/api/types";
import { useCart } from "@/cart/cart";
import { CartView } from "@/components/cart/CartView";
import { ProductPlate } from "@/components/catalog/ProductCard";
import { Button } from "@/components/ui/Button";
import { SystemState } from "@/components/ui/SystemState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Stepper } from "@/components/ui/Stepper";
import { useFavouriteActions, useFavourites } from "@/features/favourites";
import { money } from "@/lib/money";
import { stockLabel } from "@/lib/stock";
import { toastStore } from "@/lib/toast";
import { useDocumentTitle } from "@/lib/title";

export function ProductPage() {
  const params = useParams();
  const productId = Number(params.productId);
  const { add } = useCart();
  const favourites = useFavourites();
  const actions = useFavouriteActions();
  const [quantity, setQuantity] = useState(1);

  const product = useQuery({
    queryKey: ["product", productId],
    queryFn: () => api<Product>(`/products/${productId}`),
    enabled: Number.isInteger(productId) && productId > 0,
    meta: { toast: false },
    retry: false,
  });

  useEffect(() => {
    setQuantity(1);
  }, [productId]);

  useDocumentTitle(product.data ? `${product.data.name} · E-commerce` : null);

  if (!Number.isInteger(productId) || productId <= 0 || (product.isError && product.error instanceof ApiError && product.error.status === 404)) {
    return <SystemState title="Product not found." body="That piece is not in the catalogue." action={{ href: "/", label: "Back to store" }} />;
  }

  if (product.isPending) {
    return (
      <div className="grid gap-8 px-5 py-10 md:px-10 lg:grid-cols-12 lg:px-16">
        <Skeleton className="aspect-[4/5] lg:col-span-7" />
        <Skeleton className="h-80 lg:col-span-5" />
      </div>
    );
  }

  if (!product.data) {
    return <SystemState title="The product could not be loaded." body="Try the catalogue again." action={{ href: "/", label: "Back to store" }} />;
  }

  const item = product.data;
  const stock = stockLabel(item.quantity);
  const saved = (favourites.data ?? []).some((favourite) => favourite.id === item.id);

  function addToCart() {
    const result = add(item, quantity);
    if (!result.ok) {
      toastStore.failure(result.message);
      return;
    }
    toastStore.success("Added to cart");
  }

  return (
    <div className="px-5 py-8 md:px-10 lg:px-16">
      {actions.confirm}
      <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted">
        <Link to="/">Home</Link>
        {" / "}
        {item.category_name ?? "Category"}
        {" / "}
        {item.tenant_name ?? "Brand"}
      </p>
      <div className="mt-6 grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <ProductPlate product={item} className="border border-line" />
          <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-clay">{item.category_name}</p>
              <h1 className="mt-2 font-display text-4xl font-light md:text-5xl">{item.name}</h1>
              <p className="mt-2 text-sm">
                Sold by <Link to={`/?brand=${item.tenant_id}`} className="underline underline-offset-4">{item.tenant_name}</Link>
              </p>
            </div>
            <p className="font-display text-3xl tabular-nums">{money(item.price)}</p>
          </div>
          <p className={`mt-4 text-sm ${stock.tone === "ok" ? "text-olive" : "text-clay"}`}>{stock.text}</p>
          {item.quantity > 0 ? (
            <div className="mt-6 hidden items-center gap-4 lg:flex">
              <Stepper value={quantity} max={item.quantity} onChange={setQuantity} />
              <Button onClick={addToCart}>Add to cart</Button>
              <Button variant="secondary" onClick={() => actions.toggle(item, saved)}>
                {saved ? "Saved" : "Save"}
              </Button>
            </div>
          ) : (
            <p className="mt-6 border border-danger-bg bg-danger-bg px-4 py-3 text-sm text-on-danger">Out of stock.</p>
          )}
          {item.quantity === 0 ? (
            <Button className="mt-4" variant="secondary" onClick={() => actions.toggle(item, saved)}>
              {saved ? "Saved" : "Save"}
            </Button>
          ) : null}
        </div>
        <aside className="hidden lg:col-span-5 lg:block">
          <CartView compact />
        </aside>
      </div>
      {item.quantity > 0 ? (
        <div className="fixed inset-x-0 bottom-16 z-30 flex items-center gap-3 border-t border-line bg-canvas px-4 py-3 lg:hidden">
          <Stepper value={quantity} max={item.quantity} onChange={setQuantity} />
          <Button className="flex-1" onClick={addToCart}>
            Add · {money(item.price)}
          </Button>
          <Button variant="secondary" onClick={() => actions.toggle(item, saved)} aria-label={saved ? "Saved" : "Save"}>
            {saved ? "♥" : "♡"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
