"use client";

import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export const Dialog = BaseDialog.Root;
export const DialogTrigger = BaseDialog.Trigger;
export const DialogClose = BaseDialog.Close;

export function DialogContent({
  title,
  description,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <BaseDialog.Portal>
      <BaseDialog.Backdrop className="fixed inset-0 z-50 bg-black/35 transition-opacity duration-200 ease-out data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 dark:bg-black/60" />
      <BaseDialog.Popup
        className={cn(
          "pop fixed left-1/2 top-1/2 z-50 w-[min(92vw,30rem)] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border bg-surface p-6 shadow-2xl",
          className,
        )}
      >
        <BaseDialog.Title className="heading text-xl">{title}</BaseDialog.Title>
        {description ? <BaseDialog.Description className="mt-2 text-muted">{description}</BaseDialog.Description> : null}
        <div className="mt-5">{children}</div>
      </BaseDialog.Popup>
    </BaseDialog.Portal>
  );
}
