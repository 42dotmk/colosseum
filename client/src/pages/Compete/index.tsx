import PageLayout from "../../components/PageLayout";
import CompeteTabs from "./CompeteTabs";

const CompetePage = () => {
  return (
    <PageLayout
      leftGridChildren={<CompeteTabs />}
      rightGridChildren={undefined}
    />
  );
};

export default CompetePage;
