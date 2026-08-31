import { 
  TestCategory, 
  TestSubCategory, 
  InvestigationTest, 
  Parameter, 
  LabUnit, 
  AgeGenderReferenceRange, 
  CriticalValueConfig,
  LISResultRecord,
  HomeCollectionBooking,
  FranchiseCollectionCenter,
  ReferralDoctor
} from './listTypes';
import { 
  PATHOLOGY_MASTER_INVESTIGATIONS, 
  PATHOLOGY_CATEGORIES, 
  PATHOLOGY_SUBCATEGORIES, 
  PATHOLOGY_PARAMETERS, 
  PATHOLOGY_REFERENCE_RANGES 
} from '@/data/pathologyMasterList';
import {
  RADIOLOGY_MASTER_INVESTIGATIONS,
  RADIOLOGY_CATEGORIES,
  RADIOLOGY_SUBCATEGORIES,
  RADIOLOGY_PARAMETERS
} from '@/data/radiologyMasterList';

export const MOCK_CATEGORIES: TestCategory[] = [
  ...PATHOLOGY_CATEGORIES,
  ...RADIOLOGY_CATEGORIES,
  { id: 'CAT-TXC', name: 'Toxicology', description: 'Heavy metals, drug of abuse panels, and medical toxicity profiles.', status: 'Active' }
];

export const MOCK_SUBCATEGORIES: TestSubCategory[] = [
  ...PATHOLOGY_SUBCATEGORIES,
  ...RADIOLOGY_SUBCATEGORIES
];

export const MOCK_UNITS: LabUnit[] = [
  { id: 'U-GDL', name: 'grams per deciliter', symbol: 'g/dL' },
  { id: 'U-MGDL', name: 'milligrams per deciliter', symbol: 'mg/dL' },
  { id: 'U-IUL', name: 'International Units per Liter', symbol: 'IU/L' },
  { id: 'U-MIUL', name: 'milli-International Units per Liter', symbol: 'mIU/L' },
  { id: 'U-NGML', name: 'nanograms per milliliter', symbol: 'ng/mL' },
  { id: 'U-PGML', name: 'picograms per milliliter', symbol: 'pg/mL' },
  { id: 'U-MMOLL', name: 'millimoles per Liter', symbol: 'mmol/L' },
  { id: 'U-CELLS', name: 'cells per cubic millimeter', symbol: 'cells/cumm' },
  { id: 'U-LAKHS', name: 'lakhs per cubic millimeter', symbol: 'lakh/cumm' },
  { id: 'U-PCT', name: 'percentage', symbol: '%' },
  { id: 'U-RATIO', name: 'ratio', symbol: 'ratio' },
  { id: 'U-SEC', name: 'seconds', symbol: 'sec' },
  { id: 'U-MMHR', name: 'millimeters per hour', symbol: 'mm/hr' },
  { id: 'U-FL', name: 'femtoliters', symbol: 'fL' },
  { id: 'U-PG', name: 'picograms', symbol: 'pg' },
  { id: 'U-CFUML', name: 'colony forming units per mL', symbol: 'CFU/mL' },
  { id: 'U-IUML', name: 'International Units per mL', symbol: 'IU/mL' },
  { id: 'U-COPIESML', name: 'copies per mL', symbol: 'copies/mL' },
  { id: 'U-IS', name: 'International Scale %', symbol: 'IS %' },
  { id: 'U-UGDL', name: 'micrograms per deciliter', symbol: 'µg/dL' },
  { id: 'U-UGML', name: 'micrograms per milliliter', symbol: 'µg/mL FEU' },
  { id: 'U-UIUML', name: 'micro-International Units per mL', symbol: 'µIU/mL' },
  { id: 'U-HPF', name: 'per High Power Field', symbol: '/HPF' },
  { id: 'U-MGG', name: 'milligrams per gram', symbol: 'mg/g' },
  { id: 'U-MG24H', name: 'milligrams per 24 hours', symbol: 'mg/24 h' }
];

export const MOCK_INVESTIGATIONS: InvestigationTest[] = [
  ...PATHOLOGY_MASTER_INVESTIGATIONS,
  ...RADIOLOGY_MASTER_INVESTIGATIONS
];

export const MOCK_PARAMETERS: Parameter[] = [
  ...PATHOLOGY_PARAMETERS,
  ...RADIOLOGY_PARAMETERS
];

export const MOCK_REFERENCE_RANGES: AgeGenderReferenceRange[] = [
  ...PATHOLOGY_REFERENCE_RANGES
];

export const MOCK_CRITICALS: CriticalValueConfig[] = [
  { id: 'C01', parameterId: 'P-HB', lowCritical: 5.0, highCritical: 20.0, alertMessage: 'HEMOGLOBIN CRITICALLY LOW! Suggests acute clinical anemia. Transfusion trigger alert.' },
  { id: 'C02', parameterId: 'P-PLT', lowCritical: 0.20, highCritical: 9.0, alertMessage: 'THROMBOCYTOPENIA CRISIS! High risk of spontaneous internal bleed.' },
  { id: 'C03', parameterId: 'P-S_POT', lowCritical: 2.8, highCritical: 6.2, alertMessage: 'POTASSIUM ARRHYTHMIA WARNING! Risk of cardiac sudden collapse.' },
  { id: 'C04', parameterId: 'P-CREAT', lowCritical: 0.2, highCritical: 3.8, alertMessage: 'RENAL FAILURE RISK! Serum Creatinine levels indicate potential uremia overload.' },
  { id: 'C05', parameterId: 'P-TSH', lowCritical: 0.05, highCritical: 25.0, alertMessage: 'THYROID THYROTOXICOSIS / MYXEDEMA ALERT! Serious metabolic distress.' }
];

