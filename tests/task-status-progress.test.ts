import { describe, expect, it } from 'vitest';
import { isTaskStatus, normalizeTaskStatusProgress } from '@/lib/tasks/status-progress';

describe('task status and progress normalization', () => {
  it('completes a task when progress reaches 100%', () => {
    expect(normalizeTaskStatusProgress(
      { status: 'IN_PROGRESS', progress: 80 },
      { progress: 100 },
    )).toEqual({ status: 'COMPLETED', progress: 100 });
  });

  it('sets completed tasks to 100%', () => {
    expect(normalizeTaskStatusProgress(
      { status: 'IN_PROGRESS', progress: 40 },
      { status: 'COMPLETED' },
    )).toEqual({ status: 'COMPLETED', progress: 100 });
  });

  it('resets tasks moved to yet to start', () => {
    expect(normalizeTaskStatusProgress(
      { status: 'BLOCKED', progress: 60 },
      { status: 'TODO' },
    )).toEqual({ status: 'TODO', progress: 0 });
  });

  it('gives newly active tasks measurable progress', () => {
    expect(normalizeTaskStatusProgress(
      { status: 'TODO', progress: 0 },
      { status: 'IN_PROGRESS' },
    )).toEqual({ status: 'IN_PROGRESS', progress: 1 });
  });

  it('accepts only supported task statuses', () => {
    expect(isTaskStatus('BLOCKED')).toBe(true);
    expect(isTaskStatus('ARCHIVED')).toBe(false);
  });
});
