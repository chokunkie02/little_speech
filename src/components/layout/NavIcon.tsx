import {
  BookOpen,
  ChartColumn,
  FileText,
  GraduationCap,
  House,
  Inbox,
  Map,
  School,
  Settings,
  Star,
  User,
  Video,
  type LucideIcon,
} from "lucide-react";

export type NavIconName =
  | "inbox"
  | "home"
  | "training"
  | "progress"
  | "rewards"
  | "report"
  | "library"
  | "demo"
  | "profile"
  | "settings"
  | "teacher"
  | "school";

const icons: Record<NavIconName, LucideIcon> = {
  inbox: Inbox,
  home: House,
  training: Map,
  progress: ChartColumn,
  rewards: Star,
  report: FileText,
  library: BookOpen,
  demo: Video,
  profile: User,
  settings: Settings,
  teacher: GraduationCap,
  school: School,
};

interface Props {
  name: NavIconName;
  active?: boolean;
  size?: number;
}

/** Navigation icon. Active items use the theme's primary color (light and dark aware). */
export default function NavIcon({ name, active = false, size = 17 }: Props) {
  const Icon = icons[name] ?? User;
  return <Icon size={size} strokeWidth={2} aria-hidden="true" className={active ? "text-primary" : undefined} />;
}
