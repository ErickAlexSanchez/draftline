import { ForbiddenError } from "../errors";
import { assertEditor } from "./authorize";

describe("assertEditor", () => {
  it("allows an editor to enqueue", () => {
    expect(() => assertEditor("editor")).not.toThrow();
  });

  it("refuses a viewer", () => {
    expect(() => assertEditor("viewer")).toThrow(ForbiddenError);
  });
});
