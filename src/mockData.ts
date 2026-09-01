import { Patient, Appointment, User, Bed, BillingRecord, LabTest, InventoryItem, OperationTheatre, OperationRecord, NursingTask, NurseShift, PatientVitals, Prescription } from './types';
import { INITIAL_PATHOLOGY_MASTER_TESTS } from './data/pathologyMasterRates';
import { INITIAL_RADIOLOGY_MASTER_TESTS } from './data/radiologyMasterRates';
import { REAL_DOCTOR_PHOTOS } from './utils/staffPhotos';

export const MOCK_USERS: User[] = [
  { 
    id: 'u1', 
    name: 'Dr. Rajesh Sharma', 
    email: 'dr.sharma@hospital.com', 
    role: 'DOCTOR', 
    department: 'Cardiology', 
    specialization: 'Interventional Cardiology & Senior Physician', 
    specialty: 'Interventional Cardiology & Senior Physician',
    degree: 'MD, DM (Cardiology)', 
    qualification: 'MD, DM (Cardiology)',
    experience: '14 Years',
    registrationNo: 'MCI-2012-4489',
    regNo: 'MCI-2012-4489',
    consultationFee: 500,
    phone: '+91 9876543210',
    avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=600' 
  },
  { 
    id: 'u2', 
    name: 'Dr. Ramesh Mehta (Admin)', 
    email: 'admin@hospital.com', 
    role: 'SUPER_ADMIN', 
    department: 'Administration', 
    specialization: 'Hospital Management & Operations', 
    specialty: 'Hospital Management & Operations',
    degree: 'MHA, MD', 
    qualification: 'MHA, MD',
    experience: '18 Years',
    registrationNo: 'MCI-2008-1122',
    regNo: 'MCI-2008-1122',
    consultationFee: 0,
    phone: '+91 9876543211',
    avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=600' 
  },
  { 
    id: 'u3', 
    name: 'Dr. Priya Nair', 
    email: 'dr.priya@hospital.com', 
    role: 'DOCTOR', 
    department: 'General Medicine', 
    specialization: 'Internal Medicine / Consultant Physician', 
    specialty: 'Internal Medicine / Consultant Physician',
    degree: 'MBBS, MD (Medicine)', 
    qualification: 'MBBS, MD (Medicine)',
    experience: '10 Years',
    registrationNo: 'MCI-2016-8821',
    regNo: 'MCI-2016-8821',
    consultationFee: 400,
    phone: '+91 9876543212',
    avatar: 'https://images.unsplash.com/photo-1594824813589-9a740b2d69e4?auto=format&fit=crop&q=80&w=600' 
  },
  { 
    id: 'u4', 
    name: 'Dr. Ananya Sen', 
    email: 'dr.ananya@hospital.com', 
    role: 'DOCTOR', 
    department: 'Pediatrics', 
    specialization: 'Pediatrician & Neonatologist', 
    specialty: 'Pediatrician & Neonatologist',
    degree: 'MD (Pediatrics), DCH', 
    qualification: 'MD (Pediatrics), DCH',
    experience: '8 Years',
    registrationNo: 'MCI-2018-9923',
    regNo: 'MCI-2018-9923',
    consultationFee: 450,
    phone: '+91 9876543213',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=600' 
  },
  { 
    id: 'u5', 
    name: 'Dr. Vikram Malhotra', 
    email: 'dr.vikram@hospital.com', 
    role: 'DOCTOR', 
    department: 'Orthopedics', 
    specialization: 'Joint Replacement & Spine Specialist', 
    specialty: 'Joint Replacement & Spine Specialist',
    degree: 'MS (Ortho), DNB', 
    qualification: 'MS (Ortho), DNB',
    experience: '12 Years',
    registrationNo: 'MCI-2014-1120',
    regNo: 'MCI-2014-1120',
    consultationFee: 600,
    phone: '+91 9876543214',
    avatar: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&q=80&w=600' 
  },
  { 
    id: 'u6', 
    name: 'Dr. Sunita Rao', 
    email: 'dr.sunita@hospital.com', 
    role: 'DOCTOR', 
    department: 'Gynecology', 
    specialization: 'Obstetrics & High-Risk Pregnancy', 
    specialty: 'Obstetrics & High-Risk Pregnancy',
    degree: 'MS (OBG), FICOG', 
    qualification: 'MS (OBG), FICOG',
    experience: '15 Years',
    registrationNo: 'MCI-2011-3391',
    regNo: 'MCI-2011-3391',
    consultationFee: 500,
    phone: '+91 9876543215',
    avatar: 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?auto=format&fit=crop&q=80&w=600' 
  },
  { 
    id: 'u7', 
    name: 'Dr. Rameshwar Prasad', 
    email: 'dr.rameshwar@hospital.com', 
    role: 'DOCTOR', 
    department: 'Gastroenterology', 
    specialization: 'Gastroenterologist & Therapeutic Endoscopist', 
    specialty: 'Gastroenterologist & Therapeutic Endoscopist',
    degree: 'MD, DM (Gastroenterology)', 
    qualification: 'MD, DM (Gastroenterology)',
    experience: '16 Years',
    registrationNo: 'MCI-2010-7744',
    regNo: 'MCI-2010-7744',
    consultationFee: 700,
    phone: '+91 9876543216',
    avatar: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=600' 
  },
  { 
    id: 'u8', 
    name: 'Dr. Amit Deshmukh', 
    email: 'dr.amit@hospital.com', 
    role: 'DOCTOR', 
    department: 'General Surgery', 
    specialization: 'Laparoscopic & General Surgeon', 
    specialty: 'Laparoscopic & General Surgeon',
    degree: 'MS (Surgery), FIAGES', 
    qualification: 'MS (Surgery), FIAGES',
    experience: '11 Years',
    registrationNo: 'MCI-2015-6655',
    regNo: 'MCI-2015-6655',
    consultationFee: 650,
    phone: '+91 9876543217',
    avatar: 'https://images.unsplash.com/photo-1622902046580-2b47f47f5471?auto=format&fit=crop&q=80&w=600' 
  },
  { 
    id: 'u9', 
    name: 'Dr. Arvind Kumar Sharma', 
    email: 'dr.aksharma@hospital.com', 
    role: 'DOCTOR', 
    department: 'Visiting Consultant', 
    specialization: 'Consultant Gastroenterologist', 
    specialty: 'Consultant Gastroenterologist',
    degree: 'MD, DM (Gastro)', 
    qualification: 'MD, DM (Gastro)',
    experience: '20 Years',
    registrationNo: 'MCI-2006-2233',
    regNo: 'MCI-2006-2233',
    consultationFee: 800,
    phone: '+91 9876543218',
    avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=600' 
  },
  { 
    id: 'u-dr-anirudh', 
    name: 'Dr. Anirudh Tiwari', 
    email: 'dr.anirudh@hospital.com', 
    role: 'DOCTOR', 
    department: 'Gastroenterology', 
    specialization: 'Senior Consultant Gastroenterologist & Hepatologist', 
    specialty: 'Senior Consultant Gastroenterologist & Hepatologist',
    degree: 'MD, DM (Gastroenterology)', 
    qualification: 'MD, DM (Gastroenterology)',
    experience: '15 Years',
    registrationNo: 'MCI-2011-5588',
    regNo: 'MCI-2011-5588',
    consultationFee: 600,
    followUpFee: 500,
    phone: '+91 9876543230',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=600' 
  },
  { 
    id: 'u-dr-ashay', 
    name: 'Dr. Ashay Rathore', 
    email: 'dr.ashay@hospital.com', 
    role: 'DOCTOR', 
    department: 'Gastroenterology', 
    specialization: 'Consultant Gastroenterologist & Endoscopist', 
    specialty: 'Consultant Gastroenterologist & Endoscopist',
    degree: 'MBBS, MD, DNB (Gastroenterology)', 
    qualification: 'MBBS, MD, DNB (Gastroenterology)',
    experience: '12 Years',
    registrationNo: 'MCI-2014-9912',
    regNo: 'MCI-2014-9912',
    consultationFee: 500,
    followUpFee: 500,
    phone: '+91 9876543231',
    avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=600' 
  },
  {
    id: 'u10',
    name: 'Sister Priya S.',
    email: 'nurse.priya@hospital.com',
    role: 'NURSE',
    department: 'General Ward / IPD',
    specialization: 'Critical Care & Ward Management',
    specialty: 'Critical Care & Ward Management',
    degree: 'B.Sc Nursing',
    qualification: 'B.Sc Nursing',
    experience: '6 Years',
    registrationNo: 'INC-2020-5512',
    regNo: 'INC-2020-5512',
    phone: '+91 9876543219',
    avatar: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'u11',
    name: 'Nurse Sunita R.',
    email: 'nurse.sunita@hospital.com',
    role: 'NURSE',
    department: 'ICU & Emergency',
    specialization: 'ICU / Emergency Nursing',
    specialty: 'ICU / Emergency Nursing',
    degree: 'GNM, Post Basic B.Sc',
    qualification: 'GNM, Post Basic B.Sc',
    experience: '9 Years',
    registrationNo: 'INC-2017-3341',
    regNo: 'INC-2017-3341',
    phone: '+91 9876543220',
    avatar: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'u12',
    name: 'Vikram Lab Tech',
    email: 'lab.vikram@hospital.com',
    role: 'LAB_TECHNICIAN',
    department: 'Pathology & Biochemistry',
    specialization: 'Senior Medical Laboratory Technologist',
    specialty: 'Senior Medical Laboratory Technologist',
    degree: 'DMLT, B.Sc MLT',
    qualification: 'DMLT, B.Sc MLT',
    experience: '7 Years',
    registrationNo: 'MLT-2019-8877',
    regNo: 'MLT-2019-8877',
    labLicenseNo: 'LAB-LIC-2022-9901',
    licenseNumber: 'LAB-LIC-2022-9901',
    phone: '+91 9876543221',
    avatar: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'u13',
    name: 'Rahul Receptionist',
    email: 'reception@hospital.com',
    role: 'RECEPTION',
    department: 'Front Desk & Billing',
    specialization: 'Patient Intake & Registration Specialist',
    specialty: 'Patient Intake & Registration Specialist',
    degree: 'B.Com, Hospital Administration Dip.',
    qualification: 'B.Com, Hospital Administration Dip.',
    experience: '4 Years',
    registrationNo: 'EMP-REC-001',
    regNo: 'EMP-REC-001',
    phone: '+91 9876543222',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=600'
  }
];

