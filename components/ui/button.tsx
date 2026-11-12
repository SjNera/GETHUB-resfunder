import { cva, type VariantProps } from "class-variance-authority";
import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/ui/cn";

export const buttonVariants = cva(
  "pressable inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /** The one tangerine action per screen. Onyx text on orange. */
        primary: "bg-brand text-brand-fg shadow-[0_1px_0_rgb(255_255_255/0.35)_inset,0_6px_16px_-6px_rgb(255_138_28/0.6)] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-brand-hover",
        dark: "bg-inverse text-inverse-fg [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-90",
        outline: "border border-border-strong bg-surface text-fg [@media(hover:hover)_and_(pointer:fine)]:hover:border-fg/40",
        ghost: "text-fg [@media(hover:hover)_and_(pointer:fine)]:hover:bg-surface-2",
        danger: "bg-dontpay text-white dark:text-inverse-fg [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-90",
        success: "bg-pay text-white dark:text-inverse-fg [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-90",
      },
      size: {
        sm: "h-9 px-3.5 text-sm",
        md: "h-11 px-5 text-[15px]",
        lg: "h-12 px-6 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "outline", size: "md" },
  },
);

type Variants = VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = "button", ...props }: ComponentProps<"button"> & Variants) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export function ButtonLink({ className, variant, size, ...props }: ComponentProps<typeof Link> & Variants) {
  return <Link className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
