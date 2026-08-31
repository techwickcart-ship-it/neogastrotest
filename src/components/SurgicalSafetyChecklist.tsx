import React, { useState, useEffect } from 'react';
import { 
  Check, 
  X, 
  ShieldAlert, 
  ClipboardCheck, 
  UserCheck, 
  Save, 
  Clock, 
  CheckCircle,
  HelpCircle,
  Stethoscope,
  Scissors,
  Wrench,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Activity,
  Heart,
  Layers,
  Sparkles,
  Printer,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { storage } from '@/lib/storage';
import { toast } from 'sonner';

interface SurgicalSafetyChecklistProps {
  record: any;
  patient: any;
  onClose: () => void;
  onSave?: () => void;
}

export default function SurgicalSafetyChecklist({ record, patient, onClose, onSave }: SurgicalSafetyChecklistProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [notes, setNotes] = useState('');

  // Signatures and metadata
  const [signatures, setSignatures] = useState({
    surgeonName: record.surgeonName || '',
    surgeonSig: '',
    surgeonDate: new Date().toISOString().substring(0, 10),
    surgeonTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    anesthetistName: record.anesthetistName || '',
    anesthetistSig: '',
    anesthetistDate: new Date().toISOString().substring(0, 10),
    anesthetistTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    nurseName: '',
    nurseSig: '',
    nurseDate: new Date().toISOString().substring(0, 10),
    nurseTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  });

  // Vitals
  const [vitals, setVitals] = useState({
    pr: '',
    bp: '',
    spo2: ''
  });

  // Step 1: SIGN IN (Before induction of anesthesia)
  const [signInChecks, setSignInChecks] = useState({
    patientConfirmedIdentity: false,
    patientConfirmedSite: false,
    patientConfirmedProcedure: false,
    patientConfirmedConsent: false,
    siteMarkedOrNA: false,
    anaesthesiaSafetyCheckCompleted: false,
    pulseOximeterFunctioning: false,
    imagingAndInvestigationAvailable: false,
    adequateAnesthesiaEquipmentAvailable: false,
    relevantImplantAvailable: false,
    positioningDiscussed: false,
    knownAllergy: 'No', // 'No' | 'Yes'
    allergyDetails: '',
    difficultAirwayRisk: 'No', // 'No' | 'Yes' (equipment/assistance available)
    bloodLossRisk: 'No', // 'No' | 'Yes' (adequate access and fluids/blood planned)
    dvtRisk: 'No' // 'No' | 'Yes'
  });

  // Step 2: TIME OUT (Before skin incision)
  const [timeOutChecks, setTimeOutChecks] = useState({
    teamIntroduced: false,
    verballyConfirmPatientSiteProcedureConsent: false,
    imagingCheckedWithIdentity: false,
    criticalStepsReviewedSurgeon: false,
    caseDurationDiscussedSurgeon: false,
    anticipatedBloodLossDiscussedSurgeon: false,
    patientSpecificConcernsAnesthetist: false,
    sterilityConfirmedNursing: false,
    equipmentIssuesAddressedNursing: false,
    antibioticProphylaxisGiven: 'Yes', // 'Yes' | 'NA'
    essentialImagingDisplayed: 'Yes' // 'Yes' | 'NA'
  });

  // Step 3: SIGN OUT (Before patient leaves operating room)
  const [signOutChecks, setSignOutChecks] = useState({
    procedureNameRecorded: false,
    instrumentSpongeNeedleCountsCorrect: false,
    specimenLabeledCorrectly: false,
    equipmentProblemsAddressed: false,
    recoveryManagementReviewed: false
  });

  // Load existing checklist state if available
  useEffect(() => {
    const savedChecklists = storage.get('hms_ot_surgical_checklists', {});
    const saved = savedChecklists[record.id];
    if (saved) {
      if (saved.signInChecks) setSignInChecks(saved.signInChecks);
      if (saved.timeOutChecks) setTimeOutChecks(saved.timeOutChecks);
      if (saved.signOutChecks) setSignOutChecks(saved.signOutChecks);
      if (saved.signatures) setSignatures(saved.signatures);
      if (saved.vitals) setVitals(saved.vitals);
      if (saved.notes) setNotes(saved.notes);
      if (saved.currentStep) setCurrentStep(saved.currentStep);
    }
  }, [record.id]);

  // Calculate completeness score
  const totalChecks = 
    Object.keys(signInChecks).length - 2 + // subtract details & radio choices
    Object.keys(timeOutChecks).length - 2 + 
    Object.keys(signOutChecks).length;

  const completedChecksCount = 
    Object.values(signInChecks).filter(v => typeof v === 'boolean' && v).length + 
    Object.values(timeOutChecks).filter(v => typeof v === 'boolean' && v).length + 
    Object.values(signOutChecks).filter(v => typeof v === 'boolean' && v).length;

  const percentComplete = Math.round((completedChecksCount / totalChecks) * 100);

  const handleSave = () => {
    if (!signatures.nurseName.trim()) {
      toast.error('Please enter the Nurse Coordinator Name');
      return;
    }

    const savedChecklists = storage.get('hms_ot_surgical_checklists', {});
    savedChecklists[record.id] = {
      recordId: record.id,
      signInChecks,
      timeOutChecks,
      signOutChecks,
      signatures,
      vitals,
      notes,
      percentComplete,
      currentStep,
      updatedAt: new Date().toISOString()
    };

    storage.set('hms_ot_surgical_checklists', savedChecklists);
    toast.success('WHO Surgical Safety Checklist archived successfully!');
    if (onSave) onSave();
    onClose();
  };

  const nextStep = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handlePrint = (printBlank = false) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Failed to open print layout. Please disable popup blockers.');
      return;
    }

    const patName = printBlank ? '________________________________________' : (patient?.name || '____________________');
    const patMrn = printBlank ? '____________________' : (patient?.mrn || '____________________');
    const patDob = printBlank ? '____________' : (patient?.dob || 'N/A');
    const patAge = printBlank ? '________' : (patient?.age || 'N/A');
    const patGender = printBlank ? '________' : (patient?.gender || 'N/A');

    const prVal = printBlank ? '___________' : (vitals.pr || '___________');
    const bpVal = printBlank ? '___________' : (vitals.bp || '___________');
    const spo2Val = printBlank ? '___________' : (vitals.spo2 || '___________');

    const box = (checked: boolean) => `
      <span style="display:inline-block; width:12px; height:12px; border:1px solid #000; text-align:center; line-height:10px; font-size:10px; font-weight:bold; font-family: monospace; margin-right:4px;">
        ${checked ? '✓' : '&nbsp;'}
      </span>
    `;

    const radioBox = (checked: boolean) => `
      <span style="display:inline-block; width:12px; height:12px; border:1px solid #000; border-radius:50%; text-align:center; line-height:10px; font-size:10px; font-weight:bold; font-family: monospace; margin-right:4px;">
        ${checked ? '●' : '&nbsp;'}
      </span>
    `;

    printWindow.document.write(`
      <html>
        <head>
          <title>Surgical Safety Checklist - ${patient?.name || 'Manual'}</title>
          <style>
            * { box-sizing: border-box; -webkit-font-smoothing: antialiased !important; -moz-osx-font-smoothing: grayscale !important; }
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 20px; color: #000000 !important; line-height: 1.4; font-size: 11px; font-weight: 600; }
            .header-table { width: 100%; border-bottom: 2.5px solid #000000; padding-bottom: 10px; margin-bottom: 15px; }
            .hospital-name { font-size: 20px; font-weight: 900; letter-spacing: -0.5px; margin: 0; color: #000000 !important; text-transform: uppercase; }
            .doc-title { font-size: 16px; font-weight: 900; margin: 5px 0 0 0; text-transform: uppercase; letter-spacing: 0.5px; color: #000000 !important; }
            .patient-info { width: 100%; border: 1.5px solid #000000; padding: 8px; border-radius: 4px; margin-bottom: 15px; font-size: 11px; font-weight: 700; color: #000000 !important; }
            .patient-info td { padding: 4px; color: #000000 !important; }
            .checklist-grid { display: table; width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .column { display: table-cell; width: 33.33%; border: 1.5px solid #000000; padding: 10px; vertical-align: top; color: #000000 !important; }
            .column-header { background-color: #f0f0f0 !important; border-bottom: 2px solid #000000; font-weight: 900; font-size: 12px; text-transform: uppercase; padding: 6px; margin: -10px -10px 10px -10px; text-align: center; color: #000000 !important; }
            .section-sub { font-weight: 900; text-transform: uppercase; margin-top: 8px; margin-bottom: 4px; font-size: 10px; border-bottom: 1px dashed #000000; padding-bottom: 2px; color: #000000 !important; }
            .item { margin-bottom: 6px; display: flex; align-items: flex-start; color: #000000 !important; }
            .item-text { margin-left: 2px; font-weight: 600; color: #000000 !important; }
            .vitals-box { border: 1.5px solid #000000; padding: 6px; background: #fafafa; margin-top: 10px; color: #000000 !important; }
            .vitals-title { font-weight: 900; font-size: 9px; text-transform: uppercase; margin-bottom: 4px; color: #000000 !important; }
            .signatures-table { width: 100%; border-collapse: collapse; margin-top: 20px; page-break-inside: avoid; }
            .signatures-table th, .signatures-table td { border: 1.5px solid #000000; padding: 8px; font-size: 10px; text-align: left; color: #000000 !important; font-weight: 700; }
            .signatures-table th { background-color: #f9f9f9 !important; font-weight: 900; color: #000000 !important; }
            .sig-line { font-family: 'Georgia', serif; font-style: italic; font-size: 14px; color: #000000 !important; font-weight: bold; }
            .footer { text-align: center; font-size: 9px; color: #000000 !important; margin-top: 30px; border-top: 1px solid #000000; padding-top: 10px; font-weight: 600; }
            @media print {
              * { color: #000000 !important; border-color: #000000 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              body { padding: 10px; color: #000000 !important; font-weight: 600 !important; }
              .column { height: 600px; }
            }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td style="width: 70%;">
                <h1 class="hospital-name">GASTRO PLUS HOSPITAL</h1>
                <div style="font-size: 10px; font-weight: bold; margin-top: 2px; color: #333;">CMHO Reg. & License No.: NH327/DEC/2027</div>
                <div style="font-size: 9px; font-weight: bold; margin-bottom: 3px; color: #555;">Plot No. 7 & 8, Om Shiv Nagar, Gufa Mandir Road, Lal Ghati Bhopal, 462030, Madhya Pradesh | Ph: 9109102145/9109101246</div>
              </td>
              <td style="text-align: right; vertical-align: bottom;">
                <div class="doc-title" style="font-size: 18px; font-weight: 900; text-transform: uppercase;">Surgical Safety Record</div>
                <div style="font-size: 10px; font-weight: bold; color: #444;">WHO Patient Safety Protocol</div>
              </td>
            </tr>
          </table>

          <table class="patient-info">
            <tr>
              <td><strong>Name of the Patient:</strong> ${patName}</td>
              <td><strong>I/D No.:</strong> ${patMrn}</td>
              <td><strong>Age/Sex:</strong> ${patAge} / ${patGender}</td>
            </tr>
            <tr>
              <td><strong>Scheduled Surgery:</strong> ${printBlank ? '________________________________________' : (record.operationName || 'Surgical Procedure')}</td>
              <td><strong>Room No.:</strong> ${printBlank ? '____________' : (record.roomNo || patient?.bedNo || 'OT-1')}</td>
              <td><strong>Date:</strong> ${printBlank ? '____________' : (record.date || new Date().toISOString().substring(0, 10))}</td>
            </tr>
          </table>

          <div class="checklist-grid">
            <!-- SIGN IN COLUMN -->
            <div class="column">
              <div class="column-header" style="border-bottom: 2px solid #312e81; background-color: #e0e7ff;">SIGN IN (Before Induction)</div>
              
              <div class="section-sub">Patient Confirmation</div>
              <div class="item">
                ${box(!printBlank && signInChecks.patientConfirmedIdentity)}
                <span class="item-text">Identity Confirmed</span>
              </div>
              <div class="item">
                ${box(!printBlank && signInChecks.patientConfirmedSite)}
                <span class="item-text">Surgical Site Confirmed</span>
              </div>
              <div class="item">
                ${box(!printBlank && signInChecks.patientConfirmedProcedure)}
                <span class="item-text">Planned Procedure Confirmed</span>
              </div>
              <div class="item">
                ${box(!printBlank && signInChecks.patientConfirmedConsent)}
                <span class="item-text">Written Surgical Consent Form Signed</span>
              </div>

              <div class="section-sub">Site & Safety Check</div>
              <div class="item">
                ${box(!printBlank && signInChecks.siteMarkedOrNA)}
                <span class="item-text">Surgical Site Marked / N/A</span>
              </div>
              <div class="item">
                ${box(!printBlank && signInChecks.anaesthesiaSafetyCheckCompleted)}
                <span class="item-text">Anesthesia Safety Machine Check Completed</span>
              </div>
              <div class="item">
                ${box(!printBlank && signInChecks.pulseOximeterFunctioning)}
                <span class="item-text">Pulse Oximeter Placed & Functioning</span>
              </div>
              <div class="item">
                ${box(!printBlank && signInChecks.imagingAndInvestigationAvailable)}
                <span class="item-text">Imaging & Diagnostics Available</span>
              </div>
              <div class="item">
                ${box(!printBlank && signInChecks.adequateAnesthesiaEquipmentAvailable)}
                <span class="item-text">Equipment, Assist & Meds Checked</span>
              </div>
              <div class="item">
                ${box(!printBlank && signInChecks.relevantImplantAvailable)}
                <span class="item-text">Special Implants / Hardware Checked</span>
              </div>
              <div class="item">
                ${box(!printBlank && signInChecks.positioningDiscussed)}
                <span class="item-text">Patient Positioning Discussed</span>
              </div>

              <div class="section-sub">Clinical Risks Assessed</div>
              <div style="margin-left: 5px; margin-bottom: 5px;">
                <strong>Known Allergy?</strong><br/>
                ${radioBox(!printBlank && signInChecks.knownAllergy === 'No')} No
                ${radioBox(!printBlank && signInChecks.knownAllergy === 'Yes')} Yes
                ${!printBlank && signInChecks.knownAllergy === 'Yes' ? `<br/><span style="font-size:9px;color:#555;">Details: ${signInChecks.allergyDetails}</span>` : ''}
              </div>
              <div style="margin-left: 5px; margin-bottom: 5px;">
                <strong>Difficult Airway / Aspiration Risk?</strong><br/>
                ${radioBox(!printBlank && signInChecks.difficultAirwayRisk === 'No')} No
                ${radioBox(!printBlank && signInChecks.difficultAirwayRisk === 'Yes')} Yes (Meds & rescue at hand)
              </div>
              <div style="margin-left: 5px; margin-bottom: 5px;">
                <strong>Risk of >500ml Blood Loss?</strong><br/>
                ${radioBox(!printBlank && signInChecks.bloodLossRisk === 'No')} No
                ${radioBox(!printBlank && signInChecks.bloodLossRisk === 'Yes')} Yes (2 IV access lines & blood ready)
              </div>
              <div style="margin-left: 5px; margin-bottom: 5px;">
                <strong>Moderate / High DVT Risk?</strong><br/>
                ${radioBox(!printBlank && signInChecks.dvtRisk === 'No')} No
                ${radioBox(!printBlank && signInChecks.dvtRisk === 'Yes')} Yes (Intraop prophylaxis planned)
              </div>

              <div class="vitals-box">
                <div class="vitals-title">Pre-Op Vital Log</div>
                Pulse Rate: <strong>${prVal} / Min</strong><br/>
                Blood Pressure: <strong>${bpVal} mmHg</strong><br/>
                SpO2 Value: <strong>${spo2Val} %</strong>
              </div>
            </div>

            <!-- TIME OUT COLUMN -->
            <div class="column">
              <div class="column-header" style="border-bottom: 2px solid #b45309; background-color: #fef3c7;">TIME OUT (Before Incision)</div>
              
              <div class="section-sub">Team Introductions</div>
              <div class="item">
                ${box(!printBlank && timeOutChecks.teamIntroduced)}
                <span class="item-text">All members introduced by name and role</span>
              </div>

              <div class="section-sub">Verbal Patient Verification</div>
              <div class="item">
                ${box(!printBlank && timeOutChecks.verballyConfirmPatientSiteProcedureConsent)}
                <span class="item-text">Verbally verified Patient, Site, Procedure & Consent</span>
              </div>
              <div class="item">
                ${box(!printBlank && timeOutChecks.imagingCheckedWithIdentity)}
                <span class="item-text">Diagnostic images verified with correct ID</span>
              </div>

              <div class="section-sub">Anticipated Critical Events</div>
              <div class="item">
                ${box(!printBlank && timeOutChecks.criticalStepsReviewedSurgeon)}
                <span class="item-text">Surgeon: Critical / non-routine steps reviewed</span>
              </div>
              <div class="item">
                ${box(!printBlank && timeOutChecks.caseDurationDiscussedSurgeon)}
                <span class="item-text">Surgeon: Case duration discussed</span>
              </div>
              <div class="item">
                ${box(!printBlank && timeOutChecks.anticipatedBloodLossDiscussedSurgeon)}
                <span class="item-text">Surgeon: Anticipated blood loss discussed</span>
              </div>
              <div class="item">
                ${box(!printBlank && timeOutChecks.patientSpecificConcernsAnesthetist)}
                <span class="item-text">Anesthetist: Patient-specific recovery concerns</span>
              </div>
              <div class="item">
                ${box(!printBlank && timeOutChecks.sterilityConfirmedNursing)}
                <span class="item-text">Nursing: Sterility & indicators confirmed</span>
              </div>
              <div class="item">
                ${box(!printBlank && timeOutChecks.equipmentIssuesAddressedNursing)}
                <span class="item-text">Nursing: Equipment / implant issues resolved</span>
              </div>

              <div class="section-sub">Prophylaxis & Display</div>
              <div style="margin-left: 5px; margin-bottom: 5px;">
                <strong>Antibiotic Prophylaxis (last 60 min)?</strong><br/>
                ${radioBox(!printBlank && timeOutChecks.antibioticProphylaxisGiven === 'Yes')} Yes
                ${radioBox(!printBlank && timeOutChecks.antibioticProphylaxisGiven === 'NA')} N/A
              </div>
              <div style="margin-left: 5px; margin-bottom: 5px;">
                <strong>Essential Imaging Displayed in OR?</strong><br/>
                ${radioBox(!printBlank && timeOutChecks.essentialImagingDisplayed === 'Yes')} Yes
                ${radioBox(!printBlank && timeOutChecks.essentialImagingDisplayed === 'NA')} N/A
              </div>
            </div>

            <!-- SIGN OUT COLUMN -->
            <div class="column">
              <div class="column-header" style="border-bottom: 2px solid #047857; background-color: #d1fae5;">SIGN OUT (Before Leaves OR)</div>
              
              <div class="section-sub">Nurse Verbal Confirmations</div>
              <div class="item">
                ${box(!printBlank && signOutChecks.procedureNameRecorded)}
                <span class="item-text">Name of planned procedure recorded</span>
              </div>
              <div class="item">
                ${box(!printBlank && signOutChecks.instrumentSpongeNeedleCountsCorrect)}
                <span class="item-text">Instrument, sponge and needle counts correct</span>
              </div>
              <div class="item">
                ${box(!printBlank && signOutChecks.specimenLabeledCorrectly)}
                <span class="item-text">Specimen container labeled (ID & details verified)</span>
              </div>
              <div class="item">
                ${box(!printBlank && signOutChecks.equipmentProblemsAddressed)}
                <span class="item-text">Any equipment problems identified and resolved</span>
              </div>

              <div class="section-sub">Post-Operative Plan</div>
              <div class="item">
                ${box(!printBlank && signOutChecks.recoveryManagementReviewed)}
                <span class="item-text">Surgeon, Anesthetist & Nurse review key concerns for recovery and management</span>
              </div>

              <div class="vitals-box" style="margin-top: 30px; border-color: #047857;">
                <div class="vitals-title" style="color: #047857;">Audit & Verification Note</div>
                <div style="font-size: 9px; line-height: 1.3;">
                  ${printBlank ? '________________________________________________________________________________' : (notes || 'No extra auditing notes documented.')}
                </div>
              </div>
            </div>
          </div>

          <table class="signatures-table">
            <thead>
              <tr>
                <th>Clinical Role</th>
                <th>Staff Name</th>
                <th>Digital Signature / Physical Verification Mark</th>
                <th>Date</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>SURGEON</strong></td>
                <td>${printBlank ? '____________________' : (signatures.surgeonName || 'N/A')}</td>
                <td class="sig-line">${printBlank ? '' : (signatures.surgeonSig || '✓ Signed Electronically')}</td>
                <td>${printBlank ? '__________' : signatures.surgeonDate}</td>
                <td>${printBlank ? '____:____' : signatures.surgeonTime}</td>
              </tr>
              <tr>
                <td><strong>ANAESTHETIST</strong></td>
                <td>${printBlank ? '____________________' : (signatures.anesthetistName || 'N/A')}</td>
                <td class="sig-line">${printBlank ? '' : (signatures.anesthetistSig || '✓ Signed Electronically')}</td>
                <td>${printBlank ? '__________' : signatures.anesthetistDate}</td>
                <td>${printBlank ? '____:____' : signatures.anesthetistTime}</td>
              </tr>
              <tr>
                <td><strong>NURSE (Coordinator)</strong></td>
                <td>${printBlank ? '____________________' : (signatures.nurseName || 'N/A')}</td>
                <td class="sig-line">${printBlank ? '' : (signatures.nurseSig || '✓ Signed Electronically')}</td>
                <td>${printBlank ? '__________' : signatures.nurseDate}</td>
                <td>${printBlank ? '____:____' : signatures.nurseTime}</td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            This is a clinical security check sheet authorized by Neo Gastroplus Hospital.<br/>
            Ref: WHO Guidelines for Safe Surgery 2009. Generated on ${new Date().toLocaleString()}.
          </div>

          <script>
            window.onload = function() { window.print(); }
            window.onafterprint = function() { window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    toast.success(printBlank ? 'Blank checklist template generated' : 'Completed checklist printed successfully!');
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="fixed inset-0 top-0 left-0 translate-x-0 translate-y-0 w-screen h-screen max-w-none max-h-none sm:max-w-none rounded-none m-0 p-0 flex flex-col bg-slate-50 overflow-hidden border-none shadow-none z-50 text-slate-800">
        {/* Header section with progress indicator */}
        <DialogHeader className="p-6 bg-gradient-to-r from-slate-900 to-slate-850 text-white relative shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500 text-white">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <DialogTitle className="text-xl font-black tracking-tight">Neo Gastro Plus Hospital — Surgical Safety Record</DialogTitle>
              </div>
              <DialogDescription className="text-xs font-semibold text-slate-300">
                Operating Theatre Safety Compliance for <span className="text-emerald-400 font-extrabold">{patient?.name || 'Unknown Patient'}</span> • MRN: <span className="text-emerald-400 font-extrabold">{patient?.mrn || 'N/A'}</span>
              </DialogDescription>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <Button 
                variant="outline" 
                onClick={() => handlePrint(true)} 
                className="bg-white/10 hover:bg-white/20 border-white/20 text-white font-bold text-xs gap-1 h-9"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Blank Form
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handlePrint(false)} 
                className="bg-emerald-500 hover:bg-emerald-600 border-none text-white font-bold text-xs gap-1 h-9"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Filled Form
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onClose} 
                className="text-white hover:bg-white/20 rounded-full h-8 w-8 ml-2"
                title="Close"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Quick Procedure & Patient summary bar */}
        <div className="px-6 py-3.5 grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs">
            <Stethoscope className="w-4 h-4 text-indigo-500" />
            <div>
              <span className="font-bold text-slate-400 block uppercase tracking-widest text-[9px]">Procedure</span>
              <span className="font-black text-slate-800">{record.operationName}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <UserCheck className="w-4 h-4 text-teal-500" />
            <div>
              <span className="font-bold text-slate-400 block uppercase tracking-widest text-[9px]">Surgeon</span>
              <span className="font-black text-slate-800">{signatures.surgeonName || 'Assigned Surgeon'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Clock className="w-4 h-4 text-amber-500" />
            <div>
              <span className="font-bold text-slate-400 block uppercase tracking-widest text-[9px]">Schedule</span>
              <span className="font-black text-slate-800">{record.date || record.scheduled_date || 'Today'} • {record.startTime || record.scheduled_time || 'Pending'}</span>
            </div>
          </div>
        </div>

        {/* Interactive Step Progress Tracker */}
        <div className="px-6 py-4 bg-white border-b border-slate-100">
          <div className="flex items-center justify-between relative max-w-2xl mx-auto">
            {/* Step 1 */}
            <button 
              type="button"
              onClick={() => setCurrentStep(1)}
              className="flex flex-col items-center z-10 focus:outline-none"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                currentStep === 1 
                  ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' 
                  : currentStep > 1 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'
              }`}>
                1
              </div>
              <span className={`text-[10px] font-black uppercase mt-1 tracking-tight ${currentStep === 1 ? 'text-indigo-600' : 'text-slate-400'}`}>1. SIGN IN</span>
            </button>

            {/* Line 1 */}
            <div className={`flex-1 h-1 mx-2 rounded ${currentStep > 1 ? 'bg-indigo-500' : 'bg-slate-100'}`} />

            {/* Step 2 */}
            <button 
              type="button"
              onClick={() => setCurrentStep(2)}
              className="flex flex-col items-center z-10 focus:outline-none"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                currentStep === 2 
                  ? 'bg-amber-500 text-white ring-4 ring-amber-100' 
                  : currentStep > 2 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'
              }`}>
                2
              </div>
              <span className={`text-[10px] font-black uppercase mt-1 tracking-tight ${currentStep === 2 ? 'text-amber-500' : 'text-slate-400'}`}>2. TIME OUT</span>
            </button>

            {/* Line 2 */}
            <div className={`flex-1 h-1 mx-2 rounded ${currentStep > 2 ? 'bg-amber-500' : 'bg-slate-100'}`} />

            {/* Step 3 */}
            <button 
              type="button"
              onClick={() => setCurrentStep(3)}
              className="flex flex-col items-center z-10 focus:outline-none"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                currentStep === 3 
                  ? 'bg-emerald-600 text-white ring-4 ring-emerald-100' 
                  : 'bg-slate-100 text-slate-400'
              }`}>
                3
              </div>
              <span className={`text-[10px] font-black uppercase mt-1 tracking-tight ${currentStep === 3 ? 'text-emerald-600' : 'text-slate-400'}`}>3. SIGN OUT</span>
            </button>
          </div>
        </div>

        {/* Step Contents */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0 bg-slate-50/50">
          {/* STEP 1: SIGN IN */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-indigo-50 border border-indigo-100">
                <ShieldAlert className="w-5 h-5 text-indigo-600 shrink-0" />
                <p className="text-xs font-bold text-indigo-800 leading-relaxed">
                  <span className="uppercase font-black mr-1">Phase 1: SIGN IN (Before induction of anaesthesia)</span>
                  Verify patient details, marking, anesthesia risks, and record baseline vitals.
                </p>
              </div>

              {/* Vitals Input Box */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-xs grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Pulse Rate (PR) *</Label>
                  <Input 
                    placeholder="e.g. 78 bpm" 
                    value={vitals.pr} 
                    onChange={e => setVitals({...vitals, pr: e.target.value})}
                    className="text-xs font-semibold h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Blood Pressure (BP) *</Label>
                  <Input 
                    placeholder="e.g. 120/80 mmHg" 
                    value={vitals.bp} 
                    onChange={e => setVitals({...vitals, bp: e.target.value})}
                    className="text-xs font-semibold h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Oxygen Saturation (SpO2) *</Label>
                  <Input 
                    placeholder="e.g. 98%" 
                    value={vitals.spo2} 
                    onChange={e => setVitals({...vitals, spo2: e.target.value})}
                    className="text-xs font-semibold h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 cursor-pointer bg-white hover:border-indigo-300 hover:shadow-xs transition-all">
                  <Checkbox 
                    checked={signInChecks.patientConfirmedIdentity}
                    onCheckedChange={checked => setSignInChecks({...signInChecks, patientConfirmedIdentity: !!checked})}
                    className="shrink-0 mt-0.5"
                  />
                  <div className="space-y-1 text-xs min-w-0 flex-1">
                    <p className="font-extrabold text-slate-900 leading-snug">Patient Confirmed Identity</p>
                    <p className="text-slate-500 leading-normal">Verbally checked full legal name with ID band</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 cursor-pointer bg-white hover:border-indigo-300 hover:shadow-xs transition-all">
                  <Checkbox 
                    checked={signInChecks.patientConfirmedSite}
                    onCheckedChange={checked => setSignInChecks({...signInChecks, patientConfirmedSite: !!checked})}
                    className="shrink-0 mt-0.5"
                  />
                  <div className="space-y-1 text-xs min-w-0 flex-1">
                    <p className="font-extrabold text-slate-900 leading-snug">Surgical Site Confirmed</p>
                    <p className="text-slate-500 leading-normal">Patient verbally confirmed scheduled incision area</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 cursor-pointer bg-white hover:border-indigo-300 hover:shadow-xs transition-all">
                  <Checkbox 
                    checked={signInChecks.patientConfirmedProcedure}
                    onCheckedChange={checked => setSignInChecks({...signInChecks, patientConfirmedProcedure: !!checked})}
                    className="shrink-0 mt-0.5"
                  />
                  <div className="space-y-1 text-xs min-w-0 flex-1">
                    <p className="font-extrabold text-slate-900 leading-snug">Surgical Procedure Confirmed</p>
                    <p className="text-slate-500 leading-normal">Double verified target diagnostic or therapeutic procedure</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 cursor-pointer bg-white hover:border-indigo-300 hover:shadow-xs transition-all">
                  <Checkbox 
                    checked={signInChecks.patientConfirmedConsent}
                    onCheckedChange={checked => setSignInChecks({...signInChecks, patientConfirmedConsent: !!checked})}
                    className="shrink-0 mt-0.5"
                  />
                  <div className="space-y-1 text-xs min-w-0 flex-1">
                    <p className="font-extrabold text-slate-900 leading-snug">Written Informed Consent Verified</p>
                    <p className="text-slate-500 leading-normal">Signed clinical consent form physically verified in file</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 cursor-pointer bg-white hover:border-indigo-300 hover:shadow-xs transition-all">
                  <Checkbox 
                    checked={signInChecks.siteMarkedOrNA}
                    onCheckedChange={checked => setSignInChecks({...signInChecks, siteMarkedOrNA: !!checked})}
                    className="shrink-0 mt-0.5"
                  />
                  <div className="space-y-1 text-xs min-w-0 flex-1">
                    <p className="font-extrabold text-slate-900 leading-snug">Surgical Site Marked / N/A</p>
                    <p className="text-slate-500 leading-normal">Visible permanent skin marker checked (or not applicable)</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 cursor-pointer bg-white hover:border-indigo-300 hover:shadow-xs transition-all">
                  <Checkbox 
                    checked={signInChecks.anaesthesiaSafetyCheckCompleted}
                    onCheckedChange={checked => setSignInChecks({...signInChecks, anaesthesiaSafetyCheckCompleted: !!checked})}
                    className="shrink-0 mt-0.5"
                  />
                  <div className="space-y-1 text-xs min-w-0 flex-1">
                    <p className="font-extrabold text-slate-900 leading-snug">Anaesthesia Machine Safety Check</p>
                    <p className="text-slate-500 leading-normal">Suction, gases, ventilator and drug checklist complete</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 cursor-pointer bg-white hover:border-indigo-300 hover:shadow-xs transition-all">
                  <Checkbox 
                    checked={signInChecks.pulseOximeterFunctioning}
                    onCheckedChange={checked => setSignInChecks({...signInChecks, pulseOximeterFunctioning: !!checked})}
                    className="shrink-0 mt-0.5"
                  />
                  <div className="space-y-1 text-xs min-w-0 flex-1">
                    <p className="font-extrabold text-slate-900 leading-snug">Pulse Oximeter Placed & Active</p>
                    <p className="text-slate-500 leading-normal">Verify monitor sound is audible and reading oxygen baseline</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 cursor-pointer bg-white hover:border-indigo-300 hover:shadow-xs transition-all sm:col-span-2 lg:col-span-2">
                  <Checkbox 
                    checked={signInChecks.imagingAndInvestigationAvailable}
                    onCheckedChange={checked => setSignInChecks({...signInChecks, imagingAndInvestigationAvailable: !!checked})}
                    className="shrink-0 mt-0.5"
                  />
                  <div className="space-y-1 text-xs min-w-0 flex-1">
                    <p className="font-extrabold text-slate-900 leading-snug">Imaging & Diagnostic Reports Present</p>
                    <p className="text-slate-500 leading-normal">CT, MRI, X-rays or blood records open in theatre</p>
                  </div>
                </label>
              </div>

              {/* Radio options for risks */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/60 space-y-4 text-xs font-semibold">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-bold text-slate-800">1. Does the patient have a Known Allergy?</Label>
                    <div className="flex gap-4 mt-1">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input 
                          type="radio" 
                          name="allergy" 
                          checked={signInChecks.knownAllergy === 'No'}
                          onChange={() => setSignInChecks({...signInChecks, knownAllergy: 'No'})}
                        />
                        No
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input 
                          type="radio" 
                          name="allergy" 
                          checked={signInChecks.knownAllergy === 'Yes'}
                          onChange={() => setSignInChecks({...signInChecks, knownAllergy: 'Yes'})}
                        />
                        Yes
                      </label>
                    </div>
                    {signInChecks.knownAllergy === 'Yes' && (
                      <Input 
                        placeholder="Specify allergen (e.g. Penicillin, Latex)"
                        value={signInChecks.allergyDetails}
                        onChange={e => setSignInChecks({...signInChecks, allergyDetails: e.target.value})}
                        className="text-xs h-8 mt-1.5"
                      />
                    )}
                  </div>

                  <div>
                    <Label className="font-bold text-slate-800">2. Difficult Airway / Aspiration Risk?</Label>
                    <div className="flex gap-4 mt-1">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input 
                          type="radio" 
                          name="airway" 
                          checked={signInChecks.difficultAirwayRisk === 'No'}
                          onChange={() => setSignInChecks({...signInChecks, difficultAirwayRisk: 'No'})}
                        />
                        No
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input 
                          type="radio" 
                          name="airway" 
                          checked={signInChecks.difficultAirwayRisk === 'Yes'}
                          onChange={() => setSignInChecks({...signInChecks, difficultAirwayRisk: 'Yes'})}
                        />
                        Yes (Equipment & help is available)
                      </label>
                    </div>
                  </div>

                  <div>
                    <Label className="font-bold text-slate-800">3. Risk of &gt;500ml Blood Loss?</Label>
                    <div className="flex gap-4 mt-1">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input 
                          type="radio" 
                          name="blood" 
                          checked={signInChecks.bloodLossRisk === 'No'}
                          onChange={() => setSignInChecks({...signInChecks, bloodLossRisk: 'No'})}
                        />
                        No
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input 
                          type="radio" 
                          name="blood" 
                          checked={signInChecks.bloodLossRisk === 'Yes'}
                          onChange={() => setSignInChecks({...signInChecks, bloodLossRisk: 'Yes'})}
                        />
                        Yes (2 IV lines & blood planned)
                      </label>
                    </div>
                  </div>

                  <div>
                    <Label className="font-bold text-slate-800">4. Moderate / High DVT Risk?</Label>
                    <div className="flex gap-4 mt-1">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input 
                          type="radio" 
                          name="dvt" 
                          checked={signInChecks.dvtRisk === 'No'}
                          onChange={() => setSignInChecks({...signInChecks, dvtRisk: 'No'})}
                        />
                        No
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input 
                          type="radio" 
                          name="dvt" 
                          checked={signInChecks.dvtRisk === 'Yes'}
                          onChange={() => setSignInChecks({...signInChecks, dvtRisk: 'Yes'})}
                        />
                        Yes (Intraop compression planned)
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: TIME OUT */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <p className="text-xs font-bold text-amber-800 leading-relaxed">
                  <span className="uppercase font-black mr-1">Phase 2: TIME OUT (Before skin incision)</span>
                  Verbal team time-out immediately before incision. Verify correct patient, site, antibiotics and anticipated critical steps.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 cursor-pointer bg-white hover:border-amber-300 hover:shadow-xs transition-all">
                  <Checkbox 
                    checked={timeOutChecks.teamIntroduced}
                    onCheckedChange={checked => setTimeOutChecks({...timeOutChecks, teamIntroduced: !!checked})}
                    className="shrink-0 mt-0.5"
                  />
                  <div className="space-y-1 text-xs min-w-0 flex-1">
                    <p className="font-extrabold text-slate-900 leading-snug">Team Introductions Complete</p>
                    <p className="text-slate-500 leading-normal">Every member introduced themselves by name and role</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 cursor-pointer bg-white hover:border-amber-300 hover:shadow-xs transition-all">
                  <Checkbox 
                    checked={timeOutChecks.verballyConfirmPatientSiteProcedureConsent}
                    onCheckedChange={checked => setTimeOutChecks({...timeOutChecks, verballyConfirmPatientSiteProcedureConsent: !!checked})}
                    className="shrink-0 mt-0.5"
                  />
                  <div className="space-y-1 text-xs min-w-0 flex-1">
                    <p className="font-extrabold text-slate-900 leading-snug">Verbal Clinical Confirmation</p>
                    <p className="text-slate-500 leading-normal">Surgeon, Anaesthetist & Nurse confirmed Patient, Site, Procedure & Consent</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 cursor-pointer bg-white hover:border-amber-300 hover:shadow-xs transition-all">
                  <Checkbox 
                    checked={timeOutChecks.imagingCheckedWithIdentity}
                    onCheckedChange={checked => setTimeOutChecks({...timeOutChecks, imagingCheckedWithIdentity: !!checked})}
                    className="shrink-0 mt-0.5"
                  />
                  <div className="space-y-1 text-xs min-w-0 flex-1">
                    <p className="font-extrabold text-slate-900 leading-snug">Diagnostic Imaging Crosscheck</p>
                    <p className="text-slate-500 leading-normal">Correct patient diagnostic scans displayed in OT room</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 cursor-pointer bg-white hover:border-amber-300 hover:shadow-xs transition-all">
                  <Checkbox 
                    checked={timeOutChecks.criticalStepsReviewedSurgeon}
                    onCheckedChange={checked => setTimeOutChecks({...timeOutChecks, criticalStepsReviewedSurgeon: !!checked})}
                    className="shrink-0 mt-0.5"
                  />
                  <div className="space-y-1 text-xs min-w-0 flex-1">
                    <p className="font-extrabold text-slate-900 leading-snug">Surgeon: Non-Routine Steps Discussed</p>
                    <p className="text-slate-500 leading-normal">Surgeon reviewed critical parts, bleeding risk or anatomies</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 cursor-pointer bg-white hover:border-amber-300 hover:shadow-xs transition-all">
                  <Checkbox 
                    checked={timeOutChecks.caseDurationDiscussedSurgeon}
                    onCheckedChange={checked => setTimeOutChecks({...timeOutChecks, caseDurationDiscussedSurgeon: !!checked})}
                    className="shrink-0 mt-0.5"
                  />
                  <div className="space-y-1 text-xs min-w-0 flex-1">
                    <p className="font-extrabold text-slate-900 leading-snug">Surgeon: Estimated Case Duration</p>
                    <p className="text-slate-500 leading-normal">Estimated duration of surgical procedure has been aligned</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 cursor-pointer bg-white hover:border-amber-300 hover:shadow-xs transition-all">
                  <Checkbox 
                    checked={timeOutChecks.anticipatedBloodLossDiscussedSurgeon}
                    onCheckedChange={checked => setTimeOutChecks({...timeOutChecks, anticipatedBloodLossDiscussedSurgeon: !!checked})}
                    className="shrink-0 mt-0.5"
                  />
                  <div className="space-y-1 text-xs min-w-0 flex-1">
                    <p className="font-extrabold text-slate-900 leading-snug">Surgeon: Blood Loss Estimate</p>
                    <p className="text-slate-500 leading-normal">Anticipated intra-operative blood volume loss discussed</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 cursor-pointer bg-white hover:border-amber-300 hover:shadow-xs transition-all">
                  <Checkbox 
                    checked={timeOutChecks.patientSpecificConcernsAnesthetist}
                    onCheckedChange={checked => setTimeOutChecks({...timeOutChecks, patientSpecificConcernsAnesthetist: !!checked})}
                    className="shrink-0 mt-0.5"
                  />
                  <div className="space-y-1 text-xs min-w-0 flex-1">
                    <p className="font-extrabold text-slate-900 leading-snug">Anaesthetist: Patient Patient-Specific Risks</p>
                    <p className="text-slate-500 leading-normal">Anesthesia specialist reviewed extubation plans, cardiac or airway logs</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 cursor-pointer bg-white hover:border-amber-300 hover:shadow-xs transition-all">
                  <Checkbox 
                    checked={timeOutChecks.sterilityConfirmedNursing}
                    onCheckedChange={checked => setTimeOutChecks({...timeOutChecks, sterilityConfirmedNursing: !!checked})}
                    className="shrink-0 mt-0.5"
                  />
                  <div className="space-y-1 text-xs min-w-0 flex-1">
                    <p className="font-extrabold text-slate-900 leading-snug">Nursing: CSSD Sterility Confirmed</p>
                    <p className="text-slate-500 leading-normal">Verified autoclaved visual indicator strips matches CSSD log</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 cursor-pointer bg-white hover:border-amber-300 hover:shadow-xs transition-all">
                  <Checkbox 
                    checked={timeOutChecks.equipmentIssuesAddressedNursing}
                    onCheckedChange={checked => setTimeOutChecks({...timeOutChecks, equipmentIssuesAddressedNursing: !!checked})}
                    className="shrink-0 mt-0.5"
                  />
                  <div className="space-y-1 text-xs min-w-0 flex-1">
                    <p className="font-extrabold text-slate-900 leading-snug">Nursing: Equipment & Implants Ready</p>
                    <p className="text-slate-500 leading-normal">Confirmed availability of all special materials or laparoscopy scopes</p>
                  </div>
                </label>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/60 grid grid-cols-2 gap-4 text-xs font-semibold">
                <div>
                  <Label className="font-bold text-slate-800">Antibiotic Prophylaxis (last 60 min)?</Label>
                  <div className="flex gap-4 mt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input 
                        type="radio" 
                        name="prophylaxis" 
                        checked={timeOutChecks.antibioticProphylaxisGiven === 'Yes'}
                        onChange={() => setTimeOutChecks({...timeOutChecks, antibioticProphylaxisGiven: 'Yes'})}
                      />
                      Yes, Administered
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input 
                        type="radio" 
                        name="prophylaxis" 
                        checked={timeOutChecks.antibioticProphylaxisGiven === 'NA'}
                        onChange={() => setTimeOutChecks({...timeOutChecks, antibioticProphylaxisGiven: 'NA'})}
                      />
                      Not Applicable
                    </label>
                  </div>
                </div>

                <div>
                  <Label className="font-bold text-slate-800">Essential Clinical Imaging Displayed?</Label>
                  <div className="flex gap-4 mt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input 
                        type="radio" 
                        name="essential_img" 
                        checked={timeOutChecks.essentialImagingDisplayed === 'Yes'}
                        onChange={() => setTimeOutChecks({...timeOutChecks, essentialImagingDisplayed: 'Yes'})}
                      />
                      Yes, Displayed
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input 
                        type="radio" 
                        name="essential_img" 
                        checked={timeOutChecks.essentialImagingDisplayed === 'NA'}
                        onChange={() => setTimeOutChecks({...timeOutChecks, essentialImagingDisplayed: 'NA'})}
                      />
                      Not Applicable
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SIGN OUT */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
                <p className="text-xs font-bold text-emerald-800 leading-relaxed">
                  <span className="uppercase font-black mr-1">Phase 3: SIGN OUT (Before leaving Operating Theatre)</span>
                  Nurse verbal confirmation with surgical team on recorded procedure, instrument counts, specimens, and post-op plans.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 cursor-pointer bg-white hover:border-emerald-300 hover:shadow-xs transition-all">
                  <Checkbox 
                    checked={signOutChecks.procedureNameRecorded}
                    onCheckedChange={checked => setSignOutChecks({...signOutChecks, procedureNameRecorded: !!checked})}
                    className="shrink-0 mt-0.5"
                  />
                  <div className="space-y-1 text-xs min-w-0 flex-1">
                    <p className="font-extrabold text-slate-900 leading-snug">Surgical Procedure Name Logged</p>
                    <p className="text-slate-500 leading-normal">Nurse verified exact operation is written in clinical record</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 cursor-pointer bg-white hover:border-emerald-300 hover:shadow-xs transition-all">
                  <Checkbox 
                    checked={signOutChecks.instrumentSpongeNeedleCountsCorrect}
                    onCheckedChange={checked => setSignOutChecks({...signOutChecks, instrumentSpongeNeedleCountsCorrect: !!checked})}
                    className="shrink-0 mt-0.5"
                  />
                  <div className="space-y-1 text-xs min-w-0 flex-1">
                    <p className="font-extrabold text-slate-900 leading-snug">Instrument, Sponge & Needle Count Correct</p>
                    <p className="text-slate-500 leading-normal">Fully tallied and verified before closure (or not applicable)</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 cursor-pointer bg-white hover:border-emerald-300 hover:shadow-xs transition-all">
                  <Checkbox 
                    checked={signOutChecks.specimenLabeledCorrectly}
                    onCheckedChange={checked => setSignOutChecks({...signOutChecks, specimenLabeledCorrectly: !!checked})}
                    className="shrink-0 mt-0.5"
                  />
                  <div className="space-y-1 text-xs min-w-0 flex-1">
                    <p className="font-extrabold text-slate-900 leading-snug">Specimen Labeled Correctly</p>
                    <p className="text-slate-500 leading-normal">Container has patient's MRN, name, and clinical details</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 cursor-pointer bg-white hover:border-emerald-300 hover:shadow-xs transition-all">
                  <Checkbox 
                    checked={signOutChecks.equipmentProblemsAddressed}
                    onCheckedChange={checked => setSignOutChecks({...signOutChecks, equipmentProblemsAddressed: !!checked})}
                    className="shrink-0 mt-0.5"
                  />
                  <div className="space-y-1 text-xs min-w-0 flex-1">
                    <p className="font-extrabold text-slate-900 leading-snug">Equipment / OR Problems Logged</p>
                    <p className="text-slate-500 leading-normal">Any biomedical machinery faults reported (or mark as clean)</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 cursor-pointer bg-white hover:border-emerald-300 hover:shadow-xs transition-all sm:col-span-2 lg:col-span-2">
                  <Checkbox 
                    checked={signOutChecks.recoveryManagementReviewed}
                    onCheckedChange={checked => setSignOutChecks({...signOutChecks, recoveryManagementReviewed: !!checked})}
                    className="shrink-0 mt-0.5"
                  />
                  <div className="space-y-1 text-xs min-w-0 flex-1">
                    <p className="font-extrabold text-slate-900 leading-snug">Post-Operative Recovery Plan Reviewed</p>
                    <p className="text-slate-500 leading-normal">Surgeon, Anaesthetist and Nurse reviewed main postoperative concerns and ICU/Recovery destination</p>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Audit Sign-off Form with coordinator names and signatures */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-[11px] font-black text-slate-700 uppercase">Surgeon Name & Signature</Label>
              <Input 
                placeholder="Dr. Ashay Rathore"
                value={signatures.surgeonName}
                onChange={e => setSignatures({...signatures, surgeonName: e.target.value})}
                className="text-xs h-9 bg-white border-slate-200 font-bold"
              />
              <Input 
                placeholder="Type Signature to Sign"
                value={signatures.surgeonSig}
                onChange={e => setSignatures({...signatures, surgeonSig: e.target.value})}
                className="text-xs h-8 bg-white border-slate-200 italic font-serif"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-black text-slate-700 uppercase">Anaesthetist Name & Signature</Label>
              <Input 
                placeholder="Dr. Navodita Tiwari"
                value={signatures.anesthetistName}
                onChange={e => setSignatures({...signatures, anesthetistName: e.target.value})}
                className="text-xs h-9 bg-white border-slate-200 font-bold"
              />
              <Input 
                placeholder="Type Signature to Sign"
                value={signatures.anesthetistSig}
                onChange={e => setSignatures({...signatures, anesthetistSig: e.target.value})}
                className="text-xs h-8 bg-white border-slate-200 italic font-serif"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-black text-slate-700 uppercase">Nurse Coordinator Name & Sig *</Label>
              <Input 
                placeholder="Nurse Priyanka Parte"
                value={signatures.nurseName}
                onChange={e => setSignatures({...signatures, nurseName: e.target.value})}
                className="text-xs h-9 bg-white border-slate-200 font-bold"
                required
              />
              <Input 
                placeholder="Type Signature to Sign"
                value={signatures.nurseSig}
                onChange={e => setSignatures({...signatures, nurseSig: e.target.value})}
                className="text-xs h-8 bg-white border-slate-200 italic font-serif"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-black text-slate-700 uppercase">Special Safety Comments / Audits</Label>
            <Input 
              placeholder="e.g. Challenging airway handled with backup scope; CSSD autoclave log batch #74581 confirmed..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="text-xs h-9 bg-white border-slate-200"
            />
          </div>
        </div>

        {/* Action button footer with Navigation controls */}
        <DialogFooter className="p-6 border-t border-slate-100 bg-white flex flex-row items-center justify-between sm:justify-between gap-4">
          <Button 
            variant="outline" 
            onClick={prevStep} 
            disabled={currentStep === 1}
            className="font-bold border-slate-200 gap-1 text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Previous
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose} className="font-bold text-xs text-slate-500 hover:bg-slate-100">
              Close
            </Button>

            {currentStep < 3 ? (
              <Button 
                onClick={nextStep} 
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1 font-bold text-xs px-5"
              >
                Next Phase
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button 
                onClick={handleSave} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-bold text-xs px-6"
              >
                <Save className="w-4 h-4" />
                Save WHO Checklist
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
