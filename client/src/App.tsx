import { useGetAllEvents } from "./data/useGetAllEvents";

function App() {
  const { events } = useGetAllEvents();
  const myEvent = events?.[0];
  return (
    <>
      <h1>{myEvent?.title}</h1>
      <h2>{myEvent?.description}</h2>
      <h3>{myEvent?.startDate.toDateString()}</h3>
      <h4>{`${myEvent?.startDate.getHours()}:${myEvent?.startDate.getMinutes()}`}</h4>
      <h3>{myEvent?.endDate.toDateString()}</h3>
      <h4>{`${myEvent?.endDate.getHours()}:${myEvent?.endDate.getMinutes()}`}</h4>
      {myEvent?.supportedLanguages.map((lang) => <h5 key={lang}>{lang}</h5>)}
      {myEvent?.id}
    </>
  );
}

export default App;
