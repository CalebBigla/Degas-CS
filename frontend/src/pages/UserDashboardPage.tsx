import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { Phone, Mail, ScanLine, Info, Download, X, LogOut, Calendar, Home, MapPin, Clock, CheckCircle2, Menu, Moon, Sun } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
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
        setUserData(parsedUser);
        
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

  const downloadQRCode = () => {
    if (!qrCodeImage) return;
    
    const link = document.createElement('a');
    link.href = qrCodeImage;
    link.download = `qr-code-${userData?.name || 'user'}.png`;
    link.click();
    toast.success('QR code downloaded');
  };

  const startScanner = () => {
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
      <div className="bg-gradient-to-br from-primary via-primary to-accent p-6 pb-8 shadow-lg">
        <div className="max-w-[720px] mx-auto">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-6">
            {/* Hamburger Menu */}
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Menu"
            >
              <Menu className="h-6 w-6 text-white" />
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Moon className="h-6 w-6 text-white" />
              ) : (
                <Sun className="h-6 w-6 text-white" />
              )}
            </button>
          </div>

          {/* Welcome Text */}
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
              Welcome, <span className="text-white/90">{userData?.name?.split(' ')[0] || 'Church'}</span>
            </h1>
            <p className="text-white/80 text-sm font-medium">User Dashboard</p>
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

      <div className="p-4 sm:p-6 lg:p-8 max-w-[720px] mx-auto space-y-5 sm:space-y-6 -mt-4 relative z-10">
        {/* Dashboard Tab Content */}
        {activeTab === 'dashboard' && (
          <>
            {/* User Info Card */}
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
              <h2 className="text-base font-bold text-foreground mb-5">Your Information</h2>
              <div className="flex items-start gap-4 sm:gap-5">
                {/* Profile Image */}
                <div className="shrink-0">
                  {userData?.profileImageUrl ? (
                    <img 
                      src={userData.profileImageUrl} 
                      alt={userData.name}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-border"
                    />
                  ) : (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-muted flex items-center justify-center border-2 border-border">
                      <span className="text-2xl sm:text-3xl font-bold text-muted-foreground">
                        {getUserInitials()}
                      </span>
                    </div>
                  )}
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

            {/* ID Card with QR */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <div className="px-5 pt-5 sm:px-6 sm:pt-6">
                <h2 className="text-base font-bold text-foreground mb-1">Your ID Card</h2>
                <p className="text-sm text-muted-foreground font-medium">Show this to the admin to mark your attendance</p>
              </div>
              
              <div className="p-5 sm:p-6">
                <div className="mx-auto max-w-[360px] rounded-2xl bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-primary-foreground))] overflow-hidden shadow-xl">
                  {/* Card Header */}
                  <div className="bg-[hsl(var(--sidebar-primary))]/20 px-5 py-3.5 flex items-center justify-between border-b border-[hsl(var(--sidebar-border))]">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-lg bg-[hsl(var(--sidebar-primary))] flex items-center justify-center shadow-sm">
                        <span className="text-[11px] font-bold text-white">TFG</span>
                      </div>
                      <span className="text-xs text-[hsl(var(--sidebar-foreground))] font-semibold tracking-wide">The Force of Grace Ministry</span>
                    </div>
                    <span className="text-[10px] text-[hsl(var(--sidebar-muted))] font-mono">
                      {userData?.id?.substring(0, 8) || 'USR-00000'}
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="px-5 py-5 flex items-start gap-4">
                    {/* Profile Image */}
                    <div className="shrink-0">
                      {userData?.profileImageUrl ? (
                        <img 
                          src={userData.profileImageUrl} 
                          alt={userData.name}
                          className="h-16 w-16 sm:h-18 sm:w-18 rounded-xl object-cover border-2 border-[hsl(var(--sidebar-primary))]/30 shadow-md"
                        />
                      ) : (
                        <div className="h-16 w-16 sm:h-18 sm:w-18 rounded-xl border-2 border-[hsl(var(--sidebar-primary))]/30 bg-[hsl(var(--sidebar-accent))] flex items-center justify-center shadow-md">
                          <span className="text-[hsl(var(--sidebar-primary-foreground))] text-lg sm:text-xl font-bold">
                            {getUserInitials()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0 space-y-2.5">
                      <div>
                        <p className="text-base sm:text-lg font-bold leading-tight truncate text-[hsl(var(--sidebar-foreground))]">
                          {userData?.name || 'User'}
                        </p>
                        <p className="text-xs text-[hsl(var(--sidebar-muted))] mt-1 font-semibold uppercase tracking-wide">
                          Member
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-[hsl(var(--sidebar-foreground))]">
                          <Phone className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--sidebar-muted))]" />
                          <span className="text-xs font-medium">{userData?.phone || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[hsl(var(--sidebar-foreground))]">
                          <Mail className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--sidebar-muted))]" />
                          <span className="text-xs font-medium truncate">{userData?.email || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* QR Code Section */}
                  {qrCodeImage && (
                    <div className="px-5 pb-5 flex justify-center">
                      <div className="bg-white rounded-xl p-3 shadow-md">
                        <img 
                          src={qrCodeImage} 
                          alt="User QR Code" 
                          className="w-28 h-28 sm:w-32 sm:h-32"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Download Button */}
              <div className="px-5 pb-5 sm:px-6 sm:pb-6 flex flex-col items-center gap-3">
                <button
                  onClick={downloadQRCode}
                  className="w-full max-w-[360px] flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3.5 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all shadow-md hover:shadow-lg"
                >
                  <Download className="h-4 w-4" />
                  Download QR Code
                </button>
                <p className="text-xs text-muted-foreground text-center font-medium">
                  Save this to your phone for easy access
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
      </div>
    </div>
  );
}
