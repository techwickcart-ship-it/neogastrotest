export type UserRole = 
  | 'SUPER_ADMIN' 
  | 'HOSPITAL_ADMIN' 
  | 'ADMIN'
  | 'RECEPTION' 
  | 'RECEPTIONIST'
  | 'DOCTOR' 
  | 'NURSE' 
  | 'LAB_STAFF' 
  | 'LAB_TECHNICIAN'
  | 'PHARMACIST' 
  | 'ACCOUNTANT'
  | 'SURGEON'
  | 'RADIOLOGIST';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  specialization?: string;
  specialty?: string;
  degree?: string;
  qualification?: string;
  experience?: string;
  registrationNo?: string;
  regNo?: string;
  consultationFee?: number | string;
  followUpFee?: number | string;
  labLicenseNo?: string;
  licenseNumber?: string;
  phone?: string;
  avatar?: string;
}

export interface Patient {
  id: string;
  mrn: string; // Medical Record Number
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  email?: string;
  address: string;
  bloodGroup?: string;
  lastVisit?: string;
  status: string;
  motherName?: string;
  motherPhone?: string;
  husbandName?: string;
  husbandPhone?: string;
  fatherName?: string;
  fatherPhone?: string;
  relative1Relation?: string;
  relative1Name?: string;
  relative1Phone?: string;
  relative2Relation?: string;
  relative2Name?: string;
  relative2Phone?: string;
  dob?: string;
  tpaId?: string;
  tpaValidity?: string;
  guardianName?: string;
  attendingDoctorId?: string;
  isReferral?: boolean;
  referredBy?: string;
  allergies?: string | string[];
  pastHistory?: string;
  medicalHistory?: string;
  clinicalHistory?: string;
  complaints?: string;
  vitals?: any;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  type: 'OPD' | 'Follow-up' | 'Emergency';
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'In-Progress';
  reason?: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  diagnosis?: string;
  medicines: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    notes?: string;
  }[];
  tests?: string[];
  notes?: string;
  attachmentUrl?: string;
  attachmentName?: string;
}

export interface BillingRecord {
  id: string;
  patientId: string;
  date: string;
  type?: string;
  items: {
    description: string;
    amount: number;
    category: 'OPD' | 'IPD' | 'Lab' | 'Radiology' | 'Pharmacy' | 'Other' | 'PHARMACY' | 'path' | 'radio';
  }[];
  totalAmount: number;
  discount?: number;
  paidAmount: number;
  status: 'Paid' | 'Partial' | 'Unpaid';
  paymentMode?: 'Cash' | 'UPI' | 'Card';
  patientName?: string; // For walk-in customers
  patientPhone?: string; // For walk-in customers
  prescribingDoctor?: string; // For pharmacy/lab walk-ins
}

export interface Bed {
  id: string;
  number: string;
  ward: string;
  type: 'General' | 'Semi-Private' | 'Private' | 'ICU' | 'Maternity';
  status: 'Available' | 'Occupied' | 'Maintenance';
  patientId?: string;
}

export interface LabTest {
  id: string;
  patientId: string;
  testName: string;
  category: 'Pathology' | 'Radiology';
  orderedBy: string;
  date: string;
  status: 'Ordered' | 'Sample Collected' | 'Processing' | 'Completed';
  result?: string;
  reportUrl?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'Medicine' | 'Surgical' | 'General';
  stock: number;
  unit: string;
  expiryDate?: string;
  expiry_date?: string;
  batchNumber?: string;
  batch_number?: string;
  minStockLevel: number;
  min_stock_level?: number;
  mrp: number;
  sellingPrice: number;
  selling_price?: number;
  purchasePrice: number;
  purchase_price?: number;
  taxPercentage: number;
  tax_percentage?: number;
  hsnCode?: string;
  hsn_code?: string;
  rackNumber?: string;
  rack_number?: string;
  composition?: string;
  units_per_strip?: number;
  loose_selling_price?: number;
  loose_stock?: number;
  is_loose_sale_enabled?: boolean;
}

export interface OperationTheatre {
  id: string;
  name: string;
  status: 'Available' | 'Occupied' | 'Maintenance' | 'Cleaning';
  type: 'Major' | 'Minor' | 'Cardiac' | 'Orthopedic' | 'Emergency';
}

