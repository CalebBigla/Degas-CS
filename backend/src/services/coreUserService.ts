import { getDatabase } from '../config/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import logger from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

const CORE_USER_JWT_SECRET = process.env.CORE_USER_JWT_SECRET || 'core-user-secret-change-in-production';
const CORE_USER_JWT_EXPIRES_IN = process.env.CORE_USER_JWT_EXPIRES_IN || '7d';

export interface CoreUser {
  id: string;
  email: string;
  role: 'user' | 'admin' | 'super_admin';
  status: 'active' | 'inactive' | 'suspended';
  qrToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCoreUserParams {
  email: string;
  password: string;
  role?: 'user' | 'admin' | 'super_admin';
  status?: 'active' | 'inactive' | 'suspended';
}

export interface CoreUserLoginResult {
  user: CoreUser;
  token: string;
  qrToken: string;
}

/**
 * Core User Service - Handles authentication for end users
 * Separate from admin authentication system
 */
export class CoreUserService {
  /**
   * Create a new core user
   */
  static async createUser(params: CreateCoreUserParams): Promise<CoreUser> {
    const db = getDatabase();
    const dbType = process.env.DATABASE_TYPE || 'sqlite';

    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(params.email)) {
        throw new Error('Invalid email format');
      }

      // Check if email already exists
      const existing = await db.get(
        'SELECT id FROM core_users WHERE email = ?',
        [params.email.toLowerCase()]
      );

      if (existing) {
        throw new Error('Email already registered');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(params.password, 10);

      // Generate QR token
      const qrToken = uuidv4();

      // Create user
      const userId = uuidv4();
      const role = params.role || 'user';
      const status = params.status || 'active';

      if (dbType === 'sqlite') {
        await db.run(
          `INSERT INTO core_users (id, email, password, role, status, qr_token, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
          [userId, params.email.toLowerCase(), hashedPassword, role, status, qrToken]
        );
      } else {
        await db.run(
          `INSERT INTO core_users (id, email, password, role, status, qr_token, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
          [userId, params.email.toLowerCase(), hashedPassword, role, status, qrToken]
        );
      }

      logger.info('✅ Core user created', { userId, email: params.email, role });

      return {
        id: userId,
        email: params.email.toLowerCase(),
        role,
        status,
        qrToken,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      logger.error('❌ Failed to create core user:', error);
      throw error;
    }
  }

  /**
   * Authenticate user with email and password
   */
  static async login(email: string, password: string): Promise<CoreUserLoginResult> {
    const db = getDatabase();

    try {
      // Find user by email
      const user = await db.get(
        'SELECT * FROM core_users WHERE email = ?',
        [email.toLowerCase()]
      );

      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check if user is active
      if (user.status !== 'active') {
        throw new Error('Account is not active');
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          type: 'core_user'
        },
        CORE_USER_JWT_SECRET,
        { expiresIn: CORE_USER_JWT_EXPIRES_IN } as jwt.SignOptions
      );

      logger.info('✅ Core user logged in', { userId: user.id, email: user.email });

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.status,
          qrToken: user.qr_token,
          createdAt: new Date(user.created_at),
          updatedAt: new Date(user.updated_at)
        },
        token,
        qrToken: user.qr_token
      };
    } catch (error) {
      logger.error('❌ Core user login failed:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<CoreUser | null> {
    const db = getDatabase();

    try {
      const user = await db.get(
        'SELECT id, email, role, status, qr_token, created_at, updated_at FROM core_users WHERE id = ?',
        [userId]
      );

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        qrToken: user.qr_token,
        createdAt: new Date(user.created_at),
        updatedAt: new Date(user.updated_at)
      };
    } catch (error) {
      logger.error('❌ Failed to get core user:', error);
      throw error;
    }
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string): Promise<CoreUser | null> {
    const db = getDatabase();

    try {
      const user = await db.get(
        'SELECT id, email, role, status, qr_token, created_at, updated_at FROM core_users WHERE email = ?',
        [email.toLowerCase()]
      );

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        qrToken: user.qr_token,
        createdAt: new Date(user.created_at),
        updatedAt: new Date(user.updated_at)
      };
    } catch (error) {
      logger.error('❌ Failed to get core user by email:', error);
      throw error;
    }
  }

  /**
   * Get user by QR token
   */
  static async getUserByQRToken(qrToken: string): Promise<CoreUser | null> {
    const db = getDatabase();

    try {
      const user = await db.get(
        'SELECT id, email, role, status, qr_token, created_at, updated_at FROM core_users WHERE qr_token = ?',
        [qrToken]
      );

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        qrToken: user.qr_token,
        createdAt: new Date(user.created_at),
        updatedAt: new Date(user.updated_at)
      };
    } catch (error) {
      logger.error('❌ Failed to get core user by QR token:', error);
      throw error;
    }
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token: string): { userId: string; email: string; role: string } {
    try {
      const decoded = jwt.verify(token, CORE_USER_JWT_SECRET) as any;
      
      if (decoded.type !== 'core_user') {
        throw new Error('Invalid token type');
      }

      return {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role
      };
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Update user status
   */
  static async updateStatus(userId: string, status: 'active' | 'inactive' | 'suspended'): Promise<void> {
    const db = getDatabase();
    const dbType = process.env.DATABASE_TYPE || 'sqlite';

    try {
      if (dbType === 'sqlite') {
        await db.run(
          `UPDATE core_users SET status = ?, updated_at = datetime('now') WHERE id = ?`,
          [status, userId]
        );
      } else {
        await db.run(
          `UPDATE core_users SET status = $1, updated_at = NOW() WHERE id = $2`,
          [status, userId]
        );
      }

      logger.info('✅ Core user status updated', { userId, status });
    } catch (error) {
      logger.error('❌ Failed to update core user status:', error);
      throw error;
    }
  }

  /**
   * List all core users (admin only)
   */
  static async listUsers(page: number = 1, limit: number = 20): Promise<{ users: CoreUser[]; total: number }> {
    const db = getDatabase();
    const offset = (page - 1) * limit;

    try {
      const users = await db.all(
        `SELECT id, email, role, status, qr_token, created_at, updated_at 
         FROM core_users 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`,
        [limit, offset]
      );

      const countResult = await db.get('SELECT COUNT(*) as count FROM core_users');
      const total = countResult?.count || 0;

      return {
        users: users.map((user: any) => ({
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.status,
          qrToken: user.qr_token,
          createdAt: new Date(user.created_at),
          updatedAt: new Date(user.updated_at)
        })),
        total
      };
    } catch (error) {
      logger.error('❌ Failed to list core users:', error);
      throw error;
    }
  }
}

export default CoreUserService;
