import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

export const gettingChunks = async (content: string) => {
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 600,
    chunkOverlap: 200,
  });
  const result = await textSplitter.splitText(content);
  return result;
}
