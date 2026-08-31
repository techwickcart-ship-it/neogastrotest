import React, { useState, useMemo } from 'react';
import { 
  Receipt, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Download, 
  Printer, 
  RotateCcw, 
  Search, 
  Filter, 
  Stethoscope, 
  Building2, 
  Activity, 
  HeartPulse, 
  Syringe, 
  Microscope, 
  Boxes, 
  ShieldAlert, 
  FileSpreadsheet, 
  Percent, 
  DollarSign, 
  Info,
  CheckCircle2,
  Sparkles,
  Layers,
  Flame,
  ChevronDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import RateListExcelUploader from './RateListExcelUploader';
import { INITIAL_PATHOLOGY_MASTER_TESTS, formatVialLabel } from '@/data/pathologyMasterRates';
import { INITIAL_RADIOLOGY_MASTER_TESTS } from '@/data/radiologyMasterRates';

interface HospitalTariffManagerProps {
  isAccountant?: boolean;
  gastroServices: any[];
  setGastroServices: React.Dispatch<React.SetStateAction<any[]>>;
  hospitalRoomRates: any[];
  setHospitalRoomRates: React.Dispatch<React.SetStateAction<any[]>>;
  cardiologyRates: any[];
  setCardiologyRates: React.Dispatch<React.SetStateAction<any[]>>;
  clinicalProcedures: any[];
  setClinicalProcedures: React.Dispatch<React.SetStateAction<any[]>>;
  hospitalBillingPolicy: any;
  setHospitalBillingPolicy: React.Dispatch<React.SetStateAction<any>>;
  bedRates: any[];
  setBedRates: React.Dispatch<React.SetStateAction<any[]>>;
  otRates: any[];
  setOtRates: React.Dispatch<React.SetStateAction<any[]>>;
  labRates: any[];
  setLabRates: React.Dispatch<React.SetStateAction<any[]>>;
  materialRates: any[];
  setMaterialRates: React.Dispatch<React.SetStateAction<any[]>>;
  endoRates: any;
  setEndoRates: React.Dispatch<React.SetStateAction<any>>;
  onExportExcel: () => void;
  onPrintTariff: () => void;
  onRestoreMaster: () => void;
}

export const HospitalTariffManager: React.FC<HospitalTariffManagerProps> = ({
  isAccountant = false,
  gastroServices,
  setGastroServices,
  hospitalRoomRates,
  setHospitalRoomRates,
  cardiologyRates,
  setCardiologyRates,
  clinicalProcedures,
  setClinicalProcedures,
  hospitalBillingPolicy,
  setHospitalBillingPolicy,
  bedRates,
  setBedRates,
  otRates,
  setOtRates,
  labRates,
  setLabRates,
  materialRates,
  setMaterialRates,
  endoRates,
  setEndoRates,
  onExportExcel,
  onPrintTariff,
  onRestoreMaster
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'gastro' | 'hospital' | 'radiology' | 'cardio' | 'procedures' | 'lab' | 'materials' | 'policy'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});

  // Quick Add states
  const [newGastro, setNewGastro] = useState({
    service: '',
    category: 'Therapeutic GI',
    charges: '',
    followUpCharges: '',
    sedationCharges: '0',
    extraChargesNote: '',
    notes: ''
  });

  const [newRoom, setNewRoom] = useState({
    service: '',
    category: 'Room/Bed',
    charges: '',
    billingUnit: 'Per Day',
    notes: ''
  });

  const [newCardio, setNewCardio] = useState({
    service: '',
    category: 'Cardiology',
    charges: '',
    billingUnit: 'Per Day',
    notes: ''
  });

  const [newProc, setNewProc] = useState({
    service: '',
    category: 'Clinical Procedure',
    charges: '',
    notes: ''
  });

  const [newLab, setNewLab] = useState({
    name: '',
    category: 'Pathology' as 'Pathology' | 'Radiology',
    price: '',
    vial: ''
  });

  const [newRadio, setNewRadio] = useState({
    name: '',
    price: '',
    vial: 'Imaging'
  });

  const [pathologyPage, setPathologyPage] = useState(1);
  const [pathologyPageSize, setPathologyPageSize] = useState(25);
  const [pathologyVialFilter, setPathologyVialFilter] = useState('ALL');

  const [newMaterial, setNewMaterial] = useState({
    name: '',
    category: 'Disposable' as 'Disposable' | 'Material',
    price: ''
  });

  // Filtered lists
  const filteredGastro = useMemo(() => {
    if (!searchTerm.trim()) return gastroServices;
    const q = searchTerm.toLowerCase();
    return gastroServices.filter(s => 
      (s.service || '').toLowerCase().includes(q) ||
      (s.category || '').toLowerCase().includes(q) ||
      (s.notes || '').toLowerCase().includes(q) ||
      (s.extraChargesNote || '').toLowerCase().includes(q) ||
      String(s.no || '').includes(q)
    );
  }, [gastroServices, searchTerm]);

  const filteredRooms = useMemo(() => {
    if (!searchTerm.trim()) return hospitalRoomRates;
    const q = searchTerm.toLowerCase();
    return hospitalRoomRates.filter(s => 
      (s.service || '').toLowerCase().includes(q) ||
      (s.category || '').toLowerCase().includes(q) ||
      (s.notes || '').toLowerCase().includes(q) ||
      String(s.no || '').includes(q)
    );
  }, [hospitalRoomRates, searchTerm]);

  const filteredCardio = useMemo(() => {
    if (!searchTerm.trim()) return cardiologyRates;
    const q = searchTerm.toLowerCase();
    return cardiologyRates.filter(s => 
      (s.service || '').toLowerCase().includes(q) ||
      (s.category || '').toLowerCase().includes(q) ||
      (s.notes || '').toLowerCase().includes(q) ||
      String(s.no || '').includes(q)
    );
  }, [cardiologyRates, searchTerm]);

  const filteredProcedures = useMemo(() => {
    if (!searchTerm.trim()) return clinicalProcedures;
    const q = searchTerm.toLowerCase();
    return clinicalProcedures.filter(s => 
      (s.service || '').toLowerCase().includes(q) ||
      (s.category || '').toLowerCase().includes(q) ||
      (s.notes || '').toLowerCase().includes(q) ||
      String(s.no || '').includes(q)
    );
  }, [clinicalProcedures, searchTerm]);

  const filteredRadiology = useMemo(() => {
    const radItems = labRates.filter((l: any) => l.category === 'Radiology');
    if (!searchTerm.trim()) return radItems;
    const q = searchTerm.toLowerCase();
    return radItems.filter((r: any) => 
      (r.name || '').toLowerCase().includes(q) ||
      (r.vial || '').toLowerCase().includes(q) ||
      (r.code || '').toLowerCase().includes(q) ||
      (r.modality || '').toLowerCase().includes(q) ||
      String(r.no || '').includes(q)
    );
  }, [labRates, searchTerm]);

  const filteredPathology = useMemo(() => {
    let pathItems = labRates.filter((l: any) => l.category !== 'Radiology');
    if (pathologyVialFilter !== 'ALL') {
      pathItems = pathItems.filter((l: any) => {
        const v = (l.vial || '').toUpperCase();
        if (pathologyVialFilter === 'EDTA') return v.includes('EDTA');
        if (pathologyVialFilter === 'PLAIN') return v.includes('PLAIN') || v.includes('CLOT') || v.includes('SST');
        if (pathologyVialFilter === 'FLU') return v.includes('FLU');
        if (pathologyVialFilter === 'CON') return v.includes('CON') || v.includes('CONTAINER');
        if (pathologyVialFilter === 'CITRATE') return v.includes('CIT') || v.includes('STC');
        if (pathologyVialFilter === 'OTHER') return !v.includes('EDTA') && !v.includes('PLAIN') && !v.includes('FLU') && !v.includes('CON') && !v.includes('CIT');
        return true;
      });
    }
    if (!searchTerm.trim()) return pathItems;
    const q = searchTerm.toLowerCase();
    return pathItems.filter((l: any) => 
      (l.name || '').toLowerCase().includes(q) ||
      (l.vial || '').toLowerCase().includes(q) ||
      String(l.no || '').includes(q)
    );
  }, [labRates, searchTerm, pathologyVialFilter]);

  const paginatedPathology = useMemo(() => {
    if (pathologyPageSize === -1) return filteredPathology;
    const start = (pathologyPage - 1) * pathologyPageSize;
    return filteredPathology.slice(start, start + pathologyPageSize);
  }, [filteredPathology, pathologyPage, pathologyPageSize]);

  const totalPathologyPages = useMemo(() => {
    if (pathologyPageSize === -1 || filteredPathology.length === 0) return 1;
    return Math.ceil(filteredPathology.length / pathologyPageSize);
  }, [filteredPathology.length, pathologyPageSize]);

  const filteredMaterials = useMemo(() => {
    if (!searchTerm.trim()) return materialRates;
    const q = searchTerm.toLowerCase();
    return materialRates.filter((m: any) => 
      (m.name || '').toLowerCase().includes(q) ||
      (m.category || '').toLowerCase().includes(q)
    );
  }, [materialRates, searchTerm]);

  // Handler functions
  const handleAddGastro = () => {
    if (!newGastro.service.trim() || !newGastro.charges) {
      toast.error('Please enter service name and charges');
      return;
    }
    const newItem = {
      id: `gs-${Date.now()}`,
      no: String(gastroServices.length + 1),
      service: newGastro.service.trim(),
      category: newGastro.category || 'Gastroenterology',
      charges: parseFloat(newGastro.charges) || 0,
      followUpCharges: newGastro.followUpCharges ? parseFloat(newGastro.followUpCharges) : undefined,
      sedationCharges: newGastro.sedationCharges ? parseFloat(newGastro.sedationCharges) : 0,
      extraChargesNote: newGastro.extraChargesNote.trim() || undefined,
      notes: newGastro.notes.trim() || undefined
    };
    const updated = [...gastroServices, newItem];
    setGastroServices(updated);
    storage.set(STORAGE_KEYS.GASTRO_SERVICES_RATES, updated);
    setNewGastro({ service: '', category: 'Therapeutic GI', charges: '', followUpCharges: '', sedationCharges: '0', extraChargesNote: '', notes: '' });
    toast.success(`Service "${newItem.service}" added to Gastro tariff list!`);
  };

  const handleAddRoom = () => {
    if (!newRoom.service.trim() || !newRoom.charges) {
      toast.error('Please enter room/service name and charges');
      return;
    }
    const newItem = {
      id: `hr-${Date.now()}`,
      no: String(hospitalRoomRates.length + 21),
      service: newRoom.service.trim(),
      category: newRoom.category || 'Room/Bed',
      charges: parseFloat(newRoom.charges) || 0,
      billingUnit: newRoom.billingUnit || 'Per Day',
      notes: newRoom.notes.trim() || undefined
    };
    const updated = [...hospitalRoomRates, newItem];
    setHospitalRoomRates(updated);
    storage.set(STORAGE_KEYS.HOSPITAL_ROOM_RATES, updated);
    setNewRoom({ service: '', category: 'Room/Bed', charges: '', billingUnit: 'Per Day', notes: '' });
    toast.success(`Room/Hospital charge "${newItem.service}" added!`);
  };

  const handleAddCardio = () => {
    if (!newCardio.service.trim() || !newCardio.charges) {
      toast.error('Please enter cardiology/equipment service and charges');
      return;
    }
    const newItem = {
      id: `cd-${Date.now()}`,
      no: String(cardiologyRates.length + 37),
      service: newCardio.service.trim(),
      category: newCardio.category || 'Cardiology',
      charges: parseFloat(newCardio.charges) || 0,
      billingUnit: newCardio.billingUnit || 'Each',
      notes: newCardio.notes.trim() || undefined
    };
    const updated = [...cardiologyRates, newItem];
    setCardiologyRates(updated);
    storage.set(STORAGE_KEYS.CARDIOLOGY_EQUIPMENT_RATES, updated);
    setNewCardio({ service: '', category: 'Cardiology', charges: '', billingUnit: 'Per Day', notes: '' });
    toast.success(`Cardiology/ICU item "${newItem.service}" added!`);
  };

  const handleAddProc = () => {
    if (!newProc.service.trim() || !newProc.charges) {
      toast.error('Please enter clinical procedure name and charges');
      return;
    }
    const newItem = {
      id: `pr-${Date.now()}`,
      no: String(clinicalProcedures.length + 46),
      service: newProc.service.trim(),
      category: newProc.category || 'Clinical Procedure',
      charges: parseFloat(newProc.charges) || 0,
      notes: newProc.notes.trim() || undefined
    };
    const updated = [...clinicalProcedures, newItem];
    setClinicalProcedures(updated);
    storage.set(STORAGE_KEYS.CLINICAL_PROCEDURE_RATES, updated);
    setNewProc({ service: '', category: 'Clinical Procedure', charges: '', notes: '' });
    toast.success(`Clinical procedure "${newItem.service}" added!`);
  };

  const handleAddLab = () => {
    if (!newLab.name.trim() || !newLab.price) {
      toast.error('Please enter test name and price');
      return;
    }
    const newItem = {
      id: `path-custom-${Date.now()}`,
      no: String(labRates.filter((l: any) => l.category !== 'Radiology').length + 1),
      name: newLab.name.trim().toUpperCase(),
      category: 'Pathology' as const,
      price: parseFloat(newLab.price) || 0,
      vial: newLab.vial.trim() || 'EDTA'
    };
    const updated = [...labRates, newItem];
    setLabRates(updated);
    storage.set(STORAGE_KEYS.LAB_RATES, updated);
    setNewLab({ name: '', category: 'Pathology', price: '', vial: '' });
    toast.success(`Pathology test "${newItem.name}" (₹${newItem.price}) added!`);
  };

  const handleAddRadio = () => {
    if (!newRadio.name.trim() || !newRadio.price) {
      toast.error('Please enter imaging / radiology procedure name and charges');
      return;
    }
    const newItem = {
      id: `rad-custom-${Date.now()}`,
      name: newRadio.name.trim().toUpperCase(),
      category: 'Radiology' as const,
      price: parseFloat(newRadio.price) || 0,
      vial: newRadio.vial.trim() || 'Imaging'
    };
    const updated = [...labRates, newItem];
    setLabRates(updated);
    storage.set(STORAGE_KEYS.LAB_RATES, updated);
    setNewRadio({ name: '', price: '', vial: 'Imaging' });
    toast.success(`Radiology investigation "${newItem.name}" added!`);
  };

  const handleDeleteLab = (item: any) => {
    const targetKey = item.id || item.name;
    const updated = labRates.filter(s => (s.id || s.name) !== targetKey);
    setLabRates(updated);
    storage.set(STORAGE_KEYS.LAB_RATES, updated);
    toast.success(`Removed "${item.name}" from rate schedule`);
  };

  const handleResetPathologyMaster = () => {
    const radioItems = labRates.filter((l: any) => l.category === 'Radiology');
    const updated = [...INITIAL_PATHOLOGY_MASTER_TESTS, ...radioItems];
    setLabRates(updated);
    storage.set(STORAGE_KEYS.LAB_RATES, updated);
    toast.success(`Restored 288 Pathology Master Tests successfully!`);
  };

  const handleResetRadiologyMaster = () => {
    const pathItems = labRates.filter((l: any) => l.category !== 'Radiology');
    const updated = [...pathItems, ...INITIAL_RADIOLOGY_MASTER_TESTS];
    setLabRates(updated);
    storage.set(STORAGE_KEYS.LAB_RATES, updated);
    toast.success(`Restored all ${INITIAL_RADIOLOGY_MASTER_TESTS.length} Radiology Master Tests successfully!`);
  };

  const handleAddMaterial = () => {
    if (!newMaterial.name.trim() || !newMaterial.price) {
      toast.error('Please enter material name and price');
      return;
    }
    const newItem = {
      name: newMaterial.name.trim(),
      category: newMaterial.category,
      price: parseFloat(newMaterial.price) || 0
    };
    const updated = [...materialRates, newItem];
    setMaterialRates(updated);
    storage.set(STORAGE_KEYS.MATERIAL_RATES, updated);
    setNewMaterial({ name: '', category: 'Disposable', price: '' });
    toast.success(`Material/Supply "${newItem.name}" added!`);
  };

  // Start inline edit
  const startEdit = (item: any) => {
    setEditingId(item.id || item.name);
    setEditFormData({ ...item });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditFormData({});
  };

  const saveEdit = (section: 'gastro' | 'hospital' | 'cardio' | 'procedure' | 'lab' | 'material') => {
    if (section === 'gastro') {
      const updated = gastroServices.map(s => s.id === editingId ? { ...editFormData, charges: parseFloat(editFormData.charges) || 0 } : s);
      setGastroServices(updated);
      storage.set(STORAGE_KEYS.GASTRO_SERVICES_RATES, updated);
    } else if (section === 'hospital') {
      const updated = hospitalRoomRates.map(s => s.id === editingId ? { ...editFormData, charges: parseFloat(editFormData.charges) || 0 } : s);
      setHospitalRoomRates(updated);
      storage.set(STORAGE_KEYS.HOSPITAL_ROOM_RATES, updated);
    } else if (section === 'cardio') {
      const updated = cardiologyRates.map(s => s.id === editingId ? { ...editFormData, charges: parseFloat(editFormData.charges) || 0 } : s);
      setCardiologyRates(updated);
      storage.set(STORAGE_KEYS.CARDIOLOGY_EQUIPMENT_RATES, updated);
    } else if (section === 'procedure') {
      const updated = clinicalProcedures.map(s => s.id === editingId ? { ...editFormData, charges: parseFloat(editFormData.charges) || 0 } : s);
      setClinicalProcedures(updated);
      storage.set(STORAGE_KEYS.CLINICAL_PROCEDURE_RATES, updated);
    } else if (section === 'lab') {
      const updated = labRates.map(s => (s.id || s.name) === editingId ? { 
        ...s, 
        name: editFormData.name !== undefined ? editFormData.name : s.name,
        price: parseFloat(editFormData.price) || 0,
        vial: editFormData.vial !== undefined ? editFormData.vial : s.vial
      } : s);
      setLabRates(updated);
      storage.set(STORAGE_KEYS.LAB_RATES, updated);
    } else if (section === 'material') {
      const updated = materialRates.map(s => s.name === editingId ? { ...editFormData, price: parseFloat(editFormData.price) || 0 } : s);
      setMaterialRates(updated);
      storage.set(STORAGE_KEYS.MATERIAL_RATES, updated);
    }
    setEditingId(null);
    setEditFormData({});
    toast.success('Rate details updated successfully');
  };

  const totalTariffCount = gastroServices.length + hospitalRoomRates.length + labRates.length + cardiologyRates.length + clinicalProcedures.length + materialRates.length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Header */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl border border-sky-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-sky-500/20 text-sky-300 rounded-xl border border-sky-400/30">
                <Receipt className="w-6 h-6" />
              </span>
              <div>
                <h2 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  Hospital Master Tariff & Billing Rates
                  <Badge className="bg-sky-400/20 text-sky-200 border-sky-300/30 text-xs font-mono">
                    {totalTariffCount} Services Configured
                  </Badge>
                </h2>
                <p className="text-xs md:text-sm text-slate-300">
                  Official hospital rate schedule for Gastroenterology, IPD Rooms, Cardiology, ICU Equipment, Clinical Procedures & Billing Policies.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button 
              onClick={onPrintTariff} 
              variant="outline" 
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 shadow-sm gap-2 h-10 px-4 font-semibold text-xs rounded-xl"
            >
              <Printer className="w-4 h-4 text-sky-300" />
              Print Official Tariff List
            </Button>

            <Button 
              onClick={onExportExcel} 
              variant="outline" 
              className="bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 shadow-sm gap-2 h-10 px-4 font-semibold text-xs rounded-xl"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export Tariff to Excel
            </Button>

            {!isAccountant && (
              <Button 
                onClick={onRestoreMaster} 
                variant="outline" 
                className="bg-rose-950/40 hover:bg-rose-900/60 text-rose-200 border-rose-800/50 shadow-sm gap-1.5 h-10 px-3 font-medium text-xs rounded-xl"
                title="Restore default official rates from hospital tariff master card"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset to Official Master
              </Button>
            )}
          </div>
        </div>

        {/* Global Search & Filter Tabs */}
        <div className="mt-6 pt-5 border-t border-sky-800/40 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative md:col-span-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input 
              placeholder="Search across all services, codes, charges..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-11 bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-400 rounded-xl text-xs font-medium focus:ring-sky-500"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="md:col-span-2 flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            <button 
              onClick={() => setActiveCategory('all')} 
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeCategory === 'all' 
                  ? 'bg-sky-500 text-white shadow-md' 
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
              }`}
            >
              All Sections ({totalTariffCount})
            </button>
            <button 
              onClick={() => setActiveCategory('gastro')} 
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeCategory === 'gastro' 
                  ? 'bg-sky-500 text-white shadow-md' 
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              1. Gastroenterology ({gastroServices.length})
            </button>
            <button 
              onClick={() => setActiveCategory('hospital')} 
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeCategory === 'hospital' 
                  ? 'bg-sky-500 text-white shadow-md' 
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              2. Hospital & Rooms ({hospitalRoomRates.length})
            </button>
            <button 
              onClick={() => setActiveCategory('lab')} 
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeCategory === 'lab' 
                  ? 'bg-sky-500 text-white shadow-md' 
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Microscope className="w-3.5 h-3.5" />
              3. Pathology & Lab ({labRates.filter((l: any) => l.category !== 'Radiology').length})
            </button>
            <button 
              onClick={() => setActiveCategory('radiology')} 
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeCategory === 'radiology' 
                  ? 'bg-sky-500 text-white shadow-md' 
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              4. Radiology ({labRates.filter((l: any) => l.category === 'Radiology').length})
            </button>
            <button 
              onClick={() => setActiveCategory('cardio')} 
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeCategory === 'cardio' 
                  ? 'bg-sky-500 text-white shadow-md' 
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <HeartPulse className="w-3.5 h-3.5" />
              5. Cardiology & ICU ({cardiologyRates.length})
            </button>
            <button 
              onClick={() => setActiveCategory('procedures')} 
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeCategory === 'procedures' 
                  ? 'bg-sky-500 text-white shadow-md' 
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Syringe className="w-3.5 h-3.5" />
              6. Clinical Procedures ({clinicalProcedures.length})
            </button>
            <button 
              onClick={() => setActiveCategory('policy')} 
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeCategory === 'policy' 
                  ? 'bg-sky-500 text-white shadow-md' 
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Percent className="w-3.5 h-3.5" />
              Billing Policies
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: GASTROENTEROLOGY SERVICES (S.NO 1 - 21) */}
      {(activeCategory === 'all' || activeCategory === 'gastro') && (
        <Card className="border border-sky-100 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-sky-50/70 via-white to-sky-50/40 border-b border-sky-100 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-black shadow-md shadow-sky-600/20">
                  1
                </div>
                <div>
                  <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
                    Gastroenterology Services & Endoscopy Procedures
                    <Badge className="bg-sky-100 text-sky-800 font-mono text-[10px]">S.No. 1 - 21</Badge>
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Diagnostic endoscopy, colonoscopy, ERCP, banding, glue injection, dilatation, and follow-up terms.
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-xs font-semibold px-3 py-1 bg-white border-sky-200 text-sky-700 self-start sm:self-auto">
                {filteredGastro.length} Services Listed
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-5">
            {/* Add New Gastro Service Form */}
            {!isAccountant && (
              <div className="p-4 bg-sky-50/40 rounded-xl border border-sky-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-sky-600" />
                    Add Gastroenterology Service / Procedure
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                  <div className="lg:col-span-2 space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600">Service Name *</Label>
                    <Input 
                      placeholder="e.g. Endoscopy With Biopsy"
                      value={newGastro.service}
                      onChange={(e) => setNewGastro({ ...newGastro, service: e.target.value })}
                      className="h-10 text-xs bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600">Category</Label>
                    <Select value={newGastro.category} onValueChange={(v) => setNewGastro({ ...newGastro, category: v })}>
                      <SelectTrigger className="h-10 text-xs bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Diagnostic GI">Diagnostic GI</SelectItem>
                        <SelectItem value="Therapeutic GI">Therapeutic GI</SelectItem>
                        <SelectItem value="Advanced Endoscopy">Advanced Endoscopy</SelectItem>
                        <SelectItem value="Consultation">Consultation</SelectItem>
                        <SelectItem value="Gastroenterology">Gastroenterology</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600">Primary Charges (₹) *</Label>
                    <Input 
                      type="number"
                      placeholder="e.g. 2000"
                      value={newGastro.charges}
                      onChange={(e) => setNewGastro({ ...newGastro, charges: e.target.value })}
                      className="h-10 text-xs bg-white font-bold text-sky-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600">Follow-up Charges (₹)</Label>
                    <Input 
                      type="number"
                      placeholder="After 7 days"
                      value={newGastro.followUpCharges}
                      onChange={(e) => setNewGastro({ ...newGastro, followUpCharges: e.target.value })}
                      className="h-10 text-xs bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600">Sedation Fee (₹)</Label>
                    <Input 
                      type="number"
                      placeholder="e.g. 2000"
                      value={newGastro.sedationCharges}
                      onChange={(e) => setNewGastro({ ...newGastro, sedationCharges: e.target.value })}
                      className="h-10 text-xs bg-white"
                    />
                  </div>
                  <div className="lg:col-span-5 space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600">Special Remarks / Extra Charges Note</Label>
                    <Input 
                      placeholder="e.g. Extra charge for clip, loop, glue, kit, etc."
                      value={newGastro.extraChargesNote}
                      onChange={(e) => setNewGastro({ ...newGastro, extraChargesNote: e.target.value })}
                      className="h-10 text-xs bg-white"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleAddGastro} className="w-full h-10 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs">
                      <Plus className="w-4 h-4 mr-1" /> Add Service
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Table of Gastro Services */}
            <div className="rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-3 px-3 text-center w-14">S.No.</th>
                      <th className="py-3 px-4">Service / Procedure</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-4 text-right">Charges (₹)</th>
                      <th className="py-3 px-3 text-right">After 7 Days (₹)</th>
                      <th className="py-3 px-3 text-right">Sedation (₹)</th>
                      <th className="py-3 px-4">Special Remarks / Policy</th>
                      {!isAccountant && <th className="py-3 px-3 text-center w-24">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredGastro.map((item) => {
                      const isEditing = editingId === item.id;
                      return (
                        <tr key={item.id} className="hover:bg-sky-50/30 transition-colors">
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-500">
                            {item.no || '-'}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800">
                            {isEditing ? (
                              <Input 
                                value={editFormData.service} 
                                onChange={(e) => setEditFormData({ ...editFormData, service: e.target.value })}
                                className="h-8 text-xs bg-white"
                              />
                            ) : (
                              <div>
                                <span>{item.service}</span>
                                {item.rangeText && (
                                  <span className="block text-[10px] text-slate-400 font-medium">{item.rangeText}</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant="secondary" className="text-[10px] font-semibold bg-slate-100 text-slate-700">
                              {item.category || 'GI'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-sky-700">
                            {isEditing ? (
                              <Input 
                                type="number"
                                value={editFormData.charges} 
                                onChange={(e) => setEditFormData({ ...editFormData, charges: e.target.value })}
                                className="h-8 text-xs bg-white text-right font-bold w-24 ml-auto"
                              />
                            ) : (
                              `₹${item.charges.toLocaleString('en-IN')}`
                            )}
                          </td>
                          <td className="py-3 px-3 text-right text-slate-600 font-medium">
                            {isEditing ? (
                              <Input 
                                type="number"
                                value={editFormData.followUpCharges || ''} 
                                onChange={(e) => setEditFormData({ ...editFormData, followUpCharges: e.target.value ? parseFloat(e.target.value) : undefined })}
                                className="h-8 text-xs bg-white text-right w-20 ml-auto"
                              />
                            ) : item.followUpCharges ? (
                              `₹${item.followUpCharges.toLocaleString('en-IN')}`
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right text-slate-600">
                            {isEditing ? (
                              <Input 
                                type="number"
                                value={editFormData.sedationCharges || ''} 
                                onChange={(e) => setEditFormData({ ...editFormData, sedationCharges: parseFloat(e.target.value) || 0 })}
                                className="h-8 text-xs bg-white text-right w-20 ml-auto"
                              />
                            ) : item.sedationCharges ? (
                              `₹${item.sedationCharges.toLocaleString('en-IN')}`
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-600 text-[11px]">
                            {isEditing ? (
                              <Input 
                                value={editFormData.extraChargesNote || editFormData.notes || ''} 
                                onChange={(e) => setEditFormData({ ...editFormData, extraChargesNote: e.target.value })}
                                className="h-8 text-xs bg-white"
                              />
                            ) : (
                              <div className="space-y-0.5">
                                {item.extraChargesNote && (
                                  <span className="inline-block font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 mr-1.5">
                                    {item.extraChargesNote}
                                  </span>
                                )}
                                {item.notes && item.notes !== item.extraChargesNote && (
                                  <span className="text-slate-500">{item.notes}</span>
                                )}
                              </div>
                            )}
                          </td>
                          {!isAccountant && (
                            <td className="py-3 px-3 text-center">
                              {isEditing ? (
                                <div className="flex items-center justify-center gap-1">
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600 hover:bg-emerald-50" onClick={() => saveEdit('gastro')}>
                                    <Check className="w-4 h-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:bg-slate-100" onClick={cancelEdit}>
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-1">
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-sky-600 hover:bg-sky-50" onClick={() => startEdit(item)}>
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-500 hover:bg-rose-50" onClick={() => {
                                    const updated = gastroServices.filter(s => s.id !== item.id);
                                    setGastroServices(updated);
                                    storage.set(STORAGE_KEYS.GASTRO_SERVICES_RATES, updated);
                                    toast.success('Service removed');
                                  }}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SECTION 2: HOSPITAL CHARGES & IPD ROOM RATES (S.NO 21 - 34) */}
      {(activeCategory === 'all' || activeCategory === 'hospital') && (
        <Card className="border border-emerald-100 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-emerald-50/70 via-white to-emerald-50/40 border-b border-emerald-100 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-md shadow-emerald-600/20">
                  2
                </div>
                <div>
                  <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
                    Hospital Charges & IPD Room Rates
                    <Badge className="bg-emerald-100 text-emerald-800 font-mono text-[10px]">S.No. 21 - 34</Badge>
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    General Ward, Semi Private, Private, Deluxe, ICU, Doctor Visits, Nursing, RMO & OT charges.
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-xs font-semibold px-3 py-1 bg-white border-emerald-200 text-emerald-700 self-start sm:self-auto">
                {filteredRooms.length} Hospital Services Listed
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-5">
            {/* Add New Room / Hospital Service */}
            {!isAccountant && (
              <div className="p-4 bg-emerald-50/40 rounded-xl border border-emerald-100 space-y-3">
                <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-emerald-600" />
                  Add Room / Hospital Service Charge
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div className="lg:col-span-2 space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600">Service / Bed Type *</Label>
                    <Input 
                      placeholder="e.g. VIP Suite / Special Ward"
                      value={newRoom.service}
                      onChange={(e) => setNewRoom({ ...newRoom, service: e.target.value })}
                      className="h-10 text-xs bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600">Charges (₹) *</Label>
                    <Input 
                      type="number"
                      placeholder="e.g. 3500"
                      value={newRoom.charges}
                      onChange={(e) => setNewRoom({ ...newRoom, charges: e.target.value })}
                      className="h-10 text-xs bg-white font-bold text-emerald-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600">Billing Unit</Label>
                    <Select value={newRoom.billingUnit} onValueChange={(v) => setNewRoom({ ...newRoom, billingUnit: v })}>
                      <SelectTrigger className="h-10 text-xs bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Per Day">Per Day</SelectItem>
                        <SelectItem value="Per Visit">Per Visit</SelectItem>
                        <SelectItem value="Per Surgery">Per Surgery</SelectItem>
                        <SelectItem value="One Time">One Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleAddRoom} className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs">
                      <Plus className="w-4 h-4 mr-1" /> Add Charge
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Room Charges Table */}
            <div className="rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-3 px-3 text-center w-14">S.No.</th>
                      <th className="py-3 px-4">Service Description</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-4 text-right">Charges (₹)</th>
                      <th className="py-3 px-3">Billing Unit</th>
                      <th className="py-3 px-4">Remarks</th>
                      {!isAccountant && <th className="py-3 px-3 text-center w-24">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRooms.map((item) => {
                      const isEditing = editingId === item.id;
                      return (
                        <tr key={item.id} className="hover:bg-emerald-50/30 transition-colors">
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-500">
                            {item.no || '-'}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800">
                            {isEditing ? (
                              <Input 
                                value={editFormData.service} 
                                onChange={(e) => setEditFormData({ ...editFormData, service: e.target.value })}
                                className="h-8 text-xs bg-white"
                              />
                            ) : (
                              item.service
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant="secondary" className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-100">
                              {item.category || 'Room/Bed'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-700">
                            {isEditing ? (
                              <Input 
                                type="number"
                                value={editFormData.charges} 
                                onChange={(e) => setEditFormData({ ...editFormData, charges: e.target.value })}
                                className="h-8 text-xs bg-white text-right font-bold w-24 ml-auto"
                              />
                            ) : item.charges === 0 ? (
                              <span className="text-amber-700 font-semibold italic">As Per Surgery</span>
                            ) : (
                              `₹${item.charges.toLocaleString('en-IN')}`
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-600 font-medium">
                            {item.billingUnit || 'Per Day'}
                          </td>
                          <td className="py-3 px-4 text-slate-500 text-[11px]">
                            {isEditing ? (
                              <Input 
                                value={editFormData.notes || ''} 
                                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                                className="h-8 text-xs bg-white"
                              />
                            ) : (
                              item.notes || '-'
                            )}
                          </td>
                          {!isAccountant && (
                            <td className="py-3 px-3 text-center">
                              {isEditing ? (
                                <div className="flex items-center justify-center gap-1">
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600 hover:bg-emerald-50" onClick={() => saveEdit('hospital')}>
                                    <Check className="w-4 h-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:bg-slate-100" onClick={cancelEdit}>
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-1">
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600 hover:bg-emerald-50" onClick={() => startEdit(item)}>
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-500 hover:bg-rose-50" onClick={() => {
                                    const updated = hospitalRoomRates.filter(s => s.id !== item.id);
                                    setHospitalRoomRates(updated);
                                    storage.set(STORAGE_KEYS.HOSPITAL_ROOM_RATES, updated);
                                    toast.success('Hospital charge item removed');
                                  }}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SECTION 3: PATHOLOGY & LABORATORY RATE SCHEDULE (288 TESTS) */}
      {(activeCategory === 'all' || activeCategory === 'lab') && (
        <Card className="border border-teal-100 shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-gradient-to-r from-teal-50/80 via-white to-cyan-50/50 border-b border-teal-100 pb-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black shadow-md shadow-teal-600/20">
                  3
                </div>
                <div>
                  <CardTitle className="text-base font-black text-slate-800 flex items-center gap-2">
                    Pathology & Laboratory Tariff Master
                    <Badge className="bg-teal-100 text-teal-800 border-teal-200 font-mono text-[11px]">
                      {filteredPathology.length} Tests Available
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Tariff rates for Hematology, Biochemistry, Serology, Hormones, Urine/Stool and Specialized Tests with sample vial specifications.
                  </CardDescription>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!isAccountant && (
                  <Button 
                    onClick={handleResetPathologyMaster}
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs font-semibold border-teal-200 text-teal-700 bg-teal-50/50 hover:bg-teal-100"
                    title="Reload original 288 master tests list"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                    Restore 288 Master Tests
                  </Button>
                )}
              </div>
            </div>

            {/* Quick Add Pathology Test Form */}
            {!isAccountant && (
              <div className="mt-4 pt-4 border-t border-teal-100/70 bg-white/70 p-3.5 rounded-xl border border-teal-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-teal-600" />
                    Add New Pathology Test
                  </span>
                  <span className="text-[11px] text-slate-400">Instantly persists into Tariff & Lab Master</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-5 space-y-1">
                    <Label className="text-[10px] font-semibold text-slate-600">Test Name *</Label>
                    <Input 
                      placeholder="e.g. D-DIMER QUANTITATIVE"
                      value={newLab.name}
                      onChange={(e) => setNewLab({ ...newLab, name: e.target.value })}
                      className="h-9 text-xs bg-white uppercase"
                    />
                  </div>
                  <div className="sm:col-span-3 space-y-1">
                    <Label className="text-[10px] font-semibold text-slate-600">Charges (₹) *</Label>
                    <Input 
                      type="number"
                      placeholder="e.g. 800"
                      value={newLab.price}
                      onChange={(e) => setNewLab({ ...newLab, price: e.target.value })}
                      className="h-9 text-xs bg-white font-bold text-teal-700"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-[10px] font-semibold text-slate-600">Vial / Sample Type</Label>
                    <Select 
                      value={newLab.vial || 'EDTA'} 
                      onValueChange={(val) => setNewLab({ ...newLab, vial: val })}
                    >
                      <SelectTrigger className="h-9 text-xs bg-white">
                        <SelectValue placeholder="Vial" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EDTA">EDTA (Lavender)</SelectItem>
                        <SelectItem value="PLAIN">PLAIN (Clot/SST Red)</SelectItem>
                        <SelectItem value="FLU">FLU (Sodium Fluoride Grey)</SelectItem>
                        <SelectItem value="CON.">CON. (Sterile Container)</SelectItem>
                        <SelectItem value="CITRATE">CITRATE (Light Blue)</SelectItem>
                        <SelectItem value="HEPARIN">HEPARIN (Green)</SelectItem>
                        <SelectItem value="SWAB">SWAB / Culture</SelectItem>
                        <SelectItem value="SLIDE">SLIDE / Smear</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2 flex items-end">
                    <Button onClick={handleAddLab} className="w-full h-9 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add Test
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Vial Filter Chips */}
            <div className="mt-3 flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Filter by Vial:
              </span>
              <button
                onClick={() => { setPathologyVialFilter('ALL'); setPathologyPage(1); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  pathologyVialFilter === 'ALL'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Vials ({labRates.filter((l: any) => l.category !== 'Radiology').length})
              </button>
              <button
                onClick={() => { setPathologyVialFilter('EDTA'); setPathologyPage(1); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  pathologyVialFilter === 'EDTA'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-purple-50 text-purple-700 border border-purple-200/60 hover:bg-purple-100'
                }`}
              >
                EDTA ({labRates.filter((l: any) => l.category !== 'Radiology' && (l.vial || '').toUpperCase().includes('EDTA')).length})
              </button>
              <button
                onClick={() => { setPathologyVialFilter('PLAIN'); setPathologyPage(1); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  pathologyVialFilter === 'PLAIN'
                    ? 'bg-rose-700 text-white shadow-xs'
                    : 'bg-rose-50 text-rose-700 border border-rose-200/60 hover:bg-rose-100'
                }`}
              >
                Plain Clot / SST ({labRates.filter((l: any) => l.category !== 'Radiology' && ((l.vial || '').toUpperCase().includes('PLAIN') || (l.vial || '').toUpperCase().includes('CLOT') || (l.vial || '').toUpperCase().includes('SST'))).length})
              </button>
              <button
                onClick={() => { setPathologyVialFilter('FLU'); setPathologyPage(1); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  pathologyVialFilter === 'FLU'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                }`}
              >
                Fluoride Sugar ({labRates.filter((l: any) => l.category !== 'Radiology' && (l.vial || '').toUpperCase().includes('FLU')).length})
              </button>
              <button
                onClick={() => { setPathologyVialFilter('CON'); setPathologyPage(1); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  pathologyVialFilter === 'CON'
                    ? 'bg-amber-700 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                Container Urine/Stool ({labRates.filter((l: any) => l.category !== 'Radiology' && ((l.vial || '').toUpperCase().includes('CON') || (l.vial || '').toUpperCase().includes('CONTAINER'))).length})
              </button>
              <button
                onClick={() => { setPathologyVialFilter('CITRATE'); setPathologyPage(1); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  pathologyVialFilter === 'CITRATE'
                    ? 'bg-sky-700 text-white shadow-xs'
                    : 'bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100'
                }`}
              >
                Citrate ({labRates.filter((l: any) => l.category !== 'Radiology' && ((l.vial || '').toUpperCase().includes('CIT') || (l.vial || '').toUpperCase().includes('STC'))).length})
              </button>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-5 space-y-4">
            <div className="rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-3 px-3 text-center w-14">S.No.</th>
                      <th className="py-3 px-4">Test Name & Description</th>
                      <th className="py-3 px-3 w-40">Sample / Vial Type</th>
                      <th className="py-3 px-3 w-28">Category</th>
                      <th className="py-3 px-4 text-right w-28">Tariff (₹)</th>
                      {!isAccountant && <th className="py-3 px-3 text-center w-24">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedPathology.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500 font-medium">
                          No pathology tests match your search criteria.
                        </td>
                      </tr>
                    ) : (
                      paginatedPathology.map((item: any, idx: number) => {
                        const isEditing = editingId === (item.id || item.name);
                        const globalIndex = pathologyPageSize === -1 ? idx + 1 : (pathologyPage - 1) * pathologyPageSize + idx + 1;
                        const vialUpper = (item.vial || '').toUpperCase();
                        
                        let vialBadgeClass = "bg-slate-100 text-slate-700 border-slate-200";
                        if (vialUpper.includes('EDTA')) {
                          vialBadgeClass = "bg-purple-100 text-purple-900 border-purple-200";
                        } else if (vialUpper.includes('PLAIN') || vialUpper.includes('CLOT') || vialUpper.includes('SST')) {
                          vialBadgeClass = "bg-rose-100 text-rose-900 border-rose-200";
                        } else if (vialUpper.includes('FLU')) {
                          vialBadgeClass = "bg-slate-200 text-slate-900 border-slate-300";
                        } else if (vialUpper.includes('CON')) {
                          vialBadgeClass = "bg-amber-100 text-amber-900 border-amber-200";
                        } else if (vialUpper.includes('CIT') || vialUpper.includes('STC')) {
                          vialBadgeClass = "bg-sky-100 text-sky-900 border-sky-200";
                        }

                        return (
                          <tr key={item.id || item.name || idx} className="hover:bg-teal-50/30 transition-colors">
                            <td className="py-3 px-3 text-center font-mono font-bold text-slate-500">
                              {item.no || globalIndex}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-800">
                              {isEditing ? (
                                <Input 
                                  value={editFormData.name} 
                                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                  className="h-8 text-xs bg-white font-bold"
                                />
                              ) : (
                                <div>
                                  <span className="text-slate-900 font-bold">{item.name}</span>
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              {isEditing ? (
                                <Input 
                                  value={editFormData.vial || ''} 
                                  placeholder="e.g. EDTA / PLAIN"
                                  onChange={(e) => setEditFormData({ ...editFormData, vial: e.target.value })}
                                  className="h-8 text-xs bg-white"
                                />
                              ) : (
                                <Badge variant="outline" className={`text-[10px] font-bold ${vialBadgeClass}`}>
                                  {formatVialLabel(item.vial)}
                                </Badge>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <Badge variant="secondary" className="text-[10px] font-semibold bg-teal-50 text-teal-800 border border-teal-100">
                                Pathology
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-teal-700">
                              {isEditing ? (
                                <Input 
                                  type="number"
                                  value={editFormData.price} 
                                  onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
                                  className="h-8 text-xs bg-white text-right font-bold w-24 ml-auto"
                                />
                              ) : (
                                `₹${(item.price || 0).toLocaleString('en-IN')}`
                              )}
                            </td>
                            {!isAccountant && (
                              <td className="py-3 px-3 text-center">
                                {isEditing ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-teal-600 hover:bg-teal-50" onClick={() => saveEdit('lab')}>
                                      <Check className="w-4 h-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:bg-slate-100" onClick={cancelEdit}>
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-1">
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-teal-600 hover:bg-teal-50" onClick={() => startEdit(item)} title="Edit Test Rate">
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-500 hover:bg-rose-50" onClick={() => handleDeleteLab(item)} title="Delete Test">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination Controls */}
            {filteredPathology.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span>Showing</span>
                  <Select 
                    value={String(pathologyPageSize)} 
                    onValueChange={(v) => {
                      setPathologyPageSize(Number(v));
                      setPathologyPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 w-20 text-xs bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="-1">All ({filteredPathology.length})</SelectItem>
                    </SelectContent>
                  </Select>
                  <span>tests per page (Total {filteredPathology.length} tests)</span>
                </div>

                {pathologyPageSize !== -1 && totalPathologyPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setPathologyPage(p => Math.max(1, p - 1))}
                      disabled={pathologyPage <= 1}
                      className="h-8 px-3 text-xs"
                    >
                      Previous
                    </Button>
                    <span className="font-semibold px-2">
                      Page {pathologyPage} of {totalPathologyPages}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setPathologyPage(p => Math.min(totalPathologyPages, p + 1))}
                      disabled={pathologyPage >= totalPathologyPages}
                      className="h-8 px-3 text-xs"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* SECTION 4 & 5: RADIOLOGY & CARDIOLOGY (2 COLUMNS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radiology Section (S.NO 35 - 36) */}
        {(activeCategory === 'all' || activeCategory === 'radiology') && (
          <Card className="border border-indigo-100 shadow-sm rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-gradient-to-r from-indigo-50/70 via-white to-indigo-50/40 border-b border-indigo-100 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-md shadow-indigo-600/20">
                    4
                  </div>
                  <div>
                    <CardTitle className="text-base font-black text-slate-800 flex items-center gap-1.5">
                      Radiology & Imaging Tariff
                      <Badge className="bg-indigo-100 text-indigo-800 font-mono text-[10px]">{filteredRadiology.length} Items</Badge>
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Fibroscan (₹5,500), X-Ray (₹400), Ultrasound, CT Scans & Special Imaging.
                    </CardDescription>
                  </div>
                </div>

                {!isAccountant && (
                  <Button 
                    onClick={handleResetRadiologyMaster}
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs font-semibold border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100"
                    title="Reload all Radiology Master Tests"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1 text-indigo-600" /> Sync Radiology Masters
                  </Button>
                )}
              </div>

              {/* Quick Add Radiology */}
              {!isAccountant && (
                <div className="mt-3 pt-3 border-t border-indigo-100/80 bg-indigo-50/40 p-2.5 rounded-xl border border-indigo-100 space-y-2">
                  <span className="text-[11px] font-bold text-indigo-900 flex items-center gap-1">
                    <Plus className="w-3 h-3 text-indigo-600" /> Add Imaging / Radiology Service
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-5">
                      <Input 
                        placeholder="Service Name (e.g. USG ABDOMEN)"
                        value={newRadio.name}
                        onChange={(e) => setNewRadio({ ...newRadio, name: e.target.value })}
                        className="h-8 text-xs bg-white uppercase"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <Input 
                        type="number"
                        placeholder="Charges ₹"
                        value={newRadio.price}
                        onChange={(e) => setNewRadio({ ...newRadio, price: e.target.value })}
                        className="h-8 text-xs bg-white font-bold text-indigo-700"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <Button onClick={handleAddRadio} className="w-full h-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs">
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-4">
              <div className="rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3">Service / Procedure</th>
                      <th className="py-2.5 px-3 text-right">Charges (₹)</th>
                      {!isAccountant && <th className="py-2.5 px-3 text-center w-20">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRadiology.map((item: any) => {
                      const isEditing = editingId === (item.id || item.name);
                      return (
                        <tr key={item.id || item.name} className="hover:bg-indigo-50/30 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-slate-800">
                            {isEditing ? (
                              <Input 
                                value={editFormData.name} 
                                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                className="h-7 text-xs bg-white"
                              />
                            ) : (
                              <div>
                                <span>{item.name}</span>
                                {item.vial && <span className="block text-[10px] text-indigo-600 font-medium">{item.vial}</span>}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-indigo-700">
                            {isEditing ? (
                              <Input 
                                type="number"
                                value={editFormData.price} 
                                onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
                                className="h-7 text-xs bg-white text-right font-bold w-20 ml-auto"
                              />
                            ) : (
                              `₹${(item.price || 0).toLocaleString('en-IN')}`
                            )}
                          </td>
                          {!isAccountant && (
                            <td className="py-2.5 px-3 text-center">
                              {isEditing ? (
                                <div className="flex items-center justify-center gap-1">
                                  <Button size="icon" variant="ghost" className="h-6 w-6 text-indigo-600" onClick={() => saveEdit('lab')}>
                                    <Check className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-400" onClick={cancelEdit}>
                                    <X className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-1">
                                  <Button size="icon" variant="ghost" className="h-6 w-6 text-indigo-600 hover:bg-indigo-50" onClick={() => startEdit(item)} title="Edit Rate">
                                    <Edit2 className="w-3 h-3" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-6 w-6 text-rose-500 hover:bg-rose-50" onClick={() => handleDeleteLab(item)} title="Delete Service">
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cardiology & Equipment Section (S.NO 37 - 45) */}
        {(activeCategory === 'all' || activeCategory === 'cardio') && (
          <Card className="border border-rose-100 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-rose-50/70 via-white to-rose-50/40 border-b border-rose-100 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black shadow-md shadow-rose-600/20">
                    4
                  </div>
                  <div>
                    <CardTitle className="text-base font-black text-slate-800 flex items-center gap-1.5">
                      Cardiology & ICU Equipment
                      <Badge className="bg-rose-100 text-rose-800 font-mono text-[10px]">S.No. 37 - 45</Badge>
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      ECG, Multipara Monitor, Syringe Pump, Ventilator, BiPAP, CPAP, Oxygen.
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-4">
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-2 text-center w-10">S.No.</th>
                      <th className="py-2.5 px-3">Equipment / Service</th>
                      <th className="py-2.5 px-3 text-right">Charges (₹)</th>
                      <th className="py-2.5 px-2">Unit</th>
                      {!isAccountant && <th className="py-2.5 px-2 text-center w-16">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCardio.map((item) => {
                      const isEditing = editingId === item.id;
                      return (
                        <tr key={item.id} className="hover:bg-rose-50/30">
                          <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-500">
                            {item.no || '-'}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-800">
                            {isEditing ? (
                              <Input 
                                value={editFormData.service} 
                                onChange={(e) => setEditFormData({ ...editFormData, service: e.target.value })}
                                className="h-7 text-xs bg-white"
                              />
                            ) : (
                              item.service
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-rose-700">
                            {isEditing ? (
                              <Input 
                                type="number"
                                value={editFormData.charges} 
                                onChange={(e) => setEditFormData({ ...editFormData, charges: e.target.value })}
                                className="h-7 text-xs bg-white text-right font-bold w-20 ml-auto"
                              />
                            ) : (
                              `₹${item.charges.toLocaleString('en-IN')}`
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-slate-500 text-[10px]">
                            {item.billingUnit || 'Each'}
                          </td>
                          {!isAccountant && (
                            <td className="py-2.5 px-2 text-center">
                              {isEditing ? (
                                <div className="flex items-center justify-center gap-1">
                                  <Button size="icon" variant="ghost" className="h-6 w-6 text-rose-600" onClick={() => saveEdit('cardio')}>
                                    <Check className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-400" onClick={cancelEdit}>
                                    <X className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              ) : (
                                <Button size="icon" variant="ghost" className="h-6 w-6 text-rose-600 hover:bg-rose-50" onClick={() => startEdit(item)}>
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* SECTION 5: CLINICAL PROCEDURES (S.NO 46 - 54) */}
      {(activeCategory === 'all' || activeCategory === 'procedures') && (
        <Card className="border border-purple-100 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-purple-50/70 via-white to-purple-50/40 border-b border-purple-100 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black shadow-md shadow-purple-600/20">
                  5
                </div>
                <div>
                  <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
                    Clinical Procedures & Nursing Interventions
                    <Badge className="bg-purple-100 text-purple-800 font-mono text-[10px]">S.No. 46 - 54</Badge>
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Central Line (₹2,500), Intubation (₹1,500), Stitching (₹500), Ascitic/Pleural Tapping, Foley's, Ryle's Tube, Dressings.
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-xs font-semibold px-3 py-1 bg-white border-purple-200 text-purple-700 self-start sm:self-auto">
                {filteredProcedures.length} Procedures Configured
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-5">
            {/* Add Procedure Form */}
            {!isAccountant && (
              <div className="p-4 bg-purple-50/40 rounded-xl border border-purple-100 space-y-3">
                <span className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-purple-600" />
                  Add Clinical Procedure
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div className="lg:col-span-2 space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600">Procedure Name *</Label>
                    <Input 
                      placeholder="e.g. Lumbar Puncture / Bone Marrow Biopsy"
                      value={newProc.service}
                      onChange={(e) => setNewProc({ ...newProc, service: e.target.value })}
                      className="h-10 text-xs bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600">Charges (₹) *</Label>
                    <Input 
                      type="number"
                      placeholder="e.g. 1500"
                      value={newProc.charges}
                      onChange={(e) => setNewProc({ ...newProc, charges: e.target.value })}
                      className="h-10 text-xs bg-white font-bold text-purple-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600">Clinical Scope / Notes</Label>
                    <Input 
                      placeholder="Notes or materials required"
                      value={newProc.notes}
                      onChange={(e) => setNewProc({ ...newProc, notes: e.target.value })}
                      className="h-10 text-xs bg-white"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleAddProc} className="w-full h-10 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs">
                      <Plus className="w-4 h-4 mr-1" /> Add Procedure
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Procedures Table */}
            <div className="rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-3 px-3 text-center w-14">S.No.</th>
                      <th className="py-3 px-4">Procedure Description</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-4 text-right">Charges (₹)</th>
                      <th className="py-3 px-4">Clinical Details / Scope</th>
                      {!isAccountant && <th className="py-3 px-3 text-center w-24">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProcedures.map((item) => {
                      const isEditing = editingId === item.id;
                      return (
                        <tr key={item.id} className="hover:bg-purple-50/30 transition-colors">
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-500">
                            {item.no || '-'}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800">
                            {isEditing ? (
                              <Input 
                                value={editFormData.service} 
                                onChange={(e) => setEditFormData({ ...editFormData, service: e.target.value })}
                                className="h-8 text-xs bg-white"
                              />
                            ) : (
                              item.service
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant="secondary" className="text-[10px] font-semibold bg-purple-50 text-purple-800 border border-purple-100">
                              {item.category || 'Procedure'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-purple-700">
                            {isEditing ? (
                              <Input 
                                type="number"
                                value={editFormData.charges} 
                                onChange={(e) => setEditFormData({ ...editFormData, charges: e.target.value })}
                                className="h-8 text-xs bg-white text-right font-bold w-24 ml-auto"
                              />
                            ) : (
                              `₹${item.charges.toLocaleString('en-IN')}`
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-600 text-[11px]">
                            {isEditing ? (
                              <Input 
                                value={editFormData.notes || ''} 
                                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                                className="h-8 text-xs bg-white"
                              />
                            ) : (
                              item.notes || '-'
                            )}
                          </td>
                          {!isAccountant && (
                            <td className="py-3 px-3 text-center">
                              {isEditing ? (
                                <div className="flex items-center justify-center gap-1">
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-purple-600 hover:bg-purple-50" onClick={() => saveEdit('procedure')}>
                                    <Check className="w-4 h-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:bg-slate-100" onClick={cancelEdit}>
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-1">
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-purple-600 hover:bg-purple-50" onClick={() => startEdit(item)}>
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-500 hover:bg-rose-50" onClick={() => {
                                    const updated = clinicalProcedures.filter(s => s.id !== item.id);
                                    setClinicalProcedures(updated);
                                    storage.set(STORAGE_KEYS.CLINICAL_PROCEDURE_RATES, updated);
                                    toast.success('Clinical procedure removed');
                                  }}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SECTION 6: HOSPITAL BILLING POLICY & DEPOSIT RULES */}
      {(activeCategory === 'all' || activeCategory === 'policy') && (
        <Card className="border border-amber-200 bg-gradient-to-br from-amber-50/60 via-white to-amber-50/30 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-amber-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-black shadow-md shadow-amber-600/20">
                <Percent className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-black text-slate-800">
                  Hospital Billing Policies & Advance Deposits
                </CardTitle>
                <CardDescription className="text-xs text-slate-600">
                  Configure the 10% hospital service charge, minimum admission advance deposit policies, and medicine MRP billing rules.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Service Charge Rule */}
              <div className="p-4 bg-white rounded-xl border border-amber-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-800">Hospital Service Charges</Label>
                  <Badge className="bg-amber-100 text-amber-900 font-mono text-xs font-bold">
                    {hospitalBillingPolicy?.serviceChargePercent || 10}%
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500">
                  {hospitalBillingPolicy?.serviceChargeNote || '10% service charges will be applicable on total hospital bills.'}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Input 
                    type="number"
                    value={hospitalBillingPolicy?.serviceChargePercent || 10}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      const updated = { ...hospitalBillingPolicy, serviceChargePercent: val };
                      setHospitalBillingPolicy(updated);
                      storage.set(STORAGE_KEYS.HOSPITAL_BILLING_POLICY, updated);
                    }}
                    className="h-9 w-20 text-xs font-bold text-amber-800 bg-amber-50/50"
                  />
                  <span className="text-xs font-bold text-slate-600">% on Total Bill</span>
                </div>
              </div>

              {/* Medicine MRP Rule */}
              <div className="p-4 bg-white rounded-xl border border-amber-200/80 shadow-xs space-y-3">
                <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Medicines Billing Rule
                </Label>
                <p className="text-[11px] text-slate-500">
                  {hospitalBillingPolicy?.medicinesPricingRule || 'Medicines are charged strictly according to MRP stamped on the pack.'}
                </p>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold text-[11px]">
                  Enforce MRP Rates in Pharmacy & IPD
                </Badge>
              </div>

              {/* Admission Advance Deposit Policy */}
              <div className="p-4 bg-white rounded-xl border border-amber-200/80 shadow-xs space-y-3">
                <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-amber-600" />
                  Admission Advance Minimum Deposits
                </Label>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">ICU Admission Deposit:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-slate-700">₹</span>
                      <Input 
                        type="number"
                        value={hospitalBillingPolicy?.icuAdmissionDeposit || 10000}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const updated = { ...hospitalBillingPolicy, icuAdmissionDeposit: val };
                          setHospitalBillingPolicy(updated);
                          storage.set(STORAGE_KEYS.HOSPITAL_BILLING_POLICY, updated);
                        }}
                        className="h-8 w-24 text-xs font-bold text-slate-800"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Other Rooms Deposit:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-slate-700">₹</span>
                      <Input 
                        type="number"
                        value={hospitalBillingPolicy?.otherRoomsAdmissionDeposit || 5000}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const updated = { ...hospitalBillingPolicy, otherRoomsAdmissionDeposit: val };
                          setHospitalBillingPolicy(updated);
                          storage.set(STORAGE_KEYS.HOSPITAL_BILLING_POLICY, updated);
                        }}
                        className="h-8 w-24 text-xs font-bold text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SECTION 7: EXCEL RATE LIST UPLOADER */}
      <div className="pt-2">
        <RateListExcelUploader />
      </div>
    </div>
  );
};

export default HospitalTariffManager;
