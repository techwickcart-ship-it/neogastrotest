import { useState, useEffect, ReactNode, useMemo, MouseEvent } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  User,
  Calendar, 
  FileText, 
  CreditCard, 
  FlaskConical, 
  Stethoscope, 
  Pill, 
  Baby, 
  Settings, 
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  Plus,
  Scissors,
  ClipboardList,
  Shield,
  BookOpen,
  ShieldAlert,
  Wrench,
  Trash2,
  Boxes,
  Droplet,
  Activity,
  Microscope,
  UserCheck,
  FolderArchive,
  ChevronDown,
  ChevronRight,
  Star,
  Sparkles,
  Layers,
  HeartPulse,
  SlidersHorizontal,
  AlertTriangle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Toaster } from '@/components/ui/sonner';
import { GastroPlusLogoIcon } from './components/GastroPlusLogo';

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

import Dashboard from './components/Dashboard';
import OPD from './components/OPD';
import IPD from './components/IPD';
import Maternity from './components/Maternity';
import Expenses from './components/Expenses';
import OTManagement from './components/OTManagement';
import PatientOverview from './components/PatientOverview';
import Lab from './components/Lab';
import Login from './components/Login';
import UserManual from './components/UserManual';
import Billing from './components/Billing';
import AdminSettings from './components/Settings';
import Staff from './components/Staff';
import Pharmacy from './components/Pharmacy';
import PharmacyPOS from './components/PharmacyPOS';
import ErrorBoundary from './components/ErrorBoundary';
import NursingStation from './components/NursingStation';
import EquipmentManagement from './components/EquipmentManagement';
import WasteManagement from './components/WasteManagement';
import InventoryPurchase from './components/InventoryPurchase';
import BloodBank from './components/BloodBank';
import IcuManagement from './components/IcuManagement';
import Insurance from './components/Insurance';
import EmergencyTriage from './components/EmergencyTriage';
import MRDManagement from './components/MRDManagement';
import MedicationChartMaintenance from './components/MedicationChartMaintenance';
import VisitingConsultants from './components/VisitingConsultants';
import { EndoscopyProcedureModule } from './components/EndoscopyProcedureModule';
import { RxPrintPreviewModal } from './components/RxPrintPreviewModal';
import { WhatsAppPrescriptionModal } from './components/WhatsAppPrescriptionModal';
import { ApkDownloadModal } from './components/ApkDownloadModal';
import { ReportProblemModal } from './components/ReportProblemModal';
import { Smartphone, LifeBuoy } from 'lucide-react';

import { storage, STORAGE_KEYS } from '@/lib/storage';
import { MOCK_PATIENTS, MOCK_USERS } from './mockData';
import { User as UserType } from './types';
import { supabaseService, syncOfflineDataWithSupabase } from '@/services/supabaseService';
import { hasMenuAccess, normalizeRole, isUserAdmin } from '@/utils/rbac';

export interface NavItem {
  name: string;
  icon: any;
  path: string;
  roles: string[];
  badge?: string;
}

export interface NavCategory {
  id: string;
  title: string;
  icon: any;
  items: NavItem[];
}

