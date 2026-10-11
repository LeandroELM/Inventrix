const { defineConfig, globalIgnores } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  globalIgnores(["dist/*", ".expo/*", "supabase/functions/**"]),
  expoConfig,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
]);