export interface OperationRecord {
  id: string;
  patientId: string;
  theatreId: string;
  surgeonId: string;
  assistantSurgeons?: string[];
  anesthetistId?: string;
  nurses?: string[];
  operationName: string;
  date: string;
  startTime: string;
  endTime?: string;
  status: 'Scheduled' | 'In-Progress' | 'Completed' | 'Cancelled';
  notes?: string;
  documents: {
    id: string;
    name: string;
    url: string;
    type: 'Document' | 'Photo' | 'Video';
    uploadedAt: string;
    uploadedBy: string;
  }[];
}

export interface NursingTask {
  id: string;
  patientId: string;
  description: string;
  dueTime: string;
  status: 'Pending' | 'Completed';
  priority: 'Low' | 'Medium' | 'High';
}

export interface NurseShift {
  id: string;
  nurseId: string;
  shiftType: 'Morning' | 'Evening' | 'Night';
  ward: string;
  status: 'Active' | 'Completed';
}

export interface PatientVitals {
  patientId: string;
  bp: string;
  pulse: number;
  temp: string;
  spo2: number;
  lastUpdated: string;
  weight?: string;
  rr?: string;
  cvs?: string;
  cbs?: string;
  rs?: string;
  cns?: string;
  perAbdomen?: string;
  localExam?: string;
  inputOutput?: string;
}

export interface OTInventoryItem {
  id: string;
  code?: string;
  name: string;
  category: 'Surgical Kit' | 'Disposable' | 'Anesthesia Drug' | 'Suture' | 'Implant';
  stock: number;
  unit: string;
  minStockLevel: number;
  mrp: number;
  purchasePrice: number;
  batchNumber?: string;
  expiryDate?: string;
}

export interface OTConsent {
  id: string;
  patientId: string;
  type: 'General' | 'Surgery' | 'Anaesthesia' | 'Blood Transfusion' | 'ICU' | 'High-risk';
  terms: string;
  patientName: string;
  guardianName?: string;
  witnessName: string;
  signedAt: string;
  signatureType: 'Typed' | 'Digital';
  signatureData: string;
  status: 'Draft' | 'Signed' | 'Revoked';
  // Additional fields for Surgery & Anaesthesia Consent Forms
  uhidNo?: string;
  regNo?: string;
  procedureName?: string;
  diagnosis?: string;
  plannedSurgery?: string;
  surgeonName?: string;
  doctorName?: string;
  doctorSign?: string;
  doctorSignedAt?: string;
  estimatedComplications?: string; // Risk
  benefitsAfterSurgery?: string;   // Benefit
  alternativeOptions?: string;    // Alternative option, if any
  language?: 'English' | 'Hindi';
  patientAgeSex?: string;
  ipdNo?: string;
  dobAge?: string;
  interopNotes?: string;
  relativeName?: string;
  relativeRelation?: string;
  relativeSign?: string;
  relativeSignedAt?: string;
  patientSign?: string;
  patientSignedAt?: string;
  selectedAnaesthesiaTypes?: {
    general?: boolean;
    spinalEpidural?: boolean;
    spinalEpiduralWithSedation?: boolean;
    nerveBlock?: boolean;
    nerveBlockWithSedation?: boolean;
    regional?: boolean;
    regionalWithSedation?: boolean;
    macWithSedation?: boolean;
    macWithoutSedation?: boolean;
  };
}

export interface OTInfectionControlLog {
  id: string;
  date: string;
  time: string;
  theatreId: string;
  theatreName: string;
  cleaningType: 'Routine' | 'Fumigation' | 'Post-op Deep Clean' | 'Autoclave Sterilization' | 'ETP Log' | 'ETO Sterilization' | 'Fumigation Report';
  disinfectantsUsed: string;
  airParticleCount?: string;
  cultureSwabResult: 'Negative' | 'Positive' | 'Pending';
  loggedBy: string;
  
  // Registers for Infection Control (Autoclave, ETP, ETO, Fumigation)
  registerType?: 'Sanitization' | 'Autoclave' | 'ETP' | 'ETO' | 'Fumigation';
  autoclaveDetails?: {
    batchNo: string;
    temperature: string; // e.g. 121°C / 134°C
    pressure: string;    // e.g. 15 psi / 30 psi
    holdTime: string;    // e.g. 20 mins
    biologicalIndicatorResult: 'Passed' | 'Failed' | 'Pending';
    chemicalIndicatorResult: 'Passed' | 'Failed';
  };
  etpDetails?: {
    phValue: string;
    tdsValue: string;
    treatedWaterQtyLiters: string;
    dosingChemicals: string;
    sludgeDisposalKg: string;
  };
  etoDetails?: {
    batchNo: string;
    gasConcentration: string;
    aerationTimeHours: string;
    humidityPercent: string;
    etoTapeIndicator: 'Passed' | 'Failed';
  };
  fumigationDetails?: {
    foggingAgent: string;
    roomVolumeCuFt: string;
    sealingTimeHours: string;
    postFumigationAiroutTime: string;
    swabLocationTested: string;
  };
}

