import type { InvestigationTest } from '@/components/lis/listTypes';
import { RADIOLOGY_MASTER_INVESTIGATIONS, RADIOLOGY_TEST_DATA, RadiologyMasterTestItem } from './radiologyMasterList';

export interface RadiologyRateItem {
  id: string;
  no?: string;
  code?: string;
  name: string;
  shortName?: string;
  price: number;
  vial?: string;
  category: 'Radiology';
  department?: string;
  modality?: string;
  subCategory?: string;
  bodyRegion?: string;
  contrast?: string;
  preparation?: string;
  tat?: string;
  radiationLevel?: string;
  billingCategory?: string;
}

export const INITIAL_RADIOLOGY_MASTER_TESTS: RadiologyRateItem[] = RADIOLOGY_TEST_DATA.map((item, idx) => ({
  id: `rad-${idx + 1}`,
  no: String(idx + 101),
  code: item.code,
  name: item.name,
  shortName: item.shortName,
  price: item.price,
  vial: item.equipment,
  category: 'Radiology' as const,
  department: item.department || 'Radiology',
  modality: item.modality,
  subCategory: item.subCategory,
  bodyRegion: item.bodyRegion,
  contrast: item.contrast,
  preparation: item.preparation,
  tat: item.tat,
  radiationLevel: item.radiationLevel,
  billingCategory: item.billingCategory
}));

export const INITIAL_RIS_INVESTIGATIONS: InvestigationTest[] = RADIOLOGY_MASTER_INVESTIGATIONS;
