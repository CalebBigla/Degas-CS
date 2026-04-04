import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  const { formId } = useParams<{ formId?: string }>();
  const [form, setForm] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [registrationData, setRegistrationData] = useState<any>(null);

  useEffect(() => {
    loadForm();
  }, [formId]);

  const loadForm = async () => {
    try {
      if (!formId) {
        setError('No form ID provided');
        setLoading(false);
        return;
      }

      // Load form details from fixed-forms API
      const response = await api.get(`/fixed-forms/${formId}`);
      console.log('📋 Loaded form:', response.data.data);
      
      // Set form with fixed schema fields
      setForm({
        id: response.data.data.id,
        form_name: response.data.data.name,
        description: 'Please fill in all required fields to register',
        fields: [
          { field_name: 'name', field_label: 'Full Name', field_type: 'text', is_required: true, placeholder: 'Enter your full name' },
          { field_name: 'phone', field_label: 'Phone Number', field_type: 'tel', is_required: true, placeholder: '+1234567890' },
          { field_name: 'email', field_label: 'Email Address', field_type: 'email', is_required: true, placeholder: 'your@email.com' },
          { field_name: 'address', field_label: 'Address', field_type: 'text', is_required: true, placeholder: 'Your address' },
          { field_name: 'password', field_label: 'Password', field_type: 'password', is_required: true, placeholder: 'Create a password' }
        ]
      });
    } catch (error: any) {
      console.error('❌ Failed to load form:', error);
      if (error.response?.status === 404) {
        setError('Registration form not found');
      } else {
        setError('Failed to load registration form');
      }
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
    setSuccess(false);

    try {
      console.log('📤 Submitting registration:', formData);
      
      if (!formId) {
        setError('Form ID is required');
        return;
      }

      // Register with fixed schema endpoint
      const response = await api.post(`/form/register/${formId}`, {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        password: formData.password
      });
      
      console.log('✅ Registration response:', response.status, response.data);
      
      // Check for success - status 201 or success flag true
      if (response.status === 201 || response.data.success) {
        setSuccess(true);
        setRegistrationData({
          userId: response.data.userId,
          formId: response.data.formId
        });
        console.log('✅ Registration successful - user can now login');
      } else {
        // Unexpected response format
        setError(response.data?.message || 'Registration failed - unexpected response');
      }
    } catch (error: any) {
      console.error('❌ Registration error:', error);
      console.error('Error response:', error.response?.data);
      
      // Handle specific error codes with proper error messages
      if (error.response?.status === 409) {
        setError('Email already registered - please use a different email');
      } else if (error.response?.status === 400) {
        const errMsg = error.response?.data?.message || error.response?.data?.errors?.[0] || 'Please fill in all required fields correctly';
        setError(errMsg);
      } else if (error.response?.status === 404) {
        setError('Registration form not found');
      } else if (error.response?.status === 500) {
        setError(error.response?.data?.message || 'Server error - please try again');
      } else {
        const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Registration failed';
        setError(errorMsg);
      }
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
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 p-8 rounded-lg text-center max-w-md w-full">
          <div className="text-green-400 text-5xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-white mb-2">Registration Successful!</h2>
          <p className="text-gray-400 mb-6">Your account has been created successfully</p>
          
          <div className="bg-gray-700 p-4 rounded-lg mb-6">
            <p className="text-sm text-gray-300 mb-2">
              <strong>Email:</strong> {formData.email}
            </p>
            <p className="text-sm text-gray-300">
              You can now login with your email and password
            </p>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium"
            >
              Go to Login
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg"
            >
              Register Another User
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            {form.form_name || 'Registration Form'}
          </h1>
          <p className="text-gray-400">
            {form.description || 'Please fill in all required fields to register'}
          </p>
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

                {field.field_type === 'password' ? (
                  <input
                    type="password"
                    required={field.is_required}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                    onChange={(e) => setFormData({ ...formData, [field.field_name]: e.target.value })}
                  />
                ) : field.field_type === 'textarea' ? (
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
                    {field.options && (() => {
                      try {
                        const parsed = JSON.parse(field.options);
                        return parsed.map((opt: string) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ));
                      } catch {
                        return field.options.split(',').map((opt: string) => {
                          const trimmed = opt.trim();
                          return (
                            <option key={trimmed} value={trimmed}>{trimmed}</option>
                          );
                        });
                      }
                    })()}
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
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-3 rounded-lg font-medium transition"
            >
              {submitting ? 'Registering...' : 'Register'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="px-6 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition"
            >
              Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
