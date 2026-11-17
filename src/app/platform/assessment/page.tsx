import { Gauge } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import AssessmentAdmin from "@/components/assessment/AssessmentAdmin";
import { Page, PageHeader } from "@/components/ui";

export const metadata = { title: "ศูนย์ประเมินการเรียนรู้ | Speech Adventure" };

export default function AssessmentAdminPage() {
  return (
    <AppShell>
      <Page>
        <PageHeader icon={<Gauge size={20} />} title="ศูนย์ประเมินการเรียนรู้"
          back={{ href: "/platform", label: "ภาพรวมระบบ" }}
          description="เกณฑ์กลางที่ห้องฝึกใช้ตรวจผลในแต่ละขั้น" />
        <AssessmentAdmin />
      </Page>
    </AppShell>
  );
}
