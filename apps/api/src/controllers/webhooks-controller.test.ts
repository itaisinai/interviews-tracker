import assert from "node:assert/strict";
import test from "node:test";
import { queueTelegramUpdateProcessing } from "./webhooks-controller.js";
import { telegramUpdateSchema } from "../services/telegram/telegram-service.js";

test("queueTelegramUpdateProcessing acknowledges before background processing starts", async () => {
  const update = telegramUpdateSchema.parse({
    update_id: 42,
    message: {
      message_id: 7,
      chat: { id: 123 },
      text: "Senior backend role at ExampleCo with TypeScript and Node"
    }
  });
  let processingStarted = false;
  let finishProcessing: (() => void) | undefined;

  const response = queueTelegramUpdateProcessing(update, async () => {
    processingStarted = true;
    await new Promise<void>((resolve) => {
      finishProcessing = resolve;
    });
  });

  assert.deepEqual(response, { accepted: true });
  assert.equal(processingStarted, false);

  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(processingStarted, true);

  finishProcessing?.();
});
