import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AuthLayout from "./layout";

describe("AuthLayout", () => {
  it("rend l'écran sans shell imposé", () => {
    render(AuthLayout({ children: <p>écran</p> } as LayoutProps<"/">));
    expect(screen.getByText("écran")).toBeInTheDocument();
  });
});
