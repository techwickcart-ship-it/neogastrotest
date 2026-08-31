import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  Printer, 
  Save, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Plus, 
  Check, 
  Edit, 
  Building,
  CheckSquare,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { CarewellPreOpOrdersForm } from '@/types';
import { getCarewellPreOpOrders, saveCarewellPreOpOrder } from '@/services/supabaseService';

const INITIAL_PREOP_SHEETS: CarewellPreOpOrdersForm[] = [
  {
    id: 'preop-sheet-1',
    patientId: 'P-101',
    patientName: 'PRIYANKA PARTE',
    ageSex: '34 Yrs / Female',
    uhidNo: 'NH/1871/MAY/2016',
    regNo: 'NH/1871/MAY/2016',
    dateOfOperation: '2026-07-30',
    opProcedureProposed: 'Laparoscopic Cholecystectomy',
    anaesthesiaType: 'GA',
    nilOrallyAfterMidnight: true,
    nilOrallyNotes: 'Strict NPO after 12:00 midnight',
    liquidDiet: false,
    writtenConsent: true,
    prepareParts: true,
    preparePartsNotes: 'Abdomen and pubic area prepared with Savlon & Betadine',
    followPacOrders: true,
    morningBathSavlon: true,
    xylocaineSensitivity: true,
    xylocaineResult: 'Non-Sensitive (Negative)',
    tabAlprazolam: true,
    injAntibiotics: [
      { name: 'Inj. Cefuroxime 1.5g IV', time: '06:00 AM' },
      { name: 'Inj. Metronidazole 500mg IV', time: '07:30 AM' },
      { name: '', time: '' },
      { name: '', time: '' }
    ],
    injTetanusToxideStat: true,
    injPethidineMg: '50',
    injPhenerganMg: '25',
    antibioticSensitivityWardNote: 'Antibiotics after sensitivity test should be sent to OT, should not be given in ward.',
    betadineMouthWash: true,
    proctoclysisEnema: true,
    streptomycinAndMetrogyl: true,
    shiftToOtTime: '08:30 AM',
    specialInstructions: 'Patient has mild asthma. Keep Salbutamol nebulizer on standby in OT.',
    savedAt: '2026-07-30T07:00:00.000Z',
    savedBy: 'Dr. Sunita Rao'
  }
];

interface CarewellPreOpOrdersComponentProps {
  patientId?: string;
  patientName?: string;
  uhidNo?: string;
  onSaved?: () => void;
}

