import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ScannerPortalProps {
  children: React.ReactNode;
}

/**
 * Portal that renders the scanner outside React's main DOM tree
 * This prevents React from unmounting the qr-reader div while html5-qrcode is still using it
 * Solves the "removeChild on non-existent node" error by isolating the scanner from React lifecycle
 */
export function ScannerPortal({ children }: ScannerPortalProps) {
  // Create a persistent portal container that won't be unmounted by React
  useEffect(() => {
    const portalRoot = document.getElementById('scanner-portal-root');
    if (!portalRoot) {
      const newPortal = document.createElement('div');
      newPortal.id = 'scanner-portal-root';
      // Make it invisible but keep it in DOM
      newPortal.style.display = 'contents';
      document.body.appendChild(newPortal);
    }
  }, []);

  const portalRoot = document.getElementById('scanner-portal-root');
  if (!portalRoot) return null;

  return createPortal(children, portalRoot);
}
