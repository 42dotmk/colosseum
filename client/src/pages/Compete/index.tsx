import PageLayout from "../../components/PageLayout";
import CompeteTabs from "./CompeteTabs";
import InfoTabs from './InfoTabs';

const CompetePage = () => {
  return (
      <PageLayout
        leftGridChildren={<CompeteTabs />}
        rightGridChildren={<InfoTabs />}
      />
  );
};

export default CompetePage;
