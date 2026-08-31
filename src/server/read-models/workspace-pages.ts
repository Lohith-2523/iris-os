import 'server-only';

import { cache } from 'react';
import { listProjects } from '@/server/domains/project-service';
import { listTasks } from '@/server/domains/task-service';
import { listWorkspaceClients, listWorkspaceTeam } from '@/server/domains/workspace-directory-service';
import type { RequestSecurityContext } from '@/server/security/request-security-context';
import { getWorkspaceReadModel } from '@/server/workspace/workspace-service';
import { getDashboardMetrics, getFinanceOverview } from '@/server/domains/finance-read-service';

const firstPage = { cursor: null, limit: 50, take: 51 } as const;

function serializable<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export const getProjectsReadModel = cache(async (ctx: RequestSecurityContext) => {
  const workspace = await getWorkspaceReadModel(ctx);
  const [projects, clients] = await Promise.all([
    listProjects(ctx, firstPage),
    listWorkspaceClients(ctx),
  ]);
  const team = await listWorkspaceTeam(ctx);

  return serializable({
    projects: projects.items,
    clients,
    teamMembers: team.filter((member) => member.role.toLowerCase() !== 'client'),
    workspace,
  });
});

export const getTasksReadModel = cache(async (ctx: RequestSecurityContext, projectId?: string | null) => {
  const workspace = await getWorkspaceReadModel(ctx);
  const [projects, tasks] = await Promise.all([
    listProjects(ctx, firstPage),
    listTasks(ctx, firstPage, { projectId }),
  ]);
  const team = await listWorkspaceTeam(ctx);

  return serializable({
    projects: projects.items,
    tasks: tasks.items,
    teamMembers: team.filter((member) => member.role.toLowerCase() !== 'client'),
    currentUser: workspace.user,
  });
});

export const getClientsReadModel = cache(async (ctx: RequestSecurityContext) => {
  const [clients, team] = await Promise.all([
    listWorkspaceClients(ctx),
    listWorkspaceTeam(ctx),
  ]);

  return serializable({
    clients,
    team,
    canManageClients: ctx.role.toLowerCase() === 'admin',
  });
});

export const getDashboardReadModel = cache(async (ctx: RequestSecurityContext) => {
  const workspace = await getWorkspaceReadModel(ctx);
  const dashboard = await getDashboardMetrics(ctx);
  const [clients, tasks] = await Promise.all([
    listWorkspaceClients(ctx),
    listTasks(ctx, firstPage),
  ]);
  return serializable({ dashboard, clients, tasks: tasks.items, workspace });
});

export const getFinanceReadModel = cache(async (ctx: RequestSecurityContext) => {
  const workspace = await getWorkspaceReadModel(ctx);
  const finance = await getFinanceOverview(ctx, 'All Time');
  const clients = await listWorkspaceClients(ctx);
  return serializable({ finance, clients, workspace });
});

export const getTeamReadModel = cache(async (ctx: RequestSecurityContext) => {
  const workspace = await getWorkspaceReadModel(ctx);
  const [team, projects] = await Promise.all([
    listWorkspaceTeam(ctx),
    listProjects(ctx, firstPage),
  ]);
  return serializable({
    team: team.filter((member) => ['admin', 'member', 'sub_admin'].includes(member.role.toLowerCase())),
    projects: projects.items,
    workspace,
  });
});

export type ProjectsReadModel = Awaited<ReturnType<typeof getProjectsReadModel>>;
export type TasksReadModel = Awaited<ReturnType<typeof getTasksReadModel>>;
export type ClientsReadModel = Awaited<ReturnType<typeof getClientsReadModel>>;
export type DashboardReadModel = Awaited<ReturnType<typeof getDashboardReadModel>>;
export type FinanceReadModel = Awaited<ReturnType<typeof getFinanceReadModel>>;
export type TeamReadModel = Awaited<ReturnType<typeof getTeamReadModel>>;
