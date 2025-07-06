import { supabase } from '@/lib/supabase';

export interface UploadResult {
  url: string;
  path: string;
  publicUrl: string;
}

export interface UploadError {
  message: string;
  code?: string;
}

class StorageService {
  private readonly BUCKET_NAME = 'profile-images';
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  
  async initialize(): Promise<void> {
    try {
      console.log('🔄 Initializing storage service...');
      
      // Check if bucket exists, create if not
      console.log('📦 Checking if bucket exists...');
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        console.error('❌ Failed to list buckets:', listError);
        throw new Error(`Failed to list buckets: ${listError.message}`);
      }
      
      console.log('📦 Available buckets:', buckets?.map(b => b.name) || []);
      const bucketExists = buckets?.some(bucket => bucket.name === this.BUCKET_NAME);
      
      if (!bucketExists) {
        console.log('🆕 Creating new bucket:', this.BUCKET_NAME);
        const { error } = await supabase.storage.createBucket(this.BUCKET_NAME, {
          public: true,
          fileSizeLimit: this.MAX_FILE_SIZE,
          allowedMimeTypes: this.ALLOWED_TYPES
        });
        
        if (error) {
          console.error('❌ Failed to create storage bucket:', error);
          throw new Error(`Failed to create bucket: ${error.message}`);
        }
        
        console.log('✅ Created profile-images storage bucket');
      } else {
        console.log('✅ Bucket already exists:', this.BUCKET_NAME);
      }
    } catch (error) {
      console.error('❌ Storage initialization error:', error);
      throw error; // Re-throw to let the upload handler know
    }
  }
  
  async uploadProfileImage(userId: string, file: File, type: 'profile' | 'banner'): Promise<UploadResult> {
    console.log('🚀 Starting upload process...', { userId, fileName: file.name, fileSize: file.size, type });
    
    try {
      // Skip initialization for now - bucket should exist from migration
      // await this.initialize();
      console.log('⏭️ Skipping storage initialization (bucket should exist from migration)');
      
      // Validate file
      console.log('🔍 Validating file...');
      const validationError = this.validateFile(file);
      if (validationError) {
        console.error('❌ File validation failed:', validationError);
        throw new Error(validationError);
      }
      console.log('✅ File validation passed');
      
      // Optimize image if needed
      console.log('🔧 Optimizing image...');
      const optimizedFile = await this.optimizeImage(file);
      console.log('✅ Image optimized');
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${userId}/${type}_${Date.now()}.${fileExt}`;
      console.log('📝 Generated filename:', fileName);
      
      // Upload to Supabase Storage with timeout
      console.log('⬆️ Uploading to Supabase Storage...');
      
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Upload timeout after 30 seconds')), 30000)
      );
      
      // Race between upload and timeout
      const uploadPromise = supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, optimizedFile, {
          cacheControl: '3600',
          upsert: true // Replace if exists
        });
      
      const { data, error } = await Promise.race([uploadPromise, timeoutPromise]) as any;
      
      if (error) {
        console.error('❌ Upload error:', error);
        throw new Error(`Upload failed: ${error.message}`);
      }
      
      console.log('✅ Upload successful:', data);
      
      // Get public URL
      console.log('🔗 Getting public URL...');
      const { data: { publicUrl } } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(fileName);
      
      console.log('✅ Got public URL:', publicUrl);
      
      const result = {
        url: publicUrl,
        path: fileName,
        publicUrl
      };
      
      console.log('🎉 Upload completed successfully:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Failed to upload image:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to upload image. Please try again.');
    }
  }
  
  async deleteImage(path: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([path]);
      
      if (error) {
        console.error('Delete error:', error);
        // Don't throw - deletion failure shouldn't block updates
      }
    } catch (error) {
      console.error('Failed to delete image:', error);
      // Don't throw - deletion failure shouldn't block updates
    }
  }
  
  private validateFile(file: File): string | null {
    if (!file) {
      return 'No file provided';
    }
    
    if (file.size > this.MAX_FILE_SIZE) {
      return `File too large. Maximum size is ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`;
    }
    
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return 'Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.';
    }
    
    return null;
  }
  
  private async optimizeImage(file: File): Promise<File> {
    // For now, return the original file
    // In the future, we can add image compression/resizing here
    return file;
  }
  
  async getImageUrl(path: string): Promise<string> {
    const { data } = supabase.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(path);
    
    return data.publicUrl;
  }
}

export const storageService = new StorageService(); 