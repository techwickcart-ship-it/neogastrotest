import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount)
}

export function formatDate(date: string | Date | null | undefined) {
  if (!date) return 'N/A';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return 'N/A';
  }
}

export function getAppointmentTimestamp(dateVal: any, timeVal: any): number {
  let dateStr = '';
  if (dateVal) {
    if (typeof dateVal === 'string') {
      dateStr = dateVal.split('T')[0];
    } else if (dateVal instanceof Date) {
      dateStr = dateVal.toISOString().split('T')[0];
    } else {
      dateStr = new Date(dateVal).toISOString().split('T')[0];
    }
  } else {
    dateStr = '1970-01-01';
  }

  let timeStr = typeof timeVal === 'string' ? timeVal : '12:00 AM';
  let hours = 12;
  let minutes = 0;

  // Attempt to parse standard 12-hour AM/PM format (e.g. "10:30 AM")
  const match12h = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (match12h) {
    hours = parseInt(match12h[1], 10);
    minutes = parseInt(match12h[2], 10);
    const ampm = match12h[3].toUpperCase();
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
  } else {
    // Attempt to parse 24-hour format (e.g. "14:30")
    const match24h = timeStr.match(/(\d+):(\d+)/);
    if (match24h) {
      hours = parseInt(match24h[1], 10);
      minutes = parseInt(match24h[2], 10);
    }
  }

  const dt = new Date(dateStr);
  dt.setHours(hours, minutes, 0, 0);
  return dt.getTime();
}

export function generateSequentialInvoiceNumber(prefix: string = 'INV', serialIndex: number = 1): string {
  const seqStr = String(serialIndex).padStart(4, '0');
  return `${prefix}-${seqStr}`;
}

