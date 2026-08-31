import React, { useState, useEffect } from 'react';
import { 
  FolderArchive, 
  Search, 
  Plus, 
  Filter, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowRightLeft, 
  MapPin, 
  ShieldAlert, 
  Tag, 
  Download, 
  Printer, 
  Calendar, 
  User, 
  Building2, 
  Hash, 
  BookOpen, 
  QrCode, 
  Check, 
  X, 
  Edit3, 
  Eye, 
  Archive,
  FileCheck,
  History,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { storage, STORAGE_KEYS } from '@/lib/storage';

interface MRDRecord {
  id: string;
  mrn: string;
  patientName: string;
  age: number | string;
  gender: string;
  phone: string;
  fileType: 'IPD' | 'OPD' | 'MLC' | 'EMERGENCY' | 'DAYCARE';
  admissionDate?: string;
  dischargeDate?: string;
  department: string;
  attendingDoctor: string;
  
  // Physical Storage Tracking
  rackNumber: string;
  shelfNumber: string;
  boxFolderId: string;
  fileBarcode: string;
  
  // MRD Coding & Completeness
  icd10Code?: string;
  icd10Description?: string;
  isCompletedByDoctor: boolean;
  hasDischargeSummary: boolean;
  hasConsentForm: boolean;
  hasOperativeNotes: boolean;
  mrdStatus: 'PENDING_INDEXING' | 'ARCHIVED' | 'ISSUED' | 'DISPOSED';
  
  // Medico-Legal details
  isMLC: boolean;
  mlcNumber?: string;
  policeStation?: string;
  
  // Movement History & Active Checkout
  activeIssue?: {
    issuedTo: string;
    departmentOrOrg: string;
    purpose: 'OPD_CONSULT' | 'READMISSION' | 'COURT_LEGAL' | 'INSURANCE_AUDIT' | 'RESEARCH' | 'PATIENT_COPY';
    issuedDate: string;
    expectedReturnDate: string;
    issuedBy: string;
    remarks?: string;
  };
  issueHistory: Array<{
    id: string;
    issuedTo: string;
    purpose: string;
    issuedDate: string;
    returnedDate?: string;
    issuedBy: string;
    returnedTo?: string;
  }>;
}

const INITIAL_MRD_RECORDS: MRDRecord[] = [
  {
    id: 'mrd-101',
    mrn: 'MRN-2026-001',
    patientName: 'Ramesh Chandra Verma',
    age: 48,
    gender: 'Male',
    phone: '+91 98765 43210',
    fileType: 'IPD',
    admissionDate: '2026-07-15',
    dischargeDate: '2026-07-20',
    department: 'Gastroenterology',
    attendingDoctor: 'Dr. Rajesh Sharma',
    rackNumber: 'RACK-A3',
    shelfNumber: 'SHELF-02',
    boxFolderId: 'BOX-2026-088',
    fileBarcode: 'MRD88201',
    icd10Code: 'K80.20',
    icd10Description: 'Calculus of gallbladder without cholecystitis',
    isCompletedByDoctor: true,
    hasDischargeSummary: true,
    hasConsentForm: true,
    hasOperativeNotes: true,
    mrdStatus: 'ARCHIVED',
    isMLC: false,
    issueHistory: [
      {
        id: 'hist-1',
        issuedTo: 'Dr. Rajesh Sharma',
        purpose: 'OPD Follow-up',
        issuedDate: '2026-07-22',
        returnedDate: '2026-07-22',
        issuedBy: 'MRD Clerk Anita',
        returnedTo: 'MRD Clerk Anita'
      }
    ]
  },
  {
    id: 'mrd-102',
    mrn: 'MRN-2026-045',
    patientName: 'Sunita Devi',
    age: 36,
    gender: 'Female',
    phone: '+91 87654 32109',
    fileType: 'MLC',
    admissionDate: '2026-07-18',
    dischargeDate: '2026-07-24',
    department: 'General Surgery',
    attendingDoctor: 'Dr. Vikramaditya',
    rackNumber: 'RACK-MLC1',
    shelfNumber: 'SHELF-01',
    boxFolderId: 'BOX-MLC-2026',
    fileBarcode: 'MLC2026-045',
    icd10Code: 'S36.1',
    icd10Description: 'Injury of liver or gallbladder',
    isCompletedByDoctor: true,
    hasDischargeSummary: true,
    hasConsentForm: true,
    hasOperativeNotes: true,
    mrdStatus: 'ISSUED',
    isMLC: true,
    mlcNumber: 'MLC/2026/892',
    policeStation: 'Kotwali City Police Station',
    activeIssue: {
      issuedTo: 'Advocate Verma / District Court',
      departmentOrOrg: 'District Legal Authority',
      purpose: 'COURT_LEGAL',
      issuedDate: '2026-07-28',
      expectedReturnDate: '2026-08-04',
      issuedBy: 'MRD Officer Suresh',
      remarks: 'Summoned for court hearing ref #302/2026'
    },
    issueHistory: []
  },
  {
    id: 'mrd-103',
    mrn: 'MRN-2026-092',
    patientName: 'Amit Kumar Dubey',
    age: 52,
    gender: 'Male',
    phone: '+91 91234 56789',
    fileType: 'IPD',
    admissionDate: '2026-07-25',
    dischargeDate: '2026-07-30',
    department: 'Cardiology',
    attendingDoctor: 'Dr. P. K. Mishra',
    rackNumber: 'RACK-B1',
    shelfNumber: 'SHELF-04',
    boxFolderId: 'BOX-PENDING',
    fileBarcode: 'MRD92304',
    icd10Code: '',
    icd10Description: '',
    isCompletedByDoctor: false,
    hasDischargeSummary: true,
    hasConsentForm: true,
    hasOperativeNotes: false,
    mrdStatus: 'PENDING_INDEXING',
    isMLC: false,
    issueHistory: []
  }
];

export default function MRDManagement() {
  const [records, setRecords] = useState<MRDRecord[]>(() => {
    return storage.get('hms_mrd_records', INITIAL_MRD_RECORDS);
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [fileTypeFilter, setFileTypeFilter] = useState('ALL');
  
  // Dialog states
  const [isAddFileDialogOpen, setIsAddFileDialogOpen] = useState(false);
  const [isCheckoutDialogOpen, setIsCheckoutDialogOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MRDRecord | null>(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);

  // New File Form State
  const [newRecord, setNewRecord] = useState<Partial<MRDRecord>>({
    fileType: 'IPD',
    rackNumber: 'RACK-A1',
    shelfNumber: 'SHELF-01',
    boxFolderId: 'BOX-2026-GENERAL',
    department: 'Gastroenterology',
    attendingDoctor: 'Dr. Rajesh Sharma',
    isCompletedByDoctor: true,
    hasDischargeSummary: true,
    hasConsentForm: true,
    hasOperativeNotes: true,
    isMLC: false,
    mrdStatus: 'ARCHIVED'
  });

  // Issue Form State
  const [checkoutForm, setCheckoutForm] = useState({
    issuedTo: '',
    departmentOrOrg: '',
    purpose: 'OPD_CONSULT' as const,
    expectedReturnDate: new Date(Date.now() + 7 * 86400000).toISOString().substring(0, 10),
    issuedBy: 'MRD Staff',
    remarks: ''
  });

  // Location edit state
  const [locationForm, setLocationForm] = useState({
    rackNumber: '',
    shelfNumber: '',
    boxFolderId: '',
    icd10Code: '',
    icd10Description: ''
  });

  useEffect(() => {
    storage.set('hms_mrd_records', records);
  }, [records]);

  // Derived Statistics
  const totalRecords = records.length;
  const archivedCount = records.filter(r => r.mrdStatus === 'ARCHIVED').length;
  const issuedCount = records.filter(r => r.mrdStatus === 'ISSUED').length;
  const pendingCount = records.filter(r => r.mrdStatus === 'PENDING_INDEXING').length;
  const mlcCount = records.filter(r => r.isMLC).length;

  const filteredRecords = records.filter(record => {
    const matchesSearch = 
      record.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.mrn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.fileBarcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.attendingDoctor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (record.icd10Code && record.icd10Code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (record.mlcNumber && record.mlcNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || record.mrdStatus === statusFilter;
    const matchesFileType = fileTypeFilter === 'ALL' || record.fileType === fileTypeFilter;

    return matchesSearch && matchesStatus && matchesFileType;
  });

  const handleCreateRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecord.mrn || !newRecord.patientName) {
      toast.error('MRN and Patient Name are required');
      return;
    }

    const created: MRDRecord = {
      id: `mrd-${Date.now()}`,
      mrn: newRecord.mrn.trim(),
      patientName: newRecord.patientName.trim(),
      age: newRecord.age || 'N/A',
      gender: newRecord.gender || 'Male',
      phone: newRecord.phone || '',
      fileType: (newRecord.fileType as any) || 'IPD',
      admissionDate: newRecord.admissionDate || new Date().toISOString().substring(0, 10),
      dischargeDate: newRecord.dischargeDate || new Date().toISOString().substring(0, 10),
      department: newRecord.department || 'General Medicine',
      attendingDoctor: newRecord.attendingDoctor || 'Duty Doctor',
      rackNumber: newRecord.rackNumber || 'RACK-A1',
      shelfNumber: newRecord.shelfNumber || 'SHELF-01',
      boxFolderId: newRecord.boxFolderId || 'BOX-UNSORTED',
      fileBarcode: newRecord.fileBarcode || `MRD${Math.floor(10000 + Math.random() * 90000)}`,
      icd10Code: newRecord.icd10Code || '',
      icd10Description: newRecord.icd10Description || '',
      isCompletedByDoctor: !!newRecord.isCompletedByDoctor,
      hasDischargeSummary: !!newRecord.hasDischargeSummary,
      hasConsentForm: !!newRecord.hasConsentForm,
      hasOperativeNotes: !!newRecord.hasOperativeNotes,
      mrdStatus: newRecord.icd10Code ? 'ARCHIVED' : 'PENDING_INDEXING',
      isMLC: !!newRecord.isMLC,
      mlcNumber: newRecord.mlcNumber || '',
      policeStation: newRecord.policeStation || '',
      issueHistory: []
    };

    setRecords([created, ...records]);
    setIsAddFileDialogOpen(false);
    toast.success(`MRD Record archived under Rack ${created.rackNumber}, Shelf ${created.shelfNumber}`);
    setNewRecord({
      fileType: 'IPD',
      rackNumber: 'RACK-A1',
      shelfNumber: 'SHELF-01',
      boxFolderId: 'BOX-2026-GENERAL',
      department: 'Gastroenterology',
      attendingDoctor: 'Dr. Rajesh Sharma',
      isCompletedByDoctor: true,
      hasDischargeSummary: true,
      hasConsentForm: true,
      hasOperativeNotes: true,
      isMLC: false,
      mrdStatus: 'ARCHIVED'
    });
  };

  const handleCheckoutRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    if (!checkoutForm.issuedTo) {
      toast.error('Please specify who the file is being issued to');
      return;
    }

    const updatedRecords = records.map(r => {
      if (r.id === selectedRecord.id) {
        return {
          ...r,
          mrdStatus: 'ISSUED' as const,
          activeIssue: {
            issuedTo: checkoutForm.issuedTo,
            departmentOrOrg: checkoutForm.departmentOrOrg || 'OPD / Clinic',
            purpose: checkoutForm.purpose,
            issuedDate: new Date().toISOString().substring(0, 10),
            expectedReturnDate: checkoutForm.expectedReturnDate,
            issuedBy: checkoutForm.issuedBy || 'MRD Clerk',
            remarks: checkoutForm.remarks
          }
        };
      }
      return r;
    });

    setRecords(updatedRecords);
    setIsCheckoutDialogOpen(false);
    toast.success(`Record #${selectedRecord.fileBarcode} issued to ${checkoutForm.issuedTo}`);
    setSelectedRecord(null);
  };

  const handleReturnRecord = (record: MRDRecord) => {
    if (!record.activeIssue) return;

    const newHistoryEntry = {
      id: `hist-${Date.now()}`,
      issuedTo: record.activeIssue.issuedTo,
      purpose: record.activeIssue.purpose,
      issuedDate: record.activeIssue.issuedDate,
      returnedDate: new Date().toISOString().substring(0, 10),
      issuedBy: record.activeIssue.issuedBy,
      returnedTo: 'MRD Desk'
    };

    const updatedRecords = records.map(r => {
      if (r.id === record.id) {
        return {
          ...r,
          mrdStatus: 'ARCHIVED' as const,
          activeIssue: undefined,
          issueHistory: [newHistoryEntry, ...r.issueHistory]
        };
      }
      return r;
    });

    setRecords(updatedRecords);
    toast.success(`Record #${record.fileBarcode} safely returned and archived back to ${record.rackNumber}!`);
  };

  const handleSaveLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    const updatedRecords = records.map(r => {
      if (r.id === selectedRecord.id) {
        const isCoded = locationForm.icd10Code && locationForm.icd10Code.trim() !== '';
        return {
          ...r,
          rackNumber: locationForm.rackNumber || r.rackNumber,
          shelfNumber: locationForm.shelfNumber || r.shelfNumber,
          boxFolderId: locationForm.boxFolderId || r.boxFolderId,
          icd10Code: locationForm.icd10Code,
          icd10Description: locationForm.icd10Description,
          mrdStatus: r.mrdStatus === 'PENDING_INDEXING' && isCoded ? ('ARCHIVED' as const) : r.mrdStatus
        };
      }
      return r;
    });

    setRecords(updatedRecords);
    setIsLocationModalOpen(false);
    toast.success('MRD physical rack index and ICD-10 coding updated!');
    setSelectedRecord(null);
  };

  const handleExportMRD = () => {
    try {
      const headers = [
        'File Barcode',
        'Patient MRN',
        'Patient Name',
        'Age',
        'Gender',
        'Contact Phone',
        'File Type',
        'Department',
        'Attending Doctor',
        'Admission Date',
        'Discharge Date',
        'Rack Number',
        'Shelf Number',
        'Box / Folder ID',
        'ICD-10 Code',
        'Diagnosis Description',
        'MRD Status',
        'Is Medico-Legal Case (MLC)',
        'MLC Number'
      ];

      const rows = filteredRecords.map(r => [
        r.fileBarcode,
        r.mrn,
        r.patientName,
        r.age,
        r.gender,
        r.phone || 'N/A',
        r.fileType,
        r.department,
        r.attendingDoctor,
        r.admissionDate,
        r.dischargeDate,
        r.rackNumber,
        r.shelfNumber,
        r.boxFolderId,
        r.icd10Code || 'N/A',
        r.icd10Description || 'N/A',
        r.mrdStatus,
        r.isMLC ? 'YES' : 'NO',
        r.mlcNumber || 'N/A'
      ]);

      const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MRD_Physical_Records_Register_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('MRD Physical Records register exported to CSV successfully!');
    } catch {
      toast.error('Failed to export MRD records');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto pb-24">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-800 p-6 rounded-2xl text-white shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FolderArchive className="w-8 h-8 text-emerald-300" />
            <h1 className="text-2xl font-black tracking-tight">Medical Records Department (MRD)</h1>
          </div>
          <p className="text-teal-100 text-xs md:text-sm">
            Centralized Physical File Rack Indexing, ICD-10 Clinical Coding, Movement Tracking & Chain of Custody Audit
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button 
            onClick={handleExportMRD}
            variant="outline"
            className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-4 h-10 shadow-sm border-white/30 cursor-pointer"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Export CSV
          </Button>
          <Button 
            onClick={() => setIsAddFileDialogOpen(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-4 h-10 shadow-md border border-emerald-300/30"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Index New Medical File
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase">Total Files Cataloged</p>
              <p className="text-2xl font-black text-slate-800 mt-1">{totalRecords}</p>
            </div>
            <div className="p-3 bg-teal-50 text-teal-700 rounded-xl">
              <Archive className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase">In Racks / Safe</p>
              <p className="text-2xl font-black text-emerald-700 mt-1">{archivedCount}</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
              <FileCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase">Checked Out / Issued</p>
              <p className="text-2xl font-black text-amber-700 mt-1">{issuedCount}</p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase">Pending Coding</p>
              <p className="text-2xl font-black text-rose-700 mt-1">{pendingCount}</p>
            </div>
            <div className="p-3 bg-rose-50 text-rose-700 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase">MLC Cases</p>
              <p className="text-2xl font-black text-indigo-700 mt-1">{mlcCount}</p>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Filter & Table Card */}
      <Card className="border-none shadow-sm bg-white">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold text-slate-800">Medical Record Archive & Movement Registry</CardTitle>
              <CardDescription className="text-xs text-slate-500">Search by Patient Name, MRN, Barcode, ICD-10 code, or Rack Location</CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <Input
                  placeholder="Search MRN / Patient / Barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-xs bg-slate-50 border-slate-200"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 h-9 text-xs bg-slate-50">
                  <SelectValue placeholder="Status Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="ARCHIVED">In Racks (Archived)</SelectItem>
                  <SelectItem value="ISSUED">Checked Out / Issued</SelectItem>
                  <SelectItem value="PENDING_INDEXING">Pending ICD Coding</SelectItem>
                </SelectContent>
              </Select>

              <Select value={fileTypeFilter} onValueChange={setFileTypeFilter}>
                <SelectTrigger className="w-32 h-9 text-xs bg-slate-50">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All File Types</SelectItem>
                  <SelectItem value="IPD">IPD Files</SelectItem>
                  <SelectItem value="OPD">OPD Files</SelectItem>
                  <SelectItem value="MLC">MLC (Medico-Legal)</SelectItem>
                  <SelectItem value="EMERGENCY">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <th className="py-3 px-4">Barcode / MRN</th>
                  <th className="py-3 px-4">Patient & Contact</th>
                  <th className="py-3 px-4">Department & Doctor</th>
                  <th className="py-3 px-4">Physical Rack Location</th>
                  <th className="py-3 px-4">ICD-10 Code</th>
                  <th className="py-3 px-4">MRD Status</th>
                  <th className="py-3 px-4">Current Location / Holder</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <FolderArchive className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="font-semibold">No medical records match your criteria.</p>
                      <p className="text-[11px]">Index a new physical file or reset search filters.</p>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((rec) => {
                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono">
                          <div className="flex items-center gap-1.5 font-bold text-teal-800">
                            <QrCode className="w-3.5 h-3.5 text-teal-600" />
                            {rec.fileBarcode}
                          </div>
                          <div className="text-[10px] text-slate-500 font-semibold">{rec.mrn}</div>
                          {rec.isMLC && (
                            <Badge variant="destructive" className="text-[9px] px-1.5 py-0 mt-1 font-bold">
                              MLC Case
                            </Badge>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{rec.patientName}</div>
                          <div className="text-[10px] text-slate-500">
                            {rec.age}Y / {rec.gender} • {rec.phone}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{rec.department}</div>
                          <div className="text-[10px] text-slate-500">{rec.attendingDoctor}</div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 font-bold text-slate-800">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                            {rec.rackNumber} / {rec.shelfNumber}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">{rec.boxFolderId}</div>
                        </td>

                        <td className="py-3 px-4">
                          {rec.icd10Code ? (
                            <div>
                              <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                                {rec.icd10Code}
                              </span>
                              <p className="text-[10px] text-slate-500 truncate max-w-[140px]" title={rec.icd10Description}>
                                {rec.icd10Description}
                              </p>
                            </div>
                          ) : (
                            <span className="text-[10px] text-rose-500 font-semibold italic">Uncoded</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {rec.mrdStatus === 'ARCHIVED' && (
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200 text-[10px]">
                              In Archive Racks
                            </Badge>
                          )}
                          {rec.mrdStatus === 'ISSUED' && (
                            <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100 border-amber-300 text-[10px]">
                              Checked Out
                            </Badge>
                          )}
                          {rec.mrdStatus === 'PENDING_INDEXING' && (
                            <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 border-rose-200 text-[10px]">
                              Pending Coding
                            </Badge>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {rec.activeIssue ? (
                            <div className="text-[11px] bg-amber-50 p-1.5 rounded border border-amber-200">
                              <p className="font-bold text-amber-900">{rec.activeIssue.issuedTo}</p>
                              <p className="text-[9px] text-amber-700">Due: {rec.activeIssue.expectedReturnDate}</p>
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-500">
                              MRD Archive Shelf
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900"
                            onClick={() => {
                              setSelectedRecord(rec);
                              setIsDetailViewOpen(true);
                            }}
                            title="View Record History & Checklist"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px] px-2"
                            onClick={() => {
                              setSelectedRecord(rec);
                              setLocationForm({
                                rackNumber: rec.rackNumber,
                                shelfNumber: rec.shelfNumber,
                                boxFolderId: rec.boxFolderId,
                                icd10Code: rec.icd10Code || '',
                                icd10Description: rec.icd10Description || ''
                              });
                              setIsLocationModalOpen(true);
                            }}
                            title="Edit Location & ICD-10 Coding"
                          >
                            <Edit3 className="w-3 h-3 mr-1" />
                            Rack / Code
                          </Button>

                          {rec.mrdStatus === 'ISSUED' ? (
                            <Button
                              size="sm"
                              className="h-7 text-[10px] px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                              onClick={() => handleReturnRecord(rec)}
                            >
                              <Check className="w-3 h-3 mr-1" />
                              Check In
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="h-7 text-[10px] px-2 bg-amber-600 hover:bg-amber-700 text-white font-bold"
                              onClick={() => {
                                setSelectedRecord(rec);
                                setIsCheckoutDialogOpen(true);
                              }}
                            >
                              <ArrowRightLeft className="w-3 h-3 mr-1" />
                              Checkout
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* DIALOG 1: Add/Index New File */}
      <Dialog open={isAddFileDialogOpen} onOpenChange={setIsAddFileDialogOpen}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FolderArchive className="w-5 h-5 text-teal-600" />
              Index New Physical File in MRD Archive
            </DialogTitle>
            <DialogDescription className="text-xs">
              Assign physical rack location, file barcode, ICD-10 codes, and clinical audit flags.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateRecord} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-700 font-bold">MRN / IPD Number *</Label>
                <Input
                  placeholder="e.g. MRN-2026-104"
                  value={newRecord.mrn || ''}
                  onChange={(e) => setNewRecord({ ...newRecord, mrn: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label className="text-slate-700 font-bold">Patient Name *</Label>
                <Input
                  placeholder="e.g. Smt. Kamala Devi"
                  value={newRecord.patientName || ''}
                  onChange={(e) => setNewRecord({ ...newRecord, patientName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-slate-700 font-bold">Age / Gender</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Age"
                    type="number"
                    value={newRecord.age || ''}
                    onChange={(e) => setNewRecord({ ...newRecord, age: e.target.value })}
                  />
                  <Select 
                    value={newRecord.gender || 'Male'} 
                    onValueChange={(val) => setNewRecord({ ...newRecord, gender: val })}
                  >
                    <SelectTrigger className="w-24">
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
              <div>
                <Label className="text-slate-700 font-bold">File Category</Label>
                <Select 
                  value={newRecord.fileType || 'IPD'} 
                  onValueChange={(val: any) => setNewRecord({ ...newRecord, fileType: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IPD">Inpatient (IPD)</SelectItem>
                    <SelectItem value="OPD">Outpatient (OPD)</SelectItem>
                    <SelectItem value="MLC">Medico-Legal (MLC)</SelectItem>
                    <SelectItem value="EMERGENCY">Emergency</SelectItem>
                    <SelectItem value="DAYCARE">Daycare</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-700 font-bold">Department</Label>
                <Input
                  placeholder="e.g. Gastroenterology"
                  value={newRecord.department || ''}
                  onChange={(e) => setNewRecord({ ...newRecord, department: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <Label className="text-slate-700 font-bold">Rack Number *</Label>
                <Input
                  placeholder="e.g. RACK-A2"
                  value={newRecord.rackNumber || ''}
                  onChange={(e) => setNewRecord({ ...newRecord, rackNumber: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-slate-700 font-bold">Shelf Number *</Label>
                <Input
                  placeholder="e.g. SHELF-03"
                  value={newRecord.shelfNumber || ''}
                  onChange={(e) => setNewRecord({ ...newRecord, shelfNumber: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-slate-700 font-bold">Box / Binder ID</Label>
                <Input
                  placeholder="e.g. BOX-2026-09"
                  value={newRecord.boxFolderId || ''}
                  onChange={(e) => setNewRecord({ ...newRecord, boxFolderId: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-700 font-bold">ICD-10 Disease Code</Label>
                <Input
                  placeholder="e.g. K80.20 or J18.9"
                  value={newRecord.icd10Code || ''}
                  onChange={(e) => setNewRecord({ ...newRecord, icd10Code: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-slate-700 font-bold">ICD Diagnosis Title</Label>
                <Input
                  placeholder="e.g. Gallstone disease without cholecystitis"
                  value={newRecord.icd10Description || ''}
                  onChange={(e) => setNewRecord({ ...newRecord, icd10Description: e.target.value })}
                />
              </div>
            </div>

            <div className="p-3 bg-teal-50/50 rounded-xl border border-teal-100 space-y-2">
              <Label className="text-teal-900 font-bold">MRD File Audit & Completeness Checklist</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newRecord.hasDischargeSummary}
                    onChange={(e) => setNewRecord({ ...newRecord, hasDischargeSummary: e.target.checked })}
                    className="rounded text-teal-600"
                  />
                  <span>Discharge Summary</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newRecord.hasConsentForm}
                    onChange={(e) => setNewRecord({ ...newRecord, hasConsentForm: e.target.checked })}
                    className="rounded text-teal-600"
                  />
                  <span>Signed Consent</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newRecord.hasOperativeNotes}
                    onChange={(e) => setNewRecord({ ...newRecord, hasOperativeNotes: e.target.checked })}
                    className="rounded text-teal-600"
                  />
                  <span>OT / Surgical Note</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newRecord.isCompletedByDoctor}
                    onChange={(e) => setNewRecord({ ...newRecord, isCompletedByDoctor: e.target.checked })}
                    className="rounded text-teal-600"
                  />
                  <span>MD Sign-Off</span>
                </label>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddFileDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-teal-700 hover:bg-teal-800 text-white font-bold">
                Save & Archive File
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: Checkout File (Issue to Doctor/Court) */}
      <Dialog open={isCheckoutDialogOpen} onOpenChange={setIsCheckoutDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-amber-600" />
              Issue / Checkout Record #{selectedRecord?.fileBarcode}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Record chain of custody for patient file: <strong>{selectedRecord?.patientName}</strong> ({selectedRecord?.mrn})
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCheckoutRecord} className="space-y-3 text-xs">
            <div>
              <Label className="text-slate-700 font-bold">Issued To (Doctor / Authority / Court) *</Label>
              <Input
                placeholder="e.g. Dr. Rajesh Sharma or District Court Police Desk"
                value={checkoutForm.issuedTo}
                onChange={(e) => setCheckoutForm({ ...checkoutForm, issuedTo: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-700 font-bold">Department / Organization</Label>
                <Input
                  placeholder="e.g. Gastro OPD / Legal"
                  value={checkoutForm.departmentOrOrg}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, departmentOrOrg: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-slate-700 font-bold">Purpose of Request</Label>
                <Select
                  value={checkoutForm.purpose}
                  onValueChange={(val: any) => setCheckoutForm({ ...checkoutForm, purpose: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPD_CONSULT">OPD Consultation</SelectItem>
                    <SelectItem value="READMISSION">Re-admission</SelectItem>
                    <SelectItem value="COURT_LEGAL">Court / Legal / Police</SelectItem>
                    <SelectItem value="INSURANCE_AUDIT">Insurance TPA Audit</SelectItem>
                    <SelectItem value="PATIENT_COPY">Duplicate Copy Request</SelectItem>
                    <SelectItem value="RESEARCH">Clinical Research</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-700 font-bold">Expected Return Date</Label>
                <Input
                  type="date"
                  value={checkoutForm.expectedReturnDate}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, expectedReturnDate: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-slate-700 font-bold">Issued By (MRD Staff Name)</Label>
                <Input
                  placeholder="e.g. Suresh Kumar"
                  value={checkoutForm.issuedBy}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, issuedBy: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-700 font-bold">Remarks / Reference Letter No.</Label>
              <Input
                placeholder="e.g. Subpoena letter #4412/2026 attached"
                value={checkoutForm.remarks}
                onChange={(e) => setCheckoutForm({ ...checkoutForm, remarks: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCheckoutDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                Confirm Checkout
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: Update Rack Location & ICD-10 Code */}
      <Dialog open={isLocationModalOpen} onOpenChange={setIsLocationModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-teal-600" />
              Update Physical Rack & ICD-10 Coding
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveLocation} className="space-y-3 text-xs">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-slate-700 font-bold">Rack No.</Label>
                <Input
                  value={locationForm.rackNumber}
                  onChange={(e) => setLocationForm({ ...locationForm, rackNumber: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-slate-700 font-bold">Shelf No.</Label>
                <Input
                  value={locationForm.shelfNumber}
                  onChange={(e) => setLocationForm({ ...locationForm, shelfNumber: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-slate-700 font-bold">Box Binder ID</Label>
                <Input
                  value={locationForm.boxFolderId}
                  onChange={(e) => setLocationForm({ ...locationForm, boxFolderId: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-700 font-bold">ICD-10 Disease Code</Label>
              <Input
                placeholder="e.g. K80.20"
                value={locationForm.icd10Code}
                onChange={(e) => setLocationForm({ ...locationForm, icd10Code: e.target.value })}
              />
            </div>

            <div>
              <Label className="text-slate-700 font-bold">ICD-10 Description</Label>
              <Input
                placeholder="e.g. Gallstone disease without cholecystitis"
                value={locationForm.icd10Description}
                onChange={(e) => setLocationForm({ ...locationForm, icd10Description: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsLocationModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-teal-700 hover:bg-teal-800 text-white font-bold">
                Save Location & Code
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 4: Detail & Chain of Custody View */}
      <Dialog open={isDetailViewOpen} onOpenChange={setIsDetailViewOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FolderArchive className="w-5 h-5 text-teal-600" />
              Record History & Chain of Custody Audit
            </DialogTitle>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Patient Name</span>
                  <p className="font-bold text-slate-900">{selectedRecord.patientName}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase">MRN</span>
                  <p className="font-mono font-bold text-teal-700">{selectedRecord.mrn}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Barcode</span>
                  <p className="font-mono text-slate-800">{selectedRecord.fileBarcode}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Rack Location</span>
                  <p className="font-bold text-emerald-800">{selectedRecord.rackNumber} / {selectedRecord.shelfNumber}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase">ICD-10 Code</span>
                  <p className="font-mono font-bold text-indigo-700">{selectedRecord.icd10Code || 'Uncoded'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Department</span>
                  <p className="font-semibold text-slate-800">{selectedRecord.department}</p>
                </div>
              </div>

              {/* Active Checkout info if any */}
              {selectedRecord.activeIssue && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                  <p className="text-[10px] font-bold uppercase text-amber-900 flex items-center gap-1">
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    Currently Issued Out
                  </p>
                  <p className="text-amber-950 font-bold text-sm">{selectedRecord.activeIssue.issuedTo}</p>
                  <p className="text-amber-800">
                    Purpose: {selectedRecord.activeIssue.purpose} • Issued on: {selectedRecord.activeIssue.issuedDate} (Expected Return: {selectedRecord.activeIssue.expectedReturnDate})
                  </p>
                  {selectedRecord.activeIssue.remarks && (
                    <p className="text-amber-700 italic">Ref/Remarks: {selectedRecord.activeIssue.remarks}</p>
                  )}
                </div>
              )}

              {/* Movement History */}
              <div className="space-y-2">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-teal-600" />
                  Past Movement & Issue Audit Logs
                </p>

                {selectedRecord.issueHistory.length === 0 ? (
                  <p className="text-slate-400 italic py-3 text-center border rounded-lg bg-slate-50/50">
                    No past checkout movements recorded for this file.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedRecord.issueHistory.map((h) => (
                      <div key={h.id} className="p-2.5 border rounded-lg bg-white flex justify-between items-center text-[11px]">
                        <div>
                          <p className="font-bold text-slate-800">{h.issuedTo}</p>
                          <p className="text-slate-500 text-[10px]">Purpose: {h.purpose}</p>
                        </div>
                        <div className="text-right text-[10px]">
                          <p className="text-slate-600">Issued: {h.issuedDate}</p>
                          <p className="text-emerald-700 font-semibold">Returned: {h.returnedDate || 'N/A'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
