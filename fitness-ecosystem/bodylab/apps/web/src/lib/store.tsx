/**
 * App Store — React Context + useReducer
 *
 * Persistence: IndexedDB (via db.ts)
 * Migration: Automatic from localStorage on first load
 *
 * Architecture:
 *   React Components → useApp() → AppContext → useReducer → db.ts → IndexedDB
 */

import { createContext, useContext, useReducer, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type {
  Profile, Measurement, BodySnapshot, ReferenceProfile,
  AnthropometricAssessment, Language, ViewMode, BodyViewMode,
  MeasurementCreate, ProfileCreate, ExerciseSet, MaxEffort, UnitSystem
} from './types';
import { calculateScore, getScoreStatus, calculateMcCallum, calculateAdonisIndex, calculateWHtR, BUILT_IN_REFERENCES } from './constants';
import { getLatestValue } from './queries';
import { setLanguage as setI18nLanguage } from '../i18n';
import * as db from './db';

// ============================================================================
// State
// ============================================================================

interface AppState {
  profile: Profile | null;
  profiles: Profile[];
  measurements: Measurement[];
  snapshots: BodySnapshot[];
  exerciseSets: ExerciseSet[];
  maxEfforts: MaxEffort[];
  selectedReference: ReferenceProfile;
  language: Language;
  viewMode: ViewMode;
  bodyViewMode: BodyViewMode;
  selectedMuscle: string | null;
  /** Live units preference (BL-MEAS-005) — undefined until loaded; metric default. */
  unitsLive: UnitSystem | undefined;
  assessment: AnthropometricAssessment[];
  whtrResult: { ratio: number; status: string } | null;
  adonisResult: { ratio: number; status: string } | null;
  isLoading: boolean;
}

function createInitialState(): AppState {
  return {
    profile: null,
    profiles: [],
    measurements: [],
    snapshots: [],
    exerciseSets: [],
    maxEfforts: [],
    selectedReference: BUILT_IN_REFERENCES[0],
    language: 'en',
    viewMode: 'front',
    bodyViewMode: '2d',
    selectedMuscle: null,
    unitsLive: undefined,
    assessment: [],
    whtrResult: null,
    adonisResult: null,
    isLoading: true,
  };
}

// ============================================================================
// Actions
// ============================================================================

type Action =
  | { type: 'SET_LANGUAGE'; payload: Language }
  | { type: 'SET_UNITS'; payload: UnitSystem }
  | { type: 'SET_VIEW_MODE'; payload: ViewMode }
  | { type: 'SET_BODY_VIEW_MODE'; payload: BodyViewMode }
  | { type: 'SET_SELECTED_MUSCLE'; payload: string | null }
  | { type: 'SET_REFERENCE'; payload: ReferenceProfile }
  | { type: 'CREATE_PROFILE'; payload: Profile }
  | { type: 'UPDATE_PROFILE'; payload: Partial<Profile> }
  | { type: 'ADD_MEASUREMENT'; payload: Measurement }
  | { type: 'REMOVE_MEASUREMENT'; payload: string }
  | { type: 'SET_MEASUREMENTS'; payload: Measurement[] }
  | { type: 'CREATE_SNAPSHOT'; payload: BodySnapshot }
  | { type: 'SET_SNAPSHOTS'; payload: BodySnapshot[] }
  | { type: 'IMPORT_DATA'; payload: { profile: Profile | null; measurements: Measurement[]; snapshots: BodySnapshot[] } }
  | { type: 'CALCULATE_ASSESSMENT' }
  | { type: 'LOAD_DATA'; payload: { profile: Profile | null; measurements: Measurement[]; snapshots: BodySnapshot[]; language: Language; referenceId: string } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'ADD_EXERCISE_SET'; payload: ExerciseSet }
  | { type: 'REMOVE_EXERCISE_SET'; payload: string }
  | { type: 'LOAD_EXERCISE_DATA'; payload: { exerciseSets: ExerciseSet[]; maxEfforts: MaxEffort[] } };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'LOAD_DATA': {
      const ref = BUILT_IN_REFERENCES.find(r => r.id === action.payload.referenceId) ?? BUILT_IN_REFERENCES[0];
      setI18nLanguage(action.payload.language);
      return {
        ...state,
        profile: action.payload.profile,
        profiles: action.payload.profile ? [action.payload.profile] : [],
        measurements: action.payload.measurements,
        snapshots: action.payload.snapshots,
        language: action.payload.language,
        selectedReference: ref,
        isLoading: false,
      };
    }

    case 'SET_LANGUAGE': {
      setI18nLanguage(action.payload);
      db.saveSetting('language', action.payload);
      return { ...state, language: action.payload };
    }

    // Units preference (BL-MEAS-005): display-only — canonical data stays
    // metric. Persisted as a setting so it applies without saving the profile.
    case 'SET_UNITS': {
      db.saveSetting('units', action.payload);
      if (state.profile) {
        const updated = { ...state.profile, units: action.payload, updatedAt: new Date().toISOString() };
        db.saveProfile(updated);
        return { ...state, profile: updated, profiles: [updated], unitsLive: action.payload };
      }
      return { ...state, unitsLive: action.payload };
    }

    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };

    case 'SET_BODY_VIEW_MODE':
      return { ...state, bodyViewMode: action.payload };

    case 'SET_SELECTED_MUSCLE':
      return { ...state, selectedMuscle: action.payload };

    case 'SET_REFERENCE': {
      db.saveSetting('reference', action.payload.id);
      return { ...state, selectedReference: action.payload };
    }

    case 'CREATE_PROFILE': {
      db.saveProfile(action.payload);
      return {
        ...state,
        profile: action.payload,
        profiles: [action.payload],
      };
    }

    case 'UPDATE_PROFILE': {
      if (!state.profile) return state;
      const updated = { ...state.profile, ...action.payload, updatedAt: new Date().toISOString() };
      db.saveProfile(updated);
      return {
        ...state,
        profile: updated,
        profiles: [updated],
      };
    }

    case 'ADD_MEASUREMENT': {
      const newMeasurements = [...state.measurements, action.payload];
      db.saveMeasurements(newMeasurements);
      return { ...state, measurements: newMeasurements };
    }

    case 'REMOVE_MEASUREMENT': {
      const filtered = state.measurements.filter(m => m.id !== action.payload);
      db.saveMeasurements(filtered);
      return { ...state, measurements: filtered };
    }

    case 'SET_MEASUREMENTS':
      return { ...state, measurements: action.payload };

    case 'CREATE_SNAPSHOT': {
      const newSnapshots = [...state.snapshots, action.payload];
      db.saveSnapshots(newSnapshots);
      return { ...state, snapshots: newSnapshots };
    }

    case 'SET_SNAPSHOTS':
      return { ...state, snapshots: action.payload };

    case 'IMPORT_DATA': {
      const imported = {
        ...state,
        profile: action.payload.profile,
        profiles: action.payload.profile ? [action.payload.profile] : [],
        measurements: action.payload.measurements,
        snapshots: action.payload.snapshots,
      };
      if (imported.profile) db.saveProfile(imported.profile);
      db.saveMeasurements(imported.measurements);
      db.saveSnapshots(imported.snapshots);
      return imported;
    }

    case 'CALCULATE_ASSESSMENT': {
      const { measurements, profile, selectedReference } = state;
      if (!profile) return state;

      const assessment: AnthropometricAssessment[] = [];

      if (selectedReference.biologicalSex === 'male' || selectedReference.biologicalSex === 'both') {
        const wrist = getLatestValue(measurements, 'wrist');
        if (wrist) {
          const ideal = calculateMcCallum(wrist);
          const segments = ['chest', 'waist', 'hips', 'biceps', 'thigh', 'neck', 'calf', 'forearm'] as const;

          for (const seg of segments) {
            const actual = getLatestValue(measurements, seg);
            if (actual && ideal[seg]) {
              const score = calculateScore(actual, ideal[seg]);
              assessment.push({
                segment: seg,
                actual,
                ideal: ideal[seg],
                deviation: Math.round((actual - ideal[seg]) * 100) / 100,
                score,
                status: getScoreStatus(score),
                color: getScoreColor(score),
              });
            }
          }
        }
      }

      const waist = getLatestValue(measurements, 'waist');
      const whtr = waist ? calculateWHtR(waist, profile.height) : null;
      const shoulders = getLatestValue(measurements, 'shoulders');
      const adonis = (shoulders && waist) ? calculateAdonisIndex(shoulders, waist) : null;

      return { ...state, assessment, whtrResult: whtr, adonisResult: adonis };
    }

    case 'ADD_EXERCISE_SET': {
      const newSets = [...state.exerciseSets, action.payload];
      db.saveExerciseSets(newSets);

      // Update max effort for this exercise
      const exerciseId = action.payload.exerciseId;
      const existingMax = state.maxEfforts.find(m => m.exerciseId === exerciseId);
      const exerciseSets = newSets.filter(s => s.exerciseId === exerciseId);

      let bestWeight = existingMax?.bestWeight ?? 0;
      let bestReps = existingMax?.bestReps ?? 0;
      let bestEst1RM = existingMax?.bestEst1RM ?? 0;

      for (const s of exerciseSets) {
        if (s.weight && s.weight > bestWeight) bestWeight = s.weight;
        if (s.reps && s.reps > bestReps) bestReps = s.reps;
        // Epley formula: 1RM = weight × (1 + reps/30)
        if (s.weight && s.reps) {
          // Epley formula, rounded to 0.1 kg so the persisted max-effort badge
          // matches the live "Est. 1RM" preview instead of dumping full float precision.
          const est1RM = Math.round(s.weight * (1 + s.reps / 30) * 10) / 10;
          if (est1RM > bestEst1RM) bestEst1RM = est1RM;
        }
      }

      const newMax: MaxEffort = {
        exerciseId,
        bestWeight: bestWeight || undefined,
        bestReps: bestReps || undefined,
        bestEst1RM: bestEst1RM || undefined,
        achievedAt: action.payload.timestamp,
        setCount: exerciseSets.length,
      };

      const newMaxEfforts = existingMax
        ? state.maxEfforts.map(m => m.exerciseId === exerciseId ? newMax : m)
        : [...state.maxEfforts, newMax];

      db.saveMaxEfforts(newMaxEfforts);
      return { ...state, exerciseSets: newSets, maxEfforts: newMaxEfforts };
    }

    case 'REMOVE_EXERCISE_SET': {
      const filtered = state.exerciseSets.filter(s => s.id !== action.payload);
      db.saveExerciseSets(filtered);
      return { ...state, exerciseSets: filtered };
    }

    case 'LOAD_EXERCISE_DATA': {
      return {
        ...state,
        exerciseSets: action.payload.exerciseSets,
        maxEfforts: action.payload.maxEfforts,
      };
    }

    default:
      return state;
  }
}