export interface OTBiopsyRequisition {
  id: string;
  patientId: string;
  patientName: string;
  mrn?: string;
  ipdNo?: string;
  age?: number;
  gender?: string;
  dateOfCollection: string;
  timeOfCollection: string;
  specimenSite: string; // e.g., Liver lesion, Gallbladder wall, Colonic polyp, Antral mucosa
  clinicalDiagnosis: string;
  preOpDiagnosis?: string;
  natureOfSpecimen: string; // Biopsy / Excision / Incision / Endoscopic specimen
  fixativeUsed: string; // e.g., 10% Buffered Formalin
  containerLabelCode: string;
  specialInstructions?: string;
  requisitionedByDoctor: string;
  status: 'Pending Dispatch' | 'Sent to Pathology' | 'In Analysis' | 'Report Received';
  pathologyReportUrl?: string;
  pathologyReportNotes?: string;
  createdAt: string;
}

export interface OTPharmacyRequisition {
  id: string;
  patientId?: string;
  patientName?: string;
  otRoomId?: string;
  otRoomName?: string;
  requisitionDate: string;
  requisitionTime: string;
  requestedByStaff: string;
  urgency: 'Normal' | 'Urgent' | 'Emergency OT';
  items: Array<{
    itemId: string;
    itemName: string;
    requestedQty: number;
    unit: string;
    issuedQty?: number;
    batchNo?: string;
  }>;
  status: 'Requested' | 'In Progress' | 'Issued/Dispatched' | 'Completed' | 'Cancelled';
  notes?: string;
  createdAt: string;
}

export type SpecialChartCategory = 'DRAIN' | 'INTAKE_OUTPUT' | 'SUGAR_GRBS' | 'ENDOSCOPY_COLONOSCOPY';

export interface DailyDrainEntry {
  id: string;
  patientId: string;
  dateTime: string;
  drainName: string; // Drain 1, Drain 2, Chest Tube, Pelvic Drain
  site: string; // Left Flank, Epigastric, Morrison's Pouch, etc.
  volumeMl: number;
  colorAspect: 'Serous' | 'Sanguineous' | 'Serosanguineous' | 'Purulent' | 'Bilious' | 'Feculent' | 'Hemorrhagic';
  recordedBy: string;
  doctorInstructions?: string;
  remarks?: string;
}

export interface IntakeOutputEntry {
  id: string;
  patientId: string;
  dateTime: string;
  shift: 'Morning (8am-2pm)' | 'Evening (2pm-8pm)' | 'Night (8pm-8am)' | 'Custom';
  // Intake
  oralMl: number;
  ivFluidMl: number;
  tubeFeedMl: number;
  bloodProductsMl: number;
  totalIntakeMl: number;
  // Output
  urineMl: number;
  ngTubeMl: number;
  drainMl: number;
  vomitusStoolMl: number;
  totalOutputMl: number;
  // Balance
  netBalanceMl: number; // Intake - Output
  recordedBy: string;
  remarks?: string;
}

export interface BloodSugarGrbsEntry {
  id: string;
  patientId: string;
  dateTime: string;
  slot: 'Fasting' | 'Pre-Breakfast' | 'Post-Breakfast' | 'Pre-Lunch' | 'Post-Lunch' | 'Pre-Dinner' | 'Bedtime (10pm)' | '2:00 AM' | 'Custom';
  grbsValue: number; // mg/dL
  urineKetones?: 'Negative' | 'Trace' | '1+' | '2+' | '3+';
  slidingScaleInsulinUnits?: number;
  insulinTypeRoute?: string; // e.g. Human Actrapid SC, Humalog SC, IV Drip
  targetGlucoseRange?: string; // e.g. 110 - 180 mg/dL
  hypoSymptoms?: string; // e.g. None, Diaphoresis, Tremors, Dextrose Given
  recordedBy: string;
  doctorOrders?: string;
}

