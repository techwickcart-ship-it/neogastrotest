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

export function hasInstallPrompt(): boolean {
  return !!deferredPrompt;
}

/**
 * Triggers native Android PWA / WebAPK Installation
 */
export async function installMobileApp(): Promise<'installed' | 'dismissed' | 'manual'> {
  if (deferredPrompt) {
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      return outcome === 'accepted' ? 'installed' : 'dismissed';
    } catch (e) {
      console.warn('Install prompt error:', e);
    }
  }
  return 'manual';
}

/**
 * Generates and triggers download of the installable Android Mobile package or setup guide
 */
export function downloadHospitalApk(hospitalName: string = 'NeoGastroPlus') {
  try {
    // If the browser supports native app installation (WebAPK), trigger it directly
    if (deferredPrompt) {
      installMobileApp();
      return true;
    }

    const fileName = `${hospitalName.replace(/[^a-zA-Z0-9]/g, '')}-Android-App-Guide.html`;
    
    const htmlGuide = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${hospitalName} - Android App Installer</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0F172A; color: #F8FAFC; padding: 24px; text-align: center; }
    .card { background: #1E293B; border-radius: 20px; padding: 28px; max-width: 480px; margin: 40px auto; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 1px solid #334155; }
    h1 { color: #38BDF8; font-size: 22px; margin-bottom: 8px; }
    p { color: #94A3B8; font-size: 14px; line-height: 1.6; }
    .btn { display: inline-block; background: #0284C7; color: white; padding: 14px 28px; border-radius: 12px; font-weight: bold; text-decoration: none; margin-top: 20px; }
    .steps { text-align: left; background: #0F172A; padding: 16px; border-radius: 12px; margin-top: 20px; font-size: 13px; }
    .steps li { margin-bottom: 8px; color: #CBD5E1; }
  </style>
</head>
<body>
  <div class="card">
    <div style="font-size: 48px; margin-bottom: 12px;">🏥</div>
    <h1>${hospitalName}</h1>
    <p>Android Mobile Application (v2.4)</p>
    
    <div class="steps">
      <strong>To install directly to your Android device app drawer:</strong>
      <ol>
        <li>Open the application URL in <strong>Google Chrome</strong>.</li>
        <li>Tap the <strong>three dots (⋮)</strong> menu in Chrome.</li>
        <li>Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
        <li>Android OS will automatically generate and install the native application package!</li>
      </ol>
    </div>

    <a href="${typeof window !== 'undefined' ? window.location.origin : '/'}" class="btn">Open App in Browser & Install</a>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlGuide], { type: 'text/html' });
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

