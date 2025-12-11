import express from 'express';
import { requireAuth } from '../middlewares/auth.js';
import {
  createNotebook,
  getNotebooks,
  getNotebook,
  deleteNotebook,
} from '../services/notebookService.js';

const router = express.Router();

// Apply authentication to all routes
router.use(requireAuth);

// GET /api/notebooks - List all notebooks for the authenticated user
router.get('/', async (req, res) => {
  try {
    const notebooks = await getNotebooks(req.userId);
    res.json(notebooks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/notebooks - Create a new notebook
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const notebook = await createNotebook(req.userId, name, description);
    res.status(201).json(notebook);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/notebooks/:id - Get a specific notebook
router.get('/:id', async (req, res) => {
  try {
    const notebook = await getNotebook(req.params.id, req.userId);
    res.json(notebook);
  } catch (error) {
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// DELETE /api/notebooks/:id - Delete a notebook
router.delete('/:id', async (req, res) => {
  try {
    await deleteNotebook(req.params.id, req.userId);
    res.json({ message: 'Notebook deleted successfully' });
  } catch (error) {
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

export default router;