/**
 * AI Service
 *
 * Handles AI-powered flashcard generation through the backend API.
 */

import { apiRequest, APIResponse } from './api';
import api from './api';

export interface GeneratedCard {
  front: string;
  back: string;
  cardType?: 'flashcard' | 'multiple_choice';
  options?: string[] | null;
  explanation?: string | null;
  frontImage?: string | null;
  backImage?: string | null;
  imageIndex?: number; // Index of source image (for image-based generation)
}

export interface GenerateFromTopicParams {
  topic: string;
  count?: number;
  difficulty?: 'basic' | 'intermediate' | 'advanced' | 'expert';
  customInstructions?: string;
  includeExplanations?: boolean;
  multipleChoiceRatio?: number; // 0 = all flashcards, 1 = all multiple choice
}

export interface ValidateTopicResponse {
  isValid: boolean;
  needsClarification: boolean;
  reason?: string | null;
  questions?: string[];
}

export interface RefineCardsParams {
  cards: { front: string; back: string }[];
  instructions: string;
}

export interface ImproveCardParams {
  front: string;
  back: string;
  instruction: string;
}

export interface ImproveCardResponse {
  front: string;
  back: string;
  model?: string;
}

export interface ConvertToMultipleChoiceParams {
  front: string;
  back: string;
}

export interface ConvertToMultipleChoiceResponse {
  front: string;
  back: string;
  cardType: 'multiple_choice';
  options: string[];
  model?: string;
}

export interface ExplainConceptParams {
  question: string;
  answer: string;
  followUpQuestion?: string;
}

export interface ExplainConceptResponse {
  explanation: string;
  model?: string;
}

export interface GenerateFromConceptParams {
  sourceQuestion: string;
  sourceAnswer: string;
  focusArea: string;
  count: number;
}

export interface GenerateFromConceptResponse {
  cards: GeneratedCard[];
  model?: string;
}

export interface GenerateFromTextParams {
  text: string;
  count?: number;
}

export interface GenerateFromPDFParams {
  fileUri: string;
  fileName: string;
  mimeType: string;
  customInstructions?: string;
  multipleChoiceRatio?: number; // 0 = all flashcards, 1 = all multiple choice
}

export interface GenerateFromPDFResponse {
  cards: GeneratedCard[];
  filename: string;
  pageCount?: number;
  characterCount?: number;
}

export interface GenerateFromImageParams {
  images: string[]; // Array of base64 images
  customInstructions?: string;
  multipleChoiceRatio?: number;
  includeImageOnQuestion?: boolean; // Include source image on question side of cards
}

export interface GenerateFromImageResponse {
  cards: GeneratedCard[];
}

export interface GenerateCardsResponse {
  cards: GeneratedCard[];
}

/**
 * Validate a topic and get clarifying questions if needed
 */
export async function validateTopic(
  topic: string
): Promise<APIResponse<ValidateTopicResponse>> {
  return apiRequest<ValidateTopicResponse>('POST', '/api/ai/validate-topic', { topic });
}

/**
 * Generate flashcards from a topic using AI
 */
export async function generateFromTopic(
  params: GenerateFromTopicParams
): Promise<APIResponse<GenerateCardsResponse>> {
  return apiRequest<GenerateCardsResponse>('POST', '/api/ai/generate-from-topic', {
    topic: params.topic,
    count: params.count || 15,
    difficulty: params.difficulty || 'intermediate',
    customInstructions: params.customInstructions,
    includeExplanations: params.includeExplanations || false,
    multipleChoiceRatio: params.multipleChoiceRatio || 0,
  });
}

/**
 * Generate flashcards from text content using AI
 */
export async function generateFromText(
  params: GenerateFromTextParams
): Promise<APIResponse<GenerateCardsResponse>> {
  return apiRequest<GenerateCardsResponse>('POST', '/api/ai/generate-from-text', {
    text: params.text,
    count: params.count || 10,
  });
}

/**
 * Generate flashcards from a PDF file using AI
 * @param params - File parameters (URI, name, mimeType, count)
 * @param webFile - Optional File object for web uploads (pass the actual File from input)
 */
export async function generateFromPDF(
  params: GenerateFromPDFParams,
  webFile?: File
): Promise<APIResponse<GenerateFromPDFResponse>> {
  try {
    console.log('generateFromPDF called:', { params, hasWebFile: !!webFile });

    // Create FormData for file upload
    const formData = new FormData();

    // On web, use the actual File object; on native, use URI-based object
    if (webFile) {
      // Web: use the File object directly
      console.log('Using web file:', webFile.name, webFile.size, webFile.type);
      formData.append('pdf', webFile, params.fileName);
    } else {
      // Native: use URI-based approach
      console.log('Using native URI approach');
      formData.append('pdf', {
        uri: params.fileUri,
        name: params.fileName,
        type: params.mimeType || 'application/pdf',
      } as any);
    }

    if (params.customInstructions) {
      formData.append('customInstructions', params.customInstructions);
    }
    formData.append('multipleChoiceRatio', String(params.multipleChoiceRatio || 0));

    console.log('Sending request to /api/ai/upload-pdf...');
    const response = await api.post<APIResponse<GenerateFromPDFResponse>>(
      '/api/ai/upload-pdf',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 2 minutes for large PDFs
      }
    );

    console.log('Response received:', response.status, response.data);
    return response.data;
  } catch (error) {
    console.error('Error uploading PDF:', error);
    // Log more details about the error
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as any;
      console.error('Response status:', axiosError.response?.status);
      console.error('Response data:', axiosError.response?.data);
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process PDF',
    };
  }
}

