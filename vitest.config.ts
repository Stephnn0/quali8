import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Minimal config for unit-testing server logic. Deliberately does NOT use the
// reactRouter() plugin from vite.config.ts (it transforms routes and isn't
// needed for plain server modules).
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["app/**/*.test.ts"],
  },
});
