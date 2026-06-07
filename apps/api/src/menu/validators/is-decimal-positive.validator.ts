import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

export function IsDecimalPositive(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isDecimalPositive',
      target: (object as { constructor: new (...args: unknown[]) => unknown }).constructor,
      propertyName,
      options: validationOptions ?? {
        message: `${propertyName} must be a positive decimal number`,
      },
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          if (typeof value !== 'string') return false;
          if (!/^\d+(\.\d{1,2})?$/.test(value)) return false;
          return parseFloat(value) > 0;
        },
      },
    });
  };
}
