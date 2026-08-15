import type { ReactNode } from "react";

interface ErrorStateProps {
  title?: string;
  description?: string;
  action?: ReactNode;
}

export function ErrorState({
  title = "Something went wrong",
  description = "We could not complete this operation.",
  action,
}: ErrorStateProps) {
  return (
    <section className="ui-state ui-state-error" role="alert">
      <h2>{title}</h2>
      <p>{description}</p>

      {action ? <div className="ui-state-action">{action}</div> : null}
    </section>
  );
}
