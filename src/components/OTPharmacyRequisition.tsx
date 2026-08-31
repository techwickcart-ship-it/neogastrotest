import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Search, 
  PackageCheck, 
  Pill,
  Trash2,
  Printer,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { OTPharmacyRequisition } from '@/types';
import { supabaseService } from '@/services/supabaseService';

const STORAGE_KEY_OT_PHARM_REQ = 'hms_ot_pharmacy_requisitions';

const COMMON_OT_DRUGS = [
  { id: 'd1', name: 'Inj. Propofol 1% 20ml', category: 'Anaesthetic', unit: 'Ampoule' },
  { id: 'd2', name: 'Inj. Atracurium 25mg/2.5ml', category: 'Muscle Relaxant', unit: 'Ampoule' },
  { id: 'd3', name: 'Inj. Midazolam 5mg/5ml', category: 'Sedative', unit: 'Ampoule' },
  { id: 'd4', name: 'Sevoflurane Inhalation Liquid 250ml', category: 'Inhalational Anaesthetic', unit: 'Bottle' },
  { id: 'd5', name: 'Inj. Cefuroxime 1.5g', category: 'Antibiotic', unit: 'Vial' },
  { id: 'd6', name: 'Vicryl 2-0 Sutures with Needle', category: 'Surgical Suture', unit: 'Pcs' },
  { id: 'd7', name: 'Monocryl 3-0 Sutures', category: 'Surgical Suture', unit: 'Pcs' },
  { id: 'd8', name: 'Normal Saline 0.9% 500ml', category: 'IV Fluid', unit: 'Bottle' },
  { id: 'd9', name: 'Ringer Lactate (RL) 500ml', category: 'IV Fluid', unit: 'Bottle' },
  { id: 'd10', name: 'Inj. Ondansetron 4mg/2ml', category: 'Anti-emetic', unit: 'Ampoule' },
  { id: 'd11', name: 'Inj. Tramadol 100mg/2ml', category: 'Analgesic', unit: 'Ampoule' },
  { id: 'd12', name: 'Spinal Needle 25G', category: 'Disposable', unit: 'Pcs' },
  { id: 'd13', name: 'Sterile Laparotomy Gauze Swabs (10s)', category: 'Disposables', unit: 'Pack' },
  { id: 'd14', name: 'Foley Catheter 16 Fr + Urobag', category: 'Catheter', unit: 'Set' },
  { id: 'd15', name: 'Inj. Bupivacaine Heavy 0.5% (4ml)', category: 'Spinal Anaesthetic', unit: 'Ampoule' },
  { id: 'd16', name: 'Inj. Fentanyl 50mcg/ml (2ml)', category: 'Opioid Analgesic', unit: 'Ampoule' },
  { id: 'd17', name: 'Inj. Glycopyrrolate 0.2mg/ml', category: 'Anticholinergic', unit: 'Ampoule' },
  { id: 'd18', name: 'Inj. Neostigmine 0.5mg/ml', category: 'Reversal Agent', unit: 'Ampoule' },
  { id: 'd19', name: 'Inj. Adrenaline 1mg/ml STAT', category: 'Emergency Drug', unit: 'Ampoule' },
  { id: 'd20', name: 'Inj. Pantoprazole 40mg IV', category: 'PPI Antibacterial', unit: 'Vial' },
  { id: 'd21', name: 'Prolene 3-0 Suture', category: 'Surgical Suture', unit: 'Pcs' }
];

const INITIAL_REQUISITIONS: OTPharmacyRequisition[] = [
  {
    id: 'ot-req-101',
    patientId: 'P-101',
    patientName: 'PRIYANKA PARTE (Laparoscopic Cholecystectomy)',
    otRoomId: '1',
    otRoomName: 'OT Room-1',
    requisitionDate: new Date().toISOString().split('T')[0],
    requisitionTime: '09:30 AM',
    requestedByStaff: 'Nurse Deepika Roy',
    urgency: 'Urgent',
    items: [
      { itemId: 'd1', itemName: 'Inj. Propofol 1% 20ml', requestedQty: 2, unit: 'Ampoule' },
      { itemId: 'd6', itemName: 'Vicryl 2-0 Sutures with Needle', requestedQty: 3, unit: 'Pcs' },
      { itemId: 'd8', itemName: 'Normal Saline 0.9% 500ml', requestedQty: 4, unit: 'Bottle' }
    ],
    status: 'Issued/Dispatched',
    notes: 'Urgent setup for morning scheduled laparoscopic cholecystectomy.',
    createdAt: new Date().toISOString()
  }
];

