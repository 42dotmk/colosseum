import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type EventRegistrationProps = {
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
}

export default function EventRegistration({ registrationLoading, registrationStatus, handleRegister, registrationError, isRegistering }: EventRegistrationProps) {

  const showRegisterButton = !!registrationStatus?.canRegister;

  return (
    <>
      {!registrationLoading && registrationStatus && (
        <div className="shrink-0 flex items-center gap-2">
          {registrationStatus.isRegistered ? (
            <Badge variant="secondary">Registered</Badge>
          ) : showRegisterButton ? (
            <Button size="sm" onClick={handleRegister} disabled={isRegistering}>
              {isRegistering ? 'Registering...' : 'Register'}
            </Button>
          ) : !registrationStatus.registrationOpen ? (
            <Badge variant="outline">Registration closed</Badge>
          ) : registrationStatus.registrationMode === 'invite_only' ? (
            <Badge variant="outline">
              {registrationStatus.isEligible ? 'Invite only' : 'Not invited'}
            </Badge>
          ) : null}
        </div>
      )}

      {!registrationLoading && !registrationStatus && registrationError && (
        <div className="shrink-0">
          <Badge variant="outline">Registration status unavailable</Badge>
        </div>
      )}
    </>
  )
}