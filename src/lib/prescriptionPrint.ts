export interface PrintPatient {
  name: string;
  age?: number | string;
  gender?: string;
  mrn?: string;
  phone?: string;
  fatherName?: string;
  allergies?: string | string[];
  pastHistory?: string;
  medicalHistory?: string;
  clinicalHistory?: string;
  history?: string;
  complaints?: string;
  attendingDoctor?: string;
  attendingDoctorId?: string;
  vitals?: PrintVitals;
}

export interface PrintMedicine {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  time?: string;
  startTime?: string;
  instructions?: string;
  route?: string;
  remarks?: string;
}

export interface PrintVitals {
  temp?: string | number;
  temperature?: string | number;
  bp?: string;
  blood_pressure?: string;
  bloodPressure?: string;
  bpSystolic?: string | number;
  bpDiastolic?: string | number;
  pulse?: string | number;
  pulse_rate?: string | number;
  pulseRate?: string | number;
  spo2?: string | number;
  weight?: string | number;
  height?: string | number;
  bmi?: string | number;
  rr?: string | number;
  respiration?: string | number;
  respRate?: string | number;
  cbs?: string;
  rs?: string;
  cns?: string;
  cvs?: string;
  pa?: string;
  perAbdomen?: string;
  per_abdomen?: string;
  localExam?: string;
  local_exam?: string;
  localExamination?: string;
  inputOutput?: string;
  input_output?: string;
  io?: string;
  pr?: string;
  rbs?: string;
  grbs?: string;
  sugar?: string;
  blood_sugar?: string;
  gcs?: string;
  gcsTotal?: string;
  painScale?: string;
  pallor?: string;
  icterus?: string;
  edema?: string;
  clubbing?: string;
  cyanosis?: string;
  lymphadenopathy?: string;
}

export interface PrintPrescription {
  date?: string;
  medicines: PrintMedicine[];
  advice?: string;
  diagnosis?: string;
  notes?: string;
  examinationFindings?: string;
  pastHistory?: string;
  allergies?: string | string[];
  complaints?: string;
  chiefComplaints?: string;
  drawing?: string;
  photos?: string[];
  attachmentUrl?: string;
  attachmentName?: string;
  vitals?: PrintVitals;
  findings?: string;
  suggestions?: string;
  investigationsAdvised?: string | string[];
  followUpDate?: string;
  planSurgeryNeeded?: boolean | string;
  plannedSurgeryName?: string;
  plannedSurgeryDate?: string;
  plannedSurgeryNotes?: string;
  admitNeeded?: string;
  admitReason?: string;
  admitWardType?: string;
  generalInstructions?: string;
}

export interface PrintDoctor {
  name?: string;
  degree?: string;
  qualification?: string;
  qualifications?: string;
  specialization?: string;
  speciality?: string;
  department?: string;
  id?: string;
  registrationNo?: string;
  regNo?: string;
  experience?: string;
  phone?: string;
  signatureUrl?: string;
}

