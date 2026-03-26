import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload } from 'lucide-react';
import api from '../lib/api';

interface FormField {
  field_name: string;
  field_label: string;
  field_type: string;
  is_required: boolean;
  placeholder?: string;
  options?: string;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadForm();
  }, []);

  const loadForm = async () => {
    try {
      const response = await api.get('/onboarding');
      setForm(response.data.data);
    } catch (error) {
      setError('No registration form available');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
        setFormData({ ...formData, photo: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await api.post('/onboarding/register', formData);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading registration form...</div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">Registration is currently unavailable</p>
          <button
            onClick={() => navigate('/login')}
            className="text-blue-400 hover:text-blue-300"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg text-center">
          <div className="text-green-400 text-5xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-white mb-2">Registration Successful!</h2>
          <p className="text-gray-400">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">{form.form_name}</h1>
          {form.description && <p className="text-gray-400">{form.description}</p>}
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-8 border border-gray-700">
          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-600 rounded text-red-200">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {form.fields?.map((field: FormField) => (
              <div key={field.field_name}>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  {field.field_label}
                  {field.is_required && <span className="text-red-400 ml-1">*</span>}
                </label>

                {field.field_type === 'textarea' ? (
                  <textarea
                    required={field.is_required}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                    rows={3}
                    onChange={(e) => setFormData({ ...formData, [field.field_name]: e.target.value })}
                  />
                ) : field.field_type === 'select' ? (
                  <select
                    required={field.is_required}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                    onChange={(e) => setFormData({ ...formData, [field.field_name]: e.target.value })}
                  >
                    <option value="">Select...</option>
                    {field.options && JSON.parse(field.options).map((opt: string) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : field.field_type === 'camera' || field.field_type === 'file' ? (
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      capture={field.field_type === 'camera' ? 'user' : undefined}
                      onChange={handlePhotoCapture}
                      className="hidden"
                      id={field.field_name}
                    />
                    <label
                      htmlFor={field.field_name}
                      className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white cursor-pointer hover:bg-gray-600"
                    >
                      {field.field_type === 'camera' ? <Camera size={20} /> : <Upload size={20} />}
                      {photo ? 'Change Photo' : field.placeholder || 'Upload Photo'}
                    </label>
                    {photo && (
                      <img src={photo} alt="Preview" className="mt-2 w-32 h-32 object-cover rounded" />
                    )}
                  </div>
                ) : (
                  <input
                    type={field.field_type}
                    required={field.is_required}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                    onChange={(e) => setFormData({ ...formData, [field.field_name]: e.target.value })}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 rounded-lg font-medium"
            >
              {submitting ? 'Registering...' : 'Register'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="px-6 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg"
            >
              Login Instead
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
