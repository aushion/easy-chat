export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function assert(condition: unknown, statusCode: number, code: string, message: string): asserts condition {
  if (!condition) {
    throw new AppError(statusCode, code, message);
  }
}
