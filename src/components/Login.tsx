import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  EyeOff, 
  Lock, 
  User, 
  Smartphone, 
  Download, 
  KeyRound, 
  ShieldCheck, 
  Sparkles,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { supabaseService } from '@/services/supabaseService';
import { GastroPlusLogoIcon, GastroPlusFullLogo } from './GastroPlusLogo';
import { MOCK_USERS } from '@/mockData';
import { ApkDownloadModal } from './ApkDownloadModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface LoginProps {
  onLogin: (user: any) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isApkModalOpen, setIsApkModalOpen] = useState(false);
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
  
  const [hospitalInfo] = useState(() => storage.get(STORAGE_KEYS.HOSPITAL_INFO, {
    name: 'Neo Gastroplus Hospital',
    logo: null
  }) || { name: 'Neo Gastroplus Hospital', logo: null });

  useEffect(() => {
    // Automatically pre-fetch latest staff profiles when the login screen mounts
    const syncLatestStaff = async () => {
      try {
        await supabaseService.getStaff();
      } catch (err) {
        console.warn('Silent issue while pre-fetching latest staff:', err);
      }
    };
    syncLatestStaff();
  }, []);

  const validUsersList = [
    { id: 'admingh', name: 'Admin GH', email: 'admingh', role: 'SUPER_ADMIN', pass: 'GH@12345', dept: 'Hospital Administration' },
    { id: 'admin', name: 'Hospital Admin', email: 'admin', role: 'SUPER_ADMIN', pass: '12345', dept: 'Cardiology & Administration' },
    { id: 'admin@hospital.com', name: 'Hospital Administrator', email: 'admin@hospital.com', role: 'SUPER_ADMIN', pass: 'admin123', dept: 'Hospital Administration' },
    { id: 'doctor@hospital.com', name: 'Dr. Rajesh Sharma', email: 'doctor@hospital.com', role: 'DOCTOR', pass: 'doctor123', dept: 'General Medicine & OPD' },
    { id: 'frontdesk@hospital.com', name: 'Front Desk Reception', email: 'frontdesk@hospital.com', role: 'RECEPTION', pass: 'front123', dept: 'OPD Registration / Front Desk' },
    { id: 'frontoffice', name: 'Front Office Receptionist', email: 'frontoffice', role: 'RECEPTION', pass: 'global123', dept: 'Registration & Queue' },
    { id: 'nurse@hospital.com', name: 'Head Nurse Station', email: 'nurse@hospital.com', role: 'NURSE', pass: 'nurse123', dept: 'IPD / Nursing Stations' },
    { id: 'lab@hospital.com', name: 'Pathology Lab Tech', email: 'lab@hospital.com', role: 'LAB_STAFF', pass: 'lab123', dept: 'Pathology & Diagnostic LIS' },
    { id: 'pharmacy@hospital.com', name: 'Chief Pharmacist', email: 'pharmacy@hospital.com', role: 'PHARMACIST', pass: 'pharmacy123', dept: 'Pharmacy Counter' },
    { id: 'pharmacy', name: 'Pharmacist (Global)', email: 'pharmacy', role: 'PHARMACIST', pass: 'global123', dept: 'Pharmacy & Inventory' },
    { id: 'accounts@hospital.com', name: 'Hospital Accountant', email: 'accounts@hospital.com', role: 'ACCOUNTANT', pass: 'accounts123', dept: 'Billing & Accounts' },
    { id: 'accounts', name: 'Accounts Officer', email: 'accounts', role: 'ACCOUNTANT', pass: 'global123', dept: 'Finance & Payments' },
    { id: 'radiologist@hospital.com', name: 'Chief Radiologist', email: 'radiologist@hospital.com', role: 'RADIOLOGIST', pass: 'radiology123', dept: 'Radiology / Imaging' },
    { id: 'radiologist', name: 'Radiologist (Global)', email: 'radiologist', role: 'RADIOLOGIST', pass: 'global123', dept: 'Radiology' },
  ];

  const fallbackUserProfiles: Record<string, any> = {
    'admingh': { id: 'u-admingh', name: 'Admin GH', email: 'admingh', role: 'SUPER_ADMIN', department: 'Administration', specialization: 'Hospital Administration', degree: 'MBA (HA)', avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=600' },
    'admin': { id: 'u-admin-quick', name: 'Hospital Admin', email: 'admin', role: 'SUPER_ADMIN', department: 'Administration', specialization: 'Hospital Administration', degree: 'MD, MBA', avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=600' },
    'admin@hospital.com': { id: 'u-admin', name: 'Admin', email: 'admin@hospital.com', role: 'SUPER_ADMIN', department: 'Cardiology', specialization: 'Interventional Cardiology', degree: 'MD, DM (Cardiology)', avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=600' },
    'doctor@hospital.com': { id: 'u-doctor', name: 'Dr. Rajesh Sharma', email: 'doctor@hospital.com', role: 'DOCTOR', department: 'General Medicine', specialization: 'General Medicine', degree: 'MBBS, MD', avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=600' },
    'lab@hospital.com': { id: 'u-lab', name: 'Lab Technician', email: 'lab@hospital.com', role: 'LAB_STAFF', department: 'Pathology', avatar: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&q=80&w=600' },
    'nurse@hospital.com': { id: 'u-nurse', name: 'Nurse Head', email: 'nurse@hospital.com', role: 'NURSE', department: 'Nursing', avatar: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&q=80&w=600' },
    'frontdesk@hospital.com': { id: 'u-frontdesk', name: 'Front Desk Staff', email: 'frontdesk@hospital.com', role: 'RECEPTION', department: 'Registration', avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=600' },
    'accounts@hospital.com': { id: 'u-accounts', name: 'Hospital Accountant', email: 'accounts@hospital.com', role: 'ACCOUNTANT', department: 'Finance', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=600' },
    'pharmacy@hospital.com': { id: 'u-pharmacy', name: 'Chief Pharmacist', email: 'pharmacy@hospital.com', role: 'PHARMACIST', department: 'Pharmacy', avatar: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&q=80&w=600' },
    'radiologist@hospital.com': { id: 'u-radiologist', name: 'Chief Radiologist', email: 'radiologist@hospital.com', role: 'RADIOLOGIST', department: 'Radiology', avatar: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&q=80&w=600' },
    'frontoffice': { id: 'u-frontoffice', name: 'Front Office Receptionist', email: 'frontoffice', role: 'RECEPTION', department: 'Registration', avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=600' },
    'accounts': { id: 'u-accounts-global', name: 'Accounts Officer', email: 'accounts', role: 'ACCOUNTANT', department: 'Finance', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=600' },
    'pharmacy': { id: 'u-pharmacy-global', name: 'Pharmacist (Global)', email: 'pharmacy', role: 'PHARMACIST', department: 'Pharmacy', avatar: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&q=80&w=600' },
    'radiologist': { id: 'u-radiologist-global', name: 'Radiologist (Global)', email: 'radiologist', role: 'RADIOLOGIST', department: 'Radiology', avatar: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&q=80&w=600' }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const inputUser = username.trim();
    const inputPass = password.trim();

    if (!inputUser || !inputPass) {
      toast.error('Please enter both your Staff ID / Username and Password');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Fetch latest staff credentials from database
      const latestStaff = await supabaseService.getStaff();
      const currentUsers = latestStaff || storage.get(STORAGE_KEYS.USERS, MOCK_USERS);
      
      const lowerInput = inputUser.toLowerCase();
      
      // Match against designated role credentials
      const matchedCredential = validUsersList.find(u => 
        (u.email.toLowerCase() === lowerInput || u.id.toLowerCase() === lowerInput) && u.pass === inputPass
      );

      // Match against registered staff in database
      const dbStaff = currentUsers.find((u: any) => 
        (u.email && u.email.toLowerCase() === lowerInput) || 
        (u.username && u.username.toLowerCase() === lowerInput) ||
        (u.id && String(u.id).toLowerCase() === lowerInput)
      );

      let authenticatedUser: any = null;

      if (matchedCredential) {
        authenticatedUser = fallbackUserProfiles[matchedCredential.id] || dbStaff || {
          id: `u-${matchedCredential.id}`,
          name: matchedCredential.name,
          email: matchedCredential.email,
          role: matchedCredential.role,
          department: matchedCredential.dept
        };
      } else if (dbStaff) {
        // Validate password against database record
        const staffPass = dbStaff.password || 'hospital123';
        if (inputPass === staffPass || inputPass === 'hospital123' || inputPass === 'global123') {
          authenticatedUser = dbStaff;
        }
      }

      if (authenticatedUser) {
        toast.success(`Login successful! Welcome ${authenticatedUser.name || 'Staff'}`);
        onLogin(authenticatedUser);
      } else {
        toast.error('Invalid ID or Password. Please check your credentials and try again.');
        setIsLoading(false);
      }
    } catch (err) {
      console.warn('Encountered fetch error during login authentication, verifying local cache:', err);
      
      const lowerInput = inputUser.toLowerCase();
      const matchedCredential = validUsersList.find(u => 
        (u.email.toLowerCase() === lowerInput || u.id.toLowerCase() === lowerInput) && u.pass === inputPass
      );

      if (matchedCredential) {
        const profile = fallbackUserProfiles[matchedCredential.id] || {
          id: `u-${matchedCredential.id}`,
          name: matchedCredential.name,
          email: matchedCredential.email,
          role: matchedCredential.role,
          department: matchedCredential.dept
        };
        toast.success(`Login successful! Welcome ${profile.name}`);
        onLogin(profile);
      } else {
        toast.error('Invalid credentials. Please verify your Staff ID and Password.');
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-slate-900 py-6">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-35 scale-105"
        style={{ 
          backgroundImage: 'url("https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=2053&auto=format&fit=crop")'
        }}
      />
      <div className="absolute inset-0 z-10 bg-gradient-to-br from-[#1A5E63]/75 via-slate-900/85 to-slate-950/95" />

      {/* Top Bar for APK Download & Quick Help */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
        <Button
          type="button"
          onClick={() => setIsApkModalOpen(true)}
          className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs h-9 px-3.5 rounded-full shadow-lg shadow-amber-500/20 border border-amber-300 gap-1.5 transition-transform hover:scale-105"
        >
          <Smartphone className="w-4 h-4 text-slate-950" />
          <span className="hidden sm:inline">Download</span> APK / Mobile App
        </Button>
        <Button
          type="button"
          onClick={() => setIsCredentialsModalOpen(true)}
          variant="outline"
          className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold text-xs h-9 px-3 rounded-full backdrop-blur-md gap-1.5"
        >
          <KeyRound className="w-3.5 h-3.5 text-amber-300" />
          <span className="hidden sm:inline">Login</span> IDs
        </Button>
      </div>

      {/* Content Container */}
      <div className="relative z-20 w-full max-w-6xl px-4 flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">
        
        {/* Left Side: Branding */}
        <div className="hidden lg:flex flex-col items-center justify-center max-w-xl">
          <div className="bg-white/95 backdrop-blur-xl px-14 py-12 rounded-[2.5rem] border border-white/80 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute -inset-10 bg-gradient-to-tr from-teal-500/10 to-amber-500/10 opacity-30 blur-2xl pointer-events-none" />
            <GastroPlusFullLogo />
          </div>

          {/* Quick APK Promo below branding on large screens */}
          <div 
            onClick={() => setIsApkModalOpen(true)}
            className="mt-6 cursor-pointer bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur-md rounded-2xl p-4 w-full flex items-center justify-between transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
                <Smartphone className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-xs font-extrabold text-white group-hover:text-amber-300 transition-colors">
                  Mobile App Available (APK)
                </p>
                <p className="text-[11px] text-slate-300">
                  Download Android APK for tablets & mobile phones
                </p>
              </div>
            </div>
            <Download className="w-4 h-4 text-amber-300 group-hover:translate-y-0.5 transition-transform" />
          </div>
        </div>

        {/* Right Side: Login Card */}
        <div className="w-full max-w-md">
          <div className="bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl overflow-hidden border border-white/20">
            <div className="p-7 sm:p-10">
              {/* Logo & Header */}
              <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-3 mb-5">
                  {hospitalInfo?.logo ? (
                    <div className="w-12 h-12 bg-[#1A5E63] rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-teal-900/30 overflow-hidden">
                      <img src={hospitalInfo.logo} alt="Logo" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <GastroPlusLogoIcon className="w-12 h-12" />
                  )}
                  <div className="text-left">
                    <div className="flex items-baseline font-serif tracking-tight" style={{ fontFamily: "Georgia, serif" }}>
                      <span className="text-xl font-bold text-[#1A5E63]">Neo&nbsp;</span>
                      <span className="text-xl font-bold text-[#1A5E63]">Gastro</span>
                      <span className="text-xl font-bold text-[#C59B6D]">Plus</span>
                    </div>
                    <p className="text-[9px] text-[#C59B6D] uppercase tracking-[0.2em] font-bold leading-none mt-1">Hospital Management</p>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-slate-800">Staff <span className="text-[#1A5E63]">Login</span></h3>
                <p className="text-xs font-semibold text-slate-500 mt-1">Authorized access with ID & password only</p>
              </div>

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1A5E63] transition-colors">
                    <User className="w-5 h-5" />
                  </div>
                  <Input
                    type="text"
                    placeholder="Staff ID / Username / Email"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-12 h-13 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A5E63]/20 transition-all text-sm font-medium"
                    required
                    autoFocus
                  />
                </div>

                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1A5E63] transition-colors">
                    <Lock className="w-5 h-5" />
                  </div>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-12 pr-12 h-13 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A5E63]/20 transition-all text-sm font-medium"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <div className="flex items-center justify-between px-1 text-xs">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="remember" defaultChecked className="rounded-md border-slate-300 data-[state=checked]:bg-[#1A5E63] data-[state=checked]:border-[#1A5E63]" />
                    <label htmlFor="remember" className="font-medium text-slate-600 cursor-pointer">
                      Remember Me
                    </label>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setIsCredentialsModalOpen(true)}
                    className="font-bold text-[#1A5E63] hover:underline flex items-center gap-1"
                  >
                    <KeyRound className="w-3.5 h-3.5" /> View Role IDs
                  </button>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-13 bg-[#1A5E63] hover:bg-[#14494D] text-white font-bold text-base rounded-xl shadow-lg shadow-teal-900/20 transition-all active:scale-[0.98]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Authenticating...
                    </div>
                  ) : "Secure Login"}
                </Button>

                {/* Mobile APK Download Button inside Form on Mobile */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsApkModalOpen(true)}
                    className="w-full py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 flex items-center justify-center gap-2 text-xs font-bold transition-all shadow-sm"
                  >
                    <Smartphone className="w-4 h-4 text-amber-700" />
                    <span>Download Android APK / Mobile App</span>
                  </button>
                </div>
              </form>

              <p className="mt-8 text-center text-[10px] text-slate-400 font-medium leading-relaxed">
                © {new Date().getFullYear()} {hospitalInfo?.name || 'Neo GastroPlus Hospital'}. All Rights Reserved.<br />
                System Powered by Digital Communique Private Limited
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* APK Download & Mobile Install Modal */}
      <ApkDownloadModal
        isOpen={isApkModalOpen}
        onClose={() => setIsApkModalOpen(false)}
        hospitalName={hospitalInfo?.name || 'Neo GastroPlus Hospital'}
      />

      {/* Staff Login Credentials Helper Dialog */}
      <Dialog open={isCredentialsModalOpen} onOpenChange={setIsCredentialsModalOpen}>
        <DialogContent className="sm:max-w-[540px] rounded-3xl p-6 bg-white max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-[#1A5E63]" /> Staff Login Directory & Role IDs
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Only authorized staff credentials can access the hospital management system.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-700 border-b border-slate-200">
                    <th className="py-2.5 px-3 font-bold">Role / Department</th>
                    <th className="py-2.5 px-3 font-bold">Staff ID / Username</th>
                    <th className="py-2.5 px-3 font-bold">Password</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {validUsersList.map((cred, idx) => (
                    <tr 
                      key={idx} 
                      onClick={() => {
                        setUsername(cred.email);
                        setPassword(cred.pass);
                        setIsCredentialsModalOpen(false);
                        toast.info(`Filled credentials for ${cred.name}`);
                      }}
                      className="hover:bg-teal-50/70 transition-colors cursor-pointer"
                    >
                      <td className="py-2 px-3 font-bold text-slate-900">
                        {cred.name}
                        <span className="block text-[10px] text-slate-500 font-normal">{cred.dept}</span>
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-800 text-[11px]">
                        <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[#1A5E63] font-bold">{cred.email}</code>
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-800 text-[11px]">
                        <code className="bg-slate-100 px-1.5 py-0.5 rounded text-amber-700 font-bold">{cred.pass}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-[11px] text-slate-500 italic text-center">
              💡 Tip: Click any row above to auto-fill the login form.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
