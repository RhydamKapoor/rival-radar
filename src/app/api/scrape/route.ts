import { ChatGroq } from "@langchain/groq";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { AIMessage, ToolMessage } from "@langchain/core/messages";
import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { NextRequest, NextResponse } from "next/server";
import { wikipedia } from "../tools/wikipedia";
import { twitter } from "../tools/twitter";
import { linkedIn } from "../tools/linkedIn";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { MessagesPlaceholder } from "@langchain/core/prompts";
import { OllamaEmbeddings } from "@langchain/ollama";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";
import { AgentManager } from "../agents/agentManager";

const pinecone = new PineconeClient();

const model = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "meta-llama/llama-4-scout-17b-16e-instruct",
  temperature: 0,
});
const embeddings = new OllamaEmbeddings({
  model: "nomic-embed-text", // Default value
  baseUrl: "http://localhost:11434", // Default value
});
async function createGraphWithTools(tools: any) {
  const llmWithTools = model.bindTools(tools);

  async function llmCall(state: any) {
    const result = await llmWithTools.invoke([
      {
        role: "system",
        content: `You are a tool router assistant who routes queries to the right tool.
        
        IMPORTANT RULES FOR KEYWORD EXTRACTION:
        - Extract ONLY the main subject or entity from queries
        - For general topics, extract the main concept:
          - "What is javascript" → extract "javascript" 
          - "Who is the father of javascript" → extract "javascript"
          - "Tell me about Albert Einstein" → extract "Albert Einstein"
        
        - For Twitter queries, extract ONLY the username:
          - "Show me tweets from elonmusk" → extract "elonmusk"
          - "What did narendra modi tweet yesterday" → extract "narendra modi"
          - "Last tweet by billgates" → extract "billgates"
          - "Recent posts from @narendramodi" → extract "narendramodi"
        
        TOOL SELECTION GUIDELINES:
        - For general topics, concepts, people, events, or things, use the wikipedia tool
        - For Twitter usernames or Twitter-related queries, use the twitter tool
        - DO NOT modify, change case, or add underscores to the extracted keyword
        - DO NOT include phrases like "what is", "who is", "last tweet", etc. in your extracted keywords
        - Only use ONE tool per query
        - If no tool applies, respond with "No tool found!" and stop
        
        EXAMPLE EXTRACTIONS:
        - "What is Python?" → wikipedia with "Python" 
        - "Who created JavaScript?" → wikipedia with "JavaScript"
        - "Show tweets from BillGates" → twitter with "BillGates"
        - "What was the last tweet of Elon Musk?" → twitter with "Elon Musk"
        - "Tell me about the history of the internet" → wikipedia with "internet"`,
      },
      ...state.messages,
    ]);

    const tokenUsage = result.response_metadata?.tokenUsage || {
      completionTokens: 0,
      promptTokens: 0,
      totalTokens: 0,
    };

    return {
      messages: [...state.messages, result],
      tokenUsage,
      toolUsed: state.toolUsed || false, 
    };
  }

  const rawToolNode = new ToolNode(tools);
  const toolNode = async (state: any) => {
    // Check if a tool has already been used
    if (state.toolUsed) {
      console.log("Tool has already been used, stopping the execution");
      return {
        ...state,
        toolUsed: true,
      };
    }
    
    const toolOutput = await rawToolNode.invoke(state);
    
    // Mark that a tool has been used
    return {
      ...toolOutput,
      toolUsed: true,
    };
  };

  const shouldContinue = (state: any) => {
    // Stop if a tool has already been used
    if (state.toolUsed) {
      console.log("Tool used flag detected, ending");
      return "__end__";
    }

    const lastMessage = state.messages.at(-1);
    
    // Debug what's happening with tool calls detection
    if (lastMessage?.tool_calls?.length) {
      console.log("Tool call detected, routing to Action");
      return "Action";
    } else {
      console.log("No tool call detected, ending");
      return "__end__";
    }
  };

  return new StateGraph(MessagesAnnotation)
    .addNode("llmCall", llmCall)
    .addNode("tools", toolNode)
    .addEdge("__start__", "llmCall")
    .addConditionalEdges("llmCall", shouldContinue, {
      Action: "tools",
      __end__: "__end__",
    })
    .addEdge("tools", "__end__") // <-- Modified: Go directly to end after tools
    .compile();
}

