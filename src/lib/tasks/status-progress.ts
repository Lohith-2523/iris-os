export const TASK_STATUS_OPTIONS = [
  { value: 'TODO', label: 'Yet to start' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'BLOCKED', label: 'Blocked' },
  { value: 'COMPLETED', label: 'Completed' },
] as const;

export type TaskStatus = (typeof TASK_STATUS_OPTIONS)[number]['value'];

export function isTaskStatus(value: unknown): value is TaskStatus {
  return TASK_STATUS_OPTIONS.some((option) => option.value === value);
}

export function normalizeTaskStatusProgress(
  current: { status: string; progress: number },
  changes: { status?: string; progress?: number },
) {
  let status = changes.status ?? current.status;
  let progress = changes.progress ?? current.progress;

  if (changes.status === 'COMPLETED') {
    progress = 100;
  } else if (changes.status === 'TODO') {
    progress = 0;
  } else if (changes.status === 'IN_PROGRESS' && progress === 0) {
    progress = 1;
  }

  if (changes.progress !== undefined) {
    if (progress === 100) {
      status = 'COMPLETED';
    } else if (status === 'COMPLETED') {
      status = progress === 0 ? 'TODO' : 'IN_PROGRESS';
    } else if (progress > 0 && status === 'TODO') {
      status = 'IN_PROGRESS';
    }
  }

  return { status, progress };
}
