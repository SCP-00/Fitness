/**
 * @fitness/bodylab-composition
 * 
 * Composición corporal y marco óseo.
 * 
 * @module composition
 */

export { calculateFrameSize } from './frame-size';
export { calculateWHtR } from './whtr';
export { estimateBodyFatNavy, NAVY_SEE_PCT } from './navy-body-fat';
export {
  classifySomatotype,
  calculateEndomorphy,
  calculateEctomorphy,
  calculateMesomorphyFrame,
  heightWeightRatio,
  categorizeSomatotype,
} from './somatotype';

// Types
export type { FrameSize, FrameSizeResult } from './frame-size';
export type { WHtRResult } from './whtr';
export type {
  SomatotypeCategory,
  SomatotypeInputs,
  SomatotypeResult,
  BiologicalSex,
} from './somatotype';
export type {
  NavySex,
  NavyBodyFatInputs,
  NavyBodyFatResult,
} from './navy-body-fat';