export const POST = async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query");

  if (!query) {
    return NextResponse.json(
      { error: "Query parameter is required" },
      { status: 400 }
    );
  }

  try {
    console.log("Getting Pinecone index");
    const indexName = process.env.PINECONE_INDEX_NAME;
    if (!indexName) {
      throw new Error(
        "PINECONE_INDEX_NAME environment variable is not defined"
      );
    }
    console.log("Index name:", indexName);
    const index = pinecone.Index(indexName);

    // Define CSS terms for detection throughout the function
    const cssTerms = [
      'css', 'cascading style sheets', 'stylesheet', 'styling', 'style sheet',
      'selector', 'selectors', 'property', 'properties', 'flexbox', 'grid', 
      'animation', '@keyframes', 'media query', 'responsive', 'box model',
      'margin', 'padding', 'border', 'display', 'position', 'z-index',
      'pseudo-class', 'pseudo-element', ':hover', ':before', ':after', 
      'specificity', 'inheritance', 'cascading', 'importance'
    ];
    
    const cssPhrasePattern = new RegExp(`\\b(${cssTerms.join('|')})\\b`, 'i');

    // Extract the main keyword from the query to improve search
    let queryKeyword = query.toLowerCase();
    let toolType = "unknown";
    
    // Check if this is a Twitter-related query
    if (queryKeyword.includes("tweet") || 
        queryKeyword.includes("twitter") || 
        queryKeyword.includes("tweeted") ||
        queryKeyword.includes("post by") ||
        queryKeyword.includes("said on twitter")) {
      
      toolType = "twitter";
      
      // Enhanced detection for time-specific Twitter queries
      const timeIndicators = [
        "ago", "hour", "minute", "day", "yesterday", "week", "month", "year",
        "recent", "latest", "last", "past",
        "morning", "evening", "afternoon", "night", "today", "now"
      ];
      
      // More robust time-specific query detection pattern
      const timePatterns = [
        /\d+\s*(hour|hr|h|minute|min|m|day|d|week|w|month|year|yr|y)s?\s+ago/i,  // "2 hours ago"
        /\d+\s*h\b/i,  // "2h", "10h"
        /\b(ago|recent|latest|last|past|today|now|yesterday)\b/i,  // generic time words
        /\b(morning|evening|afternoon|night)\b/i  // time of day
      ];
      
      // Special check for yesterday queries
      const isYesterdayQuery = queryKeyword.toLowerCase().includes("yesterday") || 
                               queryKeyword.toLowerCase().includes("last day") || 
                               queryKeyword.toLowerCase().includes("previous day");

      if (isYesterdayQuery) {
        console.log("🗓️ YESTERDAY QUERY DETECTED: ", query);
        console.log("Will search for tweets from the previous day");
      }
      
      // Debug specific hour patterns
      const hourMatch = queryKeyword.match(/(\d+)\s*h(ours?)?(\s+ago)?/i);
      if (hourMatch) {
        const hours = parseInt(hourMatch[1]);
        console.log(`Detected specific hour query: ${hours}h`);
        console.log(`Full hour match: "${hourMatch[0]}"`);
      }
      
      const hasTimeIndicator = timeIndicators.some(indicator => 
        queryKeyword.toLowerCase().includes(indicator.toLowerCase())
      );
      
      const matchesTimePattern = timePatterns.some(pattern => 
        pattern.test(queryKeyword)
      );
      
      const isTimeSpecific = hasTimeIndicator || matchesTimePattern || hourMatch || isYesterdayQuery;
                          
      // For time-specific Twitter queries, pass the full query to the Twitter tool
      if (isTimeSpecific) {
        console.log("Time-specific Twitter query detected:", query);
        if (isYesterdayQuery) {
          console.log("⚠️ SPECIAL HANDLING: Yesterday query detected");
        }
        console.log("Time indicators found:", hasTimeIndicator);
        console.log("Time patterns matched:", matchesTimePattern);
        console.log("Specific hour match:", hourMatch ? hourMatch[0] : "none");
        console.log("Bypassing Pinecone and forwarding directly to Twitter tool");
        
        // Forward directly to useToolsForAnswer with the full query
        return await useToolsForAnswer(query, true);
      }
      
      // Extract Twitter username patterns
      const twitterPatterns = [
        /(?:tweet|twitter|tweeted|post).+?(?:from|by|of)\s+@?([a-zA-Z0-9_]+)/i,  // tweets from @username
        /(?:tweet|twitter|tweeted|post).+?(?:from|by|of)\s+([a-zA-Z0-9\s]+)(?:\s|$)/i,  // tweets from username
        /@?([a-zA-Z0-9_]+)(?:'s|\s+)(?:tweet|twitter|post)/i,  // @username's tweets
        /(?:what|show|get|find).+?(?:tweet|twitter).+?(?:from|by|of)\s+([a-zA-Z0-9\s]+)(?:\s|$)/i  // what is the tweet by username
      ];
      
      // First, check for specific politicians by name before applying patterns
      const politicianMap = {
        'narendra modi': 'narendramodi',
        'modi': 'narendramodi',
        'pm modi': 'narendramodi',
        'prime minister modi': 'narendramodi'
      };
      
      // Check for known politician names
      let foundPolitician = false;
      for (const [politicianName, handle] of Object.entries(politicianMap)) {
        if (queryKeyword.toLowerCase().includes(politicianName.toLowerCase())) {
          queryKeyword = handle;
          console.log(`Political figure detected: ${politicianName} → using handle: ${handle}`);
          foundPolitician = true;
          break;
        }
      }
      
      // If no politician found, use the regular pattern matching
      if (!foundPolitician) {
        for (const pattern of twitterPatterns) {
          const match = queryKeyword.match(pattern);
          if (match && match[1]) {
            queryKeyword = match[1].trim();
            console.log("Extracted Twitter username:", queryKeyword);
            break;
          }
        }
      }
    } else {
      // Handle non-Twitter queries with the existing logic
      toolType = "wikipedia";
      
      // Check if the query is specifically about CSS
      const isCssQuery = cssPhrasePattern.test(queryKeyword) || cssPhrasePattern.test(query);
      
      // Standard query keyword extraction
      queryKeyword = queryKeyword
        .replace(/^(who|what|when|where|why|how)\s+(is|are|was|were)\s+/i, '')
        .replace(/^(tell me about|show me|find|search for|lookup)\s+/i, '')
        .replace(/father of /i, '')
        .replace(/mother of /i, '')
        .replace(/inventor of /i, '')
        .replace(/history of /i, '');
        
      // For CSS queries, always include CSS as a keyword
      if (isCssQuery && !queryKeyword.toLowerCase().includes('css')) {
        queryKeyword = `css ${queryKeyword}`;
      }
    }
    
    console.log("Original query:", query);
    console.log("Detected tool type:", toolType);
    console.log("Extracted keyword for search:", queryKeyword);

    // Only run this code for non-Twitter queries
    if (toolType !== "twitter") {
      // Generate embeddings for both the full query and the extracted keyword
      const fullQueryEmbedding = await embeddings.embedQuery(query);
      const keywordEmbedding = await embeddings.embedQuery(queryKeyword);
      
      console.log("Using semantic search with both full query and extracted keyword");
      
      // First try searching with the full query
      const fullQueryResponse = await index.query({
        vector: fullQueryEmbedding,
        topK: 3,
        includeMetadata: true,
        includeValues: false,
      });
      
      // Then try with just the keyword
      const keywordResponse = await index.query({
        vector: keywordEmbedding,
        topK: 3,
        includeMetadata: true,
        includeValues: false,
      });
      
      // Combine results, removing duplicates
      const combinedMatches = [...fullQueryResponse.matches];
      
      // Add keyword matches that aren't already in the results
      const existingIds = new Set(combinedMatches.map(match => match.id));
      keywordResponse.matches.forEach(match => {
        if (!existingIds.has(match.id)) {
          combinedMatches.push(match);
          existingIds.add(match.id);
        }
      });
      
      // Sort by score
      combinedMatches.sort((a, b) => (b.score || 0) - (a.score || 0));
      
      // Take top 5
      const topMatches = combinedMatches.slice(0, 5);
      
      console.log("Combined query returned matches:", topMatches.length);
      
      // Check if this is a CSS query
      const isCssFullQuery = cssPhrasePattern.test(query);
      
      if (isCssFullQuery) {
        console.log("CSS-specific query detected, looking for CSS content");
      }
      
      // Log some information about what was found
      topMatches.forEach((match, i) => {
        console.log(`Match ${i+1} - Score: ${match.score}`);
        console.log(`Metadata title: ${match.metadata?.title || 'No title'}`);
        if (match.metadata?.contextText && typeof match.metadata.contextText === 'string') {
          const previewText = match.metadata.contextText.substring(0, 100) + '...';
          console.log(`Preview: ${previewText}`);
        } else {
          console.log('No context text available');
        }
      });
      
      // Extract response items with valid contextText
      const response = topMatches
        .filter(match => match?.metadata?.contextText) 
        .map(match => {
          if (match.metadata && match.metadata.contextText) {
            return match.metadata.contextText.toString();
          }
          return '';
        })
        .filter(Boolean);
      
      console.log("Final filtered response items:", response.length);

      // Special handling for CSS queries that didn't find matches
      if (response.length === 0 && isCssFullQuery) {
        console.log("No CSS matches found in Pinecone, using CSS-specific fallback");
        
        // Prepare a direct CSS query without going through the graph
        const cssQuestion = `Question about CSS: ${query}
        
        Please answer this CSS question comprehensively, including:
        - Clear explanations of CSS concepts
        - Examples of CSS code where appropriate
        - Best practices related to the topic
        - Common use cases or applications
        
        Keep the answer focused on CSS (Cascading Style Sheets) for web development.`;
        
        // Query directly with the LLM
        const cssResponse = await model.invoke([
          {
            role: "system", 
            content: "You are a CSS expert who provides accurate, detailed and helpful answers about CSS (Cascading Style Sheets)."
          },
          {
            role: "user",
            content: cssQuestion
          }
        ]);
        
        if (cssResponse.content) {
          console.log("Generated CSS-specific response");
          
          // Process through agent workflow
          console.log("Processing CSS response through agent workflow");
          const agentManager = new AgentManager();
          
          let responseContent = typeof cssResponse.content === 'string' 
            ? cssResponse.content 
            : JSON.stringify(cssResponse.content);
            
          // Run the agent workflow
          const agentResult = await agentManager.processContent(responseContent);
          
          // Return the complete agent workflow results
          const responseObject = {
            response: {
              originalResponse: responseContent,
              agentWorkflow: agentResult
            }
          };
          
          console.log("Sending CSS-specific response structure:", JSON.stringify(responseObject, null, 2).substring(0, 200) + "...");
          return NextResponse.json(responseObject);
        }
      }

      // If no matches found in Pinecone, use the tools
      if (response.length === 0) {
        console.log("No matches found in Pinecone, using tools");
        return await useToolsForAnswer(query, false);
      }
      
      // Generate a response using the LLM with the context from Pinecone
      const aiResponse = await model.invoke([
        {role: "system", content: "Answer the following question based on the provided context. If the context is not relevant to the question, respond with 'No relevant context found.'"},
        {role: "user", content: "Context: " + response.toString() + "\n\nQuestion: " + query}
      ]);

      // If the AI indicates no relevant context, fall back to tools
      if (aiResponse.content === "No relevant context found.") {
        console.log("AI determined context was not relevant, falling back to tools");
        return await useToolsForAnswer(query, false);
      }
      
      // Process the AI response through the multi-agent workflow
      console.log("Processing through agent workflow");
      const agentManager = new AgentManager();
      
      let responseContent = typeof aiResponse.content === 'string' 
        ? aiResponse.content 
        : JSON.stringify(aiResponse.content);
        
      // Log the content that will be processed
      console.log("Content to be processed by agents:", responseContent.substring(0, 200) + "...");
      
      // Run the agent workflow
      const agentResult = await agentManager.processContent(responseContent);
      
      // Log the agent result structure
      console.log("Agent workflow complete, returning results with structure:", 
        JSON.stringify({
          originalResponse: "...",
          agentWorkflow: Object.keys(agentResult)
        }, null, 2)
      );
      
      // Return both the original tool result and the agent workflow results
      return NextResponse.json({
        response: {
          originalResponse: responseContent,
          agentWorkflow: agentResult
        }
      });
    } else {
      // This is a Twitter query, use the Twitter tool directly
      return await useToolsForAnswer(query, true);
    }
  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json(
      {
        error: "Tool invocation failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
};

// Helper function to use tools when Pinecone has no relevant results
async function useToolsForAnswer(query: string, isTwitterQuery: boolean = false) {
  console.log("Using tools to find an answer");
  
  // If it's a Twitter query, only use the Twitter tool
  const tools = isTwitterQuery ? [twitter] : [wikipedia, twitter];
  
  const graph = await createGraphWithTools(tools);
  const result = await graph.invoke({
    messages: [{ role: "user", content: query }],
  });
  console.log("Tool execution complete");
  const finalAnswer = result.messages.find(
    (msg) => msg instanceof ToolMessage && msg?.content?.toString()?.trim()
  );
  
  const answerPreview = typeof finalAnswer?.content === 'string' 
    ? finalAnswer.content.substring(0, 100) + "..." 
    : "No text content available";
    
  console.log("Final answer from tools:", answerPreview);
  
  // For Twitter queries, bypass the agent workflow (data is already structured)
  if (isTwitterQuery) {
    return NextResponse.json({
      response: finalAnswer?.content || "No tool result",
    });
  }
  
  // For non-Twitter queries, process through agent workflow
  if (finalAnswer?.content) {
    console.log("Processing tool result through agent workflow");
    const agentManager = new AgentManager();
    
    let content = typeof finalAnswer.content === 'string' 
      ? finalAnswer.content 
      : JSON.stringify(finalAnswer.content);
      
    // Log the content that will be processed
    console.log("Content to be processed by agents:", content.substring(0, 200) + "...");
      
    // Run the agent workflow
    const agentResult = await agentManager.processContent(content);
    
    // Log the agent result structure
    console.log("Agent workflow complete, returning results with structure:", 
      JSON.stringify({
        originalResponse: "...",
        agentWorkflow: Object.keys(agentResult)
      }, null, 2)
    );
      
    // Return both the original tool result and the agent workflow results
    return NextResponse.json({
      response: {
        originalResponse: content,
        agentWorkflow: agentResult
      }
    });
  }
  
  // Fallback for no content
  return NextResponse.json({
    response: "No relevant information found",
  });
}
