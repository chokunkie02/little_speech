"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { assessmentRequest } from "@/lib/assessment/client";
import {
  DEFAULT_POLICY,
  OUTCOME_LABELS,
  STAGE_DEFINITIONS,
  judgeSpeech,
  policySchema,
  type AssessmentPolicy,
  type PolicySnapshot,
} from "@/lib/assessment/policy";

interface AdminData {
  state: {
    draft: AssessmentPolicy;
    draft_revision: number;
    published_id: string;
    updated_at: string;
  };
  versions: PolicySnapshot[];
  provider: { ready: boolean; region?: string };
}
const panel = "rounded-2xl border border-border bg-surface p-5";
const inputClass =
  "mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-text";
const primary =
  "rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-40";
const secondary =
  "rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text disabled:opacity-40";

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
        if (active)
          setError(
            error instanceof Error ? error.message : "โหลดข้อมูลไม่สำเร็จ",
          );
      });
    return () => {
      active = false;
    };
  }, [user?.id, user?.isPlatformAdmin]);
  const dirty =
    !!data && JSON.stringify(draft) !== JSON.stringify(data.state.draft);
  const valid = policySchema.safeParse(draft);
  const active = data?.versions.find(
    (version) => version.id === data.state.published_id,
  );
  const previewRule = draft.rules.find(
    (rule) => rule.stageId === previewStage,
  )!;
  const preview = judgeSpeech(
    {
      score: previewScore,
      accuracy: previewScore,
      completeness: previewCompleteness,
      confidence: previewConfidence,
    },
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
      setMessage(
        action === "save"
          ? "บันทึกร่างแล้ว ผลฝึกจะใช้เมื่อกดเผยแพร่"
          : "เผยแพร่เกณฑ์แล้ว การตรวจครั้งถัดไปใช้เวอร์ชันใหม่",
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : "บันทึกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }
  function updateRule(
    stageId: string,
    values: Partial<AssessmentPolicy["rules"][number]>,
  ) {
    setDraft((draft) => ({
      ...draft,
      rules: draft.rules.map((rule) =>
        rule.stageId === stageId ? { ...rule, ...values } : rule,
      ),
    }));
  }

  if (isLoading) return <p role="status">กำลังตรวจสิทธิ์…</p>;
  if (!user)
    return (
      <Link
        href="/auth/signin?redirect=%2Fplatform%2Fassessment"
        className={primary}
      >
        เข้าสู่ระบบแอดมิน
      </Link>
    );
  if (!user.isPlatformAdmin)
    return (
      <section className={panel + " space-y-3"}>
        <p role="alert">เฉพาะแอดมินระบบที่ตั้งเกณฑ์กลางได้</p>
        <Link
          href="/auth/signin?redirect=%2Fplatform"
          className="text-primary underline"
        >
          เข้าสู่ระบบด้วยบัญชีแอดมิน
        </Link>
      </section>
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">ศูนย์ประเมินการเรียนรู้</h1>
          <p className="mt-2 max-w-3xl text-sm text-text-muted">
            ตั้งวิธีตรวจในแต่ละขั้น ทดลองเกณฑ์ และเผยแพร่ให้ห้องฝึกใช้ร่วมกัน
            คะแนนชุดนี้เป็นเกณฑ์ต้นแบบที่ทีมปรับได้
          </p>
        </div>
        <button
          className={secondary}
          disabled={busy}
          onClick={() => {
            if (
              !dirty ||
              window.confirm("โหลดใหม่และทิ้งการแก้ไขที่ยังไม่ได้บันทึก?")
            )
              void load();
          }}
        >
          โหลดล่าสุด
        </button>
      </div>
      <section className={panel} aria-label="สถานะระบบประเมิน">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-text-muted">เกณฑ์ที่ห้องฝึกใช้อยู่</p>
            <strong>เวอร์ชัน {active?.version ?? "—"}</strong>
            <p className="text-sm">
              {active?.config.enabled
                ? "เปิดประเมินเสียงด้วย AI"
                : "ใช้ผู้ใหญ่ตรวจเสียง"}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-muted">การเชื่อม Azure Speech</p>
            <strong>
              {data?.provider.ready
                ? "ตั้งค่าการเชื่อมต่อแล้ว"
                : "รอตั้งคีย์บนเซิร์ฟเวอร์"}
            </strong>
            <p className="text-xs text-text-muted">
              {data?.provider.ready
                ? "ทดสอบเสียงจริงเพื่อยืนยันสิทธิ์และภาษาไทย"
                : "เปิดคู่มือตั้งค่าด้านล่างได้"}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-muted">ฉบับร่าง</p>
            <strong>แก้ไขครั้งที่ {data?.state.draft_revision ?? "—"}</strong>
            <p className="text-sm">
              {dirty
                ? "มีการแก้ไขที่ยังไม่ได้บันทึก"
                : "บันทึกตรงกับข้อมูลกลาง"}
            </p>
          </div>
        </div>
      </section>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-error/30 bg-error/5 p-4 text-sm text-error"
        >
          {error}
        </p>
      )}
      {message && (
        <p
          role="status"
          className="rounded-xl border border-success/30 p-4 text-sm"
        >
          {message}
        </p>
      )}
      {data && (
        <>
          <fieldset disabled={busy} className={panel + " space-y-4"}>
            <legend className="px-2 font-bold">ฉบับร่างเกณฑ์กลาง</legend>
            <label className="block text-sm font-semibold">
              ชื่อชุดเกณฑ์
              <input
                className={inputClass}
                maxLength={100}
                value={draft.name}
                onChange={(event) =>
                  setDraft({ ...draft, name: event.target.value })
                }
              />
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(event) =>
                  setDraft({ ...draft, enabled: event.target.checked })
                }
              />
              เปิดการประเมินเสียงด้วย Azure หลังเผยแพร่
            </label>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="text-sm">
                ความมั่นใจการรู้จำขั้นต่ำ 0–1
                <input
                  type="number"
                  className={inputClass}
                  min={0}
                  max={1}
                  step={0.05}
                  value={draft.minConfidence}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      minConfidence: Number(event.target.value),
                    })
                  }
                />
              </label>
              <label className="text-sm">
                ความยาวเสียงขั้นต่ำ (มิลลิวินาที)
                <input
                  type="number"
                  className={inputClass}
                  min={200}
                  max={5000}
                  step={50}
                  value={draft.minDurationMs}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      minDurationMs: Number(event.target.value),
                    })
                  }
                />
              </label>
              <label className="text-sm">
                ความยาวเสียงสูงสุด (มิลลิวินาที)
                <input
                  type="number"
                  className={inputClass}
                  min={5000}
                  max={30000}
                  step={1000}
                  value={draft.maxDurationMs}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      maxDurationMs: Number(event.target.value),
                    })
                  }
                />
              </label>
            </div>
            <p className="text-xs text-text-muted">
              ค่าความมั่นใจเป็นข้อมูลจากระบบรู้จำ
              ส่วนคะแนนการออกเสียงเป็นผลประเมินอีกส่วนหนึ่ง
              ให้ใช้การทดลองกับผู้เชี่ยวชาญช่วยตั้งเกณฑ์
            </p>
            {(["speech", "communication", "phonics"] as const).map((track) => (
              <details
                key={track}
                open={track === "speech"}
                className="rounded-xl border border-border p-4"
              >
                <summary className="cursor-pointer font-semibold">
                  {
                    {
                      speech: "ฝึกออกเสียง · 6 ขั้น",
                      communication: "พูดเพื่อสื่อสาร · 3 ขั้น",
                      phonics: "เสียงกับตัวอักษร · 3 ขั้น",
                    }[track]
                  }
                </summary>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {STAGE_DEFINITIONS.filter(
                    (stage) => stage.track === track,
                  ).map((stage) => {
                    const rule = draft.rules.find(
                      (rule) => rule.stageId === stage.id,
                    )!;
                    return (
                      <section
                        key={stage.id}
                        className="rounded-xl border border-border p-4"
                      >
                        <h3 className="font-semibold">{stage.label}</h3>
                        {stage.automatic ? (
                          <>
                            <label className="mt-3 block text-sm">
                              วิธีตรวจเสียง
                              <select
                                className={inputClass}
                                value={rule.mode}
                                onChange={(event) =>
                                  updateRule(stage.id, {
                                    mode: event.target.value as
                                      | "azure"
                                      | "adult",
                                  })
                                }
                              >
                                <option value="azure">Azure Speech</option>
                                <option value="adult">ผู้ใหญ่ช่วยตรวจ</option>
                              </select>
                            </label>
                            {rule.mode === "azure" && (
                              <div className="mt-3 grid grid-cols-3 gap-2">
                                <label className="text-xs">
                                  ทำได้ขั้นต่ำ
                                  <input
                                    type="number"
                                    className={inputClass}
                                    min={1}
                                    max={100}
                                    value={rule.passScore}
                                    onChange={(event) =>
                                      updateRule(stage.id, {
                                        passScore: Number(event.target.value),
                                      })
                                    }
                                  />
                                </label>
                                <label className="text-xs">
                                  ฝึกต่อขั้นต่ำ
                                  <input
                                    type="number"
                                    className={inputClass}
                                    min={0}
                                    max={99}
                                    value={rule.practiceScore}
                                    onChange={(event) =>
                                      updateRule(stage.id, {
                                        practiceScore: Number(
                                          event.target.value,
                                        ),
                                      })
                                    }
                                  />
                                </label>
                                <label className="text-xs">
                                  ความครบขั้นต่ำ
                                  <input
                                    type="number"
                                    className={inputClass}
                                    min={0}
                                    max={100}
                                    value={rule.minCompleteness}
                                    onChange={(event) =>
                                      updateRule(stage.id, {
                                        minCompleteness: Number(
                                          event.target.value,
                                        ),
                                      })
                                    }
                                  />
                                </label>
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="mt-2 text-sm text-text-muted">
                            ข้อเลือกภาพตรวจจากเฉลย ·
                            การสื่อสารและท่าทางให้ผู้ใหญ่ช่วยตรวจ
                          </p>
                        )}
                      </section>
                    );
                  })}
                </div>
              </details>
            ))}
            <p className="text-xs text-text-muted">
              โจทย์พูดเองจากภาพใช้ผู้ใหญ่ตรวจ แม้ขั้นนั้นจะเปิด Azure
              เพื่อยอมรับประโยคที่ต่างจากตัวอย่าง เกณฑ์นี้ใช้ร่วมกันทั้ง 4
              ระดับความยาก
            </p>
            {!valid.success && (
              <p role="alert" className="text-sm text-error">
                {valid.error.issues[0].message}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                className={primary}
                disabled={!dirty || !valid.success}
                onClick={() => void mutate("save")}
              >
                บันทึกฉบับร่าง
              </button>
              <button
                className={secondary}
                disabled={
                  dirty ||
                  !valid.success ||
                  (draft.enabled && !data.provider.ready)
                }
                onClick={() => void mutate("publish")}
              >
                เผยแพร่เป็นเวอร์ชันใหม่
              </button>
            </div>
          </fieldset>
          <section
            className={panel + " space-y-4"}
            aria-label="ทดลองเกณฑ์ด้วยคะแนนตัวอย่าง"
          >
            <h2 className="font-bold">ลองเกณฑ์ด้วยคะแนนตัวอย่าง</h2>
            <p className="text-sm text-text-muted">
              ปรับตัวเลขเพื่อดูผลจากฉบับร่าง
              ตัวเลขในส่วนนี้ใช้จำลองการตัดสินเกณฑ์
              แยกจากประวัติเด็กและการตรวจเสียงจริง
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-sm">
                ขั้นที่ทดสอบ
                <select
                  className={inputClass}
                  value={previewStage}
                  onChange={(event) => setPreviewStage(event.target.value)}
                >
                  {STAGE_DEFINITIONS.filter((stage) => stage.automatic).map(
                    (stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.label}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <label className="text-sm">
                คะแนนรวมและความถูกต้อง
                <input
                  className={inputClass}
                  type="number"
                  min={0}
                  max={100}
                  value={previewScore}
                  onChange={(event) =>
                    setPreviewScore(
                      Math.max(0, Math.min(100, Number(event.target.value))),
                    )
                  }
                />
              </label>
              <label className="text-sm">
                ความครบของข้อความ
                <input
                  className={inputClass}
                  type="number"
                  min={0}
                  max={100}
                  value={previewCompleteness}
                  onChange={(event) =>
                    setPreviewCompleteness(
                      Math.max(0, Math.min(100, Number(event.target.value))),
                    )
                  }
                />
              </label>
              <label className="text-sm">
                ความมั่นใจ 0–1
                <input
                  className={inputClass}
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={previewConfidence}
                  onChange={(event) =>
                    setPreviewConfidence(
                      Math.max(0, Math.min(1, Number(event.target.value))),
                    )
                  }
                />
              </label>
            </div>
            <p
              role="status"
              className="rounded-xl bg-primary/10 p-4 font-semibold"
            >
              ผลจำลอง ·{" "}
              {previewRule.mode === "adult"
                ? "ผู้ใหญ่ช่วยตรวจ"
                : OUTCOME_LABELS[preview.outcome]}
            </p>
          </section>
          <section className={panel + " space-y-3"}>
            <h2 className="font-bold">ประวัติชุดเกณฑ์</h2>
            <p className="text-sm text-text-muted">
              ผลเก่าเก็บเลขเวอร์ชันเดิมไว้
              นำเกณฑ์เก่ามาแก้เป็นร่างแล้วเผยแพร่ใหม่ได้
            </p>
            {data.versions.map((version) => (
              <div
                key={version.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm"
              >
                <div>
                  <strong>
                    เวอร์ชัน {version.version} · {version.config.name}
                  </strong>
                  <p className="text-xs text-text-muted">
                    {new Date(version.published_at).toLocaleString("th-TH")}{" "}
                    {version.id === data.state.published_id
                      ? "· ใช้งานอยู่"
                      : ""}
                  </p>
                </div>
                <button
                  className={secondary}
                  disabled={busy}
                  onClick={() => {
                    if (
                      !dirty ||
                      window.confirm(
                        "แทนที่การแก้ไขที่ยังไม่ได้บันทึกด้วยเวอร์ชันนี้?",
                      )
                    )
                      setDraft(structuredClone(version.config));
                  }}
                >
                  นำมาแก้เป็นร่าง
                </button>
              </div>
            ))}
          </section>
        </>
      )}
      <section id="connection-guide" className={panel + " space-y-3"}>
        <h2 className="font-bold">เริ่มเชื่อม Azure Speech</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm">
          <li>
            สร้างบัญชี Azure และ Speech resource เลือกภูมิภาคที่ต้องการใช้
          </li>
          <li>
            เปิด Keys and Endpoint ของ resource แล้วตั้ง AZURE_SPEECH_KEY และ
            AZURE_SPEECH_REGION หรือ AZURE_SPEECH_ENDPOINT ใน .env.local
            ฝั่งเซิร์ฟเวอร์
          </li>
          <li>
            เปิดเซิร์ฟเวอร์ใหม่ กลับมาโหลดสถานะ ตั้งเกณฑ์ เปิด AI และเผยแพร่
          </li>
          <li>
            ใช้บัญชีผู้ปกครองอัดเสียงในห้องฝึก แล้วเทียบผลกับการฟังของผู้ใหญ่
          </li>
        </ol>
        <a
          className="text-sm text-primary underline"
          href="https://learn.microsoft.com/en-us/azure/ai-services/speech-service/get-started-speech-to-text"
          target="_blank"
          rel="noreferrer"
        >
          คู่มือตั้งค่า Speech resource ของ Microsoft
        </a>
        <p className="text-xs text-text-muted">
          คีย์ใช้เฉพาะบนเซิร์ฟเวอร์ การตรวจเสียงส่งคลิปไปยัง Azure
          เมื่อผู้ใช้กดส่งตรวจ ระบบกลางเก็บผลกับเวอร์ชันเกณฑ์
          โดยเสียงใช้ชั่วคราวระหว่างตรวจ
        </p>
      </section>
    </div>
  );
}
