/**
 * ADVERSARIAL — OXIM binary parser (zero-trust, pessimistic)
 *
 * `parseOximBinary` consumes a byte buffer originating outside the app (a WASM
 * engine, a future downloaded asset, or a corrupted in-memory buffer). A parser
 * is the classic place where "assume well-formed" turns into crashes, memory
 * blowups, or raw runtime errors leaking past the module boundary.
 *
 * Every hostile case must surface as a controlled `OximParseError` — never a
 * `RangeError`, never an out-of-memory, never a silently corrupt mesh.
 *
 * @module tests/adversarial/parser
 */

import { describe, it, expect } from 'vitest';
import {
  parseOximBinary,
  validateMesh,
  createTestMesh,
  OximParseError,
} from '../../bodylab/apps/web/src/lib/oxim-parser';

/** Little-endian u32 header writer for crafting malformed buffers. */
function header(version: number, vertexCount: number, indexCount: number): Uint8Array {
  const b = new Uint8Array(12);
  const v = new DataView(b.buffer);
  v.setUint32(0, version, true);
  v.setUint32(4, vertexCount, true);
  v.setUint32(8, indexCount, true);
  return b;
}

describe('ADVERSARIAL: non-buffers and size floors', () => {
  it('rejects null/undefined with a controlled error', () => {
    expect(() => parseOximBinary(null as unknown as Uint8Array)).toThrow(OximParseError);
    expect(() => parseOximBinary(undefined as unknown as Uint8Array)).toThrow(OximParseError);
  });

  it('rejects an empty buffer', () => {
    expect(() => parseOximBinary(new Uint8Array(0))).toThrow(OximParseError);
  });

  it('rejects every truncated prefix of a valid mesh', () => {
    const valid = createTestMesh();
    for (let len = 0; len < valid.length; len += 7) {
      expect(() => parseOximBinary(valid.subarray(0, len))).toThrow(OximParseError);
    }
  });
});

describe('ADVERSARIAL: header validation (fuzz-ish)', () => {
  it('rejects version 0 and versions beyond the supported range', () => {
    expect(() => parseOximBinary(header(0, 3, 3))).toThrow(OximParseError);
    expect(() => parseOximBinary(header(11, 3, 3))).toThrow(OximParseError);
    expect(() => parseOximBinary(header(0xffffffff, 3, 3))).toThrow(OximParseError);
  });

  it('rejects zero vertex or index counts', () => {
    expect(() => parseOximBinary(header(1, 0, 3))).toThrow(OximParseError);
    expect(() => parseOximBinary(header(1, 3, 0))).toThrow(OximParseError);
  });

  it('rejects an index count that is not a multiple of 3', () => {
    expect(() => parseOximBinary(header(1, 3, 4))).toThrow(OximParseError);
    expect(() => parseOximBinary(header(1, 3, 1))).toThrow(OximParseError);
  });

  it('rejects an absurd vertex count without allocating', () => {
    expect(() => parseOximBinary(header(1, 1_000_001, 3))).toThrow(OximParseError);
    expect(() => parseOximBinary(header(1, 0xffffffff, 3))).toThrow(OximParseError);
  });

  it('rejects an absurd index count without overflow or allocation', () => {
    expect(() => parseOximBinary(header(1, 3, 0xffffffff))).toThrow(OximParseError);
  });

  it('always throws OximParseError, never a raw RangeError, for arbitrary bytes', () => {
    // Deterministic pseudo-random bytes — a valid-looking header is possible,
    // but the size check must still fail closed with our own error type.
    const bytes = new Uint8Array(64);
    let seed = 0x12345678;
    for (let i = 0; i < bytes.length; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      bytes[i] = seed & 0xff;
    }
    let error: unknown;
    try {
      parseOximBinary(bytes);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(OximParseError);
  });
});

describe('ADVERSARIAL: memory alignment', () => {
  it('parses a valid mesh even when handed a misaligned subarray (no RangeError)', () => {
    const valid = createTestMesh();
    const padded = new Uint8Array(valid.length + 1);
    padded.set(valid, 1); // content starts at byteOffset 1 → misaligned
    const misaligned = padded.subarray(1);
    expect(misaligned.byteOffset % 4).not.toBe(0);

    const mesh = parseOximBinary(misaligned);
    expect(mesh.vertexCount).toBe(3);
    expect(mesh.indexCount).toBe(3);
    expect(mesh.positions.length).toBe(9);
  });

  it('still fails closed for malformed content at a misaligned offset', () => {
    const padded = new Uint8Array(64);
    padded.set(header(0, 3, 3), 1);
    expect(() => parseOximBinary(padded.subarray(1))).toThrow(OximParseError);
  });
});

describe('ADVERSARIAL: valid path + mesh validation', () => {
  it('round-trips a well-formed mesh', () => {
    const mesh = parseOximBinary(createTestMesh());
    expect(mesh.version).toBe(1);
    expect(mesh.vertexCount).toBe(3);
    expect(mesh.indexCount).toBe(3);
    expect(mesh.normals.length).toBe(9);
    expect(mesh.uvs.length).toBe(6);
    expect(mesh.indices.length).toBe(3);
    expect(validateMesh(mesh)).toEqual([]);
  });

  it('validateMesh flags an index pointing past the vertex array', () => {
    const mesh = parseOximBinary(createTestMesh({ indices: [0, 1, 99] }));
    expect(validateMesh(mesh).join(' ')).toMatch(/references vertex/);
  });

  it('validateMesh flags positions far outside body scale', () => {
    const mesh = parseOximBinary(createTestMesh({ positions: [0, 0, 0, 1, 0, 0, 500, 0, 0] }));
    expect(validateMesh(mesh).length).toBeGreaterThan(0);
  });
});
