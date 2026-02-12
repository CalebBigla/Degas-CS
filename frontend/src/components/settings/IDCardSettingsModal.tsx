import { useState, useEffect } from 'react';
import { X, Save, Eye, Upload, Image as ImageIcon } from 'lucide-react';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface IDCardSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

interface IDCardSettings {
  name: string;
  visibleFields: {
    name: boolean;
    photo: boolean;
    idNumber: boolean;
    department: boolean;
    email: boolean;
    customFields: Record<string, boolean>;
  };
  layout: 'standard' | 'compact' | 'detailed';
  logoUrl?: string;
  backgroundTemplate: 'light' | 'dark' | 'corporate';
  fontSize: 'small' | 'medium' | 'large';
  qrPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export function IDCardSettingsModal({ isOpen, onClose, onSave }: IDCardSettingsModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<IDCardSettings>({
    name: 'Default Template',
    visibleFields: {
      name: true,
      photo: true,
      idNumber: false,
      department: false,
      email: false,
      customFields: {}
    },
    layout: 'standard',
    backgroundTemplate: 'light',
    fontSize: 'medium',
    qrPosition: 'bottom-right'
  });

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/settings/id-card');
      if (response.data.success && response.data.data) {
        const data = response.data.data;
        setSettings({
          name: data.name || 'Default Template',
          visibleFields: typeof data.visible_fields === 'string' 
            ? JSON.parse(data.visible_fields) 
            : data.visible_fields,
          layout: data.layout || 'standard',
          logoUrl: data.logo_url,
          backgroundTemplate: data.background_template || 'light',
          fontSize: data.font_size || 'medium',
          qrPosition: data.qr_position || 'bottom-right'
        });
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await api.put('/settings/id-card', {
        name: settings.name,
        visibleFields: settings.visibleFields,
        layout: settings.layout,
        logoUrl: settings.logoUrl,
        backgroundTemplate: settings.backgroundTemplate,
        fontSize: settings.fontSize,
        qrPosition: settings.qrPosition
      });
      
      toast.success('ID card settings saved successfully');
      onSave?.();
      onClose();
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      toast.error(error?.response?.data?.error || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleField = (field: keyof Omit<IDCardSettings['visibleFields'], 'customFields'>) => {
    setSettings(prev => ({
      ...prev,
      visibleFields: {
        ...prev.visibleFields,
        [field]: !prev.visibleFields[field]
      }
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-emerald/5 to-transparent">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald/10 rounded-lg">
              <ImageIcon className="h-6 w-6 text-emerald" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-charcoal">ID Card Design Settings</h2>
              <p className="text-sm text-gray-600">Customize the global ID card template</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Settings */}
              <div className="space-y-6">
                {/* Template Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={settings.name}
                    onChange={(e) => setSettings(prev => ({ ...prev, name: e.target.value }))}
                    className="input"
                    placeholder="e.g., Company Standard"
                  />
                </div>

                {/* Visible Fields */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Visible Fields
                  </label>
                  <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.visibleFields.name}
                        onChange={() => toggleField('name')}
                        className="w-4 h-4 text-emerald border-gray-300 rounded focus:ring-emerald"
                      />
                      <span className="text-sm text-gray-700">Full Name</span>
                    </label>
                    
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.visibleFields.photo}
                        disabled
                        className="w-4 h-4 text-emerald border-gray-300 rounded focus:ring-emerald opacity-50"
                      />
                      <span className="text-sm text-gray-700">Photo <span className="text-xs text-gray-500">(Required)</span></span>
                    </label>
                    
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.visibleFields.idNumber}
                        onChange={() => toggleField('idNumber')}
                        className="w-4 h-4 text-emerald border-gray-300 rounded focus:ring-emerald"
                      />
                      <span className="text-sm text-gray-700">ID Number</span>
                    </label>
                    
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.visibleFields.department}
                        onChange={() => toggleField('department')}
                        className="w-4 h-4 text-emerald border-gray-300 rounded focus:ring-emerald"
                      />
                      <span className="text-sm text-gray-700">Department</span>
                    </label>
                    
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.visibleFields.email}
                        onChange={() => toggleField('email')}
                        className="w-4 h-4 text-emerald border-gray-300 rounded focus:ring-emerald"
                      />
                      <span className="text-sm text-gray-700">Email Address</span>
                    </label>
                  </div>
                </div>

                {/* Layout */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Card Layout
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['standard', 'compact', 'detailed'] as const).map((layout) => (
                      <button
                        key={layout}
                        onClick={() => setSettings(prev => ({ ...prev, layout }))}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          settings.layout === layout
                            ? 'border-emerald bg-emerald/5 text-emerald'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-sm font-medium capitalize">{layout}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Background Template */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Background Theme
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['light', 'dark', 'corporate'] as const).map((theme) => (
                      <button
                        key={theme}
                        onClick={() => setSettings(prev => ({ ...prev, backgroundTemplate: theme }))}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          settings.backgroundTemplate === theme
                            ? 'border-emerald bg-emerald/5 text-emerald'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-sm font-medium capitalize">{theme}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Size */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Font Size
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['small', 'medium', 'large'] as const).map((size) => (
                      <button
                        key={size}
                        onClick={() => setSettings(prev => ({ ...prev, fontSize: size }))}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          settings.fontSize === size
                            ? 'border-emerald bg-emerald/5 text-emerald'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-sm font-medium capitalize">{size}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* QR Position */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    QR Code Position
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((position) => (
                      <button
                        key={position}
                        onClick={() => setSettings(prev => ({ ...prev, qrPosition: position }))}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          settings.qrPosition === position
                            ? 'border-emerald bg-emerald/5 text-emerald'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-sm font-medium capitalize">{position.replace('-', ' ')}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column - Preview */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Preview
                </label>
                <div className="bg-gray-100 rounded-lg p-6 border-2 border-dashed border-gray-300">
                  <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm mx-auto">
                    <div className="text-center space-y-4">
                      <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto flex items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-gray-400" />
                      </div>
                      
                      {settings.visibleFields.name && (
                        <div>
                          <p className={`font-bold text-charcoal ${
                            settings.fontSize === 'small' ? 'text-sm' :
                            settings.fontSize === 'large' ? 'text-xl' : 'text-base'
                          }`}>
                            John Doe
                          </p>
                        </div>
                      )}
                      
                      {settings.visibleFields.idNumber && (
                        <p className="text-sm text-gray-600">ID: EMP001</p>
                      )}
                      
                      {settings.visibleFields.department && (
                        <p className="text-sm text-gray-600">Engineering</p>
                      )}
                      
                      {settings.visibleFields.email && (
                        <p className="text-xs text-gray-500">john@company.com</p>
                      )}
                      
                      <div className="pt-4 border-t border-gray-200">
                        <div className="w-20 h-20 bg-gray-200 mx-auto rounded flex items-center justify-center">
                          <span className="text-xs text-gray-500">QR Code</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">Position: {settings.qrPosition}</p>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500 text-center mt-4">
                    Layout: {settings.layout} • Theme: {settings.backgroundTemplate}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn btn-primary flex items-center space-x-2"
          >
            {isSaving ? (
              <>
                <LoadingSpinner size="sm" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Settings</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
