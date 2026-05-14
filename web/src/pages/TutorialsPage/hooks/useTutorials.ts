import { useEffect, useState } from "react";
import type { TutorialListItem } from "../types/TutorialListItem";
import { REST_URL } from "@/config";

export default function useTutorials() {
  const [tutorials, setTutorials] = useState<TutorialListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTutorials = async () => {
      try {
        const token = localStorage.getItem('jwt');
        const params = new URLSearchParams();
        params.append('fields[0]', 'documentId');
        params.append('fields[1]', 'title');
        params.append('fields[2]', 'summary');
        params.append('fields[3]', 'readTimeMinutes');
        params.append('fields[4]', 'thumbnailUrl');
        params.append('populate[thumbnail][fields][0]', 'url');
        params.append('populate[relatedProblem][fields][0]', 'documentId');
        params.append('populate[relatedProblem][fields][1]', 'title');
        params.append('sort', 'publishedAt:desc');

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
        setTutorials(entries);
      } catch (err) {
        console.error('Failed to load tutorials:', err);
        setError('Failed to load tutorials');
      } finally {
        setLoading(false);
      }
    };

    fetchTutorials();
  }, []);

  return [tutorials, loading, error] as const;
}