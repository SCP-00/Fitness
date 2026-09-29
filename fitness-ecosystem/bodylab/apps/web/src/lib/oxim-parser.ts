/**
 * OXIM Binary Format Parser
 *
 * Parses the binary mesh buffer produced by OxiHumanEngine.build_mesh_bytes().
 *
 * Wire format (OXIM v1 / legacy v1):
 * All multi-byte integers are little-endian.
 *
 * | Offset (bytes) | Type        | Field          |
 * |---------------|-------------|----------------|
 * | 0             | u32         | version        |
 * | 4             | u32         | vertex_count N |
 * | 8             | u32         | index_count  M |
 * | 12            | f32[N × 3]  | positions XYZ  |
 * | 12 + N×12     | f32[N × 3]  | normals XYZ    |
 * | 12 + N×24     | f32[N × 2]  | uvs UV         |
 * | 12 + N×32     | u32[M]      | indices        |
 *
 * @module oxim-parser
 */

export interface ParsedMesh {
  /** Format version (currently 1) */
  version: number;
  /** Number of vertices */
  vertexCount: number;
  /** Number of triangle indices */
  indexCount: number;
  /** Flattened XYZ positions: length = vertexCount × 3 */
  positions: Float32Array;
  /** Flattened XYZ normals: length = vertexCount × 3 */
  normals: Float32Array;
  /** Flattened UV coordinates: length = vertexCount × 2 */
  uvs: Float32Array;
  /** Triangle indices: length = indexCount */
  indices: Uint32Array;
}

export class OximParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OximParseError';
  }
}

/**
 * Parse an OXIM binary mesh buffer into structured data.
 *
 * @param bytes - Raw Uint8Array from engine.build_mesh_bytes()
 * @returns Parsed mesh data with positions, normals, UVs, and indices
 * @throws OximParseError if the buffer is malformed
 *
 * @example
 * ```ts
 * const bytes = engine.build_mesh_bytes();
 * const mesh = parseOximBinary(bytes);
 * console.log(mesh.vertexCount); // e.g. 21833
 * ```
 */
