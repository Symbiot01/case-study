import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { api } from "@/api/client";
import type { Brand, Category, Product, ProductPage } from "@/api/types";
import { ProductCard } from "@/components/catalog/ProductCard";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Empty } from "@/components/ui/SystemState";
import { Pagination } from "@/components/ui/Pagination";
import { ProductGridSkeleton } from "@/components/ui/Skeleton";
import { useFavourites, useFavouriteActions } from "@/features/favourites";
import { useDocumentTitle } from "@/lib/title";

type SortMode = "listed" | "price-asc" | "price-desc" | "stock";

function catalogueUrl(q: string, category: string, brand: string, page: number) {
  const params = new URLSearchParams();
  if (q) {
    params.set("search", q);
  }
  if (category) {
    params.set("category_id", category);
  }
  if (brand) {
    params.set("tenant_id", brand);
  }
  params.set("page", String(page));
  params.set("limit", "10");
  return `/products/?${params.toString()}`;
}

function sortProducts(products: Product[], sort: SortMode) {
  const next = [...products];
  if (sort === "price-asc") {
    next.sort((left, right) => left.price - right.price);
  } else if (sort === "price-desc") {
    next.sort((left, right) => right.price - left.price);
  } else if (sort === "stock") {
    next.sort((left, right) => right.quantity - left.quantity);
  }
  return next;
}

export function CataloguePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "";
  const brand = searchParams.get("brand") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const [draft, setDraft] = useState(q);
  const [sort, setSort] = useState<SortMode>("listed");
  const favourites = useFavourites();
  const actions = useFavouriteActions();

  useDocumentTitle("Catalogue · E-commerce");

  useEffect(() => {
    setDraft(q);
  }, [q]);

  useEffect(() => {
    if (window.location.hash === "#filters") {
      document.getElementById("filters")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  useEffect(() => {
    if (draft === q) {
      return;
    }
    const handle = window.setTimeout(() => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (draft) {
            next.set("q", draft);
          } else {
            next.delete("q");
          }
          next.delete("page");
          return next;
        },
        { replace: true },
      );
    }, 300);
    return () => window.clearTimeout(handle);
  }, [draft, q, setSearchParams]);

  const products = useQuery({
    queryKey: ["products", { q, category, brand, page }],
    queryFn: () => api<ProductPage>(catalogueUrl(q, category, brand, page)),
  });
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => api<Category[]>("/products/categories"),
  });
  const brands = useQuery({
    queryKey: ["brands"],
    queryFn: () => api<Brand[]>("/brands"),
    enabled: Boolean(brand),
  });
  const brandName = brands.data?.find((item) => String(item.id) === brand)?.name ?? "This brand";

  const visible = useMemo(() => sortProducts(products.data?.products ?? [], sort), [products.data?.products, sort]);
  const savedIds = new Set((favourites.data ?? []).map((product) => product.id));
  const filtered = Boolean(q || category || brand);

  function setParam(key: string, value: string) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      if (key !== "page") {
        next.delete("page");
      }
      return next;
    });
  }

  return (
    <div>
      {actions.confirm}
      <section className="px-5 pt-8 pb-6 md:px-10 lg:px-16">
        <h1 className="text-2xl font-semibold">Products</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Search the catalogue, filter by category or brand, and order only what is in stock.
        </p>
      </section>
      <section id="filters" className="sticky top-14 z-30 border-y border-line bg-surface px-5 py-4 md:px-10 lg:px-16">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative max-w-md flex-1">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Search products"
              aria-label="Search products"
              className="w-full border border-line-strong bg-canvas px-3 py-2 text-sm outline-none focus:border-ink"
            />
            {draft ? (
              <button type="button" className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted" onClick={() => setDraft("")}>
                Clear
              </button>
            ) : null}
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {brand ? (
              <Chip active onClick={() => setParam("brand", "")}>
                {brandName} · Clear
              </Chip>
            ) : null}
            <Chip active={!category} onClick={() => setParam("category", "")}>
              All
            </Chip>
            {(categories.data ?? []).map((item) => (
              <Chip key={item.id} active={category === String(item.id)} onClick={() => setParam("category", String(item.id))}>
                {item.name}
              </Chip>
            ))}
          </div>
          {categories.isError ? <p className="text-sm text-muted">Categories could not be loaded.</p> : null}
          <label className="flex items-center gap-2 text-sm text-muted">
            Sort page
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortMode)}
              className="border border-line-strong bg-canvas px-2 py-2 text-sm text-ink normal-case"
            >
              <option value="listed">As listed</option>
              <option value="price-asc">Price low–high</option>
              <option value="price-desc">Price high–low</option>
              <option value="stock">Stock</option>
            </select>
          </label>
        </div>
      </section>
      <section className="px-5 py-8 md:px-10 lg:px-16">
        <div className="mb-6 flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-semibold">{q ? `Results for “${q}”` : brand ? brandName : "All products"}</h2>
          <p className="text-sm text-muted">{products.data ? `${products.data.total} ${products.data.total === 1 ? "piece" : "pieces"}` : ""}</p>
        </div>
        {products.isPending ? <ProductGridSkeleton /> : null}
        {products.isError ? (
          <Empty title="The catalogue could not be loaded." action={{ href: "/", label: "Try again" }} />
        ) : null}
        {products.data && visible.length === 0 ? (
          <div>
            <Empty title={filtered ? "No products match." : "No products yet."} />
            {filtered ? (
              <Button
                className="mt-4"
                variant="secondary"
                onClick={() => {
                  setDraft("");
                  setSearchParams({});
                }}
              >
                Clear filters
              </Button>
            ) : null}
          </div>
        ) : null}
        {visible.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                saved={savedIds.has(product.id)}
                onToggleFavourite={actions.toggle}
              />
            ))}
          </div>
        ) : null}
        {products.data ? (
          <Pagination
            page={products.data.page}
            limit={products.data.limit}
            total={products.data.total}
            totalPages={products.data.total_pages}
            onPage={(nextPage) => setParam("page", String(nextPage))}
          />
        ) : null}
      </section>
    </div>
  );
}
