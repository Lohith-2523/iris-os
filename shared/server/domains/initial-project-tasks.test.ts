import { describe, expect, it } from 'vitest';
import { parseInitialProjectTasks } from './initial-project-tasks';

describe('initial project tasks', () => {
  it('defaults a task to stage one and accepts a deadline', () => {
    const result = parseInitialProjectTasks([{ title: 'Launch campaign', deadline: '2026-10-15' }]);
    expect(result).toEqual({ tasks: [{ title: 'Launch campaign', stagePosition: 0, deadline: new Date('2026-10-15') }] });
  });

  it('preserves the selected stage position', () => {
    expect(parseInitialProjectTasks([{ title: 'QA review', stagePosition: 2 }])).toEqual({
      tasks: [{ title: 'QA review', stagePosition: 2, deadline: null }],
    });
  });

  it('rejects an invalid stage position', () => {
    expect(parseInitialProjectTasks([{ title: 'QA review', stagePosition: 8 }])).toEqual({ error: 'Initial task stage selection is invalid.' });
  });
});
