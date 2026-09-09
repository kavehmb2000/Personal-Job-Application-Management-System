/// <reference lib="webworker" />

import {
  CacheableResponsePlugin,
  ExpirationPlugin,
  NetworkFirst,
  Serwist,
} from "serwist";

import {
  isOfflineCacheableRequest,
  OFFLINE_DOCUMENT_CACHE_NAME,
  OFFLINE_DOCUMENT_MAX_AGE_SECONDS,
  OFFLINE_DOCUMENT_MAX_ENTRIES,
} from "../lib/offline/cache-policy";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: Array<{
    revision: string | null;
    url: string;
  }>;
};

const offlineDocumentStrategy = new NetworkFirst({
  cacheName: OFFLINE_DOCUMENT_CACHE_NAME,
  networkTimeoutSeconds: 3,
  plugins: [
    new CacheableResponsePlugin({
      statuses: [200],
    }),
    new ExpirationPlugin({
      maxEntries: OFFLINE_DOCUMENT_MAX_ENTRIES,
      maxAgeSeconds: OFFLINE_DOCUMENT_MAX_AGE_SECONDS,
      maxAgeFrom: "last-used",
    }),
  ],
});

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
});

serwist.registerCapture(
  ({ request, url, sameOrigin }) =>
    sameOrigin && isOfflineCacheableRequest(request, url, self.location.origin),
  offlineDocumentStrategy,
);

serwist.addEventListeners();
