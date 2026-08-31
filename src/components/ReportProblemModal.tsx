import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Send, 
  MessageSquare, 
  Copy, 
  CheckCircle2, 
  Upload, 
  X, 
  Smartphone, 
  Wifi, 
  Info, 
  ShieldAlert, 
  HelpCircle,
  Camera,
  RotateCcw
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { storage } from '@/lib/storage';
import { supabaseService, saveAuditLog } from '@/services/supabaseService';

interface ReportProblemModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialError?: string | null;
  initialCategory?: string;
  user?: any;
}

export function ReportProblemModal({
  isOpen,
  onClose,
  initialError,
  initialCategory = 'Bug / App Error',
  user
}: ReportProblemModalProps) {
  const [category, setCategory] = useState(initialCategory);
  const [severity, setSeverity] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [description, setDescription] = useState('');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<any | null>(null);
  const [copiedDiag, setCopiedDiag] = useState(false);

  // Auto-fill error if passed
  useEffect(() => {
    if (initialError) {
      setDescription(prev => prev ? `${prev}\n\nError details: ${initialError}` : `Unexpected error occurred: ${initialError}`);
      setSeverity('High');
    }
  }, [initialError]);

  // System Diagnostics snapshot
  const getSystemDiagnostics = () => {
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    const isAndroid = /Android/i.test(navigator.userAgent);
    return {
      appName: 'NEO GastroPlus Hospital Management System',
      version: 'v2.4.0 (Mobile APK Universal)',
      deviceType: isAndroid ? 'Android Phone / Tablet' : isMobile ? 'Mobile Device' : 'Desktop / Workstation',
      screenResolution: `${window.innerWidth}x${window.innerHeight} (DPR: ${window.devicePixelRatio || 1})`,
      userAgent: navigator.userAgent,
      onlineStatus: navigator.onLine ? 'Connected (Online)' : 'Offline (Local Cache Active)',
      currentPath: window.location.pathname + window.location.search,
      userRole: user?.role || 'Guest / Unauthenticated',
      userName: user?.name || 'Staff User',
      timestamp: new Date().toISOString()
    };
  };

  const handleCopyDiagnostics = () => {
    const diag = getSystemDiagnostics();
    const text = `--- HMS SYSTEM DIAGNOSTICS ---
App: ${diag.appName} (${diag.version})
Device: ${diag.deviceType}
Resolution: ${diag.screenResolution}
Network: ${diag.onlineStatus}
Page: ${diag.currentPath}
Staff: ${diag.userName} (${diag.userRole})
Time: ${diag.timestamp}
User Agent: ${diag.userAgent}
${initialError ? `Error Stack: ${initialError}` : ''}`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedDiag(true);
      toast.success('System diagnostics copied to clipboard!');
      setTimeout(() => setCopiedDiag(false), 2500);
    } catch (e) {
      toast.info('Diagnostics details ready to share.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setScreenshot(reader.result as string);
        toast.success('Screenshot attached successfully');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error('Please describe the problem you encountered');
      return;
    }

    setIsSubmitting(true);
    const diag = getSystemDiagnostics();
    const ticketId = `ISSUE-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const problemReport = {
      id: ticketId,
      ticket_id: ticketId,
      category,
      severity,
      description: description.trim(),
      steps_to_reproduce: stepsToReproduce.trim(),
      contact_phone: contactPhone.trim(),
      user_name: diag.userName,
      user_role: diag.userRole,
      route: diag.currentPath,
      device_info: `${diag.deviceType} | ${diag.screenResolution}`,
      system_diagnostics: diag,
      error_stack: initialError || null,
      screenshot_url: screenshot,
      status: 'Open',
      created_at: new Date().toISOString()
    };

    try {
      // Save locally
      const existingReports = storage.get('hms_problem_reports', []);
      existingReports.unshift(problemReport);
      storage.set('hms_problem_reports', existingReports);

      // Save audit log
      try {
        await saveAuditLog({
          action: 'PROBLEM_REPORTED',
          module: 'System',
          details: `Ticket ${ticketId} filed by ${diag.userName}: ${category} (${severity}) - ${description.substring(0, 100)}`,
          user_id: user?.id,
          user_name: diag.userName
        });
      } catch (e) {}

      setSubmittedTicket(problemReport);
      toast.success(`Problem report submitted! Ticket ID: ${ticketId}`);
    } catch (error: any) {
      console.error('Error submitting problem report:', error);
      toast.error('Report recorded in offline storage.');
      setSubmittedTicket(problemReport);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsAppSend = () => {
    const diag = getSystemDiagnostics();
    const ticket = submittedTicket || {
      id: `ISSUE-${Date.now().toString().slice(-5)}`,
      category,
      severity,
      description
    };

    const message = `*🏥 NEO GastroPlus HMS - Problem Report*
*Ticket Ref:* ${ticket.id}
*Category:* ${category}
*Severity:* ${severity}
*Staff:* ${diag.userName} (${diag.userRole})
*Device:* ${diag.deviceType} (${diag.screenResolution})
*Page:* ${diag.currentPath}

*Problem Description:*
${description || ticket.description}

${stepsToReproduce ? `*Steps to Reproduce:*\n${stepsToReproduce}\n` : ''}
${initialError ? `*Error details:*\n${initialError}\n` : ''}
*Time:* ${new Date().toLocaleString()}`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleResetForm = () => {
    setSubmittedTicket(null);
    setDescription('');
    setStepsToReproduce('');
    setScreenshot(null);
    setCategory('Bug / App Error');
    setSeverity('Medium');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[620px] p-0 overflow-hidden rounded-3xl border border-slate-200 shadow-2xl bg-white max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-[#1A5E63] to-slate-900 text-white p-5 shrink-0 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Report a Problem / Issue
                </h3>
                <p className="text-xs text-teal-100/80">
                  Help us resolve technical or operational issues on Android & Web
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {submittedTicket ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-extrabold text-slate-900">
                  Report Successfully Logged!
                </h4>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  Your issue has been recorded with Ticket Reference:
                </p>
                <div className="inline-block px-3 py-1.5 bg-slate-100 rounded-lg font-mono text-sm font-bold text-[#1A5E63] border border-slate-200 mt-2">
                  {submittedTicket.id}
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left text-xs space-y-2 max-w-md mx-auto">
                <div className="flex justify-between text-slate-600">
                  <span className="font-semibold">Category:</span>
                  <span>{submittedTicket.category}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span className="font-semibold">Severity:</span>
                  <span className="font-bold text-amber-600">{submittedTicket.severity}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span className="font-semibold">Logged At:</span>
                  <span>{new Date(submittedTicket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2 max-w-md mx-auto">
                <Button
                  onClick={handleWhatsAppSend}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 rounded-xl gap-2 flex-1"
                >
                  <MessageSquare className="w-4 h-4" /> Send via WhatsApp Support
                </Button>
                <Button
                  variant="outline"
                  onClick={handleResetForm}
                  className="border-slate-300 font-bold text-xs h-10 rounded-xl gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Submit Another
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category & Severity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Problem Category</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bug / App Error">Bug / App Error</SelectItem>
                      <SelectItem value="Android Phone / APK Display">Android Phone / APK Display</SelectItem>
                      <SelectItem value="Data Saving & Sync">Data Saving & Sync</SelectItem>
                      <SelectItem value="Printing & Receipt Issue">Printing & Receipt Issue</SelectItem>
                      <SelectItem value="Prescription / Camera">Prescription / Camera</SelectItem>
                      <SelectItem value="Slow Performance / Freeze">Slow Performance / Freeze</SelectItem>
                      <SelectItem value="Login / Permissions">Login / Permissions</SelectItem>
                      <SelectItem value="Feature Request">Feature Request</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Severity Level</label>
                  <Select value={severity} onValueChange={(v: any) => setSeverity(v)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low - Minor cosmetic issue</SelectItem>
                      <SelectItem value="Medium">Medium - Normal operational glitch</SelectItem>
                      <SelectItem value="High">High - Blocking workflow</SelectItem>
                      <SelectItem value="Critical">Critical - Urgent patient care issue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex justify-between">
                  <span>Describe What Happened *</span>
                  <span className="text-[10px] text-slate-400 font-normal">Be as specific as possible</span>
                </label>
                <Textarea
                  placeholder="e.g. When trying to submit patient registration or print prescription on Android phone, the button did not respond..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="text-xs resize-none"
                  required
                />
              </div>

              {/* Steps to Reproduce */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Steps to Reproduce (Optional)</label>
                <Input
                  placeholder="1. Opened OPD -> 2. Clicked New Prescription -> 3. Selected medicine..."
                  value={stepsToReproduce}
                  onChange={(e) => setStepsToReproduce(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              {/* Contact / Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Your Mobile / WhatsApp Number (For updates)</label>
                <Input
                  placeholder="+91 98765 43210"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              {/* Screenshot / Photo Attachment */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5 text-medical-blue" /> Attach Screenshot or Photo
                  </span>
                  {screenshot && (
                    <button
                      type="button"
                      onClick={() => setScreenshot(null)}
                      className="text-[10px] text-rose-600 hover:underline"
                    >
                      Remove Photo
                    </button>
                  )}
                </label>
                
                {screenshot ? (
                  <div className="relative border border-slate-200 rounded-xl overflow-hidden max-h-36 bg-slate-900 flex items-center justify-center">
                    <img src={screenshot} alt="Screenshot preview" className="max-h-36 object-contain" />
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100 transition-all text-xs text-slate-600">
                    <Upload className="w-4 h-4 text-slate-400" />
                    <span>Click or tap to capture/upload screenshot</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Diagnostics Summary Card */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-600 space-y-1.5">
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span className="flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5 text-teal-600" /> Auto-Captured System Info
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyDiagnostics}
                    className="text-[#1A5E63] hover:underline flex items-center gap-1 font-semibold text-[10px]"
                  >
                    <Copy className="w-3 h-3" /> {copiedDiag ? 'Copied!' : 'Copy Diagnostics'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-slate-500 font-mono text-[10px]">
                  <div>Device: <span className="text-slate-700">{/Android/i.test(navigator.userAgent) ? 'Android Phone' : 'Web Browser'}</span></div>
                  <div>Screen: <span className="text-slate-700">{window.innerWidth}x{window.innerHeight}</span></div>
                  <div>User: <span className="text-slate-700">{user?.name || 'Staff User'}</span></div>
                  <div>Network: <span className="text-slate-700">{navigator.onLine ? 'Online' : 'Offline'}</span></div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#1A5E63] hover:bg-[#13494d] text-white font-bold text-xs h-10 rounded-xl shadow-sm gap-2 flex-1"
                >
                  {isSubmitting ? (
                    'Submitting Report...'
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Submit Problem Report
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={handleWhatsAppSend}
                  variant="outline"
                  className="border-emerald-500 text-emerald-700 hover:bg-emerald-50 font-bold text-xs h-10 rounded-xl gap-2"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-600" /> WhatsApp Support
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between sm:justify-between shrink-0">
          <p className="text-[10px] text-slate-500">
            Emergency IT / Hospital Technical Support Desk
          </p>
          <Button variant="ghost" size="sm" onClick={onClose} className="rounded-lg text-xs font-semibold">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
