import logger from '../config/logger';

/**
 * Unified field mapping and normalization service
 * Handles inconsistent field names from different CSV imports and data sources
 */

interface NormalizedUser {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  employeeId?: string;
  designation?: string;
  department?: string;
  address?: string;
  role?: string;
  status?: string;
  [key: string]: any; // Allow additional custom fields
}

export class FieldNormalizer {
  /**
   * Common field name variations mapping
   */
  private static readonly FIELD_ALIASES: Record<string, string[]> = {
    fullName: ['fullName', 'full_name', 'name', 'Name', 'Names', 'NAMES', 'fullname', 'FULL_NAME'],
    email: ['email', 'Email', 'EMAIL', 'mail', 'e_mail', 'emailAddress', 'email_address'],
    phone: ['phone', 'Phone', 'PHONE', 'telephone', 'tel', 'phoneNumber', 'phone_number', 'Phone '],
    employeeId: ['employeeId', 'employee_id', 'employee id', 'empId', 'emp_id', 'stateCode', 'State Code', 'STATE CODE', 'code', 'Code', 'id'],
    designation: ['designation', 'Designation', 'DESIGNATION', 'role', 'Role', 'ROLE', 'position', 'job_title', 'jobTitle'],
    department: ['department', 'Department', 'DEPARTMENT', 'dept', 'Dept', 'division', 'team'],
    address: ['address', 'Address', 'ADDRESS', 'location', 'street', 'city'],
    role: ['role', 'Role', 'ROLE', 'userRole', 'user_role'],
    status: ['status', 'Status', 'STATUS', 'active', 'state'],
  };

  /**
   * Normalize user data from any source to standard format
   * Handles CSV imports with varying field names
   */
  static normalize(userData: any, userId?: string): NormalizedUser {
    if (!userData) {
      return {
        id: userId || 'unknown',
        fullName: 'Unknown User'
      };
    }

    const normalized: NormalizedUser = {
      id: userId || 'unknown',
      fullName: 'Unknown User'
    };

    // Map each standard field by finding matching aliases
    Object.entries(this.FIELD_ALIASES).forEach(([standardField, aliases]) => {
      const value = this.findFieldValue(userData, aliases);
      if (value !== undefined && value !== null && value !== '') {
        normalized[standardField] = String(value).trim();
      }
    });

    // Always ensure fullName exists
    if (!normalized.fullName || normalized.fullName === 'Unknown User') {
      // Try to build name from parts
      const firstName = this.findFieldValue(userData, ['firstName', 'first_name', 'firstname']);
      const lastName = this.findFieldValue(userData, ['lastName', 'last_name', 'lastname', 'Surname', 'surname']);
      
      if (firstName) {
        normalized.fullName = lastName ? `${firstName} ${lastName}` : String(firstName);
      }
    }

    logger.debug('Field normalization result:', {
      input: Object.keys(userData),
      output: normalized
    });

    return normalized;
  }

  /**
   * Find a field value from userData using multiple possible names
   */
  private static findFieldValue(userData: any, aliases: string[]): any {
    for (const alias of aliases) {
      if (alias in userData) {
        return userData[alias];
      }
    }
    return undefined;
  }

  /**
   * Extract standard fields that should be displayed on ID card
   */
  static getDisplayFields(userData: any, visibleFields?: string[]): Record<string, string> {
    const normalized = this.normalize(userData);
    const display: Record<string, string> = {};

    // Default fields to display if none specified
    const defaultDisplay = ['fullName', 'employeeId', 'designation', 'department', 'email', 'phone'];
    const fieldsToShow = visibleFields || defaultDisplay;

    fieldsToShow.forEach(field => {
      if (normalized[field]) {
        display[field] = normalized[field];
      }
    });

    // Always include name and id at minimum
    if (!display.fullName) display.fullName = normalized.fullName;
    if (!display.employeeId && normalized.employeeId) display.employeeId = normalized.employeeId;

    return display;
  }

  /**
   * Get field value for verification display
   * Used when showing scan results
   */
  static getFieldForDisplay(userData: any, fieldType: 'name' | 'id' | 'role'): string {
    const normalized = this.normalize(userData);

    switch (fieldType) {
      case 'name':
        return normalized.fullName || 'Unknown';
      case 'id':
        return normalized.employeeId || 'N/A';
      case 'role':
        return normalized.designation || normalized.role || 'Member';
      default:
        return 'N/A';
    }
  }

  /**
   * Validate that essential fields exist
   */
  static validate(userData: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!userData.fullName && !userData.name && !userData.Names) {
      errors.push('Missing required field: name');
    }

    // Add more validation as needed
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default FieldNormalizer;
