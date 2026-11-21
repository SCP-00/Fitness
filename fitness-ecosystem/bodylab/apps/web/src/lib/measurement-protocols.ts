/**
 * Measurement protocols — thin re-export of `@fitness/bodylab-measurements`.
 *
 * The catalogue itself moved into core on 2026-11-21 so TrainingLab can show the
 * same guidance without copying it (plan T02/T05). This module stays because the
 * whole web app already imports `protocolFor` from here, and a moved file should
 * not turn into a moved import in a frozen app.
 *
 * @module lib/measurement-protocols
 */

export {
  MEASUREMENT_PROTOCOLS,
  STANDARD_CONDITIONS,
  FIGURE,
  baseMeasurementId,
  protocolFor,
  sideOf,
} from "@fitness/bodylab-measurements";

export type {
  Bilingual,
  Point,
  DiagramKind,
  ProtocolDiagram,
  MeasurementProtocol,
} from "@fitness/bodylab-measurements";
