import { test, expect } from '@playwright/test';
import {
  login,
  suppliers,
  assignees,
  createTask,
  taskAt,
  readTask,
  admin,
} from './helpers';
test('login, object and task creation, edits and history', async ({ page }) => {
  const errors: string[] = [];

  page.on('pageerror', (e) => errors.push(e.message));
  await login(page);
  await page
    .getByRole('button', { name: 'Создать объект', exact: true })
    .first()
    .click();

  const objectName = `ЖК Берег ${Date.now()}`;

  await page.getByLabel('Название', { exact: true }).fill(objectName);
  await page
    .getByLabel('Адрес', { exact: true })
    .fill('Москва, Набережная, 24');

  await page
    .getByLabel('Описание', { exact: true })
    .fill('Строительство второй очереди');

  await page.getByRole('button', { name: 'Создать', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: objectName, exact: true }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Создать задачу' }).click();
  await page.getByLabel('Название', { exact: true }).fill('Монтаж окон');
  await page
    .getByRole('combobox', { name: 'Исполнитель', exact: true })
    .click();

  await page
    .getByRole('option', { name: 'Алексей Козлов', exact: true })
    .click();

  await page
    .getByLabel('Описание', { exact: true })
    .fill('Установить окна на втором этаже');

  await page.getByRole('button', { name: 'Создать', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Монтаж окон', exact: true }),
  ).toBeVisible();

  await expect(
    page.getByRole('heading', { name: /История статусов/ }),
  ).toBeVisible();

  await expect(page.getByText('Установить окна на втором этаже')).toBeVisible();
  await page
    .getByRole('button', { name: 'Редактировать', exact: true })
    .click();

  await page
    .getByLabel('Название', { exact: true })
    .fill('Монтаж окон — этаж 2');

  await page.getByRole('button', { name: 'Сохранить изменения' }).click();
  await expect(
    page.getByRole('heading', { name: 'Монтаж окон — этаж 2', exact: true }),
  ).toBeVisible();

  expect(errors).toEqual([]);
});

test('assignee can perform transitions with optional comment but cannot edit fields', async ({
  page,
}) => {
  const task = await createTask();

  await login(page, assignees[0]);
  await page.goto(`/tasks/${task.id}`);
  await expect(page.getByRole('button', { name: 'Редактировать' })).toHaveCount(
    0,
  );

  await page.getByRole('button', { name: 'Взять в работу' }).click();
  await page.getByRole('button', { name: 'Подтвердить переход' }).click();
  await expect(
    page.getByRole('button', { name: 'Отправить на проверку' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Отправить на проверку' }).click();
  await page
    .getByLabel('Комментарий (необязательно)')
    .fill('Работа выполнена, готова к проверке');

  await page.getByRole('button', { name: 'Подтвердить переход' }).click();
  await expect(
    page.getByText('Работа выполнена, готова к проверке'),
  ).toBeVisible();

  await expect(
    page.getByRole('button', { name: 'Принять работу' }),
  ).toHaveCount(0);
});

test('supplier requires a review comment and can accept after rework', async ({
  page,
}) => {
  const task = await taskAt('on review');

  await login(page);
  await page.goto(`/tasks/${task.id}`);
  await page.getByRole('button', { name: 'Вернуть на доработку' }).click();
  await expect(
    page.getByRole('button', { name: 'Подтвердить переход' }),
  ).toBeDisabled();

  await page
    .getByLabel('Комментарий (обязательно)')
    .fill('Исправить замечания по креплениям');

  await page.getByRole('button', { name: 'Подтвердить переход' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(
    page.getByText('Исправить замечания по креплениям'),
  ).toBeVisible();

  expect((await readTask(task.id)).status).toBe('under revision');
});

test('filters persist in URL and date range uses Moscow time', async ({
  page,
}) => {
  const task = await createTask();

  await admin
    .from('Task')
    .update({ created_at: '2026-01-02T21:30:00Z' })
    .eq('id', task.id);

  await login(page);
  await page.goto(`/objects/${task.object}`);
  await page.getByRole('combobox', { name: 'Фильтр по исполнителю' }).click();
  await page
    .getByRole('option', { name: 'Алексей Козлов', exact: true })
    .click();

  await page.getByRole('combobox', { name: 'Фильтр по статусу' }).click();
  await page.getByRole('option', { name: 'Новая', exact: true }).click();
  await expect(page).toHaveURL(/status=new/);
  await expect(
    page.getByRole('combobox', { name: 'Фильтр по статусу' }),
  ).toHaveText('Новая');

  await page.getByLabel('Создана с', { exact: true }).fill('2026-01-03');
  await page.getByLabel('По', { exact: true }).fill('2026-01-03');
  await expect(
    page.getByRole('link', { name: (await readTask(task.id)).name }),
  ).toBeVisible();

  await page.reload();
  await expect(page.getByLabel('Создана с', { exact: true })).toHaveValue(
    '2026-01-03',
  );

  await expect(
    page.getByRole('combobox', { name: 'Фильтр по статусу' }),
  ).toHaveText('Новая');

  await page.getByRole('combobox', { name: 'Фильтр по статусу' }).click();
  await page.getByRole('option', { name: 'Принята', exact: true }).click();
  await expect(page.getByText('Ничего не найдено')).toBeVisible();
});

test('description draft survives reload and is isolated by user', async ({
  page,
}) => {
  const task = await createTask();

  await login(page);
  await page.goto(`/tasks/${task.id}`);
  await page
    .getByRole('button', { name: 'Редактировать', exact: true })
    .click();

  await page
    .getByLabel('Описание', { exact: true })
    .fill('Несохранённый черновик');

  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('crm-drafts-v1')))
    .toContain('Несохранённый черновик');

  await page.reload();
  await page
    .getByRole('button', { name: 'Редактировать', exact: true })
    .click();

  await expect(page.getByLabel('Описание', { exact: true })).toHaveValue(
    'Несохранённый черновик',
  );

  await page.getByRole('button', { name: 'Отмена', exact: true }).click();
  await page.getByRole('button', { name: 'Выйти', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'С возвращением' }),
  ).toBeVisible();

  await login(page, suppliers[1]);
  await page.goto(`/tasks/${task.id}`);
  await page
    .getByRole('button', { name: 'Редактировать', exact: true })
    .click();

  await expect(page.getByLabel('Описание', { exact: true })).toHaveValue(
    'Подготовить площадку и выполнить монтаж',
  );
});

test('saved draft is cleared and deletion removes task', async ({ page }) => {
  const task = await createTask();

  await login(page);
  await page.goto(`/tasks/${task.id}`);
  await page
    .getByRole('button', { name: 'Редактировать', exact: true })
    .click();

  await page
    .getByLabel('Описание', { exact: true })
    .fill('Сохранённое описание');

  await page.getByRole('button', { name: 'Сохранить изменения' }).click();
  await expect(
    page.getByText('Сохранённое описание', { exact: true }),
  ).toBeVisible();

  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('crm-drafts-v1')))
    .not.toContain('Сохранённое описание');

  await page
    .getByRole('button', { name: 'Удалить задачу', exact: true })
    .click();

  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Удалить задачу' })
    .click();

  await page.goto(`/tasks/${task.id}`);
  await expect(
    page.getByText('Задача не найдена', { exact: true }),
  ).toBeVisible();
});

test('mobile layout and theme switch survive refresh', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.getByRole('button', { name: 'Включить тёмную тему' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);

  await expect(
    page.getByRole('heading', { name: 'Объекты', exact: true }),
  ).toBeVisible();

  await expect(page.locator('main ul li').first()).toBeVisible();
  await page.screenshot({
    path: 'test-results/mobile-dark.png',
    fullPage: true,
  });
});

test('login failures are shown in Toast', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Электронная почта').fill(suppliers[0].email);
  await page.getByLabel('Пароль', { exact: true }).fill('wrong-password');
  await page.getByRole('button', { name: 'Войти в систему' }).click();
  await expect(page.getByText('Неверный email или пароль.')).toBeVisible();
});

test('unauthorized URL never reveals task details and logout clears access', async ({
  page,
}) => {
  const task = await createTask(undefined, assignees[1].id);

  await page.goto(`/tasks/${task.id}`);
  await expect(
    page.getByRole('heading', { name: 'С возвращением' }),
  ).toBeVisible();

  await login(page, assignees[0]);
  await page.goto(`/tasks/${task.id}`);
  await expect(
    page.getByText('Задача не найдена', { exact: true }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Выйти', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'С возвращением' }),
  ).toBeVisible();

  await page.goto('/my-tasks');
  await expect(
    page.getByRole('heading', { name: 'С возвращением' }),
  ).toBeVisible();
});

test('desktop overview screenshot', async ({ page }) => {
  await login(page);
  await expect(page.locator('main ul li').first()).toBeVisible();
  await page.screenshot({
    path: 'test-results/desktop-objects.png',
    fullPage: true,
  });
});
