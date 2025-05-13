import { ChatGroq } from "@langchain/groq";

const model = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    temperature: 0,
  });
export const getContext = async (chunk: string, fullText: string) => {
  const context = await model.invoke(`Document:\n${fullText}\n\nChunk:\n${chunk}\n\nWhat is the most relevant context from the document that helps understand this chunk? Keep it brief and focused.`);
  console.log("Context:", context);

  let contextText = "";

  if (typeof context.content === "string") {
    contextText = context.content;
  } else if (Array.isArray(context.content)) {
    // Join parts if the content is structured
    contextText = context.content
      .map(part => typeof part === 'string' ? part : '')
      .join(" ");
  }

  console.log("Context:", contextText);
  return contextText;
};

