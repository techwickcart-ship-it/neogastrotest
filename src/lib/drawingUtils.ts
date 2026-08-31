export const COMMON_DISEASES = [
  { id: 'dm', label: 'Diabetes (DM)', keyword: 'DM' },
  { id: 'htn', label: 'Hypertension (HTN)', keyword: 'HTN' },
  { id: 'asthma', label: 'Asthma/COPD', keyword: 'Asthma' },
  { id: 'thyroid', label: 'Thyroid', keyword: 'Thyroid' },
  { id: 'cad', label: 'Heart Disease (CAD)', keyword: 'CAD' },
  { id: 'ckd', label: 'CKD', keyword: 'CKD' },
  { id: 'tb', label: 'TB', keyword: 'TB' },
  { id: 'allergy', label: 'Allergy', keyword: 'Allergy' },
  { id: 'hepatitis', label: 'Jaundice/Hepatitis', keyword: 'Jaundice' },
  { id: 'surgery', label: 'Prior Surgery', keyword: 'Surgery' },
];

export const isDiseaseInHistory = (historyText: string, label: string, keyword: string): boolean => {
  if (!historyText) return false;
  const lower = historyText.toLowerCase();
  return lower.includes(label.toLowerCase()) || lower.includes(keyword.toLowerCase());
};

export const toggleDiseaseInHistory = (historyText: string, label: string, keyword: string): string => {
  if (isDiseaseInHistory(historyText, label, keyword)) {
    let result = historyText;
    const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regexLabel = new RegExp(`(,?\\s*${escapeRegExp(label)})|(,?\\s*${escapeRegExp(keyword)})`, 'gi');
    result = result.replace(regexLabel, '').trim();
    result = result.replace(/^,\s*/, '').replace(/,\s*$/, '').replace(/,\s*,/g, ',');
    return result;
  } else {
    if (!historyText || !historyText.trim()) {
      return label;
    } else {
      return `${historyText.trim()}, ${label}`;
    }
  }
};

export const calculateBMI = (weightKgStr: string, heightCmStr: string): string => {
  const w = parseFloat(weightKgStr);
  const h = parseFloat(heightCmStr);
  if (!isNaN(w) && w > 0 && !isNaN(h) && h > 0) {
    const heightM = h / 100;
    const bmiVal = (w / (heightM * heightM)).toFixed(1);
    let cat = '';
    const bmiNum = parseFloat(bmiVal);
    if (bmiNum < 18.5) cat = ' (Underweight)';
    else if (bmiNum < 25) cat = ' (Normal)';
    else if (bmiNum < 30) cat = ' (Overweight)';
    else cat = ' (Obese)';
    return `${bmiVal}${cat}`;
  }
  return '';
};

export type ShapeType = 
  | 'hexagram' 
  | 'rectangle' 
  | 'circle' 
  | 'triangle' 
  | 'arrow' 
  | 'line' 
  | 'cross'
  | 'anorectal_fistula'
  | 'stomach_gastro'
  | 'colon_rectum'
  | 'abdominal_grid'
  | 'fistula_tract'
  | 'hemorrhoid'
  | 'dentate_line'
  | 'sphincter_ring'
  | 'ulcer_mark';

