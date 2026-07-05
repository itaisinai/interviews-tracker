/**
 * Tests for Telegram user authorization
 */

import assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach } from 'node:test';
import { isAuthorizedTelegramUser } from './telegram-auth.js';

describe('isAuthorizedTelegramUser', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
    delete process.env.TELEGRAM_ALLOWED_USER_IDS;
    delete process.env.TELEGRAM_ALLOWED_CHAT_IDS;
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('when no authorization configured', () => {
    it('should deny access (fail-safe)', () => {
      const result = isAuthorizedTelegramUser(696472003, '696472003');
      assert.equal(result, false);
    });
  });

  describe('when TELEGRAM_ALLOWED_USER_IDS is configured', () => {
    it('should allow authorized user ID', () => {
      process.env.TELEGRAM_ALLOWED_USER_IDS = '696472003';

      const result = isAuthorizedTelegramUser(696472003, '696472003');
      assert.equal(result, true);
    });

    it('should allow multiple authorized user IDs', () => {
      process.env.TELEGRAM_ALLOWED_USER_IDS = '696472003,123456789,987654321';

      assert.equal(isAuthorizedTelegramUser(696472003, '696472003'), true);
      assert.equal(isAuthorizedTelegramUser(123456789, '123456789'), true);
      assert.equal(isAuthorizedTelegramUser(987654321, '987654321'), true);
    });

    it('should handle IDs with whitespace', () => {
      process.env.TELEGRAM_ALLOWED_USER_IDS = '696472003, 123456789 , 987654321';

      assert.equal(isAuthorizedTelegramUser(696472003, '696472003'), true);
      assert.equal(isAuthorizedTelegramUser(123456789, '123456789'), true);
      assert.equal(isAuthorizedTelegramUser(987654321, '987654321'), true);
    });

    it('should deny unauthorized user ID', () => {
      process.env.TELEGRAM_ALLOWED_USER_IDS = '696472003';

      const result = isAuthorizedTelegramUser(999999999, '999999999');
      assert.equal(result, false);
    });

    it('should deny null user ID', () => {
      process.env.TELEGRAM_ALLOWED_USER_IDS = '696472003';

      const result = isAuthorizedTelegramUser(null, '696472003');
      assert.equal(result, false);
    });
  });

  describe('when TELEGRAM_ALLOWED_CHAT_IDS is configured', () => {
    it('should allow authorized chat ID', () => {
      process.env.TELEGRAM_ALLOWED_CHAT_IDS = '696472003';

      const result = isAuthorizedTelegramUser(null, '696472003');
      assert.equal(result, true);
    });

    it('should allow multiple authorized chat IDs', () => {
      process.env.TELEGRAM_ALLOWED_CHAT_IDS = '696472003,123456789';

      assert.equal(isAuthorizedTelegramUser(null, '696472003'), true);
      assert.equal(isAuthorizedTelegramUser(null, '123456789'), true);
    });

    it('should deny unauthorized chat ID', () => {
      process.env.TELEGRAM_ALLOWED_CHAT_IDS = '696472003';

      const result = isAuthorizedTelegramUser(null, '999999999');
      assert.equal(result, false);
    });
  });

  describe('when both user IDs and chat IDs are configured', () => {
    it('should allow if user ID matches', () => {
      process.env.TELEGRAM_ALLOWED_USER_IDS = '696472003';
      process.env.TELEGRAM_ALLOWED_CHAT_IDS = '111111111';

      const result = isAuthorizedTelegramUser(696472003, '999999999');
      assert.equal(result, true);
    });

    it('should allow if chat ID matches', () => {
      process.env.TELEGRAM_ALLOWED_USER_IDS = '111111111';
      process.env.TELEGRAM_ALLOWED_CHAT_IDS = '696472003';

      const result = isAuthorizedTelegramUser(999999999, '696472003');
      assert.equal(result, true);
    });

    it('should deny if neither matches', () => {
      process.env.TELEGRAM_ALLOWED_USER_IDS = '111111111';
      process.env.TELEGRAM_ALLOWED_CHAT_IDS = '222222222';

      const result = isAuthorizedTelegramUser(999999999, '999999999');
      assert.equal(result, false);
    });
  });

  describe('edge cases', () => {
    it('should handle numeric chat ID', () => {
      process.env.TELEGRAM_ALLOWED_CHAT_IDS = '696472003';

      const result = isAuthorizedTelegramUser(null, 696472003);
      assert.equal(result, true);
    });

    it('should handle empty strings in comma-separated list', () => {
      process.env.TELEGRAM_ALLOWED_USER_IDS = '696472003,,123456789';

      assert.equal(isAuthorizedTelegramUser(696472003, '696472003'), true);
      assert.equal(isAuthorizedTelegramUser(123456789, '123456789'), true);
    });

    it('should handle trailing comma', () => {
      process.env.TELEGRAM_ALLOWED_USER_IDS = '696472003,';

      const result = isAuthorizedTelegramUser(696472003, '696472003');
      assert.equal(result, true);
    });
  });
});
