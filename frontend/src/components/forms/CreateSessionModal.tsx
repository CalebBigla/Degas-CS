import { useState } from 'react';
import { X } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateSessionModal({ isOpen, onClose, onSuccess }: CreateSessionModalProps) {
  const [loading, setLoading] = useState(false);
  const [hasTimeConstraints, setHasTimeConstraints] = useState(false);
  const [formData, setFormData] = useState({
    session_name: '',
    description: '',
    start_time: '',
    end_time: '',
    grace_period_minutes: 5
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'grace_period_minutes' ? parseInt(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.session_name.trim()) {
      toast.error('Session name is required');
      return;
    }

    // If time constraints are enabled, validate them
    if (hasTimeConstraints) {
      if (!formData.start_time || !formData.end_time) {
        toast.error('Start and end time are required when time constraints are enabled');
        return;
      }

      const startTime = new Date(formData.start_time);
      const endTime = new Date(formData.end_time);

      if (endTime <= startTime) {
        toast.error('End time must be after start time');
        return;
      }
    }

    setLoading(true);
    try {
      const payload: any = {
        session_name: formData.session_name,
        description: formData.description || null,
        is_active: true
      };

      // Only include time data if constraints are enabled
      if (hasTimeConstraints) {
        payload.start_time = new Date(formData.start_time).toISOString();
        payload.end_time = new Date(formData.end_time).toISOString();
        payload.grace_period_minutes = formData.grace_period_minutes;
      } else {
        // No time constraints
        payload.start_time = null;
        payload.end_time = null;
        payload.grace_period_minutes = 0;
      }

      await api.post('/admin/sessions', payload);

      toast.success('Session created successfully!');
      
      // Reset form
      setFormData({
        session_name: '',
        description: '',
        start_time: '',
        end_time: '',
        grace_period_minutes: 5
      });
      setHasTimeConstraints(false);

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to create session:', error);
      toast.error(error.response?.data?.message || 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full">
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Create Attendance Session</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Session Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Session Name *
            </label>
            <input
              type="text"
              name="session_name"
              value={formData.session_name}
              onChange={handleChange}
              placeholder="e.g., Sunday Worship - March 27"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Add any details about this session"
              rows={2}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Time Constraints Toggle */}
          <div className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg">
            <input
              type="checkbox"
              id="timeConstraints"
              checked={hasTimeConstraints}
              onChange={(e) => setHasTimeConstraints(e.target.checked)}
              className="w-4 h-4 rounded cursor-pointer"
            />
            <label htmlFor="timeConstraints" className="text-sm font-medium text-gray-300 cursor-pointer flex-1">
              Include Time Window & Grace Period
            </label>
          </div>

          {/* Conditional Time Fields */}
          {hasTimeConstraints && (
            <>
              {/* Start Time */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Start Time
                </label>
                <input
                  type="datetime-local"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  required={hasTimeConstraints}
                />
              </div>

              {/* End Time */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  End Time
                </label>
                <input
                  type="datetime-local"
                  name="end_time"
                  value={formData.end_time}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  required={hasTimeConstraints}
                />
              </div>

              {/* Grace Period */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Grace Period (minutes)
                </label>
                <select
                  name="grace_period_minutes"
                  value={formData.grace_period_minutes}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value={0}>No grace period</option>
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                </select>
              </div>
            </>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition"
            >
              {loading ? 'Creating...' : 'Create Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
