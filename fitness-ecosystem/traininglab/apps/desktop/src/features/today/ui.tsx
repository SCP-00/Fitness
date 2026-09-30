/**
 * Deprecated path — kept only so the screens that have not been migrated yet
 * keep compiling.
 *
 * The primitives now live in `src/ui/primitives.tsx`, which is
 * screen-agnostic: they were in `features/today/` because the app used to be one
 * screen. New code imports from `../../ui/primitives` directly; this file
 * disappears with the last import of it.
 *
 * @deprecated import from `ui/primitives` instead
 * @module features/today/ui
 */

export {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  NavRow,
  ScaleInput,
  SectionCard,
  SectionHeader,
  StatCard,
  Switch,
  TabStrip,
} from "../../ui/primitives";
