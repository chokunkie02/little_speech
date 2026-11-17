/** Validate and measure mono 16-bit 16 kHz RIFF PCM, independent of file extension. */
export function inspectWav(bytes: Buffer) {
  if (
    bytes.length < 44 ||
    bytes.toString("ascii", 0, 4) !== "RIFF" ||
    bytes.toString("ascii", 8, 12) !== "WAVE"
  ) {
    throw new Error("กรุณาใช้ไฟล์ WAV แบบ PCM 16 kHz mono");
  }
  let validFormat = false;
  let samples: Buffer | undefined;
  for (let offset = 12; offset + 8 <= bytes.length; ) {
    const size = bytes.readUInt32LE(offset + 4);
    const end = offset + 8 + size;
    if (end > bytes.length) throw new Error("ไฟล์เสียงไม่ครบ กรุณาอัดใหม่");
    const kind = bytes.toString("ascii", offset, offset + 4);
    if (kind === "fmt " && size >= 16) {
      validFormat =
        bytes.readUInt16LE(offset + 8) === 1 &&
        bytes.readUInt16LE(offset + 10) === 1 &&
        bytes.readUInt32LE(offset + 12) === 16000 &&
        bytes.readUInt16LE(offset + 22) === 16;
    }
    if (kind === "data") samples = bytes.subarray(offset + 8, end);
    offset = end + (size % 2);
  }
  if (!validFormat || !samples?.length || samples.length % 2)
    throw new Error("รูปแบบ WAV ไม่รองรับ กรุณาอัดใหม่");
  let energy = 0;
  for (let i = 0; i < samples.length; i += 2)
    energy += (samples.readInt16LE(i) / 32768) ** 2;
  return {
    durationMs: samples.length / 32,
    rms: Math.sqrt(energy / (samples.length / 2)),
  };
}
