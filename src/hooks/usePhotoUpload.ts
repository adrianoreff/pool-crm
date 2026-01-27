import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface PhotoUploadResult {
  url: string;
  thumbnail_url?: string;
  id: string;
}

export function usePhotoUpload() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const uploadPhoto = async (
    file: File,
    appointmentId: string
  ): Promise<PhotoUploadResult | null> => {
    setIsUploading(true);
    try {
      // Compress image if needed (basic check - could use browser-image-compression library)
      const maxSize = 5 * 1024 * 1024; // 5MB
      let fileToUpload = file;

      if (file.size > maxSize) {
        // Simple compression using canvas (basic implementation)
        const compressed = await compressImage(file);
        fileToUpload = compressed;
      }

      // Generate unique filename
      const fileExt = fileToUpload.name.split('.').pop();
      const fileName = `${appointmentId}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('appointment-photos')
        .upload(fileName, fileToUpload, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('appointment-photos')
        .getPublicUrl(fileName);

      // Create thumbnail (simplified - in production, generate actual thumbnail)
      const thumbnailUrl = publicUrl;

      // Insert record in appointment_photos table
      const { data: photoRecord, error: insertError } = await supabase
        .from('appointment_photos')
        .insert({
          appointment_id: appointmentId,
          url: publicUrl,
          thumbnail_url: thumbnailUrl,
          uploaded_by: profile?.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast({ title: 'Photo uploaded successfully' });

      return {
        url: publicUrl,
        thumbnail_url: thumbnailUrl,
        id: photoRecord.id,
      };
    } catch (error: any) {
      console.error('Photo upload error:', error);
      toast({
        title: 'Failed to upload photo',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadPhoto, isUploading };
}

// Basic image compression using canvas
async function compressImage(file: File, maxWidth = 1920, quality = 0.8): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          file.type,
          quality
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
