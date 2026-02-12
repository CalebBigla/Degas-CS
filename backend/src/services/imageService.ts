import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';

export class ImageService {
  private static readonly UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
  private static readonly MAX_WIDTH = 400;
  private static readonly MAX_HEIGHT = 400;
  private static readonly QUALITY = 85;

  static async processAndSaveImage(file: Express.Multer.File): Promise<string> {
    try {
      const filename = `${uuidv4()}.webp`;
      const outputPath = path.join(this.UPLOAD_DIR, filename);

      // Ensure upload directory exists
      await fs.mkdir(this.UPLOAD_DIR, { recursive: true });

      // Process image: resize, optimize, and convert to WebP
      await sharp(file.buffer || file.path)
        .resize(this.MAX_WIDTH, this.MAX_HEIGHT, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ quality: this.QUALITY })
        .toFile(outputPath);

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
      const filePath = path.join(this.UPLOAD_DIR, filename);
      await fs.unlink(filePath);
    } catch (error) {
      logger.warn('Failed to delete image:', error);
      // Don't throw error for file deletion failures
    }
  }

  static getImageUrl(filename: string): string {
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
}