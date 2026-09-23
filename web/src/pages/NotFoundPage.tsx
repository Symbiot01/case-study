import { SystemState } from "@/components/ui/SystemState";

export function NotFoundPage() {
  return (
    <SystemState
      title="Page not found."
      body="That page does not exist."
      action={{ href: "/", label: "Back to store" }}
    />
  );
}
