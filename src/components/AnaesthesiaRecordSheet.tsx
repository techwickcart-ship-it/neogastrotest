import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Printer, 
  Save, 
  CheckSquare, 
  Activity, 
  Stethoscope, 
  Heart, 
  Plus, 
  Trash2, 
  UserCheck, 
  AlertCircle,
  FileText,
  Clock,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';
import PostOpForms from './PostOpForms';

export interface AnaesthesiaRecordData {
  // Top Header
  hospitalName: string;
  regNo: string;
  patientName: string;
  ageSex: string;
  heightWeight: string;
  uhidNo: string;
  ipdNo: string;
  wardBed: string;
  date: string;
  time: string;
  consultantIncharge: string;
  anaesthesiologist: string;
  pacDone: boolean;
  consentSigned: boolean;
  pacConsentDate: string;

  // PAC Findings
  gc: 'Fair' | 'Mod' | 'Poor';
  pulse: string;
  bp: string;
  rr: string;
  cvs: string;
  pa: string;
  dentition: string;
  neckMvts: string;
  spine: string;
  mpc: '1' | '2' | '3' | '4';

  // Significant Investigations & Premedication
  significantInvestigations: string;
  monitors: {
    nibp: boolean;
    pulseOx: boolean;
    ecg: boolean;
    etco2: boolean;
  };
  premedication: string;

  // Anaesthesia Checklist
  checklist: {
    machine: boolean;
    drugs: boolean;
    oxygen: boolean;
    suction: boolean;
    specialEquipment: boolean;
  };
  patientPosition: string;

  // Regional / Block
  regionalSpace: string;
  regionalDrug: string;
  regionalNeedle: string;
  regionalTechnique: string;

  // General / Induction / Airway
  inductionAgent: string;
  airwayManagement: string;
  maintenanceAnaesthesia: string;
  ventilationType: 'Spont' | 'Controlled';
  ventilationRR: string;
  ventilationTV: string;
  pressurePointEyeCare: string;

  // Intra-op Vitals Time Grid
  vitalsGrid: Array<{
    timeSlot: string; // e.g., '15', '30', '45', '1h', '15', '30'...
    pulse: string;
    bps: string; // Systolic
    bpd: string; // Diastolic
    spo2: string;
    etco2: string;
  }>;

  ivFluids: string;
  drugsGiven: string;
  remarks: string;
  interopNotes?: string; // Interop Anesthesia Notes
  urineOutputMl: string;

  // Reversal
  reversalNeostigmineMg: string;
  reversalGlycoAtropineMg: string;
  extubation: 'Y' | 'N';

  // Post Op Consciousness
  postOpPulse: string;
  postOpBp: string;
  postOpRr: string;
  postOpCvs: string;
  postOpCns: string;
  postOpHeadLifting: 'Y' | 'N' | 'NA';

  // Post Op Orders
  nbmTillTime: string;
  positioningOrder: string;
  vitalsMonitoringOrder: string;
  ivFluidsLitresOrder: string;
  informSos: boolean;
  signatureAnaesthetist: string;
}

