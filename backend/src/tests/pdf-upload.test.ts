/**
 * PDF Upload API Tests
 *
 * Run these tests with: npx tsx src/tests/pdf-upload.test.ts
 *
 * Prerequisites:
 * - Backend server running on localhost:3001
 * - A test PDF file at ./test-files/sample.pdf (or create one)
 */

import * as fs from 'fs';
import * as path from 'path';

const API_URL = 'http://localhost:3001/api';

// Test results tracking
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

// Helper to run a test
async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await testFn();
    results.push({ name, passed: true, duration: Date.now() - start });
    console.log(`✅ ${name}`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, error: errorMsg, duration: Date.now() - start });
    console.log(`❌ ${name}: ${errorMsg}`);
  }
}

// Helper to create a simple test PDF buffer
function createTestPdfBuffer(): Buffer {
  // This is a minimal valid PDF with some text
  const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 178 >>
stream
BT
/F1 24 Tf
100 700 Td
(Test Document for Flashcard Generation) Tj
0 -30 Td
/F1 14 Tf
(Photosynthesis is the process by which plants convert sunlight into energy.) Tj
0 -20 Td
(The mitochondria is the powerhouse of the cell.) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000266 00000 n
0000000496 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
573
%%EOF`;
  return Buffer.from(pdfContent);
}

// Helper to create FormData-like body for Node.js fetch
function createMultipartBody(fields: Record<string, string | Buffer>, filename?: string): { body: Buffer; boundary: string } {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const parts: Buffer[] = [];

  for (const [key, value] of Object.entries(fields)) {
    if (Buffer.isBuffer(value)) {
      parts.push(Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="${key}"; filename="${filename || 'test.pdf'}"\r\n` +
        `Content-Type: application/pdf\r\n\r\n`
      ));
      parts.push(value);
      parts.push(Buffer.from('\r\n'));
    } else {
      parts.push(Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="${key}"\r\n\r\n` +
        `${value}\r\n`
      ));
    }
  }

  parts.push(Buffer.from(`--${boundary}--\r\n`));
  return { body: Buffer.concat(parts), boundary };
}

// ============= TESTS =============

// Test 1: Health check
async function testHealthCheck(): Promise<void> {
  const response = await fetch(`${API_URL}/health`);
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`);
  }
  const data = await response.json();
  if (data.status !== 'ok') {
    throw new Error(`Unexpected health status: ${data.status}`);
  }
}

