import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bed as BedIcon, 
  UserPlus, 
  Plus,
  Search, 
  Filter, 
  MoreVertical, 
  Activity,
  History,
  FileText,
  LogOut,
  Download,
  Edit,
  Trash2,
  Stethoscope,
  ClipboardList,
  Pill,
  FlaskConical,
  CheckCircle2,
  Printer,
  ArrowLeftRight,
  ArrowRight,
  Receipt,
  User,
  AlertCircle,
  AlertTriangle,
  FileSpreadsheet,
  Loader2,
  Building,
  Layers,
  Home,
  HeartPulse,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Clock,
  Calendar,
  CheckSquare,
  Square,
  Archive,
  ShieldAlert,
  X
} from 'lucide-react';
import VisitingConsultants from './VisitingConsultants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { MOCK_BED_RATES, MOCK_USERS, MOCK_PATIENTS } from '@/mockData';
import { formatCurrency, formatDate } from '@/lib/utils';
import { storage, STORAGE_KEYS } from '@/lib/storage';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabaseService, saveAuditLog } from '@/services/supabaseService';
import { useDataSync } from '@/hooks/useDataSync';
import { canUserModifyRecord, normalizeRole, canDoctorWriteClinicalNotes, canDoctorWritePrescription, isDoctorAssignedToPatient } from '@/utils/rbac';
import { SpecialClinicalCharts } from './SpecialClinicalCharts';
import { InitialEvaluationSheetComponent } from './InitialEvaluationSheetComponent';
import AnaestheticOperationRecord from './AnaestheticOperationRecord';
import { printDailyVitalsAndAdvice } from '@/lib/dailyVitalsPrint';
import { AdmissionSheetModal, printOfficialAdmissionSheet } from '@/components/AdmissionSheetModal';
import { PoorPrognosisConsentModal, printPoorPrognosisConsent } from '@/components/PoorPrognosisConsentModal';
import { GeneralConsentModal } from '@/components/GeneralConsentModal';
import { GeneralConsent } from '@/types';

interface AdmissionFormDataPayload {
  patient_id: string;
  bed_id: string;
  doctor_id?: string | null;
  ward?: string;
  urgency?: string;
  status?: string;
}

function validateAdmissionFields(
  payload: AdmissionFormDataPayload,
  bedsList: any[],
  patientsList: any[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check patient_id
  if (!payload.patient_id || payload.patient_id === '') {
    errors.push("Patient selection is required. Please select a valid patient.");
  } else {
    const patientExists = patientsList.some(p => p.id === payload.patient_id);
    if (!patientExists) {
      errors.push("Selected patient is invalid or does not exist in our database records.");
    }
  }

  // Check bed_id
  if (!payload.bed_id || payload.bed_id === '') {
    errors.push("Bed selection is required. Please allocate a bed.");
  } else {
    const bed = bedsList.find(b => b.id === payload.bed_id);
    if (!bed) {
      errors.push("Selected bed is invalid or does not exist in our database records.");
    } else {
      const bNum = bed.bed_number || bed.number || bed.id;
      if (!bNum) {
        errors.push("The selected bed record is missing a valid bed number.");
      }
    }
  }

  // Check ward
  if (!payload.ward || payload.ward.trim() === '') {
    errors.push("Ward / Department selection is required.");
  }

  // Check urgency
  const validUrgencies = ['Routine', 'Urgent', 'Emergency'];
  if (!payload.urgency || !validUrgencies.includes(payload.urgency)) {
    errors.push(`Urgency level must be one of: ${validUrgencies.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

const formatPrescriptionToText = (pres: any) => {
  if (!pres) return '';
  const medsArray = pres.medicines || pres.medications || [];
  if (Array.isArray(medsArray)) {
    return medsArray.map((m: any, idx: number) => {
      const name = m.name || m.drug_name || m.drugName || '';
      const dosage = m.dosage || m.strength || '';
      const freq = m.frequency || m.interval || '';
      const dur = m.duration || '';
      let line = `${idx + 1}. ${name}`;
      if (dosage) line += ` ${dosage}`;
      if (freq) line += ` (${freq})`;
      if (dur) line += ` - ${dur}`;
      return line;
    }).join('\n');
  } else if (typeof medsArray === 'string') {
    return medsArray;
  }
  return '';
};

const formatVitalsToText = (vitalsList: any[]) => {
  if (!vitalsList || vitalsList.length === 0) return '';
  const latestV = vitalsList[0];
  const bp = latestV.bp || latestV.blood_pressure || '';
  const pulse = latestV.pulse || latestV.heart_rate || '';
  const temp = latestV.temp || latestV.temperature || '';
  const spo2 = latestV.spo2 || '';
  const date = latestV.created_at || latestV.date || '';

  let str = '';
  if (bp) str += `BP: ${bp} mmHg, `;
  if (pulse) str += `PR: ${pulse} bpm, `;
  if (temp) str += `Temp: ${temp}, `;
  if (spo2) str += `SpO2: ${spo2}%`;
  return str ? `Latest Vitals (${date ? new Date(date).toLocaleDateString('en-IN') : 'recent'}): ${str}` : '';
};

const formatNotesToText = (notesList: any[]) => {
  if (!notesList || notesList.length === 0) return '';
  return notesList.slice(0, 2).map((n: any) => {
    const type = n.note_type || n.noteType || 'Doctor Note';
    const content = n.content || n.note || '';
    const date = n.created_at || n.date || '';
    return `[${type} - ${date ? new Date(date).toLocaleDateString('en-IN') : ''}]: ${content}`;
  }).join('\n');
};

const generateAutoSummary = (pat: any, admissionReason: string, vitalsText: string, notesText: string) => {
  let draft = `PATIENT DISCHARGE SUMMARY\n`;
  draft += `=========================\n`;
  draft += `Reason for Admission: ${admissionReason || 'Clinical treatment'}\n`;
  if (vitalsText) {
    draft += `\nClinical Parameters at Discharge:\n- ${vitalsText}\n`;
  }
  if (notesText) {
    draft += `\nPatient Clinical Course & Professional Care Notes:\n${notesText}\n`;
  } else {
    draft += `\nClinical Course: Patient was observed daily, treated according to clinical protocol, and showed significant symptomatic improvement.\n`;
  }
  draft += `\nCondition at Discharge: Hemodynamically stable, active, oriented to time & person, fit to discharge home.\n`;
  draft += `\nFollow-up Advice: Report to OPD/Emergency immediately in case of high-grade fever, severe chest tightness, persistent abdominal discomfort, or breathlessness.`;
  return draft;
};

const MOCK_DISCHARGE_SUMMARIES: any[] = [
  {
    id: 'disc-lama-101',
    patientId: 'P002',
    patient_id: 'P002',
    patientName: 'Rajesh Sharma',
    mrn: 'MRN-IPD-882',
    dischargeDate: new Date(Date.now() - 86400000 * 2).toISOString(),
    admissionDate: new Date(Date.now() - 86400000 * 5).toISOString(),
    dischargeType: 'LAMA (Left Against Medical Advice)',
    dischargeBy: 'Dr. A. K. Verma (Cardiologist)',
    clinicalSummary: 'Patient admitted with acute coronary syndrome / unstable angina. Advised emergency coronary angiography & ICU monitoring. Patient & family insisted on taking discharge against medical advice due to personal preference. High risk of myocardial infarction explained.',
    medications: 'Tab. Aspirin 75mg OD\nTab. Clopidogrel 75mg OD\nTab. Atorvastatin 40mg HS',
    followUpDate: new Date(Date.now() + 86400000 * 3).toISOString(),
    relativeName: 'Suresh Sharma (Brother)',
    relativeContact: '+91 98765 12345',
    lamaReason: 'Financial constraint & request to transfer to native city hospital',
    riskExplained: 'Cardiac arrest, sudden death, arrhythmia risks explained in presence of witness.',
    witnessName: 'Nurse Sunita R.',
    mlcStatus: 'MLC-2026/8812'
  },
  {
    id: 'disc-death-102',
    patientId: 'P003',
    patient_id: 'P003',
    patientName: 'Ramesh Patel',
    mrn: 'MRN-IPD-904',
    dischargeDate: new Date(Date.now() - 86400000 * 1).toISOString(),
    admissionDate: new Date(Date.now() - 86400000 * 7).toISOString(),
    dischargeType: 'Deceased',
    dischargeBy: 'Dr. S. N. Gupta (Intensivist)',
    clinicalSummary: 'Patient admitted with severe Community Acquired Pneumonia leading to Septic Shock with Multi-Organ Dysfunction Syndrome (MODS). Refractory hypotension despite triple vasopressors and mechanical ventilation. Cardiopulmonary arrest occurred at 04:15 AM.',
    medications: 'N/A - Patient Expired in ICU',
    followUpDate: '',
    timeOfDeath: '04:15 AM',
    causeOfDeathDirect: 'Refractory Septic Shock with Multi-Organ Dysfunction Syndrome (MODS)',
    causeOfDeathAntecedent: 'Severe Bilateral Pneumonia with Acute Respiratory Distress Syndrome (ARDS)',
    causeOfDeathUnderlying: 'Type-2 Diabetes Mellitus with Chronic Kidney Disease Stage IV',
    deathCertNo: 'MCCD/2026/0842',
    bodyHandedOverTo: 'Vikram Patel (Son)',
    bodyHandoverTime: new Date(Date.now() - 86400000 * 1 + 3600000 * 3).toISOString(),
    policeIntimation: 'Not Required (Natural Death in ICU)',
    mlcStatus: 'Non-MLC'
  },
  {
    id: 'disc-routine-103',
    patientId: 'P001',
    patient_id: 'P001',
    patientName: 'Ananya Sen',
    mrn: 'MRN-IPD-712',
    dischargeDate: new Date(Date.now() - 86400000 * 3).toISOString(),
    admissionDate: new Date(Date.now() - 86400000 * 6).toISOString(),
    dischargeType: 'Routine / Improved',
    dischargeBy: 'Dr. Priya Nair (General Physician)',
    clinicalSummary: 'Admitted with acute gastroenteritis with moderate dehydration. Treated with IV fluids, antibiotics, antiemetics, and supportive care. Vital parameters stable. Afebrile for 48 hours.',
    medications: 'Tab. Ciprofloxacin 500mg BD x 5 days\nCap. ORS powder as required\nTab. Pantoprazole 40mg OD AC x 7 days',
    followUpDate: new Date(Date.now() + 86400000 * 5).toISOString()
  }
];

export default function IPD() {
  const navigate = useNavigate();
  const [view, setView] = useState<'beds' | 'admissions'>('beds');
  const [beds, setBeds] = useState<any[]>(() => storage.get(STORAGE_KEYS.BEDS, []));
  const [patients, setPatients] = useState<any[]>(() => storage.get(STORAGE_KEYS.PATIENTS, []));
  const [admissions, setAdmissions] = useState<any[]>(() => storage.get('hms_admissions', []));
  const [invoices, setInvoices] = useState<any[]>(() => storage.get(STORAGE_KEYS.BILLING, []));
  const [users, setUsers] = useState<any[]>(() => {
    const cached = storage.get(STORAGE_KEYS.USERS, MOCK_USERS);
    return Array.isArray(cached) && cached.length > 0 ? cached : MOCK_USERS;
  });
  const [isChartOpen, setIsChartOpen] = useState(false);

  const doctorsList = useMemo(() => {
    const list = (users && users.length > 0 ? users : MOCK_USERS).filter((u: any) => {
      if (!u || !u.name) return false;
      const r = (u.role || '').toUpperCase();
      const n = (u.name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      if (email.endsWith('@globalhospital.com') && (n.includes('system administrator') || n.includes('accounts manager'))) {
        return false;
      }
      return r === 'DOCTOR' || r === 'SURGEON' || r === 'SUPER_ADMIN' || n.startsWith('dr.') || n.includes('doctor') || n.includes('physician') || n.includes('surgeon');
    });
    return list.length > 0 ? list : MOCK_USERS.filter(u => u.role === 'DOCTOR' || u.role === 'SUPER_ADMIN');
  }, [users]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [clinicalNotes, setClinicalNotes] = useState<any[]>([]);
  const [newDoctorNote, setNewDoctorNote] = useState('');
  const [newNurseNote, setNewNurseNote] = useState('');
  const [patientPrescriptions, setPatientPrescriptions] = useState<any[]>([]);
  const [patientTests, setPatientTests] = useState<any[]>([]);
  const [recommendedTestName, setRecommendedTestName] = useState('');
  const [newPrescription, setNewPrescription] = useState({
    medicineName: '',
    dosage: '',
    duration: '',
    instructions: ''
  });
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [bedsData, patientsData, admissionsData, dischargeSummariesData, staffData, otSchedulesData, invoicesData, otRoomsData, poorPrognosisData, generalConsentsData] = await Promise.all([
        supabaseService.getBeds(),
        supabaseService.getPatients(),
        supabaseService.getAdmissions(),
        supabaseService.getDischargeSummaries(),
        supabaseService.getStaff(),
        supabaseService.getOTSchedules(),
        supabaseService.getInvoices(),
        supabaseService.getOTRooms(),
        supabaseService.getPoorPrognosisConsents(),
        supabaseService.getGeneralConsents()
      ]);
      if (bedsData) setBeds(bedsData);
      if (patientsData) setPatients(patientsData);
      if (admissionsData) setAdmissions(admissionsData);
      if (dischargeSummariesData) setDischargeSummaries(dischargeSummariesData.length > 0 ? dischargeSummariesData : MOCK_DISCHARGE_SUMMARIES);
      if (staffData && staffData.length > 0) setUsers(staffData);
      if (otSchedulesData) setOTSchedules(otSchedulesData);
      if (invoicesData) setInvoices(invoicesData);
      if (otRoomsData) setTheatres(otRoomsData);
      if (poorPrognosisData) setPoorPrognosisList(poorPrognosisData);
      if (generalConsentsData) setGeneralConsentsList(generalConsentsData);
    } catch (error) {
      console.warn('Silent notice fetching IPD data:', error);
    } finally {
      setLoading(false);
    }
  };

  useDataSync(fetchData);

  useEffect(() => {
    if (isChartOpen && selectedPatient?.id) {
      const loadChartData = async () => {
        try {
          const [notes, rxList, orders] = await Promise.all([
            supabaseService.getClinicalNotes(selectedPatient.id),
            supabaseService.getPrescriptions(selectedPatient.id),
            supabaseService.getLabTestRequests()
          ]);
          if (notes) setClinicalNotes(notes);
          if (rxList) setPatientPrescriptions(rxList);
          if (orders) {
            const filtered = orders.filter((o: any) => o.patient_id === selectedPatient.id || o.patientId === selectedPatient.id);
            setPatientTests(filtered);
          }
        } catch (error) {
          console.error("Error loading patient chart data:", error);
        }
      };
      loadChartData();
    } else {
      setClinicalNotes([]);
      setPatientPrescriptions([]);
      setPatientTests([]);
      setNewDoctorNote('');
      setNewNurseNote('');
      setRecommendedTestName('');
      setNewPrescription({
        medicineName: '',
        dosage: '',
        duration: '',
        instructions: ''
      });
    }
  }, [isChartOpen, selectedPatient]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddBedOpen, setIsAddBedOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isVitalsOpen, setIsVitalsOpen] = useState(false);
  const [vitalsForm, setVitalsForm] = useState({
    patientId: '',
    bp: '',
    pulse: '',
    temp: '',
    spo2: '',
    rr: '',
    weight: '',
    height: '',
    bmi: '',
    cbs: '',
    cbsContext: 'Random',
    painScore: '0',
    painSite: '',
    o2Support: 'Room Air',
    o2Flow: '',
    gcsEye: '4',
    gcsVerbal: '5',
    gcsMotor: '6',
    crt: '< 2 secs',
    abdominalGirth: '',
    intakeOral: '',
    intakeIV: '',
    outputUrine: '',
    outputDrain: '',
    perAbdomen: '',
    localExam: '',
    inputOutput: '',
    recordedByRole: 'Nurse',
    recordedByName: '',
    customVitals: [] as Array<{ id: string; name: string; value: string; unit: string }>
  });
  const [customIpdMeasurementInput, setCustomIpdMeasurementInput] = useState({ name: '', value: '', unit: '' });
  const [transferData, setTransferData] = useState({ 
    patientId: '', 
    fromBedId: '', 
    toBedId: '',
    reason: 'Clinical improvement - Step down',
    transferredBy: '',
    clinicalRequirements: 'Wheelchair assist',
    nurseInCharge: ''
  });
  const [bedTransfers, setBedTransfers] = useState<any[]>(() => {
    const list = storage.get(STORAGE_KEYS.BED_TRANSFERS, []);
    if (list.length === 0) {
      return [
        {
          id: 'trf-1',
          patientId: 'p1',
          patientName: 'Aarav Sharma',
          fromBedId: 'b1',
          fromBedNumber: '101',
          fromWard: 'General Ward A',
          toBedId: 'b2',
          toBedNumber: '102',
          toWard: 'General Ward A',
          reason: 'Clinical deterioration - Shifted to closer monitoring bed',
          transferDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          transferredBy: 'Dr. Anjali Mehta',
          clinicalRequirements: 'Wheelchair assist, Continuous pulse oximetry',
          nurseInCharge: 'Staff Nurse Priya S.'
        },
        {
          id: 'trf-2',
          patientId: 'p2',
          patientName: 'Sunita Patel',
          fromBedId: 'b3',
          fromBedNumber: '201',
          fromWard: 'ICU',
          toBedId: 'b4',
          toBedNumber: 'M1',
          toWard: 'Maternity',
          reason: 'Post-operative stable stepdown',
          transferDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          transferredBy: 'Dr. S. K. Sen',
          clinicalRequirements: 'Oxygen support (2L/min), cardiac monitor',
          nurseInCharge: 'Staff Nurse Mathew George'
        }
      ];
    }
    return list;
  });
  const [shiftedSummaryToShow, setShiftedSummaryToShow] = useState<any>(null);
  const [shiftSearchQuery, setShiftSearchQuery] = useState('');
  const [shiftHistorySearch, setShiftHistorySearch] = useState('');
  const DEFAULT_WARDS = [
    'General Ward',
    'General Ward A',
    'General Ward B',
    'ICU (Intensive Care)',
    'ICCU',
    'Maternity Ward',
    'Semi-Private Ward',
    'Private Deluxe AC',
    'Emergency / Triage Ward',
    'HDU (High Dependency)',
    'Post-Op Recovery',
    'Pediatric Ward'
  ];
  const [hospitalWards, setHospitalWards] = useState<string[]>(() => {
    const saved = storage.get('hms_hospital_wards', null);
    if (saved && Array.isArray(saved) && saved.length > 0) return saved;
    return DEFAULT_WARDS;
  });
  const [isAddingCustomWard, setIsAddingCustomWard] = useState(false);
  const [customWardText, setCustomWardText] = useState('');

  const handleAddNewWard = (wardNameToAdd: string) => {
    const trimmed = wardNameToAdd.trim();
    if (!trimmed) return;
    if (!hospitalWards.some(w => w.toLowerCase() === trimmed.toLowerCase())) {
      const updated = [...hospitalWards, trimmed];
      setHospitalWards(updated);
      storage.set('hms_hospital_wards', updated);
      toast.success(`Ward "${trimmed}" added`);
    }
  };

  const [newBed, setNewBed] = useState({ number: '', ward: '', type: 'General' });
  
  const [isAdmissionOpen, setIsAdmissionOpen] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [showPatientResults, setShowPatientResults] = useState(false);
  const [admissionForm, setAdmissionForm] = useState({ 
    patientId: '', 
    doctorId: '', 
    ward: '', 
    bedId: '',
    urgency: 'Routine',
    caseType: 'General'
  });

  const currentUser = storage.get(STORAGE_KEYS.SESSION_USER, null);
  const isCurrentUserAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'HOSPITAL_ADMIN' || currentUser?.role === 'ADMIN' || currentUser?.role?.toUpperCase().includes('ADMIN');
  const isAccountant = normalizeRole(currentUser?.role) === 'ACCOUNTANT';
  const isReceptionist = normalizeRole(currentUser?.role) === 'RECEPTIONIST';
  const isDoctor = currentUser?.role?.toUpperCase() === 'DOCTOR' || currentUser?.role?.toUpperCase() === 'SURGEON';
  const isDeleteForbidden = false;

  // --- DELETE & PURGE ACTIVE ADMISSION STATES ---
  const [isDeleteAdmissionOpen, setIsDeleteAdmissionOpen] = useState(false);
  const [admissionToDelete, setAdmissionToDelete] = useState<any>(null);
  const [patientToDeleteAdmission, setPatientToDeleteAdmission] = useState<any>(null);
  const [bedToDeleteAdmission, setBedToDeleteAdmission] = useState<any>(null);
  const [deleteReleaseBed, setDeleteReleaseBed] = useState(true);
  const [deleteUpdatePatientStatus, setDeleteUpdatePatientStatus] = useState(true);
  const [deleteReason, setDeleteReason] = useState('Old stale admission record');
  const [isDeletingAdmission, setIsDeletingAdmission] = useState(false);

  const [isPurgeOldAdmissionsOpen, setIsPurgeOldAdmissionsOpen] = useState(false);
  const [purgeDaysFilter, setPurgeDaysFilter] = useState<'all' | '7' | '14' | '30' | '60'>('14');
  const [purgeSearchQuery, setPurgeSearchQuery] = useState('');
  const [selectedPurgeIds, setSelectedPurgeIds] = useState<string[]>([]);
  const [purgeReleaseBeds, setPurgeReleaseBeds] = useState(true);
  const [purgeUpdatePatientStatus, setPurgeUpdatePatientStatus] = useState(true);
  const [purgeReason, setPurgeReason] = useState('Bulk purge of old active admissions');
  const [isPurgingAdmissions, setIsPurgingAdmissions] = useState(false);
  const [purgeConfirmationStep, setPurgeConfirmationStep] = useState(false);

  // --- DELETE BED CONFIGURATION STATES ---
  const [isDeleteBedOpen, setIsDeleteBedOpen] = useState(false);
  const [bedToDelete, setBedToDelete] = useState<any>(null);
  const [isDeletingBed, setIsDeletingBed] = useState(false);
  const [deleteBedUnassignPatient, setDeleteBedUnassignPatient] = useState(true);

  // --- NEW WORKFLOWS STATE ---
  const [activeTab, setActiveTab] = useState<'registration' | 'beds' | 'surgery' | 'discharge' | 'shifting' | 'lama-death' | 'initial-evaluation' | 'specialist-consultations' | 'poor-prognosis'>('beds');

  useEffect(() => {
    if (isDoctor && activeTab === 'registration') {
      setActiveTab('beds');
    }
  }, [isDoctor, activeTab]);
  const [bedSubTab, setBedSubTab] = useState<'grid' | 'list' | 'infrastructure'>('grid');
  
  // Official Admission Sheet & LAMA / DOR Modal State
  const [isAdmissionSheetOpen, setIsAdmissionSheetOpen] = useState(false);
  const [admissionSheetPatient, setAdmissionSheetPatient] = useState<any>(null);
  const [admissionSheetAdmission, setAdmissionSheetAdmission] = useState<any>(null);
  // Poor Prognosis & High Risk Consent State
  const [isPoorPrognosisOpen, setIsPoorPrognosisOpen] = useState(false);
  const [poorPrognosisPatient, setPoorPrognosisPatient] = useState<any>(null);
  const [poorPrognosisAdmission, setPoorPrognosisAdmission] = useState<any>(null);
  const [poorPrognosisList, setPoorPrognosisList] = useState<any[]>([]);
  const [activeStatutoryTab, setActiveStatutoryTab] = useState<'lama_deceased' | 'poor_prognosis' | 'general_consent'>('lama_deceased');
  const [isGeneralConsentOpen, setIsGeneralConsentOpen] = useState(false);
  const [generalConsentPatient, setGeneralConsentPatient] = useState<any>(null);
  const [generalConsentAdmission, setGeneralConsentAdmission] = useState<any>(null);
  const [selectedGeneralConsent, setSelectedGeneralConsent] = useState<any>(null);
  const [generalConsentsList, setGeneralConsentsList] = useState<any[]>([]);
  const [generalConsentData, setGeneralConsentData] = useState<any>(null);
  
  // Infrastructure States (Local Persistence for custom relationships)
  const [buildings, setBuildings] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('hms_buildings');
      return saved ? JSON.parse(saved) : [
        { id: 'bldg-1', name: 'Main Block', code: 'MAIN', description: 'Primary treatment and clinics' },
        { id: 'bldg-2', name: 'Anand Block', code: 'ANND', description: 'Bedward and trauma care' }
      ];
    } catch {
      return [
        { id: 'bldg-1', name: 'Main Block', code: 'MAIN', description: 'Primary treatment and clinics' },
        { id: 'bldg-2', name: 'Anand Block', code: 'ANND', description: 'Bedward and trauma care' }
      ];
    }
  });

  const [floors, setFloors] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('hms_floors');
      return saved ? JSON.parse(saved) : [
        { id: 'flr-1-1', name: 'Ground Floor', buildingId: 'bldg-1' },
        { id: 'flr-1-2', name: 'First Floor', buildingId: 'bldg-1' },
        { id: 'flr-2-1', name: 'Ground Floor', buildingId: 'bldg-2' },
        { id: 'flr-2-2', name: 'First Floor', buildingId: 'bldg-2' }
      ];
    } catch {
      return [
        { id: 'flr-1-1', name: 'Ground Floor', buildingId: 'bldg-1' },
        { id: 'flr-1-2', name: 'First Floor', buildingId: 'bldg-1' },
        { id: 'flr-2-1', name: 'Ground Floor', buildingId: 'bldg-2' },
        { id: 'flr-2-2', name: 'First Floor', buildingId: 'bldg-2' }
      ];
    }
  });

  const [rooms, setRooms] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('hms_rooms');
      return saved ? JSON.parse(saved) : [
        { id: 'rm-101', name: 'General Ward Room A', room_number: '101', type: 'General', floorId: 'flr-1-1', buildingId: 'bldg-1', capacity: 20 },
        { id: 'rm-102', name: 'Private Room 102', room_number: '102', type: 'Private', floorId: 'flr-1-2', buildingId: 'bldg-1', capacity: 8 },
        { id: 'rm-103', name: 'Semi-Private Room 103', room_number: '103', type: 'Semi-Private', floorId: 'flr-2-1', buildingId: 'bldg-2', capacity: 12 },
        { id: 'rm-icu', name: 'ICU Unit 1', room_number: 'ICU-1', type: 'ICU', floorId: 'flr-2-2', buildingId: 'bldg-2', capacity: 4 }
      ];
    } catch {
      return [
        { id: 'rm-101', name: 'General Ward Room A', room_number: '101', type: 'General', floorId: 'flr-1-1', buildingId: 'bldg-1', capacity: 20 },
        { id: 'rm-102', name: 'Private Room 102', room_number: '102', type: 'Private', floorId: 'flr-1-2', buildingId: 'bldg-1', capacity: 8 },
        { id: 'rm-103', name: 'Semi-Private Room 103', room_number: '103', type: 'Semi-Private', floorId: 'flr-2-1', buildingId: 'bldg-2', capacity: 12 },
        { id: 'rm-icu', name: 'ICU Unit 1', room_number: 'ICU-1', type: 'ICU', floorId: 'flr-2-2', buildingId: 'bldg-2', capacity: 4 }
      ];
    }
  });

  const [otSchedules, setOTSchedules] = useState<any[]>([]);
  const [theatres, setTheatres] = useState<any[]>([]);

  // dialog & form variables
  const [isBuildingOpen, setIsBuildingOpen] = useState(false);
  const [isFloorOpen, setIsFloorOpen] = useState(false);
  const [isRoomOpen, setIsRoomOpen] = useState(false);
  const [isOTOpen, setIsOTOpen] = useState(false);
  const [isAdmissionSlipOpen, setIsAdmissionSlipOpen] = useState(false);
  const [admissionSlipData, setAdmissionSlipData] = useState<any>(null);

  const [isAorOpen, setIsAorOpen] = useState(false);
  const [aorPatientData, setAorPatientData] = useState<any>(null);

  const [buildingForm, setBuildingForm] = useState({ name: '', code: '', description: '' });
  const [floorForm, setFloorForm] = useState({ name: '', buildingId: '' });
  const [roomForm, setRoomForm] = useState({ name: '', room_number: '', type: 'General', floorId: '', buildingId: '', capacity: '4' });

  // Inpatient Surgery Form
  const [surgeryForm, setSurgeryForm] = useState({
    patientId: '',
    operationName: '',
    surgeonId: '',
    theatreId: '',
    date: '',
    startTime: '',
    notes: ''
  });

  // Discharge Summary states
  const [dischargeForm, setDischargeForm] = useState({
    patientId: '',
    dischargeType: 'Routine / Improved',
    followUpDate: '',
    medications: '',
    clinicalSummary: '',
    dischargeDate: new Date().toISOString().substring(0, 10),
    dischargeBy: '',
    primaryDiagnosis: '',
    secondaryDiagnosis: '',
    operativeProcedure: '',
    dischargeVitals: '',
    investigationHighlights: '',
    conditionAtDischarge: 'Hemodynamically Stable, Afebrile, Ambulatory',
    dietaryAdvice: 'Soft, nutritious diet. Hydrate well (2.5-3L water/day). Avoid spicy & deep-fried foods.',
    emergencyWarningSigns: 'High fever (>101°F), severe abdominal pain, persistent vomiting, shortness of breath, or surgical site redness/discharge.'
  });
  const [dischargeAuxDetails, setDischargeAuxDetails] = useState<{
    vitals: any[];
    notes: any[];
    prescriptions: any[];
  }>({ vitals: [], notes: [], prescriptions: [] });
  const [loadingDischargeAux, setLoadingDischargeAux] = useState(false);

  useEffect(() => {
    const fetchAuxDetailsForDischarge = async () => {
      const pId = dischargeForm.patientId;
      if (!pId) {
        setDischargeAuxDetails({ vitals: [], notes: [], prescriptions: [] });
        return;
      }
      setLoadingDischargeAux(true);
      try {
        const [vts, nts, rxs] = await Promise.all([
          supabaseService.getPatientVitals ? supabaseService.getPatientVitals(pId) : Promise.resolve([]),
          supabaseService.getClinicalNotes ? supabaseService.getClinicalNotes(pId) : Promise.resolve([]),
          supabaseService.getPrescriptions ? supabaseService.getPrescriptions(pId) : Promise.resolve([]),
        ]);
        setDischargeAuxDetails({
          vitals: vts || [],
          notes: nts || [],
          prescriptions: rxs || [],
        });
      } catch (err) {
        console.warn('Error fetching auxiliary details for discharge:', err);
      } finally {
        setLoadingDischargeAux(false);
      }
    };

    fetchAuxDetailsForDischarge();
  }, [dischargeForm.patientId]);

  const [dischargedSummaryToShow, setDischargedSummaryToShow] = useState<any>(null);
  const [isSummaryDetailsOpen, setIsSummaryDetailsOpen] = useState(false);

  const [dischargeSummaries, setDischargeSummaries] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('hms_discharge_summaries');
      const parsed = saved ? JSON.parse(saved) : [];
      return parsed.length > 0 ? parsed : MOCK_DISCHARGE_SUMMARIES;
    } catch {
      return MOCK_DISCHARGE_SUMMARIES;
    }
  });

  const [dischargeSearchTerm, setDischargeSearchTerm] = useState('');
  const [showDischargeSearchDropdown, setShowDischargeSearchDropdown] = useState(false);
  const [bypassDues, setBypassDues] = useState(false);
  const [dischargeRightPaneView, setDischargeRightPaneView] = useState<'timeline' | 'report'>('timeline');
  const [patientChecklists, setPatientChecklists] = useState<Record<string, {
    doctorCleared: boolean;
    nurseCleared: boolean;
    accountsCleared: boolean;
    frontOfficeHandedOver: boolean;
    doctorName?: string;
    nurseName?: string;
    accountsName?: string;
    frontOfficeName?: string;
  }>>(() => {
    try {
      const stored = localStorage.getItem('hms_discharge_checklists');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Bed Quick Edit Modal state
  const [isEditBedOpen, setIsEditBedOpen] = useState(false);
  const [editingBed, setEditingBed] = useState<any>(null);
  const [editBedForm, setEditBedForm] = useState({
    bedNumber: '',
    ward: '',
    bedType: 'General',
    pricePerDay: 500,
    status: 'Available',
    customWard: false,
    customWardName: ''
  });
  const [isSavingBed, setIsSavingBed] = useState(false);

  // Quick Discharge Modal state
  const [isQuickDischargeOpen, setIsQuickDischargeOpen] = useState(false);
  const [quickDischargeBed, setQuickDischargeBed] = useState<any>(null);
  const [quickDischargeForm, setQuickDischargeForm] = useState({
    dischargeType: 'Routine / Improved',
    dischargeDate: new Date().toISOString().substring(0, 10),
    dischargeTime: new Date().toTimeString().substring(0, 5),
    followUpDate: '',
    conditionAtDischarge: 'Hemodynamically Stable, Afebrile, Ambulatory',
    dietaryAdvice: 'Soft, nutritious diet. Hydrate well (2.5-3L water/day). Avoid spicy & deep-fried foods.',
    emergencyWarningSigns: 'High fever (>101°F), severe abdominal pain, persistent vomiting, shortness of breath, or surgical site redness/discharge.',
    dischargeBy: 'Dr. Rajesh Sharma',
    bypassDues: false,
    notes: ''
  });
  const [isProcessingQuickDischarge, setIsProcessingQuickDischarge] = useState(false);

  const saveChecklist = (patId: string, updatedFields: any) => {
    const updatedChecklists = {
      ...patientChecklists,
      [patId]: {
        ...(patientChecklists[patId] || {
          doctorCleared: false,
          nurseCleared: false,
          accountsCleared: false,
          frontOfficeHandedOver: false
        }),
        ...updatedFields
      }
    };
    setPatientChecklists(updatedChecklists);
    localStorage.setItem('hms_discharge_checklists', JSON.stringify(updatedChecklists));
  };

  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [reportTypeFilter, setReportTypeFilter] = useState('All');
  const [selectedReportSummaryId, setSelectedReportSummaryId] = useState<string | null>(null);

  const [isQuickRegistering, setIsQuickRegistering] = useState(false);
  const [mergePatientData, setMergePatientData] = useState<{ existing: any, newDetails: any } | null>(null);
  const [duplicateConfirm, setDuplicateConfirm] = useState<{
    newPatientData: any;
    duplicatePatient: any;
  } | null>(null);
  const isQuickRegisteringRef = useRef(false);

  const confirmIPDMergeAndContinue = async () => {
    if (!mergePatientData) return;
    const { existing, newDetails } = mergePatientData;
    setMergePatientData(null);
    setIsQuickRegistering(true);
    try {
      const mergedData = {
        name: existing.name,
        phone: existing.phone,
        age: newDetails.age ? parseInt(newDetails.age) : existing.age,
        gender: newDetails.gender || existing.gender,
        address: newDetails.address || existing.address || 'N/A',
        is_insurance: newDetails.isInsurance || existing.is_insurance,
        insurance_provider: newDetails.insuranceProvider || existing.insurance_provider,
        insurance_policy_number: newDetails.insurancePolicyNumber || existing.insurance_policy_number
      };

      const result = await supabaseService.updatePatient(existing.id, mergedData);
      if (result) {
        setPatients(patients.map(p => p.id === existing.id ? { ...p, ...result } : p));
        toast.success(`Patient record found and merged successfully! MRN: ${existing.mrn}`);
        setAdmissionForm({
          ...admissionForm,
          patientId: existing.id
        });
        setPatientSearchTerm(existing.name);
        setQuickPatient({
          name: '',
          age: '',
          gender: 'Male',
          phone: '',
          address: '',
          isInsurance: false,
          insuranceProvider: '',
          insurancePolicyNumber: ''
        });
      } else {
        toast.error('Failed to merge patient details');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error merging records');
    } finally {
      setIsQuickRegistering(false);
    }
  };

  const [quickPatient, setQuickPatient] = useState({
    name: '',
    age: '',
    gender: 'Male',
    phone: '',
    address: '',
    isInsurance: false,
    insuranceProvider: '',
    insurancePolicyNumber: ''
  });

  const handleQuickRegister = async (bypassDuplicateCheck: boolean = false) => {
    if (!quickPatient.name || !quickPatient.age || !quickPatient.phone) {
      toast.error('Please fill in Patient Name, Age, and Contact Phone.');
      return;
    }

    if (isQuickRegistering || isQuickRegisteringRef.current) {
      toast.warning('Registration is already in progress! Please do not click multiple times.');
      return;
    }
    isQuickRegisteringRef.current = true;

    if (!bypassDuplicateCheck) {
      // Duplicate check
      const trimmedNewName = (quickPatient.name || '').trim().toLowerCase();
      const trimmedNewPhone = (quickPatient.phone || '').trim().replace(/\D/g, '');

      // Look for EXACT name and phone match for merge
      const exactMatch = patients.find((p: any) => {
        const pName = (p.name || '').trim().toLowerCase();
        const pPhone = (p.phone || p.mobile || '').trim().replace(/\D/g, '');
        return pName === trimmedNewName && pPhone === trimmedNewPhone && trimmedNewPhone !== '';
      });

      if (exactMatch) {
        setMergePatientData({
          existing: exactMatch,
          newDetails: { ...quickPatient }
        });
        isQuickRegisteringRef.current = false;
        return;
      }

      const duplicatePatient = patients.find((p: any) => {
        const pName = (p.name || '').trim().toLowerCase();
        const pPhone = (p.phone || p.mobile || '').trim().replace(/\D/g, '');

        const nameMatches = pName === trimmedNewName;
        const phoneMatches = trimmedNewPhone && pPhone && (trimmedNewPhone === pPhone);

        if (nameMatches && phoneMatches) return true;
        if (trimmedNewPhone && trimmedNewPhone.length >= 10 && pPhone === trimmedNewPhone) return true;
        if (nameMatches && !trimmedNewPhone && !pPhone) return true;
        return false;
      });

      if (duplicatePatient) {
        setDuplicateConfirm({
          newPatientData: { ...quickPatient },
          duplicatePatient
        });
        isQuickRegisteringRef.current = false;
        return;
      }
    }

    setIsQuickRegistering(true);
    try {
      const patientToAdd = {
        name: quickPatient.name,
        age: parseInt(quickPatient.age) || 30,
        gender: quickPatient.gender,
        phone: quickPatient.phone,
        address: quickPatient.address || 'N/A',
        mrn: 'MRN-' + Math.floor(100000 + Math.random() * 900000),
        status: 'Admitting',
        needsAdmission: true,
        needs_admission: true,
        registration_type: 'IPD',
        registrationType: 'IPD',
        created_at: new Date().toISOString()
      };
      const result = await supabaseService.createPatient(patientToAdd);
      if (result) {
        setPatients(prev => [result, ...prev.filter(p => p.id !== result.id && p.mrn !== result.mrn)]);
        const cached = storage.get(STORAGE_KEYS.PATIENTS, []);
        storage.set(STORAGE_KEYS.PATIENTS, [result, ...cached.filter((p: any) => p.id !== result.id && p.mrn !== result.mrn)]);
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table: 'patients', action: 'insert' } }));
        
        toast.success(`Patient ${result.name} registered with MRN: ${result.mrn}!`);
        setAdmissionForm(prev => ({
          ...prev,
          patientId: result.id,
          ward: prev.ward || 'General Ward A',
          urgency: 'Routine',
          caseType: 'General'
        }));
        setPatientSearchTerm(result.name);
        setQuickPatient({
          name: '',
          age: '',
          gender: 'Male',
          phone: '',
          address: '',
          isInsurance: false,
          insuranceProvider: '',
          insurancePolicyNumber: ''
        });
      } else {
        toast.error('Failed to register patient');
      }
    } catch (error) {
      console.error('Error in quick registration:', error);
      toast.error('An error occurred during registration');
    } finally {
      setIsQuickRegistering(false);
      isQuickRegisteringRef.current = false;
    }
  };

  const displayPatients = useMemo(() => {
    if (!currentUser || !isDoctor) return patients;
    const docIdStr = String(currentUser.id).toLowerCase();
    const docNameStr = String(currentUser.name || '').toLowerCase();
    
    return patients.filter((p: any) => {
      const isAssigned = 
        (p.attending_doctor_id && (String(p.attending_doctor_id).toLowerCase() === docIdStr || String(p.attending_doctor_id).toLowerCase() === docNameStr)) ||
        (p.attendingDoctorId && (String(p.attendingDoctorId).toLowerCase() === docIdStr || String(p.attendingDoctorId).toLowerCase() === docNameStr));
        
      const hasAdmission = admissions.some((a: any) => 
        (String(a.patient_id || a.patientId).toLowerCase() === String(p.id).toLowerCase()) &&
        (a.doctor_id && String(a.doctor_id).toLowerCase() === docIdStr)
      );
      
      const appts = storage.get(STORAGE_KEYS.APPOINTMENTS, []);
      const hasAppointment = appts.some((apt: any) => {
        const pId = String(apt.patient_id || apt.patientId).toLowerCase();
        if (pId !== String(p.id).toLowerCase()) return false;
        
        const aptDocId = apt.doctor_id || apt.doctorId;
        const aptDocName = apt.doctor || apt.doctorName || '';
        const aptDocNameLower = String(aptDocName).toLowerCase();
        
        return (aptDocId && String(aptDocId).toLowerCase() === docIdStr) ||
               (aptDocName && aptDocNameLower === docNameStr) ||
               (aptDocName && docNameStr.includes(aptDocNameLower)) ||
               (currentUser.name && aptDocNameLower.includes(docNameStr));
      });
      
      const isPendingAdmit = p.needsAdmission === true || p.needs_admission === true || String(p.status).toLowerCase() === 'admitting';
      return isAssigned || hasAdmission || hasAppointment || isPendingAdmit;
    });
  }, [patients, admissions, currentUser, isDoctor]);

  const deduplicateBeds = (bedsList: any[]) => {
    if (!Array.isArray(bedsList)) return [];
    const map = new Map<string, any>();

    bedsList.forEach((b: any) => {
      if (!b) return;
      const num = String(b.bed_number || b.number || b.id || '').trim().toLowerCase();
      const ward = String(b.ward || '').trim().toLowerCase();
      if (!num) return;
      const key = `${num}___${ward}`;

      if (!map.has(key)) {
        map.set(key, b);
      } else {
        const existing = map.get(key);
        const isCurrentOccupied = (b.status || '').toLowerCase() === 'occupied' || !!(b.patient_id || b.patientId);
        const isExistingOccupied = (existing.status || '').toLowerCase() === 'occupied' || !!(existing.patient_id || existing.patientId);

        if (isCurrentOccupied && !isExistingOccupied) {
          map.set(key, b);
        } else if (isCurrentOccupied && isExistingOccupied) {
          if (b.patient_id || b.patientId) {
            map.set(key, b);
          }
        }
      }
    });

    return Array.from(map.values());
  };

  const displayBeds = useMemo(() => {
    const cleanBeds = deduplicateBeds(beds);
    if (!currentUser || !isDoctor) return cleanBeds;
    const assignedPatientIds = displayPatients.map(p => p.id);
    
    return cleanBeds.filter((bed) => {
      if (bed.status !== 'Occupied') return true; // Show available beds
      return assignedPatientIds.includes(bed.patient_id || bed.patientId);
    });
  }, [beds, displayPatients, currentUser, isDoctor]);

  const bedSummaryByCategory = useMemo(() => {
    const cleanBeds = deduplicateBeds(beds);
    const categoriesMap = new Map<string, {
      categoryKey: string;
      bedType: string;
      ward: string;
      total: number;
      occupied: number;
      vacant: number;
      bedNumbers: string[];
      occupiedBedNumbers: string[];
      vacantBedNumbers: string[];
    }>();

    cleanBeds.forEach(bed => {
      const bType = bed.bed_type || bed.type || 'General';
      const wardName = bed.ward || 'General Ward';
      const categoryKey = `${wardName} (${bType})`;

      if (!categoriesMap.has(categoryKey)) {
        categoriesMap.set(categoryKey, {
          categoryKey,
          bedType: bType,
          ward: wardName,
          total: 0,
          occupied: 0,
          vacant: 0,
          bedNumbers: [],
          occupiedBedNumbers: [],
          vacantBedNumbers: []
        });
      }

      const item = categoriesMap.get(categoryKey)!;
      const num = String(bed.bed_number || bed.number || bed.id);
      item.total += 1;
      item.bedNumbers.push(num);

      if (bed.status === 'Occupied') {
        item.occupied += 1;
        item.occupiedBedNumbers.push(num);
      } else {
        item.vacant += 1;
        item.vacantBedNumbers.push(num);
      }
    });

    return Array.from(categoriesMap.values());
  }, [beds]);

  const displayAdmissions = useMemo(() => {
    if (!currentUser || !isDoctor) return admissions;
    const docIdStr = String(currentUser.id).toLowerCase();
    const assignedPatientIds = displayPatients.map(p => p.id);
    
    return admissions.filter((a: any) => {
      const isMyAdmission = a.doctor_id && String(a.doctor_id).toLowerCase() === docIdStr;
      const isMyPatient = assignedPatientIds.includes(a.patient_id || a.patientId);
      return isMyAdmission || isMyPatient;
    });
  }, [admissions, displayPatients, currentUser, isDoctor]);

  const displayOtSchedules = useMemo(() => {
    if (!currentUser || !isDoctor) return otSchedules;
    const docIdStr = String(currentUser.id).toLowerCase();
    const assignedPatientIds = displayPatients.map(p => p.id);
    
    return otSchedules.filter((sched: any) => {
      const isMySurgery = (sched.surgeon_id && String(sched.surgeon_id).toLowerCase() === docIdStr) ||
                          (sched.surgeonId && String(sched.surgeonId).toLowerCase() === docIdStr);
      const isMyPatient = assignedPatientIds.includes(sched.patient_id || sched.patientId);
      return isMySurgery || isMyPatient;
    });
  }, [otSchedules, displayPatients, currentUser, isDoctor]);

  const recentlyDischargedPatients = useMemo(() => {
    const list: Array<{
      patient: any;
      summary: any;
      bed: any;
      dischargeDate: string;
      bedNumber: string;
    }> = [];
    const seenPatientIds = new Set<string>();

    // 1. Check dischargeSummaries
    dischargeSummaries.forEach((s: any) => {
      const pId = s.patientId || s.patient_id;
      if (!pId || seenPatientIds.has(String(pId))) return;

      const pat = patients.find(p => String(p.id) === String(pId)) || {
        id: pId,
        name: s.patientName || 'Discharged Patient',
        mrn: s.mrn || 'MRN-N/A',
        phone: s.relativeContact || s.contact || 'N/A',
        status: 'Discharged'
      };

      seenPatientIds.add(String(pId));
      const bed = beds.find(b => String(b.patient_id || b.patientId) === String(pId));
      const bedNum = bed ? (bed.bed_number || bed.number || bed.id) : (s.bedNumber || s.bed_number || s.ward || 'N/A');

      list.push({
        patient: pat,
        summary: s,
        bed: bed,
        dischargeDate: s.dischargeDate || new Date().toISOString(),
        bedNumber: String(bedNum)
      });
    });

    // 2. Check patients array for status === 'Discharged' or 'discharged' or has dischargeDate
    patients.forEach((p: any) => {
      if (seenPatientIds.has(String(p.id))) return;
      const isDischarged = (p.status || '').toLowerCase() === 'discharged';
      const dDate = p.dischargeDate || p.discharge_date;

      if (isDischarged || dDate) {
        seenPatientIds.add(String(p.id));
        const bed = beds.find(b => String(b.patient_id || b.patientId) === String(p.id));
        const bedNum = bed ? (bed.bed_number || bed.number || bed.id) : 'N/A';
        const summary = dischargeSummaries.find(s => String(s.patientId || s.patient_id) === String(p.id));

        list.push({
          patient: p,
          summary: summary || null,
          bed: bed,
          dischargeDate: dDate || (summary ? summary.dischargeDate : new Date().toISOString()),
          bedNumber: String(bedNum)
        });
      }
    });

    return list;
  }, [dischargeSummaries, patients, beds]);

  // Auto load/save lists on update
  useEffect(() => {
    localStorage.setItem('hms_buildings', JSON.stringify(buildings));
  }, [buildings]);

  useEffect(() => {
    localStorage.setItem('hms_floors', JSON.stringify(floors));
  }, [floors]);

  useEffect(() => {
    localStorage.setItem('hms_rooms', JSON.stringify(rooms));
  }, [rooms]);

  // Fetch OT Schedules inside component or fallback
  const fetchOTSchedules = async () => {
    try {
      const data = await supabaseService.getOTSchedules();
      if (data) setOTSchedules(data);
    } catch (e) {
      console.error('Error fetching OT schedules:', e);
    }
  };

  useEffect(() => {
    fetchOTSchedules();
  }, []);

  // --- FORM HANDLERS FOR INFRASTRUCTURE ---
  const handleAddBuilding = () => {
    if (!buildingForm.name || !buildingForm.code) {
      toast.error('Please input building name and code');
      return;
    }
    const newBldg = {
      id: 'bldg-' + Date.now(),
      name: buildingForm.name,
      code: buildingForm.code,
      description: buildingForm.description
    };
    setBuildings([...buildings, newBldg]);
    setBuildingForm({ name: '', code: '', description: '' });
    setIsBuildingOpen(false);
    toast.success('Building added successfully!');
    logAudit('Add Building', newBldg.id, newBldg);
  };

  const handleAddFloor = () => {
    if (!floorForm.name || !floorForm.buildingId) {
      toast.error('Please input floor name and select building');
      return;
    }
    const newFlr = {
      id: 'flr-' + Date.now(),
      name: floorForm.name,
      buildingId: floorForm.buildingId
    };
    setFloors([...floors, newFlr]);
    setFloorForm({ name: '', buildingId: '' });
    setIsFloorOpen(false);
    toast.success('Floor added successfully!');
    logAudit('Add Floor', newFlr.id, newFlr);
  };

  const handleAddRoom = () => {
    if (!roomForm.name || !roomForm.room_number || !roomForm.buildingId || !roomForm.floorId) {
      toast.error('Please fill in all room fields');
      return;
    }
    const newRm = {
      id: 'rm-' + Date.now(),
      name: roomForm.name,
      room_number: roomForm.room_number,
      type: roomForm.type,
      buildingId: roomForm.buildingId,
      floorId: roomForm.floorId,
      capacity: parseInt(roomForm.capacity) || 4
    };
    setRooms([...rooms, newRm]);
    setRoomForm({ name: '', room_number: '', type: 'General', floorId: '', buildingId: '', capacity: '4' });
    setIsRoomOpen(false);
    toast.success('Room added successfully!');
    logAudit('Add Room', newRm.id, newRm);
  };

  const handleScheduleSurgery = async () => {
    if (!surgeryForm.patientId || !surgeryForm.operationName || !surgeryForm.surgeonId || !surgeryForm.date) {
      toast.error('Please fill in required fields to schedule surgery');
      return;
    }

    const payload = {
      patientId: surgeryForm.patientId,
      operationName: surgeryForm.operationName,
      surgeonId: surgeryForm.surgeonId,
      theatreId: surgeryForm.theatreId || 'Major OT-1',
      date: surgeryForm.date,
      startTime: surgeryForm.startTime || '10:00 AM',
      notes: surgeryForm.notes,
      status: 'Scheduled'
    };

    const result = await supabaseService.createOTSchedule(payload);
    if (result) {
      setOTSchedules([result, ...otSchedules]);
      setIsOTOpen(false);
      setSurgeryForm({
        patientId: '',
        operationName: '',
        surgeonId: '',
        theatreId: '',
        date: '',
        startTime: '',
        notes: ''
      });
      toast.success('Inpatient surgery scheduled successfully');
      logAudit('Schedule IPD Surgery', result.patientId || result.patient_id, result);
    } else {
      toast.error('Failed to schedule surgery');
    }
  };

  const getAttendingDoctorName = (patientId: string) => {
    const pat = patients.find(p => p.id === patientId) || MOCK_PATIENTS.find(p => p.id === patientId);
    if (!pat) return '';
    const docId = pat.attending_doctor_id || pat.attendingDoctorId;
    const doc = docId ? (
      users.find(u => String(u.id) === String(docId) || String(u.name).trim().toLowerCase() === String(docId).trim().toLowerCase()) || 
      MOCK_USERS.find(u => String(u.id) === String(docId) || String(u.name).trim().toLowerCase() === String(docId).trim().toLowerCase())
    ) : null;
    return doc ? doc.name : '';
  };

  const handleSelectPatientForDischarge = (patId: string) => {
    if (!patId) return;
    const pat = patients.find(p => String(p.id) === String(patId)) || MOCK_PATIENTS.find(p => String(p.id) === String(patId));
    
    const autoDoc = getAttendingDoctorName(patId);
    const existingSummary = dischargeSummaries.find(s => String(s.patientId || s.patient_id) === String(patId));

    if (existingSummary) {
      setDischargeForm({
        patientId: patId,
        dischargeType: existingSummary.dischargeType || 'Routine / Improved',
        followUpDate: existingSummary.followUpDate ? existingSummary.followUpDate.substring(0, 10) : '',
        medications: existingSummary.medications || '',
        clinicalSummary: existingSummary.clinicalSummary || '',
        dischargeDate: existingSummary.dischargeDate ? existingSummary.dischargeDate.substring(0, 10) : new Date().toISOString().substring(0, 10),
        dischargeBy: existingSummary.dischargeBy || autoDoc || currentUser?.name || 'Dr. Rajesh Sharma',
        primaryDiagnosis: existingSummary.primaryDiagnosis || '',
        secondaryDiagnosis: existingSummary.secondaryDiagnosis || '',
        operativeProcedure: existingSummary.operativeProcedure || '',
        dischargeVitals: existingSummary.dischargeVitals || '',
        investigationHighlights: existingSummary.investigationHighlights || existingSummary.labHighlights || '',
        conditionAtDischarge: existingSummary.conditionAtDischarge || 'Hemodynamically Stable, Afebrile, Ambulatory',
        dietaryAdvice: existingSummary.dietaryAdvice || existingSummary.dietAdvice || 'Soft, nutritious diet. Hydrate well (2.5-3L water/day). Avoid spicy & deep-fried foods.',
        emergencyWarningSigns: existingSummary.emergencyWarningSigns || existingSummary.emergencyContact || 'High fever (>101°F), severe abdominal pain, persistent vomiting, shortness of breath, or surgical site redness/discharge.'
      });
      setDischargedSummaryToShow(existingSummary);
      const nameToShow = pat ? pat.name : (existingSummary.patientName || 'Discharged Patient');
      setDischargeSearchTerm(nameToShow);
      setShowDischargeSearchDropdown(false);
      toast.success(`Loaded Discharge Summary for ${nameToShow} (MRN: ${existingSummary.mrn || pat?.mrn || 'N/A'})`);
      return;
    }

    if (pat) {
      setDischargeForm({
        patientId: pat.id,
        dischargeType: 'Routine / Improved',
        followUpDate: '',
        medications: '',
        clinicalSummary: '',
        dischargeDate: new Date().toISOString().substring(0, 10),
        dischargeBy: autoDoc || currentUser?.name || 'Dr. Rajesh Sharma',
        primaryDiagnosis: '',
        secondaryDiagnosis: '',
        operativeProcedure: '',
        dischargeVitals: '',
        investigationHighlights: '',
        conditionAtDischarge: 'Hemodynamically Stable, Afebrile, Ambulatory',
        dietaryAdvice: 'Soft, nutritious diet. Hydrate well (2.5-3L water/day). Avoid spicy & deep-fried foods.',
        emergencyWarningSigns: 'High fever (>101°F), severe abdominal pain, persistent vomiting, shortness of breath, or surgical site redness/discharge.'
      });
      setDischargeSearchTerm(pat.name);
      setShowDischargeSearchDropdown(false);
    }
  };

  const checkPatientDues = (patientId: string) => {
    const patientBills = invoices.filter(b => b.patient_id === patientId || b.patientId === patientId);
    const total = patientBills.reduce((acc, b) => acc + (Number(b.total_amount) || Number(b.total) || 0), 0);
    const paid = patientBills.reduce((acc, b) => acc + (Number(b.paid_amount) || Number(b.paid) || 0), 0);
    return total - paid;
  };

  const handleDischargeWithSummary = async () => {
    const { 
      patientId, 
      dischargeType, 
      followUpDate, 
      medications, 
      clinicalSummary, 
      dischargeDate,
      primaryDiagnosis,
      secondaryDiagnosis,
      operativeProcedure,
      dischargeVitals,
      investigationHighlights,
      conditionAtDischarge,
      dietaryAdvice,
      emergencyWarningSigns
    } = dischargeForm;
    if (!patientId) {
      toast.error('Please select an active inpatient to discharge');
      return;
    }

    const outstandingDues = checkPatientDues(patientId);
    if (outstandingDues > 0 && !bypassDues) {
      toast.error(`Cannot discharge patient. There are outstanding dues of ${formatCurrency(outstandingDues)}. Please clear all bills first or check the Bypass box.`);
      return;
    }

    const bed = beds.find(b => b.patient_id === patientId || b.patientId === patientId);

    const activeAdmission = admissions.find(
      a => (a.patient_id === patientId || a.patientId === patientId) && a.status === 'Admitted'
    );
    const admissionId = activeAdmission ? activeAdmission.id : 'adm-' + Date.now();

    // Use selected discharge date or fallback to current date
    const finalDischargeDate = dischargeDate ? new Date(dischargeDate).toISOString() : new Date().toISOString();

    if (activeAdmission) {
      await supabaseService.dischargePatient(activeAdmission.id, finalDischargeDate);
    }

    // Update patient status to Discharged in Supabase and local cache
    await supabaseService.updatePatient(patientId, { status: 'Discharged' });

    // Update local patient state
    setPatients(patients.map(p => p.id === patientId ? { ...p, status: 'Discharged' } : p));

    let updatedBed = null;
    if (bed) {
      updatedBed = await supabaseService.updateBedStatus(bed.id, 'Available', null);
    }

    const patientAdmission = admissions.find(a => (a.patient_id === patientId || a.patientId === patientId));
    const admissionDateVal = activeAdmission?.admission_date || activeAdmission?.admissionDate || activeAdmission?.created_at || patientAdmission?.admission_date || patientAdmission?.admissionDate || patientAdmission?.created_at || new Date().toISOString();

    const summaryData = {
      id: 'sum-' + Date.now(),
      admissionId: admissionId,
      patientId: patientId,
      dischargeType,
      followUpDate,
      medications,
      clinicalSummary,
      dischargeDate: finalDischargeDate,
      dischargeBy: dischargeForm.dischargeBy || currentUser?.name || 'Dr. Rajesh Sharma',
      admissionDate: admissionDateVal,
      primaryDiagnosis,
      secondaryDiagnosis,
      operativeProcedure,
      dischargeVitals,
      investigationHighlights,
      conditionAtDischarge,
      dietaryAdvice,
      emergencyWarningSigns
    };

    const savedSummary = await supabaseService.createDischargeSummary(summaryData);
    if (savedSummary) {
      setDischargeSummaries([savedSummary, ...dischargeSummaries]);
    } else {
      const savedSummaries = localStorage.getItem('hms_discharge_summaries');
      const summariesList = savedSummaries ? JSON.parse(savedSummaries) : [];
      const updatedList = [summaryData, ...summariesList];
      localStorage.setItem('hms_discharge_summaries', JSON.stringify(updatedList));
      setDischargeSummaries(updatedList);
    }

    if (bed) {
      if (updatedBed) {
        setBeds(beds.map(b => b.id === bed.id ? updatedBed : b));
      } else {
        setBeds(beds.map(b => b.id === bed.id ? { ...b, status: 'Available', patient_id: null, patientId: null } : b));
      }
    }

    const updatedAdmissions = await supabaseService.getAdmissions();
    if (updatedAdmissions) {
      setAdmissions(updatedAdmissions);
    } else {
      const list = storage.get('hms_admissions', []);
      const updated = list.map((item: any) => {
        if (item.id === admissionId) {
          return { ...item, status: 'Discharged', discharge_date: finalDischargeDate };
        }
        return item;
      });
      storage.set('hms_admissions', updated);
      setAdmissions(updated);
    }

    toast.success('Patient discharged and summary saved!');
    logAudit('Discharge Patient', patientId, summaryData);

    setDischargedSummaryToShow(summaryData);
    setIsSummaryDetailsOpen(true);

    setDischargeForm({
      patientId: '',
      dischargeType: 'Routine / Improved',
      followUpDate: '',
      medications: '',
      clinicalSummary: '',
      dischargeDate: new Date().toISOString().substring(0, 10),
      dischargeBy: '',
      primaryDiagnosis: '',
      secondaryDiagnosis: '',
      operativeProcedure: '',
      dischargeVitals: '',
      investigationHighlights: '',
      conditionAtDischarge: 'Hemodynamically Stable, Afebrile, Ambulatory',
      dietaryAdvice: 'Soft, nutritious diet. Hydrate well (2.5-3L water/day). Avoid spicy & deep-fried foods.',
      emergencyWarningSigns: 'High fever (>101°F), severe abdominal pain, persistent vomiting, shortness of breath, or surgical site redness/discharge.'
    });
    setDischargeSearchTerm('');
    setBypassDues(false);
  };

  const printDischargeSummary = (summary: any) => {
    if (!summary) return;
    const pat = patients.find(p => p.id === (summary.patient_id || summary.patientId)) || MOCK_PATIENTS.find(p => p.id === (summary.patient_id || summary.patientId));
    const rawHospitalInfo = storage.get(STORAGE_KEYS.HOSPITAL_INFO, null);
    const hospitalName = rawHospitalInfo?.name || 'NEW GASTRO PLUS HOSPITAL';
    const hospitalSubHeader = rawHospitalInfo?.address || 'Healthcare Center';
    const hospitalPhone = rawHospitalInfo?.phone || '+91 98765 43210';
    const hospitalEmail = rawHospitalInfo?.email || 'contact@gastroplushospital.com';
    const hospitalLogo = rawHospitalInfo?.logo || localStorage.getItem('hms_hospital_logo') || '';

    const primaryDiag = summary.primaryDiagnosis || summary.primary_diagnosis || '';
    const secondaryDiag = summary.secondaryDiagnosis || summary.secondary_diagnosis || '';
    const opProc = summary.operativeProcedure || summary.operative_procedure || '';
    const vitalsVal = summary.dischargeVitals || summary.discharge_vitals || '';
    const labVal = summary.investigationHighlights || summary.investigation_highlights || '';
    const clinSummaryVal = summary.clinicalSummary || summary.clinical_summary || '';
    const condAtDis = summary.conditionAtDischarge || summary.condition_at_discharge || '';
    const dietAdviceVal = summary.dietaryAdvice || summary.dietary_advice || '';
    const warningSignsVal = summary.emergencyWarningSigns || summary.emergency_warning_signs || '';
    const doctorByVal = summary.dischargeBy || summary.discharge_by || 'Duty Consultant Doctor';

    // In secure iframe contexts, window.open is blocked or fails. 
    // We create a hidden iframe in the same document context to perform printing reliably.
    const iframeId = 'discharge-print-iframe-temp';
    let iframe = document.getElementById(iframeId) as HTMLIFrameElement;
    if (iframe) {
      document.body.removeChild(iframe);
    }
    
    iframe = document.createElement('iframe') as HTMLIFrameElement;
    iframe.id = iframeId;
    iframe.style.position = 'fixed';
    iframe.style.bottom = '0';
    iframe.style.right = '0';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    iframe.style.margin = '0';
    iframe.style.padding = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    
    document.body.appendChild(iframe);
    
    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!iframeDoc) {
      toast.error('Unable to initialize printing container');
      return;
    }

    const medsList = summary.medications
      ? summary.medications.split('\n').filter((m: string) => m.trim().length > 0).map((m: string) => `<li>${m}</li>`).join('')
      : '<li>No home medications prescribed</li>';

    const safeDischargeDate = summary.dischargeDate 
      ? new Date(summary.dischargeDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const safeFollowUpDate = (summary.followUpDate || summary.follow_up_date)
      ? new Date(summary.followUpDate || summary.follow_up_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : 'As advised / SOS';

    const patientAdmission = admissions.find((a: any) => a.patient_id === pat?.id || a.patientId === pat?.id);
    const safeAdmissionDate = summary.admissionDate || summary.admission_date || patientAdmission?.admission_date || patientAdmission?.admissionDate || patientAdmission?.created_at || summary.created_at || new Date().toISOString();
    const formattedAdmissionDate = new Date(safeAdmissionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const bed = beds.find(b => b.patient_id === pat?.id || b.patientId === pat?.id);
    const bedInfoText = bed ? `Bed ${bed.bed_number || bed.number} (${bed.ward})` : (patientAdmission?.ward || 'General Ward');

    const chkList = patientChecklists[pat?.id || ''] || {};
    const accountsClearedLocal = chkList.accountsCleared || false;
    const accountsAuditorLocal = chkList.accountsName || 'Finance Auditor';
    const doctorClearedLocal = chkList.doctorCleared || false;
    const doctorSignLocal = chkList.doctorName || doctorByVal || 'Primary MD';

    const isLama = String(summary.dischargeType || summary.discharge_type || '').toUpperCase().includes('LAMA');
    const isDeceased = String(summary.dischargeType || summary.discharge_type || '').toUpperCase().includes('DECEASED');

    const lamaReason = summary.lamaReason || summary.lama_reason || '';
    const riskExplained = summary.riskExplained || summary.risk_explained || '';
    const witnessName = summary.witnessName || summary.witness_name || '';
    const relativeName = summary.relativeName || summary.relative_name || '';
    const relativeContact = summary.relativeContact || summary.relative_contact || '';

    const timeOfDeath = summary.timeOfDeath || summary.time_of_death || '';
    const causeOfDeathDirect = summary.causeOfDeathDirect || summary.cause_of_death_direct || '';
    const causeOfDeathAntecedent = summary.causeOfDeathAntecedent || summary.cause_of_death_antecedent || '';
    const causeOfDeathUnderlying = summary.causeOfDeathUnderlying || summary.cause_of_death_underlying || '';
    const deathCertNo = summary.deathCertNo || summary.death_cert_no || '';
    const bodyHandedOverTo = summary.bodyHandedOverTo || summary.body_handed_over_to || '';
    const mlcStatus = summary.mlcStatus || summary.mlc_status || '';

    const summaryHtml = `
      <html>
        <head>
          <title>Discharge Summary - ${pat?.name || 'Patient'}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            body { 
              font-family: 'Inter', sans-serif; 
              margin: 30px; 
              padding: 0;
              color: #0f172a;
              font-size: 12px;
            }
            .hospital-banner { 
              border-bottom: 3px double #0d9488; 
              padding-bottom: 12px; 
              margin-bottom: 18px; 
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 16px;
              text-align: left;
            }
            .hospital-logo {
              max-height: 55px;
              max-width: 130px;
              object-fit: contain;
            }
            .hospital-name {
              font-size: 22px;
              font-weight: 800;
              color: #0d9488;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .hospital-sub {
              font-size: 11px;
              color: #64748b;
              margin-top: 2px;
            }
            .doc-title { 
              text-align: center; 
              font-size: 15px; 
              font-weight: 800; 
              margin-bottom: 18px; 
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #0f172a;
              border: 1px solid #cbd5e1;
              background-color: #f8fafc;
              padding: 6px;
            }
            .grid-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 18px;
            }
            .grid-table td {
              padding: 6px 10px;
              border: 1px solid #cbd5e1;
              font-size: 11px;
              width: 25%;
            }
            .grid-table td.label {
              font-weight: 700;
              background-color: #f1f5f9;
              color: #334155;
            }
            .section {
              margin-bottom: 16px;
            }
            .section-title {
              font-size: 11px;
              font-weight: 800;
              color: #0d9488;
              border-bottom: 1.5px solid #0d9488;
              padding-bottom: 3px;
              margin-bottom: 8px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .section-content {
              font-size: 11px;
              line-height: 1.6;
              color: #334155;
              white-space: pre-line;
            }
            .meds-list {
              margin: 0;
              padding-left: 20px;
              font-size: 11px;
              line-height: 1.6;
              color: #334155;
            }
            .meds-list li {
              margin-bottom: 4px;
            }
            .red-flag-box {
              background-color: #fff1f2;
              border: 1px solid #fecdd3;
              padding: 10px 12px;
              border-radius: 6px;
              margin-top: 14px;
            }
            .red-flag-title {
              font-size: 11px;
              font-weight: 800;
              color: #9f1239;
              text-transform: uppercase;
              margin-bottom: 4px;
            }
            .footer-sign {
              margin-top: 45px;
              display: flex;
              justify-content: space-between;
              font-size: 11px;
            }
            .sig-box {
              text-align: center;
              width: 180px;
            }
            .sig-line {
              border-top: 1px solid #64748b;
              margin-top: 35px;
              padding-top: 4px;
              font-weight: 600;
              color: #334155;
            }
            @media print {
              body { margin: 15px; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="hospital-banner">
            ${hospitalLogo ? `<img src="${hospitalLogo}" class="hospital-logo" alt="Logo" />` : ''}
            <div>
              <div class="hospital-name">${hospitalName}</div>
              <div class="hospital-sub">
                ${hospitalSubHeader} | Tel: ${hospitalPhone} | Email: ${hospitalEmail}
              </div>
            </div>
          </div>
          
          <div class="doc-title">Inpatient Clinical Discharge Summary</div>
          
          <table class="grid-table">
            <tr>
              <td class="label">Patient Name</td>
              <td style="font-weight: 700;">${pat?.name || 'Walk-in'}</td>
              <td class="label">MRN / IPD No</td>
              <td style="font-family: monospace; font-weight: 700;">${pat?.mrn || 'N/A'}</td>
            </tr>
            <tr>
              <td class="label">Age / Gender</td>
              <td>${pat?.age ? `${pat.age} Yrs` : 'N/A'} / ${pat?.gender || 'N/A'}</td>
              <td class="label">Contact Phone</td>
              <td>${pat?.phone || 'N/A'}</td>
            </tr>
            <tr>
              <td class="label">Ward & Bed No.</td>
              <td>${bedInfoText}</td>
              <td class="label">Case Type / Status</td>
              <td>${pat?.is_insurance ? 'TPA / Insurance' : 'General / Private'}</td>
            </tr>
            <tr>
              <td class="label">Admission Date</td>
              <td>${formattedAdmissionDate}</td>
              <td class="label">Discharge Date</td>
              <td>${safeDischargeDate}</td>
            </tr>
            <tr>
              <td class="label">Discharge Disposition</td>
              <td style="font-weight: 700; color: #b91c1c;">${summary.dischargeType || summary.discharge_type || 'Routine / Improved'}</td>
              <td class="label">Follow-Up Clinic Date</td>
              <td style="font-weight: 700; color: #0d9488;">${safeFollowUpDate}</td>
            </tr>
            <tr>
              <td class="label">Attending Doctor</td>
              <td colspan="3" style="font-weight: 700;">${doctorByVal}</td>
            </tr>
            <tr>
              <td class="label">Accounts Clearance</td>
              <td style="font-weight: 700; color: ${accountsClearedLocal ? '#059669' : '#dc2626'};">
                ${accountsClearedLocal ? `✓ CLEAR (${accountsAuditorLocal})` : '✓ CLEAR FOR DISCHARGE'}
              </td>
              <td class="label">Clinical Sign-Off</td>
              <td style="font-weight: 700; color: ${doctorClearedLocal ? '#059669' : '#dc2626'};">
                ${doctorClearedLocal ? `✓ APPROVED (${doctorSignLocal})` : '✓ SIGNED BY MD'}
              </td>
            </tr>
          </table>

          ${(primaryDiag || secondaryDiag || opProc) ? `
            <div class="section">
              <div class="section-title">Clinical Diagnosis & Case History</div>
              <div class="section-content">
                ${primaryDiag ? `<strong>Primary Diagnosis:</strong> ${primaryDiag}<br/>` : ''}
                ${secondaryDiag ? `<strong>Secondary Diagnosis / Co-morbidities:</strong> ${secondaryDiag}<br/>` : ''}
                ${opProc ? `<strong>Operative / Surgical Details:</strong> ${opProc}` : ''}
              </div>
            </div>
          ` : ''}

          ${(vitalsVal || labVal) ? `
            <div class="section">
              <div class="section-title">Discharge Vitals & Diagnostic Highlights</div>
              <div class="section-content">
                ${vitalsVal ? `<strong>Vital Parameters at Discharge:</strong> ${vitalsVal}<br/>` : ''}
                ${labVal ? `<strong>Key Lab & Radiology Findings:</strong> ${labVal}` : ''}
              </div>
            </div>
          ` : ''}

          ${(isLama || lamaReason || riskExplained) ? `
            <div class="section" style="background-color: #fff7ed; border: 1px solid #ffedd5; padding: 10px; border-radius: 6px;">
              <div class="section-title" style="color: #c2410c; border-bottom-color: #c2410c;">Left Against Medical Advice (LAMA) Record</div>
              <div class="section-content" style="color: #9a3412;">
                ${lamaReason ? `<strong>LAMA Reason:</strong> ${lamaReason}<br/>` : ''}
                ${riskExplained ? `<strong>Risks Explained:</strong> ${riskExplained}<br/>` : ''}
                ${relativeName ? `<strong>Relative / Informant:</strong> ${relativeName} (${relativeContact || 'N/A'})<br/>` : ''}
                ${witnessName ? `<strong>Hospital Witness:</strong> ${witnessName}<br/>` : ''}
                ${mlcStatus ? `<strong>MLC Record Status:</strong> ${mlcStatus}` : ''}
              </div>
            </div>
          ` : ''}

          ${(isDeceased || timeOfDeath || causeOfDeathDirect) ? `
            <div class="section" style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px;">
              <div class="section-title" style="color: #334155; border-bottom-color: #334155;">Mortality Details / Death Summary</div>
              <div class="section-content" style="color: #1e293b;">
                ${timeOfDeath ? `<strong>Time of Death:</strong> ${timeOfDeath}<br/>` : ''}
                ${causeOfDeathDirect ? `<strong>Direct Cause of Death:</strong> ${causeOfDeathDirect}<br/>` : ''}
                ${causeOfDeathAntecedent ? `<strong>Antecedent Cause:</strong> ${causeOfDeathAntecedent}<br/>` : ''}
                ${causeOfDeathUnderlying ? `<strong>Underlying Cause:</strong> ${causeOfDeathUnderlying}<br/>` : ''}
                ${deathCertNo ? `<strong>Death Certificate No.:</strong> ${deathCertNo}<br/>` : ''}
                ${bodyHandedOverTo ? `<strong>Body Handed Over To:</strong> ${bodyHandedOverTo}<br/>` : ''}
                ${mlcStatus ? `<strong>MLC Status:</strong> ${mlcStatus}` : ''}
              </div>
            </div>
          ` : ''}

          <div class="section">
            <div class="section-title">Hospital Course & Treatment Progress</div>
            <div class="section-content">${clinSummaryVal || 'Patient admitted and treated as per standard clinical protocol. Significant symptomatic improvement observed.'}</div>
          </div>

          <div class="section">
            <div class="section-title">Condition at Discharge</div>
            <div class="section-content" style="font-weight: 600; color: #047857;">
              ${condAtDis || 'Hemodynamically stable, afebrile, active and ambulatory. Fit to discharge home.'}
            </div>
          </div>

          <div class="section">
            <div class="section-title">Discharge Prescription & Take-Home Medications</div>
            <ul class="meds-list">
              ${medsList}
            </ul>
          </div>

          ${dietAdviceVal ? `
            <div class="section">
              <div class="section-title">Dietary, Rest & Physical Activity Instructions</div>
              <div class="section-content">${dietAdviceVal}</div>
            </div>
          ` : ''}

          <div class="red-flag-box">
            <div class="red-flag-title">⚠️ Warning Signs & When to Return Immediately</div>
            <div class="section-content" style="color: #881337; font-size: 10.5px;">
              ${warningSignsVal || 'Contact hospital emergency immediately if patient experiences: High-grade fever (>101°F), sudden difficulty breathing, severe chest tightness, persistent vomiting, or wound bleeding/redness.'}
            </div>
          </div>

          <div class="footer-sign">
            <div class="sig-box">
              <div class="sig-line">Prepared / Verified By</div>
            </div>
            <div class="sig-box">
              <div class="sig-line">Patient / Relative Acknowledgment</div>
            </div>
            <div class="sig-box">
              <div class="sig-line">Attending Consultant Signature</div>
            </div>
          </div>

          <script>
            window.onload = () => {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    iframeDoc.write(summaryHtml);
    iframeDoc.close();

    // Trigger printing
    setTimeout(() => {
      if (iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        
        // Remove the temporary iframe after print dialogue runs
        setTimeout(() => {
          if (document.getElementById(iframeId)) {
            document.body.removeChild(iframe);
          }
        }, 3000);
      }
    }, 500);
  };

  const printDischargeCard = (summary: any) => {
    if (!summary) return;
    const pat = patients.find(p => p.id === (summary.patient_id || summary.patientId)) || MOCK_PATIENTS.find(p => p.id === (summary.patient_id || summary.patientId));
    const rawHospitalInfo = storage.get(STORAGE_KEYS.HOSPITAL_INFO, null);
    const hospitalName = rawHospitalInfo?.name || 'NEW GASTRO PLUS HOSPITAL';
    const hospitalSubHeader = rawHospitalInfo?.address || 'Healthcare Center';
    const hospitalPhone = rawHospitalInfo?.phone || '+91 98765 43210';
    const hospitalEmail = rawHospitalInfo?.email || 'contact@gastroplushospital.com';

    const primaryDiag = summary.primaryDiagnosis || summary.primary_diagnosis || '';
    const secondaryDiag = summary.secondaryDiagnosis || summary.secondary_diagnosis || '';
    const opProc = summary.operativeProcedure || summary.operative_procedure || '';
    const vitalsVal = summary.dischargeVitals || summary.discharge_vitals || '';
    const labVal = summary.investigationHighlights || summary.investigation_highlights || '';
    const clinSummaryVal = summary.clinicalSummary || summary.clinical_summary || '';
    const condAtDis = summary.conditionAtDischarge || summary.condition_at_discharge || '';
    const dietAdviceVal = summary.dietaryAdvice || summary.dietary_advice || '';
    const warningSignsVal = summary.emergencyWarningSigns || summary.emergency_warning_signs || '';
    const doctorByVal = summary.dischargeBy || summary.discharge_by || 'Duty Consultant Doctor';

    // Temporary iframe for printing
    const iframeId = 'discharge-card-iframe-temp';
    let iframe = document.getElementById(iframeId) as HTMLIFrameElement;
    if (iframe) {
      document.body.removeChild(iframe);
    }
    
    iframe = document.createElement('iframe') as HTMLIFrameElement;
    iframe.id = iframeId;
    iframe.style.position = 'fixed';
    iframe.style.bottom = '0';
    iframe.style.right = '0';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    iframe.style.margin = '0';
    iframe.style.padding = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    
    document.body.appendChild(iframe);
    
    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!iframeDoc) {
      toast.error('Unable to initialize printing container');
      return;
    }

    const medsList = summary.medications
      ? summary.medications.split('\n').filter((m: string) => m.trim().length > 0).map((m: string) => `<li>${m}</li>`).join('')
      : '<li>No home medications prescribed</li>';

    const safeDischargeDate = summary.dischargeDate 
      ? new Date(summary.dischargeDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const safeFollowUpDate = (summary.followUpDate || summary.follow_up_date)
      ? new Date(summary.followUpDate || summary.follow_up_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : 'As advised / SOS';

    const patientAdmission = admissions.find((a: any) => a.patient_id === pat?.id || a.patientId === pat?.id);
    const safeAdmissionDate = summary.admissionDate || summary.admission_date || patientAdmission?.admission_date || patientAdmission?.admissionDate || patientAdmission?.created_at || summary.created_at || new Date().toISOString();
    const formattedAdmissionDate = new Date(safeAdmissionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const caseClassification = patientAdmission?.case_type || 'General';

    const cardHtml = `
      <html>
        <head>
          <title>Discharge Card - ${pat?.name || 'Patient'}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            body { 
              font-family: 'Inter', sans-serif; 
              margin: 20px; 
              padding: 0;
              color: #1e293b;
              background-color: #ffffff;
            }
            .card-border {
              border: 3px double #0284c7;
              padding: 20px;
              border-radius: 8px;
              max-width: 650px;
              margin: 0 auto;
            }
            .hospital-banner { 
              border-bottom: 2px solid #0284c7; 
              padding-bottom: 8px; 
              margin-bottom: 15px; 
              text-align: center;
            }
            .hospital-name {
              font-size: 18px;
              font-weight: 800;
              color: #0284c7;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .hospital-sub {
              font-size: 10px;
              color: #64748b;
              margin-top: 2px;
            }
            .card-title-badge { 
              text-align: center; 
              font-size: 13px; 
              font-weight: 800; 
              margin-bottom: 15px; 
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #ffffff;
              background-color: #0284c7;
              padding: 4px 10px;
              border-radius: 4px;
              display: inline-block;
              margin-left: auto;
              margin-right: auto;
            }
            .badge-wrapper {
              text-align: center;
              margin-bottom: 15px;
            }
            .grid-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 15px;
            }
            .grid-table td {
              padding: 6px 10px;
              border: 1px solid #cbd5e1;
              font-size: 11px;
            }
            .grid-table td.label {
              font-weight: 700;
              background-color: #f1f5f9;
              color: #334155;
              width: 25%;
            }
            .section-title {
              font-size: 11px;
              font-weight: 800;
              color: #0284c7;
              border-bottom: 1px solid #0284c7;
              padding-bottom: 2px;
              margin-bottom: 8px;
              text-transform: uppercase;
            }
            .section-content {
              font-size: 11px;
              line-height: 1.5;
              color: #1e293b;
              margin-bottom: 12px;
            }
            .meds-list {
              margin: 0;
              padding-left: 15px;
              font-size: 11px;
              line-height: 1.5;
              color: #1e293b;
              margin-bottom: 12px;
            }
            .meds-list li {
              margin-bottom: 4px;
            }
            .footer-sign {
              margin-top: 30px;
              display: flex;
              justify-content: space-between;
              font-size: 10px;
            }
            .sig-box {
              text-align: center;
              width: 180px;
            }
            .sig-line {
              border-top: 1px solid #cbd5e1;
              margin-top: 30px;
              padding-top: 4px;
              font-weight: 600;
              color: #475569;
            }
            @media print {
              body { margin: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="card-border">
            <div class="hospital-banner">
              <div class="hospital-name">${hospitalName}</div>
              <div class="hospital-sub">
                ${hospitalSubHeader} | Tel: ${hospitalPhone}
              </div>
            </div>
            
            <div class="badge-wrapper">
              <div class="card-title-badge">Patient Discharge Card</div>
            </div>
            
            <table class="grid-table">
              <tr>
                <td class="label">Patient Name</td>
                <td style="font-weight: 700;">${pat?.name || 'Walk-in'}</td>
                <td class="label">MRN / ID</td>
                <td>${pat?.mrn || 'N/A'}</td>
              </tr>
              <tr>
                <td class="label">Age / Gender</td>
                <td>${pat?.age ? `${pat.age} Yrs` : 'N/A'} / ${pat?.gender || 'N/A'}</td>
                <td class="label">Contact No.</td>
                <td>${pat?.phone || 'N/A'}</td>
              </tr>
              <tr>
                <td class="label">Admission Date</td>
                <td>${formattedAdmissionDate}</td>
                <td class="label">Discharge Date</td>
                <td>${safeDischargeDate}</td>
              </tr>
              <tr>
                <td class="label">Discharge Status</td>
                <td style="font-weight: 700; color: #b91c1c;">${summary.dischargeType || summary.discharge_type || 'Routine / Improved'}</td>
                <td class="label">Case Class</td>
                <td style="font-weight: 700; color: ${caseClassification !== 'General' ? '#dc2626' : '#1e293b'};">
                  ${caseClassification === 'General' ? 'General Case' : caseClassification}
                </td>
              </tr>
              <tr>
                <td class="label">Follow-up SOS</td>
                <td>${safeFollowUpDate}</td>
                <td class="label">Attending MD</td>
                <td>${doctorByVal}</td>
              </tr>
            </table>

            ${(primaryDiag || secondaryDiag || opProc) ? `
              <div class="section-title">Clinical Diagnosis & Surgery</div>
              <div class="section-content">
                ${primaryDiag ? `<strong>Primary Diagnosis:</strong> ${primaryDiag}<br/>` : ''}
                ${secondaryDiag ? `<strong>Secondary Diagnosis:</strong> ${secondaryDiag}<br/>` : ''}
                ${opProc ? `<strong>Procedure:</strong> ${opProc}` : ''}
              </div>
            ` : ''}

            ${(vitalsVal || labVal) ? `
              <div class="section-title">Discharge Vitals & Lab Highlights</div>
              <div class="section-content">
                ${vitalsVal ? `<strong>Vitals:</strong> ${vitalsVal}<br/>` : ''}
                ${labVal ? `<strong>Lab Highlights:</strong> ${labVal}` : ''}
              </div>
            ` : ''}

            <div class="section-title">Final Diagnosis / Treatment Summary</div>
            <div class="section-content">${clinSummaryVal || 'Discharged in stable clinical conditions. Continue home medications exactly as directed.'}</div>

            ${condAtDis ? `
              <div class="section-title">Condition at Discharge</div>
              <div class="section-content">${condAtDis}</div>
            ` : ''}

            <div class="section-title">Discharge Prescription / Home Meds</div>
            <ul class="meds-list">
              ${medsList}
            </ul>

            ${dietAdviceVal ? `
              <div class="section-title">Dietary & Activity Advice</div>
              <div class="section-content">${dietAdviceVal}</div>
            ` : ''}

            ${warningSignsVal ? `
              <div class="section-title" style="color: #9f1239;">Warning Signs / Emergency Return</div>
              <div class="section-content" style="color: #9f1239;">${warningSignsVal}</div>
            ` : ''}

            <div class="footer-sign">
              <div class="sig-box">
                <div class="sig-line">Prepared / Nursing Staff</div>
              </div>
              <div class="sig-box">
                <div class="sig-line">Consultant Sign-off</div>
              </div>
            </div>
          </div>

          <script>
            window.onload = () => {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    iframeDoc.write(cardHtml);
    iframeDoc.close();

    setTimeout(() => {
      if (iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        
        setTimeout(() => {
          if (document.getElementById(iframeId)) {
            document.body.removeChild(iframe);
          }
        }, 3000);
      }
    }, 500);
  };

  const printLamaWaiver = (summary: any) => {
    if (!summary) return;
    const pat = patients.find(p => p.id === (summary.patient_id || summary.patientId)) || MOCK_PATIENTS.find(p => p.id === (summary.patient_id || summary.patientId));
    const rawHospitalInfo = storage.get(STORAGE_KEYS.HOSPITAL_INFO, null);
    const hospitalName = rawHospitalInfo?.name || 'NEW GASTRO PLUS HOSPITAL';
    const hospitalSubHeader = rawHospitalInfo?.address || 'Healthcare Center';
    const hospitalPhone = rawHospitalInfo?.phone || '+91 98765 43210';

    const iframeId = 'lama-waiver-iframe-temp';
    let iframe = document.getElementById(iframeId) as HTMLIFrameElement;
    if (iframe) document.body.removeChild(iframe);
    
    iframe = document.createElement('iframe') as HTMLIFrameElement;
    iframe.id = iframeId;
    iframe.style.position = 'fixed';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    iframe.style.opacity = '0';
    document.body.appendChild(iframe);
    
    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!iframeDoc) return;

    const waiverHtml = `
      <html>
        <head>
          <title>LAMA High-Risk Waiver - ${pat?.name || 'Patient'}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            body { font-family: 'Inter', sans-serif; margin: 35px; color: #0f172a; line-height: 1.5; }
            .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px; }
            .title { font-size: 15px; font-weight: 800; text-transform: uppercase; color: #be123c; border: 2px solid #fecdd3; background: #fff1f2; padding: 8px; margin-bottom: 20px; text-align: center; }
            .grid { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .grid td { border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 11px; }
            .grid td.lbl { font-weight: 700; background: #f8fafc; color: #475569; width: 25%; }
            .clause { font-size: 11px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; margin-bottom: 20px; text-align: justify; }
            .sig-grid { margin-top: 50px; display: flex; justify-content: space-between; font-size: 11px; }
            .sig-box { width: 30%; text-align: center; border-top: 1px solid #94a3b8; padding-top: 6px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2 style="margin:0; color:#0f172a; font-size: 20px;">${hospitalName}</h2>
            <p style="margin:2px; font-size:11px; color:#64748b;">${hospitalSubHeader} | Ph: ${hospitalPhone}</p>
          </div>
          <div class="title">INFORMED REFUSAL & HIGH-RISK LAMA RELEASE DECLARATION</div>
          <table class="grid">
            <tr>
              <td class="lbl">Patient Name</td><td><strong>${pat?.name || 'Unknown'}</strong></td>
              <td class="lbl">MRN / IP No.</td><td>${pat?.mrn || 'N/A'}</td>
            </tr>
            <tr>
              <td class="lbl">Age / Gender</td><td>${pat?.age || 'N/A'} Yrs / ${pat?.gender || 'N/A'}</td>
              <td class="lbl">Discharging Clinician</td><td>${summary.dischargeBy || 'Duty Consultant'}</td>
            </tr>
            <tr>
              <td class="lbl">Relative / Guardian</td><td>${summary.relativeName || 'Relative/Guardian'}</td>
              <td class="lbl">Contact Phone</td><td>${summary.relativeContact || pat?.phone || 'N/A'}</td>
            </tr>
            <tr>
              <td class="lbl">Date & Time</td><td>${new Date(summary.dischargeDate).toLocaleString('en-IN')}</td>
              <td class="lbl">Status</td><td style="color:#be123c; font-weight:800;">LAMA (Left Against Advice)</td>
            </tr>
          </table>

          <div class="clause">
            <strong style="color:#be123c; font-size:12px; display:block; margin-bottom:6px;">LEGAL WAIVER AND RESPONSIBILITY RELEASE CLAUSE:</strong>
            I/We hereby declare that I/we am/are taking patient <strong>${pat?.name || 'the patient'}</strong> away from <strong>${hospitalName}</strong> against explicit medical advice (LAMA). 
            The attending clinicians have explained in clear, understandable language that stopping treatment and leaving at this juncture carries extreme health risks including <strong>uncontrolled clinical deterioration, organ damage, permanent disability, or DEATH</strong>.
            <br/><br/>
            I/We voluntarily assume full personal and legal responsibility for all consequences resulting from this premature exit. I/we hereby release <strong>${hospitalName}</strong>, its management, consultants, and nursing staff from any liability, claims, or legal actions whatsoever.
          </div>

          <div style="font-size:11px; margin-bottom:15px;">
            <strong>Stated Reason for LAMA:</strong> ${summary.lamaReason || 'Personal preference / request to transfer against advice.'}<br/>
            <strong>High Risks Communicated:</strong> ${summary.riskExplained || 'Sudden cardiac event, severe sepsis, shock, respiratory depression.'}
          </div>

          <div class="sig-grid" style="margin-top:50px;">
            <div class="sig-box">
              <br/>Signature / Thumb impression of Patient / Relative
              <br/><span style="font-size:9px; color:#64748b;">(Name: ${summary.relativeName || 'Relative'})</span>
            </div>
            <div class="sig-box">
              <br/>Witness Signature
              <br/><span style="font-size:9px; color:#64748b;">(Name: ${summary.witnessName || 'Hospital Witness'})</span>
            </div>
            <div class="sig-box">
              <br/>Attending Clinician / Duty Doctor
              <br/><span style="font-size:9px; color:#64748b;">(Sign & Stamp)</span>
            </div>
          </div>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `;
    iframeDoc.write(waiverHtml);
    iframeDoc.close();
    setTimeout(() => {
      if (iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => { if (document.getElementById(iframeId)) document.body.removeChild(iframe); }, 3000);
      }
    }, 500);
  };

  const printDeathCertificate = (summary: any) => {
    if (!summary) return;
    const pat = patients.find(p => p.id === (summary.patient_id || summary.patientId)) || MOCK_PATIENTS.find(p => p.id === (summary.patient_id || summary.patientId));
    const rawHospitalInfo = storage.get(STORAGE_KEYS.HOSPITAL_INFO, null);
    const hospitalName = rawHospitalInfo?.name || 'NEW GASTRO PLUS HOSPITAL';
    const hospitalSubHeader = rawHospitalInfo?.address || 'Healthcare Center';
    const hospitalPhone = rawHospitalInfo?.phone || '+91 98765 43210';

    const iframeId = 'death-cert-iframe-temp';
    let iframe = document.getElementById(iframeId) as HTMLIFrameElement;
    if (iframe) document.body.removeChild(iframe);
    
    iframe = document.createElement('iframe') as HTMLIFrameElement;
    iframe.id = iframeId;
    iframe.style.position = 'fixed';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    iframe.style.opacity = '0';
    document.body.appendChild(iframe);
    
    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!iframeDoc) return;

    const deathHtml = `
      <html>
        <head>
          <title>Medical Certificate of Cause of Death - ${pat?.name || 'Deceased'}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            body { font-family: 'Inter', sans-serif; margin: 35px; color: #0f172a; line-height: 1.4; }
            .header { text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 8px; margin-bottom: 15px; }
            .cert-no { text-align: right; font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 10px; font-family: monospace; }
            .title { font-size: 15px; font-weight: 800; text-transform: uppercase; color: #0f172a; border: 1px solid #94a3b8; background: #f8fafc; padding: 6px; margin-bottom: 15px; text-align: center; letter-spacing: 0.5px; }
            .grid { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            .grid td { border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 11px; }
            .grid td.lbl { font-weight: 700; background: #f1f5f9; color: #334155; width: 25%; }
            .cause-box { border: 1px solid #cbd5e1; padding: 12px; border-radius: 4px; margin-bottom: 15px; font-size: 11px; }
            .cause-title { font-weight: 800; color: #0284c7; text-transform: uppercase; font-size: 11px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px; }
            .sig-grid { margin-top: 50px; display: flex; justify-content: space-between; font-size: 11px; }
            .sig-box { width: 45%; text-align: center; border-top: 1px solid #94a3b8; padding-top: 6px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2 style="margin:0; color:#0284c7; font-size: 20px;">${hospitalName}</h2>
            <p style="margin:2px; font-size:11px; color:#64748b;">${hospitalSubHeader} | Ph: ${hospitalPhone}</p>
          </div>
          <div class="cert-no">Certificate No: ${summary.deathCertNo || 'MCCD/2026/0842'}</div>
          <div class="title">MEDICAL CERTIFICATE OF CAUSE OF DEATH (MCCD - FORM 4/4A)</div>
          
          <table class="grid">
            <tr>
              <td class="lbl">Deceased Full Name</td><td><strong>${pat?.name || 'Unknown'}</strong></td>
              <td class="lbl">MRN / Hospital ID</td><td>${pat?.mrn || 'N/A'}</td>
            </tr>
            <tr>
              <td class="lbl">Age / Sex</td><td>${pat?.age || 'N/A'} Yrs / ${pat?.gender || 'N/A'}</td>
              <td class="lbl">Attending Physician</td><td>${summary.dischargeBy || 'Duty Medical Officer'}</td>
            </tr>
            <tr>
              <td class="lbl">Date of Death</td><td><strong>${new Date(summary.dischargeDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></td>
              <td class="lbl">Exact Time of Death</td><td><strong>${summary.timeOfDeath || '04:15 AM'}</strong></td>
            </tr>
            <tr>
              <td class="lbl">MLC / Legal Status</td><td>${summary.mlcStatus || 'Non-MLC / Natural Death'}</td>
              <td class="lbl">Body Handed Over To</td><td>${summary.bodyHandedOverTo || 'Next of Kin / Relative'}</td>
            </tr>
          </table>

          <div class="cause-box">
            <div class="cause-title">Part I: Clinical Sequence & Direct Cause of Death</div>
            <p style="margin: 4px 0;"><strong>(a) Immediate Cause:</strong> ${summary.causeOfDeathDirect || summary.clinicalSummary || 'Cardiopulmonary Arrest'}</p>
            <p style="margin: 4px 0;"><strong>(b) Antecedent Cause:</strong> ${summary.causeOfDeathAntecedent || 'Refractory Septic Shock / Respiratory Failure'}</p>
            <p style="margin: 4px 0;"><strong>(c) Underlying Cause:</strong> ${summary.causeOfDeathUnderlying || 'Multiple Organ Dysfunction Syndrome (MODS)'}</p>
          </div>

          <div class="cause-box">
            <div class="cause-title">Part II: Other Significant Clinical Conditions Contributing to Death</div>
            <p style="margin:4px 0;">${summary.medications || 'Type 2 Diabetes Mellitus, Essential Hypertension, Chronic Kidney Disease'}</p>
          </div>

          <div style="font-size:10px; color:#475569; margin-top:10px; font-style:italic;">
            * I hereby certify that the above statements regarding the cause of death are true to the best of my knowledge based on medical records and clinical attendance during the patient's hospitalization.
          </div>

          <div class="sig-grid">
            <div class="sig-box">
              <br/>Medical Superintendent / Registrar
              <br/><span style="font-size:9px; color:#64748b;">(Hospital Seal & Verification)</span>
            </div>
            <div class="sig-box">
              <br/>Attending Physician / Intensivist
              <br/><span style="font-size:9px; color:#64748b;">(Signature & Medical Council Reg. No.)</span>
            </div>
          </div>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `;
    iframeDoc.write(deathHtml);
    iframeDoc.close();
    setTimeout(() => {
      if (iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => { if (document.getElementById(iframeId)) document.body.removeChild(iframe); }, 3000);
      }
    }, 500);
  };

  const printBodyHandoverSlip = (summary: any) => {
    if (!summary) return;
    const pat = patients.find(p => p.id === (summary.patient_id || summary.patientId)) || MOCK_PATIENTS.find(p => p.id === (summary.patient_id || summary.patientId));
    const rawHospitalInfo = storage.get(STORAGE_KEYS.HOSPITAL_INFO, null);
    const hospitalName = rawHospitalInfo?.name || 'NEW GASTRO PLUS HOSPITAL';
    const hospitalSubHeader = rawHospitalInfo?.address || 'Healthcare Center';

    const iframeId = 'body-handover-iframe-temp';
    let iframe = document.getElementById(iframeId) as HTMLIFrameElement;
    if (iframe) document.body.removeChild(iframe);
    
    iframe = document.createElement('iframe') as HTMLIFrameElement;
    iframe.id = iframeId;
    iframe.style.position = 'fixed';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    iframe.style.opacity = '0';
    document.body.appendChild(iframe);
    
    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!iframeDoc) return;

    const handoverHtml = `
      <html>
        <head>
          <title>Mortuary Body & Belongings Handover Slip - ${pat?.name || 'Deceased'}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            body { font-family: 'Inter', sans-serif; margin: 35px; color: #0f172a; line-height: 1.4; }
            .header { text-align: center; border-bottom: 2px dashed #94a3b8; padding-bottom: 8px; margin-bottom: 15px; }
            .title { font-size: 14px; font-weight: 800; text-transform: uppercase; color: #0f172a; border: 1px solid #cbd5e1; background: #f8fafc; padding: 6px; margin-bottom: 15px; text-align: center; }
            .grid { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            .grid td { border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 11px; }
            .grid td.lbl { font-weight: 700; background: #f1f5f9; color: #334155; width: 25%; }
            .sig-grid { margin-top: 50px; display: flex; justify-content: space-between; font-size: 11px; }
            .sig-box { width: 30%; text-align: center; border-top: 1px solid #94a3b8; padding-top: 6px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2 style="margin:0; color:#0f172a; font-size: 18px;">${hospitalName}</h2>
            <p style="margin:2px; font-size:10px; color:#64748b;">${hospitalSubHeader}</p>
          </div>
          <div class="title">MORTUARY BODY & PERSONAL BELONGINGS HANDOVER RECEIPT</div>
          <table class="grid">
            <tr>
              <td class="lbl">Deceased Patient Name</td><td><strong>${pat?.name || 'Deceased'}</strong></td>
              <td class="lbl">MRN / IPD No.</td><td>${pat?.mrn || 'N/A'}</td>
            </tr>
            <tr>
              <td class="lbl">Date & Time of Death</td><td>${new Date(summary.dischargeDate).toLocaleDateString('en-IN')} @ ${summary.timeOfDeath || '04:15 AM'}</td>
              <td class="lbl">Attending Doctor</td><td>${summary.dischargeBy || 'Duty Doctor'}</td>
            </tr>
            <tr>
              <td class="lbl">Receiver Name</td><td><strong>${summary.bodyHandedOverTo || 'Next of Kin'}</strong></td>
              <td class="lbl">Govt ID Proof Type & No.</td><td>Aadhaar / Voter ID Verified</td>
            </tr>
            <tr>
              <td class="lbl">Handover Date & Time</td><td>${new Date().toLocaleString('en-IN')}</td>
              <td class="lbl">Mortuary / Ward Staff</td><td>Nurse / Security Incharge</td>
            </tr>
          </table>

          <div style="font-size:11px; margin-bottom:15px; padding:10px; border:1px solid #e2e8f0; background:#f8fafc; border-radius:4px;">
            <strong>Personal Belongings Inventory Handed Over:</strong><br/>
            1. Clothes & footwear<br/>
            2. Personal phone & wallet / cash<br/>
            3. Wristwatch / spectacles / ring (if any)<br/>
            <br/>
            <em>I confirm that I have received the mortal remains of the above patient along with all personal belongings in proper condition.</em>
          </div>

          <div class="sig-grid">
            <div class="sig-box">
              <br/>Receiver Relative Signature
              <br/><span style="font-size:9px; color:#64748b;">(Name: ${summary.bodyHandedOverTo || 'Relative'})</span>
            </div>
            <div class="sig-box">
              <br/>Ward Nurse / Mortuary Incharge
              <br/><span style="font-size:9px; color:#64748b;">(Sign & Date)</span>
            </div>
            <div class="sig-box">
              <br/>Hospital Security Officer
              <br/><span style="font-size:9px; color:#64748b;">(Verified Release)</span>
            </div>
          </div>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `;
    iframeDoc.write(handoverHtml);
    iframeDoc.close();
    setTimeout(() => {
      if (iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => { if (document.getElementById(iframeId)) document.body.removeChild(iframe); }, 3000);
      }
    }, 500);
  };

  const printDocHtml = (htmlContent: string, title: string = 'Document') => {
    const iframeId = 'doc-print-iframe-temp';
    let iframe = document.getElementById(iframeId) as HTMLIFrameElement;
    if (iframe) document.body.removeChild(iframe);

    iframe = document.createElement('iframe') as HTMLIFrameElement;
    iframe.id = iframeId;
    iframe.style.position = 'fixed';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    iframe.style.opacity = '0';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!iframeDoc) {
      toast.error('Printing container failed to open');
      return;
    }

    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    setTimeout(() => {
      if (iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => {
          if (document.getElementById(iframeId)) document.body.removeChild(iframe);
        }, 3000);
      }
    }, 500);
  };

  const handlePrintAdmissionSlip = (data?: any) => {
    const slip = data || admissionSlipData;
    if (!slip) return;
    const { admission, patient, bed, doctor } = slip;
    const patName = patient?.name || admission?.name || 'Patient';
    const patMrn = patient?.mrn || admission?.mrn || 'N/A';
    const patAge = patient?.age || 'N/A';
    const patGender = patient?.gender || 'N/A';
    const patPhone = patient?.phone || 'N/A';
    const patBlood = patient?.bloodGroup || patient?.blood_group || 'N/A';
    const ipdId = admission?.id ? `IPD-${String(admission.id).slice(-6).toUpperCase()}` : `IPD-${Date.now().toString().slice(-6)}`;
    const admDate = admission?.admission_date || new Date().toISOString().split('T')[0];
    const admTime = admission?.admission_time || '10:00 AM';
    const wardName = bed?.ward || admission?.ward || 'General Ward';
    const bedNum = bed ? `Bed ${bed.bed_number || bed.number}` : 'Assigned Bed';
    const urgency = admission?.urgency || 'Routine';
    const caseType = admission?.case_type || 'General';
    const docName = doctor?.name || 'Attending Consultant';
    const deptName = doctor?.department || 'Gastroenterology & GI Surgery';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Admission Slip - ${patName}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 10px; color: #0f172a; font-size: 11pt; line-height: 1.4; }
            .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 15px; }
            .h-name { font-size: 20pt; font-weight: 900; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
            .h-addr { font-size: 9pt; font-weight: 600; color: #475569; margin-top: 3px; }
            .title-badge { display: inline-block; background-color: #0f172a; color: #ffffff; padding: 4px 14px; font-size: 10pt; font-weight: 800; border-radius: 4px; margin-top: 8px; text-transform: uppercase; letter-spacing: 1px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
            .box { border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; background-color: #f8fafc; }
            .label { font-size: 8pt; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 2px; }
            .value { font-size: 10.5pt; font-weight: 800; color: #0f172a; }
            .footer { margin-top: 50px; display: flex; justify-content: space-between; text-align: center; font-size: 9pt; }
            .sig-box { border-top: 1px solid #64748b; width: 42%; padding-top: 5px; font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="h-name">GASTRO PLUS HOSPITAL</div>
            <div class="h-addr">Plot No. 7 & 8, Om Shiv Nagar, Gufa Mandir Road, Lal Ghati Bhopal, 462030, Madhya Pradesh</div>
            <div class="h-addr">Ph.: 9109102145/9109101246 • Email: gatroplusbhopal@gmail.com</div>
            <div><span class="title-badge">INPATIENT ADMISSION SLIP / DOCKET</span></div>
          </div>

          <div class="box" style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 6px;">
              <div><span class="label">Admission ID:</span> <span class="value" style="color:#0284c7;">${ipdId}</span></div>
              <div><span class="label">Date & Time:</span> <span class="value">${admDate} ${admTime}</span></div>
            </div>
            <div class="grid" style="margin-bottom:0;">
              <div>
                <div class="label">Patient Name</div>
                <div class="value">${patName}</div>
              </div>
              <div>
                <div class="label">MRN / Reg No.</div>
                <div class="value">${patMrn}</div>
              </div>
              <div>
                <div class="label">Age / Gender / Blood Group</div>
                <div class="value">${patAge} Y / ${patGender} / ${patBlood}</div>
              </div>
              <div>
                <div class="label">Contact Number</div>
                <div class="value">${patPhone}</div>
              </div>
            </div>
          </div>

          <div class="box" style="margin-bottom: 12px; background-color: #f0fdf4; border-color: #bbf7d0;">
            <div class="grid" style="margin-bottom:0;">
              <div>
                <div class="label" style="color:#166534;">Ward / Unit</div>
                <div class="value" style="color:#14532d;">${wardName}</div>
              </div>
              <div>
                <div class="label" style="color:#166534;">Assigned Bed</div>
                <div class="value" style="color:#15803d; font-size: 12pt;">${bedNum}</div>
              </div>
              <div>
                <div class="label" style="color:#166534;">Urgency & Classification</div>
                <div class="value" style="color:#b91c1c;">${urgency} (${caseType})</div>
              </div>
              <div>
                <div class="label" style="color:#166534;">Department</div>
                <div class="value" style="color:#166534;">${deptName}</div>
              </div>
            </div>
          </div>

          <div class="box" style="margin-bottom: 20px;">
            <div class="grid" style="margin-bottom:0;">
              <div>
                <div class="label">Attending Consultant Doctor</div>
                <div class="value">${docName}</div>
              </div>
              <div>
                <div class="label">Hospital Registration / Status</div>
                <div class="value">Admitted Inpatient</div>
              </div>
            </div>
          </div>

          <div class="footer">
            <div class="sig-box">
              Signature of Patient / Next of Kin<br/>
              <span style="font-size: 8pt; font-weight: normal; color: #64748b;">Date: ________________________</span>
            </div>
            <div class="sig-box">
              Authorized Admission Desk / Medical Officer<br/>
              <span style="font-size: 8pt; font-weight: normal; color: #64748b;">Gastro Plus Hospital Official Stamp</span>
            </div>
          </div>
        </body>
      </html>
    `;

    printDocHtml(html, `Admission Slip - ${patName}`);
  };

  const handlePrintGeneralConsent = (data?: any) => {
    const consent = data !== undefined ? data : (generalConsentData || {});
    const { admission, patient, bed, doctor } = consent || {};
    const patName = patient?.name || admission?.name || '___________________________';
    const patMrn = patient?.mrn || admission?.mrn || '______________';
    const patAge = patient?.age || '____';
    const patGender = patient?.gender || '______';
    const ipdId = admission?.id ? `IPD-${String(admission.id).slice(-6).toUpperCase()}` : `IPD-${Date.now().toString().slice(-6)}`;
    const admDate = admission?.admission_date || new Date().toISOString().split('T')[0];
    const wardName = bed?.ward || admission?.ward || 'General Ward';
    const bedNum = bed ? `Bed ${bed.bed_number || bed.number}` : 'Assigned Bed';
    const docName = doctor?.name || 'Attending Consultant';

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
              background-color: #0f172a; 
              color: #ffffff; 
              padding: 3px 12px; 
              font-size: 8.5pt; 
              font-weight: 800; 
              border-radius: 4px; 
              margin-top: 5px; 
              text-transform: uppercase; 
              letter-spacing: 0.3px; 
            }
            .patient-bar { 
              background-color: #f8fafc; 
              border: 1px solid #cbd5e1; 
              padding: 6px 10px; 
              border-radius: 5px; 
              margin-bottom: 8px; 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 4px 12px; 
              font-size: 8.5pt; 
            }
            .clause-card {
              border: 1px solid #e2e8f0;
              background-color: #ffffff;
              border-radius: 4px;
              padding: 5px 8px;
              margin-bottom: 6px;
            }
            .clause-header {
              font-weight: 800;
              color: #0f172a;
              font-size: 8.5pt;
              margin-bottom: 2px;
              display: flex;
              align-items: center;
              gap: 4px;
            }
            .clause-en {
              color: #1e293b;
              font-size: 8pt;
              line-height: 1.3;
              margin-bottom: 2px;
            }
            .clause-hi {
              color: #334155;
              font-size: 8pt;
              line-height: 1.3;
              font-weight: 500;
            }
            .ack-box { 
              background-color: #fffbeb; 
              border: 1px solid #fde68a; 
              padding: 6px 10px; 
              border-radius: 5px; 
              margin-top: 6px; 
              margin-bottom: 12px; 
              color: #78350f; 
              font-size: 8pt; 
              line-height: 1.35;
            }
            .ack-title {
              font-weight: 800;
              text-transform: uppercase;
              margin-bottom: 2px;
            }
            .footer { 
              margin-top: 14px; 
              display: flex; 
              justify-content: space-between; 
              font-size: 8.5pt; 
            }
            .sig-box { 
              border-top: 1.5px solid #475569; 
              width: 46%; 
              padding-top: 5px; 
              font-weight: 700; 
              line-height: 1.4;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="h-name">GASTRO PLUS HOSPITAL</div>
            <div class="h-addr">Plot No. 7 & 8, Om Shiv Nagar, Gufa Mandir Road, Lal Ghati Bhopal, 462030, Madhya Pradesh</div>
            <div class="h-addr">Ph.: 9109102145/9109101246 • Email: gatroplusbhopal@gmail.com</div>
            <div><span class="title-badge">GENERAL INFORMED CONSENT FOR HOSPITAL ADMISSION & MEDICAL TREATMENT<br/>(अस्पताल में भर्ती एवं सामान्य चिकित्सीय सहमति पत्र - BILINGUAL)</span></div>
          </div>

          <div class="patient-bar">
            <div><strong>Patient Name / मरीज का नाम:</strong> ${patName}</div>
            <div><strong>MRN / IPD ID:</strong> ${patMrn} / ${ipdId}</div>
            <div><strong>Age & Gender / उम्र व लिंग:</strong> ${patAge} Y / ${patGender}</div>
            <div><strong>Admission Date / भर्ती तिथि:</strong> ${admDate}</div>
            <div><strong>Attending Doctor / परामर्शदाता चिकित्सक:</strong> ${docName}</div>
            <div><strong>Ward & Bed / वार्ड व बेड:</strong> ${wardName} - ${bedNum}</div>
          </div>

          <div class="clause-card">
            <div class="clause-header">1. Consent for Medical Care & Diagnostic Investigations / चिकित्सीय जांच व उपचार हेतु सहमति:</div>
            <div class="clause-en"><strong>[English]:</strong> I hereby voluntarily grant informed consent to the medical team, resident doctors, and nursing staff of Neo Gastroplus Hospital to perform clinical examinations, diagnostic lab tests, radiological imaging (X-ray, Ultrasound), administer intravenous (IV) infusions, and execute prescribed medical therapies necessary for my/the patient's clinical condition.</div>
            <div class="clause-hi"><strong>[हिंदी]:</strong> मैं स्वेच्छा से Neo Gastroplus Hospital की मेडिकल टीम, रेजिडेंट डॉक्टर्स और नर्सिंग स्टाफ को मेरे / मरीज के स्वास्थ्य स्थिति अनुसार आवश्यक चिकित्सीय परीक्षण, पैथोलॉजी जांच, रेडियोलॉजी (एक्स-रे/सोनोग्राफी), IV ड्रिप एवं आवश्यक दवाएं देने की पूर्ण सहमति प्रदान करता/करती हूँ।</div>
          </div>

          <div class="clause-card">
            <div class="clause-header">2. Emergency Interventions, Resuscitation & CPR / आपातकालीन जीवन रक्षक हस्तक्षेप:</div>
            <div class="clause-en"><strong>[English]:</strong> In the event of unexpected acute deterioration, respiratory distress, or cardiac emergencies during inpatient stay, I authorize attending consultants and emergency clinical staff to execute life-saving resuscitation (CPR), endotracheal intubation, ICU transfer, and urgent medical procedures deemed essential.</div>
            <div class="clause-hi"><strong>[हिंदी]:</strong> भर्ती के दौरान यदि अचानक स्वास्थ्य में गंभीर आपातकालीन गिरावट आती है, तो मैं उपस्थित चिकित्सकों व आपातकालीन स्टाफ को जीवन रक्षक प्रक्रियाएं (जैसे सीपीआर, इंट्यूबेशन, आईसीयू शिफ्टिंग) तत्काल करने हेतु अधिकृत करता/करती हूँ।</div>
          </div>

          <div class="clause-card">
            <div class="clause-header">3. Financial Responsibility & Hospital Tariffs / वित्तीय दायित्व एवं अस्पताल शुल्क:</div>
            <div class="clause-en"><strong>[English]:</strong> I acknowledge full understanding of inpatient room/bed tariffs, specialist consultation fees, nursing, and procedure charges. I agree to settle all interim and final hospital bills accrued during this admission period.</div>
            <div class="clause-hi"><strong>[हिंदी]:</strong> मुझे अस्पताल के बेड शुल्क, डॉक्टर विजिट, नर्सिंग एवं जांच शुल्कों की पूरी जानकारी दे दी गई है। मैं / मेरे परिजन उपचार के समस्त बिलों का नियमानुसार समय पर भुगतान करने की पूरी जिम्मेदारी स्वीकार करते हैं।</div>
          </div>

          <div class="clause-card">
            <div class="clause-header">4. Personal Belongings & Valuables Waiver / व्यक्तिगत सामान व आभूषण सुरक्षा:</div>
            <div class="clause-en"><strong>[English]:</strong> I understand that the hospital administration does not assume responsibility for any loss or damage of personal belongings, cash, mobile phones, or jewellery retained in the ward/room.</div>
            <div class="clause-hi"><strong>[हिंदी]:</strong> मैं स्वीकार करता/करती हूँ कि अस्पताल परिसर अथवा वार्ड में रखे किसी भी निजी सामान, नकदी, मोबाइल अथवा आभूषण के खोने या चोरी होने की जिम्मेदारी अस्पताल प्रशासन की नहीं होगी।</div>
          </div>

          <div class="clause-card">
            <div class="clause-header">5. Confidentiality, Medical Records & Insurance/TPA / मेडिकल रिकॉर्ड एवं बीमा / टीपीए सहमति:</div>
            <div class="clause-en"><strong>[English]:</strong> I authorize the hospital to maintain and securely share relevant medical records with statutory authorities, insurance companies, or TPA for treatment continuity and claim verification.</div>
            <div class="clause-hi"><strong>[हिंदी]:</strong> मैं समुचित उपचार एवं बीमा/टीपीए क्लेम के सत्यापन हेतु मेडिकल रिकॉर्ड के नियमानुसार उपयोग की अनुमति देता/देती हूँ।</div>
          </div>

          <div class="ack-box">
            <div class="ack-title">✓ Declaration / स्व-घोषणा:</div>
            <div><strong>[EN]:</strong> I declare that I have read and understood (or had explained to me in my understood language) all the points mentioned above. I voluntarily give my consent for admission and treatment without any coercion.</div>
            <div><strong>[HI]:</strong> मैंने इस सहमति पत्र को भली-भांति पढ़ व समझ लिया है (अथवा मुझे मेरी समझ योग्य भाषा में समझा दिया गया है)। मैं बिना किसी दबाव के स्वेच्छा से अपनी पूर्ण सहमति देता/देती हूँ।</div>
          </div>

          <div class="footer">
            <div class="sig-box">
              Patient / Attendant Signature / Thumb Impression<br/>
              (मरीज / अभिभावक के हस्ताक्षर या अंगूठा निशान)<br/>
              <span style="font-size: 8pt; font-weight: normal;">Name & Relation / नाम व सम्बन्ध: ________________________</span><br/>
              <span style="font-size: 8pt; font-weight: normal;">Contact / Phone / संपर्क नं.: ________________________</span><br/>
              <span style="font-size: 8pt; font-weight: normal;">Date & Time / दिनांक व समय: ________________________</span>
            </div>
            <div class="sig-box">
              Attending Doctor / Authorized Officer<br/>
              (चिकित्सक / अधिकृत अस्पताल अधिकारी)<br/>
              <span style="font-size: 8pt; font-weight: normal;">Neo Gastroplus Hospital Seal / मुहर</span><br/>
              <span style="font-size: 8pt; font-weight: normal;">Date & Time / दिनांक व समय: ________________________</span>
            </div>
          </div>
        </body>
      </html>
    `;

    printDocHtml(html, `Bilingual General Consent - ${patName}`);
  };

  const printPoliceIntimation = (summary: any) => {
    if (!summary) return;
    const pat = patients.find(p => p.id === (summary.patient_id || summary.patientId)) || MOCK_PATIENTS.find(p => p.id === (summary.patient_id || summary.patientId));
    const rawHospitalInfo = storage.get(STORAGE_KEYS.HOSPITAL_INFO, null);
    const hospitalName = rawHospitalInfo?.name || 'NEW GASTRO PLUS HOSPITAL';

    const iframeId = 'police-intimation-iframe-temp';
    let iframe = document.getElementById(iframeId) as HTMLIFrameElement;
    if (iframe) document.body.removeChild(iframe);
    
    iframe = document.createElement('iframe') as HTMLIFrameElement;
    iframe.id = iframeId;
    iframe.style.position = 'fixed';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    iframe.style.opacity = '0';
    document.body.appendChild(iframe);
    
    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!iframeDoc) return;

    const policeHtml = `
      <html>
        <head>
          <title>Police Intimation Form (MLC / Special Event) - ${pat?.name || 'Patient'}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            body { font-family: 'Inter', sans-serif; margin: 35px; color: #0f172a; line-height: 1.4; }
            .header { text-align: center; border-bottom: 2px solid #334155; padding-bottom: 8px; margin-bottom: 15px; }
            .title { font-size: 14px; font-weight: 800; text-transform: uppercase; color: #0f172a; border: 1px solid #475569; background: #f1f5f9; padding: 6px; margin-bottom: 15px; text-align: center; }
            .grid { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            .grid td { border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 11px; }
            .grid td.lbl { font-weight: 700; background: #f8fafc; color: #334155; width: 25%; }
            .sig-grid { margin-top: 50px; display: flex; justify-content: space-between; font-size: 11px; }
            .sig-box { width: 45%; text-align: center; border-top: 1px solid #94a3b8; padding-top: 6px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2 style="margin:0; color:#0f172a; font-size: 18px;">${hospitalName}</h2>
            <p style="margin:2px; font-size:10px; color:#64748b;">Emergency & Medico-Legal Cell Intimation Notice</p>
          </div>
          <div class="title">OFFICIAL POLICE INTIMATION FORM (MLC / UNNATURAL EVENT / LAMA / DEATH)</div>
          
          <div style="font-size:11px; margin-bottom:12px;">
            <strong>To,</strong><br/>
            The Station House Officer (SHO)<br/>
            Local Police Station jurisdiction<br/>
            Date: ${new Date().toLocaleDateString('en-IN')}
          </div>

          <table class="grid">
            <tr>
              <td class="lbl">Patient Name</td><td><strong>${pat?.name || 'Unknown'}</strong></td>
              <td class="lbl">MLC No.</td><td>${summary.mlcStatus || 'MLC-2026/8892'}</td>
            </tr>
            <tr>
              <td class="lbl">MRN / IPD No.</td><td>${pat?.mrn || 'N/A'}</td>
              <td class="lbl">Age / Gender</td><td>${pat?.age || 'N/A'} Yrs / ${pat?.gender || 'N/A'}</td>
            </tr>
            <tr>
              <td class="lbl">Event Category</td><td style="font-weight:800; color:#b91c1c;">${summary.dischargeType}</td>
              <td class="lbl">Date & Time</td><td>${new Date(summary.dischargeDate).toLocaleString('en-IN')}</td>
            </tr>
            <tr>
              <td class="lbl">Attending Doctor</td><td>${summary.dischargeBy || 'Emergency MO'}</td>
              <td class="lbl">Contact Phone</td><td>${pat?.phone || 'N/A'}</td>
            </tr>
          </table>

          <div style="font-size:11px; margin-bottom:15px; padding:10px; border:1px solid #cbd5e1; background:#f8fafc; border-radius:4px;">
            <strong>Clinical Brief / Incident Details:</strong><br/>
            ${summary.clinicalSummary || 'Patient was brought/admitted under emergency medico-legal status.'}
            <br/><br/>
            <em>This official intimation is hereby transmitted to your police office for necessary record, inquest, or legal procedures as per statutory requirements.</em>
          </div>

          <div class="sig-grid">
            <div class="sig-box">
              <br/>Medical Officer Incharge (MLC Cell)
              <br/><span style="font-size:9px; color:#64748b;">(Sign, Date & Hospital Seal)</span>
            </div>
            <div class="sig-box">
              <br/>Police Receiving Officer / Constable
              <br/><span style="font-size:9px; color:#64748b;">(Buckle No., Sign & Time Received)</span>
            </div>
          </div>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `;
    iframeDoc.write(policeHtml);
    iframeDoc.close();
    setTimeout(() => {
      if (iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => { if (document.getElementById(iframeId)) document.body.removeChild(iframe); }, 3000);
      }
    }, 500);
  };

  const logAudit = (action: string, entityId: string, details: any) => {
    const logs = storage.get(STORAGE_KEYS.AUDIT_LOGS, []);
    const newLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: currentUser?.name || 'System',
      role: currentUser?.role || 'User',
      action,
      entityId,
      details
    };
    saveAuditLog(newLog);
    storage.set(STORAGE_KEYS.AUDIT_LOGS, [newLog, ...logs].slice(0, 500));
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'Emergency': return 'bg-rose-500 text-white animate-pulse';
      case 'Urgent': return 'bg-amber-500 text-white';
      case 'Routine': return 'bg-emerald-500 text-white';
      default: return 'bg-slate-400 text-white';
    }
  };

  const handleAddBed = async () => {
    if (!newBed.number || !newBed.ward) {
      toast.error('Please fill in all fields');
      return;
    }

    const duplicate = beds.find(b => 
      String(b.bed_number || b.number).trim().toLowerCase() === newBed.number.trim().toLowerCase() &&
      String(b.ward).trim().toLowerCase() === newBed.ward.trim().toLowerCase()
    );

    if (duplicate) {
      toast.error(`Bed ${newBed.number} already exists in ${newBed.ward}`);
      return;
    }

    if (newBed.ward && !hospitalWards.some(w => w.toLowerCase() === newBed.ward.trim().toLowerCase())) {
      handleAddNewWard(newBed.ward.trim());
    }

    const synced = await supabaseService.createBed({
      bed_number: newBed.number,
      ward: newBed.ward,
      bed_type: newBed.type,
      status: 'Available',
      daily_rate: MOCK_BED_RATES.find(r => r.type === newBed.type)?.rate || 0
    });

    if (synced) {
      setBeds(deduplicateBeds([...beds, synced]));
      setNewBed({ number: '', ward: '', type: 'General' });
      setIsAddBedOpen(false);
      toast.success('New bed added successfully');
    } else {
      toast.error('Failed to add bed');
    }
  };

  const handleSaveClinicalNote = async (noteType: 'DOCTOR' | 'NURSE') => {
    const content = noteType === 'DOCTOR' ? newDoctorNote : newNurseNote;
    if (!content.trim()) {
      toast.error('Note content cannot be empty');
      return;
    }

    if (noteType === 'DOCTOR') {
      const appts = storage.get(STORAGE_KEYS.APPOINTMENTS, []);
      if (!canDoctorWriteClinicalNotes(currentUser, selectedPatient, appts, admissions)) {
        const assignedDoc = selectedPatient?.attendingDoctor || selectedPatient?.attending_doctor || 'assigned doctor';
        toast.error(`Access Restricted: You are not assigned to patient ${selectedPatient?.name || 'this patient'}. Only the assigned doctor (${assignedDoc}) or an administrator can record doctor clinical notes.`);
        return;
      }
    }
    
    const authorId = currentUser?.id || null;
    const noteData = {
      patient_id: selectedPatient.id,
      author_id: authorId,
      note_type: noteType,
      content: content.trim()
    };
    
    try {
      const savedNote = await supabaseService.createClinicalNote(noteData);
      if (savedNote) {
        toast.success(`${noteType === 'DOCTOR' ? 'Doctor' : 'Nurse'} note saved successfully`);
        const updatedNotes = await supabaseService.getClinicalNotes(selectedPatient.id);
        if (updatedNotes) setClinicalNotes(updatedNotes);
        
        if (noteType === 'DOCTOR') setNewDoctorNote('');
        else setNewNurseNote('');
      } else {
        toast.error('Failed to save note');
      }
    } catch (err: any) {
      console.error('Error saving clinical note:', err);
      toast.error('Failed to save clinical note');
    }
  };

  const handleSavePrescription = async () => {
    if (!newPrescription.medicineName.trim()) {
      toast.error('Medicine name cannot be empty');
      return;
    }

    const appts = storage.get(STORAGE_KEYS.APPOINTMENTS, []);
    if (!canDoctorWritePrescription(currentUser, selectedPatient, appts, admissions)) {
      const assignedDoc = selectedPatient?.attendingDoctor || selectedPatient?.attending_doctor || 'assigned doctor';
      toast.error(`Access Restricted: You are not assigned to patient ${selectedPatient?.name || 'this patient'}. Only the assigned doctor (${assignedDoc}) or an administrator can write prescriptions.`);
      return;
    }

    const docName = currentUser?.name || 'Dr. Rajesh Sharma';
    const rxData = {
      patient_id: selectedPatient.id,
      patientId: selectedPatient.id,
      doctor_id: currentUser?.id || null,
      doctorId: currentUser?.id || null,
      doctor_name: docName,
      doctorName: docName,
      prescription_date: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
      medicines: [
        {
          name: newPrescription.medicineName.trim(),
          dosage: newPrescription.dosage.trim() || 'Once a day',
          frequency: newPrescription.dosage.trim() || 'Once a day',
          duration: newPrescription.duration.trim() || '3 days',
          name_with_dose: newPrescription.medicineName.trim()
        }
      ],
      medications: [
        {
          name: newPrescription.medicineName.trim(),
          dosage: newPrescription.dosage.trim() || 'Once a day',
          frequency: newPrescription.dosage.trim() || 'Once a day',
          duration: newPrescription.duration.trim() || '3 days'
        }
      ],
      advice: newPrescription.instructions.trim() || 'Complete bed rest',
      notes: newPrescription.instructions.trim() || 'Complete bed rest'
    };

    try {
      const saved = await supabaseService.createPrescription(rxData);
      if (saved) {
        toast.success(`Prescription for ${newPrescription.medicineName.trim()} created successfully`);
        const rxList = await supabaseService.getPrescriptions(selectedPatient.id);
        if (rxList) setPatientPrescriptions(rxList);
        setNewPrescription({ medicineName: '', dosage: '', duration: '', instructions: '' });
      } else {
        toast.error('Failed to save prescription');
      }
    } catch (err) {
      console.error('Error saving prescription:', err);
      toast.error('Failed to save prescription');
    }
  };

  const handleRecommendTest = async () => {
    if (!recommendedTestName) {
      toast.error('Please select a test type');
      return;
    }

    const testRequest = {
      patient_id: selectedPatient.id,
      patientId: selectedPatient.id,
      test_name: recommendedTestName,
      requested_by: currentUser?.id || null,
      requestedBy: currentUser?.id || null,
      status: 'Pending',
      urgency: 'Routine',
      requested_at: new Date().toISOString()
    };

    try {
      const saved = await supabaseService.createLabTestRequest(testRequest);
      if (saved) {
        toast.success(`Recommended ${recommendedTestName} successfully`);
        const orders = await supabaseService.getLabTestRequests();
        if (orders) {
          const filtered = orders.filter((o: any) => o.patient_id === selectedPatient.id || o.patientId === selectedPatient.id);
          setPatientTests(filtered);
        }
        setRecommendedTestName('');
      } else {
        toast.error('Failed to save test recommendation');
      }
    } catch (err) {
      console.error('Error recommending test:', err);
      toast.error('Failed to save test recommendation');
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (isDeleteForbidden) {
      toast.error('Deletion of clinical notes is restricted for Front Office, Doctor, and Accountant roles.');
      return;
    }
    const note = clinicalNotes.find(n => n.id === id);
    if (note && !canUserModifyRecord(note, currentUser, users)) {
      toast.error("Access Denied: This clinical note was added by an Admin and cannot be deleted by non-admin users.");
      return;
    }
    try {
      const res = await supabaseService.deleteClinicalNote(id);
      if (res) {
        toast.success("Clinical note removed successfully from history");
        if (selectedPatient?.id) {
          const notes = await supabaseService.getClinicalNotes(selectedPatient.id);
          if (notes) setClinicalNotes(notes);
        }
      } else {
        toast.error("Failed to delete clinical note");
      }
    } catch (err: any) {
      toast.error("Error deleting note: " + err.message);
    }
  };

  const openDeleteBedModal = (bed: any) => {
    if (!bed) return;
    setBedToDelete(bed);
    setDeleteBedUnassignPatient(true);
    setIsDeleteBedOpen(true);
  };

  const handleConfirmDeleteBed = async () => {
    if (!bedToDelete) return;
    setIsDeletingBed(true);
    try {
      const id = bedToDelete.id;
      const bedNumber = bedToDelete.bed_number || bedToDelete.number || id;
      const patientId = bedToDelete.patient_id || bedToDelete.patientId;

      // 1. If occupied and user wants to unassign / reset patient
      if (patientId && deleteBedUnassignPatient) {
        await supabaseService.updatePatient(String(patientId), {
          status: 'OPD',
          needs_admission: false,
          needsAdmission: false
        });
        setPatients(prev => prev.map(p => String(p.id) === String(patientId) ? { ...p, status: 'OPD', needs_admission: false, needsAdmission: false } : p));
      }

      // 2. Delete bed from Supabase & localStorage
      const success = await supabaseService.deleteBed(String(id));
      if (success) {
        setBeds(prev => prev.filter(b => String(b.id) !== String(id) && String(b.bed_number) !== String(bedNumber)));

        // 3. Audit log
        try {
          saveAuditLog({
            user_id: currentUser?.id || 'admin',
            action: 'DELETE_BED',
            entity: 'beds',
            entity_id: String(id),
            details: {
              bed_number: bedNumber,
              ward: bedToDelete.ward,
              status: bedToDelete.status,
              patient_id: patientId
            }
          });
        } catch (e) {
          console.warn('Audit log write error:', e);
        }

        // 4. Broadcast sync events
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table: 'beds', action: 'delete' } }));
        if (patientId) {
          window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table: 'patients', action: 'update' } }));
        }

        toast.success(`Bed "${bedNumber}" (${bedToDelete.ward || 'Ward'}) deleted successfully.`);
        setIsDeleteBedOpen(false);
        setBedToDelete(null);
      } else {
        toast.error('Failed to remove bed');
      }
    } catch (err: any) {
      console.error('Error deleting bed:', err);
      toast.error('Error deleting bed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsDeletingBed(false);
    }
  };

  const handleDeleteBed = (id: string) => {
    const bed = beds.find(b => String(b.id) === String(id));
    if (bed) {
      openDeleteBedModal(bed);
    }
  };

  const handleExportIPD = () => {
    const headers = ['Bed Number', 'Ward', 'Status', 'Patient MRN'];
    const rows = beds.map(b => [
      b.number,
      b.ward,
      b.status,
      b.patientId ? patients.find(p => p.id === b.patientId)?.mrn : 'N/A'
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'ipd_bed_status.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('IPD data exported');
  };

  const handleDischarge = async (bedId: string) => {
    const bed = beds.find(b => b.id === bedId);
    if (!bed) return;
    const patientId = bed.patient_id || bed.patientId;
    if (!patientId) {
      toast.error('Could not identify patient for discharge');
      return;
    }

    const outstandingDues = checkPatientDues(patientId);
    if (outstandingDues > 0) {
      toast.error(`Cannot discharge patient. There are outstanding dues of ${formatCurrency(outstandingDues)}. Please clear all bills first.`);
      return;
    }

    const patient = patients.find(p => String(p.id) === String(patientId));
    
    // Find and discharge the active admission record as well
    const activeAdmission = admissions.find(a => String(a.bed_id) === String(bedId) && String(a.patient_id || a.patientId) === String(patientId) && a.status === 'Admitted');
    if (activeAdmission) {
      await supabaseService.dischargePatient(activeAdmission.id, new Date().toISOString());
    }

    // Update patient status to Discharged in Supabase and local cache
    await supabaseService.updatePatient(patientId, { status: 'Discharged' });

    // Update local patient state
    setPatients(patients.map(p => p.id === patientId ? { ...p, status: 'Discharged' } : p));

    const updatedBed = await supabaseService.updateBedStatus(bedId, 'Available', null);
    if (updatedBed) {
      setBeds(beds.map(b => b.id === bedId ? updatedBed : b));
      // Refresh admissions state
      const updatedAdmissions = await supabaseService.getAdmissions();
      if (updatedAdmissions) setAdmissions(updatedAdmissions);
      toast.success('Patient discharged and bed freed');
    } else {
      toast.error('Failed to discharge patient');
    }
  };

  const openEditBedModal = (bed: any) => {
    if (!bed) return;
    setEditingBed(bed);
    setEditBedForm({
      bedNumber: bed.bed_number || bed.number || '',
      ward: bed.ward || 'General Ward A',
      bedType: bed.bed_type || bed.type || 'General',
      pricePerDay: bed.price_per_day !== undefined && bed.price_per_day !== null ? bed.price_per_day : (bed.price || 500),
      status: bed.status || 'Available'
    });
    setIsEditBedOpen(true);
  };

  const handleSaveBed = async () => {
    if (!editingBed) return;
    if (!editBedForm.bedNumber.trim()) {
      toast.error('Bed number cannot be empty');
      return;
    }
    setIsSavingBed(true);
    try {
      const updates = {
        bed_number: editBedForm.bedNumber.trim(),
        number: editBedForm.bedNumber.trim(),
        ward: editBedForm.ward,
        bed_type: editBedForm.bedType,
        type: editBedForm.bedType,
        price_per_day: Number(editBedForm.pricePerDay) || 0,
        price: Number(editBedForm.pricePerDay) || 0,
        status: editBedForm.status
      };

      const result = await supabaseService.updateBed(editingBed.id, updates);
      const merged = { ...editingBed, ...updates, ...(result || {}) };

      setBeds(prev => prev.map(b => b.id === editingBed.id ? merged : b));

      const storedBeds = storage.get(STORAGE_KEYS.BEDS, []) || [];
      const updatedStored = storedBeds.map((b: any) => b.id === editingBed.id ? merged : b);
      storage.set(STORAGE_KEYS.BEDS, updatedStored);

      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table: 'beds', action: 'update' } }));

      toast.success(`Bed ${editBedForm.bedNumber} updated successfully`);
      setIsEditBedOpen(false);
    } catch (err: any) {
      console.error('Error updating bed:', err);
      toast.error('Failed to update bed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSavingBed(false);
    }
  };

  // --- DELETE & PURGE ADMISSION HANDLERS ---
  const getDaysSinceAdmission = (admissionDate?: string) => {
    if (!admissionDate) return 0;
    try {
      const admDate = new Date(admissionDate);
      if (isNaN(admDate.getTime())) return 0;
      const now = new Date();
      const diffMs = now.getTime() - admDate.getTime();
      return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    } catch {
      return 0;
    }
  };

  const openDeleteAdmissionModal = (admission: any, patient?: any, bed?: any) => {
    if (!admission) return;
    const patId = admission.patient_id || admission.patientId;
    const pat = patient || (patId ? patients.find(p => String(p.id) === String(patId) || p.mrn === admission.mrn) : null);
    const bd = bed || (admission.bed_id ? beds.find(b => String(b.id) === String(admission.bed_id)) : null);
    
    setAdmissionToDelete(admission);
    setPatientToDeleteAdmission(pat || null);
    setBedToDeleteAdmission(bd || null);
    setDeleteReleaseBed(true);
    setDeleteUpdatePatientStatus(true);
    setDeleteReason('Old stale admission record');
    setIsDeleteAdmissionOpen(true);
  };

  const handleConfirmDeleteAdmission = async () => {
    if (!admissionToDelete) return;
    setIsDeletingAdmission(true);
    try {
      const admissionId = admissionToDelete.id;
      const patientId = admissionToDelete.patient_id || admissionToDelete.patientId || patientToDeleteAdmission?.id;
      const bedId = admissionToDelete.bed_id || bedToDeleteAdmission?.id;

      // 1. Delete admission record via Supabase / storage
      await supabaseService.deleteAdmission(admissionId);

      // 2. Release bed if requested
      if (deleteReleaseBed && bedId) {
        await supabaseService.updateBedStatus(bedId, 'Available', null);
        setBeds(prev => prev.map(b => String(b.id) === String(bedId) ? { ...b, status: 'Available', patient_id: null, patientId: null } : b));
      }

      // 3. Update patient status to OPD / reset needs_admission
      if (deleteUpdatePatientStatus && patientId) {
        await supabaseService.updatePatient(patientId, {
          status: 'OPD',
          needs_admission: false,
          needsAdmission: false
        });
        setPatients(prev => prev.map(p => String(p.id) === String(patientId) ? { ...p, status: 'OPD', needs_admission: false, needsAdmission: false } : p));
      }

      // 4. Update local state
      setAdmissions(prev => prev.filter(a => String(a.id) !== String(admissionId)));

      // 5. Audit log
      try {
        saveAuditLog({
          user_id: currentUser?.id || 'admin',
          action: 'DELETE_ACTIVE_ADMISSION',
          entity: 'admissions',
          entity_id: admissionId,
          details: {
            patient_id: patientId,
            patient_name: patientToDeleteAdmission?.name || admissionToDelete.name,
            bed_id: bedId,
            reason: deleteReason,
            bed_released: deleteReleaseBed
          }
        });
      } catch (e) {
        console.warn('Audit log write error:', e);
      }

      // 6. Broadcast sync events
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table: 'admissions', action: 'delete' } }));
      window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table: 'beds', action: 'update' } }));
      window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table: 'patients', action: 'update' } }));

      toast.success(`Active admission record deleted successfully${deleteReleaseBed && bedId ? ' and bed marked Available' : ''}.`);
      setIsDeleteAdmissionOpen(false);
      setAdmissionToDelete(null);
    } catch (err: any) {
      console.error('Error deleting admission:', err);
      toast.error('Failed to delete admission: ' + (err.message || 'Unknown error'));
    } finally {
      setIsDeletingAdmission(false);
    }
  };

  const handleConfirmPurgeOldAdmissions = async () => {
    if (selectedPurgeIds.length === 0) {
      toast.error('No admission records selected for deletion');
      return;
    }
    setIsPurgingAdmissions(true);
    try {
      const recordsToDelete = admissions.filter(a => selectedPurgeIds.includes(String(a.id)));
      const count = recordsToDelete.length;

      // 1. Delete admission records from DB/storage
      await supabaseService.deleteAdmissions(selectedPurgeIds);

      // 2. Free associated beds if requested
      if (purgeReleaseBeds) {
        const bedIdsToFree = Array.from(new Set(recordsToDelete.map(a => a.bed_id).filter(Boolean))) as string[];
        for (const bId of bedIdsToFree) {
          await supabaseService.updateBedStatus(String(bId), 'Available', null);
        }
        setBeds(prev => prev.map(b => bedIdsToFree.some(bId => String(bId) === String(b.id)) ? { ...b, status: 'Available', patient_id: null, patientId: null } : b));
      }

      // 3. Update patient statuses if requested
      if (purgeUpdatePatientStatus) {
        const patIdsToUpdate = Array.from(new Set(recordsToDelete.map(a => a.patient_id || a.patientId).filter(Boolean))) as string[];
        for (const pId of patIdsToUpdate) {
          await supabaseService.updatePatient(String(pId), { status: 'OPD', needs_admission: false, needsAdmission: false });
        }
        setPatients(prev => prev.map(p => patIdsToUpdate.some(pId => String(pId) === String(p.id)) ? { ...p, status: 'OPD', needs_admission: false, needsAdmission: false } : p));
      }

      // 4. Update local state
      const purgeSet = new Set(selectedPurgeIds.map(String));
      setAdmissions(prev => prev.filter(a => !purgeSet.has(String(a.id))));

      // 5. Broadcast sync
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table: 'admissions', action: 'delete' } }));
      window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table: 'beds', action: 'update' } }));
      window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table: 'patients', action: 'update' } }));

      toast.success(`Successfully deleted ${count} old active admission record(s)${purgeReleaseBeds ? ' and released occupied beds' : ''}.`);
      setIsPurgeOldAdmissionsOpen(false);
      setSelectedPurgeIds([]);
      setPurgeConfirmationStep(false);
    } catch (err: any) {
      console.error('Error purging old admissions:', err);
      toast.error('Failed to purge old admissions: ' + (err.message || 'Unknown error'));
    } finally {
      setIsPurgingAdmissions(false);
    }
  };

  const openQuickDischargeModal = (bed: any) => {
    if (!bed) return;
    const patientId = bed.patient_id || bed.patientId;
    const patient = (patientId ? patients.find(p => String(p.id) === String(patientId)) : null) || 
                    (patientId ? MOCK_PATIENTS.find(p => String(p.id) === String(patientId)) : null);

    if (patient && normalizeRole(currentUser?.role) === 'DOCTOR') {
      const appts = storage.get(STORAGE_KEYS.APPOINTMENTS, []);
      if (!isDoctorAssignedToPatient(currentUser, patient, appts, admissions)) {
        const assignedDoc = patient?.attendingDoctor || patient?.attending_doctor || 'assigned doctor';
        toast.error(`Access Restricted: You are not the assigned doctor for ${patient?.name || 'this patient'}. Only the assigned doctor (${assignedDoc}) or an administrator can initiate discharge.`);
        return;
      }
    }

    const adm = patientId ? admissions.find((a: any) => String(a.patient_id || a.patientId) === String(patientId) && (a.status === 'Admitted' || a.status === 'admitted')) : null;
    const docId = adm?.doctor_id || adm?.doctorId || patient?.attending_doctor_id || patient?.attendingDoctorId;
    const doc = docId ? users.find(u => String(u.id) === String(docId) || String(u.name).toLowerCase() === String(docId).toLowerCase()) : null;

    setQuickDischargeBed(bed);
    setQuickDischargeForm({
      dischargeType: 'Routine / Improved',
      dischargeDate: new Date().toISOString().substring(0, 10),
      dischargeTime: new Date().toTimeString().substring(0, 5),
      followUpDate: '',
      conditionAtDischarge: 'Hemodynamically Stable, Afebrile, Ambulatory',
      dietaryAdvice: 'Soft, nutritious diet. Hydrate well (2.5-3L water/day). Avoid spicy & deep-fried foods.',
      emergencyWarningSigns: 'High fever (>101°F), severe abdominal pain, persistent vomiting, shortness of breath, or surgical site redness/discharge.',
      dischargeBy: doc?.name || currentUser?.name || 'Dr. Rajesh Sharma',
      bypassDues: false,
      notes: ''
    });
    setIsQuickDischargeOpen(true);
  };

  const handleConfirmQuickDischarge = async () => {
    if (!quickDischargeBed) return;
    const patientId = quickDischargeBed.patient_id || quickDischargeBed.patientId;
    
    // If bed is occupied without a linked patient ID, just free the bed cleanly
    if (!patientId) {
      setIsProcessingQuickDischarge(true);
      try {
        await supabaseService.updateBedStatus(quickDischargeBed.id, 'Available', null);
        setBeds(prev => prev.map(b => b.id === quickDischargeBed.id ? { ...b, status: 'Available', patient_id: null, patientId: null } : b));
        window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table: 'beds', action: 'update' } }));
        toast.success(`Bed ${quickDischargeBed.bed_number || quickDischargeBed.number || quickDischargeBed.id} is now Available.`);
        setIsQuickDischargeOpen(false);
      } catch (err: any) {
        toast.error('Failed to update bed: ' + (err.message || 'Error'));
      } finally {
        setIsProcessingQuickDischarge(false);
      }
      return;
    }

    const patient = (patientId ? patients.find(p => String(p.id) === String(patientId)) : null) || 
                    (patientId ? MOCK_PATIENTS.find(p => String(p.id) === String(patientId)) : null) || 
                    { id: patientId, name: 'Inpatient', mrn: 'N/A' };

    if (patient && normalizeRole(currentUser?.role) === 'DOCTOR') {
      const appts = storage.get(STORAGE_KEYS.APPOINTMENTS, []);
      if (!isDoctorAssignedToPatient(currentUser, patient, appts, admissions)) {
        toast.error("Access Restricted: Only the assigned doctor or administrator can confirm discharge for this patient.");
        return;
      }
    }

    const outstandingDues = checkPatientDues(patientId);

    if (outstandingDues > 0 && !quickDischargeForm.bypassDues) {
      toast.error(`Outstanding dues of ${formatCurrency(outstandingDues)} remain. Please clear bills or check the Authorized Bypass box.`);
      return;
    }

    setIsProcessingQuickDischarge(true);
    try {
      const finalDischargeIso = quickDischargeForm.dischargeDate ? new Date(`${quickDischargeForm.dischargeDate}T${quickDischargeForm.dischargeTime || '12:00'}:00`).toISOString() : new Date().toISOString();

      // 1. Discharge active admission record
      const activeAdmission = admissions.find(a => (String(a.patient_id || a.patientId) === String(patientId)) && (a.status === 'Admitted' || a.status === 'admitted'));
      if (activeAdmission) {
        await supabaseService.dischargePatient(activeAdmission.id, finalDischargeIso);
      }

      // 2. Free the Bed
      await supabaseService.updateBedStatus(quickDischargeBed.id, 'Available', null);

      // 3. Update Patient Status
      await supabaseService.updatePatient(patientId, { status: 'Discharged', needs_admission: false, needsAdmission: false });

      // 4. Create / Save Discharge Summary
      const summaryPayload = {
        patient_id: patientId,
        patientId: patientId,
        patientName: patient?.name || 'Inpatient',
        mrn: patient?.mrn || 'N/A',
        admission_id: activeAdmission?.id || 'adm-' + Date.now(),
        discharge_date: finalDischargeIso,
        discharge_type: quickDischargeForm.dischargeType,
        discharge_by: quickDischargeForm.dischargeBy,
        follow_up_date: quickDischargeForm.followUpDate || null,
        condition_at_discharge: quickDischargeForm.conditionAtDischarge,
        dietary_advice: quickDischargeForm.dietaryAdvice,
        emergency_warning_signs: quickDischargeForm.emergencyWarningSigns,
        clinical_summary: quickDischargeForm.notes || 'Routine discharge upon clinical recovery.'
      };

      try {
        const createdSummary = await supabaseService.createDischargeSummary(summaryPayload);
        if (createdSummary) {
          setDischargeSummaries(prev => [createdSummary, ...prev]);
        }
      } catch (sumErr) {
        console.warn('Discharge summary creation log:', sumErr);
      }

      // 5. Update local states
      setBeds(prev => prev.map(b => b.id === quickDischargeBed.id ? { ...b, status: 'Available', patient_id: null, patientId: null } : b));
      setPatients(prev => prev.map(p => String(p.id) === String(patientId) ? { ...p, status: 'Discharged', needs_admission: false, needsAdmission: false } : p));
      if (activeAdmission) {
        setAdmissions(prev => prev.map(a => a.id === activeAdmission.id ? { ...a, status: 'Discharged', discharge_date: finalDischargeIso } : a));
      }

      // 6. Broadcast sync events
      window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table: 'beds', action: 'update' } }));
      window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table: 'admissions', action: 'update' } }));
      window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table: 'patients', action: 'update' } }));

      toast.success(`Patient ${patient?.name || ''} successfully discharged! Bed ${quickDischargeBed.bed_number || quickDischargeBed.number || quickDischargeBed.id} is now Available.`);
      setIsQuickDischargeOpen(false);
    } catch (err: any) {
      console.error('Error during quick discharge:', err);
      toast.error('Failed to discharge patient: ' + (err.message || 'Unknown error'));
    } finally {
      setIsProcessingQuickDischarge(false);
    }
  };

  const handleDismissTransferRequest = async (patientId: string) => {
    try {
      await supabaseService.updatePatient(patientId, { 
        needs_admission: false, 
        needsAdmission: false, 
        status: 'OPD' 
      });
      setPatients(prev => prev.map(p => 
        String(p.id) === String(patientId) ? { ...p, needs_admission: false, needsAdmission: false, status: 'OPD' } : p
      ));
      toast.success('IPD transfer request cleared');
    } catch (err: any) {
      toast.error('Failed to clear request: ' + (err.message || 'Unknown error'));
    }
  };

  const handleDismissAllTransferRequests = async () => {
    try {
      for (const p of pendingAdmissions) {
        await supabaseService.updatePatient(p.id, { 
          needs_admission: false, 
          needsAdmission: false, 
          status: 'OPD' 
        });
      }
      setPatients(prev => prev.map(p => ({
        ...p,
        needs_admission: false,
        needsAdmission: false,
        status: p.status === 'Admitting' ? 'OPD' : p.status
      })));
      toast.success('All pending transfer requests cleared');
    } catch (err: any) {
      toast.error('Failed to clear requests: ' + (err.message || 'Unknown error'));
    }
  };

  const pendingAdmissions = useMemo(() => {
    const activeBedPatientIds = new Set(
      beds
        .filter(b => (String(b.status || '').toLowerCase() === 'occupied') && (b.patient_id || b.patientId))
        .map(b => String(b.patient_id || b.patientId).toLowerCase())
    );
    const activeAdmissionPatientIds = new Set(
      admissions
        .filter(a => (String(a.status || '').toLowerCase() === 'admitted' || String(a.status || '').toLowerCase() === 'active') && (a.patient_id || a.patientId))
        .map(a => String(a.patient_id || a.patientId).toLowerCase())
    );

    const seenIds = new Set<string>();
    const list: any[] = [];

    for (const p of patients) {
      if (!p || !p.id) continue;
      const pid = String(p.id).toLowerCase();
      if (seenIds.has(pid)) continue;

      const pStatus = (p.status || '').toLowerCase();
      const isAlreadyAdmitted = pStatus === 'admitted' || activeBedPatientIds.has(pid) || activeAdmissionPatientIds.has(pid);
      const isDischarged = pStatus === 'discharged';

      if (isAlreadyAdmitted || isDischarged) continue;

      const regType = (p.registration_type || p.registrationType || '').toLowerCase();
      const isMarkedForAdmission = 
        p.needsAdmission === true || 
        p.needs_admission === true || 
        String(p.needs_admission) === 'true' ||
        String(p.needsAdmission) === 'true' ||
        pStatus === 'admitting' ||
        pStatus === 'ipd' ||
        regType === 'ipd' ||
        regType === 'opd/ipd' ||
        regType === 'emergency' ||
        p.is_emergency === true ||
        p.isEmergency === true;

      if (isMarkedForAdmission) {
        seenIds.add(pid);
        list.push(p);
      }
    }

    return list;
  }, [patients, beds, admissions]);

  const handleTransfer = async () => {
    if (!transferData.toBedId) {
      toast.error('Please select a target bed');
      return;
    }

    const patientObj = patients.find(p => p.id === transferData.patientId) || MOCK_PATIENTS.find(p => p.id === transferData.patientId);
    const fromBedObj = beds.find(b => b.id === transferData.fromBedId);
    const toBedObj = beds.find(b => b.id === transferData.toBedId);

    if (!toBedObj) {
      toast.error('Selected target bed does not exist');
      return;
    }

    const successFrom = await supabaseService.updateBedStatus(transferData.fromBedId, 'Available', null);
    const successTo = await supabaseService.updateBedStatus(transferData.toBedId, 'Occupied', transferData.patientId);

    if (successFrom && successTo) {
      // Find active admission of this patient and update its bed & ward reference
      const activeAdmission = admissions.find(a => 
        (a.patient_id === transferData.patientId || a.patientId === transferData.patientId) && 
        a.status === 'Admitted'
      );
      if (activeAdmission) {
        const updatedAdm = await supabaseService.updateAdmissionBed(activeAdmission.id, transferData.toBedId, toBedObj.ward);
        if (updatedAdm) {
          setAdmissions(prev => prev.map(a => a.id === activeAdmission.id ? { 
            ...a, 
            bed_id: transferData.toBedId, 
            bedId: transferData.toBedId,
            ward: toBedObj.ward 
          } : a));
        }
      }

      // Log the transfer
      const shiftingRecord = {
                    id: "trf-" + Date.now(),
        patientId: transferData.patientId,
        patientName: patientObj?.name || 'Walk-in Inpatient',
        fromBedId: transferData.fromBedId,
        fromBedNumber: fromBedObj?.bed_number || fromBedObj?.number || 'N/A',
        fromWard: fromBedObj?.ward || 'N/A',
        toBedId: transferData.toBedId,
        toBedNumber: toBedObj?.bed_number || toBedObj?.number || 'N/A',
        toWard: toBedObj?.ward || 'N/A',
        reason: transferData.reason,
        transferDate: new Date().toISOString(),
        transferredBy: transferData.transferredBy || currentUser?.name || 'Dr. Ramesh Mehta',
        clinicalRequirements: transferData.clinicalRequirements,
        nurseInCharge: transferData.nurseInCharge || 'Staff Nurse Priya S.'
      };

      const updatedTransfers = [shiftingRecord, ...bedTransfers];
      setBedTransfers(updatedTransfers);
      storage.set(STORAGE_KEYS.BED_TRANSFERS, updatedTransfers);

      setBeds(beds.map(b => {
        if (b.id === transferData.fromBedId) return successFrom;
        if (b.id === transferData.toBedId) return successTo;
        return b;
      }));
      
      logAudit('INTRA_HOSPITAL_SHIFT', transferData.patientId, {
        fromBed: fromBedObj?.bed_number || fromBedObj?.number,
        toBed: toBedObj?.bed_number || toBedObj?.number,
        reason: transferData.reason
      });

      setIsTransferOpen(false);
      toast.success('Patient transferred successfully');
    } else {
      toast.error('Failed to complete transfer');
    }
  };

  const printShiftingOrder = (transfer: any) => {
    if (!transfer) return;
    const pat = patients.find(p => p.id === transfer.patientId) || MOCK_PATIENTS.find(p => p.id === transfer.patientId);
    const rawHospitalInfo = storage.get(STORAGE_KEYS.HOSPITAL_INFO, null);
    const hospitalName = rawHospitalInfo?.name || 'NEW GASTRO PLUS HOSPITAL';
    const hospitalSubHeader = rawHospitalInfo?.address || 'Healthcare Center';
    const hospitalPhone = rawHospitalInfo?.phone || '+91 98765 43210';

    // Temporary iframe for printing
    const iframeId = 'shifting-order-iframe-temp';
    let iframe = document.getElementById(iframeId) as HTMLIFrameElement;
    if (iframe) {
      document.body.removeChild(iframe);
    }
    
    iframe = document.createElement('iframe') as HTMLIFrameElement;
    iframe.id = iframeId;
    iframe.style.position = 'fixed';
    iframe.style.bottom = '0';
    iframe.style.right = '0';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    iframe.style.margin = '0';
    iframe.style.padding = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    
    document.body.appendChild(iframe);
    
    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!iframeDoc) {
      toast.error('Unable to initialize printing container');
      return;
    }

    const formattedShiftDate = new Date(transfer.transferDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + new Date(transfer.transferDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    const cardHtml = `
      <html>
        <head>
          <title>Intra-Hospital Shifting Ticket - ${transfer.patientName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            body { 
              font-family: 'Inter', sans-serif; 
              margin: 20px; 
              padding: 0;
              color: #1e293b;
              background-color: #ffffff;
            }
            .card-border {
              border: 3px double #0f766e;
              padding: 20px;
              border-radius: 8px;
              max-width: 600px;
              margin: 0 auto;
            }
            .hospital-banner { 
              border-bottom: 2px solid #0f766e; 
              padding-bottom: 8px; 
              margin-bottom: 15px; 
              text-align: center;
            }
            .hospital-name {
              font-size: 18px;
              font-weight: 800;
              color: #0f766e;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .hospital-sub {
              font-size: 10px;
              color: #64748b;
              margin-top: 2px;
            }
            .card-title-badge { 
              text-align: center; 
              font-size: 13px; 
              font-weight: 800; 
              margin-bottom: 15px; 
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #ffffff;
              background-color: #0f766e;
              padding: 4px 10px;
              border-radius: 4px;
              display: inline-block;
              margin-left: auto;
              margin-right: auto;
            }
            .badge-wrapper {
              text-align: center;
              margin-bottom: 15px;
            }
            .grid-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 15px;
            }
            .grid-table td {
              padding: 6px 10px;
              border: 1px solid #cbd5e1;
              font-size: 11px;
            }
            .grid-table td.label {
              font-weight: 700;
              background-color: #f1f5f9;
              color: #334155;
              width: 25%;
            }
            .section-title {
              font-size: 11px;
              font-weight: 800;
              color: #0f766e;
              border-bottom: 1px solid #0f766e;
              padding-bottom: 2px;
              margin-bottom: 8px;
              text-transform: uppercase;
            }
            .section-content {
              font-size: 11px;
              line-height: 1.5;
              color: #1e293b;
              margin-bottom: 12px;
            }
            .footer-sign {
              margin-top: 35px;
              display: flex;
              justify-content: space-between;
              font-size: 10px;
            }
            .sig-box {
              text-align: center;
              width: 170px;
            }
            .sig-line {
              border-top: 1px solid #cbd5e1;
              margin-top: 30px;
              padding-top: 4px;
              font-weight: 600;
              color: #475569;
            }
            @media print {
              body { margin: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="card-border">
            <div class="hospital-banner">
              <div class="hospital-name">${hospitalName}</div>
              <div class="hospital-sub">
                ${hospitalSubHeader} | Tel: ${hospitalPhone}
              </div>
            </div>
            
            <div class="badge-wrapper">
              <div class="card-title-badge">Intra-Hospital Shifting Ticket</div>
            </div>
            
            <table class="grid-table">
              <tr>
                <td class="label">Patient Name</td>
                <td style="font-weight: 700;">${transfer.patientName}</td>
                <td class="label">MRN / ID</td>
                <td>${pat?.mrn || 'N/A'}</td>
              </tr>
              <tr>
                <td class="label">Age / Gender</td>
                <td>${pat?.age ? `${pat.age} Yrs` : 'N/A'} / ${pat?.gender || 'N/A'}</td>
                <td class="label">Shift Date-Time</td>
                <td>${formattedShiftDate}</td>
              </tr>
              <tr>
                <td class="label">Source Bed</td>
                <td style="font-weight: 700; color: #b91c1c;">Bed ${transfer.fromBedNumber || 'N/A'}</td>
                <td class="label">Source Ward</td>
                <td>${transfer.fromWard || 'N/A'}</td>
              </tr>
              <tr>
                <td class="label">Destination Bed</td>
                <td style="font-weight: 700; color: #15803d;">Bed ${transfer.toBedNumber || 'N/A'}</td>
                <td class="label">Destination Ward</td>
                <td>${transfer.toWard || 'N/A'}</td>
              </tr>
              <tr>
                <td class="label">Authorizing MD</td>
                <td>${transfer.transferredBy || 'Assigned MD'}</td>
                <td class="label">Nurse In-Charge</td>
                <td>${transfer.nurseInCharge || 'On Duty Staff'}</td>
              </tr>
            </table>

            <div class="section-title">Reason for Shifting</div>
            <div class="section-content" style="font-weight: 500;">${transfer.reason}</div>

            <div class="section-title">Clinical Support Requirements During Shifting</div>
            <div class="section-content" style="color: #475569; font-style: italic;">${transfer.clinicalRequirements || 'No special requirements specified. Standard trolley/wheelchair shift.'}</div>

            <div class="footer-sign">
              <div class="sig-box">
                <div class="sig-line">Sending Ward Nurse</div>
              </div>
              <div class="sig-box">
                <div class="sig-line">Receiving Ward Nurse</div>
              </div>
              <div class="sig-box">
                <div class="sig-line">Medical Officer / Doctor</div>
              </div>
            </div>
          </div>

          <script>
            window.onload = () => {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    iframeDoc.write(cardHtml);
    iframeDoc.close();

    setTimeout(() => {
      if (iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        
        setTimeout(() => {
          if (document.getElementById(iframeId)) {
            document.body.removeChild(iframe);
          }
        }, 3000);
      }
    }, 500);
  };

  const calculateBedCharges = (patientId: string) => {
    const bed = beds.find(b => b.patientId === patientId || b.patient_id === patientId);
    if (!bed) return 0;
    const rate = MOCK_BED_RATES.find(r => r.type === bed.type)?.rate || 0;
    // Mocking 3 days of stay for demonstration
    return rate * 3;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-medical-blue" />
        <p className="text-muted-foreground animate-pulse">Loading IPD records...</p>
      </div>
    );
  }

  const occupiedBeds = displayBeds.filter(b => b.status === 'Occupied').length;
  const totalBeds = displayBeds.length;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAdmissions = displayAdmissions.filter(a => {
    if (!a.admission_date) return false;
    return a.admission_date.startsWith(todayStr);
  }).length;

  const formatTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return '09:30 AM';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Dynamic, Vibrant, Richly Colored Banner Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-500 text-white p-6 sm:p-8 shadow-xl shadow-blue-100 animate-in fade-in duration-500">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-blue-400/20 blur-3xl pointer-events-none"></div>
        
        <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-[10px] font-black tracking-widest bg-white/20 text-white px-3 py-1 rounded-full uppercase my-1 select-none w-fit">
              ★ INPATIENT PORTAL ACTIVE
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl text-white">
              IPD Management
            </h1>
            <p className="text-blue-50 text-sm font-medium max-w-xl">
              Monitor active clinical wards, assign specific patient beds, review nursing files, and manage comprehensive discharges.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 shadow-inner">
            <div className="relative">
              <Input 
                placeholder="Filter by name or phone..." 
                className="pl-9 w-[220px] bg-white text-slate-800 rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            </div>
            <Button variant="outline" className="gap-2 bg-white/10 text-white border-white/20 hover:bg-white hover:text-indigo-900 rounded-xl font-bold h-10" onClick={handleExportIPD}>
              <Download className="w-4 h-4" />
              Export Status
            </Button>
            {!isAccountant && !isReceptionist && !isDoctor && (
              <Button 
                className="bg-white text-indigo-900 hover:bg-indigo-50 gap-2 rounded-xl font-black h-10 shadow-md"
                onClick={() => setIsAddBedOpen(true)}
              >
                <Plus className="w-4 h-4" />
                Add Bed
              </Button>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isAddBedOpen} onOpenChange={setIsAddBedOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add New Bed</DialogTitle>
            <DialogDescription>Add a new bed to a ward or department.</DialogDescription>
          </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Bed Number</Label>
                    <Input placeholder="e.g. 105" value={newBed.number} onChange={(e) => setNewBed({...newBed, number: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Ward / Department</Label>
                      <button 
                        type="button" 
                        className="text-[11px] font-bold text-teal-700 hover:text-teal-900 underline"
                        onClick={() => setIsAddingCustomWard(!isAddingCustomWard)}
                      >
                        {isAddingCustomWard ? '← Pick from list' : '+ Add New Ward'}
                      </button>
                    </div>

                    {isAddingCustomWard ? (
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Type new ward name..." 
                          value={customWardText} 
                          onChange={(e) => setCustomWardText(e.target.value)} 
                          className="border-teal-300 focus-visible:ring-teal-500"
                        />
                        <Button 
                          type="button"
                          className="bg-teal-600 hover:bg-teal-700 text-white shrink-0"
                          onClick={() => {
                            if (!customWardText.trim()) {
                              toast.error('Enter ward name');
                              return;
                            }
                            handleAddNewWard(customWardText.trim());
                            setNewBed({...newBed, ward: customWardText.trim()});
                            setCustomWardText('');
                            setIsAddingCustomWard(false);
                          }}
                        >
                          Save
                        </Button>
                      </div>
                    ) : (
                      <Select value={newBed.ward} onValueChange={(v) => {
                        if (v === '__ADD_NEW__') {
                          setIsAddingCustomWard(true);
                        } else {
                          setNewBed({...newBed, ward: v});
                        }
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select ward" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 overflow-y-auto">
                          {hospitalWards.map((wardName) => (
                            <SelectItem key={wardName} value={wardName}>
                              {wardName}
                            </SelectItem>
                          ))}
                          <SelectItem value="__ADD_NEW__" className="text-teal-700 font-bold bg-teal-50/50">
                            + Add New Ward...
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Bed Type</Label>
                    <Select value={newBed.type} onValueChange={(v) => setNewBed({...newBed, type: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="General">General</SelectItem>
                        <SelectItem value="ICU">ICU</SelectItem>
                        <SelectItem value="Maternity">Maternity</SelectItem>
                        <SelectItem value="Semi-Private">Semi-Private</SelectItem>
                        <SelectItem value="Private">Private</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <DialogTrigger asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogTrigger>
                  <Button className="bg-medical-blue flex-1" onClick={handleAddBed}>Add Bed</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

      {/* Quick Action Ribbon with Crisp Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <Button 
            variant="outline" 
            className="border-blue-300 text-blue-700 bg-blue-50/80 hover:bg-blue-100 font-bold gap-2 shadow-2xs text-xs sm:text-sm"
            title="Open Official Hospital Admission Sheet & LAMA / DOR Form (A4)"
            onClick={() => {
              setAdmissionSheetPatient(null);
              setAdmissionSheetAdmission(null);
              setIsAdmissionSheetOpen(true);
            }}
          >
            <FileText className="w-4 h-4 text-blue-600" />
            Admission Sheet & LAMA
          </Button>

          <Button 
            variant="outline" 
            className="border-teal-300 text-teal-700 bg-teal-50/80 hover:bg-teal-100 font-bold gap-2 shadow-2xs text-xs sm:text-sm"
            title="Print Bilingual General Admission Consent Form (द्विभाषी सामान्य सहमति पत्र)"
            onClick={() => {
              setGeneralConsentPatient(null);
              setGeneralConsentAdmission(null);
              setSelectedGeneralConsent(null);
              setIsGeneralConsentOpen(true);
            }}
          >
            <Printer className="w-4 h-4 text-teal-600" />
            General Consent Form
          </Button>

          <Button 
            variant="outline" 
            className="border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 font-bold gap-2 shadow-2xs text-xs sm:text-sm"
            title="Manage & Print Informed Consent for High Risk & Poor Prognosis (गंभीर स्थिति सहमति पत्र)"
            onClick={() => {
              setPoorPrognosisPatient(null);
              setPoorPrognosisAdmission(null);
              setIsPoorPrognosisOpen(true);
            }}
          >
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            Poor Prognosis Consent
          </Button>
        </div>

        {!isAccountant && (
          <Button 
            className="bg-medical-blue gap-2 font-bold text-xs sm:text-sm shadow-md" 
            onClick={() => {
              setAdmissionForm({ patientId: '', doctorId: '', ward: '', bedId: '', urgency: 'Routine', caseType: 'General' });
              setPatientSearchTerm('');
              setIsAdmissionOpen(true);
            }}
          >
            <UserPlus className="w-4 h-4" />
            New Admission
          </Button>
        )}
      </div>

          <Dialog open={isAdmissionOpen} onOpenChange={setIsAdmissionOpen}>
            <DialogContent className="sm:max-w-[520px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-medical-blue font-bold">
                  <UserPlus className="w-5 h-5 text-teal-600" />
                  Inpatient Bed Allotment & Admission
                </DialogTitle>
                <DialogDescription>Allocate a bed and register patient into IPD.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-3">
                <div className="space-y-2 relative">
                  <Label className="text-xs font-bold text-slate-700">Patient (Search by Name, MRN or Phone)</Label>
                  <div className="relative">
                    <Input 
                      placeholder="Start typing name, phone or MRN..." 
                      value={patientSearchTerm}
                      onChange={(e) => {
                        setPatientSearchTerm(e.target.value);
                        setShowPatientResults(true);
                        if (e.target.value === '') {
                          setAdmissionForm({...admissionForm, patientId: ''});
                        }
                      }}
                      onFocus={() => setShowPatientResults(true)}
                      className="border-slate-300"
                    />
                    <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                  
                  {showPatientResults && patientSearchTerm.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-[220px] overflow-y-auto custom-scrollbar">
                      {patients.filter(p => 
                        (p.name.toLowerCase().includes(patientSearchTerm.toLowerCase()) || 
                        (p.phone || '').includes(patientSearchTerm) ||
                        (p.mrn || '').toLowerCase().includes(patientSearchTerm.toLowerCase())) &&
                        p.status !== 'Discharged' && p.status !== 'discharged' &&
                        p.status !== 'Admitted' && p.status !== 'admitted'
                      ).length > 0 ? (
                        patients.filter(p => 
                          (p.name.toLowerCase().includes(patientSearchTerm.toLowerCase()) || 
                          (p.phone || '').includes(patientSearchTerm) ||
                          (p.mrn || '').toLowerCase().includes(patientSearchTerm.toLowerCase())) &&
                          p.status !== 'Discharged' && p.status !== 'discharged' &&
                          p.status !== 'Admitted' && p.status !== 'admitted'
                        ).map(p => (
                          <div 
                            key={p.id} 
                            className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex justify-between items-center border-b border-slate-100 last:border-0"
                            onClick={() => {
                              const docId = p.attending_doctor_id || p.attendingDoctorId || p.doctor_id || p.doctorId || admissionForm.doctorId || '';
                              const defWard = p.department || p.ward || admissionForm.ward || '';
                              setAdmissionForm({
                                ...admissionForm, 
                                patientId: p.id,
                                doctorId: docId,
                                ward: defWard
                              });
                              setPatientSearchTerm(p.name);
                              setShowPatientResults(false);
                            }}
                          >
                            <div>
                              <p className="text-sm font-medium text-slate-800">{p.name}</p>
                              <p className="text-[11px] text-muted-foreground">{p.phone} • MRN: {p.mrn || 'N/A'}</p>
                            </div>
                            {admissionForm.patientId === p.id && <CheckCircle2 className="w-4 h-4 text-medical-blue" />}
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-4 text-center text-sm text-muted-foreground">
                          No matching unadmitted patients found.
                        </div>
                      )}
                    </div>
                  )}

                  {admissionForm.patientId && (
                    (() => {
                      const selectedPatient = patients.find(p => p.id === admissionForm.patientId);
                      return selectedPatient ? (
                        <div className="mt-2 p-2.5 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between gap-3 shadow-xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
                              <User className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-blue-900 truncate">
                                {selectedPatient.name}
                              </p>
                              <p className="text-[11px] text-blue-700 truncate">
                                {selectedPatient.age || '—'} yrs • {selectedPatient.gender || '—'} • MRN: {selectedPatient.mrn || 'N/A'}
                              </p>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-blue-500 hover:text-blue-700 hover:bg-blue-100 shrink-0"
                            onClick={() => {
                              setAdmissionForm({...admissionForm, patientId: ''});
                              setPatientSearchTerm('');
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : null;
                    })()
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">Attending Doctor</Label>
                  <Select 
                    value={admissionForm.doctorId}
                    onValueChange={(v) => setAdmissionForm({...admissionForm, doctorId: v})}
                  >
                    <SelectTrigger className="border-slate-300">
                      <SelectValue placeholder="Select doctor">
                        {(() => {
                          const doc = doctorsList.find(u => u.id === admissionForm.doctorId || u.name === admissionForm.doctorId);
                          return doc ? `${doc.name}${doc.degree ? ` - ${doc.degree}` : ''}` : undefined;
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      {doctorsList.map(doc => (
                        <SelectItem key={doc.id} value={doc.id}>
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-800">{doc.name} {doc.degree ? ` - ${doc.degree}` : ''}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {doc.department || 'Clinical'} {doc.specialization ? `• ${doc.specialization}` : ''}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">Ward / Department</Label>
                  <Select 
                    value={admissionForm.ward}
                    onValueChange={(v) => {
                      const currentBed = beds.find(b => b.id === admissionForm.bedId);
                      const matches = currentBed && (
                        !v || 
                        currentBed.ward?.toLowerCase().includes(v.toLowerCase()) || 
                        v.toLowerCase().includes(currentBed.ward?.toLowerCase() || '')
                      );
                      setAdmissionForm({
                        ...admissionForm, 
                        ward: v, 
                        bedId: matches ? admissionForm.bedId : ''
                      });
                    }}
                  >
                    <SelectTrigger className="border-slate-300">
                      <SelectValue placeholder="Select ward (e.g., General Ward, ICU, Deluxe)" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      {hospitalWards.map((wName) => (
                        <SelectItem key={wName} value={wName}>{wName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">Bed Number (Available)</Label>
                  <Select 
                    value={admissionForm.bedId}
                    onValueChange={(v) => {
                      const b = beds.find(x => x.id === v);
                      setAdmissionForm({
                        ...admissionForm, 
                        bedId: v,
                        ward: b?.ward || admissionForm.ward
                      });
                    }}
                  >
                    <SelectTrigger className="border-slate-300">
                      <SelectValue placeholder="Select available bed">
                        {(() => {
                          const b = beds.find(x => x.id === admissionForm.bedId);
                          return b ? `Bed ${b.bed_number || b.number} (${b.bed_type || b.type}${b.ward ? ` • ${b.ward}` : ''})` : undefined;
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      {(() => {
                        const availableBeds = beds.filter(b => {
                          const isSelected = b.id === admissionForm.bedId;
                          const isAvailable = b.status?.toLowerCase() === 'available';
                          const matchesWard = !admissionForm.ward || 
                            b.ward?.toLowerCase().includes(admissionForm.ward.toLowerCase()) || 
                            admissionForm.ward.toLowerCase().includes(b.ward?.toLowerCase() || '');
                          return isSelected || (isAvailable && matchesWard);
                        });
                        return availableBeds.length > 0 ? (
                          availableBeds.map(b => (
                            <SelectItem key={b.id} value={b.id}>
                              Bed {b.bed_number || b.number} ({b.bed_type || b.type}{b.ward ? ` • ${b.ward}` : ''})
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem disabled value="none">No available beds found</SelectItem>
                        );
                      })()}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700">Admission Urgency</Label>
                    <Select 
                      value={admissionForm.urgency || 'Routine'}
                      onValueChange={(v) => setAdmissionForm({...admissionForm, urgency: v})}
                    >
                      <SelectTrigger className="border-slate-300">
                        <SelectValue placeholder="Select urgency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Routine">🟢 Routine</SelectItem>
                        <SelectItem value="Urgent">🟡 Urgent</SelectItem>
                        <SelectItem value="Emergency">🔴 Emergency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700">Case Classification</Label>
                    <Select 
                      value={admissionForm.caseType || 'General'}
                      onValueChange={(v) => setAdmissionForm({...admissionForm, caseType: v})}
                    >
                      <SelectTrigger className="border-slate-300">
                        <SelectValue placeholder="Select case classification" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="General">General / Routine</SelectItem>
                        <SelectItem value="Emergency">🚨 Emergency</SelectItem>
                        <SelectItem value="MLC">🚨 Medico-Legal (MLC)</SelectItem>
                        <SelectItem value="PMLC">⚠️ Pre-MLC (PMLC)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setIsAdmissionOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-6" 
                  onClick={async () => {
                    const payload = {
                      patient_id: admissionForm.patientId,
                      bed_id: admissionForm.bedId,
                      doctor_id: admissionForm.doctorId || null,
                      ward: admissionForm.ward,
                      urgency: admissionForm.urgency || 'Routine',
                      case_type: admissionForm.caseType || 'General',
                      status: 'Admitted'
                    };

                    const validation = validateAdmissionFields(payload, beds, patients);
                    if (!validation.isValid) {
                      validation.errors.forEach(err => toast.error(err));
                      return;
                    }

                    try {
                      const syncedAdmission = await supabaseService.createAdmission(payload);

                      if (syncedAdmission) {
                        // Update bed status in Supabase
                        const updatedBed = await supabaseService.updateBedStatus(admissionForm.bedId, 'Occupied', admissionForm.patientId);
                        
                        // Update patient status in Supabase
                        await supabaseService.updatePatient(admissionForm.patientId, { 
                          needs_admission: false, 
                          status: 'Admitted',
                          attending_doctor_id: admissionForm.doctorId || null,
                          attendingDoctorId: admissionForm.doctorId || null
                        });

                        // Update local state
                        setPatients(patients.map(p => 
                          p.id === admissionForm.patientId ? { 
                            ...p, 
                            needs_admission: false, 
                            needsAdmission: false, 
                            status: 'Admitted',
                            attending_doctor_id: admissionForm.doctorId || null,
                            attendingDoctorId: admissionForm.doctorId || null
                          } : p
                        ));

                        setAdmissions([syncedAdmission, ...admissions]);

                        if (updatedBed) {
                          setBeds(beds.map(b => b.id === admissionForm.bedId ? updatedBed : b));
                        }

                        // Broadcast sync events
                        try {
                          window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table: 'beds', action: 'update' } }));
                          window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table: 'patients', action: 'update' } }));
                          window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table: 'admissions', action: 'update' } }));
                        } catch (e) {
                          // ignore event dispatch errors
                        }

                        toast.success('Patient admitted and bed allocated successfully!');
                        setIsAdmissionOpen(false);
                        setAdmissionForm({ patientId: '', doctorId: '', ward: '', bedId: '', urgency: 'Routine', caseType: 'General' });
                        setPatientSearchTerm('');
                      } else {
                        toast.error('Failed to record admission. The database rejected the insertion request.');
                      }
                    } catch (dbError: any) {
                      toast.error(`Database Rejection: ${dbError.message || dbError}`);
                    }
                  }}
                >
                  Confirm Admission
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

      {pendingAdmissions.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 animate-in fade-in slide-in-from-top-2 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-amber-950">{pendingAdmissions.length} Pending IPD Transfer Request{pendingAdmissions.length > 1 ? 's' : ''}</h4>
                {pendingAdmissions.length > 1 && (
                  <button 
                    onClick={handleDismissAllTransferRequests}
                    className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 underline ml-2"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <p className="text-xs text-amber-800 font-medium">Patients marked for admission from OPD require inpatient bed allocation.</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {pendingAdmissions.map(p => (
              <div key={p.id} className="inline-flex items-center rounded-lg border border-amber-300 bg-white shadow-xs overflow-hidden">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-amber-900 hover:bg-amber-100 font-bold px-3 h-8 text-xs flex items-center gap-1.5 rounded-r-none border-r border-amber-200"
                  onClick={() => {
                    const docId = p.attending_doctor_id || p.attendingDoctorId || p.doctor_id || p.doctorId || '';
                    const defWard = p.department || p.ward || '';
                    setAdmissionForm({ 
                      ...admissionForm, 
                      patientId: p.id,
                      doctorId: docId,
                      ward: defWard,
                      urgency: 'Routine',
                      caseType: 'General'
                    });
                    setPatientSearchTerm(p.name);
                    setIsAdmissionOpen(true);
                  }}
                >
                  <UserPlus className="w-3.5 h-3.5 text-amber-700" />
                  Admit {p.name}
                </Button>
                <button
                  type="button"
                  title="Dismiss transfer request"
                  className="px-2 h-8 text-amber-500 hover:text-rose-600 hover:bg-rose-50 transition-colors flex items-center justify-center text-xs font-bold"
                  onClick={() => handleDismissTransferRequest(p.id)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Horizontal Navigation Tabs - High contrast active styling */}
      <div className="flex flex-wrap items-center bg-slate-100/90 p-1.5 rounded-xl gap-1.5 border border-slate-200 shadow-inner w-full mb-3 animate-in fade-in duration-200">
        {!isDoctor && (
          <Button 
            variant="ghost"
            size="sm" 
            onClick={() => setActiveTab('registration')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === 'registration' 
                ? 'bg-teal-600 text-white shadow-md hover:bg-teal-700' 
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            Registration
          </Button>
        )}
        <Button 
          variant="ghost"
          size="sm" 
          onClick={() => {
            setActiveTab('beds');
            setBedSubTab('grid');
            setView('beds');
          }}
          className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
            activeTab === 'beds' 
              ? 'bg-teal-600 text-white shadow-md hover:bg-teal-700' 
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          Bed Allotment
        </Button>
        {!isReceptionist && (
          <Button 
            variant="ghost"
            size="sm" 
            onClick={() => setActiveTab('surgery')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === 'surgery' 
                ? 'bg-teal-600 text-white shadow-md hover:bg-teal-700' 
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            Surgery Details
          </Button>
        )}
        <Button 
          variant="ghost"
          size="sm" 
          onClick={() => setActiveTab('discharge')}
          className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
            activeTab === 'discharge' 
              ? 'bg-teal-600 text-white shadow-md hover:bg-teal-700' 
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          Discharge Summary
        </Button>
        <Button 
          variant="ghost"
          size="sm" 
          onClick={() => setActiveTab('shifting')}
          className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
            activeTab === 'shifting' 
              ? 'bg-teal-600 text-white shadow-md hover:bg-teal-700' 
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          Intra-Hospital Shifting
        </Button>
        <Button 
          variant="ghost"
          size="sm" 
          onClick={() => setActiveTab('initial-evaluation')}
          className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'initial-evaluation' 
              ? 'bg-teal-600 text-white shadow-md hover:bg-teal-700' 
              : 'text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200'
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5 text-teal-600" />
          Initial Evaluation Sheet
        </Button>
        <Button 
          variant="ghost"
          size="sm" 
          onClick={() => {
            setActiveTab('general-consent');
            setActiveStatutoryTab('general_consent');
          }}
          className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'general-consent' 
              ? 'bg-blue-700 text-white shadow-md hover:bg-blue-800' 
              : 'text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-blue-600" />
          General Consents ({generalConsentsList.length})
        </Button>
        <Button 
          variant="ghost"
          size="sm" 
          onClick={() => {
            setActiveTab('poor-prognosis');
            setActiveStatutoryTab('poor_prognosis');
          }}
          className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'poor-prognosis' 
              ? 'bg-rose-700 text-white shadow-md hover:bg-rose-800' 
              : 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
          Poor Prognosis Consents ({poorPrognosisList.length})
        </Button>
        <Button 
          variant="ghost"
          size="sm" 
          onClick={() => {
            setActiveTab('lama-death');
            setActiveStatutoryTab('lama_deceased');
          }}
          className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'lama-death' 
              ? 'bg-rose-600 text-white shadow-md hover:bg-rose-700' 
              : 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 fill-rose-200 text-rose-600" />
          LAMA & Death Register
        </Button>
        <Button 
          variant="ghost"
          size="sm" 
          onClick={() => setActiveTab('specialist-consultations')}
          className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'specialist-consultations' 
              ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700' 
              : 'text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
          Specialist Consultations
        </Button>
      </div>

      {activeTab === 'specialist-consultations' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <VisitingConsultants user={currentUser} embedded={true} />
        </div>
      )}

      {activeTab === 'initial-evaluation' && (
        <InitialEvaluationSheetComponent 
          patients={patients}
          admissions={admissions}
          beds={beds}
          users={users}
        />
      )}

      {activeTab === 'beds' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Top 4 Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card id="ipd-stats-card-occupied" className="border-none shadow-sm bg-blue-50/70 border border-blue-100">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-100 text-blue-700">
                  <BedIcon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{occupiedBeds} / {totalBeds}</p>
                  <p className="text-xs text-blue-800 font-bold uppercase tracking-wider">Beds Occupied</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-emerald-50/70 border border-emerald-100">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-emerald-100 text-emerald-700">
                  <BedIcon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{Math.max(0, totalBeds - occupiedBeds)}</p>
                  <p className="text-xs text-emerald-800 font-bold uppercase tracking-wider">Vacant / Available Beds</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-teal-50/70 border border-teal-100">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-teal-100 text-teal-700">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{todayAdmissions}</p>
                  <p className="text-xs text-teal-800 font-bold uppercase tracking-wider">Today's Admissions</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-rose-50/70 border border-rose-100">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-rose-100 text-rose-700">
                  <AlertTriangle className="w-6 h-6 text-rose-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">
                    {admissions.filter(a => (a.case_type === 'Emergency' || a.referred_by === 'Emergency Triage' || a.department === 'Emergency') && (a.status === 'Admitted' || a.status === 'Active')).length}
                  </p>
                  <p className="text-xs text-rose-800 font-bold uppercase tracking-wider">🚨 Emergency IPD Admits</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category-Wise Bed Summary Table */}
          <Card className="border border-slate-200/80 shadow-sm bg-white overflow-hidden">
            <CardHeader className="p-4 bg-slate-50/80 border-b border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <BedIcon className="w-4 h-4 text-indigo-600" />
                  Category-Wise Bed & Ward Summary
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Detailed status of Bed Types, Wards, Total Capacity, Occupied Count, and Vacant Beds
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-bold text-[10px]">
                  {displayBeds.filter(b => b.status !== 'Occupied').length} Vacant
                </Badge>
                <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-bold text-[10px]">
                  {displayBeds.filter(b => b.status === 'Occupied').length} Occupied
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-xs font-bold text-slate-700">Ward / Department</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">Bed Type</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 text-center">Total Beds</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 text-center">Occupied</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 text-center">Vacant</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">Bed Numbers</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 text-right">Occupancy %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bedSummaryByCategory.length > 0 ? (
                    bedSummaryByCategory.map((cat) => {
                      const occPct = cat.total > 0 ? Math.round((cat.occupied / cat.total) * 100) : 0;
                      return (
                        <TableRow key={cat.categoryKey} className="hover:bg-indigo-50/30 transition-colors">
                          <TableCell className="font-bold text-xs text-slate-800">
                            {cat.ward}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600 font-medium">
                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-bold">
                              {cat.bedType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-mono font-bold text-center text-slate-800">
                            {cat.total}
                          </TableCell>
                          <TableCell className="text-xs text-center">
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                              {cat.occupied}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-center">
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              {cat.vacant}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600 max-w-[320px]">
                            <div className="flex flex-wrap gap-1">
                              {cat.occupiedBedNumbers.map(n => (
                                <span key={`occ-${n}`} className="px-1.5 py-0.2 text-[10px] font-mono font-bold bg-blue-100 text-blue-800 rounded border border-blue-200" title="Occupied">
                                  Bed {n} (Occ)
                                </span>
                              ))}
                              {cat.vacantBedNumbers.map(n => (
                                <span key={`vac-${n}`} className="px-1.5 py-0.2 text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 rounded border border-emerald-200" title="Vacant">
                                  Bed {n}
                                </span>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${occPct > 80 ? 'bg-rose-500' : occPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                                  style={{ width: `${occPct}%` }}
                                />
                              </div>
                              <span className="text-xs font-mono font-bold text-slate-700">{occPct}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4 text-xs text-slate-400">
                        No beds configured yet. Click "Add Bed" to create one.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
              <Button 
                variant={view === 'beds' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setView('beds')}
                className={view === 'beds' ? 'bg-white shadow-sm font-bold' : 'font-medium'}
              >
                Bed Cards Grid
              </Button>
              <Button 
                variant={view === 'admissions' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setView('admissions')}
                className={view === 'admissions' ? 'bg-white shadow-sm font-bold flex items-center gap-1.5' : 'font-medium flex items-center gap-1.5'}
              >
                Active Admissions
                <Badge variant="outline" className="text-[10px] ml-0.5 bg-blue-50 text-blue-700 border-blue-200 font-bold px-1.5 py-0 h-4">
                  {admissions.filter(a => a.status === 'Admitted' || a.status === 'Active' || !a.status).length}
                </Badge>
                {admissions.filter(a => (a.case_type === 'Emergency' || a.referred_by === 'Emergency Triage' || a.department === 'Emergency') && a.status === 'Admitted').length > 0 && (
                  <Badge className="bg-rose-500 text-white text-[9px] px-1.5 py-0 h-4 border-none font-bold">
                    {admissions.filter(a => (a.case_type === 'Emergency' || a.referred_by === 'Emergency Triage' || a.department === 'Emergency') && a.status === 'Admitted').length} Emergency
                  </Badge>
                )}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-bold border-rose-200 bg-rose-50/70 text-rose-700 hover:bg-rose-100 hover:text-rose-800 gap-1.5 shadow-2xs"
                onClick={() => {
                  setSelectedPurgeIds([]);
                  setPurgeConfirmationStep(false);
                  setIsPurgeOldAdmissionsOpen(true);
                }}
                title="Delete or cleanup old / stale active patient admissions"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                Delete Old Records
                {(() => {
                  const oldActiveCount = admissions.filter(a => {
                    if (a.status !== 'Admitted' && a.status !== 'Active' && a.status) return false;
                    const days = getDaysSinceAdmission(a.admission_date || a.created_at);
                    return days >= 14;
                  }).length;
                  return oldActiveCount > 0 ? (
                    <Badge className="bg-rose-600 text-white text-[9px] px-1.5 py-0 h-4 border-none font-bold">
                      {oldActiveCount} &gt;14d
                    </Badge>
                  ) : null;
                })()}
              </Button>
            </div>
          </div>

          {view === 'beds' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {displayBeds.filter(bed => {
                if (!searchQuery) return true;
                const bedPatId = bed.patient_id || bed.patientId;
                const patient = bedPatId ? patients.find(p => String(p.id) === String(bedPatId)) : null;
                const query = searchQuery.toLowerCase();
                const numMatch = String(bed.bed_number || '').toLowerCase().includes(query);
                const wardMatch = String(bed.ward || '').toLowerCase().includes(query);
                const typeMatch = String(bed.bed_type || '').toLowerCase().includes(query);
                if (!patient) return numMatch || wardMatch || typeMatch;
                return patient.name.toLowerCase().includes(query) || 
                       (patient.phone || '').includes(searchQuery) ||
                       (patient.mrn || '').toLowerCase().includes(query) ||
                       numMatch || wardMatch || typeMatch;
              }).map((bed) => {
                const bedPatId = bed.patient_id || bed.patientId;
                const patient = bedPatId ? patients.find(p => String(p.id) === String(bedPatId)) : null;
                const admission = bedPatId ? admissions.find(a => String(a.bed_id) === String(bed.id) && String(a.patient_id || a.patientId) === String(bedPatId) && a.status === 'Admitted') : null;
                const docId = admission?.doctor_id || admission?.doctorId || patient?.attending_doctor_id || patient?.attendingDoctorId;
                const doctor = docId ? users.find(u => 
                  String(u.id) === String(docId) || 
                  String(u.name).trim().toLowerCase() === String(docId).trim().toLowerCase()
                ) : null;
                const urgency = admission?.urgency || bed.urgency;
                return (
                  <Card key={bed.id} className={`border-none shadow-sm transition-all hover:ring-2 hover:ring-medical-blue/10 ${bed.status === 'Occupied' ? 'bg-white' : 'bg-slate-50/50'}`}>
                    <CardHeader className="p-4 pb-2">
                       <div className="flex items-center justify-between">
                        <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-tight ${
                          bed.status === 'Available' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' :
                          bed.status === 'Occupied' ? 'text-blue-600 bg-blue-50 border-blue-100' :
                          'text-amber-600 bg-amber-50 border-amber-100'
                        }`}>
                          {bed.status}
                        </Badge>
                          <div className="flex gap-1">
                            {urgency && (
                              <Badge className={`${getUrgencyColor(urgency as string)} text-[9px] border-none`}>
                                {urgency}
                              </Badge>
                            )}
                            {bed.status === 'Occupied' && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 text-medical-blue" 
                                  title="Patient 360 Overview"
                                  onClick={() => navigate(`/patient-overview?id=${patient?.id}`)}
                                >
                                  <Activity className="w-3 h-3" />
                                </Button>
                                {!isAccountant && !isDoctor && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 text-amber-500" 
                                    title="Transfer Bed"
                                    onClick={() => {
                                      setTransferData({ patientId: bed.patient_id!, fromBedId: bed.id, toBedId: '' });
                                      setIsTransferOpen(true);
                                    }}
                                  >
                                    <ArrowLeftRight className="w-3 h-3" />
                                  </Button>
                                )}
                                {!isAccountant && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 text-rose-500 hover:bg-rose-50 hover:text-rose-600" 
                                    title="Discharge Patient" 
                                    onClick={() => openQuickDischargeModal(bed)}
                                  >
                                    <LogOut className="w-3 h-3" />
                                  </Button>
                                )}
                                {admission && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 text-rose-500 hover:bg-rose-100 hover:text-rose-700" 
                                    title="Delete Active Admission Record"
                                    onClick={() => openDeleteAdmissionModal(admission, patient, bed)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                )}
                              </>
                            )}
                            {!isAccountant && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 text-slate-400 hover:bg-blue-50 hover:text-medical-blue"
                                  title="Edit Bed & Ward Details"
                                  onClick={() => openEditBedModal(bed)}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                {!isDeleteForbidden && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 text-rose-500 hover:bg-rose-50 hover:text-rose-600 cursor-pointer" 
                                    title="Delete Bed"
                                    onClick={() => openDeleteBedModal(bed)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                      </div>
                      <CardTitle className="text-lg mt-2 font-bold">Bed {bed.bed_number}</CardTitle>
                      <CardDescription className="text-[10px] uppercase font-bold tracking-wider">{bed.ward}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      {patient ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                              {patient.name.charAt(0)}
                            </div>
                            <div className="overflow-hidden">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-sm font-semibold truncate">{patient.name}</p>
                                {admission?.case_type && admission.case_type !== 'General' && (
                                  <Badge className={`${
                                    admission.case_type === 'Emergency' || admission.referred_by === 'Emergency Triage' ? 'bg-rose-600 hover:bg-rose-700' :
                                    admission.case_type === 'MLC' ? 'bg-red-600 hover:bg-red-700' : 
                                    'bg-amber-500 hover:bg-amber-600'
                                  } text-white text-[8px] h-4 px-1.5 border-none font-black uppercase tracking-wider`}>
                                    {admission.case_type === 'Emergency' || admission.referred_by === 'Emergency Triage' ? '🚨 Emergency' : admission.case_type}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground">{patient.phone} • {patient.mrn}</p>
                            </div>
                          </div>

                          {doctor && (
                            <div className="p-2 rounded bg-slate-50 border border-slate-100">
                              <p className="text-[9px] font-bold text-slate-400 uppercase">Attending Doctor</p>
                              <p className="text-[11px] font-medium text-slate-700">{doctor.name}</p>
                              <p className="text-[9px] text-slate-500">{doctor.department} • {doctor.specialization}</p>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] font-bold gap-1 border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100"
                              onClick={() => {
                                handlePrintAdmissionSlip({ admission, patient, bed, doctor });
                              }}
                            >
                              <FileText className="w-3 h-3 text-teal-600" />
                              Slip
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] font-bold gap-1 border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100"
                              title="Official Inpatient Admission Sheet & LAMA / DOR Record (A4)"
                              onClick={() => {
                                setAdmissionSheetPatient(patient);
                                setAdmissionSheetAdmission({
                                  ...admission,
                                  ward: bed?.ward || admission?.ward,
                                  bedNumber: bed?.bed_number || bed?.number || admission?.bed_number,
                                  doctorName: doctor?.name,
                                  admissionDate: admission?.admission_date
                                });
                                setIsAdmissionSheetOpen(true);
                              }}
                            >
                              <FileText className="w-3 h-3 text-indigo-600" />
                              Admission Sheet
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] font-bold gap-1 border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100"
                              title="Print Bilingual General Consent Form (द्विभाषी सहमति पत्र)"
                              onClick={async () => {
                                const existing = await supabaseService.getGeneralConsentByAdmissionId(admission.id || patient.id);
                                setSelectedGeneralConsent(existing);
                                setGeneralConsentPatient(patient);
                                setGeneralConsentAdmission({
                                  ...admission,
                                  ward: bed?.ward || admission?.ward,
                                  bed_number: bed?.bed_number || bed?.number || admission?.bed_number,
                                  doctorName: doctor?.name,
                                  admission_date: admission?.admission_date
                                });
                                setIsGeneralConsentOpen(true);
                              }}
                            >
                              <Printer className="w-3 h-3 text-blue-600" />
                              Consent Form
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] font-bold gap-1 border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100"
                              title="Manage & Print Poor Prognosis Consent (गंभीर स्थिति सहमति पत्र)"
                              onClick={() => {
                                setPoorPrognosisPatient(patient);
                                setPoorPrognosisAdmission({
                                  ...admission,
                                  ward: bed?.ward || admission?.ward,
                                  bed_number: bed?.bed_number || bed?.number || admission?.bed_number,
                                  doctorName: doctor?.name,
                                  admission_date: admission?.admission_date
                                });
                                setIsPoorPrognosisOpen(true);
                              }}
                            >
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              Poor Prognosis
                            </Button>

                            {!isReceptionist && !isAccountant && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 text-[10px] gap-1"
                                onClick={() => {
                                  const currentVitals = storage.get(STORAGE_KEYS.PATIENT_VITALS, []);
                                  const patientVitals = currentVitals.find((v: any) => v.patientId === patient.id || v.patient_id === patient.id);
                                  setVitalsForm({
                                    patientId: patient.id,
                                    bp: patientVitals?.bp || '120/80',
                                    pulse: patientVitals?.pulse || '78',
                                    temp: patientVitals?.temp || '98.6',
                                    spo2: patientVitals?.spo2 || '98',
                                    rr: patientVitals?.rr || '18',
                                    weight: patientVitals?.weight || '',
                                    height: patientVitals?.height || '',
                                    bmi: patientVitals?.bmi || '',
                                    cbs: patientVitals?.cbsValue || patientVitals?.cbs || '',
                                    cbsContext: patientVitals?.cbsContext || 'Random',
                                    painScore: patientVitals?.painScore ? String(patientVitals.painScore).split('/')[0] : '0',
                                    painSite: patientVitals?.painSite || '',
                                    o2Support: patientVitals?.o2Support || 'Room Air',
                                    o2Flow: patientVitals?.o2Flow || '',
                                    gcsEye: '4',
                                    gcsVerbal: '5',
                                    gcsMotor: '6',
                                    crt: patientVitals?.crt || '< 2 secs',
                                    abdominalGirth: patientVitals?.abdominalGirth || '',
                                    intakeOral: '',
                                    intakeIV: '',
                                    outputUrine: '',
                                    outputDrain: '',
                                    perAbdomen: patientVitals?.perAbdomen || '',
                                    localExam: patientVitals?.localExam || '',
                                    inputOutput: patientVitals?.inputOutput || '',
                                    recordedByRole: 'Nurse',
                                    recordedByName: '',
                                    customVitals: Array.isArray(patientVitals?.customVitals) ? patientVitals.customVitals : []
                                  });
                                  setIsVitalsOpen(true);
                                }}
                              >
                                <Activity className="w-3 h-3" />
                                Vitals
                              </Button>
                            )}

                            <Dialog open={isVitalsOpen} onOpenChange={setIsVitalsOpen}>
                              <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto rounded-3xl">
                                <DialogHeader className="border-b pb-3">
                                  <div className="flex items-center justify-between">
                                    <DialogTitle className="text-lg font-black flex items-center gap-2 text-indigo-950">
                                      <Activity className="w-5 h-5 text-emerald-600" />
                                      IPD Patient Vitals & Measurements Log
                                    </DialogTitle>
                                    <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[10px] font-bold">
                                      IPD Ward Entry
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-slate-500 font-medium mt-1">
                                    Record clinical measurements for <span className="font-bold text-slate-800">{patients.find(p => p.id === vitalsForm.patientId)?.name}</span>.
                                  </p>
                                </DialogHeader>

                                <div className="py-2 space-y-4">
                                  {/* Staff Metadata */}
                                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                    <div className="space-y-1">
                                      <Label className="text-[10px] text-slate-500 uppercase font-bold">Recorded By Role</Label>
                                      <select
                                        value={vitalsForm.recordedByRole}
                                        onChange={(e) => setVitalsForm({ ...vitalsForm, recordedByRole: e.target.value })}
                                        className="w-full h-8 text-xs border rounded-lg px-2 bg-white font-medium text-slate-800"
                                      >
                                        <option value="Nurse">Staff Nurse</option>
                                        <option value="Doctor">Attending Doctor / Resident</option>
                                        <option value="Nursing Station">Nursing Station In-Charge</option>
                                        <option value="Admin">Clinical Admin / ICU Tech</option>
                                      </select>
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-[10px] text-slate-500 uppercase font-bold">Attending Staff Name</Label>
                                      <Input
                                        placeholder="e.g. Nurse Priya / Dr. Sharma"
                                        value={vitalsForm.recordedByName}
                                        onChange={(e) => setVitalsForm({ ...vitalsForm, recordedByName: e.target.value })}
                                        className="h-8 text-xs bg-white"
                                      />
                                    </div>
                                  </div>

                                  {/* Standard Vitals */}
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-indigo-50/20 p-3 rounded-2xl border border-indigo-100/60">
                                    <div className="space-y-1">
                                      <Label className="text-[10px] text-slate-600 uppercase font-bold">BP (mmHg)</Label>
                                      <Input 
                                        placeholder="120/80" 
                                        value={vitalsForm.bp} 
                                        onChange={(e) => setVitalsForm({...vitalsForm, bp: e.target.value})}
                                        className="h-8 text-xs bg-white"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-[10px] text-slate-600 uppercase font-bold">Pulse (/min)</Label>
                                      <Input 
                                        placeholder="78" 
                                        value={vitalsForm.pulse} 
                                        onChange={(e) => setVitalsForm({...vitalsForm, pulse: e.target.value})}
                                        className="h-8 text-xs bg-white"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-[10px] text-slate-600 uppercase font-bold">Temp (°F)</Label>
                                      <Input 
                                        placeholder="98.6" 
                                        value={vitalsForm.temp} 
                                        onChange={(e) => setVitalsForm({...vitalsForm, temp: e.target.value})}
                                        className="h-8 text-xs bg-white"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-[10px] text-slate-600 uppercase font-bold">SpO2 (%)</Label>
                                      <Input 
                                        placeholder="98" 
                                        value={vitalsForm.spo2} 
                                        onChange={(e) => setVitalsForm({...vitalsForm, spo2: e.target.value})}
                                        className="h-8 text-xs bg-white"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-[10px] text-slate-600 uppercase font-bold">Resp Rate (/min)</Label>
                                      <Input 
                                        placeholder="18" 
                                        value={vitalsForm.rr} 
                                        onChange={(e) => setVitalsForm({...vitalsForm, rr: e.target.value})}
                                        className="h-8 text-xs bg-white"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-[10px] text-slate-600 uppercase font-bold">Weight (kg)</Label>
                                      <Input 
                                        placeholder="65" 
                                        value={vitalsForm.weight} 
                                        onChange={(e) => {
                                          const w = e.target.value;
                                          const h = vitalsForm.height;
                                          let bmiVal = '';
                                          if (w && h) {
                                            const hM = parseFloat(h) / 100;
                                            if (hM > 0) bmiVal = (parseFloat(w) / (hM * hM)).toFixed(1);
                                          }
                                          setVitalsForm({ ...vitalsForm, weight: w, bmi: bmiVal });
                                        }}
                                        className="h-8 text-xs bg-white"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-[10px] text-slate-600 uppercase font-bold">Height (cm)</Label>
                                      <Input 
                                        placeholder="170" 
                                        value={vitalsForm.height} 
                                        onChange={(e) => {
                                          const h = e.target.value;
                                          const w = vitalsForm.weight;
                                          let bmiVal = '';
                                          if (w && h) {
                                            const hM = parseFloat(h) / 100;
                                            if (hM > 0) bmiVal = (parseFloat(w) / (hM * hM)).toFixed(1);
                                          }
                                          setVitalsForm({ ...vitalsForm, height: h, bmi: bmiVal });
                                        }}
                                        className="h-8 text-xs bg-white"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-[10px] text-teal-700 uppercase font-bold">BMI</Label>
                                      <Input 
                                        readOnly 
                                        placeholder="Auto" 
                                        value={vitalsForm.bmi} 
                                        className="h-8 text-xs bg-teal-50 font-bold text-teal-900 border-teal-200 cursor-not-allowed"
                                      />
                                    </div>
                                  </div>

                                  {/* Extra IPD Measurements */}
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-sky-50/20 p-3 rounded-2xl border border-sky-100/60">
                                    <div className="space-y-1">
                                      <Label className="text-[10px] text-sky-900 uppercase font-bold">O2 Support</Label>
                                      <select
                                        value={vitalsForm.o2Support}
                                        onChange={(e) => setVitalsForm({ ...vitalsForm, o2Support: e.target.value })}
                                        className="w-full h-8 text-xs border border-sky-200 rounded-lg px-2 bg-white"
                                      >
                                        <option value="Room Air">Room Air</option>
                                        <option value="Nasal Cannula">Nasal Cannula</option>
                                        <option value="Face Mask">Face Mask</option>
                                        <option value="Venturi Mask">Venturi Mask</option>
                                        <option value="BiPAP / CPAP">BiPAP / CPAP</option>
                                        <option value="Ventilator">Mechanical Ventilator</option>
                                      </select>
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-[10px] text-amber-900 uppercase font-bold">Blood Glucose (mg/dL)</Label>
                                      <div className="flex gap-1">
                                        <Input 
                                          placeholder="110" 
                                          value={vitalsForm.cbs} 
                                          onChange={(e) => setVitalsForm({ ...vitalsForm, cbs: e.target.value })}
                                          className="h-8 text-xs bg-white border-amber-200 flex-1"
                                        />
                                        <select
                                          value={vitalsForm.cbsContext}
                                          onChange={(e) => setVitalsForm({ ...vitalsForm, cbsContext: e.target.value })}
                                          className="h-8 text-[10px] border border-amber-200 rounded px-1 bg-white font-semibold"
                                        >
                                          <option value="Fasting">Fasting</option>
                                          <option value="Random">Random</option>
                                          <option value="Post-Prandial">PP</option>
                                        </select>
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-[10px] text-rose-900 uppercase font-bold">Pain Score (VAS 0-10)</Label>
                                      <Input 
                                        placeholder="e.g. 2/10 Abdomen" 
                                        value={vitalsForm.painScore ? `${vitalsForm.painScore}/10 ${vitalsForm.painSite}` : ''} 
                                        onChange={(e) => setVitalsForm({ ...vitalsForm, painScore: e.target.value })}
                                        className="h-8 text-xs bg-white border-rose-200"
                                      />
                                    </div>
                                  </div>

                                  {/* Fluid Balance Breakdown */}
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-emerald-50/20 p-3 rounded-2xl border border-emerald-100/60">
                                    <div className="space-y-1">
                                      <Label className="text-[10px] text-emerald-900 uppercase font-bold">Oral Intake (ml)</Label>
                                      <Input 
                                        placeholder="e.g. 1200" 
                                        value={vitalsForm.intakeOral} 
                                        onChange={(e) => setVitalsForm({ ...vitalsForm, intakeOral: e.target.value })}
                                        className="h-8 text-xs bg-white border-emerald-200"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-[10px] text-emerald-900 uppercase font-bold">IV Intake (ml)</Label>
                                      <Input 
                                        placeholder="e.g. 1000" 
                                        value={vitalsForm.intakeIV} 
                                        onChange={(e) => setVitalsForm({ ...vitalsForm, intakeIV: e.target.value })}
                                        className="h-8 text-xs bg-white border-emerald-200"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-[10px] text-amber-900 uppercase font-bold">Urine Output (ml)</Label>
                                      <Input 
                                        placeholder="e.g. 1500" 
                                        value={vitalsForm.outputUrine} 
                                        onChange={(e) => setVitalsForm({ ...vitalsForm, outputUrine: e.target.value })}
                                        className="h-8 text-xs bg-white border-amber-200"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-[10px] text-amber-900 uppercase font-bold">Drain Output (ml)</Label>
                                      <Input 
                                        placeholder="e.g. 200" 
                                        value={vitalsForm.outputDrain} 
                                        onChange={(e) => setVitalsForm({ ...vitalsForm, outputDrain: e.target.value })}
                                        className="h-8 text-xs bg-white border-amber-200"
                                      />
                                    </div>
                                  </div>

                                  {/* Systemic Examination */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                                    <div className="space-y-1">
                                      <Label className="text-[10px] font-bold text-sky-700 uppercase">Per Abdomen (P/A)</Label>
                                      <Input 
                                        value={vitalsForm.perAbdomen} 
                                        onChange={(e) => setVitalsForm({...vitalsForm, perAbdomen: e.target.value})}
                                        placeholder="e.g. Soft, Non-tender"
                                        className="h-8 text-xs bg-white"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-[10px] font-bold text-amber-700 uppercase">Local Examination</Label>
                                      <Input 
                                        value={vitalsForm.localExam} 
                                        onChange={(e) => setVitalsForm({...vitalsForm, localExam: e.target.value})}
                                        placeholder="e.g. Surgical site clean & dry"
                                        className="h-8 text-xs bg-white"
                                      />
                                    </div>
                                  </div>

                                  {/* PROVISION FOR CUSTOM VITALS & MEASUREMENTS */}
                                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50/60 p-3.5 rounded-2xl border border-purple-200/80 space-y-3">
                                    <datalist id="ipd-custom-vitals-presets">
                                      <option value="Central Venous Pressure (CVP)">cmH2O</option>
                                      <option value="Intracranial Pressure (ICP)">mmHg</option>
                                      <option value="Peak Expiratory Flow Rate (PEFR)">L/min</option>
                                      <option value="End-Tidal CO2 (ETCO2)">mmHg</option>
                                      <option value="Fetal Heart Rate (FHR)">bpm</option>
                                      <option value="Blood Lactate">mmol/L</option>
                                      <option value="Blood Ketones">mmol/L</option>
                                      <option value="Bladder Pressure">mmHg</option>
                                    </datalist>

                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                      <div className="flex items-center gap-1.5">
                                        <Sparkles className="w-4 h-4 text-purple-700" />
                                        <span className="font-extrabold text-xs text-purple-900 uppercase tracking-wide">
                                          Custom Vitals & Special Measurements Provision
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        {['CVP (cmH2O)', 'Peak Flow (L/min)', 'ETCO2 (mmHg)', 'Fetal HR (bpm)', 'Lactate (mmol/L)'].map((preset) => (
                                          <button
                                            key={preset}
                                            type="button"
                                            onClick={() => {
                                              const [pName, pUnit] = preset.replace(')', '').split(' (');
                                              setCustomIpdMeasurementInput({
                                                name: pName,
                                                value: '',
                                                unit: pUnit || ''
                                              });
                                              toast.info(`Selected ${pName}. Enter value and click + Add.`);
                                            }}
                                            className="text-[10px] bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 font-bold px-2 py-0.5 rounded-full transition-all"
                                          >
                                            + {preset}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    <p className="text-[11px] text-slate-600">
                                      Add any extra clinical parameter or nurse measurement (e.g. CVP, ICP, Peak Flow, ETCO2, Fetal Heart Rate, Lactate, Ketones, Bladder Pressure). Click presets above or fill manually below:
                                    </p>

                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end bg-white p-2.5 rounded-xl border border-purple-100 shadow-sm">
                                      <div className="sm:col-span-1 space-y-1">
                                        <Label className="text-[9px] font-bold text-slate-500 uppercase">Parameter Name</Label>
                                        <Input
                                          list="ipd-custom-vitals-presets"
                                          placeholder="e.g. CVP or Lactate"
                                          value={customIpdMeasurementInput.name}
                                          onChange={(e) => setCustomIpdMeasurementInput({ ...customIpdMeasurementInput, name: e.target.value })}
                                          className="h-8 text-xs bg-slate-50"
                                        />
                                      </div>

                                      <div className="space-y-1">
                                        <Label className="text-[9px] font-bold text-slate-500 uppercase">Value</Label>
                                        <Input
                                          placeholder="e.g. 10 or 1.8"
                                          value={customIpdMeasurementInput.value}
                                          onChange={(e) => setCustomIpdMeasurementInput({ ...customIpdMeasurementInput, value: e.target.value })}
                                          className="h-8 text-xs bg-slate-50"
                                        />
                                      </div>

                                      <div className="space-y-1">
                                        <Label className="text-[9px] font-bold text-slate-500 uppercase">Unit</Label>
                                        <Input
                                          placeholder="e.g. cmH2O or mmol/L"
                                          value={customIpdMeasurementInput.unit}
                                          onChange={(e) => setCustomIpdMeasurementInput({ ...customIpdMeasurementInput, unit: e.target.value })}
                                          className="h-8 text-xs bg-slate-50"
                                        />
                                      </div>

                                      <Button
                                        type="button"
                                        size="sm"
                                        className="h-8 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs gap-1 shadow-xs"
                                        onClick={() => {
                                          if (!customIpdMeasurementInput.name || !customIpdMeasurementInput.value) {
                                            toast.error('Please enter parameter name and value');
                                            return;
                                          }
                                          const newItem = {
                                            id: 'cv-' + Math.random().toString(36).substring(2, 8),
                                            name: customIpdMeasurementInput.name,
                                            value: customIpdMeasurementInput.value,
                                            unit: customIpdMeasurementInput.unit || ''
                                          };
                                          const existing = Array.isArray(vitalsForm.customVitals) ? vitalsForm.customVitals : [];
                                          setVitalsForm({
                                            ...vitalsForm,
                                            customVitals: [...existing, newItem]
                                          });
                                          setCustomIpdMeasurementInput({ name: '', value: '', unit: '' });
                                          toast.success(`Added measurement: ${newItem.name}`);
                                        }}
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        Add
                                      </Button>
                                    </div>

                                    {Array.isArray(vitalsForm.customVitals) && vitalsForm.customVitals.length > 0 && (
                                      <div className="flex flex-wrap gap-2 pt-1">
                                        {vitalsForm.customVitals.map((cv, idx) => (
                                          <div 
                                            key={cv.id || idx}
                                            className="flex items-center gap-1.5 bg-white border border-purple-200 text-purple-950 px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm"
                                          >
                                            <span className="text-purple-700">{cv.name}:</span>
                                            <span>{cv.value} {cv.unit}</span>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const existing = Array.isArray(vitalsForm.customVitals) ? vitalsForm.customVitals : [];
                                                const filtered = existing.filter((_, i) => i !== idx);
                                                setVitalsForm({ ...vitalsForm, customVitals: filtered });
                                              }}
                                              className="text-slate-400 hover:text-rose-600 ml-1"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <DialogFooter className="gap-2 border-t pt-3">
                                  <Button 
                                    type="button"
                                    variant="outline" 
                                    className="border-sky-300 text-sky-800 hover:bg-sky-50 font-bold rounded-xl text-xs gap-1"
                                    onClick={() => {
                                      const curPat = patients.find(p => String(p.id) === String(vitalsForm.patientId));
                                      if (curPat) {
                                        const bedObj = beds.find(b => b.patient_id === curPat.id || b.patientId === curPat.id);
                                        const bedNum = bedObj ? `Bed ${bedObj.number || bedObj.bed_number || bedObj.id}` : 'IPD Ward Bed';
                                        printDailyVitalsAndAdvice(curPat, bedNum);
                                      } else {
                                        toast.error('Patient record not found.');
                                      }
                                    }}
                                  >
                                    <Printer className="w-3.5 h-3.5 text-sky-600" />
                                    Print Vitals & Advice Sheet
                                  </Button>
                                  <Button variant="outline" onClick={() => setIsVitalsOpen(false)} className="rounded-xl text-xs">Cancel</Button>
                                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs gap-1" onClick={() => {
                                    // Compute fluid summary
                                    const inO = parseFloat(vitalsForm.intakeOral || '0');
                                    const inI = parseFloat(vitalsForm.intakeIV || '0');
                                    const outU = parseFloat(vitalsForm.outputUrine || '0');
                                    const outD = parseFloat(vitalsForm.outputDrain || '0');
                                    const tIn = inO + inI;
                                    const tOut = outU + outD;
                                    const netB = tIn - tOut;
                                    const ioSummary = (tIn > 0 || tOut > 0)
                                      ? `In: ${tIn}ml / Out: ${tOut}ml (Net: ${netB >= 0 ? '+' : ''}${netB}ml)`
                                      : vitalsForm.inputOutput;

                                    const currentVitals = storage.get(STORAGE_KEYS.PATIENT_VITALS, []);
                                    const otherVitals = currentVitals.filter((v: any) => v.patientId !== vitalsForm.patientId && v.patient_id !== vitalsForm.patientId);
                                    
                                    const fullRecord = {
                                      ...vitalsForm,
                                      inputOutput: ioSummary,
                                      id: `v-${Date.now()}`,
                                      timestamp: new Date().toISOString()
                                    };

                                    const newVitals = [fullRecord, ...otherVitals];
                                    storage.set(STORAGE_KEYS.PATIENT_VITALS, newVitals);
                                    if (supabaseService.updateVitals) {
                                      supabaseService.updateVitals(fullRecord);
                                    }
                                    window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table: 'patient_vitals', action: 'insert' } }));
                                    logAudit('VITALS_UPDATE', vitalsForm.patientId, fullRecord);
                                    toast.success('IPD vitals & measurements saved successfully');
                                    setIsVitalsOpen(false);
                                  }}>
                                    Save IPD Vitals Record
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>

                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-7 text-[10px] gap-1"
                              onClick={() => {
                                setSelectedPatient(patient);
                                setIsChartOpen(true);
                              }}
                            >
                              <FileText className="w-3 h-3" />
                              Patient Chart
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="py-4 flex flex-col items-center justify-center text-slate-300">
                          <BedIcon className="w-8 h-8 mb-2 opacity-20" />
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ready for Admission</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="border-none shadow-sm overflow-hidden">
              {selectedPurgeIds.length > 0 && (
                <div className="bg-rose-50 border-b border-rose-200 px-4 py-2.5 flex items-center justify-between animate-in fade-in">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-900">
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>{selectedPurgeIds.length} admission record{selectedPurgeIds.length > 1 ? 's' : ''} selected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-slate-600 hover:text-slate-900"
                      onClick={() => setSelectedPurgeIds([])}
                    >
                      Clear Selection
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
                      onClick={() => {
                        setPurgeConfirmationStep(true);
                        setIsPurgeOldAdmissionsOpen(true);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Selected ({selectedPurgeIds.length})
                    </Button>
                  </div>
                </div>
              )}
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                      <TableHead className="w-10 text-center">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 h-4 w-4 cursor-pointer"
                          checked={(() => {
                            const activeAdms = admissions.filter(a => a.status === 'Admitted' || a.status === 'Active' || !a.status);
                            return activeAdms.length > 0 && activeAdms.every(a => selectedPurgeIds.includes(String(a.id)));
                          })()}
                          onChange={(e) => {
                            const activeAdms = admissions.filter(a => a.status === 'Admitted' || a.status === 'Active' || !a.status);
                            if (e.target.checked) {
                              setSelectedPurgeIds(activeAdms.map(a => String(a.id)));
                            } else {
                              setSelectedPurgeIds([]);
                            }
                          }}
                          title="Select / Deselect all active admissions"
                        />
                      </TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Patient</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Bed Details</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Urgency</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Doctor</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Admission & Stay Duration</TableHead>
                      <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const activeAdmissionsList = admissions.filter(a => a.status === 'Admitted' || a.status === 'Active' || !a.status);
                      if (activeAdmissionsList.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-slate-400 italic">
                              No active admissions currently recorded.
                            </TableCell>
                          </TableRow>
                        );
                      }
                      return activeAdmissionsList.map(admission => {
                        const patId = admission.patient_id || admission.patientId;
                        const patient = patients.find(p => String(p.id) === String(patId) || p.mrn === admission.mrn) || {
                          id: patId,
                          name: admission.name || 'Emergency Patient',
                          mrn: admission.mrn || 'N/A',
                          phone: admission.phone || 'N/A'
                        };
                        const bed = beds.find(b => String(b.id) === String(admission.bed_id));
                        const docId = admission.doctor_id || admission.doctorId || patient.attending_doctor_id;
                        const doctor = docId ? users.find(u => String(u.id) === String(docId) || String(u.name).toLowerCase() === String(docId).toLowerCase()) : null;
                        const isEmergency = admission.case_type === 'Emergency' || admission.referred_by === 'Emergency Triage' || admission.department === 'Emergency';
                        const daysSinceAdm = getDaysSinceAdmission(admission.admission_date || admission.created_at);
                        const isSelected = selectedPurgeIds.includes(String(admission.id));

                        return (
                          <TableRow key={admission.id} className={`hover:bg-slate-50/50 transition-colors ${isSelected ? 'bg-rose-50/40' : ''}`}>
                            <TableCell className="text-center">
                              <input
                                type="checkbox"
                                className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 h-4 w-4 cursor-pointer"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedPurgeIds(prev => [...prev, String(admission.id)]);
                                  } else {
                                    setSelectedPurgeIds(prev => prev.filter(id => id !== String(admission.id)));
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isEmergency ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-600'}`}>
                                  {patient.name?.charAt(0) || 'P'}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="text-sm font-bold text-slate-900">{patient.name}</p>
                                    {isEmergency && (
                                      <Badge className="bg-rose-600 text-white text-[8px] h-4 px-1.5 border-none font-black uppercase tracking-wider">
                                        🚨 Emergency Admit
                                      </Badge>
                                    )}
                                    {admission.case_type && admission.case_type !== 'General' && admission.case_type !== 'Emergency' && (
                                      <Badge className="bg-amber-500 text-white text-[8px] h-4 px-1 border-none font-black uppercase tracking-wider">
                                        {admission.case_type}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-slate-500 font-medium">MRN: {patient.mrn || admission.mrn || 'N/A'}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-0.5">
                                {bed ? (
                                  <>
                                    <p className="text-sm font-bold text-medical-blue">Bed {bed.bed_number}</p>
                                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{bed.ward} ({bed.bed_type})</p>
                                  </>
                                ) : (
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-7 text-[10px] border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold"
                                    onClick={() => {
                                      setAdmissionForm({
                                        ...admissionForm,
                                        patientId: patient.id || patId,
                                        urgency: 'Emergency',
                                        caseType: 'Emergency',
                                        ward: 'Emergency'
                                      });
                                      setActiveTab('admission');
                                    }}
                                  >
                                    + Allocate IPD Bed
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${getUrgencyColor((admission.urgency || "Routine") as string)} text-[9px] border-none font-bold`}>
                                {admission.urgency || "Routine"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm font-medium text-slate-800">{doctor?.name || 'Assigned Specialist'}</p>
                              <p className="text-[10px] text-slate-400 font-medium">{doctor?.department || 'Emergency / IPD'}</p>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs font-semibold text-slate-700">
                                    {admission.admission_date ? formatDate(admission.admission_date) : 'Today'}
                                  </p>
                                  {admission.admission_time && (
                                    <span className="text-[10px] text-slate-400 font-mono">({admission.admission_time})</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Badge 
                                    variant="outline" 
                                    className={`text-[9px] px-1.5 py-0 h-4 border font-bold flex items-center gap-0.5 ${
                                      daysSinceAdm >= 30 
                                        ? 'bg-rose-50 text-rose-700 border-rose-300' 
                                        : daysSinceAdm >= 14 
                                        ? 'bg-amber-50 text-amber-700 border-amber-300' 
                                        : 'bg-slate-50 text-slate-600 border-slate-200'
                                    }`}
                                  >
                                    <Clock className="w-2.5 h-2.5" />
                                    {daysSinceAdm === 0 ? 'Admitted today' : `${daysSinceAdm} day${daysSinceAdm > 1 ? 's' : ''} stay`}
                                  </Badge>
                                  {daysSinceAdm >= 14 && (
                                    <span className="text-[9px] font-bold text-amber-600 uppercase tracking-tighter">
                                      Old Record
                                    </span>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-medical-blue hover:bg-blue-50" 
                                  title="Open Patient Chart" 
                                  onClick={() => { setSelectedPatient(patient); setIsChartOpen(true); }}
                                >
                                  <FileText className="w-4 h-4" />
                                </Button>
                                {!isAccountant && bed && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-slate-400 hover:text-medical-blue hover:bg-blue-50" 
                                    title="Edit Bed Configuration" 
                                    onClick={() => openEditBedModal(bed)}
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                                {!isAccountant && bed && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600" 
                                    title="Discharge Patient" 
                                    onClick={() => openQuickDischargeModal(bed)}
                                  >
                                    <LogOut className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-rose-500 hover:bg-rose-100 hover:text-rose-700" 
                                  title="Delete Active Admission Record" 
                                  onClick={() => openDeleteAdmissionModal(admission, patient, bed)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      });
                    })()}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'registration' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-300">
          {/* Left panel: Registered & Pending Patients (Span 5) */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
                <CardTitle className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-teal-600" />
                  Pre-Admission & Search
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Find patient to admit or register a new one.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-600">Select Existing Patient</Label>
                  <div className="relative">
                    <Input
                      placeholder="Type patient name or phone..."
                      value={patientSearchTerm}
                      onChange={(e) => {
                        setPatientSearchTerm(e.target.value);
                        setShowPatientResults(true);
                        if (e.target.value === '') {
                          setAdmissionForm({ ...admissionForm, patientId: '' });
                        }
                      }}
                      onFocus={() => setShowPatientResults(true)}
                    />
                    <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                  
                  {showPatientResults && patientSearchTerm.length > 0 && (
                    <div className="relative z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-[180px] overflow-y-auto custom-scrollbar">
                      {patients.filter(p => 
                        (p.name.toLowerCase().includes(patientSearchTerm.toLowerCase()) || 
                        (p.phone || '').includes(patientSearchTerm) ||
                        (p.mrn || '').toLowerCase().includes(patientSearchTerm.toLowerCase())) &&
                        p.status !== 'Discharged' && p.status !== 'discharged' &&
                        p.status !== 'Admitted' && p.status !== 'admitted'
                      ).length > 0 ? (
                        patients.filter(p => 
                          (p.name.toLowerCase().includes(patientSearchTerm.toLowerCase()) || 
                          (p.phone || '').includes(patientSearchTerm) ||
                          (p.mrn || '').toLowerCase().includes(patientSearchTerm.toLowerCase())) &&
                          p.status !== 'Discharged' && p.status !== 'discharged' &&
                          p.status !== 'Admitted' && p.status !== 'admitted'
                        ).map(p => (
                          <div 
                            key={p.id} 
                            className="px-3 py-2 hover:bg-slate-50 cursor-pointer flex justify-between items-center border-b border-slate-100 last:border-0"
                            onClick={() => {
                              const defaultDoc = users.find(u => u.role?.toUpperCase() === 'DOCTOR' || u.role?.toUpperCase() === 'SUPER_ADMIN' || u.role?.toUpperCase() === 'SURGEON');
                              const defaultBed = beds.find(b => b.status?.toLowerCase() === 'available');
                              const isEmg = p.registrationType === 'Emergency' || p.registration_type === 'Emergency' || p.is_emergency || p.urgency === 'Emergency' || p.type === 'Emergency' || p.department === 'Emergency';
                              setAdmissionForm({
                                ...admissionForm,
                                patientId: p.id,
                                doctorId: admissionForm.doctorId || defaultDoc?.id || '',
                                ward: admissionForm.ward || (isEmg ? 'Emergency' : defaultBed?.ward || ''),
                                bedId: admissionForm.bedId || defaultBed?.id || '',
                                urgency: isEmg ? 'Emergency' : (p.urgency || admissionForm.urgency || 'Routine'),
                                caseType: isEmg ? 'Emergency' : (admissionForm.caseType || 'General')
                              });
                              setPatientSearchTerm(p.name);
                              setShowPatientResults(false);
                            }}
                          >
                            <div>
                              <p className="text-xs font-bold text-slate-800">{p.name}</p>
                              <p className="text-[10px] text-muted-foreground">{p.phone} • MRN: {p.mrn}</p>
                            </div>
                            {admissionForm.patientId === p.id && <CheckCircle2 className="w-4 h-4 text-teal-600" />}
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                          No patients found.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Pending Requests */}
                <div className="border-t border-slate-100 pt-4">
                  <h4 className="text-xs font-black uppercase text-amber-600 tracking-wider mb-2 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Pending OPD Admit Requests ({pendingAdmissions.length})
                  </h4>
                  {pendingAdmissions.length > 0 ? (
                    <div className="space-y-2 max-h-[140px] overflow-y-auto custom-scrollbar">
                      {pendingAdmissions.map(p => (
                        <div key={p.id} className="p-2 border border-amber-100 bg-amber-50/50 rounded-xl flex items-center justify-between text-xs">
                          <div>
                            <p className="font-bold text-amber-900">{p.name}</p>
                            <p className="text-[10px] text-amber-700">MRN: {p.mrn || 'N/A'}</p>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="h-7 text-[10px] font-bold border-amber-200 text-amber-700 bg-white hover:bg-amber-100"
                            onClick={() => {
                              const defaultDoc = users.find(u => u.role?.toUpperCase() === 'DOCTOR' || u.role?.toUpperCase() === 'SUPER_ADMIN' || u.role?.toUpperCase() === 'SURGEON');
                              const defaultBed = beds.find(b => b.status?.toLowerCase() === 'available');
                              const isEmg = p.registrationType === 'Emergency' || p.registration_type === 'Emergency' || p.is_emergency || p.urgency === 'Emergency' || p.type === 'Emergency' || p.department === 'Emergency';
                              setAdmissionForm({
                                ...admissionForm,
                                patientId: p.id,
                                doctorId: admissionForm.doctorId || defaultDoc?.id || '',
                                ward: admissionForm.ward || (isEmg ? 'Emergency' : defaultBed?.ward || ''),
                                bedId: admissionForm.bedId || defaultBed?.id || '',
                                urgency: isEmg ? 'Emergency' : (p.urgency || admissionForm.urgency || 'Routine'),
                                caseType: isEmg ? 'Emergency' : (admissionForm.caseType || 'General')
                              });
                              setPatientSearchTerm(p.name);
                              setShowPatientResults(false);
                            }}
                          >
                            Select
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">No pending admission requests from OPD.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
                <CardTitle className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-teal-600" />
                  Quick-Register New Patient
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Create a new patient file instantly.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-slate-600">Full Name</Label>
                    <Input
                      placeholder="Full Name"
                      value={quickPatient.name}
                      onChange={(e) => setQuickPatient({...quickPatient, name: e.target.value})}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-slate-600">Age</Label>
                    <Input
                      type="number"
                      placeholder="Age"
                      value={quickPatient.age}
                      onChange={(e) => setQuickPatient({...quickPatient, age: e.target.value})}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-slate-600">Gender</Label>
                    <Select
                      value={quickPatient.gender}
                      onValueChange={(v) => setQuickPatient({...quickPatient, gender: v})}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-slate-600">Contact Phone</Label>
                    <Input
                      placeholder="e.g. 9876543210"
                      value={quickPatient.phone}
                      onChange={(e) => setQuickPatient({...quickPatient, phone: e.target.value})}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-slate-600">Residential Address</Label>
                  <Input
                    placeholder="Enter short address"
                    value={quickPatient.address}
                    onChange={(e) => setQuickPatient({...quickPatient, address: e.target.value})}
                    className="h-8 text-xs"
                  />
                </div>
                <Button 
                  className="w-full h-8 text-xs font-bold bg-teal-600 hover:bg-teal-700"
                  onClick={handleQuickRegister}
                  disabled={isQuickRegistering}
                >
                  {isQuickRegistering ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      Registering...
                    </>
                  ) : 'Create & Select Patient'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right panel: Admission check-in form (Span 7) */}
          <div className="lg:col-span-7">
            <Card className="border-none shadow-sm bg-white overflow-hidden h-full">
              <CardHeader className="bg-teal-600 text-white p-5">
                <CardTitle className="text-base font-black uppercase tracking-widest flex items-center gap-2">
                  <Building className="w-5 h-5 text-white" />
                  IPD Bed Allocation & Inpatient Check-In
                </CardTitle>
                <CardDescription className="text-teal-100 text-xs mt-1">
                  Finalize ward selection, allocate an active bed, and establish attending clinical oversight.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                {admissionForm.patientId ? (
                  <div className="p-3.5 bg-teal-50 border border-teal-100 rounded-xl flex items-center justify-between animate-in fade-in duration-300">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-sm">
                        {patients.find(p => p.id === admissionForm.patientId)?.name?.charAt(0) || 'P'}
                      </div>
                      <div>
                        <p className="text-sm font-black text-teal-900">
                          {patients.find(p => p.id === admissionForm.patientId)?.name}
                        </p>
                        <p className="text-[10px] text-teal-700 uppercase font-black tracking-wider">
                          MRN: {patients.find(p => p.id === admissionForm.patientId)?.mrn} • {patients.find(p => p.id === admissionForm.patientId)?.age} yrs • {patients.find(p => p.id === admissionForm.patientId)?.gender}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-teal-600 hover:bg-teal-100 rounded-full"
                      onClick={() => {
                        setAdmissionForm({...admissionForm, patientId: ''});
                        setPatientSearchTerm('');
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="p-8 border border-dashed border-slate-200 bg-slate-50/50 rounded-xl text-center text-xs text-slate-400">
                    <UserPlus className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No patient selected yet. Choose a pending request or register a custom file.
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label className="text-xs font-bold text-slate-700">Attending Doctor</Label>
                    <Select 
                      value={admissionForm.doctorId}
                      onValueChange={(v) => setAdmissionForm({...admissionForm, doctorId: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Specify Doctor">
                          {(() => {
                            const doc = doctorsList.find(u => u.id === admissionForm.doctorId || u.name === admissionForm.doctorId);
                            return doc ? `${doc.name} (${doc.department || 'Clinical'})` : undefined;
                          })()}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {doctorsList.map(doc => (
                          <SelectItem key={doc.id} value={doc.id}>
                            {doc.name} ({doc.department || doc.specialization || 'Clinical'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label className="text-xs font-bold text-slate-700">Ward / Service Group</Label>
                    <Select 
                      value={admissionForm.ward}
                      onValueChange={(v) => setAdmissionForm({...admissionForm, ward: v, bedId: ''})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Division" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="General Ward A">General Ward A</SelectItem>
                        <SelectItem value="ICU">ICU Unit</SelectItem>
                        <SelectItem value="Maternity">Maternity Ward</SelectItem>
                        <SelectItem value="Emergency">Emergency Unit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label className="text-xs font-bold text-slate-700">Allocate Bed Number</Label>
                    <Select 
                      value={admissionForm.bedId}
                      disabled={!admissionForm.ward}
                      onValueChange={(v) => setAdmissionForm({...admissionForm, bedId: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={admissionForm.ward ? "Choose Room Bed" : "Select ward first"}>
                          {(() => {
                            const b = beds.find(x => x.id === admissionForm.bedId);
                            return b ? `Bed ${b.bed_number || b.number} (${b.bed_type || b.type})` : undefined;
                          })()}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {(() => {
                          const availableBeds = beds.filter(b => {
                            const isSelected = b.id === admissionForm.bedId;
                            const isAvailable = b.status?.toLowerCase() === 'available';
                            const matchesWard = !admissionForm.ward || 
                              b.ward?.toLowerCase().includes(admissionForm.ward.toLowerCase()) || 
                              admissionForm.ward.toLowerCase().includes(b.ward?.toLowerCase() || '');
                            return isSelected || (isAvailable && matchesWard);
                          });
                          return availableBeds.length > 0 ? (
                            availableBeds.map(b => (
                              <SelectItem key={b.id} value={b.id}>Bed {b.bed_number || b.number} ({b.bed_type || b.type})</SelectItem>
                            ))
                          ) : (
                            <SelectItem disabled value="none">No beds available in this ward</SelectItem>
                          );
                        })()}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label className="text-xs font-bold text-slate-700">Admission Urgency</Label>
                    <Select 
                      value={admissionForm.urgency}
                      onValueChange={(v) => setAdmissionForm({...admissionForm, urgency: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Urgency Level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Routine">Routine / Non-Acute</SelectItem>
                        <SelectItem value="Urgent">Urgent Careful Monitor</SelectItem>
                        <SelectItem value="Emergency">Acute Emergency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label className="text-xs font-bold text-slate-700">Case Classification</Label>
                    <Select 
                      value={admissionForm.caseType || 'General'}
                      onValueChange={(v) => setAdmissionForm({...admissionForm, caseType: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select case type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="General">General / Routine Case</SelectItem>
                        <SelectItem value="Emergency">🚨 Emergency Critical Care</SelectItem>
                        <SelectItem value="MLC">🚨 Medico-Legal Case (MLC)</SelectItem>
                        <SelectItem value="PMLC">⚠️ Pre Medico-Legal Case (PMLC)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-5 mt-4 flex justify-end">
                  <Button 
                    className="w-full sm:w-auto px-8 bg-teal-600 hover:bg-teal-700 text-white font-bold h-11"
                    onClick={async () => {
                      const payload = {
                        patient_id: admissionForm.patientId,
                        bed_id: admissionForm.bedId,
                        doctor_id: admissionForm.doctorId || null,
                        ward: admissionForm.ward,
                        urgency: admissionForm.urgency,
                        case_type: admissionForm.caseType || 'General',
                        status: 'Admitted'
                      };

                      const validation = validateAdmissionFields(payload, beds, patients);
                      if (!validation.isValid) {
                        validation.errors.forEach(err => toast.error(err));
                        return;
                      }

                      try {
                        const syncedAdmission = await supabaseService.createAdmission(payload);

                        if (syncedAdmission) {
                          // Update bed status in Supabase
                          const updatedBed = await supabaseService.updateBedStatus(admissionForm.bedId, 'Occupied', admissionForm.patientId);
                          
                          // Update patient status in Supabase
                          await supabaseService.updatePatient(admissionForm.patientId, { 
                            needs_admission: false, 
                            status: 'Admitted',
                            attending_doctor_id: admissionForm.doctorId || null,
                            attendingDoctorId: admissionForm.doctorId || null
                          });

                          // Update local state
                          setPatients(patients.map(p => 
                            p.id === admissionForm.patientId ? { 
                              ...p, 
                              needs_admission: false, 
                              needsAdmission: false, 
                              status: 'Admitted',
                              attending_doctor_id: admissionForm.doctorId || null,
                              attendingDoctorId: admissionForm.doctorId || null
                            } : p
                          ));

                          setAdmissions([syncedAdmission, ...admissions]);

                          if (updatedBed) {
                            setBeds(beds.map(b => b.id === admissionForm.bedId ? updatedBed : b));
                          }

                          toast.success('Patient admitted and bed allocated successfully!');
                          const selectedPatObj = patients.find(p => p.id === admissionForm.patientId);
                          const selectedBedObj = beds.find(b => b.id === admissionForm.bedId) || updatedBed;
                          const selectedDocObj = users.find(u => u.id === admissionForm.doctorId);

                          const printPayload = {
                            admission: syncedAdmission,
                            patient: selectedPatObj,
                            bed: selectedBedObj,
                            doctor: selectedDocObj
                          };

                          setAdmissionSlipData(printPayload);
                          setGeneralConsentData(printPayload);

                          setTimeout(() => {
                            handlePrintAdmissionSlip(printPayload);
                          }, 300);

                          setAdmissionForm({ patientId: '', doctorId: '', ward: '', bedId: '', urgency: 'Routine' });
                          setPatientSearchTerm('');
                        } else {
                          toast.error('Failed to record admission. The database rejected the insertion request.');
                        }
                      } catch (dbError: any) {
                        toast.error(`Database Rejection: ${dbError.message || dbError}`);
                      }
                    }}
                  >
                    Confirm Inpatient Check-In & Allocate Bed
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'surgery' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-300">
          {/* Left panel: OT Scheduling Form (Span 5) */}
          <div className="lg:col-span-5">
            <Card className="border-none shadow-sm bg-white overflow-hidden h-full">
              <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
                <CardTitle className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2 font-mono">
                  <HeartPulse className="w-4 h-4 text-rose-600" />
                  Schedule Inpatient Surgery
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Plan an operative procedure for a currently checked-in patient.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Select Admitted Inpatient</Label>
                  <Select
                    value={surgeryForm.patientId}
                    onValueChange={(v) => setSurgeryForm({...surgeryForm, patientId: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Inpatient">
                        {(() => {
                          const pat = patients.find(p => p.id === surgeryForm.patientId);
                          return pat ? pat.name : undefined;
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {displayBeds.filter(b => b.status === 'Occupied').map(bed => {
                        const bedPatId = bed.patient_id || bed.patientId;
                        const pat = bedPatId ? patients.find(p => String(p.id) === String(bedPatId)) : null;
                        return pat ? (
                          <SelectItem key={pat.id} value={pat.id}>
                            {pat.name} ({pat.mrn}) • Bed {bed.bed_number}
                          </SelectItem>
                        ) : null;
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Procedure / Surgery Name</Label>
                  <Input
                    placeholder="e.g. Laparoscopic Appendectomy"
                    value={surgeryForm.operationName}
                    onChange={(e) => setSurgeryForm({...surgeryForm, operationName: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label className="text-xs font-bold text-slate-700">Performing Surgeon</Label>
                    <Select
                      value={surgeryForm.surgeonId}
                      onValueChange={(v) => setSurgeryForm({...surgeryForm, surgeonId: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose Surgeon">
                          {(() => {
                            const doc = doctorsList.find(u => u.id === surgeryForm.surgeonId || u.name === surgeryForm.surgeonId);
                            return doc ? `${doc.name} (${doc.department || doc.specialization || 'Surgeon'})` : undefined;
                          })()}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {doctorsList.map(doc => (
                          <SelectItem key={doc.id} value={doc.id}>
                            {doc.name} ({doc.department || doc.specialization || 'Surgery'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label className="text-xs font-bold text-slate-700">Operation Theatre (OT)</Label>
                    <Select
                      value={surgeryForm.theatreId}
                      onValueChange={(v) => setSurgeryForm({...surgeryForm, theatreId: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Assign OT Room" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Major OT-1">Major OT-1 (Ground Floor)</SelectItem>
                        <SelectItem value="Major OT-2">Major OT-2 (Ground Floor)</SelectItem>
                        <SelectItem value="ICU OT">ICU Specialty OT (Floor 2)</SelectItem>
                        <SelectItem value="Emergency OT">Emergency Trauma OT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label className="text-xs font-bold text-slate-700">Surgery Date</Label>
                    <Input
                      type="date"
                      value={surgeryForm.date}
                      onChange={(e) => setSurgeryForm({...surgeryForm, date: e.target.value})}
                    />
                  </div>

                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label className="text-xs font-bold text-slate-700">Scheduled Time</Label>
                    <Input
                      placeholder="e.g. 10:30 AM"
                      value={surgeryForm.startTime}
                      onChange={(e) => setSurgeryForm({...surgeryForm, startTime: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Pre-Operative Instructions & Clinical Notes</Label>
                  <textarea
                    placeholder="Enter pre-op orders, fasting schedules (NBM), anesthesia consultations, or medication protocols..."
                    value={surgeryForm.notes}
                    onChange={(e) => setSurgeryForm({...surgeryForm, notes: e.target.value})}
                    className="w-full min-h-[90px] p-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-medical-blue transition-all"
                  />
                </div>

                <Button 
                  className="w-full bg-rose-600 hover:bg-rose-700 font-bold"
                  onClick={handleScheduleSurgery}
                >
                  Schedule Inpatient Surgery
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right panel: Scheduled Surgeries list (Span 7) */}
          <div className="lg:col-span-7">
            <Card className="border-none shadow-sm bg-white overflow-hidden h-full">
              <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
                <CardTitle className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center justify-between font-mono">
                  <span className="flex items-center gap-2">
                    <History className="w-4 h-4 text-teal-600" />
                    Scheduled Operations & Procedures
                  </span>
                  <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-100 font-black text-[9px]">
                    OT TIMELINE
                  </Badge>
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Active schedules inside hospital Operation Theatres.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                {displayOtSchedules.length > 0 ? (
                  <div className="space-y-3 max-h-[480px] overflow-y-auto custom-scrollbar pr-1">
                    {displayOtSchedules.map((sched: any) => {
                      const pat = patients.find(p => p.id === (sched.patient_id || sched.patientId));
                      const surgeon = users.find(u => u.id === (sched.surgeon_id || sched.surgeonId));
                      const room = theatres.find(t => t.id === (sched.theatreId || sched.theatre_id || sched.room_id || sched.ot_rooms_id));
                      const locationName = room ? room.name : (sched.theatre_id || sched.theatreId || 'OT Unit');
                      return (
                        <div key={sched.id} className="p-3 border border-slate-100 rounded-xl relative overflow-hidden bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                          <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-rose-700 uppercase tracking-wider">{sched.operation_name || sched.operationName}</span>
                              <Badge className="bg-amber-100 hover:bg-amber-100/90 text-amber-800 text-[9px] uppercase border-none ml-1 font-bold">
                                {sched.status || 'Scheduled'}
                              </Badge>
                            </div>
                            <p className="text-xs font-bold text-slate-800 mt-0.5">Patient: {pat ? pat.name : 'Unknown'} ({pat ? pat.mrn : 'N/A'})</p>
                            <p className="text-[10px] text-slate-500 mt-1">
                              Surgeon: <span className="font-semibold text-slate-700">{surgeon ? surgeon.name : 'Unassigned'}</span> • Location: <span className="font-semibold text-slate-700">{locationName}</span>
                            </p>
                            {sched.notes && (
                              <p className="text-[10px] italic text-slate-500 bg-white/75 p-1.5 rounded border border-slate-100 mt-2 line-clamp-1">
                                Notes: {sched.notes}
                              </p>
                            )}
                          </div>
                          
                          <div className="text-left sm:text-right shrink-0 flex flex-row sm:flex-col justify-between sm:justify-center items-center sm:items-end border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0 gap-1.5">
                            <div>
                              <p className="text-xs font-bold text-slate-800">{formatDate(sched.date)}</p>
                              <p className="text-[10px] font-medium text-slate-500">{sched.start_time || sched.startTime || '10:00 AM'}</p>
                            </div>
                            <div className="flex gap-1.5 flex-wrap justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] font-bold text-amber-800 bg-amber-50 border-amber-200 hover:bg-amber-100 gap-1"
                                onClick={() => {
                                  const pObj = pat || { id: sched.patient_id || sched.patientId, name: 'Patient', mrn: 'MRN-00' };
                                  setAorPatientData({
                                    ...pObj,
                                    diagnosis: sched.notes || pObj.diagnosis || 'Surgical Procedure',
                                    assignedDoctor: surgeon ? surgeon.name : pObj.assignedDoctor
                                  });
                                  setIsAorOpen(true);
                                }}
                              >
                                <FileText className="w-3 h-3 text-amber-600" />
                                AOR Record
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] text-slate-600 border-slate-200"
                                onClick={() => {
                                  toast.info(`OT protocol completed for ${sched.operation_name || sched.operationName}`);
                                  setOTSchedules(otSchedules.map(o => o.id === sched.id ? { ...o, status: 'Completed' } : o));
                                }}
                              >
                                Trigger Done
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-300">
                    <HeartPulse className="w-12 h-12 mx-auto mb-3 opacity-20 animate-pulse" />
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">No Scheduled Surgeries Found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'discharge' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-300">
          {/* Left panel: Discharge Summary Form (Span 5) */}
          <div className="lg:col-span-5">
            <Card className="border-none shadow-sm bg-white overflow-hidden h-full">
              <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
                <CardTitle className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2 font-mono">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  Request Check-out & Discharge Summary
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Review vitals, write instructions, select discharge disposition, and discharge.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-3 p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 shadow-sm">
                  {/* Search Input Box */}
                  <div className="space-y-1.5 text-left">
                    <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Search className="w-3.5 h-3.5 text-indigo-600" />
                        Search & Fetch Any Patient
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">By Name, MRN, Phone, or Bed No.</span>
                    </Label>
                    <div className="relative">
                      <Input
                        placeholder="Type Patient Name, MRN, Phone, or Bed No..."
                        value={dischargeSearchTerm}
                        onChange={(e) => {
                          setDischargeSearchTerm(e.target.value);
                          setShowDischargeSearchDropdown(true);
                          if (!e.target.value) {
                            setDischargeForm({ ...dischargeForm, patientId: '' });
                          }
                        }}
                        onFocus={() => setShowDischargeSearchDropdown(true)}
                        className="h-9 bg-white text-xs border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                      {dischargeSearchTerm && (
                        <button
                          type="button"
                          onClick={() => {
                            setDischargeSearchTerm('');
                            setShowDischargeSearchDropdown(false);
                            setDischargeForm({ ...dischargeForm, patientId: '' });
                          }}
                          className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 hover:text-slate-600"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {showDischargeSearchDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-[260px] overflow-y-auto divide-y divide-slate-100">
                        {(() => {
                          const term = (dischargeSearchTerm || '').trim().toLowerCase();
                          const matching = patients.filter((p: any) => {
                            if (!term) return true;
                            const nameMatch = (p.name || '').toLowerCase().includes(term);
                            const phoneMatch = (p.phone || '').includes(term);
                            const mrnMatch = (p.mrn || '').toLowerCase().includes(term);
                            const bed = beds.find(b => String(b.patient_id || b.patientId) === String(p.id));
                            const bedNumStr = bed ? String(bed.bed_number || bed.number || bed.id).toLowerCase() : '';
                            const bedMatch = bedNumStr && bedNumStr.includes(term);
                            const summ = dischargeSummaries.find(s => String(s.patientId || s.patient_id) === String(p.id));
                            const summMrnMatch = summ && (summ.mrn || '').toLowerCase().includes(term);
                            const summContactMatch = summ && (summ.relativeContact || '').includes(term);
                            return nameMatch || phoneMatch || mrnMatch || bedMatch || summMrnMatch || summContactMatch;
                          });

                          if (matching.length === 0) {
                            return (
                              <div className="p-4 text-center text-xs text-slate-400">
                                No matching patient file found for "{dischargeSearchTerm}".
                              </div>
                            );
                          }

                          return matching.map((p: any) => {
                            const bed = beds.find(b => String(b.patient_id || b.patientId) === String(p.id));
                            const recentlyDischargedRec = recentlyDischargedPatients.find(rd => String(rd.patient.id) === String(p.id));
                            const isDischarged = (p.status || '').toLowerCase() === 'discharged' || !!recentlyDischargedRec;
                            const isAdmitted = p.status === 'Admitted' || !!bed;
                            const bedNum = bed ? (bed.bed_number || bed.number || bed.id) : (recentlyDischargedRec?.bedNumber && recentlyDischargedRec.bedNumber !== 'N/A' ? recentlyDischargedRec.bedNumber : null);
                            const dischargeDateStr = recentlyDischargedRec?.dischargeDate || p.dischargeDate || p.discharge_date;

                            return (
                              <div
                                key={p.id}
                                className="px-3 py-2.5 hover:bg-indigo-50/60 cursor-pointer flex justify-between items-center transition-colors text-left"
                                onClick={() => handleSelectPatientForDischarge(p.id)}
                              >
                                <div className="space-y-0.5">
                                  <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                                    {p.name}
                                    {isDischarged ? (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
                                        Discharged Recently
                                      </span>
                                    ) : isAdmitted ? (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-100">
                                        Inpatient
                                      </span>
                                    ) : (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-100">
                                        Outpatient
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-[10px] text-slate-500 font-medium">
                                    MRN: <span className="font-mono text-slate-700 font-bold">{p.mrn || 'N/A'}</span> • Phone: <span className="font-mono text-slate-700">{p.phone || 'N/A'}</span>
                                  </p>
                                  <div className="flex items-center gap-2 text-[9px] text-slate-600 font-semibold">
                                    {bedNum && (
                                      <span className="text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                                        Bed No: {bedNum}
                                      </span>
                                    )}
                                    {isDischarged && dischargeDateStr && (
                                      <span className="text-purple-700 font-bold bg-purple-50 px-1.5 py-0.2 rounded border border-purple-100">
                                        Discharged: {new Date(dischargeDateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Button size="sm" variant="ghost" className="h-7 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200">
                                  {isDischarged ? "Fetch Summary" : "Fetch File"}
                                </Button>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>

                  <div className="text-center text-[9px] font-bold text-slate-400 uppercase tracking-widest my-1.5">
                    - OR SELECT FROM QUICK DROPDOWNS -
                  </div>

                  {/* Two Quick Select Dropdowns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-left">
                    {/* 1. Active Bed Occupants */}
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-600 uppercase flex items-center justify-between">
                        <span>Active Bed Occupants</span>
                        <span className="text-[9px] text-teal-600 font-mono font-bold">({displayBeds.filter(b => b.status === 'Occupied').length})</span>
                      </Label>
                      {(() => {
                        const activeBeds = displayBeds.filter(b => b.status === 'Occupied');
                        const activePatientIds = activeBeds.map(b => String(b.patient_id || b.patientId));
                        const isActiveSelected = activePatientIds.includes(String(dischargeForm.patientId));

                        return (
                          <Select
                            value={isActiveSelected ? dischargeForm.patientId : ''}
                            onValueChange={(v) => handleSelectPatientForDischarge(v)}
                          >
                            <SelectTrigger className="h-9 bg-white text-xs border-slate-300">
                              <SelectValue placeholder="Select Active Inpatient">
                                {isActiveSelected ? (() => {
                                  const pat = patients.find(p => String(p.id) === String(dischargeForm.patientId));
                                  return pat ? pat.name : undefined;
                                })() : undefined}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="max-h-[220px]">
                              {activeBeds.length > 0 ? (
                                activeBeds.map(bed => {
                                  const patId = bed.patient_id || bed.patientId;
                                  const pat = patId ? patients.find(p => String(p.id) === String(patId)) : null;
                                  const bedNum = bed.bed_number || bed.number || bed.id;
                                  return pat ? (
                                    <SelectItem key={pat.id} value={pat.id} className="text-xs">
                                      {pat.name} (MRN: {pat.mrn}) • Phone: {pat.phone || 'N/A'} • Bed {bedNum}
                                    </SelectItem>
                                  ) : null;
                                })
                              ) : (
                                <div className="p-2 text-center text-xs text-slate-400">No active bed occupants currently.</div>
                              )}
                            </SelectContent>
                          </Select>
                        );
                      })()}
                    </div>

                    {/* 2. Recently Discharged Patients (Within 2 Days) */}
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-purple-900 uppercase flex items-center justify-between">
                        <span className="flex items-center gap-1 font-extrabold text-purple-900">
                          Recent Discharges (2 Days)
                        </span>
                        <span className="text-[9px] text-purple-700 font-mono font-bold">({recentlyDischargedPatients.length})</span>
                      </Label>
                      {(() => {
                        const isRecentSelected = recentlyDischargedPatients.some(rd => String(rd.patient.id) === String(dischargeForm.patientId));

                        return (
                          <Select
                            value={isRecentSelected ? dischargeForm.patientId : ''}
                            onValueChange={(v) => handleSelectPatientForDischarge(v)}
                          >
                            <SelectTrigger className="h-9 bg-purple-50/50 border-purple-200 text-xs font-medium text-slate-800">
                              <SelectValue placeholder="Quick Select Discharged Patient">
                                {isRecentSelected ? (() => {
                                  const rec = recentlyDischargedPatients.find(rd => String(rd.patient.id) === String(dischargeForm.patientId));
                                  return rec ? `${rec.patient.name} (${rec.patient.mrn})` : undefined;
                                })() : undefined}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="max-h-[220px]">
                              {recentlyDischargedPatients.length > 0 ? (
                                recentlyDischargedPatients.map(rd => (
                                  <SelectItem key={rd.patient.id} value={rd.patient.id} className="text-xs">
                                    {rd.patient.name} ({rd.patient.mrn}) • Phone: {rd.patient.phone || 'N/A'} {rd.bedNumber !== 'N/A' ? `• Bed ${rd.bedNumber}` : ''} • Discharged: {new Date(rd.dischargeDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                  </SelectItem>
                                ))
                              ) : (
                                <div className="p-2 text-center text-xs text-slate-400">No recent discharges in last 2 days.</div>
                              )}
                            </SelectContent>
                          </Select>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {dischargeForm.patientId && (() => {
                  const pat = patients.find(p => p.id === dischargeForm.patientId);
                  if (!pat) return null;
                  const bed = beds.find(b => b.patient_id === pat.id || b.patientId === pat.id);
                  const dues = checkPatientDues(pat.id);

                  return (
                    <div className="p-3.5 bg-emerald-50/40 border border-emerald-100/50 rounded-xl space-y-2.5 animate-in fade-in duration-200 text-left">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-black text-slate-800">{pat.name}</h4>
                          <p className="text-[10px] text-slate-500 font-bold">MRN: {pat.mrn} • Age: {pat.age} • Gender: {pat.gender}</p>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-black uppercase bg-emerald-100 text-emerald-800">
                          Active Selection
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono border-t border-emerald-100/40 pt-2 bg-white/50 p-2 rounded-lg">
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-bold">Room Allocation:</span>
                          <span className="font-bold text-slate-700">
                            {bed ? `Bed ${bed.bed_number || bed.number} (${bed.ward})` : "No Bed Allocated"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-bold">Dues Summary:</span>
                          <span className={`font-bold ${dues > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                            {dues > 0 ? `₹${dues.toLocaleString()} Outstanding` : "₹0 (Cleared)"}
                          </span>
                        </div>
                      </div>

                      {dues > 0 && (
                        <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 p-2.5 rounded-lg">
                          <input
                            type="checkbox"
                            id="bypassDuesInput"
                            checked={bypassDues}
                            onChange={(e) => setBypassDues(e.target.checked)}
                            className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
                          />
                          <label htmlFor="bypassDuesInput" className="text-[10px] font-bold text-rose-900 cursor-pointer select-none leading-tight">
                            Bypass dues restriction & force discharge execution
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {dischargeForm.patientId && (() => {
                  const patId = dischargeForm.patientId;
                  const checklist = patientChecklists[patId] || {
                    doctorCleared: false,
                    nurseCleared: false,
                    accountsCleared: false,
                    frontOfficeHandedOver: false
                  };
                  const patDues = checkPatientDues(patId);

                  // Active progress status text
                  let progressMessage = "Stage 1: Awaiting Doctor's clinical initiation.";
                  let progressBg = "bg-amber-50 text-amber-805 border-amber-200";
                  if (checklist.doctorCleared && !checklist.nurseCleared) {
                    progressMessage = "Stage 2: Doctor initiated. Awaiting Nurse file audit.";
                    progressBg = "bg-blue-50 text-blue-805 border-blue-200";
                  } else if (checklist.doctorCleared && checklist.nurseCleared && !checklist.accountsCleared) {
                    progressMessage = "Stage 3: Nurse papers verified. Awaiting Accounts clearance.";
                    progressBg = "bg-purple-50 text-purple-805 border-purple-200";
                  } else if (checklist.doctorCleared && checklist.nurseCleared && checklist.accountsCleared && !checklist.frontOfficeHandedOver) {
                    progressMessage = "Stage 4: Accounts cleared. Awaiting final Front Office signed handover.";
                    progressBg = "bg-indigo-50 text-indigo-805 border-indigo-200";
                  } else if (checklist.doctorCleared && checklist.nurseCleared && checklist.accountsCleared && checklist.frontOfficeHandedOver) {
                    progressMessage = "All stages completed! Discharge note handed over safely.";
                    progressBg = "bg-emerald-50 text-emerald-805 border-emerald-200";
                  }

                  return (
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3.5 text-left animate-in fade-in duration-200">
                      <div>
                        <span className="p-1 px-2 rounded bg-indigo-900 text-white font-mono text-[8px] font-black uppercase tracking-widest my-0.5">
                          DISCHARGE PROTOCOL
                        </span>
                        <h4 className="text-xs font-black text-slate-800 mt-1 uppercase tracking-wide">
                          Administrative Discharge Clearance Workflow
                        </h4>
                        <p className="text-[10px] text-slate-500 font-medium">
                          Strict multi-role verification sequence required prior to physical gate checkout.
                        </p>
                      </div>

                      <div className={`p-2 px-3 rounded-lg border text-[10px] font-bold ${progressBg}`}>
                        ● Current Status: {progressMessage}
                      </div>

                      {/* Checklist Iteration */}
                      <div className="space-y-3 pt-1">
                        {/* Step 1: Doctor Initiation */}
                        <div className="flex items-start gap-3 p-2.5 bg-white rounded-xl border border-slate-100 shadow-sm">
                          <input
                            type="checkbox"
                            id="chk-doc"
                            checked={checklist.doctorCleared}
                            onChange={(e) => {
                              const isAuthorized = isCurrentUserAdmin || currentUser?.role === 'DOCTOR' || currentUser?.role === 'SURGEON';
                              if (!isAuthorized) {
                                toast.error("Unauthorized: Only a Medical Doctor, Surgeon, or Master Admin can clinically initiate discharges.");
                                return;
                              }
                              saveChecklist(patId, { doctorCleared: e.target.checked, doctorName: currentUser?.name || 'Attending Doctor' });
                            }}
                            className="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <div className="flex-1 text-xs">
                            <div className="flex items-center justify-between">
                              <label htmlFor="chk-doc" className="font-extrabold text-slate-800 cursor-pointer select-none">
                                Stage 1: Clinical Discharge Initiation
                              </label>
                              <span className="text-[8px] bg-amber-50 rounded border border-amber-200 px-1.5 py-0.5 text-amber-800 font-black tracking-wider uppercase">
                                DOCTOR
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-snug mt-0.5">
                              Doctor (or active MD) authorizes clinical file, enters home medications, and signs off.
                            </p>
                            {checklist.doctorCleared && (
                              <p className="text-[9px] text-emerald-600 font-black flex items-center gap-1 mt-1 font-mono">
                                ✓ Authenticated: {checklist.doctorName || 'Attending MD'}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Step 2: Nursing Paper Audit */}
                        <div className={`flex items-start gap-3 p-2.5 bg-white rounded-xl border border-slate-100 shadow-sm ${(!isCurrentUserAdmin && !checklist.doctorCleared) ? 'opacity-50 pointer-events-none' : ''}`}>
                          <input
                            type="checkbox"
                            id="chk-nurse"
                            checked={checklist.nurseCleared}
                            onChange={(e) => {
                              const isAuthorized = isCurrentUserAdmin || currentUser?.role === 'NURSE';
                              if (!isAuthorized) {
                                toast.error("Unauthorized: Only Nursing staff or Master Admin can audit clinical worksheets.");
                                return;
                              }
                              if (!checklist.doctorCleared && !isCurrentUserAdmin) {
                                toast.error("Process Lock: Stage 1 must be cleared by a Doctor first.");
                                return;
                              }
                              saveChecklist(patId, { nurseCleared: e.target.checked, nurseName: currentUser?.name || 'Ward Nurse' });
                            }}
                            className="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            disabled={!isCurrentUserAdmin && !checklist.doctorCleared}
                          />
                          <div className="flex-1 text-xs">
                            <div className="flex items-center justify-between">
                              <label htmlFor="chk-nurse" className="font-extrabold text-slate-800 cursor-pointer select-none">
                                Stage 2: Nursing Station Verification
                              </label>
                              <span className="text-[8px] bg-blue-50 rounded border border-blue-200 px-1.5 py-0.5 text-blue-800 font-black tracking-wider uppercase">
                                NURSE
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-snug mt-0.5">
                              Nurse station audits physical medical files, reports, vitals history, and attaches diagnostic print sheets.
                            </p>
                            {checklist.nurseCleared && (
                              <p className="text-[9px] text-emerald-600 font-black flex items-center gap-1 mt-1 font-mono">
                                ✓ Verified: {checklist.nurseName || 'Ward Nurse'}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Step 3: Accounts section zero dues check */}
                        <div className={`flex items-start gap-3 p-2.5 bg-white rounded-xl border border-slate-100 shadow-sm ${(!isCurrentUserAdmin && !checklist.nurseCleared) ? 'opacity-50 pointer-events-none' : ''}`}>
                          <input
                            type="checkbox"
                            id="chk-accounts"
                            checked={checklist.accountsCleared}
                            onChange={(e) => {
                              const isAuthorized = isCurrentUserAdmin || currentUser?.role === 'ACCOUNTANT' || currentUser?.role === 'ACCOUNTS';
                              if (!isAuthorized) {
                                toast.error("Unauthorized: Only an Accountant, Finance Auditor, or Master Admin can clear hospital billing dues.");
                                return;
                              }
                              if (!checklist.nurseCleared && !isCurrentUserAdmin) {
                                toast.error("Process Lock: Stage 2 must be completed by Nursing first.");
                                return;
                              }
                              saveChecklist(patId, { accountsCleared: e.target.checked, accountsName: currentUser?.name || 'Accounts Auditor' });
                            }}
                            className="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            disabled={!isCurrentUserAdmin && !checklist.nurseCleared}
                          />
                          <div className="flex-1 text-xs">
                            <div className="flex items-center justify-between">
                              <label htmlFor="chk-accounts" className="font-extrabold text-slate-800 cursor-pointer select-none">
                                Stage 3: Accounts section dues audit
                              </label>
                              <span className="text-[8px] bg-purple-50 rounded border border-purple-200 px-1.5 py-0.5 text-purple-800 font-black tracking-wider uppercase">
                                ACCOUNTS
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-snug mt-0.5">
                              Accounts officer audits final bills, medicines billing, and resolves outstanding dues.
                            </p>
                            {patDues > 0 ? (
                              <p className="text-[9px] text-rose-500 font-black flex items-center gap-1 mt-1 font-mono">
                                ⚠️ Outstanding: ₹{patDues.toLocaleString()} found. Clear dues or click bypass.
                              </p>
                            ) : (
                              <p className="text-[9px] text-emerald-600 font-black flex items-center gap-1 mt-1 font-mono">
                                ✓ Zero Dues Autodetected. Clear to pass.
                              </p>
                            )}
                            {checklist.accountsCleared && (
                              <p className="text-[9px] text-emerald-600 font-black flex items-center gap-1 mt-1 font-mono">
                                ✓ Auditor Cleared: {checklist.accountsName || 'Finance Auditor'}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Step 4: Front Office Handover */}
                        <div className={`flex items-start gap-3 p-2.5 bg-white rounded-xl border border-slate-100 shadow-sm ${(!isCurrentUserAdmin && !checklist.accountsCleared) ? 'opacity-50 pointer-events-none' : ''}`}>
                          <input
                            type="checkbox"
                            id="chk-fo"
                            checked={checklist.frontOfficeHandedOver}
                            onChange={(e) => {
                              const isAuthorized = isCurrentUserAdmin || ['RECEPTION', 'RECEPTIONIST', 'FRONT_DESK'].includes(currentUser?.role || '');
                              if (!isAuthorized) {
                                toast.error("Unauthorized: Only Front Office receptionists or Master Admin can authorize physical gate checkout & release.");
                                return;
                              }
                              if (!checklist.accountsCleared && !isCurrentUserAdmin) {
                                toast.error("Process Lock: Stage 3 must be cleared by Accounts audit first.");
                                return;
                              }
                              saveChecklist(patId, { frontOfficeHandedOver: e.target.checked, frontOfficeName: currentUser?.name || 'FO Receptionist' });
                            }}
                            className="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            disabled={!isCurrentUserAdmin && !checklist.accountsCleared}
                          />
                          <div className="flex-1 text-xs">
                            <div className="flex items-center justify-between">
                              <label htmlFor="chk-fo" className="font-extrabold text-slate-800 cursor-pointer select-none">
                                Stage 4: Final Front Office Handover
                              </label>
                              <span className="text-[8px] bg-indigo-50 rounded border border-indigo-200 px-1.5 py-0.5 text-indigo-800 font-black tracking-wider uppercase">
                                FRONT OFFICE
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-snug mt-0.5">
                              Front Office verifies preceding cleared stages, hands printed Signed Discharge summary slip & gate pass.
                            </p>
                            {checklist.frontOfficeHandedOver && (
                              <p className="text-[9px] text-emerald-600 font-black flex items-center gap-1 mt-1 font-mono">
                                ✓ Handed Over by: {checklist.frontOfficeName || 'FO Officer'}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Official Administrative Bulletin Note */}
                      <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-[10px] text-slate-600 space-y-1">
                        <p className="font-extrabold text-indigo-950 uppercase tracking-widest text-[9px] flex items-center gap-1 font-mono">
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                          Official Policy Protocol Reminder
                        </p>
                        <p className="leading-relaxed font-sans text-slate-600">
                          As per executive hospital clinical guidelines: <br/>
                          1. <strong>Doctor</strong> MUST initiate and declare discharge treatment summary. <br/>
                          2. <strong>Nurse</strong> station reviews files, clinical reports, and counts papers. <br/>
                          3. <strong>Accounts section</strong> audits transactions to confirm there are absolute zero dues. <br/>
                          4. <strong>Front Office desk</strong> acts as final station to check clearances and hand over signed notes.
                        </p>
                      </div>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5 col-span-1">
                    <Label className="text-xs font-bold text-slate-700">Discharge Date</Label>
                    <Input
                      type="date"
                      value={dischargeForm.dischargeDate}
                      onChange={(e) => setDischargeForm({...dischargeForm, dischargeDate: e.target.value})}
                    />
                  </div>

                  <div className="space-y-1.5 col-span-1">
                    <Label className="text-xs font-bold text-slate-700">Discharge Disposition</Label>
                    <Select
                      value={dischargeForm.dischargeType}
                      onValueChange={(v) => setDischargeForm({...dischargeForm, dischargeType: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Routine / Improved">Routine / Improved</SelectItem>
                        <SelectItem value="LAMA (Left Against Medical Advice)">LAMA (Against Advice)</SelectItem>
                        <SelectItem value="Referral to Higher Specialty">Referred to Specialty</SelectItem>
                        <SelectItem value="Absconded">Absconded / Missing</SelectItem>
                        <SelectItem value="Deceased">Deceased</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 col-span-1">
                    <Label className="text-xs font-bold text-slate-700">Follow-Up Clinic Date</Label>
                    <Input
                      type="date"
                      value={dischargeForm.followUpDate}
                      onChange={(e) => setDischargeForm({...dischargeForm, followUpDate: e.target.value})}
                    />
                  </div>

                  <div className="space-y-1.5 col-span-1">
                    <Label className="text-xs font-bold text-slate-700">Discharging Doctor</Label>
                    <Input
                      type="text"
                      placeholder="Doctor name"
                      value={dischargeForm.dischargeBy}
                      onChange={(e) => setDischargeForm({...dischargeForm, dischargeBy: e.target.value})}
                    />
                  </div>
                </div>

                {dischargeForm.patientId && (
                  <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-2.5 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                        <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
                        Clinical Auto-Import Assistant
                      </span>
                      {loadingDischargeAux && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                      )}
                    </div>
                    
                    <p className="text-[10px] text-slate-500 leading-snug">
                      Instantly pull live prescriptions, recent vitals, and physician/nursing observations directly into the fields below to prevent clinical data loss.
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      {/* Prescriptions Import Button */}
                      <div className="p-2 border border-indigo-100 bg-white rounded-lg flex flex-col justify-between">
                        <div>
                          <span className="font-extrabold text-slate-700 block">Medication Record</span>
                          <span className="text-slate-500 block text-[9px] mt-0.5">
                            {dischargeAuxDetails.prescriptions?.length > 0 
                              ? `${dischargeAuxDetails.prescriptions.length} Active prescription(s) found.` 
                              : "No recent prescriptions found."}
                          </span>
                        </div>
                        {dischargeAuxDetails.prescriptions?.length > 0 && (
                          <Button 
                            size="sm" 
                            className="mt-2 h-6 text-[9.5px] font-black bg-indigo-50 text-indigo-700 hover:bg-indigo-100 p-0"
                            onClick={() => {
                              const latestRx = dischargeAuxDetails.prescriptions[0];
                              const medsText = formatPrescriptionToText(latestRx);
                              setDischargeForm(prev => ({ ...prev, medications: medsText }));
                              toast.success("Imported active prescriptions into Take-Home Medications!");
                            }}
                          >
                            Import Prescriptions
                          </Button>
                        )}
                      </div>

                      {/* Clinical Obs & Vitals Summary Auto-Draft Button */}
                      <div className="p-2 border border-indigo-100 bg-white rounded-lg flex flex-col justify-between">
                        <div>
                          <span className="font-extrabold text-slate-700 block">Clinical Summary Draft</span>
                          <span className="text-slate-500 block text-[9px] mt-0.5">
                            {dischargeAuxDetails.vitals?.length > 0 || dischargeAuxDetails.notes?.length > 0
                              ? "Vitals & notes detected to compile." 
                              : "No active vitals/notes recorded yet."}
                          </span>
                        </div>
                        <Button 
                          size="sm" 
                          className="mt-2 h-6 text-[9.5px] font-black bg-indigo-50 text-indigo-700 hover:bg-indigo-100 p-0"
                          onClick={() => {
                            const pat = patients.find(p => p.id === dischargeForm.patientId);
                            const activeAdmission = admissions.find(
                              a => (a.patient_id === dischargeForm.patientId || a.patientId === dischargeForm.patientId) && a.status === 'Admitted'
                            );
                            const reason = activeAdmission?.reason || activeAdmission?.diagnosis || 'Acute medical care';
                            const vitalsText = formatVitalsToText(dischargeAuxDetails.vitals);
                            const notesText = formatNotesToText(dischargeAuxDetails.notes);
                            const draft = generateAutoSummary(pat, reason, vitalsText, notesText);
                            setDischargeForm(prev => ({ 
                              ...prev, 
                              primaryDiagnosis: prev.primaryDiagnosis || reason,
                              dischargeVitals: prev.dischargeVitals || vitalsText,
                              clinicalSummary: draft 
                            }));
                            toast.success("Draft compiled from live vitals, clinical progress notes, and patient files!");
                          }}
                        >
                          Auto-draft Clinical Summary
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Primary & Secondary Diagnosis */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Primary Diagnosis</Label>
                    <Input
                      type="text"
                      placeholder="e.g. Acute Appendicitis / Type 2 Diabetes Mellitus"
                      value={dischargeForm.primaryDiagnosis}
                      onChange={(e) => setDischargeForm({...dischargeForm, primaryDiagnosis: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Secondary Diagnosis / Co-morbidities</Label>
                    <Input
                      type="text"
                      placeholder="e.g. Essential Hypertension, Hypothyroidism"
                      value={dischargeForm.secondaryDiagnosis}
                      onChange={(e) => setDischargeForm({...dischargeForm, secondaryDiagnosis: e.target.value})}
                    />
                  </div>
                </div>

                {/* Operative Procedure & Discharge Vitals */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Operative / Surgical Procedure (if any)</Label>
                    <Input
                      type="text"
                      placeholder="e.g. Laparoscopic Appendectomy under GA on 24-Jul-2026"
                      value={dischargeForm.operativeProcedure}
                      onChange={(e) => setDischargeForm({...dischargeForm, operativeProcedure: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Vital Signs at Discharge</Label>
                    <Input
                      type="text"
                      placeholder="e.g. BP: 120/80 mmHg, PR: 74 bpm, Temp: 98.4°F, SpO2: 99%"
                      value={dischargeForm.dischargeVitals}
                      onChange={(e) => setDischargeForm({...dischargeForm, dischargeVitals: e.target.value})}
                    />
                  </div>
                </div>

                {/* Investigation Highlights */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Diagnostic & Lab Highlights (CBC, LFT, Imaging)</Label>
                  <Input
                    type="text"
                    placeholder="e.g. Hb 13.2 g/dL, TLC 8,400, Normal LFT/KFT. USG Abdomen: Post-op normal healing."
                    value={dischargeForm.investigationHighlights}
                    onChange={(e) => setDischargeForm({...dischargeForm, investigationHighlights: e.target.value})}
                  />
                </div>

                {/* Treatment Summary & Clinical Remarks */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Inpatient Hospital Course & Clinical Remarks</Label>
                  <textarea
                    placeholder="Enter clinical summary of hospital stay, response to IV fluids/antibiotics, surgical recovery, and clinical progress..."
                    value={dischargeForm.clinicalSummary}
                    onChange={(e) => setDischargeForm({...dischargeForm, clinicalSummary: e.target.value})}
                    className="w-full min-h-[90px] p-2.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-medical-blue transition-all"
                  />
                </div>

                {/* Prescribed Take-Home Medications */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Take-Home Prescribed Medications</Label>
                  <textarea
                    placeholder="e.g. 1. Tab. Augmentin 625mg (1-0-1) after food - 5 days&#10;2. Tab. Pan 40mg (1-0-0) empty stomach - 5 days&#10;3. Tab. Zero-P (1-0-1) as needed for pain"
                    value={dischargeForm.medications}
                    onChange={(e) => setDischargeForm({...dischargeForm, medications: e.target.value})}
                    className="w-full min-h-[90px] p-2.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-medical-blue transition-all font-mono"
                  />
                </div>

                {/* Condition at Discharge & Dietary Advice */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Condition at Discharge</Label>
                    <Input
                      type="text"
                      placeholder="e.g. Hemodynamically Stable, Afebrile, Ambulatory"
                      value={dischargeForm.conditionAtDischarge}
                      onChange={(e) => setDischargeForm({...dischargeForm, conditionAtDischarge: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Dietary & Activity Advice</Label>
                    <Input
                      type="text"
                      placeholder="e.g. High protein soft diet, adequate hydration, avoid heavy lifting for 2 weeks"
                      value={dischargeForm.dietaryAdvice}
                      onChange={(e) => setDischargeForm({...dischargeForm, dietaryAdvice: e.target.value})}
                    />
                  </div>
                </div>

                {/* Emergency Warning Symptoms / Red Flags */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-rose-800 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    Emergency Red Flags / Warning Signs
                  </Label>
                  <Input
                    type="text"
                    placeholder="e.g. Fever > 101°F, persistent vomiting, shortness of breath, severe abdominal pain or wound discharge."
                    value={dischargeForm.emergencyWarningSigns}
                    onChange={(e) => setDischargeForm({...dischargeForm, emergencyWarningSigns: e.target.value})}
                  />
                </div>

                <Button 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 font-bold"
                  onClick={handleDischargeWithSummary}
                >
                  Save Inpatient Discharge & Generate Complete Summary
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right panel: Historic Discharge Summaries list / Master Report (Span 7) */}
          <div className="lg:col-span-12 xl:col-span-7">
            <Card className="border-none shadow-sm bg-white overflow-hidden h-full flex flex-col">
              <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2 font-mono">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      Discharge Registry & Master Report
                    </CardTitle>
                    <CardDescription className="text-[11px] mt-0.5">
                      {dischargeRightPaneView === 'timeline' 
                        ? "Visual timeline feed of recently discharged clinical summaries." 
                        : "Master Discharged Patient Register audit sheet with diagnostic & billing details."}
                    </CardDescription>
                  </div>
                  
                  <div className="inline-flex bg-slate-200/60 p-1 rounded-lg border border-slate-200/25 self-start sm:self-center">
                    <button
                      type="button"
                      onClick={() => setDischargeRightPaneView('timeline')}
                      className={`px-3 py-1.5 text-[10px] uppercase font-black tracking-wider transition-all rounded-md ${
                        dischargeRightPaneView === 'timeline'
                          ? 'bg-white text-slate-800 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Audit Feed
                    </button>
                    <button
                      type="button"
                      onClick={() => setDischargeRightPaneView('report')}
                      className={`px-3 py-1.5 text-[10px] uppercase font-black tracking-wider transition-all rounded-md ${
                        dischargeRightPaneView === 'report'
                          ? 'bg-white text-slate-800 shadow-sm animate-pulse'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Full Clinical Report
                    </button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 flex-1">
                {dischargeRightPaneView === 'timeline' ? (
                  dischargeSummaries.length > 0 ? (
                    <div className="space-y-3 max-h-[520px] overflow-y-auto custom-scrollbar pr-1">
                      {dischargeSummaries.map((summary: any) => {
                        const pat = patients.find(p => p.id === (summary.patient_id || summary.patientId)) || MOCK_PATIENTS.find(p => p.id === (summary.patient_id || summary.patientId));
                        const isLama = summary.dischargeType?.includes('LAMA');
                        const isDeath = summary.dischargeType?.includes('Deceased');
                        return (
                          <div key={summary.id || summary.admissionId} className="p-3 border border-slate-100 rounded-xl relative overflow-hidden bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                            <div className={`absolute top-0 left-0 w-1 h-full ${isLama || isDeath ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">{pat ? pat.name : 'Unknown Patient'}</span>
                                <Badge className={`${isLama || isDeath ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'} text-[9px] uppercase border-none font-bold`}>
                                  {summary.dischargeType || 'Routine / Improved'}
                                </Badge>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-1">
                                MRN: <span className="font-semibold text-slate-700">{pat ? pat.mrn : 'N/A'}</span> • Discharged By: <span className="font-semibold text-slate-700">{summary.dischargeBy || 'Duty Doctor'}</span>
                              </p>
                              {summary.clinicalSummary && (
                                <p className="text-[10px] italic text-slate-500 bg-white/75 p-1.5 rounded border border-slate-100 mt-2 line-clamp-1">
                                  Summary: {summary.clinicalSummary}
                                </p>
                              )}
                            </div>
                            
                            <div className="text-left sm:text-right shrink-0 flex flex-row sm:flex-col justify-between sm:justify-center items-center sm:items-end border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0 gap-1.5 font-mono">
                              <div>
                                <p className="text-xs font-bold text-slate-800">{formatDate(summary.dischargeDate)}</p>
                                <p className="text-[10px] font-medium text-slate-500">Follow-up: {summary.followUpDate ? formatDate(summary.followUpDate) : 'None'}</p>
                              </div>
                              <Button
                                size="sm"
                                className="h-7 text-[10px] font-bold bg-teal-600 hover:bg-teal-700 text-white gap-1"
                                onClick={() => {
                                  setDischargedSummaryToShow(summary);
                                  setIsSummaryDetailsOpen(true);
                                }}
                              >
                                <Printer className="w-3 h-3" />
                                View Summary
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-300">
                      <Receipt className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">No Discharge Records Found</p>
                    </div>
                  )
                ) : (
                  /* EXQUISITE DISCHARGE REPORT MODE WITH FULL DETAILS */
                  <div className="space-y-4 text-left">
                    {/* STAT CARDS FOR BRIEF METRIC AUDIT */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                      <div className="p-2.5 bg-white rounded-lg border border-slate-200/60 shadow-sm">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Total Audited</span>
                        <span className="text-base font-black text-slate-800 font-mono">
                          {dischargeSummaries.length}
                        </span>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border border-slate-200/60 shadow-sm">
                        <span className="text-[9px] font-bold text-teal-500 uppercase tracking-widest block">Routine / Impv</span>
                        <span className="text-base font-black text-teal-600 font-mono">
                          {dischargeSummaries.filter(s => (s.dischargeType || '').includes('Routine') || (s.dischargeType || '').includes('Improved')).length}
                        </span>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border border-slate-200/60 shadow-sm">
                        <span className="text-[9px] font-bold text-rose-500 uppercase tracking-widest block">Non-Routine / LAMA</span>
                        <span className="text-base font-black text-rose-600 font-mono">
                          {dischargeSummaries.filter(s => !(s.dischargeType || '').includes('Routine') && !(s.dischargeType || '').includes('Improved')).length}
                        </span>
                      </div>
                    </div>

                    {/* REPORT INTERACTIVE FILTERING CONTROLS */}
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <div className="relative flex-1 w-full">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <Input
                          placeholder="Search report by name, MRN, phone..."
                          value={reportSearchQuery}
                          onChange={(e) => setReportSearchQuery(e.target.value)}
                          className="h-8.5 text-xs pl-8.5 bg-slate-50/30 font-medium"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 w-full sm:w-auto">
                        <Select
                          value={reportTypeFilter}
                          onValueChange={(v) => setReportTypeFilter(v)}
                        >
                          <SelectTrigger className="h-8.5 text-xs font-semibold bg-white w-full sm:w-[170px]">
                            <SelectValue placeholder="Disposition Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="All">All Dispositions</SelectItem>
                            <SelectItem value="Routine / Improved">Routine / Improved</SelectItem>
                            <SelectItem value="LAMA (Left Against Medical Advice)">LAMA (Against Advice)</SelectItem>
                            <SelectItem value="Referral to Higher Specialty">Referred Specialty</SelectItem>
                            <SelectItem value="Absconded">Absconded</SelectItem>
                            <SelectItem value="Deceased">Deceased</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* CLEAR OR EXPORT ACTIONS */}
                        {(reportSearchQuery || reportTypeFilter !== 'All') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setReportSearchQuery('');
                              setReportTypeFilter('All');
                            }}
                            className="h-8.5 text-[10px] text-indigo-600 font-bold bg-indigo-50 hover:bg-indigo-100 px-2"
                          >
                            Reset
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* DISCHARGED PATIENTS DETAIL LIST TABLE / SHEET */}
                    <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white shadow-sm">
                      <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                        <Table className="text-left">
                          <TableHeader className="bg-slate-50 font-semibold sticky top-0 z-10 shadow-sm">
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="text-[10px] uppercase font-black text-slate-500 py-3 font-mono">Patient Details</TableHead>
                              <TableHead className="text-[10px] uppercase font-black text-slate-500 py-3 font-mono">Stay Period</TableHead>
                              <TableHead className="text-[10px] uppercase font-black text-slate-500 py-3 font-mono">Clinical summary</TableHead>
                              <TableHead className="text-[10px] uppercase font-black text-slate-500 py-3 font-mono text-right">Dues / Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {dischargeSummaries.filter(summary => {
                              const pat = patients.find(p => p.id === (summary.patient_id || summary.patientId)) || MOCK_PATIENTS.find(p => p.id === (summary.patient_id || summary.patientId));
                              if (!pat) return false;
                              const matchSearch = (pat.name || '').toLowerCase().includes((reportSearchQuery || '').toLowerCase()) ||
                                                  (pat.mrn || '').toLowerCase().includes((reportSearchQuery || '').toLowerCase()) ||
                                                  (pat.phone || '').includes(reportSearchQuery);
                              const matchFilter = reportTypeFilter === 'All' || summary.dischargeType === reportTypeFilter;
                              return matchSearch && matchFilter;
                            }).length > 0 ? (
                              dischargeSummaries.filter(summary => {
                                const pat = patients.find(p => p.id === (summary.patient_id || summary.patientId)) || MOCK_PATIENTS.find(p => p.id === (summary.patient_id || summary.patientId));
                                if (!pat) return false;
                                const matchSearch = (pat.name || '').toLowerCase().includes((reportSearchQuery || '').toLowerCase()) ||
                                                    (pat.mrn || '').toLowerCase().includes((reportSearchQuery || '').toLowerCase()) ||
                                                    (pat.phone || '').includes(reportSearchQuery);
                                const matchFilter = reportTypeFilter === 'All' || summary.dischargeType === reportTypeFilter;
                                return matchSearch && matchFilter;
                              }).map((summary: any) => {
                                const pat = patients.find(p => p.id === (summary.patient_id || summary.patientId)) || MOCK_PATIENTS.find(p => p.id === (summary.patient_id || summary.patientId)) || { name: 'Unknown', mrn: 'N/A', age: 'N/A', gender: 'N/A', phone: 'N/A' };
                                const admissionRecord = admissions.find(a => a.patient_id === pat.id || a.patientId === pat.id);
                                const isLama = (summary.dischargeType || '').includes('LAMA');
                                const isDeath = (summary.dischargeType || '').includes('Deceased');
                                
                                // Calculate Stay length
                                let stayLengthStr = 'N/A';
                                if (admissionRecord) {
                                  const discT = new Date(summary.dischargeDate).getTime();
                                  const admT = new Date(admissionRecord.admission_date || admissionRecord.created_at).getTime();
                                  const diffDays = Math.max(1, Math.ceil((discT - admT) / (1000 * 60 * 60 * 24)));
                                  stayLengthStr = `${diffDays} Day${diffDays > 1 ? 's' : ''}`;
                                }
                                
                                const duesAtDischarge = checkPatientDues(pat.id);
                                const isExpanded = selectedReportSummaryId === summary.id;

                                return (
                                  <>
                                    <TableRow 
                                      key={summary.id} 
                                      className="hover:bg-slate-50/50 cursor-pointer text-xs"
                                      onClick={() => setSelectedReportSummaryId(isExpanded ? null : summary.id)}
                                    >
                                      <TableCell className="align-top py-3">
                                        <div className="font-black text-slate-800 uppercase flex items-center gap-1.5">
                                          {pat.name}
                                          <span className="text-[9px] text-slate-400 font-medium font-mono">({pat.gender?.charAt(0)})</span>
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-medium font-mono mt-0.5">
                                          MRN: {pat.mrn} • Age: {pat.age}
                                        </div>
                                        <div className="text-[9px] text-slate-400 font-semibold mt-0.5">
                                          Contact: {pat.phone}
                                        </div>
                                      </TableCell>
                                      
                                      <TableCell className="align-top py-3 font-mono">
                                        <div className="text-slate-700 font-bold">
                                          {admissionRecord ? formatDate(admissionRecord.admission_date || admissionRecord.created_at) : 'N/A'}
                                        </div>
                                        <div className="text-slate-400 text-[10px] mt-0.5 arrow-after">
                                          to {formatDate(summary.dischargeDate)}
                                        </div>
                                        <div className="inline-flex items-center gap-1 mt-1 text-[9px] font-black uppercase text-indigo-600 bg-indigo-50/60 px-1 py-0.5 rounded leading-none">
                                          Stay: {stayLengthStr}
                                        </div>
                                      </TableCell>
                                      
                                      <TableCell className="align-top py-3 max-w-[200px]">
                                        <span className={`inline-block text-[9px] uppercase font-black tracking-wide px-1.5 py-0.5 rounded-full mb-1 border ${
                                          isLama || isDeath 
                                            ? 'bg-rose-50 text-rose-700 border-rose-100' 
                                            : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                        }`}>
                                          {summary.dischargeType || 'Routine / Improved'}
                                        </span>
                                        <p className="text-[10px] font-bold text-slate-600 line-clamp-1">
                                          Course: {summary.clinicalSummary || 'No summary notes entered.'}
                                        </p>
                                        <p className="text-[9px] text-slate-400 font-semibold mt-0.5">
                                          Doctor: {summary.dischargeBy || 'Duty Doctor'}
                                        </p>
                                      </TableCell>
                                      
                                      <TableCell className="align-top py-3 text-right">
                                        <div className="font-mono font-bold text-[11px]">
                                          {duesAtDischarge > 0 ? (
                                            <span className="text-rose-600">₹{duesAtDischarge.toLocaleString()} Dues</span>
                                          ) : (
                                            <span className="text-emerald-600">₹0 Completed</span>
                                          )}
                                        </div>
                                        <Badge variant="outline" className={`mt-1 text-[9px] font-extrabold uppercase border-none ${
                                          duesAtDischarge > 0 ? "bg-rose-100/60 text-rose-800" : "bg-emerald-100/60 text-emerald-800"
                                        }`}>
                                          {duesAtDischarge > 0 ? "Forced Out" : "Cleared Account"}
                                        </Badge>
                                        <div className="mt-2.5">
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setDischargedSummaryToShow(summary);
                                              setIsSummaryDetailsOpen(true);
                                            }}
                                            className="h-6 w-16 text-[9px] font-black bg-slate-100 hover:bg-teal-600 hover:text-white transition-colors"
                                          >
                                            PRINT FILE
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>

                                    {/* EXPANDED COMPLETE DETAILS ACCORDION ROW */}
                                    {isExpanded && (
                                      <TableRow className="bg-slate-50/75 border-none p-0 overflow-hidden hover:bg-slate-50/75">
                                        <TableCell colSpan={4} className="p-4 border-t border-b border-slate-100">
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-1 duration-200">
                                            {/* Left Info: Diagnostic summary */}
                                            <div className="space-y-2">
                                              <div className="space-y-1">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">Admission diagnosis / reason</span>
                                                <p className="text-[11px] font-extrabold text-slate-700 bg-white border border-slate-200/50 p-2 rounded-lg">
                                                  {admissionRecord?.reason || admissionRecord?.diagnosis || 'No pre-check reasons recorded.'}
                                                </p>
                                              </div>
                                              <div className="space-y-1">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">Clinical treatment course summary</span>
                                                <p className="text-[11px] font-semibold text-slate-600 bg-white border border-slate-200/50 p-2.5 rounded-lg leading-relaxed whitespace-pre-wrap">
                                                  {summary.clinicalSummary || "No treatment outline recorded."}
                                                </p>
                                              </div>
                                            </div>

                                            {/* Right Info: Prescriptions & Follow up */}
                                            <div className="space-y-2">
                                              <div className="space-y-1">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">Prescribed take-home medications</span>
                                                <div className="text-[11px] font-mono text-indigo-900 bg-indigo-50/30 border border-indigo-100/50 p-2.5 rounded-lg whitespace-pre-wrap leading-relaxed">
                                                  {summary.medications ? summary.medications : "No discharge medications prescribed."}
                                                </div>
                                              </div>
                                              
                                              <div className="grid grid-cols-3 gap-2 pt-1 font-mono">
                                                <div className="bg-white border border-slate-200/50 p-2 rounded-lg text-center">
                                                  <span className="text-[8px] font-black text-slate-400 uppercase block">Discharge Date</span>
                                                  <span className="text-[11px] font-bold text-slate-800 block mt-0.5 leading-tight animate-fade-in">
                                                    {summary.dischargeDate ? formatDate(summary.dischargeDate) : "N/A"}
                                                  </span>
                                                </div>
                                                <div className="bg-white border border-slate-200/50 p-2 rounded-lg text-center">
                                                  <span className="text-[8px] font-black text-slate-400 uppercase block">Follow-Up Clinic</span>
                                                  <span className="text-[11px] font-bold text-slate-800 block mt-0.5">
                                                    {summary.followUpDate ? formatDate(summary.followUpDate) : "No Recall Needed"}
                                                  </span>
                                                </div>
                                                <div className="bg-white border border-slate-200/50 p-2 rounded-lg text-center">
                                                  <span className="text-[8px] font-black text-slate-400 uppercase block">Discharged By</span>
                                                  <span className="text-[11px] font-bold text-slate-800 block mt-0.5 leading-tight">
                                                    {summary.dischargeBy || "Primary Unit"}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </>
                                );
                              })
                            ) : (
                              <TableRow>
                                <TableCell colSpan={4} className="py-12 text-center text-slate-300">
                                  <Receipt className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">No discharge matches found in report.</p>
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                    <div className="text-[10px] text-center font-bold text-slate-400 uppercase tracking-wider bg-slate-50 p-2 rounded-lg border border-slate-200/40 font-mono">
                      🖨️ Audit Note: Clicking on any patient row expands the complete clinical treatment outline above.
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'shifting' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-300">
          {/* Left Panel: Execute Transfer Form (Span 5) */}
          <div className="lg:col-span-5">
            <Card className="border-none shadow-sm bg-white overflow-hidden h-full">
              <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
                <CardTitle className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2 font-mono">
                  <ArrowLeftRight className="w-4 h-4 text-teal-600" />
                  Request Intra-Hospital Shifting
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Authorize and execute transfer of an admitted patient to another ward/bed.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* Step 1: Select Active Patient */}
                <div className="space-y-1.5 p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-teal-600" />
                    1. Select Inpatient to Shift
                  </Label>
                  <div className="relative">
                    <Input
                      placeholder="Search active patient by name or bed..."
                      value={shiftSearchQuery}
                      onChange={(e) => setShiftSearchQuery(e.target.value)}
                      className="h-9 bg-white text-xs"
                    />
                    {shiftSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setShiftSearchQuery('')}
                        className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 hover:text-slate-600"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Dropdown list of occupied beds / patients matching query */}
                  <div className="mt-2 space-y-1 max-h-[150px] overflow-y-auto custom-scrollbar">
                    {(() => {
                      const matchedInpatients = beds.filter(b => {
                        if (b.status !== 'Occupied' || (!b.patientId && !b.patient_id)) return false;
                        const pat = patients.find(p => p.id === (b.patientId || b.patient_id)) || MOCK_PATIENTS.find(p => p.id === (b.patientId || b.patient_id));
                        if (!pat) return false;
                        return (pat.name || '').toLowerCase().includes((shiftSearchQuery || '').toLowerCase()) || 
                               b.bed_number?.toLowerCase().includes(shiftSearchQuery.toLowerCase()) ||
                               b.number?.toLowerCase().includes(shiftSearchQuery.toLowerCase()) ||
                               (pat.mrn || '').toLowerCase().includes(shiftSearchQuery.toLowerCase());
                      });

                      if (matchedInpatients.length === 0) {
                        return (
                          <p className="text-[10px] text-slate-400 italic py-1 px-2">
                            {shiftSearchQuery ? "No matching active patients found." : "Search to filter active patients."}
                          </p>
                        );
                      }

                      return matchedInpatients.map(b => {
                        const pat = patients.find(p => p.id === (b.patientId || b.patient_id)) || MOCK_PATIENTS.find(p => p.id === (b.patientId || b.patient_id));
                        const isSelected = transferData.patientId === (b.patientId || b.patient_id);
                        return (
                          <div
                            key={b.id}
                            onClick={() => {
                              setTransferData({
                                patientId: b.patientId || b.patient_id || '',
                                fromBedId: b.id,
                                toBedId: '',
                                reason: 'Clinical improvement - Step down to ward',
                                transferredBy: currentUser?.name || '',
                                clinicalRequirements: 'Wheelchair assist, Continuous pulse oximetry',
                                nurseInCharge: ''
                              });
                              setShiftSearchQuery('');
                              toast.success(`Selected patient ${pat?.name} (Bed ${b.bed_number || b.number})`);
                            }}
                            className={`p-2 rounded-lg text-xs cursor-pointer transition-colors flex justify-between items-center ${
                              isSelected 
                                ? 'bg-teal-50 border border-teal-200 text-teal-800 font-bold' 
                                : 'bg-white hover:bg-slate-50 border border-slate-100 text-slate-700'
                            }`}
                          >
                            <div>
                              <p className="font-semibold text-[11px]">{pat?.name || 'Inpatient'}</p>
                              <p className="text-[10px] text-slate-400">MRN: {pat?.mrn || 'N/A'}</p>
                            </div>
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-mono text-slate-600">
                              Bed {b.bed_number || b.number} ({b.ward})
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Step 2: Show Selected Patient Information */}
                {transferData.patientId ? (
                  <div className="space-y-4 animate-in slide-in-from-top-1 duration-200">
                    <div className="bg-teal-50/50 p-3 rounded-xl border border-teal-100/50 text-xs text-teal-900 space-y-1">
                      <p className="font-extrabold flex justify-between">
                        <span>Selected Patient:</span>
                        <span className="text-teal-700">{patients.find(p => p.id === transferData.patientId)?.name || MOCK_PATIENTS.find(p => p.id === transferData.patientId)?.name}</span>
                      </p>
                      <p className="text-[10px] text-teal-600 flex justify-between">
                        <span>Current Bed location:</span>
                        <span>
                          Bed {beds.find(b => b.id === transferData.fromBedId)?.bed_number || beds.find(b => b.id === transferData.fromBedId)?.number} 
                          ({beds.find(b => b.id === transferData.fromBedId)?.ward})
                        </span>
                      </p>
                    </div>

                    {/* Step 3: Select Target Bed & Ward */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">2. Select Destination Bed <span className="text-red-500">*</span></Label>
                      <Select 
                        value={transferData.toBedId} 
                        onValueChange={(v) => setTransferData({...transferData, toBedId: v})}
                      >
                        <SelectTrigger className="h-9 text-xs bg-white">
                          <SelectValue placeholder="Choose a vacant bed" />
                        </SelectTrigger>
                        <SelectContent>
                          {beds.filter(b => b.status === 'Available').map(b => (
                            <SelectItem key={b.id} value={b.id} className="text-xs">
                              Bed {b.bed_number || b.number} - {b.ward} ({b.bed_type || b.type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Step 4: Reason for Shifting */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">3. Reason for Shifting</Label>
                      <Select 
                        value={transferData.reason} 
                        onValueChange={(v) => setTransferData({...transferData, reason: v})}
                      >
                        <SelectTrigger className="h-9 text-xs bg-white">
                          <SelectValue placeholder="Select shifting reason" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Clinical deterioration - ICU Upgrade" className="text-xs">Clinical deterioration - ICU Upgrade</SelectItem>
                          <SelectItem value="Clinical improvement - Step down to ward" className="text-xs">Clinical improvement - Step down to ward</SelectItem>
                          <SelectItem value="Post-operative monitoring requirement" className="text-xs">Post-operative monitoring requirement</SelectItem>
                          <SelectItem value="Specialized Isolation / Quarantine" className="text-xs">Specialized Isolation / Quarantine</SelectItem>
                          <SelectItem value="Patient / Family request" className="text-xs">Patient / Family request</SelectItem>
                          <SelectItem value="Bed/Ward Maintenance or Disinfection" className="text-xs">Bed/Ward Maintenance or Disinfection</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Step 5: Clinical requirements */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">4. Support / Assist Requirements</Label>
                      <Select 
                        value={transferData.clinicalRequirements} 
                        onValueChange={(v) => setTransferData({...transferData, clinicalRequirements: v})}
                      >
                        <SelectTrigger className="h-9 text-xs bg-white">
                          <SelectValue placeholder="Select clinical equipment SOS" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="None - Walk-in assist" className="text-xs">None - Walk-in assist</SelectItem>
                          <SelectItem value="Wheelchair assist, Continuous pulse oximetry" className="text-xs">Wheelchair assist, Continuous pulse oximetry</SelectItem>
                          <SelectItem value="Oxygen support (2L/min), trolley shift" className="text-xs">Oxygen support (2L/min), trolley shift</SelectItem>
                          <SelectItem value="Full cardiac monitor, IV drip infusion, trolley shift" className="text-xs">Full cardiac monitor, IV drip infusion, trolley shift</SelectItem>
                          <SelectItem value="Ventilator assist / AMBU bag, Doctor escort required" className="text-xs">Ventilator assist / AMBU bag, Doctor escort required</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Staff Sign-offs */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase">Authorizing Doctor</Label>
                        <Input 
                          placeholder="Dr. S. K. Sen" 
                          value={transferData.transferredBy} 
                          onChange={(e) => setTransferData({...transferData, transferredBy: e.target.value})} 
                          className="h-8.5 text-xs bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase">Nurse In-Charge</Label>
                        <Input 
                          placeholder="Staff Nurse Mathew" 
                          value={transferData.nurseInCharge} 
                          onChange={(e) => setTransferData({...transferData, nurseInCharge: e.target.value})} 
                          className="h-8.5 text-xs bg-white"
                        />
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-2 flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setTransferData({
                          patientId: '',
                          fromBedId: '',
                          toBedId: '',
                          reason: 'Clinical improvement - Step down to ward',
                          transferredBy: '',
                          clinicalRequirements: 'Wheelchair assist',
                          nurseInCharge: ''
                        })}
                        className="flex-1 text-xs h-9 font-bold"
                      >
                        Reset Form
                      </Button>
                      <Button
                        onClick={async () => {
                          if (!transferData.toBedId) {
                            toast.error("Please choose a target bed location first");
                            return;
                          }
                          const toBedObj = beds.find(b => b.id === transferData.toBedId);
                          const fromBedObj = beds.find(b => b.id === transferData.fromBedId);
                          const patientObj = patients.find(p => p.id === transferData.patientId) || MOCK_PATIENTS.find(p => p.id === transferData.patientId);

                          const successFrom = await supabaseService.updateBedStatus(transferData.fromBedId, 'Available', null);
                          const successTo = await supabaseService.updateBedStatus(transferData.toBedId, 'Occupied', transferData.patientId);

                          if (successFrom && successTo) {
                            // Find active admission of this patient and update its bed & ward reference
                            const activeAdmission = admissions.find(a => 
                              (a.patient_id === transferData.patientId || a.patientId === transferData.patientId) && 
                              a.status === 'Admitted'
                            );
                            if (activeAdmission && toBedObj) {
                              const updatedAdm = await supabaseService.updateAdmissionBed(activeAdmission.id, transferData.toBedId, toBedObj.ward);
                              if (updatedAdm) {
                                setAdmissions(prev => prev.map(a => a.id === activeAdmission.id ? { 
                                  ...a, 
                                  bed_id: transferData.toBedId, 
                                  bedId: transferData.toBedId,
                                  ward: toBedObj.ward 
                                } : a));
                              }
                            }

                            const shiftingRecord = {
                              id: 'shf-' + Date.now(),
                              patientId: transferData.patientId,
                              patientName: patientObj?.name || 'Walk-in Inpatient',
                              fromBedId: transferData.fromBedId,
                              fromBedNumber: fromBedObj?.bed_number || fromBedObj?.number || 'N/A',
                              fromWard: fromBedObj?.ward || 'N/A',
                              toBedId: transferData.toBedId,
                              toBedNumber: toBedObj?.bed_number || toBedObj?.number || 'N/A',
                              toWard: toBedObj?.ward || 'N/A',
                              reason: transferData.reason,
                              transferDate: new Date().toISOString(),
                              transferredBy: transferData.transferredBy || currentUser?.name || 'Dr. Ramesh Mehta',
                              clinicalRequirements: transferData.clinicalRequirements,
                              nurseInCharge: transferData.nurseInCharge || 'Staff Nurse Priya S.'
                            };

                            const updatedTransfers = [shiftingRecord, ...bedTransfers];
                            setBedTransfers(updatedTransfers);
                            storage.set(STORAGE_KEYS.BED_TRANSFERS, updatedTransfers);

                            setBeds(beds.map(b => {
                              if (b.id === transferData.fromBedId) return successFrom;
                              if (b.id === transferData.toBedId) return successTo;
                              return b;
                            }));

                            logAudit('INTRA_HOSPITAL_SHIFT', transferData.patientId, {
                              fromBed: fromBedObj?.bed_number || fromBedObj?.number,
                              toBed: toBedObj?.bed_number || toBedObj?.number,
                              reason: transferData.reason
                            });

                            toast.success("Patient shifted successfully! Opening print ticket...");
                            printShiftingOrder(shiftingRecord);
                            
                            // Clear form
                            setTransferData({
                              patientId: '',
                              fromBedId: '',
                              toBedId: '',
                              reason: 'Clinical improvement - Step down to ward',
                              transferredBy: '',
                              clinicalRequirements: 'Wheelchair assist',
                              nurseInCharge: ''
                            });
                          } else {
                            toast.error("Failed to complete shift");
                          }
                        }}
                        className="flex-1 text-xs h-9 bg-teal-600 hover:bg-teal-700 text-white font-extrabold"
                      >
                        Execute Transfer & Print
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-300 border border-dashed rounded-xl border-slate-200">
                    <ArrowLeftRight className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Please select an active inpatient above to begin</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel: Shifting History logs & Print tickets (Span 7) */}
          <div className="lg:col-span-7">
            <Card className="border-none shadow-sm bg-white overflow-hidden h-full">
              <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <CardTitle className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2 font-mono">
                      <History className="w-4 h-4 text-teal-600" />
                      Intra-Hospital Shifting Register / Logs
                    </CardTitle>
                    <CardDescription className="text-[11px]">
                      Historical log of all internal patient transfers and bed movements.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Filter history..."
                      value={shiftHistorySearch}
                      onChange={(e) => setShiftHistorySearch(e.target.value)}
                      className="h-8 text-xs w-[160px] bg-white"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm bg-white">
                  <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                    <Table>
                      <TableHeader className="bg-slate-50/80 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider font-mono py-2.5">Inpatient Details</TableHead>
                          <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider font-mono py-2.5">Bed Transfer Info</TableHead>
                          <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider font-mono py-2.5">Reason & Details</TableHead>
                          <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider font-mono py-2.5 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(() => {
                          const filteredHistory = bedTransfers.filter(trf => {
                            if (!trf) return false;
                            const matchSearch = 
                              trf.patientName?.toLowerCase().includes(shiftHistorySearch.toLowerCase()) ||
                              trf.fromBedNumber?.toLowerCase().includes(shiftHistorySearch.toLowerCase()) ||
                              trf.toBedNumber?.toLowerCase().includes(shiftHistorySearch.toLowerCase()) ||
                              trf.reason?.toLowerCase().includes(shiftHistorySearch.toLowerCase());
                            return matchSearch;
                          });

                          if (filteredHistory.length === 0) {
                            return (
                              <TableRow>
                                <TableCell colSpan={4} className="py-12 text-center text-slate-300">
                                  <ArrowLeftRight className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">No interior shifting records found.</p>
                                </TableCell>
                              </TableRow>
                            );
                          }

                          return filteredHistory.map((trf, index) => {
                            const formattedDate = new Date(trf.transferDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                            const formattedTime = new Date(trf.transferDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

                            return (
                              <TableRow key={trf.id || index} className="hover:bg-slate-50/50">
                                <TableCell className="py-3">
                                  <div className="space-y-0.5">
                                    <p className="font-extrabold text-slate-800 text-xs">{trf.patientName}</p>
                                    <p className="text-[9.5px] text-slate-400 font-mono">Date: {formattedDate} at {formattedTime}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="py-3">
                                  <div className="flex items-center gap-1 text-[10px]">
                                    <div className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded font-bold font-mono">
                                      Bed {trf.fromBedNumber} ({trf.fromWard?.split(' ')[0]})
                                    </div>
                                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                                    <div className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold font-mono">
                                      Bed {trf.toBedNumber} ({trf.toWard?.split(' ')[0]})
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="py-3">
                                  <div className="max-w-[200px] space-y-0.5">
                                    <p className="text-[11px] font-medium text-slate-700 truncate" title={trf.reason}>{trf.reason}</p>
                                    <p className="text-[9.5px] text-slate-400 font-medium">By: {trf.transferredBy}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="py-3 text-right">
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      toast.success("Printing intra-hospital shift slip...");
                                      printShiftingOrder(trf);
                                    }}
                                    className="h-6.5 text-[9.5px] font-black bg-teal-50 hover:bg-teal-600 hover:text-white text-teal-700 transition-colors px-2 rounded"
                                  >
                                    SLIP 🖨️
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          });
                        })()}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* LAMA & Death Register Processing Tab */}
      {(activeTab === 'lama-death' || activeTab === 'poor-prognosis' || activeTab === 'general-consent') && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Header & Overview Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Card className="border shadow-xs bg-rose-50/50 border-rose-200">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 font-bold">
                  <AlertTriangle className="w-5 h-5 fill-rose-100" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700">LAMA Register</p>
                  <p className="text-xl font-black text-rose-950">
                    {dischargeSummaries.filter(s => (s.dischargeType || '').toLowerCase().includes('lama')).length} Cases
                  </p>
                  <p className="text-[10px] text-rose-600 font-medium">Refusal / Liability Releases</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-xs bg-slate-900 text-white border-slate-800">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 font-bold">
                  <FileSpreadsheet className="w-5 h-5 text-slate-300" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Deceased Register</p>
                  <p className="text-xl font-black text-white">
                    {dischargeSummaries.filter(s => (s.dischargeType || '').toLowerCase().includes('decease') || (s.dischargeType || '').toLowerCase().includes('expire') || (s.dischargeType || '').toLowerCase().includes('death')).length} Cases
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">MCCD Form 4 & Mortuary Slips</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-xs bg-red-50/70 border-red-300">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-700 font-bold">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-red-800">Poor Prognosis</p>
                  <p className="text-xl font-black text-red-950">
                    {poorPrognosisList.length} Consents
                  </p>
                  <p className="text-[10px] text-red-700 font-medium">High-Risk Counseling</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-xs bg-blue-50/70 border-blue-300">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-blue-800">General Consents</p>
                  <p className="text-xl font-black text-blue-950">
                    {generalConsentsList.length} Consents
                  </p>
                  <p className="text-[10px] text-blue-700 font-medium">Bilingual IPD Care</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-xs bg-amber-50/50 border-amber-200">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Police Intimations</p>
                  <p className="text-xl font-black text-amber-950">
                    {dischargeSummaries.filter(s => s.mlcStatus && s.mlcStatus !== 'Non-MLC').length} MLCS
                  </p>
                  <p className="text-[10px] text-amber-700 font-medium">Medico-Legal Statutory</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-xs bg-teal-50/50 border-teal-200">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-teal-600 font-bold">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-teal-800">Certificates Issued</p>
                  <p className="text-xl font-black text-teal-950">
                    {dischargeSummaries.filter(s => s.deathCertNo || s.lamaReason).length} Official
                  </p>
                  <p className="text-[10px] text-teal-700 font-medium">Signed & Cleared</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Special Cases Processing Register Table & Action Cards */}
          <Card className="border shadow-xs bg-white rounded-xl overflow-hidden">
            <CardHeader className="p-4 bg-slate-50 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="bg-slate-200/80 p-1 rounded-lg flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setActiveStatutoryTab('lama_deceased')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                        activeStatutoryTab === 'lama_deceased' 
                          ? 'bg-white text-slate-900 shadow-2xs' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      LAMA & Deceased Cases
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveStatutoryTab('poor_prognosis')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                        activeStatutoryTab === 'poor_prognosis' 
                          ? 'bg-rose-700 text-white shadow-2xs' 
                          : 'text-rose-700 hover:bg-rose-100/80'
                      }`}
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Poor Prognosis ({poorPrognosisList.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveStatutoryTab('general_consent')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                        activeStatutoryTab === 'general_consent' 
                          ? 'bg-blue-700 text-white shadow-2xs' 
                          : 'text-blue-700 hover:bg-blue-100/80'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      General Consents ({generalConsentsList.length})
                    </button>
                  </div>
                </div>
                <CardDescription className="text-xs text-slate-500">
                  {activeStatutoryTab === 'lama_deceased'
                    ? 'Statutory register and documentation for Left Against Advice (LAMA) and Deceased patients.'
                    : activeStatutoryTab === 'poor_prognosis'
                    ? 'Bilingual Medico-Legal Informed Consents for High Risk, Guarded, and Critical Inpatient Admissions.'
                    : 'Statutory Bilingual General Informed Consents for Inpatient Admissions & Standard Clinical Care.'}
                </CardDescription>
              </div>

              {/* Action Controls & Search */}
              <div className="flex items-center gap-2 flex-wrap">
                {activeStatutoryTab === 'poor_prognosis' && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setPoorPrognosisPatient(null);
                      setPoorPrognosisAdmission(null);
                      setIsPoorPrognosisOpen(true);
                    }}
                    className="bg-rose-800 hover:bg-rose-900 text-white font-bold text-xs h-8 gap-1.5 shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Poor Prognosis Consent
                  </Button>
                )}
                {activeStatutoryTab === 'general_consent' && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setGeneralConsentPatient(null);
                      setGeneralConsentAdmission(null);
                      setSelectedGeneralConsent(null);
                      setIsGeneralConsentOpen(true);
                    }}
                    className="bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs h-8 gap-1.5 shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New General Consent
                  </Button>
                )}
                <div className="relative w-48 sm:w-60">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <Input 
                    placeholder="Search patient, MRN, doctor..." 
                    className="pl-8 h-8 text-xs bg-white border-slate-200"
                    value={dischargeSearchTerm}
                    onChange={(e) => setDischargeSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {activeStatutoryTab === 'general_consent' ? (
                <div className="overflow-x-auto">
                  {generalConsentsList.length === 0 ? (
                    <div className="p-12 text-center space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto">
                        <FileText className="w-7 h-7" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-slate-800">No General Consents Recorded</h4>
                        <p className="text-xs text-slate-500 max-w-md mx-auto">
                          Statutory Bilingual General Informed Consents for admitted inpatients and emergency cases will appear here.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          setGeneralConsentPatient(null);
                          setGeneralConsentAdmission(null);
                          setSelectedGeneralConsent(null);
                          setIsGeneralConsentOpen(true);
                        }}
                        className="bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs gap-1.5 shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Create General Consent
                      </Button>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader className="bg-blue-50/60 text-[11px] font-bold text-blue-900">
                        <TableRow>
                          <TableHead className="py-2.5">Admission Date & Status</TableHead>
                          <TableHead className="py-2.5">Patient & IPD Details</TableHead>
                          <TableHead className="py-2.5">Diagnosis & Permitted Care</TableHead>
                          <TableHead className="py-2.5">Attendant / Next of Kin</TableHead>
                          <TableHead className="py-2.5">Treating Doctor & Witness</TableHead>
                          <TableHead className="py-2.5 text-right">Statutory Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y text-xs">
                        {generalConsentsList
                          .filter((c: any) => {
                            if (!dischargeSearchTerm) return true;
                            const term = dischargeSearchTerm.toLowerCase();
                            return (
                              (c.patientName || '').toLowerCase().includes(term) ||
                              (c.mrn || '').toLowerCase().includes(term) ||
                              (c.ipdNo || '').toLowerCase().includes(term) ||
                              (c.doctorName || '').toLowerCase().includes(term) ||
                              (c.relativeName || '').toLowerCase().includes(term) ||
                              (c.diagnosis || '').toLowerCase().includes(term)
                            );
                          })
                          .map((consent: any) => (
                            <TableRow key={consent.id} className="hover:bg-blue-50/20">
                              <TableCell className="py-3 align-top">
                                <div className="space-y-1">
                                  <Badge className="bg-blue-600 text-white text-[9px] font-bold border-none">
                                    {consent.status || 'Signed'}
                                  </Badge>
                                  <p className="text-xs font-semibold text-slate-700">
                                    {consent.admissionDate ? formatDate(consent.admissionDate) : 'Today'}
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-mono">
                                    {consent.languageSpoken || 'Bilingual'}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="py-3 align-top">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-slate-900 text-sm">{consent.patientName}</span>
                                    <span className="text-[10px] text-slate-500 font-medium">
                                      ({consent.age ? `${consent.age}y` : ''}{consent.gender ? ` / ${consent.gender}` : ''})
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-blue-700 font-bold">
                                    {consent.ipdNo || 'IPD-RECORD'}
                                  </p>
                                  <p className="text-[10px] text-slate-500 font-medium">
                                    MRN: {consent.mrn || 'N/A'} • {consent.bedWard || 'General Ward'}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="py-3 align-top">
                                <div className="space-y-1.5 max-w-xs">
                                  <p className="text-xs font-medium text-slate-800 line-clamp-2">
                                    {consent.diagnosis || 'General Inpatient Admission & Clinical Care'}
                                  </p>
                                  <div className="flex flex-wrap gap-1">
                                    {consent.investigationConsent && (
                                      <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200">
                                        ✓ Investigations
                                      </Badge>
                                    )}
                                    {consent.treatmentConsent && (
                                      <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-700 border-blue-200">
                                        ✓ Treatment
                                      </Badge>
                                    )}
                                    {consent.medicationConsent && (
                                      <Badge variant="outline" className="text-[9px] bg-indigo-50 text-indigo-700 border-indigo-200">
                                        ✓ IV Drugs
                                      </Badge>
                                    )}
                                    {consent.emergencyConsent && (
                                      <Badge variant="outline" className="text-[9px] bg-rose-50 text-rose-700 border-rose-200">
                                        ✓ Emergency
                                      </Badge>
                                    )}
                                    {consent.bloodTransfusionConsent && (
                                      <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200">
                                        ✓ Blood
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="py-3 align-top">
                                <div className="space-y-0.5">
                                  <p className="font-bold text-slate-800 text-xs">
                                    {consent.relativeName || 'Attendant'}
                                  </p>
                                  <p className="text-[10px] text-slate-500">
                                    Relation: {consent.relativeRelation || 'Relative'}
                                  </p>
                                  {consent.relativePhone && (
                                    <p className="text-[10px] text-slate-600 font-mono">
                                      📞 {consent.relativePhone}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="py-3 align-top">
                                <div className="space-y-0.5">
                                  <p className="font-bold text-slate-800 text-xs">{consent.doctorName}</p>
                                  <p className="text-[10px] text-slate-500">{consent.doctorDesignation || 'Consultant'}</p>
                                  {consent.witnessName && (
                                    <p className="text-[10px] text-slate-400">Witness: {consent.witnessName}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="py-3 align-top text-right">
                                <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setSelectedGeneralConsent(consent);
                                      setIsGeneralConsentOpen(true);
                                    }}
                                    className="h-7 text-[10px] font-black bg-blue-700 hover:bg-blue-800 text-white gap-1 px-2.5 shadow-2xs"
                                    title="Print Official Bilingual A4 Consent Sheet"
                                  >
                                    <Printer className="w-3 h-3" />
                                    PRINT A4 🖨️
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedGeneralConsent(consent);
                                      setGeneralConsentPatient({
                                        id: consent.patientId,
                                        name: consent.patientName,
                                        mrn: consent.mrn,
                                        age: consent.age,
                                        gender: consent.gender,
                                        phone: consent.relativePhone,
                                        address: consent.relativeAddress
                                      });
                                      setGeneralConsentAdmission({
                                        id: consent.admissionId,
                                        ward: consent.bedWard,
                                        admission_date: consent.admissionDate,
                                        doctorName: consent.doctorName
                                      });
                                      setIsGeneralConsentOpen(true);
                                    }}
                                    className="h-7 text-[10px] font-bold border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100 px-2"
                                  >
                                    VIEW / EDIT
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={async () => {
                                      if (confirm(`Delete General Consent for ${consent.patientName}?`)) {
                                        await supabaseService.deleteGeneralConsent(consent.id);
                                        setGeneralConsentsList(prev => prev.filter(c => c.id !== consent.id));
                                        toast.success('General Consent deleted');
                                      }
                                    }}
                                    className="h-7 text-[10px] font-bold text-red-600 hover:bg-red-50 px-1.5"
                                    title="Delete Consent"
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              ) : activeStatutoryTab === 'poor_prognosis' ? (
                <div className="overflow-x-auto">
                  {poorPrognosisList.length === 0 ? (
                    <div className="p-12 text-center space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
                        <ShieldAlert className="w-7 h-7 animate-pulse" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-slate-800">No Poor Prognosis Consents Recorded</h4>
                        <p className="text-xs text-slate-500 max-w-md mx-auto">
                          Statutory Medico-Legal Informed Consents for high-risk, guarded prognosis, and critical ICU inpatients will appear here.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          setPoorPrognosisPatient(null);
                          setPoorPrognosisAdmission(null);
                          setIsPoorPrognosisOpen(true);
                        }}
                        className="bg-rose-800 hover:bg-rose-900 text-white font-bold text-xs gap-1.5 shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Create Poor Prognosis Consent
                      </Button>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader className="bg-rose-50/60 text-[11px] font-bold text-rose-900">
                        <TableRow>
                          <TableHead className="py-2.5">Risk Severity & Status</TableHead>
                          <TableHead className="py-2.5">Patient & IPD Details</TableHead>
                          <TableHead className="py-2.5">Diagnosis & Clinical State</TableHead>
                          <TableHead className="py-2.5">Active Life Support</TableHead>
                          <TableHead className="py-2.5">Attendant / Guardian Counseled</TableHead>
                          <TableHead className="py-2.5">Counseling Doctor</TableHead>
                          <TableHead className="py-2.5 text-right">Statutory Form Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y text-xs">
                        {poorPrognosisList
                          .filter((c: any) => {
                            if (!dischargeSearchTerm) return true;
                            const term = dischargeSearchTerm.toLowerCase();
                            return (
                              (c.patientName || '').toLowerCase().includes(term) ||
                              (c.mrn || '').toLowerCase().includes(term) ||
                              (c.ipdNo || '').toLowerCase().includes(term) ||
                              (c.diagnosis || '').toLowerCase().includes(term) ||
                              (c.relativeName || '').toLowerCase().includes(term) ||
                              (c.doctorName || '').toLowerCase().includes(term)
                            );
                          })
                          .map((consent: any) => (
                            <TableRow key={consent.id} className="hover:bg-rose-50/30 transition-colors">
                              <TableCell className="py-3 align-top">
                                <div className="space-y-1">
                                  <Badge className={`text-[10px] font-bold ${
                                    consent.riskCategory === 'Moribund' || consent.riskCategory === 'Extremely Critical'
                                      ? 'bg-rose-700 hover:bg-rose-700 text-white'
                                      : 'bg-amber-600 hover:bg-amber-600 text-white'
                                  }`}>
                                    {consent.riskCategory || 'Critical'}
                                  </Badge>
                                  <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    {consent.counselingDate || consent.createdAt?.split('T')[0]}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="py-3 align-top">
                                <div className="space-y-0.5">
                                  <p className="font-extrabold text-slate-900 text-xs">{consent.patientName}</p>
                                  <p className="text-[10px] text-slate-500 font-mono">
                                    {consent.ipdNo || 'IPD-N/A'} • {consent.age}y/{consent.gender}
                                  </p>
                                  <p className="text-[10px] text-slate-600 font-medium">
                                    Ward: {consent.bedWard || 'ICU'}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="py-3 align-top max-w-[220px]">
                                <div className="space-y-1">
                                  <p className="font-bold text-rose-950 text-xs line-clamp-2" title={consent.diagnosis}>
                                    {consent.diagnosis}
                                  </p>
                                  {consent.comorbidities && (
                                    <p className="text-[10px] text-slate-500 truncate" title={consent.comorbidities}>
                                      Co-morbid: {consent.comorbidities}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="py-3 align-top">
                                <div className="flex flex-wrap gap-1 max-w-[180px]">
                                  {consent.criticalSupport?.mechanicalVentilation && (
                                    <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[9px] font-bold">Ventilator</span>
                                  )}
                                  {consent.criticalSupport?.inotropicSupport && (
                                    <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[9px] font-bold">Inotropes</span>
                                  )}
                                  {consent.criticalSupport?.dialysis && (
                                    <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[9px] font-bold">Dialysis</span>
                                  )}
                                  {consent.criticalSupport?.invasiveLines && (
                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[9px] font-bold">CVC Line</span>
                                  )}
                                  {consent.criticalSupport?.bloodTransfusion && (
                                    <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 text-[9px] font-bold">Blood</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="py-3 align-top">
                                <div className="space-y-0.5">
                                  <p className="font-bold text-slate-800 text-xs">{consent.relativeName}</p>
                                  <p className="text-[10px] text-slate-500 font-medium">
                                    Rel: {consent.relativeRelation} • {consent.relativePhone}
                                  </p>
                                  <p className="text-[9.5px] text-slate-400 font-medium">
                                    Lang: {consent.languageSpoken || 'Hindi'}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="py-3 align-top">
                                <div className="space-y-0.5">
                                  <p className="font-bold text-slate-800 text-xs">{consent.doctorName}</p>
                                  <p className="text-[10px] text-slate-500">{consent.doctorDesignation || 'Consultant'}</p>
                                </div>
                              </TableCell>
                              <TableCell className="py-3 align-top text-right">
                                <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      printPoorPrognosisConsent(consent);
                                      toast.success(`Printing Poor Prognosis Consent for ${consent.patientName}`);
                                    }}
                                    className="h-7 text-[10px] font-black bg-rose-800 hover:bg-rose-900 text-white gap-1 px-2.5 shadow-2xs"
                                    title="Print Official Bilingual A4 Consent Sheet"
                                  >
                                    <Printer className="w-3 h-3" />
                                    PRINT A4 🖨️
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setPoorPrognosisPatient({
                                        id: consent.patientId,
                                        name: consent.patientName,
                                        mrn: consent.mrn,
                                        age: consent.age,
                                        gender: consent.gender,
                                        phone: consent.relativePhone,
                                        address: consent.relativeAddress
                                      });
                                      setPoorPrognosisAdmission({
                                        id: consent.admissionId,
                                        ward: consent.bedWard,
                                        admission_date: consent.admissionDate,
                                        doctorName: consent.doctorName
                                      });
                                      setIsPoorPrognosisOpen(true);
                                    }}
                                    className="h-7 text-[10px] font-bold border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 px-2"
                                  >
                                    VIEW / EDIT
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={async () => {
                                      if (confirm(`Delete Poor Prognosis Consent for ${consent.patientName}?`)) {
                                        await supabaseService.deletePoorPrognosisConsent(consent.id);
                                        setPoorPrognosisList(prev => prev.filter(c => c.id !== consent.id));
                                        toast.success('Consent record deleted');
                                      }
                                    }}
                                    className="h-7 text-[10px] font-bold text-red-600 hover:bg-red-50 px-1.5"
                                    title="Delete Consent"
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/80 text-[11px] font-bold text-slate-600">
                    <TableRow>
                      <TableHead className="py-2.5">Category & Status</TableHead>
                      <TableHead className="py-2.5">Patient Details</TableHead>
                      <TableHead className="py-2.5">Discharging Doctor & Date</TableHead>
                      <TableHead className="py-2.5">Clinical Cause / Stated Reason</TableHead>
                      <TableHead className="py-2.5 text-center">Clearance Status</TableHead>
                      <TableHead className="py-2.5 text-right">Further Actions & Official Forms</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y text-xs">
                    {(() => {
                      const lamaAndDeathList = dischargeSummaries.filter(s => {
                        const type = (s.dischargeType || '').toLowerCase();
                        const isLamaOrDeath = type.includes('lama') || type.includes('decease') || type.includes('expire') || type.includes('death');
                        if (!isLamaOrDeath) return false;

                        if (dischargeSearchTerm) {
                          const term = dischargeSearchTerm.toLowerCase();
                          return (
                            (s.patientName || '').toLowerCase().includes(term) ||
                            (s.mrn || '').toLowerCase().includes(term) ||
                            (s.doctorName || '').toLowerCase().includes(term) ||
                            (s.finalDiagnosis || '').toLowerCase().includes(term) ||
                            (s.lamaReason || '').toLowerCase().includes(term)
                          );
                        }
                        return true;
                      });

                      if (lamaAndDeathList.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={6} className="h-32 text-center text-slate-400 font-medium">
                              <div className="flex flex-col items-center justify-center gap-1.5">
                                <AlertTriangle className="w-6 h-6 text-slate-300" />
                                <p>No matching LAMA or Deceased clinical cases found in active register.</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      }

                      return lamaAndDeathList.map((summary: any) => {
                        const isLama = (summary.dischargeType || '').toLowerCase().includes('lama');
                        const isDeath = (summary.dischargeType || '').toLowerCase().includes('decease') || (summary.dischargeType || '').toLowerCase().includes('expire') || (summary.dischargeType || '').toLowerCase().includes('death');

                        return (
                          <TableRow key={summary.id} className="hover:bg-slate-50/80 transition-colors">
                            <TableCell className="py-3">
                              <div className="space-y-1">
                                {isLama && (
                                  <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">
                                    LAMA / DOR
                                  </Badge>
                                )}
                                {isDeath && (
                                  <Badge className="bg-slate-900 text-white text-[10px] font-bold">
                                    DECEASED
                                  </Badge>
                                )}
                                {summary.mlcStatus && summary.mlcStatus !== 'Non-MLC' && (
                                  <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50 text-[9px] font-bold block w-fit">
                                    MLC CASE
                                  </Badge>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className="py-3">
                              <div className="space-y-0.5">
                                <p className="font-bold text-slate-900 text-xs">{summary.patientName}</p>
                                <p className="text-[10px] text-slate-500 font-mono">
                                  {summary.mrn} • {summary.age}y/{summary.gender}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  Ward: {summary.ward || 'General'} (Bed {summary.bedNumber || 'N/A'})
                                </p>
                              </div>
                            </TableCell>

                            <TableCell className="py-3">
                              <div className="space-y-0.5">
                                <p className="font-medium text-slate-800 text-xs">{summary.doctorName}</p>
                                <p className="text-[10px] text-slate-500">
                                  Discharged: {summary.dischargeDate || summary.date} {summary.dischargeTime || ''}
                                </p>
                              </div>
                            </TableCell>

                            <TableCell className="py-3 max-w-[200px]">
                              <div className="space-y-0.5">
                                <p className="font-medium text-slate-800 text-xs truncate" title={summary.finalDiagnosis || summary.diagnosis}>
                                  Diag: {summary.finalDiagnosis || summary.diagnosis || 'N/A'}
                                </p>
                                {isLama && (
                                  <p className="text-[10px] text-rose-600 font-medium truncate" title={summary.lamaReason}>
                                    Reason: {summary.lamaReason || 'Left on Request'}
                                  </p>
                                )}
                                {isDeath && (
                                  <p className="text-[10px] text-slate-500 truncate" title={summary.causeOfDeath}>
                                    Cause: {summary.causeOfDeath || 'Cardiopulmonary Arrest'}
                                  </p>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className="py-3 text-center">
                              <Badge variant="outline" className="border-teal-200 text-teal-700 bg-teal-50 text-[10px] font-bold">
                                Cleared & Signed
                              </Badge>
                            </TableCell>

                            <TableCell className="py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                {isLama && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => printLamaWaiver(summary)}
                                      className="h-7 text-[10px] font-black bg-rose-600 hover:bg-rose-700 text-white gap-1 px-2.5 shadow-2xs"
                                    >
                                      <FileText className="w-3 h-3" />
                                      LAMA WAIVER 📜
                                    </Button>

                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        const matchedPat = patients.find(p => p.id === summary.patientId || p.id === summary.patient_id || (p.mrn && p.mrn === summary.mrn));
                                        setAdmissionSheetPatient(matchedPat || { name: summary.patientName, mrn: summary.mrn, id: summary.patientId });
                                        setAdmissionSheetAdmission({ ...summary, isLama: true, lamaReason: summary.lamaReason });
                                        setIsAdmissionSheetOpen(true);
                                      }}
                                      className="h-7 text-[10px] font-bold border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 gap-1 px-2"
                                      title="Open Official Admission Sheet with LAMA Consent & Signature Records"
                                    >
                                      <FileText className="w-3 h-3 text-rose-600" />
                                      LAMA ADMISSION SHEET 📋
                                    </Button>

                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => printPoliceIntimation(summary)}
                                      className="h-7 text-[10px] font-bold border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 gap-1 px-2"
                                    >
                                      POLICE MLC 🚨
                                    </Button>
                                  </>
                                )}

                                {isDeath && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => printDeathCertificate(summary)}
                                      className="h-7 text-[10px] font-black bg-slate-900 hover:bg-slate-800 text-white gap-1 px-2.5 shadow-2xs"
                                    >
                                      DEATH CERT 📜
                                    </Button>

                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => printBodyHandoverSlip(summary)}
                                      className="h-7 text-[10px] font-bold border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100 gap-1 px-2"
                                    >
                                      BODY HANDOVER 🏷️
                                    </Button>

                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => printPoliceIntimation(summary)}
                                      className="h-7 text-[10px] font-bold border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 gap-1 px-2"
                                    >
                                      MLC SLIP 🚨
                                    </Button>
                                  </>
                                )}

                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setDischargedSummaryToShow(summary);
                                    setIsSummaryDetailsOpen(true);
                                  }}
                                  className="h-7 text-[10px] font-bold text-teal-700 hover:bg-teal-50 px-2"
                                >
                                  SUMMARY 📄
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      });
                    })()}
                  </TableBody>
                </Table>
              </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Patient Chart Dialog */}
      <Dialog open={isChartOpen} onOpenChange={setIsChartOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl">Patient Clinical Chart</DialogTitle>
                <DialogDescription>
                  {selectedPatient?.name} ({selectedPatient?.mrn}) • Bed {beds.find(b => b.patient_id === selectedPatient?.id || b.patientId === selectedPatient?.id)?.bed_number}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-xs gap-1.5 shadow-2xs"
                  onClick={() => {
                    const bedObj = beds.find(b => b.patient_id === selectedPatient?.id || b.patientId === selectedPatient?.id);
                    const bedNum = bedObj ? `Bed ${bedObj.number || bedObj.bed_number || bedObj.id}` : 'IPD Ward Bed';
                    const docObj = users.find(u => String(u.id) === String(selectedPatient?.attending_doctor_id));
                    printDailyVitalsAndAdvice(selectedPatient, bedNum, docObj?.name);
                  }}
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-700" />
                  Print Daily Vitals & Advice
                </Button>
                <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-100">
                  IPD Admission
                </Badge>
              </div>
            </div>
          </DialogHeader>
          
          <Tabs defaultValue="doctor" className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6">
              <TabsList className="grid w-full grid-cols-7 bg-slate-100/50 p-1">
                <TabsTrigger value="doctor" className="text-xs gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5" />
                  Doctor
                </TabsTrigger>
                <TabsTrigger value="nurse" className="text-xs gap-1.5">
                  <ClipboardList className="w-3.5 h-3.5" />
                  Nurse
                </TabsTrigger>
                <TabsTrigger value="specialist" className="text-xs gap-1.5 font-bold text-indigo-700">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                  Specialist
                </TabsTrigger>
                <TabsTrigger value="special_charts" className="text-xs gap-1.5 font-bold text-sky-700">
                  <Activity className="w-3.5 h-3.5 text-sky-600" />
                  Special Flowsheets
                </TabsTrigger>
                <TabsTrigger value="prescription" className="text-xs gap-1.5">
                  <Pill className="w-3.5 h-3.5" />
                  Prescriptions
                </TabsTrigger>
                <TabsTrigger value="tests" className="text-xs gap-1.5">
                  <FlaskConical className="w-3.5 h-3.5" />
                  Tests
                </TabsTrigger>
                <TabsTrigger value="billing" className="text-xs gap-1.5">
                  <Receipt className="w-3.5 h-3.5" />
                  Charges
                </TabsTrigger>
              </TabsList>
            </div>

          <div className="flex-1 px-6 py-4 overflow-y-auto custom-scrollbar">
            <TabsContent value="doctor" className="mt-0 space-y-4">
                <div className="space-y-4">
                  {(() => {
                    const docId = selectedPatient?.attending_doctor_id || selectedPatient?.attendingDoctorId;
                    const attDoc = docId ? users.find(u => 
                      String(u.id).toLowerCase() === String(docId).toLowerCase() || 
                      String(u.name).trim().toLowerCase() === String(docId).trim().toLowerCase()
                    ) : null;
                    
                    if (!docId) return null;
                    
                    return (
                      <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
                        <div className="h-12 w-12 rounded-full bg-white border-2 border-blue-200 flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                          <Stethoscope className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Attending Clinician</p>
                          <p className="text-base font-bold text-blue-900 truncate">
                            {attDoc ? attDoc.name : docId}
                          </p>
                          <p className="text-xs text-blue-700 font-medium truncate">
                            {attDoc ? (
                              <>
                                {attDoc.department} 
                                {attDoc.specialization ? ` • ${attDoc.specialization}` : ''}
                              </>
                            ) : 'General OPD'}
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Render database clinical notes */}
                  {clinicalNotes.filter(n => n.note_type === 'DOCTOR').map(note => {
                    const authorName = note.profiles?.name || note.authorName || 'Attending Doctor';
                    const dateFormatted = new Date(note.created_at || note.date || Date.now()).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                    return (
                      <div key={note.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-medical-blue"></div>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-xs font-bold text-medical-blue uppercase">{authorName}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{dateFormatted}</p>
                          </div>
                          {!isDeleteForbidden && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleDeleteNote(note.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                      </div>
                    );
                  })}
                  
                  {/* Fallback only if list is empty */}
                  {clinicalNotes.filter(n => n.note_type === 'DOCTOR').length === 0 && (
                    <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                      <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-medium text-slate-500">No doctor notes registered yet</p>
                      <p className="text-xs text-slate-400">Doctor should enter a clinical note below to save. New notes will be visible immediately.</p>
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <Label className="text-xs font-bold uppercase text-slate-500 mb-2 block">Add Doctor's Note</Label>
                    <textarea 
                      className="w-full min-h-[100px] p-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-medical-blue/20 transition-all"
                      placeholder="Enter clinical observations, diagnosis updates, or instructions..."
                      value={newDoctorNote}
                      onChange={(e) => setNewDoctorNote(e.target.value)}
                    />
                    {!isAccountant && (
                      <div className="flex justify-end mt-2">
                        <Button size="sm" className="bg-medical-blue" onClick={() => handleSaveClinicalNote('DOCTOR')}>
                          Save Doctor Note
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

               <TabsContent value="nurse" className="mt-0 space-y-4">
                 <div className="space-y-4">
                  {/* Render database clinical nursing notes */}
                  {clinicalNotes.filter(n => n.note_type === 'NURSE').map(note => {
                    const authorName = note.profiles?.name || note.authorName || 'Staff Nurse';
                    const dateFormatted = new Date(note.created_at || note.date || Date.now()).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                    return (
                      <div key={note.id} className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-xs font-bold text-emerald-600 uppercase">{authorName}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{dateFormatted}</p>
                          </div>
                          {!isDeleteForbidden && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleDeleteNote(note.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                      </div>
                    );
                  })}
                  
                  {/* Fallback only if list is empty */}
                  {clinicalNotes.filter(n => n.note_type === 'NURSE').length === 0 && (
                    <div className="p-6 text-center border border-dashed border-emerald-100 rounded-xl bg-emerald-50/20">
                      <FileText className="w-8 h-8 text-emerald-300 mx-auto mb-2" />
                      <p className="text-sm font-medium text-emerald-600">No nursing notes registered yet</p>
                      <p className="text-xs text-emerald-500/80">Nurse should enter a clinical note below to save. New notes will be visible immediately.</p>
                    </div>
                  )}

                   <div className="pt-4 border-t">
                     <Label className="text-xs font-bold uppercase text-slate-500 mb-2 block">Add Nurse's Note</Label>
                     <textarea 
                       className="w-full min-h-[100px] p-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-medical-blue/20 transition-all"
                       placeholder="Enter nursing observations, care provided, or patient complaints..."
                       value={newNurseNote}
                       onChange={(e) => setNewNurseNote(e.target.value)}
                     />
                     {!isAccountant && (
                       <div className="flex justify-end mt-2">
                         <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleSaveClinicalNote('NURSE')}>
                           Save Nurse Note
                         </Button>
                       </div>
                     )}
                   </div>
                 </div>
               </TabsContent>

              <TabsContent value="prescription" className="mt-0 space-y-4">
                <div className="space-y-4">
                  <div className="space-y-3 max-h-[255px] overflow-y-auto custom-scrollbar">
                    {patientPrescriptions.map((rx: any) => {
                      const docName = rx.doctor_name || rx.doctorName || rx.profiles?.name || 'Attending Physician';
                      const rxDate = new Date(rx.prescription_date || rx.date || rx.created_at || Date.now()).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      });
                      
                      let medicinesList: any[] = [];
                      if (Array.isArray(rx.medicines)) {
                        medicinesList = rx.medicines;
                      } else if (typeof rx.medicines === 'string') {
                        try { medicinesList = JSON.parse(rx.medicines); } catch(ex) {}
                      } else if (Array.isArray(rx.medications)) {
                        medicinesList = rx.medications;
                      }
                      
                      return (
                        <Card key={rx.id} className="border-slate-100 shadow-none bg-slate-50/50">
                          <CardHeader className="p-3 bg-slate-100/50 flex flex-row items-center justify-between space-y-0">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prescription Card</p>
                              <p className="text-xs font-black text-slate-700">{docName}</p>
                            </div>
                            <p className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-100">{rxDate}</p>
                          </CardHeader>
                          <CardContent className="p-3 space-y-2">
                            {medicinesList.length > 0 ? (
                              medicinesList.map((med: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center p-2 rounded-lg bg-white border border-slate-100">
                                  <div>
                                    <p className="text-xs font-bold text-slate-800">{med.name || med.medicineName}</p>
                                    <p className="text-[9px] text-slate-500">{med.dosage || med.frequency || 'Dosage not specified'}</p>
                                  </div>
                                  <Badge className="bg-blue-50 text-blue-600 border-none text-[9px]">{med.duration || 'As directed'}</Badge>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-slate-500 italic">No medicines listed in this prescription.</p>
                            )}
                            
                            {(rx.advice || rx.notes) && (
                              <div className="mt-2 pt-2 border-t border-slate-100">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Advice & Instructions</p>
                                  <p className="text-xs text-slate-600 italic leading-snug">{rx.advice || rx.notes}</p>
                                </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}

                    {patientPrescriptions.length === 0 && (
                      <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                        <Pill className="w-8 h-8 text-slate-350 mx-auto mb-2 opacity-50" />
                        <p className="text-sm font-medium text-slate-500">No prescriptions registered yet</p>
                        <p className="text-xs text-slate-400/80">Doctor must write a prescription in the builder form below.</p>
                      </div>
                    )}
                  </div>

                  {!isAccountant && (
                    <div className="pt-4 border-t space-y-3">
                      <Label className="text-xs font-black uppercase text-slate-500 block">Write New Prescription</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-slate-500">Medicine Name</Label>
                          <Input 
                            placeholder="e.g. Tab. Augmentin 625mg" 
                            value={newPrescription.medicineName}
                            onChange={(e) => setNewPrescription({...newPrescription, medicineName: e.target.value})}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-slate-500">Dosage / Frequency</Label>
                          <Input 
                            placeholder="e.g. Twice a day (1-0-1)" 
                            value={newPrescription.dosage}
                            onChange={(e) => setNewPrescription({...newPrescription, dosage: e.target.value})}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-slate-500">Duration</Label>
                          <Input 
                            placeholder="e.g. 5 Days" 
                            value={newPrescription.duration}
                            onChange={(e) => setNewPrescription({...newPrescription, duration: e.target.value})}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-slate-500">Advice / Instructions</Label>
                           <Input 
                             placeholder="e.g. Steam inhalation twice daily" 
                             value={newPrescription.instructions}
                             onChange={(e) => setNewPrescription({...newPrescription, instructions: e.target.value})}
                             className="h-8 text-xs"
                           />
                        </div>
                      </div>
                      <div className="flex justify-end mt-2">
                        <Button size="sm" className="bg-medical-blue h-8 text-xs font-bold px-4" onClick={handleSavePrescription}>
                          Save Prescription
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="tests" className="mt-0 space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs font-bold uppercase text-slate-500 mb-3 block">Recommended Tests</Label>
                    <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                      {patientTests.map((t: any) => {
                        const requestDate = new Date(t.requested_at || t.requestedAt || Date.now()).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        });
                        const isCompleted = t.status?.toUpperCase() === 'COMPLETED' || t.status?.toUpperCase() === 'READY';
                        return (
                          <div key={t.id} className={`flex items-center justify-between p-3 rounded-xl border ${isCompleted ? 'bg-emerald-50 border-emerald-100 text-emerald-900' : 'bg-slate-50 border-slate-100'}`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <FlaskConical className="w-4 h-4" />}
                              </div>
                              <div>
                                <p className="text-sm font-bold">{t.test_name || t.testName || 'Laboratory Investigation'}</p>
                                <p className="text-[10px] text-slate-500">Requested on {requestDate}</p>
                              </div>
                            </div>
                            <Badge className={`${isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-50 text-amber-600'} border-none text-[9px]`}>
                              {t.status || 'Pending'}
                            </Badge>
                          </div>
                        );
                      })}

                      {patientTests.length === 0 && (
                        <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                          <FlaskConical className="w-8 h-8 text-slate-350 mx-auto mb-2 opacity-50" />
                          <p className="text-sm font-medium text-slate-500">No recommended tests yet</p>
                          <p className="text-xs text-slate-400">Doctor can recommend a laboratory test below.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {!isAccountant && (
                    <div className="pt-4 border-t">
                      <Label className="text-xs font-bold uppercase text-slate-500 mb-2 block animate-in fade-in">Recommend New Test</Label>
                      <div className="flex gap-2">
                        <Select value={recommendedTestName} onValueChange={setRecommendedTestName}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select test type..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Complete Blood Count (CBC)">CBC (Blood Test)</SelectItem>
                            <SelectItem value="Liver Function Test (LFT)">Liver Function Test</SelectItem>
                            <SelectItem value="Kidney Function Test (KFT)">Kidney Function Test</SelectItem>
                            <SelectItem value="Chest X-Ray (PA View)">X-Ray Chest</SelectItem>
                            <SelectItem value="MRI Brain Scan">MRI Brain</SelectItem>
                            <SelectItem value="CT Scan Abdomen">CT Scan Abdomen</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button className="bg-medical-blue h-10 px-4 text-xs font-bold" onClick={handleRecommendTest}>
                          Recommend
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="billing" className="mt-0 space-y-4">
                <Card className="border-slate-100 shadow-none">
                  <CardHeader className="p-4 bg-slate-50">
                    <CardTitle className="text-sm">Estimated Bed Charges</CardTitle>
                    <CardDescription className="text-xs">Based on current ward occupancy</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-slate-50">
                      <div>
                        <p className="text-sm font-medium">Bed Type</p>
                        <p className="text-xs text-muted-foreground">{beds.find(b => b.patient_id === selectedPatient?.id || b.patientId === selectedPatient?.id)?.bed_type} Bed</p>
                      </div>
                      <p className="text-sm font-bold">
                        {formatCurrency(MOCK_BED_RATES.find(r => r.type === beds.find(b => b.patient_id === selectedPatient?.id || b.patientId === selectedPatient?.id)?.bed_type)?.rate || 0)} / Day
                      </p>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-50">
                      <div>
                        <p className="text-sm font-medium">Occupancy</p>
                        <p className="text-xs text-muted-foreground">
                          Admitted on {(() => {
                            const activeAdm = admissions.find(a => a.patient_id === selectedPatient?.id || a.patientId === selectedPatient?.id);
                            const admDate = activeAdm?.admission_date || activeAdm?.admissionDate || activeAdm?.created_at || selectedPatient?.created_at;
                            return formatDate(admDate);
                          })()}
                        </p>
                      </div>
                      <p className="text-sm font-bold">3 Days</p>
                    </div>
                    <div className="flex justify-between items-center py-4 bg-medical-blue/5 px-3 rounded-lg">
                      <p className="font-bold text-medical-blue">Total Bed Charges</p>
                      <p className="text-lg font-bold text-medical-blue">{formatCurrency(calculateBedCharges(selectedPatient?.id))}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground italic">
                      * Final charges will be calculated at the time of discharge based on actual hours.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="special_charts" className="mt-0 space-y-4">
                <SpecialClinicalCharts 
                  patientId={selectedPatient?.id} 
                  patientName={selectedPatient?.name} 
                  mrn={selectedPatient?.mrn} 
                />
              </TabsContent>

              <TabsContent value="specialist" className="mt-0 space-y-4">
                <VisitingConsultants 
                  patientId={selectedPatient?.id} 
                  user={currentUser} 
                  embedded={true} 
                />
              </TabsContent>
            </div>
          </Tabs>
          
          <div className="p-4 border-t bg-slate-50 flex justify-end">
            <DialogTrigger asChild>
              <Button variant="outline">Close Chart</Button>
            </DialogTrigger>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bed Transfer Dialog */}
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-teal-700">
              <ArrowLeftRight className="w-5 h-5 text-teal-600" />
              Intra-Hospital Patient Transfer
            </DialogTitle>
            <DialogDescription>
              Transfer <strong>{patients.find(p => p.id === transferData.patientId)?.name || MOCK_PATIENTS.find(p => p.id === transferData.patientId)?.name || 'Patient'}</strong> to another vacant bed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-500 uppercase">Current Bed</Label>
                <Input disabled value={(() => {
                  const cb = beds.find(b => b.id === transferData.fromBedId);
                  return cb ? `Bed ${cb.bed_number} (${cb.ward})` : 'N/A';
                })()} className="bg-slate-50 text-slate-600 h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-500 uppercase">Target Bed <span className="text-red-500">*</span></Label>
                <Select value={transferData.toBedId} onValueChange={(v) => setTransferData({...transferData, toBedId: v})}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select target bed">
                      {(() => {
                        const b = beds.find(x => x.id === transferData.toBedId);
                        return b ? `Bed ${b.bed_number} - ${b.ward}` : undefined;
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {beds.filter(b => b.status === 'Available' || b.id === transferData.toBedId).map(b => (
                      <SelectItem key={b.id} value={b.id} className="text-xs">Bed {b.bed_number} - {b.ward} ({b.bed_type})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-500 uppercase">Reason for Shifting</Label>
              <Select value={transferData.reason} onValueChange={(v) => setTransferData({...transferData, reason: v})}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select shifting reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Clinical deterioration - ICU Upgrade" className="text-xs">Clinical deterioration - ICU Upgrade</SelectItem>
                  <SelectItem value="Clinical improvement - Step down to ward" className="text-xs">Clinical improvement - Step down to ward</SelectItem>
                  <SelectItem value="Post-operative monitoring requirement" className="text-xs">Post-operative monitoring requirement</SelectItem>
                  <SelectItem value="Specialized Isolation / Quarantine" className="text-xs">Specialized Isolation / Quarantine</SelectItem>
                  <SelectItem value="Patient / Family request" className="text-xs">Patient / Family request</SelectItem>
                  <SelectItem value="Bed/Ward Maintenance or Disinfection" className="text-xs">Bed/Ward Maintenance or Disinfection</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-500 uppercase">Clinical Support Requirements</Label>
              <Select value={transferData.clinicalRequirements} onValueChange={(v) => setTransferData({...transferData, clinicalRequirements: v})}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select transfer requirements" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None - Walk-in assist" className="text-xs">None - Walk-in assist</SelectItem>
                  <SelectItem value="Wheelchair assist, Continuous pulse oximetry" className="text-xs">Wheelchair assist, Continuous pulse oximetry</SelectItem>
                  <SelectItem value="Oxygen support (2L/min), trolley shift" className="text-xs">Oxygen support (2L/min), trolley shift</SelectItem>
                  <SelectItem value="Full cardiac monitor, IV drip infusion, trolley shift" className="text-xs">Full cardiac monitor, IV drip infusion, trolley shift</SelectItem>
                  <SelectItem value="Ventilator assist / AMBU bag, Doctor escort required" className="text-xs">Ventilator assist / AMBU bag, Doctor escort required</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-500 uppercase">Authorizing Doctor</Label>
                <Input 
                  placeholder="Dr. Ramesh Mehta" 
                  value={transferData.transferredBy} 
                  onChange={(e) => setTransferData({...transferData, transferredBy: e.target.value})} 
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-500 uppercase">Nurse In-Charge</Label>
                <Input 
                  placeholder="Staff Nurse Priya S." 
                