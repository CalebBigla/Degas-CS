import { useState } from 'react';
import { X, Download, Eye, Settings } from 'lucide-react';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface IDCardCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    uuid: string;
    data: Record<string, any>;
    photoUrl?: string;
  };
  table: {
    id: string;
    name: string;
    schema: Array<{
      id: string;
      name: string;
      type: string;
      required: boolean;
    }>;
  };
}

interface CustomizationOptions {
  format: 'jpeg' | 'pdf';
  visibleFields: {
    name: boolean;
    role: boolean;
    tableName: boolean;
    photo: boolean;
    department: boolean;
    email: boolean;
    customFields: Record<string, boolean>;
  };
  layout: 'standard' | 'compact' | 'detailed';
  theme: 'light' | 'dark' | 'corporate';
}

export function IDCardCustomizationModal({ isOpen, onClose, user, table }: IDCardCustomizationModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [customization, setCustomization] = useState<CustomizationOptions>({
    format: 'jpeg',
    visibleFields: {
      name: true,
      role: true,
      tableName: true,
      photo: true,
      department: true,
      email: false,
      customFields: {}
    },
    layout: 'standard',
    theme: 'light'
  });

  // Initialize custom fields from table schema
  useState(() => {
    const customFields: Record<string, boolean> = {};
    table.schema.forEach(field => {
      if (!['fullName', 'role', 'department', 'email'].includes(field.name)) {
        customFields[field.name] = false;
      }
    });
    setCustomization(prev => ({
      ...prev,
      visibleFields: {
        ...prev.visibleFields,
        customFields
      }
    }));
  });

  const handleFieldToggle = (field: keyof CustomizationOptions['visibleFields'] | string) => {
    if (field === 'customFields') return;
    
    setCustomization(prev => {
      if (typeof field === 'string' && field.startsWith('custom_')) {
        const customField = field.replace('custom_', '');
        return {
          ...prev,
          visibleFields: {
            ...prev.visibleFields,
            customFields: {
              ...prev.visibleFields.customFields,
              [customField]: !prev.visibleFields.customFields[customField]
            }
          }
        };
      }
      
      return {
        ...prev,
        visibleFields: {
          ...prev.visibleFields,
          [field]: !prev.visibleFields[field as keyof typeof prev.visibleFields]
        }
      };
    });
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError('');

    try {
      const token = localStorage.getItem('degas_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tables/${table.id}/users/${user.id}/card/custom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          format: customization.format,
          options: {
            visibleFields: customization.visibleFields,
            layout: customization.layout,
            theme: customization.theme
          }
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${user.data.fullName || user.uuid}_id_card.${customization.format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to generate ID card');
      }
    } catch (err) {
      setError('Failed to generate ID card');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Settings className="h-6 w-6 text-emerald" />
            <div>
              <h2 className="text-xl font-semibold text-charcoal">Customize ID Card</h2>
              <p className="text-sm text-gray-600">{user.data.fullName || 'Unknown User'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-crimson/10 border border-crimson/20 text-crimson px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Output Format</label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="format"
                  value="jpeg"
                  checked={customization.format === 'jpeg'}
                  onChange={(e) => setCustomization(prev => ({ ...prev, format: e.target.value as 'jpeg' | 'pdf' }))}
                  className="mr-2"
                />
                <span className="text-sm">JPEG Image</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="format"
                  value="pdf"
                  checked={customization.format === 'pdf'}
                  onChange={(e) => setCustomization(prev => ({ ...prev, format: e.target.value as 'jpeg' | 'pdf' }))}
                  className="mr-2"
                />
                <span className="text-sm">PDF Document</span>
              </label>
            </div>
          </div>

          {/* Visible Fields */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Visible Fields</label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={customization.visibleFields.name}
                  onChange={() => handleFieldToggle('name')}
                  className="mr-2 rounded border-gray-300 text-emerald focus:ring-emerald"
                />
                <span className="text-sm">Full Name</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={customization.visibleFields.photo}
                  onChange={() => handleFieldToggle('photo')}
                  className="mr-2 rounded border-gray-300 text-emerald focus:ring-emerald"
                />
                <span className="text-sm">Photo</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={customization.visibleFields.role}
                  onChange={() => handleFieldToggle('role')}
                  className="mr-2 rounded border-gray-300 text-emerald focus:ring-emerald"
                />
                <span className="text-sm">Role</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={customization.visibleFields.tableName}
                  onChange={() => handleFieldToggle('tableName')}
                  className="mr-2 rounded border-gray-300 text-emerald focus:ring-emerald"
                />
                <span className="text-sm">Table Name</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={customization.visibleFields.department}
                  onChange={() => handleFieldToggle('department')}
                  className="mr-2 rounded border-gray-300 text-emerald focus:ring-emerald"
                />
                <span className="text-sm">Department</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={customization.visibleFields.email}
                  onChange={() => handleFieldToggle('email')}
                  className="mr-2 rounded border-gray-300 text-emerald focus:ring-emerald"
                />
                <span className="text-sm">Email</span>
              </label>

              {/* Custom Fields */}
              {table.schema
                .filter(field => !['fullName', 'role', 'department', 'email'].includes(field.name))
                .map(field => (
                  <label key={field.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={customization.visibleFields.customFields[field.name] || false}
                      onChange={() => handleFieldToggle(`custom_${field.name}`)}
                      className="mr-2 rounded border-gray-300 text-emerald focus:ring-emerald"
                    />
                    <span className="text-sm capitalize">{field.name}</span>
                  </label>
                ))}
            </div>
          </div>

          {/* Layout Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Layout</label>
            <div className="flex space-x-4">
              {['standard', 'compact', 'detailed'].map(layout => (
                <label key={layout} className="flex items-center">
                  <input
                    type="radio"
                    name="layout"
                    value={layout}
                    checked={customization.layout === layout}
                    onChange={(e) => setCustomization(prev => ({ ...prev, layout: e.target.value as any }))}
                    className="mr-2"
                  />
                  <span className="text-sm capitalize">{layout}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Theme Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Theme</label>
            <div className="flex space-x-4">
              {['light', 'dark', 'corporate'].map(theme => (
                <label key={theme} className="flex items-center">
                  <input
                    type="radio"
                    name="theme"
                    value={theme}
                    checked={customization.theme === theme}
                    onChange={(e) => setCustomization(prev => ({ ...prev, theme: e.target.value as any }))}
                    className="mr-2"
                  />
                  <span className="text-sm capitalize">{theme}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Preview Section */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Eye className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Preview</span>
            </div>
            <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-500">ID Card preview will appear here</p>
              <p className="text-xs text-gray-400 mt-1">
                Format: {customization.format.toUpperCase()} • 
                Layout: {customization.layout} • 
                Theme: {customization.theme}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-6 py-2 bg-emerald text-white rounded-lg hover:bg-emerald/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isGenerating ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Generate & Download
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}