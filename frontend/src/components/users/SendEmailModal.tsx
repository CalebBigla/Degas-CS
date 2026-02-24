import { useState } from 'react';
import { X, Mail, Send, CheckCircle } from 'lucide-react';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableId: string;
  tableName: string;
  userId: string;
  userName: string;
}

export function SendEmailModal({
  isOpen,
  onClose,
  tableId,
  tableName,
  userId,
  userName
}: SendEmailModalProps) {
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      setIsSending(true);
      
      await api.post(`/tables/${tableId}/users/${userId}/send-email`, {
        email
      });

      setSent(true);
      toast.success(`ID card sent successfully to ${email}`);
      
      // Auto-close after 2 seconds
      setTimeout(() => {
        onClose();
        // Reset state after modal closes
        setTimeout(() => {
          setEmail('');
          setSent(false);
        }, 300);
      }, 2000);

    } catch (error: any) {
      console.error('Failed to send email:', error);
      toast.error(error?.response?.data?.error || 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    if (!isSending) {
      onClose();
      // Reset state after modal closes
      setTimeout(() => {
        setEmail('');
        setSent(false);
      }, 300);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-emerald/5 to-transparent">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald/10 rounded-lg">
              <Mail className="h-6 w-6 text-emerald" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-charcoal">Send ID Card via Email</h2>
              <p className="text-sm text-gray-600">{userName}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isSending}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!sent ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Recipient Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  disabled={isSending}
                  className="input w-full"
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !isSending) {
                      handleSend();
                    }
                  }}
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>What will be sent:</strong>
                </p>
                <ul className="text-sm text-blue-800 mt-2 space-y-1 ml-4 list-disc">
                  <li>ID card for <strong>{userName}</strong></li>
                  <li>Table: <strong>{tableName}</strong></li>
                  <li>Format: PDF attachment</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald/10 rounded-full mb-4">
                <CheckCircle className="h-8 w-8 text-emerald" />
              </div>
              <h3 className="text-lg font-semibold text-charcoal mb-2">Email Sent Successfully!</h3>
              <p className="text-gray-600">
                The ID card has been sent to <strong>{email}</strong>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {!sent && (
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={handleClose}
              disabled={isSending}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={isSending || !email}
              className="btn btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Send Email</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
