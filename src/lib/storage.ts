
export function isLiveEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') return false;
  if (hostname.includes('ais-dev') || hostname.includes('ais-pre')) return false;
  return true;
}

function isSupabaseConfig(): boolean {
  try {
    const getCleanItem = (key: string): string | null => {
      if (typeof window === 'undefined') return null;
      const val = localStorage.getItem(key);
      if (!val || typeof val !== 'string') return null;
      const trimmed = val.trim();
      if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined' || trimmed === 'placeholder-key' || trimmed.includes('placeholder')) {
        return null;
      }
      return trimmed;
    };

    const getEnvVal = (key: string): string | null => {
      // Try static lookup first for Vite replacement compatibility
      let val: string | undefined | null = null;
      if (key === 'VITE_SUPABASE_URL') {
        val = import.meta.env.VITE_SUPABASE_URL;
      } else if (key === 'VITE_SUPABASE_ANON_KEY') {
        val = import.meta.env.VITE_SUPABASE_ANON_KEY;
      } else if (key === 'SUPABASE_URL') {
        val = import.meta.env.SUPABASE_URL;
      } else if (key === 'SUPABASE_ANON_KEY') {
        val = import.meta.env.SUPABASE_ANON_KEY;
      }

      // Fallback to dynamic lookup if not matched
      if (!val) {
        if (typeof import.meta !== 'undefined' && import.meta.env && typeof import.meta.env[key] === 'string') {
          val = import.meta.env[key];
        }
      }
      if (!val) {
        if (typeof process !== 'undefined' && process.env && typeof process.env[key] === 'string') {
          val = process.env[key];
        }
      }

      if (val) {
        const trimmed = val.trim();
        if (trimmed !== '' && trimmed !== 'null' && trimmed !== 'undefined' && trimmed !== 'placeholder-key' && !trimmed.includes('placeholder')) {
          return trimmed;
        }
      }
      return null;
    };

    const url = getCleanItem('hms_supabase_url') || 
                getEnvVal('VITE_SUPABASE_URL') || 
                getEnvVal('SUPABASE_URL') || 
                'https://iazonufxhycppyzwhnvq.supabase.co';

    const key = getCleanItem('hms_supabase_anon_key') || 
                getEnvVal('VITE_SUPABASE_ANON_KEY') || 
                getEnvVal('SUPABASE_ANON_KEY') || 
                'sb_publishable_YZ2ygAm-HII4qdQZmlIOLQ_kkNW5dpV';

    if (url && key && 
        (url.startsWith('http://') || url.startsWith('https://')) && 
        !url.includes('placeholder')) {
      return true;
    }
  } catch (e) {}
  return false;
}

function isMockId(id: any): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^(p|a|bill|i|rx|ot|op|ns|nt)\d+$/.test(id);
}

function sanitizeStorageValue(key: string, val: any): any {
  if (!val) return val;
  if (key === 'hms_hospital_info' && typeof val === 'object') {
    const isOldAddress = !val.address || val.address.includes('Aura Inn') || val.address.includes('Basti') || val.address.includes('Central City') || val.address.includes('Medical District');
    const isOldPhone = !val.phone || val.phone.includes('8601561055') || val.phone.includes('555') || val.phone.includes('2345 6789');
    const isOldEmail = !val.email || val.email.includes('neogastro') || val.email.includes('cureline') || val.email.includes('medicare');
    const isOldName = !val.name || val.name.includes('CureLine') || val.name.includes('Medicare') || val.name.toUpperCase().includes('NEO GASTRO');

    if (isOldAddress || isOldPhone || isOldEmail || isOldName) {
      return {
        ...val,
        name: 'Gastro Plus Hospital',
        address: isOldAddress ? 'Plot No. 7 & 8, Om Shiv Nagar, Gufa Mandir Road, Lal Ghati Bhopal, 462030, Madhya Pradesh' : val.address,
        phone: isOldPhone ? '9109102145/9109101246' : val.phone,
        email: isOldEmail ? 'gatroplusbhopal@gmail.com' : val.email,
        website: (val.website && !val.website.includes('neogastro') && !val.website.includes('medicare')) ? val.website : 'www.gastroplusbhopal.com'
      };
    }
  }
  return val;
}

// In-memory runtime cache ensuring data is never lost even when localStorage hits browser quotas
const memoryStore = new Map<string, any>();

