import { Link } from "react-router-dom";

import { Button } from "@/components/ui/Button";

type Action = {
  href: string;
  label: string;
};

export function Empty({ title, action }: { title: string; action?: Action }) {
  return (
    <div className="border border-line bg-surface px-6 py-12">
      <p className="font-display text-2xl">{title}</p>
      {action ? (
        <Link to={action.href} className="mt-6 inline-block">
          <Button variant="secondary">{action.label}</Button>
        </Link>
      ) : null}
    </div>
  );
}

export function SystemState({
  title,
  body,
  action,
  secondary,
}: {
  title: string;
  body: string;
  action?: Action;
  secondary?: Action;
}) {
  return (
    <div className="mx-auto max-w-xl px-5 py-20 md:px-10">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-4 text-[0.9375rem] leading-relaxed text-muted">{body}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        {action ? (
          <Link to={action.href}>
            <Button>{action.label}</Button>
          </Link>
        ) : null}
        {secondary ? (
          <Link to={secondary.href}>
            <Button variant="secondary">{secondary.label}</Button>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
