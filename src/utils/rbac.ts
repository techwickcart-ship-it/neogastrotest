import { storage, STORAGE_KEYS } from '../lib/storage';

export type UserRole = 
  | 'SUPER_ADMIN' 
  | 'ADMIN'
  | 'HOSPITAL_ADMIN'
  | 'DOCTOR' 
  | 'RECEPTIONIST' 
  | 'RECEPTION'
  | 'FRONT_DESK'
  | 'NURSE' 
  | 'LAB_STAFF' 
  | 'PHARMACIST' 
  | 'ACCOUNTANT'
  | 'ACCOUNTS'
  | 'SURGEON'
  | 'RADIOLOGIST'
  | 'PATHOLOGIST';

// Normalizes role names to handle spelling differences/upper/lower cases
export const normalizeRole = (role: string | undefined | null): string => {
  if (!role) return '';
  const r = role.toUpperCase().trim().replace(/_/g, '').replace(/ /g, '');
  if (r === 'SUPERADMIN' || r === 'ADMIN' || r === 'HOSPITALADMIN' || r.includes('ADMIN')) return 'ADMIN';
  if (r === 'RECEPTION' || r === 'RECEPTIONIST' || r === 'FRONTDESK' || r === 'FRONTOFFICE') return 'RECEPTIONIST';
  if (r === 'ACCOUNTANT' || r === 'ACCOUNTS' || r === 'FINANCE' || r === 'CASHIER') return 'ACCOUNTANT';
  if (r === 'DOCTOR' || r === 'SURGEON' || r === 'PHYSICIAN' || r === 'CONSULTANT') return 'DOCTOR';
  if (r === 'NURSE' || r === 'MATRON' || r === 'NURSING') return 'NURSE';
  if (r === 'LABSTAFF' || r === 'LAB' || r === 'PATHOLOGIST' || r === 'RADIOLOGIST' || r === 'LABTECHNICIAN') return 'LAB_STAFF';
  if (r === 'PHARMACIST' || r === 'PHARMACY') return 'PHARMACIST';
  return r;
};

// Returns whether the current user role is an Admin
export const isUserAdmin = (role: string | undefined | null): boolean => {
  if (!role) return false;
  const str = String(role).toUpperCase().trim();
  if (str.includes('ADMIN') || str === 'SUPER_ADMIN' || str === 'HOSPITAL_ADMIN' || str === 'SUPERADMIN') return true;
  const norm = normalizeRole(role);
  return norm === 'ADMIN';
};

export const isDoctorUser = (role: string | undefined | null): boolean => {
  return normalizeRole(role) === 'DOCTOR';
};

export const isNurseUser = (role: string | undefined | null): boolean => {
  return normalizeRole(role) === 'NURSE';
};

export const isReceptionistUser = (role: string | undefined | null): boolean => {
  return normalizeRole(role) === 'RECEPTIONIST';
};

export const isAccountantUser = (role: string | undefined | null): boolean => {
  return normalizeRole(role) === 'ACCOUNTANT';
};

export const isPharmacistUser = (role: string | undefined | null): boolean => {
  return normalizeRole(role) === 'PHARMACIST';
};

export const isLabUser = (role: string | undefined | null): boolean => {
  return normalizeRole(role) === 'LAB_STAFF';
};

// Checks if a user has delete permissions (Admins only)
export const canUserDeleteRecord = (userRole: string | undefined | null): boolean => {
  return isUserAdmin(userRole);
};

// Checks if a record was created by an admin
export const isRecordCreatedByAdmin = (record: any): boolean => {
  if (!record) return false;
  if (record.created_by_admin === true || record.createdByAdmin === true) return true;
  const role = record.created_by_role || record.createdByRole;
  if (role && isUserAdmin(role)) return true;
  return false;
};

// Checks if a user has permission to edit/delete a specific record
export const canUserEditRecord = (record: any, currentUser: any): boolean => {
  if (!currentUser) return true;
  if (isUserAdmin(currentUser.role)) return true;
  return true;
};

export const canUserModifyRecord = (record: any, currentUser: any, users?: any[]): boolean => {
  if (!currentUser) return true;
  if (isUserAdmin(currentUser.role)) return true;
  return true;
};

