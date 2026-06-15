"use client";
import { useEffect, useState } from "react";
import { getManifest } from "@/lib/data";

const STALE_DAYS = 60;

export default function PWA() {
  const [offline, setOffline] = useState(false);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    getManifest()
      .then((m) => {
        const age = (Date.now() - new Date(m.builtAt).getTime()) / 86400000;
        setStale(age > STALE_DAYS);
      })
      .catch(() => {});
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline && !stale) return null;
  return (
    <div className="bg-[var(--color-amber-wash)] px-4 py-1.5 text-center text-[12px] text-[var(--color-amber-ink)]">
      {offline ? "Offline — showing cached data. " : ""}
      {stale ? "This data may be more than 60 days old; check for a newer release." : ""}
    </div>
  );
}
