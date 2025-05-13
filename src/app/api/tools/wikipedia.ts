import { NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { gettingChunks } from "../ragprocess/gettingChunks";
import { getEmbeddings } from "../ragprocess/getEmbeddings";

function formatQuery(query: string): string {
  // Remove phrases like "who is", "what is", "father of", etc.
  const cleanQuery = query
    .toLowerCase()
    .replace(/^(who|what|when|where|why|how)\s+(is|are|was|were)\s+/i, '')
    .replace(/^(tell me about|show me|find|search for|lookup)\s+/i, '')
    .replace(/father of /i, '')
    .replace(/mother of /i, '')
    .replace(/inventor of /i, '')
    .replace(/history of /i, '');
    
  // For Wikipedia formatting, capitalize first letter of each word
  return cleanQuery
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("_");
}

export const wikipedia = tool(
  async (query) => {
    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid query" },
        { status: 400 }
      );
    }

    const formattedQuery = formatQuery(query);
    console.log("Original Query:", query);
    console.log("Formatted Query:", formattedQuery);

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(
      formattedQuery
    )}`;

    await page.goto(url, { timeout: 5000 });

    const content = await page.$$eval(
      "div.mw-content-ltr.mw-parser-output > p",
      (paragraphs) => {
        const results: string[] = [];

        for (const p of paragraphs) {
          p.querySelectorAll("sup, style, script, span").forEach((el) =>
            el.remove()
          );

          const text = p.textContent?.trim();
          if (text && text.length > 50) {
            const cleaned = text
              .replace(/\(\s*\)/g, "")
              .replace(/\[\s*\]/g, "");
            results.push(cleaned);
          }
        }

        return results;
      }
    );
    // console.log(`content: ${content.join("\n\n")}`);
    await browser.close();

    const chunks = await gettingChunks(content.join("\n\n"));
    console.log("Chunks created:", chunks.length);
    
    // Only proceed with embeddings if there are chunks
    if (chunks.length === 0) {
      console.log("No chunks created, returning fallback response");
      return "No information found on Wikipedia for this query. Please try a different search term.";
    }
    
    const queryResponse = await getEmbeddings(
      chunks,
      query,
      content.join("\n\n"),
      formattedQuery
    );

    // Check if we have meaningful responses from the embeddings
    const responses = queryResponse.matches.map(
      (match) => match?.metadata?.contextText
    ).filter(Boolean); // Remove undefined/null entries
    
    console.log("Query response entries:", responses.length);
    
    if (responses.length === 0) {
      return "No relevant information found for this query. Please try a different search term.";
    }

    return `${responses.join("\n\n")}`;
  },
  {
    name: "wikipedia",
    description: "Used this tool only to search a topic on Wikipedia",
    schema: z.string().describe("The topic to search for on Wikipedia"),
  }
);
