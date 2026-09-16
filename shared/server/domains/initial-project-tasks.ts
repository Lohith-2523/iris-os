export type InitialProjectTask = {
  title: string;
  stagePosition: number;
  deadline: Date | null;
};

export function parseInitialProjectTasks(value: unknown): { tasks: InitialProjectTask[]; error?: never } | { tasks?: never; error: string } {
  if (value === undefined || value === null) return { tasks: [] };
  if (!Array.isArray(value)) return { error: 'Initial project tasks must be a list.' };

  const tasks: InitialProjectTask[] = [];
  for (const item of value.slice(0, 20)) {
    if (!item || typeof item !== 'object') return { error: 'Each initial project task must be an object.' };
    const candidate = item as { title?: unknown; stagePosition?: unknown; deadline?: unknown };
    const title = typeof candidate.title === 'string' ? candidate.title.trim() : '';
    if (!title) continue;

    const stagePosition = candidate.stagePosition === undefined ? 0 : Number(candidate.stagePosition);
    if (!Number.isInteger(stagePosition) || stagePosition < 0 || stagePosition > 7) {
      return { error: 'Initial task stage selection is invalid.' };
    }

    let deadline: Date | null = null;
    if (candidate.deadline !== undefined && candidate.deadline !== null && candidate.deadline !== '') {
      deadline = new Date(String(candidate.deadline));
      if (Number.isNaN(deadline.getTime())) return { error: 'Initial task date is invalid.' };
    }

    tasks.push({ title, stagePosition, deadline });
  }

  return { tasks };
}
