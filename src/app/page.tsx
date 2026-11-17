import HomeBackground from "@/components/home/HomeBackground";
import { PublicFooter, PublicHeader } from "@/components/landing/PublicChrome";
import { FinalCta, ForFamilies, ForSchools, Hero, HowItWorks, Journey, StatsStrip, Trust } from "@/components/landing/LandingSections";

export const metadata = {
  title: "Speech Adventure — ระบบฝึกพูดสำหรับเด็กไทย",
  description:
    "ฝึกพูดทีละขั้นที่บ้านและที่โรงเรียน ฟังเสียงตัวอย่าง ดูท่าปาก แล้วลองพูดตาม ผู้ปกครองและครูเห็นความก้าวหน้าเดียวกัน",
};

/** Landing page — public, outside the app shell. */
export default function LandingPage() {
  return (
    <div className="relative isolate min-h-screen">
      <HomeBackground />
      <PublicHeader />
      <main className="mx-auto max-w-6xl space-y-16 px-4 pb-16 pt-5 sm:space-y-20 sm:px-6">
        <div className="space-y-3">
          <Hero />
          <StatsStrip />
        </div>
        <HowItWorks />
        <Journey />
        <ForFamilies />
        <ForSchools />
        <Trust />
        <FinalCta />
      </main>
      <PublicFooter />
    </div>
  );
}
