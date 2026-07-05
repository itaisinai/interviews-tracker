/**
 * Tests for Telegram response formatting and markdown escaping
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatOpportunityCreatedMessage } from './telegram-response-formatter.js';

describe('Telegram Response Formatter', () => {
  describe('formatOpportunityCreatedMessage', () => {
    it('should escape markdown special characters in company name', () => {
      const message = formatOpportunityCreatedMessage(
        {
          id: 'test-id',
          slug: 'test-slug',
          companyName: 'ACME_Inc',
          roleTitle: 'Software Engineer'
        },
        'https://example.com'
      );

      // Underscore should be escaped
      assert.match(message, /ACME\\_Inc/);
    });

    it('should escape markdown special characters in role title', () => {
      const message = formatOpportunityCreatedMessage(
        {
          id: 'test-id',
          slug: 'test-slug',
          companyName: 'Google',
          roleTitle: 'Software [Platform] Engineer'
        },
        'https://example.com'
      );

      // Brackets should be escaped
      assert.match(message, /Software \\\[Platform\\\] Engineer/);
    });

    it('should escape asterisks in company name', () => {
      const message = formatOpportunityCreatedMessage(
        {
          id: 'test-id',
          slug: 'test-slug',
          companyName: '**StarTech**',
          roleTitle: 'Developer'
        },
        'https://example.com'
      );

      // Asterisks should be escaped
      assert.match(message, /\\\*\\\*StarTech\\\*\\\*/);
    });

    it('should escape multiple special characters', () => {
      const message = formatOpportunityCreatedMessage(
        {
          id: 'test-id',
          slug: 'test-slug',
          companyName: 'Tech_Corp [2024]',
          roleTitle: 'Senior Engineer (Backend)'
        },
        'https://example.com'
      );

      // All special chars should be escaped
      assert.match(message, /Tech\\_Corp \\\[2024\\\]/);
      assert.match(message, /Senior Engineer \\\(Backend\\\)/);
    });

    it('should not break normal text without special characters', () => {
      const message = formatOpportunityCreatedMessage(
        {
          id: 'test-id',
          slug: 'test-slug',
          companyName: 'Google',
          roleTitle: 'Software Engineer'
        },
        'https://example.com'
      );

      // Should contain unescaped normal text
      assert.match(message, /Google/);
      assert.match(message, /Software Engineer/);
      // Should still have markdown formatting for the emoji/title
      assert.match(message, /✅ \*Opportunity Created!\*/);
    });

    it('should include view link with slug', () => {
      const message = formatOpportunityCreatedMessage(
        {
          id: 'test-id',
          slug: 'google-senior-engineer',
          companyName: 'Google',
          roleTitle: 'Senior Engineer'
        },
        'https://example.com'
      );

      assert.match(message, /\[View in App\]\(https:\/\/example\.com\/opportunities\/google-senior-engineer\)/);
    });

    it('should handle missing optional fields', () => {
      const message = formatOpportunityCreatedMessage(
        {
          id: 'test-id'
        },
        'https://example.com'
      );

      // Should have default values
      assert.match(message, /Unknown Company/);
      assert.match(message, /Position/);
    });

    it('should escape special characters in default values', () => {
      const message = formatOpportunityCreatedMessage(
        {
          id: 'test-id',
          companyName: undefined,
          roleTitle: undefined
        },
        'https://example.com'
      );

      // Defaults should still work (no special chars, but test the flow)
      assert.match(message, /Unknown Company/);
      assert.match(message, /Position/);
    });
  });
});
