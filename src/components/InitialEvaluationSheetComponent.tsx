import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Printer, 
  Save, 
  Plus, 
  Edit,
  Trash2, 
  UserCheck, 
  Search, 
  CheckCircle2, 
  History, 
  User, 
  Clock, 
  Calendar,
  Sparkles,
  Stethoscope,
  ChevronRight,
  ClipboardList,
  AlertTriangle,
  Building,
  Building2,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { 
  getInitialEvaluationSheets, 
  createInitialEvaluationSheet, 
  updateInitialEvaluationSheet,
  deleteInitialEvaluationSheet 
} from '@/services/supabaseService';

interface MedicationRow {
  form: string;
  name: string;
  dose: string;
  frequency: string;
  time: string;
  duration: string;
}

interface InitialEvaluationSheetProps {
  patients: any[];
  admissions: any[];
  beds: any[];
  users: any[];
  onSuccess?: () => void;
}

export const InitialEvaluationSheetComponent: React.FC<InitialEvaluationSheetProps> = ({
  patients = [],
  admissions = [],
  beds = [],
  users = [],
  onSuccess
}) => {
  const currentUser = storage.get(STORAGE_KEYS.SESSION_USER, null);
  const rawHospitalInfo = storage.get(STORAGE_KEYS.HOSPITAL_INFO, null);
  
  const hospitalName = rawHospitalInfo?.name || 'Gastro Plus Hospital';
  const hospitalSub = rawHospitalInfo?.subHeader || 'Gastro Plus Hospital (Super Speciality Center)';
  const hospitalAddress = rawHospitalInfo?.address || 'Plot No. 7 & 8, Om Shiv Nagar, Gufa Mandir Road, Lal Ghati Bhopal, 462030, Madhya Pradesh';
  const hospitalPhone = rawHospitalInfo?.phone || '9109102145 / 9109101246';
  const hospitalRegNo = 'Reg. No.: LL/7209/MAY-2026';

  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [patientSearch, setPatientSearch] = useState<string>('');
  const [showSearchResults, setShowSearchResults] = useState<boolean>(false);
  const [savedSheets, setSavedSheets] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [editingSheetId, setEditingSheetId] = useState<string | null>(null);

  // Form State matching exact fields from image 1 & image 2
  const [formData, setFormData] = useState({
    ipdNo: '',
    ipdRegNo: '',
    mobNo: '',
    address: '',
    evaluationDate: new Date().toISOString().split('T')[0],
    evaluationTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    patientName: '',
    ageSex: '',
    weight: '',
    height: '',
    emergencyContact: '',

    // Section 1
    complaintsHistory: '',

    // Section 2
    pastHistoryFlags: {
      DM: false,
      HTN: false,
      CAD: false,
      CVA: false,
      CKD: false,
      TB: false,
      ASTHMA: false,
      Sx: false
    } as Record<string, boolean>,
    currentMedications: '',

    // Section 3
    familyHistory: '',
    drugAllergies: '',

    // Section 4
    addictionSmoking: '',
    addictionAlcohol: '',

    // Section 5
    generalCondition: 'Good', // Good / Average / Poor / Grave
    pulse: '',
    spo2: '',
    bp: '',
    rr: '',
    temp: '',
    physicalSigns: {
      lymphadenopathy: false,
      oedema: false,
      pallor: false,
      cyanosis: false,
      icterus: false,
      otherNotes: ''
    },

    // Section 6
    nutritionalStatus: 'Good', // Malnourished / Average / Good / OverWeight

    // Section 7
    systemicCns: '',
    systemicCvs: '',
    systemicRs: '',
    systemicPa: '',
    systemicOther: '',

    // Section 8
    localExamination: '',

    // Section 9
    provisionalDiagnosis: '',

    // Section 10
    planOfTreatment: '',

    // Section 11 - Investigations
    investigations: {
      FBC: false,
      LFT: false,
      RFT: false,
      BSR: false,
      ElectrolyteHBA1C: false,
      LipidCholesterol: false,
      SAmylase: false,
      SLipase: false,
      HBA1C: false,
      PTINR: false,
      UrineRM: false,
      XRayChest: false,
      XRayAbdomen: false,
      USG: false,
      ECG: false,
      Echo2D: false,
      PAC: false,
      other: ''
    },

    // Section 12 - General Instructions
    diet: 'Full Diet', // NBM / Liquid Diet / Soft Diet / Full Diet
    dietRoute: 'PO', // PO / RT / FJ / Jejunal
    mobility: 'Full Mobility', // Strict Bed Rest / Restricted Mobility / Full Mobility
    followPrepNeeded: '',
    otPlan: '',
    generalOtherInstructions: '',

    // Consultant
    consultantId: currentUser?.id || '',
    consultantName: currentUser?.name || 'Dr. A. K. Verma'
  });

  // Section 13 - Medication Order Rows
  const [medicationRows, setMedicationRows] = useState<MedicationRow[]>([
    { form: 'Tab.', name: '', dose: '', frequency: 'OD', time: 'Morning', duration: '3 Days' },
    { form: 'Cap.', name: '', dose: '', frequency: 'BD', time: 'Morning/Night', duration: '5 Days' }
  ]);

  useEffect(() => {
    loadSavedSheets();
  }, []);

  const loadSavedSheets = async () => {
    setIsLoadingHistory(true);
    try {
      const sheets = await getInitialEvaluationSheets();
      if (sheets) setSavedSheets(sheets);
    } catch (e) {
      console.error('Failed to fetch saved initial evaluation sheets:', e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Auto-populate when selecting a patient and fetch OPD/Prescription data
  const handleSelectPatient = (patient: any) => {
    setSelectedPatientId(patient.id);
    setPatientSearch(patient.name);
    setShowSearchResults(false);

    const activeAdmission = admissions.find((a: any) => (a.patient_id === patient.id || a.patientId === patient.id) && a.status === 'Admitted');
    const bedInfo = activeAdmission ? beds.find((b: any) => b.id === activeAdmission.bed_id) : beds.find((b: any) => b.patient_id === patient.id || b.patientId === patient.id);

    // Fetch latest OPD prescription data for this patient
    const allPrescriptions = storage.get(STORAGE_KEYS.PRESCRIPTIONS, []);
    const patientRx = allPrescriptions
      .filter((rx: any) => {
        if (patient.id && (rx.patientId === patient.id || rx.patient_id === patient.id)) return true;
        if (patient.mrn && rx.patientMrn && rx.patientMrn.toLowerCase() === patient.mrn.toLowerCase()) return true;
        if (patient.name && rx.patientName && rx.patientName.toLowerCase() === patient.name.toLowerCase()) return true;
        return false;
      })
      .sort((a: any, b: any) => new Date(b.date || b.prescription_date || 0).getTime() - new Date(a.date || a.prescription_date || 0).getTime())[0];

    // Deserialize prescription advice if stored as JSON
    let rxAdvice = '';
    let rxComplaints = patient.complaints || patient.presentingComplaints || '';
    let rxDiagnosis = patient.diagnosis || '';
    let rxPastHistory = patient.pastHistory || patient.medicalHistory || '';
    let rxAllergies = patient.allergies || patient.knownAllergies || '';
    let rxVitals = patient.vitals || {};
    let rxInvestigations: string[] = [];

    if (patientRx) {
      rxDiagnosis = patientRx.diagnosis || rxDiagnosis;
      if (typeof patientRx.advice === 'string' && patientRx.advice.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(patientRx.advice);
          rxAdvice = parsed.advice || '';
          rxComplaints = parsed.complaints || rxComplaints;
          rxDiagnosis = parsed.diagnosis || rxDiagnosis;
          rxPastHistory = parsed.pastHistory || rxPastHistory;
          rxAllergies = parsed.allergies || rxAllergies;
          if (parsed.vitals) rxVitals = { ...rxVitals, ...parsed.vitals };
          if (parsed.investigationsAdvised && Array.isArray(parsed.investigationsAdvised)) {
            rxInvestigations = parsed.investigationsAdvised;
          }
        } catch (e) {
          rxAdvice = patientRx.advice || '';
        }
      } else {
        rxAdvice = patientRx.advice || '';
      }
    }

    // Auto-map past history flags
    const histUpper = (rxPastHistory + ' ' + (patient.medicalHistory || '')).toUpperCase();
    const updatedPastFlags = {
      DM: histUpper.includes('DM') || histUpper.includes('DIABETES'),
      HTN: histUpper.includes('HTN') || histUpper.includes('HYPERTENSION'),
      CAD: histUpper.includes('CAD') || histUpper.includes('CARDIAC') || histUpper.includes('HEART'),
      CVA: histUpper.includes('CVA') || histUpper.includes('STROKE'),
      CKD: histUpper.includes('CKD') || histUpper.includes('KIDNEY') || histUpper.includes('RENAL'),
      TB: histUpper.includes('TB') || histUpper.includes('TUBERCULOSIS'),
      ASTHMA: histUpper.includes('ASTHMA') || histUpper.includes('COPD'),
      Sx: histUpper.includes('SURGERY') || histUpper.includes('OPERATED')
    };

    // Auto-map investigations checkboxes
    const invUpper = (rxInvestigations.join(' ') + ' ' + (patientRx?.investigations || '')).toUpperCase();
    const updatedInvs = {
      FBC: invUpper.includes('FBC') || invUpper.includes('CBC') || invUpper.includes('HAEMOGRAM'),
      LFT: invUpper.includes('LFT') || invUpper.includes('LIVER'),
      RFT: invUpper.includes('RFT') || invUpper.includes('KFT') || invUpper.includes('KIDNEY'),
      BSR: invUpper.includes('BSR') || invUpper.includes('BLOOD SUGAR') || invUpper.includes('GLUCOSE'),
      ElectrolyteHBA1C: invUpper.includes('ELECTROLYTE') || invUpper.includes('SODIUM'),
      LipidCholesterol: invUpper.includes('LIPID') || invUpper.includes('CHOLESTEROL'),
      SAmylase: invUpper.includes('AMYLASE'),
      SLipase: invUpper.includes('LIPASE'),
      HBA1C: invUpper.includes('HBA1C'),
      PTINR: invUpper.includes('PT') || invUpper.includes('INR'),
      UrineRM: invUpper.includes('URINE'),
      XRayChest: invUpper.includes('XRAY') || invUpper.includes('CHEST X'),
      XRayAbdomen: invUpper.includes('ABDOMEN X'),
      USG: invUpper.includes('USG') || invUpper.includes('ULTRASOUND'),
      ECG: invUpper.includes('ECG') || invUpper.includes('EKG'),
      Echo2D: invUpper.includes('ECHO'),
      PAC: invUpper.includes('PAC'),
      other: rxInvestigations.length > 0 ? rxInvestigations.join(', ') : ''
    };

    // Auto-populate medication rows from OPD prescription
    if (patientRx && Array.isArray(patientRx.medicines) && patientRx.medicines.length > 0) {
      const mappedRows = patientRx.medicines.map((m: any) => ({
        form: m.name.toLowerCase().startsWith('inj') ? 'Inj.' : m.name.toLowerCase().startsWith('syr') ? 'Syr.' : 'Tab.',
        name: m.name || '',
        dose: m.dosage || '',
        frequency: m.frequency || '1-0-1',
        time: 'After Meal',
        duration: m.duration || '5 Days'
      }));
      setMedicationRows(mappedRows);
    }

    setFormData(prev => ({
      ...prev,
      patientName: patient.name || '',
      ipdNo: bedInfo ? `IPD-${bedInfo.number || bedInfo.id}` : (patient.mrn || `IPD-${Math.floor(1000 + Math.random() * 9000)}`),
      ipdRegNo: patient.registration_number || patient.mrn || `REG-${Math.floor(10000 + Math.random() * 90000)}`,
      mobNo: patient.phone || patient.mobile || '',
      address: patient.address || '',
      ageSex: `${patient.age ? `${patient.age} Yrs` : '30 Yrs'} / ${patient.gender || 'Male'}`,
      weight: rxVitals.weight || patient.weight ? `${rxVitals.weight || patient.weight} kg` : '',
      height: rxVitals.height || patient.height ? `${rxVitals.height || patient.height} cm` : '',
      emergencyContact: patient.emergency_contact_number || patient.emergencyContact || patient.phone || '',
      consultantName: activeAdmission?.doctor_name || currentUser?.name || 'Dr. A. K. Verma',
      complaintsHistory: rxComplaints || prev.complaintsHistory,
      provisionalDiagnosis: rxDiagnosis || prev.provisionalDiagnosis,
      pastHistoryFlags: updatedPastFlags,
      drugAllergies: rxAllergies || prev.drugAllergies,
      pulse: rxVitals.pulse || rxVitals.pulseRate || prev.pulse,
      bp: rxVitals.bp || rxVitals.bloodPressure || prev.bp,
      spo2: rxVitals.spo2 || prev.spo2,
      rr: rxVitals.rr || rxVitals.respiratoryRate || prev.rr,
      temp: rxVitals.temp || rxVitals.temperature || prev.temp,
      planOfTreatment: rxAdvice ? `OPD Advised Plan:\n${rxAdvice}` : prev.planOfTreatment,
      investigations: updatedInvs
    }));

    if (patientRx) {
      toast.success(`Loaded details & auto-fetched OPD Prescription dated ${patientRx.date || patientRx.prescription_date} for ${patient.name}`);
    } else {
      toast.success(`Loaded details for ${patient.name}`);
    }
  };

  const handleAddMedRow = () => {
    setMedicationRows([
      ...medicationRows,
      { form: 'Tab.', name: '', dose: '', frequency: 'OD', time: 'After Meal', duration: '5 Days' }
    ]);
  };

  const handleRemoveMedRow = (index: number) => {
    if (medicationRows.length === 1) {
      toast.error('At least one medication row is required');
      return;
    }
    setMedicationRows(medicationRows.filter((_, i) => i !== index));
  };

  const handleMedRowChange = (index: number, field: keyof MedicationRow, value: string) => {
    const updated = [...medicationRows];
    updated[index] = { ...updated[index], [field]: value };
    setMedicationRows(updated);
  };

  const handleSaveSheet = async () => {
    if (!formData.patientName.trim()) {
      toast.error('Please enter or select a Patient Name');
      return;
    }

    const payload = {
      patient_id: selectedPatientId || null,
      patient_name: formData.patientName.trim(),
      ipd_no: formData.ipdNo,
      ipd_reg_no: formData.ipdRegNo,
      mob_no: formData.mobNo,
      address: formData.address,
      evaluation_date: formData.evaluationDate,
      evaluation_time: formData.evaluationTime,
      age_sex: formData.ageSex,
      weight: formData.weight,
      height: formData.height,
      emergency_contact: formData.emergencyContact,
      complaints_history: formData.complaintsHistory,
      past_history_flags: formData.pastHistoryFlags,
      current_medications: formData.currentMedications,
      family_history: formData.familyHistory,
      drug_allergies: formData.drugAllergies,
      addiction_smoking: formData.addictionSmoking,
      addiction_alcohol: formData.addictionAlcohol,
      general_condition: formData.generalCondition,
      pulse: formData.pulse,
      spo2: formData.spo2,
      bp: formData.bp,
      rr: formData.rr,
      temp: formData.temp,
      physical_signs: formData.physicalSigns,
      nutritional_status: formData.nutritionalStatus,
      systemic_cns: formData.systemicCns,
      systemic_cvs: formData.systemicCvs,
      systemic_rs: formData.systemicRs,
      systemic_pa: formData.systemicPa,
      systemic_other: formData.systemicOther,
      local_examination: formData.localExamination,
      provisional_diagnosis: formData.provisionalDiagnosis,
      plan_of_treatment: formData.planOfTreatment,
      investigations: formData.investigations,
      general_instructions: {
        diet: formData.diet,
        dietRoute: formData.dietRoute,
        mobility: formData.mobility,
        followPrepNeeded: formData.followPrepNeeded,
        otPlan: formData.otPlan,
        other: formData.generalOtherInstructions
      },
      medication_orders: medicationRows.filter(r => r.name.trim().length > 0),
      consultant_id: currentUser?.id || null,
      consultant_name: formData.consultantName
    };

    try {
      if (editingSheetId) {
        const result = await updateInitialEvaluationSheet(editingSheetId, payload);
        if (result) {
          toast.success(`Initial Evaluation Sheet updated for ${formData.patientName}!`);
          setEditingSheetId(null);
          loadSavedSheets();
          if (onSuccess) onSuccess();
        } else {
          toast.error('Failed to update Initial Evaluation Sheet');
        }
      } else {
        const result = await createInitialEvaluationSheet(payload);
        if (result) {
          toast.success(`Initial Evaluation Sheet saved for ${formData.patientName}!`);
          loadSavedSheets();
          if (onSuccess) onSuccess();
        } else {
          toast.error('Failed to save Initial Evaluation Sheet');
        }
      }
    } catch (err: any) {
      console.error('Save/Update initial evaluation error:', err);
      toast.error('Error saving Initial Evaluation Sheet');
    }
  };

  const handleEditSheet = (sheet: any) => {
    setEditingSheetId(sheet.id);
    setSelectedPatientId(sheet.patient_id || '');
    setPatientSearch(sheet.patient_name || '');
    setFormData({
      ipdNo: sheet.ipd_no || '',
      ipdRegNo: sheet.ipd_reg_no || '',
      mobNo: sheet.mob_no || '',
      address: sheet.address || '',
      evaluationDate: sheet.evaluation_date || new Date().toISOString().split('T')[0],
      evaluationTime: sheet.evaluation_time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      patientName: sheet.patient_name || '',
      ageSex: sheet.age_sex || '',
      weight: sheet.weight || '',
      height: sheet.height || '',
      emergencyContact: sheet.emergency_contact || '',
      complaintsHistory: sheet.complaints_history || '',
      pastHistoryFlags: sheet.past_history_flags || {
        DM: false, HTN: false, CAD: false, CVA: false, CKD: false, TB: false, ASTHMA: false, Sx: false
      },
      currentMedications: sheet.current_medications || '',
      familyHistory: sheet.family_history || '',
      drugAllergies: sheet.drug_allergies || '',
      addictionSmoking: sheet.addiction_smoking || '',
      addictionAlcohol: sheet.addiction_alcohol || '',
      generalCondition: sheet.general_condition || 'Good',
      pulse: sheet.pulse || '',
      spo2: sheet.spo2 || '',
      bp: sheet.bp || '',
      rr: sheet.rr || '',
      temp: sheet.temp || '',
      physicalSigns: sheet.physical_signs || {
        lymphadenopathy: false, oedema: false, pallor: false, cyanosis: false, icterus: false, otherNotes: ''
      },
      nutritionalStatus: sheet.nutritional_status || 'Good',
      systemicCns: sheet.systemic_cns || '',
      systemicCvs: sheet.systemic_cvs || '',
      systemicRs: sheet.systemic_rs || '',
      systemicPa: sheet.systemic_pa || '',
      systemicOther: sheet.systemic_other || '',
      localExamination: sheet.local_examination || '',
      provisionalDiagnosis: sheet.provisional_diagnosis || '',
      planOfTreatment: sheet.plan_of_treatment || '',
      investigations: sheet.investigations || {
        FBC: false, LFT: false, RFT: false, BSR: false, ElectrolyteHBA1C: false,
        LipidCholesterol: false, SAmylase: false, SLipase: false, HBA1C: false,
        PTINR: false, UrineRM: false, XRayChest: false, XRayAbdomen: false, USG: false,
        ECG: false, Echo2D: false, PAC: false, other: ''
      },
      diet: sheet.general_instructions?.diet || 'Full Diet',
      dietRoute: sheet.general_instructions?.dietRoute || 'PO',
      mobility: sheet.general_instructions?.mobility || 'Full Mobility',
      followPrepNeeded: sheet.general_instructions?.followPrepNeeded || '',
      otPlan: sheet.general_instructions?.otPlan || '',
      generalOtherInstructions: sheet.general_instructions?.other || '',
      consultantId: sheet.consultant_id || currentUser?.id || '',
      consultantName: sheet.consultant_name || currentUser?.name || 'Dr. A. K. Verma'
    });

    if (sheet.medication_orders && Array.isArray(sheet.medication_orders) && sheet.medication_orders.length > 0) {
      setMedicationRows(sheet.medication_orders);
    } else {
      setMedicationRows([
        { form: 'Tab.', name: '', dose: '', frequency: 'OD', time: 'Morning', duration: '3 Days' }
      ]);
    }

    setIsHistoryOpen(false);
    toast.info(`Editing Evaluation Sheet for ${sheet.patient_name}`);
  };

  const handleResetForm = () => {
    setEditingSheetId(null);
    setSelectedPatientId('');
    setPatientSearch('');
    setFormData({
      ipdNo: '',
      ipdRegNo: '',
      mobNo: '',
      address: '',
      evaluationDate: new Date().toISOString().split('T')[0],
      evaluationTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      patientName: '',
      ageSex: '',
      weight: '',
      height: '',
      emergencyContact: '',
      complaintsHistory: '',
      pastHistoryFlags: { DM: false, HTN: false, CAD: false, CVA: false, CKD: false, TB: false, ASTHMA: false, Sx: false },
      currentMedications: '',
      familyHistory: '',
      drugAllergies: '',
      addictionSmoking: '',
      addictionAlcohol: '',
      generalCondition: 'Good',
      pulse: '',
      spo2: '',
      bp: '',
      rr: '',
      temp: '',
      physicalSigns: { lymphadenopathy: false, oedema: false, pallor: false, cyanosis: false, icterus: false, otherNotes: '' },
      nutritionalStatus: 'Good',
      systemicCns: '',
      systemicCvs: '',
      systemicRs: '',
      systemicPa: '',
      systemicOther: '',
      localExamination: '',
      provisionalDiagnosis: '',
      planOfTreatment: '',
      investigations: { FBC: false, LFT: false, RFT: false, BSR: false, ElectrolyteHBA1C: false, LipidCholesterol: false, SAmylase: false, SLipase: false, HBA1C: false, PTINR: false, UrineRM: false, XRayChest: false, XRayAbdomen: false, USG: false, ECG: false, Echo2D: false, PAC: false, other: '' },
      diet: 'Full Diet',
      dietRoute: 'PO',
      mobility: 'Full Mobility',
      followPrepNeeded: '',
      otPlan: '',
      generalOtherInstructions: '',
      consultantId: currentUser?.id || '',
      consultantName: currentUser?.name || 'Dr. A. K. Verma'
    });
    setMedicationRows([
      { form: 'Tab.', name: '', dose: '', frequency: 'OD', time: 'Morning', duration: '3 Days' },
      { form: 'Cap.', name: '', dose: '', frequency: 'BD', time: 'Morning/Night', duration: '5 Days' }
    ]);
  };

  const handlePrintSheet = (dataToPrint?: any) => {
    const d = dataToPrint || formData;
    const meds = dataToPrint?.medication_orders || medicationRows;
    const pastFlags = dataToPrint?.past_history_flags || formData.pastHistoryFlags;
    const physSigns = dataToPrint?.physical_signs || formData.physicalSigns;
    const invs = dataToPrint?.investigations || formData.investigations;
    const genInst = dataToPrint?.general_instructions || {
      diet: formData.diet,
      dietRoute: formData.dietRoute,
      mobility: formData.mobility,
      followPrepNeeded: formData.followPrepNeeded,
      otPlan: formData.otPlan,
      other: formData.generalOtherInstructions
    };

    const iframeId = 'initial-eval-print-frame';
    let iframe = document.getElementById(iframeId) as HTMLIFrameElement;
    if (iframe) document.body.removeChild(iframe);

    iframe = document.createElement('iframe');
    iframe.id = iframeId;
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) return;

    const activePastConditions = Object.entries(pastFlags)
      .filter(([_, val]) => val === true)
      .map(([key]) => key)
      .join(', ');

    const activePhysSigns = [
      physSigns.lymphadenopathy ? '1. Lymphadenopathy' : '',
      physSigns.oedema ? '2. Oedema' : '',
      physSigns.pallor ? '3. Pallor' : '',
      physSigns.cyanosis ? '4. Cyanosis' : '',
      physSigns.icterus ? '5. Icterus' : '',
      physSigns.otherNotes ? `6. Other: ${physSigns.otherNotes}` : ''
    ].filter(Boolean).join(' | ');

    const activeInvs = Object.entries(invs)
      .filter(([key, val]) => val === true && key !== 'other')
      .map(([key]) => key)
      .concat(invs.other ? [`Other: ${invs.other}`] : [])
      .join(', ');

    const medsTableRows = meds.map((m: any, idx: number) => `
      <tr>
        <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
        <td>${m.form || 'Tab.'}</td>
        <td style="font-weight: bold; color: #0369a1;">${m.name || '---'}</td>
        <td>${m.dose || '---'}</td>
        <td>${m.frequency || '---'}</td>
        <td>${m.time || '---'}</td>
        <td>${m.duration || '---'}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Initial Evaluation Sheet - ${d.patientName || d.patient_name}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
          body {
            font-family: 'Inter', sans-serif;
            color: #0f172a;
            margin: 15px;
            padding: 0;
            font-size: 11px;
            line-height: 1.3;
          }
          .sheet-container {
            border: 2px solid #0284c7;
            padding: 12px;
            border-radius: 6px;
          }
          .header-banner {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #0284c7;
            padding-bottom: 8px;
            margin-bottom: 8px;
          }
          .hospital-title {
            font-size: 18px;
            font-weight: 800;
            color: #0369a1;
            text-transform: uppercase;
          }
          .hospital-sub {
            font-size: 10px;
            color: #475569;
            margin-top: 2px;
          }
          .doc-title {
            text-align: center;
            font-size: 13px;
            font-weight: 800;
            background-color: #e0f2fe;
            color: #0369a1;
            padding: 4px;
            border-radius: 4px;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border: 1px solid #bae6fd;
          }
          .grid-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
          }
          .grid-table td, .grid-table th {
            border: 1px solid #cbd5e1;
            padding: 4px 6px;
            font-size: 10.5px;
          }
          .label {
            font-weight: 700;
            background-color: #f8fafc;
            color: #334155;
            width: 15%;
          }
          .val {
            width: 18%;
          }
          .sec-header {
            font-weight: 800;
            background-color: #f1f5f9;
            color: #0f172a;
            padding: 4px 6px;
            border-left: 4px solid #0284c7;
            margin-top: 8px;
            margin-bottom: 4px;
            font-size: 11px;
            text-transform: uppercase;
          }
          .text-content {
            padding: 4px 6px;
            border: 1px solid #e2e8f0;
            min-height: 24px;
            border-radius: 4px;
            background-color: #ffffff;
            margin-bottom: 6px;
          }
          .med-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 6px;
            margin-bottom: 12px;
          }
          .med-table th {
            background-color: #e0f2fe;
            color: #0369a1;
            font-weight: 700;
            text-align: left;
            border: 1px solid #bae6fd;
            padding: 4px 6px;
          }
          .med-table td {
            border: 1px solid #cbd5e1;
            padding: 4px 6px;
          }
          .footer-sig {
            margin-top: 25px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .sig-box {
            text-align: center;
            width: 220px;
          }
          .sig-line {
            border-top: 1px solid #0f172a;
            margin-top: 35px;
            padding-top: 4px;
            font-weight: 700;
          }
          @media print {
            * {
              color: #000000 !important;
              border-color: #000000 !important;
              box-shadow: none !important;
              text-shadow: none !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body { 
              margin: 10px; 
              color: #000000 !important;
              font-weight: 700 !important;
            }
            p, div, span, td, th, label, input, textarea, strong, b, h1, h2, h3, h4, h5, h6 {
              color: #000000 !important;
              font-weight: 700 !important;
            }
            .sheet-container { border: 2px solid #000 !important; }
            .doc-title, .sec-header, .label {
              background-color: #f1f5f9 !important;
              color: #000000 !important;
              font-weight: 800 !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="sheet-container">
          <div class="header-banner">
            <div>
              <div class="hospital-title">${hospitalName}</div>
              <div class="hospital-sub">${hospitalSub}</div>
              <div class="hospital-sub">${hospitalAddress} | Tel: ${hospitalPhone}</div>
            </div>
            <div style="text-align: right;">
              <span style="font-weight: bold; font-family: monospace; color: #0284c7;">${hospitalRegNo}</span>
            </div>
          </div>

          <div class="doc-title">INITIAL EVALUATION SHEET</div>

          <table class="grid-table">
            <tr>
              <td class="label">IPD NO.</td>
              <td class="val" style="font-weight: bold; color: #0369a1;">${d.ipdNo || d.ipd_no || '---'}</td>
              <td class="label">DATE</td>
              <td class="val">${d.evaluationDate || d.evaluation_date || '---'}</td>
              <td class="label">TIME</td>
              <td class="val">${d.evaluationTime || d.evaluation_time || '---'}</td>
            </tr>
            <tr>
              <td class="label">NAME OF PATIENT</td>
              <td class="val" style="font-weight: bold;" colspan="3">${d.patientName || d.patient_name || '---'}</td>
              <td class="label">AGE / SEX</td>
              <td class="val">${d.ageSex || d.age_sex || '---'}</td>
            </tr>
            <tr>
              <td class="label">IPD REG NO</td>
              <td class="val">${d.ipdRegNo || d.ipd_reg_no || '---'}</td>
              <td class="label">WEIGHT</td>
              <td class="val">${d.weight || '---'}</td>
              <td class="label">HEIGHT</td>
              <td class="val">${d.height || '---'}</td>
            </tr>
            <tr>
              <td class="label">MOB NO</td>
              <td class="val">${d.mobNo || d.mob_no || '---'}</td>
              <td class="label">EMERGENCY CONTACT</td>
              <td class="val" colspan="3">${d.emergencyContact || d.emergency_contact || '---'}</td>
            </tr>
            <tr>
              <td class="label">ADDRESS</td>
              <td class="val" colspan="5">${d.address || '---'}</td>
            </tr>
          </table>

          <div class="sec-header">1. COMPLAINTS WITH HISTORY OF PRESENT ILLNESS</div>
          <div class="text-content">${d.complaintsHistory || d.complaints_history || 'Nil recorded.'}</div>

          <div class="sec-header">2. PAST HISTORY & CURRENT MEDICATIONS</div>
          <div class="text-content">
            <strong>Conditions:</strong> ${activePastConditions || 'None specified'}<br/>
            <strong>Current Medications:</strong> ${d.currentMedications || d.current_medications || 'None'}
          </div>

          <table class="grid-table" style="margin-top: 6px;">
            <tr>
              <td class="label" style="width: 25%;">3. FAMILY HISTORY</td>
              <td style="width: 25%;">${d.familyHistory || d.family_history || 'Nil'}</td>
              <td class="label" style="width: 25%;">DRUG ALLERGY (if any)</td>
              <td style="width: 25%; font-weight: bold; color: #dc2626;">${d.drugAllergies || d.drug_allergies || 'No Known Drug Allergies'}</td>
            </tr>
            <tr>
              <td class="label">4. ADDICTION HISTORY</td>
              <td colspan="3">
                Smoking/Tobacco: ${d.addictionSmoking || d.addiction_smoking || 'No'} | Alcohol: ${d.addictionAlcohol || d.addiction_alcohol || 'No'}
              </td>
            </tr>
          </table>

          <div class="sec-header">5. CONDITION ON ADMISSION & VITALS</div>
          <table class="grid-table">
            <tr>
              <td class="label">GENERAL CONDITION</td>
              <td style="font-weight: bold; color: #0284c7;">${d.generalCondition || d.general_condition || 'Good'}</td>
              <td class="label">PULSE</td>
              <td>${d.pulse || '---'} bpm</td>
              <td class="label">SPO2</td>
              <td>${d.spo2 || '---'} %</td>
            </tr>
            <tr>
              <td class="label">BP</td>
              <td>${d.bp || '---'} mmHg</td>
              <td class="label">R/R</td>
              <td>${d.rr || '---'} /min</td>
              <td class="label">TEMP</td>
              <td>${d.temp || '---'} °F</td>
            </tr>
            <tr>
              <td class="label">PHYSICAL SIGNS</td>
              <td colspan="5">${activePhysSigns || 'Nil significant'}</td>
            </tr>
            <tr>
              <td class="label">6. NUTRITIONAL STATUS</td>
              <td colspan="5" style="font-weight: bold;">${d.nutritionalStatus || d.nutritional_status || 'Good'}</td>
            </tr>
          </table>

          <div class="sec-header">7. SYSTEMIC EXAMINATION</div>
          <table class="grid-table">
            <tr>
              <td class="label">CNS</td>
              <td>${d.systemicCns || d.systemic_cns || 'NAD'}</td>
              <td class="label">CVS</td>
              <td>${d.systemicCvs || d.systemic_cvs || 'S1 S2 Heard'}</td>
            </tr>
            <tr>
              <td class="label">R/S</td>
              <td>${d.systemicRs || d.systemic_rs || 'NVBS, Clear'}</td>
              <td class="label">P/A</td>
              <td>${d.systemicPa || d.systemic_pa || 'Soft, Non-tender'}</td>
            </tr>
            <tr>
              <td class="label">OTHER</td>
              <td colspan="3">${d.systemicOther || d.systemic_other || 'Nil'}</td>
            </tr>
          </table>

          <div class="sec-header">8. P.R / P.V / LOCAL EXAMINATION</div>
          <div class="text-content">${d.localExamination || d.local_examination || 'Nil'}</div>

          <div class="sec-header">9. PROVISIONAL DIAGNOSIS</div>
          <div class="text-content" style="font-weight: bold; color: #0369a1;">${d.provisionalDiagnosis || d.provisional_diagnosis || 'Under evaluation.'}</div>

          <div class="sec-header">10. PLAN OF TREATMENT</div>
          <div class="text-content">${d.planOfTreatment || d.plan_of_treatment || 'Symptomatic & supportive management.'}</div>

          <div class="sec-header">11. INVESTIGATIONS ADVISED</div>
          <div class="text-content">${activeInvs || 'None requested.'}</div>

          <div class="sec-header">12. GENERAL INSTRUCTIONS</div>
          <table class="grid-table">
            <tr>
              <td class="label">DIET</td>
              <td>${genInst.diet || 'Full Diet'} (${genInst.dietRoute || 'PO'})</td>
              <td class="label">MOBILITY</td>
              <td>${genInst.mobility || 'Full Mobility'}</td>
            </tr>
            <tr>
              <td class="label">PREPARATION / FOLLOW</td>
              <td>${genInst.followPrepNeeded || 'As per staff guidance'}</td>
              <td class="label">OT PLAN</td>
              <td>${genInst.otPlan || 'N/A'}</td>
            </tr>
          </table>

          <div class="sec-header">13. MEDICATION ORDER</div>
          <table class="med-table">
            <thead>
              <tr>
                <th style="width: 5%;">#</th>
                <th style="width: 10%;">Form</th>
                <th style="width: 30%;">Drug Name</th>
                <th style="width: 15%;">Dose</th>
                <th style="width: 15%;">Frequency</th>
                <th style="width: 15%;">Time</th>
                <th style="width: 10%;">Duration</th>
              </tr>
            </thead>
            <tbody>
              ${medsTableRows.length > 0 ? medsTableRows : '<tr><td colspan="7" style="text-align:center;">No medications ordered yet</td></tr>'}
            </tbody>
          </table>

          <div class="footer-sig">
            <div>
              <p style="font-size: 10px; color: #64748b;">Evaluated Date/Time: ${d.evaluationDate || d.evaluation_date} ${d.evaluationTime || d.evaluation_time}</p>
            </div>
            <div class="sig-box">
              <p style="font-weight: bold;">${d.consultantName || d.consultant_name || 'Dr. A. K. Verma'}</p>
              <div class="sig-line">Name & Signature of Consultant</div>
            </div>
          </div>
        </div>

        <script>
          window.onload = () => {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      if (iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => {
          if (document.getElementById(iframeId)) {
            document.body.removeChild(iframe);
          }
        }, 3000);
      }
    }, 500);
  };

  const handleDeleteSheet = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this Initial Evaluation Sheet record?')) return;
    const res = await deleteInitialEvaluationSheet(id);
    if (res) {
      toast.success('Evaluation sheet deleted');
      loadSavedSheets();
    } else {
      toast.error('Failed to delete record');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <Card className="border-teal-100 shadow-sm bg-gradient-to-r from-teal-50 via-sky-50 to-white overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-teal-600 text-white rounded-2xl shadow-md">
                <ClipboardList className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-800">Initial Evaluation Sheet</h2>
                  <Badge className="bg-teal-600 text-white font-bold text-[10px]">
                    IPD ADMISSION RECORD
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Complete admission clinical assessment, past history, systemic examination, and medication orders.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="default"
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1.5 shadow-sm"
                onClick={() => {
                  const selPat = patients.find(p => p.id === selectedPatientId || p.name === formData.patientName);
                  if (selPat) {
                    handleSelectPatient(selPat);
                  } else {
                    toast.error('Please select a patient first to fetch OPD/Prescription data.');
                  }
                }}
              >
                <Zap className="w-4 h-4 text-amber-200 fill-amber-200" />
                Fetch OPD / Prescription Data
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 border-teal-200 text-teal-800 hover:bg-teal-100 font-bold"
                onClick={() => setIsHistoryOpen(true)}
              >
                <History className="w-4 h-4 text-teal-600" />
                Evaluation Records ({savedSheets.length})
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 border-slate-300 text-slate-700 hover:bg-slate-100 font-bold"
                onClick={() => handlePrintSheet()}
              >
                <Printer className="w-4 h-4" />
                Print Preview
              </Button>
              <Button 
                size="sm" 
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold gap-2 shadow-sm"
                onClick={handleSaveSheet}
              >
                <Save className="w-4 h-4" />
                Save Sheet
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Patient Search & Selection Bar */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="relative">
              <Label className="text-xs font-bold text-slate-700 mb-1.5 block">
                Select Patient to Auto-Fill Details
              </Label>
              <div className="relative">
                <Input 
                  placeholder="Type patient name, phone, or MRN..." 
                  value={patientSearch}
                  onChange={(e) => {
                    setPatientSearch(e.target.value);
                    setShowSearchResults(true);
                  }}
                  onFocus={() => setShowSearchResults(true)}
                  className="pl-9 pr-4 text-sm rounded-lg"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>

              {showSearchResults && patientSearch.trim().length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
                  {patients.filter(p => 
                    p.name.toLowerCase().includes(patientSearch.toLowerCase()) || 
                    (p.phone || '').includes(patientSearch) || 
                    (p.mrn || '').toLowerCase().includes(patientSearch.toLowerCase())
                  ).length > 0 ? (
                    patients.filter(p => 
                      p.name.toLowerCase().includes(patientSearch.toLowerCase()) || 
                      (p.phone || '').includes(patientSearch) || 
                      (p.mrn || '').toLowerCase().includes(patientSearch.toLowerCase())
                    ).map(p => (
                      <div 
                        key={p.id}
                        className="p-2.5 hover:bg-teal-50 cursor-pointer border-b border-slate-100 last:border-0 flex items-center justify-between"
                        onClick={() => handleSelectPatient(p)}
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-800">{p.name}</p>
                          <p className="text-[10px] text-slate-500">{p.age} Yrs • {p.gender} • MRN: {p.mrn}</p>
                        </div>
                        {selectedPatientId === p.id && <CheckCircle2 className="w-4 h-4 text-teal-600" />}
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-center text-xs text-slate-400">No matching patient records found.</div>
                  )}
                </div>
              )}
            </div>

            <div className="md:col-span-2 flex items-center justify-end gap-3 text-xs text-slate-600 font-medium">
              <span className="flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                <Building className="w-3.5 h-3.5 text-teal-600" />
                {hospitalName}
              </span>
              <span className="flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                <Clock className="w-3.5 h-3.5 text-teal-600" />
                {formData.evaluationDate} {formData.evaluationTime}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Form Body - Replicating Image 1 & 2 Paper Sheet */}
      <div className="bg-white border-2 border-teal-200 rounded-2xl shadow-lg p-6 sm:p-8 space-y-6">
        
        {/* Hospital Print-Style Header */}
        <div className="border-b-2 border-teal-600 pb-4 text-center space-y-1">
          <h2 className="text-2xl font-black text-teal-800 uppercase tracking-tight">{hospitalName}</h2>
          <p className="text-xs text-slate-600 font-medium">{hospitalSub}</p>
          <p className="text-[11px] text-slate-500">{hospitalAddress} • {hospitalPhone}</p>
          <div className="flex justify-between items-center pt-2">
            <span className="text-[10px] font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
              {hospitalRegNo}
            </span>
            <span className="text-sm font-extrabold uppercase bg-teal-600 text-white px-4 py-1 rounded-md shadow-sm tracking-wider">
              INITIAL EVALUATION SHEET
            </span>
            <span className="text-xs text-slate-500 font-medium">FORM REF: IPD-EVAL-01</span>
          </div>
        </div>

        {/* Top Demographics Grid (Image 1 Header) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
          <div>
            <Label className="text-[11px] font-bold text-slate-700">IPD NO.</Label>
            <Input 
              value={formData.ipdNo} 
              onChange={e => setFormData({...formData, ipdNo: e.target.value})}
              placeholder="e.g. IPD-101"
              className="bg-white h-8 text-xs font-bold text-teal-800"
            />
          </div>
          <div>
            <Label className="text-[11px] font-bold text-slate-700">DATE</Label>
            <Input 
              type="date"
              value={formData.evaluationDate} 
              onChange={e => setFormData({...formData, evaluationDate: e.target.value})}
              className="bg-white h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-[11px] font-bold text-slate-700">TIME</Label>
            <Input 
              value={formData.evaluationTime} 
              onChange={e => setFormData({...formData, evaluationTime: e.target.value})}
              placeholder="10:30 AM"
              className="bg-white h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-[11px] font-bold text-slate-700">NAME OF PATIENT *</Label>
            <Input 
              value={formData.patientName} 
              onChange={e => setFormData({...formData, patientName: e.target.value})}
              placeholder="Patient full name"
              className="bg-white h-8 text-xs font-bold"
            />
          </div>

          <div>
            <Label className="text-[11px] font-bold text-slate-700">AGE / SEX</Label>
            <Input 
              value={formData.ageSex} 
              onChange={e => setFormData({...formData, ageSex: e.target.value})}
              placeholder="35 Yrs / Male"
              className="bg-white h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-[11px] font-bold text-slate-700">IPD REG NO</Label>
            <Input 
              value={formData.ipdRegNo} 
              onChange={e => setFormData({...formData, ipdRegNo: e.target.value})}
              placeholder="REG-8812"
              className="bg-white h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-[11px] font-bold text-slate-700">WEIGHT</Label>
            <Input 
              value={formData.weight} 
              onChange={e => setFormData({...formData, weight: e.target.value})}
              placeholder="e.g. 68 kg"
              className="bg-white h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-[11px] font-bold text-slate-700">HEIGHT</Label>
            <Input 
              value={formData.height} 
              onChange={e => setFormData({...formData, height: e.target.value})}
              placeholder="e.g. 172 cm"
              className="bg-white h-8 text-xs"
            />
          </div>

          <div>
            <Label className="text-[11px] font-bold text-slate-700">MOB NO</Label>
            <Input 
              value={formData.mobNo} 
              onChange={e => setFormData({...formData, mobNo: e.target.value})}
              placeholder="+91 9876543210"
              className="bg-white h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-[11px] font-bold text-slate-700">EMERGENCY CONTACT</Label>
            <Input 
              value={formData.emergencyContact} 
              onChange={e => setFormData({...formData, emergencyContact: e.target.value})}
              placeholder="+91 9876543211 (Relative)"
              className="bg-white h-8 text-xs"
            />
          </div>
          <div className="md:col-span-2">
            <Label className="text-[11px] font-bold text-slate-700">ADDRESS</Label>
            <Input 
              value={formData.address} 
              onChange={e => setFormData({...formData, address: e.target.value})}
              placeholder="Full address details"
              className="bg-white h-8 text-xs"
            />
          </div>
        </div>

        {/* SECTION 1: COMPLAINTS WITH HISTORY OF PRESENT ILLNESS */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-lg border-l-4 border-teal-600 font-extrabold text-xs text-slate-800 uppercase">
            <span>1</span>
            <span>COMPLAINTS WITH HISTORY OF PRESENT ILLNESS</span>
          </div>
          <Textarea 
            rows={3} 
            value={formData.complaintsHistory} 
            onChange={e => setFormData({...formData, complaintsHistory: e.target.value})}
            placeholder="Enter chief complaints, duration, onset, progression, and history of present illness..."
            className="text-xs bg-slate-50/50"
          />
        </div>

        {/* SECTION 2: PAST HISTORY & CURRENT MEDICATIONS */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-lg border-l-4 border-teal-600 font-extrabold text-xs text-slate-800 uppercase">
            <span>2</span>
            <span>PAST HISTORY</span>
          </div>
          <div className="flex flex-wrap items-center gap-6 bg-slate-50 p-3 rounded-lg border border-slate-200">
            {['DM', 'HTN', 'CAD', 'CVA', 'CKD', 'TB', 'ASTHMA', 'Sx'].map(flag => (
              <label key={flag} className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <Checkbox 
                  checked={!!formData.pastHistoryFlags[flag]} 
                  onCheckedChange={(chk) => {
                    setFormData({
                      ...formData,
                      pastHistoryFlags: { ...formData.pastHistoryFlags, [flag]: !!chk }
                    });
                  }} 
                />
                <span>{flag}</span>
              </label>
            ))}
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Current Medications</Label>
            <Textarea 
              rows={2} 
              value={formData.currentMedications} 
              onChange={e => setFormData({...formData, currentMedications: e.target.value})}
              placeholder="List any regular long-term medications..."
              className="text-xs bg-slate-50/50"
            />
          </div>
        </div>

        {/* SECTION 3: FAMILY HISTORY & DRUG ALLERGY */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-lg border-l-4 border-teal-600 font-extrabold text-xs text-slate-800 uppercase">
              <span>3</span>
              <span>FAMILY HISTORY</span>
            </div>
            <Textarea 
              rows={2} 
              value={formData.familyHistory} 
              onChange={e => setFormData({...formData, familyHistory: e.target.value})}
              placeholder="Family history of diabetes, hypertension, cardiac ailments, etc..."
              className="text-xs bg-slate-50/50"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 bg-rose-50 p-2 rounded-lg border-l-4 border-rose-600 font-extrabold text-xs text-rose-800 uppercase">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>DRUG ALLERGY (IF ANY)</span>
            </div>
            <Textarea 
              rows={2} 
              value={formData.drugAllergies} 
              onChange={e => setFormData({...formData, drugAllergies: e.target.value})}
              placeholder="Specific drug allergies (e.g., Penicillin, NSAIDs, Sulfa, Latex)..."
              className="text-xs bg-rose-50/30 border-rose-200"
            />
          </div>
        </div>

        {/* SECTION 4: ADDICTION HISTORY */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-lg border-l-4 border-teal-600 font-extrabold text-xs text-slate-800 uppercase">
            <span>4</span>
            <span>ADDICTION HISTORY</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
            <div>
              <Label className="font-bold text-slate-700">SMOKING / TOBACCO</Label>
              <Input 
                value={formData.addictionSmoking} 
                onChange={e => setFormData({...formData, addictionSmoking: e.target.value})}
                placeholder="e.g. Non-smoker / 5 Cigarettes/day x 10 yrs"
                className="bg-white h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label className="font-bold text-slate-700">ALCOHOL</Label>
              <Input 
                value={formData.addictionAlcohol} 
                onChange={e => setFormData({...formData, addictionAlcohol: e.target.value})}
                placeholder="e.g. Non-alcoholic / Social drinking"
                className="bg-white h-8 text-xs mt-1"
              />
            </div>
          </div>
        </div>

        {/* SECTION 5: CONDITION ON ADMISSION & VITALS */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-lg border-l-4 border-teal-600 font-extrabold text-xs text-slate-800 uppercase">
            <span>5</span>
            <span>CONDITION ON ADMISSION & VITALS</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div className="md:col-span-2">
              <Label className="font-bold text-slate-700 block mb-1">GC (General Condition)</Label>
              <Select 
                value={formData.generalCondition} 
                onValueChange={v => setFormData({...formData, generalCondition: v})}
              >
                <SelectTrigger className="bg-white h-8 text-xs font-bold">
                  <SelectValue placeholder="GC Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Average">Average</SelectItem>
                  <SelectItem value="Poor">Poor</SelectItem>
                  <SelectItem value="Grave">Grave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="font-bold text-slate-700">PULSE (bpm)</Label>
              <Input 
                value={formData.pulse} 
                onChange={e => setFormData({...formData, pulse: e.target.value})}
                placeholder="78"
                className="bg-white h-8 text-xs mt-1 font-mono"
              />
            </div>
            <div>
              <Label className="font-bold text-slate-700">SPO2 (%)</Label>
              <Input 
                value={formData.spo2} 
                onChange={e => setFormData({...formData, spo2: e.target.value})}
                placeholder="98"
                className="bg-white h-8 text-xs mt-1 font-mono"
              />
            </div>
            <div>
              <Label className="font-bold text-slate-700">BP (mmHg)</Label>
              <Input 
                value={formData.bp} 
                onChange={e => setFormData({...formData, bp: e.target.value})}
                placeholder="120/80"
                className="bg-white h-8 text-xs mt-1 font-mono"
              />
            </div>
            <div>
              <Label className="font-bold text-slate-700">R/R (/min)</Label>
              <Input 
                value={formData.rr} 
                onChange={e => setFormData({...formData, rr: e.target.value})}
                placeholder="18"
                className="bg-white h-8 text-xs mt-1 font-mono"
              />
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
            <Label className="text-xs font-bold text-slate-700 block">Physical Examination Findings</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs">
              {[
                { key: 'lymphadenopathy', label: '1. Lymphadenopathy' },
                { key: 'oedema', label: '2. Oedema' },
                { key: 'pallor', label: '3. Pallor' },
                { key: 'cyanosis', label: '4. Cyanosis' },
                { key: 'icterus', label: '5. Icterus' }
              ].map(item => (
                <label key={item.key} className="flex items-center gap-2 font-medium cursor-pointer">
                  <Checkbox 
                    checked={!!(formData.physicalSigns as any)[item.key]} 
                    onCheckedChange={(chk) => {
                      setFormData({
                        ...formData,
                        physicalSigns: { ...formData.physicalSigns, [item.key]: !!chk }
                      });
                    }} 
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
            <div className="pt-2">
              <Input 
                value={formData.physicalSigns.otherNotes} 
                onChange={e => setFormData({
                  ...formData,
                  physicalSigns: { ...formData.physicalSigns, otherNotes: e.target.value }
                })}
                placeholder="6. Other physical examination findings..."
                className="bg-white h-8 text-xs"
              />
            </div>
          </div>
        </div>

        {/* SECTION 6: NUTRITIONAL STATUS */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-lg border-l-4 border-teal-600 font-extrabold text-xs text-slate-800 uppercase">
            <span>6</span>
            <span>NUTRITIONAL STATUS</span>
          </div>
          <div className="flex flex-wrap gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-700">
            {['Malnourished', 'Average', 'Good', 'OverWeight'].map(status => (
              <label key={status} className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="nutritionalStatus" 
                  checked={formData.nutritionalStatus === status}
                  onChange={() => setFormData({...formData, nutritionalStatus: status})}
                  className="text-teal-600 focus:ring-teal-500"
                />
                <span>{status}</span>
              </label>
            ))}
          </div>
        </div>

        {/* PAGE BREAK INDICATOR - IMAGE 2 STARTS */}
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t-2 border-dashed border-teal-300"></span>
          </div>
          <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-wider">
            <span className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full border border-teal-200">
              PAGE 2: SYSTEMIC EXAMINATION & MEDICATION ORDERS
            </span>
          </div>
        </div>

        {/* SECTION 7: SYSTEMIC EXAMINATION */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-lg border-l-4 border-teal-600 font-extrabold text-xs text-slate-800 uppercase">
            <span>7</span>
            <span>SYSTEMIC EXAMINATION</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <Label className="font-bold text-slate-700">CNS (Central Nervous System)</Label>
              <Input 
                value={formData.systemicCns} 
                onChange={e => setFormData({...formData, systemicCns: e.target.value})}
                placeholder="Conscious, Oriented to time, place, person"
                className="bg-white h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label className="font-bold text-slate-700">CVS (Cardiovascular System)</Label>
              <Input 
                value={formData.systemicCvs} 
                onChange={e => setFormData({...formData, systemicCvs: e.target.value})}
                placeholder="S1 S2 Heard, No murmur"
                className="bg-white h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label className="font-bold text-slate-700">R/S (Respiratory System)</Label>
              <Input 
                value={formData.systemicRs} 
                onChange={e => setFormData({...formData, systemicRs: e.target.value})}
                placeholder="NVBS, Air entry bilateral equal"
                className="bg-white h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label className="font-bold text-slate-700">P/A (Per Abdomen)</Label>
              <Input 
                value={formData.systemicPa} 
                onChange={e => setFormData({...formData, systemicPa: e.target.value})}
                placeholder="Soft, Non-tender, BS Present"
                className="bg-white h-8 text-xs mt-1"
              />
            </div>
            <div className="md:col-span-2">
              <Label className="font-bold text-slate-700">OTHER</Label>
              <Input 
                value={formData.systemicOther} 
                onChange={e => setFormData({...formData, systemicOther: e.target.value})}
                placeholder="Other systemic notes..."
                className="bg-white h-8 text-xs mt-1"
              />
            </div>
          </div>
        </div>

        {/* SECTION 8: P.R / P.V / LOCAL EXAMINATION */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-lg border-l-4 border-teal-600 font-extrabold text-xs text-slate-800 uppercase">
            <span>8</span>
            <span>P.R / P.V / LOCAL EXAMINATION</span>
          </div>
          <Textarea 
            rows={2} 
            value={formData.localExamination} 
            onChange={e => setFormData({...formData, localExamination: e.target.value})}
            placeholder="Per Rectal / Per Vaginal / Local lesion examination findings..."
            className="text-xs bg-slate-50/50"
          />
        </div>

        {/* SECTION 9 & 10: PROVISIONAL DIAGNOSIS & PLAN OF TREATMENT */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-lg border-l-4 border-teal-600 font-extrabold text-xs text-slate-800 uppercase">
              <span>9</span>
              <span>PROVISIONAL DIAGNOSIS</span>
            </div>
            <Textarea 
              rows={3} 
              value={formData.provisionalDiagnosis} 
              onChange={e => setFormData({...formData, provisionalDiagnosis: e.target.value})}
              placeholder="Primary working diagnosis on admission..."
              className="text-xs bg-teal-50/30 border-teal-200 font-bold text-teal-900"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-lg border-l-4 border-teal-600 font-extrabold text-xs text-slate-800 uppercase">
              <span>10</span>
              <span>PLAN OF TREATMENT</span>
            </div>
            <Textarea 
              rows={3} 
              value={formData.planOfTreatment} 
              onChange={e => setFormData({...formData, planOfTreatment: e.target.value})}
              placeholder="Immediate therapeutic plan, IV fluids, monitoring schedule..."
              className="text-xs bg-slate-50/50"
            />
          </div>
        </div>

        {/* SECTION 11: INVESTIGATIONS */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-lg border-l-4 border-teal-600 font-extrabold text-xs text-slate-800 uppercase">
            <span>11</span>
            <span>INVESTIGATION ADVISED</span>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs font-bold text-slate-700">
              {[
                { key: 'FBC', label: 'FBC' },
                { key: 'LFT', label: 'LFT' },
                { key: 'RFT', label: 'RFT' },
                { key: 'BSR', label: 'BSR' },
                { key: 'ElectrolyteHBA1C', label: 'Electrolyte+HBA1C' },
                { key: 'LipidCholesterol', label: 'Lipid Cholesterol' },
                { key: 'SAmylase', label: 'S. Amylase' },
                { key: 'SLipase', label: 'S. Lipase' },
                { key: 'HBA1C', label: 'HBA1C' },
                { key: 'PTINR', label: 'PT-INR' },
                { key: 'UrineRM', label: 'Urine R/M' },
                { key: 'XRayChest', label: 'X-Ray Chest' },
                { key: 'XRayAbdomen', label: 'X-Ray Abdomen' },
                { key: 'USG', label: 'USG' },
                { key: 'ECG', label: 'ECG' },
                { key: 'Echo2D', label: '2D Echo' },
                { key: 'PAC', label: 'PAC' }
              ].map(inv => (
                <label key={inv.key} className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200 hover:border-teal-400 transition-all">
                  <Checkbox 
                    checked={!!(formData.investigations as any)[inv.key]} 
                    onCheckedChange={(chk) => {
                      setFormData({
                        ...formData,
                        investigations: { ...formData.investigations, [inv.key]: !!chk }
                      });
                    }} 
                  />
                  <span>{inv.label}</span>
                </label>
              ))}
            </div>
            <div className="pt-1">
              <Input 
                value={formData.investigations.other} 
                onChange={e => setFormData({
                  ...formData,
                  investigations: { ...formData.investigations, other: e.target.value }
                })}
                placeholder="Other specific investigations (CT Scan, MRI, Biopsy, Endoscopy)..."
                className="bg-white h-8 text-xs"
              />
            </div>
          </div>
        </div>

        {/* SECTION 12: GENERAL INSTRUCTIONS */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-lg border-l-4 border-teal-600 font-extrabold text-xs text-slate-800 uppercase">
            <span>12</span>
            <span>GENERAL INSTRUCTIONS</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <Label className="font-bold text-slate-700">DIET</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <Select value={formData.diet} onValueChange={v => setFormData({...formData, diet: v})}>
                  <SelectTrigger className="bg-white h-8 text-xs font-bold">
                    <SelectValue placeholder="Diet Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NBM">NBM</SelectItem>
                    <SelectItem value="Liquid Diet">Liquid Diet</SelectItem>
                    <SelectItem value="Soft Diet">Soft Diet</SelectItem>
                    <SelectItem value="Full Diet">Full Diet</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={formData.dietRoute} onValueChange={v => setFormData({...formData, dietRoute: v})}>
                  <SelectTrigger className="bg-white h-8 text-xs">
                    <SelectValue placeholder="Route" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PO">PO</SelectItem>
                    <SelectItem value="RT">RT</SelectItem>
                    <SelectItem value="FJ">FJ</SelectItem>
                    <SelectItem value="Jejunal">Jejunal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="font-bold text-slate-700">Mobility</Label>
              <Select value={formData.mobility} onValueChange={v => setFormData({...formData, mobility: v})}>
                <SelectTrigger className="bg-white h-8 text-xs font-bold mt-1">
                  <SelectValue placeholder="Mobility instructions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Strict Bed Rest">Strict Bed Rest</SelectItem>
                  <SelectItem value="Restricted Mobility">Restricted Mobility</SelectItem>
                  <SelectItem value="Full Mobility">Full Mobility</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="font-bold text-slate-700">Foleys / Preparation Needed</Label>
              <Input 
                value={formData.followPrepNeeded} 
                onChange={e => setFormData({...formData, followPrepNeeded: e.target.value})}
                placeholder="Foleys catheter / Bowel prep"
                className="bg-white h-8 text-xs mt-1"
              />
            </div>

            <div>
              <Label className="font-bold text-slate-700">OT Plan</Label>
              <Input 
                value={formData.otPlan} 
                onChange={e => setFormData({...formData, otPlan: e.target.value})}
                placeholder="Planned surgery date / PAC clearance"
                className="bg-white h-8 text-xs mt-1"
              />
            </div>

            <div className="md:col-span-2">
              <Label className="font-bold text-slate-700">Other Instructions</Label>
              <Input 
                value={formData.generalOtherInstructions} 
                onChange={e => setFormData({...formData, generalOtherInstructions: e.target.value})}
                placeholder="Positioning, limb elevation, continuous SpO2 monitoring..."
                className="bg-white h-8 text-xs mt-1"
              />
            </div>
          </div>
        </div>

        {/* SECTION 13: MEDICATION ORDER TABLE */}
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-slate-100 p-2 rounded-lg border-l-4 border-teal-600">
            <div className="flex items-center gap-2 font-extrabold text-xs text-slate-800 uppercase">
              <span>13</span>
              <span>MEDICATION ORDER</span>
            </div>
            <Button 
              size="sm" 
              variant="outline"
              className="h-7 text-xs font-bold gap-1 bg-white border-teal-200 text-teal-700 hover:bg-teal-50"
              onClick={handleAddMedRow}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Medication Line
            </Button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-teal-50">
                <TableRow>
                  <TableHead className="w-12 text-center text-xs font-bold text-teal-900">#</TableHead>
                  <TableHead className="w-28 text-xs font-bold text-teal-900">Drug Form</TableHead>
                  <TableHead className="text-xs font-bold text-teal-900">Drug Name</TableHead>
                  <TableHead className="w-28 text-xs font-bold text-teal-900">Dose</TableHead>
                  <TableHead className="w-28 text-xs font-bold text-teal-900">Frequency</TableHead>
                  <TableHead className="w-28 text-xs font-bold text-teal-900">Time</TableHead>
                  <TableHead className="w-28 text-xs font-bold text-teal-900">Duration</TableHead>
                  <TableHead className="w-12 text-center text-xs font-bold text-teal-900"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {medicationRows.map((row, idx) => (
                  <TableRow key={idx} className="hover:bg-slate-50/60">
                    <TableCell className="text-center font-bold text-xs text-slate-500">{idx + 1}</TableCell>
                    <TableCell>
                      <Select 
                        value={row.form} 
                        onValueChange={v => handleMedRowChange(idx, 'form', v)}
                      >
                        <SelectTrigger className="h-8 text-xs bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Tab.">Tab.</SelectItem>
                          <SelectItem value="Cap.">Cap.</SelectItem>
                          <SelectItem value="Inj.">Inj.</SelectItem>
                          <SelectItem value="Syr.">Syr.</SelectItem>
                          <SelectItem value="IV Fluid">IV Fluid</SelectItem>
                          <SelectItem value="Oint.">Oint.</SelectItem>
                          <SelectItem value="Drops">Drops</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input 
                        value={row.name}
                        onChange={e => handleMedRowChange(idx, 'name', e.target.value)}
                        placeholder="e.g. Pantoprazole 40mg"
                        className="h-8 text-xs font-bold text-teal-900 bg-white"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        value={row.dose}
                        onChange={e => handleMedRowChange(idx, 'dose', e.target.value)}
                        placeholder="e.g. 1 Tab / 10ml"
                        className="h-8 text-xs bg-white"
                      />
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={row.frequency} 
                        onValueChange={v => handleMedRowChange(idx, 'frequency', v)}
                      >
                        <SelectTrigger className="h-8 text-xs bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="OD">OD (Once daily)</SelectItem>
                          <SelectItem value="BD">BD (Twice daily)</SelectItem>
                          <SelectItem value="TDS">TDS (Thrice daily)</SelectItem>
                          <SelectItem value="QID">QID (4 times a day)</SelectItem>
                          <SelectItem value="STAT">STAT (Immediately)</SelectItem>
                          <SelectItem value="SOS">SOS (As needed)</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input 
                        value={row.time}
                        onChange={e => handleMedRowChange(idx, 'time', e.target.value)}
                        placeholder="Morning AC"
                        className="h-8 text-xs bg-white"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        value={row.duration}
                        onChange={e => handleMedRowChange(idx, 'duration', e.target.value)}
                        placeholder="3 Days"
                        className="h-8 text-xs bg-white"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                        onClick={() => handleRemoveMedRow(idx)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Footer & Signature Section */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-xs text-slate-500">
            <p className="font-bold text-slate-700">Attending Consultant Name</p>
            <Input 
              value={formData.consultantName} 
              onChange={e => setFormData({...formData, consultantName: e.target.value})}
              className="bg-slate-50 h-8 text-xs font-bold w-64"
            />
          </div>

          <div className="flex gap-3">
            {editingSheetId && (
              <Button 
                variant="outline" 
                className="text-xs font-bold border-rose-200 text-rose-700 hover:bg-rose-50"
                onClick={handleResetForm}
              >
                Cancel Editing
              </Button>
            )}
            <Button 
              variant="outline" 
              className="gap-2 font-bold border-slate-300"
              onClick={() => handlePrintSheet()}
            >
              <Printer className="w-4 h-4" />
              Print Form
            </Button>
            <Button 
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold gap-2 px-6 shadow-md"
              onClick={handleSaveSheet}
            >
              <Save className="w-4 h-4" />
              {editingSheetId ? 'Update Initial Evaluation Sheet' : 'Save Initial Evaluation Sheet'}
            </Button>
          </div>
        </div>

      </div>

      {/* History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-teal-800">
              <History className="w-5 h-5 text-teal-600" />
              Saved Initial Evaluation Sheets History
            </DialogTitle>
          </DialogHeader>

          {isLoadingHistory ? (
            <div className="p-8 text-center text-xs text-slate-500 animate-pulse">Loading records...</div>
          ) : savedSheets.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">No saved evaluation sheets yet.</div>
          ) : (
            <div className="space-y-3 pt-2">
              <Table>
                <TableHeader className="bg-slate-100">
                  <TableRow>
                    <TableHead className="text-xs font-bold">Date / Time</TableHead>
                    <TableHead className="text-xs font-bold">Patient Name</TableHead>
                    <TableHead className="text-xs font-bold">IPD No</TableHead>
                    <TableHead className="text-xs font-bold">Provisional Diagnosis</TableHead>
                    <TableHead className="text-xs font-bold">Consultant</TableHead>
                    <TableHead className="text-xs font-bold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {savedSheets.map((sheet) => (
                    <TableRow key={sheet.id} className="hover:bg-slate-50">
                      <TableCell className="text-xs font-mono font-medium">
                        {sheet.evaluation_date} {sheet.evaluation_time}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-teal-900">
                        {sheet.patient_name}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {sheet.ipd_no || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs truncate max-w-[200px]">
                        {sheet.provisional_diagnosis || 'Under Evaluation'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {sheet.consultant_name || 'Dr. A. K. Verma'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-7 text-xs font-bold gap-1 border-sky-200 text-sky-700 hover:bg-sky-50"
                            onClick={() => handleEditSheet(sheet)}
                          >
                            <Edit className="w-3.5 h-3.5" />
                            Edit
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-7 text-xs font-bold gap-1 border-teal-200 text-teal-700 hover:bg-teal-50"
                            onClick={() => handlePrintSheet(sheet)}
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Print
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                            onClick={() => handleDeleteSheet(sheet.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
