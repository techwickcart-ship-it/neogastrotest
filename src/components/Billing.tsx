import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { OPDCollectionTab } from './OPDCollectionTab';
import { CentralizedPaymentCounter } from './CentralizedPaymentCounter';
import OPD from './OPD';
import { 
  CreditCard, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  Plus,
  ArrowUpRight,
  History,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  Trash2,
  Edit,
  Loader2,
  User,
  Coins,
  TrendingUp,
  BarChart3,
  Database,
  Sparkles,
  RefreshCw,
  Settings2,
  UserPlus,
  Microscope
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, formatDate, buildDateWiseInvoiceMap, buildSequentialInvoiceMap, buildDepartmentWiseInvoiceMap, getCleanDateString, getBillDepartmentAndType, generateDateWiseInvoiceNumber } from '@/lib/utils';

import { numberToWords } from '@/lib/pharmacyInvoicePrint';
import { sortInvoicesByLatestSerial, calculateHospitalGst } from '@/lib/taxUtils';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { saveAuditLog } from '@/services/supabaseService';
import { MOCK_USERS, MOCK_BILLING, MOCK_BED_RATES, MOCK_OT_RATES, MOCK_LAB_TESTS, MOCK_MATERIAL_RATES, MOCK_INVENTORY, MOCK_PRESCRIPTIONS } from '@/mockData';
import { supabaseService, isDummyPatient, toDeterministicUuid, isIdMatch } from '@/services/supabaseService';
import { useDataSync } from '@/hooks/useDataSync';
import { canUserViewFinancials, canUserManageBilling, normalizeRole } from '@/utils/rbac';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  BarChart, 
  Bar, 
  Cell, 
  PieChart, 
  Pie, 
  Legend, 
  LineChart, 
  Line 
} from 'recharts';

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function Billing() {
  const navigate = useNavigate();
  const [bills, setBills] = useState<any[]>(() => {
    return storage.get(STORAGE_KEYS.BILLING, []) || [];
  });
  const [patients, setPatients] = useState<any[]>(() => {
    return storage.get(STORAGE_KEYS.PATIENTS, []) || [];
  });
  const [users, setUsers] = useState<any[]>(() => storage.get(STORAGE_KEYS.USERS, MOCK_USERS));
  const [expenses, setExpenses] = useState<any[]>(() => storage.get(STORAGE_KEYS.EXPENSES, []) || []);
  const [loading, setLoading] = useState(false);
  const [templateImage, setTemplateImage] = useState<string | null>(() => storage.get(STORAGE_KEYS.TEMPLATE_IMAGE, null));
  const [hospitalInfo, setHospitalInfo] = useState(() => storage.get(STORAGE_KEYS.HOSPITAL_INFO, {
    name: 'Gastro Plus Hospital',
    address: 'Plot No. 7 & 8, Om Shiv Nagar, Gufa Mandir Road, Lal Ghati Bhopal, 462030, Madhya Pradesh',
    phone: '9109102145/9109101246',
    email: 'gatroplusbhopal@gmail.com',
    logo: null as string | null
  }));

  const fetchData = async () => {
    const [invoicesData, patientsData, staffData, expensesData, appointmentsData] = await Promise.all([
      supabaseService.getInvoices(),
      supabaseService.getPatients(),
      supabaseService.getStaff(),
      supabaseService.getExpenses(),
      supabaseService.getAppointments ? supabaseService.getAppointments() : Promise.resolve([])
    ]);

    if (invoicesData) {
      const enrichedInvoices = invoicesData.map((inv: any) => {
        const pId = inv.patient_id || inv.patientId;
        const pName = inv.patient_name || inv.patientName || inv.customer_name || inv.customerName || inv.name || '';
        const pPhone = inv.patient_phone || inv.patientPhone || inv.phone || inv.mobile || '';
        const pMrn = inv.patient_mrn || inv.patientMrn || inv.mrn || '';

        const matchedPatient = patientsData ? patientsData.find((p: any) => 
          (pId && (p.id === pId || p.mrn === pId || p.patient_id === pId || toDeterministicUuid(p.id) === toDeterministicUuid(pId))) ||
          (pMrn && pMrn !== 'N/A' && (p.mrn === pMrn || p.id === pMrn)) ||
          (pName && p.name && p.name.toLowerCase().trim() === pName.toLowerCase().trim()) ||
          (pPhone && pPhone !== 'N/A' && pPhone !== '0000000000' && (p.phone === pPhone || p.mobile === pPhone))
        ) : null;
        
        let discountAmt = inv.discount_amount ?? inv.discountAmount ?? inv.discount ?? 0;
        let payableAmt = inv.payable_amount ?? inv.payableAmount ?? inv.total_amount ?? inv.totalAmount ?? 0;
        let paidAmt = inv.paid_amount ?? inv.paidAmount ?? 0;
        let totalAmt = inv.total_amount ?? inv.totalAmount ?? 0;
        let status = inv.status || inv.payment_status || 'Unpaid';

        // Resolve patient details reliably
        const rawName = inv.patients?.name || matchedPatient?.name || pName || inv.name || '';
        const isGenericName = !rawName || rawName.toLowerCase() === 'walk-in' || rawName.toLowerCase() === 'walk-in patient' || rawName.toLowerCase() === 'unknown' || rawName.toLowerCase() === 'n/a';
        
        const finalName = !isGenericName ? rawName : (matchedPatient?.name || pName || (pId && pId !== 'walk-in' ? pId : 'Walk-in'));
        const finalMrn = matchedPatient?.mrn || inv.patients?.mrn || pMrn || (matchedPatient?.id ? `MRN-${matchedPatient.id.slice(-6)}` : 'N/A');
        const finalPhone = matchedPatient?.phone || inv.patients?.phone || pPhone || 'N/A';
        const finalEmail = matchedPatient?.email || inv.patients?.email || inv.patient_email || inv.email || '';

        return {
          ...inv,
          patient_id: pId || matchedPatient?.id,
          patient_name: finalName,
          patient_phone: finalPhone,
          patient_mrn: finalMrn,
          discount_amount: discountAmt,
          payable_amount: payableAmt,
          paid_amount: paidAmt,
          total_amount: totalAmt,
          status: status,
          payment_status: status,
          patients: {
            id: matchedPatient?.id || pId,
            name: finalName,
            mrn: finalMrn,
            phone: finalPhone,
            email: finalEmail
          }
        };
      }).filter((inv: any) => {
        const pId = inv.patient_id || inv.patientId;
        const matchedPatient = patientsData ? patientsData.find((p: any) => p.id === pId) : null;
        const patObj = inv.patients || matchedPatient || { id: pId, name: inv.patient_name };
        return !isDummyPatient(patObj);
      });


      // Synthesize virtual invoices for any Paid OPD appointments that do not have a corresponding invoice in the list
      const missingAptInvoices: any[] = [];
      if (appointmentsData) {
        appointmentsData.forEach((apt: any) => {
          const aptPaymentStatus = apt.payment_status || apt.paymentStatus || 'Pending';
          if (aptPaymentStatus !== 'Paid') return;

          const pId = apt.patient_id || apt.patientId;
          const aptDateStr = apt.appointment_date || (apt.created_at ? new Date(apt.created_at).toISOString().split('T')[0] : '');

          const hasInvoice = enrichedInvoices.some((inv: any) => {
            const invPid = inv.patient_id || inv.patientId;
            const invDateStr = inv.created_at ? new Date(inv.created_at).toISOString().split('T')[0] : '';
            const invNum = String(inv.invoice_number || inv.invoiceNumber || '');
            
            const isMatchingPatient = isIdMatch(invPid, pId) || 
              (inv.patient_mrn && apt.patientMrn && inv.patient_mrn === apt.patientMrn) ||
              (inv.patients?.name && apt.patientName && inv.patients.name.trim().toLowerCase() === apt.patientName.trim().toLowerCase());

            const isMatchingAppointment = (inv.id && apt.id && inv.id === apt.id) ||
              (invNum && apt.id && invNum.includes(apt.id));

            return isMatchingAppointment || (isMatchingPatient && (invDateStr === aptDateStr || inv.type === 'OPD'));
          });

          if (!hasInvoice) {
            const baseFee = Number(apt.fee || apt.appointmentFee || 500);
            const discount = Number(apt.discount_amount || apt.discountAmount || 0);
            const feeToCollect = Math.max(0, baseFee - discount);
            const matchedPatient = patientsData ? patientsData.find((p: any) => isIdMatch(p.id, pId) || (p.mrn && p.mrn === apt.patientMrn)) : null;

            const virtualInv = {
              id: `virtual-inv-opd-${apt.id}`,
              patient_id: pId,
              invoice_number: `INV-OPD-V-${apt.id}`,
              status: 'Paid',
              payment_status: 'Paid',
              total_amount: baseFee,
              discount_amount: discount,
              payable_amount: feeToCollect,
              paid_amount: feeToCollect,
              payment_method: apt.payment_method || apt.paymentMethod || apt.paymentMode || 'Cash',
              type: 'OPD',
              created_at: apt.created_at || new Date().toISOString(),
              patients: matchedPatient ? {
                id: matchedPatient.id,
                name: matchedPatient.name,
                mrn: matchedPatient.mrn,
                phone: matchedPatient.phone,
                email: matchedPatient.email
              } : {
                id: pId,
                name: apt.patientName || 'Unknown',
                phone: apt.patientPhone || 'N/A',
                mrn: apt.patientMrn || 'N/A'
              }
            };
            missingAptInvoices.push(virtualInv);
          }
        });
      }

      // Synthesize direct endoscopy procedures invoices into master billing ledger
      const directEndoProceduresList = storage.get(STORAGE_KEYS.ENDOSCOPY_DIRECT_PROCEDURES, []);
      if (directEndoProceduresList && Array.isArray(directEndoProceduresList) && directEndoProceduresList.length > 0) {
        directEndoProceduresList.forEach((proc: any) => {
          if (!proc) return;
          const procInvId = proc.invoiceId || `INV-ENDO-${proc.id}`;
          const hasInv = enrichedInvoices.some((inv: any) => {
            const invId = String(inv.id || '');
            const invNum = String(inv.invoice_number || inv.invoiceNumber || '');
            return invId === procInvId || invNum === procInvId || (invNum && invNum.includes(proc.id));
          });

          if (!hasInv) {
            const netAmt = Number(proc.netTotalAmount || proc.packageFee || 4500);
            const discAmt = Number(proc.discountAmount || 0);
            const baseFee = Number(proc.packageFee || netAmt);
            const sedFee = Number(proc.sedationFee || 0);
            const kitFee = Number(proc.kitFee || 0);
            const totalAmt = baseFee + sedFee + kitFee > 0 ? (baseFee + sedFee + kitFee) : (netAmt + discAmt);

            const endoInv = {
              id: procInvId,
              invoice_number: procInvId,
              patient_id: proc.patientId || proc.id,
              status: 'Paid',
              payment_status: 'Paid',
              total_amount: totalAmt,
              discount_amount: discAmt,
              payable_amount: netAmt,
              paid_amount: netAmt,
              payment_method: proc.paymentMode || 'Cash',
              type: 'Endoscopy',
              created_at: proc.bookingDate || proc.createdAt || new Date().toISOString(),
              items: [
                { description: `Direct ${proc.procedureType || 'Endoscopy Procedure'}`, amount: baseFee, category: 'Endoscopy' },
                ...(sedFee > 0 ? [{ description: `Sedation & Anesthesia (${proc.sedationType || 'Standard'})`, amount: sedFee, category: 'Endoscopy' }] : []),
                ...(kitFee > 0 ? [{ description: `Disposable Biopsy Kit & Consumables`, amount: kitFee, category: 'Endoscopy' }] : [])
              ],
              patients: {
                id: proc.patientId || proc.id,
                name: proc.patientName || 'Endoscopy Patient',
                mrn: proc.patientId || `ENDO-${proc.id}`,
                phone: proc.patientPhone || 'N/A',
                email: 'Direct Endoscopy Suite'
              }
            };
            missingAptInvoices.push(endoInv);
          }
        });
      }

      // Deduplicate combined list thoroughly
      const combined = [...enrichedInvoices, ...missingAptInvoices];
      const uniqueBills: any[] = [];
      const seenBillIds = new Set<string>();
      const seenBillNums = new Set<string>();

      for (const bill of combined) {
        if (!bill) continue;
        const bId = String(bill.id || '').trim();
        const bNum = String(bill.invoice_number || bill.invoiceNumber || '').trim().toLowerCase();

        if (bId && seenBillIds.has(bId)) continue;
        if (bNum && bNum !== 'n/a' && bNum !== 'inv-undefined' && seenBillNums.has(bNum)) continue;

        if (bId) seenBillIds.add(bId);
        if (bNum && bNum !== 'n/a' && bNum !== 'inv-undefined') seenBillNums.add(bNum);
        uniqueBills.push(bill);
      }

      setBills(uniqueBills);
    }
    if (patientsData) {
      const directEndoProcedures = storage.get(STORAGE_KEYS.ENDOSCOPY_DIRECT_PROCEDURES, []);
      const endoPatients = (directEndoProcedures || []).map((proc: any) => ({
        id: proc.patientId || proc.id,
        mrn: proc.patientId || `ENDO-${proc.id}`,
        name: proc.patientName,
        phone: proc.patientPhone,
        age: proc.age,
        gender: proc.gender,
        address: proc.address,
        department: 'Direct Endoscopy & Colonoscopy',
        isDirectEndo: true,
        procedureType: proc.procedureType
      }));

      const combinedPatients = [...patientsData];
      endoPatients.forEach((ePat: any) => {
        if (!combinedPatients.some(p => p.id === ePat.id || p.mrn === ePat.mrn)) {
          combinedPatients.push(ePat);
        }
      });
      setPatients(combinedPatients);
    }
    if (staffData && staffData.length > 0) setUsers(staffData);
    if (expensesData) setExpenses(expensesData);
    if (appointmentsData) {
      const filteredApts = appointmentsData.filter((apt: any) => {
        const pId = apt.patient_id || apt.patientId;
        const matchedPatient = patientsData ? patientsData.find((p: any) => p.id === pId) : null;
        const patObj = matchedPatient || { id: pId, name: apt.patientName || apt.patient_name, phone: apt.patientPhone || apt.patient_phone };
        return !isDummyPatient(patObj);
      });
      setAppointments(filteredApts);
    }
    setLoading(false);
  };

  useDataSync(fetchData);

  // Load latest rates from storage
  const [otRates, setOtRates] = useState(() => storage.get(STORAGE_KEYS.OT_RATES, MOCK_OT_RATES));
  const [bedRates, setBedRates] = useState(() => storage.get(STORAGE_KEYS.BED_RATES, MOCK_BED_RATES));
  const [labRates, setLabRates] = useState(() => storage.get(STORAGE_KEYS.LAB_RATES, MOCK_LAB_TESTS));
  const [materialRates, setMaterialRates] = useState(() => storage.get(STORAGE_KEYS.MATERIAL_RATES, MOCK_MATERIAL_RATES));
  const [inventory, setInventory] = useState<any[]>(() => storage.get(STORAGE_KEYS.INVENTORY, MOCK_INVENTORY));
  const [prescriptions, setPrescriptions] = useState<any[]>(() => storage.get(STORAGE_KEYS.PRESCRIPTIONS, MOCK_PRESCRIPTIONS));

  const [customCategories, setCustomCategories] = useState<any[]>(() => {
    return storage.get('hms_custom_billing_categories', []);
  });
  const [customServices, setCustomServices] = useState<any[]>(() => {
    return storage.get('hms_custom_billing_services', []);
  });
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [catalogTab, setCatalogTab] = useState<'categories' | 'services'>('categories');
  const [newCatName, setNewCatName] = useState('');
  const [newSrvName, setNewSrvName] = useState('');
  const [newSrvRate, setNewSrvRate] = useState('');
  const [selectedCatalogCat, setSelectedCatalogCat] = useState('opd');

  const allCategories = useMemo(() => {
    const defaults = [
      { id: 'opd', name: 'OPD Consultation', isDefault: true },
      { id: 'endoscopy', name: 'Endoscopy & Colonoscopy', isDefault: true },
      { id: 'ipd', name: 'IPD / Ward', isDefault: true },
      { id: 'ot', name: 'Surgery / OT', isDefault: true },
      { id: 'lab', name: 'Pathology / Lab', isDefault: true },
      { id: 'radio', name: 'Radiology', isDefault: true },
      { id: 'materials', name: 'Materials / Disposables', isDefault: true },
      { id: 'pharmacy', name: 'Pharmacy', isDefault: true },
      { id: 'custom', name: 'CUSTOM', isDefault: true }
    ];
    return [...defaults, ...customCategories];
  }, [customCategories]);

  const [invoiceNumberingScheme, setInvoiceNumberingScheme] = useState<'department' | 'global'>('department');

  const sequentialIdMap = useMemo(() => {
    const map = buildSequentialInvoiceMap(bills, 'INV');

    // Sort expenses chronologically
    const sortedExps = [...expenses]
      .sort((a, b) => {
        const dateA = new Date(a.created_at || a.date || 0).getTime();
        const dateB = new Date(b.created_at || b.date || 0).getTime();
        return dateA - dateB;
      });
    sortedExps.forEach((e, idx) => {
      map[e.id] = `EXP-${1000 + idx + 1}`;
    });

    return map;
  }, [bills, expenses]);

  const departmentIdMap = useMemo(() => {
    const map = buildDepartmentWiseInvoiceMap(bills);

    // Sort expenses chronologically
    const sortedExps = [...expenses]
      .sort((a, b) => {
        const dateA = new Date(a.created_at || a.date || 0).getTime();
        const dateB = new Date(b.created_at || b.date || 0).getTime();
        return dateA - dateB;
      });
    sortedExps.forEach((e, idx) => {
      map[e.id] = `EXP-${1000 + idx + 1}`;
    });

    return map;
  }, [bills, expenses]);

  const activeInvoiceMap = useMemo(() => {
    return invoiceNumberingScheme === 'department' ? departmentIdMap : sequentialIdMap;
  }, [invoiceNumberingScheme, departmentIdMap, sequentialIdMap]);

  const getBillPatientInfo = (bill: any) => {
    if (!bill) return { id: '', name: 'Registered Patient', mrn: 'N/A', phone: 'N/A', email: '', age: '', gender: '', address: '', isMatched: false, department: 'General' };
    const pId = bill.patient_id || bill.patientId;
    const pName = bill.patient_name || bill.patientName || bill.customer_name || bill.customerName || '';
    const pPhone = bill.patient_phone || bill.patientPhone || bill.phone || '';
    const pMrn = bill.patient_mrn || bill.patientMrn || bill.mrn || '';

    const allPatients = (patients && patients.length > 0) ? patients : (storage.get(STORAGE_KEYS.PATIENTS, []) || []);

    const directMatch = allPatients.find((p: any) => 
      (pId && (p.id === pId || p.mrn === pId || toDeterministicUuid(p.id) === toDeterministicUuid(pId))) ||
      (pMrn && pMrn !== 'N/A' && (p.mrn === pMrn || p.id === pMrn))
    );
    const nameMatch = !directMatch && pName ? 
      allPatients.find((p: any) => p.name && p.name.toLowerCase().trim() === pName.toLowerCase().trim()) : null;
    const phoneMatch = !directMatch && !nameMatch && pPhone && pPhone !== 'N/A' && pPhone !== '0000000000' ?
      allPatients.find((p: any) => p.phone === pPhone || p.mobile === pPhone) : null;
    
    // Look up local appointments if available
    const localApts = storage.get(STORAGE_KEYS.APPOINTMENTS, []) || [];
    const matchedApt = !directMatch && !nameMatch ? localApts.find((a: any) => 
      (pId && (a.patientId === pId || a.patient_id === pId || a.id === pId)) ||
      (pName && a.patientName && a.patientName.toLowerCase().trim() === pName.toLowerCase().trim())
    ) : null;

    const matched = directMatch || nameMatch || phoneMatch;

    const rawName = bill.patients?.name || bill.patient_name || bill.patientName || bill.customer_name || matched?.name || matchedApt?.patientName || '';
    const isGeneric = !rawName || rawName.toLowerCase() === 'walk-in' || rawName.toLowerCase() === 'walk-in patient' || rawName.toLowerCase() === 'unknown' || rawName.toLowerCase() === 'n/a';

    const deptInfo = getBillDepartmentAndType(bill);
    const deptType = deptInfo.departmentName || bill.type || (bill.items?.[0]?.category) || 'General';
    const patientRegType = String(matched?.registration_type || matched?.registrationType || '').toLowerCase();
    const isIpdPatient = patientRegType === 'ipd' || matched?.status === 'Discharged' || matched?.status === 'discharged' || matched?.status === 'Admitted' || matched?.status === 'Admitting' || deptType === 'IPD' || deptType === 'IPD / Ward';
    const isEndoPatient = matched?.isDirectEndo || deptType === 'Endoscopy' || deptType === 'ENDOSCOPY' || patientRegType === 'endoscopy';

    const fallbackDeptName = isIpdPatient ? (matched?.status === 'Discharged' || matched?.status === 'discharged' ? 'Discharged IPD Patient' : 'IPD Inpatient') :
                             isEndoPatient ? 'Endoscopy Patient' :
                             deptType === 'OPD' ? 'OPD Patient' : 
                             deptType === 'IPD' || deptType === 'IPD / Ward' ? 'IPD Inpatient' : 
                             deptType.includes('Path') || deptType.includes('Lab') ? 'Pathology Patient' :
                             deptType.includes('Radio') ? 'Radiology Patient' :
                             deptType === 'Endoscopy' || deptType === 'ENDOSCOPY' ? 'Endoscopy Patient' : 
                             deptType === 'Pharmacy' || deptType === 'PHARMACY' ? 'Pharmacy Patient' : 
                             deptType === 'Emergency' ? 'Emergency Patient' : 'Registered Patient';

    const name = !isGeneric ? rawName : (matched?.name || matchedApt?.patientName || bill.patient_name || bill.patientName || (pId && pId !== 'walk-in' && !pId.startsWith('temp-') ? pId : fallbackDeptName));
    const mrn = matched?.mrn || matchedApt?.patientMrn || bill.patients?.mrn || bill.patient_mrn || bill.patientMrn || (matched?.id ? `MRN-${matched.id.slice(-6)}` : (pId && pId !== 'walk-in' && !pId.startsWith('temp-') ? `MRN-${pId.slice(-5).toUpperCase()}` : 'N/A'));
    const phone = matched?.phone || matched?.mobile || matchedApt?.patientPhone || bill.patients?.phone || bill.patient_phone || bill.patientPhone || bill.phone || 'N/A';
    const email = matched?.email || bill.patients?.email || bill.patient_email || bill.patientEmail || bill.email || '';
    const age = matched?.age || matchedApt?.age || bill.patients?.age || bill.patient_age || bill.age || '';
    const gender = matched?.gender || matchedApt?.gender || bill.patients?.gender || bill.patient_gender || bill.gender || '';
    const address = matched?.address || matchedApt?.address || bill.patients?.address || bill.patient_address || bill.address || '';

    return {
      id: matched?.id || pId,
      name,
      mrn,
      phone,
      email,
      age: age ? String(age) : '',
      gender: gender ? String(gender) : '',
      address: address ? String(address) : '',
      isMatched: !!matched,
      department: matched?.department || (isIpdPatient ? (matched?.status === 'Discharged' || matched?.status === 'discharged' ? 'IPD (Discharged)' : 'IPD / Ward') : isEndoPatient ? 'Endoscopy' : deptType)
    };
  };

  const duplicateNamesSet = useMemo(() => {
    const nameCounts: Record<string, number> = {};
    (patients || []).forEach(p => {
      const raw = (p.name || '').trim().toLowerCase();
      if (raw && raw !== 'walk-in' && raw !== 'walk-in patient' && raw !== 'unknown' && raw !== 'n/a') {
        nameCounts[raw] = (nameCounts[raw] || 0) + 1;
      }
    });

    // Also check bills for duplicate name occurrences across distinct MRNs
    const nameToMrns: Record<string, Set<string>> = {};
    (bills || []).forEach(b => {
      const pat = getBillPatientInfo(b);
      const raw = (pat.name || '').trim().toLowerCase();
      if (raw && raw !== 'walk-in' && raw !== 'walk-in patient' && raw !== 'unknown' && raw !== 'n/a') {
        if (!nameToMrns[raw]) nameToMrns[raw] = new Set();
        if (pat.mrn && pat.mrn !== 'N/A') nameToMrns[raw].add(pat.mrn);
      }
    });

    const set = new Set<string>();
    Object.keys(nameCounts).forEach(name => {
      if (nameCounts[name] > 1) {
        set.add(name);
      }
    });
    Object.keys(nameToMrns).forEach(name => {
      if (nameToMrns[name].size > 1) {
        set.add(name);
      }
    });
    return set;
  }, [patients, bills]);


  const getServicesByCategory = (catId: string) => {
    if (!catId) return [];
    
    let services: { name: string; rate: number; isCustom?: boolean; id?: string; stock?: number; unit?: string }[] = [];
    
    if (catId === 'ot') {
      services = otRates.map((r: any) => ({ name: r.type, rate: r.rate }));
    } else if (catId === 'ipd') {
      services = bedRates.map((r: any) => ({ name: r.type, rate: r.rate }));
    } else if (catId === 'lab') {
      services = labRates.filter((t: any) => t.category === 'Pathology').map((t: any) => ({ name: t.name, rate: t.price }));
    } else if (catId === 'radio') {
      services = labRates.filter((t: any) => t.category === 'Radiology').map((t: any) => ({ name: t.name, rate: t.price }));
    } else if (catId === 'materials') {
      const invConsumables = (inventory || []).filter((i: any) => 
        i.category === 'Disposable' || i.category === 'Material' || i.category === 'Surgical'
      ).map((item: any) => ({
        name: item.name,
        rate: Number(item.sellingPrice ?? item.mrp) || 0,
        stock: item.stock,
        unit: item.unit,
        id: item.id
      }));
      services = [
        ...materialRates.map((t: any) => ({ name: t.name, rate: t.price })),
        ...invConsumables
      ];
    } else if (catId === 'opd') {
      services = [
        { name: 'OPD General Consultation', rate: 500 },
        { name: 'Specialist Consultation', rate: 800 },
        { name: 'Super Specialist / Senior Consultant OPD', rate: 1200 },
        { name: 'OPD Follow-Up Consultation', rate: 300 },
        { name: 'Emergency Consultation', rate: 1000 },
        { name: 'Day Care Observation (Hourly)', rate: 300 },
        { name: 'ECG / Clinical Checkup', rate: 400 },
        { name: 'Nebulization Session', rate: 150 },
        { name: 'Minor Wound Dressing & Suture Care', rate: 250 },
        { name: 'IV Cannulation / Injection Administration', rate: 150 },
        { name: 'Blood Sugar (GRBS) Rapid Test', rate: 100 }
      ];
    } else if (catId === 'endoscopy') {
      services = [
        { name: 'Upper GI Endoscopy (Diagnostic)', rate: 2500 },
        { name: 'Upper GI Endoscopy with Biopsy', rate: 3500 },
        { name: 'Colonoscopy (Full Diagnostic)', rate: 4500 },
        { name: 'Colonoscopy with Biopsy / Polypectomy', rate: 6000 },
        { name: 'Endoscopic Variceal Ligation (EVL / Banding)', rate: 8000 },
        { name: 'Endoscopic Sclerotherapy (EST)', rate: 5000 },
        { name: 'Endoscopic Hemoclip Application', rate: 6500 },
        { name: 'Endoscopic Foreign Body Removal', rate: 5500 },
        { name: 'Flexible Sigmoidoscopy', rate: 2200 },
        { name: 'ERCP (Diagnostic / Therapeutic)', rate: 15000 },
        { name: 'Liver Fibroscan / Elastography', rate: 2000 },
        { name: 'Endoscopy Sedation / Anesthesia Fee', rate: 1500 },
        { name: 'Disposable Biopsy Forceps & Pack', rate: 800 }
      ];
    } else if (catId === 'pharmacy') {
      const invMeds = (inventory || []).map((item: any) => ({
        name: item.name,
        rate: Number(item.sellingPrice ?? item.mrp) || 0,
        stock: item.stock,
        unit: item.unit,
        id: item.id
      }));
      services = [
        ...invMeds,
        { name: 'Pharmacy Bill (Lump Sum / Custom Rate)', rate: 0 }
      ];
    }
    
    const assocCustom = customServices.filter((s: any) => s.categoryId === catId);
    const mappedCustom = assocCustom.map((s: any) => ({ name: s.name, rate: s.rate, isCustom: true, id: s.id }));
    
    return [...services, ...mappedCustom];
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) {
      toast.error('Please enter a category name');
      return;
    }
    const catId = 'cat-' + Date.now();
    const newCat = {
      id: catId,
      name: newCatName.trim(),
      isDefault: false
    };
    const updated = [...customCategories, newCat];
    setCustomCategories(updated);
    storage.set('hms_custom_billing_categories', updated);
    setNewCatName('');
    toast.success(`Category "${newCat.name}" added successfully!`);
  };

  const handleDeleteCategory = (catId: string, catName: string) => {
    if (!window.confirm(`Are you sure you want to delete category "${catName}"? This will also remove all associated services.`)) {
      return;
    }
    const updatedCats = customCategories.filter(c => c.id !== catId);
    setCustomCategories(updatedCats);
    storage.set('hms_custom_billing_categories', updatedCats);
    
    const updatedSrvs = customServices.filter(s => s.categoryId !== catId);
    setCustomServices(updatedSrvs);
    storage.set('hms_custom_billing_services', updatedSrvs);
    
    if (selectedCatalogCat === catId) {
      setSelectedCatalogCat('opd');
    }
    
    toast.success(`Category "${catName}" deleted successfully!`);
  };

  const handleAddService = () => {
    if (!newSrvName.trim()) {
      toast.error('Please enter a service name');
      return;
    }
    const rateVal = parseFloat(newSrvRate) || 0;
    
    if (selectedCatalogCat === 'ot') {
      const updated = [...otRates, { type: newSrvName.trim(), rate: rateVal }];
      setOtRates(updated);
      storage.set(STORAGE_KEYS.OT_RATES, updated);
    } else if (selectedCatalogCat === 'ipd') {
      const updated = [...bedRates, { type: newSrvName.trim(), rate: rateVal }];
      setBedRates(updated);
      storage.set(STORAGE_KEYS.BED_RATES, updated);
    } else if (selectedCatalogCat === 'lab') {
      const updated = [...labRates, { id: 'lab-' + Date.now(), name: newSrvName.trim(), category: 'Pathology', price: rateVal }];
      setLabRates(updated);
      storage.set(STORAGE_KEYS.LAB_RATES, updated);
    } else if (selectedCatalogCat === 'radio') {
      const updated = [...labRates, { id: 'radio-' + Date.now(), name: newSrvName.trim(), category: 'Radiology', price: rateVal }];
      setLabRates(updated);
      storage.set(STORAGE_KEYS.LAB_RATES, updated);
    } else if (selectedCatalogCat === 'materials') {
      const updated = [...materialRates, { name: newSrvName.trim(), price: rateVal, category: 'Disposable' }];
      setMaterialRates(updated);
      storage.set(STORAGE_KEYS.MATERIAL_RATES, updated);
    } else {
      const newSrv = {
        id: 'srv-' + Date.now(),
        categoryId: selectedCatalogCat,
        name: newSrvName.trim(),
        rate: rateVal
      };
      const updated = [...customServices, newSrv];
      setCustomServices(updated);
      storage.set('hms_custom_billing_services', updated);
    }
    
    setNewSrvName('');
    setNewSrvRate('');
    toast.success(`Service "${newSrvName.trim()}" added to catalog!`);
  };

  const handleDeleteService = (srvName: string, isCustom?: boolean, customId?: string) => {
    if (!window.confirm(`Are you sure you want to delete service "${srvName}"?`)) {
      return;
    }
    if (selectedCatalogCat === 'ot') {
      const updated = otRates.filter((r: any) => r.type !== srvName);
      setOtRates(updated);
      storage.set(STORAGE_KEYS.OT_RATES, updated);
    } else if (selectedCatalogCat === 'ipd') {
      const updated = bedRates.filter((r: any) => r.type !== srvName);
      setBedRates(updated);
      storage.set(STORAGE_KEYS.BED_RATES, updated);
    } else if (selectedCatalogCat === 'lab' || selectedCatalogCat === 'radio') {
      const updated = labRates.filter((t: any) => t.name !== srvName);
      setLabRates(updated);
      storage.set(STORAGE_KEYS.LAB_RATES, updated);
    } else if (selectedCatalogCat === 'materials') {
      const updated = materialRates.filter((t: any) => t.name !== srvName);
      setMaterialRates(updated);
      storage.set(STORAGE_KEYS.MATERIAL_RATES, updated);
    } else {
      if (isCustom && customId) {
        const updated = customServices.filter((s: any) => s.id !== customId);
        setCustomServices(updated);
        storage.set('hms_custom_billing_services', updated);
      } else {
        const updated = customServices.filter((s: any) => !(s.categoryId === selectedCatalogCat && s.name === srvName));
        setCustomServices(updated);
        storage.set('hms_custom_billing_services', updated);
      }
    }
    
    toast.success(`Service "${srvName}" removed from catalog!`);
  };

  const currentUser = storage.get(STORAGE_KEYS.SESSION_USER, { role: 'ADMIN', name: 'Administrator', id: 'u-admin' }) || { role: 'ADMIN', name: 'Administrator', id: 'u-admin' };

  const isAddedByAdmin = (record: any) => {
    if (!record) return false;
    const seedIds = ['bill1', 'bill2', 'bill3', 'bill4', 'bill5'];
    if (record.id && seedIds.includes(record.id)) return true;

    const creatorId = record.created_by || record.issued_by || record.createdBy;
    if (!creatorId) {
      // Treat legacy records without creator info as admin-seeded fail-safe
      return true;
    }
    if (creatorId === 'u2' || creatorId === 'u-admin' || creatorId === 'u-admingh') return true;

    const creatorUser = users?.find((u: any) => u.id === creatorId || u.email === creatorId);
    if (creatorUser && (creatorUser.role === 'SUPER_ADMIN' || creatorUser.role === 'ADMIN' || creatorUser.role === 'HOSPITAL_ADMIN' || creatorUser.role?.toUpperCase().includes('ADMIN'))) return true;

    return false;
  };

  const canModify = (record: any) => {
    // Edit buttons are active for all authorized billing users
    return true;
  };

  const logAudit = (action: string, entityId: string, details: any) => {
    const logs = storage.get(STORAGE_KEYS.AUDIT_LOGS, []);
    const newLog = {
      id: `audit-${Date.now()}`,
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Unknown User',
      userRole: currentUser?.role || 'N/A',
      action,
      entityType: 'Billing',
      entityId,
      details,
      timestamp: new Date().toISOString()
    };
    saveAuditLog(newLog);
    storage.set(STORAGE_KEYS.AUDIT_LOGS, [newLog, ...logs]);
  };

  const [appointments, setAppointments] = useState<any[]>([]);
  const [opdStartDate, setOpdStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [opdEndDate, setOpdEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [opdDoctorFilter, setOpdDoctorFilter] = useState<string>('all');
  
  const [recentInvoicesStartDate, setRecentInvoicesStartDate] = useState<string>('');
  const [recentInvoicesEndDate, setRecentInvoicesEndDate] = useState<string>('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('all');

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'central-counter' | 'analytics' | 'recent' | 'consolidated' | 'opd-collection' | 'opd-panel'>(() => {
    return 'central-counter';
  });
  const [seeding, setSeeding] = useState(false);

  // Compute analytics dynamically
  const analyticsData = useMemo(() => {
    if (!bills || bills.length === 0) {
      return {
        totalBilled: 0,
        totalPaid: 0,
        totalOutstanding: 0,
        totalRefunded: 0,
        collectionRate: 0,
        categoryData: [],
        methodData: [],
        trendData: [],
        statusCounts: { paid: 0, partial: 0, unpaid: 0 }
      };
    }

    let grossBilled = 0;
    let netPaid = 0;
    let paidCount = 0;
    let partialCount = 0;
    let unpaidCount = 0;
    let totalRefunded = 0;

    const categoryTotals: Record<string, number> = {};
    const methodTotals: Record<string, number> = {};
    const trendMap: Record<string, { date: string, billed: number, collected: number }> = {};

    bills.forEach(b => {
      if (!b) return;
      const billedVal = Number(b.payable_amount ?? b.payableAmount ?? b.total_amount ?? b.totalAmount ?? 0);
      const paidVal = Number(b.paid_amount ?? b.paidAmount ?? 0);
      
      grossBilled += billedVal;
      netPaid += paidVal;

      const s = (b.status || b.payment_status || '').toLowerCase();
      if (s === 'settled' || s === 'paid') paidCount++;
      else if (s === 'partial') partialCount++;
      else unpaidCount++;

      // Parse refund from remarks if exists, e.g. "[Refunded ₹200 via Cash on 6/29/2026. Reason: ...]"
      const remarks = b.payment_remarks || '';
      const matches = remarks.match(/\[Refunded ₹([0-9.]+)/g);
      if (matches) {
        matches.forEach((m: string) => {
          const numMatch = m.match(/[0-9.]+/);
          if (numMatch) {
            totalRefunded += parseFloat(numMatch[0]);
          }
        });
      } else if (s === 'refunded') {
        // Fallback if status is refunded but remarks matches didn't capture specific amount
        totalRefunded += billedVal;
      }

      // Department/Category breakdown
      const type = (b.type || 'General').toUpperCase();
      categoryTotals[type] = (categoryTotals[type] || 0) + paidVal;

      // Also parse items inside invoice_items to refine categories if available
      if (b.invoice_items && Array.isArray(b.invoice_items)) {
        b.invoice_items.forEach((item: any) => {
          const cat = (item.category || item.item_type || 'General').toUpperCase();
          const itemAmt = Number(item.total_price || item.amount || 0);
          // Distribute item amounts proportionally if invoice is partially paid, otherwise use item price
          const scale = billedVal > 0 ? (paidVal / billedVal) : 1;
          categoryTotals[cat] = (categoryTotals[cat] || 0) + (itemAmt * scale);
        });
      }

      // Payment method breakdown
      const method = b.payment_method || b.paymentMode || 'N/A';
      methodTotals[method] = (methodTotals[method] || 0) + paidVal;

      // Trend mapping (by date)
      const dateStr = (b.created_at || b.date || new Date().toISOString()).split('T')[0];
      if (!trendMap[dateStr]) {
        trendMap[dateStr] = { date: formatDate(b.created_at || b.date), billed: 0, collected: 0 };
      }
      trendMap[dateStr].billed += billedVal;
      trendMap[dateStr].collected += paidVal;
    });

    const outstanding = Math.max(0, grossBilled - netPaid);
    const colRate = grossBilled > 0 ? (netPaid / grossBilled) * 100 : 0;

    // Map Category Totals with nice labels
    const catLabels: Record<string, string> = {
      'OPD': 'OPD Consultation',
      'IPD': 'IPD/Ward Rooms',
      'LAB': 'Lab Diagnostics',
      'PATH': 'Pathology',
      'RADIO': 'Radiology Services',
      'PHARMACY': 'Pharmacy POS',
      'OT': 'Operation Theatre'
    };
    const categoryData = Object.entries(categoryTotals).map(([cat, total]) => ({
      name: catLabels[cat] || cat,
      value: Math.round(total),
    })).filter(item => item.value > 0);

    // Map Method Totals
    const methodColors: Record<string, string> = {
      'Cash': '#10b981',
      'UPI': '#0ea5e9',
      'Card': '#8b5cf6',
      'Insurance': '#f59e0b',
      'N/A': '#94a3b8'
    };
    const methodData = Object.entries(methodTotals).map(([method, total]) => ({
      name: method,
      value: Math.round(total),
      color: methodColors[method] || '#64748b'
    })).filter(item => item.value > 0);

    // Sort trend log by actual date key
    const trendData = Object.entries(trendMap)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([_, val]) => val);

    return {
      totalBilled: grossBilled,
      totalPaid: netPaid,
      totalOutstanding: outstanding,
      totalRefunded,
      collectionRate: colRate,
      categoryData,
      methodData,
      trendData,
      statusCounts: { paid: paidCount, partial: partialCount, unpaid: unpaidCount }
    };
  }, [bills]);

  const handleSeedDemoInvoices = async () => {
    setSeeding(true);
    try {
      let activePatients = [...patients];
      
      // If we don't have patients in the DB, let's create a couple of patients first
      if (activePatients.length === 0) {
        toast.info('Seeding dynamic mock patients first to link ledger accounts...');
        
        let p1 = null;
        let p2 = null;
        let p3 = null;
        
        try {
          p1 = await supabaseService.createPatient({
            name: 'Amit Patel',
            age: 28,
            gender: 'Male',
            phone: '9876543210',
            address: 'B-42, Sector 15, Noida',
            bloodGroup: 'A+',
            status: 'Active',
            dob: '1996-05-15'
          });
        } catch (e) {
          console.warn('DB creation of Amit Patel failed, using local fallback.', e);
        }

        try {
          p2 = await supabaseService.createPatient({
            name: 'Priya Singh',
            age: 45,
            gender: 'Female',
            phone: '9123456789',
            address: 'Flat 201, Green View, Mumbai',
            bloodGroup: 'O-',
            status: 'High Risk',
            dob: '1979-11-10'
          });
        } catch (e) {
          console.warn('DB creation of Priya Singh failed, using local fallback.', e);
        }

        try {
          p3 = await supabaseService.createPatient({
            name: 'Rahul Sharma',
            age: 34,
            gender: 'Male',
            phone: '9543210987',
            address: 'Main St, Delhi',
            bloodGroup: 'B+',
            status: 'Active',
            dob: '1990-02-20'
          });
        } catch (e) {
          console.warn('DB creation of Rahul Sharma failed, using local fallback.', e);
        }
        
        if (p1) activePatients.push(p1);
        if (p2) activePatients.push(p2);
        if (p3) activePatients.push(p3);

        // Fallback for offline/local-only or if DB writes failed/returned null
        if (activePatients.length === 0) {
          console.warn("Real database patient seeding was not successful. Seeding locally to ensure a seamless experience.");
          const localP1 = {
            id: 'demo-p1',
            name: 'Amit Patel',
            age: 28,
            gender: 'Male',
            phone: '9876543210',
            address: 'B-42, Sector 15, Noida',
            bloodGroup: 'A+',
            status: 'Active',
            dob: '1996-05-15',
            created_at: new Date().toISOString()
          };
          const localP2 = {
            id: 'demo-p2',
            name: 'Priya Singh',
            age: 45,
            gender: 'Female',
            phone: '9123456789',
            address: 'Flat 201, Green View, Mumbai',
            bloodGroup: 'O-',
            status: 'High Risk',
            dob: '1979-11-10',
            created_at: new Date().toISOString()
          };
          const localP3 = {
            id: 'demo-p3',
            name: 'Rahul Sharma',
            age: 34,
            gender: 'Male',
            phone: '9543210987',
            address: 'Main St, Delhi',
            bloodGroup: 'B+',
            status: 'Active',
            dob: '1990-02-20',
            created_at: new Date().toISOString()
          };

          const existingPatients = storage.get(STORAGE_KEYS.PATIENTS, []);
          const updatedPatients = [localP1, localP2, localP3, ...existingPatients];
          storage.set(STORAGE_KEYS.PATIENTS, updatedPatients);
          activePatients.push(localP1, localP2, localP3);
        }
      }
      
      if (activePatients.length === 0) {
        throw new Error('Could not create or find active patients for seeding invoices.');
      }
      
      toast.info('Generating comprehensive revenue ledger files in PostgreSQL...');
      
      // Generate some realistic invoices spanning the past few weeks
      const seedInvoices = [
        {
          patient_id: activePatients[0].id,
          type: 'OPD',
          payment_method: 'Cash',
          status: 'Settled',
          payment_status: 'Paid',
          created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          discount_amount: 0,
          tax_amount: 0,
          total_amount: 500,
          payable_amount: 500,
          paid_amount: 500,
          items: [{ description: 'OPD Consultation Fee - Dr. Rajesh Sharma', amount: 500, category: 'OPD' }]
        },
        {
          patient_id: activePatients[1].id,
          type: 'IPD',
          payment_method: 'UPI',
          status: 'Settled',
          payment_status: 'Paid',
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          discount_amount: 500,
          tax_amount: 250,
          total_amount: 3500,
          payable_amount: 3000,
          paid_amount: 3000,
          items: [{ description: 'General Ward Room Rent (Semi-Private)', amount: 3000, category: 'IPD' }]
        },
        {
          patient_id: activePatients[0].id,
          type: 'Lab',
          payment_method: 'Card',
          status: 'Settled',
          payment_status: 'Paid',
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          discount_amount: 0,
          tax_amount: 150,
          total_amount: 2500,
          payable_amount: 2500,
          paid_amount: 2500,
          items: [
            { description: 'Complete Blood Count (CBC) with Hematology', amount: 1000, category: 'Lab' },
            { description: 'Liver Function Test (LFT) & Lipid Profile', amount: 1500, category: 'Lab' }
          ]
        },
        {
          patient_id: activePatients[2 % activePatients.length].id,
          type: 'Pharmacy',
          payment_method: 'Cash',
          status: 'Settled',
          payment_status: 'Paid',
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          discount_amount: 100,
          tax_amount: 80,
          total_amount: 1200,
          payable_amount: 1100,
          paid_amount: 1100,
          items: [
            { description: 'Amoxicillin 250mg Tablets (Batch A-10)', amount: 500, category: 'Pharmacy' },
            { description: 'Paracetamol 500mg (Batch P-99)', amount: 600, category: 'Pharmacy' }
          ]
        },
        {
          patient_id: activePatients[1].id,
          type: 'IPD',
          payment_method: 'UPI',
          status: 'Partial',
          payment_status: 'Partial',
          created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
          discount_amount: 2000,
          tax_amount: 250,
          total_amount: 50000,
          payable_amount: 48000,
          paid_amount: 20000,
          items: [{ description: 'Cardiology Surgery - Main Theatre Charge', amount: 48000, category: 'IPD' }]
        },
        {
          patient_id: activePatients[0].id,
          type: 'Radiology',
          payment_method: 'UPI',
          status: 'Settled',
          payment_status: 'Paid',
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          discount_amount: 0,
          tax_amount: 180,
          total_amount: 1800,
          payable_amount: 1800,
          paid_amount: 1800,
          items: [{ description: 'X-Ray Chest PA View & Interpretation', amount: 1800, category: 'Radio' }]
        },
        {
          patient_id: activePatients[1].id,
          type: 'OPD',
          payment_method: 'Cash',
          status: 'Settled',
          payment_status: 'Paid',
          created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          discount_amount: 0,
          tax_amount: 0,
          total_amount: 300,
          payable_amount: 300,
          paid_amount: 300,
          items: [{ description: 'OPD Follow-up - General Medicine', amount: 300, category: 'OPD' }]
        }
      ];
      
      for (const item of seedInvoices) {
        let createdInv = null;
        try {
          createdInv = await supabaseService.createInvoice({
            patient_id: item.patient_id,
            type: item.type,
            payment_method: item.payment_method,
            status: item.status,
            payment_status: item.payment_status,
            discount_amount: item.discount_amount,
            tax_amount: item.tax_amount,
            total_amount: item.total_amount,
            payable_amount: item.payable_amount,
            paid_amount: item.paid_amount,
            created_at: item.created_at
          }, item.items);
        } catch (e) {
          console.warn('DB creation of invoice failed, using local fallback.', e);
        }

        // Fallback for offline/local-only or if DB writes failed/returned null
        if (!createdInv) {
          const localId = 'demo-bill-' + Math.random().toString(36).substring(2, 9);
          const localInv = {
            id: localId,
            patient_id: item.patient_id,
            type: item.type,
            payment_method: item.payment_method,
            status: item.status,
            payment_status: item.payment_status,
            discount_amount: item.discount_amount,
            tax_amount: item.tax_amount,
            total_amount: item.total_amount,
            payable_amount: item.payable_amount,
            paid_amount: item.paid_amount,
            created_at: item.created_at,
            date: item.created_at.split('T')[0],
            isOffline: true
          };
          const existingBills = storage.get(STORAGE_KEYS.BILLING, []);
          storage.set(STORAGE_KEYS.BILLING, [localInv, ...existingBills]);

          const existingItems = storage.get('hms_invoice_items', []);
          const formattedItems = item.items.map(it => ({
            ...it,
            id: 'demo-item-' + Math.random().toString(36).substring(2, 9),
            invoice_id: localId
          }));
          storage.set('hms_invoice_items', [...formattedItems, ...existingItems]);
        }
      }
      
      toast.success('Successfully provisioned realistic clinical ledgers!');
      await fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to seed DB: ' + err.message);
    } finally {
      setSeeding(false);
    }
  };

  const [conPatientId, setConPatientId] = useState<string>('');
  const [conPatientSearch, setConPatientSearch] = useState<string>('');
  const [outstandingSearchQuery, setOutstandingSearchQuery] = useState<string>('');
  const [outstandingStatusFilter, setOutstandingStatusFilter] = useState<string>('all');
  const [ledgerStartDate, setLedgerStartDate] = useState<string>('');
  const [ledgerEndDate, setLedgerEndDate] = useState<string>('');

  const activePatientsWithOutstanding = useMemo(() => {
    return patients.map(p => {
      const patientBills = bills.filter(b => {
        const isPidMatch = b.patient_id === p.id || b.patientId === p.id;
        if (!isPidMatch) return false;

        const dateVal = b.created_at || b.date;
        if (!dateVal) return true; // Include if no date is set

        const bDate = new Date(dateVal);
        if (isNaN(bDate.getTime())) return true;

        if (ledgerStartDate) {
          const start = new Date(ledgerStartDate);
          if (bDate < start) return false;
        }

        if (ledgerEndDate) {
          const end = new Date(ledgerEndDate);
          // Set to end of day
          end.setHours(23, 59, 59, 999);
          if (bDate > end) return false;
        }

        return true;
      });

      const grossTotal = patientBills.reduce((sum, b) => sum + Number(b.total_amount || b.totalAmount || 0), 0);
      const discTotal = patientBills.reduce((sum, b) => sum + Number(b.discount_amount || b.discount || 0), 0);
      const payableTotal = Math.max(0, grossTotal - discTotal);
      const paidTotal = patientBills.reduce((sum, b) => sum + Number(b.paid_amount || b.paidAmount || 0), 0);
      const outstandingDues = Math.max(0, payableTotal - paidTotal);

      return {
        ...p,
        grossTotal,
        discTotal,
        payableTotal,
        paidTotal,
        outstandingDues,
        hasBills: patientBills.length > 0
      };
    })
    .filter(p => !isDummyPatient(p))
    .filter(p => {
      if (outstandingStatusFilter === 'all') {
        return p.hasBills;
      }
      if (outstandingStatusFilter === 'outstanding') {
        return p.outstandingDues > 0;
      }
      if (outstandingStatusFilter === 'settled') {
        return p.hasBills && p.outstandingDues === 0;
      }
      return true;
    })
    .filter(p => {
      if (!outstandingSearchQuery.trim()) return true;
      const q = outstandingSearchQuery.toLowerCase();
      return (p.name || '').toLowerCase().includes(q) ||
             (p.mrn || '').toLowerCase().includes(q) ||
             (p.phone || '').includes(q);
    });
  }, [patients, bills, outstandingSearchQuery, outstandingStatusFilter, ledgerStartDate, ledgerEndDate]);

  const [showConPatientResults, setShowConPatientResults] = useState<boolean>(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [billingPage, setBillingPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    setBillingPage(1);
  }, [searchQuery, filterCategory, recentInvoicesStartDate, recentInvoicesEndDate, filterPaymentMethod]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [isGeneratingBill, setIsGeneratingBill] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<any>(null);

  // Quick Add Patient state
  const [isQuickAddPatientOpen, setIsQuickAddPatientOpen] = useState(false);
  const [quickPatient, setQuickPatient] = useState({
    name: '',
    phone: '',
    gender: 'Male',
    age: '30'
  });
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);

  const handleSaveQuickPatient = async () => {
    if (!quickPatient.name.trim()) {
      toast.error('Please enter patient name');
      return;
    }
    setIsCreatingPatient(true);
    try {
      const created = await supabaseService.createPatient({
        name: quickPatient.name.trim(),
        phone: quickPatient.phone.trim() || 'N/A',
        gender: quickPatient.gender || 'Other',
        age: parseInt(quickPatient.age) || 30,
        address: 'Outpatient',
        status: 'Outpatient'
      });
      if (created) {
        toast.success(`Patient "${created.name}" added successfully!`);
        await fetchData();
        setNewInvoice((prev: any) => ({ ...prev, patientId: created.id }));
        setPatientSearchTerm(created.name);
        setIsQuickAddPatientOpen(false);
        setShowPatientResults(false);
      } else {
        toast.error('Failed to add patient');
      }
    } catch (err) {
      console.error('Error creating quick patient:', err);
      toast.error('Failed to add patient');
    } finally {
      setIsCreatingPatient(false);
    }
  };

  // States for Receive Payment Dialog
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentTargetBill, setPaymentTargetBill] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [paymentRemarks, setPaymentRemarks] = useState<string>('');
  const [paymentSearchTerm, setPaymentSearchTerm] = useState<string>('');
  const [paymentPatient, setPaymentPatient] = useState<any>(null);
  const [paymentSelectedBillId, setPaymentSelectedBillId] = useState<string>('');
  const [showPaymentPatientResults, setShowPaymentPatientResults] = useState<boolean>(false);
  const [paymentDateTime, setPaymentDateTime] = useState<string>('');

  // States for Collect All Patient Dues Dialog
  const [isCollectAllDuesOpen, setIsCollectAllDuesOpen] = useState(false);
  const [collectAllPatient, setCollectAllPatient] = useState<any>(null);
  const [collectAllAmount, setCollectAllAmount] = useState<string>('');
  const [collectAllMethod, setCollectAllMethod] = useState<string>('Cash');
  const [collectAllRef, setCollectAllRef] = useState<string>('');
  const [collectAllRemarks, setCollectAllRemarks] = useState<string>('');
  const [collectAllDateTime, setCollectAllDateTime] = useState<string>('');

  const handleOpenCollectAllDues = (patient: any) => {
    if (!patient) return;
    
    // Find all invoices with remaining dues for this patient
    const patientInvoices = bills.filter(b => b.patient_id === patient.id || b.patientId === patient.id);
    const totalDues = patientInvoices.reduce((sum, b) => {
      const gross = Number(b.total_amount || b.totalAmount || 0);
      const disc = Number(b.discount_amount || b.discount || 0);
      const paid = Number(b.paid_amount || b.paidAmount || 0);
      const due = Math.max(0, gross - disc - paid);
      return sum + due;
    }, 0);

    setCollectAllPatient(patient);
    setCollectAllAmount(totalDues > 0 ? totalDues.toFixed(2) : '0');
    setCollectAllMethod('Cash');
    setCollectAllRef('');
    setCollectAllRemarks(`Consolidated settlement of all outstanding patient dues.`);
    setCollectAllDateTime(getLocalDatetimeString());
    setIsCollectAllDuesOpen(true);
  };

  const handleProcessCollectAllDues = async () => {
    if (!collectAllPatient) {
      toast.error('No patient selected');
      return;
    }

    const amountNum = parseFloat(collectAllAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid payment amount greater than 0');
      return;
    }

    // Get all outstanding invoices for this patient, sorted by date ASC (FIFO)
    const patientInvoices = bills
      .filter(b => b.patient_id === collectAllPatient.id || b.patientId === collectAllPatient.id)
      .map(b => {
        const gross = Number(b.total_amount || b.totalAmount || 0);
        const disc = Number(b.discount_amount || b.discount || 0);
        const paid = Number(b.paid_amount || b.paidAmount || 0);
        const due = Math.max(0, gross - disc - paid);
        const dateStr = b.created_at || b.date || new Date().toISOString();
        return { ...b, due, dateValue: new Date(dateStr).getTime() };
      })
      .filter(b => b.due > 0)
      .sort((a, b) => a.dateValue - b.dateValue); // FIFO order: oldest first

    const totalOutstanding = patientInvoices.reduce((sum, b) => sum + b.due, 0);
    if (amountNum > totalOutstanding + 0.05) {
      toast.error(`Entered amount ₹${amountNum.toFixed(2)} exceeds total outstanding dues of ₹${totalOutstanding.toFixed(2)}`);
      return;
    }

    try {
      let remainingPayment = amountNum;
      let successCount = 0;
      let processedAmount = 0;

      // Distribute payment across invoices
      for (const invoice of patientInvoices) {
        if (remainingPayment <= 0) break;

        const paymentForThisInvoice = Math.min(invoice.due, remainingPayment);
        if (paymentForThisInvoice > 0) {
          const updated = await supabaseService.receivePayment(
            invoice.id, 
            paymentForThisInvoice, 
            collectAllMethod, 
            collectAllRef, 
            collectAllRemarks + ` (Consolidated batch payment)`,
            collectAllDateTime
          );

          if (updated) {
            successCount++;
            processedAmount += paymentForThisInvoice;
            logAudit('RECEIVE_PAYMENT', invoice.id, { 
              amount: paymentForThisInvoice, 
              method: collectAllMethod, 
              ref: collectAllRef, 
              date: collectAllDateTime,
              isConsolidated: true 
            });
          }
        }
        remainingPayment -= paymentForThisInvoice;
      }

      if (successCount > 0) {
        toast.success(`Successfully collected ₹${processedAmount.toFixed(2)} across ${successCount} outstanding invoice(s).`);
        await fetchData();
        setIsCollectAllDuesOpen(false);
      } else {
        toast.error('Failed to process consolidated payments.');
      }
    } catch (err: any) {
      toast.error('Error processing consolidated payments: ' + err.message);
    }
  };

  const handleOpenReceivePayment = (bill?: any) => {
    if (bill) {
      setPaymentTargetBill(bill);
      const remaining = Math.max(0, Number(bill.payable_amount || bill.payableAmount || bill.total_amount || bill.totalAmount || 0) - Number(bill.paid_amount || bill.paidAmount || 0));
      setPaymentAmount(remaining > 0 ? remaining.toString() : '0');
      setPaymentMethod(bill.payment_method || 'Cash');
      setPaymentRef(bill.payment_reference || '');
      setPaymentRemarks(bill.payment_remarks || '');
      setPaymentDateTime(getLocalDatetimeString());
      
      const pat = patients.find(p => p.id === (bill.patient_id || bill.patientId));
      setPaymentPatient(pat || null);
      setPaymentSelectedBillId(bill.id);
    } else {
      setPaymentTargetBill(null);
      setPaymentAmount('');
      setPaymentMethod('Cash');
      setPaymentRef('');
      setPaymentRemarks('');
      setPaymentDateTime(getLocalDatetimeString());
      setPaymentPatient(null);
      setPaymentSelectedBillId('');
      setPaymentSearchTerm('');
    }
    setIsPaymentOpen(true);
  };

  const handleProcessPayment = async () => {
    const billId = paymentTargetBill?.id || paymentSelectedBillId;
    if (!billId) {
      toast.error('Please select an invoice to record payment');
      return;
    }
    
    const amountNum = parseFloat(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid amount greater than 0');
      return;
    }
    
    const target = paymentTargetBill || bills.find(b => b.id === billId);
    if (!target) {
      toast.error('Invoice details not found');
      return;
    }
    
    const remaining = Number(target.payable_amount || target.payableAmount || target.total_amount || target.totalAmount || 0) - Number(target.paid_amount || target.paidAmount || 0);
    if (amountNum > remaining + 0.05) { // small offset for float comparison
      toast.error(`Entered amount ₹${amountNum} exceeds remaining dues of ₹${remaining.toFixed(2)}`);
      return;
    }
    
    try {
      const updated = await supabaseService.receivePayment(billId, amountNum, paymentMethod, paymentRef, paymentRemarks, paymentDateTime);
      if (updated) {
        toast.success(`Received ₹${amountNum.toFixed(2)} successfully against invoice`);
        logAudit('RECEIVE_PAYMENT', billId, { amount: amountNum, method: paymentMethod, ref: paymentRef, date: paymentDateTime });
        
        // Refresh component state
        await fetchData();
        setIsPaymentOpen(false);
      } else {
        toast.error('Failed to record payment');
      }
    } catch (err: any) {
      toast.error('Error recording payment: ' + err.message);
    }
  };

  // States for Refund Dialog
  const [isRefundOpen, setIsRefundOpen] = useState(false);
  const [refundTargetBill, setRefundTargetBill] = useState<any>(null);
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [refundMethod, setRefundMethod] = useState<string>('Cash');
  const [refundRemarks, setRefundRemarks] = useState<string>('');
  const [refundDateTime, setRefundDateTime] = useState<string>('');
  const [refundPatient, setRefundPatient] = useState<any>(null);

  const handleOpenRefund = (bill: any) => {
    if (bill) {
      setRefundTargetBill(bill);
      const paid = Number(bill.paid_amount || bill.paidAmount || 0);
      setRefundAmount(paid > 0 ? paid.toString() : '0');
      setRefundMethod(bill.payment_method || 'Cash');
      setRefundRemarks('');
      setRefundDateTime(getLocalDatetimeString());
      const pat = patients.find(p => p.id === (bill.patient_id || bill.patientId));
      setRefundPatient(pat || null);
    }
    setIsRefundOpen(true);
  };

  const handleProcessRefund = async () => {
    if (!refundTargetBill) {
      toast.error('No invoice selected for refund');
      return;
    }
    
    const refundAmt = parseFloat(refundAmount);
    if (isNaN(refundAmt) || refundAmt <= 0) {
      toast.error('Please enter a valid refund amount greater than 0');
      return;
    }

    const currentPaid = Number(refundTargetBill.paid_amount ?? refundTargetBill.paidAmount ?? 0);
    if (refundAmt > currentPaid) {
      toast.error(`Refund amount ₹${refundAmt} cannot exceed the paid amount of ₹${currentPaid}`);
      return;
    }

    try {
      const newPaid = Math.max(0, currentPaid - refundAmt);
      const statusText = newPaid <= 0 ? 'Refunded' : 'Partial';

      const origRemarks = refundTargetBill.payment_remarks || '';
      const dateStr = refundDateTime ? new Date(refundDateTime).toLocaleDateString() : new Date().toLocaleDateString();
      const refundRemark = `[Refunded ₹${refundAmt.toFixed(2)} via ${refundMethod} on ${dateStr}. Reason: ${refundRemarks}]`;
      const newRemarks = origRemarks ? `${origRemarks} ${refundRemark}` : refundRemark;

      const billToUpdate = {
        ...refundTargetBill,
        paid_amount: newPaid,
        payment_status: statusText,
        status: statusText,
        payment_remarks: newRemarks,
        updated_at: refundDateTime ? new Date(refundDateTime).toISOString() : new Date().toISOString()
      };

      if (currentUser?.name) {
        billToUpdate.refund_given_by = currentUser.name;
        billToUpdate.refundGivenBy = currentUser.name;
      }

      const result = await supabaseService.updateInvoice(refundTargetBill.id, billToUpdate);
      if (result) {
        toast.success(`Successfully refunded ₹${refundAmt.toFixed(2)} against invoice`);
        logAudit('ISSUE_REFUND', refundTargetBill.id, { refundAmount: refundAmt, method: refundMethod, remarks: refundRemarks, date: refundDateTime });
        
        await fetchData();
        setIsRefundOpen(false);
      } else {
        toast.error('Failed to update invoice refund details');
      }
    } catch (err: any) {
      toast.error('Error processing refund: ' + err.message);
    }
  };
  
  // Multi-item invoice state
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [showPatientResults, setShowPatientResults] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    patientId: '',
    paymentMode: 'Cash',
    discount: 0
  });

  const getLocalDatetimeString = (isoString?: string) => {
    const d = isoString ? new Date(isoString) : new Date();
    if (isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  // State hooks for Payment / Dating collections on Manual & Edit modes
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Partial' | 'Unpaid'>('Paid');
  const [initialPaidAmount, setInitialPaidAmount] = useState<string>('');
  const [invoiceDateTime, setInvoiceDateTime] = useState<string>('');
  const [invoicePaymentRef, setInvoicePaymentRef] = useState<string>('');

  const [editPaymentStatus, setEditPaymentStatus] = useState<'Paid' | 'Partial' | 'Unpaid'>('Paid');
  const [editPaidAmount, setEditPaidAmount] = useState<string>('');
  const [editInvoiceDateTime, setEditInvoiceDateTime] = useState<string>('');
  const [editPaymentRef, setEditPaymentRef] = useState<string>('');

  useEffect(() => {
    if (isInvoiceOpen) {
      setInvoiceDateTime(getLocalDatetimeString());
      setPaymentStatus('Paid');
      setInitialPaidAmount('');
      setInvoicePaymentRef('');
    }
  }, [isInvoiceOpen]);

  useEffect(() => {
    if (isEditOpen && editingBill) {
      setEditInvoiceDateTime(getLocalDatetimeString(editingBill.created_at || editingBill.date));
      
      const amtPaid = Number(editingBill.paid_amount ?? editingBill.paidAmount ?? 0);
      const payAmt = Number(editingBill.payable_amount ?? editingBill.payableAmount ?? 0);
      
      setEditPaidAmount(amtPaid.toString());
      setEditPaymentRef(editingBill.payment_reference || editingBill.paymentRef || '');
      
      let status: 'Paid' | 'Partial' | 'Unpaid' = 'Paid';
      if (amtPaid >= payAmt) {
        status = 'Paid';
      } else if (amtPaid > 0) {
        status = 'Partial';
      } else {
        status = 'Unpaid';
      }
      setEditPaymentStatus(status);
    }
  }, [isEditOpen, editingBill]);
  
  const [currentItem, setCurrentItem] = useState({
    category: '',
    description: '',
    amount: '',
    subType: '',
    quantity: '1',
    unitPrice: '',
    inventoryItemId: '',
    availableStock: undefined as number | undefined
  });

  const patientPrescriptions = useMemo(() => {
    if (!newInvoice.patientId) return [];
    return (prescriptions || []).filter((rx: any) => {
      const rxPatId = rx.patient_id || rx.patientId;
      return rxPatId === newInvoice.patientId || isIdMatch(rxPatId, newInvoice.patientId);
    });
  }, [newInvoice.patientId, prescriptions]);

  const handleImportPrescription = (rx: any) => {
    const meds = rx.medicines || rx.medications || [];
    if (!Array.isArray(meds) || meds.length === 0) {
      toast.error('No medicines found in this prescription.');
      return;
    }

    const itemsToAdd: any[] = [];
    meds.forEach((med: any) => {
      if (!med.name || !med.name.trim()) return;
      const invMatch = (inventory || []).find((i: any) =>
        (i.name || '').toLowerCase().includes(med.name.toLowerCase().trim()) ||
        med.name.toLowerCase().trim().includes((i.name || '').toLowerCase())
      );

      let qty = 1;
      if (med.quantity && !isNaN(parseInt(med.quantity))) {
        qty = parseInt(med.quantity);
      } else {
        const durDays = parseInt(med.duration) || 5;
        let freqMultiplier = 1;
        const freq = (med.frequency || '').toLowerCase();
        if (freq.includes('tds') || freq.includes('tid') || freq.includes('thrice') || freq.includes('1-1-1')) freqMultiplier = 3;
        else if (freq.includes('bd') || freq.includes('bid') || freq.includes('twice') || freq.includes('1-0-1') || freq.includes('0-1-1')) freqMultiplier = 2;
        else if (freq.includes('qid') || freq.includes('four')) freqMultiplier = 4;
        else freqMultiplier = 1;
        qty = Math.max(1, Math.min(60, durDays * freqMultiplier));
      }

      const unitRate = invMatch ? (Number(invMatch.sellingPrice ?? invMatch.mrp) || 15) : 15;
      const totalLineAmt = Math.round(unitRate * qty);

      const dosageText = med.dosage ? ' (' + med.dosage + ')' : '';
      const stockText = invMatch ? ' [Stock: ' + invMatch.stock + ']' : '';

      itemsToAdd.push({
        description: med.name + dosageText + ' - Qty: ' + qty + stockText,
        amount: totalLineAmt,
        category: 'pharmacy',
        quantity: qty,
        unitPrice: unitRate,
        inventoryItemId: invMatch?.id,
        medName: med.name
      });
    });

    if (itemsToAdd.length === 0) {
      toast.error('No valid medicines found to import.');
      return;
    }

    setInvoiceItems(prev => [...prev, ...itemsToAdd]);
    toast.success('Imported ' + itemsToAdd.length + ' prescribed medicines into invoice!');
  };

  const handleAddItem = () => {
    if (!currentItem.description || !currentItem.amount) {
      toast.error('Please select a service and ensure amount is valid');
      return;
    }
    const qty = parseInt(currentItem.quantity || '1') || 1;
    setInvoiceItems([...invoiceItems, { 
      description: currentItem.description, 
      amount: parseInt(currentItem.amount), 
      category: currentItem.category,
      quantity: qty,
      unitPrice: parseFloat(currentItem.unitPrice) || (parseInt(currentItem.amount) / qty),
      inventoryItemId: currentItem.inventoryItemId
    }]);
    setCurrentItem({ category: '', description: '', amount: '', subType: '', quantity: '1', unitPrice: '', inventoryItemId: '', availableStock: undefined });
  };

  const removeItem = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const totalInvoiceAmount = invoiceItems.reduce((sum, item) => sum + item.amount, 0);
  const finalAmount = Math.max(0, totalInvoiceAmount - (newInvoice.discount || 0));
  const finalEditAmount = Math.max(0, totalInvoiceAmount - (editingBill?.discount || 0));

  const handleCreateInvoice = async () => {
    if (isGeneratingBill) return;
    if (invoiceItems.length === 0) {
      toast.error('Please add at least one item or service to the invoice');
      return;
    }

    let targetPatientId = newInvoice.patientId;

    // Auto-match if user typed name/phone/MRN but didn't click dropdown item
    if (!targetPatientId && patientSearchTerm.trim()) {
      const term = patientSearchTerm.trim().toLowerCase();
      const matched = patients.find(p => 
        (p.name || '').toLowerCase() === term ||
        (p.mrn || '').toLowerCase() === term ||
        p.phone === patientSearchTerm.trim()
      ) || patients.find(p => 
        (p.name || '').toLowerCase().includes(term) ||
        (p.phone || '').includes(patientSearchTerm.trim()) ||
        (p.mrn || '').toLowerCase().includes(term)
      );

      if (matched) {
        targetPatientId = matched.id;
        setNewInvoice(prev => ({ ...prev, patientId: matched.id }));
      } else {
        toast.error('Billing facility is strictly restricted to registered IPD, OPD, Emergency, and Corporate patients only. Walk-in customer billing is prohibited. Please select a registered patient.');
        return;
      }
    }

    if (!targetPatientId) {
      toast.error('Billing facility is strictly restricted to registered IPD, OPD, Emergency, and Corporate patients only. Walk-in customer billing is prohibited.');
      return;
    }

    setIsGeneratingBill(true);

    try {
      const disc = Number(newInvoice.discount) || 0;
      const finalAmountVal = Math.max(0, totalInvoiceAmount - disc);
      
      let paidAmt = 0;
      let statusText = 'Unpaid';
      
      if (paymentStatus === 'Paid') {
        paidAmt = finalAmountVal;
        statusText = 'Paid';
      } else if (paymentStatus === 'Partial') {
        const entered = parseFloat(initialPaidAmount) || 0;
        paidAmt = Math.min(finalAmountVal, Math.max(0, entered));
        statusText = paidAmt >= finalAmountVal ? 'Paid' : (paidAmt > 0 ? 'Partial' : 'Unpaid');
      } else {
        paidAmt = 0;
        statusText = 'Unpaid';
      }

      const allPatients = (patients && patients.length > 0) ? patients : (storage.get(STORAGE_KEYS.PATIENTS, []) || []);
      const targetPatient = allPatients.find((p: any) => p.id === targetPatientId || p.mrn === targetPatientId);
      const deptInfo = getBillDepartmentAndType({ items: invoiceItems });
      const invoiceType = deptInfo.prefix === 'LAB' ? 'Lab' : 
                         deptInfo.prefix === 'RADIO' ? 'Radiology' : 
                         deptInfo.prefix === 'OPD' ? 'OPD' : 
                         deptInfo.prefix === 'IPD' ? 'IPD' : 
                         deptInfo.prefix === 'OT' ? 'OT' : 
                         deptInfo.prefix === 'PHARM' ? 'Pharmacy' : 'Independent';

      const billToAdd = {
        patient_id: targetPatient?.id || targetPatientId,
        patient_name: targetPatient?.name || patientSearchTerm || 'Registered Patient',
        patient_mrn: targetPatient?.mrn || (targetPatient?.id ? `MRN-${targetPatient.id.slice(-6)}` : ''),
        patient_phone: targetPatient?.phone || targetPatient?.mobile || '',
        patient_age: targetPatient?.age ? String(targetPatient.age) : '',
        patient_gender: targetPatient?.gender || '',
        patient_address: targetPatient?.address || '',
        patients: targetPatient,
        total_amount: totalInvoiceAmount,
        discount_amount: disc,
        payable_amount: finalAmountVal,
        paid_amount: paidAmt,
        payment_status: statusText,
        payment_method: paymentStatus === 'Unpaid' ? 'N/A' : newInvoice.paymentMode,
        payment_reference: invoicePaymentRef || '',
        status: statusText,
        type: invoiceType,
        invoice_number: generateDateWiseInvoiceNumber(deptInfo.prefix),
        created_by: currentUser?.id || 'u-accounts',
        issued_by: currentUser?.id || 'u-accounts',
        created_at: invoiceDateTime ? new Date(invoiceDateTime).toISOString() : new Date().toISOString()
      };
      
      const itemsToInsert = invoiceItems.map(item => ({
        item_name: item.description,
        quantity: 1,
        unit_price: item.amount,
        total_price: item.amount,
        category: item.category
      }));

      const result = await supabaseService.createInvoice(billToAdd, itemsToInsert);
      if (result) {
        // Auto-deduct stock for billed Pharmacy and Materials/Consumables
        const currentInv = storage.get(STORAGE_KEYS.INVENTORY, MOCK_INVENTORY) || [];
        let invChanged = false;
        const updatedInv = currentInv.map((invItem: any) => {
          const matchingBilledItem = invoiceItems.find((it: any) => 
            (it.inventoryItemId && it.inventoryItemId === invItem.id) ||
            (it.medName && it.medName.toLowerCase().trim() === (invItem.name || '').toLowerCase().trim()) ||
            (it.description && (invItem.name || '') && it.description.toLowerCase().includes((invItem.name || '').toLowerCase()))
          );
          if (matchingBilledItem) {
            const qtyDeduct = Number(matchingBilledItem.quantity) || 1;
            invChanged = true;
            return {
              ...invItem,
              stock: Math.max(0, (Number(invItem.stock) || 0) - qtyDeduct)
            };
          }
          return invItem;
        });
        if (invChanged) {
          storage.set(STORAGE_KEYS.INVENTORY, updatedInv);
          setInventory(updatedInv);
          window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table: 'inventory', action: 'update' } }));
        }

        await fetchData();
        setInvoiceItems([]);
        setNewInvoice({ patientId: '', paymentMode: 'Cash', discount: 0 });
        setPatientSearchTerm('');
        setShowPatientResults(false);
        setIsInvoiceOpen(false);
        toast.success('Independent invoice generated successfully!');
        logAudit('CREATE_INVOICE', result.id, { bill: result });
      } else {
        toast.error('Failed to create invoice');
      }
    } catch (err: any) {
      console.error('Error generating bill:', err);
      toast.error('An error occurred while generating the bill');
    } finally {
      setIsGeneratingBill(false);
    }
  };

  const handleCategoryChange = (val: string) => {
    setCurrentItem({ category: val, description: '', amount: '', subType: '', quantity: '1', unitPrice: '', inventoryItemId: '', availableStock: undefined });
  };

  const handleSubTypeChange = (val: string) => {
    let rate = 0;
    let description = val;
    let invId = '';
    let stockVal: number | undefined = undefined;

    const services = getServicesByCategory(currentItem.category);
    const found = services.find((s: any) => s.name === val);
    if (found) {
      rate = found.rate;
      description = found.name;
      invId = found.id || '';
      stockVal = found.stock;
    } else {
      if (currentItem.category === 'ot') {
        const foundOt = otRates.find((r: any) => r.type === val);
        rate = foundOt?.rate || 0;
        description = `${val} Surgery Charges`;
      } else if (currentItem.category === 'ipd') {
        const foundBed = bedRates.find((r: any) => r.type === val);
        rate = foundBed?.rate || 0;
        description = `${val} Bed Charges (1 Day)`;
      } else if (currentItem.category === 'lab' || currentItem.category === 'path' || currentItem.category === 'radio') {
        const foundLab = labRates.find((r: any) => r.name === val);
        rate = foundLab?.price || 0;
        description = val;
      } else if (currentItem.category === 'materials') {
        const foundMat = materialRates.find((r: any) => r.name === val);
        rate = foundMat?.price || 0;
        description = val;
      } else if (currentItem.category === 'opd') {
        rate = 500;
        description = 'OPD Consultation Fee';
      } else if (currentItem.category === 'custom') {
        rate = 0;
        description = '';
      }
    }

    const qty = parseInt(currentItem.quantity || '1') || 1;
    const totalAmt = Math.round(rate * qty);

    setCurrentItem({ 
      ...currentItem, 
      subType: val, 
      unitPrice: rate.toString(),
      amount: totalAmt.toString(), 
      description: qty > 1 ? `${description} (Qty: ${qty})` : description,
      inventoryItemId: invId,
      availableStock: stockVal
    });
  };

  const filteredBills = bills.filter(bill => {
    if (!bill) return false;
    const patInfo = getBillPatientInfo(bill);
    const mappedSerial = activeInvoiceMap[bill.id] || sequentialIdMap[bill.id] || departmentIdMap[bill.id] || '';
    const q = searchQuery.toLowerCase().trim();
    
    const searchMatch = !q ||
      (bill.id || '').toLowerCase().includes(q) ||
      mappedSerial.toLowerCase().includes(q) ||
      (patInfo.name || '').toLowerCase().includes(q) ||
      (patInfo.mrn || '').toLowerCase().includes(q) ||
      (patInfo.phone || '').includes(q) ||
      (bill.patients?.name || '').toLowerCase().includes(q);

    
    let categoryMatch = false;
    if (filterCategory === 'all') {
      categoryMatch = true;
    } else {
      const bType = (bill.type || '').toLowerCase();
      const bMethod = (bill.payment_method || '').toLowerCase();
      const hasItemCategory = (cat: string) => 
        (bill.invoice_items || []).some((item: any) => 
          item && item.category && item.category.toLowerCase() === cat.toLowerCase()
        );
      
      if (filterCategory === 'opd') {
        const deptInfo = getBillDepartmentAndType(bill);
        categoryMatch = bType === 'opd' || deptInfo.prefix === 'OPD' || hasItemCategory('opd');
      } else if (filterCategory === 'endoscopy') {
        const deptInfo = getBillDepartmentAndType(bill);
        categoryMatch = bType === 'endoscopy' || bType === 'endo' || deptInfo.prefix === 'ENDO' || deptInfo.departmentName.toLowerCase().includes('endo') || hasItemCategory('endoscopy') || hasItemCategory('endo');
      } else if (filterCategory === 'ipd') {
        categoryMatch = bType === 'ipd' || hasItemCategory('ipd');
      } else if (filterCategory === 'lab') {
        categoryMatch = bType === 'lab' || hasItemCategory('lab') || hasItemCategory('path');
      } else if (filterCategory === 'radiology') {
        categoryMatch = bType === 'radiology' || hasItemCategory('radio') || hasItemCategory('radiology');
      } else if (filterCategory === 'pharmacy') {
        categoryMatch = bType === 'pharmacy' || hasItemCategory('pharmacy');
      } else if (filterCategory === 'ot') {
        categoryMatch = bType === 'ot' || hasItemCategory('ot');
      } else if (filterCategory === 'insurance') {
        categoryMatch = bMethod === 'insurance' || bType.includes('insurance');
      } else if (filterCategory === 'refunds') {
        categoryMatch = (bill.status || '').toLowerCase() === 'refunded' || 
                        (bill.payment_status || '').toLowerCase() === 'refunded' || 
                        (bill.payment_remarks || '').includes('[Refunded');
      } else if (filterCategory === 'custom') {
        categoryMatch = bType === 'custom' || hasItemCategory('custom');
      }
    }
    
    const billDateStr = bill.created_at || bill.date || bill.created_date || bill.invoice_date || '';
    const billDate = getCleanDateString(billDateStr) || (billDateStr ? billDateStr.split('T')[0] : '');
    
    let dateRangeMatch = true;
    if (recentInvoicesStartDate) {
      dateRangeMatch = dateRangeMatch && !!billDate && billDate >= recentInvoicesStartDate;
    }
    if (recentInvoicesEndDate) {
      dateRangeMatch = dateRangeMatch && !!billDate && billDate <= recentInvoicesEndDate;
    }

    let paymentMethodMatch = true;
    if (filterPaymentMethod !== 'all') {
      const bMethod = (bill.payment_method || bill.paymentMethod || bill.paymentMode || '').toLowerCase();
      const target = filterPaymentMethod.toLowerCase();
      if (target === 'cash') {
        paymentMethodMatch = bMethod.includes('cash');
      } else if (target === 'upi') {
        paymentMethodMatch = bMethod.includes('upi') || bMethod.includes('qr') || bMethod.includes('gpay') || bMethod.includes('phonepe') || bMethod.includes('paytm');
      } else if (target === 'card') {
        paymentMethodMatch = bMethod.includes('card') || bMethod.includes('debit') || bMethod.includes('credit') || bMethod.includes('pos');
      } else if (target === 'bank' || target === 'bank transfer' || target === 'neft') {
        paymentMethodMatch = bMethod.includes('bank') || bMethod.includes('transfer') || bMethod.includes('neft') || bMethod.includes('rtgs') || bMethod.includes('netbanking');
      } else if (target === 'cheque' || target === 'dd') {
        paymentMethodMatch = bMethod.includes('cheque') || bMethod.includes('dd');
      } else if (target === 'insurance' || target === 'tpa') {
        paymentMethodMatch = bMethod.includes('insurance') || bMethod.includes('tpa') || bMethod.includes('claim');
      } else if (target === 'multi-mode') {
        paymentMethodMatch = bMethod.includes('multi') || bMethod.includes('split');
      } else {
        paymentMethodMatch = bMethod.includes(target);
      }
    }
    
    return searchMatch && categoryMatch && dateRangeMatch && paymentMethodMatch;
  });

  const groupedBillsByDate = useMemo(() => {
    return bills.reduce((acc: Record<string, any[]>, bill) => {
      let dateKey = '';
      const rawDate = bill.date || bill.created_at || bill.created_date || bill.invoice_date;
      if (rawDate) {
        if (typeof rawDate === 'string') {
          const match = rawDate.match(/^\d{4}-\d{2}-\d{2}/);
          if (match) dateKey = match[0];
        }
        if (!dateKey) {
          try {
            const d = new Date(rawDate);
            if (!isNaN(d.getTime())) {
              dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            }
          } catch {
            // ignore
          }
        }
      }
      if (!dateKey) {
        const now = new Date();
        dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      }
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(bill);
      return acc;
    }, {});
  }, [bills]);

  const handleDeleteBill = async (id: string) => {
    const roleUpper = (currentUser?.role || '').toUpperCase();
    if (roleUpper === 'RECEPTIONIST' || roleUpper === 'RECEPTION' || roleUpper === 'FRONT_DESK' || roleUpper === 'DOCTOR' || roleUpper === 'SURGEON' || roleUpper === 'ACCOUNTANT' || roleUpper === 'ACCOUNTS') {
      toast.error('Deletion of invoices is restricted for Front Office, Doctor, and Accountant roles.');
      return;
    }
    const billToDelete = bills.find(b => b.id === id);
    if (billToDelete && !canModify(billToDelete)) {
      toast.error('This invoice was created by administration and cannot be cancelled by non-admin roles.');
      return;
    }
    if (!window.confirm("Are you sure you want to cancel and delete this invoice?")) {
      return;
    }
    const success = await supabaseService.deleteInvoice(id);
    if (success) {
      logAudit('DELETE', id, { bill: billToDelete });
      setBills(bills.filter(b => b.id !== id));
      toast.success('Invoice cancelled');
    } else {
      toast.error('Failed to cancel invoice');
    }
  };

  const handleClearAllInvoices = async () => {
    if (!window.confirm("Are you sure you want to CLEAR ALL old bills from billings? This will purge all old billing records.")) {
      return;
    }
    try {
      const allBills = [...bills];
      for (const b of allBills) {
        await supabaseService.deleteInvoice(b.id).catch(() => null);
      }
      storage.set(STORAGE_KEYS.BILLING, []);
      setBills([]);
      toast.success("All old bills have been successfully removed from billings!");
    } catch (e) {
      toast.error("Failed to clear bills");
    }
  };

  const handleExportBilling = () => {
    const headers = ['Invoice ID', 'Patient MRN', 'Date', 'Amount', 'Status', 'Mode'];
    const rows = bills.map(b => [
      b.id,
      b.patients?.mrn || 'N/A',
      b.created_at,
      b.total_amount,
      b.status,
      b.payment_method || 'N/A'
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'hospital_billing.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Billing data exported');
  };

  const handleEditBill = (bill: any) => {
    if (bill && !canModify(bill)) {
      toast.error('This invoice was created by administration and cannot be modified by non-admin roles.');
      return;
    }
    setEditingBill({ ...bill });
    const rawItems = bill.invoice_items || bill.items || [];
    const formattedItems = rawItems.map((it: any) => ({
      description: it.item_name || it.description || 'Service/Medicine',
      amount: Number(it.unit_price || it.amount || it.total_price || 0),
      category: it.category || 'OPD'
    }));
    setInvoiceItems(formattedItems);
    setIsEditOpen(true);
  };

  const handleUpdateInvoice = async () => {
    if (invoiceItems.length === 0) {
      toast.error('Add at least one item');
      return;
    }

    if (editingBill && !canModify(editingBill)) {
      toast.error('This invoice was created by administration and cannot be modified by non-admin roles.');
      return;
    }
    
    const disc = Number(editingBill.discount) || 0;
    const finalEditAmountVal = Math.max(0, totalInvoiceAmount - disc);
    
    let paidAmt = 0;
    let statusText = 'Unpaid';
    
    if (editPaymentStatus === 'Paid') {
      paidAmt = finalEditAmountVal;
      statusText = 'Paid';
    } else if (editPaymentStatus === 'Partial') {
      const entered = parseFloat(editPaidAmount) || 0;
      paidAmt = Math.min(finalEditAmountVal, Math.max(0, entered));
      statusText = paidAmt >= finalEditAmountVal ? 'Paid' : (paidAmt > 0 ? 'Partial' : 'Unpaid');
    } else {
      paidAmt = 0;
      statusText = 'Unpaid';
    }

    const billToUpdate = {
      patient_id: editingBill.patient_id || editingBill.patientId,
      total_amount: totalInvoiceAmount,
      discount_amount: disc,
      payable_amount: finalEditAmountVal,
      paid_amount: paidAmt,
      payment_method: editPaymentStatus === 'Unpaid' ? 'N/A' : (editingBill.paymentMode || editingBill.payment_method || 'Cash'),
      payment_reference: editPaymentRef || '',
      payment_status: statusText,
      status: statusText,
      type: editingBill.type || 'Independent',
      created_by: editingBill.created_by || editingBill.issued_by,
      created_at: editInvoiceDateTime ? new Date(editInvoiceDateTime).toISOString() : (editingBill.created_at || editingBill.date || new Date().toISOString())
    };

    const itemsToInsert = invoiceItems.map(item => ({
      item_name: item.description,
      quantity: 1,
      unit_price: item.amount,
      total_price: item.amount,
      category: item.category
    }));

    try {
      const result = await supabaseService.updateInvoice(editingBill.id, billToUpdate, itemsToInsert);
      if (result) {
        logAudit('UPDATE', editingBill.id, { before: editingBill, after: result });
        await fetchData();
        setIsEditOpen(false);
        setEditingBill(null);
        setInvoiceItems([]);
        toast.success('Invoice updated successfully');
      } else {
        toast.error('Failed to update invoice');
      }
    } catch (err: any) {
      console.error('Error updating invoice:', err);
      toast.error('Error: ' + err.message);
    }
  };

  const printInvoice = (rawBill: any) => {
    const allPatients = (patients && patients.length > 0) ? patients : (storage.get(STORAGE_KEYS.PATIENTS, []) || []);
    const patientInfo = getBillPatientInfo(rawBill);
    const directPatient = allPatients.find((p: any) => 
      (rawBill.patientId && (p.id === rawBill.patientId || p.mrn === rawBill.patientId)) ||
      (rawBill.patient_id && (p.id === rawBill.patient_id || p.mrn === rawBill.patient_id)) ||
      (rawBill.patient_mrn && (p.mrn === rawBill.patient_mrn || p.id === rawBill.patient_mrn))
    ) || rawBill.patients;

    const patientName = (patientInfo.name && patientInfo.name !== 'Registered Patient' && patientInfo.name.toLowerCase() !== 'walk-in' && patientInfo.name.toLowerCase() !== 'walk-in patient')
      ? patientInfo.name
      : (directPatient?.name || rawBill.patient_name || rawBill.patientName || rawBill.customer_name || 'Walk-in Patient');

    const patientMrn = (patientInfo.mrn && patientInfo.mrn !== 'N/A')
      ? patientInfo.mrn
      : (directPatient?.mrn || rawBill.patient_mrn || rawBill.patientMrn || (directPatient?.id ? `MRN-${directPatient.id.slice(-6)}` : 'N/A'));

    const patientAge = patientInfo.age || directPatient?.age || rawBill.patient_age || rawBill.age || '';
    const patientGender = patientInfo.gender || directPatient?.gender || rawBill.patient_gender || rawBill.gender || '';
    const patientAgeGender = (patientAge && patientGender)
      ? `${patientAge} Y / ${patientGender}`
      : (patientAge ? `${patientAge} Y` : (patientGender ? patientGender : 'N/A'));

    const patientPhone = (patientInfo.phone && patientInfo.phone !== 'N/A')
      ? patientInfo.phone
      : (directPatient?.phone || directPatient?.mobile || rawBill.patient_phone || rawBill.phone || 'N/A');

    const patientAddress = patientInfo.address || directPatient?.address || rawBill.patient_address || rawBill.address || '';

    const itemsList = rawBill.invoice_items || rawBill.items || [];
    const subTotal = Number(rawBill.total_amount || rawBill.totalAmount || rawBill.total || 0);
    const discountAmt = Number(rawBill.discount_amount || rawBill.discount || 0);
    const totalPaid = Number(rawBill.paid_amount || rawBill.paidAmount || (subTotal - discountAmt));
    
    const bill = {
      ...rawBill,
      date: rawBill.created_at || rawBill.date || new Date().toISOString(),
      paymentMode: rawBill.payment_method || rawBill.paymentMode || 'Cash',
      totalAmount: subTotal,
      discount: discountAmt,
      paidAmount: totalPaid,
      items: itemsList.map((item: any) => ({
        description: item.item_name || item.name || item.description || 'Service/Medicine',
        category: item.category || 'General',
        amount: Number(item.unit_price || item.total_price || item.amount || 0)
      }))
    };

    const deptInfo = getBillDepartmentAndType(bill);
    const billingTypeDisplay = deptInfo.billingType;
    const invoiceNumberDisplay = activeInvoiceMap[bill.id] || sequentialIdMap[bill.id] || bill.invoice_number || (bill.id ? String(bill.id).toUpperCase() : 'INV-001');

    const formatItemCategory = (cat: string) => {
      const c = String(cat || '').toLowerCase();
      if (c === 'lab' || c === 'pathology' || c === 'path' || c === 'laboratory') return 'PATHOLOGY / LAB';
      if (c === 'radio' || c === 'radiology') return 'RADIOLOGY';
      if (c === 'ot' || c === 'surgery') return 'SURGERY / OT';
      if (c === 'ipd' || c === 'ward') return 'IPD / WARD';
      if (c === 'opd') return 'OPD / CONSULTATION';
      if (c === 'pharmacy' || c === 'pharm' || c === 'medicine') return 'PHARMACY';
      return (cat || 'GENERAL').toUpperCase();
    };

    const printWindow = window.open('', '_blank', 'width=850,height=800');
    if (!printWindow) {
      toast.error('Please allow popups to print invoice');
      return;
    }

    const netPayable = bill.paidAmount || (bill.totalAmount - (bill.discount || 0));
    const inWordsText = numberToWords(netPayable);

    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Tax Invoice - #${activeInvoiceMap[bill.id] || sequentialIdMap[bill.id] || bill.id}</title>
          <style>
            @page { 
              size: A4 portrait; 
              margin: 12mm 15mm 12mm 15mm; 
            }
            * {
              box-sizing: border-box;
            }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
              margin: 0; 
              padding: 0;
              color: #0f172a;
              background: #ffffff;
              line-height: 1.4;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .invoice-wrapper {
              width: 100%;
              max-width: 190mm;
              margin: 0 auto;
              background: #ffffff;
            }
            
            /* Header Section */
            .hospital-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 2.5px solid #0284c7;
              padding-bottom: 12px;
              margin-bottom: 16px;
            }
            .brand-left {
              display: flex;
              align-items: center;
              gap: 14px;
            }
            .hospital-logo {
              max-height: 65px;
              max-width: 140px;
              object-fit: contain;
            }
            .hospital-title-block {
              display: flex;
              flex-direction: column;
            }
            .hospital-name { 
              font-size: 22px; 
              font-weight: 900; 
              color: #0284c7; 
              letter-spacing: -0.02em; 
              margin: 0;
              text-transform: uppercase;
            }
            .hospital-tagline {
              font-size: 10px;
              font-weight: 700;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              margin-top: 2px;
            }
            .hospital-contact-block {
              text-align: right;
              font-size: 10.5px;
              color: #475569;
              line-height: 1.35;
              font-weight: 500;
            }

            /* Document Title Badge */
            .title-bar {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 14px;
              padding: 6px 12px;
              background-color: #f0f9ff;
              border: 1px solid #bae6fd;
              border-radius: 6px;
            }
            .bill-title { 
              font-size: 14px; 
              font-weight: 800; 
              color: #0369a1; 
              text-transform: uppercase;
              letter-spacing: 0.06em;
              margin: 0;
            }
            .invoice-type-tag {
              font-size: 11px;
              font-weight: 800;
              color: #059669;
              background: #ecfdf5;
              border: 1px solid #a7f3d0;
              padding: 2px 8px;
              border-radius: 4px;
              text-transform: uppercase;
            }

            /* Meta Information Grid */
            .info-grid { 
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 12px 16px;
              margin-bottom: 16px;
              display: grid;
              grid-template-columns: 1.2fr 1fr;
              gap: 20px;
              background-color: #f8fafc;
            }
            .meta-block {
              display: flex;
              flex-direction: column;
              gap: 4px;
            }
            .meta-heading {
              font-size: 10px;
              font-weight: 800;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 3px;
              margin-bottom: 4px;
            }
            .meta-row {
              display: flex;
              font-size: 12px;
              line-height: 1.4;
            }
            .meta-label { 
              width: 90px;
              color: #64748b; 
              font-weight: 600; 
              flex-shrink: 0;
            }
            .meta-value { 
              font-weight: 700; 
              color: #0f172a; 
            }
            
            /* Itemized Table */
            .invoice-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 16px; 
            }
            .invoice-table th { 
              text-align: left; 
              background-color: #f1f5f9;
              padding: 8px 10px; 
              color: #334155; 
              font-size: 10.5px; 
              text-transform: uppercase; 
              font-weight: 800;
              border-top: 1px solid #cbd5e1;
              border-bottom: 2px solid #cbd5e1;
            }
            .invoice-table td { 
              padding: 8px 10px; 
              border-bottom: 1px solid #e2e8f0; 
              font-size: 12px; 
            }
            .service-desc { 
              font-weight: 700; 
              color: #1e293b; 
            }
            .service-cat { 
              font-size: 10px; 
              color: #64748b; 
              text-transform: uppercase; 
              font-weight: 600; 
              margin-top: 1px; 
            }
            
            /* Financial Summary Block */
            .summary-container {
              display: grid;
              grid-template-columns: 1.2fr 1fr;
              gap: 20px;
              margin-bottom: 20px;
              page-break-inside: avoid;
            }
            .words-box {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 12px 14px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            .words-title {
              font-size: 10px;
              font-weight: 800;
              color: #64748b;
              text-transform: uppercase;
              margin-bottom: 4px;
            }
            .words-text {
              font-size: 12px;
              font-weight: 700;
              color: #0369a1;
              line-height: 1.3;
            }
            .payment-mode-line {
              margin-top: 8px;
              font-size: 11.5px;
              color: #334155;
            }
            .notes-line {
              margin-top: 4px;
              font-size: 10px;
              color: #64748b;
            }

            .total-card {
              background-color: #f8fafc;
              border-radius: 8px;
              border: 1px solid #e2e8f0;
              padding: 12px 14px;
            }
            .total-row { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 6px; 
              font-size: 12px; 
              color: #475569;
            }
            .total-row span:last-child {
              font-weight: 700;
              color: #0f172a;
            }
            .grand-total { 
              border-top: 2px solid #0284c7; 
              margin-top: 8px; 
              padding-top: 8px; 
              font-weight: 800; 
              font-size: 14.5px; 
              color: #0284c7; 
            }
            .grand-total span:last-child {
              color: #0284c7;
              font-weight: 900;
            }

            /* Signature Section */
            .sig-section { 
              display: flex; 
              justify-content: space-between; 
              margin-top: 40px; 
              margin-bottom: 20px;
              page-break-inside: avoid;
            }
            .sig-box { 
              width: 190px; 
              text-align: center; 
            }
            .sig-line { 
              border-top: 1.5px solid #334155; 
              margin-bottom: 5px; 
            }
            .sig-label { 
              font-size: 10.5px; 
              font-weight: 800; 
              color: #475569; 
              text-transform: uppercase; 
              letter-spacing: 0.04em;
            }

            /* Footer Disclaimer */
            .footer { 
              text-align: center;
              border-top: 1px dashed #cbd5e1;
              padding-top: 10px;
              page-break-inside: avoid;
            }
            .footer-notice {
              color: #94a3b8; 
              font-size: 10px;
            }
            .footer-brand {
              font-weight: 800; 
              color: #0284c7; 
              margin-top: 4px;
              font-size: 11px;
              letter-spacing: 0.03em;
            }

            @media print {
              html, body {
                height: 100%;
                background: #ffffff !important;
              }
              .invoice-wrapper {
                width: 100% !important;
                max-width: 100% !important;
              }
              tr { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-wrapper">
            <!-- Hospital Brand Header -->
            <div class="hospital-header">
              <div class="brand-left">
                ${(hospitalInfo.logo && hospitalInfo.logo !== 'null' && hospitalInfo.logo !== 'undefined' && hospitalInfo.logo.trim() !== '') ? `<img src="${hospitalInfo.logo}" class="hospital-logo" alt="Hospital Logo" />` : ''}
                <div class="hospital-title-block">
                  <div class="hospital-name">${hospitalInfo.name}</div>
                  <div class="hospital-tagline">Advanced Digestive & Surgical Care</div>
                </div>
              </div>
              <div class="hospital-contact-block">
                <div>${hospitalInfo.address}</div>
                <div>Tel: ${hospitalInfo.phone} | Email: ${hospitalInfo.email || 'gatroplusbhopal@gmail.com'}</div>
                <div>Web: ${hospitalInfo.website || 'www.gastroplusbhopal.com'}</div>
              </div>
            </div>

            <!-- Title & Status -->
            <div class="title-bar">
              <div class="bill-title">Consolidated Bill / Tax Invoice</div>
              <div class="invoice-type-tag">Status: ${bill.status || 'PAID'}</div>
            </div>

            <!-- Metadata Info Grid -->
            <div class="info-grid">
              <div class="meta-block">
                <div class="meta-heading">Patient Details</div>
                <div class="meta-row"><span class="meta-label">Name:</span> <span class="meta-value" style="font-size: 13.5px; text-transform: uppercase;">${patientName}</span></div>
                <div class="meta-row"><span class="meta-label">MRN / ID:</span> <span class="meta-value">${patientMrn}</span></div>
                <div class="meta-row"><span class="meta-label">Age / Gender:</span> <span class="meta-value">${patientAgeGender}</span></div>
                <div class="meta-row"><span class="meta-label">Contact No:</span> <span class="meta-value">${patientPhone}</span></div>
                ${patientAddress ? `<div class="meta-row"><span class="meta-label">Address:</span> <span class="meta-value">${patientAddress}</span></div>` : ''}
              </div>
              <div class="meta-block">
                <div class="meta-heading">Invoice Details</div>
                <div class="meta-row"><span class="meta-label">Invoice No:</span> <span class="meta-value">#${invoiceNumberDisplay}</span></div>
                <div class="meta-row"><span class="meta-label">Invoice Date:</span> <span class="meta-value">${formatDate(bill.date)}</span></div>
                <div class="meta-row"><span class="meta-label">Payment Mode:</span> <span class="meta-value">${bill.paymentMode || 'Cash'}</span></div>
                <div class="meta-row"><span class="meta-label">Billing Type:</span> <span class="meta-value" style="color: #0284c7; font-weight: 800;">${billingTypeDisplay}</span></div>
              </div>
            </div>

            <!-- Services / Charges Table -->
            <table class="invoice-table">
              <thead>
                <tr>
                  <th style="width: 6%;">#</th>
                  <th style="width: 54%;">Service / Item Description</th>
                  <th style="width: 22%;">Department / Category</th>
                  <th style="width: 18%; text-align: right;">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                ${bill.items.map((item: any, idx: number) => `
                  <tr>
                    <td style="color: #64748b; font-weight: 600;">${idx + 1}</td>
                    <td>
                      <div class="service-desc">${item.description}</div>
                    </td>
                    <td>
                      <div class="service-cat">${formatItemCategory(item.category)}</div>
                    </td>
                    <td style="text-align: right; font-weight: 700;">${formatCurrency(item.amount)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <!-- Summary & Amount in Words -->
            <div class="summary-container">
              <div class="words-box">
                <div>
                  <div class="words-title">Amount in Words</div>
                  <div class="words-text">Rupees ${inWordsText}</div>
                </div>
                <div>
                  <div class="payment-mode-line"><strong>Payment Mode:</strong> ${bill.paymentMode || 'Cash'} (Received in Full)</div>
                  <div class="notes-line"><strong>Notes:</strong> Please retain this invoice for your claims and records.</div>
                </div>
              </div>
              <div class="total-card">
                <div class="total-row"><span>Sub-Total:</span> <span>${formatCurrency(bill.totalAmount)}</span></div>
                <div class="total-row"><span>Discount:</span> <span>${formatCurrency(bill.discount || 0)}</span></div>
                <div class="total-row grand-total"><span>Total Paid Amount:</span> <span>${formatCurrency(netPayable)}</span></div>
              </div>
            </div>

            <!-- Signature Section -->
            <div class="sig-section">
              <div class="sig-box">
                <div class="sig-line"></div>
                <div class="sig-label">Receiver's Signature</div>
              </div>
              <div class="sig-box">
                <div class="sig-line"></div>
                <div class="sig-label">Authorized Signatory</div>
              </div>
            </div>

            <!-- Legal Footer -->
            <div class="footer">
              <div class="footer-notice">This is a computer-generated tax invoice & money receipt. No physical signature is required.</div>
              <div class="footer-brand">${hospitalInfo.name.toUpperCase()} • HEALING HANDS, CARING HEARTS</div>
            </div>
          </div>
          
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 700);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(invoiceHtml);
    printWindow.document.close();
  };

  const printConsolidatedStatement = (patient: any, conBills: any[]) => {
    const printWindow = window.open('', '_blank', 'width=850,height=750');
    if (!printWindow) {
      toast.error('Please allow popups to print');
      return;
    }

    const itemsByDate: Record<string, any[]> = {};
    let grandTotal = 0;
    let grandDiscount = 0;
    let grandPaid = 0;

    conBills.forEach(b => {
      const dateKey = formatDate(b.created_at || b.date);
      if (!itemsByDate[dateKey]) itemsByDate[dateKey] = [];
      
      const billItems = b.invoice_items || b.items || [];
      billItems.forEach((it: any) => {
        const desc = it.item_name || it.description || 'Service/Medicine';
        const amt = Number(it.unit_price || it.amount || it.total_price || 0);
        const cat = it.category || 'General';
        itemsByDate[dateKey].push({ description: desc, amount: amt, category: cat, source: b.type || 'Hospital Bill' });
      });

      grandTotal += Number(b.total_amount || b.totalAmount || b.total || 0);
      grandDiscount += Number(b.discount_amount || b.discount || 0);
      grandPaid += Number(b.paid_amount || b.paidAmount || 0);
    });

    const consolidatedHtml = `
      <html>
        <head>
          <title>Consolidated Statement - ${patient?.name}</title>
          <style>
            @page { margin: 10mm; size: A4; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              margin: 0; 
              padding: 0;
              color: #1e293b;
              line-height: 1.5;
              -webkit-print-color-adjust: exact;
            }
            .content { 
              padding: 15px; 
              margin: 0 20px;
            }
            .hospital-header {
              text-align: center;
              margin-bottom: 15px;
              border-bottom: 2px solid #0f172a;
              padding-bottom: 10px;
            }
            .hospital-name { font-size: 24px; font-weight: 800; color: #1e3a8a; margin-bottom: 4px; }
            .bill-title { 
              text-align: center; 
              font-size: 18px; 
              font-weight: 800; 
              margin: 10px 0; 
              color: #0f172a; 
              text-transform: uppercase;
              letter-spacing: 0.1em;
            }
            .patient-info { 
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              padding: 10px 14px;
              margin-bottom: 15px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              background-color: #f8fafc;
            }
            .info-label { color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 10px; }
            .info-value { font-weight: 800; color: #0f172a; font-size: 12px; }
            
            .date-header {
              background-color: #f1f5f9;
              padding: 6px 10px;
              font-weight: 800;
              color: #1e293b;
              font-size: 12px;
              border-left: 4px solid #1e3a8a;
              margin-top: 15px;
              margin-bottom: 8px;
              display: flex;
              justify-content: space-between;
            }
            .invoice-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
            .invoice-table th { 
              text-align: left; 
              background-color: #f8fafc;
              padding: 6px 10px; 
              color: #475569; 
              font-size: 11px; 
              text-transform: uppercase; 
              font-weight: 800;
              border-bottom: 1px solid #e2e8f0;
            }
            .invoice-table td { padding: 6px 10px; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
            .service-desc { font-weight: 700; color: #1e293b; }
            .service-cat { font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 700; margin-top: 2px; }
            
            .summary-section {
              margin-top: 15px;
              display: flex;
              justify-content: flex-end;
              page-break-inside: avoid;
            }
            .total-card {
              width: 320px;
              padding: 12px 16px;
              background-color: #f8fafc;
              border-radius: 8px;
              border: 1px solid #cbd5e1;
            }
            .total-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; }
            .grand-total { 
              border-top: 2px solid #1e3a8a; 
              margin-top: 10px; 
              padding-top: 10px; 
              font-weight: 800; 
              font-size: 15px; 
              color: #1e3a8a; 
            }
            .sig-section { display: flex; justify-content: space-between; margin-top: 35px; page-break-inside: avoid; }
            .sig-box { width: 220px; text-align: center; }
            .sig-line { border-top: 2px solid #0f172a; margin-bottom: 6px; }
            .sig-label { font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; }

            @media print {
              html, body {
                height: 99%;
                overflow: hidden;
              }
              tr { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="content">
            <div class="hospital-header">
              ${(hospitalInfo.logo && hospitalInfo.logo !== 'null' && hospitalInfo.logo !== 'undefined' && hospitalInfo.logo.trim() !== '') ? `<img src="${hospitalInfo.logo}" style="height: 55px; margin-bottom: 10px;" />` : ''}
              <div class="hospital-name">${hospitalInfo.name}</div>
              <div style="font-size: 11px; color: #64748b;">${hospitalInfo.address} | Tel: ${hospitalInfo.phone}</div>
            </div>

            <div class="bill-title">Patient Consolidated Statement</div>

            <div class="patient-info">
              <div>
                <div><span class="info-label">Patient Name:</span> <span class="info-value">${patient?.name}</span></div>
                <div style="margin-top: 5px;"><span class="info-label">MRN:</span> <span class="info-value">${patient?.mrn || 'N/A'}</span></div>
                <div style="margin-top: 5px;"><span class="info-label">Gender / Age:</span> <span class="info-value">${patient?.gender || 'N/A'} / ${patient?.age || 'N/A'} Years</span></div>
              </div>
              <div style="text-align: right;">
                <div><span class="info-label">Statement Date:</span> <span class="info-value">${formatDate(new Date().toISOString())}</span></div>
                <div style="margin-top: 5px;"><span class="info-label">Contact:</span> <span class="info-value">${patient?.phone || 'N/A'}</span></div>
                <div style="margin-top: 5px;"><span class="info-label">Total Invoices:</span> <span class="info-value">${conBills.length}</span></div>
              </div>
            </div>

            ${Object.entries(itemsByDate).map(([dateStr, items]) => `
              <div class="date-header">
                <span>Date: ${dateStr}</span>
                <span style="font-size: 11px; opacity: 0.8;">${items.length} Charge Item(s)</span>
              </div>
              <table class="invoice-table">
                <thead>
                  <tr>
                    <th style="width: 50%;">Service / Item Description</th>
                    <th style="width: 25%;">Department/Category</th>
                    <th style="text-align: right; width: 25%;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map(item => `
                    <tr>
                      <td>
                        <div class="service-desc">${item.description}</div>
                      </td>
                      <td>
                        <div class="service-cat">${item.category} (${item.source})</div>
                      </td>
                      <td style="text-align: right; font-weight: 700;">${formatCurrency(item.amount)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `).join('')}

            <div class="summary-section">
              <div class="total-card">
                <div class="total-row"><span>Consolidated Sub-Total:</span> <span>${formatCurrency(grandTotal)}</span></div>
                <div class="total-row"><span>Consolidated Discount:</span> <span>${formatCurrency(grandDiscount)}</span></div>
                <div class="total-row grand-total"><span>Total Paid Amount:</span> <span>${formatCurrency(grandPaid)}</span></div>
              </div>
            </div>

            <div class="sig-section">
              <div class="sig-box">
                <div class="sig-line"></div>
                <div class="sig-label">Receiver / Patient Sign</div>
              </div>
              <div class="sig-box">
                <div class="sig-line"></div>
                <div class="sig-label">Authorized Signatory</div>
              </div>
            </div>

            <div style="text-align: center; margin-top: 60px; color: #94a3b8; font-size: 11px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
              This is a consolidated account summary generated dynamically. 
            </div>
          </div>
          
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 1000);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(consolidatedHtml);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-medical-blue" />
        <span className="ml-2">Loading Billing Data...</span>
      </div>
    );
  }

  let pharmacyRevenue = 0;
  let labRevenue = 0;
  let mainOfficeCollection = 0;

  bills.forEach(b => {
    const paidVal = Number(b.paid_amount ?? b.paidAmount ?? 0);
    if (paidVal <= 0) return;

    const items = b.invoice_items || b.items || [];
    const typeLower = String(b.type || b.invoice_type || '').toLowerCase();
    const invNumUpper = String(b.invoice_number || b.invoiceNumber || '').toUpperCase();

    if (Array.isArray(items) && items.length > 0) {
      const itemsTotal = items.reduce((sum: number, it: any) => {
        return sum + Number(it.total_price ?? it.totalPrice ?? it.unit_price ?? it.amount ?? 0);
      }, 0);

      if (itemsTotal > 0) {
        items.forEach((it: any) => {
          const itemVal = (Number(it.total_price ?? it.totalPrice ?? it.unit_price ?? it.amount ?? 0) / itemsTotal) * paidVal;
          const catUpper = String(it.category || it.item_type || '').toUpperCase();
          const nameUpper = String(it.item_name || it.description || '').toUpperCase();

          if (catUpper === 'PHARMACY' || typeLower === 'pharmacy' || invNumUpper.startsWith('INV-PHARM') || invNumUpper.startsWith('INV-POS')) {
            pharmacyRevenue += itemVal;
          } else if (
            ['LAB', 'PATH', 'RADIO', 'RADIOLOGY', 'PATHOLOGY'].includes(catUpper) ||
            ['lab', 'radiology', 'pathology'].includes(typeLower) ||
            invNumUpper.startsWith('INV-LAB') || invNumUpper.startsWith('INV-RAD')
          ) {
            labRevenue += itemVal;
          } else {
            mainOfficeCollection += itemVal;
          }
        });
        return;
      }
    }

    // Fallback if bill has no item details
    if (typeLower === 'pharmacy' || invNumUpper.startsWith('INV-PHARM') || invNumUpper.startsWith('INV-POS')) {
      pharmacyRevenue += paidVal;
    } else if (['lab', 'radiology', 'pathology'].includes(typeLower) || invNumUpper.startsWith('INV-LAB') || invNumUpper.startsWith('INV-RAD')) {
      labRevenue += paidVal;
    } else {
      mainOfficeCollection += paidVal;
    }
  });

  const totalHospitalRevenue = bills.reduce((sum, b) => {
    return sum + Number(b.paid_amount ?? b.paidAmount ?? 0);
  }, 0);

  const isAuthorized = !!currentUser;

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[500px]">
        <div className="bg-red-50 text-red-800 p-8 rounded-2xl max-w-md w-full border border-red-200 shadow-md text-center animate-in fade-in zoom-in-95 duration-300">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4 animate-bounce" />
          <h2 className="text-xl font-bold mb-2 text-red-900">Access Denied</h2>
          <p className="text-xs text-red-700 font-medium leading-relaxed mb-6">
            Only Accountants and authorized Administration staff can view, add, or access the Hospital Accounting, Ledger, and Billing system.
          </p>
          <Button onClick={() => navigate('/')} className="bg-red-800 hover:bg-red-950 text-white w-full rounded-xl font-bold">
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Dynamic, Vibrant, Richly Colored Banner Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-700 to-green-600 text-white p-6 sm:p-8 shadow-xl shadow-emerald-100 animate-in fade-in duration-500">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none"></div>
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-[10px] font-black tracking-widest bg-white/20 text-white px-3 py-1 rounded-full uppercase my-1 select-none w-fit">
              ★ CENTRAL ACCOUNT OFFICE ONLINE
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl text-white">
              Billing & Revenue
            </h1>
            <p className="text-emerald-50 text-sm font-medium max-w-xl">
              Main hospital ledger auditing for OPD, IPD, and OT. Monitoring real-time pharmacy sales and laboratory diagnostics collections.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 shadow-inner">
            {bills.length > 0 && (
              <Button 
                variant="outline" 
                className="gap-2 bg-rose-500/20 text-white border-rose-200/40 hover:bg-rose-600 hover:text-white rounded-xl font-extrabold h-10 shadow-sm"
                onClick={handleClearAllInvoices}
              >
                <Trash2 className="w-4 h-4 text-rose-200" />
                Clear Old Bills
              </Button>
            )}
            <Button variant="outline" className="gap-2 bg-white/10 text-white border-white/20 hover:bg-white hover:text-emerald-900 rounded-xl font-bold h-10" onClick={handleExportBilling}>
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button 
              className="bg-white text-emerald-900 hover:bg-emerald-50 gap-2 rounded-xl font-black h-10 shadow-md"
              onClick={() => setIsHistoryOpen(true)}
            >
              <History className="w-4 h-4" />
              Day History
            </Button>
            <Button 
              className="bg-sky-50 text-sky-950 hover:bg-sky-100 border border-sky-300 gap-2 rounded-xl font-black h-10 shadow-sm"
              onClick={() => navigate('/endoscopy')}
            >
              <Microscope className="w-4 h-4 text-sky-700" />
              Direct Endoscopy Suite
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="sm:max-w-[780px] max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-5 border-b bg-slate-50/80">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-medical-blue" />
                  Daily Transaction History
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Complete audit log of all hospital billing transactions grouped by date.
                </DialogDescription>
              </div>
              <Badge className="bg-blue-100 text-blue-900 font-extrabold text-xs">
                {bills.length} Total Invoice{bills.length === 1 ? '' : 's'}
              </Badge>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-5 max-h-[calc(90vh-130px)] space-y-6">
            {Object.keys(groupedBillsByDate).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                  <History className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">No Transaction Ledger Recorded</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
                  Daily transaction summaries are grouped dynamically here once patient invoices are processed or generated.
                </p>
              </div>
            ) : (
              Object.entries(groupedBillsByDate)
                .sort((a, b) => {
                  const timeA = new Date(a[0]).getTime();
                  const timeB = new Date(b[0]).getTime();
                  return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
                })
                .map(([dateKey, dayBills]) => {
                  const typedDayBills = (dayBills as any[]).slice().sort((a, b) => {
                    const tA = new Date(a.created_at || a.date || '').getTime() || 0;
                    const tB = new Date(b.created_at || b.date || '').getTime() || 0;
                    return tB - tA;
                  });
                  const dayTotal = typedDayBills.reduce((sum, b) => sum + (Number(b.payable_amount ?? b.total_amount ?? 0) || 0), 0);
                  const dayPaid = typedDayBills.reduce((sum, b) => sum + (Number(b.paid_amount ?? (b.status === 'Paid' ? (b.payable_amount ?? b.total_amount ?? 0) : 0)) || 0), 0);

                  return (
                    <div key={dateKey} className="space-y-3 bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-medical-blue text-white font-bold text-xs">{formatDate(dateKey)}</Badge>
                          <span className="text-xs font-semibold text-slate-500">
                            {typedDayBills.length} {typedDayBills.length === 1 ? 'Transaction' : 'Transactions'}
                          </span>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <div className="text-xs text-slate-500">
                            Collected: <span className="font-bold text-emerald-700">{formatCurrency(dayPaid)}</span>
                          </div>
                          <div className="text-xs font-bold text-slate-800">
                            Total: <span>{formatCurrency(dayTotal)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {typedDayBills.map((bill) => {
                          const patInfo = getBillPatientInfo(bill);
                          const totalAmt = Number(bill.payable_amount ?? bill.total_amount ?? 0);
                          const paidAmt = Number(bill.paid_amount ?? (bill.status === 'Paid' ? totalAmt : 0));
                          const isFullyPaid = bill.status === 'Paid' || paidAmt >= totalAmt;
                          const isPartial = !isFullyPaid && paidAmt > 0;

                          return (
                            <div key={bill.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/70 hover:bg-blue-50/40 transition-colors">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="text-xs font-mono font-bold text-medical-blue shrink-0">
                                  #{sequentialIdMap[bill.id] || bill.id.split('-').pop()?.toUpperCase() || bill.id.substring(0, 6)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-900 truncate">
                                    {patInfo.name} {patInfo.mrn ? <span className="font-normal text-slate-500">({patInfo.mrn})</span> : ''}
                                  </p>
                                  <p className="text-[10px] text-slate-500 uppercase font-medium">
                                    {bill.department || bill.category || bill.invoice_items?.[0]?.category || 'General'} Charge
                                  </p>
                                </div>
                              </div>

                              <div className="text-right shrink-0 flex items-center gap-3">
                                <div>
                                  <p className="text-xs font-bold text-slate-900">{formatCurrency(totalAmt)}</p>
                                  {paidAmt > 0 && paidAmt < totalAmt && (
                                    <p className="text-[10px] text-emerald-600 font-semibold">Paid: {formatCurrency(paidAmt)}</p>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <Badge 
                                    className={`text-[9px] font-extrabold px-1.5 py-0.5 ${
                                      isFullyPaid 
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                                        : isPartial 
                                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                                          : 'bg-rose-100 text-rose-800 border-rose-300'
                                    }`}
                                  >
                                    {bill.status || (isFullyPaid ? 'Paid' : isPartial ? 'Partial' : 'Pending')}
                                  </Badge>
                                  <Badge variant="outline" className="text-[8px] h-4 bg-white text-slate-600 font-semibold">
                                    {bill.payment_method || bill.paymentMethod || 'Cash'}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
            )}
          </div>

          <DialogFooter className="p-4 border-t bg-slate-50/80">
            <DialogTrigger asChild>
              <Button variant="outline" className="h-8 text-xs font-bold">Close</Button>
            </DialogTrigger>
          </DialogFooter>
        </DialogContent>
      </Dialog>
          <Dialog open={isInvoiceOpen} onOpenChange={(open) => {
            setIsInvoiceOpen(open);
            if (!open) {
              setPatientSearchTerm('');
              setShowPatientResults(false);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-medical-blue gap-2" onClick={() => setIsInvoiceOpen(true)}>
                <Plus className="w-4 h-4" />
                Create New Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-[760px] md:max-w-[850px] lg:max-w-[920px] w-full">
              <DialogHeader>
                <DialogTitle>Independent Billing & Invoicing</DialogTitle>
                <DialogDescription>Add multiple services and items to create a manual invoice.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                <div className="space-y-2 relative">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-bold text-slate-700">Select Patient (Search by Name or Phone)</Label>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-xs text-medical-blue hover:text-blue-800 hover:bg-blue-50 gap-1.5 px-2 font-bold"
                      onClick={() => {
                        setQuickPatient({ name: patientSearchTerm.trim(), phone: '', gender: 'Male', age: '30' });
                        setIsQuickAddPatientOpen(true);
                        setShowPatientResults(false);
                      }}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      + Add New Patient
                    </Button>
                  </div>
                  <div className="relative">
                    <Input 
                      placeholder="Type name, MRN, or phone number..." 
                      value={patientSearchTerm}
                      onChange={(e) => {
                        setPatientSearchTerm(e.target.value);
                        setShowPatientResults(true);
                        if (e.target.value === '') {
                          setNewInvoice({...newInvoice, patientId: ''});
                        }
                      }}
                      onFocus={() => setShowPatientResults(true)}
                      className="pr-9"
                    />
                    <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                  
                  {showPatientResults && (
                    <div className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-[260px] overflow-y-auto custom-scrollbar">
                      {(() => {
                        const filtered = patients.filter(p => {
                          if (!patientSearchTerm.trim()) return true;
                          const term = patientSearchTerm.toLowerCase().trim();
                          return (
                            (p.name || '').toLowerCase().includes(term) || 
                            (p.phone || '').includes(term) ||
                            (p.mrn || '').toLowerCase().includes(term)
                          );
                        });

                        return (
                          <>
                            {filtered.length > 0 ? (
                              filtered.map(p => {
                                const isDup = duplicateNamesSet.has((p.name || '').toLowerCase().trim());
                                return (
                                  <div 
                                    key={p.id} 
                                    className={`px-4 py-2.5 hover:bg-blue-50/80 cursor-pointer flex justify-between items-center border-b border-slate-100 last:border-0 transition-colors ${isDup ? 'bg-amber-50/30' : ''}`}
                                    onClick={() => {
                                      setNewInvoice({...newInvoice, patientId: p.id});
                                      setPatientSearchTerm(p.name);
                                      setShowPatientResults(false);
                                    }}
                                  >
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-2">
                                        <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                                        {isDup && (
                                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-bold bg-amber-50 text-amber-800 border-amber-300 flex items-center gap-1">
                                            <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                                            Duplicate Name
                                          </Badge>
                                        )}
                                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 font-bold ${
                                          p.department?.includes('Endoscopy') || p.isDirectEndo 
                                            ? 'bg-purple-50 text-purple-700 border-purple-200' 
                                            : p.department?.includes('Emergency') 
                                              ? 'bg-rose-50 text-rose-700 border-rose-200' 
                                              : 'bg-blue-50 text-blue-700 border-blue-200'
                                        }`}>
                                          {p.department || (p.isDirectEndo ? 'Direct Endoscopy & Colonoscopy' : 'Patient')}
                                        </Badge>
                                      </div>
                                      <p className="text-[11px] text-slate-500 font-medium">
                                        <span className="font-bold text-slate-700">Patient ID / MRN:</span> <span className={isDup ? "font-bold text-amber-900 bg-amber-100/70 px-1 rounded" : ""}>{p.mrn || p.id}</span> {p.phone && p.phone !== 'N/A' ? `• Ph: ${p.phone}` : ''} {p.gender ? `• ${p.gender}` : ''}
                                      </p>
                                    </div>
                                    {newInvoice.patientId === p.id && <CheckCircle2 className="w-4 h-4 text-medical-blue shrink-0" />}
                                  </div>
                                );
                              })
                            ) : (
                              <div className="px-4 py-3 text-center text-xs text-slate-500">
                                No registered patient matching "{patientSearchTerm}".
                              </div>
                            )}

                            {/* Quick add patient action at the bottom of the list */}
                            <div 
                              className="px-4 py-3 hover:bg-blue-100/80 cursor-pointer flex items-center justify-between border-t border-blue-100 bg-blue-50/90 text-medical-blue font-bold text-xs sticky bottom-0"
                              onClick={() => {
                                setQuickPatient({ name: patientSearchTerm.trim(), phone: '', gender: 'Male', age: '30' });
                                setIsQuickAddPatientOpen(true);
                                setShowPatientResults(false);
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <UserPlus className="w-4 h-4 text-medical-blue" />
                                <span>{patientSearchTerm.trim() ? `+ Register "${patientSearchTerm.trim()}" as New Patient` : '+ Register New Patient'}</span>
                              </div>
                              <Badge className="bg-medical-blue text-white text-[9px] px-2 py-0.5">Quick Register</Badge>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                  
                  {newInvoice.patientId && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 flex flex-col gap-1 mt-2 animate-in fade-in slide-in-from-top-1 text-[11px]">
                      {(() => {
                        const p = patients.find(pat => pat.id === newInvoice.patientId);
                        const doctor = users.find(u => u.id === p?.attendingDoctorId);
                        const isDup = duplicateNamesSet.has((p?.name || '').toLowerCase().trim());
                        return (
                          <>
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-blue-600 uppercase tracking-wider">Selected Patient Details</span>
                                {isDup && (
                                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-bold bg-amber-100 text-amber-900 border-amber-300 flex items-center gap-1">
                                    <AlertTriangle className="w-2.5 h-2.5 text-amber-700" />
                                    Duplicate Name Alert
                                  </Badge>
                                )}
                              </div>
                              <Badge variant="outline" className="text-[9px] border-blue-200 text-blue-700 bg-white font-semibold">{doctor?.department || p?.status || 'Outpatient'}</Badge>
                            </div>
                            <p className="font-bold text-blue-900 text-sm">{p?.name}</p>
                            <div className="flex gap-4 text-blue-700 font-medium">
                              <span>Ph: {p?.phone || 'N/A'}</span>
                              <span className={isDup ? "font-bold text-amber-950 bg-amber-200/70 px-1 rounded" : ""}>MRN: {p?.mrn || 'N/A'}</span>
                              {p?.gender && <span>Gender: {p?.gender}</span>}
                              {p?.age && <span>Age: {p?.age}</span>}
                            </div>
                            {isDup && (
                              <p className="text-[10px] text-amber-800 font-medium mt-1 bg-amber-50 p-1.5 rounded border border-amber-200 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                Notice: Multiple patients share the name "{p?.name}". Verify MRN ({p?.mrn}) and Phone ({p?.phone}) to ensure correct billing.
                              </p>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {patientPrescriptions.length > 0 && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 mt-2 shadow-xs animate-in fade-in slide-in-from-top-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                            💊
                          </div>
                          <div>
                            <span className="text-xs font-bold text-emerald-900 block">Doctor's OPD Prescription Available</span>
                            <span className="text-[10px] text-emerald-700 font-medium">
                              Found {patientPrescriptions[0].medicines?.length || patientPrescriptions[0].medications?.length || 0} prescribed medications from Dr. {patientPrescriptions[0].doctor || 'Physician'}
                            </span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold gap-1.5 h-8 shadow-xs"
                          onClick={() => handleImportPrescription(patientPrescriptions[0])}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Auto-Import Prescriptions (Rx)
                        </Button>
                      </div>
                    </div>
                  )}

                </div>

                <Separator />
                
                <div className="bg-slate-50 p-6 rounded-2xl space-y-5 border border-slate-150 shadow-sm">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-extrabold uppercase text-slate-500 tracking-wider">Add Service / Item</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 gap-1.5 border-slate-200 text-xs font-semibold bg-white text-medical-blue hover:bg-slate-50"
                      onClick={() => {
                        setIsCatalogOpen(true);
                        setCatalogTab('categories');
                      }}
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                      Manage Categories & Services
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 flex flex-col">
                      <Label className="text-xs font-semibold text-slate-600">Category</Label>
                      <Select value={currentItem.category} onValueChange={handleCategoryChange}>
                        <SelectTrigger className="h-12 w-full bg-white border-slate-200 shadow-sm font-semibold text-slate-800 text-sm md:text-base px-4 rounded-xl">
                          <SelectValue placeholder="Select Category">
                            {allCategories.find((cat) => cat.id === currentItem.category)?.name || (currentItem.category ? (allCategories.find(c => c.name.toLowerCase() === currentItem.category.toLowerCase())?.name || currentItem.category) : undefined)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="min-w-[220px]">
                          {allCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {currentItem.category ? (
                      <div className="space-y-1.5 flex flex-col animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-slate-600">Service / Item</Label>
                          {currentItem.availableStock !== undefined && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${currentItem.availableStock > 10 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                              Live Stock: {currentItem.availableStock}
                            </span>
                          )}
                        </div>
                        {currentItem.category === 'custom' ? (
                          <Input 
                            placeholder="Type service / item name..."
                            className="h-12 bg-white border-slate-200 text-sm font-semibold shadow-sm text-slate-800 rounded-xl px-4" 
                            value={currentItem.subType}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCurrentItem({
                                ...currentItem,
                                subType: val,
                                description: val
                              });
                            }}
                          />
                        ) : (
                          <Select value={currentItem.subType} onValueChange={handleSubTypeChange}>
                            <SelectTrigger className="h-12 w-full bg-white border-slate-200 shadow-sm font-semibold text-slate-800 text-sm md:text-base px-4 rounded-xl">
                              <SelectValue placeholder="Select Service / Item" />
                            </SelectTrigger>
                            <SelectContent className="min-w-[250px] max-h-[300px]">
                              {getServicesByCategory(currentItem.category).map((s: any) => (
                                <SelectItem key={s.name} value={s.name}>
                                  <div className="flex items-center justify-between w-full gap-2">
                                    <span>{s.name}</span>
                                    <div className="flex items-center gap-1.5">
                                      {s.stock !== undefined && (
                                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                          Stock: {s.stock}
                                        </span>
                                      )}
                                      {s.rate > 0 && <span className="font-bold text-slate-800">(₹{s.rate})</span>}
                                    </div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1.5 flex flex-col justify-end">
                        <Label className="text-xs font-semibold text-slate-600 opacity-50">Service / Item</Label>
                        <div className="h-12 flex items-center justify-center bg-slate-100 border border-dashed border-slate-200 rounded-xl px-4">
                          <span className="text-xs text-slate-400 italic font-medium">Select Category first</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-6 space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Description / Label</Label>
                      <Input 
                        className="h-12 bg-white border-slate-200 text-sm font-semibold shadow-sm text-slate-800 rounded-xl px-4" 
                        value={currentItem.description} 
                        onChange={(e) => setCurrentItem({...currentItem, description: e.target.value})} 
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Qty</Label>
                      <Input 
                        type="number"
                        min="1"
                        className="h-12 bg-white border-slate-200 text-sm font-semibold shadow-sm text-slate-800 rounded-xl px-3 text-center" 
                        value={currentItem.quantity || '1'} 
                        onChange={(e) => {
                          const q = e.target.value;
                          const unitP = parseFloat(currentItem.unitPrice) || (parseFloat(currentItem.amount) / (parseInt(currentItem.quantity || '1') || 1)) || 0;
                          const qtyVal = parseInt(q) || 1;
                          setCurrentItem({
                            ...currentItem,
                            quantity: q,
                            unitPrice: unitP.toString(),
                            amount: Math.round(unitP * qtyVal).toString(),
                            description: qtyVal > 1 && !currentItem.description.includes('(Qty:') ? `${currentItem.subType || currentItem.description} (Qty: ${qtyVal})` : currentItem.description
                          });
                        }} 
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Unit Rate (₹)</Label>
                      <Input 
                        type="number"
                        className="h-12 bg-white border-slate-200 text-sm font-semibold shadow-sm text-slate-800 rounded-xl px-3 text-right" 
                        value={currentItem.unitPrice || (parseFloat(currentItem.amount) / (parseInt(currentItem.quantity || '1') || 1)) || ''} 
                        onChange={(e) => {
                          const uRate = e.target.value;
                          const qtyVal = parseInt(currentItem.quantity || '1') || 1;
                          const rateNum = parseFloat(uRate) || 0;
                          setCurrentItem({
                            ...currentItem,
                            unitPrice: uRate,
                            amount: Math.round(rateNum * qtyVal).toString()
                          });
                        }} 
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Total (₹)</Label>
                      <Input 
                        type="number"
                        className="h-12 bg-slate-100 border-slate-200 text-sm font-bold shadow-sm text-medical-blue rounded-xl px-3 text-right" 
                        value={currentItem.amount} 
                        onChange={(e) => setCurrentItem({...currentItem, amount: e.target.value})} 
                      />
                    </div>
                  </div>
                  <Button className="w-full h-12 bg-medical-blue hover:bg-medical-blue/90 text-sm font-bold uppercase tracking-widest transition-colors shadow-md rounded-xl" onClick={handleAddItem}>Add to Invoice</Button>
                </div>

                {invoiceItems.length > 0 && (
                  <div className="space-y-2 text-xs">
                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Invoice Items</p>
                    <div className="space-y-2">
                      {invoiceItems.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-white border border-slate-100 rounded-lg text-xs shadow-sm pl-3 pr-3">
                          <div className="flex-1">
                            <span className="font-bold text-slate-850">{item.description}</span>
                            <Badge variant="secondary" className="ml-2 text-[8px] h-4 uppercase bg-slate-100 text-slate-600 border border-slate-200">{item.category}</Badge>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-slate-800">₹{item.amount}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-rose-500 hover:bg-rose-50 rounded" onClick={() => removeItem(idx)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center p-3.5 bg-medical-blue/5 rounded-xl border border-medical-blue/10 shadow-inner">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-450 uppercase">Subtotal: ₹{totalInvoiceAmount}</span>
                        <span className="text-xs font-extrabold text-medical-blue uppercase tracking-wider">Final Amount</span>
                      </div>
                      <span className="text-xl font-black text-medical-blue">₹{finalAmount}</span>
                    </div>
                  </div>
                )}

                <div className="border border-slate-100 bg-slate-50/50 p-4 rounded-xl space-y-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Billing Schedule & Payments</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-600">Billing Date & Time (Auto-fetched)</Label>
                      <Input 
                        type="datetime-local" 
                        className="h-10 border-slate-200 bg-white"
                        value={invoiceDateTime}
                        onChange={(e) => setInvoiceDateTime(e.target.value)}
                      />
                      <p className="text-[10px] text-slate-400 font-medium">Current local date/time loaded. You may change if logging past bills.</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-600">Discount (₹)</Label>
                      <Input 
                        type="number" 
                        placeholder="0"
                        className="h-10 border-slate-200 bg-white shadow-sm font-bold text-slate-800"
                        value={newInvoice.discount}
                        onChange={(e) => setNewInvoice({...newInvoice, discount: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-600">Payment Status</Label>
                      <Select value={paymentStatus} onValueChange={(v: any) => setPaymentStatus(v)}>
                        <SelectTrigger className="h-10 w-full bg-white border-slate-200 shadow-sm font-semibold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Paid">Fully Paid (Settled)</SelectItem>
                          <SelectItem value="Partial">Partially Paid</SelectItem>
                          <SelectItem value="Unpaid">Unpaid / Term Due</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {paymentStatus !== 'Unpaid' && (
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-600">Payment Mode</Label>
                        <Select value={newInvoice.paymentMode} onValueChange={(v) => setNewInvoice({...newInvoice, paymentMode: v})}>
                          <SelectTrigger className="h-10 w-full bg-white border-slate-200 shadow-sm font-medium">
                            <SelectValue placeholder="Select mode" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="UPI">UPI / QR Scan</SelectItem>
                            <SelectItem value="Card">Credit/Debit Card</SelectItem>
                            <SelectItem value="Bank Transfer">Bank Transfer / NEFT</SelectItem>
                            <SelectItem value="Cheque">Cheque / DD</SelectItem>
                            <SelectItem value="Insurance">Insurance Claim / TPA</SelectItem>
                            <SelectItem value="Multi-Mode">Multi-Mode / Split</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {paymentStatus === 'Partial' && (
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-600">Amount Collected Now (₹)</Label>
                        <Input 
                          type="number" 
                          placeholder="e.g. 500"
                          className="h-10 border-slate-200 bg-white shadow-sm font-bold text-emerald-700"
                          value={initialPaidAmount}
                          onChange={(e) => setInitialPaidAmount(e.target.value)}
                        />
                      </div>
                    )}

                    {paymentStatus !== 'Unpaid' && (
                      <div className="space-y-2 col-span-1 md:col-span-1">
                        <Label className="text-xs font-bold text-slate-600">Reference / Txn ID</Label>
                        <Input 
                          placeholder="Optional ID"
                          className="h-10 border-slate-200 bg-white shadow-sm text-xs font-semibold"
                          value={invoicePaymentRef}
                          onChange={(e) => setInvoicePaymentRef(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <DialogTrigger asChild>
                  <Button variant="outline" onClick={() => { 
                    setInvoiceItems([]); 
                    setNewInvoice({ patientId: '', paymentMode: 'Cash' }); 
                    setPatientSearchTerm('');
                    setShowPatientResults(false);
                    setIsInvoiceOpen(false);
                  }}>Discard</Button>
                </DialogTrigger>
                <Button className="bg-medical-blue gap-2" onClick={handleCreateInvoice} disabled={invoiceItems.length === 0 || isGeneratingBill}>
                  {isGeneratingBill && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isGeneratingBill ? 'Generating Bill...' : 'Generate Bill'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Invoice Dialog */}
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent className="max-w-[95vw] sm:max-w-[760px] md:max-w-[850px] lg:max-w-[920px] w-full">
              <DialogHeader>
                <DialogTitle>Edit Invoice #{editingBill && sequentialIdMap[editingBill.id] ? sequentialIdMap[editingBill.id] : editingBill?.id.split('-')[1]?.substring(0, 6)}</DialogTitle>
                <DialogDescription>Modify services and items for this existing invoice.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Patient</p>
                  <p className="text-sm font-bold text-slate-800">{patients.find(p => p.id === editingBill?.patientId)?.name}</p>
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl space-y-5 border border-slate-150 shadow-sm">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-extrabold uppercase text-slate-500 tracking-wider">Add/Modify Service</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 gap-1.5 border-slate-200 text-xs font-semibold bg-white text-medical-blue hover:bg-slate-50"
                      onClick={() => {
                        setIsCatalogOpen(true);
                        setCatalogTab('categories');
                      }}
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                      Manage Categories & Services
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 flex flex-col">
                      <Label className="text-xs font-semibold text-slate-600">Category</Label>
                      <Select value={currentItem.category} onValueChange={handleCategoryChange}>
                        <SelectTrigger className="h-12 w-full bg-white border-slate-200 shadow-sm font-semibold text-slate-800 text-sm md:text-base px-4 rounded-xl">
                          <SelectValue placeholder="Select Category">
                            {allCategories.find((cat) => cat.id === currentItem.category)?.name || (currentItem.category ? (allCategories.find(c => c.name.toLowerCase() === currentItem.category.toLowerCase())?.name || currentItem.category) : undefined)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="min-w-[220px]">
                          {allCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {currentItem.category ? (
                      <div className="space-y-1.5 flex flex-col animate-in fade-in zoom-in-95">
                        <Label className="text-xs font-semibold text-slate-600">Service / Item</Label>
                        {currentItem.category === 'custom' ? (
                          <Input 
                            placeholder="Type service / item name..."
                            className="h-12 bg-white border-slate-200 text-sm font-semibold shadow-sm text-slate-800 rounded-xl px-4" 
                            value={currentItem.subType}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCurrentItem({
                                ...currentItem,
                                subType: val,
                                description: val
                              });
                            }}
                          />
                        ) : (
                          <Select value={currentItem.subType} onValueChange={handleSubTypeChange}>
                            <SelectTrigger className="h-12 w-full bg-white border-slate-200 shadow-sm font-semibold text-slate-800 text-sm md:text-base px-4 rounded-xl">
                              <SelectValue placeholder="Select Service" />
                            </SelectTrigger>
                            <SelectContent className="min-w-[250px]">
                              {getServicesByCategory(currentItem.category).map((s: any) => (
                                <SelectItem key={s.name} value={s.name}>{s.name} {s.rate ? `(₹${s.rate})` : ''}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1.5 flex flex-col justify-end">
                        <Label className="text-xs font-semibold text-slate-600 opacity-50">Service / Item</Label>
                        <div className="h-12 flex items-center justify-center bg-slate-100 border border-dashed border-slate-200 rounded-xl px-4">
                          <span className="text-xs text-slate-400 italic font-medium">Select Category first</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Description</Label>
                      <Input 
                        className="h-12 bg-white border-slate-200 text-sm font-semibold shadow-sm text-slate-800 rounded-xl px-4" 
                        value={currentItem.description} 
                        onChange={(e) => setCurrentItem({...currentItem, description: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Rate (₹)</Label>
                      <Input 
                        type="number"
                        className="h-12 bg-white border-slate-200 text-sm font-semibold shadow-sm text-slate-800 rounded-xl px-4" 
                        value={currentItem.amount} 
                        onChange={(e) => setCurrentItem({...currentItem, amount: e.target.value})} 
                      />
                    </div>
                  </div>
                  <Button className="w-full h-12 bg-medical-blue hover:bg-medical-blue/90 text-sm font-bold uppercase tracking-widest transition-colors shadow-md rounded-xl" onClick={handleAddItem}>Add to List</Button>
                </div>

                {invoiceItems.length > 0 && (
                  <div className="space-y-2 text-xs">
                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Current Items</p>
                    <div className="space-y-2">
                      {invoiceItems.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-white border border-slate-100 rounded-lg text-xs shadow-sm pl-3 pr-3">
                          <div className="flex-1">
                            <span className="font-bold text-slate-850">{item.description}</span>
                            <Badge variant="secondary" className="ml-2 text-[8px] h-4 uppercase bg-slate-100 text-slate-600 border border-slate-200">{item.category}</Badge>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-slate-800">₹{item.amount}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-rose-500 hover:bg-rose-50 rounded" onClick={() => removeItem(idx)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center p-3.5 bg-medical-blue/5 rounded-xl border border-medical-blue/10 shadow-inner">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-450 uppercase">Subtotal: ₹{totalInvoiceAmount}</span>
                        <span className="text-xs font-extrabold text-medical-blue uppercase tracking-wider">Final Amount</span>
                      </div>
                      <span className="text-xl font-black text-medical-blue">₹{finalEditAmount}</span>
                    </div>
                  </div>
                )}

                <div className="border border-slate-100 bg-slate-50/50 p-4 rounded-xl space-y-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Edit Schedule & Payment Records</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-600">Billing Date & Time</Label>
                      <Input 
                        type="datetime-local" 
                        className="h-10 border-slate-200 bg-white"
                        value={editInvoiceDateTime}
                        onChange={(e) => setEditInvoiceDateTime(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-600">Discount (₹)</Label>
                      <Input 
                        type="number"
                        className="h-10 border-slate-200 bg-white shadow-sm font-bold text-slate-800" 
                        value={editingBill?.discount || 0} 
                        onChange={(e) => setEditingBill({...editingBill, discount: parseInt(e.target.value) || 0})} 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-600">Payment Status</Label>
                      <Select value={editPaymentStatus} onValueChange={(v: any) => setEditPaymentStatus(v)}>
                        <SelectTrigger className="h-10 w-full bg-white border-slate-200 shadow-sm font-semibold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Paid">Fully Paid (Settled)</SelectItem>
                          <SelectItem value="Partial">Partially Paid</SelectItem>
                          <SelectItem value="Unpaid">Unpaid / Term Due</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {editPaymentStatus !== 'Unpaid' && (
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-600">Payment Mode</Label>
                        <Select value={editingBill?.paymentMode || editingBill?.payment_method || 'Cash'} onValueChange={(v) => setEditingBill({...editingBill, paymentMode: v, payment_method: v})}>
                          <SelectTrigger className="h-10 w-full bg-white border-slate-200 shadow-sm font-medium">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="UPI">UPI / QR Scan</SelectItem>
                            <SelectItem value="Card">Credit/Debit Card</SelectItem>
                            <SelectItem value="Bank Transfer">Bank Transfer / NEFT</SelectItem>
                            <SelectItem value="Cheque">Cheque / DD</SelectItem>
                            <SelectItem value="Insurance">Insurance Claim / TPA</SelectItem>
                            <SelectItem value="Multi-Mode">Multi-Mode / Split</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {editPaymentStatus === 'Partial' && (
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-600">Amount Paid So Far (₹)</Label>
                        <Input 
                          type="number" 
                          placeholder="e.g. 500"
                          className="h-10 border-slate-200 bg-white shadow-sm font-bold text-emerald-700"
                          value={editPaidAmount}
                          onChange={(e) => setEditPaidAmount(e.target.value)}
                        />
                      </div>
                    )}

                    {editPaymentStatus !== 'Unpaid' && (
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-600">Reference / Txn ID</Label>
                        <Input 
                          placeholder="Optional reference No."
                          className="h-10 border-slate-200 bg-white shadow-sm text-xs font-semibold"
                          value={editPaymentRef}
                          onChange={(e) => setEditPaymentRef(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                <Button className="bg-medical-blue" onClick={handleUpdateInvoice}>Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Catalog Manager Dialog */}
          <Dialog open={isCatalogOpen} onOpenChange={setIsCatalogOpen}>
            <DialogContent className="max-w-[95vw] sm:max-w-[620px] md:max-w-[700px] w-full">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-slate-850">
                  <Settings2 className="w-5 h-5 text-medical-blue" />
                  Configure Billing Catalog
                </DialogTitle>
                <DialogDescription>
                  Add or delete custom categories and associated services/items in your billing system.
                </DialogDescription>
              </DialogHeader>

              <div className="flex gap-2 border-b border-slate-100 pb-2 mb-4">
                <Button 
                  variant={catalogTab === 'categories' ? 'secondary' : 'ghost'} 
                  size="sm"
                  className={`h-9 font-semibold px-4 rounded-lg transition-all ${catalogTab === 'categories' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                  onClick={() => setCatalogTab('categories')}
                >
                  Manage Categories
                </Button>
                <Button 
                  variant={catalogTab === 'services' ? 'secondary' : 'ghost'} 
                  size="sm"
                  className={`h-9 font-semibold px-4 rounded-lg transition-all ${catalogTab === 'services' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                  onClick={() => setCatalogTab('services')}
                >
                  Manage Services
                </Button>
              </div>

              {catalogTab === 'categories' ? (
                <div className="space-y-4">
                  {/* Add Category Form */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-3">
                    <Label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Add New Category</Label>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="e.g., Dental, Physiotherapy, Ambulance" 
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        className="bg-white border-slate-200 h-10 shadow-sm"
                      />
                      <Button className="bg-medical-blue h-10 px-4 text-white hover:bg-medical-blue/90" onClick={handleAddCategory}>
                        Add Category
                      </Button>
                    </div>
                  </div>

                  {/* Category List */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-500 tracking-wider">All Active Categories</Label>
                    <div className="border border-slate-100 rounded-xl overflow-hidden max-h-[250px] overflow-y-auto custom-scrollbar">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead className="font-semibold text-slate-600">Category Name</TableHead>
                            <TableHead className="font-semibold text-slate-600 w-24">Type</TableHead>
                            <TableHead className="font-semibold text-slate-600 text-right w-16">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allCategories.map((cat) => (
                            <TableRow key={cat.id} className="hover:bg-slate-50/50">
                              <TableCell className="font-medium text-slate-800 py-3">{cat.name}</TableCell>
                              <TableCell className="py-3">
                                {cat.isDefault ? (
                                  <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-500 border-slate-200">System</Badge>
                                ) : (
                                  <Badge className="text-[10px] bg-blue-50 text-blue-600 hover:bg-blue-50 border border-blue-100">Custom</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right py-3">
                                {!cat.isDefault && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md"
                                    onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Select Category to manage services */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end bg-slate-50 p-4 rounded-xl border border-slate-150">
                    <div className="sm:col-span-1 space-y-1.5">
                      <Label className="text-xs font-bold text-slate-600">Select Category</Label>
                      <Select value={selectedCatalogCat} onValueChange={setSelectedCatalogCat}>
                        <SelectTrigger className="h-10 bg-white border-slate-200 shadow-sm font-semibold text-xs">
                          <SelectValue placeholder="Select Category">
                            {allCategories.find((cat) => cat.id === selectedCatalogCat)?.name || selectedCatalogCat}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {allCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id} className="text-xs font-semibold">{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="sm:col-span-1 space-y-1.5">
                      <Label className="text-xs font-bold text-slate-600">Service/Item Name</Label>
                      <Input 
                        placeholder="e.g. Scaling & Polishing" 
                        value={newSrvName}
                        onChange={(e) => setNewSrvName(e.target.value)}
                        className="bg-white border-slate-200 h-10 shadow-sm text-xs font-semibold"
                      />
                    </div>

                    <div className="sm:col-span-1 flex gap-2">
                      <div className="space-y-1.5 flex-1">
                        <Label className="text-xs font-bold text-slate-600">Rate (₹)</Label>
                        <Input 
                          type="number" 
                          placeholder="e.g. 1500" 
                          value={newSrvRate}
                          onChange={(e) => setNewSrvRate(e.target.value)}
                          className="bg-white border-slate-200 h-10 shadow-sm text-xs font-semibold"
                        />
                      </div>
                      <Button className="bg-medical-blue h-10 px-3 self-end text-white hover:bg-medical-blue/90" onClick={handleAddService}>
                        Add
                      </Button>
                    </div>
                  </div>

                  {/* Services List under current Category */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                        Services under "{allCategories.find(c => c.id === selectedCatalogCat)?.name}"
                      </Label>
                      <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-600">
                        {getServicesByCategory(selectedCatalogCat).length} Services
                      </Badge>
                    </div>
                    <div className="border border-slate-100 rounded-xl overflow-hidden max-h-[250px] overflow-y-auto custom-scrollbar">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead className="font-semibold text-slate-600">Service / Item Name</TableHead>
                            <TableHead className="font-semibold text-slate-600 w-28">Rate (₹)</TableHead>
                            <TableHead className="font-semibold text-slate-600 text-right w-16">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getServicesByCategory(selectedCatalogCat).length > 0 ? (
                            getServicesByCategory(selectedCatalogCat).map((srv, idx) => (
                              <TableRow key={idx} className="hover:bg-slate-50/50">
                                <TableCell className="font-medium text-slate-800 py-2.5 text-xs">{srv.name}</TableCell>
                                <TableCell className="py-2.5 text-xs font-bold text-slate-700">₹{srv.rate}</TableCell>
                                <TableCell className="text-right py-2.5">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md"
                                    onClick={() => handleDeleteService(srv.name, srv.isCustom, srv.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center py-8 text-xs text-muted-foreground italic font-medium">
                                No services configured under this category. Add a service above!
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}

              <DialogFooter className="mt-4 border-t pt-4">
                <Button className="bg-medical-blue px-6 text-white hover:bg-medical-blue/90" onClick={() => setIsCatalogOpen(false)}>Done</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Receive Payment Dialog */}
          <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
            <DialogContent className="max-w-[95vw] sm:max-w-[480px] w-full bg-white rounded-2xl shadow-xl border border-slate-100">
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-xl font-bold text-slate-800 tracking-tight">Receive Payment</DialogTitle>
                <DialogDescription className="text-xs text-slate-500 font-semibold">
                  Record full or partial payment received against invoice dues.
                </DialogDescription>
              </DialogHeader>

              {paymentTargetBill && (() => {
                const total = Number(paymentTargetBill.payable_amount || paymentTargetBill.payableAmount || paymentTargetBill.total_amount || paymentTargetBill.totalAmount || 0);
                const paid = Number(paymentTargetBill.paid_amount || paymentTargetBill.paidAmount || 0);
                const status = paymentTargetBill.status || paymentTargetBill.payment_status || 'Unpaid';
                const remaining = Math.max(0, total - paid);

                return (
                  <div className="space-y-5 py-2">
                    {/* Invoice Info Block */}
                    <div className="flex justify-between items-center bg-slate-50 border border-slate-150 px-4 py-2.5 rounded-xl text-xs font-semibold">
                      <span className="text-slate-500">Invoice ID:</span>
                      <span className="font-extrabold text-medical-blue">#{sequentialIdMap[paymentTargetBill.id] || paymentTargetBill.id.split('-')[1]?.substring(0, 6) || paymentTargetBill.id}</span>
                    </div>

                    {/* Patient Context Block */}
                    {paymentPatient && (
                      <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl flex items-start gap-3">
                        <div className="h-10 w-10 rounded-xl bg-medical-blue/10 flex items-center justify-center text-medical-blue shrink-0">
                          <User className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Patient Details</p>
                          <p className="text-sm font-bold text-slate-800 truncate leading-none mb-1">{paymentPatient.name}</p>
                          <p className="text-xs text-slate-500 font-semibold leading-none">MRN: {paymentPatient.mrn || 'Walk-In'}</p>
                        </div>
                      </div>
                    )}

                    {/* Financial Summary Card */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="flex flex-col p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Gross Bill</span>
                          <span className="text-xs font-bold text-slate-800 mt-0.5">{formatCurrency(paymentTargetBill.total_amount || paymentTargetBill.totalAmount || total)}</span>
                        </div>
                        <div className="flex flex-col p-2 bg-amber-50/50 rounded-lg border border-amber-150/50">
                          <span className="text-[9px] font-bold text-amber-600 uppercase">Discount</span>
                          <span className="text-xs font-bold text-amber-700 mt-0.5">-{formatCurrency(paymentTargetBill.discount_amount || paymentTargetBill.discount || 0)}</span>
                        </div>
                        <div className="flex flex-col p-2 bg-blue-50/50 rounded-lg border border-blue-150/50">
                          <span className="text-[9px] font-bold text-blue-600 uppercase">Net Payable</span>
                          <span className="text-xs font-extrabold text-blue-700 mt-0.5">{formatCurrency(total)}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="flex flex-col p-1.5 bg-emerald-50/40 rounded-lg border border-emerald-100/50">
                          <span className="text-[9px] font-semibold text-emerald-600/80 uppercase">Paid So Far</span>
                          <span className="text-xs font-bold text-emerald-700">{formatCurrency(paid)}</span>
                        </div>
                        <div className="flex flex-col p-1.5 bg-rose-50/45 rounded-lg border border-rose-100/50">
                          <span className="text-[9px] font-semibold text-rose-600/80 uppercase">Remaining Balance</span>
                          <span className="text-xs font-bold text-rose-700">{formatCurrency(remaining)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Payment Form Fields */}
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600">Amount to Receive (₹)</Label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                          <Input 
                            type="number"
                            className="h-11 pl-7 bg-white border-slate-200 text-sm font-bold rounded-xl pr-20" 
                            placeholder="0"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                          />
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            type="button"
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 text-xs font-bold text-emerald-600 hover:bg-slate-100 rounded-lg shrink-0"
                            onClick={() => setPaymentAmount(remaining.toString())}
                          >
                            Pay Full/Remaining
                          </Button>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">
                          You can record a **partial amount**. The system will track the remaining dues and keep the status as <span className="font-semibold text-amber-500">Partial</span> until it's completely cleared.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-700">Payment Method</Label>
                          <Select value={paymentMethod} onValueChange={(val) => setPaymentMethod(val)}>
                            <SelectTrigger className="h-11 bg-white border-slate-200 text-xs font-semibold rounded-xl">
                              <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="Cash">Cash</SelectItem>
                              <SelectItem value="UPI">UPI / QR Scan</SelectItem>
                              <SelectItem value="Card">Card (Credit/Debit)</SelectItem>
                              <SelectItem value="Bank Transfer">Bank Transfer / NEFT</SelectItem>
                              <SelectItem value="Cheque">Cheque / DD</SelectItem>
                              <SelectItem value="Insurance">Insurance / TPA Claim</SelectItem>
                              <SelectItem value="Multi-Mode">Multi-Mode / Split</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-700">Reference / Txn ID</Label>
                          <Input 
                            className="h-11 bg-white border-slate-200 text-xs font-semibold rounded-xl" 
                            placeholder="Optional reference No."
                            value={paymentRef}
                            onChange={(e) => setPaymentRef(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-700">Transaction Date & Time (Auto-fetched)</Label>
                        <Input 
                          type="datetime-local"
                          className="h-11 bg-white border-slate-200 text-xs font-semibold rounded-xl"
                          value={paymentDateTime}
                          onChange={(e) => setPaymentDateTime(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-700">Payment Notes / Remarks</Label>
                        <Input 
                          className="h-11 bg-white border-slate-200 text-xs font-semibold rounded-xl" 
                          placeholder="e.g., Partial payment towards diagnostic lab fees"
                          value={paymentRemarks}
                          onChange={(e) => setPaymentRemarks(e.target.value)}
                        />
                      </div>
                    </div>

                    <DialogFooter className="gap-2 pt-2">
                      <Button variant="outline" className="rounded-xl" onClick={() => setIsPaymentOpen(false)}>Cancel</Button>
                      <Button className="bg-medical-blue hover:bg-medical-blue/90 rounded-xl font-bold" onClick={handleProcessPayment}>
                        Record Transaction
                      </Button>
                    </DialogFooter>
                  </div>
                );
              })()}
            </DialogContent>
          </Dialog>

          {/* Issue Refund Dialog */}
          <Dialog open={isRefundOpen} onOpenChange={setIsRefundOpen}>
            <DialogContent className="max-w-[95vw] sm:max-w-[480px] w-full bg-white rounded-2xl shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2 text-rose-750">
                  <RefreshCw className="w-5 h-5 text-rose-600 animate-spin-slow" />
                  Issue Refund
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 font-semibold">
                  Process full or partial refund for previously recorded patient payments.
                </DialogDescription>
              </DialogHeader>

              {refundTargetBill && (() => {
                const total = Number(refundTargetBill.payable_amount || refundTargetBill.payableAmount || refundTargetBill.total_amount || refundTargetBill.totalAmount || 0);
                const paid = Number(refundTargetBill.paid_amount || refundTargetBill.paidAmount || 0);

                return (
                  <div className="space-y-5 py-2">
                    {/* Invoice Info Block */}
                    <div className="flex justify-between items-center bg-slate-50 border border-slate-150 px-4 py-2.5 rounded-xl text-xs font-semibold">
                      <span className="text-slate-500">Invoice ID:</span>
                      <span className="font-extrabold text-medical-blue">#{sequentialIdMap[refundTargetBill.id] || refundTargetBill.id.split('-')[1]?.substring(0, 6) || refundTargetBill.id}</span>
                    </div>

                    {/* Patient Context Block */}
                    {refundPatient && (
                      <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl flex items-start gap-3">
                        <div className="h-10 w-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                          <User className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Patient Details</p>
                          <p className="text-sm font-bold text-slate-800 truncate leading-none mb-1">{refundPatient.name}</p>
                          <p className="text-xs text-slate-500 font-semibold leading-none">MRN: {refundPatient.mrn || 'Walk-In'}</p>
                        </div>
                      </div>
                    )}

                    {/* Financial Summary Card */}
                    <div className="gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-center grid grid-cols-2">
                      <div className="flex flex-col p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Total Bill</span>
                        <span className="text-sm font-bold text-slate-800 mt-1">{formatCurrency(total)}</span>
                      </div>
                      <div className="flex flex-col p-2 bg-emerald-50/50 rounded-lg border border-emerald-100/50">
                        <span className="text-[9px] font-bold text-emerald-600/80 uppercase font-black">Amount Paid</span>
                        <span className="text-sm font-bold text-emerald-700 mt-1">{formatCurrency(paid)}</span>
                      </div>
                    </div>

                    {/* Refund Form Fields */}
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600">Refund Amount (₹)</Label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                          <Input 
                            type="number"
                            className="h-11 pl-7 bg-white border-slate-200 text-sm font-bold rounded-xl pr-20" 
                            placeholder="0"
                            value={refundAmount}
                            onChange={(e) => setRefundAmount(e.target.value)}
                          />
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            type="button"
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 text-xs font-bold text-rose-600 hover:bg-slate-100 rounded-lg shrink-0"
                            onClick={() => setRefundAmount(paid.toString())}
                          >
                            Refund All
                          </Button>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">
                          You can record a **partial refund**. The paid amount will be decremented, and the invoice status will remain active as <span className="font-semibold text-amber-500">Partial</span>.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-700">Refund Method</Label>
                          <Select value={refundMethod} onValueChange={(val) => setRefundMethod(val)}>
                            <SelectTrigger className="h-11 bg-white border-slate-200 text-xs font-semibold rounded-xl">
                              <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="Cash">Cash</SelectItem>
                              <SelectItem value="UPI">UPI / QR Scan</SelectItem>
                              <SelectItem value="Card">Card</SelectItem>
                              <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-700">Refund Date & Time</Label>
                          <Input 
                            type="datetime-local"
                            className="h-11 bg-white border-slate-200 text-xs font-semibold rounded-xl"
                            value={refundDateTime}
                            onChange={(e) => setRefundDateTime(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-700">Reason for Refund</Label>
                        <Input 
                          className="h-11 bg-white border-slate-200 text-xs font-semibold rounded-xl" 
                          placeholder="e.g., Duplicate registration fee or diagnostic cancellation"
                          value={refundRemarks}
                          onChange={(e) => setRefundRemarks(e.target.value)}
                        />
                      </div>
                    </div>

                    <DialogFooter className="gap-2 pt-2">
                      <Button variant="outline" className="rounded-xl" onClick={() => setIsRefundOpen(false)}>Cancel</Button>
                      <Button className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold" onClick={handleProcessRefund}>
                        Confirm Refund
                      </Button>
                    </DialogFooter>
                  </div>
                );
              })()}
            </DialogContent>
          </Dialog>

          {/* Collect All Patient Dues Dialog */}
          <Dialog open={isCollectAllDuesOpen} onOpenChange={setIsCollectAllDuesOpen}>
            <DialogContent className="max-w-[95vw] sm:max-w-[480px] w-full bg-white rounded-2xl shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-500 animate-pulse" />
                  Collect All Patient Dues
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 font-semibold">
                  Record consolidated payment to clear or partially reduce ALL outstanding dues for this patient.
                </DialogDescription>
              </DialogHeader>

              {collectAllPatient && (() => {
                // Find all invoices with remaining dues for this patient
                const patientInvoices = bills.filter(b => b.patient_id === collectAllPatient.id || b.patientId === collectAllPatient.id);
                const outstandingInvoices = patientInvoices.map(b => {
                  const gross = Number(b.total_amount || b.totalAmount || 0);
                  const disc = Number(b.discount_amount || b.discount || 0);
                  const paid = Number(b.paid_amount || b.paidAmount || 0);
                  const due = Math.max(0, gross - disc - paid);
                  return { ...b, due };
                }).filter(b => b.due > 0);

                const totalOutstanding = outstandingInvoices.reduce((sum, b) => sum + b.due, 0);

                return (
                  <div className="space-y-5 py-2">
                    {/* Patient Context Block */}
                    <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
                        <User className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Patient Details</p>
                        <p className="text-sm font-bold text-slate-800 truncate leading-none mb-1">{collectAllPatient.name}</p>
                        <p className="text-xs text-slate-500 font-semibold leading-none">MRN: {collectAllPatient.mrn || 'Walk-In'} | Outstanding Bills: <span className="font-bold text-rose-600">{outstandingInvoices.length}</span></p>
                      </div>
                    </div>

                    {/* Financial Summary Card */}
                    <div className="p-3.5 bg-amber-50/30 border border-amber-200/55 rounded-xl space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Total Outstanding Dues:</span>
                        <span className="text-base font-black text-rose-600 font-mono">{formatCurrency(totalOutstanding)}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Payments will be distributed sequentially starting with the oldest outstanding invoice (FIFO rule) to maintain proper account balancing.
                      </p>
                    </div>

                    {/* Payment Form Fields */}
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600">Amount to Collect (₹)</Label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                          <Input 
                            type="number"
                            className="h-11 pl-7 bg-white border-slate-200 text-sm font-bold rounded-xl pr-20" 
                            placeholder="0"
                            value={collectAllAmount}
                            onChange={(e) => setCollectAllAmount(e.target.value)}
                          />
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            type="button"
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 text-xs font-bold text-emerald-600 hover:bg-slate-100 rounded-lg shrink-0"
                            onClick={() => setCollectAllAmount(totalOutstanding.toFixed(2))}
                          >
                            Collect Full Amount
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-700">Payment Method</Label>
                          <Select value={collectAllMethod} onValueChange={(val) => setCollectAllMethod(val)}>
                            <SelectTrigger className="h-11 bg-white border-slate-200 text-xs font-semibold rounded-xl">
                              <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="Cash">Cash</SelectItem>
                              <SelectItem value="UPI">UPI / QR Scan</SelectItem>
                              <SelectItem value="Card">Card</SelectItem>
                              <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-700">Reference / Txn ID</Label>
                          <Input 
                            className="h-11 bg-white border-slate-200 text-xs font-semibold rounded-xl" 
                            placeholder="Optional reference No."
                            value={collectAllRef}
                            onChange={(e) => setCollectAllRef(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-700">Transaction Date & Time</Label>
                        <Input 
                          type="datetime-local"
                          className="h-11 bg-white border-slate-200 text-xs font-semibold rounded-xl"
                          value={collectAllDateTime}
                          onChange={(e) => setCollectAllDateTime(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-700">Remarks</Label>
                        <Input 
                          className="h-11 bg-white border-slate-200 text-xs font-semibold rounded-xl" 
                          placeholder="e.g. Cleared all outstanding diagnostic and registration dues"
                          value={collectAllRemarks}
                          onChange={(e) => setCollectAllRemarks(e.target.value)}
                        />
                      </div>
                    </div>

                    <DialogFooter className="gap-2 pt-2">
                      <Button variant="outline" className="rounded-xl" onClick={() => setIsCollectAllDuesOpen(false)}>Cancel</Button>
                      <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold flex gap-1.5" onClick={handleProcessCollectAllDues}>
                        <Coins className="w-4 h-4" />
                        Confirm Consolidated Collection
                      </Button>
                    </DialogFooter>
                  </div>
                );
              })()}
            </DialogContent>
          </Dialog>

      {canUserViewFinancials(currentUser?.role) && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in">
          <Card className="border-none shadow-sm bg-medical-blue/5">
            <CardContent className="p-6">
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Total Hospital Revenue</p>
              <h3 className="text-2xl font-bold text-medical-blue">{formatCurrency(totalHospitalRevenue)}</h3>
              <p className="text-[10px] text-muted-foreground mt-1">Aggregated from all departments</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-6">
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Main Office Collection</p>
              <h3 className="text-2xl font-bold text-emerald-600">{formatCurrency(mainOfficeCollection)}</h3>
              <p className="text-[10px] text-muted-foreground mt-1">OPD, IPD, OT Services</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-6">
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Pharmacy Revenue</p>
              <h3 className="text-2xl font-bold text-teal-600">{formatCurrency(pharmacyRevenue)}</h3>
              <p className="text-[10px] text-muted-foreground mt-1">Collected at Pharmacy POS</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-6">
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Lab & Radiology</p>
              <h3 className="text-2xl font-bold text-purple-600">{formatCurrency(labRevenue)}</h3>
              <p className="text-[10px] text-muted-foreground mt-1">Collected at Lab Counter</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-wrap border-b border-slate-200 mt-6 select-none bg-white p-1 rounded-t-xl gap-1">
        <button
          className={`px-6 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'central-counter' 
              ? 'border-sky-600 text-sky-700 font-black bg-sky-50/80 rounded-t-lg' 
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
          onClick={() => setActiveTab('central-counter')}
        >
          💳 Centralised Payment Counter
        </button>
        {canUserViewFinancials(currentUser?.role) && (
          <button
            className={`px-6 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'analytics' 
                ? 'border-medical-blue text-medical-blue font-black bg-blue-50/40 rounded-t-lg' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            onClick={() => setActiveTab('analytics')}
          >
            📊 Accounts Overview & Charts
          </button>
        )}
        <button
          className={`px-6 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'recent' 
              ? 'border-medical-blue text-medical-blue font-black bg-blue-50/40 rounded-t-lg' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
          onClick={() => setActiveTab('recent')}
        >
          Recent Invoices
        </button>
        <button
          className={`px-6 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'consolidated' 
              ? 'border-medical-blue text-medical-blue font-black bg-blue-50/40 rounded-t-lg' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
          onClick={() => setActiveTab('consolidated')}
        >
          Patient Consolidated Ledger (Date-wise)
        </button>
        <button
          className={`px-6 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'opd-collection' 
              ? 'border-medical-blue text-medical-blue font-black bg-blue-50/40 rounded-t-lg' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
          onClick={() => setActiveTab('opd-collection')}
        >
          📁 OPD Collection & Doctor Statements
        </button>
        <button
          className={`px-6 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'opd-panel' 
              ? 'border-medical-blue text-medical-blue font-black bg-blue-50/40 rounded-t-lg' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
          onClick={() => setActiveTab('opd-panel')}
        >
          🏥 OPD Management Features
        </button>
      </div>

      {activeTab === 'central-counter' && (
        <CentralizedPaymentCounter
          bills={bills}
          patients={patients}
          users={users}
          hospitalInfo={hospitalInfo}
          currentUser={currentUser}
          onRefreshData={fetchData}
        />
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {bills.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-3xl p-10 text-center shadow-lg hover:shadow-xl transition-shadow max-w-2xl mx-auto my-12 animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 mx-auto mb-5">
                <Sparkles className="w-8 h-8 animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Dynamic Accounts Ledger Empty</h3>
              <p className="text-sm text-slate-500 mt-3 max-w-md mx-auto leading-relaxed">
                Connect and sync interactive ledger records to monitor live collections, outstanding accounts and analyze transaction structures.
              </p>
              <div className="mt-8 flex justify-center gap-3">
                <Button 
                  className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold gap-2 px-6 shadow-md shadow-teal-50"
                  onClick={handleSeedDemoInvoices}
                  disabled={seeding}
                >
                  {seeding ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating Ledgers...
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4" />
                      Auto-Seed Demo Billing
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  className="rounded-xl font-bold" 
                  onClick={() => setIsInvoiceOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Manual Invoice
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Top Analytical KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="border-none shadow-sm bg-gradient-to-tr from-slate-50 to-slate-100/50">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Gross Invoiced</p>
                      <h4 className="text-xl font-bold text-slate-800 mt-1">{formatCurrency(analyticsData.totalBilled)}</h4>
                      <p className="text-[9px] text-slate-400 mt-1">Sum of all generated charges</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                      <Coins className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-gradient-to-tr from-emerald-50/50 to-emerald-100/30">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Payments Collected</p>
                      <h4 className="text-xl font-bold text-emerald-700 mt-1">{formatCurrency(analyticsData.totalPaid)}</h4>
                      <p className="text-[9px] text-emerald-600/70 mt-1">Realized liquid hospital cash</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-gradient-to-tr from-amber-50/50 to-amber-100/30">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">Outstanding Dues</p>
                      <h4 className="text-xl font-bold text-amber-600 mt-1">{formatCurrency(analyticsData.totalOutstanding)}</h4>
                      <p className="text-[9px] text-amber-600/70 mt-1">Unreleased patient accounts</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                      <Clock className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-gradient-to-tr from-blue-50/50 to-blue-100/30">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-blue-700 font-bold uppercase tracking-wider">Realization Rate</p>
                      <h4 className="text-xl font-bold text-blue-700 mt-1">{analyticsData.collectionRate.toFixed(1)}%</h4>
                      <p className="text-[9px] text-blue-600/70 mt-1">Collection conversion ratio</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-gradient-to-tr from-rose-50/50 to-rose-100/30">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-rose-700 font-bold uppercase tracking-wider font-black">Refunds Issued</p>
                      <h4 className="text-xl font-bold text-rose-700 mt-1">{formatCurrency(analyticsData.totalRefunded)}</h4>
                      <p className="text-[9px] text-rose-600/70 mt-1">Returned patient capital</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
                      <RefreshCw className="w-5 h-5 text-rose-600 animate-spin-slow" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Analytical Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Monthly Revenue Trend Area Chart */}
                <Card className="border-none shadow-sm">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        <BarChart3 className="w-4 h-4 text-medical-blue" />
                        Daily Collections Trend
                      </CardTitle>
                      <CardDescription className="text-xs">Real-time ledger entries tracking cash flow</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="h-[280px]">
                    {analyticsData.trendData.length > 0 ? (
                      <div className="w-full h-full min-h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={analyticsData.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorBilled" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#1e40af" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#1e40af" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <Tooltip 
                              formatter={(value: number) => [`₹${value.toLocaleString()}`, '']}
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.06)', fontFamily: 'Inter, sans-serif' }}
                            />
                            <Area name="Total Billed" type="monotone" dataKey="billed" stroke="#1e40af" strokeWidth={2} fillOpacity={1} fill="url(#colorBilled)" />
                            <Area name="Collections" type="monotone" dataKey="collected" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorCollected)" />
                            <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
                        Insufficient invoice histories to plot visual graphs
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Departmental Revenue Distribution */}
                <Card className="border-none shadow-sm">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        <Coins className="w-4 h-4 text-emerald-600" />
                        Collection Share by Department
                      </CardTitle>
                      <CardDescription className="text-xs">Proportion of gross realized revenue</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="h-[280px]">
                    {analyticsData.categoryData.length > 0 ? (
                      <div className="w-full h-full min-h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analyticsData.categoryData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                            <XAxis type="number" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} width={100} />
                            <Tooltip 
                              formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue Share']}
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }}
                            />
                            <Bar dataKey="value" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={16}>
                              {analyticsData.categoryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={['#0e2954', '#10b981', '#8b5cf6', '#eab308', '#ec4899', '#f97316'][index % 6]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
                        No categorical listings processed yet
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Payment Method Distribution */}
                <Card className="border-none shadow-sm">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-purple-600" />
                        Transactions by Payment Mode
                      </CardTitle>
                      <CardDescription className="text-xs">Realized transactional totals grouped by channel</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="h-[280px]">
                    {analyticsData.methodData.length > 0 ? (
                      <div className="w-full h-full min-h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analyticsData.methodData} margin={{ top: 15, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <Tooltip 
                              formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Total Collected']}
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }}
                            />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={26}>
                              {analyticsData.methodData.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
                        No payments recorded for distribution analysis
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Revenue Health Ledger Audit */}
                <Card className="border-none shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Invoice Portfolio Health
                    </CardTitle>
                    <CardDescription className="text-xs">Classification of existing patient ledger entries</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-50 bg-slate-50/50">
                        <div className="flex items-center gap-2.5">
                          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                          <span className="text-xs font-semibold text-slate-700">Fully Settled Invoices</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black text-slate-800">{analyticsData.statusCounts.paid}</span>
                          <span className="text-[10px] text-muted-foreground ml-1.5 uppercase font-bold tracking-tight">Records</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-50 bg-slate-50/50">
                        <div className="flex items-center gap-2.5">
                          <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                          <span className="text-xs font-semibold text-slate-700">Partially Paid Invoices</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black text-slate-800">{analyticsData.statusCounts.partial}</span>
                          <span className="text-[10px] text-muted-foreground ml-1.5 uppercase font-bold tracking-tight">Records</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-50 bg-slate-50/50">
                        <div className="flex items-center gap-2.5">
                          <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                          <span className="text-xs font-semibold text-slate-700">Pending Dues & Drafts</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black text-slate-800">{analyticsData.statusCounts.unpaid}</span>
                          <span className="text-[10px] text-muted-foreground ml-1.5 uppercase font-bold tracking-tight">Records</span>
                        </div>
                      </div>

                      <div className="text-center pt-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-xs text-medical-blue hover:text-medical-blue/80 hover:bg-transparent font-bold h-7 gap-1"
                          onClick={() => setActiveTab('recent')}
                        >
                          Access Core Posting Ledger
                          <ArrowUpRight className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'recent' && (() => {
        const currentFilteredInvoices = filterCategory === 'expenses'
          ? expenses.filter(exp => {
              const matchesSearch = 
                (exp.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (exp.description || '').toLowerCase().includes(searchQuery.toLowerCase());
              if (!matchesSearch) return false;

              const expDateStr = exp.expense_date || exp.created_at || '';
              const expDate = getCleanDateString(expDateStr) || (expDateStr ? expDateStr.split('T')[0] : '');

              let dateRangeMatch = true;
              if (recentInvoicesStartDate) {
                dateRangeMatch = dateRangeMatch && !!expDate && expDate >= recentInvoicesStartDate;
              }
              if (recentInvoicesEndDate) {
                dateRangeMatch = dateRangeMatch && !!expDate && expDate <= recentInvoicesEndDate;
              }
              
              let paymentMethodMatch = true;
              if (filterPaymentMethod !== 'all') {
                const bMethod = (exp.payment_method || exp.paymentMethod || 'N/A').toLowerCase();
                paymentMethodMatch = bMethod === filterPaymentMethod.toLowerCase() || bMethod.includes(filterPaymentMethod.toLowerCase());
              }
              
              return dateRangeMatch && paymentMethodMatch;
            }).map(exp => ({
              totalAmount: Number(exp.amount || 0),
              paidAmount: Number(exp.amount || 0),
              dueAmount: 0,
              status: exp.status || 'Paid'
            }))
          : filteredBills.map(b => ({
              totalAmount: Number(b.total_amount || b.totalAmount || 0),
              paidAmount: Number(b.paid_amount || b.paidAmount || 0),
              dueAmount: Number(b.due || b.due_amount || Math.max(0, Number(b.total_amount || b.totalAmount || 0) - Number(b.paid_amount || b.paidAmount || 0))),
              status: b.status || 'Paid'
            }));

        const totalInvoiceVal = currentFilteredInvoices.reduce((sum, item) => sum + item.totalAmount, 0);
        const totalCollectedVal = currentFilteredInvoices.reduce((sum, item) => sum + item.paidAmount, 0);
        const totalDuesVal = currentFilteredInvoices.reduce((sum, item) => sum + item.dueAmount, 0);
        const totalCount = currentFilteredInvoices.length;

        return (
          <div className="space-y-4">
            {/* Dynamic Total Summary for Filtered Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-900 text-white rounded-2xl shadow-md border border-slate-800">
              <div className="space-y-1 p-3 rounded-xl bg-slate-800/70 border border-slate-700/60">
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">Total Selected Invoices Value</span>
                <span className="text-2xl font-black text-white">{formatCurrency(totalInvoiceVal)}</span>
                <p className="text-[10px] text-slate-400 font-medium">Sum of invoices as per filter applied</p>
              </div>
              <div className="space-y-1 p-3 rounded-xl bg-slate-800/70 border border-slate-700/60">
                <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block">Total Amount Collected</span>
                <span className="text-2xl font-black text-emerald-400">{formatCurrency(totalCollectedVal)}</span>
                <p className="text-[10px] text-slate-400 font-medium">Actual collected amount</p>
              </div>
              <div className="space-y-1 p-3 rounded-xl bg-slate-800/70 border border-slate-700/60">
                <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider block">Total Outstanding Balance</span>
                <span className="text-2xl font-black text-rose-400">{formatCurrency(totalDuesVal)}</span>
                <p className="text-[10px] text-slate-400 font-medium">Pending dues for selected invoices</p>
              </div>
              <div className="space-y-1 p-3 rounded-xl bg-slate-800/70 border border-slate-700/60">
                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">Filtered Invoices Count</span>
                <span className="text-2xl font-black text-amber-300">{totalCount} <span className="text-xs font-normal text-slate-300">Invoices</span></span>
                <p className="text-[10px] text-slate-400 font-medium">Matching selection criteria</p>
              </div>
            </div>

            <Card className="border-none shadow-sm rounded-t-none">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="text-lg">Recent Invoices</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Total Invoices Value for Selection: <span className="font-bold text-slate-900">{formatCurrency(totalInvoiceVal)}</span> ({totalCount} Invoices)
                  </CardDescription>
                </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Numbering Scheme Selector */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={`h-7 px-2.5 text-[11px] rounded-md font-bold transition-all ${
                    invoiceNumberingScheme === 'department'
                      ? 'bg-medical-blue text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  onClick={() => setInvoiceNumberingScheme('department')}
                  title="Group and serial number invoices by Department (e.g. OPD-0001, IPD-0001, PHARM-0001)"
                >
                  Dept-wise Serial #
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={`h-7 px-2.5 text-[11px] rounded-md font-bold transition-all ${
                    invoiceNumberingScheme === 'global'
                      ? 'bg-medical-blue text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  onClick={() => setInvoiceNumberingScheme('global')}
                  title="Global sequential numbering across all hospital invoices (INV-1001, INV-1002...)"
                >
                  Global Serial #
                </Button>
              </div>

              <div className="relative w-52">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search name, MRN, phone..." 
                  className="pl-10 bg-slate-50 border-none h-9" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[130px] h-9 bg-white border-slate-200">
                  <div className="flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                    <SelectValue placeholder="Category" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Invoices</SelectItem>
                  <SelectItem value="opd">OPD Bills</SelectItem>
                  <SelectItem value="endoscopy">Endoscopy & Colonoscopy</SelectItem>
                  <SelectItem value="ipd">IPD Bills</SelectItem>
                  <SelectItem value="lab">Lab/Diagnostics</SelectItem>
                  <SelectItem value="radiology">Radiology</SelectItem>
                  <SelectItem value="pharmacy">Pharmacy Bills</SelectItem>
                  <SelectItem value="ot">OT Management</SelectItem>
                  <SelectItem value="insurance">Insurance Claims</SelectItem>
                  <SelectItem value="refunds">Refunds Issued</SelectItem>
                  <SelectItem value="expenses">Facility Expenses</SelectItem>
                  <SelectItem value="custom">CUSTOM</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterPaymentMethod} onValueChange={setFilterPaymentMethod}>
                <SelectTrigger className="w-[145px] h-9 bg-white border-slate-200">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                    <SelectValue placeholder="Payment Mode" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modes</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI / QR</SelectItem>
                  <SelectItem value="card">Card (Debit/Credit)</SelectItem>
                  <SelectItem value="bank">Bank Transfer / NEFT</SelectItem>
                  <SelectItem value="cheque">Cheque / DD</SelectItem>
                  <SelectItem value="insurance">Insurance / TPA</SelectItem>
                  <SelectItem value="multi-mode">Multi-Mode</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Filters & Presets */}
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 h-9">
                <span className="text-[9px] uppercase font-bold text-muted-foreground px-1">From:</span>
                <Input 
                  type="date" 
                  value={recentInvoicesStartDate}
                  onChange={(e) => setRecentInvoicesStartDate(e.target.value)}
                  className="h-7 w-28 text-[11px] border-none bg-transparent font-bold p-0 focus-visible:ring-0"
                />
                <span className="text-[9px] uppercase font-bold text-muted-foreground px-1">To:</span>
                <Input 
                  type="date" 
                  value={recentInvoicesEndDate}
                  onChange={(e) => setRecentInvoicesEndDate(e.target.value)}
                  className="h-7 w-28 text-[11px] border-none bg-transparent font-bold p-0 focus-visible:ring-0"
                />
                {(recentInvoicesStartDate || recentInvoicesEndDate) && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 text-[10px] uppercase font-bold"
                    onClick={() => {
                      setRecentInvoicesStartDate('');
                      setRecentInvoicesEndDate('');
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div 
              className="overflow-x-auto max-h-[60vh] overflow-y-auto custom-scrollbar relative" 
            >
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-100 text-[11px] uppercase tracking-wider font-bold text-slate-500">
                    <TableHead className="whitespace-nowrap">Invoice ID</TableHead>
                    <TableHead className="whitespace-nowrap">Patient/Facility Details</TableHead>
                    <TableHead className="whitespace-nowrap">Department</TableHead>
                    <TableHead className="whitespace-nowrap">Contact Info / Description</TableHead>
                    <TableHead className="whitespace-nowrap">Date</TableHead>
                    <TableHead className="whitespace-nowrap">Amount</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="whitespace-nowrap">Mode</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const displayedBills = filterCategory === 'expenses'
                      ? expenses
                          .filter(exp => {
                            const matchesSearch = 
                              (exp.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (exp.description || '').toLowerCase().includes(searchQuery.toLowerCase());
                            if (!matchesSearch) return false;

                            const expDateStr = exp.expense_date || exp.created_at || '';
                            const expDate = getCleanDateString(expDateStr) || (expDateStr ? expDateStr.split('T')[0] : '');

                            let dateRangeMatch = true;
                            if (recentInvoicesStartDate) {
                              dateRangeMatch = dateRangeMatch && !!expDate && expDate >= recentInvoicesStartDate;
                            }
                            if (recentInvoicesEndDate) {
                              dateRangeMatch = dateRangeMatch && !!expDate && expDate <= recentInvoicesEndDate;
                            }
                            
                            let paymentMethodMatch = true;
                            if (filterPaymentMethod !== 'all') {
                              const bMethod = (exp.payment_method || exp.paymentMethod || 'N/A').toLowerCase();
                              paymentMethodMatch = bMethod === filterPaymentMethod.toLowerCase() || bMethod.includes(filterPaymentMethod.toLowerCase());
                            }
                            
                            return dateRangeMatch && paymentMethodMatch;
                          })
                          .map(exp => ({
                            id: exp.id,
                            patients: { name: `Facility Expense`, mrn: exp.category, phone: `N/A`, email: exp.description },
                            type: 'Expense',
                            created_at: exp.expense_date || exp.created_at || new Date().toISOString(),
                            paid_amount: exp.amount,
                            total_amount: exp.amount,
                            status: exp.status || 'Paid',
                            payment_method: 'N/A',
                            isExpense: true,
                            created_by: exp.created_by,
                            rawExpense: exp
                          }))
                      : filteredBills;

                    const sortedDisplayedBills = sortInvoicesByLatestSerial(displayedBills, activeInvoiceMap);

                    const slicedDisplayedBills = sortedDisplayedBills.slice((billingPage - 1) * itemsPerPage, billingPage * itemsPerPage);

                    return slicedDisplayedBills.map((bill) => {
                      const roleUpper = (currentUser?.role || '').toUpperCase();
                      const patInfo = getBillPatientInfo(bill);
                      const isDuplicate = !bill.isExpense && patInfo.name && patInfo.name !== 'Walk-in' && duplicateNamesSet.has(patInfo.name.toLowerCase().trim());

                      return (
                        <TableRow key={bill.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <TableCell className="font-bold text-medical-blue whitespace-nowrap">
                            {activeInvoiceMap[bill.id] ? `#${activeInvoiceMap[bill.id]}` : (bill.id.startsWith('exp') || bill.id.startsWith('note-') ? bill.id.toUpperCase() : `#${bill.id.slice(0, 8).toUpperCase()}`)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-800">{patInfo.name}</span>
                                {isDuplicate && (
                                  <Badge 
                                    variant="outline" 
                                    className="bg-amber-50 text-amber-800 border-amber-300 text-[9.5px] font-bold px-1.5 py-0 shadow-none inline-flex items-center gap-1"
                                    title={`Duplicate Name Detected: Multiple patient records exist with the name "${patInfo.name}". Verify MRN: ${patInfo.mrn}`}
                                  >
                                    <AlertTriangle className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                    Duplicate Name
                                  </Badge>
                                )}
                              </div>
                              <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1 mt-0.5">
                                <span>MRN:</span>
                                <span className={isDuplicate ? "font-bold text-amber-900 bg-amber-100/70 px-1 rounded" : "font-semibold text-slate-700"}>
                                  {patInfo.mrn}
                                </span>
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {(() => {
                              const deptInfo = getBillDepartmentAndType(bill);
                              const deptName = bill.isExpense ? 'Facility Expense' : (deptInfo.departmentName || bill.type || 'General');
                              const prefix = deptInfo.prefix;
                              let badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200';
                              if (bill.isExpense) badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200';
                              else if (prefix === 'ENDO') badgeStyle = 'bg-purple-50 text-purple-700 border-purple-200';
                              else if (prefix === 'OPD') badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                              else if (prefix === 'IPD') badgeStyle = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                              else if (prefix === 'OT') badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200';
                              else if (prefix === 'LAB') badgeStyle = 'bg-cyan-50 text-cyan-700 border-cyan-200';
                              else if (prefix === 'RADIO') badgeStyle = 'bg-violet-50 text-violet-700 border-violet-200';
                              else if (prefix === 'PHARM') badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200';

                              return (
                                <Badge variant="outline" className={`text-[10px] font-bold ${badgeStyle}`}>
                                  {deptName}
                                </Badge>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <div className="flex flex-col text-[11px]">
                              <span className="text-slate-600 font-medium">{patInfo.phone}</span>
                              <span className="text-slate-400 max-w-[200px] truncate">{patInfo.email || (bill.rawExpense ? bill.rawExpense.description : (bill.description || 'No description'))}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(bill.created_at)}</TableCell>

                          <TableCell className="font-bold whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-slate-900 font-bold">{formatCurrency(bill.payable_amount ?? bill.payableAmount ?? bill.total_amount ?? bill.totalAmount ?? 0)}</span>
                              <span className="text-[10px] text-emerald-600 font-bold">Paid: {formatCurrency(bill.paid_amount ?? bill.paidAmount ?? 0)}</span>
                              <span className="text-[10px] text-rose-500 font-bold">Discount: {formatCurrency(bill.discount_amount ?? bill.discountAmount ?? bill.discount ?? 0)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Badge variant="secondary" className={`border-none ${
                              bill.status === 'Settled' || bill.status === 'Paid' ? 'bg-emerald-50 text-emerald-600' :
                              bill.status === 'Partial' ? 'bg-amber-50 text-amber-600' :
                              bill.status === 'Refunded' ? 'bg-purple-50 text-purple-600 border border-purple-200' :
                              'bg-rose-50 text-rose-600'
                            }`}>
                              {bill.status === 'Settled' || bill.status === 'Paid' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : 
                               bill.status === 'Partial' ? <Clock className="w-3 h-3 mr-1" /> : 
                               bill.status === 'Refunded' ? <RefreshCw className="w-3 h-3 mr-1" /> :
                               <AlertCircle className="w-3 h-3 mr-1" />}
                              {bill.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {(() => {
                              const mode = String(bill.payment_method || bill.paymentMode || bill.paymentMethod || 'N/A');
                              const modeLower = mode.toLowerCase();
                              let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
                              if (modeLower.includes('cash')) badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                              else if (modeLower.includes('upi') || modeLower.includes('qr')) badgeColor = 'bg-sky-50 text-sky-800 border-sky-200';
                              else if (modeLower.includes('card')) badgeColor = 'bg-indigo-50 text-indigo-800 border-indigo-200';
                              else if (modeLower.includes('bank') || modeLower.includes('neft')) badgeColor = 'bg-blue-50 text-blue-800 border-blue-200';
                              else if (modeLower.includes('cheque') || modeLower.includes('dd')) badgeColor = 'bg-violet-50 text-violet-800 border-violet-200';
                              else if (modeLower.includes('insurance') || modeLower.includes('tpa')) badgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
                              else if (modeLower.includes('multi')) badgeColor = 'bg-purple-50 text-purple-800 border-purple-200';

                              return (
                                <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-wider ${badgeColor}`}>
                                  {mode}
                                </Badge>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2 items-center">
                              {!bill.isExpense && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-medical-blue" 
                                  title={(!bill.patientId && !bill.patient_id) ? "No registered patient profile" : "Patient 360 Overview"} 
                                  onClick={() => {
                                    const pid = bill.patient_id || bill.patientId;
                                    if (!pid) {
                                      toast.error("This invoice belongs to a Walk-in patient. No registered patient profile exists.");
                                      return;
                                    }
                                    navigate(`/patient-overview?id=${pid}`);
                                  }}
                                >
                                  <Search className="w-4 h-4" />
                                </Button>
                              )}
                              {!bill.isExpense && (Number(bill.paid_amount || bill.paidAmount || 0) < Number(bill.payable_amount || bill.payableAmount || bill.total_amount || bill.totalAmount || 0)) && bill.status !== 'Refunded' && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" 
                                  title="Receive Payment" 
                                  onClick={() => handleOpenReceivePayment(bill)}
                                >
                                  <CreditCard className="w-4 h-4" />
                                </Button>
                              )}
                              {!bill.isExpense && Number(bill.paid_amount || bill.paidAmount || 0) > 0 && bill.status !== 'Refunded' && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50" 
                                  title="Issue Refund" 
                                  onClick={() => handleOpenRefund(bill)}
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </Button>
                              )}
                              {!bill.isExpense && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => printInvoice(bill)}>
                                  <Printer className="w-4 h-4" />
                                </Button>
                              )}
                              {canModify(bill) ? (
                                <>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-medical-blue" onClick={() => {
                                    if (bill.isExpense) {
                                      toast.info("Please navigate to the Expenses tab to edit facilities expenses.");
                                    } else {
                                      handleEditBill(bill);
                                    }
                                  }}>
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  {!(roleUpper === 'RECEPTIONIST' || roleUpper === 'RECEPTION' || roleUpper === 'FRONT_DESK' || roleUpper === 'DOCTOR' || roleUpper === 'SURGEON' || roleUpper === 'ACCOUNTANT' || roleUpper === 'ACCOUNTS') && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={async () => {
                                      if (bill.isExpense) {
                                        const ok = await supabaseService.deleteExpense(bill.id);
                                        if (ok) {
                                          toast.success("Expense record removed");
                                          fetchData();
                                        } else {
                                          toast.error("Failed to remove expense record");
                                        }
                                      } else {
                                        handleDeleteBill(bill.id);
                                      }
                                    }}>
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </>
                              ) : (
                                <Badge variant="secondary" className="text-[10px] text-slate-400 bg-slate-100 font-bold hover:bg-slate-100 select-none px-2 py-0.5">Admin Locked</Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    });
                  })()}
                </TableBody>
              </Table>
            </div>

            {(() => {
              const displayedBills = filterCategory === 'expenses'
                ? expenses.filter(exp => {
                    const matchesSearch = 
                      (exp.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (exp.description || '').toLowerCase().includes(searchQuery.toLowerCase());
                    if (!matchesSearch) return false;
                    const expDateStr = exp.expense_date || exp.created_at || '';
                    const expDate = getCleanDateString(expDateStr) || (expDateStr ? expDateStr.split('T')[0] : '');
                    let dateRangeMatch = true;
                    if (recentInvoicesStartDate) {
                      dateRangeMatch = dateRangeMatch && !!expDate && expDate >= recentInvoicesStartDate;
                    }
                    if (recentInvoicesEndDate) {
                      dateRangeMatch = dateRangeMatch && !!expDate && expDate <= recentInvoicesEndDate;
                    }
                    let paymentMethodMatch = true;
                    if (filterPaymentMethod !== 'all') {
                      const bMethod = (exp.payment_method || exp.paymentMethod || 'N/A').toLowerCase();
                      paymentMethodMatch = bMethod === filterPaymentMethod.toLowerCase() || bMethod.includes(filterPaymentMethod.toLowerCase());
                    }
                    return dateRangeMatch && paymentMethodMatch;
                  })
                : filteredBills;
              const totalCount = displayedBills.length;
              if (totalCount > 0) {
                return (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                    <div className="text-xs text-slate-500">
                      Showing <strong>{Math.min(totalCount, (billingPage - 1) * itemsPerPage + 1)}</strong> to{' '}
                      <strong>{Math.min(totalCount, billingPage * itemsPerPage)}</strong> of{' '}
                      <strong>{totalCount}</strong> entries
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-xs bg-white text-slate-700 hover:bg-slate-50"
                        onClick={() => setBillingPage(prev => Math.max(prev - 1, 1))}
                        disabled={billingPage === 1}
                      >
                        Previous
                      </Button>
                      {Array.from({ length: Math.ceil(totalCount / itemsPerPage) }, (_, idx) => idx + 1)
                        .filter(p => p === 1 || p === Math.ceil(totalCount / itemsPerPage) || Math.abs(p - billingPage) <= 1)
                        .map((p, i, arr) => {
                          return (
                            <React.Fragment key={p}>
                              {i > 0 && arr[i - 1] !== p - 1 && <span className="text-slate-400 px-1 text-xs">...</span>}
                              <Button
                                variant={p === billingPage ? 'default' : 'outline'}
                                size="sm"
                                className={`h-8 w-8 text-xs p-0 ${p === billingPage ? 'bg-medical-blue hover:bg-medical-blue/90 text-white border-none' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                                onClick={() => setBillingPage(p)}
                              >
                                {p}
                              </Button>
                            </React.Fragment>
                          );
                        })}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-xs bg-white text-slate-700 hover:bg-slate-50"
                        onClick={() => setBillingPage(prev => Math.min(prev + 1, Math.ceil(totalCount / itemsPerPage)))}
                        disabled={billingPage === Math.ceil(totalCount / itemsPerPage)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </CardContent>
        </Card>
      </div>
      )})()}

      {activeTab === 'consolidated' && (
        <Card className="border-none shadow-sm rounded-t-none">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-800">Select Patient for Consolidated Date-wise Statement</CardTitle>
            <CardDescription>Retrieve, review, and print combined bills of Pharmacy, Doctor Consultation, Lab tests, OT/Radiology, and Maternity on a single timeline.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="relative max-w-md space-y-2">
              <Label>Search Patient by Name, phone, or MRN ID</Label>
              <div className="relative border-none">
                <Input
                  placeholder="type patient details..."
                  className="pl-10"
                  value={conPatientSearch}
                  onChange={(e) => {
                    setConPatientSearch(e.target.value);
                    setShowConPatientResults(true);
                  }}
                  onFocus={() => setShowConPatientResults(true)}
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                {conPatientSearch && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-2 top-1 h-8 w-8 text-slate-400" 
                    onClick={() => {
                      setConPatientSearch('');
                      setConPatientId('');
                    }}
                  >
                    ×
                  </Button>
                )}
              </div>

              {showConPatientResults && conPatientSearch.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-[220px] overflow-y-auto custom-scrollbar">
                  {patients.filter(p => 
                    p.name.toLowerCase().includes(conPatientSearch.toLowerCase()) || 
                    (p.phone || '').includes(conPatientSearch) ||
                    (p.mrn || '').toLowerCase().includes(conPatientSearch.toLowerCase())
                  ).length > 0 ? (
                    patients.filter(p => 
                      p.name.toLowerCase().includes(conPatientSearch.toLowerCase()) || 
                      (p.phone || '').includes(conPatientSearch) ||
                      (p.mrn || '').toLowerCase().includes(conPatientSearch.toLowerCase())
                    ).map(p => (
                      <div 
                        key={p.id} 
                        className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex justify-between items-center border-b border-slate-100 last:border-0 text-sm"
                        onClick={() => {
                          setConPatientId(p.id);
                          setConPatientSearch(p.name);
                          setShowConPatientResults(false);
                        }}
                      >
                        <div>
                          <p className="font-bold text-slate-800">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground">MRN: {p.mrn || 'N/A'} | Age: {p.age || 'N/A'}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px]">{p.phone || 'N/A'}</Badge>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-muted-foreground">No patients matched this search</div>
                  )}
                </div>
              )}
            </div>

            {conPatientId && conPatientId !== '' && (
              <div className="space-y-6">
                {/* Patient Overview Card */}
                {(() => {
                  const selectedPatientData = patients.find(p => p.id === conPatientId);
                  const conPatientInvoices = bills.filter(b => b.patient_id === conPatientId || b.patientId === conPatientId);
                  const conPatientInvoicesByDate = conPatientInvoices.reduce((acc: Record<string, any[]>, bill) => {
                    const rawDate = bill.created_at || bill.date || new Date().toISOString();
                    const dateKey = rawDate.split('T')[0];
                    if (!acc[dateKey]) acc[dateKey] = [];
                    acc[dateKey].push(bill);
                    return acc;
                  }, {} as Record<string, any[]>);

                  if (!selectedPatientData) return null;

                  return (
                    <div className="space-y-6">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50 border border-slate-200/60 p-4 rounded-xl gap-4">
                        <div>
                          <h3 className="text-lg font-bold text-slate-800">{selectedPatientData.name}</h3>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            MRN: <span className="font-bold text-medical-blue">{selectedPatientData.mrn || 'N/A'}</span> &bull; 
                            Age: <span className="font-bold">{selectedPatientData.age || 'N/A'}</span> &bull; 
                            Gender: <span className="font-bold uppercase">{selectedPatientData.gender || 'N/A'}</span> &bull; 
                            Phone: <span className="font-bold">{selectedPatientData.phone || 'N/A'}</span>
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            className="bg-medical-blue gap-1.5 h-9 text-xs font-bold" 
                            onClick={() => printConsolidatedStatement(selectedPatientData, conPatientInvoices)}
                            disabled={conPatientInvoices.length === 0}
                          >
                            <Printer className="w-4 h-4" />
                            Print Date-wise Consolidated Bill
                          </Button>
                          <Button 
                            variant="outline" 
                            className="h-9 text-xs" 
                            onClick={() => {
                              setConPatientId('');
                              setConPatientSearch('');
                            }}
                          >
                            Clear Selection
                          </Button>
                        </div>
                      </div>

                      {/* Invoices Timeline */}
                      {conPatientInvoices.length > 0 ? (
                        <div className="space-y-6">
                          {/* Summary Totals */}
                          {(() => {
                            const grossTotal = conPatientInvoices.reduce((sum, b) => sum + Number(b.total_amount || b.totalAmount || 0), 0);
                            const discTotal = conPatientInvoices.reduce((sum, b) => sum + Number(b.discount_amount || b.discount || 0), 0);
                            const paidTotal = conPatientInvoices.reduce((sum, b) => sum + Number(b.paid_amount || b.paidAmount || 0), 0);
                            const outstandingDues = Math.max(0, grossTotal - discTotal - paidTotal);
                            return (
                              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 border border-blue-50 bg-blue-50/10 p-4 rounded-xl items-center">
                                <div>
                                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Gross Combined Total</span>
                                  <h4 className="text-base font-bold text-slate-800">
                                    {formatCurrency(grossTotal)}
                                  </h4>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Combined Discount</span>
                                  <h4 className="text-base font-bold text-rose-500">
                                    {formatCurrency(discTotal)}
                                  </h4>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Net Amount Settled</span>
                                  <h4 className="text-base font-black text-emerald-600">
                                    {formatCurrency(paidTotal)}
                                  </h4>
                                </div>
                                <div className="border-l pl-4 border-slate-200">
                                  <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">Outstanding Dues</span>
                                  <h4 className={`text-base font-black ${outstandingDues > 0 ? "text-rose-600 animate-pulse font-extrabold" : "text-slate-400"}`}>
                                    {formatCurrency(outstandingDues)}
                                  </h4>
                                </div>
                                <div className="md:col-span-1 flex justify-end">
                                  {outstandingDues > 0 ? (
                                    <Button 
                                      onClick={() => handleOpenCollectAllDues(selectedPatientData)}
                                      className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-black text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 h-auto shadow-md animate-pulse shrink-0"
                                    >
                                      <Coins className="w-4 h-4 stroke-[2]" />
                                      Collect All Dues
                                    </Button>
                                  ) : (
                                    <span className="text-emerald-600 text-xs font-black flex items-center gap-1.5 bg-emerald-50 border border-emerald-100/55 px-3 py-1.5 rounded-xl">
                                      ✓ Fully Paid
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })()}

                          {/* Timeline List group by Date */}
                          <div className="relative border-l-2 border-slate-200 ml-3 pl-6 space-y-8">
                            {Object.entries(conPatientInvoicesByDate)
                              .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
                              .map(([dateKey, dayBills]) => {
                                const billsList = dayBills as any[];
                                return (
                                  <div key={dateKey} className="relative">
                                    <span className="absolute -left-[31px] top-1 bg-medical-blue h-4 w-4 rounded-full border-4 border-white shadow-sm"></span>
                                    <div className="flex items-center gap-3 mb-3">
                                      <Badge className="bg-medical-blue py-1 text-xs font-extrabold">{formatDate(dateKey)}</Badge>
                                      <span className="text-xs text-muted-foreground font-bold">
                                        {billsList.length} Bill Statement(s)
                                      </span>
                                    </div>

                                    <div className="space-y-3">
                                      {billsList.map((bill: any) => {
                                        const items = bill.invoice_items || bill.items || [];
                                        return (
                                          <div key={bill.id} className="bg-white border rounded-lg p-4 shadow-sm hover:border-slate-300 transition-all">
                                            <div className="flex justify-between items-start mb-3 border-b pb-2">
                                              <div>
                                                <span className="text-xs font-black text-medical-blue uppercase bg-blue-50 px-2 py-0.5 rounded mr-2">
                                                  {bill.type || 'HOSPITAL'} BILL
                                                </span>
                                                <span className="text-xs text-slate-400 font-bold">#{sequentialIdMap[bill.id] || bill.id.slice(0, 8).toUpperCase()}</span>
                                              </div>
                                              <div className="text-right">
                                                <span className="text-sm font-bold text-slate-800">
                                                  {formatCurrency(bill.paid_amount || bill.total_amount || 0)}
                                                </span>
                                              </div>
                                            </div>

                                            <div className="space-y-2">
                                              {items.length > 0 ? (
                                                items.map((item: any, idx: number) => (
                                                  <div key={idx} className="flex justify-between items-center text-xs">
                                                    <div className="flex flex-col">
                                                      <span className="font-semibold text-slate-700">{item.item_name || item.name || item.description}</span>
                                                      <span className="text-[10px] text-slate-400 font-bold uppercase">{item.category || 'General Fee'}</span>
                                                    </div>
                                                    <span className="font-bold text-slate-600">
                                                      {formatCurrency(item.unit_price || item.total_price || item.amount || 0)}
                                                    </span>
                                                  </div>
                                                ))
                                              ) : (
                                                <p className="text-slate-400 text-xs italic">No invoice items listed</p>
                                              )}
                                            </div>

                                            {/* Dues and Collect Payment Action */}
                                            {(() => {
                                              const gross = Number(bill.total_amount || bill.totalAmount || 0);
                                              const disc = Number(bill.discount_amount || bill.discount || 0);
                                              const paid = Number(bill.paid_amount || bill.paidAmount || 0);
                                              const billDue = Math.max(0, gross - disc - paid);
                                              return (
                                                <div className="mt-4 pt-3 border-t flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                                                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-500 font-medium">
                                                    <span>Gross: <strong className="text-slate-800">{formatCurrency(gross)}</strong></span>
                                                    {disc > 0 && <span>Discount: <strong className="text-rose-500">-{formatCurrency(disc)}</strong></span>}
                                                    <span>Paid: <strong className="text-emerald-600">{formatCurrency(paid)}</strong></span>
                                                    {billDue > 0 ? (
                                                      <span>Outstanding Due: <strong className="text-amber-600">{formatCurrency(billDue)}</strong></span>
                                                    ) : (
                                                      <span className="text-emerald-600 font-extrabold flex items-center gap-1">✓ Fully Paid</span>
                                                    )}
                                                  </div>
                                                  {billDue > 0 && (
                                                    <Button 
                                                      size="sm" 
                                                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-7 py-0.5 px-2.5 text-[10px] gap-1 rounded-lg shrink-0 ml-auto"
                                                      onClick={() => handleOpenReceivePayment(bill)}
                                                    >
                                                      <Coins className="w-3.5 h-3.5" />
                                                      Collect Payment
                                                    </Button>
                                                  )}
                                                </div>
                                              );
                                            })()}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl space-y-2">
                          <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                          <h5 className="font-bold text-slate-700">No Billing Transactions</h5>
                          <p className="text-xs text-muted-foreground">We couldn't find any recorded invoices or pharmacy/lab sales for this patient.</p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {!conPatientId && (
              <div className="space-y-6 pt-4 border-t border-slate-100">
                <div className="flex flex-col gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                      Patient Consolidated Ledger
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Retrieve, filter, and review combined billing ledgers showing gross bill, discount, payable, paid, and outstanding balance for all patients.
                    </p>
                  </div>
                  
                  {/* Advanced Multi-parameter Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                    <div className="relative">
                      <Label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">Search Patient</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <Input
                          placeholder="Name, MRN, or phone..."
                          value={outstandingSearchQuery}
                          onChange={(e) => setOutstandingSearchQuery(e.target.value)}
                          className="pl-9 h-9 text-xs bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">Payment Status</Label>
                      <select
                        value={outstandingStatusFilter}
                        onChange={(e) => setOutstandingStatusFilter(e.target.value)}
                        className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="all">All Patients with Bills</option>
                        <option value="outstanding">With Outstanding Balance</option>
                        <option value="settled">Fully Settled</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">From Date</Label>
                      <Input
                        type="date"
                        value={ledgerStartDate}
                        onChange={(e) => setLedgerStartDate(e.target.value)}
                        className="h-9 text-xs bg-white"
                      />
                    </div>

                    <div>
                      <Label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">To Date</Label>
                      <Input
                        type="date"
                        value={ledgerEndDate}
                        onChange={(e) => setLedgerEndDate(e.target.value)}
                        className="h-9 text-xs bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="hover:bg-transparent border-slate-100 text-[10px] uppercase tracking-wider font-extrabold text-slate-500">
                        <TableHead className="py-3 pl-4">Patient / MRN</TableHead>
                        <TableHead className="py-3">Contact Info</TableHead>
                        <TableHead className="py-3 text-right">Bill (Gross)</TableHead>
                        <TableHead className="py-3 text-right">Discount</TableHead>
                        <TableHead className="py-3 text-right">Payable</TableHead>
                        <TableHead className="py-3 text-right">Paid</TableHead>
                        <TableHead className="py-3 text-right font-black">Balance</TableHead>
                        <TableHead className="py-3 text-right pr-4">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activePatientsWithOutstanding.length > 0 ? (
                        activePatientsWithOutstanding.map((p) => (
                          <TableRow key={p.id} className="border-slate-50 hover:bg-slate-50/30 transition-colors">
                            <TableCell className="py-3 pl-4">
                              <div className="font-bold text-slate-800 text-xs">{p.name}</div>
                              <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                {p.mrn || 'N/A'}
                              </div>
                            </TableCell>
                            <TableCell className="py-3 text-xs text-slate-600">
                              <div>{p.phone || 'N/A'}</div>
                              {p.gender && (
                                <span className="text-[9px] uppercase font-bold text-slate-400 bg-slate-100 px-1 py-0.5 rounded">
                                  {p.gender} &bull; {p.age}Y
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="py-3 text-right font-medium text-slate-700 text-xs">
                              {formatCurrency(p.grossTotal)}
                            </TableCell>
                            <TableCell className="py-3 text-right font-medium text-rose-500 text-xs">
                              {p.discTotal > 0 ? `-${formatCurrency(p.discTotal)}` : '₹0.00'}
                            </TableCell>
                            <TableCell className="py-3 text-right font-medium text-slate-800 text-xs">
                              {formatCurrency(p.payableTotal)}
                            </TableCell>
                            <TableCell className="py-3 text-right font-medium text-emerald-600 text-xs">
                              {formatCurrency(p.paidTotal)}
                            </TableCell>
                            <TableCell className={`py-3 text-right font-black text-xs ${p.outstandingDues > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                              {formatCurrency(p.outstandingDues)}
                            </TableCell>
                            <TableCell className="py-3 text-right pr-4">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-[10px] font-bold border-medical-blue text-medical-blue hover:bg-medical-blue/5 gap-1"
                                  onClick={() => {
                                    setConPatientId(p.id);
                                    setConPatientSearch(p.name);
                                  }}
                                >
                                  View Statement
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                </Button>
                                {p.outstandingDues > 0 && (
                                  <Button
                                    size="sm"
                                    className="h-7 text-[10px] font-black bg-rose-600 hover:bg-rose-700 text-white gap-1 rounded-lg"
                                    onClick={() => handleOpenCollectAllDues(p)}
                                  >
                                    <Coins className="w-3.5 h-3.5" />
                                    Collect Dues
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="py-12 text-center text-xs text-muted-foreground">
                            No billing ledger records match the selected filter parameters.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'opd-collection' && (
        <OPDCollectionTab 
          bills={bills} 
          appointments={appointments} 
          patients={patients} 
          users={users} 
          opdStartDate={opdStartDate}
          setOpdStartDate={setOpdStartDate}
          opdEndDate={opdEndDate}
          setOpdEndDate={setOpdEndDate}
          opdDoctorFilter={opdDoctorFilter}
          setOpdDoctorFilter={setOpdDoctorFilter}
        />
      )}

      {activeTab === 'opd-panel' && (
        <div className="bg-white rounded-3xl p-1 border border-slate-100 shadow-sm animate-in fade-in duration-300">
          <OPD />
        </div>
      )}

      {/* Quick Add Patient Modal */}
      <Dialog open={isQuickAddPatientOpen} onOpenChange={setIsQuickAddPatientOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-medical-blue">
              <UserPlus className="w-5 h-5 text-medical-blue" />
              Quick Register New Patient
            </DialogTitle>
            <DialogDescription>
              Add patient details quickly to proceed with independent billing & invoicing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Patient Full Name *</Label>
              <Input 
                placeholder="Enter patient full name..." 
                value={quickPatient.name} 
                onChange={(e) => setQuickPatient({ ...quickPatient, name: e.target.value })}
                className="h-10 border-slate-200"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Phone Number</Label>
              <Input 
                placeholder="e.g. 9876543210 (Optional)" 
                value={quickPatient.phone} 
                onChange={(e) => setQuickPatient({ ...quickPatient, phone: e.target.value })}
                className="h-10 border-slate-200"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Gender</Label>
                <Select value={quickPatient.gender} onValueChange={(val) => setQuickPatient({ ...quickPatient, gender: val })}>
                  <SelectTrigger className="h-10 border-slate-200">
                    <SelectValue placeholder="Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Age (Years)</Label>
                <Input 
                  type="number"
                  placeholder="e.g. 35" 
                  value={quickPatient.age} 
                  onChange={(e) => setQuickPatient({ ...quickPatient, age: e.target.value })}
                  className="h-10 border-slate-200"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsQuickAddPatientOpen(false)} disabled={isCreatingPatient}>
              Cancel
            </Button>
            <Button className="bg-medical-blue gap-2" onClick={handleSaveQuickPatient} disabled={isCreatingPatient || !quickPatient.name.trim()}>
              {isCreatingPatient && <Loader2 className="w-4 h-4 animate-spin" />}
              {isCreatingPatient ? 'Registering...' : 'Register & Select'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
