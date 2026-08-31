import { storage, STORAGE_KEYS } from './storage';

export interface TaxSlab {
  id: string;
  name: string;
  rate: number;
  type: string; // 'GST' | 'CGST_SGST' | 'VAT' | 'Exempt' | 'Custom'
  description?: string;
  isActive: boolean;
}

export const DEFAULT_TAX_SLABS: TaxSlab[] = [
  { id: 'tax-ex', name: 'GST Zero (Exempt)', rate: 0, type: 'GST', isActive: true, description: 'Medical services and select life-saving medicines' },
  { id: 'tax-5', name: 'GST 5%', rate: 5, type: 'GST', isActive: true, description: 'Standard pharmaceutical drugs, injectables, and diagnostic test kits' },
  { id: 'tax-12', name: 'GST 12%', rate: 12, type: 'GST', isActive: true, description: 'Syringes, medical instruments, and specialised diabetic medicines' },
  { id: 'tax-18', name: 'GST 18%', rate: 18, type: 'GST', isActive: true, description: 'Capital healthcare machinery, monitors, and dental care fixtures' },
  { id: 'tax-28', name: 'GST 28%', rate: 28, type: 'GST', isActive: true, description: 'Aesthetic improvements and luxury cosmetic treatments' }
];

export const DEFAULT_CATEGORY_TAX_MAPPING: Record<string, number> = {
  'Medicine': 12,
  'Surgical': 12,
  'Consumable': 18,
  'Diagnostic': 12,
  'Equipment': 18,
  'Cosmetic': 28,
  'Exempt': 0
};

export interface HospitalTaxSettings {
  isGstEnabled: boolean;
  hospitalGstin: string;
  splitCgstSgst: boolean; // 50% CGST + 50% SGST
  defaultPharmacyRate: number;
  isClinicalServicesExempt: boolean; // OPD/IPD medical consults are 0% exempt under Indian GST
}

export const DEFAULT_HOSPITAL_TAX_SETTINGS: HospitalTaxSettings = {
  isGstEnabled: true,
  hospitalGstin: '07AAAAA0000A1Z5',
  splitCgstSgst: true,
  defaultPharmacyRate: 12,
  isClinicalServicesExempt: true
};

/**
 * Returns the currently active tax slabs from storage
 */
export function getActiveTaxSlabs(): TaxSlab[] {
  const slabs = storage.get<TaxSlab[]>(STORAGE_KEYS.TAX_SLABS, DEFAULT_TAX_SLABS);
  return Array.isArray(slabs) && slabs.length > 0 ? slabs : DEFAULT_TAX_SLABS;
}

/**
 * Returns the category-to-GST rate mapping
 */
export function getCategoryTaxMapping(): Record<string, number> {
  return storage.get<Record<string, number>>(
    STORAGE_KEYS.CATEGORY_TAX_MAPPING, 
    DEFAULT_CATEGORY_TAX_MAPPING
  );
}

/**
 * Auto-fetches the applicable GST percentage for a given medicine/pharmacy item category
 */
export function getDefaultGstRateForCategory(category: string): number {
  const mapping = getCategoryTaxMapping();
  const slabs = getActiveTaxSlabs().filter(s => s.isActive);
  const catKey = (category || '').trim();
  const catLower = catKey.toLowerCase();

  let targetRate = 12;

  if (catLower.includes('exempt') || catLower.includes('zero') || catLower.includes('life-saving')) {
    targetRate = mapping['Exempt'] ?? 0;
  } else if (catLower.includes('cosmetic') || catLower.includes('aesthetic') || catLower.includes('derma')) {
    targetRate = mapping['Cosmetic'] ?? 28;
  } else if (catLower.includes('equip') || catLower.includes('machin') || catLower.includes('device') || catLower.includes('monitor')) {
    targetRate = mapping['Equipment'] ?? 18;
  } else if (catLower.includes('consumable') || catLower.includes('sanitiz') || catLower.includes('hygiene') || catLower.includes('cotton')) {
    targetRate = mapping['Consumable'] ?? 18;
  } else if (catLower.includes('surgical') || catLower.includes('suture') || catLower.includes('implant') || catLower.includes('syringe')) {
    targetRate = mapping['Surgical'] ?? 12;
  } else if (catLower.includes('diagnostic') || catLower.includes('kit') || catLower.includes('reagent') || catLower.includes('test')) {
    targetRate = mapping['Diagnostic'] ?? 12;
  } else if (catLower.includes('med') || catLower.includes('pharma') || catLower.includes('drug') || catLower.includes('tablet')) {
    targetRate = mapping['Medicine'] ?? 12;
  } else if (mapping[catKey] !== undefined) {
    targetRate = mapping[catKey];
  }

  // Ensure targetRate corresponds to an active slab if possible
  if (slabs.length > 0) {
    const directMatch = slabs.find(s => s.rate === targetRate);
    if (directMatch) return directMatch.rate;
  }

  return targetRate;
}

