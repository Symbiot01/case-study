import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";

import { api } from "@/api/client";
import type { Category, StaffUser, TenantSummary } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { Confirm } from "@/components/ui/Confirm";
import { Empty } from "@/components/ui/SystemState";
import { Skeleton } from "@/components/ui/Skeleton";
import { toastFailure, toastStore } from "@/lib/toast";
import { useDocumentTitle } from "@/lib/title";
import { BrandSheet, CategorySection, StaffSheet } from "@/pages/admin/forms";

type Section = "brands" | "staff" | "categories";

export function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const section = (searchParams.get("section") as Section | null) ?? "brands";
  const selected = searchParams.get("brand") ?? "";
  const [addBrand, setAddBrand] = useState(false);
  const [addStaff, setAddStaff] = useState(false);
  const [removeBrand, setRemoveBrand] = useState<TenantSummary | null>(null);
  const [removeStaff, setRemoveStaff] = useState<StaffUser | null>(null);
  const queryClient = useQueryClient();

  const tenants = useQuery({
    queryKey: ["admin", "tenants"],
    queryFn: () => api<TenantSummary[]>("/admin/tenants"),
  });
  const staff = useQuery({
    queryKey: ["admin", "staff", selected],
    queryFn: () => api<StaffUser[]>(`/admin/tenants/${encodeURIComponent(selected)}/users`),
    enabled: section === "staff" && Boolean(selected),
  });
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => api<Category[]>("/products/categories"),
    enabled: section === "categories",
  });

  useDocumentTitle("Admin · E-commerce");

  function openSection(next: Section, brand = selected) {
    const params = new URLSearchParams();
    params.set("section", next);
    if (brand) {
      params.set("brand", brand);
    }
    setSearchParams(params);
  }

  const deleteBrand = useMutation({
    meta: { toast: false },
    mutationFn: (tenant: TenantSummary) => api<void>(`/admin/tenants/${encodeURIComponent(tenant.name)}`, { method: "DELETE" }),
    onSuccess: async () => {
      const name = removeBrand?.name;
      setRemoveBrand(null);
      if (name && name === selected) {
        openSection("brands", "");
      }
      toastStore.success("Brand removed");
      await queryClient.invalidateQueries({ queryKey: ["admin", "tenants"] });
      await queryClient.invalidateQueries({ queryKey: ["brands"] });
    },
    onError: (error) => toastFailure(error),
  });

  const deleteStaff = useMutation({
    meta: { toast: false },
    mutationFn: (member: StaffUser) =>
      api<void>(`/admin/tenants/${encodeURIComponent(selected)}/users/${member.id}`, { method: "DELETE" }),
    onSuccess: async () => {
      setRemoveStaff(null);
      toastStore.success("Staff account removed");
      await queryClient.invalidateQueries({ queryKey: ["admin", "staff", selected] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "tenants"] });
    },
    onError: (error) => toastFailure(error),
  });

  return (
    <div className="px-5 py-8 md:px-10 lg:px-16">
      <div className="border border-olive bg-olive px-4 py-3 text-sm text-canvas">
        Restricted access. Platform admin only.
      </div>
      <div className="mt-8">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-clay">Administration</p>
        <h1 className="mt-2 font-display text-4xl font-light md:text-5xl">Platform administration</h1>
        <p className="mt-3 max-w-2xl text-muted">Manage brands, the people who run them, and product categories.</p>
      </div>
      <div className="mt-8 flex gap-2 overflow-x-auto">
        {(["brands", "staff", "categories"] as const).map((item) => (
          <button key={item} type="button" className={tabClass(section === item)} onClick={() => openSection(item)}>
            {item === "categories" ? "Categories" : item === "staff" ? "Staff" : "Brands"}
          </button>
        ))}
      </div>

      {section === "brands" ? (
        <section className="mt-8">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-3xl">Brands</h2>
            <Button onClick={() => setAddBrand(true)}>Add brand</Button>
          </div>
          {tenants.isPending ? <Skeleton className="mt-6 h-48" /> : null}
          {tenants.isError ? (
            <div className="mt-6">
              <Empty title="Brands could not be loaded." />
              <Button className="mt-4" variant="secondary" onClick={() => void tenants.refetch()}>Try again</Button>
            </div>
          ) : null}
          {tenants.data && tenants.data.length === 0 ? (
            <div className="mt-6"><Empty title="No brands yet." /></div>
          ) : null}
          <ul className="mt-6 divide-y divide-line border-y border-line">
            {(tenants.data ?? []).map((tenant) => (
              <li key={tenant.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-display text-2xl">{tenant.name}</p>
                  <p className="mt-1 text-sm text-muted">{tenant.product_count} products · {tenant.staff_count} staff</p>
                </div>
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => openSection("staff", tenant.name)}>View staff</Button>
                  <Button variant="danger" onClick={() => setRemoveBrand(tenant)}>Remove</Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {section === "staff" ? (
        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl">{selected ? `${selected} staff` : "Staff"}</h2>
              <label className="mt-3 block text-[0.6875rem] font-semibold uppercase tracking-[0.12em]">
                Brand
                <select
                  className="mt-2 block border border-line-strong bg-canvas px-3 py-3 text-sm normal-case"
                  value={selected}
                  onChange={(event) => openSection("staff", event.target.value)}
                >
                  <option value="">Choose a brand</option>
                  {(tenants.data ?? []).map((tenant) => (
                    <option key={tenant.id} value={tenant.name}>{tenant.name}</option>
                  ))}
                </select>
              </label>
            </div>
            <Button disabled={!selected} onClick={() => setAddStaff(true)}>Add staff</Button>
          </div>
          {!selected ? <p className="mt-6 text-sm text-muted">Choose a brand to see its staff.</p> : null}
          {staff.isPending && selected ? <Skeleton className="mt-6 h-40" /> : null}
          {selected && staff.isError ? (
            <div className="mt-6">
              <Empty title="Staff could not be loaded." />
              <Button className="mt-4" variant="secondary" onClick={() => void staff.refetch()}>Try again</Button>
            </div>
          ) : null}
          {selected && staff.data && staff.data.length === 0 ? (
            <div className="mt-6"><Empty title="No staff for this brand yet." /></div>
          ) : null}
          <ul className="mt-6 divide-y divide-line border-y border-line">
            {(selected ? staff.data ?? [] : []).map((member) => (
              <li key={member.id} className="flex items-center justify-between py-4">
                <div>
                  <p className="font-display text-2xl">{member.username}</p>
                  <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-clay">{member.role ?? "TENANT"}</p>
                </div>
                <Button variant="danger" onClick={() => setRemoveStaff(member)}>Remove</Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {section === "categories" ? (
        <CategorySection categories={categories.data} pending={categories.isPending} failed={categories.isError} onRetry={() => void categories.refetch()} />
      ) : null}

      <BrandSheet open={addBrand} onClose={() => setAddBrand(false)} />
      <StaffSheet open={addStaff} brand={selected} onClose={() => setAddStaff(false)} />
      <Confirm
        open={removeBrand !== null}
        title="Remove brand"
        body={removeBrand ? `Remove ${removeBrand.name}? Staff and products linked to it may stop working.` : ""}
        confirmLabel="Remove brand"
        destructive
        busy={deleteBrand.isPending}
        onConfirm={() => {
          if (removeBrand) {
            deleteBrand.mutate(removeBrand);
          }
        }}
        onClose={() => setRemoveBrand(null)}
      />
      <Confirm
        open={removeStaff !== null}
        title="Remove staff"
        body={removeStaff ? `Remove ${removeStaff.username} from ${selected}? They will no longer be able to manage this brand.` : ""}
        confirmLabel="Remove"
        destructive
        busy={deleteStaff.isPending}
        onConfirm={() => {
          if (removeStaff) {
            deleteStaff.mutate(removeStaff);
          }
        }}
        onClose={() => setRemoveStaff(null)}
      />
    </div>
  );
}

function tabClass(active: boolean) {
  return active
    ? "border border-accent bg-accent px-3 py-2 text-sm text-white"
    : "border border-line-strong px-3 py-2 text-sm";
}

