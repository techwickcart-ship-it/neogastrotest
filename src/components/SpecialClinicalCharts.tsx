import React, { useState, useEffect } from 'react';
import HourlyVitalsChart from './HourlyVitalsChart';
import { 
  Activity, 
  Droplet, 
  Syringe, 
  Microscope, 
  Plus, 
  Printer, 
  AlertTriangle, 
  TrendingUp, 
  Calendar, 
  Clock, 
  User, 
  CheckCircle2, 
  Filter, 
  FileSpreadsheet,
  Heart,
  Search,
  ChevronDown,
  Info,
  ShieldAlert,
  Sliders,
  Check,
  RefreshCw
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { storage, STORAGE_KEYS } from '../lib/storage';
import { 
  getSpecialClinicalCharts, 
  saveSpecialClinicalChartEntry 
} from '../services/supabaseService';
import { 
  DailyDrainEntry, 
  IntakeOutputEntry, 
  BloodSugarGrbsEntry, 
  EndoscopyColonoscopyRecoveryEntry,
  Patient 
} from '../types';
import { toast } from 'sonner';

// Sample default mock data for clinical charts
const INITIAL_DRAIN_ENTRIES: DailyDrainEntry[] = [
  {
    id: 'dr-101',
    patientId: 'p1',
    dateTime: new Date(Date.now() - 3600000 * 4).toISOString(),
    drainName: 'Drain 1 - Abdominal JP',
    site: 'Right Lower Quadrant / Sub-hepatic',
    volumeMl: 65,
    colorAspect: 'Serosanguineous',
    recordedBy: 'Nurse Anita Sharma (Staff)',
    doctorInstructions: 'Keep on continuous negative suction. Report if > 100 mL/4hr or bilious.',
    remarks: 'Site dressing clean, dry and intact. Vacuum re-primed.'
  },
  {
    id: 'dr-102',
    patientId: 'p1',
    dateTime: new Date(Date.now() - 3600000 * 12).toISOString(),
    drainName: 'Drain 2 - Pelvic Drain',
    site: 'Pouch of Douglas',
    volumeMl: 30,
    colorAspect: 'Serous',
    recordedBy: 'Nurse Sunita Verma',
    doctorInstructions: 'Planned for removal if < 30 mL/24hr.',
    remarks: 'Pale straw color, no odor.'
  }
];

const INITIAL_IO_ENTRIES: IntakeOutputEntry[] = [
  {
    id: 'io-101',
    patientId: 'p1',
    dateTime: new Date(Date.now() - 3600000 * 2).toISOString(),
    shift: 'Morning (8am-2pm)',
    oralMl: 300,
    ivFluidMl: 1000,
    tubeFeedMl: 0,
    bloodProductsMl: 0,
    totalIntakeMl: 1300,
    urineMl: 650,
    ngTubeMl: 50,
    drainMl: 95,
    vomitusStoolMl: 0,
    totalOutputMl: 795,
    netBalanceMl: 505,
    recordedBy: 'Nurse Anita Sharma',
    remarks: 'Positive balance +505 mL. Urine output adequate (> 0.5 mL/kg/hr).'
  },
  {
    id: 'io-102',
    patientId: 'p1',
    dateTime: new Date(Date.now() - 3600000 * 10).toISOString(),
    shift: 'Night (8pm-8am)',
    oralMl: 150,
    ivFluidMl: 1500,
    tubeFeedMl: 0,
    bloodProductsMl: 0,
    totalIntakeMl: 1650,
    urineMl: 900,
    ngTubeMl: 100,
    drainMl: 120,
    vomitusStoolMl: 0,
    totalOutputMl: 1120,
    netBalanceMl: 530,
    recordedBy: 'Nurse Sunita Verma',
    remarks: 'Patient maintaining stable hemodynamics.'
  }
];

const INITIAL_SUGAR_ENTRIES: BloodSugarGrbsEntry[] = [
  {
    id: 'bs-101',
    patientId: 'p1',
    dateTime: new Date(Date.now() - 3600000 * 1).toISOString(),
    slot: 'Pre-Lunch',
    grbsValue: 210,
    urineKetones: 'Negative',
    slidingScaleInsulinUnits: 6,
    insulinTypeRoute: 'Human Actrapid Subcutaneous',
    targetGlucoseRange: '120 - 180 mg/dL',
    hypoSymptoms: 'None',
    recordedBy: 'Nurse Anita Sharma',
    doctorOrders: 'Administer 6 Units Actrapid SC as per Sliding Scale Protocol.'
  },
  {
    id: 'bs-102',
    patientId: 'p1',
    dateTime: new Date(Date.now() - 3600000 * 6).toISOString(),
    slot: 'Fasting',
    grbsValue: 164,
    urineKetones: 'Negative',
    slidingScaleInsulinUnits: 2,
    insulinTypeRoute: 'Human Actrapid SC',
    targetGlucoseRange: '120 - 180 mg/dL',
    hypoSymptoms: 'None',
    recordedBy: 'Nurse Sunita Verma',
    doctorOrders: 'Fasting blood sugar checked before breakfast.'
  }
];

const INITIAL_ENDO_ENTRIES: EndoscopyColonoscopyRecoveryEntry[] = [
  {
    id: 'endo-101',
    patientId: 'p1',
    dateTime: new Date(Date.now() - 3600000 * 3).toISOString(),
    procedureType: 'Upper GI Endoscopy',
    bowelPrepStatus: 'Clear Yellow Liquid Stool',
    sedationRecoveryScore: 'Aldrete Score 10/10 (Fully Awake, Alert & Oriented)',
    bp: '124/82',
    pulse: 76,
    spo2: 99,
    temp: '98.4°F',
    abdominalAssessment: 'Soft non-tender',
    giBleedingCheck: 'None',
    dietProgression: 'Sips of Water',
    biopsyTaken: true,
    specimenDetails: 'Antral mucosa biopsy x 2 sent for H. Pylori & Histopathology.',
    doctorInstructions: 'Observe for 2 hours post-procedure. If no nausea/pain, start soft diet.',
    recordedBy: 'Nurse / Endoscopy Tech Rajesh'
  }
];

interface SpecialClinicalChartsProps {
  patientId?: string;
  patientName?: string;
  mrn?: string;
  isCompactView?: boolean;
}

export function SpecialClinicalCharts({ patientId, patientName, mrn, isCompactView = false }: SpecialClinicalChartsProps) {
  const [activeTab, setActiveTab] = useState<'hourly' | 'drain' | 'io' | 'sugar' | 'endo'>('hourly');
  
  // Data stores
  const [drainEntries, setDrainEntries] = useState<DailyDrainEntry[]>([]);
  const [ioEntries, setIoEntries] = useState<IntakeOutputEntry[]>([]);
  const [sugarEntries, setSugarEntries] = useState<BloodSugarGrbsEntry[]>([]);
  const [endoEntries, setEndoEntries] = useState<EndoscopyColonoscopyRecoveryEntry[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patientId || 'p1');

  // Modal open states
  const [isDrainModalOpen, setIsDrainModalOpen] = useState(false);
  const [isIoModalOpen, setIsIoModalOpen] = useState(false);
  const [isSugarModalOpen, setIsSugarModalOpen] = useState(false);
  const [isEndoModalOpen, setIsEndoModalOpen] = useState(false);

  // Form States
  const [newDrain, setNewDrain] = useState<{
    drainName: string;
    site: string;
    volumeMl: string;
    colorAspect: DailyDrainEntry['colorAspect'];
    doctorInstructions: string;
    remarks: string;
  }>({
    drainName: 'Drain 1 - Abdominal JP',
    site: 'Right Lower Quadrant',
    volumeMl: '50',
    colorAspect: 'Serosanguineous',
    doctorInstructions: 'Notify doctor if > 100 mL/shift or if bilious/frank blood.',
    remarks: 'Dressing intact and clean.'
  });

  const [newIo, setNewIo] = useState<{
    shift: IntakeOutputEntry['shift'];
    oralMl: string;
    ivFluidMl: string;
    tubeFeedMl: string;
    bloodProductsMl: string;
    urineMl: string;
    ngTubeMl: string;
    drainMl: string;
    vomitusStoolMl: string;
    remarks: string;
  }>({
    shift: 'Morning (8am-2pm)',
    oralMl: '200',
    ivFluidMl: '1000',
    tubeFeedMl: '0',
    bloodProductsMl: '0',
    urineMl: '500',
    ngTubeMl: '50',
    drainMl: '60',
    vomitusStoolMl: '0',
    remarks: 'Stable fluid balance.'
  });

  const [newSugar, setNewSugar] = useState<{
    slot: BloodSugarGrbsEntry['slot'];
    grbsValue: string;
    urineKetones: BloodSugarGrbsEntry['urineKetones'];
    slidingScaleInsulinUnits: string;
    insulinTypeRoute: string;
    targetGlucoseRange: string;
    hypoSymptoms: string;
    doctorOrders: string;
  }>({
    slot: 'Pre-Lunch',
    grbsValue: '180',
    urineKetones: 'Negative',
    slidingScaleInsulinUnits: '4',
    insulinTypeRoute: 'Human Actrapid SC',
    targetGlucoseRange: '120 - 180 mg/dL',
    hypoSymptoms: 'None',
    doctorOrders: 'Target 120-180 mg/dL. Administer SC insulin as per sliding scale.'
  });

  const [newEndo, setNewEndo] = useState<{
    procedureType: EndoscopyColonoscopyRecoveryEntry['procedureType'];
    bowelPrepStatus: EndoscopyColonoscopyRecoveryEntry['bowelPrepStatus'];
    sedationRecoveryScore: string;
    bp: string;
    pulse: string;
    spo2: string;
    temp: string;
    abdominalAssessment: EndoscopyColonoscopyRecoveryEntry['abdominalAssessment'];
    giBleedingCheck: EndoscopyColonoscopyRecoveryEntry['giBleedingCheck'];
    dietProgression: EndoscopyColonoscopyRecoveryEntry['dietProgression'];
    biopsyTaken: boolean;
    specimenDetails: string;
    doctorInstructions: string;
  }>({
    procedureType: 'Upper GI Endoscopy',
    bowelPrepStatus: 'Clear Yellow Liquid Stool',
    sedationRecoveryScore: 'Aldrete Score 10/10',
    bp: '120/80',
    pulse: '76',
    spo2: '98',
    temp: '98.4°F',
    abdominalAssessment: 'Soft non-tender',
    giBleedingCheck: 'None',
    dietProgression: 'Sips of Water',
    biopsyTaken: true,
    specimenDetails: 'Antral mucosa biopsy for H. pylori test.',
    doctorInstructions: 'Post-endoscopy recovery monitoring. Monitor for abdominal pain or hematemesis.'
  });

  // Load patient list and charts from storage / database
  useEffect(() => {
    const loadedPatients = storage.get(STORAGE_KEYS.PATIENTS, []);
    setPatients(loadedPatients);

    const loadAsyncCharts = async () => {
      const charts = await getSpecialClinicalCharts();
      if (charts) {
        if (charts.drain && charts.drain.length > 0) setDrainEntries(charts.drain);
        else setDrainEntries(INITIAL_DRAIN_ENTRIES);

        if (charts.io && charts.io.length > 0) setIoEntries(charts.io);
        else setIoEntries(INITIAL_IO_ENTRIES);

        if (charts.sugar && charts.sugar.length > 0) setSugarEntries(charts.sugar);
        else setSugarEntries(INITIAL_SUGAR_ENTRIES);

        if (charts.endo && charts.endo.length > 0) setEndoEntries(charts.endo);
        else setEndoEntries(INITIAL_ENDO_ENTRIES);
      }
    };

    loadAsyncCharts();
  }, []);

  // Update effect to keep active selectedPatient synced if prop provided
  useEffect(() => {
    if (patientId) {
      setSelectedPatientId(patientId);
    }
  }, [patientId]);

  const saveChartsToStorage = (
    updatedDrain = drainEntries, 
    updatedIo = ioEntries, 
    updatedSugar = sugarEntries, 
    updatedEndo = endoEntries
  ) => {
    storage.set(STORAGE_KEYS.SPECIAL_CLINICAL_CHARTS, {
      drain: updatedDrain,
      io: updatedIo,
      sugar: updatedSugar,
      endo: updatedEndo
    });
  };

  // Filter current data for selected patient
  const patientDrainList = drainEntries.filter(e => !selectedPatientId || e.patientId === selectedPatientId);
  const patientIoList = ioEntries.filter(e => !selectedPatientId || e.patientId === selectedPatientId);
  const patientSugarList = sugarEntries.filter(e => !selectedPatientId || e.patientId === selectedPatientId);
  const patientEndoList = endoEntries.filter(e => !selectedPatientId || e.patientId === selectedPatientId);

  const activePatientObj = patients.find(p => p.id === selectedPatientId) || {
    id: selectedPatientId,
    name: patientName || 'Selected Patient',
    mrn: mrn || 'N/A',
    age: 45,
    gender: 'Male'
  };

  // Add Handlers
  const handleAddDrain = async () => {
    const entry: DailyDrainEntry = {
      id: `dr-${Date.now()}`,
      patientId: selectedPatientId,
      dateTime: new Date().toISOString(),
      drainName: newDrain.drainName,
      site: newDrain.site,
      volumeMl: parseFloat(newDrain.volumeMl) || 0,
      colorAspect: newDrain.colorAspect,
      recordedBy: 'Staff Nurse / Duty Doctor',
      doctorInstructions: newDrain.doctorInstructions,
      remarks: newDrain.remarks
    };

    const saved = await saveSpecialClinicalChartEntry('drain', entry);
    const updated = [saved, ...drainEntries];
    setDrainEntries(updated);
    saveChartsToStorage(updated, ioEntries, sugarEntries, endoEntries);
    setIsDrainModalOpen(false);
    toast.success('Daily Drain Output record logged successfully!');
  };

  const handleAddIo = async () => {
    const oral = parseFloat(newIo.oralMl) || 0;
    const iv = parseFloat(newIo.ivFluidMl) || 0;
    const tube = parseFloat(newIo.tubeFeedMl) || 0;
    const blood = parseFloat(newIo.bloodProductsMl) || 0;
    const totalIn = oral + iv + tube + blood;

    const urine = parseFloat(newIo.urineMl) || 0;
    const ng = parseFloat(newIo.ngTubeMl) || 0;
    const drain = parseFloat(newIo.drainMl) || 0;
    const vomitus = parseFloat(newIo.vomitusStoolMl) || 0;
    const totalOut = urine + ng + drain + vomitus;

    const entry: IntakeOutputEntry = {
      id: `io-${Date.now()}`,
      patientId: selectedPatientId,
      dateTime: new Date().toISOString(),
      shift: newIo.shift,
      oralMl: oral,
      ivFluidMl: iv,
      tubeFeedMl: tube,
      bloodProductsMl: blood,
      totalIntakeMl: totalIn,
      urineMl: urine,
      ngTubeMl: ng,
      drainMl: drain,
      vomitusStoolMl: vomitus,
      totalOutputMl: totalOut,
      netBalanceMl: totalIn - totalOut,
      recordedBy: 'Staff Nurse',
      remarks: newIo.remarks
    };

    const saved = await saveSpecialClinicalChartEntry('io', entry);
    const updated = [saved, ...ioEntries];
    setIoEntries(updated);
    saveChartsToStorage(drainEntries, updated, sugarEntries, endoEntries);
    setIsIoModalOpen(false);
    toast.success('Fluid Intake/Output record logged successfully!');
  };

  const handleAddSugar = async () => {
    const grbs = parseFloat(newSugar.grbsValue) || 0;
    const entry: BloodSugarGrbsEntry = {
      id: `bs-${Date.now()}`,
      patientId: selectedPatientId,
      dateTime: new Date().toISOString(),
      slot: newSugar.slot,
      grbsValue: grbs,
      urineKetones: newSugar.urineKetones,
      slidingScaleInsulinUnits: parseFloat(newSugar.slidingScaleInsulinUnits) || 0,
      insulinTypeRoute: newSugar.insulinTypeRoute,
      targetGlucoseRange: newSugar.targetGlucoseRange,
      hypoSymptoms: newSugar.hypoSymptoms,
      recordedBy: 'Staff Nurse / Clinical Care',
      doctorOrders: newSugar.doctorOrders
    };

    const saved = await saveSpecialClinicalChartEntry('sugar', entry);
    const updated = [saved, ...sugarEntries];
    setSugarEntries(updated);
    saveChartsToStorage(drainEntries, ioEntries, updated, endoEntries);
    setIsSugarModalOpen(false);
    toast.success('Blood Sugar (GRBS) & Insulin record logged!');
  };

  const handleAddEndo = async () => {
    const entry: EndoscopyColonoscopyRecoveryEntry = {
      id: `endo-${Date.now()}`,
      patientId: selectedPatientId,
      dateTime: new Date().toISOString(),
      procedureType: newEndo.procedureType,
      bowelPrepStatus: newEndo.bowelPrepStatus,
      sedationRecoveryScore: newEndo.sedationRecoveryScore,
      bp: newEndo.bp || '120/80',
      pulse: parseFloat(newEndo.pulse) || 72,
      spo2: parseFloat(newEndo.spo2) || 98,
      temp: newEndo.temp || '98.6°F',
      abdominalAssessment: newEndo.abdominalAssessment,
      giBleedingCheck: newEndo.giBleedingCheck,
      dietProgression: newEndo.dietProgression,
      biopsyTaken: newEndo.biopsyTaken,
      specimenDetails: newEndo.specimenDetails,
      doctorInstructions: newEndo.doctorInstructions,
      recordedBy: 'Endoscopy Nurse / Attending Clinician'
    };

    const saved = await saveSpecialClinicalChartEntry('endo', entry);
    const updated = [saved, ...endoEntries];
    setEndoEntries(updated);
    saveChartsToStorage(drainEntries, ioEntries, sugarEntries, updated);
    setIsEndoModalOpen(false);
    toast.success('Endoscopy/Colonoscopy recovery vitals logged!');
  };

  // Print Flowsheet Summary Sheet
  const printFlowsheet = () => {
    const rawHospitalInfo = storage.get(STORAGE_KEYS.HOSPITAL_INFO, null);
    const hospitalName = rawHospitalInfo?.name || 'GASTRO PLUS HOSPITAL';
    const hospitalAddress = rawHospitalInfo?.address || 'Plot No. 7 & 8, Om Shiv Nagar, Gufa Mandir Road, Lal Ghati Bhopal, 462030, Madhya Pradesh';

    const iframeId = 'special-chart-print-iframe';
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
          <title>Special Clinical Monitoring Flowsheet - ${activePatientObj.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
            body { font-family: 'Inter', sans-serif; margin: 25px; color: #0f172a; font-size: 11px; }
            .header { text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 8px; margin-bottom: 15px; }
            .title { font-size: 15px; font-weight: 800; text-transform: uppercase; color: #0284c7; background: #f0f9ff; padding: 6px; text-align: center; border: 1px solid #bae6fd; margin-bottom: 15px; }
            .patient-box { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            .patient-box td { border: 1px solid #cbd5e1; padding: 5px 8px; }
            .lbl { font-weight: 700; background: #f8fafc; color: #475569; width: 20%; }
            .section-title { font-size: 12px; font-weight: 800; text-transform: uppercase; color: #0f172a; border-left: 4px solid #0284c7; padding-left: 6px; margin: 15px 0 8px 0; }
            table.data-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            table.data-table th, table.data-table td { border: 1px solid #cbd5e1; padding: 5px; text-align: left; font-size: 10px; }
            table.data-table th { background: #f1f5f9; font-weight: 700; color: #334155; }
            .sig-box { margin-top: 40px; display: flex; justify-content: space-between; font-size: 10px; }
            .sig-item { width: 45%; text-align: center; border-top: 1px solid #94a3b8; padding-top: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2 style="margin:0; font-size:18px; color:#0f172a;">${hospitalName}</h2>
            <p style="margin:2px; color:#64748b; font-size:10px;">${hospitalAddress}</p>
          </div>
          <div class="title">SPECIAL CLINICAL FLOWSHEET & SPECIAL CATEGORY PATIENT MONITORING RECORD</div>

          <table class="patient-box">
            <tr>
              <td class="lbl">Patient Name</td><td><strong>${activePatientObj.name}</strong></td>
              <td class="lbl">MRN / IPD No.</td><td>${activePatientObj.mrn || 'N/A'}</td>
            </tr>
            <tr>
              <td class="lbl">Age / Sex</td><td>${activePatientObj.age} Yrs / ${activePatientObj.gender}</td>
              <td class="lbl">Report Date</td><td>${new Date().toLocaleString('en-IN')}</td>
            </tr>
          </table>

          <div class="section-title">1. Blood Sugar (GRBS) & Sliding Scale Insulin Record</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Date/Time</th>
                <th>Slot</th>
                <th>GRBS (mg/dL)</th>
                <th>Urine Ketones</th>
                <th>Insulin Administered</th>
                <th>Target Range</th>
                <th>Recorded By</th>
              </tr>
            </thead>
            <tbody>
              ${patientSugarList.map(s => `
                <tr>
                  <td>${new Date(s.dateTime).toLocaleString('en-IN')}</td>
                  <td><strong>${s.slot}</strong></td>
                  <td style="font-weight:bold; color: ${s.grbsValue > 200 ? '#be123c' : s.grbsValue < 70 ? '#b45309' : '#0284c7'};">${s.grbsValue} mg/dL</td>
                  <td>${s.urineKetones || 'Negative'}</td>
                  <td>${s.slidingScaleInsulinUnits ? `${s.slidingScaleInsulinUnits} U (${s.insulinTypeRoute || 'SC'})` : '0 U'}</td>
                  <td>${s.targetGlucoseRange || '120-180'}</td>
                  <td>${s.recordedBy}</td>
                </tr>
              `).join('')}
              ${patientSugarList.length === 0 ? '<tr><td colspan="7" style="text-align:center;">No GRBS records logged yet.</td></tr>' : ''}
            </tbody>
          </table>

          <div class="section-title">2. 24-Hour Fluid Intake & Output (I/O) Balance Sheet</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Shift / Time</th>
                <th>Total Intake (mL)</th>
                <th>Urine Output (mL)</th>
                <th>NG / Tube Aspirate</th>
                <th>Drain Output</th>
                <th>Total Output (mL)</th>
                <th>Net Fluid Balance</th>
              </tr>
            </thead>
            <tbody>
              ${patientIoList.map(i => `
                <tr>
                  <td>${i.shift} (${new Date(i.dateTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })})</td>
                  <td style="color:#0284c7; font-weight:bold;">${i.totalIntakeMl} mL</td>
                  <td>${i.urineMl} mL</td>
                  <td>${i.ngTubeMl} mL</td>
                  <td>${i.drainMl} mL</td>
                  <td style="color:#e11d48; font-weight:bold;">${i.totalOutputMl} mL</td>
                  <td style="font-weight:bold; color:${i.netBalanceMl >= 0 ? '#059669' : '#d97706'};">
                    ${i.netBalanceMl >= 0 ? `+${i.netBalanceMl}` : i.netBalanceMl} mL
                  </td>
                </tr>
              `).join('')}
              ${patientIoList.length === 0 ? '<tr><td colspan="7" style="text-align:center;">No I/O records logged yet.</td></tr>' : ''}
            </tbody>
          </table>

          <div class="section-title">3. Daily Drain Output & Tube Care Chart</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Date/Time</th>
                <th>Drain Name & Site</th>
                <th>Volume (mL)</th>
                <th>Color & Aspect</th>
                <th>Doctor Instructions / Remarks</th>
                <th>Recorded By</th>
              </tr>
            </thead>
            <tbody>
              ${patientDrainList.map(d => `
                <tr>
                  <td>${new Date(d.dateTime).toLocaleString('en-IN')}</td>
                  <td><strong>${d.drainName}</strong><br/><em>${d.site}</em></td>
                  <td style="font-weight:bold; color:#be123c;">${d.volumeMl} mL</td>
                  <td>${d.colorAspect}</td>
                  <td>${d.doctorInstructions || 'N/A'}<br/>${d.remarks || ''}</td>
                  <td>${d.recordedBy}</td>
                </tr>
              `).join('')}
              ${patientDrainList.length === 0 ? '<tr><td colspan="6" style="text-align:center;">No drain records logged yet.</td></tr>' : ''}
            </tbody>
          </table>

          <div class="section-title">4. Endoscopy, Colonoscopy & Special Category Procedure Recovery</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Date/Time</th>
                <th>Procedure</th>
                <th>Bowel Prep / Recovery Score</th>
                <th>Vitals (BP/HR/SpO2)</th>
                <th>Abdominal & Bleeding Status</th>
                <th>Diet & Instructions</th>
              </tr>
            </thead>
            <tbody>
              ${patientEndoList.map(e => `
                <tr>
                  <td>${new Date(e.dateTime).toLocaleString('en-IN')}</td>
                  <td><strong>${e.procedureType}</strong></td>
                  <td>${e.bowelPrepStatus || ''}<br/>${e.sedationRecoveryScore || ''}</td>
                  <td>BP: ${e.bp} | HR: ${e.pulse} | SpO2: ${e.spo2}%</td>
                  <td>Abd: ${e.abdominalAssessment}<br/>Bleed: ${e.giBleedingCheck}</td>
                  <td>Diet: ${e.dietProgression}<br/>${e.doctorInstructions || ''}</td>
                </tr>
              `).join('')}
              ${patientEndoList.length === 0 ? '<tr><td colspan="6" style="text-align:center;">No endoscopy/colonoscopy recovery records logged yet.</td></tr>' : ''}
            </tbody>
          </table>

          <div class="sig-box">
            <div class="sig-item">
              <br/>Staff Nurse / Nursing Station Incharge
              <br/><span style="font-size:8px; color:#64748b;">(Signature & Staff ID)</span>
            </div>
            <div class="sig-item">
              <br/>Attending Clinician / Duty Consultant
              <br/><span style="font-size:8px; color:#64748b;">(Verified Signature & Stamp)</span>
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

  // Quick summary alerts calculations
  const latestSugar = patientSugarList[0];
  const isHighSugar = latestSugar && latestSugar.grbsValue > 250;
  const isLowSugar = latestSugar && latestSugar.grbsValue < 70;

  const totalDrainOutput24h = patientDrainList.reduce((acc, curr) => acc + curr.volumeMl, 0);
  const totalNetBalance24h = patientIoList.reduce((acc, curr) => acc + curr.netBalanceMl, 0);

  return (
    <div className="space-y-4">
      {/* Patient Selector Header Bar (Only if viewing as general nursing station tool) */}
      {!patientId && (
        <Card className="border bg-slate-900 text-white shadow-sm">
          <CardContent className="p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 shrink-0">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-sky-400">Clinical Flowsheet Station</p>
                <p className="text-sm font-extrabold text-white">Daily Drains, Fluid I/O, GRBS Sugar & Endoscopy Monitoring</p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Label className="text-xs font-bold text-slate-300 shrink-0">Select Patient:</Label>
              <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                <SelectTrigger className="w-full sm:w-[240px] h-9 text-xs bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Choose Patient..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 text-white border-slate-700">
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs focus:bg-slate-800 focus:text-white">
                      {p.name} ({p.mrn || 'N/A'})
                    </SelectItem>
                  ))}
                  {patients.length === 0 && (
                    <SelectItem value="p1" className="text-xs">
                      Rajesh Sharma (P-101)
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>

              <Button 
                size="sm" 
                variant="outline" 
                onClick={printFlowsheet}
                className="h-9 text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white border-sky-500 gap-1.5 shrink-0"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Flowsheet
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clinical Alert & High-Visibility Monitoring Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* GRBS Blood Sugar Summary */}
        <Card className={`border shadow-xs ${isHighSugar ? 'bg-rose-50 border-rose-300' : isLowSugar ? 'bg-amber-50 border-amber-300' : 'bg-sky-50/50 border-sky-200'}`}>
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <Syringe className={`w-4 h-4 ${isHighSugar ? 'text-rose-600' : isLowSugar ? 'text-amber-600' : 'text-sky-600'}`} />
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Blood Sugar (GRBS)</p>
              </div>
              <p className={`text-xl font-black mt-1 ${isHighSugar ? 'text-rose-700' : isLowSugar ? 'text-amber-700' : 'text-slate-900'}`}>
                {latestSugar ? `${latestSugar.grbsValue} mg/dL` : 'No Record'}
              </p>
              <p className="text-[10px] font-medium text-slate-500 mt-0.5">
                {latestSugar ? `Slot: ${latestSugar.slot} (${latestSugar.slidingScaleInsulinUnits || 0}U Insulin)` : 'Target: 120 - 180 mg/dL'}
              </p>
            </div>
            {isHighSugar && <Badge className="bg-rose-600 text-white text-[10px] animate-pulse">HIGH SUGAR</Badge>}
            {isLowSugar && <Badge className="bg-amber-600 text-white text-[10px] animate-pulse">HYPO ALERT</Badge>}
          </CardContent>
        </Card>

        {/* Fluid Intake / Output Balance */}
        <Card className="border shadow-xs bg-emerald-50/50 border-emerald-200">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <Droplet className="w-4 h-4 text-emerald-600" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Fluid Balance (24h)</p>
              </div>
              <p className={`text-xl font-black mt-1 ${totalNetBalance24h >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                {totalNetBalance24h >= 0 ? `+${totalNetBalance24h} mL` : `${totalNetBalance24h} mL`}
              </p>
              <p className="text-[10px] font-medium text-emerald-600 mt-0.5">
                {patientIoList.length > 0 ? `${patientIoList[0].totalIntakeMl} mL In / ${patientIoList[0].totalOutputMl} mL Out` : 'Fluid Chart Active'}
              </p>
            </div>
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">I/O NORMAL</Badge>
          </CardContent>
        </Card>

        {/* Daily Drain Total Output */}
        <Card className="border shadow-xs bg-purple-50/50 border-purple-200">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-purple-600" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-purple-800">Drain Total (24h)</p>
              </div>
              <p className="text-xl font-black text-purple-950 mt-1">
                {totalDrainOutput24h} mL
              </p>
              <p className="text-[10px] font-medium text-purple-700 mt-0.5">
                {patientDrainList.length} Drain Records Logged
              </p>
            </div>
            <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-[10px]">DRAIN CARE</Badge>
          </CardContent>
        </Card>

        {/* Endoscopy / Colonoscopy Recovery Status */}
        <Card className="border shadow-xs bg-indigo-50/50 border-indigo-200">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <Microscope className="w-4 h-4 text-indigo-600" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-800">Endoscopy / Colonoscopy</p>
              </div>
              <p className="text-sm font-black text-indigo-950 mt-1 truncate max-w-[130px]">
                {patientEndoList.length > 0 ? patientEndoList[0].procedureType : 'No Procedure'}
              </p>
              <p className="text-[10px] font-medium text-indigo-700 mt-0.5">
                {patientEndoList.length > 0 ? patientEndoList[0].dietProgression : 'Pre/Post Recovery Vitals'}
              </p>
            </div>
            <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300 text-[10px]">GI RECOVERY</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Main Flowsheet Tab Controller */}
      <Card className="border shadow-xs bg-white rounded-2xl overflow-hidden">
        <CardHeader className="p-4 bg-slate-50 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-600" />
              Special Category Flowsheets & Monitoring Charts
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Bedside monitoring logs for Blood Sugar (GRBS), Fluid I/O Balance, Daily Drain Output, and Endoscopy/Colonoscopy recovery.
            </CardDescription>
          </div>

          {patientId && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={printFlowsheet}
              className="h-8 text-xs font-bold border-slate-300 gap-1.5 shrink-0"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              Print Flowsheet
            </Button>
          )}
        </CardHeader>

        <CardContent className="p-4">
          <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
            <div className="flex items-center justify-between flex-wrap gap-2 pb-4 border-b">
              <TabsList className="bg-slate-100 p-1 rounded-xl flex-wrap">
                <TabsTrigger value="hourly" className="text-xs font-bold gap-1.5 data-[state=active]:bg-amber-500 data-[state=active]:text-amber-950">
                  <Clock className="w-3.5 h-3.5 text-amber-900" />
                  24-Hour Hourly Vitals & I/O Sheet
                </TabsTrigger>

                <TabsTrigger value="sugar" className="text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-sky-700">
                  <Syringe className="w-3.5 h-3.5 text-sky-600" />
                  Blood Sugar & Sliding Scale
                </TabsTrigger>

                <TabsTrigger value="io" className="text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-emerald-700">
                  <Droplet className="w-3.5 h-3.5 text-emerald-600" />
                  Fluid Intake & Output (I/O)
                </TabsTrigger>

                <TabsTrigger value="drain" className="text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-purple-700">
                  <Activity className="w-3.5 h-3.5 text-purple-600" />
                  Daily Drain Output
                </TabsTrigger>

                <TabsTrigger value="endo" className="text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-indigo-700">
                  <Microscope className="w-3.5 h-3.5 text-indigo-600" />
                  Endoscopy & Colonoscopy
                </TabsTrigger>
              </TabsList>

              {/* Add New Entry Buttons tailored to selected tab */}
              {activeTab === 'sugar' && (
                <Button 
                  size="sm" 
                  onClick={() => setIsSugarModalOpen(true)}
                  className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs gap-1.5 rounded-xl shadow-2xs"
                >
                  <Plus className="w-4 h-4" /> Log GRBS & Insulin
                </Button>
              )}

              {activeTab === 'io' && (
                <Button 
                  size="sm" 
                  onClick={() => setIsIoModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 rounded-xl shadow-2xs"
                >
                  <Plus className="w-4 h-4" /> Log Fluid I/O Balance
                </Button>
              )}

              {activeTab === 'drain' && (
                <Button 
                  size="sm" 
                  onClick={() => setIsDrainModalOpen(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs gap-1.5 rounded-xl shadow-2xs"
                >
                  <Plus className="w-4 h-4" /> Log Daily Drain Output
                </Button>
              )}

              {activeTab === 'endo' && (
                <Button 
                  size="sm" 
                  onClick={() => setIsEndoModalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5 rounded-xl shadow-2xs"
                >
                  <Plus className="w-4 h-4" /> Log Endoscopy Recovery Vitals
                </Button>
              )}
            </div>

            {/* TAB 0: 24-Hour Hourly Vitals & Intake/Output Sheet */}
            <TabsContent value="hourly" className="mt-4 space-y-4">
              <HourlyVitalsChart 
                patientId={selectedPatientId} 
                patientName={activePatientObj.name}
                ageSex={`${activePatientObj.age || 34} Yrs / ${activePatientObj.gender || 'F'}`}
                regNo={activePatientObj.mrn || 'NH/1871/2026'}
                wardBed="ICU / Bed-04"
                dateOfAdmission="2026-07-28"
                isDoctorView={false}
              />
            </TabsContent>

            {/* TAB 1: Blood Sugar GRBS & Sliding Scale Insulin */}
            <TabsContent value="sugar" className="mt-4 space-y-4">
              <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl flex items-center gap-2 text-xs text-sky-800">
                <Info className="w-4 h-4 text-sky-600 shrink-0" />
                <span>
                  <strong>Diabetic Monitoring Protocol:</strong> Log blood glucose before meals (Fasting, Pre-Lunch, Pre-Dinner) and at Bedtime/2am. Administer Human Actrapid SC or IV drip as per Doctor's Sliding Scale Instructions.
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <Table>
                  <TableHeader className="bg-slate-50 text-[11px] font-bold text-slate-600">
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Monitoring Slot</TableHead>
                      <TableHead>GRBS Value (mg/dL)</TableHead>
                      <TableHead>Urine Ketones</TableHead>
                      <TableHead>Insulin Administered</TableHead>
                      <TableHead>Route & Type</TableHead>
                      <TableHead>Doctor Instructions / Orders</TableHead>
                      <TableHead className="text-right">Recorded By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs divide-y">
                    {patientSugarList.map((entry) => {
                      const isHigh = entry.grbsValue > 200;
                      const isLow = entry.grbsValue < 70;
                      return (
                        <TableRow key={entry.id} className="hover:bg-slate-50">
                          <TableCell className="font-mono text-[11px]">
                            {new Date(entry.dateTime).toLocaleString('en-IN', {
                              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                            })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-slate-100 text-slate-800 font-bold text-[10px]">
                              {entry.slot}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className={`text-sm font-black px-2 py-0.5 rounded ${
                              isHigh ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                              isLow ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                              'bg-emerald-50 text-emerald-700'
                            }`}>
                              {entry.grbsValue} mg/dL
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`text-[11px] font-semibold ${entry.urineKetones && entry.urineKetones !== 'Negative' ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>
                              {entry.urineKetones || 'Negative'}
                            </span>
                          </TableCell>
                          <TableCell className="font-bold text-sky-700">
                            {entry.slidingScaleInsulinUnits ? `${entry.slidingScaleInsulinUnits} Units` : '0 Units (No dose)'}
                          </TableCell>
                          <TableCell className="text-slate-600 text-[11px]">
                            {entry.insulinTypeRoute || 'SC'}
                          </TableCell>
                          <TableCell className="text-slate-700 text-xs max-w-[200px]">
                            {entry.doctorOrders || 'Standard target 120-180 mg/dL'}
                          </TableCell>
                          <TableCell className="text-right font-medium text-slate-500 text-[11px]">
                            {entry.recordedBy}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {patientSugarList.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="py-8 text-center text-slate-400">
                          No blood sugar (GRBS) entries logged for this patient yet. Click "Log GRBS & Insulin" above.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* TAB 2: Fluid Intake & Output (I/O) Balance */}
            <TabsContent value="io" className="mt-4 space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
                <Info className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Fluid Balance Protocol:</strong> Record all Oral, IV Drips, Tube Feeds, and Blood Products on Intake; record Urine, NG Aspirate, Drains, and Vomitus on Output.
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <Table>
                  <TableHeader className="bg-slate-50 text-[11px] font-bold text-slate-600">
                    <TableRow>
                      <TableHead>Shift / Date</TableHead>
                      <TableHead>Intake Breakdown (mL)</TableHead>
                      <TableHead>Total Intake</TableHead>
                      <TableHead>Output Breakdown (mL)</TableHead>
                      <TableHead>Total Output</TableHead>
                      <TableHead>Net Fluid Balance</TableHead>
                      <TableHead>Remarks & Notes</TableHead>
                      <TableHead className="text-right">Recorded By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs divide-y">
                    {patientIoList.map((entry) => (
                      <TableRow key={entry.id} className="hover:bg-slate-50">
                        <TableCell className="font-bold text-slate-800">
                          <p className="text-xs">{entry.shift}</p>
                          <p className="text-[10px] text-slate-400 font-normal">
                            {new Date(entry.dateTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </p>
                        </TableCell>
                        <TableCell className="text-[11px] text-slate-600">
                          <div>Oral: {entry.oralMl} mL</div>
                          <div>IV: {entry.ivFluidMl} mL</div>
                          {entry.tubeFeedMl > 0 && <div>Tube: {entry.tubeFeedMl} mL</div>}
                          {entry.bloodProductsMl > 0 && <div className="text-rose-600 font-bold">Blood: {entry.bloodProductsMl} mL</div>}
                        </TableCell>
                        <TableCell className="font-black text-sky-700 text-sm">
                          {entry.totalIntakeMl} mL
                        </TableCell>
                        <TableCell className="text-[11px] text-slate-600">
                          <div>Urine: {entry.urineMl} mL</div>
                          <div>NG Tube: {entry.ngTubeMl} mL</div>
                          <div>Drain: {entry.drainMl} mL</div>
                          {entry.vomitusStoolMl > 0 && <div>Vomit/Stool: {entry.vomitusStoolMl} mL</div>}
                        </TableCell>
                        <TableCell className="font-black text-rose-600 text-sm">
                          {entry.totalOutputMl} mL
                        </TableCell>
                        <TableCell>
                          <span className={`text-sm font-black px-2 py-0.5 rounded ${
                            entry.netBalanceMl >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {entry.netBalanceMl >= 0 ? `+${entry.netBalanceMl}` : entry.netBalanceMl} mL
                          </span>
                        </TableCell>
                        <TableCell className="text-slate-700 text-xs max-w-[180px]">
                          {entry.remarks || 'Fluid status normal'}
                        </TableCell>
                        <TableCell className="text-right font-medium text-slate-500 text-[11px]">
                          {entry.recordedBy}
                        </TableCell>
                      </TableRow>
                    ))}
                    {patientIoList.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="py-8 text-center text-slate-400">
                          No fluid intake & output entries recorded for this patient yet. Click "Log Fluid I/O Balance" above.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* TAB 3: Daily Drain Output & Tube Care */}
            <TabsContent value="drain" className="mt-4 space-y-4">
              <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl flex items-center gap-2 text-xs text-purple-800">
                <Info className="w-4 h-4 text-purple-600 shrink-0" />
                <span>
                  <strong>Drain Care Protocol:</strong> Monitor Jackson-Pratt, Pelvic, Chest Tube, or Abdominal drains. Record volume, color (Serous, Bilious, Sanguineous), and vacuum re-priming status.
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <Table>
                  <TableHeader className="bg-slate-50 text-[11px] font-bold text-slate-600">
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Drain Identification</TableHead>
                      <TableHead>Anatomical Site</TableHead>
                      <TableHead>Volume (mL)</TableHead>
                      <TableHead>Color & Aspect</TableHead>
                      <TableHead>Doctor Instructions & Removal Criteria</TableHead>
                      <TableHead>Nursing Remarks</TableHead>
                      <TableHead className="text-right">Recorded By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs divide-y">
                    {patientDrainList.map((entry) => (
                      <TableRow key={entry.id} className="hover:bg-slate-50">
                        <TableCell className="font-mono text-[11px]">
                          {new Date(entry.dateTime).toLocaleString('en-IN', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell className="font-bold text-purple-900">
                          {entry.drainName}
                        </TableCell>
                        <TableCell className="text-slate-700">
                          {entry.site}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-black text-purple-700 px-2 py-0.5 bg-purple-50 rounded">
                            {entry.volumeMl} mL
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] font-bold ${
                            entry.colorAspect === 'Bilious' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                            entry.colorAspect === 'Hemorrhagic' || entry.colorAspect === 'Sanguineous' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            {entry.colorAspect}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-700 max-w-[200px]">
                          {entry.doctorInstructions || 'Monitor output every shift.'}
                        </TableCell>
                        <TableCell className="text-slate-600 text-xs max-w-[180px]">
                          {entry.remarks || 'Site clean.'}
                        </TableCell>
                        <TableCell className="text-right font-medium text-slate-500 text-[11px]">
                          {entry.recordedBy}
                        </TableCell>
                      </TableRow>
                    ))}
                    {patientDrainList.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="py-8 text-center text-slate-400">
                          No drain records logged for this patient yet. Click "Log Daily Drain Output" above.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* TAB 4: Endoscopy & Colonoscopy Procedure Recovery */}
            <TabsContent value="endo" className="mt-4 space-y-4">
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-2 text-xs text-indigo-800">
                <Info className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  <strong>Post-Endoscopy & Colonoscopy Recovery Protocol:</strong> Track Bowel Prep status, Sedation Aldrete recovery score, Post-op vitals, Abdominal tenderness/rigidity check, and diet progression.
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <Table>
                  <TableHeader className="bg-slate-50 text-[11px] font-bold text-slate-600">
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Procedure</TableHead>
                      <TableHead>Bowel Prep & Recovery Score</TableHead>
                      <TableHead>Vitals (BP / HR / SpO2)</TableHead>
                      <TableHead>Abdominal & Bleeding Check</TableHead>
                      <TableHead>Diet Progression</TableHead>
                      <TableHead>Biopsy Specimen</TableHead>
                      <TableHead className="text-right">Recorded By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs divide-y">
                    {patientEndoList.map((entry) => (
                      <TableRow key={entry.id} className="hover:bg-slate-50">
                        <TableCell className="font-mono text-[11px]">
                          {new Date(entry.dateTime).toLocaleString('en-IN', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell className="font-bold text-indigo-900">
                          {entry.procedureType}
                        </TableCell>
                        <TableCell className="text-slate-700">
                          <p className="font-semibold text-xs text-indigo-700">{entry.bowelPrepStatus || 'N/A'}</p>
                          <p className="text-[10px] text-slate-500">{entry.sedationRecoveryScore}</p>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          <div>BP: <strong className="text-slate-900">{entry.bp}</strong></div>
                          <div>HR: <strong>{entry.pulse}</strong> /min | SpO2: <strong>{entry.spo2}%</strong></div>
                        </TableCell>
                        <TableCell>
                          <div className={`text-[11px] font-bold ${entry.abdominalAssessment.includes('Alert') ? 'text-rose-600' : 'text-emerald-700'}`}>
                            {entry.abdominalAssessment}
                          </div>
                          <div className="text-[10px] text-slate-500">Bleed: {entry.giBleedingCheck}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-teal-50 text-teal-800 border-teal-200 text-[10px]">
                            {entry.dietProgression}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-slate-700">
                          {entry.biopsyTaken ? (
                            <span className="text-purple-700 font-bold">✓ Biopsy Taken: {entry.specimenDetails}</span>
                          ) : (
                            <span className="text-slate-400">No Biopsy</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium text-slate-500 text-[11px]">
                          {entry.recordedBy}
                        </TableCell>
                      </TableRow>
                    ))}
                    {patientEndoList.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="py-8 text-center text-slate-400">
                          No endoscopy/colonoscopy recovery entries logged yet. Click "Log Endoscopy Recovery Vitals" above.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* MODAL 1: Log Blood Sugar (GRBS) & Insulin */}
      <Dialog open={isSugarModalOpen} onOpenChange={setIsSugarModalOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-sky-950 flex items-center gap-2">
              <Syringe className="w-5 h-5 text-sky-600" />
              Log Blood Sugar (GRBS) & Sliding Scale Insulin
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Record point-of-care capillary blood glucose (mg/dL) and insulin administration.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Monitoring Slot</Label>
                <Select value={newSugar.slot} onValueChange={(val: any) => setNewSugar({ ...newSugar, slot: val })}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fasting">Fasting (Morning 7am)</SelectItem>
                    <SelectItem value="Pre-Breakfast">Pre-Breakfast</SelectItem>
                    <SelectItem value="Post-Breakfast">Post-Breakfast</SelectItem>
                    <SelectItem value="Pre-Lunch">Pre-Lunch</SelectItem>
                    <SelectItem value="Post-Lunch">Post-Lunch</SelectItem>
                    <SelectItem value="Pre-Dinner">Pre-Dinner</SelectItem>
                    <SelectItem value="Bedtime (10pm)">Bedtime (10pm)</SelectItem>
                    <SelectItem value="2:00 AM">2:00 AM</SelectItem>
                    <SelectItem value="Custom">Custom / Stat Check</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-slate-500">GRBS Value (mg/dL)</Label>
                <Input 
                  type="number"
                  placeholder="e.g. 180" 
                  value={newSugar.grbsValue}
                  onChange={(e) => setNewSugar({ ...newSugar, grbsValue: e.target.value })}
                  className="h-9 font-bold text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Sliding Scale Insulin (Units)</Label>
                <Input 
                  type="number"
                  placeholder="e.g. 4" 
                  value={newSugar.slidingScaleInsulinUnits}
                  onChange={(e) => setNewSugar({ ...newSugar, slidingScaleInsulinUnits: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Insulin Type & Route</Label>
                <Input 
                  placeholder="e.g. Human Actrapid SC" 
                  value={newSugar.insulinTypeRoute}
                  onChange={(e) => setNewSugar({ ...newSugar, insulinTypeRoute: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Urine Ketones (If Sugar &gt; 250)</Label>
                <Select value={newSugar.urineKetones} onValueChange={(val: any) => setNewSugar({ ...newSugar, urineKetones: val })}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Negative">Negative</SelectItem>
                    <SelectItem value="Trace">Trace</SelectItem>
                    <SelectItem value="1+">1+</SelectItem>
                    <SelectItem value="2+">2+</SelectItem>
                    <SelectItem value="3+">3+</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Hypoglycemia Check / Symptoms</Label>
                <Input 
                  placeholder="e.g. None / Mild diaphoresis" 
                  value={newSugar.hypoSymptoms}
                  onChange={(e) => setNewSugar({ ...newSugar, hypoSymptoms: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-slate-500">Doctor Instructions / Target Range</Label>
              <Input 
                placeholder="Target 120-180 mg/dL. Administer SC insulin as per sliding scale." 
                value={newSugar.doctorOrders}
                onChange={(e) => setNewSugar({ ...newSugar, doctorOrders: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl text-xs" onClick={() => setIsSugarModalOpen(false)}>Cancel</Button>
            <Button className="bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs" onClick={handleAddSugar}>
              Save GRBS Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Log Fluid Intake & Output (I/O) Balance */}
      <Dialog open={isIoModalOpen} onOpenChange={setIsIoModalOpen}>
        <DialogContent className="sm:max-w-[550px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-emerald-950 flex items-center gap-2">
              <Droplet className="w-5 h-5 text-emerald-600" />
              Log Fluid Intake & Output (I/O) Balance
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Record 24-hour shift intake (Oral, IV, Tube) and output (Urine, NG, Drain).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-slate-500">Shift</Label>
              <Select value={newIo.shift} onValueChange={(val: any) => setNewIo({ ...newIo, shift: val })}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Morning (8am-2pm)">Morning Shift (8am - 2pm)</SelectItem>
                  <SelectItem value="Evening (2pm-8pm)">Evening Shift (2pm - 8pm)</SelectItem>
                  <SelectItem value="Night (8pm-8am)">Night Shift (8pm - 8am)</SelectItem>
                  <SelectItem value="Custom">Custom Timestamp</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-sky-50/70 border border-sky-100 rounded-xl space-y-2">
              <p className="font-bold text-sky-900 text-xs flex items-center gap-1">
                <Droplet className="w-3.5 h-3.5 text-sky-600" /> FLUID INTAKE (mL)
              </p>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label className="text-[9px] text-slate-500">Oral / Water</Label>
                  <Input type="number" value={newIo.oralMl} onChange={(e) => setNewIo({ ...newIo, oralMl: e.target.value })} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[9px] text-slate-500">IV Drips</Label>
                  <Input type="number" value={newIo.ivFluidMl} onChange={(e) => setNewIo({ ...newIo, ivFluidMl: e.target.value })} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[9px] text-slate-500">Tube Feed</Label>
                  <Input type="number" value={newIo.tubeFeedMl} onChange={(e) => setNewIo({ ...newIo, tubeFeedMl: e.target.value })} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[9px] text-slate-500">Blood / PCV</Label>
                  <Input type="number" value={newIo.bloodProductsMl} onChange={(e) => setNewIo({ ...newIo, bloodProductsMl: e.target.value })} className="h-8 text-xs" />
                </div>
              </div>
            </div>

            <div className="p-3 bg-rose-50/70 border border-rose-100 rounded-xl space-y-2">
              <p className="font-bold text-rose-900 text-xs flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-rose-600" /> FLUID OUTPUT (mL)
              </p>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label className="text-[9px] text-slate-500">Urine Output</Label>
                  <Input type="number" value={newIo.urineMl} onChange={(e) => setNewIo({ ...newIo, urineMl: e.target.value })} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[9px] text-slate-500">NG Aspirate</Label>
                  <Input type="number" value={newIo.ngTubeMl} onChange={(e) => setNewIo({ ...newIo, ngTubeMl: e.target.value })} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[9px] text-slate-500">Drains Total</Label>
                  <Input type="number" value={newIo.drainMl} onChange={(e) => setNewIo({ ...newIo, drainMl: e.target.value })} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[9px] text-slate-500">Vomit / Stool</Label>
                  <Input type="number" value={newIo.vomitusStoolMl} onChange={(e) => setNewIo({ ...newIo, vomitusStoolMl: e.target.value })} className="h-8 text-xs" />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-slate-500">Nursing Remarks</Label>
              <Input 
                placeholder="e.g. Diuretic given at 10am. Net positive balance +400 mL." 
                value={newIo.remarks}
                onChange={(e) => setNewIo({ ...newIo, remarks: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl text-xs" onClick={() => setIsIoModalOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs" onClick={handleAddIo}>
              Save Fluid I/O Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: Log Daily Drain Output */}
      <Dialog open={isDrainModalOpen} onOpenChange={setIsDrainModalOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-purple-950 flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-600" />
              Log Daily Drain Output & Tube Care
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Record volume, color aspect, and vacuum status for surgical/abdominal drains.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Drain Name / Type</Label>
                <Input 
                  placeholder="e.g. Drain 1 - Abdominal JP" 
                  value={newDrain.drainName}
                  onChange={(e) => setNewDrain({ ...newDrain, drainName: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Anatomical Site</Label>
                <Input 
                  placeholder="e.g. Right Lower Quadrant / Sub-hepatic" 
                  value={newDrain.site}
                  onChange={(e) => setNewDrain({ ...newDrain, site: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Volume Output (mL)</Label>
                <Input 
                  type="number"
                  placeholder="e.g. 60" 
                  value={newDrain.volumeMl}
                  onChange={(e) => setNewDrain({ ...newDrain, volumeMl: e.target.value })}
                  className="h-9 font-bold text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Color & Aspect</Label>
                <Select value={newDrain.colorAspect} onValueChange={(val: any) => setNewDrain({ ...newDrain, colorAspect: val })}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Serous">Serous (Pale yellow / Straw)</SelectItem>
                    <SelectItem value="Serosanguineous">Serosanguineous (Pink / Pale Red)</SelectItem>
                    <SelectItem value="Sanguineous">Sanguineous (Fresh Blood)</SelectItem>
                    <SelectItem value="Bilious">Bilious (Dark Green / Yellow Bile)</SelectItem>
                    <SelectItem value="Purulent">Purulent (Turbid Pus / Infection)</SelectItem>
                    <SelectItem value="Feculent">Feculent (Stool-like)</SelectItem>
                    <SelectItem value="Hemorrhagic">Hemorrhagic (Dark Red Blood)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-slate-500">Doctor Instructions / Removal Threshold</Label>
              <Input 
                placeholder="e.g. Notify doctor if > 100 mL/shift or if bilious/frank blood." 
                value={newDrain.doctorInstructions}
                onChange={(e) => setNewDrain({ ...newDrain, doctorInstructions: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-slate-500">Nursing Site Remarks</Label>
              <Input 
                placeholder="e.g. Site dressing clean and dry. Vacuum bulb re-primed." 
                value={newDrain.remarks}
                onChange={(e) => setNewDrain({ ...newDrain, remarks: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl text-xs" onClick={() => setIsDrainModalOpen(false)}>Cancel</Button>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs" onClick={handleAddDrain}>
              Save Drain Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: Log Endoscopy & Colonoscopy Recovery Vitals */}
      <Dialog open={isEndoModalOpen} onOpenChange={setIsEndoModalOpen}>
        <DialogContent className="sm:max-w-[550px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-indigo-950 flex items-center gap-2">
              <Microscope className="w-5 h-5 text-indigo-600" />
              Log Endoscopy & Colonoscopy Procedure Recovery
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Record pre/post procedure recovery vitals, bowel prep status, and diet orders.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Procedure Type</Label>
                <Select value={newEndo.procedureType} onValueChange={(val: any) => setNewEndo({ ...newEndo, procedureType: val })}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Upper GI Endoscopy">Upper GI Endoscopy (EGD)</SelectItem>
                    <SelectItem value="Colonoscopy">Colonoscopy</SelectItem>
                    <SelectItem value="ERCP">ERCP / Stenting</SelectItem>
                    <SelectItem value="Polypectomy">Polypectomy</SelectItem>
                    <SelectItem value="EVL Banding">EVL Banding</SelectItem>
                    <SelectItem value="Other GI Procedure">Other Special GI Procedure</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Bowel Prep / Clearance Status</Label>
                <Select value={newEndo.bowelPrepStatus} onValueChange={(val: any) => setNewEndo({ ...newEndo, bowelPrepStatus: val })}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Clear Yellow Liquid Stool">Clear Yellow Liquid Stool (Ideal)</SelectItem>
                    <SelectItem value="Excellent">Excellent</SelectItem>
                    <SelectItem value="Good">Good</SelectItem>
                    <SelectItem value="Fair">Fair</SelectItem>
                    <SelectItem value="Poor (Incomplete)">Poor (Incomplete Prep)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <Label className="text-[9px] text-slate-500 font-bold">BP (mmHg)</Label>
                <Input value={newEndo.bp} onChange={(e) => setNewEndo({ ...newEndo, bp: e.target.value })} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-[9px] text-slate-500 font-bold">Pulse (/min)</Label>
                <Input value={newEndo.pulse} onChange={(e) => setNewEndo({ ...newEndo, pulse: e.target.value })} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-[9px] text-slate-500 font-bold">SpO2 (%)</Label>
                <Input value={newEndo.spo2} onChange={(e) => setNewEndo({ ...newEndo, spo2: e.target.value })} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-[9px] text-slate-500 font-bold">Temp (°F)</Label>
                <Input value={newEndo.temp} onChange={(e) => setNewEndo({ ...newEndo, temp: e.target.value })} className="h-8 text-xs" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Abdominal Assessment</Label>
                <Select value={newEndo.abdominalAssessment} onValueChange={(val: any) => setNewEndo({ ...newEndo, abdominalAssessment: val })}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Soft non-tender">Soft non-tender (Normal)</SelectItem>
                    <SelectItem value="Minimal cramping">Minimal post-procedure cramping</SelectItem>
                    <SelectItem value="Distension present">Distension present</SelectItem>
                    <SelectItem value="Guarding/Rigidity (Alert!)">Guarding/Rigidity (Alert Doctor!)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Diet Progression Order</Label>
                <Select value={newEndo.dietProgression} onValueChange={(val: any) => setNewEndo({ ...newEndo, dietProgression: val })}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NPO">NPO (Nothing By Mouth)</SelectItem>
                    <SelectItem value="Sips of Water">Sips of Water</SelectItem>
                    <SelectItem value="Clear Liquids">Clear Liquids</SelectItem>
                    <SelectItem value="Soft Diet">Soft Diet</SelectItem>
                    <SelectItem value="Regular Diet">Regular Diet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-2.5 border border-purple-200 bg-purple-50/50 rounded-xl space-y-2">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="biopsyChk"
                  checked={newEndo.biopsyTaken}
                  onChange={(e) => setNewEndo({ ...newEndo, biopsyTaken: e.target.checked })}
                  className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                />
                <Label htmlFor="biopsyChk" className="text-xs font-bold text-purple-900 cursor-pointer">
                  Biopsy Taken & Specimen Sent to Histopathology
                </Label>
              </div>
              {newEndo.biopsyTaken && (
                <Input 
                  placeholder="Specimen details (e.g. Antral mucosa biopsy x 2)" 
                  value={newEndo.specimenDetails}
                  onChange={(e) => setNewEndo({ ...newEndo, specimenDetails: e.target.value })}
                  className="h-8 text-xs bg-white border-purple-200"
                />
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-slate-500">Doctor Recovery Instructions</Label>
              <Input 
                placeholder="Observe for 2 hours. If no pain or vomiting, start sips of water." 
                value={newEndo.doctorInstructions}
                onChange={(e) => setNewEndo({ ...newEndo, doctorInstructions: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl text-xs" onClick={() => setIsEndoModalOpen(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs" onClick={handleAddEndo}>
              Save Recovery Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
