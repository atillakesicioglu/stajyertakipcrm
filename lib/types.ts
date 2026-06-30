import type { Priority, TaskStatus } from "@prisma/client";

export type SubmissionData = {
  id: string;
  textContent: string | null;
  screenshotUrl: string | null;
  screenshotName: string | null;
  submittedAt: Date;
};

export type RevisionData = {
  id: string;
  note: string;
  createdAt: Date;
};

export type TaskData = {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: TaskStatus;
  dueDate: Date | null;
  createdAt: Date;
  assignedTo: { id: string; name: string };
  submissions: SubmissionData[];
  revisions: RevisionData[];
};

export type InternOption = { id: string; name: string };
