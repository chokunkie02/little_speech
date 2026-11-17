import { z } from "zod";
import { azureConnection } from "@/lib/assessment/azure";
import { effectivePolicy, schoolSettingsSchema, validateSchoolSettings } from "@/lib/assessment/policy";
import {
  AssessmentError,
  activePolicy,
  assessmentCaller,
  assessmentDb,
  assessmentFailure,
  requireSchoolAdmin,
} from "@/lib/assessment/server";

export const runtime = "nodejs";
const HISTORY = 5;

const saveSchema = z
  .object({
    organizationId: z.string().uuid(),
    /** Revision the admin edited (0 = the school had none yet). */
    expectedRevision: z.number().int().min(0),
    settings: schoolSettingsSchema,
  })
  .strict();

/** School criteria page: the central policy with its frame, this school's criteria and recent saves. */
export async function GET(request: Request) {
  try {
    const organizationId = new URL(request.url).searchParams.get("organizationId") ?? "";
    if (!z.string().uuid().safeParse(organizationId).success)
      throw new AssessmentError("เลือกโรงเรียนก่อน");
    const caller = await assessmentCaller(request);
    await requireSchoolAdmin(caller, organizationId);
    const central = await activePolicy();
    const history = await assessmentDb()
      .from("school_assessment_versions")
      .select("id,revision,settings,created_at")
      .eq("organization_id", organizationId)
      .order("revision", { ascending: false })
      .limit(HISTORY);
    if (history.error) throw new AssessmentError("อ่านเกณฑ์ของโรงเรียนไม่สำเร็จ", 503);
    const versions = history.data.flatMap((row) => {
      const settings = schoolSettingsSchema.safeParse(row.settings);
      return settings.success ? [{ ...row, settings: settings.data }] : [];
    });
    const current = versions[0] ?? null;
    const effective = effectivePolicy(central.config, current?.settings ?? null);
    return Response.json(
      {
        central,
        school: current,
        history: versions.map(({ id, revision, created_at, settings }) => ({
          id,
          revision,
          created_at,
          changedStages: settings.overrides.length,
          aiEnabled: settings.aiEnabled,
        })),
        clampedStages: effective.clampedStages,
        provider: { ready: azureConnection().ready },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return assessmentFailure(error);
  }
}

/** Save the school's criteria as a new revision. Rejected when outside the central frame. */
export async function POST(request: Request) {
  try {
    const caller = await assessmentCaller(request);
    const parsed = saveSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new AssessmentError("ข้อมูลเกณฑ์ไม่ครบ กรุณาโหลดหน้าใหม่");
    const { organizationId, expectedRevision, settings } = parsed.data;
    await requireSchoolAdmin(caller, organizationId);
    const central = await activePolicy();
    const issues = validateSchoolSettings(settings, central.config);
    if (issues.length) throw new AssessmentError(issues[0], 422);
    // Keep only real differences from the central rule, so later central changes still reach the school.
    const overrides = settings.overrides.flatMap((override) => {
      const rule = central.config.rules.find((rule) => rule.stageId === override.stageId)!;
      const diff = {
        stageId: override.stageId,
        ...(override.mode && override.mode !== rule.mode ? { mode: override.mode } : {}),
        ...(override.passScore !== undefined && override.passScore !== rule.passScore ? { passScore: override.passScore } : {}),
        ...(override.practiceScore !== undefined && override.practiceScore !== rule.practiceScore ? { practiceScore: override.practiceScore } : {}),
        ...(override.minCompleteness !== undefined && override.minCompleteness !== rule.minCompleteness ? { minCompleteness: override.minCompleteness } : {}),
      };
      return Object.keys(diff).length > 1 ? [diff] : [];
    });
    const saved = await assessmentDb()
      .from("school_assessment_versions")
      .insert({
        organization_id: organizationId,
        revision: expectedRevision + 1,
        settings: { ...settings, overrides },
        created_by: caller.user.id,
      })
      .select("revision")
      .single();
    if (saved.error) {
      if (saved.error.code === "23505")
        throw new AssessmentError("มีผู้ดูแลคนอื่นบันทึกเกณฑ์ไปก่อน กรุณาโหลดใหม่ก่อนแก้ต่อ", 409);
      throw new AssessmentError("บันทึกเกณฑ์ไม่สำเร็จ", 503);
    }
    return Response.json({ revision: saved.data.revision }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return assessmentFailure(error);
  }
}
