/**
 * OXIM Binary Format Parser Tests
 *
 * Tests the binary parser for OxiHuman mesh data.
 * Verifies header parsing, vertex/index extraction, validation,
 * and error handling for malformed buffers.
 *
 * Wire format (OXIM v1):
 * | Offset | Type     | Field          |
 * |--------|----------|----------------|
 * | 0      | u32 LE   | version        |
 * | 4      | u32 LE   | vertex_count N |
 * | 8      | u32 LE   | index_count M  |
 * | 12     | f32[N×3] | positions XYZ  |
 * | 12+N×12| f32[N×3] | normals XYZ    |
 * | 12+N×24| f32[N×2] | uvs UV         |
 * | 12+N×32| u32[M]   | indices        |
 */

import { describe, it, expect } from 'vitest';
import {
  parseOximBinary,
  validateMesh,
  createTestMesh,
  OximParseError,
} from '../../bodylab/apps/web/src/lib/oxim-parser';

describe('OXIM Binary Parser', () => {
  describe('Successful parsing', () => {
    it('should parse a minimal 3-vertex triangle mesh', () => {
      const bytes = createTestMesh();
      const mesh = parseOximBinary(bytes);

      expect(mesh.version).toBe(1);
      expect(mesh.vertexCount).toBe(3);
      expect(mesh.indexCount).toBe(3);
      expect(mesh.positions).toHaveLength(9);  // 3 vertices × 3 components
      expect(mesh.normals).toHaveLength(9);
      expect(mesh.uvs).toHaveLength(6);        // 3 vertices × 2 components
      expect(mesh.indices).toHaveLength(3);
    });

    it('should parse correct vertex positions', () => {
      const bytes = createTestMesh({
        positions: [0, 0, 0, 1, 0, 0, 0.5, 1, 0],
      });
      const mesh = parseOximBinary(bytes);

      expect(mesh.positions[0]).toBe(0);
      expect(mesh.positions[1]).toBe(0);
      expect(mesh.positions[2]).toBe(0);
      expect(mesh.positions[3]).toBe(1);
      expect(mesh.positions[4]).toBe(0);
      expect(mesh.positions[5]).toBe(0);
      expect(mesh.positions[6]).toBeCloseTo(0.5);
      expect(mesh.positions[7]).toBe(1);
      expect(mesh.positions[8]).toBe(0);
    });

    it('should parse correct normals', () => {
      const bytes = createTestMesh({
        normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
      });
      const mesh = parseOximBinary(bytes);

      expect(mesh.normals[2]).toBe(1);  // Z component
      expect(mesh.normals[5]).toBe(1);
      expect(mesh.normals[8]).toBe(1);
    });

    it('should parse correct UVs', () => {
      const bytes = createTestMesh({
        uvs: [0, 0, 1, 0, 0.5, 1],
      });
      const mesh = parseOximBinary(bytes);

      expect(mesh.uvs[0]).toBe(0);
      expect(mesh.uvs[1]).toBe(0);
      expect(mesh.uvs[2]).toBe(1);
      expect(mesh.uvs[3]).toBe(0);
      expect(mesh.uvs[4]).toBeCloseTo(0.5);
      expect(mesh.uvs[5]).toBe(1);
    });

    it('should parse correct indices', () => {
      const bytes = createTestMesh({
        indices: [0, 1, 2],
      });
      const mesh = parseOximBinary(bytes);

      expect(mesh.indices[0]).toBe(0);
      expect(mesh.indices[1]).toBe(1);
      expect(mesh.indices[2]).toBe(2);
    });

    it('should parse a 6-vertex quad mesh (2 triangles)', () => {
      const bytes = createTestMesh({
        vertexCount: 6,
        indexCount: 6,
        positions: [0,0,0, 1,0,0, 1,1,0, 0,0,0, 1,1,0, 0,1,0],
        normals: [0,0,1, 0,0,1, 0,0,1, 0,0,1, 0,0,1, 0,0,1],
        uvs: [0,0, 1,0, 1,1, 0,0, 1,1, 0,1],
        indices: [0,1,2, 3,4,5],
      });
      const mesh = parseOximBinary(bytes);

      expect(mesh.vertexCount).toBe(6);
      expect(mesh.indexCount).toBe(6);
      expect(mesh.positions).toHaveLength(18);
      expect(mesh.indices).toHaveLength(6);
    });

    it('should return copies, not views into original buffer', () => {
      const bytes = createTestMesh();
      const mesh1 = parseOximBinary(bytes);
      const mesh2 = parseOximBinary(bytes);

      // Modifying mesh1 should not affect mesh2
      mesh1.positions[0] = 999;
      expect(mesh2.positions[0]).toBe(0);
    });
  });

  describe('Version handling', () => {
    it('should accept version 1', () => {
      const bytes = createTestMesh();
      const mesh = parseOximBinary(bytes);
      expect(mesh.version).toBe(1);
    });

    it('should reject version 0', () => {
      const bytes = createTestMesh();
      // Overwrite version field
      const view = new DataView(bytes.buffer);
      view.setUint32(0, 0, true);

      expect(() => parseOximBinary(bytes)).toThrow(OximParseError);
      expect(() => parseOximBinary(bytes)).toThrow('Invalid version: 0');
    });

    it('should reject version > 10', () => {
      const bytes = createTestMesh();
      const view = new DataView(bytes.buffer);
      view.setUint32(0, 11, true);

      expect(() => parseOximBinary(bytes)).toThrow('Invalid version: 11');
    });

    it('should accept version 5 (future version)', () => {
      const bytes = createTestMesh();
      const view = new DataView(bytes.buffer);
      view.setUint32(0, 5, true);

      const mesh = parseOximBinary(bytes);
      expect(mesh.version).toBe(5);
    });
  });

  describe('Error handling', () => {
    it('should throw for null/undefined input', () => {
      expect(() => parseOximBinary(null as any)).toThrow();
      expect(() => parseOximBinary(undefined as any)).toThrow();
    });

    it('should throw for buffer too small (< 12 bytes)', () => {
      const tiny = new Uint8Array(8);
      expect(() => parseOximBinary(tiny)).toThrow('Buffer too small');
    });

    it('should throw for empty buffer', () => {
      expect(() => parseOximBinary(new Uint8Array(0))).toThrow('Buffer too small');
    });

    it('should throw for zero vertex count', () => {
      const bytes = createTestMesh();
      const view = new DataView(bytes.buffer);
      view.setUint32(4, 0, true); // vertex_count = 0

      expect(() => parseOximBinary(bytes)).toThrow('Vertex count is zero');
    });

    it('should throw for zero index count', () => {
      const bytes = createTestMesh();
      const view = new DataView(bytes.buffer);
      view.setUint32(8, 0, true); // index_count = 0

      expect(() => parseOximBinary(bytes)).toThrow('Index count is zero');
    });

    it('should throw for index count not divisible by 3', () => {
      const bytes = createTestMesh();
      const view = new DataView(bytes.buffer);
      view.setUint32(8, 7, true); // index_count = 7 (not divisible by 3)

      expect(() => parseOximBinary(bytes)).toThrow('Index count must be divisible by 3');
    });

    it('should throw for vertex count > 1,000,000', () => {
      const bytes = createTestMesh();
      const view = new DataView(bytes.buffer);
      view.setUint32(4, 1_000_001, true);

      expect(() => parseOximBinary(bytes)).toThrow('Vertex count too large');
    });

    it('should throw for truncated buffer', () => {
      // Create a valid header but truncate the data
      const buffer = new ArrayBuffer(20);
      const view = new DataView(buffer);
      view.setUint32(0, 1, true);   // version
      view.setUint32(4, 100, true); // vertex_count = 100
      view.setUint32(8, 300, true); // index_count = 300

      // Buffer is only 20 bytes, but needs ~16,000+
      const bytes = new Uint8Array(buffer);
      expect(() => parseOximBinary(bytes)).toThrow('Buffer too small');
    });

    it('should throw OximParseError (not generic Error)', () => {
      const tiny = new Uint8Array(4);
      try {
        parseOximBinary(tiny);
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(OximParseError);
        expect((e as OximParseError).name).toBe('OximParseError');
      }
    });
  });

  describe('createTestMesh', () => {
    it('should create a valid mesh buffer', () => {
      const bytes = createTestMesh();
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBeGreaterThan(12);

      // Should be parseable
      const mesh = parseOximBinary(bytes);
      expect(mesh.vertexCount).toBe(3);
    });

    it('should respect custom vertex/index counts', () => {
      const bytes = createTestMesh({ vertexCount: 6, indexCount: 6 });
      const mesh = parseOximBinary(bytes);
      expect(mesh.vertexCount).toBe(6);
      expect(mesh.indexCount).toBe(6);
    });

    it('should create buffer with correct total size', () => {
      const vCount = 4;
      const iCount = 6;
      const bytes = createTestMesh({ vertexCount: vCount, indexCount: iCount });

      const expectedSize = 12 + vCount * 3 * 4 + vCount * 3 * 4 + vCount * 2 * 4 + iCount * 4;
      expect(bytes.length).toBe(expectedSize);
    });
  });

  describe('validateMesh', () => {
    it('should return no warnings for a valid mesh', () => {
      const bytes = createTestMesh({
        positions: [0, 0.5, 0, 1, 0.5, 0, 0.5, 1.5, 0],
        normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
        uvs: [0, 0, 1, 0, 0.5, 1],
        indices: [0, 1, 2],
      });
      const mesh = parseOximBinary(bytes);
      const warnings = validateMesh(mesh);
      expect(warnings).toHaveLength(0);
    });

    it('should warn for out-of-bounds vertices', () => {
      const bytes = createTestMesh({
        positions: [0, 0, 0, 15, 0, 0, 0, 1, 0], // x=15 > 10
      });
      const mesh = parseOximBinary(bytes);
      const warnings = validateMesh(mesh);
      expect(warnings.some(w => w.includes('out of bounds'))).toBe(true);
    });

    it('should warn for out-of-range indices', () => {
      const bytes = createTestMesh({
        vertexCount: 3,
        indexCount: 3,
        indices: [0, 1, 5], // 5 >= vertexCount (3)
      });
      const mesh = parseOximBinary(bytes);
      const warnings = validateMesh(mesh);
      expect(warnings.some(w => w.includes('references vertex'))).toBe(true);
    });

    it('should warn for unusual normal lengths', () => {
      const bytes = createTestMesh({
        normals: [0, 0, 5, 0, 0, 1, 0, 0, 1], // length ~5, not unit
      });
      const mesh = parseOximBinary(bytes);
      const warnings = validateMesh(mesh);
      expect(warnings.some(w => w.includes('unusual length'))).toBe(true);
    });

    it('should warn for many out-of-range UVs', () => {
      // Create mesh with all UVs way out of range
      const bytes = createTestMesh({
        vertexCount: 3,
        indexCount: 3,
        uvs: [5, 5, 5, 5, 5, 5], // all > 1.1
      });
      const mesh = parseOximBinary(bytes);
      const warnings = validateMesh(mesh);
      expect(warnings.some(w => w.includes('UVs out of'))).toBe(true);
    });

    it('should handle mesh with zero-length normals gracefully', () => {
      const bytes = createTestMesh({
        normals: [0, 0, 0, 0, 0, 0, 0, 0, 0], // zero normals
      });
      const mesh = parseOximBinary(bytes);
      const warnings = validateMesh(mesh);
      // Zero-length normals should not trigger the unusual length warning
      expect(warnings.some(w => w.includes('unusual length'))).toBe(false);
    });
  });

  describe('Binary format compliance', () => {
    it('should use little-endian byte order', () => {
      // Create a mesh with known values
      const bytes = createTestMesh({
        positions: [1.5, 2.5, 3.5],
      });

      // Manually read the position data to verify LE encoding
      const view = new DataView(bytes.buffer);
      const positionsStart = 12; // after header
      const x = view.getFloat32(positionsStart, true); // little-endian
      const y = view.getFloat32(positionsStart + 4, true);
      const z = view.getFloat32(positionsStart + 8, true);

      expect(x).toBeCloseTo(1.5);
      expect(y).toBeCloseTo(2.5);
      expect(z).toBeCloseTo(3.5);
    });

    it('should have correct memory layout for 3-vertex mesh', () => {
      const bytes = createTestMesh();
      // Header: 12 bytes
      // Positions: 3 × 3 × 4 = 36 bytes
      // Normals: 3 × 3 × 4 = 36 bytes
      // UVs: 3 × 2 × 4 = 24 bytes
      // Indices: 3 × 4 = 12 bytes
      // Total: 12 + 36 + 36 + 24 + 12 = 120 bytes
      expect(bytes.length).toBe(120);
    });

    it('should preserve float precision for positions', () => {
      const bytes = createTestMesh({
        positions: [0.123456789, 0.987654321, 0.555555555],
      });
      const mesh = parseOximBinary(bytes);

      // f32 has ~7 decimal digits of precision
      expect(mesh.positions[0]).toBeCloseTo(0.123456789, 6);
      expect(mesh.positions[1]).toBeCloseTo(0.987654321, 6);
      expect(mesh.positions[2]).toBeCloseTo(0.555555555, 6);
    });
  });
});
