import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // TypeScript 严格规则
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { 
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_"
      }],
      
      // 禁止使用 @ts-ignore 和 @ts-expect-error（除非有注释说明原因）
      "@typescript-eslint/ban-ts-comment": ["error", {
        "ts-expect-error": "allow-with-description",
        "ts-ignore": "allow-with-description",
        "ts-nocheck": true,
        "ts-check": false,
        minimumDescriptionLength: 10
      }],
      
      // 代码质量规则
      "no-console": ["warn", { 
        allow: ["warn", "error"] // 允许 console.warn 和 console.error，但建议使用 logger
      }],
      
      // 安全规则
      "no-eval": "error",
      "no-implied-eval": "error",
      "@typescript-eslint/no-implied-eval": "error",
      
      // 复杂度规则（警告）
      "complexity": ["warn", 15],
      "max-depth": ["warn", 4],
      "max-lines-per-function": ["warn", { 
        max: 200,
        skipBlankLines: true,
        skipComments: true
      }],
      
      // 空值检查
      "@typescript-eslint/no-non-null-assertion": "warn",
      "no-null/no-null": "off", // 允许使用 null
      
      // React Hooks 实验性规则 - 禁用以避免误报
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/refs": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Config files that don't need type checking
    "postcss.config.mjs",
    "*.config.js",
    "*.config.mjs",
  ]),
]);

export default eslintConfig;
