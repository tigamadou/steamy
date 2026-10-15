import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const router = { replace: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const { useParentChallenge } = await import("./useParentChallenge");

const CHALLENGE = { challengeId: "ch-1", destinationMasked: "+229 01 •• •• •• 56", expiresInSec: 600, resendInSec: 30 };
const KEY = "steamy:parentChallenge";

describe("useParentChallenge", () => {
  beforeEach(() => {
    router.replace.mockReset();
    sessionStorage.clear();
  });

  it("lit le défi rangé dans l'onglet et garde la même référence", () => {
    sessionStorage.setItem(KEY, JSON.stringify(CHALLENGE));
    const { result, rerender } = renderHook(() => useParentChallenge());
    const first = result.current[0];
    expect(first).toEqual(CHALLENGE);
    rerender();
    expect(result.current[0]).toBe(first);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("renvoie à WP01 sans défi", () => {
    const { result } = renderHook(() => useParentChallenge());
    expect(result.current[0]).toBeNull();
    expect(router.replace).toHaveBeenCalledWith("/inscription/parent");
  });

  it("vaut undefined pendant le rendu serveur", () => {
    function Probe() {
      const [challenge] = useParentChallenge();
      return <p>{challenge === undefined ? "serveur" : "client"}</p>;
    }
    expect(renderToString(<Probe />)).toContain("serveur");
  });

  it("réécrit le stockage avec le défi renouvelé", () => {
    sessionStorage.setItem(KEY, JSON.stringify(CHALLENGE));
    const { result } = renderHook(() => useParentChallenge());
    const next = { ...CHALLENGE, resendInSec: 60 };
    act(() => result.current[1](next));
    expect(result.current[0]).toEqual(next);
    expect(JSON.parse(sessionStorage.getItem(KEY)!)).toEqual(next);
  });
});
