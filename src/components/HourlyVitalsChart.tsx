import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Activity, 
  Droplets, 
  Printer, 
  Save, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  Plus, 
  Calendar, 
  FileSpreadsheet, 
  Stethoscope, 
  Edit3, 
  Trash2, 
  TrendingUp, 
  Sliders, 
  ShieldAlert,
  Info
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
import { HourlyVitalsEntry, HourlyVitalsSheet, Patient } from '../types';
import { storage, STORAGE_KEYS } from '../lib/storage';

export const HOURLY_TIME_SLOTS = [
  '8.00 am', '9.00 am', '10.00 am', '11.00 am', '12.00 Noon',
  '1.00 pm', '2.00 pm', '3.00 pm', '4.00 pm', '5.00 pm', '6.00 pm', '7.00 pm',
  '8.00 pm', '9.00 pm', '10.00 pm', '11.00 pm', '12.00 M.N.',
  '1.00 am', '2.00 am', '3.00 am', '4.00 am', '5.00 am', '6.00 am', '7.00 am'
];

interface HourlyVitalsChartProps {
  patientId?: string;
  patientName?: string;
  ageSex?: string;
  regNo?: string;
  wardBed?: string;
  dateOfAdmission?: string;
  isDoctorView?: boolean;
}

const DEFAULT_SHEET: HourlyVitalsSheet = {
  id: 'hvs-101',
  patientId: 'p1',
  patientName: 'PRIYANKA PARTE',
  ageSex: '34 Yrs / F',
  regNo: 'NH/1871/2026',
  wardBed: 'ICU / Bed-04',
  dateOfAdmission: '2026-07-28',
  date: new Date().toISOString().split('T')[0],
  hourlyUpdateRequired: true,
  frequencyInterval: 'Every 1 Hour',
  doctorInstructions: 'Monitor Pulse, BP & SpO2 hourly post laparoscopic cholecystectomy. Maintain Urine Output > 30 mL/hr. Notify if PR > 110 or BP < 90/60.',
  entries: [
    {
      id: 'e-1',
      patientId: 'p1',
      sheetDate: new Date().toISOString().split('T')[0],
      timeSlot: '8.00 am',
      pr: '78',
      rr: '18',
      temp: '98.4',
      bp: '122/80',
      spo2: '99',
      cns: 'E4V5M6 (Awake)',
      oralItems: 'Sips of Water',
      oralMl: '50',
      ivItems: 'Ringer Lactate',
      ivMl: '100',
      drainMl: '15',
      urineMl: '60',
      recordedBy: 'Nurse Anita'
    },
    {
      id: 'e-2',
      patientId: 'p1',
      sheetDate: new Date().toISOString().split('T')[0],
      timeSlot: '9.00 am',
      pr: '82',
      rr: '16',
      temp: '98.6',
      bp: '118/76',
      spo2: '98',
      cns: 'E4V5M6',
      oralItems: '-',
      oralMl: '0',
      ivItems: 'RL Infusion',
      ivMl: '100',
      drainMl: '10',
      urineMl: '45',
      recordedBy: 'Nurse Anita'
    },
    {
      id: 'e-3',
      patientId: 'p1',
      sheetDate: new Date().toISOString().split('T')[0],
      timeSlot: '10.00 am',
      pr: '80',
      rr: '18',
      temp: '98.4',
      bp: '120/78',
      spo2: '99',
      cns: 'E4V5M6',
      oralItems: 'ORS Solution',
      oralMl: '100',
      ivItems: 'NS Infusion',
      ivMl: '75',
      drainMl: '10',
      urineMl: '55',
      recordedBy: 'Nurse Sunita'
    }
  ],
  lastUpdated: new Date().toISOString()
};

