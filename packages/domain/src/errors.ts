export class DomainError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = new.target.name;
    this.code = code;
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = "You do not have permission to enqueue drafts.") {
    super("forbidden", message);
  }
}

export class UnauthorizedError extends DomainError {
  constructor() {
    super("unauthorized", "Sign in required.");
  }
}

export class NotFoundError extends DomainError {
  constructor() {
    super("not_found", "Not found.");
  }
}
