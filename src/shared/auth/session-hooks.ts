import { useContext } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/shared/api/client';
import { UserContext } from './user-context';

export function useUser() {
  const user = useContext(UserContext);

  if (!user) {
    throw new Error('Session provider missing');
  }

  return user;
}

export function useSession() {
  return useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        throw error;
      }

      return data.session;
    },
    staleTime: Infinity,
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }
    },
  });
}
