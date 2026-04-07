import { config } from "dotenv";
import path from "path";

const env = process.env.NODE_ENV || "development";
config({ path: path.resolve(process.cwd(), `.env.${env}`) });

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
