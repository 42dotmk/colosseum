import { Badge } from "@/components/ui/badge";
import { SupportedLanguage } from "../../types";

export default function SupportedLanguages({supportedLanguages}: { supportedLanguages: SupportedLanguage[] | undefined }) {
  return (
    <>
      {supportedLanguages && supportedLanguages.length > 0 && (
        <div className="mt-6 pt-6 border-t">
          <h3 className="text-sm font-medium mb-3">Supported Languages</h3>
          <div className="flex flex-wrap gap-2">
            {supportedLanguages.map((lang: SupportedLanguage) => (
              <Badge key={lang.documentId} variant="secondary" className="font-normal">
                {lang.name}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </>
  )
}