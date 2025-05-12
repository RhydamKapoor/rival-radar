import puppeteer, {
  Browser,
  Page,
  LaunchOptions
} from 'puppeteer'; // Make sure this is v24+

import { tool } from '@langchain/core/tools';
import { z } from 'zod';

export const linkedIn = tool(
  async () => {
    // Replace this with the actual path to your Chrome installation
    const launchOpts: LaunchOptions = {
      headless: false,
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // Windows example
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    };

    const browser: Browser = await puppeteer.launch(launchOpts);

    try {
      const page: Page = await browser.newPage();
      const timeout = 120000;
      page.setDefaultTimeout(timeout);

      await page.setViewport({ width: 895, height: 695 });

      // Go to LinkedIn homepage
      await page.goto('https://www.linkedin.com/home', {
        waitUntil: 'networkidle2',
        timeout
      });

      // Wait for Google Sign-In iframe
      await page.waitForSelector('iframe');
      const iframeElement = await page.$('iframe');
      if (!iframeElement) throw new Error('No iframe found');

      const frame = await iframeElement.contentFrame();
      if (!frame) throw new Error('Could not access iframe content');

      // Wait for and click Google login button
      await frame.waitForSelector("div[role='button']");
      const newPagePromise = new Promise<Page>(resolve =>
        browser.once('targetcreated', async target => {
          const popup = await target.page();
          if (popup) {
            await popup.bringToFront();
            resolve(popup);
          }
        })
      );

      await frame.click("div[role='button']");

      // Handle Google popup
      const popup = await newPagePromise;

      await popup.waitForSelector('input[type="email"]', { visible: true });
      await popup.type('input[type="email"]', process.env.LINKEDIN_EMAIL || '');
      await popup.click('#identifierNext');

      await popup.waitForSelector('input[type="password"]', { visible: true });
      await popup.type('input[type="password"]', process.env.LINKEDIN_PASSWORD || '');
      await popup.click('#passwordNext');

      // Wait for redirect after login
      await popup.waitForNavigation({ waitUntil: 'networkidle2', timeout });

      // At this point, you’re logged in and can scrape or extract content
    } catch (error: unknown) {
      console.error('Login error:', error);
    } finally {
      // await browser.close();
    }
  },
  {
    name: 'linkedIn',
    description: 'Tool to extract blog posts from LinkedIn via Google SSO',
    schema: z.string().describe('Get the blogs from LinkedIn')
  }
);
