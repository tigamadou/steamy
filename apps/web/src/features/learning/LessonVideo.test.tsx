import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const POST = vi.fn();
const getBrowserApi = vi.fn();
const player = vi.fn();
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: () => getBrowserApi() }));
vi.mock("@/components/ds/VimeoPlayer", () => ({
  VimeoPlayer: (props: { title: string; vimeoHash?: string; onProgress?: (s: number) => void }) => {
    player(props);
    return <p>{props.title}</p>;
  },
}));

const { LessonVideo, reportActivity } = await import("./LessonVideo");

describe("LessonVideo", () => {
  beforeEach(() => {
    POST.mockReset();
    player.mockReset();
    getBrowserApi.mockReset();
    getBrowserApi.mockResolvedValue({ POST });
  });

  it("mission : les secondes lues partent vers learning/activity/ en keepalive", async () => {
    render(<LessonVideo vimeoId="1" vimeoHash="abc" title="Identifier les moteurs" missionId={12} />);
    expect(screen.getByText("Identifier les moteurs")).toBeInTheDocument();
    const props = player.mock.calls[0][0];
    expect(props.vimeoHash).toBe("abc");
    props.onProgress(30);
    await vi.waitFor(() =>
      expect(POST).toHaveBeenCalledWith("/api/learning/activity/", { body: { missionId: 12, seconds: 30 }, keepalive: true }),
    );
  });

  it("intro de niveau : aucun suivi, hachage absent", () => {
    render(<LessonVideo vimeoId="1" vimeoHash={null} title="Intro" />);
    const props = player.mock.calls[0][0];
    expect(props.onProgress).toBeUndefined();
    expect(props.vimeoHash).toBeUndefined();
  });

  it("réseau coupé : l'envoi échoue sans erreur", async () => {
    getBrowserApi.mockRejectedValue(new Error("hors ligne"));
    await expect(reportActivity(12, 5)).resolves.toBeUndefined();
  });
});
