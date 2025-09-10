import { PaginationCursor } from '../types.js';

/**
 * 游标工具类 - 处理分页游标的序列化和反序列化
 */
export class CursorUtils {
  /**
   * 序列化游标为 Base64 字符串
   */
  static serialize(cursor: PaginationCursor): string {
    try {
      const jsonString = JSON.stringify(cursor);
      return Buffer.from(jsonString, 'utf-8').toString('base64');
    } catch (error) {
      console.error('Failed to serialize cursor:', error);
      throw new Error('Invalid cursor data');
    }
  }

  /**
   * 反序列化 Base64 游标字符串
   */
  static deserialize(cursorString: string): PaginationCursor {
    try {
      const jsonString = Buffer.from(cursorString, 'base64').toString('utf-8');
      const cursor = JSON.parse(jsonString) as PaginationCursor;
      
      // 验证游标结构
      if (typeof cursor !== 'object' || cursor === null) {
        throw new Error('Invalid cursor structure');
      }
      
      return cursor;
    } catch (error) {
      console.error('Failed to deserialize cursor:', error);
      throw new Error('Invalid cursor format');
    }
  }

  /**
   * 验证游标是否有效
   */
  static isValid(cursorString: string): boolean {
    try {
      CursorUtils.deserialize(cursorString);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 从 DynamoDB LastEvaluatedKey 创建游标
   */
  static fromLastEvaluatedKey(lastEvaluatedKey?: Record<string, any>): string | undefined {
    if (!lastEvaluatedKey) {
      return undefined;
    }

    const cursor: PaginationCursor = {
      lastEvaluatedKey,
      timestamp: new Date().toISOString(),
    };

    return CursorUtils.serialize(cursor);
  }

  /**
   * 从游标提取 DynamoDB ExclusiveStartKey
   */
  static toExclusiveStartKey(cursorString?: string): Record<string, any> | undefined {
    if (!cursorString) {
      return undefined;
    }

    try {
      const cursor = CursorUtils.deserialize(cursorString);
      return cursor.lastEvaluatedKey;
    } catch (error) {
      console.warn('Invalid cursor provided, ignoring:', error);
      return undefined;
    }
  }
}



