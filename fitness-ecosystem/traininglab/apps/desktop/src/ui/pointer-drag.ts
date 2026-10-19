/**
 * Pointer dragging, without a dependency.
 *
 * The owner's requirement (2026-10-19) is that reordering feels direct on a
 * phone: no horizontal precision, no library. Native HTML5 drag-and-drop does
 * not fire on iOS or Android, so this is Pointer Events — the same code path
 * for a mouse, a finger and a pen.
 *
 * Two rules keep it safe and fluid:
 *
 *   * **Only the grip starts a drag.** The rest of the row keeps scrolling, so
 *     a list remains usable on a phone instead of hijacking every swipe.
 *   * **The queue previews locally and writes once.** Reordering the store on
 *     every `pointermove` would rebuild the day's plan dozens of times per
 *     gesture. The hook hands back a local order; the screen commits it on
 *     release.
 *
 * The target is found with `elementFromPoint`, which is why a dragged row gets
 * `pointer-events: none` (see `.is-dragging` in `mockup.css`).
 *
 * @module ui/pointer-drag
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { moveItem } from "../lib/reorder";

interface Session {
  pointerId: number;
  draggingId: string;
  startX: number;
  startY: number;
  active: boolean;
  order: string[];
  cleanup: () => void;
}

function isPrimaryPointer(event: React.PointerEvent, pointerType: string): boolean {
  return pointerType !== "mouse" || event.button === 0;
}

function autoScroll(clientY: number): void {
  const margin = 64;
  if (clientY < margin) window.scrollBy(0, -14);
  else if (clientY > window.innerHeight - margin) window.scrollBy(0, 14);
}

function targetId(clientX: number, clientY: number): string | null {
  const element = document
    .elementFromPoint(clientX, clientY)
    ?.closest<HTMLElement>("[data-drag-id]");
  return element?.dataset.dragId ?? null;
}

/**
 * A queue reordered by dragging. `order` is the live preview (or `null` when
 * nothing is being dragged); `onCommit` receives the final order once.
 */
export function usePointerReorder(
  ids: readonly string[],
  onCommit: (order: string[], draggedId: string) => void,
): {
  order: string[] | null;
  draggingId: string | null;
  start: (event: React.PointerEvent, id: string) => void;
} {
  const [preview, setPreview] = useState<{
    draggingId: string;
    order: string[];
  } | null>(null);
  const session = useRef<Session | null>(null);
  const idsRef = useRef(ids);
  const commitRef = useRef(onCommit);
  idsRef.current = ids;
  commitRef.current = onCommit;

  const finish = useCallback((commit: boolean) => {
    const current = session.current;
    if (!current) return;
    current.cleanup();
    session.current = null;
    document.body.classList.remove("tl-dragging");
    if (commit && current.active) {
      commitRef.current(current.order, current.draggingId);
    }
    setPreview(null);
  }, []);

  useEffect(() => () => finish(false), [finish]);

  const start = useCallback(
    (event: React.PointerEvent, id: string) => {
      if (session.current) return;
      if (!isPrimaryPointer(event, event.pointerType)) return;
      const order = [...idsRef.current];
      if (!order.includes(id)) return;
      event.preventDefault();

      const onMove = (move: PointerEvent) => {
        const current = session.current;
        if (!current || move.pointerId !== current.pointerId) return;
        if (
          !current.active &&
          Math.hypot(move.clientX - current.startX, move.clientY - current.startY) <
            6
        ) {
          return;
        }
        current.active = true;
        autoScroll(move.clientY);
        const over = targetId(move.clientX, move.clientY);
        if (!over || over === current.draggingId) return;
        const from = current.order.indexOf(current.draggingId);
        const to = current.order.indexOf(over);
        if (from < 0 || to < 0 || from === to) return;
        current.order = moveItem(current.order, from, to);
        setPreview({ draggingId: current.draggingId, order: current.order });
        navigator.vibrate?.(8);
      };

      const onUp = (up: PointerEvent) => {
        if (up.pointerId === event.pointerId) finish(true);
      };
      const onCancel = (cancel: PointerEvent) => {
        if (cancel.pointerId === event.pointerId) finish(false);
      };
      const onKeyDown = (key: KeyboardEvent) => {
        if (key.key === "Escape") finish(false);
      };

      session.current = {
        pointerId: event.pointerId,
        draggingId: id,
        startX: event.clientX,
        startY: event.clientY,
        active: false,
        order,
        cleanup: () => {
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
          window.removeEventListener("pointercancel", onCancel);
          window.removeEventListener("keydown", onKeyDown);
        },
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onCancel);
      window.addEventListener("keydown", onKeyDown);
      document.body.classList.add("tl-dragging");
      setPreview({ draggingId: id, order });
      navigator.vibrate?.(5);
    },
    [finish],
  );

  return {
    order: preview?.order ?? null,
    draggingId: preview?.draggingId ?? null,
    start,
  };
}

