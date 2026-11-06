import type { Database } from './database.types';
export type ObjectDTO = Database['public']['Tables']['Object']['Row'];
export type TaskDTO = Database['public']['Tables']['Task']['Row'];
export type TaskStatusDTO = Database['public']['Tables']['TaskStatus']['Row'];
export type TaskStatusCommentDTO =
  Database['public']['Tables']['TaskStatusComment']['Row'];
export type ProfileDTO = Database['public']['Tables']['Profile']['Row'];
export type TaskStateDTO = Database['public']['Enums']['TaskStatusState'];
