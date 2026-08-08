import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...rest }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-card border border-line bg-surface/85 p-5 shadow-soft backdrop-blur-sm",
        className,
      )}
      {...rest}
    />
  );
}

export function SectionHeading({
  eyebrow,
  title,
  className,
}: {
  eyebrow?: string;
  title: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-5", className)}>
      {eyebrow ? (
        <p className="mb-1.5 text-[0.7rem] font-medium uppercase tracking-[0.18em] text-brand-500">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-[1.75rem] leading-tight sm:text-[2rem]">{title}</h2>
    </div>
  );
}

/** İçi boş durumlar için — liste ekranlarının hepsi bunu kullanıyor. */
export function EmptyState({
  icon,
  title,
  hint,
}: {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-line-strong px-6 py-14 text-center">
      {icon ? <div className="text-brand-300">{icon}</div> : null}
      <p className="font-medium text-ink">{title}</p>
      {hint ? <p className="max-w-xs text-sm text-ink-soft">{hint}</p> : null}
    </div>
  );
}