export const MOCK_PATIENTS: Patient[] = [];

export const MOCK_BEDS: Bed[] = [
  { id: 'b1', number: '101', ward: 'General Ward A', type: 'General', status: 'Available' },
  { id: 'b2', number: '102', ward: 'General Ward A', type: 'General', status: 'Available' },
  { id: 'b3', number: '201', ward: 'ICU', type: 'ICU', status: 'Available' },
  { id: 'b4', number: 'M1', ward: 'Maternity', type: 'Maternity', status: 'Available' },
];

export const INITIAL_BEDS: Bed[] = MOCK_BEDS;

export const INITIAL_ADMISSIONS: any[] = [];

export const MOCK_APPOINTMENTS: Appointment[] = [];

export const MOCK_BILLING: any[] = [];

export const MOCK_INVENTORY: InventoryItem[] = [
  { 
    id: 'i1', 
    name: 'Paracetamol 500mg', 
    category: 'Medicine', 
    stock: 500, 
    unit: 'Tablets', 
    minStockLevel: 100, 
    expiryDate: '2025-12-31',
    mrp: 15.50,
    sellingPrice: 12.00,
    purchasePrice: 8.00,
    taxPercentage: 12,
    hsnCode: '3004',
    rackNumber: 'A-101'
  },
  { 
    id: 'i2', 
    name: 'Amoxicillin 250mg', 
    category: 'Medicine', 
    stock: 50, 
    unit: 'Capsules', 
    minStockLevel: 100, 
    expiryDate: '2024-08-15',
    mrp: 45.00,
    sellingPrice: 40.00,
    purchasePrice: 30.00,
    taxPercentage: 12,
    hsnCode: '3004',
    rackNumber: 'B-202'
  },
  { 
    id: 'i3', 
    name: 'Moxikind-CV 625', 
    category: 'Medicine', 
    stock: 90, 
    unit: 'Strips', 
    minStockLevel: 10, 
    expiryDate: '2025-08-31',
    mrp: 150.00,
    sellingPrice: 120.00,
    purchasePrice: 80.00,
    taxPercentage: 12,
    hsnCode: '3004',
    rackNumber: 'B-902',
    batchNumber: 'B-902',
    composition: 'Amoxicillin + Clavulanic Acid',
    units_per_strip: 10,
    loose_selling_price: 12.00,
    loose_stock: 0,
    is_loose_sale_enabled: true
  },
  {
    id: 'i4',
    name: 'crocin',
    category: 'Medicine',
    stock: 20,
    unit: 'Strips',
    minStockLevel: 10,
    expiryDate: '2030-01-01',
    mrp: 55.00,
    sellingPrice: 52.00,
    purchasePrice: 26.00,
    taxPercentage: 12,
    hsnCode: '3004',
    rackNumber: 'N/A',
    batchNumber: '26',
    composition: 'Amoxicillin + Clavulanic Acid',
    units_per_strip: 10,
    loose_selling_price: 9.00,
    loose_stock: 80,
    is_loose_sale_enabled: true
  },
];

