// Generated from the Supabase public schema. Do not edit manually.
// Regenerate: yarn db:types (local) or yarn db:types --remote (linked cloud project).

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      Object: {
        Row: {
          address: string;
          created_at: string;
          deleted_at: string | null;
          description: string;
          id: string;
          name: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          address: string;
          created_at?: string;
          deleted_at?: string | null;
          description?: string;
          id?: string;
          name: string;
          version?: number;
        };
        Update: {
          address?: string;
          created_at?: string;
          deleted_at?: string | null;
          description?: string;
          id?: string;
          name?: string;
          version?: number;
        };
        Relationships: [];
      };
      Profile: {
        Row: {
          id: string;
          name: string;
          role: string;
        };
        ComputedFields: never;
        Insert: {
          id: string;
          name: string;
          role: string;
        };
        Update: {
          id?: string;
          name?: string;
          role?: string;
        };
        Relationships: [];
      };
      Task: {
        Row: {
          assignee_id: string;
          author_id: string;
          created_at: string;
          deleted_at: string | null;
          description: string | null;
          id: string;
          name: string;
          object_id: string;
          status: Database['public']['Enums']['TaskStatusState'];
          version: number;
        };
        ComputedFields: never;
        Insert: {
          assignee_id: string;
          author_id: string;
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          object_id: string;
          status?: Database['public']['Enums']['TaskStatusState'];
          version?: number;
        };
        Update: {
          assignee_id?: string;
          author_id?: string;
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          object_id?: string;
          status?: Database['public']['Enums']['TaskStatusState'];
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'Task_object_id_fkey';
            columns: ['object_id'];
            isOneToOne: false;
            referencedRelation: 'Object';
            referencedColumns: ['id'];
          },
        ];
      };
      TaskStatus: {
        Row: {
          author_id: string;
          created_at: string;
          id: string;
          sequence: number;
          state: Database['public']['Enums']['TaskStatusState'];
          task_id: string;
        };
        ComputedFields: never;
        Insert: {
          author_id: string;
          created_at?: string;
          id?: string;
          sequence?: never;
          state?: Database['public']['Enums']['TaskStatusState'];
          task_id: string;
        };
        Update: {
          author_id?: string;
          created_at?: string;
          id?: string;
          sequence?: never;
          state?: Database['public']['Enums']['TaskStatusState'];
          task_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'TaskStatus_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'Task';
            referencedColumns: ['id'];
          },
        ];
      };
      TaskStatusComment: {
        Row: {
          author_id: string;
          comment: string;
          created_at: string;
          id: string;
          task_status_id: string;
        };
        ComputedFields: never;
        Insert: {
          author_id: string;
          comment?: string;
          created_at?: string;
          id?: string;
          task_status_id: string;
        };
        Update: {
          author_id?: string;
          comment?: string;
          created_at?: string;
          id?: string;
          task_status_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'TaskStatusComment_task_status_id_fkey';
            columns: ['task_status_id'];
            isOneToOne: true;
            referencedRelation: 'TaskStatus';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      archive_record: {
        Args: { p_id: string; p_kind: string; p_version: number };
        Returns: undefined;
      };
      change_task_status: {
        Args: {
          p_comment: string;
          p_state: Database['public']['Enums']['TaskStatusState'];
          p_task_id: string;
          p_version: number;
        };
        Returns: string;
      };
      save_object: {
        Args: {
          p_address: string;
          p_description: string;
          p_id: string;
          p_name: string;
          p_version: number;
        };
        Returns: string;
      };
      save_task: {
        Args: {
          p_assignee_id: string;
          p_description: string;
          p_id: string;
          p_name: string;
          p_object_id: string;
          p_version: number;
        };
        Returns: string;
      };
    };
    Enums: {
      TaskStatusState:
        'new' | 'in progress' | 'on review' | 'under revision' | 'accepted';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      TaskStatusState: [
        'new',
        'in progress',
        'on review',
        'under revision',
        'accepted',
      ],
    },
  },
} as const;
