import { useState, useEffect, useMemo, useRef, ChangeEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  User, 
  Calendar, 
  Bed, 
  History, 
  FileText, 
  CreditCard, 
  Pill, 
  Shield, 
  Stethoscope,
  Search,
  Share2,
  Printer,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Plus,
  Upload,
  Activity,
  ShoppingCart,
  Trash2,
  Loader2,
  Download,
  Eye,
  UserCheck,
  ShieldAlert,
  Baby,
  Edit,
  Pencil,
  Phone,
  Mail,
  MapPin,
  Scissors,
  ShieldCheck,
  HeartPulse,
  ClipboardList,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { formatCurrency, formatDate } from '@/lib/utils';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { toast } from 'sonner';
import { supabaseService, toDeterministicUuid } from '@/services/supabaseService';
import { useDataSync } from '@/hooks/useDataSync';
import { getPrescriptionPrintHtml } from '@/lib/prescriptionPrint';
import { triggerRxPrintPreview } from '@/components/RxPrintPreviewModal';
import { 
  MOCK_BED_RATES, 
  MOCK_PATIENTS, 
  MOCK_APPOINTMENTS, 
  MOCK_BILLING, 
  MOCK_PRESCRIPTIONS, 
  MOCK_PATIENT_VITALS, 
  MOCK_LAB_TESTS,
  MOCK_USERS,
  MOCK_OPERATION_RECORDS
} from '@/mockData';

const isPatientIdMatch = (id1: any, id2: any): boolean => {
  if (!id1 || !id2) return false;
  const s1 = String(id1).trim();
  const s2 = String(id2).trim();
  if (s1 === s2) return true;
  try {
    const isUuidFormat = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
    const u1 = isUuidFormat(s1) ? s1 : toDeterministicUuid(s1);
    const u2 = isUuidFormat(s2) ? s2 : toDeterministicUuid(s2);
    return u1 === u2;
  } catch {
    return false;
  }
};
import { getPathologyReportHtml, getRadiologyReportHtml, getMaternityReportHtml } from '@/lib/reportPrint';
import { getPatientReportHtml } from '@/lib/patientReportPrint';
import { normalizeRole } from '@/utils/rbac';
import OTConsentManagement from './OTConsentManagement';
import SurgicalSafetyChecklist from './SurgicalSafetyChecklist';
import PostOpForms from './PostOpForms';
import MedicationChartMaintenance from './MedicationChartMaintenance';
import VisitingConsultants from './VisitingConsultants';
import PoorPrognosisConsentModal from './PoorPrognosisConsentModal';
import GeneralConsentModal from './GeneralConsentModal';
import { ClipboardCheck } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function PatientOverview({ userRole }: { userRole?: string }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const patientIdFromUrl = searchParams.get('id') || searchParams.get('patientId');
  
  const [searchQuery, setSearchQuery] = useState('');
  
  // Instant synchronous patient list resolution
  const [patients, setPatients] = useState<any[]>(() => {
    const stored = storage.get<any[]>(STORAGE_KEYS.PATIENTS, []);
    return (stored && stored.length > 0) ? stored : (MOCK_PATIENTS || []);
  });
  
  // Instant synchronous selected patient resolution
  const [selectedPatient, setSelectedPatient] = useState<any>(() => {
    if (!patientIdFromUrl) return null;
    const stored = storage.get<any[]>(STORAGE_KEYS.PATIENTS, []);
    const pts = (stored && stored.length > 0) ? stored : (MOCK_PATIENTS || []);
    return pts.find((p: any) => p.id === patientIdFromUrl || isPatientIdMatch(p.id, patientIdFromUrl)) || null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<'All' | 'OPD/IPD' | 'Quick' | 'Quick-Lab' | 'Quick-Pharmacy'>('All');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{url: string, name: string} | null>(null);
  
  // State for detailed on-screen report viewer modal
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [reportType, setReportType] = useState<'pathology' | 'radiology'>('pathology');

  const [isEditPatientOpen, setIsEditPatientOpen] = useState(false);
  const [editPatientForm, setEditPatientForm] = useState({
    name: '',
    phone: '',
    email: '',
    age: '',
    gender: 'male',
    bloodGroup: '',
    address: '',
    relative1Relation: 'Father',
    relative1Name: '',
    relative1Phone: '',
    relative2Relation: 'Mother',
    relative2Name: '',
    relative2Phone: ''
  });
  const [isSavingPatientEdit, setIsSavingPatientEdit] = useState(false);

  const currentUser = useMemo(() => storage.get(STORAGE_KEYS.SESSION_USER, null), []);
  const isAccountant = normalizeRole(currentUser?.role || userRole) === 'ACCOUNTANT';
  const isReceptionist = normalizeRole(currentUser?.role || userRole) === 'RECEPTIONIST';
  const isClinicalRole = ['ADMIN', 'DOCTOR', 'NURSE', 'SURGEON'].includes(normalizeRole(currentUser?.role || userRole));
  const isDoctor = currentUser && (
    currentUser.role?.toUpperCase() === 'DOCTOR' || 
    currentUser.role?.toUpperCase() === 'SURGEON'
  );

  const assignedPatientIds = useMemo(() => {
    if (!isDoctor || !currentUser) return null;
    const ids = new Set<string>();
    const currentUserIdStr = String(currentUser.id || '').toLowerCase();
    const currentUserNameStr = String(currentUser.name || '').toLowerCase();
    
    // 1. Check attending_doctor_id or attendingDoctorId
    patients.forEach(p => {
      const attId = p.attending_doctor_id || p.attendingDoctorId;
      if (attId && String(attId).toLowerCase() === currentUserIdStr) {
        ids.add(p.id);
      }
    });
    
    // 2. Check appointments
    const allAppts = storage.get(STORAGE_KEYS.APPOINTMENTS, []);
    allAppts.forEach((apt: any) => {
      const aptDocId = apt.doctor_id || apt.doctorId;
      const aptDocName = apt.doctor || apt.doctorName || '';
      const aptDocNameLower = String(aptDocName).toLowerCase();
      
      const isDocMatch = 
        (aptDocId && String(aptDocId).toLowerCase() === currentUserIdStr) ||
        (aptDocName && aptDocNameLower === currentUserNameStr) ||
        (aptDocName && currentUserNameStr && currentUserNameStr.includes(aptDocNameLower)) ||
        (currentUser.name && aptDocNameLower && aptDocNameLower.includes(currentUserNameStr));
        
      if (isDocMatch) {
        const pId = apt.patient_id || apt.patientId;
        if (pId) {
          ids.add(pId);
        }
      }
    });
    
    return ids;
  }, [patients.length, isDoctor, currentUser?.id, currentUser?.name]);

  // Detail states initialized with cached data immediately
  const [prescriptions, setPrescriptions] = useState<any[]>(() => {
    const all = storage.get(STORAGE_KEYS.PRESCRIPTIONS, MOCK_PRESCRIPTIONS) || [];
    return patientIdFromUrl ? all.filter((r: any) => isPatientIdMatch(r.patient_id, patientIdFromUrl) || isPatientIdMatch(r.patientId, patientIdFromUrl)) : all;
  });
  const [isPrescriptionOpen, setIsPrescriptionOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [clinicalNotes, setClinicalNotes] = useState<any[]>(() => {
    const all = storage.get('hms_clinical_notes', []) || [];
    return patientIdFromUrl ? all.filter((n: any) => isPatientIdMatch(n.patient_id, patientIdFromUrl) || isPatientIdMatch(n.patientId, patientIdFromUrl)) : all;
  });
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [newNote, setNewNote] = useState({ content: '', note_type: 'DOCTOR' as 'DOCTOR' | 'NURSE' });
  const [historyFilter, setHistoryFilter] = useState<'all' | 'doctor' | 'nurse'>('all');
  
  const [appointments, setAppointments] = useState<any[]>(() => {
    const all = storage.get(STORAGE_KEYS.APPOINTMENTS, MOCK_APPOINTMENTS) || [];
    return patientIdFromUrl ? all.filter((a: any) => isPatientIdMatch(a.patient_id, patientIdFromUrl) || isPatientIdMatch(a.patientId, patientIdFromUrl)) : all;
  });
  const [billing, setBilling] = useState<any[]>(() => {
    const all = storage.get(STORAGE_KEYS.BILLING, MOCK_BILLING) || [];
    return patientIdFromUrl ? all.filter((b: any) => isPatientIdMatch(b.patient_id, patientIdFromUrl) || isPatientIdMatch(b.patientId, patientIdFromUrl)) : all;
  });
  const [beds, setBeds] = useState<any[]>(() => storage.get(STORAGE_KEYS.BEDS, []) || []);
  const [admissions, setAdmissions] = useState<any[]>(() => {
    const all = storage.get(STORAGE_KEYS.ADMISSIONS, []) || [];
    return patientIdFromUrl ? all.filter((a: any) => isPatientIdMatch(a.patient_id, patientIdFromUrl) || isPatientIdMatch(a.patientId, patientIdFromUrl)) : all;
  });
  const [labOrders, setLabOrders] = useState<any[]>(() => {
    const all = storage.get(STORAGE_KEYS.LAB_TEST_ORDERS, MOCK_LAB_TESTS) || [];
    return patientIdFromUrl ? all.filter((l: any) => isPatientIdMatch(l.patient_id, patientIdFromUrl) || isPatientIdMatch(l.patientId, patientIdFromUrl)) : all;
  });
  const [radiologyRecords, setRadiologyRecords] = useState<any[]>(() => {
    const all = storage.get(STORAGE_KEYS.RADIOLOGY_FILES, []) || [];
    return patientIdFromUrl ? all.filter((r: any) => isPatientIdMatch(r.patient_id, patientIdFromUrl) || isPatientIdMatch(r.patientId, patientIdFromUrl)) : all;
  });
  const [maternityDeliveries, setMaternityDeliveries] = useState<any[]>([]);
  const [maternityNewborns, setMaternityNewborns] = useState<any[]>([]);
  const [labSubTab, setLabSubTab] = useState<'pathology' | 'radiology'>('pathology');

  const [vitals, setVitals] = useState<any[]>(() => {
    const all = storage.get(STORAGE_KEYS.PATIENT_VITALS, MOCK_PATIENT_VITALS) || [];
    return patientIdFromUrl ? all.filter((v: any) => isPatientIdMatch(v.patient_id, patientIdFromUrl) || isPatientIdMatch(v.patientId, patientIdFromUrl)) : all;
  });
  const [insuranceClaims, setInsuranceClaims] = useState<any[]>(() => {
    const all = storage.get(STORAGE_KEYS.INSURANCE, []) || [];
    return patientIdFromUrl ? all.filter((c: any) => isPatientIdMatch(c.patient_id, patientIdFromUrl) || isPatientIdMatch(c.patientId, patientIdFromUrl)) : all;
  });
  const [staff, setStaff] = useState<any[]>(() => storage.get(STORAGE_KEYS.USERS, MOCK_USERS) || []);
  const [pharmacyBills, setPharmacyBills] = useState<any[]>(() => {
    const all = storage.get(STORAGE_KEYS.PHARMACY_BILLS, []) || [];
    return patientIdFromUrl ? all.filter((b: any) => isPatientIdMatch(b.patient_id, patientIdFromUrl) || isPatientIdMatch(b.patientId, patientIdFromUrl)) : all;
  });
  const [newPrescription, setNewPrescription] = useState({
    medicines: [{ name: '', dosage: '', frequency: '' }],
    diagnosis: '',
    advice: '',
    vitals: {
      bp: '',
      pulse: '',
      temp: '',
      spo2: '',
      weight: '',
      rr: ''
    }
  });
  const [uploadedFile, setUploadedFile] = useState<{name: string, url: string} | null>(null);

  const [isConsentOpen, setIsConsentOpen] = useState(false);
  const [isPoorPrognosisOpen, setIsPoorPrognosisOpen] = useState(false);
  const [isGeneralConsentOpen, setIsGeneralConsentOpen] = useState(false);
  const [isSurgicalChecklistOpen, setIsSurgicalChecklistOpen] = useState(false);
  const [isPostOpOpen, setIsPostOpOpen] = useState(false);
  const [postOpDefaultTab, setPostOpDefaultTab] = useState<'checklist' | 'instructions'>('checklist');

  const patientOTRecords = useMemo(() => {
    if (!selectedPatient) return [];
    const schedules = storage.get('hms_ot_schedules', MOCK_OPERATION_RECORDS) || [];
    return schedules.filter((s: any) => 
      isPatientIdMatch(s.patientId, selectedPatient.id) || 
      isPatientIdMatch(s.patient_id, selectedPatient.id) ||
      (selectedPatient.mrn && (s.patientMrn === selectedPatient.mrn || s.patient_mrn === selectedPatient.mrn))
    );
  }, [selectedPatient]);

  const activeOTRecord = useMemo(() => {
    if (!selectedPatient) return null;
    if (patientOTRecords.length > 0) {
      return patientOTRecords[0];
    }
    return {
      id: `ot-manual-${selectedPatient.id}`,
      patientId: selectedPatient.id,
      patient_id: selectedPatient.id,
      operationName: 'General Surgical Procedure',
      surgeonName: currentUser?.name || 'Assigned Surgeon',
      startTime: '10:00 AM',
      scheduled_date: 'Today',
      status: 'Scheduled'
    };
  }, [selectedPatient, currentUser, patientOTRecords]);

  const isFinancialVisible = true;
  const setLoading = setIsLoading;

  const doctorsList = useMemo(() => {
    const list = staff.filter((u: any) => {
      const norm = normalizeRole(u.role);
      return (
        norm === 'DOCTOR' || 
        norm === 'SURGEON' || 
        norm === 'ADMIN' || 
        (u.name && u.name.toLowerCase().includes('dr.'))
      );
    });

    if (selectedPatient) {
      const currentDocId = selectedPatient.attending_doctor_id || selectedPatient.attendingDoctorId;
      if (currentDocId && currentDocId !== 'unassigned') {
        const docInStaff = staff.find((u: any) => String(u.id).toLowerCase() === String(currentDocId).toLowerCase());
        if (docInStaff && !list.some((u: any) => String(u.id).toLowerCase() === String(currentDocId).toLowerCase())) {
          list.push(docInStaff);
        }
      }
    }

    if (list.length === 0) {
      return [
        { id: 'd1', name: 'Dr. Abdul Qayoom', department: 'General Consultation' },
        { id: 'd2', name: 'Dr. Rajesh Sharma', department: 'Internal Medicine' },
        { id: 'd3', name: 'Dr. Anjali Gupta', department: 'Gynaecology & Maternity' }
      ];
    }
    return list;
  }, [staff, selectedPatient]);

  const handleUpdateAttendingDoctor = async (doctorId: string) => {
    if (!selectedPatient) return;
    try {
      const updatedPatient = {
        ...selectedPatient,
        attending_doctor_id: doctorId || null,
        attendingDoctorId: doctorId || null
      };
      
      const result = await supabaseService.updatePatient(selectedPatient.id, updatedPatient);
      if (result) {
        setSelectedPatient(result);
        setPatients(prevPatients => prevPatients.map(p => isPatientIdMatch(p.id, selectedPatient.id) ? result : p));
        toast.success('Attending doctor updated successfully');
      }
    } catch (error: any) {
      toast.error('Failed to update attending doctor: ' + error.message);
    }
  };

  const openEditPatientModal = () => {
    if (!selectedPatient) return;
    const r1Rel = selectedPatient.relative1Relation || selectedPatient.relative1_relation || (selectedPatient.fatherName || selectedPatient.father_name ? 'Father' : (selectedPatient.husbandName || selectedPatient.husband_name ? 'Husband' : 'Father'));
    const r1N = selectedPatient.relative1Name || selectedPatient.relative1_name || selectedPatient.fatherName || selectedPatient.father_name || selectedPatient.husbandName || selectedPatient.husband_name || '';
    const r1P = selectedPatient.relative1Phone || selectedPatient.relative1_phone || selectedPatient.fatherPhone || selectedPatient.father_phone || selectedPatient.husbandPhone || selectedPatient.husband_phone || '';

    const r2Rel = selectedPatient.relative2Relation || selectedPatient.relative2_relation || 'Mother';
    const r2N = selectedPatient.relative2Name || selectedPatient.relative2_name || selectedPatient.motherName || selectedPatient.mother_name || '';
    const r2P = selectedPatient.relative2Phone || selectedPatient.relative2_phone || selectedPatient.motherPhone || selectedPatient.mother_phone || '';

    setEditPatientForm({
      name: selectedPatient.name || '',
      phone: selectedPatient.phone || selectedPatient.mobile || selectedPatient.contact || '',
      email: selectedPatient.email || '',
      age: selectedPatient.age ? String(selectedPatient.age) : '',
      gender: selectedPatient.gender || 'male',
      bloodGroup: selectedPatient.bloodGroup || selectedPatient.blood_group || '',
      address: selectedPatient.address || '',
      relative1Relation: r1Rel,
      relative1Name: r1N,
      relative1Phone: r1P,
      relative2Relation: r2Rel,
      relative2Name: r2N,
      relative2Phone: r2P
    });
    setIsEditPatientOpen(true);
  };

  const handleSavePatientEdit = async () => {
    if (!selectedPatient) return;
    setIsSavingPatientEdit(true);
    try {
      const cleanPhone = (editPatientForm.phone || '').trim();
      const updatedData: any = {
        name: editPatientForm.name.trim() || selectedPatient.name,
        phone: cleanPhone,
        mobile: cleanPhone,
        contact: cleanPhone,
        phone_number: cleanPhone,
        phoneNumber: cleanPhone,
        email: editPatientForm.email ? editPatientForm.email.trim() : null,
        age: editPatientForm.age ? Number(editPatientForm.age) : selectedPatient.age,
        gender: editPatientForm.gender || selectedPatient.gender || 'male',
        blood_group: editPatientForm.bloodGroup || selectedPatient.blood_group,
        address: editPatientForm.address || '',
        relative1_relation: editPatientForm.relative1Relation,
        relative1_name: editPatientForm.relative1Name || '',
        relative1_phone: editPatientForm.relative1Phone || '',
        relative2_relation: editPatientForm.relative2Relation,
        relative2_name: editPatientForm.relative2Name || '',
        relative2_phone: editPatientForm.relative2Phone || ''
      };

      const result = await supabaseService.updatePatient(selectedPatient.id, updatedData);
      const merged = { ...selectedPatient, ...updatedData, ...(result || {}) };
      setSelectedPatient(merged);
      setPatients(prev => prev.map(p => isPatientIdMatch(p.id, selectedPatient.id) ? merged : p));

      // Update storage
      const existingStored = storage.get(STORAGE_KEYS.PATIENTS, []) || [];
      const updatedStored = existingStored.map((p: any) => isPatientIdMatch(p.id, selectedPatient.id) ? { ...p, ...updatedData, ...(result || {}) } : p);
      storage.set(STORAGE_KEYS.PATIENTS, updatedStored);

      window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table: 'patients', action: 'update' } }));
      window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table: 'appointments', action: 'update' } }));

      toast.success('Patient details & phone number updated successfully');
      setIsEditPatientOpen(false);
    } catch (err: any) {
      console.error('Error updating patient:', err);
      toast.error('Failed to update patient: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSavingPatientEdit(false);
    }
  };

  const lastFetchedPatientIdRef = useRef<string | null>(null);
  const isFetchingDetailsRef = useRef(false);

  const loadLocalPatientDetails = (id: string) => {
    if (!id) return;
    const allAppts = storage.get<any[]>(STORAGE_KEYS.APPOINTMENTS, MOCK_APPOINTMENTS) || [];
    const allBills = storage.get<any[]>(STORAGE_KEYS.BILLING, MOCK_BILLING) || [];
    const allRx = storage.get<any[]>(STORAGE_KEYS.PRESCRIPTIONS, MOCK_PRESCRIPTIONS) || [];
    const allVts = storage.get<any[]>(STORAGE_KEYS.PATIENT_VITALS, MOCK_PATIENT_VITALS) || [];
    const allLabs = storage.get<any[]>(STORAGE_KEYS.LAB_TEST_ORDERS, MOCK_LAB_TESTS) || [];
    const allRad = storage.get<any[]>(STORAGE_KEYS.RADIOLOGY_FILES, []) || [];
    const allClaims = storage.get<any[]>(STORAGE_KEYS.INSURANCE, []) || [];
    const allNotes = storage.get<any[]>('hms_clinical_notes', []) || [];
    const allAdms = storage.get<any[]>(STORAGE_KEYS.ADMISSIONS, []) || [];
    const allPharm = storage.get<any[]>(STORAGE_KEYS.PHARMACY_BILLS, []) || [];

    setAppointments(allAppts.filter((a: any) => isPatientIdMatch(a.patient_id, id) || isPatientIdMatch(a.patientId, id)));
    setAdmissions(allAdms.filter((a: any) => isPatientIdMatch(a.patient_id, id) || isPatientIdMatch(a.patientId, id)));

    const patientBills = allBills.filter((b: any) => isPatientIdMatch(b.patient_id, id) || isPatientIdMatch(b.patientId, id));
    setBilling(patientBills);

    const pBills = [
      ...patientBills.filter((b: any) => {
        const isPharmType = b.type === 'Pharmacy' || b.invoice_type === 'Pharmacy' || String(b.invoice_number || b.invoiceNumber || '').toUpperCase().startsWith('INV-POS');
        const hasPharmItems = b.invoice_items?.some((item: any) => String(item.category).toUpperCase() === 'PHARMACY') || b.items?.some((item: any) => String(item.category).toUpperCase() === 'PHARMACY');
        return isPharmType || hasPharmItems;
      }),
      ...allPharm.filter((b: any) => isPatientIdMatch(b.patient_id, id) || isPatientIdMatch(b.patientId, id))
    ];
    setPharmacyBills(pBills);

    const normalizedRx = allRx.filter((r: any) => isPatientIdMatch(r.patient_id, id) || isPatientIdMatch(r.patientId, id)).map((r: any) => ({
      ...r,
      patientId: r.patient_id || r.patientId,
      doctorId: r.doctor_id || r.doctorId,
      date: r.prescription_date || r.date || r.created_at
    }));
    setPrescriptions(normalizedRx);

    setVitals(allVts.filter((v: any) => isPatientIdMatch(v.patient_id, id) || isPatientIdMatch(v.patientId, id)));

    const normalizedLabs = allLabs.filter((l: any) => isPatientIdMatch(l.patient_id, id) || isPatientIdMatch(l.patientId, id)).map((l: any) => ({
      ...l,
      patientId: l.patient_id || l.patientId,
      test: l.test_name || l.test,
      date: l.requested_at || l.date || l.created_at,
      result: l.result_value || l.result,
      range: l.reference_range || l.range,
      unit: l.unit
    }));
    setLabOrders(normalizedLabs);

    setInsuranceClaims(allClaims.filter((c: any) => isPatientIdMatch(c.patient_id, id) || isPatientIdMatch(c.patientId, id)));
    setRadiologyRecords(allRad.filter((r: any) => isPatientIdMatch(r.patient_id, id) || isPatientIdMatch(r.patientId, id)));
    setClinicalNotes(allNotes.filter((n: any) => isPatientIdMatch(n.patient_id, id) || isPatientIdMatch(n.patientId, id)));
  };

  const fetchInitialData = async (showSpinner = false) => {
    if (showSpinner) {
      setIsLoading(true);
    }
    try {
      const [pts, bds, stf] = await Promise.all([
        supabaseService.getPatients(),
        supabaseService.getBeds(),
        supabaseService.getStaff()
      ]);
      if (pts && pts.length > 0) setPatients(pts);
      if (bds) setBeds(bds);
      if (stf) setStaff(stf);
    } catch (e) {
      console.warn('Silent fallback for PatientOverview initial data:', e);
    } finally {
      if (showSpinner) {
        setIsLoading(false);
      }
    }
  };

  const fetchPatientDetails = async (id: string, force = false) => {
    if (!id) return;
    if (isFetchingDetailsRef.current && !force) return;
    isFetchingDetailsRef.current = true;
    
    // First load from local storage instantly
    loadLocalPatientDetails(id);

    try {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 6000));
      const queryPromise = Promise.all([
        supabaseService.getAppointments(),
        supabaseService.getInvoices(),
        supabaseService.getPrescriptions(id),
        supabaseService.getPatientVitals(id),
        supabaseService.getLabTestRequests(),
        supabaseService.getInsuranceClaims(),
        supabaseService.getRadiologyRecords ? supabaseService.getRadiologyRecords() : Promise.resolve([]),
        supabaseService.getDeliveries ? supabaseService.getDeliveries() : Promise.resolve([]),
        supabaseService.getNewborns ? supabaseService.getNewborns() : Promise.resolve([]),
        supabaseService.getClinicalNotes ? supabaseService.getClinicalNotes(id) : Promise.resolve([]),
        supabaseService.getAdmissions ? supabaseService.getAdmissions() : Promise.resolve([])
      ]);

      const results: any = await Promise.race([queryPromise, timeoutPromise]).catch(() => []);
      const [appts, bills, rx, vts, labs, claims, rads, dels, babies, notes, adms] = Array.isArray(results) ? results : [];

      if (appts && appts.length > 0) setAppointments(appts.filter((a: any) => isPatientIdMatch(a.patient_id, id) || isPatientIdMatch(a.patientId, id)));
      if (adms && adms.length > 0) setAdmissions(adms.filter((a: any) => isPatientIdMatch(a.patient_id, id) || isPatientIdMatch(a.patientId, id)));
      if (bills && bills.length > 0) {
        const patientBills = bills.filter((b: any) => isPatientIdMatch(b.patient_id, id) || isPatientIdMatch(b.patientId, id));
        setBilling(patientBills);
        
        const pBills = patientBills.filter((b: any) => {
          const isPharmType = b.type === 'Pharmacy' || b.invoice_type === 'Pharmacy' || String(b.invoice_number || b.invoiceNumber || '').toUpperCase().startsWith('INV-POS');
          const hasPharmItems = b.invoice_items?.some((item: any) => String(item.category).toUpperCase() === 'PHARMACY') || b.items?.some((item: any) => String(item.category).toUpperCase() === 'PHARMACY');
          return isPharmType || hasPharmItems;
        });
        setPharmacyBills(pBills);
      }
      if (rx && rx.length > 0) {
        const normalizedRx = rx.map((r: any) => ({
          ...r,
          patientId: r.patient_id || r.patientId,
          doctorId: r.doctor_id || r.doctorId,
          date: r.prescription_date || r.date || r.created_at
        }));
        setPrescriptions(normalizedRx);
      }
      if (vts && vts.length > 0) setVitals(vts);
      if (labs && labs.length > 0) {
        const normalizedLabs = labs.filter((l: any) => isPatientIdMatch(l.patient_id, id)).map((l: any) => ({
          ...l,
          patientId: l.patient_id,
          test: l.test_name,
          date: l.requested_at,
          result: l.result_value,
          range: l.reference_range,
          unit: l.unit
        }));
        setLabOrders(normalizedLabs);
      }
      if (claims && claims.length > 0) setInsuranceClaims(claims.filter((c: any) => isPatientIdMatch(c.patient_id, id)));
      if (rads && rads.length > 0) {
        setRadiologyRecords(rads.filter((r: any) => isPatientIdMatch(r.patient_id, id)));
      }
      if (dels && dels.length > 0) {
        setMaternityDeliveries(dels.filter((d: any) => isPatientIdMatch(d.patient_id, id)));
      }
      if (babies && babies.length > 0) {
        setMaternityNewborns(babies.filter((b: any) => isPatientIdMatch(b.mother_id, id)));
      }
      if (notes && notes.length > 0) {
        setClinicalNotes(notes);
      }
      lastFetchedPatientIdRef.current = id;
    } catch (e) {
      console.warn('Error fetching patient details in PatientOverview:', e);
    } finally {
      isFetchingDetailsRef.current = false;
    }
  };

  // Run initial data fetch silently on component mount
  useEffect(() => {
    fetchInitialData(false);
  }, []);

  // Safe compound fetcher for reactive sync events
  const handleSyncFetch = async () => {
    await fetchInitialData(false);
    if (patientIdFromUrl) {
      await fetchPatientDetails(patientIdFromUrl, true);
    }
  };

  useDataSync(handleSyncFetch);

  useEffect(() => {
    if (patientIdFromUrl) {
      const stored = storage.get<any[]>(STORAGE_KEYS.PATIENTS, []);
      const patient = patients.find(p => p.id === patientIdFromUrl || isPatientIdMatch(p.id, patientIdFromUrl)) ||
                      stored.find(p => p.id === patientIdFromUrl || isPatientIdMatch(p.id, patientIdFromUrl));
      if (patient) {
        setSelectedPatient((prev: any) => {
          if (prev && isPatientIdMatch(prev.id, patient.id) && prev.name === patient.name && prev.phone === patient.phone && prev.attending_doctor_id === patient.attending_doctor_id && prev.status === patient.status) {
            return prev;
          }
          return patient;
        });
        loadLocalPatientDetails(patient.id);
        if (lastFetchedPatientIdRef.current !== patient.id) {
          fetchPatientDetails(patient.id);
        }
      } else {
        // Direct fallback query if opening directly via shared link or bookmark
        supabaseService.getPatients().then((pts: any[]) => {
          if (pts && pts.length > 0) {
            setPatients(pts);
            const found = pts.find(p => p.id === patientIdFromUrl || isPatientIdMatch(p.id, patientIdFromUrl));
            if (found) {
              setSelectedPatient(found);
              loadLocalPatientDetails(found.id);
              fetchPatientDetails(found.id);
            }
          }
        }).catch(() => {});
      }
    } else {
      setSelectedPatient(null);
      lastFetchedPatientIdRef.current = null;
    }
  }, [patientIdFromUrl, patients.length]);

  const handlePrintPathologyReport = (order: any) => {
    if (!selectedPatient) return;
    
    const printWindow = window.open('', '_blank', 'width=800,height=1000');
    if (!printWindow) {
      toast.error('Please allow popups to print report');
      return;
    }

    const hospitalInfo = storage.get<{ name: string; address: string; phone: string }>(STORAGE_KEYS.HOSPITAL_INFO, {
      name: 'NEW GASTRO PLUS HOSPITAL',
      address: '123 Healthcare Way, Medical City',
      phone: '+91 98765 43210'
    });

    const html = getPathologyReportHtml(
      {
        name: selectedPatient.name,
        age: selectedPatient.age,
        gender: selectedPatient.gender,
        mrn: selectedPatient.mrn,
        phone: selectedPatient.phone
      },
      order,
      undefined,
      hospitalInfo
    );

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handlePrintRadiologyReport = (record: any) => {
    if (!selectedPatient) return;

    const printWindow = window.open('', '_blank', 'width=800,height=1000');
    if (!printWindow) {
      toast.error('Please allow popups to print report');
      return;
    }

    const hospitalInfo = storage.get<{ name: string; address: string; phone: string }>(STORAGE_KEYS.HOSPITAL_INFO, {
      name: 'NEW GASTRO PLUS HOSPITAL',
      address: '123 Healthcare Way, Medical City',
      phone: '+91 98765 43210'
    });

    const html = getRadiologyReportHtml(
      {
        name: selectedPatient.name,
        age: selectedPatient.age,
        gender: selectedPatient.gender,
        mrn: selectedPatient.mrn,
        phone: selectedPatient.phone
      },
      record,
      undefined,
      hospitalInfo
    );

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handlePrintMaternityReport = (delivery: any) => {
    if (!selectedPatient) return;

    const printWindow = window.open('', '_blank', 'width=800,height=1000');
    if (!printWindow) {
      toast.error('Please allow popups to print report');
      return;
    }

    const hospitalInfo = storage.get<{ name: string; address: string; phone: string }>(STORAGE_KEYS.HOSPITAL_INFO, {
      name: 'NEW GASTRO PLUS HOSPITAL',
      address: '123 Healthcare Way, Medical City',
      phone: '+91 98765 43210'
    });

    const motherNewborns = maternityNewborns.filter(b => isPatientIdMatch(b.mother_id, selectedPatient.id));

    const html = getMaternityReportHtml(
      {
        name: selectedPatient.name,
        age: selectedPatient.age,
        gender: selectedPatient.gender,
        mrn: selectedPatient.mrn,
        phone: selectedPatient.phone
      },
      delivery,
      motherNewborns,
      undefined,
      hospitalInfo
    );

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handlePrintPatient360Report = () => {
    if (!selectedPatient) return;

    const printWindow = window.open('', '_blank', 'width=800,height=1000');
    if (!printWindow) {
      toast.error('Please allow popups to print report');
      return;
    }

    const hospitalInfo = storage.get<{ name: string; address: string; phone: string }>(STORAGE_KEYS.HOSPITAL_INFO, {
      name: 'NEW GASTRO PLUS HOSPITAL',
      address: '123 Healthcare Way, Medical City',
      phone: '+91 98765 43210'
    });

    const html = getPatientReportHtml({
      patient: selectedPatient,
      vitals,
      clinicalNotes,
      prescriptions,
      labOrders,
      radiologyRecords,
      billing,
      staff,
      currentBed,
      hospitalInfo,
      dues
    });

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const filteredPatients = useMemo(() => {
    let result = [...patients];
    
    if (isDoctor && assignedPatientIds && assignedPatientIds.size > 0) {
      result = result.filter(p => assignedPatientIds.has(p.id));
    }

    if (activeCategory !== 'All') {
      result = result.filter(p => {
        const type = (p.registration_type || p.registrationType || '').trim().toLowerCase();
        
        if (activeCategory === 'OPD/IPD') {
          // OPD/IPD matches 'opd', 'ipd', 'opd/ipd', 'emergency', 'maternity', or empty, or anything NOT starting with 'quick'
          return type === 'opd' || type === 'ipd' || type === 'opd/ipd' || type === 'emergency' || type === 'maternity' || type === '' || !type.startsWith('quick');
        }
        
        if (activeCategory === 'Quick') {
          // General quick category matches anything starting with 'quick'
          return type.startsWith('quick');
        }
        
        if (activeCategory === 'Quick-Lab') {
          // Matches 'quick-lab', 'quick lab', or contains 'lab'
          return type === 'quick-lab' || type === 'quick lab' || type.includes('lab');
        }
        
        if (activeCategory === 'Quick-Pharmacy') {
          // Matches 'quick-pharmacy', 'quick pharmacy', 'quick-pharma', 'quick pharma', or contains 'pharma'
          return type === 'quick-pharmacy' || type === 'quick pharmacy' || type.includes('pharmacy') || type.includes('pharma');
        }
        
        return type === activeCategory.toLowerCase();
      });
    }

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) || 
        (p.mrn && p.mrn.toLowerCase().includes(query)) ||
        (p.phone && p.phone.includes(query))
      );
    }
    
    return result;
  }, [searchQuery, patients, activeCategory, isDoctor, assignedPatientIds]);

  const handleShareWhatsApp = () => {
    if (!selectedPatient) return;
    
    const shareUrl = `${window.location.origin}/patient-overview?id=${selectedPatient.id}`;
    const doctor = staff.find(u => isPatientIdMatch(u.id, selectedPatient.attending_doctor_id) || isPatientIdMatch(u.name, selectedPatient.attending_doctor_id)) || resolvedAttendingDoctor;
    const claim = insuranceClaims.find(c => isPatientIdMatch(c.patient_id, selectedPatient.id));
    
    const patientData = `
*Patient Overview: ${selectedPatient.name}*
*MRN:* ${selectedPatient.mrn || 'N/A'}
*Age/Gender:* ${selectedPatient.age}Y / ${selectedPatient.gender}
*Attending Doctor:* ${doctor?.name || 'Duty Doctor'}
*Status:* ${selectedPatient.status}
*Current Dues:* ${formatCurrency(calculateDues(selectedPatient.id))}
*Insurance Status:* ${claim?.status || 'N/A'}

View full details at: ${shareUrl}
    `.trim();

    const encodedText = encodeURIComponent(patientData);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
    toast.success('Sharing to WhatsApp...');
  };

  const handlePrintPrescription = (prescriptionData?: any) => {
    if (!selectedPatient) return;

    let doctor = staff.find(u => u.id === (prescriptionData?.doctorId || prescriptionData?.doctor_id || selectedPatient.attending_doctor_id)) ||
                 staff.find(u => u.name === (prescriptionData?.doctor || prescriptionData?.doctor_name));

    if (!doctor && (prescriptionData?.doctor || prescriptionData?.doctor_name)) {
      doctor = {
        name: prescriptionData.doctor || prescriptionData.doctor_name,
        degree: prescriptionData.doctorDegree || prescriptionData.doctor_degree || '',
        specialization: prescriptionData.doctorSpecialization || prescriptionData.doctor_specialization || prescriptionData.department || '',
        department: prescriptionData.department || prescriptionData.doctorDepartment || prescriptionData.doctor_department || '',
        id: prescriptionData.doctorId || prescriptionData.doctor_id || ''
      };
    }

    if (!doctor && selectedPatient.attending_doctor_id) {
      doctor = staff.find(u => u.id === selectedPatient.attending_doctor_id);
    }

    if (!doctor) {
      doctor = resolvedAttendingDoctor;
    }
    
    const hospitalInfo = storage.get<{ name: string; address: string; phone: string }>(STORAGE_KEYS.HOSPITAL_INFO, {
      name: 'NEW GASTRO PLUS HOSPITAL',
      address: '123 Healthcare Way, Medical City',
      phone: '+91 98765 43210'
    });

    const latestVitals = vitals && vitals.length > 0 ? vitals[0] : undefined;

    // Use vitals stored on the prescription first, otherwise fall back to latestVitals
    const prescriptionVitals = {
      ...(latestVitals || {}),
      ...(prescriptionData?.vitals || {})
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
        pastHistory: selectedPatient.pastHistory || (selectedPatient as any).medical_history || (selectedPatient as any).past_history || (selectedPatient as any).history,
        medicalHistory: selectedPatient.medicalHistory,
        complaints: (selectedPatient as any).complaints || (selectedPatient as any).presentingComplaints
      },
      prescriptionData ? {
        ...prescriptionData,
        vitals: prescriptionVitals
      } : { 
        medicines: [],
        vitals: prescriptionVitals
      },
      doctor,
      hospitalInfo
    );

    triggerRxPrintPreview(html);
  };

  const openPrescriptionModal = () => {
    if (!selectedPatient) return;

    const existingRx = prescriptions
      .filter(rx => isPatientIdMatch(rx.patientId, selectedPatient.id) || isPatientIdMatch(rx.patient_id, selectedPatient.id))
      .sort((a, b) => new Date(b.date || b.prescription_date || 0).getTime() - new Date(a.date || a.prescription_date || 0).getTime())[0];

    const latestVitals = vitals && vitals.length > 0 ? vitals[0] : undefined;

    if (existingRx) {
      setNewPrescription({
        diagnosis: existingRx.diagnosis || '',
        advice: existingRx.advice || existingRx.notes || '',
        medicines: existingRx.medicines && existingRx.medicines.length > 0 ? existingRx.medicines : [{ name: '', dosage: '', frequency: '' }],
        vitals: existingRx.vitals || {
          bp: latestVitals?.bp || '',
          pulse: latestVitals?.pulse || '',
          temp: latestVitals?.temp || '',
          spo2: latestVitals?.spo2 || '',
          weight: latestVitals?.weight || '',
          rr: latestVitals?.rr || latestVitals?.respiration || ''
        }
      });
    } else {
      setNewPrescription({
        medicines: [{ name: '', dosage: '', frequency: '' }],
        diagnosis: '',
        advice: '',
        vitals: {
          bp: latestVitals?.bp || '',
          pulse: latestVitals?.pulse || '',
          temp: latestVitals?.temp || '',
          spo2: latestVitals?.spo2 || '',
          weight: latestVitals?.weight || '',
          rr: latestVitals?.rr || latestVitals?.respiration || ''
        }
      });
    }

    setIsPrescriptionOpen(true);
  };

  const handlePrintBlankPrescription = () => {
    handlePrintPrescription();
  };

  const handleSavePrescription = async () => {
    if (!selectedPatient) return;
    
    setLoading(true);

    if (isReceptionist) {
      if (newPrescription.vitals && (
        newPrescription.vitals.bp ||
        newPrescription.vitals.pulse ||
        newPrescription.vitals.temp ||
        newPrescription.vitals.spo2 ||
        newPrescription.vitals.weight ||
        newPrescription.vitals.rr
      )) {
        try {
          const vData = {
            patient_id: selectedPatient.id,
            bp: newPrescription.vitals.bp || null,
            pulse: newPrescription.vitals.pulse ? Number(newPrescription.vitals.pulse) : null,
            temp: newPrescription.vitals.temp ? String(newPrescription.vitals.temp) : null,
            spo2: newPrescription.vitals.spo2 ? Number(newPrescription.vitals.spo2) : null,
            weight: newPrescription.vitals.weight ? Number(newPrescription.vitals.weight) : null,
            rr: newPrescription.vitals.rr ? Number(newPrescription.vitals.rr) : null,
            recorded_by: currentUser?.id || null,
            recorded_at: new Date().toISOString()
          };
          const savedV = await supabaseService.updateVitals(vData);
          if (savedV) {
            setVitals(prev => [savedV, ...prev]);
            window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table: 'patient_vitals', action: 'insert' } }));
            toast.success(`Patient vitals updated successfully for ${selectedPatient.name}`);
            setIsPrescriptionOpen(false);
            setNewPrescription({
              medicines: [{ name: '', dosage: '', frequency: '' }],
              diagnosis: '',
              advice: '',
              vitals: { bp: '', pulse: '', temp: '', spo2: '', weight: '', rr: '' }
            });
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
      setLoading(false);
      return;
    }

    const newRx = {
      patient_id: selectedPatient.id,
      patientId: selectedPatient.id,
      doctor_id: selectedPatient.attending_doctor_id,
      doctorId: selectedPatient.attending_doctor_id,
      prescription_date: new Date().toISOString(),
      date: new Date().toISOString(),
      diagnosis: newPrescription.diagnosis,
      advice: newPrescription.advice,
      medicines: newPrescription.medicines.filter(m => m.name.trim() !== '')
    };

    const result = await supabaseService.createPrescription(newRx);
    if (result) {
      const normalizedResult = {
        ...result,
        patientId: result.patient_id || result.patientId || newRx.patient_id,
        doctorId: result.doctor_id || result.doctorId || newRx.doctor_id,
        date: result.prescription_date || result.date || result.created_at || newRx.prescription_date
      };

      if (newPrescription.vitals && (
        newPrescription.vitals.bp ||
        newPrescription.vitals.pulse ||
        newPrescription.vitals.temp ||
        newPrescription.vitals.spo2 ||
        newPrescription.vitals.weight ||
        newPrescription.vitals.rr
      )) {
        try {
          const vData = {
            patient_id: selectedPatient.id,
            bp: newPrescription.vitals.bp || null,
            pulse: newPrescription.vitals.pulse ? Number(newPrescription.vitals.pulse) : null,
            temp: newPrescription.vitals.temp ? String(newPrescription.vitals.temp) : null,
            spo2: newPrescription.vitals.spo2 ? Number(newPrescription.vitals.spo2) : null,
            weight: newPrescription.vitals.weight ? Number(newPrescription.vitals.weight) : null,
            rr: newPrescription.vitals.rr ? Number(newPrescription.vitals.rr) : null,
            recorded_by: currentUser?.id || null,
            recorded_at: new Date().toISOString()
          };
          const savedV = await supabaseService.updateVitals(vData);
          if (savedV) {
            setVitals(prev => [savedV, ...prev]);
            window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table: 'patient_vitals', action: 'insert' } }));
          }
        } catch (err) {
          console.error('Failed to auto-save vitals:', err);
        }
      }

      setPrescriptions([normalizedResult, ...prescriptions]);
      setIsPrescriptionOpen(false);
      setNewPrescription({
        medicines: [{ name: '', dosage: '', frequency: '' }],
        diagnosis: '',
        advice: '',
        vitals: {
          bp: '',
          pulse: '',
          temp: '',
          spo2: '',
          weight: '',
          rr: ''
        }
      });
      toast.success('Prescription saved successfully');
    } else {
      toast.error('Failed to save prescription');
    }
    setLoading(false);
  };

  const handleSaveClinicalNote = async () => {
    if (!selectedPatient) return;
    if (!newNote.content.trim()) {
      toast.error('Note content cannot be empty');
      return;
    }

    setLoading(true);
    const noteData = {
      patient_id: selectedPatient.id,
      patientId: selectedPatient.id,
      author_id: selectedPatient.attending_doctor_id,
      note_type: newNote.note_type,
      content: newNote.content.trim()
    };

    const savedNote = await supabaseService.createClinicalNote(noteData);
    if (savedNote) {
      setClinicalNotes([savedNote, ...clinicalNotes]);
      setIsAddNoteOpen(false);
      setNewNote({ content: '', note_type: 'DOCTOR' });
      toast.success('Medical history note saved successfully');
    } else {
      toast.error('Failed to save medical history note');
    }
    setLoading(false);
  };

  const medicalHistoryEvents = useMemo(() => {
    if (!selectedPatient) return [];

    const list: any[] = [];

    // Add default history for mock patients to look perfect out of the box
    if (selectedPatient.id === 'p1' || selectedPatient.mrn === 'MRN-001') {
      list.push({
        id: 'default-1',
        date: '2024-04-12T00:00:00.000Z',
        title: 'Acute Bronchitis',
        content: 'Patient admitted with difficulty breathing. Started on nebulization.',
        type: 'default',
        badge: 'Past Diagnosis',
        color: 'bg-medical-blue'
      });
      list.push({
        id: 'default-2',
        date: '2024-03-20T00:00:00.000Z',
        title: 'Routine Checkup',
        content: 'General consultation. BP stable. Advised lifestyle changes.',
        type: 'default',
        badge: 'Consultation',
        color: 'bg-slate-300'
      });
    } else if (selectedPatient.id === 'p2' || selectedPatient.mrn === 'MRN-002') {
      list.push({
        id: 'default-1',
        date: '2024-03-25T00:00:00.000Z',
        title: 'Post-Delivery Checkup',
        content: 'Post-pregnancy recovery monitoring. Normal vitals, minor soreness.',
        type: 'default',
        badge: 'Maternity Note',
        color: 'bg-pink-500'
      });
    }

    // Add clinical notes
    clinicalNotes.forEach(note => {
      const authorName = staff.find(u => u.id === note.author_id || u.id === note.authorId)?.name || (note.profiles?.name) || 'Staff';
      list.push({
        id: note.id,
        date: note.created_at || note.date || new Date().toISOString(),
        title: note.note_type === 'NURSE' ? `Nurse Note - ${authorName}` : `Clinical Note - ${authorName}`,
        content: note.content,
        type: 'note',
        badge: note.note_type === 'NURSE' ? 'Nurse Note' : 'Doctor Note',
        color: note.note_type === 'NURSE' ? 'bg-amber-500' : 'bg-teal-500',
        raw: note
      });
    });

    // Add prescriptions
    prescriptions
      .filter(rx => isPatientIdMatch(rx.patientId, selectedPatient.id) || isPatientIdMatch(rx.patient_id, selectedPatient.id))
      .forEach(rx => {
        const docName = staff.find(u => u.id === rx.doctor_id || u.id === rx.doctorId)?.name || 'Doctor';
        if (rx.diagnosis || rx.advice || (rx.medicines && rx.medicines.length > 0)) {
          const medicinesStr = rx.medicines ? rx.medicines.map((m: any) => `${m.name} (${m.dosage || ''})`).join(', ') : '';
          const contentStr = [
            rx.diagnosis ? `Diagnosis: ${rx.diagnosis}` : '',
            rx.advice ? `Advice: ${rx.advice}` : '',
            medicinesStr ? `Prescribed: ${medicinesStr}` : ''
          ].filter(Boolean).join('\n');

          list.push({
            id: rx.id,
            date: rx.prescription_date || rx.date || rx.created_at,
            title: `Prescription Written - By ${docName}`,
            content: contentStr,
            type: 'prescription',
            badge: 'Prescription',
            color: 'bg-purple-500',
            raw: rx
          });
        }
      });

    // Filter based on selected historyFilter tab
    const filteredList = list.filter(item => {
      if (historyFilter === 'all') return true;
      if (historyFilter === 'doctor') {
        return item.badge === 'Doctor Note' || item.badge === 'Prescription' || item.badge === 'Past Diagnosis' || item.badge === 'Consultation';
      }
      if (historyFilter === 'nurse') {
        return item.badge === 'Nurse Note' || item.badge === 'Maternity Note';
      }
      return true;
    });

    // Sort chronological descending
    return filteredList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedPatient, clinicalNotes, prescriptions, staff, historyFilter]);

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('File size exceeds the 2MB limit. Please compress your file before uploading.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedFile({
          name: file.name,
          url: event.target?.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveUpload = async () => {
    if (!selectedPatient || !uploadedFile) return;

    setLoading(true);
    const newRx = {
      patient_id: selectedPatient.id,
      patientId: selectedPatient.id,
      doctor_id: selectedPatient.attending_doctor_id || 'd1',
      doctorId: selectedPatient.attending_doctor_id || 'd1',
      prescription_date: new Date().toISOString(),
      date: new Date().toISOString(),
      diagnosis: 'Uploaded Document / Record',
      advice: '',
      medicines: [],
      attachment_url: uploadedFile.url,
      attachmentUrl: uploadedFile.url,
      attachment_name: uploadedFile.name,
      attachmentName: uploadedFile.name,
    };

    const result = await supabaseService.createPrescription(newRx);
    if (result) {
      const normalizedResult = {
        ...result,
        patientId: result.patient_id || result.patientId || newRx.patient_id,
        doctorId: result.doctor_id || result.doctorId || newRx.doctor_id,
        date: result.prescription_date || result.date || result.created_at || newRx.prescription_date,
        medicines: result.medicines || newRx.medicines,
        attachmentUrl: result.attachment_url || result.attachmentUrl || newRx.attachmentUrl,
        attachmentName: result.attachment_name || result.attachmentName || newRx.attachmentName
      };
      setPrescriptions([normalizedResult, ...prescriptions]);
      setIsUploadOpen(false);
      setUploadedFile(null);
      toast.success('Prescription record uploaded and saved successfully');
    } else {
      toast.error('Failed to save uploaded record');
    }
    setLoading(false);
  };

  const handleDeletePatient = async () => {
    if (!selectedPatient) return;
    
    const roleUpper = (userRole || '').toUpperCase();
    if (roleUpper === 'RECEPTIONIST' || roleUpper === 'RECEPTION' || roleUpper === 'FRONT_DESK' || roleUpper === 'DOCTOR' || roleUpper === 'SURGEON' || roleUpper === 'ACCOUNTANT' || roleUpper === 'ACCOUNTS') {
      toast.error('Deletion of patient profiles is restricted for Front Office, Doctor, and Accountant roles.');
      return;
    }
    
    if (!window.confirm(`Are you sure you want to PERMANENTLY delete ${selectedPatient.name} and all associated records? This action cannot be undone.`)) {
      return;
    }

    try {
      // Sync with Supabase if connected
      if (selectedPatient.supabase_id && import.meta.env.VITE_SUPABASE_URL) {
        const { supabaseService } = await import('../services/supabaseService');
        await supabaseService.deletePatient(selectedPatient.supabase_id);
      }

      const updatedPatients = patients.filter((p: any) => p.id !== selectedPatient.id);
      setPatients(updatedPatients);
      storage.set(STORAGE_KEYS.PATIENTS, updatedPatients);
      
      // Clear URL params and selection
      setSearchParams({});
      setSelectedPatient(null);
      
      toast.success('Patient record deleted successfully');
      
      window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table: 'patients', action: 'delete' } }));
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete patient record');
    }
  };

  const calculateDues = (patientId: string) => {
    const patientBills = billing.filter(b => isPatientIdMatch(b.patient_id, patientId) || isPatientIdMatch(b.patientId, patientId));
    const total = patientBills.reduce((acc, b) => acc + (Number(b.payable_amount ?? b.payableAmount ?? b.total_amount ?? b.totalAmount) || 0), 0);
    const paid = patientBills.reduce((acc, b) => acc + (Number(b.paid_amount ?? b.paidAmount) || 0), 0);
    
    // Add estimated active IPD bed charges
    let activeBedChargeTotal = 0;
    const bed = beds.find(b => isPatientIdMatch(b.patient_id, patientId) || isPatientIdMatch(b.patientId, patientId));
    if (bed) {
      const activeAdm = admissions.find(a => (isPatientIdMatch(a.patient_id, patientId) || isPatientIdMatch(a.patientId, patientId)) && a.status !== 'Discharged');
      if (activeAdm) {
        const rate = MOCK_BED_RATES.find(r => r.type === bed.bed_type || r.type === bed.type)?.rate || 1500;
        const admDateStr = activeAdm.admission_date || activeAdm.admissionDate || activeAdm.created_at;
        let days = 3;
        if (admDateStr) {
          const diffTime = Math.abs(new Date().getTime() - new Date(admDateStr).getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          days = isNaN(diffDays) ? 3 : Math.max(1, diffDays);
        }
        activeBedChargeTotal = rate * days;
      }
    }
    return (total + activeBedChargeTotal) - paid;
  };

  // Helper to dynamically resolve payment status of pathology & radiology services
  const getTestPaymentDetails = (testName: string) => {
    if (!testName) {
      return {
        status: 'Due',
        label: 'Payment Due',
        color: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
        amount: null,
        invoiceNumber: null
      };
    }

    const patientId = selectedPatient?.id;
    if (!patientId) {
      return {
        status: 'Due',
        label: 'Payment Due',
        color: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
        amount: null,
        invoiceNumber: null
      };
    }

    const billsForPatient = billing.filter(b => isPatientIdMatch(b.patient_id, patientId) || isPatientIdMatch(b.patientId, patientId));
    const query = testName.toLowerCase().trim();

    for (const bill of billsForPatient) {
      const items = bill.invoice_items || bill.items || [];
      const matchingItem = items.find((item: any) => {
        const name = (item.name || item.item_name || item.description || '').toLowerCase().trim();
        return name.includes(query) || query.includes(name) || (query.includes('lft') && name.includes('liver')) || (query.includes('cbc') && name.includes('blood'));
      });

      if (matchingItem) {
        const pStatus = (bill.payment_status || bill.status || '').toLowerCase().trim();
        let status = 'Due';
        let label = 'Payment Due';
        let color = 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100';

        if (pStatus === 'paid' || pStatus === 'settled' || pStatus === 'fully paid') {
          status = 'Paid';
          label = 'Payment Collected';
          color = 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100';
        } else if (pStatus === 'partial' || pStatus === 'partially paid' || pStatus === 'partial paid') {
          status = 'Partial';
          label = 'Partially Paid';
          color = 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100';
        }

        return {
          status,
          label,
          color,
          amount: matchingItem.price || matchingItem.amount || null,
          invoiceNumber: bill.invoice_number || bill.id
        };
      }
    }

    return {
      status: 'Due',
      label: 'Payment Due',
      color: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
      amount: null,
      invoiceNumber: null
    };
  };

  // Helper to parse pathology report parameters
  const getPathologyReportParameters = (testName: string, orderResultValue: string) => {
    const name = testName.toLowerCase();
    if (name.includes('cbc') || name.includes('blood count')) {
      return [
        { name: 'Hemoglobin', value: orderResultValue || '13.8', unit: 'g/dL', range: '12.0 - 17.0', status: 'Normal' },
        { name: 'Total Leucocyte Count (TLC)', value: '6,800', unit: '/cumm', range: '4000 - 11000', status: 'Normal' },
        { name: 'Platelet Count', value: '2.15', unit: 'lakhs/cumm', range: '1.50 - 4.50', status: 'Normal' },
        { name: 'Total RBC Count', value: '4.62', unit: 'million/cumm', range: '4.00 - 5.90', status: 'Normal' }
      ];
    }
    if (name.includes('lft') || name.includes('liver function') || name.includes('liver')) {
      return [
        { name: 'Total Bilirubin', value: orderResultValue || '0.8', unit: 'mg/dL', range: '0.2 - 1.2', status: 'Normal' },
        { name: 'Direct Bilirubin', value: '0.2', unit: 'mg/dL', range: '0.0 - 0.3', status: 'Normal' },
        { name: 'SGOT (AST)', value: '32', unit: 'U/L', range: '5 - 40', status: 'Normal' },
        { name: 'SGPT (ALT)', value: '38', unit: 'U/L', range: '5 - 45', status: 'Normal' },
        { name: 'Alkaline Phosphatase (ALP)', value: '85', unit: 'U/L', range: '30 - 120', status: 'Normal' }
      ];
    }
    return null;
  };

  const patientAppointments = useMemo(() => {
    const list = appointments.filter(a => isPatientIdMatch(a.patient_id, selectedPatient?.id) || isPatientIdMatch(a.patientId, selectedPatient?.id));
    return [...list].sort((a, b) => {
      const dateA = a.date || a.appointment_date || a.appointmentDate || '';
      const dateB = b.date || b.appointment_date || b.appointmentDate || '';
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      const timeA = a.time || a.appointment_time || a.appointmentTime || '';
      const timeB = b.time || b.appointment_time || b.appointmentTime || '';
      return timeB.localeCompare(timeA);
    });
  }, [appointments, selectedPatient]);
  const patientBills = useMemo(() => billing.filter(b => isPatientIdMatch(b.patient_id, selectedPatient?.id) || isPatientIdMatch(b.patientId, selectedPatient?.id)), [billing, selectedPatient]);
  const patientClaims = useMemo(() => {
    const filtered = insuranceClaims.filter(c => isPatientIdMatch(c.patient_id, selectedPatient?.id) || isPatientIdMatch(c.patientId, selectedPatient?.id));
    const unique: any[] = [];
    const seen = new Set();
    for (const c of filtered) {
      if (c && c.id && !seen.has(c.id)) {
        seen.add(c.id);
        unique.push(c);
      }
    }
    return unique;
  }, [insuranceClaims, selectedPatient]);
  const currentBed = useMemo(() => beds.find(b => isPatientIdMatch(b.patient_id, selectedPatient?.id) || isPatientIdMatch(b.patientId, selectedPatient?.id)), [beds, selectedPatient]);
  
  const activeBedCharge = useMemo(() => {
    if (!selectedPatient) return null;
    const bed = beds.find(b => isPatientIdMatch(b.patient_id, selectedPatient.id) || isPatientIdMatch(b.patientId, selectedPatient.id));
    if (!bed) return null;
    
    const activeAdm = admissions.find(a => (isPatientIdMatch(a.patient_id, selectedPatient.id) || isPatientIdMatch(a.patientId, selectedPatient.id)) && a.status !== 'Discharged');
    if (!activeAdm) return null;

    const rate = MOCK_BED_RATES.find(r => r.type === bed.bed_type || r.type === bed.type)?.rate || 1500;
    const admDateStr = activeAdm?.admission_date || activeAdm?.admissionDate || activeAdm?.created_at;
    let days = 3;
    if (admDateStr) {
      const diffTime = Math.abs(new Date().getTime() - new Date(admDateStr).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      days = isNaN(diffDays) ? 3 : Math.max(1, diffDays);
    }
    return {
      bed,
      rate,
      days,
      total: rate * days,
      status: 'Due'
    };
  }, [beds, admissions, selectedPatient]);

  const dues = useMemo(() => selectedPatient ? calculateDues(selectedPatient.id) : 0, [selectedPatient, billing, beds, admissions]);

  const resolvedAttendingDoctor = useMemo(() => {
    if (!selectedPatient) return null;
    const directDocId = selectedPatient.attending_doctor_id || selectedPatient.attendingDoctorId;
    let found = directDocId ? (
      staff.find((u: any) => String(u.id).toLowerCase() === String(directDocId).toLowerCase()) ||
      staff.find((u: any) => String(u.name).toLowerCase() === String(directDocId).toLowerCase())
    ) : null;
    
    if (!found && patientAppointments && patientAppointments.length > 0) {
      const sortedApts = [...patientAppointments].sort((a, b) => {
        const dateA = new Date(a.appointment_date || a.date || 0).getTime();
        const dateB = new Date(b.appointment_date || b.date || 0).getTime();
        return dateB - dateA;
      });
      const latestApt = sortedApts[0];
      if (latestApt) {
        const aptDocId = latestApt.doctor_id || latestApt.doctorId;
        const aptDocName = latestApt.doctor || latestApt.doctorName;
        
        if (aptDocId) {
          found = staff.find((u: any) => String(u.id).toLowerCase() === String(aptDocId).toLowerCase());
        }
        if (!found && aptDocName) {
          found = staff.find((u: any) => String(u.name).toLowerCase() === String(aptDocName).toLowerCase());
        }
      }
    }
    return found;
  }, [selectedPatient, staff, patientAppointments]);

  if (isLoading && patients.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-medical-blue" />
          <p className="text-muted-foreground font-medium animate-pulse">Loading Patient 360 Ecosystem...</p>
        </div>
      </div>
    );
  }

  if (!selectedPatient) {
    return (
      <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2 p-6 rounded-2xl border shadow-sm" style={{ background: 'linear-gradient(135deg, #FFD1A9, #FFE5C9, #FFF3E5)', borderColor: '#F5CBB0' }}>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#5A2D1B]">Patient 360 Overview</h1>
        <p className="text-[#8A563F] text-sm font-semibold">Search and select a patient to view their complete medical and financial history.</p>
      </div>

        <div className="flex flex-col gap-4">
          <div className="relative max-w-2xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input 
              placeholder="Search by Patient Name, MRN, or Phone Number..." 
              className="pl-10 h-12 text-lg shadow-sm border-slate-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {(['All', 'OPD/IPD', 'Quick', 'Quick-Lab', 'Quick-Pharmacy'] as const).map((cat) => (
              <Button
                key={cat}
                variant={activeCategory === cat ? 'default' : 'outline'}
                size="sm"
                className={`rounded-full px-4 h-8 ${activeCategory === cat ? 'bg-medical-blue' : 'text-slate-500'}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPatients.map((patient) => (
            <Card 
              key={patient.id} 
              className="hover:ring-2 hover:ring-medical-blue/20 transition-all cursor-pointer border-none shadow-sm"
              onClick={() => setSearchParams({ id: patient.id })}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-medical-blue font-bold text-lg">
                  {patient.name.charAt(0)}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-bold text-slate-800 truncate">{patient.name}</p>
                    {patient.status === 'Discharged' || patient.status === 'discharged' ? (
                      <Badge variant="outline" className="text-[8.5px] px-1 py-0 h-3.5 font-bold bg-purple-50 text-purple-700 border-purple-200">
                        IPD (Discharged)
                      </Badge>
                    ) : patient.status === 'Admitted' || patient.status === 'Admitting' ? (
                      <Badge variant="outline" className="text-[8.5px] px-1 py-0 h-3.5 font-bold bg-amber-50 text-amber-700 border-amber-200">
                        IPD (Inpatient)
                      </Badge>
                    ) : (patient.department?.includes('Endoscopy') || patient.isDirectEndo) ? (
                      <Badge variant="outline" className="text-[8.5px] px-1 py-0 h-3.5 font-bold bg-purple-50 text-purple-700 border-purple-200">
                        Endoscopy
                      </Badge>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-bold bg-slate-100 text-slate-500 border-none">
                      {patient.mrn || 'N/A'}
                    </Badge>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {patient.phone || 'No phone'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setSearchParams({})}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">{selectedPatient.name}</h1>
            <p className="text-muted-foreground text-sm font-medium uppercase tracking-wider">{selectedPatient.mrn || 'N/A'} • {selectedPatient.age}Y / {selectedPatient.gender}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(isClinicalRole || isReceptionist) && (
            <Button variant="outline" className="gap-2 border-medical-blue text-medical-blue hover:bg-blue-50" onClick={openPrescriptionModal}>
              {isReceptionist ? (
                <>
                  <FileText className="w-4 h-4" />
                  Record Vitals
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Write Prescription
                </>
              )}
            </Button>
          )}
          <Button variant="outline" className="gap-2 border-slate-300" onClick={() => setIsUploadOpen(true)}>
            <Upload className="w-4 h-4" />
            Upload Old Record
          </Button>
          {(isClinicalRole || normalizeRole(currentUser?.role || userRole) === 'RECEPTIONIST') && (
            <Button variant="outline" className="gap-2" onClick={handlePrintBlankPrescription}>
              <FileText className="w-4 h-4" />
              Blank Prescription
            </Button>
          )}
          <Button variant="outline" className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-semibold text-xs h-9" onClick={() => setIsConsentOpen(true)}>
            <FileText className="w-4 h-4" />
            Clinical Consents
          </Button>
          <Button variant="outline" className="gap-2 border-teal-300 text-teal-700 hover:bg-teal-50 font-semibold text-xs h-9" onClick={() => setIsGeneralConsentOpen(true)}>
            <FileText className="w-4 h-4 text-teal-600" />
            General Consent Form
          </Button>
          <Button variant="outline" className="gap-2 border-rose-300 text-rose-700 hover:bg-rose-50 font-semibold text-xs h-9" onClick={() => setIsPoorPrognosisOpen(true)}>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            Poor Prognosis Consent
          </Button>
          <Button variant="outline" className="gap-2 border-indigo-300 text-indigo-700 hover:bg-indigo-50 font-semibold text-xs h-9" onClick={() => setIsSurgicalChecklistOpen(true)}>
            <ClipboardCheck className="w-4 h-4" />
            Surgical Checklist
          </Button>
          <Button variant="outline" className="gap-2 border-teal-300 text-teal-700 hover:bg-teal-50 font-semibold text-xs h-9" onClick={() => { setPostOpDefaultTab('checklist'); setIsPostOpOpen(true); }}>
            <ClipboardCheck className="w-4 h-4" />
            Post-Op Check List
          </Button>
          <Button variant="outline" className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50 font-semibold text-xs h-9" onClick={() => { setPostOpDefaultTab('instructions'); setIsPostOpOpen(true); }}>
            <FileText className="w-4 h-4" />
            Post-Op Instructions
          </Button>
          <Button variant="outline" className="gap-2" onClick={handlePrintPatient360Report}>
            <Printer className="w-4 h-4" />
            Print Report
          </Button>
          <Button className="bg-[#25D366] hover:bg-[#128C7E] text-white gap-2" onClick={handleShareWhatsApp}>
            <Share2 className="w-4 h-4" />
            Share on WhatsApp
          </Button>
          {(userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' || userRole === 'HOSPITAL_ADMIN' || userRole?.toUpperCase().includes('ADMIN')) && (
            <Button variant="destructive" className="gap-2" onClick={handleDeletePatient}>
              <Trash2 className="w-4 h-4" />
              Delete Patient
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile & Quick Stats */}
        <div className="space-y-6">
          {/* Quick Vitals Display */}
          <Card className="border-none shadow-sm bg-medical-blue/5 border-l-4 border-medical-blue">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-medical-blue" />
                  <p className="text-sm font-black text-medical-blue uppercase tracking-wider">Live Vitals</p>
                </div>
                <Badge variant="outline" className="text-[10px] bg-white border-medical-blue/20">
                  {vitals.length > 0 ? 'Updated' : 'Default'}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">BP (mmHg)</p>
                  <p className="text-sm font-black text-slate-800">{vitals[0]?.bp || '120/80'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Pulse (/min)</p>
                  <p className="text-sm font-black text-slate-800">{vitals[0]?.pulse || '78'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Temp (°F)</p>
                  <p className="text-sm font-black text-slate-800">{vitals[0]?.temp || '98.6'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">SpO2 (%)</p>
                  <p className="text-sm font-black text-slate-800">{vitals[0]?.spo2 || '98'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Weight (kg)</p>
                  <p className="text-sm font-black text-slate-800">{vitals[0]?.weight || '65'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Resp Rate (/min)</p>
                  <p className="text-sm font-black text-slate-800">{vitals[0]?.rr || '18'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">CVS</p>
                  <p className="text-xs font-bold text-slate-800 truncate">{vitals[0]?.cvs || vitals[0]?.cbs || 'Normal'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">RS</p>
                  <p className="text-xs font-bold text-slate-800 truncate">{vitals[0]?.rs || 'Bilateral Clear'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">CNS</p>
                  <p className="text-xs font-bold text-slate-800 truncate">{vitals[0]?.cns || 'Conscious'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-medical-blue text-white pb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-2xl border border-white/30">
                    {selectedPatient.name.charAt(0)}
                  </div>
                  <div>
                    <CardTitle className="text-white">Patient Profile</CardTitle>
                    <Badge className="bg-white/20 text-white border-none mt-1">{selectedPatient.status}</Badge>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/30 text-xs font-semibold gap-1.5 h-8"
                  onClick={openEditPatientModal}
                >
                  <Edit className="w-3.5 h-3.5" />
                  Edit Details
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 -mt-4 bg-white rounded-t-3xl space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Phone</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800">{selectedPatient.phone || selectedPatient.mobile || selectedPatient.contact || 'N/A'}</p>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-5 w-5 text-slate-400 hover:text-medical-blue"
                      title="Edit Phone / Details"
                      onClick={openEditPatientModal}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Blood Group</p>
                  <p className="text-sm font-medium">{selectedPatient.bloodGroup || 'N/A'}</p>
                </div>
                <div className="space-y-1 col-span-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Address</p>
                  <p className="text-sm font-medium">{selectedPatient.address}</p>
                </div>
                {(selectedPatient.relative1Name || selectedPatient.relative1_name || selectedPatient.fatherName || selectedPatient.husbandName) && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      Relative 1 ({selectedPatient.relative1Relation || selectedPatient.relative1_relation || (selectedPatient.husbandName ? 'Husband' : 'Father')})
                    </p>
                    <p className="text-sm font-medium">
                      {selectedPatient.relative1Name || selectedPatient.relative1_name || selectedPatient.fatherName || selectedPatient.husbandName}
                    </p>
                    {(selectedPatient.relative1Phone || selectedPatient.relative1_phone || selectedPatient.fatherPhone || selectedPatient.husbandPhone) && (
                      <p className="text-[10px] text-slate-500">
                        {selectedPatient.relative1Phone || selectedPatient.relative1_phone || selectedPatient.fatherPhone || selectedPatient.husbandPhone}
                      </p>
                    )}
                  </div>
                )}
                {(selectedPatient.relative2Name || selectedPatient.relative2_name || selectedPatient.motherName) && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      Relative 2 ({selectedPatient.relative2Relation || selectedPatient.relative2_relation || 'Mother'})
                    </p>
                    <p className="text-sm font-medium">
                      {selectedPatient.relative2Name || selectedPatient.relative2_name || selectedPatient.motherName}
                    </p>
                    {(selectedPatient.relative2Phone || selectedPatient.relative2_phone || selectedPatient.motherPhone) && (
                      <p className="text-[10px] text-slate-500">
                        {selectedPatient.relative2Phone || selectedPatient.relative2_phone || selectedPatient.motherPhone}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <Separator />
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">Attending Doctor</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    {(() => {
                      const selectedDocId = resolvedAttendingDoctor?.id || 'unassigned';
                      const displayDocName = resolvedAttendingDoctor 
                        ? `${resolvedAttendingDoctor.name}${resolvedAttendingDoctor.department ? ` (${resolvedAttendingDoctor.department})` : ''}`
                        : undefined;
                      return (
                        <Select
                          value={selectedDocId}
                          onValueChange={(val) => handleUpdateAttendingDoctor(val === 'unassigned' ? '' : val)}
                        >
                          <SelectTrigger className="h-9 w-full bg-white border-slate-200 text-xs font-bold rounded-xl shadow-none">
                            <SelectValue placeholder="Choose Attending Doctor...">
                              {displayDocName}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="unassigned" className="text-xs font-bold text-slate-400">
                              -- Choose Doctor --
                            </SelectItem>
                            {doctorsList.map((doc) => (
                              <SelectItem key={doc.id} value={doc.id} className="text-xs font-semibold">
                                {doc.name} {doc.department ? `(${doc.department})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {isFinancialVisible && (
            <Card className="border-none shadow-sm bg-rose-50 border-l-4 border-rose-500">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-1">Outstanding Dues</p>
                  <h3 className="text-2xl font-bold text-rose-700">{formatCurrency(dues)}</h3>
                </div>
                <div className="p-3 rounded-xl bg-rose-100 text-rose-600">
                  <CreditCard className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
          )}

          {currentBed && (
            <Card className="border-none shadow-sm bg-blue-50 border-l-4 border-blue-500">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Current Admission</p>
                  <h3 className="text-xl font-bold text-blue-700">Bed {currentBed.number}</h3>
                  <p className="text-[10px] text-blue-500 font-medium">{currentBed.ward}</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-100 text-blue-600">
                  <Bed className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Clinical Actions Sidebar */}
          <Card className="border border-slate-200/80 shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#1A5E63] to-[#0F4C50] text-white p-3.5">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-300" />
                <CardTitle className="text-xs font-black tracking-wide text-white uppercase">Quick Clinical Actions</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              <Button 
                onClick={() => setIsPrescriptionOpen(true)}
                className="w-full justify-start text-xs font-bold h-9 bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200"
              >
                <Plus className="w-3.5 h-3.5 mr-2 text-teal-600" />
                New Prescription & Vitals
              </Button>
              <Button 
                onClick={() => setIsAddNoteOpen(true)}
                className="w-full justify-start text-xs font-bold h-9 bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200"
              >
                <FileText className="w-3.5 h-3.5 mr-2 text-blue-600" />
                Add Clinical Note
              </Button>
              <Button 
                onClick={() => setIsUploadOpen(true)}
                className="w-full justify-start text-xs font-bold h-9 bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200"
              >
                <Upload className="w-3.5 h-3.5 mr-2 text-amber-600" />
                Upload Clinical Attachment
              </Button>
            </CardContent>
          </Card>

          {/* High-Alert Clinical Safeguards Card */}
          <Card className="border border-rose-200 shadow-sm bg-gradient-to-b from-rose-50/50 to-white overflow-hidden">
            <CardHeader className="bg-rose-600 text-white p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-300" />
                  <CardTitle className="text-xs font-black tracking-wide uppercase">High-Alert & Precautions</CardTitle>
                </div>
                <Badge className="bg-white/20 text-white text-[9px] font-extrabold border-none">Safety Flag</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-3.5 space-y-3 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-rose-700">Allergies & Sensitivities</span>
                <p className="font-bold text-slate-800 bg-rose-100/80 p-2 rounded-lg border border-rose-200/60">
                  {selectedPatient.allergies || 'No Known Drug Allergies (NKDA)'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Fall Risk</span>
                  <span className="font-extrabold text-amber-700 text-xs">Moderate - High Bed Rails</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Diet Status</span>
                  <span className="font-extrabold text-teal-700 text-xs">{selectedPatient.diet || 'Soft Diabetic Diet'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Nursing Shift & Care Summary */}
          <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-slate-900 text-white p-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-400" />
                <CardTitle className="text-xs font-black tracking-wide uppercase text-white">Shift Care & Handover</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-3.5 space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Primary Nurse on Duty</span>
                <span className="font-bold text-slate-800">Nurse In-Charge</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Last Vitals Check</span>
                <span className="font-bold text-teal-700">Today, 08:00 AM</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">MAR Administration</span>
                <span className="font-bold text-blue-700">Up-to-date</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Middle & Right Column: Detailed History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Medication Administration Record (MAR Chart) */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-2 sm:p-4 overflow-hidden">
            <MedicationChartMaintenance patientId={selectedPatient.id} patient={selectedPatient} embedded={true} />
          </div>

          {/* Specialist & Visiting Consultant Advices & Visit Details */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-2 sm:p-4 overflow-hidden">
            <VisitingConsultants patientId={selectedPatient.id} embedded={true} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Appointments */}
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-medical-blue" />
                  <CardTitle className="text-lg">Appointments</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[250px] overflow-y-auto custom-scrollbar">
                  <div className="p-4 space-y-3">
                    {patientAppointments.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-8 italic">No appointment history</p>
                    ) : (
                      patientAppointments.map(app => {
                        const appDate = app.date || app.appointment_date || app.appointmentDate;
                        const appTime = app.time || app.appointment_time || app.appointmentTime;
                        const appType = app.type || app.appointment_type || 'OPD';
                        const appDoctor = app.doctor || 'General OPD';
                        return (
                          <div key={app.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <div>
                              <p className="text-sm font-bold">{formatDate(appDate)}</p>
                              <p className="text-[10px] text-slate-500">{appTime} • {appType} ({appDoctor})</p>
                            </div>
                            <Badge variant="outline" className="text-[9px] font-bold uppercase">{app.status}</Badge>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Medical History / Notes */}
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-2 text-slate-800">
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <History className="w-5 h-5 text-medical-blue" />
                      <CardTitle className="text-lg">Medical History</CardTitle>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-xs font-bold text-medical-blue border-medical-blue/20 hover:bg-blue-50"
                      onClick={() => setIsAddNoteOpen(true)}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Add Note
                    </Button>
                  </div>
                  
                  {/* Notes & Prescriptions Selector Tabs */}
                  <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/50 self-start mt-1">
                    <button
                      type="button"
                      onClick={() => setHistoryFilter('all')}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-all ${
                        historyFilter === 'all' 
                          ? 'bg-white text-medical-blue shadow-xs font-black' 
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      All Records
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryFilter('doctor')}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-all ${
                        historyFilter === 'doctor' 
                          ? 'bg-teal-600 text-white shadow-xs font-black' 
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Doctor
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryFilter('nurse')}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-all ${
                        historyFilter === 'nurse' 
                          ? 'bg-amber-600 text-white shadow-xs font-black' 
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Nurse Notes
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[250px] overflow-y-auto custom-scrollbar">
                  <div className="p-4">
                    {medicalHistoryEvents.length === 0 ? (
                      <div className="text-center py-10 opacity-30 flex flex-col items-center">
                        <History className="w-8 h-8 mb-2 text-slate-400" />
                        <p className="text-xs font-bold uppercase">No history available</p>
                      </div>
                    ) : (
                      <div className="relative pl-6 border-l-2 border-slate-100 space-y-6">
                        {medicalHistoryEvents.map(event => (
                          <div key={event.id} className="relative">
                            <div className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full ${event.color} border-4 border-white shadow-xs`}></div>
                            <div className="flex items-center justify-between gap-2 overflow-hidden mb-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase">
                                {formatDate(event.date)}
                              </p>
                              <Badge className="text-[9.5px] tracking-wide scale-90 uppercase border-none bg-slate-100 text-slate-600 font-extrabold px-1.5 py-0 shrink-0">
                                {event.badge}
                              </Badge>
                            </div>
                            <p className="text-xs font-black text-slate-800 leading-tight">{event.title}</p>
                            <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap leading-relaxed">
                              {event.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lab & Radiology Reports */}
            <Card className="border-none shadow-sm h-full flex flex-col">
              <CardHeader className="pb-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-purple-600" />
                    <CardTitle className="text-lg">Diagnostics & Reports</CardTitle>
                  </div>
                  <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setLabSubTab('pathology')}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md h-6 ${labSubTab === 'pathology' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                      Pathology
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setLabSubTab('radiology')}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md h-6 ${labSubTab === 'radiology' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                      Radiology
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
                <div className="h-[250px] overflow-y-auto custom-scrollbar flex-1">
                  <div className="p-4 space-y-3">
                    {labSubTab === 'pathology' ? (
                      labOrders.filter(o => isPatientIdMatch(o.patientId, selectedPatient.id)).length === 0 ? (
                        <div className="text-center py-10 opacity-30 flex flex-col items-center">
                          <Activity className="w-8 h-8 mb-2 text-purple-500" />
                          <p className="text-xs font-bold uppercase">No pathology reports</p>
                        </div>
                      ) : (
                        labOrders.filter(o => isPatientIdMatch(o.patientId, selectedPatient.id)).map(order => {
                          const paymentInfo = getTestPaymentDetails(order.test || '');
                          const reportParams = getPathologyReportParameters(order.test || '', order.result || '');

                          return (
                            <div key={order.id} className={`p-3 rounded-xl border border-slate-100 ${order.status === 'Completed' || order.status === 'Released' ? 'bg-emerald-50/20' : 'bg-slate-50/80'} shadow-xs`}>
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <p className="text-xs font-black text-slate-800 leading-tight">{order.test}</p>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{formatDate(order.date)}</p>
                                  {paymentInfo.invoiceNumber && (
                                    <p className="text-[9px] text-slate-500 font-semibold mt-1">
                                      Bill: <span className="text-indigo-600 font-bold">#{paymentInfo.invoiceNumber.substring(0, 8).toUpperCase()}</span>
                                      {paymentInfo.amount !== null && ` • ${formatCurrency(paymentInfo.amount)}`}
                                    </p>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <Badge className={`text-[9px] border-none uppercase py-0 px-1.5 h-4.5 font-extrabold ${
                                    order.status === 'Completed' || order.status === 'Released' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {order.status}
                                  </Badge>
                                  <Badge variant="outline" className={`text-[8px] font-extrabold uppercase py-0 px-1 border-slate-200/60 ${paymentInfo.color}`}>
                                    {paymentInfo.label}
                                  </Badge>
                                </div>
                              </div>

                              {/* Report Findings Inline Display */}
                              {order.status === 'Completed' || order.status === 'Released' || order.result ? (
                                <div className="mt-2.5 bg-white/70 p-2 rounded-lg border border-slate-100 text-[10px] text-slate-700 space-y-1.5 shadow-2xs">
                                  {reportParams ? (
                                    <div className="space-y-1">
                                      <span className="text-[8px] font-extrabold uppercase tracking-wider text-purple-600 block mb-1">Observation Metrics:</span>
                                      {reportParams.map((p, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-[9.5px]">
                                          <span className="text-slate-500 font-medium">{p.name}</span>
                                          <span className="font-bold text-slate-800">{p.value} <span className="text-slate-400 text-[8px]">{p.unit}</span></span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="flex justify-between items-center">
                                      <span className="font-semibold text-slate-500">Test Result Value:</span>
                                      <span className="font-black text-purple-700 bg-purple-50/50 px-1.5 py-0.5 rounded text-xs">
                                        {order.result} {order.unit || ''}
                                      </span>
                                    </div>
                                  )}
                                  
                                  {order.range && !reportParams && (
                                    <div className="flex justify-between items-center text-[9px] text-slate-400">
                                      <span>Normal Reference Range:</span>
                                      <span className="font-semibold">{order.range} {order.unit || ''}</span>
                                    </div>
                                  )}

                                  {order.findings && (
                                    <div className="pt-1.5 border-t border-slate-100/50 text-[9px] text-slate-600">
                                      <span className="font-bold text-slate-700 block mb-0.5">Pathologist Opinion:</span>
                                      <p className="italic leading-normal whitespace-pre-line bg-slate-50/50 p-1.5 rounded">{order.findings}</p>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <p className="text-[10px] text-slate-400 italic mt-1.5 flex items-center gap-1 bg-slate-50 p-1.5 rounded">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                  Pending laboratory processing & verification
                                </p>
                              )}

                              <div className="flex justify-end gap-1.5 mt-2.5 pt-2 border-t border-slate-100/50">
                                {(order.status === 'Completed' || order.status === 'Released' || order.result) && (
                                  <>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-6 text-indigo-600 hover:bg-indigo-50 px-2 text-[10px] font-bold"
                                      onClick={() => {
                                        setReportType('pathology');
                                        setSelectedReport(order);
                                        setIsReportOpen(true);
                                      }}
                                    >
                                      <Eye className="w-3.5 h-3.5 mr-1" />
                                      View Report
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-6 text-purple-600 hover:bg-purple-50 px-2 text-[10px] font-bold"
                                      onClick={() => handlePrintPathologyReport(order)}
                                    >
                                      <Printer className="w-3.5 h-3.5 mr-1" />
                                      Print
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )
                    ) : (
                      radiologyRecords.length === 0 ? (
                        <div className="text-center py-10 opacity-30 flex flex-col items-center">
                          <Activity className="w-8 h-8 mb-2 text-blue-500" />
                          <p className="text-xs font-bold uppercase">No radiology reports</p>
                        </div>
                      ) : (
                        radiologyRecords.map(record => {
                          const paymentInfo = getTestPaymentDetails(record.test_name || '');

                          return (
                            <div key={record.id} className={`p-3 rounded-xl border border-slate-100 ${record.status === 'Completed' ? 'bg-emerald-50/20' : 'bg-slate-50/80'} shadow-xs`}>
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <p className="text-xs font-black text-slate-800 leading-tight">{record.test_name}</p>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{formatDate(record.requested_at)}</p>
                                  {paymentInfo.invoiceNumber && (
                                    <p className="text-[9px] text-slate-500 font-semibold mt-1">
                                      Bill: <span className="text-indigo-600 font-bold">#{paymentInfo.invoiceNumber.substring(0, 8).toUpperCase()}</span>
                                      {paymentInfo.amount !== null && ` • ${formatCurrency(paymentInfo.amount)}`}
                                    </p>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <Badge className={`text-[9px] border-none uppercase py-0 px-1.5 h-4.5 font-extrabold ${
                                    record.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {record.status}
                                  </Badge>
                                  <Badge variant="outline" className={`text-[8px] font-extrabold uppercase py-0 px-1 border-slate-200/60 ${paymentInfo.color}`}>
                                    {paymentInfo.label}
                                  </Badge>
                                </div>
                              </div>
                              {record.result_notes && (
                                <p className="text-[10px] text-slate-600 line-clamp-2 mt-1 italic bg-slate-50/50 p-1.5 rounded border border-slate-100/30">
                                  {record.result_notes}
                                </p>
                              )}
                              {record.findings && (
                                <div className="mt-1.5 p-2 bg-white rounded border border-slate-100 text-[10px] text-slate-700 shadow-2xs">
                                  <span className="font-bold text-indigo-600 block mb-0.5">Report Findings:</span>
                                  <p className="whitespace-pre-line leading-relaxed italic">{record.findings}</p>
                                </div>
                              )}
                              {record.clinical_notes && (
                                <p className="text-[9px] text-slate-500 mt-1">
                                  <span className="font-semibold text-slate-600">Clinical Notes:</span> {record.clinical_notes}
                                </p>
                              )}
                              {(() => {
                                const linkedScans = storage.get<{id: string, orderId: string, url: string, type: string}[]>(STORAGE_KEYS.RADIOLOGY_FILES, [])
                                  .filter(f => f.orderId === record.id);
                                if (linkedScans.length > 0) {
                                  return (
                                    <div className="mt-2.5 p-2 bg-slate-950 rounded-lg overflow-hidden border border-slate-800 shadow-xs">
                                      <p className="text-[9px] font-black uppercase text-indigo-400 mb-1.5 flex items-center gap-1 font-mono">
                                        <Activity className="w-3 h-3 text-indigo-400 animate-pulse" />
                                        PACS DICOM Scan Imaging
                                      </p>
                                      <div className="flex flex-wrap gap-2">
                                        {linkedScans.map(scan => (
                                          <div key={scan.id} className="relative group/scan rounded overflow-hidden bg-black/50 border border-white/5 flex flex-col items-center shadow-2xs">
                                            <img 
                                              src={scan.url} 
                                              alt={record.test_name || "Diagnostic Scan"} 
                                              className="h-16 w-20 object-cover cursor-pointer hover:scale-110 transition-transform duration-300"
                                              referrerPolicy="no-referrer"
                                              onClick={() => {
                                                setPreviewData({ url: scan.url, name: `${record.test_name || 'Study Scan'} (${scan.type || 'DICOM/X-Ray'})` });
                                                setIsPreviewOpen(true);
                                              }}
                                            />
                                            <div className="p-0.5 text-[8px] font-mono text-slate-400 bg-slate-950 text-center truncate w-20 font-black">
                                              {scan.type?.includes('/') ? scan.type.split('/')[1].toUpperCase() : (scan.type || 'SCAN')}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                              <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-slate-100/50">
                                <span className="text-[9px] uppercase font-bold text-slate-400">
                                  {record.urgency || 'Normal'}
                                </span>
                                <div className="flex gap-1.5">
                                  {record.status === 'Completed' && record.report_url && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-6 text-blue-600 hover:bg-blue-50 px-2 text-[10px] font-bold"
                                      onClick={() => {
                                        setPreviewData({ url: record.report_url, name: record.test_name });
                                        setIsPreviewOpen(true);
                                      }}
                                    >
                                      <Eye className="w-3.5 h-3.5 mr-1" />
                                      View File
                                    </Button>
                                  )}
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 text-indigo-600 hover:bg-indigo-50 px-2 text-[10px] font-bold"
                                    onClick={() => {
                                      setReportType('radiology');
                                      setSelectedReport(record);
                                      setIsReportOpen(true);
                                    }}
                                  >
                                    <Eye className="w-3.5 h-3.5 mr-1" />
                                    View Report
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 text-blue-600 hover:bg-blue-50 px-2 text-[10px] font-bold"
                                    onClick={() => handlePrintRadiologyReport(record)}
                                  >
                                    <Printer className="w-3.5 h-3.5 mr-1" />
                                    Print
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pharmacy History */}
            <Card className="border-none shadow-sm h-full flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-emerald-600" />
                  <CardTitle className="text-lg">Pharmacy History</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden">
                <div className="h-[250px] overflow-y-auto custom-scrollbar">
                  <div className="p-4 space-y-3">
                    {pharmacyBills.filter(b => isPatientIdMatch(b.patientId, selectedPatient.id)).length === 0 ? (
                      <div className="text-center py-10 opacity-30 flex flex-col items-center">
                        <ShoppingCart className="w-8 h-8 mb-2" />
                        <p className="text-xs font-bold uppercase">No purchase history</p>
                      </div>
                    ) : (
                      pharmacyBills.filter(b => isPatientIdMatch(b.patientId, selectedPatient.id)).map(bill => (
                        <div key={bill.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="flex justify-between mb-2">
                            <p className="text-xs font-black text-slate-800">#{bill.id.toUpperCase()}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{formatDate(bill.date)}</p>
                          </div>
                          <div className="space-y-1">
                            {(bill.items || bill.invoice_items || []).map((item: any, i: number) => {
                              const displayName = item.name || item.item_name || item.description || "Medicine/Item";
                              const displayPrice = item.price || item.unit_price || item.amount || 0;
                              return (
                                <div key={i} className="flex justify-between text-[10px]">
                                  <span className="text-slate-600 font-bold">{displayName} x{item.quantity}</span>
                                  <span className="text-slate-400 font-medium">{formatCurrency(displayPrice * item.quantity)}</span>
                                </div>
                              );
                            })}
                          </div>
                          <Separator className="my-2" />
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Total Amount</span>
                            <span className="text-xs font-black text-emerald-600">{formatCurrency(bill.totalAmount)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Prescriptions */}
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Pill className="w-5 h-5 text-medical-blue" />
                  <CardTitle className="text-lg">Recent Prescriptions</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[250px] overflow-y-auto custom-scrollbar">
                  <div className="p-4 space-y-3">
                    {prescriptions.filter(rx => isPatientIdMatch(rx.patientId, selectedPatient.id) || isPatientIdMatch(rx.patient_id, selectedPatient.id)).length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-8 italic">No prescription history</p>
                    ) : (
                      prescriptions.filter(rx => isPatientIdMatch(rx.patientId, selectedPatient.id) || isPatientIdMatch(rx.patient_id, selectedPatient.id)).map(rx => (
                        <div key={rx.id} className="p-3 rounded-xl bg-blue-50/50 border border-blue-100">
                          <div className="flex justify-between items-start mb-2">
                            <p className="text-[10px] font-bold text-blue-600 uppercase">
                              {staff.find(u => u.id === rx.doctor_id || u.id === rx.doctorId)?.name || 'Doctor'}
                            </p>
                            <p className="text-[10px] text-slate-400">{formatDate(rx.date)}</p>
                          </div>
                          <div className="space-y-1">
                            {rx.medicines.map((m, i) => (
                              <p key={i} className="text-xs font-bold">{m.name} ({m.dosage}) - {m.frequency}</p>
                            ))}
                          </div>
                          <div className="mt-3 pt-2 border-t border-blue-100 flex items-center justify-between">
                            <span className="text-[10px] text-blue-600 font-medium truncate max-w-[120px]">
                              {rx.medicines?.length || 0} Medicines Listed
                            </span>
                            <div className="flex gap-1">
                              {rx.medicines && rx.medicines.length > 0 && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 text-emerald-600 hover:bg-emerald-50 px-2"
                                  onClick={() => handlePrintPrescription(rx)}
                                >
                                  <Printer className="w-3 h-3 mr-1" />
                                  Print
                                </Button>
                              )}
                              {rx.attachmentUrl && (
                                <>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 text-medical-blue hover:bg-blue-100 px-2"
                                    onClick={() => {
                                      setPreviewData({ url: rx.attachmentUrl!, name: rx.attachmentName || 'Prescription' });
                                      setIsPreviewOpen(true);
                                    }}
                                  >
                                    <Eye className="w-3 h-3 mr-1" />
                                    View
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 text-slate-500 hover:bg-slate-100 px-2"
                                    onClick={() => {
                                      const link = document.createElement('a');
                                      link.href = rx.attachmentUrl!;
                                      link.download = rx.attachmentName || 'prescription.pdf';
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                    }}
                                  >
                                    <Download className="w-3 h-3 mr-1" />
                                    Download
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Insurance Claims */}
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-medical-blue" />
                  <CardTitle className="text-lg">Insurance Claims</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[250px] overflow-y-auto custom-scrollbar">
                  <div className="p-4 space-y-3">
                    {patientClaims.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-8 italic">No insurance claims found</p>
                    ) : (
                      patientClaims.map(claim => {
                        const companyName = claim.insuranceCompany || claim.insurance_company || 'Unknown Insurance';
                        const policyNo = claim.policyNo || claim.policy_no;
                        const approvedAmt = claim.approvedAmount !== undefined ? claim.approvedAmount : (claim.approved_amount !== undefined ? claim.approved_amount : 0);
                        const limitAmt = claim.insuranceLimit !== undefined ? claim.insuranceLimit : (claim.insurance_limit !== undefined ? claim.insurance_limit : 0);
                        return (
                          <div key={claim.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm font-bold text-slate-800 leading-tight">{companyName}</p>
                                <p className="text-[10px] text-slate-500 mt-0.5">ID: {claim.id} {policyNo ? `| Policy: ${policyNo}` : ''}</p>
                              </div>
                              <Badge className={`${claim.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'} border-none text-[9px] uppercase`}>
                                {claim.status}
                              </Badge>
                            </div>
                            <div className="flex justify-between items-baseline mt-2.5 pt-1.5 border-t border-slate-100/60">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Approved Amt:</span>
                              <p className="text-sm font-black text-emerald-600 font-mono">{formatCurrency(approvedAmt)}</p>
                            </div>
                            {limitAmt > 0 && limitAmt !== approvedAmt && (
                              <div className="flex justify-between items-baseline mt-1">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Requested Limit:</span>
                                <p className="text-xs text-slate-500 font-bold font-mono">{formatCurrency(limitAmt)}</p>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Surgical & OT Operations History Card */}
            <Card className="border-none shadow-sm md:col-span-2 bg-gradient-to-br from-slate-50 to-emerald-50/20 border-l-4 border-emerald-600">
              <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-slate-900 font-extrabold">Surgical & Operation Theatre (OT) Records</CardTitle>
                      <p className="text-xs text-slate-500 font-medium">Scheduled surgeries, intra-operative procedures, WHO safety checklist & post-op care</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold gap-1.5 h-8"
                      onClick={() => setIsSurgicalChecklistOpen(true)}
                    >
                      <ClipboardCheck className="w-3.5 h-3.5" />
                      WHO Safety Checklist
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-xs font-bold gap-1.5 h-8"
                      onClick={() => {
                        setPostOpDefaultTab('checklist');
                        setIsPostOpOpen(true);
                      }}
                    >
                      <HeartPulse className="w-3.5 h-3.5" />
                      Post-Op Care
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                {patientOTRecords.length === 0 ? (
                  <div className="text-center py-6 bg-white/80 rounded-xl border border-emerald-100 p-4 space-y-2">
                    <Activity className="w-8 h-8 mx-auto text-emerald-300" />
                    <p className="text-xs text-slate-700 font-bold uppercase tracking-wider">No Scheduled Surgical Operation for this Patient</p>
                    <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                      You can book an OT room, conduct preoperative clearance, or fill the WHO Surgical Safety Checklist.
                    </p>
                    <div className="flex justify-center gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs font-bold border-slate-200"
                        onClick={() => setIsConsentOpen(true)}
                      >
                        <ShieldCheck className="w-3.5 h-3.5 mr-1 text-teal-600" />
                        Surgical Consent
                      </Button>
                      <Button
                        size="sm"
                        className="bg-medical-blue hover:bg-medical-blue/90 text-xs font-bold"
                        onClick={() => setIsSurgicalChecklistOpen(true)}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Open Pre-Op Safety Checklist
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {patientOTRecords.map((op: any, index: number) => {
                      const opSurgeonName = op.surgeonName || (staff.find(u => String(u.id) === String(op.surgeonId || op.surgeon_id))?.name) || 'Assigned Surgeon';
                      const opStatus = op.status || 'Scheduled';
                      const opDate = op.date || op.scheduled_date || op.surgery_date || 'Today';
                      const opTime = op.startTime || op.scheduled_time || op.time || '10:00 AM';
                      
                      return (
                        <div key={op.id || index} className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs hover:border-emerald-200 transition-all space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                            <div className="flex items-center gap-2.5">
                              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                              <div>
                                <h4 className="text-base font-extrabold text-slate-900">{op.operationName || op.procedure_name || 'Surgical Procedure'}</h4>
                                <p className="text-xs text-slate-500 font-medium">
                                  Date: <span className="font-bold text-slate-800">{formatDate(opDate)}</span> • Time: <span className="font-bold text-slate-800">{opTime}</span>
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={`${
                                opStatus === 'In-Progress' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                                opStatus === 'Completed' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                                'bg-blue-100 text-blue-900 border-blue-300'
                              } text-xs font-black uppercase px-2.5 py-0.5 border`}>
                                {opStatus}
                              </Badge>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Operating Surgeon</span>
                              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-medical-blue" />
                                {opSurgeonName}
                              </span>
                            </div>
                            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Theatre Unit</span>
                              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                <Scissors className="w-3.5 h-3.5 text-medical-blue" />
                                {op.theatreName || (op.theatreId ? `OT-${op.theatreId}` : 'Main Surgical OT')}
                              </span>
                            </div>
                            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Clinical Protocol</span>
                              <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                WHO Checklist Ready
                              </span>
                            </div>
                          </div>

                          {op.notes && (
                            <p className="text-xs text-slate-600 bg-slate-50/80 p-2.5 rounded-lg border border-slate-100 italic">
                              <strong>Pre/Intra-Op Notes:</strong> {op.notes}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs font-bold border-slate-200 h-8"
                              onClick={() => setIsConsentOpen(true)}
                            >
                              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-teal-600" />
                              Consent Forms
                            </Button>
                            <Button
                              size="sm"
                              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold gap-1 h-8"
                              onClick={() => setIsSurgicalChecklistOpen(true)}
                            >
                              <ClipboardCheck className="w-3.5 h-3.5" />
                              Launch WHO Safety Checklist
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-blue-200 text-blue-700 hover:bg-blue-50 text-xs font-bold gap-1 h-8"
                              onClick={() => {
                                setPostOpDefaultTab('instructions');
                                setIsPostOpOpen(true);
                              }}
                            >
                              <HeartPulse className="w-3.5 h-3.5" />
                              Post-Op Orders
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Maternity & Birth Summary */}
            {selectedPatient.gender === 'Female' && (selectedPatient.registration_type === 'Maternity' || maternityDeliveries.length > 0) && (
              <Card className="border-none shadow-sm md:col-span-2 bg-pink-50/20 border-l-4 border-pink-500">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Baby className="w-5 h-5 text-pink-600" />
                    <CardTitle className="text-lg text-pink-800">Maternity & Birth Record</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-1">
                  {maternityDeliveries.length === 0 ? (
                    <div className="text-center py-6 bg-white/70 rounded-xl border border-pink-100">
                      <Baby className="w-8 h-8 mx-auto mb-2 text-pink-300" />
                      <p className="text-xs text-slate-500 font-bold uppercase">No active delivery summary generated yet</p>
                      <p className="text-[10px] text-slate-400 mt-1">Delivery records can be registered at the Maternity department.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {maternityDeliveries.map(delivery => {
                        const newborns = maternityNewborns.filter(b => isPatientIdMatch(b.mother_id, selectedPatient.id));
                        return (
                          <div key={delivery.id} className="p-4 rounded-xl border border-pink-100 bg-white shadow-xs">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                              <div>
                                <h4 className="text-sm font-black text-pink-700 capitalize">
                                  {delivery.delivery_type || 'Normal'} Delivery Summary
                                </h4>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  DATE: {formatDate(delivery.delivery_date)} at {delivery.delivery_time || 'N/A'}
                                </p>
                              </div>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 border-pink-200 text-pink-700 hover:bg-pink-50/50 hover:text-pink-800 text-xs font-bold"
                                onClick={() => handlePrintMaternityReport(delivery)}
                              >
                                <Printer className="w-3.5 h-3.5 mr-1" />
                                Print Birth Summary
                              </Button>
                            </div>
                            
                            {delivery.notes && (
                              <div className="text-xs text-slate-600 bg-slate-50 border border-slate-100 p-3 rounded-lg leading-relaxed mb-3">
                                <strong>Clinical Delivery Notes:</strong> {delivery.notes}
                              </div>
                            )}

                            {newborns.length > 0 && (
                              <div className="mt-2 space-y-2">
                                <h5 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Newborn Infant Information</h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {newborns.map((baby, idx) => (
                                    <div key={baby.id} className="p-2.5 rounded-lg border border-slate-100 bg-pink-50/10 flex items-center justify-between text-xs">
                                      <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center font-bold">
                                          #{idx + 1}
                                        </div>
                                        <div>
                                          <p className="font-bold text-slate-800">
                                            Gender: <span className="text-pink-600">{baby.gender || 'Unknown'}</span>
                                          </p>
                                          <p className="text-[10px] text-slate-400">
                                            Birth Weight: <span className="font-bold text-teal-600">{baby.birth_weight || '3.2'} kg</span>
                                          </p>
                                        </div>
                                      </div>
                                      <Badge variant="outline" className="border-emerald-100 text-emerald-700 bg-emerald-50/50 text-[9px] font-bold">
                                        HEALTHY
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
                       {/* Billing & Payments */}
            {isFinancialVisible && (
              <Card className="border-none shadow-sm md:col-span-2">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-medical-blue" />
                    <CardTitle className="text-lg">Billing & Payment Status</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="p-4">
                    {(() => {
                      const totalDiscount = patientBills.reduce((acc, b) => acc + Number(b.discount_amount ?? b.discountAmount ?? b.discount ?? 0), 0);
                      const baseBilled = patientBills.reduce((acc, b) => acc + Number(b.payable_amount ?? b.payableAmount ?? b.total_amount ?? b.totalAmount ?? 0), 0);
                      const totalBilled = baseBilled + (activeBedCharge ? activeBedCharge.total : 0);
                      return (
                        <div className={`grid grid-cols-1 ${totalDiscount > 0 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'} gap-4 mb-4`}>
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Billed</p>
                            <p className="text-lg font-bold text-slate-800">{formatCurrency(totalBilled)}</p>
                          </div>
                          {totalDiscount > 0 && (
                            <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-100">
                              <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">Total Discount</p>
                              <p className="text-lg font-bold text-amber-700">{formatCurrency(totalDiscount)}</p>
                            </div>
                          )}
                          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                            <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Total Paid</p>
                            <p className="text-lg font-bold text-emerald-700">{formatCurrency(patientBills.reduce((acc, b) => acc + Number(b.paid_amount ?? b.paidAmount ?? 0), 0))}</p>
                          </div>
                          <div className="p-3 rounded-xl bg-rose-50 border border-rose-100">
                            <p className="text-[10px] font-bold text-rose-600 uppercase mb-1">Total Dues</p>
                            <p className="text-lg font-bold text-rose-700">{formatCurrency(dues)}</p>
                          </div>
                        </div>
                      );
                    })()}
                    
                    <div className="space-y-3">
                      {/* Active Estimated IPD Bed Charges */}
                      {activeBedCharge && (
                        <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-50/40 border border-amber-100 shadow-xs relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-amber-100 text-amber-700">
                              <Bed className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-amber-900 flex items-center gap-1.5">
                                IPD Bed Charges (Estimated)
                                <Badge className="bg-amber-100 hover:bg-amber-100 text-amber-800 text-[9px] px-2 py-0.5 border-none font-bold">Active Stay</Badge>
                              </p>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                Bed {activeBedCharge.bed.bed_number} ({activeBedCharge.bed.bed_type || activeBedCharge.bed.type} Bed) • {activeBedCharge.days} Days • {formatCurrency(activeBedCharge.rate)}/Day
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex flex-col items-end">
                            <p className="text-sm font-bold text-amber-950">{formatCurrency(activeBedCharge.total)}</p>
                            <Badge className="bg-rose-100 hover:bg-rose-100 text-rose-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded border border-rose-200 mt-1.5 uppercase">
                              DUE (Pending Discharge)
                            </Badge>
                          </div>
                        </div>
                      )}

                      {/* Regular Invoices */}
                      {patientBills.map(bill => {
                        const discVal = Number(bill.discount_amount ?? bill.discountAmount ?? bill.discount ?? 0);
                        const grossAmount = Number(bill.total_amount ?? bill.totalAmount ?? 0);
                        const netAmount = Number(bill.payable_amount ?? bill.payableAmount ?? (grossAmount - discVal));
                        
                        const isPaid = ['paid', 'completed', 'cleared'].includes(String(bill.payment_status || bill.status || '').toLowerCase());
                        const isPartiallyPaid = ['partially paid', 'partial'].includes(String(bill.payment_status || bill.status || '').toLowerCase());
                        
                        let badgeStyle = "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-50 font-extrabold text-[10px] px-2.5 py-0.5 rounded";
                        let badgeText = "DUE / UNPAID";
                        
                        if (isPaid) {
                          badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 font-extrabold text-[10px] px-2.5 py-0.5 rounded";
                          badgeText = "PAID / CLEARED";
                        } else if (isPartiallyPaid) {
                          badgeStyle = "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 font-extrabold text-[10px] px-2.5 py-0.5 rounded";
                          badgeText = "PARTIALLY PAID / DUE";
                        }

                        return (
                          <div key={bill.id} className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-slate-100 shadow-xs">
                            <div className="flex items-center gap-3">
                              <div className={`p-2.5 rounded-lg ${isPaid ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                {isPaid ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-800">Invoice #{bill.invoice_number || bill.id.substring(0, 8).toUpperCase()}</p>
                                <p className="text-[10px] text-slate-500 mt-0.5">{formatDate(bill.created_at)} • {bill.payment_method || 'N/A'}</p>
                              </div>
                            </div>
                            <div className="text-right flex flex-col items-end">
                              {discVal > 0 ? (
                                <div className="flex flex-col items-end">
                                  <span className="text-[10px] text-slate-400 line-through leading-tight">
                                    {formatCurrency(grossAmount)}
                                  </span>
                                  <span className="text-[10px] text-emerald-600 font-semibold leading-tight mt-0.5">
                                    -{formatCurrency(discVal)} Disc
                                  </span>
                                  <p className="text-sm font-bold text-slate-900 leading-tight mt-0.5">{formatCurrency(netAmount)}</p>
                                </div>
                              ) : (
                                <p className="text-sm font-bold text-slate-900">{formatCurrency(grossAmount)}</p>
                              )}
                              <Badge variant="outline" className={`${badgeStyle} mt-1.5 uppercase`}>
                                {badgeText}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                      
                      {(!activeBedCharge && patientBills.length === 0) && (
                        <div className="text-center py-6 text-slate-400 text-xs">
                          No billing history found for this patient.
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Prescription Dialog */}
      <Dialog open={isPrescriptionOpen} onOpenChange={setIsPrescriptionOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle>{isReceptionist ? 'Enter Vitals / View Prescription' : 'Write New Prescription'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Diagnosis</Label>
              <Input 
                disabled={isReceptionist}
                placeholder="Initial diagnosis..."
                value={newPrescription.diagnosis}
                onChange={e => setNewPrescription({...newPrescription, diagnosis: e.target.value})}
              />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Medicines</Label>
                {!isReceptionist && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 text-medical-blue h-8"
                    onClick={() => setNewPrescription({
                      ...newPrescription, 
                      medicines: [...newPrescription.medicines, { name: '', dosage: '', frequency: '' }]
                    })}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Medicine
                  </Button>
                )}
              </div>
              {newPrescription.medicines.map((med, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5 space-y-1">
                    <Input 
                      disabled={isReceptionist}
                      placeholder="Medicine name (e.g. Tab Paracetamol 500mg)" 
                      value={med.name}
                      onChange={e => {
                        const meds = [...newPrescription.medicines];
                        meds[idx].name = e.target.value;
                        setNewPrescription({...newPrescription, medicines: meds});
                      }}
                    />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <Input 
                      disabled={isReceptionist}
                      placeholder="Dosage (e.g. 1 tab)" 
                      value={med.dosage}
                      onChange={e => {
                        const meds = [...newPrescription.medicines];
                        meds[idx].dosage = e.target.value;
                        setNewPrescription({...newPrescription, medicines: meds});
                      }}
                    />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <Input 
                      disabled={isReceptionist}
                      placeholder="Freq (1-0-1, TDS)" 
                      value={med.frequency}
                      onChange={e => {
                        const meds = [...newPrescription.medicines];
                        meds[idx].frequency = e.target.value;
                        setNewPrescription({...newPrescription, medicines: meds});
                      }}
                    />
                  </div>
                  {!isReceptionist && (
                    <div className="col-span-1 flex items-center justify-center pb-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                        title="Remove Medicine"
                        onClick={() => {
                          const meds = newPrescription.medicines.filter((_, i) => i !== idx);
                          setNewPrescription({
                            ...newPrescription,
                            medicines: meds.length > 0 ? meds : [{ name: '', dosage: '', frequency: '' }]
                          });
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label>General Advice</Label>
              <textarea 
                disabled={isReceptionist}
                className="w-full min-h-[100px] p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                placeholder="Special instructions or advice..."
                value={newPrescription.advice}
                onChange={e => setNewPrescription({...newPrescription, advice: e.target.value})}
              />
            </div>

            {/* Patient Vitals Entry Option */}
            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5 mb-2">
                <span className="font-bold text-xs uppercase text-slate-700 tracking-wider">Patient Vitals / Measurements</span>
                <Badge variant="outline" className="text-[9px] text-emerald-600 bg-emerald-50 border-emerald-100 font-bold uppercase py-0 px-1.5 h-4">
                  Vitals Option
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-500 uppercase font-semibold">BP (mmHg)</Label>
                  <Input 
                    placeholder="e.g. 120/80" 
                    value={newPrescription.vitals?.bp || ''} 
                    onChange={(e) => setNewPrescription({
                      ...newPrescription,
                      vitals: { ...(newPrescription.vitals || {}), bp: e.target.value }
                    })}
                    className="h-9 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-500 uppercase font-semibold">Pulse (/min)</Label>
                  <Input 
                    placeholder="e.g. 72" 
                    value={newPrescription.vitals?.pulse || ''} 
                    onChange={(e) => setNewPrescription({
                      ...newPrescription,
                      vitals: { ...(newPrescription.vitals || {}), pulse: e.target.value }
                    })}
                    className="h-9 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-500 uppercase font-semibold">Temp (°F)</Label>
                  <Input 
                    placeholder="e.g. 98.6" 
                    value={newPrescription.vitals?.temp || ''} 
                    onChange={(e) => setNewPrescription({
                      ...newPrescription,
                      vitals: { ...(newPrescription.vitals || {}), temp: e.target.value }
                    })}
                    className="h-9 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-500 uppercase font-semibold">SpO2 (%)</Label>
                  <Input 
                    placeholder="e.g. 98" 
                    value={newPrescription.vitals?.spo2 || ''} 
                    onChange={(e) => setNewPrescription({
                      ...newPrescription,
                      vitals: { ...(newPrescription.vitals || {}), spo2: e.target.value }
                    })}
                    className="h-9 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-500 uppercase font-semibold">Weight (kg)</Label>
                  <Input 
                    placeholder="e.g. 65" 
                    value={newPrescription.vitals?.weight || ''} 
                    onChange={(e) => setNewPrescription({
                      ...newPrescription,
                      vitals: { ...(newPrescription.vitals || {}), weight: e.target.value }
                    })}
                    className="h-9 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-500 uppercase font-semibold">Resp Rate (/min)</Label>
                  <Input 
                    placeholder="e.g. 18" 
                    value={newPrescription.vitals?.rr || ''} 
                    onChange={(e) => setNewPrescription({
                      ...newPrescription,
                      vitals: { ...(newPrescription.vitals || {}), rr: e.target.value }
                    })}
                    className="h-9 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-500 uppercase font-semibold">CVS</Label>
                  <Input 
                    placeholder="e.g. S1 S2 heard" 
                    value={newPrescription.vitals?.cvs || newPrescription.vitals?.cbs || ''} 
                    onChange={(e) => setNewPrescription({
                      ...newPrescription,
                      vitals: { ...(newPrescription.vitals || {}), cbs: e.target.value, cvs: e.target.value }
                    })}
                    className="h-9 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-500 uppercase font-semibold">RS</Label>
                  <Input 
                    placeholder="e.g. Bilateral clear" 
                    value={newPrescription.vitals?.rs || ''} 
                    onChange={(e) => setNewPrescription({
                      ...newPrescription,
                      vitals: { ...(newPrescription.vitals || {}), rs: e.target.value }
                    })}
                    className="h-9 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-500 uppercase font-semibold">CNS</Label>
                  <Input 
                    placeholder="e.g. Conscious, oriented" 
                    value={newPrescription.vitals?.cns || ''} 
                    onChange={(e) => setNewPrescription({
                      ...newPrescription,
                      vitals: { ...(newPrescription.vitals || {}), cns: e.target.value }
                    })}
                    className="h-9 bg-white"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsPrescriptionOpen(false)}>Cancel</Button>
            <Button 
              type="button"
              variant="outline" 
              className="gap-2 border-emerald-200 text-emerald-600 hover:bg-emerald-50" 
              onClick={() => handlePrintPrescription(newPrescription)}
            >
              <Printer className="w-4 h-4" />
              Print
            </Button>
            <Button className="bg-medical-blue" onClick={handleSavePrescription}>
              {isReceptionist ? 'Save Vitals Only' : 'Save Prescription'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Clinical Note Dialog */}
      <Dialog open={isAddNoteOpen} onOpenChange={setIsAddNoteOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Medical / Clinical Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Note Type</Label>
              <div className="flex gap-2">
                <Button 
                  type="button"
                  variant={newNote.note_type === 'DOCTOR' ? 'default' : 'outline'}
                  className={newNote.note_type === 'DOCTOR' ? 'bg-teal-600 hover:bg-teal-700' : ''}
                  onClick={() => setNewNote({ ...newNote, note_type: 'DOCTOR' })}
                >
                  Doctor Note
                </Button>
                <Button 
                  type="button"
                  variant={newNote.note_type === 'NURSE' ? 'default' : 'outline'}
                  className={newNote.note_type === 'NURSE' ? 'bg-amber-600 hover:bg-amber-700' : ''}
                  onClick={() => setNewNote({ ...newNote, note_type: 'NURSE' })}
                >
                  Nurse Note
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Findings & Notes</Label>
              <textarea 
                className="w-full min-h-[150px] p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                placeholder="Enter detailed clinical findings, notes, diagnosis or patient observations..."
                value={newNote.content}
                onChange={e => setNewNote({...newNote, content: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddNoteOpen(false)}>Cancel</Button>
            <Button className="bg-medical-blue" onClick={handleSaveClinicalNote}>Save Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Old Record Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Upload Old Prescription / Record</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center space-y-6">
            {!uploadedFile ? (
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 hover:bg-slate-50 transition-colors cursor-pointer relative">
                <input 
                  type="file" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                />
                <Upload className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-sm font-medium text-slate-600">Click to upload or drag and drop</p>
                <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG (Max 5MB)</p>
              </div>
            ) : (
              <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-medical-blue">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold text-slate-800 truncate">{uploadedFile.name}</p>
                  <p className="text-[10px] text-blue-600 font-bold uppercase">Ready to save</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setUploadedFile(null)}>
                  <Plus className="w-4 h-4 rotate-45" />
                </Button>
              </div>
            )}
            
            <p className="text-xs text-slate-500 italic">
              Note: This record will be attached to the patient's medical history for future reference.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadOpen(false)}>Cancel</Button>
            <Button className="bg-medical-blue" disabled={!uploadedFile} onClick={handleSaveUpload}>Save Record</Button>
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
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
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
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }
            }}>
              <Download className="w-4 h-4 mr-2" />
              Download File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detailed Report Viewer Dialog */}
      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto bg-white p-6 rounded-2xl">
          {selectedReport && (
            <div className="space-y-6">
              {/* Report Header */}
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                    {reportType === 'pathology' ? (
                      <Activity className="w-5 h-5 text-purple-600" />
                    ) : (
                      <Activity className="w-5 h-5 text-blue-600" />
                    )}
                    {reportType === 'pathology' ? 'Pathology Laboratory Report' : 'Radiology Diagnostic Report'}
                  </h3>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mt-1">
                    NEW GASTRO PLUS HOSPITAL LABORATORY & DIAGNOSTICS
                  </p>
                </div>
                <Badge className={`text-xs uppercase font-bold border ${getTestPaymentDetails(reportType === 'pathology' ? (selectedReport.test || '') : (selectedReport.test_name || '')).color}`}>
                  {getTestPaymentDetails(reportType === 'pathology' ? (selectedReport.test || '') : (selectedReport.test_name || '')).label}
                </Badge>
              </div>

              {/* Patient and Study Info */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                <div className="space-y-1.5">
                  <p className="text-slate-500 font-medium">Patient Name: <span className="font-bold text-slate-800">{selectedPatient?.name}</span></p>
                  <p className="text-slate-500 font-medium">Age/Gender: <span className="font-bold text-slate-800">{selectedPatient?.age}Y / {selectedPatient?.gender}</span></p>
                  <p className="text-slate-500 font-medium">Patient MRN: <span className="font-bold text-slate-800">{selectedPatient?.mrn || 'N/A'}</span></p>
                </div>
                <div className="space-y-1.5 text-right">
                  <p className="text-slate-500 font-medium">Test/Study: <span className="font-bold text-indigo-600">{reportType === 'pathology' ? selectedReport.test : selectedReport.test_name}</span></p>
                  <p className="text-slate-500 font-medium">Date: <span className="font-bold text-slate-800">{formatDate(reportType === 'pathology' ? selectedReport.date : selectedReport.requested_at)}</span></p>
                  <p className="text-slate-500 font-medium">Status: <span className="font-bold text-emerald-600 uppercase">{selectedReport.status}</span></p>
                </div>
              </div>

              {/* Report Contents */}
              <div className="space-y-4">
                {reportType === 'pathology' ? (
                  /* Pathology Results Table */
                  <div className="border rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b text-slate-500 font-bold">
                          <th className="p-3">Investigation Parameter</th>
                          <th className="p-3 text-right">Observed Value</th>
                          <th className="p-3 text-center">Unit</th>
                          <th className="p-3 text-center">Reference Range</th>
                          <th className="p-3 text-right">Interpretation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-slate-700">
                        {(() => {
                          const params = getPathologyReportParameters(selectedReport.test || '', selectedReport.result || '');
                          if (params) {
                            return params.map((p, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="p-3 font-semibold text-slate-800">{p.name}</td>
                                <td className="p-3 text-right font-black text-indigo-600">{p.value}</td>
                                <td className="p-3 text-center text-slate-500">{p.unit}</td>
                                <td className="p-3 text-center text-slate-500">{p.range}</td>
                                <td className="p-3 text-right">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                                    {p.status}
                                  </span>
                                </td>
                              </tr>
                            ));
                          } else {
                            return (
                              <tr className="hover:bg-slate-50/50">
                                <td className="p-3 font-semibold text-slate-800">{selectedReport.test}</td>
                                <td className="p-3 text-right font-black text-indigo-600">{selectedReport.result || 'Released'}</td>
                                <td className="p-3 text-center text-slate-500">{selectedReport.unit || 'N/A'}</td>
                                <td className="p-3 text-center text-slate-500">{selectedReport.range || '-'}</td>
                                <td className="p-3 text-right">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                                    RELEASED
                                  </span>
                                </td>
                              </tr>
                            );
                          }
                        })()}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* Radiology Findings */
                  <div className="space-y-4">
                    {selectedReport.findings ? (
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                        <span className="text-[10px] font-extrabold uppercase text-indigo-600 tracking-wider block">Clinical Findings & Observations:</span>
                        <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-medium">
                          {selectedReport.findings}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic text-center py-6">No detailed findings recorded. Refer to result notes below.</p>
                    )}

                    {selectedReport.result_notes && (
                      <div className="text-xs space-y-1">
                        <span className="font-bold text-slate-600 text-[10px] uppercase">Result Notes:</span>
                        <p className="text-slate-600 italic bg-amber-50/30 p-3 rounded-lg border border-amber-100/50">
                          {selectedReport.result_notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Report Findings/Comments for Pathology */}
                {reportType === 'pathology' && selectedReport.findings && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
                    <span className="text-[10px] font-extrabold uppercase text-purple-600 tracking-wider block">Pathologist's Commentary / Opinion:</span>
                    <p className="text-slate-700 font-medium leading-relaxed italic whitespace-pre-line">
                      {selectedReport.findings}
                    </p>
                  </div>
                )}

                {/* Signatures and Validation Section */}
                <div className="flex justify-between items-center pt-6 border-t text-xs text-slate-500">
                  <div>
                    <p className="font-bold text-slate-700">Validated By:</p>
                    <p className="font-semibold text-slate-600">{reportType === 'pathology' ? 'Dr. Ananya Ray, MD (Pathology)' : 'Dr. S. K. Sen, MD (Radiodiagnosis)'}</p>
                    <p className="text-[10px] text-slate-400">Consultant {reportType === 'pathology' ? 'Pathologist' : 'Radiologist'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-700">Report Status:</p>
                    <p className="text-emerald-600 font-black uppercase tracking-wider">{selectedReport.status || 'Verified'}</p>
                    <p className="text-[10px] text-slate-400">Electronically Signed</p>
                  </div>
                </div>
              </div>

              {/* Dialog Footer Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs font-bold"
                  onClick={() => {
                    if (reportType === 'pathology') {
                      handlePrintPathologyReport(selectedReport);
                    } else {
                      handlePrintRadiologyReport(selectedReport);
                    }
                  }}
                >
                  <Printer className="w-4 h-4 mr-1.5" />
                  Print Report
                </Button>
                <Button
                  className="bg-medical-blue text-white text-xs font-bold"
                  size="sm"
                  onClick={() => setIsReportOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* OT Consent Management Modal for Selected Patient */}
      <Dialog open={isConsentOpen} onOpenChange={setIsConsentOpen}>
        <DialogContent className="fixed inset-0 top-0 left-0 translate-x-0 translate-y-0 w-screen h-screen max-w-none max-h-none sm:max-w-none rounded-none m-0 p-0 flex flex-col bg-slate-50 overflow-hidden border-none shadow-none z-50">
          <div className="bg-white border-b border-slate-100 p-6 flex items-center justify-between shrink-0">
            <div className="space-y-1">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                Patient Informed Consents: {selectedPatient?.name}
              </h2>
              <p className="text-xs text-slate-500 font-medium">Manage clinical authorizations, anesthetist blocks, and ICU designations.</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setIsConsentOpen(false)}>
              <Plus className="w-4 h-4 rotate-45" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 md:p-8 w-full">
            <div className="w-full">
              <OTConsentManagement patientId={selectedPatient?.id} />
            </div>
          </div>
          <div className="bg-white border-t border-slate-100 p-4 flex justify-end gap-3 shrink-0">
            <Button variant="outline" className="text-xs h-9 font-bold px-6" onClick={() => setIsConsentOpen(false)}>Close Consent Panel</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* WHO Surgical Safety Checklist Modal for Selected Patient */}
      {isSurgicalChecklistOpen && (
        activeOTRecord ? (
          <SurgicalSafetyChecklist 
            record={activeOTRecord} 
            patient={selectedPatient} 
            onClose={() => setIsSurgicalChecklistOpen(false)}
          />
        ) : (
          <Dialog open={isSurgicalChecklistOpen} onOpenChange={setIsSurgicalChecklistOpen}>
            <DialogContent className="sm:max-w-[450px] p-6 bg-white rounded-2xl">
              <div className="text-center py-6 text-slate-500 space-y-3">
                <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
                <p className="font-bold text-sm text-slate-800">No Active Surgical Record</p>
                <p className="text-xs text-slate-500">There is no scheduled surgical operation record for this patient yet.</p>
                <Button onClick={() => setIsSurgicalChecklistOpen(false)} className="mt-2 text-xs font-bold">Close</Button>
              </div>
            </DialogContent>
          </Dialog>
        )
      )}

      {/* Post Operative Care Forms Modal */}
      {isPostOpOpen && (
        <Dialog open={isPostOpOpen} onOpenChange={setIsPostOpOpen}>
          <DialogContent className="fixed inset-0 top-0 left-0 translate-x-0 translate-y-0 w-screen h-screen max-w-none max-h-none sm:max-w-none rounded-none m-0 p-0 flex flex-col bg-slate-50 overflow-y-auto border-none shadow-none z-50">
            <PostOpForms 
              patient={selectedPatient}
              record={activeOTRecord}
              defaultFormTab={postOpDefaultTab}
              onClose={() => setIsPostOpOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* General Consent Modal */}
      {isGeneralConsentOpen && (
        <GeneralConsentModal
          isOpen={isGeneralConsentOpen}
          onClose={() => setIsGeneralConsentOpen(false)}
          patient={selectedPatient}
        />
      )}
      {/* Poor Prognosis Consent Modal */}
      {isPoorPrognosisOpen && (
        <PoorPrognosisConsentModal
          isOpen={isPoorPrognosisOpen}
          onClose={() => setIsPoorPrognosisOpen(false)}
          patient={selectedPatient}
        />
      )}

      {/* Edit Patient Details Dialog */}
      <Dialog open={isEditPatientOpen} onOpenChange={setIsEditPatientOpen}>
        <DialogContent className="sm:max-w-[540px] max-h-[92vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 bg-gradient-to-r from-blue-700 to-teal-700 text-white">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-teal-200" />
              <DialogTitle className="text-white text-base font-bold">
                Edit Patient Details & Contact
              </DialogTitle>
            </div>
            <p className="text-blue-100 text-xs mt-0.5">
              Update information for <span className="font-bold text-white">{selectedPatient?.name}</span> (MRN: {selectedPatient?.mrn})
            </p>
          </DialogHeader>

          <div className="p-5 space-y-4 overflow-y-auto max-h-[calc(88vh-140px)]">
            <div className="space-y-1.5">
              <Label htmlFor="edit-pat-phone" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-medical-blue" />
                Primary Phone / Mobile Number *
              </Label>
              <Input
                id="edit-pat-phone"
                placeholder="Enter 10-digit mobile number"
                value={editPatientForm.phone}
                onChange={(e) => setEditPatientForm(prev => ({ ...prev, phone: e.target.value }))}
                className="font-mono text-sm font-semibold"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-pat-name" className="text-xs font-bold text-slate-700">Patient Full Name *</Label>
                <Input
                  id="edit-pat-name"
                  placeholder="Patient Name"
                  value={editPatientForm.name}
                  onChange={(e) => setEditPatientForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-pat-age" className="text-xs font-bold text-slate-700">Age</Label>
                  <Input
                    id="edit-pat-age"
                    type="number"
                    placeholder="Age"
                    value={editPatientForm.age}
                    onChange={(e) => setEditPatientForm(prev => ({ ...prev, age: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-pat-gender" className="text-xs font-bold text-slate-700">Gender</Label>
                  <select
                    id="edit-pat-gender"
                    className="w-full h-9 rounded-md border border-input bg-background px-2 py-1 text-xs"
                    value={editPatientForm.gender}
                    onChange={(e) => setEditPatientForm(prev => ({ ...prev, gender: e.target.value }))}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-pat-email" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  Email Address
                </Label>
                <Input
                  id="edit-pat-email"
                  type="email"
                  placeholder="patient@example.com"
                  value={editPatientForm.email}
                  onChange={(e) => setEditPatientForm(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-pat-blood" className="text-xs font-bold text-slate-700">Blood Group</Label>
                <select
                  id="edit-pat-blood"
                  className="w-full h-9 rounded-md border border-input bg-background px-2 py-1 text-xs"
                  value={editPatientForm.bloodGroup}
                  onChange={(e) => setEditPatientForm(prev => ({ ...prev, bloodGroup: e.target.value }))}
                >
                  <option value="">Unknown / Not Set</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-pat-address" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Address
              </Label>
              <Input
                id="edit-pat-address"
                placeholder="Village / Town / City address"
                value={editPatientForm.address}
                onChange={(e) => setEditPatientForm(prev => ({ ...prev, address: e.target.value }))}
              />
            </div>

            {/* Relative 1 */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">Primary Relative / Guardian</span>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-500 font-semibold">Relation</Label>
                  <select
                    className="w-full h-8 rounded-md border border-input bg-white px-2 text-xs"
                    value={editPatientForm.relative1Relation}
                    onChange={(e) => setEditPatientForm(prev => ({ ...prev, relative1Relation: e.target.value }))}
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
                  <Label className="text-[10px] text-slate-500 font-semibold">Name</Label>
                  <Input
                    className="h-8 text-xs bg-white"
                    placeholder="Name"
                    value={editPatientForm.relative1Name}
                    onChange={(e) => setEditPatientForm(prev => ({ ...prev, relative1Name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-500 font-semibold">Phone</Label>
                  <Input
                    className="h-8 text-xs bg-white font-mono"
                    placeholder="Phone"
                    value={editPatientForm.relative1Phone}
                    onChange={(e) => setEditPatientForm(prev => ({ ...prev, relative1Phone: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-3 bg-slate-50 border-t flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setIsEditPatientOpen(false)}
              disabled={isSavingPatientEdit}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-medical-blue text-white font-bold text-xs gap-1.5"
              onClick={handleSavePatientEdit}
              disabled={isSavingPatientEdit}
            >
              {isSavingPatientEdit ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
