import { test, expect } from '@playwright/test';

/**
 * AT (Acentem Takipte) Design System Audit Test
 * Bu test, tasarım standartlarının (Color, Radius, Typography) 
 * bileşenler seviyesinde doğru uygulandığını doğrular.
 */

test.describe('AT Design System Consistency', () => {
  
  test.beforeEach(async ({ page }) => {
    // Uygulamanın ana sayfasını veya login sayfasını aç
    await page.goto('/');
  });

  test('Primary Buttons should follow the brand guidelines', async ({ page }) => {
    const primaryButton = page.locator('button:has-text("Kaydet"), button:has-text("Save")').first();
    
    if (await primaryButton.isVisible()) {
      // Renk kontrolü (brand-600: rgb(27, 93, 184))
      const backgroundColor = await primaryButton.evaluate((el) => window.getComputedStyle(el).backgroundColor);
      expect(backgroundColor).toBe('rgb(27, 93, 184)');

      // Radius kontrolü (rounded-lg: 8px)
      const borderRadius = await primaryButton.evaluate((el) => window.getComputedStyle(el).borderRadius);
      expect(borderRadius).toBe('8px');
    }
  });

  test('Metric Cards should have unified corner radius', async ({ page }) => {
    const metricCard = page.locator('.at-metric-card').first();
    
    if (await metricCard.isVisible()) {
      // Radius kontrolü (rounded-xl: 12px)
      const borderRadius = await metricCard.evaluate((el) => window.getComputedStyle(el).borderRadius);
      expect(borderRadius).toBe('12px');
      
      // Shadow kontrolü
      const boxShadow = await metricCard.evaluate((el) => window.getComputedStyle(el).boxShadow);
      expect(boxShadow).not.toBe('none');
    }
  });

  test('Typography should use DM Sans as primary font', async ({ page }) => {
    const bodyFont = await page.evaluate(() => window.getComputedStyle(document.body).fontFamily);
    expect(bodyFont).toContain('DM Sans');
  });

});
