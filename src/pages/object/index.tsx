import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Plus, Pencil, Trash2, MapPin } from 'lucide-react';
import { getObject, rpc } from '@/shared/api/resources';
import { toObject } from '@/entities/object';
import { useUser } from '@/shared/auth/session';
import { Button, Empty, Loading, Modal } from '@/shared/ui';
import { RecordEditor } from '@/features/record-editor';
import { TaskList } from '@/features/task-list';
import s from '@/shared/ui/page.module.css';

export function ObjectPage() {
  const { id = '' } = useParams();
  const user = useUser();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [editor, setEditor] = useState<'object' | 'task' | null>(null);
  const [deleteVersion, setDeleteVersion] = useState<number | null>(null);

  const query = useQuery({
    queryKey: ['object', id],
    queryFn: () => getObject(id),
  });

  const remove = useMutation({
    mutationFn: () =>
      rpc('archive_record', {
        p_kind: 'object',
        p_id: id,
        p_version: deleteVersion!,
      }),
    onSuccess: async () => {
      await client.invalidateQueries();
      navigate('/objects');
    },
  });

  if (query.isPending) {
    return <Loading />;
  }

  if (query.isError) {
    return (
      <Empty
        title="Не удалось загрузить объект"
        action={<Button onClick={() => query.refetch()}>Повторить</Button>}
      />
    );
  }

  if (!query.data) {
    return (
      <Empty
        title="Объект не найден"
        description="Он удалён или у вас нет доступа."
      />
    );
  }

  const object = toObject(query.data);
  const supplier = user.role === 'supplier';

  return (
    <>
      <Link className={s.back} to={supplier ? '/objects' : '/my-tasks'}>
        <ArrowLeft size={14} />
        {supplier ? 'Все объекты' : 'Мои задачи'}
      </Link>
      <div className={s.heading}>
        <div>
          <p className={s.eyebrow}>Объект строительства</p>
          <h1>{object.name}</h1>
          <span className={s.address}>
            <MapPin size={14} />
            {object.address}
          </span>
        </div>
        {supplier && (
          <div className={s.actions}>
            <Button variant="secondary" onClick={() => setEditor('object')}>
              <Pencil size={15} />
              Редактировать
            </Button>
            <Button
              variant="ghost"
              aria-label="Удалить объект"
              onClick={() => setDeleteVersion(object.version)}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        )}
      </div>
      {object.description && (
        <div className={`${s.panel} ${s.body}`} style={{ marginBottom: 24 }}>
          <h3>ОБ ОБЪЕКТЕ</h3>
          <p className={s.description}>{object.description}</p>
        </div>
      )}
      {supplier && (
        <div
          className={s.actions}
          style={{ justifyContent: 'flex-end', marginBottom: 16 }}
        >
          <Button onClick={() => setEditor('task')}>
            <Plus size={16} />
            Создать задачу
          </Button>
        </div>
      )}
      <TaskList objectId={id} assigneeId={supplier ? undefined : user.id} />
      {editor === 'object' && (
        <RecordEditor
          kind="object"
          record={object}
          onClose={() => setEditor(null)}
          onSaved={() => setEditor(null)}
        />
      )}{' '}
      {editor === 'task' && (
        <RecordEditor
          kind="task"
          objectId={id}
          onClose={() => setEditor(null)}
          onSaved={(taskId) => navigate(`/tasks/${taskId}`)}
        />
      )}
      <Modal
        open={deleteVersion !== null}
        onOpenChange={(open) => {
          if (!open && !remove.isPending) {
            setDeleteVersion(null);
          }
        }}
        title="Удалить объект?"
        description="Объект и его задачи исчезнут из рабочих списков. История сохранится в базе. Восстановление в интерфейсе недоступно."
      >
        <div className={s.formActions}>
          <Button
            variant="secondary"
            onClick={() => setDeleteVersion(null)}
            disabled={remove.isPending}
          >
            Отмена
          </Button>
          <Button
            variant="danger"
            onClick={() => remove.mutate()}
            disabled={remove.isPending}
          >
            Удалить объект
          </Button>
        </div>
      </Modal>
    </>
  );
}
