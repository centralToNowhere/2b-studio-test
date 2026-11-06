import { Navigate } from 'react-router';
import { useUser } from '@/shared/auth/session';
import { TaskList } from '@/features/task-list';
import s from '@/shared/ui/page.module.css';

export function MyTasksPage() {
  const user = useUser();

  if (user.role !== 'assignee') {
    return <Navigate to="/objects" replace />;
  }

  return (
    <>
      <div className={s.heading}>
        <div>
          <p className={s.eyebrow}>Мой рабочий день</p>
          <h1>Мои задачи</h1>
          <p className={s.subtitle}>
            Назначенные вам работы и их текущий статус.
          </p>
        </div>
      </div>
      <TaskList assigneeId={user.id} />
    </>
  );
}
