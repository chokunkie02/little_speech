import { cn } from "@/lib/cn";

const sizes = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-14 w-14 text-lg" } as const;

// Background tints chosen so white text stays readable; picked by name so a person keeps one color.
const palette = ["#5548D4", "#A13F73", "#895724", "#2563A8", "#A34E1F", "#247655", "#6B4FB8", "#1F6F7A"];

function colorFor(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0;
  return palette[hash % palette.length];
}

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.slice(0, 2).map((word) => Array.from(word)[0] ?? "");
  return letters.join("").toUpperCase() || "?";
}

export type AvatarProps = {
  name: string;
  /** Optional photo; falls back to initials. */
  src?: string | null;
  size?: keyof typeof sizes;
  className?: string;
};

/** Person avatar: photo when available, otherwise initials on a stable color. Decorative — pair with a visible name. */
export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const classes = cn("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold", sizes[size], className);
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- avatars come from arbitrary storage URLs
    return <img src={src} alt="" aria-hidden="true" className={cn(classes, "object-cover")} />;
  }
  return (
    <span aria-hidden="true" className={cn(classes, "text-white")} style={{ backgroundColor: colorFor(name) }}>
      {initials(name)}
    </span>
  );
}
