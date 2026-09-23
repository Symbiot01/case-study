import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "@/auth/session";
import { useCart } from "@/cart/cart";
import type { Product } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { productImageSrc } from "@/lib/image";
import { stockLabel } from "@/lib/stock";
import { money } from "@/lib/money";
import { toastStore } from "@/lib/toast";

type ProductCardProps = {
  product: Product;
  saved: boolean;
  onToggleFavourite: (product: Product, saved: boolean) => void;
};

export function ProductPlate({ product, className = "" }: { product: Product; className?: string }) {
  const src = productImageSrc(product);
  if (src) {
    return (
      <img
        src={src}
        alt={product.name}
        className={`block aspect-[4/3] h-auto w-full object-cover ${className}`}
      />
    );
  }
  return (
    <div className={`flex aspect-[4/3] flex-col justify-end gap-1 bg-surface p-4 ${className}`}>
      <p className="text-sm text-muted">{product.tenant_name ?? "Brand"}</p>
      <p className="text-lg font-medium">{product.name}</p>
      <p className="text-sm text-muted">{product.category_name ?? "Uncategorised"}</p>
    </div>
  );
}

export function ProductCard({ product, saved, onToggleFavourite }: ProductCardProps) {
  const { add } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const stock = stockLabel(product.quantity);

  function addOne() {
    const result = add(product, 1);
    if (!result.ok) {
      toastStore.failure(result.message);
      return;
    }
    toastStore.success("Added to cart");
  }

  function onHeart() {
    if (!user) {
      const next = encodeURIComponent(`${location.pathname}${location.search}`);
      navigate(`/login?next=${next}`);
      return;
    }
    onToggleFavourite(product, saved);
  }

  return (
    <article className="flex flex-col border border-line bg-canvas">
      <div className="relative">
        <Link to={`/products/${product.id}`} className="block">
          <ProductPlate product={product} />
        </Link>
        <button
          type="button"
          aria-pressed={saved}
          aria-label={saved ? `Remove ${product.name} from favourites` : `Save ${product.name}`}
          className="absolute top-3 right-3 h-11 w-11 border border-line bg-canvas text-lg"
          onClick={onHeart}
        >
          <span className={saved ? "text-ink" : "text-muted"}>{saved ? "♥" : "♡"}</span>
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm tabular-nums">{money(product.price)}</p>
          <p className="text-sm text-muted">{stock.text}</p>
        </div>
        <Button className="mt-auto w-full" disabled={product.quantity <= 0} onClick={addOne}>
          {product.quantity <= 0 ? "Out of stock" : "Add to cart"}
        </Button>
      </div>
    </article>
  );
}
