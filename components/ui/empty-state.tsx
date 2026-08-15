import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <section className="ui-state" aria-label={title}>
      <h2>{title}</h2>

      {description ? <p>{description}</p> : null}

      {action ? <div className="ui-state-action">{action}</div> : null}
    </section>
  );
}
