import { describe, it, expect } from 'vitest';
import { CursorUtils } from '../utils/cursor.js';
import { PaginationCursor } from '../types.js';

describe('CursorUtils', () => {
  describe('serialize and deserialize', () => {
    it('should serialize and deserialize cursor correctly', () => {
      const cursor: PaginationCursor = {
        lastEvaluatedKey: {
          pk: 'source#techcrunch.com',
          sk: 'ts#1701234567#abc123',
          GSI1PK: 'tag#bigtech',
          GSI1SK: '2023-11-29T10:30:00Z',
        },
        timestamp: '2023-11-29T10:30:00Z',
      };

      const serialized = CursorUtils.serialize(cursor);
      expect(typeof serialized).toBe('string');
      expect(serialized.length).toBeGreaterThan(0);

      const deserialized = CursorUtils.deserialize(serialized);
      expect(deserialized).toEqual(cursor);
    });

    it('should handle empty cursor', () => {
      const cursor: PaginationCursor = {};
      
      const serialized = CursorUtils.serialize(cursor);
      const deserialized = CursorUtils.deserialize(serialized);
      
      expect(deserialized).toEqual(cursor);
    });

    it('should throw error for invalid cursor format', () => {
      expect(() => CursorUtils.deserialize('invalid-base64')).toThrow('Invalid cursor format');
      expect(() => CursorUtils.deserialize('not-json-data')).toThrow('Invalid cursor format');
    });

    it('should validate cursor format', () => {
      const validCursor = CursorUtils.serialize({ timestamp: '2023-11-29T10:30:00Z' });
      expect(CursorUtils.isValid(validCursor)).toBe(true);
      
      expect(CursorUtils.isValid('invalid-cursor')).toBe(false);
      expect(CursorUtils.isValid('')).toBe(false);
    });
  });

  describe('fromLastEvaluatedKey and toExclusiveStartKey', () => {
    it('should create cursor from LastEvaluatedKey', () => {
      const lastEvaluatedKey = {
        pk: 'source#example.com',
        sk: 'ts#1701234567#def456',
      };

      const cursor = CursorUtils.fromLastEvaluatedKey(lastEvaluatedKey);
      expect(cursor).toBeDefined();
      expect(typeof cursor).toBe('string');

      const exclusiveStartKey = CursorUtils.toExclusiveStartKey(cursor);
      expect(exclusiveStartKey).toEqual(lastEvaluatedKey);
    });

    it('should return undefined for empty LastEvaluatedKey', () => {
      const cursor = CursorUtils.fromLastEvaluatedKey(undefined);
      expect(cursor).toBeUndefined();

      const exclusiveStartKey = CursorUtils.toExclusiveStartKey(undefined);
      expect(exclusiveStartKey).toBeUndefined();
    });

    it('should handle invalid cursor gracefully', () => {
      const exclusiveStartKey = CursorUtils.toExclusiveStartKey('invalid-cursor');
      expect(exclusiveStartKey).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle complex nested objects', () => {
      const cursor: PaginationCursor = {
        lastEvaluatedKey: {
          pk: 'source#complex.example.com',
          sk: 'ts#1701234567#xyz789',
          nested: {
            array: [1, 2, 3],
            object: { key: 'value' },
            null: null,
            boolean: true,
          },
        },
        timestamp: '2023-11-29T10:30:00Z',
      };

      const serialized = CursorUtils.serialize(cursor);
      const deserialized = CursorUtils.deserialize(serialized);
      
      expect(deserialized).toEqual(cursor);
    });

    it('should handle special characters in cursor data', () => {
      const cursor: PaginationCursor = {
        lastEvaluatedKey: {
          pk: 'source#测试.example.com',
          sk: 'ts#1701234567#🚀emoji',
          special: 'Special chars: !@#$%^&*()_+-=[]{}|;:,.<>?',
        },
      };

      const serialized = CursorUtils.serialize(cursor);
      const deserialized = CursorUtils.deserialize(serialized);
      
      expect(deserialized).toEqual(cursor);
    });
  });
});



