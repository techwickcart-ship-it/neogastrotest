import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search, 
  Printer, 
  Trash2, 
  FileText, 
  Scissors, 
  Pill, 
  Droplets, 
  ShieldAlert, 
  UserCheck, 
  Syringe, 
  Sparkles,
  Filter,
  CheckSquare,
  ChevronRight,
  Info,
  Calendar,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { storage } from '@/lib/storage';

export interface PreOpOrderItem {
  id: string;
  category: 'NPO & Fluids' | 'Medication & Antibiotic' | 'Skin & Site Prep' | 'Blood & Labs' | 'Consents & Clearance' | 'Special Directives';
  description: string;
  instructions: string;
  priority: 'Routine' | 'Urgent' | 'STAT';
  orderedBy: string;
  orderedAt: string;
  status: 'Pending' | 'Administered' | 'Cancelled';
  administeredBy?: string;
  administeredAt?: string;
  notes?: string;
}

export interface PreOpPatientRecord {
  id: string;
  patientId: string;
  patientName: string;
  mrn: string;
  age: number;
  gender: string;
  surgeryName: string;
  otRoom: string;
  scheduledDate: string;
  scheduledTime: string;
  surgeonName: string;
  anesthetistName: string;
  npoStartTime: string;
  bloodUnitsReserved: string;
  allergicHistory: string;
  asaClass: string;
  orders: PreOpOrderItem[];
}

