import { createContext, useContext, useEffect, useMemo, useState } from "react";

import type { Product } from "@/api/types";
import { toastStore } from "@/lib/toast";

const CART_KEY = "meridian.cart";

export type CartLine = {
  productId: number;
  name: string;
  price: number;
  tenantName: string;
  quantity: number;
  available: number;
};

type CartContextValue = {
  lines: CartLine[];
  count: number;
  add: (product: Product, quantity: number) => { ok: true } | { ok: false; message: string };
  setQuantity: (productId: number, quantity: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
  applyStock: (product: Product) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function isLine(value: unknown): value is CartLine {
  if (!value || typeof value !== "object") {
    return false;
  }
  const line = value as Partial<CartLine>;
  return (
    typeof line.productId === "number" &&
    typeof line.name === "string" &&
    typeof line.price === "number" &&
    typeof line.tenantName === "string" &&
    typeof line.quantity === "number" &&
    typeof line.available === "number"
  );
}

function readCart(): CartLine[] {
  try {
    const raw = sessionStorage.getItem(CART_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isLine) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(readCart);

  useEffect(() => {
    try {
      sessionStorage.setItem(CART_KEY, JSON.stringify(lines));
    } catch {
      toastStore.failure("The cart could not be saved in this browser.");
    }
  }, [lines]);

  const value = useMemo<CartContextValue>(() => {
    const count = lines.reduce((sum, line) => sum + line.quantity, 0);
    return {
      lines,
      count,
      add(product, quantity) {
        if (product.quantity <= 0 || quantity < 1) {
          return { ok: false, message: "Out of stock." };
        }
        const existing = lines.find((line) => line.productId === product.id);
        const nextQuantity = (existing?.quantity ?? 0) + quantity;
        if (nextQuantity > product.quantity) {
          return { ok: false, message: `Only ${product.quantity} left.` };
        }
        const nextLine: CartLine = {
          productId: product.id,
          name: product.name,
          price: product.price,
          tenantName: product.tenant_name ?? "Brand",
          quantity: nextQuantity,
          available: product.quantity,
        };
        setLines((current) => {
          const without = current.filter((line) => line.productId !== product.id);
          return [...without, nextLine];
        });
        return { ok: true };
      },
      setQuantity(productId, quantity) {
        setLines((current) =>
          current.flatMap((line) => {
            if (line.productId !== productId) {
              return [line];
            }
            if (quantity < 1) {
              return [];
            }
            const clamped = Math.min(quantity, line.available);
            return [{ ...line, quantity: clamped }];
          }),
        );
      },
      remove(productId) {
        setLines((current) => current.filter((line) => line.productId !== productId));
      },
      clear() {
        setLines([]);
      },
      applyStock(product) {
        setLines((current) =>
          current.flatMap((line) => {
            if (line.productId !== product.id) {
              return [line];
            }
            if (product.quantity <= 0) {
              return [];
            }
            const quantity = Math.min(line.quantity, product.quantity);
            return [
              {
                ...line,
                name: product.name,
                price: product.price,
                tenantName: product.tenant_name ?? line.tenantName,
                available: product.quantity,
                quantity,
              },
            ];
          }),
        );
      },
    };
  }, [lines]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) {
    throw new Error("useCart must be used within CartProvider");
  }
  return value;
}
