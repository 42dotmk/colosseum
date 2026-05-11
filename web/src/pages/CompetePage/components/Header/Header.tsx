import Language from "../../types/Language";
import BackButton from "./BackButton";
import Title from "./Title";
import ProblemLimits from "./ProblemLimits";
import LanguageSelect from "./LanguageSelect";
import SubmitButton from "./SubmitButton";
import TimeRemaining from "@/components/TimeRemaining";

<<<<<<< HEAD
<<<<<<< HEAD
type ProblemProps = {
  isTrainingMode: boolean,
  isViewMode: boolean,
  problemTitle: string,
  isInteractiveProblem: boolean,
}

type LanguageProps = {
=======
type HeaderProps = {
=======
type ProblemProps = {
>>>>>>> cfe1066 (fixed some of the comments)
  isTrainingMode: boolean,
  isViewMode: boolean,
  problemTitle: string,
  isInteractiveProblem: boolean,
<<<<<<< HEAD
>>>>>>> def93e2 (Refactored to Header, Left Panel and Right Panel. Still much work to be done)
=======
}

type LanguageProps = {
>>>>>>> cfe1066 (fixed some of the comments)
  selectedLanguageObject: Language | undefined,
  currentLanguage: string,
  setCurrentLanguage: React.Dispatch<React.SetStateAction<string>>,
  languages: Language[],
<<<<<<< HEAD
<<<<<<< HEAD
}

type HeaderProps = {
  problemProps: ProblemProps,
  languageProps: LanguageProps,
  endDate: Date | undefined,
  handleSubmit: () => Promise<void>,
  isSubmitting: boolean,
}

export default function Header({problemProps,languageProps, endDate,handleSubmit,isSubmitting}: HeaderProps) {
  const {isTrainingMode, isViewMode, problemTitle, isInteractiveProblem} = problemProps;
  const {selectedLanguageObject, currentLanguage, setCurrentLanguage, languages} = languageProps;
  
=======
  handleSubmit: () => Promise<void>,
  isSubmitting: boolean,
  isViewMode: boolean
=======
>>>>>>> cfe1066 (fixed some of the comments)
}

type HeaderProps = {
  problemProps: ProblemProps,
  languageProps: LanguageProps,
  
  handleSubmit: () => Promise<void>,
  isSubmitting: boolean,
}

<<<<<<< HEAD
  console.log("interactive: ",isInteractiveProblem);
>>>>>>> def93e2 (Refactored to Header, Left Panel and Right Panel. Still much work to be done)
=======
export default function Header({problemProps,languageProps,handleSubmit,isSubmitting}: HeaderProps) {
  const {isTrainingMode, isViewMode, problemTitle, isInteractiveProblem} = problemProps;
  const {selectedLanguageObject, currentLanguage, setCurrentLanguage, languages} = languageProps;
  
>>>>>>> cfe1066 (fixed some of the comments)
  return (
    <>
      <div className="flex items-center justify-between mb-3 pb-3 border-b">
        <div className="flex items-center gap-3">
          <BackButton isTrainingMode={isTrainingMode} />
          <Title problemTitle={problemTitle} isInteractiveProblem={isInteractiveProblem} />
        </div>
        <div className="flex items-center gap-2">
          {!isTrainingMode && endDate && <TimeRemaining endDate={endDate} variant="compete" />}
          <ProblemLimits selectedLanguageObject={selectedLanguageObject} />
          <LanguageSelect currentLanguage={currentLanguage} setCurrentLanguage={setCurrentLanguage} languages={languages} />
          <SubmitButton handleSubmit={handleSubmit} isSubmitting={isSubmitting} isViewMode={isViewMode} />
        </div>
      </div>
    </>
  )
}