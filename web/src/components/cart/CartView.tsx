import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/api/client";
import type { OrderCreated, Product } from "@/api/types";
import { useAuth } from "@/auth/session";
import { useCart } from "@/cart/cart";
import { Button } from "@/components/ui/Button";
import { Stepper } from "@/components/ui/Stepper";
import { money } from "@/lib/money";
import { toastStore } from "@/lib/toast";

export function CartView({ compact = false }: { compact?: boolean }) {
  const { lines, setQuantity, remove, clear, applyStock } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const linesRef = useRef(lines);
  const actionsRef = useRef({ remove, applyStock });
  linesRef.current = lines;
  actionsRef.current = { remove, applyStock };
  const ids = lines.map((line) => line.productId).join(",");

  useEffect(() => {
    let cancelled = false;
    async function sync() {
      const current = linesRef.current;
      if (current.length === 0) {
        return;
      }
      const products = await Promise.all(
        current.map(async (line) => {
          try {
            return await api<Product>(`/products/${line.productId}`);
          } catch {
            return null;
          }
        }),
      );
      if (cancelled) {
        return;
      }
      products.forEach((product, index) => {
        const line = current[index];
        if (!product) {
          actionsRef.current.remove(line.productId);
          toastStore.failure("A product in your cart is no longer available.");
          return;
        }
        if (product.quantity < line.quantity) {
          toastStore.failure(`Quantity updated. Only ${product.quantity} left of ${product.name}.`);
        }
        actionsRef.current.applyStock(product);
      });
    }
    void sync();
    return () => {
      cancelled = true;
    };
  }, [ids]);

  const placeOrder = useMutation({
    mutationFn: () =>
      api<OrderCreated>("/orders/", {
        method: "POST",
        body: JSON.stringify({
          items: lines.map((line) => ({ product_id: line.productId, quantity: line.quantity })),
        }),
      }),
    onSuccess: async (order) => {
      clear();
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      navigate(`/orders/${order.order_id}`, { state: { confirmed: true } });
    },
    onError: async () => {
      await queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);
  const totalAmount = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const groups = lines.reduce<Record<string, typeof lines>>((grouped, line) => {
    const key = line.tenantName;
    grouped[key] = [...(grouped[key] ?? []), line];
    return grouped;
  }, {});

  if (lines.length === 0) {
    return (
      <div className="border border-line bg-surface p-6">
        <h2 className="font-display text-3xl">Cart</h2>
        <p className="mt-3 text-muted">Your cart is empty.</p>
        <Link to="/" className="mt-6 inline-block text-sm underline decoration-line-strong underline-offset-4">
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className={compact ? "border border-line bg-surface p-5" : "grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]"}>
      <div className="space-y-8">
        {!compact ? <h1 className="font-display text-4xl font-light">Cart</h1> : <h2 className="font-display text-3xl">Cart</h2>}
        {Object.entries(groups).map(([brand, brandLines]) => (
          <section key={brand}>
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-clay">{brand}</p>
            <ul className="mt-3 divide-y divide-line border-y border-line">
              {brandLines.map((line) => (
                <li key={line.productId} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Link to={`/products/${line.productId}`} className="font-display text-xl">
                      {line.name}
                    </Link>
                    <p className="mt-1 text-sm tabular-nums text-muted">{money(line.price)}</p>
                    {line.quantity >= line.available ? (
                      <p className="mt-1 text-sm text-clay">Only {line.available} left.</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-4">
                    <Stepper
                      value={line.quantity}
                      max={line.available}
                      onChange={(quantity) => setQuantity(line.productId, quantity)}
                      label={`Quantity for ${line.name}`}
                    />
                    <p className="w-20 text-right text-sm tabular-nums">{money(line.price * line.quantity)}</p>
                    <button type="button" className="text-[0.6875rem] uppercase tracking-[0.12em]" onClick={() => remove(line.productId)}>
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <aside className="h-fit border border-line bg-surface p-5 lg:sticky lg:top-28">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted">Summary</p>
        <p className="mt-4 flex justify-between text-sm">
          <span>Items</span>
          <span className="tabular-nums">{totalQuantity}</span>
        </p>
        <p className="mt-2 flex justify-between font-display text-2xl">
          <span>Total</span>
          <span className="tabular-nums">{money(totalAmount)}</span>
        </p>
        <Button
          className="mt-6 w-full"
          busy={placeOrder.isPending}
          busyLabel="Placing order…"
          disabled={lines.length === 0}
          onClick={() => {
            if (!user) {
              navigate("/login?next=/cart");
              return;
            }
            placeOrder.mutate();
          }}
        >
          Place order
        </Button>
      </aside>
    </div>
  );
}
