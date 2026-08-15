interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = "Loading..." }: LoadingStateProps) {
  return (
    <div className="ui-loading" role="status" aria-live="polite">
      <span className="ui-loading-indicator" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
