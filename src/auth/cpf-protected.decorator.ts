import { SetMetadata } from '@nestjs/common';

export const CPF_PROTECTED_KEY = 'cpf_protected';

export const CpfProtected = () => SetMetadata(CPF_PROTECTED_KEY, true);