const DEFAULT_RECORD: AnaesthesiaRecordData = {
  hospitalName: 'GASTRO PLUS HOSPITAL',
  regNo: 'NH187120W/2019',
  patientName: 'PRIYANKA PARTE',
  ageSex: '34 Y / Female',
  heightWeight: '162 cm / 64 kg',
  uhidNo: 'LL/7209/MAY-2026',
  ipdNo: 'IPD-8821',
  wardBed: 'OT Room-1 / Bed 02',
  date: '2026-07-17',
  time: '08:30 AM',
  consultantIncharge: 'Dr. Navodita Tiwari',
  anaesthesiologist: 'Dr. Alok Verma',
  pacDone: true,
  consentSigned: true,
  pacConsentDate: '17/07/2026',

  gc: 'Fair',
  pulse: '78',
  bp: '124/80',
  rr: '16',
  cvs: 'S1 S2 Normal',
  pa: 'Soft, Non-tender',
  dentition: 'Intact, No loose teeth',
  neckMvts: 'Full range of motion',
  spine: 'Normal, No deformity',
  mpc: '1',

  significantInvestigations: 'Hb: 12.4 g/dL, Platelets: 2.4L, Blood Group: O+ve, ECG: Normal Sinus Rhythm',
  monitors: {
    nibp: true,
    pulseOx: true,
    ecg: true,
    etco2: true
  },
  premedication: 'Inj. Glycopyrrolate 0.2mg IV, Inj. Midazolam 1mg IV, Inj. Ondansetron 4mg IV',

  checklist: {
    machine: true,
    drugs: true,
    oxygen: true,
    suction: true,
    specialEquipment: true
  },
  patientPosition: 'Supine Position',

  regionalSpace: 'L3-L4 Interspace',
  regionalDrug: 'Bupivacaine Heavy 0.5% (3.2ml)',
  regionalNeedle: '25G Quincke Needle',
  regionalTechnique: 'Subarachnoid Block (Spinal)',

  inductionAgent: 'Inj. Propofol 120mg IV + Inj. Fentanyl 100mcg IV',
  airwayManagement: 'ET Tube No. 7.0 Cuffed placed smoothly',
  maintenanceAnaesthesia: 'Sevoflurane 1.5-2.0% + O2/N2O (50:50)',
  ventilationType: 'Controlled',
  ventilationRR: '12',
  ventilationTV: '450',
  pressurePointEyeCare: 'Eye pads applied, all pressure points padded',

  vitalsGrid: [
    { timeSlot: '15m', pulse: '82', bps: '126', bpd: '82', spo2: '99', etco2: '35' },
    { timeSlot: '30m', pulse: '78', bps: '120', bpd: '78', spo2: '100', etco2: '36' },
    { timeSlot: '45m', pulse: '74', bps: '118', bpd: '76', spo2: '100', etco2: '34' },
    { timeSlot: '1h',  pulse: '76', bps: '122', bpd: '80', spo2: '99', etco2: '35' },
    { timeSlot: '1h 15m', pulse: '75', bps: '119', bpd: '77', spo2: '100', etco2: '36' },
    { timeSlot: '1h 30m', pulse: '72', bps: '115', bpd: '75', spo2: '100', etco2: '35' }
  ],

  ivFluids: 'Ringer Lactate 1000ml + Normal Saline 500ml',
  drugsGiven: 'Inj. Paracetamol 1gm IV, Inj. Tramadol 50mg IV',
  remarks: 'Intra-op vitals stable throughout procedure. No hypoxemia or hypotension.',
  interopNotes: 'Interop Events: Patient maintained on Sevoflurane + O2/N2O. Hemodynamics remained stable throughout interop period (BP 115-126/75-82). ETT cuff pressure monitored. No interop allergic reactions or arrhythmias.',
  urineOutputMl: '250',

  reversalNeostigmineMg: '2.5',
  reversalGlycoAtropineMg: '0.5',
  extubation: 'Y',

  postOpPulse: '76',
  postOpBp: '120/78',
  postOpRr: '16',
  postOpCvs: 'S1 S2 Normal',
  postOpCns: 'Conscious, Oriented',
  postOpHeadLifting: 'Y',

  nbmTillTime: '02:00 PM',
  positioningOrder: 'Head low / Supine position for 6 hours',
  vitalsMonitoringOrder: 'Monitor PR, BP, SpO2 & Respiration q15min x 2 hrs, then q1hr',
  ivFluidsLitresOrder: '1.5',
  informSos: true,
  signatureAnaesthetist: 'Dr. Alok Verma (DA, MD Anaesthesia)'
};

interface AnaesthesiaRecordSheetProps {
  patientData?: any;
  onSave?: (data: AnaesthesiaRecordData) => void;
}

