import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import { Quiz, type QuizAnswers, type QuizQuestion } from "./Quiz";

const QUESTIONS: QuizQuestion[] = [
  { id: 1, text: "Quel composant fait tourner les roues ?", choices: [{ id: 11, text: "Le moteur" }, { id: 12, text: "Le buzzer" }] },
  { id: 2, text: "Que mesure un capteur infrarouge ?", choices: [{ id: 21, text: "La distance" }, { id: 22, text: "Le son" }] },
];

function Harness({ onSubmit = vi.fn(), submitting = false }: { onSubmit?: () => void; submitting?: boolean }) {
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [index, setIndex] = useState(0);
  return (
    <Quiz
      questions={QUESTIONS}
      answers={answers}
      index={index}
      onAnswer={(q, c) => setAnswers((a) => ({ ...a, [q]: c }))}
      onIndexChange={setIndex}
      onSubmit={onSubmit}
      submitting={submitting}
    />
  );
}

describe("Quiz", () => {
  it("question par question, choix radio au clavier, envoi seulement à la fin", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { container } = render(<Harness onSubmit={onSubmit} />);
    expect(screen.getByText("Question 1 sur 2")).toBeInTheDocument();
    const next = screen.getByRole("button", { name: /Question suivante/ });
    expect(next).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Question précédente/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: /Le moteur/ }));
    expect(screen.getByRole("radio", { name: /Le moteur/ })).toBeChecked();
    expect(await axe(container)).toHaveNoViolations();
    await user.click(next);
    expect(screen.getByRole("group", { name: "Que mesure un capteur infrarouge ?" })).toBeInTheDocument();
    const send = screen.getByRole("button", { name: /Envoyer mes réponses/ });
    expect(send).toBeDisabled();
    await user.click(screen.getByRole("radio", { name: /La distance/ }));
    await user.click(send);
    expect(onSubmit).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: /Question précédente/ }));
    expect(screen.getByRole("radio", { name: /Le moteur/ })).toBeChecked();
  });

  it("aucune bonne réponse n'est présente dans la page", () => {
    const { container } = render(<Harness />);
    expect(container.innerHTML).not.toMatch(/correct|is-correct|bonne réponse/i);
  });

  it("pendant l'envoi : boutons verrouillés", () => {
    render(
      <Quiz
        questions={QUESTIONS}
        answers={{ 1: 11, 2: 21 }}
        index={1}
        onAnswer={vi.fn()}
        onIndexChange={vi.fn()}
        onSubmit={vi.fn()}
        submitting
      />,
    );
    expect(screen.getByRole("button", { name: /Envoyer mes réponses/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Question précédente/ })).toBeDisabled();
  });
});
