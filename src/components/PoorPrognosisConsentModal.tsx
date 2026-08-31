import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Printer, 
  Save, 
  User, 
  ShieldAlert, 
  Stethoscope, 
  FileText, 
  Languages, 
  CheckCircle2, 
  Clock, 
  Building2, 
  HeartPulse, 
  Activity, 
  Check, 
  X,
  Eye,
  Search,
  Bed,
  Users,
  Maximize2,
  Minimize2,
  ChevronRight,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { PoorPrognosisConsent } from '@/types';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { supabaseService } from '@/services/supabaseService';
import { cn } from '@/lib/utils';

export interface PoorPrognosisFormData {
  id?: string;
  patientId: string;
  admissionId?: string;
  patientName: string;
  mrn: string;
  age: string | number;
  gender: string;
  ipdNo: string;
  bedWard: string;
  admissionDate: string;
  
  // Clinical Details
  diagnosis: string;
  comorbidities: string;
  clinicalCondition: string;
  riskCategory: 'High Risk' | 'Extremely Critical' | 'Guarded' | 'Moribund';
  criticalSupport: {
    mechanicalVentilation: boolean;
    inotropicSupport: boolean;
    dialysis: boolean;
    invasiveLines: boolean;
    bloodTransfusion: boolean;
    highFlowO2: boolean;
    cprInformed: boolean;
    otherSupport: string;
  };
  
  // Next of Kin
  counselingDate: string;
  counselingTime: string;
  relativeName: string;
  relativeRelation: string;
  relativePhone: string;
  relativeAddress: string;
  relativeSign: string;
  
  // Doctor & Witness
  doctorName: string;
  doctorDesignation: string;
  doctorRegNo: string;
  doctorSign: string;
  witnessName: string;
  witnessPhone: string;
  witnessSign: string;
  
  languageSpoken: 'Hindi' | 'English' | 'Bilingual' | 'Bhojpuri' | 'Other';
  additionalClinicalNotes: string;
  status: 'Active' | 'Signed' | 'Revoked';
}

