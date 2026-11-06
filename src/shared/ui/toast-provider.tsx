import { Toast } from '@base-ui/react/toast';
import type { ReactNode } from 'react';
import { toastManager } from './toast-manager';
import s from './ui.module.css';

function ToastList() {
  const { toasts } = Toast.useToastManager();

  return (
    <Toast.Viewport className={s.toasts}>
      {toasts.map((toast) => (
        <Toast.Root key={toast.id} toast={toast} className={s.toast}>
          <Toast.Content>
            <Toast.Title className={s.toastTitle} />
            <Toast.Description />
          </Toast.Content>
          <Toast.Close aria-label="Закрыть уведомление">×</Toast.Close>
        </Toast.Root>
      ))}
    </Toast.Viewport>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <Toast.Provider toastManager={toastManager} timeout={7000}>
      {children}
      <Toast.Portal>
        <ToastList />
      </Toast.Portal>
    </Toast.Provider>
  );
}
