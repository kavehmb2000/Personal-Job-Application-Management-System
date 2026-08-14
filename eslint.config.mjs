import eslint from "@eslint/js";

export default [
  {
    ignores: [".next/**", "node_modules/**", "dist/**", "coverage/**"],
  },
  eslint.configs.recommended,
];
