import assert from "node:assert/strict";
import test from "node:test";
import { extractTelegramTextMessage, telegramUpdateSchema } from "./telegram-service.js";

test("extractTelegramTextMessage returns trimmed Telegram message text", () => {
  const update = telegramUpdateSchema.parse({
    update_id: 1,
    message: {
      message_id: 10,
      chat: { id: 123 },
      from: { id: 456, username: "jobhunter" },
      text: "  Senior backend role at ExampleCo  "
    }
  });

  assert.deepEqual(extractTelegramTextMessage(update), {
    chatId: 123,
    messageId: 10,
    text: "Senior backend role at ExampleCo",
    fromUserId: 456,
    username: "jobhunter"
  });
});

test("extractTelegramTextMessage ignores non-text Telegram updates", () => {
  const update = telegramUpdateSchema.parse({ update_id: 2, message: { message_id: 11, chat: { id: 123 } } });

  assert.equal(extractTelegramTextMessage(update), null);
});
