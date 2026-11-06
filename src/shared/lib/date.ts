const dateFormat = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Moscow',
});

const timeFormat = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Moscow',
});

export const formatDate = (date: Date | string) =>
  dateFormat.format(new Date(date));
export const formatTime = (date: Date | string) =>
  timeFormat.format(new Date(date));

export function validDate(value: string | null) {
  return value &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value))
    ? value
    : undefined;
}
