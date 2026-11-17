"use client";

import { SchoolArea } from "@/components/school-admin/SchoolArea";
import { SchoolAssessment } from "@/components/school-admin/SchoolAssessment";

export default function SchoolAssessmentPage() {
  return (
    <SchoolArea title="เกณฑ์ประเมิน">
      <SchoolAssessment />
    </SchoolArea>
  );
}