export const printPoorPrognosisConsent = (data: PoorPrognosisFormData) => {
  const rawHospitalInfo = storage.get(STORAGE_KEYS.HOSPITAL_INFO, null);
  const hospitalName = rawHospitalInfo?.name || 'NEO GASTROPLUS HOSPITAL';
  const hospitalAddress = rawHospitalInfo?.address || 'Plot No. 7 & 8, Om Shiv Nagar, Gufa Mandir Road, Lal Ghati, Bhopal (M.P.) - 462030';
  const hospitalPhone = rawHospitalInfo?.phone || '9109102145 / 9109101246';
  const hospitalEmail = rawHospitalInfo?.email || 'gastroplusbhopal@gmail.com';

  const patName = data.patientName || 'Patient';
  const patMrn = data.mrn || 'N/A';
  const patAge = data.age || 'N/A';
  const patGender = data.gender || 'N/A';
  const ipdNo = data.ipdNo || 'N/A';
  const bedWard = data.bedWard || 'ICU / Ward';
  const admDate = data.admissionDate || new Date().toISOString().split('T')[0];
  const counselDate = data.counselingDate || new Date().toISOString().split('T')[0];
  const counselTime = data.counselingTime || '10:00 AM';

  const activeSupports = [];
  if (data.criticalSupport?.mechanicalVentilation) activeSupports.push('Invasive Mechanical Ventilation / वेंटिलेटर सपोर्ट');
  if (data.criticalSupport?.inotropicSupport) activeSupports.push('Inotropic / Vasopressor Infusions (BP Support) / रक्तचाप बढ़ाने की जीवन रक्षक दवाएं');
  if (data.criticalSupport?.dialysis) activeSupports.push('Hemodialysis / CRRT (Kidney Support) / डायलिसिस सपोर्ट');
  if (data.criticalSupport?.invasiveLines) activeSupports.push('Central Venous / Arterial Line / CVC लाइन');
  if (data.criticalSupport?.bloodTransfusion) activeSupports.push('Blood & Blood Products Transfusion / रक्त एवं प्लाज्मा संचार');
  if (data.criticalSupport?.highFlowO2) activeSupports.push('High-Flow Oxygen / BiPAP / ऑक्सीजन सपोर्ट');
  if (data.criticalSupport?.cprInformed) activeSupports.push('CPR & Emergency Resuscitation Risks Explained / सीपीआर जोखिम काउंसलिंग');
  if (data.criticalSupport?.otherSupport) activeSupports.push(data.criticalSupport.otherSupport);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Poor Prognosis & High Risk Consent - ${patName}</title>
        <meta charset="utf-8" />
        <style>
          @page {
            size: A4 portrait;
            margin: 8mm 10mm 8mm 10mm;
          }
          * { box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, 'Noto Sans Devanagari', sans-serif;
            margin: 0;
            padding: 0;
            color: #0f172a;
            font-size: 8pt;
            line-height: 1.3;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #be123c;
            padding-bottom: 5px;
            margin-bottom: 6px;
          }
          .h-name {
            font-size: 16pt;
            font-weight: 900;
            color: #881337;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .h-sub {
            font-size: 8pt;
            font-weight: 700;
            color: #005662;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 1px;
          }
          .h-addr {
            font-size: 7.5pt;
            font-weight: 600;
            color: #475569;
            margin-top: 2px;
          }
          .title-banner {
            background-color: #881337;
            color: #ffffff;
            padding: 4px 12px;
            font-size: 9.5pt;
            font-weight: 800;
            border-radius: 4px;
            margin-top: 4px;
            display: inline-block;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .subtitle {
            font-size: 7.5pt;
            color: #9f1239;
            font-weight: 700;
            margin-top: 2px;
            text-transform: uppercase;
          }
          
          /* Demographic Table */
          .demo-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 6px;
            font-size: 7.8pt;
            border: 1.5px solid #cbd5e1;
            background: #fff;
          }
          .demo-table td {
            padding: 3px 6px;
            border: 1px solid #e2e8f0;
          }
          .lbl {
            font-weight: 700;
            color: #475569;
            text-transform: uppercase;
            font-size: 7pt;
            width: 18%;
            background: #f8fafc;
          }
          .val {
            font-weight: 800;
            color: #0f172a;
            width: 32%;
          }

          /* Critical Alert Box */
          .critical-box {
            border: 1.5px solid #f43f5e;
            background: #fff1f2;
            padding: 6px 8px;
            border-radius: 4px;
            margin-bottom: 6px;
          }
          .critical-title {
            font-size: 8.5pt;
            font-weight: 900;
            color: #9f1239;
            text-transform: uppercase;
            margin-bottom: 3px;
            display: flex;
            justify-content: space-between;
          }
          .critical-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4px 8px;
            font-size: 7.5pt;
          }
          .support-pill {
            display: inline-block;
            background: #ffe4e6;
            border: 1px solid #fecdd3;
            color: #9f1239;
            font-size: 6.8pt;
            font-weight: 700;
            padding: 1px 5px;
            border-radius: 3px;
            margin-right: 4px;
            margin-bottom: 2px;
          }

          /* Clauses */
          .clause-card {
            border: 1px solid #e2e8f0;
            border-left: 3.5px solid #e11d48;
            padding: 4px 7px;
            margin-bottom: 4px;
            background: #ffffff;
            border-radius: 3px;
          }
          .clause-header {
            font-weight: 800;
            color: #881337;
            font-size: 7.8pt;
            margin-bottom: 2px;
            text-transform: uppercase;
          }
          .clause-en {
            color: #1e293b;
            font-size: 7.2pt;
            margin-bottom: 2px;
            text-align: justify;
          }
          .clause-hi {
            color: #334155;
            font-size: 7.2pt;
            text-align: justify;
          }

          /* Declaration */
          .ack-box {
            border: 1.5px solid #94a3b8;
            background: #f8fafc;
            padding: 5px 8px;
            border-radius: 4px;
            margin-top: 5px;
            margin-bottom: 6px;
            font-size: 7.2pt;
          }
          .ack-title {
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            font-size: 7.6pt;
            margin-bottom: 2px;
          }

          /* Signatures */
          .sig-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 4px;
            font-size: 7.2pt;
          }
          .sig-table td {
            width: 33.33%;
            vertical-align: top;
            border: 1px solid #cbd5e1;
            padding: 5px 6px;
            background: #ffffff;
          }
          .sig-title {
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            font-size: 7.2pt;
            border-bottom: 1px dashed #cbd5e1;
            padding-bottom: 2px;
            margin-bottom: 3px;
          }
          .sig-space {
            height: 28px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="h-name">${hospitalName}</div>
          <div class="h-sub">SUPER SPECIALITY GASTRO & OT SURGICAL CENTER</div>
          <div class="h-addr">${hospitalAddress}</div>
          <div class="h-addr">Emergency / IPD: ${hospitalPhone} • Email: ${hospitalEmail}</div>
          <div>
            <span class="title-banner">INFORMED CONSENT FOR HIGH RISK & POOR PROGNOSIS</span>
          </div>
          <div class="subtitle">गंभीर एवं असाध्य स्थिति सहमति पत्र (द्विभाषी / Medico-Legal Statutory Document)</div>
        </div>

        <table class="demo-table">
          <tr>
            <td class="lbl">Patient Name / मरीज:</td>
            <td class="val" style="font-size: 8.5pt; color: #881337;">${patName}</td>
            <td class="lbl">IPD Reg. No.:</td>
            <td class="val">${ipdNo}</td>
          </tr>
          <tr>
            <td class="lbl">Age / Gender (आयु/लिंग):</td>
            <td class="val">${patAge} Yrs / ${patGender}</td>
            <td class="lbl">UHID / MRN:</td>
            <td class="val">${patMrn}</td>
          </tr>
          <tr>
            <td class="lbl">Ward / Bed No.:</td>
            <td class="val">${bedWard}</td>
            <td class="lbl">Admission Date:</td>
            <td class="val">${admDate}</td>
          </tr>
          <tr>
            <td class="lbl">Treating Consultant:</td>
            <td class="val" style="color: #0369a1;">${data.doctorName || 'Dr. Navodita Tiwari & Critical Care Team'}</td>
            <td class="lbl">Counseling Date & Time:</td>
            <td class="val">${counselDate} at ${counselTime}</td>
          </tr>
        </table>

        <!-- Critical Medical Condition Assessment -->
        <div class="critical-box">
          <div class="critical-title">
            <span>Clinical Diagnosis & Severity / प्राथमिक निदान एवं स्थिति:</span>
            <span style="background:#be123c; color:#fff; padding:1px 6px; border-radius:3px; font-size:7pt;">${data.riskCategory || 'Extremely Critical / Poor Prognosis'}</span>
          </div>
          <div class="critical-grid">
            <div>
              <strong>Primary Diagnosis:</strong> ${data.diagnosis || 'Acute Critical Illness / Multiple Organ Involvement'}
            </div>
            <div>
              <strong>Co-morbidities:</strong> ${data.comorbidities || 'None documented'}
            </div>
            <div style="grid-column: 1 / -1; margin-top: 2px;">
              <strong>Clinical Assessment:</strong> ${data.clinicalCondition || 'Patient is hemodynamically unstable / critically ill requiring intensive monitoring and advanced life support therapies.'}
            </div>
          </div>
          ${activeSupports.length > 0 ? `
            <div style="margin-top: 4px; border-top: 1px dashed #fecdd3; padding-top: 3px;">
              <strong style="font-size: 7pt; color: #881337; text-transform: uppercase;">Active / Planned Critical Interventions:</strong><br/>
              ${activeSupports.map(s => `<span class="support-pill">⚠ ${s}</span>`).join('')}
            </div>
          ` : ''}
        </div>

        <!-- Statutory Clauses -->
        <div class="clause-card">
          <div class="clause-header">1. Explanation of Critical Illness & High Mortality Risk / गंभीर स्थिति एवं जीवन जोखिम की जानकारी:</div>
          <div class="clause-en"><strong>[English]:</strong> The treating medical consultants have explained in detail to me/us that the patient is in an extremely critical and unstable medical condition with a guarded/poor prognosis. I understand that despite maximal standard medical care, ICU monitoring, and advanced therapeutics, there is a high risk of sudden deterioration, multi-organ failure, irreversible complications, or mortality.</div>
          <div class="clause-hi"><strong>[हिंदी]:</strong> उपस्थित वरिष्ठ चिकित्सकों द्वारा मुझे/हमें मरीज की अत्यंत गंभीर एवं नाजुक स्वास्थ्य स्थिति के बारे में विस्तार से समझा दिया गया है। मैं समझता/समझती हूँ कि सर्वोत्तम चिकित्सीय उपचार व गहन चिकित्सा (ICU Care) के बावजूद मरीज की स्थिति अत्यधिक चिंताजनक (Poor Prognosis) है तथा अचानक स्थिति बिगड़ने अथवा जीवन हानि (मृत्यु) का गंभीर जोखिम बना हुआ है।</div>
        </div>

        <div class="clause-card">
          <div class="clause-header">2. Consent for Advanced Life Support & Emergency Resuscitation / आपातकालीन एवं गहन चिकित्सा प्रक्रियाओं हेतु सहमति:</div>
          <div class="clause-en"><strong>[English]:</strong> I hereby authorize the medical team to execute all necessary emergency and intensive care interventions including invasive mechanical ventilation, inotropic/vasopressor infusions for circulatory support, dialysis/CRRT, central venous line/arterial line placements, blood transfusion, and Cardiopulmonary Resuscitation (CPR) in the event of cardiopulmonary arrest.</div>
          <div class="clause-hi"><strong>[हिंदी]:</strong> मैं मरीज के जीवन रक्षण हेतु आवश्यक आपातकालीन गहन चिकित्सा, इनोट्रोप दवाएं, रक्त संचार, वेंटिलेटर सपोर्ट, सीपीआर तथा अन्य जीवन रक्षक प्रक्रियाओं को करने की अपनी पूर्ण सहमति प्रदान करता/करती हूँ।</div>
        </div>

        <div class="clause-card">
          <div class="clause-header">3. Unpredictable Course & No Outcome Guarantee / अप्रत्याशित जटिलताएं एवं परिणाम की कोई चिकित्सीय गारंटी नहीं:</div>
          <div class="clause-en"><strong>[English]:</strong> I acknowledge that in medical science, no treating doctor or hospital can give an absolute guarantee of cure or survival. The hospital team has made no false promises or guarantees regarding the ultimate outcome of the treatment.</div>
          <div class="clause-hi"><strong>[हिंदी]:</strong> मुझे पूर्ण रूप से अवगत करा दिया गया है कि चिकित्सा विज्ञान में किसी भी डॉक्टर अथवा अस्पताल द्वारा शत-प्रतिशत सुधार या जीवन रक्षा की कोई गारंटी नहीं दी जा सकती। अस्पताल द्वारा हमें कोई झूठा आश्वासन नहीं दिया गया है।</div>
        </div>

        <div class="clause-card">
          <div class="clause-header">4. Inpatient & Critical Care Tariffs Acknowledgment / आईसीयू एवं उपचार खर्च से संबंधित स्वीकृति:</div>
          <div class="clause-en"><strong>[English]:</strong> I have been apprised of the estimated costs and daily tariffs of intensive care, ventilator/equipment support, high-end therapeutics, and diagnostic procedures, and I/we agree to fulfill the financial obligations accrued during this inpatient stay.</div>
          <div class="clause-hi"><strong>[हिंदी]:</strong> गंभीर स्थिति में लगने वाले आईसीयू, वेंटिलेटर, जीवन रक्षक दवाओं एवं जांचों के अनुमानित खर्च के विषय में मुझे समझा दिया गया है और मैं इसे वहन करने हेतु पूर्णतः सहमत हूँ।</div>
        </div>

        <div class="clause-card">
          <div class="clause-header">5. Language & Voluntary Counseling Declaration / भाषा एवं स्वेच्छा से घोषणा:</div>
          <div class="clause-en"><strong>[English]:</strong> I confirm that the patient's condition, diagnosis, complications, and poor prognosis were thoroughly explained to me in <u>${data.languageSpoken || 'Hindi / English'}</u>, a language I understand fluently. All my queries were answered satisfactorily.</div>
          <div class="clause-hi"><strong>[हिंदी]:</strong> मैं पुष्टि करता/करती हूँ कि मरीज की बीमारी, संभावित खतरों व गंभीर स्थिति को मुझे मेरी समझ योग्य भाषा (<u>${data.languageSpoken || 'हिंदी / अंग्रेज़ी'}</u>) में भली-भांति समझा दिया गया है। मैंने सभी प्रश्न पूछ लिए हैं तथा बिना किसी दबाव के स्वेच्छा से सहमति देता/देती हूँ।</div>
        </div>

        <!-- Statutory Signatures Table -->
        <table class="sig-table">
          <tr>
            <td>
              <div class="sig-title">Patient / Relative / Guardian / अभिभावक</div>
              <div><strong>Name:</strong> ${data.relativeName || 'Attendant / Relative'}</div>
              <div><strong>Relation:</strong> ${data.relativeRelation || 'Relative'}</div>
              <div><strong>Phone:</strong> ${data.relativePhone || 'N/A'}</div>
              <div class="sig-space"></div>
              <div style="border-top: 1px solid #475569; padding-top: 2px; font-weight: 700;">
                Signature / Thumb Impression<br/>
                <span style="font-size: 6.8pt; font-weight: normal;">Date: ${counselDate} ${counselTime}</span>
              </div>
            </td>
            <td>
              <div class="sig-title">Witness / Nursing Officer / गवाह</div>
              <div><strong>Name:</strong> ${data.witnessName || 'Duty Staff Nurse'}</div>
              <div><strong>Phone:</strong> ${data.witnessPhone || 'Hospital Ext.'}</div>
              <div class="sig-space"></div>
              <div style="border-top: 1px solid #475569; padding-top: 2px; font-weight: 700;">
                Witness Signature<br/>
                <span style="font-size: 6.8pt; font-weight: normal;">Date: ${counselDate}</span>
              </div>
            </td>
            <td>
              <div class="sig-title">Treating / Counseling Doctor / चिकित्सक</div>
              <div><strong>Doctor:</strong> ${data.doctorName || 'Dr. Navodita Tiwari'}</div>
              <div><strong>Desig:</strong> ${data.doctorDesignation || 'Consultant Critical Care & GI Surgeon'}</div>
              <div><strong>Reg No:</strong> ${data.doctorRegNo || 'MP-18492-2015'}</div>
              <div class="sig-space"></div>
              <div style="border-top: 1px solid #475569; padding-top: 2px; font-weight: 700;">
                Doctor Signature & Hospital Seal<br/>
                <span style="font-size: 6.8pt; font-weight: normal;">Date: ${counselDate} ${counselTime}</span>
              </div>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  } else {
    // Fallback: iframe print
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      iframe.contentWindow?.focus();
      setTimeout(() => {
        iframe.contentWindow?.print();
        document.body.removeChild(iframe);
      }, 500);
    }
  }
};

