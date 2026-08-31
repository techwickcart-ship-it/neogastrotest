import { storage, STORAGE_KEYS } from './storage';

export interface DailyVitalEntry {
  id?: string;
  patientId?: string;
  patient_id?: string;
  timestamp?: string;
  date?: string;
  time?: string;
  bp?: string;
  pulse?: string;
  temp?: string;
  spo2?: string;
  rr?: string;
  weight?: string;
  height?: string;
  bmi?: string;
  cbs?: string;
  cbsContext?: string;
  inputOutput?: string;
  intakeOral?: string;
  intakeIV?: string;
  outputUrine?: string;
  outputDrain?: string;
  painScore?: string;
  painSite?: string;
  o2Support?: string;
  recordedBy?: string;
  nurseName?: string;
  customVitals?: { label: string; value: string; unit?: string }[];
}

export interface DoctorAdviceEntry {
  id?: string;
  date?: string;
  created_at?: string;
  authorName?: string;
  doctorName?: string;
  content: string;
  note_type?: string;
}

export const printDailyVitalsAndAdvice = (
  patient: any,
  bedInfo?: string,
  doctorName?: string
) => {
  if (!patient) return;

  const hospitalName = localStorage.getItem('hospital_name') || 'LIFELINE MULTISPECIALTY HOSPITAL';
  const hospitalSub = 'DEPARTMENT OF INPATIENT CARE & CLINICAL MONITORING';
  const hospitalAddress = localStorage.getItem('hospital_address') || 'Main Healthcare Blvd, Sector 4, Medical Enclave';
  const hospitalPhone = localStorage.getItem('hospital_phone') || 'Ph: +91 98765 43210 / Emergency: 108';

  // Read all vitals for this patient
  const allVitals: DailyVitalEntry[] = storage.get(STORAGE_KEYS.PATIENT_VITALS, []);
  const patientVitals = allVitals
    .filter((v: any) => 
      String(v.patientId || v.patient_id) === String(patient.id) || 
      (patient.mrn && v.patientMrn && String(v.patientMrn).toLowerCase() === String(patient.mrn).toLowerCase())
    )
    .sort((a, b) => new Date(b.timestamp || b.date || 0).getTime() - new Date(a.timestamp || a.date || 0).getTime());

  // Read clinical notes (Doctor Notes) for this patient
  const allNotes: any[] = storage.get((STORAGE_KEYS as any).CLINICAL_NOTES || 'hms_clinical_notes', []);
  const doctorNotes: DoctorAdviceEntry[] = allNotes
    .filter((n: any) => 
      (String(n.patientId || n.patient_id) === String(patient.id) || (patient.mrn && n.patientMrn && String(n.patientMrn).toLowerCase() === String(patient.mrn).toLowerCase())) &&
      (n.note_type === 'DOCTOR' || n.type === 'DOCTOR' || !n.note_type)
    )
    .sort((a, b) => new Date(b.created_at || b.date || 0).getTime() - new Date(a.created_at || a.date || 0).getTime());

  // Read prescriptions for this patient
  const allPrescriptions = storage.get(STORAGE_KEYS.PRESCRIPTIONS, []);
  const patientPrescriptions = allPrescriptions.filter((rx: any) => 
    String(rx.patientId || rx.patient_id) === String(patient.id) ||
    (patient.mrn && rx.patientMrn && String(rx.patientMrn).toLowerCase() === String(patient.mrn).toLowerCase())
  );

  const printWindow = window.open('', '_blank', 'width=900,height=1000');
  if (!printWindow) {
    alert('Please allow popup windows to generate the Daily Vitals & Doctor Advice Print sheet.');
    return;
  }

  const todayStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const vitalsRowsHtml = patientVitals.length > 0 ? patientVitals.map((v, idx) => {
    const dt = new Date(v.timestamp || v.date || Date.now()).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });

    const customTxt = Array.isArray(v.customVitals) && v.customVitals.length > 0
      ? v.customVitals.map(cv => `${cv.label}: ${cv.value} ${cv.unit || ''}`).join('; ')
      : '';

    return `
      <tr style="${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
        <td style="padding: 6px 8px; font-weight: 700; color: #0f172a; white-space: nowrap;">${dt}</td>
        <td style="padding: 6px 8px; font-weight: 800; color: #0369a1; text-align: center;">${v.bp || '—'}</td>
        <td style="padding: 6px 8px; font-weight: 800; color: #0d9488; text-align: center;">${v.pulse ? `${v.pulse} bpm` : '—'}</td>
        <td style="padding: 6px 8px; text-align: center;">${v.temp ? `${v.temp} °F` : '—'}</td>
        <td style="padding: 6px 8px; font-weight: 800; color: #047857; text-align: center;">${v.spo2 ? `${v.spo2}%` : '—'}</td>
        <td style="padding: 6px 8px; text-align: center;">${v.rr || '—'}</td>
        <td style="padding: 6px 8px; text-align: center;">${v.cbs ? `${v.cbs} mg/dL` : '—'}</td>
        <td style="padding: 6px 8px; text-align: center; font-size: 10px;">${v.inputOutput || (v.intakeOral || v.outputUrine ? `In: ${v.intakeOral || 0} / Out: ${v.outputUrine || 0}` : '—')}</td>
        <td style="padding: 6px 8px; font-size: 10px; color: #334155;">${customTxt || (v.painScore ? `Pain: ${v.painScore}/10` : 'Normal')}</td>
        <td style="padding: 6px 8px; font-size: 10px; color: #475569;">${v.recordedBy || v.nurseName || 'Nurse Station'}</td>
      </tr>
    `;
  }).join('') : `
    <tr>
      <td colspan="10" style="padding: 16px; text-align: center; color: #94a3b8; font-style: italic;">
        No vitals entries logged today. Select "Add Vitals" to enter measurements.
      </td>
    </tr>
  `;

  const doctorAdviceHtml = doctorNotes.length > 0 ? doctorNotes.map(n => {
    const noteDt = new Date(n.created_at || n.date || Date.now()).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const docAuthor = n.authorName || n.doctorName || doctorName || 'Attending Physician';
    return `
      <div style="margin-bottom: 10px; padding: 10px 12px; background-color: #f0f9ff; border-left: 4px solid #0284c7; border-radius: 6px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="font-weight: 800; font-size: 11px; color: #0369a1; text-transform: uppercase;">${docAuthor}</span>
          <span style="font-size: 10px; font-weight: 700; color: #64748b;">${noteDt}</span>
        </div>
        <div style="font-size: 11px; color: #0f172a; line-height: 1.45; white-space: pre-wrap;">${n.content}</div>
      </div>
    `;
  }).join('') : `
    <div style="padding: 12px; background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; text-align: center; color: #64748b; font-size: 11px;">
      No daily progress notes entered by physician yet. Standard ward clinical care maintained.
    </div>
  `;

  const prescriptionsHtml = patientPrescriptions.length > 0 ? patientPrescriptions.map(rx => {
    const rxDt = new Date(rx.date || rx.prescription_date || Date.now()).toLocaleDateString('en-IN');
    let meds: any[] = Array.isArray(rx.medicines) ? rx.medicines : [];
    return `
      <div style="margin-bottom: 8px; padding: 8px 10px; border: 1px solid #e2e8f0; border-radius: 6px;">
        <div style="display: flex; justify-content: space-between; font-size: 10px; font-weight: 800; color: #003d46; margin-bottom: 4px;">
          <span>Prescription Date: ${rxDt} (Dr. ${rx.doctor_name || rx.doctor || doctorName || 'Attending'})</span>
        </div>
        ${meds.map(m => `
          <div style="font-size: 10.5px; font-weight: 700; color: #1e293b; display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px dashed #f1f5f9;">
            <span>• ${m.name || m.medicineName}</span>
            <span style="color: #0369a1;">${m.dosage || ''} (${m.frequency || ''}) - ${m.duration || ''}</span>
          </div>
        `).join('')}
      </div>
    `;
  }).join('') : '';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Daily Patient Vitals & Doctor Advice - ${patient.name}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; color: #0f172a; font-size: 11px; background: white; }
          .header { text-align: center; border-bottom: 2px solid #003d46; padding-bottom: 8px; margin-bottom: 12px; }
          .title { font-size: 18px; font-weight: 900; color: #003d46; text-transform: uppercase; letter-spacing: 0.5px; }
          .subtitle { font-size: 11px; font-weight: 700; color: #0284c7; text-transform: uppercase; margin-top: 2px; }
          .hospital-info { font-size: 9.5px; color: #475569; margin-top: 2px; font-weight: 600; }
          
          .patient-box { display: flex; flex-wrap: wrap; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; margin-bottom: 14px; gap: 12px; }
          .field-group { flex: 1; min-width: 140px; }
          .field-label { font-size: 8.5px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
          .field-val { font-size: 11px; font-weight: 800; color: #0f172a; margin-top: 1px; }

          .section-title { font-size: 12px; font-weight: 900; color: #003d46; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; padding-bottom: 3px; border-bottom: 1.5px solid #003d46; display: flex; justify-content: space-between; align-items: center; }

          table.vitals-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 10.5px; }
          table.vitals-table th { background-color: #003d46; color: white; text-align: left; padding: 6px 8px; font-size: 9px; font-weight: 800; text-transform: uppercase; border: 1px solid #003d46; }
          table.vitals-table td { border: 1px solid #e2e8f0; vertical-align: middle; }

          .footer-sig { margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-end; page-break-inside: avoid; }
          .sig-box { text-align: center; width: 200px; border-top: 1px solid #94a3b8; padding-top: 4px; font-size: 10px; font-weight: 700; color: #334155; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${hospitalName}</div>
          <div class="subtitle">DAILY CLINICAL VITALS & DOCTOR'S ADVICE REPORT</div>
          <div class="hospital-info">${hospitalAddress} • ${hospitalPhone}</div>
        </div>

        <div class="patient-box">
          <div class="field-group">
            <div class="field-label">Patient Name</div>
            <div class="field-val">${patient.name || 'N/A'}</div>
          </div>
          <div class="field-group">
            <div class="field-label">MRN / Reg No</div>
            <div class="field-val">${patient.mrn || patient.registration_number || 'N/A'}</div>
          </div>
          <div class="field-group">
            <div class="field-label">Age / Gender</div>
            <div class="field-val">${patient.age ? `${patient.age} Yrs` : '30 Yrs'} / ${patient.gender || 'Male'}</div>
          </div>
          <div class="field-group">
            <div class="field-label">Bed / Ward Location</div>
            <div class="field-val" style="color: #0369a1;">${bedInfo || 'Ward Bed'}</div>
          </div>
          <div class="field-group">
            <div class="field-label">Attending Doctor</div>
            <div class="field-val">${doctorName || patient.attending_doctor_name || 'Dr. A. K. Verma'}</div>
          </div>
          <div class="field-group">
            <div class="field-label">Report Date</div>
            <div class="field-val" style="color: #047857;">${todayStr}</div>
          </div>
        </div>

        <!-- DAILY VITALS MONITORING HISTORY -->
        <div class="section-title">
          <span>📊 Daily Vitals & Physiological Parameters</span>
          <span style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: none;">(${patientVitals.length} Recordings Logged)</span>
        </div>

        <table class="vitals-table">
          <thead>
            <tr>
              <th style="width: 14%;">Date & Time</th>
              <th style="width: 10%; text-align: center;">BP (mmHg)</th>
              <th style="width: 10%; text-align: center;">Pulse (bpm)</th>
              <th style="width: 9%; text-align: center;">Temp (°F)</th>
              <th style="width: 9%; text-align: center;">SpO2 (%)</th>
              <th style="width: 8%; text-align: center;">RR (/min)</th>
              <th style="width: 11%; text-align: center;">CBS (Sugar)</th>
              <th style="width: 12%; text-align: center;">Intake/Output</th>
              <th style="width: 10%;">Special Notes</th>
              <th style="width: 7%;">Recorded By</th>
            </tr>
          </thead>
          <tbody>
            ${vitalsRowsHtml}
          </tbody>
        </table>

        <!-- DOCTOR'S DAILY ADVICE & CLINICAL NOTES -->
        <div class="section-title" style="margin-top: 16px;">
          <span>🩺 Doctor's Daily Advice & Clinical Progress Notes</span>
        </div>

        ${doctorAdviceHtml}

        ${prescriptionsHtml ? `
          <div class="section-title" style="margin-top: 16px;">
            <span>💊 Active Prescriptions & Medication Orders</span>
          </div>
          ${prescriptionsHtml}
        ` : ''}

        <!-- SIGNATURE FOOTER -->
        <div class="footer-sig">
          <div>
            <div style="font-size: 9px; color: #64748b; font-weight: 700;">Printed on: ${new Date().toLocaleString('en-IN')}</div>
            <div style="font-size: 8.5px; color: #94a3b8; font-style: italic;">Computer generated clinical progress statement • Lifeline HMS</div>
          </div>
          <div class="sig-box">
            Staff Nurse Signature
          </div>
          <div class="sig-box">
            Attending Doctor's Signature & Stamp
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 600);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
};
