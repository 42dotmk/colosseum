import { useEffect, useState } from 'react';
import { REST_URL } from '@/config';
import { TutorialDetail } from '../types/TutorialDetail';

const useTutorialDetail = (tutorialId?:string) =>
{
    const [tutorial, setTutorial] = useState<TutorialDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
        const fetchTutorial = async () => {
            if (!tutorialId) {
                setError('Tutorial not found');
                setLoading(false);
                return;
            }

            try {
                const token = localStorage.getItem('jwt');
                const params = new URLSearchParams();
                params.append('filters[documentId][$eq]', tutorialId);
                params.append('fields[0]', 'documentId');
                params.append('fields[1]', 'title');
                params.append('fields[2]', 'summary');
                params.append('fields[3]', 'content');
                params.append('fields[4]', 'readTimeMinutes');
                params.append('fields[5]', 'thumbnailUrl');
                params.append('populate[thumbnail][fields][0]', 'url');
                params.append('populate[relatedProblem][fields][0]', 'documentId');
                params.append('populate[relatedProblem][fields][1]', 'title');

                const response = await fetch(`${REST_URL}/tutorials?${params.toString()}`, {
                headers: {
                    Authorization: token ? `Bearer ${token}` : '',
                },
                });

                if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
                }

                const payload = await response.json();
                const entries = Array.isArray(payload) ? payload : (payload.data || []);
                const first = entries[0] as TutorialDetail | undefined;

                if (!first) {
                setError('Tutorial not found');
                return;
                }

                setTutorial(first);
            } catch (err) {
                console.error('Failed to load tutorial:', err);
                setError('Failed to load tutorial');
            } finally {
                setLoading(false);
            }
        };
        fetchTutorial();
    }, [tutorialId]);
    return {tutorial, loading, error};
}
export default useTutorialDetail;
