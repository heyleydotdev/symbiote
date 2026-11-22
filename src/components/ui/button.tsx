import { Button as UiButton } from "@ui-sdk/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import type { ComponentProps } from "react";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors outline-hidden select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "border border-border bg-surface text-foreground hover:bg-foreground/5",
        ghost: "text-muted hover:bg-foreground/5 hover:text-foreground",
      },
      size: {
        sm: "h-8 px-2 text-xs",
        md: "h-9 px-3",
        icon: "size-8 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = ComponentProps<typeof UiButton> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <UiButton className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
