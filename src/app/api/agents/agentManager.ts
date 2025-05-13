import { ChatGroq } from "@langchain/groq";
import { 
  Agent, 
  MonitorAgent, 
  SummarizerAgent, 
  AnalystAgent, 
  FactCheckerAgent 
} from "./agentTypes";

// Define the result interface for the agent workflow
export interface AgentWorkflowResult {
  monitorResult: string;
  summarizerResult: string;
  analystResult: string;
  factCheckerResult: string;
  finalSummary: string;
}

export class AgentManager {
  private monitorAgent: MonitorAgent;
  private summarizerAgent: SummarizerAgent;
  private analystAgent: AnalystAgent;
  private factCheckerAgent: FactCheckerAgent;
  private routerModel: ChatGroq;

  constructor() {
    this.monitorAgent = new MonitorAgent();
    this.summarizerAgent = new SummarizerAgent();
    this.analystAgent = new AnalystAgent();
    this.factCheckerAgent = new FactCheckerAgent();
    
    this.routerModel = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      temperature: 0,
    });
  }

  /**
   * Process content through the entire agent workflow
   */
  async processContent(content: string): Promise<AgentWorkflowResult> {
    console.log("Starting agent workflow...");
    
    // Step 1: Monitor Agent processes the raw content
    console.log("Running Monitor Agent...");
    const monitorResult = await this.monitorAgent.process(content);
    
    // Step 2: Summarizer Agent processes the monitor's output
    console.log("Running Summarizer Agent...");
    const summarizerResult = await this.summarizerAgent.process(monitorResult);
    
    // Step 3: Analyst Agent processes the summarizer's output
    console.log("Running Analyst Agent...");
    const analystResult = await this.analystAgent.process(summarizerResult);
    
    // Step 4: Fact-Checker Agent validates the analyst's output
    console.log("Running Fact-Checker Agent...");
    const factCheckerResult = await this.factCheckerAgent.process(analystResult);
    
    // Step 5: Generate final summary
    console.log("Generating final summary...");
    const finalSummary = await this.generateFinalSummary(
      monitorResult,
      summarizerResult,
      analystResult,
      factCheckerResult
    );
    
    return {
      monitorResult,
      summarizerResult,
      analystResult,
      factCheckerResult,
      finalSummary
    };
  }

  /**
   * Generate a final coherent summary based on all agent outputs
   */
  private async generateFinalSummary(
    monitorOutput: string,
    summarizerOutput: string,
    analystOutput: string,
    factCheckerOutput: string
  ): Promise<string> {
    const result = await this.routerModel.invoke([
      {
        role: "system",
        content: `You are a final integration agent that creates a coherent, comprehensive report based on the outputs of multiple specialized agents.
        
        YOUR TASK:
        1. Review the outputs from the Monitor, Summarizer, Analyst, and Fact-Checker agents
        2. Integrate these perspectives into a unified, coherent analysis
        3. Highlight key findings, verified facts, and important recommendations
        4. Present a balanced, objective assessment
        5. Format the report in a clear, professional structure
        
        FORMAT YOUR RESPONSE WITH:
        - Executive Summary: [1-2 sentence high-level overview]
        - Key Findings: [Bullet points of verified important information]
        - Analysis: [Brief synthesis of implications and context]
        - Recommendations: [Action items, if applicable]
        - Reliability Assessment: [Overall confidence in the information]
        
        DO NOT INCLUDE ANY METADATA, PREAMBLES OR CONCLUSIONS EXPLAINING YOUR ROLE.`,
      },
      {
        role: "user",
        content: `Please create a final integrated report based on these agent outputs:
        
        MONITOR AGENT OUTPUT:
        ${monitorOutput}
        
        SUMMARIZER AGENT OUTPUT:
        ${summarizerOutput}
        
        ANALYST AGENT OUTPUT:
        ${analystOutput}
        
        FACT-CHECKER AGENT OUTPUT:
        ${factCheckerOutput}`,
      },
    ]);

    return typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
  }
} 