export interface TaxCalculatedItem {
  name: string;
  unitPrice: number;
  quantity: number;
  taxPercentage: number;
  itemSubtotal: number; // unitPrice * quantity
  discountShare: number;
  netTaxableValue: number;
  taxAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  totalWithTax: number;
  hsnCode?: string;
}

export interface GstCalculationSummary {
  grossSubtotal: number;
  discountAmount: number;
  netTaxableAmount: number;
  taxableAmount: number; // alias
  totalTaxAmount: number;
  totalTax: number; // alias
  cgstTotal: number;
  totalCgst: number; // alias
  sgstTotal: number;
  totalSgst: number; // alias
  grandTotal: number;
  netPayable: number; // alias
  items: TaxCalculatedItem[];
  hsnSummary: Array<{
    hsnCode: string;
    taxRate: number;
    taxableValue: number;
    cgst: number;
    sgst: number;
    totalTax: number;
  }>;
}

/**
 * Standard, robust GST calculation for pharmacy cart and hospital invoices
 */
export function calculateHospitalGst(
  rawItems: Array<{
    name?: string;
    price?: number;
    unit_price?: number;
    quantity?: number;
    taxPercentage?: number;
    tax_percentage?: number;
    hsnCode?: string;
    hsn_code?: string;
  }>,
  discountPercent: number = 0,
  directDiscountAmount?: number
): GstCalculationSummary {
  const grossSubtotal = rawItems.reduce((sum, it) => {
    const p = Number(it.price ?? it.unit_price ?? 0);
    const q = Number(it.quantity ?? 1);
    return sum + (p * q);
  }, 0);

  let discountAmount = 0;
  if (directDiscountAmount !== undefined && directDiscountAmount > 0) {
    discountAmount = Math.min(grossSubtotal, directDiscountAmount);
  } else if (discountPercent > 0) {
    const cappedPercent = Math.min(100, Math.max(0, discountPercent));
    discountAmount = parseFloat(((grossSubtotal * cappedPercent) / 100).toFixed(2));
  }

  const netTaxableAmount = Math.max(0, grossSubtotal - discountAmount);

  const calculatedItems: TaxCalculatedItem[] = rawItems.map(it => {
    const unitPrice = Number(it.price ?? it.unit_price ?? 0);
    const quantity = Number(it.quantity ?? 1);
    const itemSubtotal = unitPrice * quantity;
    const taxPercentage = Number(it.taxPercentage ?? it.tax_percentage ?? 0);

    // Apportion discount proportionately across items
    const discountShare = grossSubtotal > 0 ? (itemSubtotal / grossSubtotal) * discountAmount : 0;
    const netTaxableValue = Math.max(0, itemSubtotal - discountShare);

    const taxAmount = parseFloat(((netTaxableValue * taxPercentage) / 100).toFixed(2));
    const cgstAmount = parseFloat((taxAmount / 2).toFixed(2));
    const sgstAmount = parseFloat((taxAmount - cgstAmount).toFixed(2));
    const totalWithTax = parseFloat((netTaxableValue + taxAmount).toFixed(2));

    return {
      name: it.name || 'Medical Service / Item',
      unitPrice,
      quantity,
      taxPercentage,
      itemSubtotal,
      discountShare,
      netTaxableValue,
      taxAmount,
      cgstAmount,
      sgstAmount,
      totalWithTax,
      hsnCode: it.hsnCode || it.hsn_code || '3004'
    };
  });

  const totalTaxAmount = parseFloat(
    calculatedItems.reduce((sum, it) => sum + it.taxAmount, 0).toFixed(2)
  );
  const cgstTotal = parseFloat((totalTaxAmount / 2).toFixed(2));
  const sgstTotal = parseFloat((totalTaxAmount - cgstTotal).toFixed(2));
  const grandTotal = parseFloat((netTaxableAmount + totalTaxAmount).toFixed(2));

  // Build HSN grouped breakdown
  const hsnMap: Record<string, { hsnCode: string; taxRate: number; taxableValue: number; cgst: number; sgst: number; totalTax: number }> = {};

  calculatedItems.forEach(it => {
    const key = `${it.hsnCode || '3004'}_${it.taxPercentage}`;
    if (!hsnMap[key]) {
      hsnMap[key] = {
        hsnCode: it.hsnCode || '3004',
        taxRate: it.taxPercentage,
        taxableValue: 0,
        cgst: 0,
        sgst: 0,
        totalTax: 0
      };
    }
    hsnMap[key].taxableValue += it.netTaxableValue;
    hsnMap[key].cgst += it.cgstAmount;
    hsnMap[key].sgst += it.sgstAmount;
    hsnMap[key].totalTax += it.taxAmount;
  });

  const hsnSummary = Object.values(hsnMap).map(row => ({
    hsnCode: row.hsnCode,
    taxRate: row.taxRate,
    taxableValue: parseFloat(row.taxableValue.toFixed(2)),
    cgst: parseFloat(row.cgst.toFixed(2)),
    sgst: parseFloat(row.sgst.toFixed(2)),
    totalTax: parseFloat(row.totalTax.toFixed(2))
  }));

  return {
    grossSubtotal: parseFloat(grossSubtotal.toFixed(2)),
    discountAmount: parseFloat(discountAmount.toFixed(2)),
    netTaxableAmount: parseFloat(netTaxableAmount.toFixed(2)),
    taxableAmount: parseFloat(netTaxableAmount.toFixed(2)),
    totalTaxAmount,
    totalTax: totalTaxAmount,
    cgstTotal,
    totalCgst: cgstTotal,
    sgstTotal,
    totalSgst: sgstTotal,
    grandTotal,
    netPayable: grandTotal,
    items: calculatedItems,
    hsnSummary
  };
}

