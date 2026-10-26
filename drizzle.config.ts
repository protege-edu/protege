import { defineConfig } from "drizzle-kit";
import { dbFile } from "./lib/db/location";

export default defineConfig({
  dialect: "sqlite",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: dbFile() },
});