export const MOCK_THEATRES: OperationTheatre[] = [
  { id: 'ot1', name: 'OT-01 (Major General Suite)', status: 'Occupied', type: 'Major' },
  { id: 'ot2', name: 'OT-02 (Cardiac & Thoracic OT)', status: 'Occupied', type: 'Cardiac' },
  { id: 'ot3', name: 'OT-03 (Orthopedic & Joint Surgery)', status: 'Available', type: 'Orthopedic' },
  { id: 'ot4', name: 'OT-04 (Laparoscopy & Day Care OT)', status: 'Available', type: 'Minor' },
];

export const MOCK_OPERATION_RECORDS: OperationRecord[] = [
  {
    id: 'ot-rec-001',
    patientId: 'p1',
    theatreId: 'ot1',
    surgeonId: 'u8',
    operationName: 'Laparoscopic Cholecystectomy',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:30 AM',
    endTime: '11:45 AM',
    status: 'In-Progress',
    notes: 'Elective laparoscopic removal of gallbladder for symptomatic cholelithiasis. Three-port technique, vitals stable.',
    documents: []
  },
  {
    id: 'ot-rec-002',
    patientId: 'p2',
    theatreId: 'ot2',
    surgeonId: 'u5',
    operationName: 'Coronary Angioplasty (PTCA) with Stent',
    date: new Date().toISOString().split('T')[0],
    startTime: '10:00 AM',
    endTime: '12:30 PM',
    status: 'In-Progress',
    notes: 'Drug-eluting stent placement to proximal LAD artery. Hemodynamics and cardiac rhythms stable throughout.',
    documents: []
  },
  {
    id: 'ot-rec-003',
    patientId: 'p3',
    theatreId: 'ot3',
    surgeonId: 'u5',
    operationName: 'Total Knee Replacement (Right)',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    startTime: '11:00 AM',
    endTime: '01:30 PM',
    status: 'Scheduled',
    notes: 'Pre-op clearance and anesthesia evaluation completed. Cemented posterior-stabilized knee arthroplasty scheduled.',
    documents: []
  },
  {
    id: 'ot-rec-004',
    patientId: 'p4',
    theatreId: 'ot4',
    surgeonId: 'u8',
    operationName: 'Emergency Laparoscopic Appendectomy',
    date: new Date().toISOString().split('T')[0],
    startTime: '02:00 PM',
    endTime: '03:30 PM',
    status: 'Scheduled',
    notes: 'Acute appendicitis with localized peritonitis. Fast-tracked emergency surgical clearance.',
    documents: []
  },
  {
    id: 'ot-rec-005',
    patientId: 'p1',
    theatreId: 'ot1',
    surgeonId: 'u7',
    operationName: 'Diagnostic Upper GI Endoscopy with Biopsy',
    date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
    startTime: '08:30 AM',
    endTime: '09:15 AM',
    status: 'Completed',
    notes: 'Antral gastritis identified, 3 mucosal punch biopsies collected for histopathology.',
    documents: []
  }
];

