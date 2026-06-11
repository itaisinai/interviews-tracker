import { expect, test } from "@playwright/test";

const stories = [
  "ui-button--default",
  "ui-button--secondary",
  "ui-button--ghost",
  "ui-button--danger",
  "ui-button--loading",
  "ui-button--with-icon",
  "ui-iconbutton--default",
  "ui-badge--default",
  "ui-badge--active",
  "ui-badge--warning",
  "ui-badge--danger",
  "ui-card--default",
  "ui-input--default",
  "ui-input--disabled",
  "ui-textarea--default",
  "ui-select--default",
  "ui-formfield--default",
  "ui-formfield--error",
  "ui-spinner--default",
  "ui-loadingstate--inline",
  "ui-loadingstate--page-loading",
  "ui-loadingstate--page-error",
  "ui-loadingstate--process",
  "ui-datatable--default",
  "ui-drawer--default",
];

for (const storyId of stories) {
  test(storyId, async ({ page }) => {
    await page.goto(`/iframe.html?id=${storyId}`);
    await expect(page.locator("#storybook-root")).toHaveScreenshot(
      `${storyId}.png`,
      {
        animations: "disabled",
        caret: "hide",
      },
    );
  });
}
