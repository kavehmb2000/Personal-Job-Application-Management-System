const OPPORTUNITY_ID_PATTERN =
  "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";

const CRITICAL_PATH_PATTERNS = [
  /^\/dashboard$/,
  /^\/opportunities$/,
  new RegExp(`^\\/opportunities\\/${OPPORTUNITY_ID_PATTERN}$`, "i"),
] as const;

/**
 * Dedicated runtime cache containing authenticated application documents
 * that are safe to reuse for bounded read-only offline access.
 */
export const OFFLINE_DOCUMENT_CACHE_NAME =
  "job-application-offline-documents-v1";

/**
 * Keep the cache deliberately small. Each Opportunity page is a complete
 * read model, so there is no reason for the offline cache to grow without
 * bound.
 */
export const OFFLINE_DOCUMENT_MAX_ENTRIES = 12;

/**
 * Cached Opportunity information is intentionally short-lived.
 */
export const OFFLINE_DOCUMENT_MAX_AGE_SECONDS = 24 * 60 * 60;

export function isCriticalOfflinePath(pathname: string): boolean {
  return CRITICAL_PATH_PATTERNS.some((pattern) => pattern.test(pathname));
}

export function isOfflineCacheableRequest(
  request: Request,
  url: URL,
  origin: string,
): boolean {
  if (request.method !== "GET") {
    return false;
  }

  if (request.destination !== "document") {
    return false;
  }

  if (url.origin !== origin) {
    return false;
  }

  return isCriticalOfflinePath(url.pathname);
}
