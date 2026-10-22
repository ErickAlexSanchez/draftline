import { mapError } from "./http-error";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "@draftline/domain";
import { z } from "zod";

describe("mapError", () => {
  it("translates domain errors at the HTTP edge", () => {
    expect(mapError(new UnauthorizedError()).status).toBe(401);
    expect(mapError(new ForbiddenError()).status).toBe(403);
    expect(mapError(new NotFoundError()).status).toBe(404);
    const parsed = z.object({ title: z.string() }).safeParse({});
    if (parsed.success) throw new Error("expected a validation error");
    expect(mapError(parsed.error)).toMatchObject({ status: 400, code: "invalid_request" });
    expect(mapError(new Error("database down")).status).toBe(500);
  });
});
