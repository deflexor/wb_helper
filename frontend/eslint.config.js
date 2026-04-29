import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import reactDom from 'eslint-plugin-react-dom'
import stylistic from '@stylistic/eslint-plugin'

const OFF = 'off'
const WARN = 'warn'
const ERROR = 'error'

const TYPESCRIPT_RULES = {
  '@typescript-eslint/no-unsafe-assignment': OFF,
  '@typescript-eslint/no-unsafe-call': OFF,
  '@typescript-eslint/no-unsafe-member-access': OFF,
  '@typescript-eslint/no-unsafe-argument': OFF,
  '@typescript-eslint/no-unsafe-return': OFF,
  '@typescript-eslint/no-floating-promises': OFF,
  '@typescript-eslint/return-await': ERROR,
  '@typescript-eslint/require-await': ERROR,
}

const STYLISTIC_RULES = {
  '@stylistic/brace-style': [ERROR, '1tbs', { allowSingleLine: true }],
  '@stylistic/indent': [ERROR, 2],
  '@stylistic/keyword-spacing': ERROR,
  '@stylistic/quotes': [ERROR, 'single'],
}

const CODE_GUIDELINES = {
  'no-var': ERROR,
  'eqeqeq': [ERROR, 'always'],
  'no-eval': ERROR,
  'no-implied-eval': ERROR,
  'no-throw-literal': ERROR,
  'no-self-compare': ERROR,
  'object-shorthand': [ERROR, 'always'],
  'prefer-object-spread': ERROR,
  'curly': [ERROR, 'multi-line'],
}

export default defineConfig(
  { ignores: ['dist', 'node_modules', 'eslint.config.js'] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'react-dom': reactDom,
      '@stylistic': stylistic
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...reactDom.configs.recommended.rules,
      ...TYPESCRIPT_RULES,
      ...STYLISTIC_RULES,
      ...CODE_GUIDELINES,
      'react-refresh/only-export-components': [WARN, { allowConstantExport: true }],
      'react-hooks/exhaustive-deps': WARN,
      'prefer-const': WARN,
      'prefer-arrow-callback': ERROR,
      'prefer-template': ERROR,
      'no-console': [WARN, { allow: ['warn', 'error'] }],
    },
  },
)
