import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // core tests run in node; React tests opt into jsdom with a file comment
    environment: "node",
  },
});