const DEFAULT_PREOP_PATIENTS: PreOpPatientRecord[] = [
  {
    id: 'preop-1',
    patientId: 'P-101',
    patientName: 'ANUJ SINGHAI',
    mrn: 'MRN-88412',
    age: 45,
    gender: 'Male',
    surgeryName: 'Laparoscopic Cholecystectomy',
    otRoom: 'OT Room-1',
    scheduledDate: '2026-07-30',
    scheduledTime: '10:30 AM',
    surgeonName: 'Dr. Rajesh Verma (MS, Gen Surg)',
    anesthetistName: 'Dr. Sneha Kulkarni (MD, Anesthesia)',
    npoStartTime: '10:00 PM (Night Before)',
    bloodUnitsReserved: '1 Unit PRBC On Standby',
    allergicHistory: 'Penicillin Allergy (Mild Rash)',
    asaClass: 'ASA Grade II',
    orders: [
      {
        id: 'ord-101',
        category: 'NPO & Fluids',
        description: 'Strict NPO (Nil per os) since midnight',
        instructions: 'No solids or liquids after 10:00 PM',
        priority: 'STAT',
        orderedBy: 'Dr. Rajesh Verma',
        orderedAt: '2026-07-29 08:00 PM',
        status: 'Administered',
        administeredBy: 'Nurse Deepika Roy',
        administeredAt: '2026-07-29 10:00 PM',
        notes: 'Patient and attendant counselled regarding NPO.'
      },
      {
        id: 'ord-102',
        category: 'NPO & Fluids',
        description: 'Start IV Fluid Inj. Ringer Lactate @ 75 mL/hr',
        instructions: 'Start via 18G IV Cannula on left forearm at 06:00 AM',
        priority: 'Routine',
        orderedBy: 'Dr. Rajesh Verma',
        orderedAt: '2026-07-29 08:00 PM',
        status: 'Administered',
        administeredBy: 'Nurse Deepika Roy',
        administeredAt: '2026-07-30 06:15 AM',
        notes: '18G IV Cannula secured left forearm in 1st attempt.'
      },
      {
        id: 'ord-103',
        category: 'Medication & Antibiotic',
        description: 'Inj. Cefuroxime 1.5g IV in 100mL NS',
        instructions: 'Infuse 30 minutes before surgical incision',
        priority: 'Urgent',
        orderedBy: 'Dr. Rajesh Verma',
        orderedAt: '2026-07-29 08:00 PM',
        status: 'Pending',
        notes: 'Skin sensitivity test done & negative.'
      },
      {
        id: 'ord-104',
        category: 'Medication & Antibiotic',
        description: 'Inj. Pantoprazole 40mg IV + Inj. Ondansetron 4mg IV',
        instructions: 'Administer slowly IV push at 07:00 AM',
        priority: 'Routine',
        orderedBy: 'Dr. Sneha Kulkarni',
        orderedAt: '2026-07-29 09:15 PM',
        status: 'Administered',
        administeredBy: 'Nurse Priya Sharma',
        administeredAt: '2026-07-30 07:05 AM'
      },
      {
        id: 'ord-105',
        category: 'Skin & Site Prep',
        description: 'Surgical site hair clipping and Chlorhexidine 4% body wash',
        instructions: 'Abdomen and right subcostal area prep',
        priority: 'Routine',
        orderedBy: 'Dr. Rajesh Verma',
        orderedAt: '2026-07-29 08:00 PM',
        status: 'Administered',
        administeredBy: 'OT Tech Suresh Kumar',
        administeredAt: '2026-07-30 07:30 AM',
        notes: 'Surgical site marked with indelible ink marker by surgeon.'
      },
      {
        id: 'ord-106',
        category: 'Consents & Clearance',
        description: 'Verify High-Risk Surgical & Anesthesia Consents signed',
        instructions: 'Check patient signature, witness signature & doctor signature',
        priority: 'STAT',
        orderedBy: 'Dr. Sneha Kulkarni',
        orderedAt: '2026-07-29 09:15 PM',
        status: 'Administered',
        administeredBy: 'Nurse Priya Sharma',
        administeredAt: '2026-07-30 08:00 AM'
      },
      {
        id: 'ord-107',
        category: 'Blood & Labs',
        description: 'Blood Grouping & Crossmatch 1 Unit PRBC reserved',
        instructions: 'Keep blood unit reserved in hospital blood bank till procedure completion',
        priority: 'Routine',
        orderedBy: 'Dr. Rajesh Verma',
        orderedAt: '2026-07-29 08:00 PM',
        status: 'Administered',
        administeredBy: 'Lab Staff Amit',
        administeredAt: '2026-07-30 08:30 AM'
      }
    ]
  },
  {
    id: 'preop-2',
    patientId: 'P-102',
    patientName: 'SUNITA DEVI',
    mrn: 'MRN-77319',
    age: 58,
    gender: 'Female',
    surgeryName: 'Total Knee Replacement (Right)',
    otRoom: 'OT Room-2',
    scheduledDate: '2026-07-30',
    scheduledTime: '12:00 PM',
    surgeonName: 'Dr. Vikas Kapoor (MS, Ortho)',
    anesthetistName: 'Dr. Amit Patel (MD, Anesthesia)',
    npoStartTime: '02:00 AM',
    bloodUnitsReserved: '2 Units PRBC Reserved',
    allergicHistory: 'No Known Drug Allergies (NKDA)',
    asaClass: 'ASA Grade II',
    orders: [
      {
        id: 'ord-201',
        category: 'NPO & Fluids',
        description: 'NPO starting 02:00 AM',
        instructions: 'Clear liquids allowed until 06:00 AM if required',
        priority: 'STAT',
        orderedBy: 'Dr. Vikas Kapoor',
        orderedAt: '2026-07-29 09:00 PM',
        status: 'Administered',
        administeredBy: 'Nurse Ritu Singh',
        administeredAt: '2026-07-30 02:00 AM'
      },
      {
        id: 'ord-202',
        category: 'Medication & Antibiotic',
        description: 'Inj. Cefazolin 2g IV push slowly',
        instructions: 'Within 60 mins before tourniquet inflation',
        priority: 'STAT',
        orderedBy: 'Dr. Vikas Kapoor',
        orderedAt: '2026-07-29 09:00 PM',
        status: 'Pending'
      },
      {
        id: 'ord-203',
        category: 'Skin & Site Prep',
        description: 'Right leg surgical skin prep & Surgical Arrow Marking',
        instructions: 'Mark RIGHT knee with permanent surgical marker in pre-op holding area',
        priority: 'STAT',
        orderedBy: 'Dr. Vikas Kapoor',
        orderedAt: '2026-07-29 09:00 PM',
        status: 'Pending'
      }
    ]
  }
];

const PRESET_ORDER_SETS = [
  {
    category: 'NPO & Fluids' as const,
    description: 'Strict NPO (Nil Per Os) Order',
    instructions: 'Keep patient NPO from 12:00 Midnight. No solids or liquids.',
    priority: 'STAT' as const
  },
  {
    category: 'NPO & Fluids' as const,
    description: 'Pre-op IV Hydration Line',
    instructions: 'Start Inj. Ringer Lactate or 0.9% Normal Saline @ 80-100 mL/hr via 18G IV Cannula.',
    priority: 'Routine' as const
  },
  {
    category: 'Medication & Antibiotic' as const,
    description: 'Prophylactic Surgical Antibiotic',
    instructions: 'Inj. Cefuroxime 1.5g IV / Inj. Ceftriaxone 1g IV within 60 mins before incision.',
    priority: 'Urgent' as const
  },
  {
    category: 'Medication & Antibiotic' as const,
    description: 'Acid Prophylaxis & Anti-Emetic',
    instructions: 'Inj. Pantoprazole 40mg IV + Inj. Ondansetron 4mg IV push pre-op.',
    priority: 'Routine' as const
  },
  {
    category: 'Medication & Antibiotic' as const,
    description: 'Pre-Anesthetic Anxiolytic / Sedative',
    instructions: 'Inj. Midazolam 1mg IV + Inj. Glycopyrrolate 0.2mg IV on call to OT.',
    priority: 'Urgent' as const
  },
  {
    category: 'Skin & Site Prep' as const,
    description: 'Surgical Site Prep & Site Marking',
    instructions: 'Chlorhexidine skin prep. Surgeon to mark surgical site with permanent marker.',
    priority: 'STAT' as const
  },
  {
    category: 'Blood & Labs' as const,
    description: 'Blood Standby & Crossmatch Verification',
    instructions: 'Verify blood availability in Blood Bank. 1-2 Units PRBC crossmatched.',
    priority: 'Urgent' as const
  },
  {
    category: 'Consents & Clearance' as const,
    description: 'Surgical & Anesthesia Consent Verification',
    instructions: 'Verify signed consent forms, PAC clearance, and identity wristband.',
    priority: 'STAT' as const
  },
  {
    category: 'Special Directives' as const,
    description: 'DVT Prophylaxis & TED Stockings',
    instructions: 'Apply anti-embolism TED compression stockings before transfer to OT.',
    priority: 'Routine' as const
  }
];

