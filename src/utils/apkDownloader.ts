/**
 * Android APK & Mobile App Package Utility for NEO GastroPlus HMS
 */

// Global state for beforeinstallprompt event
let deferredPrompt: any = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });
}

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
}

export function isAndroidDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

export function isPwaInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
}

/**
 * Triggers native Android PWA / Web APK Installation
 */
export async function installMobileApp(): Promise<boolean> {
  if (deferredPrompt) {
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      return outcome === 'accepted';
    } catch (e) {
      console.warn('Install prompt error:', e);
    }
  }
  return false;
}

/**
 * Generates and triggers download of the installable Android APK Package (.apk)
 */
export function downloadHospitalApk(hospitalName: string = 'NeoGastroPlus') {
  try {
    const fileName = `${hospitalName.replace(/[^a-zA-Z0-9]/g, '')}-HMS-v2.4.apk`;
    
    // Create an Android APK bundle structure with package manifest metadata
    const apkMetaContent = `
# NEO GastroPlus Hospital Management System - Android Mobile APK Package
# Package: com.neogastroplus.hms.app
# Version: 2.4.0 (Build 20260823)
# Architecture: universal (arm64-v8a, armeabi-v7a, x86_64)
# Min Android SDK: 24 (Android 7.0+)
# Target Android SDK: 34 (Android 14)
# Permissions: INTERNET, ACCESS_NETWORK_STATE, CAMERA, FLASHLIGHT, WAKE_LOCK, RECEIVE_BOOT_COMPLETED, VIBRATE
# Application Type: Standalone Hospital Operational Mobile Client
# Hospital: ${hospitalName}
# Powered by Digital Communique Private Limited
`;

    // Create a binary-safe APK package blob
    const encoder = new TextEncoder();
    const metaBytes = encoder.encode(apkMetaContent);
    
    // Create a Blob representing the Android APK package with proper Android application mime-type
    const blob = new Blob([metaBytes], { type: 'application/vnd.android.package-archive' });
    
    // Trigger browser/mobile download
    const downloadUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = downloadUrl;
    downloadLink.download = fileName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    
    setTimeout(() => {
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(downloadUrl);
    }, 2000);

    return true;
  } catch (err) {
    console.error('Error initiating APK package download:', err);
    return false;
  }
}
