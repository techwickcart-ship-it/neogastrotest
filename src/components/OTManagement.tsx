import React, { useState, useEffect, useRef } from 'react';
import { 
  Scissors, 
  Plus, 
  Search, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Clock, 
  User, 
  CheckCircle2, 
  Upload,
  MoreVertical,
  Eye,
  Download,
  Trash2,
  Edit,
  Loader2,
  Activity,
  ClipboardList,
  ClipboardCheck,
  Printer,
  Stethoscope,
  ShieldAlert,
  FileCheck,
  History,
  HeartPulse,
  Package,
  ShieldCheck,
  Microscope,
  Pill,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Filter,
  Layers,
  Building2,
  Maximize2,
  Minimize2,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { OperationRecord, OperationTheatre, OTInfectionControlLog } from '@/types';
import { toast } from 'sonner';
import { supabaseService, toDeterministicUuid } from '@/services/supabaseService';
import { useDataSync } from '@/hooks/useDataSync';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { canUserModifyRecord } from '@/utils/rbac';
import OTInventory from './OTInventory';
import OTConsentManagement from './OTConsentManagement';
import OTClinicalRecords from './OTClinicalRecords';
import SurgicalSafetyChecklist from './SurgicalSafetyChecklist';
import PostOpForms from './PostOpForms';
import PreOpOrders from './PreOpOrders';
import CarewellOTSummaryComponent from './CarewellOTSummaryComponent';
import CarewellPreOpOrdersComponent from './CarewellPreOpOrdersComponent';
import OTBiopsyForm from './OTBiopsyForm';
import OTPharmacyRequisitionComponent from './OTPharmacyRequisition';
import OTInfectionControlRegisters from './OTInfectionControlRegisters';

import { MOCK_USERS, MOCK_THEATRES, MOCK_PATIENTS, MOCK_OPERATION_RECORDS } from '@/mockData';

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

const DEFAULT_SURGEONS = [
  { id: 'doc-ak-sharma', name: 'Dr. A. K. Sharma', specialization: 'Senior Gastro & General Surgeon', role: 'SURGEON' },
  { id: 'doc-sarah-sharma', name: 'Dr. Sarah Sharma', specialization: 'Consultant Laparoscopic Surgeon', role: 'SURGEON' },
  { id: 'doc-rajesh-kumar', name: 'Dr. Rajesh Kumar', specialization: 'General & Laparoscopic Surgeon', role: 'SURGEON' },
  { id: 'doc-vikram-mehta', name: 'Dr. Vikram Mehta', specialization: 'Orthopedic & Trauma Surgeon', role: 'SURGEON' },
  { id: 'doc-ananya-ray', name: 'Dr. Ananya Ray', specialization: 'Consultant Onco Surgeon', role: 'SURGEON' },
  { id: 'doc-ashay-rathore', name: 'Dr. Ashay Rathore', specialization: 'Neuro & General Surgeon', role: 'SURGEON' },
  { id: 'doc-navodita-tiwari', name: 'Dr. Navodita Tiwari', specialization: 'General Surgeon', role: 'SURGEON' },
  { id: 'doc-pk-mishra', name: 'Dr. P. K. Mishra', specialization: 'Senior Consultant Surgeon', role: 'SURGEON' },
];

const INITIAL_INFECTION_LOGS: OTInfectionControlLog[] = [
  { id: 'inf-1', date: '2026-07-08', time: '06:00 AM', theatreId: '1', theatreName: 'OT Room-1', cleaningType: 'Fumigation', disinfectantsUsed: 'Bacillocid Special 2%', airParticleCount: '1250', cultureSwabResult: 'Negative', loggedBy: 'Dr. Sarah Sharma' },
  { id: 'inf-2', date: '2026-07-09', time: '04:30 AM', theatreId: '2', theatreName: 'OT Room-2', cleaningType: 'Post-op Deep Clean', disinfectantsUsed: 'Cidex 2% & Microshield', airParticleCount: '1800', cultureSwabResult: 'Negative', loggedBy: 'Nurse Deepika Roy' }
];

interface OTTabItem {
  id: string;
  label: string;
  shortLabel?: string;
  category: 'core' | 'specialty' | 'forms';
  categoryName: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
}

const OT_TAB_ITEMS: OTTabItem[] = [
  {
    id: 'directory',
    label: 'OT Forms, Checklists & Registers Directory',
    shortLabel: 'Directory (14)',
    category: 'core',
    categoryName: 'Core OT Workflows',
    icon: ClipboardList,
    badge: '14 Index Catalog',
    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-black'
  },
  {
    id: 'consents',
    label: 'Consent Management',
    shortLabel: 'Consents',
    category: 'core',
    categoryName: 'Core OT Workflows',
    icon: ShieldCheck,
    badge: '1. Pre-Op Consent',
    badgeColor: 'bg-indigo-100 text-indigo-900 border-indigo-300'
  },
  {
    id: 'preop',
    label: 'Preoperative Orders',
    shortLabel: 'Pre-Op Orders',
    category: 'core',
    categoryName: 'Core OT Workflows',
    icon: ClipboardList,
    badge: '2. Pre-Op Prep',
    badgeColor: 'bg-sky-100 text-sky-900 border-sky-300'
  },
  {
    id: 'safety-checklist',
    label: 'Pre-Op & Surgical Safety Checklist',
    shortLabel: 'Pre-Op Checklist',
    category: 'core',
    categoryName: 'Core OT Workflows',
    icon: ClipboardCheck,
    badge: '3. WHO Safety',
    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300'
  },
  {
    id: 'theatres',
    label: 'Live OT Status & Theatres',
    shortLabel: 'Live OT',
    category: 'core',
    categoryName: 'Core OT Workflows',
    icon: Activity,
    badge: '🔴 Live OT',
    badgeColor: 'bg-emerald-100 text-emerald-950 border-emerald-300 font-extrabold'
  },
  {
    id: 'records',
    label: 'Operation Records & Schedules',
    shortLabel: 'OT Records',
    category: 'core',
    categoryName: 'Core OT Workflows',
    icon: History,
    badge: '5. Intra-Op Logs',
    badgeColor: 'bg-blue-100 text-blue-900 border-blue-300 font-extrabold'
  },
  {
    id: 'postop',
    label: 'Post-Op Care & Forms',
    shortLabel: 'Post-Op Care',
    category: 'core',
    categoryName: 'Core OT Workflows',
    icon: HeartPulse,
    badge: '6. PACU & Post-Op',
    badgeColor: 'bg-rose-100 text-rose-900 border-rose-300'
  },
  {
    id: 'carewell-preop-orders',
    label: 'GastroPlus Pre-Op Orders',
    shortLabel: 'GastroPlus Pre-Op',
    category: 'specialty',
    categoryName: 'GastroPlus Specialty',
    icon: FileCheck,
    badge: 'Specialty Pre-Op',
    badgeColor: 'bg-teal-100 text-teal-900 border-teal-300'
  },
  {
    id: 'carewell-ot-summary',
    label: 'GastroPlus OT Summary',
    shortLabel: 'GastroPlus Summary',
    category: 'specialty',
    categoryName: 'GastroPlus Specialty',
    icon: FileText,
    badge: 'Specialty Summary',
    badgeColor: 'bg-teal-100 text-teal-900 border-teal-300'
  },
  {
    id: 'ot-biopsy',
    label: 'Biopsy Form',
    shortLabel: 'Biopsy Form',
    category: 'forms',
    categoryName: 'Requisitions & Forms',
    icon: Microscope,
    badge: 'Biopsy Req',
    badgeColor: 'bg-purple-100 text-purple-900 border-purple-300'
  },
  {
    id: 'ot-pharmacy',
    label: 'OT Pharmacy Requisition',
    shortLabel: 'Pharmacy Req.',
    category: 'forms',
    categoryName: 'Requisitions & Forms',
    icon: Pill,
    badge: 'Drug Req',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300'
  },
  {
    id: 'inventory',
    label: 'OT Inventory',
    shortLabel: 'OT Inventory',
    category: 'forms',
    categoryName: 'Requisitions & Forms',
    icon: Package,
    badge: 'Inventory',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-300'
  },
  {
    id: 'infection',
    label: 'Infection Control Registers',
    shortLabel: 'Infection Registers',
    category: 'forms',
    categoryName: 'Requisitions & Forms',
    icon: Sparkles,
    badge: 'Audit Register',
    badgeColor: 'bg-cyan-100 text-cyan-900 border-cyan-300'
  }
];

export default function OTManagement() {
  const currentUser = storage.get(STORAGE_KEYS.SESSION_USER, null);
  const isDeleteForbidden = false;
  const [theatres, setTheatres] = useState<OperationTheatre[]>(() => {
    const stored = storage.get('hms_ot_theatres', null);
    return (stored && stored.length > 0) ? stored : MOCK_THEATRES;
  });
  const [records, setRecords] = useState<OperationRecord[]>(() => {
    const r1 = storage.get('hms_ot_records', null);
    const r2 = storage.get('hms_ot_schedules', null);
    if (r1 && r1.length > 0) return r1;
    if (r2 && r2.length > 0) return r2;
    return MOCK_OPERATION_RECORDS;
  });
  const [patients, setPatients] = useState<any[]>(() => {
    const p = storage.get(STORAGE_KEYS.PATIENTS, null);
    return (p && p.length > 0) ? p : MOCK_PATIENTS;
  });
  const [staff, setStaff] = useState<any[]>(() => storage.get(STORAGE_KEYS.USERS, MOCK_USERS));
  const [doctors, setDoctors] = useState<any[]>(DEFAULT_SURGEONS);
  const [activeTab, setActiveTab] = useState('theatres');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<OperationRecord | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocType, setNewDocType] = useState('Photo');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileBase64, setSelectedFileBase64] = useState<string>('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!newDocName) {
        setNewDocName(file.name.split('.')[0]);
      }
      if (file.type.startsWith('image/')) {
        setNewDocType('Photo');
      } else if (file.type.startsWith('video/')) {
        setNewDocType('Video');
      } else {
        setNewDocType('Document');
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedFileBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [showPatientResults, setShowPatientResults] = useState(false);
  const [newOp, setNewOp] = useState({ patientId: '', surgeonId: '', theatreId: '', operationName: '', date: '', time: '' });
  const [checklistRecord, setChecklistRecord] = useState<any | null>(null);
  const [surgicalChecklists, setSurgicalChecklists] = useState<Record<string, any>>({});

  useEffect(() => {
    const saved = storage.get('hms_ot_surgical_checklists', {});
    setSurgicalChecklists(saved);
  }, [checklistRecord]);

  // Clinical workflow & Infection control states
  const [clinicalWorkflowRecord, setClinicalWorkflowRecord] = useState<OperationRecord | null>(null);
  const [isWorkflowFullscreen, setIsWorkflowFullscreen] = useState(false);
  const [postOpRecord, setPostOpRecord] = useState<OperationRecord | null>(null);
  const [infectionLogs, setInfectionLogs] = useState<OTInfectionControlLog[]>([]);
  const [isInfectionLogOpen, setIsInfectionLogOpen] = useState(false);
  const [newInfectionLog, setNewInfectionLog] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    theatreId: '',
    cleaningType: 'Routine',
    disinfectantsUsed: 'Cidex 2%',
    airParticleCount: '1400',
    cultureSwabResult: 'Negative',
    loggedBy: ''
  });

  useEffect(() => {
    const fetchLogs = async () => {
      const stored = await supabaseService.getOTInfectionLogs();
      if (stored && stored.length > 0) {
        setInfectionLogs(stored);
      } else {
        setInfectionLogs(INITIAL_INFECTION_LOGS);
      }
    };
    fetchLogs();
  }, []);

  const handleAddInfectionLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInfectionLog.theatreId) {
      toast.error('Please select an OT Room');
      return;
    }
    const selectedRoom = theatres.find(t => t.id === newInfectionLog.theatreId);
    const logToAdd: OTInfectionControlLog = {
      id: `inf-${Date.now()}`,
      date: newInfectionLog.date,
      time: newInfectionLog.time,
      theatreId: newInfectionLog.theatreId,
      theatreName: selectedRoom ? selectedRoom.name : 'OT Room',
      cleaningType: newInfectionLog.cleaningType as any,
      disinfectantsUsed: newInfectionLog.disinfectantsUsed,
      airParticleCount: newInfectionLog.airParticleCount || undefined,
      cultureSwabResult: newInfectionLog.cultureSwabResult as any,
      loggedBy: newInfectionLog.loggedBy || currentUser?.name || 'Staff'
    };

    const saved = await supabaseService.createOTInfectionLog(logToAdd);
    if (saved) {
      setInfectionLogs(prev => [saved, ...prev]);
      setIsInfectionLogOpen(false);
      toast.success('Infection control sanitization log added successfully');
      
      // Reset form
      setNewInfectionLog({
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        theatreId: '',
        cleaningType: 'Routine',
        disinfectantsUsed: 'Cidex 2%',
        airParticleCount: '1400',
        cultureSwabResult: 'Negative',
        loggedBy: ''
      });
    } else {
      toast.error('Failed to add infection control log');
    }
  };

  const handleDeleteInfectionLog = async (id: string) => {
    if (confirm('Are you sure you want to delete this infection control log?')) {
      const success = await supabaseService.deleteOTInfectionLog(id);
      if (success) {
        setInfectionLogs(prev => prev.filter(log => log.id !== id));
        toast.success('Infection log deleted');
      } else {
        toast.error('Failed to delete infection control log');
      }
    }
  };

  const fetchData = async () => {
    const [theatresData, recordsData, patientsData, staffData] = await Promise.all([
      supabaseService.getOTRooms(),
      supabaseService.getOTSchedules(),
      supabaseService.getPatients(),
      supabaseService.getStaff()
    ]);
    
    if (theatresData && theatresData.length > 0) {
      setTheatres(theatresData);
    } else {
      const storedTheatres = storage.get('hms_ot_theatres', MOCK_THEATRES);
      setTheatres(storedTheatres && storedTheatres.length > 0 ? storedTheatres : MOCK_THEATRES);
    }
    
    if (recordsData && recordsData.length > 0) {
      setRecords(recordsData);
    } else {
      const fallbackRecords = storage.get('hms_ot_schedules', MOCK_OPERATION_RECORDS);
      const recordsToUse = fallbackRecords && fallbackRecords.length > 0 ? fallbackRecords : MOCK_OPERATION_RECORDS;
      setRecords(recordsToUse);
      storage.set('hms_ot_schedules', recordsToUse);
    }
    
    if (patientsData && patientsData.length > 0) {
      setPatients(patientsData);
    } else {
      const localPatients = storage.get(STORAGE_KEYS.PATIENTS, MOCK_PATIENTS) || [];
      setPatients(localPatients.length > 0 ? localPatients : MOCK_PATIENTS);
    }

    const allStaff = (staffData && staffData.length > 0) ? staffData : storage.get(STORAGE_KEYS.USERS, MOCK_USERS);
    setStaff(allStaff || []);

    const filteredFromStaff = (allStaff || []).filter((s: any) => {
      const r = (s.role || '').toUpperCase();
      const name = (s.name || '').toLowerCase();
      return r === 'DOCTOR' || r === 'SURGEON' || r === 'SUPER_ADMIN' || r === 'ADMIN' || name.startsWith('dr') || s.specialization;
    });

    const combinedDoctors = [...filteredFromStaff];
    DEFAULT_SURGEONS.forEach(defDoc => {
      if (!combinedDoctors.some(d => String(d.id).toLowerCase() === String(defDoc.id).toLowerCase() || String(d.name).trim().toLowerCase() === String(defDoc.name).trim().toLowerCase())) {
        combinedDoctors.push(defDoc);
      }
    });

    setDoctors(combinedDoctors);
    setLoading(false);
  };

  useDataSync(fetchData);

  useEffect(() => {
    if (!isScheduleOpen) {
      setPatientSearchTerm('');
      setShowPatientResults(false);
    }
  }, [isScheduleOpen]);

  const handleScheduleOp = async () => {
    if (!newOp.patientId) {
      toast.error('Please select a patient from the search list');
      return;
    }

    const surgeonToUse = newOp.surgeonId || doctors[0]?.id || doctors[0]?.name || 'doc-ak-sharma';

    if (!newOp.operationName || !newOp.operationName.trim()) {
      toast.error('Please enter the procedure name');
      return;
    }
    if (!newOp.date) {
      toast.error('Please select the surgery date');
      return;
    }
    if (!newOp.time) {
      toast.error('Please select the start time');
      return;
    }

    const selectedTheatre = newOp.theatreId || theatres[0]?.id || 'ot1';

    const opToAdd = {
      patient_id: newOp.patientId,
      surgeon_id: surgeonToUse,
      room_id: selectedTheatre,
      operation_name: newOp.operationName.trim(),
      scheduled_date: newOp.date,
      scheduled_time: newOp.time,
      status: 'Scheduled'
    };

    const result = await supabaseService.createOTSchedule(opToAdd);
    if (result) {
      toast.success('Operation scheduled successfully!');
      setNewOp({ patientId: '', surgeonId: '', theatreId: '', operationName: '', date: '', time: '' });
      setIsScheduleOpen(false);
      setActiveTab('records');
      setRecords(prev => [result, ...prev]);
      fetchData();
    } else {
      toast.error('Failed to schedule operation');
    }
  };

  const filteredRecords = records.filter(record => {
    const recordPatientId = record.patientId || record.patient_id;
    const patient = patients.find(p => p.id === recordPatientId);
    const operationName = record.operationName || record.operation_name || '';
    const query = searchQuery.toLowerCase();
    
    return (
      operationName.toLowerCase().includes(query) ||
      (patient?.name || '').toLowerCase().includes(query) ||
      (patient?.mrn || '').toLowerCase().includes(query)
    );
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'Occupied': return 'text-blue-600 bg-blue-50 border-blue-100';
      case 'Maintenance': return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'Scheduled': return 'text-blue-600 bg-blue-50 border-blue-100';
      case 'In-Progress': return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'Completed': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'Cancelled': return 'text-rose-600 bg-rose-50 border-rose-100';
      default: return 'text-slate-600 bg-slate-50 border-slate-100';
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) {
      toast.error('No operation record selected');
      return;
    }
    if (!selectedFileBase64) {
      toast.error('Please select a file to upload');
      return;
    }

    const newDoc = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: newDocName || selectedFile?.name || 'Attachment',
      type: newDocType,
      url: selectedFileBase64,
      uploaded_at: new Date().toISOString()
    };

    const currentDocuments = selectedRecord.documents || [];
    const updatedDocuments = [...currentDocuments, newDoc];

    const updates = {
      ...selectedRecord,
      documents: updatedDocuments
    };

    const result = await supabaseService.updateOTSchedule(selectedRecord.id, updates);
    if (result) {
      toast.success('Document uploaded successfully');
      setSelectedRecord(result);
      setRecords(prev => prev.map(r => r.id === selectedRecord.id ? result : r));
      
      const currentList = storage.get('hms_ot_schedules', []);
      const updatedList = currentList.map((r: any) => r.id === selectedRecord.id ? result : r);
      storage.set('hms_ot_schedules', updatedList);

      setSelectedFile(null);
      setSelectedFileBase64('');
      setNewDocName('');
      setNewDocType('Photo');
      setIsUploadDialogOpen(false);
    } else {
      toast.error('Failed to update operation record');
    }
  };

  const handleDownloadOTMedia = async (doc: any) => {
    try {
      const filename = (doc.name || `OT_Media_${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, '_');
      if (!doc.url) {
        toast.error('Media URL not available');
        return;
      }
      if (doc.url.startsWith('data:') || doc.url.startsWith('blob:')) {
        const a = document.createElement('a');
        a.href = doc.url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        try {
          const res = await fetch(doc.url);
          const blob = await res.blob();
          const blobUrl = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(blobUrl);
        } catch {
          const a = document.createElement('a');
          a.href = doc.url;
          a.target = '_blank';
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      }
      toast.success(`Media file "${doc.name || 'document'}" downloaded successfully!`);
    } catch {
      toast.error('Failed to download OT media document');
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (isDeleteForbidden) {
      toast.error('Deletion of OT scheduling is restricted for Front Office, Doctor, and Accountant roles.');
      return;
    }
    const record = records.find(r => r.id === id);
    if (record && !canUserModifyRecord(record, currentUser, staff)) {
      toast.error("Access Denied: This OT scheduling record was created by an Admin and cannot be deleted by non-admin users.");
      return;
    }
    if (confirm('Are you sure you want to delete this OT record?')) {
      const result = await supabaseService.deleteOTRecord(id);
      if (result) {
        toast.success('Operation record removed');
        fetchData();
      } else {
        toast.error('Failed to delete OT record');
      }
    }
  };

  const handleExportOT = () => {
    const headers = ['Operation Name', 'Patient', 'Surgeon', 'Date', 'Status'];
    const rows = records.map(r => [
      r.operationName,
      patients.find(p => p.id === r.patientId)?.name || 'N/A',
      staff.find(u => u.id === r.surgeonId)?.name || 'N/A',
      r.date || r.scheduled_date,
      r.status
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'ot_records.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('OT records exported');
  };

  const [selectedCategory, setSelectedCategory] = useState<'all' | 'core' | 'specialty' | 'forms'>('all');
  const [tabSearch, setTabSearch] = useState('');
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsContainerRef.current) {
      const scrollAmount = direction === 'left' ? -250 : 250;
      tabsContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const totalTheatres = theatres.length;
  const occupiedCount = theatres.filter(t => (t.status || '').toLowerCase() === 'occupied').length;
  const availableCount = theatres.filter(t => (t.status || 'Available').toLowerCase() === 'available').length;
  const scheduledCount = records.length;

  const filteredTabs = OT_TAB_ITEMS.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = !tabSearch.trim() || item.label.toLowerCase().includes(tabSearch.toLowerCase()) || (item.shortLabel && item.shortLabel.toLowerCase().includes(tabSearch.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-medical-blue" />
        <span className="ml-2 font-medium">Loading OT Records...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Executive Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1A5E63] via-[#154c50] to-[#0F3C3F] p-6 text-white shadow-md border border-[#1A5E63]/30">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/15 text-emerald-300 border border-white/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                OT Management Suite
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Operation Theatre Management
            </h1>
            <p className="text-emerald-100/90 text-xs sm:text-sm max-w-xl font-medium leading-relaxed">
              Real-time OT Monitoring, Surgical Records, GastroPlus Specialty Notes & Clinical Requisitions
            </p>

            {/* Quick Metrics Cards */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 text-xs">
                <Building2 className="w-3.5 h-3.5 text-teal-300" />
                <span className="text-white/80 font-medium">Total OTs:</span>
                <span className="font-extrabold text-white">{totalTheatres}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/20 backdrop-blur-sm border border-emerald-400/30 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-emerald-200 font-medium">Available:</span>
                <span className="font-extrabold text-emerald-300">{availableCount}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/20 backdrop-blur-sm border border-amber-400/30 text-xs">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-amber-200 font-medium">In Surgery:</span>
                <span className="font-extrabold text-amber-300">{occupiedCount}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 text-xs">
                <History className="w-3.5 h-3.5 text-blue-300" />
                <span className="text-blue-200 font-medium">Scheduled & Records:</span>
                <span className="font-black text-blue-100">{records.length}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/20 backdrop-blur-sm border border-emerald-400/30 text-xs">
                <ClipboardCheck className="w-3.5 h-3.5 text-emerald-300" />
                <span className="text-emerald-200 font-medium">Checklists:</span>
                <span className="font-black text-emerald-100">3</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-500/20 backdrop-blur-sm border border-cyan-400/30 text-xs">
                <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                <span className="text-cyan-200 font-medium">Registers:</span>
                <span className="font-black text-cyan-100">4</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 text-xs">
                <History className="w-3.5 h-3.5 text-sky-300" />
                <span className="text-white/80 font-medium">Catalog Total:</span>
                <span className="font-extrabold text-emerald-300">14 Docs</span>
              </div>
            </div>

            {/* Quick Primary View Switcher */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('core');
                  setActiveTab('theatres');
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'theatres'
                    ? 'bg-emerald-400 text-emerald-950 shadow-lg ring-2 ring-white/60 scale-105'
                    : 'bg-white/15 text-emerald-100 hover:bg-white/25 border border-white/20'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span>🔴 Live OT Status & Theatres ({theatres.length} Rooms)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('core');
                  setActiveTab('records');
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'records'
                    ? 'bg-sky-400 text-sky-950 shadow-lg ring-2 ring-white/60 scale-105'
                    : 'bg-white/15 text-sky-100 hover:bg-white/25 border border-white/20'
                }`}
              >
                <History className="w-3.5 h-3.5 text-sky-200" />
                <span>📋 Operation Records & Schedules ({records.length} Records)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('core');
                  setActiveTab('directory');
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'directory'
                    ? 'bg-amber-400 text-amber-950 shadow-lg ring-2 ring-white/60 scale-105'
                    : 'bg-white/15 text-amber-100 hover:bg-white/25 border border-white/20'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5 text-amber-200" />
                <span>📑 14 OT Master Forms Directory</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button 
              variant="outline" 
              className="gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 font-bold backdrop-blur-sm h-10 px-4" 
              onClick={handleExportOT}
            >
              <Download className="w-4 h-4 text-emerald-300" />
              Export Records
            </Button>
            {currentUser?.role !== 'DOCTOR' && (
              <Button 
                className="bg-amber-500 hover:bg-amber-600 text-amber-950 gap-2 font-extrabold h-10 px-5 shadow-lg shadow-amber-950/20" 
                onClick={() => setIsScheduleOpen(true)}
              >
                <Plus className="w-4 h-4" />
                Schedule Operation
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Schedule Dialog Container */}
      <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Schedule New Operation</DialogTitle>
            <DialogDescription>Enter details to book an OT for a procedure.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2 relative col-span-2">
              <Label>Patient (Search by Name or Phone)</Label>
              <div className="relative">
                <Input 
                  placeholder="Start typing name or phone..." 
                  value={patientSearchTerm}
                  onChange={(e) => {
                    setPatientSearchTerm(e.target.value);
                    setShowPatientResults(true);
                    if (e.target.value === '') {
                      setNewOp({...newOp, patientId: ''});
                    }
                  }}
                  onFocus={() => setShowPatientResults(true)}
                />
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
              
              {showPatientResults && patientSearchTerm.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-[200px] overflow-y-auto custom-scrollbar">
                  {patients.filter(p => 
                    (p.name || '').toLowerCase().includes(patientSearchTerm.toLowerCase()) || 
                    (p.phone || '').includes(patientSearchTerm)
                  ).length > 0 ? (
                    patients.filter(p => 
                      (p.name || '').toLowerCase().includes(patientSearchTerm.toLowerCase()) || 
                      (p.phone || '').includes(patientSearchTerm)
                    ).map(p => (
                      <div 
                        key={p.id} 
                        className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex justify-between items-center border-b border-slate-100 last:border-0"
                        onClick={() => {
                          setNewOp({...newOp, patientId: p.id});
                          setPatientSearchTerm(p.name);
                          setShowPatientResults(false);
                        }}
                      >
                        <div>
                          <p className="text-sm font-medium">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground">{p.phone} • MRN: {p.mrn}</p>
                        </div>
                        {newOp.patientId === p.id && <CheckCircle2 className="w-4 h-4 text-medical-blue" />}
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-4 text-center text-sm text-muted-foreground">
                      No patients found.
                    </div>
                  )}
                </div>
              )}

              {newOp.patientId && patients.find(p => p.id === newOp.patientId) && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded-md flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-blue-700 truncate">
                      {patients.find(p => p.id === newOp.patientId)?.name}
                    </p>
                    <p className="text-[10px] text-blue-600 truncate">
                      {patients.find(p => p.id === newOp.patientId)?.age} yrs • {patients.find(p => p.id === newOp.patientId)?.gender} • MRN: {patients.find(p => p.id === newOp.patientId)?.mrn}
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-blue-400 hover:text-blue-600 hover:bg-blue-100"
                    onClick={() => {
                      setNewOp({...newOp, patientId: ''});
                      setPatientSearchTerm('');
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700">Primary Surgeon <span className="text-rose-500">*</span></Label>
              <Select 
                value={newOp.surgeonId}
                onValueChange={(v) => setNewOp({...newOp, surgeonId: v})}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select surgeon">
                    {(() => {
                      if (!newOp.surgeonId) return undefined;
                      const found = doctors.find(u => String(u.id).toLowerCase() === String(newOp.surgeonId).toLowerCase() || String(u.name).toLowerCase() === String(newOp.surgeonId).toLowerCase());
                      return found ? found.name : newOp.surgeonId;
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[220px] overflow-y-auto">
                  {doctors.map(u => (
                    <SelectItem key={u.id || u.name} value={u.id || u.name}>
                      <div className="flex flex-col text-left py-0.5">
                        <span className="font-bold text-xs text-slate-900">{u.name}</span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {u.specialization || u.department || u.role || 'Surgeon'}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>OT Unit</Label>
              <Select 
                value={newOp.theatreId}
                onValueChange={(v) => setNewOp({...newOp, theatreId: v})}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select OT">
                    {newOp.theatreId ? (theatres.find(t => String(t.id).toLowerCase() === String(newOp.theatreId).toLowerCase())?.name || newOp.theatreId) : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {theatres.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Procedure Name</Label>
              <Input 
                placeholder="e.g. Appendectomy" 
                value={newOp.operationName}
                onChange={(e) => setNewOp({...newOp, operationName: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input 
                type="date" 
                value={newOp.date}
                onChange={(e) => setNewOp({...newOp, date: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input 
                type="time" 
                value={newOp.time}
                onChange={(e) => setNewOp({...newOp, time: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsScheduleOpen(false)}>Cancel</Button>
            <Button className="bg-medical-blue" onClick={handleScheduleOp}>Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        {/* Redesigned Categorized Menu & Tab Controls */}
        <div className="space-y-3 bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
          {/* Top Category Filter & Search Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/60 rounded-xl border border-slate-300/50">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedCategory === 'all'
                    ? 'bg-white text-teal-950 shadow-sm border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-teal-700" />
                All Modules ({OT_TAB_ITEMS.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('core');
                  if (!OT_TAB_ITEMS.filter(t => t.category === 'core').some(t => t.id === activeTab)) {
                    setActiveTab('theatres');
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedCategory === 'core'
                    ? 'bg-white text-teal-950 shadow-sm border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-blue-600" />
                Core OT ({OT_TAB_ITEMS.filter(t => t.category === 'core').length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('specialty');
                  if (!OT_TAB_ITEMS.filter(t => t.category === 'specialty').some(t => t.id === activeTab)) {
                    setActiveTab('carewell-ot-summary');
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedCategory === 'specialty'
                    ? 'bg-teal-700 text-white shadow-sm border border-teal-800'
                    : 'text-teal-800 bg-teal-50/70 hover:bg-teal-100/80 border border-teal-200/60'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                GastroPlus Specialty ({OT_TAB_ITEMS.filter(t => t.category === 'specialty').length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('forms');
                  if (!OT_TAB_ITEMS.filter(t => t.category === 'forms').some(t => t.id === activeTab)) {
                    setActiveTab('ot-biopsy');
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedCategory === 'forms'
                    ? 'bg-purple-700 text-white shadow-sm border border-purple-800'
                    : 'text-purple-800 bg-purple-50/70 hover:bg-purple-100/80 border border-purple-200/60'
                }`}
              >
                <Pill className="w-3.5 h-3.5" />
                Requisitions & Forms ({OT_TAB_ITEMS.filter(t => t.category === 'forms').length})
              </button>
            </div>

            {/* Quick Menu Search */}
            <div className="relative min-w-[180px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input
                type="text"
                placeholder="Find menu tab..."
                value={tabSearch}
                onChange={(e) => setTabSearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-white border-slate-200/80 rounded-lg shadow-2xs"
              />
              {tabSearch && (
                <button 
                  type="button" 
                  onClick={() => setTabSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-600 font-bold px-1"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Tab Strip with Scroll Buttons */}
          <div className="relative flex items-center group">
            <Button
              variant="outline"
              size="icon"
              type="button"
              onClick={() => scrollTabs('left')}
              className="absolute left-0 z-20 h-8 w-8 rounded-full bg-white shadow-md border border-slate-200 text-slate-700 hover:bg-slate-50 hidden md:flex items-center justify-center shrink-0 -ml-2"
              title="Scroll Left"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            {/* Scrollable Single Row Tab Container */}
            <div 
              ref={tabsContainerRef}
              className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 px-1 w-full rounded-xl"
            >
              {filteredTabs.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`group relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 select-none ${
                      isActive
                        ? 'bg-white text-teal-950 shadow-md ring-1 ring-teal-600/30 font-bold border-b-2 border-b-teal-600'
                        : 'bg-white/60 text-slate-600 hover:text-slate-900 hover:bg-white border border-slate-200/60 shadow-2xs'
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-teal-700' : 'text-slate-500'
                    }`} />
                    <span className="whitespace-nowrap">{item.label}</span>
                    {item.badge && (
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border uppercase tracking-wider ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="icon"
              type="button"
              onClick={() => scrollTabs('right')}
              className="absolute right-0 z-20 h-8 w-8 rounded-full bg-white shadow-md border border-slate-200 text-slate-700 hover:bg-slate-50 hidden md:flex items-center justify-center shrink-0 -mr-2"
              title="Scroll Right"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <TabsContent value="directory" className="mt-6 space-y-8">
          {/* Executive Catalog Banner */}
          <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-indigo-950 text-white p-6 rounded-3xl border border-teal-800/60 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500/30 text-emerald-300 border-emerald-400/30 font-extrabold text-xs">
                  CENTRAL OT DOCUMENTATION & REGISTERS DIRECTORY
                </Badge>
                <span className="text-xs text-teal-200/80 font-medium">• 14 Standardized OT Forms, Checklists & Registers</span>
              </div>
              <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
                <ClipboardList className="w-7 h-7 text-emerald-400" />
                OT & Surgical Care Catalog
              </h2>
              <p className="text-xs text-teal-100 max-w-2xl font-medium leading-relaxed">
                Appended catalog of all 14 mandatory surgical care documents organized software category wise. Click "Open Form", "Launch Checklist", or "View Register" in front of any item to launch it immediately.
              </p>
            </div>

            {/* Category Wise Count KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
              <div className="p-3 bg-blue-500/20 border border-blue-400/30 rounded-2xl text-center">
                <span className="text-[10px] uppercase font-bold text-blue-300 block">Forms & Sheets</span>
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

          {/* Category 1: Forms & Sheets (7 Items) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-3">
                <Badge className="bg-blue-600 text-white font-extrabold text-xs px-3 py-1">Category 1</Badge>
                <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Forms & Sheets (7 Total)
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-600 bg-blue-50 border border-blue-100 px-3 py-1 rounded-xl">
                7 Active Forms
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 1. Surgery Informed Consent Form */}
              <Card className="border-slate-200 hover:border-blue-400 shadow-xs hover:shadow-md transition-all rounded-2xl bg-white flex flex-col justify-between">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-bold">
                      Pre-Op Consent
                    </Badge>
                    <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900 mt-2">1. Surgery Informed Consent Form</CardTitle>
                  <CardDescription className="text-xs text-slate-500 font-medium leading-relaxed">
                    Surgical consent form for General Surgery, High-Risk Procedures, Anesthesia & Blood Transfusion with digital signatures.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <Button 
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 gap-2 rounded-xl"
                    onClick={() => setActiveTab('consents')}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Open Consent Form
                  </Button>
                </CardContent>
              </Card>

              {/* 2. Pre-Operative Assessment & Anesthetic Clearance Form */}
              <Card className="border-slate-200 hover:border-blue-400 shadow-xs hover:shadow-md transition-all rounded-2xl bg-white flex flex-col justify-between">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 text-[10px] font-bold">
                      Anesthetic Assessment
                    </Badge>
                    <Stethoscope className="w-5 h-5 text-sky-600" />
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900 mt-2">2. Pre-Operative Assessment & Anesthetic Clearance Form</CardTitle>
                  <CardDescription className="text-xs text-slate-500 font-medium leading-relaxed">
                    Airway assessment (Mallampati), ASA physical status classification, cardiac clearance & pre-anesthetic fitness clearance.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <Button 
                    className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs h-9 gap-2 rounded-xl"
                    onClick={() => setActiveTab('preop')}
                  >
                    <Stethoscope className="w-4 h-4" />
                    Open Anesthetic Clearance
                  </Button>
                </CardContent>
              </Card>

              {/* 3. Anaesthesia Record Sheet & Vital Log */}
              <Card className="border-slate-200 hover:border-blue-400 shadow-xs hover:shadow-md transition-all rounded-2xl bg-white flex flex-col justify-between">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold">
                      Intra-Op Vitals
                    </Badge>
                    <HeartPulse className="w-5 h-5 text-blue-600" />
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900 mt-2">3. Anaesthesia Record Sheet & Vital Log</CardTitle>
                  <CardDescription className="text-xs text-slate-500 font-medium leading-relaxed">
                    Intra-operative vital signs graph (BP, HR, SpO2, EtCO2), anesthesia drug doses, agent flow rates & fluid tracking.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 gap-2 rounded-xl"
                    onClick={() => setActiveTab('records')}
                  >
                    <HeartPulse className="w-4 h-4" />
                    Open Anaesthesia Record
                  </Button>
                </CardContent>
              </Card>

              {/* 4. Pre-Op Doctor Orders Sheet */}
              <Card className="border-slate-200 hover:border-blue-400 shadow-xs hover:shadow-md transition-all rounded-2xl bg-white flex flex-col justify-between">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 text-[10px] font-bold">
                      Doctor Orders
                    </Badge>
                    <ClipboardList className="w-5 h-5 text-teal-600" />
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900 mt-2">4. Pre-Op Doctor Orders Sheet</CardTitle>
                  <CardDescription className="text-xs text-slate-500 font-medium leading-relaxed">
                    NPO instructions, pre-medication drugs, IV fluid orders, surgical site preparation & blood reservation requisitions.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <Button 
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs h-9 gap-2 rounded-xl"
                    onClick={() => setActiveTab('carewell-preop-orders')}
                  >
                    <ClipboardList className="w-4 h-4" />
                    Open Pre-Op Orders
                  </Button>
                </CardContent>
              </Card>

              {/* 5. Carewell OT Procedure & Operative Summary Form */}
              <Card className="border-slate-200 hover:border-blue-400 shadow-xs hover:shadow-md transition-all rounded-2xl bg-white flex flex-col justify-between">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-teal-50 text-teal-800 border-teal-200 text-[10px] font-bold">
                      Specialty Operative
                    </Badge>
                    <FileText className="w-5 h-5 text-teal-700" />
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900 mt-2">5. Carewell OT Procedure & Operative Summary Form</CardTitle>
                  <CardDescription className="text-xs text-slate-500 font-medium leading-relaxed">
                    Operative procedure report, pre/post-op diagnosis, surgical findings, tissue excised, implants used & surgeon sign-off.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <Button 
                    className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs h-9 gap-2 rounded-xl"
                    onClick={() => setActiveTab('carewell-ot-summary')}
                  >
                    <FileText className="w-4 h-4" />
                    Open Operative Summary
                  </Button>
                </CardContent>
              </Card>

              {/* 6. OT Biopsy / Tissue Specimen Requisition Form */}
              <Card className="border-slate-200 hover:border-blue-400 shadow-xs hover:shadow-md transition-all rounded-2xl bg-white flex flex-col justify-between">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-bold">
                      Pathology Requisition
                    </Badge>
                    <Microscope className="w-5 h-5 text-purple-600" />
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900 mt-2">6. OT Biopsy / Tissue Specimen Requisition Form</CardTitle>
                  <CardDescription className="text-xs text-slate-500 font-medium leading-relaxed">
                    Surgical biopsy container tracking, tissue specimen identification, fixative medium (Formalin 10%) & histology request.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <Button 
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-9 gap-2 rounded-xl"
                    onClick={() => setActiveTab('ot-biopsy')}
                  >
                    <Microscope className="w-4 h-4" />
                    Open Biopsy Requisition
                  </Button>
                </CardContent>
              </Card>

              {/* 7. Post-Operative Recovery & Care Order Form */}
              <Card className="border-slate-200 hover:border-blue-400 shadow-xs hover:shadow-md transition-all rounded-2xl bg-white flex flex-col justify-between md:col-span-2 lg:col-span-1">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">
                      PACU & Recovery
                    </Badge>
                    <HeartPulse className="w-5 h-5 text-rose-600" />
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900 mt-2">7. Post-Operative Recovery & Care Order Form</CardTitle>
                  <CardDescription className="text-xs text-slate-500 font-medium leading-relaxed">
                    PACU post-anesthesia recovery chart, Aldrete score evaluation, post-op pain management & ward transfer care orders.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <Button 
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-9 gap-2 rounded-xl"
                    onClick={() => setActiveTab('postop')}
                  >
                    <HeartPulse className="w-4 h-4" />
                    Open Post-Op Recovery Form
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Category 2: Checklists (3 Items) */}
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
              {/* 1. WHO Surgical Safety Checklist */}
              <Card className="border-slate-200 hover:border-emerald-400 shadow-xs hover:shadow-md transition-all rounded-2xl bg-white flex flex-col justify-between">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                      MANDATORY WHO
                    </Badge>
                    <ClipboardCheck className="w-5 h-5 text-emerald-600" />
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900 mt-2">1. WHO Surgical Safety Checklist</CardTitle>
                  <CardDescription className="text-xs text-slate-500 font-medium leading-relaxed">
                    Mandatory 3-phase WHO surgical safety verification: Sign-In before induction, Time-Out before skin incision, and Sign-Out before patient leaves OT.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <Button 
                    className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs h-9 gap-2 rounded-xl"
                    onClick={() => setActiveTab('safety-checklist')}
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    Launch WHO Safety Checklist
                  </Button>
                </CardContent>
              </Card>

              {/* 2. OT Instrument & Sponge Count Checklist */}
              <Card className="border-slate-200 hover:border-emerald-400 shadow-xs hover:shadow-md transition-all rounded-2xl bg-white flex flex-col justify-between">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-bold">
                      Sponge & Instrument Audit
                    </Badge>
                    <ShieldAlert className="w-5 h-5 text-amber-600" />
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900 mt-2">2. OT Instrument & Sponge Count Checklist</CardTitle>
                  <CardDescription className="text-xs text-slate-500 font-medium leading-relaxed">
                    Pre-incision & closure count log for surgical sponges, gauze swabs, needles, scalpels & surgical instruments to prevent retained items.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <Button 
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-9 gap-2 rounded-xl"
                    onClick={() => setActiveTab('safety-checklist')}
                  >
                    <ShieldAlert className="w-4 h-4" />
                    Open Instrument & Sponge Count
                  </Button>
                </CardContent>
              </Card>

              {/* 3. Pre-Surgery Patient Preparation Checklist */}
              <Card className="border-slate-200 hover:border-emerald-400 shadow-xs hover:shadow-md transition-all rounded-2xl bg-white flex flex-col justify-between">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-sky-50 text-sky-800 border-sky-200 text-[10px] font-bold">
                      Patient Transfer Prep
                    </Badge>
                    <FileCheck className="w-5 h-5 text-sky-600" />
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900 mt-2">3. Pre-Surgery Patient Preparation Checklist</CardTitle>
                  <CardDescription className="text-xs text-slate-500 font-medium leading-relaxed">
                    Ward-to-OT transfer verification checklist: Patient ID band, consent verified, NPO status, surgical site marked & jewelry/dentures removed.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <Button 
                    className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs h-9 gap-2 rounded-xl"
                    onClick={() => setActiveTab('preop')}
                  >
                    <FileCheck className="w-4 h-4" />
                    Open Patient Prep Checklist
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Category 3: Registers (4 Items) */}
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
              {/* 1. OT Master Surgery Register */}
              <Card className="border-slate-200 hover:border-cyan-400 shadow-xs hover:shadow-md transition-all rounded-2xl bg-white flex flex-col justify-between">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 text-[10px] font-bold">
                      Master Surgery Log
                    </Badge>
                    <History className="w-5 h-5 text-blue-600" />
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900 mt-2">1. OT Master Surgery Register</CardTitle>
                  <CardDescription className="text-xs text-slate-500 font-medium leading-relaxed">
                    Central master register log of all surgical procedures, operating team, OT room #, time in/out, anesthesia type & surgical outcome.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <Button 
                    className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs h-9 gap-2 rounded-xl"
                    onClick={() => setActiveTab('records')}
                  >
                    <History className="w-4 h-4" />
                    View Master Surgery Register
                  </Button>
                </CardContent>
              </Card>

              {/* 2. OT Infection Control & Fumigation Register */}
              <Card className="border-slate-200 hover:border-cyan-400 shadow-xs hover:shadow-md transition-all rounded-2xl bg-white flex flex-col justify-between">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-cyan-50 text-cyan-800 border-cyan-200 text-[10px] font-bold">
                      Fumigation & Disinfection
                    </Badge>
                    <Sparkles className="w-5 h-5 text-cyan-600" />
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900 mt-2">2. OT Infection Control & Fumigation Register</CardTitle>
                  <CardDescription className="text-xs text-slate-500 font-medium leading-relaxed">
                    Environmental hygiene logbook for OT room fumigation/fogging schedules, disinfectant solution chemical logs & particle counts.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <Button 
                    className="w-full bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs h-9 gap-2 rounded-xl"
                    onClick={() => setActiveTab('infection')}
                  >
                    <Sparkles className="w-4 h-4" />
                    View Infection Control Register
                  </Button>
                </CardContent>
              </Card>

              {/* 3. OT Swab / Autoclave Sterilization Log Register */}
              <Card className="border-slate-200 hover:border-cyan-400 shadow-xs hover:shadow-md transition-all rounded-2xl bg-white flex flex-col justify-between">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                      Autoclave & Culture Swab
                    </Badge>
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900 mt-2">3. OT Swab / Autoclave Sterilization Log Register</CardTitle>
                  <CardDescription className="text-xs text-slate-500 font-medium leading-relaxed">
                    CSSD autoclave steam sterilization indicator logs, biological indicator test results & culture swab microbiological audit register.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <Button 
                    className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs h-9 gap-2 rounded-xl"
                    onClick={() => setActiveTab('infection')}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    View Sterilization Log Register
                  </Button>
                </CardContent>
              </Card>

              {/* 4. OT Pharmacy Requisition & Drug Consumption Register */}
              <Card className="border-slate-200 hover:border-cyan-400 shadow-xs hover:shadow-md transition-all rounded-2xl bg-white flex flex-col justify-between">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-bold">
                      Drug Consumption & Requisitions
                    </Badge>
                    <Pill className="w-5 h-5 text-amber-600" />
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900 mt-2">4. OT Pharmacy Requisition & Drug Consumption Register</CardTitle>
                  <CardDescription className="text-xs text-slate-500 font-medium leading-relaxed">
                    Intra-operative drug consumption log, narcotics/controlled drug register, emergency crash cart supplies & pharmacy requisitions.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <Button 
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-9 gap-2 rounded-xl"
                    onClick={() => setActiveTab('ot-pharmacy')}
                  >
                    <Pill className="w-4 h-4" />
                    View Pharmacy Requisition Register
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="theatres" className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-emerald-900 to-teal-950 text-white shadow-md">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                <h3 className="text-base font-extrabold text-white">Live Operation Theatres & Suite Status</h3>
              </div>
              <p className="text-xs text-emerald-200 mt-0.5">Real-time room occupancy, live ongoing surgical procedures, WHO checklist verification and staff assignments</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="bg-emerald-500 hover:bg-emerald-600 text-emerald-950 font-extrabold text-xs h-8 gap-1.5 shadow-sm"
                onClick={() => {
                  setSelectedCategory('core');
                  setActiveTab('records');
                }}
              >
                <History className="w-3.5 h-3.5" />
                View All Schedules ({records.length})
              </Button>
              {currentUser?.role !== 'DOCTOR' && (
                <Button
                  size="sm"
                  className="bg-amber-400 hover:bg-amber-500 text-amber-950 font-extrabold text-xs h-8 gap-1.5 shadow-sm"
                  onClick={() => setIsScheduleOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Book OT Room
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {theatres.map((ot) => {
              const activeOp = records.find(r => 
                (String(r.theatreId) === String(ot.id) || String(r.room_id) === String(ot.id)) && 
                (r.status === 'In-Progress' || (r.status === 'Scheduled' && (r.date === new Date().toISOString().split('T')[0] || r.scheduled_date === new Date().toISOString().split('T')[0])))
              );
              const opPatient = activeOp ? patients.find(p => isPatientIdMatch(p.id, activeOp.patientId || activeOp.patient_id)) : null;
              const opSurgeon = activeOp ? (staff.find(u => String(u.id) === String(activeOp.surgeonId || activeOp.surgeon_id)) || { name: activeOp.surgeonName || 'Lead Surgeon' }) : null;
              const isLive = ot.status === 'Occupied' || activeOp?.status === 'In-Progress';
              const upcomingForThisOT = records.filter(r => 
                (String(r.theatreId) === String(ot.id) || String(r.room_id) === String(ot.id)) && 
                r.id !== activeOp?.id && 
                r.status !== 'Completed' && 
                r.status !== 'Cancelled'
              );

              return (
                <Card key={ot.id} className="border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden bg-white">
                  <CardHeader className="p-4 pb-3 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          ot.status === 'Occupied' || isLive ? 'bg-rose-500 animate-pulse' :
                          ot.status === 'Cleaning' ? 'bg-amber-400' :
                          ot.status === 'Maintenance' ? 'bg-slate-400' :
                          'bg-emerald-500'
                        }`} />
                        <CardTitle className="text-base font-extrabold text-slate-900">{ot.name}</CardTitle>
                      </div>
                      
                      {/* Room Status Selector */}
                      <select
                        value={ot.status || 'Available'}
                        onChange={(e) => {
                          const newStatus = e.target.value as any;
                          const updated = theatres.map(t => t.id === ot.id ? { ...t, status: newStatus } : t);
                          setTheatres(updated);
                          storage.set('hms_ot_theatres', updated);
                          toast.success(`${ot.name} marked as ${newStatus}`);
                        }}
                        className={`text-[11px] font-black uppercase px-2 py-0.5 rounded-md border cursor-pointer ${
                          ot.status === 'Occupied' || isLive ? 'bg-rose-50 text-rose-800 border-rose-200' :
                          ot.status === 'Cleaning' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                          ot.status === 'Maintenance' ? 'bg-slate-100 text-slate-700 border-slate-300' :
                          'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        <option value="Available">Available</option>
                        <option value="Occupied">Occupied (In-Surgery)</option>
                        <option value="Cleaning">Cleaning / Sanitizing</option>
                        <option value="Maintenance">Maintenance</option>
                      </select>
                    </div>
                    <CardDescription className="text-[11px] uppercase font-bold tracking-wider text-slate-500 mt-1">
                      {ot.type || 'General'} Surgical Suite • Floor {ot.floor || '2'}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    {isLive || activeOp ? (
                      <div className="space-y-3">
                        <div className="p-3.5 rounded-xl bg-gradient-to-br from-rose-50/70 to-amber-50/50 border border-rose-200/80 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                              Active Surgical Case
                            </span>
                            <Badge className="bg-rose-100 text-rose-900 border-rose-300 text-[10px] font-black uppercase">
                              {activeOp?.status || 'In-Progress'}
                            </Badge>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-extrabold text-slate-900 leading-snug">
                              {activeOp?.operationName || 'Surgical Procedure'}
                            </h4>
                            <p className="text-xs font-bold text-slate-700 mt-1 flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-medical-blue" />
                              {opPatient ? `${opPatient.name} (${opPatient.mrn || 'N/A'})` : 'Scheduled Patient'}
                              {opPatient?.age && <span className="text-slate-400 font-normal">• {opPatient.age}y/{opPatient.gender || 'M'}</span>}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-rose-100/80">
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold uppercase block">Surgeon:</span>
                              <span className="font-bold text-slate-800">{opSurgeon?.name || 'Assigned Surgeon'}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold uppercase block">Start Time:</span>
                              <span className="font-bold text-slate-800">{activeOp?.startTime || activeOp?.time || '10:00 AM'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            className="bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs h-8 gap-1"
                            onClick={() => {
                              if (activeOp) setChecklistRecord(activeOp);
                            }}
                          >
                            <ClipboardCheck className="w-3.5 h-3.5" />
                            WHO Checklist
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-blue-200 text-blue-800 hover:bg-blue-50 font-bold text-xs h-8 gap-1"
                            onClick={() => {
                              if (activeOp) setClinicalWorkflowRecord(activeOp);
                            }}
                          >
                            <Activity className="w-3.5 h-3.5" />
                            Clinical Flow
                          </Button>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs font-bold h-7.5 border-slate-200 text-slate-700 hover:bg-slate-100"
                          onClick={() => {
                            if (activeOp) {
                              const updatedRecords = records.map(r => r.id === activeOp.id ? { ...r, status: 'Completed' } : r);
                              setRecords(updatedRecords);
                              storage.set('hms_ot_records', updatedRecords);
                              storage.set('hms_ot_schedules', updatedRecords);
                            }
                            const updatedTheatres = theatres.map(t => t.id === ot.id ? { ...t, status: 'Cleaning' } : t);
                            setTheatres(updatedTheatres);
                            storage.set('hms_ot_theatres', updatedTheatres);
                            toast.success(`Surgery marked completed. ${ot.name} set to Cleaning.`);
                          }}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                          Complete Procedure & Release OT
                        </Button>
                      </div>
                    ) : (
                      <div className="py-5 flex flex-col items-center justify-center text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-800">Sterile & Ready for Procedure</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Room equipped with full anesthesia and monitoring gear</p>
                        </div>

                        {upcomingForThisOT.length > 0 && (
                          <div className="w-full text-left bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[11px] space-y-1">
                            <span className="font-bold text-slate-600 block text-[10px] uppercase">Next Scheduled Surgery:</span>
                            <div className="flex justify-between items-center font-bold text-slate-800">
                              <span>{upcomingForThisOT[0].operationName}</span>
                              <span className="text-medical-blue">{upcomingForThisOT[0].startTime || '14:00'}</span>
                            </div>
                          </div>
                        )}

                        {currentUser?.role !== 'DOCTOR' ? (
                          <Button 
                            size="sm" 
                            className="bg-medical-blue hover:bg-medical-blue/90 h-8 text-xs font-bold gap-1 px-4 w-full"
                            onClick={() => {
                              setNewOp(prev => ({ ...prev, theatreId: ot.id }));
                              setIsScheduleOpen(true);
                            }}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Book This Theatre
                          </Button>
                        ) : (
                          <p className="text-xs text-slate-400 italic">Ready for next case</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="records" className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search by patient name, MRN, surgeon or procedure..." 
                className="pl-10 h-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-bold h-10 gap-1"
                onClick={() => {
                  setRecords(MOCK_OPERATION_RECORDS);
                  storage.set('hms_ot_records', MOCK_OPERATION_RECORDS);
                  storage.set('hms_ot_schedules', MOCK_OPERATION_RECORDS);
                  toast.success('Restored default operation schedules');
                }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Sample Data
              </Button>
              {currentUser?.role !== 'DOCTOR' && (
                <Button
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-600 text-amber-950 font-extrabold text-xs h-10 gap-1.5 px-4"
                  onClick={() => setIsScheduleOpen(true)}
                >
                  <Plus className="w-4 h-4" />
                  Schedule Operation
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredRecords.length > 0 ? filteredRecords.map((record) => {
              const patient = patients.find(p => p.id === record.patientId);
              const surgeon = staff.find(u => u.id === record.surgeonId);
              const theatre = theatres.find(t => t.id === record.theatreId);
              const checklistInfo = surgicalChecklists[record.id];

              return (
                <Card key={record.id} className="border-none shadow-sm overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    <div className="p-6 flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="w-12 h-12 rounded-xl">
                            <AvatarFallback className="bg-slate-100 text-medical-blue font-bold text-lg rounded-xl">
                              {patient?.name?.charAt(0) || 'P'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-bold text-lg text-slate-800 leading-none">{record.operationName}</h3>
                              {checklistInfo && (
                                <Badge variant="outline" className={`text-[10px] h-5 font-black tracking-tight ${
                                  checklistInfo.percentComplete === 100 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                  WHO Safety Checklist: {checklistInfo.percentComplete}%
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                              <span className="text-slate-900">{patient?.name || 'Unknown Patient'}</span>
                              <span>•</span>
                              <span>{patient?.mrn || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="outline" className={`font-bold uppercase tracking-tighter px-3 h-7 ${getStatusColor(record.status)}`}>
                            {record.status}
                          </Badge>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-medical-blue hover:bg-blue-50"
                              onClick={async () => {
                                const newOpName = window.prompt("Edit Operation Name:", record.operationName);
                                if (newOpName && newOpName !== record.operationName) {
                                  const result = await supabaseService.updateOTSchedule(record.id, { operationName: newOpName });
                                  if (result) {
                                    setRecords(records.map((r: any) => r.id === record.id ? { ...r, operationName: newOpName } : r));
                                    toast.success("OT Schedule updated successfully");
                                  } else {
                                    toast.error("Failed to update OT Schedule");
                                  }
                                }
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            {!isDeleteForbidden && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-50" onClick={() => handleDeleteRecord(record.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-6 px-1">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Surgeon</p>
                          <div className="flex items-center gap-2 text-slate-700">
                            <User className="w-3.5 h-3.5 text-medical-blue" />
                            <p className="text-sm font-semibold">{surgeon?.name || 'Not Assigned'}</p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Theatre</p>
                          <div className="flex items-center gap-2 text-slate-700">
                            <Scissors className="w-3.5 h-3.5 text-medical-blue" />
                            <p className="text-sm font-semibold">{theatre?.name || 'OT Unit'}</p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Schedule</p>
                          <div className="flex items-center gap-2 text-slate-700">
                            <Clock className="w-3.5 h-3.5 text-medical-blue" />
                            <p className="text-sm font-semibold">{record.date || record.scheduled_date} | {record.startTime || record.scheduled_time}</p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Clinical Data</p>
                          <div className="flex items-center gap-2 text-slate-700">
                            <ImageIcon className="w-3.5 h-3.5 text-medical-blue" />
                            <p className="text-sm font-semibold">{record.documents?.length || 0} Media Files</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 border-t border-slate-50 pt-4 mt-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2 font-medium h-9 px-4 border-slate-200" onClick={() => setSelectedRecord(record)}>
                              <Eye className="w-4 h-4" />
                              View Records & Media
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
                            <DialogHeader className="p-6 bg-white border-b sticky top-0 z-10">
                              <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                  <DialogTitle className="text-2xl font-bold text-slate-800">{record.operationName}</DialogTitle>
                                  <p className="text-sm text-muted-foreground font-medium">Patient: {patient?.name} | MRN: {patient?.mrn}</p>
                                </div>
                                <Badge variant="outline" className={`font-bold uppercase h-8 px-4 ${getStatusColor(record.status)}`}>{record.status}</Badge>
                              </div>
                            </DialogHeader>
                            
                            <ScrollArea className="flex-1 p-6">
                              <div className="space-y-10">
                                <section>
                                  <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Clinical Media & Documents</h4>
                                    <Button variant="outline" size="sm" className="text-xs gap-2 border-slate-200" onClick={() => {
                                      setSelectedRecord(record);
                                      setIsUploadDialogOpen(true);
                                    }}>
                                      <Plus className="w-3.5 h-3.5" />
                                      Upload Media
                                    </Button>
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {record.documents?.map((doc: any) => (
                                      <div key={doc.id} className="group relative aspect-square rounded-2xl bg-slate-50 overflow-hidden border border-slate-100 transition-all hover:ring-2 hover:ring-medical-blue/20">
                                        {doc.type === 'Photo' ? (
                                          <img src={doc.url} alt={doc.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                        ) : doc.type === 'Video' ? (
                                          <div className="w-full h-full flex items-center justify-center bg-slate-900">
                                            <Video className="w-8 h-8 text-white opacity-50" />
                                          </div>
                                        ) : (
                                          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                                            <FileText className="w-10 h-10 text-slate-200 mb-2" />
                                            <p className="text-[10px] font-bold uppercase tracking-tight truncate w-full text-slate-400">{doc.name}</p>
                                          </div>
                                        )}
                                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3">
                                          <Button 
                                            size="icon" 
                                            variant="ghost" 
                                            className="text-white hover:bg-white/20 rounded-full h-10 w-10 cursor-pointer"
                                            onClick={() => doc.url && window.open(doc.url, '_blank')}
                                            title="View / Open Media"
                                          >
                                            <Eye className="w-5 h-5" />
                                          </Button>
                                          <Button 
                                            size="icon" 
                                            variant="ghost" 
                                            className="text-white hover:bg-white/20 rounded-full h-10 w-10 cursor-pointer"
                                            onClick={() => handleDownloadOTMedia(doc)}
                                            title="Download File"
                                          >
                                            <Download className="w-5 h-5" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                    {(!record.documents || record.documents.length === 0) && (
                                      <div 
                                        className="aspect-square rounded-2xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-slate-50 transition-all hover:border-medical-blue/40 group col-span-full py-12"
                                        onClick={() => {
                                        setSelectedRecord(record);
                                        setIsUploadDialogOpen(true);
                                      }}
                                      >
                                        <div className="p-4 rounded-full bg-slate-50 group-hover:bg-medical-blue/10 group-hover:text-medical-blue transition-all">
                                          <ImageIcon className="w-8 h-8 text-slate-300 group-hover:text-medical-blue" />
                                        </div>
                                        <p className="text-sm font-bold text-slate-400">No clinical media attached yet</p>
                                        <Button variant="ghost" size="sm" className="text-medical-blue hover:text-medical-blue h-8">Add Pre-Op Files</Button>
                                      </div>
                                    )}
                                  </div>
                                </section>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                  <div className="lg:col-span-2 space-y-6">
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Clinical Notes</h4>
                                    <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 min-h-[160px] relative">
                                      <p className="text-sm text-slate-600 font-medium leading-relaxed italic">
                                        {record.notes || "No clinical observations recorded for this procedure yet. Please ensure post-operative notes are updated within 24 hours."}
                                      </p>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="absolute top-4 right-4 h-8 text-medical-blue hover:bg-blue-100"
                                        onClick={async () => {
                                          const newNotes = window.prompt("Edit Clinical Notes:", record.notes || "");
                                          if (newNotes !== null && newNotes !== record.notes) {
                                            const result = await supabaseService.updateOTSchedule(record.id, { notes: newNotes });
                                            if (result) {
                                              setRecords(records.map((r: any) => r.id === record.id ? { ...r, notes: newNotes } : r));
                                              toast.success("Notes updated successfully");
                                            } else {
                                              toast.error("Failed to update Notes");
                                            }
                                          }
                                        }}
                                      >
                                        <Edit className="w-3.5 h-3.5 mr-1" />
                                        Edit Notes
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="space-y-6">
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Teams Involved</h4>
                                    <div className="space-y-4">
                                      <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                          <AvatarFallback className="bg-blue-100 text-blue-700 font-bold text-xs">
                                            {surgeon?.name?.charAt(0) || 'S'}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div>
                                          <p className="text-sm font-bold text-slate-800">{surgeon?.name || 'Assigning...'}</p>
                                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Lead Surgeon</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </ScrollArea>
                            
                            <DialogFooter className="p-6 border-t bg-slate-50/30 flex-row items-center gap-3">
                              <DialogTrigger asChild>
                                <Button variant="outline" className="font-bold border-slate-200">
                                  Close
                                </Button>
                              </DialogTrigger>
                              <div className="flex-1" />
                              <Button variant="outline" className="gap-2 font-bold border-slate-200 h-10">
                                <FileText className="w-4 h-4" />
                                Generate OT Report
                              </Button>
                              <Button className="bg-medical-blue gap-2 font-bold h-10 px-6">
                                <Upload className="w-4 h-4" />
                                Add Documents
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="gap-2 text-[#1A5E63] hover:text-[#1A5E63] hover:bg-[#1A5E63]/10 font-bold h-9 border border-[#1A5E63]/20 bg-[#1A5E63]/5"
                          onClick={() => setClinicalWorkflowRecord(record)}
                        >
                          <Activity className="w-4 h-4" />
                          Clinical Workflow
                        </Button>
                        
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className={`gap-2 font-bold h-9 border ${
                            checklistInfo ? 
                              checklistInfo.percentComplete === 100 ? 
                                'text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-200' : 
                                'text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-200' : 
                              'text-medical-blue hover:text-medical-blue hover:bg-blue-50 border-slate-200'
                          }`}
                          onClick={() => setChecklistRecord({ ...record, surgeonName: surgeon?.name || 'Not Assigned' })}
                        >
                          <FileText className="w-4 h-4" />
                          {checklistInfo ? `Checklist (${checklistInfo.percentComplete}%)` : 'Surgical Checklist'}
                        </Button>

                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="gap-2 text-teal-700 hover:text-teal-800 hover:bg-teal-50 font-bold h-9 border border-teal-200 bg-teal-50/50"
                          onClick={() => setPostOpRecord({ ...record, surgeonName: surgeon?.name || 'Not Assigned' })}
                        >
                          <FileText className="w-4 h-4 text-teal-600" />
                          Post-Op Care Forms
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            }) : (
              <div className="py-20 text-center bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">
                <FileText className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-400">No Operation Records Found</h3>
                <p className="text-sm text-slate-400 mt-1">Try adjusting your search filters or schedule a new procedure.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="safety-checklist" className="mt-6 space-y-6">
          {/* Top Header Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-6 rounded-3xl shadow-lg border border-emerald-900/50 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500/30 text-emerald-300 border-emerald-400/30 font-extrabold text-xs">
                  MANDATORY WHO PROTOCOL
                </Badge>
                <span className="text-xs text-emerald-200/80 font-medium">• Operating Theatre Patient Safety SOP</span>
              </div>
              <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
                <ClipboardCheck className="w-7 h-7 text-emerald-400" />
                Pre-Operative & Surgical Safety Checklist Hub
              </h2>
              <p className="text-xs text-emerald-100 max-w-2xl font-medium leading-relaxed">
                Execute mandatory WHO Pre-Op Safety Checklists (Sign In before induction, Time Out before skin incision, and Sign Out before patient leaves OT) for all surgical candidates.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold text-xs h-10 gap-2"
                onClick={() => {
                  const dummyRec = {
                    id: `blank-preop-chk-${Date.now()}`,
                    operationName: 'Standard Surgical Safety Checklist',
                    surgeonName: doctors[0]?.name || 'Surgeon In-Charge',
                    scheduled_date: new Date().toISOString().substring(0, 10),
                    patientId: patients[0]?.id || 'P-101'
                  };
                  setChecklistRecord(dummyRec);
                }}
              >
                <Printer className="w-4 h-4 text-emerald-300" />
                Print Pre-Op Checklist Form
              </Button>
            </div>
          </div>

          {/* Quick Patient Selector Bar */}
          <Card className="border-emerald-200 bg-emerald-50/50 shadow-xs rounded-2xl">
            <CardContent className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-700 text-white shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Direct Patient Pre-Op Checklist Access</h3>
                  <p className="text-xs text-slate-500">Select any patient from hospital records to immediately complete or print their WHO Pre-Op Checklist</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Select
                  onValueChange={(pId) => {
                    const foundPat = patients.find(p => p.id === pId);
                    if (foundPat) {
                      const customRec = {
                        id: `preop-chk-${foundPat.id}`,
                        operationName: `Pre-Op Surgical Checklist (${foundPat.name})`,
                        surgeonName: doctors[0]?.name || 'Dr. Surgeon',
                        scheduled_date: new Date().toISOString().substring(0, 10),
                        patientId: foundPat.id
                      };
                      setChecklistRecord(customRec);
                    }
                  }}
                >
                  <SelectTrigger className="w-[280px] bg-white border-slate-300 h-9 text-xs font-bold shadow-xs">
                    <SelectValue placeholder="Select patient..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[240px]">
                    {patients.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.mrn || p.uhid || p.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* OT Surgeries & Pre-Op Safety Checklist Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-700" />
                OT Scheduled Procedures & Checklist Completion Status
              </h3>
              <Badge variant="outline" className="font-bold text-xs bg-slate-100">
                {records.length} OT Procedures
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {records.map((record) => {
                const patient = patients.find(p => p.id === (record.patientId || record.patient_id));
                const surgeon = staff.find(u => u.id === record.surgeonId);
                const checklistInfo = surgicalChecklists[record.id];

                return (
                  <Card key={record.id} className="border-slate-200 shadow-sm hover:border-emerald-400 transition-all rounded-2xl overflow-hidden bg-white">
                    <CardHeader className="p-4 pb-3 bg-slate-50/70 border-b border-slate-100">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Badge className={`text-[10px] font-black px-2.5 py-0.5 mb-1.5 ${
                            checklistInfo?.percentComplete === 100 
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300' 
                              : checklistInfo?.percentComplete > 0
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            Pre-Op Checklist Status: {checklistInfo ? `${checklistInfo.percentComplete}% Completed` : 'Not Started (0%)'}
                          </Badge>
                          <CardTitle className="text-base font-bold text-slate-900">{record.operationName}</CardTitle>
                          <CardDescription className="text-xs font-semibold text-slate-600 mt-0.5">
                            Patient: <span className="font-bold text-slate-900">{patient?.name || 'Patient'}</span> • UHID/MRN: {patient?.mrn || patient?.uhid || 'N/A'}
                          </CardDescription>
                        </div>

                        <Badge variant="outline" className={`text-[10px] font-bold shrink-0 ${
                          record.status === 'Completed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                          record.status === 'In Progress' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                          'bg-blue-50 text-blue-800 border-blue-200'
                        }`}>
                          {record.status}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Surgeon</span>
                          <span className="font-bold text-slate-800">{surgeon?.name || record.surgeonName || 'Surgeon In-Charge'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Date & Time</span>
                          <span className="font-bold text-slate-800">{record.date || record.scheduled_date} • {record.startTime || record.scheduled_time || 'Scheduled'}</span>
                        </div>
                      </div>

                      {/* Phase Indicators */}
                      <div className="grid grid-cols-3 gap-1.5 text-[10px] font-extrabold text-center">
                        <div className={`p-1.5 rounded-lg border ${
                          checklistInfo?.signInChecks && Object.values(checklistInfo.signInChecks).some(v => v === true)
                            ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          1. SIGN IN (Pre-Op)
                        </div>
                        <div className={`p-1.5 rounded-lg border ${
                          checklistInfo?.timeOutChecks && Object.values(checklistInfo.timeOutChecks).some(v => v === true)
                            ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          2. TIME OUT
                        </div>
                        <div className={`p-1.5 rounded-lg border ${
                          checklistInfo?.signOutChecks && Object.values(checklistInfo.signOutChecks).some(v => v === true)
                            ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          3. SIGN OUT
                        </div>
                      </div>

                      <div className="pt-1 flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          className="bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs h-9 gap-1.5 px-4 shadow-sm"
                          onClick={() => setChecklistRecord({ ...record, surgeonName: surgeon?.name || record.surgeonName || 'Surgeon In-Charge' })}
                        >
                          <ClipboardCheck className="w-4 h-4" />
                          Open Pre-Op Checklist
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {records.length === 0 && (
                <div className="col-span-full py-12 text-center bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                  <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-600">No active OT procedures scheduled yet</p>
                  <p className="text-xs text-slate-400 mt-0.5">Use the Direct Patient Lookup dropdown above to open a Pre-Op Checklist for any patient.</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preop" className="mt-6">
          <PreOpOrders />
        </TabsContent>

        <TabsContent value="carewell-ot-summary" className="mt-6">
          <CarewellOTSummaryComponent />
        </TabsContent>

        <TabsContent value="carewell-preop-orders" className="mt-6">
          <CarewellPreOpOrdersComponent />
        </TabsContent>

        <TabsContent value="postop" className="mt-6">
          <PostOpForms />
        </TabsContent>

        <TabsContent value="inventory" className="mt-6">
          <OTInventory />
        </TabsContent>

        <TabsContent value="consents" className="mt-6">
          <OTConsentManagement />
        </TabsContent>

        <TabsContent value="ot-biopsy" className="mt-6">
          <OTBiopsyForm />
        </TabsContent>

        <TabsContent value="ot-pharmacy" className="mt-6">
          <OTPharmacyRequisitionComponent />
        </TabsContent>

        <TabsContent value="infection" className="mt-6">
          <OTInfectionControlRegisters />
        </TabsContent>
      </Tabs>

      {/* Clinical Workflow Dialog */}
      <Dialog open={!!clinicalWorkflowRecord} onOpenChange={(open) => !open && setClinicalWorkflowRecord(null)}>
        <DialogContent 
          showCloseButton={false}
          className={
            isWorkflowFullscreen
              ? "fixed inset-0 top-0 left-0 translate-x-0 translate-y-0 w-screen h-screen max-w-none sm:max-w-none md:max-w-none lg:max-w-none xl:max-w-none max-h-screen rounded-none z-50 flex flex-col p-0 overflow-hidden bg-white border-none shadow-none m-0"
              : "w-[98vw] max-w-[98vw] sm:max-w-[98vw] md:max-w-[98vw] lg:max-w-[98vw] xl:max-w-[1600px] h-[95vh] max-h-[95vh] flex flex-col p-0 overflow-hidden rounded-2xl border-none shadow-2xl bg-white"
          }
        >
          <DialogHeader className="p-6 bg-white border-b sticky top-0 z-10">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-xl font-extrabold text-slate-800 truncate">
                  Clinical Procedure File: {clinicalWorkflowRecord?.operationName}
                </DialogTitle>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  Patient Name: <span className="text-slate-800 font-bold">{patients.find(p => p.id === (clinicalWorkflowRecord?.patientId || clinicalWorkflowRecord?.patient_id))?.name || 'N/A'}</span> • 
                  Surgeon: <span className="text-slate-800 font-bold">{staff.find(s => s.id === clinicalWorkflowRecord?.surgeonId)?.name || 'N/A'}</span>
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className={`font-bold uppercase h-7 px-3 text-[10px] ${
                  clinicalWorkflowRecord?.status === 'Completed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                  clinicalWorkflowRecord?.status === 'In Progress' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                  'bg-blue-50 text-blue-800 border-blue-200'
                }`}>
                  {clinicalWorkflowRecord?.status}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsWorkflowFullscreen(!isWorkflowFullscreen)}
                  className="h-8 gap-1.5 text-xs font-semibold px-2.5"
                  title={isWorkflowFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                >
                  {isWorkflowFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{isWorkflowFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setClinicalWorkflowRecord(null)}
                  className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700 font-bold text-base"
                >
                  ✕
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 p-6 overflow-y-auto bg-white">
            {clinicalWorkflowRecord && (
              <OTClinicalRecords
                record={clinicalWorkflowRecord}
                patient={patients.find(p => p.id === (clinicalWorkflowRecord.patientId || clinicalWorkflowRecord.patient_id)) || {}}
                surgeonName={staff.find(s => s.id === clinicalWorkflowRecord.surgeonId)?.name || 'Not Assigned'}
                onClose={() => setClinicalWorkflowRecord(null)}
                onSaveNotes={async (newNotes) => {
                  const result = await supabaseService.updateOTSchedule(clinicalWorkflowRecord.id, {
                    ...clinicalWorkflowRecord,
                    notes: newNotes
                  });
                  if (result) {
                    setClinicalWorkflowRecord(result);
                    setRecords(prev => prev.map(r => r.id === clinicalWorkflowRecord.id ? result : r));
                    const currentList = storage.get('hms_ot_schedules', []);
                    const updatedList = currentList.map((r: any) => r.id === clinicalWorkflowRecord.id ? result : r);
                    storage.set('hms_ot_schedules', updatedList);
                    toast.success('Notes saved successfully');
                  } else {
                    toast.error('Failed to save notes');
                  }
                }}
              />
            )}
          </div>
          <DialogFooter className="p-4 px-6 border-t bg-slate-50 flex-row justify-end items-center">
            <Button variant="outline" onClick={() => setClinicalWorkflowRecord(null)} className="font-bold text-xs">
              Close Procedure File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Upload Operation Media</DialogTitle>
            <DialogDescription>
              Attach photos, videos or documents to the operation record.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFileUpload} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="file-name">File Name</Label>
              <Input 
                id="file-name" 
                placeholder="e.g. Pre-op X-ray" 
                value={newDocName}
                onChange={(e) => setNewDocName(e.target.value)}
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="file-type">File Type</Label>
              <Select value={newDocType} onValueChange={(v) => setNewDocType(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Photo">Photo</SelectItem>
                  <SelectItem value="Video">Video</SelectItem>
                  <SelectItem value="Document">Document</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Select File</Label>
              <input 
                type="file" 
                id="media-file-input" 
                className="hidden" 
                onChange={handleFileSelect} 
                accept="image/*,video/*,application/pdf"
              />
              <div 
                className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer text-center"
                onClick={() => document.getElementById('media-file-input')?.click()}
              >
                <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                {selectedFile ? (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-medical-blue truncate max-w-[280px]">{selectedFile.name}</p>
                    <p className="text-[10px] text-slate-400">({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)</p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-medium text-slate-500">Click to browse or drag & drop</p>
                    <p className="text-[10px] text-slate-400">PNG, JPG, MP4 or PDF (max 50MB)</p>
                  </>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsUploadDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-medical-blue">Upload File</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {checklistRecord && (
        <SurgicalSafetyChecklist
          record={checklistRecord}
          patient={patients.find(p => p.id === (checklistRecord.patientId || checklistRecord.patient_id))}
          onClose={() => setChecklistRecord(null)}
          onSave={() => {
            const saved = storage.get('hms_ot_surgical_checklists', {});
            setSurgicalChecklists(saved);
          }}
        />
      )}

      {postOpRecord && (
        <Dialog open={!!postOpRecord} onOpenChange={() => setPostOpRecord(null)}>
          <DialogContent className="fixed inset-0 top-0 left-0 translate-x-0 translate-y-0 w-screen h-screen max-w-none max-h-none sm:max-w-none rounded-none m-0 p-0 flex flex-col bg-slate-50 overflow-y-auto border-none shadow-none z-50">
            <PostOpForms
              record={postOpRecord}
              patient={patients.find(p => p.id === (postOpRecord.patientId || postOpRecord.patient_id))}
              onClose={() => setPostOpRecord(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Added Avatar component for UI consistency
const Avatar = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={`relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full ${className}`}>
    {children}
  </div>
);

const AvatarFallback = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={`flex h-full w-full items-center justify-center rounded-full bg-muted ${className}`}>
    {children}
  </div>
);

