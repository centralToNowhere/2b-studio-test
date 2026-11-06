import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import {
  admin,
  env,
  supplier,
  assignee,
  clientFor,
  suppliers,
  assignees,
  createObject,
  createTask,
  readTask,
  transition,
  taskAt,
} from './helpers';
const states = [
  'new',
  'in progress',
  'on review',
  'under revision',
  'accepted',
];

for (const role of ['supplier', 'assigned', 'other'] as const) {
  for (const from of states) {
    for (const to of states) {
      test(`${role}: ${from} → ${to}`, async () => {
        const task = await taskAt(from);
        const before = await readTask(task.id);

        const actor =
          role === 'supplier'
            ? supplier
            : role === 'assigned'
              ? assignee
              : clientFor(assignees[1]);

        const allowed =
          role === 'supplier'
            ? from === 'on review' &&
              ['accepted', 'under revision'].includes(to)
            : role === 'assigned'
              ? (['new', 'under revision'].includes(from) &&
                  to === 'in progress') ||
                (from === 'in progress' && to === 'on review')
              : false;

        const result = await actor.rpc('change_task_status', {
          p_task_id: task.id,
          p_state: to,
          p_comment: 'Комментарий к переходу',
          p_version: before.version,
        });

        if (allowed) {
          expect(result.error).toBeNull();
          expect((await readTask(task.id)).status).toBe(to);
          const { data } = await supplier
            .from('TaskStatusComment')
            .select('*')
            .eq('task_status_id', result.data)
            .single();

          expect(data?.author_id).toBe(
            role === 'supplier' ? suppliers[0].id : assignees[0].id,
          );
        } else {
          expect(result.error).not.toBeNull();
          expect((await readTask(task.id)).status).toBe(from);
        }
      });
    }
  }
}

test('RLS hides other tasks and their complete history', async () => {
  const task = await taskAt('under revision');
  const other = clientFor(assignees[1]);

  for (const [table, column, value] of [
    ['Task', 'id', task.id],
    ['TaskStatus', 'task_id', task.id],
    ['Object', 'id', task.object],
  ]) {
    const { data, error } = await other
      .from(table)
      .select('*')
      .eq(column, value);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  }

  const { data: statuses } = await supplier
    .from('TaskStatus')
    .select('id')
    .eq('task_id', task.id);

  const { data } = await other
    .from('TaskStatusComment')
    .select('*')
    .in(
      'task_status_id',
      statuses!.map((x) => x.id),
    );

  expect(data).toEqual([]);
});

test('anonymous access and direct mutations are denied', async () => {
  const task = await createTask();

  const anon = createClient(env.url, env.key, {
    auth: { persistSession: false },
  });

  expect((await anon.from('Task').select('*')).error).not.toBeNull();

  for (const actor of [supplier, assignee]) {
    expect(
      (
        await actor
          .from('Task')
          .update({ status: 'accepted', author_id: assignees[1].id })
          .eq('id', task.id)
      ).error,
    ).not.toBeNull();

    expect(
      (
        await actor.from('Task').insert({
          name: 'Подмена',
          object_id: task.object,
          assignee_id: assignees[0].id,
          author_id: assignees[0].id,
        })
      ).error,
    ).not.toBeNull();

    expect(
      (await actor.from('Task').delete().eq('id', task.id)).error,
    ).not.toBeNull();

    expect(
      (
        await actor
          .from('Profile')
          .update({ role: 'supplier' })
          .eq('id', assignees[0].id)
      ).error,
    ).not.toBeNull();

    expect(
      (
        await actor.from('TaskStatus').insert({
          task_id: task.id,
          author_id: assignees[0].id,
          state: 'accepted',
        })
      ).error,
    ).not.toBeNull();
  }

  expect((await readTask(task.id)).author_id).toBe(suppliers[0].id);
  expect(
    (
      await anon.rpc('archive_record', {
        p_kind: 'object',
        p_id: task.object,
        p_version: 0,
      })
    ).error,
  ).not.toBeNull();
});

test('assignee cannot create, edit, reassign or archive records', async () => {
  const task = await createTask();

  expect(
    (
      await assignee.rpc('save_object', {
        p_id: null,
        p_name: 'Чужой',
        p_address: 'Адрес',
        p_description: '',
        p_version: 0,
      })
    ).error,
  ).not.toBeNull();

  for (const id of [null, task.id]) {
    expect(
      (
        await assignee.rpc('save_task', {
          p_id: id,
          p_object_id: task.object,
          p_name: 'Изменено',
          p_description: 'Подмена',
          p_assignee_id: assignees[1].id,
          p_version: 0,
        })
      ).error,
    ).not.toBeNull();
  }

  expect(
    (
      await assignee.rpc('archive_record', {
        p_kind: 'task',
        p_id: task.id,
        p_version: 0,
      })
    ).error,
  ).not.toBeNull();

  expect(
    (
      await assignee.rpc('archive_record', {
        p_kind: 'object',
        p_id: task.object,
        p_version: 0,
      })
    ).error,
  ).not.toBeNull();
});

test('review comment is mandatory and insertion is atomic', async () => {
  const task = await taskAt('on review');
  const before = await readTask(task.id);

  for (const comment of ['', '   ', '\n\t\r']) {
    expect(
      (await transition(task.id, 'under revision', supplier, comment)).error
        ?.message,
    ).toBe('COMMENT_REQUIRED');
  }

  expect((await readTask(task.id)).version).toBe(before.version);
  expect(
    (await transition(task.id, 'under revision', supplier, 'x'.repeat(5001)))
      .error,
  ).not.toBeNull();

  expect((await readTask(task.id)).status).toBe('on review');
  expect((await transition(task.id, 'accepted', supplier)).error).toBeNull();
});

