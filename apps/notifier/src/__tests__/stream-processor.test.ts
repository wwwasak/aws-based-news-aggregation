import { describe, it, expect, beforeEach } from 'vitest';
import { StreamProcessor } from '../stream-processor.js';
import { NotificationConfig, NotificationReason, NotificationPriority } from '../types.js';
import { DynamoDBRecord } from 'aws-lambda';

describe('StreamProcessor', () => {
  let processor: StreamProcessor;
  let config: NotificationConfig;

  beforeEach(() => {
    config = {
      bigTechMinScore: 70,
      policyTags: ['antitrust', 'doj', 'ftc', 'regulation'],
      highPriorityTags: ['breaking', 'urgent', 'acquisition'],
      deduplicationWindow: 24,
    };

    processor = new StreamProcessor(config);
  });

  describe('parseStreamRecord', () => {
    it('should parse INSERT record correctly', () => {
      const record: DynamoDBRecord = {
        eventID: 'test-event-1',
        eventName: 'INSERT',
        eventVersion: '1.1',
        eventSource: 'aws:dynamodb',
        awsRegion: 'us-east-1',
        dynamodb: {
          ApproximateCreationDateTime: new Date(),
          Keys: {
            pk: { S: 'source#techcrunch.com' },
            sk: { S: 'ts#1701234567#abc123' },
          },
          NewImage: {
            pk: { S: 'source#techcrunch.com' },
            sk: { S: 'ts#1701234567#abc123' },
            url: { S: 'https://techcrunch.com/test-article' },
            urlHash: { S: 'abc123' },
            title: { S: 'Google faces antitrust investigation' },
            source: { S: 'TechCrunch' },
            domain: { S: 'techcrunch.com' },
            summary: { S: 'DOJ investigates Google for antitrust violations' },
            publishedAt: { S: '2023-11-29T10:00:00Z' },
            tags: { SS: ['company:google', 'antitrust', 'bigtech'] },
            score: { N: '85' },
            isBigTech: { BOOL: true },
            isPolicy: { BOOL: true },
          },
          SequenceNumber: '123456789',
          SizeBytes: 1024,
          StreamViewType: 'NEW_AND_OLD_IMAGES',
        },
        eventSourceARN: 'arn:aws:dynamodb:us-east-1:123456789012:table/articles/stream/test',
      };

      const result = processor.parseStreamRecord(record);

      expect(result).toBeDefined();
      expect(result!.eventName).toBe('INSERT');
      expect(result!.article).toBeDefined();
      expect(result!.article!.title).toBe('Google faces antitrust investigation');
      expect(result!.article!.isBigTech).toBe(true);
      expect(result!.article!.score).toBe(85);
    });

    it('should skip non-article records', () => {
      const record: DynamoDBRecord = {
        eventID: 'test-event-2',
        eventName: 'INSERT',
        eventVersion: '1.1',
        eventSource: 'aws:dynamodb',
        awsRegion: 'us-east-1',
        dynamodb: {
          ApproximateCreationDateTime: new Date(),
          Keys: {
            pk: { S: 'config#settings' },
            sk: { S: 'v1' },
          },
          NewImage: {
            pk: { S: 'config#settings' },
            sk: { S: 'v1' },
            setting: { S: 'value' },
          },
          SequenceNumber: '123456790',
          SizeBytes: 256,
          StreamViewType: 'NEW_AND_OLD_IMAGES',
        },
        eventSourceARN: 'arn:aws:dynamodb:us-east-1:123456789012:table/articles/stream/test',
      };

      const result = processor.parseStreamRecord(record);
      expect(result).toBeNull();
    });

    it('should skip DELETE events', () => {
      const record: DynamoDBRecord = {
        eventID: 'test-event-3',
        eventName: 'REMOVE',
        eventVersion: '1.1',
        eventSource: 'aws:dynamodb',
        awsRegion: 'us-east-1',
        dynamodb: {
          ApproximateCreationDateTime: new Date(),
          Keys: {
            pk: { S: 'source#example.com' },
            sk: { S: 'ts#1701234567#def456' },
          },
          SequenceNumber: '123456791',
          SizeBytes: 512,
          StreamViewType: 'NEW_AND_OLD_IMAGES',
        },
        eventSourceARN: 'arn:aws:dynamodb:us-east-1:123456789012:table/articles/stream/test',
      };

      const result = processor.parseStreamRecord(record);
      expect(result).toBeNull();
    });
  });

  describe('getNotificationReasons', () => {
    it('should identify BigTech high score articles', () => {
      const article = {
        id: 'test-1',
        title: 'Apple announces new iPhone',
        source: 'TechCrunch',
        domain: 'techcrunch.com',
        url: 'https://techcrunch.com/apple-iphone',
        summary: 'Apple releases new iPhone with advanced features',
        publishedAt: '2023-11-29T10:00:00Z',
        tags: ['company:apple', 'bigtech'],
        score: 80,
        isBigTech: true,
        isPolicy: false,
        notificationReason: [],
        priority: NotificationPriority.LOW,
      };

      const reasons = processor.getNotificationReasons(article);
      expect(reasons).toContain(NotificationReason.BIG_TECH_HIGH_SCORE);
    });

    it('should identify policy-related articles', () => {
      const article = {
        id: 'test-2',
        title: 'FTC investigates tech monopoly',
        source: 'Reuters',
        domain: 'reuters.com',
        url: 'https://reuters.com/ftc-investigation',
        summary: 'Federal Trade Commission launches investigation',
        publishedAt: '2023-11-29T10:00:00Z',
        tags: ['ftc', 'regulation', 'policy'],
        score: 65,
        isBigTech: false,
        isPolicy: true,
        notificationReason: [],
        priority: NotificationPriority.LOW,
      };

      const reasons = processor.getNotificationReasons(article);
      expect(reasons).toContain(NotificationReason.POLICY_TAG_MATCH);
    });

    it('should identify breaking news', () => {
      const article = {
        id: 'test-3',
        title: 'BREAKING: Major acquisition announced',
        source: 'Bloomberg',
        domain: 'bloomberg.com',
        url: 'https://bloomberg.com/breaking-news',
        summary: 'Breaking news about major tech acquisition',
        publishedAt: '2023-11-29T10:00:00Z',
        tags: ['breaking', 'acquisition'],
        score: 95,
        isBigTech: true,
        isPolicy: false,
        notificationReason: [],
        priority: NotificationPriority.LOW,
      };

      const reasons = processor.getNotificationReasons(article);
      expect(reasons).toContain(NotificationReason.BREAKING_NEWS);
      expect(reasons).toContain(NotificationReason.HIGH_PRIORITY_TAG);
    });

    it('should return empty array for low-score articles', () => {
      const article = {
        id: 'test-4',
        title: 'Minor tech update',
        source: 'Example',
        domain: 'example.com',
        url: 'https://example.com/minor-update',
        summary: 'Small technical update',
        publishedAt: '2023-11-29T10:00:00Z',
        tags: ['technology'],
        score: 30,
        isBigTech: false,
        isPolicy: false,
        notificationReason: [],
        priority: NotificationPriority.LOW,
      };

      const reasons = processor.getNotificationReasons(article);
      expect(reasons).toHaveLength(0);
    });
  });

  describe('determineNotificationPriority', () => {
    it('should assign URGENT priority to breaking news', () => {
      const priority = processor.determineNotificationPriority(
        [NotificationReason.BREAKING_NEWS],
        95
      );
      expect(priority).toBe(NotificationPriority.URGENT);
    });

    it('should assign HIGH priority to policy articles', () => {
      const priority = processor.determineNotificationPriority(
        [NotificationReason.POLICY_TAG_MATCH],
        70
      );
      expect(priority).toBe(NotificationPriority.HIGH);
    });

    it('should assign HIGH priority to high-score BigTech articles', () => {
      const priority = processor.determineNotificationPriority(
        [NotificationReason.BIG_TECH_HIGH_SCORE],
        90
      );
      expect(priority).toBe(NotificationPriority.HIGH);
    });

    it('should assign NORMAL priority to regular BigTech articles', () => {
      const priority = processor.determineNotificationPriority(
        [NotificationReason.BIG_TECH_HIGH_SCORE],
        75
      );
      expect(priority).toBe(NotificationPriority.NORMAL);
    });

    it('should assign LOW priority as default', () => {
      const priority = processor.determineNotificationPriority([], 50);
      expect(priority).toBe(NotificationPriority.LOW);
    });
  });

  describe('shouldNotify', () => {
    it('should return true for articles with notification reasons', () => {
      const parsedRecord = {
        eventName: 'INSERT',
        article: {
          id: 'test-1',
          title: 'Google antitrust case',
          source: 'TechCrunch',
          domain: 'techcrunch.com',
          url: 'https://techcrunch.com/google-antitrust',
          summary: 'DOJ files antitrust case against Google',
          publishedAt: '2023-11-29T10:00:00Z',
          tags: ['company:google', 'antitrust', 'bigtech'],
          score: 85,
          isBigTech: true,
          isPolicy: true,
          notificationReason: [NotificationReason.BIG_TECH_HIGH_SCORE, NotificationReason.POLICY_TAG_MATCH],
          priority: NotificationPriority.HIGH,
        },
      };

      const result = processor.shouldNotify(parsedRecord);
      expect(result).toBe(true);
    });

    it('should return false for articles without notification reasons', () => {
      const parsedRecord = {
        eventName: 'INSERT',
        article: {
          id: 'test-2',
          title: 'Minor update',
          source: 'Example',
          domain: 'example.com',
          url: 'https://example.com/minor-update',
          summary: 'Small update',
          publishedAt: '2023-11-29T10:00:00Z',
          tags: ['technology'],
          score: 20,
          isBigTech: false,
          isPolicy: false,
          notificationReason: [],
          priority: NotificationPriority.LOW,
        },
      };

      const result = processor.shouldNotify(parsedRecord);
      expect(result).toBe(false);
    });
  });

  describe('processBatchRecords', () => {
    it('should process batch of records correctly', () => {
      const records: DynamoDBRecord[] = [
        {
          eventID: 'batch-1',
          eventName: 'INSERT',
          eventVersion: '1.1',
          eventSource: 'aws:dynamodb',
          awsRegion: 'us-east-1',
          dynamodb: {
            ApproximateCreationDateTime: new Date(),
            Keys: {
              pk: { S: 'source#techcrunch.com' },
              sk: { S: 'ts#1701234567#batch1' },
            },
            NewImage: {
              pk: { S: 'source#techcrunch.com' },
              sk: { S: 'ts#1701234567#batch1' },
              url: { S: 'https://techcrunch.com/batch-1' },
              urlHash: { S: 'batch1' },
              title: { S: 'Apple releases iOS update' },
              source: { S: 'TechCrunch' },
              domain: { S: 'techcrunch.com' },
              summary: { S: 'New iOS features announced' },
              publishedAt: { S: '2023-11-29T10:00:00Z' },
              tags: { SS: ['company:apple', 'bigtech'] },
              score: { N: '75' },
              isBigTech: { BOOL: true },
              isPolicy: { BOOL: false },
            },
            SequenceNumber: '1',
            SizeBytes: 1024,
            StreamViewType: 'NEW_AND_OLD_IMAGES',
          },
          eventSourceARN: 'arn:aws:dynamodb:us-east-1:123456789012:table/articles/stream/test',
        },
        {
          eventID: 'batch-2',
          eventName: 'REMOVE',
          eventVersion: '1.1',
          eventSource: 'aws:dynamodb',
          awsRegion: 'us-east-1',
          dynamodb: {
            ApproximateCreationDateTime: new Date(),
            Keys: {
              pk: { S: 'source#example.com' },
              sk: { S: 'ts#1701234567#batch2' },
            },
            SequenceNumber: '2',
            SizeBytes: 512,
            StreamViewType: 'NEW_AND_OLD_IMAGES',
          },
          eventSourceARN: 'arn:aws:dynamodb:us-east-1:123456789012:table/articles/stream/test',
        },
      ];

      const result = processor.processBatchRecords(records);

      expect(result.totalRecords).toBe(2);
      expect(result.validRecords).toHaveLength(1);
      expect(result.notifiableRecords).toHaveLength(1);
      expect(result.notifiableRecords[0].article!.title).toBe('Apple releases iOS update');
    });
  });
});


