import Notebook from '../database/models/Notebook.js';
import Document from '../database/models/Document.js';
import User from '../database/models/User.js';
import logger from '../middlewares/logger.js';

export const createNotebook = async (userId, name, description = '') => {
  const id = `nb_${Date.now()}`;
  const notebook = new Notebook({
    _id: id,
    userId,
    name,
    description,
  });

  await notebook.save();

  // Add to user's notebookIds
  await User.findByIdAndUpdate(userId, { $push: { notebookIds: id } });

  logger.info(`Notebook created: ${id} for user ${userId}`);
  return notebook;
};

export const getNotebooks = async (userId) => {
  return await Notebook.find({ userId });
};

export const getNotebook = async (notebookId, userId) => {
  const notebook = await Notebook.findOne({ _id: notebookId, userId });
  if (!notebook) {
    throw new Error('Notebook not found or access denied');
  }
  return notebook;
};

export const deleteNotebook = async (notebookId, userId) => {
  const notebook = await Notebook.findOneAndDelete({ _id: notebookId, userId });
  if (!notebook) {
    throw new Error('Notebook not found or access denied');
  }

  // Remove from user's notebookIds
  await User.findByIdAndUpdate(userId, { $pull: { notebookIds: notebookId } });

  // Delete associated documents
  await Document.deleteMany({ notebookId });

  logger.info(`Notebook deleted: ${notebookId} for user ${userId}`);
  return notebook;
};

export const addDocumentToNotebook = async (notebookId, userId, documentData) => {
  const notebook = await Notebook.findOne({ _id: notebookId, userId });
  if (!notebook) {
    throw new Error('Notebook not found or access denied');
  }

  const document = new Document({
    _id: `doc_${Date.now()}`,
    notebookId,
    userId,
    ...documentData,
  });

  await document.save();

  // Update notebook document count
  await Notebook.findByIdAndUpdate(notebookId, { $inc: { documentCount: 1 } });

  logger.info(`Document added to notebook: ${document._id}`);
  return document;
};

export const getDocumentsForNotebook = async (notebookId, userId) => {
  const notebook = await Notebook.findOne({ _id: notebookId, userId });
  if (!notebook) {
    throw new Error('Notebook not found or access denied');
  }

  return await Document.find({ notebookId });
};