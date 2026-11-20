"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, Lock, MessageCircle, Mic, RotateCcw, Shapes, UserCheck } from "lucide-react";
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
  provider: { ready: boolean };
}

type StageValues = Pick<AssessmentRule, "mode" | "passScore" | "practiceScore" | "minCompleteness">;
type Form = { aiEnabled: boolean; reviewers: SchoolSettings["reviewers"]; stages: Record<string, StageValues> };

const TRACKS = [
  { id: "speech", label: "ฝึกออกเสียง", color: "#5548D4", icon: Mic },
  { id: "communication", label: "พูดเพื่อสื่อสาร", color: "#1F9D6E", icon: MessageCircle },
  { id: "phonics", label: "เสียงกับตัวอักษร", color: "#D2861B", icon: Shapes },
] as const;

/** 0–100 strip: below "ฝึกต่อ" is red, up to "ทำได้" is amber, above is green. */
function ScoreScale({ pass, practice }: { pass: number; practice: number }) {
  const low = Math.max(0, Math.min(100, practice));
  const high = Math.max(low, Math.min(100, pass));
  return (
    <div aria-hidden="true" className="space-y-1">
      <div className="flex h-2 overflow-hidden rounded-full">
        <span className="bg-error/35" style={{ width: `${low}%` }} />
        <span className="bg-warning/70" style={{ width: `${high - low}%` }} />
        <span className="flex-1 bg-success/80" />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[0.6875rem] text-text-muted">
        <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-error/50" />ยังไม่ผ่าน &lt; {practice}</span>
        <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-warning" />ฝึกต่อ {practice}–{Math.max(practice, pass - 1)}</span>
        <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-success" />ทำได้ ≥ {pass}</span>
      </div>
    </div>
  );
}
const MODE_LABELS = { azure: "AI ตรวจ (Azure Speech)", adult: "ผู้ใหญ่ตรวจ" } as const;

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

  function stageRow(stageId: string, index: number, color: string) {
    const stage = STAGE_DEFINITIONS.find((stage) => stage.id === stageId)!;
    const rule = central!.rules.find((rule) => rule.stageId === stageId)!;
    const frame = frameOf(rule);
    const values = form!.stages[stageId];
    const changed = !sameValues(values, pick(rule));
    const canChoose = stage.automatic && frame.mode === "choice";
    return (
      <li key={stageId} className="space-y-3.5 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full font-display text-sm font-semibold text-white" style={{ background: color }}>{index + 1}</span>
            <h3 className="font-display text-base font-medium text-text">{stage.label}</h3>
            <span className={values.mode === "azure"
              ? "inline-flex items-center gap-1 rounded-full bg-info-soft px-2 py-0.5 text-[0.6875rem] font-medium text-info-text"
              : "inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-[0.6875rem] font-medium text-text-muted"}>
              {values.mode === "azure" ? <Bot size={12} aria-hidden="true" /> : <UserCheck size={12} aria-hidden="true" />}
              {values.mode === "azure" ? "AI ตรวจ" : "ผู้ใหญ่ตรวจ"}
            </span>
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
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {SCORE_KEYS.map((key) => (
                  <FormField key={key} label={SCORE_LABELS[key]} hint={`กรอบ ${frame[key][0]}–${frame[key][1]} · กลาง ${rule[key]}`}>
                    <Input type="number" inputMode="numeric" min={frame[key][0]} max={frame[key][1]} value={values[key]}
                      className="font-display text-base tabular-nums"
                      onChange={(event) => setStage(stageId, { [key]: Number(event.target.value) })} />
                  </FormField>
                ))}
              </div>
              <ScoreScale pass={values.passScore} practice={values.practiceScore} />
            </div>
          ) : (
            <p className="rounded-control bg-surface-muted px-3 py-2.5 text-sm text-text-muted md:mt-7">
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
        <Card className="overflow-hidden">
          <div className="hero-night relative px-5 pb-5 pt-4">
            <p className="text-caption text-white/70">สรุปของโรงเรียน · เกณฑ์กลางเวอร์ชัน {current.central.version}</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <p className="text-caption text-white/70">ประเมินด้วย AI</p>
                <p className="mt-1 inline-flex items-center gap-1.5 font-display text-xl font-semibold">
                  <span aria-hidden="true" className={form.aiEnabled ? "size-2.5 rounded-full bg-[#7CE3B5]" : "size-2.5 rounded-full bg-white/35"} />
                  {form.aiEnabled ? "เปิด" : "ปิด"}
                </p>
              </div>
              <div>
                <p className="text-caption text-white/70">ปรับจากค่ากลาง</p>
                <p className="mt-1 font-display text-xl font-semibold"><span className="text-[#FFD58A]">{changedCount}</span> <span className="text-sm font-normal text-white/70">ขั้น</span></p>
              </div>
            </div>
          </div>
          <CardContent className="space-y-4 pt-4">
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
            {dirty && <p className="rounded-control bg-primary-soft px-3 py-2 text-sm text-primary-text">มีการแก้ไขที่ยังไม่บันทึก</p>}
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
        {TRACKS.map((track) => {
          const stages = STAGE_DEFINITIONS.filter((stage) => stage.track === track.id);
          const Icon = track.icon;
          return (
            <Card key={track.id} className="overflow-hidden">
              <div className="flex items-center gap-3 border-b border-border px-4 py-3.5 sm:px-5" style={{ background: `linear-gradient(90deg, ${track.color}14, transparent 70%)` }}>
                <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-[0.8rem] text-white shadow-[0_8px_18px_-10px_currentColor]" style={{ background: track.color, color: "#fff" }}><Icon size={19} /></span>
                <div className="min-w-0">
                  <h2 className="font-display text-lg font-medium text-text">{track.label}</h2>
                  <p className="text-caption text-text-muted">{stages.length} ขั้น · {stages.filter((stage) => form.stages[stage.id]?.mode === "azure").length} ขั้นใช้ AI ตรวจ</p>
                </div>
              </div>
              <ul className="divide-y divide-border">
                {stages.map((stage, index) => stageRow(stage.id, index, track.color))}
              </ul>
            </Card>
          );
        })}
      </div>

      {dirty && (
        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 rounded-card border border-border bg-surface p-3 shadow-card lg:hidden">
          {saveButton}
        </div>
      )}
    </div>
  );
}
