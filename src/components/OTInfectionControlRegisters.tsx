import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Droplets, 
  Wind, 
  ShieldCheck, 
  Plus, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Printer, 
  Trash2,
  Building
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { storage } from '@/lib/storage';
import { OTInfectionControlLog } from '@/types';
import { supabaseService } from '@/services/supabaseService';

const STORAGE_KEY_REGISTERS = 'hms_ot_infection_control_registers';

const INITIAL_LOGS: OTInfectionControlLog[] = [
  {
    id: 'inf-auto-1',
    date: '2026-07-30',
    time: '07:30 AM',
    theatreId: '1',
    theatreName: 'CSSD / Autoclave Unit 1',
    cleaningType: 'Autoclave Sterilization',
    disinfectantsUsed: 'Steam High Pressure (134°C / 30 psi)',
    cultureSwabResult: 'Negative',
    loggedBy: 'Nurse Deepika Roy',
    registerType: 'Autoclave',
    autoclaveDetails: {
      batchNo: 'BATCH-2026-0811',
      temperature: '134°C',
      pressure: '30 psi',
      holdTime: '20 Mins',
      biologicalIndicatorResult: 'Passed',
      chemicalIndicatorResult: 'Passed'
    }
  },
  {
    id: 'inf-etp-1',
    date: '2026-07-30',
    time: '08:00 AM',
    theatreId: 'all',
    theatreName: 'Effluent Treatment Plant (ETP)',
    cleaningType: 'ETP Log',
    disinfectantsUsed: 'Sodium Hypochlorite & Chlorine Dosing',
    cultureSwabResult: 'Negative',
    loggedBy: 'Tech. Rajesh Kumar',
    registerType: 'ETP',
    etpDetails: {
      phValue: '7.2',
      tdsValue: '450 ppm',
      treatedWaterQtyLiters: '5000 L',
      dosingChemicals: 'Chlorine 10% (2 Liters), Poly Alum Chloride (1 Kg)',
      sludgeDisposalKg: '15 Kg'
    }
  },
  {
    id: 'inf-eto-1',
    date: '2026-07-29',
    time: '06:00 PM',
    theatreId: '1',
    theatreName: 'ETO Unit - CSSD',
    cleaningType: 'ETO Sterilization',
    disinfectantsUsed: 'Ethylene Oxide Gas 100%',
    cultureSwabResult: 'Negative',
    loggedBy: 'Tech. Amit Sen',
    registerType: 'ETO',
    etoDetails: {
      batchNo: 'ETO-9022',
      gasConcentration: '600 mg/L',
      aerationTimeHours: '12 Hours',
      humidityPercent: '60%',
      etoTapeIndicator: 'Passed'
    }
  },
  {
    id: 'inf-fum-1',
    date: '2026-07-28',
    time: '11:00 PM',
    theatreId: '1',
    theatreName: 'OT Room-1',
    cleaningType: 'Fumigation Report',
    disinfectantsUsed: 'Hydrogen Peroxide + Silver Nitrate (Ecoclean)',
    airParticleCount: '1120',
    cultureSwabResult: 'Negative',
    loggedBy: 'Dr. Sarah Sharma',
    registerType: 'Fumigation',
    fumigationDetails: {
      foggingAgent: 'Hydrogen Peroxide 11% w/v + Silver Nitrate 0.01% w/v',
      roomVolumeCuFt: '3500 Cu.Ft',
      sealingTimeHours: '6 Hours',
      postFumigationAiroutTime: '2 Hours',
      swabLocationTested: 'OT Table, Shadowless Lamp, Anesthesia Cart, Air Vents'
    }
  }
];

