import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { expect, type Page } from '@playwright/test';
export const env = JSON.parse(readFileSync('.test-env.json', 'utf8')) as {
  url: string;
  key: string;
  adminKey: string;
  users: {
    id: string;
    email: string;
    password: string;
    role: string;
    token: string;
  }[];
};

if (!['127.0.0.1', 'localhost'].includes(new URL(env.url).hostname)) {
  throw new Error('Tests are local only');
}

export const suppliers = env.users.filter((u) => u.role === 'supplier');
export const assignees = env.users.filter((u) => u.role === 'assignee');
export const admin = createClient(env.url, env.adminKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
export const clientFor = (user: (typeof env.users)[number]) =>
  createClient(env.url, env.key, {
    global: { headers: { Authorization: `Bearer ${user.token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
export const supplier = clientFor(suppliers[0]);
export const assignee = clientFor(assignees[0]);

export async function createObject() {
  const { data, error } = await supplier.rpc('save_object', {
    p_id: null,
    p_name: `Объект ${crypto.randomUUID().slice(0, 8)}`,
    p_address: 'Москва, Строительная улица, 12',
    p_description: 'Строительство жилого комплекса',
    p_version: 0,
  });

  expect(error).toBeNull();

  return data as string;
}

export async function createTask(
  objectId?: string,
  assigneeId = assignees[0].id,
) {
  const object = objectId ?? (await createObject());

  const { data, error } = await supplier.rpc('save_task', {
    p_id: null,
    p_object_id: object,
    p_name: `Монтаж ${crypto.randomUUID().slice(0, 8)}`,
    p_description: 'Подготовить площадку и выполнить монтаж',
    p_assignee_id: assigneeId,
    p_version: 0,
  });

  expect(error).toBeNull();

  return { id: data as string, object };
}

export async function readTask(id: string) {
  const { data, error } = await supplier
    .from('Task')
    .select('*')
    .eq('id', id)
    .single();

  expect(error).toBeNull();

  return data!;
}

export async function transition(
  id: string,
  state: string,
  actor = assignee,
  comment = '',
) {
  const task = await readTask(id);

  const result = await actor.rpc('change_task_status', {
    p_task_id: id,
    p_state: state,
    p_comment: comment,
    p_version: task.version,
  });

  return result;
}

export async function taskAt(state: string) {
  const task = await createTask();

  if (state !== 'new') {
    expect((await transition(task.id, 'in progress')).error).toBeNull();
  }

  if (['on review', 'under revision', 'accepted'].includes(state)) {
    expect((await transition(task.id, 'on review')).error).toBeNull();
  }

  if (state === 'under revision' || state === 'accepted') {
    expect(
      (
        await transition(
          task.id,
          state,
          supplier,
          state === 'under revision' ? 'Исправить крепления' : '',
        )
      ).error,
    ).toBeNull();
  }

  return task;
}

export async function login(page: Page, user = suppliers[0]) {
  await page.goto('/login');
  await page.getByLabel('Электронная почта').fill(user.email);
  await page.getByLabel('Пароль', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: 'Войти в систему' }).click();
  await expect(
    page.getByRole('heading', {
      name: user.role === 'supplier' ? 'Объекты' : 'Мои задачи',
      exact: true,
    }),
  ).toBeVisible();
}
