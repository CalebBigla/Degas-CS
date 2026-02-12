import { useState, useEffect } from 'react';
import { X, Save, Settings } from 'lucide-react';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface TableIDCardCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableId: string;
  tableName: string;
  tableSchema: Array<{
    id: string;
    name: string;
    type: string;
    required: boolean;
  }>;
}

interface IDCardConfig {
  visibleFields: string[];
  showPhoto: boolean;
  layout: 'standard' | 'compact' | 'detailed';
  theme: 'light' | 'dark' | 'corporate';
  fontSize: 'small' | 'medium' | 'large';
  qrPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export function TableIDCardCustomizationModal({
  isOpen,
  onClose,
  tableId,
  tableName,
  tableSchema
}: TableIDCardCustomizationModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState<IDCardConfig>({
    visibleFields: [],
    showPhoto: true,
    layout: 'standard',
    theme: 'light',
    fontSize: 'medium',
    qrPosition: 'bottom-right'
  });

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
    }
  }, [isOpen, tableId]);

  const fetchConfig = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/tables/${tableId}/id-card-config`);
      if (response.data.success && response.data.data) {
        setConfig(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch config:', error);
      // Set default: all fields visible
      setConfig({
        visibleFields: tableSchema.map(col => col.name),
        showPhoto: true,
        layout: 'standard',
        theme: 'light',
        fontSize: 'medium',
        qrPosition: 'bottom-right'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await api.put(`/tables/${tableId}/id-card-config`, config);
      
      toast.success('ID card customization saved successfully');
      onClose();
    } catch (error: any) {
      console.error('Failed to save config:', error);
      toast.error(error?.response?.data?.error || 'Failed to save customization');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleField = (fieldName: string) => {
    setConfig(prev => ({
      ...prev,
      visibleFields: prev.visibleFields.includes(fieldName)
        ? prev.visibleFields.filter(f => f !== fieldName)
        : [...prev.visibleFields, fieldName]
    }));
  };

  const selectAll = () => {
    setConfig(prev => ({
      ...prev,
      visibleFields: tableSchema.map(col => col.name)
    }));
  };

  const deselectAll = () => {
    setConfig(prev => ({
      ...prev,
      visibleFields: []
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-deep-blue/5 to-transparent">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-deep-blue/10 rounded-lg">
              <Settings className="h-6 w-6 text-deep-blue" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-charcoal">Customize ID Cards</h2>
              <p className="text-sm text-gray-600">Table: {tableName}</p>
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
            <div className="space-y-6">
              {/* Column Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-gray-700">
                    Select Fields to Display on ID Card
                  </label>
                  <div className="flex space-x-2">
                    <button
                      onClick={selectAll}
                      className="text-xs text-deep-blue hover:text-navy-blue"
                    >
                      Select All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={deselectAll}
                      className="text-xs text-gray-600 hover:text-gray-800"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2 max-h-64 overflow-y-auto">
                  {tableSchema.map((column) => (
                    <label
                      key={column.id}
                      className="flex items-center space-x-3 cursor-pointer hover:bg-white p-2 rounded transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={config.visibleFields.includes(column.name)}
                        onChange={() => toggleField(column.name)}
                        className="w-4 h-4 text-deep-blue border-gray-300 rounded focus:ring-deep-blue"
                      />
                      <span className="text-sm text-gray-700 flex-1">{column.name}</span>
                      <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                        {column.type}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {config.visibleFields.length} of {tableSchema.length} fields selected
                </p>
              </div>

              {/* Photo Option */}
              <div>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showPhoto}
                    onChange={(e) => setConfig(prev => ({ ...prev, showPhoto: e.target.checked }))}
                    className="w-4 h-4 text-deep-blue border-gray-300 rounded focus:ring-deep-blue"
                  />
                  <span className="text-sm font-semibold text-gray-700">Show Photo on ID Card</span>
                </label>
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
                      onClick={() => setConfig(prev => ({ ...prev, layout }))}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        config.layout === layout
                          ? 'border-deep-blue bg-deep-blue/5 text-deep-blue'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-sm font-medium capitalize">{layout}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Card Theme
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['light', 'dark', 'corporate'] as const).map((theme) => (
                    <button
                      key={theme}
                      onClick={() => setConfig(prev => ({ ...prev, theme }))}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        config.theme === theme
                          ? 'border-deep-blue bg-deep-blue/5 text-deep-blue'
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
                      onClick={() => setConfig(prev => ({ ...prev, fontSize: size }))}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        config.fontSize === size
                          ? 'border-deep-blue bg-deep-blue/5 text-deep-blue'
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
                      onClick={() => setConfig(prev => ({ ...prev, qrPosition: position }))}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        config.qrPosition === position
                          ? 'border-deep-blue bg-deep-blue/5 text-deep-blue'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-sm font-medium capitalize">{position.replace('-', ' ')}</span>
                    </button>
                  ))}
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
            disabled={isSaving || config.visibleFields.length === 0}
            className="btn btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <LoadingSpinner size="sm" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Customization</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
