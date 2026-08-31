import React, { useState, useEffect } from 'react';
import { 
  X, Printer, Save, FileText, CheckCircle, AlertCircle, 
  User, Phone, MapPin, Calendar, Clock, Stethoscope, ShieldCheck,
  Languages, Eye, PenLine
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { storage, STORAGE_KEYS } from '../lib/storage';
import { supabaseService } from '../services/supabaseService';
import { GeneralConsent } from '../types';
import { toast } from 'sonner';

interface GeneralConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient?: any;
  admission?: any;
  existingConsent?: GeneralConsent | null;
  onSaved?: (consent: GeneralConsent) => void;
}

export const GeneralConsentModal: React.FC<GeneralConsentModalProps> = ({
  isOpen,
  onClose,
  patient,
  admission,
  existingConsent,
  onSaved
}) => {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [isSaving, setIsSaving] = useState(false);
  const [availableAdmissions, setAvailableAdmissions] = useState<any[]>([]);
  const [availablePatients, setAvailablePatients] = useState<any[]>([]);

  const [formData, setFormData] = useState<GeneralConsent>({
    id: '',
    patientId: '',
    admissionId: '',
    patientName: '',
    mrn: '',
    age: '',
    gender: 'Male',
    ipdNo: '',
    bedWard: '',
    admissionDate: new Date().toISOString().split('T')[0],
    diagnosis: '',
    consentType: 'Admission General Consent',
    investigationConsent: true,
    treatmentConsent: true,
    medicationConsent: true,
    emergencyConsent: true,
    anesthesiaConsent: true,
    bloodTransfusionConsent: true,
    photographConsent: false,
    relativeName: '',
    relativeRelation: 'Self / Guardian',
    relativePhone: '',
    relativeAddress: '',
    relativeSign: '',
    patientSign: '',
    doctorName: 'Dr. Navodita Tiwari',
    doctorDesignation: 'Senior Consultant & Critical Care Lead',
    doctorRegNo: 'MP-18492-2015',
    doctorSign: 'Dr. Navodita Tiwari',
    witnessName: 'Duty Sister / Staff Nurse',
    witnessPhone: '9109102145',
    witnessSign: 'Nurse In-charge',
    languageSpoken: 'Hindi',
    specialInstructions: 'Patient & attendant briefed regarding hospital policies, visiting hours, and scope of care.',
    status: 'Signed',
    createdAt: new Date().toISOString()
  });

  // Load available admissions & patients on open
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      try {
        const [adms, pts] = await Promise.all([
          supabaseService.getAdmissions().catch(() => storage.get(STORAGE_KEYS.ADMISSIONS, [])),
          supabaseService.getPatients().catch(() => storage.get(STORAGE_KEYS.PATIENTS, []))
        ]);

        const rawAdms = Array.isArray(adms) ? adms : storage.get(STORAGE_KEYS.ADMISSIONS, []);
        const rawPts = Array.isArray(pts) ? pts : storage.get(STORAGE_KEYS.PATIENTS, []);
        setAvailableAdmissions(rawAdms);
        setAvailablePatients(rawPts);
      } catch (err) {
        console.error('Error fetching admissions for general consent modal:', err);
      }
    };

    loadData();
  }, [isOpen]);

  // Handle patient / existingConsent population
  useEffect(() => {
    if (!isOpen) return;

    if (existingConsent) {
      setFormData({
        ...existingConsent,
        age: existingConsent.age ? String(existingConsent.age) : '',
        updatedAt: new Date().toISOString()
      });
      return;
    }

    if (admission || patient) {
      const p = patient || {};
      const adm = admission || {};
      const patName = p.name || adm.patientName || adm.name || '';
      const patMrn = p.mrn || adm.patientMrn || adm.mrn || '';
      const patAge = p.age || adm.age || adm.patientAge || '';
      const patGender = p.gender || adm.gender || adm.patientGender || 'Male';
      const ipdNum = adm.ipdNumber || adm.ipd_number || (adm.id ? `IPD-${String(adm.id).slice(-6).toUpperCase()}` : '');
      const wardBed = adm.ward ? `${adm.ward} - Bed ${adm.bedNumber || adm.bed_number || ''}` : (adm.bedWard || '');
      const docName = adm.doctorName || adm.doctor || p.attendingDoctor || 'Dr. Navodita Tiwari';
      const diag = adm.diagnosis || p.diagnosis || '';

      setFormData(prev => ({
        ...prev,
        id: `gc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        patientId: p.id || adm.patientId || adm.patient_id || '',
        admissionId: adm.id || '',
        patientName: patName,
        mrn: patMrn,
        age: String(patAge),
        gender: patGender,
        ipdNo: ipdNum,
        bedWard: wardBed,
        admissionDate: adm.admission_date || adm.admissionDate || new Date().toISOString().split('T')[0],
        diagnosis: diag,
        doctorName: docName,
        relativeName: p.guardianName || p.emergencyContactName || prev.relativeName || 'Attendant',
        relativeRelation: p.guardianRelation || prev.relativeRelation || 'Relative',
        relativePhone: p.emergencyContactPhone || p.phone || prev.relativePhone || '',
        relativeAddress: p.address || prev.relativeAddress || '',
        createdAt: new Date().toISOString()
      }));
    }
  }, [isOpen, existingConsent, admission, patient]);

  const handleSelectAdmission = (admId: string) => {
    const adm = availableAdmissions.find(a => String(a.id) === String(admId));
    if (!adm) return;
    const p = availablePatients.find(pt => String(pt.id) === String(adm.patientId || adm.patient_id)) || {
      id: adm.patientId || adm.patient_id,
      name: adm.patientName || adm.name,
      mrn: adm.patientMrn || adm.mrn,
      age: adm.age,
      gender: adm.gender,
      phone: adm.phone,
      address: adm.address,
      diagnosis: adm.diagnosis,
      doctorName: adm.doctorName
    };

    setFormData(prev => ({
      ...prev,
      patientId: p.id || adm.patientId || adm.patient_id || '',
      admissionId: adm.id || '',
      patientName: adm.patientName || p.name || '',
      mrn: adm.patientMrn || p.mrn || '',
      age: String(adm.age || p.age || ''),
      gender: adm.gender || p.gender || 'Male',
      ipdNo: adm.ipdNumber || (adm.id ? `IPD-${String(adm.id).slice(-6).toUpperCase()}` : ''),
      bedWard: adm.ward ? `${adm.ward} - Bed ${adm.bedNumber || ''}` : '',
      admissionDate: adm.admission_date || adm.admissionDate || new Date().toISOString().split('T')[0],
      diagnosis: adm.diagnosis || p.diagnosis || '',
      doctorName: adm.doctorName || p.attendingDoctor || 'Dr. Navodita Tiwari',
      relativeName: p.guardianName || p.emergencyContactName || prev.relativeName,
      relativePhone: p.emergencyContactPhone || p.phone || prev.relativePhone,
      relativeAddress: p.address || prev.relativeAddress
    }));

    toast.success(`Selected patient: ${adm.patientName || p.name}`);
  };

  const handleSave = async () => {
    if (!formData.patientName.trim()) {
      toast.error('Patient name is required');
      return;
    }

    setIsSaving(true);
    try {
      const consentRecord: GeneralConsent = {
        ...formData,
        id: formData.id || `gc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        updatedAt: new Date().toISOString()
      };

      const saved = await supabaseService.saveGeneralConsent(consentRecord);
      toast.success('General Consent successfully saved & linked to database');
      if (onSaved) onSaved(saved);
      onClose();
    } catch (error) {
      console.error('Error saving general consent:', error);
      toast.error('Failed to save general consent');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    const patName = formData.patientName || '___________________________';
    const patMrn = formData.mrn || '______________';
    const patAge = formData.age || '____';
    const patGender = formData.gender || '______';
    const ipdId = formData.ipdNo || (formData.admissionId ? `IPD-${String(formData.admissionId).slice(-6).toUpperCase()}` : 'IPD-RECORD');
    const admDate = formData.admissionDate || new Date().toISOString().split('T')[0];
    const wardName = formData.bedWard || 'General Ward';
    const docName = formData.doctorName || 'Attending Consultant';
    const relName = formData.relativeName || '_______________________';
    const relRel = formData.relativeRelation || '_________________';
    const relPhone = formData.relativePhone || '_________________';
    const relAddr = formData.relativeAddress || '_____________________________________';
    const witName = formData.witnessName || 'Duty Sister / Staff Nurse';
    const witPhone = formData.witnessPhone || '9109102145';

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print consent form');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bilingual General Consent Form (द्विभाषी सामान्य सहमति पत्र) - ${patName}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm 12mm 10mm 12mm; }
            * { box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, 'Noto Sans Devanagari', sans-serif; 
              margin: 0; 
              padding: 0; 
              color: #0f172a; 
              font-size: 8.5pt; 
              line-height: 1.35; 
            }
            .header { 
              text-align: center; 
              border-bottom: 2px solid #0f172a; 
              padding-bottom: 6px; 
              margin-bottom: 8px; 
            }
            .h-name { 
              font-size: 18pt; 
              font-weight: 900; 
              color: #0f172a; 
              margin: 0; 
              text-transform: uppercase; 
              letter-spacing: 0.5px; 
            }
            .h-addr { 
              font-size: 8.5pt; 
              font-weight: 600; 
              color: #475569; 
              margin-top: 2px; 
            }
            .title-badge { 
              display: inline-block; 
              background: #0f172a; 
              color: white; 
              padding: 3px 12px; 
              border-radius: 4px; 
              font-size: 10.5pt; 
              font-weight: 800; 
              margin-top: 4px; 
              letter-spacing: 0.5px; 
            }
            .patient-box { 
              border: 1.5px solid #0f172a; 
              border-radius: 4px; 
              margin-bottom: 8px; 
              padding: 6px 10px; 
              background: #f8fafc; 
            }
            .grid-4 { 
              display: grid; 
              grid-template-columns: repeat(4, 1fr); 
              gap: 4px 8px; 
            }
            .p-item { font-size: 8.5pt; }
            .p-lbl { font-weight: 700; color: #475569; font-size: 7.5pt; text-transform: uppercase; }
            .p-val { font-weight: 800; color: #0f172a; font-size: 9pt; }
            .section-title { 
              font-size: 9.5pt; 
              font-weight: 800; 
              color: #0f172a; 
              border-bottom: 1px solid #cbd5e1; 
              padding-bottom: 2px; 
              margin: 8px 0 4px 0; 
              text-transform: uppercase; 
            }
            .clause { 
              margin-bottom: 6px; 
              padding-left: 14px; 
              position: relative; 
              text-align: justify; 
            }
            .clause::before { 
              content: "•"; 
              position: absolute; 
              left: 0; 
              font-weight: 900; 
              color: #0f172a; 
              font-size: 11pt; 
              line-height: 1; 
            }
            .hi { color: #1e293b; font-size: 8pt; margin-top: 1px; font-weight: 500; }
            .en { color: #0f172a; font-weight: 600; }
            .sign-grid { 
              display: grid; 
              grid-template-columns: repeat(3, 1fr); 
              gap: 10px; 
              margin-top: 14px; 
            }
            .sign-box { 
              border: 1px dashed #64748b; 
              border-radius: 4px; 
              padding: 8px 6px; 
              text-align: center; 
              min-height: 75px; 
              display: flex; 
              flex-direction: column; 
              justify-content: space-between; 
              background: #fff; 
            }
            .sign-label { font-weight: 800; font-size: 8pt; color: #0f172a; }
            .sign-sub { font-size: 7pt; color: #64748b; margin-top: 1px; }
            .sign-line { border-bottom: 1px solid #94a3b8; margin: 24px 8px 4px 8px; }
            .footer-legal { 
              margin-top: 10px; 
              border-top: 1px solid #e2e8f0; 
              padding-top: 4px; 
              font-size: 6.5pt; 
              color: #64748b; 
              text-align: center; 
            }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="h-name">CareWell Superspeciality Hospital & Research Center</div>
            <div class="h-addr">Plot No. 12, Medical Enclave, Zone-II, Bhopal (M.P.) - 462016 | Phone: +91 755 244 8000</div>
            <div class="title-badge">GENERAL INFORMED CONSENT FOR ADMISSION & CLINICAL CARE<br/><span style="font-size:8.5pt; font-weight:600;">(अस्पताल भर्ती एवं सामान्य चिकित्सीय देखभाल हेतु सहमति पत्र)</span></div>
          </div>

          <div class="patient-box">
            <div class="grid-4">
              <div class="p-item"><div class="p-lbl">Patient Name / नाम</div><div class="p-val">${patName}</div></div>
              <div class="p-item"><div class="p-lbl">MRN / UHID</div><div class="p-val">${patMrn}</div></div>
              <div class="p-item"><div class="p-lbl">Age / Gender</div><div class="p-val">${patAge} Yrs / ${patGender}</div></div>
              <div class="p-item"><div class="p-lbl">IPD Number</div><div class="p-val">${ipdId}</div></div>
              <div class="p-item"><div class="p-lbl">Ward / Bed No</div><div class="p-val">${wardName}</div></div>
              <div class="p-item"><div class="p-lbl">Date of Admission</div><div class="p-val">${admDate}</div></div>
              <div class="p-item" style="grid-column: span 2;"><div class="p-lbl">Attending Consultant</div><div class="p-val">${docName}</div></div>
            </div>
          </div>

          <div class="section-title">Terms of Informed Consent (सहमति की शर्तें एवं नियम)</div>

          <div class="clause">
            <div class="en"><strong>1. Authorization for Medical Care & Examinations:</strong> I voluntarily consent to outpatient/inpatient hospital admission, physical examinations, diagnostic tests (blood tests, X-rays, USG, ECG, CT/MRI), nursing interventions, and standard medical therapies prescribed by the attending doctor and clinical team.</div>
            <div class="hi"><strong>चिकित्सीय देखभाल एवं परीक्षण की अनुमति:</strong> मैं स्वेच्छा से अस्पताल में भर्ती, शारीरिक परीक्षण, आवश्यक जांचों (रक्त जांच, एक्स-रे, सोनोग्राफी, ईसीजी आदि), नर्सिंग देखभाल एवं विशेषज्ञ डॉक्टरों द्वारा निर्धारित उपचार हेतु अपनी सहमति प्रदान करता/करती हूँ।</div>
          </div>

          <div class="clause">
            <div class="en"><strong>2. Administration of Medications & Injections:</strong> I consent to the administration of oral medications, intravenous fluids, injections, antibiotics, and supportive pharmacotherapy as deemed clinically necessary.</div>
            <div class="hi"><strong>दवाइयों एवं इंजेक्शन की अनुमति:</strong> मैं बीमारी के निवारण हेतु आवश्यक ओरल दवाइयों, ड्रिप (आईवी फ्लूइड्स), इंजेक्शन एवं एंटीबायोटिक्स दिए जाने हेतु पूर्ण सहमति देता/देती हूँ।</div>
          </div>

          <div class="clause">
            <div class="en"><strong>3. Emergency Interventions & Life Support:</strong> In case of sudden deterioration or life-threatening emergency, I authorize doctors and critical care staff to perform emergency procedures (including CPR, defibrillation, oxygen therapy, intubation, or ventilator support) to preserve life.</div>
            <div class="hi"><strong>आपातकालीन उपचार एवं जीवन रक्षक उपाय:</strong> आपातकालीन स्थिति में मरीज की जान बचाने हेतु आवश्यक आपातकालीन प्रक्रियाएं (जैसे सीपीआर, ऑक्सीजन, इंट्यूबेशन या वेंटिलेटर सहायता) करने हेतु अस्पताल की टीम अधिकृत है।</div>
          </div>

          <div class="clause">
            <div class="en"><strong>4. Explanation of Risks & No Guaranteed Results:</strong> I acknowledge that the practice of medicine is not an exact science. I have been informed that no specific guarantees or assurances have been made regarding the outcome or complete cure of the ailment.</div>
            <div class="hi"><strong>जोखिम की जानकारी एवं परिणाम:</strong> मुझे अवगत कराया गया है कि चिकित्सा विज्ञान में किसी भी उपचार के परिणाम या 100% इलाज की कोई पूर्ण गारंटी नहीं दी जा सकती है।</div>
          </div>

          <div class="clause">
            <div class="en"><strong>5. Hospital Rules, Billing & Valuables:</strong> I agree to abide by all hospital regulations, visiting hours, anti-smoking/sanitation policies, and to settle billing dues according to the hospital tariff. The hospital is not responsible for personal valuables or cash.</div>
            <div class="hi"><strong>अस्पताल के नियम एवं बिलिंग:</strong> मैं अस्पताल के सभी नियमों, मिलने के समय और बिलिंग दरों का पालन करने की सहमति देता हूँ। किसी भी कीमती सामान या नकदी की सुरक्षा की जिम्मेदारी अस्पताल की नहीं होगी।</div>
          </div>

          <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 5px 8px; margin-top: 6px;">
            <div style="font-size: 7.5pt; font-weight: 700; color: #334155;">
              Relative / Attendant Details: ${relName} (${relRel}) | Phone: ${relPhone} | Address: ${relAddr}
            </div>
          </div>

          <div class="sign-grid">
            <div class="sign-box">
              <div class="sign-label">Patient / Attendant Signature</div>
              <div class="sign-sub">मरीज / अभिभावक के हस्ताक्षर या अंगूठे का निशान</div>
              <div class="sign-line"></div>
              <div style="font-size: 7.5pt; font-weight: 700;">${relName}</div>
            </div>
            <div class="sign-box">
              <div class="sign-label">Duty Nurse / Witness Signature</div>
              <div class="sign-sub">स्टाफ नर्स / गवाह के हस्ताक्षर</div>
              <div class="sign-line"></div>
              <div style="font-size: 7.5pt; font-weight: 700;">${witName} (${witPhone})</div>
            </div>
            <div class="sign-box">
              <div class="sign-label">Treating Doctor / Consultant</div>
              <div class="sign-sub">उपचारक चिकित्सक के हस्ताक्षर एवं सील</div>
              <div class="sign-line"></div>
              <div style="font-size: 7.5pt; font-weight: 700;">${docName}</div>
            </div>
          </div>

          <div class="footer-legal">
            CareWell Hospital HMS Statutory Records • General Informed Consent Form • Form Reference: CWH-IPD-GEN-01 • Generated On: ${new Date().toLocaleString()}
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 400);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white tracking-tight">General Informed Consent Form</h3>
                <Badge variant="outline" className="text-[10px] bg-blue-500/20 text-blue-300 border-blue-400/30">
                  सामान्य सहमति पत्र
                </Badge>
              </div>
              <p className="text-xs text-slate-300">
                Statutory Bilingual Inpatient Admission & General Medical Care Consent
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  activeTab === 'edit' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                <PenLine className="w-3 h-3 inline mr-1" />
                Form Entry
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  activeTab === 'preview' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3 h-3 inline mr-1" />
                Preview & Print
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5 bg-slate-50/50">
          
          {/* Patient Quick Selector if not prefilled */}
          {!admission && !patient && availableAdmissions.length > 0 && (
            <Card className="border-blue-200 bg-blue-50/40">
              <CardContent className="p-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-700" />
                  <span className="text-xs font-bold text-blue-900">Select IPD Inpatient:</span>
                </div>
                <select
                  className="flex-1 text-xs border border-blue-300 rounded-md p-1.5 bg-white font-medium text-slate-800"
                  onChange={(e) => handleSelectAdmission(e.target.value)}
                  defaultValue=""
                >
                  <option value="" disabled>-- Choose active inpatient --</option>
                  {availableAdmissions.map((adm: any) => (
                    <option key={adm.id} value={adm.id}>
                      {adm.patientName || adm.name} ({adm.ipdNumber || `IPD-${String(adm.id).slice(-4)}`}) - {adm.ward || 'General'} (Bed: {adm.bedNumber || 'N/A'})
                    </option>
                  ))}
                </select>
              </CardContent>
            </Card>
          )}

          {activeTab === 'edit' ? (
            <div className="space-y-4">
              
              {/* Patient Basic Details Grid */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b pb-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  Patient & Admission Demographics
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-600">Patient Name *</Label>
                    <Input
                      value={formData.patientName}
                      onChange={e => setFormData({ ...formData, patientName: e.target.value })}
                      placeholder="e.g. Ramesh Kumar"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-600">MRN / UHID</Label>
                    <Input
                      value={formData.mrn}
                      onChange={e => setFormData({ ...formData, mrn: e.target.value })}
                      placeholder="MRN-10492"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-600">Age / Gender</Label>
                    <div className="flex gap-1.5">
                      <Input
                        value={formData.age}
                        onChange={e => setFormData({ ...formData, age: e.target.value })}
                        placeholder="Age"
                        className="h-8 text-xs w-16"
                      />
                      <select
                        value={formData.gender}
                        onChange={e => setFormData({ ...formData, gender: e.target.value })}
                        className="h-8 text-xs border rounded-md px-2 bg-white flex-1"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-600">IPD Number</Label>
                    <Input
                      value={formData.ipdNo}
                      onChange={e => setFormData({ ...formData, ipdNo: e.target.value })}
                      placeholder="IPD-2026-084"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-600">Ward & Bed</Label>
                    <Input
                      value={formData.bedWard}
                      onChange={e => setFormData({ ...formData, bedWard: e.target.value })}
                      placeholder="Male Ward - Bed 04"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-600">Admission Date</Label>
                    <Input
                      type="date"
                      value={formData.admissionDate}
                      onChange={e => setFormData({ ...formData, admissionDate: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-[11px] font-semibold text-slate-600">Diagnosis / Clinical Condition</Label>
                    <Input
                      value={formData.diagnosis}
                      onChange={e => setFormData({ ...formData, diagnosis: e.target.value })}
                      placeholder="e.g. Acute Gastroenteritis with severe dehydration"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Consent Clauses Checklist */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b pb-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Statutory Consent Clauses & Authorizations
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label className="flex items-start gap-2.5 p-2 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={formData.investigationConsent}
                      onChange={e => setFormData({ ...formData, investigationConsent: e.target.checked })}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-semibold text-slate-800">Diagnostic & Lab Tests</span>
                      <p className="text-[11px] text-slate-500">Blood sampling, Radiology (X-Ray/USG/CT), ECG, and Pathology</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={formData.treatmentConsent}
                      onChange={e => setFormData({ ...formData, treatmentConsent: e.target.checked })}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-semibold text-slate-800">Nursing & Medical Administration</span>
                      <p className="text-[11px] text-slate-500">Physical examinations, catheterization, vitals monitoring, dressings</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={formData.medicationConsent}
                      onChange={e => setFormData({ ...formData, medicationConsent: e.target.checked })}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-semibold text-slate-800">IV Fluids & Medications</span>
                      <p className="text-[11px] text-slate-500">Administration of IV drips, antibiotics, analgesics, and prescribed drugs</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={formData.emergencyConsent}
                      onChange={e => setFormData({ ...formData, emergencyConsent: e.target.checked })}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-semibold text-slate-800">Life-Saving Emergency Care</span>
                      <p className="text-[11px] text-slate-500">Emergency resuscitation, CPR, O2 therapy, defibrillation, intubation</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={formData.anesthesiaConsent || false}
                      onChange={e => setFormData({ ...formData, anesthesiaConsent: e.target.checked })}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-semibold text-slate-800">Local / Minor Sedation</span>
                      <p className="text-[11px] text-slate-500">Consent for local anesthesia or mild sedation during minor bedside procedures</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={formData.bloodTransfusionConsent || false}
                      onChange={e => setFormData({ ...formData, bloodTransfusionConsent: e.target.checked })}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-semibold text-slate-800">Blood / Plasma Transfusion (if required)</span>
                      <p className="text-[11px] text-slate-500">Consent for blood product transfusion in case of severe anemia or hemorrhage</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Attendant & Medical Signatories */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Relative / Attendant */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b pb-1.5">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    Next of Kin / Attendant Details
                  </h4>
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[11px] font-semibold text-slate-600">Attendant Name *</Label>
                        <Input
                          value={formData.relativeName}
                          onChange={e => setFormData({ ...formData, relativeName: e.target.value })}
                          placeholder="e.g. Suresh Kumar"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] font-semibold text-slate-600">Relation with Patient</Label>
                        <Input
                          value={formData.relativeRelation}
                          onChange={e => setFormData({ ...formData, relativeRelation: e.target.value })}
                          placeholder="e.g. Son / Brother / Self"
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[11px] font-semibold text-slate-600">Contact Phone</Label>
                        <Input
                          value={formData.relativePhone}
                          onChange={e => setFormData({ ...formData, relativePhone: e.target.value })}
                          placeholder="9876543210"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] font-semibold text-slate-600">Language Counseled</Label>
                        <select
                          value={formData.languageSpoken}
                          onChange={e => setFormData({ ...formData, languageSpoken: e.target.value })}
                          className="h-8 text-xs border rounded-md px-2 bg-white w-full"
                        >
                          <option value="Hindi">Hindi (हिंदी)</option>
                          <option value="English">English</option>
                          <option value="Bilingual">Bilingual (हिंदी / English)</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold text-slate-600">Permanent Address</Label>
                      <Input
                        value={formData.relativeAddress}
                        onChange={e => setFormData({ ...formData, relativeAddress: e.target.value })}
                        placeholder="House No., Street, City, State"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Doctor & Witness */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b pb-1.5">
                    <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                    Medical Consultant & Witness Info
                  </h4>
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[11px] font-semibold text-slate-600">Attending Doctor</Label>
                        <Input
                          value={formData.doctorName}
                          onChange={e => setFormData({ ...formData, doctorName: e.target.value })}
                          placeholder="Dr. Navodita Tiwari"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] font-semibold text-slate-600">Doctor Designation</Label>
                        <Input
                          value={formData.doctorDesignation}
                          onChange={e => setFormData({ ...formData, doctorDesignation: e.target.value })}
                          placeholder="Senior Consultant"
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[11px] font-semibold text-slate-600">Staff Nurse / Witness</Label>
                        <Input
                          value={formData.witnessName}
                          onChange={e => setFormData({ ...formData, witnessName: e.target.value })}
                          placeholder="Duty Sister / Staff Nurse"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] font-semibold text-slate-600">Witness Phone</Label>
                        <Input
                          value={formData.witnessPhone}
                          onChange={e => setFormData({ ...formData, witnessPhone: e.target.value })}
                          placeholder="9109102145"
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold text-slate-600">Special Hospital Instructions</Label>
                      <Input
                        value={formData.specialInstructions}
                        onChange={e => setFormData({ ...formData, specialInstructions: e.target.value })}
                        placeholder="e.g. Attendant counseled in detail"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>

              </div>

            </div>
          ) : (
            /* Printable Preview Box */
            <div className="bg-white p-6 rounded-xl border border-slate-300 shadow-sm space-y-4 text-slate-900 font-sans">
              <div className="text-center border-b-2 border-slate-900 pb-3">
                <h2 className="text-xl font-black uppercase text-slate-900 tracking-wide">CareWell Superspeciality Hospital & Research Center</h2>
                <p className="text-xs text-slate-600 font-medium">Plot No. 12, Medical Enclave, Zone-II, Bhopal (M.P.) • Phone: +91 755 244 8000</p>
                <div className="inline-block bg-slate-900 text-white font-bold text-xs px-3 py-1 rounded mt-2">
                  GENERAL INFORMED CONSENT FOR ADMISSION & CLINICAL CARE (सामान्य सहमति पत्र)
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                <div><span className="font-bold text-slate-500">Patient:</span> <span className="font-bold text-slate-900">{formData.patientName || 'N/A'}</span></div>
                <div><span className="font-bold text-slate-500">MRN:</span> <span className="font-bold text-slate-900">{formData.mrn || 'N/A'}</span></div>
                <div><span className="font-bold text-slate-500">Age/Sex:</span> <span className="font-bold text-slate-900">{formData.age} Yrs / {formData.gender}</span></div>
                <div><span className="font-bold text-slate-500">IPD No:</span> <span className="font-bold text-slate-900">{formData.ipdNo || 'N/A'}</span></div>
                <div><span className="font-bold text-slate-500">Ward & Bed:</span> <span className="font-bold text-slate-900">{formData.bedWard || 'N/A'}</span></div>
                <div><span className="font-bold text-slate-500">Admission Date:</span> <span className="font-bold text-slate-900">{formData.admissionDate}</span></div>
                <div className="sm:col-span-2"><span className="font-bold text-slate-500">Doctor:</span> <span className="font-bold text-slate-900">{formData.doctorName}</span></div>
              </div>

              <div className="space-y-2.5 text-xs text-slate-800">
                <p><strong>1. Authorization for Medical Care & Tests:</strong> I consent to hospital admission, laboratory & radiological examinations, and routine clinical care.</p>
                <p><strong>2. Administration of Medications:</strong> I consent to the administration of prescribed oral/IV drugs and fluids.</p>
                <p><strong>3. Emergency Interventions:</strong> I authorize emergency life support, CPR, and critical care procedures when clinically required.</p>
                <p><strong>4. Relative/Attendant:</strong> {formData.relativeName} ({formData.relativeRelation}) - Phone: {formData.relativePhone || 'N/A'}</p>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-6 text-center text-xs">
                <div className="border-t border-slate-400 pt-2 font-bold">{formData.relativeName || 'Attendant'} (Signature)</div>
                <div className="border-t border-slate-400 pt-2 font-bold">{formData.witnessName || 'Nurse'} (Witness)</div>
                <div className="border-t border-slate-400 pt-2 font-bold">{formData.doctorName || 'Doctor'} (Consultant)</div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 text-xs text-slate-700 bg-white hover:bg-slate-50 border-slate-300"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            Print Official A4 Consent
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-xs text-slate-600 hover:text-slate-900"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSaving}
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold gap-1.5 shadow-2xs"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? 'Saving to Database...' : 'Save General Consent'}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default GeneralConsentModal;
