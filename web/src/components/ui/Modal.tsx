import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { cx } from "@/lib/cx";

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  dismissOnBackdrop?: boolean;
};

const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function Modal({ open, title, onClose, children, dismissOnBackdrop = true }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useRef(`dialog-${title.replace(/\s+/g, "-").toLowerCase()}`);

  useEffect(() => {
    if (!open) {
      return;
    }
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const items = panel ? Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector)) : [];
    (items[0] ?? panel)?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panel) {
        return;
      }
      const current = Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (element) => !element.hasAttribute("disabled"),
      );
      if (current.length === 0) {
        event.preventDefault();
        return;
      }
      const first = current[0];
      const last = current[current.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/40 md:items-center md:p-6"
      onMouseDown={(event) => {
        if (dismissOnBackdrop && event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId.current}
        tabIndex={-1}
        className="max-h-[92vh] w-full overflow-y-auto border border-line bg-surface p-5 outline-none md:max-w-lg md:p-8"
      >
        <div className="mx-auto mb-4 h-1 w-10 bg-line-strong md:hidden" />
        <div className="mb-6 flex items-start justify-between gap-4">
          <h2 id={titleId.current} className="font-display text-3xl font-normal tracking-tight">
            {title}
          </h2>
          <button type="button" className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em]" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function Dialog(props: ModalProps) {
  return <Modal {...props} />;
}

export function Sheet(props: ModalProps) {
  return <Modal {...props} />;
}

export function panelClass(className?: string) {
  return cx("border border-line bg-surface", className);
}
