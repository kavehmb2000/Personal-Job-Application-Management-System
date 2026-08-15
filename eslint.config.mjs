import eslint from "@eslint/js";

export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "dist/**",
      "coverage/**",
      "public/sw.js",
    ],
  },
  eslint.configs.recommended,
];
