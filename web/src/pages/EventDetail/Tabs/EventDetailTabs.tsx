import { Tabs } from "@/components/ui/tabs";
import TabsListComponent from "./TabsListComponent";
import ProblemsTab from "./ProblemsTab/ProblemsTab";
import Overview from "./Overview/Overview";
import QnA from "./QnA/QnA";
import Leaderboard from "./Leaderboard/Leaderboard";
import { useEffect, useState } from "react";
import { REST_URL } from "@/config";
import { EventQuestion, Problem, SupportedLanguage } from "../types";

type EventDetailTabsProps = {
  eventId: string | undefined;
  isRegisteredForEvent: boolean;
  isViewOnlyEvent: boolean;
  supportedLanguages: SupportedLanguage[] | undefined;
  description: string | undefined;
  visibleProblems: Problem[];
  isEnded: boolean;
  isUpcoming: boolean;
}

export default function EventDetailTabs({ 
  eventId, 
  isRegisteredForEvent, 
  isViewOnlyEvent, 
  supportedLanguages, 
  description, 
  visibleProblems,
  isEnded,
  isUpcoming }: EventDetailTabsProps) {
  const [activeTab, setActiveTab] = useState('problems');
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<EventQuestion[]>([]);


  useEffect(() => {
    if (!eventId) {
      return;
    }

    const fetchQuestions = async () => {
      setQuestionsLoading(true);
      setQuestionsError(null);

      try {
        const token = localStorage.getItem('jwt');
        const response = await fetch(`${REST_URL}/events/${eventId}/questions`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setQuestions(Array.isArray(data?.data) ? data.data : []);
      } catch (err) {
        console.error('Failed to load event questions:', err);
        setQuestionsError('Failed to load Q&A');
      } finally {
        setQuestionsLoading(false);
      }
    };

    fetchQuestions();
  }, [eventId]);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsListComponent questionsLength={questions.length} />
      <ProblemsTab 
        visibleProblems={visibleProblems}
        isRegisteredForEvent={isRegisteredForEvent}
        isViewOnlyEvent={isViewOnlyEvent}
        isEnded={isEnded}
        eventId={eventId}
        isUpcoming={isUpcoming} />
      <Overview supportedLanguages={supportedLanguages} description={description} />
      <QnA 
        eventId={eventId} 
        isRegisteredForEvent={isRegisteredForEvent} 
        questionsLoading={questionsLoading} 
        questionsError={questionsError} 
        questions={questions} />
      <Leaderboard 
        activeTab={activeTab} 
        eventId={eventId} />
    </Tabs>
  )
}