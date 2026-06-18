"use client";

import { useState } from "react";
import { History } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { buttonClasses } from "@/components/ui/button";
import {
  ActivityTimeline,
  type ActivityItem,
} from "@/components/ui/activity-timeline";

export function ActivityLogButton({ items }: { items: ActivityItem[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClasses({ variant: "secondary", size: "sm" })}
      >
        <History className="size-4" /> Activity
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="border-b border-line p-5 pr-12 text-left">
            <DialogTitle>Activity</DialogTitle>
            <DialogDescription>
              Everything that&apos;s happened to this assessment, newest first.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-5">
            {items.length ? (
              <ActivityTimeline items={items} />
            ) : (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
