import { Toast } from '@base-ui/react/toast';
export const toastManager = Toast.createToastManager();

export function errorMessage(error: unknown) {
  const message =
    typeof error === 'object' && error && 'message' in error
      ? String(error.message)
      : '';

  const known: Record<string, string> = {
    FORBIDDEN: 'Недостаточно прав для этого действия.',
    NOT_FOUND: 'Запись не найдена или недоступна.',
    CONFLICT_OR_NOT_FOUND:
      'Запись изменилась. Обновите страницу и повторите действие.',
    INVALID_ASSIGNEE: 'Выберите пользователя с ролью исполнителя.',
    INVALID_TRANSITION: 'Этот переход статуса недоступен.',
    COMMENT_REQUIRED: 'Добавьте комментарий о необходимых доработках.',
    'Invalid login credentials': 'Неверный email или пароль.',
    'Email not confirmed':
      'Администратор должен подтвердить email пользователя.',
    'Failed to fetch':
      'Не удалось подключиться. Проверьте интернет и повторите попытку.',
  };

  return known[message] ?? 'Не удалось выполнить действие. Попробуйте ещё раз.';
}

export function notifyError(error: unknown) {
  toastManager.add({
    title: 'Не удалось выполнить действие',
    description: errorMessage(error),
    type: 'error',
  });
}
