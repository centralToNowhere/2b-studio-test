import { supabase } from './client';
import type { Database } from './database.types';
import type { TaskStateDTO } from './dto';
export const pageSize = 20;
export type TaskFilters = {
  objectId?: string;
  assignee?: string;
  status?: TaskStateDTO;
  from?: string;
  to?: string;
  page: number;
};

export async function getObjects(page: number) {
  const { data, error, count } = await supabase
    .from('Object')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .order('id')
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (error) {
    throw error;
  }

  return { rows: data, count: count ?? 0 };
}

export async function getObject(id: string) {
  const { data, error } = await supabase
    .from('Object')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function getTask(id: string) {
  const { data, error } = await supabase
    .from('Task')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function getTasks(f: TaskFilters) {
  let q = supabase
    .from('Task')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .order('id');

  if (f.objectId) {
    q = q.eq('object_id', f.objectId);
  }

  if (f.assignee) {
    q = q.eq('assignee_id', f.assignee);
  }

  if (f.status) {
    q = q.eq('status', f.status);
  }

  if (f.from) {
    q = q.gte('created_at', `${f.from}T00:00:00+03:00`);
  }

  if (f.to) {
    q = q.lt(
      'created_at',
      new Date(
        new Date(`${f.to}T00:00:00+03:00`).getTime() + 86400000,
      ).toISOString(),
    );
  }

  const { data, error, count } = await q.range(
    (f.page - 1) * pageSize,
    f.page * pageSize - 1,
  );

  if (error) {
    throw error;
  }

  return { rows: data, count: count ?? 0 };
}

export async function getProfiles() {
  const rows = [];
  let page = 0;

  for (;;) {
    const { data, error } = await supabase
      .from('Profile')
      .select('*')
      .order('name')
      .order('id')
      .range(page * 500, page * 500 + 499);

    if (error) {
      throw error;
    }

    rows.push(...data);

    if (data.length < 500) {
      return rows;
    }

    page++;
  }
}

export async function getHistory(id: string, page: number) {
  const { data, error, count } = await supabase
    .from('TaskStatus')
    .select('*, TaskStatusComment(*)', { count: 'exact' })
    .eq('task_id', id)
    .order('sequence', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (error) {
    throw error;
  }

  return { rows: data, count: count ?? 0 };
}

type Functions = Database['public']['Functions'];

export async function rpc<K extends keyof Functions>(
  name: K,
  args: Omit<Functions[K]['Args'], 'p_id'> &
    (Functions[K]['Args'] extends { p_id: string }
      ? { p_id: string | null }
      : object),
) {
  const { data, error } = await supabase.rpc(
    name,
    args as Functions[K]['Args'],
  );

  if (error) {
    throw error;
  }

  return data;
}