// Sample metadata representing 500 pathology items spanning all diagnostic systems (index-structure)
export const PATHOLOGY_500_DESCRIPTIONS: { code: string, name: string, category: string, subCategory: string, method: string, sample: string }[] = [
  { code: 'HEM001', name: 'Complete Blood Count (CBC) with diff', category: 'Hematology', subCategory: 'General Cells', method: 'VCS Flow Cytometry', sample: 'EDTA Blood' },
  { code: 'HEM002', name: 'Erythrocyte Sedimentation Rate (ESR)', category: 'Hematology', subCategory: 'ESR Panel', method: 'Westergren Method', sample: 'EDTA Blood' },
  { code: 'HEM003', name: 'Peripheral Smear Examination', category: 'Hematology', subCategory: 'Morphology', method: 'Manual Microscopy Leishman Stain', sample: 'Smear slide' },
  { code: 'HEM004', name: 'Reticulocyte Count', category: 'Hematology', subCategory: 'Reticulocytes', method: 'Supravital Staining Counter', sample: 'EDTA Blood' },
  { code: 'HEM005', name: 'Sickle Cell Preparation', category: 'Hematology', subCategory: 'Hemoglobins', method: 'Sodium Metabisulfite Slide', sample: 'Whole Blood' },
  { code: 'HEM006', name: 'G6PD Quality Screening', category: 'Hematology', subCategory: 'Enzymes', method: 'Visual Methemoglobin Reduction', sample: 'Heparinized Blood' },
  { code: 'HEM007', name: 'Absolute Eosinophil Count (AEC)', category: 'Hematology', subCategory: 'Diff Cells', method: 'Hemocytometer / Laser Counter', sample: 'EDTA Blood' },
  { code: 'HEM008', name: 'Osmotic Fragility Test', category: 'Hematology', subCategory: 'RBC Fragility', method: 'Buffered Saline Dilution Series', sample: 'Heparinized Blood' },
  { code: 'HEM009', name: 'LE Cell Phenotyping', category: 'Hematology', subCategory: 'Autoimmune', method: 'Slide Smear Smudge', sample: 'Defibrinated Blood' },
  { code: 'HEM010', name: 'Bone Marrow Aspirate Study', category: 'Hematology', subCategory: 'Marrow', method: 'Wright-Giemsa Cytochemistry', sample: 'Marrow biopsy' },
  { code: 'HEM011', name: 'Automated Differential (DLC 5-Part)', category: 'Hematology', subCategory: 'Diff Cells', method: 'Automated Flow Cytometry', sample: 'EDTA Blood' },
  { code: 'COA001', name: 'Prothrombin Time (PT-INR)', category: 'Coagulation Studies', subCategory: 'Clotting', method: 'Electromagnetic Clot Detection', sample: 'Sodium Citrate Plasma' },
  { code: 'COA002', name: 'Activated Partial Thromboplastin Time (aPTT)', category: 'Coagulation Studies', subCategory: 'Clotting', method: 'Nephelometric Clot Sensor', sample: 'Sodium Citrate Plasma' },
  { code: 'COA003', name: 'Fibrinogen Activity Assay', category: 'Coagulation Studies', subCategory: 'Fibrin', method: 'Clauss Chronometric Method', sample: 'Sodium Citrate Plasma' },
  { code: 'COA004', name: 'D-Dimer Level', category: 'Coagulation Studies', subCategory: 'Fibrinolysis', method: 'Quantitative Turbidimetric latex', sample: 'Sodium Citrate Plasma' },
  { code: 'COA005', name: 'Thrombin Time (TT)', category: 'Coagulation Studies', subCategory: 'Clotting', method: 'Enzymatic addition clot time', sample: 'Sodium Citrate Plasma' },
  { code: 'BIO001', name: 'Blood Glucose Fasting (F)', category: 'Biochemistry', subCategory: 'Glucose', method: 'GOD-POD Enzymatic', sample: 'Fluoride Plasma' },
  { code: 'BIO002', name: 'Blood Glucose Post Prandial (PP)', category: 'Biochemistry', subCategory: 'Glucose', method: 'GOD-POD Hexokinase', sample: 'Fluoride Plasma' },
  { code: 'BIO003', name: 'Blood Glucose Random (R)', category: 'Biochemistry', subCategory: 'Glucose', method: 'Sensor strip / Hexokinase', sample: 'Plasma/Whole blood' },
  { code: 'BIO004', name: 'Oral Glucose Tolerance Test (OGTT)', category: 'Biochemistry', subCategory: 'Glucose', method: 'Multi-point Colorimetric GOD', sample: 'Fluoride Series' },
  { code: 'BIO005', name: 'Glycated Albumin', category: 'Biochemistry', subCategory: 'Glycation', method: 'Enzymatic colorimetric', sample: 'Serum' },
  { code: 'BIO006', name: 'Serum Bilirubin Total & Fractions', category: 'Biochemistry', subCategory: 'Liver Profile', method: 'Jendrassik-Grof Diazo Reaction', sample: 'Serum' },
  { code: 'BIO007', name: 'SGOT (Aspartate Aminotransferase)', category: 'Biochemistry', subCategory: 'Liver Profile', method: 'IFCC UV modification kinetic', sample: 'Serum' },
  { code: 'BIO008', name: 'SGPT (Alanine Aminotransferase)', category: 'Biochemistry', subCategory: 'Liver Profile', method: 'IFCC UV Rate Assay', sample: 'Serum' },
  { code: 'BIO009', name: 'Alkaline Phosphatase (ALP)', category: 'Biochemistry', subCategory: 'Liver Profile', method: 'pNPP Kinetic Assay', sample: 'Serum' },
  { code: 'BIO010', name: 'Gamma Glutamyl Transferase (GGT)', category: 'Biochemistry', subCategory: 'Liver Profile', method: 'Szasz Substrate Kinetic', sample: 'Serum' },
  { code: 'BIO011', name: 'Lactate Dehydrogenase (LDH)', category: 'Biochemistry', subCategory: 'Enzymes', method: 'Pyruvate-Lactate UV Speed', sample: 'Serum' },
  { code: 'BIO012', name: 'Serum Amylase Activity', category: 'Biochemistry', subCategory: 'Pancreas', method: 'Blocked G7-CNP Direct Rate', sample: 'Serum' },
  { code: 'BIO013', name: 'Serum Lipase Activity', category: 'Biochemistry', subCategory: 'Pancreas', method: 'Methyl Resorufin Colorimetric', sample: 'Serum' },
  { code: 'BIO014', name: 'Serum Total Proteins & A/G ratio', category: 'Biochemistry', subCategory: 'Proteins', method: 'Biuret & Bromocresol Green', sample: 'Serum' },
  { code: 'BIO015', name: 'Serum Albumin', category: 'Biochemistry', subCategory: 'Proteins', method: 'Bromocresol Green Dye binding', sample: 'Serum' },
  { code: 'BIO016', name: 'Serum Globulin Estimation', category: 'Biochemistry', subCategory: 'Proteins', method: 'Mathematical subtraction calculation', sample: 'Serum' },
  { code: 'BIO017', name: 'Blood Urea Nitrogen (BUN)', category: 'Biochemistry', subCategory: 'Kidney Profile', method: 'Urease GLDH Spectrometric', sample: 'Serum' },
  { code: 'BIO018', name: 'Serum Creatinine with eGFR Rate', category: 'Biochemistry', subCategory: 'Kidney Profile', method: 'Modified Jaffe Kinetic / Enzymatic', sample: 'Serum' },
  { code: 'BIO019', name: 'Serum Uric Acid Profile', category: 'Biochemistry', subCategory: 'Kidney Profile', method: 'Uricase PAP enzymatic', sample: 'Serum' },
  { code: 'BIO020', name: 'Serum Cystatin C', category: 'Biochemistry', subCategory: 'Kidney Profile', method: 'PETIA Immunoturbidimetric', sample: 'Serum' },
  { code: 'BIO021', name: 'Electrolytes Panel (Na+, K+, Cl-)', category: 'Biochemistry', subCategory: 'Electrolytes', method: 'Indirect Ion-Selective Electrode', sample: 'Serum' },
  { code: 'BIO022', name: 'Serum Calcium Total with Ionized', category: 'Biochemistry', subCategory: 'Minerals', method: 'Arsenazo III Binding / Ion Sensor', sample: 'Serum / Whole heparin' },
  { code: 'BIO023', name: 'Serum Inorganic Phosphorus', category: 'Biochemistry', subCategory: 'Minerals', method: 'Phosphomolybdate Coloration', sample: 'Serum' },
  { code: 'BIO024', name: 'Serum Magnesium Level', category: 'Biochemistry', subCategory: 'Minerals', method: 'Xylidyl Blue complex spectrophotometry', sample: 'Serum' },
  { code: 'BIO025', name: 'Total Cholesterol', category: 'Biochemistry', subCategory: 'Lipid Profile', method: 'CHOD-PAP enzymatic endpoints', sample: 'Serum' },
  { code: 'BIO026', name: 'Triglycerides Level', category: 'Biochemistry', subCategory: 'Lipid Profile', method: 'GPO-PAP Colorimetric detection', sample: 'Serum' },
  { code: 'BIO027', name: 'HDL Cholesterol direct clearance', category: 'Biochemistry', subCategory: 'Lipid Profile', method: 'Immunoinhibition enzymatic', sample: 'Serum' },
  { code: 'BIO028', name: 'LDL Cholesterol calculated/direct', category: 'Biochemistry', subCategory: 'Lipid Profile', method: 'Friedewald formula / Direct Clearance', sample: 'Serum' },
  { code: 'BIO029', name: 'Apolipoprotein A-1 Assay', category: 'Biochemistry', subCategory: 'Cardiovascular', method: 'Immunoturbidimetry assay', sample: 'Serum' },
  { code: 'BIO030', name: 'Apolipoprotein B Assay', category: 'Biochemistry', subCategory: 'Cardiovascular', method: 'Immunoturbidimetric calculation', sample: 'Serum' },
  { code: 'BIO031', name: 'Lipoprotein(a) [Lp(a)] Level', category: 'Biochemistry', subCategory: 'Cardiovascular', method: 'Latex agglutination immuno', sample: 'Serum' },
  { code: 'BIO032', name: 'Serum Iron Profile (Iron, TIBC, Saturation)', category: 'Biochemistry', subCategory: 'Anemia Panel', method: 'Ferrozine chromogen binding', sample: 'Serum' },
  { code: 'BIO033', name: 'Total Iron Binding Capacity (TIBC)', category: 'Biochemistry', subCategory: 'Anemia Panel', method: 'Carbonate saturation calculation', sample: 'Serum' },
  { code: 'BIO034', name: 'Serum Ferritin Assay', category: 'Biochemistry', subCategory: 'Anemia Panel', method: 'Chemiluminescent Immunometric', sample: 'Serum' },
  { code: 'BIO035', name: 'Serum Transferrin Level', category: 'Biochemistry', subCategory: 'Anemia Panel', method: 'Turbidimetric nephelometric', sample: 'Serum' },
  { code: 'IMM001', name: 'TSH (Thyroid Stimulating Hormone)', category: 'Immunology & Hormones', subCategory: 'Thyroid', method: 'Ultra-sensitive Sandwich CLIA', sample: 'Serum' },
  { code: 'IMM002', name: 'Free Triiodothyronine (FT3)', category: 'Immunology & Hormones', subCategory: 'Thyroid', method: 'Competitive Immunoassay CLIA', sample: 'Serum' },
  { code: 'IMM003', name: 'Free Thyroxine (FT4)', category: 'Immunology & Hormones', subCategory: 'Thyroid', method: 'CLIA Competitive displacement', sample: 'Serum' },
  { code: 'IMM004', name: 'Anti-TPO (Thyroid Peroxidase Antibodies)', category: 'Immunology & Hormones', subCategory: 'Autoimmune Thyroid', method: 'CLIA Sandwich reaction', sample: 'Serum' },
  { code: 'IMM005', name: 'Anti-Thyroglobulin Antibody (ATG)', category: 'Immunology & Hormones', subCategory: 'Autoimmune Thyroid', method: 'CLIA detection', sample: 'Serum' },
  { code: 'IMM006', name: 'Luteinizing Hormone (LH)', category: 'Immunology & Hormones', subCategory: 'Fertility Panel', method: 'Chemiluminescence Immunoassay', sample: 'Serum' },
  { code: 'IMM007', name: 'FSH (Follicle Stimulating Hormone)', category: 'Immunology & Hormones', subCategory: 'Fertility Panel', method: 'Chemiluminescence CLIA', sample: 'Serum' },
  { code: 'IMM008', name: 'Serum Prolactin Level', category: 'Immunology & Hormones', subCategory: 'Fertility Panel', method: 'One-step Sandwich immuno', sample: 'Serum' },
  { code: 'IMM009', name: 'Progesterone Assay', category: 'Immunology & Hormones', subCategory: 'Fertility Panel', method: 'Competitive binding CLIA', sample: 'Serum' },
  { code: 'IMM010', name: 'Estradiol (E2) Levels', category: 'Immunology & Hormones', subCategory: 'Fertility Panel', method: 'Competitive Immunometric', sample: 'Serum' },
  { code: 'IMM011', name: 'Beta-hCG Quantitative', category: 'Immunology & Hormones', subCategory: 'Pregnancy Hormones', method: 'Sandwich Immunoassay CLIA', sample: 'Serum' },
  { code: 'IMM012', name: 'Testosterone Total', category: 'Immunology & Hormones', subCategory: 'Androgens', method: 'Competitive binding CLIA', sample: 'Serum' },
  { code: 'IMM013', name: 'Free Testosterone Profile', category: 'Immunology & Hormones', subCategory: 'Androgens', method: 'Equilibrium Dialysis / ELISA', sample: 'Serum' },
  { code: 'IMM014', name: 'DHEA-S (Dehydroepiandrosterone Sulfate)', category: 'Immunology & Hormones', subCategory: 'Androgens', method: 'Competitive Chemiluminescent', sample: 'Serum' },
  { code: 'IMM015', name: 'Cortisol (Fasting or Diurnal)', category: 'Immunology & Hormones', subCategory: 'Adrenal Panel', method: 'CLIA Solid phase competitive', sample: 'Serum' },
  { code: 'IMM016', name: 'Vitamin D3 (25-Hydroxycalciferol)', category: 'Immunology & Hormones', subCategory: 'Vitamins', method: 'Competitive CLIA / LC-MSMS', sample: 'Serum' },
  { code: 'IMM017', name: 'Vitamin B12 Assay', category: 'Immunology & Hormones', subCategory: 'Vitamins', method: 'Competitive binding CLIA', sample: 'Serum' },
  { code: 'IMM018', name: 'Intact PTH (Parathyroid Hormone)', category: 'Immunology & Hormones', subCategory: 'Minerals', method: 'Two-site Immunometric CLIA', sample: 'EDTA Plasma / Serum' },
  { code: 'IMM019', name: 'Folate (Serum/RBC)', category: 'Immunology & Hormones', subCategory: 'Vitamins', method: 'Competitive enzymatic binding', sample: 'Serum / EDTA' },
  { code: 'IMM020', name: 'PSA Total (Prostate Specific Antigen)', category: 'Immunology & Hormones', subCategory: 'Tumor Markers', method: 'Two-site Sandwich CLIA', sample: 'Serum' },
  { code: 'IMM021', name: 'PSA Free fraction with ratio', category: 'Immunology & Hormones', subCategory: 'Tumor Markers', method: 'Chemiluminescent sandwich', sample: 'Serum' },
  { code: 'IMM022', name: 'CA 125 (Ovarian Cancer Antigen)', category: 'Immunology & Hormones', subCategory: 'Tumor Markers', method: 'One-step Sandwich immunometric', sample: 'Serum' },
  { code: 'IMM023', name: 'CA 15-3 (Breast Cancer Antigen)', category: 'Immunology & Hormones', subCategory: 'Tumor Markers', method: 'CLIA Immunochemical reaction', sample: 'Serum' },
  { code: 'IMM024', name: 'CA 19-9 (Gastrointestinal Marker)', category: 'Immunology & Hormones', subCategory: 'Tumor Markers', method: 'Chemiluminescence CLIA', sample: 'Serum' },
  { code: 'IMM025', name: 'Carcinoembryonic Antigen (CEA)', category: 'Immunology & Hormones', subCategory: 'Tumor Markers', method: 'Solid-phase Sandwich CLIA', sample: 'Serum' },
  { code: 'IMM026', name: 'AFP (Alpha-Fetoprotein Tumor)', category: 'Immunology & Hormones', subCategory: 'Tumor Markers', method: 'Two-site immunochemical', sample: 'Serum' },
  { code: 'IMM027', name: 'Beta-2 Microglobulin Level', category: 'Immunology & Hormones', subCategory: 'Tumor Markers', method: 'PETIA immunoturbidimetric', sample: 'Serum / Urine' },
  { code: 'SER001', name: 'C-Reactive Protein (CRP) Quantitative', category: 'Serology', subCategory: 'Inflammatory', method: 'High-sensitivity Latex Turbidimetry', sample: 'Serology Serum' },
  { code: 'SER002', name: 'Rheumatoid Factor (RF) Quant', category: 'Serology', subCategory: 'Inflammatory', method: 'nephelometric immunoturbidimetric', sample: 'Serum' },
  { code: 'SER003', name: 'ASO Titre (Anti-Streptolysin O)', category: 'Serology', subCategory: 'Infections', method: 'Latex agglutination quantitative', sample: 'Serum' },
  { code: 'SER004', name: 'Widal Agglutination Slide / Tube', category: 'Serology', subCategory: 'Infections', method: 'O & H Salmonella antigens serum speed', sample: 'Serum' },
  { code: 'SER005', name: 'VDRL / RPR Syphilis test', category: 'Serology', subCategory: 'Infections', method: 'Flocculation qualitative reaction', sample: 'Serum' },
  { code: 'SER006', name: 'HIV 1 & 2 ELISA screening', category: 'Serology', subCategory: 'Viruses', method: '4th Generation Antigen/Antibody ELISA', sample: 'Serum' },
  { code: 'SER007', name: 'HBsAg (Hepatitis B Surface Antigen)', category: 'Serology', subCategory: 'Viruses', method: 'Chemiluminescence / ELISA', sample: 'Serum' },
  { code: 'SER008', name: 'HCV Total Antibodies Screening', category: 'Serology', subCategory: 'Viruses', method: 'Chemiluminescent sandwich reaction', sample: 'Serum' },
  { code: 'SER009', name: 'Dengue NS1 Antigen Card/ELISA', category: 'Serology', subCategory: 'Viruses', method: 'Immunochromatographic lateral flow', sample: 'Serum' },
  { code: 'SER010', name: 'Dengue IgM & IgG Antibodies', category: 'Serology', subCategory: 'Viruses', method: 'Lateral Flow Strip / ELISA', sample: 'Serum' },
  { code: 'SER011', name: 'Dengue IgG ELISA', category: 'Serology', subCategory: 'Viruses', method: 'Solid-phase capture ELISA', sample: 'Serum' },
  { code: 'SER012', name: 'Chikungunya IgM Assay', category: 'Serology', subCategory: 'Viruses', method: 'ELISA Immunocapture', sample: 'Serum' },
  { code: 'SER013', name: 'Typhidot IgM & IgG', category: 'Serology', subCategory: 'Infections', method: 'Immunochromatographic dot assay', sample: 'Serum' },
  { code: 'SER014', name: 'Leptospira IgM screening', category: 'Serology', subCategory: 'Infections', method: 'Rapid slide agglutination / ELISA', sample: 'Serum' },
  { code: 'SER015', name: 'ANA (Antinuclear Antibodies) Screen', category: 'Serology', subCategory: 'Autoimmune', method: 'Indirect Immunofluorescence (IFA)', sample: 'Serum' },
  { code: 'SER016', name: 'ANA Profile (Immunoblot series)', category: 'Serology', subCategory: 'Autoimmune', method: 'Line Immunoassay membrane blot', sample: 'Serum' },
  { code: 'SER017', name: 'Anti-dsDNA quantitative', category: 'Serology', subCategory: 'Autoimmune', method: 'ELISA / Crithidia luciliae IFA', sample: 'Serum' },
  { code: 'SER018', name: 'Brucella Antibody agglutination', category: 'Serology', subCategory: 'Infections', method: 'Standard Tube Agglutination (SAT)', sample: 'Serum' },
  { code: 'CLP001', name: 'Urine Routine chemical with microscopic deposits', category: 'Clinical Pathology', subCategory: 'Urine Routine', method: 'Spectro dipstick & centrifuge micro', sample: 'Mid Urine Tube' },
  { code: 'CLP002', name: 'Urine Microalbumin / Creatinine Ratio', category: 'Clinical Pathology', subCategory: 'Special Urine', method: 'Immunoturbidimetric & Jaffe', sample: 'Spot Urine' },
  { code: 'CLP003', name: 'Urine 24 Hour Urea & Creatinine clearance', category: 'Clinical Pathology', subCategory: 'Special Urine', method: 'Timed collection biochemical assays', sample: '24 Hour Urine container' },
  { code: 'CLP004', name: 'Urine Bence Jones Protein qualitative', category: 'Clinical Pathology', subCategory: 'Proteins', method: 'Heat Precipitation & Sulfosalicylic', sample: 'Fresh Morning Urine' },
  { code: 'CLP005', name: 'Urine Pregnancy Test hCG speed card', category: 'Clinical Pathology', subCategory: 'Pregnancy', method: 'Lateral Flow immunochromatography', sample: 'Morning Urine' },
  { code: 'CLP006', name: 'Stool Routine examination & deposit', category: 'Clinical Pathology', subCategory: 'Stool routine', method: 'Physical, chemical, wet mount micro', sample: 'Fresh Stool container' },
  { code: 'CLP007', name: 'Stool Occult Blood (FOBT)', category: 'Clinical Pathology', subCategory: 'Stool routine', method: 'Guaiac / Immunochemical (iFOBT)', sample: 'Stool sample' },
  { code: 'CLP008', name: 'Stool Reducing Substances quality', category: 'Clinical Pathology', subCategory: 'Stool routine', method: 'Clinitest tablet / Benedict\'s chemical', sample: 'Fresh Stool sample' },
  { code: 'CLP009', name: 'Semen Routine Analysis / Spermogram', category: 'Clinical Pathology', subCategory: 'Semen panel', method: 'Macroscopic physical & count chambers', sample: 'Semen container' },
  { code: 'CLP010', name: 'Sperm DNA Fragmentation Index (DFI)', category: 'Clinical Pathology', subCategory: 'Semen panel', method: 'Sperm Chromatin Dispersion (SCD)', sample: 'Liquefied Semen' },
  { code: 'MIC001', name: 'Urine Culture and Drug Sensitivity', category: 'Microbiology', subCategory: 'Cultures', method: 'Quantitative plating & Kirby-Bauer', sample: 'Sterile urine container' },
  { code: 'MIC002', name: 'Blood Culture and Sensitivity Automated', category: 'Microbiology', subCategory: 'Cultures', method: 'Continuous monitoring bottle sensors', sample: 'Blood culture vial' },
  { code: 'MIC003', name: 'Sputum Acid Fast Bacilli (AFB) smear', category: 'Microbiology', subCategory: 'Tubercle', method: 'Hot Ziehl-Neelsen staining microscopy', sample: 'Early sputum cup' },
  { code: 'MIC004', name: 'TB Culture automated (MGIT system)', category: 'Microbiology', subCategory: 'Tubercle', method: 'Fluorescence detection tube', sample: 'Sputum / tissue' },
  { code: 'MIC005', name: 'Pus Smear Gram Stain Examination', category: 'Microbiology', subCategory: 'Staining', method: 'Gram differentiation dye microscopy', sample: 'Sterile pus swab' },
  { code: 'MIC006', name: 'Vaginal Swear wet mount / Gram study', category: 'Microbiology', subCategory: 'Staining', method: 'Physical saline & methylene stains', sample: 'Swab on slides' },
  { code: 'MIC007', name: 'Stool Hanging Drop cholera motility', category: 'Microbiology', subCategory: 'Staining', method: 'Wet hanging drop microscopy', sample: 'Liquid fresh stool' },
  { code: 'MIC008', name: 'Fungal Culture / KOH smear prep', category: 'Microbiology', subCategory: 'Mycology', method: '10% Potassium hydroxide digest Sabouraud', sample: 'Skin scraping / Nail / Hair' },
  { code: 'HIS001', name: 'Histopathology Biopsy - Small specimen', category: 'Histopathology', subCategory: 'Tissue pathology', method: 'Formalin fix, paraffin block, H&E', sample: 'Tissue vial' },
  { code: 'HIS002', name: 'Histopathology Biopsy - Medium organ spec', category: 'Histopathology', subCategory: 'Tissue pathology', method: 'Tissue trimming, serial slide staining', sample: 'Specimen in formalin' },
  { code: 'HIS003', name: 'Histopathology Biopsy - Large radical resect', category: 'Histopathology', subCategory: 'Tissue pathology', method: 'Grossing, extensive staging blocks', sample: 'Resected organ block' },
  { code: 'HIS004', name: 'Immunohistochemistry (IHC) marker panel', category: 'Histopathology', subCategory: 'Tumor IHC', method: 'Horseradish peroxidase polymers', sample: 'Paraffin slide sections' },
  { code: 'CYT001', name: 'Pap Smear Cervical cytology (Conventional)', category: 'Cytology', subCategory: 'Smears', method: 'Papanicolaou smear collection', sample: 'Cervical slide sweep' },
  { code: 'CYT002', name: 'Liquid Based Cytology (LBC)', category: 'Cytology', subCategory: 'Smears', method: 'Preservative filtration monolayer cytoprep', sample: 'Preservative vial' },
  { code: 'CYT003', name: 'FNAC (Fine Needle Aspiration Cytology)', category: 'Cytology', subCategory: 'FNAC nodes', method: 'Syringe aspirator smear stain microscopy', sample: 'Aspirate cells' },
  { code: 'CYT004', name: 'FNAC with Ultrasound guidance', category: 'Cytology', subCategory: 'FNAC nodes', method: 'USG needle target aspirate smears', sample: 'Nodal aspirates' },
  { code: 'MOL001', name: 'SARS-CoV-2 Real-Time RT-PCR', category: 'Molecular Biology', subCategory: 'Viral PCR', method: 'TaqMan probes fluorimetry RT-PCR', sample: 'Nasopharyngeal swab' },
  { code: 'MOL002', name: 'Hepatitis B DNA Viral Load Quantitative', category: 'Molecular Biology', subCategory: 'Viral PCR', method: 'COBAS Real-time amplification PCR', sample: 'EDTA Plasma' },
  { code: 'MOL003', name: 'Hepatitis C RNA Viral Load Quantitative', category: 'Molecular Biology', subCategory: 'Viral PCR', method: 'Real-time TaqMan RT-PCR', sample: 'EDTA Plasma' },
  { code: 'MOL004', name: 'HLA-B27 PCR detection', category: 'Molecular Biology', subCategory: 'Genotyping', method: 'Real-time multiplex DNA PCR', sample: 'EDTA Whole Blood' },
  { code: 'MOL005', name: 'GeneXpert TB PCR with Rifampicin resistance', category: 'Molecular Biology', subCategory: 'Tubercle', method: 'Cartridge base integrated PCR real-time', sample: 'Sputum / fluid' }
];

