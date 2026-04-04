/**
 * Event Model - Central Controller for all system activities
 * 
 * Events represent:
 * - Attendance sessions
 * - Registration opportunities
 * - Access events
 * 
 * All modules (scanner, check-in, registration) are scoped to events
 */

export interface FormField {
  id: string;
  form_id: string;
  field_name: string;
  field_label: string;
  field_type: 'text' | 'email' | 'password' | 'number' | 'date' | 'tel' | 'file' | 'camera' | 'select' | 'textarea';
  is_required: boolean;
  is_email_field?: boolean;
  is_password_field?: boolean;
  options?: string;
  order_index: number;
}

export interface Event {
  id: string;
  name: string;
  description?: string;
  date: string; // ISO 8601 date YYYY-MM-DD
  start_time: string; // ISO 8601 datetime
  end_time: string; // ISO 8601 datetime
  tableId: string; // Reference to dynamic table for user registration
  formId: string; // Reference to form definition
  formFields?: FormField[];
  isActive: boolean;
  allowCheckIn: boolean;
  gracePeriodMinutes?: number;
  createdBy: string; // Admin user ID
  createdAt: string;
  updatedAt: string;
}

export interface EventCreatePayload {
  name: string;
  description?: string;
  date: string;
  start_time: string;
  end_time: string;
  tableId: string;
  formId: string;
  isActive: boolean;
  allowCheckIn: boolean;
  gracePeriodMinutes?: number;
}

export interface EventStats {
  totalRegistered: number;
  totalCheckedIn: number;
  checkInRate: number;
  failedCheckIns: number;
}