// Check if a user has access to view a specific menu / page
export const hasMenuAccess = (path: string, userRole: string | undefined | null): boolean => {
  if (!userRole) return true;
  if (isUserAdmin(userRole)) return true;

  const role = normalizeRole(userRole);
  const cleanPath = path.toLowerCase().split('?')[0];

  // Common pages accessible to all authenticated staff
  if (cleanPath === '/' || cleanPath === '/patient-overview' || cleanPath === '/manual') {
    return true;
  }

  switch (role) {
    case 'DOCTOR':
      return [
        '/',
        '/patient-overview',
        '/emergency',
        '/opd',
        '/endoscopy',
        '/visiting-consultants',
        '/ipd',
        '/icu',
        '/ot',
        '/nursing',
        '/medication-chart',
        '/maternity',
        '/lab',
        '/bloodbank',
        '/equipment',
        '/mrd',
        '/manual'
      ].includes(cleanPath);

    case 'RECEPTIONIST':
      return [
        '/',
        '/patient-overview',
        '/emergency',
        '/opd',
        '/visiting-consultants',
        '/ipd',
        '/maternity',
        '/billing',
        '/insurance',
        '/mrd',
        '/manual'
      ].includes(cleanPath);

    case 'NURSE':
      return [
        '/',
        '/patient-overview',
        '/emergency',
        '/ipd',
        '/icu',
        '/ot',
        '/nursing',
        '/medication-chart',
        '/maternity',
        '/bloodbank',
        '/lab',
        '/equipment',
        '/waste',
        '/mrd',
        '/manual'
      ].includes(cleanPath);

    case 'PHARMACIST':
      return [
        '/',
        '/patient-overview',
        '/pharmacy',
        '/pharmacy/pos',
        '/inventory',
        '/manual'
      ].includes(cleanPath);

    case 'LAB_STAFF':
      return [
        '/',
        '/patient-overview',
        '/lab',
        '/bloodbank',
        '/equipment',
        '/waste',
        '/manual'
      ].includes(cleanPath);

    case 'ACCOUNTANT':
      return [
        '/',
        '/patient-overview',
        '/billing',
        '/insurance',
        '/expenses',
        '/inventory',
        '/mrd',
        '/manual'
      ].includes(cleanPath);

    default:
      return true;
  }
};

// Returns whether the current user role can view general financial figures and graphs
export const canUserViewFinancials = (userRole: string | undefined | null): boolean => {
  if (!userRole) return true;
  if (isUserAdmin(userRole)) return true;
  const role = normalizeRole(userRole);
  return role === 'ACCOUNTANT';
};

// Checks if specific clinical fields/forms (like prescription entry) are editable/visible
export const canUserEditClinicalData = (userRole: string | undefined | null): boolean => {
  if (!userRole) return true;
  if (isUserAdmin(userRole)) return true;
  const role = normalizeRole(userRole);
  return role === 'DOCTOR';
};

// Checks if specific billing operations (refund, discount, edit invoice) are allowed
export const canUserManageBilling = (userRole: string | undefined | null): boolean => {
  if (!userRole) return true;
  if (isUserAdmin(userRole)) return true;
  const role = normalizeRole(userRole);
  return role === 'ACCOUNTANT' || role === 'RECEPTIONIST';
};

/**
 * Strict verification of whether a doctor is assigned to a specific patient
 */
