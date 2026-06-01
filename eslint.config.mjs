import baseConfig from '@flavohub/config/eslint-base';

export default [
  ...baseConfig,
  {
    // NestJS emitDecoratorMetadata requires injected constructor deps to be value
    // imports. consistent-type-imports would erase the runtime token and break DI.
    files: ['apps/api/src/**/*.ts'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
];
