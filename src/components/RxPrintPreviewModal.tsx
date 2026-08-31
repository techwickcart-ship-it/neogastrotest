import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Printer, 
  ExternalLink, 
  Download, 
  X, 
  FileText, 
  Maximize2, 
  Minimize2, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Sparkles,
  Expand,
  Shrink,
  Scaling,
  Smartphone,
  Monitor,
  MessageSquare,
  Send
} from 'lucide-react';
import { toast } from 'sonner';
import { triggerWhatsAppPrescription, WhatsAppPrescriptionPayload } from '@/lib/whatsappService';

export const triggerRxPrintPreview = (
  htmlContent: string | { html: string; payload?: WhatsAppPrescriptionPayload },
  explicitPayload?: WhatsAppPrescriptionPayload
) => {
  if (typeof window !== 'undefined') {
    if (typeof htmlContent === 'object' && htmlContent !== null) {
      window.dispatchEvent(new CustomEvent('open-rx-preview', { detail: htmlContent }));
    } else {
      window.dispatchEvent(
        new CustomEvent('open-rx-preview', {
          detail: { html: htmlContent, payload: explicitPayload }
        })
      );
    }
  }
};

export const RxPrintPreviewModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [prescriptionPayload, setPrescriptionPayload] = useState<WhatsAppPrescriptionPayload | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [viewFitMode, setViewFitMode] = useState<'fit-width' | 'actual' | 'fit-page'>('actual');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOpenPreview = (e: any) => {
      if (e.detail?.html) {
        setHtmlContent(e.detail.html);
        if (e.detail.payload) {
          setPrescriptionPayload(e.detail.payload);
        } else {
          setPrescriptionPayload(null);
        }
        setIsOpen(true);
        setZoomLevel(100);
        setViewFitMode('actual');
      }
    };

    window.addEventListener('open-rx-preview', handleOpenPreview);
    return () => {
      window.removeEventListener('open-rx-preview', handleOpenPreview);
    };
  }, []);

  // Handle close events and keyboard shortcuts
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'close-rx-preview' || e.data?.action === 'close' || e.data === 'close-rx-preview') {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          setIsOpen(false);
        }
      } else if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && document.activeElement?.tagName !== 'INPUT') {
        setIsFullscreen(prev => !prev);
      } else if ((e.key === 'w' || e.key === 'W') && !e.ctrlKey && !e.metaKey && document.activeElement?.tagName !== 'INPUT') {
        setZoomLevel(prev => (prev === 100 ? 120 : 100));
      } else if (e.key === '+' || e.key === '=') {
        setZoomLevel(prev => Math.min(220, prev + 15));
      } else if (e.key === '-') {
        setZoomLevel(prev => Math.max(50, prev - 15));
      } else if (e.key === '0') {
        setZoomLevel(100);
      }
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isFullscreen]);

  // Clean html string for inline iframe preview without auto-print loops and with responsive styling
  const cleanHtml = useMemo(() => {
    if (!htmlContent) return '';
    const closeHandler = `try{if(window.parent&&window.parent!==window){window.parent.postMessage({type:'close-rx-preview'},'*');}}catch(e){}try{window.close();}catch(e){}`;
    
    // Inject clean styling for seamless full-page preview
    const previewStyles = `
      <style id="rx-preview-override">
        .no-print { display: none !important; }
        html, body {
          background-color: #0f172a !important;
          margin: 0 !important;
          padding: 24px 12px !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          min-height: 100vh !important;
          box-sizing: border-box !important;
        }
        .page-container, .print-container, .prescription-container {
          margin: 0 auto !important;
          box-sizing: border-box !important;
          box-shadow: 0 12px 40px rgba(0,0,0,0.35) !important;
          background: #ffffff !important;
          border-radius: 8px !important;
          overflow: hidden !important;
          transition: all 0.2s ease !important;
        }
        @media screen and (max-width: 860px) {
          html, body {
            padding: 8px 4px !important;
          }
          .page-container, .print-container, .prescription-container {
            width: 100% !important;
            max-width: 100% !important;
            padding: 14px 12px !important;
            box-shadow: 0 4px 16px rgba(0,0,0,0.2) !important;
          }
        }
        @media print {
          .no-print { display: none !important; }
          html, body { 
            background: #ffffff !important;
            color: #0f172a !important;
            padding: 0 !important; 
            margin: 0 !important; 
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .page-container, .print-container, .prescription-container {
            box-shadow: none !important;
            border-radius: 0 !important;
            border: none !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 5mm 8mm !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          img {
            max-width: 100% !important;
            visibility: visible !important;
            display: block !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .doctor-strip {
            background-color: #003d46 !important;
            color: #ffffff !important;
            border: 1px solid #002b31 !important;
          }
          .doctor-strip .doc-name {
            color: #ffffff !important;
            font-weight: 900 !important;
          }
          .doctor-strip .doc-label {
            color: #5eead4 !important;
            font-weight: 800 !important;
          }
          .doctor-strip .doc-degree {
            color: #facc15 !important;
            font-weight: 800 !important;
          }
          .doctor-strip .doc-reg {
            color: #ffffff !important;
            font-weight: 800 !important;
            background-color: rgba(255,255,255,0.12) !important;
            border: 1px solid rgba(255,255,255,0.3) !important;
          }
          .bottom-footer-banner {
            background-color: #f8fafc !important;
            border: 1px solid #005662 !important;
            border-top: 2px solid #005662 !important;
          }
        }
      </style>
    `;

    let processed = htmlContent
      .replace(/<script[\s\S]*?window\.print\(\)[\s\S]*?<\/script>/gi, '')
      .replace(/window\.close\(\)/g, closeHandler);

    if (processed.includes('</head>')) {
      processed = processed.replace('</head>', `${previewStyles}</head>`);
    } else {
      processed = `${previewStyles}${processed}`;
    }

    return processed;
  }, [htmlContent]);

  // Attach direct DOM event handlers to buttons inside the iframe for guaranteed response
  const attachIframeEvents = useCallback(() => {
    try {
      const doc = iframeRef.current?.contentDocument || iframeRef.current?.contentWindow?.document;
      if (doc) {
        const buttons = doc.querySelectorAll('button');
        buttons.forEach((btn) => {
          const text = (btn.textContent || '').trim().toLowerCase();
          const onclickAttr = btn.getAttribute('onclick') || '';
          if (text.includes('close') || onclickAttr.includes('close') || btn.id.includes('close')) {
            btn.onclick = (e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsOpen(false);
            };
          }
        });

        doc.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Escape') {
            if (isFullscreen) {
              setIsFullscreen(false);
            } else {
              setIsOpen(false);
            }
          } else if (e.key === 'f' || e.key === 'F') {
            setIsFullscreen(prev => !prev);
          }
        });
      }
    } catch (err) {
      console.log('Iframe event binding note:', err);
    }
  }, [isFullscreen]);

  useEffect(() => {
    if (isOpen && cleanHtml && iframeRef.current) {
      const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
      if (doc) {
        try {
          doc.open();
          doc.write(cleanHtml);
          doc.close();
          attachIframeEvents();
        } catch (e) {
          console.error('Error writing cleanHtml into iframe:', e);
        }
      }

      const timer = setTimeout(() => {
        attachIframeEvents();
        try {
          if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.focus();
          }
        } catch (err) {
          // ignore
        }
      }, 400);

      return () => clearTimeout(timer);
    }
  }, [isOpen, cleanHtml, attachIframeEvents]);

  const handlePrint = () => {
    try {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
        return;
      }
    } catch (err) {
      console.error('Iframe print error:', err);
    }

    try {
      const win = window.open('', '_blank');
      if (win) {
        win.document.open();
        win.document.write(cleanHtml || htmlContent);
        win.document.close();
        win.focus();
        setTimeout(() => {
          win.print();
        }, 500);
      } else {
        toast.error('Could not open print window. Please allow popups or try "Open in New Tab"');
      }
    } catch (err) {
      console.error('Fallback print error:', err);
      toast.error('Print failed. Please click "Open in New Tab".');
    }
  };

  const handleOpenNewTab = () => {
    try {
      const win = window.open('', '_blank');
      if (win) {
        win.document.open();
        win.document.write(htmlContent);
        win.document.close();
        win.focus();
        toast.success('Prescription opened in standalone expanded tab');
      } else {
        toast.error('Popup blocked. Please allow popups for this site.');
      }
    } catch (err) {
      console.error('Error opening new tab:', err);
      toast.error('Failed to open prescription in new tab');
    }
  };

  const handleDownload = () => {
    try {
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Prescription_OPD_${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Prescription HTML file downloaded');
    } catch (err) {
      toast.error('Failed to download prescription');
    }
  };

  const handleWhatsAppShare = () => {
    if (prescriptionPayload) {
      triggerWhatsAppPrescription(prescriptionPayload);
      return;
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      const text = doc.body.innerText || '';
      
      const nameMatch = text.match(/(?:Patient\s*Name|Name)\s*[:]\s*([A-Za-z\s.]+)/i);
      const phoneMatch = text.match(/(?:Phone|Mobile|Contact|Tel)\s*[:]\s*([+\d\s-]+)/i);
      const mrnMatch = text.match(/(?:MRN|UHID|Reg\s*No)\s*[:]\s*([A-Za-z0-9-]+)/i);
      const docMatch = text.match(/Dr\.\s*([A-Za-z\s.]+)/i);

      triggerWhatsAppPrescription({
        patient: {
          name: nameMatch ? nameMatch[1].trim() : 'Patient',
          phone: phoneMatch ? phoneMatch[1].trim() : '',
          mrn: mrnMatch ? mrnMatch[1].trim() : ''
        },
        prescription: {
          date: new Date().toISOString().split('T')[0],
          medicines: [],
          advice: ''
        },
        doctor: {
          name: docMatch ? `Dr. ${docMatch[1].trim()}` : 'Attending Physician'
        }
      });
    } catch {
      triggerWhatsAppPrescription({
        patient: { name: 'Patient', phone: '' },
        prescription: { date: new Date().toISOString().split('T')[0] }
      });
    }
  };

  // Toggle Expanded Fullscreen Mode
  const toggleExpandedFullscreen = () => {
    setIsFullscreen(prev => {
      const next = !prev;
      if (next) {
        toast.info('Expanded Fullscreen View Activated (Press ESC or F to exit)', { duration: 2500 });
      }
      return next;
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent 
        showCloseButton={false} 
        className={`flex flex-col p-0 gap-0 bg-slate-950 border-slate-700 overflow-hidden shadow-2xl transition-all duration-150 ${
          isFullscreen 
            ? 'fixed inset-0 top-0 left-0 translate-x-0 translate-y-0 w-screen h-screen max-w-none max-h-none sm:max-w-none rounded-none z-50 m-0' 
            : 'max-w-[98vw] w-[98vw] sm:w-[96vw] md:w-[94vw] lg:w-[92vw] xl:w-[90vw] h-[96vh] max-h-[96vh] rounded-2xl border'
        }`}
      >
        {/* Top Header & Toolbar with clean wrapping and guaranteed visibility */}
        <DialogHeader className="py-2.5 px-3 sm:px-4 bg-slate-900 text-white border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between shrink-0 gap-2">
          {/* Title & Document Badge */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-emerald-400 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-xs sm:text-sm font-bold text-white tracking-tight">
                  OPD Prescription Document
                </DialogTitle>
                <Badge variant="outline" className="bg-emerald-950/60 text-emerald-300 border-emerald-700/50 text-[10px] px-1.5 py-0">
                  Full Page Print View
                </Badge>
                {isFullscreen && (
                  <Badge className="bg-blue-600 text-white text-[10px] px-1.5 py-0 font-bold uppercase tracking-wider animate-pulse">
                    Expanded View Active
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-slate-400 truncate hidden sm:block">
                Standard A4 medical format &bull; Press <kbd className="px-1 py-0.2 bg-slate-800 rounded text-slate-300 border border-slate-700 font-mono text-[9px]">F</kbd> for Expanded View
              </p>
            </div>
          </div>
          
          {/* Action Toolbar with guaranteed visibility */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
            
            {/* PROMINENT EXPANDED VIEW BUTTON */}
            <Button
              size="sm"
              onClick={toggleExpandedFullscreen}
              className={`h-8 px-2.5 sm:px-3 text-xs font-bold gap-1.5 shadow-md transition-all ${
                isFullscreen
                  ? 'bg-blue-600 hover:bg-blue-500 text-white ring-2 ring-blue-400/30'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
              title={isFullscreen ? "Exit Expanded Fullscreen View (Press F or Esc)" : "Expand Prescription Preview to Full Screen (Press F)"}
            >
              {isFullscreen ? (
                <>
                  <Shrink className="w-3.5 h-3.5" />
                  <span>Exit Expanded View</span>
                </>
              ) : (
                <>
                  <Expand className="w-3.5 h-3.5" />
                  <span>Expanded View</span>
                </>
              )}
            </Button>

            {/* Zoom Controls */}
            <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-lg p-0.5">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-1.5 sm:px-2 text-slate-300 hover:text-white text-xs"
                onClick={() => setZoomLevel(prev => Math.max(50, prev - 15))}
                title="Zoom Out (-)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </Button>
              <span className="text-[11px] font-bold font-mono text-slate-200 w-11 sm:w-12 text-center select-none">
                {zoomLevel}%
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-1.5 sm:px-2 text-slate-300 hover:text-white text-xs"
                onClick={() => setZoomLevel(prev => Math.min(220, prev + 15))}
                title="Zoom In (+)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-1.5 sm:px-2 text-slate-400 hover:text-white text-[10px] font-bold border-l border-slate-800"
                onClick={() => setZoomLevel(100)}
                title="Reset to 100% (0)"
              >
                <RotateCcw className="w-3 h-3 mr-0.5" /> 100%
              </Button>
            </div>

            {/* Send WhatsApp Button */}
            <Button
              size="sm"
              className="bg-[#25D366] hover:bg-[#128C7E] text-white font-bold gap-1.5 h-8 text-xs shadow-sm cursor-pointer"
              onClick={handleWhatsAppShare}
              title="Share / Send Prescription to Patient via WhatsApp"
            >
              <MessageSquare className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">Send WhatsApp</span>
              <span className="sm:hidden">WhatsApp</span>
            </Button>

            {/* Print & Save PDF Button */}
            <Button 
              size="sm" 
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5 h-8 text-xs shadow-sm"
              onClick={handlePrint}
              title="Print Prescription or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print / Save PDF</span>
              <span className="sm:hidden">Print</span>
            </Button>
            
            {/* Open in Standalone Tab */}
            <Button 
              size="sm" 
              variant="outline" 
              className="border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white font-medium gap-1.5 h-8 text-xs"
              onClick={handleOpenNewTab}
              title="Open full prescription in a separate standalone browser tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Open in New Tab</span>
            </Button>

            {/* Download HTML */}
            <Button 
              size="sm" 
              variant="outline" 
              className="border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white font-medium h-8 w-8 p-0 hidden lg:inline-flex"
              onClick={handleDownload}
              title="Download HTML file"
            >
              <Download className="w-3.5 h-3.5" />
            </Button>

            {/* Close Modal Button */}
            <Button 
              size="sm" 
              variant="ghost" 
              className="text-slate-400 hover:text-white hover:bg-rose-950/40 hover:text-rose-400 h-8 w-8 p-0 ml-0.5"
              onClick={() => setIsOpen(false)}
              title="Close Preview (Esc)"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Main Preview Viewport */}
        <div 
          ref={containerRef}
          className="flex-1 bg-slate-950 p-2 sm:p-4 md:p-6 overflow-auto relative flex justify-center items-start scrollbar-thin scrollbar-thumb-slate-700"
        >
          <div 
            className="w-full h-full flex justify-center transition-all duration-150 origin-top"
            style={{
              transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : 'none',
              transformOrigin: 'top center',
              minHeight: zoomLevel > 100 ? `${zoomLevel}%` : '100%'
            }}
          >
            <iframe 
              ref={iframeRef}
              srcDoc={cleanHtml}
              title="Prescription Print Preview"
              className="w-full h-full min-h-[82vh] bg-white rounded-xl shadow-2xl border border-slate-700 max-w-5xl"
              onLoad={() => {
                try {
                  const doc = iframeRef.current?.contentDocument || iframeRef.current?.contentWindow?.document;
                  if (doc && (!doc.body || !doc.body.innerHTML || doc.body.innerHTML.trim() === '')) {
                    doc.open();
                    doc.write(cleanHtml);
                    doc.close();
                  }
                  attachIframeEvents();
                } catch (e) {
                  console.log('iframe onLoad sync error:', e);
                }
              }}
            />
          </div>

          {/* Sleek Floating Dock Controls at Bottom Center for Easy Access */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-full px-3 py-1.5 shadow-2xl flex items-center gap-1.5 z-20 text-slate-200">
            {/* Quick Expanded Toggle */}
            <Button
              size="sm"
              variant={isFullscreen ? "default" : "secondary"}
              className={`h-7 px-2.5 text-[11px] font-bold rounded-full gap-1 ${
                isFullscreen ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-100'
              }`}
              onClick={toggleExpandedFullscreen}
            >
              {isFullscreen ? <Shrink className="w-3 h-3" /> : <Expand className="w-3 h-3 text-indigo-400" />}
              <span>{isFullscreen ? 'Exit Expanded' : 'Expanded View'}</span>
            </Button>

            <div className="h-4 w-px bg-slate-700 mx-0.5" />

            {/* Quick Zoom Buttons */}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 rounded-full text-slate-300 hover:text-white hover:bg-slate-800"
              onClick={() => setZoomLevel(prev => Math.max(50, prev - 15))}
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <span className="text-[10px] font-mono font-bold text-slate-300 px-1">
              {zoomLevel}%
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 rounded-full text-slate-300 hover:text-white hover:bg-slate-800"
              onClick={() => setZoomLevel(prev => Math.min(220, prev + 15))}
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>

            <div className="h-4 w-px bg-slate-700 mx-0.5" />

            {/* Send WhatsApp */}
            <Button
              size="sm"
              className="h-7 px-2.5 text-[11px] font-bold rounded-full bg-[#25D366] hover:bg-[#128C7E] text-white gap-1 shadow-sm"
              onClick={handleWhatsAppShare}
              title="Send Prescription via WhatsApp"
            >
              <MessageSquare className="w-3 h-3 fill-current" />
              <span>WhatsApp</span>
            </Button>

            {/* Print */}
            <Button
              size="sm"
              className="h-7 px-2.5 text-[11px] font-bold rounded-full bg-emerald-600 hover:bg-emerald-500 text-white gap-1"
              onClick={handlePrint}
            >
              <Printer className="w-3 h-3" />
              <span>Print</span>
            </Button>

            {/* Open in Tab */}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[11px] font-medium rounded-full text-slate-300 hover:text-white hover:bg-slate-800 gap-1 hidden sm:flex"
              onClick={handleOpenNewTab}
              title="Open standalone window"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Tab</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};


