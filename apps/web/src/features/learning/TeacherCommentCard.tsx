import { formatInstant } from "@/lib/dates";

export type TeacherComment = { id: number; author: string; message: string; createdAt: string };

/**
 * « Mot de ton enseignant » (WC06, D63) : commentaires à sens unique. L'endpoint `classrooms/comments/` arrive avec
 * API-L5 ; d'ici là la carte n'est pas rendue (aucun commentaire, pas d'erreur).
 */
export function TeacherCommentCard({ comments }: { comments: TeacherComment[] }) {
  if (comments.length === 0) return null;
  return (
    <section aria-labelledby="mot-enseignant" className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
      <h3 id="mot-enseignant" className="m-0 mb-2 text-[15px] font-black text-ink-900">
        <span aria-hidden>💬 </span>Mot de ton enseignant
      </h3>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {comments.map((comment) => (
          <li key={comment.id} className="text-sm font-semibold text-ink-800">
            <p className="m-0 leading-normal">{comment.message}</p>
            <p className="m-0 mt-1 text-xs font-bold text-ink-600">
              {comment.author} · {formatInstant(comment.createdAt)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
