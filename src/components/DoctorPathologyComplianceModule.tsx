import React, { useState, useEffect } from 'react';
import { 
  FlaskConical, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText, 
  User, 
  Plus, 
  Printer, 
  Search, 
  Edit3, 
  Check, 
  ShieldCheck, 
  Stethoscope, 
  ArrowRight,
  Info,
  Maximize2,
  Minimize2,
  Trash2
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { DoctorPathologyOrder } from '../types';

const INITIAL_DOCTOR_PATH_ORDERS: DoctorPathologyOrder[] = [
  {
    id: 'dpo-101',
    patientId: 'p1',
    patientName: 'PRIYANKA PARTE',
    regNo: 'NH/1871/2026',
    doctorName: 'Dr. A. K. Sharma (MD, Gastro)',
    doctorNoteRef: 'Post-Op Day 1 Note: Check CBC, LFT & Serum Electrolytes to monitor recovery.',
    orderDate: new Date().toISOString(),
    testCategory: 'Haematology',
    testNames: ['Complete Blood Count (CBC)', 'Liver Function Test (LFT)', 'Serum Electrolytes (Na+, K+, Cl-)'],
    specialInstructionsFromDoctor: 'Urgent Stat sample processing required before evening rounds.',
    status: 'Pending',
    labResults: [
      { testName: 'Hemoglobin (Hb)', resultValue: '12.4', unit: 'g/dL', normalRange: '12.0 - 15.0', status: 'Normal' },
      { testName: 'TLC (Total Leukocyte Count)', resultValue: '8,500', unit: '/cu mm', normalRange: '4,000 - 11,000', status: 'Normal' },
      { testName: 'Platelet Count', resultValue: '2.4', unit: 'Lakhs/cu mm', normalRange: '1.5 - 4.5', status: 'Normal' }
    ]
  },
  {
    id: 'dpo-102',
    patientId: 'p2',
    patientName: 'RAJESH KUMAR',
    regNo: 'NH/1899/2026',
    doctorName: 'Dr. Sunita Rao (MS, Surgery)',
    doctorNoteRef: 'Pre-Op Workup Note: Stool Occult Blood & Viral Markers required.',
    orderDate: new Date(Date.now() - 3600000 * 5).toISOString(),
    testCategory: 'Clinical Pathology',
    testNames: ['Stool Routine & Occult Blood', 'HBsAg & HCV Rapid'],
    specialInstructionsFromDoctor: 'Check for microscopic GI blood loss.',
    status: 'Completed',
    labResults: [
      { testName: 'Stool Occult Blood', resultValue: 'Negative', unit: '-', normalRange: 'Negative', status: 'Normal' },
      { testName: 'HBsAg', resultValue: 'Non-Reactive', unit: '-', normalRange: 'Non-Reactive', status: 'Normal' }
    ],
    labRemarks: 'In compliance with doctor instructions. Sample processed on Sysmex Automated Analyzer.',
    labTechName: 'Lab Tech Ramesh Verma',
    completedAt: new Date(Date.now() - 3600000 * 2).toISOString()
  }
];

export default function DoctorPathologyComplianceModule() {
  const [orders, setOrders] = useState<DoctorPathologyOrder[]>(() => {
    const saved = localStorage.getItem('doctor_pathology_orders');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return INITIAL_DOCTOR_PATH_ORDERS;
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Completed'>('All');
  const [isFulfillModalOpen, setIsFulfillModalOpen] = useState(false);
  const [isFulfillFullscreen, setIsFulfillFullscreen] = useState(false);
  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<DoctorPathologyOrder | null>(null);

  // Fulfillment form state
  const [fulfillmentResults, setFulfillmentResults] = useState<{
    testName: string;
    resultValue: string;
    unit: string;
    normalRange: string;
    status: 'Normal' | 'Abnormal' | 'Critical';
  }[]>([]);
  const [labRemarks, setLabRemarks] = useState('');
  const [labTechName, setLabTechName] = useState('Lab Tech Ramesh Verma');

  // New Doctor Note Order Form State
  const [newOrder, setNewOrder] = useState({
    patientName: '',
    regNo: '',
    doctorName: 'Dr. A. K. Sharma (Gastroenterologist)',
    doctorNoteRef: '',
    testCategory: 'Haematology' as DoctorPathologyOrder['testCategory'],
    testNamesInput: 'CBC, LFT, Serum Electrolytes',
    specialInstructionsFromDoctor: ''
  });

  useEffect(() => {
    localStorage.setItem('doctor_pathology_orders', JSON.stringify(orders));
  }, [orders]);

  const handleOpenFulfillModal = (order: DoctorPathologyOrder) => {
    setSelectedOrder(order);
    if (order.labResults && order.labResults.length > 0) {
      setFulfillmentResults(order.labResults);
    } else {
      setFulfillmentResults(
        order.testNames.map(name => ({
          testName: name,
          resultValue: '',
          unit: 'mg/dL',
          normalRange: 'Normal',
          status: 'Normal'
        }))
      );
    }
    setLabRemarks(order.labRemarks || 'Data filled by Pathology Lab in full compliance with doctor instructions.');
    setIsFulfillModalOpen(true);
  };

  const handleAddResultRow = () => {
    setFulfillmentResults([
      ...fulfillmentResults,
      { testName: '', resultValue: '', unit: '', normalRange: '', status: 'Normal' }
    ]);
  };

  const handleSaveFulfillment = () => {
    if (!selectedOrder) return;

    const updated = orders.map(ord => {
      if (ord.id === selectedOrder.id) {
        return {
          ...ord,
          status: 'Completed' as const,
          labResults: fulfillmentResults,
          labRemarks,
          labTechName,
          completedAt: new Date().toISOString()
        };
      }
      return ord;
    });

    setOrders(updated);
    setIsFulfillModalOpen(false);
    toast.success('Pathology results published in compliance with doctor instructions!');
  };

  const handleCreateOrder = () => {
    if (!newOrder.patientName || !newOrder.doctorNoteRef) {
      toast.error('Please fill patient name and doctor note reference');
      return;
    }

    const testArray = newOrder.testNamesInput.split(',').map(s => s.trim()).filter(Boolean);

    const created: DoctorPathologyOrder = {
      id: `dpo-${Date.now()}`,
      patientId: `p-${Date.now()}`,
      patientName: newOrder.patientName,
      regNo: newOrder.regNo || 'NH/1900/2026',
      doctorName: newOrder.doctorName,
      doctorNoteRef: newOrder.doctorNoteRef,
      orderDate: new Date().toISOString(),
      testCategory: newOrder.testCategory,
      testNames: testArray.length > 0 ? testArray : ['Pathology Panel'],
      specialInstructionsFromDoctor: newOrder.specialInstructionsFromDoctor,
      status: 'Pending'
    };

    setOrders([created, ...orders]);
    setIsCreateOrderModalOpen(false);
    toast.success('Doctor Pathology Order added to Lab compliance queue!');
  };

  const filteredOrders = orders.filter(ord => {
    const matchesSearch = ord.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          ord.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          ord.testNames.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'All' || ord.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-900 to-slate-900 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-teal-500/20 border border-teal-400/30 text-teal-400 rounded-xl shrink-0">
            <FlaskConical className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-base uppercase tracking-wider">
                Doctor Note Pathological Test Compliance Console
              </h2>
              <Badge className="bg-teal-500/30 text-teal-200 border-teal-400/40 text-[10px] font-bold">
                LAB COMPLIANCE MODE
              </Badge>
            </div>
            <p className="text-xs text-teal-100/80 mt-0.5">
              Pathological data entries filled by Laboratory in compliance with attending doctor's clinical notes & treatment sheets.
            </p>
          </div>
        </div>

        <Button 
          onClick={() => setIsCreateOrderModalOpen(true)}
          className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-black text-xs gap-1.5 shadow-md shrink-0"
        >
          <Plus className="w-4 h-4" /> Add Doctor Note Order
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <Input 
            placeholder="Search patient, doctor, or test name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Badge variant="outline" className="text-xs font-bold text-slate-600">
            Pending: {orders.filter(o => o.status === 'Pending').length}
          </Badge>
          <Badge variant="outline" className="text-xs font-bold text-emerald-700 bg-emerald-50">
            Completed: {orders.filter(o => o.status === 'Completed').length}
          </Badge>

          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="w-32 h-9 text-xs font-bold"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Statuses</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Orders List Table */}
      <Card className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <CardContent className="p-0">
          <Table className="text-xs">
            <TableHeader className="bg-slate-50 font-bold text-slate-700">
              <TableRow>
                <TableHead>Patient Details</TableHead>
                <TableHead>Doctor & Note Reference</TableHead>
                <TableHead>Pathological Tests Requested</TableHead>
                <TableHead>Status & Compliance</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredOrders.map(order => (
                <TableRow key={order.id} className="hover:bg-slate-50/80 transition-colors">
                  <TableCell className="py-3">
                    <p className="font-extrabold text-slate-900 text-xs">{order.patientName}</p>
                    <p className="text-[10px] text-slate-500 font-medium">Reg: {order.regNo || 'N/A'}</p>
                    <p className="text-[10px] text-slate-400">{new Date(order.orderDate).toLocaleDateString()}</p>
                  </TableCell>

                  <TableCell className="py-3 max-w-xs">
                    <div className="flex items-center gap-1.5 font-bold text-teal-800 text-xs">
                      <Stethoscope className="w-3.5 h-3.5 shrink-0" />
                      <span>{order.doctorName}</span>
                    </div>
                    <div className="mt-1 p-1.5 bg-amber-50 border border-amber-200 rounded-md text-[11px] text-amber-900 italic line-clamp-2">
                      "{order.doctorNoteRef}"
                    </div>
                  </TableCell>

                  <TableCell className="py-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Badge className="bg-teal-100 text-teal-900 border-teal-300 text-[10px] font-bold">
                        {order.testCategory}
                      </Badge>
                    </div>
                    <ul className="list-disc list-inside text-[11px] font-semibold text-slate-800 space-y-0.5">
                      {order.testNames.map((tn, idx) => (
                        <li key={idx}>{tn}</li>
                      ))}
                    </ul>
                    {order.specialInstructionsFromDoctor && (
                      <p className="text-[10px] text-rose-700 font-bold mt-1">
                        ★ {order.specialInstructionsFromDoctor}
                      </p>
                    )}
                  </TableCell>

                  <TableCell className="py-3">
                    {order.status === 'Completed' ? (
                      <div className="space-y-1">
                        <Badge className="bg-emerald-600 text-white font-extrabold text-[10px] gap-1">
                          <ShieldCheck className="w-3 h-3" /> COMPLIED & PUBLISHED
                        </Badge>
                        <p className="text-[10px] text-slate-500 font-medium">By {order.labTechName}</p>
                      </div>
                    ) : (
                      <Badge className="bg-amber-500 text-slate-950 font-extrabold text-[10px] gap-1">
                        <Clock className="w-3 h-3" /> PENDING LAB FILL
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell className="py-3 text-right">
                    <Button 
                      size="sm" 
                      onClick={() => handleOpenFulfillModal(order)}
                      className={order.status === 'Completed' ? "bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs h-8" : "bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs h-8"}
                    >
                      {order.status === 'Completed' ? "View / Edit Results" : "Fill Lab Data"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {filteredOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                    No doctor pathology note instructions found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal: Fill Lab Data in Compliance with Doctor Note */}
      <Dialog open={isFulfillModalOpen} onOpenChange={setIsFulfillModalOpen}>
        <DialogContent 
          showCloseButton={false}
          className={
            isFulfillFullscreen
              ? "fixed inset-0 top-0 left-0 translate-x-0 translate-y-0 w-screen h-screen max-w-none sm:max-w-none md:max-w-none lg:max-w-none xl:max-w-none max-h-screen rounded-none z-50 flex flex-col p-0 overflow-hidden bg-white border-none shadow-none m-0"
              : "w-[96vw] max-w-[96vw] sm:max-w-[96vw] md:max-w-[96vw] lg:max-w-[1100px] h-[92vh] max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl border-none shadow-2xl bg-white"
          }
        >
          <DialogHeader className="p-5 bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-10 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30">
                <FlaskConical className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-black text-white uppercase tracking-wide truncate">
                  Pathology Data Entry in Compliance with Doctor's Note
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-300 truncate mt-0.5">
                  Fill analytical findings requested by <span className="text-teal-200 font-bold">{selectedOrder?.doctorName}</span> for patient <span className="text-white font-bold">{selectedOrder?.patientName}</span> ({selectedOrder?.regNo})
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFulfillFullscreen(!isFulfillFullscreen)}
                className="h-8 gap-1.5 text-xs font-semibold px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                title={isFulfillFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFulfillFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{isFulfillFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
              </Button>
              <Button
                variant="ghost"
                onClick={() => setIsFulfillModalOpen(false)}
                className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800 font-bold text-base rounded-lg"
              >
                ✕
              </Button>
            </div>
          </DialogHeader>

          {selectedOrder && (
            <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-50/50">
              {/* Doctor's Clinical Note Card */}
              <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-xl text-amber-950 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs border-b border-amber-200/60 pb-2">
                  <span className="font-extrabold uppercase tracking-wide text-amber-900 flex items-center gap-1.5">
                    <Stethoscope className="w-4 h-4 text-amber-700" /> Doctor's Clinical Note Instructions
                  </span>
                  <Badge variant="outline" className="bg-amber-100 text-amber-900 border-amber-300 font-bold text-[11px]">
                    {selectedOrder.doctorName}
                  </Badge>
                </div>
                <p className="text-sm font-semibold italic text-amber-900/90 leading-relaxed bg-white/60 p-3 rounded-lg border border-amber-200/40">
                  "{selectedOrder.doctorNoteRef}"
                </p>
                {selectedOrder.specialInstructionsFromDoctor && (
                  <div className="text-xs text-amber-800 font-medium flex items-center gap-1.5 pt-1">
                    <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Special Instructions: {selectedOrder.specialInstructionsFromDoctor}</span>
                  </div>
                )}
              </div>

              {/* Test Parameters Findings Entry Section */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                      <FileText className="w-4 h-4 text-teal-600" /> Test Parameter Findings
                    </h4>
                    <p className="text-xs text-slate-500">Enter result values, units, and reference ranges for each requested parameter.</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={handleAddResultRow} className="h-8 text-xs font-bold border-teal-600 text-teal-700 hover:bg-teal-50 gap-1 self-start sm:self-auto">
                    <Plus className="w-3.5 h-3.5" /> Add Parameter Row
                  </Button>
                </div>

                {/* Table for Parameters */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                  <div className="overflow-x-auto">
                    <Table className="w-full min-w-[650px]">
                      <TableHeader className="bg-slate-100/90">
                        <TableRow className="border-b border-slate-200 hover:bg-transparent">
                          <TableHead className="w-[38%] text-[11px] font-extrabold text-slate-700 uppercase tracking-wider py-3">Test Parameter Name</TableHead>
                          <TableHead className="w-[22%] text-[11px] font-extrabold text-slate-700 uppercase tracking-wider py-3">Result Value</TableHead>
                          <TableHead className="w-[18%] text-[11px] font-extrabold text-slate-700 uppercase tracking-wider py-3">Unit</TableHead>
                          <TableHead className="w-[17%] text-[11px] font-extrabold text-slate-700 uppercase tracking-wider py-3">Reference Range</TableHead>
                          <TableHead className="w-[5%] text-center text-[11px] font-extrabold text-slate-700 uppercase tracking-wider py-3">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-slate-100">
                        {fulfillmentResults.map((res, idx) => (
                          <TableRow key={idx} className="hover:bg-teal-50/20 transition-colors">
                            <TableCell className="p-2.5">
                              <Input 
                                value={res.testName} 
                                onChange={e => {
                                  const copy = [...fulfillmentResults];
                                  copy[idx].testName = e.target.value;
                                  setFulfillmentResults(copy);
                                }}
                                placeholder="e.g. Hemoglobin (Hb)" 
                                className="h-9 text-xs font-bold text-slate-900 bg-white border-slate-300 focus-visible:ring-teal-500 w-full" 
                              />
                            </TableCell>

                            <TableCell className="p-2.5">
                              <Input 
                                value={res.resultValue} 
                                onChange={e => {
                                  const copy = [...fulfillmentResults];
                                  copy[idx].resultValue = e.target.value;
                                  setFulfillmentResults(copy);
                                }}
                                placeholder="e.g. 12.4" 
                                className="h-9 text-xs font-black text-teal-950 bg-teal-50 border-teal-300 focus-visible:ring-teal-500 w-full" 
                              />
                            </TableCell>

                            <TableCell className="p-2.5">
                              <Input 
                                value={res.unit || ''} 
                                onChange={e => {
                                  const copy = [...fulfillmentResults];
                                  copy[idx].unit = e.target.value;
                                  setFulfillmentResults(copy);
                                }}
                                placeholder="e.g. g/dL" 
                                className="h-9 text-xs bg-white border-slate-300 w-full" 
                              />
                            </TableCell>

                            <TableCell className="p-2.5">
                              <Input 
                                value={res.normalRange || ''} 
                                onChange={e => {
                                  const copy = [...fulfillmentResults];
                                  copy[idx].normalRange = e.target.value;
                                  setFulfillmentResults(copy);
                                }}
                                placeholder="12.0 - 15.0" 
                                className="h-9 text-xs bg-white border-slate-300 w-full" 
                              />
                            </TableCell>

                            <TableCell className="p-2.5 text-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const copy = fulfillmentResults.filter((_, i) => i !== idx);
                                  setFulfillmentResults(copy);
                                }}
                                className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg mx-auto"
                                title="Remove row"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>

              {/* Lab Technician Remarks & Info */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-1.5">
                    <Label className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
                      Lab Technician Remarks & Analyzer Information
                    </Label>
                    <Textarea 
                      value={labRemarks} 
                      onChange={e => setLabRemarks(e.target.value)}
                      placeholder="e.g. Sample verified on Sysmex automated analyzer in compliance with doctor note..." 
                      className="text-xs min-h-[80px] bg-slate-50/50" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
                      Filling Technician Name
                    </Label>
                    <Input 
                      value={labTechName} 
                      onChange={e => setLabTechName(e.target.value)}
                      className="h-10 text-xs font-bold bg-slate-50/50" 
                    />
                    <p className="text-[11px] text-slate-400 pt-1">
                      Recorded digitally in pathology compliance logs.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="p-4 px-6 border-t bg-slate-50 flex flex-row items-center justify-between gap-3">
            <Button variant="outline" onClick={() => setIsFulfillModalOpen(false)} className="font-bold text-xs h-9">
              Cancel
            </Button>
            <Button onClick={handleSaveFulfillment} className="bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs h-9 px-5 gap-1.5 shadow-md">
              <Check className="w-4 h-4" /> Publish Lab Findings to Doctor & Patient Chart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Create Doctor Note Path Order */}
      <Dialog open={isCreateOrderModalOpen} onOpenChange={setIsCreateOrderModalOpen}>
        <DialogContent className="max-w-md p-5">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-600" /> Log Doctor Note Pathology Order
            </DialogTitle>
            <DialogDescription className="text-xs">
              Directly queue doctor's treatment note pathology instructions for Lab fulfillment.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-[10px]">Patient Name *</Label>
              <Input 
                value={newOrder.patientName} 
                onChange={e => setNewOrder({...newOrder, patientName: e.target.value})}
                placeholder="e.g. Priyanka Parte" 
                className="h-8 text-xs" 
              />
            </div>

            <div>
              <Label className="text-[10px]">Reg. / UHID No.</Label>
              <Input 
                value={newOrder.regNo} 
                onChange={e => setNewOrder({...newOrder, regNo: e.target.value})}
                placeholder="e.g. NH/1871/2026" 
                className="h-8 text-xs" 
              />
            </div>

            <div>
              <Label className="text-[10px]">Ordering Doctor *</Label>
              <Input 
                value={newOrder.doctorName} 
                onChange={e => setNewOrder({...newOrder, doctorName: e.target.value})}
                className="h-8 text-xs font-bold" 
              />
            </div>

            <div>
              <Label className="text-[10px]">Doctor Note Excerpt *</Label>
              <Textarea 
                value={newOrder.doctorNoteRef} 
                onChange={e => setNewOrder({...newOrder, doctorNoteRef: e.target.value})}
                placeholder="e.g. Check CBC, LFT & Serum Electrolytes to evaluate post-op fever..." 
                className="text-xs h-16" 
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">Category</Label>
                <Select value={newOrder.testCategory} onValueChange={(v: any) => setNewOrder({...newOrder, testCategory: v})}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Haematology">Haematology</SelectItem>
                    <SelectItem value="Biochemistry">Biochemistry</SelectItem>
                    <SelectItem value="Clinical Pathology">Clinical Pathology</SelectItem>
                    <SelectItem value="Serology">Serology</SelectItem>
                    <SelectItem value="Microbiology">Microbiology</SelectItem>
                    <SelectItem value="Histopathology">Histopathology</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[10px]">Tests (Comma Separated)</Label>
                <Input 
                  value={newOrder.testNamesInput} 
                  onChange={e => setNewOrder({...newOrder, testNamesInput: e.target.value})}
                  placeholder="CBC, LFT, Electrolytes" 
                  className="h-8 text-xs" 
                />
              </div>
            </div>

            <div>
              <Label className="text-[10px]">Special Instructions</Label>
              <Input 
                value={newOrder.specialInstructionsFromDoctor} 
                onChange={e => setNewOrder({...newOrder, specialInstructionsFromDoctor: e.target.value})}
                placeholder="e.g. Stat processing required" 
                className="h-8 text-xs" 
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsCreateOrderModalOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreateOrder} className="bg-teal-600 hover:bg-teal-700 text-white font-bold">
              Add Order to Queue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
