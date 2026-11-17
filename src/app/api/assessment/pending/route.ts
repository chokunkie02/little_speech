import { z } from "zod";
import type { AssessmentResult } from "@/lib/assessment/policy";
import {
  AssessmentError,
  assessmentCaller,
  assessmentDb,
  assessmentFailure,
} from "@/lib/assessment/server";

export const runtime = "nodejs";
const LIMIT = 100;

/**
 * Results in one classroom that wait for an adult: "needs review" outcomes and AI suggestions nobody
 * has confirmed yet. Classroom teachers only.
 */
export async function GET(request: Request) {
  try {
    const classroomId = new URL(request.url).searchParams.get("classroomId") ?? "";
    if (!z.string().uuid().safeParse(classroomId).success) throw new AssessmentError("เลือกห้องเรียนก่อน");
    const caller = await assessmentCaller(request);
    const teacher = await caller.client.rpc("is_classroom_teacher", { p_classroom_id: classroomId });
    if (teacher.error || teacher.data !== true)
      throw new AssessmentError("เฉพาะครูประจำห้องนี้ที่ดูรายการรอตรวจได้", 403);

    const db = assessmentDb();
    const students = await db
      .from("classroom_students")
      .select("child_id, student_number, child_profiles!inner(name, nickname, archived_at, organization_id)")
      .eq("classroom_id", classroomId)
      .is("child_profiles.archived_at", null);
    if (students.error) throw new AssessmentError("โหลดรายชื่อนักเรียนไม่สำเร็จ", 503);
    type Student = { child_id: string; student_number: number | null; child_profiles: { name: string; nickname: string | null } };
    const roster = new Map((students.data as unknown as Student[]).map((row) => [row.child_id, row]));
    if (!roster.size) return Response.json([], { headers: { "Cache-Control": "no-store" } });

    const results = await db
      .from("assessment_results")
      .select("id, child_id, stage_id, reference_text, result, created_at")
      .in("child_id", [...roster.keys()])
      .eq("state", "completed")
      .is("adult_review", null)
      .or("result->>outcome.eq.needs_review,result->>source.eq.azure")
      .order("created_at", { ascending: false })
      .limit(LIMIT);
    if (results.error) throw new AssessmentError("โหลดรายการรอตรวจไม่สำเร็จ", 503);

    return Response.json(
      results.data.map((row) => {
        const student = roster.get(row.child_id)!;
        return {
          id: row.id,
          childId: row.child_id,
          childName: student.child_profiles.nickname || student.child_profiles.name,
          studentNumber: student.student_number,
          stageId: row.stage_id,
          referenceText: row.reference_text,
          result: row.result as AssessmentResult,
          createdAt: row.created_at,
        };
      }),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return assessmentFailure(error);
  }
}
