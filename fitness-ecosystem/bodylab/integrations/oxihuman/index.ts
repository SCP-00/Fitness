/**
 * @fitness/bodylab-integration-oxihuman
 *
 * OxiHuman integration adapter for BodyLab.
 * Maps body parameters to 3D parametric body generation.
 *
 * @module integrations/oxihuman
 */

export {
  bodyParamsToOxiParams,
  oxiParamsToBodyParams,
  calculateMeasurementDeviation,
  getOxiParamRanges,
  getExportExtension,
  getExportMimeType,
} from './adapter';

export { BodyViewer3D } from './body-viewer-3d';

// Types
export type {
  OxiParamName,
  BodyParameters,
  OxiParamRange,
  ExportFormat,
} from './adapter';

export type {
  BodyViewer3DConfig,
  BodyViewer3DState,
  ParameterChangeCallback,
  ModelLoadCallback,
} from './body-viewer-3d';