export const MOCK_NURSING_TASKS: NursingTask[] = [];

export const MOCK_NURSE_SHIFTS: NurseShift[] = [];

export const MOCK_PATIENT_VITALS: PatientVitals[] = [];

export const MOCK_PRESCRIPTIONS: Prescription[] = [];

export const MOCK_PHARMACY_BILLING: BillingRecord[] = [];

export const MOCK_RADIOLOGY_TESTS = INITIAL_RADIOLOGY_MASTER_TESTS;

export const MOCK_LAB_TESTS = [
  ...INITIAL_PATHOLOGY_MASTER_TESTS.map(t => ({
    id: t.id,
    no: t.no,
    code: t.code,
    name: t.name,
    price: t.price,
    vial: t.vial,
    category: 'Pathology' as const,
    department: 'Pathology'
  })),
  ...MOCK_RADIOLOGY_TESTS
];

export const MOCK_BED_RATES = [
  { type: 'General', rate: 2000, doctorVisit: 1200, includes: 'Bed / Nursing / Duty-Doctor' },
  { type: 'Semi-Private', rate: 2750, doctorVisit: 1500, includes: 'Bed / Nursing / Duty-Doctor' },
  { type: 'Private', rate: 3500, doctorVisit: 1500, includes: 'Bed / Nursing / Duty-Doctor' },
  { type: 'Deluxe', rate: 4500, doctorVisit: 1500, includes: 'Bed / Nursing / Duty-Doctor' },
  { type: 'ICU', rate: 4500, doctorVisit: 1500, includes: 'Bed / Nursing / Duty-Doctor' },
  { type: 'Observation (General-Ward)', rate: 1000, doctorVisit: 1000, includes: 'Short Stay Observation (₹1000 - ₹1500)' },
];

