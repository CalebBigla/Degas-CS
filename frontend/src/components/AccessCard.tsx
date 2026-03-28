import { useRef } from 'react';
import { Download, Share2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';

interface AccessCardProps {
  userId: string;
  fullName: string;
  email: string;
  phone?: string;
  qrImage: string;
  organizationName?: string;
}

export function AccessCard({
  userId,
  fullName,
  email,
  phone,
  qrImage,
  organizationName = 'DEGAS'
}: AccessCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const downloadCard = async () => {
    if (!cardRef.current) return;

    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#1a1a1a',
        scale: 2,
        logging: false,
        useCORS: true
      });

      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `access-card-${fullName.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Access card downloaded!');
    } catch (error) {
      console.error('Failed to download card:', error);
      toast.error('Failed to download card');
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Card */}
      <div
        ref={cardRef}
        className="w-full max-w-sm bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-6 shadow-2xl border border-gray-700 aspect-video flex flex-col justify-between"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-white text-lg font-bold">{organizationName}</h3>
            <p className="text-gray-400 text-xs">ACCESS CARD</p>
          </div>
          <div className="text-gray-500 text-2xl font-bold">🔐</div>
        </div>

        {/* Content Grid */}
        <div className="flex gap-6 flex-1">
          {/* Left: User Info */}
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <p className="text-gray-400 text-xs font-semibold mb-1">FULL NAME</p>
              <p className="text-white text-sm font-bold truncate">{fullName}</p>
            </div>

            <div>
              <p className="text-gray-400 text-xs font-semibold mb-1">USER ID</p>
              <p className="text-blue-400 text-xs font-mono">{userId.substring(0, 12)}...</p>
            </div>

            <div>
              <p className="text-gray-400 text-xs font-semibold mb-1">EMAIL</p>
              <p className="text-gray-300 text-xs truncate">{email}</p>
            </div>

            {phone && (
              <div>
                <p className="text-gray-400 text-xs font-semibold mb-1">PHONE</p>
                <p className="text-gray-300 text-xs">{phone}</p>
              </div>
            )}
          </div>

          {/* Right: QR Code */}
          <div className="flex flex-col items-center justify-between">
            <div className="bg-white p-2 rounded-lg">
              <img
                src={qrImage}
                alt="User QR Code"
                className="w-24 h-24"
              />
            </div>
            <p className="text-gray-500 text-xs mt-2">Scan to verify</p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 pt-3 mt-4">
          <p className="text-gray-500 text-xs text-center">
            Valid for attendance scanning • Keep secure
          </p>
        </div>
      </div>

      {/* Download Buttons */}
      <div className="flex gap-3">
        <button
          onClick={downloadCard}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
        >
          <Download size={18} />
          Download as Image
        </button>
        <button
          onClick={() => {
            // Copy to clipboard or share
            if (navigator.share) {
              navigator.share({
                title: 'My Access Card',
                text: `Here is my access card for ${organizationName}`,
                url: window.location.href
              });
            } else {
              toast.success('Share functionality');
            }
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
        >
          <Share2 size={18} />
          Share
        </button>
      </div>
    </div>
  );
}
