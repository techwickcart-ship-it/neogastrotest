import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Search, 
  Filter, 
  Download, 
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  FileCheck,
  UserCheck,
  User,
  Printer,
  Loader2,
  Coins,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  Building,
  Check,
  X,
  CreditCard,
  FileSpreadsheet,
  Receipt,
  Calendar,
  History,
  Building2,
  DollarSign
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
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
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
import { supabaseService } from '@/services/supabaseService';
import { useDataSync } from '@/hooks/useDataSync';
import { storage } from '@/lib/storage';

import { STORAGE_KEYS } from '@/lib/storage';

const STORAGE_KEYS_STAFF_PAYABLES = 'hms_staff_payables';
const STORAGE_KEYS_INSURANCE_RECORDS = 'hms_insurance_records';
const STORAGE_KEYS_SEEDED = 'hms_insurance_and_payouts_seeded';

export default function Insurance() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'corporateLedger' | 'claims' | 'payables' | 'ledger' | 'discharge'>('corporateLedger');
  
  const [insuranceRecords, setInsuranceRecords] = useState<any[]>(() => {
    return storage.get<any[]>(STORAGE_KEYS_INSURANCE_RECORDS, []) || [];
  });
  const [dischargeRecords, setDischargeRecords] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>(() => {
    return storage.get<any[]>(STORAGE_KEYS.PATIENTS, []) || [];
  });
  const [staffList, setStaffList] = useState<any[]>(() => {
    return storage.get<any[]>(STORAGE_KEYS.USERS, []) || [];
  });
  const [staffPayables, setStaffPayables] = useState<any[]>(() => {
    return storage.get<any[]>(STORAGE_KEYS_STAFF_PAYABLES, []) || [];
  });
  const [hospitalInfo, setHospitalInfo] = useState<any>(() => {
    return storage.get(STORAGE_KEYS.HOSPITAL_INFO, {
      name: 'Gastro Plus Hospital',
      address: 'Plot No. 7 & 8, Om Shiv Nagar, Gufa Mandir Road, Lal Ghati Bhopal, 462030, Madhya Pradesh',
      phone: '9109102145/9109101246',
      email: 'gatroplusbhopal@gmail.com',
      logo: null
    });
  });
  
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterStaff, setFilterStaff] = useState<string>('all');
  const [filterPayableStatus, setFilterPayableStatus] = useState<string>('all');

  // Corporate Payment Ledger filters
  const [corpCompanyFilter, setCorpCompanyFilter] = useState<string>('all');
  const [corpStatusFilter, setCorpStatusFilter] = useState<string>('all');
  const [corpTypeFilter, setCorpTypeFilter] = useState<string>('all');
  const [corpDateFrom, setCorpDateFrom] = useState<string>('');
  const [corpDateTo, setCorpDateTo] = useState<string>('');
  const [corpLedgerView, setCorpLedgerView] = useState<'patient' | 'company'>('patient');

  // Dialog states
  const [isNewClaimOpen, setIsNewClaimOpen] = useState(false);
  const [isReceivePaymentOpen, setIsReceivePaymentOpen] = useState(false);
  const [isProcessPayoutOpen, setIsProcessPayoutOpen] = useState(false);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [isReceiptHistoryOpen, setIsReceiptHistoryOpen] = useState(false);

  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [selectedPayable, setSelectedPayable] = useState<any>(null);
  const [selectedClaimForHistory, setSelectedClaimForHistory] = useState<any>(null);

  // Form states
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [showPatientResults, setShowPatientResults] = useState(false);
  
  const [newClaim, setNewClaim] = useState({
    patientId: '',
    policyNo: '',
    insuranceCompany: '',
    tpaName: '',
    insuranceLimit: '',
    corporateType: 'Insurance TPA' as 'Insurance TPA' | 'Corporate Direct',
    procedureName: '',
    procedureCost: '',
    date: new Date().toISOString().split('T')[0],
    payableSplits: [] as Array<{ staffId: string, staffName: string, role: string, amount: string }>
  });

  const [paymentForm, setPaymentForm] = useState({
    approvedAmount: '',
    tdsDeducted: '0',
    utrNo: '',
    paymentMode: 'Net Banking',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [payoutForm, setPayoutForm] = useState({
    paymentMode: 'Net Banking' as 'Net Banking' | 'UPI' | 'Cash' | 'Cheque',
    utrNo: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const fetchData = async () => {
    try {
      const [insuranceData, patientsData, hospitalData, staffData] = await Promise.all([
        supabaseService.getInsuranceClaims(),
        supabaseService.getPatients(),
        supabaseService.getHospitalInfo(),
        supabaseService.getStaff ? supabaseService.getStaff() : Promise.resolve([])
      ]);

      if (patientsData && patientsData.length > 0) setPatients(patientsData);
      if (hospitalData) setHospitalInfo(hospitalData);
      if (staffData && staffData.length > 0) setStaffList(staffData);

      // Setup seeded data if first time
      const isSeeded = storage.get(STORAGE_KEYS_SEEDED, false);
      let activeClaims = insuranceData || [];
      let activePayables = storage.get(STORAGE_KEYS_STAFF_PAYABLES, []);

      if (!isSeeded || activeClaims.length === 0) {
        // Prepare beautiful seed data linked to patient IDs if possible
        const p1 = patientsData?.[0]?.id || 'p-seed-1';
        const p2 = patientsData?.[1]?.id || 'p-seed-2';
        const p3 = patientsData?.[2]?.id || 'p-seed-3';

        const seedClaims = [
          {
            id: 'claim-corp-1',
            patient_id: p1,
            patientId: p1,
            policy_no: 'POL-CGHS-99211',
            policyNo: 'POL-CGHS-99211',
            insurance_company: 'CGHS Central Govt Health Scheme',
            insuranceCompany: 'CGHS Central Govt Health Scheme',
            tpa_name: 'CGHS Delhi Division',
            tpaName: 'CGHS Delhi Division',
            insurance_limit: 55000,
            insuranceLimit: 55000,
            approved_amount: 50000,
            approvedAmount: 50000,
            corporateType: 'Corporate Direct',
            procedureName: 'Laparoscopic Cholecystectomy',
            procedureCost: 55000,
            receivedAmount: 49000,
            tdsDeducted: 1000,
            utrNo: 'UTRIBIN202607058821',
            status: 'Approved',
            claim_date: '2026-07-01',
            date: '2026-07-01'
          },
          {
            id: 'claim-corp-2',
            patient_id: p2,
            patientId: p2,
            policy_no: 'POL-STAR-88122',
            policyNo: 'POL-STAR-88122',
            insurance_company: 'Star Health Insurance',
            insuranceCompany: 'Star Health Insurance',
            tpa_name: 'MediAssist TPA',
            tpaName: 'MediAssist TPA',
            insurance_limit: 40000,
            insuranceLimit: 40000,
            approved_amount: 40000,
            approvedAmount: 40000,
            corporateType: 'Insurance TPA',
            procedureName: 'Open Hernia Repair',
            procedureCost: 45000,
            receivedAmount: 40000,
            tdsDeducted: 0,
            utrNo: 'UTRSTAR202607071120',
            status: 'Approved',
            claim_date: '2026-07-02',
            date: '2026-07-02'
          },
          {
            id: 'claim-corp-3',
            patient_id: p3,
            patientId: p3,
            policy_no: 'POL-RELIANCE-11234',
            policyNo: 'POL-RELIANCE-11234',
            insurance_company: 'Reliance Industries Contract',
            insuranceCompany: 'Reliance Industries Contract',
            tpa_name: 'Reliance Health TPA',
            tpaName: 'Reliance Health TPA',
            insurance_limit: 65000,
            insuranceLimit: 65000,
            approved_amount: 0,
            approvedAmount: 0,
            corporateType: 'Corporate Direct',
            procedureName: 'Emergency Appendectomy',
            procedureCost: 65000,
            receivedAmount: 0,
            tdsDeducted: 0,
            status: 'Pending',
            claim_date: '2026-07-03',
            date: '2026-07-03'
          }
        ];

        const seedPayables = [
          {
            id: 'pay-1-1',
            claimId: 'claim-corp-1',
            patientName: patientsData?.[0]?.name || 'Arjun Mehta',
            procedureName: 'Laparoscopic Cholecystectomy',
            staffId: 'staff-1',
            staffName: 'Dr. Rajesh Sharma',
            role: 'Surgeon',
            payableAmount: 15000,
            status: 'Paid Out',
            paidAt: '2026-07-06',
            disbursementMode: 'Net Banking',
            disbursementUtr: 'PAYOUT-RAJESH-991',
            disbursementNotes: 'Direct bank settlement'
          },
          {
            id: 'pay-1-2',
            claimId: 'claim-corp-1',
            patientName: patientsData?.[0]?.name || 'Arjun Mehta',
            procedureName: 'Laparoscopic Cholecystectomy',
            staffId: 'staff-2',
            staffName: 'Dr. Alok Verma',
            role: 'Anesthetist',
            payableAmount: 5000,
            status: 'Paid Out',
            paidAt: '2026-07-06',
            disbursementMode: 'UPI',
            disbursementUtr: 'PAYOUT-ALOK-221',
            disbursementNotes: 'Disbursed to Dr. Alok'
          },
          {
            id: 'pay-2-1',
            claimId: 'claim-corp-2',
            patientName: patientsData?.[1]?.name || 'Ananya Iyer',
            procedureName: 'Open Hernia Repair',
            staffId: 'staff-1',
            staffName: 'Dr. Rajesh Sharma',
            role: 'Surgeon',
            payableAmount: 12000,
            status: 'Ready for Payout'
          },
          {
            id: 'pay-2-2',
            claimId: 'claim-corp-2',
            patientName: patientsData?.[1]?.name || 'Ananya Iyer',
            procedureName: 'Open Hernia Repair',
            staffId: 'staff-3',
            staffName: 'Nurse Deepika Roy',
            role: 'Scrub Nurse',
            payableAmount: 2000,
            status: 'Ready for Payout'
          },
          {
            id: 'pay-3-1',
            claimId: 'claim-corp-3',
            patientName: patientsData?.[2]?.name || 'Rajesh Kumar',
            procedureName: 'Emergency Appendectomy',
            staffId: 'staff-4',
            staffName: 'Dr. Sarah Sharma',
            role: 'Surgeon',
            payableAmount: 18000,
            status: 'Pending Corporate Payment'
          },
          {
            id: 'pay-3-2',
            claimId: 'claim-corp-3',
            patientName: patientsData?.[2]?.name || 'Rajesh Kumar',
            procedureName: 'Emergency Appendectomy',
            staffId: 'staff-2',
            staffName: 'Dr. Alok Verma',
            role: 'Anesthetist',
            payableAmount: 6000,
            status: 'Pending Corporate Payment'
          }
        ];

        // Seed to local fallbacks to show real corporate features
        for (const c of seedClaims) {
          await supabaseService.createInsuranceClaim(c);
        }
        storage.set(STORAGE_KEYS_STAFF_PAYABLES, seedPayables);
        storage.set(STORAGE_KEYS_SEEDED, true);
        
        activeClaims = seedClaims;
        activePayables = seedPayables;
      }

      // Deduplicate claims and payables to avoid duplicate keys in React render loops
      const uniqueClaims: any[] = [];
      const seenClaimIds = new Set();
      for (const c of activeClaims) {
        if (c && c.id && !seenClaimIds.has(c.id)) {
          seenClaimIds.add(c.id);
          uniqueClaims.push(c);
        }
      }

      const uniquePayables: any[] = [];
      const seenPayableIds = new Set();
      for (const p of activePayables) {
        if (p && p.id && !seenPayableIds.has(p.id)) {
          seenPayableIds.add(p.id);
          uniquePayables.push(p);
        }
      }

      setInsuranceRecords(uniqueClaims);
      setStaffPayables(uniquePayables);
      storage.set(STORAGE_KEYS_INSURANCE_RECORDS, uniqueClaims);
      storage.set(STORAGE_KEYS_STAFF_PAYABLES, uniquePayables);

      // Normal Patient Discharge Mapping
      if (patientsData) {
        const uniqueDischarge: any[] = [];
        const seenDischargeIds = new Set();
        patientsData
          .filter(p => (p.status || '').toLowerCase() === 'discharge' || (p.status || '').toLowerCase() === 'waiting')
          .forEach(p => {
            if (p && p.id && !seenDischargeIds.has(p.id)) {
              seenDischargeIds.add(p.id);
              uniqueDischarge.push({
                id: p.id,
                patientId: p.id,
                name: p.name,
                nurseVerification: 'Verified',
                accountantVerification: p.billing_status === 'Paid' ? 'Verified' : 'Pending'
              });
            }
          });
        setDischargeRecords(uniqueDischarge);
      }
    } catch (err: any) {
      console.warn('Silent error handling in Insurance fetchData:', err);
    } finally {
      setLoading(false);
    }
  };

  useDataSync(fetchData);

  // Financial statistics calculation
  const stats = useMemo(() => {
    let totalApprovedClaimsVal = 0;
    let totalReceivedClaimsVal = 0;
    let totalTdsVal = 0;
    let totalDisbursedVal = 0;
    let totalPendingDisbursalVal = 0;

    insuranceRecords.forEach(rec => {
      const approvedAmt = parseFloat(rec.approvedAmount || rec.approved_amount || '0');
      totalApprovedClaimsVal += approvedAmt;
      
      if ((rec.status || '').toLowerCase() === 'approved') {
        const receivedAmt = parseFloat(rec.receivedAmount || approvedAmt || '0');
        totalReceivedClaimsVal += receivedAmt;
        totalTdsVal += parseFloat(rec.tdsDeducted || '0');
      }
    });

    staffPayables.forEach(p => {
      if (p.status === 'Paid Out') {
        totalDisbursedVal += parseFloat(p.payableAmount || '0');
      } else if (p.status === 'Ready for Payout') {
        totalPendingDisbursalVal += parseFloat(p.payableAmount || '0');
      }
    });

    const netHospitalKeep = totalReceivedClaimsVal - totalDisbursedVal - totalPendingDisbursalVal;

    return {
      approvedClaims: totalApprovedClaimsVal,
      receivedClaims: totalReceivedClaimsVal,
      tds: totalTdsVal,
      disbursed: totalDisbursedVal,
      pendingDisbursal: totalPendingDisbursalVal,
      netMargin: netHospitalKeep
    };
  }, [insuranceRecords, staffPayables]);

  // Helper to parse complete financial metrics for any claim
  const getClaimFinancials = (claim: any) => {
    if (!claim) return { billedAmount: 0, billedDate: 'N/A', totalReceived: 0, totalTds: 0, balanceAmount: 0, computedStatus: 'Pending Payment', paymentsList: [] };

    const billedAmount = parseFloat(claim.procedureCost || claim.procedure_cost || claim.insuranceLimit || claim.insurance_limit || 0);
    const billedDate = claim.claim_date || claim.date || 'N/A';
    
    const paymentsList: any[] = claim.payments || [];
    let totalReceived = 0;
    let totalTds = 0;

    if (paymentsList.length > 0) {
      totalReceived = paymentsList.reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0);
      totalTds = paymentsList.reduce((sum: number, p: any) => sum + parseFloat(p.tdsDeducted || 0), 0);
    } else {
      // Legacy single payment format fallback
      if ((claim.status || '').toLowerCase() === 'approved' || (claim.status || '').toLowerCase() === 'settled') {
        totalReceived = parseFloat(claim.receivedAmount || claim.approvedAmount || claim.approved_amount || 0);
        totalTds = parseFloat(claim.tdsDeducted || 0);
      }
    }

    const balanceAmount = Math.max(0, billedAmount - totalReceived - totalTds);

    let computedStatus: 'Pending Payment' | 'Partial Received' | 'Fully Settled' = 'Pending Payment';
    if (balanceAmount <= 0 && billedAmount > 0) {
      computedStatus = 'Fully Settled';
    } else if (totalReceived > 0) {
      computedStatus = 'Partial Received';
    }

    return {
      billedAmount,
      billedDate,
      totalReceived,
      totalTds,
      balanceAmount,
      computedStatus,
      paymentsList
    };
  };

  // Distinct corporate partners list for dropdown filter
  const corporateCompaniesList = useMemo(() => {
    const list = new Set<string>();
    insuranceRecords.forEach(r => {
      const comp = r.insuranceCompany || r.insurance_company;
      if (comp) list.add(comp);
    });
    return Array.from(list);
  }, [insuranceRecords]);

  // Filtered Corporate Patient Payment Ledger
  const filteredCorporateLedger = useMemo(() => {
    return insuranceRecords.filter(record => {
      const patient = patients.find(p => p.id === record.patientId);
      const patName = patient?.name || record.patientName || '';
      const mrn = patient?.mrn || record.mrn || '';
      const corpCompany = record.insuranceCompany || record.insurance_company || '';
      const policyNo = record.policyNo || record.policy_no || '';
      const utr = record.utrNo || '';

      const matchesSearch = !searchQuery || 
        patName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mrn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        corpCompany.toLowerCase().includes(searchQuery.toLowerCase()) ||
        policyNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        utr.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCompany = corpCompanyFilter === 'all' || corpCompany.toLowerCase() === corpCompanyFilter.toLowerCase();
      const matchesType = corpTypeFilter === 'all' || record.corporateType === corpTypeFilter;

      const fin = getClaimFinancials(record);
      const matchesStatus = corpStatusFilter === 'all' || (
        corpStatusFilter === 'Pending' ? fin.computedStatus === 'Pending Payment' :
        corpStatusFilter === 'Partial' ? fin.computedStatus === 'Partial Received' :
        corpStatusFilter === 'Settled' ? fin.computedStatus === 'Fully Settled' : true
      );

      const bDate = fin.billedDate;
      let matchesDate = true;
      if (corpDateFrom && bDate && bDate !== 'N/A') {
        matchesDate = matchesDate && (bDate >= corpDateFrom);
      }
      if (corpDateTo && bDate && bDate !== 'N/A') {
        matchesDate = matchesDate && (bDate <= corpDateTo);
      }

      return matchesSearch && matchesCompany && matchesType && matchesStatus && matchesDate;
    });
  }, [insuranceRecords, patients, searchQuery, corpCompanyFilter, corpTypeFilter, corpStatusFilter, corpDateFrom, corpDateTo]);

  // Summary KPIs for Corporate Patient Payment Ledger
  const corpLedgerStats = useMemo(() => {
    let totalBilled = 0;
    let totalReceived = 0;
    let totalTds = 0;
    let totalBalance = 0;
    let settledCount = 0;
    let partialCount = 0;
    let pendingCount = 0;

    filteredCorporateLedger.forEach(c => {
      const fin = getClaimFinancials(c);
      totalBilled += fin.billedAmount;
      totalReceived += fin.totalReceived;
      totalTds += fin.totalTds;
      totalBalance += fin.balanceAmount;

      if (fin.computedStatus === 'Fully Settled') settledCount++;
      else if (fin.computedStatus === 'Partial Received') partialCount++;
      else pendingCount++;
    });

    const collectionRate = totalBilled > 0 ? Math.min(100, Math.round((totalReceived / totalBilled) * 100)) : 0;

    return {
      totalBilled,
      totalReceived,
      totalTds,
      totalBalance,
      settledCount,
      partialCount,
      pendingCount,
      collectionRate
    };
  }, [filteredCorporateLedger]);

  // Company-wise Grouped Summary
  const companyWiseLedger = useMemo(() => {
    const map: { [key: string]: any } = {};

    filteredCorporateLedger.forEach(claim => {
      const cName = claim.insuranceCompany || claim.insurance_company || 'Unspecified Corporate';
      if (!map[cName]) {
        map[cName] = {
          companyName: cName,
          casesCount: 0,
          totalBilled: 0,
          totalReceived: 0,
          totalTds: 0,
          totalBalance: 0,
          claims: []
        };
      }

      const fin = getClaimFinancials(claim);
      map[cName].casesCount += 1;
      map[cName].totalBilled += fin.billedAmount;
      map[cName].totalReceived += fin.totalReceived;
      map[cName].totalTds += fin.totalTds;
      map[cName].totalBalance += fin.balanceAmount;
      map[cName].claims.push({ ...claim, fin });
    });

    return Object.values(map);
  }, [filteredCorporateLedger]);

  // CSV Export for Corporate Patient Payment Ledger
  const exportCorporateLedgerCSV = () => {
    if (filteredCorporateLedger.length === 0) {
      toast.error('No corporate records available to export');
      return;
    }

    const headers = ['Billed Date', 'Patient Name', 'MRN', 'Corporate Partner', 'Corporate Class', 'Policy / ID No', 'Procedure Name', 'Billed Amount (INR)', 'Received Amount (INR)', 'TDS Deducted (INR)', 'Balance Outstanding (INR)', 'Payment Status', 'Latest UTR Code'];

    const rows = filteredCorporateLedger.map(record => {
      const patient = patients.find(p => p.id === record.patientId);
      const fin = getClaimFinancials(record);
      const latestPayment = fin.paymentsList.length > 0 ? fin.paymentsList[fin.paymentsList.length - 1] : null;

      return [
        `"${fin.billedDate}"`,
        `"${patient?.name || record.patientName || 'Patient'}"`,
        `"${patient?.mrn || record.mrn || 'N/A'}"`,
        `"${record.insuranceCompany || 'N/A'}"`,
        `"${record.corporateType || 'TPA'}"`,
        `"${record.policyNo || 'N/A'}"`,
        `"${record.procedureName || 'N/A'}"`,
        fin.billedAmount,
        fin.totalReceived,
        fin.totalTds,
        fin.balanceAmount,
        `"${fin.computedStatus}"`,
        `"${latestPayment?.utrNo || record.utrNo || 'N/A'}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Corporate_Patients_Payment_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Corporate Patients Payment Ledger exported to CSV!');
  };

  // Print Full Corporate Patients Payment Ledger Statement
  const printCorporatePatientsLedgerStatement = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Corporate Patients Payment Ledger Statement</title>
          <style>
            @page { size: A4 landscape; margin: 12mm; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #0f172a; margin: 0; padding: 20px; font-size: 11px; }
            .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 15px; }
            .hospital-title { font-size: 22px; font-weight: 800; color: #1e3a8a; }
            .report-title { font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
            .subtitle { font-size: 10px; color: #64748b; margin-top: 3px; }
            .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 18px; }
            .summary-card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; text-align: center; }
            .lbl { font-size: 9px; text-transform: uppercase; font-weight: 700; color: #64748b; }
            .val { font-size: 16px; font-weight: 800; margin-top: 3px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #1e293b; color: #ffffff; text-align: left; padding: 7px 8px; font-size: 9.5px; font-weight: 700; text-transform: uppercase; }
            td { padding: 7px 8px; border-bottom: 1px solid #e2e8f0; font-size: 10px; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 8.5px; font-weight: 700; }
            .badge-settled { background: #dcfce7; color: #15803d; }
            .badge-partial { background: #e0f2fe; color: #0369a1; }
            .badge-pending { background: #fef3c7; color: #b45309; }
            .footer { margin-top: 35px; display: flex; justify-content: space-between; font-size: 10px; font-weight: bold; }
            .sig-box { width: 180px; text-align: center; border-top: 1px solid #94a3b8; padding-top: 4px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="hospital-title">${hospitalInfo.name}</div>
            <div style="font-size:10px; color:#475569;">${hospitalInfo.address} | Phone: ${hospitalInfo.phone}</div>
            <div class="report-title">Corporate Patients Payment Ledger Statement</div>
            <div class="subtitle">Statement Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} • Filter: ${corpCompanyFilter === 'all' ? 'All Corporate Partners' : corpCompanyFilter}</div>
          </div>

          <div class="summary-grid">
            <div class="summary-card" style="background:#eff6ff; border-color:#bfdbfe;">
              <div class="lbl">Total Corporate Billed</div>
              <div class="val" style="color:#1d4ed8;">₹${corpLedgerStats.totalBilled.toLocaleString('en-IN')}</div>
            </div>
            <div class="summary-card" style="background:#ecfdf5; border-color:#a7f3d0;">
              <div class="lbl">Total Received Amount</div>
              <div class="val" style="color:#047857;">₹${corpLedgerStats.totalReceived.toLocaleString('en-IN')}</div>
            </div>
            <div class="summary-card" style="background:#fffbe0; border-color:#fde68a;">
              <div class="lbl">Total TDS Retained</div>
              <div class="val" style="color:#b45309;">₹${corpLedgerStats.totalTds.toLocaleString('en-IN')}</div>
            </div>
            <div class="summary-card" style="background:#fff1f2; border-color:#fecdd3;">
              <div class="lbl">Total Balance Outstanding</div>
              <div class="val" style="color:#b91c1c;">₹${corpLedgerStats.totalBalance.toLocaleString('en-IN')}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Billed Date</th>
                <th>Patient Name & MRN</th>
                <th>Corporate Partner & Policy</th>
                <th>Procedure Details</th>
                <th style="text-align: right;">Billed Amount (₹)</th>
                <th style="text-align: right;">Received Amount (₹)</th>
                <th style="text-align: right;">Balance Outstanding (₹)</th>
                <th style="text-align: center;">Payment Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredCorporateLedger.map(record => {
                const patient = patients.find(p => p.id === record.patientId);
                const fin = getClaimFinancials(record);
                const badgeClass = fin.computedStatus === 'Fully Settled' ? 'badge-settled' : fin.computedStatus === 'Partial Received' ? 'badge-partial' : 'badge-pending';

                return `
                  <tr>
                    <td><strong>${formatDate(fin.billedDate)}</strong></td>
                    <td>
                      <strong>${patient?.name || record.patientName || 'Patient'}</strong><br/>
                      <span style="color:#64748b; font-size:9px;">MRN: ${patient?.mrn || 'N/A'}</span>
                    </td>
                    <td>
                      <strong>${record.insuranceCompany || 'N/A'}</strong><br/>
                      <span style="color:#64748b; font-size:9px;">Policy: ${record.policyNo || 'N/A'} (${record.corporateType || 'TPA'})</span>
                    </td>
                    <td>${record.procedureName || 'N/A'}</td>
                    <td style="text-align: right; font-weight: bold;">₹${fin.billedAmount.toLocaleString('en-IN')}</td>
                    <td style="text-align: right; color: #047857; font-weight: bold;">₹${fin.totalReceived.toLocaleString('en-IN')}</td>
                    <td style="text-align: right; color: ${fin.balanceAmount > 0 ? '#b91c1c' : '#475569'}; font-weight: bold;">₹${fin.balanceAmount.toLocaleString('en-IN')}</td>
                    <td style="text-align: center;">
                      <span class="badge ${badgeClass}">${fin.computedStatus}</span>
                    </td>
                  </tr>
                `;
              }).join('')}
              <tr style="background: #f1f5f9; font-weight: 800; font-size: 11px;">
                <td colspan="4" style="text-align: right; text-transform: uppercase;">Grand Total:</td>
                <td style="text-align: right;">₹${corpLedgerStats.totalBilled.toLocaleString('en-IN')}</td>
                <td style="text-align: right; color: #047857;">₹${corpLedgerStats.totalReceived.toLocaleString('en-IN')}</td>
                <td style="text-align: right; color: #b91c1c;">₹${corpLedgerStats.totalBalance.toLocaleString('en-IN')}</td>
                <td></td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            <div class="sig-box">Accounts Executive</div>
            <div class="sig-box">Corporate Billing Desk</div>
            <div class="sig-box">Medical Director</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Print Single Patient Corporate Statement
  const printSinglePatientCorporateStatement = (record: any) => {
    const patient = patients.find(p => p.id === record.patientId);
    const fin = getClaimFinancials(record);

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Corporate Patient Ledger - ${patient?.name || 'Patient'}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; color: #0f172a; max-width: 800px; margin: 0 auto; font-size: 11px; }
            .header { border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 15px; text-align: center; }
            .h-title { font-size: 22px; font-weight: 800; color: #1e3a8a; }
            .h-sub { font-size: 10px; color: #64748b; }
            .doc-title { text-align: center; font-size: 13px; font-weight: 700; background: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px; border-radius: 6px; margin: 15px 0; text-transform: uppercase; letter-spacing: 0.5px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 11px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; margin-bottom: 15px; }
            .fin-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
            .fin-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; text-align: center; }
            .fin-lbl { font-size: 9px; text-transform: uppercase; font-weight: 700; color: #64748b; }
            .fin-val { font-size: 16px; font-weight: 800; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; font-size: 10.5px; margin-top: 10px; }
            th { background: #f1f5f9; text-align: left; padding: 7px; border-bottom: 2px solid #cbd5e1; color: #1e3a8a; }
            td { padding: 7px; border-bottom: 1px solid #e2e8f0; }
            .footer { margin-top: 45px; display: flex; justify-content: space-between; font-size: 10px; }
            .sig-line { border-top: 1px solid #94a3b8; width: 180px; text-align: center; padding-top: 4px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="h-title">${hospitalInfo.name}</div>
            <div class="h-sub">${hospitalInfo.address} | Phone: ${hospitalInfo.phone}</div>
          </div>

          <div class="doc-title">PATIENT CORPORATE PAYMENT STATEMENT</div>

          <div class="grid">
            <div><strong>Patient Name:</strong> ${patient?.name || record.patientName || 'N/A'}</div>
            <div><strong>MRN / Reg No:</strong> ${patient?.mrn || 'N/A'}</div>
            <div><strong>Corporate Partner:</strong> ${record.insuranceCompany || 'N/A'}</div>
            <div><strong>Policy / Card ID:</strong> ${record.policyNo || 'N/A'} (${record.corporateType || 'TPA'})</div>
            <div><strong>Procedure Billed:</strong> ${record.procedureName || 'N/A'}</div>
            <div><strong>Billed Date:</strong> ${formatDate(fin.billedDate)}</div>
          </div>

          <div class="fin-summary">
            <div class="fin-card" style="background: #eff6ff;">
              <div class="fin-lbl">Total Billed</div>
              <div class="fin-val" style="color: #1d4ed8;">₹${fin.billedAmount.toLocaleString('en-IN')}</div>
            </div>
            <div class="fin-card" style="background: #ecfdf5; border-color: #a7f3d0;">
              <div class="fin-lbl">Total Received</div>
              <div class="fin-val" style="color: #047857;">₹${fin.totalReceived.toLocaleString('en-IN')}</div>
            </div>
            <div class="fin-card" style="background: #fff1f2; border-color: #fecdd3;">
              <div class="fin-lbl">Balance Outstanding</div>
              <div class="fin-val" style="color: #b91c1c;">₹${fin.balanceAmount.toLocaleString('en-IN')}</div>
            </div>
          </div>

          <h4 style="margin-bottom: 6px; font-size: 11.5px; color: #0f172a; text-transform: uppercase;">Payment Receipts & Settlement Logs</h4>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Payment Date</th>
                <th>Payment Mode</th>
                <th>UTR / Ref Code</th>
                <th style="text-align: right;">Amount Paid (₹)</th>
                <th style="text-align: right;">TDS Deducted (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${fin.paymentsList.length === 0 ? `
                <tr>
                  <td colSpan="6" style="text-align: center; color: #94a3b8; padding: 15px;">No payments logged against this corporate bill yet.</td>
                </tr>
              ` : fin.paymentsList.map((p, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${formatDate(p.date)}</td>
                  <td>${p.paymentMode || 'Net Banking'}</td>
                  <td><strong>${p.utrNo || 'N/A'}</strong></td>
                  <td style="text-align: right; font-weight: bold; color: #047857;">₹${(parseFloat(p.amount) || 0).toLocaleString('en-IN')}</td>
                  <td style="text-align: right; color: #b45309;">₹${(parseFloat(p.tdsDeducted) || 0).toLocaleString('en-IN')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <div class="sig-line">Corporate Desk</div>
            <div class="sig-line">Patient / Representative</div>
            <div class="sig-line">Finance Manager</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Submit new Claim (including doctor payables)
  const handleCreateClaim = async () => {
    if (!newClaim.patientId || !newClaim.insuranceCompany || !newClaim.procedureCost) {
      toast.error('Please enter patient, corporate partner and total procedure cost');
      return;
    }

    const patientObj = patients.find(p => p.id === newClaim.patientId);
    const claimId = 'claim-' + Math.random().toString(36).substring(2, 9);
    
    const claimData = {
      id: claimId,
      patient_id: newClaim.patientId,
      patientId: newClaim.patientId,
      policy_no: newClaim.policyNo,
      policyNo: newClaim.policyNo,
      insurance_company: newClaim.insuranceCompany,
      insuranceCompany: newClaim.insuranceCompany,
      tpa_name: newClaim.tpaName,
      tpaName: newClaim.tpaName,
      insurance_limit: parseFloat(newClaim.insuranceLimit || '0'),
      insuranceLimit: parseFloat(newClaim.insuranceLimit || '0'),
      approved_amount: 0,
      approvedAmount: 0,
      status: 'Pending',
      claim_date: newClaim.date,
      date: newClaim.date,
      corporateType: newClaim.corporateType,
      procedureName: newClaim.procedureName,
      procedureCost: parseFloat(newClaim.procedureCost || '0'),
      receivedAmount: 0,
      tdsDeducted: 0
    };

    const result = await supabaseService.createInsuranceClaim(claimData);
    if (result) {
      // Save doctor payables splits
      const newPayables = [...staffPayables];
      newClaim.payableSplits.forEach((split, index) => {
        newPayables.push({
          id: `pay-${claimId}-${index}-${Math.random().toString(36).substring(2, 5)}`,
          claimId: claimId,
          patientName: patientObj?.name || 'Unknown',
          procedureName: newClaim.procedureName || 'Procedure',
          staffId: split.staffId,
          staffName: split.staffName,
          role: split.role,
          payableAmount: parseFloat(split.amount || '0'),
          status: 'Pending Corporate Payment'
        });
      });

      storage.set(STORAGE_KEYS_STAFF_PAYABLES, newPayables);
      toast.success('Corporate claim & doctor splits successfully recorded!');
      setIsNewClaimOpen(false);
      
      // Reset form
      setNewClaim({
        patientId: '',
        policyNo: '',
        insuranceCompany: '',
        tpaName: '',
        insuranceLimit: '',
        corporateType: 'Insurance TPA',
        procedureName: '',
        procedureCost: '',
        date: new Date().toISOString().split('T')[0],
        payableSplits: []
      });
      setPatientSearchTerm('');
      fetchData();
    } else {
      toast.error('Failed to create claim');
    }
  };

  // Submit Receive Corporate Payment (Supports partial or full settlement)
  const handleReceivePaymentSubmit = () => {
    if (!paymentForm.approvedAmount || parseFloat(paymentForm.approvedAmount) <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    if (!paymentForm.utrNo) {
      toast.error('Please enter transaction reference / UTR number');
      return;
    }

    const pAmt = parseFloat(paymentForm.approvedAmount);
    const pTds = parseFloat(paymentForm.tdsDeducted || '0');

    const newPaymentObj = {
      id: 'rec-' + Math.random().toString(36).substring(2, 9),
      amount: pAmt,
      tdsDeducted: pTds,
      date: paymentForm.date || new Date().toISOString().split('T')[0],
      paymentMode: paymentForm.paymentMode || 'Net Banking',
      utrNo: paymentForm.utrNo,
      notes: paymentForm.notes || 'Corporate payment received',
      recordedAt: new Date().toISOString()
    };

    const updatedClaims = insuranceRecords.map((rec: any) => {
      if (rec.id === selectedClaim.id) {
        const existingPayments = rec.payments || [];
        
        // If converting legacy single payment
        if (existingPayments.length === 0 && (rec.receivedAmount > 0 || rec.approvedAmount > 0) && (rec.status === 'Approved' || rec.status === 'Settled')) {
          existingPayments.push({
            id: 'rec-legacy-' + rec.id,
            amount: parseFloat(rec.receivedAmount || rec.approvedAmount || 0),
            tdsDeducted: parseFloat(rec.tdsDeducted || 0),
            date: rec.payment_received_date || rec.date,
            paymentMode: 'Net Banking',
            utrNo: rec.utrNo || 'LEGACY-REF',
            notes: 'Legacy recorded settlement',
            recordedAt: rec.date
          });
        }

        const allPayments = [...existingPayments, newPaymentObj];
        const totalRec = allPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
        const totalTdsVal = allPayments.reduce((sum, p) => sum + parseFloat(p.tdsDeducted || 0), 0);
        const billedAmt = parseFloat(rec.procedureCost || rec.insuranceLimit || 0);
        const remBalance = Math.max(0, billedAmt - totalRec - totalTdsVal);

        const isFullySettled = remBalance <= 0;

        return {
          ...rec,
          status: isFullySettled ? 'Approved' : 'Partial',
          approved_amount: billedAmt,
          approvedAmount: billedAmt,
          receivedAmount: totalRec,
          tdsDeducted: totalTdsVal,
          utrNo: paymentForm.utrNo,
          payment_received_date: paymentForm.date,
          payments: allPayments
        };
      }
      return rec;
    });

    // Update associated staff payables state to Ready for Payout
    const updatedPayables = staffPayables.map((p: any) => {
      if (p.claimId === selectedClaim.id && p.status === 'Pending Corporate Payment') {
        return {
          ...p,
          status: 'Ready for Payout'
        };
      }
      return p;
    });

    setInsuranceRecords(updatedClaims);
    setStaffPayables(updatedPayables);

    storage.set(STORAGE_KEYS_STAFF_PAYABLES, updatedPayables);
    storage.set('hms_insurance', updatedClaims);

    toast.success(`Recorded corporate payment receipt of ${formatCurrency(pAmt)}!`);
    setIsReceivePaymentOpen(false);
    fetchData();
  };

  // Process Doctor Disbursal Payment
  const handleProcessPayoutSubmit = () => {
    if (!payoutForm.utrNo) {
      toast.error('Please enter payment Transaction Ref / UTR number');
      return;
    }

    const updatedPayables = staffPayables.map((p: any) => {
      if (p.id === selectedPayable.id) {
        return {
          ...p,
          status: 'Paid Out',
          paidAt: payoutForm.date,
          disbursementMode: payoutForm.paymentMode,
          disbursementUtr: payoutForm.utrNo,
          disbursementNotes: payoutForm.notes
        };
      }
      return p;
    });

    storage.set(STORAGE_KEYS_STAFF_PAYABLES, updatedPayables);
    toast.success(`Disbursed payment of ${formatCurrency(selectedPayable.payableAmount)} to ${selectedPayable.staffName} successfully!`);
    setIsProcessPayoutOpen(false);
    fetchData();
  };

  // Delete a Claim & its associated splits
  const handleDeleteClaim = async (id: string) => {
    if (confirm('Are you sure you want to delete this corporate claim and all its associated staff payable records?')) {
      const result = await supabaseService.deleteInsuranceClaim(id);
      if (result) {
        const filteredPayables = staffPayables.filter(p => p.claimId !== id);
        storage.set(STORAGE_KEYS_STAFF_PAYABLES, filteredPayables);
        toast.success('Corporate claim and splits deleted');
        fetchData();
      } else {
        toast.error('Failed to delete claim');
      }
    }
  };

  // Print Payout Voucher
  const printPayoutVoucher = (payable: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Disbursement Voucher - ${payable.staffName}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #334155; }
            .voucher-container { border: 2px solid #e2e8f0; border-radius: 12px; padding: 30px; max-width: 700px; margin: 0 auto; background-color: #f8fafc; }
            .header { text-align: center; border-bottom: 3px double #3b82f6; padding-bottom: 20px; margin-bottom: 25px; }
            .hospital-name { font-size: 24px; font-weight: 800; color: #1e3a8a; letter-spacing: -0.5px; }
            .title { text-align: center; font-size: 16px; font-weight: 700; color: #0f172a; border: 1px solid #94a3b8; display: inline-block; padding: 6px 16px; border-radius: 6px; margin-top: 10px; background-color: #f1f5f9; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px; margin-bottom: 25px; padding: 15px; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; }
            .section-title { font-size: 14px; font-weight: bold; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
            .amount-box { text-align: center; margin: 25px 0; padding: 15px; border-radius: 8px; background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; font-size: 22px; font-weight: 800; }
            .footer-sigs { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 60px; text-align: center; font-size: 12px; }
            .sig-line { border-top: 1px solid #94a3b8; margin-top: 40px; padding-top: 6px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="voucher-container">
            <div class="header">
              <div class="hospital-name">${hospitalInfo.name}</div>
              <div style="font-size:12px; color: #64748b;">${hospitalInfo.address} | Tel: ${hospitalInfo.phone}</div>
              <div class="title">DOCTOR & STAFF DISBURSEMENT VOUCHER</div>
            </div>
            
            <div class="meta-grid">
              <div><strong>Voucher ID:</strong> VOUCH-${payable.id?.toUpperCase().substring(0,8)}</div>
              <div><strong>Disbursement Date:</strong> ${formatDate(payable.paidAt)}</div>
              <div><strong>Staff / Clinician:</strong> ${payable.staffName} (${payable.role})</div>
              <div><strong>Payment Mode:</strong> ${payable.disbursementMode}</div>
              <div><strong>Bank UTR / Ref No:</strong> ${payable.disbursementUtr}</div>
              <div><strong>Related Case:</strong> Patient ${payable.patientName} (${payable.procedureName})</div>
            </div>

            <div class="section-title">Payment Settlement Details</div>
            <div style="font-size: 13px; line-height: 1.6; background-color: white; padding: 15px; border-radius:8px; border: 1px solid #e2e8f0;">
              This voucher acknowledges the formal fee payout split to <strong>${payable.staffName}</strong>. 
              The settlement is disbursed post-receipt of corporate health clearance and verification of procedure logs. 
              <br/><br/>
              <strong>Remarks:</strong> ${payable.disbursementNotes || 'Standard revenue split settlement.'}
            </div>

            <div class="amount-box">
              ₹${payable.payableAmount?.toLocaleString('en-IN') || '0'}.00
            </div>

            <div class="footer-sigs">
              <div>
                <div class="sig-line">Prepared & Verified By (Accountant)</div>
              </div>
              <div>
                <div class="sig-line">Recipient / Doctor Signature</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Print Complete Financial Ledger
  const printFinancialLedger = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Corporate Accounts Ledger</title>
          <style>
            body { font-family: sans-serif; padding: 30px; color: #333; }
            h1 { color: #1e3a8a; text-align: center; font-size: 20px; margin-bottom: 2px; }
            .subtitle { text-align: center; font-size: 11px; color: #666; margin-bottom: 25px; }
            .kpis { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 25px; }
            .kpi-card { flex: 1; border: 1px solid #ddd; padding: 12px; border-radius: 6px; text-align: center; }
            .kpi-title { font-size: 10px; text-transform: uppercase; color: #666; font-weight: bold; }
            .kpi-val { font-size: 16px; font-weight: 800; margin-top: 4px; color: #111; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 15px; }
            th { background: #f1f5f9; color: #1e3a8a; text-align: left; padding: 8px; border-bottom: 2px solid #cbd5e1; }
            td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <h1>${hospitalInfo.name}</h1>
          <div class="subtitle">Corporate Accounts Ledger & Splits Settlement Summary (${new Date().toLocaleDateString()})</div>
          
          <div class="kpis">
            <div class="kpi-card">
              <div class="kpi-title">Total Claims Approved</div>
              <div class="kpi-val">₹${stats.approvedClaims.toLocaleString('en-IN')}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Funds Received</div>
              <div class="kpi-val">₹${stats.receivedClaims.toLocaleString('en-IN')}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">TDS Deducted</div>
              <div class="kpi-val">₹${stats.tds.toLocaleString('en-IN')}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Disbursed to Staff</div>
              <div class="kpi-val">₹${stats.disbursed.toLocaleString('en-IN')}</div>
            </div>
            <div class="kpi-card" style="background:#ecfdf5;">
              <div class="kpi-title" style="color:#065f46;">Hospital Keep</div>
              <div class="kpi-val" style="color:#047857;">₹${stats.netMargin.toLocaleString('en-IN')}</div>
            </div>
          </div>

          <h3>Active Claims Summary</h3>
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Corporate Partner</th>
                <th>Procedure</th>
                <th>Claim Cost</th>
                <th>Limit</th>
                <th>Approved</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${insuranceRecords.map(r => `
                <tr>
                  <td>${patients.find(p => p.id === r.patientId)?.name || 'Unknown'}</td>
                  <td>${r.insuranceCompany}</td>
                  <td>${r.procedureName || 'N/A'}</td>
                  <td>₹${(r.procedureCost || 0).toLocaleString('en-IN')}</td>
                  <td>₹${(r.insuranceLimit || 0).toLocaleString('en-IN')}</td>
                  <td>₹${(r.approvedAmount || 0).toLocaleString('en-IN')}</td>
                  <td><strong>${r.status}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="margin-top: 40px; text-align: right; font-size: 11px;">
            <strong>Authorized Accountant Signature:</strong> _____________________________
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const printDischargeSummary = (record: any) => {
    const patient = patients.find(p => p.id === record.patientId);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Discharge Summary - ${record.name}</title>
          <style>
            @page { margin: 0; }
            body { font-family: sans-serif; margin: 0; padding: 40px; color: #333; }
            .hospital-info { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 15px; }
            .title { text-align: center; font-size: 22px; font-weight: bold; text-decoration: underline; margin-bottom: 30px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 30px; border: 1px solid #eee; padding: 15px; border-radius: 8px; font-size: 14px; }
            .section { margin-bottom: 25px; }
            .section-title { font-weight: bold; font-size: 16px; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 10px; color: #1E6FA8; }
            .text { font-size: 14px; line-height: 1.6; }
            .footer { margin-top: 80px; display: flex; justify-content: space-between; border-top: 1px solid #eee; padding-top: 20px; }
            .signature { text-align: center; width: 220px; font-size: 12px; }
            .sig-line { border-top: 1px solid #333; margin-top: 50px; padding-top: 5px; }
          </style>
        </head>
        <body>
          <div class="content">
            <div class="hospital-info">
              <div style="font-size: 24px; font-weight: bold; color: #2563eb;">${hospitalInfo.name}</div>
              <div>${hospitalInfo.address}</div>
              <div>Contact: ${hospitalInfo.phone} | Email: ${hospitalInfo.email}</div>
            </div>
            <div class="title">DISCHARGE SUMMARY</div>
            <div class="grid">
              <div><strong>Patient Name:</strong> ${record.name}</div>
              <div><strong>MRN:</strong> ${patient?.mrn || 'N/A'}</div>
              <div><strong>Age / Gender:</strong> ${patient?.age || '--'} / ${patient?.gender || '--'}</div>
              <div><strong>Patient ID:</strong> ${record.patientId?.substring(0, 8).toUpperCase()}</div>
              <div><strong>Discharge Date:</strong> ${new Date().toLocaleDateString()}</div>
            </div>
            <div class="section">
              <div class="section-title">Condition at Discharge</div>
              <div class="text">Patient is hemodynamically stable, afebrile, and tolerating oral diet. Discharge clearance granted.</div>
            </div>
            <div class="footer">
              <div class="signature"><div class="sig-line">Patient / Relative Signature</div></div>
              <div class="signature"><div class="sig-line">Authorized Signatory / RMO</div></div>
              <div class="signature"><div class="sig-line">Consultant Signature</div></div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Filters calculation
  const filteredInsuranceAll = insuranceRecords.filter(record => {
    const patient = patients.find(p => p.id === record.patientId);
    const matchesSearch = (patient?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (record.policyNo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (patient?.mrn || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || record.corporateType === filterType;
    const matchesStatus = filterStatus === 'all' || (
      filterStatus === 'Approved' ? record.status === 'Approved' : record.status === 'Pending'
    );
    return matchesSearch && matchesType && matchesStatus;
  });

  const seenClaimsFront = new Set();
  const filteredInsurance = filteredInsuranceAll.filter(record => {
    if (!record || !record.id) return true;
    if (seenClaimsFront.has(record.id)) return false;
    seenClaimsFront.add(record.id);
    return true;
  });

  const filteredPayables = staffPayables.filter(p => {
    const matchesStaff = filterStaff === 'all' || p.staffId === filterStaff;
    const matchesStatus = filterPayableStatus === 'all' || p.status === filterPayableStatus;
    const matchesSearch = p.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.procedureName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.staffName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStaff && matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-medical-blue" />
        <span className="ml-2 font-medium">Loading Corporate Accounts & Ledgers...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Building className="w-6 h-6 text-indigo-600" />
            Corporate & TPA Accounts
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage corporate contracts, procedure billing approval tracking, and doctor payout settlement splits.
          </p>
        </div>
        
        <div className="flex gap-2">
          {activeTab === 'ledger' && (
            <Button variant="outline" className="gap-2 text-indigo-700 border-indigo-200" onClick={printFinancialLedger}>
              <Printer className="w-4 h-4" />
              Print Ledger Statement
            </Button>
          )}
          <Dialog open={isNewClaimOpen} onOpenChange={(open) => {
            setIsNewClaimOpen(open);
            if(!open) {
              setPatientSearchTerm('');
              setShowPatientResults(false);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                <Plus className="w-4 h-4" />
                New Corporate Claim
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg text-indigo-900 font-bold">New Corporate / TPA Billing Log</DialogTitle>
                <DialogDescription>Initialize a patient pre-authorization under corporate coverage with revenue shares.</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-3">
                {/* Billing Type Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Billing Class</Label>
                    <select 
                      className="w-full text-xs h-9 border rounded-md px-3 bg-white focus:border-indigo-500"
                      value={newClaim.corporateType}
                      onChange={(e) => setNewClaim({...newClaim, corporateType: e.target.value as any})}
                    >
                      <option value="Insurance TPA">Insurance TPA Cover</option>
                      <option value="Corporate Direct">Corporate Direct Contract</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Claim Log Date</Label>
                    <Input 
                      type="date"
                      className="h-9 text-xs"
                      value={newClaim.date}
                      onChange={(e) => setNewClaim({...newClaim, date: e.target.value})}
                    />
                  </div>
                </div>

                {/* Patient Search */}
                <div className="space-y-1.5 relative">
                  <Label className="text-xs font-bold">Patient Link (Search Name/MRN)</Label>
                  <div className="relative">
                    <Input 
                      placeholder="Type patient's name..." 
                      className="h-9 text-xs pl-8"
                      value={patientSearchTerm}
                      onChange={(e) => {
                        setPatientSearchTerm(e.target.value);
                        setShowPatientResults(true);
                      }}
                      onFocus={() => setShowPatientResults(true)}
                    />
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  </div>

                  {showPatientResults && patientSearchTerm.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-[160px] overflow-y-auto">
                      {patients.filter(p => p.name.toLowerCase().includes(patientSearchTerm.toLowerCase())).map(p => (
                        <div 
                          key={p.id}
                          className="px-3 py-1.5 hover:bg-indigo-50 cursor-pointer text-xs border-b last:border-0"
                          onClick={() => {
                            setNewClaim({...newClaim, patientId: p.id});
                            setPatientSearchTerm(p.name);
                            setShowPatientResults(false);
                          }}
                        >
                          <div className="font-bold text-slate-800">{p.name}</div>
                          <div className="text-[10px] text-slate-500">MRN: {p.mrn} • Phone: {p.phone}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {newClaim.patientId && (
                    <div className="p-2 bg-indigo-50/50 border border-indigo-100 rounded text-[11px] flex justify-between items-center">
                      <span>Linked Patient: <strong>{patients.find(p => p.id === newClaim.patientId)?.name}</strong></span>
                      <Button variant="ghost" className="h-5 p-1 text-slate-400 hover:text-rose-500" onClick={() => setNewClaim({...newClaim, patientId: ''})}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Corporate Details */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Corporate Company / Insurer *</Label>
                    <Input 
                      placeholder="e.g. Star Health / Reliance Contract"
                      className="h-9 text-xs"
                      value={newClaim.insuranceCompany}
                      onChange={(e) => setNewClaim({...newClaim, insuranceCompany: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Policy / Employee ID</Label>
                    <Input 
                      placeholder="e.g. POL-102923"
                      className="h-9 text-xs"
                      value={newClaim.policyNo}
                      onChange={(e) => setNewClaim({...newClaim, policyNo: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">TPA Desk Coordinator</Label>
                    <Input 
                      placeholder="e.g. MediAssist Desk"
                      className="h-9 text-xs"
                      value={newClaim.tpaName}
                      onChange={(e) => setNewClaim({...newClaim, tpaName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Approved Limits Amount (₹)</Label>
                    <Input 
                      type="number"
                      placeholder="0.00"
                      className="h-9 text-xs"
                      value={newClaim.insuranceLimit}
                      onChange={(e) => setNewClaim({...newClaim, insuranceLimit: e.target.value})}
                    />
                  </div>
                </div>

                {/* Procedure Specifics */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">Procedure / Surgery Name</Label>
                    <Input 
                      placeholder="e.g. Open Hernia Repair"
                      className="h-9 text-xs bg-white"
                      value={newClaim.procedureName}
                      onChange={(e) => setNewClaim({...newClaim, procedureName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">Total Bill / Procedure Cost (₹) *</Label>
                    <Input 
                      type="number"
                      placeholder="e.g. 45000"
                      className="h-9 text-xs bg-white font-bold"
                      value={newClaim.procedureCost}
                      onChange={(e) => setNewClaim({...newClaim, procedureCost: e.target.value})}
                    />
                  </div>
                </div>

                {/* Staff Splits Record Keeping */}
                <div className="space-y-2 border-t pt-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Clinician & Staff Payable Splits</Label>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      className="h-7 text-[10px] gap-1 text-indigo-600 hover:bg-indigo-50"
                      onClick={() => {
                        setNewClaim({
                          ...newClaim,
                          payableSplits: [...newClaim.payableSplits, { staffId: '', staffName: '', role: 'Surgeon', amount: '' }]
                        });
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Split Row
                    </Button>
                  </div>

                  {newClaim.payableSplits.length === 0 ? (
                    <div className="text-center py-4 bg-slate-50 rounded border border-dashed text-slate-400 text-xs">
                      No clinician payouts mapped yet. Add row to capture doctor payables.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {newClaim.payableSplits.map((split, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <select
                            className="text-xs h-8 border rounded px-2 flex-1 bg-white"
                            value={split.staffId}
                            onChange={(e) => {
                              const staffObj = staffList.find(s => s.id === e.target.value);
                              const updated = [...newClaim.payableSplits];
                              updated[i] = { 
                                ...updated[i], 
                                staffId: e.target.value, 
                                staffName: staffObj ? (staffObj.name || staffObj.fullName) : ''
                              };
                              setNewClaim({...newClaim, payableSplits: updated});
                            }}
                          >
                            <option value="">-- Choose Doctor/Staff --</option>
                            {staffList.map(s => (
                              <option key={s.id} value={s.id}>{s.name || s.fullName} ({s.role || 'Staff'})</option>
                            ))}
                          </select>

                          <select
                            className="text-xs h-8 border rounded px-2 w-28 bg-white"
                            value={split.role}
                            onChange={(e) => {
                              const updated = [...newClaim.payableSplits];
                              updated[i].role = e.target.value;
                              setNewClaim({...newClaim, payableSplits: updated});
                            }}
                          >
                            <option value="Surgeon">Surgeon</option>
                            <option value="Anesthetist">Anesthetist</option>
                            <option value="Assistant">Assistant</option>
                            <option value="Duty Doctor">Duty Doctor</option>
                            <option value="Nurse">Staff Nurse</option>
                          </select>

                          <Input
                            type="number"
                            placeholder="₹ Split Amount"
                            className="h-8 text-xs w-24 font-semibold text-slate-800"
                            value={split.amount}
                            onChange={(e) => {
                              const updated = [...newClaim.payableSplits];
                              updated[i].amount = e.target.value;
                              setNewClaim({...newClaim, payableSplits: updated});
                            }}
                          />

                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-rose-500"
                            onClick={() => {
                              const updated = [...newClaim.payableSplits];
                              updated.splice(i, 1);
                              setNewClaim({...newClaim, payableSplits: updated});
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="mt-4 border-t pt-3">
                <Button variant="outline" size="sm" onClick={() => setIsNewClaimOpen(false)}>Cancel</Button>
                <Button size="sm" className="bg-indigo-600 text-white hover:bg-indigo-700" onClick={handleCreateClaim}>
                  Register Claim & Mapped Splits
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-slate-50/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Total Approved Claims</p>
              <h3 className="text-xl font-extrabold text-slate-900 mt-1">{formatCurrency(stats.approvedClaims)}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700">
              <Shield className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-slate-50/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Payments Received</p>
              <h3 className="text-xl font-extrabold text-emerald-600 mt-1">{formatCurrency(stats.receivedClaims)}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-slate-50/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Disbursed to Staff</p>
              <h3 className="text-xl font-extrabold text-indigo-600 mt-1">{formatCurrency(stats.disbursed)}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center text-indigo-600">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-slate-50/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Hospital Net Share</p>
              <h3 className="text-xl font-extrabold text-slate-900 mt-1">{formatCurrency(stats.netMargin)}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700">
              <Coins className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('corporateLedger')} 
          className={`px-4 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'corporateLedger' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <Receipt className="w-4 h-4" />
          Corporate Patients Payment Ledger
        </button>
        <button 
          onClick={() => setActiveTab('claims')} 
          className={`px-4 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'claims' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <Shield className="w-4 h-4" />
          Corporate & TPA Claims
        </button>
        <button 
          onClick={() => setActiveTab('payables')} 
          className={`px-4 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'payables' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <Coins className="w-4 h-4" />
          Staff & Doctor Payables
        </button>
        <button 
          onClick={() => setActiveTab('ledger')} 
          className={`px-4 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'ledger' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <TrendingUp className="w-4 h-4" />
          Ledger & Accounts Reports
        </button>
        <button 
          onClick={() => setActiveTab('discharge')} 
          className={`px-4 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'discharge' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <UserCheck className="w-4 h-4" />
          Discharge Clearance ({dischargeRecords.length})
        </button>
      </div>

      {/* Tab: Corporate Patients Payment Ledger */}
      {activeTab === 'corporateLedger' && (
        <div className="space-y-4">
          {/* Top Actions & Banner for Corporate Ledger */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r from-indigo-900 to-slate-900 p-4 rounded-xl text-white shadow-md">
            <div>
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-400" />
                <h2 className="text-base font-extrabold tracking-wide">Corporate Patients Payment Ledger</h2>
                <Badge className="bg-indigo-500/30 text-indigo-200 border-indigo-400/30 text-[10px]">
                  {filteredCorporateLedger.length} Patients Billed
                </Badge>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Real-time tracking of corporate patient procedure bills, payments received, TDS retentions, and outstanding balance settlement ledgers.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs gap-1.5"
                onClick={exportCorporateLedgerCSV}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Export Ledger CSV
              </Button>
              <Button 
                size="sm" 
                className="bg-indigo-500 hover:bg-indigo-600 text-white text-xs gap-1.5 font-bold"
                onClick={printCorporatePatientsLedgerStatement}
              >
                <Printer className="w-3.5 h-3.5" />
                Print Ledger Statement
              </Button>
            </div>
          </div>

          {/* Ledger Summary Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="border border-slate-200 shadow-sm bg-indigo-50/40">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Corporate Billed</p>
                  <h4 className="text-lg font-extrabold text-indigo-900 mt-0.5">{formatCurrency(corpLedgerStats.totalBilled)}</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">{filteredCorporateLedger.length} Corporate Cases</p>
                </div>
                <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-lg">
                  <Building2 className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 shadow-sm bg-emerald-50/40">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Received Amount</p>
                  <h4 className="text-lg font-extrabold text-emerald-700 mt-0.5">{formatCurrency(corpLedgerStats.totalReceived)}</h4>
                  <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">{corpLedgerStats.collectionRate}% Collection Rate</p>
                </div>
                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-lg">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 shadow-sm bg-amber-50/40">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">TDS Retained (Govt)</p>
                  <h4 className="text-lg font-extrabold text-amber-700 mt-0.5">{formatCurrency(corpLedgerStats.totalTds)}</h4>
                  <p className="text-[10px] text-amber-600 mt-0.5">Tax Deducted at Source</p>
                </div>
                <div className="p-2.5 bg-amber-100 text-amber-700 rounded-lg">
                  <Coins className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 shadow-sm bg-rose-50/40">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Balance Outstanding</p>
                  <h4 className="text-lg font-extrabold text-rose-700 mt-0.5">{formatCurrency(corpLedgerStats.totalBalance)}</h4>
                  <p className="text-[10px] text-rose-600 mt-0.5">{corpLedgerStats.pendingCount + corpLedgerStats.partialCount} Unsettled Invoices</p>
                </div>
                <div className="p-2.5 bg-rose-100 text-rose-700 rounded-lg">
                  <AlertCircle className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and View Selector */}
          <Card className="border-none shadow-sm">
            <CardHeader className="bg-slate-50/60 border-b p-3.5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-60">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <Input 
                      placeholder="Search Patient Name, MRN, Corporate, UTR..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-8 text-xs bg-white"
                    />
                  </div>

                  {/* Corporate Partner Dropdown */}
                  <select 
                    className="text-xs h-8 border rounded px-2.5 bg-white max-w-[180px] text-slate-700 font-medium"
                    value={corpCompanyFilter}
                    onChange={(e) => setCorpCompanyFilter(e.target.value)}
                  >
                    <option value="all">All Corporate Partners</option>
                    {corporateCompaniesList.map((company, i) => (
                      <option key={i} value={company}>{company}</option>
                    ))}
                  </select>

                  {/* Corporate Type */}
                  <select 
                    className="text-xs h-8 border rounded px-2.5 bg-white text-slate-700 font-medium"
                    value={corpTypeFilter}
                    onChange={(e) => setCorpTypeFilter(e.target.value)}
                  >
                    <option value="all">All Corporate Classes</option>
                    <option value="Insurance TPA">Insurance TPA</option>
                    <option value="Corporate Direct">Corporate Direct Contract</option>
                  </select>

                  {/* Payment Status */}
                  <select 
                    className="text-xs h-8 border rounded px-2.5 bg-white text-slate-700 font-medium"
                    value={corpStatusFilter}
                    onChange={(e) => setCorpStatusFilter(e.target.value)}
                  >
                    <option value="all">All Payment Statuses</option>
                    <option value="Pending">Pending Payment (0% Rec)</option>
                    <option value="Partial">Partial Received</option>
                    <option value="Settled">Fully Settled</option>
                  </select>
                </div>

                {/* View Switcher: Patient-wise vs Company-wise */}
                <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-lg">
                  <button
                    onClick={() => setCorpLedgerView('patient')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${corpLedgerView === 'patient' ? 'bg-white text-indigo-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Patient-wise Ledger
                  </button>
                  <button
                    onClick={() => setCorpLedgerView('company')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${corpLedgerView === 'company' ? 'bg-white text-indigo-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Corporate Summary
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {corpLedgerView === 'patient' ? (
                <Table>
                  <TableHeader className="bg-slate-100/70">
                    <TableRow>
                      <TableHead className="font-bold text-xs text-slate-800">Billed Date</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800">Patient Details</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800">Corporate Account & Policy</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800">Procedure Details</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-right">Billed Amount (₹)</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-right">Received Amount (₹)</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-right">Balance Outstanding (₹)</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-center">Payment Status</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-right">Ledger Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCorporateLedger.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-10 text-slate-500">
                          <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                          <p className="font-bold text-sm">No corporate patient payment ledger entries found</p>
                          <p className="text-xs text-slate-400">Try adjusting your search terms or filters above.</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCorporateLedger.map((record) => {
                        const patient = patients.find(p => p.id === record.patientId);
                        const fin = getClaimFinancials(record);

                        return (
                          <TableRow key={record.id} className="hover:bg-slate-50/80 transition-colors">
                            <TableCell className="text-xs font-semibold text-slate-700">
                              {formatDate(fin.billedDate)}
                            </TableCell>

                            <TableCell>
                              <div className="font-bold text-slate-900 text-xs">{patient?.name || record.patientName || 'Patient'}</div>
                              <div className="text-[11px] text-slate-500">MRN: {patient?.mrn || record.mrn || 'N/A'}</div>
                            </TableCell>

                            <TableCell>
                              <div className="font-extrabold text-indigo-900 text-xs">{record.insuranceCompany || 'N/A'}</div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <span>Policy: {record.policyNo || 'N/A'}</span>
                                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-slate-300">
                                  {record.corporateType || 'TPA'}
                                </Badge>
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="font-medium text-slate-800 text-xs">{record.procedureName || 'N/A'}</div>
                            </TableCell>

                            <TableCell className="text-right font-bold text-slate-900 text-xs">
                              {formatCurrency(fin.billedAmount)}
                            </TableCell>

                            <TableCell className="text-right">
                              <div className="font-extrabold text-emerald-700 text-xs">
                                {formatCurrency(fin.totalReceived)}
                              </div>
                              {fin.paymentsList.length > 0 && (
                                <button
                                  onClick={() => {
                                    setSelectedClaimForHistory(record);
                                    setIsReceiptHistoryOpen(true);
                                  }}
                                  className="text-[10px] text-indigo-600 hover:underline flex items-center justify-end gap-0.5 ml-auto mt-0.5 font-medium"
                                >
                                  <History className="w-3 h-3" />
                                  {fin.paymentsList.length} Payment Receipts
                                </button>
                              )}
                            </TableCell>

                            <TableCell className="text-right">
                              <div className={`font-extrabold text-xs ${fin.balanceAmount > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                                {formatCurrency(fin.balanceAmount)}
                              </div>
                            </TableCell>

                            <TableCell className="text-center">
                              {fin.computedStatus === 'Fully Settled' && (
                                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[10px] gap-1 font-bold">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Fully Settled
                                </Badge>
                              )}
                              {fin.computedStatus === 'Partial Received' && (
                                <Badge className="bg-sky-100 text-sky-800 hover:bg-sky-100 text-[10px] gap-1 font-bold">
                                  <Clock className="w-3 h-3 text-sky-600" />
                                  Partial Received
                                </Badge>
                              )}
                              {fin.computedStatus === 'Pending Payment' && (
                                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-[10px] gap-1 font-bold">
                                  <AlertCircle className="w-3 h-3 text-amber-600" />
                                  Pending Payment
                                </Badge>
                              )}
                            </TableCell>

                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="sm"
                                  className="h-7 text-[11px] gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                                  onClick={() => {
                                    setSelectedClaim(record);
                                    setPaymentForm({
                                      approvedAmount: fin.balanceAmount.toString(),
                                      tdsDeducted: '0',
                                      utrNo: '',
                                      paymentMode: 'Net Banking',
                                      notes: '',
                                      date: new Date().toISOString().split('T')[0]
                                    });
                                    setIsReceivePaymentOpen(true);
                                  }}
                                >
                                  <Coins className="w-3 h-3" />
                                  Receive Payment
                                </Button>

                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7 text-slate-600 hover:text-indigo-600 border-slate-200"
                                  title="Print Patient Corporate Statement"
                                  onClick={() => printSinglePatientCorporateStatement(record)}
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              ) : (
                /* Company-wise Summary Table */
                <Table>
                  <TableHeader className="bg-slate-100/70">
                    <TableRow>
                      <TableHead className="font-bold text-xs text-slate-800">Corporate Partner Name</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-center">Billed Cases</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-right">Total Billed Amount (₹)</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-right">Total Received (₹)</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-right">Total TDS (₹)</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-right">Balance Outstanding (₹)</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-center">Collection Progress</TableHead>
                      <TableHead className="font-bold text-xs text-slate-800 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companyWiseLedger.map((comp, idx) => {
                      const progressPct = comp.totalBilled > 0 ? Math.min(100, Math.round((comp.totalReceived / comp.totalBilled) * 100)) : 0;
                      return (
                        <TableRow key={idx} className="hover:bg-slate-50">
                          <TableCell className="font-bold text-xs text-slate-900">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-indigo-600" />
                              <span>{comp.companyName}</span>
                            </div>
                          </TableCell>

                          <TableCell className="text-center font-bold text-xs text-slate-700">
                            {comp.casesCount} Patients
                          </TableCell>

                          <TableCell className="text-right font-bold text-slate-900 text-xs">
                            {formatCurrency(comp.totalBilled)}
                          </TableCell>

                          <TableCell className="text-right font-extrabold text-emerald-700 text-xs">
                            {formatCurrency(comp.totalReceived)}
                          </TableCell>

                          <TableCell className="text-right font-semibold text-amber-700 text-xs">
                            {formatCurrency(comp.totalTds)}
                          </TableCell>

                          <TableCell className="text-right font-extrabold text-rose-600 text-xs">
                            {formatCurrency(comp.totalBalance)}
                          </TableCell>

                          <TableCell className="text-center w-36">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden">
                                <div 
                                  className="bg-emerald-500 h-full rounded-full transition-all" 
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-bold text-slate-600">{progressPct}%</span>
                            </div>
                          </TableCell>

                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[10px] gap-1 text-indigo-700 border-indigo-200"
                              onClick={() => {
                                setCorpCompanyFilter(comp.companyName);
                                setCorpLedgerView('patient');
                              }}
                            >
                              <Eye className="w-3 h-3" />
                              View Patients
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Corporate / TPA Claims */}
      {activeTab === 'claims' && (
        <Card className="border-none shadow-sm">
          <CardHeader className="bg-slate-50/50 border-b p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-600" />
                <CardTitle className="text-sm font-extrabold text-slate-800">Active Claims & Pre-Auths</CardTitle>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-56">
                  <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input 
                    placeholder="Search patient, policy..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-7 h-8 text-xs"
                  />
                </div>
                <select 
                  className="text-xs h-8 border rounded px-2 bg-white"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="all">All Channels</option>
                  <option value="Insurance TPA">Insurance TPA Cover</option>
                  <option value="Corporate Direct">Corporate Contract</option>
                </select>
                <select 
                  className="text-xs h-8 border rounded px-2 bg-white"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="Pending">Pending Pre-Auth</option>
                  <option value="Approved">Settled / Received</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold text-xs text-slate-700">Patient Details</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700">Corporate Account</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700">Procedure</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700">Cost / Limit</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700">Funds Approved</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700">Clearance Status</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInsurance.map((record) => {
                  const patient = patients.find(p => p.id === record.patientId);
                  const isApproved = (record.status || '').toLowerCase() === 'approved';
                  
                  return (
                    <TableRow key={record.id} className="hover:bg-slate-50/50">
                      <TableCell className="text-xs">
                        <div className="font-bold text-slate-800">{patient?.name || 'Seeded Record'}</div>
                        <div className="text-[10px] text-muted-foreground">MRN: {patient?.mrn || 'MRN-77291'}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-semibold text-slate-800">{record.insuranceCompany}</div>
                        <div className="text-[10px] text-muted-foreground">{record.policyNo || 'Policy ID Unavailable'} • {record.corporateType || 'TPA'}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-semibold">{record.procedureName || 'Procedure Pending'}</div>
                        <div className="text-[10px] text-slate-400">Claim Date: {formatDate(record.claim_date || record.date)}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-semibold">{formatCurrency(record.procedureCost || record.insuranceLimit || 0)}</div>
                        <div className="text-[10px] text-slate-500">Pre-Auth limit: {formatCurrency(record.insuranceLimit || 0)}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {isApproved ? (
                          <div>
                            <div className="font-bold text-emerald-600">{formatCurrency(record.approvedAmount || record.approved_amount || 0)}</div>
                            <div className="text-[9px] text-emerald-700">TDS: {formatCurrency(record.tdsDeducted || 0)}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium">Awaiting Settlement</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className={`h-5 gap-1 ${isApproved ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                          {isApproved ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3 animate-pulse" />}
                          {isApproved ? 'Settled & Received' : 'Pre-Auth Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {!isApproved && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 text-[10px] gap-1 text-emerald-600 hover:bg-emerald-50"
                              onClick={() => {
                                setSelectedClaim(record);
                                setPaymentForm({
                                  approvedAmount: (record.insuranceLimit || record.procedureCost || '').toString(),
                                  tdsDeducted: '0',
                                  utrNo: '',
                                  date: new Date().toISOString().split('T')[0]
                                });
                                setIsReceivePaymentOpen(true);
                              }}
                            >
                              <Coins className="w-3.5 h-3.5" />
                              Receive Payment
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-indigo-600"
                            title="View Split details"
                            onClick={() => {
                              setSelectedClaim(record);
                              setIsViewDetailsOpen(true);
                            }}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-rose-500"
                            onClick={() => handleDeleteClaim(record.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredInsurance.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-xs">
                      No corporate claims found. Register a claim to begin tracking corporate billing.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Tab: Doctor & Staff Payables */}
      {activeTab === 'payables' && (
        <Card className="border-none shadow-sm">
          <CardHeader className="bg-slate-50/50 border-b p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-indigo-600" />
                <CardTitle className="text-sm font-extrabold text-slate-800 font-mono">Clinician / Staff Payables Ledger</CardTitle>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select 
                  className="text-xs h-8 border rounded px-2 bg-white"
                  value={filterStaff}
                  onChange={(e) => setFilterStaff(e.target.value)}
                >
                  <option value="all">All Clinicians</option>
                  {Array.from(new Set(staffPayables.map(p => p.staffId))).map(id => {
                    const name = staffPayables.find(p => p.staffId === id)?.staffName;
                    return <option key={id} value={id}>{name}</option>;
                  })}
                </select>
                <select 
                  className="text-xs h-8 border rounded px-2 bg-white"
                  value={filterPayableStatus}
                  onChange={(e) => setFilterPayableStatus(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="Pending Corporate Payment">Pending Corporate Payment</option>
                  <option value="Ready for Payout">Ready for Payout</option>
                  <option value="Paid Out">Disbursed (Paid Out)</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold text-xs text-slate-700">Clinician / Staff</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700">Associated Patient & Case</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700">Split Role</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700">Payable Amount</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700">Payout Status</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700 text-right">Settlement Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayables.map((payable) => {
                  const claim = insuranceRecords.find(c => c.id === payable.claimId);
                  
                  return (
                    <TableRow key={payable.id} className="hover:bg-slate-50/50">
                      <TableCell className="text-xs">
                        <div className="font-bold text-slate-800">{payable.staffName}</div>
                        <div className="text-[10px] text-muted-foreground">{payable.role} ID: {payable.staffId}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-semibold text-slate-800">{payable.patientName}</div>
                        <div className="text-[10px] text-muted-foreground">{payable.procedureName}</div>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-600">
                        {payable.role}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-slate-900">
                        {formatCurrency(payable.payableAmount)}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className={`h-5 gap-1 ${
                          payable.status === 'Paid Out' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          payable.status === 'Ready for Payout' ? 'bg-sky-50 text-sky-700 border-sky-100 animate-pulse' :
                          'bg-amber-50 text-amber-700 border-amber-100'
                        }`}>
                          {payable.status === 'Paid Out' ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {payable.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {payable.status === 'Ready for Payout' && (
                            <Button
                              size="sm"
                              className="h-7 text-[10px] bg-sky-600 text-white hover:bg-sky-700 gap-1"
                              onClick={() => {
                                setSelectedPayable(payable);
                                setPayoutForm({
                                  paymentMode: 'Net Banking',
                                  utrNo: '',
                                  date: new Date().toISOString().split('T')[0],
                                  notes: `Fee split settlement for ${payable.procedureName}`
                                });
                                setIsProcessPayoutOpen(true);
                              }}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Disburse Payout
                            </Button>
                          )}
                          {payable.status === 'Paid Out' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[10px] text-indigo-700 border-indigo-100 hover:bg-indigo-50 gap-1"
                              onClick={() => printPayoutVoucher(payable)}
                            >
                              <Printer className="w-3 h-3" />
                              Print Voucher
                            </Button>
                          )}
                          {payable.status === 'Pending Corporate Payment' && (
                            <span className="text-[10px] italic text-slate-400 font-medium">Awaiting Corp Claim Settled</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredPayables.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-xs">
                      No clinician payables found matching these search criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Tab: Financial Ledger & Reports */}
      {activeTab === 'ledger' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Summary Card */}
          <Card className="border-none shadow-sm lg:col-span-1 bg-slate-50/30">
            <CardHeader>
              <CardTitle className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                Ledger Statistics
              </CardTitle>
              <CardDescription className="text-xs">Historical ledger and share breakdown across corporate billing accounts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-xs pb-2 border-b">
                <span className="text-slate-500 font-bold">Total Approved Invoices:</span>
                <span className="font-mono font-extrabold">{formatCurrency(stats.approvedClaims)}</span>
              </div>
              <div className="flex justify-between items-center text-xs pb-2 border-b">
                <span className="text-slate-500 font-bold">Total Net Received:</span>
                <span className="font-mono font-extrabold text-emerald-600">{formatCurrency(stats.receivedClaims)}</span>
              </div>
              <div className="flex justify-between items-center text-xs pb-2 border-b">
                <span className="text-slate-500 font-bold">Total Government TDS Retained:</span>
                <span className="font-mono font-bold text-amber-700">{formatCurrency(stats.tds)}</span>
              </div>
              <div className="flex justify-between items-center text-xs pb-2 border-b">
                <span className="text-indigo-600 font-bold">Paid Out to Clinicians:</span>
                <span className="font-mono font-bold text-indigo-700">{formatCurrency(stats.disbursed)}</span>
              </div>
              <div className="flex justify-between items-center text-xs pb-2 border-b">
                <span className="text-amber-600 font-bold">Outstanding Ready Payouts:</span>
                <span className="font-mono font-bold text-amber-700">{formatCurrency(stats.pendingDisbursal)}</span>
              </div>
              
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg flex flex-col items-center">
                <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">Hospital Net Retained Surplus</span>
                <span className="text-xl font-black text-indigo-900 mt-1">{formatCurrency(stats.netMargin)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Right Chronological History Ledger */}
          <Card className="border-none shadow-sm lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-extrabold text-slate-800">Settlement Receipts & Outflows Logs</CardTitle>
              <CardDescription className="text-xs">Audit trails of payments received from corporates and payouts settled to doctors.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                <div className="divide-y text-xs">
                  {/* Generate unified ledger chronologically */}
                  {(() => {
                    const events: any[] = [];
                    
                    insuranceRecords.forEach(c => {
                      if (c.status === 'Approved') {
                        events.push({
                          type: 'INFLOW',
                          title: `Corporate Settlement Received - ${c.insuranceCompany}`,
                          desc: `Patient: ${patients.find(p => p.id === c.patientId)?.name || 'Unknown'} (${c.procedureName})`,
                          amount: c.receivedAmount || c.approvedAmount,
                          ref: c.utrNo,
                          date: c.payment_received_date || c.claim_date || c.date
                        });
                      }
                    });

                    staffPayables.forEach(p => {
                      if (p.status === 'Paid Out') {
                        events.push({
                          type: 'OUTFLOW',
                          title: `Doctor Payable Settled - ${p.staffName}`,
                          desc: `Procedure: ${p.procedureName} (${p.role})`,
                          amount: p.payableAmount,
                          ref: p.disbursementUtr,
                          date: p.paidAt
                        });
                      }
                    });

                    // Sort events by date descending
                    const sorted = events.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                    if (sorted.length === 0) {
                      return <div className="text-center py-10 text-slate-400">No transactions recorded yet in the ledger.</div>;
                    }

                    return sorted.map((e, index) => (
                      <div key={index} className="p-4 hover:bg-slate-50 flex items-center justify-between">
                        <div className="flex gap-3 items-center">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${e.type === 'INFLOW' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                            {e.type === 'INFLOW' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-800 text-xs">{e.title}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{e.desc}</div>
                            <div className="text-[9px] text-slate-400 font-mono mt-0.5">Ref: {e.ref || 'N/A'} • Date: {formatDate(e.date)}</div>
                          </div>
                        </div>
                        <div className={`font-mono font-extrabold text-xs ${e.type === 'INFLOW' ? 'text-emerald-600' : 'text-slate-900'}`}>
                          {e.type === 'INFLOW' ? '+' : '-'}{formatCurrency(e.amount)}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Patient Discharge clearance (The original flow from earlier code) */}
      {activeTab === 'discharge' && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Initiates Discharge List</CardTitle>
            <CardDescription>Patients waiting for final clearance from nursing and accounts.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="whitespace-nowrap">Name</TableHead>
                    <TableHead className="whitespace-nowrap">ID / MRN</TableHead>
                    <TableHead className="whitespace-nowrap">Nurse Verification</TableHead>
                    <TableHead className="whitespace-nowrap">Accountant Verification</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dischargeRecords.map((record) => {
                    const patient = patients.find(p => p.id === record.patientId);
                    return (
                      <TableRow key={record.id} className="border-slate-50 hover:bg-slate-50/40">
                        <TableCell className="font-medium text-sm whitespace-nowrap">{record.name}</TableCell>
                        <TableCell className="font-bold text-medical-blue text-xs whitespace-nowrap">
                          {patient?.mrn || record.patientId.substring(0, 8).toUpperCase()}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant="outline" className={`gap-1.5 ${record.nurseVerification === 'Verified' ? 'text-emerald-600 border-emerald-100 bg-emerald-50' : 'text-amber-600 border-amber-100 bg-amber-50'}`}>
                            <UserCheck className="w-3 h-3" />
                            {record.nurseVerification}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant="outline" className={`gap-1.5 ${record.accountantVerification === 'Verified' ? 'text-emerald-600 border-emerald-100 bg-emerald-50' : 'text-amber-600 border-amber-100 bg-amber-50'}`}>
                            <FileCheck className="w-3 h-3" />
                            {record.accountantVerification}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" className="text-medical-blue h-8" onClick={() => printDischargeSummary(record)}>
                              <Printer className="w-3.5 h-3.5 mr-1.5" />
                              Summary
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {dischargeRecords.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                        No patients initiated for discharge.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* DIALOG: Receive Payment */}
      <Dialog open={isReceivePaymentOpen} onOpenChange={setIsReceivePaymentOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-lg text-emerald-950 font-bold">Receive Corporate/TPA Payment</DialogTitle>
            <DialogDescription>Record final settlement received from insurer for this claim.</DialogDescription>
          </DialogHeader>

          {selectedClaim && (
            <div className="space-y-4 py-3 text-xs">
              <div className="p-3 bg-slate-50 border rounded-lg space-y-1">
                <div>Insurer: <strong>{selectedClaim.insuranceCompany}</strong></div>
                <div>Procedure: <strong>{selectedClaim.procedureName}</strong></div>
                <div>Patient: <strong>{patients.find(p => p.id === selectedClaim.patientId)?.name || 'Unknown'}</strong></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Approved / Settled Amount (₹) *</Label>
                  <Input 
                    type="number"
                    className="h-9 text-xs"
                    value={paymentForm.approvedAmount}
                    onChange={(e) => setPaymentForm({...paymentForm, approvedAmount: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Government TDS Deducted (₹)</Label>
                  <Input 
                    type="number"
                    className="h-9 text-xs"
                    value={paymentForm.tdsDeducted}
                    onChange={(e) => setPaymentForm({...paymentForm, tdsDeducted: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">UTR / Bank Transaction Ref *</Label>
                  <Input 
                    placeholder="e.g. UTR10292388"
                    className="h-9 text-xs"
                    value={paymentForm.utrNo}
                    onChange={(e) => setPaymentForm({...paymentForm, utrNo: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Received Date</Label>
                  <Input 
                    type="date"
                    className="h-9 text-xs"
                    value={paymentForm.date}
                    onChange={(e) => setPaymentForm({...paymentForm, date: e.target.value})}
                  />
                </div>
              </div>

              <div className="text-[10px] text-slate-500 bg-emerald-50 p-2.5 rounded border border-emerald-100">
                Note: Saving this settlement automatically unlocks any doctor or clinician payables linked to this case, transitioning them to "Ready for Payout".
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsReceivePaymentOpen(false)}>Cancel</Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleReceivePaymentSubmit}>
              Commit Settlement & Unlock Payouts
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Process Staff Disbursal */}
      <Dialog open={isProcessPayoutOpen} onOpenChange={setIsProcessPayoutOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-lg text-indigo-950 font-bold">Process Staff Disbursal</DialogTitle>
            <DialogDescription>Log direct payment payout to clinicians after corporate settlement received.</DialogDescription>
          </DialogHeader>

          {selectedPayable && (
            <div className="space-y-4 py-3 text-xs">
              <div className="p-3 bg-slate-50 border rounded space-y-1">
                <div>Recipient: <strong className="text-indigo-800">{selectedPayable.staffName}</strong> ({selectedPayable.role})</div>
                <div>Amount Payable: <strong className="text-slate-800">{formatCurrency(selectedPayable.payableAmount)}</strong></div>
                <div>Case Link: <span>Patient {selectedPayable.patientName} ({selectedPayable.procedureName})</span></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Payout Mode</Label>
                  <select
                    className="w-full text-xs h-9 border rounded-md px-3 bg-white focus:border-indigo-500"
                    value={payoutForm.paymentMode}
                    onChange={(e) => setPayoutForm({...payoutForm, paymentMode: e.target.value as any})}
                  >
                    <option value="Net Banking">Net Banking Transfer</option>
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="Cash">Cash Disbursement</option>
                    <option value="Cheque">Cheque Settlement</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Transaction Reference / UTR *</Label>
                  <Input 
                    placeholder="e.g. PYOUT-8812-UTR"
                    className="h-9 text-xs"
                    value={payoutForm.utrNo}
                    onChange={(e) => setPayoutForm({...payoutForm, utrNo: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Disbursal Date</Label>
                <Input 
                  type="date"
                  className="h-9 text-xs"
                  value={payoutForm.date}
                  onChange={(e) => setPayoutForm({...payoutForm, date: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Disbursal Notes / Remarks</Label>
                <Input 
                  placeholder="e.g. Direct bank settlement processed"
                  className="h-9 text-xs"
                  value={payoutForm.notes}
                  onChange={(e) => setPayoutForm({...payoutForm, notes: e.target.value})}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsProcessPayoutOpen(false)}>Cancel</Button>
            <Button size="sm" className="bg-sky-600 hover:bg-sky-700 text-white" onClick={handleProcessPayoutSubmit}>
              Confirm Disbursement & Save Voucher
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: View Details (Splits List) */}
      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-indigo-900">Corporate Case Details & Doctor Splits</DialogTitle>
          </DialogHeader>

          {selectedClaim && (
            <div className="space-y-4 py-1 text-xs">
              <div className="p-3 bg-slate-50 border rounded-lg space-y-1.5">
                <div>Patient: <strong>{patients.find(p => p.id === selectedClaim.patientId)?.name || 'Unknown'}</strong></div>
                <div>Insurer: <span>{selectedClaim.insuranceCompany}</span></div>
                <div>Procedure: <strong className="text-indigo-800">{selectedClaim.procedureName || 'N/A'}</strong></div>
                <div>Procedure Total Cost: <strong className="font-bold">{formatCurrency(selectedClaim.procedureCost || selectedClaim.insuranceLimit || 0)}</strong></div>
              </div>

              <div>
                <Label className="text-xs font-black uppercase text-indigo-950 tracking-wider">Associated Doctor & Staff Revenue Splits</Label>
                <div className="border rounded-md mt-2 divide-y bg-white">
                  {staffPayables.filter(p => p.claimId === selectedClaim.id).length === 0 ? (
                    <div className="p-3 text-center text-slate-400 italic">No revenue payout splits mapped to this case.</div>
                  ) : (
                    staffPayables.filter(p => p.claimId === selectedClaim.id).map(p => (
                      <div key={p.id} className="p-2.5 flex justify-between items-center hover:bg-slate-50">
                        <div>
                          <div className="font-bold text-slate-800">{p.staffName}</div>
                          <div className="text-[10px] text-slate-500">{p.role}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold">{formatCurrency(p.payableAmount)}</div>
                          <Badge variant="outline" className={`h-4 text-[9px] px-1 ${
                            p.status === 'Paid Out' ? 'bg-emerald-50 text-emerald-700' :
                            p.status === 'Ready for Payout' ? 'bg-sky-50 text-sky-700' :
                            'bg-amber-50 text-amber-700'
                          }`}>
                            {p.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button size="sm" onClick={() => setIsViewDetailsOpen(false)}>Close Overview</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Receipt History Logs */}
      <Dialog open={isReceiptHistoryOpen} onOpenChange={setIsReceiptHistoryOpen}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-indigo-900 flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600" />
              Corporate Payment Receipt Logs
            </DialogTitle>
            <DialogDescription>
              Complete ledger timeline of partial and final payments received for this corporate case.
            </DialogDescription>
          </DialogHeader>

          {selectedClaimForHistory && (() => {
            const patient = patients.find(p => p.id === selectedClaimForHistory.patientId);
            const fin = getClaimFinancials(selectedClaimForHistory);

            return (
              <div className="space-y-4 py-2">
                {/* Patient Summary Banner */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500">Patient:</span> <strong>{patient?.name || selectedClaimForHistory.patientName}</strong> (MRN: {patient?.mrn || 'N/A'})
                  </div>
                  <div>
                    <span className="text-slate-500">Corporate:</span> <strong>{selectedClaimForHistory.insuranceCompany}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Procedure:</span> <strong>{selectedClaimForHistory.procedureName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Billed Date:</span> <strong>{formatDate(fin.billedDate)}</strong>
                  </div>
                </div>

                {/* Financial Summary Line */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 bg-indigo-50 border border-indigo-100 rounded">
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Total Billed</div>
                    <div className="text-sm font-extrabold text-indigo-900">{formatCurrency(fin.billedAmount)}</div>
                  </div>
                  <div className="p-2 bg-emerald-50 border border-emerald-100 rounded">
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Total Received</div>
                    <div className="text-sm font-extrabold text-emerald-700">{formatCurrency(fin.totalReceived)}</div>
                  </div>
                  <div className="p-2 bg-rose-50 border border-rose-100 rounded">
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Outstanding Balance</div>
                    <div className="text-sm font-extrabold text-rose-700">{formatCurrency(fin.balanceAmount)}</div>
                  </div>
                </div>

                {/* Receipts Table */}
                <Table>
                  <TableHeader className="bg-slate-100">
                    <TableRow>
                      <TableHead className="font-bold text-xs text-slate-700"># Date</TableHead>
                      <TableHead className="font-bold text-xs text-slate-700">Mode</TableHead>
                      <TableHead className="font-bold text-xs text-slate-700">UTR / Ref Code</TableHead>
                      <TableHead className="font-bold text-xs text-slate-700 text-right">Amount Paid (₹)</TableHead>
                      <TableHead className="font-bold text-xs text-slate-700 text-right">TDS (₹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fin.paymentsList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-slate-400">
                          No payments recorded yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      fin.paymentsList.map((p, i) => (
                        <TableRow key={p.id || i}>
                          <TableCell className="text-xs font-semibold text-slate-800">
                            {formatDate(p.date)}
                          </TableCell>
                          <TableCell className="text-xs text-slate-700">
                            {p.paymentMode || 'Net Banking'}
                          </TableCell>
                          <TableCell className="text-xs font-bold text-indigo-900">
                            {p.utrNo || 'N/A'}
                          </TableCell>
                          <TableCell className="text-xs text-right font-bold text-emerald-700">
                            {formatCurrency(parseFloat(p.amount) || 0)}
                          </TableCell>
                          <TableCell className="text-xs text-right text-amber-700 font-semibold">
                            {formatCurrency(parseFloat(p.tdsDeducted) || 0)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            );
          })()}

          <DialogFooter className="mt-3">
            <Button variant="outline" size="sm" onClick={() => setIsReceiptHistoryOpen(false)}>Close</Button>
            {selectedClaimForHistory && (
              <Button size="sm" className="bg-indigo-600 text-white hover:bg-indigo-700 gap-1" onClick={() => printSinglePatientCorporateStatement(selectedClaimForHistory)}>
                <Printer className="w-3.5 h-3.5" />
                Print Statement
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