export interface EndoscopyColonoscopyRecoveryEntry {
  id: string;
  patientId: string;
  dateTime: string;
  procedureType: 'Upper GI Endoscopy' | 'Colonoscopy' | 'ERCP' | 'Polypectomy' | 'EVL Banding' | 'Other GI Procedure';
  bowelPrepStatus?: 'Excellent' | 'Good' | 'Fair' | 'Poor (Incomplete)' | 'Clear Yellow Liquid Stool';
  sedationRecoveryScore?: string; // Ramsay / Aldrete score
  bp: string;
  pulse: number;
  spo2: number;
  temp?: string;
  abdominalAssessment: 'Soft non-tender' | 'Minimal cramping' | 'Distension present' | 'Guarding/Rigidity (Alert!)';
  giBleedingCheck: 'None' | 'Minimal spotting' | 'Hematemesis / Melena (Alert!)';
  dietProgression: 'NPO' | 'Sips of Water' | 'Clear Liquids' | 'Soft Diet' | 'Regular Diet';
  biopsyTaken: boolean;
  specimenDetails?: string;
  doctorInstructions?: string;
  recordedBy: string;
}

export interface DirectEndoscopyProcedure {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  age: number;
  gender: string;
  address?: string;
  referredByDoctor: string; // e.g., 'Self Referral', 'Dr. S. K. Gupta', 'City Clinic'
  procedureType: string; // Diagnostic Upper GI Endoscopy, Colonoscopy, Polypectomy, ERCP, etc.
  procedureCategory: 'Endoscopy' | 'Colonoscopy' | 'ERCP' | 'Polypectomy' | 'EVL Banding' | 'Sigmoidoscopy' | 'Minor GI Procedure';
  scheduledDateTime: string;
  clinicalIndication: string;
  sedationType: string;
  bowelPrepInstructions?: string;
  fastingStatus: 'NPO > 8 Hours' | 'NPO > 6 Hours' | 'Incomplete Fasting' | 'Not Required';
  
  // Consent
  consentSigned: boolean;
  consentSignedAt?: string;
  consentSignedBy?: string; // Patient or Guardian Name
  witnessName?: string;
  physicianName?: string;

  // Direct Billing & Payment
  billingStatus: 'PAID' | 'PENDING' | 'PARTIAL' | 'WAIVED';
  invoiceId?: string;
  procedureFee: number;
  sedationFee: number;
  biopsyKitFee: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  paymentMode: 'Cash' | 'UPI / QR' | 'Credit/Debit Card' | 'NetBanking' | 'TPA / Insurance Direct';
  transactionRef?: string;
  
  status: 'Scheduled' | 'In-Suite' | 'Procedure Completed' | 'Discharged' | 'Cancelled';
  createdAt: string;
  recordedBy: string;
}

// Hourly Vitals & Intake/Output Monitoring Sheet (Yellow Form Standard)
export interface HourlyVitalsEntry {
  id: string;
  patientId: string;
  sheetDate: string; // YYYY-MM-DD
  timeSlot: string;  // e.g. "8.00 am", "9.00 am", "10.00 am", ..., "12.00 M.N.", ..., "7.00 am"
  pr?: string;        // Pulse Rate (bpm)
  rr?: string;        // Respiratory Rate (/min)
  temp?: string;      // Temperature (°F)
  bp?: string;        // Blood Pressure (mmHg)
  spo2?: string;      // Oxygen Saturation (%)
  cns?: string;       // Central Nervous System / GCS status
  oralItems?: string; // By Mouth Items
  oralMl?: string;    // By Mouth Volume (mL)
  ivItems?: string;   // IV Infusions Items
  ivMl?: string;      // IV Infusions Volume (mL)
  drainMl?: string;   // Aspirate / Drain Volume (mL)
  urineMl?: string;   // Urine Volume (mL)
  recordedBy?: string;
  remarks?: string;
}

export interface HourlyVitalsSheet {
  id: string;
  patientId: string;
  patientName: string;
  ageSex: string;
  regNo: string;
  wardBed: string;
  dateOfAdmission: string;
  date: string; // Sheet Date YYYY-MM-DD
  hourlyUpdateRequired: boolean; // Dr Instruction: Update Hourly
  frequencyInterval: string; // e.g. 'Every 1 Hour', 'Every 2 Hours', 'Every 4 Hours'
  doctorInstructions?: string;
  entries: HourlyVitalsEntry[];
  lastUpdated: string;
}

