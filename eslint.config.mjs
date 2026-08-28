import js from '@eslint/js';
import parser from '@typescript-eslint/parser';
import security from 'eslint-plugin-security';
import globals from 'globals';

export default [
  {
    ignores: [
      '.expo/**',
      '.qwen/**',
      'android/**',
      'api-dist/**',
      'dist/**',
      'migrations/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
        __DEV__: 'readonly',
      },
    },
    plugins: { security },
    rules: {
      ...security.configs.recommended.rules,
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'no-useless-escape': 'warn',
      'security/detect-object-injection': 'off',
      'security/detect-non-literal-fs-filename': 'warn',
      'security/detect-unsafe-regex': 'error',
    },
  },
];
