import { Prisma } from '@prisma/client';
import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

export function IsNonNegativeDecimalString(validationOptions?: ValidationOptions) {
  return function (object: unknown, propertyName: string) {
    registerDecorator({
      name: 'isNonNegativeDecimalString',
      target: (object as any).constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return false;
          if (!/^\d+(\.\d+)?$/.test(value.trim())) return false;
          const decimal = new Prisma.Decimal(value);
          return decimal.greaterThanOrEqualTo(0);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} deve ser um decimal maior ou igual a zero`;
        },
      },
    });
  };
}
