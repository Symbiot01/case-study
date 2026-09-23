import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "react-router-dom";

import { api, ApiError } from "@/api/client";
import type { Order } from "@/api/types";
import { RequireAuth } from "@/auth/guards";
import { Empty, SystemState } from "@/components/ui/SystemState";
import { Skeleton } from "@/components/ui/Skeleton";
import { money } from "@/lib/money";
import { useDocumentTitle } from "@/lib/title";

export function OrderDetailPage() {
  return (
    <RequireAuth>
      <OrderDetail />
    </RequireAuth>
  );
}

function OrderDetail() {
  const params = useParams();
  const location = useLocation();
  const orderId = Number(params.orderId);
  const confirmed = Boolean((location.state as { confirmed?: boolean } | null)?.confirmed);
  const order = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => api<Order>(`/orders/${orderId}`),
    enabled: Number.isInteger(orderId) && orderId > 0,
    retry: false,
    meta: { toast: false },
  });

  useDocumentTitle(`Order ${orderId} · E-commerce`);

  if (!Number.isInteger(orderId) || orderId <= 0 || (order.isError && order.error instanceof ApiError && order.error.status === 404)) {
    return <SystemState title="Order not found." body="That order is not in your history." action={{ href: "/orders", label: "Your orders" }} />;
  }

  if (order.isPending) {
    return <Skeleton className="mx-5 mt-10 h-64 md:mx-10" />;
  }

  if (!order.data) {
    return <SystemState title="The order could not be loaded." body="Try your order history again." action={{ href: "/orders", label: "Your orders" }} />;
  }

  const item = order.data;

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 md:px-10">
      {confirmed ? (
        <div className="mb-8 border border-olive bg-surface px-5 py-4">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-olive">Order placed</p>
          <p className="mt-2 font-display text-3xl">Thank you. Your order is recorded.</p>
        </div>
      ) : null}
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-clay">Order #{item.id}</p>
      <h1 className="mt-2 font-display text-4xl font-light">Order detail</h1>
      <p className="mt-3 text-sm text-muted">
        {item.total_quantity} items · <span className="tabular-nums">{money(item.total_amount)}</span>
      </p>
      <ul className="mt-8 divide-y divide-line border-y border-line">
        {item.items.map((line) => (
          <li key={line.id} className="flex items-baseline justify-between gap-4 py-4">
            <div>
              <Link to={`/products/${line.product_id}`} className="font-display text-2xl">
                {line.product_name ?? `Product ${line.product_id}`}
              </Link>
              <p className="mt-1 text-sm text-muted">Quantity {line.quantity}</p>
            </div>
            <p className="text-sm tabular-nums">{money(line.price)}</p>
          </li>
        ))}
      </ul>
      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link to="/orders" className="underline underline-offset-4">View order history</Link>
        <Link to="/" className="underline underline-offset-4">Continue shopping</Link>
      </div>
      {!item.items.length ? <div className="mt-6"><Empty title="This order has no items." /></div> : null}
    </div>
  );
}
