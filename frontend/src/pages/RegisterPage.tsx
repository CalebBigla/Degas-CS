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
      let response;
      if (formId) {
        // Load specific form by ID
        response = await api.get(`/onboarding/form/${formId}`);
      } else {
        // Load active form
        response = await api.get('/onboarding');
      }
      console.log('📋 Loaded form:', response.data.data);
      setForm(response.data.data);
    } catch (error) {
      console.error('❌ Failed to load form:', error);
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
      console.log('📤 Submitting registration:', formData);
      let response;
      if (formId) {
        // Register with specific form
        response = await api.post(`/onboarding/register/${formId}`, formData);
      } else {
        // Register with active form
        response = await api.post('/onboarding/register', formData);
      }
      console.log('✅ Registration response:', response.status, response.data);
      
      // Check for success
      if (response.data.success || response.status === 201) {
        setSuccess(true);
        setRegistrationData(response.data.data);
        
        // Store QR code if present
        if (response.data.data?.qrCode) {
          setQrCode(response.data.data.qrCode);
          console.log('✅ QR code received');
        }
        
        // Auto-login user with the returned token
        if (response.data.data?.token) {
          localStorage.setItem('degas_token', response.data.data.token);
          localStorage.setItem('degas_user', JSON.stringify({
            id: response.data.data.coreUserId,
            email: response.data.data.email,
            role: 'user' // New users are regular users
          }));
          console.log('✅ User auto-logged in with JWT token');
          // Don't auto-redirect, let user see QR code first
        } else {
          // No token, just show success
          console.log('⚠️ No token in response');
        }
      } else {
        setError('Registration response was unexpected');
      }
    } catch (error: any) {
      console.error('❌ Registration error:', error);
      console.error('Error response:', error.response?.data);
      
      // Handle specific error codes
      if (error.response?.status === 409) {
        setError('Email already registered');
      } else if (error.response?.status === 400) {
        setError(error.response?.data?.message || 'Please fill in all required fields correctly');
      } else {
        const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Registration failed';
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
          <p className="text-gray-400 mb-6">Your account has been created</p>
          
          {qrCode && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Your QR Code</h3>
              <div className="bg-white p-4 rounded-lg inline-block">
                <img src={qrCode} alt="Your QR Code" className="w-64 h-64" />
              </div>
              <p className="text-sm text-gray-400 mt-3">
                Save this QR code for attendance tracking
              </p>
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = qrCode;
                  link.download = `qr-code-${registrationData?.email || 'user'}.png`;
                  link.click();
                }}
                className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Download QR Code
              </button>
            </div>
          )}
          
          <div className="space-y-3">
            {registrationData?.token ? (
              <button
                onClick={() => navigate('/my-dashboard')}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium"
              >
                Go to Dashboard
              </button>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium"
              >
                Go to Login
              </button>
            )}
          </div>
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
                    {field.options && (() => {
                      try {
                        // Try to parse as JSON first
                        const parsed = JSON.parse(field.options);
                        return parsed.map((opt: string) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ));
                      } catch {
                        // If JSON parse fails, treat as comma-separated string
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
