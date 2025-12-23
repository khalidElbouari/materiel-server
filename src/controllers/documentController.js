import multer from 'multer';
import { ingestDocument, queryDocuments } from '../services/documentService.js';
import { addDocumentToNotebook } from '../services/notebookService.js';
import logger from '../middlewares/logger.js';
import mammoth from 'mammoth';

const upload = multer({ storage: multer.memoryStorage() });

export const uploadDocument = [
  upload.single('document'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { notebookId } = req.params;
      const userId = req.userId;

      let text;
      const metadata = {
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      };

      if (req.file.mimetype === 'application/pdf') {
        // Parse PDF
        const { default: pdfParse } = await import('pdf-parse');
        const pdfData = await pdfParse(req.file.buffer);
        text = pdfData.text;
      } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                  req.file.mimetype === 'application/msword') {
        // Parse DOCX or DOC
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        text = result.value;
      } else if (req.file.mimetype.startsWith('text/')) {
        // Text files
        text = req.file.buffer.toString('utf-8');
      } else {
        return res.status(400).json({ error: 'Unsupported file type. Supported: PDF, DOC, DOCX, TXT, MD, etc.' });
      }

      // Create document in MongoDB first
      const documentData = {
        title: req.file.originalname,
        content: text,
        metadata,
      };

      const document = await addDocumentToNotebook(notebookId, userId, documentData);

      // Ingest into vector store
      const result = await ingestDocument(text, metadata, notebookId, userId, document._id);

      res.json({
        message: 'Document uploaded and processed successfully',
        document: {
          id: document._id,
          title: document.title,
          createdAt: document.createdAt,
        },
        ...result,
      });
    } catch (error) {
      next(error);
    }
  },
];

export const queryDocument = async (req, res, next) => {
  try {
    const { query } = req.body;
    const { notebookId } = req.params;
    const userId = req.userId;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const result = await queryDocuments(query, notebookId, userId);

    res.json({
      query,
      answer: result.answer,
      sourceDocuments: result.sourceDocuments?.map(doc => ({
        content: doc.pageContent,
        metadata: doc.metadata,
      })),
    });
  } catch (error) {
    next(error);
  }
};