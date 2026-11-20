import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/** inverse / inverse-outline: for buttons placed on a brand-coloured fill (e.g. the landing hero), same in both themes. */
export type ButtonVariant = "primary" | "secondary" | "success" | "outline" | "ghost" | "danger" | "link" | "inverse" | "inverse-outline";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control font-display font-medium transition-[colors,box-shadow,transform] active:translate-y-px " +
  "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "btn-primary bg-primary text-primary-foreground",
  success: "bg-success text-white shadow-[0_8px_18px_-10px_rgb(76_175_130/0.9)] hover:bg-success/90",
  secondary: "bg-secondary text-secondary-foreground shadow-card hover:bg-secondary/85",
  outline: "border border-border bg-surface text-text hover:bg-surface-muted",
  ghost: "text-text-muted hover:bg-surface-muted hover:text-text",
  danger: "bg-error text-error-foreground shadow-card hover:bg-error/90",
  link: "text-primary underline-offset-4 hover:underline",
  inverse: "bg-white text-[#4337B8] shadow-card hover:bg-white/90 focus-visible:outline-white",
  "inverse-outline": "border border-white/50 text-white hover:bg-white/10 focus-visible:outline-white",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
  icon: "h-10 w-10",
};

export function buttonClasses({ variant = "primary", size = "md", block = false, className }: {
  variant?: ButtonVariant; size?: ButtonSize; block?: boolean; className?: string;
} = {}) {
  return cn(base, variants[variant], variant === "link" ? "h-auto px-0" : sizes[size], block && "w-full", className);
}

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Full width. */
  block?: boolean;
  /** Icon shown before the label (replaced by a spinner while loading). */
  icon?: ReactNode;
};

export type ButtonProps = ComponentProps<"button"> & CommonProps & {
  loading?: boolean;
  /** Text read out while loading, e.g. "กำลังบันทึก…". Defaults to the children. */
  loadingText?: ReactNode;
};

export function Button({
  variant, size, block, icon, loading = false, loadingText, className, children, disabled, type = "button", ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, block, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : icon}
      {loading && loadingText ? loadingText : children}
    </button>
  );
}

export type ButtonLinkProps = ComponentProps<typeof Link> & CommonProps;

/** A link that looks like a button (navigation, not actions). */
export function ButtonLink({ variant, size, block, icon, className, children, ...props }: ButtonLinkProps) {
  return (
    <Link className={buttonClasses({ variant, size, block, className })} {...props}>
      {icon}
      {children}
    </Link>
  );
}
