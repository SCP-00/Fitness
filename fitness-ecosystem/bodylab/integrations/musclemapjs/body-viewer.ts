/**
 * Body Viewer 2D
 *
 * React component that wraps MuscleMapJS for 2D body visualization.
 * Provides a clean interface for BodyLab's 2D view.
 *
 * NOTE: This component requires a browser environment with DOM access.
 * It cannot be used in Node.js/test environments directly.
 *
 * @module integrations/musclemapjs/body-viewer
 */

import type { MuscleGroup, MuscleIntensity } from './adapter';
import { scoresToHeatmap, getMuscleDisplayName, getColorScale } from './adapter';

/**
 * Body viewer configuration
 */
export interface BodyViewerConfig {
  /** Container element ID or reference */
  containerId: string;
  /** Body gender */
  gender: 'male' | 'female';
  /** Body side to display */
  side: 'front' | 'back';
  /** Visual style preset */
  style: 'default' | 'minimal' | 'neon' | 'medical';
  /** Enable multi-select */
  multiSelect: boolean;
  /** Language for display names */
  locale: 'es' | 'en';
}

/**
 * Body viewer state
 */
export interface BodyViewerState {
  /** Current gender */
  gender: 'male' | 'female';
  /** Current side */
  side: 'front' | 'back';
  /** Current style */
  style: string;
  /** Selected muscles */
  selectedMuscles: MuscleGroup[];
  /** Current heatmap data */
  heatmapData: MuscleIntensity[];
}

/**
 * Callback for muscle selection
 */
export type MuscleSelectionCallback = (muscles: MuscleGroup[]) => void;

/**
 * Callback for muscle click
 */
export type MuscleClickCallback = (muscle: MuscleGroup, side: 'front' | 'back') => void;

/**
 * Body Viewer class
 *
 * Wraps MuscleMapJS widget and provides BodyLab-specific functionality.
 *
 * @example
 * ```typescript
 * const viewer = new BodyViewer({
 *   containerId: 'body-viewer',
 *   gender: 'male',
 *   side: 'front',
 *   style: 'default',
 *   multiSelect: true,
 *   locale: 'es',
 * });
 *
 * // Set heatmap from scores
 * viewer.setHeatmapFromScores({
 *   chest: 0.95,
 *   waist: 0.75,
 *   biceps: 0.50,
 * });
 *
 * // Listen for selection changes
 * viewer.onSelectionChange((muscles) => {
 *   console.log('Selected:', muscles);
 * });
 * ```
 */
export class BodyViewer {
  private config: BodyViewerConfig;
  private state: BodyViewerState;
  private widget: unknown; // MuscleMapWidget instance
  private selectionCallbacks: MuscleSelectionCallback[] = [];
  private clickCallbacks: MuscleClickCallback[] = [];

  constructor(config: BodyViewerConfig) {
    this.config = config;
    this.state = {
      gender: config.gender,
      side: config.side,
      style: config.style,
      selectedMuscles: [],
      heatmapData: [],
    };
  }

