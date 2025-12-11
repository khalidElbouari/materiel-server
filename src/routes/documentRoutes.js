import express from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { uploadDocument, queryDocument } from '../controllers/documentController.js';
import { getDocumentsForNotebook } from '../services/notebookService.js';

const router = express.Router();

// Apply authentication to all routes
router.use(requireAuth);

// POST /api/documents/:notebookId/upload - Upload and process document for notebook
router.post('/:notebookId/upload', uploadDocument);

// POST /api/documents/:notebookId/query - Query documents in notebook
router.post('/:notebookId/query', queryDocument);

// GET /api/documents/:notebookId - Get documents for notebook
router.get('/:notebookId', async (req, res) => {
  try {
    const { notebookId } = req.params;
    const documents = await getDocumentsForNotebook(notebookId, req.userId);
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;