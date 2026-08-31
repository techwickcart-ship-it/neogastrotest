import { storage, STORAGE_KEYS } from './storage';
import { toast } from 'sonner';

export interface WhatsAppMedicine {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  time?: string;
  timing?: string;
  instructions?: string;
  remarks?: string;
  route?: string;
}

export interface WhatsAppVitals {
  temp?: string | number;
  temperature?: string | number;
  bp?: string;
  bloodPressure?: string;
  pulse?: string | number;
  pulseRate?: string | number;
  spo2?: string | number;
  weight?: string | number;
  height?: string | number;
  bmi?: string | number;
  rr?: string | number;
  rbs?: string;
  blood_sugar?: string;
}

export interface WhatsAppPrescriptionPayload {
  patient: {
    name: string;
    mrn?: string;
    age?: number | string;
    gender?: string;
    phone?: string;
    mobile?: string;
    fatherName?: string;
  };
  prescription: {
    date?: string;
    medicines?: WhatsAppMedicine[];
    medications?: WhatsAppMedicine[];
    diagnosis?: string;
    complaints?: string;
    chiefComplaints?: string;
    advice?: string;
    notes?: string;
    investigationsAdvised?: string | string[];
    examinationFindings?: string;
    pastHistory?: string;
    followUpDate?: string;
    planSurgeryNeeded?: boolean | string;
    plannedSurgeryName?: string;
    plannedSurgeryDate?: string;
    admitNeeded?: boolean | string;
    admitReason?: string;
    vitals?: WhatsAppVitals;
  };
  doctor?: {
    name?: string;
    degree?: string;
    qualification?: string;
    specialization?: string;
    specialty?: string;
    department?: string;
    registrationNo?: string;
    regNo?: string;
    phone?: string;
  };
  hospitalInfo?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  templateType?: 'full' | 'medicines_only' | 'discharge' | 'reminder';
}

/**
 * Normalize phone number for WhatsApp wa.me / api.whatsapp.com
 * Handles Indian 10-digit numbers, removes hyphens, spaces, plus signs.
 */
export function normalizeWhatsAppPhone(rawPhone?: string, defaultCountryCode = '91'): string {
  if (!rawPhone) return '';
  let cleaned = rawPhone.replace(/[^\d+]/g, '').trim();
  
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    // 0 followed by 10 digit Indian number
    cleaned = defaultCountryCode + cleaned.substring(1);
  } else if (/^\d{10}$/.test(cleaned)) {
    // Standard 10 digit local phone
    cleaned = defaultCountryCode + cleaned;
  }
  return cleaned;
}

/**
 * Formats a clean, professional medical prescription message for WhatsApp with standard markdown.
 */
