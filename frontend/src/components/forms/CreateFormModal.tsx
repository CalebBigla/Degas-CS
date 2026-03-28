import { useState, useEffect } from 'react';
import { X, Plus, Trash2, GripVertical } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface FormField {
  field_name: string;
  field_label: string;
  field_type: string;
  is_required: boolean;
  is_email_field: boolean;
  is_password_field: boolean;
  order_index: number;
  placeholder?: string;
  options?: string;
}

interface CreateFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingForm?: any;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'password', label: 'Password' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'select', label: 'Dropdown' },
  { value: 'file', label: 'File Upload' },
  { value: 'camera', label: 'Camera' }
];

export function CreateFormModal({ isOpen, onClose, onSuccess, editingForm }: CreateFormModalProps) {
  const [formName, setFormName] = useState('');
  const [description, setDescription] = useState('');
  const [targetTable, setTargetTable] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [fields, setFields] = useState<FormField[]>([]);
  const [tables, setTables] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTables();
      if (editingForm) {
        setFormName(editingForm.form_name);
        setDescription(editingForm.description || '');
        setTargetTable(editingForm.target_table);
        setIsActive(editingForm.is_active);
        setFields(editingForm.fields || []);
      } else {
        resetForm();
      }
    }
  }, [isOpen, editingForm]);

  const loadTables = async () => {
    try {
      const response = await api.get('/tables');
      const tableNames = response.data.data.map((t: any) => t.name);
      setTables(['Students', 'Staff', 'Visitors', 'Contractors', ...tableNames]);
    } catch (error) {
      console.error('Failed to load tables:', error);
      setTables(['Students', 'Staff', 'Visitors', 'Contractors']);
    }
  };

  const resetForm = () => {
    setFormName('');
    setDescription('');
    setTargetTable('');
    setIsActive(true);
    setFields([]);
  };

  const addField = () => {
    const newField: FormField = {
      field_name: '',
      field_label: '',
      field_type: 'text',
      is_required: false,
      is_email_field: false,
      is_password_field: false,
      order_index: fields.length,
      placeholder: ''
    };
    setFields([...fields, newField]);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFields(newFields);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formName || !targetTable || fields.length === 0) {
      toast.error('Please fill in all required fields and add at least one field');
      return;
    }

    // Validate field names
    const invalidFields = fields.filter(f => !f.field_name || !f.field_label);
    if (invalidFields.length > 0) {
      toast.error('All fields must have a name and label');
      return;
    }

    // Check for required email and password fields
    const hasEmailField = fields.some(f => f.is_email_field);
    const hasPasswordField = fields.some(f => f.is_password_field);

    if (!hasEmailField) {
      toast.error('Form must have at least one Email Field (check the "Email Field" checkbox)');
      return;
    }

    if (!hasPasswordField) {
      toast.error('Form must have at least one Password Field (check the "Password Field" checkbox)');
      return;
    }

    setLoading(true);
    try {
      // Ensure every field has a valid order_index (1-based indexing)
      const formattedFields = fields.map((field, index) => ({
        ...field,
        order_index: index + 1
      }));

      const payload = {
        form_name: formName,
        description,
        target_table: targetTable,
        is_active: isActive,
        fields: formattedFields
      };

      console.log('📤 Submitting form:', payload);

      if (editingForm) {
        const response = await api.put(`/admin/forms/${editingForm.id}`, payload);
        console.log('✅ Form updated:', response.data);
        toast.success('Form updated successfully');
      } else {
        const response = await api.post('/admin/forms', payload);
        console.log('✅ Form created:', response.data);
        toast.success('Form created successfully');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('❌ Form save error:', error);
      console.error('Error response:', error.response?.data);
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to save form';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            {editingForm ? 'Edit Form' : 'Create New Form'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Basic Info Section */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="text-sm font-semibold text-blue-900 mb-3">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Form Name *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Student Registration"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Table *
                </label>
                <input
                  type="text"
                  value={targetTable}
                  onChange={(e) => setTargetTable(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Students, Staff, Visitors"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Suggested: Students, Staff, Visitors, Contractors
                </p>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Brief description of this form"
              />
            </div>

            <div className="mt-4 flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                Active (users can register using this form)
              </label>
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Form Fields</h3>
                <p className="text-xs text-gray-600 mt-1">
                  Required: At least one Email Field and one Password Field
                </p>
              </div>
              <button
                type="button"
                onClick={addField}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus size={16} />
                Add Field
              </button>
            </div>

            {fields.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-gray-500">No fields added yet</p>
                <button
                  type="button"
                  onClick={addField}
                  className="mt-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  Add your first field
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex items-start gap-3">
                      <div className="mt-2 cursor-move text-gray-400">
                        <GripVertical size={20} />
                      </div>
                      
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Field Name *
                          </label>
                          <input
                            type="text"
                            value={field.field_name}
                            onChange={(e) => updateField(index, { field_name: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            placeholder="e.g., full_name"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Field Label *
                          </label>
                          <input
                            type="text"
                            value={field.field_label}
                            onChange={(e) => updateField(index, { field_label: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            placeholder="e.g., Full Name"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Field Type *
                          </label>
                          <select
                            value={field.field_type}
                            onChange={(e) => updateField(index, { field_type: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          >
                            {FIELD_TYPES.map(type => (
                              <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Placeholder
                          </label>
                          <input
                            type="text"
                            value={field.placeholder || ''}
                            onChange={(e) => updateField(index, { placeholder: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            placeholder="Optional hint text"
                          />
                        </div>

                        {field.field_type === 'select' && (
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Options (comma-separated)
                            </label>
                            <input
                              type="text"
                              value={field.options || ''}
                              onChange={(e) => updateField(index, { options: e.target.value })}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                              placeholder="e.g., Option 1, Option 2, Option 3"
                            />
                          </div>
                        )}

                        <div className="col-span-2 flex gap-4 text-sm">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={field.is_required}
                              onChange={(e) => updateField(index, { is_required: e.target.checked })}
                              className="mr-2"
                            />
                            Required
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={field.is_email_field}
                              onChange={(e) => updateField(index, { is_email_field: e.target.checked })}
                              className="mr-2"
                            />
                            Email Field
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={field.is_password_field}
                              onChange={(e) => updateField(index, { is_password_field: e.target.checked })}
                              className="mr-2"
                            />
                            Password Field
                          </label>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeField(index)}
                        className="mt-2 p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>

        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : editingForm ? 'Update Form' : 'Create Form'}
          </button>
        </div>
      </div>
    </div>
  );
}
