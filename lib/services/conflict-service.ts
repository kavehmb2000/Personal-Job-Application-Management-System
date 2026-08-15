export interface ConflictDetails<TCurrent = unknown, TDraft = unknown> {
  code: "CONFLICT";
  message: string;
  current: TCurrent;
  draft: TDraft;
}

export class ConflictError<TCurrent = unknown, TDraft = unknown> extends Error {
  readonly code = "CONFLICT" as const;

  constructor(
    readonly current: TCurrent,
    readonly draft: TDraft,
    message = "The record was changed by another request.",
  ) {
    super(message);
    this.name = "ConflictError";
  }
}

export function createConflictDetails<TCurrent, TDraft>(
  current: TCurrent,
  draft: TDraft,
  message?: string,
): ConflictDetails<TCurrent, TDraft> {
  return {
    code: "CONFLICT",
    message: message ?? "The record was changed by another request.",
    current,
    draft,
  };
}
