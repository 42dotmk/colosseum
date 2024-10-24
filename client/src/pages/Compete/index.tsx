import PageLayout from "../../components/PageLayout";
import CompeteTabs from "./CompeteTabs";
import EventList from "./EventList";

const CompetePage = () => {
  return (
    <PageLayout
      leftGridChildren={
        <>
          <CompeteTabs />
          <EventList />
        </>
      }
      rightGridChildren={undefined}
    />
  );
};

export default CompetePage;
