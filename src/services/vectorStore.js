import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { config } from '../config/env.js';
import logger from '../middlewares/logger.js';

let embeddings = null;
const vectorStores = new Map(); // notebookId -> vectorStore

export const initializeVectorStore = async () => {
  if (!embeddings) {
    embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: config.googleApiKey,
      modelName: 'text-embedding-004', // Google's embedding model
    });
    logger.info('Embeddings initialized');
  }
  return embeddings;
};

export const getVectorStore = async (notebookId) => {
  if (!embeddings) {
    throw new Error('Embeddings not initialized. Call initializeVectorStore first.');
  }

  if (!vectorStores.has(notebookId)) {
    try {
      // Try to initialize Chroma vector store for this notebook
      const store = new Chroma(embeddings, {
        collectionName: `notebook_${notebookId}`,
        url: config.chromaUrl,
      });
      vectorStores.set(notebookId, store);
      logger.info(`ChromaDB vector store initialized for notebook ${notebookId}`);
    } catch (error) {
      logger.warn(`ChromaDB not available for notebook ${notebookId}, falling back to MemoryVectorStore:`, error.message);
      // Fallback to in-memory vector store
      const store = new MemoryVectorStore(embeddings);
      vectorStores.set(notebookId, store);
      logger.info(`MemoryVectorStore initialized as fallback for notebook ${notebookId}`);
    }
  }
  return vectorStores.get(notebookId);
};