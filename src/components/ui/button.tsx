import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "soft" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const BASE =
  "relative inline-flex select-none items-center justify-center gap-2 rounded-btn font-medium " +
  "transition-[transform,box-shadow,background-color,color] duration-200 ease-[var(--ease-out-soft)] " +
  "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45";

// Birincil düğme siyah: tasarım siyah/beyaz minimal, mor yalnızca detayda.
const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-black hover:shadow-lift",
  soft: "bg-brand-50 text-brand-700 hover:bg-brand-100",
  outline: "border border-line-strong bg-surface text-ink hover:border-ink",
  ghost: "text-ink-soft hover:bg-[#f4f4f4] hover:text-ink",
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