export const MOCK_HOSPITAL_ROOM_RATES = [
  { id: 'hr-1', no: '21', service: 'IPD Registration Fees', category: 'Registration', charges: 200, billingUnit: 'One Time', notes: 'Mandatory on IPD Admission' },
  { id: 'hr-2', no: '22', service: 'General Ward Charges (per day)', category: 'Room/Bed', charges: 2000, billingUnit: 'Per Day', notes: 'Includes Bed / Nursing / Duty-Doctor' },
  { id: 'hr-3', no: '23', service: 'Senior Doctor Visit (General Ward)', category: 'Doctor Visit', charges: 1200, billingUnit: 'Per Visit', notes: 'Daily Consultant / Senior Doctor Visit' },
  { id: 'hr-4', no: '24', service: 'Semi-Private Room Charges (per day)', category: 'Room/Bed', charges: 2750, billingUnit: 'Per Day', notes: 'Includes Bed / Nursing / Duty-Doctor' },
  { id: 'hr-5', no: '25', service: 'Senior Doctor Visit (Semi-Private)', category: 'Doctor Visit', charges: 1500, billingUnit: 'Per Visit', notes: 'Daily Consultant / Senior Doctor Visit' },
  { id: 'hr-6', no: '26', service: 'Private Room Charges (Per Day)', category: 'Room/Bed', charges: 3500, billingUnit: 'Per Day', notes: 'Includes Bed / Nursing / Duty-Doctor' },
  { id: 'hr-7', no: '27', service: 'Senior Doctor Visit (Private)', category: 'Doctor Visit', charges: 1500, billingUnit: 'Per Visit', notes: 'Daily Consultant / Senior Doctor Visit' },
  { id: 'hr-8', no: '28', service: 'Deluxe Room Charges (Per Day)', category: 'Room/Bed', charges: 4500, billingUnit: 'Per Day', notes: 'Includes Bed / Nursing / Duty-Doctor' },
  { id: 'hr-9', no: '29', service: 'Senior Doctor Visit (Deluxe)', category: 'Doctor Visit', charges: 1500, billingUnit: 'Per Visit', notes: 'Daily Consultant / Senior Doctor Visit' },
  { id: 'hr-10', no: '30', service: 'ICU Charges (per day)', category: 'Critical Care', charges: 4500, billingUnit: 'Per Day', notes: 'Includes Bed / Nursing / Duty-Doctor' },
  { id: 'hr-11', no: '31', service: 'Senior Doctor Visit (ICU)', category: 'Doctor Visit', charges: 1500, billingUnit: 'Per Visit', notes: 'Intensivist / Senior Consultant Daily Rounds' },
  { id: 'hr-12', no: '32', service: 'Observation (General-Ward)', category: 'Observation', charges: 1000, billingUnit: 'Per Day', notes: 'Standard ₹1000 - ₹1500 based on hours' },
  { id: 'hr-13', no: '33', service: 'Specialist Doctor Visit', category: 'Doctor Visit', charges: 1500, billingUnit: 'Per Visit', notes: 'Range ₹1000 - ₹2000' },
  { id: 'hr-14', no: '34', service: 'Surgery Charges', category: 'OT/Surgery', charges: 0, billingUnit: 'As Per Surgery', notes: 'Variable as per procedure & surgical team' },
];

