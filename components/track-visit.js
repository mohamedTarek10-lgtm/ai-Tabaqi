"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function TrackVisit() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    const payload = {
      path: pathname,
    };

    fetch("/api/track-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    }).catch(() => {});
  }, [pathname]);

  return null;
}
