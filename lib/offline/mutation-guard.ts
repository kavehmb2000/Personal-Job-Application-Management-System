export class OfflineMutationError extends Error {
  constructor() {
    super("Mutations are unavailable while offline.");
    this.name = "OfflineMutationError";
  }
}

type OnlineStateReader = () => boolean;

function getBrowserOnlineState(): boolean {
  return typeof navigator === "undefined" || navigator.onLine;
}

export function assertMutationAllowed(
  readOnlineState: OnlineStateReader = getBrowserOnlineState,
): void {
  if (!readOnlineState()) {
    throw new OfflineMutationError();
  }
}

export async function mutationFetch(
  input: RequestInfo | URL,
  init: RequestInit,
): Promise<Response> {
  assertMutationAllowed();

  return fetch(input, init);
}