export default function OTPharmacyRequisitionComponent() {
  const currentUser = storage.get(STORAGE_KEYS.SESSION_USER, null);
  const [requisitions, setRequisitions] = useState<OTPharmacyRequisition[]>(() => {
    return storage.get(STORAGE_KEY_OT_PHARM_REQ, INITIAL_REQUISITIONS);
  });
  const [patients, setPatients] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [patientId, setPatientId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [otRoomName, setOtRoomName] = useState('OT Room-1');
  const [urgency, setUrgency] = useState<'Normal' | 'Urgent' | 'Emergency OT'>('Urgent');
  const [notes, setNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState<Array<{ itemId: string; itemName: string; requestedQty: number; unit: string }>>([]);

  const [newItemId, setNewItemId] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);

  useEffect(() => {
    const loadPats = async () => {
      const p = await supabaseService.getPatients();
      if (p && p.length > 0) setPatients(p);
    };
    loadPats();
  }, []);

  const handleAddItemToReq = () => {
    if (!newItemId) return;
    const drug = COMMON_OT_DRUGS.find(d => d.id === newItemId);
    if (!drug) return;

    const existingIdx = selectedItems.findIndex(i => i.itemId === newItemId);
    if (existingIdx !== -1) {
      const updated = [...selectedItems];
      updated[existingIdx].requestedQty += Number(newItemQty);
      setSelectedItems(updated);
    } else {
      setSelectedItems([...selectedItems, {
        itemId: drug.id,
        itemName: drug.name,
        requestedQty: Number(newItemQty),
        unit: drug.unit
      }]);
    }

    setNewItemId('');
    setNewItemQty(1);
  };

  const handleRemoveItem = (idx: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== idx));
  };

  const handleSaveRequisition = () => {
    if (selectedItems.length === 0) {
      toast.error('Please add at least one drug or surgical consumable item');
      return;
    }

    const newReq: OTPharmacyRequisition = {
      id: `ot-req-${Date.now()}`,
      patientId: patientId || undefined,
      patientName: patientName || 'General OT Bulk Requisition',
      otRoomName: otRoomName,
      requisitionDate: new Date().toISOString().split('T')[0],
      requisitionTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      requestedByStaff: currentUser?.name || 'OT Scrub Nurse',
      urgency: urgency,
      items: selectedItems,
      status: 'Requested',
      notes: notes,
      createdAt: new Date().toISOString()
    };

    const updated = [newReq, ...requisitions];
    setRequisitions(updated);
    storage.set(STORAGE_KEY_OT_PHARM_REQ, updated);
    toast.success(`Pharmacy Requisition ${newReq.id} submitted successfully to Pharmacy Depot!`);

    setIsDialogOpen(false);
    setSelectedItems([]);
    setPatientId('');
    setPatientName('');
    setNotes('');
  };

  const handleUpdateStatus = (id: string, newStatus: OTPharmacyRequisition['status']) => {
    const updated = requisitions.map(r => r.id === id ? { ...r, status: newStatus } : r);
    setRequisitions(updated);
    storage.set(STORAGE_KEY_OT_PHARM_REQ, updated);
    toast.success(`OT Pharmacy Requisition status updated to ${newStatus}`);
  };

  const filtered = requisitions.filter(r => 
    (r.patientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.otRoomName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.requestedByStaff || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-lg">OT Pharmacy & Material Requisitions</CardTitle>
            <CardDescription>Requisition emergency drugs, anaesthetics, and surgical consumables from Pharmacy for OT procedures.</CardDescription>
          </div>
        </div>

        <Button className="bg-amber-600 hover:bg-amber-700 text-white gap-2 font-bold" onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4" />
          New Pharmacy Requisition
        </Button>
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search by patient, OT room or staff name..." 
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
                <TableHead>Req ID & Date</TableHead>
                <TableHead>OT Room / Patient</TableHead>
                <TableHead>Requested Items</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length > 0 ? (
                filtered.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>
                      <div>
                        <p className="font-bold text-amber-900 font-mono text-xs">{req.id}</p>
                        <p className="text-[10px] text-slate-500">{req.requisitionDate} {req.requisitionTime}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-bold text-slate-900">{req.otRoomName || 'OT'}</p>
                        <p className="text-[10px] text-slate-600">{req.patientName || 'Bulk OT Requisition'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        {req.items.map((it, idx) => (
                          <div key={idx} className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            {it.itemName} <Badge variant="secondary" className="text-[9px] px-1 py-0">{it.requestedQty} {it.unit}</Badge>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-700">
                      {req.requestedByStaff}
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        req.urgency === 'Emergency OT' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                        req.urgency === 'Urgent' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                        'bg-slate-100 text-slate-800 border-slate-300'
                      }>
                        {req.urgency}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        req.status === 'Completed' || req.status === 'Issued/Dispatched' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                        req.status === 'In Progress' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                        'bg-amber-100 text-amber-800 border-amber-300'
                      }>
                        {req.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Select value={req.status} onValueChange={(val) => handleUpdateStatus(req.id, val as any)}>
                        <SelectTrigger className="h-8 text-[11px] w-[140px]"><SelectValue placeholder="Update Status" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Requested">Requested</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Issued/Dispatched">Issued/Dispatched</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                          <SelectItem value="Cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                    No OT Pharmacy requisitions submitted yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* New Requisition Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-900">
                <ShoppingCart className="w-5 h-5 text-amber-600" />
                New OT Pharmacy & Consumables Requisition
              </DialogTitle>
              <DialogDescription>
                Request anaesthetics, emergency drugs, sutures, or fluids from Pharmacy for an OT room or patient.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>OT Room</Label>
                  <Select value={otRoomName} onValueChange={setOtRoomName}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OT Room-1">OT Room-1 (Laparoscopy / Major)</SelectItem>
                      <SelectItem value="OT Room-2">OT Room-2 (General Surgery)</SelectItem>
                      <SelectItem value="OT Room-3">OT Room-3 (Endoscopy / Minor)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Urgency Level</Label>
                  <Select value={urgency} onValueChange={v => setUrgency(v as any)}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Normal">Normal Setup</SelectItem>
                      <SelectItem value="Urgent">Urgent Procedure</SelectItem>
                      <SelectItem value="Emergency OT">Emergency OT STAT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Select Patient (Optional for patient-specific billing)</Label>
                <Select value={patientId} onValueChange={pid => {
                  setPatientId(pid);
                  const p = patients.find(x => x.id === pid);
                  if (p) setPatientName(p.name);
                }}>
                  <SelectTrigger className="h-8"><SelectValue placeholder="Bulk OT Stock or Choose Patient" /></SelectTrigger>
                  <SelectContent>
                    {patients.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name} ({p.mrn || 'N/A'})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <Label className="font-bold text-slate-800">Add Drug / Surgical Consumable</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select value={newItemId} onValueChange={setNewItemId}>
                      <SelectTrigger className="h-8 bg-white"><SelectValue placeholder="Select Drug or Consumable..." /></SelectTrigger>
                      <SelectContent>
                        {COMMON_OT_DRUGS.map(d => (
                          <SelectItem key={d.id} value={d.id}>{d.name} ({d.category})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input 
                    type="number" 
                    min={1} 
                    value={newItemQty} 
                    onChange={e => setNewItemQty(Number(e.target.value))} 
                    className="w-16 h-8 bg-white" 
                  />
                  <Button type="button" onClick={handleAddItemToReq} className="h-8 bg-amber-600 hover:bg-amber-700 text-white font-bold">
                    Add
                  </Button>
                </div>

                {/* Selected Items List */}
                {selectedItems.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-slate-200">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Items in Requisition List:</p>
                    {selectedItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200">
                        <span className="font-semibold text-slate-900">{item.itemName}</span>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-amber-100 text-amber-900 border-amber-200 font-bold">{item.requestedQty} {item.unit}</Badge>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(idx)} className="h-6 w-6 text-rose-600">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label>Nurse Remarks / Special Instructions</Label>
                <Input 
                  placeholder="e.g. Keep ready at OT Room 1 counter before 10:00 AM" 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)}
                  className="h-8" 
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button className="bg-amber-600 hover:bg-amber-700 text-white font-bold" onClick={handleSaveRequisition}>
                Submit Pharmacy Requisition
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
