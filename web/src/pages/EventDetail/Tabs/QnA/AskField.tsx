import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { REST_URL } from "@/config";
import { useState } from "react";

type AskFieldProps = {
  eventId: string | undefined;
  isRegisteredForEvent: boolean;
}

export default function AskField({ eventId, isRegisteredForEvent }: AskFieldProps) {
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false);
  const [questionDraft, setQuestionDraft] = useState('');

  

  const handleAskQuestion = async () => {
    if (!eventId || !questionDraft.trim()) {
      return;
    }

    setIsSubmittingQuestion(true);

    try {
      const token = localStorage.getItem('jwt');
      const response = await fetch(`${REST_URL}/events/${eventId}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          data: {
            question: questionDraft.trim(),
          },
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error?.message || 'Failed to submit question');
      }

      setQuestionDraft('');
      toast({
        title: 'Question submitted',
        description: 'Your question was sent to organizers and will appear once answered.',
      });
    } catch (err) {
      toast({
        title: 'Failed to submit question',
        description: err instanceof Error ? err.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingQuestion(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <h3 className="text-sm font-medium">Ask organizers a question</h3>
      <textarea
        className="w-full min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={questionDraft}
        onChange={(e) => setQuestionDraft(e.target.value)}
        placeholder="Write your question here..."
        maxLength={2000}
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Only answered questions are shown publicly in this tab.
        </p>
        <Button
          onClick={handleAskQuestion}
          disabled={isSubmittingQuestion || !questionDraft.trim() || !isRegisteredForEvent}
        >
          {isSubmittingQuestion ? 'Submitting...' : 'Submit question'}
        </Button>
      </div>
    </div>
  )
}