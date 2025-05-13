import { NextRequest, NextResponse } from "next/server";
import { AgentManager, AgentWorkflowResult } from "./agentManager";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // Get the content from the request body
    const body = await req.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    // Initialize the agent manager
    const agentManager = new AgentManager();
    
    // Process the content through the agent workflow
    const result: AgentWorkflowResult = await agentManager.processContent(content);
    
    // Return the results
    return NextResponse.json({
      success: true,
      result
    });
  } catch (error) {
    console.error("Agent workflow error:", error);
    return NextResponse.json(
      { 
        error: "Failed to process content through agent workflow", 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 