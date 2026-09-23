import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { api } from "@/api/client";
import type { Product } from "@/api/types";
import { useAuth } from "@/auth/session";
import { Confirm } from "@/components/ui/Confirm";
import { toastFailure, toastStore } from "@/lib/toast";

export function useFavourites() {
  const { user, status } = useAuth();
  return useQuery({
    queryKey: ["favourites"],
    queryFn: () => api<Product[]>("/products/favourites"),
    enabled: status === "ready" && Boolean(user),
    meta: { toast: false },
  });
}

export function useFavouriteActions() {
  const queryClient = useQueryClient();
  const [pendingRemove, setPendingRemove] = useState<Product | null>(null);
  const remove = useMutation({
    meta: { toast: false },
    mutationFn: (product: Product) => api<void>(`/products/${product.id}/favourite`, { method: "DELETE" }),
    onSuccess: async () => {
      setPendingRemove(null);
      toastStore.success("Removed from favourites");
      await queryClient.invalidateQueries({ queryKey: ["favourites"] });
    },
    onError: async (error) => {
      toastFailure(error);
      await queryClient.invalidateQueries({ queryKey: ["favourites"] });
    },
  });
  const save = useMutation({
    meta: { toast: false },
    mutationFn: (product: Product) => api(`/products/${product.id}/favourite`, { method: "POST" }),
    onSuccess: async () => {
      toastStore.success("Saved");
      await queryClient.invalidateQueries({ queryKey: ["favourites"] });
    },
    onError: async (error) => {
      toastFailure(error);
      await queryClient.invalidateQueries({ queryKey: ["favourites"] });
    },
  });

  return {
    pendingRemove,
    askRemove: setPendingRemove,
    save: (product: Product) => save.mutate(product),
    confirm: (
      <Confirm
        open={pendingRemove !== null}
        title="Remove favourite"
        body={pendingRemove ? `Remove ${pendingRemove.name} from favourites?` : ""}
        confirmLabel="Remove"
        destructive
        busy={remove.isPending}
        onConfirm={() => {
          if (pendingRemove) {
            remove.mutate(pendingRemove);
          }
        }}
        onClose={() => setPendingRemove(null)}
      />
    ),
    toggle(product: Product, saved: boolean) {
      if (saved) {
        setPendingRemove(product);
        return;
      }
      save.mutate(product);
    },
  };
}
