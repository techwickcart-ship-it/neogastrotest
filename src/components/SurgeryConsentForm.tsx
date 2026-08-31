import React, { useState } from 'react';
import { 
  FileText, 
  Printer, 
  Save, 
  User, 
  Stethoscope, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  Languages, 
  Sparkles,
  ShieldCheck,
  Building2,
  Calendar,
  PenTool
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { OTConsent } from '@/types';

export interface SurgeryConsentData {
  patientName: string;
  dobAge: string;
  gender: string;
  ipdNo: string;
  diagnosis: string;
  plannedSurgery: string;
  surgeonName: string;
  informedPersonName: string;
  languageUnderstood: string;
  estimatedComplications: string; // Risk
  alternativeOptions: string;     // Alternative
  benefitsAfterSurgery: string;   // Benefit
  
  // Signatures
  doctorName: string;
  doctorSign: string;
  doctorDate: string;
  
  relativeName: string;
  relativeRelation: string;
  relativeSign: string;
  relativeDate: string;
  
  patientSign: string;
  patientDate: string;
  
  language: 'English' | 'Hindi';
}

const DEFAULT_SURGERY_CONSENT: SurgeryConsentData = {
  patientName: 'PRIYANKA PARTE',
  dobAge: '34 Yrs',
  gender: 'Female',
  ipdNo: 'IPD-8821',
  diagnosis: 'Acute Calculus Cholecystitis with Symptomatic Gallstones',
  plannedSurgery: 'Laparoscopic Cholecystectomy with Intraoperative Cholangiogram',
  surgeonName: 'Dr. Navodita Tiwari (MS, Senior Gastrointestinal Surgeon)',
  informedPersonName: 'Priyanka Parte / Rajesh Parte (Husband)',
  languageUnderstood: 'Hindi & English',
  estimatedComplications: 'Mild intra-operative bleeding, post-op shoulder tip pain, temporary nausea, wound site bruising, injury to adjacent structures (rare), conversion to open cholecystectomy if anatomically necessary.',
  alternativeOptions: 'Conservative medical management with antibiotics & antispasmodics (High recurrence rate of biliary colic & risk of acute pancreatitis/gallbladder perforation).',
  benefitsAfterSurgery: 'Permanent relief from recurrent gallbladder pain, prevention of acute biliary complications, early post-operative recovery via minimally invasive approach.',
  
  doctorName: 'Dr. Navodita Tiwari',
  doctorSign: 'Dr. Navodita Tiwari',
  doctorDate: new Date().toISOString().split('T')[0],
  
  relativeName: 'Rajesh Parte',
  relativeRelation: 'Husband',
  relativeSign: 'Rajesh Parte',
  relativeDate: new Date().toISOString().split('T')[0],
  
  patientSign: 'Priyanka Parte',
  patientDate: new Date().toISOString().split('T')[0],
  
  language: 'English'
};

interface SurgeryConsentFormProps {
  initialData?: Partial<SurgeryConsentData>;
  onSave?: (data: SurgeryConsentData) => void;
}

export default function SurgeryConsentForm({ initialData, onSave }: SurgeryConsentFormProps) {
  const [formData, setFormData] = useState<SurgeryConsentData>({
    ...DEFAULT_SURGERY_CONSENT,
    ...initialData
  });

  const handlePrint = (printLanguage: 'English' | 'Hindi') => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Unable to open print preview window');
      return;
    }

    const isHindi = printLanguage === 'Hindi';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${isHindi ? 'ऑपरेशन सहमति पत्र' : 'Surgery Consent Form'} - ${formData.patientName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700;800;900&family=Tiro+Devanagari+Hindi&display=swap');
            @page { size: A4 portrait; margin: 8mm 10mm 8mm 10mm; }
            * { box-sizing: border-box; -webkit-font-smoothing: antialiased !important; -moz-osx-font-smoothing: grayscale !important; }
            body { 
              font-family: 'Noto Sans Devanagari', 'Tiro Devanagari Hindi', Arial, sans-serif; 
              color: #000000 !important; 
              background: #ffffff; 
              font-size: 9pt; 
              font-weight: 700;
              line-height: 1.4;
              padding: 0;
              margin: 0;
            }
            .border-box {
              border: 2px solid #000000;
              padding: 10px 12px;
              width: 100%;
              box-sizing: border-box;
              border-radius: 3px;
              color: #000000 !important;
            }
            .header-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 6px;
              border-bottom: 2px solid #000000;
              padding-bottom: 4px;
            }
            .hospital-title {
              font-size: 16pt;
              font-weight: 900;
              text-align: center;
              letter-spacing: -0.2px;
              color: #000000 !important;
            }
            .hospital-sub {
              font-size: 8.5pt;
              text-align: center;
              font-weight: 800;
              color: #000000 !important;
            }
            .doc-title {
              font-size: 12pt;
              font-weight: 900;
              text-align: center;
              margin: 6px 0 8px 0;
              border-top: 2px solid #000000;
              border-bottom: 2px solid #000000;
              padding: 4px 0;
              background-color: #f1f5f9 !important;
              text-transform: uppercase;
              color: #000000 !important;
            }
            .info-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 8px;
            }
            .info-table td {
              border: 1.5px solid #000000;
              padding: 5px 8px;
              font-size: 9pt;
              font-weight: 700;
              color: #000000 !important;
            }
            .underline-field {
              border-bottom: 2px solid #000000;
              font-weight: 900;
              padding: 0 4px;
              color: #000000 !important;
            }
            .clause-list {
              margin: 6px 0;
              padding-left: 0;
              list-style-type: none;
            }
            .clause-item {
              margin-bottom: 6px;
              text-align: justify;
              font-size: 9pt;
              line-height: 1.4;
              color: #000000 !important;
              font-weight: 700;
            }
            .clause-item strong {
              font-weight: 900;
              color: #000000 !important;
            }
            .risk-table {
              width: 100%;
              border-collapse: collapse;
              margin: 8px 0;
              page-break-inside: avoid;
            }
            .risk-table td, .risk-table th {
              border: 1.5px solid #000000;
              padding: 6px 8px;
              font-size: 9pt;
              vertical-align: top;
              color: #000000 !important;
              font-weight: 800;
            }
            .risk-label {
              width: 25%;
              font-weight: 900;
              background-color: #f1f5f9 !important;
              text-transform: uppercase;
              color: #000000 !important;
            }
            .sig-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
              page-break-inside: avoid;
            }
            .sig-table th {
              border: 2px solid #000000;
              background-color: #f1f5f9 !important;
              padding: 6px 8px;
              font-size: 9pt;
              font-weight: 900;
              color: #000000 !important;
              text-transform: uppercase;
            }
            .sig-table td {
              border: 1.5px solid #000000;
              padding: 6px 8px;
              font-size: 9pt;
              vertical-align: top;
              color: #000000 !important;
              font-weight: 800;
            }
            .sig-table strong {
              font-weight: 900;
              color: #000000 !important;
            }
            @media print {
              * {
                color: #000000 !important;
                border-color: #000000 !important;
                box-shadow: none !important;
                text-shadow: none !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              body { 
                background: #ffffff !important;
                font-size: 9pt !important; 
                font-weight: 700 !important;
                color: #000000 !important;
              }
              .border-box { border-color: #000000 !important; }
              .doc-title, .risk-label, .sig-table th { background-color: #f1f5f9 !important; }
            }
          </style>
        </head>
        <body>
          <div class="border-box">
            <!-- Header -->
            <table class="header-table">
              <tr>
                <td style="width: 15%; text-align: left;">
                  <div style="border: 2px solid #000; border-radius: 50%; width: 45px; height: 45px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 8.5pt; text-align: center; font-family: Arial;">GPH</div>
                </td>
                <td style="width: 70%;">
                  <div class="hospital-title">GASTRO PLUS HOSPITAL</div>
                  <div class="hospital-sub">Plot No. 7 & 8, Om Shiv Nagar, Gufa Mandir Road, Lal Ghati Bhopal, 462030, Madhya Pradesh</div>
                  <div class="hospital-sub">Ph.: 9109102145/9109101246 &bull; Email: gatroplusbhopal@gmail.com</div>
                </td>
                <td style="width: 15%; text-align: right; font-size: 7.5pt; font-weight: bold; font-family: Arial;">
                </td>
              </tr>
            </table>

            <div class="doc-title">
              ${isHindi ? 'ऑपरेशन / शल्य चिकित्सा सहमति पत्र (SURGERY CONSENT FORM)' : 'SURGERY CONSENT FORM'}
            </div>

            <!-- Patient Information Grid -->
            <table class="info-table">
              <tr>
                <td colspan="4" style="background-color: #f2f2f2; font-weight: bold;">
                  ${isHindi ? 'मरीज़ एवं रिश्तेदार की जानकारी (Patient & Relative Information)' : 'Patient\'s Information | Relative\'s Information'}
                </td>
              </tr>
              <tr>
                <td style="width: 40%;"><strong>${isHindi ? 'नाम (Name):' : 'Name:'}</strong> <span class="underline-field">${formData.patientName}</span></td>
                <td style="width: 20%;"><strong>${isHindi ? 'आयु (DOB/Age):' : 'DOB/Age:'}</strong> <span class="underline-field">${formData.dobAge}</span></td>
                <td style="width: 15%;"><strong>${isHindi ? 'लिंग (M/F):' : 'M/F:'}</strong> <span class="underline-field">${formData.gender}</span></td>
                <td style="width: 25%;"><strong>${isHindi ? 'आई.पी.डी. क्र. (IPD No.):' : 'IPD No. :'}</strong> <span class="underline-field">${formData.ipdNo}</span></td>
              </tr>
              <tr>
                <td colspan="4"><strong>${isHindi ? 'बीमारी / निदान (Diagnosis):' : 'Diagnosis :'}</strong> <span class="underline-field">${formData.diagnosis}</span></td>
              </tr>
              <tr>
                <td colspan="4"><strong>${isHindi ? 'ऑपरेशन का नाम (Operation\'s Title / Planned Surgery):' : 'Operation\'s Title / Planned Surgery :'}</strong> <span class="underline-field">${formData.plannedSurgery}</span></td>
              </tr>
            </table>

            <!-- Preamble text -->
            <div style="margin-bottom: 6px; text-align: justify; font-size: 9.5pt; font-weight: 700; color: #000000 !important; line-height: 1.4;">
              ${isHindi ? `
                मैं <strong>${formData.informedPersonName || formData.patientName}</strong>, अधोहस्ताक्षरी, स्वयं / उपर्युक्त मरीज के लिए उक्त ऑपरेशन तथा / अथवा दवा / जांच / एनेस्थीसिया (बेहोशी) / ऑपरेशन / थेरेपी / प्रक्रिया इत्यादि हेतु अपनी सहमति देता/देती हूँ। इस प्रक्रिया के समस्त जोखिम एवं उद्देश्य मुझे मेरी समझ में आने वाली भाषा (<strong>${formData.languageUnderstood}</strong>) में भली-भांति समझा दिए गए हैं।
              ` : `
                I informed <strong>${formData.informedPersonName || formData.patientName}</strong> the undersigned give consent for my own/aforementioned patient's for above mentioned operation and / or medication / investigation / anaesthesia / operation / therapy / procedure etc. has been explained to me in language I Understand.
              `}
            </div>

            <!-- Numbered Points 1 to 6 -->
            <div class="clause-list">
              <div class="clause-item">
                <strong>1)</strong> ${isHindi ? `
                  इस दवा / जांच / एनेस्थीसिया / ऑपरेशन / थेरेपी / प्रक्रिया की आवश्यकता, यदि यह न किया जाए तो होने वाले दुष्परिणाम, तथा ऑपरेशन के अलावा अन्य उपचार पद्धतियों के खतरे एवं जटिलताएं मुझे <strong>${formData.surgeonName}</strong> एवं उनकी मेडिकल टीम द्वारा विस्तार से समझा दी गई हैं।
                ` : `
                  The necessity of this medication / investigation / anaesthesia / operation / therapy / procedure the ill effect if this is not performed, hazards and complication in the therapeutic modalities other than operation, have been explained to me by the team led by <strong>Dr. ${formData.surgeonName}</strong>.
                `}
              </div>

              <div class="clause-item">
                <strong>2)</strong> ${isHindi ? `
                  मुझे यह समझा दिया गया है कि कोई भी दवा / जांच / ऑपरेशन / थेरेपी पूरी तरह से सुरक्षित नहीं होती है और एनेस्थीसिया तथा ऑपरेशन की प्रक्रिया में एक सामान्य स्वस्थ व्यक्ति के जीवन को भी जोखिम हो सकता है।
                ` : `
                  I have been explained that any medication / investigation / operation / therapy is not totally safe and that such procedure of anaesthesia can be a risk to life on otherwise healthy person also.
                `}
              </div>

              <div class="clause-item">
                <strong>3)</strong> ${isHindi ? `
                  डॉक्टरों ने मुझे स्पष्ट रूप से समझाया है कि दवा / जांच / ऑपरेशन / थेरेपी / एनेस्थीसिया के दौरान अत्यधिक रक्तस्राव (Excessive Bleeding), संक्रमण (Infection), कार्डियक अरेस्ट (Cardiac Arrest), पल्मोनरी एम्बोलिज्म (Pulmonary Embolism) जैसी गंभीर जटिलताएं अचानक एवं अप्रत्याशित रूप से उत्पन्न हो सकती हैं।
                ` : `
                  Doctors have explained to me that excessive bleeding, infection, cardiac arrest, pulmonary embolism and complications like this can arise suddenly and unexpectedly while undergoing medication / investigation / operation / therapy / procedure or anaesthesia.
                `}
              </div>

              <div class="clause-item">
                <strong>4)</strong> ${isHindi ? `
                  मैं एनेस्थीसिया या ऑपरेशन की प्रक्रिया में आवश्यकतानुसार किसी भी बदलाव तथा ऑपरेशन / प्रक्रिया के समय डॉक्टरों द्वारा उचित एवं आवश्यक समझे जाने पर किसी अंग को हटाने (Removal of any organ) की भी पूर्ण अनुमति एवं सहमति देता/देती हूँ।
                ` : `
                  I give consent for any change in the anaesthesia or operative procedure as well as for removal of any organ as may be deemed fit and necessary by the Doctors at the time of medication / investigation / operation / therapy / Procedure.
                `}
              </div>

              <div class="clause-item">
                <strong>5)</strong> ${isHindi ? `
                  मुझे इस बात से अवगत करा दिया गया है कि उपरोक्त ऑपरेशन / दवा / जांच / थेरेपी / प्रक्रिया एवं एनेस्थीसिया के बाद वांछित लाभ के स्थान पर कुछ जटिलताएं उत्पन्न हो सकती हैं जैसे: <strong>${formData.estimatedComplications}</strong>। जिसका हर संभव इलाज एवं देखभाल <strong>${formData.surgeonName}</strong> एवं/या उनकी टीम द्वारा की जाएगी।
                ` : `
                  I have been made aware that after the above operation / medication / investigation / therapy / procedure & anaesthesia, instead of desired benefit, some complication may arise e.g. <strong>${formData.estimatedComplications}</strong>. Care shall be taken by <strong>Dr. ${formData.surgeonName}</strong> and/or his team.
                `}
              </div>

              <div class="clause-item">
                <strong>6)</strong> ${isHindi ? `
                  मुझे मेरे इलाज एवं ऑपरेशन के संबंध में सभी प्रश्न पूछने का पूरा अवसर दिया गया है और मैं दिए गए उत्तरों एवं जानकारी से पूरी तरह संतुष्ट हूँ।
                ` : `
                  I have been given the opportunity to ask questions about my treatment and I am satisfied with it.
                `}
              </div>
            </div>

            <!-- Risk, Alternative, Benefit Table -->
            <table class="risk-table">
              <tr>
                <td class="risk-label">${isHindi ? 'जोखिम / जटिलताएं<br/>(RISK)' : 'RISK'}</td>
                <td>${formData.estimatedComplications}</td>
              </tr>
              <tr>
                <td class="risk-label">${isHindi ? 'अन्य विकल्प<br/>(ALTERNATIVE)' : 'ALTERNATIVE'}</td>
                <td>${formData.alternativeOptions || 'None / Not Applicable'}</td>
              </tr>
              <tr>
                <td class="risk-label">${isHindi ? 'ऑपरेशन से लाभ<br/>(BENEFIT)' : 'BENEFIT'}</td>
                <td>${formData.benefitsAfterSurgery}</td>
              </tr>
            </table>

            <!-- Signatures Section -->
            <table class="sig-table">
              <thead>
                <tr>
                  <th style="width: 33%;">${isHindi ? 'डॉक्टर / सर्जन (Doctor)' : 'Doctor'}</th>
                  <th style="width: 34%;">${isHindi ? 'रिश्तेदार / अभिभावक (Relative)' : 'Relative'}</th>
                  <th style="width: 33%;">${isHindi ? 'मरीज (Patient)' : 'Patient'}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>Sign. :</strong> <span class="underline-field">${formData.doctorSign}</span><br/><br/>
                    <strong>Name :</strong> ${formData.doctorName}<br/><br/>
                    <strong>Date :</strong> ${formData.doctorDate}
                  </td>
                  <td>
                    <strong>Sign. :</strong> <span class="underline-field">${formData.relativeSign}</span><br/><br/>
                    <strong>Name :</strong> ${formData.relativeName}<br/><br/>
                    <strong>Relation :</strong> ${formData.relativeRelation}<br/><br/>
                    <strong>Date :</strong> ${formData.relativeDate}
                  </td>
                  <td>
                    <strong>Sign. :</strong> <span class="underline-field">${formData.patientSign}</span><br/><br/>
                    <strong>Name :</strong> ${formData.patientName}<br/><br/>
                    <strong>Date :</strong> ${formData.patientDate}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <script>
            window.onload = function() { window.print(); }
            window.onafterprint = function() { window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    toast.success(`Surgery Consent Form (${isHindi ? 'Hindi' : 'English'}) sent to printer`);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl bg-linear-to-r from-teal-900 via-slate-900 to-indigo-950 text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-500/20 border border-teal-400/30 rounded-xl text-teal-300 shrink-0">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black tracking-wide uppercase">Surgery Consent Form</h3>
              <Badge className="bg-amber-400 text-amber-950 font-black text-[10px]">GASTROPLUS STANDARD</Badge>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Neo Gastroplus Hospital Standard Consent Form with English & Hindi Font Support
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handlePrint('English')} 
            className="border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-bold text-xs h-9 gap-1.5"
          >
            <Printer className="w-4 h-4 text-teal-400" />
            Print English Form
          </Button>
          <Button 
            size="sm" 
            onClick={() => handlePrint('Hindi')} 
            className="bg-amber-500 hover:bg-amber-400 text-amber-950 font-black text-xs h-9 gap-1.5 shadow-xs"
          >
            <Languages className="w-4 h-4" />
            Print Hindi Form (हिंदी सहमति पत्र)
          </Button>
        </div>
      </div>

      {/* Language Toggle & Input Card */}
      <Card className="border shadow-xs rounded-2xl">
        <CardHeader className="border-b bg-slate-50/50 p-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-600" /> Surgical Procedure & Clinical Details
            </CardTitle>
            <CardDescription className="text-xs">Fill in Diagnosis, Planned Surgery, Surgeon Name, Risks, Benefits, and Alternatives</CardDescription>
          </div>

          <div className="flex items-center gap-2 bg-slate-200/60 p-1 rounded-xl">
            <button
              onClick={() => setFormData({...formData, language: 'English'})}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                formData.language === 'English' ? 'bg-white text-teal-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setFormData({...formData, language: 'Hindi'})}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                formData.language === 'Hindi' ? 'bg-amber-500 text-amber-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              हिंदी (Hindi Font)
            </button>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-5 text-xs">
          {/* Patient Header Row */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="font-bold">Patient Name (मरीज़ का नाम)</Label>
              <Input 
                value={formData.patientName} 
                onChange={e => setFormData({...formData, patientName: e.target.value})} 
                className="h-8 text-xs font-semibold"
              />
            </div>
            <div className="space-y-1">
              <Label className="font-bold">DOB / Age (आयु)</Label>
              <Input 
                value={formData.dobAge} 
                onChange={e => setFormData({...formData, dobAge: e.target.value})} 
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="font-bold">Gender (लिंग)</Label>
              <Select value={formData.gender} onValueChange={v => setFormData({...formData, gender: v})}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male / पुरुष</SelectItem>
                  <SelectItem value="Female">Female / महिला</SelectItem>
                  <SelectItem value="Other">Other / अन्य</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="font-bold">IPD No. (आई.पी.डी. क्र.)</Label>
              <Input 
                value={formData.ipdNo} 
                onChange={e => setFormData({...formData, ipdNo: e.target.value})} 
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Diagnosis, Planned Surgery, Surgeon Name */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t">
            <div className="space-y-1">
              <Label className="font-extrabold text-slate-800">Diagnosis (रोग / निदान)</Label>
              <Input 
                value={formData.diagnosis} 
                onChange={e => setFormData({...formData, diagnosis: e.target.value})} 
                className="h-8 text-xs font-medium border-teal-200 focus:border-teal-500"
                placeholder="e.g. Acute Cholecystitis"
              />
            </div>

            <div className="space-y-1">
              <Label className="font-extrabold text-slate-800">Planned Surgery / Operation Title</Label>
              <Input 
                value={formData.plannedSurgery} 
                onChange={e => setFormData({...formData, plannedSurgery: e.target.value})} 
                className="h-8 text-xs font-extrabold text-teal-900 border-teal-200 focus:border-teal-500"
                placeholder="e.g. Laparoscopic Cholecystectomy"
              />
            </div>

            <div className="space-y-1">
              <Label className="font-extrabold text-slate-800">Surgeon Name (डॉक्टर / सर्जन)</Label>
              <Input 
                value={formData.surgeonName} 
                onChange={e => setFormData({...formData, surgeonName: e.target.value})} 
                className="h-8 text-xs font-semibold"
                placeholder="e.g. Dr. Navodita Tiwari"
              />
            </div>
          </div>

          {/* Risk, Benefit, Alternative Option Table */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h4 className="font-black text-slate-900 text-xs uppercase tracking-wide">
                Surgery Risk, Benefit & Alternative Disclosures
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5 p-3 bg-rose-50/50 border border-rose-200 rounded-xl">
                <Label className="font-extrabold text-rose-900 flex items-center gap-1.5 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Estimated Complications (RISK)
                </Label>
                <Textarea 
                  value={formData.estimatedComplications} 
                  onChange={e => setFormData({...formData, estimatedComplications: e.target.value})} 
                  rows={3}
                  className="text-xs bg-white border-rose-200 focus:border-rose-400"
                  placeholder="Document anticipated intra-op and post-op surgical risks..."
                />
              </div>

              <div className="space-y-1.5 p-3 bg-amber-50/50 border border-amber-200 rounded-xl">
                <Label className="font-extrabold text-amber-900 flex items-center gap-1.5 text-xs">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-600" /> Alternative Option, if any
                </Label>
                <Textarea 
                  value={formData.alternativeOptions} 
                  onChange={e => setFormData({...formData, alternativeOptions: e.target.value})} 
                  rows={3}
                  className="text-xs bg-white border-amber-200 focus:border-amber-400"
                  placeholder="Document non-surgical or alternative therapeutic options..."
                />
              </div>

              <div className="space-y-1.5 p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl">
                <Label className="font-extrabold text-emerald-900 flex items-center gap-1.5 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Benefit After Surgery
                </Label>
                <Textarea 
                  value={formData.benefitsAfterSurgery} 
                  onChange={e => setFormData({...formData, benefitsAfterSurgery: e.target.value})} 
                  rows={3}
                  className="text-xs bg-white border-emerald-200 focus:border-emerald-400"
                  placeholder="Document expected clinical benefits after surgery..."
                />
              </div>
            </div>
          </div>

          {/* Signatures Section */}
          <div className="space-y-3 pt-3 border-t">
            <h4 className="font-black text-slate-900 text-xs uppercase tracking-wide flex items-center gap-2">
              <PenTool className="w-4 h-4 text-indigo-600" /> Signatures & Verification
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Doctor */}
              <div className="p-3 bg-slate-50 border rounded-xl space-y-2">
                <p className="font-extrabold text-slate-800 text-xs">Surgeon / Doctor</p>
                <div className="space-y-1">
                  <Label className="text-[10px]">Name</Label>
                  <Input value={formData.doctorName} onChange={e => setFormData({...formData, doctorName: e.target.value})} className="h-7 text-xs bg-white" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Digital Signature / Typed Sign</Label>
                  <Input value={formData.doctorSign} onChange={e => setFormData({...formData, doctorSign: e.target.value})} className="h-7 text-xs bg-white font-semibold" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Date</Label>
                  <Input type="date" value={formData.doctorDate} onChange={e => setFormData({...formData, doctorDate: e.target.value})} className="h-7 text-xs bg-white" />
                </div>
              </div>

              {/* Relative */}
              <div className="p-3 bg-slate-50 border rounded-xl space-y-2">
                <p className="font-extrabold text-slate-800 text-xs">Relative / Guardian</p>
                <div className="space-y-1">
                  <Label className="text-[10px]">Name & Relation</Label>
                  <div className="grid grid-cols-2 gap-1">
                    <Input value={formData.relativeName} onChange={e => setFormData({...formData, relativeName: e.target.value})} className="h-7 text-xs bg-white" placeholder="Name" />
                    <Input value={formData.relativeRelation} onChange={e => setFormData({...formData, relativeRelation: e.target.value})} className="h-7 text-xs bg-white" placeholder="Relation" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Signature / Typed Sign</Label>
                  <Input value={formData.relativeSign} onChange={e => setFormData({...formData, relativeSign: e.target.value})} className="h-7 text-xs bg-white font-semibold" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Date</Label>
                  <Input type="date" value={formData.relativeDate} onChange={e => setFormData({...formData, relativeDate: e.target.value})} className="h-7 text-xs bg-white" />
                </div>
              </div>

              {/* Patient */}
              <div className="p-3 bg-slate-50 border rounded-xl space-y-2">
                <p className="font-extrabold text-slate-800 text-xs">Patient</p>
                <div className="space-y-1">
                  <Label className="text-[10px]">Name</Label>
                  <Input value={formData.patientName} onChange={e => setFormData({...formData, patientName: e.target.value})} className="h-7 text-xs bg-white" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Signature / Typed Sign</Label>
                  <Input value={formData.patientSign} onChange={e => setFormData({...formData, patientSign: e.target.value})} className="h-7 text-xs bg-white font-semibold" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Date</Label>
                  <Input type="date" value={formData.patientDate} onChange={e => setFormData({...formData, patientDate: e.target.value})} className="h-7 text-xs bg-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Action Controls */}
          <div className="pt-3 border-t flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => handlePrint('English')} 
                variant="outline"
                className="border-teal-300 text-teal-900 font-bold text-xs h-9 gap-1.5"
              >
                <Printer className="w-4 h-4 text-teal-700" /> Print English Form
              </Button>
              <Button 
                onClick={() => handlePrint('Hindi')} 
                className="bg-amber-500 hover:bg-amber-400 text-amber-950 font-black text-xs h-9 gap-1.5"
              >
                <Languages className="w-4 h-4" /> Print Hindi Form (हिंदी)
              </Button>
            </div>

            <Button 
              onClick={() => {
                toast.success('Surgery Consent Form Saved Successfully!');
                if (onSave) onSave(formData);
              }}
              className="bg-[#1A5E63] hover:bg-[#1A5E63]/90 text-white font-extrabold text-xs h-9 gap-1.5"
            >
              <Save className="w-4 h-4" /> Save Surgery Consent
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
