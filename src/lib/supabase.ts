import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://ywwkivrdjyaoovfsxnzp.supabase.co';
export const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'sb_publishable_sqCEWLArxZ9DCngFQtuXLw_iZJh2Kmw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      departments: {
        Row: Department;
        Insert: Omit<Department, 'id' | 'created_at'>;
        Update: Partial<Omit<Department, 'id'>>;
      };
      complaints: {
        Row: Complaint;
        Insert: Omit<Complaint, 'id' | 'created_at' | 'updated_at' | 'ticket_number'>;
        Update: Partial<Omit<Complaint, 'id' | 'created_at'>>;
      };
      resolutions: {
        Row: Resolution;
        Insert: Omit<Resolution, 'id' | 'resolved_at'>;
        Update: Partial<Omit<Resolution, 'id'>>;
      };
      verifications: {
        Row: Verification;
        Insert: Omit<Verification, 'id' | 'verified_at'>;
        Update: Partial<Omit<Verification, 'id'>>;
      };
    };
  };
};

export interface Department {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  is_active: boolean;
  created_at: string;
}

export type ComplaintStatus = 'pending' | 'in_progress' | 'resolved' | 'verified' | 'rejected';

export interface Complaint {
  id: string;
  ticket_number: string;
  department_id: string;
  citizen_name: string | null;
  citizen_phone: string | null;
  description: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  photo_url: string | null;
  status: ComplaintStatus;
  created_at: string;
  updated_at: string;
  // joined
  department?: Department;
}

export interface Resolution {
  id: string;
  complaint_id: string;
  admin_note: string;
  resolution_photo_url: string | null;
  resolved_by: string;
  resolved_at: string;
}

export interface Verification {
  id: string;
  complaint_id: string;
  verified_by: 'citizen' | 'admin';
  is_satisfied: boolean;
  note: string | null;
  verified_at: string;
}