export const MOCK_GASTRO_SERVICES = [
  { id: 'gs-1', no: '1', service: 'General OPD', category: 'OPD Consultation', charges: 500, followUpCharges: 300, notes: 'Standard General OPD Consultation' },
  { id: 'gs-2', no: '2', service: 'OPD (Dr. Anirudh Tiwari)', category: 'OPD Consultation', charges: 600, followUpCharges: 500, notes: 'First Visit: ₹600 | After 7 Days: ₹500' },
  { id: 'gs-3', no: '3', service: 'OPD (Dr. Ashay Rathore)', category: 'OPD Consultation', charges: 500, followUpCharges: 500, notes: 'First Visit: ₹500 | After 7 Days: ₹500' },
  { id: 'gs-4', no: '4', service: 'Endoscopy', category: 'Endoscopy', charges: 2500, sedationCharges: 2000, notes: 'Upper GI Diagnostic Endoscopy' },
  { id: 'gs-5', no: '5', service: 'Sigmoidoscopy', category: 'Endoscopy', charges: 2500, sedationCharges: 0, notes: 'Flexible Sigmoidoscopy Evaluation' },
  { id: 'gs-6', no: '6', service: 'Colonoscopy', category: 'Colonoscopy', charges: 4000, sedationCharges: 2000, notes: 'Full Diagnostic Colonoscopy' },
  { id: 'gs-7', no: '7', service: 'Foreign Body Removal', category: 'Therapeutic GI', charges: 15000, sedationCharges: 2000, notes: 'Endoscopic Foreign Body Extraction' },
  { id: 'gs-8', no: '8', service: 'SE Dilatation', category: 'Therapeutic GI', charges: 8000, sedationCharges: 2000, notes: 'Stricture / Esophageal Dilatation' },
  { id: 'gs-9', no: '9', service: 'APC (Argon Plasma Coagulation)', category: 'Therapeutic GI', charges: 10000, sedationCharges: 2000, notes: 'Thermal Coagulation & Hemostasis' },
  { id: 'gs-10', no: '10', service: 'Polypectomy', category: 'Therapeutic GI', charges: 5000, sedationCharges: 2000, notes: 'Endoscopic Mucosal Snare Polypectomy' },
  { id: 'gs-11', no: '11', service: 'ERCP', category: 'ERCP', charges: 25000, sedationCharges: 2000, notes: 'Diagnostic & Therapeutic ERCP' },
  { id: 'gs-12', no: '12', service: 'Banding (EVL)', category: 'Therapeutic GI', charges: 8000, sedationCharges: 2000, notes: 'Endoscopic Variceal Ligation (EVL)' },
  { id: 'gs-13', no: '13', service: 'Biliary SEMS/ Duo-Denal', category: 'Therapeutic GI', charges: 25000, sedationCharges: 2000, notes: 'Biliary / Duodenal Metal Stenting' },
  { id: 'gs-14', no: '14', service: 'Colonic SEMS Stenting', category: 'Therapeutic GI', charges: 25000, extraChargesNote: '+ cost of Stent', notes: 'Colonic Self-Expanding Metal Stenting' },
  { id: 'gs-15', no: '15', service: 'Manometry', category: 'Diagnostic GI', charges: 6000, sedationCharges: 0, notes: 'High-Resolution Esophageal / Anorectal Manometry' },
  { id: 'gs-16', no: '16', service: 'Anesthesia + Medicines (For Sedation)', category: 'Sedation/Anesthesia', charges: 2000, sedationCharges: 2000, notes: 'Conscious Sedation & Monitored Anesthesia Care' },
  { id: 'gs-17', no: '17', service: 'Biopsy', category: 'Biopsy/Pathology', charges: 1000, rangeText: '₹500 - ₹1500', notes: 'Tissue sampling pack (₹500 - ₹1500)' },
  { id: 'gs-18', no: '18', service: 'TTS Balloon Dilatation', category: 'Therapeutic GI', charges: 12000, sedationCharges: 2000, notes: 'Through-The-Scope Balloon Dilatation' },
  { id: 'gs-19', no: '19', service: 'Achalasia Balloon Dilatation', category: 'Therapeutic GI', charges: 12000, sedationCharges: 2000, notes: 'Pneumatic Balloon Dilatation for Achalasia' },
  { id: 'gs-20', no: '20', service: 'Esophageal Stenting', category: 'Therapeutic GI', charges: 20000, extraChargesNote: '+ cost of Stent', notes: 'Esophageal SEMS Placement (+ cost of Stent)' },
  { id: 'gs-21', no: '21', service: 'Esophageal Stenting Covered', category: 'Therapeutic GI', charges: 20000, extraChargesNote: '+ cost of Stent', notes: 'Fully / Partially Covered Stent Placement (+ cost of Stent)' },
];

