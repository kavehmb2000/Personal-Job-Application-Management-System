"use client";

import { useEffect, useState } from "react";

export function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(window.navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) {
    return null;
  }

  return (
    <div
      className="connection-status connection-status-offline"
      role="status"
      aria-live="polite"
    >
      <strong>Offline.</strong> Previously viewed information may be shown from
      cache. Changes cannot be saved until the connection is restored.
    </div>
  );
}
