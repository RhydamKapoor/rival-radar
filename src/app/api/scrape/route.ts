import { ChatGroq } from "@langchain/groq";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { AIMessage, ToolMessage } from "@langchain/core/messages";
import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { NextRequest, NextResponse } from "next/server";
import { wikipedia } from "../tools/wikipedia";
import { twitter } from "../tools/twitter";
import { linkedIn } from "../tools/linkedIn";

const model = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "meta-llama/llama-4-scout-17b-16e-instruct",
  temperature: 0,
});

async function createGraphWithTools(tools: any) {
  const llmWithTools = model.bindTools(tools);

  async function llmCall(state: any) {
    const result = await llmWithTools.invoke([
      {
        role: "system",
        content: `You are a tool router assistant.
        - DO NOT rephrase, modify, reformat, or disambiguate the user query. Keep it EXACTLY as is.
        - Your job is to choose the correct tool and extract the raw topic from the query WITHOUT changing it.
        - Only use ONE tool per query and send the response as the AI Message.
        - Do NOT use parentheses, underscores, or try to guess Wikipedia formats.
        - Do NOT explain, answer, or add context to the question.
        - If no tool applies, respond with "No tool found!" and stop.
        - Once a tool is called, do not call it again or modify its input.`,
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
      toolUsed: state.toolUsed || false, // <-- carry forward
    };
  }

  const rawToolNode = new ToolNode(tools);
  const toolNode = async (state: any) => {
    const toolOutput = await rawToolNode.invoke(state);
    return {
      ...toolOutput,
      toolUsed: true, // <- now triggers end condition
    };
  };

  const shouldContinue = (state: any) => {
    if (state.toolUsed) {
      return "__end__"; // Stop if already used a tool
    }
  
    const lastMessage = state.messages.at(-1);
    return lastMessage?.tool_calls?.length ? "Action" : "__end__";
  };

  return new StateGraph(MessagesAnnotation)
    .addNode("llmCall", llmCall)
    .addNode("tools", toolNode)
    .addEdge("__start__", "llmCall")
    .addConditionalEdges("llmCall", shouldContinue, {
      Action: "tools",
      __end__: "__end__",
    })
    .addEdge("tools", "llmCall")
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
    const graph = await createGraphWithTools([wikipedia, twitter]);
    const result = await graph.invoke({
      messages: [{ role: "user", content: query }],
    });
    console.log(result);
    const finalAnswer = result.messages.find(
      (msg) => msg instanceof ToolMessage && msg?.content?.toString()?.trim()
    );
    console.log(finalAnswer?.content);
    // const result = await linkedIn.invoke(query);
    return NextResponse.json({
      response: finalAnswer?.content || "No tool result",
    });
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
