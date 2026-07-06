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

export type StartData = {
  id: string;
  startedAt: Date;
};

export type TaskData = {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: TaskStatus;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt?: Date;
  approvedAt: Date | null;
  assignedTo: { id: string; name: string };
  createdBy?: { id: string; name: string };
  submissions: SubmissionData[];
  revisions: RevisionData[];
  starts: StartData[];
};

export type InternOption = { id: string; name: string; email: string };
