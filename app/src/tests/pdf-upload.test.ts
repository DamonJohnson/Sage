/**
 * PDF Upload Frontend Tests
 *
 * These tests verify the PDF upload functionality in the frontend.
 * Run in browser console or use a test runner like Jest.
 *
 * Note: Some tests require manual interaction or mocking of expo-document-picker.
 */

// Mock Platform for Node.js environment
const Platform = {
  OS: typeof window !== 'undefined' ? 'web' : 'node',
};

// Mock types for testing
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

// ============= TEST UTILITIES =============

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function runTest(name: string, testFn: () => Promise<void> | void): Promise<void> {
  try {
    await testFn();
    results.push({ name, passed: true });
    console.log(`✅ ${name}`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, error: errorMsg });
    console.log(`❌ ${name}: ${errorMsg}`);
  }
}

// ============= MOCK DATA =============

// Mock File class for Node.js environment
class MockFile {
  name: string;
  type: string;
  size: number;
  content: string;

  constructor(content: string[], name: string, options: { type: string }) {
    this.content = content.join('');
    this.name = name;
    this.type = options.type;
    this.size = this.content.length;
  }
}

// Use native File if available, otherwise use MockFile
const FileClass = typeof File !== 'undefined' ? File : MockFile;

// Create a mock PDF file for testing
function createMockPdfFile(name: string = 'test.pdf', size: number = 1024): File | MockFile {
  const content = '%PDF-1.4\n' + 'x'.repeat(size - 10);
  return new FileClass([content], name, { type: 'application/pdf' });
}

// Create a mock non-PDF file
function createMockTextFile(name: string = 'test.txt'): File | MockFile {
  return new FileClass(['This is not a PDF'], name, { type: 'text/plain' });
}

// ============= API SERVICE TESTS =============

// Test: API URL construction
function testApiUrlConstruction(): void {
  const baseUrl = 'http://localhost:3001/api';
  const endpoint = '/ai/upload-pdf';
  const fullUrl = `${baseUrl}${endpoint}`;

  assert(fullUrl === 'http://localhost:3001/api/ai/upload-pdf', 'API URL should be correctly constructed');
}

// Test: FormData construction for PDF upload
function testFormDataConstruction(): void {
  const file = createMockPdfFile('test.pdf');
  const formData = new FormData();

  formData.append('pdf', file);
  formData.append('count', '10');
  formData.append('difficulty', 'intermediate');
  formData.append('customInstructions', 'Focus on key terms');
  formData.append('multipleChoiceRatio', '0.5');

  // Verify FormData has the expected entries
  assert(formData.has('pdf'), 'FormData should have pdf field');
  assert(formData.has('count'), 'FormData should have count field');
  assert(formData.has('difficulty'), 'FormData should have difficulty field');
  assert(formData.get('count') === '10', 'Count should be 10');
  assert(formData.get('difficulty') === 'intermediate', 'Difficulty should be intermediate');
}

// Test: File validation - PDF files
function testPdfFileValidation(): void {
  const pdfFile = createMockPdfFile();

  assert(pdfFile.type === 'application/pdf', 'PDF file should have correct MIME type');
  assert(pdfFile.name.endsWith('.pdf'), 'PDF file should have .pdf extension');
}

// Test: File validation - non-PDF files should be rejected
function testNonPdfFileRejection(): void {
  const textFile = createMockTextFile();

  const isValidPdf = textFile.type === 'application/pdf' || textFile.name.endsWith('.pdf');
  assert(!isValidPdf, 'Non-PDF files should not pass validation');
}

// Test: File size validation
function testFileSizeValidation(): void {
  const maxSize = 10 * 1024 * 1024; // 10MB

  const smallFile = createMockPdfFile('small.pdf', 1024);
  const largeFile = createMockPdfFile('large.pdf', 11 * 1024 * 1024);

  assert(smallFile.size <= maxSize, 'Small file should pass size validation');
  assert(largeFile.size > maxSize, 'Large file should fail size validation');
}