// Populate the mock database descriptions up to 500 records automatically by looping and generating codes
for (let i = PATHOLOGY_500_DESCRIPTIONS.length; i < 500; i++) {
  const catNames = ['Biochemistry', 'Hematology', 'Microbiology', 'Immunology & Hormones', 'Toxicology', 'Clinical Pathology', 'Coagulation Studies', 'Histopathology', 'Special Investigations'];
  const cat = catNames[i % catNames.length];
  let subcat = 'General Screening';
  let method = 'Automated Photometric Analysis';
  let sample = 'Venous Serum';
  
  if (cat === 'Hematology') { subcat = 'Blood counts'; method = 'Impedance Aperture System'; sample = 'EDTA Blood'; }
  else if (cat === 'Microbiology') { subcat = 'Fungal & Bacterial detection'; method = 'Sensititre automation'; sample = 'Body Fluid Swab'; }
  else if (cat === 'Toxicology') { subcat = 'Heavy Metals assay'; method = 'Inductively Coupled Plasma Mass Spec (ICP-MS)'; sample = 'Random Urine / Blood'; }
  else if (cat === 'Histopathology') { subcat = 'Special Staining'; method = 'Immunoperoxidase speed stains'; sample = 'Formalin Biopsy Block'; }
  else if (cat === 'Coagulation Studies') { subcat = 'Clot factors'; method = 'Turbidimetric Mechanical Fibrin check'; sample = 'Citrated Plasma'; }

  PATHOLOGY_500_DESCRIPTIONS.push({
    code: `SPC${100 + i}`,
    name: [
      'Serum Acetaminophen Level', 'Salivary Cortisol Rhythm', 'Blood Lead Concentration', 'Arterial Blood Gas Analysis',
      'Urinary Cortisol 24Hr', 'Serum Choline Esterase', 'Homocysteine Quantitative', 'Interleukin-6 (IL-6) Cytokine',
      'Cyclosporine trough concentration', 'Tacrolimus immunosuppression blood Level', 'Anti-Mullerian Hormone (AMH)', 'Inhibin B level',
      'Serum Erythropoietin', 'Osteocalcin bone marker', 'Active Renin-Aldosterone Ratio', 'Metanephrines 24-Hour Urine',
      'Complement C3 & C4 values', 'Urinary Protein Electrophoresis Screen', 'Immunofixation Electrophoresis serum', 'Lithium monitoring',
      'Valproic acid therapeutic Level', 'Phenytoin concentration', 'Vancomycin peak/trough levels', 'Plasma Lactate concentration'
    ][i % 24] + ` - Sample Run ${i}`,
    category: cat,
    subCategory: subcat,
    method: method,
    sample: sample
  });
}

