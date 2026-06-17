import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
type Size = "sm" | "md" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap select-none";

const variantClasses: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-strong shadow-xs",
  secondary: "bg-surface text-ink border border-line-strong hover:bg-surface-2",
  ghost: "text-ink-soft hover:bg-surface-2 hover:text-ink",
  danger: "bg-critical text-white hover:brightness-110 shadow-xs",
  subtle: "bg-surface-2 text-ink-soft hover:bg-line/70",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-[0.8125rem]",
  md: "h-10 px-4 text-sm",
  icon: "h-9 w-9",
};

export function buttonClasses(opts?: {
  variant?: Variant;
  size?: Size;
  className?: string;
}) {
  const { variant = "primary", size = "md", className } = opts ?? {};
  return cn(base, variantClasses[variant], sizeClasses[size], className);
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size, className, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={buttonClasses({ variant, size, className })}
      {...props}
    />
  ),
);
Button.displayName = "Button";
