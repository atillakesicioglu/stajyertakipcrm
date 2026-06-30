"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ChevronDown,
  ClipboardList,
  Play,
  Send,
  RotateCcw,
  Check,
  UserPlus,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import {
  buildTaskTimeline,
  type TimelineEvent,
  type TimelineEventType,
} from "@/lib/task-timeline";
import type { TaskData } from "@/lib/types";

const ICONS: Record<TimelineEventType, typeof ClipboardList> = {
  assigned: UserPlus,
  started: Play,
  submitted: Send,
  revision: RotateCcw,
  approved: Check,
};

const COLORS: Record<TimelineEventType, string> = {
  assigned: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  started: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  submitted: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  revision: "bg-red-500/15 text-red-600 dark:text-red-400",
  approved: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
};

function TimelineItem({ event }: { event: TimelineEvent }) {
  const Icon = ICONS[event.type];

  return (
    <div className="relative flex gap-3 pb-6 last:pb-0">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full",
            COLORS[event.type]
          )}
        >
          <Icon className="size-4" />
        </div>
        <div className="mt-1 w-px flex-1 bg-border" />
      </div>
      <div className="min-w-0 flex-1 pb-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-medium">{event.title}</p>
          <time className="shrink-0 text-xs text-muted-foreground">
            {formatDate(event.at)}
          </time>
        </div>
        {event.detail && (
          <p
            className={cn(
              "mt-1 whitespace-pre-wrap text-sm",
              event.type === "revision"
                ? "rounded-md border border-destructive/20 bg-destructive/5 p-2 text-destructive"
                : "text-muted-foreground"
            )}
          >
            {event.type === "revision" ? (
              <>
                <span className="font-medium">Revize notu: </span>
                {event.detail}
              </>
            ) : (
              event.detail
            )}
          </p>
        )}
        {event.submission?.screenshotUrl && (
          <a
            href={event.submission.screenshotUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block"
          >
            <Image
              src={event.submission.screenshotUrl}
              alt={event.submission.screenshotName ?? "Ekran görüntüsü"}
              width={280}
              height={180}
              className="max-h-40 w-auto rounded-md border object-contain"
              unoptimized
            />
          </a>
        )}
      </div>
    </div>
  );
}

export function TaskTimelineAccordion({ task }: { task: TaskData }) {
  const [open, setOpen] = useState(false);
  const events = buildTaskTimeline(task);

  if (events.length === 0) return null;

  return (
    <div className="mt-4 rounded-md border bg-muted/20">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-muted/40"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <ClipboardList className="size-4 text-muted-foreground" />
          İş Geçmişi
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
            {events.length} kayıt
          </span>
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="border-t px-4 py-4">
          {events.map((event, i) => (
            <TimelineItem key={`${event.type}-${event.at.toISOString()}-${i}`} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
