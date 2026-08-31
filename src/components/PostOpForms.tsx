import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  FileText, 
  Printer, 
  Save, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  RotateCcw, 
  UserCheck, 
  Activity, 
  Stethoscope,
  HeartPulse,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Building2,
  X,
  AlertCircle,
  Pill,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { storage } from '@/lib/storage';
import { cn } from '@/lib/utils';
import { printHTML } from '@/lib/printHelper';

export interface PostOpChecklistItem {
  id: number;
  item: string;
  yes: boolean;
  no: boolean;
  remark: string;
  isCustom?: boolean;
}

export interface PostOpChecklistData {
  id?: string;
  patientId?: string;
  patientName: string;
  dob: string;
  ageSex: string;
  idNo: string;
  ward: string;
  bedNo: string;
  category: string;
  diagnosis: string;
  surgery: string;
  date: string;
  regNo: string;
  items: PostOpChecklistItem[];
  relativeName?: string;
  handedOverByNurse: string;
  handedOverDateTime: string;
  receivedByNurse: string;
  doctorSign: string;
  receivedDateTime: string;
  createdAt?: string;
}

export interface PostOpInstructionsData {
  id?: string;
  patientId?: string;
  patientName: string;
  idNo: string;
  ward: string;
  bedNo: string;
  ageSex: string;
  diagnosis: string;
  surgery: string;
  date: string;

  // Surgical Instructions
  nbmDuration: string;
  mobilization: string;
  binderRequired: 'Required' | 'Not Required' | '';
  diet: string;
  ivFluids: string;
  injectableMedication?: string;
  surgicalDateTime: string;
  surgeonSignature: string;

  // Anaesthesia Instructions
  monitorVitals: boolean;
  pr: string;
  bp: string;
  spo2: string;
  rr: string;
  o2Mode: 'Not required' | 'Nasal' | 'Mask' | '';
  ivLinesFlushed: boolean;
  analgesiaInRecovery: string;
  postOpAnalgesiaInDrugChart: boolean;
  otherInstructions: string;

  // Aldrete Score
  activityScore: number; // 0, 1, 2
  respirationScore: number; // 0, 1, 2
  circulationScore: number; // 0, 1, 2
  consciousnessScore: number; // 0, 1, 2
  spo2Score: number; // 0, 1, 2
  shiftedTo: 'Shifted to ward' | 'Shifted to ICU' | 'Shifted to ward if >= 9' | '';
  anaesthesiaDateTime: string;
  anaesthetistSignature: string;
  createdAt?: string;
}

const DEFAULT_CHECKLIST_ITEMS: PostOpChecklistItem[] = [
  { id: 1, item: 'Identify the patient by asking name & checking with file', yes: false, no: false, remark: '' },
  { id: 2, item: 'Connect oxygen / Ventilator as per order', yes: false, no: false, remark: '' },
  { id: 3, item: 'Check I / O, vital signs, record the same & report if needed', yes: false, no: false, remark: '' },
  { id: 4, item: 'Confirm all infusions (Eg. Inotropes) connected & running', yes: false, no: false, remark: '' },
  { id: 5, item: 'Check the drainage for any bleeding, blockage etc. & report accordingly.', yes: false, no: false, remark: '' },
  { id: 6, item: 'Observe the wound for any bleeding', yes: false, no: false, remark: '' },
  { id: 7, item: 'All lines (radial, femoral, cvp) drains & pacing wire labled & checked', yes: false, no: false, remark: '' },
  { id: 8, item: 'Administer drugs and DVT Prophylaxis as per order', yes: false, no: false, remark: '' },
  { id: 9, item: 'RBS/ABG/Xray done as per orders and informed if abnormal', yes: false, no: false, remark: '' },
  { id: 10, item: 'Pacing box battery checked', yes: false, no: false, remark: '' },
  { id: 11, item: 'Give moral support to patient & family', yes: false, no: false, remark: '' },
  { id: 12, item: 'Encourage deep breathing and coughing exercises', yes: false, no: false, remark: '' },
  { id: 13, item: 'Encourage early ambulation of patient', yes: false, no: false, remark: '' },
  { id: 14, item: 'Take care of mouth, pressure points & personal hygiene', yes: false, no: false, remark: '' },
  { id: 15, item: 'Prepare, send the diet slip & ensure that the patient take the diet as per the order', yes: false, no: false, remark: '' },
  { id: 16, item: 'Specimen shown to relatives', yes: false, no: false, remark: '' },
  { id: 17, item: 'Biopsy or Specimen sent to lab', yes: false, no: false, remark: '' },
  { id: 18, item: 'Post-operative monitoring check 18', yes: false, no: false, remark: '', isCustom: true },
  { id: 19, item: 'Post-operative monitoring check 19', yes: false, no: false, remark: '', isCustom: true },
  { id: 20, item: 'Post-operative monitoring check 20', yes: false, no: false, remark: '', isCustom: true }
];

interface PostOpFormsProps {
  patient?: any;
  record?: any;
  onClose?: () => void;
  defaultFormTab?: 'checklist' | 'instructions';
}

