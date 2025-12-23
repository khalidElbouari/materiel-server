import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import Document from '../database/models/Document.js';
import logger from '../middlewares/logger.js';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnablePassthrough } from '@langchain/core/runnables';
import { getCollection, embeddings, initializeVectorStore } from './vectorStore.js';
import { config } from '../config/env.js';
import { StringOutputParser } from '@langchain/core/output_parsers';

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

export const ingestDocument = async (text, metadata = {}, notebookId, userId, documentId) => {
  try {
    await initializeVectorStore();
    const collection = await getCollection(notebookId);

    // Split text into chunks
    const docs = await textSplitter.createDocuments([text]);

    // Generate embeddings for all chunks
    const texts = docs.map(doc => doc.pageContent);
    const embeddingVectors = await embeddings.embedDocuments(texts);

    // Prepare data for ChromaDB
    const ids = docs.map((_, index) => `${documentId}_chunk_${index}`);
    const metadatas = docs.map((doc, index) => ({
      ...metadata,
      notebookId,
      userId,
      documentId,
      chunkId: `chunk_${documentId}_${index}`,
      text: doc.pageContent, // Store text in metadata for retrieval
    }));

    // Add to ChromaDB
    await collection.add({
      ids,
      embeddings: embeddingVectors,
      metadatas,
      documents: texts,
    });

    await Document.findByIdAndUpdate(documentId, { chunkCount: docs.length });

    logger.info(`Document ingested successfully. Chunks: ${docs.length}`);
    return { success: true, chunks: docs.length };
  } catch (error) {
    logger.error('Error ingesting document:', error);
    throw error;
  }
};


export const queryDocuments = async (query, notebookId, userId) => {
  try {
    if (!query || !query.trim()) throw new Error('Query cannot be empty.');
    if (!config.googleApiKey) throw new Error('GOOGLE_API_KEY is undefined.');
    if (!config.googleTextModel) throw new Error('GOOGLE_TEXT_MODEL is undefined.');

    await initializeVectorStore();
    const collection = await getCollection(notebookId);

    // Generate query embedding
    const queryEmbedding = await embeddings.embedQuery(query);

    // Search in ChromaDB
    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: 4,
    });

    // Extract documents from results
    const docs = results.documents[0].map((doc, index) => ({
      pageContent: doc,
      metadata: results.metadatas[0][index],
    }));

    // Combine context
    const contextText = docs.map(doc => doc.pageContent).join('\n\n');

    // Initialize LLM
    const llm = new ChatGoogleGenerativeAI({
      apiKey: String(config.googleApiKey),
      model: config.googleTextModel ?? 'gemini-2.5-flash',
      temperature: 0.1,
      maxOutputTokens: 2048,
    });

    // Prompt template
    const prompt = ChatPromptTemplate.fromTemplate(`
          Answer the question based on the following context:

          {context}

          Question: {question}

          Please provide a deteiled answer.
          `);

    const chain = RunnablePassthrough.assign({
      context: async () => contextText,
    })
      .pipe(prompt)
      .pipe(llm)
      .pipe(new StringOutputParser()); 

    const answerText = await chain.invoke({ question: query });

    logger.info(`Query answered. Response length: ${answerText.length} chars`);

    return { 
      answer: answerText, 
      sourceDocuments: docs 
    };
  } catch (error) {
    logger.error('Error querying documents:', error);
    throw error;
  }
};