/**
 * Generate cards from images using AI vision
 * @param params - Image parameters (base64 array, etc.)
 */
export async function generateFromImage(
  params: GenerateFromImageParams
): Promise<APIResponse<GenerateFromImageResponse>> {
  return apiRequest<GenerateFromImageResponse>('POST', '/api/ai/generate-from-image', {
    images: params.images,
    customInstructions: params.customInstructions,
    multipleChoiceRatio: params.multipleChoiceRatio || 0,
    includeImageOnQuestion: params.includeImageOnQuestion || false,
  });
}

/**
 * Refine a set of cards based on instructions
 */
export async function refineCards(
  params: RefineCardsParams
): Promise<APIResponse<GenerateCardsResponse>> {
  return apiRequest<GenerateCardsResponse>('POST', '/api/ai/refine-cards', {
    cards: params.cards,
    instructions: params.instructions,
  });
}

/**
 * Improve a single card based on an instruction
 */
export async function improveCard(
  params: ImproveCardParams
): Promise<APIResponse<ImproveCardResponse>> {
  return apiRequest<ImproveCardResponse>('POST', '/api/ai/improve-card', {
    front: params.front,
    back: params.back,
    instruction: params.instruction,
  });
}

/**
 * Convert a flashcard to multiple choice by generating AI-powered wrong options
 */
export async function convertToMultipleChoice(
  params: ConvertToMultipleChoiceParams
): Promise<APIResponse<ConvertToMultipleChoiceResponse>> {
  return apiRequest<ConvertToMultipleChoiceResponse>('POST', '/api/ai/convert-to-multiple-choice', {
    front: params.front,
    back: params.back,
  });
}

/**
 * Get a detailed explanation of a card concept, with optional follow-up questions
 */
export async function explainConcept(
  params: ExplainConceptParams
): Promise<APIResponse<ExplainConceptResponse>> {
  return apiRequest<ExplainConceptResponse>('POST', '/api/ai/explain-concept', {
    question: params.question,
    answer: params.answer,
    followUpQuestion: params.followUpQuestion,
  });
}

/**
 * Generate new cards from an existing concept
 */
export async function generateFromConcept(
  params: GenerateFromConceptParams
): Promise<APIResponse<GenerateFromConceptResponse>> {
  return apiRequest<GenerateFromConceptResponse>('POST', '/api/ai/generate-from-concept', {
    sourceQuestion: params.sourceQuestion,
    sourceAnswer: params.sourceAnswer,
    focusArea: params.focusArea,
    count: params.count,
  });
}

// Fallback mock generation when API is unavailable
export function generateMockCards(
  topic: string,
  count: number = 10,
  difficulty: string = 'intermediate'
): GeneratedCard[] {
  const templates = [
    { front: `What is ${topic}?`, back: `A comprehensive explanation of ${topic} covering its core concepts and principles.` },
    { front: `Who invented/discovered ${topic}?`, back: `The key figure(s) associated with the development of ${topic}.` },
    { front: `When did ${topic} originate?`, back: `The historical timeline of when ${topic} first emerged or was established.` },
    { front: `What are the main components of ${topic}?`, back: `The fundamental building blocks that make up ${topic}.` },
    { front: `Why is ${topic} important?`, back: `The significance and impact of ${topic} in its field and beyond.` },
    { front: `How does ${topic} work?`, back: `The mechanism and process by which ${topic} functions.` },
    { front: `What are common applications of ${topic}?`, back: `Practical uses and real-world implementations of ${topic}.` },
    { front: `What are the advantages of ${topic}?`, back: `Key benefits and positive aspects of ${topic}.` },
    { front: `What are the limitations of ${topic}?`, back: `Challenges and constraints associated with ${topic}.` },
    { front: `How does ${topic} compare to alternatives?`, back: `A comparison of ${topic} with similar concepts or approaches.` },
    { front: `What is the history of ${topic}?`, back: `The historical development and evolution of ${topic} over time.` },
    { front: `What are the key terms in ${topic}?`, back: `Essential vocabulary and terminology used in ${topic}.` },
    { front: `What are best practices for ${topic}?`, back: `Recommended approaches and methods for ${topic}.` },
    { front: `What are common mistakes in ${topic}?`, back: `Frequent errors to avoid when working with ${topic}.` },
    { front: `What is the future of ${topic}?`, back: `Predicted developments and emerging trends in ${topic}.` },
  ];

  return templates.slice(0, Math.min(count, templates.length)).map((t) => ({
    front: t.front,
    back: t.back,
    cardType: 'flashcard' as const,
  }));
}
