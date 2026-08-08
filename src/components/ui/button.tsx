import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "soft" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const BASE =
  "relative inline-flex select-none items-center justify-center gap-2 rounded-btn font-medium " +
  "transition-[transform,box-shadow,background-color,color] duration-200 ease-[var(--ease-out-soft)] " +
  "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-[0_1px_2px_rgb(76_29_149/0.25)] " +
    "hover:shadow-glow hover:from-brand-400 hover:to-brand-500",
  soft: "bg-brand-50 text-brand-700 hover:bg-brand-100",
  outline:
    "border border-line-strong bg-surface text-ink hover:border-brand-300 hover:bg-brand-50/60",
  ghost: "text-ink-soft hover:bg-brand-50 hover:text-brand-700",
  danger: "bg-bad/10 text-bad hover:bg-bad/15",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[0.85rem]",
  md: "h-11 px-5 text-[0.95rem]",
  lg: "h-13 px-7 text-[1.02rem]",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  children?: ReactNode;
  className?: string;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...rest
}: CommonProps & ComponentProps<"button">) {
  return (
    <button className={cn(BASE, VARIANTS[variant], SIZES[size], className)} {...rest} />
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...rest
}: CommonProps & ComponentProps<typeof Link>) {
  return <Link className={cn(BASE, VARIANTS[variant], SIZES[size], className)} {...rest} />;
}
