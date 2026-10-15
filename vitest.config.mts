import { defineConfig, type Plugin } from "vitest/config"
import { fileURLToPath } from "node:url"

/**
 * Blocks the database barrel inside unit tests.
 *
 * Vite loads `.env`, so `DATABASE_URL` points at the same Neon instance as
 * development. A stray `import { db }` in a unit test would run real queries
 * against dev data and the assertion would still pass. Failing at import time is
 * far cheaper than noticing afterwards.
 *
 * Only `@/db` is blocked. `@/db/schemas` is fine: those are table definitions
 * and open no connection.
 */
function blockDatabaseAccess(): Plugin {
  const isDatabaseBarrel = (id: string) =>
    /(^|[/\\])db(\.ts)?$/.test(id.split("?")[0]) ||
    id.endsWith("/src/db/index.ts")

  return {
    name: "block-database-access",
    enforce: "pre",
    load(id) {
      if (isDatabaseBarrel(id)) {
        throw new Error(
          `Unit tests must not import "@/db" (resolved to "${id}"). ` +
            "These suites test pure logic; anything needing the database " +
            "belongs in an integration test."
        )
      }
      return null
    },
  }
}

export default defineConfig({
  plugins: [blockDatabaseAccess()],
  test: {
    // Every suite here tests pure logic, so there is no reason to pay for a
    // DOM. A component test would opt in with a `@vit-environment jsdom`
    // docblock at the top of the file.
    environment: "node",
    globals: false,
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
})