interface PoorPrognosisConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient?: any;
  admissionRecord?: any;
  existingConsent?: PoorPrognosisConsent | null;
  onSaved?: (consent: PoorPrognosisConsent) => void;
}

export const PoorPrognosisConsentModal: React.FC<PoorPrognosisConsentModalProps> = ({
  isOpen,
  onClose,
  patient,
  admissionRecord,
  existingConsent,
  onSaved
}) => {
  const [activeTab, setActiveTab] = useState<'clinical' | 'guardian' | 'clauses' | 'preview'>('clinical');
  const [isSaving, setIsSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [availableAdmissions, setAvailableAdmissions] = useState<any[]>([]);
  const [availablePatients, setAvailablePatients] = useState<any[]>([]);
  const [patientSearch, setPatientSearch] = useState('');

  const [formData, setFormData] = useState<PoorPrognosisFormData>({
    patientId: '',
    patientName: '',
    mrn: '',
    age: '',
    gender: 'Male',
    ipdNo: '',
    bedWard: 'ICU',
    admissionDate: new Date().toISOString().split('T')[0],
    diagnosis: 'Severe Sepsis with Multi-Organ Dysfunction / Acute Abdomen with Shock',
    comorbidities: 'Hypertension, Type 2 Diabetes Mellitus',
    clinicalCondition: 'Patient is hemodynamically unstable on inotropic support with respiratory compromise requiring intensive medical management and guarded prognosis.',
    riskCategory: 'Extremely Critical',
    criticalSupport: {
      mechanicalVentilation: true,
      inotropicSupport: true,
      dialysis: false,
      invasiveLines: true,
      bloodTransfusion: false,
      highFlowO2: true,
      cprInformed: true,
      otherSupport: ''
    },
    counselingDate: new Date().toISOString().split('T')[0],
    counselingTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    relativeName: '',
    relativeRelation: 'Son',
    relativePhone: '',
    relativeAddress: '',
    relativeSign: '',
    doctorName: 'Dr. Navodita Tiwari',
    doctorDesignation: 'Senior Consultant & Critical Care Lead',
    doctorRegNo: 'MP-18492-2015',
    doctorSign: 'Dr. Navodita Tiwari',
    witnessName: 'Staff Nurse / Duty Sister',
    witnessPhone: '9109102145',
    witnessSign: 'Nurse In-charge',
    languageSpoken: 'Hindi',
    additionalClinicalNotes: 'Family counseled in detail regarding guarded prognosis, high risk of sudden cardiac arrest, and multi-organ failure.',
    status: 'Signed'
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
        console.error('Error fetching admissions for consent modal:', err);
      }
    };

    loadData();
  }, [isOpen]);

  // Handle patient / existingConsent population
  useEffect(() => {
    if (isOpen) {
      if (existingConsent) {
        setFormData({
          ...existingConsent,
          age: existingConsent.age || patient?.age || '',
          gender: existingConsent.gender || patient?.gender || 'Male',
          mrn: existingConsent.mrn || patient?.mrn || 'N/A',
          patientName: existingConsent.patientName || patient?.name || 'Patient',
          criticalSupport: {
            mechanicalVentilation: existingConsent.criticalSupport?.mechanicalVentilation ?? true,
            inotropicSupport: existingConsent.criticalSupport?.inotropicSupport ?? true,
            dialysis: existingConsent.criticalSupport?.dialysis ?? false,
            invasiveLines: existingConsent.criticalSupport?.invasiveLines ?? true,
            bloodTransfusion: existingConsent.criticalSupport?.bloodTransfusion ?? false,
            highFlowO2: existingConsent.criticalSupport?.highFlowO2 ?? true,
            cprInformed: existingConsent.criticalSupport?.cprInformed ?? true,
            otherSupport: existingConsent.criticalSupport?.otherSupport || ''
          },
          relativeAddress: existingConsent.relativeAddress || patient?.address || '',
          relativePhone: existingConsent.relativePhone || patient?.phone || ''
        });
      } else if (patient) {
        applyPatientData(patient, admissionRecord);
      }
    }
  }, [isOpen, patient, admissionRecord, existingConsent]);

  const applyPatientData = (p: any, adm?: any) => {
    const ipdNumber = adm?.id 
      ? `IPD-${String(adm.id).slice(-6).toUpperCase()}` 
      : (adm?.admissionNumber || adm?.ipdNo || `IPD-${Date.now().toString().slice(-6)}`);

    const admDate = adm?.admission_date || adm?.admissionDate || adm?.date || new Date().toISOString().split('T')[0];
    const wardBed = adm?.ward 
      ? `${adm.ward} ${adm.bed_number || adm.bedNumber ? '- Bed ' + (adm.bed_number || adm.bedNumber) : ''}` 
      : (p?.bed ? `Bed ${p.bed}` : 'ICU / Critical Care Unit');

    const patDiag = adm?.diagnosis || p?.diagnosis || 'Severe Sepsis with Multi-Organ Dysfunction / Acute Abdomen with Shock';

    setFormData(prev => ({
      ...prev,
      patientId: p.id || p.patient_id || '',
      admissionId: adm?.id || '',
      patientName: p.name || p.patientName || '',
      mrn: p.mrn || p.patientMrn || 'MRN-' + Math.floor(100000 + Math.random() * 900000),
      age: p.age || p.patientAge || '45',
      gender: p.gender || p.patientGender || 'Male',
      ipdNo: ipdNumber,
      bedWard: wardBed,
      admissionDate: admDate,
      diagnosis: patDiag,
      comorbidities: p.medicalHistory || p.medical_history || prev.comorbidities,
      clinicalCondition: prev.clinicalCondition,
      relativeName: p.guardianName || p.emergencyContactName || p.relative1Name || prev.relativeName || 'Next of Kin',
      relativeRelation: p.guardianRelation || prev.relativeRelation || 'Son / Relative',
      relativePhone: p.emergencyContactPhone || p.phone || p.mobile || prev.relativePhone || '9876543210',
      relativeAddress: p.address || prev.relativeAddress || 'Bhopal, Madhya Pradesh',
      counselingDate: new Date().toISOString().split('T')[0],
      counselingTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      doctorName: adm?.doctorName || p?.attendingDoctor || 'Dr. Navodita Tiwari',
      doctorDesignation: 'Senior Consultant & Critical Care Lead',
      doctorRegNo: 'MP-18492-2015'
    }));
  };

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
    applyPatientData(p, adm);
    toast.success(`Selected patient: ${adm.patientName || p.name}`);
  };

  const handleSupportToggle = (key: keyof typeof formData.criticalSupport) => {
    setFormData(prev => ({
      ...prev,
      criticalSupport: {
        ...prev.criticalSupport,
        [key]: !prev.criticalSupport[key]
      }
    }));
  };

  const handleSave = async () => {
    if (!formData.patientName.trim()) {
      toast.error('Patient name is required');
      return;
    }
    if (!formData.relativeName.trim()) {
      toast.error('Attendant / Next of Kin name is required for statutory consent');
      return;
    }
    if (!formData.diagnosis.trim()) {
      toast.error('Clinical diagnosis is required');
      return;
    }

    setIsSaving(true);
    try {
      const consentRecord: PoorPrognosisConsent = {
        id: formData.id || `ppc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        patientId: formData.patientId || `pat-${Date.now()}`,
        admissionId: formData.admissionId || '',
        patientName: formData.patientName,
        mrn: formData.mrn || 'N/A',
        age: formData.age || '45',
        gender: formData.gender || 'Male',
        ipdNo: formData.ipdNo || 'IPD-NEW',
        bedWard: formData.bedWard || 'ICU',
        admissionDate: formData.admissionDate,
        diagnosis: formData.diagnosis,
        comorbidities: formData.comorbidities,
        clinicalCondition: formData.clinicalCondition,
        riskCategory: formData.riskCategory,
        criticalSupport: formData.criticalSupport,
        counselingDate: formData.counselingDate,
        counselingTime: formData.counselingTime,
        relativeName: formData.relativeName,
        relativeRelation: formData.relativeRelation,
        relativePhone: formData.relativePhone,
        relativeAddress: formData.relativeAddress,
        relativeSign: formData.relativeSign || formData.relativeName,
        doctorName: formData.doctorName,
        doctorDesignation: formData.doctorDesignation,
        doctorRegNo: formData.doctorRegNo,
        doctorSign: formData.doctorSign || formData.doctorName,
        witnessName: formData.witnessName,
        witnessPhone: formData.witnessPhone,
        witnessSign: formData.witnessSign || formData.witnessName,
        languageSpoken: formData.languageSpoken,
        additionalClinicalNotes: formData.additionalClinicalNotes,
        status: formData.status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const saved = await supabaseService.savePoorPrognosisConsent(consentRecord);
      toast.success('Poor Prognosis Consent successfully saved & linked to IPD file');
      if (onSaved) onSaved(saved);
      onClose();
    } catch (error) {
      console.error('Error saving consent:', error);
      toast.error('Failed to save poor prognosis consent');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    printPoorPrognosisConsent(formData);
    toast.success('Printing Official Bilingual Poor Prognosis Consent');
  };

  const filteredAdmissions = availableAdmissions.filter(a => {
    if (!patientSearch) return true;
    const s = patientSearch.toLowerCase();
    return (
      (a.patientName && a.patientName.toLowerCase().includes(s)) ||
      (a.patientMrn && a.patientMrn.toLowerCase().includes(s)) ||
      (a.ward && a.ward.toLowerCase().includes(s)) ||
      (a.bedNumber && String(a.bedNumber).includes(s))
    );
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className={cn(
          "overflow-hidden flex flex-col p-0 border-slate-200 shadow-2xl transition-all duration-300 gap-0 bg-slate-50",
          isExpanded 
            ? "!w-[98vw] !max-w-none !h-[97vh] !max-h-[97vh] rounded-xl" 
            : "!w-[96vw] sm:!max-w-5xl md:!max-w-6xl lg:!max-w-7xl max-h-[94vh] rounded-2xl"
        )}
      >
        {/* Header with Critical Risk Badge & Controls */}
        <DialogHeader className="p-4 sm:px-6 bg-gradient-to-r from-rose-950 via-rose-900 to-slate-900 text-white flex-shrink-0 border-b border-rose-800/40 pr-16 sm:pr-20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-rose-300 shrink-0">
                <ShieldAlert className="w-6 h-6 animate-pulse text-rose-400" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="text-base sm:text-lg font-black tracking-wide text-white">
                    Poor Prognosis & High Risk Consent
                  </DialogTitle>
                  <Badge variant="outline" className="bg-rose-500/20 text-rose-200 border-rose-400/50 text-[10px] font-bold">
                    गंभीर स्थिति सहमति पत्र
                  </Badge>
                </div>
                <DialogDescription className="text-rose-200 text-xs mt-0.5">
                  Statutory Medico-Legal Informed Counseling Document for Critical Inpatients
                </DialogDescription>
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Quick Demographics Capsule */}
              <div className="flex items-center gap-2 bg-black/40 border border-rose-500/30 rounded-lg px-2.5 py-1 text-xs">
                <User className="w-3.5 h-3.5 text-rose-300 shrink-0" />
                <span className="font-bold text-white max-w-[140px] sm:max-w-[180px] truncate">{formData.patientName || 'Select Patient'}</span>
                {formData.age && <span className="text-rose-300 text-[10px] shrink-0">({formData.age}y/{formData.gender})</span>}
                <Badge className="bg-rose-700 hover:bg-rose-700 text-white font-mono text-[9px] h-4 shrink-0 px-1.5">
                  {formData.ipdNo || formData.bedWard}
                </Badge>
              </div>

              {/* Expand / Minimize Toggle Button */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-8 w-8 text-rose-200 hover:text-white hover:bg-white/10 rounded-lg shrink-0"
                title={isExpanded ? "Collapse view" : "Expand to fullscreen"}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Navigation - Fully expanded, non-overlapping responsive design */}
        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="flex-1 flex flex-col min-h-0">
          <div className="px-4 sm:px-6 py-2.5 bg-white border-b border-slate-200 shrink-0">
            <TabsList className="bg-slate-100/90 p-1 rounded-xl flex flex-wrap sm:flex-nowrap items-center gap-1.5 w-full h-auto border border-slate-200 shadow-inner overflow-x-auto">
              <TabsTrigger 
                value="clinical" 
                className="flex-1 min-w-[140px] text-xs font-bold gap-2 py-2 px-3.5 rounded-lg data-[state=active]:bg-white data-[state=active]:text-rose-900 data-[state=active]:shadow-sm text-slate-600 hover:text-slate-900 transition-all shrink-0 whitespace-nowrap justify-center"
              >
                <Activity className="w-4 h-4 text-rose-600 shrink-0" />
                <span>1. Patient & Severity</span>
              </TabsTrigger>
              <TabsTrigger 
                value="guardian" 
                className="flex-1 min-w-[140px] text-xs font-bold gap-2 py-2 px-3.5 rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-900 data-[state=active]:shadow-sm text-slate-600 hover:text-slate-900 transition-all shrink-0 whitespace-nowrap justify-center"
              >
                <User className="w-4 h-4 text-blue-600 shrink-0" />
                <span>2. Relative Counseling</span>
              </TabsTrigger>
              <TabsTrigger 
                value="clauses" 
                className="flex-1 min-w-[140px] text-xs font-bold gap-2 py-2 px-3.5 rounded-lg data-[state=active]:bg-white data-[state=active]:text-amber-900 data-[state=active]:shadow-sm text-slate-600 hover:text-slate-900 transition-all shrink-0 whitespace-nowrap justify-center"
              >
                <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                <span>3. Statutory Clauses</span>
              </TabsTrigger>
              <TabsTrigger 
                value="preview" 
                className="flex-1 min-w-[140px] text-xs font-bold gap-2 py-2 px-3.5 rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-900 data-[state=active]:shadow-sm text-slate-600 hover:text-slate-900 transition-all shrink-0 whitespace-nowrap justify-center"
              >
                <Eye className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>4. Preview & Sign</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* TAB 1: Patient Selection, Clinical Assessment & Life Support */}
            <TabsContent value="clinical" className="m-0 space-y-4">
              
              {/* Quick Patient Select Banner */}
              <Card className="border border-rose-200 shadow-2xs bg-gradient-to-r from-rose-50/70 via-white to-slate-50">
                <CardContent className="p-3.5 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-rose-900 font-extrabold text-xs">
                      <Users className="w-4 h-4 text-rose-600" />
                      Link to Admitted IPD / ICU Patient
                    </div>
                    {availableAdmissions.length > 0 && (
                      <Badge variant="outline" className="text-[10px] border-rose-300 text-rose-700 bg-white font-bold w-fit">
                        {availableAdmissions.length} Admitted Patients Active
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-slate-600 font-semibold text-[11px]">Select Admitted Patient</Label>
                      <Select onValueChange={handleSelectAdmission}>
                        <SelectTrigger className="h-8 text-xs bg-white border-rose-200 font-bold">
                          <SelectValue placeholder="-- Choose from Admitted IPD List --" />
                        </SelectTrigger>
                        <SelectContent className="max-h-56">
                          {availableAdmissions.map((adm) => (
                            <SelectItem key={adm.id} value={String(adm.id)} className="text-xs">
                              {adm.patientName} ({adm.ward || 'Ward'} - Bed {adm.bedNumber || adm.bed_number || 'N/A'}) - {adm.diagnosis || 'IPD'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-slate-600 font-semibold text-[11px]">Quick Search Admitted List</Label>
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                        <Input 
                          placeholder="Filter by name, MRN, bed..."
                          value={patientSearch}
                          onChange={(e) => setPatientSearch(e.target.value)}
                          className="h-8 pl-8 text-xs bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {patientSearch && filteredAdmissions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {filteredAdmissions.slice(0, 5).map((adm) => (
                        <Button 
                          key={adm.id} 
                          type="button" 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleSelectAdmission(String(adm.id))}
                          className="h-6 text-[10px] font-bold px-2 py-0 border-rose-200 hover:bg-rose-100 text-rose-800"
                        >
                          <Bed className="w-3 h-3 mr-1 text-rose-600" />
                          {adm.patientName} (Bed {adm.bedNumber || 'ICU'})
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Patient Basic Demographics Card */}
              <Card className="border border-slate-200 shadow-xs bg-white">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2 text-slate-800 font-extrabold text-xs border-b border-slate-100 pb-2">
                    <User className="w-4 h-4 text-teal-600" />
                    Patient Identification & Admission Details
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="space-y-1">
                      <Label className="text-slate-600 font-semibold text-[11px]">Patient Full Name *</Label>
                      <Input 
                        value={formData.patientName}
                        onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                        className="h-8 text-xs bg-white font-bold"
                        placeholder="e.g. Ramesh Chandra"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-slate-600 font-semibold text-[11px]">Age & Gender</Label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <Input 
                          value={formData.age}
                          onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                          className="h-8 text-xs bg-white"
                          placeholder="Age"
                        />
                        <Select 
                          value={formData.gender} 
                          onValueChange={(val: any) => setFormData({ ...formData, gender: val })}
                        >
                          <SelectTrigger className="h-8 text-xs bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-slate-600 font-semibold text-[11px]">MRN / UHID No</Label>
                      <Input 
                        value={formData.mrn}
                        onChange={(e) => setFormData({ ...formData, mrn: e.target.value })}
                        className="h-8 text-xs bg-white"
                        placeholder="MRN-XXXXXX"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-slate-600 font-semibold text-[11px]">IPD Reg. Number</Label>
                      <Input 
                        value={formData.ipdNo}
                        onChange={(e) => setFormData({ ...formData, ipdNo: e.target.value })}
                        className="h-8 text-xs bg-white font-mono"
                        placeholder="IPD-XXXXXX"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Clinical Evaluation & Severity */}
              <Card className="border border-rose-200 shadow-xs bg-white">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2 text-rose-900 font-extrabold text-sm">
                      <Stethoscope className="w-4 h-4 text-rose-600" />
                      Clinical Evaluation & Risk Severity
                    </div>
                    <Badge variant="outline" className="border-rose-300 text-rose-700 bg-rose-50 text-[10px] font-bold">
                      Severity: {formData.riskCategory}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="space-y-1">
                      <Label className="text-slate-600 font-semibold text-[11px]">Risk Category Level</Label>
                      <Select 
                        value={formData.riskCategory} 
                        onValueChange={(val: any) => setFormData({ ...formData, riskCategory: val })}
                      >
                        <SelectTrigger className="h-8 text-xs font-bold border-rose-200 bg-rose-50/50 text-rose-900">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="High Risk">High Risk (उच्च जोखिम)</SelectItem>
                          <SelectItem value="Extremely Critical">Extremely Critical (अत्यंत गंभीर)</SelectItem>
                          <SelectItem value="Guarded">Guarded Prognosis (चिंताजनक स्थिति)</SelectItem>
                          <SelectItem value="Moribund">Moribund / Terminal (असाध्य / अत्यंत संकटग्रस्त)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-slate-600 font-semibold text-[11px]">Ward / Bed Assigned</Label>
                      <Input 
                        value={formData.bedWard} 
                        onChange={(e) => setFormData({ ...formData, bedWard: e.target.value })}
                        className="h-8 text-xs bg-white"
                        placeholder="e.g. ICU Bed 3"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-slate-600 font-semibold text-[11px]">Counseling Date</Label>
                      <Input 
                        type="date"
                        value={formData.counselingDate} 
                        onChange={(e) => setFormData({ ...formData, counselingDate: e.target.value })}
                        className="h-8 text-xs bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-slate-600 font-semibold text-[11px]">Counseling Time</Label>
                      <Input 
                        value={formData.counselingTime} 
                        onChange={(e) => setFormData({ ...formData, counselingTime: e.target.value })}
                        className="h-8 text-xs bg-white"
                        placeholder="e.g. 02:30 PM"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-slate-700 font-bold text-xs">Primary Clinical Diagnosis / प्राथमिक बीमारी</Label>
                      <Textarea 
                        value={formData.diagnosis}
                        onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                        placeholder="e.g. Septic Shock with Multiorgan Dysfunction Syndrome, Severe Acute Necrotizing Pancreatitis, ARDS"
                        className="text-xs min-h-[60px] bg-white border-slate-200"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-slate-700 font-bold text-xs">Underlying Co-morbidities / पूर्व बीमारियां</Label>
                      <Textarea 
                        value={formData.comorbidities}
                        onChange={(e) => setFormData({ ...formData, comorbidities: e.target.value })}
                        placeholder="e.g. Type 2 DM, Hypertension, Chronic Kidney Disease, Chronic Liver Disease"
                        className="text-xs min-h-[60px] bg-white border-slate-200"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-slate-700 font-bold text-xs">Current Clinical Assessment / वर्तमान स्वास्थ्य स्थिति</Label>
                    <Textarea 
                      value={formData.clinicalCondition}
                      onChange={(e) => setFormData({ ...formData, clinicalCondition: e.target.value })}
                      placeholder="Detailed clinical condition summary explained to the family..."
                      className="text-xs min-h-[50px] bg-white border-slate-200"
                    />
                  </div>

                  {/* Active / Planned Life Support Interventions */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <Label className="text-slate-800 font-bold text-xs flex items-center gap-1.5">
                      <HeartPulse className="w-3.5 h-3.5 text-rose-600" />
                      Active / Planned Advanced Life Support & Interventions (Select All Applicable)
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {[
                        { key: 'mechanicalVentilation', label: 'Invasive Ventilation (वेंटिलेटर)', desc: 'Endotracheal tube / ventilator support' },
                        { key: 'inotropicSupport', label: 'Inotropic Support (बीपी दवाएं)', desc: 'Norad / Vasopressin / Dobutamine' },
                        { key: 'dialysis', label: 'Hemodialysis / CRRT (डायलिसिस)', desc: 'Renal replacement therapy' },
                        { key: 'invasiveLines', label: 'CVC / Arterial Line (सेंट्रल लाइन)', desc: 'Central venous access' },
                        { key: 'bloodTransfusion', label: 'Blood Transfusion (रक्त संचार)', desc: 'PRBC, FFP, Platelets' },
                        { key: 'cprInformed', label: 'CPR & Resuscitation Counseling', desc: 'Chest compressions & defibrillation risks' },
                      ].map((item) => (
                        <div 
                          key={item.key}
                          onClick={() => handleSupportToggle(item.key as any)}
                          className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                            formData.criticalSupport[item.key as keyof typeof formData.criticalSupport]
                              ? 'bg-rose-50 border-rose-300 text-rose-950 font-bold shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center text-xs flex-shrink-0 ${
                            formData.criticalSupport[item.key as keyof typeof formData.criticalSupport]
                              ? 'bg-rose-600 text-white'
                              : 'border border-slate-300'
                          }`}>
                            {formData.criticalSupport[item.key as keyof typeof formData.criticalSupport] && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <div>
                            <div className="font-bold leading-tight">{item.label}</div>
                            <div className="text-[10px] text-slate-500 font-normal mt-0.5">{item.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tab 1 Step Navigation */}
              <div className="flex items-center justify-end pt-2">
                <Button 
                  type="button" 
                  onClick={() => setActiveTab('guardian')}
                  className="bg-rose-800 hover:bg-rose-900 text-white font-bold text-xs gap-1.5 h-8.5 px-4 shadow-sm"
                >
                  <span>Step 2: Relative Counseling</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </TabsContent>

            {/* TAB 2: Guardian Counseling & Next of Kin */}
            <TabsContent value="guardian" className="m-0 space-y-4">
              <Card className="border border-blue-200 shadow-xs bg-white">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2 text-blue-900 font-extrabold text-sm">
                      <User className="w-4 h-4 text-blue-600" />
                      Attendant / Next of Kin (Guardian) Counseling Details
                    </div>
                    <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50 text-[10px] font-bold">
                      Statutory Signatory
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-slate-700 font-bold text-xs">Relative / Attendant Name *</Label>
                      <Input 
                        value={formData.relativeName}
                        onChange={(e) => setFormData({ ...formData, relativeName: e.target.value })}
                        placeholder="e.g. Ramesh Kumar"
                        className="h-8 text-xs bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-slate-700 font-bold text-xs">Relationship to Patient *</Label>
                      <Input 
                        value={formData.relativeRelation}
                        onChange={(e) => setFormData({ ...formData, relativeRelation: e.target.value })}
                        placeholder="e.g. Son / Husband / Father"
                        className="h-8 text-xs bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-slate-700 font-bold text-xs">Contact Phone Number *</Label>
                      <Input 
                        value={formData.relativePhone}
                        onChange={(e) => setFormData({ ...formData, relativePhone: e.target.value })}
                        placeholder="e.g. 9876543210"
                        className="h-8 text-xs bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-slate-700 font-bold text-xs">Permanent Residential Address</Label>
                      <Input 
                        value={formData.relativeAddress}
                        onChange={(e) => setFormData({ ...formData, relativeAddress: e.target.value })}
                        placeholder="Village / Town, District, State"
                        className="h-8 text-xs bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-slate-700 font-bold text-xs">Language Used for Counseling</Label>
                      <Select 
                        value={formData.languageSpoken} 
                        onValueChange={(val: any) => setFormData({ ...formData, languageSpoken: val })}
                      >
                        <SelectTrigger className="h-8 text-xs bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Hindi">Hindi (हिंदी)</SelectItem>
                          <SelectItem value="English">English</SelectItem>
                          <SelectItem value="Bilingual">Bilingual (Hindi & English)</SelectItem>
                          <SelectItem value="Bhojpuri">Bhojpuri / Local Dialect</SelectItem>
                          <SelectItem value="Other">Other Regional Language</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Medical Counseling Team Details */}
                  <div className="pt-3 border-t border-slate-100 space-y-3">
                    <Label className="text-slate-800 font-bold text-xs">Treating Doctor & Hospital Witness</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-slate-600 font-semibold text-[11px]">Counseling Doctor Name</Label>
                        <Input 
                          value={formData.doctorName}
                          onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
                          className="h-8 text-xs bg-white font-bold text-slate-800"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-slate-600 font-semibold text-[11px]">Doctor Registration No.</Label>
                        <Input 
                          value={formData.doctorRegNo}
                          onChange={(e) => setFormData({ ...formData, doctorRegNo: e.target.value })}
                          className="h-8 text-xs bg-white"
                          placeholder="MP-18492-2015"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-slate-600 font-semibold text-[11px]">Duty Sister / Witness Name</Label>
                        <Input 
                          value={formData.witnessName}
                          onChange={(e) => setFormData({ ...formData, witnessName: e.target.value })}
                          className="h-8 text-xs bg-white"
                          placeholder="Staff Nurse / Duty Sister"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tab 2 Step Navigation */}
              <div className="flex items-center justify-between pt-2">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setActiveTab('clinical')}
                  className="text-xs h-8.5 gap-1.5 px-3"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back: Patient & Severity</span>
                </Button>
                <Button 
                  type="button" 
                  onClick={() => setActiveTab('clauses')}
                  className="bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs gap-1.5 h-8.5 px-4 shadow-sm"
                >
                  <span>Step 3: Statutory Clauses</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </TabsContent>

            {/* TAB 3: Statutory Clauses Review */}
            <TabsContent value="clauses" className="m-0 space-y-3">
              {[
                {
                  id: 1,
                  title: '1. Critical Illness & High Mortality Risk / गंभीर स्थिति एवं जीवन जोखिम की जानकारी',
                  en: 'The treating medical consultants have explained in detail that the patient is in an extremely critical and unstable medical condition with a guarded/poor prognosis. I understand that despite maximal standard medical care, ICU monitoring, and advanced therapeutics, there is a high risk of sudden deterioration, multi-organ failure, irreversible complications, or mortality.',
                  hi: 'उपस्थित वरिष्ठ चिकित्सकों द्वारा मुझे/हमें मरीज की अत्यंत गंभीर एवं नाजुक स्वास्थ्य स्थिति के बारे में विस्तार से समझा दिया गया है। मैं समझता/समझती हूँ कि सर्वोत्तम चिकित्सीय उपचार व गहन चिकित्सा (ICU Care) के बावजूद मरीज की स्थिति अत्यधिक चिंताजनक (Poor Prognosis) है तथा अचानक स्थिति बिगड़ने अथवा जीवन हानि (मृत्यु) का गंभीर जोखिम बना हुआ है।'
                },
                {
                  id: 2,
                  title: '2. Consent for Advanced Life Support & Emergency Resuscitation / आपातकालीन एवं गहन चिकित्सा प्रक्रियाओं हेतु सहमति',
                  en: 'I hereby authorize the medical team to execute all necessary emergency and intensive care interventions including invasive mechanical ventilation, inotropic/vasopressor infusions for circulatory support, dialysis/CRRT, central venous line/arterial line placements, blood transfusion, and Cardiopulmonary Resuscitation (CPR) in the event of cardiopulmonary arrest.',
                  hi: 'मैं मरीज के जीवन रक्षण हेतु आवश्यक आपातकालीन गहन चिकित्सा, इनोट्रोप दवाएं, रक्त संचार, वेंटिलेटर सपोर्ट, सीपीआर तथा अन्य जीवन रक्षक प्रक्रियाओं को करने की अपनी पूर्ण सहमति प्रदान करता/करती हूँ।'
                },
                {
                  id: 3,
                  title: '3. Unpredictable Course & No Outcome Guarantee / अप्रत्याशित परिणाम एवं कोई चिकित्सीय गारंटी नहीं',
                  en: 'I understand that in medical science, no doctor or hospital can guarantee recovery or cure. The hospital team has made no false promises or guarantees regarding the ultimate outcome of the treatment.',
                  hi: 'मुझे पूर्ण रूप से अवगत करा दिया गया है कि चिकित्सा विज्ञान में किसी भी डॉक्टर अथवा अस्पताल द्वारा शत-प्रतिशत सुधार या जीवन रक्षा की कोई गारंटी नहीं दी जा सकती। अस्पताल द्वारा हमें कोई झूठा आश्वासन नहीं दिया गया है।'
                },
                {
                  id: 4,
                  title: '4. Critical Care Tariffs Acknowledgment / आईसीयू एवं उपचार खर्च से संबंधित स्वीकृति',
                  en: 'I acknowledge full understanding of daily inpatient intensive care tariffs, equipment support fees, medications, and diagnostic investigations, and agree to settle all accrued hospital bills.',
                  hi: 'गंभीर स्थिति में लगने वाले आईसीयू, वेंटिलेटर, जीवन रक्षक दवाओं एवं जांचों के अनुमानित खर्च के विषय में मुझे समझा दिया गया है और मैं इसे वहन करने हेतु पूर्णतः सहमत हूँ।'
                },
                {
                  id: 5,
                  title: '5. Language & Voluntary Consent Declaration / भाषा एवं स्वेच्छा से घोषणा',
                  en: `I confirm that all points above were explained to me clearly in ${formData.languageSpoken || 'Hindi / English'}, and I voluntarily grant informed consent with sound mind without any coercion.`,
                  hi: 'मैंने इस सहमति पत्र को भली-भांति समझ लिया है तथा मुझे मेरी भाषा में समझा दिया गया है। मैं बिना किसी दबाव के स्वेच्छा से अपनी पूर्ण सहमति देता/देती हूँ।'
                }
              ].map((clause) => (
                <Card key={clause.id} className="border border-slate-200 shadow-2xs bg-white">
                  <CardContent className="p-3.5 space-y-1.5">
                    <div className="font-extrabold text-xs text-rose-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-rose-600" />
                      {clause.title}
                    </div>
                    <div className="text-[11px] text-slate-700 bg-slate-50 p-2 rounded border border-slate-100 leading-relaxed">
                      <strong>[EN]:</strong> {clause.en}
                    </div>
                    <div className="text-[11px] text-slate-700 bg-rose-50/40 p-2 rounded border border-rose-100/60 leading-relaxed">
                      <strong>[HI]:</strong> {clause.hi}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Tab 3 Step Navigation */}
              <div className="flex items-center justify-between pt-2">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setActiveTab('guardian')}
                  className="text-xs h-8.5 gap-1.5 px-3"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back: Relative Counseling</span>
                </Button>
                <Button 
                  type="button" 
                  onClick={() => setActiveTab('preview')}
                  className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs gap-1.5 h-8.5 px-4 shadow-sm"
                >
                  <span>Step 4: Preview & Sign</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </TabsContent>

            {/* TAB 4: Preview & Sign */}
            <TabsContent value="preview" className="m-0 space-y-4">
              <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm space-y-4 text-xs font-sans">
                <div className="text-center border-b-2 border-rose-800 pb-3">
                  <div className="text-base font-black text-rose-900 uppercase">NEO GASTROPLUS HOSPITAL</div>
                  <div className="text-[10px] text-teal-800 font-bold uppercase tracking-wider">SUPER SPECIALITY GASTRO & OT SURGICAL CENTER</div>
                  <div className="text-[10px] text-slate-500">Plot No. 7 & 8, Om Shiv Nagar, Gufa Mandir Road, Lal Ghati, Bhopal (M.P.) - 462030</div>
                  <Badge className="bg-rose-800 text-white font-bold mt-1 text-[10px] uppercase">
                    INFORMED CONSENT FOR HIGH RISK & POOR PROGNOSIS
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div><strong>Patient Name:</strong> {formData.patientName || 'N/A'}</div>
                  <div><strong>IPD Number:</strong> {formData.ipdNo || 'N/A'}</div>
                  <div><strong>Age / Gender:</strong> {formData.age} Yrs / {formData.gender}</div>
                  <div><strong>UHID / MRN:</strong> {formData.mrn}</div>
                  <div><strong>Ward / Bed:</strong> {formData.bedWard}</div>
                  <div><strong>Counseling Time:</strong> {formData.counselingDate} at {formData.counselingTime}</div>
                  <div className="col-span-2 text-rose-900 font-bold">
                    <strong>Diagnosis:</strong> {formData.diagnosis}
                  </div>
                </div>

                <div className="border border-rose-200 bg-rose-50/60 p-3 rounded-lg text-[11px] text-rose-950">
                  <strong>Risk Assessment:</strong> {formData.riskCategory} — {formData.clinicalCondition}
                </div>

                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-200 text-center text-[10px]">
                  <div className="border border-slate-200 p-2.5 rounded bg-slate-50">
                    <div className="font-bold text-slate-800">Patient / Relative Signature</div>
                    <div className="text-slate-600 mt-0.5">{formData.relativeName || 'Attendant'} ({formData.relativeRelation})</div>
                    <div className="h-10 flex items-center justify-center font-serif italic text-slate-400">
                      [Signed by Attendant]
                    </div>
                  </div>
                  <div className="border border-slate-200 p-2.5 rounded bg-slate-50">
                    <div className="font-bold text-slate-800">Witness / Staff Nurse</div>
                    <div className="text-slate-600 mt-0.5">{formData.witnessName}</div>
                    <div className="h-10 flex items-center justify-center font-serif italic text-slate-400">
                      [Signed by Witness]
                    </div>
                  </div>
                  <div className="border border-slate-200 p-2.5 rounded bg-slate-50">
                    <div className="font-bold text-slate-800">Attending Doctor</div>
                    <div className="text-slate-600 mt-0.5">{formData.doctorName}</div>
                    <div className="text-[9px] text-slate-500 font-mono">Reg: {formData.doctorRegNo}</div>
                    <div className="h-8 flex items-center justify-center font-serif italic text-slate-400">
                      [Signed & Sealed]
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer Actions */}
        <DialogFooter className="p-3 sm:px-6 bg-white border-t border-slate-200 flex flex-row items-center justify-between gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 font-bold text-xs gap-1.5"
            >
              <Printer className="w-3.5 h-3.5 text-rose-600" />
              Print Bilingual Consent
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-rose-800 hover:bg-rose-900 text-white font-bold text-xs gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? 'Saving...' : 'Save to IPD File'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PoorPrognosisConsentModal;
