import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Bed as BedIcon, 
  UserPlus, 
  Plus,
  Search, 
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
  Loader2,
  Building,
  HeartPulse,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Clock,
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
import { MOCK_BED_RATES, MOCK_USERS, MOCK_PATIENTS, INITIAL_BEDS, INITIAL_ADMISSIONS } from '@/mockData';
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
import { AdmissionSheetModal, printOfficialAdmissionSheet } from './AdmissionSheetModal';
import { PoorPrognosisConsentModal, printPoorPrognosisConsent } from './PoorPrognosisConsentModal';
import { GeneralConsentModal } from './GeneralConsentModal';

interface AdmissionFormDataPayload {
  patient_id: string;
  bed_id: string;
  doctor_id?: string | null;
  ward?: string;
  urgency?: string;
  case_type?: string;
  status?: string;
}

function validateAdmissionFields(
  payload: AdmissionFormDataPayload,
  bedsList: any[],
  patientsList: any[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!payload.patient_id || payload.patient_id === '') {
    errors.push("Patient selection is required. Please select a valid patient.");
  } else {
    const patientExists = patientsList.some(p => String(p.id) === String(payload.patient_id));
    if (!patientExists) {
      errors.push("Selected patient is invalid or does not exist in our database records.");
    }
  }

  if (!payload.bed_id || payload.bed_id === '') {
    errors.push("Bed selection is required. Please allocate a bed.");
  } else {
    const bed = bedsList.find(b => String(b.id) === String(payload.bed_id));
    if (!bed) {
      errors.push("Selected bed is invalid or does not exist in our database records.");
    }
  }

  if (!payload.ward || payload.ward.trim() === '') {
    errors.push("Ward / Department selection is required.");
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

export default function IPD({ activeRole }: { activeRole?: string }) {
  const [view, setView] = useState<'beds' | 'admissions'>('beds');
  const [beds, setBeds] = useState<any[]>(() => storage.get(STORAGE_KEYS.BEDS, INITIAL_BEDS));
  const [patients, setPatients] = useState<any[]>(() => storage.get(STORAGE_KEYS.PATIENTS, MOCK_PATIENTS));
  const [admissions, setAdmissions] = useState<any[]>(() => storage.get('hms_admissions', INITIAL_ADMISSIONS));
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
      const [bedsData, patientsData, admissionsData, dischargeSummariesData, staffData, otSchedulesData, invoicesData, poorPrognosisData, generalConsentsData] = await Promise.all([
        supabaseService.getBeds(),
        supabaseService.getPatients(),
        supabaseService.getAdmissions(),
        supabaseService.getDischargeSummaries(),
        supabaseService.getStaff(),
        supabaseService.getOTSchedules(),
        supabaseService.getInvoices(),
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
      if (poorPrognosisData) setPoorPrognosisList(poorPrognosisData);
      if (generalConsentsData) setGeneralConsentsList(generalConsentsData);
    } catch (error) {
      console.warn('Notice fetching IPD data:', error);
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
    reason: 'Clinical improvement - Step down to ward',
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
        }
      ];
    }
    return list;
  });

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

  const currentUser = useMemo(() => {
    if (activeRole) {
      return { id: 'u-user-active', name: `Active User (${activeRole})`, role: activeRole };
    }
    return storage.get(STORAGE_KEYS.SESSION_USER, MOCK_USERS[0]);
  }, [activeRole]);

  const isCurrentUserAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'HOSPITAL_ADMIN' || currentUser?.role === 'ADMIN' || currentUser?.role?.toUpperCase().includes('ADMIN');
  const isAccountant = normalizeRole(currentUser?.role) === 'ACCOUNTANT';
  const isReceptionist = normalizeRole(currentUser?.role) === 'RECEPTIONIST';
  const isDoctor = currentUser?.role?.toUpperCase() === 'DOCTOR' || currentUser?.role?.toUpperCase() === 'SURGEON';
  const isDeleteForbidden = false;

  // Modals state
  const [isDeleteAdmissionOpen, setIsDeleteAdmissionOpen] = useState(false);
  const [admissionToDelete, setAdmissionToDelete] = useState<any>(null);
  const [patientToDeleteAdmission, setPatientToDeleteAdmission] = useState<any>(null);
  const [bedToDeleteAdmission, setBedToDeleteAdmission] = useState<any>(null);
  const [deleteReleaseBed, setDeleteReleaseBed] = useState(true);
  const [deleteUpdatePatientStatus, setDeleteUpdatePatientStatus] = useState(true);
  const [deleteReason, setDeleteReason] = useState('Old stale admission record');

  const [isPurgeOldAdmissionsOpen, setIsPurgeOldAdmissionsOpen] = useState(false);
  const [selectedPurgeIds, setSelectedPurgeIds] = useState<string[]>([]);
  const [purgeReleaseBeds, setPurgeReleaseBeds] = useState(true);
  const [purgeUpdatePatientStatus, setPurgeUpdatePatientStatus] = useState(true);
  const [purgeConfirmationStep, setPurgeConfirmationStep] = useState(false);

  const [isDeleteBedOpen, setIsDeleteBedOpen] = useState(false);
  const [bedToDelete, setBedToDelete] = useState<any>(null);
  const [deleteBedUnassignPatient, setDeleteBedUnassignPatient] = useState(true);

  // Tabs state
  const [activeTab, setActiveTab] = useState<'registration' | 'beds' | 'surgery' | 'discharge' | 'shifting' | 'lama-death' | 'initial-evaluation' | 'specialist-consultations' | 'poor-prognosis' | 'general-consent'>('beds');

  // Official Admission Sheet & LAMA modal
  const [isAdmissionSheetOpen, setIsAdmissionSheetOpen] = useState(false);
  const [admissionSheetPatient, setAdmissionSheetPatient] = useState<any>(null);
  const [admissionSheetAdmission, setAdmissionSheetAdmission] = useState<any>(null);

  // Poor Prognosis
  const [isPoorPrognosisOpen, setIsPoorPrognosisOpen] = useState(false);
  const [poorPrognosisPatient, setPoorPrognosisPatient] = useState<any>(null);
  const [poorPrognosisAdmission, setPoorPrognosisAdmission] = useState<any>(null);
  const [poorPrognosisList, setPoorPrognosisList] = useState<any[]>([]);

  // General Consent
  const [activeStatutoryTab, setActiveStatutoryTab] = useState<'lama_deceased' | 'poor_prognosis' | 'general_consent'>('lama_deceased');
  const [isGeneralConsentOpen, setIsGeneralConsentOpen] = useState(false);
  const [generalConsentPatient, setGeneralConsentPatient] = useState<any>(null);
  const [generalConsentAdmission, setGeneralConsentAdmission] = useState<any>(null);
  const [selectedGeneralConsent, setSelectedGeneralConsent] = useState<any>(null);
  const [generalConsentsList, setGeneralConsentsList] = useState<any[]>([]);

  const [otSchedules, setOTSchedules] = useState<any[]>([]);
  const [theatres] = useState<any[]>([
    { id: 'Major OT-1', name: 'Major OT-1 (Ground Floor)' },
    { id: 'Major OT-2', name: 'Major OT-2 (Ground Floor)' },
    { id: 'ICU OT', name: 'ICU Specialty OT (Floor 2)' },
    { id: 'Emergency OT', name: 'Emergency Trauma OT' }
  ]);

  const [isAorOpen, setIsAorOpen] = useState(false);
  const [aorPatientData, setAorPatientData] = useState<any>(null);

  // Surgery Form
  const [surgeryForm, setSurgeryForm] = useState({
    patientId: '',
    operationName: '',
    surgeonId: '',
    theatreId: 'Major OT-1',
    date: new Date().toISOString().split('T')[0],
    startTime: '10:00 AM',
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
          supabaseService.getPatientVitals(pId),
          supabaseService.getClinicalNotes(pId),
          supabaseService.getPrescriptions(pId),
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
  const [patientChecklists, setPatientChecklists] = useState<Record<string, any>>(() => {
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
    status: 'Available'
  });

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
  const isQuickRegisteringRef = useRef(false);

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

  const handleQuickRegister = async () => {
    if (!quickPatient.name || !quickPatient.age || !quickPatient.phone) {
      toast.error('Please fill in Patient Name, Age, and Contact Phone.');
      return;
    }

    if (isQuickRegistering || isQuickRegisteringRef.current) {
      toast.warning('Registration is in progress!');
      return;
    }
    isQuickRegisteringRef.current = true;
    setIsQuickRegistering(true);

    try {
      const patientToAdd = {
        name: quickPatient.name,
        age: parseInt(quickPatient.age) || 30,
        gender: quickPatient.gender,
        phone: quickPatient.phone,
        address: quickPatient.address || 'N/A',
        mrn: 'MRN-IPD-' + Math.floor(100 + Math.random() * 900),
        status: 'Admitting',
        needsAdmission: true,
        needs_admission: true,
        registration_type: 'IPD',
        registrationType: 'IPD',
        created_at: new Date().toISOString()
      };
      const result = await supabaseService.createPatient(patientToAdd);
      if (result) {
        setPatients(prev => [result, ...prev]);
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
      }
    } catch (error) {
      console.error('Error in quick registration:', error);
      toast.error('An error occurred during registration');
    } finally {
      setIsQuickRegistering(false);
      isQuickRegisteringRef.current = false;
    }
  };

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
        }
      }
    });

    return Array.from(map.values());
  };

  const displayBeds = useMemo(() => {
    return deduplicateBeds(beds);
  }, [beds]);

  const bedSummaryByCategory = useMemo(() => {
    const cleanBeds = deduplicateBeds(beds);
    const categoriesMap = new Map<string, any>();

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

  const recentlyDischargedPatients = useMemo(() => {
    const list: any[] = [];
    const seenPatientIds = new Set<string>();

    dischargeSummaries.forEach((s: any) => {
      const pId = s.patientId || s.patient_id;
      if (!pId || seenPatientIds.has(String(pId))) return;

      const pat = patients.find(p => String(p.id) === String(pId)) || {
        id: pId,
        name: s.patientName || 'Discharged Patient',
        mrn: s.mrn || 'MRN-N/A',
        phone: s.relativeContact || 'N/A',
        status: 'Discharged'
      };

      seenPatientIds.add(String(pId));
      const bed = beds.find(b => String(b.patient_id || b.patientId) === String(pId));
      const bedNum = bed ? (bed.bed_number || bed.number || bed.id) : (s.bedNumber || 'N/A');

      list.push({
        patient: pat,
        summary: s,
        bed: bed,
        dischargeDate: s.dischargeDate || new Date().toISOString(),
        bedNumber: String(bedNum)
      });
    });

    return list;
  }, [dischargeSummaries, patients, beds]);

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
      toast.success('Inpatient surgery scheduled successfully');
      setSurgeryForm({
        patientId: '',
        operationName: '',
        surgeonId: '',
        theatreId: 'Major OT-1',
        date: new Date().toISOString().split('T')[0],
        startTime: '10:00 AM',
        notes: ''
      });
    }
  };

  const getAttendingDoctorName = (patientId: string) => {
    const pat = patients.find(p => p.id === patientId) || MOCK_PATIENTS.find(p => p.id === patientId);
    if (!pat) return '';
    const docId = pat.attending_doctor_id || pat.attendingDoctorId;
    const doc = docId ? (
      users.find(u => String(u.id) === String(docId) || String(u.name).trim().toLowerCase() === String(docId).trim().toLowerCase())
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
        dischargeBy: existingSummary.dischargeBy || autoDoc || 'Dr. Rajesh Sharma',
        primaryDiagnosis: existingSummary.primaryDiagnosis || '',
        secondaryDiagnosis: existingSummary.secondaryDiagnosis || '',
        operativeProcedure: existingSummary.operativeProcedure || '',
        dischargeVitals: existingSummary.dischargeVitals || '',
        investigationHighlights: existingSummary.investigationHighlights || '',
        conditionAtDischarge: existingSummary.conditionAtDischarge || 'Hemodynamically Stable, Afebrile, Ambulatory',
        dietaryAdvice: existingSummary.dietaryAdvice || 'Soft, nutritious diet. Hydrate well (2.5-3L water/day). Avoid spicy & deep-fried foods.',
        emergencyWarningSigns: existingSummary.emergencyWarningSigns || 'High fever (>101°F), severe abdominal pain, persistent vomiting, shortness of breath, or surgical site redness/discharge.'
      });
      setDischargedSummaryToShow(existingSummary);
      setDischargeSearchTerm(pat ? pat.name : (existingSummary.patientName || 'Discharged Patient'));
      setShowDischargeSearchDropdown(false);
      toast.success(`Loaded Discharge Summary for ${pat ? pat.name : 'Patient'}`);
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
        dischargeBy: autoDoc || 'Dr. Rajesh Sharma',
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

    const bed = beds.find(b => b.patient_id === patientId || b.patientId === patientId);
    const activeAdmission = admissions.find(
      a => (a.patient_id === patientId || a.patientId === patientId) && a.status === 'Admitted'
    );
    const admissionId = activeAdmission ? activeAdmission.id : 'adm-' + Date.now();
    const finalDischargeDate = dischargeDate ? new Date(dischargeDate).toISOString() : new Date().toISOString();

    if (activeAdmission) {
      await supabaseService.dischargePatient(activeAdmission.id, finalDischargeDate);
    }

    await supabaseService.updatePatient(patientId, { status: 'Discharged', department: 'IPD', registration_type: 'IPD' });
    setPatients(patients.map(p => p.id === patientId ? { ...p, status: 'Discharged', department: 'IPD', registration_type: 'IPD' } : p));

    if (bed) {
      await supabaseService.updateBedStatus(bed.id, 'Available', null);
      setBeds(beds.map(b => b.id === bed.id ? { ...b, status: 'Available', patient_id: null, patientId: null } : b));
    }

    const summaryData = {
      id: 'sum-' + Date.now(),
      admissionId: admissionId,
      patientId: patientId,
      dischargeType,
      followUpDate,
      medications,
      clinicalSummary,
      dischargeDate: finalDischargeDate,
      dischargeBy: dischargeForm.dischargeBy || 'Dr. Rajesh Sharma',
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
    }

    toast.success('Patient discharged and summary saved!');
    setDischargedSummaryToShow(summaryData);
    setIsSummaryDetailsOpen(true);
  };

  const handleSaveClinicalNote = async (noteType: 'DOCTOR' | 'NURSE') => {
    const content = noteType === 'DOCTOR' ? newDoctorNote : newNurseNote;
    if (!content.trim()) {
      toast.error('Note content cannot be empty');
      return;
    }

    const noteData = {
      patient_id: selectedPatient.id,
      author_id: currentUser?.id || null,
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
      }
    } catch (err) {
      toast.error('Failed to save clinical note');
    }
  };

  const handleSavePrescription = async () => {
    if (!newPrescription.medicineName.trim()) {
      toast.error('Medicine name cannot be empty');
      return;
    }

    const docName = currentUser?.name || 'Dr. Rajesh Sharma';
    const rxData = {
      patient_id: selectedPatient.id,
      patientId: selectedPatient.id,
      doctor_name: docName,
      prescription_date: new Date().toISOString(),
      medicines: [
        {
          name: newPrescription.medicineName.trim(),
          dosage: newPrescription.dosage.trim() || 'Once a day',
          frequency: newPrescription.dosage.trim() || 'Once a day',
          duration: newPrescription.duration.trim() || '3 days'
        }
      ],
      advice: newPrescription.instructions.trim() || 'Complete bed rest'
    };

    try {
      const saved = await supabaseService.createPrescription(rxData);
      if (saved) {
        toast.success(`Prescription for ${newPrescription.medicineName.trim()} created successfully`);
        const rxList = await supabaseService.getPrescriptions(selectedPatient.id);
        if (rxList) setPatientPrescriptions(rxList);
        setNewPrescription({ medicineName: '', dosage: '', duration: '', instructions: '' });
      }
    } catch (err) {
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
      test_name: recommendedTestName,
      status: 'Pending',
      requested_at: new Date().toISOString()
    };

    try {
      const saved = await supabaseService.createLabTestRequest(testRequest);
      if (saved) {
        toast.success(`Recommended ${recommendedTestName} successfully`);
        const orders = await supabaseService.getLabTestRequests();
        if (orders) {
          const filtered = orders.filter((o: any) => o.patient_id === selectedPatient.id);
          setPatientTests(filtered);
        }
        setRecommendedTestName('');
      }
    } catch (err) {
      toast.error('Failed to save test recommendation');
    }
  };

  const handleAddBed = async () => {
    if (!newBed.number || !newBed.ward) {
      toast.error('Please fill in all fields');
      return;
    }

    const synced = await supabaseService.createBed({
      bed_number: newBed.number,
      number: newBed.number,
      ward: newBed.ward,
      bed_type: newBed.type,
      type: newBed.type,
      status: 'Available',
      daily_rate: MOCK_BED_RATES.find(r => r.type === newBed.type)?.rate || 500
    });

    if (synced) {
      setBeds(deduplicateBeds([...beds, synced]));
      setNewBed({ number: '', ward: '', type: 'General' });
      setIsAddBedOpen(false);
      toast.success('New bed added successfully');
    }
  };

  const handleTransfer = async () => {
    if (!transferData.toBedId) {
      toast.error('Please select a destination bed');
      return;
    }

    const patientObj = patients.find(p => String(p.id) === String(transferData.patientId)) || MOCK_PATIENTS.find(p => String(p.id) === String(transferData.patientId));
    const fromBedObj = beds.find(b => b.id === transferData.fromBedId);
    const toBedObj = beds.find(b => b.id === transferData.toBedId);

    if (!toBedObj) {
      toast.error('Selected target bed does not exist');
      return;
    }

    const successFrom = await supabaseService.updateBedStatus(transferData.fromBedId, 'Available', null);
    const successTo = await supabaseService.updateBedStatus(transferData.toBedId, 'Occupied', transferData.patientId);

    const shiftingRecord = {
      id: 'trf-' + Date.now(),
      patientId: transferData.patientId,
      patientName: patientObj?.name || 'Inpatient',
      fromBedId: transferData.fromBedId,
      fromBedNumber: fromBedObj?.bed_number || fromBedObj?.number || 'N/A',
      fromWard: fromBedObj?.ward || 'N/A',
      toBedId: transferData.toBedId,
      toBedNumber: toBedObj?.bed_number || toBedObj?.number || 'N/A',
      toWard: toBedObj?.ward || 'N/A',
      reason: transferData.reason || 'Clinical Step-Down / Transfer',
      transferDate: new Date().toISOString(),
      transferredBy: transferData.transferredBy || 'Dr. Ramesh Mehta',
      clinicalRequirements: transferData.clinicalRequirements || 'Standard ward care',
      nurseInCharge: transferData.nurseInCharge || 'Staff Nurse On-Duty'
    };

    const updatedTransfers = [shiftingRecord, ...bedTransfers];
    setBedTransfers(updatedTransfers);
    storage.set(STORAGE_KEYS.BED_TRANSFERS, updatedTransfers);

    setBeds(prev => prev.map(b => {
      if (b.id === transferData.fromBedId) {
        return { ...(successFrom || b), status: 'Available', patient_id: null, patientId: null };
      }
      if (b.id === transferData.toBedId) {
        return { ...(successTo || b), status: 'Occupied', patient_id: transferData.patientId, patientId: transferData.patientId };
      }
      return b;
    }));

    const activeAdm = admissions.find(a => (String(a.patient_id) === String(transferData.patientId) || String(a.patientId) === String(transferData.patientId)) && a.status === 'Admitted');
    if (activeAdm) {
      const updatedAdm = {
        ...activeAdm,
        bed_id: transferData.toBedId,
        bedId: transferData.toBedId,
        bed_number: toBedObj.bed_number || toBedObj.number,
        ward: toBedObj.ward
      };
      setAdmissions(prev => prev.map(a => a.id === activeAdm.id ? updatedAdm : a));
      supabaseService.updateAdmission(activeAdm.id, { bed_id: transferData.toBedId, ward: toBedObj.ward }).catch(() => {});
    }

    setIsTransferOpen(false);
    toast.success(`Patient ${patientObj?.name || ''} successfully transferred to Bed ${toBedObj.bed_number || toBedObj.number} (${toBedObj.ward})`);
  };

  const handleExecuteQuickDischarge = async (andGenerateSummary: boolean = true) => {
    if (!quickDischargeBed) {
      toast.error('No bed selected for discharge');
      return;
    }

    const bedPatId = quickDischargeBed.patient_id || quickDischargeBed.patientId;
    const patient = bedPatId 
      ? (patients.find(p => String(p.id) === String(bedPatId)) || MOCK_PATIENTS.find(p => String(p.id) === String(bedPatId)))
      : null;

    if (!patient) {
      await supabaseService.updateBedStatus(quickDischargeBed.id, 'Available', null);
      setBeds(prev => prev.map(b => b.id === quickDischargeBed.id ? { ...b, status: 'Available', patient_id: null, patientId: null } : b));
      setIsQuickDischargeOpen(false);
      toast.success(`Bed ${quickDischargeBed.bed_number || quickDischargeBed.number} marked as Available`);
      return;
    }

    const activeAdmission = admissions.find(
      a => (String(a.patient_id) === String(patient.id) || String(a.patientId) === String(patient.id)) && a.status === 'Admitted'
    );
    const admissionId = activeAdmission ? activeAdmission.id : 'adm-' + Date.now();
    const finalDischargeDate = quickDischargeForm.dischargeDate 
      ? new Date(`${quickDischargeForm.dischargeDate}T${quickDischargeForm.dischargeTime || '12:00'}:00`).toISOString() 
      : new Date().toISOString();

    if (activeAdmission) {
      await supabaseService.dischargePatient(activeAdmission.id, finalDischargeDate);
      setAdmissions(prev => prev.map(a => a.id === activeAdmission.id ? { ...a, status: 'Discharged', discharge_date: finalDischargeDate } : a));
    }

    await supabaseService.updatePatient(patient.id, { status: 'Discharged', department: 'IPD', registration_type: 'IPD' });
    setPatients(prev => prev.map(p => String(p.id) === String(patient.id) ? { ...p, status: 'Discharged' } : p));

    await supabaseService.updateBedStatus(quickDischargeBed.id, 'Available', null);
    setBeds(prev => prev.map(b => b.id === quickDischargeBed.id ? { ...b, status: 'Available', patient_id: null, patientId: null } : b));

    const summaryData: any = {
      id: 'sum-' + Date.now(),
      admissionId: admissionId,
      patientId: patient.id,
      patientName: patient.name,
      mrn: patient.mrn,
      age: patient.age,
      gender: patient.gender,
      ward: quickDischargeBed.ward,
      bedNumber: quickDischargeBed.bed_number || quickDischargeBed.number,
      admissionDate: activeAdmission?.admission_date || activeAdmission?.admissionDate || new Date().toISOString(),
      dischargeType: quickDischargeForm.dischargeType,
      followUpDate: quickDischargeForm.followUpDate,
      dischargeDate: finalDischargeDate,
      dischargeBy: quickDischargeForm.dischargeBy || 'Dr. Rajesh Sharma',
      primaryDiagnosis: activeAdmission?.diagnosis || 'Post-Treatment Recovery',
      secondaryDiagnosis: '',
      operativeProcedure: 'Medical Management / Conservative Care',
      conditionAtDischarge: quickDischargeForm.conditionAtDischarge,
      dietaryAdvice: quickDischargeForm.dietaryAdvice,
      emergencyWarningSigns: quickDischargeForm.emergencyWarningSigns,
      clinicalSummary: quickDischargeForm.notes || 'Patient evaluated and found clinically stable for planned discharge.',
      medications: []
    };

    const savedSummary = await supabaseService.createDischargeSummary(summaryData);
    const effectiveSummary = savedSummary || summaryData;
    setDischargeSummaries(prev => [effectiveSummary, ...prev.filter(s => s.id !== effectiveSummary.id)]);

    setIsQuickDischargeOpen(false);
    toast.success(`Patient ${patient.name} discharged successfully and Bed ${quickDischargeBed.bed_number || quickDischargeBed.number} freed.`);

    if (andGenerateSummary) {
      setDischargedSummaryToShow(effectiveSummary);
      setIsSummaryDetailsOpen(true);
    }
  };

  const handleDeleteBed = async (bedId: string) => {
    const targetBed = beds.find(b => b.id === bedId);
    if (!targetBed) return;
    if (targetBed.status === 'Occupied') {
      toast.error('Cannot delete an occupied bed. Please discharge or transfer the patient first.');
      return;
    }
    await supabaseService.deleteBed(bedId);
    setBeds(prev => prev.filter(b => b.id !== bedId));
    setIsEditBedOpen(false);
    toast.success(`Bed ${targetBed.bed_number || targetBed.number} deleted successfully`);
  };

  const pendingAdmissions = useMemo(() => {
    return patients.filter(p => p.needsAdmission === true || p.needs_admission === true || p.status === 'Admitting');
  }, [patients]);

  const occupiedBeds = displayBeds.filter(b => b.status === 'Occupied').length;
  const totalBeds = displayBeds.length;

  return (
    <div className="p-6 space-y-6">
      {/* Banner Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-500 text-white p-6 sm:p-8 shadow-xl shadow-blue-100">
        <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-[10px] font-black tracking-widest bg-white/20 text-white px-3 py-1 rounded-full uppercase my-1 select-none w-fit">
              ★ INPATIENT PORTAL ACTIVE
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl text-white">
              IPD Clinical & Bed Management
            </h1>
            <p className="text-blue-50 text-sm font-medium max-w-xl">
              Monitor active wards, assign patient beds, review nursing flowsheets, and execute discharges with statutory documentation.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 shadow-inner">
            <div className="relative">
              <Input 
                placeholder="Filter by name, MRN..." 
                className="pl-9 w-[200px] bg-white text-slate-800 rounded-xl text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            </div>
            <Button 
              className="bg-white text-indigo-900 hover:bg-indigo-50 gap-1.5 rounded-xl font-bold text-xs h-9 shadow-md"
              onClick={() => setIsAddBedOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Add Bed
            </Button>
            <Button 
              className="bg-teal-500 hover:bg-teal-600 text-white gap-1.5 rounded-xl font-bold text-xs h-9 shadow-md"
              onClick={() => setIsAdmissionOpen(true)}
            >
              <UserPlus className="w-4 h-4" />
              New Admission
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Action Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <Button 
            variant="outline" 
            className="border-blue-300 text-blue-700 bg-blue-50/80 hover:bg-blue-100 font-bold gap-2 text-xs"
            onClick={() => {
              setAdmissionSheetPatient(null);
              setIsAdmissionSheetOpen(true);
            }}
          >
            <FileText className="w-4 h-4 text-blue-600" />
            Admission Sheet & LAMA
          </Button>

          <Button 
            variant="outline" 
            className="border-teal-300 text-teal-700 bg-teal-50/80 hover:bg-teal-100 font-bold gap-2 text-xs"
            onClick={() => {
              setGeneralConsentPatient(null);
              setIsGeneralConsentOpen(true);
            }}
          >
            <Printer className="w-4 h-4 text-teal-600" />
            Bilingual General Consent
          </Button>

          <Button 
            variant="outline" 
            className="border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 font-bold gap-2 text-xs"
            onClick={() => {
              setPoorPrognosisPatient(null);
              setIsPoorPrognosisOpen(true);
            }}
          >
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            Poor Prognosis Consent
          </Button>
        </div>

        <div className="text-xs font-semibold text-slate-500">
          Total Beds: <span className="font-bold text-slate-800">{totalBeds}</span> • Occupied: <span className="font-bold text-blue-600">{occupiedBeds}</span> • Vacant: <span className="font-bold text-emerald-600">{Math.max(0, totalBeds - occupiedBeds)}</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center bg-slate-100/90 p-1.5 rounded-xl gap-1.5 border border-slate-200 shadow-inner w-full">
        <Button 
          variant="ghost"
          size="sm" 
          onClick={() => setActiveTab('beds')}
          className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
            activeTab === 'beds' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          Bed Allotment & Grid
        </Button>
        <Button 
          variant="ghost"
          size="sm" 
          onClick={() => setActiveTab('registration')}
          className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
            activeTab === 'registration' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          Inpatient Registration
        </Button>
        <Button 
          variant="ghost"
          size="sm" 
          onClick={() => setActiveTab('surgery')}
          className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
            activeTab === 'surgery' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          Surgery & OT Details
        </Button>
        <Button 
          variant="ghost"
          size="sm" 
          onClick={() => setActiveTab('discharge')}
          className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
            activeTab === 'discharge' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          Discharge Summary
        </Button>
        <Button 
          variant="ghost"
          size="sm" 
          onClick={() => setActiveTab('shifting')}
          className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
            activeTab === 'shifting' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          Intra-Hospital Shifting
        </Button>
        <Button 
          variant="ghost"
          size="sm" 
          onClick={() => setActiveTab('initial-evaluation')}
          className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
            activeTab === 'initial-evaluation' ? 'bg-teal-600 text-white shadow-md' : 'text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200'
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5" />
          Initial Evaluation Sheet
        </Button>
        <Button 
          variant="ghost"
          size="sm" 
          onClick={() => {
            setActiveTab('general-consent');
            setActiveStatutoryTab('general_consent');
          }}
          className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
            activeTab === 'general-consent' ? 'bg-blue-700 text-white shadow-md' : 'text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          General Consents ({generalConsentsList.length})
        </Button>
        <Button 
          variant="ghost"
          size="sm" 
          onClick={() => {
            setActiveTab('poor-prognosis');
            setActiveStatutoryTab('poor_prognosis');
          }}
          className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
            activeTab === 'poor-prognosis' ? 'bg-rose-700 text-white shadow-md' : 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Poor Prognosis Consents ({poorPrognosisList.length})
        </Button>
        <Button 
          variant="ghost"
          size="sm" 
          onClick={() => {
            setActiveTab('lama-death');
            setActiveStatutoryTab('lama_deceased');
          }}
          className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
            activeTab === 'lama-death' ? 'bg-rose-600 text-white shadow-md' : 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          LAMA & Death Register
        </Button>
        <Button 
          variant="ghost"
          size="sm" 
          onClick={() => setActiveTab('specialist-consultations')}
          className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
            activeTab === 'specialist-consultations' ? 'bg-indigo-600 text-white shadow-md' : 'text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          Specialist Consultations
        </Button>
      </div>

      {/* Tab: Beds */}
      {activeTab === 'beds' && (
        <div className="space-y-6">
          {/* Top Category Summary */}
          <Card className="border border-slate-200/80 shadow-xs bg-white overflow-hidden">
            <CardHeader className="p-4 bg-slate-50 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <BedIcon className="w-4 h-4 text-indigo-600" />
                  Ward & Category Bed Occupancy Overview
                </CardTitle>
                <CardDescription className="text-xs">
                  Real-time bed occupancy status across all hospital wards.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge className="bg-emerald-100 text-emerald-800 border-none font-bold text-xs">
                  {displayBeds.filter(b => b.status !== 'Occupied').length} Available
                </Badge>
                <Badge className="bg-blue-100 text-blue-800 border-none font-bold text-xs">
                  {displayBeds.filter(b => b.status === 'Occupied').length} Occupied
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="text-xs font-bold">Ward</TableHead>
                    <TableHead className="text-xs font-bold">Type</TableHead>
                    <TableHead className="text-xs font-bold text-center">Total</TableHead>
                    <TableHead className="text-xs font-bold text-center">Occupied</TableHead>
                    <TableHead className="text-xs font-bold text-center">Vacant</TableHead>
                    <TableHead className="text-xs font-bold">Bed Numbers</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bedSummaryByCategory.map((cat) => (
                    <TableRow key={cat.categoryKey}>
                      <TableCell className="font-bold text-xs text-slate-800">{cat.ward}</TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="text-[10px] font-bold">{cat.bedType}</Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono font-bold text-center">{cat.total}</TableCell>
                      <TableCell className="text-xs text-center font-bold text-blue-600">{cat.occupied}</TableCell>
                      <TableCell className="text-xs text-center font-bold text-emerald-600">{cat.vacant}</TableCell>
                      <TableCell className="text-xs text-slate-600">
                        <div className="flex flex-wrap gap-1">
                          {cat.occupiedBedNumbers.map((n: string) => (
                            <span key={`occ-${n}`} className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-blue-100 text-blue-800 rounded">
                              Bed {n} (Occ)
                            </span>
                          ))}
                          {cat.vacantBedNumbers.map((n: string) => (
                            <span key={`vac-${n}`} className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
                              Bed {n}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Bed Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {displayBeds.filter(bed => {
              if (!searchQuery) return true;
              const bedPatId = bed.patient_id || bed.patientId;
              const patient = bedPatId ? (patients.find(p => String(p.id) === String(bedPatId)) || MOCK_PATIENTS.find(p => String(p.id) === String(bedPatId))) : null;
              const query = searchQuery.toLowerCase();
              return (bed.bed_number || bed.number || '').toLowerCase().includes(query) ||
                     (bed.ward || '').toLowerCase().includes(query) ||
                     (patient?.name || '').toLowerCase().includes(query) ||
                     (patient?.mrn || '').toLowerCase().includes(query);
            }).map((bed) => {
              const bedPatId = bed.patient_id || bed.patientId;
              const patient = bedPatId ? (patients.find(p => String(p.id) === String(bedPatId)) || MOCK_PATIENTS.find(p => String(p.id) === String(bedPatId))) : null;
              const isOccupied = bed.status === 'Occupied';

              return (
                <Card key={bed.id} className={`border border-slate-200 shadow-xs hover:border-indigo-200 transition-all ${isOccupied ? 'bg-white' : 'bg-slate-50/50'}`}>
                  <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-start">
                      <Badge className={`text-[10px] font-bold ${
                        isOccupied ? 'bg-blue-100 text-blue-800 border-none' : 'bg-emerald-100 text-emerald-800 border-none'
                      }`}>
                        {isOccupied ? 'Occupied' : 'Available'}
                      </Badge>
                      <div className="flex gap-1">
                        {isOccupied && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-amber-600 hover:bg-amber-100 hover:text-amber-800 rounded-lg transition-colors"
                              title="Transfer Bed"
                              onClick={() => {
                                const patId = patient?.id || bedPatId || '';
                                const activeAdm = admissions.find(a => (String(a.patient_id) === String(patId) || String(a.patientId) === String(patId)) && a.status === 'Admitted');
                                setTransferData({ 
                                  patientId: patId, 
                                  fromBedId: bed.id, 
                                  toBedId: '', 
                                  reason: 'Clinical step-down to ward', 
                                  transferredBy: activeAdm?.attending_doctor || activeAdm?.doctor_name || 'Dr. Ramesh Mehta', 
                                  clinicalRequirements: 'Wheelchair assist / Standard care', 
                                  nurseInCharge: 'Staff Nurse Priya S.' 
                                });
                                setIsTransferOpen(true);
                              }}
                            >
                              <ArrowLeftRight className="w-3.5 h-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-rose-600 hover:bg-rose-100 hover:text-rose-800 rounded-lg transition-colors"
                              title="Discharge Patient"
                              onClick={() => {
                                setQuickDischargeBed(bed);
                                const patId = patient?.id || bedPatId || '';
                                const activeAdm = admissions.find(a => (String(a.patient_id) === String(patId) || String(a.patientId) === String(patId)) && a.status === 'Admitted');
                                const dues = patId ? checkPatientDues(patId) : 0;
                                setQuickDischargeForm({
                                  dischargeType: 'Routine / Improved',
                                  dischargeDate: new Date().toISOString().substring(0, 10),
                                  dischargeTime: new Date().toTimeString().substring(0, 5),
                                  followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
                                  conditionAtDischarge: 'Hemodynamically Stable, Afebrile, Ambulatory, Vitals within normal limits.',
                                  dietaryAdvice: 'Soft, nutritious diet. Adequate hydration (2.5-3L/day). Avoid spicy & oily foods.',
                                  emergencyWarningSigns: 'High fever (>101°F), severe abdominal pain, persistent vomiting, shortness of breath, or bleeding.',
                                  dischargeBy: activeAdm?.attending_doctor || activeAdm?.doctor_name || 'Dr. Rajesh Sharma',
                                  bypassDues: dues > 0,
                                  notes: 'Patient responded well to inpatient care and is fit for planned discharge.'
                                });
                                setIsQuickDischargeOpen(true);
                              }}
                            >
                              <LogOut className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-slate-500 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition-colors"
                          title="Edit Bed"
                          onClick={() => {
                            setEditingBed(bed);
                            setEditBedForm({
                              bedNumber: bed.bed_number || bed.number || '',
                              ward: bed.ward || 'General Ward',
                              bedType: bed.bed_type || bed.type || 'General',
                              pricePerDay: Number(bed.daily_rate) || 500,
                              status: bed.status || 'Available'
                            });
                            setIsEditBedOpen(true);
                          }}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <CardTitle className="text-base font-bold mt-1">Bed {bed.bed_number || bed.number}</CardTitle>
                    <CardDescription className="text-xs uppercase font-bold text-slate-500">{bed.ward} ({bed.bed_type || bed.type})</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-1">
                    {isOccupied ? (
                      <div className="space-y-2 text-xs">
                        <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-100">
                          <p className="font-bold text-blue-950">{patient?.name || 'Inpatient'}</p>
                          <p className="text-[10px] text-blue-700 font-mono">MRN: {patient?.mrn || 'IPD-ACTIVE'} • {patient?.age || 'Adult'}y / {patient?.gender || 'Patient'}</p>
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          {patient && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-7 text-[10px] font-bold border-teal-200 text-teal-800 bg-teal-50 hover:bg-teal-100"
                                onClick={() => {
                                  setSelectedPatient(patient);
                                  setIsChartOpen(true);
                                }}
                              >
                                <FileText className="w-3 h-3 text-teal-600 mr-1" />
                                Chart
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-7 text-[10px] font-bold border-indigo-200 text-indigo-800 bg-indigo-50 hover:bg-indigo-100"
                                onClick={() => {
                                  printDailyVitalsAndAdvice(patient, `Bed ${bed.bed_number || bed.number}`);
                                }}
                              >
                                <Printer className="w-3 h-3 text-indigo-600 mr-1" />
                                Vitals Sheet
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="py-4 text-center text-slate-300">
                        <BedIcon className="w-8 h-8 mx-auto mb-1 opacity-20" />
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ready for Admission</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Registration */}
      {activeTab === 'registration' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <Card className="border border-slate-200 shadow-xs bg-white">
              <CardHeader className="p-4 bg-slate-50 border-b">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-teal-600" />
                  Quick Register New Inpatient
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Patient Name</Label>
                    <Input value={quickPatient.name} onChange={(e) => setQuickPatient({...quickPatient, name: e.target.value})} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Age</Label>
                    <Input type="number" value={quickPatient.age} onChange={(e) => setQuickPatient({...quickPatient, age: e.target.value})} className="h-8 text-xs" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Gender</Label>
                    <Select value={quickPatient.gender} onValueChange={(v) => setQuickPatient({...quickPatient, gender: v})}>
                      <SelectTrigger className="h-8 text-xs bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Phone</Label>
                    <Input value={quickPatient.phone} onChange={(e) => setQuickPatient({...quickPatient, phone: e.target.value})} className="h-8 text-xs" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Address</Label>
                  <Input value={quickPatient.address} onChange={(e) => setQuickPatient({...quickPatient, address: e.target.value})} className="h-8 text-xs" />
                </div>
                <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold h-8 text-xs" onClick={handleQuickRegister}>
                  Create & Select Patient
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-7">
            <Card className="border border-slate-200 shadow-xs bg-white">
              <CardHeader className="p-4 bg-teal-600 text-white">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Building className="w-4 h-4 text-white" />
                  Allocate Bed & Check-In
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Patient Selection</Label>
                    <Select value={admissionForm.patientId} onValueChange={(v) => setAdmissionForm({...admissionForm, patientId: v})}>
                      <SelectTrigger className="h-9 text-xs bg-white"><SelectValue placeholder="Select patient" /></SelectTrigger>
                      <SelectContent>
                        {patients.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name} ({p.mrn})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Attending Doctor</Label>
                    <Select value={admissionForm.doctorId} onValueChange={(v) => setAdmissionForm({...admissionForm, doctorId: v})}>
                      <SelectTrigger className="h-9 text-xs bg-white"><SelectValue placeholder="Select doctor" /></SelectTrigger>
                      <SelectContent>
                        {doctorsList.map(doc => (
                          <SelectItem key={doc.id} value={doc.id}>{doc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Ward</Label>
                    <Select value={admissionForm.ward} onValueChange={(v) => setAdmissionForm({...admissionForm, ward: v, bedId: ''})}>
                      <SelectTrigger className="h-9 text-xs bg-white"><SelectValue placeholder="Select ward" /></SelectTrigger>
                      <SelectContent>
                        {hospitalWards.map(w => (
                          <SelectItem key={w} value={w}>{w}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Allocate Bed</Label>
                    <Select value={admissionForm.bedId} onValueChange={(v) => setAdmissionForm({...admissionForm, bedId: v})}>
                      <SelectTrigger className="h-9 text-xs bg-white"><SelectValue placeholder="Select bed" /></SelectTrigger>
                      <SelectContent>
                        {beds.filter(b => b.status === 'Available').map(b => (
                          <SelectItem key={b.id} value={b.id}>Bed {b.bed_number || b.number} ({b.ward})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold h-10 text-xs mt-2"
                  onClick={async () => {
                    const payload = {
                      patient_id: admissionForm.patientId,
                      bed_id: admissionForm.bedId,
                      doctor_id: admissionForm.doctorId,
                      ward: admissionForm.ward,
                      urgency: admissionForm.urgency,
                      status: 'Admitted'
                    };
                    const validation = validateAdmissionFields(payload, beds, patients);
                    if (!validation.isValid) {
                      validation.errors.forEach(e => toast.error(e));
                      return;
                    }
                    const synced = await supabaseService.createAdmission(payload);
                    if (synced) {
                      await supabaseService.updateBedStatus(admissionForm.bedId, 'Occupied', admissionForm.patientId);
                      await supabaseService.updatePatient(admissionForm.patientId, { status: 'Admitted', needs_admission: false });
                      toast.success('Patient checked in and bed allocated!');
                      fetchData();
                    }
                  }}
                >
                  Confirm Inpatient Check-In & Allocate Bed
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tab: Surgery */}
      {activeTab === 'surgery' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <Card className="border border-slate-200 shadow-xs bg-white">
              <CardHeader className="p-4 bg-slate-50 border-b">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-rose-600" />
                  Schedule Inpatient Surgery
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <div className="space-y-1">
                  <Label>Select Admitted Patient</Label>
                  <Select value={surgeryForm.patientId} onValueChange={(v) => setSurgeryForm({...surgeryForm, patientId: v})}>
                    <SelectTrigger className="h-8 text-xs bg-white"><SelectValue placeholder="Choose patient" /></SelectTrigger>
                    <SelectContent>
                      {patients.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name} ({p.mrn})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Procedure Name</Label>
                  <Input placeholder="e.g. Laparoscopic Appendectomy" value={surgeryForm.operationName} onChange={(e) => setSurgeryForm({...surgeryForm, operationName: e.target.value})} className="h-8 text-xs" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label>Surgeon</Label>
                    <Select value={surgeryForm.surgeonId} onValueChange={(v) => setSurgeryForm({...surgeryForm, surgeonId: v})}>
                      <SelectTrigger className="h-8 text-xs bg-white"><SelectValue placeholder="Choose surgeon" /></SelectTrigger>
                      <SelectContent>
                        {doctorsList.map(doc => (
                          <SelectItem key={doc.id} value={doc.id}>{doc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>OT Room</Label>
                    <Select value={surgeryForm.theatreId} onValueChange={(v) => setSurgeryForm({...surgeryForm, theatreId: v})}>
                      <SelectTrigger className="h-8 text-xs bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {theatres.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold h-8 text-xs mt-2" onClick={handleScheduleSurgery}>
                  Schedule Surgery
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-7">
            <Card className="border border-slate-200 shadow-xs bg-white">
              <CardHeader className="p-4 bg-slate-50 border-b">
                <CardTitle className="text-sm font-bold text-slate-800">Scheduled Surgeries</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {otSchedules.map(sched => (
                  <div key={sched.id} className="p-3 border border-slate-100 rounded-xl bg-slate-50/50 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-900">{sched.operation_name || sched.operationName}</p>
                      <p className="text-[10px] text-slate-500">{sched.date} at {sched.start_time || sched.startTime} • {sched.theatre_id || sched.theatreId}</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-7 text-[10px] font-bold text-amber-800 bg-amber-50 border-amber-200"
                      onClick={() => {
                        setAorPatientData({ name: 'Inpatient', diagnosis: sched.operation_name || sched.operationName });
                        setIsAorOpen(true);
                      }}
                    >
                      AOR Record
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tab: Discharge */}
      {activeTab === 'discharge' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <Card className="border border-slate-200 shadow-xs bg-white">
              <CardHeader className="p-4 bg-slate-50 border-b">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  Prepare Discharge Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <div className="space-y-1">
                  <Label>Select Inpatient</Label>
                  <Select value={dischargeForm.patientId} onValueChange={(v) => handleSelectPatientForDischarge(v)}>
                    <SelectTrigger className="h-8 text-xs bg-white"><SelectValue placeholder="Choose patient" /></SelectTrigger>
                    <SelectContent>
                      {patients.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name} ({p.mrn})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label>Discharge Type</Label>
                    <Select value={dischargeForm.dischargeType} onValueChange={(v) => setDischargeForm({...dischargeForm, dischargeType: v})}>
                      <SelectTrigger className="h-8 text-xs bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Routine / Improved">Routine / Improved</SelectItem>
                        <SelectItem value="LAMA (Left Against Medical Advice)">LAMA</SelectItem>
                        <SelectItem value="Deceased">Deceased</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Follow-Up Date</Label>
                    <Input type="date" value={dischargeForm.followUpDate} onChange={(e) => setDischargeForm({...dischargeForm, followUpDate: e.target.value})} className="h-8 text-xs" />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Clinical Treatment Course Summary</Label>
                  <textarea 
                    className="w-full border rounded-lg p-2 text-xs min-h-[80px]"
                    value={dischargeForm.clinicalSummary}
                    onChange={(e) => setDischargeForm({...dischargeForm, clinicalSummary: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <Label>Take-Home Prescribed Medications</Label>
                  <textarea 
                    className="w-full border rounded-lg p-2 text-xs min-h-[70px] font-mono"
                    value={dischargeForm.medications}
                    onChange={(e) => setDischargeForm({...dischargeForm, medications: e.target.value})}
                  />
                </div>

                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 text-xs mt-2" onClick={handleDischargeWithSummary}>
                  Save & Print Discharge Summary
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-7">
            <Card className="border border-slate-200 shadow-xs bg-white">
              <CardHeader className="p-4 bg-slate-50 border-b">
                <CardTitle className="text-sm font-bold text-slate-800">Discharge Registry</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {dischargeSummaries.map((summary) => (
                  <div key={summary.id} className="p-3 border border-slate-100 rounded-xl bg-slate-50/50 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-900">{summary.patientName || 'Patient'}</p>
                      <p className="text-[10px] text-slate-500">{summary.dischargeType} • {formatDate(summary.dischargeDate)}</p>
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
                      View & Print
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tab: Shifting */}
      {activeTab === 'shifting' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <Card className="border border-slate-200 shadow-xs bg-white">
              <CardHeader className="p-4 bg-slate-50 border-b">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-teal-600" />
                  Intra-Hospital Bed Transfer
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <div className="space-y-1">
                  <Label>Select Patient</Label>
                  <Select value={transferData.patientId} onValueChange={(v) => {
                    const bed = beds.find(b => b.patient_id === v || b.patientId === v);
                    setTransferData({...transferData, patientId: v, fromBedId: bed?.id || ''});
                  }}>
                    <SelectTrigger className="h-8 text-xs bg-white"><SelectValue placeholder="Choose patient" /></SelectTrigger>
                    <SelectContent>
                      {beds.filter(b => b.status === 'Occupied').map(b => {
                        const pat = patients.find(p => p.id === (b.patient_id || b.patientId));
                        return pat ? <SelectItem key={pat.id} value={pat.id}>{pat.name} (Bed {b.bed_number || b.number})</SelectItem> : null;
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Destination Bed</Label>
                  <Select value={transferData.toBedId} onValueChange={(v) => setTransferData({...transferData, toBedId: v})}>
                    <SelectTrigger className="h-8 text-xs bg-white"><SelectValue placeholder="Select target bed" /></SelectTrigger>
                    <SelectContent>
                      {beds.filter(b => b.status === 'Available').map(b => (
                        <SelectItem key={b.id} value={b.id}>Bed {b.bed_number || b.number} - {b.ward}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Reason for Transfer</Label>
                  <Input value={transferData.reason} onChange={(e) => setTransferData({...transferData, reason: e.target.value})} className="h-8 text-xs" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label>Authorizing Doctor</Label>
                    <Input placeholder="Dr. Ramesh Mehta" value={transferData.transferredBy} onChange={(e) => setTransferData({...transferData, transferredBy: e.target.value})} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label>Nurse In-Charge</Label>
                    <Input placeholder="Staff Nurse Priya S." value={transferData.nurseInCharge} onChange={(e) => setTransferData({...transferData, nurseInCharge: e.target.value})} className="h-8 text-xs" />
                  </div>
                </div>
                <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold h-9 text-xs mt-2" onClick={handleTransfer}>
                  Execute Bed Transfer
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-7">
            <Card className="border border-slate-200 shadow-xs bg-white">
              <CardHeader className="p-4 bg-slate-50 border-b">
                <CardTitle className="text-sm font-bold text-slate-800">Transfer History</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {bedTransfers.map(trf => (
                  <div key={trf.id} className="p-3 border border-slate-100 rounded-xl bg-slate-50/50 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-900">{trf.patientName}</p>
                      <p className="text-[10px] text-slate-500">From Bed {trf.fromBedNumber} → To Bed {trf.toBedNumber} ({trf.toWard})</p>
                      <p className="text-[10px] text-slate-400">{trf.reason}</p>
                    </div>
                    <Badge className="bg-teal-50 text-teal-700 border-teal-200 text-[10px] font-bold">
                      Completed
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tab: Initial Evaluation */}
      {activeTab === 'initial-evaluation' && (
        <InitialEvaluationSheetComponent patients={patients} admissions={admissions} beds={beds} users={users} />
      )}

      {/* Tab: Specialist Consultations */}
      {activeTab === 'specialist-consultations' && (
        <VisitingConsultants user={currentUser} embedded={true} />
      )}

      {/* Tab: LAMA & Death Register / Statutory */}
      {(activeTab === 'lama-death' || activeTab === 'poor-prognosis' || activeTab === 'general-consent') && (
        <div className="space-y-4">
          <Card className="border border-slate-200 shadow-xs bg-white">
            <CardHeader className="p-4 bg-slate-50 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-800">
                  Statutory Consents & Medico-Legal Records
                </CardTitle>
                <CardDescription className="text-xs">
                  Review and print Informed Consents, LAMA Waivers, and Death Certificates.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="h-8 text-xs font-bold bg-rose-700 text-white" onClick={() => setIsPoorPrognosisOpen(true)}>
                  + Poor Prognosis Consent
                </Button>
                <Button size="sm" className="h-8 text-xs font-bold bg-blue-700 text-white" onClick={() => setIsGeneralConsentOpen(true)}>
                  + General Consent Form
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-xs font-bold">Type</TableHead>
                    <TableHead className="text-xs font-bold">Patient Details</TableHead>
                    <TableHead className="text-xs font-bold">Doctor / Clinician</TableHead>
                    <TableHead className="text-xs font-bold">Status</TableHead>
                    <TableHead className="text-xs font-bold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dischargeSummaries.filter(s => s.dischargeType?.includes('LAMA') || s.dischargeType?.includes('Deceased')).map(summary => (
                    <TableRow key={summary.id}>
                      <TableCell className="text-xs">
                        <Badge className={`text-[10px] font-bold ${summary.dischargeType?.includes('Deceased') ? 'bg-slate-900 text-white' : 'bg-rose-100 text-rose-800'}`}>
                          {summary.dischargeType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-bold">{summary.patientName} ({summary.mrn})</TableCell>
                      <TableCell className="text-xs">{summary.dischargeBy}</TableCell>
                      <TableCell className="text-xs text-emerald-600 font-bold">Cleared</TableCell>
                      <TableCell className="text-xs text-right">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-7 text-[10px] font-bold"
                          onClick={() => {
                            setDischargedSummaryToShow(summary);
                            setIsSummaryDetailsOpen(true);
                          }}
                        >
                          Print Document
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Bed Modal */}
      <Dialog open={isAddBedOpen} onOpenChange={setIsAddBedOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add New Bed</DialogTitle>
            <DialogDescription>Add a new bed to a ward or department.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label>Bed Number</Label>
              <Input placeholder="e.g. 105" value={newBed.number} onChange={(e) => setNewBed({...newBed, number: e.target.value})} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label>Ward / Department</Label>
              <Select value={newBed.ward} onValueChange={(v) => setNewBed({...newBed, ward: v})}>
                <SelectTrigger className="h-8 text-xs bg-white"><SelectValue placeholder="Select ward" /></SelectTrigger>
                <SelectContent>
                  {hospitalWards.map(w => (
                    <SelectItem key={w} value={w}>{w}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Bed Type</Label>
              <Select value={newBed.type} onValueChange={(v) => setNewBed({...newBed, type: v})}>
                <SelectTrigger className="h-8 text-xs bg-white"><SelectValue /></SelectTrigger>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddBedOpen(false)}>Cancel</Button>
            <Button className="bg-medical-blue text-white font-bold" onClick={handleAddBed}>Add Bed</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Bed Modal */}
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <ArrowLeftRight className="w-5 h-5 text-amber-600" />
              Intra-Hospital Bed Transfer
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Transfer inpatient to an available bed, step-down ward, or ICU.
            </DialogDescription>
          </DialogHeader>

          {(() => {
            const transferPat = patients.find(p => String(p.id) === String(transferData.patientId)) || MOCK_PATIENTS.find(p => String(p.id) === String(transferData.patientId));
            const currentBed = beds.find(b => b.id === transferData.fromBedId);
            const availableTargetBeds = beds.filter(b => b.status === 'Available' && b.id !== transferData.fromBedId);

            return (
              <div className="space-y-4 py-2 text-xs">
                {/* Current Allocation Info */}
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-amber-950 text-sm">{transferPat?.name || 'Inpatient'}</p>
                      <p className="text-[11px] text-amber-800 font-mono mt-0.5">
                        MRN: {transferPat?.mrn || 'N/A'} • {transferPat?.age || 'Adult'}y / {transferPat?.gender || 'Patient'}
                      </p>
                    </div>
                    <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold">
                      Current: Bed {currentBed?.bed_number || currentBed?.number || 'N/A'} ({currentBed?.ward || 'General'})
                    </Badge>
                  </div>
                </div>

                {/* Destination Bed Selection */}
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700">Select Destination Bed *</Label>
                  <Select value={transferData.toBedId} onValueChange={(val) => setTransferData({ ...transferData, toBedId: val })}>
                    <SelectTrigger className="h-9 text-xs bg-white border-slate-300">
                      <SelectValue placeholder="Choose available destination bed" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTargetBeds.length === 0 ? (
                        <SelectItem value="none" disabled>No available beds found</SelectItem>
                      ) : (
                        availableTargetBeds.map(b => (
                          <SelectItem key={b.id} value={b.id}>
                            Bed {b.bed_number || b.number} — {b.ward} ({b.bed_type || b.type || 'General'}) • ₹{b.daily_rate || 500}/day
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {availableTargetBeds.length === 0 && (
                    <p className="text-[10px] text-rose-600 font-medium">All beds are currently occupied or under maintenance.</p>
                  )}
                </div>

                {/* Reason for Transfer with quick chips */}
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700">Reason for Transfer</Label>
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {['Clinical Step-Down', 'ICU Escalation', 'Post-Op Recovery', 'Patient Request', 'Isolation Need'].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setTransferData({ ...transferData, reason: preset })}
                        className={`text-[10px] px-2 py-0.5 rounded-md border font-medium transition-colors ${
                          transferData.reason === preset 
                            ? 'bg-amber-500 text-white border-amber-600' 
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <Input 
                    value={transferData.reason} 
                    onChange={(e) => setTransferData({ ...transferData, reason: e.target.value })} 
                    className="h-8 text-xs bg-white" 
                    placeholder="Enter reason for bed shifting"
                  />
                </div>

                {/* Staff in-charge */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="font-bold text-slate-700">Authorizing Doctor</Label>
                    <Input 
                      placeholder="e.g. Dr. Ramesh Mehta" 
                      value={transferData.transferredBy} 
                      onChange={(e) => setTransferData({ ...transferData, transferredBy: e.target.value })} 
                      className="h-8 text-xs bg-white" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="font-bold text-slate-700">Nurse In-Charge</Label>
                    <Input 
                      placeholder="e.g. Staff Nurse Priya S." 
                      value={transferData.nurseInCharge} 
                      onChange={(e) => setTransferData({ ...transferData, nurseInCharge: e.target.value })} 
                      className="h-8 text-xs bg-white" 
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="font-bold text-slate-700">Special Clinical Requirements</Label>
                  <Input 
                    placeholder="e.g. Oxygen support, Cardiac monitor, Wheelchair assist" 
                    value={transferData.clinicalRequirements} 
                    onChange={(e) => setTransferData({ ...transferData, clinicalRequirements: e.target.value })} 
                    className="h-8 text-xs bg-white" 
                  />
                </div>
              </div>
            );
          })()}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsTransferOpen(false)}>Cancel</Button>
            <Button 
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold" 
              onClick={handleTransfer}
              disabled={!transferData.toBedId}
            >
              <ArrowLeftRight className="w-3.5 h-3.5 mr-1.5" />
              Transfer Patient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Discharge Modal */}
      <Dialog open={isQuickDischargeOpen} onOpenChange={setIsQuickDischargeOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <LogOut className="w-5 h-5 text-rose-600" />
              Inpatient Discharge & Bed Clearance
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Finalize patient clinical discharge, generate summary notes, and release bed allocation.
            </DialogDescription>
          </DialogHeader>

          {(() => {
            const bedPatId = quickDischargeBed?.patient_id || quickDischargeBed?.patientId;
            const patient = bedPatId 
              ? (patients.find(p => String(p.id) === String(bedPatId)) || MOCK_PATIENTS.find(p => String(p.id) === String(bedPatId)))
              : null;
            const activeAdm = patient ? admissions.find(a => (String(a.patient_id) === String(patient.id) || String(a.patientId) === String(patient.id)) && a.status === 'Admitted') : null;
            const dues = patient ? checkPatientDues(patient.id) : 0;

            return (
              <div className="space-y-4 py-2 text-xs">
                {/* Patient Summary Header */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{patient?.name || 'Inpatient'}</p>
                      <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                        MRN: {patient?.mrn || 'N/A'} • {patient?.age || 'Adult'}y / {patient?.gender || 'Patient'} • Phone: {patient?.phone || 'N/A'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-50 text-blue-800 border-blue-200 text-[10px] font-bold">
                        Bed {quickDischargeBed?.bed_number || quickDischargeBed?.number} ({quickDischargeBed?.ward})
                      </Badge>
                      {activeAdm?.admission_date && (
                        <span className="text-[10px] text-slate-500">Adm: {formatDate(activeAdm.admission_date)}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Financial Clearance Check */}
                <div className={`p-3 rounded-xl border flex items-center justify-between ${
                  dues <= 0 ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950' : 'bg-amber-50/70 border-amber-200 text-amber-950'
                }`}>
                  <div className="flex items-center gap-2">
                    {dues <= 0 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                    <div>
                      <p className="font-bold text-xs">
                        {dues <= 0 ? 'Financial Status: Clear (No Pending Invoices)' : `Pending Dues: ₹${dues.toLocaleString('en-IN')}`}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {dues <= 0 ? 'Patient billing is fully settled.' : 'Discharge can proceed with managerial override or post-discharge clearance.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Form fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="font-bold text-slate-700">Discharge Category *</Label>
                    <Select 
                      value={quickDischargeForm.dischargeType} 
                      onValueChange={(val) => setQuickDischargeForm({ ...quickDischargeForm, dischargeType: val })}
                    >
                      <SelectTrigger className="h-8 text-xs bg-white border-slate-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Routine / Improved">Routine / Improved</SelectItem>
                        <SelectItem value="LAMA (Left Against Medical Advice)">LAMA (Left Against Medical Advice)</SelectItem>
                        <SelectItem value="Discharged on Request (DOR)">Discharged on Request (DOR)</SelectItem>
                        <SelectItem value="Referred / Higher Center">Referred / Higher Center</SelectItem>
                        <SelectItem value="Deceased">Deceased</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="font-bold text-slate-700">Attending Consultant</Label>
                    <Input 
                      value={quickDischargeForm.dischargeBy} 
                      onChange={(e) => setQuickDischargeForm({ ...quickDischargeForm, dischargeBy: e.target.value })} 
                      className="h-8 text-xs bg-white" 
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="font-bold text-slate-700">Discharge Date & Time</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="date" 
                        value={quickDischargeForm.dischargeDate} 
                        onChange={(e) => setQuickDischargeForm({ ...quickDischargeForm, dischargeDate: e.target.value })} 
                        className="h-8 text-xs bg-white" 
                      />
                      <Input 
                        type="time" 
                        value={quickDischargeForm.dischargeTime} 
                        onChange={(e) => setQuickDischargeForm({ ...quickDischargeForm, dischargeTime: e.target.value })} 
                        className="h-8 text-xs bg-white w-24" 
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="font-bold text-slate-700">Follow-Up Date</Label>
                    <Input 
                      type="date" 
                      value={quickDischargeForm.followUpDate} 
                      onChange={(e) => setQuickDischargeForm({ ...quickDischargeForm, followUpDate: e.target.value })} 
                      className="h-8 text-xs bg-white" 
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="font-bold text-slate-700">Condition at Discharge</Label>
                  <Input 
                    value={quickDischargeForm.conditionAtDischarge} 
                    onChange={(e) => setQuickDischargeForm({ ...quickDischargeForm, conditionAtDischarge: e.target.value })} 
                    className="h-8 text-xs bg-white" 
                    placeholder="e.g. Hemodynamically stable, afebrile, ambulatory"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="font-bold text-slate-700">Dietary & Activity Advice</Label>
                    <textarea 
                      value={quickDischargeForm.dietaryAdvice} 
                      onChange={(e) => setQuickDischargeForm({ ...quickDischargeForm, dietaryAdvice: e.target.value })} 
                      className="w-full border border-slate-300 rounded-lg p-2 text-xs min-h-[50px] bg-white resize-none" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="font-bold text-slate-700">Emergency Warning Signs</Label>
                    <textarea 
                      value={quickDischargeForm.emergencyWarningSigns} 
                      onChange={(e) => setQuickDischargeForm({ ...quickDischargeForm, emergencyWarningSigns: e.target.value })} 
                      className="w-full border border-slate-300 rounded-lg p-2 text-xs min-h-[50px] bg-white resize-none" 
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="font-bold text-slate-700">Doctor's Clinical Notes / Instructions</Label>
                  <textarea 
                    value={quickDischargeForm.notes} 
                    onChange={(e) => setQuickDischargeForm({ ...quickDischargeForm, notes: e.target.value })} 
                    placeholder="Patient recovered satisfactorily and is fit for planned discharge..."
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs min-h-[50px] bg-white resize-none" 
                  />
                </div>
              </div>
            );
          })()}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsQuickDischargeOpen(false)}>Cancel</Button>
            <Button 
              variant="outline" 
              className="border-slate-300 text-slate-700 hover:bg-slate-100 font-bold"
              onClick={() => handleExecuteQuickDischarge(false)}
            >
              Direct Free Bed
            </Button>
            <Button 
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold"
              onClick={() => handleExecuteQuickDischarge(true)}
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5" />
              Discharge & Generate Summary
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Bed Modal */}
      <Dialog open={isEditBedOpen} onOpenChange={setIsEditBedOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Edit className="w-5 h-5 text-teal-600" />
              Edit Bed Configuration
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Modify bed number, assigned ward, category, and daily tariff rate.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="font-bold text-slate-700">Bed Number / Identifier</Label>
              <Input 
                value={editBedForm.bedNumber} 
                onChange={(e) => setEditBedForm({...editBedForm, bedNumber: e.target.value})} 
                className="h-8 text-xs bg-white" 
                placeholder="e.g. 101"
              />
            </div>
            <div className="space-y-1">
              <Label className="font-bold text-slate-700">Ward / Department</Label>
              <Select 
                value={editBedForm.ward} 
                onValueChange={(v) => setEditBedForm({...editBedForm, ward: v})}
              >
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue placeholder="Select ward" />
                </SelectTrigger>
                <SelectContent>
                  {hospitalWards.map(w => (
                    <SelectItem key={w} value={w}>{w}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="font-bold text-slate-700">Bed Type</Label>
                <Select 
                  value={editBedForm.bedType} 
                  onValueChange={(v) => setEditBedForm({...editBedForm, bedType: v})}
                >
                  <SelectTrigger className="h-8 text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="ICU">ICU</SelectItem>
                    <SelectItem value="HDU">HDU</SelectItem>
                    <SelectItem value="Maternity">Maternity</SelectItem>
                    <SelectItem value="Semi-Private">Semi-Private</SelectItem>
                    <SelectItem value="Private">Private</SelectItem>
                    <SelectItem value="Deluxe">Deluxe</SelectItem>
                    <SelectItem value="Day Care">Day Care</SelectItem>
                    <SelectItem value="Emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="font-bold text-slate-700">Daily Rate (₹)</Label>
                <Input 
                  type="number" 
                  value={editBedForm.pricePerDay} 
                  onChange={(e) => setEditBedForm({...editBedForm, pricePerDay: parseInt(e.target.value) || 0})} 
                  className="h-8 text-xs bg-white" 
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="font-bold text-slate-700">Bed Status</Label>
              <Select 
                value={editBedForm.status} 
                onValueChange={(v) => setEditBedForm({...editBedForm, status: v})}
              >
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Available">Available</SelectItem>
                  <SelectItem value="Occupied">Occupied</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                  <SelectItem value="Cleaning">Cleaning</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editingBed?.status === 'Occupied' && (
              <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-900">
                Note: This bed is currently occupied. Changing status to Available here will release the bed.
              </div>
            )}
          </div>
          <DialogFooter className="flex justify-between items-center w-full">
            {editingBed && editingBed.status !== 'Occupied' && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-rose-600 hover:bg-rose-50 text-xs mr-auto"
                onClick={() => handleDeleteBed(editingBed.id)}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Delete Bed
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => setIsEditBedOpen(false)}>Cancel</Button>
              <Button className="bg-teal-600 hover:bg-teal-700 text-white font-bold" onClick={async () => {
                if (!editingBed) return;
                const updatedBedPayload = {
                  ...editingBed,
                  bed_number: editBedForm.bedNumber,
                  number: editBedForm.bedNumber,
                  ward: editBedForm.ward,
                  bed_type: editBedForm.bedType,
                  type: editBedForm.bedType,
                  daily_rate: editBedForm.pricePerDay,
                  status: editBedForm.status,
                  patient_id: editBedForm.status === 'Available' ? null : editingBed.patient_id,
                  patientId: editBedForm.status === 'Available' ? null : editingBed.patientId
                };

                setBeds(prev => prev.map(b => b.id === editingBed.id ? updatedBedPayload : b));
                await supabaseService.updateBed(editingBed.id, updatedBedPayload);
                toast.success(`Bed ${editBedForm.bedNumber} updated successfully`);
                setIsEditBedOpen(false);
              }}>
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Patient Chart Modal */}
      <Dialog open={isChartOpen} onOpenChange={setIsChartOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-600" />
              Clinical Patient Chart - {selectedPatient?.name} ({selectedPatient?.mrn})
            </DialogTitle>
            <DialogDescription className="text-xs">
              Review notes, prescriptions, laboratory tests, and special flowsheets.
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="doctor" className="w-full">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="doctor">Doctor Notes</TabsTrigger>
              <TabsTrigger value="nurse">Nurse Notes</TabsTrigger>
              <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
              <TabsTrigger value="charts">Flowsheets</TabsTrigger>
            </TabsList>
            <TabsContent value="doctor" className="space-y-3 pt-2 text-xs">
              <div className="space-y-2 max-h-[160px] overflow-y-auto">
                {clinicalNotes.filter(n => n.note_type === 'DOCTOR').map(note => (
                  <div key={note.id} className="p-2.5 bg-slate-50 border rounded-lg">
                    <p className="text-slate-800">{note.content}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{note.date || 'Recent'}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-1 pt-2 border-t">
                <Label>Add Doctor Note</Label>
                <textarea className="w-full border rounded-lg p-2 text-xs min-h-[60px]" value={newDoctorNote} onChange={(e) => setNewDoctorNote(e.target.value)} />
                <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-7 text-xs" onClick={() => handleSaveClinicalNote('DOCTOR')}>
                  Save Doctor Note
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="nurse" className="space-y-3 pt-2 text-xs">
              <div className="space-y-2 max-h-[160px] overflow-y-auto">
                {clinicalNotes.filter(n => n.note_type === 'NURSE').map(note => (
                  <div key={note.id} className="p-2.5 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                    <p className="text-slate-800">{note.content}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{note.date || 'Recent'}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-1 pt-2 border-t">
                <Label>Add Nurse Note</Label>
                <textarea className="w-full border rounded-lg p-2 text-xs min-h-[60px]" value={newNurseNote} onChange={(e) => setNewNurseNote(e.target.value)} />
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-7 text-xs" onClick={() => handleSaveClinicalNote('NURSE')}>
                  Save Nurse Note
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="prescriptions" className="space-y-3 pt-2 text-xs">
              <div className="space-y-2 max-h-[160px] overflow-y-auto">
                {patientPrescriptions.map(rx => (
                  <div key={rx.id} className="p-2.5 bg-slate-50 border rounded-lg font-mono">
                    <p className="font-bold text-slate-900">{rx.doctor_name || 'Doctor'}</p>
                    <p className="text-slate-700">{formatPrescriptionToText(rx)}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                <Input placeholder="Medicine name" value={newPrescription.medicineName} onChange={(e) => setNewPrescription({...newPrescription, medicineName: e.target.value})} className="h-8 text-xs" />
                <Input placeholder="Dosage (e.g. 1-0-1)" value={newPrescription.dosage} onChange={(e) => setNewPrescription({...newPrescription, dosage: e.target.value})} className="h-8 text-xs" />
              </div>
              <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-7 text-xs" onClick={handleSavePrescription}>
                Save Prescription
              </Button>
            </TabsContent>
            <TabsContent value="charts" className="pt-2">
              <SpecialClinicalCharts patientId={selectedPatient?.id} patientName={selectedPatient?.name} mrn={selectedPatient?.mrn} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Subcomponent Dialogs */}
      <AdmissionSheetModal isOpen={isAdmissionSheetOpen} onClose={() => setIsAdmissionSheetOpen(false)} patient={admissionSheetPatient} admission={admissionSheetAdmission} />
      <PoorPrognosisConsentModal isOpen={isPoorPrognosisOpen} onClose={() => setIsPoorPrognosisOpen(false)} patient={poorPrognosisPatient} admission={poorPrognosisAdmission} />
      <GeneralConsentModal isOpen={isGeneralConsentOpen} onClose={() => setIsGeneralConsentOpen(false)} patient={generalConsentPatient} admission={generalConsentAdmission} existingConsent={selectedGeneralConsent} />
      <AnaestheticOperationRecord isOpen={isAorOpen} onClose={() => setIsAorOpen(false)} patientData={aorPatientData} />
    </div>
  );
}
