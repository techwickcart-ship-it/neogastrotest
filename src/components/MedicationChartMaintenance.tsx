import React, { useState, useEffect } from 'react';
import { 
  Pill, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Search, 
  User, 
  Filter, 
  Printer, 
  Download, 
  AlertTriangle, 
  Activity, 
  Syringe, 
  Droplet, 
  Check, 
  X, 
  ShieldAlert, 
  FileText, 
  Sliders, 
  Calendar, 
  Building2, 
  RotateCcw,
  Sparkles,
  Info,
  CheckCheck,
  Zap,
  Gauge,
  Timer
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { printHTML } from '@/lib/printHelper';

export interface DoseSlot {
  time: string; // e.g. "08:00"
  status: 'SCHEDULED' | 'GIVEN' | 'OVERDUE' | 'HELD' | 'REFUSED' | 'TITRATED' | 'RUNNING' | 'COMPLETED';
  givenAt?: string;
  givenBy?: string;
  preCheckVital?: string;
  remarks?: string;
  infusionRate?: string;
  volumeInfusedMl?: number;
}

export interface MedicationOrder {
  id: string;
  patientId: string;
  drugName: string;
  dosage: string;
  orderCategory?: 'Standard' | 'Continuous Infusion';
  isContinuousInfusion?: boolean;
  infusionRate?: string; // e.g. "5 ml/hr", "0.05 mcg/kg/min", "20 drops/min"
  diluentVehicle?: string; // e.g. "in 50ml NS via Syringe Pump"
  targetGoal?: string; // e.g. "Maintain MAP > 65 mmHg" or "GRBS 140-180 mg/dL"
  route: 'Oral' | 'IV Push' | 'IV Infusion' | 'Continuous IV Infusion' | 'Continuous Subcutaneous' | 'Epidural Infusion' | 'IM' | 'Subcutaneous' | 'Inhalation' | 'Topical' | 'PR';
  frequency: 'OD (Once Daily)' | 'BD (Twice Daily)' | 'TDS (Thrice Daily)' | 'QID (4 Times Daily)' | 'Continuous (24 Hrs)' | 'Continuous Infusion' | 'Continuous (Titrate to Target)' | 'Q2H' | 'Q4H' | 'Q6H' | 'Q8H' | 'STAT (Immediate)' | 'PRN (As Needed)';
  scheduledTimes: string[]; // e.g. ["08:00", "20:00"] or continuous monitoring checkpoints
  prescribedBy: string;
  startDate: string;
  endDate?: string;
  instructions?: string;
  isHighAlert?: boolean; // High alert medication (Insulin, Heparin, Chemotherapy, Opioids, Inotropes)
  status: 'ACTIVE' | 'DISCONTINUED' | 'COMPLETED';
  doseLogs: Record<string, DoseSlot>; // Keyed by `${date}_${time}` e.g. "2026-08-01_08:00"
}

export interface IVFluidOrder {
  id: string;
  patientId: string;
  fluidName: string; // e.g. Normal Saline 0.9% 500ml
  additive?: string; // e.g. KCl 20mEq
  rate: string; // e.g. 75 ml/hr
  startTime: string;
  expectedEndTime: string;
  status: 'RUNNING' | 'PAUSED' | 'COMPLETED';
  nurseInCharge: string;
  volumeInfusedMl: number;
  totalVolumeMl: number;
}

const DEFAULT_TIME_SLOTS = ["06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00", "00:00", "02:00", "04:00"];

const INITIAL_MEDICATION_ORDERS: MedicationOrder[] = [
  {
    id: 'med-order-0',
    patientId: 'p-1',
    drugName: 'Inj. Noradrenaline Infusion (4mg in 50ml NS)',
    dosage: '4mg in 50ml NS',
    orderCategory: 'Continuous Infusion',
    isContinuousInfusion: true,
    infusionRate: '5 ml/hr',
    diluentVehicle: '50ml NS via Syringe Pump',
    targetGoal: 'Maintain MAP >= 65 mmHg',
    route: 'Continuous IV Infusion',
    frequency: 'Continuous (24 Hrs)',
    scheduledTimes: ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00', '00:00', '02:00', '04:00'],
    prescribedBy: 'Dr. Rajesh Sharma',
    startDate: '2026-07-28',
    instructions: 'Continuous Syringe Pump. Titrate by 1 ml/hr every 15 min to maintain MAP > 65 mmHg. Central line.',
    isHighAlert: true,
    status: 'ACTIVE',
    doseLogs: {
      '2026-08-01_06:00': {
        time: '06:00',
        status: 'GIVEN',
        givenAt: '2026-08-01 06:00 AM',
        givenBy: 'Nurse Priya S.',
        preCheckVital: 'MAP: 68 mmHg, BP: 104/62',
        infusionRate: '5 ml/hr',
        remarks: 'Syringe pump running smoothly via central line'
      },
      '2026-08-01_08:00': {
        time: '08:00',
        status: 'GIVEN',
        givenAt: '2026-08-01 08:00 AM',
        givenBy: 'Nurse Priya S.',
        preCheckVital: 'MAP: 71 mmHg, BP: 110/68',
        infusionRate: '5 ml/hr',
        remarks: 'Infusion rate verified. Site healthy'
      }
    }
  },
  {
    id: 'med-order-1',
    patientId: 'p-1',
    drugName: 'Inj. Pantoprazole 40mg IV',
    dosage: '40mg',
    route: 'IV Push',
    frequency: 'OD (Once Daily)',
    scheduledTimes: ['07:00'],
    prescribedBy: 'Dr. Rajesh Sharma',
    startDate: '2026-07-28',
    instructions: 'Administer slow IV push over 2 mins before breakfast',
    isHighAlert: false,
    status: 'ACTIVE',
    doseLogs: {
      '2026-08-01_07:00': {
        time: '07:00',
        status: 'GIVEN',
        givenAt: '2026-08-01 07:05 AM',
        givenBy: 'Nurse Priya S.',
        remarks: 'Tolerated well, no epigastric discomfort'
      }
    }
  },
  {
    id: 'med-order-2',
    patientId: 'p-1',
    drugName: 'Inj. Ceftriaxone 1g IV',
    dosage: '1g in 100ml NS',
    route: 'IV Infusion',
    frequency: 'BD (Twice Daily)',
    scheduledTimes: ['08:00', '20:00'],
    prescribedBy: 'Dr. Rajesh Sharma',
    startDate: '2026-07-28',
    instructions: 'Infuse over 30 mins after skin sensitivity test',
    isHighAlert: false,
    status: 'ACTIVE',
    doseLogs: {
      '2026-08-01_08:00': {
        time: '08:00',
        status: 'GIVEN',
        givenAt: '2026-08-01 08:10 AM',
        givenBy: 'Nurse Priya S.',
        remarks: 'Skin test negative. Infused over 30 mins'
      }
    }
  },
  {
    id: 'med-order-3',
    patientId: 'p-1',
    drugName: 'Tab. Paracetamol 650mg',
    dosage: '650mg Oral',
    route: 'Oral',
    frequency: 'TDS (Thrice Daily)',
    scheduledTimes: ['08:00', '14:00', '20:00'],
    prescribedBy: 'Dr. Rajesh Sharma',
    startDate: '2026-07-28',
    instructions: 'Give post meals for temp > 99.5°F or surgical site pain',
    isHighAlert: false,
    status: 'ACTIVE',
    doseLogs: {
      '2026-08-01_08:00': {
        time: '08:00',
        status: 'GIVEN',
        givenAt: '2026-08-01 08:30 AM',
        givenBy: 'Nurse Priya S.'
      }
    }
  },
  {
    id: 'med-order-4',
    patientId: 'p-1',
    drugName: 'Inj. Human Actrapid Insulin (High Alert)',
    dosage: '8 Units SC',
    route: 'Subcutaneous',
    frequency: 'TDS (Thrice Daily)',
    scheduledTimes: ['08:00', '13:00', '20:00'],
    prescribedBy: 'Dr. P. K. Mishra',
    startDate: '2026-07-29',
    instructions: 'Check Blood Glucose before administering. Hold if GRBS < 100 mg/dL',
    isHighAlert: true,
    status: 'ACTIVE',
    doseLogs: {
      '2026-08-01_08:00': {
        time: '08:00',
        status: 'GIVEN',
        givenAt: '2026-08-01 08:00 AM',
        givenBy: 'Nurse Anita',
        preCheckVital: 'GRBS: 184 mg/dL',
        remarks: 'Injected SC in abdominal wall'
      }
    }
  },
  {
    id: 'med-order-5',
    patientId: 'p-1',
    drugName: 'Tab. Amlodipine 5mg',
    dosage: '5mg Oral',
    route: 'Oral',
    frequency: 'OD (Once Daily)',
    scheduledTimes: ['10:00'],
    prescribedBy: 'Dr. P. K. Mishra',
    startDate: '2026-07-28',
    instructions: 'Hold if Systolic BP < 100 mmHg',
    isHighAlert: false,
    status: 'ACTIVE',
    doseLogs: {}
  }
];

const INITIAL_IV_FLUIDS: IVFluidOrder[] = [
  {
    id: 'iv-1',
    patientId: 'p-1',
    fluidName: 'Normal Saline 0.9% 500ml',
    additive: 'Inj. Optineuron 1 ampoule',
    rate: '75 ml/hr',
    startTime: '2026-08-01 06:00 AM',
    expectedEndTime: '2026-08-01 01:00 PM',
    status: 'RUNNING',
    nurseInCharge: 'Nurse Priya S.',
    volumeInfusedMl: 225,
    totalVolumeMl: 500
  }
];

interface Props {
  patientId?: string;
  patient?: any;
  embedded?: boolean;
}

export default function MedicationChartMaintenance({ patientId: propPatientId, patient: propPatient, embedded = false }: Props) {
  const [patients, setPatients] = useState<any[]>(() => {
    const hmsPats = storage.get('hms_patients', []);
    const generalPats = storage.get('patients', []);
    const combined = [...(Array.isArray(hmsPats) ? hmsPats : []), ...(Array.isArray(generalPats) ? generalPats : [])];
    if (propPatient) {
      combined.unshift(propPatient);
    }
    const uniqueMap = new Map();
    combined.forEach(p => {
      if (p && p.id && !uniqueMap.has(p.id)) {
        uniqueMap.set(p.id, p);
      }
    });
    return Array.from(uniqueMap.values());
  });

  const [selectedPatientId, setSelectedPatientId] = useState<string>(propPatientId || (propPatient?.id || ''));
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().substring(0, 10));

  const [medOrders, setMedOrders] = useState<MedicationOrder[]>(() => {
    return storage.get('hms_medication_orders', INITIAL_MEDICATION_ORDERS);
  });

  const [ivFluids, setIvFluids] = useState<IVFluidOrder[]>(() => {
    return storage.get('hms_iv_fluids', INITIAL_IV_FLUIDS);
  });

  // Modal Dialog states
  const [isNewMedDialogOpen, setIsNewMedDialogOpen] = useState(false);
  const [isGiveDoseDialogOpen, setIsGiveDoseDialogOpen] = useState(false);
  const [isNewIvDialogOpen, setIsNewIvDialogOpen] = useState(false);

  // Dose logging modal target
  const [activeDoseTarget, setActiveDoseTarget] = useState<{
    order: MedicationOrder;
    slotTime: string;
    existingSlot?: DoseSlot;
  } | null>(null);

  // Give dose form state
  const [doseForm, setDoseForm] = useState({
    action: 'GIVEN' as 'GIVEN' | 'HELD' | 'REFUSED' | 'TITRATED' | 'RUNNING' | 'COMPLETED',
    nurseName: 'Nurse On Duty',
    preCheckVital: '',
    remarks: '',
    infusionRate: '5 ml/hr'
  });

  // New Medication Form State
  const [newOrderForm, setNewOrderForm] = useState<Partial<MedicationOrder>>({
    drugName: '',
    dosage: '',
    orderCategory: 'Standard',
    isContinuousInfusion: false,
    infusionRate: '5 ml/hr',
    diluentVehicle: '50ml NS via Syringe Pump',
    targetGoal: '',
    route: 'Oral',
    frequency: 'BD (Twice Daily)',
    scheduledTimes: ['08:00', '20:00'],
    prescribedBy: 'Dr. Duty Physician',
    startDate: new Date().toISOString().substring(0, 10),
    instructions: '',
    isHighAlert: false
  });

  // New IV Fluid Form State
  const [newIvForm, setNewIvForm] = useState<Partial<IVFluidOrder>>({
    fluidName: 'Normal Saline 0.9% 500ml',
    additive: '',
    rate: '75 ml/hr',
    totalVolumeMl: 500,
    nurseInCharge: 'Nurse On Duty'
  });

  // Sync selected patient ID or prop patient if prop specifies it
  useEffect(() => {
    if (propPatientId) {
      setSelectedPatientId(propPatientId);
    }
    if (propPatient) {
      setPatients(prev => {
        const exists = prev.some(p => p.id === propPatient.id);
        if (!exists) {
          return [propPatient, ...prev];
        }
        return prev.map(p => p.id === propPatient.id ? { ...p, ...propPatient } : p);
      });
      if (!selectedPatientId) {
        setSelectedPatientId(propPatient.id);
      }
    }
  }, [propPatientId, propPatient]);

  // Sync to storage
  useEffect(() => {
    storage.set('hms_medication_orders', medOrders);
  }, [medOrders]);

  useEffect(() => {
    storage.set('hms_iv_fluids', ivFluids);
  }, [ivFluids]);

  // Load patients list
  useEffect(() => {
    const rawHmsPats = storage.get('hms_patients', []);
    const rawPats = storage.get('patients', []);
    const combined = [...(Array.isArray(rawHmsPats) ? rawHmsPats : []), ...(Array.isArray(rawPats) ? rawPats : [])];
    if (propPatient) combined.unshift(propPatient);

    const uniqueMap = new Map();
    combined.forEach(p => {
      if (p && p.id && !uniqueMap.has(p.id)) {
        uniqueMap.set(p.id, p);
      }
    });
    const uniquePats = Array.from(uniqueMap.values());

    if (uniquePats.length > 0) {
      setPatients(uniquePats);
      if (!selectedPatientId) {
        setSelectedPatientId(uniquePats[0].id);
      }
    } else {
      const mockPats = [
        { id: 'p-1', name: 'Ramesh Chandra Verma', mrn: 'MRN-2026-001', bed: 'Bed W-101', age: 48, gender: 'Male', doctor: 'Dr. Rajesh Sharma', allergies: 'Penicillin (Severe Rash)', diagnosis: 'Acute Cholecystitis, Type 2 DM' },
        { id: 'p-2', name: 'Sunita Devi', mrn: 'MRN-2026-045', bed: 'Bed W-102', age: 36, gender: 'Female', doctor: 'Dr. Vikramaditya', allergies: 'NSAIDs', diagnosis: 'Post-Op Laporoscopic Cholecystectomy' },
        { id: 'p-3', name: 'Amit Kumar Dubey', mrn: 'MRN-2026-092', bed: 'ICU Bed 1', age: 52, gender: 'Male', doctor: 'Dr. P. K. Mishra', allergies: 'No Known Allergies (NKDA)', diagnosis: 'Acute Anterior Wall MI' }
      ];
      setPatients(mockPats);
      if (!selectedPatientId) {
        setSelectedPatientId('p-1');
      }
    }
  }, []);

  // Resolve current Patient profile safely
  const selectedPatient = (propPatient && (propPatient.id === selectedPatientId || !selectedPatientId))
    ? propPatient
    : patients.find(p => p.id === selectedPatientId || p.patient_id === selectedPatientId)
    || propPatient
    || patients[0]
    || {
      id: selectedPatientId || 'p-1',
      name: 'Patient',
      mrn: 'MRN-2026-001',
      bed: 'Bed W-101',
      age: 48,
      gender: 'Male',
      doctor: 'Dr. Rajesh Sharma',
      allergies: 'No Known Drug Allergies (NKDA)',
      diagnosis: 'N/A'
    };

  const bedLabel = selectedPatient.bed || selectedPatient.bed_number || selectedPatient.bedNumber || selectedPatient.room || 'Bed W-101';
  const patientName = selectedPatient.name || selectedPatient.patient_name || selectedPatient.full_name || 'Patient';
  const mrn = selectedPatient.mrn || selectedPatient.uhid || selectedPatient.uhid_number || selectedPatient.patient_id || selectedPatient.id || 'N/A';
  const age = selectedPatient.age || selectedPatient.age_years || 'N/A';
  const gender = selectedPatient.gender || selectedPatient.sex || 'N/A';
  const doctor = selectedPatient.doctor || selectedPatient.attending_doctor || selectedPatient.doctor_name || 'Attending Physician';
  const allergies = selectedPatient.allergies || selectedPatient.allergy || 'No Known Drug Allergies (NKDA)';

  // Filter orders for selected patient
  const activePatientId = selectedPatient.id || selectedPatientId;
  const patientMedOrders = medOrders.filter(m => 
    m.patientId === activePatientId || 
    m.patientId === selectedPatientId ||
    (selectedPatient.patient_id && m.patientId === selectedPatient.patient_id)
  );
  const patientIvFluids = ivFluids.filter(i => 
    i.patientId === activePatientId || 
    i.patientId === selectedPatientId ||
    (selectedPatient.patient_id && i.patientId === selectedPatient.patient_id)
  );

  // Compute metrics for today
  const totalDueToday = patientMedOrders.reduce((acc, order) => acc + order.scheduledTimes.length, 0);
  let totalGivenToday = 0;
  let totalHeldToday = 0;
  let totalPendingToday = 0;

  patientMedOrders.forEach(order => {
    order.scheduledTimes.forEach(time => {
      const logKey = `${selectedDate}_${time}`;
      const log = order.doseLogs[logKey];
      if (log && log.status === 'GIVEN') totalGivenToday++;
      else if (log && (log.status === 'HELD' || log.status === 'REFUSED')) totalHeldToday++;
      else totalPendingToday++;
    });
  });

  // Action: Open dose administration modal
  const handleOpenDoseModal = (order: MedicationOrder, slotTime: string) => {
    const logKey = `${selectedDate}_${slotTime}`;
    const existing = order.doseLogs[logKey];

    setActiveDoseTarget({ order, slotTime, existingSlot: existing });
    setDoseForm({
      action: (existing?.status as any) || (order.isContinuousInfusion ? 'GIVEN' : 'GIVEN'),
      nurseName: existing?.givenBy || 'Nurse Priya S.',
      preCheckVital: existing?.preCheckVital || '',
      remarks: existing?.remarks || '',
      infusionRate: existing?.infusionRate || order.infusionRate || '5 ml/hr'
    });
    setIsGiveDoseDialogOpen(true);
  };

  // Save dose log
  const handleSaveDoseLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDoseTarget) return;

    const { order, slotTime } = activeDoseTarget;
    const logKey = `${selectedDate}_${slotTime}`;

    const newLog: DoseSlot = {
      time: slotTime,
      status: doseForm.action,
      givenAt: `${selectedDate} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      givenBy: doseForm.nurseName || 'Shift Nurse',
      preCheckVital: doseForm.preCheckVital,
      remarks: doseForm.remarks,
      infusionRate: order.isContinuousInfusion ? (doseForm.infusionRate || order.infusionRate) : undefined
    };

    const updatedOrders = medOrders.map(o => {
      if (o.id === order.id) {
        return {
          ...o,
          doseLogs: {
            ...o.doseLogs,
            [logKey]: newLog
          }
        };
      }
      return o;
    });

    setMedOrders(updatedOrders);
    setIsGiveDoseDialogOpen(false);
    toast.success(`${order.isContinuousInfusion ? 'Continuous Infusion Check' : 'Dose'} (${slotTime}) recorded as ${doseForm.action} for ${order.drugName}`);
  };

  // Add new Medication Order
  const handleCreateMedOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderForm.drugName || !newOrderForm.dosage) {
      toast.error('Drug Name and Dosage are required');
      return;
    }

    const isContinuous = newOrderForm.orderCategory === 'Continuous Infusion' || 
      !!newOrderForm.isContinuousInfusion || 
      newOrderForm.route?.includes('Continuous') || 
      newOrderForm.frequency?.includes('Continuous');

    const defaultContinuousTimes = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00', '00:00', '02:00', '04:00'];

    const created: MedicationOrder = {
      id: `med-${Date.now()}`,
      patientId: selectedPatientId,
      drugName: newOrderForm.drugName.trim(),
      dosage: newOrderForm.dosage.trim(),
      orderCategory: isContinuous ? 'Continuous Infusion' : 'Standard',
      isContinuousInfusion: isContinuous,
      infusionRate: isContinuous ? (newOrderForm.infusionRate || '5 ml/hr') : undefined,
      diluentVehicle: isContinuous ? (newOrderForm.diluentVehicle || 'in 50ml NS via Syringe Pump') : undefined,
      targetGoal: newOrderForm.targetGoal || undefined,
      route: (newOrderForm.route as any) || (isContinuous ? 'Continuous IV Infusion' : 'Oral'),
      frequency: (newOrderForm.frequency as any) || (isContinuous ? 'Continuous (24 Hrs)' : 'BD (Twice Daily)'),
      scheduledTimes: newOrderForm.scheduledTimes && newOrderForm.scheduledTimes.length > 0 
        ? newOrderForm.scheduledTimes 
        : (isContinuous ? defaultContinuousTimes : ['08:00', '20:00']),
      prescribedBy: newOrderForm.prescribedBy || 'Attending Physician',
      startDate: newOrderForm.startDate || new Date().toISOString().substring(0, 10),
      instructions: newOrderForm.instructions || '',
      isHighAlert: isContinuous ? (newOrderForm.isHighAlert ?? true) : !!newOrderForm.isHighAlert,
      status: 'ACTIVE',
      doseLogs: {}
    };

    setMedOrders([created, ...medOrders]);
    setIsNewMedDialogOpen(false);
    toast.success(`New order for ${created.drugName} (${isContinuous ? 'Continuous Infusion' : 'Medication'}) added to chart!`);
  };

  // Add new IV Fluid
  const handleCreateIvFluid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIvForm.fluidName) {
      toast.error('Fluid Name is required');
      return;
    }

    const created: IVFluidOrder = {
      id: `iv-${Date.now()}`,
      patientId: selectedPatientId,
      fluidName: newIvForm.fluidName,
      additive: newIvForm.additive || '',
      rate: newIvForm.rate || '75 ml/hr',
      startTime: `${selectedDate} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      expectedEndTime: `${selectedDate} 06:00 PM`,
      status: 'RUNNING',
      nurseInCharge: newIvForm.nurseInCharge || 'Duty Nurse',
      volumeInfusedMl: 50,
      totalVolumeMl: newIvForm.totalVolumeMl || 500
    };

    setIvFluids([created, ...ivFluids]);
    setIsNewIvDialogOpen(false);
    toast.success(`IV Fluid drip ${created.fluidName} registered!`);
  };

  // Stop Medication Order
  const handleStopMedication = (orderId: string) => {
    if (!window.confirm('Discontinue this medication order?')) return;
    setMedOrders(medOrders.map(o => o.id === orderId ? { ...o, status: 'DISCONTINUED' as const } : o));
    toast.info('Medication order discontinued');
  };

  // Print Daily 24-Hour Treatment Sheet & MAR Report
  const printDailyTreatmentSheet = () => {
    const hospInfo = storage.get(STORAGE_KEYS.HOSPITAL_INFO, {
      name: 'Gastro Plus Hospital',
      address: 'Plot No. 7 & 8, Om Shiv Nagar, Gufa Mandir Road, Lal Ghati Bhopal, 462030, Madhya Pradesh',
      phone: '9109102145/9109101246',
      email: 'gatroplusbhopal@gmail.com',
      logo: null as string | null
    });

    const hospName = hospInfo?.name || 'Gastro Plus Hospital';
    const hospAddr = hospInfo?.address || 'Plot No. 7 & 8, Om Shiv Nagar, Gufa Mandir Road, Lal Ghati Bhopal, 462030, Madhya Pradesh';
    const hospPhone = hospInfo?.phone || '9109102145/9109101246';
    const hospEmail = hospInfo?.email || 'gatroplusbhopal@gmail.com';
    const hospLogo = hospInfo?.logo;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>24-Hour Treatment Sheet & MAR - ${patientName} (${selectedDate})</title>
          <meta charset="utf-8" />
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm 8mm 8mm 8mm;
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
              font-size: 11px;
              line-height: 1.35;
            }
            .header-container {
              border-bottom: 2px solid #0f766e;
              padding-bottom: 8px;
              margin-bottom: 10px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .hosp-title {
              font-size: 19px;
              font-weight: 800;
              color: #0f766e;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin: 0 0 2px 0;
            }
            .hosp-sub {
              font-size: 10.5px;
              color: #475569;
              margin: 0;
            }
            .report-badge-box {
              text-align: right;
            }
            .report-title-badge {
              font-size: 12px;
              font-weight: 800;
              color: #0f766e;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              background: #f0fdfa;
              padding: 4px 10px;
              border-radius: 4px;
              border: 1px solid #ccfbf1;
              display: inline-block;
            }
            .patient-meta-grid {
              display: grid;
              grid-template-columns: repeat(6, 1fr);
              gap: 6px;
              background: #f8fafc;
              border: 1px solid #cbd5e1;
              border-radius: 6px;
              padding: 8px 10px;
              margin-bottom: 10px;
            }
            .meta-item {
              font-size: 10.5px;
            }
            .meta-lbl {
              font-size: 8.5px;
              font-weight: 700;
              color: #64748b;
              text-transform: uppercase;
              margin-bottom: 1px;
            }
            .meta-val {
              font-weight: 800;
              color: #0f172a;
            }
            .allergy-banner {
              grid-column: span 6;
              background: #fff1f2;
              border: 1px solid #fecdd3;
              border-radius: 4px;
              padding: 4px 8px;
              color: #9f1239;
              font-weight: 700;
              font-size: 10px;
              margin-top: 3px;
              display: flex;
              align-items: center;
              justify-content: space-between;
            }
            .kpi-stat-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 6px;
              margin-bottom: 10px;
            }
            .kpi-pill {
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 5px 8px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              background: #fafafa;
            }
            .kpi-lbl {
              font-size: 9px;
              text-transform: uppercase;
              font-weight: 700;
              color: #64748b;
            }
            .kpi-num {
              font-size: 13px;
              font-weight: 800;
            }
            .section-header-bar {
              font-size: 11px;
              font-weight: 800;
              color: #ffffff;
              background: #0f766e;
              padding: 5px 8px;
              border-radius: 4px 4px 0 0;
              text-transform: uppercase;
              letter-spacing: 0.4px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-top: 10px;
            }
            table.mar-print-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 10px;
              font-size: 9.5px;
            }
            table.mar-print-table th {
              background-color: #f1f5f9;
              color: #1e293b;
              font-weight: 700;
              font-size: 9px;
              text-transform: uppercase;
              letter-spacing: 0.3px;
              padding: 5px 6px;
              text-align: left;
              border: 1px solid #cbd5e1;
            }
            table.mar-print-table td {
              padding: 5px 6px;
              border: 1px solid #cbd5e1;
              vertical-align: top;
            }
            table.mar-print-table tr:nth-child(even) {
              background-color: #f8fafc;
            }
            .high-alert-pill {
              display: inline-block;
              background: #fee2e2;
              color: #991b1b;
              font-size: 7.5px;
              font-weight: 900;
              padding: 1px 4px;
              border-radius: 3px;
              border: 1px solid #fca5a5;
              text-transform: uppercase;
              margin-right: 4px;
            }
            .route-pill {
              display: inline-block;
              background: #f1f5f9;
              color: #334155;
              font-size: 8.5px;
              font-weight: 700;
              padding: 1px 4px;
              border-radius: 3px;
              border: 1px solid #cbd5e1;
            }
            .slots-container {
              display: flex;
              flex-wrap: wrap;
              gap: 4px;
            }
            .time-slot-card {
              display: inline-flex;
              flex-direction: column;
              border-radius: 4px;
              padding: 3px 6px;
              font-size: 8.5px;
              border: 1px solid #cbd5e1;
              background: #ffffff;
              min-width: 90px;
            }
            .time-slot-card.given {
              background: #f0fdf4;
              border-color: #86efac;
              color: #166534;
            }
            .time-slot-card.due {
              background: #fefce8;
              border-color: #fde047;
              color: #854d0e;
            }
            .time-slot-card.held {
              background: #faf5ff;
              border-color: #d8b4fe;
              color: #6b21a8;
            }
            .slot-header-line {
              font-weight: 800;
              font-size: 9px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 1px dashed rgba(0,0,0,0.15);
              padding-bottom: 1px;
              margin-bottom: 1px;
            }
            .slot-badge-text {
              font-size: 7.5px;
              font-weight: 800;
              text-transform: uppercase;
            }
            .slot-nurse-info {
              font-size: 8px;
              color: #1e293b;
              font-weight: 600;
            }
            .slot-vital-info {
              font-size: 7.5px;
              color: #047857;
              font-weight: 700;
            }
            .slot-remark-info {
              font-size: 7.5px;
              color: #475569;
              font-style: italic;
            }
            .shift-notes-container {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 6px;
              margin-top: 8px;
              margin-bottom: 8px;
            }
            .shift-card {
              border: 1px solid #cbd5e1;
              border-radius: 4px;
              padding: 6px;
              background: #fafafa;
              font-size: 9px;
              min-height: 55px;
            }
            .shift-hdr {
              font-weight: 800;
              font-size: 9.5px;
              color: #0f766e;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 2px;
              margin-bottom: 3px;
              text-transform: uppercase;
            }
            .signatures-row {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 8px;
              margin-top: 18px;
              padding-top: 6px;
            }
            .sig-item-box {
              border-top: 1px dashed #64748b;
              padding-top: 4px;
              text-align: center;
              font-size: 8.5px;
              font-weight: 700;
              color: #334155;
            }
            .footer-disclaimer {
              text-align: center;
              font-size: 8px;
              color: #94a3b8;
              margin-top: 8px;
            }
          </style>
        </head>
        <body onload="window.print();">
          <div class="header-container">
            <div style="display: flex; align-items: center; gap: 10px;">
              ${hospLogo ? `<img src="${hospLogo}" style="height: 42px; width: auto; max-width: 100px; object-contain: contain;" />` : ''}
              <div>
                <h1 class="hosp-title">${hospName}</h1>
                <p class="hosp-sub">${hospAddr} | Ph: ${hospPhone} | Email: ${hospEmail}</p>
              </div>
            </div>
            <div class="report-badge-box">
              <div class="report-title-badge">24-HOUR TREATMENT SHEET & MAR</div>
              <div style="font-size: 9px; color: #64748b; margin-top: 2px;">
                Sheet Date: <strong>${selectedDate}</strong> | Ref: MAR-${mrn}-${selectedDate.replace(/-/g, '')}
              </div>
            </div>
          </div>

          <!-- Patient Demographics Banner -->
          <div class="patient-meta-grid">
            <div class="meta-item">
              <div class="meta-lbl">Bed / Room</div>
              <div class="meta-val" style="color: #0f766e;">${bedLabel}</div>
            </div>
            <div class="meta-item" style="grid-column: span 2;">
              <div class="meta-lbl">Patient Name</div>
              <div class="meta-val">${patientName}</div>
            </div>
            <div class="meta-item">
              <div class="meta-lbl">MRN / UHID</div>
              <div class="meta-val" style="font-family: monospace;">${mrn}</div>
            </div>
            <div class="meta-item">
              <div class="meta-lbl">Age / Gender</div>
              <div class="meta-val">${age} Y / ${gender}</div>
            </div>
            <div class="meta-item">
              <div class="meta-lbl">Attending Doctor</div>
              <div class="meta-val">${doctor}</div>
            </div>
            <div class="allergy-banner">
              <span><strong>⚠️ ALLERGIES & PRECAUTIONS:</strong> ${allergies}</span>
              <span><strong>DIAGNOSIS:</strong> ${selectedPatient.diagnosis || 'Clinical Inpatient Care'}</span>
            </div>
          </div>

          <!-- KPI Summary -->
          <div class="kpi-stat-grid">
            <div class="kpi-pill">
              <span class="kpi-lbl">Total Scheduled Doses</span>
              <span class="kpi-num" style="color: #334155;">${totalDueToday}</span>
            </div>
            <div class="kpi-pill" style="background: #f0fdf4; border-color: #bbf7d0;">
              <span class="kpi-lbl" style="color: #166534;">Administered (Given)</span>
              <span class="kpi-num" style="color: #166534;">${totalGivenToday}</span>
            </div>
            <div class="kpi-pill" style="background: #fefce8; border-color: #fef08a;">
              <span class="kpi-lbl" style="color: #854d0e;">Pending / Due Doses</span>
              <span class="kpi-num" style="color: #854d0e;">${totalPendingToday}</span>
            </div>
            <div class="kpi-pill" style="background: #faf5ff; border-color: #e9d5ff;">
              <span class="kpi-lbl" style="color: #6b21a8;">Held / Omitted</span>
              <span class="kpi-num" style="color: #6b21a8;">${totalHeldToday}</span>
            </div>
          </div>

          <!-- Section 1: 24-Hour Medication Administration Record (MAR Time Grid) -->
          <div class="section-header-bar">
            <span>24-Hour Medication Administration Record (MAR Time-Grid) - ${selectedDate}</span>
            <span style="font-size: 8.5px; text-transform: none;">● Administered &nbsp; ● Due/Scheduled &nbsp; ● Held/Omitted</span>
          </div>

          <table class="mar-print-table">
            <thead>
              <tr>
                <th style="width: 25%;">Medication & Order Details</th>
                <th style="width: 14%;">Route & Freq</th>
                <th style="width: 15%;">Prescriber</th>
                <th style="width: 36%;">Scheduled 24-Hour MAR Time Slots & Administration Audit</th>
                <th style="width: 10%; text-align: center;">Nurse Sign</th>
              </tr>
            </thead>
            <tbody>
              ${patientMedOrders.length === 0 ? `
                <tr>
                  <td colspan="5" style="text-align: center; padding: 15px; color: #64748b;">
                    No active medication orders prescribed for this patient bed.
                  </td>
                </tr>
              ` : patientMedOrders.map((order) => {
                const isDiscontinued = order.status === 'DISCONTINUED';
                const isContinuous = order.isContinuousInfusion || order.orderCategory === 'Continuous Infusion';

                return `
                  <tr style="${isDiscontinued ? 'opacity: 0.6; background-color: #f1f5f9;' : ''}">
                    <td>
                      <div>
                        ${order.isHighAlert ? `<span class="high-alert-pill">HIGH ALERT</span>` : ''}
                        ${isContinuous ? `<span style="display: inline-block; background: #0f766e; color: #ffffff; font-size: 7.5px; font-weight: 900; padding: 1px 4px; border-radius: 3px; margin-right: 4px; text-transform: uppercase;">CONTINUOUS INFUSION</span>` : ''}
                        <strong>${order.drugName}</strong>
                      </div>
                      <div style="font-size: 8.5px; color: #475569; margin-top: 1px;">
                        Dose / Strength: <strong>${order.dosage}</strong>
                      </div>
                      ${isContinuous && order.infusionRate ? `
                        <div style="font-size: 8px; color: #0f766e; font-weight: 700; margin-top: 1px;">
                          Flow Rate: <strong>${order.infusionRate}</strong> ${order.diluentVehicle ? `| ${order.diluentVehicle}` : ''}
                        </div>
                      ` : ''}
                      ${isContinuous && order.targetGoal ? `
                        <div style="font-size: 8px; color: #b45309; font-weight: 700;">
                          Target Goal: ${order.targetGoal}
                        </div>
                      ` : ''}
                      ${order.instructions ? `
                        <div style="font-size: 8px; color: #4338ca; background: #eef2ff; border: 1px solid #e0e7ff; padding: 1px 4px; border-radius: 2px; margin-top: 2px;">
                          ${order.instructions}
                        </div>
                      ` : ''}
                      ${isDiscontinued ? `<div style="color: #b91c1c; font-weight: 800; font-size: 8px; margin-top: 2px;">[DISCONTINUED]</div>` : ''}
                    </td>
                    <td>
                      <span class="route-pill">${order.route}</span>
                      <div style="font-size: 8.5px; color: #475569; margin-top: 2px; font-weight: 600;">
                        ${order.frequency}
                      </div>
                    </td>
                    <td>
                      <strong>${order.prescribedBy}</strong>
                      <div style="font-size: 8px; color: #64748b;">Start: ${order.startDate}</div>
                    </td>
                    <td>
                      <div class="slots-container">
                        ${order.scheduledTimes.map(time => {
                          const logKey = `${selectedDate}_${time}`;
                          const log = order.doseLogs[logKey];
                          const isGiven = log?.status === 'GIVEN' || log?.status === 'RUNNING' || log?.status === 'TITRATED';
                          const isHeld = log?.status === 'HELD' || log?.status === 'REFUSED';
                          const statusClass = isGiven ? 'given' : isHeld ? 'held' : 'due';
                          const statusLabel = isGiven ? (log?.status === 'TITRATED' ? 'Titrated' : isContinuous ? 'Running' : 'Given') : isHeld ? (log?.status || 'Held') : (isContinuous ? 'Check Due' : 'Due');

                          return `
                            <div class="time-slot-card ${statusClass}">
                              <div class="slot-header-line">
                                <span>${time}</span>
                                <span class="slot-badge-text">${statusLabel}</span>
                              </div>
                              ${isGiven ? `
                                <div class="slot-nurse-info">${log?.givenBy || 'Staff Nurse'}</div>
                                ${log?.infusionRate ? `<div style="font-size: 7.5px; color: #0f766e; font-weight: 700;">Rate: ${log.infusionRate}</div>` : ''}
                                ${log?.preCheckVital ? `<div class="slot-vital-info">${log.preCheckVital}</div>` : ''}
                                ${log?.remarks ? `<div class="slot-remark-info">${log.remarks}</div>` : ''}
                              ` : isHeld ? `
                                <div class="slot-nurse-info">${log?.givenBy || 'Nurse'}</div>
                                ${log?.remarks ? `<div class="slot-remark-info">${log.remarks}</div>` : ''}
                              ` : `
                                <div style="font-size: 7.5px; color: #854d0e;">${isContinuous ? 'Rate Audit Due' : 'Pending Dose'}</div>
                              `}
                            </div>
                          `;
                        }).join('')}
                      </div>
                    </td>
                    <td style="text-align: center; vertical-align: middle;">
                      <div style="border-bottom: 1px dotted #94a3b8; width: 80%; margin: 0 auto; height: 16px;"></div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <!-- Section 2: IV Fluids & Continuous Infusion Monitoring -->
          <div class="section-header-bar" style="background: #0891b2;">
            <span>IV Fluids & Continuous Infusion Monitoring</span>
            <span style="font-size: 8.5px; text-transform: none;">Parenteral Nutrition, Flow Rates & Infused Volumes</span>
          </div>

          <table class="mar-print-table">
            <thead>
              <tr>
                <th style="width: 25%;">IV Fluid / Drip</th>
                <th style="width: 18%;">Additives / Meds</th>
                <th style="width: 12%;">Flow Rate</th>
                <th style="width: 16%;">Start / Exp. Time</th>
                <th style="width: 17%;">Infusion Progress</th>
                <th style="width: 12%;">Nurse In-Charge</th>
              </tr>
            </thead>
            <tbody>
              ${patientIvFluids.length === 0 ? `
                <tr>
                  <td colspan="6" style="text-align: center; padding: 8px; color: #64748b;">
                    No active parenteral IV fluids running for this patient bed.
                  </td>
                </tr>
              ` : patientIvFluids.map(iv => {
                const percent = Math.min(100, Math.round((iv.volumeInfusedMl / iv.totalVolumeMl) * 100));

                return `
                  <tr>
                    <td><strong>${iv.fluidName}</strong></td>
                    <td style="color: #4338ca; font-weight: 600;">${iv.additive || 'Plain Fluid'}</td>
                    <td style="font-family: monospace; font-weight: 700; color: #0e7490;">${iv.rate}</td>
                    <td style="font-size: 8.5px;">${iv.startTime}</td>
                    <td>
                      <div style="font-weight: 700; font-size: 9px;">${iv.volumeInfusedMl} / ${iv.totalVolumeMl} ml (${percent}%)</div>
                    </td>
                    <td>${iv.nurseInCharge}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <!-- Section 3: Nursing Shift Notes & Clinical Observations -->
          <div class="shift-notes-container">
            <div class="shift-card">
              <div class="shift-hdr">Morning Shift (07:00 - 15:00)</div>
              <div style="color: #64748b; font-size: 8px; font-style: italic;">
                Vitals checked, AM doses administered, IV cannula site clean & patent.
              </div>
            </div>
            <div class="shift-card">
              <div class="shift-hdr">Evening Shift (15:00 - 23:00)</div>
              <div style="color: #64748b; font-size: 8px; font-style: italic;">
                PM doses & fluids maintained. GRBS pre-checked where indicated.
              </div>
            </div>
            <div class="shift-card">
              <div class="shift-hdr">Night Shift (23:00 - 07:00)</div>
              <div style="color: #64748b; font-size: 8px; font-style: italic;">
                Night sedation & antibiotics given. Fluid balance monitored.
              </div>
            </div>
          </div>

          <!-- Section 4: Institutional Signatures -->
          <div class="signatures-row">
            <div class="sig-item-box">Staff Nurse (Morning Shift)</div>
            <div class="sig-item-box">Staff Nurse (Evening Shift)</div>
            <div class="sig-item-box">Staff Nurse (Night Shift)</div>
            <div class="sig-item-box">Duty Medical Officer / Consultant</div>
          </div>

          <div class="footer-disclaimer">
            This is an official clinical Inpatient Medication Administration Record generated by ${hospName} HMS on ${new Date().toLocaleString()}.
          </div>
        </body>
      </html>
    `;

    printHTML(html);
  };

  return (
    <div className={`space-y-6 ${embedded ? 'p-0' : 'p-4 md:p-6 max-w-[1600px] mx-auto pb-24'}`}>
      
      {/* Banner / Patient Header */}
      <div className="bg-gradient-to-r from-[#1A5E63] via-[#0F4C50] to-[#2B7A7E] p-5 rounded-2xl text-white shadow-lg border border-teal-700/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Pill className="w-6 h-6 text-teal-200 animate-pulse" />
              <h1 className="text-xl font-black tracking-tight">Nursing Medication Administration Record (MAR)</h1>
            </div>
            <p className="text-teal-100/90 text-xs">
              24-Hour Time-Grid Dose Scheduling, High-Alert Safeguards & IV Drip Maintenance
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Patient Selector / Embedded Indicator */}
            {embedded ? (
              <div className="flex items-center gap-2 bg-teal-900/60 px-3 py-1.5 rounded-xl border border-teal-600/60 text-xs shadow-sm">
                <User className="w-4 h-4 text-teal-200" />
                <span className="font-bold text-teal-100">Patient:</span>
                <span className="font-extrabold text-white bg-teal-950/80 px-2 py-0.5 rounded border border-teal-500/50">
                  {patientName} ({bedLabel})
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-teal-900/70 px-3 py-1.5 rounded-xl border border-teal-700">
                <User className="w-4 h-4 text-teal-200" />
                <span className="text-xs font-bold text-teal-100">Select Patient Bed:</span>
                <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                  <SelectTrigger className="w-60 h-8 text-xs bg-teal-950 border-teal-600 text-white font-bold">
                    <SelectValue placeholder="Choose Bed" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map(p => {
                      const pBed = p.bed || p.bed_number || p.room || 'Ward';
                      const pName = p.name || p.patient_name || 'Patient';
                      const pMrn = p.mrn || p.uhid || p.id;
                      return (
                        <SelectItem key={p.id} value={p.id} className="text-xs font-bold">
                          {pBed} - {pName} ({pMrn})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Date Selector */}
            <div className="flex items-center gap-2 bg-teal-900/70 px-3 py-1.5 rounded-xl border border-teal-700">
              <Calendar className="w-4 h-4 text-amber-300" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-8 w-36 text-xs bg-teal-950 border-teal-600 text-white font-bold"
              />
            </div>

            <Button
              onClick={printDailyTreatmentSheet}
              variant="outline"
              className="bg-white/10 text-white border-white/25 hover:bg-white hover:text-teal-900 font-bold text-xs h-9 px-3 rounded-xl shadow-xs gap-1.5 backdrop-blur-xs"
              title="Print 24-Hour Treatment Sheet & MAR Report for this patient"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              Print Treatment Sheet
            </Button>

            <Button
              onClick={() => setIsNewMedDialogOpen(true)}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs h-9 px-3.5 rounded-xl shadow-md border border-amber-400"
            >
              <Plus className="w-4 h-4 mr-1.5 stroke-[3]" />
              Add Medication Order
            </Button>
          </div>
        </div>

        {/* Selected Patient Banner Details */}
        <div className="mt-4 pt-4 border-t border-teal-700/50 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-teal-200/80">Bed / Room</span>
            <p className="font-extrabold text-amber-300 text-sm">{bedLabel}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-teal-200/80">Patient Name</span>
            <p className="font-extrabold text-white text-sm">{patientName}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-teal-200/80">MRN / Demographics</span>
            <p className="font-mono text-teal-100">{mrn} • {age}Y/{gender}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-teal-200/80">Attending Doctor</span>
            <p className="font-semibold text-teal-50">{doctor}</p>
          </div>
          <div className="col-span-2">
            <span className="text-[10px] uppercase font-bold text-rose-300 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-rose-300" />
              Allergies & Precautions
            </span>
            <p className="font-bold text-rose-100 truncate">{allergies}</p>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Total Scheduled Doses</p>
              <p className="text-xl font-black text-slate-800 mt-0.5">{totalDueToday}</p>
            </div>
            <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Doses Administered</p>
              <p className="text-xl font-black text-emerald-700 mt-0.5">{totalGivenToday}</p>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
              <CheckCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Pending / Due Now</p>
              <p className="text-xl font-black text-amber-600 mt-0.5">{totalPendingToday}</p>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl">
              <Activity className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Held / Omitted</p>
              <p className="text-xl font-black text-purple-700 mt-0.5">{totalHeldToday}</p>
            </div>
            <div className="p-2.5 bg-purple-50 text-purple-700 rounded-xl">
              <AlertCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main MAR Grid Card */}
      <Card className="border-none shadow-sm bg-white">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Pill className="w-4 h-4 text-indigo-600" />
              24-Hour Treatment Sheet & MAR Time Grid ({selectedDate})
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Click on any time-slot pill to record dose administration, pre-check vitals, or hold reasons.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1 text-emerald-700">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span> Administered
              </span>
              <span className="flex items-center gap-1 text-amber-700">
                <span className="w-2.5 h-2.5 bg-amber-500 rounded-full"></span> Scheduled / Due
              </span>
              <span className="flex items-center gap-1 text-purple-700">
                <span className="w-2.5 h-2.5 bg-purple-500 rounded-full"></span> Held / Omitted
              </span>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={printDailyTreatmentSheet}
              className="h-8 gap-1.5 border-teal-600 text-teal-800 hover:bg-teal-50 font-bold text-xs px-3 rounded-lg shadow-xs"
              title="Print Daily 24-Hour Treatment Sheet & MAR Time Grid"
            >
              <Printer className="w-3.5 h-3.5 text-teal-700" />
              Print MAR Report
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-[#1A5E63] via-[#0F4C50] to-[#2B7A7E] text-white font-bold border-b border-teal-800/40">
                  <th className="py-3 px-4 min-w-[240px]">Medication & Order Details</th>
                  <th className="py-3 px-4 min-w-[110px]">Route & Freq</th>
                  <th className="py-3 px-4 min-w-[130px]">Prescriber</th>
                  <th className="py-3 px-4 text-center min-w-[650px]">
                    Scheduled 24-Hour MAR Time Slots
                  </th>
                  <th className="py-3 px-4 text-right min-w-[90px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {patientMedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <Pill className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="font-semibold">No active medication orders prescribed for this patient bed.</p>
                      <p className="text-[11px]">Click "Add Medication Order" above to issue a new treatment order.</p>
                    </td>
                  </tr>
                ) : (
                  patientMedOrders.map((order) => {
                    const isStopped = order.status === 'DISCONTINUED';
                    const isContinuous = order.isContinuousInfusion || order.orderCategory === 'Continuous Infusion';

                    return (
                      <tr key={order.id} className={`hover:bg-slate-50/80 transition-colors ${isStopped ? 'opacity-50 bg-slate-50' : ''} ${isContinuous ? 'bg-teal-50/20' : ''}`}>
                        
                        {/* Drug Name & Instructions */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs flex-wrap">
                            {order.isHighAlert && (
                              <Badge variant="destructive" className="text-[8px] px-1 py-0 uppercase font-black tracking-wider">
                                High Alert
                              </Badge>
                            )}
                            {isContinuous && (
                              <Badge className="bg-teal-700 hover:bg-teal-800 text-white text-[8px] px-1.5 py-0 uppercase font-black tracking-wider flex items-center gap-1">
                                <Activity className="w-2.5 h-2.5" />
                                Continuous Infusion
                              </Badge>
                            )}
                            <span>{order.drugName}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium mt-0.5">Dose: {order.dosage}</p>
                          
                          {isContinuous && (
                            <div className="mt-1 space-y-0.5 text-[10px]">
                              {order.infusionRate && (
                                <p className="text-teal-800 font-bold bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded inline-block">
                                  Flow Rate: <span className="font-mono">{order.infusionRate}</span>
                                </p>
                              )}
                              {order.diluentVehicle && (
                                <p className="text-slate-600 font-medium">
                                  Vehicle: {order.diluentVehicle}
                                </p>
                              )}
                              {order.targetGoal && (
                                <p className="text-amber-800 font-bold bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded inline-block">
                                  Target: {order.targetGoal}
                                </p>
                              )}
                            </div>
                          )}

                          {order.instructions && (
                            <p className="text-[10px] text-indigo-700 bg-indigo-50/60 px-1.5 py-0.5 rounded border border-indigo-100 mt-1 max-w-[280px]">
                              {order.instructions}
                            </p>
                          )}
                        </td>

                        {/* Route & Frequency */}
                        <td className="py-3.5 px-4 font-semibold">
                          <Badge variant="outline" className={`text-[10px] font-bold ${isContinuous ? 'border-teal-300 text-teal-800 bg-teal-50/50' : 'border-slate-300'}`}>
                            {order.route}
                          </Badge>
                          <p className="text-[10px] text-slate-500 mt-1 font-mono">{order.frequency}</p>
                          {isContinuous && (
                            <span className="inline-block mt-1 text-[9px] text-teal-700 font-bold bg-teal-100/60 px-1 py-0.2 rounded">
                              24h Continuous Drip
                            </span>
                          )}
                        </td>

                        {/* Doctor */}
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-800 text-[11px]">{order.prescribedBy}</p>
                          <p className="text-[9px] text-slate-400">Start: {order.startDate}</p>
                        </td>

                        {/* Time Slot Grid */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-2 flex-wrap">
                            {order.scheduledTimes.map((timeSlot) => {
                              const logKey = `${selectedDate}_${timeSlot}`;
                              const log = order.doseLogs[logKey];

                              let btnStyle = isContinuous 
                                ? "bg-teal-50 text-teal-900 border-teal-300 hover:bg-teal-100" 
                                : "bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200";
                              let label = isContinuous ? `${timeSlot} (Check)` : `${timeSlot} (Due)`;

                              if (log) {
                                if (log.status === 'GIVEN' || log.status === 'RUNNING') {
                                  btnStyle = "bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-sm";
                                  label = isContinuous ? `${timeSlot} ✓ Running` : `${timeSlot} ✓ Given`;
                                } else if (log.status === 'TITRATED') {
                                  btnStyle = "bg-cyan-600 text-white border-cyan-700 hover:bg-cyan-700 shadow-sm";
                                  label = `${timeSlot} ⚡ Titrated`;
                                } else if (log.status === 'HELD' || log.status === 'REFUSED') {
                                  btnStyle = "bg-purple-600 text-white border-purple-700 hover:bg-purple-700";
                                  label = isContinuous ? `${timeSlot} ⏸ Paused` : `${timeSlot} (Held)`;
                                } else if (log.status === 'COMPLETED') {
                                  btnStyle = "bg-blue-600 text-white border-blue-700 hover:bg-blue-700 shadow-sm";
                                  label = `${timeSlot} 🔄 Replaced`;
                                }
                              }

                              return (
                                <button
                                  key={timeSlot}
                                  disabled={isStopped}
                                  onClick={() => handleOpenDoseModal(order, timeSlot)}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all flex flex-col items-center gap-0.5 shadow-2xs ${btnStyle}`}
                                  title={log ? `${log.status} at ${log.givenAt} by ${log.givenBy}${log.infusionRate ? ` (Rate: ${log.infusionRate})` : ''}` : `Click to verify ${order.drugName} at ${timeSlot}`}
                                >
                                  <span>{label}</span>
                                  {log?.infusionRate ? (
                                    <span className="text-[8px] bg-black/20 px-1 rounded truncate max-w-[85px]">{log.infusionRate}</span>
                                  ) : log?.givenBy ? (
                                    <span className="text-[8px] opacity-80 truncate max-w-[80px]">{log.givenBy}</span>
                                  ) : null}
                                </button>
                              );
                            })}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          {isStopped ? (
                            <Badge variant="outline" className="text-[9px] text-slate-400 border-slate-300">
                              Discontinued
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-[10px] font-bold px-2"
                              onClick={() => handleStopMedication(order.id)}
                            >
                              Stop
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

      {/* IV Fluids & Infusions Section */}
      <Card className="border-none shadow-sm bg-white">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Droplet className="w-4 h-4 text-cyan-600" />
              IV Fluids & Continuous Infusion Monitoring
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Track active parenteral IV drips, additives, flow rates, and volume infused.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={printDailyTreatmentSheet}
              className="bg-white border-cyan-300 text-cyan-800 hover:bg-cyan-50 font-bold text-xs h-8 px-3 rounded-lg gap-1.5 shadow-xs"
              title="Print IV Fluids and Inpatient Treatment Sheet"
            >
              <Printer className="w-3.5 h-3.5 text-cyan-700" />
              Print Sheet
            </Button>
            <Button
              size="sm"
              onClick={() => setIsNewIvDialogOpen(true)}
              className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs h-8 px-3 rounded-lg"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              New IV Drip Order
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-4">IV Fluid / Drip</th>
                  <th className="py-2.5 px-4">Additives / Meds</th>
                  <th className="py-2.5 px-4">Flow Rate</th>
                  <th className="py-2.5 px-4">Start Time</th>
                  <th className="py-2.5 px-4">Infusion Progress</th>
                  <th className="py-2.5 px-4">Nurse In-Charge</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {patientIvFluids.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-400">
                      No active IV fluids running for this patient bed.
                    </td>
                  </tr>
                ) : (
                  patientIvFluids.map((iv) => {
                    const percent = Math.min(100, Math.round((iv.volumeInfusedMl / iv.totalVolumeMl) * 100));

                    return (
                      <tr key={iv.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {iv.fluidName}
                        </td>
                        <td className="py-3 px-4 font-semibold text-indigo-700">
                          {iv.additive || 'Plain Fluid'}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-cyan-800">
                          {iv.rate}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {iv.startTime}
                        </td>
                        <td className="py-3 px-4">
                          <div className="w-44 space-y-1">
                            <div className="flex justify-between text-[10px] font-bold">
                              <span>{iv.volumeInfusedMl} / {iv.totalVolumeMl} ml</span>
                              <span className="text-cyan-700">{percent}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${percent}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">
                          {iv.nurseInCharge}
                        </td>
                        <td className="py-3 px-4 text-right space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px] px-2"
                            onClick={() => {
                              const newVol = Math.min(iv.totalVolumeMl, iv.volumeInfusedMl + 100);
                              setIvFluids(ivFluids.map(i => i.id === iv.id ? { ...i, volumeInfusedMl: newVol } : i));
                              toast.success('Added 100ml infused log!');
                            }}
                          >
                            +100ml
                          </Button>
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

      {/* DIALOG 1: Dose Log Administration Modal */}
      <Dialog open={isGiveDoseDialogOpen} onOpenChange={setIsGiveDoseDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              {activeDoseTarget?.order.isContinuousInfusion ? (
                <>
                  <Activity className="w-5 h-5 text-teal-600" />
                  Continuous Infusion Audit & Rate Check ({activeDoseTarget?.slotTime})
                </>
              ) : (
                <>
                  <Syringe className="w-5 h-5 text-indigo-600" />
                  Record Dose Administration ({activeDoseTarget?.slotTime})
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              <strong>{activeDoseTarget?.order.drugName}</strong> ({activeDoseTarget?.order.dosage}) - Route: {activeDoseTarget?.order.route}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveDoseLog} className="space-y-3 text-xs">
            {activeDoseTarget?.order.isHighAlert && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs flex gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">HIGH ALERT MEDICATION SAFEGUARD</p>
                  <p className="text-[11px] mt-0.5">Double-check drug concentration, dosage calculation, and patient identity before confirming.</p>
                </div>
              </div>
            )}

            {activeDoseTarget?.order.isContinuousInfusion && (
              <div className="p-2.5 bg-teal-50 border border-teal-200 rounded-xl text-teal-900 text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-teal-700" />
                    Continuous Infusion Order
                  </span>
                  <Badge className="bg-teal-700 text-white text-[9px]">24-Hour Continuous</Badge>
                </div>
                {activeDoseTarget.order.diluentVehicle && (
                  <p className="text-[11px] text-teal-800">
                    <strong>Delivery Device:</strong> {activeDoseTarget.order.diluentVehicle}
                  </p>
                )}
                {activeDoseTarget.order.targetGoal && (
                  <p className="text-[11px] text-amber-800 font-semibold">
                    <strong>Target Goal:</strong> {activeDoseTarget.order.targetGoal}
                  </p>
                )}
              </div>
            )}

            <div>
              <Label className="text-slate-700 font-bold">
                {activeDoseTarget?.order.isContinuousInfusion ? 'Infusion Status / Audit Action' : 'Action / Status'}
              </Label>
              <Select
                value={doseForm.action}
                onValueChange={(val: any) => setDoseForm({ ...doseForm, action: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {activeDoseTarget?.order.isContinuousInfusion ? (
                    <>
                      <SelectItem value="GIVEN">✓ Infusing at Target Rate (Verified & Monitored)</SelectItem>
                      <SelectItem value="TITRATED">⚡ Rate Adjusted / Titrated to Target</SelectItem>
                      <SelectItem value="HELD">⏸ Infusion Paused / Temporarily Held</SelectItem>
                      <SelectItem value="COMPLETED">🔄 Syringe / IV Bag Replaced & Running</SelectItem>
                      <SelectItem value="REFUSED">❌ Infusion Stopped / Refused</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="GIVEN">Administered (Given)</SelectItem>
                      <SelectItem value="HELD">Held / Omitted (Doctor Order / High Vital)</SelectItem>
                      <SelectItem value="REFUSED">Patient Refused</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {activeDoseTarget?.order.isContinuousInfusion && (doseForm.action === 'GIVEN' || doseForm.action === 'TITRATED' || doseForm.action === 'COMPLETED') && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <Label className="text-slate-700 font-bold">Current Infusion Flow Rate (ml/hr or mcg/min) *</Label>
                  <span className="text-[10px] text-teal-700 font-semibold">
                    Baseline: {activeDoseTarget.order.infusionRate || '5 ml/hr'}
                  </span>
                </div>
                <Input
                  value={doseForm.infusionRate || ''}
                  onChange={(e) => setDoseForm({ ...doseForm, infusionRate: e.target.value })}
                  placeholder="e.g. 5 ml/hr or 0.05 mcg/kg/min"
                  required
                />
                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                  {['2 ml/hr', '4 ml/hr', '5 ml/hr', '8 ml/hr', '10 ml/hr', '15 ml/hr', '20 ml/hr', '50 ml/hr'].map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setDoseForm({ ...doseForm, infusionRate: r })}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800 hover:bg-teal-200 border border-teal-300"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label className="text-slate-700 font-bold">Shift Nurse Signature / Name *</Label>
              <Input
                value={doseForm.nurseName}
                onChange={(e) => setDoseForm({ ...doseForm, nurseName: e.target.value })}
                required
              />
            </div>

            <div>
              <Label className="text-slate-700 font-bold">Pre-Check Vitals (e.g. Blood Pressure / MAP / GRBS)</Label>
              <Input
                placeholder="e.g. MAP: 72 mmHg, BP: 110/70, GRBS: 160 mg/dL"
                value={doseForm.preCheckVital}
                onChange={(e) => setDoseForm({ ...doseForm, preCheckVital: e.target.value })}
              />
            </div>

            <div>
              <Label className="text-slate-700 font-bold">Clinical Observations / Remarks</Label>
              <Input
                placeholder="e.g. Infusion site patent, no extravasation, patient stable"
                value={doseForm.remarks}
                onChange={(e) => setDoseForm({ ...doseForm, remarks: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsGiveDoseDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                Confirm {activeDoseTarget?.order.isContinuousInfusion ? 'Infusion Audit' : 'Dose Log'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: Add New Medication Order */}
      <Dialog open={isNewMedDialogOpen} onOpenChange={setIsNewMedDialogOpen}>
        <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Pill className="w-5 h-5 text-indigo-600" />
              Prescribe / Add Medication Order
            </DialogTitle>
            <DialogDescription className="text-xs">
              Issue a medication or continuous infusion order for <strong>{selectedPatient.name}</strong> ({selectedPatient.bed || 'Bed W-101'})
            </DialogDescription>
          </DialogHeader>

          {/* Order Category Selector */}
          <div className="flex bg-slate-100 p-1 rounded-lg gap-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setNewOrderForm({
                ...newOrderForm,
                orderCategory: 'Standard',
                isContinuousInfusion: false,
                route: 'Oral',
                frequency: 'BD (Twice Daily)',
                scheduledTimes: ['08:00', '20:00']
              })}
              className={`flex-1 py-2 px-3 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                !newOrderForm.isContinuousInfusion && newOrderForm.orderCategory !== 'Continuous Infusion'
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Pill className="w-3.5 h-3.5" />
              Standard Dose / Bolus (Oral, IV Push, SC, IM)
            </button>
            <button
              type="button"
              onClick={() => setNewOrderForm({
                ...newOrderForm,
                orderCategory: 'Continuous Infusion',
                isContinuousInfusion: true,
                route: 'Continuous IV Infusion',
                frequency: 'Continuous (24 Hrs)',
                infusionRate: newOrderForm.infusionRate || '5 ml/hr',
                diluentVehicle: newOrderForm.diluentVehicle || 'in 50ml NS via Syringe Pump',
                scheduledTimes: ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00', '00:00', '02:00', '04:00'],
                isHighAlert: true
              })}
              className={`flex-1 py-2 px-3 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                newOrderForm.isContinuousInfusion || newOrderForm.orderCategory === 'Continuous Infusion'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Continuous Infusion / Drip (Syringe Pump, IV Set)
            </button>
          </div>

          <form onSubmit={handleCreateMedOrder} className="space-y-3.5 text-xs mt-1">
            {/* Continuous Infusion Banner */}
            {(newOrderForm.isContinuousInfusion || newOrderForm.orderCategory === 'Continuous Infusion') && (
              <div className="p-2.5 bg-teal-50 border border-teal-200 rounded-xl text-teal-900 text-xs">
                <div className="flex items-center gap-1.5 font-bold">
                  <Activity className="w-4 h-4 text-teal-700 shrink-0" />
                  Continuous Infusion Order Configuration
                </div>
                <p className="text-[11px] text-teal-800 mt-0.5">
                  Continuous medication runs 24 hours with scheduled rate audits & monitoring checkpoints in the MAR chart.
                </p>
                <div className="mt-2 flex gap-1 flex-wrap">
                  <span className="text-[10px] font-bold text-teal-900 self-center mr-1">Quick Presets:</span>
                  {[
                    { name: 'Noradrenaline 4mg/50ml NS', rate: '5 ml/hr', target: 'MAP > 65 mmHg', device: 'in 50ml NS via Syringe Pump' },
                    { name: 'Regular Insulin 50U/50ml NS', rate: '4 ml/hr', target: 'GRBS 140-180 mg/dL', device: 'in 50ml NS via Syringe Pump' },
                    { name: 'Fentanyl 1000mcg/50ml NS', rate: '2 ml/hr', target: 'Pain Score < 3', device: 'in 50ml NS via Syringe Pump' },
                    { name: 'KCl 40 mEq in 500ml NS', rate: '50 ml/hr', target: 'Serum K+ 4.0-4.5', device: 'in 500ml NS via IV Infusion Set' }
                  ].map(preset => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setNewOrderForm({
                        ...newOrderForm,
                        drugName: preset.name,
                        dosage: preset.name,
                        infusionRate: preset.rate,
                        diluentVehicle: preset.device,
                        targetGoal: preset.target,
                        isHighAlert: true
                      })}
                      className="px-2 py-0.5 bg-white border border-teal-300 text-teal-800 hover:bg-teal-100 rounded text-[10px] font-semibold"
                    >
                      {preset.name.split(' ')[0]} {preset.name.split(' ')[1]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-700 font-bold">
                  {newOrderForm.isContinuousInfusion ? 'Infusion Drug & Preparation *' : 'Drug Name & Form *'}
                </Label>
                <Input
                  placeholder={newOrderForm.isContinuousInfusion ? 'e.g. Inj. Noradrenaline (4mg in 50ml NS)' : 'e.g. Inj. Ceftriaxone 1g'}
                  value={newOrderForm.drugName || ''}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, drugName: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label className="text-slate-700 font-bold">
                  {newOrderForm.isContinuousInfusion ? 'Total Dose / Concentration *' : 'Dosage Strength *'}
                </Label>
                <Input
                  placeholder={newOrderForm.isContinuousInfusion ? 'e.g. 4mg / 50ml NS' : 'e.g. 1g IV or 500mg'}
                  value={newOrderForm.dosage || ''}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, dosage: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Continuous Infusion Specific Fields */}
            {(newOrderForm.isContinuousInfusion || newOrderForm.orderCategory === 'Continuous Infusion') && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <Label className="text-slate-700 font-bold">Flow Rate / Speed (ml/hr or mcg/min) *</Label>
                  <Input
                    placeholder="e.g. 5 ml/hr or 0.05 mcg/kg/min"
                    value={newOrderForm.infusionRate || ''}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, infusionRate: e.target.value })}
                    required
                  />
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {['2 ml/hr', '4 ml/hr', '5 ml/hr', '10 ml/hr', '20 ml/hr', '50 ml/hr', '100 ml/hr'].map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setNewOrderForm({ ...newOrderForm, infusionRate: r })}
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white text-slate-700 hover:bg-slate-200 border border-slate-300"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-slate-700 font-bold">Diluent / Vehicle & Delivery Pump</Label>
                  <Input
                    placeholder="e.g. in 50ml NS via Syringe Pump"
                    value={newOrderForm.diluentVehicle || ''}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, diluentVehicle: e.target.value })}
                  />
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {[
                      'in 50ml NS (Syringe Pump)',
                      'in 100ml NS (Infusion Pump)',
                      'in 500ml D5W (IV Set)'
                    ].map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setNewOrderForm({ ...newOrderForm, diluentVehicle: d })}
                        className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-white text-slate-700 hover:bg-slate-200 border border-slate-300"
                      >
                        {d.split(' ')[1]} {d.split(' ')[2]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="col-span-2">
                  <Label className="text-slate-700 font-bold">Clinical Titration Target / Goal</Label>
                  <Input
                    placeholder="e.g. Maintain MAP >= 65 mmHg or Blood Glucose 140-180 mg/dL"
                    value={newOrderForm.targetGoal || ''}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, targetGoal: e.target.value })}
                  />
                </div>

                <div className="col-span-2">
                  <Label className="text-slate-700 font-bold">MAR Grid Verification Checkpoints Interval</Label>
                  <Select
                    value={
                      newOrderForm.scheduledTimes?.length === 12 ? '2H' :
                      newOrderForm.scheduledTimes?.length === 6 ? '4H' :
                      newOrderForm.scheduledTimes?.length === 3 ? 'SHIFT' :
                      newOrderForm.scheduledTimes?.length === 24 ? '1H' : '2H'
                    }
                    onValueChange={(val) => {
                      if (val === '2H') {
                        setNewOrderForm({
                          ...newOrderForm,
                          scheduledTimes: ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00', '00:00', '02:00', '04:00']
                        });
                      } else if (val === '4H') {
                        setNewOrderForm({
                          ...newOrderForm,
                          scheduledTimes: ['06:00', '10:00', '14:00', '18:00', '22:00', '02:00']
                        });
                      } else if (val === 'SHIFT') {
                        setNewOrderForm({
                          ...newOrderForm,
                          scheduledTimes: ['08:00', '16:00', '00:00']
                        });
                      } else if (val === '1H') {
                        setNewOrderForm({
                          ...newOrderForm,
                          scheduledTimes: [
                            '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
                            '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00',
                            '22:00', '23:00', '00:00', '01:00', '02:00', '03:00', '04:00', '05:00'
                          ]
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2H">Every 2 Hours (12 shift checkpoints - Standard ICU/HDU)</SelectItem>
                      <SelectItem value="4H">Every 4 Hours (6 shift checkpoints - Step-down Ward)</SelectItem>
                      <SelectItem value="SHIFT">Every Shift Handover (3 checkpoints: 08:00, 16:00, 00:00)</SelectItem>
                      <SelectItem value="1H">Hourly Continuous Audit (24 checkpoints - High Acuity)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-slate-700 font-bold">Route</Label>
                <Select
                  value={newOrderForm.route || (newOrderForm.isContinuousInfusion ? 'Continuous IV Infusion' : 'Oral')}
                  onValueChange={(val: any) => {
                    const isCont = val.includes('Continuous') || val.includes('Infusion');
                    setNewOrderForm({
                      ...newOrderForm,
                      route: val,
                      ...(isCont && !newOrderForm.isContinuousInfusion ? {
                        orderCategory: 'Continuous Infusion',
                        isContinuousInfusion: true,
                        frequency: 'Continuous (24 Hrs)',
                        scheduledTimes: ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00', '00:00', '02:00', '04:00']
                      } : {})
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Continuous IV Infusion">Continuous IV Infusion</SelectItem>
                    <SelectItem value="IV Infusion">IV Infusion (Intermittent)</SelectItem>
                    <SelectItem value="Continuous Subcutaneous">Continuous Subcutaneous</SelectItem>
                    <SelectItem value="Epidural Infusion">Epidural Infusion</SelectItem>
                    <SelectItem value="Oral">Oral</SelectItem>
                    <SelectItem value="IV Push">IV Push</SelectItem>
                    <SelectItem value="IM">Intramuscular (IM)</SelectItem>
                    <SelectItem value="Subcutaneous">Subcutaneous (SC)</SelectItem>
                    <SelectItem value="Inhalation">Inhalation / Nebulizer</SelectItem>
                    <SelectItem value="Topical">Topical</SelectItem>
                    <SelectItem value="PR">PR (Per Rectum)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-slate-700 font-bold">Frequency / Schedule</Label>
                <Select
                  value={newOrderForm.frequency || (newOrderForm.isContinuousInfusion ? 'Continuous (24 Hrs)' : 'BD (Twice Daily)')}
                  onValueChange={(val: any) => {
                    if (val.includes('Continuous')) {
                      setNewOrderForm({
                        ...newOrderForm,
                        frequency: val,
                        orderCategory: 'Continuous Infusion',
                        isContinuousInfusion: true,
                        route: newOrderForm.route?.includes('Continuous') ? newOrderForm.route : 'Continuous IV Infusion',
                        scheduledTimes: ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00', '00:00', '02:00', '04:00']
                      });
                    } else {
                      let times = ['08:00', '20:00'];
                      if (val.includes('OD')) times = ['08:00'];
                      if (val.includes('TDS')) times = ['08:00', '14:00', '20:00'];
                      if (val.includes('QID')) times = ['06:00', '12:00', '18:00', '00:00'];
                      if (val.includes('STAT')) times = ['Immediate'];
                      setNewOrderForm({ ...newOrderForm, frequency: val, scheduledTimes: times });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Continuous (24 Hrs)">Continuous (24 Hrs)</SelectItem>
                    <SelectItem value="Continuous Infusion">Continuous Infusion</SelectItem>
                    <SelectItem value="Continuous (Titrate to Target)">Continuous (Titrate to Target)</SelectItem>
                    <SelectItem value="OD (Once Daily)">OD (Once Daily)</SelectItem>
                    <SelectItem value="BD (Twice Daily)">BD (Twice Daily)</SelectItem>
                    <SelectItem value="TDS (Thrice Daily)">TDS (Thrice Daily)</SelectItem>
                    <SelectItem value="QID (4 Times Daily)">QID (4 Times Daily)</SelectItem>
                    <SelectItem value="STAT (Immediate)">STAT (Immediate)</SelectItem>
                    <SelectItem value="PRN (As Needed)">PRN (As Needed)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-slate-700 font-bold">Prescribing Doctor</Label>
                <Input
                  value={newOrderForm.prescribedBy || ''}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, prescribedBy: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-700 font-bold">Special Clinical Instructions / Precautions</Label>
              <Input
                placeholder="e.g. Central line only, check MAP every 15 min, hold if heart rate < 60 bpm"
                value={newOrderForm.instructions || ''}
                onChange={(e) => setNewOrderForm({ ...newOrderForm, instructions: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="highAlertChk"
                checked={!!newOrderForm.isHighAlert}
                onChange={(e) => setNewOrderForm({ ...newOrderForm, isHighAlert: e.target.checked })}
                className="rounded text-indigo-600"
              />
              <label htmlFor="highAlertChk" className="font-bold text-rose-700 cursor-pointer">
                Mark as High Alert Medication (Requires Double Verification)
              </label>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsNewMedDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                Save {newOrderForm.isContinuousInfusion ? 'Continuous Infusion Order' : 'Medication Order'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: Add IV Fluid Order */}
      <Dialog open={isNewIvDialogOpen} onOpenChange={setIsNewIvDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Droplet className="w-5 h-5 text-cyan-600" />
              Register New IV Fluid Drip
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateIvFluid} className="space-y-3 text-xs">
            <div>
              <Label className="text-slate-700 font-bold">Fluid Name & Bag Volume *</Label>
              <Input
                placeholder="e.g. Normal Saline 0.9% 500ml or Ringer Lactate 500ml"
                value={newIvForm.fluidName || ''}
                onChange={(e) => setNewIvForm({ ...newIvForm, fluidName: e.target.value })}
                required
              />
            </div>

            <div>
              <Label className="text-slate-700 font-bold">Additive Drugs (if any)</Label>
              <Input
                placeholder="e.g. Inj. KCl 20 mEq or Inj. Optineuron 1 amp"
                value={newIvForm.additive || ''}
                onChange={(e) => setNewIvForm({ ...newIvForm, additive: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-700 font-bold">Flow Rate</Label>
                <Input
                  placeholder="e.g. 75 ml/hr"
                  value={newIvForm.rate || ''}
                  onChange={(e) => setNewIvForm({ ...newIvForm, rate: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-slate-700 font-bold">Total Bag Volume (ml)</Label>
                <Input
                  type="number"
                  value={newIvForm.totalVolumeMl || 500}
                  onChange={(e) => setNewIvForm({ ...newIvForm, totalVolumeMl: parseInt(e.target.value) || 500 })}
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsNewIvDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold">
                Start IV Drip
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
