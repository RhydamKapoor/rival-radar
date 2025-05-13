import { OllamaEmbeddings } from "@langchain/ollama";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { NextResponse } from "next/server";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";
import { v4 as uuidv4 } from 'uuid';
import { getContext } from "./getContext";
import path from 'path';
import os from 'os';

const pinecone = new PineconeClient();

// Interface for embedding vector
interface EmbeddingVector {
  id: string;
  values: number[];
  metadata: {
    text: string;
    contextText: string;
    timestamp: string;
    source: string;
    title?: string;
  };
}

export const getEmbeddings = async (chunks: string[], prompt: string, fullText: string, title?: string) => {
  console.log("Getting Pinecone index");
  const indexName = process.env.PINECONE_INDEX_NAME;
  if (!indexName) {
    throw new Error("PINECONE_INDEX_NAME environment variable is not defined");
  }
  console.log("Index name:", indexName);
  const index = pinecone.Index(indexName);

  const embeddings = new OllamaEmbeddings({
    model: "nomic-embed-text",
    baseUrl: "http://localhost:11434",
  });

  let vectors: EmbeddingVector[] = [];

  // If no chunks, return early with empty response
  if (chunks.length === 0) {
    console.log("No chunks to process");
    return {
      matches: [],
      namespace: '__default__',
      usage: { readUnits: 0 }
    };
  }

  // Process in batches to limit concurrency
  const numCPUs = os.cpus().length;
  const batchSize = Math.max(1, Math.min(4, numCPUs - 1)); // Use up to 4 threads but leave one for system
  console.log(`Processing ${chunks.length} chunks in batches of ${batchSize} (CPU cores: ${numCPUs})`);

  // Process chunks in batches using Promise.all for concurrent execution
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batchPromises = [];
    const end = Math.min(i + batchSize, chunks.length);
    
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}: chunks ${i+1} to ${end}`);
    
    for (let j = i; j < end; j++) {
      const chunk = chunks[j];
      batchPromises.push(
        (async () => {
          try {
            console.log(`Starting chunk ${j+1}/${chunks.length}`);
            const contextText = await getContext(chunk, fullText);
            const embedding = await embeddings.embedQuery(contextText);
            
            return {
              id: uuidv4(),
              values: embedding,
              metadata: {
                text: chunk,
                contextText,
                timestamp: new Date().toISOString(),
                source: 'wikipedia',
                title: title
              }
            };
          } catch (error) {
            console.error(`Error processing chunk ${j+1}:`, error);
            return null;
          }
        })()
      );
    }
    
    // Wait for current batch to complete
    const batchResults = await Promise.all(batchPromises);
    vectors = vectors.concat(batchResults.filter(Boolean) as EmbeddingVector[]);
    
    console.log(`Batch ${Math.floor(i / batchSize) + 1} completed, total vectors so far: ${vectors.length}`);
  }
  
  console.log("All batches completed. Total vectors created:", vectors.length);

  // Only upsert if we have vectors
  if (vectors.length > 0) {
    console.log("Upserting to Pinecone");
    await index.upsert(vectors);
    console.log("Vectors upserted successfully");
  } else {
    console.log("No vectors to upsert, skipping Pinecone update");
    // Return an empty response structure
    return {
      matches: [],
      namespace: '__default__',
      usage: { readUnits: 0 }
    };
  }

  console.log("Querying Pinecone for similar vectors");
  const queryEmbedding = await embeddings.embedQuery(prompt);
  
  // Create the query options without a filter initially
  const queryOptions: any = {
    vector: queryEmbedding,
    topK: 5,
    includeMetadata: true,
    includeValues: true
  };
  
  // Only add filter if title exists and it's a valid format
  if (title) {
    console.log("Adding filter for title:", title);
    // Use the correct filter format for Pinecone
    queryOptions.filter = {
      "metadata.title": { "$eq": title }
    };
  }
  
  // Execute the query with the properly formatted options
  const queryResponse = await index.query(queryOptions);

  return queryResponse;
};
