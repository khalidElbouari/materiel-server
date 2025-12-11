import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { RetrievalQAChain } from 'langchain/chains';
import { initializeVectorStore, getVectorStore } from './vectorStore.js';
import { config } from '../config/env.js';
import Document from '../database/models/Document.js';
import logger from '../middlewares/logger.js';

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

export const ingestDocument = async (text, metadata = {}, notebookId, userId, documentId) => {
  try {
    logger.info(`Starting document ingestion for notebook ${notebookId}, user ${userId}`);

    const vectorStore = await getVectorStore(notebookId);

    // Split text into chunks
    const baseDocs = await textSplitter.createDocuments([text]);

    // Create enriched metadata for each chunk
    const docs = baseDocs.map((doc, index) => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        notebookId,
        userId,
        documentId,
        chunkId: `chunk_${documentId}_${index}`,
        pageContent: doc.pageContent,
      },
    }));

    // Add to vector store
    await vectorStore.addDocuments(docs);

    // Update document in MongoDB with chunk count
    await Document.findByIdAndUpdate(documentId, { chunkCount: docs.length });

    logger.info(`Document ingested successfully for notebook ${notebookId}. Chunks: ${docs.length}`);
    return { success: true, chunks: docs.length };
  } catch (error) {
    logger.error('Error ingesting document:', error);
    throw error;
  }
};

export const queryDocuments = async (query, notebookId, userId) => {
  try {
    logger.info(`Processing query for notebook ${notebookId}, user ${userId}: ${query}`);

    const vectorStore = await getVectorStore(notebookId);

    // Create retriever
    const retriever = vectorStore.asRetriever({ k: 4 });

    // --- Vérification des variables d'environnement ---
    if (!config.googleApiKey) {
      throw new Error('GOOGLE_API_KEY is undefined. Check your .env file.');
    }

    // Vérification et fallback du modèle
const modelName = String(config.googleTextModel || 'gemini-2.0-flash');
logger.info('Using Google model:', modelName);

    // --- Créer le LLM de manière sûre ---
const llm = new ChatGoogleGenerativeAI({
  apiKey: String(config.googleApiKey),
  modelName,
  temperature: 0,
  verbose: true,
  maxOutputTokens: 1024,
});

    logger.info('ChatGoogleGenerativeAI instance created successfully.');

    // Create QA chain
    const chain = RetrievalQAChain.fromLLM(llm, retriever);

    // Get answer
    const result = await chain.call({ query });

    logger.info(`Query processed successfully for notebook ${notebookId}`);
    return result;
  } catch (error) {
    logger.error('Error querying documents:', error);
    throw error;
  }
};
