import { NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

function formatQuery(query: string): string {
    return query
      .toLowerCase()
      .split(" ")
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("_");
  }
export const wikipedia = tool(
  async(query) => {
    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid query" },
        { status: 400 }
      );
    }
  
    const formattedQuery = formatQuery(query);
    console.log("Formatted Query:", formattedQuery);
    
  
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(
      formattedQuery
    )}`;
  
    await page.goto(url, { waitUntil: "domcontentloaded" });
  
    const content = await page.$$eval(
      "div.mw-parser-output > p",
      (paragraphs) => {
        for (const p of paragraphs) {
          // Remove all <sup> tags (like [1], [2], etc.)
          p.querySelectorAll("sup, style, script, span").forEach((sup) =>
            sup.remove()
          );
  
          const text = p.textContent?.trim();
          if (text && text.length > 50) {
            // Remove empty () and []
            const cleaned = text.replace(/\(\s*\)/g, "").replace(/\[\s*\]/g, "");
            return cleaned;
          }
        }
        return "";
      }
    );
    console.log(`content: ${content}`);
    await browser.close();
  
    return `${content}`;
  },
  {
    name: "wikipedia",
    description: "Used this tool only to search a topic on Wikipedia",
    schema: z.string().describe("The topic to search for on Wikipedia")
  }
)