function pruneBulkyOldEntries(): boolean {
  if (typeof window === 'undefined') return false;
  let freed = false;
  try {
    // 1. Trim audit logs
    const auditLogs = localStorage.getItem('hms_audit_logs');
    if (auditLogs) {
      try {
        const parsed = JSON.parse(auditLogs);
        if (Array.isArray(parsed) && parsed.length > 15) {
          localStorage.setItem('hms_audit_logs', JSON.stringify(parsed.slice(0, 15)));
          freed = true;
        }
      } catch {}
    }

    // 2. Clean old bloated keys (remove bulky base64 data URLs in local storage)
    const arrayKeysToTrim = [
      'hms_expenses', 
      'hms_lab_test_orders', 
      'hms_radiology_files', 
      'hms_external_reports', 
      'hms_special_clinical_charts',
      'hms_billing',
      'hms_pharmacy_billing'
    ];
    for (const k of arrayKeysToTrim) {
      const item = localStorage.getItem(k);
      if (item && item.length > 100000) {
        try {
          const parsed = JSON.parse(item);
          if (Array.isArray(parsed) && parsed.length > 30) {
            localStorage.setItem(k, JSON.stringify(parsed.slice(0, 30)));
            freed = true;
          }
        } catch {}
      }
    }

    // 3. Remove obsolete or non-essential temporary keys
    const nonEssentialKeys = ['hms_breakdowns', 'hms_equipment', 'hms_staff_attendance', 'doctor_pathology_orders'];
    for (const k of nonEssentialKeys) {
      const item = localStorage.getItem(k);
      if (item && item.length > 30000) {
        localStorage.removeItem(k);
        freed = true;
      }
    }
  } catch {}
  return freed;
}

function stripHeavyDataUrls(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => stripHeavyDataUrls(item));
  }
  const cleaned: any = { ...obj };
  for (const prop of Object.keys(cleaned)) {
    const val = cleaned[prop];
    if (typeof val === 'string') {
      // Strip large data URL images from localStorage copies (retained in memoryStore)
      if (val.startsWith('data:image/') || (val.startsWith('data:') && val.length > 1000) || val.length > 10000) {
        cleaned[prop] = '';
      }
    } else if (Array.isArray(val)) {
      if (prop === 'photos' || prop === 'clinicalPhotos' || prop === 'clinical_photos') {
        // Strip base64 photo arrays from local storage copies
        cleaned[prop] = val.map(p => typeof p === 'string' && p.startsWith('data:') ? '' : p).filter(Boolean);
      } else {
        cleaned[prop] = val.map(item => stripHeavyDataUrls(item));
      }
    } else if (typeof val === 'object' && val !== null) {
      cleaned[prop] = stripHeavyDataUrls(val);
    }
  }
  return cleaned;
}

function compactPrescriptionOrArray(key: string, val: any): any {
  if (!val) return val;
  if (!Array.isArray(val)) {
    return stripHeavyDataUrls(val);
  }

  // Cap array length for localStorage persistence
  let items = val;
  if (items.length > 40) {
    items = items.slice(0, 40);
  }

  // Strip massive base64 drawings or attachments from prescriptions in localStorage
  if (key === 'hms_prescriptions' || key.includes('prescription')) {
    items = items.map((rx: any) => {
      if (rx && typeof rx === 'object') {
        const cleaned = { ...rx };
        if (cleaned.drawing && typeof cleaned.drawing === 'string' && (cleaned.drawing.startsWith('data:') || cleaned.drawing.length > 500)) {
          cleaned.drawing = ''; // Full drawing is safely stored in RAM and database
        }
        if (Array.isArray(cleaned.photos)) {
          cleaned.photos = [];
        }
        if (Array.isArray(cleaned.clinicalPhotos)) {
          cleaned.clinicalPhotos = [];
        }
        if (Array.isArray(cleaned.clinical_photos)) {
          cleaned.clinical_photos = [];
        }
        if (cleaned.attachmentUrl && typeof cleaned.attachmentUrl === 'string' && cleaned.attachmentUrl.startsWith('data:')) {
          cleaned.attachmentUrl = '';
        }
        return cleaned;
      }
      return rx;
    });
  } else {
    items = items.map(item => stripHeavyDataUrls(item));
  }

  return items;
}

function safeLocalStorageSet(key: string, value: any): string | null {
  if (typeof window === 'undefined') return null;
  
  // Pre-compact prescription or large array payloads before writing to localStorage
  const preCompacted = compactPrescriptionOrArray(key, value);
  let stringified = JSON.stringify(preCompacted);
  
  try {
    const existing = localStorage.getItem(key);
    if (existing === stringified) {
      return stringified;
    }
    localStorage.setItem(key, stringified);
    return stringified;
  } catch (err: any) {
    const isQuotaError = 
      err?.name === 'QuotaExceededError' || 
      err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err?.code === 22 || 
      err?.code === 1014 ||
      (err?.message && (err.message.toLowerCase().includes('quota') || err.message.toLowerCase().includes('exceeded')));

    if (isQuotaError) {
      // 1. Attempt progressive quota recovery
      pruneBulkyOldEntries();

      // 2. Further compact this specific key's payload
      try {
        let ultraCompacted = preCompacted;
        if (Array.isArray(ultraCompacted) && ultraCompacted.length > 20) {
          ultraCompacted = ultraCompacted.slice(0, 20);
        }
        stringified = JSON.stringify(ultraCompacted);
        localStorage.setItem(key, stringified);
        return stringified;
      } catch (retryErr) {
        // 3. Final fallback: slice to top 5 items
        try {
          if (Array.isArray(preCompacted)) {
            const minified = preCompacted.slice(0, 5);
            stringified = JSON.stringify(minified);
            localStorage.setItem(key, stringified);
            return stringified;
          }
        } catch (finalErr) {
          // Gracefully maintained in memoryStore and cloud database without crashing
          return null;
        }
        return null;
      }
    } else {
      return null;
    }
  }
}