/**
 * Drag one item onto another and drop it there (Semana's days).
 *
 * No preview order: the operation is a swap of two whole days, so the useful
 * feedback is the drop target itself. The screen decides what the swap means;
 * this hook only resolves source and destination.
 */
export function usePointerDrop(
  onDrop: (fromId: string, toId: string) => void,
): {
  draggingId: string | null;
  overId: string | null;
  start: (event: React.PointerEvent, id: string) => void;
} {
  const [state, setState] = useState<{
    draggingId: string;
    overId: string | null;
  } | null>(null);
  const session = useRef<{
    pointerId: number;
    draggingId: string;
    startX: number;
    startY: number;
    active: boolean;
    overId: string | null;
    cleanup: () => void;
  } | null>(null);
  const dropRef = useRef(onDrop);
  dropRef.current = onDrop;

  const finish = useCallback((commit: boolean) => {
    const current = session.current;
    if (!current) return;
    current.cleanup();
    session.current = null;
    document.body.classList.remove("tl-dragging");
    if (commit && current.active && current.overId && current.overId !== current.draggingId) {
      dropRef.current(current.draggingId, current.overId);
    }
    setState(null);
  }, []);

  useEffect(() => () => finish(false), [finish]);

  const start = useCallback(
    (event: React.PointerEvent, id: string) => {
      if (session.current) return;
      if (!isPrimaryPointer(event, event.pointerType)) return;
      event.preventDefault();

      const onMove = (move: PointerEvent) => {
        const current = session.current;
        if (!current || move.pointerId !== current.pointerId) return;
        if (
          !current.active &&
          Math.hypot(move.clientX - current.startX, move.clientY - current.startY) <
            6
        ) {
          return;
        }
        current.active = true;
        autoScroll(move.clientY);
        const over = targetId(move.clientX, move.clientY);
        if (over === current.overId) return;
        current.overId = over;
        setState({ draggingId: current.draggingId, overId: over });
        navigator.vibrate?.(8);
      };

      const onUp = (up: PointerEvent) => {
        if (up.pointerId === event.pointerId) finish(true);
      };
      const onCancel = (cancel: PointerEvent) => {
        if (cancel.pointerId === event.pointerId) finish(false);
      };
      const onKeyDown = (key: KeyboardEvent) => {
        if (key.key === "Escape") finish(false);
      };

      session.current = {
        pointerId: event.pointerId,
        draggingId: id,
        startX: event.clientX,
        startY: event.clientY,
        active: false,
        overId: null,
        cleanup: () => {
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
          window.removeEventListener("pointercancel", onCancel);
          window.removeEventListener("keydown", onKeyDown);
        },
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onCancel);
      window.addEventListener("keydown", onKeyDown);
      document.body.classList.add("tl-dragging");
      setState({ draggingId: id, overId: null });
      navigator.vibrate?.(5);
    },
    [finish],
  );

  return {
    draggingId: state?.draggingId ?? null,
    overId: state?.overId ?? null,
    start,
  };
}
