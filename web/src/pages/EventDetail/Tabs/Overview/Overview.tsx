import { TabsContent } from "@/components/ui/tabs";
import OverviewDescription from "./OverviewDescription";
import SupportedLanguages from "./SupportedLanguages";
import { SupportedLanguage } from "../../types";

type OverviewProps = {
  description: string | undefined;
  supportedLanguages: SupportedLanguage[] | undefined;
}

export default function Overview({description, supportedLanguages}: OverviewProps) {
  return (
    <TabsContent value="overview" className="mt-0">
      <div className="border rounded-lg p-6">
        <OverviewDescription description={description} />
        <SupportedLanguages supportedLanguages={supportedLanguages} />
      </div>
    </TabsContent>
  )
}