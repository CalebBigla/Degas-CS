import { db } from '../config/database';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';

interface UserInput {
  name: string;
  phone: string;
  email: string;
  address: string;
  password: string;
  formId: string;
}

interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  formId: string;
  scanned: boolean;
  scannedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface LoginResult {
  id: string;
  email: string;
  name: string;
  formId: string;
}

/**
 * User Service - Handles all user operations with fixed schema
 * CRITICAL: Passwords are hashed with bcrypt, never stored in plain text
 */
class UserService {
  
  /**
   * Register a new user with all required fields
   * SAFE: Checks for duplicate email and phone before saving
   * SECURE: Password is hashed with bcrypt
   */
  async registerUser(data: UserInput): Promise<User> {
    const { name, phone, email, address, password, formId } = data;

    // Validate all required fields
    if (!name || !phone || !email || !address || !password || !formId) {
      throw new Error('All fields are required');
    }

    // Check for duplicate email
    const existingEmail = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingEmail) {
      throw new Error('Email already registered');
    }

    // Check for duplicate phone
    const existingPhone = await db.get('SELECT id FROM users WHERE phone = ?', [phone]);
    if (existingPhone) {
      throw new Error('Phone number already registered');
    }

    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const now = new Date().toISOString();

    // Insert new user (using lowercase column names for PostgreSQL compatibility)
    await db.run(
      `INSERT INTO users (id, name, phone, email, address, password, formid, scanned, scannedat, createdat, updatedat)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, name, phone, email, address, hashedPassword, formId, false, null, now, now]
    );

    logger.info('User registered successfully:', { userId, email });

    // Return user without password
    return {
      id: userId,
      name,
      phone,
      email,
      address,
      formId,
      scanned: false,
      scannedAt: null,
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Login user with email and password
   * SECURE: Compares hashed password using bcrypt
   */
  async loginUser(email: string, password: string): Promise<LoginResult> {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    // Find user by email
    const row: any = await db.get(
      'SELECT id, email, name, password, formid FROM users WHERE email = ?',
      [email]
    );

    if (!row) {
      logger.warn('Login failed: user not found', { email });
      throw new Error('Invalid email or password');
    }

    // Compare password using bcrypt
    const passwordMatch = await bcrypt.compare(password, row.password);

    if (!passwordMatch) {
      logger.warn('Login failed: password mismatch', { email });
      throw new Error('Invalid email or password');
    }

    logger.info('User logged in successfully:', { userId: row.id, email });

    // Return user data without password
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      formId: row.formid
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    const row: any = await db.get('SELECT * FROM users WHERE id = ?', [userId]);

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      address: row.address,
      formId: row.formid,
      scanned: Boolean(row.scanned),
      scannedAt: row.scannedat,
      createdAt: row.createdat,
      updatedAt: row.updatedat
    };
  }

  /**
   * Get all users by formId with fixed columns
   * Returns: Name, Phone, Email, Address, Scanned
   */
  async getUsersByFormId(formId: string): Promise<User[]> {
    const rows: any[] = await db.all(
      'SELECT * FROM users WHERE formid = ? ORDER BY createdat DESC',
      [formId]
    );

    if (!rows) {
      return [];
    }

    const users: User[] = rows.map(row => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      address: row.address,
      formId: row.formid,
      scanned: Boolean(row.scanned),
      scannedAt: row.scannedat,
      createdAt: row.createdat,
      updatedAt: row.updatedat
    }));

    return users;
  }

  /**
   * Mark user as scanned
   * CRITICAL: Sets scanned=true and scannedAt=NOW()
   */
  async markUserAsScanned(userId: string): Promise<void> {
    const now = new Date().toISOString();

    const result = await db.run(
      'UPDATE users SET scanned = ?, scannedat = ?, updatedat = ? WHERE id = ?',
      [true, now, now, userId]
    );

    if (result.changes === 0) {
      throw new Error('User not found');
    }

    logger.info('User marked as scanned:', { userId, scannedAt: now });
  }

  /**
   * Check if user already scanned
   */
  async isUserScanned(userId: string): Promise<boolean> {
    const row: any = await db.get('SELECT scanned FROM users WHERE id = ?', [userId]);

    if (!row) {
      throw new Error('User not found');
    }

    return Boolean(row.scanned);
  }

  /**
   * Get analytics for a form
   * Returns: totalUsers, scannedUsers, notScannedUsers, attendanceRate
   */
  async getFormAnalytics(formId: string): Promise<any> {
    const dbType = process.env.DATABASE_TYPE || 'sqlite';
    const scannedCondition = dbType === 'sqlite' ? 'scanned = 1' : 'scanned = true';
    const notScannedCondition = dbType === 'sqlite' ? 'scanned = 0' : 'scanned = false';
    
    const row: any = await db.get(
      `SELECT 
        COUNT(*) as totalUsers,
        SUM(CASE WHEN ${scannedCondition} THEN 1 ELSE 0 END) as scannedUsers,
        SUM(CASE WHEN ${notScannedCondition} THEN 1 ELSE 0 END) as notScannedUsers
       FROM users WHERE formid = ?`,
      [formId]
    );

    const totalUsers = row?.totalUsers || 0;
    const scannedUsers = row?.scannedUsers || 0;
    const notScannedUsers = row?.notScannedUsers || 0;
    const attendanceRate = totalUsers > 0 ? (scannedUsers / totalUsers) * 100 : 0;

    // Get scanned users list
    const scannedList: any[] = await db.all(
      dbType === 'sqlite'
        ? `SELECT id, name, email, phone, scannedat FROM users WHERE formid = ? AND scanned = 1 ORDER BY scannedat DESC`
        : `SELECT id, name, email, phone, scannedat FROM users WHERE formid = ? AND scanned = true ORDER BY scannedat DESC`,
      [formId]
    );

    return {
      totalUsers,
      scannedUsers,
      notScannedUsers,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      scannedList: scannedList || []
    };
  }

  /**
   * Get all forms for selection/display
   */
  async getAllForms(): Promise<any[]> {
    const dbType = process.env.DATABASE_TYPE || 'sqlite';
    const isActiveCondition = dbType === 'sqlite' ? 'is_active = 1' : 'is_active = true';
    
    const rows: any[] = await db.all(
      `SELECT id, name FROM form_definitions WHERE ${isActiveCondition} ORDER BY created_at DESC`,
      []
    );

    return rows || [];
  }
}

export default new UserService();
