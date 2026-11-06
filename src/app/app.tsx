import { Suspense, lazy, useState } from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
  NavLink,
  Link,
  Navigate,
  useLocation,
} from 'react-router';
import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
  MutationCache,
} from '@tanstack/react-query';
import {
  Building2,
  ListTodo,
  LogOut,
  Moon,
  Sun,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import {
  Protected,
  SessionEvents,
  useUser,
  useLogout,
} from '@/shared/auth/session';
import { configured } from '@/shared/api/client';
import { Button, Empty, Loading } from '@/shared/ui';
import { ToastProvider, notifyError } from '@/shared/ui/toast';
import s from './shell.module.css';
const Login = lazy(() =>
  import('@/pages/login').then((m) => ({ default: m.LoginPage })),
);

const Objects = lazy(() =>
  import('@/pages/objects').then((m) => ({ default: m.ObjectsPage })),
);

const ObjectPage = lazy(() =>
  import('@/pages/object').then((m) => ({ default: m.ObjectPage })),
);

const Task = lazy(() =>
  import('@/pages/task').then((m) => ({ default: m.TaskPage })),
);

const MyTasks = lazy(() =>
  import('@/pages/my-tasks').then((m) => ({ default: m.MyTasksPage })),
);

const client = new QueryClient({
  queryCache: new QueryCache({ onError: notifyError }),
  mutationCache: new MutationCache({ onError: notifyError }),
  defaultOptions: {
    queries: { staleTime: 30000, retry: 1 },
    mutations: { retry: false },
  },
});

function Shell() {
  const user = useUser();
  const logout = useLogout();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const [theme, setTheme] = useState(
    document.documentElement.dataset.theme ?? 'light',
  );

  const supplier = user.role === 'supplier';

  const title = location.pathname.startsWith('/tasks/')
    ? 'Карточка задачи'
    : location.pathname.startsWith('/my-tasks')
      ? 'Мои задачи'
      : location.pathname === '/objects'
        ? 'Объекты'
        : 'Карточка объекта';

  return (
    <div className={`${s.shell} ${collapsed ? s.collapsed : ''}`}>
      <a className={s.skip} href="#main">
        Перейти к содержимому
      </a>
      <aside className={s.sidebar}>
        <Link className={s.brand} to="/">
          <span>
            <Building2 size={22} />
          </span>
          <div>
            BuilderCRM<small>СТРОИТЕЛЬСТВО</small>
          </div>
        </Link>
        <p className={s.navLabel}>РАБОЧЕЕ ПРОСТРАНСТВО</p>
        <nav aria-label="Основная навигация">
          {supplier ? (
            <NavLink
              className={({ isActive }) =>
                `${s.navItem} ${isActive ? s.active : ''}`
              }
              to="/objects"
            >
              <Building2 size={18} />
              <span>Объекты</span>
            </NavLink>
          ) : (
            <NavLink
              className={({ isActive }) =>
                `${s.navItem} ${isActive ? s.active : ''}`
              }
              to="/my-tasks"
            >
              <ListTodo size={18} />
              <span>Мои задачи</span>
            </NavLink>
          )}
        </nav>
        <div className={s.sidebarBottom}>
          <div className={s.user}>
            <span className={s.avatar}>
              {user.name.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <strong>{user.name}</strong>
              <small>{supplier ? 'Постановщик' : 'Исполнитель'}</small>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            aria-label="Выйти"
          >
            <LogOut size={17} />
            <span>Выйти</span>
          </Button>
        </div>
      </aside>
      <div className={s.workspace}>
        <header className={s.header}>
          <div className={s.breadcrumb}>
            <button
              className={s.collapseButton}
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
            >
              {collapsed ? (
                <PanelLeftOpen size={17} />
              ) : (
                <PanelLeftClose size={17} />
              )}
            </button>
            <span>Рабочее пространство</span>
            <ChevronRight size={13} />
            <strong>{title}</strong>
          </div>
          <Button
            variant="ghost"
            aria-label={
              theme === 'dark'
                ? 'Включить светлую тему'
                : 'Включить тёмную тему'
            }
            onClick={() => {
              const next = theme === 'dark' ? 'light' : 'dark';

              setTheme(next);
              document.documentElement.dataset.theme = next;

              try {
                localStorage.setItem('crm-theme', next);
              } catch {
                /* Theme still works without storage. */
              }
            }}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </Button>
        </header>
        <main id="main" className={s.main}>
          <Suspense fallback={<Loading />}>
            <Outlet />
          </Suspense>
        </main>
        <footer className={s.footer}>
          <span>BuilderCRM · Управление строительством</span>
          <span>Время указано по Москве</span>
        </footer>
      </div>
    </div>
  );
}

function Home() {
  const user = useUser();

  return (
    <Navigate
      to={user.role === 'supplier' ? '/objects' : '/my-tasks'}
      replace
    />
  );
}

function ErrorPage() {
  return (
    <Empty
      title="Не удалось открыть страницу"
      description="Попробуйте обновить страницу."
      action={
        <Button onClick={() => window.location.reload()}>Обновить</Button>
      }
    />
  );
}

const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <Suspense fallback={<Loading />}>
        <Login />
      </Suspense>
    ),
    errorElement: <ErrorPage />,
  },
  {
    path: '/',
    element: (
      <Protected>
        <Shell />
      </Protected>
    ),
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <Home /> },
      { path: 'objects', element: <Objects /> },
      { path: 'objects/:id', element: <ObjectPage /> },
      { path: 'tasks/:id', element: <Task /> },
      { path: 'my-tasks', element: <MyTasks /> },
      {
        path: '*',
        element: (
          <Empty
            title="Страница не найдена"
            action={<Link to="/">На главную</Link>}
          />
        ),
      },
    ],
  },
]);

export function App() {
  return (
    <ToastProvider>
      <QueryClientProvider client={client}>
        <SessionEvents>
          {configured ? (
            <RouterProvider router={router} />
          ) : (
            <Empty
              title="Приложение не настроено"
              description="Укажите URL и публичный ключ Supabase перед сборкой."
            />
          )}
        </SessionEvents>
      </QueryClientProvider>
    </ToastProvider>
  );
}
