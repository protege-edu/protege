import { defineConfig } from "drizzle-kit";

// `npx drizzle-kit generate` writes a new migration into drizzle/ after a change to the schema.
// Cloudflare applies them (wrangler.jsonc: migrations_dir): `npm run db:migrate` (this computer) or `npm run db:migrate:online`.
export default defineConfig({
  dialect: "sqlite",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
});
