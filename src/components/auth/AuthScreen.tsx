import Link from "next/link";
import type { ReactNode } from "react";
import { Mic } from "lucide-react";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { Card, CardContent } from "@/components/ui";
import { cn } from "@/lib/cn";

export type AuthAsidePoint = { icon: ReactNode; title: string; text?: string };

/**
 * Brand panel beside the form on desktop (hidden on phones, where the form is the whole page).
 * `steps` numbers the points instead of showing their icons.
 */
export function AuthAside({ eyebrow = "Speech Adventure", title, description, points, steps = false, footnote }: {
  eyebrow?: string;
  title: string;
  description?: string;
  points: AuthAsidePoint[];
  steps?: boolean;
  footnote?: ReactNode;
}) {
  return (
    <section aria-label={title}
      className="relative hidden overflow-hidden rounded-overlay bg-gradient-to-br from-primary to-[#2E2690] p-10 text-white lg:flex lg:min-h-[30rem] lg:flex-col xl:p-12">
      <span aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-white/10" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-16 size-80 rounded-full bg-white/5" />
      <div className="relative space-y-3">
        <p className="text-sm font-semibold text-white/80">{eyebrow}</p>
        <h2 className="text-3xl font-bold leading-tight xl:text-4xl">{title}</h2>
        {description && <p className="max-w-md text-base leading-relaxed text-white/85">{description}</p>}
      </div>
      <ol className="relative mt-10 space-y-5">
        {points.map((point, index) => (
          <li key={point.title} className="flex gap-4">
            <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-control bg-white/15 text-sm font-bold">
              {steps ? index + 1 : point.icon}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="font-semibold">{point.title}</p>
              {point.text && <p className="mt-0.5 text-sm leading-relaxed text-white/80">{point.text}</p>}
            </div>
          </li>
        ))}
      </ol>
      {footnote && <div className="relative mt-auto pt-10 text-sm text-white/80">{footnote}</div>}
    </section>
  );
}

/**
 * Page frame for every signed-out flow (sign-in, sign-up, join code, school registration, password).
 * Phones: brand bar + the form column. Desktop: brand panel on the left, form on the right.
 */
export function AuthLayout({ aside, children, formWidth = "md" }: {
  aside?: ReactNode;
  children: ReactNode;
  /** Width of the form column: sm for short forms, lg for long two-column forms. */
  formWidth?: "sm" | "md" | "lg";
}) {
  const column = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-xl" }[formWidth];
  const desktopColumn = {
    sm: "lg:grid-cols-[minmax(0,1fr)_24rem]",
    md: "lg:grid-cols-[minmax(0,1fr)_28rem]",
    lg: "lg:grid-cols-[minmax(0,1fr)_36rem]",
  }[formWidth];
  return (
    <main className="flex min-h-screen flex-col bg-bg">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2" aria-label="หน้าแรก Speech Adventure">
          <span className="grid size-9 place-items-center rounded-control bg-primary text-primary-foreground"><Mic size={17} strokeWidth={2.5} aria-hidden="true" /></span>
          <span className="font-bold text-text">Speech Adventure</span>
        </Link>
        <ThemeToggle />
      </header>
      <div className={cn(
        "mx-auto flex w-full flex-1 items-start justify-center px-4 py-6 sm:px-6 sm:py-10 lg:max-w-6xl lg:px-8 lg:py-12",
        Boolean(aside) && cn("lg:grid lg:items-stretch lg:gap-12 xl:gap-16", desktopColumn),
      )}>
        {aside}
        <div className={cn("w-full space-y-4", column, Boolean(aside) && "lg:max-w-none")}>{children}</div>
      </div>
    </main>
  );
}

/** Title + card + footer inside AuthLayout, for the short password pages. */
export function AuthScreen({ title, description, children, footer, aside }: {
  title: string; description?: ReactNode; children: ReactNode; footer?: ReactNode; aside?: ReactNode;
}) {
  return (
    <AuthLayout aside={aside} formWidth="sm">
      <div className={cn("space-y-1 text-center", Boolean(aside) && "lg:text-left")}>
        <h1 className="text-page-title">{title}</h1>
        {description && <p className="text-sm text-text-muted">{description}</p>}
      </div>
      <Card><CardContent className="space-y-4 p-5 sm:p-6">{children}</CardContent></Card>
      {footer}
    </AuthLayout>
  );
}
