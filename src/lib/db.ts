import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

type PrismaGlobal = typeof globalThis & {
  prisma?: PrismaClient;
  prismaModelSignature?: string;
};

const globalForPrisma = globalThis as PrismaGlobal;
const prismaModelSignature = JSON.stringify(
  Prisma.dmmf.datamodel.models
    .map((model) => ({
      name: model.name,
      fields: model.fields
        .map((field) => ({
          name: field.name,
          kind: field.kind,
          type: field.type,
          isList: field.isList,
          isRequired: field.isRequired,
          relationName: field.relationName ?? null,
        }))
        .sort((left, right) => left.name.localeCompare(right.name)),
    }))
    .sort((left, right) => left.name.localeCompare(right.name)),
);
const requiredModelDelegates = ['recurringRetainer'] as const;

function hasRequiredModelDelegates(client: PrismaClient) {
  const delegates = client as unknown as Record<string, unknown>;
  return requiredModelDelegates.every((delegate) => typeof delegates[delegate] === 'object');
}

function createPrismaClient() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = createPrismaClient();
} else {
  // Turbopack retains global values through hot reloads. Replace the cached
  // client whenever generated models, scalar fields, or relations change.
  if (
    !globalForPrisma.prisma ||
    globalForPrisma.prismaModelSignature !== prismaModelSignature ||
    !hasRequiredModelDelegates(globalForPrisma.prisma)
  ) {
    if (globalForPrisma.prisma) {
      void globalForPrisma.prisma.$disconnect();
    }
    globalForPrisma.prisma = createPrismaClient();
    globalForPrisma.prismaModelSignature = prismaModelSignature;
  }
  prisma = globalForPrisma.prisma;
}

export { prisma };
export default prisma;