export function formatPrescriptionForWhatsApp(payload: WhatsAppPrescriptionPayload): string {
  const { patient, prescription, doctor, hospitalInfo, templateType = 'full' } = payload;

  const defaultHospital = storage.get(STORAGE_KEYS.HOSPITAL_INFO, {
    name: 'NEW GASTRO PLUS HOSPITAL',
    address: '123 Healthcare Way, Medical City',
    phone: '+91 98765 43210'
  });

  const hospName = hospitalInfo?.name || defaultHospital.name || 'NEW GASTRO PLUS HOSPITAL';
  const hospAddress = hospitalInfo?.address || defaultHospital.address || '';
  const hospPhone = hospitalInfo?.phone || defaultHospital.phone || '';

  const docName = doctor?.name || 'Attending Physician';
  const docQual = doctor?.degree || doctor?.qualification || '';
  const docDept = doctor?.specialization || doctor?.specialty || doctor?.department || 'General Medicine';
  const docReg = doctor?.registrationNo || doctor?.regNo || '';

  const rxDate = prescription.date 
    ? new Date(prescription.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const medicinesList = prescription.medicines || prescription.medications || [];

  // Parse structured advice if JSON string
  let adviceText = prescription.advice || prescription.notes || '';
  let examination = prescription.examinationFindings || '';
  let diagnosisText = prescription.diagnosis || '';
  let followUpText = prescription.followUpDate || '';
  let investigations = prescription.investigationsAdvised;

  if (typeof adviceText === 'string' && adviceText.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(adviceText);
      if (parsed && typeof parsed === 'object') {
        adviceText = parsed.advice || '';
        if (parsed.diagnosis && !diagnosisText) diagnosisText = parsed.diagnosis;
        if (parsed.examinationFindings && !examination) examination = parsed.examinationFindings;
        if (parsed.followUpDate && !followUpText) followUpText = parsed.followUpDate;
        if (parsed.investigationsAdvised && !investigations) investigations = parsed.investigationsAdvised;
      }
    } catch {
      // Keep plain text
    }
  }

  // Template: Medicines Only
  if (templateType === 'medicines_only') {
    let msg = `🏥 *${hospName.toUpperCase()}*\n`;
    msg += `💊 *MEDICATION SCHEDULE & DOSAGE GUIDE*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `👤 *Patient:* ${patient.name} (${patient.mrn || 'N/A'})\n`;
    msg += `👨‍⚕️ *Doctor:* ${docName}\n`;
    msg += `📅 *Date:* ${rxDate}\n\n`;

    if (medicinesList.length > 0) {
      msg += `*MEDICINES TO TAKE:*\n`;
      medicinesList.forEach((med, idx) => {
        msg += `\n${idx + 1}. *${med.name}*\n`;
        const details: string[] = [];
        if (med.dosage) details.push(`Dosage: ${med.dosage}`);
        if (med.frequency) details.push(`Freq: ${med.frequency}`);
        if (med.duration) details.push(`Duration: ${med.duration}`);
        if (details.length > 0) msg += `   ↳ ${details.join(' | ')}\n`;
        if (med.instructions || med.remarks) {
          msg += `   ↳ ℹ️ *Instructions:* ${med.instructions || med.remarks}\n`;
        }
      });
    } else {
      msg += `_No specific medications listed._\n`;
    }

    if (adviceText) {
      msg += `\n📋 *Diet / Advice:* ${adviceText}\n`;
    }

    msg += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
    if (hospPhone) msg += `📞 *Hospital Helpline:* ${hospPhone}\n`;
    msg += `_Please take medications strictly as advised by your doctor._`;
    return msg;
  }

  // Template: Discharge Medications
  if (templateType === 'discharge') {
    let msg = `🏥 *${hospName.toUpperCase()}*\n`;
    msg += `📋 *DISCHARGE MEDICATIONS & HOME CARE GUIDE*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `👤 *Patient:* ${patient.name}\n`;
    msg += `🆔 *MRN/UHID:* ${patient.mrn || 'N/A'}\n`;
    msg += `📅 *Discharge Date:* ${rxDate}\n`;
    msg += `👨‍⚕️ *Consultant:* ${docName} (${docDept})\n\n`;

    if (diagnosisText) {
      msg += `🩺 *Discharge Diagnosis:* ${diagnosisText}\n\n`;
    }

    if (medicinesList.length > 0) {
      msg += `💊 *TAKE-HOME MEDICINES:*\n`;
      medicinesList.forEach((med, idx) => {
        msg += `${idx + 1}. *${med.name}*\n`;
        msg += `   ↳ ${med.dosage || '1 tab'} - ${med.frequency || 'Daily'} for ${med.duration || 'As advised'}\n`;
        if (med.instructions || med.remarks) {
          msg += `   ↳ *Note:* ${med.instructions || med.remarks}\n`;
        }
      });
      msg += `\n`;
    }

    if (adviceText) {
      msg += `⚠️ *Special Precautions & Diet:*\n${adviceText}\n\n`;
    }

    if (followUpText) {
      msg += `📅 *Next Review / Follow-Up:* ${followUpText}\n\n`;
    }

    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    if (hospPhone) msg += `🚨 *24x7 Emergency Contact:* ${hospPhone}\n`;
    msg += `_Wishing you a speedy recovery!_`;
    return msg;
  }

  // Template: Full Standard Digital Prescription
  let msg = `🏥 *${hospName.toUpperCase()}*\n`;
  if (hospAddress || hospPhone) {
    const sub = [hospAddress, hospPhone ? `Tel: ${hospPhone}` : ''].filter(Boolean).join(' | ');
    msg += `${sub}\n`;
  }
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📄 *DIGITAL MEDICAL PRESCRIPTION (Rx)*\n`;
  msg += `📅 *Date:* ${rxDate}\n\n`;

  // Patient Info
  msg += `👤 *PATIENT INFORMATION*\n`;
  msg += `• *Name:* ${patient.name}\n`;
  if (patient.mrn) msg += `• *MRN / UHID:* ${patient.mrn}\n`;
  const ageGen = [patient.age ? `${patient.age}Y` : '', patient.gender].filter(Boolean).join(' / ');
  if (ageGen) msg += `• *Age / Gender:* ${ageGen}\n`;
  if (patient.phone || patient.mobile) msg += `• *Contact:* ${patient.phone || patient.mobile}\n`;
  msg += `\n`;

  // Doctor Info
  msg += `👨‍⚕️ *ATTENDING DOCTOR*\n`;
  msg += `• *${docName}* ${docQual ? `(${docQual})` : ''}\n`;
  if (docDept) msg += `• *Department:* ${docDept}\n`;
  if (docReg) msg += `• *Reg No:* ${docReg}\n`;
  msg += `\n`;

  // Clinical Summary & Vitals
  const complaints = prescription.complaints || prescription.chiefComplaints;
  const vitals = prescription.vitals;
  const hasVitals = vitals && Object.keys(vitals).some(k => Boolean((vitals as any)[k]));

  if (complaints || diagnosisText || hasVitals || examination) {
    msg += `🩺 *CLINICAL ASSESSMENT*\n`;
    if (complaints) msg += `• *Chief Complaints:* ${complaints}\n`;
    if (diagnosisText) msg += `• *Diagnosis:* ${diagnosisText}\n`;
    if (examination) msg += `• *Clinical Findings:* ${examination}\n`;

    if (hasVitals) {
      const vArr: string[] = [];
      if (vitals.bp || vitals.bloodPressure) vArr.push(`BP: ${vitals.bp || vitals.bloodPressure}`);
      if (vitals.pulse || vitals.pulseRate) vArr.push(`Pulse: ${vitals.pulse || vitals.pulseRate} bpm`);
      if (vitals.temp || vitals.temperature) vArr.push(`Temp: ${vitals.temp || vitals.temperature}°F`);
      if (vitals.spo2) vArr.push(`SpO2: ${vitals.spo2}%`);
      if (vitals.weight) vArr.push(`Wt: ${vitals.weight} kg`);
      if (vitals.rbs || vitals.blood_sugar) vArr.push(`RBS: ${vitals.rbs || vitals.blood_sugar} mg/dL`);
      if (vArr.length > 0) {
        msg += `• *Vitals:* ${vArr.join(' | ')}\n`;
      }
    }
    msg += `\n`;
  }

  // Medicines
  msg += `💊 *MEDICATIONS (Rx)*\n`;
  if (medicinesList.length > 0) {
    medicinesList.forEach((med, idx) => {
      msg += `${idx + 1}. *${med.name}*\n`;
      const dosageParts: string[] = [];
      if (med.dosage) dosageParts.push(`Dose: ${med.dosage}`);
      if (med.frequency) dosageParts.push(`Freq: ${med.frequency}`);
      if (med.duration) dosageParts.push(`Duration: ${med.duration}`);
      if (dosageParts.length > 0) {
        msg += `   ↳ ${dosageParts.join(' | ')}\n`;
      }
      if (med.instructions || med.remarks) {
        msg += `   ↳ ℹ️ ${med.instructions || med.remarks}\n`;
      }
    });
  } else {
    msg += `_No medications prescribed. General observation advised._\n`;
  }
  msg += `\n`;

  // Investigations Advised
  if (investigations) {
    let invList: string[] = [];
    if (Array.isArray(investigations)) {
      invList = investigations.map(i => typeof i === 'string' ? i : (i as any).name || JSON.stringify(i));
    } else if (typeof investigations === 'string' && investigations.trim()) {
      invList = investigations.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    }

    if (invList.length > 0) {
      msg += `🧪 *INVESTIGATIONS / LAB TESTS ADVISED*\n`;
      invList.forEach(inv => {
        msg += `• ${inv}\n`;
      });
      msg += `\n`;
    }
  }

  // Advice & Instructions
  if (adviceText) {
    msg += `📋 *ADVICE & DIETARY INSTRUCTIONS*\n`;
    msg += `${adviceText}\n\n`;
  }

  // Follow up
  if (followUpText) {
    msg += `📅 *FOLLOW-UP VISIT:* ${followUpText}\n\n`;
  }

  // Planned Surgery or Admission Alert if any
  if (prescription.planSurgeryNeeded || prescription.plannedSurgeryName) {
    msg += `🏥 *PLANNED PROCEDURE:* ${prescription.plannedSurgeryName || 'Scheduled procedure'}${prescription.plannedSurgeryDate ? ` on ${prescription.plannedSurgeryDate}` : ''}\n\n`;
  }

  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  if (hospPhone) msg += `📞 *Hospital Helpline:* ${hospPhone}\n`;
  msg += `_This is a verified digital prescription from ${hospName}._`;

  return msg;
}

/**
 * Opens WhatsApp Web or native WhatsApp App with pre-filled message
 */
export function sendWhatsAppMessage(phone: string, text: string): boolean {
  const cleanPhone = normalizeWhatsAppPhone(phone);
  const encodedText = encodeURIComponent(text);
  
  let url = '';
  if (cleanPhone) {
    url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
  } else {
    url = `https://api.whatsapp.com/send?text=${encodedText}`;
  }

  try {
    const opened = window.open(url, '_blank');
    if (!opened) {
      // Popup might be blocked, fallback to wa.me direct navigation or anchor click
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    toast.success('Opening WhatsApp with Prescription...');
    return true;
  } catch (err) {
    console.error('Error opening WhatsApp URL:', err);
    toast.error('Failed to open WhatsApp. Please check popup permissions.');
    return false;
  }
}

/**
 * Dispatches a global event to open the WhatsApp Prescription Sharing Modal
 */
export function triggerWhatsAppPrescription(payload: WhatsAppPrescriptionPayload) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('open-whatsapp-prescription', { detail: payload }));
  }
}