export const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    try {
      if (memoryStore.has(key)) {
        return sanitizeStorageValue(key, memoryStore.get(key)) as T;
      }
      const item = localStorage.getItem(key);
      const parsed = item ? JSON.parse(item) : defaultValue;
      const sanitized = sanitizeStorageValue(key, parsed);
      memoryStore.set(key, sanitized);
      return sanitized as T;
    } catch (error) {
      console.warn(`[storage] Error reading storage key "${key}":`, error);
      if (memoryStore.has(key)) {
        return sanitizeStorageValue(key, memoryStore.get(key)) as T;
      }
      return sanitizeStorageValue(key, defaultValue) as T;
    }
  },
  set: <T>(key: string, value: T): void => {
    try {
      // Always store in fast in-memory map first
      memoryStore.set(key, value);

      const writtenString = safeLocalStorageSet(key, value);
      const stringifiedValue = writtenString || JSON.stringify(value);
      
      if (typeof window !== 'undefined') {
        // Dispatch asynchronously to prevent interrupting any active React render cycles
        if (typeof queueMicrotask === 'function') {
          queueMicrotask(() => {
            try {
              window.dispatchEvent(new CustomEvent('supabase-data-sync', {
                detail: { table: key, action: 'update', local: true }
              }));
              window.dispatchEvent(new StorageEvent('storage', {
                key: key,
                newValue: stringifiedValue,
                storageArea: localStorage
              }));
            } catch (err) {}
          });
        } else {
          setTimeout(() => {
            try {
              window.dispatchEvent(new CustomEvent('supabase-data-sync', {
                detail: { table: key, action: 'update', local: true }
              }));
              window.dispatchEvent(new StorageEvent('storage', {
                key: key,
                newValue: stringifiedValue,
                storageArea: localStorage
              }));
            } catch (err) {}
          }, 0);
        }

        // Broadcast to other tabs/panels on the same device using BroadcastChannel
        if (typeof BroadcastChannel !== 'undefined') {
          try {
            const channel = new BroadcastChannel('hms-local-sync');
            channel.postMessage({ key, value });
            channel.close();
          } catch (e) {
            console.warn('BroadcastChannel sync error:', e);
          }
        }
      }
    } catch (error) {
      console.warn(`[storage] Handled storage set warning for key "${key}":`, error);
    }
  },
  remove: (key: string): void => {
    try {
      memoryStore.delete(key);
      localStorage.removeItem(key);
      
      if (typeof window !== 'undefined') {
        if (typeof queueMicrotask === 'function') {
          queueMicrotask(() => {
            try {
              window.dispatchEvent(new CustomEvent('supabase-data-sync', {
                detail: { table: key, action: 'delete', local: true }
              }));
              window.dispatchEvent(new StorageEvent('storage', {
                key: key,
                newValue: null,
                storageArea: localStorage
              }));
            } catch (err) {}
          });
        } else {
          setTimeout(() => {
            try {
              window.dispatchEvent(new CustomEvent('supabase-data-sync', {
                detail: { table: key, action: 'delete', local: true }
              }));
              window.dispatchEvent(new StorageEvent('storage', {
                key: key,
                newValue: null,
                storageArea: localStorage
              }));
            } catch (err) {}
          }, 0);
        }

        if (typeof BroadcastChannel !== 'undefined') {
          try {
            const channel = new BroadcastChannel('hms-local-sync');
            channel.postMessage({ key, value: null });
            channel.close();
          } catch (e) {}
        }
      }
    } catch (error) {
      console.warn(`[storage] Error removing storage key "${key}":`, error);
    }
  },
  clear: (): void => {
    try {
      memoryStore.clear();
      localStorage.clear();
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('supabase-data-sync', {
          detail: { table: 'all', action: 'delete', local: true }
        }));
        
        window.dispatchEvent(new StorageEvent('storage', {
          key: null,
          newValue: null,
          storageArea: localStorage
        }));

        if (typeof BroadcastChannel !== 'undefined') {
          try {
            const channel = new BroadcastChannel('hms-local-sync');
            channel.postMessage({ key: 'all', value: null });
            channel.close();
          } catch (e) {}
        }
      }
    } catch (error) {
      console.error("Error clearing storage:", error);
    }
  }
};

