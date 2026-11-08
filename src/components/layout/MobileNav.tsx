"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NavIcon, { type NavIconName } from "./NavIcon";
import { useAuth, isTeacher, isSchoolAdmin } from "@/hooks/useAuth";

type NavItem = { href: string; label: string; icon: NavIconName; exact?: boolean };

const PARENT_MOBILE: NavItem[] = [
  { href: "/dashboard", label: "หน้าหลัก", icon: "home", exact: true },
  { href: "/training", label: "ฝึก", icon: "training" },
  { href: "/library", label: "เนื้อหา", icon: "library" },
  { href: "/progress", label: "ก้าวหน้า", icon: "progress" },
  { href: "/rewards", label: "รางวัล", icon: "rewards" },
  { href: "/settings", label: "ตั้งค่า", icon: "settings" },
];

const TEACHER_MOBILE: NavItem[] = [
  { href: "/teacher", label: "ครู", icon: "teacher" },
  { href: "/report", label: "รายงาน", icon: "report" },
  { href: "/settings", label: "ตั้งค่า", icon: "settings" },
];

const SCHOOL_MOBILE: NavItem[] = [
  { href: "/school", label: "โรงเรียน", icon: "school" },
  { href: "/report", label: "รายงาน", icon: "report" },
  { href: "/settings", label: "ตั้งค่า", icon: "settings" },
];

export default function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const items = isSchoolAdmin(user)
    ? SCHOOL_MOBILE
    : isTeacher(user)
    ? TEACHER_MOBILE
    : PARENT_MOBILE;

  const isActive = (item: NavItem) =>
    (item.href === "/training" && pathname === "/learning") ||
    (item.exact ? pathname === item.href : (pathname?.startsWith(item.href) ?? false));

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 h-16 bg-surface/97 backdrop-blur-md border-t border-border lg:hidden print:hidden"
      aria-label="เมนูหลัก"
    >
      <div className="flex h-full">
        {items.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center justify-center flex-1 gap-0.5 text-xs font-medium transition-colors ${
                active ? "text-primary" : "text-text-muted hover:text-text"
              }`}
            >
              <NavIcon name={item.icon} active={active} size={20} />
              <span className="leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
