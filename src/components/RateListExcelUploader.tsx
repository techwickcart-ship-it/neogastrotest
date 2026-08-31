import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  Check, 
  Search, 
  FlaskConical, 
  Layers, 
  Tag, 
  CheckCircle2,
  Plus,
  Trash2,
  Edit2,
  X,
  Sparkles,
  RefreshCw,
  Eye,
  Radio,
  Microscope,
  Maximize2,
  Minimize2
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
import { INITIAL_PATHOLOGY_MASTER_TESTS } from '@/data/pathologyMasterRates';

export interface RateItem {
  id?: string;
  no?: string;
  code?: string;
  name: string;
  price: number;
  vial?: string;
  category?: 'Pathology' | 'Radiology' | string;
  department?: string;
  group?: string;
}

interface RateListExcelUploaderProps {
  onImportSuccess?: (importedItems: RateItem[]) => void;
  variant?: 'button' | 'card' | 'compact';
  buttonText?: string;
  className?: string;
}

export default function RateListExcelUploader({
  onImportSuccess,
  variant = 'button',
  buttonText = 'Upload Rate List (Excel)',
  className = ''
}: RateListExcelUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [parsedData, setParsedData] = useState<RateItem[]>([]);
  const [fileName, setFileName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | 'Pathology' | 'Radiology'>('all');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [defaultCategory, setDefaultCategory] = useState<'Pathology' | 'Radiology'>('Pathology');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(true);

  // Editing state for existing row
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<RateItem>({
    name: '',
    price: 0,
    vial: '',
    category: 'Pathology',
    no: ''
  });

  // Adding new test state
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [newTestData, setNewTestData] = useState<{
    no: string;
    name: string;
    price: string;
    vial: string;
    category: 'Pathology' | 'Radiology';
  }>({
    no: '',
    name: '',
    price: '',
    vial: 'SST Serum',
    category: 'Pathology'
  });

  // Helper to get color badge for vials / modalities
  const getVialBadgeColor = (vialStr: string = '') => {
    const v = vialStr.toLowerCase();
    if (v.includes('edta') || v.includes('lavender') || v.includes('purple')) {
      return 'bg-purple-100 text-purple-800 border-purple-200';
    }
    if (v.includes('sst') || v.includes('yellow') || v.includes('gel')) {
      return 'bg-amber-100 text-amber-800 border-amber-200';
    }
    if (v.includes('grey') || v.includes('gray') || v.includes('fluoride')) {
      return 'bg-slate-100 text-slate-800 border-slate-300';
    }
    if (v.includes('plain') || v.includes('red') || v.includes('clot')) {
      return 'bg-rose-100 text-rose-800 border-rose-200';
    }
    if (v.includes('blue') || v.includes('citrate')) {
      return 'bg-sky-100 text-sky-800 border-sky-200';
    }
    if (v.includes('green') || v.includes('heparin')) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    if (v.includes('x-ray') || v.includes('ct') || v.includes('mri') || v.includes('usg') || v.includes('ultrasound') || v.includes('scan') || v.includes('imaging')) {
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  // Download sample Pathology Excel template
  const handleDownloadPathologyTemplate = () => {
    const sampleRows = [
      { "NO.": "1", "TEST": "Complete Blood Count (CBC)", "AMOUNT": 350, "VAIL": "EDTA (Lavender)", "CATEGORY": "Pathology" },
      { "NO.": "2", "TEST": "Liver Function Test (LFT)", "AMOUNT": 850, "VAIL": "SST Gel (Yellow)", "CATEGORY": "Pathology" },
      { "NO.": "3", "TEST": "Kidney Function Test (KFT)", "AMOUNT": 750, "VAIL": "SST Gel (Yellow)", "CATEGORY": "Pathology" },
      { "NO.": "4", "TEST": "Fasting Blood Sugar (FBS)", "AMOUNT": 120, "VAIL": "Sodium Fluoride (Grey)", "CATEGORY": "Pathology" },
      { "NO.": "5", "TEST": "Lipid Profile Master", "AMOUNT": 650, "VAIL": "Plain Clot (Red)", "CATEGORY": "Pathology" },
      { "NO.": "6", "TEST": "Thyroid Profile (T3, T4, TSH)", "AMOUNT": 600, "VAIL": "SST Gel (Yellow)", "CATEGORY": "Pathology" },
      { "NO.": "7", "TEST": "Serum Electrolytes (Na, K, Cl)", "AMOUNT": 450, "VAIL": "Plain Clot (Red)", "CATEGORY": "Pathology" },
      { "NO.": "8", "TEST": "Urine Routine & Microscopy", "AMOUNT": 150, "VAIL": "Sterile Container", "CATEGORY": "Pathology" },
      { "NO.": "9", "TEST": "HbA1c (Glycated Hemoglobin)", "AMOUNT": 500, "VAIL": "EDTA (Lavender)", "CATEGORY": "Pathology" },
      { "NO.": "10", "TEST": "Prothrombin Time (PT / INR)", "AMOUNT": 350, "VAIL": "Sodium Citrate (Blue)", "CATEGORY": "Pathology" }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRows);
    worksheet['!cols'] = [
      { wch: 8 },  // NO.
      { wch: 38 }, // TEST
      { wch: 12 }, // AMOUNT
      { wch: 25 }, // VAIL
      { wch: 16 }  // CATEGORY
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pathology Tests");
    XLSX.writeFile(workbook, "Pathology_Rate_List_Template.xlsx");
    toast.success("Pathology tests template downloaded successfully!");
  };

  // Download sample Radiology Excel template
  const handleDownloadRadiologyTemplate = () => {
    const sampleRows = [
      { "NO.": "1", "TEST": "Chest X-Ray PA View", "AMOUNT": 400, "VAIL": "Digital X-Ray", "CATEGORY": "Radiology" },
      { "NO.": "2", "TEST": "USG Whole Abdomen & Pelvis", "AMOUNT": 1200, "VAIL": "Ultrasound Sonography", "CATEGORY": "Radiology" },
      { "NO.": "3", "TEST": "USG Upper Abdomen (Liver/Gallbladder)", "AMOUNT": 900, "VAIL": "Ultrasound Sonography", "CATEGORY": "Radiology" },
      { "NO.": "4", "TEST": "USG KUB (Kidney, Ureter, Bladder)", "AMOUNT": 850, "VAIL": "Ultrasound Sonography", "CATEGORY": "Radiology" },
      { "NO.": "5", "TEST": "NCCT Head / Brain", "AMOUNT": 2200, "VAIL": "CT Scan Multi-Slice", "CATEGORY": "Radiology" },
      { "NO.": "6", "TEST": "CECT Abdomen & Pelvis", "AMOUNT": 4500, "VAIL": "Contrast CT Scan", "CATEGORY": "Radiology" },
      { "NO.": "7", "TEST": "MRI Brain with Contrast", "AMOUNT": 6500, "VAIL": "1.5T MRI Scanner", "CATEGORY": "Radiology" },
      { "NO.": "8", "TEST": "MRI Lumbar Spine", "AMOUNT": 5500, "VAIL": "1.5T MRI Scanner", "CATEGORY": "Radiology" },
      { "NO.": "9", "TEST": "12-Lead Digital ECG", "AMOUNT": 250, "VAIL": "Cardio Electrograph", "CATEGORY": "Radiology" },
      { "NO.": "10", "TEST": "2D Echocardiography with Color Doppler", "AMOUNT": 1800, "VAIL": "Cardiac Ultrasound", "CATEGORY": "Radiology" }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRows);
    worksheet['!cols'] = [
      { wch: 8 },  // NO.
      { wch: 42 }, // TEST
      { wch: 12 }, // AMOUNT
      { wch: 28 }, // VAIL / MODALITY
      { wch: 16 }  // CATEGORY
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Radiology Scans");
    XLSX.writeFile(workbook, "Radiology_Rate_List_Template.xlsx");
    toast.success("Radiology scans template downloaded successfully!");
  };

  const handleDownloadTemplate = () => {
    if (defaultCategory === 'Radiology') {
      handleDownloadRadiologyTemplate();
    } else {
      handleDownloadPathologyTemplate();
    }
  };

  // Quick load standard Pathology Master rate list into interactive editor
  const handleLoadMasterPathology288 = () => {
    const masterItems: RateItem[] = INITIAL_PATHOLOGY_MASTER_TESTS.map(t => ({
      id: t.id,
      no: t.no,
      code: t.code,
      name: t.name,
      price: t.price,
      vial: t.vial,
      category: 'Pathology',
      department: t.department || 'Pathology'
    }));

    setParsedData(masterItems);
    setFileName('Pathology_Master_Rates.xlsx');
    setDefaultCategory('Pathology');
    setIsPreviewOpen(true);
    toast.success(`Loaded ${masterItems.length} Standard Pathology Tests into interactive editor! You can review, edit, or import.`);
  };

  // Export current edited test list back to Excel
  const handleExportCurrentList = () => {
    if (parsedData.length === 0) {
      toast.error("No test rows available to export.");
      return;
    }

    const exportRows = parsedData.map((item, idx) => ({
      "NO.": item.no || String(idx + 1),
      "TEST": item.name,
      "AMOUNT": item.price,
      "VAIL": item.vial || 'SST Serum',
      "CATEGORY": item.category || defaultCategory
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    worksheet['!cols'] = [
      { wch: 8 },
      { wch: 40 },
      { wch: 14 },
      { wch: 26 },
      { wch: 16 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rate Master");
    XLSX.writeFile(workbook, `Hospital_Rate_List_${Date.now()}.xlsx`);
    toast.success(`Exported ${parsedData.length} test records to Excel successfully!`);
  };

  // Parse uploaded file (.xlsx, .xls, .csv)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });

        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert worksheet to raw json rows
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (!rawJson || rawJson.length === 0) {
          toast.error("The selected file appears to be empty.");
          setIsProcessing(false);
          return;
        }

        // Find header row (Search for NO / TEST / AMOUNT / VAIL / VIAL)
        let headerRowIndex = 0;

        for (let i = 0; i < Math.min(rawJson.length, 10); i++) {
          const rowStr = rawJson[i].map((cell: any) => String(cell).toUpperCase()).join(' ');
          if (rowStr.includes('TEST') || rowStr.includes('AMOUNT') || rowStr.includes('VAIL') || rowStr.includes('VIAL') || rowStr.includes('PRICE') || rowStr.includes('RATE')) {
            headerRowIndex = i;
            break;
          }
        }

        const headers = rawJson[headerRowIndex].map((h: any) => String(h).trim().toUpperCase());

        // Column index mappers
        let noIdx = headers.findIndex((h: string) => h.includes('NO') || h.includes('S.NO') || h.includes('CODE') || h.includes('SR'));
        let testIdx = headers.findIndex((h: string) => h.includes('TEST') || h.includes('NAME') || h.includes('INVESTIGATION') || h.includes('SERVICE') || h.includes('SCAN'));
        let amountIdx = headers.findIndex((h: string) => h.includes('AMOUNT') || h.includes('PRICE') || h.includes('RATE') || h.includes('COST') || h.includes('CHARGE'));
        let vialIdx = headers.findIndex((h: string) => h.includes('VAIL') || h.includes('VIAL') || h.includes('SAMPLE') || h.includes('CONTAINER') || h.includes('TUBE') || h.includes('MODALITY'));
        let catIdx = headers.findIndex((h: string) => h.includes('CATEGORY') || h.includes('DEPT') || h.includes('DEPARTMENT') || h.includes('TYPE') || h.includes('GROUP'));

        // Fallback positioning if headers are standard 0, 1, 2, 3
        if (testIdx === -1) testIdx = 1;
        if (amountIdx === -1) amountIdx = 2;
        if (vialIdx === -1) vialIdx = 3;
        if (noIdx === -1) noIdx = 0;

        const items: RateItem[] = [];

        for (let r = headerRowIndex + 1; r < rawJson.length; r++) {
          const row = rawJson[r];
          if (!row || row.length === 0) continue;

          const rawNo = row[noIdx] !== undefined ? String(row[noIdx]).trim() : '';
          const rawTest = row[testIdx] !== undefined ? String(row[testIdx]).trim() : '';
          const rawAmount = row[amountIdx] !== undefined ? String(row[amountIdx]).replace(/[^0-9.]/g, '') : '0';
          const rawVial = row[vialIdx] !== undefined ? String(row[vialIdx]).trim() : '';
          const rawCat = catIdx !== -1 && row[catIdx] !== undefined ? String(row[catIdx]).trim() : '';

          if (!rawTest && !rawAmount && !rawNo) continue; // Skip empty rows

          if (rawTest) {
            let itemCategory: 'Pathology' | 'Radiology' = defaultCategory;
            if (rawCat) {
              itemCategory = /radio|x-ray|usg|scan|mri|ct|echo|ecg|doppler|imaging/i.test(rawCat) ? 'Radiology' : 'Pathology';
            } else {
              // Smart check from test name or vial/modality
              const testLower = (rawTest + ' ' + rawVial).toLowerCase();
              if (/(x-ray|usg|ultrasound|ct scan|ncct|cect|hrct|mri|ecg|echo|echocardiography|doppler|mammograph|sonograph|radiology|dexa)/i.test(testLower)) {
                itemCategory = 'Radiology';
              } else if (/(edta|sst|serum|blood|urine|stool|lft|kft|cbc|lipid|hba1c|thyroid|biopsy|culture|pathology)/i.test(testLower)) {
                itemCategory = 'Pathology';
              }
            }

            items.push({
              id: `test-xl-${Date.now()}-${r}`,
              no: rawNo || `${r}`,
              code: rawNo ? `TEST-${rawNo}` : `TEST-${r}`,
              name: rawTest,
              price: parseFloat(rawAmount) || 0,
              vial: rawVial || (itemCategory === 'Radiology' ? 'Imaging Scan' : 'SST Serum'),
              category: itemCategory
            });
          }
        }

        if (items.length === 0) {
          toast.error("Could not find valid test rows in the uploaded sheet. Please check the column headers format: NO. | TEST | AMOUNT | VAIL");
          setIsProcessing(false);
          return;
        }

        setParsedData(items);
        setIsPreviewOpen(true);
        toast.success(`Successfully parsed ${items.length} test rates from Excel sheet!`);
      } catch (err: any) {
        console.error("Excel parse error:", err);
        toast.error("Failed to parse Excel file: " + (err.message || "Invalid file format"));
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsBinaryString(file);
  };

  // Start editing a row
  const handleStartEdit = (item: RateItem) => {
    setEditingId(item.id || item.name);
    setEditFormData({
      ...item,
      id: item.id || item.name,
      name: item.name,
      price: item.price,
      vial: item.vial || '',
      category: item.category || defaultCategory,
      no: item.no || ''
    });
  };

  // Save edited row
  const handleSaveEdit = () => {
    if (!editFormData.name.trim()) {
      toast.error("Test name cannot be empty.");
      return;
    }

    setParsedData(prev => prev.map(item => {
      const matchKey = item.id || item.name;
      if (matchKey === editingId) {
        return {
          ...item,
          name: editFormData.name.trim(),
          price: Number(editFormData.price) || 0,
          vial: editFormData.vial?.trim() || (editFormData.category === 'Radiology' ? 'Imaging Scan' : 'SST Serum'),
          category: editFormData.category || defaultCategory,
          no: editFormData.no?.trim() || item.no
        };
      }
      return item;
    }));

    setEditingId(null);
    toast.success("Test details updated in rate list!");
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingId(null);
  };

  // Delete a row
  const handleDeleteRow = (idOrName: string) => {
    setParsedData(prev => prev.filter(item => (item.id || item.name) !== idOrName));
    toast.info("Test row removed from preview list.");
  };

  // Duplicate calculation and bulk deletion
  const duplicateTestsCount = React.useMemo(() => {
    const seen = new Set<string>();
    let count = 0;
    parsedData.forEach(item => {
      const key = (item.name || '').trim().toLowerCase();
      if (key) {
        if (seen.has(key)) {
          count++;
        } else {
          seen.add(key);
        }
      }
    });
    return count;
  }, [parsedData]);

  const handleDeleteDuplicates = () => {
    const seen = new Set<string>();
    const uniqueList: RateItem[] = [];
    let removed = 0;
    parsedData.forEach(item => {
      const key = (item.name || '').trim().toLowerCase();
      if (!key) {
        uniqueList.push(item);
        return;
      }
      if (seen.has(key)) {
        removed++;
      } else {
        seen.add(key);
        uniqueList.push(item);
      }
    });

    if (removed === 0) {
      toast.info("No duplicate test entries found in the preview list.");
      return;
    }

    setParsedData(uniqueList);
    toast.success(`Removed ${removed} duplicate test entries!`);
  };

  // Add new test row to parsed data
  const handleAddNewTest = () => {
    if (!newTestData.name.trim()) {
      toast.error("Please enter a test name.");
      return;
    }

    const priceNum = parseFloat(newTestData.price);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error("Please enter a valid amount / fee in ₹.");
      return;
    }

    const nextNo = newTestData.no.trim() || String(parsedData.length + 1);
    const newRateItem: RateItem = {
      id: `manual-test-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      no: nextNo,
      code: `TEST-${nextNo}`,
      name: newTestData.name.trim(),
      price: priceNum,
      vial: newTestData.vial.trim() || (newTestData.category === 'Radiology' ? 'Imaging Scan' : 'SST Serum'),
      category: newTestData.category
    };

    setParsedData(prev => [newRateItem, ...prev]);
    setNewTestData({
      no: '',
      name: '',
      price: '',
      vial: newTestData.category === 'Radiology' ? 'Imaging Scan' : 'SST Serum',
      category: newTestData.category
    });
    setIsAddFormOpen(false);
    toast.success(`"${newRateItem.name}" added to the rate list!`);
  };

  // Bulk set category
  const handleSetCategoryForAll = (cat: 'Pathology' | 'Radiology') => {
    setParsedData(prev => prev.map(item => ({ ...item, category: cat })));
    toast.success(`All ${parsedData.length} tests category set to ${cat}!`);
  };

  // Perform Final Import to LocalStorage and Parent State
  const handleConfirmImport = () => {
    if (parsedData.length === 0) {
      toast.error("No test rate data to import.");
      return;
    }

    try {
      // 1. Update LAB_RATES in storage
      const existingLabRates = storage.get(STORAGE_KEYS.LAB_RATES, []);
      let newLabRates: any[] = [];

      const formattedNewRates = parsedData.map(item => ({
        id: item.id || `lt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: item.name,
        category: item.category || defaultCategory,
        price: item.price,
        vial: item.vial || (item.category === 'Radiology' ? 'Imaging Scan' : 'SST Serum'),
        code: item.no || item.code || ''
      }));

      if (importMode === 'replace') {
        newLabRates = formattedNewRates;
      } else {
        // Append / Merge: Avoid exact duplicate names if needed, or append
        const nameMap = new Set(existingLabRates.map((r: any) => r.name.toLowerCase()));
        const uniqueAppends = formattedNewRates.filter((r: any) => !nameMap.has(r.name.toLowerCase()));
        newLabRates = [...existingLabRates, ...uniqueAppends];
      }

      storage.set(STORAGE_KEYS.LAB_RATES, newLabRates);

      // 2. Also sync to LIS Investigations storage
      const existingLIS = storage.get('lis_investigations', []);
      let newLIS = [...existingLIS];

      parsedData.forEach((item, idx) => {
        const testCode = item.no ? `TEST-${item.no}` : `EXL-${idx + 100}`;
        const existingIdx = newLIS.findIndex(t => t.name.toLowerCase() === item.name.toLowerCase());
        const itemCat = item.category || defaultCategory;

        const lisItem = {
          code: testCode,
          name: item.name,
          shortName: item.name.substring(0, 10),
          department: itemCat,
          categoryId: itemCat === 'Radiology' ? 'CAT-RADIO' : 'CAT-GEN',
          subCategoryId: itemCat === 'Radiology' ? 'SUB-RADIO' : 'SUB-GEN',
          sampleType: item.vial || (itemCat === 'Radiology' ? 'Imaging Scan' : 'SST Serum'),
          method: itemCat === 'Radiology' ? 'Diagnostic Imaging' : 'Automated Analyzer',
          machineName: itemCat === 'Radiology' ? 'Digital Imaging Console' : 'General Analyzer',
          reportType: 'Quantitative' as const,
          tat: itemCat === 'Radiology' ? '2 Hours' : '4 Hours',
          normalRangeApplicable: itemCat !== 'Radiology',
          criticalValueApplicable: true,
          nablCompliance: true,
          activeStatus: 'Active' as const,
          price: item.price
        };

        if (existingIdx >= 0) {
          newLIS[existingIdx] = { 
            ...newLIS[existingIdx], 
            price: item.price, 
            department: itemCat,
            sampleType: item.vial || newLIS[existingIdx].sampleType 
          };
        } else {
          newLIS.push(lisItem);
        }
      });

      storage.set('lis_investigations', newLIS);

      toast.success(`Successfully imported ${parsedData.length} test rates into the system master!`);

      if (onImportSuccess) {
        onImportSuccess(newLabRates);
      }

      setIsPreviewOpen(false);
      setParsedData([]);
      setEditingId(null);
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error("Failed to save imported rate list: " + err.message);
    }
  };

  // Filter preview by query & category
  const filteredPreview = parsedData.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.vial && item.vial.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.no && String(item.no).toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = 
      activeCategoryFilter === 'all' || 
      (item.category || defaultCategory) === activeCategoryFilter;

    return matchesSearch && matchesCategory;
  });

  const pathologyCount = parsedData.filter(item => (item.category || defaultCategory) === 'Pathology').length;
  const radiologyCount = parsedData.filter(item => (item.category || defaultCategory) === 'Radiology').length;
  const totalPriceSum = parsedData.reduce((acc, curr) => acc + curr.price, 0);

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept=".xlsx, .xls, .csv" 
        className="hidden" 
      />

      {variant === 'card' ? (
        <div className="border border-indigo-200 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/50 p-4 rounded-2xl space-y-3 w-full shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-sm">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Upload Rate List (Excel)</h4>
                <p className="text-[11px] text-slate-500">Format: <strong className="text-indigo-700">NO. | TEST | AMOUNT | VAIL</strong></p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDownloadTemplate}
              className="text-xs h-8 border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-medium"
            >
              <Download className="w-3.5 h-3.5 mr-1" /> Template
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button 
              onClick={() => fileInputRef.current?.click()} 
              disabled={isProcessing}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 rounded-xl shadow-sm gap-1.5 flex-1"
            >
              <Upload className="w-4 h-4" />
              {isProcessing ? 'Reading Sheet...' : 'Select Excel File (.xlsx)'}
            </Button>
            <Button 
              variant="outline"
              onClick={handleLoadMasterPathology288}
              className="border-purple-200 text-purple-700 hover:bg-purple-50 font-semibold text-xs h-9 rounded-xl gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              Load 288 Pathology Tests
            </Button>
          </div>
        </div>
      ) : variant === 'compact' ? (
        <div className="flex items-center gap-1.5">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDownloadTemplate}
            className="text-[11px] h-8 border-slate-200 text-slate-600 hover:text-indigo-600"
            title="Download NO. TEST AMOUNT VAIL template"
          >
            <Download className="w-3 h-3 mr-1 text-indigo-600" /> Excel Template
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleLoadMasterPathology288}
            className="text-[11px] h-8 border-purple-200 text-purple-700 hover:bg-purple-50 font-semibold gap-1"
            title="View & Edit 288 Standard Pathology Tests"
          >
            <Sparkles className="w-3 h-3 text-purple-600" /> 288 Tests
          </Button>
          <Button 
            size="sm" 
            onClick={() => fileInputRef.current?.click()} 
            disabled={isProcessing}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] h-8 rounded-lg gap-1"
          >
            <Upload className="w-3 h-3" />
            {isProcessing ? 'Loading...' : 'Upload Excel'}
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDownloadTemplate}
            className="text-xs h-9 border-slate-200 text-indigo-700 hover:bg-indigo-50 font-semibold rounded-xl gap-1"
          >
            <Download className="w-3.5 h-3.5" /> Sample Template
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleLoadMasterPathology288}
            className="text-xs h-9 border-purple-200 text-purple-700 hover:bg-purple-50 font-bold rounded-xl gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" /> Load 288 Pathology Tests
          </Button>
          <Button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={isProcessing}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 rounded-xl shadow-sm gap-1.5"
          >
            <Upload className="w-4 h-4" />
            {isProcessing ? 'Processing Sheet...' : buttonText}
          </Button>
        </div>
      )}

      {/* Interactive Import Preview, Edit, Add & Delete Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className={`transition-all duration-200 p-4 sm:p-6 flex flex-col overflow-hidden bg-white shadow-2xl border border-slate-200/90 ${
          isFullScreen 
            ? '!w-[98vw] !max-w-[98vw] sm:!max-w-[98vw] md:!max-w-[98vw] lg:!max-w-[98vw] xl:!max-w-[1600px] h-[95vh] max-h-[96vh] rounded-2xl sm:rounded-3xl' 
            : '!w-[92vw] !max-w-[1200px] sm:!max-w-[1200px] h-[88vh] max-h-[90vh] rounded-3xl'
        }`}>
          <DialogHeader className="pb-3 border-b border-slate-100 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-2xl shadow-xs shrink-0">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-lg sm:text-xl font-bold text-slate-900 flex flex-wrap items-center gap-2">
                    <span>Review & Edit Excel Rate List</span>
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      <Check className="w-3 h-3 mr-1" /> {parsedData.length} Tests Loaded
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 truncate">
                    Source: <span className="font-semibold text-slate-700">{fileName || 'Uploaded Sheet'}</span> • Edit, delete, add tests, and toggle categories in full page view.
                  </DialogDescription>
                </div>
              </div>

              {/* Action shortcuts */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleDeleteDuplicates}
                  className={`h-8 px-2.5 text-xs font-semibold gap-1.5 transition-colors ${
                    duplicateTestsCount > 0 
                      ? 'border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 hover:text-rose-800' 
                      : 'border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                  title="Remove redundant duplicate test entries from list"
                >
                  <Trash2 className={`w-3.5 h-3.5 ${duplicateTestsCount > 0 ? 'text-rose-600' : 'text-slate-500'}`} />
                  <span>Delete Duplicates {duplicateTestsCount > 0 ? `(${duplicateTestsCount})` : ''}</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsFullScreen(!isFullScreen)}
                  className="h-8 px-2.5 text-xs font-semibold border-slate-200 text-slate-700 hover:text-indigo-600 gap-1.5 hover:bg-slate-50"
                  title={isFullScreen ? "Exit Full Page View" : "Full Page View"}
                >
                  {isFullScreen ? (
                    <>
                      <Minimize2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span className="hidden sm:inline">Compact</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span className="hidden sm:inline">Full Page</span>
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleExportCurrentList}
                  className="h-8 text-xs font-semibold border-slate-200 text-slate-700 hover:text-indigo-600 gap-1.5"
                  title="Download current edited list as Excel"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600" /> Export Excel
                </Button>
                <Button 
                  size="sm"
                  onClick={() => setIsAddFormOpen(!isAddFormOpen)}
                  className={`h-8 text-xs font-bold gap-1.5 transition-all ${
                    isAddFormOpen 
                      ? 'bg-slate-700 text-white hover:bg-slate-800' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  {isAddFormOpen ? 'Hide Add Form' : 'Add New Test'}
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 my-2.5 shrink-0">
            <div className="p-3 bg-indigo-50/70 border border-indigo-100/80 rounded-2xl flex items-center gap-3 min-w-0 shadow-xs">
              <div className="p-2 bg-indigo-600 text-white rounded-xl shrink-0 shadow-xs">
                <FlaskConical className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider truncate">Total Tests</p>
                <p className="text-base sm:text-lg font-black text-slate-900 truncate">{parsedData.length} Items</p>
              </div>
            </div>

            <div className="p-3 bg-emerald-50/70 border border-emerald-100/80 rounded-2xl flex items-center gap-3 min-w-0 shadow-xs">
              <div className="p-2 bg-emerald-600 text-white rounded-xl shrink-0 shadow-xs">
                <Tag className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider truncate">Total Value</p>
                <p className="text-base sm:text-lg font-black text-slate-900 truncate">₹{totalPriceSum.toLocaleString('en-IN')}</p>
              </div>
            </div>

            <div className="p-3 bg-purple-50/70 border border-purple-100/80 rounded-2xl flex items-center gap-3 min-w-0 shadow-xs">
              <div className="p-2 bg-purple-600 text-white rounded-xl shrink-0 shadow-xs">
                <Microscope className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider truncate">Pathology Tests</p>
                <p className="text-base sm:text-lg font-black text-slate-900 truncate">{pathologyCount} Items</p>
              </div>
            </div>

            <div className="p-3 bg-sky-50/70 border border-sky-100/80 rounded-2xl flex items-center gap-3 min-w-0 shadow-xs">
              <div className="p-2 bg-sky-600 text-white rounded-xl shrink-0 shadow-xs">
                <Radio className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-sky-600 uppercase tracking-wider truncate">Radiology Scans</p>
                <p className="text-base sm:text-lg font-black text-slate-900 truncate">{radiologyCount} Items</p>
              </div>
            </div>
          </div>

          {/* Add New Test Inline Form (Expandable) */}
          {isAddFormOpen && (
            <div className="p-4 bg-indigo-50/40 border border-indigo-200 rounded-2xl mb-3 space-y-3 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-indigo-600" />
                  Add New Test Row to Uploaded List
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsAddFormOpen(false)}
                  className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">S.No. / Code</Label>
                  <Input 
                    placeholder="e.g. 101"
                    value={newTestData.no}
                    onChange={(e) => setNewTestData({ ...newTestData, no: e.target.value })}
                    className="h-9 text-xs bg-white"
                  />
                </div>

                <div className="sm:col-span-4 space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Test / Investigation Name *</Label>
                  <Input 
                    placeholder="e.g. Vitamin D3 (25-OH)"
                    value={newTestData.name}
                    onChange={(e) => setNewTestData({ ...newTestData, name: e.target.value })}
                    className="h-9 text-xs bg-white font-medium"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Amount (₹) *</Label>
                  <Input 
                    type="number"
                    placeholder="e.g. 1200"
                    value={newTestData.price}
                    onChange={(e) => setNewTestData({ ...newTestData, price: e.target.value })}
                    className="h-9 text-xs bg-white font-bold text-emerald-700"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Vail / Modality</Label>
                  <Input 
                    placeholder="e.g. SST Gel / USG"
                    value={newTestData.vial}
                    onChange={(e) => setNewTestData({ ...newTestData, vial: e.target.value })}
                    className="h-9 text-xs bg-white"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Department</Label>
                  <select 
                    value={newTestData.category}
                    onChange={(e) => setNewTestData({ ...newTestData, category: e.target.value as 'Pathology' | 'Radiology' })}
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700"
                  >
                    <option value="Pathology">Pathology</option>
                    <option value="Radiology">Radiology</option>
                  </select>
                </div>
              </div>

              {/* Quick Container Suggesters */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                <span className="text-slate-500 text-[10px] font-bold uppercase">Quick Samples:</span>
                {['EDTA (Lavender)', 'SST Gel (Yellow)', 'Plain Clot (Red)', 'Fluoride (Grey)', 'Urine Container', 'Digital X-Ray', 'Ultrasound', 'CT Scan', 'MRI Scan'].map(s => (
                  <button 
                    key={s}
                    type="button"
                    onClick={() => setNewTestData({ ...newTestData, vial: s, category: s.includes('X-Ray') || s.includes('Scan') || s.includes('Ultrasound') ? 'Radiology' : 'Pathology' })}
                    className="px-2 py-0.5 bg-white hover:bg-indigo-50 text-slate-700 border border-slate-200 rounded-md text-[10px] font-medium transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsAddFormOpen(false)}
                  className="h-8 text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleAddNewTest}
                  className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Test to List
                </Button>
              </div>
            </div>
          )}

          {/* Filtering & Category Controls Bar */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 text-xs mb-2">
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <span className="font-bold text-slate-700 shrink-0">Filter Dept:</span>
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
                <button 
                  type="button"
                  onClick={() => setActiveCategoryFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeCategoryFilter === 'all' 
                      ? 'bg-slate-900 text-white shadow-xs' 
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  All ({parsedData.length})
                </button>
                <button 
                  type="button"
                  onClick={() => setActiveCategoryFilter('Pathology')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeCategoryFilter === 'Pathology' 
                      ? 'bg-purple-600 text-white shadow-xs' 
                      : 'text-slate-600 hover:bg-purple-50'
                  }`}
                >
                  Pathology ({pathologyCount})
                </button>
                <button 
                  type="button"
                  onClick={() => setActiveCategoryFilter('Radiology')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeCategoryFilter === 'Radiology' 
                      ? 'bg-sky-600 text-white shadow-xs' 
                      : 'text-slate-600 hover:bg-sky-50'
                  }`}
                >
                  Radiology ({radiologyCount})
                </button>
              </div>

              {/* Bulk actions */}
              <div className="flex items-center gap-1.5 ml-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleSetCategoryForAll('Pathology')}
                  className="h-7 text-[10px] font-semibold border-purple-200 text-purple-700 hover:bg-purple-50"
                  title="Mark all items as Pathology"
                >
                  Set All Pathology
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleSetCategoryForAll('Radiology')}
                  className="h-7 text-[10px] font-semibold border-sky-200 text-sky-700 hover:bg-sky-50"
                  title="Mark all items as Radiology"
                >
                  Set All Radiology
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-56">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <Input 
                  placeholder="Search test, vial or code..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs border-slate-200 rounded-xl bg-white"
                />
              </div>
            </div>
          </div>

          {/* Table Preview & Live Editor */}
          <ScrollArea className="flex-1 border border-slate-200/90 rounded-2xl overflow-auto min-h-[300px] bg-white shadow-inner">
            <Table className="w-full min-w-[720px]">
              <TableHeader className="bg-slate-100/90 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-16 font-bold text-slate-700 text-xs">NO.</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">TEST / INVESTIGATION NAME</TableHead>
                  <TableHead className="w-28 font-bold text-slate-700 text-xs">CATEGORY</TableHead>
                  <TableHead className="w-32 font-bold text-slate-700 text-xs text-right">AMOUNT (₹)</TableHead>
                  <TableHead className="w-44 font-bold text-slate-700 text-xs">VAIL / MODALITY</TableHead>
                  <TableHead className="w-24 font-bold text-slate-700 text-xs text-center">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPreview.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-slate-400 text-xs">
                      No matching records found. Click <strong>"Add New Test"</strong> to add a test manually.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPreview.map((item, idx) => {
                    const rowKey = item.id || item.name;
                    const isEditing = editingId === rowKey;

                    return (
                      <TableRow key={rowKey} className={`hover:bg-slate-50/90 transition-colors ${isEditing ? 'bg-indigo-50/40' : ''}`}>
                        {/* No. column */}
                        <TableCell className="font-mono text-xs font-semibold text-slate-500">
                          {isEditing ? (
                            <Input 
                              value={editFormData.no || ''} 
                              onChange={(e) => setEditFormData({ ...editFormData, no: e.target.value })}
                              className="h-7 w-12 text-xs bg-white font-mono"
                            />
                          ) : (
                            item.no || idx + 1
                          )}
                        </TableCell>

                        {/* Test Name */}
                        <TableCell className="font-bold text-xs text-slate-800">
                          {isEditing ? (
                            <Input 
                              value={editFormData.name} 
                              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                              className="h-7 text-xs bg-white font-bold"
                            />
                          ) : (
                            item.name
                          )}
                        </TableCell>

                        {/* Category */}
                        <TableCell>
                          {isEditing ? (
                            <select 
                              value={editFormData.category || 'Pathology'}
                              onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value as 'Pathology' | 'Radiology' })}
                              className="h-7 rounded border border-slate-200 bg-white px-1.5 text-[11px] font-semibold text-slate-700"
                            >
                              <option value="Pathology">Pathology</option>
                              <option value="Radiology">Radiology</option>
                            </select>
                          ) : (
                            <Badge 
                              variant="secondary"
                              onClick={() => {
                                // Quick toggle category on badge click
                                const nextCat = item.category === 'Radiology' ? 'Pathology' : 'Radiology';
                                setParsedData(prev => prev.map(t => (t.id || t.name) === rowKey ? { ...t, category: nextCat } : t));
                              }}
                              className={`text-[10px] font-bold cursor-pointer transition-all ${
                                item.category === 'Radiology' 
                                  ? 'bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100' 
                                  : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
                              }`}
                              title="Click to toggle category"
                            >
                              {item.category || defaultCategory}
                            </Badge>
                          )}
                        </TableCell>

                        {/* Price */}
                        <TableCell className="text-right font-black text-xs text-emerald-700">
                          {isEditing ? (
                            <Input 
                              type="number"
                              value={editFormData.price} 
                              onChange={(e) => setEditFormData({ ...editFormData, price: parseFloat(e.target.value) || 0 })}
                              className="h-7 w-24 ml-auto text-xs bg-white text-right font-bold text-emerald-700"
                            />
                          ) : (
                            `₹${item.price.toLocaleString('en-IN')}`
                          )}
                        </TableCell>

                        {/* Vial / Sample / Modality */}
                        <TableCell>
                          {isEditing ? (
                            <Input 
                              value={editFormData.vial || ''} 
                              onChange={(e) => setEditFormData({ ...editFormData, vial: e.target.value })}
                              className="h-7 text-xs bg-white"
                            />
                          ) : (
                            <Badge 
                              variant="outline" 
                              className={`text-[10px] font-bold uppercase tracking-tight px-2 py-0.5 ${getVialBadgeColor(item.vial)}`}
                            >
                              {item.vial || (item.category === 'Radiology' ? 'Imaging Scan' : 'SST Serum')}
                            </Badge>
                          )}
                        </TableCell>

                        {/* Row Actions: Edit, Save, Cancel, Delete */}
                        <TableCell className="text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1">
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                onClick={handleSaveEdit}
                                className="h-6 w-6 text-emerald-600 hover:bg-emerald-50"
                                title="Save changes"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                onClick={handleCancelEdit}
                                className="h-6 w-6 text-slate-400 hover:bg-slate-100"
                                title="Cancel edit"
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                onClick={() => handleStartEdit(item)}
                                className="h-6 w-6 text-indigo-600 hover:bg-indigo-50"
                                title="Edit this test"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                onClick={() => handleDeleteRow(rowKey)}
                                className="h-6 w-6 text-rose-500 hover:bg-rose-50"
                                title="Delete this test"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>

          {/* Import Settings & Options */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs mt-3">
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-700 shrink-0">Import Mode:</span>
              <div className="flex items-center gap-4">
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input 
                    type="radio" 
                    name="importMode" 
                    value="append" 
                    checked={importMode === 'append'} 
                    onChange={() => setImportMode('append')}
                    className="accent-indigo-600 h-3.5 w-3.5"
                  />
                  <span className="font-medium text-slate-800">Append / Merge with existing rates</span>
                </label>
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input 
                    type="radio" 
                    name="importMode" 
                    value="replace" 
                    checked={importMode === 'replace'} 
                    onChange={() => setImportMode('replace')}
                    className="accent-rose-600 h-3.5 w-3.5"
                  />
                  <span className="font-medium text-rose-700">Replace entire rate list</span>
                </label>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Syncs to LIMS Master, OPD Billing, Pathology & Radiology Desks.</span>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setParsedData([])}
                className="text-xs h-9 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50"
              >
                Clear All
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsPreviewOpen(false);
                  setEditingId(null);
                }}
                className="text-xs h-9 rounded-xl border-slate-200"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmImport}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 rounded-xl gap-1.5 shadow-sm"
              >
                <Check className="w-4 h-4" /> Confirm & Import {parsedData.length} Rates
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
