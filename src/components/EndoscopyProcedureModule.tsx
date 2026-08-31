import React, { useState, useEffect } from 'react';
import { 
  Microscope, 
  Plus, 
  Printer, 
  CreditCard, 
  FileCheck, 
  Search, 
  User, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ShieldAlert, 
  Receipt, 
  Activity, 
  Stethoscope,
  Filter,
  ArrowRight,
  Eye,
  FileText,
  DollarSign,
  Download,
  Building,
  UserCheck,
  ClipboardList,
  ClipboardCheck,
  Sparkles,
  ShieldCheck,
  Droplets,
  RotateCcw,
  RefreshCw,
  HeartPulse,
  FlaskConical,
  Shield,
  Trash2
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { storage, STORAGE_KEYS } from '../lib/storage';
import { MOCK_ENDO_RATES } from '../mockData';
import { DirectEndoscopyProcedure, Patient } from '../types';
import { toast } from 'sonner';
import { AdmissionSheetModal, printOfficialAdmissionSheet } from '@/components/AdmissionSheetModal';

export interface ScopeDisinfectionLog {
  id: string;
  cycleId: string;
  scopeModel: string;
  scopeSerial: string;
  scopeType: string;
  leakTestResult: 'PASSED (No Leak)' | 'FAILED (Leak Detected)' | 'RE-TESTED & PASSED';
  enzymaticWashTime: string;
  hldSolution: string;
  hldMecTested?: boolean;
  rinseDryStatus: string;
  certifiedNurse: string;
  verifiedByDoctor?: string;
  timestamp: string;
  notes?: string;
}

const INITIAL_SCOPE_DISINFECTION_LOGS: ScopeDisinfectionLog[] = [
  {
    id: 'HLD-LOG-101',
    cycleId: 'HLD-CYC-2026-001',
    scopeModel: 'OLYMPUS-GIF-Q190 (#4012)',
    scopeSerial: '#4012',
    scopeType: 'Upper GI Endoscope',
    leakTestResult: 'PASSED (No Leak)',
    enzymaticWashTime: '10 Mins (Enzymatic Detergent)',
    hldSolution: 'Cidex OPA (15 Mins @ 20°C)',
    hldMecTested: true,
    rinseDryStatus: 'Sterile Water Rinse & Alcohol Purge OK',
    certifiedNurse: 'Staff Nurse Sunita',
    verifiedByDoctor: 'Dr. Rajesh Sharma',
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    notes: 'Channel brush inspection completed. Lumens flushed with 70% alcohol and air purged.'
  },
  {
    id: 'HLD-LOG-102',
    cycleId: 'HLD-CYC-2026-002',
    scopeModel: 'PENTAX-EC-3890Li (#8819)',
    scopeSerial: '#8819',
    scopeType: 'Colonoscope',
    leakTestResult: 'PASSED (No Leak)',
    enzymaticWashTime: '12 Mins (Cidezyme Wash)',
    hldSolution: 'Cidex OPA (20 Mins @ 20°C)',
    hldMecTested: true,
    rinseDryStatus: 'Cabinet Vertical Hanging Storage',
    certifiedNurse: 'Staff Nurse Anjali',
    verifiedByDoctor: 'Dr. Rajesh Sharma',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    notes: 'Post-colonoscopy multi-stage cleaning and HLD cycle verified. MEC test strip passed.'
  }
];

const DEFAULT_PROCEDURE_RATE_CARD = MOCK_ENDO_RATES;

const INITIAL_DIRECT_PROCEDURES: DirectEndoscopyProcedure[] = [
  {
    id: 'ENDO-PROC-101',
    patientId: 'P-9001',
    patientName: 'Rameshwar Prasad',
    patientPhone: '9876543210',
    age: 52,
    gender: 'Male',
    address: 'Sector 4, Main Road, City',
    referredByDoctor: 'Self Referral (Direct Walk-in)',
    procedureType: 'Upper GI Diagnostic Endoscopy (EGD)',
    procedureCategory: 'Endoscopy',
    scheduledDateTime: new Date().toISOString(),
    clinicalIndication: 'Persistent Dyspepsia & Epigastric Burning x 2 Months',
    sedationType: 'Topical Lignocaine Spray + Conscious Sedation',
    bowelPrepInstructions: 'NPO for > 8 hours prior to procedure',
    fastingStatus: 'NPO > 8 Hours',
    
    consentSigned: true,
    consentSignedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    consentSignedBy: 'Rameshwar Prasad (Patient)',
    witnessName: 'Nurse Anjali Gupta',
    physicianName: 'Dr. Rajesh Sharma (Gastroenterologist)',

    billingStatus: 'PAID',
    invoiceId: 'INV-ENDO-5001',
    procedureFee: 3500,
    sedationFee: 1000,
    biopsyKitFee: 500,
    discountAmount: 0,
    totalAmount: 5000,
    amountPaid: 5000,
    paymentMode: 'UPI / QR',
    transactionRef: 'UPI/982310128912',
    
    status: 'In-Suite',
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    recordedBy: 'Reception Desk / Front Office'
  },
  {
    id: 'ENDO-PROC-102',
    patientId: 'P-9002',
    patientName: 'Sunita Devi',
    patientPhone: '9812345678',
    age: 61,
    gender: 'Female',
    address: 'Civil Lines, Block B',
    referredByDoctor: 'Dr. M. K. Roy (City Polyclinic)',
    procedureType: 'Colonoscopy + Polypectomy',
    procedureCategory: 'Polypectomy',
    scheduledDateTime: new Date(Date.now() + 3600000 * 2).toISOString(),
    clinicalIndication: 'Lower GI Bleed & Altered Bowel Habits',
    sedationType: 'IV Conscious Sedation (Propofol)',
    bowelPrepInstructions: 'Peglec Solution 4 Liters taken yesterday evening',
    fastingStatus: 'NPO > 8 Hours',

    consentSigned: true,
    consentSignedAt: new Date(Date.now() - 1800000).toISOString(),
    consentSignedBy: 'Suresh Devi (Son)',
    witnessName: 'Staff Nurse Sunita',
    physicianName: 'Dr. Rajesh Sharma',

    billingStatus: 'PAID',
    invoiceId: 'INV-ENDO-5002',
    procedureFee: 9500,
    sedationFee: 1500,
    biopsyKitFee: 2000,
    discountAmount: 500,
    totalAmount: 12500,
    amountPaid: 12500,
    paymentMode: 'Credit/Debit Card',
    transactionRef: 'TXN-CARD-881290',

    status: 'Scheduled',
    createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    recordedBy: 'Front Desk Cashier'
  }
];

export function EndoscopyProcedureModule() {
  const [activeTab, setActiveTab] = useState<'directory' | 'master-register' | 'reporting' | 'biopsy' | 'disinfection' | 'consents'>('directory');
  const [procedures, setProcedures] = useState<DirectEndoscopyProcedure[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  // Modals
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [selectedProcedureForConsent, setSelectedProcedureForConsent] = useState<DirectEndoscopyProcedure | null>(null);

  // Admission Sheet & LAMA Modal State
  const [isAdmissionSheetOpen, setIsAdmissionSheetOpen] = useState(false);
  const [admissionSheetPatient, setAdmissionSheetPatient] = useState<any>(null);
  const [admissionSheetProcedure, setAdmissionSheetProcedure] = useState<any>(null);

  // New Procedure Form State
  const [patientMode, setPatientMode] = useState<'NEW' | 'EXISTING'>('NEW');
  const [existingPatientId, setExistingPatientId] = useState<string>('');

  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAge, setFormAge] = useState('45');
  const [formGender, setFormGender] = useState('Male');
  const [formAddress, setFormAddress] = useState('');
  const [formReferredBy, setFormReferredBy] = useState('Self Referral (Direct Walk-In)');

  const [formProcedureType, setFormProcedureType] = useState('Upper GI Diagnostic Endoscopy (EGD)');
  const [formIndication, setFormIndication] = useState('Dyspepsia / Acid Reflux / GI Evaluation');
  const [formSedationType, setFormSedationType] = useState('Topical Lignocaine Spray + Conscious Sedation');
  const [formFastingStatus, setFormFastingStatus] = useState<DirectEndoscopyProcedure['fastingStatus']>('NPO > 8 Hours');
  const [formBowelPrep, setFormBowelPrep] = useState('Overnight Fasting NPO > 8 Hours');

  // Pricing & Billing State
  const [baseFee, setBaseFee] = useState<number>(3500);
  const [sedationFee, setSedationFee] = useState<number>(0);
  const [kitFee, setKitFee] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<DirectEndoscopyProcedure['paymentMode']>('UPI / QR');
  const [transactionRef, setTransactionRef] = useState('');

  // Consent Form State inside modal
  const [consentSignerName, setConsentSignerName] = useState('');
  const [witnessName, setWitnessName] = useState('Nurse Staff');
  const [physicianName, setPhysicianName] = useState('Dr. Rajesh Sharma (Consultant Gastroenterologist)');
  const [consentAgreed, setConsentAgreed] = useState(true);
  const [consentLanguage, setConsentLanguage] = useState<'bilingual' | 'english' | 'hindi'>('bilingual');

  // Disinfection Modal & State
  const [isDisinfectionModalOpen, setIsDisinfectionModalOpen] = useState(false);
  const [disinfectionSearchQuery, setDisinfectionSearchQuery] = useState('');
  const [disinfectionLogs, setDisinfectionLogs] = useState<ScopeDisinfectionLog[]>(() => {
    return storage.get('hms_scope_disinfection_logs', INITIAL_SCOPE_DISINFECTION_LOGS);
  });

  // New Disinfection Cycle Form Fields
  const [cycleScopeModel, setCycleScopeModel] = useState('OLYMPUS-GIF-Q190 (#4012)');
  const [cycleScopeSerial, setCycleScopeSerial] = useState('#4012');
  const [cycleScopeType, setCycleScopeType] = useState('Upper GI Endoscope');
  const [cycleLeakTest, setCycleLeakTest] = useState<'PASSED (No Leak)' | 'FAILED (Leak Detected)' | 'RE-TESTED & PASSED'>('PASSED (No Leak)');
  const [cycleEnzymaticWash, setCycleEnzymaticWash] = useState('10 Mins (Enzymatic Detergent)');
  const [cycleHldSolution, setCycleHldSolution] = useState('Cidex OPA (15 Mins @ 20°C)');
  const [cycleMecTested, setCycleMecTested] = useState(true);
  const [cycleRinseDry, setCycleRinseDry] = useState('Sterile Water Rinse & Alcohol Purge OK');
  const [cycleNurse, setCycleNurse] = useState('Staff Nurse Sunita');
  const [cycleDoctor, setCycleDoctor] = useState('Dr. Rajesh Sharma');
  const [cycleNotes, setCycleNotes] = useState('');

  // Load procedures, patients and rate card from local storage
  const [rateCard, setRateCard] = useState<Record<string, { baseFee: number; sedationFee: number; kitFee: number; category: any }>>(() => {
    return storage.get(STORAGE_KEYS.ENDO_PROCEDURE_RATES, DEFAULT_PROCEDURE_RATE_CARD);
  });

  useEffect(() => {
    const loadedPatients = storage.get(STORAGE_KEYS.PATIENTS, []);
    setPatients(loadedPatients);

    const storedProcedures = storage.get(STORAGE_KEYS.ENDOSCOPY_DIRECT_PROCEDURES, null);
    if (storedProcedures && Array.isArray(storedProcedures)) {
      setProcedures(storedProcedures);
    } else {
      setProcedures(INITIAL_DIRECT_PROCEDURES);
      storage.set(STORAGE_KEYS.ENDOSCOPY_DIRECT_PROCEDURES, INITIAL_DIRECT_PROCEDURES);
    }

    const storedDisinfection = storage.get('hms_scope_disinfection_logs', null);
    if (storedDisinfection && Array.isArray(storedDisinfection)) {
      setDisinfectionLogs(storedDisinfection);
    } else {
      setDisinfectionLogs(INITIAL_SCOPE_DISINFECTION_LOGS);
      storage.set('hms_scope_disinfection_logs', INITIAL_SCOPE_DISINFECTION_LOGS);
    }

    const handleStorage = () => {
      const updatedRates = storage.get(STORAGE_KEYS.ENDO_PROCEDURE_RATES, DEFAULT_PROCEDURE_RATE_CARD);
      setRateCard(updatedRates);
      const updatedDisinfection = storage.get('hms_scope_disinfection_logs', INITIAL_SCOPE_DISINFECTION_LOGS);
      setDisinfectionLogs(updatedDisinfection);
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('supabase-data-sync', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('supabase-data-sync', handleStorage);
    };
  }, []);

  // Update fees when procedure selection or rate card changes
  useEffect(() => {
    const card = rateCard[formProcedureType] || DEFAULT_PROCEDURE_RATE_CARD[formProcedureType];
    if (card) {
      setBaseFee(card.baseFee);
      setSedationFee(card.sedationFee);
      setKitFee(card.kitFee);
    }
  }, [formProcedureType, rateCard]);

  // Handle Existing Patient Selection
  const handleSelectExistingPatient = (pId: string) => {
    setExistingPatientId(pId);
    const p = patients.find(item => item.id === pId);
    if (p) {
      setFormName(p.name);
      setFormPhone(p.mobile || p.phone || '');
      setFormAge(String(p.age || 40));
      setFormGender(p.gender || 'Male');
      setFormAddress(p.address || '');
    }
  };

  const netTotalAmount = Math.max(0, (baseFee + sedationFee + kitFee) - discountAmount);

  const saveProceduresToStorage = (updated: DirectEndoscopyProcedure[]) => {
    setProcedures(updated);
    storage.set(STORAGE_KEYS.ENDOSCOPY_DIRECT_PROCEDURES, updated);
  };

  // Submit Direct Procedure Registration & Instant Billing
  const handleRegisterAndBill = () => {
    if (!formName.trim()) {
      toast.error('Patient name is required');
      return;
    }

    const procedureId = `ENDO-PROC-${Date.now().toString().slice(-4)}`;
    const invoiceId = `INV-ENDO-${Math.floor(1000 + Math.random() * 9000)}`;
    const generatedPatientId = patientMode === 'EXISTING' && existingPatientId ? existingPatientId : `P-ENDO-${Math.floor(1000 + Math.random() * 9000)}`;

    const selectedCategory = rateCard[formProcedureType]?.category || DEFAULT_PROCEDURE_RATE_CARD[formProcedureType]?.category || 'Endoscopy';

    const newProc: DirectEndoscopyProcedure = {
      id: procedureId,
      patientId: generatedPatientId,
      patientName: formName,
      patientPhone: formPhone || '9999999999',
      age: parseInt(formAge) || 40,
      gender: formGender,
      address: formAddress,
      referredByDoctor: formReferredBy || 'Self Referral (Direct)',
      procedureType: formProcedureType,
      procedureCategory: selectedCategory,
      scheduledDateTime: new Date().toISOString(),
      clinicalIndication: formIndication,
      sedationType: formSedationType,
      bowelPrepInstructions: formBowelPrep,
      fastingStatus: formFastingStatus,

      consentSigned: consentAgreed,
      consentSignedAt: consentAgreed ? new Date().toISOString() : undefined,
      consentSignedBy: consentSignerName || `${formName} (Patient)`,
      witnessName: witnessName,
      physicianName: physicianName,

      billingStatus: 'PAID',
      invoiceId: invoiceId,
      procedureFee: baseFee,
      sedationFee: sedationFee,
      biopsyKitFee: kitFee,
      discountAmount: discountAmount,
      totalAmount: netTotalAmount,
      amountPaid: netTotalAmount,
      paymentMode: paymentMode,
      transactionRef: transactionRef || `TXN-${Date.now().toString().slice(-6)}`,

      status: 'Scheduled',
      createdAt: new Date().toISOString(),
      recordedBy: 'Front Desk / Procedure Desk'
    };

    // 1. Save Procedure
    const updatedProcedures = [newProc, ...procedures];
    saveProceduresToStorage(updatedProcedures);

    // 2. Seamlessly sync to Billing store (STORAGE_KEYS.BILLING)
    const currentBilling = storage.get(STORAGE_KEYS.BILLING, []);
    const newBillItem = {
      id: invoiceId,
      patientId: generatedPatientId,
      patientName: formName,
      date: new Date().toISOString(),
      items: [
        { description: `Direct ${formProcedureType}`, amount: baseFee },
        { description: `Sedation & Anesthesia Care (${formSedationType})`, amount: sedationFee },
        { description: `Disposable Biopsy Kit & HP Pack`, amount: kitFee }
      ],
      subtotal: baseFee + sedationFee + kitFee,
      discount: discountAmount,
      total: netTotalAmount,
      paidAmount: netTotalAmount,
      paymentMethod: paymentMode,
      status: 'Paid',
      billType: 'Endoscopy / Procedure',
      notes: `Direct procedure booking without OPD consultation. Referred by: ${formReferredBy}`
    };
    storage.set(STORAGE_KEYS.BILLING, [newBillItem, ...currentBilling]);

    // 3. Register or update patient in PATIENTS store if new
    if (patientMode === 'NEW') {
      const currentPatients = storage.get(STORAGE_KEYS.PATIENTS, []);
      const newPatientObj: Patient = {
        id: generatedPatientId,
        mrn: `MRN-${generatedPatientId}`,
        name: formName,
        age: parseInt(formAge) || 40,
        gender: formGender as any,
        phone: formPhone || '9999999999',
        address: formAddress || 'Outpatient / Direct Walk-In',
        status: 'Active',
        referredBy: formReferredBy,
        isReferral: formReferredBy ? true : false,
      };
      storage.set(STORAGE_KEYS.PATIENTS, [newPatientObj, ...currentPatients]);
      setPatients([newPatientObj, ...currentPatients]);
    }

    setIsRegisterModalOpen(false);
    toast.success(`Direct Procedure & Payment collected successfully! Invoice #${invoiceId}`);
  };

  // Update Status
  const handleStatusChange = (procId: string, newStatus: DirectEndoscopyProcedure['status']) => {
    const updated = procedures.map(p => p.id === procId ? { ...p, status: newStatus } : p);
    saveProceduresToStorage(updated);
    toast.success(`Procedure #${procId} status updated to ${newStatus}`);
  };

  // Open Consent Modal
  const openConsentModal = (proc: DirectEndoscopyProcedure) => {
    setSelectedProcedureForConsent(proc);
    setConsentSignerName(proc.consentSignedBy || `${proc.patientName} (Patient)`);
    setWitnessName(proc.witnessName || 'Nurse Staff');
    setPhysicianName(proc.physicianName || 'Dr. Rajesh Sharma');
    setConsentAgreed(proc.consentSigned);
    setIsConsentModalOpen(true);
  };

  // Save Signed Consent
  const handleSaveConsent = () => {
    if (!selectedProcedureForConsent) return;
    const updated = procedures.map(p => p.id === selectedProcedureForConsent.id ? {
      ...p,
      consentSigned: true,
      consentSignedAt: new Date().toISOString(),
      consentSignedBy: consentSignerName,
      witnessName: witnessName,
      physicianName: physicianName
    } : p);

    saveProceduresToStorage(updated);
    setIsConsentModalOpen(false);
    toast.success('Informed Consent Form recorded and signed successfully!');
  };

  // Print Official Payment Invoice / Receipt
  const printDirectReceipt = (proc: DirectEndoscopyProcedure) => {
    const rawHospitalInfo = storage.get(STORAGE_KEYS.HOSPITAL_INFO, null);
    const hospitalName = rawHospitalInfo?.name || 'GASTRO PLUS HOSPITAL';
    const hospitalAddress = rawHospitalInfo?.address || 'Plot No. 7 & 8, Om Shiv Nagar, Gufa Mandir Road, Lal Ghati Bhopal, 462030, Madhya Pradesh';

    const iframeId = 'direct-receipt-iframe';
    let iframe = document.getElementById(iframeId) as HTMLIFrameElement;
    if (iframe) document.body.removeChild(iframe);

    iframe = document.createElement('iframe');
    iframe.id = iframeId;
    iframe.style.position = 'fixed';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) return;

    const htmlContent = `
      <html>
        <head>
          <title>Procedure Invoice - ${proc.invoiceId}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
            body { font-family: 'Inter', sans-serif; margin: 30px; color: #0f172a; font-size: 12px; }
            .header { text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 10px; margin-bottom: 15px; }
            .badge-paid { background: #dcfce7; color: #15803d; border: 1px solid #86efac; padding: 4px 12px; font-weight: 800; border-radius: 20px; font-size: 11px; display: inline-block; }
            .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .info-table td { border: 1px solid #cbd5e1; padding: 6px 10px; }
            .lbl { font-weight: 700; background: #f8fafc; color: #475569; width: 22%; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .items-table th, .items-table td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
            .items-table th { background: #f1f5f9; font-weight: 700; }
            .total-box { text-align: right; margin-top: 15px; font-size: 13px; font-weight: 700; }
            .sig-area { margin-top: 50px; display: flex; justify-content: space-between; }
            .sig-box { text-align: center; border-top: 1px solid #94a3b8; width: 40%; padding-top: 5px; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2 style="margin:0; font-size:20px; color:#0f172a;">${hospitalName}</h2>
            <p style="margin:2px; color:#64748b; font-size:11px;">${hospitalAddress} | Endoscopy & GI Suite</p>
            <p style="margin:5px 0 0 0; font-size:14px; font-weight:800; color:#0284c7;">DIRECT PROCEDURE MONEY RECEIPT & TAX INVOICE</p>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <div><strong>Invoice No:</strong> ${proc.invoiceId || 'INV-001'}</div>
            <div class="badge-paid">PAYMENT STATUS: ${proc.billingStatus}</div>
            <div><strong>Date:</strong> ${new Date(proc.scheduledDateTime).toLocaleString('en-IN')}</div>
          </div>

          <table class="info-table">
            <tr>
              <td class="lbl">Patient Name</td><td><strong>${proc.patientName}</strong></td>
              <td class="lbl">Patient ID</td><td>${proc.patientId}</td>
            </tr>
            <tr>
              <td class="lbl">Age / Gender</td><td>${proc.age} Yrs / ${proc.gender}</td>
              <td class="lbl">Contact Phone</td><td>${proc.patientPhone}</td>
            </tr>
            <tr>
              <td class="lbl">Referred By</td><td>${proc.referredByDoctor}</td>
              <td class="lbl">Procedure Type</td><td><strong>${proc.procedureType}</strong></td>
            </tr>
          </table>

          <table class="items-table">
            <thead>
              <tr>
                <th>Sr.</th>
                <th>Particulars / Description</th>
                <th style="text-align:right;">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td><strong>${proc.procedureType}</strong> (Direct Booking Fee)</td>
                <td style="text-align:right;">₹${proc.procedureFee.toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td>2</td>
                <td>Conscious Sedation & Anesthesia Monitoring (${proc.sedationType})</td>
                <td style="text-align:right;">₹${proc.sedationFee.toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td>3</td>
                <td>Disposable Biopsy Kit, Mouth Guard & Specimen Container Pack</td>
                <td style="text-align:right;">₹${proc.biopsyKitFee.toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>

          <div class="total-box">
            <p style="margin:2px;">Subtotal: ₹${(proc.procedureFee + proc.sedationFee + proc.biopsyKitFee).toLocaleString('en-IN')}</p>
            ${proc.discountAmount > 0 ? `<p style="margin:2px; color:#d97706;">Discount: -₹${proc.discountAmount.toLocaleString('en-IN')}</p>` : ''}
            <p style="margin:4px 0; font-size:16px; color:#0f172a; border-top:1px solid #cbd5e1; padding-top:4px;">
              Net Amount Received: ₹${proc.totalAmount.toLocaleString('en-IN')}
            </p>
            <p style="margin:2px; font-size:11px; font-weight:600; color:#475569;">
              Payment Mode: ${proc.paymentMode} ${proc.transactionRef ? `(Ref: ${proc.transactionRef})` : ''}
            </p>
          </div>

          <div class="sig-area">
            <div class="sig-box">Patient / Relative Signature</div>
            <div class="sig-box">Authorised Cashier / Front Desk Seal</div>
          </div>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `;

    doc.write(htmlContent);
    doc.close();
    setTimeout(() => {
      if (iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => { if (document.getElementById(iframeId)) document.body.removeChild(iframe); }, 3000);
      }
    }, 500);
  };

  // Print Official Informed Consent Form (Supports Bilingual English + Hindi, English only, Hindi only)
  const printConsentForm = (proc: DirectEndoscopyProcedure, langMode?: 'bilingual' | 'english' | 'hindi') => {
    const activeLang = langMode || consentLanguage;
    const rawHospitalInfo = storage.get(STORAGE_KEYS.HOSPITAL_INFO, null);
    const hospitalName = rawHospitalInfo?.name || 'GASTRO PLUS HOSPITAL';
    const hospitalAddress = rawHospitalInfo?.address || 'Plot No. 7 & 8, Om Shiv Nagar, Gufa Mandir Road, Lal Ghati Bhopal, 462030, Madhya Pradesh';

    const iframeId = 'consent-print-iframe';
    let iframe = document.getElementById(iframeId) as HTMLIFrameElement;
    if (iframe) document.body.removeChild(iframe);

    iframe = document.createElement('iframe');
    iframe.id = iframeId;
    iframe.style.position = 'fixed';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) return;

    const isBilingual = activeLang === 'bilingual';
    const isHindiOnly = activeLang === 'hindi';

    const titleText = isHindiOnly
      ? 'एंडोस्कोपी, कोलोनोस्कोपी एवं लघु जीआई प्रक्रियाओं हेतु सूचित सहमति पत्र'
      : isBilingual
        ? 'INFORMED CONSENT FORM FOR ENDOSCOPY, COLONOSCOPY & MINOR GI PROCEDURES<div style="font-size:12px; font-weight:700; color:#0369a1; margin-top:3px;">एंडोस्कोपी, कोलोनोस्कोपी एवं लघु जीआई प्रक्रियाओं हेतु सूचित सहमति पत्र</div>'
        : 'INFORMED CONSENT FORM FOR ENDOSCOPY, COLONOSCOPY & MINOR GI PROCEDURES';

    const htmlContent = `
      <html>
        <head>
          <title>Informed Consent Form - ${proc.patientName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Noto+Sans+Devanagari:wght@400;600;700&display=swap');
            body { font-family: 'Inter', 'Noto Sans Devanagari', sans-serif; margin: 24px 30px; color: #0f172a; font-size: 11px; line-height: 1.5; }
            .header { text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 6px; margin-bottom: 10px; }
            .title { text-align: center; font-size: 13px; font-weight: 800; text-transform: uppercase; color: #0f172a; background: #f0f9ff; padding: 6px 8px; border: 1px solid #bae6fd; margin-bottom: 10px; border-radius: 4px; }
            .patient-grid { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 11px; }
            .patient-grid td { border: 1px solid #cbd5e1; padding: 5px 8px; }
            .lbl { font-weight: 700; background: #f8fafc; color: #334155; width: 24%; }
            .sub-hi { display: block; font-size: 9.5px; color: #64748b; font-weight: 500; }
            .risk-box { border: 1px solid #cbd5e1; background: #f8fafc; padding: 8px 12px; border-radius: 6px; margin-bottom: 10px; font-size: 10.5px; }
            .risk-box ul { margin: 3px 0; padding-left: 18px; }
            .risk-box li { margin-bottom: 4px; }
            .declaration-box { border: 2px solid #0284c7; padding: 9px 12px; background: #ffffff; border-radius: 6px; margin-bottom: 14px; font-size: 10.5px; }
            .hi-block { color: #334155; font-size: 10px; margin-top: 3px; line-height: 1.45; }
            .sig-area { margin-top: 28px; display: flex; justify-content: space-between; }
            .sig-item { width: 30%; text-align: center; border-top: 1px solid #94a3b8; padding-top: 5px; font-size: 10px; }
            @media print {
              body { margin: 15px 20px; font-size: 10.5px; }
              .sig-area { margin-top: 24px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2 style="margin:0; font-size:17px; color:#0f172a;">${hospitalName}</h2>
            <p style="margin:2px; color:#64748b; font-size:10px;">${hospitalAddress} | Department of Gastroenterology & Endoscopy Suite</p>
          </div>

          <div class="title">${titleText}</div>

          <table class="patient-grid">
            <tr>
              <td class="lbl">Patient Name ${isBilingual ? '<span class="sub-hi">मरीज का नाम</span>' : ''}</td>
              <td><strong>${proc.patientName}</strong></td>
              <td class="lbl">Patient ID / MRN ${isBilingual ? '<span class="sub-hi">मरीज आईडी</span>' : ''}</td>
              <td><strong>${proc.patientId}</strong></td>
            </tr>
            <tr>
              <td class="lbl">Age / Gender ${isBilingual ? '<span class="sub-hi">उम्र / लिंग</span>' : ''}</td>
              <td>${proc.age} Yrs / ${proc.gender}</td>
              <td class="lbl">Contact Phone ${isBilingual ? '<span class="sub-hi">संपर्क नंबर</span>' : ''}</td>
              <td>${proc.patientPhone || 'N/A'}</td>
            </tr>
            <tr>
              <td class="lbl">Proposed Procedure ${isBilingual ? '<span class="sub-hi">प्रस्तावित प्रक्रिया</span>' : ''}</td>
              <td><strong style="color:#0284c7;">${proc.procedureType}</strong></td>
              <td class="lbl">Sedation / Anesthesia ${isBilingual ? '<span class="sub-hi">सेडेशन का प्रकार</span>' : ''}</td>
              <td>${proc.sedationType}</td>
            </tr>
            <tr>
              <td class="lbl">Referred By ${isBilingual ? '<span class="sub-hi">परामर्शदाता डॉक्टर</span>' : ''}</td>
              <td>${proc.referredByDoctor}</td>
              <td class="lbl">Indication ${isBilingual ? '<span class="sub-hi">जांच का कारण</span>' : ''}</td>
              <td>${proc.clinicalIndication}</td>
            </tr>
          </table>

          <div class="risk-box">
            <strong style="color:#0f172a; text-transform:uppercase; font-size:11px;">
              I. Nature of the Procedure & Medical Explanation ${isBilingual ? '/ प्रक्रिया की प्रकृति एवं नैदानिक जानकारी' : ''}:
            </strong>
            ${!isHindiOnly ? `
              <p style="margin:3px 0 4px 0;">
                I have been informed that I am undergoing <strong>${proc.procedureType}</strong>. The nature, purpose, clinical benefits, and alternative modalities of diagnosis/treatment have been fully explained to me by the attending physician.
              </p>
            ` : ''}
            ${(isBilingual || isHindiOnly) ? `
              <p class="hi-block" style="margin:2px 0 6px 0; color:#1e293b;">
                मुझे सूचित किया गया है कि मेरी <strong>${proc.procedureType}</strong> जांच/प्रक्रिया की जा रही है। संबंधित चिकित्सक द्वारा मुझे इस प्रक्रिया की प्रकृति, उद्देश्य, संभावित लाभ तथा वैकल्पिक उपचार/जांच विधियों के बारे में विस्तार से व मेरी समझ में आने वाली भाषा में भली-भांति समझा दिया गया है।
              </p>
            ` : ''}

            <strong style="color:#be123c; text-transform:uppercase; font-size:11px; display:block; margin-top:6px;">
              II. Disclosure of Known Risks & Complications ${isBilingual ? '/ संभावित जोखिम एवं जटिलताओं का प्रकटीकरण' : ''}:
            </strong>
            <ul>
              <li>
                <strong>Sedation & Local Anesthesia ${isBilingual ? '(सेडेशन एवं स्थानीय सुन्नता)' : ''}:</strong>
                ${!isHindiOnly ? 'Transient drowsiness, dizziness, sore throat, temporary change in BP/pulse, or rare allergic reaction to anesthetic medications.' : ''}
                ${isBilingual ? '<br/><span class="hi-block">अस्थायी उनींदापन, चक्कर, गले में खराश/दर्द, रक्तचाप या हृदय गति में क्षणिक बदलाव, अथवा दवाओं से संभावित एलर्जी प्रतिक्रिया।</span>' : ''}
                ${isHindiOnly ? 'अस्थायी उनींदापन, चक्कर, गले में खराश/दर्द, रक्तचाप या हृदय गति में क्षणिक बदलाव, अथवा दवाओं से संभावित एलर्जी प्रतिक्रिया।' : ''}
              </li>
              <li>
                <strong>Post-Procedure Discomfort ${isBilingual ? '(प्रक्रिया उपरांत पेट में भारीपन या ऐंठन)' : ''}:</strong>
                ${!isHindiOnly ? 'Mild abdominal bloating, gas cramps, fullness or nausea due to air insufflation during the examination (usually resolves quickly).' : ''}
                ${isBilingual ? '<br/><span class="hi-block">जांच के दौरान डाली गई वायु के कारण पेट में हल्का भारीपन, गैस, मरोड़ या मिचली का अनुभव (जो कुछ समय में स्वतः सामान्य हो जाता है)।</span>' : ''}
                ${isHindiOnly ? 'जांच के दौरान डाली गई वायु के कारण पेट में हल्का भारीपन, गैस, मरोड़ या मिचली का अनुभव (जो कुछ समय में स्वतः सामान्य हो जाता है)।' : ''}
              </li>
              <li>
                <strong>Mucosal Bleeding ${isBilingual ? '(श्लेष्म झिल्ली से हल्का रक्तस्राव)' : ''}:</strong>
                ${!isHindiOnly ? 'Minor oozing or bleeding, particularly following endoscopic tissue biopsy, polyp removal (polypectomy), or variceal ligation/banding (self-limiting in most cases).' : ''}
                ${isBilingual ? '<br/><span class="hi-block">विशेषकर ऊतक बायोप्सी, पॉलिप हटाने या वेरिसील बैंडिंग के बाद हल्का रिसाव या रक्तस्राव (जो अधिकांशतः स्वतः या सामान्य उपचार से ठीक हो जाता है)।</span>' : ''}
                ${isHindiOnly ? 'विशेषकर ऊतक बायोप्सी, पॉलिप हटाने या वेरिसील बैंडिंग के बाद हल्का रिसाव या रक्तस्राव (जो अधिकांशतः स्वतः या सामान्य उपचार से ठीक हो जाता है)।' : ''}
              </li>
              <li>
                <strong>Mucosal Perforation Risk ${isBilingual ? '(छिद्र या दीवार फटने का अत्यंत दुर्लभ जोखिम)' : ''}:</strong>
                ${!isHindiOnly ? 'Extremely rare risk of mucosal wall tear or perforation (< 0.05% for diagnostic, < 0.2% for therapeutic procedures) which may require emergency hospital admission, blood transfusion, or surgical repair.' : ''}
                ${isBilingual ? '<br/><span class="hi-block">आंत या अंग की दीवार में छेद होने का अत्यंत दुर्लभ जोखिम (नैदानिक जांच में &lt; 0.05%, उपचारात्मक में &lt; 0.2%), जिसके लिए आवश्यकता पड़ने पर आपातकालीन अस्पताल भर्ती, रक्त आधान या शल्य चिकित्सा (ऑपरेशन) की आवश्यकता हो सकती है।</span>' : ''}
                ${isHindiOnly ? 'आंत या अंग की दीवार में छेद होने का अत्यंत दुर्लभ जोखिम (नैदानिक जांच में &lt; 0.05%, उपचारात्मक में &lt; 0.2%), जिसके लिए आवश्यकता पड़ने पर आपातकालीन अस्पताल भर्ती, रक्त आधान या शल्य चिकित्सा (ऑपरेशन) की आवश्यकता हो सकती है।' : ''}
              </li>
            </ul>
          </div>

          <div class="declaration-box">
            <strong style="color:#0284c7; text-transform:uppercase; font-size:11px;">
              III. Patient / Legal Guardian Declaration & Informed Authorization ${isBilingual ? '/ मरीज / अभिभावक की घोषणा एवं स्वीकृति' : ''}:
            </strong>
            ${!isHindiOnly ? `
              <p style="margin:4px 0 0 0;">
                I, <strong>${proc.consentSignedBy || proc.patientName}</strong>, hereby confirm that I have read (or have had read to me in my preferred language) the contents of this consent form. I have had the opportunity to ask questions regarding the procedure, benefits, risks, and alternatives, and my questions have been answered to my complete satisfaction. I voluntarily give my informed consent for undergoing <strong>${proc.procedureType}</strong> at <strong>${hospitalName}</strong>.
              </p>
            ` : ''}
            ${(isBilingual || isHindiOnly) ? `
              <p class="hi-block" style="margin:4px 0 0 0; color:#1e293b;">
                मैं, <strong>${proc.consentSignedBy || proc.patientName}</strong>, प्रमाणित करता/करती हूँ कि मैंने इस सहमति पत्र को पढ़ लिया है (या मुझे मेरी भाषा में पढ़कर सुना व समझा दिया गया है)। मुझे इस प्रक्रिया, इसके लाभों, जोखिमों एवं विकल्पों के बारे में प्रश्न पूछने का पूरा अवसर दिया गया और मेरे सभी प्रश्नों का संतोषजनक उत्तर दिया गया है। मैं स्वेच्छा से <strong>${hospitalName}</strong> में <strong>${proc.procedureType}</strong> प्रक्रिया कराने हेतु अपनी पूर्ण सहमति प्रदान करता/करती हूँ।
              </p>
            ` : ''}
          </div>

          <div style="font-size:10px; margin-bottom:10px; color:#475569;">
            <strong>Consent Date & Time / सहमति दिनांक व समय:</strong> ${proc.consentSignedAt ? new Date(proc.consentSignedAt).toLocaleString('en-IN') : new Date().toLocaleString('en-IN')}
          </div>

          <div class="sig-area">
            <div class="sig-item">
              <strong>${proc.consentSignedBy || proc.patientName}</strong><br/>
              Signature of Patient / Guardian<br/>
              <span style="font-size:9px; color:#64748b;">मरीज / अभिभावक के हस्ताक्षर</span>
            </div>
            <div class="sig-item">
              <strong>${proc.witnessName || 'Nurse Staff'}</strong><br/>
              Signature of Witness Staff<br/>
              <span style="font-size:9px; color:#64748b;">गवाह स्टाफ के हस्ताक्षर</span>
            </div>
            <div class="sig-item">
              <strong>${proc.physicianName || 'Dr. Rajesh Sharma'}</strong><br/>
              Attending Endoscopist / Physician<br/>
              <span style="font-size:9px; color:#64748b;">एंडोस्कोपिस्ट / चिकित्सक के हस्ताक्षर</span>
            </div>
          </div>

          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `;

    doc.write(htmlContent);
    doc.close();
    setTimeout(() => {
      if (iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => { if (document.getElementById(iframeId)) document.body.removeChild(iframe); }, 3000);
      }
    }, 500);
  };

  // Print Endoscope Disinfection & Sterilization Log Certificate / Slip
  const printDisinfectionSlip = (log: ScopeDisinfectionLog) => {
    const rawHospitalInfo = storage.get(STORAGE_KEYS.HOSPITAL_INFO, null);
    const hospitalName = rawHospitalInfo?.name || 'GASTRO PLUS HOSPITAL';
    const hospitalAddress = rawHospitalInfo?.address || 'Plot No. 7 & 8, Om Shiv Nagar, Gufa Mandir Road, Lal Ghati Bhopal, 462030, Madhya Pradesh';

    const iframeId = 'disinfection-print-iframe';
    let iframe = document.getElementById(iframeId) as HTMLIFrameElement;
    if (iframe) document.body.removeChild(iframe);

    iframe = document.createElement('iframe');
    iframe.id = iframeId;
    iframe.style.position = 'fixed';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) return;

    const htmlContent = `
      <html>
        <head>
          <title>Disinfection Certificate - ${log.cycleId}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
            body { font-family: 'Inter', sans-serif; margin: 25px; color: #0f172a; font-size: 11.5px; line-height: 1.5; }
            .header { text-align: center; border-bottom: 2px solid #0891b2; padding-bottom: 6px; margin-bottom: 12px; }
            .title { text-align: center; font-size: 12.5px; font-weight: 800; text-transform: uppercase; color: #0e7490; background: #ecfeff; padding: 6px 10px; border: 1px solid #a5f3fc; margin-bottom: 12px; border-radius: 6px; }
            .badge-passed { background: #dcfce7; color: #15803d; border: 1px solid #86efac; padding: 3px 10px; font-weight: 800; border-radius: 12px; font-size: 11px; display: inline-block; }
            .badge-fail { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; padding: 3px 10px; font-weight: 800; border-radius: 12px; font-size: 11px; display: inline-block; }
            .info-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
            .info-table td { border: 1px solid #cbd5e1; padding: 6px 10px; }
            .lbl { font-weight: 700; background: #f8fafc; color: #334155; width: 28%; }
            .compliance-box { border: 1px solid #cbd5e1; background: #f8fafc; padding: 8px 12px; border-radius: 6px; margin-bottom: 14px; font-size: 10.5px; }
            .sig-area { margin-top: 36px; display: flex; justify-content: space-between; }
            .sig-box { text-align: center; border-top: 1px solid #94a3b8; width: 42%; padding-top: 6px; font-size: 10.5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2 style="margin:0; font-size:18px; color:#0f172a;">${hospitalName}</h2>
            <p style="margin:2px; color:#64748b; font-size:10.5px;">${hospitalAddress} | Endoscopy & GI Decontamination Unit</p>
          </div>

          <div class="title">ENDOSCOPE HIGH-LEVEL DISINFECTION (HLD) & STERILIZATION CERTIFICATE</div>

          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <div><strong>Cycle ID:</strong> ${log.cycleId}</div>
            <div><span class="${log.leakTestResult.includes('PASSED') ? 'badge-passed' : 'badge-fail'}">LEAK TEST: ${log.leakTestResult}</span></div>
            <div><strong>Date & Time:</strong> ${new Date(log.timestamp).toLocaleString('en-IN')}</div>
          </div>

          <table class="info-table">
            <tr>
              <td class="lbl">Scope Serial # & Model</td>
              <td><strong style="color:#0891b2; font-size:12px;">${log.scopeModel}</strong> (${log.scopeSerial})</td>
              <td class="lbl">Scope Classification</td>
              <td><strong>${log.scopeType}</strong></td>
            </tr>
            <tr>
              <td class="lbl">Leak Pressure Test</td>
              <td><strong>${log.leakTestResult}</strong></td>
              <td class="lbl">Pre-Clean & Enzymatic Soak</td>
              <td>${log.enzymaticWashTime}</td>
            </tr>
            <tr>
              <td class="lbl">HLD Chemical & Contact Time</td>
              <td><strong>${log.hldSolution}</strong></td>
              <td class="lbl">MEC Strip Test Verification</td>
              <td><strong style="color:#15803d;">${log.hldMecTested ? 'VERIFIED PASSED (Color Test OK)' : 'Standard Test Verified'}</strong></td>
            </tr>
            <tr>
              <td class="lbl">Rinse & Post-Purge Storage</td>
              <td colspan="3">${log.rinseDryStatus}</td>
            </tr>
            ${log.notes ? `
            <tr>
              <td class="lbl">Observations / Notes</td>
              <td colspan="3">${log.notes}</td>
            </tr>
            ` : ''}
          </table>

          <div class="compliance-box">
            <strong>NABH / ASGE / ESGE Guidelines Compliance Verification:</strong><br/>
            This flexible endoscope has undergone complete manual bedside wipe, leak pressure test, multi-enzymatic detergent channel brushing, High-Level Disinfection (HLD) soak cycle, sterile water rinse, 70% alcohol lumen flush, compressed air purge, and is certified safe & ready for diagnostic / therapeutic GI endoscopy procedures.
          </div>

          <div class="sig-area">
            <div class="sig-box">
              <strong>${log.certifiedNurse}</strong><br/>
              Certified Decontamination Nurse / Technician<br/>
              <span style="font-size:9.5px; color:#64748b;">Signature & Date</span>
            </div>
            <div class="sig-box">
              <strong>${log.verifiedByDoctor || 'Dr. Rajesh Sharma'}</strong><br/>
              Consultant Gastroenterologist / Unit Head<br/>
              <span style="font-size:9.5px; color:#64748b;">Verification Stamp</span>
            </div>
          </div>

          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `;

    doc.write(htmlContent);
    doc.close();
    setTimeout(() => {
      if (iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => { if (document.getElementById(iframeId)) document.body.removeChild(iframe); }, 3000);
      }
    }, 500);
  };

  const handleSaveDisinfectionCycle = (andPrint: boolean = false) => {
    if (!cycleScopeModel.trim()) {
      toast.error('Scope Model / Serial # is required');
      return;
    }

    const nextCycleNum = String(disinfectionLogs.length + 1).padStart(3, '0');
    const newLog: ScopeDisinfectionLog = {
      id: `HLD-LOG-${Date.now().toString().slice(-4)}`,
      cycleId: `HLD-CYC-${new Date().getFullYear()}-${nextCycleNum}`,
      scopeModel: cycleScopeModel,
      scopeSerial: cycleScopeSerial || '#4012',
      scopeType: cycleScopeType,
      leakTestResult: cycleLeakTest,
      enzymaticWashTime: cycleEnzymaticWash,
      hldSolution: cycleHldSolution,
      hldMecTested: cycleMecTested,
      rinseDryStatus: cycleRinseDry,
      certifiedNurse: cycleNurse || 'Staff Nurse Sunita',
      verifiedByDoctor: cycleDoctor || 'Dr. Rajesh Sharma',
      timestamp: new Date().toISOString(),
      notes: cycleNotes || 'Manual brushing and channel purge completed satisfactorily.'
    };

    const updated = [newLog, ...disinfectionLogs];
    setDisinfectionLogs(updated);
    storage.set('hms_scope_disinfection_logs', updated);

    toast.success(`Disinfection Cycle ${newLog.cycleId} Recorded Successfully!`);
    setIsDisinfectionModalOpen(false);

    // Reset notes
    setCycleNotes('');

    if (andPrint) {
      setTimeout(() => {
        printDisinfectionSlip(newLog);
      }, 300);
    }
  };

  const handleDeleteDisinfectionCycle = (id: string) => {
    const updated = disinfectionLogs.filter(item => item.id !== id);
    setDisinfectionLogs(updated);
    storage.set('hms_scope_disinfection_logs', updated);
    toast.info('Scope disinfection cycle record removed');
  };

  // Filtered List
  const filteredProcedures = procedures.filter(p => {
    const matchesSearch = 
      p.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.patientPhone.includes(searchQuery) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.procedureType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.invoiceId && p.invoiceId.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategoryFilter === 'ALL' || p.procedureCategory === selectedCategoryFilter;

    return matchesSearch && matchesCategory;
  });

  // Calculate Metrics
  const totalBookings = procedures.length;
  const totalRevenue = procedures.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
  const completedCount = procedures.filter(p => p.status === 'Procedure Completed' || p.status === 'Discharged').length;

  const handleExportEndoscopy = () => {
    try {
      const headers = [
        'Booking ID',
        'Invoice ID',
        'Patient Name',
        'Age',
        'Gender',
        'Phone',
        'Procedure Type',
        'Category',
        'Referred By',
        'Clinical Indication',
        'Scheduled Date',
        'Scheduled Time',
        'Total Amount (₹)',
        'Amount Paid (₹)',
        'Payment Status',
        'Procedure Status'
      ];

      const rows = filteredProcedures.map(p => [
        p.id,
        p.invoiceId || 'N/A',
        p.patientName,
        p.age,
        p.gender,
        p.patientPhone,
        p.procedureType,
        p.procedureCategory,
        p.referredByDoctor,
        p.clinicalIndication,
        p.scheduledDate,
        p.scheduledTime,
        p.totalAmount,
        p.amountPaid,
        p.paymentStatus,
        p.status
      ]);

      const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Endoscopy_Colonoscopy_Log_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Endoscopy & Colonoscopy procedure records exported to CSV!');
    } catch {
      toast.error('Failed to export Endoscopy records');
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner Card */}
      <Card className="border bg-slate-900 text-white shadow-md rounded-2xl overflow-hidden">
        <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 shrink-0">
              <Microscope className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-sky-500/20 text-sky-300 border-sky-400/30 text-[10px] font-bold uppercase">
                  Direct Procedure Suite
                </Badge>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-[10px] text-emerald-400 font-bold uppercase">
                  No OPD Consultation Needed
                </Badge>
              </div>
              <h1 className="text-xl font-black text-white mt-1">Endoscopy & Colonoscopy Direct Procedure Suite</h1>
              <p className="text-xs text-slate-300">
                Direct booking, instant package billing, payment collection, procedure reporting & scope disinfection tracking.
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 text-xs">
                  <FileText className="w-3.5 h-3.5 text-blue-300" />
                  <span className="text-blue-200 font-medium">Forms & Reports:</span>
                  <span className="font-black text-blue-100">7</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/20 backdrop-blur-sm border border-emerald-400/30 text-xs">
                  <ClipboardCheck className="w-3.5 h-3.5 text-emerald-300" />
                  <span className="text-emerald-200 font-medium">Checklists:</span>
                  <span className="font-black text-emerald-100">3</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-500/20 backdrop-blur-sm border border-cyan-400/30 text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                  <span className="text-cyan-200 font-medium">Registers:</span>
                  <span className="font-black text-cyan-100">4</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 text-xs">
                  <ClipboardList className="w-3.5 h-3.5 text-sky-300" />
                  <span className="text-white/80 font-medium">Catalog Total:</span>
                  <span className="font-extrabold text-emerald-300">14 Docs</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setAdmissionSheetPatient(null);
                setAdmissionSheetProcedure(null);
                setIsAdmissionSheetOpen(true);
              }}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold text-xs gap-1.5 rounded-xl h-10 cursor-pointer"
              title="Open Official Day-Care Admission Sheet & LAMA / DOR Form (A4)"
            >
              <FileText className="w-4 h-4 text-sky-300" /> Admission Sheet & LAMA
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportEndoscopy}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold text-xs gap-1.5 rounded-xl h-10 cursor-pointer"
            >
              <Download className="w-4 h-4" /> Export CSV
            </Button>
            <Button 
              size="sm" 
              onClick={() => setIsRegisterModalOpen(true)}
              className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs gap-2 rounded-xl shadow-sm h-10"
            >
              <Plus className="w-4 h-4" /> Direct Registration & Billing
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="border shadow-2xs bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Direct Bookings</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{totalBookings}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Direct walk-in & referred patients</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-2xs bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Revenue Collected</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">₹{totalRevenue.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-emerald-700 font-medium mt-0.5">Instant Direct Receipts</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-2xs bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Completed Procedures</p>
              <p className="text-2xl font-black text-indigo-900 mt-1">{completedCount}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Endoscopy / Colonoscopy Suite</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-2xs bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Informed Consent Verified</p>
              <p className="text-2xl font-black text-purple-900 mt-1">
                {procedures.filter(p => p.consentSigned).length} / {totalBookings}
              </p>
              <p className="text-[10px] text-purple-700 font-medium mt-0.5">Signed Legal Declarations</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs Header */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-2xl flex flex-wrap gap-1 mb-6 border border-slate-200">
          <TabsTrigger value="directory" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs font-bold text-xs gap-2 rounded-xl py-2 px-3">
            <ClipboardList className="w-4 h-4 text-emerald-600" />
            Forms, Reports & Registers Directory
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-extrabold ml-1">14</Badge>
          </TabsTrigger>
          <TabsTrigger value="master-register" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs font-bold text-xs gap-2 rounded-xl py-2 px-3">
            <Microscope className="w-4 h-4 text-sky-600" />
            Endoscopy Suite Master Register
          </TabsTrigger>
          <TabsTrigger value="reporting" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs font-bold text-xs gap-2 rounded-xl py-2 px-3">
            <FileText className="w-4 h-4 text-blue-600" />
            Procedure Reporting & Biopsy Forms
          </TabsTrigger>
          <TabsTrigger value="disinfection" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs font-bold text-xs gap-2 rounded-xl py-2 px-3">
            <Sparkles className="w-4 h-4 text-cyan-600" />
            Scope Disinfection Register
          </TabsTrigger>
          <TabsTrigger value="consents" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs font-bold text-xs gap-2 rounded-xl py-2 px-3">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            Pre & Post Consent Forms
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Central Forms, Reports & Registers Directory */}
        <TabsContent value="directory" className="space-y-8">
          {/* Executive Catalog Banner */}
          <div className="bg-gradient-to-r from-slate-950 via-sky-950 to-indigo-950 text-white p-6 rounded-3xl border border-sky-800/60 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500/30 text-emerald-300 border-emerald-400/30 font-extrabold text-xs">
                  CENTRAL ENDOSCOPY DIRECTORY & REGISTERS
                </Badge>
                <span className="text-xs text-sky-200/80 font-medium">• 14 Mandatory Endoscopy Suite Documents & Catalog</span>
              </div>
              <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
                <Microscope className="w-7 h-7 text-sky-400" />
                Endoscopy & Special Procedures Catalog
              </h2>
              <p className="text-xs text-sky-100 max-w-2xl font-medium leading-relaxed">
                Appended catalog of all 14 mandatory endoscopy suite documents organized software category wise. Click any card button to launch or view the respective form, checklist, or register immediately.
              </p>
            </div>

            {/* Category Wise Count KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
              <div className="p-3 bg-blue-500/20 border border-blue-400/30 rounded-2xl text-center">
                <span className="text-[10px] uppercase font-bold text-blue-300 block">Forms & Reports</span>
                <span className="text-2xl font-black text-white">7</span>
              </div>
              <div className="p-3 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl text-center">
                <span className="text-[10px] uppercase font-bold text-emerald-300 block">Checklists</span>
                <span className="text-2xl font-black text-white">3</span>
              </div>
              <div className="p-3 bg-cyan-500/20 border border-cyan-400/30 rounded-2xl text-center">
                <span className="text-[10px] uppercase font-bold text-cyan-300 block">Registers</span>
                <span className="text-2xl font-black text-white">4</span>
              </div>
              <div className="p-3 bg-amber-500/20 border border-amber-400/30 rounded-2xl text-center">
                <span className="text-[10px] uppercase font-bold text-amber-300 block">Total Catalog</span>
                <span className="text-2xl font-black text-white">14</span>
              </div>
            </div>
          </div>

          {/* Category 1: Forms & Reports (7 Items) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-3">
                <Badge className="bg-blue-600 text-white font-extrabold text-xs px-3 py-1">Category 1</Badge>
                <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Forms & Reports (7 Total)
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-600 bg-blue-50 border border-blue-100 px-3 py-1 rounded-xl">
                7 Active Forms & Reports
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 1. Endoscopy / Colonoscopy Procedure Reporting Sheet */}
              <Card className="border-slate-200 hover:border-blue-400 shadow-xs hover:shadow-md transition-all rounded-2xl bg-white flex flex-col justify-between">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 text-[10px] font-bold">
                      Procedure Reporting
                    </Badge>
                    <FileText className="w-5 h-5 text-sky-600" />
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900 mt-2">1. Endoscopy / Colonoscopy Procedure Reporting Sheet</CardTitle>
                  <CardDescription className="text-xs text-slate-500 font-medium leading-relaxed">
                    Operative reporting sheet for upper GI endoscopy, colonoscopy & ERCP with mucosal findings, retroflexion, Boston Bowel Prep score & photo attachments.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <Button 
                    className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs h-9 gap-2 rounded-xl"
                    onClick={() => setActiveTab('reporting')}
                  >
                    <FileText className="w-4 h-4" />
                    Open Reporting Sheet
                  </Button>
                </CardContent>
              </Card>

              {/* 2. Biopsy Sample Submission Form */}
              <Card className="border-slate-200 hover:border-blue-400 shadow-xs hover:shadow-md transition-all rounded-2xl bg-white flex flex-col justify-between">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-bold">
                      Histopathology Requisition
                    </Badge>
                    <Microscope className="w-5 h-5 text-purple-600" />
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900 mt-2">2. Biopsy Sample Submission Form</CardTitle>
                  <CardDescription className="text-xs text-slate-500 font-medium leading-relaxed">
                    Surgical specimen requisition form for mucosal biopsy samples, polyp excised, container barcodes, 10% Formalin fixative & histology lab dispatch tracking.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <Button 
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-9 gap-2 rounded-xl"
                    onClick={() => setActiveTab('reporting')}
                  >
                    <Microscope className="w-4 h-4" />
                    Open Biopsy Submission Form
                  </Button>
                </CardContent>
              </Card>

              {/* 3. Procedure Pre & Post Consent Forms */}
              <Card className="border-slate-200 hover:border-blue-400 shadow-xs hover:shadow-md transition-all rounded-2xl bg-white flex flex-col justify-between">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-bold">
                      Pre & Post Consent
                    </Badge>
                    <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900 mt-2">3. Procedure Pre & Post Consent Forms</CardTitle>
                  <CardDescription className="text-xs text-slate-500 font-medium leading-relaxed">
                    Pre-procedure minor informed consent, conscious sedation risks, post-endoscopy recovery criteria & discharge instructions with digital signatures.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <Button 
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 gap-2 rounded-xl"
                    onClick={() => setActiveTab('consents')}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Open Pre & Post Consent Forms
                  </Button>
                </CardContent>
              </Card>

              {/* 4. Endoscopy Pre-Procedure Fitness & Airway Assessment Form */}
              <Card className="border-slate-200 hover:border-blue-400 shadow-xs hover:shadow-md transition-all rounded-2xl bg-white flex flex-col justify-between">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-sky-50 text-sky-800 border-sky-200 text-[10px] font-bold">
                      Pre-Procedure Assessment
                    </Badge>
                    <Stethoscope className="w-5 h-5 text-sky-600" />
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900 mt-2">4. Endoscopy Pre-Procedure Fitness Form</CardTitle>
                  <CardDescription className="text-xs text-slate-500 font-medium leading-relaxed">
                    Pre-endoscopy clinical evaluation, ASA physical status classification, Mallampati airway assessment, bleeding risk audit & NPO clearance.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <Button 
                    className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs h-9 gap-2 rounded-xl"
                    onClick={() => setActiveTab('consents')}
                  >
                    <Stethoscope className="w-4 h-4" />
                    Open Pre-Procedure Clearance
                  </Button>
                </CardContent>
              </Card>

              {/* 5. Endoscopy Conscious Sedation & Vitals Monitoring Log */}
              <Card className="border-slate-200 hover:border-blue-400 shadow-xs hover:shadow-md transition-all rounded-2xl bg-white flex flex-col justify-between">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 text-[10px] font-bold">
                      Intra-Procedure Vitals
                    </Badge>
                    <HeartPulse className="w-5 h-5 text-blue-600" />
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900 mt-2">5. Endoscopy Conscious Sedation Log</CardTitle>
                  <CardDescription className="text-xs text-slate-500 font-medium leading-relaxed">
                    Intra-procedure vital signs graph (BP, HR, SpO2, EtCO2), IV Propofol/Midazolam dosage tracking & continuous oxygenation flow log.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 gap-2 rounded-xl"
                    onClick={() => setActiveTab('reporting')}
                  >
                    <HeartPulse className="w-4 h-4" />
                    Open Sedation & Vital Log
                  </Button>
                </CardContent>
              </Card>

              {/* 6. Endoscopy Post-Procedure Recovery & Discharge Form */}
              <Card className="border-slate-200 hover:border-blue-400 shadow-xs hover:shadow-md transition-all rounded-2xl bg-white flex flex-col justify-between">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-rose-50 text-rose-800 border-rose-200 text-[10px] font-bold">
                      Recovery & Discharge
                    </Badge>
                    <Activity className="w-5 h-5 text-rose-600" />
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900 mt-2">6. Endoscopy Recovery & Discharge Form</CardTitle>
                  <CardDescription className="text-xs text-slate-500 font-medium leading-relaxed">
                    PACU post-sedation recovery chart, Modified Aldrete recovery score evaluation, gag reflex return check & discharge care instructions.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <Button 
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-9 gap-2 rounded-xl"
                    onClick={() => setActiveTab('consents')}
                  >
                    <Activity className="w-4 h-4" />
                    Open Recovery & Discharge Form
                  </Button>
                </CardContent>
              </Card>

              {/* 7. Endoscopy Direct Package Billing Invoice & Receipt */}
              <Card className="border-slate-200 hover:border-blue-400 shadow-xs hover:shadow-md transition-all rounded-2xl bg-white flex flex-col justify-between">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                      Billing & Invoice
                    </Badge>
                    <Receipt className="w-5 h-5 text-emerald-600" />
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900 mt-2">7. Direct Package Billing Invoice</CardTitle>
                  <CardDescription className="text-xs text-slate-500 font-medium leading-relaxed">
                    Direct booking package invoice, endoscopy base tariffs, sedation kit fees, discount calculation & GST receipt for direct walk-in patients.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <Button 
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 gap-2 rounded-xl"
                    onClick={() => setIsRegisterModalOpen(true)}
                  >
                    <Receipt className="w-4 h-4" />
                    Open Direct Invoice & Billing
                  </Button>
                </CardContent>
              </Card>

              {/* 8. Day-Care Admission Sheet & LAMA / DOR Form */}
              <Card className="border-slate-200 hover:border-indigo-400 shadow-xs hover:shadow-md transition-all rounded-2xl bg-white flex flex-col justify-between">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-indigo-50 text-indigo-800 border-indigo-200 text-[10px] font-bold">
                      NABH Day-Care Admission
                    </Badge>
                    <FileText className="w-5 h-5 text-indigo-600" />
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900 mt-2">8. Day-Care Admission Sheet & LAMA Form</CardTitle>
                  <CardDescription className="text-xs text-slate-500 font-medium leading-relaxed">
                    Official hospital admission docket, Day-Care OT booking, consultant in-charge record & bilingual LAMA / DOR legal risk waiver with signatures.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <Button 
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 gap-2 rounded-xl"
                    onClick={() => {
                      setAdmissionSheetPatient(null);
                      setAdmissionSheetProcedure(null);
                      setIsAdmissionSheetOpen(true);
                    }}
                  >
                    <FileText className="w-4 h-4" />
                    Open Admission Sheet & LAMA
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Category 2: Checklists (3 Total) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-3">
                <Badge className="bg-emerald-600 text-white font-extrabold text-xs px-3 py-1">Category 2</Badge>
                <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-emerald-600" />
                  Checklists (3 Total)
                </h3>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-xl">
                3 Active Checklists
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. WHO Endoscopy Suite Safety Checklist */}
              <Card className="border-slate-200 hover:border-emerald-400 shadow-xs hover:shadow-md transition-all rounded-2xl bg-white flex flex-col justify-between">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                      MANDATORY WHO
                    </Badge>
                    <ClipboardCheck className="w-5 h-5 text-emerald-600" />
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900 mt-2">1. WHO Endoscopy Suite Safety Checklist</CardTitle>
                  <CardDescription className="text-xs text-slate-500 font-medium leading-relaxed">
                    3-phase WHO endoscopy safety verification: Sign-In before conscious sedation, Time-Out before scope insertion, and Sign-Out before suite departure.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <Button 
                    className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs h-9 gap-2 rounded-xl"
                    onClick={() => setActiveTab('consents')}
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    Launch WHO Safety Checklist
                  </Button>
                </CardContent>
              </Card>

              {/* 2. Endoscope & Accessory Pre-Procedure Functional Checklist */}
              <Card className="border-slate-200 hover:border-emerald-400 shadow-xs hover:shadow-md transition-all rounded-2xl bg-white flex flex-col justify-between">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-bold">
                      Equipment Audit
                    </Badge>
                    <ShieldAlert className="w-5 h-5 text-amber-600" />
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900 mt-2">2. Endoscope Pre-Use Functional Checklist</CardTitle>
                  <CardDescription className="text-xs text-slate-500 font-medium leading-relaxed">
                    Pre-procedure endoscopic equipment audit: water channel leak test, light source intensity, suction valve suction & biopsy forceps integrity.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <Button 
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-9 gap-2 rounded-xl"
                    onClick={() => setActiveTab('disinfection')}
                  >
                    <ShieldAlert className="w-4 h-4" />
                    Open Scope Functional Checklist
                  </Button>
                </CardContent>
              </Card>

              {/* 3. Patient Fasting NPO & Bowel Preparation Audit Checklist */}
              <Card className="border-slate-200 hover:border-emerald-400 shadow-xs hover:shadow-md transition-all rounded-2xl bg-white flex flex-col justify-between">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-sky-50 text-sky-800 border-sky-200 text-[10px] font-bold">
                      Bowel Prep Audit
                    </Badge>
                    <FileCheck className="w-5 h-5 text-sky-600" />
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900 mt-2">3. Fasting & Bowel Prep Audit Checklist</CardTitle>
                  <CardDescription className="text-xs text-slate-500 font-medium leading-relaxed">
                    Pre-procedure patient preparation check: NPO duration (&gt;8 hrs), Boston Bowel Preparation Scale (BBPS) quality &amp; anticoagulant hold audit.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <Button 
                    className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs h-9 gap-2 rounded-xl"
                    onClick={() => setActiveTab('reporting')}
                  >
                    <FileCheck className="w-4 h-4" />
                    Open Bowel Prep Checklist
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Category 3: Registers (4 Total) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-3">
                <Badge className="bg-cyan-700 text-white font-extrabold text-xs px-3 py-1">Category 3</Badge>
                <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-cyan-600" />
                  Registers (4 Total)
                </h3>
              </div>
              <span className="text-xs font-bold text-cyan-800 bg-cyan-50 border border-cyan-100 px-3 py-1 rounded-xl">
                4 Active Audit Registers
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. Endoscopy Suite Master Register */}
              <Card className="border-slate-200 hover:border-cyan-400 shadow-xs hover:shadow-md transition-all rounded-2xl bg-white flex flex-col justify-between">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 text-[10px] font-bold">
                      Master Suite Logbook
                    </Badge>
                    <Microscope className="w-5 h-5 text-blue-600" />
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900 mt-2">1. Endoscopy Suite Master Register</CardTitle>
                  <CardDescription className="text-xs text-slate-500 font-medium leading-relaxed">
                    Central master register tracking all diagnostic & therapeutic endoscopy procedures, attending physician, sedation type, findings, biopsy & billing receipts.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <Button 
                    className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs h-9 gap-2 rounded-xl"
                    onClick={() => setActiveTab('master-register')}
                  >
                    <Microscope className="w-4 h-4" />
                    View Master Suite Register
                  </Button>
                </CardContent>
              </Card>

              {/* 2. Procedure Disinfection & Scope Cleaning Register */}
              <Card className="border-slate-200 hover:border-cyan-400 shadow-xs hover:shadow-md transition-all rounded-2xl bg-white flex flex-col justify-between">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-cyan-50 text-cyan-800 border-cyan-200 text-[10px] font-bold">
                      HLD & Sterilization Audit
                    </Badge>
                    <Sparkles className="w-5 h-5 text-cyan-600" />
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900 mt-2">2. Scope Disinfection & Cleaning Register</CardTitle>
                  <CardDescription className="text-xs text-slate-500 font-medium leading-relaxed">
                    Endoscope High-Level Disinfection (HLD) logbook tracking scope serial #, enzymatic soak, leak testing, Cidex/OPA contact time, rinsing & nurse authorization.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <Button 
                    className="w-full bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs h-9 gap-2 rounded-xl"
                    onClick={() => setActiveTab('disinfection')}
                  >
                    <Sparkles className="w-4 h-4" />
                    View Scope Disinfection Register
                  </Button>
                </CardContent>
              </Card>

              {/* 3. Endoscopy Biopsy & Specimen Dispatch Master Register */}
              <Card className="border-slate-200 hover:border-cyan-400 shadow-xs hover:shadow-md transition-all rounded-2xl bg-white flex flex-col justify-between">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-200 text-[10px] font-bold">
                      Specimen Tracking Register
                    </Badge>
                    <FlaskConical className="w-5 h-5 text-purple-600" />
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900 mt-2">3. Biopsy Specimen Dispatch Master Register</CardTitle>
                  <CardDescription className="text-xs text-slate-500 font-medium leading-relaxed">
                    Master audit register tracking all mucosal biopsies, polyp containers, pathology lab dispatch numbers, recipient signatures & histology result logs.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <Button 
                    className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs h-9 gap-2 rounded-xl"
                    onClick={() => setActiveTab('reporting')}
                  >
                    <FlaskConical className="w-4 h-4" />
                    View Biopsy Dispatch Register
                  </Button>
                </CardContent>
              </Card>

              {/* 4. Endoscopy Infection Control & Scope Maintenance Register */}
              <Card className="border-slate-200 hover:border-cyan-400 shadow-xs hover:shadow-md transition-all rounded-2xl bg-white flex flex-col justify-between">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-indigo-50 text-indigo-800 border-indigo-200 text-[10px] font-bold">
                      Infection Control Audit
                    </Badge>
                    <Shield className="w-5 h-5 text-indigo-600" />
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900 mt-2">4. Scope Maintenance & Culture Register</CardTitle>
                  <CardDescription className="text-xs text-slate-500 font-medium leading-relaxed">
                    Monthly microbiological scope channel rinse cultures, automated endoscope reprocessor (AER) calibration logs & scope repair/preventive maintenance audit.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <Button 
                    className="w-full bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs h-9 gap-2 rounded-xl"
                    onClick={() => setActiveTab('disinfection')}
                  >
                    <Shield className="w-4 h-4" />
                    View Scope Maintenance Register
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: Endoscopy Suite Master Register */}
        <TabsContent value="master-register" className="space-y-4">
          <Card className="border shadow-2xs bg-white rounded-2xl overflow-hidden">
            <CardHeader className="p-4 bg-slate-50/80 border-b flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-sky-600" />
                  Direct Endoscopy & Colonoscopy Patient Register
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Undergoing procedures directly without prior OPD consultation. Direct payment and signed minor procedure consent forms.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input 
                    placeholder="Search name, phone, procedure, invoice..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs rounded-xl bg-white border-slate-200"
                  />
                </div>

                <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
                  <SelectTrigger className="h-9 text-xs rounded-xl w-[150px] bg-white">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Categories</SelectItem>
                    <SelectItem value="Endoscopy">Upper GI Endoscopy</SelectItem>
                    <SelectItem value="Colonoscopy">Colonoscopy</SelectItem>
                    <SelectItem value="Polypectomy">Polypectomy</SelectItem>
                    <SelectItem value="EVL Banding">EVL Banding</SelectItem>
                    <SelectItem value="ERCP">ERCP</SelectItem>
                    <SelectItem value="Sigmoidoscopy">Sigmoidoscopy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50 text-[11px] font-bold text-slate-600">
                    <TableRow>
                      <TableHead>Booking ID / Date</TableHead>
                      <TableHead>Patient Details</TableHead>
                      <TableHead>Procedure Type & Category</TableHead>
                      <TableHead>Referred By</TableHead>
                      <TableHead>Consent Status</TableHead>
                      <TableHead>Billing & Payment</TableHead>
                      <TableHead>Suite Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs divide-y">
                    {filteredProcedures.map((proc) => (
                      <TableRow key={proc.id} className="hover:bg-slate-50/80">
                        <TableCell className="font-mono text-[11px]">
                          <span className="font-bold text-sky-700">{proc.id}</span>
                          <p className="text-[10px] text-slate-400">
                            {new Date(proc.scheduledDateTime).toLocaleString('en-IN', {
                              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        </TableCell>

                        <TableCell>
                          <div className="font-bold text-slate-900">{proc.patientName}</div>
                          <div className="text-[10px] text-slate-500">
                            {proc.age} Yrs / {proc.gender} | Ph: {proc.patientPhone}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="font-bold text-slate-800 text-xs">{proc.procedureType}</div>
                          <Badge variant="outline" className="text-[9px] bg-sky-50 text-sky-700 border-sky-200 mt-0.5">
                            {proc.procedureCategory}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-slate-600 text-[11px]">
                          <Badge variant="outline" className="bg-slate-100 text-slate-700 font-medium text-[10px]">
                            {proc.referredByDoctor}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          {proc.consentSigned ? (
                            <div className="flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Consent Signed</span>
                            </div>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => openConsentModal(proc)}
                              className="h-7 text-[10px] font-bold text-amber-700 border-amber-300 bg-amber-50 gap-1"
                            >
                              <AlertCircle className="w-3 h-3 text-amber-600" /> Sign Consent
                            </Button>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="font-black text-emerald-700 text-sm">
                            ₹{proc.totalAmount.toLocaleString('en-IN')}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[9px]">
                              {proc.billingStatus} ({proc.paymentMode})
                            </Badge>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Select value={proc.status} onValueChange={(val: any) => handleStatusChange(proc.id, val)}>
                            <SelectTrigger className="h-7 text-[10px] font-bold w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Scheduled">Scheduled</SelectItem>
                              <SelectItem value="In-Suite">In-Suite</SelectItem>
                              <SelectItem value="Procedure Completed">Procedure Completed</SelectItem>
                              <SelectItem value="Discharged">Discharged</SelectItem>
                              <SelectItem value="Cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              title="Print Payment Receipt"
                              onClick={() => printDirectReceipt(proc)}
                              className="h-8 text-[11px] font-bold border-slate-200 gap-1 text-slate-700"
                            >
                              <Receipt className="w-3.5 h-3.5 text-emerald-600" /> Receipt
                            </Button>

                            <Button 
                              size="sm" 
                              variant="outline" 
                              title="Open Day-Care Admission Sheet & LAMA Form (A4)"
                              onClick={() => {
                                const matchedPat = patients.find(p => p.id === proc.patientId || (p.mrn && p.mrn === proc.mrn));
                                setAdmissionSheetPatient(matchedPat || {
                                  name: proc.patientName,
                                  phone: proc.patientPhone,
                                  age: proc.patientAge,
                                  gender: proc.patientGender,
                                  address: proc.patientAddress,
                                  mrn: proc.mrn,
                                  referredBy: proc.referredBy
                                });
                                setAdmissionSheetProcedure(proc);
                                setIsAdmissionSheetOpen(true);
                              }}
                              className="h-8 text-[11px] font-bold border-indigo-200 bg-indigo-50/50 text-indigo-700 hover:bg-indigo-100 gap-1"
                            >
                              <FileText className="w-3.5 h-3.5 text-indigo-600" /> Admission Sheet
                            </Button>

                            <Button 
                              size="sm" 
                              variant="outline" 
                              title="View / Print Consent Form"
                              onClick={() => openConsentModal(proc)}
                              className="h-8 text-[11px] font-bold border-slate-200 gap-1 text-slate-700"
                            >
                              <FileText className="w-3.5 h-3.5 text-purple-600" /> Consent
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}

                    {filteredProcedures.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="py-12 text-center text-slate-400">
                          No direct endoscopy/colonoscopy procedures found. Click "Direct Registration & Billing" above.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: Procedure Reporting Sheet & Biopsy Sample Submission */}
        <TabsContent value="reporting" className="space-y-6">
          <Card className="border shadow-xs bg-white rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-sky-600" />
                  1. Endoscopy / Colonoscopy Procedure Reporting Sheet & 2. Biopsy Sample Submission
                </h3>
                <p className="text-xs text-slate-500">Record endoscopic mucosal findings, Boston Bowel Prep score, mucosal biopsy containers & pathology requisitions.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Form 1: Endoscopy Reporting */}
              <div className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-slate-50/50">
                <Badge className="bg-sky-100 text-sky-800 border-sky-200 text-[10px] font-bold">1. Procedure Reporting Sheet</Badge>
                <div className="space-y-2 text-xs">
                  <Label className="font-bold text-slate-700">Select Patient Procedure</Label>
                  <Select defaultValue={procedures[0]?.id}>
                    <SelectTrigger className="h-9 bg-white text-xs">
                      <SelectValue placeholder="Select patient procedure..." />
                    </SelectTrigger>
                    <SelectContent>
                      {procedures.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.patientName} ({p.procedureType})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="space-y-1">
                    <Label className="font-bold text-slate-700">Esophagus / Stomach / Duodenum Findings</Label>
                    <Input placeholder="e.g. Mild antral gastritis, no ulcer or mass lesion seen..." className="h-9 bg-white text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="font-bold text-slate-700">Boston Bowel Prep Score / Mucosal Description</Label>
                    <Input placeholder="e.g. BBPS 9/9 (Excellent prep), clear mucosal visualization" className="h-9 bg-white text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="font-bold text-slate-700">Endoscopic Impression & Diagnosis</Label>
                    <Input placeholder="e.g. Grade I Reflux Esophagitis + Superficial Antral Erosion" className="h-9 bg-white text-xs" />
                  </div>
                  <Button className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs h-9 gap-2 mt-2" onClick={() => toast.success('Endoscopy Procedure Report saved & printed!')}>
                    <Printer className="w-4 h-4" /> Generate & Print Procedure Report
                  </Button>
                </div>
              </div>

              {/* Form 2: Biopsy Sample Submission */}
              <div className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-slate-50/50">
                <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[10px] font-bold">2. Biopsy Sample Submission Form</Badge>
                <div className="space-y-2 text-xs">
                  <div className="space-y-1">
                    <Label className="font-bold text-slate-700">Container Barcode / Specimen ID</Label>
                    <Input placeholder="e.g. SPEC-PATH-9021" className="h-9 bg-white text-xs font-mono font-bold" />
                  </div>
                  <div className="space-y-1">
                    <Label className="font-bold text-slate-700">Biopsy Site / Tissue Specimen Source</Label>
                    <Input placeholder="e.g. Gastric Antrum (for H. Pylori) / Colon Polyp (2cm)" className="h-9 bg-white text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="font-bold text-slate-700">Fixative Solution Agent</Label>
                    <Select defaultValue="Formalin 10%">
                      <SelectTrigger className="h-9 bg-white text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Formalin 10%">10% Buffered Formalin</SelectItem>
                        <SelectItem value="Saline Solution">Normal Saline (Fresh Specimen)</SelectItem>
                        <SelectItem value="Bouin Solution">Bouin's Fixative</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="font-bold text-slate-700">Clinical Indication & Suspected Diagnosis</Label>
                    <Input placeholder="e.g. Rule out H. Pylori / Dysplasia / Ulcerative Colitis" className="h-9 bg-white text-xs" />
                  </div>
                  <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-9 gap-2 mt-2" onClick={() => toast.success('Biopsy Specimen Requisition dispatch slip printed!')}>
                    <Microscope className="w-4 h-4" /> Print Biopsy Sample Submission Slip
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 4: Procedure Disinfection & Scope Cleaning Register */}
        <TabsContent value="disinfection" className="space-y-4">
          <Card className="border shadow-xs bg-white rounded-2xl overflow-hidden p-6 space-y-5">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-cyan-600" />
                  Procedure Disinfection & Scope Cleaning Register Log
                </h3>
                <p className="text-xs text-slate-500">
                  NABH & ESGE compliant High-Level Disinfection (HLD) audit log for flexible endoscopes, colonoscopes, leak tests, and Cidex/OPA soak cycles.
                </p>
              </div>
              <div className="flex items-center gap-2.5 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <Input 
                    placeholder="Search serial, model, nurse..." 
                    value={disinfectionSearchQuery}
                    onChange={(e) => setDisinfectionSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs bg-slate-50"
                  />
                </div>
                <Button 
                  size="sm" 
                  className="bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs gap-2 rounded-xl shadow-xs shrink-0" 
                  onClick={() => setIsDisinfectionModalOpen(true)}
                >
                  <Plus className="w-4 h-4" /> Log Scope Disinfection Cycle
                </Button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-cyan-50/50 p-3 rounded-xl border border-cyan-100/80">
              <div className="flex items-center gap-2.5 bg-white p-2.5 rounded-lg border border-cyan-200/50 shadow-2xs">
                <div className="p-2 bg-cyan-100 rounded-lg text-cyan-800">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Cycles</div>
                  <div className="text-sm font-black text-slate-900">{disinfectionLogs.length} Cycles</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 bg-white p-2.5 rounded-lg border border-cyan-200/50 shadow-2xs">
                <div className="p-2 bg-emerald-100 rounded-lg text-emerald-800">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Leak Test Pass</div>
                  <div className="text-sm font-black text-emerald-700">
                    {Math.round((disinfectionLogs.filter(l => l.leakTestResult.includes('PASSED')).length / (disinfectionLogs.length || 1)) * 100)}% Verified
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 bg-white p-2.5 rounded-lg border border-cyan-200/50 shadow-2xs">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-800">
                  <FlaskConical className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active HLD Agent</div>
                  <div className="text-sm font-black text-slate-900">Cidex OPA (0.55%)</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 bg-white p-2.5 rounded-lg border border-cyan-200/50 shadow-2xs">
                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-800">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Compliance Audit</div>
                  <div className="text-sm font-black text-indigo-700">NABH Verified</div>
                </div>
              </div>
            </div>

            {/* Disinfection Cycles Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50 text-[11px] font-bold text-slate-600">
                  <TableRow>
                    <TableHead>Cycle ID & Date</TableHead>
                    <TableHead>Scope Serial # & Model</TableHead>
                    <TableHead>Scope Type</TableHead>
                    <TableHead>Leak Test Result</TableHead>
                    <TableHead>Enzymatic Pre-Wash</TableHead>
                    <TableHead>HLD Chemical Solution</TableHead>
                    <TableHead>Rinse & Storage Status</TableHead>
                    <TableHead>Certified Staff</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {disinfectionLogs
                    .filter(log => {
                      if (!disinfectionSearchQuery.trim()) return true;
                      const q = disinfectionSearchQuery.toLowerCase();
                      return (
                        log.cycleId.toLowerCase().includes(q) ||
                        log.scopeModel.toLowerCase().includes(q) ||
                        log.scopeSerial.toLowerCase().includes(q) ||
                        log.scopeType.toLowerCase().includes(q) ||
                        log.certifiedNurse.toLowerCase().includes(q) ||
                        (log.verifiedByDoctor && log.verifiedByDoctor.toLowerCase().includes(q))
                      );
                    })
                    .map((log) => (
                      <TableRow key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <TableCell>
                          <div className="font-bold font-mono text-cyan-900">{log.cycleId}</div>
                          <div className="text-[10px] text-slate-500">
                            {new Date(log.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}{' '}
                            {new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-slate-900">{log.scopeModel}</div>
                          <div className="text-[10px] font-mono text-slate-500">{log.scopeSerial}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-sky-50 text-sky-800 border-sky-200 text-[10px] font-bold">
                            {log.scopeType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={log.leakTestResult.includes('PASSED') ? 'bg-emerald-100 text-emerald-800 border-emerald-200 font-bold text-[10px]' : 'bg-rose-100 text-rose-800 border-rose-200 font-bold text-[10px]'}>
                            {log.leakTestResult}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-700 text-[11px] font-medium">
                          {log.enzymaticWashTime}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-cyan-100 text-cyan-900 border-cyan-200 text-[10px] font-bold">
                            {log.hldSolution}
                          </Badge>
                          {log.hldMecTested && (
                            <div className="text-[9px] text-emerald-700 font-bold mt-0.5">MEC Strip OK</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-emerald-800 font-medium text-[11px] block">
                            {log.rinseDryStatus}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-slate-800">{log.certifiedNurse}</div>
                          {log.verifiedByDoctor && (
                            <div className="text-[10px] text-slate-500">Ver: {log.verifiedByDoctor}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-7 px-2 text-[10px] font-bold text-cyan-800 border-cyan-200 hover:bg-cyan-50 gap-1 rounded-lg"
                              onClick={() => printDisinfectionSlip(log)}
                              title="Print Disinfection Certificate"
                            >
                              <Printer className="w-3 h-3 text-cyan-700" /> Slip
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                              onClick={() => handleDeleteDisinfectionCycle(log.id)}
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 5: Procedure Pre & Post Consent Forms */}
        <TabsContent value="consents" className="space-y-4">
          <Card className="border shadow-xs bg-white rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  Procedure Pre & Post Consent Forms Directory
                </h3>
                <p className="text-xs text-slate-500">Informed consent forms, sedation disclosures, post-procedure PACU recovery criteria & patient discharge safety notes.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {procedures.map(proc => (
                <div key={proc.id} className="p-4 border border-slate-200 rounded-2xl space-y-3 bg-slate-50/50 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-sky-700">{proc.id}</span>
                      <Badge className={proc.consentSigned ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'}>
                        {proc.consentSigned ? 'Consent Verified' : 'Pending Signature'}
                      </Badge>
                    </div>
                    <p className="font-extrabold text-sm text-slate-900">{proc.patientName}</p>
                    <p className="text-xs text-slate-600 font-medium">{proc.procedureType}</p>
                    <div className="pt-2 text-[11px] text-slate-600 border-t border-slate-200/80 mt-2 grid grid-cols-2 gap-1 bg-white p-2 rounded-xl border border-slate-100">
                      <div><span className="text-slate-400 font-bold uppercase text-[9px] block">Signed By</span> <span className="font-semibold">{proc.consentSignedBy || proc.patientName}</span></div>
                      <div><span className="text-slate-400 font-bold uppercase text-[9px] block">Witness Staff Name</span> <span className="font-bold text-purple-700">{proc.witnessName || 'Nurse Staff'}</span></div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="w-full text-xs font-bold gap-1" onClick={() => openConsentModal(proc)}>
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> Sign / Edit Consent
                      </Button>
                      <Button size="sm" className="w-full text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white gap-1" onClick={() => printConsentForm(proc)}>
                        <Printer className="w-3.5 h-3.5" /> Print Consent
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs font-bold border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 gap-1 h-7"
                      onClick={() => {
                        const matchedPat = patients.find(p => p.id === proc.patientId || (p.mrn && p.mrn === proc.mrn));
                        setAdmissionSheetPatient(matchedPat || {
                          name: proc.patientName,
                          phone: proc.patientPhone,
                          age: proc.patientAge,
                          gender: proc.patientGender,
                          address: proc.patientAddress,
                          mrn: proc.mrn,
                          referredBy: proc.referredBy
                        });
                        setAdmissionSheetProcedure(proc);
                        setIsAdmissionSheetOpen(true);
                      }}
                    >
                      <FileText className="w-3 h-3 text-indigo-600" /> Admission Sheet & LAMA Form (A4)
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL 1: Direct Procedure Registration & Instant Billing */}
      <Dialog open={isRegisterModalOpen} onOpenChange={setIsRegisterModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Microscope className="w-5 h-5 text-sky-600" />
              Direct Procedure Registration & Instant Billing
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Register patients undergoing Endoscopy/Colonoscopy directly without an OPD doctor consultation step.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Step 1: Patient Selection Mode */}
            <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl space-y-2">
              <Label className="text-xs font-extrabold text-sky-900">Patient Mode:</Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                  <input 
                    type="radio" 
                    name="pmode" 
                    checked={patientMode === 'NEW'} 
                    onChange={() => { setPatientMode('NEW'); setFormName(''); }}
                  />
                  <span>New Walk-In Patient</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                  <input 
                    type="radio" 
                    name="pmode" 
                    checked={patientMode === 'EXISTING'} 
                    onChange={() => setPatientMode('EXISTING')}
                  />
                  <span>Existing Registered Patient</span>
                </label>
              </div>

              {patientMode === 'EXISTING' && (
                <div className="mt-2">
                  <Label className="text-[10px] font-bold uppercase text-slate-600">Select Registered Patient</Label>
                  <Select value={existingPatientId} onValueChange={handleSelectExistingPatient}>
                    <SelectTrigger className="h-9 text-xs bg-white">
                      <SelectValue placeholder="Choose existing patient..." />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map(p => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">
                          {p.name} ({p.mrn || p.id}) - {p.mobile || p.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Demographics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1 sm:col-span-1">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Patient Full Name *</Label>
                <Input 
                  placeholder="e.g. Rajesh Kumar" 
                  value={formName} 
                  onChange={(e) => setFormName(e.target.value)}
                  className="h-9 text-xs" 
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Phone Mobile *</Label>
                <Input 
                  placeholder="10-digit mobile" 
                  value={formPhone} 
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="h-9 text-xs" 
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-slate-500">Age</Label>
                  <Input 
                    value={formAge} 
                    onChange={(e) => setFormAge(e.target.value)}
                    className="h-9 text-xs" 
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-slate-500">Gender</Label>
                  <Select value={formGender} onValueChange={setFormGender}>
                    <SelectTrigger className="h-9 text-xs">
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Referred By (Doctor / Self)</Label>
                <Input 
                  placeholder="e.g., Self Walk-In or Dr. A. K. Sen" 
                  value={formReferredBy} 
                  onChange={(e) => setFormReferredBy(e.target.value)}
                  className="h-9 text-xs" 
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Fasting / Bowel Prep Status</Label>
                <Select value={formFastingStatus} onValueChange={(val: any) => setFormFastingStatus(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NPO > 8 Hours">NPO &gt; 8 Hours (Fasting Verified)</SelectItem>
                    <SelectItem value="NPO > 6 Hours">NPO &gt; 6 Hours</SelectItem>
                    <SelectItem value="Incomplete Fasting">Incomplete Fasting (Alert Doctor)</SelectItem>
                    <SelectItem value="Not Required">Not Required</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Step 2: Procedure & Clinical Details */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <p className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-sky-600" /> Procedure Selection & Package Rates
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-[10px] font-bold uppercase text-slate-500">Select GI Procedure Package</Label>
                  <Select value={formProcedureType} onValueChange={setFormProcedureType}>
                    <SelectTrigger className="h-9 text-xs font-bold text-slate-900 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(rateCard).map((pName) => (
                        <SelectItem key={pName} value={pName} className="text-xs">
                          {pName} — Total Package: ₹{((rateCard[pName]?.baseFee || 0) + (rateCard[pName]?.sedationFee || 0) + (rateCard[pName]?.kitFee || 0)).toLocaleString('en-IN')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-slate-500">Clinical Indication</Label>
                  <Input 
                    placeholder="e.g., Dyspepsia, Dysphagia, Hematemesis" 
                    value={formIndication} 
                    onChange={(e) => setFormIndication(e.target.value)}
                    className="h-9 text-xs" 
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-slate-500">Sedation & Anesthesia Type</Label>
                  <Select value={formSedationType} onValueChange={setFormSedationType}>
                    <SelectTrigger className="h-9 text-xs bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Topical Lignocaine Spray + Conscious Sedation">Topical Lignocaine Spray + Conscious Sedation</SelectItem>
                      <SelectItem value="IV Conscious Sedation (Propofol / Midazolam)">IV Conscious Sedation (Propofol / Midazolam)</SelectItem>
                      <SelectItem value="General Anesthesia">General Anesthesia</SelectItem>
                      <SelectItem value="Local Topical Spray Only">Local Topical Spray Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Step 3: Direct Package Billing Breakdown & Payment */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" /> Direct Payment Collection & Invoice Breakdown
                </p>
                <Badge className="bg-emerald-600 text-white font-black text-[10px]">DIRECT CASHIER RECEIPT</Badge>
              </div>

              <div className="grid grid-cols-4 gap-2 text-xs">
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-[9px] font-bold text-slate-600">Base Procedure Fee</Label>
                    <span className="text-[8px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100">Fixed in Settings &gt; Rates</span>
                  </div>
                  <Input 
                    type="number" 
                    placeholder="0"
                    value={baseFee === 0 ? '' : baseFee} 
                    onChange={(e) => setBaseFee(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                    onFocus={(e) => e.target.select()}
                    className="h-8 text-xs bg-white" 
                  />
                </div>

                <div>
                  <Label className="text-[9px] font-bold text-slate-600">Sedation Fee</Label>
                  <Input 
                    type="number" 
                    placeholder="0"
                    value={sedationFee === 0 ? '' : sedationFee} 
                    onChange={(e) => setSedationFee(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                    onFocus={(e) => e.target.select()}
                    className="h-8 text-xs bg-white" 
                  />
                </div>

                <div>
                  <Label className="text-[9px] font-bold text-slate-600">Biopsy Pack Fee</Label>
                  <Input 
                    type="number" 
                    placeholder="0"
                    value={kitFee === 0 ? '' : kitFee} 
                    onChange={(e) => setKitFee(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                    onFocus={(e) => e.target.select()}
                    className="h-8 text-xs bg-white" 
                  />
                </div>

                <div>
                  <Label className="text-[9px] font-bold text-slate-600">Discount (₹)</Label>
                  <Input 
                    type="number" 
                    placeholder="0"
                    value={discountAmount === 0 ? '' : discountAmount} 
                    onChange={(e) => setDiscountAmount(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                    onFocus={(e) => e.target.select()}
                    className="h-8 text-xs bg-white text-amber-700 font-bold" 
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-emerald-200/80">
                <div>
                  <p className="text-[10px] font-bold uppercase text-emerald-800">Net Payable Amount</p>
                  <p className="text-2xl font-black text-emerald-900">₹{netTotalAmount.toLocaleString('en-IN')}</p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold text-slate-600">Payment Mode</Label>
                    <Select value={paymentMode} onValueChange={(val: any) => setPaymentMode(val)}>
                      <SelectTrigger className="h-8 text-xs bg-white w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="UPI / QR">UPI / QR Code</SelectItem>
                        <SelectItem value="Credit/Debit Card">Credit/Debit Card</SelectItem>
                        <SelectItem value="NetBanking">NetBanking</SelectItem>
                        <SelectItem value="TPA / Insurance Direct">TPA / Insurance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold text-slate-600">Ref / Txn No.</Label>
                    <Input 
                      placeholder="e.g., UPI / Card Ref" 
                      value={transactionRef} 
                      onChange={(e) => setTransactionRef(e.target.value)}
                      className="h-8 text-xs bg-white w-[130px]" 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4: Quick Informed Consent Confirmation */}
            <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-purple-950">
                <input 
                  type="checkbox" 
                  checked={consentAgreed} 
                  onChange={(e) => setConsentAgreed(e.target.checked)}
                  className="rounded text-purple-600"
                />
                <span>Informed Consent for Minor GI Procedure Signed by Patient / Guardian</span>
              </label>

              {consentAgreed && (
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div>
                    <Label className="text-[9px] font-bold text-purple-900 block mb-0.5">Patient / Guardian Signer</Label>
                    <Input 
                      placeholder="Signer Name (e.g. Rameshwar Prasad)" 
                      value={consentSignerName} 
                      onChange={(e) => setConsentSignerName(e.target.value)}
                      className="h-8 text-xs bg-white border-purple-200" 
                    />
                  </div>
                  <div>
                    <Label className="text-[9px] font-bold text-purple-900 block mb-0.5">Witness Staff Name</Label>
                    <Input 
                      placeholder="Witness Staff Nurse Name" 
                      value={witnessName} 
                      onChange={(e) => setWitnessName(e.target.value)}
                      className="h-8 text-xs bg-white border-purple-200" 
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl text-xs" onClick={() => setIsRegisterModalOpen(false)}>Cancel</Button>
            <Button className="bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs gap-1.5" onClick={handleRegisterAndBill}>
              <Receipt className="w-4 h-4" /> Collect Payment & Register Procedure
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: View / Sign Minor Procedure Informed Consent */}
      <Dialog open={isConsentModalOpen} onOpenChange={setIsConsentModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <DialogTitle className="text-lg font-black text-purple-950 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-purple-600" />
                Informed Consent Form / सूचित सहमति पत्र
              </DialogTitle>
              {/* Language Switcher */}
              <div className="flex items-center bg-purple-100/70 p-1 rounded-xl border border-purple-200 gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setConsentLanguage('bilingual')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all text-[11px] ${
                    consentLanguage === 'bilingual'
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'text-purple-900 hover:bg-purple-200/60'
                  }`}
                >
                  Bilingual (द्विभाषी)
                </button>
                <button
                  type="button"
                  onClick={() => setConsentLanguage('english')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all text-[11px] ${
                    consentLanguage === 'english'
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'text-purple-900 hover:bg-purple-200/60'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setConsentLanguage('hindi')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all text-[11px] ${
                    consentLanguage === 'hindi'
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'text-purple-900 hover:bg-purple-200/60'
                  }`}
                >
                  हिन्दी
                </button>
              </div>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Endoscopy, Colonoscopy, Polypectomy & GI Procedure Consent with Dual Language (English & Hindi) Support
            </DialogDescription>
          </DialogHeader>

          {selectedProcedureForConsent && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-xs">
                <div><strong>Patient Name / मरीज:</strong> {selectedProcedureForConsent.patientName}</div>
                <div><strong>Procedure / प्रक्रिया:</strong> {selectedProcedureForConsent.procedureType}</div>
                <div><strong>Age/Gender / उम्र:</strong> {selectedProcedureForConsent.age} Yrs / {selectedProcedureForConsent.gender}</div>
                <div><strong>Referred By / डॉक्टर:</strong> {selectedProcedureForConsent.referredByDoctor}</div>
              </div>

              {/* Procedural Disclosure & Risk Declaration */}
              <div className="p-3.5 border border-purple-200 bg-purple-50/50 rounded-xl space-y-2.5 text-slate-800">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-purple-900 uppercase tracking-wide text-[11px]">
                    Procedural Disclosure & Risk Declaration / जोखिम एवं प्रक्रिया विवरण
                  </p>
                  <span className="text-[10px] bg-purple-200/70 text-purple-900 font-bold px-2 py-0.5 rounded-md">
                    {consentLanguage === 'bilingual' ? 'English + Hindi' : consentLanguage === 'hindi' ? 'हिन्दी' : 'English'}
                  </span>
                </div>

                <div className="space-y-2 text-[11px] text-slate-700">
                  {(consentLanguage === 'bilingual' || consentLanguage === 'english') && (
                    <div className="space-y-1 bg-white/70 p-2.5 rounded-lg border border-purple-100">
                      <p className="font-semibold text-slate-900 text-xs">English Summary:</p>
                      <ul className="list-disc pl-4 space-y-0.5 text-slate-700">
                        <li>Sedation, local throat spray, or anesthesia drug reactions (drowsiness, throat discomfort).</li>
                        <li>Transient post-procedure gas distension or abdominal cramping.</li>
                        <li>Minor mucosal oozing or bleeding at biopsy/polypectomy site (usually self-limiting).</li>
                        <li>Extremely rare mucosal perforation risk (&lt; 0.05% diagnostic, &lt; 0.2% therapeutic).</li>
                      </ul>
                    </div>
                  )}

                  {(consentLanguage === 'bilingual' || consentLanguage === 'hindi') && (
                    <div className="space-y-1 bg-white/70 p-2.5 rounded-lg border border-purple-100">
                      <p className="font-semibold text-purple-950 text-xs">हिन्दी विवरण (Hindi Declaration):</p>
                      <ul className="list-disc pl-4 space-y-0.5 text-slate-800">
                        <li>सेडेशन, स्थानीय गले का स्प्रे अथवा दवाइयों से क्षणिक उनींदापन या गले में खराश की संभावना।</li>
                        <li>जांच के दौरान पेट में गैस, हल्का भारीपन या मरोड़ का अनुभव (जो स्वतः ठीक हो जाता है)।</li>
                        <li>बायोप्सी या पॉलिप हटाने के उपरांत हल्का रक्त रिसाव (अधिकांशतः स्वतः नियंत्रित)।</li>
                        <li>दीवार में छेद होने का अत्यंत दुर्लभ जोखिम (&lt; 0.05% डायग्नोस्टिक, &lt; 0.2% थेरेप्यूटिक)।</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Informed Declaration Box */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5 text-[11px]">
                <p className="font-bold text-amber-950 uppercase text-[10px]">Patient Declaration / मरीज की स्वीकृति:</p>
                <div className="text-amber-900 leading-relaxed">
                  {consentLanguage === 'hindi' ? (
                    `मैं प्रमाणित करता/करती हूँ कि मुझे ${selectedProcedureForConsent.procedureType} प्रक्रिया के लाभों एवं संभावित जोखिमों के बारे में मेरी भाषा में भली-भांति समझा दिया गया है। मैं स्वेच्छा से इस प्रक्रिया हेतु अपनी सहमति देता/देती हूँ।`
                  ) : consentLanguage === 'bilingual' ? (
                    <div className="space-y-1">
                      <p>I confirm that I have been informed about {selectedProcedureForConsent.procedureType}, its risks, and alternatives in my preferred language. I voluntarily give my informed consent.</p>
                      <p className="text-amber-950 font-medium pt-1 border-t border-amber-200/60">मैं प्रमाणित करता/करती हूँ कि मुझे {selectedProcedureForConsent.procedureType} प्रक्रिया के लाभों एवं संभावित जोखिमों के बारे में मेरी भाषा में भली-भांति समझा दिया गया है। मैं स्वेच्छा से इस प्रक्रिया हेतु अपनी सहमति देता/देती हूँ।</p>
                    </div>
                  ) : (
                    `I confirm that I have been informed about ${selectedProcedureForConsent.procedureType}, its risks, and alternatives in my preferred language. I voluntarily give my informed consent.`
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-slate-500">Patient / Legal Guardian Signer Name *</Label>
                  <Input 
                    placeholder="Signer Full Name"
                    value={consentSignerName} 
                    onChange={(e) => setConsentSignerName(e.target.value)}
                    className="h-9 text-xs" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-slate-500">Witness Staff Name</Label>
                    <Input 
                      value={witnessName} 
                      onChange={(e) => setWitnessName(e.target.value)}
                      className="h-9 text-xs" 
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-slate-500">Attending Physician / Endoscopist</Label>
                    <Input 
                      value={physicianName} 
                      onChange={(e) => setPhysicianName(e.target.value)}
                      className="h-9 text-xs" 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            <div className="flex items-center gap-1.5">
              {selectedProcedureForConsent && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="rounded-xl text-xs gap-1.5 border-purple-200 text-purple-900 hover:bg-purple-50 font-bold" 
                    onClick={() => printConsentForm(selectedProcedureForConsent, 'bilingual')}
                    title="Print Bilingual Consent (English & Hindi)"
                  >
                    <Printer className="w-3.5 h-3.5 text-purple-600" /> Print Bilingual (Eng+Hindi)
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="rounded-xl text-xs gap-1 text-slate-600 hover:text-slate-900" 
                    onClick={() => printConsentForm(selectedProcedureForConsent, consentLanguage)}
                  >
                    <Printer className="w-3 h-3" /> Print ({consentLanguage})
                  </Button>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="rounded-xl text-xs" onClick={() => setIsConsentModalOpen(false)}>
                Cancel
              </Button>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs" onClick={handleSaveConsent}>
                Confirm & Save Signed Consent
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Log Scope Disinfection Cycle */}
      <Dialog open={isDisinfectionModalOpen} onOpenChange={setIsDisinfectionModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-cyan-800 font-bold">
              <Sparkles className="w-5 h-5 text-cyan-600" />
              Log Endoscope High-Level Disinfection (HLD) Cycle
            </DialogTitle>
            <DialogDescription>
              Record decontamination steps, leak pressure test verification, and automated/manual chemical soak logs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-cyan-50/70 p-3 rounded-xl border border-cyan-200/70 space-y-1 text-xs text-cyan-950">
              <div className="font-bold flex items-center gap-1.5 text-cyan-900">
                <ShieldCheck className="w-4 h-4 text-cyan-700" /> NABH Infection Prevention Protocol
              </div>
              <p className="text-[11px] text-cyan-800">
                Ensure channel flushing with enzymatic detergent, minimum immersion time in verified HLD solution, and dry lumen storage.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Scope Model / Identity *</Label>
                <Input 
                  placeholder="e.g. OLYMPUS-GIF-Q190 (#4012)"
                  value={cycleScopeModel}
                  onChange={(e) => setCycleScopeModel(e.target.value)}
                  className="h-9 text-xs"
                />
                <div className="flex gap-1.5 flex-wrap pt-1">
                  <button 
                    type="button" 
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono"
                    onClick={() => {
                      setCycleScopeModel('OLYMPUS-GIF-Q190 (#4012)');
                      setCycleScopeSerial('#4012');
                      setCycleScopeType('Upper GI Endoscope');
                    }}
                  >
                    + Olympus Gastro #4012
                  </button>
                  <button 
                    type="button" 
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono"
                    onClick={() => {
                      setCycleScopeModel('PENTAX-EC-3890Li (#8819)');
                      setCycleScopeSerial('#8819');
                      setCycleScopeType('Colonoscope');
                    }}
                  >
                    + Pentax Colono #8819
                  </button>
                  <button 
                    type="button" 
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono"
                    onClick={() => {
                      setCycleScopeModel('OLYMPUS-TJF-Q180V (#3302)');
                      setCycleScopeSerial('#3302');
                      setCycleScopeType('Duodenoscope / ERCP');
                    }}
                  >
                    + Olympus ERCP #3302
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Scope Serial Number</Label>
                <Input 
                  placeholder="#4012"
                  value={cycleScopeSerial}
                  onChange={(e) => setCycleScopeSerial(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Scope Classification</Label>
                <Select value={cycleScopeType} onValueChange={setCycleScopeType}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Upper GI Endoscope">Upper GI Endoscope (Gastroscope)</SelectItem>
                    <SelectItem value="Colonoscope">Colonoscope (Lower GI)</SelectItem>
                    <SelectItem value="Duodenoscope / ERCP">Duodenoscope / Side-Viewing ERCP Scope</SelectItem>
                    <SelectItem value="Sigmoidoscope">Flexible Sigmoidoscope</SelectItem>
                    <SelectItem value="Endoscopic Ultrasound (EUS)">EUS Echoendoscope</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Leak Pressure Test Verification *</Label>
                <Select value={cycleLeakTest} onValueChange={(val: any) => setCycleLeakTest(val)}>
                  <SelectTrigger className="h-9 text-xs font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PASSED (No Leak)">PASSED (No Pressure Drop / No Leak)</SelectItem>
                    <SelectItem value="RE-TESTED & PASSED">RE-TESTED & PASSED</SelectItem>
                    <SelectItem value="FAILED (Leak Detected)">FAILED (Leak Detected - Quarantine Scope)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Enzymatic Pre-Wash & Channel Brush</Label>
                <Select value={cycleEnzymaticWash} onValueChange={setCycleEnzymaticWash}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10 Mins (Enzymatic Detergent)">10 Mins (Enzymatic Detergent Soak & Brush)</SelectItem>
                    <SelectItem value="12 Mins (Cidezyme Wash)">12 Mins (Cidezyme Multi-Enzymatic Wash)</SelectItem>
                    <SelectItem value="15 Mins (Intensive Channel Flush)">15 Mins (Intensive Channel Flush)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">HLD Chemical Solution & Contact Time</Label>
                <Select value={cycleHldSolution} onValueChange={setCycleHldSolution}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cidex OPA (15 Mins @ 20°C)">Cidex OPA (0.55% Ortho-phthalaldehyde - 15 Mins)</SelectItem>
                    <SelectItem value="Cidex OPA (20 Mins @ 20°C)">Cidex OPA (20 Mins High-Contact Soak)</SelectItem>
                    <SelectItem value="2% Glutaraldehyde (20 Mins)">2% Activated Glutaraldehyde (20 Mins @ 25°C)</SelectItem>
                    <SelectItem value="Peracetic Acid Steris (Automated)">Peracetic Acid System (Automated AER Cycle)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Rinse, Alcohol Flush & Storage Status</Label>
                <Select value={cycleRinseDry} onValueChange={setCycleRinseDry}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sterile Water Rinse & Alcohol Purge OK">Sterile Water Rinse & Alcohol Purge OK</SelectItem>
                    <SelectItem value="Cabinet Vertical Hanging Storage">Cabinet Vertical Hanging Storage (HEPA Filtered)</SelectItem>
                    <SelectItem value="Immediate Transfer to Procedure Room">Immediate Transfer to Procedure Suite (Covered Tray)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Certified Decontamination Staff Nurse *</Label>
                <Input 
                  placeholder="Staff Nurse Name"
                  value={cycleNurse}
                  onChange={(e) => setCycleNurse(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Verifying Endoscopist / Doctor</Label>
                <Input 
                  placeholder="Dr. Rajesh Sharma"
                  value={cycleDoctor}
                  onChange={(e) => setCycleDoctor(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <div className="flex items-center space-x-2 bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200">
                  <input 
                    type="checkbox"
                    id="mecTestCheck"
                    checked={cycleMecTested}
                    onChange={(e) => setCycleMecTested(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="mecTestCheck" className="text-xs font-semibold text-emerald-950 cursor-pointer">
                    Minimum Effective Concentration (MEC) chemical strip tested & verified active prior to soak
                  </label>
                </div>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-bold text-slate-700">Decontamination Notes / Channel Inspection</Label>
                <Input 
                  placeholder="e.g. Channel brush inspection completed. Lumens flushed with 70% alcohol and air purged."
                  value={cycleNotes}
                  onChange={(e) => setCycleNotes(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" className="rounded-xl text-xs" onClick={() => setIsDisinfectionModalOpen(false)}>
              Cancel
            </Button>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline"
                className="bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border-cyan-300 font-bold rounded-xl text-xs gap-1.5"
                onClick={() => handleSaveDisinfectionCycle(true)}
              >
                <Printer className="w-3.5 h-3.5 text-cyan-700" /> Save & Print Certificate Slip
              </Button>
              <Button 
                className="bg-cyan-700 hover:bg-cyan-800 text-white font-bold rounded-xl text-xs" 
                onClick={() => handleSaveDisinfectionCycle(false)}
              >
                Save Disinfection Record
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Official Day-Care Admission Sheet & LAMA / DOR Consent Modal */}
      <AdmissionSheetModal 
        isOpen={isAdmissionSheetOpen}
        onClose={() => {
          setIsAdmissionSheetOpen(false);
          setAdmissionSheetPatient(null);
          setAdmissionSheetProcedure(null);
        }}
        patient={admissionSheetPatient}
        appointment={admissionSheetProcedure}
      />
    </div>
  );
}
