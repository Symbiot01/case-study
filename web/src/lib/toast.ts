export type ToastTone = "error" | "success";

export type ToastItem = {
  id: number;
  tone: ToastTone;
  title: string;
  message: string;
};

let nextId = 1;
let items: ToastItem[] = [];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export const toastStore = {
  push(toast: Omit<ToastItem, "id">) {
    const item = { ...toast, id: nextId++ };
    items = [...items, item].slice(-3);
    emit();
    window.setTimeout(() => toastStore.dismiss(item.id), 5000);
  },
  success(title: string, message = "") {
    this.push({ tone: "success", title, message });
  },
  failure(message: string) {
    this.push({ tone: "error", title: "Something went wrong", message });
  },

  dismiss(id: number) {
    items = items.filter((item) => item.id !== id);
    emit();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot() {
    return items;
  },
};

export function toastFailure(error: unknown, fallback = "Something went wrong. Try again.") {
  toastStore.failure(error instanceof Error ? error.message : fallback);
}
