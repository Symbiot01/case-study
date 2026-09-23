import { useSyncExternalStore } from "react";

import { toastStore } from "@/lib/toast";

export function ToastViewport() {
  const toasts = useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot, toastStore.getSnapshot);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[80] flex flex-col items-center gap-2 px-3 md:inset-x-auto md:top-4 md:right-4 md:items-end">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.tone === "error" ? "alert" : "status"}
          className="pointer-events-auto w-full max-w-sm border border-ink bg-ink px-4 py-3 text-canvas"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em]">{toast.title}</p>
              {toast.message ? <p className="mt-1 text-sm leading-relaxed text-[#f6f0ea]">{toast.message}</p> : null}
            </div>
            <button
              type="button"
              className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em]"
              onClick={() => toastStore.dismiss(toast.id)}
            >
              Close
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
