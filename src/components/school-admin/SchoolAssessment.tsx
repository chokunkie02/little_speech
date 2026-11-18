"use client";

import { useEffect, useMemo, useState } from "react";
import { Lock, RotateCcw } from "lucide-react";
import { useSchoolArea } from "@/components/school-admin/SchoolArea";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  DataLoadError,
  FormField,
  Input,
  LoadingState,
  Section,
  Select,
  Switch,
  toast,
} from "@/components/ui";
import { assessmentRequest } from "@/lib/assessment/client";
import {
  REVIEWER_OPTIONS,
  SCORE_KEYS,
  SCORE_LABELS,
  STAGE_DEFINITIONS,
  effectiveRule,
  frameOf,
  validateSchoolSettings,
  type AssessmentRule,
  type PolicySnapshot,
  type SchoolSettings,
} from "@/lib/assessment/policy";
import { formatThaiDate } from "@/lib/thaiDate";

interface SchoolData {
  central: PolicySnapshot;
  school: { id: string; revision: number; settings: SchoolSettings; created_at: string } | null;
  history: { id: string; revision: number; created_at: string; changedStages: number; aiEnabled: boolean }[];
  clampedStages: string[];
  provider: { ready: boolean; label?: string };
}

type StageValues = Pick<AssessmentRule, "mode" | "passScore" | "practiceScore" | "minCompleteness">;
type Form = { aiEnabled: boolean; reviewers: SchoolSettings["reviewers"]; stages: Record<string, StageValues> };

const TRACKS = [
  { id: "speech", label: "ฝึกออกเสียง" },
  { id: "communication", label: "พูดเพื่อสื่อสาร" },
  { id: "phonics", label: "เสียงกับตัวอักษร" },
] as const;
/** rule.mode "azure" is the stored name of the AI method, whichever service runs it. */
const MODE_LABELS = { azure: "AI ตรวจเสียง", adult: "ผู้ใหญ่ตรวจ" } as const;

const pick = (rule: AssessmentRule): StageValues => ({
  mode: rule.mode,
  passScore: rule.passScore,
  practiceScore: rule.practiceScore,
  minCompleteness: rule.minCompleteness,
});

/** The form starts from what is in effect now: central rules with this school's saved values applied. */
function formFrom(data: SchoolData): Form {
  const settings = data.school?.settings;
  return {
    aiEnabled: settings?.aiEnabled ?? false,
    reviewers: settings?.reviewers ?? "teacher",
    stages: Object.fromEntries(data.central.config.rules.map((rule) => [
      rule.stageId,
      pick(effectiveRule(rule, settings?.overrides.find((override) => override.stageId === rule.stageId)).rule),
    ])),
  };
}

const sameValues = (a: StageValues, b: StageValues) =>
  a.mode === b.mode && SCORE_KEYS.every((key) => a[key] === b[key]);

