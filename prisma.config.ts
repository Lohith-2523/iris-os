import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL || 'postgresql://main_admin:Dude%21%23%40%24%25123@localhost:5432/irisos?schema=public',
  },
  migrations: {
    seed: 'ts-node prisma/seed.ts',
  },
});
