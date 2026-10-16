import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { observed, triggerResize } from "@/test/resize";

import { ScrollRegion } from "./ScrollRegion";

function setWidths(scroll: number, client: number) {
  vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(scroll);
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(client);
}

describe("ScrollRegion", () => {
  afterEach(() => vi.restoreAllMocks());

  it("reste une simple boîte tant que le contenu tient", () => {
    setWidths(300, 300);
    render(
      <>
        <span id="titre">Historique</span>
        <ScrollRegion labelledBy="titre">contenu</ScrollRegion>
      </>,
    );
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    expect(screen.getByText("contenu")).not.toHaveAttribute("tabindex");
  });

  it("devient une région focalisable et nommée quand le contenu déborde, puis cesse de l'être", () => {
    setWidths(600, 300);
    const { unmount } = render(
      <>
        <span id="titre">Historique</span>
        <ScrollRegion labelledBy="titre">contenu</ScrollRegion>
      </>,
    );
    const region = screen.getByRole("region", { name: "Historique" });
    expect(region).toHaveAttribute("tabindex", "0");

    setWidths(300, 300);
    act(() => triggerResize());
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    unmount();
  });

  it("observe le contenu, et le nouveau quand il est remplacé", async () => {
    setWidths(300, 300);
    const { rerender, unmount } = render(
      <ScrollRegion labelledBy="titre">
        <table key="a" data-testid="a" />
      </ScrollRegion>,
    );
    const first = screen.getByTestId("a");
    expect(observed.has(first)).toBe(true);
    rerender(
      <ScrollRegion labelledBy="titre">
        <table key="b" data-testid="b" />
      </ScrollRegion>,
    );
    await waitFor(() => expect(observed.has(screen.getByTestId("b"))).toBe(true));
    expect(observed.has(first)).toBe(false);
    unmount();
    expect(observed.size).toBe(0);
  });
});
