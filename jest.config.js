const preset = require("jest-expo/jest-preset");

module.exports = {
  preset: "jest-expo",
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  testPathIgnorePatterns: ["/node_modules/", "/supabase/"],
  // Extiende el patrón de jest-expo para transformar también lucide-react-native.
  transformIgnorePatterns: preset.transformIgnorePatterns.map((p) =>
    p.startsWith("/node_modules/(?!(") ? p.replace("(?!(", "(?!(lucide-react-native|") : p,
  ),
};
