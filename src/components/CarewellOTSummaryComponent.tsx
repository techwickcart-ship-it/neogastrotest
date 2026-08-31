import React, { useState, useEffect } from 'react';
import { 
  Scissors, 
  FileText, 
  Printer, 
  Save, 
  User, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  Eye, 
  Trash2, 
  Edit, 
  Sparkles,
  ArrowLeft,
  Building,
  Check,
  Image as ImageIcon,
  Upload,
  Camera
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { CarewellOTSummaryForm } from '@/types';
import { getCarewellOTSummaries, saveCarewellOTSummary } from '@/services/supabaseService';
import PostOpForms from './PostOpForms';
import { printHTML } from '@/lib/printHelper';

const INITIAL_OT_SUMMARIES: CarewellOTSummaryForm[] = [
  {
    id: 'cwell-ot-1',
    patientId: 'P-101',
    patientName: 'PRIYANKA PARTE',
    idNo: 'ID-8821',
    regNo: 'NH/1871/MAY/2016',
    dob: '1992-05-14',
    gender: 'F',
    date: '2026-07-30',
    time: '10:30',
    preOpDiagnosis: 'Calculous Cholecystitis with Biliary Colic',
    postOpDiagnosis: 'Chronic Calculous Cholecystitis',
    operativeProcedureProposed: 'Laparoscopic Cholecystectomy',
    operativeProcedureExecuted: 'Laparoscopic Cholecystectomy with Abdominal Drainage',
    procedureType: 'Major',
    timeDuration: '1 Hr 15 Mins',
    caseType: 'Elective',
    surgeon: 'Dr. A. K. Sharma (MS, Surgery)',
    assist1Surgeon: 'Dr. Rahul Mehta',
    assist2Surgeon: 'Dr. Vikas Sen',
    anaesthetist: 'Dr. Sneha Kulkarni (MD, Anesthesia)',
    assist1Anaesthetist: 'Dr. Pooja Roy',
    assist2Anaesthetist: '',
    scrubNurse1: 'Nurse Deepika Roy',
    scrubNurse2: 'Nurse Sunita Patel',
    floorNurse: 'Nurse Anita Singh',
    position: 'Supine',
    positionOther: '',
    anaesthesiaType: 'GA',
    anaesthesiaOther: '',
    findings: 'Distended gallbladder with multiple small gallstones. Mild pericholecystic adhesions present. Cystic duct and artery double-clipped and divided safely.',
    skinPreparation: 'Povidone Iodine 10% & Spirit Solution',
    incision: 'Four-port Laparoscopic technique (10mm Umbilical, 10mm Epigastric, 5mm Subcostal x2)',
    procedureDetails: `1. Patient placed in Supine position under General Anaesthesia with endotracheal intubation.
2. Paint and drape done under strict aseptic precautions.
3. Infra-umbilical 10mm port inserted by open Hasson method, pneumoperitoneum established with CO2 at 12 mmHg.
4. Epigastric 10mm port and two 5mm working ports inserted under direct laparoscopic vision.
5. Gallbladder grasped at fundus and pushed cephalad to expose Calot's triangle.
6. Calot's triangle dissected cleanly; Cystic duct and Cystic artery identified and isolated.
7. Critical view of safety achieved. Cystic duct and artery double clipped with titanium clips and divided.
8. Gallbladder dissected off the hepatic bed using electrocautery. Hemostasis achieved on liver bed.
9. Gallbladder extracted through umbilical port in an endobag.
10. Sub-hepatic abdominal drain placed. Count of sponges, instruments, and gauze verified correct by Scrub Nurse 1.
11. Port sites closed in layers. Patient extubated smoothly and shifted to PACU in stable condition.`,
    savedAt: '2026-07-30T12:15:00.000Z',
    savedBy: 'Dr. A. K. Sharma'
  }
];

interface CarewellOTSummaryComponentProps {
  patientId?: string;
  patientName?: string;
  regNo?: string;
  operationRecordId?: string;
  onSaved?: () => void;
}

export default function CarewellOTSummaryComponent({
  patientId = '',
  patientName = '',
  regNo = 'NH/1871/MAY/2016',
  operationRecordId,
  onSaved
}: CarewellOTSummaryComponentProps) {
  const [summaries, setSummaries] = useState<CarewellOTSummaryForm[]>(() => {
    const saved = storage.get(STORAGE_KEYS.CAREWELL_OT_SUMMARY_FORMS, []);
    return saved.length > 0 ? saved : INITIAL_OT_SUMMARIES;
  });

  const [patients, setPatients] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [selectedForm, setSelectedForm] = useState<CarewellOTSummaryForm | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPostOpOpen, setIsPostOpOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState<CarewellOTSummaryForm>({
    id: `ot-sum-${Date.now()}`,
    patientId: patientId || 'P-101',
    patientName: patientName || 'PRIYANKA PARTE',
    idNo: 'ID-8821',
    regNo: regNo || 'NH/1871/MAY/2016',
    dob: '1992-05-14',
    gender: 'F',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' }),
    preOpDiagnosis: '',
    postOpDiagnosis: '',
    operativeProcedureProposed: '',
    operativeProcedureExecuted: '',
    procedureType: 'Major',
    timeDuration: '1 Hr 30 Mins',
    caseType: 'Elective',
    surgeon: 'Dr. A. K. Sharma',
    assist1Surgeon: 'Dr. Rahul Mehta',
    assist2Surgeon: '',
    anaesthetist: 'Dr. Sneha Kulkarni',
    assist1Anaesthetist: '',
    assist2Anaesthetist: '',
    scrubNurse1: 'Nurse Deepika Roy',
    scrubNurse2: '',
    floorNurse: 'Nurse Anita Singh',
    position: 'Supine',
    positionOther: '',
    anaesthesiaType: 'GA',
    anaesthesiaOther: '',
    findings: '',
    skinPreparation: 'Betadine 10% & Spirit Solution',
    incision: '',
    procedureDetails: '',
    savedAt: new Date().toISOString(),
    savedBy: 'Attending Surgeon'
  });

  useEffect(() => {
    const loadedPatients = storage.get(STORAGE_KEYS.PATIENTS, []);
    setPatients(loadedPatients);

    const loadAsyncSummaries = async () => {
      const data = await getCarewellOTSummaries();
      if (data && data.length > 0) {
        setSummaries(data);
      }
    };

    loadAsyncSummaries();

    if (patientId) {
      const p = loadedPatients.find((item: any) => item.id === patientId);
      if (p) {
        setFormData(prev => ({
          ...prev,
          patientId: p.id,
          patientName: p.name || prev.patientName,
          gender: p.gender || prev.gender,
          dob: p.dob || prev.dob,
          regNo: p.uhid || p.mrn || prev.regNo
        }));
      }
    }
  }, [patientId]);

  useEffect(() => {
    storage.set(STORAGE_KEYS.CAREWELL_OT_SUMMARY_FORMS, summaries);
  }, [summaries]);

  const handlePatientSelect = (pId: string) => {
    const p = patients.find(item => item.id === pId);
    if (p) {
      setFormData(prev => ({
        ...prev,
        patientId: p.id,
        patientName: p.name,
        gender: p.gender || 'F',
        dob: p.dob || '1990-01-01',
        regNo: p.uhid || p.mrn || 'NH/1871/MAY/2016'
      }));
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newPhoto = {
          id: `photo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          url: reader.result as string,
          caption: file.name.split('.')[0] || 'Intra-Operative Photo',
          uploadedAt: new Date().toISOString()
        };
        setFormData(prev => ({
          ...prev,
          clinicalPhotos: [...(prev.clinicalPhotos || []), newPhoto]
        }));
      };
      reader.readAsDataURL(file);
    });
    toast.success('Clinical photo(s) attached to OT summary');
  };

  const handleRemovePhoto = (photoId: string) => {
    setFormData(prev => ({
      ...prev,
      clinicalPhotos: (prev.clinicalPhotos || []).filter(p => p.id !== photoId)
    }));
  };

  const handleCaptionChange = (photoId: string, caption: string) => {
    setFormData(prev => ({
      ...prev,
      clinicalPhotos: (prev.clinicalPhotos || []).map(p => p.id === photoId ? { ...p, caption } : p)
    }));
  };

  const handleSave = async () => {
    if (!formData.patientName || !formData.operativeProcedureExecuted) {
      toast.error('Please fill patient name and procedure executed.');
      return;
    }

    const newForm = {
      ...formData,
      id: formData.id || `ot-sum-${Date.now()}`,
      savedAt: new Date().toISOString()
    };

    const saved = await saveCarewellOTSummary(newForm);

    const exists = summaries.findIndex(s => s.id === saved.id);
    let updated: CarewellOTSummaryForm[];
    if (exists >= 0) {
      updated = [...summaries];
      updated[exists] = saved;
    } else {
      updated = [saved, ...summaries];
    }

    setSummaries(updated);
    storage.set(STORAGE_KEYS.CAREWELL_OT_SUMMARY_FORMS, updated);
    toast.success('Operation Theatre Summary & Operative Notes saved successfully!');
    if (onSaved) onSaved();
  };

  const handleNewEntry = () => {
    setFormData({
      id: `ot-sum-${Date.now()}`,
      patientId: patientId || 'P-101',
      patientName: patientName || 'PRIYANKA PARTE',
      idNo: 'ID-8821',
      regNo: regNo || 'NH/1871/MAY/2016',
      dob: '1992-05-14',
      gender: 'F',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' }),
      preOpDiagnosis: '',
      postOpDiagnosis: '',
      operativeProcedureProposed: '',
      operativeProcedureExecuted: '',
      procedureType: 'Major',
      timeDuration: '1 Hr 30 Mins',
      caseType: 'Elective',
      surgeon: 'Dr. A. K. Sharma',
      assist1Surgeon: 'Dr. Rahul Mehta',
      assist2Surgeon: '',
      anaesthetist: 'Dr. Sneha Kulkarni',
      assist1Anaesthetist: '',
      assist2Anaesthetist: '',
      scrubNurse1: 'Nurse Deepika Roy',
      scrubNurse2: '',
      floorNurse: 'Nurse Anita Singh',
      position: 'Supine',
      positionOther: '',
      anaesthesiaType: 'GA',
      anaesthesiaOther: '',
      findings: '',
      skinPreparation: 'Betadine 10% & Spirit Solution',
      incision: '',
      procedureDetails: '',
      savedAt: new Date().toISOString(),
      savedBy: 'Attending Surgeon'
    });
    setActiveTab('create');
    toast.success('Started new blank OT summary form entry!');
  };

  const handlePrint = (recordToPrint: CarewellOTSummaryForm = formData) => {
    setSelectedForm(recordToPrint);
    const f = recordToPrint;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>OT Summary - ${f.patientName || 'Patient'}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            body { font-family: Arial, sans-serif; color: #000; margin: 0; padding: 0; font-size: 11px; line-height: 1.4; }
            .header-box { text-align: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 10px; }
            .h-title { font-size: 18px; font-weight: bold; text-transform: uppercase; }
            .sub-title { font-size: 10px; font-weight: bold; margin-top: 2px; }
            .form-title { font-size: 13px; font-weight: bold; background: #e5e7eb; text-align: center; border: 1px solid #000; padding: 4px; margin: 10px 0 6px 0; text-transform: uppercase; }
            .grid-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 11px; }
            .grid-table td { border: 1px solid #000; padding: 5px 6px; }
            .bold { font-weight: bold; }
            .bg-gray { background: #f3f4f6; }
            .notes-box { border: 1px solid #000; padding: 8px; font-size: 11px; line-height: 1.6; margin-top: 6px; }
            .sig-row { display: flex; justify-content: space-between; margin-top: 40px; font-size: 11px; font-weight: bold; }
            .photo-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 10px; }
            .photo-card { border: 1px solid #ccc; padding: 4px; text-align: center; }
            .photo-card img { max-width: 100%; max-height: 150px; object-fit: contain; }
          </style>
        </head>
        <body>
          <div class="header-box">
            <div class="h-title">GASTRO PLUS HOSPITAL</div>
            <div class="sub-title">Plot No. 7 & 8, Om Shiv Nagar, Gufa Mandir Road, Lal Ghati Bhopal, 462030, Madhya Pradesh | Ph.: 9109102145/9109101246</div>
          </div>

          <table class="grid-table">
            <tr>
              <td class="bold bg-gray" style="width:15%;">ID No.:</td>
              <td style="width:35%;">${f.idNo || ''}</td>
              <td class="bold bg-gray" style="width:15%;">Reg No.:</td>
              <td style="width:35%;">${f.regNo || ''}</td>
            </tr>
            <tr>
              <td class="bold bg-gray">Patient Name:</td>
              <td class="bold">${f.patientName || ''}</td>
              <td class="bold bg-gray">Date & Time:</td>
              <td>${f.date || ''} ${f.time || ''}</td>
            </tr>
            <tr>
              <td class="bold bg-gray">DOB / Gender:</td>
              <td>${f.dob || ''} (${f.gender || ''})</td>
              <td class="bold bg-gray">Case Type:</td>
              <td>${f.caseType || 'Elective'} (${f.procedureType || 'Major'})</td>
            </tr>
          </table>

          <div class="form-title">OPERATION THEATRE SUMMARY</div>

          <table class="grid-table">
            <tr>
              <td class="bold bg-gray" style="width:25%;">Pre-Operative Diagnosis:</td>
              <td colspan="3">${f.preOpDiagnosis || '-'}</td>
            </tr>
            <tr>
              <td class="bold bg-gray">Post-Operative Diagnosis:</td>
              <td colspan="3">${f.postOpDiagnosis || '-'}</td>
            </tr>
            <tr>
              <td class="bold bg-gray">Procedure Proposed:</td>
              <td colspan="3">${f.operativeProcedureProposed || '-'}</td>
            </tr>
            <tr>
              <td class="bold bg-gray">Procedure Executed:</td>
              <td colspan="3" class="bold">${f.operativeProcedureExecuted || '-'}</td>
            </tr>
            <tr>
              <td class="bold bg-gray">Duration:</td>
              <td>${f.timeDuration || ''}</td>
              <td class="bold bg-gray">Anaesthesia:</td>
              <td>${f.anaesthesiaType || ''} ${f.anaesthesiaOther ? `(${f.anaesthesiaOther})` : ''}</td>
            </tr>
            <tr>
              <td class="bold bg-gray">Surgeon:</td>
              <td>${f.surgeon || ''}</td>
              <td class="bold bg-gray">Assistants:</td>
              <td>${[f.assist1Surgeon, f.assist2Surgeon].filter(Boolean).join(', ') || '-'}</td>
            </tr>
            <tr>
              <td class="bold bg-gray">Anaesthetist:</td>
              <td>${f.anaesthetist || ''}</td>
              <td class="bold bg-gray">Anaesth. Assistants:</td>
              <td>${[f.assist1Anaesthetist, f.assist2Anaesthetist].filter(Boolean).join(', ') || '-'}</td>
            </tr>
            <tr>
              <td class="bold bg-gray">Scrub / Floor Nurses:</td>
              <td colspan="3">${[f.scrubNurse1, f.scrubNurse2, f.floorNurse ? `Floor: ${f.floorNurse}` : ''].filter(Boolean).join(' | ')}</td>
            </tr>
            <tr>
              <td class="bold bg-gray">Patient Position:</td>
              <td>${f.position || ''} ${f.positionOther ? `(${f.positionOther})` : ''}</td>
              <td class="bold bg-gray">Skin Prep & Incision:</td>
              <td>${f.skinPreparation || ''} ${f.incision ? `| Incision: ${f.incision}` : ''}</td>
            </tr>
            <tr>
              <td class="bold bg-gray">Operative Findings:</td>
              <td colspan="3">${f.findings || '-'}</td>
            </tr>
          </table>

          <div class="form-title">OPERATIVE NOTES & PROCEDURE DETAILS</div>
          <div class="notes-box">
            <pre style="white-space:pre-wrap; font-family:Arial, sans-serif; font-size:11px; margin:0;">${f.procedureDetails || 'No additional notes provided.'}</pre>
          </div>

          ${f.clinicalPhotos && f.clinicalPhotos.length > 0 ? `
            <div class="form-title">INTRA-OPERATIVE CLINICAL PHOTOS</div>
            <div class="photo-grid">
              ${f.clinicalPhotos.map(p => `
                <div class="photo-card">
                  <img src="${p.url}" alt="${p.caption}" />
                  <div style="font-size:10px; font-weight:bold; margin-top:4px;">${p.caption}</div>
                </div>
              `).join('')}
            </div>
          ` : ''}

          <div class="sig-row">
            <div style="text-align:center;">
              <div style="border-top:1px solid #000; padding-top:4px; width:180px;">Scrub / OT Nurse Signature</div>
            </div>
            <div style="text-align:center;">
              <div style="border-top:1px solid #000; padding-top:4px; width:180px;">Anaesthetist Signature</div>
            </div>
            <div style="text-align:center;">
              <div style="border-top:1px solid #000; padding-top:4px; width:180px;">Surgeon Signature (${f.surgeon})</div>
            </div>
          </div>
        </body>
      </html>
    `;
    printHTML(htmlContent);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 p-4 rounded-2xl text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/20 border border-blue-400/30 text-blue-300 rounded-xl shrink-0">
            <Scissors className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-base tracking-wide uppercase">
                Neo Gastroplus Hospital
              </h2>
              <Badge className="bg-blue-500/30 text-blue-200 border-blue-400/30 text-[10px] font-bold">
                OT SUMMARY & OPERATIVE NOTES FORM
              </Badge>
            </div>
            <p className="text-xs text-blue-100/80 mt-0.5">
              Official Operation Theatre Summary & Operative Procedure Record
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            size="sm"
            onClick={handleNewEntry}
            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs gap-1 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            New Entry
          </Button>

          <Button 
            variant={activeTab === 'create' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => {
              setActiveTab('create');
              toast.info(`Editing OT Summary for ${formData.patientName || 'Patient'}`);
            }}
            className="text-xs font-bold"
          >
            <Edit className="w-3.5 h-3.5 mr-1" /> Edit Entry
          </Button>

          <Button 
            variant={activeTab === 'history' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('history')}
            className="text-xs font-bold"
          >
            <FileText className="w-3.5 h-3.5 mr-1" /> Stored Summaries ({summaries.length})
          </Button>

          <Button 
            type="button"
            variant="outline"
            onClick={() => setIsPostOpOpen(true)}
            className="bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-extrabold text-xs gap-1.5 shadow-sm"
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            Post operative Surgical Instructions
          </Button>

          <Button 
            onClick={() => handlePrint()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs gap-1.5 shadow-md"
          >
            <Printer className="w-4 h-4" /> Print Form Sheet
          </Button>
        </div>
      </div>

      {activeTab === 'create' ? (
        <Card className="border border-slate-300 shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardContent className="p-6 space-y-6">
            
            {/* Form Paper Header Layout matching Image 1 */}
            <div className="border-2 border-slate-900 p-4 rounded-xl space-y-4 bg-slate-50/50 print:border-black">
              <div className="flex flex-col items-center justify-center text-center pb-3 border-b-2 border-slate-800">
                <div className="flex items-center gap-2 text-slate-900 font-black text-xl tracking-tight">
                  <Building className="w-6 h-6 text-blue-800" />
                  <span>GASTRO PLUS HOSPITAL</span>
                </div>
                <p className="text-xs text-slate-700 font-semibold mt-0.5">
                  Plot No. 7 & 8, Om Shiv Nagar, Gufa Mandir Road, Lal Ghati Bhopal, 462030, Madhya Pradesh | Ph.: 9109102145/9109101246
                </p>
                <div className="flex items-center justify-end w-full mt-2 text-xs font-bold text-slate-800">
                  <span className="uppercase text-blue-900 bg-blue-100 px-3 py-0.5 rounded-md border border-blue-300">
                    OPERATION THEATRE SUMMARY & OPERATIVE NOTES
                  </span>
                </div>
              </div>

              {/* Patient Basic Info Row */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                <div className="md:col-span-3">
                  <Label className="text-[10px] font-bold uppercase text-slate-700">Select Patient / Search</Label>
                  <Select value={formData.patientId} onValueChange={handlePatientSelect}>
                    <SelectTrigger className="h-8 text-xs font-bold"><SelectValue placeholder="Choose Patient" /></SelectTrigger>
                    <SelectContent>
                      {patients.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name} ({p.uhid || p.mrn})</SelectItem>
                      ))}
                      <SelectItem value="P-101">PRIYANKA PARTE (NH/1871/MAY/2016)</SelectItem>
                      <SelectItem value="P-102">ANUJ SINGHAI (MRN-88412)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <Label className="text-[10px] font-bold uppercase text-slate-700">ID No.</Label>
                  <Input 
                    value={formData.idNo || ''} 
                    onChange={e => setFormData({...formData, idNo: e.target.value})}
                    placeholder="e.g. ID-8821" 
                    className="h-8 text-xs font-bold" 
                  />
                </div>

                <div className="md:col-span-3">
                  <Label className="text-[10px] font-bold uppercase text-slate-700">Full Name (In CAPITAL)</Label>
                  <Input 
                    value={formData.patientName} 
                    onChange={e => setFormData({...formData, patientName: e.target.value.toUpperCase()})}
                    placeholder="FULL NAME" 
                    className="h-8 text-xs font-black tracking-wide text-blue-950 uppercase" 
                  />
                </div>

                <div className="md:col-span-1">
                  <Label className="text-[10px] font-bold uppercase text-slate-700">M / F</Label>
                  <Select value={formData.gender} onValueChange={v => setFormData({...formData, gender: v})}>
                    <SelectTrigger className="h-8 text-xs font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">M</SelectItem>
                      <SelectItem value="F">F</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-1">
                  <Label className="text-[10px] font-bold uppercase text-slate-700">Date</Label>
                  <Input 
                    type="date" 
                    value={formData.date} 
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className="h-8 text-xs" 
                  />
                </div>

                <div className="md:col-span-2">
                  <Label className="text-[10px] font-bold uppercase text-slate-700">Time (24 hr. clock)</Label>
                  <Input 
                    value={formData.time} 
                    onChange={e => setFormData({...formData, time: e.target.value})}
                    placeholder="10:30" 
                    className="h-8 text-xs font-bold" 
                  />
                </div>
              </div>

              {/* OT SUMMARY TABLE */}
              <div className="border border-slate-800 rounded-lg overflow-hidden mt-4">
                <div className="bg-slate-800 text-white font-extrabold text-xs uppercase px-3 py-1.5 text-center tracking-wider">
                  OPERATION THEATRE SUMMARY
                </div>

                <div className="divide-y divide-slate-300 text-xs bg-white">
                  
                  {/* Diagnosis Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-300">
                    <div className="p-2 space-y-1">
                      <Label className="font-bold text-slate-900 text-[11px]">Pre-Operative Diagnosis:</Label>
                      <Input 
                        value={formData.preOpDiagnosis} 
                        onChange={e => setFormData({...formData, preOpDiagnosis: e.target.value})}
                        placeholder="e.g. Acute Calculous Cholecystitis" 
                        className="h-8 text-xs" 
                      />
                    </div>
                    <div className="p-2 space-y-1">
                      <Label className="font-bold text-slate-900 text-[11px]">Post Operative Diagnosis:</Label>
                      <Input 
                        value={formData.postOpDiagnosis} 
                        onChange={e => setFormData({...formData, postOpDiagnosis: e.target.value})}
                        placeholder="e.g. Chronic Calculous Cholecystitis" 
                        className="h-8 text-xs font-bold text-blue-950" 
                      />
                    </div>
                  </div>

                  {/* Procedures Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-300">
                    <div className="p-2 space-y-1">
                      <Label className="font-bold text-slate-900 text-[11px]">Operative Procedure Proposed:</Label>
                      <Input 
                        value={formData.operativeProcedureProposed} 
                        onChange={e => setFormData({...formData, operativeProcedureProposed: e.target.value})}
                        placeholder="e.g. Laparoscopic Cholecystectomy" 
                        className="h-8 text-xs" 
                      />
                    </div>
                    <div className="p-2 space-y-1">
                      <Label className="font-bold text-slate-900 text-[11px]">Operative Procedure Executed:</Label>
                      <Input 
                        value={formData.operativeProcedureExecuted} 
                        onChange={e => setFormData({...formData, operativeProcedureExecuted: e.target.value})}
                        placeholder="e.g. Laparoscopic Cholecystectomy with Abdominal Drain" 
                        className="h-8 text-xs font-bold text-slate-900 bg-amber-50/50" 
                      />
                    </div>
                  </div>

                  {/* Classification & Time */}
                  <div className="grid grid-cols-1 md:grid-cols-12 p-2 gap-2 items-center bg-slate-50">
                    <div className="md:col-span-3 flex items-center gap-2">
                      <Label className="font-bold text-slate-900 text-[11px]">Category:</Label>
                      <div className="flex items-center gap-3 text-xs font-bold">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input 
                            type="radio" 
                            name="procCategory" 
                            value="Major" 
                            checked={formData.procedureType === 'Major'} 
                            onChange={() => setFormData({...formData, procedureType: 'Major'})}
                          />
                          <span>Major</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input 
                            type="radio" 
                            name="procCategory" 
                            value="Minor" 
                            checked={formData.procedureType === 'Minor'} 
                            onChange={() => setFormData({...formData, procedureType: 'Minor'})}
                          />
                          <span>Minor</span>
                        </label>
                      </div>
                    </div>

                    <div className="md:col-span-4 flex items-center gap-2">
                      <Label className="font-bold text-slate-900 text-[11px]">Time Duration:</Label>
                      <Input 
                        value={formData.timeDuration || ''} 
                        onChange={e => setFormData({...formData, timeDuration: e.target.value})}
                        placeholder="e.g. 1 Hr 30 Mins" 
                        className="h-7 text-xs w-36" 
                      />
                    </div>

                    <div className="md:col-span-5 flex items-center gap-2">
                      <Label className="font-bold text-slate-900 text-[11px]">Type:</Label>
                      <div className="flex items-center gap-3 text-xs font-bold">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input 
                            type="radio" 
                            name="procCaseType" 
                            value="Elective" 
                            checked={formData.caseType === 'Elective'} 
                            onChange={() => setFormData({...formData, caseType: 'Elective'})}
                          />
                          <span>Elective</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input 
                            type="radio" 
                            name="procCaseType" 
                            value="Emergency" 
                            checked={formData.caseType === 'Emergency'} 
                            onChange={() => setFormData({...formData, caseType: 'Emergency'})}
                          />
                          <span>Emergency</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Surgical Team */}
                  <div className="grid grid-cols-1 md:grid-cols-3 p-2 gap-2 bg-white">
                    <div className="space-y-1">
                      <Label className="font-bold text-slate-900 text-[11px]">Surgeon:</Label>
                      <Input value={formData.surgeon} onChange={e => setFormData({...formData, surgeon: e.target.value})} className="h-7 text-xs font-bold" />
                    </div>
                    <div className="space-y-1">
                      <Label className="font-bold text-slate-900 text-[11px]">Assist 1:</Label>
                      <Input value={formData.assist1Surgeon || ''} onChange={e => setFormData({...formData, assist1Surgeon: e.target.value})} className="h-7 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="font-bold text-slate-900 text-[11px]">Assist 2:</Label>
                      <Input value={formData.assist2Surgeon || ''} onChange={e => setFormData({...formData, assist2Surgeon: e.target.value})} className="h-7 text-xs" />
                    </div>
                  </div>

                  {/* Anaestheist Team */}
                  <div className="grid grid-cols-1 md:grid-cols-3 p-2 gap-2 bg-slate-50">
                    <div className="space-y-1">
                      <Label className="font-bold text-slate-900 text-[11px]">Anaestheist:</Label>
                      <Input value={formData.anaesthetist} onChange={e => setFormData({...formData, anaesthetist: e.target.value})} className="h-7 text-xs font-bold" />
                    </div>
                    <div className="space-y-1">
                      <Label className="font-bold text-slate-900 text-[11px]">Assist 1:</Label>
                      <Input value={formData.assist1Anaesthetist || ''} onChange={e => setFormData({...formData, assist1Anaesthetist: e.target.value})} className="h-7 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="font-bold text-slate-900 text-[11px]">Assist 2:</Label>
                      <Input value={formData.assist2Anaesthetist || ''} onChange={e => setFormData({...formData, assist2Anaesthetist: e.target.value})} className="h-7 text-xs" />
                    </div>
                  </div>

                  {/* Nursing Staff */}
                  <div className="grid grid-cols-1 md:grid-cols-3 p-2 gap-2 bg-white">
                    <div className="space-y-1">
                      <Label className="font-bold text-slate-900 text-[11px]">Scrub Nurse - 1:</Label>
                      <Input value={formData.scrubNurse1 || ''} onChange={e => setFormData({...formData, scrubNurse1: e.target.value})} className="h-7 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="font-bold text-slate-900 text-[11px]">Scrub Nurse - 2:</Label>
                      <Input value={formData.scrubNurse2 || ''} onChange={e => setFormData({...formData, scrubNurse2: e.target.value})} className="h-7 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="font-bold text-slate-900 text-[11px]">Floor Nurse:</Label>
                      <Input value={formData.floorNurse || ''} onChange={e => setFormData({...formData, floorNurse: e.target.value})} className="h-7 text-xs" />
                    </div>
                  </div>

                  {/* Patient Position */}
                  <div className="p-2 bg-slate-50 space-y-1">
                    <Label className="font-bold text-slate-900 text-[11px]">Position:</Label>
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      {['Supine', 'Lithotomy', 'Trendelenberg', 'Prone', 'Right lateral', 'Jack Knife', 'Other'].map(pos => (
                        <label key={pos} className="flex items-center gap-1 cursor-pointer font-medium">
                          <input 
                            type="radio" 
                            name="pos" 
                            value={pos} 
                            checked={formData.position === pos} 
                            onChange={() => setFormData({...formData, position: pos as any})}
                          />
                          <span>{pos}</span>
                        </label>
                      ))}
                      {formData.position === 'Other' && (
                        <Input 
                          placeholder="Specify Position" 
                          value={formData.positionOther || ''} 
                          onChange={e => setFormData({...formData, positionOther: e.target.value})}
                          className="h-6 text-xs w-32" 
                        />
                      )}
                    </div>
                  </div>

                  {/* Anaesthesia Type */}
                  <div className="p-2 bg-white space-y-1">
                    <Label className="font-bold text-slate-900 text-[11px]">Anaesthesia:</Label>
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      {['GA', 'SA', 'Epidural', 'Local', 'Regional Block', 'Other'].map(anes => (
                        <label key={anes} className="flex items-center gap-1 cursor-pointer font-medium">
                          <input 
                            type="radio" 
                            name="anes" 
                            value={anes} 
                            checked={formData.anaesthesiaType === anes} 
                            onChange={() => setFormData({...formData, anaesthesiaType: anes as any})}
                          />
                          <span>{anes}</span>
                        </label>
                      ))}
                      {formData.anaesthesiaType === 'Other' && (
                        <Input 
                          placeholder="Specify Anaesthesia" 
                          value={formData.anaesthesiaOther || ''} 
                          onChange={e => setFormData({...formData, anaesthesiaOther: e.target.value})}
                          className="h-6 text-xs w-32" 
                        />
                      )}
                    </div>
                  </div>

                  {/* Findings */}
                  <div className="p-2 bg-slate-50 space-y-1">
                    <Label className="font-bold text-slate-900 text-[11px]">Findings:</Label>
                    <Textarea 
                      value={formData.findings || ''} 
                      onChange={e => setFormData({...formData, findings: e.target.value})}
                      placeholder="Enter intra-operative anatomy, lesions, fluid collection or pathology findings..." 
                      className="text-xs h-16 bg-white" 
                    />
                  </div>

                </div>
              </div>

              {/* OPERATIVE NOTES SECTION */}
              <div className="border border-slate-800 rounded-lg overflow-hidden mt-4 bg-white">
                <div className="bg-slate-900 text-white font-extrabold text-xs uppercase px-3 py-1.5 text-center tracking-wider">
                  OPERATIVE NOTES
                </div>

                <div className="p-3 space-y-3 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="font-bold text-slate-900 text-[11px]">Skin Preparation:</Label>
                      <Input 
                        value={formData.skinPreparation || ''} 
                        onChange={e => setFormData({...formData, skinPreparation: e.target.value})}
                        placeholder="e.g. Betadine 10% & Spirit Solution" 
                        className="h-8 text-xs" 
                      />
                    </div>
                    <div>
                      <Label className="font-bold text-slate-900 text-[11px]">Incision:</Label>
                      <Input 
                        value={formData.incision || ''} 
                        onChange={e => setFormData({...formData, incision: e.target.value})}
                        placeholder="e.g. Right subcostal / Four laparoscopic ports" 
                        className="h-8 text-xs font-bold" 
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="font-bold text-slate-900 text-[11px]">Procedure (Step-by-step Operative Details):</Label>
                    <Textarea 
                      value={formData.procedureDetails} 
                      onChange={e => setFormData({...formData, procedureDetails: e.target.value})}
                      placeholder="Describe operative surgical steps in detail..." 
                      className="text-xs min-h-[160px] font-mono leading-relaxed" 
                    />
                  </div>

                  {/* ATTACH CLINICAL PHOTOS IN OT SUMMARY */}
                  <div className="pt-3 border-t border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-blue-700" />
                        <Label className="font-extrabold text-slate-900 text-xs uppercase">
                          Attach Clinical / Intra-Operative Photos
                        </Label>
                        <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-800 border-blue-200">
                          {(formData.clinicalPhotos || []).length} Attached
                        </Badge>
                      </div>

                      <Label className="cursor-pointer">
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-bold transition-all">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Photos</span>
                        </div>
                        <input 
                          type="file" 
                          accept="image/*" 
                          multiple 
                          className="hidden" 
                          onChange={handlePhotoUpload} 
                        />
                      </Label>
                    </div>

                    {(formData.clinicalPhotos || []).length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                        {(formData.clinicalPhotos || []).map((photo) => (
                          <div key={photo.id} className="group relative border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-1 space-y-1">
                            <div className="h-28 w-full overflow-hidden rounded-lg bg-black/5 flex items-center justify-center relative">
                              <img src={photo.url} alt={photo.caption} className="object-cover w-full h-full" />
                              <button 
                                type="button"
                                onClick={() => handleRemovePhoto(photo.id)}
                                className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full opacity-80 hover:opacity-100 shadow"
                                title="Delete photo"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            <Input 
                              value={photo.caption || ''} 
                              onChange={e => handleCaptionChange(photo.id, e.target.value)}
                              placeholder="Photo Caption..." 
                              className="h-6 text-[10px] font-medium bg-white" 
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">No intra-operative clinical photos attached yet. Click 'Upload Photos' to attach laparoscopic stills, specimen photos, or pre/post-op clinical images.</p>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button 
                onClick={handleSave} 
                className="bg-blue-700 hover:bg-blue-800 text-white font-extrabold text-xs gap-1.5 px-6 shadow-md"
              >
                <Save className="w-4 h-4" /> Save OT Summary & Operative Notes
              </Button>
            </div>

          </CardContent>
        </Card>
      ) : (
        /* History / Stored Summaries Tab */
        <Card className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs bg-white">
          <CardHeader className="bg-slate-50 border-b py-3 px-4">
            <CardTitle className="text-sm font-bold text-slate-800">Stored Carewell OT Summaries & Operative Notes</CardTitle>
            <CardDescription className="text-xs">Browse and print historical operation records recorded under Carewell Hospital template.</CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            <Table className="text-xs">
              <TableHeader className="bg-slate-100 font-bold text-slate-700">
                <TableRow>
                  <TableHead>Date / Reg No</TableHead>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Surgeon & Anaesthetist</TableHead>
                  <TableHead>Procedure Executed</TableHead>
                  <TableHead>Type & Anaesthesia</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {summaries.map(sum => (
                  <TableRow key={sum.id} className="hover:bg-slate-50">
                    <TableCell className="py-2 font-bold">
                      <p>{sum.date} {sum.time}</p>
                      <p className="text-[10px] text-blue-800">{sum.regNo || 'NH/1871/MAY/2016'}</p>
                    </TableCell>

                    <TableCell className="py-2 font-black text-slate-900">
                      {sum.patientName}
                    </TableCell>

                    <TableCell className="py-2">
                      <p className="font-bold text-slate-800">{sum.surgeon}</p>
                      <p className="text-[10px] text-slate-500">{sum.anaesthetist}</p>
                    </TableCell>

                    <TableCell className="py-2 max-w-xs font-semibold text-slate-900">
                      {sum.operativeProcedureExecuted}
                    </TableCell>

                    <TableCell className="py-2">
                      <Badge className="bg-slate-800 text-white text-[10px] font-bold">
                        {sum.procedureType} | {sum.anaesthesiaType}
                      </Badge>
                    </TableCell>

                    <TableCell className="py-2 text-right space-x-1">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          setFormData(sum);
                          setActiveTab('create');
                        }}
                        className="h-7 text-[10px] font-bold"
                      >
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => handlePrint(sum)}
                        className="h-7 text-[10px] font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        Print Form
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {summaries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                      No Carewell OT Summaries saved yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Hidden Printable Area for Official Form Layout matching Image 1 */}
      {selectedForm && (
        <div className="hidden print:block fixed inset-0 bg-white p-8 z-50 text-black text-xs font-serif leading-normal">
          <div className="border-2 border-black p-6 space-y-4 max-w-4xl mx-auto">
            
            {/* Printable Header */}
            <div className="text-center border-b-2 border-black pb-3 space-y-1">
              <div className="flex items-center justify-center">
                <span className="text-[10px] font-bold uppercase tracking-wider">GASTRO PLUS HOSPITAL</span>
              </div>
              <h1 className="text-xl font-bold uppercase tracking-tight">GASTRO PLUS HOSPITAL</h1>
              <p className="text-[10px] italic">Plot No. 7 & 8, Om Shiv Nagar, Gufa Mandir Road, Lal Ghati Bhopal, 462030, Madhya Pradesh | Ph.: 9109102145/9109101246</p>
            </div>

            {/* Patient Header Grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 border-b border-black pb-3 text-xs">
              <p><strong>ID No.:</strong> {selectedForm.idNo || '__________'}</p>
              <p><strong>Full Name (In CAPITAL):</strong> <span className="font-bold uppercase">{selectedForm.patientName}</span></p>
              <p><strong>D.O.B.:</strong> {selectedForm.dob || '____/____/________'}</p>
              <p><strong>M / F:</strong> {selectedForm.gender || 'F'} &nbsp;&nbsp;&nbsp;&nbsp; <strong>Date:</strong> {selectedForm.date} &nbsp;&nbsp;&nbsp;&nbsp; <strong>Time (24 hr. clock):</strong> {selectedForm.time}</p>
            </div>

            {/* Table: OPERATION THEATRE SUMMARY */}
            <div>
              <div className="bg-gray-200 text-center font-bold text-xs border border-black uppercase py-1">
                OPERATION THEATRE SUMMARY
              </div>

              <table className="w-full border-collapse border border-black text-xs">
                <tbody>
                  <tr className="border-b border-black">
                    <td className="p-1.5 font-bold w-1/4 border-r border-black">Pre-Operative Diagnosis</td>
                    <td className="p-1.5 border-r border-black" colSpan={3}>{selectedForm.preOpDiagnosis}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="p-1.5 font-bold border-r border-black">Post Operative Diagnosis</td>
                    <td className="p-1.5 border-r border-black" colSpan={3}>{selectedForm.postOpDiagnosis}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="p-1.5 font-bold border-r border-black">Operative Procedure Proposed</td>
                    <td className="p-1.5 border-r border-black" colSpan={3}>{selectedForm.operativeProcedureProposed}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="p-1.5 font-bold border-r border-black">Operative Procedure Executed</td>
                    <td className="p-1.5 border-r border-black" colSpan={3}>{selectedForm.operativeProcedureExecuted}</td>
                  </tr>

                  <tr className="border-b border-black">
                    <td className="p-1.5 font-bold border-r border-black">{selectedForm.procedureType || 'Major'}</td>
                    <td className="p-1.5 border-r border-black">Time: {selectedForm.timeDuration || '1 Hr'}</td>
                    <td className="p-1.5 border-r border-black" colSpan={2}>{selectedForm.caseType}</td>
                  </tr>

                  <tr className="border-b border-black">
                    <td className="p-1.5 font-bold border-r border-black">Surgeon</td>
                    <td className="p-1.5 border-r border-black">{selectedForm.surgeon}</td>
                    <td className="p-1.5 border-r border-black">Assist 1: {selectedForm.assist1Surgeon}</td>
                    <td className="p-1.5">Assist 2: {selectedForm.assist2Surgeon}</td>
                  </tr>

                  <tr className="border-b border-black">
                    <td className="p-1.5 font-bold border-r border-black">Anaestheist</td>
                    <td className="p-1.5 border-r border-black">{selectedForm.anaesthetist}</td>
                    <td className="p-1.5 border-r border-black">Assist 1: {selectedForm.assist1Anaesthetist}</td>
                    <td className="p-1.5">Assist 2: {selectedForm.assist2Anaesthetist}</td>
                  </tr>

                  <tr className="border-b border-black">
                    <td className="p-1.5 font-bold border-r border-black">Scrub Nurse - 1</td>
                    <td className="p-1.5 border-r border-black">{selectedForm.scrubNurse1}</td>
                    <td className="p-1.5 border-r border-black">Scrub Nurse - 2: {selectedForm.scrubNurse2}</td>
                    <td className="p-1.5">Floor Nurse: {selectedForm.floorNurse}</td>
                  </tr>

                  <tr className="border-b border-black">
                    <td className="p-1.5 font-bold border-r border-black">Position</td>
                    <td className="p-1.5" colSpan={3}>
                      {['Supine', 'Lithotomy', 'Trendelenberg', 'Prone', 'Right lateral', 'Jack Knife'].map(p => (
                        <span key={p} className={`mr-3 ${selectedForm.position === p ? 'font-bold underline' : ''}`}>
                          [{selectedForm.position === p ? '✓' : ' '}] {p}
                        </span>
                      ))}
                    </td>
                  </tr>

                  <tr className="border-b border-black">
                    <td className="p-1.5 font-bold border-r border-black">Anaesthesia</td>
                    <td className="p-1.5" colSpan={3}>
                      {['GA', 'SA', 'Epidural', 'Local', 'Regional Block'].map(a => (
                        <span key={a} className={`mr-3 ${selectedForm.anaesthesiaType === a ? 'font-bold underline' : ''}`}>
                          [{selectedForm.anaesthesiaType === a ? '✓' : ' '}] {a}
                        </span>
                      ))}
                    </td>
                  </tr>

                  <tr>
                    <td className="p-1.5 font-bold border-r border-black">Findings</td>
                    <td className="p-1.5" colSpan={3}>{selectedForm.findings}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* OPERATIVE NOTES */}
            <div>
              <div className="bg-gray-200 text-center font-bold text-xs border border-black uppercase py-1 mt-4">
                OPERATIVE NOTES
              </div>

              <div className="border border-black p-3 space-y-2 text-xs">
                <p><strong>Elective / Emergency:</strong> {selectedForm.caseType}</p>
                <p><strong>Skin Preparation:</strong> {selectedForm.skinPreparation}</p>
                <p><strong>Incision:</strong> {selectedForm.incision}</p>
                <div className="pt-2">
                  <p className="font-bold underline mb-1">Procedure:</p>
                  <pre className="whitespace-pre-wrap font-serif text-xs leading-relaxed">
                    {selectedForm.procedureDetails}
                  </pre>
                </div>
              </div>
            </div>

            {/* Signatures */}
            <div className="flex justify-between pt-12 text-xs">
              <div className="text-center">
                <p className="border-t border-black pt-1 px-6">Scrub / OT Nurse Signature</p>
              </div>
              <div className="text-center">
                <p className="border-t border-black pt-1 px-6">Anaesthetist Signature</p>
              </div>
              <div className="text-center font-bold">
                <p className="border-t border-black pt-1 px-6">Surgeon Signature ({selectedForm.surgeon})</p>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Post Operative Surgical Instructions Modal */}
      {isPostOpOpen && (
        <Dialog open={isPostOpOpen} onOpenChange={setIsPostOpOpen}>
          <DialogContent className="fixed inset-0 top-0 left-0 translate-x-0 translate-y-0 w-screen h-screen max-w-none max-h-none sm:max-w-none rounded-none m-0 p-0 flex flex-col bg-slate-50 overflow-y-auto border-none shadow-none z-50">
            <PostOpForms 
              patient={{ id: formData.patientId, name: formData.patientName, mrn: formData.regNo }} 
              defaultFormTab="instructions" 
              onClose={() => setIsPostOpOpen(false)} 
            />
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
