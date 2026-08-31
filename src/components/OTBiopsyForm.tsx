import React, { useState, useEffect } from 'react';
import { 
  Microscope, 
  Plus, 
  FileText, 
  Printer, 
  CheckCircle2, 
  Clock, 
  Search, 
  AlertCircle,
  Tag,
  Send,
  Download,
  Trash2,
  Edit,
  Eye,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { OTBiopsyRequisition } from '@/types';
import { supabaseService } from '@/services/supabaseService';
import { formatDate } from '@/lib/utils';

const STORAGE_KEY_BIOPSY = 'hms_ot_biopsy_requisitions';

const INITIAL_BIOPSIES: OTBiopsyRequisition[] = [
  {
    id: 'bio-101',
    patientId: 'P-101',
    patientName: 'PRIYANKA PARTE',
    mrn: 'MRN-88210',
    ipdNo: 'IPD-4412',
    age: 34,
    gender: 'Female',
    dateOfCollection: '2026-07-30',
    timeOfCollection: '11:15 AM',
    specimenSite: 'Gallbladder Wall & Cystic Duct Stump',
    clinicalDiagnosis: 'Calculous Cholecystitis with Thickened GB Wall',
    preOpDiagnosis: 'Symptomatic Cholelithiasis',
    natureOfSpecimen: 'Excision (Gallbladder Specimen)',
    fixativeUsed: '10% Buffered Formalin',
    containerLabelCode: 'GB-SPEC-2026-001',
    specialInstructions: 'Check for mucosal dysplasia or carcinoma in situ',
    requisitionedByDoctor: 'Dr. A. K. Sharma (MS, Surgery)',
    status: 'Sent to Pathology',
    createdAt: new Date().toISOString()
  }
];

export default function OTBiopsyForm() {
  const currentUser = storage.get(STORAGE_KEYS.SESSION_USER, null);
  const [requisitions, setRequisitions] = useState<OTBiopsyRequisition[]>(() => {
    return storage.get(STORAGE_KEY_BIOPSY, INITIAL_BIOPSIES);
  });
  const [patients, setPatients] = useState<any[]>([]);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingBio, setViewingBio] = useState<OTBiopsyRequisition | null>(null);

  const [formData, setFormData] = useState({
    patientId: '',
    patientName: '',
    mrn: '',
    ipdNo: '',
    age: 30,
    gender: 'Female',
    dateOfCollection: new Date().toISOString().split('T')[0],
    timeOfCollection: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    specimenSite: '',
    clinicalDiagnosis: '',
    preOpDiagnosis: '',
    natureOfSpecimen: 'Biopsy Specimen',
    fixativeUsed: '10% Buffered Formalin',
    containerLabelCode: `BIO-${Date.now().toString().slice(-6)}`,
    specialInstructions: '',
    requisitionedByDoctor: currentUser?.name || 'Dr. A. K. Sharma'
  });

  useEffect(() => {
    const loadPatients = async () => {
      const pats = await supabaseService.getPatients();
      if (pats && pats.length > 0) setPatients(pats);
    };
    loadPatients();
  }, []);

  const handlePatientSelect = (patId: string) => {
    const p = patients.find(x => x.id === patId);
    if (p) {
      setFormData(prev => ({
        ...prev,
        patientId: p.id,
        patientName: p.name,
        mrn: p.mrn || '',
        ipdNo: p.ipd_number || p.ipdNo || 'IPD-' + Math.floor(1000 + Math.random() * 9000),
        age: p.age || 30,
        gender: p.gender || 'Female'
      }));
    }
  };

  const handleSaveRequisition = () => {
    if (!formData.patientName || !formData.specimenSite) {
      toast.error('Please select patient and specify specimen site');
      return;
    }

    const newReq: OTBiopsyRequisition = {
      id: `bio-${Date.now()}`,
      patientId: formData.patientId || 'P-' + Date.now(),
      patientName: formData.patientName,
      mrn: formData.mrn,
      ipdNo: formData.ipdNo,
      age: Number(formData.age),
      gender: formData.gender,
      dateOfCollection: formData.dateOfCollection,
      timeOfCollection: formData.timeOfCollection,
      specimenSite: formData.specimenSite,
      clinicalDiagnosis: formData.clinicalDiagnosis,
      preOpDiagnosis: formData.preOpDiagnosis,
      natureOfSpecimen: formData.natureOfSpecimen,
      fixativeUsed: formData.fixativeUsed,
      containerLabelCode: formData.containerLabelCode,
      specialInstructions: formData.specialInstructions,
      requisitionedByDoctor: formData.requisitionedByDoctor,
      status: 'Pending Dispatch',
      createdAt: new Date().toISOString()
    };

    const updated = [newReq, ...requisitions];
    setRequisitions(updated);
    storage.set(STORAGE_KEY_BIOPSY, updated);
    toast.success(`Biopsy Test Form generated with Barcode/Label Code: ${newReq.containerLabelCode}`);
    setIsNewDialogOpen(false);

    // Reset form
    setFormData({
      patientId: '',
      patientName: '',
      mrn: '',
      ipdNo: '',
      age: 30,
      gender: 'Female',
      dateOfCollection: new Date().toISOString().split('T')[0],
      timeOfCollection: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      specimenSite: '',
      clinicalDiagnosis: '',
      preOpDiagnosis: '',
      natureOfSpecimen: 'Biopsy Specimen',
      fixativeUsed: '10% Buffered Formalin',
      containerLabelCode: `BIO-${Date.now().toString().slice(-6)}`,
      specialInstructions: '',
      requisitionedByDoctor: currentUser?.name || 'Dr. A. K. Sharma'
    });
  };

  const handleUpdateStatus = (id: string, newStatus: OTBiopsyRequisition['status']) => {
    const updated = requisitions.map(r => r.id === id ? { ...r, status: newStatus } : r);
    setRequisitions(updated);
    storage.set(STORAGE_KEY_BIOPSY, updated);
    toast.success(`Biopsy status updated to "${newStatus}"`);
  };

  const printBiopsySlip = (req: OTBiopsyRequisition) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>OT Biopsy Test Requisition Slip - ${req.containerLabelCode}</title>
          <style>
            * { box-sizing: border-box; -webkit-font-smoothing: antialiased !important; -moz-osx-font-smoothing: grayscale !important; }
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #000000 !important; font-weight: 600; line-height: 1.4; }
            .header { text-align: center; border-bottom: 2.5px solid #000000; padding-bottom: 10px; margin-bottom: 20px; color: #000000 !important; }
            .title { font-size: 20px; font-weight: 900; color: #000000 !important; }
            .subtitle { font-size: 13px; font-weight: 900; text-transform: uppercase; margin-top: 4px; color: #000000 !important; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px; margin-bottom: 15px; }
            .box { border: 1.5px solid #000000; padding: 12px; border-radius: 6px; background-color: #ffffff; color: #000000 !important; }
            .label { font-size: 10px; font-weight: 900; color: #000000 !important; text-transform: uppercase; letter-spacing: 0.3px; }
            .value { font-size: 14px; font-weight: 800; margin-top: 2px; color: #000000 !important; }
            .barcode { font-size: 18px; font-weight: 900; font-family: monospace; letter-spacing: 2px; text-align: center; border: 2px solid #000000; padding: 8px; border-radius: 8px; margin: 15px 0; background: #f8fafc; color: #000000 !important; }
            .footer { margin-top: 30px; display: flex; justify-content: space-between; font-size: 12px; border-top: 1.5px solid #000000; padding-top: 15px; font-weight: 700; color: #000000 !important; }
            @media print {
              * { color: #000000 !important; border-color: #000000 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              body { color: #000000 !important; font-weight: 600 !important; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="font-size: 22px; font-weight: 900; color: #000000 !important;">GASTRO PLUS HOSPITAL</div>
            <div style="font-weight: 800; color: #000000 !important;">Plot No. 7 & 8, Om Shiv Nagar, Gufa Mandir Road, Lal Ghati Bhopal, 462030, Madhya Pradesh | Ph: 9109102145/9109101246</div>
            <div class="subtitle">OPERATION THEATRE - HISTOPATHOLOGY / BIOPSY REQUISITION FORM</div>
          </div>

          <div class="barcode">
            CONTAINER BARCODE / LABEL CODE: <strong>${req.containerLabelCode}</strong>
          </div>

          <div class="grid">
            <div class="box"><div class="label">Patient Name</div><div class="value">${req.patientName} (${req.gender}, ${req.age}Y)</div></div>
            <div class="box"><div class="label">MRN / IPD No.</div><div class="value">${req.mrn || 'N/A'} / ${req.ipdNo || 'N/A'}</div></div>
            <div class="box"><div class="label">Collection Date & Time</div><div class="value">${req.dateOfCollection} at ${req.timeOfCollection}</div></div>
            <div class="box"><div class="label">Requisition Doctor</div><div class="value">${req.requisitionedByDoctor}</div></div>
          </div>

          <div class="box" style="margin-bottom: 12px;">
            <div class="label">Specimen Source / Site</div>
            <div class="value" style="font-size: 16px; color: #000000 !important; font-weight: 900;">${req.specimenSite}</div>
          </div>

          <div class="grid">
            <div class="box"><div class="label">Nature of Specimen</div><div class="value">${req.natureOfSpecimen}</div></div>
            <div class="box"><div class="label">Fixative Used</div><div class="value">${req.fixativeUsed}</div></div>
          </div>

          <div class="box" style="margin-bottom: 12px;">
            <div class="label">Clinical & Pre-Operative Diagnosis</div>
            <div class="value">${req.clinicalDiagnosis || 'N/A'} ${req.preOpDiagnosis ? `(Pre-Op: ${req.preOpDiagnosis})` : ''}</div>
          </div>

          ${req.specialInstructions ? `
            <div class="box" style="margin-bottom: 12px; background-color: #fff7ed; border-color: #ffedd5;">
              <div class="label" style="color: #c2410c;">Special Instructions for Pathologist</div>
              <div class="value" style="color: #9a3412;">${req.specialInstructions}</div>
            </div>
          ` : ''}

          <div class="footer">
            <div>
              <p>Sample Dispatched By: OT Scrub Nurse</p>
              <p>Signature: ______________________</p>
            </div>
            <div style="text-align: right;">
              <p>Requisitioning Surgeon</p>
              <p><strong>${req.requisitionedByDoctor}</strong></p>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const filtered = requisitions.filter(r => 
    (r.patientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.specimenSite || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.containerLabelCode || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 text-purple-800 rounded-lg">
              <Microscope className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg">OT Biopsy & Histopathology Requisitions</CardTitle>
              <CardDescription>Fill biopsy collection forms, print specimen barcodes, and track pathology processing.</CardDescription>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button className="bg-purple-700 hover:bg-purple-800 text-white gap-2 font-bold" onClick={() => setIsNewDialogOpen(true)}>
            <Plus className="w-4 h-4" />
            New Biopsy Requisition
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search by patient, specimen site, or label code..." 
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
                <TableHead>Label Code</TableHead>
                <TableHead>Patient Details</TableHead>
                <TableHead>Specimen Site & Type</TableHead>
                <TableHead>Collection Date/Time</TableHead>
                <TableHead>Surgeon</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length > 0 ? (
                filtered.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-bold text-purple-900 font-mono">
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 font-bold">
                        {req.containerLabelCode}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-bold text-slate-900">{req.patientName}</p>
                        <p className="text-[10px] text-slate-500">MRN: {req.mrn || 'N/A'} • IPD: {req.ipdNo || 'N/A'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-xs text-slate-800">{req.specimenSite}</p>
                        <p className="text-[10px] text-slate-500">{req.natureOfSpecimen} ({req.fixativeUsed})</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {req.dateOfCollection} at {req.timeOfCollection}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-700">
                      {req.requisitionedByDoctor}
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        req.status === 'Report Received' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                        req.status === 'In Analysis' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                        req.status === 'Sent to Pathology' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                        'bg-slate-100 text-slate-800 border-slate-300'
                      }>
                        {req.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setViewingBio(req)} className="h-8 text-xs gap-1 text-purple-700">
                          <Eye className="w-3.5 h-3.5" /> View
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => printBiopsySlip(req)} className="h-8 text-xs gap-1 border-purple-200 text-purple-900 hover:bg-purple-50">
                          <Printer className="w-3.5 h-3.5" /> Print
                        </Button>
                        <Select value={req.status} onValueChange={(val) => handleUpdateStatus(req.id, val as any)}>
                          <SelectTrigger className="h-8 text-[11px] w-[130px]"><SelectValue placeholder="Update Status" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pending Dispatch">Pending Dispatch</SelectItem>
                            <SelectItem value="Sent to Pathology">Sent to Pathology</SelectItem>
                            <SelectItem value="In Analysis">In Analysis</SelectItem>
                            <SelectItem value="Report Received">Report Received</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                    No Biopsy Test requisitions recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* New Biopsy Dialog */}
        <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-purple-900">
                <Microscope className="w-5 h-5 text-purple-700" />
                New OT Biopsy / Histopathology Form
              </DialogTitle>
              <DialogDescription>
                Generate an official biopsy specimen form and specimen jar label code for pathology analysis.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="space-y-1">
                <Label>Select Patient from OT / IPD List</Label>
                <Select value={formData.patientId} onValueChange={handlePatientSelect}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select Patient..." /></SelectTrigger>
                  <SelectContent>
                    {patients.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name} (MRN: {p.mrn || 'N/A'})</SelectItem>
                    ))}
                    <SelectItem value="P-101">PRIYANKA PARTE (MRN-88210)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Patient Name</Label>
                  <Input value={formData.patientName} onChange={e => setFormData({...formData, patientName: e.target.value})} className="h-8 font-bold" />
                </div>
                <div className="space-y-1">
                  <Label>IPD No. / MRN</Label>
                  <Input value={formData.ipdNo} onChange={e => setFormData({...formData, ipdNo: e.target.value})} className="h-8" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Date of Specimen Collection</Label>
                  <Input type="date" value={formData.dateOfCollection} onChange={e => setFormData({...formData, dateOfCollection: e.target.value})} className="h-8" />
                </div>
                <div className="space-y-1">
                  <Label>Time of Collection</Label>
                  <Input value={formData.timeOfCollection} onChange={e => setFormData({...formData, timeOfCollection: e.target.value})} className="h-8" />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="font-bold text-purple-900">Specimen Source / Site (Exact Tissue)</Label>
                <Input 
                  placeholder="e.g. Gallbladder wall, Liver nodule, Antral gastric mucosa, Colon mass" 
                  value={formData.specimenSite} 
                  onChange={e => setFormData({...formData, specimenSite: e.target.value})}
                  className="h-9 font-semibold border-purple-300 bg-purple-50/40" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Nature of Specimen</Label>
                  <Select value={formData.natureOfSpecimen} onValueChange={val => setFormData({...formData, natureOfSpecimen: val})}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Biopsy Specimen">Biopsy Specimen</SelectItem>
                      <SelectItem value="Excision (Gallbladder / Tumor / Appendix)">Excision Specimen</SelectItem>
                      <SelectItem value="Incision Biopsy">Incision Biopsy</SelectItem>
                      <SelectItem value="Endoscopic Mucosal Resection (EMR)">Endoscopic Mucosal Resection (EMR)</SelectItem>
                      <SelectItem value="FNA / Cytology Fluid">FNA / Cytology Fluid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Fixative Solution Used</Label>
                  <Input value={formData.fixativeUsed} onChange={e => setFormData({...formData, fixativeUsed: e.target.value})} className="h-8" />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Clinical & Pre-Operative Diagnosis</Label>
                <Textarea 
                  placeholder="Enter clinical findings and operative diagnosis..." 
                  value={formData.clinicalDiagnosis} 
                  onChange={e => setFormData({...formData, clinicalDiagnosis: e.target.value})}
                  rows={2}
                  className="text-xs" 
                />
              </div>

              <div className="space-y-1">
                <Label>Special Instructions for Pathologist</Label>
                <Input 
                  placeholder="e.g. Check resection margins, Rule out dysplasia, IHC marker recommended" 
                  value={formData.specialInstructions} 
                  onChange={e => setFormData({...formData, specialInstructions: e.target.value})}
                  className="h-8" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Requisitioned Surgeon</Label>
                  <Input value={formData.requisitionedByDoctor} onChange={e => setFormData({...formData, requisitionedByDoctor: e.target.value})} className="h-8 font-semibold" />
                </div>
                <div className="space-y-1">
                  <Label>Container Label Barcode</Label>
                  <Input value={formData.containerLabelCode} onChange={e => setFormData({...formData, containerLabelCode: e.target.value})} className="h-8 font-mono bg-slate-100" />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewDialogOpen(false)}>Cancel</Button>
              <Button className="bg-purple-700 hover:bg-purple-800 text-white font-bold" onClick={handleSaveRequisition}>
                Generate Biopsy Requisition
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Biopsy Detail Modal */}
        <Dialog open={!!viewingBio} onOpenChange={(open) => { if (!open) setViewingBio(null); }}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-purple-900">
                <Microscope className="w-5 h-5 text-purple-700" />
                Biopsy Requisition #{viewingBio?.containerLabelCode}
              </DialogTitle>
            </DialogHeader>

            {viewingBio && (
              <div className="space-y-3 py-2 text-xs">
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 flex justify-between items-center">
                  <div>
                    <p className="font-black text-sm text-purple-950">{viewingBio.patientName}</p>
                    <p className="text-slate-600">MRN: {viewingBio.mrn || 'N/A'} • IPD: {viewingBio.ipdNo || 'N/A'}</p>
                  </div>
                  <Badge className="bg-purple-700 text-white font-mono">{viewingBio.containerLabelCode}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div><span className="text-slate-500 font-bold uppercase text-[10px]">Collection Date:</span> <p className="font-semibold">{viewingBio.dateOfCollection} at {viewingBio.timeOfCollection}</p></div>
                  <div><span className="text-slate-500 font-bold uppercase text-[10px]">Status:</span> <p className="font-semibold text-purple-700">{viewingBio.status}</p></div>
                  <div className="col-span-2"><span className="text-slate-500 font-bold uppercase text-[10px]">Specimen Site:</span> <p className="font-black text-slate-900">{viewingBio.specimenSite}</p></div>
                  <div><span className="text-slate-500 font-bold uppercase text-[10px]">Nature of Specimen:</span> <p>{viewingBio.natureOfSpecimen}</p></div>
                  <div><span className="text-slate-500 font-bold uppercase text-[10px]">Fixative:</span> <p>{viewingBio.fixativeUsed}</p></div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Clinical Diagnosis:</span>
                  <p className="font-medium">{viewingBio.clinicalDiagnosis || 'N/A'}</p>
                </div>

                {viewingBio.specialInstructions && (
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 space-y-1">
                    <span className="text-amber-700 font-bold uppercase text-[10px]">Special Instructions:</span>
                    <p className="text-amber-900">{viewingBio.specialInstructions}</p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setViewingBio(null)}>Close</Button>
              {viewingBio && (
                <Button className="bg-purple-700 text-white font-bold gap-1" onClick={() => printBiopsySlip(viewingBio)}>
                  <Printer className="w-4 h-4" /> Print Requisition Slip
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
