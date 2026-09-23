import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { api } from "@/api/client";
import type { Brand } from "@/api/types";
import { Empty, SystemState } from "@/components/ui/SystemState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useDocumentTitle } from "@/lib/title";

export function BrandsPage() {
  const brands = useQuery({
    queryKey: ["brands"],
    queryFn: () => api<Brand[]>("/brands"),
  });

  useDocumentTitle("Brands · E-commerce");

  return (
    <div className="px-5 py-10 md:px-10 lg:px-16">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-clay">Directory</p>
      <h1 className="mt-2 font-display text-4xl font-light">Brands</h1>
      <p className="mt-3 max-w-xl text-muted">Each name is a brand in this shop. Open one to see its products.</p>
      {brands.isPending ? <Skeleton className="mt-8 h-48" /> : null}
      {brands.isError ? <SystemState title="The brand list could not be loaded." body="Try again from the catalogue." action={{ href: "/", label: "Back to store" }} /> : null}
      {brands.data && brands.data.length === 0 ? (
        <div className="mt-8">
          <Empty title="No brands yet." />
        </div>
      ) : null}
      <ul className="mt-8 divide-y divide-line border-y border-line">
        {(brands.data ?? []).map((brand) => (
          <li key={brand.id}>
            <Link to={`/?brand=${brand.id}`} className="flex items-center justify-between py-4">
              <span className="font-display text-2xl">{brand.name}</span>
              <span className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted">View pieces</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
