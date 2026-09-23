import { CartView } from "@/components/cart/CartView";
import { useDocumentTitle } from "@/lib/title";

export function CartPage() {
  useDocumentTitle("Cart · E-commerce");

  return (
    <div className="px-5 py-10 md:px-10 lg:px-16">
      <CartView />
    </div>
  );
}
