import BackToContests from "./BackToContests";
import TimeRemaining from "../../../components/TimeRemaining";
import EventMeta from "./EventMeta";
import EventRegistration from "./EventRegistration";
import Title from "./Title";

type HeaderProps = {
  registrationLoading: boolean;
  registrationStatus: {
    isRegistered: boolean;
    registrationOpen: boolean;
    registrationMode: 'open' | 'invite_only';
    isEligible: boolean;
    canRegister: boolean;
  } | null;
  handleRegister: () => Promise<void>;
  registrationError: string | null;
  isRegistering: boolean;
  startDate: Date;
  endDate: Date;
  visibleProblemsLength: number;
  isActive: boolean;
  isEnded: boolean;
  isUpcoming: boolean;
  title: string;
}

export default function EventDetailHeader({ 
  registrationLoading, 
  registrationStatus, 
  handleRegister, 
  registrationError, 
  isRegistering, 
  isActive, 
  isEnded, 
  isUpcoming,
  title,
  startDate,
  endDate,
  visibleProblemsLength }: HeaderProps) {
  
  return (
    <div className="border-b pb-6 mb-6">
      <BackToContests />

      <div className="flex items-start justify-between gap-6">
        <div className="flex-1">
          <Title
            title={title}
            isActive={isActive}
            isEnded={isEnded}
            isUpcoming={isUpcoming} />

          <EventMeta
            startDate={startDate}
            endDate={endDate}
            visibleProblemsLength={visibleProblemsLength} />
        </div>

        {isActive && <TimeRemaining endDate={endDate} variant="event-detail" />}

        <EventRegistration
          registrationLoading={registrationLoading}
          registrationError={registrationError}
          registrationStatus={registrationStatus}
          isRegistering={isRegistering}
          handleRegister={handleRegister} />
      </div>
    </div>
  )
}