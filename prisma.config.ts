import { defineConfig, env } from "prisma/config";

// Prisma 7: connection URLs live here, not in schema.prisma.
// Next.js does not load .env.local for standalone CLIs, load it explicitly.
try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local may not exist in CI; DATABASE_URL must then come from the environment.
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    seed: "node prisma/seed.ts",
  },
});