export default function AnaesthesiaRecordSheet({ patientData, onSave }: AnaesthesiaRecordSheetProps) {
  const [isPostOpAnaesthesiaOpen, setIsPostOpAnaesthesiaOpen] = useState(false);
  const [record, setRecord] = useState<AnaesthesiaRecordData>(() => {
    if (patientData) {
      return {
        ...DEFAULT_RECORD,
        patientName: patientData.name || DEFAULT_RECORD.patientName,
        uhidNo: patientData.mrn || DEFAULT_RECORD.uhidNo,
        ageSex: `${patientData.age || 34} Y / ${patientData.gender || 'Female'}`
      };
    }
    return DEFAULT_RECORD;
  });

  const handlePrint = (printBlank = false) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Unable to open print preview window');
      return;
    }

    const data = printBlank ? {
      hospitalName: 'NEO GASTROPLUS HOSPITAL',
      regNo: 'NH187120W/2019',
      patientName: '........................................................',
      ageSex: '................',
      heightWeight: '................',
      uhidNo: '........................',
      ipdNo: '............',
      wardBed: '....................',
      date: '................',
      time: '........',
      consultantIncharge: '....................................',
      anaesthesiologist: '....................................',
      pacDone: false,
      consentSigned: false,
      pacConsentDate: '............',
      gc: 'Fair' as const,
      pulse: '____',
      bp: '____ / ____',
      rr: '____',
      cvs: '____________',
      pa: '____________',
      dentition: '____________',
      neckMvts: '____________',
      spine: '____________',
      mpc: '1' as const,
      significantInvestigations: '....................................................................................................',
      monitors: { nibp: false, pulseOx: false, ecg: false, etco2: false },
      premedication: '....................................................................................................',
      checklist: { machine: false, drugs: false, oxygen: false, suction: false, specialEquipment: false },
      patientPosition: '....................................',
      regionalSpace: '............',
      regionalDrug: '........................',
      regionalNeedle: '............',
      regionalTechnique: '........................',
      inductionAgent: '....................................',
      airwayManagement: '....................................',
      maintenanceAnaesthesia: '....................................',
      ventilationType: 'Controlled' as const,
      ventilationRR: '____',
      ventilationTV: '____',
      pressurePointEyeCare: '....................................',
      vitalsGrid: Array(8).fill({ timeSlot: '', pulse: '', bps: '', bpd: '', spo2: '', etco2: '' }),
      ivFluids: '....................................................................................................',
      drugsGiven: '....................................................................................................',
      remarks: '....................................................................................................',
      urineOutputMl: '____',
      reversalNeostigmineMg: '____',
      reversalGlycoAtropineMg: '____',
      extubation: 'Y' as const,
      postOpPulse: '____',
      postOpBp: '____ / ____',
      postOpRr: '____',
      postOpCvs: '____________',
      postOpCns: '____________',
      postOpHeadLifting: 'Y' as const,
      nbmTillTime: '..........',
      positioningOrder: '..................................................',
      vitalsMonitoringOrder: '..................................................',
      ivFluidsLitresOrder: '____',
      informSos: true,
      signatureAnaesthetist: '....................................'
    } : record;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Anaesthesia Record Sheet - ${printBlank ? 'Blank Sheet' : data.patientName}</title>
          <style>
            @page { size: A4 portrait; margin: 8mm 10mm 8mm 10mm; }
            * { box-sizing: border-box; -webkit-font-smoothing: antialiased !important; -moz-osx-font-smoothing: grayscale !important; }
            body { 
              font-family: Arial, Helvetica, sans-serif; 
              color: #000000 !important; 
              background: #ffffff; 
              font-size: 8.5pt; 
              font-weight: 700;
              line-height: 1.2;
              padding: 0;
              margin: 0;
            }
            .border-box {
              border: 2px solid #000000;
              padding: 5px;
              width: 100%;
              box-sizing: border-box;
              color: #000000 !important;
            }
            .header-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 4px;
            }
            .header-table td {
              vertical-align: middle;
              color: #000000 !important;
            }
            .hospital-title {
              font-size: 14pt;
              font-weight: 900;
              text-align: center;
              letter-spacing: 0.5px;
              color: #000000 !important;
            }
            .hospital-sub {
              font-size: 7.5pt;
              text-align: center;
              font-weight: 800;
              color: #000000 !important;
            }
            .doc-title {
              font-size: 11.5pt;
              font-weight: 900;
              text-align: center;
              margin: 3px 0;
              border-top: 1.5px solid #000000;
              border-bottom: 1.5px solid #000000;
              padding: 2px 0;
              color: #000000 !important;
              background-color: #f2f2f2 !important;
            }
            .grid-table {
              width: 100%;
              border-collapse: collapse;
            }
            .grid-table td, .grid-table th {
              border: 1.5px solid #000000;
              padding: 3px 5px;
              font-size: 8.5pt;
              vertical-align: top;
              color: #000000 !important;
              font-weight: 700;
            }
            .grid-table th {
              font-weight: 900;
              background-color: #f2f2f2 !important;
            }
            .underline-field {
              border-bottom: 1.5px solid #000000;
              font-weight: 900;
              display: inline-block;
              padding: 0 2px;
              color: #000000 !important;
            }
            .vitals-grid {
              width: 100%;
              border-collapse: collapse;
              margin-top: 2px;
            }
            .vitals-grid td, .vitals-grid th {
              border: 1.5px solid #000000;
              padding: 3px;
              font-size: 8pt;
              text-align: center;
              color: #000000 !important;
              font-weight: 700;
            }
            .vitals-grid th {
              background-color: #f2f2f2 !important;
              font-weight: 900;
            }
            .check-box {
              display: inline-block;
              width: 11px;
              height: 11px;
              border: 1.5px solid #000000;
              text-align: center;
              line-height: 10px;
              font-size: 9px;
              font-weight: 900;
              margin-right: 2px;
              color: #000000 !important;
            }
            @media print {
              * {
                color: #000000 !important;
                border-color: #000000 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              body {
                background: #ffffff !important;
                color: #000000 !important;
                font-weight: 700 !important;
              }
            }
              text-align: center;
              line-height: 9px;
              font-size: 8px;
              font-weight: bold;
              margin-right: 3px;
            }
            @media print {
              body { font-size: 8pt; }
            }
          </style>
        </head>
        <body>
          <div class="border-box">
            <!-- Header -->
            <table class="header-table">
              <tr>
                <td style="width: 15%; text-align: left;">
                  <div style="border: 2px solid #000; border-radius: 50%; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 8pt; text-align: center;">GPH</div>
                </td>
                <td style="width: 70%;">
                  <div class="hospital-title">GASTRO PLUS HOSPITAL</div>
                  <div class="hospital-sub">Plot No. 7 & 8, Om Shiv Nagar, Gufa Mandir Road, Lal Ghati Bhopal, 462030, Madhya Pradesh</div>
                  <div class="hospital-sub">Ph: 9109102145/9109101246 &bull; Email: gatroplusbhopal@gmail.com</div>
                </td>
                <td style="width: 15%; text-align: right; font-size: 7.5pt; font-weight: bold;">
                </td>
              </tr>
            </table>

            <div class="doc-title">ANAESTHESIA RECORD</div>

            <!-- Top Patient Fields -->
            <table class="grid-table" style="margin-bottom: 3px;">
              <tr>
                <td style="width: 30%;"><strong>Name:</strong> <span class="underline-field">${data.patientName}</span></td>
                <td style="width: 20%;"><strong>Age/Sex:</strong> <span class="underline-field">${data.ageSex}</span></td>
                <td style="width: 25%;"><strong>Height/Weight:</strong> <span class="underline-field">${data.heightWeight}</span></td>
                <td style="width: 25%;"><strong>UHID No.:</strong> <span class="underline-field">${data.uhidNo}</span></td>
              </tr>
              <tr>
                <td><strong>IPD No.:</strong> <span class="underline-field">${data.ipdNo}</span></td>
                <td><strong>Ward/Bed:</strong> <span class="underline-field">${data.wardBed}</span></td>
                <td><strong>Date:</strong> <span class="underline-field">${data.date}</span></td>
                <td><strong>Time:</strong> <span class="underline-field">${data.time}</span></td>
              </tr>
              <tr>
                <td colspan="2"><strong>Consultant Incharge:</strong> <span class="underline-field">${data.consultantIncharge}</span></td>
                <td colspan="2"><strong>Anaesthesiologist:</strong> <span class="underline-field">${data.anaesthesiologist}</span></td>
              </tr>
              <tr>
                <td colspan="4">
                  <strong>PAC:</strong> ${data.pacDone ? 'Y' : 'N'} &nbsp;&nbsp;|&nbsp;&nbsp; 
                  <strong>Consent:</strong> ${data.consentSigned ? 'Y' : 'N'} &nbsp;&nbsp;|&nbsp;&nbsp;
                  <strong>Date:</strong> ${data.pacConsentDate}
                </td>
              </tr>
            </table>

            <!-- Section Grid 1: PAC, Significant Inv, Checklist -->
            <table class="grid-table" style="margin-bottom: 3px;">
              <tr>
                <!-- PAC Findings -->
                <td style="width: 38%;">
                  <div style="font-weight: bold; border-bottom: 1px solid #000; margin-bottom: 2px;">PAC Findings:</div>
                  <strong>GC:</strong> ${data.gc} &nbsp;&nbsp; <strong>P:</strong> ${data.pulse} /min<br/>
                  <strong>BP:</strong> ${data.bp} mmHg &nbsp;&nbsp; <strong>RR:</strong> ${data.rr}<br/>
                  <strong>CVS:</strong> ${data.cvs}<br/>
                  <strong>PA:</strong> ${data.pa}<br/>
                  <strong>Dentition:</strong> ${data.dentition}<br/>
                  <strong>Neck mvts:</strong> ${data.neckMvts}<br/>
                  <strong>Spine:</strong> ${data.spine}<br/>
                  <strong>MPC Class:</strong> ${data.mpc} (1/2/3/4)
                </td>

                <!-- Significant Investigations & Premedication -->
                <td style="width: 37%;">
                  <div style="font-weight: bold; border-bottom: 1px solid #000; margin-bottom: 2px;">Significant Investigations:</div>
                  ${data.significantInvestigations}<br/><br/>
                  <strong>Monitors:</strong> 
                  ${data.monitors.nibp ? '[x] NIBP ' : '[ ] NIBP '} 
                  ${data.monitors.pulseOx ? '[x] Pulse Ox ' : '[ ] Pulse Ox '}<br/>
                  ${data.monitors.ecg ? '[x] ECG ' : '[ ] ECG '} 
                  ${data.monitors.etco2 ? '[x] ETCO2' : '[ ] ETCO2'}<br/><br/>
                  <strong>Premedication:</strong> ${data.premedication}
                </td>

                <!-- Anaesthesia Checklist -->
                <td style="width: 25%;">
                  <div style="font-weight: bold; border-bottom: 1px solid #000; margin-bottom: 2px;">Anaesthesia Checklist:</div>
                  ${data.checklist.machine ? '<span class="check-box">✓</span>' : '<span class="check-box">&nbsp;</span>'} 1. Anaesthesia Machine<br/>
                  ${data.checklist.drugs ? '<span class="check-box">✓</span>' : '<span class="check-box">&nbsp;</span>'} 2. Drugs<br/>
                  ${data.checklist.oxygen ? '<span class="check-box">✓</span>' : '<span class="check-box">&nbsp;</span>'} 3. Oxygen<br/>
                  ${data.checklist.suction ? '<span class="check-box">✓</span>' : '<span class="check-box">&nbsp;</span>'} 4. Suction<br/>
                  ${data.checklist.specialEquipment ? '<span class="check-box">✓</span>' : '<span class="check-box">&nbsp;</span>'} 5. Special Equipment<br/><br/>
                  <strong>Position of patient:</strong><br/>
                  ${data.patientPosition}
                </td>
              </tr>
            </table>

            <!-- Section Grid 2: Regional/Block & Induction/Airway -->
            <table class="grid-table" style="margin-bottom: 3px;">
              <tr>
                <td style="width: 50%;">
                  <div style="font-weight: bold; border-bottom: 1px solid #000; margin-bottom: 2px;">Regional / Block:</div>
                  <strong>Space:</strong> ${data.regionalSpace}<br/>
                  <strong>Drug:</strong> ${data.regionalDrug}<br/>
                  <strong>Needle:</strong> ${data.regionalNeedle}<br/>
                  <strong>Technique:</strong> ${data.regionalTechnique}
                </td>
                <td style="width: 50%;">
                  <div style="font-weight: bold; border-bottom: 1px solid #000; margin-bottom: 2px;">General / Airway / Induction:</div>
                  <strong>Induction Agent:</strong> ${data.inductionAgent}<br/>
                  <strong>Airway management:</strong> ${data.airwayManagement}<br/>
                  <strong>Maintenance:</strong> ${data.maintenanceAnaesthesia}<br/>
                  <strong>Ventilation:</strong> ${data.ventilationType} (RR: ${data.ventilationRR} * TV: ${data.ventilationTV})<br/>
                  <strong>Pressure point & Eye Care:</strong> ${data.pressurePointEyeCare}
                </td>
              </tr>
            </table>

            <!-- Intra-op Monitoring Chart Grid -->
            <div style="font-weight: bold; text-align: center; border: 1px solid #000; background: #f2f2f2; padding: 2px; margin-top: 2px;">
              Intra-op Monitoring Chart
            </div>
            <table class="vitals-grid">
              <thead>
                <tr>
                  <th style="width: 12%;">Time / Min</th>
                  <th>15m</th>
                  <th>30m</th>
                  <th>45m</th>
                  <th>1h</th>
                  <th>1h 15m</th>
                  <th>1h 30m</th>
                  <th>1h 45m</th>
                  <th>2h</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Pulse Rate</strong></td>
                  ${data.vitalsGrid.map(v => `<td>${v.pulse || '-'}</td>`).join('')}
                  ${Array(Math.max(0, 8 - data.vitalsGrid.length)).fill('<td>-</td>').join('')}
                </tr>
                <tr>
                  <td><strong>BP (mmHg)</strong></td>
                  ${data.vitalsGrid.map(v => `<td>${v.bps ? v.bps + '/' + v.bpd : '-'}</td>`).join('')}
                  ${Array(Math.max(0, 8 - data.vitalsGrid.length)).fill('<td>-</td>').join('')}
                </tr>
                <tr>
                  <td><strong>SpO2 %</strong></td>
                  ${data.vitalsGrid.map(v => `<td>${v.spo2 ? v.spo2 + '%' : '-'}</td>`).join('')}
                  ${Array(Math.max(0, 8 - data.vitalsGrid.length)).fill('<td>-</td>').join('')}
                </tr>
                <tr>
                  <td><strong>EtCO2</strong></td>
                  ${data.vitalsGrid.map(v => `<td>${v.etco2 || '-'}</td>`).join('')}
                  ${Array(Math.max(0, 8 - data.vitalsGrid.length)).fill('<td>-</td>').join('')}
                </tr>
              </tbody>
            </table>

            <!-- IV Fluids, Drugs, Remarks & Interop Notes -->
            <table class="grid-table" style="margin-top: 2px; margin-bottom: 3px;">
              <tr>
                <td><strong>IV Fluids:</strong> ${data.ivFluids}</td>
              </tr>
              <tr>
                <td><strong>Drugs:</strong> ${data.drugsGiven}</td>
              </tr>
              <tr>
                <td><strong>Interop Anesthesia Notes:</strong> ${data.interopNotes || 'Hemodynamically stable intraoperatively. No adverse anesthesia events.'}</td>
              </tr>
              <tr>
                <td>
                  <strong>Remarks:</strong> ${data.remarks} &nbsp;&nbsp;&nbsp;&nbsp;
                  <strong>Urine Output:</strong> ${data.urineOutputMl} ml
                </td>
              </tr>
            </table>

            <!-- Reversal & Extubation -->
            <table class="grid-table" style="margin-bottom: 3px;">
              <tr>
                <td>
                  <strong>Reversal:</strong> Neostigmine <span class="underline-field">${data.reversalNeostigmineMg}</span> mg + Glyco / Atropine <span class="underline-field">${data.reversalGlycoAtropineMg}</span> mg &nbsp;&nbsp;&nbsp;&nbsp;
                  <strong>Extubation:</strong> <span class="underline-field">${data.extubation}</span>
                </td>
              </tr>
            </table>

            <!-- Bottom Section: Post Op Consciousness & Orders -->
            <table class="grid-table">
              <tr>
                <!-- Post op Consciousness -->
                <td style="width: 50%;">
                  <div style="font-weight: bold; border-bottom: 1px solid #000; margin-bottom: 2px;">Post op Consciousness:</div>
                  <strong>P:</strong> ${data.postOpPulse} /min &nbsp;&nbsp; <strong>BP:</strong> ${data.postOpBp} mmHg<br/>
                  <strong>RR:</strong> ${data.postOpRr} &nbsp;&nbsp; <strong>CVS:</strong> ${data.postOpCvs}<br/>
                  <strong>CNS:</strong> ${data.postOpCns}<br/>
                  <strong>Head lifting:</strong> ${data.postOpHeadLifting}
                </td>

                <!-- Post op Orders -->
                <td style="width: 50%;">
                  <div style="font-weight: bold; border-bottom: 1px solid #000; margin-bottom: 2px;">Post op Orders:</div>
                  • NBM till <span class="underline-field">${data.nbmTillTime}</span> am/pm<br/>
                  • ${data.positioningOrder}<br/>
                  • ${data.vitalsMonitoringOrder}<br/>
                  • IV Fluids <span class="underline-field">${data.ivFluidsLitresOrder}</span> litres till coming morning<br/>
                  • ${data.informSos ? 'Inform SOS' : ''}<br/>
                  <div style="margin-top: 15px; text-align: right; font-weight: bold;">
                    Sig. Anaesthetist: <span class="underline-field">${data.signatureAnaesthetist}</span>
                  </div>
                </td>
              </tr>
            </table>
          </div>

          <script>
            window.onload = function() { window.print(); }
            window.onafterprint = function() { window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    toast.success(printBlank ? 'Blank Anaesthesia Record Sheet sent to printer' : 'Anaesthesia Record Sheet printed');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl bg-linear-to-r from-teal-900 via-slate-900 to-indigo-950 text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-500/20 border border-teal-400/30 rounded-xl text-teal-300 shrink-0">
            <FileSpreadsheet className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black tracking-wide uppercase">Anaesthesia Record Sheet</h3>
              <Badge className="bg-teal-500 text-teal-950 font-bold text-[10px]">NABH STANDARD</Badge>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Neo Gastroplus Hospital Intra-Op Monitoring & PAC Log Sheet
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            type="button"
            size="sm" 
            onClick={() => setIsPostOpAnaesthesiaOpen(true)} 
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-9 gap-1.5 shadow-sm"
          >
            <Activity className="w-4 h-4 text-indigo-200" />
            Post operative Anaesthesia Instructions
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handlePrint(true)} 
            className="border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-bold text-xs h-9 gap-1.5"
          >
            <Printer className="w-4 h-4 text-slate-400" />
            Print Blank Form
          </Button>
          <Button 
            size="sm" 
            onClick={() => handlePrint(false)} 
            className="bg-teal-500 hover:bg-teal-400 text-teal-950 font-black text-xs h-9 gap-1.5 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            Print Completed Record
          </Button>
        </div>
      </div>

      {/* Main Interactive Editor Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border shadow-xs rounded-2xl">
            <CardHeader className="border-b bg-slate-50/50 p-4">
              <CardTitle className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-teal-600" /> Patient & Surgical Header
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="font-bold">Patient Name</Label>
                  <Input 
                    value={record.patientName} 
                    onChange={e => setRecord({...record, patientName: e.target.value})} 
                    className="h-8 text-xs font-semibold bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="font-bold">Age / Sex</Label>
                  <Input 
                    value={record.ageSex} 
                    onChange={e => setRecord({...record, ageSex: e.target.value})} 
                    className="h-8 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="font-bold">Height / Weight</Label>
                  <Input 
                    value={record.heightWeight} 
                    onChange={e => setRecord({...record, heightWeight: e.target.value})} 
                    className="h-8 text-xs bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="font-bold">UHID No.</Label>
                  <Input 
                    value={record.uhidNo} 
                    onChange={e => setRecord({...record, uhidNo: e.target.value})} 
                    className="h-8 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="font-bold">IPD No.</Label>
                  <Input 
                    value={record.ipdNo} 
                    onChange={e => setRecord({...record, ipdNo: e.target.value})} 
                    className="h-8 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="font-bold">Ward / Bed</Label>
                  <Input 
                    value={record.wardBed} 
                    onChange={e => setRecord({...record, wardBed: e.target.value})} 
                    className="h-8 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="font-bold">Date & Time</Label>
                  <Input 
                    value={`${record.date} ${record.time}`} 
                    onChange={e => setRecord({...record, date: e.target.value})} 
                    className="h-8 text-xs bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="font-bold">Consultant Incharge</Label>
                  <Input 
                    value={record.consultantIncharge} 
                    onChange={e => setRecord({...record, consultantIncharge: e.target.value})} 
                    className="h-8 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="font-bold">Anaesthesiologist</Label>
                  <Input 
                    value={record.anaesthesiologist} 
                    onChange={e => setRecord({...record, anaesthesiologist: e.target.value})} 
                    className="h-8 text-xs bg-white font-semibold text-teal-900"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PAC Findings & Checklist Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border shadow-xs rounded-2xl">
              <CardHeader className="border-b bg-slate-50/50 p-3">
                <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-800">PAC Findings</CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="font-bold text-[10px]">GC</Label>
                    <Select value={record.gc} onValueChange={v => setRecord({...record, gc: v as any})}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Fair">Fair</SelectItem>
                        <SelectItem value="Mod">Mod</SelectItem>
                        <SelectItem value="Poor">Poor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="font-bold text-[10px]">MPC Class</Label>
                    <Select value={record.mpc} onValueChange={v => setRecord({...record, mpc: v as any})}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Class I</SelectItem>
                        <SelectItem value="2">Class II</SelectItem>
                        <SelectItem value="3">Class III</SelectItem>
                        <SelectItem value="4">Class IV</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="font-bold text-[10px]">Pulse (/min)</Label>
                    <Input value={record.pulse} onChange={e => setRecord({...record, pulse: e.target.value})} className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="font-bold text-[10px]">BP (mmHg)</Label>
                    <Input value={record.bp} onChange={e => setRecord({...record, bp: e.target.value})} className="h-7 text-xs" />
                  </div>
                </div>

                <div>
                  <Label className="font-bold text-[10px]">Dentition / Loose Teeth</Label>
                  <Input value={record.dentition} onChange={e => setRecord({...record, dentition: e.target.value})} className="h-7 text-xs" />
                </div>
                <div>
                  <Label className="font-bold text-[10px]">Neck Movements / Spine</Label>
                  <Input value={record.neckMvts} onChange={e => setRecord({...record, neckMvts: e.target.value})} className="h-7 text-xs" />
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-xs rounded-2xl">
              <CardHeader className="border-b bg-slate-50/50 p-3">
                <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-800">Anaesthesia Safety Checklist</CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2 text-xs">
                <div className="space-y-1.5 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={record.checklist.machine} onCheckedChange={c => setRecord({...record, checklist: {...record.checklist, machine: !!c}})} />
                    <span className="font-semibold text-slate-800">1. Anaesthesia Machine Checked</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={record.checklist.drugs} onCheckedChange={c => setRecord({...record, checklist: {...record.checklist, drugs: !!c}})} />
                    <span className="font-semibold text-slate-800">2. Emergency Drugs Verified</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={record.checklist.oxygen} onCheckedChange={c => setRecord({...record, checklist: {...record.checklist, oxygen: !!c}})} />
                    <span className="font-semibold text-slate-800">3. Oxygen Supply & Cylinder Ready</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={record.checklist.suction} onCheckedChange={c => setRecord({...record, checklist: {...record.checklist, suction: !!c}})} />
                    <span className="font-semibold text-slate-800">4. Suction Apparatus Functional</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={record.checklist.specialEquipment} onCheckedChange={c => setRecord({...record, checklist: {...record.checklist, specialEquipment: !!c}})} />
                    <span className="font-semibold text-slate-800">5. Special Airway Equipment On Standby</span>
                  </label>
                </div>

                <div className="pt-2">
                  <Label className="font-bold text-[10px]">Patient Operating Position</Label>
                  <Input value={record.patientPosition} onChange={e => setRecord({...record, patientPosition: e.target.value})} className="h-7 text-xs font-semibold" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Regional Block & Induction */}
          <Card className="border shadow-xs rounded-2xl">
            <CardHeader className="border-b bg-slate-50/50 p-3">
              <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-800">Regional Block & Induction Technique</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="font-bold">Regional Block / Space</Label>
                  <Input value={record.regionalSpace} onChange={e => setRecord({...record, regionalSpace: e.target.value})} className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="font-bold">Regional Drug & Concentration</Label>
                  <Input value={record.regionalDrug} onChange={e => setRecord({...record, regionalDrug: e.target.value})} className="h-8 text-xs" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="font-bold">Induction Agent</Label>
                  <Input value={record.inductionAgent} onChange={e => setRecord({...record, inductionAgent: e.target.value})} className="h-8 text-xs font-semibold" />
                </div>
                <div className="space-y-1">
                  <Label className="font-bold">Airway Management (ETT/LMA Size)</Label>
                  <Input value={record.airwayManagement} onChange={e => setRecord({...record, airwayManagement: e.target.value})} className="h-8 text-xs" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Intra-op Monitoring Chart */}
          <Card className="border shadow-xs rounded-2xl">
            <CardHeader className="border-b bg-teal-950 text-white p-3 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-300" /> Intra-Op Monitoring Chart
              </CardTitle>
              <Badge className="bg-teal-700 text-white text-[9px]">15 Min Intervals</Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-center border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300">
                      <th className="p-2 text-left font-bold text-slate-700">Parameter</th>
                      {record.vitalsGrid.map((v, idx) => (
                        <th key={idx} className="p-2 font-bold text-slate-700">{v.timeSlot}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="p-2 text-left font-bold text-slate-800">Pulse (/min)</td>
                      {record.vitalsGrid.map((v, idx) => (
                        <td key={idx} className="p-1">
                          <Input 
                            value={v.pulse} 
                            onChange={e => {
                              const updated = [...record.vitalsGrid];
                              updated[idx].pulse = e.target.value;
                              setRecord({...record, vitalsGrid: updated});
                            }} 
                            className="h-7 w-12 text-center text-xs font-bold"
                          />
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-2 text-left font-bold text-slate-800">BP Systolic</td>
                      {record.vitalsGrid.map((v, idx) => (
                        <td key={idx} className="p-1">
                          <Input 
                            value={v.bps} 
                            onChange={e => {
                              const updated = [...record.vitalsGrid];
                              updated[idx].bps = e.target.value;
                              setRecord({...record, vitalsGrid: updated});
                            }} 
                            className="h-7 w-12 text-center text-xs"
                          />
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-2 text-left font-bold text-slate-800">BP Diastolic</td>
                      {record.vitalsGrid.map((v, idx) => (
                        <td key={idx} className="p-1">
                          <Input 
                            value={v.bpd} 
                            onChange={e => {
                              const updated = [...record.vitalsGrid];
                              updated[idx].bpd = e.target.value;
                              setRecord({...record, vitalsGrid: updated});
                            }} 
                            className="h-7 w-12 text-center text-xs"
                          />
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-2 text-left font-bold text-slate-800">SpO2 %</td>
                      {record.vitalsGrid.map((v, idx) => (
                        <td key={idx} className="p-1">
                          <Input 
                            value={v.spo2} 
                            onChange={e => {
                              const updated = [...record.vitalsGrid];
                              updated[idx].spo2 = e.target.value;
                              setRecord({...record, vitalsGrid: updated});
                            }} 
                            className="h-7 w-12 text-center text-xs font-bold text-teal-800"
                          />
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <Label className="font-bold">IV Fluids Administered</Label>
                  <Input value={record.ivFluids} onChange={e => setRecord({...record, ivFluids: e.target.value})} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="font-bold">Urine Output (ml)</Label>
                  <Input value={record.urineOutputMl} onChange={e => setRecord({...record, urineOutputMl: e.target.value})} className="h-8 text-xs font-bold text-indigo-900" />
                </div>
              </div>

              <div className="pt-2 space-y-1.5 border-t">
                <div className="flex items-center justify-between">
                  <Label className="font-black text-slate-800 text-xs uppercase tracking-wide">Interop / Intra-Op Anesthesia Notes</Label>
                  <span className="text-[10px] text-teal-700 font-bold">Intra-operative Anesthetic Event Log</span>
                </div>
                <textarea 
                  value={record.interopNotes || ''} 
                  onChange={e => setRecord({...record, interopNotes: e.target.value})} 
                  rows={2} 
                  className="w-full text-xs p-2 rounded-lg border border-teal-200 bg-teal-50/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                  placeholder="Document interop anesthetic events, hemodynamics, airway maintenance, drug boluses..."
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 self-center">Interop Presets:</span>
                  <button 
                    type="button" 
                    onClick={() => setRecord({...record, interopNotes: (record.interopNotes ? record.interopNotes + ' ' : '') + 'Hemodynamically stable intra-operatively.'})} 
                    className="text-[10px] bg-slate-100 hover:bg-teal-100 text-slate-800 font-bold px-2 py-0.5 rounded border transition-colors"
                  >
                    + Stable Interop
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setRecord({...record, interopNotes: (record.interopNotes ? record.interopNotes + ' ' : '') + 'Airway atraumatic, Grade 1 Cormack-Lehane view.'})} 
                    className="text-[10px] bg-slate-100 hover:bg-teal-100 text-slate-800 font-bold px-2 py-0.5 rounded border transition-colors"
                  >
                    + Airway Smooth
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setRecord({...record, interopNotes: (record.interopNotes ? record.interopNotes + ' ' : '') + 'Transient interop hypotensive episode managed with IV fluid bolus.'})} 
                    className="text-[10px] bg-slate-100 hover:bg-amber-100 text-slate-800 font-bold px-2 py-0.5 rounded border transition-colors"
                  >
                    + Managed Hypotension
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setRecord({...record, interopNotes: (record.interopNotes ? record.interopNotes + ' ' : '') + 'Extubated smoothly on table, fully conscious.'})} 
                    className="text-[10px] bg-slate-100 hover:bg-emerald-100 text-slate-800 font-bold px-2 py-0.5 rounded border transition-colors"
                  >
                    + Extubated On Table
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Reversal, Post Op Orders & Preview Summary */}
        <div className="space-y-6">
          <Card className="border shadow-xs rounded-2xl bg-slate-50/50">
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-800">Reversal & Post-Op Orders</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs">
              <div className="space-y-2 p-3 bg-white border rounded-xl">
                <p className="font-extrabold text-slate-900 text-xs">Reversal Agents</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">Neostigmine (mg)</Label>
                    <Input value={record.reversalNeostigmineMg} onChange={e => setRecord({...record, reversalNeostigmineMg: e.target.value})} className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px]">Glyco / Atropine (mg)</Label>
                    <Input value={record.reversalGlycoAtropineMg} onChange={e => setRecord({...record, reversalGlycoAtropineMg: e.target.value})} className="h-7 text-xs" />
                  </div>
                </div>
              </div>

              <div className="space-y-2 p-3 bg-white border rounded-xl">
                <p className="font-extrabold text-slate-900 text-xs">Post-Op Orders & Care</p>
                <div className="space-y-2">
                  <div>
                    <Label className="text-[10px]">NBM Till Time</Label>
                    <Input value={record.nbmTillTime} onChange={e => setRecord({...record, nbmTillTime: e.target.value})} className="h-7 text-xs font-semibold" />
                  </div>
                  <div>
                    <Label className="text-[10px]">Positioning Order</Label>
                    <Input value={record.positioningOrder} onChange={e => setRecord({...record, positioningOrder: e.target.value})} className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px]">Vitals Monitoring Frequency</Label>
                    <Input value={record.vitalsMonitoringOrder} onChange={e => setRecord({...record, vitalsMonitoringOrder: e.target.value})} className="h-7 text-xs" />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <Button 
                  onClick={() => {
                    toast.success('Anaesthesia Record Sheet updated!');
                    if (onSave) onSave(record);
                  }} 
                  className="bg-[#1A5E63] hover:bg-[#1A5E63]/90 text-white font-bold text-xs h-9 w-full"
                >
                  <Save className="w-4 h-4 mr-1.5" /> Save Record Sheet
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handlePrint(false)} 
                  className="border-teal-300 text-teal-900 font-bold text-xs h-9 w-full"
                >
                  <Printer className="w-4 h-4 mr-1.5 text-teal-700" /> Print Formal Sheet
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Post Operative Anaesthesia Instructions Modal */}
      {isPostOpAnaesthesiaOpen && (
        <Dialog open={isPostOpAnaesthesiaOpen} onOpenChange={setIsPostOpAnaesthesiaOpen}>
          <DialogContent className="fixed inset-0 top-0 left-0 translate-x-0 translate-y-0 w-screen h-screen max-w-none max-h-none sm:max-w-none rounded-none m-0 p-0 flex flex-col bg-slate-50 overflow-y-auto border-none shadow-none z-50">
            <PostOpForms 
              patient={{ id: record.uhidNo, name: record.patientName }} 
              defaultFormTab="instructions" 
              onClose={() => setIsPostOpAnaesthesiaOpen(false)} 
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
