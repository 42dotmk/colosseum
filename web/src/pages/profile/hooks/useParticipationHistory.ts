import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { REST_URL } from '@/config';
import { ParticipationRecord } from '../types/Profile';

export const useParticipationHistory = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<ParticipationRecord[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchHistory = async () => {
      setIsHistoryLoading(true);
      try {
        const token = localStorage.getItem('jwt');
        const url = `${REST_URL}/event-registrations?populate[event][fields][0]=documentId&populate[event][fields][1]=title&populate[event][fields][2]=start&populate[event][fields][3]=end&sort=registeredAt:desc`;

        const response = await fetch(url, {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        });

        if (!response.ok) {
          setHistory([]);
          return;
        }

        const data = await response.json();
        const records = Array.isArray(data) ? data : (data.data || []);
        setHistory(records);
      } catch (err) {
        console.error('Failed to load participation history:', err);
        setHistory([]);
      } finally {
        setIsHistoryLoading(false);
      }
    };

    fetchHistory();
  }, [user]);

  return { history, isHistoryLoading };
};
