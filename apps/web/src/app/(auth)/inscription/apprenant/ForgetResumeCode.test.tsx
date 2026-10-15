import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ForgetResumeCode } from "./ForgetResumeCode";

describe("ForgetResumeCode", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("efface le code de reprise de l'onglet", () => {
    sessionStorage.setItem("steamy:resumeCode", "ABCDEFGH");
    const { container } = render(<ForgetResumeCode />);
    expect(container).toBeEmptyDOMElement();
    expect(sessionStorage.getItem("steamy:resumeCode")).toBeNull();
  });

  it("ignore un stockage indisponible", () => {
    const removeItem = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("indisponible");
    });
    expect(() => render(<ForgetResumeCode />)).not.toThrow();
    expect(removeItem).toHaveBeenCalledWith("steamy:resumeCode");
  });
});
