import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { AttemptStatusBadge, attemptStatusLabel } from "../AttemptStatusBadge";
import { QuizAttemptRow } from "./QuizAttemptRow";

describe("QuizAttemptRow", () => {
  it("lien vers le détail, statut du serveur et score", async () => {
    const { container } = render(
      <QuizAttemptRow href="/apprenant/quiz/9" title="Quiz servo" subtitle="Quiz du niveau · 14 oct. 2026" status="warn" score={1} total={2} />,
    );
    const link = screen.getByRole("link", { name: /Quiz servo/ });
    expect(link).toHaveAttribute("href", "/apprenant/quiz/9");
    expect(link).toHaveTextContent("À refaire");
    expect(link).toHaveTextContent("1/2 bonnes réponses");
    expect(screen.getByText("🎯")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("sans `href` : ligne en lecture seule, sans lien", () => {
    render(<QuizAttemptRow title="Quiz servo" subtitle="Quiz du niveau" status="ok" score={2} total={2} emoji="📝" />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Quiz servo").closest("div")).toHaveTextContent("Réussi2/2 bonnes réponses");
  });

  it("statuts D31 affichés tels quels", () => {
    render(
      <>
        <AttemptStatusBadge status="ok" />
        <AttemptStatusBadge status="ko" />
      </>,
    );
    expect(screen.getByText("Réussi")).toBeInTheDocument();
    expect(screen.getByText("Échoué")).toBeInTheDocument();
    expect(attemptStatusLabel("warn")).toBe("À refaire");
  });
});
