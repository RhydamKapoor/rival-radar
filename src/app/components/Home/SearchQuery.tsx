"use client";
import axios from "axios";
import { Search } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import DebugPanel from "./DebugPanel";

// Define types for our responses
interface TweetData {
  content: string;
  images: string[];
  name: string;
  time: string;
}

interface AgentWorkflowResult {
  monitorResult: string;
  summarizerResult: string;
  analystResult: string;
  factCheckerResult: string;
  finalSummary: string;
}

interface TwitterResponse {
  data: string | TweetData[];
  title: string;
}

interface AgentResponse {
  originalResponse: string;
  agentWorkflow: AgentWorkflowResult;
}

interface ContentState {
  title: string;
  data: TweetData[];
  agentWorkflow?: AgentWorkflowResult;
}

export default function SearchQuery() {
  const { register, handleSubmit } = useForm();
  const [content, setContent] = useState<ContentState>({ data: [], title: "" });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<string>("");
  const [debugMode, setDebugMode] = useState<boolean>(false);

  const onSubmit = async (data: any) => {
    if (data.search !== "") {
      try {
        setLoading(true);
        setError(null);
        
        // Check if this is a time-specific query
        const isTimeQuery = isTimeSpecificQuery(data.search);
        if (isTimeQuery) {
          console.log("Time-specific query detected in UI:", data.search);
          console.log("Time pattern info:", debugTimePattern(data.search));
        }
        
        console.log("Searching for:", data.search);
        const response = await axios.post(`/api/scrape?query=${encodeURIComponent(data.search)}`, {
          method: "POST",
        });
  
        if (response.status === 200) {
          const responseData = response.data;
          console.log("Raw API response:", responseData);
  
          if (!responseData || !responseData.response) {
            throw new Error("Invalid response format");
          }
  
          const result = responseData.response;
          console.log("Response data structure:", typeof result, result);
  
          // CASE 1: Agent workflow response
          if (typeof result === 'object' && result.originalResponse && result.agentWorkflow) {
            console.log("Detected agent workflow response");
            console.log("Original response:", result.originalResponse);
            console.log("Agent workflow:", JSON.stringify(result.agentWorkflow, null, 2));
            setType("agent");
            setContent({
              title: "Analysis Results",
              data: [{
                content: result.originalResponse,
                images: [],
                name: "Original Response",
                time: new Date().toLocaleString(),
              }],
              agentWorkflow: result.agentWorkflow
            });
          }
          // CASE 2: Twitter response with data object
          else if (typeof result === 'object' && result.data !== undefined) {
            console.log("Detected Twitter/data object response");
            setType("object");
            
            if (typeof result.data === 'string') {
              // Data is a string, convert to our display format
              setContent({
                title: result.title || "Response",
                data: [{
                  content: result.data,
                  images: [],
                  name: "Response",
                  time: new Date().toLocaleString(),
                }],
              });
            } else if (Array.isArray(result.data)) {
              // Data is an array of tweet objects
              setContent({
                title: result.title || "Tweets",
                data: result.data,
              });
            } else {
              // Unexpected data structure
              throw new Error("Unexpected data structure in response");
            }
          }
          // CASE 3: String response that might be JSON
          else if (typeof result === 'string') {
            try {
              // Try to parse as JSON
              const parsedResult = JSON.parse(result);
              if (parsedResult.data !== undefined) {
                // Parsed JSON has data field
                setType("object");
                
                if (typeof parsedResult.data === 'string') {
                  setContent({
                    title: parsedResult.title || "Response",
                    data: [{
                      content: parsedResult.data,
                      images: [],
                      name: "Response",
                      time: new Date().toLocaleString(),
                    }],
                  });
                } else if (Array.isArray(parsedResult.data)) {
                  setContent({
                    title: parsedResult.title || "Response",
                    data: parsedResult.data,
                  });
                } else {
                  // Fallback for unexpected parsed structure
                  setType("string");
                  setContent({
                    title: "Response",
                    data: [{
                      content: result,
                      images: [],
                      name: "AI Response",
                      time: new Date().toLocaleString(),
                    }],
                  });
                }
              } else {
                // No data field in parsed JSON
                setType("string");
                setContent({
                  title: "Response",
                  data: [{
                    content: result,
                    images: [],
                    name: "AI Response",
                    time: new Date().toLocaleString(),
                  }],
                });
              }
            } catch (e) {
              // Not valid JSON, treat as plain string
              console.log("Not JSON, treating as plain string response");
              setType("string");
              setContent({
                title: "Response",
                data: [{
                  content: result,
                  images: [],
                  name: "AI Response",
                  time: new Date().toLocaleString(),
                }],
              });
            }
          }
          // CASE 4: Any other object structure
          else if (typeof result === 'object') {
            console.log("Detected generic object response");
            setType("string");
            setContent({
              title: "Response",
              data: [{
                content: JSON.stringify(result, null, 2),
                images: [],
                name: "System Response",
                time: new Date().toLocaleString(),
              }],
            });
          }
          // CASE 5: Fallback for any other type
          else {
            console.log("Fallback case for response type:", typeof result);
            setType("string");
            setContent({
              title: "Response",
              data: [{
                content: String(result),
                images: [],
                name: "System Response",
                time: new Date().toLocaleString(),
              }],
            });
          }
  
          console.log("Final processed content:", content);
        }
      } catch (error: any) {
        console.error("Error:", error);
        setError(error.message || "An error occurred while fetching results");
        setContent({
          title: "Error",
          data: [
            {
              content: error.message || "An error occurred while fetching results",
              images: [],
              name: "Error",
              time: new Date().toLocaleString(),
            },
          ],
        });
      } finally {
        setLoading(false);
      }
    }
  };
  
  // Improved function to parse tweet content and images
  const formatTweetContent = (content: string) => {
    if (!content) return "";
    
    // Check if it's a tweet formatted with "Name: ... Time: ... Content: ..."
    if (content.includes("Name:") && content.includes("Time:") && content.includes("Content:")) {
      // Extract just the content part for cleaner display
      const contentMatch = content.match(/Content:\s*(.*?)(?:\s*-\s*Images:|$)/i);
      return contentMatch ? contentMatch[1] : content;
    }
    
    return content;
  };
  
  // Function to extract image URLs from tweet content string
  const extractImagesFromContent = (content: string): string[] => {
    if (!content) return [];
    
    // Check for Images: section in the tweet content
    const imagesMatch = content.match(/Images:\s*(.*?)(?:\s*$)/i);
    if (imagesMatch && imagesMatch[1]) {
      // Split by comma and clean up
      return imagesMatch[1]
        .split(',')
        .map(url => url.trim())
        .filter(url => url && url !== 'undefined' && url !== '');
    }
    
    return [];
  };

  // Add a function to determine if this is a time-specific query
  const isTimeSpecificQuery = (query: string): boolean => {
    if (!query) return false;
    
    const timePatterns = [
      /\b\d+\s*h(our)?s?\s*(ago)?\b/i,  // Match any hour value (2h, 10h, 5 hours ago)
      /\brecent\b/i,
      /\blatest\b/i,
      /\blast\b/i,
      /\bago\b/i,
      /\btoday\b/i
    ];
    
    return timePatterns.some(pattern => pattern.test(query.toLowerCase()));
  };

  // Better debug function to show what time pattern was matched
  const debugTimePattern = (query: string): string => {
    if (!query) return "No query";
    
    // Check for hour patterns specifically
    const hourMatch = query.match(/(\d+)\s*h(our)?s?\s*(ago)?/i);
    if (hourMatch) {
      return `Hour match: "${hourMatch[0]}" (${hourMatch[1]} hours)`;
    }
    
    // Check other time patterns
    if (query.toLowerCase().includes("recent")) return "Contains 'recent'";
    if (query.toLowerCase().includes("latest")) return "Contains 'latest'";
    if (query.toLowerCase().includes("last")) return "Contains 'last'";
    if (query.toLowerCase().includes("ago")) return "Contains 'ago'";
    if (query.toLowerCase().includes("today")) return "Contains 'today'";
    
    return "No time pattern";
  };

  return (
    <div className="flex flex-col items-center h-full w-full gap-y-12 overflow-hidden">
      <form
        className="flex flex-col items-center justify-center w-full"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="flex items-center justify-center relative w-1/2">
          <input
            type="text"
            id="search"
            placeholder="Ask about JavaScript, or search tweets from someone..."
            {...register("search")}
            className="input input-bordered w-full border-2 border-primary rounded-full px-4 py-2 outline-none"
          />
          <button
            type="submit"
            className="absolute right-2 bg-base-100 rounded-full p-2 h-4/6 flex items-center justify-center cursor-pointer"
            disabled={loading}
          >
            {loading ? (
              <div className="loading loading-spinner loading-xs"></div>
            ) : (
              <Search className="w-5 h-5" />
            )}
          </button>
        </div>
        
        {/* Add debug mode toggle */}
        <div className="mt-2 flex items-center">
          <label className="cursor-pointer label">
            <span className="label-text mr-2">Debug Mode</span> 
            <input 
              type="checkbox" 
              className="toggle toggle-primary toggle-sm" 
              checked={debugMode}
              onChange={() => setDebugMode(!debugMode)}
            />
          </label>
        </div>
      </form>
      
      <div className="flex flex-col items-center h-full w-full overflow-y-auto">
        {error && (
          <div className="bg-error text-white p-4 rounded-lg mb-4 w-3/4">
            {error}
          </div>
        )}
        
        <div className="flex flex-col w-3/4">
          {loading ? (
            <div className="flex flex-col h-full items-center justify-center">
              <div className="loading loading-spinner loading-lg"></div>
              <h1 className="mt-4">Searching and processing results...</h1>
            </div>
          ) : (
            content.data.length > 0 && (
              <div className="flex flex-col w-full">
                <h1 className="text-2xl font-bold text-center mb-6">{content?.title}</h1>
                
                {/* Display Agent Workflow Results if available */}
                {content.agentWorkflow && (
                  <div className="mb-8 border-b">
                    <h2 className="text-xl font-bold mb-4">Multi-Agent Analysis</h2>
                    
                    {/* Add Debug Panel for raw terminal data */}
                    {debugMode && (
                      <DebugPanel 
                        originalResponse={content.data[0]?.content || ""} 
                        agentWorkflow={content.agentWorkflow} 
                      />
                    )}
                    
                    <div className="bg-base-100 p-4 rounded-lg mb-4 shadow-md">
                      <h3 className="text-lg font-semibold mb-2">Executive Summary</h3>
                      <p className="whitespace-pre-line">{content.agentWorkflow.finalSummary}</p>
                    </div>
                    
                    {/* <div className="flex flex-col gap-6">
                      <div className="collapse collapse-plus bg-base-200">
                        <input type="checkbox" defaultChecked /> 
                        <div className="collapse-title text-xl font-medium flex items-center">
                          <span className="badge badge-primary mr-2">1</span>
                          Monitor Agent Analysis
                        </div>
                        <div className="collapse-content"> 
                          <div className="bg-base-100 p-4 rounded-lg">
                            <p className="whitespace-pre-line">{content.agentWorkflow.monitorResult}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="collapse collapse-plus bg-base-200">
                        <input type="checkbox" /> 
                        <div className="collapse-title text-xl font-medium flex items-center">
                          <span className="badge badge-secondary mr-2">2</span>
                          Summarizer Agent Results
                        </div>
                        <div className="collapse-content"> 
                          <div className="bg-base-100 p-4 rounded-lg">
                            <p className="whitespace-pre-line">{content.agentWorkflow.summarizerResult}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="collapse collapse-plus bg-base-200">
                        <input type="checkbox" /> 
                        <div className="collapse-title text-xl font-medium flex items-center">
                          <span className="badge badge-accent mr-2">3</span>
                          Analyst Agent Assessment
                        </div>
                        <div className="collapse-content"> 
                          <div className="bg-base-100 p-4 rounded-lg">
                            <p className="whitespace-pre-line">{content.agentWorkflow.analystResult}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="collapse collapse-plus bg-base-200">
                        <input type="checkbox" /> 
                        <div className="collapse-title text-xl font-medium flex items-center">
                          <span className="badge badge-neutral mr-2">4</span>
                          Fact-Checker Agent Verification
                        </div>
                        <div className="collapse-content"> 
                          <div className="bg-base-100 p-4 rounded-lg">
                            <p className="whitespace-pre-line">{content.agentWorkflow.factCheckerResult}</p>
                          </div>
                        </div>
                      </div>
                    </div> */}
                  </div>
                )}
                
                <div className={`grid justify-items-center gap-x-12 gap-y-10 h-full p-5`}>
                  {isTimeSpecificQuery(content.title) && (
                    <div className="w-full text-center mb-4">
                      <div className="badge badge-accent p-3 gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-4 h-4 stroke-current">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        Time-specific results
                      </div>
                    </div>
                  )}
                  {content.data.map((item: TweetData, index: number) => (
                    <div 
                      className="flex flex-col justify-between gap-y-5 border p-5 rounded-xl min-h-[200px] w-1/2 shadow-md hover:shadow-lg transition-shadow" 
                      key={index}
                    >
                      <div className="flex flex-col gap-y-3">
                        <p className="text-sm text-gray-500 flex gap-x-3 items-center">
                          <span className="font-bold text-info">{item.name}</span>
                          <span className="text-gray-500">{item.time}</span>
                        </p>
                        <h3 className="text-lg">{formatTweetContent(item.content)}</h3>
                      </div>
                      {/* Display images from either direct images array or extracted from content */}
                      {(item?.images?.length > 0 || extractImagesFromContent(item.content).length > 0) && (
                        <div className="grid  gap-2 mt-2">
                          {/* First try images array */}
                          {item.images && item.images.length > 0 && item.images.map((img, imgIndex) => (
                            img && img !== 'undefined' && (
                              <img 
                                key={`img-${index}-${imgIndex}`}
                                src={img} 
                                alt={`${item?.name} image ${imgIndex + 1}`} 
                                className="rounded-lg h-40 w-full object-cover object-center"
                                onError={(e) => {
                                  // Hide broken images
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            )
                          ))}
                          
                          {/* Then try extracted images if no direct images */}
                          {(!item.images || item.images.length === 0) && 
                            extractImagesFromContent(item.content).map((img, imgIndex) => (
                              img && (
                                <img 
                                  key={`extracted-${index}-${imgIndex}`}
                                  src={img} 
                                  alt={`${item?.name} image ${imgIndex + 1}`} 
                                  className="rounded-lg h-40 w-full object-cover"
                                  onError={(e) => {
                                    // Hide broken images
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              )
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
