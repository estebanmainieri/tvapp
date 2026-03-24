import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
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

  // O(1) lookup Set instead of O(n) array scan
  const favoriteIds = useMemo(() => {
    return new Set((query.data ?? []).map(f => f.id));
  }, [query.data]);

  const isFavorite = useCallback(
    (channelId: string) => favoriteIds.has(channelId),
    [favoriteIds],
  );

  const toggleFavorite = useCallback(
    (channel: UnifiedChannel) => {
      if (favoriteIds.has(channel.id)) {
        removeMutation.mutate(channel.id);
      } else {
        addMutation.mutate(channel);
      }
    },
    [favoriteIds, addMutation, removeMutation],
  );

  return {
    favorites: query.data ?? [],
    favoriteIds,
    isLoading: query.isLoading,
    addFavorite: addMutation.mutate,
    removeFavorite: removeMutation.mutate,
    toggleFavorite,
    isFavorite,
  };
}
