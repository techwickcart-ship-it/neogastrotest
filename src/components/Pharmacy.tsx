import { useState, useEffect, useMemo } from 'react';
import { 
  Pill, 
  Search, 
  Plus, 
  AlertTriangle, 
  Package, 
  History, 
  ArrowRight,
  ShoppingCart,
  Calendar,
  CreditCard,
  Download,
  Printer,
  Trash2,
  Edit,
  Loader2,
  Settings,
  RotateCcw,
  Zap
} from 'lucide-react';
import { getDefaultGstRateForCategory, getActiveTaxSlabs, sortInvoicesByLatestSerial } from '@/lib/taxUtils';
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
import { Separator } from '@/components/ui/separator';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency, formatDate, buildDateWiseInvoiceMap, getCleanDateString, buildDepartmentWiseInvoiceMap } from '@/lib/utils';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { supabaseService } from '@/services/supabaseService';
import { useDataSync } from '@/hooks/useDataSync';
import { canUserModifyRecord, normalizeRole } from '@/utils/rbac';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { generatePharmacyInvoiceHtml, DEFAULT_PHARMACY_SETTINGS } from '@/lib/pharmacyInvoicePrint';
import PharmacyExcelUploader from '@/components/PharmacyExcelUploader';

export default function Pharmacy() {
  const currentUser = storage.get(STORAGE_KEYS.SESSION_USER, null);
  const isAccountant = normalizeRole(currentUser?.role) === 'ACCOUNTANT';

  const [activeTab, setActiveTab] = useState(isAccountant ? 'billing' : 'inventory');
  const [inventory, setInventory] = useState<any[]>(() => storage.get(STORAGE_KEYS.INVENTORY, []));
  const [bills, setBills] = useState<any[]>(() => storage.get(STORAGE_KEYS.BILLING, []));
  const [patients, setPatients] = useState<any[]>(() => storage.get(STORAGE_KEYS.PATIENTS, []));
  const [loading, setLoading] = useState(() => (storage.get(STORAGE_KEYS.INVENTORY, []) || []).length === 0);
  const templateImage = storage.get(STORAGE_KEYS.TEMPLATE_IMAGE, null);

  const [pharmacySettings, setPharmacySettings] = useState<any>(() => {
    const local = storage.get('hms_pharmacy_settings', null);
    return { ...DEFAULT_PHARMACY_SETTINGS, ...(local || {}) };
  });

  const [editingBillInner, setEditingBillInner] = useState<any | null>(null);
  const [isEditBillOpen, setIsEditBillOpen] = useState(false);
  const [shortageAlerts, setShortageAlerts] = useState<any[]>(() => storage.get('hms_pharmacy_shortage_alerts', []));

  useEffect(() => {
    const handleStorageChange = () => {
      setShortageAlerts(storage.get('hms_pharmacy_shortage_alerts', []));
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const pharmacyInvoiceMap = useMemo(() => {
    return buildDepartmentWiseInvoiceMap(bills);
  }, [bills]);

  const handleSaveEditBillInner = async () => {
    if (!editingBillInner) return;
    
    const updatedBill = {
      ...editingBillInner,
      is_edited: true,
      tpa_approval_status: 'Edited',
      total_amount: Number(editingBillInner.totalAmount) || Number(editingBillInner.total_amount),
      paid_amount: Number(editingBillInner.paidAmount) || Number(editingBillInner.paid_amount) || Number(editingBillInner.totalAmount) || Number(editingBillInner.total_amount),
    };

    try {
      const dbRes = await supabaseService.updateInvoice(
        editingBillInner.id,
        updatedBill,
        editingBillInner.invoice_items || []
      );
      
      const sessionBills = storage.get(STORAGE_KEYS.BILLING, []);
      const index = sessionBills.findIndex((b: any) => b.id === editingBillInner.id);
      if (index !== -1) {
        sessionBills[index] = {
          ...sessionBills[index],
          ...updatedBill,
          patient_name: editingBillInner.patient_name || editingBillInner.patient_name,
          patient_phone: editingBillInner.patient_phone || editingBillInner.patient_phone,
          prescribing_doctor: editingBillInner.prescribing_doctor || editingBillInner.prescribing_doctor,
          totalAmount: Number(editingBillInner.totalAmount),
          total_amount: Number(editingBillInner.totalAmount),
          paid_amount: Number(editingBillInner.totalAmount),
          is_edited: true
        };
        storage.set(STORAGE_KEYS.BILLING, sessionBills);
      }
      
      toast.success('Pharmacy billing invoice updated successfully & marked as Edited!');
      setIsEditBillOpen(false);
      setEditingBillInner(null);
      fetchData();
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to update billing invoice');
    }
  };

  const handleDeletePharmacyBill = async (billId: string) => {
    if (!window.confirm("Are you sure you want to delete this pharmacy bill record?")) {
      return;
    }
    try {
      await supabaseService.deleteInvoice(billId).catch(() => null);
      
      // Update local storage
      const sessionBills = storage.get(STORAGE_KEYS.BILLING, []);
      const filteredStorage = sessionBills.filter((b: any) => b.id !== billId);
      storage.set(STORAGE_KEYS.BILLING, filteredStorage);

      setBills(prev => prev.filter(b => b.id !== billId));
      toast.success("Pharmacy bill deleted successfully");
    } catch (err) {
      toast.error("Failed to delete pharmacy bill");
    }
  };

  const handleClearAllPharmacyBills = async () => {
    if (!window.confirm("Are you sure you want to CLEAR ALL old pharmacy bills? This will purge all old pharmacy billing history.")) {
      return;
    }
    try {
      const billsToDelete = [...bills];
      for (const b of billsToDelete) {
        await supabaseService.deleteInvoice(b.id).catch(() => null);
      }
      
      // Clear from local storage
      const sessionBills = storage.get(STORAGE_KEYS.BILLING, []);
      const nonPharmSession = sessionBills.filter((b: any) => {
        const type = String(b.type || b.invoice_type || '').toLowerCase();
        return type !== 'pharmacy' && !String(b.id || '').toUpperCase().startsWith('PHARM');
      });
      storage.set(STORAGE_KEYS.BILLING, nonPharmSession);

      setBills([]);
      toast.success("All old pharmacy bills cleared successfully!");
    } catch (err) {
      toast.error("Error clearing pharmacy bills");
    }
  };

  const fetchData = async (showSpinner = false) => {
    if (showSpinner) {
      setLoading(true);
    }
    try {
      const [invData, invoicesData, patientsData, dbSettings] = await Promise.all([
        supabaseService.getPharmacyItems().catch(() => []),
        supabaseService.getInvoices().catch(() => []),
        supabaseService.getPatients().catch(() => []),
        supabaseService.getPharmacySettings ? supabaseService.getPharmacySettings().catch(() => null) : Promise.resolve(null)
      ]);

      if (invData && Array.isArray(invData) && invData.length > 0) setInventory(invData);
      if (invoicesData && Array.isArray(invoicesData)) {
        const rawPharmacyBills = invoicesData.filter(inv => {
          if (!inv) return false;
          const t = String(inv.type || inv.invoice_type || '').toLowerCase();
          const num = String(inv.invoice_number || inv.invoiceNumber || inv.invoice_no || inv.invoiceNo || '').toUpperCase();
          if (t === 'pharmacy' || num.startsWith('INV-PHARM') || num.startsWith('INV-POS') || num.startsWith('PHARM')) {
            return true;
          }
          const items = inv.invoice_items || inv.items || [];
          return Array.isArray(items) && items.some((item: any) => {
            if (!item) return false;
            const cat = String(item.category || item.item_type || '').toLowerCase();
            const name = String(item.item_name || item.description || '').toLowerCase();
            return cat === 'pharmacy' || name.includes('medicine') || name.includes('tablet') || name.includes('syrup') || name.includes('capsule');
          });
        });

        // Deduplicate pharmacy bills by ID and invoice number
        const uniquePharmBills: any[] = [];
        const seenIds = new Set<string>();
        const seenNums = new Set<string>();

        for (const bill of rawPharmacyBills) {
          if (!bill) continue;
          const bId = String(bill.id || '').trim();
          const bNum = String(bill.invoice_number || bill.invoiceNumber || bill.invoice_no || bill.invoiceNo || '').trim().toLowerCase();

          if (bId && seenIds.has(bId)) continue;
          if (bNum && bNum !== 'n/a' && seenNums.has(bNum)) continue;

          if (bId) seenIds.add(bId);
          if (bNum && bNum !== 'n/a') seenNums.add(bNum);
          uniquePharmBills.push(bill);
        }

        setBills(uniquePharmBills);
      }
      if (patientsData && Array.isArray(patientsData) && patientsData.length > 0) setPatients(patientsData);
      if (dbSettings) {
        const normalizedTerms = Array.isArray(dbSettings.termsAndConditions)
          ? dbSettings.termsAndConditions
          : (typeof dbSettings.termsAndConditions === 'string'
              ? dbSettings.termsAndConditions.split('\n')
              : DEFAULT_PHARMACY_SETTINGS.termsAndConditions);
        const merged = {
          ...DEFAULT_PHARMACY_SETTINGS,
          ...dbSettings,
          termsAndConditions: normalizedTerms
        };
        setPharmacySettings(merged);
        storage.set('hms_pharmacy_settings', merged);
      }
    } catch (e) {
      console.error('Pharmacy fetchData error:', e);
    } finally {
      if (showSpinner) {
        setLoading(false);
      }
    }
  };

  useDataSync(() => fetchData(false));

  const [searchQuery, setSearchQuery] = useState('');

  const filteredInventory = useMemo(() => {
    if (!Array.isArray(inventory)) return [];
    const q = (searchQuery || '').toLowerCase().trim();
    return inventory.filter(item => {
      if (!item) return false;
      const nameMatch = item.name ? String(item.name).toLowerCase().includes(q) : false;
      const catMatch = item.category ? String(item.category).toLowerCase().includes(q) : false;
      const compMatch = item.composition ? String(item.composition).toLowerCase().includes(q) : false;
      return nameMatch || catMatch || compMatch;
    });
  }, [inventory, searchQuery]);

  const [newItem, setNewItem] = useState({ 
    name: '', 
    category: 'Medicine', 
    stock: 0, 
    unit: 'Tablets', 
    min_stock_level: 10,
    mrp: 0,
    selling_price: 0,
    purchase_price: 0,
    tax_percentage: getDefaultGstRateForCategory('Medicine'),
    hsn_code: '',
    rack_number: '',
    batch_number: '',
    expiry_date: '',
    composition: '',
    is_loose_sale_enabled: false,
    units_per_strip: 10,
    loose_selling_price: 0,
    loose_stock: 0,
  });
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [purchaseItem, setPurchaseItem] = useState<any>(null);

  // Billing History Filters
  const [historyStartDate, setHistoryStartDate] = useState<string>('');
  const [historyEndDate, setHistoryEndDate] = useState<string>('');
  const [historyPaymentModeFilter, setHistoryPaymentModeFilter] = useState<string>('all');
  const [historySearchQuery, setHistorySearchQuery] = useState<string>('');

  // Medicine Return Modal
  const [isMedicineReturnOpen, setIsMedicineReturnOpen] = useState(false);
  const [selectedBillForReturn, setSelectedBillForReturn] = useState<any>(null);
  const [returnItemsMap, setReturnItemsMap] = useState<Record<string, number>>({});
  const [returnReason, setReturnReason] = useState<string>('Patient Refund / Return');

  // Purchase Return Modal
  const [isPurchaseReturnOpen, setIsPurchaseReturnOpen] = useState(false);
  const [purchaseReturnItem, setPurchaseReturnItem] = useState<any>(null);
  const [purchaseReturnQty, setPurchaseReturnQty] = useState<number>(1);
  const [purchaseReturnVendor, setPurchaseReturnVendor] = useState<string>('');
  const [purchaseReturnReason, setPurchaseReturnReason] = useState<string>('Supplier Return / Expired');

  // Quick date helper for presets
  const handleSetHistoryDatePreset = (preset: 'today' | 'this_week' | 'this_month' | 'all') => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    if (preset === 'all') {
      setHistoryStartDate('');
      setHistoryEndDate('');
    } else if (preset === 'today') {
      setHistoryStartDate(todayStr);
      setHistoryEndDate(todayStr);
    } else if (preset === 'this_week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
      const monday = new Date(now.setDate(diff));
      const mondayStr = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
      setHistoryStartDate(mondayStr);
      setHistoryEndDate(todayStr);
    } else if (preset === 'this_month') {
      const monthStartStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
      setHistoryStartDate(monthStartStr);
      setHistoryEndDate(todayStr);
    }
  };

  const filteredPharmacyBills = useMemo(() => {
    if (!Array.isArray(bills)) return [];
    const filtered = bills.filter(bill => {
      if (!bill) return false;

      // Search query filter
      if (historySearchQuery.trim()) {
        const q = historySearchQuery.toLowerCase().trim();
        const invNo = String(bill.invoice_number || bill.invoiceNo || bill.invoice_no || bill.id || '').toLowerCase();
        const patName = String(bill.patient_name || bill.patientName || '').toLowerCase();
        const patPhone = String(bill.patient_phone || bill.phone || '').toLowerCase();
        if (!invNo.includes(q) && !patName.includes(q) && !patPhone.includes(q)) {
          return false;
        }
      }

      // Payment mode filter
      if (historyPaymentModeFilter !== 'all') {
        const mode = String(bill.payment_method || bill.payment_mode || bill.paymentMethod || bill.paymentMode || 'Cash').toLowerCase();
        const target = historyPaymentModeFilter.toLowerCase();
        if (target === 'upi') {
          if (!mode.includes('upi') && !mode.includes('qr')) return false;
        } else if (target === 'card') {
          if (!mode.includes('card') && !mode.includes('debit') && !mode.includes('credit')) return false;
        } else if (target === 'bank') {
          if (!mode.includes('bank') && !mode.includes('transfer') && !mode.includes('neft')) return false;
        } else if (target === 'cheque') {
          if (!mode.includes('cheque') && !mode.includes('dd')) return false;
        } else if (target === 'credit') {
          if (!mode.includes('credit') && !mode.includes('due') && !mode.includes('unpaid')) return false;
        } else if (!mode.includes(target)) {
          return false;
        }
      }

      // Date range filter using robust clean date strings
      if (historyStartDate || historyEndDate) {
        const billDateRaw = bill.created_at || bill.date || bill.created_date || bill.invoice_date || bill.createdAt;
        const cleanBillDate = getCleanDateString(billDateRaw);
        
        if (!cleanBillDate) {
          return false;
        }
        if (historyStartDate && cleanBillDate < historyStartDate) {
          return false;
        }
        if (historyEndDate && cleanBillDate > historyEndDate) {
          return false;
        }
      }

      return true;
    });

    return sortInvoicesByLatestSerial(filtered, pharmacyInvoiceMap);
  }, [bills, historySearchQuery, historyPaymentModeFilter, historyStartDate, historyEndDate, pharmacyInvoiceMap]);

  const historyFilteredTotal = useMemo(() => {
    return filteredPharmacyBills.reduce((sum, b) => {
      const amt = Number(b.totalAmount ?? b.total_amount ?? b.payable_amount ?? b.payableAmount ?? 0);
      return sum + (isNaN(amt) ? 0 : amt);
    }, 0);
  }, [filteredPharmacyBills]);

  const handleProcessMedicineReturn = async () => {
    if (!selectedBillForReturn) return;
    const itemsToReturn = Object.entries(returnItemsMap).filter(([_, qty]) => Number(qty) > 0);
    if (itemsToReturn.length === 0) {
      toast.error('Please enter quantity to return for at least one item');
      return;
    }

    let totalRefund = 0;
    const billItems = selectedBillForReturn.invoice_items || selectedBillForReturn.items || [];
    
    for (const [itemId, returnQty] of itemsToReturn) {
      const item = billItems.find((i: any) => (i.id || i.item_id || i.item_name) === itemId || i.item_name === itemId);
      const price = item ? Number(item.unit_price || item.price || 0) : 0;
      totalRefund += Number(returnQty) * price;

      // Restore stock in inventory
      const invItem = inventory.find(i => i.id === itemId || i.name === (item?.item_name || itemId));
      if (invItem) {
        await supabaseService.updatePharmacyItem(invItem.id, {
          stock: invItem.stock + returnQty
        }).catch(() => null);
      }
    }

    const updatedTotal = Math.max(0, (selectedBillForReturn.total_amount || 0) - totalRefund);
    await supabaseService.updateInvoice(selectedBillForReturn.id, {
      total_amount: updatedTotal,
      status: totalRefund > 0 ? 'Returned / Refunded' : selectedBillForReturn.status,
      remarks: `Medicine Return: ₹${totalRefund.toFixed(2)} refunded (${returnReason})`
    }).catch(() => null);

    toast.success(`Medicine Return processed! ₹${totalRefund.toFixed(2)} refunded and inventory stock restored.`);
    setIsMedicineReturnOpen(false);
    setSelectedBillForReturn(null);
    setReturnItemsMap({});
    fetchData();
  };

  const handleProcessPurchaseReturn = async () => {
    if (!purchaseReturnItem) {
      toast.error('Please select an item for purchase return');
      return;
    }
    if (purchaseReturnQty <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }
    if (purchaseReturnQty > purchaseReturnItem.stock) {
      toast.error(`Cannot return more than current stock (${purchaseReturnItem.stock})`);
      return;
    }

    const newStock = Math.max(0, purchaseReturnItem.stock - purchaseReturnQty);
    const result = await supabaseService.updatePharmacyItem(purchaseReturnItem.id, {
      stock: newStock,
      updated_at: new Date().toISOString()
    });

    if (result) {
      await supabaseService.logInventoryTransaction({
        item_id: purchaseReturnItem.id,
        transaction_type: 'PURCHASE_RETURN',
        quantity: -purchaseReturnQty,
        unit_price: purchaseReturnItem.purchase_price || 0,
        total_price: -(purchaseReturnQty * (purchaseReturnItem.purchase_price || 0)),
        reference_id: `RETURN-SUP-${purchaseReturnVendor || 'Vendor'}`,
        performed_by: currentUser?.id
      }).catch(() => null);

      toast.success(`Purchase Return successful! ${purchaseReturnQty} units returned to supplier and stock updated.`);
      setIsPurchaseReturnOpen(false);
      setPurchaseReturnItem(null);
      setPurchaseReturnQty(1);
      setPurchaseReturnVendor('');
      fetchData();
    } else {
      toast.error('Failed to process purchase return');
    }
  };

  const handleAddItem = async () => {
    if (!newItem.name) {
      toast.error('Please enter item name');
      return;
    }
    const itemToAdd = {
      name: newItem.name,
      category: newItem.category,
      unit: newItem.unit,
      hsn_code: newItem.hsn_code,
      rack_number: newItem.rack_number,
      batch_number: newItem.batch_number,
      expiry_date: newItem.expiry_date || null,
      stock: Number(newItem.stock),
      mrp: Number(newItem.mrp),
      selling_price: Number(newItem.selling_price),
      purchase_price: Number(newItem.purchase_price),
      tax_percentage: Number(newItem.tax_percentage),
      min_stock_level: Number(newItem.min_stock_level),
      composition: newItem.composition,
      is_loose_sale_enabled: newItem.is_loose_sale_enabled,
      units_per_strip: Number(newItem.units_per_strip || 10),
      loose_selling_price: Number(newItem.loose_selling_price || 0),
      loose_stock: Number(newItem.loose_stock || 0)
    };
    
    const result = await supabaseService.createPharmacyItem(itemToAdd);
    if (result) {
      toast.success('New item added to inventory');
      fetchData();
      setNewItem({ 
        name: '', 
        category: 'Medicine', 
        stock: 0, 
        unit: 'Tablets', 
        min_stock_level: 10,
        mrp: 0,
        selling_price: 0,
        purchase_price: 0,
        tax_percentage: getDefaultGstRateForCategory('Medicine'),
        hsn_code: '',
        rack_number: '',
        batch_number: '',
        expiry_date: '',
        composition: '',
        is_loose_sale_enabled: false,
        units_per_strip: 10,
        loose_selling_price: 0,
        loose_stock: 0,
      });
    } else {
      toast.error('Failed to add item');
    }
  };

  const handleDeleteItem = async (id: string) => {
    const item = inventory.find(i => i.id === id);
    if (item && !canUserModifyRecord(item, currentUser)) {
      toast.error("Access Denied: This inventory item was created by an Admin and cannot be deleted by non-admin users.");
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently delete "${item?.name || 'this item'}" from inventory?`)) {
      return;
    }
    const success = await supabaseService.deletePharmacyItem(id);
    if (success) {
      setInventory(inventory.filter(item => item.id !== id));
      toast.success('Item removed from inventory');
    } else {
      toast.error('Failed to delete item');
    }
  };

  const printPharmacyInvoice = (bill: any) => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      toast.error('Please allow popups to print invoice');
      return;
    }

    const patient = patients.find(p => p.id === bill.patient_id);
    const patientDetails = {
      name: bill.patientName || bill.patient_name || patient?.name || 'Walk-in Customer',
      phone: bill.patientPhone || bill.patient_phone || patient?.phone || 'N/A',
      address: patient?.address || 'N/A',
      gstin: patient?.gst_no || 'N/A'
    };

    const invoiceHtml = generatePharmacyInvoiceHtml(bill, inventory, patientDetails, pharmacySettings);
    printWindow.document.write(invoiceHtml);
    printWindow.document.close();
  };

  const downloadPharmacyInvoice = (bill: any) => {
    const patient = patients.find(p => p.id === bill.patient_id);
    const patientDetails = {
      name: bill.patientName || bill.patient_name || patient?.name || 'Walk-in Customer',
      phone: bill.patientPhone || bill.patient_phone || patient?.phone || 'N/A',
      address: patient?.address || 'N/A',
      gstin: patient?.gst_no || 'N/A'
    };

    const invoiceHtml = generatePharmacyInvoiceHtml(bill, inventory, patientDetails, pharmacySettings);
    
    // Create blob and download as HTML file
    const blob = new Blob([invoiceHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const invNo = bill.invoiceNo || bill.invoice_no || bill.id;
    link.download = `Pharmacy_Invoice_${invNo}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success(`Pharmacy Invoice ${invNo} downloaded as HTML! (Open it to Print/Save as PDF)`);
  };

  const handleExportInventory = () => {
    const headers = ['Name', 'Category', 'Stock', 'Unit', 'Min Level', 'Expiry Date'];
    const rows = inventory.map((item: any) => [
      item.name,
      item.category,
      item.stock,
      item.unit,
      item.min_stock_level,
      item.expiry_date || 'N/A'
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'pharmacy_inventory.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Inventory exported as CSV');
  };

  if (loading && inventory.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-medical-blue" />
        <span className="ml-2 font-medium">Loading Pharmacy...</span>
      </div>
    );
  }

  const lowStockCount = inventory.filter(i => i.stock < (i.min_stock_level || 10)).length;
  const expiringSoonCount = inventory.filter(i => {
    if (!i.expiry_date) return false;
    const expiry = new Date(i.expiry_date);
    const today = new Date();
    const monthsDiff = (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30);
    return monthsDiff >= 0 && monthsDiff < 3;
  }).length;
  const totalInvValue = inventory.reduce((acc, i) => acc + (i.stock * (i.purchase_price || 0)), 0);

  return (
    <div className="p-6 space-y-6">
      {/* Dynamic, Vibrant, Richly Colored Banner Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600 text-white p-6 sm:p-8 shadow-xl shadow-orange-100 animate-in fade-in duration-500">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-rose-400/20 blur-3xl pointer-events-none"></div>
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-[10px] font-black tracking-widest bg-white/20 text-white px-3 py-1 rounded-full uppercase my-1 select-none w-fit">
              ★ PHARMACY DEPOT ONLINE
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl text-white">
              Pharmacy & Inventory
            </h1>
            <p className="text-orange-50 text-sm font-medium max-w-xl">
              Real-time stock level analysis, drug formulation indices, expiry tracking alerts, and loose tablet POS sales tracking.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 shadow-inner">
            <Link to="/pharmacy/pos">
              <Button className="bg-white text-orange-950 hover:bg-orange-50 gap-2 rounded-xl font-black h-10 shadow-md">
                <ShoppingCart className="w-4 h-4 text-orange-600" />
                POS Sell Terminal
              </Button>
            </Link>
            <PharmacyExcelUploader 
              onImportSuccess={(newItems) => {
                setInventory(newItems);
                fetchData();
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 shadow-md"
            />
            <Button variant="outline" className="gap-2 bg-white/10 text-white border-white/20 hover:bg-white hover:text-orange-900 rounded-xl font-bold h-10" onClick={handleExportInventory}>
              <Download className="w-4 h-4" />
              Export Stock
            </Button>
            {!isAccountant && (
              <Button 
                variant="outline" 
                className="gap-2 bg-white/10 text-white border-white/20 hover:bg-white hover:text-orange-900 rounded-xl font-bold h-10" 
                onClick={() => setIsPurchaseOpen(true)}
              >
                <History className="w-4 h-4" />
                Purchase Stock
              </Button>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isPurchaseOpen} onOpenChange={(open) => {
        setIsPurchaseOpen(open);
        if (!open) {
          setPurchaseItem(null);
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Purchase New Stock</DialogTitle>
                <DialogDescription>Record a new purchase from a supplier.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                <div className="space-y-2">
                  <Label>Medicine / Item</Label>
                  <Select 
                    value={purchaseItem?.id || ''}
                    onValueChange={(val) => {
                      const item = inventory.find(i => String(i.id).toLowerCase() === String(val).toLowerCase());
                      if (item) {
                        setPurchaseItem(item);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select item">
                        {purchaseItem ? purchaseItem.name : "Select item"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {inventory.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {purchaseItem && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Quantity to Add</Label>
                        <Input 
                          type="number" 
                          id="purchase-qty"
                          placeholder="0" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>New Purchase Price (₹)</Label>
                        <Input 
                          type="number" 
                          id="purchase-price"
                          defaultValue={purchaseItem.purchase_price}
                          placeholder="0.00" 
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>New MRP (₹)</Label>
                        <Input 
                          type="number" 
                          id="purchase-mrp"
                          defaultValue={purchaseItem.mrp}
                          placeholder="0.00" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>New Selling Price (₹)</Label>
                        <Input 
                          type="number" 
                          id="purchase-sp"
                          defaultValue={purchaseItem.selling_price}
                          placeholder="0.00" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Batch Number</Label>
                      <Input id="purchase-batch" placeholder="Enter batch number" defaultValue={purchaseItem.batch_number} />
                    </div>
                    <div className="space-y-2">
                      <Label>Expiry Date</Label>
                      <Input type="date" id="purchase-expiry" defaultValue={purchaseItem.expiry_date} />
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label>Supplier Name</Label>
                  <Input placeholder="Enter supplier name" id="purchase-supplier" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setIsPurchaseOpen(false);
                  setPurchaseItem(null);
                }}>Cancel</Button>
                <Button className="bg-medical-blue" onClick={async () => {
                  if (!purchaseItem) {
                    toast.error('Please select an item');
                    return;
                  }
                  
                  const qtyToAdd = Number((document.getElementById('purchase-qty') as HTMLInputElement)?.value || 0);
                  const newPP = Number((document.getElementById('purchase-price') as HTMLInputElement)?.value || purchaseItem.purchase_price);
                  const newMRP = Number((document.getElementById('purchase-mrp') as HTMLInputElement)?.value || purchaseItem.mrp);
                  const newSP = Number((document.getElementById('purchase-sp') as HTMLInputElement)?.value || purchaseItem.selling_price);
                  const newBatch = (document.getElementById('purchase-batch') as HTMLInputElement)?.value || purchaseItem.batch_number;
                  const newExpiry = (document.getElementById('purchase-expiry') as HTMLInputElement)?.value || purchaseItem.expiry_date;
                  const supplier = (document.getElementById('purchase-supplier') as HTMLInputElement)?.value || 'N/A';

                  const updates = {
                    stock: purchaseItem.stock + qtyToAdd,
                    purchase_price: newPP,
                    mrp: newMRP,
                    selling_price: newSP,
                    batch_number: newBatch,
                    expiry_date: newExpiry,
                    updated_at: new Date().toISOString()
                  };

                  const result = await supabaseService.updatePharmacyItem(purchaseItem.id, updates);
                  
                  if (result) {
                    // Log the transaction
                    await supabaseService.logInventoryTransaction({
                      item_id: purchaseItem.id,
                      transaction_type: 'PURCHASE',
                      quantity: qtyToAdd,
                      unit_price: newPP,
                      total_price: qtyToAdd * newPP,
                      reference_id: `SUP-${supplier}`,
                      performed_by: currentUser?.id
                    });

                    toast.success('Stock purchase recorded and inventory updated');
                    fetchData();
                    setIsPurchaseOpen(false);
                    setPurchaseItem(null);
                  } else {
                    toast.error('Failed to update stock');
                  }
                }}>Record Purchase</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddStockOpen} onOpenChange={setIsAddStockOpen}>
            {!isAccountant && (
              <DialogTrigger asChild>
                <Button className="bg-medical-blue gap-2">
                  <Plus className="w-4 h-4" />
                  Add New Stock
                </Button>
              </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Medicine/Item</DialogTitle>
                <DialogDescription>Add a new item to the pharmacy inventory.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Item Name</Label>
                    <Input 
                      placeholder="e.g. Ibuprofen 400mg" 
                      value={newItem.name}
                      onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select 
                      value={newItem.category}
                      onValueChange={(v) => {
                        const autoGst = getDefaultGstRateForCategory(v);
                        setNewItem({
                          ...newItem, 
                          category: v as any,
                          tax_percentage: autoGst
                        });
                        toast.info(`Auto-fetched GST rate: ${autoGst}% for category ${v}`);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Medicine">Medicines & Pharmaceuticals (Standard 12%)</SelectItem>
                        <SelectItem value="Surgical">Surgical & Disposables (12%)</SelectItem>
                        <SelectItem value="Consumable">Hospital Consumables (18%)</SelectItem>
                        <SelectItem value="Diagnostic">Diagnostic Kits & Reagents (12%)</SelectItem>
                        <SelectItem value="Equipment">Medical Hardware & Equipment (18%)</SelectItem>
                        <SelectItem value="Cosmetic">Aesthetic & Cosmetics (28%)</SelectItem>
                        <SelectItem value="Exempt">Zero-Rated / Life-Saving Exempt (0%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Input 
                      placeholder="e.g. Tablets, Bottles" 
                      value={newItem.unit}
                      onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Initial Stock</Label>
                    <Input 
                      type="number" 
                      placeholder="0" 
                      value={newItem.stock}
                      onChange={(e) => setNewItem({...newItem, stock: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Min Stock Level</Label>
                    <Input 
                      type="number" 
                      placeholder="10" 
                      value={newItem.min_stock_level}
                      onChange={(e) => setNewItem({...newItem, min_stock_level: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rack No.</Label>
                    <Input 
                      placeholder="A-1" 
                      value={newItem.rack_number}
                      onChange={(e) => setNewItem({...newItem, rack_number: e.target.value})}
                    />
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Purchase Price (₹)</Label>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      value={newItem.purchase_price}
                      onChange={(e) => setNewItem({...newItem, purchase_price: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>MRP (₹)</Label>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      value={newItem.mrp}
                      onChange={(e) => setNewItem({...newItem, mrp: Number(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Selling Price (₹)</Label>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      value={newItem.selling_price}
                      onChange={(e) => setNewItem({...newItem, selling_price: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Tax Percentage (%)</Label>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5 text-amber-500" /> Auto: GST {newItem.tax_percentage}%
                      </span>
                    </div>
                    <Select 
                      value={newItem.tax_percentage.toString()}
                      onValueChange={(v) => setNewItem({...newItem, tax_percentage: Number(v)})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Tax" />
                      </SelectTrigger>
                      <SelectContent>
                        {getActiveTaxSlabs().filter(s => s.isActive).map((s) => (
                          <SelectItem key={s.id} value={s.rate.toString()}>
                            {s.name} ({s.rate}%)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>HSN Code</Label>
                    <Input 
                      placeholder="HSN" 
                      value={newItem.hsn_code}
                      onChange={(e) => setNewItem({...newItem, hsn_code: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Batch Number</Label>
                    <Input 
                      placeholder="Batch" 
                      value={newItem.batch_number}
                      onChange={(e) => setNewItem({...newItem, batch_number: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Expiry Date</Label>
                  <Input 
                    type="date" 
                    value={newItem.expiry_date}
                    onChange={(e) => setNewItem({...newItem, expiry_date: e.target.value})}
                  />
                </div>

                <div className="space-y-4 pt-2 border-t border-dashed col-span-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Salt Composition & Loose Sale Setup</h4>
                  <div className="space-y-2">
                    <Label>Chemical Composition / Salt Formula</Label>
                    <Input 
                      placeholder="e.g. Amoxicillin + Clavulanic Acid" 
                      value={newItem.composition}
                      onChange={(e) => setNewItem({...newItem, composition: e.target.value})}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50/50 border border-orange-100 mt-2">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold text-slate-800 cursor-pointer" htmlFor="loose-sale-checkbox">Enable Loose Sale</Label>
                      <p className="text-[10px] text-muted-foreground">Allows selling pills or capsules individually</p>
                    </div>
                    <input 
                      id="loose-sale-checkbox"
                      type="checkbox" 
                      className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
                      checked={newItem.is_loose_sale_enabled}
                      onChange={(e) => setNewItem({...newItem, is_loose_sale_enabled: e.target.checked})}
                    />
                  </div>

                  {newItem.is_loose_sale_enabled && (
                    <div className="grid grid-cols-3 gap-3 pt-2">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold">Units per Strip</Label>
                        <Input 
                          type="number" 
                          placeholder="10" 
                          value={newItem.units_per_strip}
                          onChange={(e) => setNewItem({...newItem, units_per_strip: Number(e.target.value)})}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold">Loose Price (₹)</Label>
                        <Input 
                          type="number" 
                          placeholder="12.00" 
                          value={newItem.loose_selling_price}
                          onChange={(e) => setNewItem({...newItem, loose_selling_price: Number(e.target.value)})}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold">Loose Stock</Label>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          value={newItem.loose_stock}
                          onChange={(e) => setNewItem({...newItem, loose_stock: Number(e.target.value)})}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <DialogTrigger asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogTrigger>
                <Button className="bg-medical-blue" onClick={() => {
                  handleAddItem();
                  setIsAddStockOpen(false);
                }}>Add Item</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

      <Tabs defaultValue={isAccountant ? "billing" : "inventory"} className="w-full" onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100 p-1">
          {!isAccountant && <TabsTrigger value="inventory">Inventory</TabsTrigger>}
          <TabsTrigger value="billing">Pharmacy Billing</TabsTrigger>
          {!isAccountant && (
            <TabsTrigger value="alerts" className="relative flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Non-Availability Alerts
              {shortageAlerts.filter((a: any) => a.status !== 'Procured').length > 0 && (
                <Badge className="bg-amber-600 text-white text-[9px] px-1.5 py-0 rounded-full font-bold ml-1">
                  {shortageAlerts.filter((a: any) => a.status !== 'Procured').length}
                </Badge>
              )}
            </TabsTrigger>
          )}
          {!isAccountant && (
            <TabsTrigger value="settings" className="flex gap-2 items-center">
              <Settings className="w-4 h-4" />
              Pharmacy Settings
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="inventory" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Inventory Items</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <h3 className="text-3xl font-bold">{inventory.length}</h3>
                <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                  <Package className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Low Stock Alerts</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <h3 className="text-3xl font-bold text-amber-600">
                  {lowStockCount}
                </h3>
                <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Expiring Soon (30 Days)</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <h3 className="text-3xl font-bold text-rose-600">{expiringSoonCount}</h3>
                <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
                  <Calendar className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg">Medicine Inventory</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search medicine..." 
                    className="pl-10 bg-slate-50 border-none h-9" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <PharmacyExcelUploader 
                  variant="compact"
                  buttonText="Upload Excel"
                  onImportSuccess={(newItems) => {
                    setInventory(newItems);
                    fetchData();
                  }}
                />
                <Button 
                  variant="outline" 
                  className="border-amber-300 text-amber-800 hover:bg-amber-50 h-9 gap-2 font-bold"
                  onClick={() => {
                    setIsPurchaseReturnOpen(true);
                    setPurchaseReturnItem(inventory[0] || null);
                  }}
                >
                  <RotateCcw className="w-4 h-4 text-amber-600" />
                  Purchase Return
                </Button>
                <Link to="/pharmacy/pos">
                  <Button className="bg-teal-accent hover:bg-teal-600 h-9 gap-2">
                    <ShoppingCart className="w-4 h-4" />
                    New Sale (POS)
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto custom-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-slate-100">
                      <TableHead className="whitespace-nowrap">Medicine Name</TableHead>
                      <TableHead className="whitespace-nowrap">Category</TableHead>
                      <TableHead className="whitespace-nowrap">MRP / Selling</TableHead>
                      <TableHead className="whitespace-nowrap">Stock</TableHead>
                      <TableHead className="whitespace-nowrap">Expiry Date</TableHead>
                      <TableHead className="whitespace-nowrap">Status</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventory.map((item) => (
                      <TableRow key={item.id} className="border-slate-50">
                        <TableCell className="font-medium whitespace-nowrap">
                          <div>
                            <p>{item.name}</p>
                            <p className="text-[10px] text-muted-foreground">Rack: {item.rack_number || 'N/A'} | Batch: {item.batch_number || 'N/A'}</p>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant="outline" className="text-[10px] font-bold uppercase">{item.category}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground line-through">MRP: {formatCurrency(item.mrp || 0)}</span>
                            <span className="font-bold text-medical-blue">SP: {formatCurrency(item.selling_price || 0)}</span>
                            <span className="text-[10px] text-emerald-600">Tax: {item.tax_percentage || 0}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-bold">{item.stock} {item.unit}</span>
                            {item.is_loose_sale_enabled && (
                              <span className="text-[10px] font-semibold text-amber-600">
                                + {item.loose_stock || 0} Loose Units ({ (item.stock * (item.units_per_strip || 10)) + (item.loose_stock || 0) } total)
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground">Min Level: {item.min_stock_level || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {item.expiry_date ? formatDate(item.expiry_date) : 'N/A'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant="secondary" className={`border-none ${
                            item.stock > (item.min_stock_level || 0) ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                          }`}>
                            {item.stock > (item.min_stock_level || 0) ? 'In Stock' : 'Low Stock'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Dialog open={editingItem?.id === item.id} onOpenChange={(open) => setEditingItem(open ? item : null)}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-medical-blue gap-1 h-8">
                                Manage
                                <ArrowRight className="w-3 h-3" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Manage Stock: {item.name}</DialogTitle>
                                <DialogDescription>Update stock levels or edit item details.</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>Current Stock</Label>
                                    <Input 
                                      type="number" 
                                      id={`stock-${item.id}`}
                                      defaultValue={item.stock} 
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Min Stock Level</Label>
                                    <Input 
                                      type="number" 
                                      id={`min-stock-${item.id}`}
                                      defaultValue={item.min_stock_level}
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>MRP (₹)</Label>
                                    <Input 
                                      type="number" 
                                      id={`mrp-${item.id}`}
                                      defaultValue={item.mrp}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Selling Price (₹)</Label>
                                    <Input 
                                      type="number" 
                                      id={`selling-price-${item.id}`}
                                      defaultValue={item.selling_price}
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>Batch Number</Label>
                                    <Input 
                                      id={`batch-${item.id}`}
                                      defaultValue={item.batch_number}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Tax (%)</Label>
                                    <Input 
                                      type="number"
                                      id={`tax-${item.id}`}
                                      defaultValue={item.tax_percentage}
                                    />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label>Expiry Date</Label>
                                  <Input 
                                    type="date" 
                                    id={`expiry-${item.id}`}
                                    defaultValue={item.expiry_date} 
                                  />
                                </div>

                                <div className="space-y-4 pt-4 border-t border-dashed col-span-2">
                                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loose Sale Setup</h4>
                                  <div className="space-y-2">
                                    <Label>Composition / Salt Formula</Label>
                                    <Input 
                                      id={`composition-${item.id}`}
                                      defaultValue={item.composition || ''}
                                      placeholder="e.g. Amoxicillin + Clavulanic Acid"
                                    />
                                  </div>
                                  <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50/50 border border-orange-100 mt-2">
                                    <div className="space-y-0.5">
                                      <Label className="text-sm font-bold text-slate-800 cursor-pointer" htmlFor={`loose-enabled-${item.id}`}>Enable Loose Sale</Label>
                                      <p className="text-[10px] text-muted-foreground">Allows selling pills or capsules individually</p>
                                    </div>
                                    <input 
                                      id={`loose-enabled-${item.id}`}
                                      type="checkbox" 
                                      className="uncontrolled-loose-checkbox w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
                                      defaultChecked={item.is_loose_sale_enabled || false}
                                      onChange={(e) => {
                                        const subDiv = document.getElementById(`loose-sub-fields-${item.id}`);
                                        if (subDiv) subDiv.style.display = e.target.checked ? 'grid' : 'none';
                                      }}
                                    />
                                  </div>

                                  <div 
                                    id={`loose-sub-fields-${item.id}`}
                                    className="grid grid-cols-3 gap-3 pt-2"
                                    style={{ display: item.is_loose_sale_enabled ? 'grid' : 'none' }}
                                  >
                                    <div className="space-y-1">
                                      <Label className="text-xs font-semibold">Units/Strip</Label>
                                      <Input 
                                        type="number" 
                                        id={`units-per-strip-${item.id}`}
                                        defaultValue={item.units_per_strip || 10}
                                        placeholder="10"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs font-semibold">Loose Price (₹)</Label>
                                      <Input 
                                        type="number" 
                                        id={`loose-price-${item.id}`}
                                        defaultValue={item.loose_selling_price || 0}
                                        placeholder="12.00"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs font-semibold">Loose Stock</Label>
                                      <Input 
                                        type="number" 
                                        id={`loose-stock-${item.id}`}
                                        defaultValue={item.loose_stock || 0}
                                        placeholder="0"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <DialogFooter className="flex justify-between sm:justify-between">
                                {!isAccountant && (
                                  <Button 
                                    variant="ghost" 
                                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                    onClick={() => {
                                      handleDeleteItem(item.id);
                                      setEditingItem(null);
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Item
                                  </Button>
                                )}
                                <div className="flex gap-2">
                                  <Button variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
                                {!isAccountant && (
                                  <Button className="bg-medical-blue" onClick={async () => {
                                    const stock = Number((document.getElementById(`stock-${item.id}`) as HTMLInputElement)?.value);
                                    const min_stock_level = Number((document.getElementById(`min-stock-${item.id}`) as HTMLInputElement)?.value);
                                    const mrp = Number((document.getElementById(`mrp-${item.id}`) as HTMLInputElement)?.value);
                                    const selling_price = Number((document.getElementById(`selling-price-${item.id}`) as HTMLInputElement)?.value);
                                    const batch_number = (document.getElementById(`batch-${item.id}`) as HTMLInputElement)?.value;
                                    const tax_percentage = Number((document.getElementById(`tax-${item.id}`) as HTMLInputElement)?.value);
                                    const expiry_date = (document.getElementById(`expiry-${item.id}`) as HTMLInputElement)?.value;
                                    const composition = (document.getElementById(`composition-${item.id}`) as HTMLInputElement)?.value;
                                    const is_loose_sale_enabled = (document.getElementById(`loose-enabled-${item.id}`) as HTMLInputElement)?.checked;
                                    const units_per_strip = Number((document.getElementById(`units-per-strip-${item.id}`) as HTMLInputElement)?.value || 10);
                                    const loose_selling_price = Number((document.getElementById(`loose-price-${item.id}`) as HTMLInputElement)?.value || 0);
                                    const loose_stock = Number((document.getElementById(`loose-stock-${item.id}`) as HTMLInputElement)?.value || 0);

                                    const updates = {
                                      stock,
                                      min_stock_level,
                                      mrp,
                                      selling_price,
                                      batch_number,
                                      tax_percentage,
                                      expiry_date,
                                      composition,
                                      is_loose_sale_enabled,
                                      units_per_strip,
                                      loose_selling_price,
                                      loose_stock
                                    };

                                    const result = await supabaseService.updatePharmacyItem(item.id, updates);
                                    if (result) {
                                      toast.success('Stock updated successfully');
                                      fetchData();
                                      setEditingItem(null);
                                    } else {
                                      toast.error('Failed to update stock');
                                    }
                                  }}>Update Stock</Button>
                                )}
                                </div>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="mt-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-col gap-4 pb-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">Pharmacy Billing History</CardTitle>
                  <CardDescription>View, filter, edit, return medicines, print, or clear pharmacy-specific invoices.</CardDescription>
                </div>
                {bills.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleClearAllPharmacyBills}
                    className="h-9 text-xs font-bold border-rose-200 text-rose-700 hover:bg-rose-50 gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    Clear Old Pharmacy Bills
                  </Button>
                )}
              </div>

              {/* Date, Payment Mode & Search Filter Bar */}
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-200/60">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-emerald-600" />
                      Quick Presets:
                    </span>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className={`h-6 px-2 text-[11px] rounded-lg font-bold ${
                        !historyStartDate && !historyEndDate 
                          ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700' 
                          : 'bg-white text-slate-700 hover:bg-slate-100'
                      }`}
                      onClick={() => handleSetHistoryDatePreset('all')}
                    >
                      All Dates
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className="h-6 px-2 text-[11px] rounded-lg font-bold bg-white text-slate-700 hover:bg-slate-100"
                      onClick={() => handleSetHistoryDatePreset('today')}
                    >
                      Today
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className="h-6 px-2 text-[11px] rounded-lg font-bold bg-white text-slate-700 hover:bg-slate-100"
                      onClick={() => handleSetHistoryDatePreset('this_week')}
                    >
                      This Week
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className="h-6 px-2 text-[11px] rounded-lg font-bold bg-white text-slate-700 hover:bg-slate-100"
                      onClick={() => handleSetHistoryDatePreset('this_month')}
                    >
                      This Month
                    </Button>
                  </div>

                  {(historyStartDate || historyEndDate || historyPaymentModeFilter !== 'all' || historySearchQuery) && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2 text-[11px] font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      onClick={() => {
                        setHistoryStartDate('');
                        setHistoryEndDate('');
                        setHistoryPaymentModeFilter('all');
                        setHistorySearchQuery('');
                      }}
                    >
                      Clear All Filters
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">Start Date</label>
                    <Input 
                      type="date" 
                      value={historyStartDate}
                      onChange={(e) => setHistoryStartDate(e.target.value)}
                      className="h-9 bg-white text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">End Date</label>
                    <Input 
                      type="date" 
                      value={historyEndDate}
                      onChange={(e) => setHistoryEndDate(e.target.value)}
                      className="h-9 bg-white text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">Payment Mode Filter</label>
                    <Select value={historyPaymentModeFilter} onValueChange={setHistoryPaymentModeFilter}>
                      <SelectTrigger className="h-9 bg-white text-xs font-bold">
                        <SelectValue placeholder="All Payment Modes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Modes</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Card">Card</SelectItem>
                        <SelectItem value="UPI">UPI / QR</SelectItem>
                        <SelectItem value="Credit">Credit</SelectItem>
                        <SelectItem value="Bank">Bank Transfer</SelectItem>
                        <SelectItem value="Cheque">Cheque / DD</SelectItem>
                        <SelectItem value="Multi-Mode">Multi-Mode</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">Search Invoice / Patient</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input 
                        placeholder="Invoice # or Patient..." 
                        value={historySearchQuery}
                        onChange={(e) => setHistorySearchQuery(e.target.value)}
                        className="pl-9 bg-white h-9 text-xs font-bold" 
                      />
                    </div>
                  </div>
                </div>

                {/* Filter Summary Banner showing Total Amount */}
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-2 text-emerald-950">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-600 text-white font-bold text-[10px] px-2 py-0.5">Filter Summary</Badge>
                    <span className="text-xs font-bold">
                      Showing <span className="font-extrabold text-emerald-800">{filteredPharmacyBills.length}</span> bill(s)
                      {(historyStartDate || historyEndDate || historyPaymentModeFilter !== 'all' || historySearchQuery) && ' matching applied filters'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-black">
                    <span className="text-xs uppercase text-slate-600 tracking-wider">Total Bill Amount:</span>
                    <span className="text-lg text-emerald-700 bg-white px-3 py-1 rounded-lg border border-emerald-200 shadow-sm">
                      {formatCurrency(historyFilteredTotal)}
                    </span>
                    {(historyStartDate || historyEndDate || historyPaymentModeFilter !== 'all' || historySearchQuery) && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 ml-2"
                        onClick={() => {
                          setHistoryStartDate('');
                          setHistoryEndDate('');
                          setHistoryPaymentModeFilter('all');
                          setHistorySearchQuery('');
                        }}
                      >
                        Reset Filters
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto custom-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-slate-100">
                      <TableHead className="whitespace-nowrap">Invoice ID</TableHead>
                      <TableHead className="whitespace-nowrap">Patient</TableHead>
                      <TableHead className="whitespace-nowrap">Date</TableHead>
                      <TableHead className="whitespace-nowrap">Payment Mode</TableHead>
                      <TableHead className="whitespace-nowrap">Amount</TableHead>
                      <TableHead className="whitespace-nowrap">Status</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPharmacyBills.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                          <p className="font-semibold text-sm">No pharmacy bills found matching selected filters.</p>
                          <p className="text-xs text-slate-400 mt-1">Try adjusting the date range or payment mode filter.</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPharmacyBills.map((bill) => {
                        const patient = patients.find(p => p.id === bill.patient_id);
                        const billDate = bill.created_at || bill.date || bill.created_date || bill.invoice_date || new Date().toISOString();
                        const billAmt = Number(bill.totalAmount ?? bill.total_amount ?? bill.payable_amount ?? bill.payableAmount ?? 0);
                        const paymentMethod = bill.payment_method || bill.payment_mode || 'Cash';

                        return (
                          <TableRow key={bill.id} className="border-slate-50 hover:bg-slate-50/50">
                            <TableCell className="font-medium text-medical-blue whitespace-nowrap">
                              <div className="flex flex-col gap-1 items-start">
                                <span>#{pharmacyInvoiceMap[bill.id] || bill.invoice_no || bill.invoiceNo || bill.id.slice(0, 16).toUpperCase()}</span>
                                {(bill.is_edited || bill.tpa_approval_status === 'Edited') && (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0 bg-amber-50 text-amber-700 border-amber-200 font-bold select-none">
                                    Edited
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <div>
                                <p className="font-medium text-sm">
                                  {bill.patient_name || patient?.name || 'Walk-in Customer'}
                                </p>
                                {bill.patient_phone && <p className="text-[10px] text-muted-foreground">Ph: {bill.patient_phone}</p>}
                                {bill.prescribing_doctor && <p className="text-[10px] text-medical-blue italic">Dr: {bill.prescribing_doctor}</p>}
                                {!bill.patient_phone && patient?.mrn && <p className="text-xs text-muted-foreground">{patient.mrn}</p>}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-medium">
                              {formatDate(billDate)}
                            </TableCell>
                            <TableCell className="text-xs font-bold text-slate-700 whitespace-nowrap">
                              {(() => {
                                const mode = String(paymentMethod || 'Cash');
                                const modeLower = mode.toLowerCase();
                                let badgeColor = 'bg-slate-50 text-slate-700 border-slate-200';
                                if (modeLower.includes('cash')) badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                                else if (modeLower.includes('upi') || modeLower.includes('qr')) badgeColor = 'bg-sky-50 text-sky-800 border-sky-200';
                                else if (modeLower.includes('card')) badgeColor = 'bg-indigo-50 text-indigo-800 border-indigo-200';
                                else if (modeLower.includes('bank') || modeLower.includes('neft')) badgeColor = 'bg-blue-50 text-blue-800 border-blue-200';
                                else if (modeLower.includes('cheque') || modeLower.includes('dd')) badgeColor = 'bg-violet-50 text-violet-800 border-violet-200';
                                else if (modeLower.includes('multi')) badgeColor = 'bg-purple-50 text-purple-800 border-purple-200';
                                else if (modeLower.includes('credit')) badgeColor = 'bg-amber-50 text-amber-800 border-amber-200';

                                return (
                                  <Badge variant="outline" className={`font-bold text-[11px] ${badgeColor}`}>
                                    {mode}
                                  </Badge>
                                );
                              })()}
                            </TableCell>
                            <TableCell className="font-extrabold text-slate-900 whitespace-nowrap">
                              {formatCurrency(billAmt)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Badge variant="secondary" className={`${bill.status?.includes('Return') ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-100'} font-bold`}>
                                {bill.status || 'Paid'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              <div className="flex justify-end gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-[11px] font-bold border-amber-300 text-amber-800 hover:bg-amber-50 gap-1"
                                  title="Return Medicine from this Bill"
                                  onClick={() => {
                                    setSelectedBillForReturn(bill);
                                    setReturnItemsMap({});
                                    setIsMedicineReturnOpen(true);
                                  }}
                                >
                                  Return
                                </Button>
                                {!isAccountant && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-medical-blue hover:bg-blue-50" 
                                    title="Edit Pharmacy Bill"
                                    onClick={() => {
                                      setEditingBillInner({
                                        ...bill,
                                        patient_name: bill.patient_name || patient?.name || 'Walk-in Customer',
                                        patient_phone: bill.patient_phone || patient?.phone || ''
                                      });
                                      setIsEditBillOpen(true);
                                    }}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:bg-slate-100" onClick={() => printPharmacyInvoice(bill)} title="Print Invoice">
                                  <Printer className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:bg-slate-100" onClick={() => downloadPharmacyInvoice(bill)} title="Download Invoice">
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50" 
                                  onClick={() => handleDeletePharmacyBill(bill.id)} 
                                  title="Delete Pharmacy Bill"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6 mt-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Pharmacy & Billing Settings</CardTitle>
              <CardDescription>
                Configure pharmacy headers, GST details, bank accounts, UPI codes, and terms for invoices.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Brand & Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-emerald-600 uppercase tracking-wider">Brand Information</h3>
                  <div className="space-y-2">
                    <Label htmlFor="pharmacy-name">Pharmacy Professional Name</Label>
                    <Input 
                      id="pharmacy-name" 
                      value={pharmacySettings.pharmacyName}
                      onChange={(e) => setPharmacySettings({ ...pharmacySettings, pharmacyName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pharmacy-tagline">Dynamic Tagline / Promotion</Label>
                    <Input 
                      id="pharmacy-tagline" 
                      value={pharmacySettings.tagline}
                      onChange={(e) => setPharmacySettings({ ...pharmacySettings, tagline: e.target.value })}
                      placeholder="e.g. A single stop for all your Healthcare needs!"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="logo-url">Pharmacy Logo URL</Label>
                      <span className="text-[10px] text-muted-foreground">Upload image or enter web link</span>
                    </div>
                    <div className="flex gap-2">
                      <Input 
                        id="logo-url" 
                        value={pharmacySettings.logoUrl}
                        onChange={(e) => setPharmacySettings({ ...pharmacySettings, logoUrl: e.target.value })}
                        placeholder="https://..."
                      />
                      <div className="relative">
                        <Button variant="outline" className="cursor-pointer relative overflow-hidden" asChild nativeButton={false}>
                          <label className="text-xs">
                            Upload
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 1024 * 1024) {
                                    toast.error('Logo file size must be under 1MB.');
                                    return;
                                  }
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setPharmacySettings({ ...pharmacySettings, logoUrl: reader.result as string });
                                    toast.success('Logo uploaded successfully!');
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }} 
                            />
                          </label>
                        </Button>
                      </div>
                    </div>
                    {pharmacySettings?.logoUrl && (
                      <div className="mt-2 p-2 border border-dashed rounded flex justify-between items-center bg-slate-50">
                        <img src={pharmacySettings.logoUrl} className="max-h-12 max-w-[120px] object-contain rounded" alt="Preview" />
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-500 h-8 hover:text-red-600 hover:bg-red-50 text-xs"
                          onClick={() => setPharmacySettings({ ...pharmacySettings, logoUrl: '' })}
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pharmacy-phone">Support Contacts (Phone)</Label>
                    <Input 
                      id="pharmacy-phone" 
                      value={pharmacySettings?.phone || ''}
                      onChange={(e) => setPharmacySettings({ ...pharmacySettings, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pharmacy-address">Retail Location (Address)</Label>
                    <Input 
                      id="pharmacy-address" 
                      value={pharmacySettings?.address || ''}
                      onChange={(e) => setPharmacySettings({ ...pharmacySettings, address: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pharmacy-gstin">Enterprise Tax Reference (GSTIN)</Label>
                    <Input 
                      id="pharmacy-gstin" 
                      value={pharmacySettings?.gstin || ''}
                      onChange={(e) => setPharmacySettings({ ...pharmacySettings, gstin: e.target.value })}
                    />
                  </div>
                </div>

                {/* Bank / Payment config */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-emerald-600 uppercase tracking-wider">Acquirer & Bank Accounts</h3>
                  <div className="space-y-2">
                    <Label htmlFor="bank-name">Financial Institution (Bank Name)</Label>
                    <Input 
                      id="bank-name" 
                      value={pharmacySettings?.bankName || ''}
                      onChange={(e) => setPharmacySettings({ ...pharmacySettings, bankName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank-branch">Branch Location</Label>
                    <Input 
                      id="bank-branch" 
                      value={pharmacySettings?.bankBranch || ''}
                      onChange={(e) => setPharmacySettings({ ...pharmacySettings, bankBranch: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank-acc">Deposit Account Number</Label>
                    <Input 
                      id="bank-acc" 
                      value={pharmacySettings?.bankAccNo || ''}
                      onChange={(e) => setPharmacySettings({ ...pharmacySettings, bankAccNo: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank-ifsc">Routing Code (IFSC)</Label>
                    <Input 
                      id="bank-ifsc" 
                      value={pharmacySettings?.bankIfsc || ''}
                      onChange={(e) => setPharmacySettings({ ...pharmacySettings, bankIfsc: e.target.value })}
                      className="font-mono uppercase"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="upi-id">UPI Virtual Address (UPI ID)</Label>
                    <Input 
                      id="upi-id" 
                      value={pharmacySettings?.upiId || ''}
                      onChange={(e) => setPharmacySettings({ ...pharmacySettings, upiId: e.target.value })}
                      placeholder="e.g. name@bank"
                      className="font-mono"
                    />
                  </div>
                </div>
              </div>

              <Separator className="my-4 bg-slate-100" />

              {/* Terms and Footers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="terms-conditions">Terms & Conditions (One per line)</Label>
                    <span className="text-[10px] text-muted-foreground font-mono">Use line breaks</span>
                  </div>
                  <textarea 
                    id="terms-conditions" 
                    className="w-full h-32 border border-slate-200 rounded-md p-3 text-xs focus:ring-1 focus:ring-medical-blue focus:outline-none"
                    value={
                      Array.isArray(pharmacySettings?.termsAndConditions)
                        ? pharmacySettings.termsAndConditions.join('\n')
                        : (typeof pharmacySettings?.termsAndConditions === 'string'
                            ? pharmacySettings.termsAndConditions
                            : (DEFAULT_PHARMACY_SETTINGS.termsAndConditions || []).join('\n'))
                    }
                    onChange={(e) => {
                      const list = e.target.value.split('\n').filter(line => line.trim() !== '');
                      setPharmacySettings({ ...pharmacySettings, termsAndConditions: list });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice-footer">Document Footer Slogan</Label>
                  <textarea 
                    id="invoice-footer" 
                    className="w-full h-32 border border-slate-200 rounded-md p-3 text-xs focus:ring-1 focus:ring-medical-blue focus:outline-none"
                    value={pharmacySettings?.additionalFooter || ''}
                    onChange={(e) => setPharmacySettings({ ...pharmacySettings, additionalFooter: e.target.value })}
                    placeholder="e.g. Thanks for your order!"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={async () => {
                    const confirmReset = window.confirm("Are you sure you want to reset to default Medicare Wholesale Pharmacy settings?");
                    if (confirmReset) {
                      setPharmacySettings(DEFAULT_PHARMACY_SETTINGS);
                      storage.set('hms_pharmacy_settings', DEFAULT_PHARMACY_SETTINGS);
                      if (supabaseService.updatePharmacySettings) {
                        await supabaseService.updatePharmacySettings(DEFAULT_PHARMACY_SETTINGS);
                      }
                      toast.success('Reset to defaults successfully');
                    }
                  }}
                >
                  Reset Defaults
                </Button>
                <Button 
                  className="bg-medical-blue text-white hover:bg-medical-blue/90"
                  onClick={async () => {
                    storage.set('hms_pharmacy_settings', pharmacySettings);
                    if (supabaseService.updatePharmacySettings) {
                      await supabaseService.updatePharmacySettings(pharmacySettings);
                    }
                    toast.success('Pharmacy settings saved successfully!');
                  }}
                >
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6 mt-6">
          <Card className="border-amber-200 bg-amber-50/30">
            <CardHeader className="bg-amber-900 text-white rounded-t-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-300" />
                  <div>
                    <CardTitle className="text-base font-bold">Doctor Prescription Non-Availability Alerts</CardTitle>
                    <CardDescription className="text-amber-100 text-xs">
                      Automatically recorded when doctors prescribe medicines that are out of stock in Pharmacy Store
                    </CardDescription>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="bg-amber-800 text-white border-amber-600 hover:bg-amber-700 text-xs"
                  onClick={() => {
                    setShortageAlerts(storage.get('hms_pharmacy_shortage_alerts', []));
                    toast.info('Refreshed non-availability alerts');
                  }}
                >
                  Refresh Alerts
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {shortageAlerts.length > 0 ? (
                <div className="space-y-3">
                  {shortageAlerts.map((alert: any, idx: number) => (
                    <div key={alert.id || idx} className="p-4 bg-white border border-amber-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-sm">{alert.medicineName}</span>
                          <Badge className={alert.status === 'Procured' ? 'bg-emerald-600 text-white text-[10px]' : 'bg-rose-600 text-white text-[10px]'}>
                            {alert.status || 'Out of Stock Alert'}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600">
                          Prescribed for patient <strong>{alert.patientName}</strong> (MRN: {alert.mrn}) by <strong>{alert.doctorName}</strong>
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Alert recorded at: {new Date(alert.requestedAt).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {alert.status !== 'Procured' ? (
                          <Button 
                            size="sm" 
                            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold"
                            onClick={() => {
                              const updated = shortageAlerts.map((a: any) => a.id === alert.id ? { ...a, status: 'Procured', resolvedAt: new Date().toISOString() } : a);
                              setShortageAlerts(updated);
                              storage.set('hms_pharmacy_shortage_alerts', updated);
                              toast.success(`Marked "${alert.medicineName}" as Procured / Stock Restocked`);
                            }}
                          >
                            Mark Stock Restocked
                          </Button>
                        ) : (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                            ✓ Resolved & Restocked
                          </span>
                        )}
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-rose-500 hover:bg-rose-50 h-8 w-8 p-0"
                          onClick={() => {
                            const updated = shortageAlerts.filter((a: any) => a.id !== alert.id);
                            setShortageAlerts(updated);
                            storage.set('hms_pharmacy_shortage_alerts', updated);
                            toast.success('Alert dismissed');
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                  <AlertTriangle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-700">No Non-Availability Alerts</p>
                  <p className="text-xs text-slate-400">When doctors write prescriptions for out-of-stock items, alerts will appear here automatically.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Pharmacy Bill Dialog */}
      <Dialog open={isEditBillOpen} onOpenChange={setIsEditBillOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Pharmacy Bill #{editingBillInner?.id.slice(0, 8).toUpperCase()}</DialogTitle>
            <DialogDescription>
              Modify customer details and total amount. This action will label the bill as Edited.
            </DialogDescription>
          </DialogHeader>
          {editingBillInner && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-bill-name">Patient/Customer Name</Label>
                <Input
                  id="edit-bill-name"
                  value={editingBillInner.patient_name || ''}
                  onChange={(e) => setEditingBillInner({ ...editingBillInner, patient_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-bill-phone">Customer Phone (Optional)</Label>
                <Input
                  id="edit-bill-phone"
                  value={editingBillInner.patient_phone || ''}
                  onChange={(e) => setEditingBillInner({ ...editingBillInner, patient_phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-bill-doctor">Prescribing Doctor</Label>
                <Input
                  id="edit-bill-doctor"
                  value={editingBillInner.prescribing_doctor || ''}
                  onChange={(e) => setEditingBillInner({ ...editingBillInner, prescribing_doctor: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-bill-amount">Total Bill Amount</Label>
                <Input
                  id="edit-bill-amount"
                  type="number"
                  value={editingBillInner.totalAmount ?? editingBillInner.total_amount ?? 0}
                  onChange={(e) => setEditingBillInner({ 
                    ...editingBillInner, 
                    totalAmount: Number(e.target.value),
                    total_amount: Number(e.target.value),
                    paidAmount: Number(e.target.value),
                    paid_amount: Number(e.target.value)
                  })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditBillOpen(false);
              setEditingBillInner(null);
            }}>
              Cancel
            </Button>
            <Button className="bg-medical-blue text-white" onClick={handleSaveEditBillInner}>
              Save and Mark Edited
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Medicine Return (OPD, IPD, Emergency, Corporate Patients) Dialog */}
      <Dialog open={isMedicineReturnOpen} onOpenChange={setIsMedicineReturnOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <RotateCcw className="w-5 h-5 text-amber-600" />
              Patient Medicine Return (OPD / IPD / Emergency)
            </DialogTitle>
            <DialogDescription>
              Return prescribed/sold medicines for patient refund and automatically restore stock back to pharmacy inventory.
            </DialogDescription>
          </DialogHeader>

          {selectedBillForReturn && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-700">Patient: </span>
                  <span className="font-black text-slate-900">{selectedBillForReturn.patient_name || selectedBillForReturn.patientName || 'Walk-in / Patient'}</span>
                  {selectedBillForReturn.patient_phone && <span className="text-slate-500 ml-2">({selectedBillForReturn.patient_phone})</span>}
                </div>
                <div>
                  <span className="font-bold text-slate-700">Bill #: </span>
                  <span className="font-mono text-medical-blue font-bold">#{pharmacyInvoiceMap[selectedBillForReturn.id] || selectedBillForReturn.invoice_no || selectedBillForReturn.id.slice(0, 8)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Select Items & Return Quantity</Label>
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="text-xs">Item Name</TableHead>
                        <TableHead className="text-xs text-center">Billed Qty</TableHead>
                        <TableHead className="text-xs text-right">Price</TableHead>
                        <TableHead className="text-xs text-right w-28">Return Qty</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(selectedBillForReturn.invoice_items || selectedBillForReturn.items || []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-xs text-slate-400 py-4">
                            No individual items recorded for this invoice.
                          </TableCell>
                        </TableRow>
                      ) : (
                        (selectedBillForReturn.invoice_items || selectedBillForReturn.items || []).map((item: any, idx: number) => {
                          const key = item.id || item.item_id || item.item_name || `item-${idx}`;
                          const maxQty = Number(item.quantity || item.qty || 1);
                          const unitPrice = Number(item.unit_price || item.price || 0);
                          const currentReturnQty = returnItemsMap[key] || 0;

                          return (
                            <TableRow key={key} className="text-xs">
                              <TableCell className="font-semibold text-slate-800">
                                {item.item_name || item.name || 'Medicine'}
                              </TableCell>
                              <TableCell className="text-center font-bold">
                                {maxQty}
                              </TableCell>
                              <TableCell className="text-right font-bold text-slate-700">
                                {formatCurrency(unitPrice)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  min="0"
                                  max={maxQty}
                                  value={currentReturnQty}
                                  onChange={(e) => {
                                    const val = Math.min(maxQty, Math.max(0, Number(e.target.value)));
                                    setReturnItemsMap({ ...returnItemsMap, [key]: val });
                                  }}
                                  className="h-7 w-20 text-right ml-auto font-bold text-amber-800 border-amber-300 focus:ring-amber-500"
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="return-reason" className="text-xs font-bold">Return Reason</Label>
                <Select value={returnReason} onValueChange={setReturnReason}>
                  <SelectTrigger id="return-reason" className="h-9 text-xs">
                    <SelectValue placeholder="Select Return Reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Patient Discharge / Refund">Patient Discharge / Refund</SelectItem>
                    <SelectItem value="Excess Prescribed">Excess Prescribed Medicine</SelectItem>
                    <SelectItem value="Expired / Damaged">Expired / Damaged Product</SelectItem>
                    <SelectItem value="Wrong Medicine Dispensed">Wrong Medicine Dispensed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Total Refund Banner */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex justify-between items-center text-xs">
                <span className="font-bold text-amber-900">Calculated Refund Amount:</span>
                <span className="text-base font-black text-amber-800">
                  {formatCurrency(
                    Object.entries(returnItemsMap).reduce((sum, [itemId, qty]) => {
                      const billItems = selectedBillForReturn.invoice_items || selectedBillForReturn.items || [];
                      const item = billItems.find((i: any) => (i.id || i.item_id || i.item_name) === itemId || i.item_name === itemId);
                      const price = item ? Number(item.unit_price || item.price || 0) : 0;
                      return sum + (Number(qty) * price);
                    }, 0)
                  )}
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMedicineReturnOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white font-bold" onClick={handleProcessMedicineReturn}>
              Confirm Medicine Return & Restock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Purchase Return (Vendor Return) Dialog */}
      <Dialog open={isPurchaseReturnOpen} onOpenChange={setIsPurchaseReturnOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <RotateCcw className="w-5 h-5 text-amber-600" />
              Purchase Return to Vendor / Supplier
            </DialogTitle>
            <DialogDescription>
              Return unsold or damaged stock back to supplier and deduct stock from inventory.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold">Select Medicine</Label>
              <Select 
                value={purchaseReturnItem?.id || ''} 
                onValueChange={(id) => {
                  const item = inventory.find(i => i.id === id);
                  setPurchaseReturnItem(item);
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Choose medicine to return..." />
                </SelectTrigger>
                <SelectContent>
                  {inventory.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} (In Stock: {item.stock})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {purchaseReturnItem && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                <p><span className="font-bold text-slate-600">Current Stock:</span> <span className="font-extrabold text-slate-900">{purchaseReturnItem.stock}</span> {purchaseReturnItem.unit}</p>
                <p><span className="font-bold text-slate-600">Batch #:</span> {purchaseReturnItem.batch_number || 'N/A'} | <span className="font-bold text-slate-600">Expiry:</span> {purchaseReturnItem.expiry_date || 'N/A'}</p>
                <p><span className="font-bold text-slate-600">Purchase Price:</span> {formatCurrency(purchaseReturnItem.purchase_price || 0)}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-bold">Vendor / Supplier Name</Label>
              <Input 
                placeholder="e.g. Apex Pharma Distributors" 
                value={purchaseReturnVendor}
                onChange={(e) => setPurchaseReturnVendor(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">Return Quantity</Label>
              <Input 
                type="number"
                min="1"
                max={purchaseReturnItem?.stock || 1}
                value={purchaseReturnQty}
                onChange={(e) => setPurchaseReturnQty(Number(e.target.value))}
                className="h-9 text-xs font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">Reason for Return</Label>
              <Select value={purchaseReturnReason} onValueChange={setPurchaseReturnReason}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Supplier Return / Expired">Supplier Return / Expired Stock</SelectItem>
                  <SelectItem value="Damaged Shipment">Damaged Shipment</SelectItem>
                  <SelectItem value="Overstock / Batch Recall">Overstock / Batch Recall</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {purchaseReturnItem && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex justify-between items-center text-xs font-bold text-amber-900">
                <span>Total Return Value:</span>
                <span className="text-base font-black text-amber-800">
                  {formatCurrency(purchaseReturnQty * (purchaseReturnItem.purchase_price || 0))}
                </span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPurchaseReturnOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white font-bold" onClick={handleProcessPurchaseReturn}>
              Execute Purchase Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
