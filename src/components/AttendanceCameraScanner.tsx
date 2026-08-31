import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { 
  Camera, 
  FlipHorizontal, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Volume2, 
  VolumeX, 
  QrCode, 
  Upload, 
  Sparkles,
  SwitchCamera,
  Layers,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface AttendanceCameraScannerProps {
  onScan: (scannedData: string, cameraSource: 'Front Camera' | 'Back Camera' | 'Manual Scanner') => void;
  terminalMode: 'auto' | 'in' | 'out';
  autoStart?: boolean;
}

export const AttendanceCameraScanner: React.FC<AttendanceCameraScannerProps> = ({
  onScan,
  terminalMode,
  autoStart = true,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [alwaysOn, setAlwaysOn] = useState(true);
  const [userPaused, setUserPaused] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(autoStart);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user'); // 'user' = Front, 'environment' = Back
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [scanningStatus, setScanningStatus] = useState<string>('Initializing Smart Camera (Always On)...');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(false);
  const [capturedBadgeSide, setCapturedBadgeSide] = useState<'Front' | 'Back' | 'Auto'>('Auto');

  // Play a pleasant beep chime sound upon successful QR code detection using Web Audio API
  const playBeep = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12); // E6 chime

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.warn('Audio playback error', e);
    }
  }, [soundEnabled]);

  // Enumerate available video input devices
  const updateDeviceList = async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices.filter(d => d.kind === 'videoinput');
      setDevices(videoInputs);
    } catch (err) {
      console.error('Error enumerating video devices', err);
    }
  };

  // Start the video stream
  const startCamera = async () => {
    setCameraError(null);
    setScanningStatus('Accessing camera feed...');

    // Stop existing stream if running
    stopCameraStream();

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera access API is not supported in this browser context.');
      setScanningStatus('Camera API unavailable');
      setIsCameraActive(false);
      return;
    }

    try {
      let stream: MediaStream | null = null;

      // Attempt 1: Try with preferred constraints (facing mode or specific device)
      try {
        let constraints: MediaStreamConstraints = {};
        if (selectedDeviceId) {
          constraints = { video: { deviceId: { exact: selectedDeviceId } }, audio: false };
        } else {
          constraints = { video: { facingMode: facingMode }, audio: false };
        }
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (primaryErr) {
        console.warn('Primary camera constraints failed, attempting generic video fallback...', primaryErr);
        // Attempt 2: Basic fallback with video: true
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      if (stream && videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS Safari
        await videoRef.current.play();
        setIsCameraActive(true);
        setCameraError(null);
        setScanningStatus('Smart Auto-Detect Active: Align QR badge in frame');
        updateDeviceList();
      }
    } catch (err: any) {
      console.error('Camera startup error:', err);
      let errMsg = 'Failed to open camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errMsg = 'Camera permission blocked or denied by browser/iframe. Please grant camera permission or open app in a new tab.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errMsg = `No ${facingMode === 'user' ? 'Front' : 'Back'} Camera device found on this system.`;
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errMsg = 'Camera is currently in use by another application or browser tab.';
      } else if (err.name === 'OverconstrainedError') {
        errMsg = 'Camera device does not support requested constraints. Trying basic mode...';
      }
      setCameraError(errMsg);
      setScanningStatus('Camera offline');
      setIsCameraActive(false);
    }
  };

  const stopCameraStream = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  // Continuous frame scanning loop using jsQR
  const scanFrame = useCallback(() => {
    if (!isCameraActive || !videoRef.current || !canvasRef.current || cooldown) {
      animationFrameId.current = requestAnimationFrame(scanFrame);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      });

      if (code && code.data) {
        const qrText = code.data.trim();
        if (qrText && qrText !== lastScannedCode) {
          playBeep();
          setLastScannedCode(qrText);
          setCooldown(true);
          setScanningStatus(`QR Detected: ${qrText}`);

          const camSource = facingMode === 'user' ? 'Front Camera' : 'Back Camera';
          onScan(qrText, camSource);

          // Draw highlight bounding box on detected QR code
          ctx.beginPath();
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#2DD4BF'; // Teal accent
          ctx.moveTo(code.location.topLeftCorner.x, code.location.topLeftCorner.y);
          ctx.lineTo(code.location.topRightCorner.x, code.location.topRightCorner.y);
          ctx.lineTo(code.location.bottomRightCorner.x, code.location.bottomRightCorner.y);
          ctx.lineTo(code.location.bottomLeftCorner.x, code.location.bottomLeftCorner.y);
          ctx.closePath();
          ctx.stroke();

          // Reset cooldown after 2.5 seconds to allow subsequent punches
          setTimeout(() => {
            setCooldown(false);
            setLastScannedCode(null);
            setScanningStatus('Smart Auto-Detect Active: Align QR badge in frame');
          }, 2500);
        }
      }
    }

    animationFrameId.current = requestAnimationFrame(scanFrame);
  }, [isCameraActive, cooldown, lastScannedCode, facingMode, onScan, playBeep]);

  // Handle camera toggles
  const toggleFacingMode = () => {
    setSelectedDeviceId(''); // Clear specific device selection to switch facing mode
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    toast.info(`Switched to ${nextMode === 'user' ? 'Front' : 'Back'} Camera`);
  };

  const handleDeviceChange = (devId: string) => {
    setSelectedDeviceId(devId);
    toast.info('Selected video device changed');
  };

  // Upload photo of badge (Front or Back side) to decode QR
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const ctx = tempCanvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height, {
          inversionAttempts: 'attemptBoth'
        });

        if (code && code.data) {
          playBeep();
          const qrText = code.data.trim();
          toast.success(`Successfully decoded QR Code from uploaded ${capturedBadgeSide} Badge!`);
          const camSource = facingMode === 'user' ? 'Front Camera' : 'Back Camera';
          onScan(qrText, camSource);
        } else {
          toast.error(`Could not detect a valid QR Code in the uploaded image. Please ensure clear lighting.`);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Lifecycle effects & Always-On persistence
  useEffect(() => {
    if (autoStart && !userPaused) {
      startCamera();
    }
    return () => {
      stopCameraStream();
    };
  }, [facingMode, selectedDeviceId, autoStart, userPaused]);

  // Auto-reconnect retry loop when Always-ON is enabled and camera is offline
  useEffect(() => {
    if (!alwaysOn || userPaused || isCameraActive) return;

    const retryInterval = setInterval(() => {
      console.log('Always-ON Kiosk Mode: Retrying camera initialization...');
      startCamera();
    }, 4000);

    return () => clearInterval(retryInterval);
  }, [alwaysOn, userPaused, isCameraActive, facingMode, selectedDeviceId]);

  // Visibility change listener to immediately re-engage camera when returning to tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && alwaysOn && !userPaused) {
        startCamera();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [alwaysOn, userPaused, facingMode, selectedDeviceId]);

  useEffect(() => {
    if (isCameraActive) {
      animationFrameId.current = requestAnimationFrame(scanFrame);
    } else if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [isCameraActive, scanFrame]);

  return (
    <div className="space-y-4">
      {/* Top Camera Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-900 rounded-xl text-white">
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={`text-[10px] font-black uppercase px-2.5 py-1 border-none ${
              isCameraActive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-400'
            }`}
          >
            <span className={`w-2 h-2 rounded-full mr-1.5 ${isCameraActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
            {isCameraActive ? `${facingMode === 'user' ? 'Front Camera' : 'Back Camera'} LIVE` : 'Camera Off'}
          </Badge>

          <span className="text-[11px] text-slate-300 font-mono hidden sm:inline">
            Mode: <strong className="text-teal-300">{terminalMode === 'auto' ? 'Smart Auto-Detect' : terminalMode === 'in' ? 'Check-In Only' : 'Check-Out Only'}</strong>
          </span>
        </div>

        {/* Quick Camera Actions */}
        <div className="flex items-center gap-2">
          {/* Always ON Toggle Badge */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const next = !alwaysOn;
              setAlwaysOn(next);
              if (next) setUserPaused(false);
              toast.info(`Always-ON Kiosk Mode ${next ? 'ENABLED' : 'DISABLED'}`);
            }}
            className={`h-8 text-xs font-bold gap-1 cursor-pointer ${
              alwaysOn ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Always-ON mode automatically reconnects camera and keeps kiosk listening"
          >
            <Zap className={`w-3.5 h-3.5 ${alwaysOn ? 'text-amber-400 fill-amber-400 animate-bounce' : 'text-slate-500'}`} />
            Always ON
          </Button>

          {/* Sound Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-800"
            title={soundEnabled ? 'Mute Chime Sound' : 'Enable Chime Sound'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-teal-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </Button>

          {/* Front / Back Toggle Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFacingMode}
            className="h-8 bg-slate-800 hover:bg-slate-700 text-teal-300 border-slate-700 text-xs font-bold gap-1.5 cursor-pointer"
          >
            <SwitchCamera className="w-3.5 h-3.5" />
            Switch to {facingMode === 'user' ? 'Back' : 'Front'} Cam
          </Button>

          {/* Start / Stop Toggle */}
          {isCameraActive ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                stopCameraStream();
                setIsCameraActive(false);
                setUserPaused(true);
                setScanningStatus('Camera paused');
              }}
              className="h-8 text-xs font-bold cursor-pointer"
            >
              Pause Cam
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setUserPaused(false);
                startCamera();
              }}
              className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              Open Camera
            </Button>
          )}
        </div>
      </div>

      {/* Main Video & Live Viewport Container */}
      <div className="relative aspect-video max-w-lg mx-auto bg-slate-950 rounded-2xl overflow-hidden border-4 border-slate-800 shadow-2xl flex flex-col justify-between text-white font-mono">
        {/* Hidden Canvas for Frame Processing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Live Video Feed */}
        <video
          ref={videoRef}
          className={`w-full h-full object-cover transition-opacity duration-300 ${isCameraActive ? 'opacity-100' : 'opacity-0 absolute'}`}
        />

        {/* Animated Laser Scan Line Effect */}
        {isCameraActive && (
          <>
            <div className="absolute inset-0 bg-gradient-to-b from-teal-500/5 to-teal-500/15 pointer-events-none" />
            <div className="absolute left-0 right-0 h-1 bg-teal-400 shadow-[0_0_20px_#2dd4bf] animate-[bounce_2.5s_infinite] opacity-90" />
            
            {/* Corner Framing Overlay */}
            <div className="absolute inset-8 pointer-events-none border-2 border-dashed border-teal-400/40 rounded-xl flex items-center justify-center">
              <div className="w-16 h-16 border-t-4 border-l-4 border-teal-400 absolute top-0 left-0 rounded-tl-lg" />
              <div className="w-16 h-16 border-t-4 border-r-4 border-teal-400 absolute top-0 right-0 rounded-tr-lg" />
              <div className="w-16 h-16 border-b-4 border-l-4 border-teal-400 absolute bottom-0 left-0 rounded-bl-lg" />
              <div className="w-16 h-16 border-b-4 border-r-4 border-teal-400 absolute bottom-0 right-0 rounded-br-lg" />
            </div>
          </>
        )}

        {/* Placeholder View when Camera is Inactive or Encountering Error */}
        {!isCameraActive && (
          <div className="flex flex-col items-center justify-center py-10 px-6 text-center space-y-3 my-auto z-20">
            <div className="p-3.5 rounded-full bg-slate-900 border border-slate-800 text-teal-400 shadow-inner">
              <QrCode className="w-10 h-10 animate-pulse text-teal-400" />
            </div>
            {cameraError ? (
              <div className="space-y-2 max-w-xs">
                <p className="text-xs text-rose-400 font-bold flex items-center justify-center gap-1.5 leading-tight">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {cameraError}
                </p>
                <p className="text-[10px] text-slate-400 leading-normal">
                  If running inside an iFrame, click "Allow Camera" in your browser bar or open in a direct tab.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-xs text-slate-300 font-bold">Smart Auto-Detect Camera Paused</p>
                <p className="text-[10px] text-slate-400">Always-ON mode is ready to activate stream</p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
              <Button
                size="sm"
                onClick={() => {
                  setUserPaused(false);
                  setAlwaysOn(true);
                  startCamera();
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 cursor-pointer shadow-lg"
              >
                <Camera className="w-4 h-4" />
                Retry / Keep Always ON ({facingMode === 'user' ? 'Front' : 'Back'})
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(window.location.href, '_blank')}
                className="bg-slate-800 hover:bg-slate-700 text-teal-300 border-slate-700 text-xs font-bold cursor-pointer"
                title="Open app in direct browser window for full hardware camera permissions"
              >
                Open in Full Window
              </Button>
            </div>
          </div>
        )}

        {/* Top Information Bar on Video */}
        <div className="relative z-10 flex justify-between items-center p-3 text-[10px] text-teal-400 font-bold tracking-widest uppercase bg-slate-950/70 backdrop-blur-sm">
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" />
            GASTRO-K-01
          </span>
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${cooldown ? 'bg-amber-400' : 'bg-emerald-400'} animate-ping`} />
            {cooldown ? 'Processing...' : 'Live QR Scanner'}
          </span>
        </div>

        {/* Bottom Status Overlay */}
        <div className="relative z-10 p-2.5 bg-slate-950/80 backdrop-blur-sm text-center border-t border-slate-800">
          <p className="text-[11px] text-teal-200 font-bold tracking-wide flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            {scanningStatus}
          </p>
        </div>
      </div>

      {/* Device Selection & Front/Back Upload Options Bar */}
      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          {/* Specific Device Selector Dropdown */}
          {devices.length > 0 && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-[11px] font-bold text-slate-600 whitespace-nowrap">Camera Device:</span>
              <Select value={selectedDeviceId} onValueChange={handleDeviceChange}>
                <SelectTrigger className="h-8 text-xs bg-white border-slate-300 w-full sm:w-60">
                  <SelectValue placeholder={`Auto (${facingMode === 'user' ? 'Front' : 'Back'})`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Auto Select ({facingMode === 'user' ? 'Front' : 'Back'})</SelectItem>
                  {devices.map((d, i) => (
                    <SelectItem key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `Camera ${i + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Front / Back Badge Upload Button */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCapturedBadgeSide('Front');
                fileInputRef.current?.click();
              }}
              className="h-8 bg-white border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold gap-1 cursor-pointer flex-1 sm:flex-initial"
            >
              <Upload className="w-3.5 h-3.5 text-teal-600" />
              Scan Front Badge Photo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCapturedBadgeSide('Back');
                fileInputRef.current?.click();
              }}
              className="h-8 bg-white border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold gap-1 cursor-pointer flex-1 sm:flex-initial"
            >
              <Upload className="w-3.5 h-3.5 text-blue-600" />
              Scan Back Badge Photo
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
