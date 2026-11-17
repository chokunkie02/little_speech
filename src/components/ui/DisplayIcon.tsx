import {
  ArrowRightToLine,
  Award,
  BookOpen,
  CaseSensitive,
  ChartColumn,
  Check,
  ClipboardCheck,
  Folder,
  Headphones,
  Link,
  Lock,
  MessageSquareText,
  Mic,
  Music,
  Pencil,
  Shuffle,
  Sprout,
  Star,
  Target,
  User,
  type LucideIcon,
} from "lucide-react";

const icons: Record<string, LucideIcon> = {
  checklist: ClipboardCheck,
  listen: Headphones,
  mic: Mic,
  book: BookOpen,
  chat: MessageSquareText,
  award: Award,
  letters: CaseSensitive,
  music: Music,
  link: Link,
  edit: Pencil,
  end: ArrowRightToLine,
  target: Target,
  star: Star,
  sprout: Sprout,
  chart: ChartColumn,
  user: User,
  lock: Lock,
  check: Check,
  folder: Folder,
  shuffle: Shuffle,
};

// lucide-react has no mouth icon; keep the original drawing for oral-motor activities.
const MOUTH_PATH = "M3 12c3-2 6-5 9-3 3-2 6 1 9 3-3 4-6 6-9 6s-6-2-9-6Zm0 0h18";

/** Inline icon sized to the surrounding text (1em). Unknown names fall back to a target icon. */
export default function DisplayIcon({ name, className = "" }: { name?: string; className?: string }) {
  const classes = `inline-block align-middle shrink-0 ${className}`;
  if (name === "mouth") {
    return (
      <svg aria-hidden="true" width="1em" height="1em" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={classes}>
        <path d={MOUTH_PATH} />
      </svg>
    );
  }
  const Icon = (name && icons[name]) || Target;
  return <Icon aria-hidden="true" size="1em" strokeWidth={1.75} className={classes} />;
}