export default function PostOpForms({ patient, record, onClose, defaultFormTab = 'checklist' }: PostOpFormsProps) {
  const [activeTab, setActiveTab] = useState<'checklist' | 'instructions'>(defaultFormTab);

  // Patient auto fills
  const todayStr = new Date().toISOString().split('T')[0];
  const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Checklist State
  const [checklist, setChecklist] = useState<PostOpChecklistData>({
    patientName: patient?.name || record?.patientName || '',
    dob: patient?.dob || '',
    ageSex: patient?.age ? `${patient.age} Y / ${patient.gender || 'M'}` : '',
    idNo: patient?.mrn || record?.mrn || `MRN-${Math.floor(100000 + Math.random() * 900000)}`,
    ward: patient?.ward || 'Surgical Ward',
    bedNo: patient?.bedNo || 'B-04',
    category: 'General',
    diagnosis: record?.diagnosis || patient?.condition || 'Post-Operative Recovery',
    surgery: record?.operationName || 'General Surgical Procedure',
    date: record?.date || todayStr,
    regNo: `LL/${Math.floor(10000 + Math.random() * 90000)}/${new Date().getFullYear()}`,
    items: DEFAULT_CHECKLIST_ITEMS,
    relativeName: patient?.relativeName || '',
    handedOverByNurse: 'Nurse Deepika Roy',
    handedOverDateTime: `${todayStr} ${nowTimeStr}`,
    receivedByNurse: 'Nurse Priya Sharma',
    doctorSign: record?.surgeonName || 'Dr. Alok Verma',
    receivedDateTime: `${todayStr} ${nowTimeStr}`
  });

  // Instructions State
  const [instructions, setInstructions] = useState<PostOpInstructionsData>({
    patientName: patient?.name || record?.patientName || '',
    idNo: patient?.mrn || record?.mrn || `MRN-${Math.floor(100000 + Math.random() * 900000)}`,
    ward: patient?.ward || 'Surgical Ward',
    bedNo: patient?.bedNo || 'B-04',
    ageSex: patient?.age ? `${patient.age} Y / ${patient.gender || 'M'}` : '',
    diagnosis: record?.diagnosis || patient?.condition || 'Post-Operative Recovery',
    surgery: record?.operationName || 'General Surgical Procedure',
    date: record?.date || todayStr,

    nbmDuration: 'Till further orders (min. 6 hours)',
    mobilization: 'Bedside mobilization as tolerated after 4 hrs',
    binderRequired: 'Required',
    diet: 'Sips of water after bowel sounds return, then clear liquids',
    ivFluids: 'NS 1000ml + RL 1000ml @ 75 ml/hr',
    injectableMedication: 'Inj. Pantoprazole 40mg IV BD\nInj. Ondansetron 4mg IV TDS SOS\nInj. Paracetamol 1g IV piggyback BD\nInj. Ceftriaxone 1g IV BD',
    surgicalDateTime: `${todayStr} ${nowTimeStr}`,
    surgeonSignature: record?.surgeonName || 'Dr. Admin Surgeon',

    monitorVitals: true,
    pr: '78',
    bp: '120/80',
    spo2: '99',
    rr: '18',
    o2Mode: 'Nasal',
    ivLinesFlushed: true,
    analgesiaInRecovery: 'Inj. Paracetamol 1gm IV piggyback slowly',
    postOpAnalgesiaInDrugChart: true,
    otherInstructions: 'Maintain I/O chart strictly. Report if urine output < 30ml/hr.',

    activityScore: 2,
    respirationScore: 2,
    circulationScore: 2,
    consciousnessScore: 2,
    spo2Score: 2,
    shiftedTo: 'Shifted to ward',
    anaesthesiaDateTime: `${todayStr} ${nowTimeStr}`,
    anaesthetistSignature: 'Dr. Navodita Anesthetist'
  });

  // Load saved state from storage if available
  useEffect(() => {
    const keyPatient = patient?.id || record?.patientId || record?.id || 'default';
    const savedChecklist = storage.get(`hms_postop_checklist_${keyPatient}`, null);
    if (savedChecklist) {
      setChecklist(savedChecklist);
    }
    const savedInstructions = storage.get(`hms_postop_instructions_${keyPatient}`, null);
    if (savedInstructions) {
      setInstructions(savedInstructions);
    }
  }, [patient, record]);

  const saveChecklist = () => {
    const keyPatient = patient?.id || record?.patientId || record?.id || 'default';
    storage.set(`hms_postop_checklist_${keyPatient}`, checklist);
    toast.success('Post Operative Check List saved successfully!');
  };

  const saveInstructions = () => {
    const keyPatient = patient?.id || record?.patientId || record?.id || 'default';
    storage.set(`hms_postop_instructions_${keyPatient}`, instructions);
    toast.success('Post Operative Surgical & Anaesthesia Instructions saved!');
  };

  const handleChecklistToggle = (index: number, option: 'yes' | 'no') => {
    const newItems = [...checklist.items];
    if (option === 'yes') {
      newItems[index].yes = !newItems[index].yes;
      if (newItems[index].yes) newItems[index].no = false;
    } else {
      newItems[index].no = !newItems[index].no;
      if (newItems[index].no) newItems[index].yes = false;
    }
    setChecklist({ ...checklist, items: newItems });
  };

  const handleRemarkChange = (index: number, val: string) => {
    const newItems = [...checklist.items];
    newItems[index].remark = val;
    setChecklist({ ...checklist, items: newItems });
  };

  const handleCustomItemTextChange = (index: number, val: string) => {
    const newItems = [...checklist.items];
    newItems[index].item = val;
    setChecklist({ ...checklist, items: newItems });
  };

  // Calculate total Aldrete Score
  const totalAldreteScore = 
    (instructions.activityScore || 0) +
    (instructions.respirationScore || 0) +
    (instructions.circulationScore || 0) +
    (instructions.consciousnessScore || 0) +
    (instructions.spo2Score || 0);

  // PRINT FUNCTION 1: Post Operative Check List (Image 1 Layout)
  const printChecklist = (printBlank = false) => {
    const c = checklist;
    const itemsMarkup = (printBlank ? DEFAULT_CHECKLIST_ITEMS : c.items).map((it, idx) => {
      const isYes = !printBlank && it.yes;
      const isNo = !printBlank && it.no;
      const rem = printBlank ? '' : (it.remark || '');
      const itemLabel = (it.id === 16 && !printBlank && c.relativeName) 
        ? `${it.item} (${c.relativeName})` 
        : it.item;

      return `
        <tr>
          <td style="text-align:center; font-weight:bold; width:35px; border:1px solid #000; padding:4px;">${it.id}</td>
          <td style="border:1px solid #000; padding:4px 6px; font-size:12px;">${itemLabel}</td>
          <td style="text-align:center; width:45px; border:1px solid #000; padding:4px; font-weight:bold;">${isYes ? '✓' : ''}</td>
          <td style="text-align:center; width:45px; border:1px solid #000; padding:4px; font-weight:bold;">${isNo ? '✓' : ''}</td>
          <td style="border:1px solid #000; padding:4px 6px; font-size:11px;">${rem}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Post Operative Check List - ${printBlank ? 'Blank Form' : (c.patientName || 'Patient')}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            body { font-family: Arial, sans-serif; color: #000; margin: 0; padding: 0; font-size: 11px; line-height: 1.3; }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
            .header-logo { text-align: center; }
            .h-title { text-align: center; font-size: 16px; font-weight: bold; text-transform: uppercase; margin: 6px 0; letter-spacing: 0.5px; }
            .field-grid { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 11px; }
            .field-grid td { padding: 3px 4px; vertical-align: top; }
            .dots { border-bottom: 1px dotted #000; display: inline-block; min-width: 80px; }
            .main-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
            .main-table th { border: 1px solid #000; padding: 5px; font-size: 11px; background: #f2f2f2; text-align: center; }
            .footer-grid { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .footer-box { border: 1px solid #000; padding: 8px; vertical-align: top; width: 50%; height: 75px; }
            .footer-title { font-weight: bold; text-decoration: underline; margin-bottom: 6px; display: block; }
          </style>
        </head>
        <body>
          <div style="text-align:center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 6px;">
            <div style="font-size: 18px; font-weight: bold; color: #000;">Gastro Plus Hospital</div>
            <div style="font-size: 10px; margin-top:2px; font-weight: bold;">Plot No. 7 & 8, Om Shiv Nagar, Gufa Mandir Road, Lal Ghati Bhopal, 462030, Madhya Pradesh | Tel: 9109102145/9109101246</div>
          </div>

          <div style="display:flex; justify-content: space-between; align-items:center; font-size:10px; margin-bottom:4px;">
            <div>Reg. No.: ${printBlank ? 'LL/721........ / 2026' : c.regNo}</div>
            <div style="font-size:15px; font-weight:bold; text-align:center; flex:1;">Post Operative Check List</div>
            <div>Date: ${printBlank ? '........................' : c.date}</div>
          </div>

          <table class="field-grid">
            <tr>
              <td><strong>Patient Name:</strong> ${printBlank ? '.........................................................................' : (c.patientName || '................................')}</td>
              <td><strong>DOB:</strong> ${printBlank ? '............................' : (c.dob || '............................')}</td>
              <td><strong>Age/Sex:</strong> ${printBlank ? '............................' : (c.ageSex || '............................')}</td>
            </tr>
            <tr>
              <td><strong>ID. No.:</strong> ${printBlank ? '.........................................' : (c.idNo || '................................')}</td>
              <td><strong>Ward:</strong> ${printBlank ? '.........................' : (c.ward || '........................')}</td>
              <td><strong>Bed No.:</strong> ${printBlank ? '................' : (c.bedNo || '................')}</td>
              <td><strong>Category:</strong> ${printBlank ? '................' : (c.category || '................')}</td>
            </tr>
            <tr>
              <td colspan="3"><strong>Diagnosis:</strong> ${printBlank ? '........................................................................................................................................................' : (c.diagnosis || '................................')}</td>
            </tr>
            <tr>
              <td colspan="3"><strong>Surgery:</strong> ${printBlank ? '........................................................................................................................................................' : (c.surgery || '................................')}</td>
            </tr>
          </table>

          <table class="main-table">
            <thead>
              <tr>
                <th style="width:35px;">No</th>
                <th>Item</th>
                <th style="width:45px;">Yes</th>
                <th style="width:45px;">No</th>
                <th style="width:180px;">Remark</th>
              </tr>
            </thead>
            <tbody>
              ${itemsMarkup}
            </tbody>
          </table>

          <table class="footer-grid">
            <tr>
              <td class="footer-box">
                <span class="footer-title">Patient handed over by</span>
                <div style="margin-top: 10px;">Operation theatre nurse: ${printBlank ? '........................................................' : (c.handedOverByNurse || '................................')}</div>
                <div style="margin-top: 10px;">Date and time: ${printBlank ? '........................................................' : (c.handedOverDateTime || '................................')}</div>
              </td>
              <td class="footer-box">
                <span class="footer-title">Patient received by ICU / CCU / Ward Nurse</span>
                <div style="margin-top: 6px;">Nurse Name: ${printBlank ? '........................................................' : (c.receivedByNurse || '................................')}</div>
                <div style="margin-top: 6px;">Doctor Sign: ${printBlank ? '........................................................' : (c.doctorSign || '................................')}</div>
                <div style="margin-top: 6px;">Date and time: ${printBlank ? '........................................................' : (c.receivedDateTime || '................................')}</div>
              </td>
            </tr>
          </table>

          <div style="text-align:center; font-size:9px; margin-top:8px; color:#555;">Form 15 - Post Operative Handover Audit Ledger</div>
        </body>
      </html>
    `;
    printHTML(htmlContent);
  };

  // PRINT FUNCTION 2: Post Operative Surgical & Anaesthesia Instructions (Image 2 Layout)
  const printInstructions = (printBlank = false) => {
    const inst = instructions;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Post Operative Instructions - ${printBlank ? 'Blank Form' : (inst.patientName || 'Patient')}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            body { font-family: Arial, sans-serif; color: #000; margin: 0; padding: 0; font-size: 11px; line-height: 1.4; }
            .header-box { border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 10px; text-align: center; }
            .sec-title { font-size: 15px; font-weight: bold; text-align: center; text-decoration: underline; margin: 10px 0 8px 0; }
            .dots { border-bottom: 1px dotted #000; display: inline-block; min-width: 120px; }
            .chk-box { display: inline-block; width: 12px; height: 12px; border: 1px solid #000; text-align: center; line-height: 10px; font-weight: bold; font-size: 10px; margin-right: 4px; vertical-align: middle; }
            .patient-bar { width: 100%; margin-bottom: 12px; border-collapse: collapse; font-size: 11px; background: #fcfcfc; }
            .patient-bar td { padding: 4px 6px; border: 1px solid #ccc; }
            .instruction-block { margin-bottom: 12px; line-height: 1.8; font-size: 12px; }
            .aldrete-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            .aldrete-table th, .aldrete-table td { border: 1px solid #000; padding: 6px; font-size: 10px; vertical-align: top; }
            .aldrete-table th { background: #f2f2f2; text-align: center; }
            .score-head { font-weight: bold; width: 18px; text-align: center; background: #fafafa; }
            .sig-row { display: flex; justify-content: space-between; margin-top: 15px; font-size: 11px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header-box">
            <div style="font-size: 18px; font-weight: bold;">Gastro Plus Hospital</div>
            <div style="font-size: 10px; color:#333; font-weight: bold;">Plot No. 7 & 8, Om Shiv Nagar, Gufa Mandir Road, Lal Ghati Bhopal, 462030, Madhya Pradesh | Tel: 9109102145/9109101246</div>
          </div>

          <table class="patient-bar">
            <tr>
              <td><strong>Patient Name:</strong> ${printBlank ? '................................................' : inst.patientName}</td>
              <td><strong>ID / MRN:</strong> ${printBlank ? '................' : inst.idNo}</td>
              <td><strong>Age/Sex:</strong> ${printBlank ? '............' : inst.ageSex}</td>
              <td><strong>Ward/Bed:</strong> ${printBlank ? '............' : `${inst.ward} / ${inst.bedNo}`}</td>
            </tr>
            <tr>
              <td colspan="2"><strong>Diagnosis:</strong> ${printBlank ? '............................................................................' : inst.diagnosis}</td>
              <td colspan="2"><strong>Surgery:</strong> ${printBlank ? '............................................................................' : inst.surgery}</td>
            </tr>
          </table>

          <!-- SECTION 1: SURGICAL INSTRUCTIONS -->
          <div class="sec-title">Post Operative Surgical Instructions</div>
          <div class="instruction-block">
            <div>• <strong>NBM</strong> not required / till further orders / for <u>${printBlank ? '........................' : (inst.nbmDuration || '........................')}</u> hrs./days</div>
            <div>• <strong>Mobilization:</strong> <u>${printBlank ? '................................................................................................' : (inst.mobilization || '................................')}</u></div>
            <div>• <strong>Abdominal / Chest Binder:</strong> <span class="chk-box">${!printBlank && inst.binderRequired === 'Required' ? '✓' : ''}</span> Required &nbsp;&nbsp;&nbsp;&nbsp; <span class="chk-box">${!printBlank && inst.binderRequired === 'Not Required' ? '✓' : ''}</span> Not Required</div>
            <div>• <strong>Diet:</strong> <u>${printBlank ? '................................................................................................................................' : (inst.diet || '................................')}</u></div>
            <div>• <strong>IV Fluids:</strong> <u>${printBlank ? '................................................................................................................................' : (inst.ivFluids || '................................')}</u></div>
            <div>• <strong>Advise for Injectable Medication:</strong> <u>${printBlank ? '................................................................................................................................' : ((inst.injectableMedication || '').replace(/\n/g, ', ') || '................................')}</u></div>
          </div>

          <div class="sig-row">
            <div>Date & Time: <u>${printBlank ? '................................................' : inst.surgicalDateTime}</u></div>
            <div>Name & Signature: <u>${printBlank ? '................................................' : inst.surgeonSignature}</u></div>
          </div>

          <hr style="border: 0; border-top: 1px dashed #666; margin: 15px 0;" />

          <!-- SECTION 2: ANAESTHESIA INSTRUCTIONS -->
          <div class="sec-title">Post Operative Anaesthesia Instructions</div>
          <div class="instruction-block">
            <div>1. <span class="chk-box">${!printBlank && inst.monitorVitals ? '✓' : ''}</span> <strong>Monitor vitals</strong></div>
            <div style="margin-left: 20px;">
              Post OP Vitals : PR <u>${printBlank ? '.........' : (inst.pr || '.....')}</u> / Min,&nbsp;&nbsp;
              BP <u>${printBlank ? '......... / .........' : (inst.bp || '...../.....')}</u> mm of Hg,&nbsp;&nbsp;
              SpO2 <u>${printBlank ? '.........' : (inst.spo2 || '.....')}</u> % on <u>${printBlank ? '.........' : (inst.o2Mode || 'room air')}</u>,&nbsp;&nbsp;
              RR <u>${printBlank ? '.........' : (inst.rr || '.....')}</u> / min.
            </div>
            <div style="margin-top: 6px;">2. <strong>O2:</strong> 
              <span class="chk-box">${!printBlank && inst.o2Mode === 'Not required' ? '✓' : ''}</span> Not required &nbsp;&nbsp;
              <span class="chk-box">${!printBlank && inst.o2Mode === 'Nasal' ? '✓' : ''}</span> Nasal &nbsp;&nbsp;
              <span class="chk-box">${!printBlank && inst.o2Mode === 'Mask' ? '✓' : ''}</span> Mask
            </div>
            <div style="margin-top: 6px;">3. <span class="chk-box">${!printBlank && inst.ivLinesFlushed ? '✓' : ''}</span> <strong>IV Cannula / lines flushed</strong></div>
            <div style="margin-top: 6px;">4. <strong>Analgesia in recovery:</strong> <u>${printBlank ? '................................................................................................' : (inst.analgesiaInRecovery || '................................')}</u></div>
            <div style="margin-top: 6px;">5. <span class="chk-box">${!printBlank && inst.postOpAnalgesiaInDrugChart ? '✓' : ''}</span> <strong>Post of Analgesia & Antiemesis Prescribed in Drug chart</strong></div>
            <div style="margin-top: 6px;">6. <strong>Others:</strong> <u>${printBlank ? '................................................................................................' : (inst.otherInstructions || '................................')}</u></div>
          </div>

          <!-- SECTION 3: ALDRETE SCORE MATRIX -->
          <div style="font-weight: bold; font-size: 13px; margin-top: 10px;">Aldrete Score :</div>
          <table class="aldrete-table">
            <thead>
              <tr>
                <th style="width:30px;"></th>
                <th>Activity</th>
                <th>Respiration</th>
                <th>Circulation</th>
                <th>Consciousness</th>
                <th>Oxygen Saturation</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="score-head">2</td>
                <td>2. Moves all extremities voluntarily / on command ${!printBlank && inst.activityScore === 2 ? '<strong>(✓)</strong>' : ''}</td>
                <td>2. Breaths deeply and coughs freely ${!printBlank && inst.respirationScore === 2 ? '<strong>(✓)</strong>' : ''}</td>
                <td>2. BP ± 200mm or preanesthetic level ${!printBlank && inst.circulationScore === 2 ? '<strong>(✓)</strong>' : ''}</td>
                <td>2. Fully awake ${!printBlank && inst.consciousnessScore === 2 ? '<strong>(✓)</strong>' : ''}</td>
                <td>2. SpO2 > 92% on room air ${!printBlank && inst.spo2Score === 2 ? '<strong>(✓)</strong>' : ''}</td>
              </tr>
              <tr>
                <td class="score-head">1</td>
                <td>1. Moves 2 Extremities ${!printBlank && inst.activityScore === 1 ? '<strong>(✓)</strong>' : ''}</td>
                <td>1. Dyspneic, shallow or limited breathing ${!printBlank && inst.respirationScore === 1 ? '<strong>(✓)</strong>' : ''}</td>
                <td>1. BP ± 20-50 mm of preanesthetic level ${!printBlank && inst.circulationScore === 1 ? '<strong>(✓)</strong>' : ''}</td>
                <td>1. Arousable on calling ${!printBlank && inst.consciousnessScore === 1 ? '<strong>(✓)</strong>' : ''}</td>
                <td>1. Supplemental O2 required to maintain SpO2 > 90% ${!printBlank && inst.spo2Score === 1 ? '<strong>(✓)</strong>' : ''}</td>
              </tr>
              <tr>
                <td class="score-head">0</td>
                <td>0. Unable to move extremities ${!printBlank && inst.activityScore === 0 ? '<strong>(✓)</strong>' : ''}</td>
                <td>0. Apneic ${!printBlank && inst.respirationScore === 0 ? '<strong>(✓)</strong>' : ''}</td>
                <td>0. BP ± 50 mm of preanesthetic level ${!printBlank && inst.circulationScore === 0 ? '<strong>(✓)</strong>' : ''}</td>
                <td>0. Not responding ${!printBlank && inst.consciousnessScore === 0 ? '<strong>(✓)</strong>' : ''}</td>
                <td>0. SpO2 < 92% with O2 Supplementation ${!printBlank && inst.spo2Score === 0 ? '<strong>(✓)</strong>' : ''}</td>
              </tr>
            </tbody>
          </table>

          <div style="margin: 10px 0; font-size: 11px;">
            <span class="chk-box">${!printBlank && inst.shiftedTo === 'Shifted to ward' ? '✓' : ''}</span> <strong>Shifted to ward</strong> &nbsp;&nbsp;&nbsp;&nbsp;
            <span class="chk-box">${!printBlank && inst.shiftedTo === 'Shifted to ICU' ? '✓' : ''}</span> <strong>Shifted to ICU</strong> &nbsp;&nbsp;&nbsp;&nbsp;
            <span class="chk-box">${!printBlank && inst.shiftedTo === 'Shifted to ward if >= 9' ? '✓' : ''}</span> <strong>Shifted to ward if ≥ 9</strong>
            ${!printBlank ? `<span style="float:right; font-weight:bold; font-size:12px;">Total Aldrete Score: ${totalAldreteScore} / 10</span>` : ''}
          </div>

          <div class="sig-row" style="margin-top: 25px;">
            <div>Date & Time: <u>${printBlank ? '................................................' : inst.anaesthesiaDateTime}</u></div>
            <div>Name & Signature: <u>${printBlank ? '................................................' : inst.anaesthetistSignature}</u></div>
          </div>

          <div style="text-align:center; font-size:9px; margin-top: 15px; color:#555;">Form 14 - Post Operative Clinical & Anaesthesia Recovery Protocol</div>
        </body>
      </html>
    `;
    printHTML(htmlContent);
  };

  return (
    <div className="w-full bg-slate-50 min-h-screen p-4 md:p-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 md:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 shrink-0">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Post Operative Care & Recovery Station</h2>
              <Badge className="bg-teal-100 text-teal-800 border-teal-200 font-extrabold text-[10px]">
                MANUAL & DIGITAL
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Maintain Post-Op Checklists, Surgical Instructions & Aldrete PACU Scores for {patient?.name || record?.patientName || 'Patient'}.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X className="w-5 h-5 text-slate-400" />
            </Button>
          )}
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs">
          <TabsList className="bg-slate-100 p-1 rounded-xl">
            <TabsTrigger value="checklist" className="text-xs font-bold gap-2 px-4 py-2">
              <ClipboardCheck className="w-4 h-4 text-emerald-600" />
              1. Post Operative Check List (20 Items)
            </TabsTrigger>
            <TabsTrigger value="instructions" className="text-xs font-bold gap-2 px-4 py-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              2. Post Operative Surgical Instructions
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 px-2">
            {activeTab === 'checklist' ? (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => printChecklist(true)}
                  className="gap-1.5 text-xs font-bold text-slate-700 border-slate-300 hover:bg-slate-100"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  Print Blank Form
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => printChecklist(false)}
                  className="gap-1.5 text-xs font-bold text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-600" />
                  Print Filled Form
                </Button>
                <Button 
                  size="sm" 
                  onClick={saveChecklist}
                  className="gap-1.5 text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Check List
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => printInstructions(true)}
                  className="gap-1.5 text-xs font-bold text-slate-700 border-slate-300 hover:bg-slate-100"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  Print Blank Instructions
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => printInstructions(false)}
                  className="gap-1.5 text-xs font-bold text-indigo-700 border-indigo-300 bg-indigo-50 hover:bg-indigo-100"
                >
                  <Printer className="w-3.5 h-3.5 text-indigo-600" />
                  Print Filled Form
                </Button>
                <Button 
                  size="sm" 
                  onClick={saveInstructions}
                  className="gap-1.5 text-xs font-bold bg-indigo-700 hover:bg-indigo-800 text-white"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Instructions
                </Button>
              </>
            )}
          </div>
        </div>

        {/* TAB 1: POST OPERATIVE CHECK LIST */}
        <TabsContent value="checklist" className="mt-4 space-y-6">
          {/* Header & Hospital Information */}
          <Card className="border-slate-200/80 shadow-xs">
            <CardHeader className="bg-slate-900 text-white rounded-t-xl p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-teal-400">Hospital Ledger Record • Form 15</div>
                  <CardTitle className="text-xl font-black text-white mt-0.5">Post Operative Check List</CardTitle>
                  <CardDescription className="text-xs text-slate-300">
                    Verify post-surgery patient transfer protocols, wound monitoring, drains, and nursing handovers.
                  </CardDescription>
                </div>
                <div className="text-right text-xs text-slate-300 space-y-0.5">
                  <p className="font-bold text-white">GastroPlus Hospital</p>
                  <p className="text-[11px] text-slate-400">Reg No: {checklist.regNo}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                <div className="space-y-1">
                  <Label className="text-slate-500 text-[11px]">Patient Name</Label>
                  <Input 
                    value={checklist.patientName} 
                    onChange={e => setChecklist({...checklist, patientName: e.target.value})}
                    className="h-9 text-xs font-bold" 
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-500 text-[11px]">Date of Birth (DOB)</Label>
                  <Input 
                    value={checklist.dob} 
                    onChange={e => setChecklist({...checklist, dob: e.target.value})}
                    placeholder="DD/MM/YYYY"
                    className="h-9 text-xs" 
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-500 text-[11px]">Age / Sex</Label>
                  <Input 
                    value={checklist.ageSex} 
                    onChange={e => setChecklist({...checklist, ageSex: e.target.value})}
                    className="h-9 text-xs" 
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-500 text-[11px]">ID No. / MRN</Label>
                  <Input 
                    value={checklist.idNo} 
                    onChange={e => setChecklist({...checklist, idNo: e.target.value})}
                    className="h-9 text-xs font-mono font-bold" 
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-500 text-[11px]">Ward</Label>
                  <Input 
                    value={checklist.ward} 
                    onChange={e => setChecklist({...checklist, ward: e.target.value})}
                    className="h-9 text-xs" 
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-500 text-[11px]">Bed No.</Label>
                  <Input 
                    value={checklist.bedNo} 
                    onChange={e => setChecklist({...checklist, bedNo: e.target.value})}
                    className="h-9 text-xs" 
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-500 text-[11px]">Category</Label>
                  <Input 
                    value={checklist.category} 
                    onChange={e => setChecklist({...checklist, category: e.target.value})}
                    className="h-9 text-xs" 
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-500 text-[11px]">Date</Label>
                  <Input 
                    type="date"
                    value={checklist.date} 
                    onChange={e => setChecklist({...checklist, date: e.target.value})}
                    className="h-9 text-xs font-semibold" 
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-slate-500 text-[11px]">Diagnosis</Label>
                  <Input 
                    value={checklist.diagnosis} 
                    onChange={e => setChecklist({...checklist, diagnosis: e.target.value})}
                    className="h-9 text-xs" 
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-slate-500 text-[11px]">Surgery Executed</Label>
                  <Input 
                    value={checklist.surgery} 
                    onChange={e => setChecklist({...checklist, surgery: e.target.value})}
                    className="h-9 text-xs font-semibold text-teal-800" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table of 20 Checklist Items */}
          <Card className="border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-slate-800 text-sm">Interactive 20-Point Nursing Checklist</h3>
              </div>
              <p className="text-xs text-slate-500 font-medium">Click Yes/No toggles or enter specific clinical remarks per item.</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-white uppercase text-[10px] tracking-wider">
                    <th className="p-3 text-center w-12 border-r border-slate-700">No</th>
                    <th className="p-3 border-r border-slate-700">Post-Operative Item</th>
                    <th className="p-3 text-center w-20 border-r border-slate-700">Yes</th>
                    <th className="p-3 text-center w-20 border-r border-slate-700">No</th>
                    <th className="p-3">Clinical Remark / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {checklist.items.map((it, idx) => (
                    <tr key={it.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-center font-black text-slate-700 border-r border-slate-200 bg-slate-50/50">
                        {it.id}
                      </td>
                      <td className="p-3 font-medium text-slate-800 border-r border-slate-200">
                        {it.isCustom ? (
                          <Input 
                            value={it.item} 
                            onChange={e => handleCustomItemTextChange(idx, e.target.value)}
                            placeholder={`Manual item #${it.id}`}
                            className="h-8 text-xs font-medium bg-amber-50/50 border-amber-200"
                          />
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span>{it.item}</span>
                            {it.id === 16 && (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[11px] text-slate-400 font-bold">Relative Name:</span>
                                <Input 
                                  value={checklist.relativeName || ''} 
                                  onChange={e => setChecklist({...checklist, relativeName: e.target.value})}
                                  placeholder="Enter Relative Name"
                                  className="h-7 text-xs w-60"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-2 text-center border-r border-slate-200">
                        <Button
                          type="button"
                          variant={it.yes ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleChecklistToggle(idx, 'yes')}
                          className={`h-7 w-12 text-xs font-extrabold ${it.yes ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'text-slate-600'}`}
                        >
                          Yes
                        </Button>
                      </td>
                      <td className="p-2 text-center border-r border-slate-200">
                        <Button
                          type="button"
                          variant={it.no ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleChecklistToggle(idx, 'no')}
                          className={`h-7 w-12 text-xs font-extrabold ${it.no ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'text-slate-600'}`}
                        >
                          No
                        </Button>
                      </td>
                      <td className="p-2">
                        <Input 
                          value={it.remark} 
                          onChange={e => handleRemarkChange(idx, e.target.value)}
                          placeholder="Add remark..."
                          className="h-8 text-xs bg-slate-50/50"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Footer Handover Section */}
          <Card className="border-slate-200/80 shadow-xs">
            <CardHeader className="bg-slate-50 border-b border-slate-200 p-4">
              <CardTitle className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-teal-600" />
                Handover & Transfer Verification Signatures
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white">
              {/* Left Handover Box */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <Badge className="bg-slate-200 text-slate-800 border-none font-bold text-[10px]">
                  PATIENT HANDED OVER BY
                </Badge>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-600">Operation Theatre Nurse Name</Label>
                  <Input 
                    value={checklist.handedOverByNurse} 
                    onChange={e => setChecklist({...checklist, handedOverByNurse: e.target.value})}
                    className="h-9 text-xs font-semibold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-600">Date and Time</Label>
                  <Input 
                    value={checklist.handedOverDateTime} 
                    onChange={e => setChecklist({...checklist, handedOverDateTime: e.target.value})}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Right Receiver Box */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <Badge className="bg-teal-100 text-teal-900 border-none font-bold text-[10px]">
                  PATIENT RECEIVED BY ICU / CCU / WARD
                </Badge>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-600">Ward / ICU Nurse Name</Label>
                  <Input 
                    value={checklist.receivedByNurse} 
                    onChange={e => setChecklist({...checklist, receivedByNurse: e.target.value})}
                    className="h-9 text-xs font-semibold"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-600">Doctor Signature / Name</Label>
                    <Input 
                      value={checklist.doctorSign} 
                      onChange={e => setChecklist({...checklist, doctorSign: e.target.value})}
                      className="h-9 text-xs font-semibold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-600">Date and Time</Label>
                    <Input 
                      value={checklist.receivedDateTime} 
                      onChange={e => setChecklist({...checklist, receivedDateTime: e.target.value})}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: POST OPERATIVE SURGICAL & ANAESTHESIA INSTRUCTIONS */}
        <TabsContent value="instructions" className="mt-4 space-y-6">
          {/* Section 1: Post Operative Surgical Instructions */}
          <Card className="border-slate-200/80 shadow-xs">
            <CardHeader className="bg-indigo-950 text-white rounded-t-xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <Badge className="bg-indigo-800 text-indigo-200 border-indigo-700 uppercase text-[9px] font-extrabold mb-1">
                    SURGICAL CARE PROTOCOL
                  </Badge>
                  <CardTitle className="text-xl font-black text-white">Post Operative Surgical Instructions</CardTitle>
                  <CardDescription className="text-xs text-slate-300">
                    Specific dietary, binder, IV fluid, and physical mobilization guidelines for surgical ward nurses.
                  </CardDescription>
                </div>
                <Stethoscope className="w-8 h-8 text-indigo-300 opacity-80" />
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">NBM (Nil By Mouth) Duration</Label>
                  <Input 
                    value={instructions.nbmDuration} 
                    onChange={e => setInstructions({...instructions, nbmDuration: e.target.value})}
                    placeholder="e.g. Till further orders / for 6 hrs"
                    className="h-9 text-xs font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Mobilization Instructions</Label>
                  <Input 
                    value={instructions.mobilization} 
                    onChange={e => setInstructions({...instructions, mobilization: e.target.value})}
                    placeholder="e.g. Bed rest till 8 PM, then gentle ambulation"
                    className="h-9 text-xs font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Abdominal / Chest Binder</Label>
                  <Select 
                    value={instructions.binderRequired}
                    onValueChange={v => setInstructions({...instructions, binderRequired: v as any})}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select requirement" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Required" className="text-xs font-bold text-emerald-700">Required (Apply Binder)</SelectItem>
                      <SelectItem value="Not Required" className="text-xs text-slate-600">Not Required</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Diet Pathway</Label>
                  <Input 
                    value={instructions.diet} 
                    onChange={e => setInstructions({...instructions, diet: e.target.value})}
                    placeholder="e.g. Sips of water after 6 hours, then soft liquid diet"
                    className="h-9 text-xs font-medium"
                  />
                </div>

                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs font-bold text-slate-700">IV Fluids Prescription & Infusion Rate</Label>
                  <Input 
                    value={instructions.ivFluids} 
                    onChange={e => setInstructions({...instructions, ivFluids: e.target.value})}
                    placeholder="e.g. NS 1000ml + RL 1000ml @ 75 ml/hr"
                    className="h-9 text-xs font-medium"
                  />
                </div>

                {/* Dedicated Column / Section: Advise for Injectable Medication */}
                <div className="space-y-2 col-span-2 bg-indigo-50/50 border border-indigo-100 p-3.5 rounded-xl">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-black text-indigo-950 uppercase tracking-wide flex items-center gap-1.5">
                      <Pill className="w-4 h-4 text-indigo-600" />
                      Advise for Injectable Medication (Easy Quick Selection)
                    </Label>
                    <span className="text-[10px] text-indigo-700 font-semibold">Click badge below to add/remove injectable</span>
                  </div>

                  {/* Quick Select Badges */}
                  <div className="flex flex-wrap gap-1.5 py-1">
                    {[
                      'Inj. Pantoprazole 40mg IV BD',
                      'Inj. Ondansetron 4mg IV TDS SOS',
                      'Inj. Paracetamol 1g IV Piggyback BD',
                      'Inj. Ceftriaxone 1g IV BD',
                      'Inj. Tramadol 50mg IV SOS',
                      'Inj. Metronidazole 500mg IV TDS',
                      'Inj. Diclofenac AQ 75mg IM BD',
                      'Inj. Piperacillin-Tazobactam 4.5g IV TDS',
                      'Inj. Meropenem 1g IV TDS',
                      'Inj. Tranexamic Acid 500mg IV TDS',
                      'Inj. Hydrocortisone 100mg IV STAT',
                      'Inj. Vitamin K 10mg IV OD'
                    ].map((med) => {
                      const isSelected = (instructions.injectableMedication || '').includes(med);
                      return (
                        <button
                          type="button"
                          key={med}
                          onClick={() => {
                            const current = instructions.injectableMedication || '';
                            if (current.includes(med)) {
                              const updated = current.split('\n').filter(line => line.trim() !== med.trim()).join('\n');
                              setInstructions({ ...instructions, injectableMedication: updated });
                            } else {
                              const updated = current ? `${current}\n${med}` : med;
                              setInstructions({ ...instructions, injectableMedication: updated });
                            }
                          }}
                          className={cn(
                            "text-[10.5px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1",
                            isSelected
                              ? "bg-indigo-600 text-white border-indigo-700 shadow-xs"
                              : "bg-white text-indigo-900 border-indigo-200 hover:bg-indigo-100/60"
                          )}
                        >
                          {isSelected ? <Check className="w-3 h-3 text-white" /> : <Plus className="w-3 h-3 text-indigo-500" />}
                          {med}
                        </button>
                      );
                    })}
                  </div>

                  <Textarea 
                    rows={3}
                    value={instructions.injectableMedication || ''} 
                    onChange={e => setInstructions({...instructions, injectableMedication: e.target.value})}
                    placeholder="Selected injectable medications or type custom advice (one per line)..."
                    className="bg-white text-xs font-semibold text-slate-800 leading-relaxed"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Surgical Date & Time</Label>
                  <Input 
                    value={instructions.surgicalDateTime} 
                    onChange={e => setInstructions({...instructions, surgicalDateTime: e.target.value})}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Surgeon Name & Signature</Label>
                  <Input 
                    value={instructions.surgeonSignature} 
                    onChange={e => setInstructions({...instructions, surgeonSignature: e.target.value})}
                    className="h-9 text-xs font-bold"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Post Operative Anaesthesia Instructions */}
          <Card className="border-slate-200/80 shadow-xs">
            <CardHeader className="bg-slate-900 text-white rounded-t-xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <Badge className="bg-teal-800 text-teal-200 border-teal-700 uppercase text-[9px] font-extrabold mb-1">
                    ANAESTHESIA RECOVERY PATHWAY
                  </Badge>
                  <CardTitle className="text-xl font-black text-white">Post Operative Anaesthesia Instructions</CardTitle>
                  <CardDescription className="text-xs text-slate-300">
                    Vital monitoring frequencies, oxygen delivery setups, recovery analgesia, and antiemesis logs.
                  </CardDescription>
                </div>
                <Activity className="w-8 h-8 text-teal-400 opacity-80" />
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4 bg-white">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center gap-3">
                  <Checkbox 
                    id="mon-vitals"
                    checked={instructions.monitorVitals}
                    onCheckedChange={c => setInstructions({...instructions, monitorVitals: !!c})}
                  />
                  <Label htmlFor="mon-vitals" className="text-xs font-black text-slate-800 cursor-pointer">
                    1. Monitor Vitals (Check to enable post-op vitals tracking)
                  </Label>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-500">PR (Pulse Rate)</Label>
                    <div className="flex items-center gap-1">
                      <Input 
                        value={instructions.pr} 
                        onChange={e => setInstructions({...instructions, pr: e.target.value})}
                        className="h-8 text-xs font-bold" 
                      />
                      <span className="text-[10px] text-slate-400">/Min</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-500">BP (Blood Pressure)</Label>
                    <div className="flex items-center gap-1">
                      <Input 
                        value={instructions.bp} 
                        onChange={e => setInstructions({...instructions, bp: e.target.value})}
                        className="h-8 text-xs font-bold" 
                      />
                      <span className="text-[10px] text-slate-400">mmHg</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-500">SpO2 (%)</Label>
                    <div className="flex items-center gap-1">
                      <Input 
                        value={instructions.spo2} 
                        onChange={e => setInstructions({...instructions, spo2: e.target.value})}
                        className="h-8 text-xs font-bold" 
                      />
                      <span className="text-[10px] text-slate-400">%</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-500">RR (Respiratory Rate)</Label>
                    <div className="flex items-center gap-1">
                      <Input 
                        value={instructions.rr} 
                        onChange={e => setInstructions({...instructions, rr: e.target.value})}
                        className="h-8 text-xs font-bold" 
                      />
                      <span className="text-[10px] text-slate-400">/min</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700">2. Oxygen Delivery Setup (O2)</Label>
                  <Select 
                    value={instructions.o2Mode}
                    onValueChange={v => setInstructions({...instructions, o2Mode: v as any})}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select O2 mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Not required" className="text-xs">Not Required (Room Air)</SelectItem>
                      <SelectItem value="Nasal" className="text-xs font-bold text-teal-700">Nasal Cannula (2-4 L/min)</SelectItem>
                      <SelectItem value="Mask" className="text-xs font-bold text-indigo-700">Oxygen Mask (5-8 L/min)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 mt-5">
                  <Checkbox 
                    id="iv-flushed"
                    checked={instructions.ivLinesFlushed}
                    onCheckedChange={c => setInstructions({...instructions, ivLinesFlushed: !!c})}
                  />
                  <Label htmlFor="iv-flushed" className="text-xs font-bold text-slate-800 cursor-pointer">
                    3. IV Cannula & Invasive Lines Flushed & Patented
                  </Label>
                </div>

                <div className="space-y-1.5 col-span-2">
                  <Label className="font-bold text-slate-700">4. Analgesia in Recovery</Label>
                  <Input 
                    value={instructions.analgesiaInRecovery} 
                    onChange={e => setInstructions({...instructions, analgesiaInRecovery: e.target.value})}
                    placeholder="Analgesic medication administered in PACU"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 col-span-2">
                  <Checkbox 
                    id="post-analgesia-chart"
                    checked={instructions.postOpAnalgesiaInDrugChart}
                    onCheckedChange={c => setInstructions({...instructions, postOpAnalgesiaInDrugChart: !!c})}
                  />
                  <Label htmlFor="post-analgesia-chart" className="text-xs font-bold text-slate-800 cursor-pointer">
                    5. Post-Op Analgesia & Antiemesis Prescribed in Patient Drug Chart
                  </Label>
                </div>

                <div className="space-y-1.5 col-span-2">
                  <Label className="font-bold text-slate-700">6. Other Special Anaesthesia Instructions</Label>
                  <Input 
                    value={instructions.otherInstructions} 
                    onChange={e => setInstructions({...instructions, otherInstructions: e.target.value})}
                    placeholder="Additional clinical remarks..."
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Aldrete Score Matrix */}
          <Card className="border-slate-200/80 shadow-xs">
            <CardHeader className="bg-slate-100 border-b border-slate-200 p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <Badge className="bg-teal-100 text-teal-800 border-teal-200 uppercase text-[9px] font-extrabold mb-1">
                    PACU DISCHARGE AUDIT
                  </Badge>
                  <CardTitle className="text-lg font-black text-slate-800">Aldrete Post-Anesthesia Recovery Score</CardTitle>
                </div>
                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-xs font-bold text-slate-600">Total Score:</span>
                  <span className={`text-xl font-black ${totalAldreteScore >= 9 ? 'text-emerald-600' : totalAldreteScore >= 7 ? 'text-amber-600' : 'text-rose-600'}`}>
                    {totalAldreteScore} / 10
                  </span>
                  <Badge className={`text-[10px] font-extrabold ${totalAldreteScore >= 9 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {totalAldreteScore >= 9 ? 'Safe for Ward' : 'PACU Observation'}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-5 bg-white">
              {/* Interactive Scoring Matrix Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white uppercase text-[10px]">
                      <th className="p-3 text-center w-12 border-r border-slate-700">Score</th>
                      <th className="p-3 border-r border-slate-700">Activity</th>
                      <th className="p-3 border-r border-slate-700">Respiration</th>
                      <th className="p-3 border-r border-slate-700">Circulation</th>
                      <th className="p-3 border-r border-slate-700">Consciousness</th>
                      <th className="p-3">Oxygen Saturation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {/* Score 2 Row */}
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 text-center font-black text-emerald-700 bg-emerald-50/50 border-r border-slate-200">2</td>
                      <td 
                        onClick={() => setInstructions({...instructions, activityScore: 2})}
                        className={`p-3 border-r border-slate-200 cursor-pointer transition-colors ${instructions.activityScore === 2 ? 'bg-emerald-100/70 font-bold border-l-4 border-l-emerald-600' : ''}`}
                      >
                        Moves all 4 extremities voluntarily / on command
                      </td>
                      <td 
                        onClick={() => setInstructions({...instructions, respirationScore: 2})}
                        className={`p-3 border-r border-slate-200 cursor-pointer transition-colors ${instructions.respirationScore === 2 ? 'bg-emerald-100/70 font-bold border-l-4 border-l-emerald-600' : ''}`}
                      >
                        Breathes deeply and coughs freely
                      </td>
                      <td 
                        onClick={() => setInstructions({...instructions, circulationScore: 2})}
                        className={`p-3 border-r border-slate-200 cursor-pointer transition-colors ${instructions.circulationScore === 2 ? 'bg-emerald-100/70 font-bold border-l-4 border-l-emerald-600' : ''}`}
                      >
                        BP ± 20mm of preanesthetic level
                      </td>
                      <td 
                        onClick={() => setInstructions({...instructions, consciousnessScore: 2})}
                        className={`p-3 border-r border-slate-200 cursor-pointer transition-colors ${instructions.consciousnessScore === 2 ? 'bg-emerald-100/70 font-bold border-l-4 border-l-emerald-600' : ''}`}
                      >
                        Fully awake
                      </td>
                      <td 
                        onClick={() => setInstructions({...instructions, spo2Score: 2})}
                        className={`p-3 cursor-pointer transition-colors ${instructions.spo2Score === 2 ? 'bg-emerald-100/70 font-bold border-l-4 border-l-emerald-600' : ''}`}
                      >
                        SpO2 &gt; 92% on room air
                      </td>
                    </tr>

                    {/* Score 1 Row */}
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 text-center font-black text-amber-700 bg-amber-50/50 border-r border-slate-200">1</td>
                      <td 
                        onClick={() => setInstructions({...instructions, activityScore: 1})}
                        className={`p-3 border-r border-slate-200 cursor-pointer transition-colors ${instructions.activityScore === 1 ? 'bg-amber-100/70 font-bold border-l-4 border-l-amber-600' : ''}`}
                      >
                        Moves 2 extremities
                      </td>
                      <td 
                        onClick={() => setInstructions({...instructions, respirationScore: 1})}
                        className={`p-3 border-r border-slate-200 cursor-pointer transition-colors ${instructions.respirationScore === 1 ? 'bg-amber-100/70 font-bold border-l-4 border-l-amber-600' : ''}`}
                      >
                        Dyspneic, shallow or limited breathing
                      </td>
                      <td 
                        onClick={() => setInstructions({...instructions, circulationScore: 1})}
                        className={`p-3 border-r border-slate-200 cursor-pointer transition-colors ${instructions.circulationScore === 1 ? 'bg-amber-100/70 font-bold border-l-4 border-l-amber-600' : ''}`}
                      >
                        BP ± 20-50 mm of preanesthetic level
                      </td>
                      <td 
                        onClick={() => setInstructions({...instructions, consciousnessScore: 1})}
                        className={`p-3 border-r border-slate-200 cursor-pointer transition-colors ${instructions.consciousnessScore === 1 ? 'bg-amber-100/70 font-bold border-l-4 border-l-amber-600' : ''}`}
                      >
                        Arousable on calling
                      </td>
                      <td 
                        onClick={() => setInstructions({...instructions, spo2Score: 1})}
                        className={`p-3 cursor-pointer transition-colors ${instructions.spo2Score === 1 ? 'bg-amber-100/70 font-bold border-l-4 border-l-amber-600' : ''}`}
                      >
                        Supplemental O2 required to maintain SpO2 &gt; 90%
                      </td>
                    </tr>

                    {/* Score 0 Row */}
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 text-center font-black text-rose-700 bg-rose-50/50 border-r border-slate-200">0</td>
                      <td 
                        onClick={() => setInstructions({...instructions, activityScore: 0})}
                        className={`p-3 border-r border-slate-200 cursor-pointer transition-colors ${instructions.activityScore === 0 ? 'bg-rose-100/70 font-bold border-l-4 border-l-rose-600' : ''}`}
                      >
                        Unable to move extremities
                      </td>
                      <td 
                        onClick={() => setInstructions({...instructions, respirationScore: 0})}
                        className={`p-3 border-r border-slate-200 cursor-pointer transition-colors ${instructions.respirationScore === 0 ? 'bg-rose-100/70 font-bold border-l-4 border-l-rose-600' : ''}`}
                      >
                        Apneic
                      </td>
                      <td 
                        onClick={() => setInstructions({...instructions, circulationScore: 0})}
                        className={`p-3 border-r border-slate-200 cursor-pointer transition-colors ${instructions.circulationScore === 0 ? 'bg-rose-100/70 font-bold border-l-4 border-l-rose-600' : ''}`}
                      >
                        BP ± 50 mm of preanesthetic level
                      </td>
                      <td 
                        onClick={() => setInstructions({...instructions, consciousnessScore: 0})}
                        className={`p-3 border-r border-slate-200 cursor-pointer transition-colors ${instructions.consciousnessScore === 0 ? 'bg-rose-100/70 font-bold border-l-4 border-l-rose-600' : ''}`}
                      >
                        Not responding
                      </td>
                      <td 
                        onClick={() => setInstructions({...instructions, spo2Score: 0})}
                        className={`p-3 cursor-pointer transition-colors ${instructions.spo2Score === 0 ? 'bg-rose-100/70 font-bold border-l-4 border-l-rose-600' : ''}`}
                      >
                        SpO2 &lt; 92% with O2 Supplementation
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Shift Destination Checkboxes */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-800">
                    <input 
                      type="radio" 
                      name="shiftedTo" 
                      checked={instructions.shiftedTo === 'Shifted to ward'}
                      onChange={() => setInstructions({...instructions, shiftedTo: 'Shifted to ward'})}
                      className="accent-teal-700 h-4 w-4"
                    />
                    Shifted to Ward
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-800">
                    <input 
                      type="radio" 
                      name="shiftedTo" 
                      checked={instructions.shiftedTo === 'Shifted to ICU'}
                      onChange={() => setInstructions({...instructions, shiftedTo: 'Shifted to ICU'})}
                      className="accent-teal-700 h-4 w-4"
                    />
                    Shifted to ICU
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-800">
                    <input 
                      type="radio" 
                      name="shiftedTo" 
                      checked={instructions.shiftedTo === 'Shifted to ward if >= 9'}
                      onChange={() => setInstructions({...instructions, shiftedTo: 'Shifted to ward if >= 9'})}
                      className="accent-teal-700 h-4 w-4"
                    />
                    Shifted to Ward if Score &ge; 9
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-500">Anaesthesia Date & Time</Label>
                    <Input 
                      value={instructions.anaesthesiaDateTime} 
                      onChange={e => setInstructions({...instructions, anaesthesiaDateTime: e.target.value})}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-500">Anaesthetist Signature</Label>
                    <Input 
                      value={instructions.anaesthetistSignature} 
                      onChange={e => setInstructions({...instructions, anaesthetistSignature: e.target.value})}
                      className="h-8 text-xs font-bold"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
