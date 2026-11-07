"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function InviteTokenRedirect() {
  const params = useParams();
  const router = useRouter();
  const token = typeof params.token === "string" ? params.token : "";

  useEffect(() => {
    router.replace(token ? `/invite/accept?token=${encodeURIComponent(token)}` : "/invite/accept");
  }, [token, router]);

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </main>
  );
}
