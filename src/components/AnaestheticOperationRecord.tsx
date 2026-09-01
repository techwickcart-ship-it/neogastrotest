import React, { useState } from 'react';
import { 
  Printer, 
  Save, 
  Check, 
  FileText, 
  Sparkles, 
  User, 
  Activity, 
  Stethoscope, 
  ShieldAlert, 
  Clock, 
  FileSpreadsheet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { toast } from 'sonner';

export interface AnaestheticOpRecordData {
  // Hospital Header
  hospitalName: string;
  regLicenseNo: string;
  docNo: string;

  // Header Patient Info
  date: string;
  regnNo: string;
  patientName: string;
  age: string;
  sex: 'M' | 'F' | 'Other';
  weightKg: string;
  heightCm: string;
  hospitalWard: string;
  bedNo: string;
  diagnosis: string;
  operatingSurgeon: string;
  anaesthetistTeam: string;
  durationFrom: string;
  durationTo: string;
  operationName: string;

  // Pre-Medication
  glycopyrrolate: boolean;
  fentanyl: boolean;
  midazolam: boolean;

  // Acid Prophylaxis
  h2Blockers: boolean;
  antiEmetics: boolean;
  rylesTubeSuction: boolean;
  preOxygenation6L: boolean;
  gaAcid: boolean;

  // Anaesthesia Techniques
  techniqueEpiduralSpinal: boolean;
  techniqueBlock: boolean;
  techniqueGaRegional: boolean;
  techniqueRegionalGaSupp: boolean;
  techniqueSpecial: string;
  patientPosition: string;
  surgeryType: 'Emergency' | 'Planned';

  // ASA Grading
  asaGrade: '1' | '2' | '3' | '4' | '5';
  asaEmergencyE: boolean;

  // A-History
  historyPresent: string;
  historyPast: string;
  personalHistory: {
    htDmMiTbThyroid: boolean;
    cadDrugAllergyCops: boolean;
    smoking: boolean;
    alcohol: boolean;
    tobacco: boolean;
  };
  familyHistory: string;
  pastOperationsTime: string;
  pastOperationsNature: string;
  pastOperationsAnaesthesia: string;
  pastOperationsComplication: string;

  // B-Systemic Examination
  examGc: string;
  examBuildNutrition: string;
  examPulseSpo2: string;
  examBp: string;
  examPallorLnCyanosisOedema: string;
  examJvp: string;
  examMouthOpenMallampati: string;
  examTeeth: string;
  examBack: string;
  examCvs: string;
  examRs: string;
  examOthers: string;

  // C-Investigations
  invHb: string;
  invLft: string;
  invBt: string;
  invUs: string;
  invXray: string;
  invCt: string;
  invRbs: string;
  invEcg: string;
  invInr: string;
  invEcho: string;
  invOther: string;

  // Induction Complications
  inductionSellicks: boolean;
  inductionVomiting: boolean;
  inductionCyanosis: boolean;
  inductionSpasm: boolean;
  inductionIntubation: boolean;
  inductionOthers: string;

  // Intra-Operative Complications
  intraopMisc: string;
  intraopCyanosis: boolean;
  intraopSpasm: boolean;
  intraopArrhythmia: boolean;
  intraopBradycardia: boolean;
  intraopHypotension: boolean;

  // Post Op Parameters
  postOpPulse: string;
  postOpBp: string;
  postOpSpo2: string;
  postOpRespiration: string;
  postOpConsciousness: string;
  postOpSpinal: string;
  postOpEpidural: string;
  postOpOthers: string;
  postOpCatheterSize: string;
  postOpLevel: string;
  postOpDrug: string;
  postOpShiftingTo: string;
  postOpTimeFrom: string;

  // Drug History & Consent
  drugHistory: string;
  anaesthesiaRiskGrade: string;
  consentPresent: boolean;
  informedConsentPresent: boolean;
  monitors: {
    aEcg: boolean;
    bSpo2: boolean;
    cNibp: boolean;
    temp: boolean;
    dEtco2: boolean;
    ibp: boolean;
    eOther: boolean;
  };

  // Drugs & Airway Matrix
  inducingEtomidate: string;
  inducingKetamine: string;
  inducingPropofol: string;
  inducingOthers: string;

  muscleSuxamethonium: string;
  muscleVecuronium: string;
  muscleRocuronium: string;
  muscleAtracurium: string;
  muscleOthers: string;

  laryngoXylocaineSpray: string;
  laryngoOralNasal: string;
  laryngoCuffedPlainSize: string;
  laryngoIgelSize: string;

  inhalationO2N2O: string;
  inhalationSevoIso: string;
  inhalationFlowGasLpm: string;

  circuitClosed: boolean;
  circuitBains: boolean;

  reversalVolume: string;
  reversalPressure: string;

  ventilationPeep: string;
  ventilationRr: string;
  ventilationTv: string;
}

const DEFAULT_AOR_RECORD: AnaestheticOpRecordData = {
  hospitalName: 'GASTRO PLUS HOSPITAL',
  regLicenseNo: 'CMHO Reg. & License No.: NH327/DEC/2027',
  docNo: 'DOC. No. GPH/OT/AOR/15/Ver. 1.0/2026',

  date: new Date().toISOString().split('T')[0],
  regnNo: 'REG-99120',
  patientName: 'Priyanka Parte',
  age: '34',
  sex: 'F',
  weightKg: '64',
  heightCm: '162',
  hospitalWard: 'Gastro OT Ward',
  bedNo: 'OT Bed-02',
  diagnosis: 'Cholelithiasis with Chronic Cholecystitis',
  operatingSurgeon: 'Dr. Navodita Tiwari',
  anaesthetistTeam: 'Dr. Alok Verma (DA, MD Anaesthesia)',
  durationFrom: '09:00 AM',
  durationTo: '11:15 AM',
  operationName: 'Laparoscopic Cholecystectomy',

  glycopyrrolate: true,
  fentanyl: true,
  midazolam: true,

  h2Blockers: true,
  antiEmetics: true,
  rylesTubeSuction: false,
  preOxygenation6L: true,
  gaAcid: true,

  techniqueEpiduralSpinal: false,
  techniqueBlock: false,
  techniqueGaRegional: true,
  techniqueRegionalGaSupp: false,
  techniqueSpecial: 'MAC with ET Tube Intubation',
  patientPosition: 'Supine Position',
  surgeryType: 'Planned',

  asaGrade: '1',
  asaEmergencyE: false,

  historyPresent: 'No acute respiratory distress. No active chest pain.',
  historyPast: 'Hypothyroidism on Eltroxin 50mcg',
  personalHistory: {
    htDmMiTbThyroid: true,
    cadDrugAllergyCops: false,
    smoking: false,
    alcohol: false,
    tobacco: false,
  },
  familyHistory: 'Non-contributory',
  pastOperationsTime: '2 Years ago',
  pastOperationsNature: 'LSCS',
  pastOperationsAnaesthesia: 'Spinal (SA)',
  pastOperationsComplication: 'None',

  examGc: 'Fair & Stable',
  examBuildNutrition: 'Average build',
  examPulseSpo2: 'Pulse: 78/min, SpO2: 99% on RA',
  examBp: '122/80 mmHg',
  examPallorLnCyanosisOedema: 'Nil Pallor / No Cyanosis / No Oedema',
  examJvp: 'Normal JVP',
  examMouthOpenMallampati: 'Mallampati Class 1, Full mouth opening',
  examTeeth: 'Intact, No loose teeth',
  examBack: 'Spine normal',
  examCvs: 'S1 S2 heard, no murmurs',
  examRs: 'Bilateral clear air entry',
  examOthers: 'Abdomen soft, non-tender',

  invHb: '12.4 g/dL',
  invLft: 'Serum Bilirubin: 0.8, SGOT: 24, SGPT: 28',
  invBt: '2 min 30 sec',
  invUs: 'Gallbladder distended with multiple calculi',
  invXray: 'Chest X-Ray Normal',
  invCt: 'NA',
  invRbs: '104 mg/dL',
  invEcg: 'Normal Sinus Rhythm',
  invInr: '1.02',
  invEcho: 'LVEF 65%, Normal LV Function',
  invOther: 'Platelets: 2.45 Lakhs',

  inductionSellicks: false,
  inductionVomiting: false,
  inductionCyanosis: false,
  inductionSpasm: false,
  inductionIntubation: true,
  inductionOthers: 'Smooth intubation with 7.0 cuffed ET Tube',

  intraopMisc: 'None',
  intraopCyanosis: false,
  intraopSpasm: false,
  intraopArrhythmia: false,
  intraopBradycardia: false,
  intraopHypotension: false,

  postOpPulse: '76 /min',
  postOpBp: '120/78 mmHg',
  postOpSpo2: '100% on 2L O2',
  postOpRespiration: '16/min, Spontaneous',
  postOpConsciousness: 'Fully Conscious & Oriented',
  postOpSpinal: 'NA',
  postOpEpidural: 'NA',
  postOpOthers: 'Pain score 2/10',
  postOpCatheterSize: '14 Fr Foley Catheter in situ',
  postOpLevel: 'Recovery Ward Bed 01',
  postOpDrug: 'Inj. Paracetamol 1g IV + Inj. Ondansetron 4mg IV',
  postOpShiftingTo: 'Recovery / PACU Room',
  postOpTimeFrom: '11:25 AM',

  drugHistory: 'Tab. Eltroxin 50mcg OD. No drug allergies.',
  anaesthesiaRiskGrade: 'ASA Class 1',
  consentPresent: true,
  informedConsentPresent: true,
  monitors: {
    aEcg: true,
    bSpo2: true,
    cNibp: true,
    temp: true,
    dEtco2: true,
    ibp: false,
    eOther: false,
  },

  inducingEtomidate: '-',
  inducingKetamine: '-',
  inducingPropofol: '120 mg IV',
  inducingOthers: 'Fentanyl 100mcg',

  muscleSuxamethonium: '75 mg IV',
  muscleVecuronium: '6 mg IV',
  muscleRocuronium: '-',
  muscleAtracurium: '-',
  muscleOthers: '-',

  laryngoXylocaineSpray: '2 Puffs 10%',
  laryngoOralNasal: 'Oral',
  laryngoCuffedPlainSize: '7.0 Cuffed',
  laryngoIgelSize: 'NA',

  inhalationO2N2O: 'O2 2L + N2O 2L',
  inhalationSevoIso: 'Sevoflurane 1.5-2.0%',
  inhalationFlowGasLpm: '4 L/min',

  circuitClosed: true,
  circuitBains: false,

  reversalVolume: 'Neostigmine 2.5mg',
  reversalPressure: 'Glycopyrrolate 0.5mg',

  ventilationPeep: '5 cmH2O',
  ventilationRr: '12 /min',
  ventilationTv: '450 ml',
};

interface AnaestheticOperationRecordProps {
  isOpen?: boolean;
  onClose?: () => void;
  patientData?: any;
  onSave?: (data: AnaestheticOpRecordData) => void;
}

export default function AnaestheticOperationRecord({ isOpen, onClose, patientData, onSave }: AnaestheticOperationRecordProps) {
  if (isOpen === false) return null;
  const [record, setRecord] = useState<AnaestheticOpRecordData>(() => {
    const savedHosp = storage.get(STORAGE_KEYS.HOSPITAL_INFO, null);
    const hospName = savedHosp?.name || 'GASTRO PLUS HOSPITAL';
    const hospAddr = savedHosp?.address || 'Plot No. 7 & 8, Om Shiv Nagar, Gufa Mandir Road, Lal Ghati Bhopal, 462030, Madhya Pradesh';

    if (patientData) {
      return {
        ...DEFAULT_AOR_RECORD,
        hospitalName: hospName,
        patientName: patientData.name || DEFAULT_AOR_RECORD.patientName,
        regnNo: patientData.mrn || patientData.registrationNo || DEFAULT_AOR_RECORD.regnNo,
        age: String(patientData.age || '34'),
        sex: (patientData.gender || 'F').startsWith('M') ? 'M' : 'F',
        diagnosis: patientData.diagnosis || DEFAULT_AOR_RECORD.diagnosis,
        operatingSurgeon: patientData.assignedDoctor || patientData.doctorName || DEFAULT_AOR_RECORD.operatingSurgeon,
      };
    }
    return {
      ...DEFAULT_AOR_RECORD,
      hospitalName: hospName,
    };
  });

  const handlePrint = (printBlank = false) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Unable to open print preview window');
      return;
    }

    const savedHosp = storage.get(STORAGE_KEYS.HOSPITAL_INFO, null);
    const hospName = savedHosp?.name || record.hospitalName || 'GASTRO PLUS HOSPITAL';
    const hospAddr = savedHosp?.address || 'Plot No. 7 & 8, Om Shiv Nagar, Gufa Mandir Road, Lal Ghati Bhopal, 462030, Madhya Pradesh';
    const hospPhone = savedHosp?.phone || '9109102145/9109101246';

    const d = printBlank ? {
      ...DEFAULT_AOR_RECORD,
      hospitalName: hospName,
      date: '....................',
      regnNo: '....................',
      patientName: '........................................................',
      age: '........',
      sex: 'M/F' as const,
      weightKg: '........',
      heightCm: '........',
      hospitalWard: '....................................',
      bedNo: '............',
      diagnosis: '................................................................',
      operatingSurgeon: '....................................',
      anaesthetistTeam: '....................................',
      durationFrom: '........',
      durationTo: '........',
      operationName: '................................................................',

      glycopyrrolate: false, fentanyl: false, midazolam: false,
      h2Blockers: false, antiEmetics: false, rylesTubeSuction: false, preOxygenation6L: false, gaAcid: false,
      techniqueEpiduralSpinal: false, techniqueBlock: false, techniqueGaRegional: false, techniqueRegionalGaSupp: false,
      techniqueSpecial: '................', patientPosition: '................', surgeryType: 'Planned' as const,
      asaGrade: '1' as const, asaEmergencyE: false,

      historyPresent: '................................................',
      historyPast: '................................................',
      personalHistory: { htDmMiTbThyroid: false, cadDrugAllergyCops: false, smoking: false, alcohol: false, tobacco: false },
      familyHistory: '................................',
      pastOperationsTime: '........', pastOperationsNature: '........', pastOperationsAnaesthesia: '........', pastOperationsComplication: '........',

      examGc: '........', examBuildNutrition: '........', examPulseSpo2: '........', examBp: '........',
      examPallorLnCyanosisOedema: '................', examJvp: '........', examMouthOpenMallampati: '........', examTeeth: '........', examBack: '........',
      examCvs: '........', examRs: '........', examOthers: '........',

      invHb: '....', invLft: '....', invBt: '....', invUs: '....', invXray: '....', invCt: '....', invRbs: '....', invEcg: '....', invInr: '....', invEcho: '....', invOther: '....',
      inductionSellicks: false, inductionVomiting: false, inductionCyanosis: false, inductionSpasm: false, inductionIntubation: false, inductionOthers: '................',
      intraopMisc: '................', intraopCyanosis: false, intraopSpasm: false, intraopArrhythmia: false, intraopBradycardia: false, intraopHypotension: false,

      postOpPulse: '....', postOpBp: '....', postOpSpo2: '....', postOpRespiration: '....', postOpConsciousness: '................', postOpSpinal: '....', postOpEpidural: '....',
      postOpOthers: '....', postOpCatheterSize: '....', postOpLevel: '....', postOpDrug: '....', postOpShiftingTo: '................', postOpTimeFrom: '....',

      drugHistory: '................................................................',
      anaesthesiaRiskGrade: '........', consentPresent: false, informedConsentPresent: false,
      monitors: { aEcg: false, bSpo2: false, cNibp: false, temp: false, dEtco2: false, ibp: false, eOther: false },

      inducingEtomidate: '....', inducingKetamine: '....', inducingPropofol: '....', inducingOthers: '....',
      muscleSuxamethonium: '....', muscleVecuronium: '....', muscleRocuronium: '....', muscleAtracurium: '....', muscleOthers: '....',
      laryngoXylocaineSpray: '....', laryngoOralNasal: '....', laryngoCuffedPlainSize: '....', laryngoIgelSize: '....',
      inhalationO2N2O: '....', inhalationSevoIso: '....', inhalationFlowGasLpm: '....',
      circuitClosed: false, circuitBains: false, reversalVolume: '....', reversalPressure: '....', ventilationPeep: '....', ventilationRr: '....', ventilationTv: '....'
    } : record;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Anaesthetic Operation Record - ${d.patientName}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 5mm;
            }
            * { box-sizing: border-box; -webkit-font-smoothing: antialiased !important; -moz-osx-font-smoothing: grayscale !important; }
            body {
              font-family: Arial, Helvetica, sans-serif;
              color: #000000 !important;
              background: #ffffff;
              font-size: 8pt;
              font-weight: 700;
              line-height: 1.2;
              padding: 0;
              margin: 0;
            }
            .outer-frame {
              border: 2px solid #000000;
              padding: 4px;
              box-sizing: border-box;
              width: 100%;
              color: #000000 !important;
            }
            .header-top {
              text-align: center;
              border-bottom: 2px solid #000000;
              padding-bottom: 3px;
              margin-bottom: 4px;
              position: relative;
            }
            .hosp-title {
              font-size: 15pt;
              font-weight: 900;
              letter-spacing: 0.8px;
              text-transform: uppercase;
              color: #000000 !important;
            }
            .hosp-sub {
              font-size: 8pt;
              font-weight: 800;
              color: #000000 !important;
            }
            .doc-tag {
              position: absolute;
              right: 2px;
              bottom: 1px;
              font-size: 7pt;
              font-weight: 900;
              color: #000000 !important;
            }
            .title-banner {
              text-align: center;
              font-size: 11pt;
              font-weight: 900;
              background: #f2f2f2 !important;
              border: 1.5px solid #000000;
              padding: 3px 0;
              margin-bottom: 4px;
              letter-spacing: 0.5px;
              color: #000000 !important;
            }
            table.grid-tbl {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 3px;
            }
            table.grid-tbl td, table.grid-tbl th {
              border: 1.5px solid #000000;
              padding: 3px 4px;
              font-size: 8pt;
              vertical-align: top;
              color: #000000 !important;
              font-weight: 700;
            }
            .box-title {
              font-weight: 900;
              font-size: 8pt;
              background: #e8e8e8 !important;
              text-align: center;
              border-bottom: 1.5px solid #000000;
              padding: 2px;
              text-transform: uppercase;
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
            .chk {
              display: inline-block;
              width: 9px;
              height: 9px;
              border: 1px solid #000;
              text-align: center;
              line-height: 8px;
              font-size: 7px;
              font-weight: bold;
              margin-right: 2px;
            }
            .uline {
              border-bottom: 1px dotted #000;
              font-weight: bold;
              padding: 0 2px;
            }
          </style>
        </head>
        <body>
          <div class="outer-frame">
            <!-- Header -->
            <div class="header-top">
              <div class="hosp-title">${hospName}</div>
              <div class="hosp-sub">${d.regLicenseNo} | ${hospAddr}</div>
              <div class="doc-tag">${d.docNo}</div>
            </div>

            <!-- Title Banner -->
            <div class="title-banner">ANAESTHETIC OPERATION RECORD</div>

            <!-- Patient Details & Top Checkboxes -->
            <table class="grid-tbl">
              <tr>
                <td style="width: 72%;">
                  <table style="width:100%; border-collapse:collapse;">
                    <tr>
                      <td style="border:none; padding:1px;"><strong>Date:</strong> <span class="uline">${d.date}</span></td>
                      <td style="border:none; padding:1px;"><strong>Regn. No.:</strong> <span class="uline">${d.regnNo}</span></td>
                    </tr>
                    <tr>
                      <td colspan="2" style="border:none; padding:1px;"><strong>Name:</strong> <span class="uline">${d.patientName}</span></td>
                    </tr>
                    <tr>
                      <td style="border:none; padding:1px;"><strong>Age:</strong> <span class="uline">${d.age} Y</span> &nbsp;&nbsp; <strong>Sex:</strong> <span class="uline">${d.sex}</span></td>
                      <td style="border:none; padding:1px;"><strong>Weight:</strong> <span class="uline">${d.weightKg} kg</span> &nbsp;&nbsp; <strong>Ht:</strong> <span class="uline">${d.heightCm} cm</span></td>
                    </tr>
                    <tr>
                      <td style="border:none; padding:1px;"><strong>Hospital & Ward:</strong> <span class="uline">${d.hospitalWard}</span></td>
                      <td style="border:none; padding:1px;"><strong>Bed No.:</strong> <span class="uline">${d.bedNo}</span></td>
                    </tr>
                    <tr>
                      <td colspan="2" style="border:none; padding:1px;"><strong>Diagnosis:</strong> <span class="uline">${d.diagnosis}</span></td>
                    </tr>
                    <tr>
                      <td style="border:none; padding:1px;"><strong>Operating Surgeon Dr.:</strong> <span class="uline">${d.operatingSurgeon}</span></td>
                      <td style="border:none; padding:1px;"><strong>Duration From:</strong> <span class="uline">${d.durationFrom}</span> <strong>to</strong> <span class="uline">${d.durationTo}</span></td>
                    </tr>
                    <tr>
                      <td style="border:none; padding:1px;"><strong>Anaesthetist Team Dr.:</strong> <span class="uline">${d.anaesthetistTeam}</span></td>
                      <td style="border:none; padding:1px;"><strong>Operation:</strong> <span class="uline">${d.operationName}</span></td>
                    </tr>
                  </table>
                </td>

                <!-- Top Right Boxes Stack -->
                <td style="width: 28%; padding:0;">
                  <!-- Pre Medication -->
                  <div class="box-title">PRE-MEDICATION</div>
                  <div style="padding:2px 4px;">
                    ${d.glycopyrrolate ? '<span class="chk">✓</span>' : '<span class="chk">&nbsp;</span>'} Glycopyrrolate 0.2mg<br/>
                    ${d.fentanyl ? '<span class="chk">✓</span>' : '<span class="chk">&nbsp;</span>'} Fentanyl<br/>
                    ${d.midazolam ? '<span class="chk">✓</span>' : '<span class="chk">&nbsp;</span>'} Midazolam
                  </div>

                  <!-- Acid Prophylaxis -->
                  <div class="box-title" style="border-top:1px solid #000;">ACID PROPHYLAXIS</div>
                  <div style="padding:2px 4px;">
                    ${d.h2Blockers ? '<span class="chk">✓</span>' : '<span class="chk">&nbsp;</span>'} H2 Blockers &nbsp; ${d.antiEmetics ? '<span class="chk">✓</span>' : '<span class="chk">&nbsp;</span>'} Anti Emetics<br/>
                    ${d.rylesTubeSuction ? '<span class="chk">✓</span>' : '<span class="chk">&nbsp;</span>'} Ryles Tube Suction<br/>
                    ${d.preOxygenation6L ? '<span class="chk">✓</span>' : '<span class="chk">&nbsp;</span>'} Pre Oxygenation 6L/m &nbsp; ${d.gaAcid ? '<span class="chk">✓</span>' : '<span class="chk">&nbsp;</span>'} GA
                  </div>

                  <!-- Anaesthesia Technique -->
                  <div class="box-title" style="border-top:1px solid #000;">ANAESTHESIA TECHNIQUE</div>
                  <div style="padding:2px 4px;">
                    ${d.techniqueEpiduralSpinal ? '<span class="chk">✓</span>' : '<span class="chk">&nbsp;</span>'} Epidural/Spinal &nbsp; ${d.techniqueBlock ? '<span class="chk">✓</span>' : '<span class="chk">&nbsp;</span>'} Block<br/>
                    ${d.techniqueGaRegional ? '<span class="chk">✓</span>' : '<span class="chk">&nbsp;</span>'} GA+Regional &nbsp; ${d.techniqueRegionalGaSupp ? '<span class="chk">✓</span>' : '<span class="chk">&nbsp;</span>'} Reg+GA Supplem<br/>
                    <strong>Special:</strong> <span class="uline">${d.techniqueSpecial}</span><br/>
                    <strong>Position:</strong> <span class="uline">${d.patientPosition}</span><br/>
                    <strong>Type:</strong> ${d.surgeryType === 'Emergency' ? '[x] Emergency' : '[x] Planned'}
                  </div>

                  <!-- ASA Grading -->
                  <div class="box-title" style="border-top:1px solid #000;">ASA GRADING</div>
                  <div style="padding:2px 4px; font-size: 6.5pt; line-height: 1.1;">
                    1. Normal Healthy Patient<br/>
                    2. Mild/mod systemic disease<br/>
                    3. Severe non-life threatening<br/>
                    4. Severe life threatening<br/>
                    5. Moribund Patient /E Emergency<br/>
                    <strong>ASA GRADE:</strong> <span class="uline" style="font-size:8pt;">ASA ${d.asaGrade} ${d.asaEmergencyE ? '/E' : ''}</span>
                  </div>
                </td>
              </tr>
            </table>

            <!-- Main Body 3 Columns: History, Systemic Exam, Induction & Complications -->
            <table class="grid-tbl">
              <tr>
                <!-- Column 1: A-History -->
                <td style="width: 35%;">
                  <div class="box-title">A. PRE-OP FINDINGS & HISTORY</div>
                  <div style="padding: 2px;">
                    <strong>Present:</strong> ${d.historyPresent}<br/>
                    <strong>Past:</strong> ${d.historyPast}<br/>
                    <strong>Personal:</strong><br/>
                    ${d.personalHistory.htDmMiTbThyroid ? '<span class="chk">✓</span> HT/DM/MI/TB/Thyroid ' : '<span class="chk">&nbsp;</span> HT/DM/MI/TB/Thyroid '}<br/>
                    ${d.personalHistory.cadDrugAllergyCops ? '<span class="chk">✓</span> CAD/Drug Allergy/COPD ' : '<span class="chk">&nbsp;</span> CAD/Drug Allergy/COPD '}<br/>
                    ${d.personalHistory.smoking ? '<span class="chk">✓</span> Smoking ' : '<span class="chk">&nbsp;</span> Smoking '}
                    ${d.personalHistory.alcohol ? '<span class="chk">✓</span> Alcohol ' : '<span class="chk">&nbsp;</span> Alcohol '}
                    ${d.personalHistory.tobacco ? '<span class="chk">✓</span> Tobacco' : '<span class="chk">&nbsp;</span> Tobacco'}<br/>
                    <strong>Family History:</strong> ${d.familyHistory}<br/>
                    <strong>Past Ops:</strong> Time: ${d.pastOperationsTime} | Nature: ${d.pastOperationsNature}<br/>
                    Anaesthesia: ${d.pastOperationsAnaesthesia} | Complication: ${d.pastOperationsComplication}
                  </div>
                </td>

                <!-- Column 2: Systemic Exam & Investigations -->
                <td style="width: 35%;">
                  <div class="box-title">B. SYSTEMIC EXAMINATION & C. INV.</div>
                  <div style="padding: 2px;">
                    <strong>GC:</strong> ${d.examGc} &nbsp; <strong>Build/Nut:</strong> ${d.examBuildNutrition}<br/>
                    <strong>Pulse/SpO2:</strong> ${d.examPulseSpo2} &nbsp; <strong>BP:</strong> ${d.examBp}<br/>
                    <strong>Pallor/LN/Cyan/Oed:</strong> ${d.examPallorLnCyanosisOedema}<br/>
                    <strong>JVP:</strong> ${d.examJvp} &nbsp; <strong>Mouth Open/MPC:</strong> ${d.examMouthOpenMallampati}<br/>
                    <strong>Teeth:</strong> ${d.examTeeth} &nbsp; <strong>Back:</strong> ${d.examBack}<br/>
                    <strong>CVS:</strong> ${d.examCvs} &nbsp; <strong>RS:</strong> ${d.examRs}<br/>
                    <div style="border-top:1px solid #000; margin:2px 0; font-weight:bold;">C. INVESTIGATIONS:</div>
                    <strong>HB%:</strong> ${d.invHb} | <strong>LFT:</strong> ${d.invLft} | <strong>BT:</strong> ${d.invBt}<br/>
                    <strong>USG:</strong> ${d.invUs} | <strong>X-Ray:</strong> ${d.invXray} | <strong>CT:</strong> ${d.invCt}<br/>
                    <strong>RBS:</strong> ${d.invRbs} | <strong>ECG:</strong> ${d.invEcg} | <strong>INR:</strong> ${d.invInr}<br/>
                    <strong>ECHO:</strong> ${d.invEcho} | <strong>Other:</strong> ${d.invOther}
                  </div>
                </td>

                <!-- Column 3: Induction, Complications & Post Op -->
                <td style="width: 30%;">
                  <div class="box-title">INDUCTION & COMPLICATIONS</div>
                  <div style="padding: 2px;">
                    <strong>Induction:</strong><br/>
                    ${d.inductionSellicks ? '<span class="chk">✓</span> Sellick\'s Manoeuvre ' : '<span class="chk">&nbsp;</span> Sellick\'s '}
                    ${d.inductionVomiting ? '<span class="chk">✓</span> Vomiting<br/>' : '<span class="chk">&nbsp;</span> Vomiting<br/>'}
                    ${d.inductionCyanosis ? '<span class="chk">✓</span> Cyanosis ' : '<span class="chk">&nbsp;</span> Cyanosis '}
                    ${d.inductionSpasm ? '<span class="chk">✓</span> Spasm ' : '<span class="chk">&nbsp;</span> Spasm '}
                    ${d.inductionIntubation ? '<span class="chk">✓</span> Intubation<br/>' : '<span class="chk">&nbsp;</span> Intubation<br/>'}
                    <strong>Others:</strong> ${d.inductionOthers}<br/>

                    <div style="border-top:1px solid #000; margin:2px 0; font-weight:bold;">INTRA-OP COMPLICATIONS:</div>
                    ${d.intraopCyanosis ? '<span class="chk">✓</span> Cyanosis ' : '<span class="chk">&nbsp;</span> Cyanosis '}
                    ${d.intraopSpasm ? '<span class="chk">✓</span> Spasm ' : '<span class="chk">&nbsp;</span> Spasm '}<br/>
                    ${d.intraopArrhythmia ? '<span class="chk">✓</span> Arrhythmia ' : '<span class="chk">&nbsp;</span> Arrhythmia '}
                    ${d.intraopBradycardia ? '<span class="chk">✓</span> Bradycardia ' : '<span class="chk">&nbsp;</span> Bradycardia '}<br/>
                    ${d.intraopHypotension ? '<span class="chk">✓</span> Hypotension ' : '<span class="chk">&nbsp;</span> Hypotension '}<br/>
                    <strong>Misc:</strong> ${d.intraopMisc}<br/>

                    <div style="border-top:1px solid #000; margin:2px 0; font-weight:bold;">POST OP. PARAMETERS:</div>
                    <strong>P:</strong> ${d.postOpPulse} &nbsp; <strong>BP:</strong> ${d.postOpBp} &nbsp; <strong>SpO2:</strong> ${d.postOpSpo2}<br/>
                    <strong>Resp:</strong> ${d.postOpRespiration} &nbsp; <strong>CNS:</strong> ${d.postOpConsciousness}<br/>
                    <strong>Spinal:</strong> ${d.postOpSpinal} &nbsp; <strong>Epidural:</strong> ${d.postOpEpidural}<br/>
                    <strong>Catheter Size:</strong> ${d.postOpCatheterSize} &nbsp; <strong>Level:</strong> ${d.postOpLevel}<br/>
                    <strong>Drug:</strong> ${d.postOpDrug}<br/>
                    <strong>Shifting To:</strong> ${d.postOpShiftingTo} | <strong>Time:</strong> ${d.postOpTimeFrom}
                  </div>
                </td>
              </tr>
            </table>

            <!-- Drug History, Risk & Consent -->
            <table class="grid-tbl">
              <tr>
                <td style="width: 50%;">
                  <strong>DRUG HISTORY:</strong> ${d.drugHistory}<br/>
                  <strong>Anaesthesia Risk:</strong> ${d.anaesthesiaRiskGrade} &nbsp;&nbsp;|&nbsp;&nbsp;
                  <strong>Consent:</strong> ${d.consentPresent ? 'Present' : 'Absent'} &nbsp;&nbsp;|&nbsp;&nbsp;
                  <strong>Informed Consent:</strong> ${d.informedConsentPresent ? 'Present' : 'Absent'}
                </td>
                <td style="width: 50%;">
                  <strong>MONITORING STATUS:</strong><br/>
                  ${d.monitors.aEcg ? '<span class="chk">✓</span> A-ECG ' : '<span class="chk">&nbsp;</span> A-ECG '}
                  ${d.monitors.bSpo2 ? '<span class="chk">✓</span> B-SPO2 ' : '<span class="chk">&nbsp;</span> B-SPO2 '}
                  ${d.monitors.cNibp ? '<span class="chk">✓</span> C-NIBP ' : '<span class="chk">&nbsp;</span> C-NIBP '}
                  ${d.monitors.temp ? '<span class="chk">✓</span> Temp ' : '<span class="chk">&nbsp;</span> Temp '}<br/>
                  ${d.monitors.dEtco2 ? '<span class="chk">✓</span> D-ETCO2 ' : '<span class="chk">&nbsp;</span> D-ETCO2 '}
                  ${d.monitors.ibp ? '<span class="chk">✓</span> IBP ' : '<span class="chk">&nbsp;</span> IBP '}
                  ${d.monitors.eOther ? '<span class="chk">✓</span> E-Other' : '<span class="chk">&nbsp;</span> E-Other'}
                </td>
              </tr>
            </table>

            <!-- Bottom Multi-Column Agent Matrix -->
            <table class="grid-tbl" style="text-align: center;">
              <thead>
                <tr style="background:#e8e8e8; font-weight:bold;">
                  <th style="width:14%;">INDUCING AGENT</th>
                  <th style="width:16%;">MUSCLE RELAXANT</th>
                  <th style="width:18%;">LARYNGO ET TUBE</th>
                  <th style="width:16%;">INHALATION AGENT</th>
                  <th style="width:10%;">CIRCUIT</th>
                  <th style="width:13%;">REVERSAL</th>
                  <th style="width:13%;">VENTILATION</th>
                </tr>
              </thead>
              <tbody style="font-size:6.8pt; text-align:left;">
                <tr>
                  <td>
                    Etomidate: ${d.inducingEtomidate}<br/>
                    Ketamine: ${d.inducingKetamine}<br/>
                    Propofol: ${d.inducingPropofol}<br/>
                    Others: ${d.inducingOthers}
                  </td>
                  <td>
                    Suxamethonium: ${d.muscleSuxamethonium}<br/>
                    Vecuronium: ${d.muscleVecuronium}<br/>
                    Rocuronium: ${d.muscleRocuronium}<br/>
                    Atracurium: ${d.muscleAtracurium}<br/>
                    Others: ${d.muscleOthers}
                  </td>
                  <td>
                    Xylocaine Spray: ${d.laryngoXylocaineSpray}<br/>
                    Type: ${d.laryngoOralNasal}<br/>
                    Cuffed/Plain: ${d.laryngoCuffedPlainSize}<br/>
                    I-Gel Size: ${d.laryngoIgelSize}
                  </td>
                  <td>
                    O2/N2O: ${d.inhalationO2N2O}<br/>
                    Sevo/ISO: ${d.inhalationSevoIso}<br/>
                    Gas Flow: ${d.inhalationFlowGasLpm}
                  </td>
                  <td>
                    Closed: ${d.circuitClosed ? 'Yes' : 'No'}<br/>
                    Bains: ${d.circuitBains ? 'Yes' : 'No'}
                  </td>
                  <td>
                    Volume: ${d.reversalVolume}<br/>
                    Pressure: ${d.reversalPressure}
                  </td>
                  <td>
                    PEEP: ${d.ventilationPeep}<br/>
                    R.R.: ${d.ventilationRr}<br/>
                    T.V.: ${d.ventilationTv}
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- Footer Signatures -->
            <div style="margin-top: 15px; display: flex; justify-content: space-between; font-size: 8pt; font-weight: bold;">
              <div>Operating Surgeon Signature: .......................................</div>
              <div>Anaesthetist Team Signature: .......................................</div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 400);
  };

  return (
    <div className="space-y-6 w-full animate-fade-in">
      {/* Top Banner & Actions Header */}
      <Card className="border border-teal-200/90 shadow-md rounded-2xl overflow-hidden bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white">
        <CardHeader className="p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-amber-400 text-amber-950 font-black text-[10px] uppercase tracking-wider px-2 py-0.5">
                  Official OT Clinical Form
                </Badge>
                <Badge variant="outline" className="text-teal-200 border-teal-400/40 text-[10px]">
                  Neo Gastro Hospital Standard
                </Badge>
              </div>
              <CardTitle className="text-xl font-black text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-300" />
                ANAESTHETIC OPERATION RECORD
              </CardTitle>
              <CardDescription className="text-teal-100/80 text-xs mt-1">
                Complete Intraoperative & Pre-Anesthetic Operation Record (Neo Gastro Hospital Standard)
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => handlePrint(true)} 
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold text-xs h-9"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5" /> Print Blank Form
              </Button>
              <Button 
                onClick={() => handlePrint(false)} 
                className="bg-amber-500 hover:bg-amber-600 text-amber-950 font-black text-xs h-9 shadow-md"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5" /> Print Filled Form
              </Button>
              <Button 
                onClick={() => {
                  toast.success('Anaesthetic Operation Record saved successfully!');
                  if (onSave) onSave(record);
                }} 
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs h-9 shadow-md"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" /> Save Record
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Header Patient Data & Pre-Med / Acid Prophylaxis */}
        <div className="space-y-6 lg:col-span-2">
          {/* Section 1: Basic Patient Info */}
          <Card className="border border-slate-200 shadow-xs rounded-2xl bg-white">
            <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <User className="w-4 h-4 text-teal-600" /> Patient & Surgery Operation Record Info
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <Label className="text-[10px] font-bold text-slate-600">Date</Label>
                  <Input value={record.date} onChange={e => setRecord({...record, date: e.target.value})} className="h-8 text-xs font-medium" />
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-slate-600">Regn. No.</Label>
                  <Input value={record.regnNo} onChange={e => setRecord({...record, regnNo: e.target.value})} className="h-8 text-xs font-semibold" />
                </div>
                <div className="col-span-2">
                  <Label className="text-[10px] font-bold text-slate-600">Patient Name</Label>
                  <Input value={record.patientName} onChange={e => setRecord({...record, patientName: e.target.value})} className="h-8 text-xs font-bold text-slate-900" />
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-slate-600">Age / Sex</Label>
                  <div className="flex gap-1">
                    <Input value={record.age} onChange={e => setRecord({...record, age: e.target.value})} className="h-8 text-xs w-16" />
                    <Input value={record.sex} onChange={e => setRecord({...record, sex: e.target.value as any})} className="h-8 text-xs w-12 text-center" />
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-slate-600">Weight (kg) / Ht (cm)</Label>
                  <div className="flex gap-1">
                    <Input value={record.weightKg} onChange={e => setRecord({...record, weightKg: e.target.value})} placeholder="Weight" className="h-8 text-xs" />
                    <Input value={record.heightCm} onChange={e => setRecord({...record, heightCm: e.target.value})} placeholder="Ht" className="h-8 text-xs" />
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-slate-600">Hospital & Ward</Label>
                  <Input value={record.hospitalWard} onChange={e => setRecord({...record, hospitalWard: e.target.value})} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-slate-600">Bed No.</Label>
                  <Input value={record.bedNo} onChange={e => setRecord({...record, bedNo: e.target.value})} className="h-8 text-xs" />
                </div>
                <div className="col-span-2">
                  <Label className="text-[10px] font-bold text-slate-600">Diagnosis</Label>
                  <Input value={record.diagnosis} onChange={e => setRecord({...record, diagnosis: e.target.value})} className="h-8 text-xs" />
                </div>
                <div className="col-span-2">
                  <Label className="text-[10px] font-bold text-slate-600">Operation Name</Label>
                  <Input value={record.operationName} onChange={e => setRecord({...record, operationName: e.target.value})} className="h-8 text-xs font-bold text-teal-800" />
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-slate-600">Operating Surgeon Dr.</Label>
                  <Input value={record.operatingSurgeon} onChange={e => setRecord({...record, operatingSurgeon: e.target.value})} className="h-8 text-xs font-medium" />
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-slate-600">Anaesthetist Team Dr.</Label>
                  <Input value={record.anaesthetistTeam} onChange={e => setRecord({...record, anaesthetistTeam: e.target.value})} className="h-8 text-xs font-medium" />
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-slate-600">Duration From</Label>
                  <Input value={record.durationFrom} onChange={e => setRecord({...record, durationFrom: e.target.value})} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-slate-600">Duration To</Label>
                  <Input value={record.durationTo} onChange={e => setRecord({...record, durationTo: e.target.value})} className="h-8 text-xs" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: A-History & Systemic Examination */}
          <Card className="border border-slate-200 shadow-xs rounded-2xl bg-white">
            <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-indigo-600" /> A-History & Systemic Examination
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <Label className="text-[10px] font-bold text-slate-600">Present History</Label>
                  <Input value={record.historyPresent} onChange={e => setRecord({...record, historyPresent: e.target.value})} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-slate-600">Past History</Label>
                  <Input value={record.historyPast} onChange={e => setRecord({...record, historyPast: e.target.value})} className="h-8 text-xs" />
                </div>
              </div>

              {/* Personal Checkboxes */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <p className="font-extrabold text-slate-800 text-xs">Personal History Checkboxes</p>
                <div className="flex flex-wrap gap-4 text-xs font-medium">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox checked={record.personalHistory.htDmMiTbThyroid} onCheckedChange={c => setRecord({...record, personalHistory: {...record.personalHistory, htDmMiTbThyroid: !!c}})} />
                    <span>HT / DM / MI / TB / Thyroid</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox checked={record.personalHistory.cadDrugAllergyCops} onCheckedChange={c => setRecord({...record, personalHistory: {...record.personalHistory, cadDrugAllergyCops: !!c}})} />
                    <span>CAD / Drug Allergy / COPD</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox checked={record.personalHistory.smoking} onCheckedChange={c => setRecord({...record, personalHistory: {...record.personalHistory, smoking: !!c}})} />
                    <span>Smoking</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox checked={record.personalHistory.alcohol} onCheckedChange={c => setRecord({...record, personalHistory: {...record.personalHistory, alcohol: !!c}})} />
                    <span>Alcohol</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox checked={record.personalHistory.tobacco} onCheckedChange={c => setRecord({...record, personalHistory: {...record.personalHistory, tobacco: !!c}})} />
                    <span>Tobacco</span>
                  </label>
                </div>
              </div>

              {/* Systemic Exam */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <Label className="text-[10px] font-bold">GC</Label>
                  <Input value={record.examGc} onChange={e => setRecord({...record, examGc: e.target.value})} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px] font-bold">Build & Nutrition</Label>
                  <Input value={record.examBuildNutrition} onChange={e => setRecord({...record, examBuildNutrition: e.target.value})} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px] font-bold">Pulse / SpO2</Label>
                  <Input value={record.examPulseSpo2} onChange={e => setRecord({...record, examPulseSpo2: e.target.value})} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px] font-bold">BP</Label>
                  <Input value={record.examBp} onChange={e => setRecord({...record, examBp: e.target.value})} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px] font-bold">Pallor / L.N. / Cyanosis / Oedema</Label>
                  <Input value={record.examPallorLnCyanosisOedema} onChange={e => setRecord({...record, examPallorLnCyanosisOedema: e.target.value})} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px] font-bold">Mouth Open / Mallampati</Label>
                  <Input value={record.examMouthOpenMallampati} onChange={e => setRecord({...record, examMouthOpenMallampati: e.target.value})} className="h-8 text-xs" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Investigations & Matrix */}
          <Card className="border border-slate-200 shadow-xs rounded-2xl bg-white">
            <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" /> C. Investigation & Agent Matrix
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <Label className="text-[10px]">HB %</Label>
                  <Input value={record.invHb} onChange={e => setRecord({...record, invHb: e.target.value})} className="h-7 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px]">RBS</Label>
                  <Input value={record.invRbs} onChange={e => setRecord({...record, invRbs: e.target.value})} className="h-7 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px]">ECG</Label>
                  <Input value={record.invEcg} onChange={e => setRecord({...record, invEcg: e.target.value})} className="h-7 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px]">ECHO</Label>
                  <Input value={record.invEcho} onChange={e => setRecord({...record, invEcho: e.target.value})} className="h-7 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px]">USG</Label>
                  <Input value={record.invUs} onChange={e => setRecord({...record, invUs: e.target.value})} className="h-7 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px]">X-Ray</Label>
                  <Input value={record.invXray} onChange={e => setRecord({...record, invXray: e.target.value})} className="h-7 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px]">LFT</Label>
                  <Input value={record.invLft} onChange={e => setRecord({...record, invLft: e.target.value})} className="h-7 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px]">BT / CT / INR</Label>
                  <Input value={record.invBt} onChange={e => setRecord({...record, invBt: e.target.value})} className="h-7 text-xs" />
                </div>
              </div>

              {/* Agent Grid */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50 p-3 space-y-3">
                <p className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Agents & Airway Summary</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <Label className="text-[10px] font-bold text-teal-800">Inducing Agent</Label>
                    <Input value={record.inducingPropofol} onChange={e => setRecord({...record, inducingPropofol: e.target.value})} placeholder="Propofol / Ketamine" className="h-7 text-xs mb-1" />
                    <Input value={record.inducingOthers} onChange={e => setRecord({...record, inducingOthers: e.target.value})} placeholder="Others / Fentanyl" className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-bold text-teal-800">Muscle Relaxants</Label>
                    <Input value={record.muscleSuxamethonium} onChange={e => setRecord({...record, muscleSuxamethonium: e.target.value})} placeholder="Suxamethonium" className="h-7 text-xs mb-1" />
                    <Input value={record.muscleVecuronium} onChange={e => setRecord({...record, muscleVecuronium: e.target.value})} placeholder="Vecuronium / Atracurium" className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-bold text-teal-800">Laryngo ET Tube</Label>
                    <Input value={record.laryngoCuffedPlainSize} onChange={e => setRecord({...record, laryngoCuffedPlainSize: e.target.value})} placeholder="ET Size (e.g. 7.0 Cuffed)" className="h-7 text-xs mb-1" />
                    <Input value={record.laryngoXylocaineSpray} onChange={e => setRecord({...record, laryngoXylocaineSpray: e.target.value})} placeholder="Xylocaine Spray" className="h-7 text-xs" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Pre-Med, Acid Prophylaxis, Technique, ASA & Controls */}
        <div className="space-y-6">
          {/* Box Stack: Premedication & Prophylaxis */}
          <Card className="border border-slate-200 shadow-xs rounded-2xl bg-white">
            <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-800">
                Pre-Medication & Acid Prophylaxis
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs">
              <div>
                <p className="font-extrabold text-slate-800 mb-2">Pre-Medication Checkboxes</p>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={record.glycopyrrolate} onCheckedChange={c => setRecord({...record, glycopyrrolate: !!c})} />
                    <span>Glycopyrrolates 0.2mg</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={record.fentanyl} onCheckedChange={c => setRecord({...record, fentanyl: !!c})} />
                    <span>Fentanyl</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={record.midazolam} onCheckedChange={c => setRecord({...record, midazolam: !!c})} />
                    <span>Midazolam</span>
                  </label>
                </div>
              </div>

              <div className="pt-2 border-t">
                <p className="font-extrabold text-slate-800 mb-2">Acid Prophylaxis Checkboxes</p>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={record.h2Blockers} onCheckedChange={c => setRecord({...record, h2Blockers: !!c})} />
                    <span>H2 Blockers</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={record.antiEmetics} onCheckedChange={c => setRecord({...record, antiEmetics: !!c})} />
                    <span>Anti Emetics</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={record.rylesTubeSuction} onCheckedChange={c => setRecord({...record, rylesTubeSuction: !!c})} />
                    <span>Ryles Tube Suction</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={record.preOxygenation6L} onCheckedChange={c => setRecord({...record, preOxygenation6L: !!c})} />
                    <span>Pre Oxygenation 6L/m</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={record.gaAcid} onCheckedChange={c => setRecord({...record, gaAcid: !!c})} />
                    <span>General Anaesthesia (GA)</span>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Box Stack: Technique & ASA Grading */}
          <Card className="border border-slate-200 shadow-xs rounded-2xl bg-white">
            <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-800">
                Anaesthesia Technique & ASA Grade
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs">
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={record.techniqueEpiduralSpinal} onCheckedChange={c => setRecord({...record, techniqueEpiduralSpinal: !!c})} />
                  <span>Epidural / Spinal</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={record.techniqueBlock} onCheckedChange={c => setRecord({...record, techniqueBlock: !!c})} />
                  <span>Nerve Block</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={record.techniqueGaRegional} onCheckedChange={c => setRecord({...record, techniqueGaRegional: !!c})} />
                  <span>GA + Regional</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={record.techniqueRegionalGaSupp} onCheckedChange={c => setRecord({...record, techniqueRegionalGaSupp: !!c})} />
                  <span>Regional + GA Supplement</span>
                </label>
              </div>

              <div className="pt-2 border-t space-y-2">
                <div>
                  <Label className="text-[10px] font-bold">Position of Patient</Label>
                  <Input value={record.patientPosition} onChange={e => setRecord({...record, patientPosition: e.target.value})} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px] font-bold">Type of Surgery</Label>
                  <div className="flex gap-2 mt-1">
                    <Button 
                      type="button"
                      size="sm"
                      variant={record.surgeryType === 'Planned' ? 'default' : 'outline'}
                      onClick={() => setRecord({...record, surgeryType: 'Planned'})}
                      className="h-7 text-xs flex-1"
                    >
                      Planned
                    </Button>
                    <Button 
                      type="button"
                      size="sm"
                      variant={record.surgeryType === 'Emergency' ? 'destructive' : 'outline'}
                      onClick={() => setRecord({...record, surgeryType: 'Emergency'})}
                      className="h-7 text-xs flex-1"
                    >
                      Emergency
                    </Button>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t">
                <Label className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">ASA Risk Grading</Label>
                <div className="flex items-center gap-2 mt-1.5">
                  {['1', '2', '3', '4', '5'].map(grade => (
                    <button
                      key={grade}
                      type="button"
                      onClick={() => setRecord({...record, asaGrade: grade as any})}
                      className={`h-8 w-8 rounded-lg font-black text-xs border flex items-center justify-center transition-all ${
                        record.asaGrade === grade
                          ? 'bg-amber-500 text-amber-950 border-amber-600 shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300'
                      }`}
                    >
                      ASA {grade}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
