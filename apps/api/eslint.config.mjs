import baseConfig from '@flavohub/config/eslint-base';

export default [
  ...baseConfig,
  {
    // NestJS emitDecoratorMetadata requires injected constructor deps to be value
    // imports. consistent-type-imports would convert them to 'import type', erasing
    // the runtime token and breaking DI with "Nest can't resolve dependencies".
    files: ['src/**/*.ts'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
];
