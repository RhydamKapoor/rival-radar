import { parentPort, workerData } from 'worker_threads';
import { OllamaEmbeddings } from "@langchain/ollama";
import { v4 as uuidv4 } from 'uuid';
import { getContext } from "./getContext";

// Define interfaces for type safety
interface WorkerData {
  chunks: string[];
  fullText: string;
  title?: string;
  startIndex: number;
  endIndex: number;
}

interface EmbeddingVector {
  id: string;
  values: number[];
  metadata: {
    text: string;
    contextText: string;
    timestamp: string;
    source: string;
  };
  filter: {
    title?: string;
  };
}

// Type assertion for workerData
const typedWorkerData = workerData as WorkerData;
const { chunks, fullText, title, startIndex, endIndex } = typedWorkerData;

async function processChunks() {
  if (!parentPort) {
    throw new Error('Parent port is undefined');
  }
  
  const embeddings = new OllamaEmbeddings({
    model: "nomic-embed-text",
    baseUrl: "http://localhost:11434",
  });

  const vectors: EmbeddingVector[] = [];

  for (let i = startIndex; i < endIndex && i < chunks.length; i++) {
    const chunk = chunks[i];
    const contextText = await getContext(chunk, fullText);
    const embedding = await embeddings.embedQuery(contextText);
    
    vectors.push({
      id: uuidv4(),
      values: embedding,
      metadata: {
        text: chunk,
        contextText: contextText,
        timestamp: new Date().toISOString(),
        source: `wikipedia`,
      },
      filter: {
        title: title
      }
    });
  }

  parentPort.postMessage(vectors);
}

processChunks().catch(error => {
  console.error('Worker error:', error);
  if (parentPort) {
    parentPort.postMessage({ error: error.message });
  }
}); 