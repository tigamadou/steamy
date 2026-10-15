import { describe, expect, it } from "vitest";

import { setResumeIdentifier, takeResumeIdentifier } from "./resume-handoff";

describe("resume-handoff", () => {
  it("transmet l'identifiant une seule fois", () => {
    expect(takeResumeIdentifier()).toBeNull();
    setResumeIdentifier("lea.adjovi");
    expect(takeResumeIdentifier()).toBe("lea.adjovi");
    expect(takeResumeIdentifier()).toBeNull();
  });
});
