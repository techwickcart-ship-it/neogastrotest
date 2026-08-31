import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Printer, 
  Save, 
  X, 
  Check, 
  Download, 
  Share2, 
  Calendar, 
  User, 
  Clock, 
  Building2, 
  AlertTriangle, 
  ShieldCheck, 
  Sparkles, 
  RefreshCw,
  Plus,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  CheckCircle2,
  Stethoscope
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { printPoorPrognosisConsent } from '@/components/PoorPrognosisConsentModal';

export interface AdmissionSheetData {
  id?: string;
  patientId?: string;
  regNo: string;
  uhidNo: string;
  wardBedNo: string;
  patientName: string;
  ageSex: string;
  fatherHusbandName: string;
  broughtBy: string;
  address: string;
  contactNo: string;
  dateOfAdmission: string;
  dateOfDischarge: string;
  typeOfAdmission: 'Paid' | 'Ayushman' | 'TPA' | 'Other';
  otherAdmissionType?: string;
  consultantIncharge: string;
  referredBy: string;
  provisionalDiagnosis: string;
  finalDiagnosis: string;
  result: 'Improved' | 'DOR' | 'LAMA' | 'Absconded' | 'Expired' | '';
  
  // LAMA / DOR Consent fields
  lamaPersonName: string;
  lamaRelation: string;
  patientSignName: string;
  patientSignDate: string;
  patientSignTime: string;
  relativeSignName: string;
  relativeSignDate: string;
  relativeSignTime: string;
  witnessSignName: string;
  witnessSignDate: string;
  witnessSignTime: string;
  doctorSignName: string;
  doctorSignDate: string;
  doctorSignTime: string;
  reasonUnableToSign: string;
  createdAt?: string;
  updatedAt?: string;
}

