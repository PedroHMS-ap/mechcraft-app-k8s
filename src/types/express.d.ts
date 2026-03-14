declare namespace Express {
  interface User {
    userId?: string;
    username?: string | null;
    roles?: string[];
    cpf?: string | null;
    customerId?: number | null;
    tokenType?: 'internal' | 'customer';
  }

  interface Request {
    requestId?: string;
  }
}

