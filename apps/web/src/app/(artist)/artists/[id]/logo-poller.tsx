"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function LogoPoller() {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(id);
  }, [router]);
  return null;
}