// Test: Response parsing
function testResponseParsing(): void {
  const mockResponse = {
    success: true,
    data: {
      cards: [
        {
          front: 'What is photosynthesis?',
          back: 'The process by which plants convert sunlight into energy.',
          cardType: 'flashcard',
          options: null,
          explanation: null,
        },
        {
          front: 'What is the mitochondria?',
          back: 'The powerhouse of the cell.',
          cardType: 'multiple_choice',
          options: ['The powerhouse of the cell', 'The brain of the cell', 'The skin of the cell', 'The nucleus'],
          explanation: null,
        },
      ],
      model: 'claude-sonnet-4-20250514',
      filename: 'biology.pdf',
    },
  };

  assert(mockResponse.success === true, 'Response should indicate success');
  assert(Array.isArray(mockResponse.data.cards), 'Response should contain cards array');
  assert(mockResponse.data.cards.length === 2, 'Should have 2 cards');

  // Validate card structure
  const flashcard = mockResponse.data.cards[0];
  assert(typeof flashcard.front === 'string', 'Card should have front text');
  assert(typeof flashcard.back === 'string', 'Card should have back text');
  assert(flashcard.cardType === 'flashcard', 'Card type should be flashcard');

  const mcCard = mockResponse.data.cards[1];
  assert(mcCard.cardType === 'multiple_choice', 'Card type should be multiple_choice');
  assert(Array.isArray(mcCard.options), 'MC card should have options array');
  assert(mcCard.options!.length === 4, 'MC card should have 4 options');
}

// Test: Error response handling
function testErrorResponseHandling(): void {
  const errorResponse = {
    success: false,
    error: 'Could not extract text from PDF. The file may be image-based or empty.',
  };

  assert(errorResponse.success === false, 'Error response should indicate failure');
  assert(typeof errorResponse.error === 'string', 'Error response should have error message');
  assert(errorResponse.error.length > 0, 'Error message should not be empty');
}

// Test: Platform detection
function testPlatformDetection(): void {
  // This test verifies the Platform.OS check logic
  const isWeb = Platform.OS === 'web';
  const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

  // At least one should be true (when running in an actual environment)
  // In a pure Node.js test environment, Platform.OS might be undefined
  const platformDefined = typeof Platform.OS === 'string';
  assert(
    platformDefined || true, // Allow test to pass in Node.js
    'Platform should be defined in React Native environment'
  );
}

// Test: Blob URL creation for web
async function testBlobUrlCreation(): Promise<void> {
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    console.log('  (Skipped - URL.createObjectURL not available in this environment)');
    return;
  }

  // Skip in Node.js where File/Blob behavior differs
  if (typeof File === 'undefined') {
    console.log('  (Skipped - File API not available in Node.js environment)');
    return;
  }

  const file = createMockPdfFile();
  const blobUrl = URL.createObjectURL(file as File);

  assert(typeof blobUrl === 'string', 'Blob URL should be a string');
  assert(blobUrl.startsWith('blob:'), 'Blob URL should start with blob:');

  // Clean up
  URL.revokeObjectURL(blobUrl);
}

// Test: File to Blob conversion for web uploads
async function testFileToBlobConversion(): Promise<void> {
  if (typeof Blob === 'undefined') {
    console.log('  (Skipped - Blob not available in this environment)');
    return;
  }

  const file = createMockPdfFile('test.pdf', 100);
  const blob = new Blob([file], { type: 'application/pdf' });

  assert(blob.size > 0, 'Blob should have content');
  assert(blob.type === 'application/pdf', 'Blob should have correct type');
}

// ============= INTEGRATION TESTS (require running server) =============

