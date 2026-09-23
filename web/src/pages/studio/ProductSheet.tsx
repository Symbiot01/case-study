import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useForm } from "react-hook-form";

import { api } from "@/api/client";
import type { Category, Product } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { Confirm } from "@/components/ui/Confirm";
import { Field, SelectField } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Modal";
import { productImageSrc } from "@/lib/image";
import { productSchema } from "@/lib/schemas";
import { toastFailure, toastStore } from "@/lib/toast";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type SavedProduct = { product: { id: number } };

type ProductValues = {
  name: string;
  price: string;
  quantity: string;
  category_id: string;
};

export function ProductSheet({
  brand,
  product,
  open,
  onClose,
}: {
  brand: string;
  product: Product | null;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => api<Category[]>("/products/categories"),
    enabled: open,
  });
  const form = useForm<ProductValues>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: "", price: "", quantity: "", category_id: "" },
  });
  const [discard, setDiscard] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { reset } = form;

  useEffect(() => {
    setFile(null);
    setFileError(null);
    setRemoveImage(false);
    setCreatedId(null);
    if (fileRef.current) {
      fileRef.current.value = "";
    }
    if (!open) {
      return;
    }
    reset(
      product
        ? {
            name: product.name,
            price: String(product.price),
            quantity: String(product.quantity),
            category_id: String(product.category_id),
          }
        : { name: "", price: "", quantity: "", category_id: "" },
    );
  }, [open, product, reset]);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const save = useMutation({
    meta: { toast: false },
    mutationFn: async (values: ProductValues) => {
      const body = {
        name: values.name,
        price: Number(values.price),
        quantity: Number(values.quantity),
        category_id: Number(values.category_id),
      };
      let id = product?.id ?? createdId;
      if (id == null) {
        const saved = await api<SavedProduct>(`/${encodeURIComponent(brand)}/products`, {
          method: "POST",
          body: JSON.stringify(body),
        });
        id = saved.product.id;
        setCreatedId(id);
      } else {
        await api(`/${encodeURIComponent(brand)}/products/${id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["studio", brand] });
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        await api(`/${encodeURIComponent(brand)}/products/${id}/image`, { method: "POST", body: formData });
      } else if (removeImage && product?.has_image) {
        await api(`/${encodeURIComponent(brand)}/products/${id}/image`, { method: "DELETE" });
      }
    },
    onSuccess: async () => {
      toastStore.success(product ? "Product updated" : "Product added");
      await queryClient.invalidateQueries({ queryKey: ["studio", brand] });
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      onClose();
    },
    onError: (error) => toastFailure(error),
  });

  function onFile(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null;
    if (!next) {
      setFile(null);
      setFileError(null);
      return;
    }
    if (next.size > MAX_IMAGE_BYTES || (next.type && !IMAGE_TYPES.has(next.type))) {
      setFile(null);
      setFileError("Use a JPEG, PNG, or WebP image up to 5 MB.");
      event.target.value = "";
      return;
    }
    setFile(next);
    setFileError(null);
    setRemoveImage(false);
  }

  const currentImage = product && !removeImage ? productImageSrc(product) : null;

  function requestClose() {
    if (form.formState.isDirty || file || removeImage) {
      setDiscard(true);
      return;
    }
    onClose();
  }

  return (
    <>
      <Sheet open={open} title={product ? "Edit product" : "Add product"} onClose={requestClose}>
        <form className="space-y-4" onSubmit={form.handleSubmit((values) => save.mutate(values))} noValidate>
          <Field label="Name" error={form.formState.errors.name?.message} {...form.register("name")} />
          <Field label="Price" inputMode="decimal" error={form.formState.errors.price?.message} {...form.register("price")} />
          <Field label="Stock" inputMode="numeric" error={form.formState.errors.quantity?.message} {...form.register("quantity")} />
          <SelectField label="Category" error={form.formState.errors.category_id?.message} {...form.register("category_id")}>
            <option value="">Choose a category</option>
            {(categories.data ?? []).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </SelectField>
          <Field
            ref={fileRef}
            id="product-image"
            label="Image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hint="JPEG, PNG, or WebP. Up to 5 MB."
            error={fileError ?? undefined}
            onChange={onFile}
          />
          {preview ? <img src={preview} alt="" className="aspect-[4/3] w-full object-cover" /> : null}
          {!preview && currentImage ? (
            <img src={currentImage} alt="" className="aspect-[4/3] w-full object-cover" />
          ) : null}
          {product?.has_image ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={removeImage}
                onChange={(event) => {
                  setRemoveImage(event.target.checked);
                  if (event.target.checked) {
                    setFile(null);
                    setFileError(null);
                    if (fileRef.current) {
                      fileRef.current.value = "";
                    }
                  }
                }}
              />
              Remove current image
            </label>
          ) : null}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button type="submit" busy={save.isPending} busyLabel="Saving…">
              {product ? "Save changes" : "Add product"}
            </Button>
            <Button variant="secondary" onClick={requestClose}>Cancel</Button>
          </div>
        </form>
      </Sheet>
      <Confirm
        open={discard}
        title="Discard unsaved changes?"
        body="The product form will close without saving."
        confirmLabel="Discard"
        destructive
        onConfirm={() => {
          setDiscard(false);
          onClose();
        }}
        onClose={() => setDiscard(false)}
      />
    </>
  );
}
