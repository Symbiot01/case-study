import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { api } from "@/api/client";
import type { Category } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Modal";
import { Empty } from "@/components/ui/SystemState";
import { Skeleton } from "@/components/ui/Skeleton";
import { brandSchema, categorySchema, staffSchema } from "@/lib/schemas";
import { toastFailure, toastStore } from "@/lib/toast";

export function BrandSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const form = useForm({ resolver: zodResolver(brandSchema), defaultValues: { name: "" } });
  const save = useMutation({
    meta: { toast: false },
    mutationFn: (name: string) => api("/admin/tenants", { method: "POST", body: JSON.stringify({ name }) }),
    onSuccess: async () => {
      toastStore.success("Brand created");
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ["admin", "tenants"] });
      await queryClient.invalidateQueries({ queryKey: ["brands"] });
      onClose();
    },
    onError: (error) => toastFailure(error),
  });

  return (
    <Sheet open={open} title="Add brand" onClose={onClose}>
      <form className="space-y-4" onSubmit={form.handleSubmit((values) => save.mutate(values.name))} noValidate>
        <Field label="Brand name" error={form.formState.errors.name?.message} {...form.register("name")} />
        <p className="text-sm text-muted">The name is used in the brand login address.</p>
        <Button type="submit" busy={save.isPending} busyLabel="Saving…">Add brand</Button>
      </form>
    </Sheet>
  );
}

export function StaffSheet({ open, brand, onClose }: { open: boolean; brand: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const form = useForm({ resolver: zodResolver(staffSchema), defaultValues: { username: "", password: "" } });
  const save = useMutation({
    meta: { toast: false },
    mutationFn: (values: { username: string; password: string }) =>
      api(`/admin/tenants/${encodeURIComponent(brand)}/users`, { method: "POST", body: JSON.stringify(values) }),
    onSuccess: async () => {
      toastStore.success("Staff account created");
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ["admin", "staff", brand] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "tenants"] });
      onClose();
    },
    onError: (error) => toastFailure(error),
  });

  return (
    <Sheet open={open} title="Add staff" onClose={onClose}>
      <p className="mb-4 text-sm text-muted">
        This person can manage {brand} and can also shop with customer login. Usernames are unique across the platform.
      </p>
      <form className="space-y-4" onSubmit={form.handleSubmit((values) => save.mutate(values))} noValidate>
        <Field label="Username" autoComplete="off" error={form.formState.errors.username?.message} {...form.register("username")} />
        <Field label="Password" type="password" autoComplete="new-password" error={form.formState.errors.password?.message} {...form.register("password")} />
        <Button type="submit" busy={save.isPending} busyLabel="Saving…">Add staff</Button>
      </form>
    </Sheet>
  );
}

export function CategorySection({
  categories,
  pending,
  failed = false,
  onRetry,
}: {
  categories: Category[] | undefined;
  pending: boolean;
  failed?: boolean;
  onRetry?: () => void;
}) {
  const queryClient = useQueryClient();
  const form = useForm({ resolver: zodResolver(categorySchema), defaultValues: { name: "" } });
  const save = useMutation({
    meta: { toast: false },
    mutationFn: (name: string) => api("/admin/categories", { method: "POST", body: JSON.stringify({ name }) }),
    onSuccess: async () => {
      toastStore.success("Category added");
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error) => toastFailure(error),
  });

  return (
    <section className="mt-8">
      <h2 className="font-display text-3xl">Categories</h2>
      <form className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-start" onSubmit={form.handleSubmit((values) => save.mutate(values.name))} noValidate>
        <Field className="flex-1" label="Category name" error={form.formState.errors.name?.message} {...form.register("name")} />
        <Button className="sm:mt-7" type="submit" busy={save.isPending} busyLabel="Adding…">Add category</Button>
      </form>
      {pending ? <Skeleton className="mt-6 h-32" /> : null}
      {failed ? (
        <div className="mt-6">
          <Empty title="Categories could not be loaded." />
          {onRetry ? <Button className="mt-4" variant="secondary" onClick={onRetry}>Try again</Button> : null}
        </div>
      ) : null}
      {!failed && categories && categories.length === 0 ? (
        <div className="mt-6">
          <Empty title="No categories yet. Products need a category before a brand can add them." />
        </div>
      ) : null}
      {!failed && categories && categories.length > 0 ? (
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {(categories ?? []).map((category) => (
            <li key={category.id} className="py-3">{category.name}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
