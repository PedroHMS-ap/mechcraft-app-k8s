import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsPlate(validationOptions?: ValidationOptions) {
  const mercosul = /^[A-Z]{3}\d[A-Z]\d{2}$/i; // AAA0A00
  const antiga = /^[A-Z]{3}-?\d{4}$/i;        // AAA-0000
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'IsPlate',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: string) {
          if (!value) return false;
          const v = value.toUpperCase();
          return mercosul.test(v) || antiga.test(v);
        },
        defaultMessage: () => 'Placa inválida',
      },
    });
  };
}