test('history and comments cannot be edited, deleted or appended later', async () => {
  const task = await taskAt('under revision');

  const { data: history } = await supplier
    .from('TaskStatus')
    .select('*')
    .eq('task_id', task.id)
    .order('sequence', { ascending: false });

  const status = history![0];

  const { data: comments } = await supplier
    .from('TaskStatusComment')
    .select('*')
    .eq('task_status_id', status.id);

  for (const actor of [supplier, assignee]) {
    expect(
      (
        await actor
          .from('TaskStatus')
          .update({ state: 'accepted' })
          .eq('id', status.id)
      ).error,
    ).not.toBeNull();

    expect(
      (await actor.from('TaskStatus').delete().eq('id', status.id)).error,
    ).not.toBeNull();

    expect(
      (
        await actor
          .from('TaskStatusComment')
          .update({ comment: 'Подмена' })
          .eq('id', comments![0].id)
      ).error,
    ).not.toBeNull();

    expect(
      (await actor.from('TaskStatusComment').delete().eq('id', comments![0].id))
        .error,
    ).not.toBeNull();

    expect(
      (
        await actor.from('TaskStatusComment').insert({
          task_status_id: status.id,
          author_id: suppliers[0].id,
          comment: 'Позже',
        })
      ).error,
    ).not.toBeNull();
  }
});

test('concurrent transitions accept one version only', async () => {
  const task = await createTask();

  const args = {
    p_task_id: task.id,
    p_state: 'in progress',
    p_comment: '',
    p_version: 0,
  };

  const results = await Promise.all([
    assignee.rpc('change_task_status', args),
    assignee.rpc('change_task_status', args),
  ]);

  expect(results.filter((r) => !r.error)).toHaveLength(1);
  expect((await readTask(task.id)).version).toBe(1);
  const { count } = await supplier
    .from('TaskStatus')
    .select('*', { count: 'exact', head: true })
    .eq('task_id', task.id);

  expect(count).toBe(2);
});

test('all suppliers can edit; reassigning removes previous assignee access', async () => {
  const task = await createTask();
  const before = await readTask(task.id);
  const other = clientFor(suppliers[1]);

  expect(
    (
      await other.rpc('save_task', {
        p_id: task.id,
        p_object_id: task.object,
        p_name: 'Переназначено',
        p_description: '',
        p_assignee_id: assignees[1].id,
        p_version: before.version,
      })
    ).error,
  ).toBeNull();

  expect(
    (await assignee.from('Task').select('*').eq('id', task.id)).data,
  ).toEqual([]);

  expect(
    (await clientFor(assignees[1]).from('Task').select('*').eq('id', task.id))
      .data,
  ).toHaveLength(1);

  expect(
    (await transition(task.id, 'in progress', assignee)).error,
  ).not.toBeNull();

  expect((await readTask(task.id)).author_id).toBe(suppliers[0].id);
});

test('soft deletion hides records and preserves complete history', async () => {
  for (const kind of ['task', 'object']) {
    const task = await taskAt('under revision');
    const row = await readTask(task.id);

    expect(
      (
        await supplier.rpc('archive_record', {
          p_kind: kind,
          p_id: kind === 'task' ? task.id : task.object,
          p_version: kind === 'task' ? row.version : 0,
        })
      ).error,
    ).toBeNull();

    for (const actor of [supplier, assignee]) {
      expect(
        (await actor.from('Task').select('*').eq('id', task.id)).data,
      ).toEqual([]);

      expect(
        (await actor.from('TaskStatus').select('*').eq('task_id', task.id))
          .data,
      ).toEqual([]);

      expect(
        (
          await actor.rpc('change_task_status', {
            p_task_id: task.id,
            p_state: 'in progress',
            p_comment: '',
            p_version: row.version,
          })
        ).error,
      ).not.toBeNull();
    }

    expect(
      (await admin.from('TaskStatus').select('*').eq('task_id', task.id)).data,
    ).toHaveLength(4);
  }
});

test('invalid inputs and stale edits do not change data', async () => {
  const object = await createObject();

  expect(
    (
      await supplier.rpc('save_task', {
        p_id: null,
        p_object_id: object,
        p_name: 'Задача',
        p_description: '',
        p_assignee_id: suppliers[0].id,
        p_version: 0,
      })
    ).error?.message,
  ).toBe('INVALID_ASSIGNEE');

  expect(
    (
      await supplier.rpc('save_object', {
        p_id: object,
        p_name: '   ',
        p_address: 'Адрес',
        p_description: '',
        p_version: 0,
      })
    ).error,
  ).not.toBeNull();

  expect(
    (
      await supplier.rpc('save_object', {
        p_id: object,
        p_name: 'Изменено',
        p_address: 'Адрес',
        p_description: '',
        p_version: 0,
      })
    ).error,
  ).toBeNull();

  expect(
    (
      await supplier.rpc('save_object', {
        p_id: object,
        p_name: 'Потерянная правка',
        p_address: 'Адрес',
        p_description: '',
        p_version: 0,
      })
    ).error?.message,
  ).toBe('CONFLICT_OR_NOT_FOUND');
});
