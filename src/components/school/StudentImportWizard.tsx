"use client";

import DisplayIcon from "@/components/ui/DisplayIcon";
import { useRef, useState, useCallback } from "react";
import { useSchoolImport } from "@/hooks/useSchoolImport";
import { SAMPLE_CSV } from "@/lib/services/StudentImportService";
import { useAuth } from "@/hooks/useAuth";
import type { Classroom } from "@/types/school";

interface Props {
  organizationId: string;
  classrooms: Classroom[];
  onClose: () => void;
}

const STEPS = [
  { id: "upload",  label: "อัปโหลด" },
  { id: "preview", label: "ตรวจสอบ" },
  { id: "confirm", label: "ยืนยัน"  },
  { id: "result",  label: "ผลลัพธ์" },
] as const;

export default function StudentImportWizard({ organizationId, classrooms, onClose }: Props) {
  const { user } = useAuth();
  const {
    step, setStep, preview, result,
    loading, error, parseAndPreview, confirmImport, reset,
  } = useSchoolImport(organizationId);

  const [csvText, setCsvText]               = useState("");
  const [defaultClassroom, setDefaultClassroom] = useState("");
  const [dragOver, setDragOver]             = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const stepIdx = STEPS.findIndex((s) => s.id === step);

  const loadFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => setCsvText((ev.target?.result as string) ?? "");
    reader.readAsText(file, "utf-8");
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file);
  }

  function handleDownloadSample() {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "sample_students.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleParseAndPreview() {
    await parseAndPreview(csvText, defaultClassroom || undefined);
  }

  async function handleConfirm() {
    if (!user) return;
    await confirmImport(user.id);
  }

  function handleClose() {
    reset();
    onClose();
  }

  const csvLineCount = csvText.trim() ? csvText.split("\n").filter((l) => l.trim()).length - 1 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-surface rounded-2xl shadow-2xl border border-border overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-text">นำเข้านักเรียนจาก CSV</h2>
            <p className="text-xs text-text-muted mt-0.5">เพิ่มนักเรียนหลายคนพร้อมกันในขั้นตอนเดียว</p>
          </div>
          <button
            onClick={handleClose}
            aria-label="ปิด"
            className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-black/5 dark:hover:bg-white/10 transition-all"
          >
            <XIcon />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center px-6 py-3 border-b border-border gap-1 flex-shrink-0 overflow-x-auto">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center shrink-0">
              <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium ${
                i === stepIdx ? "text-primary" : i < stepIdx ? "text-primary/70" : "text-text-muted"
              }`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  i < stepIdx
                    ? "bg-primary text-white"
                    : i === stepIdx
                    ? "bg-primary/15 text-primary"
                    : "bg-black/5 dark:bg-white/10 text-text-muted"
                }`}>
                  {i < stepIdx ? "✓" : i + 1}
                </span>
                {s.label}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-6 h-px mx-1 ${i < stepIdx ? "bg-primary/30" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* ── Step 1: Upload ─────────────────────────────────────────────── */}
          {step === "upload" && (
            <div className="space-y-5">
              {/* Drop zone */}
              <button
                type="button"
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileRef.current?.click()}
                className={`w-full border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  dragOver
                    ? "border-primary bg-primary/5"
                    : csvText
                    ? "border-green-400 bg-green-50/50 dark:bg-green-900/10"
                    : "border-border hover:border-primary/50 hover:bg-primary/5"
                }`}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="text-3xl mb-2"><DisplayIcon name={csvText ? "check" : "folder"} /></div>
                {csvText ? (
                  <>
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">
                      โหลดไฟล์สำเร็จ
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {csvLineCount} แถวข้อมูล — คลิกเพื่อเปลี่ยนไฟล์
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-text">
                      ลากไฟล์มาวาง หรือคลิกเพื่อเลือกไฟล์
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">รองรับเฉพาะ .csv</p>
                  </>
                )}
              </button>

              {/* Format guide */}
              <div className="bg-black/[0.03] dark:bg-white/[0.03] border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-text">รูปแบบ CSV</p>
                  <button
                    type="button"
                    onClick={handleDownloadSample}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    ดาวน์โหลดตัวอย่าง
                  </button>
                </div>
                <div className="font-mono text-xs text-text-muted bg-black/5 dark:bg-white/5 rounded-lg px-3 py-2 overflow-x-auto whitespace-nowrap">
                  student_code,name,nickname,age,grade_level,<span className="text-primary font-semibold">classroom</span>,parent_email,target_sounds
                </div>
                <ul className="text-xs text-text-muted space-y-1">
                  <li>• <span className="text-text font-medium">name</span> หรือ <span className="text-text font-medium">student_code</span> — ต้องมีอย่างน้อยหนึ่งอย่าง</li>
                  <li>• <span className="text-text font-medium">classroom</span> — ต้องตรงกับชื่อห้องเรียนในระบบ</li>
                  <li>• <span className="text-text font-medium">target_sounds</span> — เสียงเป้าหมาย คั่นด้วย , เช่น <span className="font-mono">&quot;ก,ค&quot;</span></li>
                  <li>• <span className="text-text font-medium">parent_email</span> — ไม่บังคับ</li>
                </ul>
              </div>

              {/* Default classroom selector */}
              {classrooms.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1.5">
                    ห้องเรียนสำรอง <span className="text-text-muted font-normal">(ใช้เมื่อไม่ระบุในไฟล์)</span>
                  </label>
                  <select
                    value={defaultClassroom}
                    onChange={(e) => setDefaultClassroom(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">— ไม่ระบุ —</option>
                    {classrooms.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Preview ────────────────────────────────────────────── */}
          {step === "preview" && preview && (
            <div className="space-y-4">
              {/* Summary badges */}
              <div className="flex flex-wrap gap-2">
                {preview.validCount > 0 && (
                  <span className="px-3 py-1.5 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-semibold border border-green-200 dark:border-green-800">
                    ✓ {preview.validCount} แถวพร้อมนำเข้า
                  </span>
                )}
                {preview.warningCount > 0 && (
                  <span className="px-3 py-1.5 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 text-xs font-semibold border border-yellow-200 dark:border-yellow-800">
                     {preview.warningCount} คำเตือน
                  </span>
                )}
                {preview.errorCount > 0 && (
                  <span className="px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs font-semibold border border-red-200 dark:border-red-800">
                    ✕ {preview.errorCount} ข้อผิดพลาด (จะถูกข้าม)
                  </span>
                )}
              </div>

              {/* Detected classrooms */}
              {preview.classroomNames.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-text-muted">ห้องเรียนที่พบ:</span>
                  {preview.classroomNames.map((n) => (
                    <span key={n} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      {n}
                    </span>
                  ))}
                </div>
              )}

              {/* Preview table */}
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-black/[0.03] dark:bg-white/[0.03]">
                        <th className="px-3 py-2 text-left text-text-muted font-medium w-10">#</th>
                        <th className="px-3 py-2 text-left text-text-muted font-medium">รหัส</th>
                        <th className="px-3 py-2 text-left text-text-muted font-medium">ชื่อ</th>
                        <th className="px-3 py-2 text-left text-text-muted font-medium">ชื่อเล่น</th>
                        <th className="px-3 py-2 text-left text-text-muted font-medium">ห้อง</th>
                        <th className="px-3 py-2 text-left text-text-muted font-medium">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.map((row) => (
                        <tr
                          key={row.rowNumber}
                          className={`border-b border-border last:border-0 ${
                            row.status === "error"
                              ? "bg-red-50/60 dark:bg-red-900/10"
                              : row.status === "warning"
                              ? "bg-yellow-50/60 dark:bg-yellow-900/10"
                              : ""
                          }`}
                        >
                          <td className="px-3 py-2 text-text-muted">{row.rowNumber}</td>
                          <td className="px-3 py-2 text-text font-mono">{row.studentCode || "—"}</td>
                          <td className="px-3 py-2 text-text">{row.name || "—"}</td>
                          <td className="px-3 py-2 text-text">{row.nickname || "—"}</td>
                          <td className="px-3 py-2 text-text">{row.classroom || "—"}</td>
                          <td className="px-3 py-2 max-w-[200px]">
                            {row.status === "valid" && (
                              <span className="text-green-600 dark:text-green-400 font-medium">✓ พร้อมนำเข้า</span>
                            )}
                            {row.status === "warning" && (
                              <div className="space-y-0.5">
                                {row.warnings.map((w, i) => (
                                  <p key={i} className="text-yellow-600 dark:text-yellow-400 leading-tight">{w}</p>
                                ))}
                              </div>
                            )}
                            {row.status === "error" && (
                              <div className="space-y-0.5">
                                {row.errors.map((e, i) => (
                                  <p key={i} className="text-red-600 dark:text-red-400 leading-tight">{e}</p>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Confirm ────────────────────────────────────────────── */}
          {step === "confirm" && preview && (
            <div className="space-y-5">
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-text">สรุปก่อนนำเข้า</h3>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-surface rounded-xl p-3 border border-border">
                    <div className="text-2xl font-bold text-primary">{preview.validCount + preview.warningCount}</div>
                    <div className="text-xs text-text-muted mt-0.5">จะนำเข้า</div>
                  </div>
                  <div className="bg-surface rounded-xl p-3 border border-border">
                    <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{preview.warningCount}</div>
                    <div className="text-xs text-text-muted mt-0.5">มีคำเตือน</div>
                  </div>
                  <div className="bg-surface rounded-xl p-3 border border-border">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">{preview.errorCount}</div>
                    <div className="text-xs text-text-muted mt-0.5">จะถูกข้าม</div>
                  </div>
                </div>
                {preview.classroomNames.length > 0 && (
                  <div>
                    <p className="text-xs text-text-muted mb-1.5">ห้องเรียนที่จะได้รับนักเรียน:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {preview.classroomNames.map((n) => (
                        <span key={n} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 space-y-1.5">
                <p className="font-semibold">โปรดทราบ:</p>
                <ul className="space-y-1 ml-1">
                  <li>• ข้อมูลนักเรียนที่มีอยู่แล้วจะ <strong>ไม่ถูกเขียนทับ</strong></li>
                  <li>• แถวที่มีข้อผิดพลาดหรือ student_code ซ้ำจะถูกข้าม</li>
                  <li>• ความคืบหน้าการฝึกที่มีอยู่จะ <strong>ปลอดภัย</strong></li>
                </ul>
              </div>
            </div>
          )}

          {/* ── Step 4: Result ─────────────────────────────────────────────── */}
          {step === "result" && result && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-4 border border-green-200 dark:border-green-800">
                  <div className="text-3xl font-bold text-green-700 dark:text-green-400">{result.createdCount}</div>
                  <div className="text-xs text-green-700 dark:text-green-400 font-medium mt-1">นำเข้าสำเร็จ</div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl p-4 border border-yellow-200 dark:border-yellow-800">
                  <div className="text-3xl font-bold text-yellow-700 dark:text-yellow-400">{result.skippedCount}</div>
                  <div className="text-xs text-yellow-700 dark:text-yellow-400 font-medium mt-1">ข้ามไป</div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 border border-red-200 dark:border-red-800">
                  <div className="text-3xl font-bold text-red-700 dark:text-red-400">{result.failedCount}</div>
                  <div className="text-xs text-red-700 dark:text-red-400 font-medium mt-1">ล้มเหลว</div>
                </div>
              </div>

              {result.createdCount > 0 && (
                <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-xs text-green-800 dark:text-green-300">
                  นำเข้านักเรียน {result.createdCount} คนสำเร็จ ข้อมูลของนักเรียนพร้อมใช้งานในห้องเรียนแล้ว
                </div>
              )}

              {result.results.filter((r) => r.status !== "created").length > 0 && (
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="px-4 py-2 bg-black/[0.03] dark:bg-white/[0.03] border-b border-border">
                    <p className="text-xs font-semibold text-text-muted">รายการที่ไม่ได้นำเข้า</p>
                  </div>
                  <div className="divide-y divide-border max-h-44 overflow-y-auto">
                    {result.results
                      .filter((r) => r.status !== "created")
                      .map((r) => (
                        <div key={r.rowNumber} className="flex items-start gap-3 px-4 py-2.5 text-xs">
                          <span className="text-text-muted shrink-0">แถว {r.rowNumber}</span>
                          <span className={`font-medium shrink-0 ${
                            r.status === "skipped"
                              ? "text-yellow-600 dark:text-yellow-400"
                              : "text-red-600 dark:text-red-400"
                          }`}>
                            {r.status === "skipped" ? "ข้าม" : "ล้มเหลว"}
                          </span>
                          {r.message && <span className="text-text-muted">{r.message}</span>}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-black/[0.02] dark:bg-white/[0.02] flex-shrink-0">
          {/* Back button */}
          <div>
            {(step === "preview" || step === "confirm") && (
              <button
                type="button"
                disabled={loading}
                onClick={() => setStep(step === "preview" ? "upload" : "preview")}
                className="px-4 py-2 rounded-xl border border-border text-sm text-text-muted hover:text-text hover:bg-black/5 dark:hover:bg-white/5 transition-all disabled:opacity-50"
              >
                ← ย้อนกลับ
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={handleClose}
              className="px-4 py-2 rounded-xl border border-border text-sm text-text-muted hover:text-text hover:bg-black/5 dark:hover:bg-white/5 transition-all disabled:opacity-50"
            >
              {step === "result" ? "ปิด" : "ยกเลิก"}
            </button>

            {step === "upload" && (
              <button
                type="button"
                disabled={!csvText.trim() || loading}
                onClick={handleParseAndPreview}
                className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "กำลังวิเคราะห์…" : "ตรวจสอบข้อมูล →"}
              </button>
            )}

            {step === "preview" && (
              <button
                type="button"
                disabled={
                  !preview ||
                  (preview.validCount === 0 && preview.warningCount === 0)
                }
                onClick={() => setStep("confirm")}
                className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ต่อไป →
              </button>
            )}

            {step === "confirm" && (
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirm}
                className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {loading ? "กำลังนำเข้า…" : "ยืนยันนำเข้า"}
              </button>
            )}

            {step === "result" && result && result.failedCount > 0 && (
              <button
                type="button"
                onClick={() => reset()}
                className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all"
              >
                ลองใหม่
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function XIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
