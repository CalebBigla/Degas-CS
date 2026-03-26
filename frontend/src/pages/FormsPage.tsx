import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import api from '../lib/api';

interface FormField {
  field_name: string;
  field_label: string;
  field_type: string;
  is_required: boolean;
  is_email_field: boolean;
  is_password_field: boolean;
  field_order: number;
  placeholder?: string;
  options?: string;
}

interface Form {
  id: string;
  form_name: string;
  target_table: string;
  description?: string;
  is_active: boolean;
  fields: FormField[];
  created_at: string;
}

export function FormsPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingForm, setEditingForm] = useState<Form | null>(null);

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    try {
      const response = await api.get('/admin/forms');
      setForms(response.data.data);
    } catch (error) {
      console.error('Failed to load forms:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteForm = async (id: string) => {
    if (!confirm('Delete this form?')) return;
    try {
      await api.delete(`/admin/forms/${id}`);
      loadForms();
    } catch (error) {
      console.error('Failed to delete form:', error);
    }
  };

  const toggleActive = async (form: Form) => {
    try {
      await api.put(`/admin/forms/${form.id}`, {
        is_active: !form.is_active
      });
      loadForms();
    } catch (error) {
      console.error('Failed to toggle form:', error);
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Onboarding Forms</h1>
          <p className="text-gray-400 mt-1">Create and manage registration forms</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          <Plus size={20} />
          Create Form
        </button>
      </div>

      <div className="grid gap-4">
        {forms.map((form) => (
          <div key={form.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-semibold text-white">{form.form_name}</h3>
                  <span className={`px-2 py-1 rounded text-xs ${
                    form.is_active ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
                  }`}>
                    {form.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-gray-400 mt-1">{form.description}</p>
                <div className="flex gap-4 mt-3 text-sm">
                  <span className="text-gray-400">
                    Target: <span className="text-white">{form.target_table}</span>
                  </span>
                  <span className="text-gray-400">
                    Fields: <span className="text-white">{form.fields?.length || 0}</span>
                  </span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => toggleActive(form)}
                  className="p-2 hover:bg-gray-700 rounded"
                  title={form.is_active ? 'Deactivate' : 'Activate'}
                >
                  {form.is_active ? <Eye size={18} className="text-green-400" /> : <EyeOff size={18} className="text-gray-400" />}
                </button>
                <button
                  onClick={() => { setEditingForm(form); setShowModal(true); }}
                  className="p-2 hover:bg-gray-700 rounded"
                  title="Edit"
                >
                  <Edit2 size={18} className="text-blue-400" />
                </button>
                <button
                  onClick={() => deleteForm(form.id)}
                  className="p-2 hover:bg-gray-700 rounded"
                  title="Delete"
                >
                  <Trash2 size={18} className="text-red-400" />
                </button>
              </div>
            </div>

            {form.fields && form.fields.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <p className="text-sm text-gray-400 mb-2">Form Fields:</p>
                <div className="flex flex-wrap gap-2">
                  {form.fields.map((field) => (
                    <span key={field.field_name} className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">
                      {field.field_label}
                      {field.is_required && <span className="text-red-400 ml-1">*</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {forms.length === 0 && (
          <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
            <p className="text-gray-400">No forms created yet</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 text-blue-400 hover:text-blue-300"
            >
              Create your first form
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
