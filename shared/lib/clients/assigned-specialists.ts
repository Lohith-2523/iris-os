export interface AssignedSpecialist {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string | null;
}

export function collectAssignedSpecialists(
  projects: Array<{ members?: AssignedSpecialist[] }> = [],
  legacySpecialist?: AssignedSpecialist | null,
) {
  return Array.from(new Map<string, AssignedSpecialist>(
    [
      ...projects.flatMap((project) => project.members || []),
      legacySpecialist,
    ]
      .filter((specialist): specialist is AssignedSpecialist => Boolean(specialist))
      .map((specialist) => [specialist.id, specialist]),
  ).values());
}
