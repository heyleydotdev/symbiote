import {
  Dialog as UiDialog,
  DialogContent as UiDialogContent,
  DialogDescription as UiDialogDescription,
  DialogTitle as UiDialogTitle,
} from "@ui-sdk/react/dialog";
import { cn } from "cn";
import type { ComponentProps } from "react";

export const Dialog = UiDialog;

export function DialogContent({ className, ...props }: ComponentProps<typeof UiDialogContent>) {
  return (
    <UiDialogContent
      className={cn(
        "fixed inset-0 m-auto h-fit w-full max-w-md rounded-lg border border-border bg-surface p-5 text-foreground shadow-2xl outline-hidden backdrop:bg-black/60",
        className,
      )}
      {...props}
    />
  );
}

export function DialogTitle({ className, ...props }: ComponentProps<typeof UiDialogTitle>) {
  return <UiDialogTitle className={cn("text-base font-semibold", className)} {...props} />;
}

export function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof UiDialogDescription>) {
  return <UiDialogDescription className={cn("mt-1 text-sm text-muted", className)} {...props} />;
}
