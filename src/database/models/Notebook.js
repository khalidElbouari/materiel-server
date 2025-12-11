import mongoose from 'mongoose';

const notebookSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  documentCount: {
    type: Number,
    default: 0,
  },
});

export default mongoose.model('Notebook', notebookSchema);