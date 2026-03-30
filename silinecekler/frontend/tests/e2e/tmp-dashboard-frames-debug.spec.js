import { test } from "@playwright/test";
import { ensureAuthenticated } from "./helpers/auth.js";

test("debug dashboard frames", async ({ page }) => {
  await ensureAuthenticated(page);
  await page.goto("/at/");
  console.log('FRAMES', page.frames().map(f => ({ url: f.url(), name: f.name() })));
  for (const frame of page.frames()) {
    const body = await frame.locator('body').innerText().catch(() => 'ERR');
    console.log('FRAME_BODY', frame.url(), JSON.stringify(body.slice(0, 1000)));
  }
});