export const isDoctorAssignedToPatient = (
  patient: any,
  doctorUser: any,
  appointments?: any[],
  admissions?: any[]
): boolean => {
  if (!patient || !doctorUser) return false;
  
  const docIdStr = String(doctorUser.id || '').trim().toLowerCase();
  const docNameStr = String(doctorUser.name || '').trim().toLowerCase();
  const docNameClean = docNameStr.replace(/^dr\.\s*/i, '').trim();

  // 1. Direct patient attending_doctor_id / attendingDoctorId check
  const pDocId = String(patient.attending_doctor_id || patient.attendingDoctorId || patient.doctor_id || patient.doctorId || '').trim().toLowerCase();
  if (pDocId && (pDocId === docIdStr || pDocId === docNameStr)) {
    return true;
  }

  // 2. Direct patient attending_doctor / attendingDoctor name check
  const pDocName = String(patient.attending_doctor || patient.attendingDoctor || patient.doctor || patient.doctorName || patient.assigned_doctor || '').trim().toLowerCase();
  const pDocNameClean = pDocName.replace(/^dr\.\s*/i, '').trim();
  if (pDocName && (
    pDocName === docNameStr || 
    pDocNameClean === docNameClean ||
    (docNameClean.length > 3 && pDocNameClean.includes(docNameClean)) ||
    (pDocNameClean.length > 3 && docNameClean.includes(pDocNameClean))
  )) {
    return true;
  }

  const patId = patient.id;

  // 3. Check appointments list if provided or retrieve from storage
  const apptsList = appointments || storage.get(STORAGE_KEYS.APPOINTMENTS, []);
  if (Array.isArray(apptsList) && patId) {
    const hasAptMatch = apptsList.some((apt: any) => {
      const aptPatId = apt.patient_id || apt.patientId;
      const patMatches = aptPatId === patId || 
        (apt.patientName && patient.name && String(apt.patientName).trim().toLowerCase() === String(patient.name).trim().toLowerCase()) ||
        (apt.patientMrn && patient.mrn && String(apt.patientMrn).trim().toLowerCase() === String(patient.mrn).trim().toLowerCase());

      if (!patMatches) return false;

      const aptDocId = String(apt.doctor_id || apt.doctorId || '').trim().toLowerCase();
      const aptDocName = String(apt.doctor || apt.doctorName || '').trim().toLowerCase();
      const aptDocClean = aptDocName.replace(/^dr\.\s*/i, '').trim();

      return (
        (aptDocId && aptDocId === docIdStr) ||
        (aptDocName && aptDocName === docNameStr) ||
        (aptDocClean && aptDocClean === docNameClean) ||
        (docNameClean.length > 3 && aptDocClean.includes(docNameClean))
      );
    });

    if (hasAptMatch) return true;
  }

  // 4. Check IPD admissions list if provided or retrieve from storage
  const admList = admissions || storage.get(STORAGE_KEYS.ADMISSIONS, []);
  if (Array.isArray(admList) && patId) {
    const hasAdmMatch = admList.some((adm: any) => {
      const admPatId = adm.patient_id || adm.patientId;
      const patMatches = admPatId === patId ||
        (adm.patient_name && patient.name && String(adm.patient_name).trim().toLowerCase() === String(patient.name).trim().toLowerCase()) ||
        (adm.mrn && patient.mrn && String(adm.mrn).trim().toLowerCase() === String(patient.mrn).trim().toLowerCase());

      if (!patMatches) return false;

      const admDocId = String(adm.doctor_id || adm.doctorId || adm.attending_doctor_id || '').trim().toLowerCase();
      const admDocName = String(adm.attending_doctor || adm.doctor || adm.doctorName || '').trim().toLowerCase();
      const admDocClean = admDocName.replace(/^dr\.\s*/i, '').trim();

      return (
        (admDocId && admDocId === docIdStr) ||
        (admDocName && admDocName === docNameStr) ||
        (admDocClean && admDocClean === docNameClean) ||
        (docNameClean.length > 3 && admDocClean.includes(docNameClean))
      );
    });

    if (hasAdmMatch) return true;
  }

  return false;
};

/**
 * Validates whether the logged in user can write/edit a prescription for a patient
 */
export const canDoctorWritePrescription = (
  patient: any,
  currentUser: any,
  appointments?: any[],
  admissions?: any[]
): { allowed: boolean; reason?: string; assignedDoctorName?: string } => {
  if (!currentUser) return { allowed: true };
  
  if (isUserAdmin(currentUser.role)) {
    return { allowed: true };
  }

  const role = normalizeRole(currentUser.role);
  if (role === 'RECEPTIONIST') {
    return { 
      allowed: false, 
      reason: 'Front Desk / Receptionists can record intake vitals but cannot write clinical prescriptions.' 
    };
  }

  if (role === 'NURSE') {
    return { 
      allowed: false, 
      reason: 'Nurses cannot prescribe medications. Use the MAR or Nursing Station to record vitals and administer doses.' 
    };
  }

  if (role !== 'DOCTOR') {
    return { 
      allowed: false, 
      reason: 'Only medical doctors or administrators have permission to write patient prescriptions.' 
    };
  }

  // User is a Doctor: verify assignment
  const isAssigned = isDoctorAssignedToPatient(patient, currentUser, appointments, admissions);
  if (isAssigned) {
    return { allowed: true };
  }

  const assignedDoc = patient?.attending_doctor || patient?.attendingDoctor || patient?.doctor || 'another assigned physician';
  return {
    allowed: false,
    reason: `Access restricted: Each doctor can write prescriptions only for patients assigned to them as their Attending Doctor. This patient is currently assigned to ${assignedDoc}.`,
    assignedDoctorName: assignedDoc
  };
};

/**
 * Validates whether the logged in user can write clinical doctor notes for a patient
 */
export const canDoctorWriteClinicalNotes = (
  patient: any,
  currentUser: any,
  appointments?: any[],
  admissions?: any[]
): { allowed: boolean; reason?: string } => {
  if (!currentUser) return { allowed: true };
  if (isUserAdmin(currentUser.role)) return { allowed: true };

  const role = normalizeRole(currentUser.role);
  if (role !== 'DOCTOR') {
    return { 
      allowed: false, 
      reason: 'Only assigned medical doctors or administrators can record physician clinical notes.' 
    };
  }

  const isAssigned = isDoctorAssignedToPatient(patient, currentUser, appointments, admissions);
  if (isAssigned) {
    return { allowed: true };
  }

  const assignedDoc = patient?.attending_doctor || patient?.attendingDoctor || 'their assigned doctor';
  return {
    allowed: false,
    reason: `Access restricted: Only ${assignedDoc} (the assigned doctor) or an Administrator can record clinical notes for this patient.`
  };
};