export function getPrescriptionPrintHtml(
  patient: PrintPatient,
  prescription: PrintPrescription,
  doctor?: PrintDoctor,
  hospitalInfo?: { name?: string; address?: string; phone?: string; email?: string; website?: string; logo?: string | null; subTitle?: string; reviewUrl?: string },
  templateImage?: string | null
): string {
  const actualTemplateImage = templateImage !== undefined ? templateImage : (typeof window !== 'undefined' ? localStorage.getItem('hms_template_image') : null);

  // Parse whether there is a valid custom preprinted background letterhead image (to overlay on)
  const isValidTemplateImage = !!(
    actualTemplateImage &&
    typeof actualTemplateImage === 'string' &&
    actualTemplateImage.trim() !== '' &&
    actualTemplateImage !== 'null' &&
    actualTemplateImage !== 'undefined' &&
    (actualTemplateImage.startsWith('http') || actualTemplateImage.startsWith('data:image') || actualTemplateImage.startsWith('/'))
  );

  let storedHospInfo: any = {};
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem('hms_hospital_info');
      if (raw) storedHospInfo = JSON.parse(raw);
    }
  } catch (_) {}

  // Hospital Info variables
  const hospName = hospitalInfo?.name || storedHospInfo?.name || 'NEO GASTROPLUS HOSPITAL';
  const hospSubTitle = hospitalInfo?.subTitle || storedHospInfo?.subTitle || storedHospInfo?.tagline || 'ADVANCED GASTRO & MINIMAL ACCESS SURGERY CENTRE';
  const hospAddress = hospitalInfo?.address || storedHospInfo?.address || 'Plot No. 7 & 8, Om Shiv Nagar, Gufa Mandir Road, Lal Ghati, Bhopal (M.P.) - 462030';
  const hospPhone = hospitalInfo?.phone || storedHospInfo?.phone || '9109102145 / 9109101246';
  const hospEmail = hospitalInfo?.email || storedHospInfo?.email || 'gastroplusbhopal@gmail.com';
  const hospWebsite = hospitalInfo?.website || storedHospInfo?.website || 'www.gastroplusbhopal.com';
  const hospLogo = hospitalInfo?.logo !== undefined ? hospitalInfo?.logo : storedHospInfo?.logo;
  const reviewUrl = hospitalInfo?.reviewUrl || storedHospInfo?.reviewUrl || 'https://g.page/r/gastroplusbhopal/review';

  // Dynamic Doctor Lookup & Resolution
  let resolvedDoctor: any = doctor || {};
  if (typeof window !== 'undefined') {
    try {
      const storedUsersRaw = localStorage.getItem('hms_users') || localStorage.getItem('hms_staff');
      const usersList = storedUsersRaw ? JSON.parse(storedUsersRaw) : [];
      if (Array.isArray(usersList) && usersList.length > 0) {
        const searchDocName = (doctor?.name || (prescription as any)?.doctorName || (prescription as any)?.doctor || patient?.attendingDoctor || (patient as any)?.attending_doctor || '').trim().toLowerCase();
        const searchDocId = (doctor?.id || (prescription as any)?.doctorId || (prescription as any)?.doctor_id || patient?.attendingDoctorId || (patient as any)?.attending_doctor_id || '').trim();
        
        const matched = usersList.find((u: any) => 
          (searchDocId && (String(u.id) === searchDocId || u.uuid === searchDocId)) ||
          (searchDocName && u.name && u.name.trim().toLowerCase() === searchDocName) ||
          (searchDocName && u.name && u.name.trim().toLowerCase().replace(/^dr\.\s*/i, '') === searchDocName.replace(/^dr\.\s*/i, ''))
        );
        if (matched) {
          resolvedDoctor = { ...matched, ...doctor };
        }
      }
    } catch (_) {}
  }

  // Dynamic Doctor Info
  const rawDocName = resolvedDoctor?.name || doctor?.name || (prescription as any)?.doctorName || (prescription as any)?.doctor || 'Hospital Medical Staff';
  const docName = rawDocName.startsWith('Dr.') || rawDocName.startsWith('DR.') ? rawDocName : (rawDocName.toLowerCase().includes('dr') ? rawDocName : `Dr. ${rawDocName}`);
  const docDegree = resolvedDoctor?.degree || resolvedDoctor?.qualification || doctor?.degree || doctor?.qualification || '';
  const docSpecialty = resolvedDoctor?.specialization || resolvedDoctor?.speciality || resolvedDoctor?.department || doctor?.specialization || doctor?.speciality || doctor?.department || 'Administration';
  const docRegNo = resolvedDoctor?.registrationNo || resolvedDoctor?.regNo || doctor?.registrationNo || doctor?.regNo || 'MP-18492-2015';
  const docExp = resolvedDoctor?.experience || doctor?.experience || '14+ Years';
  const docSigUrl = resolvedDoctor?.signatureUrl || doctor?.signatureUrl || storedHospInfo?.doctorSignature || '';

  // Dynamic Patient Info
  const patName = (patient?.name || '').trim() || '-';
  const patAge = patient?.age ? String(patient.age) : '';
  const patGender = patient?.gender || '';
  const patAgeGender = patAge && patGender ? `${patAge} Y / ${patGender}` : (patAge ? `${patAge} Y` : (patGender || '-'));
  
  // Format Date cleanly e.g. "02 Aug 2026"
  let presDate = prescription?.date || new Date().toISOString().split('T')[0];
  let formattedPresDate = presDate;
  try {
    const d = new Date(presDate);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      formattedPresDate = `${day} ${month} ${year}`;
    }
  } catch (e) {}

  const patMRN = (patient?.mrn || '').trim() || '-';
  const patPhone = (patient?.phone || (patient as any)?.mobile || '').trim() || '-';

  // QR Code URL for patient prescription viewing
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://neogastroplus.com';
  const patientQrData = `Hospital: ${hospName}\nPatient: ${patName}\nMRN: ${patMRN}\nDate: ${formattedPresDate}\nDoctor: ${docName}\nVerify: ${siteUrl}/prescription?mrn=${encodeURIComponent(patMRN)}`;
  const patientQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(patientQrData)}`;
  const googleReviewQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(reviewUrl)}`;

  // Extract advice, examination, history, allergies, drawing, diagnosis, photos
  let advText = (prescription.advice || prescription.suggestions || prescription.notes || '').trim();
  let examFindings = (prescription.examinationFindings || prescription.findings || '').trim();
  let drawImg = prescription.drawing || '';
  let diag = (prescription.diagnosis || '').trim();
  let photoList: string[] = prescription.photos ? [...prescription.photos] : [];
  
  // Combine vitals from patient object and prescription
  let vts: any = {
    ...((patient as any)?.vitals || {}),
    ...(prescription?.vitals || {})
  };

  // Extract complaints, allergies, and clinical history from prescription or patient record
  let rawAllergies = prescription.allergies || patient?.allergies || (patient as any)?.known_allergies || (patient as any)?.allergy || (patient as any)?.allergies_list;
  let allergiesText = '';
  if (Array.isArray(rawAllergies)) {
    allergiesText = rawAllergies.filter(Boolean).join(', ');
  } else if (typeof rawAllergies === 'string') {
    allergiesText = rawAllergies.trim();
  }

  let pastHist = (prescription.pastHistory || patient?.pastHistory || patient?.medicalHistory || patient?.clinicalHistory || patient?.history || (patient as any)?.medical_history || (patient as any)?.past_history || (patient as any)?.past_medical_history || '').trim();

  let complaintsText = (prescription.complaints || prescription.chiefComplaints || patient?.complaints || (patient as any)?.presentingComplaints || (patient as any)?.chief_complaints || (patient as any)?.symptoms || '').trim();

  if (prescription.attachmentUrl && prescription.attachmentUrl.startsWith('data:image')) {
    if (!photoList.includes(prescription.attachmentUrl)) {
      photoList.push(prescription.attachmentUrl);
    }
  }

  let planSurgeryNeeded = prescription.planSurgeryNeeded || false;
  let plannedSurgeryName = (prescription.plannedSurgeryName || '').trim();
  let plannedSurgeryDate = (prescription.plannedSurgeryDate || '').trim();
  let plannedSurgeryNotes = (prescription.plannedSurgeryNotes || '').trim();

  let admitNeeded = (prescription.admitNeeded || 'No').trim();
  let admitReason = (prescription.admitReason || '').trim();
  let admitWardType = (prescription.admitWardType || '').trim();

  let genInstructions = (prescription.generalInstructions || '').trim();

  // Try deserializing advice if it's stored as JSON
  if (typeof advText === 'string' && advText.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(advText);
      if (parsed && typeof parsed === 'object') {
        advText = (parsed.advice || parsed.suggestions || '').trim();
        if (parsed.generalInstructions && !genInstructions) genInstructions = parsed.generalInstructions.trim();
        if (parsed.examinationFindings && !examFindings) examFindings = parsed.examinationFindings.trim();
        if (parsed.findings && !examFindings) examFindings = parsed.findings.trim();
        if (parsed.pastHistory && !pastHist) pastHist = parsed.pastHistory.trim();
        if (parsed.allergies && !allergiesText) {
          allergiesText = typeof parsed.allergies === 'string' ? parsed.allergies.trim() : (Array.isArray(parsed.allergies) ? parsed.allergies.join(', ') : '');
        }
        if (parsed.complaints && !complaintsText) complaintsText = parsed.complaints.trim();
        if (parsed.investigationsAdvised && (!prescription.investigationsAdvised || (Array.isArray(prescription.investigationsAdvised) && prescription.investigationsAdvised.length === 0))) {
          prescription.investigationsAdvised = parsed.investigationsAdvised;
        }
        if (parsed.investigations && (!prescription.investigationsAdvised || (Array.isArray(prescription.investigationsAdvised) && prescription.investigationsAdvised.length === 0))) {
          prescription.investigationsAdvised = parsed.investigations;
        }
        if (parsed.drawing && !drawImg) drawImg = parsed.drawing;
        if (parsed.diagnosis && !diag) diag = parsed.diagnosis.trim();
        if (parsed.vitals) vts = { ...vts, ...parsed.vitals };
        if (parsed.planSurgeryNeeded !== undefined) planSurgeryNeeded = parsed.planSurgeryNeeded;
        if (parsed.plannedSurgeryName && !plannedSurgeryName) plannedSurgeryName = parsed.plannedSurgeryName.trim();
        if (parsed.plannedSurgeryDate && !plannedSurgeryDate) plannedSurgeryDate = parsed.plannedSurgeryDate.trim();
        if (parsed.plannedSurgeryNotes && !plannedSurgeryNotes) plannedSurgeryNotes = parsed.plannedSurgeryNotes.trim();
        if (parsed.admitNeeded && admitNeeded === 'No') admitNeeded = parsed.admitNeeded;
        if (parsed.admitReason && !admitReason) admitReason = parsed.admitReason.trim();
        if (parsed.admitWardType && !admitWardType) admitWardType = parsed.admitWardType.trim();
        if (parsed.photos && Array.isArray(parsed.photos)) {
          parsed.photos.forEach((ph: string) => {
            if (ph && !photoList.includes(ph)) photoList.push(ph);
          });
        }
        if (parsed.attachmentUrl && parsed.attachmentUrl.startsWith('data:image')) {
          if (!photoList.includes(parsed.attachmentUrl)) photoList.push(parsed.attachmentUrl);
        }
      }
    } catch (e) {
      // Not JSON
    }
  }

  // Format valid medicines list entered by doctor
  const validMedicines = (prescription.medicines || []).filter(m => m && m.name && m.name.trim() !== '');
  let medContent = '';
  if (validMedicines.length > 0) {
    medContent = validMedicines.map((m, idx) => {
      const nameStr = m.name || 'Medicine';
      const dosageStr = m.dosage || '-';
      const freqStr = m.frequency || '-';
      const durStr = m.duration || '-';
      const instStr = m.instructions || m.time || m.remarks || m.startTime || '';
      return `
        <tr style="border-bottom: 1px solid #cbd5e1; page-break-inside: avoid;">
          <td style="padding: 8px 8px; font-weight: 800; color: #000000; font-size: 11.5px; width: 5%; text-align: center;">
            ${idx + 1}.
          </td>
          <td style="padding: 8px 8px; font-weight: 800; color: #000000; font-size: 12.5px; width: 42%;">
            <div style="font-weight: 800; color: #0f172a; font-size: 13px;">${nameStr}</div>
            ${m.route ? `<span style="display: inline-block; background-color: #f1f5f9; color: #334155; font-size: 9px; font-weight: 800; padding: 1px 5px; border-radius: 3px; margin-top: 2px; border: 1px solid #e2e8f0;">${m.route}</span>` : ''}
            ${instStr ? `
              <div style="font-size: 10px; color: #004d40; font-weight: 700; margin-top: 4px; background-color: #f0fdf4; padding: 2px 6px; border-radius: 3px; border-left: 3px solid #10b981; display: block;">
                📌 <strong style="color: #047857;">Instruction:</strong> ${instStr}
              </div>
            ` : ''}
          </td>
          <td style="padding: 8px 8px; font-weight: 700; color: #1e293b; font-size: 12px; width: 16%;">${dosageStr}</td>
          <td style="padding: 8px 8px; font-weight: 700; color: #1e293b; font-size: 12px; width: 22%;">
            <div style="font-weight: 800; color: #0f172a;">${freqStr}</div>
          </td>
          <td style="padding: 8px 8px; font-weight: 800; color: #0f172a; font-size: 12px; width: 15%;">${durStr}</td>
        </tr>
      `;
    }).join('');
  } else {
    medContent = `
      <tr style="border-bottom: 1px solid #cbd5e1;">
        <td colspan="5" style="padding: 12px 10px; text-align: center; color: #64748b; font-size: 11.5px; font-style: italic;">
          No oral medications prescribed in this session.
        </td>
      </tr>
    `;
  }

  // Format Vitals row if any are present
  const bpVal = vts.bp || vts.blood_pressure || vts.bloodPressure || (vts.bpSystolic && vts.bpDiastolic ? `${vts.bpSystolic}/${vts.bpDiastolic}` : '');
  const pulseVal = vts.pulse || vts.pulse_rate || vts.pulseRate || '';
  const tempVal = vts.temp || vts.temperature || '';
  const spo2Val = vts.spo2 || '';
  const weightVal = vts.weight || '';
  const heightVal = vts.height || '';
  const bmiVal = vts.bmi || '';
  const rbsVal = vts.cbs || vts.rbs || vts.sugar || vts.blood_sugar || '';
  const rrVal = vts.rr || vts.respiration || vts.respRate || '';

  const hasVitals = !!(bpVal || pulseVal || tempVal || spo2Val || weightVal || heightVal || bmiVal || rbsVal || rrVal);

  // Format Advice Lines accurately
  let adviceFormattedHtml = '';
  if (advText) {
    const lines = advText.split('\n').filter(l => l.trim().length > 0);
    adviceFormattedHtml = lines.map((line, i) => {
      const cleanLine = line.replace(/^\d+[\.\)]\s*/, '');
      return `<div style="margin-bottom: 3px; line-height: 1.4;"><span style="font-weight: 800; color: #16a34a;">${i + 1}.</span> ${cleanLine}</div>`;
    }).join('');
  }

  // Format Investigations accurately
  let invStr = '';
  if (prescription.investigationsAdvised) {
    if (Array.isArray(prescription.investigationsAdvised)) {
      invStr = prescription.investigationsAdvised.filter(Boolean).join(', ');
    } else {
      invStr = String(prescription.investigationsAdvised).trim();
    }
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>OPD Prescription - ${patName}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,600;1,700&family=Playfair+Display:ital,wght@0,700;1,700&family=Great+Vibes&display=swap');
          
          @page {
            size: A4 portrait;
            margin: 0;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            margin: 0;
            padding: 0;
            color: #0f172a;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background-color: #f1f5f9;
            position: relative;
          }
          
          .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-25deg);
            font-size: 80px;
            font-weight: 900;
            color: rgba(0, 61, 70, 0.035);
            white-space: nowrap;
            pointer-events: none;
            z-index: 0;
            text-transform: uppercase;
            letter-spacing: 4px;
            font-family: 'Plus Jakarta Sans', sans-serif;
          }

          .page-container {
            width: 210mm;
            min-height: 297mm;
            margin: 15px auto;
            background: #ffffff;
            padding: 8mm 10mm 8mm 10mm;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            position: relative;
            border-radius: 2px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }

          .no-print {
            background: #0f172a;
            padding: 10px 20px;
            display: flex;
            gap: 12px;
            justify-content: center;
            align-items: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            position: sticky;
            top: 0;
            z-index: 100;
          }

          @media print {
            html, body {
              background: #ffffff !important;
              color: #0f172a !important;
              margin: 0 !important;
              padding: 0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            .page-container {
              margin: 0 !important;
              padding: 5mm 8mm 5mm 8mm !important;
              box-shadow: none !important;
              border: none !important;
              width: 100% !important;
              max-width: 100% !important;
              min-height: auto !important;
              page-break-after: auto;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .no-print {
              display: none !important;
            }
            .watermark {
              opacity: 0.04 !important;
            }
            img {
              max-width: 100% !important;
              height: auto !important;
              display: block !important;
              visibility: visible !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .clinical-card, .meds-table, table, tr, td, th {
              page-break-inside: avoid !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .meds-table th {
              background-color: #003d46 !important;
              color: #ffffff !important;
            }
            .doctor-strip {
              background-color: #003d46 !important;
              color: #ffffff !important;
              border: 1px solid #002b31 !important;
            }
            .doctor-strip .doc-name {
              color: #ffffff !important;
              font-weight: 900 !important;
            }
            .doctor-strip .doc-label {
              color: #5eead4 !important;
              font-weight: 800 !important;
            }
            .doctor-strip .doc-degree {
              color: #facc15 !important;
              font-weight: 800 !important;
            }
            .doctor-strip .doc-reg {
              color: #ffffff !important;
              font-weight: 800 !important;
              background-color: rgba(255,255,255,0.12) !important;
              border: 1px solid rgba(255,255,255,0.3) !important;
            }
            .clinical-card {
              border: 1px solid #cbd5e1 !important;
              background-color: #ffffff !important;
            }
            .patient-details-box {
              border: 1.5px solid #003d46 !important;
              background-color: #fcfdfd !important;
            }
            .vitals-box {
              background-color: #f8fafc !important;
              border: 1px solid #cbd5e1 !important;
              border-left: 4px solid #0284c7 !important;
            }
            .bottom-footer-banner {
              background-color: #f8fafc !important;
              border: 1px solid #005662 !important;
              border-top: 2px solid #005662 !important;
            }
          }

          .btn-print {
            background-color: #0d9488;
            color: white;
            border: none;
            padding: 8px 18px;
            border-radius: 6px;
            font-weight: 700;
            font-size: 13px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
          .btn-print:hover {
            background-color: #0f766e;
          }

          .clinical-card {
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 5px 8px;
            margin-bottom: 5px;
            background-color: #ffffff;
            display: flex;
            align-items: flex-start;
            gap: 8px;
            page-break-inside: avoid;
          }
          .patient-details-box {
            border: 1.5px solid #003d46;
            border-radius: 6px;
            padding: 4px 8px;
            margin-bottom: 8px;
            background-color: #fcfdfd;
          }
          .vitals-box {
            background-color: #f8fafc;
            border: 1px solid #cbd5e1;
            border-left: 4px solid #0284c7;
            border-radius: 6px;
            padding: 4px 8px;
            margin-bottom: 6px;
            page-break-inside: avoid;
          }
          .clinical-icon {
            width: 24px;
            height: 24px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            margin-top: 1px;
            background-color: #f8fafc;
          }

          .meds-table {
            width: 100%;
            border-collapse: collapse;
            font-family: 'Plus Jakarta Sans', sans-serif;
            margin-top: 4px;
            page-break-inside: auto;
          }
          .meds-table th {
            background-color: #003d46;
            color: white;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 5px 8px;
            text-align: left;
            border: 1px solid #003d46;
          }
          .meds-table td {
            border: 1px solid #cbd5e1;
            vertical-align: top;
          }
        </style>
      </head>
      <body>
        <!-- Top Toolbar for Preview (Hidden on actual print) -->
        <div class="no-print">
          <button class="btn-print" onclick="window.print()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            Print Prescription
          </button>
          <button class="btn-print" style="background-color: #475569;" onclick="window.close()">
            Close
          </button>
        </div>

        <div class="page-container">
          <div class="watermark">${hospName}</div>

          <div>
            <!-- HOSPITAL HEADER BANNER (MATCHING REFERENCE IMAGE) -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #003d46; padding-bottom: 8px; margin-bottom: 6px;">
              <!-- Left: Hospital Logo & Subtext -->
              <div style="display: flex; flex-direction: column; align-items: center; text-align: center; max-width: 170px;">
                ${hospLogo ? `
                  <img src="${hospLogo}" style="height: 52px; width: auto; object-fit: contain;" alt="Hospital Logo" />
                ` : `
                  <div style="width: 46px; height: 46px; border-radius: 8px; border: 2px solid #003d46; background-color: #f0fdfa; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #003d46;">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#003d46" stroke-width="2.5">
                      <path d="M12 2v20M2 12h20"/>
                    </svg>
                    <span style="font-size: 7.5px; font-weight: 900; line-height: 1; color: #003d46; letter-spacing: 0.5px;">GP+</span>
                  </div>
                `}
                <div style="font-size: 7px; font-weight: 800; color: #003d46; letter-spacing: 0.5px; text-transform: uppercase; margin-top: 3px; line-height: 1.15; font-family: 'Plus Jakarta Sans', sans-serif;">
                  SUPER SPECIALITY GASTRO & OT SURGICAL CENTER
                </div>
              </div>

              <!-- Right: Tagline, Hospital Name, Advanced Center Subtitle & Speciality Badges -->
              <div style="display: flex; flex-direction: column; align-items: flex-end; text-align: right;">
                <div style="font-style: italic; font-size: 11px; font-weight: 700; color: #004852; margin-bottom: 1px; display: flex; align-items: center; gap: 4px; font-family: 'Playfair Display', Georgia, serif;">
                  <span>Excellence in Gastroenterology & Laparoscopic Surgery</span>
                  <span style="color: #f59e0b; font-size: 12px;">★</span>
                </div>
                <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 23px; font-weight: 900; color: #003d46; line-height: 1.1; letter-spacing: 0.8px;">
                  ${hospName}
                </div>
                <div style="font-size: 8.5px; font-weight: 800; color: #005662; text-transform: uppercase; letter-spacing: 1.2px; margin-top: 2px;">
                  — ADVANCED GASTRO & MINIMAL ACCESS SURGERY CENTRE —
                </div>
                <div style="display: inline-flex; align-items: center; background-color: #e0f2fe; color: #005662; border: 1px solid #bae6fd; border-radius: 9999px; padding: 2.5px 12px; font-size: 7.5px; font-weight: 800; letter-spacing: 0.7px; text-transform: uppercase; gap: 6px; margin-top: 4px;">
                  <span>GASTROENTEROLOGY</span>
                  <span style="color: #94a3b8;">|</span>
                  <span>GI SURGERY</span>
                  <span style="color: #94a3b8;">|</span>
                  <span>LAPAROSCOPIC SURGERY</span>
                  <span style="color: #94a3b8;">|</span>
                  <span>ENDOSCOPY</span>
                </div>
              </div>
            </div>

            <!-- CONSULTANT DOCTOR DETAILS HIGH CONTRAST STRIP -->
            <div class="doctor-strip" style="background-color: #003d46; color: #ffffff; border-radius: 6px; padding: 6px 12px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
              <!-- Left Side: Doctor Avatar Icon & Details -->
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 32px; height: 32px; border-radius: 50%; border: 1.5px solid #5eead4; display: flex; align-items: center; justify-content: center; background-color: rgba(255,255,255,0.15); color: #ffffff; flex-shrink: 0;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <div>
                  <div class="doc-label" style="font-size: 7.5px; font-weight: 800; text-transform: uppercase; color: #5eead4; letter-spacing: 0.8px;">CONSULTANT</div>
                  <div class="doc-name" style="font-size: 14.5px; font-weight: 900; letter-spacing: 0.3px; line-height: 1.1; font-family: 'Plus Jakarta Sans', sans-serif; color: #ffffff;">${docName}</div>
                  <div class="doc-degree" style="font-size: 9px; font-weight: 700; color: #facc15; margin-top: 1px;">
                    ${docDegree ? `${docDegree} &bull; ` : ''}${docSpecialty}
                  </div>
                </div>
              </div>

              <!-- Right Side: Reg No & Experience with vertical divider -->
              <div style="display: flex; flex-direction: column; align-items: flex-start; justify-content: center; gap: 2px; border-left: 1px solid rgba(255,255,255,0.25); padding-left: 12px; min-width: 140px;">
                <div class="doc-reg" style="display: flex; align-items: center; gap: 4px; font-size: 9px; font-weight: 800; color: #ffffff;">
                  <span style="opacity: 0.9;">🗎 Reg. No.:</span>
                  <span style="color: #fef08a; font-weight: 900;">${docRegNo}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 4px; font-size: 9px; font-weight: 800; color: #ffffff;">
                  <span style="opacity: 0.9;">⭐ Experience:</span>
                  <span style="color: #5eead4; font-weight: 900;">${docExp}</span>
                </div>
              </div>
            </div>

            <!-- PATIENT DETAILS BOX -->
            <div style="border: 1.5px solid #003d46; border-radius: 6px; padding: 4px 8px; margin-bottom: 8px; background-color: #fcfdfd;">
              <table style="width: 100%; border-collapse: collapse; font-family: 'Plus Jakarta Sans', sans-serif;">
                <tr>
                  <!-- Patient Name -->
                  <td style="width: 35%; padding: 3px 6px; vertical-align: middle; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
                    <div style="font-size: 7.5px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">PATIENT NAME</div>
                    <div style="font-size: 12px; font-weight: 800; color: #0f172a; line-height: 1.2;">${patName}</div>
                  </td>

                  <!-- Age / Sex -->
                  <td style="width: 32%; padding: 3px 6px; vertical-align: middle; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
                    <div style="font-size: 7.5px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">AGE / SEX</div>
                    <div style="font-size: 12px; font-weight: 800; color: #0f172a; line-height: 1.2;">${patAgeGender}</div>
                  </td>

                  <!-- MRN -->
                  <td style="width: 33%; padding: 3px 6px; vertical-align: middle; border-bottom: 1px solid #e2e8f0;">
                    <div style="font-size: 7.5px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">MRN / PATIENT ID</div>
                    <div style="font-size: 12px; font-weight: 800; color: #0f172a; line-height: 1.2;">${patMRN}</div>
                  </td>
                </tr>

                <tr>
                  <!-- Date -->
                  <td style="padding: 3px 6px; vertical-align: middle; border-right: 1px solid #e2e8f0;">
                    <div style="font-size: 7.5px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">PRESCRIPTION DATE</div>
                    <div style="font-size: 11.5px; font-weight: 800; color: #0f172a; line-height: 1.2;">${formattedPresDate}</div>
                  </td>

                  <!-- Mobile No. -->
                  <td style="padding: 3px 6px; vertical-align: middle; border-right: 1px solid #e2e8f0;">
                    <div style="font-size: 7.5px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">MOBILE NO.</div>
                    <div style="font-size: 11.5px; font-weight: 800; color: #0f172a; line-height: 1.2;">${patPhone}</div>
                  </td>

                  <!-- Attending Doctor -->
                  <td style="padding: 3px 6px; vertical-align: middle;">
                    <div style="font-size: 7.5px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">ATTENDING DOCTOR</div>
                    <div style="font-size: 11.5px; font-weight: 800; color: #0f172a; line-height: 1.2;">${docName}</div>
                  </td>
                </tr>
              </table>
            </div>

            <!-- VITALS STRIP IF PRESENT -->
            ${hasVitals ? `
              <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 8px; margin-bottom: 6px; page-break-inside: avoid;">
                <div style="font-size: 8px; font-weight: 800; color: #003d46; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">
                  RECORDED VITALS & PHYSICAL MEASUREMENTS:
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 8px; font-size: 10.5px; font-weight: 700; color: #0f172a;">
                  ${bpVal ? `<div><span style="color: #64748b; font-weight: 600;">BP:</span> <b>${bpVal}</b> mmHg</div>` : ''}
                  ${pulseVal ? `<div><span style="color: #64748b; font-weight: 600;">Pulse:</span> <b>${pulseVal}</b> bpm</div>` : ''}
                  ${tempVal ? `<div><span style="color: #64748b; font-weight: 600;">Temp:</span> <b>${tempVal}</b> °F</div>` : ''}
                  ${spo2Val ? `<div><span style="color: #64748b; font-weight: 600;">SpO2:</span> <b>${spo2Val}</b>%</div>` : ''}
                  ${weightVal ? `<div><span style="color: #64748b; font-weight: 600;">Weight:</span> <b>${weightVal}</b> kg</div>` : ''}
                  ${heightVal ? `<div><span style="color: #64748b; font-weight: 600;">Height:</span> <b>${heightVal}</b> cm</div>` : ''}
                  ${bmiVal ? `<div><span style="color: #64748b; font-weight: 600;">BMI:</span> <b>${bmiVal}</b></div>` : ''}
                  ${rbsVal ? `<div><span style="color: #64748b; font-weight: 600;">RBS:</span> <b>${rbsVal}</b> mg/dL</div>` : ''}
                  ${rrVal ? `<div><span style="color: #64748b; font-weight: 600;">RR:</span> <b>${rrVal}</b> /min</div>` : ''}
                </div>
              </div>
            ` : ''}

            <!-- DYNAMIC CLINICAL NOTES SECTIONS (ONLY WHAT THE DOCTOR WROTE) -->

            <!-- 1. CHIEF COMPLAINTS -->
            ${complaintsText ? `
              <div class="clinical-card">
                <div class="clinical-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#003d46" stroke-width="2.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
                <div style="flex: 1;">
                  <div style="font-size: 8.5px; font-weight: 900; color: #003d46; text-transform: uppercase; letter-spacing: 0.5px;">CHIEF COMPLAINTS / PRESENTING SYMPTOMS</div>
                  <div style="font-size: 11px; font-weight: 700; color: #0f172a; margin-top: 1px; white-space: pre-wrap; line-height: 1.35;">${complaintsText}</div>
                </div>
              </div>
            ` : ''}

            <!-- 2. DOCUMENTED ALLERGIES -->
            ${allergiesText ? `
              <div class="clinical-card" style="border-left: 3px solid #ea580c;">
                <div class="clinical-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2.2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </div>
                <div style="flex: 1;">
                  <div style="font-size: 8.5px; font-weight: 900; color: #ea580c; text-transform: uppercase; letter-spacing: 0.5px;">DOCUMENTED ALLERGIES & DRUG SENSITIVITIES</div>
                  <div style="font-size: 11px; font-weight: 700; color: #7f1d1d; margin-top: 1px; white-space: pre-wrap;">${allergiesText}</div>
                </div>
              </div>
            ` : `
              <div style="padding: 2px 6px; margin-bottom: 4px; font-size: 9.5px; color: #166534; font-weight: 700; display: flex; align-items: center; gap: 4px;">
                <span>🛡️ Allergies:</span>
                <span>No Known Drug Allergies (NKDA)</span>
              </div>
            `}

            <!-- 3. CLINICAL & PAST MEDICAL HISTORY -->
            ${pastHist ? `
              <div class="clinical-card" style="border-left: 3px solid #16a34a;">
                <div class="clinical-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><polyline points="9 11 12 14 22 4"/></svg>
                </div>
                <div style="flex: 1;">
                  <div style="font-size: 8.5px; font-weight: 900; color: #16a34a; text-transform: uppercase; letter-spacing: 0.5px;">CLINICAL & PAST MEDICAL HISTORY</div>
                  <div style="font-size: 11px; font-weight: 700; color: #0f172a; margin-top: 1px; white-space: pre-wrap; line-height: 1.35;">${pastHist}</div>
                </div>
              </div>
            ` : ''}

            <!-- 4. DIAGNOSIS / CLINICAL IMPRESSION -->
            ${diag ? `
              <div class="clinical-card" style="border-left: 3px solid #dc2626; background-color: #fef2f2;">
                <div class="clinical-icon" style="background-color: #fee2e2;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                </div>
                <div style="flex: 1;">
                  <div style="font-size: 8.5px; font-weight: 900; color: #dc2626; text-transform: uppercase; letter-spacing: 0.5px;">DIAGNOSIS / CLINICAL IMPRESSION</div>
                  <div style="font-size: 11.5px; font-weight: 800; color: #0f172a; margin-top: 1px; white-space: pre-wrap;">${diag}</div>
                </div>
              </div>
            ` : ''}

            <!-- 5. EXAMINATION FINDINGS (O/E FINDINGS) -->
            ${examFindings ? `
              <div class="clinical-card" style="border-left: 3px solid #0d9488;">
                <div class="clinical-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </div>
                <div style="flex: 1;">
                  <div style="font-size: 8.5px; font-weight: 900; color: #0d9488; text-transform: uppercase; letter-spacing: 0.5px;">EXAMINATION FINDINGS (O/E FINDINGS)</div>
                  <div style="font-size: 10.5px; font-weight: 600; color: #0f172a; margin-top: 1px; line-height: 1.4; white-space: pre-wrap;">${examFindings}</div>
                </div>
              </div>
            ` : ''}

            <!-- 6. CLINICAL REMARKS, SUGGESTIONS & ADVICE -->
            ${advText ? `
              <div class="clinical-card" style="border-left: 3px solid #16a34a; margin-bottom: 6px;">
                <div class="clinical-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
                </div>
                <div style="flex: 1;">
                  <div style="font-size: 8.5px; font-weight: 900; color: #16a34a; text-transform: uppercase; letter-spacing: 0.5px;">CLINICAL REMARKS & ADVICE</div>
                  <div style="font-size: 10.5px; font-weight: 600; color: #0f172a; margin-top: 2px;">
                    ${adviceFormattedHtml}
                  </div>
                </div>
              </div>
            ` : ''}

            <!-- 7. INVESTIGATIONS ADVISED -->
            ${invStr ? `
              <div class="clinical-card" style="border-left: 3px solid #4338ca;">
                <div class="clinical-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4338ca" stroke-width="2.2"><path d="M10 2v7.31M14 2v7.31M8.5 2h7M14 9.3a6.5 6.5 0 1 1-4 0"/></svg>
                </div>
                <div style="flex: 1;">
                  <div style="font-size: 8.5px; font-weight: 900; color: #4338ca; text-transform: uppercase; letter-spacing: 0.5px;">INVESTIGATIONS / LAB & RADIOLOGY ADVISED</div>
                  <div style="font-size: 11px; font-weight: 700; color: #1e1b4b; margin-top: 1px;">${invStr}</div>
                </div>
              </div>
            ` : ''}

            <!-- 8. PLANNED SURGERY / ADMISSION IF ANY -->
            ${(planSurgeryNeeded || plannedSurgeryName) ? `
              <div class="clinical-card" style="border-left: 3px solid #ea580c; background-color: #fff7ed;">
                <div class="clinical-icon" style="background-color: #ffedd5;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2.2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/></svg>
                </div>
                <div style="flex: 1;">
                  <div style="font-size: 8.5px; font-weight: 900; color: #c2410c; text-transform: uppercase; letter-spacing: 0.5px;">PLANNED / ADVISED SURGERY</div>
                  <div style="font-size: 11.5px; font-weight: 800; color: #9a3412;">${plannedSurgeryName || 'Surgery Advised'} ${plannedSurgeryDate ? `(Date: ${plannedSurgeryDate})` : ''}</div>
                  ${plannedSurgeryNotes ? `<div style="font-size: 10px; font-weight: 600; color: #7c2d12; margin-top: 2px;">${plannedSurgeryNotes}</div>` : ''}
                </div>
              </div>
            ` : ''}

            ${(admitNeeded && admitNeeded !== 'No' && admitNeeded !== 'Not Required') ? `
              <div class="clinical-card" style="border-left: 3px solid #dc2626; background-color: #fef2f2;">
                <div class="clinical-icon" style="background-color: #fee2e2;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                </div>
                <div style="flex: 1;">
                  <div style="font-size: 8.5px; font-weight: 900; color: #dc2626; text-transform: uppercase; letter-spacing: 0.5px;">HOSPITALIZATION / ADMISSION ADVICE</div>
                  <div style="font-size: 11px; font-weight: 800; color: #991b1b;">Admission Advised ${admitWardType ? `[Ward: ${admitWardType}]` : ''}</div>
                  ${admitReason ? `<div style="font-size: 10px; font-weight: 600; color: #7f1d1d; margin-top: 2px;">Reason: ${admitReason}</div>` : ''}
                </div>
              </div>
            ` : ''}

            <!-- 9. FOLLOW-UP DATE IF ANY -->
            ${prescription.followUpDate ? `
              <div style="display: flex; align-items: center; gap: 6px; padding: 4px 8px; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 4px; margin-bottom: 6px; font-size: 10.5px; font-weight: 800; color: #047857;">
                <span>📅 Next Follow-Up Visit Date:</span>
                <span style="color: #065f46;">${prescription.followUpDate}</span>
              </div>
            ` : ''}

            <!-- 10. DRAWING / DIAGRAM -->
            ${drawImg ? `
              <div style="margin-top: 6px; margin-bottom: 6px; page-break-inside: avoid;">
                <div style="font-size: 8.5px; font-weight: 900; color: #7c3aed; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">CLINICAL DIAGRAM / ANNOTATIONS:</div>
                <div style="background: white; border: 1px solid #cbd5e1; border-radius: 4px; padding: 4px; text-align: center; display: inline-block;">
                  <img src="${drawImg}" style="max-height: 160px; max-width: 100%; display: block; margin: 0 auto; object-fit: contain;" />
                </div>
              </div>
            ` : ''}

            <!-- 11. ATTACHED PHOTOS -->
            ${(photoList && photoList.length > 0) ? `
              <div style="margin-top: 6px; margin-bottom: 6px; page-break-inside: avoid;">
                <div style="font-size: 8.5px; font-weight: 900; color: #2563eb; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">CLINICAL PHOTOS ATTACHED:</div>
                <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                  ${photoList.map((ph, idx) => `
                    <div style="border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden; background: white; text-align: center;">
                      <img src="${ph}" style="max-height: 120px; max-width: 160px; display: block; object-fit: contain; padding: 2px;" alt="Photo ${idx + 1}" />
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <!-- MEDICINE PRESCRIPTION TABLE -->
            <div style="margin-top: 6px;">
              <div style="display: flex; align-items: baseline; gap: 6px; margin-bottom: 2px;">
                <span style="font-family: 'Playfair Display', Georgia, serif; font-size: 22px; font-weight: 800; color: #003d46; line-height: 1;">Rx</span>
                <span style="font-size: 10px; font-style: italic; font-weight: 700; color: #003d46;">(Prescription / Medications)</span>
              </div>

              <table class="meds-table">
                <thead>
                  <tr>
                    <th style="width: 5%; text-align: center;">#</th>
                    <th style="width: 42%;">MEDICINE & STRENGTH</th>
                    <th style="width: 18%;">DOSAGE</th>
                    <th style="width: 20%;">FREQUENCY & TIMING</th>
                    <th style="width: 15%;">DURATION</th>
                  </tr>
                </thead>
                <tbody>
                  ${medContent}
                </tbody>
              </table>

              ${genInstructions ? `
                <div style="margin-top: 6px; padding: 5px 8px; background-color: #fefce8; border: 1px solid #fef08a; border-radius: 4px; page-break-inside: avoid;">
                  <div style="font-size: 8.5px; font-weight: 800; color: #854d0e; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">
                    ℹ GENERAL MEDICINE USE INSTRUCTIONS & PRECAUTIONS
                  </div>
                  <div style="font-size: 9.5px; color: #1e293b; white-space: pre-line; line-height: 1.35; font-weight: 600;">
                    ${genInstructions}
                  </div>
                </div>
              ` : ''}
            </div>
          </div>

          <!-- FOOTER / DIGITAL HEALTH RECORD & SIGNATURE -->
          <div style="margin-top: auto; padding-top: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 6px; page-break-inside: avoid;">
              <!-- Left: Digital Health Record -->
              <div style="width: 32%; padding-right: 8px; border-right: 1px solid #e2e8f0;">
                <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 3px;">
                  <div style="width: 18px; height: 18px; border-radius: 50%; background-color: #003d46; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0;">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <span style="font-size: 8.5px; font-weight: 900; color: #003d46; text-transform: uppercase; letter-spacing: 0.5px;">DIGITAL HEALTH RECORD</span>
                </div>
                <p style="font-size: 7.5px; color: #475569; margin: 0; line-height: 1.3; font-weight: 600;">
                  This document is an authorized clinical prescription registered under hospital safety guidelines.
                </p>
                <p style="font-size: 7.5px; color: #0f172a; margin-top: 2px; font-weight: 800;">
                  Valid for 7 days from prescription date.
                </p>
              </div>

              <!-- Center: SCAN TO QR Code -->
              <div style="width: 36%; display: flex; align-items: center; gap: 8px; padding: 0 8px; border-right: 1px solid #e2e8f0;">
                <div style="border: 1px solid #003d46; padding: 2px; border-radius: 4px; background: white; flex-shrink: 0;">
                  <img src="${patientQrCodeUrl}" style="width: 52px; height: 52px; display: block;" alt="Prescription QR" />
                </div>
                <div>
                  <div style="font-size: 8px; font-weight: 900; color: #003d46; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">SCAN TO</div>
                  <div style="font-size: 7.5px; font-weight: 700; color: #0f172a; display: flex; flex-direction: column; gap: 1.5px;">
                    <div style="display: flex; align-items: center; gap: 3px;"><span style="color: #003d46;">✔</span> Download Prescription</div>
                    <div style="display: flex; align-items: center; gap: 3px;"><span style="color: #003d46;">✔</span> View Reports</div>
                    <div style="display: flex; align-items: center; gap: 3px;"><span style="color: #003d46;">✔</span> Book Follow-up</div>
                  </div>
                </div>
              </div>

              <!-- Right: Doctor Signature -->
              <div style="width: 32%; text-align: right; display: flex; flex-direction: column; align-items: flex-end;">
                ${docSigUrl ? `
                  <img src="${docSigUrl}" style="max-height: 36px; margin-bottom: 2px; object-fit: contain;" alt="Doctor Signature" />
                ` : `
                  <div style="font-family: 'Great Vibes', cursive; font-size: 22px; color: #003d46; line-height: 1; margin-bottom: 2px;">
                    ${docName.replace(/^Dr\.\s*/i, '')}
                  </div>
                `}
                <div style="font-size: 10px; font-weight: 900; color: #003d46; text-transform: uppercase;">${docName}</div>
                <div style="font-size: 7.5px; font-weight: 800; color: #334155;">${docDegree}</div>
                <div style="font-size: 7.5px; font-weight: 700; color: #475569;">${docSpecialty}</div>
                ${docRegNo ? `<div style="font-size: 7px; font-weight: 700; color: #64748b;">Reg. No. ${docRegNo}</div>` : ''}
                <div style="font-size: 6.5px; font-weight: 600; color: #94a3b8; font-style: italic;">(Digital Signature)</div>
              </div>
            </div>

            <!-- BOTTOM HIGH CONTRAST FOOTER BANNER -->
            <div class="bottom-footer-banner" style="background-color: #f8fafc; color: #0f172a; border: 1px solid #005662; border-top: 2px solid #005662; border-radius: 4px; padding: 4px 8px; margin-top: 4px; page-break-inside: avoid;">
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                <!-- Left: 24/7 Helpline -->
                <div style="display: flex; align-items: center; gap: 5px; flex-shrink: 0;">
                  <div style="width: 22px; height: 22px; border-radius: 50%; border: 1.5px solid #005662; background-color: #f0fdfa; display: flex; align-items: center; justify-content: center; font-size: 7.5px; font-weight: 900; color: #005662; flex-shrink: 0;">
                    24/7
                  </div>
                  <div>
                    <div style="font-size: 7px; font-weight: 800; text-transform: uppercase; color: #0d9488;">EMERGENCY</div>
                    <div style="font-size: 8px; font-weight: 900; color: #003d46; letter-spacing: 0.3px;">SERVICES</div>
                  </div>
                </div>

                <!-- Center: Address, Phone, Email & Website -->
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; font-size: 7.5px; font-weight: 700; color: #0f172a; flex: 1; text-align: center;">
                  <div style="display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap;">
                    <span style="display: inline-flex; align-items: center; gap: 3px;">
                      <span style="color: #005662;">📍</span>
                      <span style="color: #334155;">${hospAddress}</span>
                    </span>
                    <span style="color: #cbd5e1;">|</span>
                    <span style="display: inline-flex; align-items: center; gap: 3px;">
                      <span style="color: #005662;">📞</span>
                      <span style="font-weight: 800; color: #003d46;">${hospPhone}</span>
                    </span>
                  </div>
                  <div style="display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap;">
                    <span style="display: inline-flex; align-items: center; gap: 3px;">
                      <span style="color: #005662;">✉️</span>
                      <span style="font-weight: 800; color: #003d46;">${hospEmail}</span>
                    </span>
                    <span style="color: #cbd5e1;">|</span>
                    <span style="display: inline-flex; align-items: center; gap: 3px;">
                      <span style="color: #005662;">🌐</span>
                      <span style="font-weight: 800; color: #003d46;">${hospWebsite}</span>
                    </span>
                  </div>
                </div>

                <!-- Google Review QR Code -->
                <div style="display: flex; align-items: center; gap: 5px; flex-shrink: 0;">
                  <div style="text-align: right;">
                    <div style="font-size: 7px; font-weight: 800; color: #ea580c;">⭐ Feedback</div>
                    <div style="font-size: 6.5px; color: #64748b;">Scan for Google Review</div>
                  </div>
                  <div style="background: white; padding: 1px; border-radius: 2px; border: 1px solid #cbd5e1;">
                    <img src="${googleReviewQrCodeUrl}" style="width: 24px; height: 24px; display: block;" alt="Google Review QR" />
                  </div>
                </div>
              </div>

              <!-- Tagline Line -->
              <div style="text-align: center; font-size: 7px; font-weight: 600; color: #005662; border-top: 1px solid #e2e8f0; margin-top: 3px; padding-top: 2px; font-style: italic;">
                Compassionate Care. Advanced Technology. Healthier Tomorrow.
              </div>
            </div>
          </div>
        </div>

        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print();
            }, 300);
          }
        </script>
      </body>
    </html>
  `;
}
