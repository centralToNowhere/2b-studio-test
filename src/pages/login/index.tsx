import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Navigate } from 'react-router';
import { Input } from '@base-ui/react/input';
import { ArrowRight, Building2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/shared/api/client';
import { useSession } from '@/shared/auth/session';
import { Button } from '@/shared/ui';
import s from './login.module.css';
import p from '@/shared/ui/page.module.css';

export function LoginPage() {
  const session = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const login = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }
    },
  });

  if (session.data) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className={s.page}>
      <section className={s.intro}>
        <div className={s.brand}>
          <span>
            <Building2 size={24} />
          </span>
          BuilderCRM<span className={s.brandSub}>СТРОИТЕЛЬСТВО</span>
        </div>
        <div>
          <p className={s.eyebrow}>ОТ ПЛАНА К РЕЗУЛЬТАТУ</p>
          <h1>
            Каждый объект.
            <br />
            Каждая задача.
            <br />
            <em>Под контролем.</em>
          </h1>
          <p className={s.lead}>
            Единое пространство для команды:
            <br />
            от назначения работ до приёмки результата.
          </p>
          <div className={s.lines}>
            <i />
            <i />
            <i />
            <i />
          </div>
        </div>
        <span className={s.footer}>Работаем вместе. Строим уверенно.</span>
      </section>
      <section className={s.formSide}>
        <div className={s.card}>
          <span className={s.welcome}>РАБОЧЕЕ ПРОСТРАНСТВО</span>
          <h2>С возвращением</h2>
          <p>Войдите, чтобы продолжить работу с объектами и задачами.</p>
          <form
            className={p.form}
            onSubmit={(e) => {
              e.preventDefault();
              login.mutate();
            }}
          >
            <label className={p.field}>
              Электронная почта
              <Input
                type="email"
                required
                autoComplete="username"
                value={email}
                onValueChange={setEmail}
                placeholder="name@company.ru"
              />
            </label>
            <label className={p.field}>
              Пароль
              <Input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onValueChange={setPassword}
                placeholder="Введите пароль"
              />
            </label>
            <Button type="submit" disabled={login.isPending}>
              {login.isPending ? 'Входим…' : 'Войти в систему'}
              <ArrowRight size={17} />
            </Button>
          </form>
          <div className={s.help}>
            <ShieldCheck size={17} />
            <span>
              Доступ выдаёт администратор компании.
              <br />
              Для восстановления пароля обратитесь к нему.
            </span>
          </div>
        </div>
        <p className={s.bottom}>BuilderCRM · Управление строительством</p>
      </section>
    </main>
  );
}
