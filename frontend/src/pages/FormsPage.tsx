import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye, EyeOff, Link2, Copy } from 'lucide-react';
import api from '../lib/api';
import { CreateFormModal } from '../components/forms/CreateFormModal';
import toast from 'react-hot-toast';

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
      toast.error('Failed to load forms');
    } finally {
      setLoading(false);
    }
  };

  const deleteForm = async (id: string) => {
    if (!confirm('Delete this form?')) return;
    try {
      await api.delete(`/admin/forms/${id}`);
      toast.success('Form deleted');
      loadForms();
    } catch (error) {
      console.error('Failed to delete form:', error);
      toast.error('Failed to delete form');
    }
  };

  const toggleActive = async (form: Form) => {
    try {
      await api.put(`/admin/forms/${form.id}`, {
        is_active: !form.is_active
      });
      toast.success(`Form ${!form.is_active ? 'activated' : 'deactivated'}`);
      loadForms();
    } catch (error) {
      console.error('Failed to toggle form:', error);
      toast.error('Failed to update form');
    }
  };

  const copyRegistrationLink = (formId: string) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/register/${formId}`;
    navigator.clipboard.writeText(link);
    toast.success('Registration link copied to clipboard!');
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Onboarding Forms</h1>
          <p className="text-gray-600 mt-2">Create and manage registration forms</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          <Plus size={20} />
          Create Form
        </button>
      </div>

      <div className="grid gap-4">
        {forms.map((form) => (
          <div key={form.id} className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm hover:shadow-md transition">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-semibold text-gray-900">{form.form_name}</h3>
                  <span className={`px-3 py-1 rounded text-xs font-medium ${
                    form.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {form.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-gray-600 mt-2">{form.description}</p>
                <div className="flex gap-6 mt-4 text-sm">
                  <span className="text-gray-600">
                    Target Table: <span className="font-medium text-gray-900">{form.target_table}</span>
                  </span>
                  <span className="text-gray-600">
                    Fields: <span className="font-medium text-gray-900">{form.fields?.length || 0}</span>
                  </span>
                </div>
                
                {/* Registration Link */}
                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={() => copyRegistrationLink(form.id)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded text-sm text-blue-600 font-medium transition"
                  >
                    <Link2 size={14} />
                    Copy Registration Link
                  </button>
                  <span className="text-xs text-gray-500 font-mono">
                    {window.location.origin}/register/{form.id}
                  </span>
                </div>
              </div>
              
              <div className="flex gap-1">
                <button
                  onClick={() => toggleActive(form)}
                  className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition"
                  title={form.is_active ? 'Deactivate' : 'Activate'}
                >
                  {form.is_active ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
                <button
                  onClick={() => { setEditingForm(form); setShowModal(true); }}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                  title="Edit"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => deleteForm(form.id)}
                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            {form.fields && form.fields.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-3">Form Fields:</p>
                <div className="flex flex-wrap gap-2">
                  {form.fields.map((field) => (
                    <span key={field.field_name} className="px-3 py-1 bg-gray-100 rounded text-xs text-gray-700 font-medium">
                      {field.field_label}
                      {field.is_required && <span className="text-red-600 ml-1.5">*</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {forms.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-600 mb-4">No forms created yet</p>
            <button
              onClick={() => setShowModal(true)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Create your first form
            </button>
          </div>
        )}
      </div>

      <CreateFormModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingForm(null);
        }}
        onSuccess={loadForms}
        editingForm={editingForm}
      />
    </div>
  );
}
