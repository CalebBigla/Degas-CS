// Core User System Types (Extension - does not affect existing dynamic tables)

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