export function getCleanDateString(raw: any): string {
  if (!raw) return '';
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    // YYYY-MM-DD (e.g. 2026-08-16 or 2026-08-16T10:00:00Z)
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.slice(0, 10);
    }
    // DD-MM-YYYY or DD/MM/YYYY (e.g. 16-08-2026 or 16/08/2026)
    const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      return `${year}-${month}-${day}`;
    }
    // YYYY/MM/DD
    const ymdSlash = trimmed.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
    if (ymdSlash) {
      const year = ymdSlash[1];
      const month = ymdSlash[2].padStart(2, '0');
      const day = ymdSlash[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    if (trimmed.includes('T')) return trimmed.split('T')[0];
    if (trimmed.includes(' ')) {
      const first = trimmed.split(' ')[0];
      if (/^\d{4}-\d{2}-\d{2}/.test(first)) return first;
    }
  }
  try {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (e) {}
  return '';
}

export function generateDateWiseInvoiceNumber(prefix: string = 'INV', _dateInput?: string | Date, serialIndex: number = 1): string {
  return generateSequentialInvoiceNumber(prefix, serialIndex);
}

export function getBillDepartmentAndType(bill: any): { prefix: string; billingType: string; departmentName: string } {
  if (!bill) return { prefix: 'INV', billingType: 'Hospital Services', departmentName: 'General' };
  
  const items = bill.items || bill.invoice_items || [];
  let labCount = 0;
  let radioCount = 0;
  let otCount = 0;
  let endoCount = 0;
  let ipdCount = 0;
  let opdCount = 0;
  let pharmCount = 0;
  let otherCount = 0;

  const labKeywords = ['lipase', 'amylase', 'thyroid', 'tsh', 't3', 't4', 'lft', 'kft', 'rft', 'cbc', 'blood', 'urine', 'stool', 'lipid', 'profile', 'electrolytes', 'glucose', 'sugar', 'hba1c', 'creatinine', 'urea', 'bilirubin', 'sgot', 'sgpt', 'culture', 'widal', 'crp', 'esr', 'platelet', 'hemoglobin', 'biopsy', 'serum', 'pathology', 'lab', 'laboratory'];
  const radioKeywords = ['x-ray', 'xray', 'usg', 'ultrasound', 'ct scan', 'ct-scan', 'mri', 'doppler', 'echocardiography', 'echo', 'radiology', 'radio', 'radiograph'];
  const endoKeywords = ['endoscopy', 'colonoscopy', 'gastroscopy', 'sigmoidoscopy', 'ercp', 'evl', 'banding', 'polypectomy', 'biopsy forceps', 'clip', 'sclerotherapy', 'fibroscan', 'endo'];
  const otKeywords = ['ot', 'surgery', 'surgeon', 'theatre', 'laparoscopy', 'appendectomy', 'cholecystectomy', 'operative', 'procedure', 'hernia', 'caesar', 'cesarean'];
  const ipdKeywords = ['ipd', 'ward', 'bed', 'icu', 'nursing', 'inpatient', 'admission', 'deluxe', 'general ward', 'private room'];
  const opdKeywords = ['opd', 'consultation', 'consult', 'doctor fee', 'registration', 'review', 'clinic', 'outpatient', 'general medicine'];
  const pharmKeywords = ['pharmacy', 'pharm', 'tablet', 'capsule', 'syrup', 'injection', 'strip', 'ointment', 'suspension', 'drops', 'paracetamol', 'amoxicillin', 'pantoprazole', 'cefixime', 'azithromycin', 'omeprazole', 'metformin'];

  if (Array.isArray(items) && items.length > 0) {
    items.forEach((it: any) => {
      const cat = String(it.category || it.item_type || '').toLowerCase();
      const name = String(it.item_name || it.name || it.description || '').toLowerCase();

      const isLab = cat === 'lab' || cat === 'pathology' || cat === 'path' || cat === 'laboratory' || labKeywords.some(k => name.includes(k));
      const isRadio = cat === 'radio' || cat === 'radiology' || radioKeywords.some(k => name.includes(k));
      const isEndo = cat === 'endoscopy' || cat === 'endo' || endoKeywords.some(k => name.includes(k));
      const isOt = !isEndo && (cat === 'ot' || cat === 'surgery' || otKeywords.some(k => name.includes(k)));
      const isIpd = cat === 'ipd' || cat === 'ward' || ipdKeywords.some(k => name.includes(k));
      const isPharm = cat === 'pharmacy' || cat === 'pharm' || cat === 'medicine' || pharmKeywords.some(k => name.includes(k));
      const isOpd = cat === 'opd' || opdKeywords.some(k => name.includes(k));

      if (isEndo) endoCount++;
      else if (isLab) labCount++;
      else if (isRadio) radioCount++;
      else if (isOt) otCount++;
      else if (isIpd) ipdCount++;
      else if (isPharm) pharmCount++;
      else if (isOpd) opdCount++;
      else otherCount++;
    });
  }

  // Determine prefix and billing type from item content
  if (endoCount > 0) {
    return { prefix: 'ENDO', billingType: 'Endoscopy & Colonoscopy Suite', departmentName: 'Endoscopy' };
  }
  if (labCount > 0 && pharmCount === 0) {
    if (opdCount > 0) {
      return { prefix: 'LAB', billingType: 'Pathology & Diagnostic Services', departmentName: 'Pathology / Lab' };
    }
    return { prefix: 'LAB', billingType: 'Pathology / Laboratory Investigation', departmentName: 'Pathology / Lab' };
  }
  if (radioCount > 0 && pharmCount === 0) {
    return { prefix: 'RADIO', billingType: 'Radiology & Imaging Services', departmentName: 'Radiology' };
  }
  if (otCount > 0) {
    return { prefix: 'OT', billingType: 'Operation Theatre & Surgical Care', departmentName: 'Surgery / OT' };
  }
  if (ipdCount > 0) {
    return { prefix: 'IPD', billingType: 'IPD / Inpatient Services', departmentName: 'IPD / Ward' };
  }
  if (pharmCount > 0 && labCount === 0 && radioCount === 0 && otCount === 0) {
    return { prefix: 'PHARM', billingType: 'Pharmacy / Dispensary', departmentName: 'Pharmacy' };
  }
  if (opdCount > 0 && pharmCount === 0) {
    return { prefix: 'OPD', billingType: 'OPD Consultation & Clinical Services', departmentName: 'OPD' };
  }

  // Fallback to explicit type / department fields
  const type = String(bill.type || bill.invoice_type || bill.department || '').toUpperCase();
  const num = String(bill.invoice_number || bill.invoiceNumber || bill.invoice_no || bill.invoiceNo || '').toUpperCase();

  if (type === 'ENDOSCOPY' || type === 'ENDO' || num.startsWith('ENDO') || num.startsWith('INV-ENDO')) {
    return { prefix: 'ENDO', billingType: 'Endoscopy & Colonoscopy Suite', departmentName: 'Endoscopy' };
  }
  if (type === 'LAB' || type === 'PATHOLOGY' || type === 'PATH' || num.startsWith('LAB') || num.startsWith('INV-LAB')) {
    return { prefix: 'LAB', billingType: 'Pathology / Laboratory Investigation', departmentName: 'Pathology / Lab' };
  }
  if (type === 'RADIO' || type === 'RADIOLOGY' || num.startsWith('RADIO') || num.startsWith('INV-RADIO')) {
    return { prefix: 'RADIO', billingType: 'Radiology & Imaging Services', departmentName: 'Radiology' };
  }
  if (type === 'OT' || type === 'SURGERY' || num.startsWith('OT') || num.startsWith('INV-OT')) {
    return { prefix: 'OT', billingType: 'Operation Theatre & Surgical Care', departmentName: 'Surgery / OT' };
  }
  if (type === 'IPD' || num.startsWith('IPD') || num.startsWith('INV-IPD')) {
    return { prefix: 'IPD', billingType: 'IPD / Inpatient Services', departmentName: 'IPD / Ward' };
  }
  if (type === 'OPD' || num.startsWith('OPD') || num.startsWith('INV-OPD')) {
    return { prefix: 'OPD', billingType: 'OPD Consultation & Clinical Services', departmentName: 'OPD' };
  }
  if (type === 'EMERGENCY' || type === 'CASUALTY' || num.startsWith('EMERG') || num.startsWith('INV-EMERG')) {
    return { prefix: 'EMERG', billingType: 'Emergency & Trauma Care', departmentName: 'Emergency' };
  }
  if (type === 'PHARMACY' || type === 'PHARM' || num.startsWith('PHARM') || num.startsWith('INV-PHARM')) {
    return { prefix: 'PHARM', billingType: 'Pharmacy / Dispensary', departmentName: 'Pharmacy' };
  }

  return { prefix: 'INV', billingType: 'Hospital & Clinical Services', departmentName: 'General Billing' };
}

export function getDepartmentPrefix(bill: any): string {
  return getBillDepartmentAndType(bill).prefix;
}

export function buildDepartmentWiseInvoiceMap(bills: any[], startNum: number = 1): Record<string, string> {
  const map: Record<string, string> = {};
  if (!Array.isArray(bills) || bills.length === 0) return map;

  // Filter valid bills
  const validBills = bills.filter((b) => {
    if (!b || b.isExpense || String(b.id || '').startsWith('exp') || String(b.id || '').startsWith('note-')) return false;
    return true;
  });

  // Group by department prefix
  const groups: Record<string, any[]> = {};
  validBills.forEach((b) => {
    const prefix = getDepartmentPrefix(b);
    if (!groups[prefix]) groups[prefix] = [];
    groups[prefix].push(b);
  });

  // Sort and assign serial numbers within each department
  Object.keys(groups).forEach((prefix) => {
    const sorted = [...groups[prefix]].sort((a, b) => {
      const ta = new Date(a.created_at || a.date || a.createdDate || 0).getTime();
      const tb = new Date(b.created_at || b.date || b.createdDate || 0).getTime();
      if (ta !== tb) return (isNaN(ta) ? 0 : ta) - (isNaN(tb) ? 0 : tb);
      return String(a.id || '').localeCompare(String(b.id || ''));
    });

    sorted.forEach((bill, idx) => {
      const seqNum = startNum + idx;
      const padded = String(seqNum).padStart(4, '0');
      map[bill.id] = `${prefix}-${padded}`;
    });
  });

  return map;
}

export function buildSequentialInvoiceMap(bills: any[], prefix: string = 'INV', startNum: number = 1): Record<string, string> {
  const map: Record<string, string> = {};
  if (!Array.isArray(bills) || bills.length === 0) return map;

  // Filter valid billing items
  const validBills = bills.filter((b) => {
    if (!b || b.isExpense || String(b.id || '').startsWith('exp') || String(b.id || '').startsWith('note-')) return false;
    return true;
  });

  // Sort chronologically (oldest to newest) to assign 1, 2, 3...
  const sorted = [...validBills].sort((a, b) => {
    const ta = new Date(a.created_at || a.date || a.createdDate || 0).getTime();
    const tb = new Date(b.created_at || b.date || b.createdDate || 0).getTime();
    if (ta !== tb) return (isNaN(ta) ? 0 : ta) - (isNaN(tb) ? 0 : tb);
    return String(a.id || '').localeCompare(String(b.id || ''));
  });

  sorted.forEach((bill, idx) => {
    const seqNum = startNum + idx;
    const padded = String(seqNum).padStart(4, '0');
    map[bill.id] = `${prefix}-${padded}`;
  });

  return map;
}

export function buildDateWiseInvoiceMap(bills: any[], prefix: string = 'INV'): Record<string, string> {
  return buildSequentialInvoiceMap(bills, prefix);
}



