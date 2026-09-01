import React, { useState, ChangeEvent, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import OPDPatientHistory from './OPDPatientHistory';
import OPDSummaryView from './OPDSummaryView';
import { 
  Search, 
  Plus, 
  Filter, 
  MoreVertical, 
  UserPlus, 
  Calendar as CalendarIcon,
  Clock,
  Printer,
  Share2,
  CheckCircle2,
  Download,
  AlertCircle,
  ArrowUpRight,
  Edit,
  Trash2,
  FileText,
  History,
  Eye,
  User,
  Loader2,
  Paintbrush,
  Eraser,
  RotateCcw,
  BookOpen,
  Save,
  Camera,
  Image as ImageIcon,
  X,
  Microscope,
  Pill,
  Hexagon,
  Square,
  Circle as CircleIcon,
  Triangle,
  MoveRight,
  Minus,
  Sparkles,
  Stethoscope,
  Layers,
  Activity,
  FileCheck,
  Zap,
  Check,
  ListPlus,
  HeartPulse,
  Scissors,
  Building2,
  Bed,
  AlertTriangle,
  Info,
  CreditCard,
  MessageSquare,
  Pencil,
  Phone,
  Mail,
  MapPin,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  RefreshCw,
  FileDown,
  ShieldAlert
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  COMMON_DISEASES, 
  isDiseaseInHistory, 
  toggleDiseaseInHistory, 
  calculateBMI, 
  drawPreaddedShapeOnCanvas 
} from '@/lib/drawingUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { MOCK_USERS } from '@/mockData';
import { formatDate, getAppointmentTimestamp, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { playNotificationSound } from '@/lib/notifications';
import { supabaseService, toDeterministicUuid, isUuid } from '@/services/supabaseService';
import { useDataSync } from '@/hooks/useDataSync';
import { canUserEditRecord, canUserEditClinicalData, canUserManageBilling, normalizeRole, canUserModifyRecord, canDoctorWritePrescription, canDoctorWriteClinicalNotes, isDoctorAssignedToPatient } from '@/utils/rbac';
import { getPrescriptionPrintHtml } from '@/lib/prescriptionPrint';
import { triggerRxPrintPreview } from '@/components/RxPrintPreviewModal';
import { triggerWhatsAppPrescription, WhatsAppPrescriptionPayload } from '@/lib/whatsappService';

const isPatientIdMatch = (id1: any, id2: any): boolean => {
  if (!id1 || !id2) return false;
  const s1 = String(id1).trim().toLowerCase();
  const s2 = String(id2).trim().toLowerCase();
  if (s1 === s2) return true;
  try {
    const u1 = toDeterministicUuid(s1).toLowerCase();
    const u2 = toDeterministicUuid(s2).toLowerCase();
    return u1 === u2;
  } catch {
    return false;
  }
};

const deserializePrescriptionAdvice = (adviceField: string) => {
  try {
    if (typeof adviceField === 'string' && adviceField.trim().startsWith('{')) {
      const data = JSON.parse(adviceField);
      if (data && typeof data === 'object') {
        return {
          advice: data.advice || '',
          generalInstructions: data.generalInstructions || '',
          examinationFindings: data.examinationFindings || '',
          pastHistory: data.pastHistory || '',
          drawing: data.drawing || '',
          diagnosis: data.diagnosis || '',
          allergies: data.allergies || '',
          complaints: data.complaints || data.chiefComplaints || '',
          investigationsAdvised: data.investigationsAdvised || data.investigations || [],
          photos: data.photos || (data.attachmentUrl && data.attachmentUrl.startsWith('data:image') ? [data.attachmentUrl] : []),
          attachmentUrl: data.attachmentUrl || '',
          attachmentName: data.attachmentName || '',
          vitals: data.vitals || null,
          planSurgeryNeeded: data.planSurgeryNeeded || false,
          plannedSurgeryName: data.plannedSurgeryName || '',
          plannedSurgeryDate: data.plannedSurgeryDate || '',
          plannedSurgeryNotes: data.plannedSurgeryNotes || '',
          admitNeeded: data.admitNeeded || 'No',
          admitReason: data.admitReason || '',
          admitWardType: data.admitWardType || ''
        };
      }
    }
  } catch (e) {
    // Falls through
  }
  return {
    advice: adviceField || '',
    generalInstructions: '',
    examinationFindings: '',
    pastHistory: '',
    drawing: '',
    diagnosis: '',
    allergies: '',
    complaints: '',
    investigationsAdvised: [],
    photos: [],
    attachmentUrl: '',
    attachmentName: '',
    vitals: null,
    planSurgeryNeeded: false,
    plannedSurgeryName: '',
    plannedSurgeryDate: '',
    plannedSurgeryNotes: '',
    admitNeeded: 'No',
    admitReason: '',
    admitWardType: ''
  };
};

const serializePrescriptionAdvice = (
  adviceText: string,
  exam: string,
  past: string,
  drawing: string,
  diagnosis: string,
  allergies: string,
  photos?: string[],
  attachmentUrl?: string,
  attachmentName?: string,
  vitals?: any,
  complaints?: string,
  investigationsAdvised?: string[] | string,
  planSurgeryNeeded?: boolean,
  plannedSurgeryName?: string,
  plannedSurgeryDate?: string,
  plannedSurgeryNotes?: string,
  admitNeeded?: string,
  admitReason?: string,
  admitWardType?: string,
  generalInstructions?: string
) => {
  return JSON.stringify({
    advice: adviceText || '',
    generalInstructions: generalInstructions || '',
    examinationFindings: exam || '',
    pastHistory: past || '',
    drawing: drawing || '',
    diagnosis: diagnosis || '',
    allergies: allergies || '',
    complaints: complaints || '',
    investigationsAdvised: investigationsAdvised || [],
    photos: photos || [],
    attachmentUrl: attachmentUrl || '',
    attachmentName: attachmentName || '',
    vitals: vitals || null,
    planSurgeryNeeded: planSurgeryNeeded || false,
    plannedSurgeryName: plannedSurgeryName || '',
    plannedSurgeryDate: plannedSurgeryDate || '',
    plannedSurgeryNotes: plannedSurgeryNotes || '',
    admitNeeded: admitNeeded || 'No',
    admitReason: admitReason || '',
    admitWardType: admitWardType || ''
  });
};

const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const safePrint = (htmlContent: string, width = 800, height = 1000) => {
  // If it is a prescription or large document, show the full Rx Print Preview Modal
  if (width >= 700 || htmlContent.includes('Prescription') || htmlContent.includes('Rx') || htmlContent.includes('Hospital')) {
    triggerRxPrintPreview(htmlContent);
    return true;
  }

  // Fallback for small slip printing (like token tickets)
  try {
    let iframe = document.getElementById('print-iframe') as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.zIndex = '-9999';
      document.body.appendChild(iframe);
    }
    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      const cleanHtml = htmlContent.replace(/window\.close\(\)/g, '');
      doc.write(cleanHtml);
      doc.close();
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (printErr) {
          console.error('Iframe print failed, falling back to popup window:', printErr);
          fallbackToPopup(htmlContent, width, height);
        }
      }, 500);
      return true;
    }
  } catch (iframeErr) {
    console.error('Hidden iframe printing setup failed, falling back to popup window:', iframeErr);
  }

  return fallbackToPopup(htmlContent, width, height);
};

const fallbackToPopup = (htmlContent: string, width = 800, height = 1000) => {
  let printWindow: Window | null = null;
  try {
    printWindow = window.open('', '_blank', `width=${width},height=${height}`);
  } catch (e) {
    console.error('Failed to open popup window for printing:', e);
  }

  if (printWindow) {
    try {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Explicitly trigger focus and print on the new window to be safe
      setTimeout(() => {
        try {
          printWindow?.focus();
          printWindow?.print();
        } catch (printErr) {
          console.error('Failed to trigger print on popup window:', printErr);
        }
      }, 500);
      return true;
    } catch (err) {
      console.error('Failed to write to print window:', err);
    }
  }

  toast.error('Printing failed. Please allow popups or open this page in a new tab.');
  return false;
};

export const COMMON_MEDICINES_CATALOG = [
  // Analgesic & Anti-inflammatory
  { name: 'Tab. Paracetamol 650mg (Dolo / Crocin)', category: 'Analgesic & Fever', dosage: '1 Tab', frequency: '1-1-1 (TDS SOS)', duration: '5 Days' },
  { name: 'Tab. Zerodol-P (Aceclofenac 100mg + Paracetamol 325mg)', category: 'Analgesic & Fever', dosage: '1 Tab', frequency: '1-0-1 (BD After Food)', duration: '5 Days' },
  { name: 'Tab. Combiflam (Ibuprofen 400mg + Paracetamol 325mg)', category: 'Analgesic & Fever', dosage: '1 Tab', frequency: '1-0-1 (BD After Food)', duration: '3 Days' },
  { name: 'Tab. Drotin-M (Drotaverine 80mg + Mefenamic Acid 250mg)', category: 'Analgesic & Fever', dosage: '1 Tab', frequency: '1-0-1 (BD SOS for Spasm)', duration: '3 Days' },
  { name: 'Inj. Dynapar AQ 1ml (Diclofenac 75mg IM/IV)', category: 'Analgesic & Fever', dosage: '1 Amp STAT', frequency: 'STAT (SOS Pain)', duration: '1 Day' },

  // Gastrointestinal / PPI / Antacid
  { name: 'Tab. Pan-D (Pantoprazole 40mg + Domperidone 30mg)', category: 'Gastrointestinal & PPI', dosage: '1 Cap', frequency: '1-0-0 (OD Before Breakfast)', duration: '7 Days' },
  { name: 'Tab. Pantocid 40mg (Pantoprazole 40mg)', category: 'Gastrointestinal & PPI', dosage: '1 Tab', frequency: '1-0-0 (OD Before Food)', duration: '14 Days' },
  { name: 'Tab. Vomikind 4mg (Ondansetron 4mg)', category: 'Gastrointestinal & PPI', dosage: '1 Tab', frequency: '1-0-1 (BD Before Food)', duration: '3 Days' },
  { name: 'Syr. Gelusil MPS 200ml (Antacid & Gas Relief)', category: 'Gastrointestinal & PPI', dosage: '10ml', frequency: '1-1-1 (TDS After Meals)', duration: '7 Days' },
  { name: 'Tab. Cyclopam (Dicyclomine 20mg + Paracetamol)', category: 'Gastrointestinal & PPI', dosage: '1 Tab', frequency: '1-0-1 (BD SOS Pain)', duration: '3 Days' },

  // Antibiotics & Anti-infectives
  { name: 'Tab. Augmentin 625mg (Amoxicillin 500mg + Clavulanic 125mg)', category: 'Antibiotics', dosage: '1 Tab', frequency: '1-0-1 (BD After Food)', duration: '5 Days' },
  { name: 'Tab. Azithral 500mg (Azithromycin 500mg)', category: 'Antibiotics', dosage: '1 Tab', frequency: '1-0-0 (OD Before Food)', duration: '3 Days' },
  { name: 'Tab. Cifran 500mg (Ciprofloxacin 500mg)', category: 'Antibiotics', dosage: '1 Tab', frequency: '1-0-1 (BD After Food)', duration: '5 Days' },
  { name: 'Tab. Taxim-O 200mg (Cefixime 200mg)', category: 'Antibiotics', dosage: '1 Tab', frequency: '1-0-1 (BD After Food)', duration: '5 Days' },
  { name: 'Tab. Metrogyl 400mg (Metronidazole 400mg)', category: 'Antibiotics', dosage: '1 Tab', frequency: '1-1-1 (TDS After Food)', duration: '5 Days' },
  { name: 'Inj. Ceftriaxone 1gm IV (Monocef)', category: 'Antibiotics', dosage: '1 Vial IV', frequency: '1-0-1 (BD IV)', duration: '3 Days' },

  // Cardiovascular & Hypertensive
  { name: 'Tab. Amlokind 5mg (Amlodipine 5mg)', category: 'Cardiovascular & HTN', dosage: '1 Tab', frequency: '1-0-0 (OD Morning)', duration: '30 Days' },
  { name: 'Tab. Telma 40mg (Telmisartan 40mg)', category: 'Cardiovascular & HTN', dosage: '1 Tab', frequency: '1-0-0 (OD Morning)', duration: '30 Days' },
  { name: 'Tab. Atorva 10mg (Atorvastatin 10mg)', category: 'Cardiovascular & HTN', dosage: '1 Tab', frequency: '0-0-1 (HS Night)', duration: '30 Days' },
  { name: 'Tab. Ecoaspirin 75mg (Aspirin 75mg)', category: 'Cardiovascular & HTN', dosage: '1 Tab', frequency: '0-1-0 (OD After Lunch)', duration: '30 Days' },

  // Antidiabetic
  { name: 'Tab. Glycomet 500mg (Metformin 500mg)', category: 'Antidiabetic', dosage: '1 Tab', frequency: '1-0-1 (BD After Meals)', duration: '30 Days' },
  { name: 'Tab. Glycomet-GP 1 (Glimepiride 1mg + Metformin 500mg)', category: 'Antidiabetic', dosage: '1 Tab', frequency: '1-0-0 (OD Before Breakfast)', duration: '30 Days' },
  { name: 'Tab. Janumet 50/500mg (Sitagliptin + Metformin)', category: 'Antidiabetic', dosage: '1 Tab', frequency: '1-0-1 (BD After Meals)', duration: '30 Days' },

  // Respiratory & Anti-allergic
  { name: 'Tab. Monticope / Levocet-M (Montelukast + Levocetirizine)', category: 'Respiratory & Allergy', dosage: '1 Tab', frequency: '0-0-1 (HS Night)', duration: '10 Days' },
  { name: 'Tab. Allegra 120mg (Fexofenadine 120mg)', category: 'Respiratory & Allergy', dosage: '1 Tab', frequency: '1-0-0 (OD Morning)', duration: '5 Days' },
  { name: 'Syr. Ascoril-LS 100ml (Cough Cough Syrup)', category: 'Respiratory & Allergy', dosage: '10ml', frequency: '1-1-1 (TDS After Meals)', duration: '5 Days' },
  { name: 'Respules Duolin (Ipratropium + Levosalbutamol)', category: 'Respiratory & Allergy', dosage: '1 Respule', frequency: 'TDS Nebulization', duration: '3 Days' },

  // Vitamins & Supplements
  { name: 'Tab. Becosules Performance (Vitamin B-Complex + C)', category: 'Vitamins & Supplements', dosage: '1 Cap', frequency: '1-0-0 (OD After Breakfast)', duration: '15 Days' },
  { name: 'Tab. Shelcal 500mg (Calcium + Vitamin D3)', category: 'Vitamins & Supplements', dosage: '1 Tab', frequency: '0-1-0 (OD After Lunch)', duration: '30 Days' },
  { name: 'Tab. Autrin / Orofer XT (Ferrous Ascorbate + Folic Acid)', category: 'Vitamins & Supplements', dosage: '1 Tab', frequency: '1-0-0 (OD After Food)', duration: '30 Days' },

  // IPD & Emergency Injections
  { name: 'IV Normal Saline 0.9% 500ml', category: 'IPD / Emergency Injections', dosage: '500ml', frequency: 'IV Slow Infusion @ 80ml/hr', duration: '1 Day' },
  { name: 'IV Ringer Lactate (RL) 500ml', category: 'IPD / Emergency Injections', dosage: '500ml', frequency: 'IV Infusion STAT', duration: '1 Day' },
  { name: 'Inj. Pantoprazole 40mg IV', category: 'IPD / Emergency Injections', dosage: '1 Vial IV', frequency: '1-0-1 (BD IV Push)', duration: '3 Days' },
  { name: 'Inj. Emeset 2ml (Ondansetron 4mg IV)', category: 'IPD / Emergency Injections', dosage: '2ml IV', frequency: '1-0-1 (BD IV Slowly)', duration: '2 Days' },
  { name: 'Inj. Hydrocortisone 100mg IV', category: 'IPD / Emergency Injections', dosage: '1 Vial', frequency: 'STAT / BD IV', duration: '2 Days' },
  { name: 'Inj. Deriphyllin 2ml IV', category: 'IPD / Emergency Injections', dosage: '2ml IV', frequency: '1-0-1 (BD IV Slow)', duration: '3 Days' }
];

const DEFAULT_PRESCRIPTION_TEMPLATES = [
  {
    id: 'tpl-gerd',
    name: 'GERD & Acid Reflux Protocol',
    diagnosis: 'Gastroesophageal Reflux Disease (GERD) with Mild Esophagitis',
    advice: '1. Avoid spicy, fried, citrus, and oily foods.\n2. Do not lie down immediately after meals; maintain an upright position for at least 2 hours.\n3. Eat smaller, more frequent meals instead of heavy ones.\n4. Avoid caffeine, carbonated drinks, and smoking.\n5. Walk for 15-20 minutes after dinner.',
    examinationFindings: 'Abdomen soft, non-distended. Mild epigastric tenderness present on deep palpation. Normal bowel sounds. No organomegaly.',
    pastHistory: 'No known allergies. History of occasional indigestion.',
    medicines: [
      { name: 'Tab. Pantoprazole 40mg', dosage: '1 tablet', frequency: 'Once daily (Before Breakfast)', duration: '14 Days' },
      { name: 'Tab. Domperidone 10mg', dosage: '1 tablet', frequency: 'Twice daily (30 mins before Lunch & Dinner)', duration: '10 Days' },
      { name: 'Syr. Sucralfate (10ml)', dosage: '2 teaspoons', frequency: 'Thrice daily (Between meals & at bedtime)', duration: '7 Days' }
    ]
  },
  {
    id: 'tpl-gastro',
    name: 'Acute Gastroenteritis / Diarrhea',
    diagnosis: 'Acute Gastroenteritis with Mild Dehydration',
    advice: '1. Maintain high fluid intake with ORS (Oral Rehydration Salts) - drink 200ml after each loose motion.\n2. Restrict diet to light, bland foods (Khichdi, Curd Rice, Banana, Apple Sauce, Toast).\n3. Avoid milk, dairy, spicy food, raw salads, and juices for 48 hours.\n4. Hand hygiene is critical: wash hands thoroughly before meals.',
    examinationFindings: 'Patient alert, mild dry tongue. Abdomen soft with diffuse mild colicky tenderness. No rigidity or guarding. Bowel sounds hyperactive.',
    pastHistory: 'No chronic illness. No drug allergies.',
    medicines: [
      { name: 'Cap. Racecadotril 100mg', dosage: '1 capsule', frequency: 'Thrice daily (Before meals)', duration: '3 Days' },
      { name: 'Tab. Ofloxacin 200mg + Ornidazole 500mg', dosage: '1 tablet', frequency: 'Twice daily (After breakfast & dinner)', duration: '5 Days' },
      { name: 'Oral Rehydration Salts (ORS)', dosage: '1 sachet in 1L water', frequency: 'On-going (Sip throughout the day)', duration: '3 Days' },
      { name: 'Tab. Zinc Sulphate 20mg', dosage: '1 tablet', frequency: 'Once daily (After lunch)', duration: '14 Days' }
    ]
  },
  {
    id: 'tpl-htn',
    name: 'Essential Hypertension Control',
    diagnosis: 'Essential Hypertension - Stage 1 (Newly Diagnosed)',
    advice: '1. Strict low-salt diet (restrict intake to less than 3 grams per day).\n2. Engage in moderate aerobic exercise (brisk walking) for at least 30-40 minutes daily.\n3. Keep a daily blood pressure record (morning and evening).\n4. Reduce stress through yoga or meditation.\n5. Avoid high-fat and cholesterol-rich food.',
    examinationFindings: 'Pulse: 76 bpm (regular, good volume). BP: 148/92 mmHg. Bilateral lungs clear. S1, S2 normal, no murmurs.',
    pastHistory: 'Father is hypertensive. No history of diabetes or asthma.',
    medicines: [
      { name: 'Tab. Telmisartan 40mg', dosage: '1 tablet', frequency: 'Once daily (After breakfast)', duration: '30 Days' },
      { name: 'Tab. Amlodipine 5mg', dosage: '1 tablet', frequency: 'Once daily (At bedtime, if BP remains > 140/90)', duration: '30 Days' }
    ]
  },
  {
    id: 'tpl-cold',
    name: 'Upper Respiratory Infection / Flu',
    diagnosis: 'Acute Upper Respiratory Tract Infection (Viral Coryza)',
    advice: '1. Do warm saline gargles 3-4 times a day.\n2. Take steam inhalation twice daily.\n3. Drink plenty of warm fluids (herbal tea, warm water, soups).\n4. Rest is recommended for optimal recovery.\n5. Avoid exposure to cold air and chilled beverages.',
    examinationFindings: 'Pharyngeal congestion present (+). Congested nasal mucosa. Chest clear with vesicular breath sounds. No wheezing/crepitations.',
    pastHistory: 'No asthma or drug allergies.',
    medicines: [
      { name: 'Tab. Paracetamol 650mg', dosage: '1 tablet', frequency: 'Thrice daily (SOS for fever or body ache)', duration: '5 Days' },
      { name: 'Tab. Montelukast 10mg + Levocetirizine 5mg', dosage: '1 tablet', frequency: 'Once daily (At Bedtime)', duration: '5 Days' },
      { name: 'Nasal Xylometazoline Drops 0.1%', dosage: '2 drops in each nostril', frequency: 'Twice daily (Maximum 5 days)', duration: '3 Days' }
    ]
  }
];

const getRelativePayload = (p: any) => {
  const r1Rel = p.relative1Relation || 'Father';
  const r1N = p.relative1Name || '';
  const r1P = p.relative1Phone || '';

  const r2Rel = p.relative2Relation || 'Mother';
  const r2N = p.relative2Name || '';
  const r2P = p.relative2Phone || '';

  let fN = p.fatherName || '';
  let fP = p.fatherPhone || '';
  let mN = p.motherName || '';
  let mP = p.motherPhone || '';
  let hN = p.husbandName || '';
  let hP = p.husbandPhone || '';

  if (r1Rel === 'Father') { fN = r1N; fP = r1P; }
  else if (r1Rel === 'Mother') { mN = r1N; mP = r1P; }
  else if (r1Rel === 'Husband') { hN = r1N; hP = r1P; }

  if (r2Rel === 'Father') { fN = r2N; fP = r2P; }
  else if (r2Rel === 'Mother') { mN = r2N; mP = r2P; }
  else if (r2Rel === 'Husband') { hN = r2N; hP = r2P; }

  const guardian = r1N ? `${r1N}${r1Rel ? ` (${r1Rel})` : ''}` : (r2N ? `${r2N}${r2Rel ? ` (${r2Rel})` : ''}` : (p.guardianName || ''));

  return {
    relative1_relation: r1Rel,
    relative1Relation: r1Rel,
    relative1_name: r1N,
    relative1Name: r1N,
    relative1_phone: r1P,
    relative1Phone: r1P,
    relative2_relation: r2Rel,
    relative2Relation: r2Rel,
    relative2_name: r2N,
    relative2Name: r2N,
    relative2_phone: r2P,
    relative2Phone: r2P,
    father_name: fN,
    fatherName: fN,
    father_phone: fP,
    fatherPhone: fP,
    mother_name: mN,
    motherName: mN,
    mother_phone: mP,
    motherPhone: mP,
    husband_name: hN,
    husbandName: hN,
    husband_phone: hP,
    husbandPhone: hP,
    guardian_name: guardian,
    guardianName: guardian,
  };
};

function getCleanAppointmentDate(raw: any): string {
  if (!raw) return '';
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    // ISO or YYYY-MM-DD format (e.g., 2026-08-16 or 2026-08-16T10:00:00Z)
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.slice(0, 10);
    }
    // DD-MM-YYYY or DD/MM/YYYY (e.g., 16-08-2026 or 16/08/2026)
    const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      return `${year}-${month}-${day}`;
    }
    // YYYY/MM/DD
    const ymdSlash = trimmed.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
    if (ymdSlash) {
      const year = ymdSlash[1];
      const month = ymdSlash[2].padStart(2, '0');
      const day = ymdSlash[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    if (trimmed.includes('T')) {
      return trimmed.split('T')[0];
    }
    if (trimmed.includes(' ')) {
      const firstPart = trimmed.split(' ')[0];
      if (/^\d{4}-\d{2}-\d{2}/.test(firstPart)) return firstPart;
    }
  }
  try {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (e) {}
  return '';
}

export const DEFAULT_HOSPITAL_DOCTORS = [
  {
    id: 'doc-1',
    name: 'Dr. Rajesh Sharma',
    role: 'DOCTOR',
    department: 'Cardiology',
    specialization: 'Cardiologist & Senior Physician',
    degree: 'MD, DM (Cardiology)',
    consultationFee: 500
  },
  {
    id: 'doc-2',
    name: 'Dr. Priya Nair',
    role: 'DOCTOR',
    department: 'General Medicine',
    specialization: 'Internal Medicine / Consultant Physician',
    degree: 'MBBS, MD (Medicine)',
    consultationFee: 400
  },
  {
    id: 'doc-3',
    name: 'Dr. Ananya Sen',
    role: 'DOCTOR',
    department: 'Pediatrics',
    specialization: 'Pediatrician & Neonatologist',
    degree: 'MD (Pediatrics), DCH',
    consultationFee: 450
  },
  {
    id: 'doc-4',
    name: 'Dr. Vikram Malhotra',
    role: 'DOCTOR',
    department: 'Orthopedics',
    specialization: 'Joint Replacement & Spine Specialist',
    degree: 'MS (Ortho), DNB',
    consultationFee: 500
  },
  {
    id: 'doc-5',
    name: 'Dr. Sunita Rao',
    role: 'DOCTOR',
    department: 'Gynecology',
    specialization: 'Obstetrics & High-Risk Pregnancy',
    degree: 'MS (OBG), FICOG',
    consultationFee: 500
  },
  {
    id: 'doc-6',
    name: 'Dr. Rameshwar Prasad',
    role: 'DOCTOR',
    department: 'Gastroenterology',
    specialization: 'Gastroenterologist & Therapeutic Endoscopist',
    degree: 'MD, DM (Gastroenterology)',
    consultationFee: 600
  },
  {
    id: 'doc-7',
    name: 'Dr. Amit Deshmukh',
    role: 'DOCTOR',
    department: 'General Surgery',
    specialization: 'Laparoscopic & General Surgeon',
    degree: 'MS (Surgery), FIAGES',
    consultationFee: 500
  },
  {
    id: 'doc-8',
    name: 'Dr. Arvind Kumar Sharma',
    role: 'DOCTOR',
    department: 'Visiting Consultant',
    specialization: 'Consultant Gastroenterologist',
    degree: 'MD, DM (Gastro)',
    consultationFee: 800
  }
];

export default function OPD() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'queue' | 'appointments' | 'patients' | 'summary'>('queue');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isAppointmentOpen, setIsAppointmentOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<any>(null);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
  const [quickEditPatient, setQuickEditPatient] = useState<any>(null);
  const [quickContactForm, setQuickContactForm] = useState({
    phone: '',
    name: '',
    email: '',
    address: '',
    age: '',
    gender: 'male',
    relative1Relation: 'Father',
    relative1Name: '',
    relative1Phone: ''
  });
  const [isSavingQuickContact, setIsSavingQuickContact] = useState(false);

  const handleOpenRegisterChange = (open: boolean) => {
    setIsRegisterOpen(open);
    if (!open) {
      setEditingPatient(null);
      setNewPatient({ 
        name: '', 
        phone: '', 
        email: '',
        age: '', 
        gender: 'male',
        address: '',
        husbandName: '',
        husbandPhone: '',
        motherName: '',
        motherPhone: '',
        fatherName: '',
        fatherPhone: '',
        bloodGroup: '',
        dob: '',
        tpaId: '',
        tpaValidity: '',
        guardianName: '',
        urgency: 'Routine',
        isReferral: false,
        referredBy: '',
        bookImmediateAppointment: false,
        appointmentDoctor: '',
        appointmentDate: getLocalDateString(),
        appointmentTime: '10:00',
        appointmentUrgency: 'Routine',
        appointmentFee: ''
      });
    }
  };

  const handleSelectDoctorForAppointment = (doctorName: string) => {
    const matchedDoc = findDoctor(doctorName);
    const resolvedName = matchedDoc?.name || doctorName;
    setNewAppointment(prev => ({ ...prev, doctor: resolvedName }));
    const fee = (matchedDoc?.consultationFee !== undefined && matchedDoc?.consultationFee !== null && !isNaN(Number(matchedDoc.consultationFee)))
      ? Number(matchedDoc.consultationFee)
      : 500;
    setSelectedApptFees(prev => ({
      ...prev,
      consult: {
        ...prev.consult,
        name: 'Doctor Consultation Fee',
        checked: true,
        amount: fee
      }
    }));
    setAppointmentFee(fee);
  };

  const handleOpenAppointmentChange = (open: boolean) => {
    setIsAppointmentOpen(open);
    if (!open) {
      setEditingAppointment(null);
      setPatientSearchTerm('');
      setNewAppointment({ 
        patientId: '', 
        doctor: '', 
        date: '', 
        time: '', 
        urgency: 'Routine',
        discountAmount: '0',
        discountGivenBy: ''
      });
    } else {
      // Auto pre-populate doctor, date, and time if empty
      const defaultDoctor = newAppointment.doctor || allDoctors[0]?.name || 'Dr. Rajesh Sharma';
      const defaultDate = newAppointment.date || getLocalDateString();
      const defaultTime = newAppointment.time || '10:00 AM';
      setNewAppointment(prev => ({
        ...prev,
        doctor: prev.doctor || defaultDoctor,
        date: prev.date || defaultDate,
        time: prev.time || defaultTime
      }));
      const matched = findDoctor(defaultDoctor);
      const fee = (matched?.consultationFee !== undefined && matched?.consultationFee !== null && !isNaN(Number(matched?.consultationFee)))
        ? Number(matched.consultationFee)
        : 500;
      setSelectedApptFees(prev => ({
        ...prev,
        reg: {
          ...prev.reg,
          name: 'OPD Follow UP Fee',
          checked: prev.reg?.checked || false,
          amount: prev.reg?.amount || 0
        },
        appt: {
          ...prev.appt,
          name: 'Appointment Fee',
          checked: prev.appt?.checked || false,
          amount: prev.appt?.amount || 0
        },
        consult: {
          ...prev.consult,
          name: 'Doctor Consultation Fee',
          checked: true,
          amount: fee
        }
      }));
      setAppointmentFee(fee);
    }
  };
  const [isTokenSuccessOpen, setIsTokenSuccessOpen] = useState(false);
  const [tokenPrintSize, setTokenPrintSize] = useState<'thermal' | 'thermal_80' | 'A5'>(() => {
    return (storage.get(STORAGE_KEYS.TOKEN_PRINT_SIZE, 'thermal') as 'thermal' | 'thermal_80' | 'A5');
  });

  const handleTokenSizeChange = (size: 'thermal' | 'thermal_80' | 'A5') => {
    setTokenPrintSize(size);
    storage.set(STORAGE_KEYS.TOKEN_PRINT_SIZE, size);
  };

  const [loading, setLoading] = useState(() => {
    const cachedPatients = storage.get(STORAGE_KEYS.PATIENTS, []);
    const cachedAppointments = storage.get(STORAGE_KEYS.APPOINTMENTS, []);
    return cachedPatients.length === 0 && cachedAppointments.length === 0;
  });
  const isInitialRef = useRef(true);
  const currentUser = storage.get(STORAGE_KEYS.SESSION_USER, null);
  const userRole = currentUser?.role;
  const isAccountant = normalizeRole(currentUser?.role) === 'ACCOUNTANT';
  const isReceptionist = normalizeRole(currentUser?.role) === 'RECEPTIONIST';
  const isDoctor = currentUser?.role?.toUpperCase() === 'DOCTOR' || currentUser?.role?.toUpperCase() === 'SURGEON';
  const isDeleteForbidden = !['ADMIN', 'SUPER_ADMIN', 'HOSPITAL_ADMIN'].includes(normalizeRole(userRole));

  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('');
  const [fromDateFilter, setFromDateFilter] = useState<string>('');
  const [toDateFilter, setToDateFilter] = useState<string>('');
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);
  const [isTableExpanded, setIsTableExpanded] = useState<boolean>(false);
  const [patientGenderFilter, setPatientGenderFilter] = useState<string>('all');
  const [patientStatusFilter, setPatientStatusFilter] = useState<string>('all');
  const [patientSortOrder, setPatientSortOrder] = useState<string>('newest');
  const [activeActionMenuPatientId, setActiveActionMenuPatientId] = useState<string | null>(null);
  const [activeActionMenuApptId, setActiveActionMenuApptId] = useState<string | null>(null);
  const [patientToDelete, setPatientToDelete] = useState<any | null>(null);
  const [apptToDelete, setApptToDelete] = useState<any | null>(null);
  const [appointmentFee, setAppointmentFee] = useState<number>(() => {
    return 500;
  }); 
  
  // Custom Fee / Charge applies checkboxes states
  const [selectedRegFees, setSelectedRegFees] = useState(() => {
    return {
      reg: { name: 'OPD Follow UP Fee', checked: false, amount: 0 },
      appt: { name: 'Appointment Fee', checked: false, amount: 0 },
      consult: { name: 'Doctor Consultation Fee', checked: false, amount: 500 }
    };
  });

  const [selectedApptFees, setSelectedApptFees] = useState(() => {
    const defaultDoctorName = 'Dr. Rajesh Sharma';
    const docObj = DEFAULT_HOSPITAL_DOCTORS.find(d => d.name === defaultDoctorName);
    const defaultFee = docObj?.consultationFee || 500;
    return {
      reg: { name: 'OPD Follow UP Fee', checked: false, amount: 0 },
      appt: { name: 'Appointment Fee', checked: false, amount: 0 },
      consult: { name: 'Doctor Consultation Fee', checked: true, amount: defaultFee }
    };
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patients, setPatients] = useState<any[]>(() => storage.get(STORAGE_KEYS.PATIENTS, []));
  const [appointments, setAppointments] = useState<any[]>(() => storage.get(STORAGE_KEYS.APPOINTMENTS, []));
  const [users, setUsers] = useState<any[]>(() => storage.get(STORAGE_KEYS.USERS, MOCK_USERS));

  // Resolved list of all available doctors (Staff + Visiting Specialists + Hospital Defaults)
  const allDoctors = useMemo(() => {
    const map = new Map<string, any>();

    const getDocKey = (name: string) => {
      return (name || '').toLowerCase().replace(/^dr\.?\s*/i, '').trim();
    };

    // 1. Hospital Defaults
    DEFAULT_HOSPITAL_DOCTORS.forEach(d => {
      const key = getDocKey(d.name);
      if (key) {
        map.set(key, { ...d });
      }
    });

    // 2. Visiting Specialists from local storage
    try {
      const visiting = storage.get(STORAGE_KEYS.VISITING_SPECIALISTS, []) || [];
      visiting.forEach((v: any) => {
        if (v.name && v.status !== 'Inactive') {
          const key = getDocKey(v.name);
          if (key) {
            const existing = map.get(key);
            map.set(key, {
              id: v.id || existing?.id || `vs-${Math.random().toString(36).substring(2, 7)}`,
              name: v.name.startsWith('Dr.') ? v.name : `Dr. ${v.name}`,
              role: 'DOCTOR',
              department: v.specialty || v.department || existing?.department || 'Visiting Consultant',
              specialization: v.specialty || v.specialization || existing?.specialization || 'Visiting Specialist',
              degree: v.qualification || v.degree || existing?.degree || '',
              consultationFee: Number(v.defaultConsultationFee || v.consultationFee) || existing?.consultationFee || 500
            });
          }
        }
      });
    } catch (e) {}

    // 3. Registered Users / Staff from Database
    const isDoctorRole = (role: string = '') => {
      const r = role.toUpperCase();
      return r.includes('DOCTOR') || r.includes('SURGEON') || r.includes('PHYSICIAN') || 
             r.includes('CONSULT') || r.includes('SPECIALIST') || r.includes('SUPER_ADMIN') || 
             r.includes('ADMIN') || r.includes('MEDICAL');
    };

    (users || []).forEach((u: any) => {
      if (!u || !u.name) return;
      const isDoc = isDoctorRole(u.role) || (u.name && u.name.toLowerCase().startsWith('dr.')) || !!u.specialization || !!u.degree;
      if (isDoc) {
        const key = getDocKey(u.name);
        if (!key) return;
        const existing = map.get(key);
        let extractedFee = existing?.consultationFee !== undefined && existing?.consultationFee !== null ? Number(existing.consultationFee) : 500;
        if (u.consultationFee !== undefined && u.consultationFee !== null && u.consultationFee !== '' && !isNaN(Number(u.consultationFee))) {
          extractedFee = Number(u.consultationFee);
        } else if (u.consultation_fee !== undefined && u.consultation_fee !== null && u.consultation_fee !== '' && !isNaN(Number(u.consultation_fee))) {
          extractedFee = Number(u.consultation_fee);
        } else if (u.fee !== undefined && u.fee !== null && u.fee !== '' && !isNaN(Number(u.fee))) {
          extractedFee = Number(u.fee);
        } else if (typeof u.degree === 'string' && u.degree.includes('[fee:')) {
          const m = u.degree.match(/\[fee:(\d+)\]/);
          if (m) extractedFee = Number(m[1]);
        }

        const validDept = u.department && !['all', 'admin', 'super admin', 'administration'].includes(u.department.toLowerCase().trim())
          ? u.department
          : (existing?.department || u.department || 'General Medicine');

        map.set(key, {
          id: u.id || existing?.id || `doc-${Date.now()}`,
          name: u.name,
          role: u.role || existing?.role || 'DOCTOR',
          department: validDept,
          specialization: u.specialization || u.specialty || existing?.specialization || 'Specialist',
          degree: u.degree || u.qualification || existing?.degree || '',
          consultationFee: extractedFee
        });
      }
    });

    return Array.from(map.values());
  }, [users]);

  const findDoctor = useCallback((nameOrId: string | null | undefined) => {
    if (!nameOrId) return null;
    const clean = String(nameOrId).toLowerCase().trim();
    const cleanWithoutDr = clean.replace(/^dr\.?\s*/i, '').trim();
    return allDoctors.find(d => {
      const dId = String(d.id || '').toLowerCase().trim();
      const dNameClean = String(d.name || '').toLowerCase().trim();
      const dNameWithoutDr = dNameClean.replace(/^dr\.?\s*/i, '').trim();
      return (
        dId === clean || 
        dNameClean === clean || 
        dNameWithoutDr === cleanWithoutDr ||
        (cleanWithoutDr.length > 2 && dNameWithoutDr.includes(cleanWithoutDr)) ||
        (cleanWithoutDr.length > 2 && cleanWithoutDr.includes(dNameWithoutDr))
      );
    }) || (users || []).find((u: any) => {
      const uId = String(u.id || '').toLowerCase().trim();
      const uNameClean = String(u.name || '').toLowerCase().trim();
      const uNameWithoutDr = uNameClean.replace(/^dr\.?\s*/i, '').trim();
      return (
        uId === clean || 
        uNameClean === clean || 
        uNameWithoutDr === cleanWithoutDr ||
        (cleanWithoutDr.length > 2 && uNameWithoutDr.includes(cleanWithoutDr)) ||
        (cleanWithoutDr.length > 2 && cleanWithoutDr.includes(uNameWithoutDr))
      );
    }) || null;
  }, [allDoctors, users]);

  const getSelectedPatient = useCallback((pid: string | undefined | null) => {
    if (!pid) return null;
    const target = String(pid).trim().toLowerCase();
    return patients.find(p => 
      isPatientIdMatch(p.id, pid) ||
      p.id === pid ||
      p.mrn === pid ||
      (p.mrn && p.mrn.toLowerCase() === target) ||
      (p.name && p.name.toLowerCase() === target)
    ) || (storage.get(STORAGE_KEYS.PATIENTS, []) || []).find((p: any) =>
      isPatientIdMatch(p.id, pid) ||
      p.id === pid ||
      p.mrn === pid ||
      (p.mrn && p.mrn.toLowerCase() === target) ||
      (p.name && p.name.toLowerCase() === target)
    ) || null;
  }, [patients]);
  const [newPatient, setNewPatient] = useState({ 
    name: '', 
    phone: '', 
    email: '',
    age: '', 
    gender: 'male',
    address: '',
    husbandName: '',
    husbandPhone: '',
    motherName: '',
    motherPhone: '',
    fatherName: '',
    fatherPhone: '',
    relative1Relation: 'Father',
    relative1Name: '',
    relative1Phone: '',
    relative2Relation: 'Mother',
    relative2Name: '',
    relative2Phone: '',
    bloodGroup: '',
    dob: '',
    tpaId: '',
    tpaValidity: '',
    guardianName: '',
    urgency: 'Routine',
    isReferral: false,
    referredBy: '',
    bookImmediateAppointment: false,
    appointmentDoctor: '',
    appointmentDate: getLocalDateString(),
    appointmentTime: '10:00',
    appointmentUrgency: 'Routine',
    appointmentFee: ''
  });
  const [newAppointment, setNewAppointment] = useState({ 
    patientId: '', 
    doctor: '', 
    date: '', 
    time: '', 
    urgency: 'Routine',
    discountAmount: '0',
    discountGivenBy: ''
  });
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [patientRecordsSearchQuery, setPatientRecordsSearchQuery] = useState('');
  const [patientsPage, setPatientsPage] = useState(1);
  const [appointmentsPage, setAppointmentsPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    setPatientsPage(1);
    setAppointmentsPage(1);
  }, [patientRecordsSearchQuery, activeTab, fromDateFilter, toDateFilter, selectedDateFilter, selectedDoctorFilter]);
  const [showPatientResults, setShowPatientResults] = useState(false);
  const [lastToken, setLastToken] = useState<{
    tokenNumber: string;
    patientName: string;
    mrn: string;
    doctor: string;
    date: string;
    fee?: number;
  } | null>(null);

  const { opdTokenMap, appointmentSeqMap } = useMemo(() => {
    const tokenMap: Record<string, number> = {};
    const seqMap: Record<string, number> = {};

    // Sort ALL appointments chronologically to determine their stable global and daily sequence.
    // We should sort them ascendingly by appointment date, then appointment time, then created_at/id.
    const sortedApts = [...appointments].sort((a, b) => {
      const dateA = a.appointment_date || a.date || '';
      const dateB = b.appointment_date || b.date || '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);

      const timeA = a.appointment_time || a.time || '';
      const timeB = b.appointment_time || b.time || '';
      
      const tA = getAppointmentTimestamp(dateA, timeA);
      const tB = getAppointmentTimestamp(dateB, timeB);
      if (tA !== tB) return tA - tB;

      const createdA = new Date(a.created_at || 0).getTime();
      const createdB = new Date(b.created_at || 0).getTime();
      if (createdA !== createdB) return createdA - createdB;

      return String(a.id || '').localeCompare(String(b.id || ''));
    });

    // 1. Group by date to determine daily sequences
    const dateGroups: Record<string, any[]> = {};
    sortedApts.forEach(apt => {
      if (apt) {
        const d = apt.appointment_date || apt.date || '';
        if (!dateGroups[d]) {
          dateGroups[d] = [];
        }
        dateGroups[d].push(apt);
      }
    });

    // 2. Assign identical daily sequence index to both seqMap and tokenMap
    Object.keys(dateGroups).forEach(d => {
      dateGroups[d].forEach((apt, idx) => {
        if (apt && apt.id) {
          const sequenceNum = idx + 1;
          tokenMap[apt.id] = sequenceNum;
          seqMap[apt.id] = sequenceNum;
        }
      });
    });

    return { opdTokenMap: tokenMap, appointmentSeqMap: seqMap };
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    return appointments
      .filter(apt => {
        const aptDate = getCleanAppointmentDate(apt.appointment_date || apt.date || apt.created_at);
        
        // Filter by Date Range if specified
        if (fromDateFilter || toDateFilter) {
          if (!aptDate) return false;
          if (fromDateFilter && aptDate < fromDateFilter) {
            return false;
          }
          if (toDateFilter && aptDate > toDateFilter) {
            return false;
          }
          return true;
        }

        if (selectedDateFilter) {
          return aptDate === selectedDateFilter;
        }

        if (activeTab === 'queue') {
          return aptDate === getLocalDateString();
        }
        return true; // Show all for 'appointments' tab
      })
      .filter(apt => {
        if (selectedDoctorFilter !== 'all') {
          const docObj = findDoctor(selectedDoctorFilter) || users.find(u => u.name === selectedDoctorFilter);
          const docId = docObj?.id;
          const filterDoc = selectedDoctorFilter.toLowerCase().trim();
          const filterDocClean = filterDoc.replace(/^dr\.?\s*/i, '');
          
          const aptDocObj = findDoctor(apt.doctor || apt.doctorName || apt.doctor_id);
          const aptDocName = (aptDocObj?.name || apt.doctor || apt.doctorName || '').toLowerCase().trim();
          const aptDocClean = aptDocName.replace(/^dr\.?\s*/i, '');

          const isMe = aptDocName === filterDoc ||
                       aptDocClean === filterDocClean ||
                       (filterDocClean.length > 2 && aptDocClean.includes(filterDocClean)) ||
                       (aptDocClean.length > 2 && filterDocClean.includes(aptDocClean)) ||
                       (docId && (apt.doctor_id === docId || apt.doctorId === docId));
          
          // Check if the patient of this appointment is assigned to this doctor
          const pId = apt.patient_id || apt.patientId;
          const patient = patients.find(p => isPatientIdMatch(p.id, pId));
          const isAssignedToMe = patient && (
            (patient.attending_doctor_id && docId && String(patient.attending_doctor_id).toLowerCase() === String(docId).toLowerCase()) ||
            (patient.attendingDoctorId && docId && String(patient.attendingDoctorId).toLowerCase() === String(docId).toLowerCase()) ||
            (patient.attending_doctor_id && String(patient.attending_doctor_id).toLowerCase().replace(/^dr\.?\s*/i, '') === filterDocClean) ||
            (patient.attendingDoctorId && String(patient.attendingDoctorId).toLowerCase().replace(/^dr\.?\s*/i, '') === filterDocClean)
          );
          
          return isMe || isAssignedToMe;
        }
        return true;
      })
      .filter(apt => {
        if (!patientRecordsSearchQuery.trim()) return true;
        const query = patientRecordsSearchQuery.toLowerCase().trim();
        const pName = (apt.patientName || apt.patient_name || apt.name || '').toLowerCase();
        const pMrn = (apt.patientMrn || apt.patient_mrn || apt.mrn || '').toLowerCase();
        const pPhone = (apt.patientPhone || apt.patient_phone || apt.phone || apt.mobile || '').toLowerCase();
        const docName = (apt.doctor || apt.doctorName || '').toLowerCase();
        const docDept = (apt.doctorDepartment || apt.department || '').toLowerCase();
        const aptId = String(apt.id || '').toLowerCase();
        const seqNo = String(appointmentSeqMap[apt.id] ? (1000 + appointmentSeqMap[apt.id]) : '');

        return pName.includes(query) ||
               pMrn.includes(query) ||
               pPhone.includes(query) ||
               docName.includes(query) ||
               docDept.includes(query) ||
               aptId.includes(query) ||
               seqNo.includes(query);
      })
      .sort((a, b) => {
        const dateA = getCleanAppointmentDate(a.appointment_date || a.date || a.created_at);
        const dateB = getCleanAppointmentDate(b.appointment_date || b.date || b.created_at);
        if (dateA !== dateB) return dateB.localeCompare(dateA);

        const timeA = a.appointment_time || a.time || '';
        const timeB = b.appointment_time || b.time || '';
        
        const tA = getAppointmentTimestamp(dateA, timeA);
        const tB = getAppointmentTimestamp(dateB, timeB);
        if (tA !== tB) return tB - tA;

        const createdA = new Date(a.created_at || 0).getTime();
        const createdB = new Date(b.created_at || 0).getTime();
        if (createdA !== createdB) return createdB - createdA;

        return String(b.id || '').localeCompare(String(a.id || ''));
      });
  }, [appointments, fromDateFilter, toDateFilter, activeTab, selectedDateFilter, selectedDoctorFilter, users, patients, patientRecordsSearchQuery, appointmentSeqMap]);

  const filteredPatients = useMemo(() => {
    return patients
      .filter(p => {
        // Doctor scoping if logged in user is a doctor
        if (currentUser && (currentUser.role?.toUpperCase() === 'DOCTOR' || currentUser.role?.toUpperCase() === 'SURGEON')) {
          const docIdStr = String(currentUser.id).toLowerCase();
          const docNameStr = String(currentUser.name || '').toLowerCase();
          
          const isAssigned = 
            (p.attending_doctor_id && String(p.attending_doctor_id).toLowerCase() === docIdStr) ||
            (p.attendingDoctorId && String(p.attendingDoctorId).toLowerCase() === docIdStr);
            
          const hasAppointment = appointments.some((apt: any) => {
            const pId = apt.patient_id || apt.patientId;
            if (pId !== p.id) return false;
            
            const aptDocId = apt.doctor_id || apt.doctorId;
            const aptDocName = apt.doctor || apt.doctorName || '';
            const aptDocNameLower = String(aptDocName).toLowerCase();
            
            return (aptDocId && String(aptDocId).toLowerCase() === docIdStr) ||
                   (aptDocName && aptDocNameLower === docNameStr) ||
                   (aptDocName && docNameStr.includes(aptDocNameLower)) ||
                   (currentUser.name && aptDocNameLower.includes(docNameStr));
          });
          
          if (!isAssigned && !hasAppointment) return false;
        }

        // Doctor Filter from UI
        if (selectedDoctorFilter !== 'all') {
          const docObj = findDoctor(selectedDoctorFilter) || users.find(u => u.name === selectedDoctorFilter);
          const docId = docObj?.id;
          const filterDoc = selectedDoctorFilter.toLowerCase().trim();
          const filterDocClean = filterDoc.replace(/^dr\.?\s*/i, '');
          const isAssignedToSelectedDoc = 
            (p.attending_doctor_id && docId && String(p.attending_doctor_id).toLowerCase() === String(docId).toLowerCase()) ||
            (p.attendingDoctorId && docId && String(p.attendingDoctorId).toLowerCase() === String(docId).toLowerCase()) ||
            (p.attending_doctor_id && String(p.attending_doctor_id).toLowerCase().replace(/^dr\.?\s*/i, '') === filterDocClean) ||
            (p.attendingDoctorId && String(p.attendingDoctorId).toLowerCase().replace(/^dr\.?\s*/i, '') === filterDocClean);

          const hasAptWithDoc = appointments.some((apt: any) => {
            const pId = apt.patient_id || apt.patientId;
            if (pId !== p.id) return false;
            const aptDocObj = findDoctor(apt.doctor || apt.doctorName || apt.doctor_id);
            const aptDoc = (aptDocObj?.name || apt.doctor || apt.doctorName || '').toLowerCase().trim();
            const aptDocClean = aptDoc.replace(/^dr\.?\s*/i, '');
            return aptDoc === filterDoc || 
                   aptDocClean === filterDocClean || 
                   (filterDocClean.length > 2 && aptDocClean.includes(filterDocClean)) ||
                   (aptDocClean.length > 2 && filterDocClean.includes(aptDocClean)) ||
                   (docId && (apt.doctor_id === docId || apt.doctorId === docId));
          });

          if (!isAssignedToSelectedDoc && !hasAptWithDoc) return false;
        }

        // Gender Filter
        if (patientGenderFilter !== 'all') {
          if ((p.gender || '').toLowerCase() !== patientGenderFilter.toLowerCase()) return false;
        }

        // Status Filter
        if (patientStatusFilter !== 'all') {
          if (patientStatusFilter === 'admitted') {
            const isAdmitted = p.needsAdmission || p.needs_admission || p.status === 'Admitting' || p.status === 'Admitted';
            if (!isAdmitted) return false;
          } else if (patientStatusFilter === 'referral') {
            const isRef = p.isReferral || p.is_referral;
            if (!isRef) return false;
          } else if (patientStatusFilter === 'opd') {
            const isAdmitted = p.needsAdmission || p.needs_admission || p.status === 'Admitting' || p.status === 'Admitted';
            if (isAdmitted) return false;
          }
        }

        // Date Range Filter
        if (fromDateFilter || toDateFilter || selectedDateFilter) {
          const pDate = getCleanAppointmentDate(p.created_at || p.registration_date || p.registered_at);
          if (selectedDateFilter && pDate !== selectedDateFilter) return false;
          if (fromDateFilter && (!pDate || pDate < fromDateFilter)) return false;
          if (toDateFilter && (!pDate || pDate > toDateFilter)) return false;
        }

        // Search Query
        if (!patientRecordsSearchQuery.trim()) return true;
        const query = patientRecordsSearchQuery.toLowerCase().trim();
        return (p.name || '').toLowerCase().includes(query) ||
               (p.mrn || '').toLowerCase().includes(query) ||
               (p.phone || '').includes(query) ||
               (p.mobile || '').includes(query) ||
               (p.contact || '').includes(query) ||
               (p.address || '').toLowerCase().includes(query) ||
               (p.city || '').toLowerCase().includes(query) ||
               (p.referredBy || p.referred_by || '').toLowerCase().includes(query);
      })
      .sort((a, b) => {
        if (patientSortOrder === 'name_asc') {
          return (a.name || '').localeCompare(b.name || '');
        } else if (patientSortOrder === 'name_desc') {
          return (b.name || '').localeCompare(a.name || '');
        } else if (patientSortOrder === 'oldest') {
          const dateA = new Date(a.created_at || a.registration_date || 0).getTime();
          const dateB = new Date(b.created_at || b.registration_date || 0).getTime();
          return dateA - dateB;
        } else {
          // newest default
          const dateA = new Date(a.created_at || a.registration_date || 0).getTime();
          const dateB = new Date(b.created_at || b.registration_date || 0).getTime();
          return dateB - dateA;
        }
      });
  }, [patients, appointments, currentUser, selectedDoctorFilter, patientGenderFilter, patientStatusFilter, fromDateFilter, toDateFilter, selectedDateFilter, patientRecordsSearchQuery, patientSortOrder, users]);

  const [isPrescriptionOpen, setIsPrescriptionOpen] = useState(false);
  const [isManageTemplatesOpen, setIsManageTemplatesOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAppointment, setPaymentAppointment] = useState<any>(null);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paymentRefNo, setPaymentRefNo] = useState('');
  const [paymentDiscount, setPaymentDiscount] = useState<number>(0);
  const [previewData, setPreviewData] = useState<{url: string, name: string} | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [mergePatientData, setMergePatientData] = useState<{ existing: any, newDetails: any, shouldRedirect?: boolean } | null>(null);
  const [duplicateConfirm, setDuplicateConfirm] = useState<{
    newPatientData: any;
    duplicatePatient: any;
    shouldRedirect?: boolean;
  } | null>(null);
  const isRegisteringRef = useRef(false);
  const isBookingRef = useRef(false);

  // Patient Clinical History states
  const [selectedPatientVitals, setSelectedPatientVitals] = useState<any[]>([]);
  const [selectedPatientNotes, setSelectedPatientNotes] = useState<any[]>([]);
  const [selectedPatientLabs, setSelectedPatientLabs] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [customTestInput, setCustomTestInput] = useState<string>('');
  const [prescription, setPrescription] = useState<any>({
    doctor: 'Dr. Rajesh Sharma',
    date: new Date().toISOString().split('T')[0],
    medicines: [{ name: '', dosage: '', frequency: '', duration: '' }],
    diagnosis: '',
    advice: '',
    generalInstructions: '',
    examinationFindings: '',
    pastHistory: '',
    allergies: '',
    complaints: '',
    investigationsAdvised: [],
    planSurgeryNeeded: false,
    plannedSurgeryName: '',
    plannedSurgeryDate: '',
    plannedSurgeryNotes: '',
    admitNeeded: 'No',
    admitReason: '',
    admitWardType: '',
    drawing: '',
    photos: [],
    attachmentUrl: '',
    attachmentName: '',
    vitals: {
      bp: '',
      pulse: '',
      temp: '',
      spo2: '',
      weight: '',
      rr: '',
      cbs: '',
      rs: '',
      cns: '',
      perAbdomen: '',
      localExam: '',
      inputOutput: ''
    }
  });

  // Common Medicines Catalog modal state
  const [isCommonMedsOpen, setIsCommonMedsOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCatalogCat, setSelectedCatalogCat] = useState('ALL');

  // Prescription Modal Right Panel active tab
  const [rxRightTab, setRxRightTab] = useState<'summary' | 'quick' | 'history' | 'preview'>('summary');

  // Canvas drawing state and references
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState<'pen' | 'eraser'>('pen');
  const [penColor, setPenColor] = useState<string>('#1d4ed8'); // Default to medical blue
  const [lineWidth, setLineWidth] = useState<number>(3);

  // Initialize and load drawing canvas if isPrescriptionOpen changes
  useEffect(() => {
    if (!isPrescriptionOpen) return;
    
    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear & set defaults
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (prescription.drawing) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
        };
        img.src = prescription.drawing;
      }
    }, 150); // Small timeout to ensure Dialog is fully rendered in DOM

    return () => clearTimeout(timer);
  }, [isPrescriptionOpen]);

  const getCoordinates = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX = 0;
    let clientY = 0;
    
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  };

  const startDrawing = (e: any) => {
    if (e.type === 'touchstart') {
      // Don't preventDefault so scrolling works on non-canvas elements, but we can prevent it inside canvas
      e.stopPropagation();
    }
    const coords = getCoordinates(e);
    if (!coords) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    
    ctx.strokeStyle = drawMode === 'eraser' ? '#ffffff' : penColor;
    ctx.lineWidth = drawMode === 'eraser' ? 12 : lineWidth;
    
    setIsDrawing(true);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    if (e.type === 'touchmove') {
      e.stopPropagation();
    }
    const coords = getCoordinates(e);
    if (!coords) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    saveCanvasToState();
  };

  const saveCanvasToState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setPrescription(prev => ({ ...prev, drawing: dataUrl }));
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setPrescription(prev => ({ ...prev, drawing: '' }));
  };

  const [savedPrescriptions, setSavedPrescriptions] = useState<any[]>(() => storage.get(STORAGE_KEYS.PRESCRIPTIONS, []));
  const [prescriptionTemplates, setPrescriptionTemplates] = useState<any[]>(() => {
    const saved = storage.get(STORAGE_KEYS.PRESCRIPTION_TEMPLATES, []);
    return saved && saved.length > 0 ? saved : DEFAULT_PRESCRIPTION_TEMPLATES;
  });

  useEffect(() => {
    const saved = storage.get(STORAGE_KEYS.PRESCRIPTION_TEMPLATES, []);
    if (!saved || saved.length === 0) {
      storage.set(STORAGE_KEYS.PRESCRIPTION_TEMPLATES, DEFAULT_PRESCRIPTION_TEMPLATES);
    }
  }, []);

  const handleLoadTemplate = (templateId: string) => {
    const tpl = prescriptionTemplates.find(t => t.id === templateId);
    if (!tpl) return;
    
    setPrescription(prev => ({
      ...prev,
      diagnosis: tpl.diagnosis || '',
      advice: tpl.advice || '',
      examinationFindings: tpl.examinationFindings || '',
      pastHistory: tpl.pastHistory || '',
      medicines: tpl.medicines && tpl.medicines.length > 0 
        ? tpl.medicines.map((m: any) => ({
            name: m.name || '',
            dosage: m.dosage || '',
            frequency: m.frequency || '',
            duration: m.duration || '',
            instructions: m.instructions || m.remarks || ''
          }))
        : [{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }]
    }));
    
    toast.success(`Prescription template "${tpl.name}" loaded successfully!`);
  };

  const handleSaveAsTemplate = (name: string) => {
    const newTpl = {
      id: `tpl-${Date.now()}`,
      name: name,
      diagnosis: prescription.diagnosis || '',
      advice: prescription.advice || '',
      examinationFindings: prescription.examinationFindings || '',
      pastHistory: prescription.pastHistory || '',
      medicines: prescription.medicines.filter(m => m.name.trim() !== '')
    };

    const updated = [...prescriptionTemplates, newTpl];
    setPrescriptionTemplates(updated);
    storage.set(STORAGE_KEYS.PRESCRIPTION_TEMPLATES, updated);
    toast.success(`Saved new template "${name}"!`);
  };

  const handleDeleteTemplate = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const updated = prescriptionTemplates.filter(t => t.id !== id);
    setPrescriptionTemplates(updated);
    storage.set(STORAGE_KEYS.PRESCRIPTION_TEMPLATES, updated);
    toast.success("Template deleted successfully.");
  };

  const [templateImage, setTemplateImage] = useState<string | null>(storage.get(STORAGE_KEYS.TEMPLATE_IMAGE, null));
  const [hospitalInfo, setHospitalInfo] = useState(storage.get(STORAGE_KEYS.HOSPITAL_INFO, {
    name: 'Gastro Plus Hospital',
    address: 'Plot No. 7 & 8, Om Shiv Nagar, Gufa Mandir Road, Lal Ghati Bhopal, 462030, Madhya Pradesh',
    phone: '9109102145/9109101246',
    email: 'gatroplusbhopal@gmail.com',
    logo: null as string | null
  }));

  const fetchData = async () => {
    if (isInitialRef.current) {
      isInitialRef.current = false;
      const cachedPatients = storage.get(STORAGE_KEYS.PATIENTS, []);
      const cachedAppointments = storage.get(STORAGE_KEYS.APPOINTMENTS, []);
      if (cachedPatients.length === 0 && cachedAppointments.length === 0) {
        setLoading(true);
      }
    }
    try {
      const [patientsData, appointmentsData, prescriptionsData, staffData] = await Promise.all([
        supabaseService.getPatients(),
        supabaseService.getAppointments(),
        supabaseService.getPrescriptions(),
        supabaseService.getStaff()
      ]);
      
      if (patientsData) setPatients(patientsData);
      if (staffData && staffData.length > 0) setUsers(staffData);
      if (appointmentsData) {
        const staffList = staffData || users || [];
        const doctorsList = staffList.filter((u: any) => u.role?.toUpperCase() === 'DOCTOR' || u.role?.toUpperCase() === 'SUPER_ADMIN' || u.role?.toUpperCase() === 'SURGEON');
        const defaultDoc = doctorsList.find((u: any) => u.role?.toUpperCase() === 'DOCTOR') || doctorsList.find((u: any) => u.name && u.name.toLowerCase().includes('dr.')) || doctorsList[0];
        const defaultDocName = defaultDoc ? defaultDoc.name : 'Dr. Rajesh Sharma';

        // Map patients data into appointments if needed, or use the joined data
        const mappedApts = (appointmentsData || [])
          .map((apt: any) => {
            const docId = apt.doctor_id || apt.doctorId;
            const doc = docId ? staffList.find((u: any) => isPatientIdMatch(u.id, docId) || (u.name && (u.name === apt.doctor || u.name === apt.doctorName))) : null;
            const pId = apt.patient_id || apt.patientId;
            const matchedPatient = patientsData ? patientsData.find((p: any) => 
              (p.name && !['walk-in patient', 'walk-in', 'unknown', ''].includes(p.name.toLowerCase().trim()) && (
                isPatientIdMatch(p.id, pId) || 
                (p.mrn && (p.mrn === apt.patientMrn || p.mrn === apt.patient_mrn || p.mrn === apt.patient_id || p.mrn === apt.patientId)) ||
                (p.name && (p.name.toLowerCase().trim() === (apt.patientName || '').toLowerCase().trim() || p.name.toLowerCase().trim() === (apt.patient_name || '').toLowerCase().trim()))
              )) || isPatientIdMatch(p.id, pId)
            ) : null;

            const isAptNameValid = apt.patientName && !['walk-in patient', 'walk-in', 'unknown', ''].includes(String(apt.patientName).toLowerCase().trim());
            const isJoinedNameValid = apt.patients?.name && !['walk-in patient', 'walk-in', 'unknown', ''].includes(String(apt.patients.name).toLowerCase().trim());
            const isMatchedNameValid = matchedPatient?.name && !['walk-in patient', 'walk-in', 'unknown', ''].includes(String(matchedPatient.name).toLowerCase().trim());

            const cleanPatName = isAptNameValid 
              ? apt.patientName 
              : (isJoinedNameValid ? apt.patients.name : (isMatchedNameValid ? matchedPatient.name : (apt.patientName || 'Walk-in Patient')));

            const isAptMrnValid = apt.patientMrn && !['n/a', 'none', '', 'null', 'undefined'].includes(String(apt.patientMrn).toLowerCase().trim());
            const isJoinedMrnValid = apt.patients?.mrn && !['n/a', 'none', '', 'null', 'undefined'].includes(String(apt.patients.mrn).toLowerCase().trim());
            const isMatchedMrnValid = matchedPatient?.mrn && !['n/a', 'none', '', 'null', 'undefined'].includes(String(matchedPatient.mrn).toLowerCase().trim());

            const cleanPatMrn = isAptMrnValid 
              ? apt.patientMrn 
              : (isJoinedMrnValid ? apt.patients.mrn : (isMatchedMrnValid ? matchedPatient.mrn : (apt.patientMrn || 'N/A')));

            const cleanDate = getCleanAppointmentDate(apt.appointment_date || apt.date || apt.created_at) || getLocalDateString();

            return {
              ...apt,
              patientId: pId,
              patientName: cleanPatName,
              patientMrn: cleanPatMrn,
              patientPhone: apt.patientPhone || apt.patient_phone || matchedPatient?.phone || '',
              patientAge: apt.patientAge || apt.age || matchedPatient?.age || '',
              patientGender: apt.patientGender || apt.gender || matchedPatient?.gender || '',
              appointment_date: cleanDate,
              appointment_time: apt.appointment_time || apt.time || '10:00 AM',
              doctor: doc ? doc.name : (apt.doctor || apt.doctorName || defaultDocName),
              doctorName: doc ? doc.name : (apt.doctorName || apt.doctor || defaultDocName)
            };
          });
        setAppointments(mappedApts);
      }
      if (prescriptionsData) {
        const mappedPrescriptions = prescriptionsData.map((rx: any) => ({
          ...rx,
          patientId: rx.patient_id || rx.patientId,
          doctor: rx.doctor_name || rx.doctor,
          date: rx.prescription_date ? rx.prescription_date.split('T')[0] : (rx.date || new Date().toISOString().split('T')[0]),
          medicines: rx.medicines || rx.medications || []
        }));
        setSavedPrescriptions(mappedPrescriptions);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useDataSync(fetchData);

  useEffect(() => {
    if (!isAppointmentOpen) {
      setPatientSearchTerm('');
      setShowPatientResults(false);
    }
  }, [isAppointmentOpen]);

  useEffect(() => {
    const current = storage.get('hms_prescriptions', null);
    if (JSON.stringify(current) !== JSON.stringify(savedPrescriptions)) {
      storage.set('hms_prescriptions', savedPrescriptions);
    }
  }, [savedPrescriptions]);

  useEffect(() => {
    const current = storage.get(STORAGE_KEYS.PATIENTS, null);
    if (JSON.stringify(current) !== JSON.stringify(patients)) {
      storage.set(STORAGE_KEYS.PATIENTS, patients);
    }
  }, [patients]);

  useEffect(() => {
    const current = storage.get(STORAGE_KEYS.APPOINTMENTS, null);
    if (JSON.stringify(current) !== JSON.stringify(appointments)) {
      storage.set(STORAGE_KEYS.APPOINTMENTS, appointments);
    }
  }, [appointments]);

  useEffect(() => {
    const handleSync = () => {
      const printSize = storage.get(STORAGE_KEYS.TOKEN_PRINT_SIZE, 'thermal') as 'thermal' | 'thermal_80' | 'A5';
      setTokenPrintSize(printSize);
      setSelectedRegFees({
        reg: { name: 'OPD Follow UP Fee', checked: false, amount: 0 },
        appt: { name: 'Appointment Fee', checked: false, amount: 0 },
        consult: { name: 'Doctor Consultation Fee', checked: false, amount: 500 }
      });
      if (!isAppointmentOpen) {
        const curDoc = newAppointment.doctor || allDoctors[0]?.name || 'Dr. Rajesh Sharma';
        const docFee = findDoctor(curDoc)?.consultationFee || 500;
        setAppointmentFee(Number(docFee));
        setSelectedApptFees({
          reg: { name: 'OPD Follow UP Fee', checked: false, amount: 0 },
          appt: { name: 'Appointment Fee', checked: false, amount: 0 },
          consult: { name: 'Doctor Consultation Fee', checked: true, amount: Number(docFee) }
        });
      }
    };
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
    };
  }, [isAppointmentOpen, allDoctors, newAppointment.doctor]);

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file: File) => {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`File ${file.name} exceeds 5MB limit`);
          return;
        }
        if (file.type === 'application/pdf') {
          const reader = new FileReader();
          reader.onloadend = () => {
            setPrescription((prev: any) => ({
              ...prev,
              attachmentUrl: reader.result as string,
              attachmentName: file.name
            }));
            toast.success('PDF document attached');
          };
          reader.readAsDataURL(file);
        } else if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            setPrescription((prev: any) => {
              const currentPhotos = prev.photos || [];
              if (currentPhotos.includes(dataUrl)) return prev;
              return {
                ...prev,
                photos: [...currentPhotos, dataUrl]
              };
            });
            toast.success(`Clinical photo attached: ${file.name}`);
          };
          reader.readAsDataURL(file);
        } else {
          toast.error('Please upload an image file (JPG, PNG, WEBP) or a PDF.');
        }
      });
    }
  };

  const removePhoto = (index: number) => {
    setPrescription((prev: any) => ({
      ...prev,
      photos: (prev.photos || []).filter((_: any, i: number) => i !== index)
    }));
    toast.info('Photo removed');
  };

  const addMedicine = () => {
    setPrescription({
      ...prescription,
      medicines: [...prescription.medicines, { name: '', dosage: '', frequency: '', duration: '', instructions: '' }]
    });
  };

  const removeMedicine = (index: number) => {
    const newMedicines = prescription.medicines.filter((_, i) => i !== index);
    setPrescription({ ...prescription, medicines: newMedicines });
  };

  const updateMedicine = (index: number, field: string, value: string) => {
    const newMedicines = prescription.medicines.map((m, i) => 
      i === index ? { ...m, [field]: value } : m
    );
    setPrescription({ ...prescription, medicines: newMedicines });
  };

  const handleAddCustomTest = () => {
    if (!customTestInput.trim()) return;
    const current = prescription.investigationsAdvised || [];
    if (!current.includes(customTestInput.trim())) {
      setPrescription({
        ...prescription,
        investigationsAdvised: [...current, customTestInput.trim()]
      });
    }
    setCustomTestInput('');
  };

  const handleSavePrescription = async () => {
    if (!selectedPatient) {
      toast.error('No patient selected. Cannot save prescription.');
      return;
    }

    if (!isReceptionist && isDoctor && !canDoctorWritePrescription(currentUser, selectedPatient, appointments, storage.get(STORAGE_KEYS.ADMISSIONS, []))) {
      const assignedDoc = selectedPatient?.attendingDoctor || selectedPatient?.attending_doctor || selectedPatient?.doctor || 'another assigned doctor';
      toast.error(`Access Restricted: Only the assigned doctor (${assignedDoc}) or an administrator can save prescriptions for this patient.`);
      return;
    }
    
    if (isReceptionist) {
      if (prescription.vitals && (
        prescription.vitals.bp ||
        prescription.vitals.pulse ||
        prescription.vitals.temp ||
        prescription.vitals.spo2 ||
        prescription.vitals.weight ||
        prescription.vitals.rr ||
        prescription.vitals.cbs ||
        prescription.vitals.rs ||
        prescription.vitals.cns ||
        prescription.vitals.perAbdomen ||
        prescription.vitals.localExam ||
        prescription.vitals.inputOutput
      )) {
        try {
          const vData = {
            patient_id: selectedPatient.id,
            bp: prescription.vitals.bp || null,
            pulse: prescription.vitals.pulse ? Number(prescription.vitals.pulse) : null,
            temp: prescription.vitals.temp ? String(prescription.vitals.temp) : null,
            spo2: prescription.vitals.spo2 ? Number(prescription.vitals.spo2) : null,
            weight: prescription.vitals.weight ? Number(prescription.vitals.weight) : null,
            rr: prescription.vitals.rr ? Number(prescription.vitals.rr) : null,
            cbs: prescription.vitals.cbs || null,
            rs: prescription.vitals.rs || null,
            cns: prescription.vitals.cns || null,
            per_abdomen: prescription.vitals.perAbdomen || null,
            perAbdomen: prescription.vitals.perAbdomen || null,
            local_exam: prescription.vitals.localExam || null,
            localExam: prescription.vitals.localExam || null,
            input_output: prescription.vitals.inputOutput || null,
            inputOutput: prescription.vitals.inputOutput || null,
            recorded_by: currentUser?.id || null,
            recorded_at: new Date().toISOString()
          };
          const savedV = await supabaseService.updateVitals(vData);
          if (savedV) {
            setSelectedPatientVitals(prev => [savedV, ...prev]);
            window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table: 'patient_vitals', action: 'insert' } }));
            toast.success(`Patient vitals updated successfully for ${selectedPatient.name}`);
            setIsPrescriptionOpen(false);
          } else {
            toast.error('Failed to save vitals');
          }
        } catch (err) {
          console.error('Failed to save vitals:', err);
          toast.error('Failed to save vitals due to an error');
        }
      } else {
        toast.error('Please enter at least one vital detail to save.');
      }
      return;
    }
    
    const serializedAdvice = serializePrescriptionAdvice(
      prescription.advice,
      prescription.examinationFindings,
      prescription.pastHistory,
      prescription.drawing,
      prescription.diagnosis,
      prescription.allergies || '',
      prescription.photos || [],
      prescription.attachmentUrl || '',
      prescription.attachmentName || '',
      prescription.vitals,
      prescription.complaints || '',
      prescription.investigationsAdvised || [],
      prescription.planSurgeryNeeded,
      prescription.plannedSurgeryName,
      prescription.plannedSurgeryDate,
      prescription.plannedSurgeryNotes,
      prescription.admitNeeded,
      prescription.admitReason,
      prescription.admitWardType,
      prescription.generalInstructions
    );

    const newPrescriptionData = {
      patient_id: selectedPatient.id,
      doctor_name: prescription.doctor,
      prescription_date: prescription.date,
      medicines: prescription.medicines,
      diagnosis: prescription.diagnosis,
      advice: serializedAdvice,
      attachment_url: prescription.attachmentUrl,
      attachment_name: prescription.attachmentName
    };

    const saved = await supabaseService.createPrescription(newPrescriptionData);
    if (saved) {
      const mappedSaved = {
        ...saved,
        patientId: saved.patient_id || saved.patientId,
        doctor: saved.doctor_name || saved.doctor,
        date: saved.prescription_date ? saved.prescription_date.split('T')[0] : (saved.date || new Date().toISOString().split('T')[0]),
        medicines: saved.medicines || saved.medications || []
      };

      // Process referred lab & radiological tests if any
      if (Array.isArray(prescription.investigationsAdvised) && prescription.investigationsAdvised.length > 0) {
        let createdCount = 0;
        for (const testName of prescription.investigationsAdvised) {
          if (testName && typeof testName === 'string' && testName.trim()) {
            try {
              await supabaseService.createLabTestRequest({
                patient_id: selectedPatient.id,
                test_name: testName.trim(),
                requested_by: currentUser?.id || null,
                status: 'Referred',
                urgency: 'Routine',
                clinical_notes: `OPD Referral by ${prescription.doctor || 'Doctor'}`
              });
              createdCount++;
            } catch (err) {
              console.warn('Error creating referred lab test:', err);
            }
          }
        }
        if (createdCount > 0) {
          toast.success(`Created ${createdCount} Lab / Radiology referral order(s) for ${selectedPatient.name}`);
          window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table: 'test_requests', action: 'insert' } }));
        }
      }
      
      // Auto-save entered/edited vitals if any vital value is provided
      if (prescription.vitals && (
        prescription.vitals.bp ||
        prescription.vitals.pulse ||
        prescription.vitals.temp ||
        prescription.vitals.spo2 ||
        prescription.vitals.weight ||
        prescription.vitals.rr ||
        prescription.vitals.cbs ||
        prescription.vitals.rs ||
        prescription.vitals.cns ||
        prescription.vitals.perAbdomen ||
        prescription.vitals.localExam ||
        prescription.vitals.inputOutput
      )) {
        try {
          const vData = {
            patient_id: selectedPatient.id,
            bp: prescription.vitals.bp || null,
            pulse: prescription.vitals.pulse ? Number(prescription.vitals.pulse) : null,
            temp: prescription.vitals.temp ? String(prescription.vitals.temp) : null,
            spo2: prescription.vitals.spo2 ? Number(prescription.vitals.spo2) : null,
            weight: prescription.vitals.weight ? Number(prescription.vitals.weight) : null,
            rr: prescription.vitals.rr ? Number(prescription.vitals.rr) : null,
            cbs: prescription.vitals.cbs || null,
            rs: prescription.vitals.rs || null,
            cns: prescription.vitals.cns || null,
            per_abdomen: prescription.vitals.perAbdomen || null,
            perAbdomen: prescription.vitals.perAbdomen || null,
            local_exam: prescription.vitals.localExam || null,
            localExam: prescription.vitals.localExam || null,
            input_output: prescription.vitals.inputOutput || null,
            inputOutput: prescription.vitals.inputOutput || null,
            recorded_by: currentUser?.id || null,
            recorded_at: new Date().toISOString()
          };
          const savedV = await supabaseService.updateVitals(vData);
          if (savedV) {
            setSelectedPatientVitals(prev => [savedV, ...prev]);
            window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table: 'patient_vitals', action: 'insert' } }));
          }
        } catch (err) {
          console.error('Failed to auto-save vitals from prescription:', err);
        }
      }

      const updatedPrescriptions = [mappedSaved, ...savedPrescriptions.filter(s => s.id !== mappedSaved.id)];
      setSavedPrescriptions(updatedPrescriptions);
      storage.set(STORAGE_KEYS.PRESCRIPTIONS, updatedPrescriptions);
      toast.success(`Prescription saved for ${selectedPatient.name}`);
      setIsPrescriptionOpen(false);
      // Reset form dynamically using the prefetched doctor
      const initialDoc = getPrefetchedDoctorName(selectedPatient);

      setPrescription({
        doctor: initialDoc,
        date: new Date().toISOString().split('T')[0],
        medicines: [{ name: '', dosage: '', frequency: '', duration: '' }],
        diagnosis: '',
        advice: '',
        examinationFindings: '',
        pastHistory: '',
        allergies: '',
        complaints: '',
        investigationsAdvised: [],
        drawing: '',
        photos: [],
        attachmentUrl: '',
        attachmentName: '',
        vitals: {
          bp: '',
          pulse: '',
          temp: '',
          spo2: '',
          weight: '',
          rr: '',
          cbs: '',
          rs: '',
          cns: ''
        }
      });
    } else {
      toast.error('Failed to save prescription to database');
    }
  };

  const getPrefetchedDoctorName = (patient: any) => {
    if (!patient) return 'Dr. Rajesh Sharma';
    
    // 1. Look for active appointment for this patient (not cancelled status)
    const patientApts = appointments.filter((apt: any) => 
      (isPatientIdMatch(apt.patientId, patient.id) || 
       isPatientIdMatch(apt.patient_id, patient.id) ||
       (patient.mrn && patient.mrn === apt.patientMrn) ||
       (patient.name && patient.name.toLowerCase().trim() === (apt.patientName || '').toLowerCase().trim())) && 
      apt.status !== 'Cancelled'
    );
    
    if (patientApts.length > 0) {
      // Sort by date, prioritize today's appointments, otherwise newest first
      const todayStr = new Date().toISOString().split('T')[0];
      const sortedApts = [...patientApts].sort((a: any, b: any) => {
        const dateA = a.appointment_date || '';
        const dateB = b.appointment_date || '';
        if (dateA === todayStr && dateB !== todayStr) return -1;
        if (dateB === todayStr && dateA !== todayStr) return 1;
        return dateB.localeCompare(dateA);
      });
      const latestApt = sortedApts[0];
      const docName = latestApt.doctorName || latestApt.doctor;
      if (docName) {
        return docName;
      }
    }

    // 2. Fallback to currently logged-in Doctor/Admin
    const activeDocs = users.filter((u: any) => 
      u.role?.toUpperCase() === 'DOCTOR' || 
      u.role?.toUpperCase() === 'SUPER_ADMIN' || 
      u.role?.toUpperCase() === 'SURGEON'
    );
    
    if (currentUser?.role === 'DOCTOR' || currentUser?.role === 'SUPER_ADMIN') {
      const foundSelf = activeDocs.find(d => d.name === currentUser.name);
      if (foundSelf) return foundSelf.name;
    }

    // 3. Fallback to default/first doctor in directory
    if (activeDocs.length > 0) {
      const defaultDoc = activeDocs.find((u: any) => u.role?.toUpperCase() === 'DOCTOR') || 
                          activeDocs.find((u: any) => u.name && u.name.toLowerCase().includes('dr.')) || 
                          activeDocs[0];
      return defaultDoc.name;
    }

    return 'Dr. Rajesh Sharma';
  };

  const openPrescriptionModal = (patient: any) => {
    if (isDoctor && !canDoctorWritePrescription(currentUser, patient, appointments, storage.get(STORAGE_KEYS.ADMISSIONS, []))) {
      const assignedDoc = patient.attendingDoctor || patient.attending_doctor || patient.doctor || 'another assigned doctor';
      toast.error(`Access Restricted: You are not assigned to patient ${patient.name}. Only the assigned doctor (${assignedDoc}) or an administrator can write prescriptions.`);
      return;
    }

    setSelectedPatient(patient);
    loadPatientHistory(patient.id);
    
    const initialDoc = getPrefetchedDoctorName(patient);

    const existingRx = savedPrescriptions
      .filter(rx => {
        const rxPatId = rx.patientId || rx.patient_id;
        const rxPatName = rx.patient_name || rx.patientName || rx.patients?.name;
        const rxPatMrn = rx.patient_mrn || rx.patientMrn || rx.patients?.mrn;
        
        return isPatientIdMatch(rxPatId, patient.id) || 
          (rxPatName && patient.name && rxPatName.toLowerCase().trim() === patient.name.toLowerCase().trim()) ||
          (rxPatMrn && patient.mrn && rxPatMrn.toLowerCase().trim() === patient.mrn.toLowerCase().trim());
      })
      .sort((a, b) => new Date(b.date || b.prescription_date || 0).getTime() - new Date(a.date || a.prescription_date || 0).getTime())[0];

    if (existingRx) {
      const unpacked = deserializePrescriptionAdvice(existingRx.advice || existingRx.notes || '');
      setPrescription({
        id: existingRx.id,
        doctor: existingRx.doctor || existingRx.doctor_name || initialDoc,
        date: existingRx.date || existingRx.prescription_date || new Date().toISOString().split('T')[0],
        medicines: existingRx.medicines && existingRx.medicines.length > 0 ? existingRx.medicines : [{ name: '', dosage: '', frequency: '', duration: '' }],
        diagnosis: existingRx.diagnosis || unpacked.diagnosis || '',
        advice: unpacked.advice,
        generalInstructions: unpacked.generalInstructions || '',
        examinationFindings: unpacked.examinationFindings,
        pastHistory: unpacked.pastHistory,
        allergies: unpacked.allergies || '',
        complaints: unpacked.complaints || patient.complaints || patient.presentingComplaints || '',
        investigationsAdvised: unpacked.investigationsAdvised || [],
        planSurgeryNeeded: unpacked.planSurgeryNeeded || false,
        plannedSurgeryName: unpacked.plannedSurgeryName || '',
        plannedSurgeryDate: unpacked.plannedSurgeryDate || '',
        plannedSurgeryNotes: unpacked.plannedSurgeryNotes || '',
        admitNeeded: unpacked.admitNeeded || 'No',
        admitReason: unpacked.admitReason || '',
        admitWardType: unpacked.admitWardType || '',
        drawing: unpacked.drawing,
        attachmentUrl: existingRx.attachmentUrl || '',
        attachmentName: existingRx.attachmentName || '',
        vitals: existingRx.vitals || unpacked.vitals || {
          bp: '',
          pulse: '',
          temp: '',
          spo2: '',
          weight: '',
          rr: '',
          cbs: '',
          rs: '',
          cns: '',
          perAbdomen: '',
          localExam: '',
          inputOutput: ''
        }
      });
    } else {
      setPrescription({
        doctor: initialDoc,
        date: new Date().toISOString().split('T')[0],
        medicines: [{ name: '', dosage: '', frequency: '', duration: '' }],
        diagnosis: '',
        advice: '',
        examinationFindings: '',
        pastHistory: '',
        allergies: '',
        complaints: patient.complaints || patient.presentingComplaints || '',
        investigationsAdvised: [],
        drawing: '',
        attachmentUrl: '',
        attachmentName: '',
        vitals: {
          bp: '',
          pulse: '',
          temp: '',
          spo2: '',
          weight: '',
          rr: '',
          cbs: '',
          rs: '',
          cns: '',
          perAbdomen: '',
          localExam: '',
          inputOutput: ''
        }
      });
    }
    
    setIsPrescriptionOpen(true);
  };

  const printPrescription = () => {
    if (!selectedPatient) return;

    const doctor = findDoctor(prescription.doctor) || users.find(u => u.name === prescription.doctor);
    const latestVitals = selectedPatientVitals && selectedPatientVitals.length > 0 ? selectedPatientVitals[0] : undefined;

    // Combine latest recorded patient vitals and prescription-specific vitals
    const activeVitals = {
      ...(latestVitals || {}),
      ...(prescription.vitals || {})
    };

    const html = getPrescriptionPrintHtml(
      {
        name: selectedPatient.name,
        age: selectedPatient.age,
        gender: selectedPatient.gender,
        mrn: selectedPatient.mrn,
        phone: selectedPatient.phone || selectedPatient.mobile || '',
        fatherName: selectedPatient.fatherName || selectedPatient.father_name || '',
        allergies: selectedPatient.allergies || (selectedPatient as any).known_allergies || (selectedPatient as any).allergies_list,
        pastHistory: prescription.pastHistory || selectedPatient.pastHistory || (selectedPatient as any).medical_history || (selectedPatient as any).past_history || (selectedPatient as any).history,
        medicalHistory: selectedPatient.medicalHistory,
        complaints: prescription.complaints || (selectedPatient as any).complaints || (selectedPatient as any).presentingComplaints
      },
      {
        date: prescription.date,
        medicines: prescription.medicines,
        advice: prescription.advice,
        examinationFindings: prescription.examinationFindings,
        pastHistory: prescription.pastHistory,
        allergies: prescription.allergies,
        complaints: prescription.complaints,
        investigationsAdvised: prescription.investigationsAdvised,
        drawing: prescription.drawing,
        diagnosis: prescription.diagnosis,
        photos: prescription.photos || [],
        attachmentUrl: prescription.attachmentUrl,
        attachmentName: prescription.attachmentName,
        vitals: activeVitals,
        planSurgeryNeeded: prescription.planSurgeryNeeded,
        plannedSurgeryName: prescription.plannedSurgeryName,
        plannedSurgeryDate: prescription.plannedSurgeryDate,
        plannedSurgeryNotes: prescription.plannedSurgeryNotes,
        admitNeeded: prescription.admitNeeded,
        admitReason: prescription.admitReason,
        admitWardType: prescription.admitWardType,
        generalInstructions: prescription.generalInstructions,
        followUpDate: prescription.followUpDate
      },
      doctor,
      hospitalInfo
    );

    safePrint(html, 800, 1000);
  };

  const loadPatientHistory = async (patientId: string) => {
    if (!patientId) return;
    setLoadingHistory(true);
    try {
      const [vts, nts, labs] = await Promise.all([
        supabaseService.getPatientVitals(patientId),
        supabaseService.getClinicalNotes(patientId),
        supabaseService.getLabTestRequests()
      ]);
      
      if (vts) {
        setSelectedPatientVitals(vts);
        if (vts.length > 0) {
          const latest = vts[0];
          setPrescription((prev: any) => ({
            ...prev,
            vitals: {
              bp: latest.bp || '',
              pulse: latest.pulse || '',
              temp: latest.temp || '',
              spo2: latest.spo2 || '',
              weight: latest.weight || '',
              rr: latest.rr || latest.respiration || ''
            }
          }));
        }
      } else {
        setSelectedPatientVitals([]);
      }
      
      if (nts) {
        setSelectedPatientNotes(nts);
      } else {
        setSelectedPatientNotes([]);
      }
      
      if (labs) {
        const filteredLabs = labs.filter((l: any) => l.patient_id === patientId || l.patientId === patientId);
        setSelectedPatientLabs(filteredLabs);
      } else {
        setSelectedPatientLabs([]);
      }
    } catch (err) {
      console.warn('Error loading patient legacy history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const calculateAge = (dob: string) => {
    if (!dob) return '';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age.toString();
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'Emergency': return 'bg-rose-500 text-white';
      case 'Urgent': return 'bg-amber-500 text-white';
      case 'Follow up':
      case 'Follow-up':
      case 'Follow Up': return 'bg-blue-600 text-white';
      case 'Routine': return 'bg-emerald-500 text-white';
      default: return 'bg-slate-400 text-white';
    }
  };

  const startEditPatient = (patient: any) => {
    if (!patient) return;
    setEditingPatient(patient);
    const r1Rel = patient.relative1_relation || patient.relative1Relation || (patient.fatherName || patient.father_name ? 'Father' : (patient.husbandName || patient.husband_name ? 'Husband' : (patient.guardianName || patient.guardian_name ? 'Others' : 'Father')));
    const r1N = patient.relative1_name || patient.relative1Name || patient.fatherName || patient.father_name || patient.husbandName || patient.husband_name || patient.guardianName || patient.guardian_name || '';
    const r1P = patient.relative1_phone || patient.relative1Phone || patient.fatherPhone || patient.father_phone || patient.husbandPhone || patient.husband_phone || '';

    const r2Rel = patient.relative2_relation || patient.relative2Relation || (patient.motherName || patient.mother_name ? 'Mother' : 'Mother');
    const r2N = patient.relative2_name || patient.relative2Name || patient.motherName || patient.mother_name || '';
    const r2P = patient.relative2_phone || patient.relative2Phone || patient.motherPhone || patient.mother_phone || '';

    setNewPatient({
      name: patient.name || '',
      phone: patient.phone || patient.mobile || patient.contact || patient.phone_number || patient.phoneNumber || '',
      email: patient.email || '',
      age: patient.age ? String(patient.age) : '',
      gender: patient.gender || 'male',
      address: patient.address || '',
      husbandName: patient.husband_name || patient.husbandName || '',
      husbandPhone: patient.husband_phone || patient.husbandPhone || '',
      motherName: patient.mother_name || patient.motherName || '',
      motherPhone: patient.mother_phone || patient.motherPhone || '',
      fatherName: patient.father_name || patient.fatherName || '',
      fatherPhone: patient.father_phone || patient.fatherPhone || '',
      relative1Relation: r1Rel,
      relative1Name: r1N,
      relative1Phone: r1P,
      relative2Relation: r2Rel,
      relative2Name: r2N,
      relative2Phone: r2P,
      bloodGroup: patient.blood_group || patient.bloodGroup || '',
      dob: patient.dob || '',
      tpaId: patient.tpa_id || patient.tpaId || '',
      tpaValidity: patient.tpa_validity || patient.tpaValidity || '',
      guardianName: patient.guardian_name || patient.guardianName || '',
      urgency: patient.urgency || 'Routine',
      isReferral: patient.is_referral || patient.isReferral || false,
      referredBy: patient.referred_by || patient.referredBy || ''
    });
    setIsRegisterOpen(true);
  };

  const openQuickContactEdit = (patient: any) => {
    if (!patient) return;
    setQuickEditPatient(patient);
    const r1Rel = patient.relative1_relation || patient.relative1Relation || (patient.fatherName || patient.father_name ? 'Father' : (patient.husbandName || patient.husband_name ? 'Husband' : 'Father'));
    const r1N = patient.relative1_name || patient.relative1Name || patient.fatherName || patient.father_name || patient.husbandName || patient.husband_name || '';
    const r1P = patient.relative1_phone || patient.relative1Phone || patient.fatherPhone || patient.father_phone || patient.husbandPhone || patient.husband_phone || '';

    setQuickContactForm({
      phone: patient.phone || patient.mobile || patient.contact || patient.phone_number || patient.phoneNumber || '',
      name: patient.name || '',
      email: patient.email || '',
      address: patient.address || '',
      age: patient.age ? String(patient.age) : '',
      gender: patient.gender || 'male',
      relative1Relation: r1Rel,
      relative1Name: r1N,
      relative1Phone: r1P
    });
  };

  const handleSaveQuickContact = async () => {
    if (!quickEditPatient) return;
    setIsSavingQuickContact(true);
    try {
      const cleanPhone = (quickContactForm.phone || '').trim();
      const payload: any = {
        phone: cleanPhone,
        mobile: cleanPhone,
        contact: cleanPhone,
        phone_number: cleanPhone,
        phoneNumber: cleanPhone,
        name: quickContactForm.name.trim() || quickEditPatient.name,
        email: quickContactForm.email ? quickContactForm.email.trim() : null,
        address: quickContactForm.address || '',
        relative1_relation: quickContactForm.relative1Relation,
        relative1_name: quickContactForm.relative1Name || '',
        relative1_phone: quickContactForm.relative1Phone || '',
        age: quickContactForm.age ? Number(quickContactForm.age) : quickEditPatient.age,
        gender: quickContactForm.gender || quickEditPatient.gender || 'male'
      };

      const res = await supabaseService.updatePatient(quickEditPatient.id, payload);
      const updatedPatients = patients.map((p: any) => 
        (p.id === quickEditPatient.id || isPatientIdMatch(p.id, quickEditPatient.id) || (p.mrn && quickEditPatient.mrn && p.mrn === quickEditPatient.mrn))
          ? { ...p, ...payload, ...(res || {}) }
          : p
      );
      setPatients(updatedPatients);
      storage.set(STORAGE_KEYS.PATIENTS, updatedPatients);

      // Sync appointments with new phone/name
      const currentApts = storage.get(STORAGE_KEYS.APPOINTMENTS, []) || [];
      const updatedApts = currentApts.map((a: any) => {
        if (isPatientIdMatch(a.patient_id, quickEditPatient.id) || isPatientIdMatch(a.patientId, quickEditPatient.id) || (a.patientMrn && quickEditPatient.mrn && a.patientMrn === quickEditPatient.mrn)) {
          return {
            ...a,
            patientName: payload.name || a.patientName,
            patientPhone: cleanPhone || a.patientPhone
          };
        }
        return a;
      });
      setAppointments(updatedApts);
      storage.set(STORAGE_KEYS.APPOINTMENTS, updatedApts);

      window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table: 'patients', action: 'update' } }));
      window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table: 'appointments', action: 'update' } }));

      toast.success(`Patient record & phone number updated for ${payload.name}`);
      setQuickEditPatient(null);
    } catch (err: any) {
      console.error('Error updating patient contact:', err);
      toast.error('Failed to update patient contact details');
    } finally {
      setIsSavingQuickContact(false);
    }
  };

  const startEditAppointment = (apt: any) => {
    if (!canUserModifyRecord(apt, currentUser, users)) {
      toast.error("Access Denied: This appointment record was created by an Admin and cannot be modified by non-admin users.");
      return;
    }
    setEditingAppointment(apt);
    const patObj = patients.find(p => isPatientIdMatch(p.id, apt.patient_id) || isPatientIdMatch(p.id, apt.patientId));
    setPatientSearchTerm(patObj?.name || apt.patientName || '');
    const matchedDoc = findDoctor(apt.doctor || apt.doctorName || apt.doctor_id);
    const docName = matchedDoc?.name || apt.doctor || apt.doctorName || 'Dr. Rajesh Sharma';
    const aptFee = (apt.fee !== undefined && apt.fee !== null && !isNaN(Number(apt.fee))) 
      ? Number(apt.fee) 
      : (matchedDoc?.consultationFee !== undefined && matchedDoc?.consultationFee !== null ? Number(matchedDoc.consultationFee) : 500);
    setSelectedApptFees({
      reg: { name: 'OPD Follow UP Fee', checked: false, amount: 0 },
      appt: { name: 'Appointment Fee', checked: false, amount: 0 },
      consult: { name: 'Doctor Consultation Fee', checked: true, amount: aptFee }
    });
    setAppointmentFee(aptFee);
    setNewAppointment({
      patientId: apt.patient_id || apt.patientId || '',
      doctor: docName,
      date: apt.appointment_date ? apt.appointment_date.split('T')[0] : (apt.date || ''),
      time: apt.appointment_time || apt.time || '',
      urgency: apt.urgency || 'Routine',
      discountAmount: String(apt.discount_amount || apt.discountAmount || 0),
      discountGivenBy: apt.discount_given_by || apt.discountGivenBy || ''
    });
    setIsAppointmentOpen(true);
  };

  const startBookAppointmentForPatient = (patient: any) => {
    setEditingAppointment(null);
    const defaultDoctorName = allDoctors[0]?.name || 'Dr. Rajesh Sharma';
    const defaultDocObj = findDoctor(defaultDoctorName);
    const fee = (defaultDocObj?.consultationFee !== undefined && defaultDocObj?.consultationFee !== null && !isNaN(Number(defaultDocObj.consultationFee)))
      ? Number(defaultDocObj.consultationFee)
      : 500;
    setSelectedApptFees({
      reg: { name: 'OPD Follow UP Fee', checked: false, amount: 0 },
      appt: { name: 'Appointment Fee', checked: false, amount: 0 },
      consult: {
        name: 'Doctor Consultation Fee',
        checked: true,
        amount: fee
      }
    });
    setAppointmentFee(fee);
    setNewAppointment({
      patientId: patient.id,
      doctor: defaultDoctorName,
      date: getLocalDateString(),
      time: '10:00 AM',
      urgency: 'Routine',
      discountAmount: '0',
      discountGivenBy: ''
    });
    setPatientSearchTerm(patient.name);
    setShowPatientResults(false);
    setIsAppointmentOpen(true);
    setActiveTab('appointments');
  };

  const confirmMergeAndContinue = async () => {
    if (!mergePatientData) return;
    const { existing, newDetails, shouldRedirect } = mergePatientData;
    setMergePatientData(null);
    setIsSubmitting(true);
    try {
      const mergedData = {
        name: existing.name,
        phone: existing.phone,
        email: newDetails.email || existing.email,
        dob: newDetails.dob || existing.dob,
        age: newDetails.age ? Number(newDetails.age) : existing.age,
        gender: newDetails.gender || existing.gender,
        blood_group: newDetails.bloodGroup || newDetails.blood_group || existing.blood_group || existing.bloodGroup,
        address: newDetails.address || existing.address,
        guardian_name: newDetails.guardianName || newDetails.guardian_name || existing.guardian_name || existing.guardianName,
        father_name: newDetails.fatherName || newDetails.father_name || existing.father_name || existing.fatherName,
        father_phone: newDetails.fatherPhone || newDetails.father_phone || existing.father_phone || existing.fatherPhone,
        mother_name: newDetails.motherName || newDetails.mother_name || existing.mother_name || existing.motherName,
        mother_phone: newDetails.motherPhone || newDetails.mother_phone || existing.mother_phone || existing.motherPhone,
        husband_name: newDetails.husbandName || newDetails.husband_name || existing.husband_name || existing.husbandName,
        husband_phone: newDetails.husbandPhone || newDetails.husband_phone || existing.husband_phone || existing.husbandPhone,
        tpa_id: newDetails.tpaId || newDetails.tpa_id || existing.tpa_id || existing.tpaId,
        tpa_validity: newDetails.tpaValidity || newDetails.tpa_validity || existing.tpa_validity || existing.tpaValidity,
        urgency: newDetails.urgency || existing.urgency
      };

      const result = await supabaseService.updatePatient(existing.id, mergedData);
      if (result) {
        const updatedPatientsList = patients.map(p => p.id === existing.id ? { ...p, ...result } : p);
        setPatients(updatedPatientsList);
        storage.set(STORAGE_KEYS.PATIENTS, updatedPatientsList);
        toast.success(`Patient record found and merged successfully! MRN: ${existing.mrn}`);
        
        const tokenNumber = `#${Math.floor(Math.random() * 900) + 100}`;
        setLastToken({
          tokenNumber,
          patientName: existing.name,
          mrn: existing.mrn,
          doctor: "Reception Counter", 
          date: new Date().toLocaleString(),
          fee: 0
        });

        setIsRegisterOpen(false);
        if (!shouldRedirect) {
          setIsTokenSuccessOpen(true);
          setActiveTab('patients');
          setPatientRecordsSearchQuery(existing.name);
        }
        playNotificationSound();

        // Reset form
        setNewPatient({ 
          name: '', 
          phone: '', 
          email: '',
          age: '', 
          gender: 'male',
          address: '',
          husbandName: '',
          husbandPhone: '',
          motherName: '',
          motherPhone: '',
          fatherName: '',
          fatherPhone: '',
          bloodGroup: '',
          dob: '',
          tpaId: '',
          tpaValidity: '',
          guardianName: '',
          urgency: 'Routine',
          isReferral: false,
          referredBy: ''
        });

        if (shouldRedirect) {
          setNewAppointment({
            patientId: existing.id,
            doctor: '',
            date: new Date().toISOString().split('T')[0],
            time: '',
            urgency: 'Routine',
            discountAmount: '0',
            discountGivenBy: ''
          });
          setPatientSearchTerm(existing.name);
          setShowPatientResults(false);

          setTimeout(() => {
            setIsAppointmentOpen(true);
            setActiveTab('appointments');
          }, 300);
        }

        window.dispatchEvent(new CustomEvent('supabase-data-sync', { 
          detail: { table: 'patients', action: 'update' } 
        }));
      } else {
        toast.error('Failed to merge patient details');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error merging records');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegistration = async (shouldRedirect: boolean = false, bypassDuplicateCheck: boolean = false) => {
    if (!newPatient.name) {
      toast.error('Please enter the patient\'s Full Name');
      return;
    }

    if (newPatient.bookImmediateAppointment && !newPatient.appointmentDoctor) {
      toast.error('Please select a doctor for the immediate appointment');
      return;
    }

    if (isSubmitting || isRegisteringRef.current) {
      toast.warning('Registration is already in progress! Please do not click multiple times.');
      return;
    }
    isRegisteringRef.current = true;

    if (!editingPatient && !bypassDuplicateCheck) {
      const trimmedNewName = (newPatient.name || '').trim().toLowerCase();
      const trimmedNewPhone = (newPatient.phone || '').trim().replace(/\D/g, '');
      const trimmedNewEmail = (newPatient.email || '').trim().toLowerCase();

      // Look for EXACT name and phone match for merge
      const exactMatch = patients.find((p: any) => {
        const pName = (p.name || '').trim().toLowerCase();
        const pPhone = (p.phone || p.mobile || '').trim().replace(/\D/g, '');
        return pName === trimmedNewName && pPhone === trimmedNewPhone && trimmedNewPhone !== '';
      });

      if (exactMatch) {
        setMergePatientData({
          existing: exactMatch,
          newDetails: { ...newPatient },
          shouldRedirect
        });
        isRegisteringRef.current = false;
        return;
      }

      const duplicatePatient = patients.find((p: any) => {
        const pName = (p.name || '').trim().toLowerCase();
        const pPhone = (p.phone || p.mobile || '').trim().replace(/\D/g, '');
        const pEmail = (p.email || '').trim().toLowerCase();

        const nameMatches = pName === trimmedNewName;
        const phoneMatches = trimmedNewPhone && pPhone && (trimmedNewPhone === pPhone);
        const emailMatches = trimmedNewEmail && pEmail && (trimmedNewEmail === pEmail);

        if (nameMatches && phoneMatches) return true;
        if (trimmedNewPhone && trimmedNewPhone.length >= 10 && pPhone === trimmedNewPhone) return true;
        if (nameMatches && !trimmedNewPhone && !pPhone) return true;
        return false;
      });

      if (duplicatePatient) {
        setDuplicateConfirm({
          newPatientData: { ...newPatient },
          duplicatePatient,
          shouldRedirect
        });
        isRegisteringRef.current = false;
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (editingPatient) {
        const relPayload = getRelativePayload(newPatient);
        const cleanPhone = (newPatient.phone || '').trim();
        const updatedData = {
          name: (newPatient.name || '').trim(),
          phone: cleanPhone,
          mobile: cleanPhone,
          contact: cleanPhone,
          phone_number: cleanPhone,
          phoneNumber: cleanPhone,
          email: newPatient.email ? newPatient.email.trim() : null,
          dob: newPatient.dob ? newPatient.dob : null,
          age: newPatient.age ? Number(newPatient.age) : null,
          gender: newPatient.gender,
          blood_group: newPatient.bloodGroup,
          address: newPatient.address,
          ...relPayload,
          tpa_id: newPatient.tpaId,
          tpa_validity: newPatient.tpaValidity ? newPatient.tpaValidity : null,
          urgency: newPatient.urgency,
          is_referral: newPatient.isReferral,
          referred_by: newPatient.referredBy
        };

        const result = await supabaseService.updatePatient(editingPatient.id, updatedData);
        if (result) {
          const updatedPatientsList = patients.map(p => (p.id === editingPatient.id || isPatientIdMatch(p.id, editingPatient.id) || (p.mrn && editingPatient.mrn && p.mrn === editingPatient.mrn)) ? { ...p, ...updatedData, ...result } : p);
          setPatients(updatedPatientsList);
          storage.set(STORAGE_KEYS.PATIENTS, updatedPatientsList);

          // Also sync any existing appointments with the updated patient info
          const currentApts = storage.get(STORAGE_KEYS.APPOINTMENTS, []) || [];
          const updatedApts = currentApts.map((a: any) => {
            if (isPatientIdMatch(a.patient_id, editingPatient.id) || isPatientIdMatch(a.patientId, editingPatient.id) || (a.patientMrn && editingPatient.mrn && a.patientMrn === editingPatient.mrn)) {
              return {
                ...a,
                patientName: updatedData.name || a.patientName,
                patientPhone: cleanPhone || a.patientPhone
              };
            }
            return a;
          });
          setAppointments(updatedApts);
          storage.set(STORAGE_KEYS.APPOINTMENTS, updatedApts);

          window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table: 'patients', action: 'update' } }));
          window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table: 'appointments', action: 'update' } }));

          // If "Book Appointment Immediately" is checked, book the appointment right now!
          if (newPatient.bookImmediateAppointment && newPatient.appointmentDoctor) {
            const selectedDocObj = findDoctor(newPatient.appointmentDoctor) || users.find(u => u.name === newPatient.appointmentDoctor);
            const resolvedDoctor = selectedDocObj?.name || newPatient.appointmentDoctor;
            const doctorId = selectedDocObj ? selectedDocObj.id : null;
            const doctorDept = selectedDocObj?.department || 'General Medicine';
            const apptDate = newPatient.appointmentDate || getLocalDateString();
            
            // Token sequential calculation
            const dateApts = appointments.filter(a => {
              const aDate = a.appointment_date || a.date || '';
              return aDate === apptDate;
            });
            const dailySeq = dateApts.length + 1;
            const tokenNum = `TK-${dailySeq}`;
            
            const docFee = (selectedDocObj && selectedDocObj.consultationFee !== undefined && selectedDocObj.consultationFee !== null && !isNaN(Number(selectedDocObj.consultationFee)))
              ? Number(selectedDocObj.consultationFee)
              : (newPatient.appointmentFee !== undefined && newPatient.appointmentFee !== '' ? Number(newPatient.appointmentFee) : 500);
            
            const apptSynced = await supabaseService.createAppointment({
              patient_id: result.id,
              patientName: result.name,
              patientMrn: result.mrn,
              doctor_id: doctorId,
              type: 'OPD',
              appointment_date: apptDate,
              appointment_time: newPatient.appointmentTime || '10:00 AM',
              status: 'Scheduled',
              urgency: newPatient.appointmentUrgency || 'Routine',
              doctor: resolvedDoctor,
              doctorName: resolvedDoctor,
              doctorDepartment: doctorDept,
              doctor_department: doctorDept,
              department: doctorDept,
              fee: docFee,
              discount_amount: 0,
              discount_given_by: currentUser?.name || null
            });

            const resolvedAppt = apptSynced || {
              id: 'apt-' + Date.now(),
              patient_id: result.id,
              patientId: result.id,
              doctor_id: doctorId,
              type: 'OPD',
              appointment_date: apptDate,
              appointment_time: newPatient.appointmentTime || '10:00 AM',
              status: 'Scheduled',
              urgency: newPatient.appointmentUrgency || 'Routine',
              doctor: resolvedDoctor,
              doctorName: resolvedDoctor,
              doctorDepartment: doctorDept,
              doctor_department: doctorDept,
              department: doctorDept,
              fee: docFee,
              discount_amount: 0,
              discount_given_by: currentUser?.name || null
            };

            const isToday = apptDate === getLocalDateString();
            if (isToday) {
              try {
                await supabaseService.createLiveQueueItem({
                  patient_id: result.id,
                  doctor_id: doctorId,
                  appointment_id: resolvedAppt.id,
                  token_number: dailySeq,
                  status: 'Waiting',
                  urgency: newPatient.appointmentUrgency || 'Routine'
                });
              } catch (queueErr) {
                console.warn('Silent error saving to live_queue:', queueErr);
              }
            }

            const selectedInvoiceItems = [{
              item_name: `Consultation Fee - ${newPatient.appointmentDoctor}`,
              item_type: 'Consultation',
              quantity: 1,
              unit_price: docFee,
              total_price: docFee
            }];
            
            const invoiceData = {
              patient_id: result.id,
              patient_name: result.name,
              invoice_number: `INV-OPD-${Date.now()}`,
              status: 'Unpaid',
              total_amount: docFee,
              discount_amount: 0,
              payable_amount: docFee,
              paid_amount: 0,
              payment_method: 'Cash',
              type: 'OPD',
              created_by: currentUser?.id
            };
            
            try {
              await supabaseService.createInvoice(invoiceData, selectedInvoiceItems);
            } catch (invErr) {
              console.warn('Silent error creating invoice:', invErr);
            }

            const apptWithPatient = {
              ...resolvedAppt,
              patientName: result.name,
              patientMrn: result.mrn,
              doctor: newPatient.appointmentDoctor,
              doctorName: newPatient.appointmentDoctor
            };

            setAppointments(prev => [apptWithPatient, ...prev.filter(a => a.id !== apptWithPatient.id)]);
            const allApts = storage.get(STORAGE_KEYS.APPOINTMENTS, []);
            storage.set(STORAGE_KEYS.APPOINTMENTS, [apptWithPatient, ...allApts.filter((a: any) => a.id !== apptWithPatient.id)]);

            setLastToken({
              tokenNumber: tokenNum,
              patientName: result.name,
              mrn: result.mrn,
              doctor: newPatient.appointmentDoctor,
              date: new Date().toLocaleString(),
              fee: docFee
            });

            toast.success(`Saved patient details & booked appointment with ${newPatient.appointmentDoctor} (Token: ${tokenNum})`);
            
            setIsRegisterOpen(false);
            setEditingPatient(null);
            setIsTokenSuccessOpen(true);
            setActiveTab('queue');
            
            setNewPatient({ 
              name: '', 
              phone: '', 
              email: '',
              age: '', 
              gender: 'male',
              address: '',
              husbandName: '',
              husbandPhone: '',
              motherName: '',
              motherPhone: '',
              fatherName: '',
              fatherPhone: '',
              bloodGroup: '',
              dob: '',
              tpaId: '',
              tpaValidity: '',
              guardianName: '',
              urgency: 'Routine',
              isReferral: false,
              referredBy: '',
              bookImmediateAppointment: false,
              appointmentDoctor: '',
              appointmentDate: getLocalDateString(),
              appointmentTime: '10:00',
              appointmentUrgency: 'Routine',
              appointmentFee: ''
            });

            window.dispatchEvent(new CustomEvent('supabase-data-sync', { 
              detail: { table: 'patients', action: 'update' } 
            }));
            window.dispatchEvent(new CustomEvent('supabase-data-sync', { 
              detail: { table: 'appointments', action: 'insert' } 
            }));
            setIsSubmitting(false);
            isRegisteringRef.current = false;
            return;
          }

          setIsRegisterOpen(false);
          setEditingPatient(null);
          // Reset form
          setNewPatient({ 
            name: '', 
            phone: '', 
            email: '',
            age: '', 
            gender: 'male',
            address: '',
            husbandName: '',
            husbandPhone: '',
            motherName: '',
            motherPhone: '',
            fatherName: '',
            fatherPhone: '',
            bloodGroup: '',
            dob: '',
            tpaId: '',
            tpaValidity: '',
            guardianName: '',
            urgency: 'Routine',
            isReferral: false,
            referredBy: '',
            bookImmediateAppointment: false,
            appointmentDoctor: '',
            appointmentDate: getLocalDateString(),
            appointmentTime: '10:00',
            appointmentUrgency: 'Routine',
            appointmentFee: ''
          });
          window.dispatchEvent(new CustomEvent('supabase-data-sync', { 
            detail: { table: 'patients', action: 'update' } 
          }));

          if (shouldRedirect) {
            setNewAppointment({
              patientId: editingPatient.id,
              doctor: '',
              date: new Date().toISOString().split('T')[0],
              time: '',
              urgency: 'Routine',
              discountAmount: '0',
              discountGivenBy: ''
            });
            setPatientSearchTerm(result.name || editingPatient.name);
            setShowPatientResults(false);

            setTimeout(() => {
              setIsAppointmentOpen(true);
              setActiveTab('appointments');
            }, 300);

            toast.success('Patient details saved and redirected to Appointment Booking');
          } else {
            toast.success('Patient details saved successfully');
          }
        } else {
          toast.error('Failed to update patient details');
        }
        return;
      }

      const tokenNumber = `#${Math.floor(Math.random() * 900) + 100}`;
      const mrn = `MRN${Math.floor(Math.random() * 90000) + 10000}`;
      const regFee = 200;
      
      const relPayload = getRelativePayload(newPatient);
      const synced = await supabaseService.createPatient({
        mrn,
        name: newPatient.name,
        phone: newPatient.phone || null,
        email: newPatient.email || null,
        dob: newPatient.dob ? newPatient.dob : null,
        age: newPatient.age ? Number(newPatient.age) : null,
        gender: newPatient.gender || 'male',
        blood_group: newPatient.bloodGroup || null,
        address: newPatient.address || null,
        ...relPayload,
        tpa_id: newPatient.tpaId || null,
        tpa_validity: newPatient.tpaValidity ? newPatient.tpaValidity : null,
        registration_type: 'OPD',
        is_referral: newPatient.isReferral || false,
        referred_by: newPatient.referredBy || null,
        urgency: newPatient.urgency || 'Routine'
      });

      if (synced) {
        const updatedList = [synced, ...patients];
        setPatients(updatedList);
        storage.set(STORAGE_KEYS.PATIENTS, updatedList);

        // If "Book Appointment Immediately" is checked, book the appointment right now!
        if (newPatient.bookImmediateAppointment && newPatient.appointmentDoctor) {
          const selectedDocObj = findDoctor(newPatient.appointmentDoctor) || users.find(u => u.name === newPatient.appointmentDoctor);
          const resolvedDoctor = selectedDocObj?.name || newPatient.appointmentDoctor;
          const doctorId = selectedDocObj ? selectedDocObj.id : null;
          const doctorDept = selectedDocObj?.department || 'General Medicine';
          const apptDate = newPatient.appointmentDate || getLocalDateString();
          
          // Token sequential calculation
          const dateApts = appointments.filter(a => {
            const aDate = a.appointment_date || a.date || '';
            return aDate === apptDate;
          });
          const dailySeq = dateApts.length + 1;
          const tokenNum = `TK-${dailySeq}`;
          
          const docFee = (selectedDocObj && selectedDocObj.consultationFee !== undefined && selectedDocObj.consultationFee !== null && !isNaN(Number(selectedDocObj.consultationFee)))
            ? Number(selectedDocObj.consultationFee)
            : (newPatient.appointmentFee !== undefined && newPatient.appointmentFee !== '' ? Number(newPatient.appointmentFee) : 500);
          
          const apptSynced = await supabaseService.createAppointment({
            patient_id: synced.id,
            patientName: synced.name,
            patientMrn: synced.mrn,
            doctor_id: doctorId,
            type: 'OPD',
            appointment_date: apptDate,
            appointment_time: newPatient.appointmentTime || '10:00 AM',
            status: 'Scheduled',
            urgency: newPatient.appointmentUrgency || 'Routine',
            doctor: resolvedDoctor,
            doctorName: resolvedDoctor,
            doctorDepartment: doctorDept,
            doctor_department: doctorDept,
            department: doctorDept,
            fee: docFee,
            discount_amount: 0,
            discount_given_by: currentUser?.name || null
          });
          
          const resolvedAppt = apptSynced || {
            id: 'apt-' + Date.now(),
            patient_id: synced.id,
            patientId: synced.id,
            doctor_id: doctorId,
            type: 'OPD',
            appointment_date: apptDate,
            appointment_time: newPatient.appointmentTime || '10:00 AM',
            status: 'Scheduled',
            urgency: newPatient.appointmentUrgency || 'Routine',
            doctor: resolvedDoctor,
            doctorName: resolvedDoctor,
            doctorDepartment: doctorDept,
            doctor_department: doctorDept,
            department: doctorDept,
            fee: docFee,
            discount_amount: 0,
            discount_given_by: currentUser?.name || null
          };
          
          // Save inside separate Live Queue database table if appointment is for today
          const isToday = apptDate === getLocalDateString();
          if (isToday) {
            try {
              await supabaseService.createLiveQueueItem({
                patient_id: synced.id,
                doctor_id: doctorId,
                appointment_id: resolvedAppt.id,
                token_number: dailySeq,
                status: 'Waiting',
                urgency: newPatient.appointmentUrgency || 'Routine'
              });
            } catch (queueErr) {
              console.warn('Silent error saving to live_queue:', queueErr);
            }
          }
          
          // Also generate an OPD invoice for consultation fee!
          const selectedInvoiceItems = [{
            item_name: `Consultation Fee - ${newPatient.appointmentDoctor}`,
            item_type: 'Consultation',
            quantity: 1,
            unit_price: docFee,
            total_price: docFee
          }];
          
          const invoiceData = {
            patient_id: synced.id,
            patient_name: synced.name,
            invoice_number: `INV-OPD-${Date.now()}`,
            status: 'Unpaid',
            total_amount: docFee,
            discount_amount: 0,
            payable_amount: docFee,
            paid_amount: 0,
            payment_method: 'Cash',
            type: 'OPD',
            created_by: currentUser?.id
          };
          
          try {
            await supabaseService.createInvoice(invoiceData, selectedInvoiceItems);
          } catch (invErr) {
            console.warn('Silent error creating invoice:', invErr);
          }
          
          const apptWithPatient = {
            ...resolvedAppt,
            patientName: synced.name,
            patientMrn: synced.mrn,
            doctor: newPatient.appointmentDoctor,
            doctorName: newPatient.appointmentDoctor
          };
          
          // Update appointments local state
          setAppointments(prev => [apptWithPatient, ...prev.filter(a => a.id !== apptWithPatient.id)]);
          const currentApts = storage.get(STORAGE_KEYS.APPOINTMENTS, []);
          storage.set(STORAGE_KEYS.APPOINTMENTS, [apptWithPatient, ...currentApts.filter((a: any) => a.id !== apptWithPatient.id)]);
          
          // Show Success Token
          setLastToken({
            tokenNumber: tokenNum,
            patientName: synced.name,
            mrn: synced.mrn,
            doctor: newPatient.appointmentDoctor,
            date: new Date().toLocaleString(),
            fee: docFee
          });
          
          toast.success(`Registered patient & booked appointment with ${newPatient.appointmentDoctor} (Token: ${tokenNum})`);
          
          setIsRegisterOpen(false);
          setIsTokenSuccessOpen(true);
          setActiveTab('queue');
          
          // Reset form
          setNewPatient({ 
            name: '', 
            phone: '', 
            email: '',
            age: '', 
            gender: 'male',
            address: '',
            husbandName: '',
            husbandPhone: '',
            motherName: '',
            motherPhone: '',
            fatherName: '',
            fatherPhone: '',
            bloodGroup: '',
            dob: '',
            tpaId: '',
            tpaValidity: '',
            guardianName: '',
            urgency: 'Routine',
            isReferral: false,
            referredBy: '',
            bookImmediateAppointment: false,
            appointmentDoctor: '',
            appointmentDate: getLocalDateString(),
            appointmentTime: '10:00',
            appointmentUrgency: 'Routine',
            appointmentFee: ''
          });

          window.dispatchEvent(new CustomEvent('supabase-data-sync', { 
            detail: { table: 'patients', action: 'insert' } 
          }));
          window.dispatchEvent(new CustomEvent('supabase-data-sync', { 
            detail: { table: 'appointments', action: 'insert' } 
          }));
          
          setIsSubmitting(false);
          isRegisteringRef.current = false;
          return;
        }

        // No standard OPD Registration Fee collected per user instructions
        const selectedInvoiceItems: any[] = [];
        let calculatedTotal = 0;

        const regFeeAmount = 0;

        setLastToken({
          tokenNumber,
          patientName: newPatient.name,
          mrn,
          doctor: "Reception Counter", 
          date: new Date().toLocaleString(),
          fee: calculatedTotal
        });

        setIsRegisterOpen(false);
        if (!shouldRedirect) {
          setIsTokenSuccessOpen(true);
          setActiveTab('patients');
          setPatientRecordsSearchQuery(synced.name);
        }
        playNotificationSound();

        // Reset form
        setNewPatient({ 
          name: '', 
          phone: '', 
          email: '',
          age: '', 
          gender: 'male',
          address: '',
          husbandName: '',
          husbandPhone: '',
          motherName: '',
          motherPhone: '',
          fatherName: '',
          fatherPhone: '',
          bloodGroup: '',
          dob: '',
          tpaId: '',
          tpaValidity: '',
          guardianName: '',
          urgency: 'Routine',
          isReferral: false,
          referredBy: '',
          bookImmediateAppointment: false,
          appointmentDoctor: '',
          appointmentDate: getLocalDateString(),
          appointmentTime: '10:00',
          appointmentUrgency: 'Routine',
          appointmentFee: ''
        });

        if (shouldRedirect) {
          // Redirect to Appointment Booking with pre-selected doctor & patient
          const chosenDoc = newPatient.appointmentDoctor || (currentUser?.role?.toUpperCase() === 'DOCTOR' ? currentUser.name : (allDoctors[0]?.name || 'Dr. Rajesh Sharma'));
          const chosenDate = newPatient.appointmentDate || getLocalDateString();
          const chosenTime = newPatient.appointmentTime ? (newPatient.appointmentTime.includes('M') ? newPatient.appointmentTime : `${newPatient.appointmentTime} AM`) : '10:00 AM';

          const docObj = findDoctor(chosenDoc);
          if (docObj) {
            setSelectedApptFees(prev => ({
              ...prev,
              consult: {
                ...prev.consult,
                amount: docObj.consultationFee !== undefined && docObj.consultationFee !== null ? Number(docObj.consultationFee) : 500
              }
            }));
          }

          setNewAppointment({
            patientId: synced.id,
            doctor: chosenDoc,
            date: chosenDate,
            time: chosenTime,
            urgency: newPatient.appointmentUrgency || 'Routine',
            discountAmount: '0',
            discountGivenBy: ''
          });
          setPatientSearchTerm(synced.name);
          setShowPatientResults(false);
          
          // Wrap in setTimeout to ensure the first dialog fully finishes its close animation and focus release 
          // before opening the Book New Appointment dialog
          setTimeout(() => {
            setIsAppointmentOpen(true);
            setActiveTab('appointments');
          }, 300);

          toast.success(`Patient registered! Selected doctor: ${chosenDoc}`);
        } else {
          toast.success('Patient registered successfully');
        }

        window.dispatchEvent(new CustomEvent('supabase-data-sync', { 
          detail: { table: 'patients', action: 'insert' } 
        }));
      } else {
        toast.error('Failed to register patient');
      }
    } catch (error) {
      console.error('Error registering patient:', error);
      toast.error('An error occurred during registration');
    } finally {
      setIsSubmitting(false);
      isRegisteringRef.current = false;
    }
  };

  const handleBookAppointment = async (printImmediately: boolean = false) => {
    if (isBookingRef.current) {
      toast.warning('Appointment booking is already in progress! Please do not click multiple times.');
      return;
    }
    isBookingRef.current = true;

    try {
      let patientId = newAppointment.patientId;
      let patient = getSelectedPatient(patientId);
      if (!patient && patientSearchTerm) {
        const trimmedTerm = patientSearchTerm.trim().toLowerCase();
        patient = patients.find(p => p.name.toLowerCase() === trimmedTerm || p.phone === trimmedTerm || p.mrn.toLowerCase() === trimmedTerm) || null;
        if (patient) {
          patientId = patient.id;
        }
      }
      if (!patientId && patient) {
        patientId = patient.id;
      }

      if (!patientId && !patientSearchTerm) {
        toast.error('Please select or search for a patient');
        return;
      }

      const matchedDocObj = findDoctor(newAppointment.doctor) || (users || []).find((u: any) => u.name === newAppointment.doctor) || allDoctors[0];
      const chosenDoctor = matchedDocObj?.name || newAppointment.doctor || 'Dr. Rajesh Sharma';
      const doctorId = matchedDocObj ? matchedDocObj.id : null;
      const doctorDept = matchedDocObj?.department || 'General Medicine';

      const patientName = patient?.name || (patientSearchTerm && patientSearchTerm.trim() !== '' ? patientSearchTerm.trim() : 'Walk-in Patient');
      const patientMrn = patient?.mrn || 'N/A';

      const regFeeAmount = selectedApptFees.reg.checked ? (Number(selectedApptFees.reg.amount) || 0) : 0;
      const apptFeeAmount = selectedApptFees.appt.checked ? (Number(selectedApptFees.appt.amount) || 0) : 0;
      const consultFeeAmount = selectedApptFees.consult.checked ? (Number(selectedApptFees.consult.amount) || 0) : 0;
      const calculatedTotalAssigned = regFeeAmount + apptFeeAmount + consultFeeAmount;
      const finalAppointmentFee = calculatedTotalAssigned > 0 ? calculatedTotalAssigned : (consultFeeAmount || Number(appointmentFee) || 500);

    if (editingAppointment) {
      const updatedData = {
        patient_id: patientId,
        patientName: patientName,
        patientMrn: patientMrn,
        doctor_id: doctorId,
        appointment_date: newAppointment.date || new Date().toISOString().split('T')[0],
        appointment_time: newAppointment.time || '10:00 AM',
        urgency: newAppointment.urgency || 'Routine',
        doctor: chosenDoctor,
        doctorName: chosenDoctor,
        doctorDepartment: doctorDept,
        doctor_department: doctorDept,
        department: doctorDept,
        fee: finalAppointmentFee,
        discount_amount: Number(newAppointment.discountAmount || 0),
        discount_given_by: newAppointment.discountGivenBy || currentUser?.name || null
      };

      const result = await supabaseService.updateAppointment(editingAppointment.id, updatedData);
      if (result) {
        const updatedApt = {
          ...result,
          patientId: result.patient_id || result.patientId || patientId,
          patientName: patientName,
          patientMrn: patientMrn,
          doctor: chosenDoctor,
          doctorName: chosenDoctor,
          doctorDepartment: doctorDept,
          doctor_department: doctorDept,
          department: doctorDept,
          appointment_date: result.appointment_date || result.date,
          appointment_time: result.appointment_time || result.time,
        };
        const updatedList = appointments.map(a => a.id === editingAppointment.id ? updatedApt : a);
        setAppointments(updatedList);
        storage.set(STORAGE_KEYS.APPOINTMENTS, updatedList);
        toast.success('Appointment updated successfully');
        setIsAppointmentOpen(false);
        setEditingAppointment(null);
        setPatientSearchTerm('');
        setNewAppointment({ patientId: '', doctor: '', date: '', time: '', urgency: 'Routine', discountAmount: '0', discountGivenBy: '' });

        if (printImmediately) {
          setTimeout(() => {
            printAppointmentToken(updatedApt);
          }, 150);
        }
      } else {
        toast.error('Failed to update appointment');
      }
      return;
    }

    const appointmentDate = newAppointment.date || getLocalDateString();

    // Token no. for OPD must start with no.1 on each date and proceed in sequential order
    const dateApts = appointments.filter(a => {
      const aDate = a.appointment_date || a.date || '';
      return aDate === appointmentDate;
    });
    const dailySeq = dateApts.length + 1;
    const tokenNumber = `TK-${dailySeq}`;
    
    const synced = await supabaseService.createAppointment({
      patient_id: patientId || null,
      patientName: patientName,
      patientMrn: patientMrn,
      doctor_id: doctorId,
      type: 'OPD',
      appointment_date: appointmentDate,
      appointment_time: newAppointment.time || '10:00 AM',
      status: 'Scheduled',
      urgency: newAppointment.urgency || 'Routine',
      doctor: chosenDoctor,
      doctorName: chosenDoctor,
      doctorDepartment: doctorDept,
      doctor_department: doctorDept,
      department: doctorDept,
      fee: finalAppointmentFee,
      discount_amount: Number(newAppointment.discountAmount || 0),
      discount_given_by: newAppointment.discountGivenBy || currentUser?.name || null
    });

    if (synced) {
      // Save inside separate Live Queue database table if appointment is for today
      const isToday = appointmentDate === getLocalDateString();
      if (isToday) {
        try {
          await supabaseService.createLiveQueueItem({
            patient_id: patientId || null,
            doctor_id: doctorId,
            appointment_id: synced.id,
            token_number: dailySeq,
            status: 'Waiting',
            urgency: newAppointment.urgency || 'Routine'
          });
        } catch (queueErr) {
          console.warn('Silent error saving to live_queue:', queueErr);
        }
      }

      // Collect the checked fees dynamically
      const selectedInvoiceItems: any[] = [];
      let calculatedTotal = 0;

      if (selectedApptFees.reg.checked && regFeeAmount > 0) {
        selectedInvoiceItems.push({
          item_name: selectedApptFees.reg.name || 'OPD Follow UP Fee',
          item_type: 'Consultation',
          quantity: 1,
          unit_price: regFeeAmount,
          total_price: regFeeAmount
        });
        calculatedTotal += regFeeAmount;
      }

      if (selectedApptFees.appt.checked && apptFeeAmount > 0) {
        selectedInvoiceItems.push({
          item_name: `Follow up OPD fee - ${chosenDoctor || 'OPD'}`,
          item_type: 'Consultation',
          quantity: 1,
          unit_price: apptFeeAmount,
          total_price: apptFeeAmount
        });
        calculatedTotal += apptFeeAmount;
      }

      if (selectedApptFees.consult.checked && consultFeeAmount >= 0) {
        selectedInvoiceItems.push({
          item_name: `Doctor Consultation Fee - ${chosenDoctor || 'GP'}`,
          item_type: 'Consultation',
          quantity: 1,
          unit_price: consultFeeAmount,
          total_price: consultFeeAmount
        });
        calculatedTotal += consultFeeAmount;
      }

      if (selectedInvoiceItems.length > 0) {
        // Create Invoice for selected Consultation/Appointment Fees
        const discountVal = Number(newAppointment.discountAmount || 0);
        const invoiceData = {
          patient_id: patientId || null,
          patient_name: patientName,
          invoice_number: `INV-OPD-${Date.now()}`,
          status: 'Unpaid',
          total_amount: calculatedTotal,
          discount_amount: discountVal,
          payable_amount: Math.max(0, calculatedTotal - discountVal),
          paid_amount: 0,
          payment_method: 'Cash',
          type: 'OPD',
          created_by: currentUser?.id
        };

        await supabaseService.createInvoice(invoiceData, selectedInvoiceItems);
      }

      const aptWithPatient = {
        ...synced,
        patient_id: patientId,
        patientId: patientId,
        patientName: patientName,
        patientMrn: patientMrn,
        doctor: chosenDoctor,
        doctorName: chosenDoctor,
        doctorDepartment: doctorDept,
        doctor_department: doctorDept,
        department: doctorDept,
        patients: {
          name: patientName,
          mrn: patientMrn,
          age: patient?.age || '',
          gender: patient?.gender || ''
        }
      };
      const updatedAptsList = [aptWithPatient, ...appointments.filter(a => a.id !== aptWithPatient.id)];
      setAppointments(updatedAptsList);
      storage.set(STORAGE_KEYS.APPOINTMENTS, updatedAptsList);

      setLastToken({
        tokenNumber,
        patientName: patientName,
        mrn: patientMrn,
        doctor: chosenDoctor,
        date: new Date().toLocaleString(),
        fee: calculatedTotal
      });
      setIsAppointmentOpen(false);

      if (printImmediately) {
        setTimeout(() => {
          printAppointmentToken(aptWithPatient);
        }, 150);
      } else {
        setIsTokenSuccessOpen(true);
      }

      playNotificationSound();
      setPatientSearchTerm('');
      setNewAppointment({ patientId: '', doctor: '', date: '', time: '', urgency: 'Routine', discountAmount: '0', discountGivenBy: '' });
      
      window.dispatchEvent(new CustomEvent('supabase-data-sync', { 
        detail: { table: 'appointments', action: 'insert' } 
      }));
      window.dispatchEvent(new CustomEvent('supabase-data-sync', { 
        detail: { table: 'invoices', action: 'insert' } 
      }));
      
      toast.success(printImmediately ? 'Appointment booked & printout generated' : 'Appointment booked and token generated');
    } else {
      toast.error('Failed to book appointment');
    }
    } finally {
      isBookingRef.current = false;
    }
  };

  const printToken = () => {
    if (!lastToken) return;

    const isA5 = tokenPrintSize === 'A5';
    const is80 = tokenPrintSize === 'thermal_80';
    const tokenHtml = isA5 ? `
      <html>
        <head>
          <title>Token - ${lastToken.tokenNumber}</title>
          <style>
            @page {
              size: A5 portrait;
              margin: 10mm;
            }
            body {
              font-family: 'Inter', -apple-system, sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 0;
              background: #ffffff;
            }
            .container {
              border: 2px solid #e2e8f0;
              border-radius: 12px;
              padding: 24px;
              height: calc(100% - 4px);
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              box-sizing: border-box;
            }
            .header {
              text-align: center;
              border-bottom: 2px dashed #cbd5e1;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .hospital-logo {
              font-size: 28px;
              margin-bottom: 4px;
            }
            .hospital-name {
              font-size: 22px;
              font-weight: 800;
              color: #1e3a8a;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .sub-title {
              font-size: 11px;
              font-weight: 600;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-top: 4px;
            }
            .token-container {
              text-align: center;
              background: #f1f5f9;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 18px;
              margin-bottom: 20px;
            }
            .token-label {
              font-size: 12px;
              font-weight: 700;
              color: #475569;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .token-num {
              font-size: 52px;
              font-weight: 900;
              color: #1e3a8a;
              margin: 8px 0;
            }
            .details-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 15px;
              margin-bottom: 20px;
            }
            .detail-card {
              background: #fafafa;
              border: 1px solid #f1f5f9;
              border-radius: 6px;
              padding: 12px;
            }
            .info-label {
              font-size: 10px;
              font-weight: 700;
              color: #64748b;
              text-transform: uppercase;
              margin-bottom: 4px;
            }
            .info-val {
              font-size: 14px;
              font-weight: 600;
              color: #0f172a;
            }
            .footer {
              border-top: 2px dashed #cbd5e1;
              padding-top: 15px;
              text-align: center;
            }
            .footer-text {
              font-size: 11px;
              color: #64748b;
              line-height: 1.5;
            }
            .footer-salutation {
              font-size: 12px;
              font-weight: 800;
              color: #1e3a8a;
              margin-top: 8px;
              text-transform: uppercase;
            }
          </style>
        </head>
        <body onload="window.print();">
          <div class="container">
            <div>
              <div class="header">
                <div class="hospital-logo">🏥</div>
                <div class="hospital-name">NEW GASTRO PLUS HOSPITAL</div>
                <div class="sub-title">OPD CLINIC APPOINTMENT SLIP</div>
              </div>
              
              <div class="token-container">
                <div class="token-label">OPD CONSULTATION TOKEN</div>
                <div class="token-num">${lastToken.tokenNumber}</div>
              </div>
              
              <div class="details-grid">
                <div class="detail-card">
                  <div class="info-label">Patient Name</div>
                  <div class="info-val">${lastToken.patientName}</div>
                </div>
                <div class="detail-card">
                  <div class="info-label">Patient MRN</div>
                  <div class="info-val" style="font-family: monospace; font-weight: bold;">${lastToken.mrn}</div>
                </div>
                <div class="detail-card">
                  <div class="info-label">OPD Attending Doctor</div>
                  <div class="info-val">${lastToken.doctor}</div>
                </div>
                <div class="detail-card">
                  <div class="info-label">Session Date / Time</div>
                  <div class="info-val">${lastToken.date}</div>
                </div>
                ${lastToken.fee ? `
                <div class="detail-card" style="grid-column: span 2;">
                  <div class="info-label">Registration Fee Paid</div>
                  <div class="info-val" style="color: #16a34a; font-weight: bold; font-size: 15px;">₹${lastToken.fee}</div>
                </div>
                ` : ''}
              </div>
            </div>
            
            <div class="footer">
              <div class="footer-text">Please present this slip at OPD Consultation chamber outer desk. Wait for your turn token call.</div>
              <div class="footer-salutation">Have a healthy day!</div>
            </div>
          </div>
        </body>
      </html>
    ` : is80 ? `
      <html>
        <head>
          <title>Token - ${lastToken.tokenNumber}</title>
          <style>
            @page { margin: 0; }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              width: 80mm; 
              padding: 8mm; 
              margin: 0;
              font-size: 13px;
              line-height: 1.3;
              text-align: center;
              color: #000;
            }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .token-num { font-size: 42px; font-weight: bold; margin: 15px 0; border: 2px solid #000; padding: 10px; display: inline-block; border-radius: 4px; }
            .header { margin-bottom: 12px; }
            .hospital-name { font-size: 18px; font-weight: 900; }
            .info-row { text-align: left; margin: 6px 0; }
          </style>
        </head>
        <body onload="window.print();">
          <div class="header">
            <div class="bold hospital-name">NEW GASTRO PLUS HOSPITAL</div>
            <div style="font-size: 11px; margin-top: 4px; font-weight: bold;">OPD CONSULTATION TOKEN</div>
          </div>
          
          <div class="divider"></div>
          
          <div class="token-num">${lastToken.tokenNumber}</div>
          
          <div class="divider"></div>
          
          <div style="text-align: left;">
            <div class="info-row"><span class="bold">Patient:</span> ${lastToken.patientName}</div>
            <div class="info-row"><span class="bold">MRN:</span> ${lastToken.mrn}</div>
            <div class="info-row"><span class="bold">Doctor:</span> ${lastToken.doctor}</div>
            <div class="info-row"><span class="bold">Date:</span> ${lastToken.date}</div>
            ${lastToken.fee ? `<div class="info-row"><span class="bold">Fee Paid:</span> ₹${lastToken.fee}</div>` : ''}
          </div>
          
          <div class="divider"></div>
          
          <div style="font-size: 10px; margin-top: 12px; line-height: 1.3;">
            Please present this slip at OPD Consultation chamber outer desk.<br>
            Please wait for your turn. Thank you!
          </div>
        </body>
      </html>
    ` : `
      <html>
        <head>
          <title>Token - ${lastToken.tokenNumber}</title>
          <style>
            @page { margin: 0; }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              width: 58mm; 
              padding: 5mm; 
              margin: 0;
              font-size: 11px;
              line-height: 1.2;
              text-align: center;
              color: #000;
            }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 5px 0; }
            .token-num { font-size: 32px; font-weight: bold; margin: 10px 0; }
            .header { margin-bottom: 10px; }
          </style>
        </head>
        <body onload="window.print();">
          <div class="header">
            <div class="bold" style="font-size: 14px;">NEW GASTRO PLUS HOSPITAL</div>
            <div>OPD TOKEN</div>
          </div>
          
          <div class="divider"></div>
          
          <div class="token-num">${lastToken.tokenNumber}</div>
          
          <div class="divider"></div>
          
          <div style="text-align: left;">
            <div>Patient: ${lastToken.patientName}</div>
            <div>MRN: ${lastToken.mrn}</div>
            <div>Doctor: ${lastToken.doctor}</div>
            <div>Date: ${lastToken.date}</div>
            ${lastToken.fee ? `<div>Fee Paid: ₹${lastToken.fee}</div>` : ''}
          </div>
          
          <div class="divider"></div>
          
          <div style="font-size: 9px; margin-top: 10px;">
            Please wait for your turn.<br>
            Thank you for your patience.
          </div>
        </body>
      </html>
    `;

    safePrint(tokenHtml, isA5 ? 600 : is80 ? 450 : 300, isA5 ? 800 : is80 ? 600 : 400);
  };

  const handleDeletePatient = async (id: string) => {
    const patientToDelete = patients.find(p => p.id === id);
    if (!window.confirm(`Are you sure you want to delete ${patientToDelete?.name}?`)) return;

    const success = await supabaseService.deletePatient(id);
    if (success) {
      const updatedList = patients.filter(p => p.id !== id);
      setPatients(updatedList);
      storage.set(STORAGE_KEYS.PATIENTS, updatedList);
      window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table: 'patients', action: 'delete' } }));
      toast.success('Patient record removed');
    } else {
      toast.error('Failed to delete patient');
    }
  };

  const handleOpenPaymentModal = (apt: any) => {
    if (!apt) return;
    setPaymentAppointment(apt);
    setPaymentMode(apt.payment_method || apt.payment_mode || 'Cash');
    setPaymentRefNo(apt.transaction_ref || apt.ref_no || '');
    setPaymentDiscount(Number(apt.discount_amount || apt.discountAmount || 0));
    setIsPaymentModalOpen(true);
  };

  const handlePayAppointment = async (id: string, mode = 'Cash', refNo = '', customDiscount?: number) => {
    const apt = appointments.find(a => a.id === id) || paymentAppointment;
    const resolvedPat = patients.find(p => isPatientIdMatch(p.id, apt?.patientId || apt?.patient_id) || (p.mrn && p.mrn === apt?.patientMrn) || (p.name && apt?.patientName && p.name.toLowerCase().trim() === String(apt.patientName).toLowerCase().trim()));
    const patientName = apt?.patientName && apt.patientName !== 'Walk-in Patient' && apt.patientName !== 'Unknown' 
      ? apt.patientName 
      : (resolvedPat?.name || apt?.patientName || 'Walk-in Patient');
    const patientMrn = apt?.patientMrn && apt.patientMrn !== 'N/A' 
      ? apt.patientMrn 
      : (resolvedPat?.mrn || apt?.patientMrn || 'N/A');
    const doctorName = apt?.doctor || apt?.doctorName || 'Dr. Rajesh Sharma';
    const patientId = apt?.patientId || apt?.patient_id || resolvedPat?.id;

    const discountVal = customDiscount !== undefined ? customDiscount : Number(apt?.discount_amount || apt?.discountAmount || 0);
    const baseFee = Number(apt?.fee || appointmentFee || 500);
    const payableAmt = Math.max(0, baseFee - discountVal);

    const updatePayload = {
      patient_id: patientId,
      patientId: patientId,
      patientName: patientName,
      patient_name: patientName,
      patientMrn: patientMrn,
      patient_mrn: patientMrn,
      doctor: doctorName,
      doctorName: doctorName,
      doctor_id: apt?.doctor_id || apt?.doctorId,
      appointment_date: apt?.appointment_date || apt?.date,
      appointment_time: apt?.appointment_time || apt?.time,
      urgency: apt?.urgency || 'Routine',
      payment_status: 'Paid',
      payment_method: mode,
      payment_mode: mode,
      transaction_ref: refNo,
      discount_amount: discountVal,
      fee: baseFee,
      payable_amount: payableAmt,
      paid_amount: payableAmt
    };

    const success = await supabaseService.updateAppointment(id, updatePayload);
    if (success) {
      const nextApts = appointments.map(a => a.id === id ? { 
        ...a, 
        ...updatePayload,
        patientName: patientName,
        patientMrn: patientMrn,
        doctor: doctorName,
        doctorName: doctorName
      } : a);
      setAppointments(nextApts);
      
      try {
        if (apt) {
          if (patientId) {
            const invoices = await supabaseService.getInvoices();
            const pendingOPDInvoices = invoices && invoices.length > 0 ? invoices.filter((inv: any) => {
              const invPid = inv.patient_id || inv.patientId;
              const isMatchPatient = isPatientIdMatch(invPid, patientId) ||
                (patientMrn && (inv.patient_mrn === patientMrn || inv.patientMrn === patientMrn)) ||
                (patientName && (inv.patient_name?.trim().toLowerCase() === patientName?.trim().toLowerCase() || inv.patientName?.trim().toLowerCase() === patientName?.trim().toLowerCase()));
              const isUnpaid = (inv.status || inv.payment_status || '').toLowerCase() === 'unpaid';
              const isOPD = inv.type === 'OPD' || 
                            inv.invoice_number?.startsWith('INV-REG') || 
                            inv.invoice_number?.startsWith('INV-OPD') ||
                            inv.invoice_number?.includes('REG') ||
                            inv.invoice_number?.includes('OPD');
              return isMatchPatient && (isUnpaid || isOPD);
            }) : [];

            const currentBills = storage.get(STORAGE_KEYS.BILLING, []);
            let updatedBills = [...currentBills];

            if (pendingOPDInvoices.length > 0) {
              for (const inv of pendingOPDInvoices) {
                const updatedInv = { 
                  ...inv, 
                  patient_name: patientName,
                  patientName: patientName,
                  patient_mrn: patientMrn,
                  patientMrn: patientMrn,
                  status: 'Paid', 
                  payment_status: 'Paid', 
                  payment_method: mode,
                  transaction_ref: refNo,
                  discount_amount: discountVal,
                  payable_amount: payableAmt,
                  paid_amount: payableAmt 
                };

                await supabaseService.updateInvoice(inv.id, updatedInv);

                updatedBills = updatedBills.map((b: any) => b.id === inv.id ? updatedInv : b);
              }
            } else {
              const invoiceData = {
                patient_id: patientId,
                patient_name: patientName,
                patientName: patientName,
                patient_mrn: patientMrn,
                patientMrn: patientMrn,
                invoice_number: `INV-OPD-${Date.now()}`,
                status: 'Paid',
                payment_status: 'Paid',
                total_amount: baseFee,
                discount_amount: discountVal,
                payable_amount: payableAmt,
                paid_amount: payableAmt,
                payment_method: mode,
                transaction_ref: refNo,
                type: 'OPD',
                created_by: currentUser?.id
              };
              const invoiceItems = [{
                item_name: `Consultation Fee - ${doctorName}`,
                category: 'Consultation',
                quantity: 1,
                unit_price: baseFee,
                total_price: baseFee
              }];
              const created = await supabaseService.createInvoice(invoiceData, invoiceItems);
              if (created) {
                updatedBills = [created, ...updatedBills.filter((b: any) => b.id !== created.id && b.invoice_number !== created.invoice_number)];
              }
            }

            // Update local storage caches to keep everything in sync
            storage.set(STORAGE_KEYS.APPOINTMENTS, nextApts);
            storage.set(STORAGE_KEYS.BILLING, updatedBills);

            window.dispatchEvent(new CustomEvent('supabase-data-sync', { 
              detail: { table: 'invoices', action: 'update' } 
            }));
            window.dispatchEvent(new CustomEvent('supabase-data-sync', { 
              detail: { table: 'appointments', action: 'update' } 
            }));
          }
        }
      } catch (err) {
        console.error('Error syncing invoice payment:', err);
      }

      toast.success(`Consultation fee of ₹${payableAmt} collected via ${mode}!`);
      setIsPaymentModalOpen(false);
      setPaymentAppointment(null);
    } else {
      toast.error('Failed to update payment status');
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    const aptToDelete = appointments.find(a => a.id === id);
    if (!window.confirm(`Are you sure you want to permanently delete appointment for ${aptToDelete?.patientName || 'this patient'}?`)) return;

    const updated = appointments.filter(a => a.id !== id);
    setAppointments(updated);
    storage.set(STORAGE_KEYS.APPOINTMENTS, updated);
    
    try {
      if (id && !id.startsWith('apt-') && !id.startsWith('off-')) {
        await supabaseService.deleteAppointment(id);
      }
    } catch (e) {
      console.warn('Supabase delete appointment error:', e);
    }
    
    window.dispatchEvent(new CustomEvent('supabase-data-sync', { 
      detail: { table: 'appointments', action: 'delete' } 
    }));
    toast.success('Appointment deleted successfully');
  };

  const handleRefundAppointment = async (id: string) => {
    if (!window.confirm("Are you sure you want to refund this consultation fee? This will mark the transaction as Refunded.")) return;
    const refundBy = currentUser?.name || 'Staff';
    const success = await supabaseService.updateAppointment(id, { 
      payment_status: 'Refunded',
      refund_given_by: refundBy
    });
    if (success) {
      const nextApts = appointments.map(a => a.id === id ? { ...a, payment_status: 'Refunded', refund_given_by: refundBy, refundGivenBy: refundBy } : a);
      setAppointments(nextApts);
      
      try {
        const apt = appointments.find(a => a.id === id);
        if (apt) {
          const patientId = apt.patientId || apt.patient_id;
          if (patientId) {
            const invoices = await supabaseService.getInvoices();
            const opdInvoices = invoices && invoices.length > 0 ? invoices.filter((inv: any) => {
              const isMatchPatient = (inv.patient_id === patientId || inv.patientId === patientId);
              const isOPD = inv.type === 'OPD' || 
                            inv.invoice_number?.startsWith('INV-REG') || 
                            inv.invoice_number?.startsWith('INV-OPD') ||
                            inv.invoice_number?.includes('REG') ||
                            inv.invoice_number?.includes('OPD');
              return isMatchPatient && isOPD;
            }) : [];

            const currentBills = storage.get(STORAGE_KEYS.BILLING, []);
            let updatedBills = [...currentBills];

            if (opdInvoices.length > 0) {
              for (const inv of opdInvoices) {
                const updatedInv = { ...inv, status: 'Refunded', payment_status: 'Refunded' };
                await supabaseService.updateInvoice(inv.id, updatedInv);
                updatedBills = updatedBills.map((b: any) => b.id === inv.id ? updatedInv : b);
              }
            }
            
            // Update local storage cache to keep everything in sync
            storage.set(STORAGE_KEYS.APPOINTMENTS, nextApts);
            storage.set(STORAGE_KEYS.BILLING, updatedBills);

            window.dispatchEvent(new CustomEvent('supabase-data-sync', { 
              detail: { table: 'invoices', action: 'update' } 
            }));
            window.dispatchEvent(new CustomEvent('supabase-data-sync', { 
              detail: { table: 'appointments', action: 'update' } 
            }));
          }
        }
      } catch (err) {
        console.error('Error syncing invoice refund:', err);
      }

      toast.success('Consultation fee refunded successfully');
    } else {
      toast.error('Failed to update refund status');
    }
  };

  const printAppointmentToken = (apt: any) => {
    const patName = patients.find(p => isPatientIdMatch(p.id, apt.patientId) || isPatientIdMatch(p.id, apt.patient_id))?.name || apt.patientName || 'WALK-IN PATIENT';
    const patMRN = patients.find(p => isPatientIdMatch(p.id, apt.patientId) || isPatientIdMatch(p.id, apt.patient_id))?.mrn || apt.patientMrn || 'N/A';
    
    const isA5 = tokenPrintSize === 'A5';
    const is80 = tokenPrintSize === 'thermal_80';
    const tokenHtml = isA5 ? `
      <html>
        <head>
          <title>OPD Consultation Token</title>
          <style>
            @page {
              size: A5 portrait;
              margin: 10mm;
            }
            body {
              font-family: 'Inter', -apple-system, sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 0;
              background: #ffffff;
            }
            .container {
              border: 2px solid #e2e8f0;
              border-radius: 12px;
              padding: 24px;
              height: calc(100% - 4px);
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              box-sizing: border-box;
            }
            .header {
              text-align: center;
              border-bottom: 2px dashed #cbd5e1;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .hospital-logo {
              font-size: 28px;
              margin-bottom: 4px;
            }
            .hospital-name {
              font-size: 22px;
              font-weight: 800;
              color: #1e3a8a;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .sub-title {
              font-size: 11px;
              font-weight: 600;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-top: 4px;
            }
            .token-container {
              text-align: center;
              background: #f1f5f9;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 18px;
              margin-bottom: 20px;
            }
            .token-label {
              font-size: 12px;
              font-weight: 700;
              color: #475569;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .token-num {
              font-size: 52px;
              font-weight: 900;
              color: #1e3a8a;
              margin: 8px 0;
            }
            .appointment-num {
              font-size: 11px;
              font-weight: 600;
              color: #64748b;
            }
            .details-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 15px;
              margin-bottom: 20px;
            }
            .detail-card {
              background: #fafafa;
              border: 1px solid #f1f5f9;
              border-radius: 6px;
              padding: 12px;
            }
            .info-label {
              font-size: 10px;
              font-weight: 700;
              color: #64748b;
              text-transform: uppercase;
              margin-bottom: 4px;
            }
            .info-val {
              font-size: 14px;
              font-weight: 600;
              color: #0f172a;
            }
            .footer {
              border-top: 2px dashed #cbd5e1;
              padding-top: 15px;
              text-align: center;
            }
            .footer-text {
              font-size: 11px;
              color: #64748b;
              line-height: 1.5;
            }
            .footer-salutation {
              font-size: 12px;
              font-weight: 800;
              color: #1e3a8a;
              margin-top: 8px;
              text-transform: uppercase;
            }
          </style>
        </head>
        <body onload="window.print();">
          <div class="container">
            <div>
              <div class="header">
                <div class="hospital-logo">🏥</div>
                <div class="hospital-name">NEW GASTRO PLUS HOSPITAL</div>
                <div class="sub-title">OPD CLINIC APPOINTMENT SLIP</div>
              </div>
              
              <div class="token-container">
                <div class="token-label">OPD CONSULTATION TOKEN</div>
                <div class="token-num">TK-${opdTokenMap[apt.id] || 1}</div>
                <div class="appointment-num">APPOINTMENT NO: #${appointmentSeqMap[apt.id] ? (1000 + appointmentSeqMap[apt.id]) : 'N/A'}</div>
              </div>
              
              <div class="details-grid">
                <div class="detail-card">
                  <div class="info-label">Patient Name</div>
                  <div class="info-val">${patName}</div>
                </div>
                <div class="detail-card">
                  <div class="info-label">Patient MRN</div>
                  <div class="info-val" style="font-family: monospace; font-weight: bold;">${patMRN}</div>
                </div>
                <div class="detail-card">
                  <div class="info-label">OPD Doctor</div>
                  <div class="info-val">${apt.doctor || 'Dr. Rajesh Sharma'}</div>
                </div>
                <div class="detail-card">
                  <div class="info-label">Session Date</div>
                  <div class="info-val">${apt.appointment_date || apt.date || new Date().toISOString().split('T')[0]}</div>
                </div>
                <div class="detail-card">
                  <div class="info-label">Time Block</div>
                  <div class="info-val">${apt.appointment_time || apt.time || '10:00 AM'}</div>
                </div>
                <div class="detail-card">
                  <div class="info-label">Urgency Level</div>
                  <div class="info-val">${apt.urgency || 'Routine'}</div>
                </div>
              </div>
            </div>
            
            <div class="footer">
              <div class="footer-text">Please present this slip at OPD Consultation chamber outer desk. Wait for your turn token call.</div>
              <div class="footer-salutation">Have a healthy day!</div>
            </div>
          </div>
        </body>
      </html>
    ` : is80 ? `
      <html>
        <head>
          <title>OPD Consultation Token</title>
          <style>
            @page { margin: 0; }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              width: 80mm; 
              padding: 8mm; 
              margin: 0;
              font-size: 13px;
              line-height: 1.3;
              text-align: center;
              color: #000;
            }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .token-num { font-size: 42px; font-weight: bold; margin: 15px 0; border: 2px solid #000; padding: 10px; display: inline-block; border-radius: 4px; }
            .header { margin-bottom: 12px; }
            .hospital-name { font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; }
            .info-row { text-align: left; margin: 6px 0; }
          </style>
        </head>
        <body onload="window.print();">
          <div class="header">
            <div class="hospital-name">NEW GASTRO PLUS HOSPITAL</div>
            <div style="font-size: 11px; margin-top: 4px; font-weight: bold;">OPD CLINIC APPOINTMENT SLIP</div>
          </div>
          <div>
            <div style="font-size: 12px; font-weight: bold;">SESSION DATE: ${apt.appointment_date || apt.date || new Date().toISOString().split('T')[0]}</div>
            <div style="font-size: 11px; margin-top: 4px; color: #333; font-weight: bold;">APPOINTMENT NO: #${appointmentSeqMap[apt.id] ? (1000 + appointmentSeqMap[apt.id]) : 'N/A'}</div>
            <div class="token-num">TK-${opdTokenMap[apt.id] || 1}</div>
          </div>
          <div class="divider"></div>
          <div style="text-align: left;">
            <div class="info-row"><span class="bold">PATIENT NAME :</span> ${patName}</div>
            <div class="info-row"><span class="bold">PATIENT MRN  :</span> ${patMRN}</div>
            <div class="info-row"><span class="bold">OPD DOCTOR   :</span> ${apt.doctor || 'Dr. Rajesh Sharma'}</div>
            <div class="info-row"><span class="bold">TIME BLOCK   :</span> ${apt.appointment_time || apt.time || '10:00 AM'}</div>
            <div class="info-row"><span class="bold">URGENCY LEVEL:</span> ${apt.urgency || 'Routine'}</div>
          </div>
          <div class="divider"></div>
          <div style="font-size: 10px; margin-top: 12px; line-height: 1.3;">
            Please present this slip at OPD Consultation chamber outer desk.<br>
            Please wait for your turn. Thank you!
          </div>
        </body>
      </html>
    ` : `
      <html>
        <head>
          <title>OPD Consultation Token</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; padding: 15px; color: #000; text-align: center; font-size: 11px; }
            .header { border-bottom: 2px dashed #333; padding-bottom: 8px; margin-bottom: 10px; }
            .hospital-name { font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; }
            .token-num { font-size: 32px; font-weight: 900; margin: 10px 0; border: 2px solid #000; padding: 4px 8px; display: inline-block; border-radius: 4px; }
            .info-row { text-align: left; font-size: 11px; margin: 4px 0; line-height: 1.3; }
            .info-label { font-weight: bold; text-transform: uppercase; color: #333; }
            .footer { border-top: 2px dashed #333; margin-top: 15px; padding-top: 8px; font-size: 9px; line-height: 1.3; color: #555; }
          </style>
        </head>
        <body onload="window.print();">
          <div class="header">
            <div class="hospital-name">NEW GASTRO PLUS HOSPITAL</div>
            <div style="font-size: 9px; font-weight: bold; margin-top: 2px; color: #444;">OPD CLINIC APPOINTMENT SLIP</div>
          </div>
          <div>
            <div style="font-size: 10px; font-weight: bold;">SESSION DATE: ${apt.appointment_date || apt.date || new Date().toISOString().split('T')[0]}</div>
            <div style="font-size: 9px; margin-top: 2px; color: #333; font-weight: bold;">APPOINTMENT NO: #${appointmentSeqMap[apt.id] ? (1000 + appointmentSeqMap[apt.id]) : 'N/A'}</div>
            <div class="token-num">TK-${opdTokenMap[apt.id] || 1}</div>
          </div>
          <div style="margin: 10px 0; border: 1px solid #eee; padding: 5px; border-radius: 4px;">
            <div class="info-row"><span class="info-label">PATIENT NAME :</span> ${patName}</div>
            <div class="info-row"><span class="info-label">PATIENT MRN  :</span> ${patMRN}</div>
            <div class="info-row"><span class="info-label">OPD DOCTOR   :</span> ${apt.doctor || 'Dr. Rajesh Sharma'}</div>
            <div class="info-row"><span class="info-label">TIME BLOCK   :</span> ${apt.appointment_time || apt.time || '10:00 AM'}</div>
            <div class="info-row"><span class="info-label">URGENCY LEVEL:</span> ${apt.urgency || 'Routine'}</div>
          </div>
          <div class="footer">
            <p>Please present this slip at OPD Consultation chamber outer desk. Wait for your turn token call.</p>
            <p style="font-weight: 900; color: #000; margin-top: 3px;">HAVE A HEALTHY DAY!</p>
          </div>
        </body>
      </html>
    `;
    safePrint(tokenHtml, isA5 ? 600 : is80 ? 450 : 300, isA5 ? 800 : is80 ? 600 : 400);
  };

  const printDailyOPDRegister = (targetDate?: string, doctorFilter?: string) => {
    const dateToPrint = targetDate || fromDateFilter || selectedDateFilter || getLocalDateString();
    const docToFilter = doctorFilter || selectedDoctorFilter || 'all';

    // Filter appointments
    const list = appointments.filter(apt => {
      const aDate = apt.appointment_date || apt.date || '';
      const matchesDate = !dateToPrint || aDate === dateToPrint || (fromDateFilter && toDateFilter && aDate >= fromDateFilter && aDate <= toDateFilter);
      const matchesDoctor = docToFilter === 'all' || 
        (apt.doctor || apt.doctorName || '').toLowerCase().trim() === docToFilter.toLowerCase().trim();
      return matchesDate && matchesDoctor;
    }).sort((a, b) => {
      const timeA = a.appointment_time || a.time || '00:00';
      const timeB = b.appointment_time || b.time || '00:00';
      return timeA.localeCompare(timeB);
    });

    if (list.length === 0) {
      toast.info(`No OPD appointments found for ${dateToPrint}`);
    }

    // Calculate totals
    const totalBookings = list.length;
    const routineCount = list.filter(a => (a.urgency || 'Routine') === 'Routine').length;
    const urgentCount = list.filter(a => a.urgency === 'Urgent' || a.urgency === 'Emergency').length;
    const totalFees = list.reduce((sum, a) => sum + Number(a.fee || 0), 0);

    const hospName = hospitalInfo?.name || 'Gastro Plus Hospital';
    const hospAddr = hospitalInfo?.address || 'Plot No. 7 & 8, Om Shiv Nagar, Gufa Mandir Road, Lal Ghati Bhopal, 462030, Madhya Pradesh';
    const hospPhone = hospitalInfo?.phone || '9109102145/9109101246';
    const hospEmail = hospitalInfo?.email || 'gatroplusbhopal@gmail.com';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Daily OPD Register - ${dateToPrint}</title>
          <meta charset="utf-8" />
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm 10mm 10mm 10mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            body {
              font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 0;
              background: #ffffff;
              font-size: 11.5px;
              line-height: 1.4;
            }
            .header-container {
              border-bottom: 2px solid #0f766e;
              padding-bottom: 10px;
              margin-bottom: 12px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .hosp-title {
              font-size: 20px;
              font-weight: 800;
              color: #0f766e;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin: 0 0 2px 0;
            }
            .hosp-sub {
              font-size: 11px;
              color: #475569;
              margin: 0;
            }
            .report-badge {
              text-align: right;
            }
            .report-title {
              font-size: 14px;
              font-weight: 800;
              color: #0f172a;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              background: #f0fdfa;
              padding: 4px 10px;
              border-radius: 6px;
              border: 1px solid #ccfbf1;
              display: inline-block;
            }
            .meta-bar {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 8px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 10px 12px;
              margin-bottom: 14px;
            }
            .meta-item {
              font-size: 11px;
            }
            .meta-label {
              font-size: 9.5px;
              font-weight: 700;
              color: #64748b;
              text-transform: uppercase;
              margin-bottom: 2px;
            }
            .meta-val {
              font-weight: 700;
              color: #0f172a;
            }
            table.register-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 14px;
            }
            table.register-table th {
              background-color: #0f766e;
              color: #ffffff;
              font-weight: 700;
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              padding: 6px 5px;
              text-align: left;
              border: 1px solid #0d9488;
            }
            table.register-table td {
              padding: 5px 5px;
              font-size: 10.5px;
              border: 1px solid #e2e8f0;
              vertical-align: middle;
            }
            table.register-table tr:nth-child(even) {
              background-color: #f8fafc;
            }
            .badge {
              display: inline-block;
              padding: 2px 5px;
              border-radius: 4px;
              font-size: 8.5px;
              font-weight: 700;
              text-transform: uppercase;
            }
            .badge-routine { background: #dcfce7; color: #166534; }
            .badge-urgent { background: #fef3c7; color: #92400e; }
            .badge-emergency { background: #fee2e2; color: #991b1b; }
            .token-pill {
              font-weight: 800;
              color: #0f766e;
              background: #f0fdfa;
              padding: 1px 4px;
              border-radius: 4px;
              border: 1px solid #ccfbf1;
              display: inline-block;
              font-family: monospace;
            }
            .summary-bar {
              display: flex;
              justify-content: space-between;
              align-items: center;
              background: #f0fdf4;
              border: 1px solid #bbf7d0;
              padding: 8px 12px;
              border-radius: 6px;
              margin-bottom: 20px;
              font-size: 11px;
              font-weight: 700;
              color: #166534;
            }
            .signature-section {
              display: flex;
              justify-content: space-between;
              margin-top: 30px;
              padding-top: 10px;
            }
            .sig-box {
              text-align: center;
              width: 180px;
              border-top: 1px dashed #94a3b8;
              padding-top: 5px;
              font-size: 10.5px;
              font-weight: 600;
              color: #475569;
            }
            .footer-note {
              text-align: center;
              font-size: 9px;
              color: #94a3b8;
              margin-top: 12px;
            }
          </style>
        </head>
        <body onload="window.print();">
          <div class="header-container">
            <div>
              <h1 class="hosp-title">${hospName}</h1>
              <p class="hosp-sub">${hospAddr} | Ph: ${hospPhone} | Email: ${hospEmail}</p>
            </div>
            <div class="report-badge">
              <div class="report-title">DAILY OPD REGISTER</div>
              <div style="font-size: 9.5px; color: #64748b; margin-top: 3px;">Generated: ${new Date().toLocaleString()}</div>
            </div>
          </div>

          <div class="meta-bar">
            <div class="meta-item">
              <div class="meta-label">Register Date</div>
              <div class="meta-val">${dateToPrint}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Doctor / Department</div>
              <div class="meta-val">${docToFilter === 'all' ? 'All OPD Doctors' : docToFilter}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Total Outpatients</div>
              <div class="meta-val">${totalBookings} Patients (${routineCount} Routine, ${urgentCount} Urgent)</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Total OPD Fees</div>
              <div class="meta-val" style="color: #0f766e;">₹${totalFees.toLocaleString('en-IN')}</div>
            </div>
          </div>

          <table class="register-table">
            <thead>
              <tr>
                <th style="width: 7%; text-align: center;">Token</th>
                <th style="width: 9%;">Time</th>
                <th style="width: 13%;">MRN</th>
                <th style="width: 18%;">Patient Name</th>
                <th style="width: 9%;">Age/Gen</th>
                <th style="width: 12%;">Contact</th>
                <th style="width: 17%;">Doctor</th>
                <th style="width: 7%;">Urgency</th>
                <th style="width: 8%; text-align: right;">Fee (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${list.length > 0 ? list.map((apt, idx) => {
                const p = patients.find(pat => isPatientIdMatch(pat.id, apt.patientId) || isPatientIdMatch(pat.id, apt.patient_id));
                const patName = p?.name || apt.patientName || 'Unknown';
                const patMrn = p?.mrn || apt.patientMrn || 'N/A';
                const patAge = p?.age ? `${p.age}y` : (apt.age ? `${apt.age}y` : '-');
                const patGen = p?.gender ? (p.gender === 'male' ? 'M' : p.gender === 'female' ? 'F' : 'O') : '-';
                const patPhone = p?.phone || apt.patientPhone || '-';
                const docName = apt.doctor || apt.doctorName || 'Duty Doctor';
                const timeSlot = apt.appointment_time || apt.time || '10:00 AM';
                const tokenNum = opdTokenMap[apt.id] ? `TK-${opdTokenMap[apt.id]}` : `TK-${idx + 1}`;
                const urgency = apt.urgency || 'Routine';
                const urgencyClass = urgency === 'Emergency' ? 'badge-emergency' : urgency === 'Urgent' ? 'badge-urgent' : 'badge-routine';
                const fee = apt.fee !== undefined ? `₹${Number(apt.fee)}` : '-';

                return `
                  <tr>
                    <td style="text-align: center;"><span class="token-pill">${tokenNum}</span></td>
                    <td>${timeSlot}</td>
                    <td style="font-family: monospace; font-weight: 600;">${patMrn}</td>
                    <td><strong>${patName}</strong></td>
                    <td>${patAge} / ${patGen}</td>
                    <td>${patPhone}</td>
                    <td>${docName}</td>
                    <td><span class="badge ${urgencyClass}">${urgency}</span></td>
                    <td style="text-align: right; font-weight: 600;">${fee}</td>
                  </tr>
                `;
              }).join('') : `
                <tr>
                  <td colspan="9" style="text-align: center; padding: 20px; color: #64748b;">
                    No Outpatient Appointments scheduled for this date.
                  </td>
                </tr>
              `}
            </tbody>
          </table>

          <div class="summary-bar">
            <div>TOTAL REGISTERED PATIENTS: <strong>${totalBookings}</strong></div>
            <div>ROUTINE: <strong>${routineCount}</strong> | URGENT/EMERGENCY: <strong>${urgentCount}</strong></div>
            <div>ESTIMATED REVENUE: <strong>₹${totalFees.toLocaleString('en-IN')}</strong></div>
          </div>

          <div class="signature-section">
            <div class="sig-box">OPD Receptionist / In-Charge</div>
            <div class="sig-box">Duty Medical Officer / Doctor</div>
            <div class="sig-box">Hospital Administrator</div>
          </div>

          <div class="footer-note">
            This is a computer-generated Outpatient Department daily register from ${hospName}.
          </div>
        </body>
      </html>
    `;

    safePrint(html, 900, 1000);
  };

  const printLatestPrescriptionForPatient = (patient: any, doctorNameFallback?: string) => {
    if (!patient) {
      toast.error('Patient record not found');
      return;
    }

    const patientPrescriptions = savedPrescriptions
      .filter(rx => {
        const rxPatId = rx.patientId || rx.patient_id;
        const rxPatName = rx.patient_name || rx.patientName || rx.patients?.name;
        const rxPatMrn = rx.patient_mrn || rx.patientMrn || rx.patients?.mrn;
        
        return isPatientIdMatch(rxPatId, patient.id) || 
          (rxPatName && patient.name && rxPatName.toLowerCase().trim() === patient.name.toLowerCase().trim()) ||
          (rxPatMrn && patient.mrn && rxPatMrn.toLowerCase().trim() === patient.mrn.toLowerCase().trim());
      })
      .sort((a, b) => new Date(b.date || b.prescription_date || 0).getTime() - new Date(a.date || a.prescription_date || 0).getTime());

    let latestRx = patientPrescriptions[0];
    if (!latestRx) {
      latestRx = {
        date: getLocalDateString(),
        medicines: [],
        advice: '',
        doctor: doctorNameFallback || 'Attending Doctor',
        vitals: undefined
      };
      toast.info('No existing prescription found; printing empty prescription pad for patient.');
    }

    const docObj = users.find(u => u.name === (latestRx.doctor || latestRx.doctor_name || doctorNameFallback));
    const latestVitals = selectedPatientVitals && selectedPatientVitals.length > 0 ? selectedPatientVitals[0] : undefined;

    const unpacked = deserializePrescriptionAdvice(latestRx.advice || latestRx.notes || '');
    const html = getPrescriptionPrintHtml(
      {
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        mrn: patient.mrn,
        phone: patient.phone || patient.mobile || '',
        fatherName: patient.fatherName || patient.father_name || '',
        allergies: patient.allergies || (patient as any).known_allergies || (patient as any).allergies_list,
        pastHistory: patient.pastHistory || (patient as any).medical_history || (patient as any).past_history || (patient as any).history,
        medicalHistory: patient.medicalHistory,
        complaints: (patient as any).complaints || (patient as any).presentingComplaints
      },
      {
        date: latestRx.date || latestRx.prescription_date || getLocalDateString(),
        medicines: latestRx.medicines || latestRx.medications || [],
        advice: unpacked.advice || latestRx.advice || '',
        examinationFindings: unpacked.examinationFindings || latestRx.examinationFindings || latestRx.findings || '',
        pastHistory: unpacked.pastHistory || latestRx.pastHistory || patient.pastHistory || (patient as any).medical_history || '',
        allergies: unpacked.allergies || latestRx.allergies || patient.allergies || '',
        complaints: unpacked.complaints || latestRx.complaints || (patient as any).complaints || (patient as any).presentingComplaints || '',
        investigationsAdvised: unpacked.investigationsAdvised || latestRx.investigationsAdvised || latestRx.investigations || '',
        drawing: unpacked.drawing || latestRx.drawing || '',
        diagnosis: unpacked.diagnosis || latestRx.diagnosis || '',
        photos: (unpacked.photos && unpacked.photos.length > 0) ? unpacked.photos : (latestRx.photos || []),
        attachmentUrl: unpacked.attachmentUrl || latestRx.attachmentUrl || latestRx.attachment_url || '',
        attachmentName: unpacked.attachmentName || latestRx.attachmentName || latestRx.attachment_name || '',
        vitals: {
          ...(latestVitals || {}),
          ...(latestRx.vitals || {})
        },
        planSurgeryNeeded: unpacked.planSurgeryNeeded || latestRx.planSurgeryNeeded || false,
        plannedSurgeryName: unpacked.plannedSurgeryName || latestRx.plannedSurgeryName || '',
        plannedSurgeryDate: unpacked.plannedSurgeryDate || latestRx.plannedSurgeryDate || '',
        plannedSurgeryNotes: unpacked.plannedSurgeryNotes || latestRx.plannedSurgeryNotes || '',
        admitNeeded: unpacked.admitNeeded || latestRx.admitNeeded || 'No',
        admitReason: unpacked.admitReason || latestRx.admitReason || '',
        admitWardType: unpacked.admitWardType || latestRx.admitWardType || ''
      },
      docObj,
      hospitalInfo
    );

    safePrint(html, 800, 1000);
  };

  const handleExportData = () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let filename = '';

    if (activeTab === 'patients') {
      const filteredPatients = patients.filter(p => {
        if (!patientRecordsSearchQuery.trim()) return true;
        const query = patientRecordsSearchQuery.toLowerCase();
        return (p.name || '').toLowerCase().includes(query) ||
               (p.mrn || '').toLowerCase().includes(query) ||
               (p.phone || '').includes(query);
      });

      headers = ['MRN', 'Name', 'Age', 'Gender', 'Phone', 'Last Visit'];
      rows = filteredPatients.map(p => [
        p.mrn || '', 
        p.name || '', 
        p.age || '', 
        p.gender || '', 
        p.phone || '', 
        p.created_at || p.registration_date ? new Date(p.created_at || p.registration_date).toLocaleDateString() : 'N/A'
      ]);
      filename = 'patient_records.csv';
    } else {
      headers = ['Appt No', 'Token', 'Patient Name', 'MRN', 'Doctor', 'Department', 'Date', 'Time', 'Status', 'Payment Status', 'Urgency'];
      rows = filteredAppointments.map((apt, i) => {
        const apptNo = `#${appointmentSeqMap[apt.id] ? (1000 + appointmentSeqMap[apt.id]) : (100 + i + 1)}`;
        const tokenNum = `TK-${opdTokenMap[apt.id] || 1}`;
        const patientName = apt.patientName || '';
        const patientMrn = apt.patientMrn || '';
        const docObj = findDoctor(apt.doctor || apt.doctorName || apt.doctor_id);
        const doctorName = docObj?.name || apt.doctor || apt.doctorName || 'Duty Doctor';
        const department = apt.doctorDepartment || apt.doctor_department || apt.department || docObj?.department || users.find(u => u.name === doctorName || u.id === apt.doctor_id)?.department || 'General Medicine';
        const apptDate = apt.appointment_date || '';
        const apptTime = apt.appointment_time || apt.appointmentTime || apt.time || 'N/A';
        const status = apt.status || '';
        const paymentStatus = apt.payment_status || '';
        const urgency = apt.urgency || '';

        return [
          apptNo,
          tokenNum,
          patientName,
          patientMrn,
          doctorName,
          department,
          apptDate,
          apptTime,
          status,
          paymentStatus,
          urgency
        ];
      });
      filename = activeTab === 'queue' ? 'live_queue.csv' : 'appointments.csv';
    }
    
    const csvContent = [headers, ...rows].map(e => e.map(val => {
      const strVal = val === null || val === undefined ? '' : String(val);
      return `"${strVal.replace(/"/g, '""')}"`;
    }).join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} exported successfully`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-medical-blue" />
        <p className="text-muted-foreground animate-pulse">Loading OPD records...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Dynamic, Vibrant, Richly Colored Banner Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-600 via-emerald-600 to-cyan-500 text-white p-6 sm:p-8 shadow-xl shadow-teal-100 animate-in fade-in duration-500">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none"></div>
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-[10px] font-black tracking-widest bg-white/20 text-white px-3 py-1 rounded-full uppercase my-1 select-none w-fit">
              ★ CLINICAL PORTAL ACTIVE
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl text-white">
              OPD Management
            </h1>
            <p className="text-teal-50 text-sm font-medium max-w-xl">
              Manage outpatient registrations, patient tokens, scheduled consults, and instant clinical check-ins effortlessly.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 shadow-inner">
            {!isAccountant && (
              <Button 
                variant="outline" 
                className="gap-2 bg-white/10 text-white border-white/20 hover:bg-white hover:text-teal-900 rounded-xl font-bold h-10 shadow-xs" 
                onClick={() => printDailyOPDRegister(fromDateFilter || selectedDateFilter || getLocalDateString(), selectedDoctorFilter)}
                title="Print Daily Outpatient Register & Schedule"
              >
                <Printer className="w-4 h-4" />
                Print Daily Register
              </Button>
            )}
            {!isAccountant && (
              <Button variant="outline" className="gap-2 bg-white/10 text-white border-white/20 hover:bg-white hover:text-teal-900 rounded-xl font-bold h-10" onClick={handleExportData}>
                <Download className="w-4 h-4" />
                Export {activeTab === 'patients' ? 'Records' : 'Queue'}
              </Button>
            )}
            {!isAccountant && !isDoctor && (
              <Button 
                className="bg-white text-teal-900 hover:bg-teal-50 gap-2 rounded-xl font-black h-10 shadow-md"
                onClick={() => handleOpenAppointmentChange(true)}
              >
                <CalendarIcon className="w-4 h-4" />
                Book Appointment
              </Button>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isAppointmentOpen} onOpenChange={handleOpenAppointmentChange}>
        <DialogContent className="sm:max-w-[500px] max-h-[96vh] flex flex-col">
          <DialogHeader className="shrink-0 mb-1">
            <DialogTitle>{editingAppointment ? 'Edit Appointment' : 'Book New Appointment'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 flex-1 overflow-y-auto custom-scrollbar pr-2 max-h-[calc(96vh-170px)]">
                  <div className="space-y-2 relative">
                    <Label>Patient (Search by Name or Phone)</Label>
                    <div className="relative">
                      <Input 
                        placeholder="Start typing name or phone..." 
                        value={patientSearchTerm}
                        onChange={(e) => {
                          setPatientSearchTerm(e.target.value);
                          setShowPatientResults(true);
                          // Clear selected patient if input is cleared
                          if (e.target.value === '') {
                            setNewAppointment({...newAppointment, patientId: ''});
                          }
                        }}
                        onFocus={() => setShowPatientResults(true)}
                      />
                      <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    </div>
                    
                    {showPatientResults && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-[220px] overflow-y-auto custom-scrollbar">
                        {(() => {
                          const filtered = patientSearchTerm.trim().length > 0
                            ? patients.filter(p => 
                                p.name.toLowerCase().includes(patientSearchTerm.toLowerCase()) || 
                                (p.phone || '').includes(patientSearchTerm) ||
                                (p.mrn || '').toLowerCase().includes(patientSearchTerm.toLowerCase())
                              )
                            : patients.slice(0, 10);
                          
                          if (filtered.length === 0) {
                            return (
                              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                                No patients found.
                                {!isDoctor && (
                                  <Button 
                                    variant="link" 
                                    size="sm" 
                                    className="text-medical-blue block mx-auto mt-1"
                                    onClick={() => {
                                      setIsAppointmentOpen(false);
                                      setIsRegisterOpen(true);
                                      setNewPatient({...newPatient, name: patientSearchTerm});
                                    }}
                                  >
                                    Register New Patient
                                  </Button>
                                )}
                              </div>
                            );
                          }

                          return filtered.map(p => (
                            <div 
                              key={p.id} 
                              className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer flex justify-between items-center border-b border-slate-100 last:border-0 transition-colors"
                              onClick={() => {
                                const docToSelect = newAppointment.doctor || allDoctors[0]?.name || 'Dr. Rajesh Sharma';
                                setNewAppointment(prev => ({
                                  ...prev,
                                  patientId: p.id,
                                  doctor: prev.doctor || docToSelect,
                                  date: prev.date || getLocalDateString(),
                                  time: prev.time || '10:00 AM'
                                }));
                                setPatientSearchTerm(p.name);
                                setShowPatientResults(false);
                                const matchedDoc = findDoctor(docToSelect);
                                if (matchedDoc) {
                                  setSelectedApptFees(prev => ({
                                    ...prev,
                                    consult: {
                                      ...prev.consult,
                                      amount: matchedDoc.consultationFee !== undefined && matchedDoc.consultationFee !== null ? Number(matchedDoc.consultationFee) : 500
                                    }
                                  }));
                                }
                              }}
                            >
                              <div>
                                <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                                <p className="text-[11px] text-muted-foreground">{p.phone ? `Ph: ${p.phone} • ` : ''}MRN: {p.mrn || 'N/A'}{p.age ? ` • ${p.age}y` : ''}{p.gender ? ` • ${p.gender}` : ''}</p>
                              </div>
                              {newAppointment.patientId === p.id && <CheckCircle2 className="w-4 h-4 text-medical-blue" />}
                            </div>
                          ));
                        })()}
                      </div>
                    )}

                    {(() => {
                      const selectedPat = getSelectedPatient(newAppointment.patientId);
                      if (!selectedPat) return null;
                      return (
                        <div className="mt-2 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 shadow-xs">
                          <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shrink-0 shadow-xs">
                            {selectedPat.name ? selectedPat.name.charAt(0).toUpperCase() : <User className="h-5 w-5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-slate-900 truncate">
                                {selectedPat.name}
                              </p>
                              <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200 shrink-0">
                                MRN: {selectedPat.mrn || 'N/A'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 truncate mt-0.5">
                              {selectedPat.age ? `${selectedPat.age} yrs` : ''} {selectedPat.gender ? `• ${selectedPat.gender}` : ''} {selectedPat.phone ? `• Ph: ${selectedPat.phone}` : ''}
                            </p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0"
                            title="Clear Selected Patient"
                            onClick={() => {
                              setNewAppointment({...newAppointment, patientId: ''});
                              setPatientSearchTerm('');
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="font-semibold text-slate-800">Doctor *</Label>
                      <span className="text-[11px] text-slate-500 font-medium">{allDoctors.length} doctors available</span>
                    </div>
                    <Select 
                      value={newAppointment.doctor}
                      onValueChange={(v) => handleSelectDoctorForAppointment(v)}
                    >
                      <SelectTrigger className="bg-white border-slate-200">
                        <SelectValue placeholder="Select doctor" />
                      </SelectTrigger>
                      <SelectContent className="z-[99999] max-h-[300px] overflow-y-auto">
                        {allDoctors.map(doc => (
                          <SelectItem key={doc.id || doc.name} value={doc.name}>
                            <div className="flex items-center justify-between gap-3 w-full py-0.5">
                              <div className="flex flex-col text-left">
                                <span className="font-semibold text-slate-900">{doc.name} {doc.degree ? ` - ${doc.degree}` : ''}</span>
                                <span className="text-[11px] text-slate-500">
                                  {doc.department} {doc.specialization ? `• ${doc.specialization}` : ''}
                                </span>
                              </div>
                              {doc.consultationFee !== undefined && doc.consultationFee !== null ? (
                                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0 ml-2">
                                  ₹{doc.consultationFee}
                                </span>
                              ) : null}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Quick Doctor Badges */}
                    <div className="pt-1">
                      <p className="text-[11px] text-slate-500 mb-1.5 font-medium">Quick Pick Doctor:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {allDoctors.slice(0, 6).map(doc => {
                          const isSelected = newAppointment.doctor === doc.name;
                          return (
                            <button
                              key={doc.id || doc.name}
                              type="button"
                              onClick={() => handleSelectDoctorForAppointment(doc.name)}
                              className={`text-xs px-2.5 py-1 rounded-md border transition-all text-left flex items-center gap-1.5 ${
                                isSelected 
                                  ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs' 
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                              }`}
                            >
                              <span className="truncate">{doc.name.replace('Dr. ', '')}</span>
                              {doc.consultationFee !== undefined && doc.consultationFee !== null ? <span className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>₹{doc.consultationFee}</span> : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input 
                        type="date" 
                        value={newAppointment.date}
                        onChange={(e) => setNewAppointment({...newAppointment, date: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Time Slot</Label>
                      <Input 
                        type="time" 
                        value={newAppointment.time}
                        onChange={(e) => setNewAppointment({...newAppointment, time: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="border bg-slate-50/50 p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-black uppercase text-slate-700 tracking-wider">Applicable Fees / Charges Config</Label>
                      <span className="text-[10px] text-slate-500 font-medium">Editable amounts</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Select applicable fee heads and customize amounts if required for this appointment.</p>
                    
                    {/* Row 1: Registration Fee */}
                    <div className="flex items-center justify-between gap-4 bg-white p-2 rounded-lg border border-slate-200/80">
                      <div className="flex items-center gap-2">
                        <input 
                          id="appt-reg-fee-chk"
                          type="checkbox" 
                          checked={!!selectedApptFees.reg.checked}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setSelectedApptFees(prev => ({
                              ...prev, 
                              reg: { ...prev.reg, checked: isChecked }
                            }));
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-medical-blue focus:ring-medical-blue cursor-pointer"
                        />
                        <Label htmlFor="appt-reg-fee-chk" className="text-xs font-bold text-slate-700 cursor-pointer">OPD Follow UP Fee</Label>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-400">₹</span>
                        <Input 
                          type="number"
                          min="0"
                          value={selectedApptFees.reg.amount === '' ? '' : selectedApptFees.reg.amount}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSelectedApptFees(prev => ({
                              ...prev, 
                              reg: { ...prev.reg, amount: val === '' ? '' : Number(val) }
                            }));
                          }}
                          className="w-24 h-8 text-xs text-right font-bold bg-white"
                        />
                      </div>
                    </div>

                    {/* Row 2: Appt Fee */}
                    <div className="flex items-center justify-between gap-4 bg-white p-2 rounded-lg border border-slate-200/80">
                      <div className="flex items-center gap-2">
                        <input 
                          id="appt-appt-fee-chk"
                          type="checkbox" 
                          checked={!!selectedApptFees.appt.checked}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setSelectedApptFees(prev => ({
                              ...prev, 
                              appt: { ...prev.appt, checked: isChecked }
                            }));
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-medical-blue focus:ring-medical-blue cursor-pointer"
                        />
                        <Label htmlFor="appt-appt-fee-chk" className="text-xs font-bold text-slate-700 cursor-pointer">Appointment Fee</Label>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-400">₹</span>
                        <Input 
                          type="number"
                          min="0"
                          value={selectedApptFees.appt.amount === '' ? '' : selectedApptFees.appt.amount}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSelectedApptFees(prev => ({
                              ...prev, 
                              appt: { ...prev.appt, amount: val === '' ? '' : Number(val) }
                            }));
                          }}
                          className="w-24 h-8 text-xs text-right font-bold bg-white"
                        />
                      </div>
                    </div>

                    {/* Row 3: Consult Fee */}
                    <div className="flex items-center justify-between gap-4 bg-white p-2 rounded-lg border border-slate-200/80">
                      <div className="flex items-center gap-2">
                        <input 
                          id="appt-consult-fee-chk"
                          type="checkbox" 
                          checked={!!selectedApptFees.consult.checked}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setSelectedApptFees(prev => ({
                              ...prev, 
                              consult: { ...prev.consult, checked: isChecked }
                            }));
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-medical-blue focus:ring-medical-blue cursor-pointer"
                        />
                        <Label htmlFor="appt-consult-fee-chk" className="text-xs font-bold text-slate-700 cursor-pointer">Doctor Consultation Fee</Label>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-400">₹</span>
                        <Input 
                          type="number"
                          min="0"
                          value={selectedApptFees.consult.amount === '' ? '' : selectedApptFees.consult.amount}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSelectedApptFees(prev => ({
                              ...prev, 
                              consult: { ...prev.consult, amount: val === '' ? '' : Number(val) }
                            }));
                            if (val !== '') {
                              setAppointmentFee(Number(val));
                            }
                          }}
                          className="w-24 h-8 text-xs text-right font-bold bg-white"
                        />
                      </div>
                    </div>

                    {/* Summary Total */}
                    <div className="flex justify-between items-center border-t border-slate-200 mt-2 pt-2 text-xs font-black text-slate-700 uppercase tracking-widest">
                      <span>Total Assigned Charges</span>
                      <span className="text-medical-blue text-sm font-black">
                        ₹{(
                          (selectedApptFees.reg.checked ? (Number(selectedApptFees.reg.amount) || 0) : 0) +
                          (selectedApptFees.appt.checked ? (Number(selectedApptFees.appt.amount) || 0) : 0) +
                          (selectedApptFees.consult.checked ? (Number(selectedApptFees.consult.amount) || 0) : 0)
                        )}
                      </span>
                    </div>

                    {Number(newAppointment.discountAmount || 0) > 0 && (
                      <div className="flex justify-between items-center text-xs font-black text-amber-600 uppercase tracking-widest mt-1">
                        <span>Discount Applied</span>
                        <span>-₹{Number(newAppointment.discountAmount || 0)}</span>
                      </div>
                    )}

                    {Number(newAppointment.discountAmount || 0) > 0 && (
                      <div className="flex justify-between items-center border-t border-dashed border-slate-300 text-xs font-black text-slate-800 uppercase tracking-widest mt-1 pt-1">
                        <span>Net Total</span>
                        <span className="text-emerald-600 font-extrabold text-sm">
                          ₹{Math.max(0, (
                            (selectedApptFees.reg.checked ? selectedApptFees.reg.amount : 0) +
                            (selectedApptFees.appt.checked ? selectedApptFees.appt.amount : 0) +
                            (selectedApptFees.consult.checked ? selectedApptFees.consult.amount : 0)
                          ) - Number(newAppointment.discountAmount || 0))}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 border bg-amber-50/40 p-4 rounded-xl">
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase text-amber-700 tracking-wider">Discount (₹)</Label>
                      <Input 
                        type="number"
                        min="0"
                        placeholder="0"
                        value={newAppointment.discountAmount || '0'}
                        onChange={(e) => setNewAppointment({...newAppointment, discountAmount: e.target.value})}
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase text-amber-700 tracking-wider">Authorized / Given By</Label>
                      <Input 
                        placeholder={currentUser?.name || "Select staff"}
                        value={newAppointment.discountGivenBy || ''}
                        onChange={(e) => setNewAppointment({...newAppointment, discountGivenBy: e.target.value})}
                        className="bg-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Priority / Urgency</Label>
                    <Select 
                      value={newAppointment.urgency}
                      onValueChange={(v) => setNewAppointment({...newAppointment, urgency: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select urgency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Routine">🟢 Routine</SelectItem>
                        <SelectItem value="Follow up">🔵 Follow up</SelectItem>
                        <SelectItem value="Urgent">🟡 Urgent</SelectItem>
                        <SelectItem value="Emergency">🔴 Emergency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="shrink-0 mt-auto pt-3 border-t flex flex-wrap items-center justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAppointmentOpen(false)}>Cancel</Button>
                  {editingAppointment && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold gap-1.5"
                      onClick={() => printAppointmentToken(editingAppointment)}
                      title="Print Token Slip for this appointment"
                    >
                      <Printer className="w-4 h-4 text-slate-600" />
                      Print Slip
                    </Button>
                  )}
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="border-teal-600 text-teal-700 hover:bg-teal-50 font-bold gap-1.5" 
                    onClick={() => handleBookAppointment(true)}
                  >
                    <Printer className="w-4 h-4" />
                    {editingAppointment ? 'Save & Print Slip' : 'Confirm & Print Slip'}
                  </Button>
                  <Button className="bg-medical-blue font-bold" onClick={() => handleBookAppointment(false)}>
                    {editingAppointment ? 'Save Changes' : 'Confirm Booking & Token'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isRegisterOpen} onOpenChange={handleOpenRegisterChange}>
              {!isAccountant && (
                <DialogTrigger asChild>
                  <Button className="bg-medical-blue gap-2">
                    <UserPlus className="w-4 h-4" />
                    New Registration
                  </Button>
                </DialogTrigger>
              )}
              <DialogContent 
                className="sm:max-w-[700px] max-h-[96vh] flex flex-col"
              >
                <DialogHeader className="shrink-0 mb-1">
                  <DialogTitle>{editingPatient ? 'Edit Patient Information' : 'Patient Registration'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4 flex-1 overflow-y-auto custom-scrollbar pr-2 max-h-[calc(96vh-170px)]">
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input 
                        id="name" 
                        placeholder="Enter patient name" 
                        value={newPatient.name}
                        onChange={(e) => setNewPatient({...newPatient, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input 
                        id="phone" 
                        placeholder="Enter phone number" 
                        value={newPatient.phone}
                        onChange={(e) => setNewPatient({...newPatient, phone: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input 
                        id="email" 
                        type="email"
                        placeholder="patient@example.com" 
                        value={newPatient.email}
                        onChange={(e) => setNewPatient({...newPatient, email: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dob">Date of Birth</Label>
                      <Input 
                        id="dob" 
                        type="date" 
                        value={newPatient.dob}
                        onChange={(e) => {
                          const dob = e.target.value;
                          const age = calculateAge(dob);
                          setNewPatient({...newPatient, dob, age});
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="age">Age (Auto-calculated)</Label>
                      <Input 
                        id="age" 
                        type="number" 
                        placeholder="Age" 
                        value={newPatient.age}
                        onChange={(e) => setNewPatient({...newPatient, age: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                      <Select 
                        value={newPatient.gender}
                        onValueChange={(v) => setNewPatient({...newPatient, gender: v})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bloodGroup">Blood Group</Label>
                      <Select 
                        value={newPatient.bloodGroup}
                        onValueChange={(v) => setNewPatient({...newPatient, bloodGroup: v})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select blood group" />
                        </SelectTrigger>
                        <SelectContent>
                          {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                            <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Relative 1 Entry */}
                    <div className="col-span-2 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <Label className="font-bold text-xs text-slate-800 uppercase tracking-wide block">
                        Relative 1 Details
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="rel1Relation" className="text-xs font-semibold text-slate-700">Relation</Label>
                          <Select
                            value={newPatient.relative1Relation || 'Father'}
                            onValueChange={(v) => setNewPatient({ ...newPatient, relative1Relation: v })}
                          >
                            <SelectTrigger id="rel1Relation" className="bg-white text-xs h-9">
                              <SelectValue placeholder="Select relation" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Father">Father</SelectItem>
                              <SelectItem value="Mother">Mother</SelectItem>
                              <SelectItem value="Husband">Husband</SelectItem>
                              <SelectItem value="Wife">Wife</SelectItem>
                              <SelectItem value="Son">Son</SelectItem>
                              <SelectItem value="Daughter">Daughter</SelectItem>
                              <SelectItem value="Others">Others</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="rel1Name" className="text-xs font-semibold text-slate-700">Relative 1 Name</Label>
                          <Input
                            id="rel1Name"
                            placeholder="Relative 1 Name"
                            value={newPatient.relative1Name || ''}
                            onChange={(e) => setNewPatient({ ...newPatient, relative1Name: e.target.value })}
                            className="bg-white text-xs h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="rel1Phone" className="text-xs font-semibold text-slate-700">Contact No.</Label>
                          <Input
                            id="rel1Phone"
                            placeholder="Contact No."
                            value={newPatient.relative1Phone || ''}
                            onChange={(e) => setNewPatient({ ...newPatient, relative1Phone: e.target.value })}
                            className="bg-white text-xs h-9"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Relative 2 Entry */}
                    <div className="col-span-2 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <Label className="font-bold text-xs text-slate-800 uppercase tracking-wide block">
                        Relative 2 Details
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="rel2Relation" className="text-xs font-semibold text-slate-700">Relation</Label>
                          <Select
                            value={newPatient.relative2Relation || 'Mother'}
                            onValueChange={(v) => setNewPatient({ ...newPatient, relative2Relation: v })}
                          >
                            <SelectTrigger id="rel2Relation" className="bg-white text-xs h-9">
                              <SelectValue placeholder="Select relation" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Father">Father</SelectItem>
                              <SelectItem value="Mother">Mother</SelectItem>
                              <SelectItem value="Husband">Husband</SelectItem>
                              <SelectItem value="Wife">Wife</SelectItem>
                              <SelectItem value="Son">Son</SelectItem>
                              <SelectItem value="Daughter">Daughter</SelectItem>
                              <SelectItem value="Others">Others</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="rel2Name" className="text-xs font-semibold text-slate-700">Relative 2 Name</Label>
                          <Input
                            id="rel2Name"
                            placeholder="Relative 2 Name"
                            value={newPatient.relative2Name || ''}
                            onChange={(e) => setNewPatient({ ...newPatient, relative2Name: e.target.value })}
                            className="bg-white text-xs h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="rel2Phone" className="text-xs font-semibold text-slate-700">Contact No.</Label>
                          <Input
                            id="rel2Phone"
                            placeholder="Contact No."
                            value={newPatient.relative2Phone || ''}
                            onChange={(e) => setNewPatient({ ...newPatient, relative2Phone: e.target.value })}
                            className="bg-white text-xs h-9"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="urgency">Urgency</Label>
                      <Select 
                        value={newPatient.urgency}
                        onValueChange={(v) => setNewPatient({...newPatient, urgency: v})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select urgency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Routine">🟢 Routine</SelectItem>
                          <SelectItem value="Follow up">🔵 Follow up</SelectItem>
                          <SelectItem value="Urgent">🟡 Urgent</SelectItem>
                          <SelectItem value="Emergency">🔴 Emergency</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input 
                        id="address" 
                        placeholder="Full residential address" 
                        value={newPatient.address}
                        onChange={(e) => setNewPatient({...newPatient, address: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tpaId">TPA (Number) ID</Label>
                      <Input 
                        id="tpaId" 
                        placeholder="TPA ID" 
                        value={newPatient.tpaId}
                        onChange={(e) => setNewPatient({...newPatient, tpaId: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tpaValidity">TPA Validity</Label>
                      <Input 
                        id="tpaValidity" 
                        type="date"
                        value={newPatient.tpaValidity}
                        onChange={(e) => setNewPatient({...newPatient, tpaValidity: e.target.value})}
                      />
                    </div>

                    <div className="col-span-2 border-t pt-4 mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <input 
                          type="checkbox" 
                          id="isReferral" 
                          className="h-4 w-4 rounded border-slate-300 text-medical-blue focus:ring-medical-blue cursor-pointer"
                          checked={newPatient.isReferral}
                          onChange={(e) => setNewPatient({...newPatient, isReferral: e.target.checked})}
                        />
                        <div className="grid gap-1.5 leading-none cursor-pointer select-none" onClick={() => setNewPatient({...newPatient, isReferral: !newPatient.isReferral})}>
                          <Label htmlFor="isReferral" className="font-semibold text-slate-800 cursor-pointer">Referral Case</Label>
                          <p className="text-xs text-slate-500">Mark if this patient was referred by another doctor/clinic.</p>
                        </div>
                      </div>

                      {newPatient.isReferral && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                          <Label htmlFor="referredBy" className="font-medium text-slate-700">Referred By (Doctor / Hospital)</Label>
                          <Input 
                            id="referredBy" 
                            placeholder="e.g., Dr. John Smith / Apex Clinic" 
                            value={newPatient.referredBy}
                            onChange={(e) => setNewPatient({...newPatient, referredBy: e.target.value})}
                            className="border-slate-300 focus:border-medical-blue focus:ring-medical-blue"
                          />
                        </div>
                      )}
                    </div>

                    <div className="col-span-2 border-t pt-4 mt-2 grid grid-cols-1 gap-4">
                      <div className="flex items-center space-x-3 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                        <input 
                          type="checkbox" 
                          id="bookImmediateAppointment" 
                          className="h-4 w-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          checked={newPatient.bookImmediateAppointment}
                          onChange={(e) => setNewPatient({...newPatient, bookImmediateAppointment: e.target.checked})}
                        />
                        <div className="grid gap-1.5 leading-none cursor-pointer select-none" onClick={() => setNewPatient({...newPatient, bookImmediateAppointment: !newPatient.bookImmediateAppointment})}>
                          <Label htmlFor="bookImmediateAppointment" className="font-bold text-indigo-900 cursor-pointer flex items-center gap-1.5">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-600 animate-ping"></span>
                            Book Appointment Immediately
                          </Label>
                          <p className="text-xs text-indigo-700">Check this to book an OPD appointment for this patient in one go.</p>
                        </div>
                      </div>

                      {newPatient.bookImmediateAppointment && (
                        <div className="p-4 bg-indigo-50/30 rounded-xl border border-indigo-100/50 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                          <h4 className="text-xs font-black uppercase text-indigo-800 tracking-wider">OPD Appointment Details</h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="font-bold text-indigo-900">Doctor *</Label>
                              <Select 
                                value={newPatient.appointmentDoctor}
                                onValueChange={(v) => setNewPatient({...newPatient, appointmentDoctor: v})}
                              >
                                <SelectTrigger className="bg-white border-indigo-200">
                                  <SelectValue placeholder="Select doctor" />
                                </SelectTrigger>
                                <SelectContent className="z-[99999] max-h-[300px] overflow-y-auto">
                                  {allDoctors.map(doc => (
                                    <SelectItem key={doc.id || doc.name} value={doc.name}>
                                      <div className="flex items-center justify-between gap-3 w-full py-0.5">
                                        <div className="flex flex-col text-left">
                                          <span className="font-medium text-slate-900">{doc.name} {doc.degree ? ` - ${doc.degree}` : ''}</span>
                                          <span className="text-[10px] text-indigo-600">
                                            {doc.department} {doc.specialization ? `• ${doc.specialization}` : ''}
                                          </span>
                                        </div>
                                        {doc.consultationFee ? (
                                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200 shrink-0 ml-2">
                                            ₹{doc.consultationFee}
                                          </span>
                                        ) : null}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label className="font-bold text-indigo-900">Urgency</Label>
                              <Select 
                                value={newPatient.appointmentUrgency}
                                onValueChange={(v) => setNewPatient({...newPatient, appointmentUrgency: v})}
                              >
                                <SelectTrigger className="bg-white border-indigo-200">
                                  <SelectValue placeholder="Select urgency" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Routine">🟢 Routine</SelectItem>
                                  <SelectItem value="Follow up">🔵 Follow up</SelectItem>
                                  <SelectItem value="Urgent">🟡 Urgent</SelectItem>
                                  <SelectItem value="Emergency">🔴 Emergency</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label className="font-bold text-indigo-900">Date</Label>
                              <Input 
                                type="date" 
                                value={newPatient.appointmentDate}
                                onChange={(e) => setNewPatient({...newPatient, appointmentDate: e.target.value})}
                                className="bg-white border-indigo-200"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="font-bold text-indigo-900">Time Slot</Label>
                              <Input 
                                type="time" 
                                value={newPatient.appointmentTime}
                                onChange={(e) => setNewPatient({...newPatient, appointmentTime: e.target.value})}
                                className="bg-white border-indigo-200"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>


                  </div>
                </div>
                <DialogFooter className="shrink-0 mt-auto pt-2 border-t gap-2 flex-wrap sm:justify-end">
                  <Button variant="outline" onClick={() => setIsRegisterOpen(false)} disabled={isSubmitting}>Cancel</Button>
                  {editingPatient ? (
                    <Button className="bg-medical-blue font-semibold" onClick={() => handleRegistration(false)} disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Saving...
                        </>
                      ) : 'Save Changes'}
                    </Button>
                  ) : (
                    <>
                      <Button className="bg-medical-blue font-semibold text-white hover:bg-blue-700" onClick={() => handleRegistration(true)} disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Registering...
                          </>
                        ) : 'Register Patient'}
                      </Button>
                    </>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>

      <div className="flex flex-col md:flex-row gap-3 justify-between items-start md:items-center mb-4">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
          <Button 
            variant={activeTab === 'queue' ? 'secondary' : 'ghost'} 
            size="sm" 
            onClick={() => setActiveTab('queue')}
            className={activeTab === 'queue' ? 'bg-white shadow-sm' : ''}
          >
            Live Queue
          </Button>
          <Button 
            variant={activeTab === 'appointments' ? 'secondary' : 'ghost'} 
            size="sm" 
            onClick={() => setActiveTab('appointments')}
            className={activeTab === 'appointments' ? 'bg-white shadow-sm' : ''}
          >
            Appointments
          </Button>
          <Button 
            variant={activeTab === 'patients' ? 'secondary' : 'ghost'} 
            size="sm" 
            onClick={() => setActiveTab('patients')}
            className={activeTab === 'patients' ? 'bg-white shadow-sm' : ''}
          >
            Patient Records
          </Button>
          <Button 
            variant={activeTab === 'summary' ? 'secondary' : 'ghost'} 
            size="sm" 
            onClick={() => setActiveTab('summary')}
            className={activeTab === 'summary' ? 'bg-white shadow-sm' : ''}
          >
            OPD Summary
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/endoscopy')}
            className="text-sky-700 hover:bg-sky-100 font-extrabold gap-1"
          >
            <Microscope className="w-3.5 h-3.5 text-sky-600" />
            Direct Endoscopy Suite
          </Button>
        </div>

        {/* Token Print Settings Quick Switcher */}
        <div className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl shadow-sm">
          <Printer className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-semibold text-slate-600">Token Print Size:</span>
          <div className="flex gap-1 bg-slate-200/50 p-0.5 rounded-md">
            <button
              type="button"
              className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${tokenPrintSize === 'thermal' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              onClick={() => handleTokenSizeChange('thermal')}
            >
              Thermal (58mm)
            </button>
            <button
              type="button"
              className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${tokenPrintSize === 'thermal_80' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              onClick={() => handleTokenSizeChange('thermal_80')}
            >
              Thermal (80mm)
            </button>
            <button
              type="button"
              className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${tokenPrintSize === 'A5' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              onClick={() => handleTokenSizeChange('A5')}
            >
              A5 Size
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'summary' ? (
        <OPDSummaryView appointments={appointments} users={users} />
      ) : (
        <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-col space-y-3 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-[280px]">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by name, MRN, or phone..." 
                  className="pl-10 pr-8 bg-slate-50 border-slate-200 text-xs" 
                  value={patientRecordsSearchQuery}
                  onChange={(e) => setPatientRecordsSearchQuery(e.target.value)}
                />
                {patientRecordsSearchQuery && (
                  <button 
                    type="button"
                    onClick={() => setPatientRecordsSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {(activeTab === 'queue' || activeTab === 'appointments' || activeTab === 'patients') && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <Label className="text-xs shrink-0 font-medium text-slate-600">Doctor:</Label>
                  <Select value={selectedDoctorFilter} onValueChange={setSelectedDoctorFilter}>
                    <SelectTrigger className="w-[150px] h-8 bg-slate-50 border-slate-200 text-xs">
                      <SelectValue placeholder="All Doctors" />
                    </SelectTrigger>
                    <SelectContent className="z-[99999] max-h-[300px] overflow-y-auto">
                      <SelectItem value="all">All Doctors</SelectItem>
                      {allDoctors.map(doc => (
                        <SelectItem key={doc.id || doc.name} value={doc.name}>{doc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Quick Date Presets */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs gap-0.5">
                <button
                  type="button"
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${!fromDateFilter && !toDateFilter && !selectedDateFilter ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  onClick={() => {
                    setFromDateFilter('');
                    setToDateFilter('');
                    setSelectedDateFilter('');
                  }}
                >
                  {activeTab === 'queue' ? "Today's Queue" : 'All Dates'}
                </button>
                <button
                  type="button"
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${(fromDateFilter === getLocalDateString() && toDateFilter === getLocalDateString()) || selectedDateFilter === getLocalDateString() ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  onClick={() => {
                    const today = getLocalDateString();
                    setFromDateFilter(today);
                    setToDateFilter(today);
                    setSelectedDateFilter('');
                  }}
                >
                  Today
                </button>
                <button
                  type="button"
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${(() => {
                    const d = new Date();
                    const day = d.getDay();
                    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
                    const monday = new Date(d.setDate(diff));
                    const monStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
                    return fromDateFilter === monStr && toDateFilter === getLocalDateString();
                  })() ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  onClick={() => {
                    const today = getLocalDateString();
                    const d = new Date();
                    const day = d.getDay();
                    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
                    const monday = new Date(d.setDate(diff));
                    const monStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
                    setFromDateFilter(monStr);
                    setToDateFilter(today);
                    setSelectedDateFilter('');
                  }}
                >
                  This Week
                </button>
                <button
                  type="button"
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${(() => {
                    const d = new Date();
                    const firstDay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
                    return fromDateFilter === firstDay && toDateFilter === getLocalDateString();
                  })() ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  onClick={() => {
                    const today = getLocalDateString();
                    const d = new Date();
                    const firstDay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
                    setFromDateFilter(firstDay);
                    setToDateFilter(today);
                    setSelectedDateFilter('');
                  }}
                >
                  This Month
                </button>
              </div>

              {/* Date Range Inputs */}
              <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500">From:</span>
                <Input 
                  type="date" 
                  className="w-[120px] h-7 bg-white border-slate-200 text-xs px-1.5 py-0" 
                  value={fromDateFilter}
                  onChange={(e) => {
                    setFromDateFilter(e.target.value);
                    setSelectedDateFilter('');
                  }}
                />
                <span className="text-[11px] font-semibold text-slate-500">To:</span>
                <Input 
                  type="date" 
                  className="w-[120px] h-7 bg-white border-slate-200 text-xs px-1.5 py-0" 
                  value={toDateFilter}
                  onChange={(e) => {
                    setToDateFilter(e.target.value);
                    setSelectedDateFilter('');
                  }}
                />
                {(fromDateFilter || toDateFilter || selectedDateFilter) && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 text-[11px] font-medium"
                    onClick={() => {
                      setFromDateFilter('');
                      setToDateFilter('');
                      setSelectedDateFilter('');
                    }}
                    title="Clear Date Filter"
                  >
                    <X className="w-3 h-3 mr-0.5" />
                    Clear
                  </Button>
                )}
              </div>

              {/* Print Daily OPD Sheet */}
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 gap-1.5 bg-white border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs shrink-0 shadow-xs" 
                onClick={() => printDailyOPDRegister(fromDateFilter || selectedDateFilter || getLocalDateString(), selectedDoctorFilter)}
                title="Print Daily Outpatient Register / Schedule"
              >
                <Printer className="w-3.5 h-3.5 text-teal-700" />
                Print Daily Sheet
              </Button>

              {/* Advanced Filter Toggle Button */}
              <Button 
                variant={isFilterExpanded || (patientGenderFilter !== 'all' || patientStatusFilter !== 'all' || patientSortOrder !== 'newest') ? "default" : "outline"} 
                size="sm" 
                className={`h-8 gap-1.5 text-xs font-semibold shrink-0 ${isFilterExpanded || (patientGenderFilter !== 'all' || patientStatusFilter !== 'all' || patientSortOrder !== 'newest') ? "bg-medical-blue text-white hover:bg-medical-blue/90" : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"}`}
                onClick={() => setIsFilterExpanded(prev => !prev)}
                title="Toggle Advanced Filters"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filters
                {(patientGenderFilter !== 'all' || patientStatusFilter !== 'all' || patientSortOrder !== 'newest' || selectedDoctorFilter !== 'all' || fromDateFilter || toDateFilter) && (
                  <span className="ml-1 px-1.5 py-0.2 bg-amber-400 text-slate-900 text-[10px] font-black rounded-full">
                    {[
                      patientGenderFilter !== 'all',
                      patientStatusFilter !== 'all',
                      patientSortOrder !== 'newest',
                      selectedDoctorFilter !== 'all',
                      Boolean(fromDateFilter || toDateFilter || selectedDateFilter)
                    ].filter(Boolean).length}
                  </span>
                )}
              </Button>

              {/* Expand / Collapse Table View */}
              <Button 
                variant="outline" 
                size="sm" 
                className={`h-8 gap-1.5 text-xs font-semibold shrink-0 ${isTableExpanded ? "bg-slate-200 text-slate-900 border-slate-400" : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"}`}
                onClick={() => setIsTableExpanded(prev => !prev)}
                title={isTableExpanded ? "Collapse Table View" : "Expand Table View"}
              >
                {isTableExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                {isTableExpanded ? "Collapse View" : "Expand View"}
              </Button>
            </div>
          </div>

          {/* Advanced Filter Drawer */}
          {isFilterExpanded && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center gap-4 text-xs animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2">
                <Label className="font-semibold text-slate-700">Gender:</Label>
                <Select value={patientGenderFilter} onValueChange={setPatientGenderFilter}>
                  <SelectTrigger className="w-[120px] h-7 bg-white text-xs border-slate-200">
                    <SelectValue placeholder="All Genders" />
                  </SelectTrigger>
                  <SelectContent className="z-[99999]">
                    <SelectItem value="all">All Genders</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Label className="font-semibold text-slate-700">Status:</Label>
                <Select value={patientStatusFilter} onValueChange={setPatientStatusFilter}>
                  <SelectTrigger className="w-[140px] h-7 bg-white text-xs border-slate-200">
                    <SelectValue placeholder="All Patients" />
                  </SelectTrigger>
                  <SelectContent className="z-[99999]">
                    <SelectItem value="all">All Records</SelectItem>
                    <SelectItem value="opd">OPD Outpatients</SelectItem>
                    <SelectItem value="admitted">Admitted to IPD</SelectItem>
                    <SelectItem value="referral">Referrals Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Label className="font-semibold text-slate-700">Sort By:</Label>
                <Select value={patientSortOrder} onValueChange={setPatientSortOrder}>
                  <SelectTrigger className="w-[140px] h-7 bg-white text-xs border-slate-200">
                    <SelectValue placeholder="Sort Order" />
                  </SelectTrigger>
                  <SelectContent className="z-[99999]">
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                    <SelectItem value="name_desc">Name (Z-A)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-medium ml-auto"
                onClick={() => {
                  setPatientGenderFilter('all');
                  setPatientStatusFilter('all');
                  setPatientSortOrder('newest');
                  setSelectedDoctorFilter('all');
                  setFromDateFilter('');
                  setToDateFilter('');
                  setSelectedDateFilter('');
                  setPatientRecordsSearchQuery('');
                  toast.success('All filters reset');
                }}
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Reset All Filters
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div 
            className={`overflow-x-auto overflow-y-auto custom-scrollbar relative transition-all duration-300 ${isTableExpanded ? 'max-h-[82vh]' : 'max-h-[60vh]'}`} 
          >
            {activeTab === 'patients' ? (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="w-[10%] whitespace-nowrap">MRN</TableHead>
                    <TableHead className="w-[20%] whitespace-nowrap">Patient Name</TableHead>
                    <TableHead className="w-[15%] whitespace-nowrap">Age/Gender</TableHead>
                    <TableHead className="w-[15%] whitespace-nowrap">Contact</TableHead>
                    <TableHead className="w-[15%] whitespace-nowrap">Last Visit</TableHead>
                    <TableHead className="w-[25%] text-right whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 text-slate-500 py-8">
                          <User className="w-8 h-8 text-slate-300" />
                          <p className="font-semibold text-slate-700">No patient records found</p>
                          <p className="text-xs text-slate-400 max-w-md text-center">
                            No patients match your current search query or active filters. Try modifying your search criteria.
                          </p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-2 text-xs bg-slate-50 hover:bg-slate-100"
                            onClick={() => {
                              setSelectedDoctorFilter('all');
                              setPatientGenderFilter('all');
                              setPatientStatusFilter('all');
                              setPatientSortOrder('newest');
                              setSelectedDateFilter('');
                              setFromDateFilter('');
                              setToDateFilter('');
                              setPatientRecordsSearchQuery('');
                            }}
                          >
                            Reset All Filters
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPatients
                      .slice((patientsPage - 1) * itemsPerPage, patientsPage * itemsPerPage)
                      .map((patient) => (
                        <TableRow key={patient.id} className="border-slate-50 hover:bg-slate-50/70 transition-colors">
                          <TableCell className="font-bold text-medical-blue whitespace-nowrap">{patient.mrn}</TableCell>
                          <TableCell className={cn(
                            "font-medium whitespace-nowrap transition-colors duration-150",
                            (patient.needsAdmission || patient.needs_admission || patient.status === 'Admitting' || patient.status === 'Admitted') 
                              ? "bg-amber-50/80 border-l-2 border-l-amber-500" 
                              : ""
                          )}>
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium text-slate-800">{patient.name}</span>
                              {(patient.needsAdmission || patient.needs_admission || patient.status === 'Admitting' || patient.status === 'Admitted') ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200 max-w-max">
                                  Transferred to IPD ({patient.status || 'Pending'})
                                </span>
                              ) : (patient.status === 'Discharged' || patient.status === 'discharged' || patient.registration_type === 'IPD' || patient.department === 'IPD') ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-800 border border-purple-200 max-w-max">
                                  IPD (Discharged Inpatient)
                                </span>
                              ) : (patient.isReferral || patient.is_referral) ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200 max-w-max">
                                  <ArrowUpRight className="w-2.5 h-2.5 text-teal-500" />
                                  Ref: {patient.referredBy || patient.referred_by || 'Yes'}
                                </span>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{patient.age}Y / {patient.gender}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            <div className="flex items-center gap-1.5 group">
                              <span className="font-semibold text-slate-800">
                                {patient.phone || patient.mobile || patient.contact || patient.phone_number || <span className="text-slate-400 italic font-normal">N/A</span>}
                              </span>
                              {!isAccountant && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-slate-400 hover:text-medical-blue hover:bg-blue-50 transition-colors"
                                  title="Quick Edit Phone Number / Contact"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openQuickContactEdit(patient);
                                  }}
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(patient.created_at || patient.registration_date)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1.5 items-center">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-medical-blue hover:bg-blue-50" 
                                title="Patient 360 Overview"
                                onClick={() => navigate(`/patient-overview?id=${patient.id}`)}
                              >
                                <User className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-medical-blue hover:bg-blue-50" 
                                title="View Patient Details"
                                onClick={() => {
                                  setSelectedPatient(patient);
                                  setIsDetailsOpen(true);
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {!isDoctor && (isReceptionist || isAccountant || ['ADMIN', 'SUPER_ADMIN', 'HOSPITAL_ADMIN'].includes(normalizeRole(userRole))) && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-emerald-700 hover:bg-emerald-50 h-8 gap-1.5 whitespace-nowrap font-bold" 
                                  onClick={() => {
                                    const patApt = appointments.find(a => (a.patientId === patient.id || a.patient_id === patient.id) && a.payment_status !== 'Paid');
                                    if (patApt) {
                                      handleOpenPaymentModal(patApt);
                                    } else {
                                      handleOpenPaymentModal({
                                        id: `APPT-DIRECT-${Date.now()}`,
                                        patientId: patient.id,
                                        patient_id: patient.id,
                                        patientName: patient.name,
                                        patientMrn: patient.mrn,
                                        fee: appointmentFee || 500,
                                        doctor: 'OPD Consultant',
                                        appointment_date: getLocalDateString(),
                                        appointment_time: '10:00 AM'
                                      });
                                    }
                                  }}
                                >
                                  <CreditCard className="w-4 h-4 text-emerald-600" />
                                  Collect Fee
                                </Button>
                              )}
                              {(canUserEditClinicalData(currentUser?.role) || normalizeRole(currentUser?.role) === 'RECEPTIONIST') && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-emerald-600 hover:bg-emerald-50 h-8 gap-1.5 whitespace-nowrap" 
                                  onClick={() => {
                                    openPrescriptionModal(patient);
                                  }}
                                >
                                  <FileText className="w-4 h-4" />
                                  {isReceptionist ? "Record Vitals" : "Prescription"}
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-amber-600 hover:bg-amber-50 h-8 gap-1.5 whitespace-nowrap" 
                                onClick={() => {
                                  setSelectedPatient(patient);
                                  loadPatientHistory(patient.id);
                                  setIsHistoryOpen(true);
                                }}
                              >
                                <History className="w-4 h-4" />
                                History
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-emerald-600 hover:bg-emerald-50 h-8 gap-1.5 whitespace-nowrap" 
                                onClick={() => {
                                  printLatestPrescriptionForPatient(patient);
                                }}
                                title="Print Latest Prescription"
                              >
                                <Printer className="w-4 h-4" />
                                Print Rx
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-slate-600 hover:bg-slate-100" 
                                onClick={() => {
                                  const summary = {
                                    MRN: patient.mrn || 'N/A',
                                    Name: patient.name || '',
                                    Age: patient.age || '',
                                    Gender: patient.gender || '',
                                    Phone: patient.phone || patient.mobile || patient.contact || '',
                                    Address: patient.address || '',
                                    City: patient.city || '',
                                    BloodGroup: patient.blood_group || patient.bloodGroup || '',
                                    RegistrationDate: patient.created_at || patient.registration_date || '',
                                    Status: patient.status || 'Outpatient',
                                    EmergencyContact: patient.emergency_contact || patient.emergencyContact || '',
                                    Allergies: patient.allergies || '',
                                    ChronicDiseases: patient.chronic_diseases || '',
                                    AttendingDoctor: patient.attendingDoctor || patient.attending_doctor || '',
                                    ExportedAt: new Date().toISOString()
                                  };
                                  const jsonBlob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
                                  const url = URL.createObjectURL(jsonBlob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `Patient_${patient.mrn || 'Summary'}_${Date.now()}.json`;
                                  a.click();
                                  URL.revokeObjectURL(url);
                                  toast.success(`Downloaded summary for ${patient.name}`);
                                }}
                                title="Download Patient Record (JSON)"
                              >
                                <FileDown className="w-4 h-4 text-slate-600" />
                              </Button>
                              {!isAccountant && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-medical-blue h-8 whitespace-nowrap font-bold hover:bg-blue-50" 
                                  onClick={async () => {
                                    try {
                                      const result = await supabaseService.updatePatient(patient.id, { 
                                        status: 'Admitting', 
                                        registrationType: 'OPD/IPD', 
                                        needsAdmission: true 
                                      });
                                      const updatedPatients = patients.map(p => 
                                        p.id === patient.id ? { ...p, ...result, status: 'Admitting', registrationType: 'OPD/IPD', needsAdmission: true } : p
                                      );
                                      setPatients(updatedPatients);
                                      storage.set(STORAGE_KEYS.PATIENTS, updatedPatients);
                                      window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table: 'patients', action: 'update' } }));
                                      toast.success(`${patient.name} marked for IPD Admission. You can now assign a bed in IPD Management.`);
                                    } catch (err: any) {
                                      console.error('Error transferring to IPD:', err);
                                      toast.error('Failed to transfer patient to IPD');
                                    }
                                  }}
                                >
                                  <ArrowUpRight className="w-4 h-4 mr-1.5" />
                                  Transfer to IPD
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-medical-blue hover:bg-blue-50" title="Edit Patient Details" onClick={() => startEditPatient(patient)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              {!isDeleteForbidden && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-50" title="Delete Patient" onClick={() => setPatientToDelete(patient)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="whitespace-nowrap">Appt No.</TableHead>
                    <TableHead className="whitespace-nowrap">Token</TableHead>
                    <TableHead className="whitespace-nowrap">Patient</TableHead>
                    <TableHead className="whitespace-nowrap">Doctor</TableHead>
                    <TableHead className="whitespace-nowrap">Department</TableHead>
                    <TableHead className="whitespace-nowrap">Date & Time</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="whitespace-nowrap">Payment</TableHead>
                    <TableHead className="whitespace-nowrap">Urgency</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAppointments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="h-48 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 text-slate-500 py-8">
                          <CalendarIcon className="w-8 h-8 text-slate-300" />
                          <p className="font-semibold text-slate-700">
                            {activeTab === 'queue' ? 'No patients in live queue' : 'No appointments found'}
                          </p>
                          <p className="text-xs text-slate-400 max-w-md text-center">
                            {selectedDoctorFilter !== 'all' || selectedDateFilter || fromDateFilter || toDateFilter || patientRecordsSearchQuery
                              ? 'No records match your active filters. Try clearing search or resetting filters.'
                              : activeTab === 'queue'
                                ? 'There are no active appointments scheduled for today.'
                                : 'No scheduled appointments recorded yet. You can book an appointment using the button above.'}
                          </p>
                          {(selectedDoctorFilter !== 'all' || selectedDateFilter || fromDateFilter || toDateFilter || patientRecordsSearchQuery) && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="mt-2 text-xs bg-slate-50 hover:bg-slate-100"
                              onClick={() => {
                                setSelectedDoctorFilter('all');
                                setSelectedDateFilter('');
                                setFromDateFilter('');
                                setToDateFilter('');
                                setPatientRecordsSearchQuery('');
                              }}
                            >
                              Reset All Filters
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAppointments
                      .slice((appointmentsPage - 1) * itemsPerPage, appointmentsPage * itemsPerPage)
                      .map((apt, i) => (
                        <TableRow key={apt.id} className="border-slate-50">
                        <TableCell className="font-bold text-slate-500 whitespace-nowrap">
                          #{appointmentSeqMap[apt.id] ? (1000 + appointmentSeqMap[apt.id]) : (100 + ((appointmentsPage - 1) * itemsPerPage) + i + 1)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className="inline-flex items-center justify-center font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-0.5 rounded-full text-xs">
                            TK-{opdTokenMap[apt.id] || 1}
                          </span>
                        </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {(() => {
                          const resolvedPat = patients.find(p => 
                            (p.name && !['walk-in patient', 'walk-in', 'unknown', ''].includes(p.name.toLowerCase().trim()) && (
                              isPatientIdMatch(p.id, apt.patientId || apt.patient_id) || 
                              (p.mrn && (p.mrn === apt.patientMrn || p.mrn === apt.patient_mrn || p.mrn === apt.patientId || p.mrn === apt.patient_id)) || 
                              (p.name && apt.patientName && p.name.toLowerCase().trim() === String(apt.patientName).toLowerCase().trim())
                            )) || isPatientIdMatch(p.id, apt.patientId || apt.patient_id)
                          );
                          const isAptNameValid = apt.patientName && !['walk-in patient', 'walk-in', 'unknown', ''].includes(String(apt.patientName).toLowerCase().trim());
                          const isResolvedNameValid = resolvedPat?.name && !['walk-in patient', 'walk-in', 'unknown', ''].includes(String(resolvedPat.name).toLowerCase().trim());
                          const isJoinedNameValid = apt.patients?.name && !['walk-in patient', 'walk-in', 'unknown', ''].includes(String(apt.patients.name).toLowerCase().trim());

                          const displayName = isAptNameValid 
                            ? apt.patientName 
                            : (isJoinedNameValid ? apt.patients.name : (isResolvedNameValid ? resolvedPat.name : (apt.patientName || 'Walk-in Patient')));

                          const isAptMrnValid = apt.patientMrn && !['n/a', 'none', '', 'null', 'undefined'].includes(String(apt.patientMrn).toLowerCase().trim());
                          const isJoinedMrnValid = apt.patients?.mrn && !['n/a', 'none', '', 'null', 'undefined'].includes(String(apt.patients.mrn).toLowerCase().trim());
                          const isResolvedMrnValid = resolvedPat?.mrn && !['n/a', 'none', '', 'null', 'undefined'].includes(String(resolvedPat.mrn).toLowerCase().trim());

                          const displayMrn = isAptMrnValid 
                            ? apt.patientMrn 
                            : (isJoinedMrnValid ? apt.patients.mrn : (isResolvedMrnValid ? resolvedPat.mrn : (apt.patientMrn || 'N/A')));

                          const patPhone = resolvedPat?.phone || resolvedPat?.mobile || resolvedPat?.contact || apt.phone || (apt as any).patientPhone;

                          return (
                            <div>
                              <p className="font-semibold text-slate-900">{displayName}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                                <span>MRN: {displayMrn}</span>
                                {patPhone && (
                                  <span className="text-slate-600 font-sans font-medium">📞 {patPhone}</span>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-medium text-slate-800">
                        {(() => {
                          const docObj = findDoctor(apt.doctor || apt.doctorName || apt.doctor_id);
                          const docDisplay = docObj?.name || apt.doctor || apt.doctorName || (apt.doctor_id ? users.find(u => isPatientIdMatch(u.id, apt.doctor_id))?.name : null) || 'Dr. Rajesh Sharma';
                          return docDisplay;
                        })()}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {(() => {
                          const docObj = findDoctor(apt.doctor || apt.doctorName || apt.doctor_id);
                          const deptDisplay = apt.doctorDepartment || apt.doctor_department || apt.department || docObj?.department || users.find(u => u.name === (apt.doctor || apt.doctorName) || u.id === apt.doctor_id)?.department || 'General Medicine';
                          return (
                            <span className="text-xs font-medium text-slate-600 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                              {deptDisplay}
                            </span>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                            <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                            {formatDate(apt.appointment_date || apt.date)}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {apt.appointment_time || '10:00 AM'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-none">
                          {apt.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <Badge 
                            variant="outline" 
                            className={`${
                              apt.payment_status === 'Refunded' 
                                ? 'bg-slate-100 text-slate-600 border-slate-200' 
                                : apt.payment_status === 'Paid' 
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                  : 'bg-rose-50 text-rose-600 border-rose-100'
                            } border-none w-fit py-0.5 px-2 text-[10px] font-bold`}
                          >
                            {apt.payment_status === 'Refunded' 
                              ? 'Refunded' 
                              : (apt.payment_status || 'Pending') === 'Paid' 
                                ? 'Paid' 
                                : 'Pending'
                            }
                          </Badge>
                          <div className="text-[11px] space-y-0.5 text-slate-600 font-medium">
                            <div>Base Fee: <span className="font-semibold text-slate-800">₹{apt.fee || appointmentFee}</span></div>
                            {(apt.discount_amount || apt.discountAmount || 0) > 0 && (
                              <>
                                <div className="text-amber-600 font-semibold font-bold">Discount: <span>-₹{apt.discount_amount || apt.discountAmount}</span></div>
                                <div className="border-t border-slate-100 pt-0.5 text-emerald-600 font-bold">
                                  Net Paid: <span>₹{Math.max(0, (apt.fee || appointmentFee) - (apt.discount_amount || apt.discountAmount || 0))}</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge className={`${getUrgencyColor(apt.urgency as string)} border-none py-0 h-5 text-[10px]`}>
                          {apt.urgency}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 items-center">
                          {!isDoctor && (apt.payment_status === 'Paid' ? (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 text-[10px] font-black uppercase tracking-wider text-amber-600 border-amber-100 hover:bg-amber-50 px-2"
                              onClick={() => handleRefundAppointment(apt.id)}
                            >
                              Refund ₹{Math.max(0, (apt.fee || appointmentFee) - (apt.discount_amount || apt.discountAmount || 0))}
                            </Button>
                          ) : apt.payment_status !== 'Refunded' ? (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 text-[10px] font-black uppercase tracking-wider text-emerald-600 border-emerald-100 hover:bg-emerald-50 bg-emerald-50/50 px-2"
                              onClick={() => handleOpenPaymentModal(apt)}
                            >
                              Collect ₹{Math.max(0, (apt.fee || appointmentFee) - (apt.discount_amount || apt.discountAmount || 0))}
                            </Button>
                          ) : null)}
                          {(canUserEditClinicalData(currentUser?.role) || isReceptionist) && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-emerald-600" 
                              title={isReceptionist ? "Record Vitals" : "Write Prescription"}
                              onClick={() => {
                                const patient = patients.find(p => isPatientIdMatch(p.id, apt.patientId)) || 
                                                patients.find(p => p.name === apt.patientName) ||
                                                patients.find(p => p.mrn === apt.patientMrn);
                                if (patient) {
                                  openPrescriptionModal(patient);
                                } else {
                                  // Dynamic transient fallback patient so that the button is always active and functional
                                  const fallbackPatient = {
                                    id: apt.patientId || `temp-${Math.random().toString(36).substring(2, 11)}`,
                                    name: apt.patientName || 'Unknown Patient',
                                    mrn: apt.patientMrn || 'N/A',
                                    age: apt.age || apt.patientAge || '30',
                                    gender: apt.gender || apt.patientGender || 'Male',
                                    phone: apt.phone || apt.patientPhone || 'N/A'
                                  };
                                  openPrescriptionModal(fallbackPatient);
                                }
                              }}
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                          )}
                          {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'DOCTOR' || currentUser?.role === 'NURSE' || currentUser?.role === 'RECEPTIONIST' || currentUser?.role === 'RECEPTION' || currentUser?.role === 'FRONT_DESK' || currentUser?.role === 'ACCOUNTANT' || currentUser?.role === 'ACCOUNTS') && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-amber-600 hover:bg-amber-50" 
                              title="Patient Clinical History"
                              onClick={() => {
                                const patient = patients.find(p => 
                                  isPatientIdMatch(p.id, apt.patientId) || 
                                  isPatientIdMatch(p.id, apt.patient_id) ||
                                  (p.mrn && p.mrn === apt.patientMrn) ||
                                  (p.name && p.name.toLowerCase().trim() === (apt.patientName || '').toLowerCase().trim())
                                );
                                if (patient) {
                                  setSelectedPatient(patient);
                                  loadPatientHistory(patient.id);
                                  setIsHistoryOpen(true);
                                } else {
                                  toast.error('Patient record not found');
                                }
                              }}
                            >
                              <History className="w-4 h-4" />
                            </Button>
                          )}
                          {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'DOCTOR' || currentUser?.role === 'NURSE' || currentUser?.role === 'RECEPTIONIST' || currentUser?.role === 'RECEPTION' || currentUser?.role === 'FRONT_DESK' || currentUser?.role === 'ACCOUNTANT' || currentUser?.role === 'ACCOUNTS') && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-emerald-600 hover:bg-emerald-50" 
                              title="Print Latest Prescription"
                              onClick={() => {
                                const patient = patients.find(p => 
                                                  isPatientIdMatch(p.id, apt.patientId) || 
                                                  isPatientIdMatch(p.id, apt.patient_id) ||
                                                  (p.mrn && p.mrn === apt.patientMrn) ||
                                                  (p.name && p.name.toLowerCase().trim() === (apt.patientName || '').toLowerCase().trim())
                                                ) || {
                                                  id: apt.patientId || apt.patient_id || `temp-${Math.random().toString(36).substring(2, 11)}`,
                                                  name: apt.patientName || 'Unknown Patient',
                                                  mrn: apt.patientMrn || 'N/A',
                                                  age: apt.age || apt.patientAge || '30',
                                                  gender: apt.gender || apt.patientGender || 'Male',
                                                  phone: apt.phone || apt.patientPhone || 'N/A'
                                                };
                                printLatestPrescriptionForPatient(patient, apt.doctor);
                              }}
                            >
                              <FileText className="w-4 h-4 text-emerald-600" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => printAppointmentToken(apt)}>
                            <Printer className="w-4 h-4" />
                          </Button>
                          {!isAccountant && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-medical-blue" onClick={() => startEditAppointment(apt)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          {!isAccountant && !isDeleteForbidden && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-rose-500 hover:bg-rose-50" 
                              title="Delete Appointment"
                              onClick={() => setApptToDelete(apt)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-600 hover:bg-slate-100" 
                            title="Export Appointment Details"
                            onClick={() => {
                              const summary = {
                                AppointmentNo: apt.appointment_number || apt.appointmentNumber || apt.id,
                                Token: apt.token_number || apt.tokenNumber || 'N/A',
                                PatientName: apt.patientName || apt.patient_name || '',
                                MRN: apt.patientMrn || apt.mrn || 'N/A',
                                Doctor: apt.doctor || apt.doctorName || '',
                                Department: apt.department || 'General OPD',
                                AppointmentDate: apt.appointment_date || '',
                                AppointmentTime: apt.appointment_time || '',
                                Status: apt.status || 'Scheduled',
                                PaymentStatus: apt.payment_status || 'Unpaid',
                                Fee: apt.fee || 500,
                                ExportedAt: new Date().toISOString()
                              };
                              const jsonBlob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
                              const url = URL.createObjectURL(jsonBlob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `Appointment_${apt.token_number || apt.id}_${Date.now()}.json`;
                              a.click();
                              URL.revokeObjectURL(url);
                              toast.success(`Downloaded details for token #${apt.token_number || apt.id}`);
                            }}
                          >
                            <FileDown className="w-4 h-4 text-slate-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )))}
                </TableBody>
              </Table>
            )}
          </div>

          {activeTab === 'patients' && (() => {
            const totalCount = patients.filter(p => {
              if (currentUser && (currentUser.role?.toUpperCase() === 'DOCTOR' || currentUser.role?.toUpperCase() === 'SURGEON')) {
                const docIdStr = String(currentUser.id).toLowerCase();
                const docNameStr = String(currentUser.name || '').toLowerCase();
                const isAssigned = (p.attending_doctor_id && String(p.attending_doctor_id).toLowerCase() === docIdStr) || (p.attendingDoctorId && String(p.attendingDoctorId).toLowerCase() === docIdStr);
                const hasAppointment = appointments.some((apt: any) => {
                  const pId = apt.patient_id || apt.patientId;
                  if (pId !== p.id) return false;
                  const aptDocId = apt.doctor_id || apt.doctorId;
                  const aptDocName = apt.doctor || apt.doctorName || '';
                  return (aptDocId && String(aptDocId).toLowerCase() === docIdStr) || (aptDocName && String(aptDocName).toLowerCase() === docNameStr);
                });
                if (!isAssigned && !hasAppointment) return false;
              }
              if (!patientRecordsSearchQuery.trim()) return true;
              const query = patientRecordsSearchQuery.toLowerCase();
              return (p.name || '').toLowerCase().includes(query) || (p.mrn || '').toLowerCase().includes(query) || (p.phone || '').includes(query);
            }).length;
            
            if (totalCount > 0) {
              return (
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                  <div className="text-xs text-slate-500">
                    Showing <strong>{Math.min(totalCount, (patientsPage - 1) * itemsPerPage + 1)}</strong> to{' '}
                    <strong>{Math.min(totalCount, patientsPage * itemsPerPage)}</strong> of{' '}
                    <strong>{totalCount}</strong> entries
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs bg-white text-slate-700 hover:bg-slate-50"
                      onClick={() => setPatientsPage(prev => Math.max(prev - 1, 1))}
                      disabled={patientsPage === 1}
                    >
                      Previous
                    </Button>
                    {Array.from({ length: Math.ceil(totalCount / itemsPerPage) }, (_, idx) => idx + 1)
                      .filter(p => p === 1 || p === Math.ceil(totalCount / itemsPerPage) || Math.abs(p - patientsPage) <= 1)
                      .map((p, i, arr) => {
                        return (
                          <React.Fragment key={p}>
                            {i > 0 && arr[i - 1] !== p - 1 && <span className="text-slate-400 px-1 text-xs">...</span>}
                            <Button
                              variant={p === patientsPage ? 'default' : 'outline'}
                              size="sm"
                              className={`h-8 w-8 text-xs p-0 ${p === patientsPage ? 'bg-medical-blue hover:bg-medical-blue/90 text-white border-none' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                              onClick={() => setPatientsPage(p)}
                            >
                              {p}
                            </Button>
                          </React.Fragment>
                        );
                      })}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs bg-white text-slate-700 hover:bg-slate-50"
                      onClick={() => setPatientsPage(prev => Math.min(prev + 1, Math.ceil(totalCount / itemsPerPage)))}
                      disabled={patientsPage === Math.ceil(totalCount / itemsPerPage)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {activeTab !== 'patients' && activeTab !== 'summary' && (() => {
            const totalCount = filteredAppointments.length;
            
            if (totalCount > 0) {
              return (
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                  <div className="text-xs text-slate-500">
                    Showing <strong>{Math.min(totalCount, (appointmentsPage - 1) * itemsPerPage + 1)}</strong> to{' '}
                    <strong>{Math.min(totalCount, appointmentsPage * itemsPerPage)}</strong> of{' '}
                    <strong>{totalCount}</strong> entries
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs bg-white text-slate-700 hover:bg-slate-50"
                      onClick={() => setAppointmentsPage(prev => Math.max(prev - 1, 1))}
                      disabled={appointmentsPage === 1}
                    >
                      Previous
                    </Button>
                    {Array.from({ length: Math.ceil(totalCount / itemsPerPage) }, (_, idx) => idx + 1)
                      .filter(p => p === 1 || p === Math.ceil(totalCount / itemsPerPage) || Math.abs(p - appointmentsPage) <= 1)
                      .map((p, i, arr) => {
                        return (
                          <React.Fragment key={p}>
                            {i > 0 && arr[i - 1] !== p - 1 && <span className="text-slate-400 px-1 text-xs">...</span>}
                            <Button
                              variant={p === appointmentsPage ? 'default' : 'outline'}
                              size="sm"
                              className={`h-8 w-8 text-xs p-0 ${p === appointmentsPage ? 'bg-medical-blue hover:bg-medical-blue/90 text-white border-none' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                              onClick={() => setAppointmentsPage(p)}
                            >
                              {p}
                            </Button>
                          </React.Fragment>
                        );
                      })}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs bg-white text-slate-700 hover:bg-slate-50"
                      onClick={() => setAppointmentsPage(prev => Math.min(prev + 1, Math.ceil(totalCount / itemsPerPage)))}
                      disabled={appointmentsPage === Math.ceil(totalCount / itemsPerPage)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              );
            }
            return null;
          })()}
        </CardContent>
      </Card>
      )}
      {/* Merge Patient Confirmation Dialog */}
      <Dialog open={!!mergePatientData} onOpenChange={(open) => { if (!open) setMergePatientData(null); }}>
        <DialogContent 
          className="sm:max-w-[450px]"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              Duplicate Patient Found
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-slate-600 leading-relaxed">
              A patient named <strong className="text-slate-900">{mergePatientData?.existing?.name}</strong> with phone number <strong className="text-slate-900">{mergePatientData?.existing?.phone}</strong> is already registered (MRN: {mergePatientData?.existing?.mrn}).
            </p>
            <p className="text-xs text-slate-500 bg-amber-50 p-3 rounded-lg border border-amber-100">
              Would you like to merge the new registration details into the existing patient record? Any empty or outdated fields in the existing record will be updated.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setMergePatientData(null)}>
              Cancel
            </Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={confirmMergeAndContinue}>
              Yes, Merge Records
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Patient Agreement Dialog */}
      <Dialog open={!!duplicateConfirm} onOpenChange={(open) => { if (!open) setDuplicateConfirm(null); }}>
        <DialogContent 
          id="opd-duplicate-confirm-dialog" 
          className="sm:max-w-[450px]"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              Duplicate Entry Warning
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-slate-600 leading-relaxed">
              A potential duplicate entry has been detected under patient registration.
            </p>
            <p className="text-xs text-slate-500 bg-amber-50 p-3 rounded-lg border border-amber-100">
              An existing patient named <strong className="text-slate-900">{duplicateConfirm?.duplicatePatient?.name}</strong> 
              {duplicateConfirm?.duplicatePatient?.phone && <> with phone number <strong className="text-slate-900">{duplicateConfirm?.duplicatePatient?.phone}</strong></>} 
              is already registered (MRN: {duplicateConfirm?.duplicatePatient?.mrn}).
            </p>
            <p className="text-sm text-slate-600 font-medium">
              Do you explicitly agree and wish to proceed with registering this patient anyway?
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button id="opd-duplicate-cancel-btn" variant="outline" onClick={() => setDuplicateConfirm(null)}>
              No, Cancel
            </Button>
            <Button id="opd-duplicate-confirm-btn" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => {
              const redirect = !!duplicateConfirm?.shouldRedirect;
              setDuplicateConfirm(null);
              handleRegistration(redirect, true);
            }}>
              Yes, I Agree & Proceed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Token Success Dialog */}
      <Dialog open={isTokenSuccessOpen} onOpenChange={setIsTokenSuccessOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="text-center w-full px-2">
              <h3 className="text-xl font-bold text-slate-900 mb-1">Registration Success!</h3>
              <p className="text-sm text-emerald-600 font-semibold mb-3">Patient Registered Successfully</p>
              
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-left space-y-2 text-xs text-slate-600">
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="font-semibold text-slate-700">Patient Name:</span> 
                  <span className="font-bold text-slate-900">{lastToken?.patientName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="font-semibold text-slate-700">MRN:</span> 
                  <span className="font-mono text-medical-blue font-bold">{lastToken?.mrn}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="font-semibold text-slate-700">Token Number:</span> 
                  <span className="font-mono font-bold text-emerald-600">{lastToken?.tokenNumber}</span>
                </div>
                {lastToken?.fee ? (
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-700">Registration Fee:</span> 
                    <span className="font-bold text-slate-900">₹{lastToken.fee}</span>
                  </div>
                ) : null}
              </div>
            </div>
            
            <div className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs">
              <span className="font-semibold text-slate-600">Token Print Size:</span>
              <div className="flex gap-1 bg-slate-200/50 p-0.5 rounded-md">
                <button
                  type="button"
                  className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${tokenPrintSize === 'thermal' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  onClick={() => handleTokenSizeChange('thermal')}
                >
                  Thermal (58mm)
                </button>
                <button
                  type="button"
                  className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${tokenPrintSize === 'thermal_80' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  onClick={() => handleTokenSizeChange('thermal_80')}
                >
                  Thermal (80mm)
                </button>
                <button
                  type="button"
                  className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${tokenPrintSize === 'A5' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  onClick={() => handleTokenSizeChange('A5')}
                >
                  A5 Size
                </button>
              </div>
            </div>

            <div className="w-full flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 gap-2 border-slate-200" onClick={printToken}>
                <Printer className="w-4 h-4" />
                Print Token
              </Button>
              <Button className="flex-1 bg-medical-blue" onClick={() => setIsTokenSuccessOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Prescription Dialog */}
      <Dialog open={isPrescriptionOpen} onOpenChange={setIsPrescriptionOpen}>
        <DialogContent className="sm:max-w-[1100px] w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              {isReceptionist ? 'Enter Vitals / View Prescription' : 'Write Prescription'} - {selectedPatient?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 py-2">
            {/* Left side: prescription form input fields */}
            <div className="lg:col-span-7 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Doctor</Label>
                  <Select disabled={isReceptionist} value={prescription.doctor} onValueChange={(v) => setPrescription({...prescription, doctor: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Doctor" />
                    </SelectTrigger>
                    <SelectContent className="z-[99999] max-h-[300px] overflow-y-auto">
                      {allDoctors.map(doc => (
                        <SelectItem key={doc.id || doc.name} value={doc.name}>{doc.name} {doc.degree ? `(${doc.degree})` : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input disabled={isReceptionist} type="date" value={prescription.date} onChange={(e) => setPrescription({...prescription, date: e.target.value})} />
                </div>
              </div>

              {/* Chief Complaints Box at the BEGINNING */}
              <div className="space-y-2 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200 rounded-xl p-3.5 shadow-xs">
                <Label className="text-xs font-bold text-blue-900 flex items-center gap-1.5 uppercase tracking-wider">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Chief Complaints / Presenting Symptoms
                </Label>
                <textarea 
                  disabled={isReceptionist}
                  placeholder="e.g. Abdominal pain for 3 days, nausea, loose motions, acidity..." 
                  value={prescription.complaints || ''}
                  onChange={(e) => setPrescription({...prescription, complaints: e.target.value})}
                  rows={2}
                  className="flex w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[50px] resize-y font-medium text-slate-800"
                />
              </div>

              {/* Prescription Templates Section */}
              {!isReceptionist && (
                <div className="bg-emerald-50/55 border border-emerald-100 rounded-xl p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="font-extrabold text-xs text-emerald-800 flex items-center gap-1.5 uppercase tracking-wider">
                        <BookOpen className="w-4 h-4 text-emerald-600" />
                        Prescription Templates
                      </span>
                      <span className="text-[10px] text-emerald-600/80 font-medium">Quick-load pre-filled clinical profiles & formulas</span>
                    </div>
                    <Button 
                      variant="link" 
                      onClick={() => setIsManageTemplatesOpen(true)} 
                      className="text-xs text-emerald-700 font-bold hover:text-emerald-900 h-auto p-0"
                    >
                      Manage ({prescriptionTemplates.length})
                    </Button>
                  </div>
                  
                  <div className="flex gap-2 items-center">
                    <div className="flex-1">
                      <Select onValueChange={(val) => handleLoadTemplate(val as string)}>
                        <SelectTrigger className="bg-white border-emerald-200 focus:ring-emerald-500">
                          <SelectValue placeholder="-- Select Prescription Template --" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          {prescriptionTemplates.map((tpl) => (
                            <SelectItem key={tpl.id} value={tpl.id} className="cursor-pointer">
                              {tpl.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button 
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const name = prompt("Enter a name for this prescription template:");
                        if (name && name.trim()) {
                          handleSaveAsTemplate(name.trim());
                        }
                      }}
                      className="gap-1.5 bg-white hover:bg-emerald-50 border-emerald-200 text-emerald-700 shrink-0 h-9 font-semibold text-xs"
                    >
                      <Save className="w-3.5 h-3.5 text-emerald-600" />
                      Save Current
                    </Button>
                  </div>
                </div>
              )}

              {/* Clinical Details & Diagrams */}
              <div className="space-y-4 border-t border-dashed border-slate-200 pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-xs uppercase text-slate-700 tracking-wider">Clinical Details & Physical Exam</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 bg-amber-50/40 border border-amber-200 rounded-xl p-3">
                    <Label className="text-xs font-bold text-amber-800 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      Allergies & Drug Sensitivities
                    </Label>
                    <textarea 
                      disabled={isReceptionist}
                      placeholder="e.g. Penicillin, Sulfa drugs, No known drug allergies (NKDA)..." 
                      value={prescription.allergies || ''}
                      onChange={(e) => setPrescription({...prescription, allergies: e.target.value})}
                      rows={2}
                      className="flex w-full rounded-md border border-amber-200 bg-white px-3 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[42px] resize-y"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-slate-700">Past Medical History / Previous Treatments</Label>
                      <span className="text-[10px] text-teal-700 font-semibold">Tickbox Common Diseases:</span>
                    </div>

                    {/* Common Disease Tickboxes */}
                    <div className="flex flex-wrap gap-1.5 p-2 bg-slate-100/80 rounded-lg border border-slate-200 mb-1">
                      {COMMON_DISEASES.map(disease => {
                        const isChecked = isDiseaseInHistory(prescription.pastHistory || '', disease.label, disease.keyword);
                        return (
                          <label
                            key={disease.id}
                            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-semibold cursor-pointer border transition-all select-none ${
                              isChecked 
                                ? 'bg-teal-700 text-white border-teal-800 shadow-xs' 
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isReceptionist}
                              onChange={() => {
                                const updated = toggleDiseaseInHistory(prescription.pastHistory || '', disease.label, disease.keyword);
                                setPrescription({ ...prescription, pastHistory: updated });
                              }}
                              className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 accent-teal-600 cursor-pointer"
                            />
                            <span>{disease.label}</span>
                          </label>
                        );
                      })}
                    </div>

                    <textarea 
                      disabled={isReceptionist}
                      placeholder="e.g. Known hypertensive for 5 years, Type-2 DM..." 
                      value={prescription.pastHistory || ''}
                      onChange={(e) => setPrescription({...prescription, pastHistory: e.target.value})}
                      rows={2}
                      className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[42px] resize-y"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-600">Diagnosis / Clinical Impression</Label>
                    <Input 
                      disabled={isReceptionist}
                      placeholder="e.g. GERD, Acute Gastroenteritis..." 
                      value={prescription.diagnosis || ''}
                      onChange={(e) => setPrescription({...prescription, diagnosis: e.target.value})}
                      className="bg-white"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-600">Advice / General Remarks</Label>
                    <textarea 
                      disabled={isReceptionist}
                      placeholder="e.g. Avoid spicy food, walk after meals..." 
                      value={prescription.advice || ''}
                      onChange={(e) => setPrescription({...prescription, advice: e.target.value})}
                      rows={2}
                      className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[42px] resize-y"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-600">Examination Findings (Clinical Findings)</Label>
                    <textarea 
                      disabled={isReceptionist}
                      placeholder="e.g. Abdomen soft, tenderness in epigastrium..." 
                      value={prescription.examinationFindings || ''}
                      onChange={(e) => setPrescription({...prescription, examinationFindings: e.target.value})}
                      rows={3}
                      className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[70px] resize-y"
                    />
                  </div>
                </div>

                {/* Plan Surgery & Hospitalisation / Admission Advice Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 pt-4 mt-2">
                  {/* Card 1: Plan / Advise Surgery */}
                  <div className={`p-3.5 rounded-xl border transition-all ${prescription.planSurgeryNeeded ? 'bg-orange-50/80 border-orange-300 ring-1 ring-orange-200' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${prescription.planSurgeryNeeded ? 'bg-orange-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                          <Scissors className="w-4 h-4" />
                        </div>
                        <div>
                          <Label className="text-xs font-bold text-slate-800">Plan Surgery / Advise Surgery</Label>
                          <p className="text-[10px] text-slate-500">Surgical procedure advice for patient</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          disabled={isReceptionist}
                          checked={!!prescription.planSurgeryNeeded}
                          onChange={(e) => setPrescription({ ...prescription, planSurgeryNeeded: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600"></div>
                      </label>
                    </div>

                    {prescription.planSurgeryNeeded && (
                      <div className="space-y-3 mt-3 pt-3 border-t border-orange-200/80">
                        {/* Quick preset surgery buttons */}
                        <div>
                          <span className="text-[10px] font-bold text-orange-900 uppercase tracking-wider block mb-1">Quick Presets:</span>
                          <div className="flex flex-wrap gap-1">
                            {[
                              'Laparoscopic Cholecystectomy',
                              'Laparoscopic Appendectomy',
                              'Inguinal Herniaplasty',
                              'Fissure / Fistula Surgery',
                              'Diagnostic Endoscopy',
                              'TURP',
                              'Cataract Surgery (Phaco)',
                              'LSCS (Cesarean)'
                            ].map((sName) => (
                              <button
                                key={sName}
                                type="button"
                                disabled={isReceptionist}
                                onClick={() => setPrescription({ ...prescription, plannedSurgeryName: sName })}
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded border transition-all ${
                                  prescription.plannedSurgeryName === sName
                                    ? 'bg-orange-600 text-white border-orange-700 shadow-2xs'
                                    : 'bg-white text-orange-900 border-orange-200 hover:bg-orange-100'
                                }`}
                              >
                                {sName}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <Label className="text-[11px] font-semibold text-orange-950">Planned Surgery / Procedure Name</Label>
                          <Input
                            disabled={isReceptionist}
                            placeholder="e.g. Laparoscopic Cholecystectomy..."
                            value={prescription.plannedSurgeryName || ''}
                            onChange={(e) => setPrescription({ ...prescription, plannedSurgeryName: e.target.value })}
                            className="bg-white border-orange-200 text-xs mt-1"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[11px] font-semibold text-orange-950">Proposed Date</Label>
                            <Input
                              type="date"
                              disabled={isReceptionist}
                              value={prescription.plannedSurgeryDate || ''}
                              onChange={(e) => setPrescription({ ...prescription, plannedSurgeryDate: e.target.value })}
                              className="bg-white border-orange-200 text-xs mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-[11px] font-semibold text-orange-950">Pre-Op & Special Notes</Label>
                            <Input
                              disabled={isReceptionist}
                              placeholder="e.g. NBM 6hrs, PAC fitness..."
                              value={prescription.plannedSurgeryNotes || ''}
                              onChange={(e) => setPrescription({ ...prescription, plannedSurgeryNotes: e.target.value })}
                              className="bg-white border-orange-200 text-xs mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card 2: Hospitalisation / Admit Patient */}
                  <div className={`p-3.5 rounded-xl border transition-all ${prescription.admitNeeded && prescription.admitNeeded !== 'No' ? 'bg-red-50/80 border-red-300 ring-1 ring-red-200' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${prescription.admitNeeded && prescription.admitNeeded !== 'No' ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <Label className="text-xs font-bold text-slate-800">Hospitalisation / Admission Advice</Label>
                          <p className="text-[10px] text-slate-500">Advise inpatient admission or observation</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mt-2">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                        {[
                          { label: 'No Admission', value: 'No' },
                          { label: 'Immediate Admission', value: 'Immediate Admission Advised' },
                          { label: 'Planned Admission', value: 'Planned Admission for Surgery' },
                          { label: 'Day Care', value: 'Day Care Admission' },
                          { label: 'Observation', value: 'Observation Required' }
                        ].map((item) => (
                          <button
                            key={item.value}
                            type="button"
                            disabled={isReceptionist}
                            onClick={() => setPrescription({ ...prescription, admitNeeded: item.value })}
                            className={`text-[10px] font-bold px-2 py-1 rounded border text-center transition-all ${
                              prescription.admitNeeded === item.value || (prescription.admitNeeded === 'Yes' && item.value === 'Immediate Admission Advised')
                                ? 'bg-red-600 text-white border-red-700 shadow-2xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-red-50'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>

                      {prescription.admitNeeded && prescription.admitNeeded !== 'No' && (
                        <div className="space-y-2 mt-3 pt-2 border-t border-red-200/80">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <Label className="text-[11px] font-semibold text-red-950">Recommended Ward / Category</Label>
                              <select
                                disabled={isReceptionist}
                                value={prescription.admitWardType || 'General Ward'}
                                onChange={(e) => setPrescription({ ...prescription, admitWardType: e.target.value })}
                                className="w-full text-xs h-8 rounded-md border border-red-200 bg-white px-2 mt-1 font-medium focus:ring-1 focus:ring-red-500"
                              >
                                <option value="General Ward">General Ward</option>
                                <option value="Semi-Private Room">Semi-Private Room</option>
                                <option value="Private AC Room">Private AC Room</option>
                                <option value="ICU / HDU">ICU / HDU</option>
                                <option value="Day Care Bed">Day Care Bed</option>
                              </select>
                            </div>
                            <div>
                              <Label className="text-[11px] font-semibold text-red-950">Reason / Admission Notes</Label>
                              <Input
                                disabled={isReceptionist}
                                placeholder="e.g. IV Fluids & Antibiotics, Pre-op workup..."
                                value={prescription.admitReason || ''}
                                onChange={(e) => setPrescription({ ...prescription, admitReason: e.target.value })}
                                className="bg-white border-red-200 text-xs mt-1"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Drawing Tool Component */}
                {!isReceptionist && (
                  <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-xl p-4 mt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <Label className="text-xs font-bold text-slate-700">Clinical Sketchpad / Diagram</Label>
                        <span className="text-[10px] text-slate-500">Draw simple lines or add pre-defined clinical shapes</span>
                      </div>
                      
                      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
                        <Button 
                          type="button"
                          variant={drawMode === 'pen' ? 'default' : 'ghost'} 
                          size="sm" 
                          onClick={() => setDrawMode('pen')}
                          className="h-7 px-2.5 text-xs gap-1"
                        >
                          <Paintbrush className="w-3.5 h-3.5" />
                          Pen
                        </Button>
                        <Button 
                          type="button"
                          variant={drawMode === 'eraser' ? 'default' : 'ghost'} 
                          size="sm" 
                          onClick={() => setDrawMode('eraser')}
                          className="h-7 px-2.5 text-xs gap-1"
                        >
                          <Eraser className="w-3.5 h-3.5" />
                          Eraser
                        </Button>
                        <Button 
                          type="button"
                          variant="ghost" 
                          size="icon" 
                          onClick={clearCanvas}
                          className="h-7 w-7 text-rose-500"
                          title="Clear Sketchpad"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 items-center justify-between py-1 border-b border-slate-200/60 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 font-semibold">Pen Color:</span>
                        <div className="flex items-center gap-1.5">
                          {['#1d4ed8', '#dc2626', '#059669', '#000000'].map(color => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => {
                                setPenColor(color);
                                setDrawMode('pen');
                              }}
                              className={`w-4 h-4 rounded-full border transition ${penColor === color && drawMode === 'pen' ? 'ring-2 ring-offset-1 ring-slate-400 border-transparent scale-110' : 'border-slate-300'}`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 font-semibold">Width:</span>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={lineWidth}
                          onChange={(e) => setLineWidth(Number(e.target.value))}
                          className="w-16 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-700"
                        />
                        <span className="text-[10px] font-mono text-slate-600">{lineWidth}px</span>
                      </div>
                    </div>

                    {/* Anatomical Base Templates & Pre-added Shapes Toolbar */}
                    <div className="space-y-2 mb-2">
                      {/* 1. Anatomical Base Diagrams (Loads full anatomical template onto canvas) */}
                      <div className="flex flex-wrap items-center gap-1.5 py-1.5 bg-slate-900 text-white rounded-lg px-2 border border-slate-800 shadow-xs">
                        <span className="text-[10px] text-emerald-400 font-extrabold mr-1 uppercase flex items-center gap-1">
                          <Stethoscope className="w-3 h-3 text-emerald-400" />
                          Anatomical Templates:
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => drawPreaddedShapeOnCanvas(canvasRef.current, 'anorectal_fistula', penColor, lineWidth, (url) => setPrescription(p => ({ ...p, drawing: url })))}
                          className="h-6 px-2.5 text-[11px] font-extrabold gap-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-200 border-emerald-700/60 shadow-2xs"
                          title="Load Anorectal, Anal Canal & Fistula Anatomy Diagram (Matching Screenshot 1)"
                        >
                          <Activity className="w-3 h-3 text-emerald-400" />
                          Anorectal & Fistula Diagram
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => drawPreaddedShapeOnCanvas(canvasRef.current, 'stomach_gastro', penColor, lineWidth, (url) => setPrescription(p => ({ ...p, drawing: url })))}
                          className="h-6 px-2 text-[11px] font-bold gap-1 bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700"
                          title="Load Stomach & Duodenum Diagram"
                        >
                          <Microscope className="w-3 h-3 text-sky-400" />
                          Stomach / Gastro
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => drawPreaddedShapeOnCanvas(canvasRef.current, 'colon_rectum', penColor, lineWidth, (url) => setPrescription(p => ({ ...p, drawing: url })))}
                          className="h-6 px-2 text-[11px] font-bold gap-1 bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700"
                          title="Load Colon & Rectum Diagram"
                        >
                          <Layers className="w-3 h-3 text-amber-400" />
                          Colon & Rectum
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => drawPreaddedShapeOnCanvas(canvasRef.current, 'abdominal_grid', penColor, lineWidth, (url) => setPrescription(p => ({ ...p, drawing: url })))}
                          className="h-6 px-2 text-[11px] font-bold gap-1 bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700"
                          title="Load 9 Abdominal Quadrants Grid"
                        >
                          <Square className="w-3 h-3 text-indigo-400" />
                          Abdomen Grid (9 Quadrants)
                        </Button>
                      </div>

                      {/* 2. Clinical Stamps & Standard Shapes */}
                      <div className="flex flex-wrap items-center gap-1.5 py-1.5 bg-slate-100/70 rounded-lg px-2 border border-slate-200">
                        <span className="text-[10px] text-slate-600 font-bold mr-1 uppercase">Clinical Stamps:</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => drawPreaddedShapeOnCanvas(canvasRef.current, 'fistula_tract', penColor, lineWidth, (url) => setPrescription(p => ({ ...p, drawing: url })))}
                          className="h-6 px-2 text-[11px] font-bold gap-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200 shadow-2xs"
                          title="Stamp Fistula Tract Path"
                        >
                          <Zap className="w-3 h-3 text-rose-600" />
                          Fistula Tract
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => drawPreaddedShapeOnCanvas(canvasRef.current, 'hemorrhoid', penColor, lineWidth, (url) => setPrescription(p => ({ ...p, drawing: url })))}
                          className="h-6 px-2 text-[11px] font-bold gap-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200 shadow-2xs"
                          title="Stamp Hemorrhoidal Cushion / Mass"
                        >
                          <CircleIcon className="w-3 h-3 text-amber-600" />
                          Hemorrhoid Mass
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => drawPreaddedShapeOnCanvas(canvasRef.current, 'dentate_line', penColor, lineWidth, (url) => setPrescription(p => ({ ...p, drawing: url })))}
                          className="h-6 px-2 text-[11px] font-bold gap-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-200 shadow-2xs"
                          title="Stamp Dentate Line"
                        >
                          <Minus className="w-3 h-3 text-purple-600" />
                          Dentate Line
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => drawPreaddedShapeOnCanvas(canvasRef.current, 'sphincter_ring', penColor, lineWidth, (url) => setPrescription(p => ({ ...p, drawing: url })))}
                          className="h-6 px-2 text-[11px] font-bold gap-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-200 shadow-2xs"
                          title="Stamp Sphincter Ring Contour"
                        >
                          <CircleIcon className="w-3 h-3 text-blue-600" />
                          Sphincter Ring
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => drawPreaddedShapeOnCanvas(canvasRef.current, 'ulcer_mark', penColor, lineWidth, (url) => setPrescription(p => ({ ...p, drawing: url })))}
                          className="h-6 px-2 text-[11px] font-bold gap-1 bg-orange-50 hover:bg-orange-100 text-orange-800 border-orange-200 shadow-2xs"
                          title="Stamp Ulcer / Erosion Mark"
                        >
                          <AlertCircle className="w-3 h-3 text-orange-600" />
                          Ulcer Mark
                        </Button>

                        <span className="text-[10px] text-slate-400 font-bold mx-1">|</span>
                        <span className="text-[10px] text-slate-600 font-bold mr-1 uppercase">Shapes:</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => drawPreaddedShapeOnCanvas(canvasRef.current, 'hexagram', penColor, lineWidth, (url) => setPrescription(p => ({ ...p, drawing: url })))}
                          className="h-6 px-2 text-[11px] gap-1 bg-white hover:bg-slate-100 border-slate-300 shadow-2xs"
                          title="Draw Hexagram (6-pointed Star)"
                        >
                          <Hexagon className="w-3 h-3 text-amber-600" />
                          Hexagram
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => drawPreaddedShapeOnCanvas(canvasRef.current, 'rectangle', penColor, lineWidth, (url) => setPrescription(p => ({ ...p, drawing: url })))}
                          className="h-6 px-2 text-[11px] gap-1 bg-white hover:bg-slate-100 border-slate-300 shadow-2xs"
                          title="Draw Rectangle"
                        >
                          <Square className="w-3 h-3 text-blue-600" />
                          Rectangle
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => drawPreaddedShapeOnCanvas(canvasRef.current, 'circle', penColor, lineWidth, (url) => setPrescription(p => ({ ...p, drawing: url })))}
                          className="h-6 px-2 text-[11px] gap-1 bg-white hover:bg-slate-100 border-slate-300 shadow-2xs"
                          title="Draw Circle"
                        >
                          <CircleIcon className="w-3 h-3 text-emerald-600" />
                          Circle
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => drawPreaddedShapeOnCanvas(canvasRef.current, 'triangle', penColor, lineWidth, (url) => setPrescription(p => ({ ...p, drawing: url })))}
                          className="h-6 px-2 text-[11px] gap-1 bg-white hover:bg-slate-100 border-slate-300 shadow-2xs"
                          title="Draw Triangle"
                        >
                          <Triangle className="w-3 h-3 text-purple-600" />
                          Triangle
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => drawPreaddedShapeOnCanvas(canvasRef.current, 'arrow', penColor, lineWidth, (url) => setPrescription(p => ({ ...p, drawing: url })))}
                          className="h-6 px-2 text-[11px] gap-1 bg-white hover:bg-slate-100 border-slate-300 shadow-2xs"
                          title="Draw Arrow"
                        >
                          <MoveRight className="w-3 h-3 text-indigo-600" />
                          Arrow
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => drawPreaddedShapeOnCanvas(canvasRef.current, 'line', penColor, lineWidth, (url) => setPrescription(p => ({ ...p, drawing: url })))}
                          className="h-6 px-2 text-[11px] gap-1 bg-white hover:bg-slate-100 border-slate-300 shadow-2xs"
                          title="Draw Line"
                        >
                          <Minus className="w-3 h-3 text-slate-600" />
                          Line
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => drawPreaddedShapeOnCanvas(canvasRef.current, 'cross', penColor, lineWidth, (url) => setPrescription(p => ({ ...p, drawing: url })))}
                          className="h-6 px-2 text-[11px] gap-1 bg-white hover:bg-slate-100 border-slate-300 shadow-2xs"
                          title="Draw Cross / Plus"
                        >
                          <Plus className="w-3 h-3 text-rose-600" />
                          Cross
                        </Button>
                      </div>
                    </div>

                    <div className="relative border-2 border-dashed border-slate-300 rounded-lg overflow-hidden bg-white shadow-inner flex justify-center">
                      <canvas
                        ref={canvasRef}
                        width={600}
                        height={240}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="w-full max-w-full h-[240px] bg-transparent block touch-none cursor-crosshair"
                      />
                    </div>
                  </div>
                )}
                {isReceptionist && prescription.drawing && (
                  <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-xl p-4 mt-2">
                    <Label className="text-xs font-bold text-slate-700 block">Clinical Sketch / Diagram</Label>
                    <div className="border border-slate-200 rounded bg-white p-2 flex justify-center">
                      <img src={prescription.drawing} alt="Clinical findings drawing" className="max-h-48 object-contain" />
                    </div>
                  </div>
                )}
              </div>

              {/* Patient Vitals Entry Option */}
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5 mb-2">
                  <span className="font-bold text-xs uppercase text-slate-700 tracking-wider">Patient Vitals / Measurements</span>
                  <Badge variant="outline" className="text-[9px] text-emerald-600 bg-emerald-50 border-emerald-100 font-bold uppercase py-0 px-1.5 h-4">
                    Vitals Option
                  </Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-500 uppercase font-semibold">BP (mmHg)</Label>
                    <Input 
                      placeholder="120/80" 
                      value={prescription.vitals?.bp || ''} 
                      onChange={(e) => setPrescription({
                        ...prescription,
                        vitals: { ...(prescription.vitals || {}), bp: e.target.value }
                      })}
                      className="h-9 bg-white text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-500 uppercase font-semibold">Pulse (/min)</Label>
                    <Input 
                      placeholder="72" 
                      value={prescription.vitals?.pulse || ''} 
                      onChange={(e) => setPrescription({
                        ...prescription,
                        vitals: { ...(prescription.vitals || {}), pulse: e.target.value }
                      })}
                      className="h-9 bg-white text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-teal-800 uppercase font-bold flex items-center justify-between">
                      <span>SpO2 (%)</span>
                      <span className="text-[8px] bg-teal-100 text-teal-900 px-1 rounded font-extrabold">Sat</span>
                    </Label>
                    <Input 
                      placeholder="98" 
                      value={prescription.vitals?.spo2 || ''} 
                      onChange={(e) => setPrescription({
                        ...prescription,
                        vitals: { ...(prescription.vitals || {}), spo2: e.target.value }
                      })}
                      className="h-9 bg-white text-xs font-bold border-teal-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-500 uppercase font-semibold">Temp (°F)</Label>
                    <Input 
                      placeholder="98.6" 
                      value={prescription.vitals?.temp || ''} 
                      onChange={(e) => setPrescription({
                        ...prescription,
                        vitals: { ...(prescription.vitals || {}), temp: e.target.value }
                      })}
                      className="h-9 bg-white text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-500 uppercase font-semibold">Weight (kg)</Label>
                    <Input 
                      placeholder="65" 
                      value={prescription.vitals?.weight || ''} 
                      onChange={(e) => {
                        const newWeight = e.target.value;
                        const newHeight = prescription.vitals?.height || '';
                        const bmiStr = calculateBMI(newWeight, newHeight);
                        setPrescription({
                          ...prescription,
                          vitals: { ...(prescription.vitals || {}), weight: newWeight, bmi: bmiStr }
                        });
                      }}
                      className="h-9 bg-white text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-500 uppercase font-semibold">Height (cm)</Label>
                    <Input 
                      placeholder="170" 
                      value={prescription.vitals?.height || ''} 
                      onChange={(e) => {
                        const newHeight = e.target.value;
                        const newWeight = prescription.vitals?.weight || '';
                        const bmiStr = calculateBMI(newWeight, newHeight);
                        setPrescription({
                          ...prescription,
                          vitals: { ...(prescription.vitals || {}), height: newHeight, bmi: bmiStr }
                        });
                      }}
                      className="h-9 bg-white text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-teal-700 uppercase font-bold flex items-center justify-between">
                      <span>BMI</span>
                      <span className="text-[8px] bg-teal-100 text-teal-800 px-1 rounded">Auto</span>
                    </Label>
                    <Input 
                      readOnly
                      placeholder="Auto" 
                      value={prescription.vitals?.bmi || ''} 
                      className="h-9 bg-teal-50/60 font-bold text-teal-900 text-xs cursor-not-allowed border-teal-200"
                    />
                  </div>
                </div>
              </div>

              {/* Clinical Photos & Attachments Section */}
              <div className="space-y-3 bg-blue-50/40 border border-blue-200/80 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs uppercase text-blue-900 tracking-wider">Clinical Photos & Attachments</span>
                    <Badge variant="outline" className="text-[10px] text-blue-700 bg-blue-100/50 border-blue-200 font-bold uppercase py-0 px-1.5 h-4">
                      Doctor Attachments
                    </Badge>
                  </div>
                  {prescription.photos && prescription.photos.length > 0 && (
                    <span className="text-xs font-semibold text-blue-700">{prescription.photos.length} Photo{prescription.photos.length > 1 ? 's' : ''} attached</span>
                  )}
                </div>

                <p className="text-[11px] text-slate-600">
                  Upload clinical photos (lesions, X-rays, photos of handwritten notes, etc.) or PDF documents. Added photos will be embedded directly in the printed prescription format.
                </p>

                {!isReceptionist && (
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors">
                      <Camera className="w-4 h-4" />
                      Add Clinical Photos
                      <input 
                        type="file" 
                        accept="image/*" 
                        multiple 
                        onChange={handleFileUpload} 
                        className="hidden" 
                      />
                    </label>

                    <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors">
                      <FileText className="w-4 h-4 text-slate-500" />
                      Attach PDF
                      <input 
                        type="file" 
                        accept=".pdf" 
                        onChange={handleFileUpload} 
                        className="hidden" 
                      />
                    </label>

                    {prescription.attachmentName && (
                      <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 flex items-center gap-1.5 py-1 px-2.5">
                        <FileText className="w-3.5 h-3.5" />
                        {prescription.attachmentName}
                        <button
                          type="button"
                          onClick={() => setPrescription({ ...prescription, attachmentUrl: '', attachmentName: '' })}
                          className="hover:text-rose-600 ml-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    )}
                  </div>
                )}

                {/* Uploaded Photos Gallery Preview */}
                {prescription.photos && prescription.photos.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    {prescription.photos.map((photo: string, idx: number) => (
                      <div key={idx} className="relative group border border-blue-200 rounded-lg overflow-hidden bg-white shadow-sm flex flex-col items-center">
                        <img src={photo} alt={`Clinical Photo ${idx + 1}`} className="w-full h-24 object-cover" />
                        <div className="w-full bg-slate-50 text-[10px] font-bold text-slate-600 text-center py-0.5 border-t border-slate-100">
                          Photo {idx + 1}
                        </div>
                        {!isReceptionist && (
                          <button
                            type="button"
                            onClick={() => removePhoto(idx)}
                            className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-1 opacity-90 hover:opacity-100 shadow hover:bg-rose-700 transition-opacity"
                            title="Remove Photo"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Referred Lab / Radiological Test Referral Section */}
              <div className="space-y-3 bg-purple-50/60 border border-purple-200 rounded-xl p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Microscope className="w-4 h-4 text-purple-600" />
                    Referred Lab & Radiological Tests (Investigation Referral)
                  </Label>
                  <span className="text-[11px] text-purple-700 font-bold bg-purple-100 px-2 py-0.5 rounded-full">
                    {(prescription.investigationsAdvised || []).length} Selected
                  </span>
                </div>
                
                {/* Quick selection chips for common pathology & radiology tests */}
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-purple-800">Quick Select Common Tests:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'CBC', 'LFT', 'KFT', 'Lipid Profile', 'Thyroid Profile (T3,T4,TSH)',
                      'HbA1c', 'FBS / PPBS', 'Urine RE', 'USG Abdomen & Pelvis', 'Upper GI Endoscopy',
                      'Colonoscopy', 'X-Ray Chest PA', 'CT Scan Abdomen', 'MRI Brain', 'ECG (12-Lead)', 'Stool Routine'
                    ].map((testName) => {
                      const isSelected = (prescription.investigationsAdvised || []).includes(testName);
                      return (
                        <Badge
                          key={testName}
                          variant={isSelected ? "default" : "outline"}
                          className={cn(
                            "cursor-pointer text-xs py-1 px-2.5 transition-all select-none rounded-lg",
                            isSelected 
                              ? "bg-purple-600 text-white hover:bg-purple-700 font-bold shadow-xs" 
                              : "bg-white text-purple-800 border-purple-200 hover:bg-purple-100/80 font-medium"
                          )}
                          onClick={() => {
                            if (isReceptionist) return;
                            const current = prescription.investigationsAdvised || [];
                            if (isSelected) {
                              setPrescription({
                                ...prescription,
                                investigationsAdvised: current.filter((t: string) => t !== testName)
                              });
                            } else {
                              setPrescription({
                                ...prescription,
                                investigationsAdvised: [...current, testName]
                              });
                            }
                          }}
                        >
                          {isSelected ? "✓ " : "+ "}{testName}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                {/* Custom test input field */}
                <div className="flex gap-2 items-center pt-1">
                  <Input
                    disabled={isReceptionist}
                    placeholder="Type additional test name (e.g. FibroScan, Serum Electrolytes)..."
                    value={customTestInput}
                    onChange={(e) => setCustomTestInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomTest();
                      }
                    }}
                    className="bg-white border-purple-200 focus:ring-purple-500 h-9 text-xs"
                  />
                  <Button
                    type="button"
                    disabled={isReceptionist || !customTestInput.trim()}
                    onClick={handleAddCustomTest}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold h-9 px-3 shrink-0 text-xs gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Test
                  </Button>
                </div>

                {/* Selected Tests Tags */}
                {(prescription.investigationsAdvised || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-purple-200/60">
                    <span className="text-[11px] font-bold text-purple-900 self-center mr-1">Referred:</span>
                    {(prescription.investigationsAdvised || []).map((t: string, idx: number) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 bg-white border border-purple-300 text-purple-900 text-xs font-semibold px-2.5 py-1 rounded-md shadow-2xs"
                      >
                        {t}
                        {!isReceptionist && (
                          <X
                            className="w-3.5 h-3.5 text-purple-500 hover:text-rose-600 cursor-pointer"
                            onClick={() => {
                              const current = prescription.investigationsAdvised || [];
                              setPrescription({
                                ...prescription,
                                investigationsAdvised: current.filter((_: string, i: number) => i !== idx)
                              });
                            }}
                          />
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Medicine Prescription Section - AT THE BOTTOM OF THE PAGE */}
              <div className="space-y-4 bg-emerald-50/40 border border-emerald-200/80 rounded-xl p-4 shadow-xs">
                <datalist id="common-opd-medicines-list">
                  {COMMON_MEDICINES_CATALOG.map((m, i) => (
                    <option key={i} value={m.name}>{m.category} | {m.dosage} ({m.frequency})</option>
                  ))}
                </datalist>

                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Pill className="w-4 h-4 text-emerald-600" />
                    <Label className="text-sm font-black text-emerald-900 uppercase tracking-wider">Medicine Prescription (Rx)</Label>
                  </div>
                  {!isReceptionist && (
                    <div className="flex items-center gap-2">
                      <Button 
                        type="button"
                        variant="outline" 
                        size="sm" 
                        onClick={() => setIsCommonMedsOpen(true)} 
                        className="gap-1.5 text-blue-700 border-blue-300 bg-blue-50/80 hover:bg-blue-100 font-bold text-xs h-8"
                      >
                        <Search className="w-3.5 h-3.5" />
                        Common Medicines Catalog
                      </Button>
                      <Button 
                        type="button"
                        variant="outline" 
                        size="sm" 
                        onClick={addMedicine} 
                        className="gap-1.5 text-emerald-700 border-emerald-300 bg-white hover:bg-emerald-100 font-bold text-xs h-8"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Blank Row
                      </Button>
                    </div>
                  )}
                </div>
                
                <div className="space-y-3">
                  {prescription.medicines.map((med: any, idx: number) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-end bg-white p-3 rounded-lg border border-emerald-200/70 shadow-2xs">
                      <div className="col-span-4 space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold text-emerald-800">Medicine Name (Auto-suggest)</Label>
                        <Input 
                          disabled={isReceptionist}
                          list="common-opd-medicines-list"
                          placeholder="Type or select e.g. Paracetamol / Pan-D" 
                          value={med.name} 
                          onChange={(e) => {
                            const val = e.target.value;
                            
                            const matched = COMMON_MEDICINES_CATALOG.find(c => c.name.toLowerCase() === val.toLowerCase());
                            
                            let isOut = false;
                            if (val && val.trim().length >= 3) {
                              const masterInv = storage.get('hms_inv_items', []);
                              const foundInv = masterInv.find((inv: any) => 
                                (inv.name || '').toLowerCase().includes(val.trim().toLowerCase()) ||
                                val.trim().toLowerCase().includes((inv.name || '').toLowerCase())
                              );

                              isOut = foundInv ? Number(foundInv.stock) <= 0 : false;

                              if (isOut) {
                                const shortageAlert = {
                                  id: `psa-${Date.now()}-${idx}`,
                                  medicineName: val,
                                  patientName: selectedPatient?.name || 'OPD Patient',
                                  mrn: selectedPatient?.mrn || 'OPD',
                                  doctorName: (selectedDoctorFilter !== 'all' ? selectedDoctorFilter : null) || prescription?.doctor || selectedPatient?.assignedDoctor || 'Dr. Navodita Tiwari',
                                  requestedAt: new Date().toISOString(),
                                  status: 'Out of Stock Alert'
                                };
                                const existingAlerts = storage.get('hms_pharmacy_shortage_alerts', []);
                                if (!existingAlerts.some((a: any) => a.medicineName.toLowerCase() === val.toLowerCase() && a.patientName === shortageAlert.patientName)) {
                                  storage.set('hms_pharmacy_shortage_alerts', [shortageAlert, ...existingAlerts]);
                                  toast.warning(`Pharmacy Alert: "${val}" is currently Out of Stock in Pharmacy Store! Alert recorded for procurement.`);
                                }
                              }
                            }

                            setPrescription((prev: any) => {
                              const newMedicines = prev.medicines.map((m: any, i: number) => {
                                if (i === idx) {
                                  const updatedMed = { ...m, name: val, isOutOfStock: isOut };
                                  if (matched) {
                                    if (!updatedMed.dosage) updatedMed.dosage = matched.dosage;
                                    if (!updatedMed.frequency) updatedMed.frequency = matched.frequency;
                                    if (!updatedMed.duration) updatedMed.duration = matched.duration;
                                  }
                                  return updatedMed;
                                }
                                return m;
                              });
                              return { ...prev, medicines: newMedicines };
                            });
                          }}
                          className="h-9 bg-white"
                        />
                        {med.isOutOfStock && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-md mt-1 animate-pulse">
                            <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                            <span>⚠️ Non-available in Pharmacy Store! Auto-alert sent to Pharmacy.</span>
                          </div>
                        )}
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold text-emerald-800">Dosage</Label>
                        <Input 
                          disabled={isReceptionist}
                          placeholder="e.g. 1 tab" 
                          value={med.dosage} 
                          onChange={(e) => updateMedicine(idx, 'dosage', e.target.value)}
                          className="h-9 bg-white"
                        />
                      </div>
                      <div className="col-span-3 space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold text-emerald-800">Frequency</Label>
                        <Input 
                          disabled={isReceptionist}
                          placeholder="1-0-1 (BD)" 
                          value={med.frequency} 
                          onChange={(e) => updateMedicine(idx, 'frequency', e.target.value)}
                          className="h-9 bg-white"
                        />
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold text-emerald-800">Duration</Label>
                        <Input 
                          disabled={isReceptionist}
                          placeholder="5 days" 
                          value={med.duration} 
                          onChange={(e) => updateMedicine(idx, 'duration', e.target.value)}
                          className="h-9 bg-white"
                        />
                      </div>
                      <div className="col-span-1">
                        <Button disabled={isReceptionist} variant="ghost" size="icon" className="h-9 w-9 text-rose-500 hover:bg-rose-50" onClick={() => removeMedicine(idx)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Specific Medicine Instruction Row */}
                      <div className="col-span-12 pt-2 border-t border-emerald-100 flex flex-col sm:flex-row items-start sm:items-center gap-2">
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] font-bold text-emerald-900 uppercase">📌 Instruction:</span>
                        </div>
                        <Input 
                          disabled={isReceptionist}
                          placeholder="e.g. After food with warm water / Empty stomach in morning / At bedtime / SOS"
                          value={med.instructions || ''}
                          onChange={(e) => updateMedicine(idx, 'instructions', e.target.value)}
                          className="h-7 text-xs bg-emerald-50/50 border-emerald-200 focus:bg-white flex-1"
                        />
                        <div className="flex flex-wrap items-center gap-1 shrink-0">
                          {[
                            'After Meals (PC)',
                            'Before Meals (AC)',
                            'Empty Stomach',
                            'At Bedtime (HS)',
                            'With Warm Water',
                            'SOS / As Needed'
                          ].map((chip, cIdx) => (
                            <button
                              key={cIdx}
                              type="button"
                              disabled={isReceptionist}
                              onClick={() => {
                                const current = med.instructions || '';
                                const updated = current ? `${current}, ${chip}` : chip;
                                updateMedicine(idx, 'instructions', updated);
                              }}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-medium transition cursor-pointer shadow-2xs"
                            >
                              +{chip}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* General Instructions about Medicine Uses */}
                <div className="mt-4 p-3.5 bg-amber-50/80 border border-amber-200/90 rounded-2xl space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <div className="flex items-center gap-1.5 text-amber-950 font-bold text-xs uppercase tracking-wider">
                      <Info className="w-4 h-4 text-amber-600" />
                      General Instructions on Medicine Use & Care
                    </div>
                    <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[9px] font-extrabold uppercase">
                      Printed on Prescription
                    </Badge>
                  </div>

                  {/* Quick Instruction Presets */}
                  <div>
                    <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block mb-1">Quick Presets:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        'Take all oral medicines after meals with plain water.',
                        'Complete full course of antibiotics as prescribed.',
                        'Do not crush, chew or break enteric-coated tablets.',
                        'Maintain light, non-spicy diet & drink 2-3L water daily.',
                        'Store medicines in cool, dry place away from sunlight.',
                        'In case of rash or allergy, stop medicine & inform doctor.'
                      ].map((presetText, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          disabled={isReceptionist}
                          onClick={() => {
                            const currentInst = prescription.generalInstructions || '';
                            if (currentInst.includes(presetText)) return;
                            const updated = currentInst ? `${currentInst}\n• ${presetText}` : `• ${presetText}`;
                            setPrescription({ ...prescription, generalInstructions: updated });
                            toast.success('Added general instruction');
                          }}
                          className="text-[10px] bg-white hover:bg-amber-100/90 text-amber-900 border border-amber-300/80 px-2 py-1 rounded-lg transition font-medium flex items-center gap-1 shadow-2xs"
                        >
                          <Plus className="w-3 h-3 text-amber-600" />
                          {presetText}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Textarea
                    disabled={isReceptionist}
                    placeholder="Type or select general instructions regarding medicine dosage, precautions, timing, food interactions..."
                    value={prescription.generalInstructions || ''}
                    onChange={(e) => setPrescription({ ...prescription, generalInstructions: e.target.value })}
                    rows={3}
                    className="w-full text-xs p-2.5 bg-white border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder:text-amber-700/50 resize-y"
                  />
                </div>
              </div>
            </div>

            {/* Right side: Clinical Assistant Workspace & History Hub */}
            <div className="lg:col-span-5 bg-gradient-to-b from-slate-50 via-white to-slate-50 p-3 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col gap-3 sticky top-2 self-start max-h-[85vh] overflow-hidden">
              <Tabs value={rxRightTab} onValueChange={(val: any) => setRxRightTab(val)} className="flex-1 flex flex-col min-h-0">
                <TabsList className="grid grid-cols-4 bg-slate-100 p-1 rounded-xl h-auto shrink-0">
                  <TabsTrigger value="summary" className="text-[11px] font-bold py-1.5 px-1 rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-800 data-[state=active]:shadow-xs gap-1">
                    <Activity className="w-3.5 h-3.5 text-emerald-600" />
                    Vitals & Rx
                  </TabsTrigger>
                  <TabsTrigger value="quick" className="text-[11px] font-bold py-1.5 px-1 rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-800 data-[state=active]:shadow-xs gap-1">
                    <Zap className="w-3.5 h-3.5 text-blue-600" />
                    Quick Add
                  </TabsTrigger>
                  <TabsTrigger value="history" className="text-[11px] font-bold py-1.5 px-1 rounded-lg data-[state=active]:bg-white data-[state=active]:text-amber-800 data-[state=active]:shadow-xs gap-1">
                    <History className="w-3.5 h-3.5 text-amber-600" />
                    Past Log
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="text-[11px] font-bold py-1.5 px-1 rounded-lg data-[state=active]:bg-white data-[state=active]:text-purple-800 data-[state=active]:shadow-xs gap-1">
                    <Eye className="w-3.5 h-3.5 text-purple-600" />
                    Print Rx
                  </TabsTrigger>
                </TabsList>

                {/* TAB 1: SUMMARY & QUICK ADVICE */}
                <TabsContent value="summary" className="flex-1 overflow-y-auto space-y-3 pt-2 pr-1 mt-0">
                  {/* Patient Profile Snapshot */}
                  <div className="bg-emerald-900 text-white rounded-xl p-3 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-emerald-700/80 border border-emerald-400/40 flex items-center justify-center font-black text-sm text-white shrink-0 uppercase">
                          {selectedPatient?.name?.charAt(0) || 'P'}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-xs text-white leading-tight">{selectedPatient?.name}</h4>
                          <p className="text-[10px] text-emerald-200 mt-0.5">
                            {selectedPatient?.age}Y • {selectedPatient?.gender} • MRN: <span className="font-bold">{selectedPatient?.mrn}</span>
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-emerald-500/30 text-emerald-100 border-emerald-400/30 text-[10px] uppercase font-bold">
                        {selectedPatient?.bloodGroup || selectedPatient?.blood_group || 'O+'}
                      </Badge>
                    </div>

                    {(selectedPatient?.allergies || (selectedPatient as any)?.known_allergies) && (
                      <div className="bg-rose-500/20 border border-rose-300/30 rounded-lg p-2 flex items-center gap-2 text-rose-100 text-[11px] font-medium">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-300 shrink-0" />
                        <span><strong>Allergies:</strong> {selectedPatient?.allergies || (selectedPatient as any)?.known_allergies}</span>
                      </div>
                    )}
                  </div>

                  {/* Vitals Summary Pills */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs space-y-2">
                    <span className="text-[11px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                      <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                      Live Patient Vitals Snapshot
                    </span>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-slate-50 border border-slate-200/60 rounded-lg p-1.5">
                        <span className="text-[9px] uppercase font-bold text-slate-500 block">BP</span>
                        <span className="text-xs font-black text-slate-800">{prescription.vitals?.bp || '120/80'}</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-200/60 rounded-lg p-1.5">
                        <span className="text-[9px] uppercase font-bold text-slate-500 block">Pulse</span>
                        <span className="text-xs font-black text-slate-800">{prescription.vitals?.pulse ? `${prescription.vitals.pulse} bpm` : '--'}</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-200/60 rounded-lg p-1.5">
                        <span className="text-[9px] uppercase font-bold text-slate-500 block">Temp</span>
                        <span className="text-xs font-black text-slate-800">{(prescription.vitals?.temp || prescription.vitals?.temperature) ? `${prescription.vitals?.temp || prescription.vitals?.temperature} °F` : '--'}</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-200/60 rounded-lg p-1.5">
                        <span className="text-[9px] uppercase font-bold text-slate-500 block">SpO2</span>
                        <span className="text-xs font-black text-slate-800">{prescription.vitals?.spo2 ? `${prescription.vitals.spo2}%` : '--'}</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-200/60 rounded-lg p-1.5">
                        <span className="text-[9px] uppercase font-bold text-slate-500 block">Weight</span>
                        <span className="text-xs font-black text-slate-800">{prescription.vitals?.weight ? `${prescription.vitals.weight} kg` : '--'}</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-200/60 rounded-lg p-1.5">
                        <span className="text-[9px] uppercase font-bold text-slate-500 block">BMI</span>
                        <span className="text-xs font-black text-slate-800">{prescription.vitals?.bmi || '--'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Active Prescription Status Counts */}
                  <div className="bg-blue-50/70 border border-blue-200/80 p-3 rounded-xl space-y-2">
                    <span className="text-[11px] font-black uppercase text-blue-900 tracking-wider flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                      Prescription Items Live Counter
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white p-2 rounded-lg border border-blue-100 flex items-center justify-between">
                        <span className="text-slate-600 font-medium">Medicines (Rx):</span>
                        <Badge className="bg-emerald-600 text-white font-black text-[10px]">
                          {(prescription.medicines || []).filter((m: any) => m.name && m.name.trim() !== '').length}
                        </Badge>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-blue-100 flex items-center justify-between">
                        <span className="text-slate-600 font-medium">Lab Investigations:</span>
                        <Badge className="bg-purple-600 text-white font-black text-[10px]">
                          {(prescription.investigationsAdvised || []).length}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Quick Clinical Advice Presets */}
                  <div className="bg-amber-50/70 border border-amber-200/80 p-3 rounded-xl space-y-2">
                    <span className="text-[11px] font-black uppercase text-amber-900 tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        Quick Dietary & Care Advice Presets
                      </span>
                      <span className="text-[9px] text-amber-700 font-bold">Click to append</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[
                        '• Avoid spicy, fried, citrus, and oily foods.',
                        '• Drink 3 to 4 Litres of fluids / warm water daily.',
                        '• Restrict salt and sugar intake strictly.',
                        '• Strict bed rest recommended for 3-5 days.',
                        '• Take all medications strictly after food.',
                        '• Walk for 15-20 minutes after meals.',
                        '• Review in OPD after 5 days or if symptoms worsen.'
                      ].map((preset, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => {
                            const current = prescription.advice || '';
                            if (current.includes(preset)) {
                              toast.info('Advice preset already added');
                              return;
                            }
                            const updated = current ? `${current}\n${preset}` : preset;
                            setPrescription({ ...prescription, advice: updated });
                            toast.success('Added advice to prescription');
                          }}
                          className="text-[11px] text-amber-900 bg-white hover:bg-amber-100 border border-amber-200/90 rounded-lg px-2.5 py-1 text-left font-medium shadow-2xs transition-all hover:scale-[1.01]"
                        >
                          + {preset.replace('• ', '')}
                        </button>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* TAB 2: QUICK ADD DRUGS & LAB TESTS */}
                <TabsContent value="quick" className="flex-1 overflow-y-auto space-y-3 pt-2 pr-1 mt-0 max-h-[500px]">
                  {/* Quick Medicine Favorites */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between border-b pb-1.5">
                      <span className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5">
                        <Pill className="w-4 h-4 text-emerald-600" />
                        Quick Add Common Medicines
                      </span>
                      <Button 
                        type="button"
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setIsCommonMedsOpen(true)}
                        className="text-[10px] text-emerald-700 font-bold h-6 px-1.5"
                      >
                        Full Catalog &rarr;
                      </Button>
                    </div>

                    <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                      {COMMON_MEDICINES_CATALOG.slice(0, 10).map((med, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200/60 text-xs">
                          <div className="min-w-0 pr-2">
                            <p className="font-bold text-slate-900 truncate">{med.name}</p>
                            <p className="text-[10px] text-slate-500">{med.dosage} • {med.frequency}</p>
                          </div>
                          <Button 
                            type="button" 
                            size="sm" 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] h-6 px-2 shrink-0 gap-1"
                            onClick={() => {
                              const newMed = { name: med.name, dosage: med.dosage, frequency: med.frequency, duration: med.duration };
                              const currentMeds = prescription.medicines || [];
                              let updated = [];
                              if (currentMeds.length === 1 && (!currentMeds[0].name || currentMeds[0].name.trim() === '')) {
                                updated = [newMed];
                              } else {
                                updated = [...currentMeds, newMed];
                              }
                              setPrescription({ ...prescription, medicines: updated });
                              toast.success(`Added ${med.name}`);
                            }}
                          >
                            <Plus className="w-3 h-3" />
                            Add
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick Lab Investigation Referral Shortcuts */}
                  <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-200/80 shadow-2xs space-y-2">
                    <span className="text-xs font-black uppercase text-purple-950 flex items-center gap-1.5">
                      <Microscope className="w-4 h-4 text-purple-600" />
                      Quick Toggle Lab & Radiological Tests
                    </span>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[
                        'CBC', 'LFT', 'KFT', 'Lipid Profile', 'Thyroid Profile (T3,T4,TSH)', 'HbA1c',
                        'FBS / PPBS', 'Urine RE', 'USG Abdomen & Pelvis', 'Chest X-Ray PA', 'ECG (12-Lead)', 'Upper GI Endoscopy'
                      ].map((testName) => {
                        const isSel = (prescription.investigationsAdvised || []).includes(testName);
                        return (
                          <button
                            key={testName}
                            type="button"
                            onClick={() => {
                              const current = prescription.investigationsAdvised || [];
                              const updated = isSel ? current.filter((t: string) => t !== testName) : [...current, testName];
                              setPrescription({ ...prescription, investigationsAdvised: updated });
                            }}
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                              isSel 
                                ? 'bg-purple-700 text-white border-purple-800 shadow-2xs' 
                                : 'bg-white text-purple-900 border-purple-200 hover:bg-purple-100'
                            }`}
                          >
                            {isSel ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3 text-purple-500" />}
                            {testName}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </TabsContent>

                {/* TAB 3: PAST HISTORY LOG */}
                <TabsContent value="history" className="flex-1 overflow-y-auto pt-1 mt-0 min-h-0">
                  <OPDPatientHistory 
                    patient={selectedPatient}
                    vitals={selectedPatientVitals}
                    notes={selectedPatientNotes}
                    prescriptions={savedPrescriptions}
                    labRequests={selectedPatientLabs}
                    loading={loadingHistory}
                    onPrintPrescription={(rx) => {
                      const docObj = users.find(u => u.name === (rx.doctor || rx.doctor_name));
                      const latestVitals = selectedPatientVitals && selectedPatientVitals.length > 0 ? selectedPatientVitals[0] : undefined;

                      const unpacked = deserializePrescriptionAdvice(rx.advice || rx.notes || '');
                      const html = getPrescriptionPrintHtml(
                        {
                          name: selectedPatient.name,
                          age: selectedPatient.age,
                          gender: selectedPatient.gender,
                          mrn: selectedPatient.mrn,
                          phone: selectedPatient.phone || selectedPatient.mobile || '',
                          fatherName: selectedPatient.fatherName || selectedPatient.father_name || '',
                          allergies: selectedPatient.allergies || (selectedPatient as any).known_allergies || (selectedPatient as any).allergies_list,
                          pastHistory: selectedPatient.pastHistory || (selectedPatient as any).medical_history || (selectedPatient as any).past_history || (selectedPatient as any).history,
                          medicalHistory: selectedPatient.medicalHistory,
                          complaints: (selectedPatient as any).complaints || (selectedPatient as any).presentingComplaints
                        },
                        {
                          date: rx.date || rx.prescription_date,
                          medicines: rx.medicines || rx.medications || [],
                          advice: unpacked.advice,
                          examinationFindings: unpacked.examinationFindings,
                          pastHistory: unpacked.pastHistory,
                          allergies: unpacked.allergies,
                          drawing: unpacked.drawing,
                          diagnosis: unpacked.diagnosis,
                          photos: unpacked.photos || [],
                          attachmentUrl: unpacked.attachmentUrl || rx.attachment_url,
                          attachmentName: unpacked.attachmentName || rx.attachment_name,
                          vitals: {
                            ...(latestVitals || {}),
                            ...(rx.vitals || {})
                          },
                          planSurgeryNeeded: unpacked.planSurgeryNeeded,
                          plannedSurgeryName: unpacked.plannedSurgeryName,
                          plannedSurgeryDate: unpacked.plannedSurgeryDate,
                          plannedSurgeryNotes: unpacked.plannedSurgeryNotes,
                          admitNeeded: unpacked.admitNeeded,
                          admitReason: unpacked.admitReason,
                          admitWardType: unpacked.admitWardType
                        },
                        docObj,
                        hospitalInfo
                      );
                      
                      safePrint(html, 800, 1000);
                    }}
                  />
                </TabsContent>

                {/* TAB 4: REAL-TIME PRINT PREVIEW SHEET */}
                <TabsContent value="preview" className="flex-1 overflow-y-auto space-y-2 pt-2 pr-1 mt-0 bg-slate-200/50 p-2.5 rounded-xl border border-slate-300/80 max-h-[500px]">
                  <div className="bg-white p-4 rounded-lg shadow-xs border border-slate-300 text-[11px] text-slate-800 space-y-3 font-sans">
                    {/* Mini Header */}
                    <div className="border-b-2 border-emerald-700 pb-2 flex justify-between items-start">
                      <div>
                        <h3 className="font-extrabold text-sm text-emerald-900 uppercase">{hospitalInfo?.name || 'CARE HOSPITAL & MEDICAL CENTRE'}</h3>
                        <p className="text-[9px] text-slate-500">{hospitalInfo?.address || 'OPD Clinical Department'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-800">{prescription.doctor || 'Attending Doctor'}</p>
                        <p className="text-[9px] text-slate-500">Date: {prescription.date}</p>
                      </div>
                    </div>

                    {/* Patient Info Bar */}
                    <div className="bg-slate-50 p-2 rounded border border-slate-200 grid grid-cols-2 gap-1 text-[10px]">
                      <div><strong>Patient Name:</strong> {selectedPatient?.name}</div>
                      <div><strong>Age/Gender:</strong> {selectedPatient?.age}Y / {selectedPatient?.gender}</div>
                      <div><strong>MRN No:</strong> {selectedPatient?.mrn}</div>
                      <div><strong>BP:</strong> {prescription.vitals?.bp || '120/80'} | <strong>Pulse:</strong> {prescription.vitals?.pulse || '--'}</div>
                    </div>

                    {/* Complaints & Findings */}
                    {prescription.complaints && (
                      <div>
                        <p className="font-bold text-emerald-900 border-b border-emerald-100 pb-0.5 uppercase text-[10px]">Chief Complaints:</p>
                        <p className="text-slate-700 mt-0.5 whitespace-pre-line">{prescription.complaints}</p>
                      </div>
                    )}

                    {/* Diagnosis */}
                    {prescription.diagnosis && (
                      <div>
                        <p className="font-bold text-emerald-900 border-b border-emerald-100 pb-0.5 uppercase text-[10px]">Diagnosis:</p>
                        <p className="text-slate-800 font-semibold mt-0.5">{prescription.diagnosis}</p>
                      </div>
                    )}

                    {/* Rx Medicines Table */}
                    <div>
                      <p className="font-bold text-emerald-900 border-b border-emerald-100 pb-0.5 uppercase text-[10px] mb-1">Rx - Prescribed Medicines:</p>
                      <table className="w-full text-left border-collapse border border-slate-200">
                        <thead>
                          <tr className="bg-emerald-50 text-[9px] text-emerald-900 uppercase">
                            <th className="p-1 border">Drug Name</th>
                            <th className="p-1 border">Dose</th>
                            <th className="p-1 border">Frequency</th>
                            <th className="p-1 border">Duration</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(prescription.medicines || []).filter((m: any) => m.name && m.name.trim() !== '').map((med: any, i: number) => (
                            <tr key={i} className="border-t text-[10px]">
                              <td className="p-1 border font-medium">{med.name}</td>
                              <td className="p-1 border">{med.dosage}</td>
                              <td className="p-1 border">{med.frequency}</td>
                              <td className="p-1 border">{med.duration}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Referred Investigations */}
                    {(prescription.investigationsAdvised || []).length > 0 && (
                      <div>
                        <p className="font-bold text-emerald-900 border-b border-emerald-100 pb-0.5 uppercase text-[10px]">Referred Investigations:</p>
                        <p className="text-slate-700 mt-0.5 font-medium">{(prescription.investigationsAdvised || []).join(', ')}</p>
                      </div>
                    )}

                    {/* Advice */}
                    {prescription.advice && (
                      <div>
                        <p className="font-bold text-emerald-900 border-b border-emerald-100 pb-0.5 uppercase text-[10px]">General Advice & Instructions:</p>
                        <p className="text-slate-700 mt-0.5 whitespace-pre-line">{prescription.advice}</p>
                      </div>
                    )}

                    {/* Doctor Signature Line */}
                    <div className="pt-6 flex justify-end">
                      <div className="text-center border-t border-slate-300 pt-1 w-36">
                        <p className="font-bold text-[10px]">{prescription.doctor || 'Doctor Signature'}</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          <DialogFooter className="gap-2 mt-4 border-t pt-4">
            <Button variant="outline" onClick={() => setIsPrescriptionOpen(false)}>Cancel</Button>
            <Button variant="outline" className="gap-2 border-emerald-200 text-emerald-600 hover:bg-emerald-50" onClick={printPrescription}>
              <Printer className="w-4 h-4" />
              Print
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2" onClick={handleSavePrescription}>
              <CheckCircle2 className="w-4 h-4" />
              {isReceptionist ? 'Save Vitals Only' : 'Save Prescription'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Prescription Templates Dialog */}
      <Dialog open={isManageTemplatesOpen} onOpenChange={setIsManageTemplatesOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto bg-white">
          <DialogHeader className="border-b pb-3 mb-2">
            <DialogTitle className="flex items-center gap-2 text-emerald-800">
              <BookOpen className="w-5 h-5 text-emerald-600" />
              Manage Prescription Templates
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-xs text-slate-500">
              Below are the standard clinical templates and custom templates you have created. You can use these to instantly fill medicines, diagnoses, advice, and findings when writing prescriptions.
            </p>

            <div className="space-y-3">
              {prescriptionTemplates.map((tpl) => {
                const isDefault = ['tpl-gerd', 'tpl-gastro', 'tpl-htn', 'tpl-cold'].includes(tpl.id);
                return (
                  <div key={tpl.id} className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-800">{tpl.name}</h4>
                          <Badge variant="secondary" className={isDefault ? "bg-blue-50 text-blue-700 border-blue-100 text-[10px] font-bold" : "bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px] font-bold"}>
                            {isDefault ? "Standard Protocol" : "Custom Template"}
                          </Badge>
                        </div>
                        {tpl.diagnosis && (
                          <p className="text-xs text-slate-600">
                            <span className="font-semibold text-slate-700">Diagnosis:</span> {tpl.diagnosis}
                          </p>
                        )}
                      </div>

                      {!isDefault && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={(e) => handleDeleteTemplate(tpl.id, e)}
                          className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 shrink-0"
                          title="Delete Template"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 text-xs">
                      <div>
                        <span className="font-bold text-[11px] text-slate-700 uppercase tracking-wider block mb-1">Medicines ({tpl.medicines?.length || 0})</span>
                        <ul className="list-disc pl-4 space-y-1 text-slate-600">
                          {tpl.medicines && tpl.medicines.map((m: any, i: number) => (
                            <li key={i}>
                              <span className="font-semibold text-slate-800">{m.name}</span> - {m.dosage} ({m.frequency} / {m.duration})
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <span className="font-bold text-[11px] text-slate-700 uppercase tracking-wider block mb-1">Advice & Findings</span>
                        <p className="text-slate-600 line-clamp-3 text-justify">
                          {tpl.advice || "No specific advice entered."}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button 
                        size="sm" 
                        onClick={() => {
                          handleLoadTemplate(tpl.id);
                          setIsManageTemplatesOpen(false);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-xs h-8 font-semibold"
                      >
                        Load This Template
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="border-t pt-3">
            <Button variant="outline" onClick={() => setIsManageTemplatesOpen(false)} className="text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Prescription History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader className="border-b pb-3 mb-2">
            <DialogTitle className="flex items-center gap-2 text-slate-800">
              <History className="w-5 h-5 text-amber-500" />
              Patient Clinical History Dashboard - {selectedPatient?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="py-2">
            <OPDPatientHistory 
              patient={selectedPatient}
              vitals={selectedPatientVitals}
              notes={selectedPatientNotes}
              prescriptions={savedPrescriptions}
              labRequests={selectedPatientLabs}
              loading={loadingHistory}
              onPrintPrescription={(rx) => {
                const docObj = users.find(u => u.name === (rx.doctor || rx.doctor_name));
                const latestVitals = selectedPatientVitals && selectedPatientVitals.length > 0 ? selectedPatientVitals[0] : undefined;

                const unpacked = deserializePrescriptionAdvice(rx.advice || rx.notes || '');
                const html = getPrescriptionPrintHtml(
                  {
                    name: selectedPatient.name,
                    age: selectedPatient.age,
                    gender: selectedPatient.gender,
                    mrn: selectedPatient.mrn,
                    phone: selectedPatient.phone || selectedPatient.mobile || '',
                    fatherName: selectedPatient.fatherName || selectedPatient.father_name || '',
                    allergies: selectedPatient.allergies || (selectedPatient as any).known_allergies || (selectedPatient as any).allergies_list,
                    pastHistory: selectedPatient.pastHistory || (selectedPatient as any).medical_history || (selectedPatient as any).past_history || (selectedPatient as any).history,
                    medicalHistory: selectedPatient.medicalHistory,
                    complaints: (selectedPatient as any).complaints || (selectedPatient as any).presentingComplaints
                  },
                  {
                    date: rx.date || rx.prescription_date,
                    medicines: rx.medicines || rx.medications || [],
                    advice: unpacked.advice,
                    examinationFindings: unpacked.examinationFindings,
                    pastHistory: unpacked.pastHistory,
                    allergies: unpacked.allergies,
                    drawing: unpacked.drawing,
                    diagnosis: unpacked.diagnosis,
                    photos: unpacked.photos || [],
                    attachmentUrl: unpacked.attachmentUrl || rx.attachment_url,
                    attachmentName: unpacked.attachmentName || rx.attachment_name,
                    vitals: {
                      ...(latestVitals || {}),
                      ...(rx.vitals || {})
                    },
                    planSurgeryNeeded: unpacked.planSurgeryNeeded,
                    plannedSurgeryName: unpacked.plannedSurgeryName,
                    plannedSurgeryDate: unpacked.plannedSurgeryDate,
                    plannedSurgeryNotes: unpacked.plannedSurgeryNotes,
                    admitNeeded: unpacked.admitNeeded,
                    admitReason: unpacked.admitReason,
                    admitWardType: unpacked.admitWardType
                  },
                  docObj,
                  hospitalInfo
                );
                safePrint(html, 800, 1000);
              }}
            />
          </div>

          <DialogFooter className="border-t pt-4 mt-2">
            <Button className="bg-slate-800 hover:bg-slate-900" onClick={() => setIsHistoryOpen(false)}>Close Archive</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Patient Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-medical-blue" />
              Patient Details - {selectedPatient?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto custom-scrollbar pr-4">
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">MRN / Patient ID</p>
                  <p className="text-sm font-bold text-medical-blue">{selectedPatient?.mrn}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name</p>
                  <p className="text-sm font-medium">{selectedPatient?.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone</p>
                  <p className="text-sm font-medium">{selectedPatient?.phone || selectedPatient?.mobile || selectedPatient?.contact || selectedPatient?.phone_number || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email</p>
                  <p className="text-sm font-medium">{selectedPatient?.email || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Age / Gender</p>
                  <p className="text-sm font-medium">{selectedPatient?.age}Y / {selectedPatient?.gender}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date of Birth</p>
                  <p className="text-sm font-medium">{selectedPatient?.dob || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Blood Group</p>
                  <p className="text-sm font-medium">{selectedPatient?.bloodGroup || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Relative 1 ({selectedPatient?.relative1Relation || selectedPatient?.relative1_relation || 'Father'})</p>
                  <p className="text-sm font-medium">{selectedPatient?.relative1Name || selectedPatient?.relative1_name || selectedPatient?.fatherName || selectedPatient?.father_name || 'N/A'} { (selectedPatient?.relative1Phone || selectedPatient?.relative1_phone || selectedPatient?.fatherPhone || selectedPatient?.father_phone) ? `(${selectedPatient?.relative1Phone || selectedPatient?.relative1_phone || selectedPatient?.fatherPhone || selectedPatient?.father_phone})` : '' }</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Relative 2 ({selectedPatient?.relative2Relation || selectedPatient?.relative2_relation || 'Mother'})</p>
                  <p className="text-sm font-medium">{selectedPatient?.relative2Name || selectedPatient?.relative2_name || selectedPatient?.motherName || selectedPatient?.mother_name || 'N/A'} { (selectedPatient?.relative2Phone || selectedPatient?.relative2_phone || selectedPatient?.motherPhone || selectedPatient?.mother_phone) ? `(${selectedPatient?.relative2Phone || selectedPatient?.relative2_phone || selectedPatient?.motherPhone || selectedPatient?.mother_phone})` : '' }</p>
                </div>
                <div className="col-span-2 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Address</p>
                  <p className="text-sm font-medium">{selectedPatient?.address}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TPA ID</p>
                  <p className="text-sm font-medium">{selectedPatient?.tpaId || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TPA Validity</p>
                  <p className="text-sm font-medium">{selectedPatient?.tpaValidity || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Referral Case</p>
                  <p className="text-sm font-semibold text-teal-700">
                    {selectedPatient?.isReferral || selectedPatient?.is_referral ? '🟢 Yes' : 'No'}
                  </p>
                </div>
                {(selectedPatient?.isReferral || selectedPatient?.is_referral) && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Referred By</p>
                    <p className="text-sm font-semibold text-teal-700">{selectedPatient?.referredBy || selectedPatient?.referred_by || 'N/A'}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 flex-wrap sm:justify-end">
            {selectedPatient && (
              <Button 
                variant="outline" 
                className="gap-2 border-medical-blue text-medical-blue hover:bg-blue-50"
                onClick={() => {
                  const pat = selectedPatient;
                  setIsDetailsOpen(false);
                  startEditPatient(pat);
                }}
              >
                <Edit className="w-4 h-4" />
                Edit Patient
              </Button>
            )}
            <Button className="bg-medical-blue" onClick={() => setIsDetailsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Edit Patient Contact & Details Modal */}
      <Dialog open={!!quickEditPatient} onOpenChange={(open) => { if (!open) setQuickEditPatient(null); }}>
        <DialogContent className="sm:max-w-[520px] max-h-[95vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 bg-gradient-to-r from-blue-700 to-teal-700 text-white">
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-teal-200" />
              <DialogTitle className="text-white text-base font-bold">
                Quick Edit Contact & Details
              </DialogTitle>
            </div>
            <DialogDescription className="text-blue-100 text-xs mt-0.5">
              Update phone number, contact details & demographics for <span className="font-bold text-white">{quickEditPatient?.name}</span> ({quickEditPatient?.mrn})
            </DialogDescription>
          </DialogHeader>

          <div className="p-5 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
            <div className="space-y-1.5">
              <Label htmlFor="quick-phone" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-medical-blue" />
                Primary Phone / Mobile Number *
              </Label>
              <Input
                id="quick-phone"
                placeholder="Enter 10-digit mobile number"
                value={quickContactForm.phone}
                onChange={(e) => setQuickContactForm(prev => ({ ...prev, phone: e.target.value }))}
                className="font-mono text-sm font-semibold"
                autoFocus
              />
              <p className="text-[11px] text-slate-400">Main contact number used for appointment reminders, prescriptions & SMS.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="quick-name" className="text-xs font-bold text-slate-700">Patient Full Name *</Label>
                <Input
                  id="quick-name"
                  placeholder="Patient Name"
                  value={quickContactForm.name}
                  onChange={(e) => setQuickContactForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="quick-age" className="text-xs font-bold text-slate-700">Age</Label>
                  <Input
                    id="quick-age"
                    type="number"
                    placeholder="Age"
                    value={quickContactForm.age}
                    onChange={(e) => setQuickContactForm(prev => ({ ...prev, age: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="quick-gender" className="text-xs font-bold text-slate-700">Gender</Label>
                  <select
                    id="quick-gender"
                    className="w-full h-9 rounded-md border border-input bg-background px-2 py-1 text-xs"
                    value={quickContactForm.gender}
                    onChange={(e) => setQuickContactForm(prev => ({ ...prev, gender: e.target.value }))}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quick-email" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                Email Address (Optional)
              </Label>
              <Input
                id="quick-email"
                type="email"
                placeholder="patient@example.com"
                value={quickContactForm.email}
                onChange={(e) => setQuickContactForm(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quick-address" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Residential Address / Area
              </Label>
              <Input
                id="quick-address"
                placeholder="Village / Town / City address"
                value={quickContactForm.address}
                onChange={(e) => setQuickContactForm(prev => ({ ...prev, address: e.target.value }))}
              />
            </div>

            {/* Relative 1 / Guardian Contact */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">Relative / Guardian Emergency Contact</span>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-500 font-semibold">Relation</Label>
                  <select
                    className="w-full h-8 rounded-md border border-input bg-white px-2 text-xs"
                    value={quickContactForm.relative1Relation}
                    onChange={(e) => setQuickContactForm(prev => ({ ...prev, relative1Relation: e.target.value }))}
                  >
                    <option value="Father">Father</option>
                    <option value="Husband">Husband</option>
                    <option value="Mother">Mother</option>
                    <option value="Son">Son</option>
                    <option value="Daughter">Daughter</option>
                    <option value="Brother">Brother</option>
                    <option value="Sister">Sister</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-500 font-semibold">Relative Name</Label>
                  <Input
                    className="h-8 text-xs bg-white"
                    placeholder="Name"
                    value={quickContactForm.relative1Name}
                    onChange={(e) => setQuickContactForm(prev => ({ ...prev, relative1Name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-500 font-semibold">Relative Phone</Label>
                  <Input
                    className="h-8 text-xs bg-white font-mono"
                    placeholder="Phone"
                    value={quickContactForm.relative1Phone}
                    onChange={(e) => setQuickContactForm(prev => ({ ...prev, relative1Phone: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-3 bg-slate-50 border-t flex items-center justify-between gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs text-medical-blue border-blue-200 hover:bg-blue-50"
              onClick={() => {
                const targetPat = quickEditPatient;
                setQuickEditPatient(null);
                startEditPatient(targetPat);
              }}
            >
              <Edit className="w-3.5 h-3.5 mr-1" />
              Full Profile Editor
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setQuickEditPatient(null)}
                disabled={isSavingQuickContact}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-medical-blue text-white font-bold text-xs gap-1.5"
                onClick={handleSaveQuickContact}
                disabled={isSavingQuickContact}
              >
                {isSavingQuickContact ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Save Contact
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Common Medicines Quick-Picker Catalog Dialog */}
      <Dialog open={isCommonMedsOpen} onOpenChange={setIsCommonMedsOpen}>
        <DialogContent className="sm:max-w-[750px] max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b bg-emerald-50/60">
            <DialogTitle className="flex items-center gap-2 text-emerald-950 font-bold">
              <Pill className="w-5 h-5 text-emerald-600" />
              Common OPD & IPD Medicines Catalog
            </DialogTitle>
            <DialogDescription className="text-xs text-emerald-800">
              Select standard OPD and IPD therapeutic medicines by category to insert directly into the active prescription form.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 space-y-3 bg-slate-50 border-b">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <Input 
                  placeholder="Search by drug name or brand (e.g. Paracetamol, Pan-D, Augmentin)..." 
                  value={catalogSearch} 
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="pl-9 h-9 bg-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              {['ALL', 'Analgesic & Fever', 'Gastrointestinal & PPI', 'Antibiotics', 'Cardiovascular & HTN', 'Antidiabetic', 'Respiratory & Allergy', 'Vitamins & Supplements', 'IPD / Emergency Injections'].map(cat => (
                <Badge
                  key={cat}
                  variant={selectedCatalogCat === cat ? "default" : "outline"}
                  className={`cursor-pointer whitespace-nowrap text-[11px] px-2.5 py-1 ${selectedCatalogCat === cat ? 'bg-emerald-700 text-white' : 'bg-white hover:bg-slate-100 text-slate-700'}`}
                  onClick={() => setSelectedCatalogCat(cat)}
                >
                  {cat === 'ALL' ? 'All Categories' : cat}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[420px]">
            {COMMON_MEDICINES_CATALOG
              .filter(item => {
                const matchesCat = selectedCatalogCat === 'ALL' || item.category === selectedCatalogCat;
                const matchesSearch = !catalogSearch || item.name.toLowerCase().includes(catalogSearch.toLowerCase()) || item.category.toLowerCase().includes(catalogSearch.toLowerCase());
                return matchesCat && matchesSearch;
              })
              .map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-emerald-300 hover:shadow-xs transition-all">
                  <div className="space-y-1 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{item.name}</span>
                      <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-200 font-medium">
                        {item.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-3">
                      <span><strong>Dose:</strong> {item.dosage}</span>
                      <span><strong>Freq:</strong> {item.frequency}</span>
                      <span><strong>Duration:</strong> {item.duration}</span>
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 whitespace-nowrap gap-1 shrink-0"
                    onClick={() => {
                      const newMed = {
                        name: item.name,
                        dosage: item.dosage,
                        frequency: item.frequency,
                        duration: item.duration
                      };
                      // Replace blank initial row or append
                      const currentMeds = prescription.medicines || [];
                      let updatedMeds = [];
                      if (currentMeds.length === 1 && (!currentMeds[0].name || currentMeds[0].name.trim() === '')) {
                        updatedMeds = [newMed];
                      } else {
                        updatedMeds = [...currentMeds, newMed];
                      }
                      setPrescription({ ...prescription, medicines: updatedMeds });
                      toast.success(`Added ${item.name} to prescription`);
                    }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </Button>
                </div>
              ))}
          </div>

          <DialogFooter className="p-3 border-t bg-slate-50">
            <Button variant="outline" size="sm" onClick={() => setIsCommonMedsOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-[800px] h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-medical-blue" />
              {previewData?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 bg-slate-100 relative overflow-hidden">
            {(previewData?.url.startsWith('data:application/pdf') || previewData?.name?.toLowerCase().endsWith('.pdf')) ? (
              <object
                data={previewData.url}
                type="application/pdf"
                className="w-full h-full border-none"
              >
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">PDF Preview Not Available</p>
                    <p className="text-sm text-slate-500 max-w-xs">Your browser might be blocking the inline preview. You can still download the file to view it.</p>
                  </div>
                  <Button className="bg-medical-blue" onClick={() => {
                    const link = document.createElement('a');
                    link.href = previewData.url;
                    link.download = previewData.name;
                    link.click();
                  }}>
                    <Download className="w-4 h-4 mr-2" />
                    Download to View
                  </Button>
                </div>
              </object>
            ) : (
              <div className="w-full h-full flex items-center justify-center p-4">
                <img 
                  src={previewData?.url} 
                  alt="Prescription Preview" 
                  className="max-w-full max-h-full object-contain shadow-lg rounded-lg"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
          </div>
          <DialogFooter className="p-4 border-t bg-white">
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Close Preview</Button>
            <Button className="bg-medical-blue" onClick={() => {
              if (previewData) {
                const link = document.createElement('a');
                link.href = previewData.url;
                link.download = previewData.name;
                link.click();
              }
            }}>
              <Download className="w-4 h-4 mr-2" />
              Download File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* OPD Payment Collection Dialog Modal with Payment Mode Selection */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              OPD Consultation Payment Collection
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Record payment collection for patient consultation & sync invoice ledger.
            </DialogDescription>
          </DialogHeader>

          {paymentAppointment && (
            <div className="space-y-4 py-2 text-left">
              {/* Patient & Doctor Banner */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-extrabold text-slate-900">{paymentAppointment.patientName || paymentAppointment.patient_name || 'Patient'}</span>
                  <span className="text-[11px] font-mono font-bold text-slate-500">MRN: {paymentAppointment.patientMrn || paymentAppointment.mrn || 'N/A'}</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Doctor: <span className="font-bold text-indigo-900">{paymentAppointment.doctor || paymentAppointment.doctorName || 'OPD Doctor'}</span>
                </p>
                <p className="text-[10px] text-slate-500">
                  Appt Date: {paymentAppointment.appointment_date || getLocalDateString()} • {paymentAppointment.appointment_time || '10:00 AM'}
                </p>
              </div>

              {/* Fee & Discount Calculation */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Consultation Fee (₹)</Label>
                  <Input 
                    type="number" 
                    className="h-9 font-bold text-slate-800 bg-slate-50"
                    value={paymentAppointment.fee || appointmentFee || 500}
                    disabled
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Discount Amount (₹)</Label>
                  <Input 
                    type="number" 
                    className="h-9 font-bold text-amber-700"
                    value={paymentDiscount}
                    onChange={(e) => setPaymentDiscount(Number(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Net Payable Banner */}
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center justify-between">
                <span className="text-xs font-black uppercase text-emerald-950 tracking-wider">Total Net Payable:</span>
                <span className="text-xl font-black text-emerald-700">
                  ₹{Math.max(0, (paymentAppointment.fee || appointmentFee || 500) - (paymentDiscount || 0))}
                </span>
              </div>

              {/* Payment Mode Selection */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Select Payment Mode / Method *</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'Cash', label: '💵 Cash' },
                    { id: 'UPI/QR', label: '📱 UPI / QR' },
                    { id: 'Card', label: '💳 Card' },
                    { id: 'Net Banking', label: '🌐 NetBank' },
                    { id: 'Cheque/DD', label: '🏦 Cheque' },
                    { id: 'Insurance/TPA', label: '🛡️ TPA' }
                  ].map(m => (
                    <Button
                      key={m.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      className={`h-9 text-xs font-bold ${
                        paymentMode === m.id 
                          ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700' 
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                      onClick={() => setPaymentMode(m.id)}
                    >
                      {m.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Transaction / Reference ID */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">
                  Transaction / UTR / Reference No. {paymentMode !== 'Cash' ? '(Recommended)' : '(Optional)'}
                </Label>
                <Input 
                  type="text"
                  className="h-9 text-xs font-mono"
                  placeholder={paymentMode === 'UPI/QR' ? 'e.g. UTR 423984029102' : paymentMode === 'Card' ? 'e.g. Auth Code 849201' : 'e.g. Ref / Cheque No.'}
                  value={paymentRefNo}
                  onChange={(e) => setPaymentRefNo(e.target.value)}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1 h-10 text-xs font-bold"
                  onClick={() => setIsPaymentModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 h-10 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-md"
                  onClick={() => handlePayAppointment(paymentAppointment.id, paymentMode, paymentRefNo, paymentDiscount)}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm Collection
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Patient Confirmation Dialog */}
      <Dialog open={!!patientToDelete} onOpenChange={(open) => { if (!open) setPatientToDelete(null); }}>
        <DialogContent className="sm:max-w-[420px] bg-white rounded-2xl p-6 shadow-2xl border border-slate-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 font-extrabold text-base">
              <Trash2 className="w-5 h-5 text-rose-600" />
              Delete Patient Record
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Are you sure you want to permanently delete this patient record? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {patientToDelete && (
            <div className="py-3 space-y-3">
              <div className="p-3 bg-rose-50/70 border border-rose-100 rounded-xl space-y-1 text-xs">
                <p className="font-bold text-slate-900">{patientToDelete.name}</p>
                <p className="text-slate-600">MRN: <span className="font-mono font-bold text-slate-800">{patientToDelete.mrn || 'N/A'}</span></p>
                <p className="text-slate-600">Contact: <span className="font-bold text-slate-800">{patientToDelete.phone || patientToDelete.mobile || 'N/A'}</span></p>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-9 px-4 text-xs font-semibold" 
                  onClick={() => setPatientToDelete(null)}
                >
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  className="h-9 px-4 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white gap-1.5 shadow-sm"
                  onClick={async () => {
                    const id = patientToDelete.id;
                    setPatientToDelete(null);
                    await handleDeletePatient(id);
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Confirm Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Appointment Confirmation Dialog */}
      <Dialog open={!!apptToDelete} onOpenChange={(open) => { if (!open) setApptToDelete(null); }}>
        <DialogContent className="sm:max-w-[420px] bg-white rounded-2xl p-6 shadow-2xl border border-slate-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 font-extrabold text-base">
              <Trash2 className="w-5 h-5 text-rose-600" />
              Cancel / Delete Appointment
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Are you sure you want to remove this scheduled appointment from the system?
            </DialogDescription>
          </DialogHeader>
          {apptToDelete && (
            <div className="py-3 space-y-3">
              <div className="p-3 bg-rose-50/70 border border-rose-100 rounded-xl space-y-1 text-xs">
                <p className="font-bold text-slate-900">Token #{apptToDelete.token_number || apptToDelete.tokenNumber || apptToDelete.id}</p>
                <p className="text-slate-600">Patient: <span className="font-bold text-slate-800">{apptToDelete.patientName || apptToDelete.patient_name || 'N/A'}</span></p>
                <p className="text-slate-600">Doctor: <span className="font-bold text-slate-800">{apptToDelete.doctor || apptToDelete.doctorName || 'N/A'}</span></p>
                <p className="text-slate-600">Date: <span className="font-bold text-slate-800">{apptToDelete.appointment_date || 'N/A'}</span></p>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-9 px-4 text-xs font-semibold" 
                  onClick={() => setApptToDelete(null)}
                >
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  className="h-9 px-4 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white gap-1.5 shadow-sm"
                  onClick={async () => {
                    const id = apptToDelete.id;
                    setApptToDelete(null);
                    await handleDeleteAppointment(id);
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Confirm Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
