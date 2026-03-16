import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UnifiedChannel } from '../types';
import {
  getRecentlyWatched,
  addRecentlyWatched,
} from '../data/recentlyWatched';

export function useRecentlyWatched() {
  const queryClient = useQueryClient();

  const query = useQuery<UnifiedChannel[]>({
    queryKey: ['recentlyWatched'],
    queryFn: getRecentlyWatched,
    staleTime: Infinity,
  });

  const addRecent = async (channel: UnifiedChannel) => {
    await addRecentlyWatched(channel);
    queryClient.invalidateQueries({ queryKey: ['recentlyWatched'] });
  };

  return {
    recentlyWatched: query.data ?? [],
    isLoading: query.isLoading,
    addRecent,
  };
}
