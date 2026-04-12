import Language from "../../types/Language";
import BackButton from "./BackButton";
import Title from "./Title";
import ProblemLimits from "./ProblemLimits";
import LanguageSelect from "./LanguageSelect";
import SubmitButton from "./SubmitButton";

type HeaderProps = {
  isTrainingMode: boolean,
  problemTitle: string,
  isInteractiveProblem: boolean,
  selectedLanguageObject: Language | undefined,
  currentLanguage: string,
  setCurrentLanguage: React.Dispatch<React.SetStateAction<string>>,
  languages: Language[],
  handleSubmit: () => Promise<void>,
  isSubmitting: boolean,
  isViewMode: boolean
}

export default function Header({isTrainingMode,problemTitle,isInteractiveProblem,selectedLanguageObject,currentLanguage,setCurrentLanguage,languages,handleSubmit,isSubmitting,isViewMode}: HeaderProps) {

  console.log("interactive: ",isInteractiveProblem);
  return (
    <>
      <div className="flex items-center justify-between mb-3 pb-3 border-b">
        <div className="flex items-center gap-3">
          <BackButton isTrainingMode={isTrainingMode} />
          <Title problemTitle={problemTitle} isInteractiveProblem={isInteractiveProblem} />
        </div>
        <div className="flex items-center gap-2">
          <ProblemLimits selectedLanguageObject={selectedLanguageObject} />
          <LanguageSelect currentLanguage={currentLanguage} setCurrentLanguage={setCurrentLanguage} languages={languages} />
          <SubmitButton handleSubmit={handleSubmit} isSubmitting={isSubmitting} isViewMode={isViewMode} />
        </div>
      </div>
    </>
  )
}