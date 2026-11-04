import 'dotenv/config';
import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

@Injectable()
export class SupabaseStorageService {
  private readonly logger = new Logger(SupabaseStorageService.name);
  private supabase: SupabaseClient | null = null;
  private readonly bucketName = 'ruby-document-images';

  constructor() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (url && key) {
      this.supabase = createClient(url, key, {
        auth: { persistSession: false },
      });
    }
  }

  async uploadDocumentImage(
    buffer: Buffer,
    mimeType: string,
    originalName: string,
    rentalId?: string,
  ): Promise<{ storageKey: string; bucket: string; publicUrl: string }> {
    const ext = originalName.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const folder = rentalId ? `document-images/${rentalId}` : 'document-images/temp';
    const storageKey = `${folder}/${fileName}`;

    if (this.supabase) {
      try {
        // Ensure bucket exists
        const { data: buckets } = await this.supabase.storage.listBuckets();
        if (!buckets?.some((b) => b.name === this.bucketName)) {
          await this.supabase.storage.createBucket(this.bucketName, { public: true });
        }

        const { error } = await this.supabase.storage
          .from(this.bucketName)
          .upload(storageKey, buffer, {
            contentType: mimeType,
            upsert: true,
          });

        if (!error) {
          const { data: pub } = this.supabase.storage
            .from(this.bucketName)
            .getPublicUrl(storageKey);
          return {
            storageKey,
            bucket: this.bucketName,
            publicUrl: pub.publicUrl,
          };
        }
        this.logger.warn(`Supabase storage upload warning: ${error.message}, using local fallback`);
      } catch (err) {
        this.logger.warn(`Supabase upload fallback to local: ${(err as Error).message}`);
      }
    }

    // Local fallback storage in uploads/
    const localDir = path.join(process.cwd(), 'uploads', folder);
    await fs.mkdir(localDir, { recursive: true });
    await fs.writeFile(path.join(localDir, fileName), buffer);

    return {
      storageKey,
      bucket: 'local-uploads',
      publicUrl: `/api/uploads/${storageKey}`,
    };
  }
}

