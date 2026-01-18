/**
 * AI Service
 *
 * Handles AI-powered flashcard generation through the backend API.
 */

import { apiRequest, APIResponse } from './api';

export interface GeneratedCard {
  front: string;
  back: string;
  cardType?: 'flashcard' | 'multiple_choice';
}

export interface GenerateFromTopicParams {
  topic: string;
  count?: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

export interface GenerateFromTextParams {
  text: string;
  count?: number;
}

export interface GenerateCardsResponse {
  cards: GeneratedCard[];
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
