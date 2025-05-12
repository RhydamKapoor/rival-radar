import { tool } from "@langchain/core/tools";
import { z } from "zod";
import puppeteer, { Page } from "puppeteer";

export const runtime = "nodejs";

// Define Tweet structure
type Tweet = {
  content: string;
  images: string[];
  name: string;
  time: string;
};
type TwitterResult = {
  data: Tweet[];
  title: string;
};
export const twitter = tool(
  async (username: string): Promise<TwitterResult> => {
    const formattedUsername = username.trim().replace("@", "").replace(/\s+/g, "").toLowerCase();
    const browser = await puppeteer.launch({
      headless: true,
    });

    try {
      const page: Page = await browser.newPage();

      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36"
      );

      await page.goto(`https://twitter.com/${formattedUsername}`, {
        waitUntil: "networkidle2",
      });

        await page.waitForSelector("article", {timeout: 30000});

      const title  = await page.title();

      const tweets: Tweet[] = await page.$$eval("article", (articles) => {
        return Array.from(articles).map((article) => {
          const textNode = article.querySelector(
            "div.css-146c3p1.r-bcqeeo.r-1ttztb7.r-qvutc0.r-37j5jr.r-a023e6.r-rjixqe.r-16dba41.r-bnwqim"
          );
          const timeNode = article.querySelector(
            "a.css-146c3p1.r-bcqeeo.r-1ttztb7.r-qvutc0.r-37j5jr.r-a023e6.r-rjixqe.r-16dba41.r-xoduu5.r-1q142lx.r-1w6e6rj.r-9aw3ui.r-3s2u2q.r-1loqt21"
          );
          const titleNameNode = article.querySelector(
            "span.css-1jxf684.r-dnmrzs.r-1udh08x.r-1udbk01.r-3s2u2q.r-bcqeeo.r-1ttztb7.r-qvutc0.r-poiln3 > span.css-1jxf684.r-bcqeeo.r-1ttztb7.r-qvutc0.r-poiln3"
          );
          const name = titleNameNode?.textContent?.trim() ?? "";
          const time = timeNode?.textContent?.trim() ?? "";

          const textContent = (textNode as HTMLElement)?.innerText.replace(/\n/g, " ").trim() ?? "";

          const imageNodes = article.querySelectorAll("img");
          const images: string[] = Array.from(imageNodes)
            .map((img) => img.getAttribute("src") ?? "")
            .filter(
              (src) =>
                src !== "" &&
                !src.includes("profile_images") && // exclude profile pics
                !src.includes("emoji") // optional: filter out emoji images
            );

          return {
            content: textContent,
            images,
            name,
            time,
          };
        });
      });

      console.log("Scraped tweets:", tweets);
      return {data: tweets, title};
    } catch (error) {
        return {data: [], title: "No content found"};
    } finally {
      await browser.close();
    }
  },
  {
    name: "twitter",
    description: "Used this tool only to search a username on twitter",
    schema: z.string().describe("Username to search on twitter"),
  }
);
