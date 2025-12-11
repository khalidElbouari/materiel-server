#!/usr/bin/env node

/**
 * Test script for RAG Pipeline validation
 * Tests the complete document processing and Q&A pipeline
 */

import { config } from './src/config/env.js';
import { connectDB, disconnectDB } from './src/database/connection.js';
import { initializeVectorStore } from './src/services/vectorStore.js';
import { ingestDocument, queryDocuments } from './src/services/documentService.js';
import Document from './src/database/models/Document.js';
import Notebook from './src/database/models/Notebook.js';
import User from './src/database/models/User.js';
import logger from './src/middlewares/logger.js';

const TEST_USER_ID = 'test_user_123';
const TEST_NOTEBOOK_ID = 'test_notebook_123';
const TEST_DOCUMENT_ID = 'test_document_123';

const testDocument = {
  title: 'Test Physics Document',
  content: `
Newton's First Law of Motion:
An object at rest stays at rest, and an object in motion stays in motion with the same speed and in the same direction unless acted upon by an unbalanced force. This is also known as the law of inertia.

Newton's Second Law of Motion:
Force equals mass times acceleration (F = ma). This law describes how the velocity of an object changes when it is subjected to an external force.

Newton's Third Law of Motion:
For every action, there is an equal and opposite reaction. This means that whenever one object exerts a force on another object, the second object exerts an equal and opposite force on the first.

Energy Conservation:
Energy cannot be created or destroyed, only transformed from one form to another. This principle is fundamental to understanding many physical processes.

Quantum Mechanics:
At the atomic and subatomic levels, particles exhibit both wave-like and particle-like properties. This duality is a cornerstone of modern physics.
  `,
  metadata: {
    source: 'test document',
    fileName: 'physics_test.txt',
    tags: ['physics', 'test']
  }
};

async function setupTestData() {
  console.log('🚀 Setting up test data...');

  // Create test user
  const user = new User({
    _id: TEST_USER_ID,
    name: 'Test User',
    email: 'test@example.com',
    avatar: 'https://example.com/avatar.jpg',
    notebookIds: [TEST_NOTEBOOK_ID]
  });
  await user.save();
  console.log('✅ Test user created');

  // Create test notebook
  const notebook = new Notebook({
    _id: TEST_NOTEBOOK_ID,
    userId: TEST_USER_ID,
    name: 'Test Physics Notebook',
    description: 'A test notebook for physics documents',
    documentCount: 1
  });
  await notebook.save();
  console.log('✅ Test notebook created');

  // Create test document
  const document = new Document({
    _id: TEST_DOCUMENT_ID,
    notebookId: TEST_NOTEBOOK_ID,
    userId: TEST_USER_ID,
    ...testDocument,
    chunkCount: 0
  });
  await document.save();
  console.log('✅ Test document created');

  return { user, notebook, document };
}

async function testDocumentIngestion() {
  console.log('\n📄 Testing document ingestion...');

  try {
    const result = await ingestDocument(
      testDocument.content,
      testDocument.metadata,
      TEST_NOTEBOOK_ID,
      TEST_USER_ID,
      TEST_DOCUMENT_ID
    );

    console.log(`✅ Document ingested successfully`);
    console.log(`   - Chunks created: ${result.chunks}`);
    console.log(`   - Success: ${result.success}`);

    // Verify document was updated in database
    const updatedDoc = await Document.findById(TEST_DOCUMENT_ID);
    console.log(`   - Chunk count in DB: ${updatedDoc.chunkCount}`);

    return result;
  } catch (error) {
    console.error('❌ Document ingestion failed:', error.message);
    throw error;
  }
}

async function testDocumentQuerying() {
  console.log('\n❓ Testing document querying...');

  const testQueries = [
    'What is Newton\'s First Law?',
    'Explain force and acceleration',
    'What is energy conservation?',
    'Describe quantum mechanics'
  ];

  for (const query of testQueries) {
    try {
      console.log(`\n🔍 Query: "${query}"`);
      const result = await queryDocuments(query, TEST_NOTEBOOK_ID, TEST_USER_ID);

      console.log(`✅ Answer received:`);
      console.log(`   "${result.text.substring(0, 100)}..."`);

      if (result.sourceDocuments && result.sourceDocuments.length > 0) {
        console.log(`   📚 Sources found: ${result.sourceDocuments.length}`);
        console.log(`   📄 First source preview: "${result.sourceDocuments[0].pageContent.substring(0, 50)}..."`);
      } else {
        console.log(`   ⚠️  No sources found`);
      }
    } catch (error) {
      console.error(`❌ Query failed for "${query}":`, error.message);
    }
  }
}

async function validatePipeline() {
  console.log('\n🔍 Validating complete RAG pipeline...\n');

  // Check 1: Database connection
  console.log('1️⃣  Database Connection:');
  try {
    await connectDB();
    console.log('   ✅ MongoDB connected successfully');
  } catch (error) {
    console.log('   ❌ MongoDB connection failed:', error.message);
    return;
  }

  // Check 2: Vector store initialization
  console.log('\n2️⃣  Vector Store Initialization:');
  try {
    await initializeVectorStore();
    console.log('   ✅ Vector store initialized successfully');
  } catch (error) {
    console.log('   ❌ Vector store initialization failed:', error.message);
    return;
  }

  // Check 3: Document ingestion
  console.log('\n3️⃣  Document Processing Pipeline:');
  try {
    await setupTestData();
    const ingestionResult = await testDocumentIngestion();

    if (ingestionResult.success && ingestionResult.chunks > 0) {
      console.log('   ✅ Document processing pipeline working');
      console.log(`   📊 Chunks created: ${ingestionResult.chunks}`);
    } else {
      console.log('   ❌ Document processing failed');
    }
  } catch (error) {
    console.log('   ❌ Document processing error:', error.message);
    return;
  }

  // Check 4: Query processing
  console.log('\n4️⃣  Query Processing Pipeline:');
  try {
    await testDocumentQuerying();
    console.log('   ✅ Query processing pipeline working');
  } catch (error) {
    console.log('   ❌ Query processing failed:', error.message);
  }
}

async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...');

  try {
    await Document.findByIdAndDelete(TEST_DOCUMENT_ID);
    await Notebook.findByIdAndDelete(TEST_NOTEBOOK_ID);
    await User.findByIdAndDelete(TEST_USER_ID);
    console.log('✅ Test data cleaned up');
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  }
}

async function runTests() {
  console.log('🧪 RAG Pipeline Test Suite');
  console.log('==========================\n');

  try {
    await validatePipeline();
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  } finally {
    await cleanupTestData();
    await disconnectDB();
    console.log('\n🏁 Test suite completed');
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests, validatePipeline, testDocumentIngestion, testDocumentQuerying };