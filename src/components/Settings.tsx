import React, { useState, ChangeEvent, useEffect, useRef } from 'react';
import RateListExcelUploader from './RateListExcelUploader';
import HospitalTariffManager from './HospitalTariffManager';
import { getStaffPhotoUrl } from '../utils/staffPhotos';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  FileText, 
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  Upload,
  ShieldCheck,
  Users,
  Stethoscope,
  Printer,
  UserPlus,
  Lock,
  Receipt,
  Scissors,
  Image as ImageIcon,
  Layout,
  History,
  Activity,
  Database,
  Pill,
  Percent,
  Copy,
  Check,
  Code,
  RefreshCw,
  Cloud,
  Paintbrush,
  Eraser,
  RotateCcw,
  Hexagon,
  Square,
  Circle as CircleIcon,
  Triangle,
  MoveRight,
  Minus,
  Microscope,
  Layers,
  Zap,
  AlertCircle,
  HeartPulse,
  Download,
  Search,
  FileSpreadsheet,
  Coins,
  Eye,
  ShieldAlert,
  DollarSign,
  CheckCircle2,
  SlidersHorizontal,
  Sparkles,
  Filter
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  COMMON_DISEASES, 
  isDiseaseInHistory, 
  toggleDiseaseInHistory, 
  calculateBMI, 
  drawPreaddedShapeOnCanvas 
} from '@/lib/drawingUtils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  MOCK_USERS, 
  MOCK_PATIENTS, 
  MOCK_BED_RATES, 
  MOCK_OT_RATES, 
  MOCK_LAB_TESTS, 
  MOCK_MATERIAL_RATES, 
  MOCK_ENDO_RATES,
  MOCK_GASTRO_SERVICES,
  MOCK_HOSPITAL_ROOM_RATES,
  MOCK_CARDIOLOGY_EQUIPMENT_RATES,
  MOCK_CLINICAL_PROCEDURE_RATES,
  MOCK_HOSPITAL_BILLING_POLICY
} from '@/mockData';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { getPrescriptionPrintHtml } from '@/lib/prescriptionPrint';
import { triggerRxPrintPreview } from '@/components/RxPrintPreviewModal';
import { syncOfflineDataWithSupabase, getSupabaseUnreachable, setSupabaseUnreachable, supabaseService, getAuditLogs } from '@/services/supabaseService';
import { DEFAULT_TAX_SLABS, DEFAULT_CATEGORY_TAX_MAPPING, DEFAULT_HOSPITAL_TAX_SETTINGS, HospitalTaxSettings } from '@/lib/taxUtils';
import { DEFAULT_PHARMACY_SETTINGS } from '@/lib/pharmacyInvoicePrint';
import { normalizeRole } from '@/utils/rbac';

interface EndoRateItem {
  baseFee: number;
  sedationFee: number;
  kitFee: number;
  category?: string;
}

// HOSPITAL SETTINGS & UTILS
// ==========================================

const resizeImage = (file: File, maxW: number, maxH: number, callback: (resized: string) => void) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      if (width > height) {
        if (width > maxW) {
          height = Math.round((height * maxW) / width);
          width = maxW;
        }
      } else {
        if (height > maxH) {
          width = Math.round((width * maxH) / height);
          height = maxH;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        callback(canvas.toDataURL('image/png'));
      } else {
        callback(e.target?.result as string);
      }
    };
    img.src = e.target?.result as string;
  };
  reader.readAsDataURL(file);
};