export default function OTInfectionControlRegisters() {
  const currentUser = storage.get('session_user', null);
  const [logs, setLogs] = useState<OTInfectionControlLog[]>(() => {
    return storage.get(STORAGE_KEY_REGISTERS, INITIAL_LOGS);
  });
  const [activeTab, setActiveTab] = useState<'all' | 'autoclave' | 'etp' | 'eto' | 'fumigation'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [regType, setRegType] = useState<'Autoclave' | 'ETP' | 'ETO' | 'Fumigation'>('Autoclave');

  // Form fields
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [theatreName, setTheatreName] = useState('OT Room-1');
  const [loggedBy, setLoggedBy] = useState(currentUser?.name || 'Staff');

  // Autoclave state
  const [autoBatchNo, setAutoBatchNo] = useState(`BATCH-${Date.now().toString().slice(-6)}`);
  const [autoTemp, setAutoTemp] = useState('134°C');
  const [autoPressure, setAutoPressure] = useState('30 psi');
  const [autoHoldTime, setAutoHoldTime] = useState('20 Mins');
  const [autoBioRes, setAutoBioRes] = useState<'Passed' | 'Failed' | 'Pending'>('Passed');

  // ETP state
  const [etpPh, setEtpPh] = useState('7.2');
  const [etpTds, setEtpTds] = useState('450 ppm');
  const [etpQty, setEtpQty] = useState('5000 L');
  const [etpDosing, setEtpDosing] = useState('Sodium Hypochlorite 10%');
  const [etpSludge, setEtpSludge] = useState('10 Kg');

  // ETO state
  const [etoBatchNo, setEtoBatchNo] = useState(`ETO-${Date.now().toString().slice(-5)}`);
  const [etoGasConc, setEtoGasConc] = useState('600 mg/L');
  const [etoAeration, setEtoAeration] = useState('12 Hours');
  const [etoHumidity, setEtoHumidity] = useState('60%');

  // Fumigation state
  const [fumAgent, setFumAgent] = useState('Hydrogen Peroxide 11% + Silver Nitrate');
  const [fumVolume, setFumVolume] = useState('3500 Cu.Ft');
  const [fumSealingTime, setFumSealingTime] = useState('6 Hours');
  const [fumSwabs, setFumSwabs] = useState('OT Table, Lamp, Air Vents, Floor');
  const [fumSwabRes, setFumSwabRes] = useState<'Negative' | 'Positive' | 'Pending'>('Negative');

  const handleSaveEntry = () => {
    let cleaningType: OTInfectionControlLog['cleaningType'] = 'Routine';
    let disinfectants = 'Disinfectant';

    if (regType === 'Autoclave') {
      cleaningType = 'Autoclave Sterilization';
      disinfectants = `Steam High Pressure (${autoTemp}, ${autoPressure})`;
    } else if (regType === 'ETP') {
      cleaningType = 'ETP Log';
      disinfectants = etpDosing;
    } else if (regType === 'ETO') {
      cleaningType = 'ETO Sterilization';
      disinfectants = `ETO Gas (${etoGasConc})`;
    } else if (regType === 'Fumigation') {
      cleaningType = 'Fumigation Report';
      disinfectants = fumAgent;
    }

    const newLog: OTInfectionControlLog = {
      id: `inf-${regType.toLowerCase()}-${Date.now()}`,
      date,
      time,
      theatreId: '1',
      theatreName,
      cleaningType,
      disinfectantsUsed: disinfectants,
      cultureSwabResult: regType === 'Fumigation' ? fumSwabRes : (regType === 'Autoclave' && autoBioRes === 'Failed' ? 'Positive' : 'Negative'),
      loggedBy,
      registerType: regType,
      autoclaveDetails: regType === 'Autoclave' ? {
        batchNo: autoBatchNo,
        temperature: autoTemp,
        pressure: autoPressure,
        holdTime: autoHoldTime,
        biologicalIndicatorResult: autoBioRes,
        chemicalIndicatorResult: 'Passed'
      } : undefined,
      etpDetails: regType === 'ETP' ? {
        phValue: etpPh,
        tdsValue: etpTds,
        treatedWaterQtyLiters: etpQty,
        dosingChemicals: etpDosing,
        sludgeDisposalKg: etpSludge
      } : undefined,
      etoDetails: regType === 'ETO' ? {
        batchNo: etoBatchNo,
        gasConcentration: etoGasConc,
        aerationTimeHours: etoAeration,
        humidityPercent: etoHumidity,
        etoTapeIndicator: 'Passed'
      } : undefined,
      fumigationDetails: regType === 'Fumigation' ? {
        foggingAgent: fumAgent,
        roomVolumeCuFt: fumVolume,
        sealingTimeHours: fumSealingTime,
        postFumigationAiroutTime: '2 Hours',
        swabLocationTested: fumSwabs
      } : undefined
    };

    const updated = [newLog, ...logs];
    setLogs(updated);
    storage.set(STORAGE_KEY_REGISTERS, updated);
    toast.success(`${regType} Register log saved successfully`);
    setIsAddOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this register log entry?')) {
      const updated = logs.filter(l => l.id !== id);
      setLogs(updated);
      storage.set(STORAGE_KEY_REGISTERS, updated);
      toast.success('Log deleted');
    }
  };

  const filteredLogs = logs.filter(l => {
    if (activeTab === 'autoclave') return l.registerType === 'Autoclave' || l.cleaningType === 'Autoclave Sterilization';
    if (activeTab === 'etp') return l.registerType === 'ETP' || l.cleaningType === 'ETP Log';
    if (activeTab === 'eto') return l.registerType === 'ETO' || l.cleaningType === 'ETO Sterilization';
    if (activeTab === 'fumigation') return l.registerType === 'Fumigation' || l.cleaningType === 'Fumigation Report';
    return true;
  }).filter(l => 
    (l.theatreName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.loggedBy || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.disinfectantsUsed || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-teal-100 text-teal-800 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Infection Control Registers (Autoclave, ETP, ETO, Fumigation)</CardTitle>
              <CardDescription>Comprehensive infection control audit registers for CSSD Autoclave, Effluent Plant, ETO Gas, & OT Fumigation.</CardDescription>
            </div>
          </div>
        </div>

        <Button className="bg-teal-700 hover:bg-teal-800 text-white gap-2 font-bold" onClick={() => setIsAddOpen(true)}>
          <Plus className="w-4 h-4" />
          Log Infection Control Entry
        </Button>
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)}>
          <TabsList className="bg-slate-100 p-1">
            <TabsTrigger value="all">All Registers</TabsTrigger>
            <TabsTrigger value="autoclave" className="gap-1.5 font-bold">
              <Flame className="w-3.5 h-3.5 text-amber-600" /> Autoclave Register
            </TabsTrigger>
            <TabsTrigger value="etp" className="gap-1.5 font-bold">
              <Droplets className="w-3.5 h-3.5 text-blue-600" /> ETP Register
            </TabsTrigger>
            <TabsTrigger value="eto" className="gap-1.5 font-bold">
              <Wind className="w-3.5 h-3.5 text-purple-600" /> ETO Register
            </TabsTrigger>
            <TabsTrigger value="fumigation" className="gap-1.5 font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Fumigation Report
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search by location, disinfectants, batch, or staff..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-200"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Type & Date</TableHead>
                <TableHead>Location / Unit</TableHead>
                <TableHead>Process / Parameters</TableHead>
                <TableHead>Disinfectant / Agent</TableHead>
                <TableHead>Culture / Indicator</TableHead>
                <TableHead>Logged By</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div>
                        <Badge variant="outline" className={
                          log.registerType === 'Autoclave' || log.cleaningType === 'Autoclave Sterilization' ? 'bg-amber-50 text-amber-800 border-amber-300 font-bold' :
                          log.registerType === 'ETP' || log.cleaningType === 'ETP Log' ? 'bg-blue-50 text-blue-800 border-blue-300 font-bold' :
                          log.registerType === 'ETO' || log.cleaningType === 'ETO Sterilization' ? 'bg-purple-50 text-purple-800 border-purple-300 font-bold' :
                          'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold'
                        }>
                          {log.registerType || log.cleaningType}
                        </Badge>
                        <p className="text-[10px] text-slate-500 mt-1">{log.date} at {log.time}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-slate-900">
                      {log.theatreName}
                    </TableCell>
                    <TableCell className="text-xs">
                      {log.autoclaveDetails && (
                        <div className="space-y-0.5 text-[11px]">
                          <p><span className="font-bold">Batch:</span> {log.autoclaveDetails.batchNo}</p>
                          <p><span className="font-bold">Temp/Press:</span> {log.autoclaveDetails.temperature}, {log.autoclaveDetails.pressure}</p>
                        </div>
                      )}
                      {log.etpDetails && (
                        <div className="space-y-0.5 text-[11px]">
                          <p><span className="font-bold">pH / TDS:</span> {log.etpDetails.phValue} / {log.etpDetails.tdsValue}</p>
                          <p><span className="font-bold">Treated:</span> {log.etpDetails.treatedWaterQtyLiters}</p>
                        </div>
                      )}
                      {log.etoDetails && (
                        <div className="space-y-0.5 text-[11px]">
                          <p><span className="font-bold">Batch:</span> {log.etoDetails.batchNo}</p>
                          <p><span className="font-bold">Aeration:</span> {log.etoDetails.aerationTimeHours}</p>
                        </div>
                      )}
                      {log.fumigationDetails && (
                        <div className="space-y-0.5 text-[11px]">
                          <p><span className="font-bold">Volume:</span> {log.fumigationDetails.roomVolumeCuFt}</p>
                          <p><span className="font-bold">Sealing:</span> {log.fumigationDetails.sealingTimeHours}</p>
                        </div>
                      )}
                      {!log.autoclaveDetails && !log.etpDetails && !log.etoDetails && !log.fumigationDetails && (
                        <span className="text-slate-500">Standard Sanitization Protocol</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-700">
                      {log.disinfectantsUsed}
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        log.cultureSwabResult === 'Negative' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                        log.cultureSwabResult === 'Positive' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                        'bg-amber-100 text-amber-800 border-amber-300'
                      }>
                        {log.cultureSwabResult === 'Negative' ? '✓ Sterile / Passed' : log.cultureSwabResult === 'Positive' ? '⚠ Contaminated' : 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-bold text-slate-800">
                      {log.loggedBy}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(log.id)} className="h-8 w-8 text-rose-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                    No register entries found for selected register.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Add Entry Modal */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-teal-900">
                <ShieldCheck className="w-5 h-5 text-teal-700" />
                New Infection Control Register Log
              </DialogTitle>
              <DialogDescription>
                Maintain mandatory hospital infection control audit records for Autoclave, ETP, ETO, or Fumigation.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="space-y-1">
                <Label className="font-bold text-teal-900">Select Register Type</Label>
                <Select value={regType} onValueChange={(val) => setRegType(val as any)}>
                  <SelectTrigger className="h-9 font-bold bg-teal-50 border-teal-300"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Autoclave">Autoclave Sterilization Register</SelectItem>
                    <SelectItem value="ETP">Effluent Treatment Plant (ETP) Register</SelectItem>
                    <SelectItem value="ETO">ETO Sterilization Register</SelectItem>
                    <SelectItem value="Fumigation">Fumigation & Air Swab Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Date</Label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-8" />
                </div>
                <div className="space-y-1">
                  <Label>Time</Label>
                  <Input value={time} onChange={e => setTime(e.target.value)} className="h-8" />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Location / OT Unit</Label>
                <Input value={theatreName} onChange={e => setTheatreName(e.target.value)} className="h-8" />
              </div>

              {/* Autoclave specific */}
              {regType === 'Autoclave' && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-3">
                  <p className="font-bold text-amber-900">Autoclave Technical Parameters</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Batch No.</Label><Input value={autoBatchNo} onChange={e => setAutoBatchNo(e.target.value)} className="h-8 bg-white" /></div>
                    <div><Label>Temperature (°C)</Label><Input value={autoTemp} onChange={e => setAutoTemp(e.target.value)} className="h-8 bg-white" /></div>
                    <div><Label>Pressure (psi)</Label><Input value={autoPressure} onChange={e => setAutoPressure(e.target.value)} className="h-8 bg-white" /></div>
                    <div><Label>Hold Time</Label><Input value={autoHoldTime} onChange={e => setAutoHoldTime(e.target.value)} className="h-8 bg-white" /></div>
                  </div>
                  <div>
                    <Label>Biological Indicator (Spore Test)</Label>
                    <Select value={autoBioRes} onValueChange={(v) => setAutoBioRes(v as any)}>
                      <SelectTrigger className="h-8 bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Passed">Passed (No Spore Growth)</SelectItem>
                        <SelectItem value="Failed">Failed (Growth Present)</SelectItem>
                        <SelectItem value="Pending">Incubation Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* ETP specific */}
              {regType === 'ETP' && (
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 space-y-3">
                  <p className="font-bold text-blue-900">ETP Operating Parameters</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>pH Level (6.5 - 8.5)</Label><Input value={etpPh} onChange={e => setEtpPh(e.target.value)} className="h-8 bg-white" /></div>
                    <div><Label>TDS Value (ppm)</Label><Input value={etpTds} onChange={e => setEtpTds(e.target.value)} className="h-8 bg-white" /></div>
                    <div><Label>Treated Water Qty (Liters)</Label><Input value={etpQty} onChange={e => setEtpQty(e.target.value)} className="h-8 bg-white" /></div>
                    <div><Label>Sludge Disposed (Kg)</Label><Input value={etpSludge} onChange={e => setEtpSludge(e.target.value)} className="h-8 bg-white" /></div>
                  </div>
                  <div>
                    <Label>Dosing Chemicals Used</Label>
                    <Input value={etpDosing} onChange={e => setEtpDosing(e.target.value)} className="h-8 bg-white" />
                  </div>
                </div>
              )}

              {/* ETO specific */}
              {regType === 'ETO' && (
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 space-y-3">
                  <p className="font-bold text-purple-900">ETO Sterilization Parameters</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Batch No.</Label><Input value={etoBatchNo} onChange={e => setEtoBatchNo(e.target.value)} className="h-8 bg-white" /></div>
                    <div><Label>Gas Conc. (mg/L)</Label><Input value={etoGasConc} onChange={e => setEtoGasConc(e.target.value)} className="h-8 bg-white" /></div>
                    <div><Label>Aeration Time (Hours)</Label><Input value={etoAeration} onChange={e => setEtoAeration(e.target.value)} className="h-8 bg-white" /></div>
                    <div><Label>Humidity (%)</Label><Input value={etoHumidity} onChange={e => setEtoHumidity(e.target.value)} className="h-8 bg-white" /></div>
                  </div>
                </div>
              )}

              {/* Fumigation specific */}
              {regType === 'Fumigation' && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-3">
                  <p className="font-bold text-emerald-900">Fumigation & Microbiological Swab Parameters</p>
                  <div>
                    <Label>Fogging Agent Disinfectant</Label>
                    <Input value={fumAgent} onChange={e => setFumAgent(e.target.value)} className="h-8 bg-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Room Volume (Cu.Ft)</Label><Input value={fumVolume} onChange={e => setFumVolume(e.target.value)} className="h-8 bg-white" /></div>
                    <div><Label>Sealing Time (Hours)</Label><Input value={fumSealingTime} onChange={e => setFumSealingTime(e.target.value)} className="h-8 bg-white" /></div>
                  </div>
                  <div>
                    <Label>Culture Swab Result</Label>
                    <Select value={fumSwabRes} onValueChange={(v) => setFumSwabRes(v as any)}>
                      <SelectTrigger className="h-8 bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Negative">Negative (Sterile - Safe to operate)</SelectItem>
                        <SelectItem value="Positive">Positive (Bacterial growth - Re-fogging required)</SelectItem>
                        <SelectItem value="Pending">Lab Result Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <Label>Logged By Staff / Technician</Label>
                <Input value={loggedBy} onChange={e => setLoggedBy(e.target.value)} className="h-8 font-bold" />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button className="bg-teal-700 hover:bg-teal-800 text-white font-bold" onClick={handleSaveEntry}>
                Save Register Entry
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