/**
 * Sorts any list of invoices or bills serially by Invoice ID / date descending,
 * ensuring the latest bill is always at the top.
 */
export function sortInvoicesByLatestSerial<T = any>(
  bills: T[],
  sequentialIdMap?: Record<string, string>
): T[] {
  if (!Array.isArray(bills)) return [];

  return [...bills].sort((a: any, b: any) => {
    // 1. Check mapped serial IDs (e.g. INV-0004, PHARM-0002)
    const idA = (sequentialIdMap && a.id ? sequentialIdMap[a.id] : '') || a.invoice_number || a.invoice_no || a.invoiceNo || a.id || '';
    const idB = (sequentialIdMap && b.id ? sequentialIdMap[b.id] : '') || b.invoice_number || b.invoice_no || b.invoiceNo || b.id || '';

    // If both have serial IDs with same prefix, sort purely by serial number descending
    if (idA && idB && sequentialIdMap) {
      const cmp = idB.localeCompare(idA, undefined, { numeric: true, sensitivity: 'base' });
      if (cmp !== 0) return cmp;
    }

    const timeA = new Date(a.created_at || a.date || a.invoice_date || 0).getTime();
    const timeB = new Date(b.created_at || b.date || b.invoice_date || 0).getTime();

    // If dates differ, newest date first
    if (timeB !== timeA && !isNaN(timeA) && !isNaN(timeB)) {
      return timeB - timeA;
    }

    // Within same date or fallback, sort descending by serial invoice ID
    return idB.localeCompare(idA, undefined, { numeric: true, sensitivity: 'base' });
  });
}

