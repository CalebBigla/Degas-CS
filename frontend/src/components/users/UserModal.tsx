import { useState, useEffect } from 'react';
import { X, Upload, User as UserIcon } from 'lucide-react';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface User {
  id?: string;
  fullName?: string;
  email?: string;
  employeeId?: string;
  role?: string;
  department?: string;
  status?: string;
  photoUrl?: string;
  [key: string]: any;
}

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User | null | any;
  onSave: (userData: Partial<User> | any) => Promise<void>;
  tableSchema?: Array<{
    id: string;
    name: string;
    type: string;
    required: boolean;
  }>;
}

export function UserModal({ isOpen, onClose, user, onSave, tableSchema }: UserModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Use tableSchema - it should always be provided
  const fields = tableSchema || [];

  useEffect(() => {
    if (user) {
      // Populate form with existing user data
      const initialData: Record<string, any> = {};
      fields.forEach(field => {
        initialData[field.name] = user[field.name] || '';
      });
      setFormData(initialData);
      setPhotoPreview(user.photoUrl || null);
    } else {
      // Initialize empty form
      const initialData: Record<string, any> = {};
      fields.forEach(field => {
        if (field.type === 'boolean') {
          initialData[field.name] = false;
        } else if (field.type === 'number') {
          initialData[field.name] = '';
        } else {
          initialData[field.name] = '';
        }
      });
      setFormData(initialData);
      setPhotoPreview(null);
    }
    setErrors({});
  }, [user, isOpen, tableSchema]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    let processedValue: any = value;
    
    if (type === 'checkbox') {
      processedValue = (e.target as HTMLInputElement).checked;
    } else if (type === 'number') {
      processedValue = value === '' ? '' : Number(value);
    }
    
    setFormData(prev => ({ ...prev, [name]: processedValue }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, photoFile: file }));
      const reader = new FileReader();
      reader.onload = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    fields.forEach(field => {
      if (field.required) {
        const value = formData[field.name];
        if (value === undefined || value === null || String(value).trim() === '') {
          newErrors[field.name] = `${field.name} is required`;
        }
      }
      
      // Email validation
      if (field.type === 'email' && formData[field.name]) {
        if (!/\S+@\S+\.\S+/.test(formData[field.name])) {
          newErrors[field.name] = 'Invalid email format';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const userData: any = { ...formData };
      
      // Remove photoFile from data (it's handled separately)
      delete userData.photoFile;

      if (formData.photoFile) {
        userData.photo = formData.photoFile;
      }

      if (user) {
        userData.id = user.id;
      }

      await onSave(userData);
      onClose();
    } catch (error) {
      console.error('Failed to save user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderField = (field: { id: string; name: string; type: string; required: boolean; options?: string[] }) => {
    const fieldValue = formData[field.name] || '';
    const hasError = !!errors[field.name];

    switch (field.type) {
      case 'email':
        return (
          <input
            type="email"
            name={field.name}
            value={fieldValue}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald focus:border-transparent ${
              hasError ? 'border-crimson' : 'border-gray-300'
            }`}
            placeholder={`Enter ${field.name}`}
          />
        );
      
      case 'number':
        return (
          <input
            type="number"
            name={field.name}
            value={fieldValue}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald focus:border-transparent ${
              hasError ? 'border-crimson' : 'border-gray-300'
            }`}
            placeholder={`Enter ${field.name}`}
          />
        );
      
      case 'date':
        return (
          <input
            type="date"
            name={field.name}
            value={fieldValue}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald focus:border-transparent ${
              hasError ? 'border-crimson' : 'border-gray-300'
            }`}
          />
        );
      
      case 'boolean':
        return (
          <div className="flex items-center h-10">
            <input
              type="checkbox"
              name={field.name}
              checked={!!fieldValue}
              onChange={handleInputChange}
              className="w-4 h-4 text-emerald border-gray-300 rounded focus:ring-emerald"
            />
            <span className="ml-2 text-sm text-gray-600">Yes</span>
          </div>
        );
      
      case 'select':
        return (
          <select
            name={field.name}
            value={fieldValue}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald focus:border-transparent ${
              hasError ? 'border-crimson' : 'border-gray-300'
            }`}
          >
            <option value="">Select {field.name}</option>
            {field.options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
      
      default: // text
        return (
          <input
            type="text"
            name={field.name}
            value={fieldValue}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald focus:border-transparent ${
              hasError ? 'border-crimson' : 'border-gray-300'
            }`}
            placeholder={`Enter ${field.name}`}
          />
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-charcoal">
            {user ? 'Edit User' : 'Add New User'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Photo Upload */}
          <div className="flex flex-col items-center space-y-4 pb-4 border-b border-gray-200">
            <div className="relative">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="User photo"
                  className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-200">
                  <UserIcon className="h-12 w-12 text-gray-400" />
                </div>
              )}
              <label className="absolute bottom-0 right-0 bg-emerald text-white p-2 rounded-full cursor-pointer hover:bg-emerald/90">
                <Upload className="h-4 w-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-sm text-gray-600">Click to upload photo</p>
          </div>

          {/* Dynamic Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((field) => (
              <div key={field.id} className={field.type === 'boolean' ? 'col-span-1' : ''}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.name} {field.required && <span className="text-crimson">*</span>}
                </label>
                {renderField(field)}
                {errors[field.name] && (
                  <p className="text-crimson text-xs mt-1">{errors[field.name]}</p>
                )}
              </div>
            ))}
          </div>

          {fields.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No fields defined for this table.</p>
              <p className="text-sm mt-2">Please configure the table schema first.</p>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || fields.length === 0}
              className="px-4 py-2 bg-emerald text-white rounded-lg hover:bg-emerald/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Saving...
                </>
              ) : (
                user ? 'Update User' : 'Create User'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}