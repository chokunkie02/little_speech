import HomeBackground from "@/components/home/HomeBackground";
import { DemoTour } from "@/components/landing/DemoTour";
import { PublicFooter, PublicHeader } from "@/components/landing/PublicChrome";

export const metadata = {
  title: "ตัวอย่างระบบ | Speech Adventure",
  description: "ลองมุมมองผู้ปกครองพร้อมผลฝึกตัวอย่าง และดูว่าโรงเรียน ครู และผู้ปกครองใช้งานร่วมกันอย่างไร",
};

export default function DemoPage() {
  return (
    <div className="relative isolate min-h-screen">
      <HomeBackground />
      <PublicHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <DemoTour />
      </main>
      <PublicFooter />
    </div>
  );
}
