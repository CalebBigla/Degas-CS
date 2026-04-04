import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const target = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - target.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  return formatDate(date);
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return 'text-emerald bg-emerald/10 border-emerald/20';
    case 'suspended':
      return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    case 'revoked':
      return 'text-crimson bg-crimson/10 border-crimson/20';
    default:
      return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
  }
}

export function getAccessStatusColor(granted: boolean): string {
  return granted
    ? 'text-emerald bg-emerald/10 border-emerald/20'
    : 'text-crimson bg-crimson/10 border-crimson/20';
}

export function downloadFile(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateEmployeeId(id: string): boolean {
  // Allow alphanumeric characters, hyphens, and underscores
  const idRegex = /^[a-zA-Z0-9_-]+$/;
  return idRegex.test(id) && id.length >= 3 && id.length <= 20;
}

export function generateCSVTemplate(): string {
  const headers = ['employeeId', 'fullName', 'email', 'role', 'department'];
  const sampleData = [
    'EMP001,John Doe,john.doe@company.com,Software Engineer,IT',
    'EMP002,Jane Smith,jane.smith@company.com,HR Manager,Human Resources',
    'EMP003,Mike Johnson,mike.johnson@company.com,Security Guard,Security'
  ];
  
  return [headers.join(','), ...sampleData].join('\n');
}

export function parseCSVFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          reject(new Error('CSV file must contain at least a header and one data row'));
          return;
        }
        
        const headers = lines[0].split(',').map(h => h.trim());
        const data = lines.slice(1).map((line, index) => {
          const values = line.split(',').map(v => v.trim());
          const row: any = {};
          
          headers.forEach((header, i) => {
            row[header] = values[i] || '';
          });
          
          row._rowNumber = index + 2; // +2 because we start from line 2 (after header)
          return row;
        });
        
        resolve(data);
      } catch (error) {
        reject(new Error('Failed to parse CSV file'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read CSV file'));
    };
    
    reader.readAsText(file);
  });
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}