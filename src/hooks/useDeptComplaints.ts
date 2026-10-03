import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface DeptComplaint {
  id: string;
  ticket_number: string;
  department_id: string;
  dept_name: string;
  dept_slug: string;
  dept_color: string;
  dept_icon: string;
  citizen_name: string | null;
  citizen_phone: string | null;
  description: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  photo_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  resolution_note: string | null;
  resolution_photo: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  citizen_satisfied: boolean | null;
  citizen_verified_at: string | null;
}

export function useDeptComplaints(departmentId: string | null) {
  const [complaints, setComplaints] = useState<DeptComplaint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComplaints = useCallback(async (statusFilter?: string, searchQuery?: string) => {
    if (!departmentId) return;
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('dept_complaints')
        .select('*')
        .eq('department_id', departmentId)
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (searchQuery) {
        query = query.or(
          `ticket_number.ilike.%${searchQuery}%,citizen_name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`
        );
      }

      let { data, error: qErr } = await query;

      // If view doesn't exist, fall back to standard table query
      if (qErr) {
        console.warn('dept_complaints view query failed, falling back to direct table:', qErr.message);
        let fbQuery = supabase
          .from('complaints')
          .select('*, department:departments(*)')
          .eq('department_id', departmentId)
          .order('created_at', { ascending: false });

        if (statusFilter && statusFilter !== 'all') {
          fbQuery = fbQuery.eq('status', statusFilter);
        }
        if (searchQuery) {
          fbQuery = fbQuery.or(
            `ticket_number.ilike.%${searchQuery}%,citizen_name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`
          );
        }

        const { data: fbData, error: fbErr } = await fbQuery;
        if (fbErr) throw fbErr;

        data = (fbData || []).map((row: any) => ({
          ...row,
          dept_name: row.department?.name || '',
          dept_slug: row.department?.slug || '',
          dept_color: row.department?.color || '#16a34a',
          dept_icon: row.department?.icon || '🏢',
          resolution_note: null,
          resolution_photo: null,
          resolved_by: null,
          resolved_at: null,
          citizen_satisfied: null,
          citizen_verified_at: null,
        }));
      }

      setComplaints(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch complaints');
    } finally {
      setLoading(false);
    }
  }, [departmentId]);

  const resolveComplaint = useCallback(async (
    complaintId: string,
    note: string,
    photoFile: File | null,
    resolvedBy: string
  ): Promise<boolean> => {
    try {
      let photoUrl: string | null = null;

      if (photoFile) {
        const ext = photoFile.name.split('.').pop();
        const path = `resolutions/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('complaint-photos')
          .upload(path, photoFile, { upsert: false });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage
          .from('complaint-photos')
          .getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }

      // Insert resolution record
      const { error: resErr } = await supabase
        .from('resolutions')
        .insert({
          complaint_id: complaintId,
          admin_note: note,
          resolution_photo_url: photoUrl,
          resolved_by: resolvedBy,
        });
      if (resErr) throw resErr;

      // Update complaint status to resolved
      const { error: updErr } = await supabase
        .from('complaints')
        .update({ status: 'resolved', updated_at: new Date().toISOString() })
        .eq('id', complaintId);
      if (updErr) throw updErr;

      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resolve complaint');
      return false;
    }
  }, []);

  return { complaints, loading, error, fetchComplaints, resolveComplaint };
}
