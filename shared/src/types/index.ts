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