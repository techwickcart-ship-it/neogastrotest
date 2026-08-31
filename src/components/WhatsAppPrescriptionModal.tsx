import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Send, 
  Copy, 
  Check, 
  Smartphone, 
  FileText, 
  Pill, 
  LogOut, 
  Calendar, 
  Sparkles, 
  ShieldCheck, 
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import {
  WhatsAppPrescriptionPayload,
  formatPrescriptionForWhatsApp,
  normalizeWhatsAppPhone,
  sendWhatsAppMessage
} from '@/lib/whatsappService';

export const WhatsAppPrescriptionModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [payload, setPayload] = useState<WhatsAppPrescriptionPayload | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [templateType, setTemplateType] = useState<'full' | 'medicines_only' | 'discharge' | 'reminder'>('full');
  const [customMessage, setCustomMessage] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);

  useEffect(() => {
    const handleOpen = (e: any) => {
      if (e.detail) {
        const p = e.detail as WhatsAppPrescriptionPayload;
        setPayload(p);
        const initialPhone = p.patient?.phone || p.patient?.mobile || '';
        setPhoneNumber(initialPhone.replace(/^\+91/, '').replace(/^91/, '').trim());
        setTemplateType(p.templateType || 'full');
        setCustomMessage('');
        setIsEditingText(false);
        setIsOpen(true);
      }
    };

    window.addEventListener('open-whatsapp-prescription', handleOpen);
    return () => {
      window.removeEventListener('open-whatsapp-prescription', handleOpen);
    };
  }, []);

  const generatedText = React.useMemo(() => {
    if (!payload) return '';
    if (customMessage && isEditingText) return customMessage;
    return formatPrescriptionForWhatsApp({
      ...payload,
      templateType
    });
  }, [payload, templateType, customMessage, isEditingText]);

  const handleCopy = () => {
    if (!generatedText) return;
    navigator.clipboard.writeText(generatedText);
    setIsCopied(true);
    toast.success('Prescription text copied to clipboard!');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSend = () => {
    const fullPhone = phoneNumber.trim() ? `${countryCode}${phoneNumber.trim()}` : '';
    if (!phoneNumber.trim()) {
      toast.error('Please enter a valid mobile number for WhatsApp delivery');
      return;
    }

    const success = sendWhatsAppMessage(fullPhone, generatedText);
    if (success) {
      setIsOpen(false);
    }
  };

  if (!payload) return null;

  const patientName = payload.patient?.name || 'Patient';
  const patientMrn = payload.patient?.mrn || 'N/A';
  const doctorName = payload.doctor?.name || 'Consulting Physician';

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-50 border-slate-200">
        {/* Header with WhatsApp Brand Colors */}
        <div className="bg-gradient-to-r from-[#075E54] via-[#128C7E] to-[#25D366] text-white p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center backdrop-blur-xs border border-white/20">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                  Send Prescription via WhatsApp
                  <Badge className="bg-white/20 hover:bg-white/30 text-white text-[10px] font-semibold border-none px-2 py-0.5">
                    Instant Delivery
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-white/80 mt-0.5">
                  Share verified digital Rx & medication instructions directly to patient's mobile
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Quick Patient & Doctor Chips */}
          <div className="mt-3.5 flex flex-wrap gap-2 text-xs">
            <div className="bg-black/20 backdrop-blur-xs px-2.5 py-1 rounded-md border border-white/10 flex items-center gap-1.5">
              <span className="text-white/70">Patient:</span>
              <strong className="text-white">{patientName}</strong>
              <span className="text-white/60 text-[10px]">({patientMrn})</span>
            </div>
            <div className="bg-black/20 backdrop-blur-xs px-2.5 py-1 rounded-md border border-white/10 flex items-center gap-1.5">
              <span className="text-white/70">Doctor:</span>
              <strong className="text-white">{doctorName}</strong>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Recipient Phone Configuration */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-[#128C7E]" />
                WhatsApp Recipient Mobile Number
              </Label>
              <span className="text-[10px] text-slate-400 font-medium">Standard 10-Digit Mobile</span>
            </div>

            <div className="flex gap-2">
              <div className="w-24 shrink-0">
                <Input
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  placeholder="+91"
                  className="text-xs font-bold text-center bg-slate-50"
                />
              </div>
              <div className="flex-1">
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Enter 10-digit WhatsApp number (e.g. 9876543210)"
                  className="text-xs font-semibold focus-visible:ring-[#128C7E]"
                  type="tel"
                />
              </div>
            </div>
          </div>

          {/* Template Format Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Message Format & Content Style</Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => { setTemplateType('full'); setIsEditingText(false); }}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  templateType === 'full'
                    ? 'border-[#128C7E] bg-emerald-50/50 text-[#075E54] shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                  <FileText className="w-3.5 h-3.5 text-[#128C7E]" />
                  Full Digital Rx
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Complete Rx with vitals, diagnosis, medicines & advice
                </p>
              </button>

              <button
                type="button"
                onClick={() => { setTemplateType('medicines_only'); setIsEditingText(false); }}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  templateType === 'medicines_only'
                    ? 'border-[#128C7E] bg-emerald-50/50 text-[#075E54] shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                  <Pill className="w-3.5 h-3.5 text-blue-600" />
                  Medicines Schedule
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Clean dosage timetable and food instructions only
                </p>
              </button>

              <button
                type="button"
                onClick={() => { setTemplateType('discharge'); setIsEditingText(false); }}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  templateType === 'discharge'
                    ? 'border-[#128C7E] bg-emerald-50/50 text-[#075E54] shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                  <LogOut className="w-3.5 h-3.5 text-amber-600" />
                  Discharge Home Meds
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Take-home prescription with follow-up review note
                </p>
              </button>
            </div>
          </div>

          {/* WhatsApp Chat Preview Area */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span>WhatsApp Message Preview</span>
                <span className="text-[10px] font-normal text-slate-400">
                  ({generatedText.length} characters)
                </span>
              </Label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!isEditingText) {
                      setCustomMessage(generatedText);
                      setIsEditingText(true);
                    } else {
                      setIsEditingText(false);
                    }
                  }}
                  className="text-[11px] font-bold text-[#128C7E] hover:underline cursor-pointer"
                >
                  {isEditingText ? 'Reset to Auto-format' : 'Customize Text'}
                </button>
              </div>
            </div>

            {isEditingText ? (
              <Textarea
                value={customMessage || generatedText}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="font-mono text-xs h-48 bg-white border-slate-300 focus-visible:ring-[#128C7E]"
                placeholder="Type or edit WhatsApp message here..."
              />
            ) : (
              <div className="bg-[#EFEAE2] p-3.5 rounded-xl border border-[#DAD3C7] shadow-inner max-h-56 overflow-y-auto">
                <div className="bg-white rounded-lg p-3.5 shadow-xs border border-slate-100 max-w-full text-slate-800 text-xs font-sans whitespace-pre-wrap leading-relaxed relative">
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Preview</span>
                  </div>
                  {generatedText}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-[#128C7E]" />
            <span>End-to-end encrypted hospital communication</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-1.5 text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {isCopied ? 'Copied' : 'Copy Text'}
            </Button>

            <Button
              type="button"
              onClick={handleSend}
              className="bg-[#25D366] hover:bg-[#128C7E] text-white font-bold text-xs gap-1.5 shadow-sm px-5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 fill-current" />
              Send on WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