export const MOCK_CARDIOLOGY_EQUIPMENT_RATES = [
  { id: 'cd-1', no: '37', service: 'ECG', category: 'Cardiology', charges: 300, billingUnit: 'Each', notes: '12-Lead Electrocardiogram' },
  { id: 'cd-2', no: '38', service: 'Multipara Monitoring (Per Day)', category: 'Critical Care Monitoring', charges: 500, billingUnit: 'Per Day', notes: 'Continuous Cardiac & SpO2 Monitor' },
  { id: 'cd-3', no: '39', service: 'Ventilator (Per Day)', category: 'Critical Care Equipment', charges: 4000, billingUnit: 'Per Day', notes: 'Invasive / Advanced Mechanical Ventilation' },
  { id: 'cd-4', no: '40', service: 'Oxygen (Per Day)', category: 'Respiratory Support', charges: 1500, billingUnit: 'Per Day', notes: 'High Flow / Mask Oxygen Supply' },
  { id: 'cd-5', no: '41', service: 'Nebulisation (Each)', category: 'Respiratory Procedure', charges: 200, billingUnit: 'Each Session', notes: 'Medicated Bronchodilator Nebulisation' },
  { id: 'cd-6', no: '42', service: 'Blood Sugar (Each)', category: 'Bedside Testing', charges: 50, billingUnit: 'Each Test', notes: 'Point of Care CBG / GRBS' },
  { id: 'cd-7', no: '43', service: 'Combo ABG (Each)', category: 'Critical Care Testing', charges: 1500, billingUnit: 'Each Test', notes: 'Arterial Blood Gas Analysis & Electrolytes' },
  { id: 'cd-8', no: '44', service: 'Syringe/Infusion Pump (Per Day)', category: 'Critical Care Equipment', charges: 500, billingUnit: 'Per Day', notes: 'Precision Micro-Infusion Syringe Pump' },
  { id: 'cd-9', no: '45', service: 'Air Bed Charges (Per Day)', category: 'Patient Comfort / ICU', charges: 300, billingUnit: 'Per Day', notes: 'Anti-Decubitus Alternating Pressure Air Mattress' },
];

export const MOCK_CLINICAL_PROCEDURE_RATES = [
  { id: 'pr-1', no: '46', service: 'Central Line (Femoral/Sub Clavian)', category: 'Vascular Access', charges: 2500, notes: 'CVC Cannulation under sterile guidance' },
  { id: 'pr-2', no: '47', service: 'Intubation', category: 'Airway Management', charges: 3000, notes: 'Endotracheal Tube Intubation' },
  { id: 'pr-3', no: '48', service: 'Stitching (Minor)', category: 'Wound Care', charges: 1000, notes: 'Suturing for lacerations / wounds' },
  { id: 'pr-4', no: '49', service: 'Arterial Line', category: 'Vascular Access', charges: 1500, notes: 'Arterial Cannulation for Invasive BP Monitoring' },
  { id: 'pr-5', no: '50', service: 'Ascitic Fluid Tapping', category: 'Diagnostic & Therapeutic', charges: 1500, notes: 'Abdominal Paracentesis / Fluid Drainage' },
  { id: 'pr-6', no: '51', service: 'Blood Transfusion', category: 'Transfusion', charges: 1500, notes: 'PRBC / FFP / Platelet Transfusion Monitoring' },
  { id: 'pr-7', no: '52', service: 'Emergency Charges', category: 'Emergency Service', charges: 1500, notes: 'Emergency triage & acute stabilization fee' },
  { id: 'pr-8', no: '53', service: 'Dressing (Minor)', category: 'Wound Care', charges: 200, notes: 'Small wound / stitch dressing' },
  { id: 'pr-9', no: '54', service: 'Dressing (Major)', category: 'Wound Care', charges: 500, notes: 'Extensive surgical / burn wound dressing' },
];