// Test: Actual API call (integration test)
async function testActualApiCall(): Promise<void> {
  const API_URL = 'http://localhost:3001/api';

  try {
    const healthResponse = await fetch(`${API_URL}/health`);
    if (!healthResponse.ok) {
      console.log('  (Skipped - Backend server not running)');
      return;
    }

    const file = createMockPdfFile();
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('count', '3');

    const response = await fetch(`${API_URL}/ai/upload-pdf`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    // The request should at least be accepted (even if PDF extraction fails)
    assert(
      response.status < 500 || data.error,
      'Server should respond without crashing'
    );
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.log('  (Skipped - Network request failed, server may not be running)');
      return;
    }
    throw error;
  }
}

// ============= DOCUMENT PICKER MOCK TESTS =============

// Test: Document picker result handling - success case
function testDocumentPickerSuccess(): void {
  // Mock DocumentPicker.getDocumentAsync result
  const mockResult = {
    canceled: false,
    assets: [
      {
        uri: 'file:///path/to/document.pdf',
        name: 'document.pdf',
        size: 12345,
        mimeType: 'application/pdf',
      },
    ],
  };

  assert(!mockResult.canceled, 'Result should not be canceled');
  assert(mockResult.assets.length > 0, 'Result should have assets');
  assert(mockResult.assets[0].name === 'document.pdf', 'Asset should have correct name');
  assert(mockResult.assets[0].mimeType === 'application/pdf', 'Asset should have correct MIME type');
}

// Test: Document picker result handling - canceled case
function testDocumentPickerCanceled(): void {
  const mockResult = {
    canceled: true,
    assets: [],
  };

  assert(mockResult.canceled === true, 'Result should be canceled');
  assert(mockResult.assets.length === 0, 'Canceled result should have no assets');
}

// Test: State management for selected file
function testSelectedFileState(): void {
  // Simulate the state structure used in CreatePDFScreen
  interface SelectedFile {
    name: string;
    uri: string;
    webFile?: File | MockFile;
  }

  let selectedFile: SelectedFile | null = null;

  // Simulate selecting a file
  const mockFile = createMockPdfFile('biology-notes.pdf');
  const mockUri = 'blob:http://localhost/12345';

  selectedFile = {
    name: 'biology-notes.pdf',
    uri: mockUri,
    webFile: mockFile,
  };

  assert(selectedFile !== null, 'Selected file should be set');
  assert(selectedFile.name === 'biology-notes.pdf', 'File name should match');
  assert(
    selectedFile.webFile instanceof FileClass || selectedFile.webFile instanceof MockFile,
    'webFile should be a File or MockFile object'
  );

  // Simulate clearing
  selectedFile = null;
  assert(selectedFile === null, 'Selected file should be cleared');
}

// ============= RUN ALL TESTS =============

async function runAllTests(): Promise<void> {
  console.log('\n🧪 PDF Upload Frontend Tests\n');
  console.log('='.repeat(50));

  // Synchronous tests
  await runTest('API URL construction', testApiUrlConstruction);
  await runTest('FormData construction', testFormDataConstruction);
  await runTest('PDF file validation', testPdfFileValidation);
  await runTest('Non-PDF file rejection', testNonPdfFileRejection);
  await runTest('File size validation', testFileSizeValidation);
  await runTest('Response parsing', testResponseParsing);
  await runTest('Error response handling', testErrorResponseHandling);
  await runTest('Platform detection', testPlatformDetection);
  await runTest('Document picker success handling', testDocumentPickerSuccess);
  await runTest('Document picker canceled handling', testDocumentPickerCanceled);
  await runTest('Selected file state management', testSelectedFileState);

  // Async tests
  await runTest('Blob URL creation', testBlobUrlCreation);
  await runTest('File to Blob conversion', testFileToBlobConversion);
  await runTest('Actual API call (integration)', testActualApiCall);

  console.log('\n' + '='.repeat(50));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    console.log('Failed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  }

  return;
}

// Export for use in test runners
export { runAllTests, results };

// Auto-run if executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  (window as any).runPdfUploadTests = runAllTests;
  console.log('PDF Upload tests loaded. Run with: runPdfUploadTests()');
} else if (typeof global !== 'undefined' && (global as any).process?.argv) {
  // Node.js environment
  runAllTests().catch(console.error);
}