// Doctor Pathology Orders filled by Lab
export interface DoctorPathologyOrder {
  id: string;
  patientId: string;
  patientName: string;
  regNo?: string;
  doctorName: string;
  doctorNoteRef?: string;
  orderDate: string;
  testCategory: 'Haematology' | 'Biochemistry' | 'Clinical Pathology' | 'Serology' | 'Microbiology' | 'Histopathology' | 'Other';
  testNames: string[]; // e.g. ['CBC', 'LFT', 'Serum Electrolytes']
  specialInstructionsFromDoctor?: string;
  status: 'Pending' | 'In-Progress' | 'Completed';
  labResults?: {
    testName: string;
    resultValue: string;
    unit?: string;
    normalRange?: string;
    status: 'Normal' | 'Abnormal' | 'Critical';
  }[];
  labRemarks?: string;
  labTechName?: string;
  completedAt?: string;
}

// Carewell Multispeciality Hospital - Operation Theatre Summary & Operative Notes Form
export interface CarewellOTSummaryForm {
  id: string;
  patientId: string;
  patientName: string;
  idNo?: string;
  regNo?: string; // e.g. NH/1871/MAY/2016
  dob?: string;
  gender?: string;
  date: string;
  time: string; // 24 hr clock e.g. 10:30
  preOpDiagnosis: string;
  postOpDiagnosis: string;
  operativeProcedureProposed: string;
  operativeProcedureExecuted: string;
  procedureType: 'Major' | 'Minor';
  timeDuration?: string;
  caseType: 'Elective' | 'Emergency';
  surgeon: string;
  assist1Surgeon?: string;
  assist2Surgeon?: string;
  anaesthetist: string;
  assist1Anaesthetist?: string;
  assist2Anaesthetist?: string;
  scrubNurse1?: string;
  scrubNurse2?: string;
  floorNurse?: string;
  position: 'Supine' | 'Lithotomy' | 'Trendelenberg' | 'Prone' | 'Right lateral' | 'Jack Knife' | 'Other';
  positionOther?: string;
  anaesthesiaType: 'GA' | 'SA' | 'Epidural' | 'Local' | 'Regional Block' | 'Other';
  anaesthesiaOther?: string;
  findings?: string;
  // Operative Notes
  skinPreparation?: string;
  incision?: string;
  procedureDetails: string;
  clinicalPhotos?: Array<{ id: string; url: string; caption?: string; uploadedAt?: string }>;
  savedAt: string;
  savedBy: string;
}

// Carewell Multispeciality Hospital - Pre Operative Orders Sheet
export interface CarewellPreOpOrdersForm {
  id: string;
  patientId: string;
  patientName: string;
  ageSex: string;
  uhidNo: string;
  regNo?: string;
  dateOfOperation: string;
  opProcedureProposed: string;
  anaesthesiaType: 'GA' | 'LA' | 'SA' | 'EA' | string;
  
  // 13 standard order items from Carewell printed form
  nilOrallyAfterMidnight: boolean;
  nilOrallyNotes?: string;
  liquidDiet: boolean;
  liquidDietNotes?: string;
  writtenConsent: boolean;
  prepareParts: boolean;
  preparePartsNotes?: string;
  followPacOrders: boolean;
  morningBathSavlon: boolean;
  xylocaineSensitivity: boolean;
  xylocaineResult?: 'Sensitive' | 'Non-Sensitive' | 'Pending' | string;
  tabAlprazolam: boolean;
  
  // Antibiotics & Injections (Item 9)
  injAntibiotics: Array<{
    name: string;
    time: string;
  }>;
  injTetanusToxideStat: boolean;
  injPethidineMg?: string;
  injPhenerganMg?: string;
  antibioticSensitivityWardNote?: string;
  
  betadineMouthWash: boolean;
  proctoclysisEnema: boolean;
  streptomycinAndMetrogyl: boolean;
  shiftToOtTime?: string; // e.g. "08:00 AM" or "On call"
  
  specialInstructions?: string;
  savedAt: string;
  savedBy: string;
}

export interface VisitingSpecialist {
  id: string;
  name: string;
  specialty: string;
  qualification?: string;
  registrationNumber?: string;
  phone: string;
  email?: string;
  hospitalAffiliation?: string;
  defaultConsultationFee: number;
  visitingSchedule?: string;
  status: 'Active' | 'On-Call' | 'Inactive';
  notes?: string;
  createdAt: string;
}

