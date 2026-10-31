import { defineConfig } from "drizzle-kit";

// `npx drizzle-kit generate` writes a new migration into drizzle/ after a change to the schema.
// `npm run db:migrate` applies them (npm run dev and the Vercel build run it first).
export default defineConfig({
  dialect: "sqlite",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
});
