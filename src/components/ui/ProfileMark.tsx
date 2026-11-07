export const profileAvatarOptions = [
  { value: "🧒", label: "ม่วง", color: "#6c4ed9" },
  { value: "🐱", label: "ชมพู", color: "#a13f73" },
  { value: "🐻", label: "น้ำตาล", color: "#895724" },
  { value: "🐰", label: "ฟ้า", color: "#2563a8" },
  { value: "🦊", label: "ส้ม", color: "#a34e1f" },
  { value: "🐼", label: "เขียว", color: "#247655" },
] as const;

export default function ProfileMark({ name, avatar }: { name: string; avatar?: string }) {
  const color = profileAvatarOptions.find((option) => option.value === avatar)?.color;
  const initial = Array.from(name.trim())[0] ?? "";
  return (
    <span aria-hidden="true" style={{ color }}>
      {/^[\p{L}\p{N}]/u.test(initial) ? initial : "—"}
    </span>
  );
}
