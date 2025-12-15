import express from 'express';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { config } from '../config/env.js';
import logger from '../middlewares/logger.js';

const router = express.Router();

const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: config.googleApiKey,
  modelName: 'text-embedding-004',
});

/**
 * GET /debug/collections
 * Liste toutes les collections existantes
 */
router.get('/collections', async (req, res) => {
  try {
    const collections = Array.from(vectorStores.keys());
    res.json({ collections });
  } catch (err) {
    logger.error('Failed to list collections:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /debug/collection/:collectionName/chunks
 * Liste tous les chunks pour une collection spécifique
 */
router.get('/collection/:collectionName/chunks', async (req, res) => {
  const { collectionName } = req.params;

  try {
    const store = new Chroma(embeddings, {
      collectionName,
      url: config.chromaUrl,
    });

    const data = await store._collection.get({
      include: ['ids', 'documents', 'metadatas'],
    });

    const formatted = data.documents.map((doc, i) => ({
      id: data.ids[i],
      metadata: data.metadatas[i],
      snippet: doc.slice(0, 100) + (doc.length > 100 ? '...' : ''),
    }));

    res.json({ collectionName, chunks: formatted });
  } catch (err) {
    logger.error(`Failed to fetch chunks for collection ${collectionName}:`, err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