export const MOCK_HOSPITAL_BILLING_POLICY = {
  serviceChargePercent: 10,
  serviceChargeNote: '10% service charges will be applicable on total hospital bills',
  medicinesPricingRule: 'Medicines are charged according to the MRP',
  icuAdmissionDeposit: 10000,
  otherRoomsAdmissionDeposit: 5000,
  depositPolicyNote: 'Minimum deposit on ICU admission is ₹10,000 and for other rooms is ₹5,000'
};

export const MOCK_OT_RATES = [
  { type: 'Minor', rate: 5000 },
  { type: 'Major', rate: 15000 },
  { type: 'Cardiac', rate: 45000 },
  { type: 'Neuro', rate: 55000 },
];

export const MOCK_MATERIAL_RATES = [
  { name: 'Surgical Gloves', price: 150, category: 'Disposable' },
  { name: 'Syringes (Pack of 10)', price: 100, category: 'Disposable' },
  { name: 'IV Fluid Set', price: 450, category: 'Disposable' },
  { name: 'Cotton / Bandage Kit', price: 200, category: 'Material' },
  { name: 'Disinfectant Solution', price: 350, category: 'Material' },
  { name: 'Catheter Set', price: 850, category: 'Disposable' },
];

export const MOCK_ENDO_RATES: Record<string, { baseFee: number; sedationFee: number; kitFee: number; category: 'Endoscopy' | 'Colonoscopy' | 'ERCP' | 'Polypectomy' | 'EVL Banding' | 'Sigmoidoscopy' | 'Minor GI Procedure' }> = {
  'Endoscopy': { baseFee: 2500, sedationFee: 2000, kitFee: 1000, category: 'Endoscopy' },
  'Upper GI Diagnostic Endoscopy (EGD)': { baseFee: 2500, sedationFee: 2000, kitFee: 1000, category: 'Endoscopy' },
  'Sigmoidoscopy': { baseFee: 2500, sedationFee: 0, kitFee: 0, category: 'Sigmoidoscopy' },
  'Colonoscopy': { baseFee: 4000, sedationFee: 2000, kitFee: 1000, category: 'Colonoscopy' },
  'Foreign Body Removal': { baseFee: 15000, sedationFee: 2000, kitFee: 0, category: 'Minor GI Procedure' },
  'SE Dilatation': { baseFee: 8000, sedationFee: 2000, kitFee: 0, category: 'Minor GI Procedure' },
  'APC (Argon Plasma Coagulation)': { baseFee: 10000, sedationFee: 2000, kitFee: 0, category: 'Minor GI Procedure' },
  'Polypectomy': { baseFee: 5000, sedationFee: 2000, kitFee: 1000, category: 'Polypectomy' },
  'ERCP': { baseFee: 25000, sedationFee: 2000, kitFee: 0, category: 'ERCP' },
  'Banding (EVL)': { baseFee: 8000, sedationFee: 2000, kitFee: 0, category: 'EVL Banding' },
  'Biliary SEMS/ Duo-Denal': { baseFee: 25000, sedationFee: 2000, kitFee: 0, category: 'Minor GI Procedure' },
  'Colonic SEMS Stenting': { baseFee: 25000, sedationFee: 2000, kitFee: 0, category: 'Colonoscopy' },
  'Manometry': { baseFee: 6000, sedationFee: 0, kitFee: 0, category: 'Endoscopy' },
  'Anesthesia + Medicines (For Sedation)': { baseFee: 2000, sedationFee: 2000, kitFee: 0, category: 'Minor GI Procedure' },
  'Biopsy': { baseFee: 1000, sedationFee: 0, kitFee: 1000, category: 'Endoscopy' },
  'TTS Balloon Dilatation': { baseFee: 12000, sedationFee: 2000, kitFee: 0, category: 'Minor GI Procedure' },
  'Achalasia Balloon Dilatation': { baseFee: 12000, sedationFee: 2000, kitFee: 0, category: 'Minor GI Procedure' },
  'Esophageal Stenting': { baseFee: 20000, sedationFee: 2000, kitFee: 0, category: 'Endoscopy' },
  'Esophageal Stenting Covered': { baseFee: 20000, sedationFee: 2000, kitFee: 0, category: 'Endoscopy' },
};

