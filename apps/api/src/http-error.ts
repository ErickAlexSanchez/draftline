import { ZodError } from "zod";
import { DomainError, ForbiddenError, NotFoundError, UnauthorizedError } from "@draftline/domain";

export class BadRequest extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "BadRequest";
    this.status = status;
    this.code = code;
  }
}

export function mapError(error: unknown): { status: number; code: string; message: string } {
  if (error instanceof BadRequest) {
    return { status: error.status, code: error.code, message: error.message };
  }
  if (error instanceof ZodError || (error instanceof Error && error.name === "ZodError")) {
    return { status: 400, code: "invalid_request", message: "Check the submitted fields." };
  }
  if (error instanceof UnauthorizedError) return { status: 401, code: error.code, message: error.message };
  if (error instanceof ForbiddenError) return { status: 403, code: error.code, message: error.message };
  if (error instanceof NotFoundError) return { status: 404, code: error.code, message: error.message };
  if (error instanceof DomainError) return { status: 400, code: error.code, message: error.message };
  return { status: 500, code: "internal", message: "Something went wrong." };
}