export interface VisitingConsultationRecord {
  id: string;
  patientId: string;
  patientName: string;
  uhidNo?: string;
  patientType: 'IPD' | 'OPD' | 'Emergency' | 'OT';
  bedNo?: string;
  wardName?: string;
  
  specialistId: string;
  specialistName: string;
  specialistSpecialty: string;
  specialistPhone?: string;
  specialistAffiliation?: string;
  
  visitDate: string;
  visitTime: string;
  visitType: 'Emergency Call' | 'Routine Ward Round' | 'Cross-Consultation' | 'Pre-Op Evaluation' | 'Post-Op Review' | 'Specialist Opinion';
  
  reasonForConsult: string;
  vitalSignsAtVisit?: {
    bp?: string;
    pulse?: string;
    temp?: string;
    spo2?: string;
    respRate?: string;
  };
  
  clinicalFindings: string;
  diagnosisImpression: string;
  specialistAdvice: string;
  
  prescribedMedications?: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }>;
  recommendedTests?: string[];
  
  followUpDate?: string;
  specialInstructions?: string;
  
  consultationFee: number;
  billingStatus: 'Charged to IPD Bill' | 'Paid OPD' | 'Pending' | 'Waived';
  invoiceId?: string;
  
  recordedBy: string;
  recordedByRole: string;
  
  acknowledgmentStatus: 'Pending Nurse/Doctor Review' | 'Acknowledged by Duty Nurse' | 'Executed in IPD Chart';
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  
  createdAt: string;
}

export interface PoorPrognosisConsent {
  id: string;
  patientId: string;
  admissionId?: string;
  patientName: string;
  mrn?: string;
  age?: string | number;
  gender?: string;
  ipdNo?: string;
  bedWard?: string;
  admissionDate?: string;
  
  // Clinical Assessment
  diagnosis: string;
  comorbidities?: string;
  clinicalCondition: string;
  riskCategory: 'High Risk' | 'Extremely Critical' | 'Guarded' | 'Moribund';
  criticalSupport: {
    mechanicalVentilation: boolean;
    inotropicSupport: boolean;
    dialysis: boolean;
    invasiveLines: boolean;
    bloodTransfusion: boolean;
    highFlowO2: boolean;
    cprInformed: boolean;
    otherSupport?: string;
  };
  
  // Counseling & Next of Kin
  counselingDate: string;
  counselingTime: string;
  relativeName: string;
  relativeRelation: string;
  relativePhone: string;
  relativeAddress?: string;
  relativeSign?: string;
  
  // Medical Team & Witness
  doctorName: string;
  doctorDesignation: string;
  doctorRegNo?: string;
  doctorSign?: string;
  witnessName?: string;
  witnessPhone?: string;
  witnessSign?: string;
  
  languageSpoken: 'Hindi' | 'English' | 'Bilingual' | 'Bhojpuri' | 'Other';
  additionalClinicalNotes?: string;
  status: 'Active' | 'Signed' | 'Revoked';
  
  createdAt: string;
  updatedAt?: string;
}

export interface GeneralConsent {
  id: string;
  patientId: string;
  admissionId?: string;
  patientName: string;
  mrn?: string;
  age?: string | number;
  gender?: string;
  ipdNo?: string;
  bedWard?: string;
  admissionDate?: string;
  diagnosis?: string;
  
  // Consent specifics
  consentType?: string;
  investigationConsent: boolean;
  treatmentConsent: boolean;
  medicationConsent: boolean;
  emergencyConsent: boolean;
  anesthesiaConsent?: boolean;
  bloodTransfusionConsent?: boolean;
  photographConsent?: boolean;
  
  // Relative / Guardian
  relativeName: string;
  relativeRelation: string;
  relativePhone: string;
  relativeAddress?: string;
  relativeSign?: string;
  patientSign?: string;
  
  // Doctor & Witness
  doctorName: string;
  doctorDesignation: string;
  doctorRegNo?: string;
  doctorSign?: string;
  witnessName?: string;
  witnessPhone?: string;
  witnessSign?: string;
  
  languageSpoken?: 'Hindi' | 'English' | 'Bilingual' | string;
  specialInstructions?: string;
  status: 'Active' | 'Signed' | 'Revoked' | 'Draft';
  
  createdAt: string;
  updatedAt?: string;
}





