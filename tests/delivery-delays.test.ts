import { describe, expect, it } from 'vitest';
import { getDeliveryDelaySummary, isStageDelayed, isTaskDelayed } from '@/lib/delivery-delays';

const now = new Date('2026-07-31T12:00:00.000Z');

describe('delivery delays', () => {
  it('flags incomplete tasks only after their deadline', () => {
    expect(isTaskDelayed({ status: 'IN_PROGRESS', deadline: '2026-07-30T12:00:00.000Z' }, now)).toBe(true);
    expect(isTaskDelayed({ status: 'COMPLETED', deadline: '2026-07-30T12:00:00.000Z' }, now)).toBe(false);
    expect(isTaskDelayed({ status: 'TODO', deadline: '2026-08-01T12:00:00.000Z' }, now)).toBe(false);
  });

  it('does not infer stage delays now that stages have no date range', () => {
    const stage = { id: 'stage-1', name: 'Launch' };
    const tasks = [{ status: 'BLOCKED', stageId: 'stage-1' }];
    expect(isStageDelayed(stage, tasks, now)).toBe(false);
  });

  it('returns separate stage and task delay counts', () => {
    const summary = getDeliveryDelaySummary({
      stages: [{ id: 'stage-1', name: 'Launch' }],
      tasks: [{ title: 'Publish', status: 'IN_PROGRESS', stageId: 'stage-1', deadline: '2026-07-30T12:00:00.000Z' }],
    }, now);

    expect(summary.delayedStages).toHaveLength(0);
    expect(summary.delayedTasks).toHaveLength(1);
    expect(summary.total).toBe(1);
  });
});
