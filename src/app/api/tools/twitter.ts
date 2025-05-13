import { tool } from "@langchain/core/tools";
import { z } from "zod";
import puppeteer, { Page } from "puppeteer";
import { gettingChunks } from "../ragprocess/gettingChunks";
import { getEmbeddings } from "../ragprocess/getEmbeddings";

export const runtime = "nodejs";

// Define Tweet structure
type Tweet = {
  content: string;
  images: string[];
  name: string;
  time: string;
};

// Update the TwitterResult type to accept either string or Tweet[]
type TwitterResult = {
  data: string | Tweet[];
  title: string;
};

export const twitter = tool(
  async (username: string): Promise<TwitterResult> => {
    console.log("Twitter tool called with username:", username);
    
    // Handle the username which is already extracted in the scrape route
    // Clean up any potential @ symbol or spaces that might have been included
    let formattedUsername = username
      .trim()
      .replace(/@/, "")
      .toLowerCase();
    
    // Remove spaces for the actual Twitter URL
    const urlUsername = formattedUsername.replace(/\s+/g, "");
      
    console.log("Formatted Twitter username:", formattedUsername);
    console.log("URL Twitter username:", urlUsername);
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page: Page = await browser.newPage();

      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      );

      // Set a viewport that better represents a standard browser
      await page.setViewport({ width: 1280, height: 800 });

      console.log(`Navigating to https://twitter.com/${urlUsername}`);
      await page.goto(`https://twitter.com/${urlUsername}`, {
        waitUntil: "networkidle2",
        timeout: 60000 // Increase timeout to 60 seconds
      });

      // Wait a bit longer to ensure content is loaded
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Check if we can find any articles (tweets)
      const hasArticles = await page.evaluate(() => {
        return document.querySelectorAll('article').length > 0;
      });

      if (!hasArticles) {
        console.log("No tweets found - profile might be private or not exist");
        return { 
          data: `No tweets could be retrieved for ${formattedUsername}. The profile might be private, not exist, or Twitter might be blocking the request.`,
          title: `Twitter - ${formattedUsername} (No Content)` 
        };
      }

      await page.waitForSelector("article", { timeout: 30000 });
      const title = await page.title();
      console.log("Page title:", title);

      // Take a screenshot for debugging
      await page.screenshot({ path: './twitter-debug.png' });

      const tweets: Tweet[] = await page.$$eval("article", (articles) => {
        return Array.from(articles).map((article) => {
          // Try different selectors to find tweet content based on Twitter's current structure
          let textNode = article.querySelector(
            "div.css-146c3p1.r-bcqeeo.r-1ttztb7.r-qvutc0.r-37j5jr.r-a023e6.r-rjixqe.r-16dba41.r-bnwqim"
          );
          
          // Fallback selectors if primary ones don't work
          if (!textNode) {
            textNode = article.querySelector('[data-testid="tweetText"]');
          }
          if (!textNode) {
            // Try to find any div with substantial text content
            const allDivs = article.querySelectorAll('div');
            for (const div of allDivs) {
              if (div.textContent && div.textContent.length > 20) {
                textNode = div;
                break;
              }
            }
          }

          let timeNode = article.querySelector(
            "a.css-146c3p1.r-bcqeeo.r-1ttztb7.r-qvutc0.r-37j5jr.r-a023e6.r-rjixqe.r-16dba41.r-xoduu5.r-1q142lx.r-1w6e6rj.r-9aw3ui.r-3s2u2q.r-1loqt21"
          );
          
          // Fallback for time
          if (!timeNode) {
            timeNode = article.querySelector('time');
          }
          if (!timeNode) {
            timeNode = article.querySelector('a[href*="/status/"]');
          }

          let titleNameNode = article.querySelector(
            "span.css-1jxf684.r-dnmrzs.r-1udh08x.r-1udbk01.r-3s2u2q.r-bcqeeo.r-1ttztb7.r-qvutc0.r-poiln3 > span.css-1jxf684.r-bcqeeo.r-1ttztb7.r-qvutc0.r-poiln3"
          );
          
          // Fallback for name
          if (!titleNameNode) {
            titleNameNode = article.querySelector('[data-testid="User-Name"]');
          }

          const name = titleNameNode?.textContent?.trim() ?? "";
          const time = timeNode?.textContent?.trim() ?? "";

          const textContent =
            textNode ? (textNode as HTMLElement)?.innerText?.replace(/\n/g, " ").trim() : "";

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
            content: textContent || "No text content found",
            images,
            name: name || "Unknown",
            time: time || "Unknown time",
          };
        });
      });

      console.log(`Scraped ${tweets.length} tweets for user ${formattedUsername}`);
      
      if (tweets.length === 0) {
        return { 
          data: `No tweets could be found for ${formattedUsername}. The profile might be private or Twitter might be blocking the request.`,
          title: `Twitter - ${formattedUsername} (No Content)` 
        };
      }
      
      // Filter out tweets with no content
      let validTweets = tweets.filter(tweet => tweet.content && tweet.content !== "No text content found");
      
      if (validTweets.length === 0) {
        return { 
          data: `Found ${tweets.length} tweets for ${formattedUsername}, but couldn't extract the content. Twitter may have changed their page structure.`,
          title: `Twitter - ${formattedUsername} (Content Extraction Failed)` 
        };
      }
      
      // Sort tweets by recency (newest first)
      validTweets.sort((a, b) => {
        const timeA = a.time || '';
        const timeB = b.time || '';
        return timeB.localeCompare(timeA);
      });
      
      // Return a reasonable number of tweets (up to 10)
      const tweetLimit = Math.min(validTweets.length, 10);
      validTweets = validTweets.slice(0, tweetLimit);
      
      // Return the tweets as objects so the scrape route can filter by time
      return {
        data: validTweets,
        title: `Tweets from ${formattedUsername}`
      };

    } catch (error: unknown) {
      console.error("Error scraping Twitter:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { 
        data: `Failed to retrieve tweets for ${formattedUsername}. Error: ${errorMessage}`, 
        title: "Twitter Error" 
      };
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
