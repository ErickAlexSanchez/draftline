import { failureCodes, jobStatuses } from "@draftline/domain";
import { failureCodeSchema, jobStatusSchema } from "./index";

describe("wire enums", () => {
  it("matches the domain status and failure codes", () => {
    expect([...jobStatusSchema.options]).toEqual([...jobStatuses]);
    expect([...failureCodeSchema.options]).toEqual([...failureCodes]);
  });
});
