import React, { useState, useEffect } from 'react';
import { 
  UserCheck, 
  Stethoscope, 
  Calendar, 
  Clock, 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  Phone, 
  Building2, 
  IndianRupee, 
  Edit, 
  Trash2, 
  Eye, 
  UserPlus, 
  ClipboardCheck, 
  Activity, 
  Send,
  Pill,
  FlaskConical,
  X,
  BadgeAlert
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { VisitingSpecialist, VisitingConsultationRecord, Patient } from '@/types';
import { 
  getVisitingSpecialists, 
  saveVisitingSpecialist, 
  getVisitingConsultations, 
  saveVisitingConsultation 
} from '@/services/supabaseService';

const DEFAULT_SPECIALISTS: VisitingSpecialist[] = [
  {
    id: 'vs-1',
    name: 'Dr. Arvind Kumar Sharma',
    specialty: 'Gastroenterology',
    qualification: 'MD, DM (Gastroenterology)',
    registrationNumber: 'UP-48291',
    phone: '+91 98391 22345',
    email: 'dr.aksharma@gmail.com',
    hospitalAffiliation: 'Sanjay Gandhi PGI / Private Clinic',
    defaultConsultationFee: 1500,
    visitingSchedule: 'Mon, Wed, Fri (04:00 PM - 06:00 PM) & On-Call',
    status: 'Active',
    notes: 'Senior Consultant Endoscopy & Hepatology',
    createdAt: '2026-01-10'
  },
  {
    id: 'vs-2',
    name: 'Dr. Sunita Deshmukh',
    specialty: 'Cardiology',
    qualification: 'MD, DM (Cardiology), FACC',
    registrationNumber: 'UP-51022',
    phone: '+91 94150 88721',
    email: 'dr.sunita.cardio@outlook.com',
    hospitalAffiliation: 'Heart & Vascular Institute',
    defaultConsultationFee: 1800,
    visitingSchedule: 'Daily Emergency On-Call & Tue/Thu Rounds',
    status: 'Active',
    notes: 'Interventional Cardiologist - Echo & Pacemaker',
    createdAt: '2026-01-15'
  },
  {
    id: 'vs-3',
    name: 'Dr. R. P. Srivastava',
    specialty: 'Urology',
    qualification: 'MS, M.Ch (Urology)',
    registrationNumber: 'UP-39210',
    phone: '+91 98380 44312',
    email: 'rpsrivastava.uro@gmail.com',
    hospitalAffiliation: 'City Kidney & Laser Surgery Centre',
    defaultConsultationFee: 1500,
    visitingSchedule: 'Tue, Thu, Sat (03:00 PM - 05:00 PM)',
    status: 'Active',
    notes: 'Laser Prostate & Endourology Specialist',
    createdAt: '2026-02-01'
  },
  {
    id: 'vs-4',
    name: 'Dr. Meenakshi Verma',
    specialty: 'Anesthesiology & Critical Care',
    qualification: 'MD (Anesthesiology)',
    registrationNumber: 'UP-45980',
    phone: '+91 97920 11200',
    email: 'meenakshi.anaesth@gmail.com',
    hospitalAffiliation: 'Super Specialty Critical Care Panel',
    defaultConsultationFee: 1200,
    visitingSchedule: 'On-Call for High Risk OT & ICU Cross-Consults',
    status: 'Active',
    notes: 'PAC & Regional Anesthesia Expert',
    createdAt: '2026-02-10'
  },
  {
    id: 'vs-5',
    name: 'Dr. Sanjay Tripathy',
    specialty: 'Nephrology',
    qualification: 'MD, DM (Nephrology)',
    registrationNumber: 'UP-61203',
    phone: '+91 94501 33211',
    email: 'dripathy.nephro@yahoo.com',
    hospitalAffiliation: 'Apollo Clinic & Renal Care Centre',
    defaultConsultationFee: 1600,
    visitingSchedule: 'Tue, Fri (02:00 PM - 04:00 PM)',
    status: 'Active',
    notes: 'Dialysis & Kidney Transplant Care',
    createdAt: '2026-02-20'
  }
];

const DEFAULT_CONSULTATIONS: VisitingConsultationRecord[] = [
  {
    id: 'vc-101',
    patientId: 'p1',
    patientName: 'Ramesh Chandra Shukla',
    uhidNo: 'MRN-88204',
    patientType: 'IPD',
    bedNo: 'Bed 102',
    wardName: 'Male General Ward',
    specialistId: 'vs-1',
    specialistName: 'Dr. Arvind Kumar Sharma',
    specialistSpecialty: 'Gastroenterology',
    specialistPhone: '+91 98391 22345',
    specialistAffiliation: 'Sanjay Gandhi PGI / Private Clinic',
    visitDate: new Date().toISOString().split('T')[0],
    visitTime: '11:30 AM',
    visitType: 'Cross-Consultation',
    reasonForConsult: 'Recurrent upper GI bleeding with severe dyspepsia and hemoglobin drop to 7.8 g/dL.',
    vitalSignsAtVisit: {
      bp: '110/70',
      pulse: '88/min',
      temp: '98.4 F',
      spo2: '97%',
      respRate: '18/min'
    },
    clinicalFindings: 'Patient conscious, oriented, mild pallor +. Abdomen soft, mild epigastric tenderness on deep palpation. No organomegaly. Bowel sounds present.',
    diagnosisImpression: 'Acute Peptic Ulcer Bleed (Forrest IIb suspected) with Secondary Anemia.',
    specialistAdvice: '1. Keep NBM for 6 hours; schedule Diagnostic Upper GI Endoscopy.\n2. Inj. Pantoprazole 80mg IV Bolus STAT, followed by 8mg/hr continuous IV infusion.\n3. Transfuse 1 Unit Packed Red Blood Cells (PRBC) with vital monitoring.\n4. Avoid NSAIDs, Aspirin, and oral anticoagulants.\n5. Re-check Hemoglobin post 6 hours.',
    prescribedMedications: [
      { name: 'Inj. Pantoprazole 80mg', dosage: '80mg IV STAT', frequency: 'Once STAT', duration: '1 Day', instructions: 'IV Bolus over 10 mins' },
      { name: 'Inj. Sucralfate Syrup', dosage: '10 ml', frequency: 'QID (4 times daily)', duration: '5 Days', instructions: '1 hour before meals' },
      { name: 'Inj. Tranexamic Acid 500mg', dosage: '500mg IV', frequency: 'TDS (3 times daily)', duration: '2 Days', instructions: 'Slow IV injection' }
    ],
    recommendedTests: ['Repeat Complete Blood Count (CBC)', 'Serum Creatinine & Blood Urea', 'Diagnostic Upper GI Endoscopy'],
    followUpDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    specialInstructions: 'Inform immediately if fresh hematemesis or melena occurs.',
    consultationFee: 1500,
    billingStatus: 'Charged to IPD Bill',
    recordedBy: 'Dr. Rajesh Sharma',
    recordedByRole: 'DOCTOR',
    acknowledgmentStatus: 'Acknowledged by Duty Nurse',
    acknowledgedBy: 'Nurse Head',
    acknowledgedAt: '12:05 PM',
    createdAt: new Date().toISOString()
  },
  {
    id: 'vc-102',
    patientId: 'p2',
    patientName: 'Saraswati Devi',
    uhidNo: 'MRN-77109',
    patientType: 'IPD',
    bedNo: 'ICU Bed 03',
    wardName: 'Intensive Care Unit',
    specialistId: 'vs-2',
    specialistName: 'Dr. Sunita Deshmukh',
    specialistSpecialty: 'Cardiology',
    specialistPhone: '+91 94150 88721',
    specialistAffiliation: 'Heart & Vascular Institute',
    visitDate: new Date().toISOString().split('T')[0],
    visitTime: '02:15 PM',
    visitType: 'Emergency Call',
    reasonForConsult: 'Sudden onset chest tightness with ST-T changes in inferior leads on ECG in post-op abdominal surgery patient.',
    vitalSignsAtVisit: {
      bp: '140/90',
      pulse: '102/min',
      temp: '98.6 F',
      spo2: '94% on Room Air',
      respRate: '22/min'
    },
    clinicalFindings: 'Precordial S1 S2 normal, no murmur. Lungs bilateral clear basally. JVP not raised. ECG shows T-wave inversions in II, III, aVF.',
    diagnosisImpression: 'Acute Coronary Syndrome (NSTEMI / High Risk Unstable Angina) - Post-Op Day 1.',
    specialistAdvice: '1. Tab. Clopidogrel 300mg STAT (chewable).\n2. Tab. Atorvastatin 80mg STAT at bedtime.\n3. High flow O2 support @ 4L/min via nasal cannula.\n4. Send STAT Troponin-I and NT-proBNP.\n5. Bedside 2D Echo advised immediately.\n6. Keep Low Molecular Weight Heparin (Inj. Clexane 60mg SC) on hold till surgical wound check.',
    prescribedMedications: [
      { name: 'Tab. Clopidogrel 75mg', dosage: '300mg STAT loading', frequency: 'STAT then 75mg OD', duration: '30 Days', instructions: 'Chew STAT' },
      { name: 'Tab. Atorvastatin 80mg', dosage: '80mg', frequency: 'OD (Night)', duration: '30 Days', instructions: 'After dinner' },
      { name: 'Tab. Metoprolol 25mg', dosage: '12.5mg', frequency: 'BD', duration: '7 Days', instructions: 'Monitor BP & Pulse' }
    ],
    recommendedTests: ['STAT Troponin-I', 'STAT 2D Echocardiogram', 'Continuous 12-lead Telemetry ECG'],
    followUpDate: new Date(Date.now() + 43200000).toISOString().split('T')[0],
    specialInstructions: 'Transfer to Cardiac Monitored ICU Bed. Notify if chest pain recurs.',
    consultationFee: 1800,
    billingStatus: 'Charged to IPD Bill',
    recordedBy: 'Dr. Rajesh Sharma',
    recordedByRole: 'DOCTOR',
    acknowledgmentStatus: 'Pending Nurse/Doctor Review',
    createdAt: new Date().toISOString()
  }
];

interface VisitingConsultantsProps {
  user?: any;
  patientId?: string;
  embedded?: boolean;
}

export default function VisitingConsultants({ user, patientId: propPatientId, embedded = false }: VisitingConsultantsProps) {
  const [specialists, setSpecialists] = useState<VisitingSpecialist[]>(() => {
    return storage.get(STORAGE_KEYS.VISITING_SPECIALISTS, DEFAULT_SPECIALISTS);
  });

  const [consultations, setConsultations] = useState<VisitingConsultationRecord[]>(() => {
    return storage.get(STORAGE_KEYS.VISITING_CONSULTATIONS, DEFAULT_CONSULTATIONS);
  });

  const [patients, setPatients] = useState<Patient[]>(() => {
    return storage.get(STORAGE_KEYS.PATIENTS, []);
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [specialistFilter, setSpecialistFilter] = useState('ALL');
  const [patientTypeFilter, setPatientTypeFilter] = useState('ALL');
  const [ackFilter, setAckFilter] = useState('ALL');
  const [selectedDateFilter, setSelectedDateFilter] = useState('');
  const [selectedPatientFilter, setSelectedPatientFilter] = useState<string>(propPatientId || 'ALL');

  useEffect(() => {
    if (propPatientId) {
      setSelectedPatientFilter(propPatientId);
    }
  }, [propPatientId]);

  // Dialog States
  const [isAddConsultationOpen, setIsAddConsultationOpen] = useState(false);
  const [isAddSpecialistOpen, setIsAddSpecialistOpen] = useState(false);
  const [isViewNoteOpen, setIsViewNoteOpen] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<VisitingConsultationRecord | null>(null);

  // New Specialist Form
  const [newSpecialist, setNewSpecialist] = useState({
    name: '',
    specialty: '',
    qualification: '',
    registrationNumber: '',
    phone: '',
    email: '',
    hospitalAffiliation: '',
    defaultConsultationFee: '1500',
    visitingSchedule: '',
    notes: ''
  });

  // New Consultation Record Form
  const [newConsult, setNewConsult] = useState({
    patientId: '',
    patientName: '',
    uhidNo: '',
    patientType: 'IPD' as 'IPD' | 'OPD' | 'Emergency' | 'OT',
    bedNo: '',
    wardName: '',
    specialistId: '',
    visitDate: new Date().toISOString().split('T')[0],
    visitTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    visitType: 'Cross-Consultation' as 'Emergency Call' | 'Routine Ward Round' | 'Cross-Consultation' | 'Pre-Op Evaluation' | 'Post-Op Review' | 'Specialist Opinion',
    reasonForConsult: '',
    bp: '120/80',
    pulse: '80',
    temp: '98.6 F',
    spo2: '98%',
    respRate: '16',
    clinicalFindings: '',
    diagnosisImpression: '',
    specialistAdvice: '',
    recommendedTests: '',
    followUpDate: '',
    specialInstructions: '',
    consultationFee: '1500',
    billingStatus: 'Charged to IPD Bill' as 'Charged to IPD Bill' | 'Paid OPD' | 'Pending' | 'Waived',
    medications: [{ name: '', dosage: '', frequency: 'TDS', duration: '5 Days', instructions: '' }]
  });

  // Keep LocalStorage Synced
  useEffect(() => {
    storage.set(STORAGE_KEYS.VISITING_SPECIALISTS, specialists);
  }, [specialists]);

  useEffect(() => {
    storage.set(STORAGE_KEYS.VISITING_CONSULTATIONS, consultations);
  }, [consultations]);

  // Listen for external updates and initial async load
  useEffect(() => {
    const loadDataAsync = async () => {
      const specs = await getVisitingSpecialists();
      if (specs && specs.length > 0) setSpecialists(specs);

      const consults = await getVisitingConsultations();
      if (consults && consults.length > 0) setConsultations(consults);

      setPatients(storage.get(STORAGE_KEYS.PATIENTS, []));
    };

    loadDataAsync();

    const handleStorageChange = () => {
      loadDataAsync();
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('supabase-data-sync', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('supabase-data-sync', handleStorageChange);
    };
  }, []);

  // Filtered Consultations
  const filteredConsultations = consultations.filter(item => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      item.patientName.toLowerCase().includes(query) ||
      (item.uhidNo && item.uhidNo.toLowerCase().includes(query)) ||
      item.specialistName.toLowerCase().includes(query) ||
      item.specialistSpecialty.toLowerCase().includes(query) ||
      item.reasonForConsult.toLowerCase().includes(query);

    const matchesSpecialist = specialistFilter === 'ALL' || item.specialistId === specialistFilter;
    const matchesPatientType = patientTypeFilter === 'ALL' || item.patientType === patientTypeFilter;
    const matchesAck = ackFilter === 'ALL' || 
      (ackFilter === 'PENDING' && item.acknowledgmentStatus.startsWith('Pending')) ||
      (ackFilter === 'ACKNOWLEDGED' && !item.acknowledgmentStatus.startsWith('Pending'));

    const matchesDate = !selectedDateFilter || item.visitDate === selectedDateFilter;
    const matchesPatient = selectedPatientFilter === 'ALL' || 
      item.patientId === selectedPatientFilter || 
      (item.uhidNo && item.uhidNo === selectedPatientFilter);

    return matchesSearch && matchesSpecialist && matchesPatientType && matchesAck && matchesDate && matchesPatient;
  });

  // Handle Adding Specialist
  const handleSaveSpecialist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpecialist.name || !newSpecialist.specialty || !newSpecialist.phone) {
      toast.error('Please enter Doctor Name, Specialty, and Phone Number.');
      return;
    }

    const created: VisitingSpecialist = {
      id: `vs-${Date.now()}`,
      name: newSpecialist.name.startsWith('Dr.') ? newSpecialist.name : `Dr. ${newSpecialist.name}`,
      specialty: newSpecialist.specialty,
      qualification: newSpecialist.qualification,
      registrationNumber: newSpecialist.registrationNumber,
      phone: newSpecialist.phone,
      email: newSpecialist.email,
      hospitalAffiliation: newSpecialist.hospitalAffiliation || 'Visiting Specialist Panel',
      defaultConsultationFee: Number(newSpecialist.defaultConsultationFee) || 1500,
      visitingSchedule: newSpecialist.visitingSchedule || 'On-Call',
      status: 'Active',
      notes: newSpecialist.notes,
      createdAt: new Date().toISOString()
    };

    const saved = await saveVisitingSpecialist(created);
    const updated = [saved, ...specialists];
    setSpecialists(updated);
    storage.set(STORAGE_KEYS.VISITING_SPECIALISTS, updated);
    toast.success(`Visiting Specialist ${saved.name} added successfully!`);
    setIsAddSpecialistOpen(false);
    setNewSpecialist({
      name: '',
      specialty: '',
      qualification: '',
      registrationNumber: '',
      phone: '',
      email: '',
      hospitalAffiliation: '',
      defaultConsultationFee: '1500',
      visitingSchedule: '',
      notes: ''
    });
  };

  // Auto Select Patient Details on Selection
  const handlePatientSelect = (patId: string) => {
    const pat = patients.find(p => p.id === patId);
    if (pat) {
      setNewConsult(prev => ({
        ...prev,
        patientId: pat.id,
        patientName: pat.name,
        uhidNo: pat.mrn || pat.id,
        patientType: (pat.status === 'Admitted' || pat.status === 'IPD' ? 'IPD' : 'OPD') as any,
        bedNo: (pat as any).bedNumber || (pat as any).bedNo || '',
        wardName: (pat as any).wardName || (pat as any).ward || ''
      }));
    }
  };

  // Auto Select Specialist Details on Selection
  const handleSpecialistSelect = (specId: string) => {
    const spec = specialists.find(s => s.id === specId);
    if (spec) {
      setNewConsult(prev => ({
        ...prev,
        specialistId: spec.id,
        consultationFee: String(spec.defaultConsultationFee || 1500)
      }));
    }
  };

  // Handle Add Medication Row
  const handleAddMedicationRow = () => {
    setNewConsult(prev => ({
      ...prev,
      medications: [...prev.medications, { name: '', dosage: '', frequency: 'BD', duration: '5 Days', instructions: '' }]
    }));
  };

  const handleRemoveMedicationRow = (index: number) => {
    setNewConsult(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index)
    }));
  };

  const handleMedicationChange = (index: number, field: string, val: string) => {
    setNewConsult(prev => {
      const copy = [...prev.medications];
      copy[index] = { ...copy[index], [field]: val };
      return { ...prev, medications: copy };
    });
  };

  // Save Consultation Record
  const handleSaveConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConsult.patientName || !newConsult.specialistId) {
      toast.error('Please select Patient and Visiting Specialist.');
      return;
    }
    if (!newConsult.reasonForConsult || !newConsult.clinicalFindings || !newConsult.specialistAdvice) {
      toast.error('Please provide Reason for Consult, Clinical Findings, and Specialist Advice.');
      return;
    }

    const selectedSpec = specialists.find(s => s.id === newConsult.specialistId);

    const record: VisitingConsultationRecord = {
      id: `vc-${Date.now()}`,
      patientId: newConsult.patientId || `p-${Date.now()}`,
      patientName: newConsult.patientName,
      uhidNo: newConsult.uhidNo || `MRN-${Math.floor(10000 + Math.random() * 90000)}`,
      patientType: newConsult.patientType,
      bedNo: newConsult.bedNo,
      wardName: newConsult.wardName,
      
      specialistId: newConsult.specialistId,
      specialistName: selectedSpec?.name || 'Visiting Specialist',
      specialistSpecialty: selectedSpec?.specialty || 'General Specialist',
      specialistPhone: selectedSpec?.phone,
      specialistAffiliation: selectedSpec?.hospitalAffiliation,
      
      visitDate: newConsult.visitDate,
      visitTime: newConsult.visitTime,
      visitType: newConsult.visitType,
      
      reasonForConsult: newConsult.reasonForConsult,
      vitalSignsAtVisit: {
        bp: newConsult.bp,
        pulse: newConsult.pulse,
        temp: newConsult.temp,
        spo2: newConsult.spo2,
        respRate: newConsult.respRate
      },
      
      clinicalFindings: newConsult.clinicalFindings,
      diagnosisImpression: newConsult.diagnosisImpression,
      specialistAdvice: newConsult.specialistAdvice,
      
      prescribedMedications: newConsult.medications.filter(m => m.name.trim() !== ''),
      recommendedTests: newConsult.recommendedTests ? newConsult.recommendedTests.split(',').map(t => t.trim()).filter(Boolean) : [],
      
      followUpDate: newConsult.followUpDate,
      specialInstructions: newConsult.specialInstructions,
      
      consultationFee: Number(newConsult.consultationFee) || 1500,
      billingStatus: newConsult.billingStatus,
      
      recordedBy: user?.name || 'Duty Medical Officer / Staff',
      recordedByRole: user?.role || 'STAFF',
      
      acknowledgmentStatus: 'Pending Nurse/Doctor Review',
      createdAt: new Date().toISOString()
    };

    const saved = await saveVisitingConsultation(record);
    const updated = [saved, ...consultations];
    setConsultations(updated);
    storage.set(STORAGE_KEYS.VISITING_CONSULTATIONS, updated);
    
    toast.success(`Visiting Consultation Record for ${saved.patientName} saved!`);
    setIsAddConsultationOpen(false);

    // Reset Form
    setNewConsult({
      patientId: '',
      patientName: '',
      uhidNo: '',
      patientType: 'IPD',
      bedNo: '',
      wardName: '',
      specialistId: '',
      visitDate: new Date().toISOString().split('T')[0],
      visitTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      visitType: 'Cross-Consultation',
      reasonForConsult: '',
      bp: '120/80',
      pulse: '80',
      temp: '98.6 F',
      spo2: '98%',
      respRate: '16',
      clinicalFindings: '',
      diagnosisImpression: '',
      specialistAdvice: '',
      recommendedTests: '',
      followUpDate: '',
      specialInstructions: '',
      consultationFee: '1500',
      billingStatus: 'Charged to IPD Bill',
      medications: [{ name: '', dosage: '', frequency: 'TDS', duration: '5 Days', instructions: '' }]
    });
  };

  // Toggle Acknowledgment Status by Nurse / Doctor
  const handleToggleAcknowledge = (id: string) => {
    const updated = consultations.map(c => {
      if (c.id === id) {
        const isAck = !c.acknowledgmentStatus.startsWith('Pending');
        return {
          ...c,
          acknowledgmentStatus: isAck 
            ? 'Pending Nurse/Doctor Review' as const 
            : 'Acknowledged by Duty Nurse' as const,
          acknowledgedBy: isAck ? undefined : (user?.name || 'Duty Nurse'),
          acknowledgedAt: isAck ? undefined : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
      }
      return c;
    });
    setConsultations(updated);
    storage.set(STORAGE_KEYS.VISITING_CONSULTATIONS, updated);
    toast.success('Consultation advice acknowledgment updated.');
  };

  // Delete Consultation Record
  const handleDeleteConsultation = (id: string) => {
    if (window.confirm('Are you sure you want to delete this visiting consultation record?')) {
      const updated = consultations.filter(c => c.id !== id);
      setConsultations(updated);
      storage.set(STORAGE_KEYS.VISITING_CONSULTATIONS, updated);
      toast.success('Visiting consultation record removed.');
    }
  };

  // Print Consultation Note Sheet
  const handlePrintConsultationNote = (rec: VisitingConsultationRecord) => {
    const hospInfo = storage.get(STORAGE_KEYS.HOSPITAL_INFO, {
      name: 'Gastro Plus Hospital',
      address: 'Plot No. 7 & 8, Om Shiv Nagar, Gufa Mandir Road, Lal Ghati Bhopal, 462030, Madhya Pradesh',
      phone: '9109102145/9109101246'
    });

    const printWin = window.open('', '_blank', 'width=800,height=950');
    if (!printWin) {
      toast.error('Unable to open print window. Please allow popups.');
      return;
    }

    const medsHtml = rec.prescribedMedications && rec.prescribedMedications.length > 0
      ? `
        <div style="margin-top: 12px;">
          <h3 style="font-size: 11pt; font-weight: bold; margin-bottom: 6px; border-bottom: 1px solid #000; padding-bottom: 2px;">Prescribed Treatment / Medications</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 9.5pt;">
            <thead>
              <tr style="background: #f1f5f9; text-align: left;">
                <th style="border: 1px solid #94a3b8; padding: 4px 6px;">S.No</th>
                <th style="border: 1px solid #94a3b8; padding: 4px 6px;">Medication Name</th>
                <th style="border: 1px solid #94a3b8; padding: 4px 6px;">Dosage</th>
                <th style="border: 1px solid #94a3b8; padding: 4px 6px;">Frequency</th>
                <th style="border: 1px solid #94a3b8; padding: 4px 6px;">Duration</th>
                <th style="border: 1px solid #94a3b8; padding: 4px 6px;">Instructions</th>
              </tr>
            </thead>
            <tbody>
              ${rec.prescribedMedications.map((m, idx) => `
                <tr>
                  <td style="border: 1px solid #cbd5e1; padding: 4px 6px;">${idx + 1}</td>
                  <td style="border: 1px solid #cbd5e1; padding: 4px 6px; font-weight: bold;">${m.name}</td>
                  <td style="border: 1px solid #cbd5e1; padding: 4px 6px;">${m.dosage}</td>
                  <td style="border: 1px solid #cbd5e1; padding: 4px 6px;">${m.frequency}</td>
                  <td style="border: 1px solid #cbd5e1; padding: 4px 6px;">${m.duration}</td>
                  <td style="border: 1px solid #cbd5e1; padding: 4px 6px;">${m.instructions || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `
      : '';

    const testsHtml = rec.recommendedTests && rec.recommendedTests.length > 0
      ? `
        <div style="margin-top: 10px;">
          <strong style="font-size: 10pt;">Recommended Investigations / Labs:</strong>
          <ul style="margin: 4px 0; padding-left: 20px; font-size: 9.5pt;">
            ${rec.recommendedTests.map(t => `<li>${t}</li>`).join('')}
          </ul>
        </div>
      `
      : '';

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Visiting Specialist Consultation Note - ${rec.patientName}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: Arial, Helvetica, sans-serif; color: #000; margin: 0; padding: 0; font-size: 10pt; line-height: 1.4; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
            .hospital-title { font-size: 16pt; font-weight: bold; text-transform: uppercase; margin: 0; }
            .hospital-sub { font-size: 9pt; font-weight: bold; color: #333; margin-top: 2px; }
            .doc-title { text-align: center; font-size: 12pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; background: #e2e8f0; padding: 4px; border: 1px solid #94a3b8; margin-bottom: 12px; }
            .section-grid { display: flex; border: 1px solid #000; margin-bottom: 12px; font-size: 9.5pt; }
            .box { flex: 1; padding: 6px; }
            .border-right { border-right: 1px solid #000; }
            .label { font-weight: bold; color: #1e293b; }
            .content-box { border: 1px solid #000; padding: 8px; margin-bottom: 10px; background: #fff; }
            .advice-box { border: 2px solid #0f766e; background: #f0fdf4; padding: 10px; margin-bottom: 12px; border-radius: 4px; }
            .advice-title { font-size: 11pt; font-weight: bold; color: #0f766e; text-transform: uppercase; border-bottom: 1px solid #0f766e; padding-bottom: 4px; margin-bottom: 6px; }
            .signatures { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 10px; }
            .sig-box { text-align: center; width: 45%; }
            .sig-line { border-top: 1px solid #000; margin-top: 40px; font-weight: bold; font-size: 9pt; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="hospital-title">${hospInfo.name || 'NEO GASTRO HOSPITAL'}</div>
            <div class="hospital-sub">${hospInfo.address} | Ph: ${hospInfo.phone}</div>
          </div>

          <div class="doc-title">VISITING SPECIALIST CONSULTATION NOTE</div>

          <!-- Patient & Specialist Info -->
          <div class="section-grid">
            <div class="box border-right">
              <div><span class="label">Patient Name:</span> <strong>${rec.patientName}</strong></div>
              <div><span class="label">UHID / MRN:</span> ${rec.uhidNo || 'N/A'}</div>
              <div><span class="label">Patient Type:</span> <strong>${rec.patientType}</strong> ${rec.bedNo ? `(${rec.wardName} - ${rec.bedNo})` : ''}</div>
              <div><span class="label">Visit Date & Time:</span> ${rec.visitDate} at ${rec.visitTime}</div>
            </div>
            <div class="box">
              <div><span class="label">Visiting Specialist:</span> <strong>${rec.specialistName}</strong></div>
              <div><span class="label">Specialty:</span> ${rec.specialistSpecialty}</div>
              <div><span class="label">Affiliation / Mobile:</span> ${rec.specialistAffiliation || 'Specialist Panel'} (${rec.specialistPhone || 'N/A'})</div>
              <div><span class="label">Visit Category:</span> <strong>${rec.visitType}</strong></div>
            </div>
          </div>

          <!-- Vital Signs -->
          ${rec.vitalSignsAtVisit ? `
            <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 9pt; margin-bottom: 10px; display: flex; justify-content: space-between;">
              <span><strong>BP:</strong> ${rec.vitalSignsAtVisit.bp || '120/80'}</span>
              <span><strong>Pulse:</strong> ${rec.vitalSignsAtVisit.pulse || '80'}/min</span>
              <span><strong>Temp:</strong> ${rec.vitalSignsAtVisit.temp || '98.6 F'}</span>
              <span><strong>SpO2:</strong> ${rec.vitalSignsAtVisit.spo2 || '98%'}</span>
              <span><strong>Resp Rate:</strong> ${rec.vitalSignsAtVisit.respRate || '16'}/min</span>
            </div>
          ` : ''}

          <!-- Reason & Clinical Findings -->
          <div class="content-box">
            <div style="margin-bottom: 6px;">
              <span class="label">Reason for Consultation / Referral Cause:</span><br/>
              <span style="font-size: 9.5pt;">${rec.reasonForConsult}</span>
            </div>
            <div style="margin-top: 8px;">
              <span class="label">Clinical Findings & Examination Notes:</span><br/>
              <span style="font-size: 9.5pt;">${rec.clinicalFindings}</span>
            </div>
            <div style="margin-top: 8px;">
              <span class="label">Clinical Impression / Diagnosis:</span><br/>
              <strong style="font-size: 10pt; color: #1e1b4b;">${rec.diagnosisImpression}</strong>
            </div>
          </div>

          <!-- Specialist Advice Box -->
          <div class="advice-box">
            <div class="advice-title">SPECIALIST ADVICE & CLINICAL ORDERS</div>
            <div style="font-size: 10pt; whitespace: pre-wrap; font-weight: 500;">${rec.specialistAdvice.replace(/\n/g, '<br/>')}</div>
          </div>

          <!-- Prescribed Medications -->
          ${medsHtml}

          <!-- Recommended Tests & Instructions -->
          ${testsHtml}

          ${rec.specialInstructions ? `
            <div style="margin-top: 8px; font-size: 9.5pt;">
              <strong>Special Instructions:</strong> ${rec.specialInstructions}
            </div>
          ` : ''}

          ${rec.followUpDate ? `
            <div style="margin-top: 6px; font-size: 9.5pt;">
              <strong>Follow-up Visit Date:</strong> ${rec.followUpDate}
            </div>
          ` : ''}

          <!-- Signatures -->
          <div class="signatures">
            <div class="sig-box">
              <div class="sig-line">Recorded By: ${rec.recordedBy} (${rec.recordedByRole})</div>
              <div style="font-size: 8pt; color: #64748b;">Neo Gastroplus Duty Staff</div>
            </div>
            <div class="sig-box">
              <div class="sig-line">${rec.specialistName}</div>
              <div style="font-size: 8pt; color: #64748b;">Visiting Consultant (${rec.specialistSpecialty})</div>
            </div>
          </div>

          <div style="margin-top: 30px; text-align: center; font-size: 8pt; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 6px;">
            This is an official clinical consultation record of Neo Gastroplus Hospital. Printed on ${new Date().toLocaleString()}.
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  // Metrics
  const totalConsultsCount = consultations.length;
  const pendingAckCount = consultations.filter(c => c.acknowledgmentStatus.startsWith('Pending')).length;
  const totalFeesAmount = consultations.reduce((sum, c) => sum + (c.consultationFee || 0), 0);
  const totalSpecialistsCount = specialists.length;

  return (
    <div className={embedded ? "space-y-4" : "p-4 sm:p-6 space-y-6 max-w-7xl mx-auto"}>
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#1A5E63] via-[#0F4C50] to-[#2B7A7E] text-white p-5 rounded-2xl shadow-md border border-teal-700/30">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge className="bg-amber-400 text-amber-950 font-black text-[10px] tracking-wider uppercase px-2 py-0.5">
              CLINICAL SPECIALIST PANEL
            </Badge>
            <span className="text-xs text-teal-200">• Neo Gastroplus Hospital</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2.5">
            <UserCheck className="w-7 h-7 text-amber-300" />
            Visiting Specialist Visits & Consultations
          </h1>
          <p className="text-xs text-teal-100/90 max-w-2xl">
            Provision and log external specialist visits, cross-consultation notes, emergency calls, and clinical recommendations for IPD & OPD patients.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button 
            onClick={() => setIsAddConsultationOpen(true)}
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold shadow-sm text-xs h-9 px-4 rounded-xl flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Record Visiting Consult Note
          </Button>
          <Button 
            onClick={() => setIsAddSpecialistOpen(true)}
            variant="outline"
            className="bg-white/10 hover:bg-white/20 text-white border-white/30 text-xs h-9 px-3.5 rounded-xl flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            Add Visiting Specialist
          </Button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">Total Visiting Consults</p>
              <h3 className="text-2xl font-black text-emerald-950 dark:text-emerald-100 mt-1">{totalConsultsCount}</h3>
              <p className="text-[10px] text-emerald-700/80 mt-0.5">Recorded patient visits</p>
            </div>
            <div className="p-3 bg-emerald-500/20 text-emerald-700 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">Pending Nurse Review</p>
              <h3 className="text-2xl font-black text-amber-950 dark:text-amber-100 mt-1">{pendingAckCount}</h3>
              <p className="text-[10px] text-amber-700/80 mt-0.5">Awaiting nursing execution</p>
            </div>
            <div className="p-3 bg-amber-500/20 text-amber-700 rounded-xl">
              <BadgeAlert className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-cyan-200 bg-cyan-50/50 dark:bg-cyan-950/20 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-800 dark:text-cyan-300">Visiting Doctors Panel</p>
              <h3 className="text-2xl font-black text-cyan-950 dark:text-cyan-100 mt-1">{totalSpecialistsCount}</h3>
              <p className="text-[10px] text-cyan-700/80 mt-0.5">Empaneled consultants</p>
            </div>
            <div className="p-3 bg-cyan-500/20 text-cyan-700 rounded-xl">
              <Stethoscope className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/20 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300">Visiting Consult Revenue</p>
              <h3 className="text-2xl font-black text-purple-950 dark:text-purple-100 mt-1">₹{totalFeesAmount.toLocaleString()}</h3>
              <p className="text-[10px] text-purple-700/80 mt-0.5">Total consultation fees</p>
            </div>
            <div className="p-3 bg-purple-500/20 text-purple-700 rounded-xl">
              <IndianRupee className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Module Tabs */}
      <Tabs defaultValue="consultations" className="w-full space-y-4">
        <TabsList className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex flex-wrap h-auto">
          <TabsTrigger value="consultations" className="text-xs font-bold rounded-lg px-4 py-2 flex items-center gap-1.5">
            <ClipboardCheck className="w-4 h-4 text-[#1A5E63]" />
            Visits & Consultations Log ({filteredConsultations.length})
          </TabsTrigger>
          <TabsTrigger value="directory" className="text-xs font-bold rounded-lg px-4 py-2 flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-[#1A5E63]" />
            Specialist Directory ({specialists.length})
          </TabsTrigger>
          <TabsTrigger value="nursing" className="text-xs font-bold rounded-lg px-4 py-2 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-[#1A5E63]" />
            Ward Nurse Orders View
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: CONSULTATIONS & VISITS LOG */}
        <TabsContent value="consultations" className="space-y-4">
          {/* Filter Bar */}
          <Card className="border-slate-200 shadow-sm bg-slate-50/50">
            <CardContent className="p-3.5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <Input 
                    placeholder="Search patient, doctor, reason..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs bg-white border-slate-200"
                  />
                </div>

                {!embedded && (
                  <Select value={selectedPatientFilter} onValueChange={setSelectedPatientFilter}>
                    <SelectTrigger className="h-9 text-xs bg-white border-slate-200">
                      <SelectValue placeholder="All Patients" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Patients</SelectItem>
                      {patients.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.mrn || p.id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md px-2 h-9">
                  <Calendar className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <input 
                    type="date" 
                    value={selectedDateFilter || ''}
                    onChange={e => setSelectedDateFilter(e.target.value)}
                    className="text-xs bg-transparent outline-none w-full text-slate-700 font-medium"
                  />
                  {selectedDateFilter && (
                    <button 
                      onClick={() => setSelectedDateFilter('')}
                      className="text-[10px] text-slate-400 hover:text-slate-600 font-bold px-1"
                      title="Clear date filter"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <Select value={specialistFilter} onValueChange={setSpecialistFilter}>
                  <SelectTrigger className="h-9 text-xs bg-white border-slate-200">
                    <SelectValue placeholder="All Specialists" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Visiting Specialists</SelectItem>
                    {specialists.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name} ({s.specialty})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={patientTypeFilter} onValueChange={setPatientTypeFilter}>
                  <SelectTrigger className="h-9 text-xs bg-white border-slate-200">
                    <SelectValue placeholder="All Patient Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Patient Categories</SelectItem>
                    <SelectItem value="IPD">IPD Patients</SelectItem>
                    <SelectItem value="OPD">OPD Patients</SelectItem>
                    <SelectItem value="Emergency">Emergency Triage</SelectItem>
                    <SelectItem value="OT">OT Surgery</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={ackFilter} onValueChange={setAckFilter}>
                  <SelectTrigger className="h-9 text-xs bg-white border-slate-200">
                    <SelectValue placeholder="Nursing Acknowledgment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="PENDING">Pending Review</SelectItem>
                    <SelectItem value="ACKNOWLEDGED">Acknowledged</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Consultation Cards List */}
          {filteredConsultations.length === 0 ? (
            <Card className="p-8 text-center border-dashed border-slate-300">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400 mb-3">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-700 text-sm">No Visiting Consultation Records Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                No recorded visits match your search filter. Click "Record Visiting Consult Note" to add a new specialist advice entry.
              </p>
              <Button 
                onClick={() => setIsAddConsultationOpen(true)}
                className="mt-4 bg-[#1A5E63] text-white text-xs h-8 px-4 font-bold"
              >
                + Record Visiting Consult
              </Button>
            </Card>
          ) : (
            <div className="space-y-3.5">
              {filteredConsultations.map(record => {
                const isAck = !record.acknowledgmentStatus.startsWith('Pending');

                return (
                  <Card key={record.id} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                    <div className="p-4 sm:p-5 space-y-3">
                      {/* Top Header Row */}
                      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge className={`text-[10px] font-black uppercase px-2 py-0.5 ${
                              record.patientType === 'IPD' ? 'bg-blue-100 text-blue-900 border-blue-200' :
                              record.patientType === 'Emergency' ? 'bg-rose-100 text-rose-900 border-rose-200' :
                              'bg-emerald-100 text-emerald-900 border-emerald-200'
                            }`}>
                              {record.patientType} {record.bedNo ? `• ${record.wardName} (${record.bedNo})` : ''}
                            </Badge>

                            <Badge className="bg-purple-100 text-purple-900 border-purple-200 text-[10px] font-bold">
                              {record.visitType}
                            </Badge>

                            <Badge className={`text-[10px] font-bold ${
                              isAck ? 'bg-emerald-500 text-white' : 'bg-amber-100 text-amber-900 border-amber-300'
                            }`}>
                              {isAck ? `✓ ${record.acknowledgmentStatus}` : '⚡ Pending Nurse Review'}
                            </Badge>
                          </div>

                          <h3 className="font-black text-slate-900 text-base sm:text-lg flex items-center gap-2 pt-0.5">
                            {record.patientName}
                            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {record.uhidNo}
                            </span>
                          </h3>
                        </div>

                        <div className="text-right space-y-1">
                          <div className="text-xs font-bold text-slate-700 flex items-center justify-end gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {record.visitDate} at {record.visitTime}
                          </div>
                          <div className="text-xs text-[#1A5E63] font-bold">
                            Fee: ₹{record.consultationFee} <span className="text-[10px] font-normal text-slate-500">({record.billingStatus})</span>
                          </div>
                        </div>
                      </div>

                      {/* Specialist Info Bar */}
                      <div className="bg-teal-50/60 border border-teal-200/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-[#1A5E63] text-white flex items-center justify-center font-bold text-sm">
                            <Stethoscope className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-extrabold text-xs text-slate-900">
                              {record.specialistName}
                            </div>
                            <div className="text-[11px] text-teal-800 font-medium">
                              {record.specialistSpecialty} • {record.specialistAffiliation || 'Visiting Specialist'}
                            </div>
                          </div>
                        </div>

                        {record.specialistPhone && (
                          <div className="text-xs text-slate-600 font-bold flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-teal-200">
                            <Phone className="w-3.5 h-3.5 text-teal-700" />
                            {record.specialistPhone}
                          </div>
                        )}
                      </div>

                      {/* Clinical Findings & Advice Body */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2 text-xs">
                          <div>
                            <span className="font-extrabold text-slate-800 uppercase text-[10px] tracking-wider block text-slate-500">
                              Reason for Consult / Referral Cause
                            </span>
                            <p className="text-slate-800 font-medium mt-0.5">{record.reasonForConsult}</p>
                          </div>

                          <div>
                            <span className="font-extrabold text-slate-800 uppercase text-[10px] tracking-wider block text-slate-500">
                              Clinical Findings & Examination
                            </span>
                            <p className="text-slate-700 mt-0.5">{record.clinicalFindings}</p>
                          </div>

                          {record.diagnosisImpression && (
                            <div>
                              <span className="font-extrabold text-slate-800 uppercase text-[10px] tracking-wider block text-slate-500">
                                Impression / Diagnosis
                              </span>
                              <p className="text-slate-900 font-black mt-0.5">{record.diagnosisImpression}</p>
                            </div>
                          )}
                        </div>

                        {/* Highlighted Specialist Advice Box for Doctors & Nurses */}
                        <div className="bg-emerald-50/80 rounded-xl p-3 border-2 border-emerald-300 space-y-2 text-xs">
                          <div className="flex items-center justify-between border-b border-emerald-200 pb-1.5">
                            <span className="font-extrabold text-emerald-900 uppercase text-[10px] tracking-wider flex items-center gap-1">
                              <ClipboardCheck className="w-3.5 h-3.5 text-emerald-700" />
                              Specialist Advice & Orders
                            </span>
                            <span className="text-[10px] text-emerald-800 font-bold">
                              For Attending Doctors & Nurses
                            </span>
                          </div>

                          <p className="text-slate-900 whitespace-pre-wrap font-semibold text-xs leading-relaxed">
                            {record.specialistAdvice}
                          </p>

                          {record.prescribedMedications && record.prescribedMedications.length > 0 && (
                            <div className="pt-2 border-t border-emerald-200/80">
                              <span className="font-bold text-[10px] text-emerald-950 uppercase block mb-1 flex items-center gap-1">
                                <Pill className="w-3 h-3 text-emerald-700" />
                                Prescribed Medications ({record.prescribedMedications.length}):
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {record.prescribedMedications.map((m, idx) => (
                                  <Badge key={idx} variant="outline" className="bg-white border-emerald-300 text-slate-900 text-[10px] font-bold">
                                    {m.name} ({m.dosage} - {m.frequency})
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {record.recommendedTests && record.recommendedTests.length > 0 && (
                            <div className="pt-1.5">
                              <span className="font-bold text-[10px] text-emerald-950 uppercase block mb-1 flex items-center gap-1">
                                <FlaskConical className="w-3 h-3 text-emerald-700" />
                                Recommended Labs / Investigations:
                              </span>
                              <p className="text-slate-800 text-[11px] font-semibold">
                                {record.recommendedTests.join(' • ')}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer Actions Row */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                        <div className="text-slate-500 text-[11px] flex items-center gap-2">
                          <span>Recorded by: <strong>{record.recordedBy}</strong></span>
                          {record.acknowledgedBy && (
                            <span className="text-emerald-700 font-semibold">• Ack by {record.acknowledgedBy} at {record.acknowledgedAt}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button 
                            onClick={() => handleToggleAcknowledge(record.id)}
                            variant={isAck ? 'outline' : 'default'}
                            className={`h-8 text-xs font-bold px-3 rounded-lg flex items-center gap-1 ${
                              isAck 
                                ? 'border-slate-300 text-slate-700 hover:bg-slate-100' 
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {isAck ? 'Un-acknowledge' : 'Acknowledge Advice'}
                          </Button>

                          <Button 
                            onClick={() => handlePrintConsultationNote(record)}
                            variant="outline"
                            className="h-8 text-xs font-bold border-slate-300 hover:bg-slate-100 text-slate-800 px-3 rounded-lg flex items-center gap-1"
                          >
                            <Printer className="w-3.5 h-3.5 text-[#1A5E63]" />
                            Print Consultation Note
                          </Button>

                          <Button 
                            onClick={() => handleDeleteConsultation(record.id)}
                            variant="ghost"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: SPECIALIST DIRECTORY */}
        <TabsContent value="directory" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Visiting Specialist Panel Directory</h2>
              <p className="text-xs text-slate-500">Empaneled visiting doctors, consultants, surgeons, and super-specialists.</p>
            </div>
            <Button 
              onClick={() => setIsAddSpecialistOpen(true)}
              className="bg-[#1A5E63] hover:bg-[#144A4E] text-white text-xs h-9 px-3.5 font-bold rounded-xl flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              Add Specialist
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {specialists.map(spec => (
              <Card key={spec.id} className="border-slate-200 shadow-sm hover:shadow transition-shadow">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#1A5E63] text-white flex items-center justify-center font-bold text-base shadow-sm">
                        {spec.name.replace('Dr.', '').trim().substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm">{spec.name}</h3>
                        <p className="text-xs text-teal-800 font-bold">{spec.specialty}</p>
                        {spec.qualification && <p className="text-[11px] text-slate-500">{spec.qualification}</p>}
                      </div>
                    </div>

                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                      {spec.status}
                    </Badge>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1.5 text-xs text-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">Reg No:</span>
                      <span className="font-bold text-slate-800">{spec.registrationNumber || 'N/A'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">Consultation Fee:</span>
                      <span className="font-black text-[#1A5E63]">₹{spec.defaultConsultationFee}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">Phone:</span>
                      <span className="font-bold text-slate-800">{spec.phone}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">Affiliation:</span>
                      <span className="font-medium text-slate-700 truncate max-w-[180px]">{spec.hospitalAffiliation || 'Private Panel'}</span>
                    </div>
                  </div>

                  {spec.visitingSchedule && (
                    <div className="text-[11px] bg-amber-50 text-amber-900 border border-amber-200/80 p-2 rounded-lg font-medium flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span><strong>Schedule:</strong> {spec.visitingSchedule}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* TAB 3: WARD & NURSING STATION VIEW */}
        <TabsContent value="nursing" className="space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#1A5E63]" />
                Ward Nursing Station • Visiting Specialist Orders Execution Matrix
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Live list of visiting doctor recommendations for active ward & ICU patients requiring nursing action and execution.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-y border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                    <th className="p-3">Patient & Ward/Bed</th>
                    <th className="p-3">Visiting Specialist</th>
                    <th className="p-3">Visit Date & Type</th>
                    <th className="p-3">Specialist Advice & Orders</th>
                    <th className="p-3 text-center">Nursing Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {consultations.map(c => {
                    const isAck = !c.acknowledgmentStatus.startsWith('Pending');

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-semibold text-slate-900">
                          <div>{c.patientName}</div>
                          <div className="text-[10px] text-slate-500">{c.patientType} • {c.wardName || 'Ward'} ({c.bedNo || 'Bed'})</div>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-[#1A5E63]">{c.specialistName}</div>
                          <div className="text-[10px] text-slate-500">{c.specialistSpecialty}</div>
                        </td>
                        <td className="p-3 text-slate-600 font-medium">
                          {c.visitDate} ({c.visitTime})
                          <div className="text-[10px] font-bold text-purple-800">{c.visitType}</div>
                        </td>
                        <td className="p-3 max-w-xs font-medium text-slate-800">
                          <p className="line-clamp-2">{c.specialistAdvice}</p>
                        </td>
                        <td className="p-3 text-center">
                          <Badge className={`text-[10px] font-bold ${
                            isAck ? 'bg-emerald-500 text-white' : 'bg-amber-100 text-amber-900 border-amber-300'
                          }`}>
                            {isAck ? '✓ Acknowledged' : '⚡ Pending Action'}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <Button 
                            onClick={() => handleToggleAcknowledge(c.id)}
                            size="sm"
                            className={`h-7 text-[11px] font-bold px-2.5 rounded-lg ${
                              isAck ? 'bg-slate-200 text-slate-800 hover:bg-slate-300' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                            }`}
                          >
                            {isAck ? 'Mark Pending' : 'Mark Executed'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DIALOG 1: RECORD NEW VISITING CONSULTATION */}
      <Dialog open={isAddConsultationOpen} onOpenChange={setIsAddConsultationOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-[#1A5E63]" />
              Record Visiting Specialist Consultation Note
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Log patient consultation findings, reason for call, specialist advice, medications, and visit charges.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveConsultation} className="space-y-4 text-xs pt-2">
            {/* Patient & Specialist Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="space-y-1">
                <Label className="font-extrabold text-slate-800">Select Patient (IPD / OPD)</Label>
                <Select onValueChange={handlePatientSelect}>
                  <SelectTrigger className="h-9 bg-white text-xs">
                    <SelectValue placeholder="Choose Patient..." />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.mrn || p.id}) - {p.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Input 
                    placeholder="Patient Name" 
                    value={newConsult.patientName} 
                    onChange={e => setNewConsult({...newConsult, patientName: e.target.value})}
                    className="h-8 text-xs bg-white"
                  />
                  <Input 
                    placeholder="UHID / MRN" 
                    value={newConsult.uhidNo} 
                    onChange={e => setNewConsult({...newConsult, uhidNo: e.target.value})}
                    className="h-8 text-xs bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="font-extrabold text-slate-800">Visiting Specialist / Consultant</Label>
                <Select onValueChange={handleSpecialistSelect}>
                  <SelectTrigger className="h-9 bg-white text-xs">
                    <SelectValue placeholder="Choose Specialist..." />
                  </SelectTrigger>
                  <SelectContent>
                    {specialists.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.specialty}) - ₹{s.defaultConsultationFee}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Select 
                    value={newConsult.patientType} 
                    onValueChange={(val: any) => setNewConsult({...newConsult, patientType: val})}
                  >
                    <SelectTrigger className="h-8 bg-white text-xs">
                      <SelectValue placeholder="Patient Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IPD">IPD Ward / ICU</SelectItem>
                      <SelectItem value="OPD">OPD Consultation</SelectItem>
                      <SelectItem value="Emergency">Emergency Triage</SelectItem>
                      <SelectItem value="OT">Operation Theatre</SelectItem>
                    </SelectContent>
                  </Select>

                  <Input 
                    placeholder="Ward / Bed No." 
                    value={newConsult.bedNo} 
                    onChange={e => setNewConsult({...newConsult, bedNo: e.target.value})}
                    className="h-8 text-xs bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Visit Meta */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              <div>
                <Label className="font-bold">Visit Date</Label>
                <Input 
                  type="date" 
                  value={newConsult.visitDate} 
                  onChange={e => setNewConsult({...newConsult, visitDate: e.target.value})}
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <Label className="font-bold">Visit Time</Label>
                <Input 
                  type="text" 
                  value={newConsult.visitTime} 
                  onChange={e => setNewConsult({...newConsult, visitTime: e.target.value})}
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <Label className="font-bold">Visit Type / Category</Label>
                <Select 
                  value={newConsult.visitType} 
                  onValueChange={(val: any) => setNewConsult({...newConsult, visitType: val})}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Visit Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cross-Consultation">Cross-Consultation</SelectItem>
                    <SelectItem value="Emergency Call">Emergency Call</SelectItem>
                    <SelectItem value="Routine Ward Round">Routine Ward Round</SelectItem>
                    <SelectItem value="Pre-Op Evaluation">Pre-Op Evaluation</SelectItem>
                    <SelectItem value="Post-Op Review">Post-Op Review</SelectItem>
                    <SelectItem value="Specialist Opinion">Specialist Opinion</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="font-bold">Consultation Fee (₹)</Label>
                <Input 
                  type="number" 
                  value={newConsult.consultationFee} 
                  onChange={e => setNewConsult({...newConsult, consultationFee: e.target.value})}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Vitals at Visit */}
            <div className="space-y-1">
              <Label className="font-bold text-slate-700">Patient Vitals at Time of Visit</Label>
              <div className="grid grid-cols-5 gap-2 bg-slate-100 p-2 rounded-lg">
                <Input placeholder="BP (120/80)" value={newConsult.bp} onChange={e => setNewConsult({...newConsult, bp: e.target.value})} className="h-7 text-[11px] bg-white" />
                <Input placeholder="Pulse (/min)" value={newConsult.pulse} onChange={e => setNewConsult({...newConsult, pulse: e.target.value})} className="h-7 text-[11px] bg-white" />
                <Input placeholder="Temp (F)" value={newConsult.temp} onChange={e => setNewConsult({...newConsult, temp: e.target.value})} className="h-7 text-[11px] bg-white" />
                <Input placeholder="SpO2 (%)" value={newConsult.spo2} onChange={e => setNewConsult({...newConsult, spo2: e.target.value})} className="h-7 text-[11px] bg-white" />
                <Input placeholder="Resp Rate" value={newConsult.respRate} onChange={e => setNewConsult({...newConsult, respRate: e.target.value})} className="h-7 text-[11px] bg-white" />
              </div>
            </div>

            {/* Reason & Findings */}
            <div>
              <Label className="font-bold">Reason for Consultation / Referral Cause *</Label>
              <Textarea 
                placeholder="Enter why the specialist was called..." 
                value={newConsult.reasonForConsult}
                onChange={e => setNewConsult({...newConsult, reasonForConsult: e.target.value})}
                className="h-16 text-xs mt-1"
                required
              />
            </div>

            <div>
              <Label className="font-bold">Clinical Findings & Examination *</Label>
              <Textarea 
                placeholder="Enter physical examination notes, system examination..." 
                value={newConsult.clinicalFindings}
                onChange={e => setNewConsult({...newConsult, clinicalFindings: e.target.value})}
                className="h-16 text-xs mt-1"
                required
              />
            </div>

            <div>
              <Label className="font-bold">Diagnosis / Clinical Impression</Label>
              <Input 
                placeholder="e.g. Acute Severe Pancreatitis / CAD NSTEMI" 
                value={newConsult.diagnosisImpression}
                onChange={e => setNewConsult({...newConsult, diagnosisImpression: e.target.value})}
                className="h-8 text-xs mt-1 font-bold"
              />
            </div>

            {/* Specialist Advice */}
            <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-300 space-y-1.5">
              <Label className="font-black text-emerald-900 uppercase tracking-wide">
                Specialist Advice & Orders (Displayed to Duty Doctors & Nurses) *
              </Label>
              <Textarea 
                placeholder="Enter detailed orders, fluid rates, clinical instructions, precautions..." 
                value={newConsult.specialistAdvice}
                onChange={e => setNewConsult({...newConsult, specialistAdvice: e.target.value})}
                className="h-24 text-xs font-medium bg-white"
                required
              />
            </div>

            {/* Prescribed Medications */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-bold">Prescribed Medications</Label>
                <Button type="button" onClick={handleAddMedicationRow} variant="outline" size="sm" className="h-7 text-[11px] font-bold">
                  + Add Medication
                </Button>
              </div>

              {newConsult.medications.map((med, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input 
                    placeholder="Medicine Name (e.g. Inj Pantop 40mg)" 
                    value={med.name} 
                    onChange={e => handleMedicationChange(idx, 'name', e.target.value)}
                    className="h-8 text-xs flex-1"
                  />
                  <Input 
                    placeholder="Dose (e.g. 1 Amp STAT)" 
                    value={med.dosage} 
                    onChange={e => handleMedicationChange(idx, 'dosage', e.target.value)}
                    className="h-8 text-xs w-28"
                  />
                  <Input 
                    placeholder="Frequency (TDS)" 
                    value={med.frequency} 
                    onChange={e => handleMedicationChange(idx, 'frequency', e.target.value)}
                    className="h-8 text-xs w-24"
                  />
                  <Input 
                    placeholder="Duration (5 Days)" 
                    value={med.duration} 
                    onChange={e => handleMedicationChange(idx, 'duration', e.target.value)}
                    className="h-8 text-xs w-24"
                  />
                  {newConsult.medications.length > 1 && (
                    <Button type="button" onClick={() => handleRemoveMedicationRow(idx)} variant="ghost" className="h-8 w-8 p-0 text-rose-500">
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div>
              <Label className="font-bold">Recommended Investigations / Tests (Comma separated)</Label>
              <Input 
                placeholder="e.g. Repeat CBC, Serum Amylase, Diagnostic Endoscopy" 
                value={newConsult.recommendedTests}
                onChange={e => setNewConsult({...newConsult, recommendedTests: e.target.value})}
                className="h-8 text-xs mt-1"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsAddConsultationOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#1A5E63] text-white font-bold">
                Save & Record Consultation Note
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: ADD VISITING SPECIALIST */}
      <Dialog open={isAddSpecialistOpen} onOpenChange={setIsAddSpecialistOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#1A5E63]" />
              Add Visiting Specialist / Consultant
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveSpecialist} className="space-y-3 text-xs pt-1">
            <div>
              <Label className="font-bold">Doctor Full Name *</Label>
              <Input 
                placeholder="Dr. Full Name" 
                value={newSpecialist.name} 
                onChange={e => setNewSpecialist({...newSpecialist, name: e.target.value})}
                className="h-8 text-xs mt-0.5"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="font-bold">Specialty *</Label>
                <Input 
                  placeholder="e.g. Cardiology / Urology" 
                  value={newSpecialist.specialty} 
                  onChange={e => setNewSpecialist({...newSpecialist, specialty: e.target.value})}
                  className="h-8 text-xs mt-0.5"
                  required
                />
              </div>

              <div>
                <Label className="font-bold">Qualification</Label>
                <Input 
                  placeholder="e.g. MD, DM / MS, M.Ch" 
                  value={newSpecialist.qualification} 
                  onChange={e => setNewSpecialist({...newSpecialist, qualification: e.target.value})}
                  className="h-8 text-xs mt-0.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="font-bold">Phone Number *</Label>
                <Input 
                  placeholder="+91 98390 XXXXX" 
                  value={newSpecialist.phone} 
                  onChange={e => setNewSpecialist({...newSpecialist, phone: e.target.value})}
                  className="h-8 text-xs mt-0.5"
                  required
                />
              </div>

              <div>
                <Label className="font-bold">Default Consultation Fee (₹)</Label>
                <Input 
                  type="number" 
                  placeholder="1500" 
                  value={newSpecialist.defaultConsultationFee} 
                  onChange={e => setNewSpecialist({...newSpecialist, defaultConsultationFee: e.target.value})}
                  className="h-8 text-xs mt-0.5"
                />
              </div>
            </div>

            <div>
              <Label className="font-bold">Hospital / Clinic Affiliation</Label>
              <Input 
                placeholder="e.g. PGI Lucknow / City Hospital" 
                value={newSpecialist.hospitalAffiliation} 
                onChange={e => setNewSpecialist({...newSpecialist, hospitalAffiliation: e.target.value})}
                className="h-8 text-xs mt-0.5"
              />
            </div>

            <div>
              <Label className="font-bold">Visiting Schedule / Availability</Label>
              <Input 
                placeholder="e.g. Mon, Wed, Fri 4:00 PM - 6:00 PM / On Call" 
                value={newSpecialist.visitingSchedule} 
                onChange={e => setNewSpecialist({...newSpecialist, visitingSchedule: e.target.value})}
                className="h-8 text-xs mt-0.5"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddSpecialistOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#1A5E63] text-white font-bold">
                Add Specialist
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