export default function HourlyVitalsChart({
  patientId = 'p1',
  patientName = 'PRIYANKA PARTE',
  ageSex = '34 Yrs / F',
  regNo = 'NH/1871/2026',
  wardBed = 'ICU / Bed-04',
  dateOfAdmission = '2026-07-28',
  isDoctorView = false
}: HourlyVitalsChartProps) {
  const [sheet, setSheet] = useState<HourlyVitalsSheet>(() => {
    const saved = localStorage.getItem(`hourly_vitals_sheet_${patientId}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return {
      ...DEFAULT_SHEET,
      patientId,
      patientName,
      ageSex,
      regNo,
      wardBed,
      dateOfAdmission
    };
  });

  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('8.00 am');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Partial<HourlyVitalsEntry>>({});

  useEffect(() => {
    localStorage.setItem(`hourly_vitals_sheet_${patientId}`, JSON.stringify(sheet));
  }, [sheet, patientId]);

  // Calculate totals
  const totalOralMl = sheet.entries.reduce((acc, curr) => acc + (parseFloat(curr.oralMl || '0') || 0), 0);
  const totalIvMl = sheet.entries.reduce((acc, curr) => acc + (parseFloat(curr.ivMl || '0') || 0), 0);
  const totalIntake = totalOralMl + totalIvMl;

  const totalDrainMl = sheet.entries.reduce((acc, curr) => acc + (parseFloat(curr.drainMl || '0') || 0), 0);
  const totalUrineMl = sheet.entries.reduce((acc, curr) => acc + (parseFloat(curr.urineMl || '0') || 0), 0);
  const totalOutput = totalDrainMl + totalUrineMl;

  const netBalance = totalIntake - totalOutput;

  const handleOpenRecordModal = (slot: string) => {
    const existing = sheet.entries.find(e => e.timeSlot === slot);
    setSelectedTimeSlot(slot);
    if (existing) {
      setEditingEntry({ ...existing });
    } else {
      setEditingEntry({
        id: `hve-${Date.now()}`,
        patientId,
        sheetDate: sheet.date,
        timeSlot: slot,
        pr: '',
        rr: '',
        temp: '98.4',
        bp: '',
        spo2: '98',
        cns: 'E4V5M6',
        oralItems: '',
        oralMl: '0',
        ivItems: '',
        ivMl: '0',
        drainMl: '0',
        urineMl: '0',
        recordedBy: 'Duty Nurse'
      });
    }
    setIsRecordModalOpen(true);
  };

  const handleSaveEntry = () => {
    if (!editingEntry.timeSlot) return;

    const existingIndex = sheet.entries.findIndex(e => e.timeSlot === editingEntry.timeSlot);
    let updatedEntries = [...sheet.entries];

    const newRecord: HourlyVitalsEntry = {
      id: editingEntry.id || `hve-${Date.now()}`,
      patientId,
      sheetDate: sheet.date,
      timeSlot: editingEntry.timeSlot,
      pr: editingEntry.pr || '',
      rr: editingEntry.rr || '',
      temp: editingEntry.temp || '',
      bp: editingEntry.bp || '',
      spo2: editingEntry.spo2 || '',
      cns: editingEntry.cns || '',
      oralItems: editingEntry.oralItems || '',
      oralMl: editingEntry.oralMl || '0',
      ivItems: editingEntry.ivItems || '',
      ivMl: editingEntry.ivMl || '0',
      drainMl: editingEntry.drainMl || '0',
      urineMl: editingEntry.urineMl || '0',
      recordedBy: editingEntry.recordedBy || 'Duty Nurse',
      remarks: editingEntry.remarks || ''
    };

    if (existingIndex >= 0) {
      updatedEntries[existingIndex] = newRecord;
    } else {
      updatedEntries.push(newRecord);
    }

    setSheet({
      ...sheet,
      entries: updatedEntries,
      lastUpdated: new Date().toISOString()
    });

    setIsRecordModalOpen(false);
    toast.success(`Hourly vitals recorded for ${editingEntry.timeSlot}`);
  };

  const handlePrintSheet = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Unable to open print window');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>24-Hour Hourly Vitals & Intake/Output Sheet - ${sheet.patientName}</title>
          <style>
            @page { size: A4 portrait; margin: 8mm; }
            body { 
              font-family: Arial, sans-serif; 
              font-size: 8pt; 
              color: #000; 
              background: #fff;
              margin: 0;
              padding: 0;
            }
            .header-info {
              border: 1.5px solid #000;
              padding: 6px 10px;
              margin-bottom: 6px;
              background-color: #fffde7;
            }
            .header-title {
              font-size: 11pt;
              font-weight: 900;
              text-align: center;
              text-transform: uppercase;
              margin-bottom: 4px;
            }
            .info-grid {
              display: flex;
              justify-content: space-between;
              font-size: 8.5pt;
              font-weight: bold;
              border-bottom: 1px solid #000;
              padding-bottom: 4px;
              margin-bottom: 4px;
            }
            .sheet-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 4px;
            }
            .sheet-table th, .sheet-table td {
              border: 1px solid #000;
              padding: 3px 4px;
              text-align: center;
              font-size: 7.5pt;
            }
            .sheet-table th {
              background-color: #f0f0f0;
              font-weight: bold;
            }
            .totals-row {
              background-color: #e6f4ea;
              font-weight: bold;
            }
            .doctor-box {
              border: 1px solid #000;
              padding: 5px;
              margin-top: 6px;
              font-size: 8pt;
              background-color: #f9f9f9;
            }
          </style>
        </head>
        <body>
          <div class="header-info">
            <div class="header-title">HOURLY VITALS & INTAKE / OUTPUT MONITORING SHEET</div>
            <div class="info-grid">
              <div><strong>Patient's Name:</strong> ${sheet.patientName}</div>
              <div><strong>Age/Sex:</strong> ${sheet.ageSex}</div>
              <div><strong>Reg. No:</strong> ${sheet.regNo}</div>
              <div><strong>Ward/Bed:</strong> ${sheet.wardBed}</div>
              <div><strong>Date:</strong> ${sheet.date}</div>
            </div>
            <div>
              <strong>Doctor Instructions:</strong> ${sheet.doctorInstructions || 'Monitor vitals hourly.'}
            </div>
          </div>

          <table class="sheet-table">
            <thead>
              <tr>
                <th rowspan="2" style="width: 8%;">Time</th>
                <th colspan="6">VITAL SIGNS</th>
                <th colspan="2">By Mouth</th>
                <th colspan="2">IV Infusions</th>
                <th rowspan="2">Aspirate / Drain (ML)</th>
                <th rowspan="2">Urine / ML</th>
              </tr>
              <tr>
                <th style="width: 6%;">PR</th>
                <th style="width: 5%;">RR</th>
                <th style="width: 6%;">Temp</th>
                <th style="width: 9%;">B.P.</th>
                <th style="width: 6%;">SPO2</th>
                <th style="width: 10%;">CNS</th>
                <th>Items</th>
                <th style="width: 6%;">ML</th>
                <th>Items</th>
                <th style="width: 6%;">ML</th>
              </tr>
            </thead>
            <tbody>
              ${HOURLY_TIME_SLOTS.map(slot => {
                const entry = sheet.entries.find(e => e.timeSlot === slot);
                return `
                  <tr>
                    <td style="font-weight: bold;">${slot}</td>
                    <td>${entry?.pr || ''}</td>
                    <td>${entry?.rr || ''}</td>
                    <td>${entry?.temp || ''}</td>
                    <td>${entry?.bp || ''}</td>
                    <td>${entry?.spo2 || ''}</td>
                    <td style="font-size: 7pt;">${entry?.cns || ''}</td>
                    <td style="font-size: 7pt; text-align: left;">${entry?.oralItems || ''}</td>
                    <td>${entry?.oralMl || ''}</td>
                    <td style="font-size: 7pt; text-align: left;">${entry?.ivItems || ''}</td>
                    <td>${entry?.ivMl || ''}</td>
                    <td>${entry?.drainMl || ''}</td>
                    <td>${entry?.urineMl || ''}</td>
                  </tr>
                `;
              }).join('')}
              <tr class="totals-row">
                <td colspan="7" style="text-align: right; padding-right: 8px;"><strong>24-HR TOTALS:</strong></td>
                <td>Oral Total</td>
                <td><strong>${totalOralMl}</strong></td>
                <td>IV Total</td>
                <td><strong>${totalIvMl}</strong></td>
                <td><strong>${totalDrainMl}</strong></td>
                <td><strong>${totalUrineMl}</strong></td>
              </tr>
              <tr class="totals-row" style="background-color: #d1e7dd;">
                <td colspan="7" style="text-align: right; padding-right: 8px;"><strong>FLUID BALANCE SUMMARY:</strong></td>
                <td colspan="2">Intake: <strong>${totalIntake} mL</strong></td>
                <td colspan="2">Output: <strong>${totalOutput} mL</strong></td>
                <td colspan="2">Net Balance: <strong>${netBalance > 0 ? '+' : ''}${netBalance} mL</strong></td>
              </tr>
            </tbody>
          </table>

          <div class="doctor-box">
            <strong>Staff Sign / Remarks:</strong> Duty Nursing Staff • Chart maintained in accordance with ICU / Post-Op Hourly Monitoring Protocol.
          </div>

          <script>
            window.onload = function() { window.print(); }
            window.onafterprint = function() { window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-5">
      {/* Top Banner with Doctor Order Directive */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500 text-amber-950 rounded-xl shrink-0">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm uppercase tracking-wide">
                24-Hour Hourly Vitals & Intake/Output Sheet
              </h3>
              <Badge className={sheet.hourlyUpdateRequired ? "bg-amber-600 text-white font-extrabold text-[10px]" : "bg-slate-300 text-slate-800 text-[10px]"}>
                {sheet.hourlyUpdateRequired ? `DOCTOR ORDERED: ${sheet.frequencyInterval}` : "ROUTINE MONITORING"}
              </Badge>
            </div>
            <p className="text-xs text-amber-900 mt-0.5">
              Carewell Yellow Bedside Chart Format • Vital Signs (PR, RR, Temp, BP, SpO2, CNS) + Oral & IV Intake + Drains & Urine Output
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            onClick={handlePrintSheet} 
            variant="outline" 
            size="sm" 
            className="border-amber-400 bg-white hover:bg-amber-50 text-amber-950 font-bold text-xs h-8 gap-1.5"
          >
            <Printer className="w-4 h-4 text-amber-700" /> Print Yellow Sheet
          </Button>

          {isDoctorView ? (
            <Button 
              size="sm" 
              onClick={() => {
                setSheet({...sheet, hourlyUpdateRequired: !sheet.hourlyUpdateRequired});
                toast.success(`Hourly monitoring instruction updated: ${!sheet.hourlyUpdateRequired ? 'REQUIRED' : 'ROUTINE'}`);
              }}
              className={sheet.hourlyUpdateRequired ? "bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs h-8" : "bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs h-8"}
            >
              <Stethoscope className="w-3.5 h-3.5 mr-1" />
              {sheet.hourlyUpdateRequired ? "Stop Hourly Updates" : "Require Hourly Updates"}
            </Button>
          ) : null}
        </div>
      </div>

      {/* Doctor Instructions Card */}
      <Card className="border-amber-200 bg-amber-50/30">
        <CardContent className="p-3 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-amber-900 font-extrabold">
              <Stethoscope className="w-4 h-4 text-amber-700" />
              <span>DOCTOR'S HOURLY MONITORING INSTRUCTIONS</span>
            </div>
            <span className="text-[10px] font-bold text-slate-500">Updated: {new Date(sheet.lastUpdated).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          </div>

          <div className="flex items-center gap-2">
            <Input 
              value={sheet.doctorInstructions || ''} 
              onChange={e => setSheet({...sheet, doctorInstructions: e.target.value})}
              placeholder="e.g. Monitor Pulse, BP & SpO2 hourly. Maintain Urine Output > 30 mL/hr..."
              className="bg-white border-amber-300 text-xs h-8 font-medium"
              disabled={!isDoctorView && false /* allows both doctor & nurse to update if needed */}
            />
            <Select value={sheet.frequencyInterval} onValueChange={v => setSheet({...sheet, frequencyInterval: v})}>
              <SelectTrigger className="w-36 h-8 text-xs bg-white border-amber-300 font-bold"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Every 1 Hour">Every 1 Hour</SelectItem>
                <SelectItem value="Every 2 Hours">Every 2 Hours</SelectItem>
                <SelectItem value="Every 4 Hours">Every 4 Hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Fluid Balance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
          <p className="text-[10px] font-bold text-emerald-800 uppercase">Total Intake (24-Hr)</p>
          <div className="text-lg font-black text-emerald-900 mt-0.5">{totalIntake} <span className="text-xs font-normal">mL</span></div>
          <div className="text-[10px] text-emerald-700 mt-1 flex justify-between">
            <span>Oral: <strong>{totalOralMl} mL</strong></span>
            <span>IV: <strong>{totalIvMl} mL</strong></span>
          </div>
        </div>

        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
          <p className="text-[10px] font-bold text-rose-800 uppercase">Total Output (24-Hr)</p>
          <div className="text-lg font-black text-rose-900 mt-0.5">{totalOutput} <span className="text-xs font-normal">mL</span></div>
          <div className="text-[10px] text-rose-700 mt-1 flex justify-between">
            <span>Urine: <strong>{totalUrineMl} mL</strong></span>
            <span>Drain: <strong>{totalDrainMl} mL</strong></span>
          </div>
        </div>

        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
          <p className="text-[10px] font-bold text-indigo-800 uppercase">Net Fluid Balance</p>
          <div className={`text-lg font-black mt-0.5 ${netBalance >= 0 ? "text-indigo-950" : "text-amber-800"}`}>
            {netBalance >= 0 ? `+${netBalance}` : netBalance} <span className="text-xs font-normal">mL</span>
          </div>
          <p className="text-[10px] text-indigo-700 mt-1 font-semibold">
            {netBalance >= 0 ? "Positive Fluid Balance" : "Negative Fluid Balance"}
          </p>
        </div>

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-amber-800 uppercase">Entries Recorded</p>
            <div className="text-lg font-black text-amber-950 mt-0.5">
              {sheet.entries.length} / 24 <span className="text-xs font-normal">Hours</span>
            </div>
          </div>
          <Button 
            size="sm" 
            onClick={() => handleOpenRecordModal(HOURLY_TIME_SLOTS[0])}
            className="bg-amber-500 hover:bg-amber-600 text-amber-950 font-black text-xs h-7 mt-1 w-full"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Hourly Reading
          </Button>
        </div>
      </div>

      {/* Main Yellow Sheet Table */}
      <Card className="border-amber-300 shadow-xs overflow-hidden">
        <CardHeader className="p-3 bg-amber-100/70 border-b border-amber-200 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-800" />
            <CardTitle className="text-xs font-black uppercase text-amber-950 tracking-wider">
              24-Hour Vital Signs & Intake/Output Table
            </CardTitle>
          </div>
          <Badge variant="outline" className="bg-amber-50 text-amber-900 border-amber-300 font-bold text-[10px]">
            Yellow Chart Matrix
          </Badge>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <Table className="text-xs border-collapse">
            <TableHeader className="bg-amber-100/50">
              <TableRow className="border-b border-amber-300 font-bold text-[11px] text-amber-950">
                <TableHead className="w-20 font-black border-r border-amber-300">Time</TableHead>
                <TableHead className="w-12 text-center border-r border-amber-200">PR</TableHead>
                <TableHead className="w-12 text-center border-r border-amber-200">RR</TableHead>
                <TableHead className="w-12 text-center border-r border-amber-200">Temp</TableHead>
                <TableHead className="w-20 text-center border-r border-amber-200">B.P.</TableHead>
                <TableHead className="w-14 text-center border-r border-amber-200">SpO2</TableHead>
                <TableHead className="w-28 text-center border-r border-amber-200">CNS</TableHead>
                <TableHead className="text-left border-r border-amber-200">Oral Items</TableHead>
                <TableHead className="w-14 text-center border-r border-amber-200">Oral mL</TableHead>
                <TableHead className="text-left border-r border-amber-200">IV Items</TableHead>
                <TableHead className="w-14 text-center border-r border-amber-200">IV mL</TableHead>
                <TableHead className="w-16 text-center border-r border-amber-200">Drain mL</TableHead>
                <TableHead className="w-16 text-center border-r border-amber-200">Urine mL</TableHead>
                <TableHead className="w-16 text-center">Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {HOURLY_TIME_SLOTS.map((slot, index) => {
                const entry = sheet.entries.find(e => e.timeSlot === slot);
                const hasData = Boolean(entry && (entry.pr || entry.bp || entry.oralMl || entry.urineMl));

                return (
                  <TableRow 
                    key={slot} 
                    className={`border-b border-amber-100 hover:bg-amber-50/60 transition-colors ${
                      hasData ? 'bg-white' : 'bg-amber-50/20'
                    }`}
                  >
                    <TableCell className="font-extrabold text-amber-950 border-r border-amber-200 py-1.5">
                      {slot}
                    </TableCell>

                    <TableCell className={`text-center font-bold border-r border-amber-100 py-1.5 ${
                      entry?.pr && (parseInt(entry.pr) > 100 || parseInt(entry.pr) < 55) ? "text-rose-600 font-black bg-rose-50" : ""
                    }`}>
                      {entry?.pr || '-'}
                    </TableCell>

                    <TableCell className="text-center border-r border-amber-100 py-1.5">
                      {entry?.rr || '-'}
                    </TableCell>

                    <TableCell className="text-center border-r border-amber-100 py-1.5">
                      {entry?.temp ? `${entry.temp}°` : '-'}
                    </TableCell>

                    <TableCell className="text-center font-bold border-r border-amber-100 py-1.5">
                      {entry?.bp || '-'}
                    </TableCell>

                    <TableCell className={`text-center font-bold border-r border-amber-100 py-1.5 ${
                      entry?.spo2 && parseInt(entry.spo2) < 95 ? "text-rose-600 font-black bg-rose-50" : "text-emerald-700"
                    }`}>
                      {entry?.spo2 ? `${entry.spo2}%` : '-'}
                    </TableCell>

                    <TableCell className="text-center text-[10px] text-slate-700 border-r border-amber-100 py-1.5 truncate max-w-[100px]">
                      {entry?.cns || '-'}
                    </TableCell>

                    <TableCell className="text-left text-[11px] text-slate-800 border-r border-amber-100 py-1.5 truncate max-w-[110px]">
                      {entry?.oralItems || '-'}
                    </TableCell>

                    <TableCell className="text-center font-bold text-emerald-800 border-r border-amber-100 py-1.5">
                      {entry?.oralMl && entry.oralMl !== '0' ? entry.oralMl : '-'}
                    </TableCell>

                    <TableCell className="text-left text-[11px] text-slate-800 border-r border-amber-100 py-1.5 truncate max-w-[110px]">
                      {entry?.ivItems || '-'}
                    </TableCell>

                    <TableCell className="text-center font-bold text-emerald-800 border-r border-amber-100 py-1.5">
                      {entry?.ivMl && entry.ivMl !== '0' ? entry.ivMl : '-'}
                    </TableCell>

                    <TableCell className="text-center font-bold text-rose-700 border-r border-amber-100 py-1.5">
                      {entry?.drainMl && entry.drainMl !== '0' ? entry.drainMl : '-'}
                    </TableCell>

                    <TableCell className={`text-center font-bold border-r border-amber-100 py-1.5 ${
                      entry?.urineMl && parseInt(entry.urineMl) < 25 ? "text-amber-700 font-black bg-amber-50" : "text-indigo-900"
                    }`}>
                      {entry?.urineMl && entry.urineMl !== '0' ? entry.urineMl : '-'}
                    </TableCell>

                    <TableCell className="text-center py-1">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleOpenRecordModal(slot)}
                        className="h-6 w-6 p-0 hover:bg-amber-200 text-amber-900"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Record Modal */}
      <Dialog open={isRecordModalOpen} onOpenChange={setIsRecordModalOpen}>
        <DialogContent className="max-w-lg p-5">
          <DialogHeader>
            <DialogTitle className="text-sm font-extrabold uppercase flex items-center gap-2 text-amber-950">
              <Clock className="w-4 h-4 text-amber-600" /> Record Hourly Vitals for {editingEntry.timeSlot}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Enter bedside parameters for {sheet.patientName} at {editingEntry.timeSlot}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs py-2">
            {/* Vitals Grid */}
            <div className="space-y-1.5">
              <Label className="font-bold text-amber-900 uppercase text-[10px]">Vital Signs</Label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[10px]">PR (bpm)</Label>
                  <Input value={editingEntry.pr || ''} onChange={e => setEditingEntry({...editingEntry, pr: e.target.value})} className="h-8 text-xs font-bold" placeholder="78" />
                </div>
                <div>
                  <Label className="text-[10px]">RR (/min)</Label>
                  <Input value={editingEntry.rr || ''} onChange={e => setEditingEntry({...editingEntry, rr: e.target.value})} className="h-8 text-xs" placeholder="18" />
                </div>
                <div>
                  <Label className="text-[10px]">Temp (°F)</Label>
                  <Input value={editingEntry.temp || ''} onChange={e => setEditingEntry({...editingEntry, temp: e.target.value})} className="h-8 text-xs" placeholder="98.4" />
                </div>
                <div>
                  <Label className="text-[10px]">B.P. (mmHg)</Label>
                  <Input value={editingEntry.bp || ''} onChange={e => setEditingEntry({...editingEntry, bp: e.target.value})} className="h-8 text-xs font-bold" placeholder="120/80" />
                </div>
                <div>
                  <Label className="text-[10px]">SpO2 (%)</Label>
                  <Input value={editingEntry.spo2 || ''} onChange={e => setEditingEntry({...editingEntry, spo2: e.target.value})} className="h-8 text-xs font-bold text-emerald-700" placeholder="99" />
                </div>
                <div>
                  <Label className="text-[10px]">CNS / GCS</Label>
                  <Input value={editingEntry.cns || ''} onChange={e => setEditingEntry({...editingEntry, cns: e.target.value})} className="h-8 text-xs" placeholder="E4V5M6" />
                </div>
              </div>
            </div>

            {/* Oral & IV Intake */}
            <div className="space-y-1.5 border-t pt-2">
              <Label className="font-bold text-emerald-900 uppercase text-[10px]">Intake (Oral & IV)</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px]">By Mouth Items</Label>
                  <Input value={editingEntry.oralItems || ''} onChange={e => setEditingEntry({...editingEntry, oralItems: e.target.value})} className="h-8 text-xs" placeholder="Water, Soup, ORS" />
                </div>
                <div>
                  <Label className="text-[10px]">Oral Volume (mL)</Label>
                  <Input value={editingEntry.oralMl || ''} onChange={e => setEditingEntry({...editingEntry, oralMl: e.target.value})} className="h-8 text-xs font-bold text-emerald-800" placeholder="100" />
                </div>
                <div>
                  <Label className="text-[10px]">IV Infusion Items</Label>
                  <Input value={editingEntry.ivItems || ''} onChange={e => setEditingEntry({...editingEntry, ivItems: e.target.value})} className="h-8 text-xs" placeholder="RL, NS 100ml/hr" />
                </div>
                <div>
                  <Label className="text-[10px]">IV Volume (mL)</Label>
                  <Input value={editingEntry.ivMl || ''} onChange={e => setEditingEntry({...editingEntry, ivMl: e.target.value})} className="h-8 text-xs font-bold text-emerald-800" placeholder="100" />
                </div>
              </div>
            </div>

            {/* Output */}
            <div className="space-y-1.5 border-t pt-2">
              <Label className="font-bold text-rose-900 uppercase text-[10px]">Output (Drains & Urine)</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px]">Aspirate / Drain (mL)</Label>
                  <Input value={editingEntry.drainMl || ''} onChange={e => setEditingEntry({...editingEntry, drainMl: e.target.value})} className="h-8 text-xs font-bold text-rose-800" placeholder="15" />
                </div>
                <div>
                  <Label className="text-[10px]">Urine Output (mL)</Label>
                  <Input value={editingEntry.urineMl || ''} onChange={e => setEditingEntry({...editingEntry, urineMl: e.target.value})} className="h-8 text-xs font-bold text-indigo-900" placeholder="50" />
                </div>
              </div>
            </div>

            {/* Staff name */}
            <div>
              <Label className="text-[10px]">Recorded By Staff Name</Label>
              <Input value={editingEntry.recordedBy || ''} onChange={e => setEditingEntry({...editingEntry, recordedBy: e.target.value})} className="h-8 text-xs" placeholder="Nurse Anita" />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsRecordModalOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSaveEntry} className="bg-amber-500 hover:bg-amber-600 text-amber-950 font-black">
              Save Hourly Reading
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
