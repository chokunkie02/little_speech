/** Convert the browser's WebM/MP4 recording to the Azure short-audio PCM format. */
export async function recordingToWav(blob: Blob): Promise<Blob> {
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    if (!decoded.length || decoded.duration > 30.1)
      throw new Error("ใช้เสียงสั้นไม่เกิน 30 วินาทีต่อครั้งนะ");
    const renderer = new OfflineAudioContext(
      1,
      Math.ceil(decoded.duration * 16000),
      16000,
    );
    const source = renderer.createBufferSource();
    source.buffer = decoded;
    source.connect(renderer.destination);
    source.start();
    const pcm = (await renderer.startRendering()).getChannelData(0);
    const buffer = new ArrayBuffer(44 + pcm.length * 2);
    const view = new DataView(buffer);
    const text = (at: number, value: string) => {
      for (let i = 0; i < value.length; i++)
        view.setUint8(at + i, value.charCodeAt(i));
    };
    text(0, "RIFF");
    view.setUint32(4, buffer.byteLength - 8, true);
    text(8, "WAVE");
    text(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, 16000, true);
    view.setUint32(28, 32000, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    text(36, "data");
    view.setUint32(40, pcm.length * 2, true);
    for (let i = 0; i < pcm.length; i++) {
      const value = Math.max(-1, Math.min(1, pcm[i]));
      view.setInt16(
        44 + i * 2,
        Math.round(value * (value < 0 ? 32768 : 32767)),
        true,
      );
    }
    return new Blob([buffer], { type: "audio/wav" });
  } finally {
    await context.close();
  }
}
