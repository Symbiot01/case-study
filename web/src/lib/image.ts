import { API_BASE } from "@/api/client";
import type { Product } from "@/api/types";

export function productImageSrc(product: Pick<Product, "id" | "has_image" | "image_version">): string | null {
  if (!product.has_image || !product.image_version) {
    return null;
  }
  return `${API_BASE}/products/${product.id}/image?v=${encodeURIComponent(product.image_version)}`;
}