export function getAdmissionSheetHtml(data: AdmissionSheetData, hospitalInfo?: any): string {
  const rawHosp = hospitalInfo || storage.get(STORAGE_KEYS.HOSPITAL_INFO, {
    name: 'GASTRO PLUS HOSPITAL',
    address: 'Plot No. 7 & 8, Om Shiv Nagar, Gufa Mandir Road, Lal Ghati Bhopal, 462030, Madhya Pradesh',
    phone: '9109102145/9109101246',
    email: 'gatroplusbhopal@gmail.com',
    website: 'www.gastroplusbhopal.com'
  });

  const isOldAddress = !rawHosp?.address || rawHosp.address.includes('Aura Inn') || rawHosp.address.includes('Basti');
  const isOldPhone = !rawHosp?.phone || rawHosp.phone.includes('8601561055');
  const isOldEmail = !rawHosp?.email || rawHosp.email.includes('neogastro');

  const hospName = (rawHosp?.name && !rawHosp.name.toLowerCase().includes('medicare') && !rawHosp.name.toLowerCase().includes('cureline'))
    ? (rawHosp.name.toUpperCase().includes('NEO GASTRO') ? 'GASTRO PLUS HOSPITAL' : rawHosp.name)
    : 'GASTRO PLUS HOSPITAL';
  const hospAddress = isOldAddress ? 'Plot No. 7 & 8, Om Shiv Nagar, Gufa Mandir Road, Lal Ghati Bhopal, 462030, Madhya Pradesh' : rawHosp.address;
  const hospPhone = isOldPhone ? '9109102145/9109101246' : rawHosp.phone;
  const hospEmail = isOldEmail ? 'gatroplusbhopal@gmail.com' : rawHosp.email;
  const hospWeb = (rawHosp?.website && !rawHosp.website.includes('neogastro')) ? rawHosp.website : 'www.gastroplusbhopal.com';
  const hospLogo = rawHosp?.logo || null;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Admission Sheet & LAMA Consent - ${data.patientName || 'Patient'}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 10mm 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: 'Segoe UI', Arial, 'Helvetica Neue', sans-serif;
      font-size: 11.5px;
      line-height: 1.35;
      color: #111827;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    .sheet-container {
      width: 100%;
      max-width: 190mm;
      margin: 0 auto;
      border: 1.5px solid #000;
      padding: 10px 14px;
      background: #fff;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6px;
    }
    .header-logo-left {
      width: 68px;
      vertical-align: middle;
      text-align: center;
    }
    .header-center {
      text-align: center;
      vertical-align: middle;
      padding: 0 8px;
    }
    .header-logo-right {
      width: 68px;
      vertical-align: middle;
      text-align: center;
    }
    .hosp-title {
      font-size: 20px;
      font-weight: 900;
      letter-spacing: 0.5px;
      color: #0b2e59;
      margin: 0 0 2px 0;
      text-transform: uppercase;
      font-family: 'Arial Black', Impact, sans-serif;
    }
    .hosp-address {
      font-size: 10px;
      font-weight: 600;
      color: #222;
      margin: 0 0 2px 0;
    }
    .hosp-contacts {
      font-size: 9.5px;
      font-weight: 500;
      color: #333;
      margin: 0;
    }
    .logo-badge {
      display: inline-block;
      width: 52px;
      height: 52px;
      border-radius: 50%;
      border: 1.5px solid #0b2e59;
      color: #0b2e59;
      font-weight: 900;
      font-size: 11px;
      line-height: 50px;
      text-align: center;
    }
    .nabh-badge {
      display: inline-block;
      width: 50px;
      height: 50px;
      border: 1.5px solid #006633;
      border-radius: 50%;
      color: #006633;
      font-size: 8.5px;
      font-weight: 900;
      text-align: center;
      padding-top: 10px;
      line-height: 1.1;
    }
    .section-banner {
      border: 1.5px solid #000;
      text-align: center;
      padding: 3px 0;
      margin: 6px 0 8px 0;
      font-size: 13px;
      font-weight: 900;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      background: #f8fafc;
    }
    .field-row {
      display: flex;
      align-items: baseline;
      margin-bottom: 7px;
      font-size: 11px;
    }
    .field-label {
      font-weight: 700;
      color: #000;
      white-space: nowrap;
      margin-right: 4px;
    }
    .field-fill {
      flex: 1;
      border-bottom: 1px dotted #333;
      padding: 0 4px 1px 4px;
      font-weight: 600;
      color: #0f172a;
      min-height: 15px;
    }
    .field-fill.plain {
      border-bottom: none;
    }
    .col-row {
      display: flex;
      width: 100%;
      gap: 12px;
      margin-bottom: 6px;
    }
    .col-3 {
      flex: 1;
      display: flex;
      align-items: baseline;
    }
    .col-2 {
      flex: 1;
      display: flex;
      align-items: baseline;
    }
    .checkbox-group {
      display: flex;
      gap: 14px;
      align-items: center;
      font-size: 10.5px;
      font-weight: 600;
    }
    .checkbox-box {
      display: inline-block;
      width: 11px;
      height: 11px;
      border: 1.2px solid #000;
      margin-right: 4px;
      vertical-align: middle;
      text-align: center;
      line-height: 10px;
      font-size: 9px;
      font-weight: bold;
    }
    .checkbox-box.checked {
      background: #000;
      color: #fff;
    }
    .divider-thick {
      border-top: 1.5px solid #000;
      margin: 10px 0 8px 0;
    }
    .lama-banner {
      border: 1.5px solid #000;
      text-align: center;
      padding: 3px 0;
      margin: 4px 0 6px 0;
      font-size: 12.5px;
      font-weight: 900;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      background: #f1f5f9;
    }
    .lama-patient-bar {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid #000;
      padding-bottom: 4px;
      margin-bottom: 6px;
      font-size: 10px;
      font-weight: 600;
    }
    .declaration-header {
      border: 1.2px solid #000;
      text-align: center;
      padding: 2px 0;
      font-weight: 900;
      font-size: 11px;
      background: #f8fafc;
      margin-bottom: 6px;
      letter-spacing: 0.5px;
    }
    .declaration-clause {
      font-size: 9.8px;
      line-height: 1.35;
      margin-bottom: 6px;
      color: #000;
      text-align: justify;
    }
    .clause-title {
      font-weight: 800;
      color: #000;
    }
    .sig-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      border: 1.2px solid #000;
    }
    .sig-table th, .sig-table td {
      border: 1px solid #000;
      padding: 4px 6px;
      font-size: 9.5px;
      text-align: left;
    }
    .sig-table th {
      background: #f8fafc;
      font-weight: 800;
      text-align: center;
    }
    .sig-table .row-hdr {
      font-weight: 700;
      width: 115px;
      background: #fdfdfd;
    }
    .sig-cell {
      height: 24px;
      vertical-align: middle;
      font-weight: 600;
      font-size: 9.5px;
    }
    .bottom-note {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-top: 7px;
      font-size: 9.5px;
      font-weight: 600;
    }
    .page-num-circle {
      display: inline-block;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #000;
      color: #fff;
      text-align: center;
      line-height: 16px;
      font-size: 9px;
      font-weight: bold;
    }
    @media print {
      body {
        margin: 0;
        background: transparent;
      }
      .sheet-container {
        border: 1.5px solid #000;
        box-shadow: none;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="sheet-container">
    <!-- Header Table -->
    <table class="header-table">
      <tr>
        <td class="header-logo-left">
          ${hospLogo ? `<img src="${hospLogo}" alt="Logo" style="max-height: 50px; max-width: 50px; object-fit: contain;" />` : `
          <div class="logo-badge">
            <span style="font-size:16px;">+</span> GP
          </div>`}
        </td>
        <td class="header-center">
          <div class="hosp-title">${hospName}</div>
          <div class="hosp-address">${hospAddress}</div>
          <div class="hosp-contacts">Ph.: ${hospPhone} &nbsp;|&nbsp; Website : ${hospWeb} &nbsp;|&nbsp; e-mail : ${hospEmail}</div>
        </td>
        <td class="header-logo-right">
          <div class="nabh-badge">
            NABH<br/><span style="font-size:6.5px; font-weight:normal;">QUALITY</span>
          </div>
        </td>
      </tr>
    </table>

    <!-- Main Title -->
    <div class="section-banner">
      ADMISSION SHEET (For office use only)
    </div>

    <!-- Row 1: Reg, UHID, Ward -->
    <div class="col-row">
      <div class="col-3">
        <span class="field-label">Reg. No.</span>
        <span class="field-fill">${data.regNo || ''}</span>
      </div>
      <div class="col-3">
        <span class="field-label">UHID No.</span>
        <span class="field-fill">${data.uhidNo || ''}</span>
      </div>
      <div class="col-3">
        <span class="field-label">Ward / Bed No.</span>
        <span class="field-fill">${data.wardBedNo || ''}</span>
      </div>
    </div>

    <!-- Row 2: Patient Name, Age/Sex -->
    <div class="col-row">
      <div class="col-2" style="flex: 2;">
        <span class="field-label">Patient's Name</span>
        <span class="field-fill">${data.patientName || ''}</span>
      </div>
      <div class="col-2" style="flex: 1;">
        <span class="field-label">Age / Sex</span>
        <span class="field-fill">${data.ageSex || ''}</span>
      </div>
    </div>

    <!-- Row 3: Father/Husband Name, Brought by -->
    <div class="col-row">
      <div class="col-2" style="flex: 1.3;">
        <span class="field-label">Father / Husbands Name</span>
        <span class="field-fill">${data.fatherHusbandName || ''}</span>
      </div>
      <div class="col-2" style="flex: 1;">
        <span class="field-label">Brought by</span>
        <span class="field-fill">${data.broughtBy || ''}</span>
      </div>
    </div>

    <!-- Row 4: Address -->
    <div class="field-row">
      <span class="field-label">Address</span>
      <span class="field-fill">${data.address || ''}</span>
    </div>

    <!-- Row 5: Contact No, DOA, DOD -->
    <div class="col-row">
      <div class="col-3">
        <span class="field-label">Contact no.</span>
        <span class="field-fill">${data.contactNo || ''}</span>
      </div>
      <div class="col-3">
        <span class="field-label">Date of Admission</span>
        <span class="field-fill">${data.dateOfAdmission || ''}</span>
      </div>
      <div class="col-3">
        <span class="field-label">Date of Discharge</span>
        <span class="field-fill">${data.dateOfDischarge || ''}</span>
      </div>
    </div>

    <!-- Row 6: Type of Admission -->
    <div class="field-row" style="margin-bottom: 6px;">
      <span class="field-label">Type of Admission :</span>
      <div class="checkbox-group" style="margin-left: 8px;">
        <span><span class="checkbox-box ${data.typeOfAdmission === 'Paid' ? 'checked' : ''}">${data.typeOfAdmission === 'Paid' ? '&#10003;' : ''}</span> Paid</span>
        <span><span class="checkbox-box ${data.typeOfAdmission === 'Ayushman' ? 'checked' : ''}">${data.typeOfAdmission === 'Ayushman' ? '&#10003;' : ''}</span> Ayushman</span>
        <span><span class="checkbox-box ${data.typeOfAdmission === 'TPA' ? 'checked' : ''}">${data.typeOfAdmission === 'TPA' ? '&#10003;' : ''}</span> TPA</span>
        <span><span class="checkbox-box ${data.typeOfAdmission === 'Other' ? 'checked' : ''}">${data.typeOfAdmission === 'Other' ? '&#10003;' : ''}</span> Other ${data.otherAdmissionType ? `(${data.otherAdmissionType})` : ''}</span>
      </div>
    </div>

    <!-- Row 7: Consultant, Referred By -->
    <div class="col-row">
      <div class="col-2">
        <span class="field-label">Consultant Incharge</span>
        <span class="field-fill">${data.consultantIncharge || ''}</span>
      </div>
      <div class="col-2">
        <span class="field-label">Referred by</span>
        <span class="field-fill">${data.referredBy || ''}</span>
      </div>
    </div>

    <!-- Row 8: Provisional Diagnosis -->
    <div class="field-row">
      <span class="field-label">Provisional Diagnosis</span>
      <span class="field-fill">${data.provisionalDiagnosis || ''}</span>
    </div>

    <!-- Row 9: Final Diagnosis -->
    <div class="field-row">
      <span class="field-label">Final Diagnosis</span>
      <span class="field-fill">${data.finalDiagnosis || ''}</span>
    </div>

    <!-- Row 10: Result -->
    <div class="field-row" style="margin-bottom: 4px;">
      <span class="field-label">Result :</span>
      <div class="checkbox-group" style="margin-left: 8px;">
        <span><span class="checkbox-box ${data.result === 'Improved' ? 'checked' : ''}">${data.result === 'Improved' ? '&#10003;' : ''}</span> Improved</span>
        <span><span class="checkbox-box ${data.result === 'DOR' ? 'checked' : ''}">${data.result === 'DOR' ? '&#10003;' : ''}</span> DOR</span>
        <span><span class="checkbox-box ${data.result === 'LAMA' ? 'checked' : ''}">${data.result === 'LAMA' ? '&#10003;' : ''}</span> LAMA</span>
        <span><span class="checkbox-box ${data.result === 'Absconded' ? 'checked' : ''}">${data.result === 'Absconded' ? '&#10003;' : ''}</span> Absconded</span>
        <span><span class="checkbox-box ${data.result === 'Expired' ? 'checked' : ''}">${data.result === 'Expired' ? '&#10003;' : ''}</span> Expired</span>
      </div>
    </div>

    <div class="divider-thick"></div>

    <!-- Lower Section: LAMA / DOR CONSENT -->
    <div class="lama-banner">
      LAMA / DOR CONSENT
    </div>

    <!-- Patient Bar for LAMA -->
    <div class="lama-patient-bar">
      <div><strong>Name :</strong> ${data.patientName || '................................'}</div>
      <div><strong>Age / Sex :</strong> ${data.ageSex || '............'}</div>
      <div><strong>DOA :</strong> ${data.dateOfAdmission || '................'}</div>
    </div>
    <div class="lama-patient-bar" style="border-bottom: 1.2px solid #000; margin-bottom: 6px;">
      <div><strong>UHID No :</strong> ${data.uhidNo || '....................'}</div>
      <div><strong>IPD No :</strong> ${data.regNo || '....................'}</div>
      <div><strong>Ward/Bed No :</strong> ${data.wardBedNo || '................'}</div>
    </div>

    <!-- Declaration Box -->
    <div class="declaration-header">
      DECLARATION / घोषणा
    </div>

    <div class="declaration-clause">
      <span class="clause-title">1- Voluntary Decision / स्वैच्छिक निर्णय -</span>
      I <strong style="text-decoration: underline;">${data.lamaPersonName || data.patientName || '____________________'}</strong> (Patient / Relative Name) hereby certify that I am leaving / taking the patient from ${hospName} at my own request and insistence and against the specific medical advice of the attending physician- <em>यह प्रमाणित करता / करती हूँ कि मैं अपने स्वयं के अनुरोध और जिद पर, और उपस्थित चिकित्सक की विशिष्ट चिकित्सा सलाह के विरुद्ध, ${hospName} से जा रहा / रही हूँ / रोगी को ले जा रहा / रही हूँ।</em>
    </div>

    <div class="declaration-clause">
      <span class="clause-title">2- Explanation of Risks / जोखिमों का स्पष्टीकरण -</span>
      The medical risks associated with leaving the hospital at this stage have been fully explained to me by the medical staff- I understand that leaving now may result in worsening of the condition, serious complications, permanent disability or even death- <em>इस चरण में अस्पताल छोड़ने से जुड़े चिकित्सा जोखिमों को मेडिकल स्टाफ द्वारा मुझे पूरी तरह से समझाया गया है। मैं समझता / समझती हूँ कि अभी जाने से स्थिति बिगड़ सकती है, गंभीर जटिलताएं हो सकती हैं, स्थायी विकलांगता, या मृत्यु भी हो सकती है।</em>
    </div>

    <div class="declaration-clause">
      <span class="clause-title">3- Release of Responsibility / जिम्मेदारी से मुक्ति -</span>
      I hereby release ${hospName}, its administration, nursing staff and my attending physicians from any and all responsibility for the consequences (medical or legal) that may result from my decision to leave under these circumstances- <em>मैं एतद् द्वारा ${hospName}, उसके प्रशासन, नर्सिंग स्टाफ और अपने उपस्थित चिकित्सकों को उन परिणामों (चिकित्सीय या कानूनी) के लिए किसी भी और सभी जिम्मेदारी से मुक्त करता / करती हूँ जो इन परिस्थितियों में छोड़ने के मेरे निर्णय के परिणामस्वरूप हो सकते हैं।</em>
    </div>

    <!-- Signature Table -->
    <table class="sig-table">
      <thead>
        <tr>
          <th style="width: 120px;"></th>
          <th>Patient / मरीज</th>
          <th>Next-of-Kin / निकटतम संबंधी</th>
          <th>Witness / गवाह</th>
          <th>Doctor / डॉक्टर</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="row-hdr">Signature / हस्ताक्षर</td>
          <td class="sig-cell">${data.patientSignName ? '&#10003; Confirmed' : ''}</td>
          <td class="sig-cell">${data.relativeSignName ? '&#10003; Signed' : ''}</td>
          <td class="sig-cell">${data.witnessSignName ? '&#10003; Attested' : ''}</td>
          <td class="sig-cell">${data.doctorSignName ? '&#10003; Verified' : ''}</td>
        </tr>
        <tr>
          <td class="row-hdr">Name / नाम:</td>
          <td class="sig-cell">${data.patientSignName || data.patientName || ''}</td>
          <td class="sig-cell">${data.relativeSignName || ''}</td>
          <td class="sig-cell">${data.witnessSignName || ''}</td>
          <td class="sig-cell">${data.doctorSignName || data.consultantIncharge || ''}</td>
        </tr>
        <tr>
          <td class="row-hdr">Date / दिनांक:</td>
          <td class="sig-cell">${data.patientSignDate || ''}</td>
          <td class="sig-cell">${data.relativeSignDate || ''}</td>
          <td class="sig-cell">${data.witnessSignDate || ''}</td>
          <td class="sig-cell">${data.doctorSignDate || ''}</td>
        </tr>
        <tr>
          <td class="row-hdr">Time / समय</td>
          <td class="sig-cell">${data.patientSignTime || ''}</td>
          <td class="sig-cell">${data.relativeSignTime || ''}</td>
          <td class="sig-cell">${data.witnessSignTime || ''}</td>
          <td class="sig-cell">${data.doctorSignTime || ''}</td>
        </tr>
      </tbody>
    </table>

    <!-- Footer Note -->
    <div class="bottom-note">
      <div style="flex: 1; display: flex; align-items: baseline;">
        <span class="field-label" style="font-size: 9.5px;">Reason the Patient is unable to sign:</span>
        <span class="field-fill" style="min-height: 12px; font-size: 9px;">${data.reasonUnableToSign || ''}</span>
      </div>
      <div style="margin-left: 12px;">
        <span class="page-num-circle">1</span>
      </div>
    </div>
  </div>
</body>
</html>
`;
}

export function printOfficialAdmissionSheet(data: AdmissionSheetData, hospitalInfo?: any) {
  const html = getAdmissionSheetHtml(data, hospitalInfo);
  const printWindow = window.open('', '_blank', 'width=900,height=1000');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 350);
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
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 400);
    }
  }
}

interface AdmissionSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient?: any;
  appointment?: any;
  admissionRecord?: any;
  onSaved?: (savedData: AdmissionSheetData) => void;
}

export const AdmissionSheetModal: React.FC<AdmissionSheetModalProps> = ({
  isOpen,
  onClose,
  patient,
  appointment,
  admissionRecord,
  onSaved
}) => {
  const hosp = storage.get(STORAGE_KEYS.HOSPITAL_INFO, {
    name: 'Gastro Plus Hospital',
    address: 'Plot No. 7 & 8, Om Shiv Nagar, Gufa Mandir Road, Lal Ghati Bhopal, 462030, Madhya Pradesh',
    phone: '9109102145 / 9109101246',
    email: 'gatroplusbhopal@gmail.com',
    website: 'www.gastroplusbhopal.com'
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const currentTimeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const [activeTab, setActiveTab] = useState<'form' | 'lama' | 'preview'>('form');
  const [isExpanded, setIsExpanded] = useState(false);
  const [zoomScale, setZoomScale] = useState<number>(100);

  const [formData, setFormData] = useState<AdmissionSheetData>({
    regNo: '',
    uhidNo: '',
    wardBedNo: 'Inpatient Ward / Day Care',
    patientName: '',
    ageSex: '',
    fatherHusbandName: '',
    broughtBy: '',
    address: '',
    contactNo: '',
    dateOfAdmission: todayStr,
    dateOfDischarge: '',
    typeOfAdmission: 'Paid',
    consultantIncharge: 'Dr. A. K. Sharma',
    referredBy: 'Self / General OPD',
    provisionalDiagnosis: '',
    finalDiagnosis: '',
    result: '',
    lamaPersonName: '',
    lamaRelation: '',
    patientSignName: '',
    patientSignDate: todayStr,
    patientSignTime: currentTimeStr,
    relativeSignName: '',
    relativeSignDate: todayStr,
    relativeSignTime: currentTimeStr,
    witnessSignName: '',
    witnessSignDate: todayStr,
    witnessSignTime: currentTimeStr,
    doctorSignName: 'Dr. A. K. Sharma',
    doctorSignDate: todayStr,
    doctorSignTime: currentTimeStr,
    reasonUnableToSign: ''
  });

  // Populate data when patient/appointment changes
  useEffect(() => {
    if (!isOpen) return;

    const p = patient || {};
    const appt = appointment || {};
    const adm = admissionRecord || {};

    const name = p.name || appt.patientName || adm.patientName || appt.patient_name || '';
    const age = p.age || appt.age || appt.patientAge || adm.age || '';
    const gender = p.gender || appt.gender || appt.patientGender || adm.gender || 'Male';
    const ageSexStr = age ? `${age} Y / ${gender}` : gender || '';
    const mrn = p.mrn || appt.patientMrn || appt.mrn || adm.patientMrn || adm.mrn || `MRN-${Math.floor(100000 + Math.random() * 900000)}`;
    
    // Support IPD admissions, Endoscopy procedures, and general records
    let calculatedRegNo = adm.admissionNumber || adm.ipdNumber || '';
    if (!calculatedRegNo && adm.id) {
      calculatedRegNo = `IPD-${String(adm.id).slice(-6).toUpperCase()}`;
    } else if (!calculatedRegNo && appt.procedureNumber) {
      calculatedRegNo = appt.procedureNumber;
    } else if (!calculatedRegNo && appt.appointmentNumber) {
      calculatedRegNo = appt.appointmentNumber;
    } else if (!calculatedRegNo) {
      calculatedRegNo = `ADM-${mrn}`;
    }

    const phone = p.phone || p.mobile || appt.phone || appt.patientPhone || adm.phone || '';
    const address = p.address || appt.patientAddress || [p.city, p.state].filter(Boolean).join(', ') || '';
    const doctor = appt.doctor || appt.doctorName || appt.consultant || p.attendingDoctor || adm.doctor || adm.doctorName || 'Dr. A. K. Sharma';
    const guardian = p.fatherName || p.husbandName || p.guardianName || p.relative1Name || appt.guardianName || '';
    const broughtBy = p.relative1Name || p.emergencyContact || guardian || 'Self / Attendant';
    
    let bed = 'IPD Inpatient Ward';
    if (adm.ward && (adm.bedNumber || adm.bed_number || adm.bed)) {
      bed = `${adm.ward} - Bed ${adm.bedNumber || adm.bed_number || adm.bed}`;
    } else if (adm.ward) {
      bed = adm.ward;
    } else if (adm.bedNumber || adm.bed) {
      bed = `Bed ${adm.bedNumber || adm.bed}`;
    } else if (appt.procedureType || appt.procedureName) {
      bed = `Endoscopy & OT Day Care / ${appt.procedureType || appt.procedureName}`;
    }

    const provDiag = adm.provisionalDiagnosis || adm.diagnosis || appt.indication || appt.procedureName || p.complaints || p.diagnosis || appt.reason || '';

    // Check if there is an existing saved admission sheet for this patient
    const savedSheets: AdmissionSheetData[] = storage.get('hms_admission_sheets', []);
    const existing = savedSheets.find(s => (s.patientId && s.patientId === p.id) || (s.uhidNo && s.uhidNo === mrn));

    if (existing) {
      setFormData(existing);
    } else {
      setFormData({
        patientId: p.id || '',
        regNo: calculatedRegNo,
        uhidNo: mrn,
        wardBedNo: bed,
        patientName: name,
        ageSex: ageSexStr,
        fatherHusbandName: guardian,
        broughtBy: broughtBy,
        address: address,
        contactNo: phone,
        dateOfAdmission: adm.admissionDate || appt.appointment_date || appt.date || todayStr,
        dateOfDischarge: adm.dischargeDate || '',
        typeOfAdmission: (adm.type as any) || (p.tpaId ? 'TPA' : 'Paid'),
        consultantIncharge: doctor,
        referredBy: p.referredBy || 'Self / General OPD',
        provisionalDiagnosis: provDiag,
        finalDiagnosis: adm.finalDiagnosis || '',
        result: (adm.result as any) || '',
        lamaPersonName: name,
        lamaRelation: 'Self',
        patientSignName: name,
        patientSignDate: todayStr,
        patientSignTime: currentTimeStr,
        relativeSignName: guardian,
        relativeSignDate: todayStr,
        relativeSignTime: currentTimeStr,
        witnessSignName: 'Staff Nurse',
        witnessSignDate: todayStr,
        witnessSignTime: currentTimeStr,
        doctorSignName: doctor,
        doctorSignDate: todayStr,
        doctorSignTime: currentTimeStr,
        reasonUnableToSign: ''
      });
    }
  }, [isOpen, patient, appointment, admissionRecord]);

  const handleSave = () => {
    try {
      const savedSheets: AdmissionSheetData[] = storage.get('hms_admission_sheets', []);
      const updatedSheet: AdmissionSheetData = {
        ...formData,
        id: formData.id || `adm-sheet-${Date.now()}`,
        updatedAt: new Date().toISOString()
      };

      const filtered = savedSheets.filter(s => s.uhidNo !== updatedSheet.uhidNo);
      const newSheets = [updatedSheet, ...filtered];

      storage.set('hms_admission_sheets', newSheets);
      toast.success(`Admission Sheet for ${formData.patientName || 'Patient'} saved successfully!`);
      if (onSaved) onSaved(updatedSheet);
    } catch (err: any) {
      toast.error('Failed to save admission sheet: ' + err.message);
    }
  };

  const handlePrint = () => {
    handleSave();
    printOfficialAdmissionSheet(formData, hosp);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent 
        className={cn(
          "overflow-hidden flex flex-col p-0 border-slate-200 shadow-2xl transition-all duration-300 gap-0",
          isExpanded 
            ? "!w-[98vw] !max-w-none !h-[97vh] !max-h-[97vh] rounded-xl" 
            : "!w-[96vw] sm:!max-w-5xl md:!max-w-6xl lg:!max-w-7xl max-h-[94vh] rounded-2xl"
        )}
      >
        {/* Header with high contrast, clear title and non-cramped actions */}
        <DialogHeader className="px-6 py-4 bg-slate-900 text-white sticky top-0 z-20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 shrink-0 pr-14">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30 shadow-inner">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <DialogTitle className="text-base sm:text-lg font-black tracking-tight text-white">
                  Official Inpatient & Day-Care Admission Sheet
                </DialogTitle>
                <Badge className="bg-blue-600/40 text-blue-300 border-blue-400/30 text-[11px] font-semibold py-0.5 px-2">
                  {hosp.name || 'Gastro Plus Hospital'}
                </Badge>
                <Badge variant="outline" className="text-[10px] text-slate-300 border-slate-700 bg-slate-800/80">
                  A4 Medical Docket
                </Badge>
              </div>
              <p className="text-xs text-slate-300 mt-1 truncate">
                Comprehensive patient admission docket, consultant assignment & bilingual LAMA / DOR legal risk declaration.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8.5 px-3 text-xs bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white font-medium gap-1.5 transition-all"
              title={isExpanded ? "Collapse to Standard View" : "Expand to Fullscreen View"}
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5 text-sky-400" /> : <Maximize2 className="w-3.5 h-3.5 text-sky-400" />}
              <span className="hidden sm:inline">{isExpanded ? 'Normal View' : 'Expand View'}</span>
            </Button>
            
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleSave} 
              className="h-8.5 px-3 text-xs bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white font-semibold gap-1.5"
            >
              <Save className="w-3.5 h-3.5 text-emerald-400" />
              Save
            </Button>
            
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => {
                printPoorPrognosisConsent({
                  patientId: formData.patientId || 'pat-1',
                  patientName: formData.patientName || 'Patient',
                  mrn: formData.uhidNo || 'N/A',
                  age: formData.age || 'N/A',
                  gender: formData.gender || 'Male',
                  ipdNo: formData.ipdNo || 'N/A',
                  bedWard: `${formData.ward || 'ICU'} ${formData.bedNumber ? '- Bed ' + formData.bedNumber : ''}`,
                  admissionDate: formData.admissionDate || new Date().toISOString().split('T')[0],
                  diagnosis: formData.provisionalDiagnosis || 'Critical Inpatient Care',
                  comorbidities: 'Hypertension, Diabetes Mellitus',
                  clinicalCondition: 'Patient is critically ill requiring close continuous hemodynamic monitoring and guarded prognosis.',
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
                  relativeName: formData.attendantName || 'Next of Kin',
                  relativeRelation: formData.attendantRelation || 'Relative',
                  relativePhone: formData.attendantContact || formData.contactPhone || 'N/A',
                  relativeAddress: formData.presentAddress || formData.permanentAddress || 'N/A',
                  relativeSign: formData.attendantName || 'Attendant',
                  doctorName: formData.doctorName || 'Dr. Navodita Tiwari',
                  doctorDesignation: 'Senior Consultant & Critical Care Lead',
                  doctorRegNo: 'MCI-54219',
                  doctorSign: formData.doctorName || 'Dr. Navodita Tiwari',
                  witnessName: 'Staff Nurse',
                  witnessPhone: '9109102145',
                  witnessSign: 'Nurse In-charge',
                  languageSpoken: 'Hindi',
                  additionalClinicalNotes: 'Informed consent for high risk clinical condition and guarded prognosis explained in detail.',
                  status: 'Signed'
                });
                toast.success('Printing Poor Prognosis Consent');
              }} 
              className="h-8.5 px-3 text-xs bg-rose-950/80 border-rose-700/60 text-rose-200 hover:bg-rose-900 hover:text-white font-bold gap-1.5"
              title="Print Medico-Legal Poor Prognosis & High Risk Consent Form (गंभीर स्थिति सहमति पत्र)"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Poor Prognosis Consent</span>
            </Button>
            
            <Button 
              size="sm" 
              onClick={handlePrint} 
              className="h-8.5 px-4 text-xs bg-medical-blue hover:bg-blue-600 text-white font-bold gap-2 shadow-md"
            >
              <Printer className="w-3.5 h-3.5" />
              Print A4 Sheet
            </Button>
          </div>
        </DialogHeader>

        {/* Spacious Tab Navigation Bar */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-6 py-2.5 shrink-0 flex items-center justify-between gap-4 overflow-x-auto">
          <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <TabsList className="bg-slate-200/80 p-1 rounded-xl border border-slate-300/60 flex items-center gap-1 w-full sm:w-auto overflow-x-auto h-auto">
                <TabsTrigger 
                  value="form" 
                  className="flex-1 sm:flex-initial py-2 px-4 text-xs sm:text-sm font-bold gap-2 rounded-lg transition-all data-[state=active]:bg-white data-[state=active]:text-blue-900 data-[state=active]:shadow-xs whitespace-nowrap"
                >
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>1. Admission Details</span>
                </TabsTrigger>
                
                <TabsTrigger 
                  value="lama" 
                  className="flex-1 sm:flex-initial py-2 px-4 text-xs sm:text-sm font-bold gap-2 rounded-lg transition-all data-[state=active]:bg-white data-[state=active]:text-amber-900 data-[state=active]:shadow-xs whitespace-nowrap"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>2. LAMA / DOR Consent & Signatures</span>
                </TabsTrigger>
                
                <TabsTrigger 
                  value="preview" 
                  className="flex-1 sm:flex-initial py-2 px-4 text-xs sm:text-sm font-bold gap-2 rounded-lg transition-all data-[state=active]:bg-white data-[state=active]:text-emerald-900 data-[state=active]:shadow-xs whitespace-nowrap"
                >
                  <Printer className="w-4 h-4 text-emerald-600" />
                  <span>3. Print Preview (A4 Sheet)</span>
                </TabsTrigger>
              </TabsList>

              {/* Status indicator on top right of tab bar */}
              <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-slate-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Patient: <strong className="text-slate-900">{formData.patientName || 'Untitled'}</strong> ({formData.uhidNo || 'No MRN'})</span>
              </div>
            </div>

            {/* Scrollable Main Content Container */}
            <div className="overflow-y-auto max-h-[calc(94vh-140px)] p-6 space-y-6 bg-slate-50/70">
              
              {/* TAB 1: Admission Sheet Details */}
              <TabsContent value="form" className="m-0 space-y-6 focus-visible:outline-none">
                
                {/* SECTION 1: Hospital Record & Registration Numbers */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-black text-sm border border-blue-100">
                        1
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm sm:text-base">Hospital Registration & Bed Allocation</h4>
                        <p className="text-xs text-slate-500">Official hospital admission numbers, ward booking and dates</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono font-bold text-blue-700 bg-blue-50/70 border-blue-200 px-3 py-1">
                      MRN: {formData.uhidNo || 'N/A'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div>
                      <Label className="text-xs font-bold text-slate-700">Reg. No. (OPD / IPD No.)</Label>
                      <Input 
                        value={formData.regNo} 
                        onChange={(e) => setFormData({ ...formData, regNo: e.target.value })} 
                        className="mt-1.5 h-10 text-xs font-semibold"
                        placeholder="e.g. IPD-2026-0811"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-700">UHID No. (MRN / Patient ID)</Label>
                      <Input 
                        value={formData.uhidNo} 
                        onChange={(e) => setFormData({ ...formData, uhidNo: e.target.value })} 
                        className="mt-1.5 h-10 text-xs font-mono font-bold text-blue-900 bg-blue-50/30"
                        placeholder="e.g. MRN-882310"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-700">Ward / Bed No.</Label>
                      <Input 
                        value={formData.wardBedNo} 
                        onChange={(e) => setFormData({ ...formData, wardBedNo: e.target.value })} 
                        className="mt-1.5 h-10 text-xs font-semibold"
                        placeholder="e.g. General Ward - Bed 04 / Day Care"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-700">Date of Admission</Label>
                      <Input 
                        type="date"
                        value={formData.dateOfAdmission} 
                        onChange={(e) => setFormData({ ...formData, dateOfAdmission: e.target.value })} 
                        className="mt-1.5 h-10 text-xs font-medium"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-700">Date of Discharge (if completed)</Label>
                      <Input 
                        type="date"
                        value={formData.dateOfDischarge} 
                        onChange={(e) => setFormData({ ...formData, dateOfDischarge: e.target.value })} 
                        className="mt-1.5 h-10 text-xs font-medium"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-700 mb-2 block">Type of Admission</Label>
                      <RadioGroup 
                        value={formData.typeOfAdmission} 
                        onValueChange={(val: any) => setFormData({ ...formData, typeOfAdmission: val })}
                        className="grid grid-cols-2 gap-2 mt-1"
                      >
                        <div className="flex items-center space-x-2 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-slate-50 cursor-pointer">
                          <RadioGroupItem value="Paid" id="adm-paid" />
                          <Label htmlFor="adm-paid" className="text-xs font-semibold cursor-pointer">Paid</Label>
                        </div>
                        <div className="flex items-center space-x-2 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-slate-50 cursor-pointer">
                          <RadioGroupItem value="Ayushman" id="adm-ayushman" />
                          <Label htmlFor="adm-ayushman" className="text-xs font-semibold cursor-pointer">Ayushman</Label>
                        </div>
                        <div className="flex items-center space-x-2 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-slate-50 cursor-pointer">
                          <RadioGroupItem value="TPA" id="adm-tpa" />
                          <Label htmlFor="adm-tpa" className="text-xs font-semibold cursor-pointer">TPA / Ins.</Label>
                        </div>
                        <div className="flex items-center space-x-2 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-slate-50 cursor-pointer">
                          <RadioGroupItem value="Other" id="adm-other" />
                          <Label htmlFor="adm-other" className="text-xs font-semibold cursor-pointer">Other</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: Patient Demographic & Attendant Details */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black text-sm border border-indigo-100">
                      2
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm sm:text-base">Patient Demographics & Attendant Info</h4>
                      <p className="text-xs text-slate-500">Contact coordinates, family relations and guardian identity</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2">
                      <Label className="text-xs font-bold text-slate-700">Patient's Full Name *</Label>
                      <Input 
                        value={formData.patientName} 
                        onChange={(e) => setFormData({ ...formData, patientName: e.target.value })} 
                        className="mt-1.5 h-10 text-xs font-bold text-slate-900"
                        placeholder="Full Patient Name"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-700">Age / Sex</Label>
                      <Input 
                        value={formData.ageSex} 
                        onChange={(e) => setFormData({ ...formData, ageSex: e.target.value })} 
                        className="mt-1.5 h-10 text-xs font-semibold"
                        placeholder="e.g. 45 Y / Male"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-700">Father's / Husband's Name</Label>
                      <Input 
                        value={formData.fatherHusbandName} 
                        onChange={(e) => setFormData({ ...formData, fatherHusbandName: e.target.value })} 
                        className="mt-1.5 h-10 text-xs"
                        placeholder="Father or Husband name"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-700">Brought by (Attendant / Relation)</Label>
                      <Input 
                        value={formData.broughtBy} 
                        onChange={(e) => setFormData({ ...formData, broughtBy: e.target.value })} 
                        className="mt-1.5 h-10 text-xs"
                        placeholder="e.g. Rajesh Sharma (Brother) / Self"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-700">Contact Mobile Number</Label>
                      <Input 
                        value={formData.contactNo} 
                        onChange={(e) => setFormData({ ...formData, contactNo: e.target.value })} 
                        className="mt-1.5 h-10 text-xs font-mono font-medium"
                        placeholder="+91 98765 43210"
                      />
                    </div>

                    <div className="lg:col-span-3">
                      <Label className="text-xs font-bold text-slate-700">Residential Address</Label>
                      <Input 
                        value={formData.address} 
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })} 
                        className="mt-1.5 h-10 text-xs"
                        placeholder="House / Street, Area, City, District, PIN Code"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 3: Clinical Management & Medical Assessment */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-sm border border-emerald-100">
                      3
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm sm:text-base">Clinical Management & Diagnosis</h4>
                      <p className="text-xs text-slate-500">Consultant in-charge, provisional/final diagnoses, and discharge condition</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2">
                      <Label className="text-xs font-bold text-slate-700">Consultant Incharge</Label>
                      <Input 
                        value={formData.consultantIncharge} 
                        onChange={(e) => setFormData({ ...formData, consultantIncharge: e.target.value })} 
                        className="mt-1.5 h-10 text-xs font-bold text-blue-950"
                        placeholder="Attending Senior Physician / Surgeon"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-700">Referred by</Label>
                      <Input 
                        value={formData.referredBy} 
                        onChange={(e) => setFormData({ ...formData, referredBy: e.target.value })} 
                        className="mt-1.5 h-10 text-xs"
                        placeholder="e.g. Self / OPD / Dr. Referral"
                      />
                    </div>

                    <div className="lg:col-span-3">
                      <Label className="text-xs font-bold text-slate-700">Provisional Diagnosis</Label>
                      <Textarea 
                        rows={2}
                        value={formData.provisionalDiagnosis} 
                        onChange={(e) => setFormData({ ...formData, provisionalDiagnosis: e.target.value })} 
                        className="mt-1.5 text-xs font-medium"
                        placeholder="Primary clinical impression on admission (e.g. Acute Gastritis with Dehydration, GERD Grade II)..."
                      />
                    </div>

                    <div className="lg:col-span-3">
                      <Label className="text-xs font-bold text-slate-700">Final Diagnosis</Label>
                      <Textarea 
                        rows={2}
                        value={formData.finalDiagnosis} 
                        onChange={(e) => setFormData({ ...formData, finalDiagnosis: e.target.value })} 
                        className="mt-1.5 text-xs font-medium"
                        placeholder="Confirmed post-investigation clinical diagnosis..."
                      />
                    </div>

                    <div className="lg:col-span-3">
                      <Label className="text-xs font-bold text-slate-700 mb-2 block">Admission Result / Clinical Outcome</Label>
                      <RadioGroup 
                        value={formData.result} 
                        onValueChange={(val: any) => setFormData({ ...formData, result: val })}
                        className="flex flex-wrap gap-3"
                      >
                        <div className="flex items-center space-x-2 border border-emerald-200 bg-emerald-50/50 rounded-xl px-3.5 py-2 hover:bg-emerald-50 cursor-pointer">
                          <RadioGroupItem value="Improved" id="res-improved" />
                          <Label htmlFor="res-improved" className="text-xs font-bold text-emerald-800 cursor-pointer">Improved / Cured</Label>
                        </div>
                        <div className="flex items-center space-x-2 border border-blue-200 bg-blue-50/50 rounded-xl px-3.5 py-2 hover:bg-blue-50 cursor-pointer">
                          <RadioGroupItem value="DOR" id="res-dor" />
                          <Label htmlFor="res-dor" className="text-xs font-bold text-blue-800 cursor-pointer">DOR (Discharged on Request)</Label>
                        </div>
                        <div className="flex items-center space-x-2 border border-rose-200 bg-rose-50/50 rounded-xl px-3.5 py-2 hover:bg-rose-50 cursor-pointer">
                          <RadioGroupItem value="LAMA" id="res-lama" />
                          <Label htmlFor="res-lama" className="text-xs font-bold text-rose-800 cursor-pointer">LAMA (Left Against Medical Advice)</Label>
                        </div>
                        <div className="flex items-center space-x-2 border border-amber-200 bg-amber-50/50 rounded-xl px-3.5 py-2 hover:bg-amber-50 cursor-pointer">
                          <RadioGroupItem value="Absconded" id="res-absconded" />
                          <Label htmlFor="res-absconded" className="text-xs font-bold text-amber-800 cursor-pointer">Absconded</Label>
                        </div>
                        <div className="flex items-center space-x-2 border border-slate-200 bg-slate-100 rounded-xl px-3.5 py-2 hover:bg-slate-200 cursor-pointer">
                          <RadioGroupItem value="Expired" id="res-expired" />
                          <Label htmlFor="res-expired" className="text-xs font-bold text-slate-800 cursor-pointer">Expired</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* TAB 2: LAMA / DOR Consent & Signatures */}
              <TabsContent value="lama" className="m-0 space-y-6 focus-visible:outline-none">
                
                {/* SECTION 1: Legal Warning Banner */}
                <div className="bg-white p-6 rounded-2xl border border-amber-200 shadow-xs space-y-5">
                  <div className="flex items-center justify-between border-b border-amber-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black text-sm border border-amber-200">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm sm:text-base">LAMA / DOR Consent & Statutory Legal Declaration</h4>
                        <p className="text-xs text-slate-500">Bilingual declaration for voluntary discharge / left against medical advice</p>
                      </div>
                    </div>
                    <Badge className="bg-amber-500 text-white font-bold text-[10px] px-2.5 py-1">
                      Medico-Legal Form
                    </Badge>
                  </div>

                  <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs space-y-2.5 text-slate-800">
                    <p className="font-bold text-amber-950 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-amber-700" />
                      STATUTORY DECLARATION / घोषणा (Printed on Sheet):
                    </p>
                    <div className="space-y-1.5 pl-2 border-l-2 border-amber-400">
                      <p><strong>1- Voluntary Decision / स्वैच्छिक निर्णय:</strong> I certify that I am leaving / taking the patient from {hosp.name || 'Gastro Plus Hospital'} at my own request and against medical advice.</p>
                      <p><strong>2- Explanation of Risks / जोखिमों का स्पष्टीकरण:</strong> The medical risks and severe clinical consequences associated with leaving against advice have been fully explained.</p>
                      <p><strong>3- Release of Responsibility / जिम्मेदारी से मुक्ति:</strong> I release the hospital, management and attending doctors from all legal and clinical liabilities.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                    <div>
                      <Label className="text-xs font-bold text-slate-700">Declarant / Relative Name (घोषणाकर्ता का नाम)</Label>
                      <Input 
                        value={formData.lamaPersonName} 
                        onChange={(e) => setFormData({ ...formData, lamaPersonName: e.target.value })} 
                        className="mt-1.5 h-10 text-xs font-bold"
                        placeholder="Full Name of Patient or Signatory Relative"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-slate-700">Relation with Patient (मरीज से संबंध)</Label>
                      <Input 
                        value={formData.lamaRelation} 
                        onChange={(e) => setFormData({ ...formData, lamaRelation: e.target.value })} 
                        className="mt-1.5 h-10 text-xs font-semibold"
                        placeholder="e.g. Self / Father / Wife / Son / Brother"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 2: 4-Party Signatory Blocks */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-black text-sm border border-blue-100">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm sm:text-base">Signatories & Witness Acknowledgement</h4>
                      <p className="text-xs text-slate-500">Record names, timestamps and digital/physical signature records</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Patient */}
                    <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-blue-600" /> Patient / मरीज
                        </Label>
                        <Badge variant="outline" className="text-[10px] font-bold bg-white text-slate-700">Primary Signatory</Badge>
                      </div>
                      <Input 
                        placeholder="Patient Full Name" 
                        value={formData.patientSignName} 
                        onChange={(e) => setFormData({ ...formData, patientSignName: e.target.value })} 
                        className="h-9 text-xs font-semibold bg-white"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] font-bold text-slate-500">Date</Label>
                          <Input 
                            type="date" 
                            value={formData.patientSignDate} 
                            onChange={(e) => setFormData({ ...formData, patientSignDate: e.target.value })} 
                            className="h-8 text-xs bg-white"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] font-bold text-slate-500">Time</Label>
                          <Input 
                            placeholder="Time" 
                            value={formData.patientSignTime} 
                            onChange={(e) => setFormData({ ...formData, patientSignTime: e.target.value })} 
                            className="h-8 text-xs bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Next of Kin */}
                    <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-indigo-600" /> Next-of-Kin / निकटतम संबंधी
                        </Label>
                        <Badge variant="outline" className="text-[10px] font-bold bg-white text-slate-700">Guardian / Relative</Badge>
                      </div>
                      <Input 
                        placeholder="Signatory Relative Name" 
                        value={formData.relativeSignName} 
                        onChange={(e) => setFormData({ ...formData, relativeSignName: e.target.value })} 
                        className="h-9 text-xs font-semibold bg-white"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] font-bold text-slate-500">Date</Label>
                          <Input 
                            type="date" 
                            value={formData.relativeSignDate} 
                            onChange={(e) => setFormData({ ...formData, relativeSignDate: e.target.value })} 
                            className="h-8 text-xs bg-white"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] font-bold text-slate-500">Time</Label>
                          <Input 
                            placeholder="Time" 
                            value={formData.relativeSignTime} 
                            onChange={(e) => setFormData({ ...formData, relativeSignTime: e.target.value })} 
                            className="h-8 text-xs bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Staff Witness */}
                    <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> Witness / गवाह (Staff Nurse)
                        </Label>
                        <Badge variant="outline" className="text-[10px] font-bold bg-white text-slate-700">Hospital Staff</Badge>
                      </div>
                      <Input 
                        placeholder="Staff Nurse / Duty Officer Name" 
                        value={formData.witnessSignName} 
                        onChange={(e) => setFormData({ ...formData, witnessSignName: e.target.value })} 
                        className="h-9 text-xs font-semibold bg-white"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] font-bold text-slate-500">Date</Label>
                          <Input 
                            type="date" 
                            value={formData.witnessSignDate} 
                            onChange={(e) => setFormData({ ...formData, witnessSignDate: e.target.value })} 
                            className="h-8 text-xs bg-white"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] font-bold text-slate-500">Time</Label>
                          <Input 
                            placeholder="Time" 
                            value={formData.witnessSignTime} 
                            onChange={(e) => setFormData({ ...formData, witnessSignTime: e.target.value })} 
                            className="h-8 text-xs bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Attending Doctor */}
                    <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Stethoscope className="w-3.5 h-3.5 text-emerald-600" /> Attending Doctor / चिकित्सक
                        </Label>
                        <Badge variant="outline" className="text-[10px] font-bold bg-white text-slate-700">Medical Officer</Badge>
                      </div>
                      <Input 
                        placeholder="Doctor Full Name" 
                        value={formData.doctorSignName} 
                        onChange={(e) => setFormData({ ...formData, doctorSignName: e.target.value })} 
                        className="h-9 text-xs font-semibold bg-white"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] font-bold text-slate-500">Date</Label>
                          <Input 
                            type="date" 
                            value={formData.doctorSignDate} 
                            onChange={(e) => setFormData({ ...formData, doctorSignDate: e.target.value })} 
                            className="h-8 text-xs bg-white"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] font-bold text-slate-500">Time</Label>
                          <Input 
                            placeholder="Time" 
                            value={formData.doctorSignTime} 
                            onChange={(e) => setFormData({ ...formData, doctorSignTime: e.target.value })} 
                            className="h-8 text-xs bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Label className="text-xs font-bold text-slate-700">
                      Reason the Patient is unable to sign (यदि मरीज हस्ताक्षर करने में असमर्थ है तो कारण):
                    </Label>
                    <Input 
                      value={formData.reasonUnableToSign} 
                      onChange={(e) => setFormData({ ...formData, reasonUnableToSign: e.target.value })} 
                      className="mt-1.5 h-10 text-xs"
                      placeholder="e.g. Unconscious / Altered Sensorium / Pediatric Minor / Physical Limb Disability"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* TAB 3: Print Preview */}
              <TabsContent value="preview" className="m-0 space-y-4 focus-visible:outline-none">
                
                {/* Print Control Toolbar */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                      <Printer className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">Official A4 Admission & LAMA Docket</p>
                      <p className="text-xs text-slate-500">Exact pixel layout formatted for single page A4 printing (No header/footer clipping)</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center border border-slate-200 rounded-lg p-1 bg-slate-50">
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => setZoomScale(Math.max(70, zoomScale - 10))}
                        title="Zoom Out"
                        className="h-7 w-7"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </Button>
                      <span className="text-xs font-mono font-bold px-2 text-slate-700">{zoomScale}%</span>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => setZoomScale(Math.min(130, zoomScale + 10))}
                        title="Zoom In"
                        className="h-7 w-7"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    <Button 
                      size="sm" 
                      onClick={handlePrint} 
                      className="bg-medical-blue hover:bg-blue-600 text-white font-bold gap-2 text-xs h-9 px-4 rounded-xl shadow-sm"
                    >
                      <Printer className="w-4 h-4" />
                      Print Official Sheet
                    </Button>
                  </div>
                </div>

                {/* Preview Canvas Container with Zoom Scaling */}
                <div className="bg-slate-300/80 p-6 rounded-2xl flex justify-center overflow-x-auto shadow-inner border border-slate-400/40 min-h-[500px]">
                  <div 
                    style={{ transform: `scale(${zoomScale / 100})`, transformOrigin: 'top center' }}
                    className="bg-white shadow-2xl rounded-sm p-4 w-full max-w-[780px] border border-slate-400 transition-transform duration-150"
                    dangerouslySetInnerHTML={{ __html: getAdmissionSheetHtml(formData, hosp) }}
                  />
                </div>
              </TabsContent>

            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

