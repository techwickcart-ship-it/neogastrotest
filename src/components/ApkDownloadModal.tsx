import React, { useState } from 'react';
import { 
  Download, 
  Smartphone, 
  CheckCircle2, 
  ShieldCheck, 
  Wifi, 
  Layers, 
  Sparkles, 
  Info,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  ArrowDownToLine,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { downloadHospitalApk, installMobileApp, isAndroidDevice, isMobileDevice } from '@/utils/apkDownloader';

interface ApkDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  hospitalName?: string;
}

export function ApkDownloadModal({ isOpen, onClose, hospitalName = 'Neo GastroPlus Hospital' }: ApkDownloadModalProps) {
  const [downloading, setDownloading] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<'apk' | 'pwa'>('apk');

  const handleDownloadApk = async () => {
    setDownloading(true);
    
    // First attempt native Android WebAPK install if prompt is ready
    const result = await installMobileApp();
    if (result === 'installed') {
      toast.success('🎉 Hospital App installed successfully to your Android app drawer!');
      setDownloading(false);
      onClose();
      return;
    }

    // Trigger package guide / APK download
    toast.info('Initiating Android App installation package...');
    setTimeout(() => {
      const success = downloadHospitalApk(hospitalName);
      setDownloading(false);
      if (success) {
        toast.success('Installation package ready! Follow the steps below on your phone.');
      } else {
        toast.error('Could not initiate package download. Please try Chrome installation.');
      }
    }, 400);
  };

  const handleInstallPwa = async () => {
    const result = await installMobileApp();
    if (result === 'installed') {
      toast.success('🎉 App installed successfully to your home screen!');
      onClose();
    } else if (result === 'dismissed') {
      toast.info('Installation cancelled.');
    } else {
      toast.info('To install: In Chrome, tap the 3-dots (⋮) menu and select "Install app" or "Add to Home screen".');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden rounded-3xl border border-slate-200 shadow-2xl bg-white">
        {/* Header with gradient banner */}
        <div className="bg-gradient-to-br from-[#1A5E63] via-[#14494D] to-[#0D3235] text-white p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-400/10 rounded-full blur-xl -ml-10 -mb-10 pointer-events-none" />
          
          <div className="relative z-10 flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg">
                <Smartphone className="w-6 h-6 text-amber-300 animate-pulse" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase tracking-wider mb-1">
                  <Sparkles className="w-3 h-3" /> Android APK & Mobile App
                </span>
                <h2 className="text-xl font-extrabold tracking-tight text-white">
                  Download Mobile APK
                </h2>
                <p className="text-xs text-teal-100/90 font-medium mt-0.5">
                  {hospitalName} Mobile Client (v2.4)
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-teal-200/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Main Action Buttons Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Primary APK Download Card */}
            <div className="p-4 rounded-2xl border-2 border-[#1A5E63] bg-teal-50/50 flex flex-col justify-between space-y-3 relative group hover:shadow-md transition-all">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#1A5E63] text-white">
                    Direct Package
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">v2.4.0 • 18 MB</span>
                </div>
                <h4 className="text-sm font-extrabold text-slate-900 pt-1">Download APK File</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Install standalone Android APK file with all hospital modules and offline capabilities.
                </p>
              </div>

              <Button
                onClick={handleDownloadApk}
                disabled={downloading}
                className="w-full bg-[#1A5E63] hover:bg-[#13494d] text-white font-bold text-xs h-10 rounded-xl shadow-sm gap-2"
              >
                {downloading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <ArrowDownToLine className="w-4 h-4" />
                    Download APK (.apk)
                  </>
                )}
              </Button>
            </div>

            {/* Instant PWA / Home Screen Card */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-3 hover:border-slate-300 hover:shadow-md transition-all">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500 text-white">
                    Instant App
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">Zero Storage</span>
                </div>
                <h4 className="text-sm font-extrabold text-slate-900 pt-1">Install to Home Screen</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Add full-screen app icon to your phone with instant launch and auto-updates.
                </p>
              </div>

              <Button
                onClick={handleInstallPwa}
                variant="outline"
                className="w-full border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs h-10 rounded-xl gap-2"
              >
                <Smartphone className="w-4 h-4 text-amber-600" />
                Add to Home Screen
              </Button>
            </div>
          </div>

          {/* Included Features Pill Banner */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 space-y-2">
            <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Included Mobile Packages & Features
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 font-semibold">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>Full OPD & IPD Management</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>Camera Rx & Document Scanner</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>Thermal & Bluetooth Token Print</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>Real-time Multi-Device Sync</span>
              </div>
            </div>
          </div>

          {/* How to Install Steps */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-4 h-4 text-medical-blue" /> Easy Installation Steps
              </h4>
              <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                <button
                  onClick={() => setActiveGuideTab('apk')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    activeGuideTab === 'apk' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  APK Installation
                </button>
                <button
                  onClick={() => setActiveGuideTab('pwa')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    activeGuideTab === 'pwa' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Chrome / Browser
                </button>
              </div>
            </div>

            {activeGuideTab === 'apk' ? (
              <ol className="space-y-2 text-xs text-slate-700 font-medium">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-teal-100 text-[#1A5E63] font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    Tap <strong className="text-slate-900">"Download APK"</strong> above to save <code className="bg-slate-100 px-1 py-0.5 rounded text-[10px] font-mono text-slate-800">.apk</code> file to your device.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-teal-100 text-[#1A5E63] font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    Open notification bar or Files app and tap on the downloaded file.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-teal-100 text-[#1A5E63] font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <span>
                    If prompted, tap <strong className="text-slate-900">Settings &gt; Allow from this source</strong>, then tap <strong className="text-slate-900">Install</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-teal-100 text-[#1A5E63] font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    4
                  </span>
                  <span>
                    Open <strong className="text-slate-900">Neo GastroPlus HMS</strong> from your app drawer and login with your Staff ID & Password!
                  </span>
                </li>
              </ol>
            ) : (
              <ol className="space-y-2 text-xs text-slate-700 font-medium">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    Open this URL in <strong className="text-slate-900">Google Chrome</strong> (Android) or <strong className="text-slate-900">Safari</strong> (iOS).
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    Tap the <strong>three dots (⋮)</strong> menu in Chrome or the <strong>Share (⎋)</strong> icon in Safari.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <span>
                    Select <strong className="text-slate-900">"Install app"</strong> or <strong className="text-slate-900">"Add to Home screen"</strong>.
                  </span>
                </li>
              </ol>
            )}
          </div>
        </div>

        <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between sm:justify-between">
          <p className="text-[11px] text-slate-500 font-medium">
            Compatible with Android 7.0 to Android 14+
          </p>
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl font-bold text-xs">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
