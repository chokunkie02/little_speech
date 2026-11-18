"use client";

import { useEffect, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import {
  Alert,
  Badge,
  Button,
  ButtonLink,
  Card,
  CardContent,
  CardHeader,
  EmptyState,
  FormField,
  Input,
  LoadingState,
  Section,
  Select,
  Switch,
} from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { assessmentRequest } from "@/lib/assessment/client";
import {
  DEFAULT_POLICY,
  OUTCOME_LABELS,
  SCORE_KEYS,
  SCORE_LABELS,
  STAGE_DEFINITIONS,
  frameOf,
  judgeSpeech,
  policySchema,
  type AssessmentPolicy,
  type SchoolFrame,
  type PolicySnapshot,
} from "@/lib/assessment/policy";
import { formatThaiDate } from "@/lib/thaiDate";

interface AdminData {
  state: {
    draft: AssessmentPolicy;
    draft_revision: number;
    published_id: string;
    updated_at: string;
  };
  versions: PolicySnapshot[];
  provider: { id: "openai" | "azure"; label: string; ready: boolean; detail?: string };
}

/** Stages whose items are all picture choices, checked by the answer key (see test-stages.mjs). */
const ANSWER_KEY_STAGES = new Set(["listen", "understand", "letter"]);

const TRACKS = [
  { id: "speech", label: "ฝึกออกเสียง", count: 6 },
  { id: "communication", label: "พูดเพื่อสื่อสาร", count: 3 },
  { id: "phonics", label: "เสียงกับตัวอักษร", count: 3 },
] as const;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** Platform-admin screen for the central assessment rubric: edit a draft, try it, publish it. */
export default function AssessmentAdmin() {
  const { user, isLoading } = useAuth();
  const [data, setData] = useState<AdminData>();
  const [draft, setDraft] = useState<AssessmentPolicy>(DEFAULT_POLICY);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [previewStage, setPreviewStage] = useState("words");
  const [previewScore, setPreviewScore] = useState(80);
  const [previewConfidence, setPreviewConfidence] = useState(0.8);
  const [previewCompleteness, setPreviewCompleteness] = useState(90);

  async function load() {
    try {
      const next = await assessmentRequest<AdminData>("/api/assessment/admin");
      setData(next);
      setDraft(next.state.draft);
      setError("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "โหลดข้อมูลไม่สำเร็จ");
    }
  }
  useEffect(() => {
    if (!user?.isPlatformAdmin) return;
    let active = true;
    assessmentRequest<AdminData>("/api/assessment/admin")
      .then((next) => {
        if (active) {
          setData(next);
          setDraft(next.state.draft);
          setError("");
        }
      })
      .catch((error) => {
        if (active) setError(error instanceof Error ? error.message : "โหลดข้อมูลไม่สำเร็จ");
      });
    return () => {
      active = false;
    };
  }, [user?.id, user?.isPlatformAdmin]);

  const dirty = !!data && JSON.stringify(draft) !== JSON.stringify(data.state.draft);
  const valid = policySchema.safeParse(draft);
  const active = data?.versions.find((version) => version.id === data.state.published_id);
  const previewRule = draft.rules.find((rule) => rule.stageId === previewStage)!;
  const preview = judgeSpeech(
    { score: previewScore, accuracy: previewScore, completeness: previewCompleteness, confidence: previewConfidence },
    previewRule,
    draft.minConfidence,
  );

  async function mutate(action: "save" | "publish") {
    if (!data) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await assessmentRequest("/api/assessment/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          expectedRevision: data.state.draft_revision,
          ...(action === "save" ? { config: draft } : {}),
        }),
      });
      await load();
      setMessage(action === "save" ? "บันทึกร่างแล้ว ผลฝึกจะใช้เมื่อกดเผยแพร่" : "เผยแพร่เกณฑ์แล้ว การตรวจครั้งถัดไปใช้เวอร์ชันใหม่");
    } catch (error) {
      setError(error instanceof Error ? error.message : "บันทึกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }
  function updateRule(stageId: string, values: Partial<AssessmentPolicy["rules"][number]>) {
    setDraft((draft) => ({
      ...draft,
      rules: draft.rules.map((rule) => (rule.stageId === stageId ? { ...rule, ...values } : rule)),
    }));
  }
  function updateFrame(stageId: string, values: Partial<SchoolFrame>) {
    setDraft((draft) => ({
      ...draft,
      rules: draft.rules.map((rule) => (rule.stageId === stageId ? { ...rule, school: { ...frameOf(rule), ...values } } : rule)),
    }));
  }
  /** What schools may change for one automatic stage. A render function, not a component, so inputs keep focus. */
  function frameControls(stageId: string, rule: AssessmentPolicy["rules"][number]) {
    const frame = frameOf(rule);
    return (
      <div className="space-y-2.5 rounded-control bg-surface-muted p-3">
        <FormField inline label="โรงเรียนเลือกวิธีตรวจเองได้">
          <Switch checked={frame.mode === "choice"} onCheckedChange={(choice) => updateFrame(stageId, { mode: choice ? "choice" : "locked" })} />
        </FormField>
        <p className="text-caption font-semibold text-text-muted">กรอบคะแนนที่โรงเรียนปรับได้</p>
        <div className="space-y-2">
          {SCORE_KEYS.map((key) => (
            <div key={key} className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
              <span className="text-sm text-text-muted">{SCORE_LABELS[key]}</span>
              <Input type="number" min={0} max={100} aria-label={`${SCORE_LABELS[key]} ต่ำสุด`}
                value={frame[key][0]} onChange={(event) => updateFrame(stageId, { [key]: [Number(event.target.value), frame[key][1]] })} />
              <span aria-hidden="true" className="text-text-muted">–</span>
              <Input type="number" min={0} max={100} aria-label={`${SCORE_LABELS[key]} สูงสุด`}
                value={frame[key][1]} onChange={(event) => updateFrame(stageId, { [key]: [frame[key][0], Number(event.target.value)] })} />
            </div>
          ))}
        </div>
      </div>
    );
  }
  const reload = () => {
    if (!dirty || window.confirm("โหลดใหม่และทิ้งการแก้ไขที่ยังไม่ได้บันทึก?")) void load();
  };

  if (isLoading) return <LoadingState variant="stats" rows={3} />;
  if (!user)
    return (
      <EmptyState title="กรุณาเข้าสู่ระบบ"
        action={<ButtonLink href="/auth/signin?redirect=%2Fplatform%2Fassessment">เข้าสู่ระบบ</ButtonLink>} />
    );
  if (!user.isPlatformAdmin) return <Alert tone="error" title="เฉพาะแอดมินระบบที่ตั้งเกณฑ์กลางได้" />;

  return (
    <div className="space-y-5">
      {error && <Alert tone="error">{error}</Alert>}
      {message && <Alert tone="success">{message}</Alert>}
      {!data ? (
        error ? null : <LoadingState variant="cards" rows={3} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <aside className="space-y-5 lg:sticky lg:top-20 lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <Card>
              <CardHeader title="สถานะ" action={
                <Button variant="ghost" size="sm" onClick={reload} disabled={busy} icon={<RefreshCw size={14} aria-hidden="true" />}>
                  โหลดล่าสุด
                </Button>
              } />
              <CardContent>
                <dl className="divide-y divide-border text-sm">
                  <div className="flex items-start justify-between gap-3 py-2.5">
                    <dt className="text-text-muted">เกณฑ์ที่ห้องฝึกใช้อยู่</dt>
                    <dd className="text-right">
                      <p className="font-semibold">เวอร์ชัน {active?.version ?? "—"}</p>
                      <Badge tone={active?.config.enabled ? "success" : "neutral"} className="mt-1">
                        {active?.config.enabled ? "AI ประเมินเสียง" : "ผู้ใหญ่ตรวจเสียง"}
                      </Badge>
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-3 py-2.5">
                    <dt className="text-text-muted">บริการ AI ตรวจเสียง</dt>
                    <dd className="text-right">
                      <p className="font-semibold">{data.provider.label}</p>
                      <Badge tone={data.provider.ready ? "success" : "warning"} className="mt-1">
                        {data.provider.ready ? "ตั้งค่าแล้ว" : "ยังไม่ได้ตั้งคีย์"}
                      </Badge>
                      {data.provider.detail && <p className="mt-1 text-caption text-text-muted">{data.provider.detail}</p>}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-3 py-2.5">
                    <dt className="text-text-muted">ฉบับร่าง</dt>
                    <dd className="text-right">
                      <p className="font-semibold">แก้ไขครั้งที่ {data.state.draft_revision}</p>
                      <p className="text-caption text-text-muted">{dirty ? "มีการแก้ไขที่ยังไม่ได้บันทึก" : "ตรงกับข้อมูลกลาง"}</p>
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
            <Card>
              <CardHeader title="ลองเกณฑ์ด้วยคะแนนตัวอย่าง" description="จำลองผลจากฉบับร่าง ไม่บันทึกลงประวัติเด็ก" />
              <CardContent className="space-y-3">
                <FormField label="ขั้นที่ทดสอบ">
                  <Select value={previewStage} onChange={(event) => setPreviewStage(event.target.value)}>
                    {STAGE_DEFINITIONS.filter((stage) => stage.automatic).map((stage) => (
                      <option key={stage.id} value={stage.id}>{stage.label}</option>
                    ))}
                  </Select>
                </FormField>
                <div className="grid grid-cols-3 gap-2">
                  <FormField label="คะแนน">
                    <Input type="number" min={0} max={100} value={previewScore}
                      onChange={(event) => setPreviewScore(clamp(Number(event.target.value), 0, 100))} />
                  </FormField>
                  <FormField label="ความครบ">
                    <Input type="number" min={0} max={100} value={previewCompleteness}
                      onChange={(event) => setPreviewCompleteness(clamp(Number(event.target.value), 0, 100))} />
                  </FormField>
                  <FormField label="มั่นใจ">
                    <Input type="number" min={0} max={1} step={0.05} value={previewConfidence}
                      onChange={(event) => setPreviewConfidence(clamp(Number(event.target.value), 0, 1))} />
                  </FormField>
                </div>
                <p role="status" className="rounded-control bg-primary-soft p-3 text-sm font-semibold text-primary-text">
                  ผลจำลอง · {previewRule.mode === "adult" ? "ผู้ใหญ่ช่วยตรวจ" : OUTCOME_LABELS[preview.outcome]}
                </p>
              </CardContent>
            </Card>
          </aside>

          <Section className="lg:col-start-1 lg:row-start-1" title="ฉบับร่างเกณฑ์กลาง"
            description="ตั้งวิธีตรวจในแต่ละขั้น แล้วเผยแพร่ให้ห้องฝึกใช้ร่วมกัน คะแนนชุดนี้เป็นเกณฑ์ต้นแบบที่ทีมปรับได้">
            <fieldset disabled={busy} className="min-w-0 space-y-5">
              <Card>
                <CardContent className="space-y-4 p-4 sm:p-5">
                  <FormField label="ชื่อชุดเกณฑ์">
                    <Input maxLength={100} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
                  </FormField>
                  <FormField inline label={`เปิดการประเมินเสียงด้วย AI (${data.provider.label}) หลังเผยแพร่`}
                    hint={!data.provider.ready ? `ต้องตั้งคีย์ ${data.provider.label} บนเซิร์ฟเวอร์ก่อน จึงเผยแพร่แบบเปิด AI ได้` : undefined}>
                    <Switch checked={draft.enabled} onCheckedChange={(enabled) => setDraft({ ...draft, enabled })} />
                  </FormField>
                  <FormField inline label="อนุญาตให้โรงเรียนเปิด AI เอง"
                    hint="โรงเรียนที่ได้รับอนุญาตเลือกเปิดหรือปิด AI ของตัวเองได้ ใช้ได้เมื่อเปิด AI ทั้งระบบแล้วเท่านั้น">
                    <Switch checked={!!draft.allowSchoolAi} onCheckedChange={(allowSchoolAi) => setDraft({ ...draft, allowSchoolAi })} />
                  </FormField>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <FormField label="ความมั่นใจขั้นต่ำ (0–1)">
                      <Input type="number" min={0} max={1} step={0.05} value={draft.minConfidence}
                        onChange={(event) => setDraft({ ...draft, minConfidence: Number(event.target.value) })} />
                    </FormField>
                    <FormField label="เสียงสั้นสุด (มิลลิวินาที)">
                      <Input type="number" min={200} max={5000} step={50} value={draft.minDurationMs}
                        onChange={(event) => setDraft({ ...draft, minDurationMs: Number(event.target.value) })} />
                    </FormField>
                    <FormField label="เสียงยาวสุด (มิลลิวินาที)">
                      <Input type="number" min={5000} max={30000} step={1000} value={draft.maxDurationMs}
                        onChange={(event) => setDraft({ ...draft, maxDurationMs: Number(event.target.value) })} />
                    </FormField>
                  </div>
                  <p className="text-caption text-text-muted">
                    {data.provider.id === "openai"
                      ? "ความมั่นใจมาจากความน่าจะเป็นของการถอดเสียง ส่วนคะแนนคือความตรงระหว่างคำที่ AI ได้ยินกับคำเป้าหมาย ไม่ใช่คะแนนความชัดของการออกเสียง ควรทดลองกับผู้เชี่ยวชาญก่อนตั้งค่าจริง"
                      : "ความมั่นใจมาจากระบบรู้จำเสียง ส่วนคะแนนการออกเสียงเป็นผลประเมินอีกส่วน ควรทดลองกับผู้เชี่ยวชาญก่อนตั้งค่าจริง"}
                  </p>
                </CardContent>
              </Card>

              {TRACKS.map((track) => (
                <details key={track.id} open={track.id === "speech"} className="rounded-card border border-border bg-surface">
                  <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-3 px-4 font-semibold sm:px-5">
                    {track.label}
                    <Badge>{track.count} ขั้น</Badge>
                  </summary>
                  <div className="grid gap-3 border-t border-border p-4 sm:p-5 xl:grid-cols-2">
                    {STAGE_DEFINITIONS.filter((stage) => stage.track === track.id).map((stage) => {
                      const rule = draft.rules.find((rule) => rule.stageId === stage.id)!;
                      return (
                        <div key={stage.id} className="space-y-3 rounded-control border border-border p-3.5">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-semibold">{stage.label}</h3>
                            {!stage.automatic && (
                              <Badge tone="neutral">{ANSWER_KEY_STAGES.has(stage.id) ? "ตรวจจากเฉลย" : "ผู้ใหญ่ตรวจ"}</Badge>
                            )}
                          </div>
                          {stage.automatic ? (
                            <>
                              <FormField label="วิธีตรวจเสียง">
                                <Select value={rule.mode} onChange={(event) => updateRule(stage.id, { mode: event.target.value as "azure" | "adult" })}>
                                  <option value="azure">AI ตรวจเสียง ({data.provider.label})</option>
                                  <option value="adult">ผู้ใหญ่ช่วยตรวจ</option>
                                </Select>
                              </FormField>
                              {rule.mode === "azure" && (
                                <div className="grid grid-cols-3 gap-2">
                                  <FormField label="ทำได้">
                                    <Input type="number" min={1} max={100} value={rule.passScore}
                                      onChange={(event) => updateRule(stage.id, { passScore: Number(event.target.value) })} />
                                  </FormField>
                                  <FormField label="ฝึกต่อ">
                                    <Input type="number" min={0} max={99} value={rule.practiceScore}
                                      onChange={(event) => updateRule(stage.id, { practiceScore: Number(event.target.value) })} />
                                  </FormField>
                                  <FormField label="ความครบ">
                                    <Input type="number" min={0} max={100} value={rule.minCompleteness}
                                      onChange={(event) => updateRule(stage.id, { minCompleteness: Number(event.target.value) })} />
                                  </FormField>
                                </div>
                              )}
                              {frameControls(stage.id, rule)}
                            </>
                          ) : (
                            <p className="text-sm text-text-muted">ข้อเลือกภาพตรวจจากเฉลย ส่วนการสื่อสารและท่าทางให้ผู้ใหญ่ช่วยตรวจ · โรงเรียนเปลี่ยนไม่ได้</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </details>
              ))}
              <p className="text-caption text-text-muted">
                โจทย์ที่ให้พูดเองจากภาพใช้ผู้ใหญ่ตรวจเสมอ แม้ขั้นนั้นจะเปิด AI เพราะคำตอบอาจต่างจากตัวอย่าง เกณฑ์นี้ใช้ร่วมกันทั้ง 4 ระดับความยาก
              </p>
              {!valid.success && <Alert tone="error">{valid.error.issues[0].message}</Alert>}
              <div className="flex flex-wrap gap-3">
                <Button disabled={!dirty || !valid.success} onClick={() => void mutate("save")}>บันทึกฉบับร่าง</Button>
                <Button variant="outline" disabled={dirty || !valid.success || (draft.enabled && !data.provider.ready)}
                  onClick={() => void mutate("publish")}>
                  เผยแพร่เป็นเวอร์ชันใหม่
                </Button>
              </div>
            </fieldset>
          </Section>

          <div className="space-y-6 lg:col-start-1 lg:row-start-2">
            <Section title="ประวัติชุดเกณฑ์" description="ผลเก่าเก็บเลขเวอร์ชันเดิมไว้ นำเกณฑ์เก่ามาแก้เป็นร่างแล้วเผยแพร่ใหม่ได้">
              <Card>
                <ul className="divide-y divide-border">
                  {data.versions.map((version) => (
                    <li key={version.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="font-semibold">
                          เวอร์ชัน {version.version} · {version.config.name}
                          {version.id === data.state.published_id && <Badge tone="success" className="ml-2 align-middle">ใช้งานอยู่</Badge>}
                        </p>
                        <p className="text-caption text-text-muted">{formatThaiDate(version.published_at, "datetime")}</p>
                      </div>
                      <Button variant="outline" size="sm" disabled={busy}
                        onClick={() => {
                          if (!dirty || window.confirm("แทนที่การแก้ไขที่ยังไม่ได้บันทึกด้วยเวอร์ชันนี้?"))
                            setDraft(structuredClone(version.config));
                        }}>
                        นำมาแก้เป็นร่าง
                      </Button>
                    </li>
                  ))}
                </ul>
              </Card>
            </Section>

            <Section id="connection-guide" title={`เชื่อม ${data.provider.label}`} description="ทำเมื่อพร้อมเปิดการประเมินเสียงด้วย AI">
              <Card>
                <CardContent className="space-y-3 p-4 sm:p-5">
                  {data.provider.id === "openai" ? (
                    <ol className="list-decimal space-y-2 pl-5 text-sm">
                      <li>ให้เจ้าของบัญชี OpenAI สร้าง API key แยกสำหรับโปรเจกต์นี้ และตั้งวงเงินรายเดือน</li>
                      <li>ใส่คีย์ใน ASSESSMENT_OPENAI_API_KEY ของ .env.local ฝั่งเซิร์ฟเวอร์ แล้วรัน npm run assessment:check-openai</li>
                      <li>เปิดเซิร์ฟเวอร์ใหม่ กลับมาโหลดสถานะ ตั้งเกณฑ์ เปิด AI แล้วเผยแพร่</li>
                      <li>อัดเสียงในห้องฝึกด้วยบัญชีผู้ปกครอง แล้วเทียบผลกับการฟังของผู้ใหญ่</li>
                    </ol>
                  ) : (
                    <ol className="list-decimal space-y-2 pl-5 text-sm">
                      <li>สร้างบัญชี Azure และ Speech resource แล้วเลือกภูมิภาค</li>
                      <li>เปิด Keys and Endpoint ของ resource แล้วตั้ง AZURE_SPEECH_KEY กับ AZURE_SPEECH_REGION (หรือ AZURE_SPEECH_ENDPOINT) ใน .env.local ฝั่งเซิร์ฟเวอร์</li>
                      <li>เปิดเซิร์ฟเวอร์ใหม่ กลับมาโหลดสถานะ ตั้งเกณฑ์ เปิด AI แล้วเผยแพร่</li>
                      <li>อัดเสียงในห้องฝึกด้วยบัญชีผู้ปกครอง แล้วเทียบผลกับการฟังของผู้ใหญ่</li>
                    </ol>
                  )}
                  <a className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
                    href={data.provider.id === "openai"
                      ? "https://platform.openai.com/api-keys"
                      : "https://learn.microsoft.com/en-us/azure/ai-services/speech-service/get-started-speech-to-text"}
                    target="_blank" rel="noreferrer">
                    {data.provider.id === "openai" ? "หน้าจัดการ API key ของ OpenAI" : "คู่มือตั้งค่า Speech resource ของ Microsoft"}
                    <ExternalLink size={14} aria-hidden="true" />
                  </a>
                  <p className="text-caption text-text-muted">
                    คีย์อยู่บนเซิร์ฟเวอร์เท่านั้น คลิปเสียงถูกส่งไป {data.provider.label} เฉพาะเมื่อผู้ใช้ยินยอมและกดส่งตรวจ ระบบกลางเก็บแค่ผลกับเวอร์ชันเกณฑ์ ไม่เก็บไฟล์เสียง
                  </p>
                </CardContent>
              </Card>
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}
