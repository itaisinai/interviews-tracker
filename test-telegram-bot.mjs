import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("Navigating to app...");
  await page.goto("http://localhost:5173");

  // Wait for auth or skip if dev mode
  await page.waitForTimeout(2000);

  // Check for dev mode bypass button
  const bypassButton = await page.locator('button:has-text("Continue as dev@local.test")').first();
  if (await bypassButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log("Dev mode detected, clicking bypass...");
    await bypassButton.click();
    await page.waitForTimeout(2000);
  }

  console.log("Taking initial screenshot...");
  await page.screenshot({ path: "/tmp/telegram-bot-initial.png", fullPage: true });

  // Look for the floating chat button
  console.log("Looking for chat button...");
  const chatButton = await page.locator('button[aria-label="Open Telegram test bot"]').first();

  if (await chatButton.isVisible({ timeout: 5000 })) {
    console.log("Found chat button, clicking it...");
    await chatButton.click();
    await page.waitForTimeout(1000);

    console.log("Taking screenshot with chat open...");
    await page.screenshot({ path: "/tmp/telegram-bot-open.png", fullPage: true });

    // Type a test query
    console.log("Testing with query message...");
    const input = await page.locator("textarea").first();
    await input.fill("What are my next interactions?");
    await page.waitForTimeout(500);

    console.log("Sending message...");
    await page.locator('button:has-text("send")').click();

    // Wait for response
    await page.waitForTimeout(5000);

    console.log("Taking screenshot after query...");
    await page.screenshot({ path: "/tmp/telegram-bot-after-query.png", fullPage: true });

    // Try creating an opportunity
    console.log("Testing with opportunity creation...");
    await input.fill("Senior Software Engineer at Google, $180k-$220k, Applied through LinkedIn");
    await page.waitForTimeout(500);
    await page.locator('button:has-text("send")').click();

    await page.waitForTimeout(5000);

    console.log("Taking final screenshot...");
    await page.screenshot({ path: "/tmp/telegram-bot-after-opportunity.png", fullPage: true });

    console.log("Success! Screenshots saved to /tmp/telegram-bot-*.png");
  } else {
    console.log("Chat button not found!");
    await page.screenshot({ path: "/tmp/telegram-bot-error.png", fullPage: true });
  }

  await page.waitForTimeout(2000);
  await browser.close();
})();
