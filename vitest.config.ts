import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["modules/**/*.test.ts", "scripts/**/*.test.ts"],
    environment: "node",
  },
})