export function PreOpOrders() {
  const [patientRecords, setPatientRecords] = useState<PreOpPatientRecord[]>(() => {
    return storage.get('hms_preop_patient_records', DEFAULT_PREOP_PATIENTS);
  });

  const [selectedPatientId, setSelectedPatientId] = useState<string>(patientRecords[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // New Patient Modal state
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [newPatientData, setNewPatientData] = useState({
    patientName: '',
    mrn: '',
    age: '',
    gender: 'Male',
    surgeryName: '',
    otRoom: 'OT Room-1',
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: '10:00 AM',
    surgeonName: '',
    anesthetistName: '',
    npoStartTime: '12:00 Midnight',
    bloodUnitsReserved: 'Nil',
    allergicHistory: 'NKDA',
    asaClass: 'ASA Grade I'
  });

  // New Order Modal state
  const [isAddOrderOpen, setIsAddOrderOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({
    category: 'NPO & Fluids' as PreOpOrderItem['category'],
    description: '',
    instructions: '',
    priority: 'Routine' as PreOpOrderItem['priority'],
    orderedBy: 'Dr. Surgeon In-Charge',
    notes: ''
  });

  // Execute Order Modal state
  const [executingOrder, setExecutingOrder] = useState<PreOpOrderItem | null>(null);
  const [adminNurseName, setAdminNurseName] = useState('Nurse Deepika Roy');
  const [executionNotes, setExecutionNotes] = useState('');

  // Persist records
  useEffect(() => {
    storage.set('hms_preop_patient_records', patientRecords);
  }, [patientRecords]);

  const activePatient = patientRecords.find(p => p.id === selectedPatientId) || patientRecords[0];

  const filteredOrders = (activePatient?.orders || []).filter(order => {
    const matchesCategory = filterCategory === 'ALL' || order.category === filterCategory;
    const matchesStatus = filterStatus === 'ALL' || order.status === filterStatus;
    const matchesSearch = searchQuery === '' || 
      order.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.instructions.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.orderedBy.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesStatus && matchesSearch;
  });

  const pendingCount = (activePatient?.orders || []).filter(o => o.status === 'Pending').length;
  const adminCount = (activePatient?.orders || []).filter(o => o.status === 'Administered').length;
  const statCount = (activePatient?.orders || []).filter(o => o.priority === 'STAT').length;

  const handleCreatePatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientData.patientName || !newPatientData.surgeryName) {
      toast.error('Please enter patient name and procedure name');
      return;
    }

    const newRecord: PreOpPatientRecord = {
      id: `preop-${Date.now()}`,
      patientId: `P-${Math.floor(100 + Math.random() * 900)}`,
      patientName: newPatientData.patientName.toUpperCase(),
      mrn: newPatientData.mrn || `MRN-${Math.floor(10000 + Math.random() * 90000)}`,
      age: parseInt(newPatientData.age) || 40,
      gender: newPatientData.gender,
      surgeryName: newPatientData.surgeryName,
      otRoom: newPatientData.otRoom,
      scheduledDate: newPatientData.scheduledDate,
      scheduledTime: newPatientData.scheduledTime,
      surgeonName: newPatientData.surgeonName || 'Dr. Chief Surgeon',
      anesthetistName: newPatientData.anesthetistName || 'Dr. Anesthetist',
      npoStartTime: newPatientData.npoStartTime,
      bloodUnitsReserved: newPatientData.bloodUnitsReserved,
      allergicHistory: newPatientData.allergicHistory,
      asaClass: newPatientData.asaClass,
      orders: PRESET_ORDER_SETS.slice(0, 5).map((preset, idx) => ({
        id: `ord-${Date.now()}-${idx}`,
        category: preset.category,
        description: preset.description,
        instructions: preset.instructions,
        priority: preset.priority,
        orderedBy: newPatientData.surgeonName || 'Dr. Chief Surgeon',
        orderedAt: new Date().toLocaleString(),
        status: 'Pending'
      }))
    };

    setPatientRecords([newRecord, ...patientRecords]);
    setSelectedPatientId(newRecord.id);
    setIsAddPatientOpen(false);
    toast.success(`Pre-Op Sheet initialized for ${newRecord.patientName}`);
    setNewPatientData({
      patientName: '',
      mrn: '',
      age: '',
      gender: 'Male',
      surgeryName: '',
      otRoom: 'OT Room-1',
      scheduledDate: new Date().toISOString().split('T')[0],
      scheduledTime: '10:00 AM',
      surgeonName: '',
      anesthetistName: '',
      npoStartTime: '12:00 Midnight',
      bloodUnitsReserved: 'Nil',
      allergicHistory: 'NKDA',
      asaClass: 'ASA Grade I'
    });
  };

  const handleAddOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrder.description) {
      toast.error('Please enter order description');
      return;
    }

    const newItem: PreOpOrderItem = {
      id: `ord-${Date.now()}`,
      category: newOrder.category,
      description: newOrder.description,
      instructions: newOrder.instructions,
      priority: newOrder.priority,
      orderedBy: newOrder.orderedBy,
      orderedAt: new Date().toLocaleString(),
      status: 'Pending',
      notes: newOrder.notes
    };

    const updatedRecords = patientRecords.map(p => {
      if (p.id === activePatient.id) {
        return {
          ...p,
          orders: [newItem, ...p.orders]
        };
      }
      return p;
    });

    setPatientRecords(updatedRecords);
    setIsAddOrderOpen(false);
    toast.success('Preoperative order added');
    setNewOrder({
      category: 'NPO & Fluids',
      description: '',
      instructions: '',
      priority: 'Routine',
      orderedBy: 'Dr. Surgeon In-Charge',
      notes: ''
    });
  };

  const handleApplyPreset = (preset: typeof PRESET_ORDER_SETS[0]) => {
    setNewOrder({
      category: preset.category,
      description: preset.description,
      instructions: preset.instructions,
      priority: preset.priority,
      orderedBy: activePatient?.surgeonName || 'Dr. Chief Surgeon',
      notes: ''
    });
  };

  const handleConfirmAdminister = () => {
    if (!executingOrder) return;

    const updatedRecords = patientRecords.map(p => {
      if (p.id === activePatient.id) {
        return {
          ...p,
          orders: p.orders.map(o => {
            if (o.id === executingOrder.id) {
              return {
                ...o,
                status: 'Administered' as const,
                administeredBy: adminNurseName,
                administeredAt: new Date().toLocaleString(),
                notes: executionNotes ? (o.notes ? `${o.notes} | ${executionNotes}` : executionNotes) : o.notes
              };
            }
            return o;
          })
        };
      }
      return p;
    });

    setPatientRecords(updatedRecords);
    setExecutingOrder(null);
    setExecutionNotes('');
    toast.success('Order marked as Administered/Executed');
  };

  const handleDeleteOrder = (orderId: string) => {
    const updatedRecords = patientRecords.map(p => {
      if (p.id === activePatient.id) {
        return {
          ...p,
          orders: p.orders.filter(o => o.id !== orderId)
        };
      }
      return p;
    });
    setPatientRecords(updatedRecords);
    toast.info('Order removed from sheet');
  };

  const handlePrintPreOpSheet = () => {
    if (!activePatient) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Pop-up blocked. Please allow popups to print.');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>PREOPERATIVE ORDERS SHEET - ${activePatient.patientName}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #1e293b; }
            .header { border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
            .hospital-title { font-size: 22px; font-weight: bold; color: #0284c7; }
            .sheet-title { font-size: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #0f172a; margin-top: 4px; }
            .patient-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 20px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; font-size: 12px; }
            .patient-box div { margin-bottom: 4px; }
            .patient-box label { font-weight: bold; color: #64748b; text-transform: uppercase; font-size: 10px; display: block; }
            .patient-box span { font-weight: bold; color: #0f172a; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
            th { background-color: #f1f5f9; font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; }
            .badge-stat { background-color: #fef2f2; color: #dc2626; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; }
            .badge-urgent { background-color: #fffbebf; color: #d97706; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; }
            .badge-routine { background-color: #f0fdf4; color: #16a34a; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; }
            .status-done { color: #15803d; font-weight: bold; }
            .status-pending { color: #b45309; font-weight: bold; }
            .footer-sig { margin-top: 40px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; text-align: center; font-size: 12px; }
            .sig-line { border-top: 1px dashed #94a3b8; padding-top: 6px; font-weight: bold; color: #334155; margin-top: 50px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="hospital-title">NEO GASTRO HOSPITAL</div>
              <div class="sheet-title">DEPARTMENT OF OPERATIVE SERVICES — PREOPERATIVE ORDERS & DIRECTIVES SHEET</div>
            </div>
            <div style="text-align: right; font-size: 11px; color: #64748b;">
              Printed Date: ${new Date().toLocaleString()}<br/>
              Sheet Ref: PREOP-${activePatient.mrn}
            </div>
          </div>

          <div class="patient-box">
            <div><label>Patient Name</label><span>${activePatient.patientName}</span></div>
            <div><label>MRN / UHID</label><span>${activePatient.mrn}</span></div>
            <div><label>Age / Gender</label><span>${activePatient.age} Yrs / ${activePatient.gender}</span></div>
            <div><label>Proposed Surgery</label><span>${activePatient.surgeryName}</span></div>
            <div><label>OT Room / Time</label><span>${activePatient.otRoom} (${activePatient.scheduledTime})</span></div>
            <div><label>Surgeon In-Charge</label><span>${activePatient.surgeonName}</span></div>
            <div><label>Anesthetist In-Charge</label><span>${activePatient.anesthetistName}</span></div>
            <div><label>NPO Directive</label><span>${activePatient.npoStartTime}</span></div>
            <div><label>ASA Class / Allergy</label><span>${activePatient.asaClass} | ${activePatient.allergicHistory}</span></div>
          </div>

          <h3>Preoperative Clinical Directives & Medication Orders</h3>
          <table>
            <thead>
              <tr>
                <th style="width: 50px;">#</th>
                <th>Category</th>
                <th>Order Description & Instructions</th>
                <th style="width: 80px;">Priority</th>
                <th style="width: 110px;">Ordered By</th>
                <th style="width: 120px;">Execution Status</th>
                <th style="width: 130px;">Executed By / Time</th>
              </tr>
            </thead>
            <tbody>
              ${activePatient.orders.map((ord, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td><strong>${ord.category}</strong></td>
                  <td>
                    <strong>${ord.description}</strong><br/>
                    <span style="color: #475569; font-size: 11px;">${ord.instructions}</span>
                    ${ord.notes ? `<br/><i style="color: #64748b; font-size: 10px;">Note: ${ord.notes}</i>` : ''}
                  </td>
                  <td>
                    <span class="${ord.priority === 'STAT' ? 'badge-stat' : ord.priority === 'Urgent' ? 'badge-urgent' : 'badge-routine'}">
                      ${ord.priority}
                    </span>
                  </td>
                  <td>${ord.orderedBy}</td>
                  <td>
                    <span class="${ord.status === 'Administered' ? 'status-done' : 'status-pending'}">
                      ${ord.status === 'Administered' ? '✓ Executed' : '⌛ Pending'}
                    </span>
                  </td>
                  <td>${ord.administeredBy || '—'}<br/><small style="color: #64748b;">${ord.administeredAt || ''}</small></td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer-sig">
            <div>
              <div class="sig-line">Surgeon Signature & Stamp</div>
            </div>
            <div>
              <div class="sig-line">Anesthetist Signature & Stamp</div>
            </div>
            <div>
              <div class="sig-line">Receiving OT Nurse Signature</div>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-sky-900 via-sky-800 to-indigo-900 text-white p-6 rounded-3xl shadow-lg border border-sky-700/50">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge className="bg-sky-400/20 text-sky-200 border-sky-300/30 text-xs font-bold uppercase tracking-wider">
              OT Clinical Suite
            </Badge>
            <span className="text-xs text-sky-300 font-medium">• Surgical Care Directives</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-sky-300" />
            Preoperative Orders & Patient Preparation
          </h2>
          <p className="text-xs text-sky-200/90 max-w-2xl font-medium">
            Manage surgical pre-medications, NPO guidelines, skin prep directives, blood crossmatching orders, and pre-op clearance checklists for scheduled surgeries.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button 
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 gap-2 rounded-2xl font-bold h-11 text-xs backdrop-blur-md"
            onClick={handlePrintPreOpSheet}
          >
            <Printer className="w-4 h-4 text-sky-300" />
            Print Order Sheet
          </Button>

          <Dialog open={isAddPatientOpen} onOpenChange={setIsAddPatientOpen}>
            <DialogTrigger asChild>
              <Button className="bg-sky-400 hover:bg-sky-300 text-sky-950 gap-2 rounded-2xl font-black h-11 text-xs shadow-md">
                <Plus className="w-4 h-4" />
                Initialize Patient Pre-Op
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[620px] rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Scissors className="w-5 h-5 text-sky-600" />
                  Initialize New Preoperative Order Sheet
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Select or register a patient scheduled for surgery and set up initial pre-op orders.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreatePatient} className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">Patient Name *</Label>
                    <Input 
                      placeholder="e.g. ANUJ SINGHAI" 
                      value={newPatientData.patientName} 
                      onChange={e => setNewPatientData({...newPatientData, patientName: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">MRN / UHID</Label>
                    <Input 
                      placeholder="e.g. MRN-88412" 
                      value={newPatientData.mrn} 
                      onChange={e => setNewPatientData({...newPatientData, mrn: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">Age</Label>
                    <Input 
                      type="number" 
                      placeholder="45" 
                      value={newPatientData.age} 
                      onChange={e => setNewPatientData({...newPatientData, age: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">Gender</Label>
                    <Select 
                      value={newPatientData.gender} 
                      onValueChange={v => setNewPatientData({...newPatientData, gender: v})}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">OT Room</Label>
                    <Select 
                      value={newPatientData.otRoom} 
                      onValueChange={v => setNewPatientData({...newPatientData, otRoom: v})}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OT Room-1">OT Room-1 (General)</SelectItem>
                        <SelectItem value="OT Room-2">OT Room-2 (Orthopedic)</SelectItem>
                        <SelectItem value="OT Room-3">OT Room-3 (Cardiac/Neuro)</SelectItem>
                        <SelectItem value="OT Room-4">OT Room-4 (Endoscopy)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Proposed Procedure / Surgery *</Label>
                  <Input 
                    placeholder="e.g. Laparoscopic Cholecystectomy" 
                    value={newPatientData.surgeryName} 
                    onChange={e => setNewPatientData({...newPatientData, surgeryName: e.target.value})}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">Surgeon In-Charge</Label>
                    <Input 
                      placeholder="e.g. Dr. Rajesh Verma" 
                      value={newPatientData.surgeonName} 
                      onChange={e => setNewPatientData({...newPatientData, surgeonName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">Anesthetist In-Charge</Label>
                    <Input 
                      placeholder="e.g. Dr. Sneha Kulkarni" 
                      value={newPatientData.anesthetistName} 
                      onChange={e => setNewPatientData({...newPatientData, anesthetistName: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">NPO Start Directive</Label>
                    <Input 
                      placeholder="e.g. 10:00 PM (Night Before)" 
                      value={newPatientData.npoStartTime} 
                      onChange={e => setNewPatientData({...newPatientData, npoStartTime: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">Blood Reserved</Label>
                    <Input 
                      placeholder="e.g. 1 Unit PRBC Standby" 
                      value={newPatientData.bloodUnitsReserved} 
                      onChange={e => setNewPatientData({...newPatientData, bloodUnitsReserved: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">ASA Grade</Label>
                    <Select 
                      value={newPatientData.asaClass} 
                      onValueChange={v => setNewPatientData({...newPatientData, asaClass: v})}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ASA Grade I">ASA Grade I</SelectItem>
                        <SelectItem value="ASA Grade II">ASA Grade II</SelectItem>
                        <SelectItem value="ASA Grade III">ASA Grade III</SelectItem>
                        <SelectItem value="ASA Grade IV">ASA Grade IV</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddPatientOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-bold">Initialize Sheet</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Patient Selection Bar & Patient Header Info */}
      <Card className="border-slate-200/80 shadow-sm rounded-3xl overflow-hidden">
        <CardContent className="p-6 space-y-6">
          {/* Patient Selector Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-sky-50 text-sky-700">
                <User className="w-5 h-5" />
              </div>
              <div>
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Active Pre-Op Patient</Label>
                <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                  <SelectTrigger className="w-[280px] font-bold text-slate-800 border-slate-200 h-10 rounded-xl bg-slate-50/50">
                    <SelectValue placeholder="Select patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patientRecords.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.patientName} ({p.mrn}) — {p.surgeryName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Status KPI Chips for active patient */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="bg-amber-50 border border-amber-200/60 text-amber-900 px-3 py-1.5 rounded-2xl flex items-center gap-2 text-xs font-bold">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>{pendingCount} Pending Orders</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200/60 text-emerald-900 px-3 py-1.5 rounded-2xl flex items-center gap-2 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{adminCount} Administered</span>
              </div>
              {statCount > 0 && (
                <div className="bg-rose-50 border border-rose-200/60 text-rose-900 px-3 py-1.5 rounded-2xl flex items-center gap-2 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>{statCount} STAT Directives</span>
                </div>
              )}
            </div>
          </div>

          {/* Active Patient Details Banner */}
          {activePatient && (
            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/60 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Procedure</span>
                <span className="font-extrabold text-slate-800 text-sm">{activePatient.surgeryName}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">OT & Time</span>
                <span className="font-bold text-slate-700">{activePatient.otRoom} • {activePatient.scheduledTime}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Surgeon</span>
                <span className="font-bold text-slate-700">{activePatient.surgeonName}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Anesthetist</span>
                <span className="font-bold text-slate-700">{activePatient.anesthetistName}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">NPO Guideline</span>
                <span className="font-black text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded-md inline-block mt-0.5">
                  {activePatient.npoStartTime}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Blood Crossmatch</span>
                <span className="font-black text-rose-700 bg-rose-100/60 px-2 py-0.5 rounded-md inline-block mt-0.5">
                  {activePatient.bloodUnitsReserved}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Orders Filter & Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <Input 
              placeholder="Search pre-op orders, drugs, or directives..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl bg-slate-50 border-slate-200"
            />
          </div>

          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[170px] h-9 text-xs rounded-xl border-slate-200 bg-slate-50 font-medium">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              <SelectItem value="NPO & Fluids">NPO & Fluids</SelectItem>
              <SelectItem value="Medication & Antibiotic">Medication & Antibiotic</SelectItem>
              <SelectItem value="Skin & Site Prep">Skin & Site Prep</SelectItem>
              <SelectItem value="Blood & Labs">Blood & Labs</SelectItem>
              <SelectItem value="Consents & Clearance">Consents & Clearance</SelectItem>
              <SelectItem value="Special Directives">Special Directives</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px] h-9 text-xs rounded-xl border-slate-200 bg-slate-50 font-medium">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="Pending">Pending Only</SelectItem>
              <SelectItem value="Administered">Administered</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isAddOrderOpen} onOpenChange={setIsAddOrderOpen}>
          <DialogTrigger asChild>
            <Button className="bg-sky-600 hover:bg-sky-700 text-white font-extrabold gap-1.5 h-9 text-xs rounded-xl px-4 shadow-sm">
              <Plus className="w-4 h-4" />
              Add Pre-Op Order
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[580px] rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Syringe className="w-5 h-5 text-sky-600" />
                Add Preoperative Order / Directive
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Create a custom pre-op directive or apply standard surgical preset orders.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Quick Presets Picker */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Quick Presets (Click to Auto-fill)
                </Label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200/80">
                  {PRESET_ORDER_SETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="text-[11px] bg-white hover:bg-sky-50 hover:border-sky-300 border border-slate-200/80 text-slate-700 px-2.5 py-1 rounded-lg transition-all text-left font-medium shadow-2xs flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3 text-sky-600" />
                      {preset.description}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleAddOrder} className="space-y-3 pt-2 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">Order Category</Label>
                    <Select 
                      value={newOrder.category} 
                      onValueChange={(v: any) => setNewOrder({...newOrder, category: v})}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NPO & Fluids">NPO & Fluids</SelectItem>
                        <SelectItem value="Medication & Antibiotic">Medication & Antibiotic</SelectItem>
                        <SelectItem value="Skin & Site Prep">Skin & Site Prep</SelectItem>
                        <SelectItem value="Blood & Labs">Blood & Labs</SelectItem>
                        <SelectItem value="Consents & Clearance">Consents & Clearance</SelectItem>
                        <SelectItem value="Special Directives">Special Directives</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">Priority Level</Label>
                    <Select 
                      value={newOrder.priority} 
                      onValueChange={(v: any) => setNewOrder({...newOrder, priority: v})}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Routine">Routine</SelectItem>
                        <SelectItem value="Urgent">Urgent</SelectItem>
                        <SelectItem value="STAT">STAT (Immediate)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Order Title / Directive Name *</Label>
                  <Input 
                    placeholder="e.g. Inj. Cefuroxime 1.5g IV push" 
                    value={newOrder.description} 
                    onChange={e => setNewOrder({...newOrder, description: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Detailed Instructions for Nursing / OT Staff</Label>
                  <textarea 
                    placeholder="e.g. Infuse 30-60 minutes before surgical incision. Check skin sensitivity test." 
                    value={newOrder.instructions} 
                    onChange={e => setNewOrder({...newOrder, instructions: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none h-20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">Ordering Doctor Name</Label>
                    <Input 
                      placeholder="e.g. Dr. Rajesh Verma" 
                      value={newOrder.orderedBy} 
                      onChange={e => setNewOrder({...newOrder, orderedBy: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">Additional Notes / Warnings</Label>
                    <Input 
                      placeholder="e.g. Penicillin sensitive" 
                      value={newOrder.notes} 
                      onChange={e => setNewOrder({...newOrder, notes: e.target.value})}
                    />
                  </div>
                </div>

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddOrderOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-bold">Add Order to Sheet</Button>
                </DialogFooter>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Orders List Table / Card View */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <Card className="border-dashed border-2 border-slate-200 p-12 text-center rounded-3xl bg-slate-50/50">
            <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-600">No Preoperative Orders Matching Criteria</h4>
            <p className="text-xs text-slate-400 mt-1">Try resetting search filters or click "Add Pre-Op Order" to log a directive.</p>
          </Card>
        ) : (
          filteredOrders.map((ord, idx) => {
            const isDone = ord.status === 'Administered';
            return (
              <Card 
                key={ord.id} 
                className={`border transition-all duration-200 rounded-2xl overflow-hidden ${
                  isDone 
                    ? 'bg-emerald-50/20 border-emerald-200/60 shadow-none' 
                    : ord.priority === 'STAT'
                      ? 'bg-rose-50/30 border-rose-200 shadow-sm'
                      : 'bg-white border-slate-200/80 shadow-sm hover:shadow-md'
                }`}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    
                    {/* Left Icon & Category Badge */}
                    <div className="flex items-start gap-3.5 flex-1">
                      <div className={`p-2.5 rounded-2xl mt-0.5 ${
                        isDone 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : ord.priority === 'STAT'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-sky-100 text-sky-700'
                      }`}>
                        {ord.category === 'Medication & Antibiotic' ? (
                          <Pill className="w-5 h-5" />
                        ) : ord.category === 'NPO & Fluids' ? (
                          <Droplets className="w-5 h-5" />
                        ) : ord.category === 'Skin & Site Prep' ? (
                          <Scissors className="w-5 h-5" />
                        ) : ord.category === 'Blood & Labs' ? (
                          <Syringe className="w-5 h-5" />
                        ) : (
                          <FileText className="w-5 h-5" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className={`text-[10px] font-extrabold uppercase ${
                            isDone 
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}>
                            {ord.category}
                          </Badge>

                          <Badge className={`text-[10px] font-black uppercase ${
                            ord.priority === 'STAT' 
                              ? 'bg-rose-600 text-white' 
                              : ord.priority === 'Urgent'
                                ? 'bg-amber-500 text-white'
                                : 'bg-slate-200 text-slate-800'
                          }`}>
                            {ord.priority}
                          </Badge>

                          <span className="text-[11px] text-slate-400 font-medium">
                            Ordered by: <strong className="text-slate-700">{ord.orderedBy}</strong> ({ord.orderedAt})
                          </span>
                        </div>

                        <h4 className={`text-base font-black ${isDone ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                          {ord.description}
                        </h4>

                        {ord.instructions && (
                          <p className="text-xs text-slate-600 font-medium">
                            {ord.instructions}
                          </p>
                        )}

                        {ord.notes && (
                          <p className="text-[11px] text-slate-500 bg-slate-100/70 p-1.5 rounded-lg italic inline-block mt-1">
                            Note: {ord.notes}
                          </p>
                        )}

                        {isDone && (
                          <div className="flex items-center gap-2 pt-1 text-xs text-emerald-700 font-bold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Executed by {ord.administeredBy} on {ord.administeredAt}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Action Buttons */}
                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      {!isDone ? (
                        <Button 
                          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs font-bold rounded-xl h-9 px-3.5 shadow-sm"
                          onClick={() => setExecutingOrder(ord)}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Mark Executed
                        </Button>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-3 py-1.5 text-xs rounded-xl">
                          Completed
                        </Badge>
                      )}

                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 h-9 w-9 rounded-xl"
                        onClick={() => handleDeleteOrder(ord.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Execute Order Modal */}
      <Dialog open={!!executingOrder} onOpenChange={open => !open && setExecutingOrder(null)}>
        <DialogContent className="sm:max-w-[420px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              Confirm Order Execution / Administration
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Record nurse sign-off for executing this preoperative directive.
            </DialogDescription>
          </DialogHeader>

          {executingOrder && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200/80 text-xs space-y-1">
                <span className="font-extrabold text-emerald-900 block">{executingOrder.description}</span>
                <p className="text-emerald-700">{executingOrder.instructions}</p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Administering Nurse / OT Specialist Name</Label>
                <Input 
                  value={adminNurseName} 
                  onChange={e => setAdminNurseName(e.target.value)}
                  placeholder="Nurse Name"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Execution Remarks / Patient Response</Label>
                <textarea 
                  value={executionNotes || ''} 
                  onChange={e => setExecutionNotes(e.target.value)}
                  placeholder="e.g. Dose administered IV. Patient tolerated well. Vitals stable."
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none h-20"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button variant="outline" onClick={() => setExecutingOrder(null)}>Cancel</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold" onClick={handleConfirmAdminister}>
                  Confirm Execution
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PreOpOrders;
