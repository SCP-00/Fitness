/**
 * @fitness/bodylab-integration-musclemapjs
 *
 * MuscleMapJS integration adapter for BodyLab.
 * Maps anthropometric scores to 2D muscle heatmap visualization.
 *
 * @module integrations/musclemapjs
 */

export {
  scoreToIntensity,
  scoresToHeatmap,
  scoreToColor,
  getColorScale,
  getMuscleDisplayName,
  MEASUREMENT_TO_MUSCLE,
  MUSCLE_DISPLAY_NAMES,
} from './adapter';

export { BodyViewer } from './body-viewer';

// Types
export type {
  MuscleGroup,
  MuscleIntensity,
  ColorScale,
} from './adapter';

export type {
  BodyViewerConfig,
  BodyViewerState,
  MuscleSelectionCallback,
  MuscleClickCallback,
} from './body-viewer';
