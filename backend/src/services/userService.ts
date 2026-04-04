import { db } from '../config/sqlite';
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
    return new Promise((resolve, reject) => {
      const { name, phone, email, address, password, formId } = data;

      // Validate all required fields
      if (!name || !phone || !email || !address || !password || !formId) {
        return reject(new Error('All fields are required'));
      }

      // Check for duplicate email
      db.get('SELECT id FROM users WHERE email = ?', [email], async (err, row) => {
        if (err) {
          logger.error('Error checking duplicate email:', err);
          return reject(err);
        }

        if (row) {
          return reject(new Error('Email already registered'));
        }

        // Check for duplicate phone
        db.get('SELECT id FROM users WHERE phone = ?', [phone], async (err, row) => {
          if (err) {
            logger.error('Error checking duplicate phone:', err);
            return reject(err);
          }

          if (row) {
            return reject(new Error('Phone number already registered'));
          }

          try {
            // Hash password with bcrypt
            const hashedPassword = await bcrypt.hash(password, 10);
            const userId = uuidv4();
            const now = new Date().toISOString();

            // Insert new user (using lowercase column names for PostgreSQL compatibility)
            db.run(
              `INSERT INTO users (id, name, phone, email, address, password, formid, scanned, scannedat, createdat, updatedat)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [userId, name, phone, email, address, hashedPassword, formId, false, null, now, now],
              function(err) {
                if (err) {
                  logger.error('Error creating user:', err);
                  return reject(err);
                }

                logger.info('User registered successfully:', { userId, email });

                // Return user without password
                resolve({
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
                });
              }
            );
          } catch (hashError) {
            logger.error('Error hashing password:', hashError);
            reject(hashError);
          }
        });
      });
    });
  }

  /**
   * Login user with email and password
   * SECURE: Compares hashed password using bcrypt
   */
  async loginUser(email: string, password: string): Promise<LoginResult> {
    return new Promise((resolve, reject) => {
      if (!email || !password) {
        return reject(new Error('Email and password are required'));
      }

      // Find user by email
      db.get(
        'SELECT id, email, name, password, formid FROM users WHERE email = ?',
        [email],
        async (err, row: any) => {
          if (err) {
            logger.error('Error querying user:', err);
            return reject(err);
          }

          if (!row) {
            logger.warn('Login failed: user not found', { email });
            return reject(new Error('Invalid email or password'));
          }

          try {
            // Compare password using bcrypt
            const passwordMatch = await bcrypt.compare(password, row.password);

            if (!passwordMatch) {
              logger.warn('Login failed: password mismatch', { email });
              return reject(new Error('Invalid email or password'));
            }

            logger.info('User logged in successfully:', { userId: row.id, email });

            // Return user data without password
            resolve({
              id: row.id,
              email: row.email,
              name: row.name,
              formId: row.formid
            });
          } catch (compareError) {
            logger.error('Error comparing password:', compareError);
            reject(compareError);
          }
        }
      );
    });
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE id = ?',
        [userId],
        (err, row: any) => {
          if (err) {
            logger.error('Error querying user by id:', err);
            return reject(err);
          }

          if (!row) {
            return resolve(null);
          }

          resolve({
            id: row.id,
            name: row.name,
            phone: row.phone,
            email: row.email,
            address: row.address,
            formId: row.formId,
            scanned: Boolean(row.scanned),
            scannedAt: row.scannedAt,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt
          });
        }
      );
    });
  }

  /**
   * Get all users by formId with fixed columns
   * Returns: Name, Phone, Email, Address, Scanned
   */
  async getUsersByFormId(formId: string): Promise<User[]> {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM users WHERE formid = ? ORDER BY createdat DESC',
        [formId],
        (err, rows: any[]) => {
          if (err) {
            logger.error('Error querying users by formId:', err);
            return reject(err);
          }

          if (!rows) {
            return resolve([]);
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

          resolve(users);
        }
      );
    });
  }

  /**
   * Mark user as scanned
   * CRITICAL: Sets scanned=true and scannedAt=NOW()
   */
  async markUserAsScanned(userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();

      db.run(
        'UPDATE users SET scanned = true, scannedat = ?, updatedat = ? WHERE id = ?',
        [now, now, userId],
        function(err) {
          if (err) {
            logger.error('Error marking user as scanned:', err);
            return reject(err);
          }

          if (this.changes === 0) {
            return reject(new Error('User not found'));
          }

          logger.info('User marked as scanned:', { userId, scannedAt: now });
          resolve();
        }
      );
    });
  }

  /**
   * Check if user already scanned
   */
  async isUserScanned(userId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT scanned FROM users WHERE id = ?',
        [userId],
        (err, row: any) => {
          if (err) {
            logger.error('Error checking scanned status:', err);
            return reject(err);
          }

          if (!row) {
            return reject(new Error('User not found'));
          }

          resolve(Boolean(row.scanned));
        }
      );
    });
  }

  /**
   * Get analytics for a form
   * Returns: totalUsers, scannedUsers, notScannedUsers, attendanceRate
   */
  async getFormAnalytics(formId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT 
          COUNT(*) as totalUsers,
          SUM(CASE WHEN scanned = 1 THEN 1 ELSE 0 END) as scannedUsers,
          SUM(CASE WHEN scanned = 0 THEN 1 ELSE 0 END) as notScannedUsers
         FROM users WHERE formId = ?`,
        [formId],
        (err, row: any) => {
          if (err) {
            logger.error('Error getting form analytics:', err);
            return reject(err);
          }

          const totalUsers = row?.totalUsers || 0;
          const scannedUsers = row?.scannedUsers || 0;
          const notScannedUsers = row?.notScannedUsers || 0;
          const attendanceRate = totalUsers > 0 ? (scannedUsers / totalUsers) * 100 : 0;

          // Get scanned users list
          db.all(
            `SELECT id, name, email, phone, scannedat FROM users WHERE formid = ? AND scanned = true ORDER BY scannedat DESC`,
            [formId],
            (err, scannedList: any[]) => {
              if (err) {
                logger.error('Error getting scanned users list:', err);
                return reject(err);
              }

              resolve({
                totalUsers,
                scannedUsers,
                notScannedUsers,
                attendanceRate: Math.round(attendanceRate * 100) / 100,
                scannedList: scannedList || []
              });
            }
          );
        }
      );
    });
  }

  /**
   * Get all forms for selection/display
   */
  async getAllForms(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT id, name FROM form_definitions WHERE is_active = 1 ORDER BY created_at DESC',
        [],
        (err, rows: any[]) => {
          if (err) {
            logger.error('Error querying forms:', err);
            return reject(err);
          }

          resolve(rows || []);
        }
      );
    });
  }
}

export default new UserService();
