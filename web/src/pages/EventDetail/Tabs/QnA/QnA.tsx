import { TabsContent } from "@/components/ui/tabs"
import Answers from "./Answers"
import AskField from "./AskField"
import { EventQuestion } from "../../types";

type QnAProps = {
  eventId: string | undefined;
  isRegisteredForEvent: boolean;
  questionsLoading: boolean;
  questionsError: string | null;
  questions: EventQuestion[];
}

export default function QnA({ eventId, isRegisteredForEvent, questionsLoading, questionsError , questions }: QnAProps) {
  return (
    <TabsContent value="qa" className="mt-0">
      <div className="space-y-6">
        <AskField 
          eventId={eventId} 
          isRegisteredForEvent={isRegisteredForEvent} />
        <Answers 
          questions={questions} 
          questionsError={questionsError} 
          questionsLoading={questionsLoading} />
      </div>
    </TabsContent>
  )
}