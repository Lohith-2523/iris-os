import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { resolveDatabasePoolMax } from './database-resilience';

type PrismaGlobal = typeof globalThis & {
  prisma?: PrismaClient;
  prismaModelSignature?: string;
};

const globalForPrisma = globalThis as PrismaGlobal;
const MAX_FIND_MANY_ROWS = 250;
const databasePoolMax = resolveDatabasePoolMax(process.env.DATABASE_POOL_MAX, {
  connectionString: process.env.DATABASE_URL,
  environment: process.env.NODE_ENV,
});
const prismaModelSignature = JSON.stringify(
  {
    connectionPolicyVersion: 3,
    databasePoolMax,
    models: Prisma.dmmf.datamodel.models
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
  },
);
const requiredModelDelegates = Prisma.dmmf.datamodel.models.map(
  (model) => `${model.name.charAt(0).toLowerCase()}${model.name.slice(1)}`,
);

function hasRequiredModelDelegates(client: PrismaClient) {
  const delegates = client as unknown as Record<string, unknown>;
  return requiredModelDelegates.every((delegate) => typeof delegates[delegate] === 'object');
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured.');
  }

  const adapter = new PrismaPg({
    connectionString,
    max: databasePoolMax,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 10_000,
    maxLifetimeSeconds: 300,
    allowExitOnIdle: true,
  });

  const client = new PrismaClient({ adapter });
  return client.$extends({
    name: 'bounded-find-many',
    query: {
      $allModels: {
        async findMany({ args, query }) {
          const requestedTake = typeof args.take === 'number' ? Math.abs(args.take) : MAX_FIND_MANY_ROWS;
          args.take = Math.min(requestedTake, MAX_FIND_MANY_ROWS);
          return query(args);
        },
      },
    },
  }) as unknown as PrismaClient;
}

// Use one client/pool per runtime isolate in every environment. Production
// bundles may load this module through more than one server chunk; bypassing
// globalThis there can create multiple pools in the same Node process.
if (
  !globalForPrisma.prisma ||
  globalForPrisma.prismaModelSignature !== prismaModelSignature ||
  !hasRequiredModelDelegates(globalForPrisma.prisma)
) {
  if (globalForPrisma.prisma && process.env.NODE_ENV !== 'production') {
    void globalForPrisma.prisma.$disconnect();
  }
  globalForPrisma.prisma = createPrismaClient();
  globalForPrisma.prismaModelSignature = prismaModelSignature;
}

const prisma = globalForPrisma.prisma;

export { prisma };
export default prisma;
