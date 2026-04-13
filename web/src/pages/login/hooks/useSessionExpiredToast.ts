import { useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';

export const useSessionExpiredToast = () => {
  const { toast } = useToast();

  useEffect(() => {
    if (sessionStorage.getItem('auth:sessionExpired') !== '1') {
        return;
    }
    sessionStorage.removeItem('auth:sessionExpired');
    toast({
        title: 'Session expired',
        description: 'Please sign in again to continue the contest.',
        variant: 'destructive',
    });
  }, [toast]);
};