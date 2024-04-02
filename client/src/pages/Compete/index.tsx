import PageLayout from "../../components/PageLayout";
import EventList from "./EventList";

const CompetePage = () => {
  return (
    <PageLayout
      leftGridChildren={<EventList />}
      rightGridChildren={undefined}
    />
  );
};

export default CompetePage;