/** School admin page: choose how each stage is checked and tune the scores inside the central frame. */
export function SchoolAssessment() {
  const { orgId } = useSchoolArea();
  const [data, setData] = useState<{ orgId: string; value: SchoolData }>();
  const [failed, setFailed] = useState(false);
  const [form, setForm] = useState<Form>();
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    assessmentRequest<SchoolData>(`/api/assessment/school?organizationId=${orgId}`)
      .then((value) => {
        if (!active) return;
        setData({ orgId, value });
        setForm(formFrom(value));
        setFailed(false);
      })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [orgId, revision]);

  const current = data?.orgId === orgId ? data.value : undefined;
  const central = current?.central.config;
  const settings: SchoolSettings | undefined = useMemo(() => form && central && {
    aiEnabled: form.aiEnabled,
    reviewers: form.reviewers,
    overrides: central.rules
      .filter((rule) => !sameValues(form.stages[rule.stageId], pick(rule)))
      .map((rule) => ({ stageId: rule.stageId, ...form.stages[rule.stageId] })),
  }, [form, central]);
  const issues = settings && central ? validateSchoolSettings(settings, central) : [];
  const saved = current ? formFrom(current) : undefined;
  const dirty = !!form && !!saved && JSON.stringify(form) !== JSON.stringify(saved);

  if (!current || !form || !central || !settings) {
    return failed ? <DataLoadError message="โหลดเกณฑ์ประเมินไม่สำเร็จ" onRetry={() => setRevision((value) => value + 1)} />
      : <LoadingState variant="cards" rows={3} />;
  }

  const aiAllowed = central.enabled && !!central.allowSchoolAi;
  const aiReason = !central.enabled ? "แอดมินระบบยังไม่เปิดการประเมินเสียงด้วย AI"
    : !central.allowSchoolAi ? "แอดมินระบบยังไม่อนุญาตให้โรงเรียนเปิด AI เอง"
      : !current.provider.ready ? "เปิดได้ แต่ระบบยังไม่ได้ตั้งค่าบริการ AI จึงยังไม่ทำงาน" : undefined;

  const setStage = (stageId: string, values: Partial<StageValues>) =>
    setForm((form) => form && { ...form, stages: { ...form.stages, [stageId]: { ...form.stages[stageId], ...values } } });

  async function save() {
    if (!settings || issues.length) return;
    setBusy(true);
    try {
      await assessmentRequest("/api/assessment/school", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId, expectedRevision: current?.school?.revision ?? 0, settings }),
      });
      toast.success("บันทึกเกณฑ์ของโรงเรียนแล้ว ผลฝึกครั้งถัดไปใช้เกณฑ์นี้");
      setRevision((value) => value + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "บันทึกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  const saveButton = (
    <Button block onClick={() => void save()} disabled={!dirty || issues.length > 0} loading={busy}>บันทึกเกณฑ์</Button>
  );

  function stageRow(stageId: string) {
    const stage = STAGE_DEFINITIONS.find((stage) => stage.id === stageId)!;
    const rule = central!.rules.find((rule) => rule.stageId === stageId)!;
    const frame = frameOf(rule);
    const values = form!.stages[stageId];
    const changed = !sameValues(values, pick(rule));
    const canChoose = stage.automatic && frame.mode === "choice";
    return (
      <li key={stageId} className="space-y-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="font-semibold text-text">{stage.label}</h3>
            {changed && <Badge tone="primary">ปรับแล้ว</Badge>}
            {current!.clampedStages.includes(stageId) && <Badge tone="warning">ปรับตามกรอบใหม่</Badge>}
          </div>
          {changed && (
            <Button variant="ghost" size="sm" icon={<RotateCcw size={14} aria-hidden="true" />} onClick={() => setStage(stageId, pick(rule))}>
              ใช้ค่ากลาง
            </Button>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-[14rem_minmax(0,1fr)] md:items-start">
          {canChoose ? (
            <FormField label="วิธีตรวจ">
              <Select value={values.mode} onChange={(event) => setStage(stageId, { mode: event.target.value as StageValues["mode"] })}>
                <option value="azure">{MODE_LABELS.azure}</option>
                <option value="adult">{MODE_LABELS.adult}</option>
              </Select>
            </FormField>
          ) : (
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-text">วิธีตรวจ</p>
              <p className="flex min-h-10 items-center gap-1.5 text-sm text-text-muted">
                <Lock size={14} aria-hidden="true" />{MODE_LABELS[rule.mode]} · ล็อกโดยระบบ
              </p>
            </div>
          )}
          {values.mode === "azure" ? (
            <div className="grid grid-cols-3 gap-2">
              {SCORE_KEYS.map((key) => (
                <FormField key={key} label={SCORE_LABELS[key]} hint={`กรอบ ${frame[key][0]}–${frame[key][1]} · กลาง ${rule[key]}`}>
                  <Input type="number" inputMode="numeric" min={frame[key][0]} max={frame[key][1]} value={values[key]}
                    onChange={(event) => setStage(stageId, { [key]: Number(event.target.value) })} />
                </FormField>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted md:pt-7">
              {stage.automatic ? "ผู้ใหญ่ฟังแล้วบันทึกผลเอง ไม่ใช้คะแนน" : "ข้อเลือกภาพตรวจจากเฉลย ส่วนการสื่อสารและท่าทางผู้ใหญ่บันทึกผลเอง"}
            </p>
          )}
        </div>
      </li>
    );
  }

  const changedCount = settings.overrides.length;
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <aside className="space-y-5 lg:sticky lg:top-20 lg:col-start-2 lg:row-start-1">
        <Card>
          <CardHeader title="สรุปของโรงเรียน" description={`อิงเกณฑ์กลางเวอร์ชัน ${current.central.version}`} />
          <CardContent className="space-y-4">
            <FormField inline label="เปิดการประเมินเสียงด้วย AI"
              hint={aiReason ?? "เสียงของเด็กถูกส่งไปตรวจเมื่อผู้ใหญ่กดยินยอมทุกครั้ง"}>
              <Switch checked={form.aiEnabled} disabled={!aiAllowed}
                onCheckedChange={(aiEnabled) => setForm({ ...form, aiEnabled })} />
            </FormField>
            <FormField label="ใครยืนยันผลได้" hint="ผลที่รอยืนยันจะขึ้นในแท็บ “รอตรวจ” ของห้องเรียน">
              <Select value={form.reviewers} onChange={(event) => setForm({ ...form, reviewers: event.target.value as Form["reviewers"] })}>
                {Object.entries(REVIEWER_OPTIONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
            </FormField>
            <p className="text-sm text-text">{changedCount ? `ปรับจากค่ากลาง ${changedCount} ขั้น` : "ใช้ค่ากลางทุกขั้น"}</p>
            {issues.length > 0 && <Alert tone="error">{issues[0]}</Alert>}
            <div className="hidden lg:block">{saveButton}</div>
          </CardContent>
        </Card>
        {current.history.length > 0 && (
          <Card className="hidden lg:block">
            <CardHeader title="บันทึกล่าสุด" />
            <CardContent>
              <ul className="divide-y divide-border text-sm">
                {current.history.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="text-text">ครั้งที่ {entry.revision}</span>
                    <span className="text-caption text-text-muted">{formatThaiDate(entry.created_at, "datetime")} · ปรับ {entry.changedStages} ขั้น</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </aside>

      <div className="min-w-0 space-y-6 lg:col-start-1 lg:row-start-1">
        {current.clampedStages.length > 0 && (
          <Alert tone="warning" title="แอดมินระบบปรับกรอบใหม่">
            บางขั้นมีค่าที่เกินกรอบใหม่ ระบบใช้ค่าขอบของกรอบแทนแล้ว ตรวจแล้วกดบันทึกเพื่อยืนยัน
          </Alert>
        )}
        {TRACKS.map((track) => (
          <Section key={track.id} title={track.label}>
            <Card>
              <ul className="divide-y divide-border">
                {STAGE_DEFINITIONS.filter((stage) => stage.track === track.id).map((stage) => stageRow(stage.id))}
              </ul>
            </Card>
          </Section>
        ))}
      </div>

      {dirty && (
        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 rounded-card border border-border bg-surface p-3 shadow-card lg:hidden">
          {saveButton}
        </div>
      )}
    </div>
  );
}
