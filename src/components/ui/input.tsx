import { Input as UiInput } from "@ui-sdk/react/input";
import { cn } from "cn";
import type { ComponentProps } from "react";

export type InputProps = ComponentProps<typeof UiInput>;

export function Input({ className, ...props }: InputProps) {
  return (
    <UiInput
      className={cn(
        "h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-primary",
        className,
      )}
      {...props}
    />
  );
}
