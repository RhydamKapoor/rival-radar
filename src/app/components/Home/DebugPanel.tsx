"use client";
import { useState } from "react";

// Define the AgentWorkflowResult interface locally to avoid import issues
interface AgentWorkflowResult {
  monitorResult: string;
  summarizerResult: string;
  analystResult: string;
  factCheckerResult: string;
  finalSummary: string;
}

interface DebugPanelProps {
  originalResponse: string;
  agentWorkflow: AgentWorkflowResult;
}

export default function DebugPanel({ originalResponse, agentWorkflow }: DebugPanelProps) {
  const [showRawData, setShowRawData] = useState(false);
  
  // Create a terminal-like console output string
  const consoleOutput = `
> Processing query through agent workflow...
> Starting agent workflow...
> Running Monitor Agent...
${"-".repeat(50)}
${agentWorkflow.monitorResult.substring(0, 200)}${agentWorkflow.monitorResult.length > 200 ? '...' : ''}
${"-".repeat(50)}

> Running Summarizer Agent...
${"-".repeat(50)}
${agentWorkflow.summarizerResult.substring(0, 200)}${agentWorkflow.summarizerResult.length > 200 ? '...' : ''}
${"-".repeat(50)}

> Running Analyst Agent...
${"-".repeat(50)}
${agentWorkflow.analystResult.substring(0, 200)}${agentWorkflow.analystResult.length > 200 ? '...' : ''}
${"-".repeat(50)}

> Running Fact-Checker Agent...
${"-".repeat(50)}
${agentWorkflow.factCheckerResult.substring(0, 200)}${agentWorkflow.factCheckerResult.length > 200 ? '...' : ''}
${"-".repeat(50)}

> Generating final summary...
${"-".repeat(50)}
${agentWorkflow.finalSummary.substring(0, 200)}${agentWorkflow.finalSummary.length > 200 ? '...' : ''}
${"-".repeat(50)}

> Agent workflow complete!
`;

  return (
    <div className="mb-6 mt-4">
      <div className="flex flex-col gap-4">
        <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
          <pre>{consoleOutput}</pre>
        </div>
        
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold">Debug Information</h3>
          <button 
            className="btn btn-sm btn-outline" 
            onClick={() => setShowRawData(!showRawData)}
          >
            {showRawData ? "Hide Raw Data" : "Show Full Raw Data"}
          </button>
        </div>

        {showRawData && (
          <div className="flex flex-col gap-4">
            <div className="collapse collapse-plus bg-base-300">
              <input type="checkbox" /> 
              <div className="collapse-title font-medium">
                Original Response (Raw)
              </div>
              <div className="collapse-content"> 
                <pre className="bg-base-100 p-4 rounded-lg overflow-x-auto text-xs">
                  {originalResponse}
                </pre>
              </div>
            </div>
            
            <div className="collapse collapse-plus bg-base-300">
              <input type="checkbox" /> 
              <div className="collapse-title font-medium">
                Monitor Agent Output (Raw)
              </div>
              <div className="collapse-content"> 
                <pre className="bg-base-100 p-4 rounded-lg overflow-x-auto text-xs">
                  {agentWorkflow.monitorResult}
                </pre>
              </div>
            </div>
            
            <div className="collapse collapse-plus bg-base-300">
              <input type="checkbox" /> 
              <div className="collapse-title font-medium">
                Summarizer Agent Output (Raw)
              </div>
              <div className="collapse-content"> 
                <pre className="bg-base-100 p-4 rounded-lg overflow-x-auto text-xs">
                  {agentWorkflow.summarizerResult}
                </pre>
              </div>
            </div>
            
            <div className="collapse collapse-plus bg-base-300">
              <input type="checkbox" /> 
              <div className="collapse-title font-medium">
                Analyst Agent Output (Raw)
              </div>
              <div className="collapse-content"> 
                <pre className="bg-base-100 p-4 rounded-lg overflow-x-auto text-xs">
                  {agentWorkflow.analystResult}
                </pre>
              </div>
            </div>
            
            <div className="collapse collapse-plus bg-base-300">
              <input type="checkbox" /> 
              <div className="collapse-title font-medium">
                Fact-Checker Agent Output (Raw)
              </div>
              <div className="collapse-content"> 
                <pre className="bg-base-100 p-4 rounded-lg overflow-x-auto text-xs">
                  {agentWorkflow.factCheckerResult}
                </pre>
              </div>
            </div>
            
            <div className="collapse collapse-plus bg-base-300">
              <input type="checkbox" /> 
              <div className="collapse-title font-medium">
                Final Summary (Raw)
              </div>
              <div className="collapse-content"> 
                <pre className="bg-base-100 p-4 rounded-lg overflow-x-auto text-xs">
                  {agentWorkflow.finalSummary}
                </pre>
              </div>
            </div>
            
            <div className="collapse collapse-plus bg-base-300">
              <input type="checkbox" /> 
              <div className="collapse-title font-medium">
                Full Agent Workflow JSON
              </div>
              <div className="collapse-content"> 
                <pre className="bg-base-100 p-4 rounded-lg overflow-x-auto text-xs">
                  {JSON.stringify(agentWorkflow, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 