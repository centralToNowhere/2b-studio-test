import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from '@base-ui/react/input';
import { getProfiles, rpc } from '@/shared/api/resources';
import { useUser } from '@/shared/auth/session';
import { draftKey, drafts } from '@/shared/lib/drafts';
import { Button, Loading, Modal, Select } from '@/shared/ui';
import type { ConstructionObject } from '@/entities/object';
import type { Task } from '@/entities/task';
import s from '@/shared/ui/page.module.css';

type Props =
  | {
      kind: 'object';
      record?: ConstructionObject;
      objectId?: never;
      onSaved: (id: string) => void;
      onClose: () => void;
    }
  | {
      kind: 'task';
      record?: Task;
      objectId: string;
      onSaved: (id: string) => void;
      onClose: () => void;
    };
const Editor = observer(function Editor(props: Props) {
  const user = useUser();
  const client = useQueryClient();
  const record = props.record;
  const [name, setName] = useState(record?.name ?? '');

  const [address, setAddress] = useState(
    props.kind === 'object' ? (props.record?.address ?? '') : '',
  );

  const [assignee, setAssignee] = useState(
    props.kind === 'task' ? (props.record?.assigneeId ?? '') : '',
  );

  const [version] = useState(record?.version ?? 0);

  const key = draftKey(
    user.id,
    props.kind,
    record?.id ?? `new-${props.objectId ?? 'object'}`,
  );

  const description = drafts.values[key] ?? record?.description ?? '';

  const profiles = useQuery({
    queryKey: ['profiles'],
    queryFn: getProfiles,
    enabled: props.kind === 'task',
  });

  const save = useMutation({
    mutationFn: () =>
      props.kind === 'object'
        ? rpc('save_object', {
            p_id: record?.id ?? null,
            p_name: name.trim(),
            p_address: address.trim(),
            p_description: description,
            p_version: version,
          })
        : rpc('save_task', {
            p_id: record?.id ?? null,
            p_object_id: props.objectId,
            p_name: name.trim(),
            p_description: description,
            p_assignee_id: assignee,
            p_version: version,
          }),
    onSuccess: async (id) => {
      drafts.clear(key);
      await client.invalidateQueries({
        predicate: (q) =>
          !['session', 'profile', 'profiles'].includes(String(q.queryKey[0])),
      });

      props.onSaved(String(id));
    },
  });

  return (
    <form
      className={s.form}
      onSubmit={(event) => {
        event.preventDefault();

        if (!name.trim() || (props.kind === 'object' && !address.trim())) {
          return;
        }

        save.mutate();
      }}
    >
      <label className={s.field}>
        Название
        <Input
          autoFocus
          value={name}
          onValueChange={setName}
          required
          maxLength={200}
          placeholder={
            props.kind === 'object'
              ? 'Например, ЖК «Северный парк»'
              : 'Например, Монтаж перекрытий'
          }
        />
      </label>
      {props.kind === 'object' ? (
        <label className={s.field}>
          Адрес
          <Input
            value={address}
            onValueChange={setAddress}
            required
            maxLength={500}
            placeholder="Город, улица, дом"
          />
        </label>
      ) : (
        <label className={s.field}>
          Исполнитель
          <Select
            aria-label="Исполнитель"
            required
            value={assignee || null}
            onValueChange={(value) => setAssignee(value ?? '')}
            placeholder="Выберите исполнителя"
            options={
              profiles.data
                ?.filter((p) => p.role === 'assignee')
                .map((p) => ({ value: p.id, label: p.name })) ?? []
            }
          />
          {profiles.isPending && <small>Загружаем исполнителей…</small>}
          {profiles.data?.filter((p) => p.role === 'assignee').length === 0 && (
            <small>
              Администратор должен добавить пользователей с ролью исполнителя.
            </small>
          )}
        </label>
      )}
      <label className={s.field}>
        Описание
        <textarea
          aria-label="Описание"
          value={description}
          onChange={(e) => drafts.set(key, e.target.value)}
          maxLength={20000}
          placeholder="Что важно знать об этой работе?"
        />
        <small>
          {key in drafts.values
            ? 'Черновик сохранён на этом устройстве'
            : 'Изменения описания сохраняются в черновик автоматически'}
        </small>
      </label>
      <div className={s.formActions}>
        <Button
          variant="secondary"
          type="button"
          onClick={props.onClose}
          disabled={save.isPending}
        >
          Отмена
        </Button>
        <Button
          type="submit"
          disabled={
            save.isPending ||
            !name.trim() ||
            (props.kind === 'object' ? !address.trim() : !assignee)
          }
        >
          {save.isPending
            ? 'Сохраняем…'
            : record
              ? 'Сохранить изменения'
              : 'Создать'}
        </Button>
      </div>
    </form>
  );
});

export const RecordEditor = observer(function RecordEditor(props: Props) {
  return (
    <Modal
      title={`${props.record ? 'Редактировать' : 'Создать'} ${props.kind === 'object' ? 'объект' : 'задачу'}`}
      open
      onOpenChange={(open) => {
        if (!open) {
          props.onClose();
        }
      }}
    >
      {drafts.ready ? <Editor {...props} /> : <Loading />}
    </Modal>
  );
});
