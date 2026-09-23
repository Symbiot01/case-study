import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Modal";

type ConfirmProps = {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  busy?: boolean;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function Confirm({ open, title, body, confirmLabel, busy, destructive = false, onConfirm, onClose }: ConfirmProps) {
  return (
    <Dialog open={open} title={title} onClose={onClose} dismissOnBackdrop={!destructive}>
      <p className="text-[0.9375rem] leading-relaxed text-charcoal">{body}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button variant={destructive ? "danger" : "primary"} busy={busy} busyLabel="Working…" onClick={onConfirm}>
          {confirmLabel}
        </Button>
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
      </div>
    </Dialog>
  );
}
