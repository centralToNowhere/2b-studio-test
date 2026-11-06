import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import { getProfiles, getTasks } from '@/shared/api/resources';
import { stateLabels, states, toTask, type TaskState } from '@/entities/task';
import { formatDate, validDate } from '@/shared/lib/date';
import { Button, Empty, Loading, Pagination, Select } from '@/shared/ui';
import s from '@/shared/ui/page.module.css';

export function StatusBadge({ state }: { state: TaskState }) {
  return (
    <span className={s.status} data-state={state}>
      {stateLabels[state]}
    </span>
  );
}

export function TaskList({
  objectId,
  assigneeId,
}: {
  objectId?: string;
  assigneeId?: string;
}) {
  const [search, setSearch] = useSearchParams();
  const page = Math.max(1, Math.floor(Number(search.get('page'))) || 1);

  const status = states.includes(search.get('status') as TaskState)
    ? (search.get('status') as TaskState)
    : undefined;

  const from = validDate(search.get('from'));
  const to = validDate(search.get('to'));

  const filters = {
    objectId,
    assignee: assigneeId || search.get('assignee') || undefined,
    status,
    from,
    to,
    page,
  };

  const tasks = useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => getTasks(filters),
  });

  const profiles = useQuery({ queryKey: ['profiles'], queryFn: getProfiles });

  function filter(key: string, value: string) {
    const next = new URLSearchParams(search);

    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }

    next.delete('page');
    setSearch(next);
  }

  const hasFilters = Boolean(
    status || from || to || (!assigneeId && filters.assignee),
  );

  return (
    <div className={s.panel}>
      <div className={s.panelHeader}>
        <h2>
          Задачи<span className={s.count}>{tasks.data?.count ?? '—'}</span>
        </h2>
        <span className={s.subtitle}>Дата создания · МСК</span>
      </div>
      <div className={s.filters}>
        {!assigneeId && (
          <label>
            Исполнитель
            <Select
              aria-label="Фильтр по исполнителю"
              value={filters.assignee ?? ''}
              onValueChange={(value) => filter('assignee', value ?? '')}
              options={[
                { value: '', label: 'Все исполнители' },
                ...(profiles.data
                  ?.filter((p) => p.role === 'assignee')
                  .map((p) => ({ value: p.id, label: p.name })) ?? []),
              ]}
            />
          </label>
        )}
        <label>
          Статус
          <Select
            aria-label="Фильтр по статусу"
            value={status ?? ''}
            onValueChange={(value) => filter('status', value ?? '')}
            options={[
              { value: '', label: 'Все статусы' },
              ...states.map((state) => ({
                value: state,
                label: stateLabels[state],
              })),
            ]}
          />
        </label>
        <label>
          Создана с
          <input
            type="date"
            value={from ?? ''}
            max={to}
            onChange={(e) => filter('from', e.target.value)}
          />
        </label>
        <label>
          По
          <input
            type="date"
            value={to ?? ''}
            min={from}
            onChange={(e) => filter('to', e.target.value)}
          />
        </label>
        {hasFilters && (
          <Button variant="ghost" onClick={() => setSearch({})}>
            Сбросить
          </Button>
        )}
      </div>
      {tasks.isPending ? (
        <Loading />
      ) : tasks.isError ? (
        <Empty
          title="Не удалось загрузить задачи"
          action={<Button onClick={() => tasks.refetch()}>Повторить</Button>}
        />
      ) : tasks.data.rows.length === 0 ? (
        <Empty
          title={hasFilters ? 'Ничего не найдено' : 'Задач пока нет'}
          description={
            hasFilters
              ? 'Попробуйте изменить параметры фильтра.'
              : 'Новые задачи появятся здесь после создания и назначения.'
          }
        />
      ) : (
        <div className={s.tableScroll}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Задача</th>
                <th>Статус</th>
                <th>Исполнитель</th>
                <th>Создана</th>
              </tr>
            </thead>
            <tbody>
              {tasks.data.rows.map(toTask).map((task) => {
                const name =
                  profiles.data?.find((p) => p.id === task.assigneeId)?.name ??
                  'Исполнитель';

                return (
                  <tr key={task.id}>
                    <td>
                      <Link className={s.taskName} to={`/tasks/${task.id}`}>
                        {task.name}
                      </Link>
                    </td>
                    <td>
                      <StatusBadge state={task.status} />
                    </td>
                    <td>
                      <span className={s.avatar}>
                        {name.slice(0, 2).toUpperCase()}
                      </span>
                      {name}
                    </td>
                    <td>{formatDate(task.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {tasks.data && (
        <Pagination
          page={page}
          total={tasks.data.count}
          onPage={(value) => {
            const next = new URLSearchParams(search);

            next.set('page', String(value));
            setSearch(next);
          }}
        />
      )}
    </div>
  );
}
