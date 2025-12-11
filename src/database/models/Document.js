import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
  },
  notebookId: {
    type: String,
    ref: 'Notebook',
    required: true,
  },
  userId: {
    type: String,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  chunkCount: {
    type: Number,
    default: 0,
  },
  metadata: {
    source: {
      type: String,
      default: 'uploaded file',
    },
    fileName: {
      type: String,
    },
    tags: [{
      type: String,
    }],
  },
});

export default mongoose.model('Document', documentSchema);