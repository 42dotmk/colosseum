import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { REST_URL } from '@/config';
import { useToast } from '@/components/ui/use-toast';
import { Event,RegistrationStatus } from './types';
import EventDetailHeader from './Header/Header';
import EventDetailTabs from './Tabs/EventDetailTabs';

export default function EventDetailPage() {
  const { eventId } = useParams();
  const { toast } = useToast();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isRegistering, setIsRegistering] = useState(false);
  
  const [registrationStatus, setRegistrationStatus] = useState<RegistrationStatus | null>(null);
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const token = localStorage.getItem('jwt');
        const response = await fetch(`${REST_URL}/events/${eventId}?populate=*`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const eventData = data.data || data;
        setEvent(eventData);
      } catch (err) {
        console.error('Failed to load event:', err);
        setError('Failed to load event');
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [eventId]);

  useEffect(() => {
    if (!eventId) {
      return;
    }

    const fetchRegistrationStatus = async () => {
      setRegistrationLoading(true);
      setRegistrationError(null);

      try {
        const token = localStorage.getItem('jwt');
        const response = await fetch(`${REST_URL}/events/${eventId}/registration-status`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setRegistrationStatus(data);
      } catch (err) {
        console.error('Failed to load registration status:', err);
        setRegistrationError('Could not load registration status');
      } finally {
        setRegistrationLoading(false);
      }
    };

    fetchRegistrationStatus();
  }, [eventId]);

  const handleRegister = async () => {
    if (!eventId || !registrationStatus?.canRegister) {
      return;
    }

    setIsRegistering(true);

    try {
      const token = localStorage.getItem('jwt');
      const response = await fetch(`${REST_URL}/events/${eventId}/register`, {
        method: 'POST',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setRegistrationStatus((prev) =>
        prev
          ? {
            ...prev,
            isRegistered: true,
            canRegister: false,
          }
          : prev,
      );

      toast({
        title: 'Registered',
        description: 'You are now registered for this event.',
      });
    } catch (err) {
      console.error('Failed to register for event:', err);
      toast({
        title: 'Registration failed',
        description: 'Could not register for this event. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="text-center py-20">
        <p className="text-destructive">Failed to load event.</p>
      </div>
    );
  }

  const startDate = new Date(event.start);
  const endDate = new Date(event.end);
  const now = new Date();
  const isActive = now >= startDate && now <= endDate;
  const isUpcoming = startDate > now;
  const isEnded = endDate < now;
  const problems = event.problems || [];
  const visibleProblems = isUpcoming ? [] : problems;
  const isViewOnlyEvent = isEnded;
  const isRegisteredForEvent = registrationStatus?.isRegistered ?? false;

  return (
    <div className="max-w-5xl mx-auto">
      <EventDetailHeader 
        registrationLoading={registrationLoading}
        registrationError={registrationError}
        registrationStatus={registrationStatus}
        handleRegister={handleRegister}
        isRegistering={isRegistering}
        startDate={startDate}
        endDate={endDate}
        visibleProblemsLength={visibleProblems.length}
        isActive={isActive}
        isEnded={isEnded}
        isUpcoming={isUpcoming}
        title={event.title} />
      
      <EventDetailTabs 
        eventId={eventId}
        isRegisteredForEvent={isRegisteredForEvent}
        supportedLanguages={event.supportedLanguages} 
        description={event.description}
        visibleProblems={visibleProblems}
        isViewOnlyEvent={isViewOnlyEvent}
        isUpcoming={isUpcoming}
        isEnded={isEnded} />
    </div>
  );
}
