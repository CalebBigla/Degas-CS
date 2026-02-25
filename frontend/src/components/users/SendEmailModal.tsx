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
  userIds: string[];
}

export function SendEmailModal({
  isOpen,
  onClose,
  tableId,
  tableName,
  userIds
}: SendEmailModalProps) {
  const [emails, setEmails] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [results, setResults] = useState<{ success: number; failed: number }>({ success: 0, failed: 0 });

  const handleSend = async () => {
    const emailList = emails.split('\n').map(e => e.trim()).filter(e => e);
    
    if (emailList.length === 0) {
      toast.error('Please enter at least one email address');
      return;
    }

    // Validate all emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emailList.filter(e => !emailRegex.test(e));
    if (invalidEmails.length > 0) {
      toast.error(`Invalid email addresses: ${invalidEmails.join(', ')}`);
      return;
    }

    if (emailList.length !== userIds.length) {
      toast.error(`Please provide ${userIds.length} email addresses (one per line)`);
      return;
    }

    try {
      setIsSending(true);
      let successCount = 0;
      let failedCount = 0;

      // Send emails one by one
      for (let i = 0; i < userIds.length; i++) {
        try {
          await api.post(`/tables/${tableId}/users/${userIds[i]}/send-email`, {
            email: emailList[i],
            customMessage: emailBody || undefined
          });
          successCount++;
        } catch (error) {
          console.error(`Failed to send email to ${emailList[i]}:`, error);
          failedCount++;
        }
      }

      setResults({ success: successCount, failed: failedCount });
      setSent(true);
      
      if (failedCount === 0) {
        toast.success(`All ${successCount} emails sent successfully!`);
      } else {
        toast.error(`${successCount} sent, ${failedCount} failed`);
      }
      
      // Auto-close after 3 seconds
      setTimeout(() => {
        onClose();
        setTimeout(() => {
          setEmails('');
          setEmailBody('');
          setSent(false);
          setResults({ success: 0, failed: 0 });
        }, 300);
      }, 3000);

    } catch (error: any) {
      console.error('Failed to send emails:', error);
      toast.error('Failed to send emails');
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    if (!isSending) {
      onClose();
      setTimeout(() => {
        setEmails('');
        setEmailBody('');
        setSent(false);
        setResults({ success: 0, failed: 0 });
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
              <h2 className="text-xl font-bold text-charcoal">Send ID Cards via Email</h2>
              <p className="text-sm text-gray-600">{userIds.length} user{userIds.length > 1 ? 's' : ''} selected</p>
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
                  Recipient Email Addresses (one per line)
                </label>
                <textarea
                  value={emails}
                  onChange={(e) => setEmails(e.target.value)}
                  placeholder={`user1@example.com\nuser2@example.com\nuser3@example.com`}
                  disabled={isSending}
                  rows={Math.min(userIds.length, 5)}
                  className="input w-full font-mono text-sm"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter {userIds.length} email address{userIds.length > 1 ? 'es' : ''} (one per line)
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Custom Message (Optional)
                </label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Add a personal message to include in the email..."
                  disabled={isSending}
                  rows={3}
                  className="input w-full"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>What will be sent:</strong>
                </p>
                <ul className="text-sm text-blue-800 mt-2 space-y-1 ml-4 list-disc">
                  <li>{userIds.length} ID card{userIds.length > 1 ? 's' : ''} from <strong>{tableName}</strong></li>
                  <li>Format: PDF attachment</li>
                  {emailBody && <li>With your custom message</li>}
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald/10 rounded-full mb-4">
                <CheckCircle className="h-8 w-8 text-emerald" />
              </div>
              <h3 className="text-lg font-semibold text-charcoal mb-2">
                {results.failed === 0 ? 'All Emails Sent Successfully!' : 'Emails Sent'}
              </h3>
              <p className="text-gray-600">
                {results.success} successful{results.failed > 0 && `, ${results.failed} failed`}
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
              disabled={isSending || !emails}
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
                  <span>Send {userIds.length} Email{userIds.length > 1 ? 's' : ''}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
