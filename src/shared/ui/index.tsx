import { Button as BaseButton } from '@base-ui/react/button';
import { Dialog } from '@base-ui/react/dialog';
import type { ComponentProps, ReactNode } from 'react';
import { ChevronLeft, ChevronRight, X, Inbox } from 'lucide-react';
import s from './ui.module.css';

export function Button({
  className = '',
  variant = 'primary',
  ...props
}: ComponentProps<typeof BaseButton> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}) {
  return (
    <BaseButton
      {...props}
      className={`${s.button} ${s[variant]} ${className}`}
    />
  );
}

export function Modal({
  title,
  description,
  children,
  open,
  onOpenChange,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className={s.backdrop} />
        <Dialog.Popup className={s.modal}>
          <div className={s.modalHeading}>
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close className={s.iconButton} aria-label="Закрыть">
              <X size={20} />
            </Dialog.Close>
          </div>
          <Dialog.Description className={s.muted}>
            {description ?? 'Заполните данные и сохраните изменения.'}
          </Dialog.Description>
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className={s.empty}>
      <span className={s.emptyIcon}>
        <Inbox size={26} />
      </span>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

export function Loading() {
  return (
    <div className={s.empty} role="status">
      <span className={s.spinner} />
      Загрузка…
    </div>
  );
}

export function Pagination({
  page,
  total,
  pageSize = 20,
  onPage,
}: {
  page: number;
  total: number;
  pageSize?: number;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className={s.pagination}>
      <span>Всего: {total}</span>
      <div>
        <Button
          variant="secondary"
          aria-label="Предыдущая страница"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft size={16} />
        </Button>
        <span>
          {page} / {pages}
        </span>
        <Button
          variant="secondary"
          aria-label="Следующая страница"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}

export { Select, type SelectOption } from './select';
