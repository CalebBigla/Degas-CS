export interface Table {
  id: string;
  name: string;
  description?: string;
  schema: TableColumn[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TableColumn {
  id: string;
  name: string;
  type: 'text' | 'email' | 'number' | 'date' | 'select' | 'boolean';
  required: boolean;
  options?: string[]; // For select type
}

export interface DynamicUser {
  id: string;
  tableId: string;
  uuid: string; // For QR verification
  data: Record<string, any>; // JSONB data
  photoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTableRequest {
  name: string;
  description?: string;
  schema: Omit<TableColumn, 'id'>[];
}

export interface BulkImportRequest {
  tableId: string;
  data: Record<string, any>[];
}

export interface BulkDownloadRequest {
  tableId: string;
  userIds: string[];
}

export interface User {
  id: string;
  employeeId: string;
  fullName: string;
  email?: string;
  role: string;
  department?: string;
  status: 'active' | 'suspended' | 'revoked';
  photoUrl?: string;
  qrHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Admin {
  id: string;
  username: string;
  email: string;
  role: 'super_admin' | 'admin' | 'guard';
  lastLogin?: Date;
  createdAt: Date;
}

export interface AccessLog {
  id: string;
  userId?: string;
  scannerLocation?: string;
  accessGranted: boolean;
  scannedBy?: string;
  scanTimestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  user?: User;
  scannedByAdmin?: Admin;
}

export interface QRCode {
  id: string;
  userId: string;
  qrHash: string;
  hmacSignature: string;
  expiresAt?: Date;
  createdAt: Date;
}

export interface QRPayload {
  userId: string;
  timestamp: number;
  nonce: string;
}

export interface ScanResult {
  success: boolean;
  user?: User;
  message: string;
  accessGranted: boolean;
  tableInfo?: {
    id: string;
    name: string;
  };
  schema?: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  fieldValues?: Record<string, any>;
}

export interface BulkUploadResult {
  success: boolean;
  created: number;
  errors: Array<{
    row: number;
    message: string;
  }>;
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  todayScans: number;
  successfulScans: number;
  recentLogs: AccessLog[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  admin: Omit<Admin, 'id'>;
}

export interface CreateUserRequest {
  employeeId: string;
  fullName: string;
  email?: string;
  role: string;
  department?: string;
  photo?: File;
}

export interface UpdateUserRequest {
  id: string;
  employeeId: string;
  fullName: string;
  email?: string;
  role: string;
  department?: string;
  status?: 'active' | 'suspended' | 'revoked';
  photo?: File;
}

export interface VerifyQRRequest {
  qrData: string;
  scannerLocation?: string;
  scannedBy?: string;
  selectedTableId?: string;
}

export interface BulkUploadRow {
  employeeId: string;
  fullName: string;
  email?: string;
  role: string;
  department?: string;
}

// Scanner states for UI
export type ScannerState = 'idle' | 'scanning' | 'success' | 'denied' | 'error';

// Theme colors
export const COLORS = {
  charcoal: '#121212',
  charcoalLight: '#1e1e1e',
  emerald: '#10B981',
  emeraldLight: '#34D399',
  crimson: '#EF4444',
  crimsonLight: '#F87171',
} as const;

// ============================================
// CORE USER SYSTEM (Extension - Non-Breaking)
// ============================================

export interface CoreUser {
  id: string;
  email: string;
  role: 'user' | 'admin' | 'super_admin';
  status: 'active' | 'inactive' | 'suspended';
  qrToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserDataLink {
  id: number;
  coreUserId: string;
  tableName: string;
  recordId: string;
  createdAt: Date;
}

export interface FormDefinition {
  id: string;
  name: string;
  description?: string;
  targetTable: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  fields?: FormField[];
}

export interface FormField {
  id: string;
  formId: string;
  fieldName: string;
  fieldLabel: string;
  fieldType: 'text' | 'email' | 'password' | 'number' | 'date' | 'file' | 'camera' | 'select' | 'textarea';
  isRequired: boolean;
  isEmailField: boolean;
  isPasswordField: boolean;
  options?: string;
  placeholder?: string;
  orderIndex: number;
  createdAt: Date;
}

export interface AttendanceSession {
  id: string;
  name: string;
  description?: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  gracePeriodMinutes: number;
  isActive: boolean;
  qrCode?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttendanceRecord {
  id: number;
  coreUserId: string;
  sessionId: string;
  checkInTime: Date;
  method: string;
  location?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface OnboardingRequest {
  email: string;
  password: string;
  formData: Record<string, any>;
  targetTable: string;
}

export interface OnboardingResponse {
  success: boolean;
  userId: string;
  qrToken: string;
  qrCodeImage: string;
  message: string;
}

export interface AttendanceScanRequest {
  qrData: string;
  location?: string;
}

export interface AttendanceScanResponse {
  success: boolean;
  sessionName: string;
  checkInTime: Date;
  message: string;
}

export interface UserDashboardData {
  user: CoreUser;
  profileData: Record<string, any>;
  attendanceHistory: AttendanceRecord[];
  qrCodeImage: string;
  stats: {
    totalSessions: number;
    attended: number;
    missed: number;
    attendanceRate: number;
  };
}
