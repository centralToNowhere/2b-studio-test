import { useEffect, useRef, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router';
import { supabase } from '@/shared/api/client';
import { Loading, Empty, Button } from '@/shared/ui';
import { UserContext } from './user-context';
import { useSession, useLogout } from './session-hooks';

export function SessionEvents({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const previous = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user.id ?? null;

      if (previous.current !== undefined && previous.current !== next) {
        client.removeQueries({ predicate: (q) => q.queryKey[0] !== 'session' });
      }

      previous.current = next;
      client.setQueryData(['session'], session);
    });

    return () => data.subscription.unsubscribe();
  }, [client]);

  return children;
}

export function Protected({ children }: { children: ReactNode }) {
  const session = useSession();
  const logout = useLogout();

  const profile = useQuery({
    queryKey: ['profile', session.data?.user.id],
    enabled: !!session.data,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('Profile')
        .select('*')
        .eq('id', session.data!.user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data;
    },
  });

  if (session.isPending) {
    return <Loading />;
  }

  if (session.isError) {
    return (
      <Empty
        title="Не удалось проверить сессию"
        action={<Button onClick={() => session.refetch()}>Повторить</Button>}
      />
    );
  }

  if (!session.data) {
    return <Navigate to="/login" replace />;
  }

  if (profile.isPending) {
    return <Loading />;
  }

  if (profile.isError) {
    return (
      <Empty
        title="Не удалось загрузить профиль"
        action={<Button onClick={() => profile.refetch()}>Повторить</Button>}
      />
    );
  }

  if (!profile.data) {
    return (
      <Empty
        title="Профиль ещё не настроен"
        description="Обратитесь к администратору для назначения роли."
        action={<Button onClick={() => logout.mutate()}>Выйти</Button>}
      />
    );
  }

  return <UserContext value={profile.data}>{children}</UserContext>;
}
