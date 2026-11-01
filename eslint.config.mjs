// Code style for the skill's scripts and kit: Prettier formats, ESLint adds what Prettier
// won't (braces on every if/else/for/while). `npm run format` fixes both, `npm run lint` checks.
import prettier from 'eslint-config-prettier'
import tseslint from 'typescript-eslint'
import vueParser from 'vue-eslint-parser'

// eslint-config-prettier switches curly off, so it goes first and curly comes back after it
// ("all" is safe alongside Prettier; only "multi-line" and "multi-or-nest" clash).
const rules = { curly: ['error', 'all'] }

export default [
  { ignores: ['dist/', '.slidev/', 'slides-export/'] },
  prettier,
  { files: ['**/*.mjs', '**/*.js'], rules },
  { files: ['**/*.ts'], languageOptions: { parser: tseslint.parser }, rules },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: { parser: tseslint.parser, sourceType: 'module' },
    },
    rules,
  },
]
