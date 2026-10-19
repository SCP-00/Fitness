/**
 * The file side of the ACTIONS channel (docs/MCP_TOOL_SURFACE.md, D1).
 *
 * Two commands, both as narrow as the autobackup pair: the WebView *takes* the
 * pending action file (read + unlink, so a crash cannot hand the same batch
 * over twice) and *writes* the receipts back as a JSON array. Neither takes a
 * path — the directory is computed in Rust — and no filesystem plugin is
 * registered, so this bridge cannot reach anything else on disk.
 *
 * The browser build has no host at all: every call resolves to `null` and the
 * store simply never polls. An action written while the app is closed waits in
 * the file for the next launch, which is exactly why the app-side ledger has to
 * be idempotent.
 *
 * Nothing here throws: a channel that is unavailable must never break the UI
 * that is on screen.
 *
 * @module lib/mcp-bridge
 */

import { invoke } from "@tauri-apps/api/core";
import { isDesktopHost } from "./autobackup";
import type { McpReceipt } from "./mcp-actions";

export const MCP_POLL_MS = 1000;

/** The pending action file, consumed in one step — or `null` when empty. */
export async function takeMcpInbox(): Promise<string | null> {
  if (!isDesktopHost()) return null;
  try {
    const text = await invoke<string | null>("take_mcp_inbox");
    return text && text.trim() !== "" ? text : null;
  } catch {
    return null;
  }
}

/** Merge our receipts into `mcp-results.json`. Returns the path, or `null`. */
export async function writeMcpResults(
  receipts: readonly McpReceipt[],
): Promise<string | null> {
  if (isDesktopHost() && receipts.length > 0) {
    try {
      return await invoke<string>("write_mcp_results", {
        contents: JSON.stringify(receipts),
      });
    } catch {
      // The ledger still holds every receipt: the next successful write (or an
      // undo) will push them again.
      return null;
    }
  }
  return null;
}
