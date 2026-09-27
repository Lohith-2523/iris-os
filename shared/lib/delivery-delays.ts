export type DeliveryTaskLike = {
  title?: string;
  status: string;
  deadline?: Date | string | null;
  stageId?: string | null;
};

export type DeliveryStageLike = {
  id: string;
  name?: string;
};

export type DeliveryProjectLike = {
  tasks?: DeliveryTaskLike[];
  stages?: DeliveryStageLike[];
};

function dateValue(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isTaskDelayed(task: DeliveryTaskLike, now = new Date()) {
  const deadline = dateValue(task.deadline);
  return task.status !== 'COMPLETED' && Boolean(deadline && deadline < now);
}

export function isStageDelayed(
  stage: DeliveryStageLike,
  tasks: DeliveryTaskLike[],
  now = new Date(),
) {
  void stage;
  void tasks;
  void now;
  return false;
}

export function getDeliveryDelaySummary(project: DeliveryProjectLike, now = new Date()) {
  const tasks = project.tasks || [];
  const delayedTasks = tasks.filter((task) => isTaskDelayed(task, now));
  const delayedStages: DeliveryStageLike[] = [];

  return {
    delayedTasks,
    delayedStages,
    total: delayedTasks.length + delayedStages.length,
  };
}
