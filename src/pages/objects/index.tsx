import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { Plus, Building2, MapPin, ChevronRight } from 'lucide-react';
import { getObjects } from '@/shared/api/resources';
import { useUser } from '@/shared/auth/session';
import { toObject } from '@/entities/object';
import { formatDate } from '@/shared/lib/date';
import { Button, Empty, Loading, Pagination } from '@/shared/ui';
import { RecordEditor } from '@/features/record-editor';
import s from '@/shared/ui/page.module.css';

export function ObjectsPage() {
  const user = useUser();
  const [search, setSearch] = useSearchParams();
  const page = Math.max(1, Math.floor(Number(search.get('page'))) || 1);
  const [create, setCreate] = useState(false);
  const navigate = useNavigate();

  const objects = useQuery({
    queryKey: ['objects', page],
    queryFn: () => getObjects(page),
    enabled: user.role === 'supplier',
  });

  if (user.role !== 'supplier') {
    return <Navigate to="/my-tasks" replace />;
  }

  return (
    <>
      <div className={s.heading}>
        <div>
          <p className={s.eyebrow}>Обзор проектов</p>
          <h1>Объекты</h1>
          <p className={s.subtitle}>
            Вся работа на ваших объектах — в одном месте.
          </p>
        </div>
        <Button onClick={() => setCreate(true)}>
          <Plus size={17} />
          Создать объект
        </Button>
      </div>
      <section className={s.panel}>
        <div className={s.panelHeader}>
          <h2>
            Все объекты
            <span className={s.count}>{objects.data?.count ?? '—'}</span>
          </h2>
          <span className={s.subtitle}>Сначала новые</span>
        </div>
        {objects.isPending ? (
          <Loading />
        ) : objects.isError ? (
          <Empty
            title="Не удалось загрузить объекты"
            action={
              <Button onClick={() => objects.refetch()}>Повторить</Button>
            }
          />
        ) : objects.data.rows.length === 0 ? (
          <Empty
            title="Здесь начнётся ваш следующий проект"
            description="Создайте объект, добавьте задачи и назначьте исполнителей."
            action={
              <Button onClick={() => setCreate(true)}>
                <Plus size={16} />
                Создать объект
              </Button>
            }
          />
        ) : (
          <ul className={s.list}>
            {objects.data.rows.map(toObject).map((object) => (
              <li key={object.id}>
                <Link className={s.objectRow} to={`/objects/${object.id}`}>
                  <span className={s.objectIcon}>
                    <Building2 size={23} />
                  </span>
                  <div className={s.objectText}>
                    <h3>{object.name}</h3>
                    <span className={s.address}>
                      <MapPin size={13} />
                      {object.address}
                    </span>
                  </div>
                  <span className={s.date}>{formatDate(object.createdAt)}</span>
                  <ChevronRight className={s.chevron} size={17} />
                </Link>
              </li>
            ))}
          </ul>
        )}
        {objects.data && (
          <Pagination
            page={page}
            total={objects.data.count}
            onPage={(p) => setSearch({ page: String(p) })}
          />
        )}
      </section>
      {create && (
        <RecordEditor
          kind="object"
          onClose={() => setCreate(false)}
          onSaved={(id) => navigate(`/objects/${id}`)}
        />
      )}
    </>
  );
}
