import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Filter, 
  MoreVertical, 
  Mail, 
  Phone,
  Edit, 
  Trash2, 
  Download,
  Loader2,
  QrCode,
  Calendar,
  Clock,
  Printer,
  Camera,
  CheckCircle,
  AlertCircle,
  UserCheck,
  History,
  ArrowRight,
  Award,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { getStaffPhotoUrl } from '@/utils/staffPhotos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';
import { supabaseService } from '@/services/supabaseService';
import { useDataSync } from '@/hooks/useDataSync';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { MOCK_USERS } from '@/mockData';
import { canUserModifyRecord, normalizeRole } from '@/utils/rbac';
import { AttendanceCameraScanner } from './AttendanceCameraScanner';

export default function Staff() {
  const currentUser = storage.get(STORAGE_KEYS.SESSION_USER, null);
  const isAccountant = normalizeRole(currentUser?.role) === 'ACCOUNTANT';
  const [staff, setStaff] = useState<any[]>(() => {
    const cached = storage.get(STORAGE_KEYS.USERS, MOCK_USERS);
    return Array.isArray(cached) && cached.length > 0 ? cached : MOCK_USERS;
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<any>(null);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [newStaff, setNewStaff] = useState({ 
    name: '', 
    role: 'doctor', 
    department: '', 
    email: '', 
    phone: '', 
    specialty: '', 
    degree: '',
    experience: '',
    consultationFee: '',
    registrationNo: '',
    labLicenseNo: '' 
  });

  const [activeStaffTab, setActiveStaffTab] = useState<'directory' | 'terminal' | 'badges' | 'register'>('directory');
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>(() => {
    const saved = storage.get(STORAGE_KEYS.STAFF_ATTENDANCE, []);
    if (saved && saved.length > 0) return saved;
    
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    return [
      {
        id: 'att-1',
        staffId: 'stf-1',
        staffName: 'Dr. Ramesh Mehta',
        role: 'SUPER_ADMIN',
        department: 'Cardiology',
        date: todayStr,
        checkInTime: '08:42 AM',
        checkOutTime: null,
        status: 'On Time',
        workingHours: null,
        method: 'QR_CODE'
      },
      {
        id: 'att-2',
        staffId: 'stf-2',
        staffName: 'Staff Nurse Priya S.',
        role: 'NURSE',
        department: 'General Ward',
        date: todayStr,
        checkInTime: '07:54 AM',
        checkOutTime: null,
        status: 'On Time',
        workingHours: null,
        method: 'QR_CODE'
      },
      {
        id: 'att-3',
        staffId: 'stf-3',
        staffName: 'Dr. Anjali Mehta',
        role: 'DOCTOR',
        department: 'Pediatrics',
        date: todayStr,
        checkInTime: '09:35 AM',
        checkOutTime: null,
        status: 'Late',
        workingHours: null,
        method: 'QR_CODE'
      },
      {
        id: 'att-4',
        staffId: 'stf-1',
        staffName: 'Dr. Ramesh Mehta',
        role: 'SUPER_ADMIN',
        department: 'Cardiology',
        date: yesterdayStr,
        checkInTime: '08:38 AM',
        checkOutTime: '05:12 PM',
        status: 'On Time',
        workingHours: 8.5,
        method: 'QR_CODE'
      },
      {
        id: 'att-5',
        staffId: 'stf-2',
        staffName: 'Staff Nurse Priya S.',
        role: 'NURSE',
        department: 'General Ward',
        date: yesterdayStr,
        checkInTime: '07:58 AM',
        checkOutTime: '04:02 PM',
        status: 'On Time',
        workingHours: 8.0,
        method: 'QR_CODE'
      }
    ];
  });

  const [terminalMode, setTerminalMode] = useState<'in' | 'out' | 'auto'>('auto');
  const [scannedStaffId, setScannedStaffId] = useState('');
  const [scannerActive, setScannerActive] = useState(false);
  const [selectedBadgeStaff, setSelectedBadgeStaff] = useState<any>(null);
  const [attendanceSearchQuery, setAttendanceSearchQuery] = useState('');
  const [attendanceDateFilter, setAttendanceDateFilter] = useState(() => new Date().toISOString().split('T')[0]);
  const [lastScanSuccess, setLastScanSuccess] = useState<any>(null);
  const [isManualPunchOpen, setIsManualPunchOpen] = useState(false);
  const [manualPunchData, setManualPunchData] = useState({
    staffId: '',
    date: new Date().toISOString().split('T')[0],
    checkInTime: '09:00 AM',
    checkOutTime: '05:00 PM',
    status: 'On Time'
  });

  const handlePrintBadge = (user: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Popup blocker prevented printing. Please enable popups.');
      return;
    }
    const empIdStr = `EMP-${user.id.substring(0, 8).toUpperCase()}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=4&data=${user.id}`;
    const spec = user.specialty || user.specialization || 'General';
    const qual = user.degree || user.qualification || 'N/A';
    const exp = user.experience || 'N/A';
    const regNum = user.registrationNo || user.regNo || 'N/A';
    const fee = user.consultationFee ?? user.consultation_fee;
    const licNum = user.labLicenseNo || user.licenseNumber;
    const photoUrl = getStaffPhotoUrl(user);
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Staff ID Badge - ${user.name}</title>
          <style>
            body {
              font-family: 'Inter', system-ui, -apple-system, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background-color: #f3f4f6;
            }
            .badge-card {
              width: 320px;
              background: white;
              border-radius: 16px;
              box-shadow: 0 10px 25px rgba(0,0,0,0.1);
              overflow: hidden;
              display: flex;
              flex-direction: column;
              border: 1px solid #e5e7eb;
              page-break-inside: avoid;
            }
            .badge-header {
              background: linear-gradient(135deg, #1A5E63, #154c50);
              color: white;
              padding: 16px 12px;
              text-align: center;
              border-bottom: 4px solid #FFD1A9;
            }
            .hospital-title {
              font-size: 15px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 1.5px;
            }
            .hospital-sub {
              font-size: 8.5px;
              opacity: 0.9;
              letter-spacing: 1px;
            }
            .badge-body {
              padding: 16px;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .avatar-img {
              width: 80px;
              height: 80px;
              border-radius: 50%;
              border: 3px solid #1A5E63;
              object-fit: cover;
              margin-bottom: 8px;
            }
            .staff-name {
              font-size: 16px;
              font-weight: 800;
              color: #111827;
              margin: 0 0 2px 0;
              text-align: center;
            }
            .staff-role {
              font-size: 10px;
              font-weight: 800;
              color: #1A5E63;
              text-transform: uppercase;
              background: #f0fdfa;
              padding: 3px 10px;
              border-radius: 9999px;
              border: 1px solid #ccfbf1;
              margin-bottom: 12px;
            }
            .details-table {
              width: 100%;
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 10px;
              padding: 10px;
              margin-bottom: 12px;
              font-size: 11px;
              box-sizing: border-box;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              padding: 3px 0;
              border-bottom: 1px solid #f3f4f6;
            }
            .detail-row:last-child {
              border-bottom: none;
            }
            .detail-label {
              font-size: 9px;
              font-weight: 700;
              color: #9ca3af;
              text-transform: uppercase;
            }
            .detail-val {
              font-weight: 600;
              color: #1f2937;
              text-align: right;
            }
            .qr-container {
              background: white;
              padding: 6px;
              border-radius: 10px;
              border: 1px solid #e5e7eb;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .emp-id {
              font-family: monospace;
              font-size: 10px;
              color: #1A5E63;
              font-weight: bold;
              margin-top: 4px;
            }
            .badge-footer {
              background: #f9fafb;
              padding: 8px;
              text-align: center;
              font-size: 8.5px;
              color: #9ca3af;
              border-top: 1px solid #f3f4f6;
            }
            @media print {
              body { background: white; }
              .badge-card { box-shadow: none; border: 1px solid #ccc; }
            }
          </style>
        </head>
        <body>
          <div class="badge-card">
            <div class="badge-header">
              <div class="hospital-title">NEO GASTROPLUS</div>
              <div class="hospital-sub">HEALTHCARE & SURGICALS</div>
            </div>
            <div class="badge-body">
              <img class="avatar-img" src="${photoUrl}" alt="${user.name}" crossorigin="anonymous" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=600';" />
              <div class="staff-name">${user.name}</div>
              <div class="staff-role">${user.role?.replace(/_/g, ' ') || 'Staff'}</div>
              
              <div class="details-table">
                <div class="detail-row"><span class="detail-label">ID Code:</span><span class="detail-val" style="font-family: monospace;">${empIdStr}</span></div>
                <div class="detail-row"><span class="detail-label">Department:</span><span class="detail-val">${user.department || 'Administration'}</span></div>
                <div class="detail-row"><span class="detail-label">Specialty:</span><span class="detail-val">${spec}</span></div>
                <div class="detail-row"><span class="detail-label">Qualification:</span><span class="detail-val">${qual}</span></div>
                <div class="detail-row"><span class="detail-label">Reg. Number:</span><span class="detail-val">${regNum}</span></div>
              </div>

              <div class="qr-container">
                <img src="${qrUrl}" width="90" height="90" />
                <div class="emp-id">OFFICIAL HOSPITAL CREDENTIAL</div>
              </div>
            </div>
            <div class="badge-footer">
              NEO GASTROPLUS Hospital • Access Control & Attendance Keycard
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleManualPunchSubmit = () => {
    if (!manualPunchData.staffId) {
      toast.error('Please select an employee');
      return;
    }
    const emp = staff.find(s => s.id === manualPunchData.staffId);
    if (!emp) {
      toast.error('Employee not found');
      return;
    }

    let hours = null;
    if (manualPunchData.checkOutTime) {
      const parseTimeString = (tStr: string) => {
        const [time, modifier] = tStr.split(' ');
        let [hrs, mins] = time.split(':').map(Number);
        if (modifier === 'PM' && hrs < 12) hrs += 12;
        if (modifier === 'AM' && hrs === 12) hrs = 0;
        return hrs * 60 + mins;
      };
      const inMins = parseTimeString(manualPunchData.checkInTime);
      const outMins = parseTimeString(manualPunchData.checkOutTime);
      hours = Number((Math.max(0, outMins - inMins) / 60).toFixed(2));
    }

    const newLog = {
      id: 'att-' + Date.now(),
      staffId: emp.id,
      staffName: emp.name,
      role: emp.role,
      department: emp.department || 'Administration',
      date: manualPunchData.date,
      checkInTime: manualPunchData.checkInTime,
      checkOutTime: manualPunchData.checkOutTime || null,
      status: manualPunchData.status,
      workingHours: hours,
      method: 'MANUAL_ENTRY'
    };

    setAttendanceLogs([newLog, ...attendanceLogs]);
    setIsManualPunchOpen(false);
    toast.success(`Manual attendance logged for ${emp.name}`);
  };

  const isDoctorOrSurgeon = (role: string) => {
    const r = (role || '').toUpperCase();
    return r.includes('DOCTOR') || r.includes('SURGEON');
  };

  const isLabOrPharmacy = (role: string) => {
    const r = (role || '').toLowerCase();
    return r.includes('lab') || r.includes('pharm') || r.includes('patho') || r.includes('radio');
  };

  const mapDbRoleToFormRole = (dbRole: string): string => {
    if (!dbRole) return 'doctor';
    const r = dbRole.toUpperCase().trim();
    if (r === 'RECEPTIONIST') return 'reception';
    if (r === 'LAB_TECHNICIAN') return 'lab_staff';
    return r.toLowerCase();
  };

  const mapFormRoleToDbRole = (formRole: string): string => {
    if (!formRole) return 'DOCTOR';
    const r = formRole.toLowerCase().trim();
    if (r === 'reception') return 'RECEPTIONIST';
    if (r === 'lab_staff') return 'LAB_TECHNICIAN';
    return r.toUpperCase().replace(' ', '_');
  };

  useEffect(() => {
    storage.set(STORAGE_KEYS.STAFF_ATTENDANCE, attendanceLogs);
  }, [attendanceLogs]);

  const handleQrPunch = (scannedId: string, cameraSource: 'Front Camera' | 'Back Camera' | 'Manual Scanner' = 'Manual Scanner') => {
    if (!scannedId) return;
    
    const cleanId = scannedId.replace(/^EMP-/i, '').trim().toLowerCase();
    const employee = staff.find(s => {
      const dbId = String(s.id).toLowerCase();
      const sName = String(s.name || '').toLowerCase();
      const sReg = String(s.registrationNo || s.regNo || '').toLowerCase();
      const sEmail = String(s.email || '').toLowerCase();
      return dbId === cleanId ||
             dbId.substring(0, 8) === cleanId ||
             dbId.substring(0, 6) === cleanId ||
             dbId.replace(/-/g, '').startsWith(cleanId.replace(/-/g, '')) ||
             cleanId.replace(/-/g, '').startsWith(dbId.replace(/-/g, '')) ||
             (cleanId.length > 2 && sName.includes(cleanId)) ||
             (cleanId.length > 2 && sReg.includes(cleanId)) ||
             (cleanId.length > 2 && sEmail.includes(cleanId));
    });

    if (!employee) {
      toast.error(`Employee ID "${scannedId}" not found in system.`);
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    // Find if they have an active punch today
    const existingPunchesToday = attendanceLogs.filter(log => log.staffId === employee.id && log.date === todayStr);
    const activePunch = existingPunchesToday.find(log => log.checkOutTime === null);

    let modeToExecute: 'in' | 'out' = 'in';
    if (terminalMode === 'auto') {
      if (activePunch) {
        modeToExecute = 'out';
      } else {
        modeToExecute = 'in';
      }
    } else {
      modeToExecute = terminalMode as 'in' | 'out';
    }

    if (modeToExecute === 'in') {
      if (activePunch) {
        toast.warning(`${employee.name} is already checked in since ${activePunch.checkInTime}`);
        return;
      }

      const currentHour = now.getHours();
      const currentMin = now.getMinutes();
      const checkInMinutes = currentHour * 60 + currentMin;
      const lateThresholdMinutes = 9 * 60 + 15; // 09:15 AM
      const status = checkInMinutes > lateThresholdMinutes ? 'Late' : 'On Time';

      const newLog = {
        id: 'att-' + Date.now(),
        staffId: employee.id,
        staffName: employee.name,
        role: employee.role,
        department: employee.department || 'Administration',
        date: todayStr,
        checkInTime: timeStr,
        checkOutTime: null,
        status: status,
        workingHours: null,
        method: 'QR_CODE'
      };

      const updated = [newLog, ...attendanceLogs];
      setAttendanceLogs(updated);
      setLastScanSuccess({
        employee,
        action: 'In',
        time: timeStr,
        status: status
      });
      toast.success(`Check-In Successful: ${employee.name} at ${timeStr} (${status})`);
    } else {
      if (!activePunch) {
        const openPunchAnyDay = attendanceLogs.find(log => log.staffId === employee.id && log.checkOutTime === null);
        if (openPunchAnyDay) {
          const updatedLogs = attendanceLogs.map(log => {
            if (log.id === openPunchAnyDay.id) {
              return {
                ...log,
                checkOutTime: timeStr,
                workingHours: 8.0
              };
            }
            return log;
          });
          setAttendanceLogs(updatedLogs);
          setLastScanSuccess({
            employee,
            action: 'Out',
            time: timeStr,
            status: 'Completed'
          });
          toast.success(`Check-Out Successful (Previous day): ${employee.name} at ${timeStr}`);
          return;
        }

        toast.error(`No active Check-In found for ${employee.name} today.`);
        return;
      }

      const parseTimeString = (tStr: string) => {
        const [time, modifier] = tStr.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
      };

      const checkInMinutes = parseTimeString(activePunch.checkInTime);
      const checkOutMinutes = now.getHours() * 60 + now.getMinutes();
      const durationMins = Math.max(0, checkOutMinutes - checkInMinutes);
      const hoursDecimal = Number((durationMins / 60).toFixed(2));

      const updatedLogs = attendanceLogs.map(log => {
        if (log.id === activePunch.id) {
          return {
            ...log,
            checkOutTime: timeStr,
            workingHours: hoursDecimal
          };
        }
        return log;
      });

      setAttendanceLogs(updatedLogs);
      setLastScanSuccess({
        employee,
        action: 'Out',
        time: timeStr,
        status: 'Hours: ' + hoursDecimal
      });
      toast.success(`Check-Out Successful: ${employee.name} at ${timeStr} (Worked: ${hoursDecimal}h)`);
    }

    setScannedStaffId('');
  };

  const fetchData = async () => {
    const data = await supabaseService.getStaff();
    if (data) setStaff(data);
    setLoading(false);
  };

  useDataSync(fetchData);

  const handleAddStaff = async () => {
    if (!newStaff.name) {
      toast.error('Please enter the employee name');
      return;
    }
    const staffName = newStaff.name.trim();
    const fallbackEmail = `${staffName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'staff'}.${Date.now().toString().slice(-4)}@neogastroplushospital.com`;
    const finalEmail = (newStaff.email || '').trim() || fallbackEmail;

    const staffToAdd = {
      name: staffName,
      email: finalEmail,
      phone: newStaff.phone || '',
      role: mapFormRoleToDbRole(newStaff.role),
      department: newStaff.department || 'General Medicine',
      specialization: newStaff.specialty || 'General',
      degree: newStaff.degree || '',
      experience: newStaff.experience || '',
      consultationFee: isDoctorOrSurgeon(newStaff.role) && newStaff.consultationFee ? Number(newStaff.consultationFee) : 0,
      registrationNo: newStaff.registrationNo || '',
      regNo: newStaff.registrationNo || '',
      labLicenseNo: isLabOrPharmacy(newStaff.role) ? (newStaff.labLicenseNo || '') : '',
      licenseNumber: isLabOrPharmacy(newStaff.role) ? (newStaff.labLicenseNo || '') : '',
      avatar: (newStaff as any).avatar || getStaffPhotoUrl({ name: staffName, role: mapFormRoleToDbRole(newStaff.role), department: newStaff.department })
    };

    try {
      const result = await supabaseService.createStaff(staffToAdd);
      if (result) {
        setStaff(prev => [result, ...prev.filter(s => s.id !== result.id)]);
        toast.success(`Staff member "${staffName}" added successfully`);
        setIsAddOpen(false);
        setNewStaff({ name: '', role: 'doctor', department: '', email: '', phone: '', specialty: '', degree: '', experience: '', consultationFee: '', registrationNo: '', labLicenseNo: '' });
        fetchData();
      } else {
        toast.error('Failed to add staff member');
      }
    } catch (err: any) {
      console.error('handleAddStaff error:', err);
      toast.error('Error adding staff: ' + (err.message || 'Unknown error'));
    }
  };

  const handleUpdateStaff = async () => {
    if (!editingStaff.name) {
      toast.error('Please enter the employee name');
      return;
    }
    const staffName = editingStaff.name.trim();
    const fallbackEmail = `${staffName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'staff'}@neogastroplushospital.com`;
    const finalEmail = (editingStaff.email || '').trim() || fallbackEmail;

    const updates = {
      name: staffName,
      email: finalEmail,
      role: mapFormRoleToDbRole(editingStaff.role),
      department: editingStaff.department || 'General Medicine',
      specialization: editingStaff.specialty || 'General',
      degree: editingStaff.degree || '',
      experience: editingStaff.experience || '',
      consultationFee: isDoctorOrSurgeon(editingStaff.role) && editingStaff.consultationFee ? Number(editingStaff.consultationFee) : 0,
      registrationNo: editingStaff.registrationNo || '',
      regNo: editingStaff.registrationNo || '',
      labLicenseNo: isLabOrPharmacy(editingStaff.role) ? (editingStaff.labLicenseNo || '') : '',
      licenseNumber: isLabOrPharmacy(editingStaff.role) ? (editingStaff.labLicenseNo || '') : '',
      avatar: editingStaff.avatar || getStaffPhotoUrl({ name: staffName, role: mapFormRoleToDbRole(editingStaff.role), department: editingStaff.department })
    };

    try {
      const result = await supabaseService.updateStaff(editingStaff.id, updates);
      if (result) {
        setStaff(prev => prev.map(s => s.id === editingStaff.id ? { ...s, ...updates, ...result } : s));
        toast.success('Staff profile updated');
        setIsEditOpen(false);
        setEditingStaff(null);
        fetchData();
      } else {
        toast.error('Failed to update staff');
      }
    } catch (err: any) {
      console.error('handleUpdateStaff error:', err);
      toast.error('Error updating staff: ' + (err.message || 'Unknown error'));
    }
  };

  const handleUploadStaffPhoto = (e: React.ChangeEvent<HTMLInputElement>, staffMember: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      if (base64 && staffMember) {
        const updated = { ...staffMember, avatar: base64 };
        setSelectedBadgeStaff(updated);
        setStaff(prev => prev.map(s => s.id === staffMember.id ? updated : s));
        try {
          await supabaseService.updateStaff(staffMember.id, { avatar: base64 });
          toast.success(`Photo updated successfully for ${staffMember.name}`);
        } catch (err) {
          console.error('Error saving staff photo:', err);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteStaff = (id: string) => {
    const member = staff.find(s => s.id === id);
    if (!member) {
      toast.error('Staff member not found');
      return;
    }
    setStaffToDelete(member);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDeleteStaff = async () => {
    if (!staffToDelete) return;
    const targetId = staffToDelete.id;
    try {
      const result = await supabaseService.deleteStaff(targetId);
      if (result) {
        setStaff(prev => prev.filter(s => s.id !== targetId));
        toast.success(`Staff member "${staffToDelete.name}" deleted successfully`);
        setIsDeleteDialogOpen(false);
        setIsEditOpen(false);
        setStaffToDelete(null);
        fetchData();
      } else {
        toast.error('Failed to remove staff member from database');
      }
    } catch (err: any) {
      console.error('handleConfirmDeleteStaff error:', err);
      toast.error('Error deleting staff: ' + (err.message || 'Unknown error'));
    }
  };

  const handleExportStaff = () => {
    const headers = ['Name', 'Role', 'Department', 'Email'];
    const rows = staff.map(s => [
      s.name,
      s.role,
      s.department || 'N/A',
      s.email
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'staff_directory.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Staff directory exported');
  };

  const filteredStaff = staff.filter(s => 
    (s?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s?.role || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s?.department && String(s.department).toLowerCase().includes(searchQuery.toLowerCase())) ||
    (s?.specialization && String(s.specialization).toLowerCase().includes(searchQuery.toLowerCase())) ||
    (s?.phone && String(s.phone).toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const stats = {
    total: staff.length,
    doctors: staff.filter(s => (s?.role || '').toUpperCase().includes('DOCTOR') || (s?.role || '').toUpperCase().includes('SURGEON')).length,
    nurses: staff.filter(s => (s?.role || '').toUpperCase().includes('NURSE')).length,
    others: staff.filter(s => !(s?.role || '').toUpperCase().includes('DOCTOR') && !(s?.role || '').toUpperCase().includes('SURGEON') && !(s?.role || '').toUpperCase().includes('NURSE')).length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-medical-blue" />
        <span className="ml-2 font-medium">Loading Staff Directory...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border shadow-sm text-slate-900" style={{ background: 'linear-gradient(135deg, #FFD1A9, #FFE5C9, #FFF3E5)', borderColor: '#F5CBB0' }}>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#5A2D1B]">Staff Management</h1>
          <p className="text-[#8A563F] font-semibold text-sm">Manage hospital employees, roles, and access permissions.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 bg-white/80 border-[#5A2D1B]/25 text-[#5A2D1B] hover:bg-white font-bold" onClick={handleExportStaff}>
            <Download className="w-4 h-4 text-[#5A2D1B]" />
            Export Directory
          </Button>
          {!isAccountant && (
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#1A5E63] hover:bg-[#154c50] text-white gap-2 font-bold" onClick={() => setIsAddOpen(true)}>
                  <Plus className="w-4 h-4" />
                  Add New Staff
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add New Employee</DialogTitle>
                  <DialogDescription>Register a new staff member in the system.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                  {/* Photo upload and preview */}
                  <div className="col-span-2 flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <Avatar className="w-14 h-14 border-2 border-[#1A5E63] shadow-sm">
                      <AvatarImage 
                        src={(newStaff as any).avatar || getStaffPhotoUrl({ name: newStaff.name || 'New Staff', role: mapFormRoleToDbRole(newStaff.role), department: newStaff.department })} 
                        className="object-cover" 
                      />
                      <AvatarFallback className="bg-teal-50 text-[#1A5E63] font-bold text-lg">
                        {newStaff.name ? newStaff.name.charAt(0) : 'S'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-700">Staff Photo (Real Portrait)</Label>
                      <p className="text-[10px] text-slate-500">Auto-assigned realistic medical portrait or upload real photo:</p>
                      <label className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer shadow-2xs transition-colors">
                        <Upload className="w-3.5 h-3.5 text-[#1A5E63]" />
                        <span>{(newStaff as any).avatar ? 'Change Uploaded Photo' : 'Upload Real Photo'}</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (evt) => {
                                const base64 = evt.target?.result as string;
                                if (base64) setNewStaff(prev => ({ ...prev, avatar: base64 } as any));
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input 
                      placeholder="Enter name" 
                      value={newStaff.name}
                      onChange={(e) => setNewStaff({...newStaff, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select 
                      value={newStaff.role}
                      onValueChange={(v) => setNewStaff({...newStaff, role: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="super_admin">super_admin</SelectItem>
                        <SelectItem value="doctor">doctor</SelectItem>
                        <SelectItem value="surgeon">surgeon</SelectItem>
                        <SelectItem value="nurse">nurse</SelectItem>
                        <SelectItem value="reception">reception</SelectItem>
                        <SelectItem value="pharmacist">pharmacist</SelectItem>
                        <SelectItem value="lab_staff">lab_staff</SelectItem>
                        <SelectItem value="accountant">accountant</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Input 
                      placeholder="e.g. Cardiology" 
                      value={newStaff.department}
                      onChange={(e) => setNewStaff({...newStaff, department: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Specialty</Label>
                    <Input 
                      placeholder="e.g. Pediatrics" 
                      value={newStaff.specialty}
                      onChange={(e) => setNewStaff({...newStaff, specialty: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input 
                      type="email" 
                      placeholder="email@hospital.com" 
                      value={newStaff.email}
                      onChange={(e) => setNewStaff({...newStaff, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Phone</Label>
                    <Input 
                      placeholder="+91 9876543210" 
                      value={newStaff.phone}
                      onChange={(e) => setNewStaff({...newStaff, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Degree / Qualification</Label>
                    <Input 
                      placeholder="e.g. MS, FMAS, MBBS" 
                      value={newStaff.degree}
                      onChange={(e) => setNewStaff({...newStaff, degree: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Experience</Label>
                    <Input 
                      placeholder="e.g. 10+ Years" 
                      value={newStaff.experience}
                      onChange={(e) => setNewStaff({...newStaff, experience: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Registration Number</Label>
                    <Input 
                      placeholder="e.g. REG-12345 / MCI-98765" 
                      value={newStaff.registrationNo}
                      onChange={(e) => setNewStaff({...newStaff, registrationNo: e.target.value})}
                    />
                  </div>
                  {isDoctorOrSurgeon(newStaff.role) && (
                    <div className="space-y-2">
                      <Label>Consultation Fee (₹)</Label>
                      <Input 
                        type="number" 
                        placeholder="e.g. 500" 
                        value={newStaff.consultationFee}
                        onChange={(e) => setNewStaff({...newStaff, consultationFee: e.target.value})}
                      />
                    </div>
                  )}
                  {isLabOrPharmacy(newStaff.role) && (
                    <div className="space-y-2 col-span-2">
                      <Label className="text-emerald-800 font-bold flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-emerald-600" />
                        {newStaff.role.toLowerCase().includes('pharm') ? 'Pharmacy License Number' : 'Lab License Number'}
                      </Label>
                      <Input 
                        placeholder={newStaff.role.toLowerCase().includes('pharm') ? "e.g. DL-PHARM-12345/2026" : "e.g. LAB-LIC-998877"} 
                        value={newStaff.labLicenseNo}
                        onChange={(e) => setNewStaff({...newStaff, labLicenseNo: e.target.value})}
                        className="border-emerald-300 focus:border-emerald-500 bg-emerald-50/30 font-medium"
                      />
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                  <Button className="bg-medical-blue" onClick={handleAddStaff}>Add Staff</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>      {/* Tab Selector */}
      <div className="flex border-b border-slate-200 pb-px gap-1 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveStaffTab('directory')}
          className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeStaffTab === 'directory'
              ? 'border-[#1A5E63] text-[#1A5E63] font-black'
              : 'border-transparent text-slate-500 hover:text-slate-700 font-medium'
          }`}
        >
          <Users className="w-4 h-4" />
          Employee Directory
        </button>
        <button
          onClick={() => setActiveStaffTab('terminal')}
          className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeStaffTab === 'terminal'
              ? 'border-[#1A5E63] text-[#1A5E63] font-black'
              : 'border-transparent text-slate-500 hover:text-slate-700 font-medium'
          }`}
        >
          <Camera className="w-4 h-4" />
          QR Attendance Terminal
        </button>
        <button
          onClick={() => setActiveStaffTab('badges')}
          className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeStaffTab === 'badges'
              ? 'border-[#1A5E63] text-[#1A5E63] font-black'
              : 'border-transparent text-slate-500 hover:text-slate-700 font-medium'
          }`}
        >
          <QrCode className="w-4 h-4" />
          Printable QR Badges
        </button>
        <button
          onClick={() => setActiveStaffTab('register')}
          className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeStaffTab === 'register'
              ? 'border-[#1A5E63] text-[#1A5E63] font-black'
              : 'border-transparent text-slate-500 hover:text-slate-700 font-medium'
          }`}
        >
          <History className="w-4 h-4" />
          Attendance Logs
        </button>
      </div>

      {activeStaffTab === 'directory' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-none shadow-sm bg-white">
              <CardContent className="p-4">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Total Staff</p>
                <h3 className="text-xl font-bold">{stats.total}</h3>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-white">
              <CardContent className="p-4">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Doctors</p>
                <h3 className="text-xl font-bold text-blue-600">{stats.doctors}</h3>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-white">
              <CardContent className="p-4">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Nurses</p>
                <h3 className="text-xl font-bold text-teal-600">{stats.nurses}</h3>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-white">
              <CardContent className="p-4">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Admin/Support</p>
                <h3 className="text-xl font-bold text-slate-600">{stats.others}</h3>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-slate-100">
              <div>
                <CardTitle className="text-lg font-bold text-slate-800">Employee Directory</CardTitle>
                <p className="text-xs text-slate-500">Comprehensive list of staff members with qualifications, experience & registration details</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search employee..." 
                    className="pl-10 bg-slate-50 border-none h-9 text-xs" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="sm" className="h-9 font-medium text-xs">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto custom-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-slate-100 bg-slate-50/70">
                      <TableHead className="whitespace-nowrap font-bold text-xs text-slate-700">Employee</TableHead>
                      <TableHead className="whitespace-nowrap font-bold text-xs text-slate-700">Role & Department</TableHead>
                      <TableHead className="whitespace-nowrap font-bold text-xs text-slate-700">Qualifications & Exp</TableHead>
                      <TableHead className="whitespace-nowrap font-bold text-xs text-slate-700">Reg. No & Fee / Lic</TableHead>
                      <TableHead className="whitespace-nowrap font-bold text-xs text-slate-700">Contact</TableHead>
                      <TableHead className="whitespace-nowrap font-bold text-xs text-slate-700">Status</TableHead>
                      <TableHead className="text-right whitespace-nowrap font-bold text-xs text-slate-700">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStaff.length > 0 ? filteredStaff.map((user) => {
                      const empIdCode = user.id ? `EMP-${String(user.id).substring(0, 8).toUpperCase()}` : 'EMP-STAFF';
                      const spec = user.specialty || user.specialization || 'General';
                      const qual = user.degree || user.qualification || 'N/A';
                      const exp = user.experience || 'N/A';
                      const regNum = user.registrationNo || user.regNo || 'N/A';
                      const fee = user.consultationFee ?? user.consultation_fee;
                      const licNum = user.labLicenseNo || user.licenseNumber;

                      return (
                        <TableRow key={user.id} className="border-slate-100 transition-colors hover:bg-slate-50/60">
                          {/* Employee */}
                          <TableCell className="whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-10 h-10 border-2 border-slate-100">
                                <AvatarImage src={getStaffPhotoUrl(user)} />
                                <AvatarFallback className="bg-teal-50 text-[#1A5E63] font-bold">
                                  {user.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-bold text-xs text-slate-800">{user.name}</p>
                                <p className="text-[10px] font-mono text-[#1A5E63] font-semibold">{empIdCode}</p>
                              </div>
                            </div>
                          </TableCell>

                          {/* Role & Dept */}
                          <TableCell className="whitespace-nowrap">
                            <div className="flex flex-col gap-0.5">
                              <Badge variant="outline" className="w-fit text-[10px] font-black uppercase tracking-tight bg-teal-50 text-[#1A5E63] border-teal-200">
                                {user.role?.replace(/_/g, ' ')}
                              </Badge>
                              <span className="text-xs font-semibold text-slate-700">{user.department || 'Administration'}</span>
                              <span className="text-[10px] text-slate-500">Spec: <strong className="text-slate-700">{spec}</strong></span>
                            </div>
                          </TableCell>

                          {/* Qualifications & Exp */}
                          <TableCell className="whitespace-nowrap">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-semibold text-slate-800">{qual}</span>
                              <span className="text-[10px] text-slate-500">Exp: <strong className="text-slate-700">{exp}</strong></span>
                            </div>
                          </TableCell>

                          {/* Reg No & Fee / Lic */}
                          <TableCell className="whitespace-nowrap">
                            <div className="flex flex-col gap-0.5 text-xs">
                              <span className="text-[11px] font-mono font-medium text-slate-700">Reg: {regNum}</span>
                              {isDoctorOrSurgeon(user.role) && (
                                <span className="text-[10px] font-bold text-emerald-700">
                                  Fee: ₹{fee ?? 0}
                                </span>
                              )}
                              {isLabOrPharmacy(user.role) && licNum && (
                                <span className="text-[10px] font-bold text-emerald-700">
                                  Lic: {licNum}
                                </span>
                              )}
                            </div>
                          </TableCell>

                          {/* Contact */}
                          <TableCell className="whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1 text-xs text-slate-600">
                                <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="font-medium">{user.email}</span>
                              </div>
                              {user.phone && (
                                <div className="flex items-center gap-1 text-xs text-slate-600">
                                  <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>{user.phone}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>

                          {/* Status */}
                          <TableCell className="whitespace-nowrap">
                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">Active</Badge>
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="text-right whitespace-nowrap">
                            <div className="flex justify-end items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Badge Preview"
                                className="h-8 text-xs font-bold text-[#1A5E63] hover:bg-teal-50"
                                onClick={() => setSelectedBadgeStaff(user)}
                              >
                                <QrCode className="w-3.5 h-3.5 mr-1" />
                                I-Card
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Edit Staff Details"
                                className="h-8 w-8 hover:bg-teal-50 text-slate-600 hover:text-[#1A5E63]" 
                                onClick={() => {
                                  try {
                                    setEditingStaff({
                                      ...user,
                                      role: mapDbRoleToFormRole(user.role),
                                      specialty: user.specialization || user.specialty || '',
                                      degree: user.degree || user.qualification || '',
                                      qualification: user.degree || user.qualification || '',
                                      experience: user.experience || '',
                                      consultationFee: user.consultationFee !== undefined && user.consultationFee !== null 
                                        ? String(user.consultationFee) 
                                        : (user.consultation_fee !== undefined && user.consultation_fee !== null ? String(user.consultation_fee) : ''),
                                      registrationNo: user.registrationNo || user.regNo || '',
                                      regNo: user.registrationNo || user.regNo || '',
                                      labLicenseNo: user.labLicenseNo || user.licenseNumber || ''
                                    });
                                    setIsEditOpen(true);
                                  } catch (err) {
                                    console.error('Error opening edit staff details:', err);
                                  }
                                }}
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                              {!isAccountant && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-50" onClick={() => handleDeleteStaff(user.id)}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    }) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-xs">
                          No employees found matching your search.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeStaffTab === 'terminal' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-300">
          {/* Left Column: Kiosk Scanner Simulator (Span 7) */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
                <CardTitle className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2 font-mono">
                  <Camera className="w-4 h-4 text-[#1A5E63]" />
                  Central QR Check-In/Out Kiosk
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Mode Selector */}
                <div className="flex justify-center gap-2">
                  <Button
                    variant={terminalMode === 'auto' ? 'default' : 'outline'}
                    onClick={() => setTerminalMode('auto')}
                    className={`text-xs h-8 px-4 font-bold cursor-pointer ${terminalMode === 'auto' ? 'bg-[#1A5E63] text-white hover:bg-[#154c50]' : ''}`}
                  >
                    Smart Auto-Detect
                  </Button>
                  <Button
                    variant={terminalMode === 'in' ? 'default' : 'outline'}
                    onClick={() => setTerminalMode('in')}
                    className={`text-xs h-8 px-4 font-bold cursor-pointer ${terminalMode === 'in' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : ''}`}
                  >
                    Force CHECK-IN
                  </Button>
                  <Button
                    variant={terminalMode === 'out' ? 'default' : 'outline'}
                    onClick={() => setTerminalMode('out')}
                    className={`text-xs h-8 px-4 font-bold cursor-pointer ${terminalMode === 'out' ? 'bg-rose-600 text-white hover:bg-rose-700' : ''}`}
                  >
                    Force CHECK-OUT
                  </Button>
                </div>

                {/* Live Camera Scanner with Front/Back switch & Smart Auto-Detect */}
                <AttendanceCameraScanner
                  onScan={(code, camSrc) => handleQrPunch(code, camSrc)}
                  terminalMode={terminalMode}
                  autoStart={true}
                />

                {/* Input block mimicking USB hardware scanner or typing scan */}
                <div className="max-w-md mx-auto space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">Scan QR Code or Enter Employee ID</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <QrCode className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <Input
                          placeholder="e.g. EMP-1, EMP-2, or click below..."
                          value={scannedStaffId}
                          onChange={(e) => setScannedStaffId(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleQrPunch(scannedStaffId);
                            }
                          }}
                          className="pl-9 h-9 text-xs"
                        />
                      </div>
                      <Button
                        onClick={() => handleQrPunch(scannedStaffId)}
                        className="h-9 text-xs font-bold bg-[#1A5E63] hover:bg-[#154c50] text-white px-4 cursor-pointer"
                      >
                        Simulate Scan
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Quick Scan Selection list for demo/iframe testing */}
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-bold text-slate-500 mb-2.5 text-center">
                    💡 Quick Simulator: Click an employee below to simulate scanning their QR Badge
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {staff.map((s) => {
                      const isCurrentlyIn = attendanceLogs.some(
                        (log) => log.staffId === s.id && !log.checkOutTime && log.date === new Date().toISOString().split('T')[0]
                      );
                      return (
                        <button
                          key={s.id}
                          onClick={() => handleQrPunch(s.id)}
                          className={`p-2 rounded-xl border text-left text-xs transition-all hover:scale-[1.02] cursor-pointer flex items-center gap-2 ${
                            isCurrentlyIn
                              ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800 font-bold'
                              : 'bg-white hover:bg-slate-50 border-slate-100'
                          }`}
                        >
                          <Avatar className="w-6 h-6 border">
                            <AvatarImage src={getStaffPhotoUrl(s)} />
                            <AvatarFallback>{s.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="truncate flex-1">
                            <p className="font-semibold text-[11px] truncate">{s.name}</p>
                            <p className="text-[9px] text-muted-foreground flex items-center gap-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${isCurrentlyIn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                              {isCurrentlyIn ? 'On Duty' : 'Out'}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Scan status & Currently Checked In (Span 5) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Last Scan Status Card */}
            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
                <CardTitle className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2 font-mono">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  Terminal Feedback
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 text-center">
                {lastScanSuccess ? (
                  <div className="space-y-3 animate-in zoom-in-95 duration-200">
                    <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <CheckCircle className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-extrabold text-slate-800">{lastScanSuccess.employee.name}</h4>
                      <p className="text-xs text-muted-foreground uppercase font-black font-mono">
                        {lastScanSuccess.employee.role.replace('_', ' ')}
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full border text-xs font-mono">
                      <span className={`font-bold ${lastScanSuccess.action === 'In' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        PUNCH {lastScanSuccess.action.toUpperCase()}
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className="text-slate-600">{lastScanSuccess.time}</span>
                    </div>
                    {lastScanSuccess.status && (
                      <p className="text-[10px] text-slate-400 italic">Status: {lastScanSuccess.status}</p>
                    )}
                  </div>
                ) : (
                  <div className="py-12 text-slate-400">
                    <QrCode className="w-12 h-12 mx-auto mb-2 opacity-30 text-slate-400 animate-pulse" />
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Waiting for QR scan...</p>
                    <p className="text-[9.5px] text-slate-400 mt-1">Scan a staff badge using the input or click quick punch</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Currently Active Staff Card */}
            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-slate-50 border-b border-slate-100 p-4 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2 font-mono">
                  <Users className="w-4 h-4 text-[#1A5E63]" />
                  Currently Checked-In
                </CardTitle>
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 font-bold border-none text-[10px]">
                  {attendanceLogs.filter(log => !log.checkOutTime && log.date === new Date().toISOString().split('T')[0]).length} On Premise
                </Badge>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3 max-h-[280px] overflow-y-auto custom-scrollbar">
                  {(() => {
                    const activePunches = attendanceLogs.filter(
                      (log) => !log.checkOutTime && log.date === new Date().toISOString().split('T')[0]
                    );

                    if (activePunches.length === 0) {
                      return (
                        <p className="text-center text-xs text-slate-400 py-6 italic">No staff members are currently checked in.</p>
                      );
                    }

                    return activePunches.map((punch) => {
                      const emp = staff.find(s => s.id === punch.staffId);
                      return (
                        <div key={punch.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-100/60 text-xs">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="w-8 h-8 border">
                              <AvatarImage src={getStaffPhotoUrl(emp || { name: punch.staffName, role: punch.role, department: punch.department })} />
                              <AvatarFallback>{punch.staffName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-bold text-slate-800">{punch.staffName}</p>
                              <p className="text-[9.5px] text-slate-400 font-mono">In: {punch.checkInTime}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className={`text-[9px] font-bold ${punch.status === 'Late' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                            {punch.status}
                          </Badge>
                        </div>
                      );
                    });
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeStaffTab === 'badges' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
              <CardTitle className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2 font-mono">
                <QrCode className="w-4 h-4 text-[#1A5E63]" />
                Employee Identity Card & QR Badge Directory
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {staff.map((member) => {
                  const cleanEmpId = `EMP-${member.id.substring(0, 8).toUpperCase()}`;
                  const spec = member.specialty || member.specialization || 'General';
                  const qual = member.degree || member.qualification || 'N/A';
                  const exp = member.experience || 'N/A';
                  const regNum = member.registrationNo || member.regNo || 'N/A';
                  const fee = member.consultationFee ?? member.consultation_fee;
                  const licNum = member.labLicenseNo || member.licenseNumber;

                  return (
                    <Card key={member.id} className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white flex flex-col justify-between hover:border-teal-300 transition-all group">
                      <div className="p-4 space-y-3">
                        {/* Header Bar */}
                        <div className="bg-gradient-to-r from-[#1A5E63] to-[#154c50] text-white p-2.5 -mx-4 -mt-4 mb-2 flex items-center justify-between border-b-2 border-[#FFD1A9]">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-xs tracking-wider uppercase">NEO GASTROPLUS</span>
                            <span className="text-[9px] text-teal-100 opacity-90 font-medium">| Healthcare</span>
                          </div>
                          <span className="text-[9px] font-mono font-bold text-teal-100">{cleanEmpId}</span>
                        </div>

                        {/* Profile Info */}
                        <div className="flex items-center gap-3">
                          <Avatar className="w-14 h-14 border-2 border-[#1A5E63] shadow-sm shrink-0">
                            <AvatarImage src={getStaffPhotoUrl(member)} />
                            <AvatarFallback className="bg-teal-50 text-[#1A5E63] font-black">{member.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="truncate flex-1">
                            <h4 className="font-extrabold text-sm text-slate-800 truncate">{member.name}</h4>
                            <Badge className="bg-[#1A5E63] text-white border-none font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 mt-1">
                              {member.role?.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                        </div>

                        {/* ID Badge Details Box */}
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-2">
                          <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                            <div className="space-y-0.5 min-w-0 flex-1">
                              <p className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider">Department</p>
                              <p className="font-bold text-xs text-slate-800 truncate">{member.department || 'Administration'}</p>
                            </div>
                            <div className="bg-white p-1 rounded-lg border border-slate-200 flex items-center justify-center shrink-0">
                              <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&margin=3&data=${member.id}`}
                                alt="Staff QR"
                                className="w-12 h-12"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[10.5px]">
                            <div className="min-w-0">
                              <span className="text-[8.5px] font-bold text-slate-400 block uppercase">Specialty</span>
                              <span className="font-semibold text-slate-800 truncate block">{spec}</span>
                            </div>
                            <div className="min-w-0">
                              <span className="text-[8.5px] font-bold text-slate-400 block uppercase">Qualification</span>
                              <span className="font-semibold text-slate-800 truncate block">{qual}</span>
                            </div>
                            <div className="col-span-2 min-w-0 border-t border-slate-200/60 pt-1 mt-0.5">
                              <span className="text-[8.5px] font-bold text-slate-400 block uppercase">Reg. Number</span>
                              <span className="font-semibold font-mono text-slate-800 truncate block">{regNum}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-3 border-t border-slate-100/80 flex items-center justify-between gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedBadgeStaff(member)}
                          className="text-[11px] h-8 font-bold flex-1 cursor-pointer bg-white hover:bg-slate-100"
                        >
                          Show Badge Preview
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handlePrintBadge(member)}
                          className="bg-[#1A5E63] hover:bg-[#154c50] text-white text-[11px] h-8 font-black flex items-center gap-1 px-3 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Print
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeStaffTab === 'register' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Daily Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-none shadow-sm bg-white">
              <CardContent className="p-4 text-center">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">Today Punches</p>
                <h3 className="text-xl font-bold text-[#1A5E63]">
                  {attendanceLogs.filter(log => log.date === new Date().toISOString().split('T')[0]).length}
                </h3>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-white">
              <CardContent className="p-4 text-center">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">Currently Checked-In</p>
                <h3 className="text-xl font-bold text-emerald-600">
                  {attendanceLogs.filter(log => !log.checkOutTime && log.date === new Date().toISOString().split('T')[0]).length}
                </h3>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-white">
              <CardContent className="p-4 text-center">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">On Time Today</p>
                <h3 className="text-xl font-bold text-teal-600">
                  {attendanceLogs.filter(log => log.date === new Date().toISOString().split('T')[0] && log.status === 'On Time').length}
                </h3>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-white">
              <CardContent className="p-4 text-center">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">Late Entries Today</p>
                <h3 className="text-xl font-bold text-amber-600">
                  {attendanceLogs.filter(log => log.date === new Date().toISOString().split('T')[0] && log.status === 'Late').length}
                </h3>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 pb-4 border-b border-slate-50">
              <div>
                <CardTitle className="text-lg">Attendance Punch Register</CardTitle>
                <p className="text-xs text-muted-foreground">Historical roster of staff check-in and check-out logs.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="date"
                  value={attendanceDateFilter}
                  onChange={(e) => setAttendanceDateFilter(e.target.value)}
                  className="h-9 text-xs bg-slate-50/50 border-none w-36"
                />
                <div className="relative w-44">
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <Input
                    placeholder="Search logs..."
                    value={attendanceSearchQuery}
                    onChange={(e) => setAttendanceSearchQuery(e.target.value)}
                    className="pl-8 h-9 text-xs bg-slate-50/50 border-none"
                  />
                </div>
                <Button
                  onClick={() => setIsManualPunchOpen(true)}
                  className="h-9 text-xs font-bold bg-[#1A5E63] hover:bg-[#154c50] text-white px-3 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Manual Punch
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const headers = ['Staff Name', 'Role', 'Department', 'Date', 'Check In', 'Check Out', 'Status', 'Working Hours', 'Method'];
                    const rows = attendanceLogs.map(log => [
                      log.staffName,
                      log.role,
                      log.department,
                      log.date,
                      log.checkInTime,
                      log.checkOutTime || 'Active',
                      log.status,
                      log.workingHours || 'N/A',
                      log.method
                    ]);
                    const csv = [headers, ...rows].map(e => e.join(',')).join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `staff_attendance_${attendanceDateFilter}.csv`;
                    a.click();
                    toast.success('Roster exported successfully');
                  }}
                  className="h-9 text-xs font-bold px-3 border border-slate-200 cursor-pointer"
                >
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto custom-scrollbar">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-slate-100 hover:bg-transparent">
                      <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider font-mono">Employee Details</TableHead>
                      <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider font-mono">Date</TableHead>
                      <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider font-mono">Punches (In/Out)</TableHead>
                      <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider font-mono">Duration</TableHead>
                      <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider font-mono">Method</TableHead>
                      <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-wider font-mono">Arrive Status</TableHead>
                      <TableHead className="text-right text-[10px] font-black text-slate-500 uppercase tracking-wider font-mono">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const filteredLogs = attendanceLogs.filter(log => {
                        const matchesSearch = log.staffName.toLowerCase().includes(attendanceSearchQuery.toLowerCase()) ||
                          log.role.toLowerCase().includes(attendanceSearchQuery.toLowerCase()) ||
                          log.department.toLowerCase().includes(attendanceSearchQuery.toLowerCase());
                        const matchesDate = !attendanceDateFilter || log.date === attendanceDateFilter;
                        return matchesSearch && matchesDate;
                      });

                      if (filteredLogs.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                              <History className="w-8 h-8 mx-auto mb-2 opacity-25 text-slate-400" />
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">No attendance logs found for this date/search.</p>
                            </TableCell>
                          </TableRow>
                        );
                      }

                      return filteredLogs.map((log) => {
                        const emp = staff.find(s => s.id === log.staffId);
                        return (
                          <TableRow key={log.id} className="border-slate-50 hover:bg-slate-50/50">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="w-8 h-8 border">
                                  <AvatarImage src={getStaffPhotoUrl(emp || { name: log.staffName, role: log.role, department: log.department })} />
                                  <AvatarFallback>{log.staffName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-bold text-slate-800 text-xs">{log.staffName}</p>
                                  <p className="text-[10px] text-muted-foreground uppercase font-mono">{log.role.replace('_', ' ')}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium text-xs text-slate-600 font-mono">
                              {new Date(log.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5 text-xs font-mono">
                                <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded font-bold">{log.checkInTime}</span>
                                <ArrowRight className="w-3 h-3 text-slate-400" />
                                {log.checkOutTime ? (
                                  <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">{log.checkOutTime}</span>
                                ) : (
                                  <span className="bg-teal-50 text-teal-800 px-1.5 py-0.5 rounded font-extrabold animate-pulse">ACTIVE</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-slate-700 font-bold font-mono">
                              {log.workingHours ? `${log.workingHours} hrs` : (log.checkOutTime ? 'N/A' : 'In Progress')}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-[9.5px] font-mono px-1.5 py-0.5 uppercase ${log.method === 'QR_CODE' ? 'bg-indigo-50/40 text-indigo-700 border-indigo-100' : 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                                {log.method?.replace('_', ' ') || 'QR CODE'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={`text-[10px] font-bold border-none ${log.status === 'Late' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-[#1A5E63]'}`}>
                                {log.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this punch entry?')) {
                                    setAttendanceLogs(attendanceLogs.filter(item => item.id !== log.id));
                                    toast.success('Punch log removed');
                                  }
                                }}
                                className="h-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-[10px] font-bold cursor-pointer"
                              >
                                Delete
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      });
                    })()}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Printable ID Badge Dialog Preview */}
      <Dialog open={!!selectedBadgeStaff} onOpenChange={(open) => { if(!open) setSelectedBadgeStaff(null); }}>
        <DialogContent className="sm:max-w-[400px] flex flex-col items-center">
          <DialogHeader className="w-full text-center pb-2">
            <DialogTitle className="text-sm font-black uppercase text-slate-600 tracking-wider">Staff Digital ID Card</DialogTitle>
            <DialogDescription>Hospital credential & QR barcode keycard</DialogDescription>
          </DialogHeader>

          {selectedBadgeStaff && (
            <div className="space-y-4 w-full flex flex-col items-center">
              {/* Badge visual card */}
              <div className="w-[320px] bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col justify-between">
                <div className="bg-gradient-to-r from-[#1A5E63] to-[#154c50] text-white p-3 text-center border-b-4 border-[#FFD1A9]">
                  <h3 className="font-extrabold text-[14px] tracking-widest uppercase">NEO GASTROPLUS</h3>
                  <p className="text-[8px] tracking-wider text-teal-100 opacity-90 uppercase font-semibold">Healthcare & Surgicals</p>
                </div>
                <div className="p-4 flex flex-col items-center text-center space-y-3">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="relative group">
                      <Avatar className="w-24 h-24 border-3 border-[#1A5E63] shadow-lg">
                        <AvatarImage 
                          src={getStaffPhotoUrl(selectedBadgeStaff)} 
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-teal-50 text-[#1A5E63] font-black text-xl">
                          {selectedBadgeStaff.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <label 
                        title="Upload actual photo"
                        className="absolute inset-0 bg-black/50 hover:bg-black/60 rounded-full flex flex-col items-center justify-center text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 cursor-pointer transition-all shadow-inner"
                      >
                        <Camera className="w-5 h-5 mb-0.5" />
                        <span>Change</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => handleUploadStaffPhoto(e, selectedBadgeStaff)} 
                        />
                      </label>
                    </div>
                    <label className="inline-flex items-center gap-1 text-[10px] text-[#1A5E63] hover:text-[#154c50] font-bold cursor-pointer bg-teal-50 hover:bg-teal-100 px-2 py-0.5 rounded-md border border-teal-200/80 transition-colors shadow-2xs">
                      <Upload className="w-3 h-3 text-[#1A5E63]" />
                      <span>Upload Photo</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => handleUploadStaffPhoto(e, selectedBadgeStaff)} 
                      />
                    </label>
                  </div>
                  <div>
                    <h4 className="font-black text-base text-slate-800">{selectedBadgeStaff.name}</h4>
                    <Badge className="bg-[#1A5E63] text-white border-none font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5 mt-1">
                      {selectedBadgeStaff.role?.replace(/_/g, ' ')}
                    </Badge>
                  </div>

                  {/* Details Table inside Modal Badge */}
                  <div className="w-full bg-slate-50 rounded-xl p-3 border border-slate-200 text-left space-y-1.5 text-xs">
                    <div className="flex justify-between border-b border-slate-200/60 pb-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">EMP ID:</span>
                      <span className="font-mono font-bold text-[#1A5E63]">EMP-{selectedBadgeStaff.id.substring(0, 8).toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Department:</span>
                      <span className="font-semibold text-slate-800">{selectedBadgeStaff.department || 'Administration'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Specialty:</span>
                      <span className="font-semibold text-slate-800">{selectedBadgeStaff.specialty || selectedBadgeStaff.specialization || 'General'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Qualification:</span>
                      <span className="font-semibold text-slate-800">{selectedBadgeStaff.degree || selectedBadgeStaff.qualification || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Reg. Number:</span>
                      <span className="font-mono font-semibold text-slate-800">{selectedBadgeStaff.registrationNo || selectedBadgeStaff.regNo || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-inner flex flex-col items-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&margin=3&data=${selectedBadgeStaff.id}`}
                      alt="ID QR"
                      className="w-20 h-20"
                    />
                    <span className="font-mono text-[9px] text-slate-400 font-bold uppercase mt-1">
                      SCAN FOR TERMINAL ACCESS
                    </span>
                  </div>
                </div>
                <div className="bg-slate-50 py-2 border-t border-slate-100 text-center text-[9px] text-slate-400 font-medium">
                  Official NEO GASTROPLUS Hospital Employee ID Card
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 w-full pt-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedBadgeStaff(null)}
                  className="flex-1 text-xs h-9 font-bold"
                >
                  Close
                </Button>
                <Button
                  onClick={() => handlePrintBadge(selectedBadgeStaff)}
                  className="flex-1 bg-[#1A5E63] hover:bg-[#154c50] text-white text-xs h-9 font-black flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  Print ID Card
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Manual Attendance Punch Dialog */}
      <Dialog open={isManualPunchOpen} onOpenChange={setIsManualPunchOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Log Manual Attendance Punch</DialogTitle>
            <DialogDescription>Administrative override for staff check-in or checkout.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Select Employee <span className="text-red-500">*</span></Label>
              <Select
                value={manualPunchData.staffId}
                onValueChange={(v) => setManualPunchData({ ...manualPunchData, staffId: v })}
              >
                <SelectTrigger className="text-xs h-9 bg-white">
                  <SelectValue placeholder="Choose staff member..." />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.name} - {s.role?.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Date <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  value={manualPunchData.date}
                  onChange={(e) => setManualPunchData({ ...manualPunchData, date: e.target.value })}
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Arrival Status</Label>
                <Select
                  value={manualPunchData.status}
                  onValueChange={(v) => setManualPunchData({ ...manualPunchData, status: v })}
                >
                  <SelectTrigger className="text-xs h-9 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="On Time">On Time</SelectItem>
                    <SelectItem value="Late">Late</SelectItem>
                    <SelectItem value="Half Day">Half Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Clock In Time <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="e.g. 08:30 AM"
                  value={manualPunchData.checkInTime}
                  onChange={(e) => setManualPunchData({ ...manualPunchData, checkInTime: e.target.value })}
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Clock Out Time (Optional)</Label>
                <Input
                  placeholder="e.g. 05:00 PM"
                  value={manualPunchData.checkOutTime}
                  onChange={(e) => setManualPunchData({ ...manualPunchData, checkOutTime: e.target.value })}
                  className="text-xs h-9"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsManualPunchOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleManualPunchSubmit} className="bg-[#1A5E63] hover:bg-[#154c50] text-white size-sm font-bold cursor-pointer">
              Save Attendance Log
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Staff Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Employee Details</DialogTitle>
            <DialogDescription>Modify information for {editingStaff?.name}.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            {/* Photo upload and preview in Edit modal */}
            <div className="col-span-2 flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <Avatar className="w-14 h-14 border-2 border-[#1A5E63] shadow-sm">
                <AvatarImage 
                  src={getStaffPhotoUrl(editingStaff)} 
                  className="object-cover" 
                />
                <AvatarFallback className="bg-teal-50 text-[#1A5E63] font-bold text-lg">
                  {editingStaff?.name ? editingStaff.name.charAt(0) : 'S'}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Staff Photo (Real Portrait)</Label>
                <p className="text-[10px] text-slate-500">Realistic portrait or custom uploaded photo:</p>
                <label className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer shadow-2xs transition-colors">
                  <Upload className="w-3.5 h-3.5 text-[#1A5E63]" />
                  <span>Upload Real Photo</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          const base64 = evt.target?.result as string;
                          if (base64) setEditingStaff(prev => ({ ...prev, avatar: base64 }));
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input 
                placeholder="Enter name" 
                value={editingStaff?.name || ''}
                onChange={(e) => setEditingStaff({...editingStaff, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select 
                value={editingStaff?.role || 'doctor'}
                onValueChange={(v) => setEditingStaff({...editingStaff, role: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="surgeon">Surgeon</SelectItem>
                  <SelectItem value="nurse">Nurse</SelectItem>
                  <SelectItem value="reception">Receptionist</SelectItem>
                  <SelectItem value="pharmacist">Pharmacist</SelectItem>
                  <SelectItem value="lab_staff">Lab Staff</SelectItem>
                  <SelectItem value="accountant">Accountant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Input 
                placeholder="e.g. Cardiology" 
                value={editingStaff?.department || ''}
                onChange={(e) => setEditingStaff({...editingStaff, department: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Specialty</Label>
              <Input 
                placeholder="e.g. Pediatrics" 
                value={editingStaff?.specialty || ''}
                onChange={(e) => setEditingStaff({...editingStaff, specialty: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input 
                type="email" 
                placeholder="email@hospital.com" 
                value={editingStaff?.email || ''}
                onChange={(e) => setEditingStaff({...editingStaff, email: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Contact Phone</Label>
              <Input 
                placeholder="+91 9876543210" 
                value={editingStaff?.phone || ''}
                onChange={(e) => setEditingStaff({...editingStaff, phone: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Degree / Qualification</Label>
              <Input 
                placeholder="e.g. MS, FMAS, MBBS" 
                value={editingStaff?.degree || editingStaff?.qualification || ''}
                onChange={(e) => setEditingStaff({...editingStaff, degree: e.target.value, qualification: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Experience</Label>
              <Input 
                placeholder="e.g. 10+ Years" 
                value={editingStaff?.experience || ''}
                onChange={(e) => setEditingStaff({...editingStaff, experience: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Registration Number</Label>
              <Input 
                placeholder="e.g. REG-12345 / MCI-98765" 
                value={editingStaff?.registrationNo || editingStaff?.regNo || ''}
                onChange={(e) => setEditingStaff({...editingStaff, registrationNo: e.target.value, regNo: e.target.value})}
              />
            </div>
            {isDoctorOrSurgeon(editingStaff?.role || '') && (
              <div className="space-y-2 col-span-2">
                <Label>Consultation Fee (₹)</Label>
                <Input 
                  type="number" 
                  placeholder="e.g. 500" 
                  value={editingStaff?.consultationFee || ''}
                  onChange={(e) => setEditingStaff({...editingStaff, consultationFee: e.target.value})}
                />
              </div>
            )}
            {isLabOrPharmacy(editingStaff?.role || '') && (
              <div className="space-y-2 col-span-2">
                <Label className="text-emerald-800 font-bold flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-emerald-600" />
                  {(editingStaff?.role || '').toLowerCase().includes('pharm') ? 'Pharmacy License Number' : 'Lab License Number'}
                </Label>
                <Input 
                  placeholder={(editingStaff?.role || '').toLowerCase().includes('pharm') ? "e.g. DL-PHARM-12345/2026" : "e.g. LAB-LIC-998877"} 
                  value={editingStaff?.labLicenseNo || editingStaff?.licenseNumber || ''}
                  onChange={(e) => setEditingStaff({...editingStaff, labLicenseNo: e.target.value, licenseNumber: e.target.value})}
                  className="border-emerald-300 focus:border-emerald-500 bg-emerald-50/30 font-medium"
                />
              </div>
            )}
          </div>
          <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
            <Button 
              type="button" 
              variant="destructive" 
              size="sm"
              onClick={() => {
                if (editingStaff) {
                  setStaffToDelete(editingStaff);
                  setIsDeleteDialogOpen(true);
                }
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              Delete Staff
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button className="bg-medical-blue" onClick={handleUpdateStaff}>Save Changes</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Staff Member Confirmation Modal */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <div className="flex items-center gap-2 text-rose-600 mb-1">
              <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <DialogTitle className="text-lg font-bold text-rose-950">Confirm Staff Deletion</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-600 pt-2 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-slate-900 font-bold">{staffToDelete?.name}</strong> (<span className="capitalize">{staffToDelete?.role?.replace(/_/g, ' ')}</span>)?
              <br /><br />
              This action will remove their employee profile, credentials, and access from the hospital database. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex items-center justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setStaffToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              onClick={handleConfirmDeleteStaff}
            >
              Yes, Delete Staff Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
