import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  Check, 
  Search, 
  Pill, 
  Layers, 
  PackagePlus, 
  CheckCircle2,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { supabaseService } from '@/services/supabaseService';

export interface MedicineImportItem {
  id?: string;
  name: string;
  category: string;
  dosage_form?: string;
  stock: number;
  unit: string;
  min_stock_level: number;
  purchase_price: number;
  price: number;
  expiry_date?: string;
  batch_no?: string;
  rack_location?: string;
  manufacturer?: string;
}

interface PharmacyExcelUploaderProps {
  onImportSuccess?: (importedItems: any[]) => void;
  variant?: 'button' | 'card' | 'compact';
  buttonText?: string;
  className?: string;
}

export default function PharmacyExcelUploader({
  onImportSuccess,
  variant = 'button',
  buttonText = 'Upload Medicines (Excel)',
  className = ''
}: PharmacyExcelUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [parsedData, setParsedData] = useState<MedicineImportItem[]>([]);
  const [fileName, setFileName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [isProcessing, setIsProcessing] = useState(false);

  // Download standard sample Excel template
  const handleDownloadTemplate = () => {
    const sampleRows = [
      {
        "Medicine Name": "Tab. Pantoprazole 40mg",
        "Category": "Gastroenterology",
        "Dosage Form": "Tablet",
        "Stock Qty": 500,
        "Unit": "strips",
        "Min Stock Alert": 50,
        "Purchase Price": 45.0,
        "MRP / Sale Price": 95.0,
        "Batch No": "PNT-2026-01",
        "Expiry Date (YYYY-MM-DD)": "2027-12-31",
        "Rack Location": "Rack A-1",
        "Manufacturer": "Alkem Laboratories"
      },
      {
        "Medicine Name": "Cap. Omeprazole 20mg",
        "Category": "Gastroenterology",
        "Dosage Form": "Capsule",
        "Stock Qty": 300,
        "Unit": "strips",
        "Min Stock Alert": 30,
        "Purchase Price": 32.0,
        "MRP / Sale Price": 68.0,
        "Batch No": "OMP-8890",
        "Expiry Date (YYYY-MM-DD)": "2027-10-15",
        "Rack Location": "Rack A-2",
        "Manufacturer": "Dr. Reddy's"
      },
      {
        "Medicine Name": "Syp. Sucralfate 100ml",
        "Category": "Syrup / Suspension",
        "Dosage Form": "Syrup",
        "Stock Qty": 120,
        "Unit": "bottle",
        "Min Stock Alert": 20,
        "Purchase Price": 85.0,
        "MRP / Sale Price": 160.0,
        "Batch No": "SUC-4421",
        "Expiry Date (YYYY-MM-DD)": "2027-08-30",
        "Rack Location": "Rack B-1",
        "Manufacturer": "Torrent Pharma"
      },
      {
        "Medicine Name": "Inj. Ondansetron 4mg IV/IM",
        "Category": "Injections",
        "Dosage Form": "Injection",
        "Stock Qty": 200,
        "Unit": "vial",
        "Min Stock Alert": 40,
        "Purchase Price": 18.0,
        "MRP / Sale Price": 42.0,
        "Batch No": "OND-9901",
        "Expiry Date (YYYY-MM-DD)": "2027-06-30",
        "Rack Location": "Rack C-3",
        "Manufacturer": "Cipla Ltd"
      },
      {
        "Medicine Name": "Tab. Paracetamol 650mg",
        "Category": "Analgesics & Antipyretics",
        "Dosage Form": "Tablet",
        "Stock Qty": 800,
        "Unit": "strips",
        "Min Stock Alert": 100,
        "Purchase Price": 15.0,
        "MRP / Sale Price": 32.0,
        "Batch No": "PCM-650A",
        "Expiry Date (YYYY-MM-DD)": "2028-02-28",
        "Rack Location": "Rack A-5",
        "Manufacturer": "Micro Labs (Dolo)"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Medicine_Inventory");

    // Auto-fit column widths
    worksheet["!cols"] = [
      { wch: 32 }, // Name
      { wch: 22 }, // Category
      { wch: 15 }, // Dosage Form
      { wch: 12 }, // Stock
      { wch: 10 }, // Unit
      { wch: 15 }, // Min Stock
      { wch: 15 }, // Purchase Price
      { wch: 16 }, // Sale Price
      { wch: 16 }, // Batch No
      { wch: 24 }, // Expiry Date
      { wch: 16 }, // Rack
      { wch: 24 }, // Manufacturer
    ];

    XLSX.writeFile(workbook, "Pharmacy_Medicine_Upload_Template.xlsx");
    toast.success("Medicine upload template downloaded!");
  };

  // Helper to parse dates from various excel representations
  const parseExcelDate = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'number') {
      // Excel serial date number
      const date = new Date(Math.round((val - (25567 + 2)) * 86400 * 1000));
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
    const str = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    const parts = str.split(/[-/.]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else if (parts[2].length === 4) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    return str;
  };

  // Handle Excel/CSV file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          toast.error("The uploaded Excel sheet contains no readable rows.");
          return;
        }

        const items: MedicineImportItem[] = [];

        rawJson.forEach((row, index) => {
          // Flexible key lookup
          const nameKey = Object.keys(row).find(k => 
            /medicine\s*name|item\s*name|drug|medicine|brand|product\s*name|name/i.test(k)
          );
          const name = nameKey ? String(row[nameKey]).trim() : '';

          if (!name) return; // Skip empty rows

          const catKey = Object.keys(row).find(k => /category|group|type\s*category|class/i.test(k));
          const category = catKey && row[catKey] ? String(row[catKey]).trim() : 'General Medicines';

          const dosageKey = Object.keys(row).find(k => /dosage|form|dosage\s*form/i.test(k));
          const dosageForm = dosageKey && row[dosageKey] ? String(row[dosageKey]).trim() : 'Tablet';

          const stockKey = Object.keys(row).find(k => /stock|qty|quantity|current\s*stock|units/i.test(k));
          const stock = stockKey ? Number(String(row[stockKey]).replace(/[^0-9.]/g, '')) || 0 : 50;

          const unitKey = Object.keys(row).find(k => /unit|pack|packing|uom/i.test(k));
          const unit = unitKey && row[unitKey] ? String(row[unitKey]).trim().toLowerCase() : 'strips';

          const minStockKey = Object.keys(row).find(k => /min\s*stock|reorder|threshold|alert/i.test(k));
          const minStock = minStockKey ? Number(String(row[minStockKey]).replace(/[^0-9.]/g, '')) || 10 : 10;

          const purchaseKey = Object.keys(row).find(k => /purchase\s*price|cost|buy|cost\s*price/i.test(k));
          const purchasePrice = purchaseKey ? Number(String(row[purchaseKey]).replace(/[^0-9.]/g, '')) || 0 : 0;

          const priceKey = Object.keys(row).find(k => /mrp|sale\s*price|selling\s*price|price|rate/i.test(k));
          const price = priceKey ? Number(String(row[priceKey]).replace(/[^0-9.]/g, '')) || (purchasePrice ? purchasePrice * 1.5 : 50) : 50;

          const batchKey = Object.keys(row).find(k => /batch|lot|batch\s*no/i.test(k));
          const batchNo = batchKey && row[batchKey] ? String(row[batchKey]).trim() : `BAT-${Date.now().toString().slice(-4)}-${index + 1}`;

          const expKey = Object.keys(row).find(k => /expiry|exp\s*date|exp/i.test(k));
          const expiryDate = expKey ? parseExcelDate(row[expKey]) : '';

          const rackKey = Object.keys(row).find(k => /rack|shelf|location|shelf\s*no/i.test(k));
          const rackLocation = rackKey && row[rackKey] ? String(row[rackKey]).trim() : 'Rack A';

          const mfgKey = Object.keys(row).find(k => /manufacturer|mfg|company|brand\s*by/i.test(k));
          const manufacturer = mfgKey && row[mfgKey] ? String(row[mfgKey]).trim() : '';

          items.push({
            id: `med-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
            name,
            category,
            dosage_form: dosageForm,
            stock,
            unit,
            min_stock_level: minStock,
            purchase_price: purchasePrice,
            price: price || purchasePrice,
            batch_no: batchNo,
            expiry_date: expiryDate,
            rack_location: rackLocation,
            manufacturer: manufacturer
          });
        });

        if (items.length === 0) {
          toast.error("Could not find any valid medicine names in the sheet. Please use the template.");
          return;
        }

        setParsedData(items);
        setIsPreviewOpen(true);
        toast.success(`Parsed ${items.length} medicine records from "${file.name}"`);
      } catch (err: any) {
        console.error("Excel parse error:", err);
        toast.error("Failed to parse Excel file: " + (err.message || "Invalid format"));
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsBinaryString(file);
  };

  // Confirm and save the medicines into the inventory state & storage
  const handleConfirmImport = async () => {
    if (parsedData.length === 0) return;
    setIsProcessing(true);

    try {
      const existingInventory = storage.get<any[]>(STORAGE_KEYS.INVENTORY, []);
      let finalInventory: any[] = [];

      if (importMode === 'replace') {
        finalInventory = parsedData;
      } else {
        // Append & Merge: update if name matches, or add if new
        const itemMap = new Map<string, any>();
        existingInventory.forEach(item => {
          itemMap.set((item.name || '').toLowerCase().trim(), item);
        });

        parsedData.forEach(newItem => {
          const key = (newItem.name || '').toLowerCase().trim();
          if (itemMap.has(key)) {
            const oldItem = itemMap.get(key);
            itemMap.set(key, {
              ...oldItem,
              ...newItem,
              id: oldItem.id || newItem.id,
              stock: (oldItem.stock || 0) + newItem.stock
            });
          } else {
            itemMap.set(key, newItem);
          }
        });

        finalInventory = Array.from(itemMap.values());
      }

      // Persist to storage
      storage.set(STORAGE_KEYS.INVENTORY, finalInventory);

      // Async batch create in Supabase if supported
      try {
        for (const item of parsedData) {
          await supabaseService.createPharmacyItem({
            name: item.name,
            category: item.category,
            dosage_form: item.dosage_form,
            stock: item.stock,
            unit: item.unit,
            min_stock_level: item.min_stock_level,
            purchase_price: item.purchase_price,
            price: item.price,
            expiry_date: item.expiry_date,
            batch_no: item.batch_no,
            rack_location: item.rack_location,
            manufacturer: item.manufacturer
          });
        }
      } catch (e) {
        console.warn('Supabase inventory sync fallback to local storage', e);
      }

      // Trigger sync event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table: 'inventory', action: 'import' } }));
      }

      if (onImportSuccess) {
        onImportSuccess(finalInventory);
      }

      toast.success(`Successfully imported ${parsedData.length} medicines into Pharmacy Inventory!`);
      setIsPreviewOpen(false);
      setParsedData([]);
    } catch (err: any) {
      console.error("Import error:", err);
      toast.error("Failed to import medicines: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredPreview = parsedData.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.batch_no && item.batch_no.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept=".xlsx, .xls, .csv" 
        className="hidden" 
      />

      {variant === 'button' && (
        <Button 
          onClick={() => fileInputRef.current?.click()} 
          className={`gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md rounded-xl ${className}`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          {buttonText}
        </Button>
      )}

      {variant === 'compact' && (
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => fileInputRef.current?.click()} 
          className={`gap-1.5 bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 font-bold text-xs rounded-lg ${className}`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
          {buttonText}
        </Button>
      )}

      {/* Preview and Import Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2 border-b bg-emerald-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                  <Pill className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-black text-slate-800">
                    Preview Medicine Excel Import
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 font-medium">
                    File: <strong className="text-emerald-700">{fileName}</strong> • Found <strong className="text-emerald-700">{parsedData.length}</strong> medicines
                  </DialogDescription>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownloadTemplate} 
                className="gap-2 text-xs border-emerald-200 text-emerald-800 hover:bg-emerald-50 font-bold"
              >
                <Download className="w-3.5 h-3.5" />
                Sample Template
              </Button>
            </div>
          </DialogHeader>

          {/* Action Bar */}
          <div className="p-4 bg-slate-50 border-b flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input 
                placeholder="Search parsed medicines..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white text-xs h-9"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border text-xs font-semibold text-slate-700">
                <span className="text-slate-500">Mode:</span>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input 
                    type="radio" 
                    name="importMode" 
                    checked={importMode === 'append'} 
                    onChange={() => setImportMode('append')} 
                    className="text-emerald-600"
                  />
                  <span>Append / Update</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer ml-2">
                  <input 
                    type="radio" 
                    name="importMode" 
                    checked={importMode === 'replace'} 
                    onChange={() => setImportMode('replace')} 
                    className="text-emerald-600"
                  />
                  <span>Replace All</span>
                </label>
              </div>
            </div>
          </div>

          {/* Table Area */}
          <ScrollArea className="flex-1 max-h-[50vh] p-4">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-100/70 hover:bg-slate-100/70">
                  <TableHead className="font-bold text-xs text-slate-700">#</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700">Medicine Name</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700">Category & Form</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700 text-right">Stock Qty</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700 text-right">Purchase (₹)</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700 text-right">MRP / Sale (₹)</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700">Batch & Exp</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700">Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPreview.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-400 font-medium">
                      No matching records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPreview.map((item, idx) => (
                    <TableRow key={item.id || idx} className="hover:bg-emerald-50/30 border-b border-slate-100">
                      <TableCell className="text-xs font-mono text-slate-500">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="font-bold text-xs text-slate-800">{item.name}</div>
                        {item.manufacturer && (
                          <div className="text-[10px] text-slate-500">{item.manufacturer}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-bold bg-slate-50 text-slate-700 border-slate-200 mr-1">
                          {item.category}
                        </Badge>
                        {item.dosage_form && (
                          <span className="text-[10px] text-slate-500 font-medium">({item.dosage_form})</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold text-xs text-emerald-700">{item.stock}</span>
                        <span className="text-[10px] text-slate-500 ml-1">{item.unit}</span>
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono text-slate-600">
                        ₹{item.purchase_price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono font-bold text-emerald-800">
                        ₹{item.price.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-mono font-bold text-slate-700">{item.batch_no || 'N/A'}</div>
                        <div className="text-[10px] text-slate-500">{item.expiry_date || 'No Expiry'}</div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 font-medium">
                        {item.rack_location || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>

          <DialogFooter className="p-4 bg-slate-50 border-t flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Ready to import <strong className="text-slate-800">{parsedData.length}</strong> items into Pharmacy inventory.
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsPreviewOpen(false)} 
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmImport} 
                disabled={isProcessing || parsedData.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
              >
                {isProcessing ? (
                  <>Importing Medicines...</>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Confirm & Save ({parsedData.length} Items)
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
