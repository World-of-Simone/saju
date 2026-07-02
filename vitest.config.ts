import { defineConfig } from "vitest/config";

// Dedicated test config. The app's vite.config.ts sets root:"web" for the web build, which
// would hide the repo-root tests/ folder from Vitest. Keeping a separate Vitest config pins
// the test root at the repo root so `npm test` discovers tests/**.
export default defineConfig({
  test: {
    root: ".",
    include: ["tests/**/*.test.ts"],
  },
});
