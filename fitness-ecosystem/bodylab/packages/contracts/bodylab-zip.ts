/**
 * Minimal, dependency-free reader for the `.bodylab` ZIP.
 *
 * The web app writes the backup with JSZip (DEFLATE); this app must not take a
 * new dependency for two JSON files, and WebView2/Chromium already expose
 * `DecompressionStream("deflate-raw")`. So we walk the central directory,
 * accept the two methods a zip writer realistically emits (0 = stored,
 * 8 = deflate) and decode UTF-8.
 *
 * Anything unexpected (missing EOCD, truncated offsets, ZIP64, encryption,
 * unknown method) returns `null`: import is a trust boundary and a partial
 * read would be worse than a clear "could not read this file". CRC is not
 * verified because the payload is parsed as JSON immediately after.
 *
 * @module packages/contracts/bodylab-zip
 */

import {
  archiveFromCollections,
  type LegacyArchive,
} from "./bodylab-legacy";

const EOCD_SIG = 0x06054b50;
const CENTRAL_SIG = 0x02014b50;
const LOCAL_SIG = 0x04034b50;

const utf8 = new TextDecoder("utf-8");

async function inflateRaw(data: Uint8Array): Promise<Uint8Array | null> {
  if (typeof DecompressionStream === "undefined") return null;
  try {
    // Copy into a plain ArrayBuffer: the source may be a subarray view, and
    // `Response` only accepts a whole buffer as a body.
    const buffer = new ArrayBuffer(data.byteLength);
    new Uint8Array(buffer).set(data);
    const stream = new Response(buffer).body!.pipeThrough(
      new DecompressionStream("deflate-raw"),
    );
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    return null;
  }
}

/**
 * Read every non-directory entry of a ZIP as UTF-8 text, or `null` when the
 * archive is malformed. Duplicate names: the last one wins (same as unzip
 * tools extracting over a previous file).
 */
export async function readZipEntries(
  bytes: Uint8Array,
): Promise<Map<string, string> | null> {
  if (bytes.length < 22) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  // End of central directory: scan back over the (possible) comment.
  let eocd = -1;
  const lowest = Math.max(0, bytes.length - 22 - 0xffff);
  for (let i = bytes.length - 22; i >= lowest; i -= 1) {
    if (view.getUint32(i, true) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;

  const count = view.getUint16(eocd + 10, true);
  const centralOffset = view.getUint32(eocd + 16, true);
  if (count === 0xffff || centralOffset === 0xffffffff) return null; // ZIP64
  if (centralOffset + 46 > eocd) return null;

  const entries = new Map<string, string>();
  let cursor = centralOffset;
  for (let index = 0; index < count; index += 1) {
    if (cursor + 46 > bytes.length) return null;
    if (view.getUint32(cursor, true) !== CENTRAL_SIG) return null;

    const flags = view.getUint16(cursor + 8, true);
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const nameStart = cursor + 46;
    if (nameStart + nameLength > bytes.length) return null;
    const name = utf8.decode(bytes.subarray(nameStart, nameStart + nameLength));
    cursor = nameStart + nameLength + extraLength + commentLength;

    if (flags & 0x1) return null; // encrypted
    if (name.endsWith("/")) continue;
    if (method !== 0 && method !== 8) return null;

    if (localOffset + 30 > bytes.length) return null;
    if (view.getUint32(localOffset, true) !== LOCAL_SIG) return null;
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataStart + compressedSize;
    if (dataStart > bytes.length || dataEnd > bytes.length) return null;

    const raw = bytes.subarray(dataStart, dataEnd);
    const payload = method === 0 ? raw : await inflateRaw(raw);
    if (!payload) return null;
    entries.set(name, utf8.decode(payload));
  }
  return entries;
}

function parseJson(text: string | undefined): unknown {
  if (text === undefined) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/**
 * Read a `.bodylab` archive (ZIP layout produced by the web app):
 * `manifest.json` + `profile.json` + `measurements.json` + `snapshots.json`.
 *
 * `metadata.json` is BodyLab's export summary, not app settings, so it stays
 * out of the archive; `omitted` in the result tells the preview what the file
 * does not carry (sets, max efforts, preferences).
 */
export async function readBodyLabZip(
  bytes: Uint8Array,
): Promise<LegacyArchive | null> {
  const entries = await readZipEntries(bytes);
  if (!entries) return null;

  const manifest = parseJson(entries.get("manifest.json"));
  if (
    typeof manifest !== "object" ||
    manifest === null ||
    (manifest as Record<string, unknown>).format !== "bodylab"
  ) {
    return null;
  }

  return archiveFromCollections({
    profile: parseJson(entries.get("profile.json")) ?? null,
    measurements: parseJson(entries.get("measurements.json")) ?? [],
    snapshots: parseJson(entries.get("snapshots.json")) ?? [],
  });
}
