import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { ChromaClient } from 'chromadb';
import { config } from '../config/env.js';
import logger from '../middlewares/logger.js';

let embeddings = null;
let chromaClient = null;
const collections = new Map();

export const initializeVectorStore = async () => {
  if (!embeddings) {
    embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: config.googleApiKey,
      modelName: 'text-embedding-004',
    });
    logger.info('Embeddings initialized');
  }

  if (!chromaClient) {
    chromaClient = new ChromaClient({ path: config.chromaUrl });
    logger.info('ChromaDB client initialized');
  }

  return { embeddings, chromaClient };
};

export const getCollection = async (notebookId) => {
  if (!chromaClient) {
    throw new Error('ChromaDB client not initialized. Call initializeVectorStore first.');
  }

  const collectionName = `notebook_${notebookId}`;
  
  if (!collections.has(notebookId)) {
    try {
      const collection = await chromaClient.getOrCreateCollection({
        name: collectionName,
      });
      collections.set(notebookId, collection);
      logger.info(`ChromaDB collection initialized: ${collectionName}`);
    } catch (error) {
      logger.error(`Error getting collection: ${error}`);
      throw error;
    }
  }

  return collections.get(notebookId);
};

export { embeddings };