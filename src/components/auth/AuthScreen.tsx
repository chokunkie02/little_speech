import Link from "next/link";
import type { ReactNode } from "react";
import { Mic, Star } from "lucide-react";
import { Art } from "@/features/learning-studio/Art";
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
      className="hero-night relative hidden overflow-hidden rounded-[2rem] p-10 text-white lg:flex lg:min-h-[32rem] lg:flex-col xl:p-12">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(rgb(255_255_255/0.18)_1px,transparent_1px)] [background-size:20px_20px] [mask-image:linear-gradient(140deg,transparent_35%,#000_95%)]" />
      <div className="relative space-y-3">
        <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-caption font-semibold text-white/90 ring-1 ring-inset ring-white/15">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-[#FFD58A]" />{eyebrow}
        </p>
        <h2 className="font-display text-[2.25rem] font-semibold leading-[1.15] tracking-tight xl:text-[2.75rem]">{title}</h2>
        {description && <p className="max-w-md text-base leading-relaxed text-white/80">{description}</p>}
      </div>
      <ol className="relative mt-9 space-y-3">
        {points.map((point, index) => (
          <li key={point.title} className="flex max-w-md gap-4 rounded-[1.1rem] bg-white/[0.07] p-3.5 ring-1 ring-inset ring-white/10">
            <span aria-hidden="true" className={steps
              ? "grid size-10 shrink-0 place-items-center rounded-full bg-[linear-gradient(180deg,#FFD58A,#F2B23A)] font-display text-base font-semibold text-[#3A2300]"
              : "grid size-10 shrink-0 place-items-center rounded-[0.8rem] bg-white/15 text-[#FFD58A]"}>
              {steps ? index + 1 : point.icon}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="font-display font-medium">{point.title}</p>
              {point.text && <p className="mt-0.5 text-sm leading-relaxed text-white/75">{point.text}</p>}
            </div>
          </li>
        ))}
      </ol>
      {!footnote && <div aria-hidden="true" className="absolute -bottom-4 right-8 hidden w-40 rotate-[-4deg] rounded-[1.4rem] bg-white/95 p-3 shadow-[0_24px_48px_-24px_rgb(0_0_0/0.7)] xl:block [&_svg]:h-auto [&_svg]:w-full">
        <Art kind="chicken" label="" />
        <span className="absolute -left-4 -top-3 flex items-center gap-1 whitespace-nowrap rounded-full bg-[linear-gradient(180deg,#FFD58A,#F2B23A)] px-2.5 py-1 font-display text-xs font-semibold text-[#3A2300] shadow-card">
          <Star size={12} className="fill-current" />+3 ดาว
        </span>
      </div>}
      {footnote && <div className="relative mt-auto max-w-[19rem] pt-10 text-sm text-white/80 xl:max-w-[22rem]">{footnote}</div>}
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
          <span className="btn-primary grid size-9 place-items-center rounded-[0.7rem] text-primary-foreground"><Mic size={17} strokeWidth={2.5} aria-hidden="true" /></span>
          <span className="font-display text-lg font-semibold text-text">Speech Adventure</span>
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
        <h1 className="font-display text-[2rem] font-semibold leading-tight tracking-tight text-text">{title}</h1>
        {description && <p className="text-[0.9375rem] text-text-muted">{description}</p>}
      </div>
      <Card className="shadow-[0_28px_56px_-36px_rgb(36_27_102/0.5)]"><CardContent className="space-y-4 p-5 sm:p-7">{children}</CardContent></Card>
      {footer}
    </AuthLayout>
  );
}
