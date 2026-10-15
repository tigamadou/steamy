import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const GET = vi.fn();
vi.mock("@/lib/api", () => ({ getServerApi: async () => ({ GET }) }));

const { LinkedChildren } = await import("./LinkedChildren");

const respond = (status: number, data?: object) => ({ data, response: new Response(null, { status }) });

describe("LinkedChildren (WP10)", () => {
  beforeEach(() => GET.mockReset());

  it("liste les enfants des demandes acceptées, avec et sans âge", async () => {
    GET.mockResolvedValue(
      respond(200, {
        results: [
          { id: "req-1", firstName: "Awa", age: 12 },
          { id: "req-2", firstName: "Kodjo", age: null },
        ],
      }),
    );
    const { container } = render(await LinkedChildren());
    expect(GET).toHaveBeenCalledWith("/api/accounts/consent-requests/", { params: { query: { status: "accepted" } } });
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Awa, 12 ans · inscription en cours");
    expect(items[1]).toHaveTextContent(/^Kodjo · inscription en cours$/);
    expect(await axe(container)).toHaveNoViolations();
  });

  it.each([[respond(200, { results: [] })], [respond(500)]])(
    "indique qu'aucun enfant n'est rattaché (%#)",
    async (response) => {
      GET.mockResolvedValue(response);
      render(await LinkedChildren());
      expect(screen.getByText("Aucun enfant rattaché pour le moment.")).toBeInTheDocument();
      expect(screen.queryByRole("list")).toBeNull();
    },
  );
});
