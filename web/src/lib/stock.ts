export function stockLabel(quantity: number): { text: string; tone: "ok" | "low" | "out" } {
  if (quantity <= 0) {
    return { text: "Out of stock", tone: "out" };
  }
  if (quantity === 1) {
    return { text: "1 in stock", tone: "low" };
  }
  return { text: `${quantity} in stock`, tone: "ok" };
}
