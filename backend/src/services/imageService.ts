import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';
// @ts-ignore: cloudinary types not available
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
const useCloudinary = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (useCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  logger.info('✅ Cloudinary configured for persistent file storage');
} else {
  logger.warn('⚠️  Cloudinary not configured - using local storage (ephemeral on Render)');
}

export class ImageService {
  private static readonly UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
  private static readonly MAX_WIDTH = 400;
  private static readonly MAX_HEIGHT = 400;
  private static readonly QUALITY = 85;

  static async processAndSaveImage(file: Express.Multer.File): Promise<string> {
    try {
      const filename = `${uuidv4()}.webp`;

      // Process image: resize, optimize, and convert to WebP
      const processedBuffer = await sharp(file.buffer || file.path)
        .resize(this.MAX_WIDTH, this.MAX_HEIGHT, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ quality: this.QUALITY })
        .toBuffer();

      // Upload to Cloudinary if configured
      if (useCloudinary) {
        return new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'degas-cs/user-photos',
              public_id: filename.replace('.webp', ''),
              format: 'webp',
              resource_type: 'image'
            },
            (error: any, result: any) => {
              if (error) {
                logger.error('Cloudinary upload failed:', error);
                reject(new Error('Failed to upload image to cloud storage'));
              } else {
                logger.info('Image uploaded to Cloudinary:', result?.secure_url);
                resolve(result!.secure_url);
              }
            }
          );
          uploadStream.end(processedBuffer);
        });
      }

      // Fallback to local storage
      const outputPath = path.join(this.UPLOAD_DIR, filename);
      await fs.mkdir(this.UPLOAD_DIR, { recursive: true });
      await fs.writeFile(outputPath, processedBuffer);

      // Clean up original file if it was saved to disk
      if (file.path) {
        try {
          await fs.unlink(file.path);
        } catch (error) {
          logger.warn('Failed to clean up original file:', error);
        }
      }

      return filename;
    } catch (error) {
      logger.error('Image processing failed:', error);
      throw new Error('Failed to process image');
    }
  }

  static async deleteImage(filename: string): Promise<void> {
    try {
      // If it's a Cloudinary URL, extract public_id and delete from Cloudinary
      if (filename.includes('cloudinary.com')) {
        const publicId = this.extractCloudinaryPublicId(filename);
        if (publicId && useCloudinary) {
          await cloudinary.uploader.destroy(publicId);
          logger.info('Image deleted from Cloudinary:', publicId);
          return;
        }
      }

      // Otherwise delete from local storage
      const filePath = path.join(this.UPLOAD_DIR, filename);
      await fs.unlink(filePath);
    } catch (error) {
      logger.warn('Failed to delete image:', error);
      // Don't throw error for file deletion failures
    }
  }

  static getImageUrl(filename: string): string {
    // If it's already a full URL (Cloudinary), return as-is
    if (filename.startsWith('http://') || filename.startsWith('https://')) {
      return filename;
    }
    // Otherwise return local path
    return `/uploads/${filename}`;
  }

  static async validateImage(file: Express.Multer.File): Promise<boolean> {
    try {
      const metadata = await sharp(file.buffer || file.path).metadata();
      
      // Check if it's a valid image
      if (!metadata.width || !metadata.height) {
        return false;
      }

      // Check reasonable dimensions
      if (metadata.width > 2000 || metadata.height > 2000) {
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Image validation failed:', error);
      return false;
    }
  }

  private static extractCloudinaryPublicId(url: string): string | null {
    try {
      // Extract public_id from Cloudinary URL
      // Format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{public_id}.{format}
      const match = url.match(/\/degas-cs\/user-photos\/([^.]+)/);
      return match ? `degas-cs/user-photos/${match[1]}` : null;
    } catch (error) {
      logger.error('Failed to extract Cloudinary public_id:', error);
      return null;
    }
  }
}