const navCategories: NavCategory[] = [
  {
    id: 'overview',
    title: 'Core & Overview',
    icon: LayoutDashboard,
    items: [
      { name: 'Dashboard', icon: LayoutDashboard, path: '/', roles: ['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'NURSE', 'LAB_STAFF', 'PHARMACIST', 'ACCOUNTANT', 'ACCOUNTS', 'RADIOLOGIST', 'PATHOLOGIST', 'SURGEON'] },
      { name: 'Patient 360', icon: User, path: '/patient-overview', roles: ['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'ACCOUNTANT', 'ACCOUNTS', 'PHARMACIST', 'LAB_STAFF', 'RADIOLOGIST', 'PATHOLOGIST'], badge: '360°' },
      { name: 'Emergency & Triage', icon: ShieldAlert, path: '/emergency', roles: ['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'NURSE', 'ACCOUNTANT', 'ACCOUNTS'], badge: '24/7' },
    ]
  },
  {
    id: 'outpatient',
    title: 'Outpatient Care (OPD)',
    icon: Stethoscope,
    items: [
      { name: 'OPD Management', icon: Stethoscope, path: '/opd', roles: ['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'NURSE', 'ACCOUNTANT', 'ACCOUNTS'] },
      { name: 'Endoscopy & Colonoscopy', icon: Microscope, path: '/endoscopy', roles: ['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'SURGEON', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'NURSE', 'ACCOUNTANT', 'ACCOUNTS', 'PATHOLOGIST', 'LAB_STAFF'] },
      { name: 'Visiting Consultants', icon: UserCheck, path: '/visiting-consultants', roles: ['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK'] },
    ]
  },
  {
    id: 'inpatient',
    title: 'Inpatient & OT (IPD)',
    icon: Calendar,
    items: [
      { name: 'IPD Management', icon: Calendar, path: '/ipd', roles: ['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'NURSE', 'ACCOUNTANT', 'ACCOUNTS'] },
      { name: 'ICU Management', icon: Activity, path: '/icu', roles: ['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE'] },
      { name: 'OT Management', icon: Scissors, path: '/ot', roles: ['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'SURGEON', 'NURSE', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK'] },
      { name: 'Nursing Station', icon: ClipboardList, path: '/nursing', roles: ['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE'] },
      { name: 'Medication Chart (MAR)', icon: Pill, path: '/medication-chart', roles: ['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE'], badge: 'MAR' },
      { name: 'Maternity Care', icon: Baby, path: '/maternity', roles: ['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK'] },
    ]
  },
  {
    id: 'diagnostics',
    title: 'Diagnostics & Pharmacy',
    icon: FlaskConical,
    items: [
      { name: 'Lab & Radiology', icon: FlaskConical, path: '/lab', roles: ['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'LAB_STAFF', 'ACCOUNTANT', 'ACCOUNTS', 'NURSE', 'RADIOLOGIST', 'PATHOLOGIST', 'DOCTOR', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK'] },
      { name: 'Pharmacy Store', icon: Pill, path: '/pharmacy', roles: ['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'PHARMACIST', 'ACCOUNTANT', 'ACCOUNTS', 'DOCTOR', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'NURSE'], badge: 'POS' },
      { name: 'Blood Bank', icon: Droplet, path: '/bloodbank', roles: ['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'LAB_STAFF', 'PATHOLOGIST'] },
    ]
  },
  {
    id: 'finance',
    title: 'Billing & Finance',
    icon: CreditCard,
    items: [
      { name: 'Billing & Accounts', icon: CreditCard, path: '/billing', roles: ['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'ACCOUNTANT', 'ACCOUNTS', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK'] },
      { name: 'Corporate & TPA', icon: Shield, path: '/insurance', roles: ['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'ACCOUNTANT', 'ACCOUNTS', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK'] },
      { name: 'Expenses Log', icon: FileText, path: '/expenses', roles: ['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'ACCOUNTANT', 'ACCOUNTS'] },
    ]
  },
  {
    id: 'operations',
    title: 'Hospital Operations',
    icon: Boxes,
    items: [
      { name: 'Inventory & Purchase', icon: Boxes, path: '/inventory', roles: ['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'PHARMACIST', 'ACCOUNTANT', 'ACCOUNTS', 'DOCTOR', 'NURSE'] },
      { name: 'Equipment Mgmt', icon: Wrench, path: '/equipment', roles: ['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'ACCOUNTANT', 'ACCOUNTS', 'LAB_STAFF'] },
      { name: 'Biomedical Waste', icon: Trash2, path: '/waste', roles: ['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'LAB_STAFF'] },
      { name: 'MRD (Medical Records)', icon: FolderArchive, path: '/mrd', roles: ['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'NURSE', 'ACCOUNTANT', 'ACCOUNTS'] },
    ]
  },
  {
    id: 'admin',
    title: 'Administration & Help',
    icon: Settings,
    items: [
      { name: 'Staff Management', icon: Users, path: '/staff', roles: ['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN'] },
      { name: 'Admin Settings', icon: Settings, path: '/settings', roles: ['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN'] },
      { name: 'User Manual & Guide', icon: BookOpen, path: '/manual', roles: ['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'NURSE', 'LAB_STAFF', 'PHARMACIST', 'ACCOUNTANT', 'ACCOUNTS', 'SURGEON', 'RADIOLOGIST', 'PATHOLOGIST'] },
    ]
  }
];

const navItems = navCategories.flatMap(c => c.items);

import { getStaffPhotoUrl } from './utils/staffPhotos';

const ROLE_PROFILES = [
  { id: 'u-admingh', name: 'Admin GH', email: 'admingh', role: 'SUPER_ADMIN', label: 'Super Admin', department: 'Administration', avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=600' },
  { id: 'u-doctor', name: 'Dr. Rajesh Sharma', email: 'doctor@hospital.com', role: 'DOCTOR', label: 'Doctor Panel', department: 'General Medicine', avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=600' },
  { id: 'u-frontdesk', name: 'Front Desk Staff', email: 'frontdesk@hospital.com', role: 'RECEPTION', label: 'Receptionist / Front Desk', department: 'Registration', avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=600' },
  { id: 'u-nurse', name: 'Nurse Head', email: 'nurse@hospital.com', role: 'NURSE', label: 'Nursing Station', department: 'Nursing', avatar: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&q=80&w=600' },
  { id: 'u-pharmacy', name: 'Chief Pharmacist', email: 'pharmacy@hospital.com', role: 'PHARMACIST', label: 'Pharmacy Panel', department: 'Pharmacy', avatar: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&q=80&w=600' },
  { id: 'u-lab', name: 'Lab Technician', email: 'lab@hospital.com', role: 'LAB_STAFF', label: 'Lab & Radiology Panel', department: 'Pathology', avatar: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&q=80&w=600' },
  { id: 'u-accounts', name: 'Hospital Accountant', email: 'accounts@hospital.com', role: 'ACCOUNTANT', label: 'Accountant & Billing Panel', department: 'Finance', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=600' },
];

function ProtectedRoute({ children, allowedRoles, user }: { children: ReactNode, allowedRoles: string[], user: any }) {
  if (!user) return <>{children}</>;
  
  const userRole = user.role;
  const normalizedUserRole = normalizeRole(userRole);
  const isAdmin = isUserAdmin(userRole) || ['ADMIN', 'SUPER_ADMIN', 'HOSPITAL_ADMIN'].includes(normalizedUserRole) || String(userRole || '').toUpperCase().includes('ADMIN');
  
  const hasAccess = isAdmin || allowedRoles.some(role => {
    const r = normalizeRole(role);
    return r === normalizedUserRole || role.toUpperCase() === String(userRole || '').toUpperCase();
  });

  if (!hasAccess) {
    toast.error(`Access restricted: Your current role (${String(userRole || '').replace('_', ' ')}) does not have permission for this module.`);
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function SidebarContent({ 
  onLogout, 
  user, 
  hospitalInfo, 
  onOpenApk,
  onOpenReportProblem 
}: { 
  onLogout: () => void, 
  user: UserType | null, 
  hospitalInfo: any, 
  onOpenApk?: () => void,
  onOpenReportProblem?: () => void 
}) {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [pinnedPaths, setPinnedPaths] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('hms_pinned_nav');
      return saved ? JSON.parse(saved) : ['/opd', '/billing', '/patient-overview'];
    } catch {
      return ['/opd', '/billing', '/patient-overview'];
    }
  });

  // Auto-expand category containing current active location
  useEffect(() => {
    const activeCat = navCategories.find(cat => cat.items.some(i => i.path === location.pathname));
    if (activeCat) {
      setCollapsedCategories(prev => ({ ...prev, [activeCat.id]: false }));
    }
  }, [location.pathname]);

  const toggleCategory = (catId: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  const togglePin = (path: string, e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    let updated: string[];
    if (pinnedPaths.includes(path)) {
      updated = pinnedPaths.filter(p => p !== path);
      toast.info('Removed from Quick Access');
    } else {
      updated = [...pinnedPaths, path];
      toast.success('Pinned to Quick Access!');
    }
    setPinnedPaths(updated);
    localStorage.setItem('hms_pinned_nav', JSON.stringify(updated));
  };

  // Filter categories and items based on role + search query
  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    
    return navCategories.map(cat => {
      // Filter items accessible to role
      const accessibleItems = cat.items.filter(item => {
        if (!user) return true;
        return hasMenuAccess(item.path, user.role);
      });

      // Filter by search query if any
      const matchingItems = query 
        ? accessibleItems.filter(item => item.name.toLowerCase().includes(query) || cat.title.toLowerCase().includes(query))
        : accessibleItems;

      return {
        ...cat,
        items: matchingItems,
        accessibleCount: accessibleItems.length
      };
    }).filter(cat => cat.items.length > 0);
  }, [user, searchQuery]);

  // Pinned items accessible to user
  const pinnedItems = useMemo(() => {
    return navItems.filter(item => {
      const isPinned = pinnedPaths.includes(item.path);
      const isAccessible = !user || hasMenuAccess(item.path, user.role);
      return isPinned && isAccessible;
    });
  }, [user, pinnedPaths]);

  const expandAll = () => {
    setCollapsedCategories({});
    toast.success('Expanded all menu sections');
  };

  const collapseAll = () => {
    const allCollapsed: Record<string, boolean> = {};
    navCategories.forEach(c => { allCollapsed[c.id] = true; });
    setCollapsedCategories(allCollapsed);
    toast.info('Collapsed all menu sections');
  };

  return (
    <div className="flex flex-col h-full border-r overflow-hidden select-none" style={{ backgroundColor: '#FCE3B4', borderColor: '#ebd0a2' }}>
      {/* Hospital Logo Header */}
      <div className="p-4 flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {hospitalInfo?.logo && hospitalInfo.logo !== 'null' && hospitalInfo.logo !== 'undefined' && hospitalInfo.logo.trim() !== '' ? (
            <div className="w-10 h-10 bg-white/90 rounded-xl flex items-center justify-center text-[#1A5E63] font-bold text-xl overflow-hidden shadow-sm border border-white/50 shrink-0">
              <img src={hospitalInfo.logo} alt="Logo" className="w-full h-full object-cover" />
            </div>
          ) : (
            <GastroPlusLogoIcon className="w-10 h-10 flex-shrink-0" />
          )}
          <div className="min-w-0">
            <div className="flex items-baseline font-serif tracking-tight" style={{ fontFamily: "Georgia, serif" }}>
              <span className="text-base font-extrabold text-[#1A5E63]">Neo&nbsp;</span>
              <span className="text-base font-extrabold text-[#1A5E63]">Gastro</span>
              <span className="text-base font-extrabold text-[#C59B6D]">Plus</span>
            </div>
            <p className="text-[9px] text-[#A27749] uppercase tracking-[0.2em] font-bold leading-none mt-0.5 truncate">Hospital Management</p>
          </div>
        </div>
      </div>

      <Separator className="flex-shrink-0 opacity-60 bg-[#ebd0a2]" />

      {/* Quick Search & Controls Bar */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0 space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search menu (e.g., OPD, Lab, Billing)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 bg-white/80 hover:bg-white focus:bg-white border border-[#ebd0a2] rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1A5E63]/40 transition-all shadow-inner"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')} 
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Section View Options */}
        <div className="flex items-center justify-between px-1 text-[10px] text-[#1A5E63] font-bold">
          <span className="opacity-75 uppercase tracking-wider">Navigation Menu</span>
          <div className="flex items-center gap-2">
            <button 
              onClick={expandAll}
              className="hover:underline opacity-80 hover:opacity-100 transition-opacity"
              title="Expand all sections"
            >
              Expand
            </button>
            <span className="opacity-30">•</span>
            <button 
              onClick={collapseAll}
              className="hover:underline opacity-80 hover:opacity-100 transition-opacity"
              title="Collapse all sections"
            >
              Collapse
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Links Scroll Container */}
      <div className="flex-1 overflow-y-auto px-3 py-1 custom-scrollbar space-y-3">
        {/* Pinned Quick Access Shortcuts */}
        {pinnedItems.length > 0 && !searchQuery && (
          <div className="bg-white/40 backdrop-blur-sm rounded-xl p-2 border border-white/50 shadow-sm space-y-1">
            <div className="flex items-center justify-between px-2 py-0.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1A5E63] flex items-center gap-1.5">
                <Star className="w-3 h-3 fill-amber-400 text-amber-500" /> Quick Access
              </span>
              <span className="text-[9px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.2 rounded-full border border-amber-200">
                {pinnedItems.length} Pinned
              </span>
            </div>
            <div className="space-y-0.5 pt-1">
              {pinnedItems.map(item => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={'pinned-' + item.path}
                    to={item.path}
                    className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      isActive 
                        ? 'text-white shadow-md' 
                        : 'text-slate-800 hover:bg-white/60'
                    }`}
                    style={isActive ? { backgroundColor: '#1A5E63' } : undefined}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-[#1A5E63]'}`} />
                      <span className="truncate">{item.name}</span>
                    </div>
                    <button 
                      onClick={(e) => togglePin(item.path, e)}
                      title="Unpin shortcut"
                      className="opacity-60 hover:opacity-100 p-0.5 transition-opacity"
                    >
                      <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                    </button>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Categorized Modules List */}
        {filteredCategories.length === 0 ? (
          <div className="text-center py-6 px-4 bg-white/30 rounded-xl border border-dashed border-[#ebd0a2]">
            <Search className="w-6 h-6 text-[#1A5E63]/40 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">No matching modules found</p>
            <p className="text-[10px] text-slate-500 mt-1">Try clearing your search query</p>
          </div>
        ) : (
          filteredCategories.map(cat => {
            const isCollapsed = !searchQuery && collapsedCategories[cat.id];
            const CatIcon = cat.icon;
            const hasActiveChild = cat.items.some(i => location.pathname === i.path);

            return (
              <div key={cat.id} className="space-y-1">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[#1A5E63] hover:bg-white/40 transition-colors text-left group ${
                    hasActiveChild ? 'bg-white/30 font-bold' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`p-1 rounded-md transition-colors ${hasActiveChild ? 'bg-[#1A5E63] text-white' : 'bg-white/60 text-[#1A5E63] group-hover:bg-[#1A5E63] group-hover:text-white'}`}>
                      <CatIcon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold truncate text-slate-900 tracking-tight">{cat.title}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-extrabold bg-[#1A5E63]/10 text-[#1A5E63] px-1.5 py-0.2 rounded-full">
                      {cat.items.length}
                    </span>
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </div>
                </button>

                {/* Category Items */}
                {!isCollapsed && (
                  <div className="pl-2 space-y-0.5 border-l-2 border-[#1A5E63]/20 ml-3.5 pt-0.5">
                    {cat.items.map(item => {
                      const isActive = location.pathname === item.path;
                      const Icon = item.icon;
                      const isPinned = pinnedPaths.includes(item.path);

                      return (
                        <Link
                          key={item.name}
                          to={item.path}
                          className={`group flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            isActive 
                              ? 'text-white shadow-sm font-bold scale-[1.01]' 
                              : 'text-slate-800 hover:bg-white/50 hover:text-slate-950'
                          }`}
                          style={isActive ? { backgroundColor: '#1A5E63' } : undefined}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-[#1A5E63]'}`} />
                            <span className="truncate">{item.name}</span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {item.badge && (
                              <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                                isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}>
                                {item.badge}
                              </span>
                            )}
                            <button
                              onClick={(e) => togglePin(item.path, e)}
                              title={isPinned ? 'Unpin from Quick Access' : 'Pin to Quick Access'}
                              className={`p-0.5 transition-opacity ${
                                isPinned 
                                  ? 'opacity-100' 
                                  : 'opacity-0 group-hover:opacity-60 hover:!opacity-100'
                              }`}
                            >
                              <Star className={`w-3 h-3 ${isPinned ? 'fill-amber-400 text-amber-500' : isActive ? 'text-white' : 'text-slate-400'}`} />
                            </button>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* User Footer Profile */}
      <div className="p-3 mt-auto flex-shrink-0 border-t" style={{ backgroundColor: '#FCE3B4', borderColor: '#ebd0a2' }}>
        <div className="bg-white/60 backdrop-blur-md rounded-xl p-3 border border-white/50 shadow-sm">
          <div className="flex items-center gap-2.5 mb-2">
            <Avatar className="w-9 h-9 border-2 border-white shadow-sm shrink-0">
              <AvatarImage src={getStaffPhotoUrl(user)} />
              <AvatarFallback>{(user?.name || "AG").substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="overflow-hidden min-w-0">
              <p className="text-xs font-extrabold truncate text-slate-900">{user?.name || "Dr. Anjali Gupta"}</p>
              <p className="text-[9px] text-slate-700 uppercase font-black tracking-wider truncate">{(user?.role || "SUPER_ADMIN").replace('_', ' ')}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 mb-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenApk}
              className="w-full justify-center gap-1 text-[11px] h-7.5 bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-950 font-bold px-1.5 rounded-lg"
              title="Download Android APK"
            >
              <Smartphone className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span className="truncate">Mobile APK</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenReportProblem}
              className="w-full justify-center gap-1 text-[11px] h-7.5 bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-800 font-bold px-1.5 rounded-lg"
              title="Report a Problem / Bug"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span className="truncate">Report Issue</span>
            </Button>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start gap-2 text-xs h-7.5 text-red-600 hover:text-red-700 hover:bg-red-500/10 font-bold px-2 rounded-lg"
            onClick={onLogout}
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout Account
          </Button>
        </div>
      </div>
    </div>
  );
}


function GlobalHeaderSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadPatients = async () => {
      try {
        const data = await supabaseService.getPatients();
        if (data) setPatients(data);
      } catch (err) {
        console.warn('Failed to fetch patients for headers:', err);
      }
    };
    loadPatients();
  }, []);

  const handleSearchChange = (val: string) => {
    setQuery(val);
    if (val.trim() === '') {
      setResults([]);
      return;
    }
    const filtered = patients.filter((p: any) => 
      (p.name || '').toLowerCase().includes(val.toLowerCase()) ||
      (p.mrn || '').toLowerCase().includes(val.toLowerCase()) ||
      (p.phone || '').includes(val)
    );
    setResults(filtered.slice(0, 5));
  };

  const handleResultClick = (patientId: string) => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
    navigate(`/patient-overview?id=${patientId}`);
  };

  return (
    <div className="relative w-64 lg:w-96">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
      <input 
        type="text" 
        placeholder="Search patients, MRN, or phone..." 
        className="w-full pl-10 pr-4 py-2 bg-white/90 border border-transparent rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#1A5E63]/30 transition-all font-semibold text-slate-800 placeholder-slate-400"
        value={query}
        onChange={(e) => handleSearchChange(e.target.value)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
      />
      
      {isOpen && results.length > 0 && (
        <div className="absolute top-12 left-0 w-full bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 max-h-[280px] overflow-y-auto">
          {results.map((p) => (
            <div 
              key={p.id}
              onClick={() => handleResultClick(p.id)}
              className="px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-bold text-slate-800">{p.name}</p>
                <p className="text-[9px] text-slate-400 mt-0.5">Phone: {p.phone || 'N/A'} • MRN: {p.mrn}</p>
              </div>
              <span className="text-[9px] bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded-full uppercase scale-90 shrink-0">
                {p.registration_type || 'Patient'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuickRegisterForm({ currentUser }: { currentUser: UserType | null }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    age: '',
    gender: 'male',
    facility: 'OPD',
    doctor: 'Dr. Rajesh Sharma'
  });
  const [isRegistering, setIsRegistering] = useState(false);

  const availableDoctors = useMemo(() => {
    const defaultList = [
      { id: 'doc-1', name: 'Dr. Rajesh Sharma', department: 'Cardiology' },
      { id: 'doc-2', name: 'Dr. Priya Patel', department: 'Pediatrics' },
      { id: 'doc-3', name: 'Dr. Amit Verma', department: 'Orthopedics' },
      { id: 'doc-4', name: 'Dr. Sneha Reddy', department: 'Gynecology' },
      { id: 'doc-5', name: 'Dr. Vikram Malhotra', department: 'General Medicine' }
    ];
    try {
      const storedUsers = storage.get(STORAGE_KEYS.USERS, []);
      const docUsers = (storedUsers || []).filter((u: any) => 
        u.role?.toUpperCase() === 'DOCTOR' || 
        u.role?.toUpperCase() === 'SURGEON' || 
        (u.name && u.name.toLowerCase().includes('dr.'))
      );
      if (docUsers.length > 0) return docUsers;
    } catch {}
    return defaultList;
  }, []);

  const duplicateMatch = useMemo(() => {
    const trimmedName = (formData.name || '').trim().toLowerCase();
    const trimmedPhone = (formData.phone || '').trim().replace(/\D/g, '');
    if (!trimmedName && !trimmedPhone) return null;
    
    const existingPatients = storage.get(STORAGE_KEYS.PATIENTS, []);
    return existingPatients.find((p: any) => {
      const pName = (p.name || '').trim().toLowerCase();
      const pPhone = (p.phone || p.mobile || '').trim().replace(/\D/g, '');
      const nameMatch = trimmedName && pName && pName === trimmedName;
      const phoneMatch = trimmedPhone && trimmedPhone.length >= 10 && pPhone === trimmedPhone;
      return nameMatch || phoneMatch;
    }) || null;
  }, [formData.name, formData.phone]);

  const handleRegister = async () => {

    if (!formData.name || !formData.phone) {
      toast.error('Please fill in required fields');
      return;
    }

    if (isRegistering) return;

    // Duplicate check
    const existingPatients = storage.get(STORAGE_KEYS.PATIENTS, []);
    const trimmedNewName = (formData.name || '').trim().toLowerCase();
    const trimmedNewPhone = (formData.phone || '').trim().replace(/\D/g, '');

    const isDuplicate = existingPatients.some((p: any) => {
      const pName = (p.name || '').trim().toLowerCase();
      const pPhone = (p.phone || p.mobile || '').trim().replace(/\D/g, '');

      const nameMatches = pName === trimmedNewName;
      const phoneMatches = trimmedNewPhone && pPhone && (trimmedNewPhone === pPhone);

      if (nameMatches && phoneMatches) return true;
      if (trimmedNewPhone && trimmedNewPhone.length >= 10 && pPhone === trimmedNewPhone) return true;
      if (nameMatches && !trimmedNewPhone && !pPhone) return true;
      return false;
    });

    if (isDuplicate) {
      toast.warning('A patient with this Name and/or Phone Number is already registered!');
      return;
    }

    setIsRegistering(true);
    const mrn = `MRN${Math.floor(Math.random() * 90000) + 10000}`;
    
    let registration_type = 'OPD';
    let status = 'Active';
    let needsAdmission = false;

    if (formData.facility === 'Lab') registration_type = 'Quick-Lab';
    else if (formData.facility === 'Pharmacy') registration_type = 'Quick-Pharmacy';
    else if (formData.facility === 'Radiology') registration_type = 'Quick-Radiology';
    else if (formData.facility === 'OPD') registration_type = 'OPD';
    else if (formData.facility === 'IPD') {
      registration_type = 'IPD';
      status = 'Admitting';
      needsAdmission = true;
    } else if (formData.facility === 'Emergency') {
      registration_type = 'Emergency';
      status = 'Admitting';
      needsAdmission = true;
    }

    const patientToAdd = {
      name: formData.name,
      phone: formData.phone,
      age: Number(formData.age) || 0,
      gender: formData.gender,
      mrn,
      status,
      needsAdmission,
      needs_admission: needsAdmission,
      registration_type
    };

    try {
      // 1. Save patient inside Supabase DB
      const result = await supabaseService.createPatient(patientToAdd);
      
      if (result) {
        // Save patient into the separate Quick Registration database table
        await supabaseService.createQuickRegistration({
          mrn,
          name: formData.name,
          phone: formData.phone,
          age: Number(formData.age) || 0,
          gender: formData.gender,
          facility: formData.facility,
          status: 'Active'
        });

        // 2. If OPD Consultation chosen, book consultation and registration fee invoice
        if (formData.facility === 'OPD') {
          const appointmentDate = new Date().toISOString().split('T')[0];
          const appointmentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) || '10:00 AM';
          
          // Load custom OPD Charges settings from local storage
          const opdCharges = storage.get(STORAGE_KEYS.OPD_CHARGES, {
            reg: 200,
            appt: 200,
            consult: 500
          });

          const selectedDoctorName = formData.doctor || availableDoctors[0]?.name || 'Dr. Rajesh Sharma';
          const matchedDoc = availableDoctors.find((d: any) => d.name === selectedDoctorName || d.id === selectedDoctorName);
          const docId = matchedDoc ? matchedDoc.id : null;

          const appointmentSynced = await supabaseService.createAppointment({
            patient_id: result.id,
            patientName: result.name,
            patientMrn: result.mrn || mrn,
            doctor_id: docId,
            doctor: selectedDoctorName,
            doctorName: selectedDoctorName,
            type: 'OPD',
            appointment_date: appointmentDate,
            appointment_time: appointmentTime,
            status: 'Scheduled',
            urgency: 'Routine',
            fee: opdCharges.consult // Dynamic fee directly saved on appointment
          });

          if (appointmentSynced) {
            // Save inside the separate Live Queue database table
            await supabaseService.createLiveQueueItem({
              patient_id: result.id,
              doctor_id: docId,
              appointment_id: appointmentSynced.id,
              token_number: Math.floor(Math.random() * 100) + 1,
              status: 'Waiting',
              urgency: 'Routine'
            });

            const regFee = opdCharges.reg; // Dynamic registration fee
            const invoiceData = {
              patient_id: result.id,
              invoice_number: `INV-REG-${Date.now()}`,
              status: 'Unpaid',
              total_amount: regFee,
              paid_amount: 0,
              payment_method: 'Cash',
              type: 'OPD',
              created_by: currentUser?.id
            };

            const invoiceItems = [{
              item_name: 'OPD Registration Fee',
              item_type: 'Consultation',
              quantity: 1,
              unit_price: regFee,
              total_price: regFee
            }];

            await supabaseService.createInvoice(invoiceData, invoiceItems);
          }
        }

        // Trigger real-time sync custom event so any active OPD or components refetch immediately
        window.dispatchEvent(new CustomEvent('supabase-data-sync', { 
          detail: { table: 'patients', action: 'insert' } 
        }));

        toast.success(`Patient registered successfully for ${formData.facility}! MRN: ${mrn}`);
        setFormData({ name: '', phone: '', age: '', gender: 'male', facility: 'OPD', doctor: 'Dr. Rajesh Sharma' });
      } else {
        toast.error('Failed to register patient in database');
      }
    } catch (err: any) {
      console.error('Error in handleRegister:', err);
      toast.error('Failed to register brand new patient due to database error.');
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="space-y-4 py-4">
      {duplicateMatch && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 flex items-start gap-2.5 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold text-amber-950">⚠️ Duplicate Patient Detected</p>
            <p className="text-amber-800">
              A patient named <span className="font-bold">"{duplicateMatch.name}"</span> is already registered in the hospital system.
            </p>
            <p className="text-[11px] text-amber-700 font-medium">
              Registered MRN: <span className="font-bold">{duplicateMatch.mrn || 'N/A'}</span> • Phone: <span className="font-bold">{duplicateMatch.phone || 'N/A'}</span>
            </p>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">

        <div className="space-y-2">
          <Label htmlFor="header-name">Full Name *</Label>
          <Input 
            id="header-name" 
            placeholder="Enter patient name" 
            value={formData.name}
            disabled={isRegistering}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="header-phone">Phone Number *</Label>
          <Input 
            id="header-phone" 
            placeholder="Enter phone number" 
            disabled={isRegistering}
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="header-age">Age</Label>
          <Input 
            id="header-age" 
            type="number" 
            placeholder="Age" 
            disabled={isRegistering}
            value={formData.age}
            onChange={(e) => setFormData({...formData, age: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="header-gender">Gender</Label>
          <Select 
            value={formData.gender}
            disabled={isRegistering}
            onValueChange={(v) => setFormData({...formData, gender: v})}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="header-facility">Facility / Purpose</Label>
          <Select 
            value={formData.facility}
            disabled={isRegistering}
            onValueChange={(v) => setFormData({...formData, facility: v})}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select facility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OPD">OPD Consultation</SelectItem>
              <SelectItem value="IPD">IPD Inpatient Admission</SelectItem>
              <SelectItem value="Emergency">Emergency</SelectItem>
              <SelectItem value="Pharmacy">Pharmacy / Medicine</SelectItem>
              <SelectItem value="Lab">Laboratory / Blood Test</SelectItem>
              <SelectItem value="Radiology">Radiology / X-Ray</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {formData.facility === 'OPD' && (
          <div className="space-y-2">
            <Label htmlFor="header-doctor">Attending Doctor</Label>
            <Select 
              value={formData.doctor}
              disabled={isRegistering}
              onValueChange={(v) => setFormData({...formData, doctor: v})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select doctor" />
              </SelectTrigger>
              <SelectContent>
                {availableDoctors.map((doc: any) => (
                  <SelectItem key={doc.id || doc.name} value={doc.name}>
                    {doc.name} {doc.department ? `(${doc.department})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" disabled={isRegistering} onClick={() => setFormData({ name: '', phone: '', age: '', gender: 'male', facility: 'OPD', doctor: 'Dr. Rajesh Sharma' })}>Reset</Button>
        <Button className="bg-medical-blue" disabled={isRegistering} onClick={handleRegister}>
          {isRegistering ? 'Registering...' : 'Confirm Registration'}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function App() {
  const [hospitalInfo, setHospitalInfo] = useState(() => storage.get(STORAGE_KEYS.HOSPITAL_INFO, {
    name: 'Gastro Plus Hospital',
    address: 'Plot No. 7 & 8, Om Shiv Nagar, Gufa Mandir Road, Lal Ghati Bhopal, 462030, Madhya Pradesh',
    gst: '23AAAAA0000A1Z5',
    phone: '9109102145/9109101246',
    email: 'gatroplusbhopal@gmail.com',
    logo: null as string | null
  }) || {
    name: 'Gastro Plus Hospital',
    address: 'Plot No. 7 & 8, Om Shiv Nagar, Gufa Mandir Road, Lal Ghati Bhopal, 462030, Madhya Pradesh',
    gst: '23AAAAA0000A1Z5',
    phone: '9109102145/9109101246',
    email: 'gatroplusbhopal@gmail.com',
    logo: null
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<UserType | null>(() => {
    const isAuth = Boolean(storage.get<boolean>(STORAGE_KEYS.AUTH_STATUS, false));
    if (!isAuth) return null;
    const saved = storage.get<UserType | null>(STORAGE_KEYS.SESSION_USER, null);
    return saved || null;
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const auth = Boolean(storage.get<boolean>(STORAGE_KEYS.AUTH_STATUS, false));
    const saved = storage.get<UserType | null>(STORAGE_KEYS.SESSION_USER, null);
    return auth && !!saved;
  });

  const handleLogin = (userData: UserType) => {
    storage.set(STORAGE_KEYS.AUTH_STATUS, true);
    storage.set(STORAGE_KEYS.SESSION_USER, userData);
    setUser(userData);
    setIsAuthenticated(true);
  };

  useEffect(() => {
    const handleStorage = (event?: StorageEvent) => {
      // ONLY respond to specific auth and hospital keys! Never reset on general events
      if (event && event.key) {
        if (event.key === STORAGE_KEYS.SESSION_USER) {
          const savedUser = storage.get(STORAGE_KEYS.SESSION_USER, null);
          if (savedUser) {
            setUser((prev: any) => JSON.stringify(prev) !== JSON.stringify(savedUser) ? savedUser : prev);
          } else {
            setUser(null);
            setIsAuthenticated(false);
          }
        } else if (event.key === STORAGE_KEYS.AUTH_STATUS) {
          const auth = Boolean(storage.get<boolean>(STORAGE_KEYS.AUTH_STATUS, false));
          setIsAuthenticated(auth);
          if (!auth) setUser(null);
        } else if (event.key === STORAGE_KEYS.HOSPITAL_INFO) {
          const savedHospital = storage.get(STORAGE_KEYS.HOSPITAL_INFO, null);
          if (savedHospital) setHospitalInfo((prev: any) => JSON.stringify(prev) !== JSON.stringify(savedHospital) ? savedHospital : prev);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);


  // Load hospital info and perform automatic offline sync on startup
  useEffect(() => {
    // Ensure hospital info is updated to Gastro Plus Hospital, Bhopal address, email and phone numbers
    try {
      const currentHosp = storage.get(STORAGE_KEYS.HOSPITAL_INFO, null);
      if (!currentHosp || !currentHosp.address?.includes('Plot No. 7 & 8') || currentHosp.email !== 'gatroplusbhopal@gmail.com' || !currentHosp.phone?.includes('9109102145') || currentHosp.name?.toUpperCase().includes('NEO GASTRO')) {
        const updatedHosp = {
          name: 'Gastro Plus Hospital',
          address: 'Plot No. 7 & 8, Om Shiv Nagar, Gufa Mandir Road, Lal Ghati Bhopal, 462030, Madhya Pradesh',
          gst: currentHosp?.gst || '23AAAAA0000A1Z5',
          phone: '9109102145/9109101246',
          email: 'gatroplusbhopal@gmail.com',
          website: 'www.gastroplusbhopal.com',
          logo: currentHosp?.logo || null
        };
        storage.set(STORAGE_KEYS.HOSPITAL_INFO, updatedHosp);
        setHospitalInfo(updatedHosp);
      }
    } catch (err) {
      console.warn('Error upgrading hospital info in storage:', err);
    }

    // One-time complete purge of all preloaded mock/demo data to start fresh with empty entries
    try {
      const clearedKey = 'hms_database_cleared_v2';
      if (!localStorage.getItem(clearedKey)) {
        const keysToClear = [
          STORAGE_KEYS.PATIENTS,
          STORAGE_KEYS.APPOINTMENTS,
          STORAGE_KEYS.BILLING,
          STORAGE_KEYS.LAB_BILLS,
          STORAGE_KEYS.NURSING_TASKS,
          STORAGE_KEYS.PHARMACY_BILLS,
          STORAGE_KEYS.PRESCRIPTIONS,
          STORAGE_KEYS.LAB_TEST_ORDERS,
          STORAGE_KEYS.EXTERNAL_REPORTS,
          STORAGE_KEYS.RADIOLOGY_FILES,
          STORAGE_KEYS.PATIENT_VITALS,
          'hms_admissions',
          'hms_discharge_summaries',
          'hms_clinical_notes',
          'hms_live_queue',
          'hms_quick_registrations',
          'hms_lis_bookings',
          'hms_lis_doctors',
          'hms_lis_franchises',
          'hms_ot_schedules'
        ];
        keysToClear.forEach(key => {
          localStorage.removeItem(key);
        });
        localStorage.setItem(clearedKey, 'true');
        console.log('Successfully completed one-time clean database purge.');
      }
    } catch (err) {
      console.warn('Error during one-time database purge:', err);
    }

    const initializeDatabase = async () => {
      try {
        // Fetch hospital info
        const dbHospitalInfo = await supabaseService.getHospitalInfo();
        if (dbHospitalInfo) {
          storage.set(STORAGE_KEYS.HOSPITAL_INFO, dbHospitalInfo);
          setHospitalInfo(dbHospitalInfo);
        }
      } catch (err) {
        console.warn('Could not fetch hospital info from database:', err);
      }

      // Check offline records and sync them automatically!
      try {
        const patients = storage.get(STORAGE_KEYS.PATIENTS, []);
        const offlinePatients = Array.isArray(patients) ? patients.filter((p: any) => p && p.id && String(p.id).startsWith('off-')) : [];
        const appointments = storage.get(STORAGE_KEYS.APPOINTMENTS, []);
        const offlineAppointments = Array.isArray(appointments) ? appointments.filter((a: any) => a && a.id && String(a.id).startsWith('off-')) : [];
        const admissions = storage.get('hms_admissions', []);
        const offlineAdmissions = Array.isArray(admissions) ? admissions.filter((ad: any) => ad && ad.id && String(ad.id).startsWith('off-')) : [];
        const prescriptions = storage.get(STORAGE_KEYS.PRESCRIPTIONS, []);
        const offlinePrescriptions = Array.isArray(prescriptions) ? prescriptions.filter((rx: any) => rx && rx.id && String(rx.id).startsWith('off-')) : [];
        const bills = storage.get(STORAGE_KEYS.BILLING, []);
        const offlineInvoices = Array.isArray(bills) ? bills.filter((b: any) => b && b.id && String(b.id).startsWith('off-')) : [];
        const expenses = storage.get(STORAGE_KEYS.EXPENSES, []);
        const offlineExpenses = Array.isArray(expenses) ? expenses.filter((e: any) => e && e.id && String(e.id).startsWith('off-')) : [];
        
        const hasOfflineData = (
          offlinePatients.length > 0 || 
          offlineAppointments.length > 0 || 
          offlineAdmissions.length > 0 || 
          offlinePrescriptions.length > 0 ||
          offlineInvoices.length > 0 ||
          offlineExpenses.length > 0
        );

        if (hasOfflineData) {
          console.log('Detected offline unsynced data. Initializing auto-sync...');
          const syncResult = await syncOfflineDataWithSupabase();
          if (syncResult && syncResult.success && syncResult.syncCount > 0) {
            console.log(`Auto-synchronized ${syncResult.syncCount} offline records to the cloud!`);
            toast.success('Offline records synchronized with live server!');
            // Dispatch sync event to refresh lists in active components
            window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { action: 'sync' } }));
          }
        }
      } catch (err) {
        console.warn('Silent auto-sync failure on load:', err);
      }
    };

    if (isAuthenticated) {
      initializeDatabase();
    }
  }, [isAuthenticated]);

  const handleLogout = () => {
    storage.remove(STORAGE_KEYS.AUTH_STATUS);
    storage.remove(STORAGE_KEYS.SESSION_USER);
    setUser(null);
    setIsAuthenticated(false);
    toast.info('Logged out successfully');
  };

  if (!isAuthenticated) {
    return (
      <>
        <Login onLogin={handleLogin} />
        <Toaster position="top-right" />
      </>
    );
  }

  return (
    <Router>
      <AppLayout 
        user={user}
        hospitalInfo={hospitalInfo}
        handleLogout={handleLogout}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        setUser={setUser}
        setHospitalInfo={setHospitalInfo}
      />
    </Router>
  );
}

function RoleQuickSwitcher({ currentUser, setUser }: { currentUser: any, setUser: (u: any) => void }) {
  const currentRoleNorm = normalizeRole(currentUser?.role);
  
  const handleSelectRole = (profileId: string) => {
    const profile = ROLE_PROFILES.find(p => p.id === profileId);
    if (profile) {
      storage.set(STORAGE_KEYS.SESSION_USER, profile);
      setUser(profile);
      toast.success(`Switched active panel to ${profile.label} (${profile.name})`);
    }
  };

  const activeProfile = ROLE_PROFILES.find(p => p.id === currentUser?.id) || 
                        ROLE_PROFILES.find(p => normalizeRole(p.role) === currentRoleNorm) || 
                        ROLE_PROFILES[0];

  return (
    <div className="flex items-center gap-2 bg-white/90 px-3 py-1 rounded-full border border-slate-300 shadow-sm">
      <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider hidden sm:inline">Active Panel:</span>
      <Select value={activeProfile.id} onValueChange={handleSelectRole}>
        <SelectTrigger className="h-7 border-none bg-transparent shadow-none text-xs font-bold text-slate-800 p-0 focus:ring-0 gap-1.5 min-w-[130px]">
          <SelectValue placeholder="Switch Panel" />
        </SelectTrigger>
        <SelectContent className="z-50">
          {ROLE_PROFILES.map((profile) => (
            <SelectItem key={profile.id} value={profile.id} className="text-xs font-semibold cursor-pointer">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">{profile.label}</span>
                <span className="text-[10px] text-slate-400">({profile.name})</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function AppLayout({ user, hospitalInfo, handleLogout, isMobileMenuOpen, setIsMobileMenuOpen, setUser, setHospitalInfo }: any) {
  const [isApkModalOpen, setIsApkModalOpen] = useState(false);
  const [isReportProblemOpen, setIsReportProblemOpen] = useState(false);

  return (
    <div className="flex h-[100dvh] bg-soft-white overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 flex-shrink-0 h-full">
        <SidebarContent 
          onLogout={handleLogout} 
          user={user} 
          hospitalInfo={hospitalInfo} 
          onOpenApk={() => setIsApkModalOpen(true)}
          onOpenReportProblem={() => setIsReportProblemOpen(true)}
        />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b flex items-center justify-between px-3 sm:px-4 lg:px-8 flex-shrink-0 z-10 shadow-sm" style={{ backgroundColor: '#8BB1DE', borderColor: '#7ca2cf' }}>
          <div className="flex items-center gap-2 sm:gap-4">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden text-slate-900 hover:bg-white/20">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 h-full border-none">
                <SidebarContent 
                  onLogout={handleLogout} 
                  user={user} 
                  hospitalInfo={hospitalInfo} 
                  onOpenApk={() => { setIsMobileMenuOpen(false); setIsApkModalOpen(true); }}
                  onOpenReportProblem={() => { setIsMobileMenuOpen(false); setIsReportProblemOpen(true); }}
                />
              </SheetContent>
            </Sheet>
            
            <div className="relative hidden md:block w-64 lg:w-96">
              <GlobalHeaderSearch />
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-4">
            {/* APK Download Button in Header */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsApkModalOpen(true)}
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 border-amber-300 font-extrabold text-xs h-8 px-2 sm:px-3 rounded-full shadow-sm gap-1 sm:gap-1.5"
              title="Download Android APK"
            >
              <Smartphone className="w-3.5 h-3.5 text-slate-950" />
              <span className="hidden sm:inline">Download</span> APK
            </Button>

            {/* Report Problem Quick Action Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsReportProblemOpen(true)}
              className="bg-white/90 hover:bg-white text-rose-700 border-rose-300 hover:border-rose-400 font-extrabold text-xs h-8 px-2 sm:px-3 rounded-full shadow-sm gap-1 sm:gap-1.5"
              title="Report an issue or bug"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden md:inline">Report</span> Issue
            </Button>

            {/* Role / Panel Switcher */}
            <RoleQuickSwitcher currentUser={user} setUser={setUser} />

            {(user?.role === 'SUPER_ADMIN' || user?.role === 'DOCTOR' || user?.role === 'RECEPTION' || user?.role === 'RECEPTIONIST' || user?.role === 'FRONT_DESK' || user?.role === 'NURSE') && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-2 rounded-full px-4 bg-white/95 border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-all font-semibold shadow-sm">
                    <Plus className="w-4 h-4" />
                    Emergency
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Quick Patient Registration</DialogTitle>
                  </DialogHeader>
                  <QuickRegisterForm currentUser={user} />
                </DialogContent>
              </Dialog>
            )}
            
            <Separator orientation="vertical" className="h-6 mx-2 hidden sm:block bg-slate-400/30" />
            
            <Button variant="ghost" size="icon" className="relative text-slate-900 hover:bg-white/20">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#8BB1DE]"></span>
            </Button>
            
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold leading-none text-slate-950">{user?.name || "User"}</p>
                <p className="text-[9px] text-slate-800 uppercase mt-1 font-black tracking-wider">{(user?.role || "SUPER_ADMIN").replace('_', ' ')}</p>
              </div>
              <Avatar className="w-8 h-8 cursor-pointer hover:ring-2 hover:ring-white/50 transition-all">
                <AvatarImage src={getStaffPhotoUrl(user)} />
                <AvatarFallback>{(user?.name || "AG").substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Viewport */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'NURSE', 'LAB_STAFF', 'PHARMACIST', 'ACCOUNTANT', 'ACCOUNTS', 'RADIOLOGIST']}><ErrorBoundary><Dashboard /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/emergency" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'NURSE', 'ACCOUNTANT', 'ACCOUNTS']}><ErrorBoundary><EmergencyTriage /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/opd" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'NURSE', 'ACCOUNTANT', 'ACCOUNTS']}><ErrorBoundary><OPD /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/endoscopy" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'SURGEON', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'NURSE', 'ACCOUNTANT', 'ACCOUNTS', 'PATHOLOGIST', 'LAB_STAFF']}><ErrorBoundary><EndoscopyProcedureModule /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/ipd" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'NURSE', 'ACCOUNTANT', 'ACCOUNTS']}><ErrorBoundary><IPD /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/maternity" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK']}><ErrorBoundary><Maternity /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/nursing" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE']}><ErrorBoundary><NursingStation /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/medication-chart" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE']}><ErrorBoundary><MedicationChartMaintenance /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/visiting-consultants" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK']}><ErrorBoundary><VisitingConsultants user={user} /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/ot" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'SURGEON', 'NURSE', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK']}><ErrorBoundary><OTManagement /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/lab" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'LAB_STAFF', 'ACCOUNTANT', 'ACCOUNTS', 'NURSE', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'RADIOLOGIST', 'PATHOLOGIST', 'DOCTOR']}><ErrorBoundary><Lab /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/patient-overview" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'SURGEON', 'NURSE', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'ACCOUNTANT', 'ACCOUNTS', 'PHARMACIST', 'LAB_STAFF', 'RADIOLOGIST', 'PATHOLOGIST']}><ErrorBoundary><PatientOverview userRole={user?.role} /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/pharmacy" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'PHARMACIST', 'ACCOUNTANT', 'ACCOUNTS', 'DOCTOR', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'NURSE']}><ErrorBoundary><Pharmacy /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/pharmacy/pos" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'PHARMACIST', 'ACCOUNTANT', 'ACCOUNTS', 'DOCTOR', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'NURSE']}><ErrorBoundary><PharmacyPOS /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/expenses" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'ACCOUNTANT', 'ACCOUNTS']}><ErrorBoundary><Expenses /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/billing" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'ACCOUNTANT', 'ACCOUNTS', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK']}><ErrorBoundary><Billing /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/insurance" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'ACCOUNTANT', 'ACCOUNTS', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK']}><ErrorBoundary><Insurance /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN']}><ErrorBoundary><AdminSettings currentUser={user} onUserUpdate={(updatedUser) => setUser(updatedUser)} onHospitalUpdate={(info) => setHospitalInfo(info)} /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/staff" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN']}><ErrorBoundary><Staff /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/equipment" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'ACCOUNTANT', 'ACCOUNTS', 'LAB_STAFF']}><ErrorBoundary><EquipmentManagement /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/waste" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'LAB_STAFF']}><ErrorBoundary><WasteManagement /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/inventory" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'PHARMACIST', 'ACCOUNTANT', 'ACCOUNTS', 'DOCTOR', 'NURSE']}><ErrorBoundary><InventoryPurchase /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/bloodbank" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'LAB_STAFF', 'PATHOLOGIST']}><ErrorBoundary><BloodBank /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/icu" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE']}><ErrorBoundary><IcuManagement /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/mrd" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'NURSE', 'ACCOUNTANT', 'ACCOUNTS']}><ErrorBoundary><MRDManagement /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/manual" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'NURSE', 'LAB_STAFF', 'PHARMACIST', 'ACCOUNTANT', 'ACCOUNTS', 'SURGEON', 'RADIOLOGIST']}><ErrorBoundary><UserManual /></ErrorBoundary></ProtectedRoute>} />
            </Routes>
          </ErrorBoundary>
        </div>
        <RxPrintPreviewModal />
        <WhatsAppPrescriptionModal />
        <ApkDownloadModal
          isOpen={isApkModalOpen}
          onClose={() => setIsApkModalOpen(false)}
          hospitalName={hospitalInfo?.name || 'Neo GastroPlus Hospital'}
        />
        <ReportProblemModal
          isOpen={isReportProblemOpen}
          onClose={() => setIsReportProblemOpen(false)}
          user={user}
        />
      </main>
    </div>
  );
}