// Global cross-tab and cross-window sync listener
if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
  try {
    const globalSyncChannel = new BroadcastChannel('hms-local-sync');
    globalSyncChannel.onmessage = (event) => {
      const data = event.data;
      if (data && data.key) {
        window.dispatchEvent(new CustomEvent('supabase-data-sync', {
          detail: { table: data.key, action: data.value === null ? 'delete' : 'update', broadcast: true }
        }));
      }
    };
  } catch (e) {
    console.warn('Could not initialize persistent BroadcastChannel listener:', e);
  }
}

export const STORAGE_KEYS = {
  PATIENTS: 'hms_patients',
  APPOINTMENTS: 'hms_appointments',
  BILLING: 'hms_billing',
  LAB_BILLS: 'hms_lab_bills',
  INVENTORY: 'hms_inventory',
  EXPENSES: 'hms_expenses',
  INSURANCE: 'hms_insurance',
  NURSING_TASKS: 'hms_nursing_tasks',
  BEDS: 'hms_beds',
  PHARMACY_BILLS: 'hms_pharmacy_billing',
  PRESCRIPTIONS: 'hms_prescriptions',
  TEMPLATE_IMAGE: 'hms_template_image',
  BED_RATES: 'hms_bed_rates',
  OT_RATES: 'hms_ot_rates',
  LAB_RATES: 'hms_lab_rates',
  MATERIAL_RATES: 'hms_material_rates',
  HOSPITAL_INFO: 'hms_hospital_info',
  USERS: 'hms_users',
  DELETED_STAFF_IDS: 'hms_deleted_staff_ids',
  AUDIT_LOGS: 'hms_audit_logs',
  SESSION_USER: 'hms_session_user',
  AUTH_STATUS: 'hms_auth_status',
  LAB_TEST_ORDERS: 'hms_lab_test_orders',
  EXTERNAL_REPORTS: 'hms_external_reports',
  RADIOLOGY_FILES: 'hms_radiology_files',
  PATIENT_VITALS: 'hms_patient_vitals',
  TAX_SLABS: 'hms_tax_slabs',
  CATEGORY_TAX_MAPPING: 'hms_category_tax_mapping',
  HOSPITAL_TAX_SETTINGS: 'hms_hospital_tax_settings',
  OPD_CHARGES: 'hms_opd_charges',
  TOKEN_PRINT_SIZE: 'hms_token_print_size',
  EQUIPMENT: 'hms_equipment',
  BREAKDOWNS: 'hms_breakdowns',
  PRESCRIPTION_TEMPLATES: 'hms_prescription_templates',
  BED_TRANSFERS: 'hms_bed_transfers',
  STAFF_ATTENDANCE: 'hms_staff_attendance',
  SPECIAL_CLINICAL_CHARTS: 'hms_special_clinical_charts',
  ENDOSCOPY_DIRECT_PROCEDURES: 'hms_endoscopy_direct_procedures',
  CAREWELL_OT_SUMMARY_FORMS: 'hms_carewell_ot_summary_forms',
  CAREWELL_PREOP_ORDERS: 'hms_carewell_preop_orders',
  VISITING_SPECIALISTS: 'hms_visiting_specialists',
  VISITING_CONSULTATIONS: 'hms_visiting_consultations',
  CENTRAL_COUNTER_PAYMENTS: 'hms_central_counter_payments',
  ENDO_PROCEDURE_RATES: 'hms_endo_procedure_rates',
  GASTRO_SERVICES_RATES: 'hms_gastro_services_rates',
  HOSPITAL_ROOM_RATES: 'hms_hospital_room_rates',
  CARDIOLOGY_EQUIPMENT_RATES: 'hms_cardiology_equipment_rates',
  CLINICAL_PROCEDURE_RATES: 'hms_clinical_procedure_rates',
  DOCTOR_CONSULTATION_RATES: 'hms_doctor_consultation_rates',
  HOSPITAL_BILLING_POLICY: 'hms_hospital_billing_policy',
  ENDOSCOPY_SCOPE_DISINFECTION_LOGS: 'hms_endoscopy_scope_disinfection_logs',
  ENDOSCOPY_SAFETY_CHECKLISTS: 'hms_endoscopy_safety_checklists',
  EMERGENCY_RESUSCITATION_LOGS: 'hms_emergency_resuscitation_logs',
  ADMISSIONS: 'hms_admissions',
  ADMISSION_SHEETS: 'hms_admission_sheets',
  POOR_PROGNOSIS_CONSENTS: 'hms_poor_prognosis_consents',
  GENERAL_CONSENTS: 'hms_general_consents',
};
