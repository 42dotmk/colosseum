import { EventQuestion } from "../../types";

type AnswersProps = {
  questionsLoading: boolean;
  questionsError: string | null;
  questions: EventQuestion[];
}

export default function Answers({ questionsLoading, questionsError, questions }: AnswersProps) {
  return (
    <div className="border rounded-lg p-4">
      {questionsLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
        </div>
      ) : questionsError ? (
        <p className="text-sm text-destructive">{questionsError}</p>
      ) : questions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No answered questions yet.</p>
      ) : (
        <div className="space-y-4">
          {questions.map((item) => (
            <div key={item.documentId} className="rounded-md border p-4 space-y-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Question</p>
                <p className="text-sm">{item.question}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Answer</p>
                <p className="text-sm">{item.answer}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Answered by {item.answeredBy?.displayName || 'organizer'}
                  {item.answeredAt ? ` • ${new Date(item.answeredAt).toLocaleString()}` : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}