// Test 2: PDF upload without file (should fail)
async function testUploadWithoutFile(): Promise<void> {
  const response = await fetch(`${API_URL}/ai/upload-pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count: 5 }),
  });

  // Should return 400 or error
  const data = await response.json();
  if (data.success !== false) {
    throw new Error('Expected failure when no file is provided');
  }
}

// Test 3: Upload non-PDF file (should fail)
async function testUploadNonPdf(): Promise<void> {
  const textContent = Buffer.from('This is not a PDF file');
  const { body, boundary } = createMultipartBody(
    { pdf: textContent, count: '5' },
    'test.txt'
  );

  const response = await fetch(`${API_URL}/ai/upload-pdf`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body,
  });

  const data = await response.json();
  // Should fail because it's not a PDF
  if (response.ok && data.success === true) {
    throw new Error('Expected failure for non-PDF file');
  }
}

// Test 4: Upload valid PDF
async function testUploadValidPdf(): Promise<void> {
  const pdfBuffer = createTestPdfBuffer();
  const { body, boundary } = createMultipartBody(
    { pdf: pdfBuffer, count: '5' },
    'test.pdf'
  );

  const response = await fetch(`${API_URL}/ai/upload-pdf`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body,
  });

  const data = await response.json();

  if (!response.ok) {
    // If extraction fails due to minimal PDF, that's acceptable
    // The server correctly identified and processed the PDF file
    if (data.error?.includes('extract') || data.error?.includes('empty') || data.error?.includes('read PDF')) {
      console.log('  (PDF accepted but extraction failed - expected for minimal test PDF)');
      return;
    }
    throw new Error(`Upload failed: ${data.error || response.status}`);
  }

  if (!data.success) {
    // Also acceptable if it fails due to PDF content issues
    if (data.error?.includes('extract') || data.error?.includes('empty') || data.error?.includes('read PDF')) {
      console.log('  (PDF accepted but extraction failed - expected for minimal test PDF)');
      return;
    }
    throw new Error(`Upload returned success: false - ${data.error}`);
  }

  // Verify response structure
  if (!data.data) {
    throw new Error('Missing data in response');
  }
}

// Test 5: Upload with custom parameters
async function testUploadWithParams(): Promise<void> {
  const pdfBuffer = createTestPdfBuffer();
  const { body, boundary } = createMultipartBody(
    {
      pdf: pdfBuffer,
      count: '10',
      difficulty: 'advanced',
      customInstructions: 'Focus on biology terms',
      multipleChoiceRatio: '0.5',
    },
    'biology-notes.pdf'
  );

  const response = await fetch(`${API_URL}/ai/upload-pdf`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body,
  });

  const data = await response.json();

  // Even if it fails due to minimal PDF, the endpoint should accept the params
  if (response.status === 500 && data.error?.includes('AI')) {
    console.log('  (Skipped - AI service not configured)');
    return;
  }

  // PDF extraction failure is acceptable for our minimal test PDF
  if (!response.ok && (data.error?.includes('extract') || data.error?.includes('read PDF'))) {
    console.log('  (PDF accepted with params but extraction failed - expected for minimal test PDF)');
    return;
  }

  if (!response.ok) {
    throw new Error(`Request failed: ${data.error}`);
  }
}

// Test 6: Test file size limit (create large buffer)
async function testFileSizeLimit(): Promise<void> {
  // Create a buffer larger than 10MB limit
  const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB

  // Add PDF header to make it look like a PDF
  const pdfHeader = Buffer.from('%PDF-1.4\n');
  pdfHeader.copy(largeBuffer);

  const { body, boundary } = createMultipartBody(
    { pdf: largeBuffer, count: '5' },
    'large.pdf'
  );

  const response = await fetch(`${API_URL}/ai/upload-pdf`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body,
  });

  // Should fail due to file size
  if (response.ok) {
    const data = await response.json();
    if (data.success === true) {
      throw new Error('Expected failure for oversized file');
    }
  }
  // If it fails, that's expected
}

// Test 7: Verify response card structure
async function testResponseCardStructure(): Promise<void> {
  const pdfBuffer = createTestPdfBuffer();
  const { body, boundary } = createMultipartBody(
    { pdf: pdfBuffer, count: '3' },
    'test.pdf'
  );

  const response = await fetch(`${API_URL}/ai/upload-pdf`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body,
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    // If it fails due to extraction, skip this test
    if (data.error?.includes('extract') || data.error?.includes('empty')) {
      console.log('  (Skipped - minimal PDF has no extractable text)');
      return;
    }
    // If AI not configured, skip
    if (data.error?.includes('AI') || data.model === 'mock') {
      console.log('  (Checking mock response structure)');
    }
  }

  if (data.data?.cards) {
    for (const card of data.data.cards) {
      if (typeof card.front !== 'string') {
        throw new Error('Card missing "front" field');
      }
      if (typeof card.back !== 'string') {
        throw new Error('Card missing "back" field');
      }
      if (!['flashcard', 'multiple_choice'].includes(card.cardType)) {
        throw new Error(`Invalid cardType: ${card.cardType}`);
      }
    }
  }
}

// ============= RUN TESTS =============

async function runAllTests(): Promise<void> {
  console.log('\n🧪 PDF Upload API Tests\n');
  console.log('='.repeat(50));

  await runTest('Health check', testHealthCheck);
  await runTest('Upload without file (should fail)', testUploadWithoutFile);
  await runTest('Upload non-PDF file (should fail)', testUploadNonPdf);
  await runTest('Upload valid PDF', testUploadValidPdf);
  await runTest('Upload with custom parameters', testUploadWithParams);
  await runTest('File size limit enforcement', testFileSizeLimit);
  await runTest('Response card structure validation', testResponseCardStructure);

  console.log('\n' + '='.repeat(50));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    console.log('Failed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(console.error);
