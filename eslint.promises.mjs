import tseslint from "typescript-eslint";
export default [
  { ignores: ["node_modules/**", ".next/**", ".open-next/**", "scripts/_*", "site-dist/**", "release/**", "art/**", ".wrangler/**", "**/*.mjs", "**/*.js", "**/*.cjs"] },
  {
    files: ["lib/**/*.ts", "app/**/*.ts", "app/**/*.tsx", "components/**/*.ts", "components/**/*.tsx", "scripts/*.ts"],
    languageOptions: { parser: tseslint.parser, parserOptions: { projectService: true } },
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": ["error", { checksVoidReturn: false }],
      "@typescript-eslint/await-thenable": "error",
    },
  },
];
