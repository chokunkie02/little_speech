import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type CardProps = ComponentProps<"div"> & {
  /** Lift on hover — for cards that are clickable as a whole. */
  interactive?: boolean;
  /** Dashed outline for placeholders such as "add new". */
  dashed?: boolean;
};

export function Card({ className, interactive = false, dashed = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card border bg-surface text-text",
        dashed ? "border-dashed border-border" : "border-border shadow-card",
        interactive && "transition-shadow hover:shadow-raised",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, title, description, action, children, ...props }:
  Omit<ComponentProps<"div">, "title"> & { title?: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 p-4 pb-0 sm:p-5 sm:pb-0", className)} {...props}>
      {(title || description) && (
        <div className="min-w-0 space-y-1">
          {title && <h3 className="text-card-title break-words">{title}</h3>}
          {description && <p className="text-sm text-text-muted">{description}</p>}
        </div>
      )}
      {children}
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("p-4 sm:p-5", className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-wrap items-center justify-end gap-2 border-t border-border px-4 py-3 sm:px-5", className)}
      {...props}
    />
  );
}
