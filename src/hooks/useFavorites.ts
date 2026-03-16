import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UnifiedChannel } from '../types';
import {
  getFavorites,
  addFavorite,
  removeFavorite,
} from '../data/favorites';

export function useFavorites() {
  const queryClient = useQueryClient();

  const query = useQuery<UnifiedChannel[]>({
    queryKey: ['favorites'],
    queryFn: getFavorites,
    staleTime: Infinity,
  });

  const addMutation = useMutation({
    mutationFn: addFavorite,
    onSuccess: (data) => {
      queryClient.setQueryData(['favorites'], data);
    },
  });

  const removeMutation = useMutation({
    mutationFn: removeFavorite,
    onSuccess: (data) => {
      queryClient.setQueryData(['favorites'], data);
    },
  });

  const isFavorite = (channelId: string) =>
    query.data?.some(f => f.id === channelId) ?? false;

  return {
    favorites: query.data ?? [],
    isLoading: query.isLoading,
    addFavorite: addMutation.mutate,
    removeFavorite: removeMutation.mutate,
    toggleFavorite: (channel: UnifiedChannel) => {
      if (isFavorite(channel.id)) {
        removeMutation.mutate(channel.id);
      } else {
        addMutation.mutate(channel);
      }
    },
    isFavorite,
  };
}
