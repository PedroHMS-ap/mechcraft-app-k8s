import { registerDecorator, ValidationOptions } from 'class-validator';
import { cpf, cnpj } from 'cpf-cnpj-validator';

/**
 * Valida CPF OU CNPJ. Aceita valores com máscara (pontos/traços/barras).
 */
export function IsCpfCnpj(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'IsCpfCnpj',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return false;
          const digits = value.replace(/\D/g, '');
          if (digits.length <= 11) return cpf.isValid(digits);  // CPF
          return cnpj.isValid(digits);                         // CNPJ
        },
        defaultMessage() {
          return 'Documento inválido (informe um CPF ou CNPJ válido)';
        },
      },
    });
  };
}
