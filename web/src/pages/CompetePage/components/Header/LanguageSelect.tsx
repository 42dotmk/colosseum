import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Language from "../../types/Language";

type LanguageSelectProps = {
  currentLanguage: string,
  setCurrentLanguage: React.Dispatch<React.SetStateAction<string>>,
  languages: Language[]
}

export default function LanguageSelect({currentLanguage,setCurrentLanguage,languages}: LanguageSelectProps) {
  return (
    <>
      <Select value={currentLanguage} onValueChange={setCurrentLanguage}>
        <SelectTrigger className="w-[160px] h-9">
          <SelectValue placeholder="Select language" />
        </SelectTrigger>
        <SelectContent>
          {languages.map((lang: Language) => (
            <SelectItem key={lang.documentId} value={lang.documentId}>
              {lang.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  )
}