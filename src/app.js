import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import { config } from './config/env.js';
import requestLogger from './middlewares/requestLogger.js';
import errorHandler from './middlewares/errorHandler.js';
import documentRoutes from './routes/documentRoutes.js';
import notebookRoutes from './routes/notebookRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { initializeVectorStore } from './services/vectorStore.js';
import { connectDB } from './database/connection.js';
import passport from './services/authService.js';
import { getCurrentUser } from './middlewares/auth.js';
import logger from './middlewares/logger.js';

const app = express();

// Middlewares
app.use(helmet());
app.use(cors({
  origin: true, // Allow all origins for development
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

app.use(requestLogger);
app.use(getCurrentUser);

// Routes
app.use('/auth', authRoutes);
app.use('/api/notebooks', notebookRoutes);
app.use('/api/documents', documentRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use(errorHandler);

const PORT = config.port;

// Initialize services and start server
const startServer = async () => {
  try {
    await connectDB();
    await initializeVectorStore();
    logger.info('All services initialized successfully');

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
};

startServer();

export default app;