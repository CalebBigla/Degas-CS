import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { Phone, Mail, ScanLine, Info, Download, X, LogOut, Calendar, Home, MapPin, Clock, CheckCircle2, Menu, Moon, Sun } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import api from '../lib/api';
import toast from 'react-hot-toast';

type TabType = 'dashboard' | 'events';

export function UserDashboardPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [userData, setUserData] = useState<any>(null);
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameraError, setCameraError] = useState<string>('');
  const [events, setEvents] = useState<any[]>([]);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [themeAnimate, setThemeAnimate] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const [showCooldownModal, setShowCooldownModal] = useState(false);

  useEffect(() => {
    loadUserData();
    loadEvents();
  }, []);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  useEffect(() => {
    if (showScanner && scanning && !scanResult) {
      initializeScanner();
    }
  }, [showScanner, scanning, scanResult]);

  const initializeScanner = async () => {
    await new Promise(resolve => setTimeout(resolve, 200));

    try {
      const element = document.getElementById('qr-reader');
      if (!element) {
        throw new Error('Scanner element not found. Please try again.');
      }

      const html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        () => {}
      );
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to access camera';
      setCameraError(errorMsg);
      toast.error(errorMsg);
      setScanning(false);
    }
  };

  const loadUserData = async () => {
    try {
      const storedUser = localStorage.getItem('degas_user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        let userDataWithProfile = { ...parsedUser };
        
        // Fetch user's actual profile image from database
        if (parsedUser.userId || parsedUser.id) {
          try {
            const userId = parsedUser.userId || parsedUser.id;
            const response = await api.get(`/users/${userId}`);
            if (response.data?.data?.profileimageurl) {
              userDataWithProfile.profileImageUrl = response.data.data.profileimageurl;
            }
          } catch (error) {
            console.warn('Could not fetch profile image from database:', error);
          }
        }
        
        setUserData(userDataWithProfile);
        
        if (parsedUser.qrCode) {
          setQrCodeImage(parsedUser.qrCode);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    try {
      // TODO: Replace with actual API call when events endpoint is ready
      // const response = await api.get('/events/upcoming');
      // setEvents(response.data.data);
      
      // Enhanced mock data with updated content
      setEvents([
        {
          id: '1',
          title: 'Mentorship Conference',
          date: '2026-04-20',
          endDate: '2026-04-22',
          time: '9:00 AM - 5:00 PM',
          location: 'Main Conference Hall',
          description: 'A transformative 3-day conference focused on spiritual mentorship, leadership development, and building lasting relationships.',
          requiresRegistration: true,
          status: 'upcoming'
        },
        {
          id: '2',
          title: 'Refresh Conference',
          date: '2026-05-15',
          endDate: '2026-05-17',
          time: '10:00 AM - 6:00 PM',
          location: 'Grace Center Auditorium',
          description: 'Experience spiritual renewal and refreshing through powerful worship, inspiring messages, and fellowship with believers.',
          requiresRegistration: true,
          status: 'upcoming'
        }
      ]);
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const checkScanCooldown = () => {
    if (!userData?.scannedAt) return true; // No previous scan
    
    const lastScan = new Date(userData.scannedAt);
    const now = new Date();
    const hoursSinceLastScan = (now - lastScan) / (1000 * 60 * 60);
    
    return hoursSinceLastScan >= 24;
  };

  const convertImageToBase64 = async (imageUrl: string): Promise<string | null> => {
    try {
      const response = await fetch(imageUrl, {
        mode: 'cors',
        credentials: 'omit'
      });
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn('Failed to convert image to base64:', error);
      return null;
    }
  };

  const downloadIDCard = async () => {
    try {
      if (!userData?.name || !userData?.email) {
        toast.error('User data incomplete');
        return;
      }

      toast.loading('Generating ID Card PDF...');

      // Generate QR code as image
      let qrCodeDataUrl = qrCodeImage;
      if (!qrCodeDataUrl) {
        // Generate QR code from user data if not available
        const qrData = JSON.stringify({ userId: userData.userId || userData.id, name: userData.name });
        qrCodeDataUrl = await QRCode.toDataURL(qrData);
      }

      // Create PDF (A6 ID card size: 105mm x 148mm landscape)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [105, 148]
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Background color (dark)
      pdf.setFillColor(26, 26, 26);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');

      // Header background
      pdf.setFillColor(15, 15, 15);
      pdf.rect(0, 0, pageWidth, 15, 'F');

      // Header text: "The Force of Grace Ministry"
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(255, 255, 255);
      pdf.text('The Force of Grace Ministry', pageWidth / 2, 8, { align: 'center' });

      // Profile Image Area (circular, centered)
      const profileImageX = pageWidth / 2;
      const profileImageY = 28;
      const profileImageSize = 25;

      if (userData?.profileImageUrl) {
        try {
          const base64Image = await convertImageToBase64(userData.profileImageUrl);
          if (base64Image) {
            pdf.addImage(base64Image, 'JPEG', profileImageX - profileImageSize / 2, profileImageY - profileImageSize / 2, profileImageSize, profileImageSize);
          }
        } catch (imgError) {
          console.warn('Could not add profile image to PDF:', imgError);
        }
      }

      // User Name
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.setTextColor(255, 255, 255);
      pdf.text(userData.name, pageWidth / 2, 58, { align: 'center' });

      // "Member" label
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(180, 180, 180);
      pdf.text('MEMBER', pageWidth / 2, 65, { align: 'center' });

      // QR Code
      const qrSize = 30;
      const qrX = (pageWidth - qrSize) / 2;
      const qrY = 72;
      if (qrCodeDataUrl) {
        pdf.addImage(qrCodeDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
      }

      // Footer
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text('Scan to verify membership', pageWidth / 2, 110, { align: 'center' });

      // Save
      pdf.save(`ID_Card_${userData.name}.pdf`);
      
      toast.dismiss();
      toast.success('ID Card PDF downloaded!');
    } catch (error) {
      console.error('Error generating ID Card PDF:', error);
      toast.dismiss();
      toast.error('Failed to generate ID Card PDF');
    }
  };

  const startScanner = () => {
    if (!checkScanCooldown()) {
      setShowCooldownModal(true);
      return;
    }
    
    setShowScanner(true);
    setScanning(true);
    setScanResult(null);
    setCameraError('');
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (error) {
        console.error('Error stopping camera:', error);
      }
    }
    setShowScanner(false);
    setScanning(false);
    setCameraError('');
  };

  const handleScanSuccess = async (scannedData: string) => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
    }
    setScanning(false);
    
    try {
      const storedUser = localStorage.getItem('degas_user');
      if (!storedUser) {
        throw new Error('User not logged in');
      }
      
      const user = JSON.parse(storedUser);
      const userId = user.userId || user.id;
      
      if (!userId) {
        throw new Error('User ID not found');
      }
      
      const response = await api.post('/form/scan', {
        qrData: scannedData,
        userId: userId
      });

      if (response.data.success) {
        const updatedUser = { ...userData, scanned: true, scannedAt: response.data.scannedAt };
        setUserData(updatedUser);
        localStorage.setItem('degas_user', JSON.stringify(updatedUser));
        
        // Show welcome modal
        setShowWelcomeModal(true);
        
        // Hide modal after 5 seconds
        setTimeout(() => {
          setShowWelcomeModal(false);
        }, 5000);
        
        toast.success('Attendance marked successfully!');
      } else {
        toast.error(response.data.message || 'Scan failed');
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Failed to mark attendance';
      toast.error(errorMsg);
    }
  };

  const handleManualInput = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const qrData = formData.get('qrData') as string;
    
    if (!qrData) {
      toast.error('Please enter QR data');
      return;
    }
    
    await handleScanSuccess(qrData);
  };

  const getUserInitials = () => {
    if (!userData?.name) return 'U';
    return userData.name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleEventRegistration = (eventId: string) => {
    toast.success('Registration feature coming soon!');
    // TODO: Implement event registration
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Welcome Modal */}
      {showWelcomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card rounded-3xl p-8 sm:p-12 max-w-md mx-4 shadow-2xl animate-scale-in border border-border">
            <div className="text-center space-y-6">
              {/* Profile Image or Initials */}
              <div className="mx-auto w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center ring-4 ring-primary/20">
                {userData?.profileImageUrl ? (
                  <img 
                    src={userData.profileImageUrl} 
                    alt={userData.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold text-primary">
                    {getUserInitials()}
                  </span>
                )}
              </div>
              
              {/* Welcome Message */}
              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                  {userData?.name || 'Welcome'}
                </h2>
                <p className="text-base sm:text-lg text-muted-foreground font-medium">
                  Welcome to The Force of Grace Ministry
                </p>
              </div>
              
              {/* Success Icon */}
              <div className="pt-2">
                <CheckCircle2 className="h-16 w-16 text-success mx-auto animate-bounce-slow" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile App Style Header */}
      <div className="bg-[hsl(var(--sidebar-background))] px-5 py-4 shadow-md">
        <div className="max-w-[720px] mx-auto">
          {/* Single Row Layout */}

          <div className="flex items-center justify-between">

            {/* Left: Welcome Text */}

            <div>

              <h1 className="text-2xl font-bold text-white">

                Welcome, <span className="text-primary">{userData?.name?.split(' ')[0] || 'Church'}</span>

              </h1>

              <p className="text-white/70 text-xs font-medium mt-0.5">User Dashboard</p>

            </div>


            {/* Right: Icons */}

            <div className="flex items-center gap-2">

              <button
                onClick={() => {
                  setThemeAnimate(true);
                  setTimeout(() => setThemeAnimate(false), 500);
                  toggleTheme();
                }}

                className={`p-1.5 hover:bg-white/10 rounded-lg transition-colors ${themeAnimate ? 'theme-toggle-animate' : ''}`}
                title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}

                aria-label="Toggle theme"

              >

                {theme === 'light' ? (

                  <Moon className="h-5 w-5 text-white" />

                ) : (

                  <Sun className="h-5 w-5 text-white" />

                )}

              </button>

              

              <button

                onClick={() => setShowMenu(!showMenu)}

                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"

                aria-label="Menu"

              >

                <Menu className="h-5 w-5 text-white" />

              </button>

            </div>

          </div>
        </div>
      </div>

      {/* Slide-out Menu */}
      {showMenu && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in"
            onClick={() => setShowMenu(false)}
          />
          
          {/* Menu Panel */}
          <div className="fixed top-0 left-0 bottom-0 w-72 bg-card border-r border-border z-50 shadow-2xl animate-slide-in-left">
            <div className="p-6">
              {/* Menu Header */}
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold text-foreground">Menu</h2>
                <button
                  onClick={() => setShowMenu(false)}
                  className="p-2 hover:bg-accent/10 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-foreground" />
                </button>
              </div>

              {/* Menu Items */}
              <nav className="space-y-2">
                <button
                  onClick={() => {
                    setActiveTab('dashboard');
                    setShowMenu(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === 'dashboard'
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'text-foreground hover:bg-accent/50'
                  }`}
                >
                  <Home className="h-5 w-5" />
                  Dashboard
                </button>
                <button
                  onClick={() => {
                    setActiveTab('events');
                    setShowMenu(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === 'events'
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'text-foreground hover:bg-accent/50'
                  }`}
                >
                  <Calendar className="h-5 w-5" />
                  Events
                </button>
                <button
                  onClick={() => {
                    handleLogout();
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-destructive hover:bg-destructive/10 transition-all"
                >
                  <LogOut className="h-5 w-5" />
                  Logout
                </button>
              </nav>
            </div>
          </div>
        </>
      )}

      <div className="p-4 sm:p-5 max-w-[720px] mx-auto space-y-4 sm:space-y-5">
        {/* Dashboard Tab Content */}
        {activeTab === 'dashboard' && (
          <>
            {/* User Info Card */}
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
              <h2 className="text-base font-bold text-foreground mb-5">Your Information</h2>
              <div className="flex items-start gap-4 sm:gap-5">
                {/* Profile Image - Always show image from database or placeholder */}
                <div className="shrink-0">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-border bg-muted">
                    {userData?.profileImageUrl ? (
                      <div key={`image-${userData.profileImageUrl}`} className="relative w-full h-full">
                        <img 
                          src={userData.profileImageUrl} 
                          alt={userData.name}
                          className="w-full h-full object-cover"
                          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                            // Gracefully fallback to initials if image fails to load
                            const container = (e.target as HTMLImageElement).parentElement;
                            if (container) {
                              container.innerHTML = `
                                <div class="w-full h-full flex items-center justify-center">
                                  <span class="text-2xl sm:text-3xl font-bold text-muted-foreground">
                                    ${getUserInitials()}
                                  </span>
                                </div>
                              `;
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-2xl sm:text-3xl font-bold text-muted-foreground">
                          {getUserInitials()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* User Details */}
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Name</p>
                    <p className="text-sm sm:text-base font-semibold text-foreground truncate">{userData?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Email</p>
                    <p className="text-sm sm:text-base font-medium text-foreground truncate">{userData?.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Phone</p>
                    <p className="text-sm sm:text-base font-medium text-foreground">{userData?.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Status</p>
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${userData?.scanned ? 'bg-success' : 'bg-warning'} animate-pulse`} />
                      <p className={`text-sm sm:text-base font-bold ${userData?.scanned ? 'text-success' : 'text-warning'}`}>
                        {userData?.scanned ? 'Scanned' : 'Not Scanned'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mark Attendance */}
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <h2 className="text-base font-bold text-foreground mb-1">Mark Your Attendance</h2>
                  <p className="text-sm text-muted-foreground font-medium">Scan the form QR code to mark your attendance</p>
                </div>
                <button
                  onClick={startScanner}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all shadow-md hover:shadow-lg shrink-0"
                >
                  <ScanLine className="h-4 w-4" />
                  Open Scanner
                </button>
              </div>
            </div>

            {/* Scanner Section */}
            {showScanner && (
              <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-bold text-foreground">Scan Form QR Code</h2>
                  <button
                    onClick={stopScanner}
                    className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5 text-foreground" />
                  </button>
                </div>

                {scanning && !cameraError && (
                  <div className="mb-5">
                    <div 
                      id="qr-reader" 
                      className="rounded-xl overflow-hidden border-2 border-border shadow-inner"
                      style={{ width: '100%' }}
                    ></div>
                    <p className="text-center text-sm text-muted-foreground font-medium mt-4">
                      Position the QR code within the frame
                    </p>
                  </div>
                )}

                {cameraError && (
                  <div className="bg-destructive/10 border-2 border-destructive/20 rounded-xl p-5 mb-5">
                    <p className="text-destructive text-sm font-semibold">
                      Camera Error: {cameraError}
                    </p>
                    <p className="text-destructive text-sm mt-2">
                      Please ensure you've granted camera permissions and try again.
                    </p>
                  </div>
                )}

                <div className="mt-5 pt-5 border-t border-border">
                  <h3 className="text-sm font-bold text-foreground mb-3">Or Enter Manually</h3>
                  <form onSubmit={handleManualInput} className="space-y-3">
                    <textarea
                      name="qrData"
                      placeholder="Paste the form QR code data here..."
                      className="w-full px-4 py-3 bg-background border-2 border-input rounded-xl text-foreground placeholder:text-muted-foreground text-sm h-24 focus:outline-none focus:ring-2 focus:ring-ring font-medium"
                    />
                    <button
                      type="submit"
                      className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all shadow-md"
                    >
                      Submit
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* ID Card Display */}
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
              <div className="mx-auto max-w-[400px]">
                {/* ID Card */}
                <div className="rounded-2xl bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-primary-foreground))] overflow-hidden shadow-xl">
                  {/* Card Header */}
                  <div className="bg-[hsl(var(--sidebar-primary))]/20 px-4 py-3 flex items-center justify-between border-b border-[hsl(var(--sidebar-border))]">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-[hsl(var(--sidebar-primary))] flex items-center justify-center shadow-sm">
                        <span className="text-xs font-bold text-white">TFG</span>
                      </div>
                      <span className="text-xs text-[hsl(var(--sidebar-foreground))] font-semibold">The Force of Grace Ministry</span>
                    </div>
                  </div>

                  {/* Card Body - Profile Section */}
                  <div className="p-6 flex flex-col items-center text-center space-y-4">
                    {/* Large Profile Image */}
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[hsl(var(--sidebar-primary))]/30 bg-[hsl(var(--sidebar-accent))] shadow-lg">
                        {userData?.profileImageUrl ? (
                          <img 
                            src={userData.profileImageUrl} 
                            alt={userData.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-3xl font-bold text-[hsl(var(--sidebar-primary-foreground))]">
                              {getUserInitials()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* User Name and Role */}
                    <div>
                      <h3 className="text-xl font-bold text-[hsl(var(--sidebar-foreground))] mb-1">
                        {userData?.name || 'Church Member'}
                      </h3>
                      <p className="text-xs text-[hsl(var(--sidebar-muted))] font-semibold uppercase tracking-wider">
                        Member
                      </p>
                    </div>

                    {/* QR Code */}
                    {qrCodeImage && (
                      <div className="bg-white rounded-xl p-4 shadow-md">
                        <img 
                          src={qrCodeImage} 
                          alt="User QR Code" 
                          className="w-32 h-32"
                        />
                      </div>
                    )}

                    {/* Member Badge */}
                    <div className="w-full bg-[hsl(var(--sidebar-primary))]/10 rounded-lg py-2 px-4">
                      <p className="text-xs text-[hsl(var(--sidebar-muted))] font-bold uppercase tracking-wider">
                        Member
                      </p>
                    </div>
                  </div>
                </div>

                {/* Download Button */}
                <button
                  onClick={downloadIDCard}
                  className="w-full mt-4 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all shadow-md hover:shadow-lg"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
                <p className="text-xs text-muted-foreground text-center font-medium mt-2">
                  Save your member ID card to your phone
                </p>
              </div>
            </div>

            {/* Info Box */}
            <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-5 sm:p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                  <Info className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-foreground mb-3">Two ways to mark attendance:</h3>
                  <ol className="text-sm text-muted-foreground space-y-2.5 list-decimal list-inside font-medium">
                    <li>
                      <strong className="text-foreground font-semibold">Self-Service:</strong> Use the scanner above to scan the form QR code displayed at the entrance
                    </li>
                    <li>
                      <strong className="text-foreground font-semibold">Admin Scan:</strong> Show your QR code (above) to the admin and they will scan it
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Events Tab Content */}
        {activeTab === 'events' && (
          <div className="space-y-5">
            {/* Header Card */}
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
              <h2 className="text-base font-bold text-foreground mb-1">Upcoming Events</h2>
              <p className="text-sm text-muted-foreground font-medium">
                Register for programs and events that require verification
              </p>
            </div>

            {events.length > 0 ? (
              <div className="space-y-4">
                {events.map((event) => (
                  <div key={event.id} className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
                    {/* Event Header */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-bold text-foreground">{event.title}</h3>
                          <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg uppercase tracking-wide ${
                            event.status === 'registered' 
                              ? 'bg-success/10 text-success' 
                              : 'bg-primary/10 text-primary'
                          }`}>
                            {event.status === 'registered' ? 'Registered' : 'Upcoming'}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                          {event.description}
                        </p>
                      </div>
                    </div>
                    
                    {/* Event Details Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-5 p-4 bg-muted/30 rounded-xl">
                      <div className="flex items-start gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground font-semibold mb-0.5">
                            {event.endDate ? 'Date Range' : 'Date'}
                          </p>
                          <p className="text-sm font-bold text-foreground">
                            {new Date(event.date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })}
                            {event.endDate && ` - ${new Date(event.endDate).getDate()}, ${new Date(event.endDate).getFullYear()}`}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground font-semibold mb-0.5">Time</p>
                          <p className="text-sm font-bold text-foreground">{event.time}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2 col-span-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground font-semibold mb-0.5">Location</p>
                          <p className="text-sm font-bold text-foreground">{event.location}</p>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    {event.status === 'registered' ? (
                      <div className="flex items-center justify-center gap-2 py-3 bg-success/10 rounded-xl">
                        <CheckCircle2 className="h-5 w-5 text-success" />
                        <span className="text-sm font-bold text-success">Registered</span>
                      </div>
                    ) : event.requiresRegistration ? (
                      <button
                        onClick={() => handleEventRegistration(event.id)}
                        className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                      >
                        Register
                        <span className="text-lg">→</span>
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card p-12 sm:p-16 text-center shadow-sm">
                <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-40" />
                <p className="text-base font-bold text-foreground mb-2">No upcoming events</p>
                <p className="text-sm text-muted-foreground font-medium">
                  Check back later for new events and programs
                </p>
              </div>
            )}
          </div>
        )}
  
      {/* 24-Hour Cooldown Modal */}
      {showCooldownModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card rounded-2xl p-6 sm:p-8 max-w-sm mx-4 shadow-2xl animate-scale-in border border-border">
            <div className="text-center space-y-4">
              {/* Icon */}
              <div className="mx-auto w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center">
                <Clock className="h-8 w-8 text-warning" />
              </div>
              
              {/* Message */}
              <div>
                <h3 className="text-lg font-bold text-foreground mb-2">
                  Scan Cooldown Active
                </h3>
                <p className="text-sm text-muted-foreground">
                  You've already scanned today. Kindly wait for 24 hours before scanning again.
                </p>
                {userData?.scannedAt && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Last scan: {new Date(userData.scannedAt).toLocaleString()}
                  </p>
                )}
              </div>
              
              {/* Button */}
              <button
                onClick={() => setShowCooldownModal(false)}
                className="w-full px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold text-sm transition-colors"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
