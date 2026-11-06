import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Pencil, Trash2, ArrowRight } from 'lucide-react';
import {
  getTask,
  getObject,
  getHistory,
  getProfiles,
  rpc,
} from '@/shared/api/resources';
import {
  toTask,
  transitions,
  stateLabels,
  type TaskState,
} from '@/entities/task';
import { useUser } from '@/shared/auth/session';
import { formatTime } from '@/shared/lib/date';
import { Button, Empty, Loading, Modal, Pagination } from '@/shared/ui';
import { RecordEditor } from '@/features/record-editor';
import { StatusBadge } from '@/features/task-list';
import s from '@/shared/ui/page.module.css';

export function TaskPage() {
  const { id = '' } = useParams();
  const user = useUser();
  const client = useQueryClient();
  const navigate = useNavigate();
  const [edit, setEdit] = useState(false);
  const [page, setPage] = useState(1);

  const [target, setTarget] = useState<{
    state: TaskState;
    version: number;
  } | null>(null);

  const [comment, setComment] = useState('');
  const [deleteVersion, setDeleteVersion] = useState<number | null>(null);

  const query = useQuery({
    queryKey: ['task', id],
    queryFn: () => getTask(id),
  });

  const object = useQuery({
    queryKey: ['object', query.data?.object_id],
    queryFn: () => getObject(query.data!.object_id),
    enabled: !!query.data,
  });

  const profiles = useQuery({ queryKey: ['profiles'], queryFn: getProfiles });

  const history = useQuery({
    queryKey: ['history', id, page],
    queryFn: () => getHistory(id, page),
    enabled: !!query.data,
  });

  const change = useMutation({
    mutationFn: () =>
      rpc('change_task_status', {
        p_task_id: id,
        p_state: target!.state,
        p_comment: comment,
        p_version: target!.version,
      }),
    onSuccess: async () => {
      setTarget(null);
      setComment('');
      setPage(1);
      await client.invalidateQueries();
    },
  });

  const remove = useMutation({
    mutationFn: () =>
      rpc('archive_record', {
        p_kind: 'task',
        p_id: id,
        p_version: deleteVersion!,
      }),
    onSuccess: async () => {
      await client.invalidateQueries();
      navigate(`/objects/${query.data!.object_id}`);
    },
  });

  if (query.isPending) {
    return <Loading />;
  }

  if (query.isError) {
    return (
      <Empty
        title="Не удалось загрузить задачу"
        action={<Button onClick={() => query.refetch()}>Повторить</Button>}
      />
    );
  }

  if (!query.data) {
    return (
      <Empty
        title="Задача не найдена"
        description="Она удалена или назначена другому исполнителю."
      />
    );
  }

  const task = toTask(query.data);
  const supplier = user.role === 'supplier';

  const name = (id: string) =>
    profiles.data?.find((p) => p.id === id)?.name ?? 'Пользователь';

  const available = transitions(task, user);

  return (
    <>
      <Link
        className={s.back}
        to={supplier ? `/objects/${task.objectId}` : '/my-tasks'}
      >
        <ArrowLeft size={14} />
        {supplier ? (object.data?.name ?? 'К объекту') : 'Мои задачи'}
      </Link>
      <div className={s.heading}>
        <div>
          <p className={s.eyebrow}>Карточка задачи</p>
          <h1>{task.name}</h1>
          <StatusBadge state={task.status} />
        </div>
        {supplier && (
          <div className={s.actions}>
            <Button variant="secondary" onClick={() => setEdit(true)}>
              <Pencil size={15} />
              Редактировать
            </Button>
            <Button
              variant="ghost"
              aria-label="Удалить задачу"
              onClick={() => setDeleteVersion(task.version)}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        )}
      </div>
      <div className={s.detailGrid}>
        <div>
          <section className={s.panel}>
            <div className={s.panelHeader}>
              <h2>Описание задачи</h2>
            </div>
            <div className={s.body}>
              <p className={s.description}>
                {task.description || 'Описание не добавлено.'}
              </p>
              {available.length > 0 && (
                <div className={s.spacer}>
                  <div className={s.actions}>
                    {available.map((state) => (
                      <Button
                        key={state}
                        variant={
                          state === 'under revision' ? 'secondary' : 'primary'
                        }
                        onClick={() => {
                          setComment('');
                          setTarget({ state, version: task.version });
                        }}
                      >
                        {state === 'in progress'
                          ? 'Взять в работу'
                          : state === 'on review'
                            ? 'Отправить на проверку'
                            : state === 'accepted'
                              ? 'Принять работу'
                              : 'Вернуть на доработку'}
                        <ArrowRight size={15} />
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {task.status === 'accepted' && (
                <p className={s.note}>
                  Работа принята. Дальнейшие переходы статуса не предусмотрены.
                </p>
              )}
            </div>
          </section>
          <section className={`${s.panel} ${s.spacer}`}>
            <div className={s.panelHeader}>
              <h2>
                История статусов
                <span className={s.count}>{history.data?.count ?? '—'}</span>
              </h2>
            </div>
            <div className={s.body}>
              {history.isPending ? (
                <Loading />
              ) : history.isError ? (
                <Empty
                  title="Не удалось загрузить историю"
                  action={
                    <Button onClick={() => history.refetch()}>Повторить</Button>
                  }
                />
              ) : (
                <ol className={s.history}>
                  {history.data?.rows.map((item) => (
                    <li key={item.id}>
                      <div className={s.historyTop}>
                        <StatusBadge state={item.state} />
                        <span className={s.subtitle}>
                          {formatTime(item.created_at)}
                        </span>
                      </div>
                      <p className={s.historyAuthor}>{name(item.author_id)}</p>
                      {item.TaskStatusComment && (
                        <div className={s.comment}>
                          {item.TaskStatusComment.comment}
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
            {history.data && history.data.count > 20 && (
              <Pagination
                page={page}
                total={history.data.count}
                onPage={setPage}
              />
            )}
          </section>
        </div>
        <aside className={s.panel} style={{ alignSelf: 'start' }}>
          <div className={s.panelHeader}>
            <h2>Детали</h2>
          </div>
          <div className={s.body}>
            <dl className={s.meta}>
              <div>
                <dt>Объект</dt>
                <dd>
                  <Link to={`/objects/${task.objectId}`}>
                    {object.data?.name ?? 'Загрузка…'}
                  </Link>
                </dd>
              </div>
              <div>
                <dt>Исполнитель</dt>
                <dd>
                  <span className={s.avatar}>
                    {name(task.assigneeId).slice(0, 2).toUpperCase()}
                  </span>
                  {name(task.assigneeId)}
                </dd>
              </div>
              <div>
                <dt>Постановщик</dt>
                <dd>{name(task.authorId)}</dd>
              </div>
              <div>
                <dt>Дата создания · МСК</dt>
                <dd>{formatTime(task.createdAt)}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
      {edit && (
        <RecordEditor
          kind="task"
          objectId={task.objectId}
          record={task}
          onClose={() => setEdit(false)}
          onSaved={() => setEdit(false)}
        />
      )}
      <Modal
        open={!!target}
        onOpenChange={(open) => {
          if (!open && !change.isPending) {
            setTarget(null);
          }
        }}
        title={target ? stateLabels[target.state] : 'Сменить статус'}
        description="Переход и комментарий будут сохранены в истории задачи."
      >
        <form
          className={s.form}
          onSubmit={(e) => {
            e.preventDefault();
            change.mutate();
          }}
        >
          <label className={s.field}>
            {target?.state === 'under revision'
              ? 'Комментарий (обязательно)'
              : 'Комментарий (необязательно)'}
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required={target?.state === 'under revision'}
              maxLength={5000}
              placeholder="Добавьте детали к изменению статуса"
            />
          </label>
          <div className={s.formActions}>
            <Button
              variant="secondary"
              type="button"
              disabled={change.isPending}
              onClick={() => setTarget(null)}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={
                change.isPending ||
                (target?.state === 'under revision' && !comment.trim())
              }
            >
              Подтвердить переход
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={deleteVersion !== null}
        onOpenChange={(open) => {
          if (!open && !remove.isPending) {
            setDeleteVersion(null);
          }
        }}
        title="Удалить задачу?"
        description="Задача исчезнет из рабочих списков. История сохранится в базе."
      >
        <div className={s.formActions}>
          <Button
            variant="secondary"
            disabled={remove.isPending}
            onClick={() => setDeleteVersion(null)}
          >
            Отмена
          </Button>
          <Button
            variant="danger"
            disabled={remove.isPending}
            onClick={() => remove.mutate()}
          >
            Удалить задачу
          </Button>
        </div>
      </Modal>
    </>
  );
}
