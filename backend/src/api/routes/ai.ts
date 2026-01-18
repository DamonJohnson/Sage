import { Router, Request, Response } from 'express';
import OpenAI from 'openai';
import { z } from 'zod';
import { config } from '../../config.js';

const router = Router();

// Lazy initialization of OpenAI client
let openai: OpenAI | null = null;
function getOpenAI(): OpenAI | null {
  if (config.openai.apiKey === 'stub-openai-api-key') {
    return null;
  }
  if (!openai) {
    openai = new OpenAI({ apiKey: config.openai.apiKey });
  }
  return openai;
}

// Validation schemas
const generateFromTopicSchema = z.object({
  topic: z.string().min(1, 'Topic is required').max(500),
  count: z.number().int().min(1).max(50).default(10),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate'),
});

const generateFromTextSchema = z.object({
  text: z.string().min(10, 'Text must be at least 10 characters').max(50000),
  count: z.number().int().min(1).max(50).default(10),
});

interface GeneratedCard {
  front: string;
  back: string;
  cardType?: string;
}

// POST /api/ai/generate-from-topic - Generate cards from a topic
router.post('/generate-from-topic', async (req: Request, res: Response) => {
  try {
    const validated = generateFromTopicSchema.safeParse(req.body);
    if (!validated.success) {
      res.status(400).json({
        success: false,
        error: validated.error.errors[0].message,
      });
      return;
    }

    const { topic, count, difficulty } = validated.data;
    const client = getOpenAI();

    // If no OpenAI key, return mock data
    if (!client) {
      const mockCards = generateMockCards(topic, count, difficulty);
      res.json({ success: true, data: { cards: mockCards } });
      return;
    }

    // Generate cards using OpenAI
    const systemPrompt = `You are an expert educator creating flashcards for spaced repetition learning. Create high-quality flashcards that:
- Have clear, specific questions on the front
- Have concise but complete answers on the back
- Are appropriate for ${difficulty} level learners
- Cover the most important concepts
- Use active recall principles (questions that test understanding, not just recognition)

Respond with a JSON array of objects with "front" and "back" properties. Example:
[{"front": "What is photosynthesis?", "back": "The process by which plants convert light energy into chemical energy, using CO2 and water to produce glucose and oxygen."}]`;

    const userPrompt = `Create ${count} flashcards about: ${topic}

Focus on the most important concepts, definitions, and relationships. Make questions specific and testable.`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 4000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      res.status(500).json({
        success: false,
        error: 'No response from AI',
      });
      return;
    }

    // Parse the response
    const parsed = JSON.parse(content);
    const cards: GeneratedCard[] = (parsed.cards || parsed).map((card: { front: string; back: string }) => ({
      front: card.front,
      back: card.back,
      cardType: 'flashcard',
    }));

    res.json({
      success: true,
      data: {
        cards,
        usage: {
          promptTokens: completion.usage?.prompt_tokens,
          completionTokens: completion.usage?.completion_tokens,
          totalTokens: completion.usage?.total_tokens,
        },
      },
    });
  } catch (error) {
    console.error('Error generating cards from topic:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate cards',
    });
  }
});

// POST /api/ai/generate-from-text - Generate cards from text content
router.post('/generate-from-text', async (req: Request, res: Response) => {
  try {
    const validated = generateFromTextSchema.safeParse(req.body);
    if (!validated.success) {
      res.status(400).json({
        success: false,
        error: validated.error.errors[0].message,
      });
      return;
    }

    const { text, count } = validated.data;
    const client = getOpenAI();

    // If no OpenAI key, return mock data
    if (!client) {
      const mockCards = [
        { front: 'Key concept from the text?', back: 'Main idea extracted from provided content.', cardType: 'flashcard' },
        { front: 'What is the main topic?', back: 'The primary subject discussed in the text.', cardType: 'flashcard' },
        { front: 'Who/What is mentioned?', back: 'Important entity from the content.', cardType: 'flashcard' },
      ];
      res.json({ success: true, data: { cards: mockCards.slice(0, count) } });
      return;
    }

    // Generate cards from text using OpenAI
    const systemPrompt = `You are an expert educator creating flashcards from source material for spaced repetition learning. Analyze the provided text and create flashcards that:
- Extract the most important facts, concepts, and relationships
- Have clear, specific questions on the front
- Have accurate answers derived directly from the text
- Use active recall principles
- Are self-contained (don't require seeing the original text to answer)

Respond with a JSON object containing a "cards" array of objects with "front" and "back" properties.`;

    const userPrompt = `Create ${count} flashcards from this text:

${text.substring(0, 15000)}${text.length > 15000 ? '\n\n[Text truncated...]' : ''}`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 4000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      res.status(500).json({
        success: false,
        error: 'No response from AI',
      });
      return;
    }

    // Parse the response
    const parsed = JSON.parse(content);
    const cards: GeneratedCard[] = (parsed.cards || parsed).map((card: { front: string; back: string }) => ({
      front: card.front,
      back: card.back,
      cardType: 'flashcard',
    }));

    res.json({
      success: true,
      data: {
        cards,
        usage: {
          promptTokens: completion.usage?.prompt_tokens,
          completionTokens: completion.usage?.completion_tokens,
          totalTokens: completion.usage?.total_tokens,
        },
      },
    });
  } catch (error) {
    console.error('Error generating cards from text:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate cards',
    });
  }
});

