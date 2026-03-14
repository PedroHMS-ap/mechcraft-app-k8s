import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsSafeUrl(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'IsSafeUrl',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return false;
          try {
            const url = new URL(value);
            if (!['http:', 'https:'].includes(url.protocol)) return false;
            if (url.username || url.password) return false; // sem credenciais embutidas
            return true;
          } catch {
            return false;
          }
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} deve ser uma URL segura (http/https, sem credenciais)`;
        },
      },
    });
  };
}
