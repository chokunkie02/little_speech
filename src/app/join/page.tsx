import { Suspense } from "react";
import type { Metadata } from "next";
import JoinFlow from "./JoinFlow";

export const metadata: Metadata = { title: "ใช้รหัสเข้าร่วม — Speech Adventure" };

export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinFlow />
    </Suspense>
  );
}
