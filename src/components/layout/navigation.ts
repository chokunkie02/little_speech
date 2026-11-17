// Single source of truth for the app menus (sidebar, mobile drawer, bottom bar).
import type { AuthUser } from "@/types/auth";
import { isSchoolAdmin, isTeacher } from "@/lib/auth/roleHelpers";
import type { NavIconName } from "./NavIcon";

export type AppRole = "platform_admin" | "school_admin" | "teacher" | "parent";

export type NavItem = {
  href: string;
  label: string;
  /** Shorter label for the bottom bar. */
  shortLabel?: string;
  icon: NavIconName;
  /** Match the path exactly instead of as a prefix. */
  exact?: boolean;
  /** Other paths that should highlight this item. */
  alsoActive?: string[];
};

export type NavGroup = { label: string; items: NavItem[] };

export const ROLE_LABELS: Record<AppRole, string> = {
  platform_admin: "แอดมินระบบ",
  school_admin: "ผู้ดูแลโรงเรียน",
  teacher: "ครู",
  parent: "ผู้ปกครอง",
};

export function appRole(user: AuthUser | null): AppRole {
  if (user?.isPlatformAdmin) return "platform_admin";
  if (isSchoolAdmin(user)) return "school_admin";
  if (isTeacher(user)) return "teacher";
  return "parent";
}

const settings: NavItem = { href: "/settings", label: "ตั้งค่า", icon: "settings" };
const report: NavItem = { href: "/report", label: "รายงาน", icon: "report" };
const inbox: NavItem = { href: "/inbox", label: "กล่องข้อความ", shortLabel: "ข้อความ", icon: "inbox" };

const PARENT_GROUPS: NavGroup[] = [
  {
    label: "ฝึกพูด",
    items: [
      { href: "/dashboard", label: "หน้าหลัก", icon: "home", exact: true },
      { href: "/training", label: "ฝึกและเรียน", shortLabel: "ฝึก", icon: "training", alsoActive: ["/learning", "/library"] },
    ],
  },
  {
    label: "ผลการฝึก",
    items: [
      { href: "/progress", label: "ความก้าวหน้า", shortLabel: "ก้าวหน้า", icon: "progress" },
      { href: "/rewards", label: "รางวัล", icon: "rewards" },
      report,
    ],
  },
  {
    label: "บัญชี",
    items: [{ href: "/profile", label: "ข้อมูลลูก", icon: "profile" }, inbox, settings],
  },
];

const GROUPS: Record<Exclude<AppRole, "parent">, NavGroup[]> = {
  teacher: [
    { label: "ห้องเรียน", items: [{ href: "/teacher", label: "ห้องเรียนของฉัน", shortLabel: "ห้องเรียน", icon: "teacher" }, report] },
    { label: "บัญชี", items: [inbox, settings] },
  ],
  school_admin: [
    { label: "โรงเรียน", items: [{ href: "/school", label: "จัดการโรงเรียน", shortLabel: "โรงเรียน", icon: "school" }, report] },
    { label: "บัญชี", items: [inbox, settings] },
  ],
  platform_admin: [
    { label: "ระบบ", items: [{ href: "/platform", label: "โรงเรียนทั้งหมด", shortLabel: "โรงเรียน", icon: "school" }] },
    { label: "บัญชี", items: [inbox, settings] },
  ],
};

/**
 * Menu groups for a role. `restricted` = a parent with no linked student yet: only the inbox and
 * settings are useful. `parentInbox` = signed in (guests have no inbox).
 */
export function navGroups(role: AppRole, options: { restricted: boolean; parentInbox: boolean }): NavGroup[] {
  if (role !== "parent") return GROUPS[role];
  return PARENT_GROUPS
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        (item.href !== "/inbox" || options.parentInbox) &&
        (!options.restricted || item.href === "/inbox" || item.href === "/settings")),
    }))
    .filter((group) => group.items.length > 0);
}

/** Up to four destinations for the phone bottom bar; everything else lives in the drawer. */
export function bottomNavItems(role: AppRole, options: { restricted: boolean; parentInbox: boolean }): NavItem[] {
  const all = navGroups(role, options).flatMap((group) => group.items);
  if (role === "parent" && !options.restricted) {
    const wanted = ["/dashboard", "/training", "/progress", options.parentInbox ? "/inbox" : "/report"];
    return wanted.map((href) => all.find((item) => item.href === href)).filter((item): item is NavItem => Boolean(item));
  }
  return all.slice(0, 4);
}

export function isNavActive(item: NavItem, pathname: string | null) {
  if (!pathname) return false;
  if (item.alsoActive?.some((path) => pathname === path || pathname.startsWith(path + "/"))) return true;
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
}
