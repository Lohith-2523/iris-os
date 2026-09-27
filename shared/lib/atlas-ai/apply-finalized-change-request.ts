import { prisma } from '@/lib/db';

type FinalizedChangeRequestInput = {
  id: string;
  title: string;
  details: string;
  agencyResponse?: string | null;
  alternateProposal?: string | null;
  projectId: string;
  clientId: string;
  orgId: string;
};

type TaskAdaptation = {
  created: number;
  altered: number;
  taskIds: string[];
  summary: string;
};

const stopWords = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'can', 'for', 'from', 'in', 'is', 'it',
  'of', 'on', 'or', 'our', 'please', 'that', 'the', 'this', 'to', 'we', 'with', 'would', 'you',
]);

function keywords(value: string) {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word)),
  );
}

function overlapScore(left: string, right: string) {
  const leftWords = keywords(left);
  const rightWords = keywords(right);
  if (!leftWords.size || !rightWords.size) return 0;
  const overlap = [...leftWords].filter((word) => rightWords.has(word)).length;
  return overlap / Math.min(leftWords.size, rightWords.size);
}

function finalizedScope(input: FinalizedChangeRequestInput) {
  return input.alternateProposal?.trim()
    || input.agencyResponse?.trim()
    || input.details.trim();
}

function scopeActions(scope: string) {
  const actions = scope
    .split(/\r?\n|(?<=[.!?;])\s+/)
    .map((item) => item.replace(/^[-*\d.)\s]+/, '').trim())
    .filter((item) => item.length >= 8);
  return [...new Set(actions.length ? actions : [scope])].slice(0, 5);
}

function taskTitle(action: string) {
  const cleaned = action
    .replace(/^(please|could you|can you|we need to|the agency will|the team will)\s+/i, '')
    .replace(/[.!?;]+$/, '')
    .trim();
  const title = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return title.length > 96 ? `${title.slice(0, 93).trim()}...` : title;
}

export async function applyFinalizedChangeRequest(input: FinalizedChangeRequestInput): Promise<TaskAdaptation> {
  const project = await prisma.project.findFirst({
    where: { id: input.projectId, clientId: input.clientId, orgId: input.orgId },
    include: {
      stages: { orderBy: { position: 'asc' } },
      tasks: { include: { stage: true } },
    },
  });
  if (!project) throw new Error('Miles could not find the project for this finalized change request.');

  const marker = `[Miles change request ${input.id}]`;
  const scope = finalizedScope(input);
  const actions = scopeActions(scope);
  const operations: Array<ReturnType<typeof prisma.clientTask.update> | ReturnType<typeof prisma.clientTask.create>> = [];
  const taskIds: string[] = [];
  const usedTaskIds = new Set<string>();
  let created = 0;
  let altered = 0;

  for (const action of actions) {
    const rankedTasks = project.tasks
      .filter((task) => !usedTaskIds.has(task.id))
      .map((task) => ({ task, score: overlapScore(action, `${task.title} ${task.description || ''} ${task.stage?.name || ''}`) }))
      .sort((left, right) => right.score - left.score);
    const bestMatch = rankedTasks[0];

    if (bestMatch && bestMatch.score >= 0.3) {
      const task = bestMatch.task;
      const changeNote = `${marker}\nFinalized scope: ${action}`;
      const originalDescription = task.description?.includes(marker)
        ? task.description.slice(0, task.description.indexOf(marker)).trim()
        : task.description?.trim();
      operations.push(prisma.clientTask.update({
        where: { id: task.id },
        data: {
          description: [originalDescription, changeNote].filter(Boolean).join('\n\n'),
          status: ['COMPLETED', 'NEEDS_CLIENT_APPROVAL', 'BLOCKED'].includes(task.status) ? 'IN_PROGRESS' : task.status,
          progress: Math.min(Number(task.progress || 0), 75),
          blocker: task.status === 'BLOCKED' ? null : task.blocker,
          approvalStatus: 'NOT_REQUIRED',
          approvalNote: null,
          approvedAt: null,
          updates: { create: { content: `Miles adapted this task for finalized change request: ${input.title}` } },
        },
      }));
      taskIds.push(task.id);
      usedTaskIds.add(task.id);
      altered += 1;
      continue;
    }

    const rankedStages = project.stages
      .map((stage) => ({ stage, score: overlapScore(action, stage.name) }))
      .sort((left, right) => right.score - left.score);
    const stage = rankedStages[0]?.score > 0 ? rankedStages[0].stage : project.stages[0];
    operations.push(prisma.clientTask.create({
      data: {
        title: taskTitle(action),
        description: `${marker}\nCreated automatically from finalized scope: ${action}`,
        status: 'TODO',
        progress: 0,
        clientId: input.clientId,
        projectId: input.projectId,
        stageId: stage?.id || null,
        deadline: project.endDate,
      },
    }));
    created += 1;
  }

  if (operations.length) {
    const adaptedTasks = await prisma.$transaction(operations);
    for (const task of adaptedTasks) if (!taskIds.includes(task.id)) taskIds.push(task.id);
  }

  const refreshedTasks = await prisma.clientTask.findMany({ where: { projectId: project.id }, select: { status: true, progress: true } });
  const progress = refreshedTasks.length
    ? Math.round(refreshedTasks.reduce((sum, task) => sum + Number(task.progress || (task.status === 'COMPLETED' ? 100 : 0)), 0) / refreshedTasks.length)
    : project.progress;
  await prisma.project.update({ where: { id: project.id }, data: { progress } });

  const summary = `Miles adapted the project plan: ${altered} existing task${altered === 1 ? '' : 's'} updated and ${created} new task${created === 1 ? '' : 's'} created.`;
  await prisma.changeRequest.update({
    where: { id: input.id },
    data: { atlasAppliedAt: new Date(), atlasSummary: summary },
  });

  return { created, altered, taskIds, summary };
}