// Generate some Referral Doctors reference data
export const MOCK_DOCTORS: ReferralDoctor[] = [];

// Generate some Franchise Collection Centers reference data
export const MOCK_FRANCHISES: FranchiseCollectionCenter[] = [];

// Generate Home Collection Phlebotomist bookings
export const MOCK_HOME_COLLECTIONS: HomeCollectionBooking[] = [];

// Complete dynamic results records matching historical patient lists
export const MOCK_LIS_RESULTS: LISResultRecord[] = [
  {
    id: 'res-cbc-001',
    patientId: 'p101',
    patientName: 'Ramesh Sharma',
    patientAge: 48,
    patientGender: 'Male',
    patientMRN: 'MRN-90214',
    testCode: 'HEM01',
    testName: 'Complete Blood Count (CBC)',
    sampleId: 'SMP-84910',
    orderedDate: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    collectionDate: new Date(Date.now() - 22 * 3600 * 1000).toISOString(),
    collectionStatus: 'Completed',
    deltaCheckStatus: 'Good',
    deltaCheckMessage: 'Consistent with previous 30-day baseline',
    qrVerified: true,
    verifiedBy: 'Dr. Pradeep Mishra (MD, Pathology)',
    verifiedAt: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
    pathologistOpinion: 'Mild microcytic hypochromic picture. Total WBC and Platelet counts are within normal physiological range. Iron profile recommended if fatigue persists.',
    results: {
      'P-HB': { parameterId: 'P-HB', parameterName: 'Hemoglobin', value: '13.8', unit: 'g/dL', referenceRangeStr: '13.0 - 17.0 g/dL', status: 'Normal', interpretation: 'Normal range' },
      'P-RBC': { parameterId: 'P-RBC', parameterName: 'Total RBC Count', value: '4.75', unit: 'million/cumm', referenceRangeStr: '4.50 - 5.50 million/cumm', status: 'Normal', interpretation: 'Normal' },
      'P-WBC': { parameterId: 'P-WBC', parameterName: 'Total Leukocyte Count (TLC)', value: '7200', unit: 'cells/cumm', referenceRangeStr: '4000 - 11000 cells/cumm', status: 'Normal', interpretation: 'Normal' },
      'P-PLT': { parameterId: 'P-PLT', parameterName: 'Platelet Count', value: '2.65', unit: 'lakh/cumm', referenceRangeStr: '1.50 - 4.50 lakh/cumm', status: 'Normal', interpretation: 'Normal' },
      'P-PCV': { parameterId: 'P-PCV', parameterName: 'Packed Cell Volume (PCV)', value: '41.2', unit: '%', referenceRangeStr: '40.0 - 50.0 %', status: 'Normal', interpretation: 'Normal' },
      'P-MCV': { parameterId: 'P-MCV', parameterName: 'Mean Corpuscular Volume (MCV)', value: '86.7', unit: 'fL', referenceRangeStr: '80.0 - 100.0 fL', status: 'Normal', interpretation: 'Normal' },
      'P-MCH': { parameterId: 'P-MCH', parameterName: 'Mean Corpuscular Hemoglobin (MCH)', value: '29.1', unit: 'pg', referenceRangeStr: '27.0 - 32.0 pg', status: 'Normal', interpretation: 'Normal' },
      'P-MCHC': { parameterId: 'P-MCHC', parameterName: 'Mean Corpuscular Hb Conc (MCHC)', value: '33.5', unit: 'g/dL', referenceRangeStr: '32.0 - 36.0 g/dL', status: 'Normal', interpretation: 'Normal' }
    }
  },
  {
    id: 'res-lft-002',
    patientId: 'p102',
    patientName: 'Sunita Verma',
    patientAge: 42,
    patientGender: 'Female',
    patientMRN: 'MRN-88412',
    testCode: 'BIO01',
    testName: 'Liver Function Test (LFT)',
    sampleId: 'SMP-73921',
    orderedDate: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    collectionDate: new Date(Date.now() - 34 * 3600 * 1000).toISOString(),
    collectionStatus: 'Completed',
    deltaCheckStatus: 'Good',
    deltaCheckMessage: 'Enzyme parameters normalized post-treatment',
    qrVerified: true,
    verifiedBy: 'Dr. Pradeep Mishra (MD, Pathology)',
    verifiedAt: new Date(Date.now() - 30 * 3600 * 1000).toISOString(),
    pathologistOpinion: 'Bilirubin and transaminases are within normal biological limits. Alkaline phosphatase is mildly elevated, suggest clinical correlation with bone metabolism.',
    results: {
      'P-BIL-T': { parameterId: 'P-BIL-T', parameterName: 'Bilirubin Total', value: '0.85', unit: 'mg/dL', referenceRangeStr: '0.2 - 1.2 mg/dL', status: 'Normal', interpretation: 'Normal' },
      'P-BIL-D': { parameterId: 'P-BIL-D', parameterName: 'Bilirubin Direct', value: '0.22', unit: 'mg/dL', referenceRangeStr: '0.0 - 0.3 mg/dL', status: 'Normal', interpretation: 'Normal' },
      'P-SGOT': { parameterId: 'P-SGOT', parameterName: 'SGOT (AST)', value: '26', unit: 'IU/L', referenceRangeStr: '5 - 40 IU/L', status: 'Normal', interpretation: 'Normal' },
      'P-SGPT': { parameterId: 'P-SGPT', parameterName: 'SGPT (ALT)', value: '29', unit: 'IU/L', referenceRangeStr: '5 - 40 IU/L', status: 'Normal', interpretation: 'Normal' },
      'P-ALP': { parameterId: 'P-ALP', parameterName: 'Alkaline Phosphatase (ALP)', value: '112', unit: 'IU/L', referenceRangeStr: '30 - 120 IU/L', status: 'Normal', interpretation: 'Normal' },
      'P-TP': { parameterId: 'P-TP', parameterName: 'Total Protein', value: '7.1', unit: 'g/dL', referenceRangeStr: '6.0 - 8.3 g/dL', status: 'Normal', interpretation: 'Normal' },
      'P-ALB': { parameterId: 'P-ALB', parameterName: 'Serum Albumin', value: '4.2', unit: 'g/dL', referenceRangeStr: '3.5 - 5.0 g/dL', status: 'Normal', interpretation: 'Normal' }
    }
  },
  {
    id: 'res-kft-003',
    patientId: 'p103',
    patientName: 'Anita Patel',
    patientAge: 56,
    patientGender: 'Female',
    patientMRN: 'MRN-72019',
    testCode: 'BIO02',
    testName: 'Kidney Function Test (KFT / RFT)',
    sampleId: 'SMP-99120',
    orderedDate: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    collectionDate: new Date(Date.now() - 46 * 3600 * 1000).toISOString(),
    collectionStatus: 'Completed',
    deltaCheckStatus: 'Good',
    deltaCheckMessage: 'Stable GFR and creatinine levels',
    qrVerified: true,
    verifiedBy: 'Dr. Pradeep Mishra (MD, Pathology)',
    verifiedAt: new Date(Date.now() - 44 * 3600 * 1000).toISOString(),
    pathologistOpinion: 'Renal parameters reflect adequate glomerular filtration rate with preserved tubular excretory function. Electrolytes are in balance.',
    results: {
      'P-UREA': { parameterId: 'P-UREA', parameterName: 'Blood Urea', value: '26.4', unit: 'mg/dL', referenceRangeStr: '15 - 45 mg/dL', status: 'Normal', interpretation: 'Normal' },
      'P-CREAT': { parameterId: 'P-CREAT', parameterName: 'Serum Creatinine', value: '0.88', unit: 'mg/dL', referenceRangeStr: '0.6 - 1.2 mg/dL', status: 'Normal', interpretation: 'Normal' },
      'P-UA': { parameterId: 'P-UA', parameterName: 'Serum Uric Acid', value: '4.6', unit: 'mg/dL', referenceRangeStr: '2.4 - 6.0 mg/dL', status: 'Normal', interpretation: 'Normal' },
      'P-SOD': { parameterId: 'P-SOD', parameterName: 'Serum Sodium (Na+)', value: '141', unit: 'mEq/L', referenceRangeStr: '135 - 145 mEq/L', status: 'Normal', interpretation: 'Normal' },
      'P-POT': { parameterId: 'P-POT', parameterName: 'Serum Potassium (K+)', value: '4.3', unit: 'mEq/L', referenceRangeStr: '3.5 - 5.1 mEq/L', status: 'Normal', interpretation: 'Normal' }
    }
  },
  {
    id: 'res-lip-004',
    patientId: 'p104',
    patientName: 'Vinod Kumar',
    patientAge: 51,
    patientGender: 'Male',
    patientMRN: 'MRN-65431',
    testCode: 'BIO03',
    testName: 'Lipid Profile (Fast)',
    sampleId: 'SMP-61208',
    orderedDate: new Date(Date.now() - 60 * 3600 * 1000).toISOString(),
    collectionDate: new Date(Date.now() - 58 * 3600 * 1000).toISOString(),
    collectionStatus: 'Completed',
    deltaCheckStatus: 'Attention',
    deltaCheckMessage: 'Mild elevation in Serum Triglycerides compared to 6-month prior',
    qrVerified: true,
    verifiedBy: 'Dr. Pradeep Mishra (MD, Pathology)',
    verifiedAt: new Date(Date.now() - 55 * 3600 * 1000).toISOString(),
    pathologistOpinion: 'Borderline elevated Triglycerides and LDL Cholesterol. Lifestyle modification and dietary counseling recommended.',
    results: {
      'P-CHOL': { parameterId: 'P-CHOL', parameterName: 'Total Cholesterol', value: '195', unit: 'mg/dL', referenceRangeStr: '< 200 mg/dL', status: 'Normal', interpretation: 'Desirable' },
      'P-TRIG': { parameterId: 'P-TRIG', parameterName: 'Triglycerides', value: '175', unit: 'mg/dL', referenceRangeStr: '< 150 mg/dL', status: 'High', interpretation: 'Borderline High' },
      'P-HDL': { parameterId: 'P-HDL', parameterName: 'HDL (Good) Cholesterol', value: '44', unit: 'mg/dL', referenceRangeStr: '> 40 mg/dL', status: 'Normal', interpretation: 'Normal' },
      'P-LDL': { parameterId: 'P-LDL', parameterName: 'LDL (Bad) Cholesterol', value: '116', unit: 'mg/dL', referenceRangeStr: '< 100 mg/dL', status: 'High', interpretation: 'Borderline High' },
      'P-VLDL': { parameterId: 'P-VLDL', parameterName: 'VLDL Cholesterol', value: '35', unit: 'mg/dL', referenceRangeStr: '< 30 mg/dL', status: 'High', interpretation: 'Mild elevation' }
    }
  }
];
