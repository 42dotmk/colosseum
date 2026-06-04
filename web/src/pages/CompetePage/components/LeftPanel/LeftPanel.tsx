import { Card } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import TrainingNavigation from "../ProblemNavigationButtons/TrainingNavigation";

import type { Submission } from "../../types/Submission";
import type { Execution } from "../../types/Execution";
import type { TestCase } from "../../types/TestCase";
import type { EventProblem } from "../../types/EventProblem";

import { useEffect } from "react";
import TabsListComponent from "./TabsListComponent";
import ProblemTab from "./ProblemTab";
import TestCasesTab from "./TestCasesTab";
import ProblemResultsTab from "./ProblemResultsTab";

type LeftPanelProps = {
  isViewMode: boolean;
  problemDescription: string;
  isInteractiveProblem: boolean;
  testCases: TestCase[];

  activeTab: 'description' | 'testcases' | 'results';
  setActiveTab: React.Dispatch<
    React.SetStateAction<'description' | 'testcases' | 'results'>
  >;

  submissions: Submission[];
  executionOverrides: Record<string, Execution[]>;
  isExecutionPassed: (exec: Execution) => boolean;

  isTrainingMode: boolean;
  previousProblem: EventProblem | null;
  nextProblem: EventProblem | null;
};

export default function LeftPanel({
  isViewMode,
  problemDescription,
  isInteractiveProblem,
  activeTab,
  setActiveTab,
  submissions,
  executionOverrides,
  isExecutionPassed,
  isTrainingMode,
  previousProblem,
  nextProblem,
  testCases,
}: LeftPanelProps) {

  const publicTestCases = testCases.filter((tc: TestCase) => !tc.hidden && !tc.locked);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && ['1', '2', '3'].includes(e.key)) {
        e.preventDefault();

        const tabMap: Record<string, 'description' | 'testcases' | 'results'> = {
          '1': 'description',
          '2': 'testcases',
          '3': 'results',
        };

        if (tabMap[e.key] === 'results' && isViewMode) {
          return;
        }

        setActiveTab(tabMap[e.key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isViewMode, setActiveTab]);

  return (
    <Card className="flex flex-col overflow-hidden">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'description' | 'testcases' | 'results')} className="flex flex-col h-full">
        <TabsListComponent 
          isViewMode={isViewMode} 
          submissions={submissions} />

        <div className="flex-1 overflow-auto p-4">
          <ProblemTab 
            problemDescription={problemDescription} 
            testCasesLength={testCases.length} 
            publicTestCasesLength={publicTestCases.length} />

          <TestCasesTab publicTestCases={publicTestCases} />

          {!isViewMode && 
          <ProblemResultsTab 
            submissions={submissions} 
            executionOverrides={executionOverrides} 
            isExecutionPassed={isExecutionPassed} 
            isInteractiveProblem={isInteractiveProblem} />}
        </div>
      </Tabs>

      {isTrainingMode && 
        <TrainingNavigation
          previousProblem={previousProblem}
          nextProblem={nextProblem}
        />
      }
    </Card>
  );
}