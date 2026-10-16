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