function getScoreColor(score: number): string {
  if (score >= 0.90) return '#10b981';
  if (score >= 0.70) return '#f59e0b';
  if (score >= 0.40) return '#f97316';
  return '#ef4444';
}

// ============================================================================
// Context
// ============================================================================

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  setLanguage: (lang: Language) => void;
  createProfile: (data: ProfileCreate) => void;
  addMeasurement: (data: MeasurementCreate) => void;
  removeMeasurement: (id: string) => void;
  createSnapshot: (notes?: string) => void;
  importData: (data: { profile: Profile | null; measurements: Measurement[]; snapshots: BodySnapshot[] }) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const isInitialMount = useRef(true);

  // Load data from IndexedDB on mount (with localStorage migration)
  useEffect(() => {
    if (!isInitialMount.current) return;
    isInitialMount.current = false;

    async function init() {
      // Migrate from localStorage if needed
      await db.migrateFromLocalStorageIfNeeded();
      // BL-MEAS-005: units preference is a first-class setting (defaults from
      // the profile when one exists, so legacy users keep their saved choice).
      const savedUnits = await db.loadSetting<UnitSystem | undefined>('units', undefined);
      const units = savedUnits ?? (await db.loadProfile())?.units ?? 'metric';
      if (units !== 'metric') db.saveSetting('units', units);

      // Load from IndexedDB
      const [profile, measurements, snapshots, language, referenceId, exerciseSets, maxEfforts] = await Promise.all([
        db.loadProfile(),
        db.loadMeasurements(),
        db.loadSnapshots(),
        db.loadSetting<Language>('language', 'en'),
        db.loadSetting<string>('reference', BUILT_IN_REFERENCES[0].id),
        db.loadExerciseSets(),
        db.loadMaxEfforts(),
      ]);

      dispatch({
        type: 'LOAD_DATA',
        payload: { profile, measurements, snapshots, language, referenceId },
      });
      if (units !== 'metric') dispatch({ type: 'SET_UNITS', payload: units });

      // Load exercise data
      if (exerciseSets.length > 0 || maxEfforts.length > 0) {
        dispatch({
          type: 'LOAD_EXERCISE_DATA',
          payload: { exerciseSets, maxEfforts },
        });
      }

      // Calculate assessment if data exists
      if (profile && measurements.length > 0) {
        setTimeout(() => dispatch({ type: 'CALCULATE_ASSESSMENT' }), 0);
      }
    }

    init();
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    dispatch({ type: 'SET_LANGUAGE', payload: lang });
  }, []);

  const createProfile = useCallback((data: ProfileCreate) => {
    const profile: Profile = {
      id: crypto.randomUUID(),
      ...data,
      units: data.units ?? 'metric',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dispatch({ type: 'CREATE_PROFILE', payload: profile });
  }, []);

  const addMeasurement = useCallback((data: MeasurementCreate) => {
    const measurement: Measurement = {
      id: crypto.randomUUID(),
      profileId: state.profile?.id ?? '',
      type: data.type,
      value: data.value,
      unit: data.unit ?? 'cm',
      timestamp: new Date().toISOString(),
      method: data.method ?? 'manual',
      confidence: data.confidence ?? 'high',
      notes: data.notes,
    };
    dispatch({ type: 'ADD_MEASUREMENT', payload: measurement });
    setTimeout(() => dispatch({ type: 'CALCULATE_ASSESSMENT' }), 0);
  }, [state.profile]);

  const removeMeasurement = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_MEASUREMENT', payload: id });
    setTimeout(() => dispatch({ type: 'CALCULATE_ASSESSMENT' }), 0);
  }, []);

  const createSnapshot = useCallback((notes?: string) => {
    if (!state.profile) return;
    const snapshot: BodySnapshot = {
      id: crypto.randomUUID(),
      profileId: state.profile.id,
      timestamp: new Date().toISOString(),
      measurements: [...state.measurements],
      bodyParameters: {
        height: state.profile.height,
        weight: state.profile.weight,
        bodyFatPercentage: getLatestValue(state.measurements, 'body_fat_percentage') ?? undefined,
        leanMass: getLatestValue(state.measurements, 'lean_mass') ?? undefined,
      },
      referenceProfileId: state.selectedReference.id,
      assessmentResults: [...state.assessment],
      algorithmVersion: '1.0.0',
      notes,
    };
    dispatch({ type: 'CREATE_SNAPSHOT', payload: snapshot });
  }, [state.profile, state.measurements, state.selectedReference, state.assessment]);

  const importData = useCallback((data: { profile: Profile | null; measurements: Measurement[]; snapshots: BodySnapshot[] }) => {
    dispatch({ type: 'IMPORT_DATA', payload: data });
    setTimeout(() => dispatch({ type: 'CALCULATE_ASSESSMENT' }), 0);
  }, []);

  const value: AppContextValue = {
    state,
    dispatch,
    setLanguage,
    createProfile,
    addMeasurement,
    removeMeasurement,
    createSnapshot,
    importData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// Co-located with AppProvider on purpose — splitting the hook into its own file
// would churn every importer for a Fast-Refresh-only lint rule.
// oxlint-disable-next-line react/only-export-components
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