export function parseOximBinary(bytes: Uint8Array): ParsedMesh {
  if (!bytes || bytes.length < 12) {
    throw new OximParseError('Buffer too small: need at least 12 bytes for header');
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // Typed-array views require 4-byte alignment: a caller passing a subarray at
  // an odd offset (a very easy mistake) would otherwise throw a raw RangeError
  // instead of our controlled OximParseError. Copy only when misaligned.
  const aligned = bytes.byteOffset % 4 === 0 ? bytes : bytes.slice();
  let off = 0;

  // Header
  const version = view.getUint32(off, true); off += 4;
  const vertexCount = view.getUint32(off, true); off += 4;
  const indexCount = view.getUint32(off, true); off += 4;

  // Validate header
  if (version === 0 || version > 10) {
    throw new OximParseError(`Invalid version: ${version}`);
  }
  if (vertexCount === 0) {
    throw new OximParseError('Vertex count is zero');
  }
  if (vertexCount > 1_000_000) {
    throw new OximParseError(`Vertex count too large: ${vertexCount}`);
  }
  if (indexCount === 0) {
    throw new OximParseError('Index count is zero');
  }
  if (indexCount % 3 !== 0) {
    throw new OximParseError(`Index count must be divisible by 3 (got ${indexCount})`);
  }

  // Calculate expected sizes
  const positionsSize = vertexCount * 3 * 4; // f32 × 3
  const normalsSize = vertexCount * 3 * 4;
  const uvsSize = vertexCount * 2 * 4;
  const indicesSize = indexCount * 4; // u32
  const expectedTotal = 12 + positionsSize + normalsSize + uvsSize + indicesSize;

  if (bytes.length < expectedTotal) {
    throw new OximParseError(
      `Buffer too small: expected ${expectedTotal} bytes, got ${bytes.length}`
    );
  }

  // Positions
  const positions = new Float32Array(aligned.buffer, aligned.byteOffset + off, vertexCount * 3);
  off += positionsSize;

  // Normals
  const normals = new Float32Array(aligned.buffer, aligned.byteOffset + off, vertexCount * 3);
  off += normalsSize;

  // UVs
  const uvs = new Float32Array(aligned.buffer, aligned.byteOffset + off, vertexCount * 2);
  off += uvsSize;

  // Indices
  const indices = new Uint32Array(aligned.buffer, aligned.byteOffset + off, indexCount);

  return {
    version,
    vertexCount,
    indexCount,
    positions: positions.slice(), // copy to avoid SharedArrayBuffer issues
    normals: normals.slice(),
    uvs: uvs.slice(),
    indices: indices.slice(),
  };
}

/**
 * Validate that a parsed mesh has reasonable geometry.
 * Returns an array of warnings (empty = valid).
 *
 * @param mesh - Parsed mesh from parseOximBinary
 * @returns Array of warning strings
 */
export function validateMesh(mesh: ParsedMesh): string[] {
  const warnings: string[] = [];

  // Check positions are within reasonable bounds (-10 to 10 meters)
  for (let i = 0; i < mesh.positions.length; i += 3) {
    const x = mesh.positions[i];
    const y = mesh.positions[i + 1];
    const z = mesh.positions[i + 2];
    if (Math.abs(x) > 10 || Math.abs(y) > 10 || Math.abs(z) > 10) {
      warnings.push(`Vertex ${i / 3} out of bounds: (${x}, ${y}, ${z})`);
      break; // Don't spam
    }
  }

  // Check indices are within vertex range
  for (let i = 0; i < mesh.indices.length; i++) {
    if (mesh.indices[i] >= mesh.vertexCount) {
      warnings.push(`Index ${i} references vertex ${mesh.indices[i]} >= vertexCount ${mesh.vertexCount}`);
      break;
    }
  }

  // Check normals are unit-ish (length close to 1)
  for (let i = 0; i < mesh.normals.length; i += 3) {
    const nx = mesh.normals[i];
    const ny = mesh.normals[i + 1];
    const nz = mesh.normals[i + 2];
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len > 0.01 && (len < 0.5 || len > 2.0)) {
      warnings.push(`Normal at vertex ${i / 3} has unusual length: ${len.toFixed(3)}`);
      break;
    }
  }

  // Check UVs are in [0, 1] range (mostly)
  let uvsOutOfRange = 0;
  for (let i = 0; i < mesh.uvs.length; i++) {
    if (mesh.uvs[i] < -0.1 || mesh.uvs[i] > 1.1) {
      uvsOutOfRange++;
    }
  }
  if (uvsOutOfRange > mesh.vertexCount * 0.1) {
    warnings.push(`${uvsOutOfRange} UVs out of [0,1] range (>10% of vertices)`);
  }

  return warnings;
}

/**
 * Create a minimal test mesh for unit testing.
 * This creates a simple triangle mesh (3 vertices, 1 triangle).
 */
export function createTestMesh(overrides?: Partial<{
  vertexCount: number;
  indexCount: number;
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
}>): Uint8Array {
  const vCount = overrides?.vertexCount ?? 3;
  const iCount = overrides?.indexCount ?? 3;

  const headerSize = 12;
  const positionsSize = vCount * 3 * 4;
  const normalsSize = vCount * 3 * 4;
  const uvsSize = vCount * 2 * 4;
  const indicesSize = iCount * 4;
  const totalSize = headerSize + positionsSize + normalsSize + uvsSize + indicesSize;

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  let off = 0;

  // Header
  view.setUint32(off, 1, true); off += 4; // version
  view.setUint32(off, vCount, true); off += 4; // vertex count
  view.setUint32(off, iCount, true); off += 4; // index count

  // Positions
  const defaultPositions = [0, 0, 0, 1, 0, 0, 0, 1, 0];
  const positions = overrides?.positions ?? defaultPositions;
  for (let i = 0; i < positions.length; i++) {
    view.setFloat32(off, positions[i], true); off += 4;
  }

  // Normals
  const defaultNormals = [0, 0, 1, 0, 0, 1, 0, 0, 1];
  const normals = overrides?.normals ?? defaultNormals;
  for (let i = 0; i < normals.length; i++) {
    view.setFloat32(off, normals[i], true); off += 4;
  }

  // UVs
  const defaultUvs = [0, 0, 1, 0, 0, 1];
  const uvs = overrides?.uvs ?? defaultUvs;
  for (let i = 0; i < uvs.length; i++) {
    view.setFloat32(off, uvs[i], true); off += 4;
  }

  // Indices
  const defaultIndices = [0, 1, 2];
  const indices = overrides?.indices ?? defaultIndices;
  for (let i = 0; i < indices.length; i++) {
    view.setUint32(off, indices[i], true); off += 4;
  }

  return new Uint8Array(buffer);
}
