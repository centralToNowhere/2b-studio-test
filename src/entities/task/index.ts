import type { TaskDTO, TaskStateDTO, ProfileDTO } from '@/shared/api/dto';
export type TaskState = TaskStateDTO;
export const stateLabels: Record<TaskState, string> = {
  new: 'Новая',
  'in progress': 'В работе',
  'on review': 'На проверке',
  'under revision': 'На доработку',
  accepted: 'Принята',
};
export const states = Object.keys(stateLabels) as TaskState[];
export type Task = {
  id: string;
  name: string;
  description: string;
  objectId: string;
  assigneeId: string;
  authorId: string;
  createdAt: Date;
  status: TaskState;
  version: number;
};
export const toTask = (dto: TaskDTO): Task => ({
  id: dto.id,
  name: dto.name,
  description: dto.description ?? '',
  objectId: dto.object_id,
  assigneeId: dto.assignee_id,
  authorId: dto.author_id,
  createdAt: new Date(dto.created_at),
  status: dto.status,
  version: dto.version,
});

export function transitions(task: Task, user: ProfileDTO): TaskState[] {
  if (user.role === 'supplier') {
    return task.status === 'on review' ? ['accepted', 'under revision'] : [];
  }

  if (task.assigneeId !== user.id) {
    return [];
  }

  if (task.status === 'new' || task.status === 'under revision') {
    return ['in progress'];
  }

  return task.status === 'in progress' ? ['on review'] : [];
}
