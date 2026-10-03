import { useState } from 'react';
import { supabase } from '../lib/supabase';

export function useStorage() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadPhoto = async (file: File): Promise<string | null> => {
    setUploading(true);
    setError(null);

    const ext = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const filePath = `complaints/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('complaint-photos')
      .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return null;
    }

    const { data } = supabase.storage.from('complaint-photos').getPublicUrl(filePath);
    setUploading(false);
    return data.publicUrl;
  };

  return { uploadPhoto, uploading, error };
}
