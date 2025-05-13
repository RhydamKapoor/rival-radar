import { ChatGroq } from "@langchain/groq";

// Define shared agent interface
export interface Agent {
  process: (input: string) => Promise<string>;
  name: string;
  description: string;
}

// Base class for all agents
export class BaseAgent implements Agent {
  protected model: ChatGroq;
  name: string;
  description: string;

  constructor(name: string, description: string) {
    this.name = name;
    this.description = description;
    this.model = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      temperature: 0,
    });
  }

  async process(input: string): Promise<string> {
    throw new Error("Method not implemented");
  }
}

// 1. Monitor Agent - Watches sources and detects new activity
export class MonitorAgent extends BaseAgent {
  constructor() {
    super(
      "Monitor Agent", 
      "Watches sources and detects new activity"
    );
  }

  async process(input: string): Promise<string> {
    const result = await this.model.invoke([
      {
        role: "system",
        content: `You are the Monitor Agent that identifies new events, activity, or updates in the given content.
        
        YOUR TASK:
        1. Analyze the input content closely
        2. Identify any events, news, announcements, or significant information
        3. Extract key details like who, what, when, where, and why for each detected activity
        4. Format the output in a structured way for the next agent in the workflow
        5. If no meaningful activity is detected, state that clearly
        
        FOCUS ON:
        - Recent statements or announcements
        - Actions that have been taken
        - Plans that have been announced
        - Changes in status or positions
        
        FORMAT YOUR RESPONSE CONCISELY WITH:
        - Activity detected: [Brief description]
        - Entities involved: [List of people, organizations, etc.]
        - Timestamp/timeline: [When this happened or will happen]
        - Source: [Where this information came from]
        - Significance: [Why this matters]
        
        DO NOT INCLUDE ANY PREAMBLE OR CONCLUSION IN YOUR RESPONSE.`,
      },
      {
        role: "user",
        content: `Please analyze the following content as a Monitor Agent and identify any new activity or events:\n\n${input}`,
      },
    ]);

    return typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
  }
}

// 2. Summarizer Agent - Summarizes new events using Groq
export class SummarizerAgent extends BaseAgent {
  constructor() {
    super(
      "Summarizer Agent", 
      "Summarizes new events using Groq"
    );
  }

  async process(input: string): Promise<string> {
    const result = await this.model.invoke([
      {
        role: "system",
        content: `You are the Summarizer Agent that creates concise, accurate summaries of detected events or content.
        
        YOUR TASK:
        1. Take the event details provided by the Monitor Agent
        2. Distill the key information into a clear, concise summary
        3. Highlight the most important aspects while removing redundancy
        4. Ensure the summary is objective and factual
        5. Organize information in order of importance
        
        FOCUS ON:
        - The core message or development
        - Key stakeholders and their roles
        - Critical timeline elements
        - Potential implications
        
        FORMAT YOUR RESPONSE CONCISELY WITH:
        - Summary: [2-3 sentence overview]
        - Key points: [Bulleted list of important details]
        - Context: [Brief background information if necessary]
        
        DO NOT INCLUDE ANY PREAMBLE OR CONCLUSION IN YOUR RESPONSE.`,
      },
      {
        role: "user",
        content: `Please summarize the following event information as a Summarizer Agent:\n\n${input}`,
      },
    ]);

    return typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
  }
}

// 3. Analyst Agent - Provides risk/impact analysis and actionable recommendations
export class AnalystAgent extends BaseAgent {
  constructor() {
    super(
      "Analyst Agent", 
      "Provides risk/impact analysis and actionable recommendations"
    );
  }

  async process(input: string): Promise<string> {
    const result = await this.model.invoke([
      {
        role: "system",
        content: `You are the Analyst Agent that evaluates risks, impacts, and provides actionable recommendations.
        
        YOUR TASK:
        1. Analyze the summarized information provided
        2. Assess potential risks and impacts associated with the event
        3. Evaluate the significance across multiple dimensions
        4. Provide clear, actionable recommendations based on the analysis
        5. Support your analysis with logical reasoning
        
        EVALUATE ACROSS THESE DIMENSIONS:
        - Security implications
        - Political considerations
        - Economic impacts
        - Social/public perception impacts
        - Short and long-term consequences
        
        FORMAT YOUR RESPONSE CONCISELY WITH:
        - Risk assessment: [Low/Medium/High with brief explanation]
        - Impact analysis: [Brief description of potential effects]
        - Strategic implications: [What this means in a broader context]
        - Recommendations: [Specific actionable steps]
        
        DO NOT INCLUDE ANY PREAMBLE OR CONCLUSION IN YOUR RESPONSE.`,
      },
      {
        role: "user",
        content: `Please analyze the following summary as an Analyst Agent and provide risk assessment and recommendations:\n\n${input}`,
      },
    ]);

    return typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
  }
}

// 4. Fact-Checker Agent - Validates extracted insights against multiple sources
export class FactCheckerAgent extends BaseAgent {
  constructor() {
    super(
      "Fact-Checker Agent", 
      "Validates extracted insights against multiple sources"
    );
  }

  async process(input: string): Promise<string> {
    const result = await this.model.invoke([
      {
        role: "system",
        content: `You are the Fact-Checker Agent that validates information and verifies claims.
        
        YOUR TASK:
        1. Critically examine the claims and information presented
        2. Identify statements that require verification
        3. Determine the confidence level for each significant claim
        4. Flag any inconsistencies, contradictions, or potential misinformation
        5. Provide an overall assessment of information reliability
        
        VERIFICATION APPROACH:
        - Cross-reference claims with known reliable information
        - Apply logical reasoning to evaluate plausibility
        - Identify missing context that could alter interpretation
        - Consider source credibility and potential biases
        
        FORMAT YOUR RESPONSE CONCISELY WITH:
        - Verification status: [Verified/Partially Verified/Unverified/Contradicted]
        - Confidence assessment: [High/Medium/Low for main claims]
        - Issues identified: [List any problematic claims or contradictions]
        - Missing context: [Important information not included]
        - Overall reliability: [Assessment of the overall information reliability]
        
        DO NOT INCLUDE ANY PREAMBLE OR CONCLUSION IN YOUR RESPONSE.`,
      },
      {
        role: "user",
        content: `Please fact-check the following analysis and claims as a Fact-Checker Agent:\n\n${input}`,
      },
    ]);

    return typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
  }
} 