export default function CarewellPreOpOrdersComponent({
  patientId = '',
  patientName = '',
  uhidNo = 'NH/1871/MAY/2016',
  onSaved
}: CarewellPreOpOrdersComponentProps) {
  const [sheets, setSheets] = useState<CarewellPreOpOrdersForm[]>(() => {
    const saved = storage.get(STORAGE_KEYS.CAREWELL_PREOP_ORDERS, []);
    return saved.length > 0 ? saved : INITIAL_PREOP_SHEETS;
  });

  const [patients, setPatients] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [selectedSheet, setSelectedSheet] = useState<CarewellPreOpOrdersForm | null>(null);

  // Form State
  const [formData, setFormData] = useState<CarewellPreOpOrdersForm>({
    id: `preop-ord-${Date.now()}`,
    patientId: patientId || 'P-101',
    patientName: patientName || 'PRIYANKA PARTE',
    ageSex: '34 Yrs / Female',
    uhidNo: uhidNo || 'NH/1871/MAY/2016',
    regNo: 'NH/1871/MAY/2016',
    dateOfOperation: new Date().toISOString().split('T')[0],
    opProcedureProposed: 'Laparoscopic Cholecystectomy',
    anaesthesiaType: 'GA',
    nilOrallyAfterMidnight: true,
    nilOrallyNotes: 'Strict NPO after midnight',
    liquidDiet: false,
    writtenConsent: true,
    prepareParts: true,
    preparePartsNotes: 'Abdominal skin prep with Savlon',
    followPacOrders: true,
    morningBathSavlon: true,
    xylocaineSensitivity: true,
    xylocaineResult: 'Non-Sensitive',
    tabAlprazolam: true,
    injAntibiotics: [
      { name: 'Inj. Cefuroxime 1.5g IV', time: '06:00 AM' },
      { name: 'Inj. Metronidazole 500mg IV', time: '07:30 AM' },
      { name: '', time: '' },
      { name: '', time: '' }
    ],
    injTetanusToxideStat: true,
    injPethidineMg: '50',
    injPhenerganMg: '25',
    antibioticSensitivityWardNote: 'Antibiotics after sensitivity test should be sent to OT, should not be given in ward.',
    betadineMouthWash: true,
    proctoclysisEnema: true,
    streptomycinAndMetrogyl: true,
    shiftToOtTime: '08:00 AM / On Call',
    specialInstructions: '',
    savedAt: new Date().toISOString(),
    savedBy: 'Ward Staff / Doctor'
  });

  useEffect(() => {
    const loadedPatients = storage.get(STORAGE_KEYS.PATIENTS, []);
    setPatients(loadedPatients);

    const loadAsyncSheets = async () => {
      const data = await getCarewellPreOpOrders();
      if (data && data.length > 0) {
        setSheets(data);
      }
    };

    loadAsyncSheets();

    if (patientId) {
      const p = loadedPatients.find((item: any) => item.id === patientId);
      if (p) {
        setFormData(prev => ({
          ...prev,
          patientId: p.id,
          patientName: p.name || prev.patientName,
          ageSex: `${p.age || 34} Yrs / ${p.gender || 'F'}`,
          uhidNo: p.uhid || p.mrn || prev.uhidNo
        }));
      }
    }
  }, [patientId]);

  useEffect(() => {
    storage.set(STORAGE_KEYS.CAREWELL_PREOP_ORDERS, sheets);
  }, [sheets]);

  const handlePatientSelect = (pId: string) => {
    const p = patients.find(item => item.id === pId);
    if (p) {
      setFormData(prev => ({
        ...prev,
        patientId: p.id,
        patientName: p.name,
        ageSex: `${p.age || 30} Yrs / ${p.gender || 'Female'}`,
        uhidNo: p.uhid || p.mrn || 'NH/1871/MAY/2016'
      }));
    }
  };

  const handleSave = async () => {
    if (!formData.patientName || !formData.opProcedureProposed) {
      toast.error('Please fill patient name and proposed procedure');
      return;
    }

    const newForm = {
      ...formData,
      id: formData.id || `preop-ord-${Date.now()}`,
      savedAt: new Date().toISOString()
    };

    const saved = await saveCarewellPreOpOrder(newForm);

    const exists = sheets.findIndex(s => s.id === saved.id);
    let updated: CarewellPreOpOrdersForm[];
    if (exists >= 0) {
      updated = [...sheets];
      updated[exists] = saved;
    } else {
      updated = [saved, ...sheets];
    }

    setSheets(updated);
    storage.set(STORAGE_KEYS.CAREWELL_PREOP_ORDERS, updated);
    toast.success('Pre-Operative Orders Sheet saved successfully!');
    if (onSaved) onSaved();
  };

  const handlePrint = (sheetToPrint: CarewellPreOpOrdersForm = formData) => {
    setSelectedSheet(sheetToPrint);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-950 to-slate-900 p-4 rounded-2xl text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 rounded-xl shrink-0">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-base tracking-wide uppercase">
                Neo Gastroplus Hospital
              </h2>
              <Badge className="bg-emerald-500/30 text-emerald-200 border-emerald-400/30 text-[10px] font-bold">
                PRE OPERATIVE ORDERS SHEET
              </Badge>
            </div>
            <p className="text-xs text-emerald-100/80 mt-0.5">
              Standard 13-Point Pre-Operative Orders & Ward Checklist
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant={activeTab === 'create' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('create')}
            className="text-xs font-bold"
          >
            <Edit className="w-3.5 h-3.5 mr-1" /> New / Edit Sheet
          </Button>

          <Button 
            variant={activeTab === 'history' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('history')}
            className="text-xs font-bold"
          >
            <FileText className="w-3.5 h-3.5 mr-1" /> Stored Sheets ({sheets.length})
          </Button>

          <Button 
            onClick={() => handlePrint()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs gap-1.5 shadow-md"
          >
            <Printer className="w-4 h-4" /> Print Pre-Op Sheet
          </Button>
        </div>
      </div>

      {activeTab === 'create' ? (
        <Card className="border border-slate-300 shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardContent className="p-6 space-y-6">
            
            {/* Form Paper Header Layout matching Image 2 */}
            <div className="border-2 border-slate-900 p-5 rounded-xl space-y-4 bg-slate-50/50 print:border-black">
              <div className="flex flex-col items-center justify-center text-center pb-3 border-b-2 border-slate-800">
                <div className="flex items-center gap-2 text-slate-900 font-black text-xl tracking-tight">
                  <Building className="w-6 h-6 text-emerald-800" />
                  <span>GASTRO PLUS HOSPITAL</span>
                </div>
                <p className="text-xs text-slate-700 font-semibold mt-0.5">
                  Plot No. 7 & 8, Om Shiv Nagar, Gufa Mandir Road, Lal Ghati Bhopal, 462030, Madhya Pradesh | Ph.: 9109102145/9109101246
                </p>
                <div className="flex items-center justify-end w-full mt-2 text-xs font-bold text-slate-800">
                  <span className="uppercase text-emerald-950 bg-emerald-100 px-4 py-1 rounded-md border border-emerald-300 font-black tracking-widest text-sm">
                    PRE OPERATIVE ORDERS
                  </span>
                </div>
              </div>

              {/* Patient Basic Header Fields */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs bg-white p-3 rounded-lg border border-slate-300">
                <div className="md:col-span-3">
                  <Label className="text-[10px] font-bold uppercase text-slate-700">Select Patient</Label>
                  <Select value={formData.patientId} onValueChange={handlePatientSelect}>
                    <SelectTrigger className="h-8 text-xs font-bold"><SelectValue placeholder="Select Patient" /></SelectTrigger>
                    <SelectContent>
                      {patients.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name} ({p.uhid || p.mrn})</SelectItem>
                      ))}
                      <SelectItem value="P-101">PRIYANKA PARTE (NH/1871/MAY/2016)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-3">
                  <Label className="text-[10px] font-bold uppercase text-slate-700">Name :</Label>
                  <Input 
                    value={formData.patientName} 
                    onChange={e => setFormData({...formData, patientName: e.target.value})}
                    placeholder="Patient Full Name" 
                    className="h-8 text-xs font-black text-slate-950" 
                  />
                </div>

                <div className="md:col-span-2">
                  <Label className="text-[10px] font-bold uppercase text-slate-700">Age / Sex :</Label>
                  <Input 
                    value={formData.ageSex} 
                    onChange={e => setFormData({...formData, ageSex: e.target.value})}
                    placeholder="e.g. 34 Yrs / F" 
                    className="h-8 text-xs font-bold" 
                  />
                </div>

                <div className="md:col-span-4">
                  <Label className="text-[10px] font-bold uppercase text-slate-700">UHID No. :</Label>
                  <Input 
                    value={formData.uhidNo} 
                    onChange={e => setFormData({...formData, uhidNo: e.target.value})}
                    placeholder="e.g. NH/1871/MAY/2016" 
                    className="h-8 text-xs font-bold text-emerald-950" 
                  />
                </div>

                <div className="md:col-span-4">
                  <Label className="text-[10px] font-bold uppercase text-slate-700">Date of Operation :</Label>
                  <Input 
                    type="date" 
                    value={formData.dateOfOperation} 
                    onChange={e => setFormData({...formData, dateOfOperation: e.target.value})}
                    className="h-8 text-xs font-bold" 
                  />
                </div>

                <div className="md:col-span-5">
                  <Label className="text-[10px] font-bold uppercase text-slate-700">Op. procedure proposed :</Label>
                  <Input 
                    value={formData.opProcedureProposed} 
                    onChange={e => setFormData({...formData, opProcedureProposed: e.target.value})}
                    placeholder="e.g. Laparoscopic Cholecystectomy" 
                    className="h-8 text-xs font-extrabold text-blue-950" 
                  />
                </div>

                <div className="md:col-span-3">
                  <Label className="text-[10px] font-bold uppercase text-slate-700">Anaesthesia :</Label>
                  <Select value={formData.anaesthesiaType} onValueChange={v => setFormData({...formData, anaesthesiaType: v})}>
                    <SelectTrigger className="h-8 text-xs font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GA">GA (General Anaesthesia)</SelectItem>
                      <SelectItem value="LA">LA (Local Anaesthesia)</SelectItem>
                      <SelectItem value="SA">SA (Spinal Anaesthesia)</SelectItem>
                      <SelectItem value="EA">EA (Epidural Anaesthesia)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 13 PRE OPERATIVE ORDERS CHECKLIST items matching Image 2 */}
              <div className="bg-white border-2 border-slate-800 rounded-lg overflow-hidden space-y-0 text-xs divide-y divide-slate-200">
                <div className="bg-slate-900 text-white font-extrabold text-xs uppercase px-4 py-2 flex items-center justify-between">
                  <span>PRE-OPERATIVE ORDERS CHECKLIST & DIRECTIVES</span>
                  <span className="text-[10px] text-emerald-300">Carewell Hospital Official Format</span>
                </div>

                {/* 1. Nil Orally */}
                <div className="p-3 flex items-start gap-3 hover:bg-slate-50 transition-colors">
                  <div className="font-extrabold text-slate-900 w-6 shrink-0">1.</div>
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="order-1" 
                        checked={formData.nilOrallyAfterMidnight} 
                        onCheckedChange={c => setFormData({...formData, nilOrallyAfterMidnight: !!c})} 
                      />
                      <label htmlFor="order-1" className="font-bold text-slate-900 cursor-pointer">
                        Nil orally after midnight
                      </label>
                    </div>
                    <Input 
                      placeholder="Timing notes e.g. Strict NPO from 10:00 PM" 
                      value={formData.nilOrallyNotes || ''} 
                      onChange={e => setFormData({...formData, nilOrallyNotes: e.target.value})}
                      className="h-7 text-xs w-full sm:w-72" 
                    />
                  </div>
                </div>

                {/* 2. Liquid diet */}
                <div className="p-3 flex items-start gap-3 hover:bg-slate-50 transition-colors">
                  <div className="font-extrabold text-slate-900 w-6 shrink-0">2.</div>
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="order-2" 
                        checked={formData.liquidDiet} 
                        onCheckedChange={c => setFormData({...formData, liquidDiet: !!c})} 
                      />
                      <label htmlFor="order-2" className="font-bold text-slate-900 cursor-pointer">
                        Liquid diet
                      </label>
                    </div>
                    <Input 
                      placeholder="Notes e.g. Clear fluids till midnight" 
                      value={formData.liquidDietNotes || ''} 
                      onChange={e => setFormData({...formData, liquidDietNotes: e.target.value})}
                      className="h-7 text-xs w-full sm:w-72" 
                    />
                  </div>
                </div>

                {/* 3. Written Consent */}
                <div className="p-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                  <div className="font-extrabold text-slate-900 w-6 shrink-0">3.</div>
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="order-3" 
                      checked={formData.writtenConsent} 
                      onCheckedChange={c => setFormData({...formData, writtenConsent: !!c})} 
                    />
                    <label htmlFor="order-3" className="font-bold text-slate-900 cursor-pointer">
                      Written consent
                    </label>
                  </div>
                </div>

                {/* 4. Prepare Parts */}
                <div className="p-3 flex items-start gap-3 hover:bg-slate-50 transition-colors">
                  <div className="font-extrabold text-slate-900 w-6 shrink-0">4.</div>
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="order-4" 
                        checked={formData.prepareParts} 
                        onCheckedChange={c => setFormData({...formData, prepareParts: !!c})} 
                      />
                      <label htmlFor="order-4" className="font-bold text-slate-900 cursor-pointer">
                        Prepare Parts
                      </label>
                    </div>
                    <Input 
                      placeholder="Prep site details e.g. Shave abdominal area" 
                      value={formData.preparePartsNotes || ''} 
                      onChange={e => setFormData({...formData, preparePartsNotes: e.target.value})}
                      className="h-7 text-xs w-full sm:w-72" 
                    />
                  </div>
                </div>

                {/* 5. Follow PAC orders */}
                <div className="p-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                  <div className="font-extrabold text-slate-900 w-6 shrink-0">5.</div>
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="order-5" 
                      checked={formData.followPacOrders} 
                      onCheckedChange={c => setFormData({...formData, followPacOrders: !!c})} 
                    />
                    <label htmlFor="order-5" className="font-bold text-slate-900 cursor-pointer">
                      Follow PAC orders
                    </label>
                  </div>
                </div>

                {/* 6. Morning Bath at 7.00 am with Savlon Soap */}
                <div className="p-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                  <div className="font-extrabold text-slate-900 w-6 shrink-0">6.</div>
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="order-6" 
                      checked={formData.morningBathSavlon} 
                      onCheckedChange={c => setFormData({...formData, morningBathSavlon: !!c})} 
                    />
                    <label htmlFor="order-6" className="font-bold text-slate-900 cursor-pointer">
                      Morning Bath at 7.00 am with Savlon Soap
                    </label>
                  </div>
                </div>

                {/* 7. Xylocaine Sensitivity */}
                <div className="p-3 flex items-start gap-3 hover:bg-slate-50 transition-colors">
                  <div className="font-extrabold text-slate-900 w-6 shrink-0">7.</div>
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="order-7" 
                        checked={formData.xylocaineSensitivity} 
                        onCheckedChange={c => setFormData({...formData, xylocaineSensitivity: !!c})} 
                      />
                      <label htmlFor="order-7" className="font-bold text-slate-900 cursor-pointer">
                        Xylocaine Sensitivity
                      </label>
                    </div>
                    <Input 
                      placeholder="Result e.g. Non-Sensitive / Negative" 
                      value={formData.xylocaineResult || ''} 
                      onChange={e => setFormData({...formData, xylocaineResult: e.target.value})}
                      className="h-7 text-xs w-full sm:w-72 font-bold text-emerald-900" 
                    />
                  </div>
                </div>

                {/* 8. Tab Alprazolam 0.5 mg. H.S. */}
                <div className="p-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                  <div className="font-extrabold text-slate-900 w-6 shrink-0">8.</div>
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="order-8" 
                      checked={formData.tabAlprazolam} 
                      onCheckedChange={c => setFormData({...formData, tabAlprazolam: !!c})} 
                    />
                    <label htmlFor="order-8" className="font-bold text-slate-900 cursor-pointer">
                      Tab Alprazolam 0.5 mg. H.S.
                    </label>
                  </div>
                </div>

                {/* 9. Inj. Antibiotics Section */}
                <div className="p-3 bg-amber-50/40 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="font-extrabold text-slate-900 w-6 shrink-0">9.</div>
                    <div className="flex-1 space-y-2">
                      <p className="font-extrabold text-slate-900 text-xs">
                        Inj. Antibiotics & Pre-Op Medications :
                      </p>

                      {/* 4 Custom Antibiotic Slot Rows */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-2">
                        {formData.injAntibiotics.map((ab, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 bg-white p-1.5 rounded border border-slate-300">
                            <span className="text-[10px] font-bold text-slate-500">{idx + 1}.</span>
                            <Input 
                              placeholder={`Inj. Name e.g. Cefuroxime`} 
                              value={ab.name} 
                              onChange={e => {
                                const copy = [...formData.injAntibiotics];
                                copy[idx].name = e.target.value;
                                setFormData({...formData, injAntibiotics: copy});
                              }}
                              className="h-7 text-xs font-bold" 
                            />
                            <span className="text-[10px] font-semibold text-slate-600 shrink-0">at</span>
                            <Input 
                              placeholder="Time e.g. 6 AM" 
                              value={ab.time} 
                              onChange={e => {
                                const copy = [...formData.injAntibiotics];
                                copy[idx].time = e.target.value;
                                setFormData({...formData, injAntibiotics: copy});
                              }}
                              className="h-7 text-xs w-24 shrink-0 font-bold" 
                            />
                          </div>
                        ))}
                      </div>

                      {/* Tetanus, Pethidine, Phenergan sub-items */}
                      <div className="pt-2 space-y-2 pl-2 border-t border-amber-200">
                        <div className="flex items-center gap-2">
                          <Checkbox 
                            id="order-9-tt" 
                            checked={formData.injTetanusToxideStat} 
                            onCheckedChange={c => setFormData({...formData, injTetanusToxideStat: !!c})} 
                          />
                          <label htmlFor="order-9-tt" className="font-bold text-slate-900 cursor-pointer">
                            Inj. Teatanus Toxide I.M. Stat
                          </label>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 font-bold text-slate-900">
                          <span>Inj. Pathidine</span>
                          <Input 
                            value={formData.injPethidineMg || '50'} 
                            onChange={e => setFormData({...formData, injPethidineMg: e.target.value})}
                            className="h-7 w-16 text-center text-xs font-bold" 
                          />
                          <span>mg + Inj. Phenargan</span>
                          <Input 
                            value={formData.injPhenerganMg || '25'} 
                            onChange={e => setFormData({...formData, injPhenerganMg: e.target.value})}
                            className="h-7 w-16 text-center text-xs font-bold" 
                          />
                          <span>mg (M 1/2 Hr. before Shifting)</span>
                        </div>

                        <div className="p-2 bg-amber-100 border border-amber-300 rounded text-[11px] font-bold text-amber-950 italic">
                          ★ {formData.antibioticSensitivityWardNote || 'Antibiotics after sensitivity test should be sent to OT, should not be given in ward.'}
                        </div>
                      </div>

                    </div>
                  </div>
                </div>

                {/* 10. Betadine mouth wash */}
                <div className="p-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                  <div className="font-extrabold text-slate-900 w-6 shrink-0">10.</div>
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="order-10" 
                      checked={formData.betadineMouthWash} 
                      onCheckedChange={c => setFormData({...formData, betadineMouthWash: !!c})} 
                    />
                    <label htmlFor="order-10" className="font-bold text-slate-900 cursor-pointer">
                      Betadine mouth wash 4 hrly-and 8.30 AM
                    </label>
                  </div>
                </div>

                {/* 11. Proctoclysis Enema */}
                <div className="p-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                  <div className="font-extrabold text-slate-900 w-6 shrink-0">11.</div>
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="order-11" 
                      checked={formData.proctoclysisEnema} 
                      onCheckedChange={c => setFormData({...formData, proctoclysisEnema: !!c})} 
                    />
                    <label htmlFor="order-11" className="font-bold text-slate-900 cursor-pointer">
                      Proctoclysis Enema - 6.30 AM
                    </label>
                  </div>
                </div>

                {/* 12. Inj. Streptomycin 1 gm */}
                <div className="p-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                  <div className="font-extrabold text-slate-900 w-6 shrink-0">12.</div>
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="order-12" 
                      checked={formData.streptomycinAndMetrogyl} 
                      onCheckedChange={c => setFormData({...formData, streptomycinAndMetrogyl: !!c})} 
                    />
                    <label htmlFor="order-12" className="font-bold text-slate-900 cursor-pointer">
                      Inj. Streptomycin 1 gm (orally) and Tab Metrogyl 500 mg Orally 1 PM, 2 PM & 11 PM Today
                    </label>
                  </div>
                </div>

                {/* 13. Shift to O.T. */}
                <div className="p-3 flex items-start gap-3 hover:bg-slate-50 transition-colors">
                  <div className="font-extrabold text-slate-900 w-6 shrink-0">13.</div>
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label htmlFor="order-13" className="font-bold text-slate-900 cursor-pointer">
                      Shift to O.T. AM / on call
                    </label>
                    <Input 
                      placeholder="Timing e.g. 8.00 AM / On Call" 
                      value={formData.shiftToOtTime || ''} 
                      onChange={e => setFormData({...formData, shiftToOtTime: e.target.value})}
                      className="h-7 text-xs w-full sm:w-72 font-extrabold text-blue-900" 
                    />
                  </div>
                </div>

              </div>

              {/* Special Remarks / Instructions */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-900">Additional Special Doctor / PAC Instructions</Label>
                <Textarea 
                  value={formData.specialInstructions || ''} 
                  onChange={e => setFormData({...formData, specialInstructions: e.target.value})}
                  placeholder="Enter any additional pre-op instructions..." 
                  className="text-xs h-16 bg-white" 
                />
              </div>

            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button 
                onClick={handleSave} 
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs gap-1.5 px-6 shadow-md"
              >
                <Save className="w-4 h-4" /> Save Carewell Pre-Op Order Sheet
              </Button>
            </div>

          </CardContent>
        </Card>
      ) : (
        /* History Tab */
        <Card className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs bg-white">
          <CardHeader className="bg-slate-50 border-b py-3 px-4">
            <CardTitle className="text-sm font-bold text-slate-800">Stored Carewell Pre-Operative Orders Sheets</CardTitle>
            <CardDescription className="text-xs">Browse and print pre-operative order checklists recorded under Carewell Hospital template.</CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            <Table className="text-xs">
              <TableHeader className="bg-slate-100 font-bold text-slate-700">
                <TableRow>
                  <TableHead>Date of Op</TableHead>
                  <TableHead>Patient Details</TableHead>
                  <TableHead>Proposed Procedure</TableHead>
                  <TableHead>Anaesthesia</TableHead>
                  <TableHead>OT Shift Time</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {sheets.map(sh => (
                  <TableRow key={sh.id} className="hover:bg-slate-50">
                    <TableCell className="py-2 font-bold">{sh.dateOfOperation}</TableCell>

                    <TableCell className="py-2 font-black text-slate-900">
                      <p>{sh.patientName}</p>
                      <p className="text-[10px] text-slate-500 font-normal">{sh.ageSex} | UHID: {sh.uhidNo}</p>
                    </TableCell>

                    <TableCell className="py-2 font-semibold text-slate-800">
                      {sh.opProcedureProposed}
                    </TableCell>

                    <TableCell className="py-2">
                      <Badge className="bg-teal-700 text-white font-bold text-[10px]">
                        {sh.anaesthesiaType}
                      </Badge>
                    </TableCell>

                    <TableCell className="py-2 font-bold text-emerald-900">
                      {sh.shiftToOtTime || 'On Call'}
                    </TableCell>

                    <TableCell className="py-2 text-right space-x-1">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          setFormData(sh);
                          setActiveTab('create');
                        }}
                        className="h-7 text-[10px] font-bold"
                      >
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => handlePrint(sh)}
                        className="h-7 text-[10px] font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        Print Form
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {sheets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                      No Pre-Op Order Sheets saved yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Hidden Printable Area for Pre-Op Order Sheet matching Image 2 */}
      {selectedSheet && (
        <div className="hidden print:block fixed inset-0 bg-white p-8 z-50 text-black text-xs font-sans font-semibold leading-normal">
          <div className="border-2 border-black p-6 space-y-4 max-w-4xl mx-auto text-black">
            
            {/* Header */}
            <div className="text-center border-b-2 border-black pb-3 space-y-1">
              <div className="flex items-center justify-center">
                <span className="text-[10px] font-bold uppercase">GASTRO PLUS HOSPITAL</span>
              </div>
              <h1 className="text-xl font-bold uppercase tracking-tight">GASTRO PLUS HOSPITAL</h1>
              <p className="text-[10px] italic">Plot No. 7 & 8, Om Shiv Nagar, Gufa Mandir Road, Lal Ghati Bhopal, 462030, Madhya Pradesh | Ph.: 9109102145/9109101246</p>
              <h2 className="text-base font-black underline uppercase pt-1">PRE OPERATIVE ORDERS</h2>
            </div>

            {/* Patient Header Grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 border-b border-black pb-3 text-xs">
              <p><strong>Name :</strong> <span className="font-bold uppercase">{selectedSheet.patientName}</span></p>
              <p><strong>Age / Sex :</strong> {selectedSheet.ageSex}</p>
              <p><strong>UHID No. :</strong> {selectedSheet.uhidNo}</p>
              <p><strong>Date of Operation :</strong> {selectedSheet.dateOfOperation}</p>
              <p className="col-span-2"><strong>Op. procedure proposed :</strong> <span className="font-bold">{selectedSheet.opProcedureProposed}</span></p>
              <p className="col-span-2"><strong>Anaesthesia :</strong> GA / LA / SA / EA [{selectedSheet.anaesthesiaType}]</p>
            </div>

            {/* 13 Checklist Items matching Image 2 */}
            <div className="border border-black p-4 space-y-2 text-xs">
              <p>
                1. Nil orally after midnight &nbsp;&nbsp; 
                <span className="font-bold">[{selectedSheet.nilOrallyAfterMidnight ? '✓ Yes' : '  No'}]</span> 
                {selectedSheet.nilOrallyNotes && ` (${selectedSheet.nilOrallyNotes})`}
              </p>

              <p>
                2. Liquid diet &nbsp;&nbsp; 
                <span className="font-bold">[{selectedSheet.liquidDiet ? '✓ Yes' : '  No'}]</span> 
                {selectedSheet.liquidDietNotes && ` (${selectedSheet.liquidDietNotes})`}
              </p>

              <p>
                3. Written consent &nbsp;&nbsp; 
                <span className="font-bold">[{selectedSheet.writtenConsent ? '✓ Executed' : '  Pending'}]</span>
              </p>

              <p>
                4. Prepare Parts &nbsp;&nbsp; 
                <span className="font-bold">[{selectedSheet.prepareParts ? '✓ Done' : '  Pending'}]</span> 
                {selectedSheet.preparePartsNotes && ` (${selectedSheet.preparePartsNotes})`}
              </p>

              <p>
                5. Follow PAC orders &nbsp;&nbsp; 
                <span className="font-bold">[{selectedSheet.followPacOrders ? '✓ Complied' : '  Pending'}]</span>
              </p>

              <p>
                6. Morning Bath at 7.00 am with Savlon Soap &nbsp;&nbsp; 
                <span className="font-bold">[{selectedSheet.morningBathSavlon ? '✓ Done' : '  Pending'}]</span>
              </p>

              <p>
                7. Xylocaine Sensitivity &nbsp;&nbsp; 
                <span className="font-bold">[{selectedSheet.xylocaineSensitivity ? '✓ Tested' : '  Pending'}]</span> 
                &nbsp; Result: <span className="font-bold underline">{selectedSheet.xylocaineResult || 'Non-Sensitive'}</span>
              </p>

              <p>
                8. Tab Alprazolam 0.5 mg. H.S. &nbsp;&nbsp; 
                <span className="font-bold">[{selectedSheet.tabAlprazolam ? '✓ Given' : '  Pending'}]</span>
              </p>

              <div className="pl-4 py-1 space-y-1 bg-gray-50 border-l-2 border-black">
                <p className="font-bold">9. Inj. Antibiotics :</p>
                {selectedSheet.injAntibiotics.filter(a => a.name).map((ab, i) => (
                  <p key={i} className="pl-4">• {ab.name} ....... at <span className="font-bold">{ab.time}</span></p>
                ))}
                <p className="pl-4">• Inj. Teatanus Toxide I.M. Stat [{selectedSheet.injTetanusToxideStat ? '✓ Given' : ' '}]</p>
                <p className="pl-4">• Inj. Pathidine <span className="font-bold underline">{selectedSheet.injPethidineMg || '50'}</span> mg + Inj. Phenargan <span className="font-bold underline">{selectedSheet.injPhenerganMg || '25'}</span> mg (M 1/2 Hr. before Shifting)</p>
                <p className="pl-4 italic font-bold">★ Antibiotics after sensitivity test should be sent to OT, should not be given in ward.</p>
              </div>

              <p>
                10. Betadine mouth wash 4 hrly-and 8.30 AM &nbsp;&nbsp; 
                <span className="font-bold">[{selectedSheet.betadineMouthWash ? '✓ Done' : '  Pending'}]</span>
              </p>

              <p>
                11. Proctoclysis Enema - 6.30 AM &nbsp;&nbsp; 
                <span className="font-bold">[{selectedSheet.proctoclysisEnema ? '✓ Given' : '  Pending'}]</span>
              </p>

              <p>
                12. Inj. Streptomycin 1 gm (orally) and Tab Metrogyl 500 mg Orally 1 PM, 2 PM & 11 PM Today &nbsp;&nbsp; 
                <span className="font-bold">[{selectedSheet.streptomycinAndMetrogyl ? '✓ Administered' : '  Pending'}]</span>
              </p>

              <p>
                13. Shift to O.T. AM / on call &nbsp;&nbsp; 
                <span className="font-bold underline">{selectedSheet.shiftToOtTime || '08:00 AM / On Call'}</span>
              </p>
            </div>

            {selectedSheet.specialInstructions && (
              <div className="border border-black p-2 text-xs">
                <p className="font-bold">Special Doctor / PAC Instructions:</p>
                <p>{selectedSheet.specialInstructions}</p>
              </div>
            )}

            {/* Signatures */}
            <div className="flex justify-between pt-12 text-xs">
              <div className="text-center">
                <p className="border-t border-black pt-1 px-6">Ward Nurse Signature</p>
              </div>
              <div className="text-center">
                <p className="border-t border-black pt-1 px-6">PAC Doctor Signature</p>
              </div>
              <div className="text-center font-bold">
                <p className="border-t border-black pt-1 px-6">Attending Surgeon Signature</p>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
