import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { api } from "@/api/client";
import type { Product } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Modal";
import { Stepper } from "@/components/ui/Stepper";
import { stockSchema } from "@/lib/schemas";
import { toastFailure, toastStore } from "@/lib/toast";

const stockFormSchema = z.object({ quantity: stockSchema });

export function StockSheet({ brand, product, onClose }: { brand: string; product: Product | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const form = useForm<{ quantity: string }>({
    resolver: zodResolver(stockFormSchema),
    defaultValues: { quantity: "" },
  });
  const { reset } = form;

  useEffect(() => {
    if (product) {
      reset({ quantity: String(product.quantity) });
    }
  }, [product, reset]);

  const save = useMutation({
    meta: { toast: false },
    mutationFn: (quantity: string) =>
      api(`/${encodeURIComponent(brand)}/products/${product?.id}`, {
        method: "PUT",
        body: JSON.stringify({ quantity: Number(quantity) }),
      }),
    onSuccess: async () => {
      toastStore.success("Stock updated");
      await queryClient.invalidateQueries({ queryKey: ["studio", brand] });
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      onClose();
    },
    onError: (error) => toastFailure(error),
  });

  const current = Number(form.watch("quantity") || 0);

  return (
    <Sheet open={product !== null} title="Update stock" onClose={onClose}>
      <p className="text-sm text-muted">{product?.name}</p>
      <form
        className="mt-4 space-y-4"
        onSubmit={form.handleSubmit((values) => save.mutate(values.quantity))}
        noValidate
      >
        <Stepper
          min={0}
          max={100000}
          value={Number.isNaN(current) ? 0 : current}
          onChange={(value) => form.setValue("quantity", String(value), { shouldValidate: true, shouldDirty: true })}
          label="Stock"
        />
        {form.formState.errors.quantity?.message ? (
          <p role="alert" className="text-sm text-danger">{form.formState.errors.quantity.message}</p>
        ) : null}
        <Button type="submit" busy={save.isPending} busyLabel="Saving…">Update stock</Button>
      </form>
    </Sheet>
  );
}