export default function Settings({ currentUser, onUserUpdate, onHospitalUpdate }: { currentUser?: any, onUserUpdate?: (user: any) => void, onHospitalUpdate?: (info: any) => void }) {
  const resolvedUser = currentUser || storage.get(STORAGE_KEYS.SESSION_USER, null);
  const isAccountant = normalizeRole(resolvedUser?.role) === 'ACCOUNTANT';
  const isAdmin = resolvedUser?.role === 'SUPER_ADMIN' || resolvedUser?.role === 'ADMIN' || resolvedUser?.role?.toUpperCase().includes('ADMIN') || (resolvedUser?.email && resolvedUser.email.toLowerCase().includes('admin'));
  const isFrontOffice = resolvedUser?.role === 'RECEPTION' || resolvedUser?.role === 'RECEPTIONIST' || resolvedUser?.role === 'FRONT_DESK' || (resolvedUser?.email && (resolvedUser.email.toLowerCase().includes('frontoffice') || resolvedUser.email.toLowerCase().includes('frontdesk')));
  currentUser = resolvedUser;

  const [templateImage, setTemplateImage] = useState<string | null>(() => storage.get(STORAGE_KEYS.TEMPLATE_IMAGE, null));

  // Tax Slab Settings
  const [taxSlabs, setTaxSlabs] = useState<any[]>(() => 
    storage.get(STORAGE_KEYS.TAX_SLABS, DEFAULT_TAX_SLABS)
  );

  const [categoryTaxMapping, setCategoryTaxMapping] = useState<Record<string, number>>(() =>
    storage.get(STORAGE_KEYS.CATEGORY_TAX_MAPPING, DEFAULT_CATEGORY_TAX_MAPPING)
  );

  const [hospitalTaxSettings, setHospitalTaxSettings] = useState<HospitalTaxSettings>(() =>
    storage.get(STORAGE_KEYS.HOSPITAL_TAX_SETTINGS, DEFAULT_HOSPITAL_TAX_SETTINGS)
  );

  const [editingSlab, setEditingSlab] = useState<any | null>(null);
  const [newSlab, setNewSlab] = useState({ name: '', rate: '', type: 'GST', description: '', isActive: true });

  const handleUpdateCategoryGst = (category: string, rate: number) => {
    const updated = { ...categoryTaxMapping, [category]: rate };
    setCategoryTaxMapping(updated);
    storage.set(STORAGE_KEYS.CATEGORY_TAX_MAPPING, updated);
    toast.success(`Default GST for ${category} set to ${rate}%`);
  };

  const handleSaveHospitalTaxSettings = () => {
    storage.set(STORAGE_KEYS.HOSPITAL_TAX_SETTINGS, hospitalTaxSettings);
    toast.success('Hospital GST & Tax settings updated successfully!');
  };

  const handleAddSlab = () => {
    if (!newSlab.name.trim() || newSlab.rate === '') {
      toast.error('Please enter a slab name and valid tax rate %');
      return;
    }
    const rateNum = parseFloat(newSlab.rate);
    if (isNaN(rateNum) || rateNum < 0 || rateNum > 100) {
      toast.error('Tax rate must be a valid percentage between 0 and 100');
      return;
    }

    const item = {
      id: 'tax-' + Math.random().toString(36).substring(2, 9),
      name: newSlab.name.trim(),
      rate: rateNum,
      type: newSlab.type,
      description: newSlab.description.trim(),
      isActive: newSlab.isActive
    };

    const updated = [...taxSlabs, item];
    setTaxSlabs(updated);
    storage.set(STORAGE_KEYS.TAX_SLABS, updated);
    setNewSlab({ name: '', rate: '', type: 'GST', description: '', isActive: true });
    toast.success('Tax slab added successfully!');
  };

  const handleUpdateSlab = () => {
    if (!editingSlab || !editingSlab.name.trim() || editingSlab.rate === '') {
      toast.error('Please fill in required fields');
      return;
    }
    const rateNum = parseFloat(editingSlab.rate);
    if (isNaN(rateNum) || rateNum < 0 || rateNum > 100) {
      toast.error('Tax rate must be a valid percentage between 0 and 100');
      return;
    }

    const updated = taxSlabs.map(s => s.id === editingSlab.id ? { 
      ...s, 
      name: editingSlab.name.trim(), 
      rate: rateNum, 
      type: editingSlab.type, 
      description: editingSlab.description.trim(),
      isActive: editingSlab.isActive
    } : s);

    setTaxSlabs(updated);
    storage.set(STORAGE_KEYS.TAX_SLABS, updated);
    setEditingSlab(null);
    toast.success('Tax slab updated successfully!');
  };

  const handleDeleteSlab = (id: string) => {
    const updated = taxSlabs.filter(s => s.id !== id);
    setTaxSlabs(updated);
    storage.set(STORAGE_KEYS.TAX_SLABS, updated);
    toast.success('Tax slab removed successfully.');
  };

  const handleToggleSlabStatus = (id: string) => {
    const updated = taxSlabs.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s);
    setTaxSlabs(updated);
    storage.set(STORAGE_KEYS.TAX_SLABS, updated);
    toast.success('Tax slab status updated.');
  };

  const handleResetSlabsToDefault = () => {
    const defaults = [
      { id: 'tax-ex', name: 'GST Zero (Exempt)', rate: 0, type: 'GST', isActive: true, description: 'Medical services and select life-saving medicines' },
      { id: 'tax-5', name: 'GST 5%', rate: 5, type: 'GST', isActive: true, description: 'Standard pharmaceutical drugs, injectables, and diagnostic test kits' },
      { id: 'tax-12', name: 'GST 12%', rate: 12, type: 'GST', isActive: true, description: 'Syringes, medical instruments, and specialised diabetic medicines' },
      { id: 'tax-18', name: 'GST 18%', rate: 18, type: 'GST', isActive: true, description: 'Capital healthcare machinery, monitors, and dental care fixtures' },
      { id: 'tax-28', name: 'GST 28%', rate: 28, type: 'GST', isActive: true, description: 'Aesthetic improvements and luxury cosmetic treatments' }
    ];
    setTaxSlabs(defaults);
    storage.set(STORAGE_KEYS.TAX_SLABS, defaults);
    toast.success('Tax slabs restored to standard GST rates.');
  };

  // Supabase states
  const getCleanedStateItem = (key: string): string => {
    if (typeof window === 'undefined') return '';
    const val = localStorage.getItem(key);
    if (!val || typeof val !== 'string') return '';
    const trimmed = val.trim();
    if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined' || trimmed === 'placeholder-key') {
      return '';
    }
    return trimmed;
  };

  const getCleanedEnvVal = (val: any): string => {
    if (!val || typeof val !== 'string') return '';
    const trimmed = val.trim();
    if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined' || trimmed === 'placeholder-key') {
      return '';
    }
    return trimmed;
  };

  const [dbUrl, setDbUrl] = useState(() => getCleanedStateItem('hms_supabase_url') || getCleanedEnvVal(import.meta.env.VITE_SUPABASE_URL) || 'https://iazonufxhycppyzwhnvq.supabase.co');
  const [dbKey, setDbKey] = useState(() => getCleanedStateItem('hms_supabase_anon_key') || getCleanedEnvVal(import.meta.env.VITE_SUPABASE_ANON_KEY) || 'sb_publishable_YZ2ygAm-HII4qdQZmlIOLQ_kkNW5dpV');
  const [isDbSaving, setIsDbSaving] = useState(false);
  const [isPurging, setIsPurging] = useState(false);

  // Database tables checking state
  const [tableChecks, setTableChecks] = useState<Record<string, { status: 'idle' | 'checking' | 'connected' | 'error'; count?: number; errorMsg?: string }>>({
    profiles: { status: 'idle' },
    patients: { status: 'idle' },
    appointments: { status: 'idle' },
    prescriptions: { status: 'idle' },
    patient_vitals: { status: 'idle' },
    billing: { status: 'idle' },
    departments: { status: 'idle' },
    specialties: { status: 'idle' },
    clinical_notes: { status: 'idle' },
    admissions: { status: 'idle' },
    ot_schedules: { status: 'idle' },
    lab_test_orders: { status: 'idle' }
  });

  const [isVerifyingAll, setIsVerifyingAll] = useState(false);

  const runSingleTableCheck = async (tableName: string) => {
    if (!isSupabaseConfigured) {
      return;
    }
    
    setTableChecks(prev => ({
      ...prev,
      [tableName]: { status: 'checking' }
    }));

    try {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        setTableChecks(prev => ({
          ...prev,
          [tableName]: { status: 'error', errorMsg: error.message }
        }));
        return;
      }

      setTableChecks(prev => ({
        ...prev,
        [tableName]: { status: 'connected', count: count || 0 }
      }));
    } catch (err: any) {
      setTableChecks(prev => ({
        ...prev,
        [tableName]: { status: 'error', errorMsg: err?.message || 'Network or Permission Error' }
      }));
    }
  };

  const runAllTableChecks = async () => {
    if (!isSupabaseConfigured) {
      toast.error("Please connect your Supabase database first.");
      return;
    }
    setIsVerifyingAll(true);
    toast.loading("Verifying database schema health...", { id: 'db-verify-toast' });
    
    const tables = Object.keys(tableChecks);
    for (const t of tables) {
      // Create a slight delay so it feels organic
      await new Promise(resolve => setTimeout(resolve, 50));
      await runSingleTableCheck(t);
    }
    
    toast.success("Database schema verification completed!", { id: 'db-verify-toast', duration: 4000 });
    setIsVerifyingAll(false);
  };

  // Offline Synchronization States & Logic
  const getOfflineCount = () => {
    let count = 0;
    try {
      const storageKeysToSync = [
        STORAGE_KEYS.PATIENTS,
        STORAGE_KEYS.APPOINTMENTS,
        'hms_admissions',
        STORAGE_KEYS.PRESCRIPTIONS,
        STORAGE_KEYS.PATIENT_VITALS,
        'hms_clinical_notes',
        'hms_ot_schedules',
        STORAGE_KEYS.BILLING,
        STORAGE_KEYS.EXPENSES,
        STORAGE_KEYS.INSURANCE,
        STORAGE_KEYS.LAB_TEST_ORDERS,
        'hms_deliveries'
      ];
      
      for (const sk of storageKeysToSync) {
        const data = storage.get(sk, []);
        if (Array.isArray(data)) {
          const offlineItems = data.filter((item: any) => item && item.id && String(item.id).startsWith('off-'));
          count += offlineItems.length;
        }
      }
    } catch (_) {}
    return count;
  };

  const [offlineCount, setOfflineCount] = useState(() => getOfflineCount());
  const [isSyncing, setIsSyncing] = useState(false);
  const isFallbackActive = getSupabaseUnreachable();

  const handleSyncData = async () => {
    if (!isSupabaseConfigured) {
      toast.error("Please connect your live Supabase database first before syncing.");
      return;
    }
    
    setIsSyncing(true);
    const syncToast = toast.loading("Syncing all offline data with your Supabase database...", {
      description: "Uploading patients, invoices, consult notes, and lab records..."
    });

    try {
      // Re-enable and force connection
      setSupabaseUnreachable(false);
      
      const res = await syncOfflineDataWithSupabase();
      if (res.success) {
        toast.dismiss(syncToast);
        toast.success(`Synchronization completed successfully!`, {
          description: `Uploaded ${res.syncCount} local offline entries directly to Supabase. All pages are updated!`,
          duration: 5000
        });
        setOfflineCount(getOfflineCount());
      } else {
        toast.dismiss(syncToast);
        toast.error(`Partially synced database, but some records failed!`, {
          description: `Successfully uploaded ${res.syncCount} records. Errors: ${res.errors.slice(0, 2).join('; ')}`,
          duration: 6000
        });
        setOfflineCount(getOfflineCount());
      }
    } catch (err: any) {
      toast.dismiss(syncToast);
      toast.error("Communication error during offline sync.", {
        description: err.message || "Please check your Supabase network permissions and security policies."
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveDatabaseCredentials = () => {
    setIsDbSaving(true);
    try {
      if (!dbUrl.trim() || !dbKey.trim()) {
        toast.error('Please enter both Supabase URL and Anon Key');
        setIsDbSaving(false);
        return;
      }

      if (!dbUrl.trim().startsWith('https://')) {
        toast.error('Invalid Supabase Project URL. Must start with https://');
        setIsDbSaving(false);
        return;
      }

      localStorage.setItem('hms_supabase_url', dbUrl.trim());
      localStorage.setItem('hms_supabase_anon_key', dbKey.trim());
      
      toast.success('Database credentials saved successfully!', {
        description: 'Re-syncing and reloading app to connect to your live database...',
        duration: 3000
      });

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      toast.error('Failed to save credentials locally.');
    } finally {
      setIsDbSaving(false);
    }
  };

  const handleResetDatabaseCredentials = () => {
    localStorage.removeItem('hms_supabase_url');
    localStorage.removeItem('hms_supabase_anon_key');
    setDbUrl('');
    setDbKey('');
    toast.success('Database has been set back to local-only high-speed storage.', {
      description: 'Reloading database components to update...',
      duration: 3000
    });
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  const handlePurgeDemoData = async () => {
    if (!window.confirm("Are you sure you want to delete all seeded demo data (including patients Amit Patel, Priya Singh, Rahul Sharma and their related invoices, appointments, and medical entries)? This action is permanent and cannot be undone.")) {
      return;
    }

    setIsPurging(true);
    try {
      // 1. Identify target patients in local storage first
      const patients = storage.get(STORAGE_KEYS.PATIENTS, []);
      const demoPatients = patients.filter((p: any) => {
        const name = (p.name || '').toLowerCase();
        return name.includes('amit patel') || name.includes('priya singh') || name.includes('rahul sharma') || name.includes('sameer khan');
      });
      const demoIds = demoPatients.map((p: any) => p.id);

      // 2. Filter local storage records
      const cleanLocalData = (key: string, idField: string = 'patientId') => {
        const list = storage.get(key, []);
        if (!Array.isArray(list)) return;
        const filtered = list.filter((item: any) => {
          if (!item) return false;
          const itemId = item[idField] || item.patient_id || item.patientId || '';
          if (demoIds.includes(itemId)) return false;
          const pName = (item.patient_name || item.patientName || item.name || '').toLowerCase();
          if (pName.includes('amit patel') || pName.includes('priya singh') || pName.includes('rahul sharma') || pName.includes('sameer khan')) return false;
          return true;
        });
        storage.set(key, filtered);
      };

      // Clean local keys
      cleanLocalData(STORAGE_KEYS.PATIENTS, 'id');
      cleanLocalData(STORAGE_KEYS.APPOINTMENTS, 'patientId');
      cleanLocalData(STORAGE_KEYS.BILLING, 'patientId');
      cleanLocalData(STORAGE_KEYS.PHARMACY_BILLS, 'patientId');
      cleanLocalData(STORAGE_KEYS.PRESCRIPTIONS, 'patientId');
      cleanLocalData(STORAGE_KEYS.PATIENT_VITALS, 'patientId');
      cleanLocalData(STORAGE_KEYS.LAB_TEST_ORDERS, 'patient_id');

      // Also clean 'hms_admissions'
      cleanLocalData('hms_admissions', 'patientId');

      // 3. Clean live Supabase DB if connected
      if (isSupabaseConfigured) {
        toast.info("Connecting to Supabase to purge cloud records...", { duration: 2000 });
        
        // Fetch matching cloud patients
        const { data: dbPatients, error: fetchErr } = await supabase
          .from('patients')
          .select('id, name')
          .or('name.ilike.%Amit Patel%,name.ilike.%Priya Singh%,name.ilike.%Rahul Sharma%');

        if (fetchErr) {
          console.warn("Could not query patients on Supabase:", fetchErr.message);
        } else if (dbPatients && dbPatients.length > 0) {
          const cloudIds = dbPatients.map(p => p.id);
          console.log("Found cloud patient IDs to purge:", cloudIds);

          const dependentTables = [
            'appointments',
            'quick_registrations',
            'live_queue',
            'admissions',
            'patient_vitals',
            'clinical_notes',
            'prescriptions',
            'test_requests',
            'insurance_claims',
            'discharge_summaries',
            'ot_schedules',
            'nursing_notes'
          ];

          for (const table of dependentTables) {
            await supabase.from(table).delete().in('patient_id', cloudIds);
          }

          // Fetch invoices for items cleanup
          const { data: dbInvoices } = await supabase
            .from('invoices')
            .select('id')
            .in('patient_id', cloudIds);

          if (dbInvoices && dbInvoices.length > 0) {
            const invoiceIds = dbInvoices.map(i => i.id);
            await supabase.from('invoice_items').delete().in('invoice_id', invoiceIds);
            await supabase.from('invoices').delete().in('id', invoiceIds);
          }

          // Finally, delete the patients
          const { error: patDelErr } = await supabase.from('patients').delete().in('id', cloudIds);
          if (patDelErr) {
            console.error("Error deleting patients from Supabase:", patDelErr);
          }
        }
      }

      toast.success("Successfully purged seeded dummy data!", {
        description: "Seeded patients, billing records, and appointments have been cleared from system registers.",
        duration: 4000
      });

      // Dispatch event to force other active panels to refresh
      window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { action: 'sync' } }));
      
      // Delay to refresh view state
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (err: any) {
      toast.error("An error occurred while purging dummy data", {
        description: err.message || "Failed to complete purge process."
      });
    } finally {
      setIsPurging(false);
    }
  };

  // Profile State
  const [profileData, setProfileData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '+91 98765 43210',
    password: currentUser?.password || ''
  });

  useEffect(() => {
    if (currentUser) {
      setProfileData({
        name: currentUser.name || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '+91 98765 43210',
        password: currentUser.password || ''
      });
    }
  }, [currentUser]);

  const handleUpdateProfile = async () => {
    if (onUserUpdate && currentUser) {
      const updatedUser = { ...currentUser, ...profileData };
      
      try {
        await supabaseService.updateStaff(currentUser.id, updatedUser);
      } catch (err) {
        console.error('Error updating staff database profile:', err);
      }
      
      // Update in our users list too
      const updatedUsersList = users.map((u: any) => u.id === currentUser.id ? updatedUser : u);
      setUsers(updatedUsersList);
      
      onUserUpdate(updatedUser);
      storage.set(STORAGE_KEYS.SESSION_USER, updatedUser);
      toast.success('Profile updated successfully');
    }
  };

  useEffect(() => {
    storage.set(STORAGE_KEYS.TEMPLATE_IMAGE, templateImage);
    
    const syncTemplateToDB = async () => {
      try {
        const currentInfo = storage.get(STORAGE_KEYS.HOSPITAL_INFO, {});
        await supabaseService.updateHospitalInfo({
          ...currentInfo,
          template_image: templateImage
        });
      } catch (err) {
        console.error("Failed to sync template background to DB:", err);
      }
    };
    syncTemplateToDB();
  }, [templateImage]);

  const handleTemplateUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast.loading('Processing and optimizing template image...', { id: 'template-upload-toast' });
      resizeImage(file, 1200, 1600, (resized) => {
        setTemplateImage(resized);
        toast.dismiss('template-upload-toast');
        toast.success('Document template updated and optimized successfully');
      });
    }
  };
  // Hospital Info State
  const [hospitalInfo, setHospitalInfo] = useState(() => storage.get(STORAGE_KEYS.HOSPITAL_INFO, {
    name: 'Gastro Plus Hospital',
    address: 'Plot No. 7 & 8, Om Shiv Nagar, Gufa Mandir Road, Lal Ghati Bhopal, 462030, Madhya Pradesh',
    gst: '27AAAAA0000A1Z5',
    phone: '9109102145/9109101246',
    email: 'gatroplusbhopal@gmail.com',
    logo: null as string | null
  }));

  useEffect(() => {
    storage.set(STORAGE_KEYS.HOSPITAL_INFO, hospitalInfo);
  }, [hospitalInfo]);

  // Pharmacy Settings State
  const [pharmacySettings, setPharmacySettings] = useState(() => {
    return storage.get('hms_pharmacy_settings', DEFAULT_PHARMACY_SETTINGS);
  });

  useEffect(() => {
    const loadAllSettings = async () => {
      try {
        if (supabaseService.getHospitalInfo) {
          const dbHospitalInfo = await supabaseService.getHospitalInfo();
          if (dbHospitalInfo) {
            setHospitalInfo(dbHospitalInfo);
            storage.set(STORAGE_KEYS.HOSPITAL_INFO, dbHospitalInfo);
            if (dbHospitalInfo.template_image) {
              setTemplateImage(dbHospitalInfo.template_image);
              storage.set(STORAGE_KEYS.TEMPLATE_IMAGE, dbHospitalInfo.template_image);
            }
          }
        }
        
        if (supabaseService.getPharmacySettings) {
          const dbSettings = await supabaseService.getPharmacySettings();
          if (dbSettings) {
            setPharmacySettings(dbSettings);
            storage.set('hms_pharmacy_settings', dbSettings);
          }
        }
        
        const dbDepts = await supabaseService.getDepartments();
        if (dbDepts && dbDepts.length > 0) {
          const deptNames = dbDepts.map((d: any) => d.name);
          setDepartments(deptNames);
          storage.set('hms_settings_departments', deptNames);
        }
        
        const dbSpecs = await supabaseService.getSpecialties();
        if (dbSpecs && dbSpecs.length > 0) {
          const specNames = dbSpecs.map((s: any) => s.name);
          setSpecialties(specNames);
          storage.set('hms_settings_specialties', specNames);
        }

        const dbUsers = await supabaseService.getStaff();
        if (dbUsers && dbUsers.length > 0) {
          setUsers(dbUsers);
          storage.set(STORAGE_KEYS.USERS, dbUsers);
        }

        const dbAuditLogs = await getAuditLogs();
        if (dbAuditLogs && dbAuditLogs.length > 0) {
          setAuditLogs(dbAuditLogs);
        }
      } catch (err) {
        console.error('Error loading database settings:', err);
      }
    };
    loadAllSettings();
  }, []);

  const handleSavePharmacySettings = async () => {
    storage.set('hms_pharmacy_settings', pharmacySettings);
    if (supabaseService.updatePharmacySettings) {
      await supabaseService.updatePharmacySettings(pharmacySettings);
    }
    toast.success('Pharmacy billing & invoice settings saved successfully!');
  };

  // Departments, Wards & Specialties
  const [departments, setDepartments] = useState(() => storage.get('hms_settings_departments', ['General Medicine', 'Orthopedics', 'Pediatrics', 'Gynaecology', 'Cardiology', 'Pathology', 'Radiology', 'Accounts']));
  const [wards, setWards] = useState<string[]>(() => storage.get('hms_hospital_wards', [
    'General Ward',
    'General Ward A',
    'General Ward B',
    'ICU (Intensive Care)',
    'ICCU',
    'Maternity Ward',
    'Semi-Private Ward',
    'Private Deluxe AC',
    'Emergency / Triage Ward',
    'HDU (High Dependency)',
    'Post-Op Recovery',
    'Pediatric Ward'
  ]));
  const [specialties, setSpecialties] = useState(() => storage.get('hms_settings_specialties', ['Surgery', 'Consultation', 'Emergency', 'Diagnostics']));
  const [newDept, setNewDept] = useState('');
  const [newWard, setNewWard] = useState('');
  const [newSpec, setNewSpec] = useState('');

  // Active Audit Logs state
  const [auditLogs, setAuditLogs] = useState<any[]>(() => storage.get(STORAGE_KEYS.AUDIT_LOGS, []));

  useEffect(() => {
    storage.set('hms_settings_departments', departments);
  }, [departments]);

  useEffect(() => {
    storage.set('hms_hospital_wards', wards);
  }, [wards]);

  useEffect(() => {
    storage.set('hms_settings_specialties', specialties);
  }, [specialties]);

  const handleAddWard = () => {
    if (!newWard.trim()) return;
    if (wards.some(w => w.toLowerCase() === newWard.trim().toLowerCase())) {
      toast.error('Ward already exists');
      return;
    }
    const updated = [...wards, newWard.trim()];
    setWards(updated);
    setNewWard('');
    toast.success(`Ward "${newWard.trim()}" added successfully!`);
  };

  const handleDeleteWard = (w: string) => {
    const updated = wards.filter(item => item !== w);
    setWards(updated);
    toast.success(`Ward "${w}" removed`);
  };

  // User Management
  const [users, setUsers] = useState(() => storage.get(STORAGE_KEYS.USERS, MOCK_USERS));
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'DOCTOR', department: '', password: '', registrationNo: '', labLicenseNo: '' });

  useEffect(() => {
    storage.set(STORAGE_KEYS.USERS, users);
  }, [users]);

  // Rates State
  const [bedRates, setBedRates] = useState(() => storage.get(STORAGE_KEYS.BED_RATES, MOCK_BED_RATES));
  const [otRates, setOtRates] = useState(() => storage.get(STORAGE_KEYS.OT_RATES, MOCK_OT_RATES));
  const [labRates, setLabRates] = useState(() => storage.get(STORAGE_KEYS.LAB_RATES, MOCK_LAB_TESTS));
  const [materialRates, setMaterialRates] = useState(() => storage.get(STORAGE_KEYS.MATERIAL_RATES, MOCK_MATERIAL_RATES));
  const [endoRates, setEndoRates] = useState<Record<string, EndoRateItem>>(() => 
    storage.get(STORAGE_KEYS.ENDO_PROCEDURE_RATES, MOCK_ENDO_RATES)
  );
  const [gastroServices, setGastroServices] = useState<any[]>(() => 
    storage.get(STORAGE_KEYS.GASTRO_SERVICES_RATES, MOCK_GASTRO_SERVICES)
  );
  const [hospitalRoomRates, setHospitalRoomRates] = useState<any[]>(() => 
    storage.get(STORAGE_KEYS.HOSPITAL_ROOM_RATES, MOCK_HOSPITAL_ROOM_RATES)
  );
  const [cardiologyRates, setCardiologyRates] = useState<any[]>(() => 
    storage.get(STORAGE_KEYS.CARDIOLOGY_EQUIPMENT_RATES, MOCK_CARDIOLOGY_EQUIPMENT_RATES)
  );
  const [clinicalProcedures, setClinicalProcedures] = useState<any[]>(() => 
    storage.get(STORAGE_KEYS.CLINICAL_PROCEDURE_RATES, MOCK_CLINICAL_PROCEDURE_RATES)
  );
  const [hospitalBillingPolicy, setHospitalBillingPolicy] = useState<any>(() => 
    storage.get(STORAGE_KEYS.HOSPITAL_BILLING_POLICY, MOCK_HOSPITAL_BILLING_POLICY)
  );
  const [opdCharges, setOpdCharges] = useState(() => storage.get(STORAGE_KEYS.OPD_CHARGES, {
    reg: 200,
    appt: 0,
    consult: 500
  }));
  const [defaultTokenSize, setDefaultTokenSize] = useState<'thermal' | 'thermal_80' | 'A5'>(() => {
    return (storage.get(STORAGE_KEYS.TOKEN_PRINT_SIZE, 'thermal') as 'thermal' | 'thermal_80' | 'A5');
  });
  
  // Rate Filters & Form Inputs
  const [rateSearchTerm, setRateSearchTerm] = useState('');
  const [activeRateCategoryFilter, setActiveRateCategoryFilter] = useState<'all' | 'gastro' | 'hospital' | 'radiology' | 'cardio' | 'procedures' | 'lab' | 'materials' | 'policy'>('all');
  const [newBedRate, setNewBedRate] = useState({ type: '', rate: '', doctorVisit: '', includes: '' });
  const [newOtRate, setNewOtRate] = useState({ type: '', rate: '' });
  const [newLabRate, setNewLabRate] = useState({ name: '', category: 'Pathology' as 'Pathology' | 'Radiology', price: '', vial: '' });
  const [newMaterialRate, setNewMaterialRate] = useState({ name: '', category: 'Disposable' as 'Disposable' | 'Material', price: '' });
  const [newEndoProcedure, setNewEndoProcedure] = useState({ name: '', baseFee: '', sedationFee: '0', kitFee: '0', category: 'Endoscopy' });
  const [newGastroService, setNewGastroService] = useState({ service: '', category: 'Therapeutic GI', charges: '', followUpCharges: '', sedationCharges: '', notes: '', extraChargesNote: '' });
  const [newHospitalRoomService, setNewHospitalRoomService] = useState({ service: '', category: 'Room/Bed', charges: '', billingUnit: 'Per Day', notes: '' });
  const [newCardioService, setNewCardioService] = useState({ service: '', category: 'Cardiology', charges: '', billingUnit: 'Per Day', notes: '' });
  const [newProcedureService, setNewProcedureService] = useState({ service: '', category: 'Vascular Access', charges: '', notes: '' });

  useEffect(() => {
    storage.set(STORAGE_KEYS.BED_RATES, bedRates);
    storage.set(STORAGE_KEYS.OT_RATES, otRates);
    storage.set(STORAGE_KEYS.LAB_RATES, labRates);
    storage.set(STORAGE_KEYS.MATERIAL_RATES, materialRates);
    storage.set(STORAGE_KEYS.ENDO_PROCEDURE_RATES, endoRates);
    storage.set(STORAGE_KEYS.GASTRO_SERVICES_RATES, gastroServices);
    storage.set(STORAGE_KEYS.HOSPITAL_ROOM_RATES, hospitalRoomRates);
    storage.set(STORAGE_KEYS.CARDIOLOGY_EQUIPMENT_RATES, cardiologyRates);
    storage.set(STORAGE_KEYS.CLINICAL_PROCEDURE_RATES, clinicalProcedures);
    storage.set(STORAGE_KEYS.HOSPITAL_BILLING_POLICY, hospitalBillingPolicy);
    storage.set(STORAGE_KEYS.OPD_CHARGES, opdCharges);
    storage.set(STORAGE_KEYS.TOKEN_PRINT_SIZE, defaultTokenSize);
  }, [bedRates, otRates, labRates, materialRates, endoRates, gastroServices, hospitalRoomRates, cardiologyRates, clinicalProcedures, hospitalBillingPolicy, opdCharges, defaultTokenSize]);

  // Prescription State & Templates
  const DEFAULT_PRESCRIPTION_TEMPLATES = [
    {
      id: 'tmpl-1',
      name: 'Fever / URTI Profile',
      diagnosis: 'Acute Upper Respiratory Tract Infection (URTI)',
      allergies: 'No Known Drug Allergies (NKDA)',
      pastHistory: 'N/A',
      advice: 'Drink warm water, rest, avoid cold items. Review after 3 days if fever persists.',
      medicines: [
        { name: 'Tab Paracetamol 650mg', dosage: '650mg', frequency: '1-0-1', duration: '5 days' },
        { name: 'Tab Cetirizine 10mg', dosage: '10mg', frequency: '0-0-1', duration: '5 days' },
        { name: 'Syr Alex Cough Syrup', dosage: '10ml', frequency: '1-1-1', duration: '5 days' }
      ],
      vitals: { temp: '100.2', pulse: '88', bp: '120/80', spo2: '98', weight: '65', rr: '18', cbs: '', rs: 'Bilateral clear', cns: 'Conscious' }
    },
    {
      id: 'tmpl-2',
      name: 'GERD & Gastritis',
      diagnosis: 'Gastroesophageal Reflux Disease (GERD) / Dyspepsia',
      allergies: 'No Known Drug Allergies (NKDA)',
      pastHistory: 'History of acidity',
      advice: 'Avoid spicy/fried foods, walk 15 mins after meals, dinner at least 2 hours before sleep.',
      medicines: [
        { name: 'Cap Pantoprazole 40mg', dosage: '40mg', frequency: '1-0-0 (Before food)', duration: '14 days' },
        { name: 'Syr Mucaine Gel', dosage: '10ml', frequency: '1-1-1 (After food)', duration: '7 days' }
      ],
      vitals: { bp: '128/82', pulse: '76', temp: '98.6', spo2: '99', weight: '70', rr: '16', cbs: 'Soft non-tender', rs: 'Clear', cns: 'Oriented' }
    },
    {
      id: 'tmpl-3',
      name: 'Hypertension Follow-Up',
      diagnosis: 'Essential Hypertension',
      allergies: 'No Known Drug Allergies (NKDA)',
      pastHistory: 'Known hypertensive for 3 years',
      advice: 'Low salt diet (<2g/day), regular morning walk, monitor BP daily.',
      medicines: [
        { name: 'Tab Telmisartan 40mg', dosage: '40mg', frequency: '1-0-0', duration: '30 days' }
      ],
      vitals: { bp: '138/88', pulse: '74', temp: '98.4', spo2: '98', weight: '72', rr: '16', cbs: '', rs: '', cns: '' }
    }
  ];

  const [prescriptions, setPrescriptions] = useState<any[]>(() => storage.get(STORAGE_KEYS.PRESCRIPTIONS, []));
  const [newPrescription, setNewPrescription] = useState({
    patientId: MOCK_PATIENTS[0]?.id || '',
    doctorId: currentUser?.id || users[0]?.id || '',
    date: new Date().toISOString().split('T')[0],
    diagnosis: '',
    allergies: '',
    pastHistory: '',
    advice: '',
    notes: '',
    medicines: [{ name: '', dosage: '', frequency: '', duration: '' }],
    vitals: {
      bp: '',
      pulse: '',
      temp: '',
      spo2: '',
      weight: '',
      rr: '',
      cbs: '',
      rs: '',
      cns: ''
    },
    drawing: ''
  });

  const [prescriptionTemplates, setPrescriptionTemplates] = useState(() => 
    storage.get('hms_prescription_templates', DEFAULT_PRESCRIPTION_TEMPLATES)
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // Canvas sketchpad drawing refs & states
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState<'pen' | 'eraser'>('pen');
  const [penColor, setPenColor] = useState('#1d4ed8');
  const [lineWidth, setLineWidth] = useState(3);

  const getCanvasCoords = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  };

  const startDrawing = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const { x, y } = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);

    if (drawMode === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = lineWidth * 4;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = penColor;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setNewPrescription(prev => ({ ...prev, drawing: dataUrl }));
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setNewPrescription(prev => ({ ...prev, drawing: '' }));
  };

  const handleApplyTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const tmpl = prescriptionTemplates.find((t: any) => t.id === templateId);
    if (!tmpl) return;

    setNewPrescription(prev => ({
      ...prev,
      diagnosis: tmpl.diagnosis || prev.diagnosis,
      allergies: tmpl.allergies || prev.allergies,
      pastHistory: tmpl.pastHistory || prev.pastHistory,
      advice: tmpl.advice || prev.advice,
      medicines: tmpl.medicines && tmpl.medicines.length > 0 ? JSON.parse(JSON.stringify(tmpl.medicines)) : prev.medicines,
      vitals: tmpl.vitals ? { ...prev.vitals, ...tmpl.vitals } : prev.vitals
    }));
    toast.success(`Template "${tmpl.name}" applied`);
  };

  const handleSaveCurrentAsTemplate = () => {
    const name = window.prompt("Enter a name for this prescription template:");
    if (!name || !name.trim()) return;

    const newTmpl = {
      id: `tmpl-${Date.now()}`,
      name: name.trim(),
      diagnosis: newPrescription.diagnosis,
      allergies: newPrescription.allergies,
      pastHistory: newPrescription.pastHistory,
      advice: newPrescription.advice,
      medicines: newPrescription.medicines,
      vitals: newPrescription.vitals
    };

    const updated = [...prescriptionTemplates, newTmpl];
    setPrescriptionTemplates(updated);
    storage.set('hms_prescription_templates', updated);
    setSelectedTemplateId(newTmpl.id);
    toast.success(`Template "${name}" saved!`);
  };

  const handleSaveHospitalInfo = async () => {
    try {
      storage.set(STORAGE_KEYS.HOSPITAL_INFO, hospitalInfo);
      if (supabaseService.updateHospitalInfo) {
        const saved = await supabaseService.updateHospitalInfo(hospitalInfo);
        if (saved) {
          setHospitalInfo(saved);
        }
      }
      if (onHospitalUpdate) {
        onHospitalUpdate(hospitalInfo);
      }
      toast.success('Hospital information updated and saved successfully');
    } catch (err: any) {
      console.warn('Local save succeeded, cloud sync notice:', err?.message || err);
      toast.success('Hospital information saved successfully');
    }
  };

  const handleAddDept = async () => {
    if (newDept && !departments.includes(newDept)) {
      setDepartments([...departments, newDept]);
      const lastDeptName = newDept;
      setNewDept('');
      await supabaseService.createDepartment(lastDeptName);
      toast.success('Department added');
    }
  };

  const handleDeleteDept = async (deptName: string) => {
    try {
      const updated = departments.filter((d: string) => d !== deptName);
      setDepartments(updated);
      await supabaseService.deleteDepartment(deptName);
      toast.success('Department removed');
    } catch (err) {
      console.error('Error removing department:', err);
    }
  };

  const handleAddSpec = async () => {
    if (newSpec && !specialties.includes(newSpec)) {
      setSpecialties([...specialties, newSpec]);
      const lastSpecName = newSpec;
      setNewSpec('');
      await supabaseService.createSpecialty(lastSpecName);
      toast.success('Specialty added');
    }
  };

  const handleDeleteSpec = async (specName: string) => {
    try {
      const updated = specialties.filter((s: string) => s !== specName);
      setSpecialties(updated);
      await supabaseService.deleteSpecialty(specName);
      toast.success('Specialty removed');
    } catch (err) {
      console.error('Error removing specialty:', err);
    }
  };

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || (!editingUserId && !newUser.password)) {
      toast.error('Please fill in all user details');
      return;
    }

    if (editingUserId) {
      // Update existing user
      const updates: any = {
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        department: newUser.department,
        designation: newUser.role,
        registrationNo: newUser.registrationNo || '',
        regNo: newUser.registrationNo || '',
        labLicenseNo: ['PATHOLOGY', 'RADIOLOGY', 'LAB_STAFF', 'PHARMACIST', 'PHARMACY'].includes(newUser.role) ? (newUser.labLicenseNo || '') : '',
        licenseNumber: ['PATHOLOGY', 'RADIOLOGY', 'LAB_STAFF', 'PHARMACIST', 'PHARMACY'].includes(newUser.role) ? (newUser.labLicenseNo || '') : '',
        avatar: getStaffPhotoUrl({ name: newUser.name, role: newUser.role, department: newUser.department })
      };
      if (newUser.password) {
        updates.password = newUser.password;
      }
      
      await supabaseService.updateStaff(editingUserId, updates);
      
      const updatedUsers = users.map((u: any) => {
        if (u.id === editingUserId) {
          return {
            ...u,
            ...updates
          };
        }
        return u;
      });
      setUsers(updatedUsers);
      setEditingUserId(null);
      
      // If we're updating the current user, sync the app state
      if (editingUserId === currentUser?.id) {
        const updatedUser = updatedUsers.find((u: any) => u.id === editingUserId);
        if (onUserUpdate && updatedUser) {
          onUserUpdate(updatedUser);
        }
      }
      
      toast.success('User account updated successfully');
    } else {
      // Add new user
      const staffToAdd = {
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        department: newUser.department,
        designation: newUser.role,
        password: newUser.password,
        registrationNo: newUser.registrationNo || '',
        regNo: newUser.registrationNo || '',
        labLicenseNo: ['PATHOLOGY', 'RADIOLOGY', 'LAB_STAFF', 'PHARMACIST', 'PHARMACY'].includes(newUser.role) ? (newUser.labLicenseNo || '') : '',
        licenseNumber: ['PATHOLOGY', 'RADIOLOGY', 'LAB_STAFF', 'PHARMACIST', 'PHARMACY'].includes(newUser.role) ? (newUser.labLicenseNo || '') : '',
        avatar: getStaffPhotoUrl({ name: newUser.name, role: newUser.role, department: newUser.department })
      };
      
      const result = await supabaseService.createStaff(staffToAdd);
      if (result) {
        setUsers([...users, result]);
        toast.success(`${newUser.role} account created successfully`);
      } else {
        toast.error('Failed to create account in database');
      }
    }
    
    setNewUser({ name: '', email: '', role: 'DOCTOR', department: '', password: '', registrationNo: '', labLicenseNo: '' });
  };

  const handleAddMedicine = () => {
    setNewPrescription(prev => ({
      ...prev,
      medicines: [...prev.medicines, { name: '', dosage: '', frequency: '', duration: '' }]
    }));
  };

  const handleSavePrescription = () => {
    if (!newPrescription.patientId || !newPrescription.doctorId) {
      toast.error('Please select patient and doctor');
      return;
    }
    const savedRecord = {
      ...newPrescription,
      id: `pr-${Date.now()}`,
      date: newPrescription.date || new Date().toISOString().split('T')[0]
    };
    const updated = [savedRecord, ...prescriptions];
    setPrescriptions(updated);
    storage.set(STORAGE_KEYS.PRESCRIPTIONS, updated);
    toast.success('Prescription saved successfully');
    
    // Automatically trigger print modal
    printPrescription(savedRecord);
  };

  const handleAddBedRate = () => {
    if (!newBedRate.type || !newBedRate.rate) return;
    setBedRates([...bedRates, { type: newBedRate.type, rate: parseInt(newBedRate.rate) }]);
    setNewBedRate({ type: '', rate: '' });
    toast.success('Bed rate added');
  };

  const handleAddOtRate = () => {
    if (!newOtRate.type || !newOtRate.rate) return;
    setOtRates([...otRates, { type: newOtRate.type, rate: parseInt(newOtRate.rate) }]);
    setNewOtRate({ type: '', rate: '' });
    toast.success('OT rate added');
  };

  const handleAddLabRate = () => {
    if (!newLabRate.name || !newLabRate.price) return;
    setLabRates([...labRates, { id: `lt-${Date.now()}`, name: newLabRate.name, category: newLabRate.category, price: parseInt(newLabRate.price) }]);
    setNewLabRate({ ...newLabRate, name: '', price: '' });
    toast.success('Lab/Radiology rate added');
  };

  const handleAddMaterialRate = () => {
    if (!newMaterialRate.name || !newMaterialRate.price) return;
    setMaterialRates([...materialRates, { name: newMaterialRate.name, price: parseInt(newMaterialRate.price), category: newMaterialRate.category }]);
    setNewMaterialRate({ ...newMaterialRate, name: '', price: '' });
    toast.success('Material rate added');
  };

  const handleAddGastroService = () => {
    if (!newGastroService.service.trim() || !newGastroService.charges) {
      toast.error('Please enter service name and charges');
      return;
    }
    const newItem = {
      id: `gs-${Date.now()}`,
      no: String(gastroServices.length + 1),
      service: newGastroService.service.trim(),
      category: newGastroService.category || 'Gastroenterology',
      charges: parseFloat(newGastroService.charges) || 0,
      followUpCharges: newGastroService.followUpCharges ? parseFloat(newGastroService.followUpCharges) : undefined,
      sedationCharges: newGastroService.sedationCharges ? parseFloat(newGastroService.sedationCharges) : 0,
      notes: newGastroService.notes.trim() || '',
      extraChargesNote: newGastroService.extraChargesNote.trim() || ''
    };
    const updated = [...gastroServices, newItem];
    setGastroServices(updated);
    storage.set(STORAGE_KEYS.GASTRO_SERVICES_RATES, updated);
    setNewGastroService({ service: '', category: 'Therapeutic GI', charges: '', followUpCharges: '', sedationCharges: '', notes: '', extraChargesNote: '' });
    toast.success(`Service "${newItem.service}" added to Gastro rate list!`);
  };

  const handleDeleteGastroService = (id: string) => {
    const updated = gastroServices.filter(s => s.id !== id);
    setGastroServices(updated);
    storage.set(STORAGE_KEYS.GASTRO_SERVICES_RATES, updated);
    toast.success('Gastro service removed');
  };

  const handleUpdateGastroService = (id: string, key: string, val: any) => {
    const updated = gastroServices.map(s => s.id === id ? { ...s, [key]: val } : s);
    setGastroServices(updated);
    storage.set(STORAGE_KEYS.GASTRO_SERVICES_RATES, updated);
  };

  const handleAddHospitalRoomRate = () => {
    if (!newHospitalRoomService.service.trim() || !newHospitalRoomService.charges) {
      toast.error('Please enter service name and charges');
      return;
    }
    const newItem = {
      id: `hr-${Date.now()}`,
      no: String(hospitalRoomRates.length + 21),
      service: newHospitalRoomService.service.trim(),
      category: newHospitalRoomService.category || 'Room/Bed',
      charges: parseFloat(newHospitalRoomService.charges) || 0,
      billingUnit: newHospitalRoomService.billingUnit || 'Per Day',
      notes: newHospitalRoomService.notes.trim() || ''
    };
    const updated = [...hospitalRoomRates, newItem];
    setHospitalRoomRates(updated);
    storage.set(STORAGE_KEYS.HOSPITAL_ROOM_RATES, updated);
    setNewHospitalRoomService({ service: '', category: 'Room/Bed', charges: '', billingUnit: 'Per Day', notes: '' });
    toast.success(`Hospital charge item "${newItem.service}" added!`);
  };

  const handleDeleteHospitalRoomRate = (id: string) => {
    const updated = hospitalRoomRates.filter(s => s.id !== id);
    setHospitalRoomRates(updated);
    storage.set(STORAGE_KEYS.HOSPITAL_ROOM_RATES, updated);
    toast.success('Hospital charge item removed');
  };

  const handleUpdateHospitalRoomRate = (id: string, key: string, val: any) => {
    const updated = hospitalRoomRates.map(s => s.id === id ? { ...s, [key]: val } : s);
    setHospitalRoomRates(updated);
    storage.set(STORAGE_KEYS.HOSPITAL_ROOM_RATES, updated);
  };

  const handleAddCardiologyRate = () => {
    if (!newCardioService.service.trim() || !newCardioService.charges) {
      toast.error('Please enter service name and charges');
      return;
    }
    const newItem = {
      id: `cd-${Date.now()}`,
      no: String(cardiologyRates.length + 37),
      service: newCardioService.service.trim(),
      category: newCardioService.category || 'Cardiology',
      charges: parseFloat(newCardioService.charges) || 0,
      billingUnit: newCardioService.billingUnit || 'Each',
      notes: newCardioService.notes.trim() || ''
    };
    const updated = [...cardiologyRates, newItem];
    setCardiologyRates(updated);
    storage.set(STORAGE_KEYS.CARDIOLOGY_EQUIPMENT_RATES, updated);
    setNewCardioService({ service: '', category: 'Cardiology', charges: '', billingUnit: 'Per Day', notes: '' });
    toast.success(`Cardiology/Equipment service "${newItem.service}" added!`);
  };

  const handleDeleteCardiologyRate = (id: string) => {
    const updated = cardiologyRates.filter(s => s.id !== id);
    setCardiologyRates(updated);
    storage.set(STORAGE_KEYS.CARDIOLOGY_EQUIPMENT_RATES, updated);
    toast.success('Cardiology service removed');
  };

  const handleUpdateCardiologyRate = (id: string, key: string, val: any) => {
    const updated = cardiologyRates.map(s => s.id === id ? { ...s, [key]: val } : s);
    setCardiologyRates(updated);
    storage.set(STORAGE_KEYS.CARDIOLOGY_EQUIPMENT_RATES, updated);
  };

  const handleAddClinicalProcedure = () => {
    if (!newProcedureService.service.trim() || !newProcedureService.charges) {
      toast.error('Please enter procedure name and charges');
      return;
    }
    const newItem = {
      id: `pr-${Date.now()}`,
      no: String(clinicalProcedures.length + 46),
      service: newProcedureService.service.trim(),
      category: newProcedureService.category || 'Clinical Procedure',
      charges: parseFloat(newProcedureService.charges) || 0,
      notes: newProcedureService.notes.trim() || ''
    };
    const updated = [...clinicalProcedures, newItem];
    setClinicalProcedures(updated);
    storage.set(STORAGE_KEYS.CLINICAL_PROCEDURE_RATES, updated);
    setNewProcedureService({ service: '', category: 'Vascular Access', charges: '', notes: '' });
    toast.success(`Clinical procedure "${newItem.service}" added!`);
  };

  const handleDeleteClinicalProcedure = (id: string) => {
    const updated = clinicalProcedures.filter(s => s.id !== id);
    setClinicalProcedures(updated);
    storage.set(STORAGE_KEYS.CLINICAL_PROCEDURE_RATES, updated);
    toast.success('Clinical procedure removed');
  };

  const handleUpdateClinicalProcedure = (id: string, key: string, val: any) => {
    const updated = clinicalProcedures.map(s => s.id === id ? { ...s, [key]: val } : s);
    setClinicalProcedures(updated);
    storage.set(STORAGE_KEYS.CLINICAL_PROCEDURE_RATES, updated);
  };

  const handleRestoreHospitalTariffMaster = () => {
    if (!window.confirm('Are you sure you want to restore the official Master Rate Card for all hospital services, rooms, cardiology, procedures, and endoscopy? Any customized prices will be reset to the official tariff list.')) {
      return;
    }
    setGastroServices(MOCK_GASTRO_SERVICES);
    storage.set(STORAGE_KEYS.GASTRO_SERVICES_RATES, MOCK_GASTRO_SERVICES);

    setHospitalRoomRates(MOCK_HOSPITAL_ROOM_RATES);
    storage.set(STORAGE_KEYS.HOSPITAL_ROOM_RATES, MOCK_HOSPITAL_ROOM_RATES);

    setCardiologyRates(MOCK_CARDIOLOGY_EQUIPMENT_RATES);
    storage.set(STORAGE_KEYS.CARDIOLOGY_EQUIPMENT_RATES, MOCK_CARDIOLOGY_EQUIPMENT_RATES);

    setClinicalProcedures(MOCK_CLINICAL_PROCEDURE_RATES);
    storage.set(STORAGE_KEYS.CLINICAL_PROCEDURE_RATES, MOCK_CLINICAL_PROCEDURE_RATES);

    setHospitalBillingPolicy(MOCK_HOSPITAL_BILLING_POLICY);
    storage.set(STORAGE_KEYS.HOSPITAL_BILLING_POLICY, MOCK_HOSPITAL_BILLING_POLICY);

    setBedRates(MOCK_BED_RATES);
    storage.set(STORAGE_KEYS.BED_RATES, MOCK_BED_RATES);

    setEndoRates(MOCK_ENDO_RATES);
    storage.set(STORAGE_KEYS.ENDO_PROCEDURE_RATES, MOCK_ENDO_RATES);

    setLabRates(MOCK_LAB_TESTS);
    storage.set(STORAGE_KEYS.LAB_RATES, MOCK_LAB_TESTS);

    toast.success('Official Hospital Master Tariff List restored successfully!');
  };

  const handleExportTariffExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Master Consolidated Sheet
      const masterRows: any[] = [];

      // 1. Gastroenterology Services
      masterRows.push({ 'S.No.': '---', 'Service / Procedure': '=== 1. GASTROENTEROLOGY SERVICES ===', 'Category': 'Gastroenterology', 'Charges (₹)': '', 'Notes / Terms': '' });
      gastroServices.forEach(g => {
        masterRows.push({
          'S.No.': g.no || '',
          'Service / Procedure': g.service,
          'Category': g.category || 'Gastroenterology',
          'Charges (₹)': g.charges,
          'Notes / Terms': [
            g.followUpCharges ? `Follow-up / After 7 Days: ₹${g.followUpCharges}` : '',
            g.sedationCharges ? `Sedation: ₹${g.sedationCharges}` : '',
            g.extraChargesNote || '',
            g.rangeText || '',
            g.notes || ''
          ].filter(Boolean).join(' | ')
        });
      });

      // 2. Hospital & Room Charges
      masterRows.push({ 'S.No.': '---', 'Service / Procedure': '=== 2. HOSPITAL CHARGES & ROOMS ===', 'Category': 'Hospital & IPD', 'Charges (₹)': '', 'Notes / Terms': '' });
      hospitalRoomRates.forEach(h => {
        masterRows.push({
          'S.No.': h.no || '',
          'Service / Procedure': h.service,
          'Category': h.category || 'Room/Bed',
          'Charges (₹)': h.charges === 0 ? 'As Per Surgery' : h.charges,
          'Notes / Terms': `${h.billingUnit ? `[${h.billingUnit}] ` : ''}${h.notes || ''}`
        });
      });

      // 3. Radiology
      masterRows.push({ 'S.No.': '---', 'Service / Procedure': '=== 3. RADIOLOGY SERVICES ===', 'Category': 'Radiology', 'Charges (₹)': '', 'Notes / Terms': '' });
      const radItems = labRates.filter((l: any) => l.category === 'Radiology');
      radItems.forEach((r: any, idx: number) => {
        masterRows.push({
          'S.No.': String(35 + idx),
          'Service / Procedure': r.name,
          'Category': 'Radiology',
          'Charges (₹)': r.price,
          'Notes / Terms': r.vial ? `Modality: ${r.vial}` : ''
        });
      });

      // 4. Cardiology & Equipment
      masterRows.push({ 'S.No.': '---', 'Service / Procedure': '=== 4. CARDIOLOGY & ICU SUPPORT ===', 'Category': 'Cardiology & ICU', 'Charges (₹)': '', 'Notes / Terms': '' });
      cardiologyRates.forEach(c => {
        masterRows.push({
          'S.No.': c.no || '',
          'Service / Procedure': c.service,
          'Category': c.category || 'Cardiology',
          'Charges (₹)': c.charges,
          'Notes / Terms': `${c.billingUnit ? `[${c.billingUnit}] ` : ''}${c.notes || ''}`
        });
      });

      // 5. Clinical Procedures
      masterRows.push({ 'S.No.': '---', 'Service / Procedure': '=== 5. CLINICAL PROCEDURES ===', 'Category': 'Clinical Procedures', 'Charges (₹)': '', 'Notes / Terms': '' });
      clinicalProcedures.forEach(p => {
        masterRows.push({
          'S.No.': p.no || '',
          'Service / Procedure': p.service,
          'Category': p.category || 'Clinical Procedure',
          'Charges (₹)': p.charges,
          'Notes / Terms': p.notes || ''
        });
      });

      // 6. Pathology
      masterRows.push({ 'S.No.': '---', 'Service / Procedure': '=== 6. PATHOLOGY & LAB TESTS ===', 'Category': 'Pathology', 'Charges (₹)': '', 'Notes / Terms': '' });
      const pathItems = labRates.filter((l: any) => l.category !== 'Radiology');
      pathItems.forEach((l: any, idx: number) => {
        masterRows.push({
          'S.No.': String(idx + 1),
          'Service / Procedure': l.name,
          'Category': l.category || 'Pathology',
          'Charges (₹)': l.price,
          'Notes / Terms': l.vial ? `Vial: ${l.vial}` : ''
        });
      });

      // 7. Policy Notes
      masterRows.push({ 'S.No.': '---', 'Service / Procedure': '=== 7. BILLING POLICY & NOTES ===', 'Category': 'Policy', 'Charges (₹)': '', 'Notes / Terms': '' });
      masterRows.push({
        'S.No.': '*',
        'Service / Procedure': 'Hospital Service Charges',
        'Category': 'Policy',
        'Charges (₹)': `${hospitalBillingPolicy?.serviceChargePercent || 10}%`,
        'Notes / Terms': hospitalBillingPolicy?.serviceChargeNote || '10% service charges will be applicable on total hospital bills'
      });
      masterRows.push({
        'S.No.': '*',
        'Service / Procedure': 'Medicine Pricing Rule',
        'Category': 'Policy',
        'Charges (₹)': 'As Per MRP',
        'Notes / Terms': hospitalBillingPolicy?.medicinesPricingRule || 'Medicines are charged according to the MRP'
      });
      masterRows.push({
        'S.No.': '*',
        'Service / Procedure': 'Minimum Advance Deposit Policy',
        'Category': 'Policy',
        'Charges (₹)': `ICU: ₹${hospitalBillingPolicy?.icuAdmissionDeposit || 10000} | Other: ₹${hospitalBillingPolicy?.otherRoomsAdmissionDeposit || 5000}`,
        'Notes / Terms': hospitalBillingPolicy?.depositPolicyNote || 'Minimum deposit on ICU admission is ₹10,000 and for other rooms is ₹5,000'
      });

      const masterWs = XLSX.utils.json_to_sheet(masterRows);
      XLSX.utils.book_append_sheet(wb, masterWs, 'Master Tariff Sheet');

      // Individual Sheets
      const gastroWs = XLSX.utils.json_to_sheet(gastroServices);
      XLSX.utils.book_append_sheet(wb, gastroWs, 'Gastroenterology');

      const roomsWs = XLSX.utils.json_to_sheet(hospitalRoomRates);
      XLSX.utils.book_append_sheet(wb, roomsWs, 'Rooms & Doctor Visits');

      const cardioWs = XLSX.utils.json_to_sheet(cardiologyRates);
      XLSX.utils.book_append_sheet(wb, cardioWs, 'Cardiology & ICU');

      const procWs = XLSX.utils.json_to_sheet(clinicalProcedures);
      XLSX.utils.book_append_sheet(wb, procWs, 'Clinical Procedures');

      XLSX.writeFile(wb, `Hospital_Master_Tariff_List_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('Master Tariff Sheet exported to Excel successfully!');
    } catch (e: any) {
      console.error('Failed to export Excel', e);
      toast.error('Failed to export rate sheet: ' + (e.message || 'Unknown error'));
    }
  };

  const handlePrintOfficialTariffSheet = () => {
    const hospInfo = storage.get<{
      name: string;
      address: string;
      phone: string;
      logo?: string | null;
    }>(STORAGE_KEYS.HOSPITAL_INFO, {
      name: 'GASTRO PLUS HOSPITAL',
      address: 'Plot No. 7 & 8, Om Shiv Nagar, Gufa Mandir Road, Lal Ghati Bhopal, 462030, Madhya Pradesh',
      phone: '9109102145/9109101246'
    });

    const printWin = window.open('', '_blank');
    if (!printWin) {
      toast.error('Please allow popups to print rate card');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Hospital Master Tariff List - ${hospInfo.name}</title>
        <style>
          @page { size: A4; margin: 12mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 10px; font-size: 11px; }
          .header { text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 8px; margin-bottom: 12px; }
          .hosp-name { font-size: 18px; font-weight: 800; color: #0369a1; text-transform: uppercase; margin: 0; letter-spacing: 0.5px; }
          .hosp-sub { font-size: 10px; color: #64748b; margin-top: 2px; }
          .title { font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 6px; background: #f0f9ff; padding: 4px 8px; display: inline-block; border-radius: 4px; border: 1px solid #bae6fd; }
          .section-title { font-size: 11px; font-weight: 800; color: #0369a1; margin-top: 14px; margin-bottom: 4px; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 10px; }
          th { background: #f8fafc; color: #334155; font-weight: 700; text-align: left; padding: 4px 6px; border: 1px solid #cbd5e1; }
          td { padding: 3.5px 6px; border: 1px solid #e2e8f0; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .font-bold { font-weight: 700; }
          .policy-box { background: #fefce8; border: 1px solid #fef08a; padding: 8px; border-radius: 6px; margin-top: 14px; }
          .policy-title { font-weight: 800; color: #854d0e; font-size: 10.5px; margin-bottom: 4px; }
          .policy-item { color: #713f12; margin-bottom: 2px; font-size: 9.5px; }
          .footer-note { text-align: center; font-size: 9px; color: #94a3b8; margin-top: 16px; border-top: 1px solid #e2e8f0; padding-top: 6px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="hosp-name">${hospInfo.name}</div>
          <div class="hosp-sub">${hospInfo.address} | Phone: ${hospInfo.phone}</div>
          <div class="title">OFFICIAL SERVICES & SCHEDULE OF CHARGES (TARIFF MASTER)</div>
        </div>

        <div class="section-title">1. Gastroenterology Services & Endoscopy Rates</div>
        <table>
          <thead>
            <tr>
              <th style="width: 35px;" class="text-center">S.No.</th>
              <th>Services / Procedure</th>
              <th style="width: 90px;" class="text-right">Charges (₹)</th>
              <th>Special Remarks / Terms</th>
            </tr>
          </thead>
          <tbody>
            ${gastroServices.map(s => `
              <tr>
                <td class="text-center font-bold">${s.no || '-'}</td>
                <td class="font-bold">${s.service}</td>
                <td class="text-right font-bold" style="color: #0369a1;">₹${s.charges.toLocaleString('en-IN')}</td>
                <td>
                  ${s.followUpCharges ? `<strong>After 7 Days:</strong> ₹${s.followUpCharges.toLocaleString('en-IN')}` : ''}
                  ${s.sedationCharges ? ` | Sedation: ₹${s.sedationCharges}` : ''}
                  ${s.extraChargesNote ? ` <span style="color: #b91c1c; font-weight: bold;">(${s.extraChargesNote})</span>` : ''}
                  ${s.rangeText ? ` <span style="color: #475569;">(${s.rangeText})</span>` : ''}
                  ${s.notes && !s.followUpCharges ? s.notes : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="section-title">2. Hospital Charges & IPD Room Rates</div>
        <table>
          <thead>
            <tr>
              <th style="width: 35px;" class="text-center">S.No.</th>
              <th>Services</th>
              <th style="width: 90px;" class="text-right">Charges (₹)</th>
              <th style="width: 80px;">Billing Unit</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${hospitalRoomRates.map(s => `
              <tr>
                <td class="text-center font-bold">${s.no || '-'}</td>
                <td class="font-bold">${s.service}</td>
                <td class="text-right font-bold" style="color: #0369a1;">${s.charges === 0 ? 'As Per Surgery' : '₹' + s.charges.toLocaleString('en-IN')}</td>
                <td>${s.billingUnit || 'Per Day'}</td>
                <td>${s.notes || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="display: flex; gap: 12px;">
          <div style="flex: 1;">
            <div class="section-title">3. Radiology</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 35px;" class="text-center">S.No.</th>
                  <th>Service</th>
                  <th style="width: 80px;" class="text-right">Charges (₹)</th>
                </tr>
              </thead>
              <tbody>
                ${labRates.filter((l: any) => l.category === 'Radiology').map((r: any, idx: number) => `
                  <tr>
                    <td class="text-center font-bold">${35 + idx}</td>
                    <td class="font-bold">${r.name}</td>
                    <td class="text-right font-bold" style="color: #0369a1;">₹${r.price.toLocaleString('en-IN')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div style="flex: 1.2;">
            <div class="section-title">4. Cardiology & ICU Equipment / Support</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 35px;" class="text-center">S.No.</th>
                  <th>Services</th>
                  <th style="width: 80px;" class="text-right">Charges (₹)</th>
                  <th style="width: 60px;">Unit</th>
                </tr>
              </thead>
              <tbody>
                ${cardiologyRates.map(s => `
                  <tr>
                    <td class="text-center font-bold">${s.no || '-'}</td>
                    <td class="font-bold">${s.service}</td>
                    <td class="text-right font-bold" style="color: #0369a1;">₹${s.charges.toLocaleString('en-IN')}</td>
                    <td>${s.billingUnit || 'Each'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="section-title">5. Clinical Procedures</div>
        <table>
          <thead>
            <tr>
              <th style="width: 35px;" class="text-center">S.No.</th>
              <th>Services</th>
              <th style="width: 90px;" class="text-right">Charges (₹)</th>
              <th>Clinical Details / Scope</th>
            </tr>
          </thead>
          <tbody>
            ${clinicalProcedures.map(s => `
              <tr>
                <td class="text-center font-bold">${s.no || '-'}</td>
                <td class="font-bold">${s.service}</td>
                <td class="text-right font-bold" style="color: #0369a1;">₹${s.charges.toLocaleString('en-IN')}</td>
                <td>${s.notes || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="policy-box">
          <div class="policy-title">IMPORTANT BILLING POLICIES & NOTICES:</div>
          <div class="policy-item">• <strong>Hospital Service Charges:</strong> 10% service charges will be applicable on total hospital bills.</div>
          <div class="policy-item">• <strong>Medicines Billing Rule:</strong> Medicines are charged according to the MRP.</div>
          <div class="policy-item">• <strong>Admission Advance Deposit:</strong> Minimum deposit on ICU admission is ₹10,000 and for other rooms is ₹5,000.</div>
        </div>

        <div class="footer-note">
          Published by Hospital Administration • All rates are subject to revision as per management policies • Generated on ${new Date().toLocaleDateString('en-GB')}
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWin.document.write(html);
    printWin.document.close();
  };

  const printPrescription = (pres: any) => {
    const templateImage = storage.get(STORAGE_KEYS.TEMPLATE_IMAGE, null);
    const hospitalInfo = storage.get<{
      name: string;
      address: string;
      phone: string;
      logo?: string | null;
    }>(STORAGE_KEYS.HOSPITAL_INFO, {
      name: 'GASTRO PLUS HOSPITAL',
      address: 'Plot No. 7 & 8, Om Shiv Nagar, Gufa Mandir Road, Lal Ghati Bhopal, 462030, Madhya Pradesh',
      phone: '9109102145/9109101246'
    });
    
    const patient = MOCK_PATIENTS.find(p => p.id === pres.patientId);
    const doctor = users.find(u => u.id === pres.doctorId);
    
    const html = getPrescriptionPrintHtml(
      {
        name: patient?.name || 'N/A',
        age: patient?.age,
        gender: patient?.gender,
        mrn: patient?.mrn,
        phone: patient?.phone || (patient as any)?.mobile || '',
        fatherName: (patient as any)?.fatherName || (patient as any)?.father_name || '',
        allergies: patient?.allergies || (patient as any)?.known_allergies || (patient as any)?.allergies_list,
        pastHistory: patient?.pastHistory || (patient as any)?.medical_history || (patient as any)?.past_history || (patient as any)?.history,
        medicalHistory: patient?.medicalHistory
      },
      {
        date: pres.date,
        medicines: pres.medicines,
        advice: pres.notes || pres.diagnosis,
        vitals: (patient as any)?.vitals || (pres as any)?.vitals
      },
      doctor,
      hospitalInfo
    );

    triggerRxPrintPreview(html);
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border shadow-sm text-slate-900 mb-6" style={{ background: 'linear-gradient(135deg, #E5C39E, #F9EFE5, #E5C39E)', borderColor: '#ebd0a2' }}>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-amber-950">Hospital Settings & Configuration</h1>
          <p className="text-amber-900/90 font-semibold text-sm">Manage hospital identity, departments, users, and prescriptions.</p>
        </div>
      </div>

      <Tabs defaultValue="hospital" className="space-y-6">
        <TabsList className="bg-white border shadow-sm p-1 h-auto flex-wrap justify-start">
          <TabsTrigger value="profile" className="gap-2"><UserPlus className="w-4 h-4" /> My Profile</TabsTrigger>
          {!isAccountant && <TabsTrigger value="hospital" className="gap-2"><Building2 className="w-4 h-4" /> Hospital Info</TabsTrigger>}
          {!isAccountant && <TabsTrigger value="departments" className="gap-2"><Stethoscope className="w-4 h-4" /> Departments</TabsTrigger>}
          <TabsTrigger value="rates" className="gap-2"><Receipt className="w-4 h-4" /> Rates & Billing</TabsTrigger>
          {!isAccountant && <TabsTrigger value="pharmacy_bill" className="gap-2"><Pill className="w-4 h-4" /> Pharmacy Bill</TabsTrigger>}
          {!isAccountant && <TabsTrigger value="users" className="gap-2"><Users className="w-4 h-4" /> User Panel</TabsTrigger>}
          {!isAccountant && <TabsTrigger value="templates" className="gap-2"><Layout className="w-4 h-4" /> Templates</TabsTrigger>}
          <TabsTrigger value="prescriptions" className="gap-2"><FileText className="w-4 h-4" /> Prescriptions</TabsTrigger>
          <TabsTrigger value="tax_slabs" className="gap-2"><Percent className="w-4 h-4" /> Tax Settings</TabsTrigger>
          {!isAccountant && (
            <TabsTrigger value="database" className="gap-2 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-700 data-[state=active]:bg-indigo-600 data-[state=active]:text-white font-bold border border-indigo-100/50"><Database className="w-4 h-4" /> Database & Sync</TabsTrigger>
          )}
          {currentUser?.role === 'SUPER_ADMIN' && (
            <TabsTrigger value="audit" className="gap-2"><History className="w-4 h-4" /> Audit Logs</TabsTrigger>
          )}
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>My Profile</CardTitle>
              <CardDescription>Update your personal information and login details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex flex-col items-center gap-4">
                  <Avatar className="w-24 h-24 border-2 border-white shadow-md">
                    <AvatarImage src={currentUser?.avatar} />
                    <AvatarFallback>{currentUser?.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <Button variant="outline" size="sm" className="h-8 text-xs">Change Avatar</Button>
                </div>
                
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input 
                      value={profileData.name} 
                      onChange={(e) => setProfileData({...profileData, name: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email / Username</Label>
                    <Input 
                      value={profileData.email} 
                      onChange={(e) => setProfileData({...profileData, email: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input 
                      value={profileData.phone || ''} 
                      onChange={(e) => setProfileData({...profileData, phone: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Input value={currentUser?.role?.replace('_', ' ') || ''} disabled className="bg-slate-50" />
                  </div>
                  <div className="space-y-2">
                    <Label>My Password</Label>
                    <Input 
                      type="password"
                      placeholder="Enter new password"
                      value={profileData.password || ''} 
                      onChange={(e) => setProfileData({...profileData, password: e.target.value})} 
                    />
                  </div>
                </div>
              </div>
              <Separator />
              <div className="flex justify-end">
                <Button className="bg-medical-blue gap-2" onClick={handleUpdateProfile}>
                  <Save className="w-4 h-4" />
                  Update Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hospital Info Tab */}
        <TabsContent value="hospital">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Hospital Information & Prescription Header Logo</CardTitle>
              <CardDescription>Configure your hospital's public identity, contact details, and the official logo displayed in app headers and printed on prescription letterheads.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
               <div className="flex flex-col md:flex-row gap-8">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-36 h-36 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 overflow-hidden shadow-inner">
                    {hospitalInfo.logo && hospitalInfo.logo !== 'null' && hospitalInfo.logo !== 'undefined' && hospitalInfo.logo.trim() !== '' ? (
                      <img src={hospitalInfo.logo} alt="Hospital & Prescription Logo" className="w-full h-full object-contain p-2" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mb-2 text-slate-400" />
                        <span className="text-[10px] font-bold uppercase text-slate-500 text-center px-2">Upload Prescription & Hospital Logo</span>
                      </>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 w-full">
                    <Button variant="outline" size="sm" className="w-full h-8 text-xs relative cursor-pointer overflow-hidden font-semibold" asChild>
                      <label className="flex items-center justify-center cursor-pointer w-full h-full">
                        {hospitalInfo.logo ? 'Change Logo' : 'Upload Logo'}
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                resizeImage(file, 400, 400, (resizedBase64) => {
                                  const logoVal = resizedBase64 || null;
                                  const updated = { ...hospitalInfo, logo: logoVal };
                                  setHospitalInfo(updated);
                                  storage.set(STORAGE_KEYS.HOSPITAL_INFO, updated);
                                  if (onHospitalUpdate) onHospitalUpdate(updated);
                                  toast.success('Prescription & hospital logo uploaded and saved successfully!');
                                });
                              } catch (err) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  const logoVal = (reader.result as string) || null;
                                  const updated = { ...hospitalInfo, logo: logoVal };
                                  setHospitalInfo(updated);
                                  storage.set(STORAGE_KEYS.HOSPITAL_INFO, updated);
                                  if (onHospitalUpdate) onHospitalUpdate(updated);
                                  toast.success('Prescription & hospital logo uploaded and saved successfully!');
                                };
                                reader.readAsDataURL(file);
                              }
                            }
                          }} 
                        />
                      </label>
                    </Button>
                    {hospitalInfo.logo && hospitalInfo.logo !== 'null' && hospitalInfo.logo !== 'undefined' && hospitalInfo.logo.trim() !== '' && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-rose-500 h-8 hover:text-rose-700 hover:bg-rose-50 text-xs font-semibold w-full"
                        onClick={() => {
                          const updated = { ...hospitalInfo, logo: null };
                          setHospitalInfo(updated);
                          storage.set(STORAGE_KEYS.HOSPITAL_INFO, updated);
                          if (onHospitalUpdate) onHospitalUpdate(updated);
                          toast.success('Prescription logo removed.');
                        }}
                      >
                        Remove Logo
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hospital Name</Label>
                    <Input value={hospitalInfo.name} onChange={(e) => setHospitalInfo({...hospitalInfo, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>GST Number</Label>
                    <Input value={hospitalInfo.gst} onChange={(e) => setHospitalInfo({...hospitalInfo, gst: e.target.value})} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Address</Label>
                    <Input value={hospitalInfo.address} onChange={(e) => setHospitalInfo({...hospitalInfo, address: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input value={hospitalInfo.phone} onChange={(e) => setHospitalInfo({...hospitalInfo, phone: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input value={hospitalInfo.email} onChange={(e) => setHospitalInfo({...hospitalInfo, email: e.target.value})} />
                  </div>
                </div>
              </div>
              <Separator />
              <div className="flex justify-end">
                <Button className="bg-medical-blue gap-2" onClick={handleSaveHospitalInfo}>
                  <Save className="w-4 h-4" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pharmacy Bill Tab */}
        <TabsContent value="pharmacy_bill">
          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="p-6 pb-4 border-b">
              <CardTitle className="text-slate-800 flex items-center gap-2">
                <Pill className="w-5 h-5 text-teal-600" />
                Pharmacy Invoice & Billing Configuration
              </CardTitle>
              <CardDescription>
                Configure the professional header details, tax configuration, bank registers, and branding details printed on modern GST pharmacy receipts.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Left Column: Pharmacy Branding */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-teal-600 uppercase tracking-wider border-b pb-1">Enterprise Identity</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="pharm-name" className="text-xs font-bold text-slate-700">Pharmacy Name / Enterprise Name</Label>
                    <Input 
                      id="pharm-name" 
                      value={pharmacySettings.pharmacyName || ''} 
                      onChange={(e) => setPharmacySettings({ ...pharmacySettings, pharmacyName: e.target.value })} 
                      placeholder="Medicare Wholesale Pharmacy"
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pharm-tagline" className="text-xs font-bold text-slate-700">Branding Tagline Slogan</Label>
                    <Input 
                      id="pharm-tagline" 
                      value={pharmacySettings.tagline || ''} 
                      onChange={(e) => setPharmacySettings({ ...pharmacySettings, tagline: e.target.value })} 
                      placeholder="A single stop for all your Healthcare needs!"
                      className="h-9"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pharm-gstin" className="text-xs font-bold text-slate-700">Enterprise GSTIN / Tax Number</Label>
                      <Input 
                        id="pharm-gstin" 
                        value={pharmacySettings.gstin || ''} 
                        onChange={(e) => setPharmacySettings({ ...pharmacySettings, gstin: e.target.value })} 
                        placeholder="26CORPP3939N1ZA"
                        className="font-mono uppercase h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pharm-phone" className="text-xs font-bold text-slate-700">Support Contact Number</Label>
                      <Input 
                        id="pharm-phone" 
                        value={pharmacySettings.phone || ''} 
                        onChange={(e) => setPharmacySettings({ ...pharmacySettings, phone: e.target.value })} 
                        placeholder="9345678991"
                        className="h-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pharm-address" className="text-xs font-bold text-slate-700">Retail Location Address</Label>
                    <Input 
                      id="pharm-address" 
                      value={pharmacySettings.address || ''} 
                      onChange={(e) => setPharmacySettings({ ...pharmacySettings, address: e.target.value })} 
                      placeholder="13 Health Street, Mumbai, Maharashtra"
                      className="h-9"
                    />
                  </div>

                  {/* Logo Config */}
                  <div className="p-4 border rounded-xl bg-slate-50/50 space-y-3">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Billing Invoice Brand Logo</Label>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 bg-white rounded-xl border flex flex-col items-center justify-center text-slate-400 overflow-hidden shadow-sm">
                        {pharmacySettings.logoUrl ? (
                          <img src={pharmacySettings.logoUrl} alt="Pharmacy Billing Logo" className="w-full h-full object-contain p-1" />
                        ) : (
                          <span className="text-[9px] text-center px-1 font-semibold text-slate-400 uppercase">No Logo Uploaded</span>
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <p className="text-[11px] text-muted-foreground leading-normal">
                          Upload your business logomark (PNG, JPG, or SVG). Will be scaled down properly and printed in gray or green on invoice sheets.
                        </p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="h-8 text-xs relative cursor-pointer overflow-hidden" asChild nativeButton={false}>
                            <label>
                              <Upload className="w-3.5 h-3.5 mr-1 text-slate-500" />
                              Upload Image
                              <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*" 
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setPharmacySettings({ ...pharmacySettings, logoUrl: reader.result as string });
                                      toast.success('Pharmacy billing logo loaded successfully!');
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }} 
                              />
                            </label>
                          </Button>
                          {pharmacySettings.logoUrl && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-rose-500 h-8 hover:text-rose-600 hover:bg-rose-50 text-xs"
                              onClick={() => setPharmacySettings({ ...pharmacySettings, logoUrl: '' })}
                            >
                              Remove Logo
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Right Column: Bank Details & Footer Settings */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-teal-600 uppercase tracking-wider border-b pb-1">Deposit Registry & Banking Coordinates</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pharm-bankName" className="text-xs font-bold text-slate-700">Financial Institution Bank Name</Label>
                      <Input 
                        id="pharm-bankName" 
                        value={pharmacySettings.bankName || ''} 
                        onChange={(e) => setPharmacySettings({ ...pharmacySettings, bankName: e.target.value })} 
                        placeholder="ICICI"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pharm-bankBranch" className="text-xs font-bold text-slate-700">Branch Location Name</Label>
                      <Input 
                        id="pharm-bankBranch" 
                        value={pharmacySettings.bankBranch || ''} 
                        onChange={(e) => setPharmacySettings({ ...pharmacySettings, bankBranch: e.target.value })} 
                        placeholder="Surate"
                        className="h-9"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pharm-bankNo" className="text-xs font-bold text-slate-700">Deposit Account Number</Label>
                      <Input 
                        id="pharm-bankNo" 
                        value={pharmacySettings.bankAccNo || ''} 
                        onChange={(e) => setPharmacySettings({ ...pharmacySettings, bankAccNo: e.target.value })} 
                        placeholder="2715500356"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pharm-ifsc" className="text-xs font-bold text-slate-700">Routing IFSC Code</Label>
                      <Input 
                        id="pharm-ifsc" 
                        value={pharmacySettings.bankIfsc || ''} 
                        onChange={(e) => setPharmacySettings({ ...pharmacySettings, bankIfsc: e.target.value })} 
                        placeholder="ICIC0000045"
                        className="font-mono uppercase h-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pharm-upi" className="text-xs font-bold text-slate-700">UPI Virtual ID Address for payments</Label>
                    <Input 
                      id="pharm-upi" 
                      value={pharmacySettings.upiId || ''} 
                      onChange={(e) => setPharmacySettings({ ...pharmacySettings, upiId: e.target.value })} 
                      placeholder="medicare@icici"
                      className="font-mono h-9"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="pharm-terms" className="text-xs font-bold text-slate-700">Legal Terms & Conditions</Label>
                      <span className="text-[10px] text-slate-400 font-mono">Use line breaks for bullets</span>
                    </div>
                    <textarea 
                      id="pharm-terms" 
                      className="w-full h-24 border rounded-xl p-3 text-xs font-sans focus:ring-1 focus:ring-teal-500 focus:outline-none bg-white shadow-inner"
                      value={pharmacySettings.termsAndConditions?.join('\n') || ''}
                      onChange={(e) => {
                        const lines = e.target.value.split('\n');
                        setPharmacySettings({ ...pharmacySettings, termsAndConditions: lines });
                      }}
                      placeholder="Subject to Mumbai Jurisdiction&#10;Goods once sold cannot be returned"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pharm-footerSlogan" className="text-xs font-bold text-slate-700">Invoice Document Footer Slogan</Label>
                    <Input 
                      id="pharm-footerSlogan" 
                      value={pharmacySettings.additionalFooter || ''} 
                      onChange={(e) => setPharmacySettings({ ...pharmacySettings, additionalFooter: e.target.value })} 
                      placeholder="Thanks for your trust! We look forward to working with you again."
                      className="h-9"
                    />
                  </div>
                </div>

              </div>

              <Separator />
              <div className="flex justify-end gap-3 pt-2">
                <Button 
                  variant="outline" 
                  className="h-10 text-xs text-slate-600"
                  onClick={() => {
                    setPharmacySettings(DEFAULT_PHARMACY_SETTINGS);
                    toast.info('Restored default pharmacy values. Click save to apply changes.');
                  }}
                >
                  Reset Defaults
                </Button>
                <Button 
                  className="bg-teal-600 hover:bg-teal-700 text-white gap-2 h-10 px-5 text-xs font-bold" 
                  onClick={handleSavePharmacySettings}
                >
                  <Save className="w-4 h-4" />
                  Save Pharmacy Billing Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Departments & Wards Tab */}
        <TabsContent value="departments">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Departments</CardTitle>
                <CardDescription>Manage clinical and administrative departments.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input placeholder="Add new department..." value={newDept} onChange={(e) => setNewDept(e.target.value)} />
                  <Button className="bg-medical-blue" onClick={handleAddDept}><Plus className="w-4 h-4" /></Button>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-1">
                  {departments.map((dept) => (
                    <div key={dept} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-sm font-medium">{dept}</span>
                      {!isAccountant && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => handleDeleteDept(dept)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm border-teal-100 ring-1 ring-teal-500/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-teal-900">Hospital Wards (IPD)</CardTitle>
                  <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded-full uppercase">IPD Bed Dropdown</span>
                </div>
                <CardDescription>Add and configure IPD wards available in Bed Management.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input placeholder="e.g. ICU Ward 2, Deluxe AC..." value={newWard} onChange={(e) => setNewWard(e.target.value)} />
                  <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={handleAddWard}><Plus className="w-4 h-4" /></Button>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-1">
                  {wards.map((w) => (
                    <div key={w} className="flex items-center justify-between p-3 bg-teal-50/50 rounded-lg border border-teal-100/80">
                      <span className="text-sm font-semibold text-teal-950">{w}</span>
                      {!isAccountant && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-50" onClick={() => handleDeleteWard(w)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Specialties</CardTitle>
                <CardDescription>Define medical specialties and services.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input placeholder="Add new specialty..." value={newSpec} onChange={(e) => setNewSpec(e.target.value)} />
                  <Button className="bg-medical-blue" onClick={handleAddSpec}><Plus className="w-4 h-4" /></Button>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-1">
                  {specialties.map((spec) => (
                    <div key={spec} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-sm font-medium">{spec}</span>
                      {!isAccountant && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => handleDeleteSpec(spec)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Rates & Billing Tab */}
        <TabsContent value="rates">
          <HospitalTariffManager 
            isAccountant={isAccountant}
            gastroServices={gastroServices}
            setGastroServices={setGastroServices}
            hospitalRoomRates={hospitalRoomRates}
            setHospitalRoomRates={setHospitalRoomRates}
            cardiologyRates={cardiologyRates}
            setCardiologyRates={setCardiologyRates}
            clinicalProcedures={clinicalProcedures}
            setClinicalProcedures={setClinicalProcedures}
            hospitalBillingPolicy={hospitalBillingPolicy}
            setHospitalBillingPolicy={setHospitalBillingPolicy}
            bedRates={bedRates}
            setBedRates={setBedRates}
            otRates={otRates}
            setOtRates={setOtRates}
            labRates={labRates}
            setLabRates={setLabRates}
            materialRates={materialRates}
            setMaterialRates={setMaterialRates}
            endoRates={endoRates}
            setEndoRates={setEndoRates}
            onExportExcel={handleExportTariffExcel}
            onPrintTariff={handlePrintOfficialTariffSheet}
            onRestoreMaster={handleRestoreHospitalTariffMaster}
          />
        </TabsContent>

        {/* User Panel Tab */}
        <TabsContent value="users">
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>User Management Panel</CardTitle>
                <CardDescription>Assign IDs, passwords, and roles to hospital staff.</CardDescription>
              </div>
              <Button className="bg-medical-blue gap-2" onClick={() => {
                const element = document.getElementById('user-creation-form');
                if (element) element.scrollIntoView({ behavior: 'smooth' });
                toast.info('Fill the form below to register a new user');
              }}>
                <UserPlus className="w-4 h-4" />
                Add New User
              </Button>
            </CardHeader>
            <CardContent>
              <div id="user-creation-form" className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 bg-slate-50 p-6 rounded-xl border border-slate-100">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input placeholder="e.g. Dr. Rajesh Sharma" value={newUser.name} onChange={(e) => setNewUser({...newUser, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Email / Username</Label>
                  <Input placeholder="rajesh@hospital.com" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input 
                        type="text" 
                        placeholder={editingUserId ? "Leave empty to keep unchanged" : "Password"} 
                        value={newUser.password} 
                        onChange={(e) => setNewUser({...newUser, password: e.target.value})} 
                        disabled={isFrontOffice}
                        className={isFrontOffice ? "bg-slate-100 cursor-not-allowed pr-8 font-semibold text-slate-700" : "pr-8 font-semibold text-slate-700"}
                      />
                      <Lock className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-bold"
                      onClick={() => {
                        const randomPass = Math.random().toString(36).substring(2, 6) + Math.floor(100 + Math.random() * 900);
                        setNewUser({ ...newUser, password: randomPass });
                        toast.success(`Password generated: ${randomPass}`);
                      }}
                    >
                      Generate
                    </Button>
                  </div>
                  {newUser.password && (
                    <Button
                      type="button"
                      size="sm"
                      className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white gap-2 font-bold mt-1 text-xs"
                      onClick={() => {
                        const hName = hospitalInfo?.name || 'Hospital';
                        const message = encodeURIComponent(`Hello ${newUser.name || 'Staff'},\n\nYour ${hName} login credentials are:\nUsername/Email: ${newUser.email || '(not set)'}\nPassword: ${newUser.password}\n\nPlease keep these credentials safe.\n\nLogin URL: ${window.location.origin}`);
                        window.open(`https://api.whatsapp.com/send?text=${message}`, '_blank');
                        toast.success('Opening WhatsApp sharing link...');
                      }}
                    >
                      Share on WhatsApp
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={newUser.role} onValueChange={(v) => setNewUser({...newUser, role: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DOCTOR">DOCTOR</SelectItem>
                      <SelectItem value="NURSE">NURSE</SelectItem>
                      <SelectItem value="RECEPTION">RECEPTION</SelectItem>
                      <SelectItem value="PATHOLOGY">PATHOLOGY</SelectItem>
                      <SelectItem value="RADIOLOGY">RADIOLOGY</SelectItem>
                      <SelectItem value="ACCOUNTS">ACCOUNTS</SelectItem>
                      <SelectItem value="ADMIN">ADMIN</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={newUser.department} onValueChange={(v) => setNewUser({...newUser, department: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Registration Number</Label>
                  <Input 
                    placeholder="e.g. REG-12345" 
                    value={newUser.registrationNo} 
                    onChange={(e) => setNewUser({...newUser, registrationNo: e.target.value})} 
                  />
                </div>
                {['PATHOLOGY', 'RADIOLOGY', 'LAB_STAFF', 'PHARMACIST', 'PHARMACY'].includes(newUser.role) && (
                  <div className="space-y-2">
                    <Label className="text-emerald-800 font-bold">
                      {['PHARMACIST', 'PHARMACY'].includes(newUser.role) ? 'Pharmacy License No.' : 'Lab License No.'}
                    </Label>
                    <Input 
                      placeholder={['PHARMACIST', 'PHARMACY'].includes(newUser.role) ? "e.g. DL-PHARM-12345" : "e.g. LAB-LIC-9988"} 
                      value={newUser.labLicenseNo} 
                      onChange={(e) => setNewUser({...newUser, labLicenseNo: e.target.value})} 
                      className="border-emerald-300 bg-emerald-50/30"
                    />
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <Button className="bg-medical-blue flex-1 gap-2" onClick={handleAddUser}>
                    <ShieldCheck className="w-4 h-4" />
                    {editingUserId ? 'Update Account' : 'Create Account'}
                  </Button>
                  {editingUserId && (
                    <Button variant="outline" onClick={() => {
                      setEditingUserId(null);
                      setNewUser({ name: '', email: '', role: 'DOCTOR', department: '', password: '', registrationNo: '', labLicenseNo: '' });
                    }}>
                      Cancel
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Active User Accounts</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {users.map((user) => (
                    <div key={user.id} className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                        <img src={user.avatar} alt={user.name} />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-bold truncate">{user.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[9px] font-bold uppercase">{user.role}</Badge>
                          <span className="text-[10px] text-slate-400 font-medium truncate">{user.department}</span>
                        </div>
                        {isAdmin && (
                          <div className="mt-1.5 flex items-center gap-1.5 text-[10px]">
                            <span className="text-slate-400 font-bold uppercase">Password:</span>
                            <span className="font-mono bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded">
                              {user.password || 'hospital123'}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-medical-blue" onClick={() => {
                          setEditingUserId(user.id);
                          setNewUser({
                            name: user.name,
                            email: user.email,
                            role: user.role,
                            department: user.department || '',
                            password: isAdmin ? (user.password || '') : '' // Only pre-fill password for admin
                          });
                          const element = document.getElementById('user-creation-form');
                          if (element) element.scrollIntoView({ behavior: 'smooth' });
                          toast.info('Modifying existing user: ' + user.name);
                        }}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={async () => {
                          if (user.id === currentUser?.id) {
                            toast.error('Cannot delete yourself!');
                            return;
                          }
                          if (confirm('Are you sure you want to delete this user?')) {
                            const success = await supabaseService.deleteStaff(user.id);
                            if (success) {
                              setUsers(users.filter((u: any) => u.id !== user.id));
                              toast.success('User account removed');
                            } else {
                              toast.error('Failed to remove user account');
                            }
                          }
                        }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Document Letterhead Template</CardTitle>
              <CardDescription>Upload a background image for prescriptions, bills, and reports.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 gap-4">
                {templateImage ? (
                  <div className="relative group w-full max-w-md">
                    <img src={templateImage} alt="Template" className="w-full rounded-lg shadow-lg border border-slate-200" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg gap-2">
                      <Button variant="secondary" size="sm" onClick={() => document.getElementById('template-upload')?.click()}>
                        <Upload className="w-4 h-4 mr-2" />
                        Replace
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => setTemplateImage(null)}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto text-slate-500">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-600">No template uploaded</p>
                      <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">Upload a high-quality JPG or PNG of your hospital letterhead.</p>
                    </div>
                    <Button className="bg-medical-blue gap-2" onClick={() => document.getElementById('template-upload')?.click()}>
                      <Upload className="w-4 h-4" />
                      Upload Letterhead
                    </Button>
                  </div>
                )}
                <input 
                  type="file" 
                  id="template-upload" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleTemplateUpload} 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-blue-100 bg-blue-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Printer className="w-4 h-4 text-blue-600" />
                    <p className="text-sm font-bold text-blue-700">Usage Information</p>
                  </div>
                  <div className="text-xs text-blue-600/80 leading-relaxed">
                    This image will be used as the background/header for:
                    <ul className="list-disc list-inside mt-1 ml-1">
                      <li>OPD Prescriptions</li>
                      <li>Billing Invoices</li>
                      <li>Diagnostic Reports</li>
                      <li>Discharge Summaries</li>
                    </ul>
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-amber-100 bg-amber-50">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-amber-600" />
                    <p className="text-sm font-bold text-amber-700">Blank Prescription</p>
                  </div>
                  <p className="text-xs text-amber-600/80 mb-3">Print a blank prescription using your letterhead template.</p>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-2 border-amber-200 hover:bg-amber-100" onClick={() => {
                    const printWindow = window.open('', '_blank');
                    if (!printWindow) return;
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>Blank Prescription</title>
                          <style>
                            @page { margin: 0; }
                            body { margin: 0; padding: 0; }
                          </style>
                        </head>
                        <body onload="window.print();" onafterprint="window.close();">
                          <img src="${templateImage}" style="width: 100%; height: auto;" />
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                  }}>
                    <Printer className="w-3 h-3" />
                    Print Blank
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="prescriptions">
          {(() => {
            const selectedPatientObj = MOCK_PATIENTS.find(p => p.id === newPrescription.patientId);
            const patientPrescriptions = prescriptions.filter(pr => !newPrescription.patientId || pr.patientId === newPrescription.patientId);

            return (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Write Prescription Canvas & Forms */}
                <Card className="lg:col-span-2 border border-slate-200/80 shadow-sm overflow-hidden bg-white">
                  <CardHeader className="bg-slate-50/60 border-b border-slate-100 pb-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                          <FileText className="w-5 h-5 text-emerald-600" />
                          Write Prescription
                          {selectedPatientObj && (
                            <span className="text-emerald-700 font-semibold text-sm">
                              - {selectedPatientObj.name}
                            </span>
                          )}
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-500">
                          Create, draw findings, and print medical prescriptions.
                        </CardDescription>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-52">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Select Patient</Label>
                          <Select 
                            value={newPrescription.patientId} 
                            onValueChange={(val) => {
                              const p = MOCK_PATIENTS.find(pt => pt.id === val);
                              setNewPrescription(prev => ({
                                ...prev,
                                patientId: val,
                                allergies: p?.allergies ? (Array.isArray(p.allergies) ? p.allergies.join(', ') : p.allergies) : (p as any)?.known_allergies || prev.allergies,
                                pastHistory: p?.pastHistory || (p as any)?.medical_history || prev.pastHistory
                              }));
                            }}
                          >
                            <SelectTrigger className="h-9 text-xs bg-white border-slate-200">
                              <SelectValue placeholder="Select Patient..." />
                            </SelectTrigger>
                            <SelectContent>
                              {MOCK_PATIENTS.map(p => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name} ({p.mrn || p.id})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 space-y-6">
                    {/* Doctor & Date Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-700">Doctor</Label>
                        <Select 
                          value={newPrescription.doctorId} 
                          onValueChange={(v) => setNewPrescription(prev => ({ ...prev, doctorId: v }))}
                        >
                          <SelectTrigger className="bg-white text-xs h-10 border-slate-200">
                            <SelectValue placeholder="Select doctor" />
                          </SelectTrigger>
                          <SelectContent>
                            {users.filter(u => u.role === 'DOCTOR' || u.role === 'SUPER_ADMIN' || u.role === 'ADMIN').map(u => (
                              <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-700">Date</Label>
                        <Input 
                          type="date"
                          value={newPrescription.date} 
                          onChange={(e) => setNewPrescription(prev => ({ ...prev, date: e.target.value }))}
                          className="bg-white h-10 text-xs border-slate-200"
                        />
                      </div>
                    </div>

                    {/* Prescription Templates Section */}
                    <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-emerald-700" />
                          <div>
                            <span className="font-extrabold text-xs uppercase tracking-wider text-emerald-900 block">
                              PRESCRIPTION TEMPLATES
                            </span>
                            <span className="text-[10px] text-emerald-700 block">
                              Quick-load pre-filled clinical profiles & formulas
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100/60"
                            onClick={() => {
                              toast.info(`Managing ${prescriptionTemplates.length} saved prescription templates.`);
                            }}
                          >
                            Manage ({prescriptionTemplates.length})
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-xs gap-1 border-emerald-300 text-emerald-800 hover:bg-emerald-100 bg-white shadow-2xs"
                            onClick={handleSaveCurrentAsTemplate}
                          >
                            <Save className="w-3 h-3" />
                            Save Current
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        <Select value={selectedTemplateId} onValueChange={handleApplyTemplate}>
                          <SelectTrigger className="bg-white border-emerald-200 text-xs h-9">
                            <SelectValue placeholder="-- Select Prescription Template --" />
                          </SelectTrigger>
                          <SelectContent>
                            {prescriptionTemplates.map((tmpl: any) => (
                              <SelectItem key={tmpl.id} value={tmpl.id}>
                                {tmpl.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Medicines Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <Label className="text-sm font-extrabold text-slate-800">Medicines</Label>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          className="h-8 text-xs gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50 bg-white" 
                          onClick={handleAddMedicine}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Medicine
                        </Button>
                      </div>

                      <div className="space-y-2 bg-slate-50/70 p-3 rounded-xl border border-slate-200/60">
                        <div className="grid grid-cols-12 gap-2 px-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <div className="col-span-5">MEDICINE NAME</div>
                          <div className="col-span-2">DOSAGE</div>
                          <div className="col-span-2">FREQUENCY</div>
                          <div className="col-span-2">DURATION</div>
                          <div className="col-span-1 text-center">ACTION</div>
                        </div>

                        {newPrescription.medicines.map((med, idx) => (
                          <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg border border-slate-200/80 shadow-2xs">
                            <div className="col-span-5">
                              <Input 
                                placeholder="e.g. Paracetamol" 
                                value={med.name} 
                                onChange={(e) => {
                                  const meds = [...newPrescription.medicines];
                                  meds[idx].name = e.target.value;
                                  setNewPrescription(prev => ({ ...prev, medicines: meds }));
                                }} 
                                className="h-9 text-xs bg-white"
                              />
                            </div>
                            <div className="col-span-2">
                              <Input 
                                placeholder="500mg" 
                                value={med.dosage} 
                                onChange={(e) => {
                                  const meds = [...newPrescription.medicines];
                                  meds[idx].dosage = e.target.value;
                                  setNewPrescription(prev => ({ ...prev, medicines: meds }));
                                }} 
                                className="h-9 text-xs bg-white"
                              />
                            </div>
                            <div className="col-span-2">
                              <Input 
                                placeholder="1-0-1" 
                                value={med.frequency} 
                                onChange={(e) => {
                                  const meds = [...newPrescription.medicines];
                                  meds[idx].frequency = e.target.value;
                                  setNewPrescription(prev => ({ ...prev, medicines: meds }));
                                }} 
                                className="h-9 text-xs bg-white"
                              />
                            </div>
                            <div className="col-span-2">
                              <Input 
                                placeholder="5 days" 
                                value={med.duration} 
                                onChange={(e) => {
                                  const meds = [...newPrescription.medicines];
                                  meds[idx].duration = e.target.value;
                                  setNewPrescription(prev => ({ ...prev, medicines: meds }));
                                }} 
                                className="h-9 text-xs bg-white"
                              />
                            </div>
                            <div className="col-span-1 flex justify-center">
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50" 
                                onClick={() => {
                                  const meds = newPrescription.medicines.filter((_, i) => i !== idx);
                                  setNewPrescription(prev => ({ ...prev, medicines: meds.length ? meds : [{ name: '', dosage: '', frequency: '', duration: '' }] }));
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Clinical Details & Physical Exam */}
                    <div className="space-y-3 pt-2">
                      <div className="border-b border-slate-100 pb-1.5">
                        <span className="font-extrabold text-xs uppercase tracking-wider text-slate-700">
                          CLINICAL DETAILS & PHYSICAL EXAM
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-amber-800 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                            Allergies & Drug Sensitivities
                          </Label>
                          <textarea 
                            placeholder="e.g. Penicillin, Sulfa drugs, No known drug allergies (NKDA)..." 
                            value={newPrescription.allergies}
                            onChange={(e) => setNewPrescription(prev => ({ ...prev, allergies: e.target.value }))}
                            rows={2}
                            className="flex w-full rounded-md border border-amber-300 bg-amber-50/20 px-3 py-1.5 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 min-h-[42px] resize-y"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold text-slate-700">
                              Past Medical History / Previous Treatments
                            </Label>
                            <span className="text-[10px] text-teal-700 font-semibold">Tickbox Common Diseases:</span>
                          </div>

                          {/* Common Disease Tickboxes */}
                          <div className="flex flex-wrap gap-1.5 p-2 bg-slate-100/80 rounded-lg border border-slate-200 mb-1">
                            {COMMON_DISEASES.map(disease => {
                              const isChecked = isDiseaseInHistory(newPrescription.pastHistory || '', disease.label, disease.keyword);
                              return (
                                <label
                                  key={disease.id}
                                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-semibold cursor-pointer border transition-all select-none ${
                                    isChecked 
                                      ? 'bg-teal-700 text-white border-teal-800 shadow-xs' 
                                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      const updated = toggleDiseaseInHistory(newPrescription.pastHistory || '', disease.label, disease.keyword);
                                      setNewPrescription(prev => ({ ...prev, pastHistory: updated }));
                                    }}
                                    className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 accent-teal-600 cursor-pointer"
                                  />
                                  <span>{disease.label}</span>
                                </label>
                              );
                            })}
                          </div>

                          <textarea 
                            placeholder="e.g. Known hypertensive for 5 years, Type-2 DM..." 
                            value={newPrescription.pastHistory}
                            onChange={(e) => setNewPrescription(prev => ({ ...prev, pastHistory: e.target.value }))}
                            rows={2}
                            className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 min-h-[42px] resize-y"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-700">
                            Diagnosis / Clinical Impression
                          </Label>
                          <Input 
                            placeholder="e.g. GERD, Acute Gastroenteritis..." 
                            value={newPrescription.diagnosis}
                            onChange={(e) => setNewPrescription(prev => ({ ...prev, diagnosis: e.target.value }))}
                            className="bg-white text-xs h-9"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-700">
                            Advice / General Remarks
                          </Label>
                          <textarea 
                            placeholder="e.g. Avoid spicy food, walk after meals..." 
                            value={newPrescription.advice}
                            onChange={(e) => setNewPrescription(prev => ({ ...prev, advice: e.target.value }))}
                            rows={2}
                            className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 min-h-[42px] resize-y"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Clinical Sketchpad / Diagram Canvas */}
                    <div className="space-y-2 bg-slate-50 border border-slate-200/80 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <Label className="text-xs font-bold text-slate-700">Clinical Sketchpad / Diagram</Label>
                          <span className="text-[10px] text-slate-500">Draw simple lines or add pre-defined clinical shapes</span>
                        </div>

                        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
                          <Button 
                            type="button"
                            variant={drawMode === 'pen' ? 'default' : 'ghost'} 
                            size="sm" 
                            onClick={() => setDrawMode('pen')}
                            className="h-7 px-2.5 text-xs gap-1"
                          >
                            <Paintbrush className="w-3.5 h-3.5" />
                            Pen
                          </Button>
                          <Button 
                            type="button"
                            variant={drawMode === 'eraser' ? 'default' : 'ghost'} 
                            size="sm" 
                            onClick={() => setDrawMode('eraser')}
                            className="h-7 px-2.5 text-xs gap-1"
                          >
                            <Eraser className="w-3.5 h-3.5" />
                            Eraser
                          </Button>
                          <Button 
                            type="button"
                            variant="ghost" 
                            size="icon" 
                            onClick={clearCanvas}
                            className="h-7 w-7 text-rose-500"
                            title="Clear Sketchpad"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 items-center justify-between py-1 border-b border-slate-200/60 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 font-semibold">Pen Color:</span>
                          <div className="flex items-center gap-1.5">
                            {['#1d4ed8', '#dc2626', '#059669', '#000000'].map(color => (
                              <button
                                key={color}
                                type="button"
                                onClick={() => {
                                  setPenColor(color);
                                  setDrawMode('pen');
                                }}
                                className={`w-4 h-4 rounded-full border transition ${penColor === color && drawMode === 'pen' ? 'ring-2 ring-offset-1 ring-slate-400 border-transparent scale-110' : 'border-slate-300'}`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 font-semibold">Width:</span>
                          <input
                            type="range"
                            min="1"
                            max="10"
                            value={lineWidth}
                            onChange={(e) => setLineWidth(Number(e.target.value))}
                            className="w-16 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-700"
                          />
                          <span className="text-[10px] font-mono text-slate-600">{lineWidth}px</span>
                        </div>
                      </div>

                      {/* Anatomical Base Templates & Pre-added Shapes Toolbar */}
                      <div className="space-y-2 mb-2">
                        {/* 1. Anatomical Base Diagrams (Loads full anatomical template onto canvas) */}
                        <div className="flex flex-wrap items-center gap-1.5 py-1.5 bg-slate-900 text-white rounded-lg px-2 border border-slate-800 shadow-xs">
                          <span className="text-[10px] text-emerald-400 font-extrabold mr-1 uppercase flex items-center gap-1">
                            <Stethoscope className="w-3 h-3 text-emerald-400" />
                            Anatomical Templates:
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => drawPreaddedShapeOnCanvas(canvasRef.current, 'anorectal_fistula', penColor, lineWidth, (url) => setNewPrescription(p => ({ ...p, drawing: url })))}
                            className="h-6 px-2.5 text-[11px] font-extrabold gap-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-200 border-emerald-700/60 shadow-2xs"
                            title="Load Anorectal, Anal Canal & Fistula Anatomy Diagram (Matching Screenshot 1)"
                          >
                            <Activity className="w-3 h-3 text-emerald-400" />
                            Anorectal & Fistula Diagram
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => drawPreaddedShapeOnCanvas(canvasRef.current, 'stomach_gastro', penColor, lineWidth, (url) => setNewPrescription(p => ({ ...p, drawing: url })))}
                            className="h-6 px-2 text-[11px] font-bold gap-1 bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700"
                            title="Load Stomach & Duodenum Diagram"
                          >
                            <Microscope className="w-3 h-3 text-sky-400" />
                            Stomach / Gastro
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => drawPreaddedShapeOnCanvas(canvasRef.current, 'colon_rectum', penColor, lineWidth, (url) => setNewPrescription(p => ({ ...p, drawing: url })))}
                            className="h-6 px-2 text-[11px] font-bold gap-1 bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700"
                            title="Load Colon & Rectum Diagram"
                          >
                            <Layers className="w-3 h-3 text-amber-400" />
                            Colon & Rectum
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => drawPreaddedShapeOnCanvas(canvasRef.current, 'abdominal_grid', penColor, lineWidth, (url) => setNewPrescription(p => ({ ...p, drawing: url })))}
                            className="h-6 px-2 text-[11px] font-bold gap-1 bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700"
                            title="Load 9 Abdominal Quadrants Grid"
                          >
                            <Square className="w-3 h-3 text-indigo-400" />
                            Abdomen Grid (9 Quadrants)
                          </Button>
                        </div>

                        {/* 2. Clinical Stamps & Standard Shapes */}
                        <div className="flex flex-wrap items-center gap-1.5 py-1.5 bg-slate-100/70 rounded-lg px-2 border border-slate-200">
                          <span className="text-[10px] text-slate-600 font-bold mr-1 uppercase">Clinical Stamps:</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => drawPreaddedShapeOnCanvas(canvasRef.current, 'fistula_tract', penColor, lineWidth, (url) => setNewPrescription(p => ({ ...p, drawing: url })))}
                            className="h-6 px-2 text-[11px] font-bold gap-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200 shadow-2xs"
                            title="Stamp Fistula Tract Path"
                          >
                            <Zap className="w-3 h-3 text-rose-600" />
                            Fistula Tract
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => drawPreaddedShapeOnCanvas(canvasRef.current, 'hemorrhoid', penColor, lineWidth, (url) => setNewPrescription(p => ({ ...p, drawing: url })))}
                            className="h-6 px-2 text-[11px] font-bold gap-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200 shadow-2xs"
                            title="Stamp Hemorrhoidal Cushion / Mass"
                          >
                            <CircleIcon className="w-3 h-3 text-amber-600" />
                            Hemorrhoid Mass
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => drawPreaddedShapeOnCanvas(canvasRef.current, 'dentate_line', penColor, lineWidth, (url) => setNewPrescription(p => ({ ...p, drawing: url })))}
                            className="h-6 px-2 text-[11px] font-bold gap-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-200 shadow-2xs"
                            title="Stamp Dentate Line"
                          >
                            <Minus className="w-3 h-3 text-purple-600" />
                            Dentate Line
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => drawPreaddedShapeOnCanvas(canvasRef.current, 'sphincter_ring', penColor, lineWidth, (url) => setNewPrescription(p => ({ ...p, drawing: url })))}
                            className="h-6 px-2 text-[11px] font-bold gap-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-200 shadow-2xs"
                            title="Stamp Sphincter Ring Contour"
                          >
                            <CircleIcon className="w-3 h-3 text-blue-600" />
                            Sphincter Ring
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => drawPreaddedShapeOnCanvas(canvasRef.current, 'ulcer_mark', penColor, lineWidth, (url) => setNewPrescription(p => ({ ...p, drawing: url })))}
                            className="h-6 px-2 text-[11px] font-bold gap-1 bg-orange-50 hover:bg-orange-100 text-orange-800 border-orange-200 shadow-2xs"
                            title="Stamp Ulcer / Erosion Mark"
                          >
                            <AlertCircle className="w-3 h-3 text-orange-600" />
                            Ulcer Mark
                          </Button>

                          <span className="text-[10px] text-slate-400 font-bold mx-1">|</span>
                          <span className="text-[10px] text-slate-600 font-bold mr-1 uppercase">Shapes:</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => drawPreaddedShapeOnCanvas(canvasRef.current, 'hexagram', penColor, lineWidth, (url) => setNewPrescription(p => ({ ...p, drawing: url })))}
                            className="h-6 px-2 text-[11px] gap-1 bg-white hover:bg-slate-100 border-slate-300 shadow-2xs"
                            title="Draw Hexagram (6-pointed Star)"
                          >
                            <Hexagon className="w-3 h-3 text-amber-600" />
                            Hexagram
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => drawPreaddedShapeOnCanvas(canvasRef.current, 'rectangle', penColor, lineWidth, (url) => setNewPrescription(p => ({ ...p, drawing: url })))}
                            className="h-6 px-2 text-[11px] gap-1 bg-white hover:bg-slate-100 border-slate-300 shadow-2xs"
                            title="Draw Rectangle"
                          >
                            <Square className="w-3 h-3 text-blue-600" />
                            Rectangle
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => drawPreaddedShapeOnCanvas(canvasRef.current, 'circle', penColor, lineWidth, (url) => setNewPrescription(p => ({ ...p, drawing: url })))}
                            className="h-6 px-2 text-[11px] gap-1 bg-white hover:bg-slate-100 border-slate-300 shadow-2xs"
                            title="Draw Circle"
                          >
                            <CircleIcon className="w-3 h-3 text-emerald-600" />
                            Circle
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => drawPreaddedShapeOnCanvas(canvasRef.current, 'triangle', penColor, lineWidth, (url) => setNewPrescription(p => ({ ...p, drawing: url })))}
                            className="h-6 px-2 text-[11px] gap-1 bg-white hover:bg-slate-100 border-slate-300 shadow-2xs"
                            title="Draw Triangle"
                          >
                            <Triangle className="w-3 h-3 text-purple-600" />
                            Triangle
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => drawPreaddedShapeOnCanvas(canvasRef.current, 'arrow', penColor, lineWidth, (url) => setNewPrescription(p => ({ ...p, drawing: url })))}
                            className="h-6 px-2 text-[11px] gap-1 bg-white hover:bg-slate-100 border-slate-300 shadow-2xs"
                            title="Draw Arrow"
                          >
                            <MoveRight className="w-3 h-3 text-indigo-600" />
                            Arrow
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => drawPreaddedShapeOnCanvas(canvasRef.current, 'line', penColor, lineWidth, (url) => setNewPrescription(p => ({ ...p, drawing: url })))}
                            className="h-6 px-2 text-[11px] gap-1 bg-white hover:bg-slate-100 border-slate-300 shadow-2xs"
                            title="Draw Line"
                          >
                            <Minus className="w-3 h-3 text-slate-600" />
                            Line
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => drawPreaddedShapeOnCanvas(canvasRef.current, 'cross', penColor, lineWidth, (url) => setNewPrescription(p => ({ ...p, drawing: url })))}
                            className="h-6 px-2 text-[11px] gap-1 bg-white hover:bg-slate-100 border-slate-300 shadow-2xs"
                            title="Draw Cross / Plus"
                          >
                            <Plus className="w-3 h-3 text-rose-600" />
                            Cross
                          </Button>
                        </div>
                      </div>

                      <div className="relative border-2 border-dashed border-slate-300 rounded-lg overflow-hidden bg-white shadow-inner flex justify-center">
                        <canvas
                          ref={canvasRef}
                          width={600}
                          height={200}
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                          className="w-full max-w-full h-[200px] bg-transparent block touch-none cursor-crosshair"
                        />
                      </div>
                    </div>

                    {/* Patient Vitals / Measurements Section */}
                    <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 space-y-3">
                      <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5 mb-1">
                        <span className="font-extrabold text-xs uppercase text-slate-700 tracking-wider">
                          PATIENT VITALS / MEASUREMENTS
                        </span>
                        <Badge variant="outline" className="text-[9px] text-emerald-600 bg-emerald-50 border-emerald-200 font-bold uppercase py-0 px-1.5 h-4">
                          VITALS OPTION
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-slate-500 uppercase font-semibold">BP (MMHG)</Label>
                          <Input 
                            placeholder="120/80" 
                            value={newPrescription.vitals.bp} 
                            onChange={(e) => setNewPrescription(prev => ({
                              ...prev,
                              vitals: { ...prev.vitals, bp: e.target.value }
                            }))}
                            className="h-9 bg-white text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-slate-500 uppercase font-semibold">PULSE (/MIN)</Label>
                          <Input 
                            placeholder="72" 
                            value={newPrescription.vitals.pulse} 
                            onChange={(e) => setNewPrescription(prev => ({
                              ...prev,
                              vitals: { ...prev.vitals, pulse: e.target.value }
                            }))}
                            className="h-9 bg-white text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-slate-500 uppercase font-semibold">TEMP (°F)</Label>
                          <Input 
                            placeholder="98.6" 
                            value={newPrescription.vitals.temp} 
                            onChange={(e) => setNewPrescription(prev => ({
                              ...prev,
                              vitals: { ...prev.vitals, temp: e.target.value }
                            }))}
                            className="h-9 bg-white text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-slate-500 uppercase font-semibold">RESP RATE (/MIN)</Label>
                          <Input 
                            placeholder="18" 
                            value={newPrescription.vitals.rr} 
                            onChange={(e) => setNewPrescription(prev => ({
                              ...prev,
                              vitals: { ...prev.vitals, rr: e.target.value }
                            }))}
                            className="h-9 bg-white text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-slate-500 uppercase font-semibold">WEIGHT (KG)</Label>
                          <Input 
                            placeholder="65" 
                            value={newPrescription.vitals.weight} 
                            onChange={(e) => {
                              const newWeight = e.target.value;
                              const newHeight = newPrescription.vitals.height || '';
                              const bmiStr = calculateBMI(newWeight, newHeight);
                              setNewPrescription(prev => ({
                                ...prev,
                                vitals: { ...prev.vitals, weight: newWeight, bmi: bmiStr }
                              }));
                            }}
                            className="h-9 bg-white text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-slate-500 uppercase font-semibold">HEIGHT (CM)</Label>
                          <Input 
                            placeholder="170" 
                            value={newPrescription.vitals.height || ''} 
                            onChange={(e) => {
                              const newHeight = e.target.value;
                              const newWeight = newPrescription.vitals.weight || '';
                              const bmiStr = calculateBMI(newWeight, newHeight);
                              setNewPrescription(prev => ({
                                ...prev,
                                vitals: { ...prev.vitals, height: newHeight, bmi: bmiStr }
                              }));
                            }}
                            className="h-9 bg-white text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-teal-700 uppercase font-bold flex items-center justify-between">
                            <span>BMI</span>
                            <span className="text-[8px] bg-teal-100 text-teal-800 px-1 rounded">AUTO</span>
                          </Label>
                          <Input 
                            readOnly
                            placeholder="Auto" 
                            value={newPrescription.vitals.bmi || ''} 
                            className="h-9 bg-teal-50/60 font-bold text-teal-900 text-xs cursor-not-allowed border-teal-200"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Form Actions */}
                    <div className="flex justify-end gap-3 pt-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          clearCanvas();
                          setNewPrescription({
                            patientId: MOCK_PATIENTS[0]?.id || '',
                            doctorId: currentUser?.id || users[0]?.id || '',
                            date: new Date().toISOString().split('T')[0],
                            diagnosis: '',
                            allergies: '',
                            pastHistory: '',
                            advice: '',
                            notes: '',
                            medicines: [{ name: '', dosage: '', frequency: '', duration: '' }],
                            vitals: { bp: '', pulse: '', temp: '', spo2: '', weight: '', rr: '', cbs: '', rs: '', cns: '' },
                            drawing: ''
                          });
                          setSelectedTemplateId('');
                        }}
                      >
                        Reset
                      </Button>
                      <Button className="bg-medical-blue gap-2" onClick={handleSavePrescription}>
                        <Printer className="w-4 h-4" />
                        Save & Print Prescription
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Right Column: Clinical History & Patient Details */}
                <div className="space-y-4">
                  <Card className="border border-slate-200/80 shadow-sm bg-white overflow-hidden">
                    <CardHeader className="bg-slate-50/60 border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-emerald-600" />
                        <CardTitle className="text-sm font-bold text-slate-800">CLINICAL HISTORY</CardTitle>
                      </div>
                      <Button variant="outline" size="sm" className="h-6 text-[10px] font-bold text-amber-700 bg-amber-50 border-amber-200">
                        PAST HISTORY LOG
                      </Button>
                    </CardHeader>

                    <CardContent className="p-4 space-y-4">
                      {/* Selected Patient Info Card */}
                      {selectedPatientObj ? (
                        <div className="bg-amber-50/30 border border-amber-200/60 rounded-xl p-3 flex items-center gap-3">
                          <Avatar className="h-10 w-10 border border-amber-300">
                            <AvatarFallback className="bg-amber-100 text-amber-800 font-bold text-sm">
                              {selectedPatientObj.name?.charAt(0) || 'P'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-sm text-slate-900 truncate">
                                {selectedPatientObj.name}
                              </span>
                              <Badge variant="outline" className="text-[9px] bg-slate-100 text-slate-600 font-mono py-0 px-1">
                                {selectedPatientObj.mrn || selectedPatientObj.id}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {selectedPatientObj.age ? `${selectedPatientObj.age}Y` : ''} 
                              {selectedPatientObj.gender ? ` • ${selectedPatientObj.gender.toUpperCase()}` : ''} 
                              {selectedPatientObj.bloodGroup ? ` • BLOOD: ${selectedPatientObj.bloodGroup}` : ' • BLOOD: N/A'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-3 text-center">
                          <p className="text-xs text-slate-500 font-medium">Select a patient above to view history</p>
                        </div>
                      )}

                      {/* Sidebar Tabs */}
                      <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-lg text-xs">
                        <button className="flex-1 py-1 px-2 rounded-md bg-white font-bold text-slate-800 shadow-2xs text-[11px]">
                          Rx ({patientPrescriptions.length})
                        </button>
                        <button className="flex-1 py-1 px-2 rounded-md font-semibold text-slate-500 hover:text-slate-700 text-[11px]">
                          Vitals ({selectedPatientObj?.vitals ? 1 : 0})
                        </button>
                        <button className="flex-1 py-1 px-2 rounded-md font-semibold text-slate-500 hover:text-slate-700 text-[11px]">
                          Notes (0)
                        </button>
                        <button className="flex-1 py-1 px-2 rounded-md font-semibold text-slate-500 hover:text-slate-700 text-[11px]">
                          Lab (0)
                        </button>
                      </div>

                      {/* Past Prescriptions List */}
                      <ScrollArea className="h-[460px]">
                        <div className="space-y-3 pr-1">
                          {patientPrescriptions.length > 0 ? (
                            patientPrescriptions.map((pres) => {
                              const doc = users.find(u => u.id === pres.doctorId);
                              return (
                                <div key={pres.id} className="p-3 bg-white border border-slate-200/80 rounded-xl shadow-2xs hover:border-emerald-300 transition-all flex items-center justify-between gap-2">
                                  <div>
                                    <p className="text-xs font-bold text-slate-800">
                                      {pres.date || 'Recent'}
                                    </p>
                                    <p className="text-[11px] font-semibold text-slate-600 mt-0.5">
                                      {doc?.name || 'Dr. Anirudh Tiwari'}
                                    </p>
                                    {pres.diagnosis && (
                                      <p className="text-[10px] text-slate-500 truncate max-w-[180px] mt-1">
                                        Dx: {pres.diagnosis}
                                      </p>
                                    )}
                                  </div>
                                  <Button 
                                    size="icon" 
                                    variant="outline" 
                                    className="h-8 w-8 text-emerald-700 border-emerald-200 hover:bg-emerald-50 shrink-0" 
                                    onClick={() => printPrescription(pres)}
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              );
                            })
                          ) : (
                            <div className="py-8 text-center text-slate-400 text-xs">
                              No prior prescriptions found for this selection.
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              </div>
            );
          })()}
        </TabsContent>

        {currentUser?.role === 'SUPER_ADMIN' && (
          <TabsContent value="audit">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>System Audit Logs</CardTitle>
                    <CardDescription>Review all major billing updates and deletions for accountability.</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => {
                    setAuditLogs([]);
                    storage.set(STORAGE_KEYS.AUDIT_LOGS, []);
                    toast.success('Audit logs cleared successfully');
                  }}>
                    Clear Logs
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-4">
                    {(() => {
                      const logs = auditLogs;
                      if (logs.length === 0) {
                        return (
                          <div className="text-center py-12 text-slate-400">
                            <Activity className="w-12 h-12 mx-auto mb-2 opacity-20" />
                            <p className="text-sm font-medium">No activity logs found</p>
                          </div>
                        );
                      }
                      return logs.map((log: any) => (
                        <div key={log.id} className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                log.action === 'DELETE' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                              }`}>
                                {log.action === 'DELETE' ? <Trash2 className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                              </div>
                              <div>
                                <p className="text-sm font-bold flex items-center gap-2">
                                  {log.userName}
                                  <Badge variant="secondary" className="text-[8px] h-4 uppercase">{log.userRole}</Badge>
                                </p>
                                <p className="text-[10px] text-slate-500 font-medium">
                                  {new Date(log.timestamp).toLocaleString()} • {log.action} Action
                                </p>
                              </div>
                            </div>
                            <Badge className={log.action === 'DELETE' ? 'bg-rose-500' : 'bg-amber-500'}>
                              {log.action}
                            </Badge>
                          </div>
                          <div className="text-xs bg-slate-50 p-3 rounded-lg border border-slate-100 overflow-hidden">
                            <p className="font-bold text-slate-700 mb-1">Target ID: {log.entityId}</p>
                            {log.action === 'DELETE' && (
                              <p className="text-slate-500">
                                Deleted bill details: ₹{log.details.bill?.totalAmount} for {MOCK_PATIENTS.find(p => p.id === log.details.bill?.patientId)?.name || 'Unknown Patient'}
                              </p>
                            )}
                            {log.action === 'UPDATE' && (
                              <div className="space-y-1">
                                <p className="text-slate-500 font-medium">Change Summary:</p>
                                <div className="grid grid-cols-2 gap-4 mt-2">
                                  <div className="p-2 bg-slate-100 rounded border border-slate-200">
                                    <p className="font-bold text-[10px] uppercase text-slate-400">Before</p>
                                    <p className="text-[11px] font-bold">₹{log.details.before?.totalAmount}</p>
                                    <p className="text-[10px] text-slate-500">{log.details.before?.items?.length} Items</p>
                                  </div>
                                  <div className="p-2 bg-blue-50 rounded border border-blue-100">
                                    <p className="font-bold text-[10px] uppercase text-blue-400">After</p>
                                    <p className="text-[11px] font-bold text-blue-700">₹{log.details.after?.totalAmount}</p>
                                    <p className="text-[10px] text-blue-500">{log.details.after?.items?.length} Items</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        )}
        <TabsContent value="tax_slabs">
          <Card className="border-none shadow-sm animate-fade-in">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl text-slate-800 font-bold">
                    <Percent className="w-5 h-5 text-emerald-500" />
                    Tax Slabs & GST Configuration
                  </CardTitle>
                  <CardDescription>
                    Configure Goods & Services Tax (GST) slabs, active percentage brackets, and tax breakdowns applied to pharmacy billing and hospital service fees.
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleResetSlabsToDefault}
                  className="text-xs bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                >
                  Restore Standard GST Slabs
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add / Edit Form */}
              <div className="bg-slate-50/50 border border-slate-100 p-5 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  {editingSlab ? (
                    <>
                      <Edit className="w-4 h-4 text-amber-500" />
                      Edit Tax Slab: <span className="text-amber-700">{editingSlab.name}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 text-emerald-500" />
                      Create New Tax / GST Slab
                    </>
                  )}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Slab Name *</Label>
                    <Input 
                      placeholder="e.g. GST 18% Standard" 
                      value={editingSlab ? editingSlab.name : newSlab.name}
                      onChange={(e) => {
                        if (editingSlab) {
                          setEditingSlab({ ...editingSlab, name: e.target.value });
                        } else {
                          setNewSlab({ ...newSlab, name: e.target.value });
                        }
                      }}
                      className="bg-white border-slate-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Tax Rate % *</Label>
                    <Input 
                      type="number"
                      step="0.01"
                      placeholder="e.g. 18" 
                      value={editingSlab ? editingSlab.rate : newSlab.rate}
                      onChange={(e) => {
                        if (editingSlab) {
                          setEditingSlab({ ...editingSlab, rate: e.target.value });
                        } else {
                          setNewSlab({ ...newSlab, rate: e.target.value });
                        }
                      }}
                      className="bg-white border-slate-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Tax Type</Label>
                    <Select
                      value={editingSlab ? editingSlab.type : newSlab.type}
                      onValueChange={(val) => {
                        if (editingSlab) {
                          setEditingSlab({ ...editingSlab, type: val });
                        } else {
                          setNewSlab({ ...newSlab, type: val });
                        }
                      }}
                    >
                      <SelectTrigger className="bg-white border-slate-200">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GST">GST</SelectItem>
                        <SelectItem value="CGST_SGST">CGST + SGST</SelectItem>
                        <SelectItem value="VAT">VAT</SelectItem>
                        <SelectItem value="Exempt">Exempt</SelectItem>
                        <SelectItem value="Custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Slab Details / Application</Label>
                    <Input 
                      placeholder="e.g. For medical hardware" 
                      value={editingSlab ? editingSlab.description : newSlab.description}
                      onChange={(e) => {
                        if (editingSlab) {
                          setEditingSlab({ ...editingSlab, description: e.target.value });
                        } else {
                          setNewSlab({ ...newSlab, description: e.target.value });
                        }
                      }}
                      className="bg-white border-slate-200"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="slab-active-toggle" 
                      checked={editingSlab ? editingSlab.isActive : newSlab.isActive}
                      onChange={(e) => {
                        if (editingSlab) {
                          setEditingSlab({ ...editingSlab, isActive: e.target.checked });
                        } else {
                          setNewSlab({ ...newSlab, isActive: e.target.checked });
                        }
                      }}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    />
                    <Label htmlFor="slab-active-toggle" className="text-xs font-semibold text-slate-600 cursor-pointer">
                      Mark as active slab (Enabled for live pharmacy and rate listings)
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    {editingSlab ? (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-9 font-medium text-xs border-slate-200"
                          onClick={() => setEditingSlab(null)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          size="sm" 
                          className="h-9 font-medium text-xs bg-amber-600 hover:bg-amber-700 text-white"
                          onClick={handleUpdateSlab}
                        >
                          Save Changes
                        </Button>
                      </>
                    ) : (
                      <Button 
                        size="sm" 
                        className="h-9 font-medium text-xs bg-slate-800 hover:bg-slate-900 text-white flex items-center gap-1.5"
                        onClick={handleAddSlab}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Slab
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Slabs List Table */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-black tracking-wider text-slate-500 uppercase">
                        <th className="py-3.5 px-4 font-black">Slab Name</th>
                        <th className="py-3.5 px-4 font-black">Type</th>
                        <th className="py-3.5 px-4 font-black text-center">Tax Rate (%)</th>
                        <th className="py-3.5 px-4 font-black">Description</th>
                        <th className="py-3.5 px-4 font-black text-center">Status</th>
                        <th className="py-3.5 px-4 font-black text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {taxSlabs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                            No tax slabs configured. Click "Restore Standard GST Slabs" to reload defaults.
                          </td>
                        </tr>
                      ) : (
                        taxSlabs.map((slab) => (
                          <tr key={slab.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-slate-800">{slab.name}</span>
                            </td>
                            <td className="py-3.5 px-4">
                              <Badge className="bg-slate-100 hover:bg-slate-100 text-slate-700 border-none font-bold text-[10px] py-0.5 uppercase">
                                {slab.type || 'GST'}
                              </Badge>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className="font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[11px]">
                                {slab.rate}%
                              </span>
                            </td>
                            <td className="py-3.5 px-4 max-w-[240px] truncate">
                              <span className="text-slate-500 font-medium">{slab.description || 'No specialized application notes.'}</span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button 
                                onClick={() => handleToggleSlabStatus(slab.id)}
                                className={`inline-flex items-center justify-center font-bold text-[10px] tracking-wide uppercase px-2 py-0.5 rounded cursor-pointer transition-all ${
                                  slab.isActive 
                                    ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" 
                                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                }`}
                              >
                                {slab.isActive ? 'Active' : 'Inactive'}
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => setEditingSlab({ ...slab, rate: String(slab.rate) })}
                                  className="h-8 w-8 text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => handleDeleteSlab(slab.id)}
                                  className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Category Default GST Mapping */}
              <div className="bg-slate-50/70 border border-slate-100 p-5 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-500" />
                      Pharmacy Category Default GST Mapping (Auto-Fetch Rules)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      When adding or editing medicine stock in Pharmacy, the GST rate will be automatically selected based on these category rules.
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold text-slate-600 bg-white border-slate-200">
                    Live Auto-Fetch Enabled
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-1">
                  {[
                    { key: 'Medicine', label: 'Medicines & Pharmaceuticals', desc: 'Standard formulations, tablets, syrups (Standard 12% / 5% life-saving)' },
                    { key: 'Surgical', label: 'Surgical & Disposables', desc: 'Surgical consumables, sutures, syringes, gloves (12%)' },
                    { key: 'Consumable', label: 'Hospital Consumables', desc: 'Sanitizers, cotton, bandages, hygiene items (18%)' },
                    { key: 'Diagnostic', label: 'Diagnostic Kits & Reagents', desc: 'Blood sugar test strips, reagents, test kits (12%)' },
                    { key: 'Equipment', label: 'Medical Hardware & Machinery', desc: 'BP monitors, nebulizers, digital devices (18%)' },
                    { key: 'Cosmetic', label: 'Aesthetic & Derma Cosmetics', desc: 'Aesthetic creams, luxury skin therapies (28%)' },
                    { key: 'Exempt', label: 'Zero-Rated / Life-Saving Exempt', desc: 'Govt. exempt life-saving medicines & public kits (0%)' }
                  ].map((cat) => (
                    <div key={cat.key} className="p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-xs flex flex-col justify-between space-y-2">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800">{cat.label}</span>
                          <span className="text-[11px] font-black text-medical-blue bg-blue-50 px-2 py-0.5 rounded-full">
                            GST {categoryTaxMapping[cat.key] ?? 12}%
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 leading-snug">{cat.desc}</p>
                      </div>

                      <div className="pt-1">
                        <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Applicable GST Slab</Label>
                        <Select
                          value={String(categoryTaxMapping[cat.key] ?? 12)}
                          onValueChange={(val) => handleUpdateCategoryGst(cat.key, parseFloat(val) || 0)}
                        >
                          <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200 font-semibold mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {taxSlabs.filter(s => s.isActive).map(s => (
                              <SelectItem key={s.id} value={String(s.rate)}>
                                {s.name} ({s.rate}%)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hospital GST & Invoicing Policy */}
              <div className="bg-slate-50/70 border border-slate-100 p-5 rounded-2xl space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-emerald-600" />
                    Hospital GSTIN & Tax Invoicing Policy
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure official GSTIN number, CGST/SGST 50-50 intra-state tax split, and clinical fee exemptions.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Hospital GSTIN Registration Number</Label>
                    <Input 
                      placeholder="e.g. 07AAAAA0000A1Z5"
                      value={hospitalTaxSettings.hospitalGstin}
                      onChange={(e) => setHospitalTaxSettings({ ...hospitalTaxSettings, hospitalGstin: e.target.value.toUpperCase() })}
                      className="bg-white border-slate-200 uppercase font-mono font-bold text-xs"
                    />
                  </div>

                  <div className="space-y-1.5 flex flex-col justify-center">
                    <div className="flex items-center gap-2 pt-2">
                      <input 
                        type="checkbox"
                        id="split-cgst-sgst"
                        checked={hospitalTaxSettings.splitCgstSgst}
                        onChange={(e) => setHospitalTaxSettings({ ...hospitalTaxSettings, splitCgstSgst: e.target.checked })}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                      />
                      <Label htmlFor="split-cgst-sgst" className="text-xs font-semibold text-slate-700 cursor-pointer">
                        Split GST into CGST (50%) + SGST (50%)
                      </Label>
                    </div>
                    <p className="text-[10px] text-slate-400 pl-6">Standard for Intra-State supply on tax invoices</p>
                  </div>

                  <div className="space-y-1.5 flex flex-col justify-center">
                    <div className="flex items-center gap-2 pt-2">
                      <input 
                        type="checkbox"
                        id="clinical-exempt"
                        checked={hospitalTaxSettings.isClinicalServicesExempt}
                        onChange={(e) => setHospitalTaxSettings({ ...hospitalTaxSettings, isClinicalServicesExempt: e.target.checked })}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                      />
                      <Label htmlFor="clinical-exempt" className="text-xs font-semibold text-slate-700 cursor-pointer">
                        Exempt OPD / IPD Consultations (0% GST)
                      </Label>
                    </div>
                    <p className="text-[10px] text-slate-400 pl-6">Healthcare doctor consults exempt under GST notifications</p>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button 
                    size="sm" 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                    onClick={handleSaveHospitalTaxSettings}
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save Hospital Tax Settings
                  </Button>
                </div>
              </div>


            </CardContent>
          </Card>
        </TabsContent>

        {/* Database & Sync Tab Content */}
        {!isAccountant && (
          <TabsContent value="database">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
              {/* Credentials Form */}
              <div className="lg:col-span-1 space-y-6">
                <Card className="border-none shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Database className="w-5 h-5 text-indigo-600" />
                      Database Credentials
                    </CardTitle>
                    <CardDescription>
                      Connect your live production Supabase instance for real-time cloud data storage.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="db-url" className="text-xs font-bold text-slate-700 uppercase">
                        Supabase Project URL
                      </Label>
                      <Input
                        id="db-url"
                        placeholder="https://your-project.supabase.co"
                        value={dbUrl}
                        onChange={(e) => setDbUrl(e.target.value)}
                        className="bg-slate-50 border-slate-200"
                      />
                      <p className="text-[10px] text-slate-400 font-medium">
                        Found in Supabase: Project Settings &gt; API &gt; Project URL
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="db-key" className="text-xs font-bold text-slate-700 uppercase">
                        Supabase Anon Key
                      </Label>
                      <Input
                        id="db-key"
                        type="password"
                        placeholder="eyJhbGciOi..."
                        value={dbKey}
                        onChange={(e) => setDbKey(e.target.value)}
                        className="bg-slate-50 border-slate-200 font-mono text-xs pr-10"
                      />
                      <p className="text-[10px] text-slate-400 font-medium">
                        Public API anon token key. Safe to store in local client cache.
                      </p>
                    </div>

                    <div className="pt-4 flex flex-col gap-2">
                      <Button
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2"
                        onClick={handleSaveDatabaseCredentials}
                        disabled={isDbSaving}
                      >
                        <Check className="w-4 h-4" />
                        {isDbSaving ? "Connecting..." : "Save & Connect Cloud"}
                      </Button>
                      
                      {isSupabaseConfigured && (
                        <Button
                          variant="outline"
                          type="button"
                          className="w-full text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900 font-bold gap-2"
                          onClick={handleResetDatabaseCredentials}
                        >
                          <Database className="w-4 h-4 text-slate-400" />
                          Disconnect (Local Only)
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-gradient-to-br from-indigo-900 to-slate-900 text-white border-l-4 border-indigo-500">
                  <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <RefreshCw className="w-5 h-5 text-indigo-400" />
                      Offline Replication
                    </CardTitle>
                    <CardDescription className="text-indigo-200/80">
                      The application synchronizes local offline queue transactions directly with your cloud repository.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-3 bg-white/10 rounded-xl flex items-center justify-between border border-white/10">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-indigo-300">Offline Cache State</p>
                        <p className="text-xl font-bold mt-0.5">{offlineCount} records pending</p>
                      </div>
                      <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-pulse" />
                    </div>

                    <div className="p-3 bg-white/10 rounded-xl flex items-center justify-between border border-white/10">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-indigo-300">Supabase Channel</p>
                        <p className="text-xs font-bold mt-0.5">
                          {isSupabaseConfigured ? (isFallbackActive ? "🔴 Cloud Unreachable" : "🟢 Connected Live") : "⚪️ Passive Local"}
                        </p>
                      </div>
                    </div>

                    {isSupabaseConfigured && (
                      <Button
                        type="button"
                        className="w-full bg-white text-indigo-950 hover:bg-slate-100 font-black gap-2 mt-2"
                        onClick={handleSyncData}
                        disabled={isSyncing}
                      >
                        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                        {isSyncing ? "Uploading Cache..." : "Force Sync With Cloud"}
                      </Button>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm border-l-4 border-rose-500">
                  <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                      <Trash2 className="w-5 h-5 text-rose-500" />
                      Database Maintenance
                    </CardTitle>
                    <CardDescription>
                      Purge seeded demo entries and reset transaction registers to prepare for live patient records.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 space-y-1">
                      <p className="text-[10px] uppercase font-bold text-rose-700">Database Purge Action</p>
                      <p className="text-xs text-rose-600 leading-relaxed font-medium">
                        This will delete Amit Patel, Priya Singh, and other mock patients along with their associated billing records and histories.
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="destructive"
                      className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold gap-2 mt-2"
                      onClick={handlePurgeDemoData}
                      disabled={isPurging}
                    >
                      <Trash2 className={`w-4 h-4 ${isPurging ? 'animate-spin' : ''}`} />
                      {isPurging ? "Purging Records..." : "Purge All Seeded Demo Data"}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Schema Health / Checker Tab */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="border-none shadow-sm">
                  <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                    <div>
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <Activity className="w-5 h-5 text-emerald-500" />
                        Database Integrity Check (Supabase Tables)
                      </CardTitle>
                      <CardDescription>
                        Run validation audits to verify if all required relational tables exist on your connected Supabase.
                      </CardDescription>
                    </div>
                    {isSupabaseConfigured && (
                      <Button
                        type="button"
                        onClick={runAllTableChecks}
                        disabled={isVerifyingAll}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shrink-0"
                      >
                        <Activity className={`w-4 h-4 ${isVerifyingAll ? 'animate-spin' : ''}`} />
                        {isVerifyingAll ? "Testing Tables..." : "Check Tables Connect"}
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {!isSupabaseConfigured ? (
                      <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                        <Database className="w-12 h-12 text-slate-300" />
                        <div className="max-w-md px-4">
                          <p className="text-sm font-bold text-slate-700">Database Connection Inactive</p>
                          <p className="text-xs text-slate-500 mt-1">
                            Connect your live Supabase cloud workspace to see physical table integrity results. Local-only sandbox is fully operational.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {Object.entries(tableChecks).map(([tableName, val]) => {
                            const data = val as { status: 'idle' | 'checking' | 'connected' | 'error'; count?: number; errorMsg?: string };
                            return (
                              <div
                                key={tableName}
                                className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/55 flex items-center justify-between gap-3 shadow-xs hover:border-slate-200 transition"
                              >
                                <div className="truncate">
                                  <p className="text-xs font-bold text-slate-700 font-mono truncate">{tableName}</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                                    {data.status === 'idle' && "Not tested yet."}
                                    {data.status === 'checking' && "Running ping query..."}
                                    {data.status === 'connected' && `Secured connection (${data.count} records)`}
                                    {data.status === 'error' && `Error: ${data.errorMsg}`}
                                  </p>
                                </div>
                                <div className="shrink-0">
                                  {data.status === 'idle' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      type="button"
                                      onClick={() => runSingleTableCheck(tableName)}
                                      className="h-7 text-[10px] font-bold text-indigo-600 bg-indigo-50/50 hover:bg-indigo-150 px-2 rounded-lg"
                                    >
                                      Test Table
                                    </Button>
                                  )}
                                  {data.status === 'checking' && (
                                    <RefreshCw className="w-4 h-4 text-amber-500 animate-spin mr-2" />
                                  )}
                                  {data.status === 'connected' && (
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                      CONNECTED
                                    </span>
                                  )}
                                  {data.status === 'error' && (
                                    <span
                                      title={data.errorMsg}
                                      className="cursor-help inline-flex items-center gap-1.5 text-[10px] font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100"
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                      FAILED
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-white space-y-2 mt-4">
                          <h4 className="text-xs font-black text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                            How to handle "FAILED" results:
                          </h4>
                          <p className="text-[11px] leading-relaxed text-slate-300">
                            If any tables show a <strong>FAILED</strong> status or return <strong>relation public.xxx does not exist</strong>, this indicates that the table schema has not yet been copied to your live Supabase database.
                          </p>
                          <p className="text-[11px] leading-relaxed text-slate-300">
                            <strong>To fix this instantly:</strong> Scroll to the <strong>SQL Editor code box below</strong>, select all code in the script text sheet, open <strong>SQL Editor</strong> in your Supabase dashboard, paste, and hit <strong>RUN</strong>!
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