  /**
   * Initialize the viewer (call after DOM is ready)
   *
   * NOTE: This method requires browser environment.
   * In test environment, it will be mocked.
   */
  async initialize(): Promise<void> {
    // Dynamic import to avoid issues in Node.js environment
    if (typeof document === 'undefined') {
      throw new Error('BodyViewer requires browser environment');
    }

    const container = document.getElementById(this.config.containerId);
    if (!container) {
      throw new Error(`Container not found: ${this.config.containerId}`);
    }

    // Import MuscleMapJS dynamically
    const { MuscleMapWidget } = await import('./MuscleMapJS/src/index.ts');

    this.widget = new MuscleMapWidget(container, {
      gender: this.config.gender,
      side: this.config.side,
      style: this.config.style,
      multiSelect: this.config.multiSelect,
    });

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Set up event listeners on the widget
   */
  private setupEventListeners(): void {
    const widget = this.widget as {
      on: (event: string, callback: (...args: unknown[]) => void) => void;
    };

    if (!widget?.on) return;

    widget.on('selectionChange', (muscles: MuscleGroup[]) => {
      this.state.selectedMuscles = muscles;
      this.selectionCallbacks.forEach((cb) => cb(muscles));
    });

    widget.on('muscleClick', (muscle: MuscleGroup, side: 'front' | 'back') => {
      this.clickCallbacks.forEach((cb) => cb(muscle, side));
    });
  }

  /**
   * Set heatmap from anthropometric scores
   *
   * @param scores - Record of measurement type to score (0-1)
   */
  setHeatmapFromScores(scores: Record<string, number>): void {
    const heatmapData = scoresToHeatmap(scores);
    this.state.heatmapData = heatmapData;

    const widget = this.widget as {
      setHeatmap: (data: MuscleIntensity[], config: object) => void;
    };

    if (widget?.setHeatmap) {
      widget.setHeatmap(heatmapData, {
        colorScale: getColorScale('assessment'),
        interpolation: { type: 'easeInOut' },
        threshold: 0.1,
        gradientFill: true,
      });
    }
  }

  /**
   * Set heatmap with custom colors per muscle
   *
   * @param data - Array of muscle + color + opacity
   */
  setCustomHeatmap(data: Array<{ muscle: MuscleGroup; color: string; opacity: number }>): void {
    const widget = this.widget as {
      highlight: (muscle: MuscleGroup, color: string, opacity: number) => void;
    };

    if (widget?.highlight) {
      for (const item of data) {
        widget.highlight(item.muscle, item.color, item.opacity);
      }
    }
  }

  /**
   * Clear all highlights
   */
  clearHighlights(): void {
    const widget = this.widget as {
      clearHighlights: () => void;
    };

    if (widget?.clearHighlights) {
      widget.clearHighlights();
    }
    this.state.heatmapData = [];
  }

  /**
   * Switch body side
   *
   * @param side - New side to display
   */
  setSide(side: 'front' | 'back'): void {
    this.state.side = side;
    const widget = this.widget as {
      setSide: (side: 'front' | 'back') => void;
    };

    if (widget?.setSide) {
      widget.setSide(side);
    }
  }

  /**
   * Switch body gender
   *
   * @param gender - New gender to display
   */
  setGender(gender: 'male' | 'female'): void {
    this.state.gender = gender;
    const widget = this.widget as {
      setGender: (gender: 'male' | 'female') => void;
    };

    if (widget?.setGender) {
      widget.setGender(gender);
    }
  }

  /**
   * Switch style preset
   *
   * @param style - New style preset
   */
  setStyle(style: 'default' | 'minimal' | 'neon' | 'medical'): void {
    this.state.style = style;
    const widget = this.widget as {
      setStyle: (style: string) => void;
    };

    if (widget?.setStyle) {
      widget.setStyle(style);
    }
  }

  /**
   * Get currently selected muscles
   */
  getSelectedMuscles(): MuscleGroup[] {
    return [...this.state.selectedMuscles];
  }

  /**
   * Get current state
   */
  getState(): BodyViewerState {
    return { ...this.state };
  }

  /**
   * Register callback for selection changes
   */
  onSelectionChange(callback: MuscleSelectionCallback): void {
    this.selectionCallbacks.push(callback);
  }

  /**
   * Register callback for muscle clicks
   */
  onMuscleClick(callback: MuscleClickCallback): void {
    this.clickCallbacks.push(callback);
  }

  /**
   * Get display name for a muscle
   */
  getMuscleDisplayName(muscle: MuscleGroup): string {
    return getMuscleDisplayName(muscle, this.config.locale);
  }

  /**
   * Enable tooltip with custom renderer
   */
  enableTooltip(): void {
    const widget = this.widget as {
      enableTooltip: (renderer?: (muscle: MuscleGroup, side: string) => string) => void;
    };

    if (widget?.enableTooltip) {
      widget.enableTooltip((muscle: MuscleGroup) => {
        return `<strong>${this.getMuscleDisplayName(muscle)}</strong>`;
      });
    }
  }

  /**
   * Disable tooltip
   */
  disableTooltip(): void {
    const widget = this.widget as {
      disableTooltip: () => void;
    };

    if (widget?.disableTooltip) {
      widget.disableTooltip();
    }
  }

  /**
   * Enable undo/redo history
   */
  enableHistory(maxEntries: number = 50): void {
    const widget = this.widget as {
      enableHistory: (max: number) => void;
    };

    if (widget?.enableHistory) {
      widget.enableHistory(maxEntries);
    }
  }

  /**
   * Undo last selection change
   */
  undo(): MuscleGroup[] | null {
    const widget = this.widget as {
      undo: () => MuscleGroup[] | null;
    };

    return widget?.undo?.() ?? null;
  }

  /**
   * Redo last undone selection change
   */
  redo(): MuscleGroup[] | null {
    const widget = this.widget as {
      redo: () => MuscleGroup[] | null;
    };

    return widget?.redo?.() ?? null;
  }

  /**
   * Enable pulse animation on selected muscles
   */
  enablePulse(speed: number = 1.5, minOpacity: number = 0.6, maxOpacity: number = 1.0): void {
    const widget = this.widget as {
      enablePulse: (speed: number, min: number, max: number) => void;
    };

    if (widget?.enablePulse) {
      widget.enablePulse(speed, minOpacity, maxOpacity);
    }
  }

  /**
   * Disable pulse animation
   */
  disablePulse(): void {
    const widget = this.widget as {
      disablePulse: () => void;
    };

    if (widget?.disablePulse) {
      widget.disablePulse();
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    const widget = this.widget as {
      destroy: () => void;
    };

    if (widget?.destroy) {
      widget.destroy();
    }

    this.selectionCallbacks = [];
    this.clickCallbacks = [];
  }
}
