import dotenv from 'dotenv';

dotenv.config();

if (!process.env.GOOGLE_API_KEY) {
  throw new Error('GOOGLE_API_KEY environment variable is not set. Please check your .env file.');
}

export const config = {
  port: process.env.PORT || 3000,
  googleApiKey: process.env.GOOGLE_API_KEY,
  googleTextModel: process.env.GOOGLE_TEXT_MODEL || 'gemini-2.5-flash',
  chromaUrl: process.env.CHROMA_URL || 'http://localhost:8000',
  logLevel: process.env.LOG_LEVEL || 'info',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/rag-materiel',
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  sessionSecret: process.env.SESSION_SECRET,
};
