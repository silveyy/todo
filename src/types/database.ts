export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          avatar_url?: string | null;
          created_at?: string;
        };
      };
      lists: {
        Row: {
          id: string;
          title: string;
          owner_id: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          owner_id: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          owner_id?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      list_members: {
        Row: {
          list_id: string;
          user_id: string;
          role: Database['public']['Enums']['list_role'];
          invited_by: string | null;
          joined_at: string;
        };
        Insert: {
          list_id: string;
          user_id: string;
          role: Database['public']['Enums']['list_role'];
          invited_by?: string | null;
          joined_at?: string;
        };
        Update: {
          list_id?: string;
          user_id?: string;
          role?: Database['public']['Enums']['list_role'];
          invited_by?: string | null;
          joined_at?: string;
        };
      };
      invitations: {
        Row: {
          id: string;
          list_id: string;
          invited_by: string;
          email: string | null;
          token: string;
          role: Database['public']['Enums']['list_role'];
          accepted_at: string | null;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          list_id: string;
          invited_by: string;
          email?: string | null;
          token: string;
          role: Database['public']['Enums']['list_role'];
          accepted_at?: string | null;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          list_id?: string;
          invited_by?: string;
          email?: string | null;
          token?: string;
          role?: Database['public']['Enums']['list_role'];
          accepted_at?: string | null;
          expires_at?: string;
          created_at?: string;
        };
      };
      todos: {
        Row: {
          id: string;
          list_id: string;
          title: string;
          notes: string | null;
          completed: boolean;
          completed_at: string | null;
          completed_by: string | null;
          due_date: string | null;
          priority: Database['public']['Enums']['todo_priority'];
          position: number;
          created_by: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          list_id: string;
          title: string;
          notes?: string | null;
          completed?: boolean;
          completed_at?: string | null;
          completed_by?: string | null;
          due_date?: string | null;
          priority?: Database['public']['Enums']['todo_priority'];
          position?: number;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          list_id?: string;
          title?: string;
          notes?: string | null;
          completed?: boolean;
          completed_at?: string | null;
          completed_by?: string | null;
          due_date?: string | null;
          priority?: Database['public']['Enums']['todo_priority'];
          position?: number;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_user_role_in_list: {
        Args: {
          p_list_id: string;
          p_user_id: string;
        };
        Returns: string | null;
      };
    };
    Enums: {
      list_role: 'owner' | 'editor' | 'viewer';
      todo_priority: 'low' | 'medium' | 'high';
    };
    CompositeTypes: Record<string, never>;
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type TodoList = Database['public']['Tables']['lists']['Row'];
export type ListMember = Database['public']['Tables']['list_members']['Row'];
export type Invitation = Database['public']['Tables']['invitations']['Row'];
export type TodoItem = Database['public']['Tables']['todos']['Row'];
export type ListRole = Database['public']['Enums']['list_role'];
export type Priority = Database['public']['Enums']['todo_priority'];