export const drawPreaddedShapeOnCanvas = (
  canvas: HTMLCanvasElement | null, 
  shape: ShapeType, 
  color: string = '#1d4ed8', 
  width: number = 2, 
  onSave?: (dataUrl: string) => void
) => {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const w = canvas.width;
  const h = canvas.height;

  ctx.beginPath();
  if (shape === 'hexagram') {
    const r = 42;
    // Upward triangle
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r * Math.cos(Math.PI / 6), cy + r * Math.sin(Math.PI / 6));
    ctx.lineTo(cx - r * Math.cos(Math.PI / 6), cy + r * Math.sin(Math.PI / 6));
    ctx.closePath();
    ctx.stroke();

    // Downward triangle
    ctx.beginPath();
    ctx.moveTo(cx, cy + r);
    ctx.lineTo(cx + r * Math.cos(Math.PI / 6), cy - r * Math.sin(Math.PI / 6));
    ctx.lineTo(cx - r * Math.cos(Math.PI / 6), cy - r * Math.sin(Math.PI / 6));
    ctx.closePath();
    ctx.stroke();
  } else if (shape === 'rectangle') {
    ctx.strokeRect(cx - 60, cy - 40, 120, 80);
  } else if (shape === 'circle') {
    ctx.arc(cx, cy, 45, 0, 2 * Math.PI);
    ctx.stroke();
  } else if (shape === 'triangle') {
    ctx.moveTo(cx, cy - 45);
    ctx.lineTo(cx + 50, cy + 38);
    ctx.lineTo(cx - 50, cy + 38);
    ctx.closePath();
    ctx.stroke();
  } else if (shape === 'arrow') {
    ctx.moveTo(cx - 60, cy);
    ctx.lineTo(cx + 60, cy);
    ctx.lineTo(cx + 42, cy - 14);
    ctx.moveTo(cx + 60, cy);
    ctx.lineTo(cx + 42, cy + 14);
    ctx.stroke();
  } else if (shape === 'line') {
    ctx.moveTo(cx - 70, cy);
    ctx.lineTo(cx + 70, cy);
    ctx.stroke();
  } else if (shape === 'cross') {
    ctx.moveTo(cx - 35, cy);
    ctx.lineTo(cx + 35, cy);
    ctx.moveTo(cx, cy - 35);
    ctx.lineTo(cx, cy + 35);
    ctx.stroke();
  } else if (shape === 'anorectal_fistula') {
    // Fill background lightly so anatomical diagram stands out cleanly
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Anatomical Grid/Boundary Line
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;

    // 1. Levator Ani Muscles (Slanted wings extending upward on left & right)
    // Left Levator Ani
    ctx.beginPath();
    ctx.moveTo(cx - 180, cy - 80);
    ctx.quadraticCurveTo(cx - 100, cy - 50, cx - 70, cy - 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 190, cy - 65);
    ctx.quadraticCurveTo(cx - 110, cy - 35, cx - 80, cy + 5);
    ctx.stroke();

    // Right Levator Ani
    ctx.beginPath();
    ctx.moveTo(cx + 180, cy - 80);
    ctx.quadraticCurveTo(cx + 100, cy - 50, cx + 70, cy - 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 190, cy - 65);
    ctx.quadraticCurveTo(cx + 110, cy - 35, cx + 80, cy + 5);
    ctx.stroke();

    // 2. Rectum & Anal Canal Wall Contours
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    // Left Rectal Wall
    ctx.beginPath();
    ctx.moveTo(cx - 60, cy - 105);
    ctx.lineTo(cx - 60, cy - 30);
    ctx.quadraticCurveTo(cx - 50, cy, cx - 40, cy + 70);
    ctx.stroke();

    // Right Rectal Wall
    ctx.beginPath();
    ctx.moveTo(cx + 60, cy - 105);
    ctx.lineTo(cx + 60, cy - 30);
    ctx.quadraticCurveTo(cx + 50, cy, cx + 40, cy + 70);
    ctx.stroke();

    // 3. Internal Sphincter Muscle (Inner columns on left & right)
    ctx.fillStyle = 'rgba(226, 232, 240, 0.6)';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;

    // Left Internal Sphincter
    ctx.beginPath();
    ctx.roundRect(cx - 75, cy - 20, 22, 80, 8);
    ctx.fill();
    ctx.stroke();

    // Right Internal Sphincter
    ctx.beginPath();
    ctx.roundRect(cx + 53, cy - 20, 22, 80, 8);
    ctx.fill();
    ctx.stroke();

    // 4. External Sphincter Muscle (Outer columns)
    // Left External Sphincter
    ctx.beginPath();
    ctx.roundRect(cx - 115, cy - 20, 28, 90, 10);
    ctx.fill();
    ctx.stroke();

    // Right External Sphincter
    ctx.beginPath();
    ctx.roundRect(cx + 87, cy - 20, 28, 90, 10);
    ctx.fill();
    ctx.stroke();

    // 5. Dentate / Pectinate Line (Zigzag line across mid-canal)
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    const dentateY = cy + 15;
    ctx.moveTo(cx - 48, dentateY);
    for (let x = cx - 48; x <= cx + 48; x += 8) {
      ctx.lineTo(x + 4, dentateY + (x % 16 === 0 ? -6 : 6));
    }
    ctx.stroke();

    // 6. Anal Verge / Perianal Skin Contour (Bottom curve)
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 170, cy + 95);
    ctx.quadraticCurveTo(cx, cy + 75, cx + 170, cy + 95);
    ctx.stroke();

    // 7. Fistula Tract Guide Paths (Dashed lines showing potential fistula paths - matching screenshot 1)
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.5;

    // Intersphincteric / Transsphincteric Fistula Track Examples (Left side & Right side)
    ctx.strokeStyle = '#2563eb'; // Blue tract
    ctx.beginPath();
    ctx.moveTo(cx - 130, cy + 90);
    ctx.quadraticCurveTo(cx - 120, cy + 30, cx - 40, cy + 15);
    ctx.stroke();

    ctx.strokeStyle = '#d97706'; // Amber high tract
    ctx.beginPath();
    ctx.moveTo(cx + 140, cy + 90);
    ctx.quadraticCurveTo(cx + 130, cy - 20, cx + 58, cy - 25);
    ctx.stroke();
    ctx.restore();

    // 8. Text Labels & Callouts for Anatomical Clarity
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';

    ctx.fillText('RECTUM / LUMEN', cx, cy - 90);
    ctx.fillText('Levator Ani Muscle', cx - 140, cy - 65);
    ctx.fillText('Levator Ani Muscle', cx + 140, cy - 65);

    ctx.font = '9px sans-serif';
    ctx.fillStyle = '#dc2626';
    ctx.fillText('Dentate Line', cx, dentateY - 8);

    ctx.fillStyle = '#475569';
    ctx.fillText('Int. Sphincter', cx - 64, cy + 70);
    ctx.fillText('Int. Sphincter', cx + 64, cy + 70);
    ctx.fillText('Ext. Sphincter', cx - 100, cy + 82);
    ctx.fillText('Ext. Sphincter', cx + 100, cy + 82);

    ctx.fillText('Perianal Skin / Anal Verge', cx, cy + 110);

    ctx.restore();
  } else if (shape === 'stomach_gastro') {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;

    // Esophagus
    ctx.beginPath();
    ctx.moveTo(cx - 30, cy - 100);
    ctx.lineTo(cx - 30, cy - 50);
    ctx.moveTo(cx, cy - 100);
    ctx.lineTo(cx, cy - 50);
    ctx.stroke();

    // Fundus & Greater Curvature
    ctx.beginPath();
    ctx.moveTo(cx - 30, cy - 50);
    ctx.quadraticCurveTo(cx - 110, cy - 40, cx - 100, cy + 20);
    ctx.quadraticCurveTo(cx - 80, cy + 85, cx + 20, cy + 70);
    ctx.quadraticCurveTo(cx + 80, cy + 50, cx + 100, cy + 20);
    ctx.stroke();

    // Lesser Curvature & Pylorus
    ctx.beginPath();
    ctx.moveTo(cx, cy - 50);
    ctx.quadraticCurveTo(cx - 20, cy, cx + 30, cy + 20);
    ctx.lineTo(cx + 90, cy + 10);
    ctx.stroke();

    // Duodenum
    ctx.beginPath();
    ctx.moveTo(cx + 100, cy + 20);
    ctx.quadraticCurveTo(cx + 130, cy + 40, cx + 120, cy + 80);
    ctx.stroke();

    ctx.fillStyle = '#475569';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('Esophagus', cx - 50, cy - 75);
    ctx.fillText('Fundus', cx - 80, cy - 20);
    ctx.fillText('Body / Greater Curvature', cx - 70, cy + 40);
    ctx.fillText('Antrum', cx + 10, cy + 45);
    ctx.fillText('Pylorus / Duodenum', cx + 100, cy - 5);
    ctx.restore();
  } else if (shape === 'colon_rectum') {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2.5;

    // Transverse Colon
    ctx.beginPath();
    ctx.moveTo(cx - 120, cy - 50);
    ctx.quadraticCurveTo(cx, cy - 70, cx + 120, cy - 50);
    ctx.stroke();

    // Ascending Colon
    ctx.beginPath();
    ctx.moveTo(cx - 120, cy - 50);
    ctx.lineTo(cx - 120, cy + 40);
    ctx.quadraticCurveTo(cx - 120, cy + 70, cx - 140, cy + 70); // Cecum
    ctx.stroke();

    // Descending Colon
    ctx.beginPath();
    ctx.moveTo(cx + 120, cy - 50);
    ctx.lineTo(cx + 120, cy + 40);
    ctx.stroke();

    // Sigmoid & Rectum
    ctx.beginPath();
    ctx.moveTo(cx + 120, cy + 40);
    ctx.quadraticCurveTo(cx + 90, cy + 80, cx + 30, cy + 65);
    ctx.lineTo(cx + 30, cy + 95);
    ctx.moveTo(cx + 10, cy + 65);
    ctx.lineTo(cx + 10, cy + 95);
    ctx.stroke();

    ctx.fillStyle = '#475569';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('Transverse Colon', cx - 40, cy - 75);
    ctx.fillText('Ascending Colon', cx - 180, cy);
    ctx.fillText('Descending Colon', cx + 130, cy);
    ctx.fillText('Cecum', cx - 170, cy + 65);
    ctx.fillText('Sigmoid & Rectum', cx + 40, cy + 85);
    ctx.restore();
  } else if (shape === 'abdominal_grid') {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;

    // Torso outline
    ctx.strokeRect(cx - 150, cy - 100, 300, 200);

    // 9 Quadrant Grid lines
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    // Vertical lines
    ctx.moveTo(cx - 50, cy - 100);
    ctx.lineTo(cx - 50, cy + 100);
    ctx.moveTo(cx + 50, cy - 100);
    ctx.lineTo(cx + 50, cy + 100);

    // Horizontal lines
    ctx.moveTo(cx - 150, cy - 33);
    ctx.lineTo(cx + 150, cy - 33);
    ctx.moveTo(cx - 150, cy + 33);
    ctx.lineTo(cx + 150, cy + 33);
    ctx.stroke();

    ctx.fillStyle = '#475569';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';

    ctx.fillText('Right Hypochondrium (RUQ)', cx - 100, cy - 60);
    ctx.fillText('Epigastrium', cx, cy - 60);
    ctx.fillText('Left Hypochondrium (LUQ)', cx + 100, cy - 60);

    ctx.fillText('Right Lumbar', cx - 100, cy);
    ctx.fillText('Umbilical Region', cx, cy);
    ctx.fillText('Left Lumbar', cx + 100, cy);

    ctx.fillText('Right Iliac Fossa (RLQ)', cx - 100, cy + 60);
    ctx.fillText('Hypogastrium / Suprapubic', cx, cy + 60);
    ctx.fillText('Left Iliac Fossa (LLQ)', cx + 100, cy + 60);
    ctx.restore();
  } else if (shape === 'fistula_tract') {
    ctx.save();
    ctx.strokeStyle = color || '#dc2626';
    ctx.lineWidth = width > 2 ? width : 3;

    ctx.beginPath();
    ctx.moveTo(cx - 50, cy + 60);
    ctx.quadraticCurveTo(cx - 40, cy, cx, cy - 20);
    ctx.stroke();

    // Opening circles at external and internal ends
    ctx.fillStyle = color || '#dc2626';
    ctx.beginPath();
    ctx.arc(cx - 50, cy + 60, 4, 0, Math.PI * 2);
    ctx.arc(cx, cy - 20, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('Fistula Tract', cx - 35, cy + 20);
    ctx.restore();
  } else if (shape === 'hemorrhoid') {
    ctx.save();
    ctx.fillStyle = 'rgba(225, 29, 72, 0.4)';
    ctx.strokeStyle = '#e11d48';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.ellipse(cx, cy, 22, 14, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#e11d48';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('Hemorrhoidal Mass', cx - 30, cy + 22);
    ctx.restore();
  } else if (shape === 'dentate_line') {
    ctx.save();
    ctx.strokeStyle = color || '#dc2626';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(cx - 80, cy);
    for (let x = cx - 80; x <= cx + 80; x += 10) {
      ctx.lineTo(x + 5, cy + (x % 20 === 0 ? -8 : 8));
    }
    ctx.stroke();

    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('Dentate Line', cx - 25, cy + 18);
    ctx.restore();
  } else if (shape === 'sphincter_ring') {
    ctx.save();
    ctx.strokeStyle = color || '#2563eb';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.ellipse(cx, cy, 65, 35, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.ellipse(cx, cy, 45, 22, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#2563eb';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('Sphincter Ring Contour', cx - 40, cy + 32);
    ctx.restore();
  } else if (shape === 'ulcer_mark') {
    ctx.save();
    ctx.fillStyle = 'rgba(234, 88, 12, 0.35)';
    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(cx - 15, cy - 10);
    ctx.lineTo(cx + 10, cy - 18);
    ctx.lineTo(cx + 20, cy + 5);
    ctx.lineTo(cx + 5, cy + 18);
    ctx.lineTo(cx - 18, cy + 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ea580c';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('Ulcer / Mucosal Erosion', cx - 40, cy + 24);
    ctx.restore();
  }

  if (onSave) {
    try {
      // Use compressed JPEG where possible to conserve localStorage quota
      const compressedUrl = canvas.toDataURL('image/jpeg', 0.7);
      onSave(compressedUrl);
    } catch {
      onSave(canvas.toDataURL());
    }
  }
};

