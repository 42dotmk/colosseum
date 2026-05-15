import Language from "../../types/Language";
import BackButton from "./BackButton";
import Title from "./Title";
import ProblemLimits from "./ProblemLimits";
import LanguageSelect from "./LanguageSelect";
import SubmitButton from "./SubmitButton";
import TimeRemaining from "@/components/TimeRemaining";

type ProblemProps = {
  isTrainingMode: boolean,
  isViewMode: boolean,
  problemTitle: string,
  isInteractiveProblem: boolean,
  timeLimit: number | undefined;
  memoryLimit: number | undefined;
}

type LanguageProps = {
  currentLanguage: string,
  setCurrentLanguage: React.Dispatch<React.SetStateAction<string>>,
  languages: Language[],
}

type HeaderProps = {
  problemProps: ProblemProps,
  languageProps: LanguageProps,
  endDate: Date | undefined,
  handleSubmit: () => Promise<void>,
  isSubmitting: boolean,
}

export default function Header({problemProps,languageProps, endDate,handleSubmit,isSubmitting}: HeaderProps) {
  const {isTrainingMode, isViewMode, problemTitle, isInteractiveProblem, timeLimit, memoryLimit} = problemProps;
  const { currentLanguage, setCurrentLanguage, languages} = languageProps;
  
  return (
    <>
      <div className="flex items-center justify-between mb-3 pb-3 border-b">
        <div className="flex items-center gap-3">
          <BackButton isTrainingMode={isTrainingMode} />
          <Title problemTitle={problemTitle} isInteractiveProblem={isInteractiveProblem} />
        </div>
        <div className="flex items-center gap-2">
          {!isTrainingMode && !isViewMode && endDate && <TimeRemaining endDate={endDate} variant="compete" />}
          <ProblemLimits timeLimit={timeLimit} memoryLimit={memoryLimit} />
          <LanguageSelect currentLanguage={currentLanguage} setCurrentLanguage={setCurrentLanguage} languages={languages} />
          <SubmitButton handleSubmit={handleSubmit} isSubmitting={isSubmitting} isViewMode={isViewMode} />
        </div>
      </div>
    </>
  )
}