// POST /api/ai/generate-from-pdf - Generate cards from PDF content
router.post('/generate-from-pdf', async (req: Request, res: Response) => {
  try {
    const { extractedText, count = 20, filename } = req.body;

    if (!extractedText?.trim()) {
      res.status(400).json({
        success: false,
        error: 'Extracted text is required',
      });
      return;
    }

    const client = getOpenAI();

    if (!client) {
      const mockCards = generateMockCards(`Content from ${filename || 'PDF'}`, count, 'intermediate');
      res.json({ success: true, data: { cards: mockCards } });
      return;
    }

    const systemPrompt = `You are an expert educator creating flashcards from document content. Analyze the PDF text and create comprehensive flashcards that:
- Cover all key concepts, definitions, and important facts
- Have clear, testable questions
- Include context where necessary
- Are appropriate for study and review

Respond with a JSON object containing a "cards" array.`;

    const userPrompt = `Create ${count} flashcards from this PDF content${filename ? ` (${filename})` : ''}:

${extractedText.substring(0, 20000)}${extractedText.length > 20000 ? '\n\n[Content truncated...]' : ''}`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 4000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      res.status(500).json({
        success: false,
        error: 'No response from AI',
      });
      return;
    }

    const parsed = JSON.parse(content);
    const cards: GeneratedCard[] = (parsed.cards || parsed).map((card: { front: string; back: string }) => ({
      front: card.front,
      back: card.back,
      cardType: 'flashcard',
    }));

    res.json({
      success: true,
      data: {
        cards,
        usage: {
          promptTokens: completion.usage?.prompt_tokens,
          completionTokens: completion.usage?.completion_tokens,
          totalTokens: completion.usage?.total_tokens,
        },
      },
    });
  } catch (error) {
    console.error('Error generating cards from PDF:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate cards',
    });
  }
});

// POST /api/ai/generate-from-image - Generate cards from image (using vision)
router.post('/generate-from-image', async (req: Request, res: Response) => {
  try {
    const { imageBase64, count = 10, context } = req.body;

    if (!imageBase64) {
      res.status(400).json({
        success: false,
        error: 'Image data is required',
      });
      return;
    }

    const client = getOpenAI();

    if (!client) {
      const mockCards = [
        { front: 'What is shown in this image?', back: 'Description of the image content.', cardType: 'flashcard' },
        { front: 'What concept does this diagram illustrate?', back: 'The key concept being demonstrated.', cardType: 'flashcard' },
      ];
      res.json({ success: true, data: { cards: mockCards.slice(0, count) } });
      return;
    }

    const systemPrompt = `You are an expert educator creating flashcards from visual content. Analyze the image and create flashcards that:
- Identify and test knowledge of key elements, concepts, and relationships shown
- Have clear questions that can be answered without seeing the image again
- Cover important details, labels, diagrams, or text visible in the image

Respond with a JSON object containing a "cards" array.`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Create ${count} flashcards from this image.${context ? ` Context: ${context}` : ''}`,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 2000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      res.status(500).json({
        success: false,
        error: 'No response from AI',
      });
      return;
    }

    const parsed = JSON.parse(content);
    const cards: GeneratedCard[] = (parsed.cards || parsed).map((card: { front: string; back: string }) => ({
      front: card.front,
      back: card.back,
      cardType: 'flashcard',
    }));

    res.json({
      success: true,
      data: {
        cards,
        usage: {
          promptTokens: completion.usage?.prompt_tokens,
          completionTokens: completion.usage?.completion_tokens,
          totalTokens: completion.usage?.total_tokens,
        },
      },
    });
  } catch (error) {
    console.error('Error generating cards from image:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate cards',
    });
  }
});

// Helper function for mock data
function generateMockCards(topic: string, count: number, difficulty: string): GeneratedCard[] {
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
  ];

  return templates.slice(0, Math.min(count, templates.length)).map((t) => ({
    front: t.front,
    back: t.back,
    cardType: 'flashcard',
  }));
}

export default router;
