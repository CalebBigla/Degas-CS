import { db } from '../config/database';
import logger from '../config/logger';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';

export interface AttendanceSession {
  id?: string;
  session_name: string;
  description?: string;
  start_time: string; // ISO 8601 datetime
  end_time: string; // ISO 8601 datetime
  grace_period_minutes: number;
  is_active: boolean;
  created_by: string; // admin user ID
  created_at?: string;
  updated_at?: string;
}

export interface AttendanceRecord {
  id?: string;
  session_id: string;
  core_user_id: string;
  checked_in_at: string;
  created_at?: string;
}

export interface AttendanceStats {
  totalUsers: number;
  attended: number;
  absent: number;
  attendanceRate: number;
}

class AttendanceService {
  /**
   * Create a new attendance session
   */
  async createSession(sessionData: AttendanceSession): Promise<AttendanceSession> {
    try {
      const sessionId = this.generateId();
      const now = new Date().toISOString();

      // Validate time window
      const startTime = new Date(sessionData.start_time);
      const endTime = new Date(sessionData.end_time);

      if (endTime <= startTime) {
        throw new Error('End time must be after start time');
      }

      // Extract session date from start_time
      const sessionDate = startTime.toISOString().split('T')[0]; // YYYY-MM-DD

      await db.run(
        `INSERT INTO attendance_sessions (
          id, name, session_name, description, session_date, start_time, end_time, 
          grace_period_minutes, is_active, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sessionId,
          sessionData.session_name, // Also set name for backward compatibility
          sessionData.session_name,
          sessionData.description || null,
          sessionDate,
          sessionData.start_time,
          sessionData.end_time,
          sessionData.grace_period_minutes || 0,
          sessionData.is_active ? 1 : 0,
          sessionData.created_by,
          now,
          now
        ]
      );

      const createdSession = await this.getSessionById(sessionId);
      logger.info(`Attendance session created: ${sessionId}`);
      return createdSession!;
    } catch (error) {
      logger.error('Error creating attendance session:', error);
      throw error;
    }
  }

  /**
   * Get session by ID
   */
  async getSessionById(sessionId: string): Promise<AttendanceSession | null> {
    try {
      const session = await db.get(
        'SELECT * FROM attendance_sessions WHERE id = ?',
        [sessionId]
      );
      return session || null;
    } catch (error) {
      logger.error('Error getting session by ID:', error);
      throw error;
    }
  }

  /**
   * Get all sessions
   */
  async getAllSessions(filters?: {
    isActive?: boolean;
    startDate?: string;
    endDate?: string;
  }): Promise<AttendanceSession[]> {
    try {
      let query = 'SELECT * FROM attendance_sessions WHERE 1=1';
      const params: any[] = [];

      if (filters?.isActive !== undefined) {
        query += ' AND is_active = ?';
        params.push(filters.isActive ? 1 : 0);
      }

      if (filters?.startDate) {
        query += ' AND start_time >= ?';
        params.push(filters.startDate);
      }

      if (filters?.endDate) {
        query += ' AND end_time <= ?';
        params.push(filters.endDate);
      }

      query += ' ORDER BY start_time DESC';

      const sessions = await db.all(query, params);
      return sessions;
    } catch (error) {
      logger.error('Error getting all sessions:', error);
      throw error;
    }
  }

  /**
   * Update session
   */
  async updateSession(sessionId: string, updates: Partial<AttendanceSession>): Promise<AttendanceSession> {
    try {
      const now = new Date().toISOString();
      const updateFields: string[] = [];
      const values: any[] = [];

      if (updates.session_name !== undefined) {
        updateFields.push('session_name = ?');
        values.push(updates.session_name);
      }

      if (updates.description !== undefined) {
        updateFields.push('description = ?');
        values.push(updates.description);
      }

      if (updates.start_time !== undefined) {
        updateFields.push('start_time = ?');
        values.push(updates.start_time);
      }

      if (updates.end_time !== undefined) {
        updateFields.push('end_time = ?');
        values.push(updates.end_time);
      }

      if (updates.grace_period_minutes !== undefined) {
        updateFields.push('grace_period_minutes = ?');
        values.push(updates.grace_period_minutes);
      }

      if (updates.is_active !== undefined) {
        updateFields.push('is_active = ?');
        values.push(updates.is_active ? 1 : 0);
      }

      updateFields.push('updated_at = ?');
      values.push(now);
      values.push(sessionId);

      await db.run(
        `UPDATE attendance_sessions SET ${updateFields.join(', ')} WHERE id = ?`,
        values
      );

      const updatedSession = await this.getSessionById(sessionId);
      logger.info(`Attendance session updated: ${sessionId}`);
      return updatedSession!;
    } catch (error) {
      logger.error('Error updating session:', error);
      throw error;
    }
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      // Delete attendance records first
      await db.run('DELETE FROM attendance_records WHERE session_id = ?', [sessionId]);
      
      // Delete audit logs
      await db.run('DELETE FROM attendance_audit_logs WHERE session_id = ?', [sessionId]);
      
      // Delete session
      await db.run('DELETE FROM attendance_sessions WHERE id = ?', [sessionId]);
      
      logger.info(`Attendance session deleted: ${sessionId}`);
    } catch (error) {
      logger.error('Error deleting session:', error);
      throw error;
    }
  }

  /**
   * Activate/deactivate session
   */
  async toggleSessionActive(sessionId: string, isActive: boolean): Promise<AttendanceSession> {
    return this.updateSession(sessionId, { is_active: isActive });
  }

  /**
   * Generate QR code for session
   */
  async generateSessionQR(sessionId: string): Promise<{ qrToken: string; qrImage: string }> {
    try {
      const session = await this.getSessionById(sessionId);
      
      if (!session) {
        throw new Error('Session not found');
      }

      // Calculate expiration (end_time + grace_period)
      const endTime = new Date(session.end_time);
      const gracePeriodMs = session.grace_period_minutes * 60 * 1000;
      const expirationTime = new Date(endTime.getTime() + gracePeriodMs);

      // Create QR payload
      const payload = {
        type: 'attendance',
        sessionId: session.id,
        sessionName: session.session_name,
        exp: Math.floor(expirationTime.getTime() / 1000) // Unix timestamp in seconds
      };

      // Sign with JWT
      const qrToken = jwt.sign(payload, process.env.QR_SECRET || 'default-secret', {
        algorithm: 'HS256'
      } as jwt.SignOptions);

      // Generate QR code image
      const qrImage = await QRCode.toDataURL(qrToken, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 300,
        margin: 2
      });

      logger.info(`Session QR generated: ${sessionId}`);
      return { qrToken, qrImage };
    } catch (error) {
      logger.error('Error generating session QR:', error);
      throw error;
    }
  }

  /**
   * Verify session QR token
   */
  verifySessionQR(qrToken: string): { valid: boolean; payload?: any; error?: string } {
    try {
      const payload = jwt.verify(qrToken, process.env.QR_SECRET || 'default-secret');
      
      if (typeof payload === 'object' && payload.type === 'attendance') {
        return { valid: true, payload };
      }

      return { valid: false, error: 'Invalid QR type' };
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        return { valid: false, error: 'QR code has expired' };
      }
      return { valid: false, error: 'Invalid QR code' };
    }
  }

  /**
   * Check in user to session
   */
  async checkInUser(sessionId: string, coreUserId: string): Promise<AttendanceRecord> {
    try {
      // Verify session exists and is active
      const session = await this.getSessionById(sessionId);
      
      if (!session) {
        throw new Error('Session not found');
      }

      if (!session.is_active) {
        throw new Error('Session is not active');
      }

      // Check time window
      const now = new Date();
      const startTime = new Date(session.start_time);
      const endTime = new Date(session.end_time);
      const gracePeriodMs = session.grace_period_minutes * 60 * 1000;
      const effectiveEndTime = new Date(endTime.getTime() + gracePeriodMs);

      if (now < startTime) {
        throw new Error('Session has not started yet');
      }

      if (now > effectiveEndTime) {
        throw new Error('Session has ended (grace period expired)');
      }

      // Check for duplicate check-in
      const existingRecord = await db.get(
        'SELECT id FROM attendance_records WHERE session_id = ? AND core_user_id = ?',
        [sessionId, coreUserId]
      );

      if (existingRecord) {
        throw new Error('Already checked in to this session');
      }

      // Create attendance record
      const checkedInAt = now.toISOString();

      const result = await db.run(
        `INSERT INTO attendance_records (session_id, core_user_id, checked_in_at, created_at)
         VALUES (?, ?, ?, ?)`,
        [sessionId, coreUserId, checkedInAt, checkedInAt]
      );

      const recordId = result.lastID?.toString();

      // Log in audit trail
      await this.logAuditEvent(sessionId, coreUserId, 'check_in', 'success', null);

      logger.info(`User checked in: ${coreUserId} to session ${sessionId}`);

      return {
        id: recordId,
        session_id: sessionId,
        core_user_id: coreUserId,
        checked_in_at: checkedInAt,
        created_at: checkedInAt
      };
    } catch (error: any) {
      // Log failed attempt
      await this.logAuditEvent(sessionId, coreUserId, 'check_in', 'failed', error.message);
      throw error;
    }
  }

  /**
   * Get attendance records for a session
   */
  async getSessionAttendance(sessionId: string): Promise<any[]> {
    try {
      const records = await db.all(
        `SELECT 
          ar.id,
          ar.session_id,
          ar.core_user_id,
          ar.checked_in_at,
          cu.email,
          cu.full_name,
          cu.phone
         FROM attendance_records ar
         JOIN core_users cu ON ar.core_user_id = cu.id
         WHERE ar.session_id = ?
         ORDER BY ar.checked_in_at ASC`,
        [sessionId]
      );

      return records;
    } catch (error) {
      logger.error('Error getting session attendance:', error);
      throw error;
    }
  }

  /**
   * Get absentees for a session
   */
  async getSessionAbsentees(sessionId: string): Promise<any[]> {
    try {
      const absentees = await db.all(
        `SELECT 
          cu.id,
          cu.email,
          cu.full_name,
          cu.phone,
          cu.created_at
         FROM core_users cu
         WHERE cu.id NOT IN (
           SELECT core_user_id 
           FROM attendance_records 
           WHERE session_id = ?
         )
         ORDER BY cu.full_name ASC`,
        [sessionId]
      );

      return absentees;
    } catch (error) {
      logger.error('Error getting session absentees:', error);
      throw error;
    }
  }

  /**
   * Get attendance statistics for a session
   */
  async getSessionStats(sessionId: string): Promise<AttendanceStats> {
    try {
      const totalUsers = await db.get(
        'SELECT COUNT(*) as count FROM core_users'
      );

      const attended = await db.get(
        'SELECT COUNT(*) as count FROM attendance_records WHERE session_id = ?',
        [sessionId]
      );

      const total = totalUsers?.count || 0;
      const attendedCount = attended?.count || 0;
      const absentCount = total - attendedCount;
      const rate = total > 0 ? (attendedCount / total) * 100 : 0;

      return {
        totalUsers: total,
        attended: attendedCount,
        absent: absentCount,
        attendanceRate: Math.round(rate * 100) / 100
      };
    } catch (error) {
      logger.error('Error getting session stats:', error);
      throw error;
    }
  }

  /**
   * Get user's attendance history
   */
  async getUserAttendanceHistory(coreUserId: string): Promise<any[]> {
    try {
      const history = await db.all(
        `SELECT 
          ar.id,
          ar.session_id,
          ar.checked_in_at,
          ats.session_name,
          ats.description,
          ats.start_time,
          ats.end_time
         FROM attendance_records ar
         JOIN attendance_sessions ats ON ar.session_id = ats.id
         WHERE ar.core_user_id = ?
         ORDER BY ar.checked_in_at DESC`,
        [coreUserId]
      );

      return history;
    } catch (error) {
      logger.error('Error getting user attendance history:', error);
      throw error;
    }
  }

  /**
   * Log audit event
   */
  private async logAuditEvent(
    sessionId: string,
    coreUserId: string,
    action: string,
    status: string,
    errorMessage: string | null
  ): Promise<void> {
    try {
      const logId = this.generateId();
      const now = new Date().toISOString();

      await db.run(
        `INSERT INTO attendance_audit_logs (id, session_id, core_user_id, action, status, error_message, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [logId, sessionId, coreUserId, action, status, errorMessage, now]
      );
    } catch (error) {
      logger.error('Error logging audit event:', error);
      // Don't throw - audit logging failure shouldn't break the main flow
    }
  }

  // Helper method
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default new AttendanceService();
