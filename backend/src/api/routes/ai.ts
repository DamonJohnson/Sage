import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { z } from 'zod';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import { config } from '../../config.js';

const router = Router();

// Configure multer for PDF uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// Lazy initialization of Anthropic Claude client (primary)
let anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic | null {
  if (config.anthropic.apiKey === 'stub-anthropic-api-key') {
    return null;
  }
  if (!anthropic) {
    anthropic = new Anthropic({ apiKey: config.anthropic.apiKey });
  }
  return anthropic;
}

// Lazy initialization of OpenAI client (fallback for vision)
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

// Helper to parse JSON from Claude's response (handles markdown code blocks)
function parseClaudeJSON(content: string): any {
  // Try direct parse first
  try {
    return JSON.parse(content);
  } catch {
    // Try extracting from markdown code block
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }
    // Try finding JSON array or object
    const arrayMatch = content.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      return JSON.parse(arrayMatch[0]);
    }
    const objectMatch = content.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      return JSON.parse(objectMatch[0]);
    }
    throw new Error('Could not parse JSON from response');
  }
}

// Model selection based on complexity
// Note: Using Sonnet for all requests currently as it provides best quality
// Can switch to Haiku ('claude-3-5-haiku-20241022') for simple requests when available
const MODELS = {
  HAIKU: 'claude-sonnet-4-20250514', // Fallback to Sonnet for now
  SONNET: 'claude-sonnet-4-20250514',
};

interface ModelSelectionParams {
  cardCount: number;
  difficulty: string;
  hasCustomInstructions: boolean;
  contentLength?: number;
  isImageBased?: boolean;
}

function selectModel(params: ModelSelectionParams): string {
  // Always use Sonnet for image-based generation (vision quality matters)
  if (params.isImageBased) {
    return MODELS.SONNET;
  }

  // Use Haiku for simple requests
  if (
    (params.difficulty === 'basic' || params.difficulty === 'beginner') &&
    params.cardCount <= 15 &&
    !params.hasCustomInstructions &&
    (!params.contentLength || params.contentLength < 2000)
  ) {
    return MODELS.HAIKU;
  }

  // Use Sonnet for everything else (quality priority)
  return MODELS.SONNET;
}

// Difficulty level definitions with school-level descriptions
const DIFFICULTY_LEVELS = {
  basic: {
    label: 'Basic',
    description: 'Elementary to Middle School level',
    guide: 'Use simple language suitable for ages 10-14. Focus on foundational concepts and basic definitions. Avoid jargon and technical terms. Explain everything clearly.',
  },
  intermediate: {
    label: 'Standard',
    description: 'High School level',
    guide: 'Include moderate complexity suitable for ages 14-18. Cover relationships between concepts and some technical terms with context. Assume basic familiarity with the subject.',
  },
  advanced: {
    label: 'Advanced',
    description: 'University level',
    guide: 'Cover complex relationships, technical language, and deeper analysis suitable for undergraduate students. Assume solid foundational knowledge of the subject.',
  },
  expert: {
    label: 'Expert',
    description: 'Graduate/Professional level',
    guide: 'Include nuanced details, edge cases, and advanced topics suitable for graduate students or professionals. Assume comprehensive prior knowledge and use specialized terminology.',
  },
};

// Map old difficulty names to new ones for backward compatibility
function normalizeDifficulty(difficulty: string): keyof typeof DIFFICULTY_LEVELS {
  const mapping: Record<string, keyof typeof DIFFICULTY_LEVELS> = {
    beginner: 'basic',
    intermediate: 'intermediate',
    advanced: 'advanced',
    basic: 'basic',
    standard: 'intermediate',
    expert: 'expert',
  };
  return mapping[difficulty] || 'intermediate';
}

// Validation schemas
const generateFromTopicSchema = z.object({
  topic: z.string().min(1, 'Topic is required').max(500),
  count: z.number().int().min(1).max(50).default(10),
  difficulty: z.enum(['basic', 'beginner', 'intermediate', 'standard', 'advanced', 'expert']).default('intermediate'),
  customInstructions: z.string().max(500).optional(),
  includeExplanations: z.boolean().optional().default(false),
  multipleChoiceRatio: z.number().min(0).max(1).optional().default(0), // 0 = none, 1 = all multiple choice
  clozeRatio: z.number().min(0).max(1).optional().default(0), // 0 = none, 1 = all cloze
});

const generateFromTextSchema = z.object({
  text: z.string().min(10, 'Text must be at least 10 characters').max(50000),
  count: z.number().int().min(1).max(50).default(10),
  includeExplanations: z.boolean().optional().default(false),
});

interface GeneratedCard {
  front: string;
  back: string;
  explanation?: string | null;
  cardType: 'flashcard' | 'multiple_choice' | 'cloze';
  options?: string[] | null;
  frontImage?: string | null;
  backImage?: string | null;
  imageIndex?: number;
  clozeIndex?: number | null;
}

// POST /api/ai/validate-topic - Validate a topic and return clarifying questions if needed
router.post('/validate-topic', async (req: Request, res: Response) => {
  try {
    const { topic } = req.body;

    if (!topic?.trim()) {
      res.status(400).json({
        success: false,
        error: 'Topic is required',
      });
      return;
    }

    const client = getAnthropic();

    if (!client) {
      // No API key - skip validation
      res.json({
        success: true,
        data: {
          isValid: true,
          needsClarification: false,
        },
      });
      return;
    }

    const systemPrompt = `You are an expert educator. Analyze the given topic and determine if you can create accurate, factual flashcards about it.

Your task:
1. Determine if the topic is clear and specific enough
2. Determine if you have reliable knowledge about this topic
3. If unclear or unfamiliar, suggest 1-2 clarifying questions

Respond with ONLY valid JSON:
{
  "isValid": true/false,
  "needsClarification": true/false,
  "reason": "brief explanation if invalid or needs clarification",
  "questions": ["question 1", "question 2"] // only if needsClarification is true
}

Guidelines:
- If the topic is a well-known subject (history, science, programming, etc.), it's valid
- If the topic seems like personal content, jargon, or very niche, ask for clarification
- If the topic is too vague, ask for more specifics
- If you genuinely don't recognize the topic, be honest and ask what it is`;

    const message = await client.messages.create({
      model: MODELS.HAIKU,
      max_tokens: 500,
      messages: [
        { role: 'user', content: `Topic: "${topic.trim()}"` },
      ],
      system: systemPrompt,
    });

    const content = message.content[0];
    if (content.type !== 'text' || !content.text) {
      res.json({
        success: true,
        data: { isValid: true, needsClarification: false },
      });
      return;
    }

    const parsed = parseClaudeJSON(content.text);

    res.json({
      success: true,
      data: {
        isValid: parsed.isValid !== false,
        needsClarification: parsed.needsClarification === true,
        reason: parsed.reason || null,
        questions: parsed.questions || [],
      },
    });
  } catch (error) {
    console.error('Error validating topic:', error);
    // On error, just allow the generation to proceed
    res.json({
      success: true,
      data: { isValid: true, needsClarification: false },
    });
  }
});

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

    const { topic, count, customInstructions, includeExplanations, multipleChoiceRatio, clozeRatio } = validated.data;
    const difficulty = normalizeDifficulty(validated.data.difficulty);
    const difficultyLevel = DIFFICULTY_LEVELS[difficulty];
    const client = getAnthropic();

    // Calculate how many of each card type to generate
    const mcCount = Math.round(count * (multipleChoiceRatio || 0));
    const clozeCount = Math.round(count * (clozeRatio || 0));
    const flashcardCount = Math.max(0, count - mcCount - clozeCount);

    // If no API key, return mock data
    if (!client) {
      const mockCards = generateMockCards(topic, count, difficulty);
      res.json({ success: true, data: { cards: mockCards, model: 'mock' } });
      return;
    }

    // Select appropriate model based on complexity
    const model = selectModel({
      cardCount: count,
      difficulty,
      hasCustomInstructions: !!customInstructions,
    });

    // Build card type instructions
    let cardTypeInstructions = '';
    const cardTypeParts: string[] = [];

    if (flashcardCount > 0) {
      cardTypeParts.push(`- ${flashcardCount} flashcards (cardType: "flashcard") - standard front/back Q&A`);
    }
    if (mcCount > 0) {
      cardTypeParts.push(`- ${mcCount} multiple choice (cardType: "multiple_choice")`);
    }
    if (clozeCount > 0) {
      cardTypeParts.push(`- ${clozeCount} cloze deletion (cardType: "cloze")`);
    }

    if (cardTypeParts.length > 1 || mcCount > 0 || clozeCount > 0) {
      cardTypeInstructions = `\n## Card Types
Generate a mix of card types:
${cardTypeParts.join('\n')}
`;

      if (mcCount > 0) {
        cardTypeInstructions += `
For multiple choice cards:
- Provide exactly 4 options in the "options" array
- The "back" field should contain the correct answer (must match one of the options exactly)
- Options should be plausible but only one should be correct
- Randomize the position of the correct answer among the options
`;
      }

      if (clozeCount > 0) {
        cardTypeInstructions += `
For cloze deletion cards:
- The "front" field contains the FULL sentence/statement with ONE key term/concept blanked out as [...]
- The "back" field contains ONLY the blanked word/phrase (the answer)
- Each cloze card tests ONE blank - keep it atomic
- Use cloze for definitions, facts within context, fill-in-the-blank style learning
- Example: front: "The mitochondria is the [...] of the cell", back: "powerhouse"
- Include "clozeIndex": 1 for each cloze card
`;
      }
    }

    // Build explanation instructions
    const explanationInstructions = includeExplanations ? `\n## Explanations
For each card, include an "explanation" field with a 1-3 sentence detailed explanation that:
- Provides context, background, or reasoning
- Helps the learner understand WHY the answer is correct
- May include examples, mnemonics, or connections to other concepts
- Is more detailed than the concise answer in "back"` : '';

    // Generate cards using Claude
    const systemPrompt = `You are an expert educator creating flashcards optimized for spaced repetition learning.

## Your Task
Create ${count} flashcards about "${topic}" for ${difficultyLevel.label}-level learners (${difficultyLevel.description}).

## CRITICAL: Accuracy & Fact-Checking
- ONLY include information you are confident is factually accurate
- DO NOT make up dates, names, statistics, or specific details you're unsure about
- If a topic is ambiguous, focus on well-established, widely-accepted facts
- Prefer general principles over specific claims that could be wrong
- For scientific topics, use current scientific consensus
- For historical topics, stick to well-documented events and figures
- NEVER invent quotes, statistics, or research findings
- If you must include numbers/dates, only use ones you're certain about
- When in doubt, phrase answers more generally rather than risk inaccuracy

## Difficulty Level Guidelines
${difficultyLevel.guide}
${cardTypeInstructions}
${explanationInstructions}

## Answer Style (IMPORTANT)
Keep answers CONCISE - optimized for quick recall during study:
- Use 1-2 short sentences maximum for most answers
- Lead with the key fact or definition
- Avoid unnecessary elaboration or filler words
- If more context is needed, put it in the explanation field (if enabled)

## Question Style
- Ask ONE specific, unambiguous question
- Keep under 15 words when possible
- Use clear question starters: "What", "Why", "How", "Define", "Which"
- Avoid yes/no questions
- Frame questions about verifiable, objective facts

## Content Guidelines
- Cover the most important concepts first
- Each card tests ONE atomic concept
- Cards should be self-contained
- Vary question types
- Prioritize foundational, widely-accepted knowledge over obscure details
${customInstructions ? `\n## Custom Instructions\n${customInstructions}` : ''}

## Output Format
Respond with ONLY valid JSON. No markdown, no preamble.
{"cards": [{"front": "question", "back": "concise answer", "cardType": "flashcard"${includeExplanations ? ', "explanation": "detailed explanation"' : ''}${mcCount > 0 ? ', "options": ["opt1", "opt2", "opt3", "opt4"] // only for multiple_choice' : ''}${clozeCount > 0 ? ', "clozeIndex": 1 // only for cloze cards' : ''}}]}`;

    const userPrompt = `Generate ${count} cards about "${topic}" (${difficultyLevel.label} level). Output ONLY valid JSON.`;

    const message = await client.messages.create({
      model,
      max_tokens: 4096,
      messages: [
        { role: 'user', content: userPrompt },
      ],
      system: systemPrompt,
    });

    const content = message.content[0];
    if (content.type !== 'text' || !content.text) {
      res.status(500).json({
        success: false,
        error: 'No response from AI',
      });
      return;
    }

    // Parse the response
    const parsed = parseClaudeJSON(content.text);
    let cards: GeneratedCard[] = (parsed.cards || parsed).map((card: {
      front: string;
      back: string;
      explanation?: string;
      cardType?: string;
      options?: string[];
      clozeIndex?: number;
    }) => {
      let cardType: 'flashcard' | 'multiple_choice' | 'cloze' = 'flashcard';
      if (card.cardType === 'multiple_choice') cardType = 'multiple_choice';
      else if (card.cardType === 'cloze') cardType = 'cloze';

      return {
        front: card.front,
        back: card.back,
        explanation: card.explanation || null,
        cardType,
        options: cardType === 'multiple_choice' && card.options ? card.options : null,
        clozeIndex: cardType === 'cloze' ? (card.clozeIndex || 1) : null,
      };
    });

    // Shuffle cards if it's a mixed deck
    if ((mcCount > 0 || clozeCount > 0) && flashcardCount > 0) {
      // Fisher-Yates shuffle for random ordering
      for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
      }
    }

    res.json({
      success: true,
      data: {
        cards,
        model, // Return model used for transparency
        usage: {
          inputTokens: message.usage?.input_tokens,
          outputTokens: message.usage?.output_tokens,
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
    const client = getAnthropic();

    // If no API key, return mock data
    if (!client) {
      const mockCards = [
        { front: 'Key concept from the text?', back: 'Main idea extracted from provided content.', cardType: 'flashcard' },
        { front: 'What is the main topic?', back: 'The primary subject discussed in the text.', cardType: 'flashcard' },
        { front: 'Who/What is mentioned?', back: 'Important entity from the content.', cardType: 'flashcard' },
      ];
      res.json({ success: true, data: { cards: mockCards.slice(0, count), model: 'mock' } });
      return;
    }

    // Select model based on content length
    const model = selectModel({
      cardCount: count,
      difficulty: 'intermediate',
      hasCustomInstructions: false,
      contentLength: text.length,
    });

    // Generate cards from text using Claude
    const systemPrompt = `You are an expert educator creating flashcards from source material for spaced repetition learning.

## Accuracy Requirements (CRITICAL)
- ONLY use information explicitly stated in the provided text
- DO NOT add external information or make assumptions beyond the text
- DO NOT invent dates, names, statistics, or details not in the source
- If the text is ambiguous, create questions about clearly stated facts only
- Quote or paraphrase directly from the source material

## Card Creation Guidelines
- Extract the most important facts, concepts, and relationships
- Have clear, specific questions on the front
- Have accurate answers derived DIRECTLY from the text
- Use active recall principles
- Are self-contained (don't require seeing the original text to answer)

IMPORTANT: Respond with ONLY a valid JSON object containing a "cards" array. No other text or explanation.`;

    const userPrompt = `Create ${count} flashcards from this text:

${text.substring(0, 15000)}${text.length > 15000 ? '\n\n[Text truncated...]' : ''}

Respond with ONLY valid JSON.`;

    const message = await client.messages.create({
      model,
      max_tokens: 4096,
      messages: [
        { role: 'user', content: userPrompt },
      ],
      system: systemPrompt,
    });

    const content = message.content[0];
    if (content.type !== 'text' || !content.text) {
      res.status(500).json({
        success: false,
        error: 'No response from AI',
      });
      return;
    }

    // Parse the response
    const parsed = parseClaudeJSON(content.text);
    const cards: GeneratedCard[] = (parsed.cards || parsed).map((card: { front: string; back: string }) => ({
      front: card.front,
      back: card.back,
      cardType: 'flashcard',
    }));

    res.json({
      success: true,
      data: {
        cards,
        model,
        usage: {
          inputTokens: message.usage?.input_tokens,
          outputTokens: message.usage?.output_tokens,
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

    const client = getAnthropic();

    if (!client) {
      const mockCards = generateMockCards(`Content from ${filename || 'PDF'}`, count, 'intermediate');
      res.json({ success: true, data: { cards: mockCards, model: 'mock' } });
      return;
    }

    // Select model based on content length
    const model = selectModel({
      cardCount: count,
      difficulty: 'intermediate',
      hasCustomInstructions: false,
      contentLength: extractedText.length,
    });

    const systemPrompt = `You are an expert educator creating flashcards from document content.

## Accuracy Requirements (CRITICAL)
- ONLY use information explicitly stated in the PDF content
- DO NOT add external information, assumptions, or embellishments
- DO NOT invent dates, names, statistics, or details not in the document
- If content is unclear, focus only on clearly stated facts
- Answers must be directly traceable to the source text

## Card Creation Guidelines
- Cover all key concepts, definitions, and important facts
- Have clear, testable questions
- Include context where necessary
- Are appropriate for study and review

IMPORTANT: Respond with ONLY a valid JSON object containing a "cards" array. No other text or explanation.`;

    const userPrompt = `Create ${count} flashcards from this PDF content${filename ? ` (${filename})` : ''}:

${extractedText.substring(0, 20000)}${extractedText.length > 20000 ? '\n\n[Content truncated...]' : ''}

Respond with ONLY valid JSON.`;

    const message = await client.messages.create({
      model,
      max_tokens: 4096,
      messages: [
        { role: 'user', content: userPrompt },
      ],
      system: systemPrompt,
    });

    const content = message.content[0];
    if (content.type !== 'text' || !content.text) {
      res.status(500).json({
        success: false,
        error: 'No response from AI',
      });
      return;
    }

    const parsed = parseClaudeJSON(content.text);
    const cards: GeneratedCard[] = (parsed.cards || parsed).map((card: { front: string; back: string }) => ({
      front: card.front,
      back: card.back,
      cardType: 'flashcard',
    }));

    res.json({
      success: true,
      data: {
        cards,
        model,
        usage: {
          inputTokens: message.usage?.input_tokens,
          outputTokens: message.usage?.output_tokens,
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

// POST /api/ai/upload-pdf - Upload PDF, extract text, and generate cards
router.post('/upload-pdf', upload.single('pdf'), async (req: Request, res: Response) => {
  console.log('upload-pdf endpoint hit');
  console.log('req.file:', req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'undefined');
  console.log('req.body:', req.body);

  try {
    if (!req.file) {
      console.log('No file in request');
      res.status(400).json({
        success: false,
        error: 'No PDF file uploaded',
      });
      return;
    }

    const filename = req.file.originalname;
    const customInstructions = req.body.customInstructions?.trim() || '';
    const multipleChoiceRatio = parseFloat(req.body.multipleChoiceRatio) || 0;

    console.log(`Processing PDF: ${filename} (${req.file.size} bytes)`);

    // Extract text from PDF using pdf-parse
    let extractedText: string;
    try {
      const pdfData = await pdfParse(req.file.buffer);
      extractedText = pdfData.text;
      console.log(`Extracted ${extractedText.length} characters from PDF`);

      if (!extractedText.trim()) {
        res.status(400).json({
          success: false,
          error: 'Could not extract text from PDF. The file may be image-based or empty.',
        });
        return;
      }
    } catch (pdfError) {
      console.error('PDF extraction error:', pdfError);
      res.status(400).json({
        success: false,
        error: 'Failed to read PDF file. Please ensure it is a valid PDF.',
      });
      return;
    }

    const client = getAnthropic();

    // If no API key, return mock data
    if (!client) {
      const mockCards = generateMockCards(`Content from ${filename}`, 10, 'intermediate');
      res.json({
        success: true,
        data: {
          cards: mockCards,
          extractedText: extractedText.substring(0, 500) + '...',
          filename,
        },
      });
      return;
    }

    // Select model based on content length
    const model = selectModel({
      cardCount: 20, // Estimate
      difficulty: 'intermediate',
      hasCustomInstructions: !!customInstructions,
      contentLength: extractedText.length,
    });

    // Build card type instructions
    let cardTypeInstructions = '';
    if (multipleChoiceRatio > 0 && multipleChoiceRatio < 1) {
      cardTypeInstructions = `
## Card Types
Generate a mix of card types based on the content:
- Approximately ${Math.round((1 - multipleChoiceRatio) * 100)}% flashcards (cardType: "flashcard")
- Approximately ${Math.round(multipleChoiceRatio * 100)}% multiple choice cards (cardType: "multiple_choice")

For multiple choice cards:
- Provide exactly 4 options in the "options" array
- The "back" field should contain the correct answer (must match one of the options exactly)
- Options should be plausible but only one should be correct
- Randomize the position of the correct answer among the options`;
    } else if (multipleChoiceRatio === 1) {
      cardTypeInstructions = `
## Card Type
All cards should be multiple choice (cardType: "multiple_choice"):
- Provide exactly 4 options in the "options" array
- The "back" field should contain the correct answer (must match one of the options exactly)
- Options should be plausible but only one should be correct`;
    }

    // Generate cards using Claude with optimized prompt
    const systemPrompt = `You are an expert educator creating flashcards optimized for spaced repetition learning from document content.

## Your Task
Extract the most important, testable information from this PDF document and create high-quality study cards.

## CRITICAL: Accuracy & Content Extraction
- ONLY create cards for information explicitly stated in the document
- DO NOT make up or infer facts, dates, or details not present
- Focus on high-yield, important information
- Skip trivial details, filler content, and non-educational material

## Card Count Guidelines
- Automatically determine card count based on content density
- Roughly 1 card per important concept, definition, or key fact
- Quality over quantity - every card should test meaningful knowledge
- Typical range: 5-50 cards depending on document length
${cardTypeInstructions}

## Question Style (Front of Card)
- Ask ONE specific, unambiguous question per card
- Keep questions under 15 words when possible
- Use clear question starters: "What", "Why", "How", "Define", "Which"
- Avoid yes/no questions - they're poor for learning

## Answer Style (Back of Card)
- Keep answers CONCISE - 1-2 sentences maximum
- Lead with the key fact or definition
- Avoid unnecessary elaboration
- Use exact terminology from the document

## Content Selection Priority
1. Definitions of key terms and concepts
2. Important facts, dates, names, and figures
3. Cause-and-effect relationships
4. Processes and procedures
5. Comparisons and contrasts
6. Key examples that illustrate concepts
${customInstructions ? `\n## Custom Instructions\n${customInstructions}` : ''}

## Output Format
Return ONLY valid JSON:
{"cards": [{"front": "question", "back": "answer", "cardType": "flashcard"${multipleChoiceRatio > 0 ? ', "options": ["opt1", "opt2", "opt3", "opt4"]' : ''}}]}`;

    // Truncate text intelligently - prioritize beginning and spread samples from rest
    let contentToSend = extractedText;
    if (extractedText.length > 25000) {
      // Take first 15000 chars (likely intro/important content) + samples from rest
      const firstPart = extractedText.substring(0, 15000);
      const restLength = extractedText.length - 15000;
      const middlePart = extractedText.substring(15000 + Math.floor(restLength * 0.25), 15000 + Math.floor(restLength * 0.25) + 5000);
      const endPart = extractedText.substring(extractedText.length - 5000);
      contentToSend = `${firstPart}\n\n[...middle section sample...]\n\n${middlePart}\n\n[...end section sample...]\n\n${endPart}`;
    }

    const userPrompt = `Create high-quality study cards from this PDF document titled "${filename}".

Document Content:
---
${contentToSend}
---

Analyze the content and create an appropriate number of cards covering the most important concepts. Determine the difficulty level based on the content complexity. Output ONLY valid JSON.`;

    // Use higher max tokens since we don't know exact card count
    const maxTokens = 8192;

    const message = await client.messages.create({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: 'user', content: userPrompt },
      ],
      system: systemPrompt,
    });

    const content = message.content[0];
    if (content.type !== 'text' || !content.text) {
      res.status(500).json({
        success: false,
        error: 'No response from AI',
      });
      return;
    }

    const parsed = parseClaudeJSON(content.text);
    let cards: GeneratedCard[] = (parsed.cards || parsed).map((card: {
      front: string;
      back: string;
      cardType?: string;
      options?: string[];
    }) => ({
      front: card.front,
      back: card.back,
      cardType: (card.cardType === 'multiple_choice' ? 'multiple_choice' : 'flashcard') as 'flashcard' | 'multiple_choice',
      options: card.cardType === 'multiple_choice' && card.options ? card.options : null,
      explanation: null,
    }));

    // Shuffle cards if it's a mixed deck (both flashcards and multiple choice)
    if (multipleChoiceRatio > 0 && multipleChoiceRatio < 1) {
      for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
      }
    }

    res.json({
      success: true,
      data: {
        cards,
        model,
        filename,
        pageCount: extractedText.split('\f').length, // Approximate page count
        characterCount: extractedText.length,
        usage: {
          inputTokens: message.usage?.input_tokens,
          outputTokens: message.usage?.output_tokens,
        },
      },
    });
  } catch (error) {
    console.error('Error processing PDF upload:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process PDF',
    });
  }
});

// POST /api/ai/generate-from-image - Generate cards from images (using vision)
router.post('/generate-from-image', async (req: Request, res: Response) => {
  try {
    const { images, customInstructions, multipleChoiceRatio = 0, includeImageOnQuestion = false } = req.body;

    // Support both single image (legacy) and multiple images
    const imageArray: string[] = Array.isArray(images) ? images : (req.body.imageBase64 ? [req.body.imageBase64] : []);

    if (!imageArray.length) {
      res.status(400).json({
        success: false,
        error: 'At least one image is required',
      });
      return;
    }

    if (imageArray.length > 10) {
      res.status(400).json({
        success: false,
        error: 'Maximum 10 images allowed per request',
      });
      return;
    }

    const client = getAnthropic();

    if (!client) {
      const mockCards = generateMockCards('Image content', 5, 'intermediate');
      res.json({ success: true, data: { cards: mockCards } });
      return;
    }

    // Helper to prepare image for Claude
    const prepareImageForClaude = (imageBase64: string): { mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'; data: string } => {
      let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg';
      let base64Data = imageBase64;

      if (imageBase64.startsWith('data:')) {
        const match = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
        if (match) {
          mediaType = match[1] as typeof mediaType;
          base64Data = match[2];
        }
      }

      return { mediaType, data: base64Data };
    };

    // Always use Sonnet for image-based generation
    const model = MODELS.SONNET;

    // Build card type instructions
    let cardTypeInstructions = '';
    if (multipleChoiceRatio > 0 && multipleChoiceRatio < 1) {
      cardTypeInstructions = `
## Card Types
Generate a mix of card types:
- Approximately ${Math.round((1 - multipleChoiceRatio) * 100)}% flashcards (cardType: "flashcard")
- Approximately ${Math.round(multipleChoiceRatio * 100)}% multiple choice (cardType: "multiple_choice")

For multiple choice cards:
- Provide exactly 4 options in the "options" array
- The "back" field should contain the correct answer (must match one of the options exactly)
- Options should be plausible but only one should be correct`;
    } else if (multipleChoiceRatio === 1) {
      cardTypeInstructions = `
## Card Type
All cards should be multiple choice (cardType: "multiple_choice"):
- Provide exactly 4 options in the "options" array
- The "back" field should contain the correct answer (must match one of the options exactly)
- Options should be plausible but only one should be correct`;
    }

    const imageCountText = imageArray.length === 1 ? 'this image' : `these ${imageArray.length} images`;

    const systemPrompt = `You are an expert educator creating flashcards optimized for spaced repetition learning from visual content.

## Your Task
Analyze ${imageCountText} and create high-quality study cards based on what you see.

## CRITICAL: Accuracy & Visual Extraction
- ONLY create cards for information clearly visible in the image(s)
- DO NOT make up facts, dates, names, or details not present
- If text is partially visible or unclear, skip it rather than guess
- For diagrams with labels, create cards testing each labeled part

## What to Extract (Priority Order)
1. Labeled diagrams - test identification of each labeled part
2. Text content, definitions, and key terms visible
3. Charts, graphs, and their key data points
4. Formulas, equations, and their meanings
5. Processes, sequences, or step-by-step content
6. Relationships and connections shown visually
${cardTypeInstructions}

## Question Style (Front of Card)
- Ask ONE specific, unambiguous question per card
- Keep questions under 15 words when possible
- Use clear question starters: "What", "Identify", "Define", "Which", "Where"
- For diagrams: "What structure is labeled X?" or "Identify the highlighted region"

## Answer Style (Back of Card)
- Keep answers CONCISE - 1-2 sentences maximum
- Lead with the key identification or fact
- Use exact terminology shown in the image

## Card Quality Guidelines
- Each card tests ONE atomic concept
- Cards should be self-contained
- Create 5-20 cards per image depending on content density
${customInstructions ? `\n## Custom Instructions\n${customInstructions}` : ''}

## Image References
For EACH card, include "imageIndex" (0-based) indicating which source image the card relates to.

## Output Format
Return ONLY valid JSON:
{"cards": [{"front": "question", "back": "answer", "cardType": "flashcard", "imageIndex": 0${multipleChoiceRatio > 0 ? ', "options": ["opt1", "opt2", "opt3", "opt4"]' : ''}}]}`;

    // Prepare image content blocks
    const imageContentBlocks: Array<{ type: 'image'; source: { type: 'base64'; media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'; data: string } }> = [];
    for (const imageBase64 of imageArray) {
      const { mediaType, data } = prepareImageForClaude(imageBase64);
      imageContentBlocks.push({
        type: 'image',
        source: { type: 'base64', media_type: mediaType, data },
      });
    }

    const message = await client.messages.create({
      model,
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: [
            ...imageContentBlocks,
            { type: 'text', text: `Create flashcards from ${imageCountText}. Output ONLY valid JSON.` },
          ],
        },
      ],
      system: systemPrompt,
    });

    const content = message.content[0];
    if (content.type !== 'text' || !content.text) {
      res.status(500).json({
        success: false,
        error: 'No response from AI',
      });
      return;
    }

    const parsed = parseClaudeJSON(content.text);

    // Map cards and include imageIndex for frontend to use
    let cards = (parsed.cards || parsed).map((card: {
      front: string;
      back: string;
      cardType?: string;
      options?: string[];
      imageIndex?: number;
    }) => ({
      front: card.front,
      back: card.back,
      cardType: (card.cardType === 'multiple_choice' ? 'multiple_choice' : 'flashcard') as 'flashcard' | 'multiple_choice',
      options: card.cardType === 'multiple_choice' && card.options ? card.options : null,
      explanation: null,
      imageIndex: typeof card.imageIndex === 'number' ? card.imageIndex : 0,
    }));

    // Shuffle cards if it's a mixed deck
    if (multipleChoiceRatio > 0 && multipleChoiceRatio < 1) {
      for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
      }
    }

    res.json({
      success: true,
      data: {
        cards,
        model,
        imageCount: imageArray.length,
        usage: {
          inputTokens: message.usage?.input_tokens,
          outputTokens: message.usage?.output_tokens,
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

// POST /api/ai/refine-cards - Refine/modify a set of cards based on instructions
router.post('/refine-cards', async (req: Request, res: Response) => {
  try {
    const { cards, instructions } = req.body;

    if (!cards || !Array.isArray(cards) || cards.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Cards array is required',
      });
      return;
    }

    if (!instructions?.trim()) {
      res.status(400).json({
        success: false,
        error: 'Instructions are required',
      });
      return;
    }

    const client = getAnthropic();

    if (!client) {
      // Return original cards with mock modification
      res.json({
        success: true,
        data: {
          cards: cards.map((card: { front: string; back: string }) => ({
            front: card.front,
            back: card.back + ' (refined)',
            cardType: 'flashcard',
          })),
          model: 'mock',
        },
      });
      return;
    }

    // Use Sonnet for refinement (quality matters)
    const model = MODELS.SONNET;

    const systemPrompt = `You are an expert educator refining flashcards. Your task is to modify the provided flashcards according to the user's instructions while maintaining quality.

## Accuracy Requirements (CRITICAL)
- DO NOT change factual information unless the user specifically asks for corrections
- If simplifying, ensure the core facts remain accurate
- DO NOT add new information or claims that weren't in the original
- If you spot an error in the original, flag it but don't silently "fix" facts

## Refinement Guidelines
- Preserve the core content unless the instructions ask you to change it
- Maintain clear, testable questions on the front
- Keep answers accurate and appropriately concise
- Apply the instructions consistently across all cards
- Return ALL cards, even if some didn't need changes

IMPORTANT: Respond with ONLY a valid JSON object containing a "cards" array. No other text or explanation.`;

    const cardsJson = JSON.stringify(cards.map((c: { front: string; back: string }) => ({
      front: c.front,
      back: c.back,
    })));

    const userPrompt = `Here are the flashcards to refine:
${cardsJson}

Instructions: ${instructions.trim()}

Apply the instructions to refine these cards. Return ONLY valid JSON with ALL cards (modified as needed).`;

    const message = await client.messages.create({
      model,
      max_tokens: 4096,
      messages: [
        { role: 'user', content: userPrompt },
      ],
      system: systemPrompt,
    });

    const content = message.content[0];
    if (content.type !== 'text' || !content.text) {
      res.status(500).json({
        success: false,
        error: 'No response from AI',
      });
      return;
    }

    const parsed = parseClaudeJSON(content.text);
    const refinedCards: GeneratedCard[] = (parsed.cards || parsed).map((card: { front: string; back: string }) => ({
      front: card.front,
      back: card.back,
      cardType: 'flashcard',
    }));

    res.json({
      success: true,
      data: {
        cards: refinedCards,
        model,
        usage: {
          inputTokens: message.usage?.input_tokens,
          outputTokens: message.usage?.output_tokens,
        },
      },
    });
  } catch (error) {
    console.error('Error refining cards:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to refine cards',
    });
  }
});

// POST /api/ai/improve-card - Improve a single card based on instructions
router.post('/improve-card', async (req: Request, res: Response) => {
  try {
    const { front, back, instruction } = req.body;

    if (!front && !back) {
      res.status(400).json({
        success: false,
        error: 'Card front or back is required',
      });
      return;
    }

    if (!instruction?.trim()) {
      res.status(400).json({
        success: false,
        error: 'Instruction is required',
      });
      return;
    }

    const client = getAnthropic();

    if (!client) {
      // Return card with mock improvement
      res.json({
        success: true,
        data: {
          front: front || '',
          back: (back || '') + ' (improved)',
          model: 'mock',
        },
      });
      return;
    }

    // Use Haiku for single card improvements (fast, simple task)
    const model = MODELS.HAIKU;

    const systemPrompt = `You are an expert educator improving a single flashcard. Apply the user's instruction to improve the card.

## Accuracy Requirements (CRITICAL)
- DO NOT change or invent factual information
- If the original card has specific facts (dates, names, numbers), preserve them exactly
- Only add information you are confident is accurate
- If adding examples, use well-known, verifiable examples
- When simplifying, don't lose accuracy for brevity

## Improvement Guidelines
- For "Improve question": Make the front clearer, more specific, and better for testing recall
- For "Improve answer": Make the back more complete and accurate (don't add unverified facts)
- For "Simplify": Use simpler language while preserving all facts
- For "Add example": Include ONLY well-known, verifiable examples
- For custom instructions: Follow them precisely while maintaining accuracy

IMPORTANT: Respond with ONLY a valid JSON object: {"front": "...", "back": "..."}`;

    const userPrompt = `Current card:
Front: ${front || '(empty)'}
Back: ${back || '(empty)'}

Instruction: ${instruction.trim()}

Return the improved card as JSON.`;

    const message = await client.messages.create({
      model,
      max_tokens: 1024,
      messages: [
        { role: 'user', content: userPrompt },
      ],
      system: systemPrompt,
    });

    const content = message.content[0];
    if (content.type !== 'text' || !content.text) {
      res.status(500).json({
        success: false,
        error: 'No response from AI',
      });
      return;
    }

    const parsed = parseClaudeJSON(content.text);

    res.json({
      success: true,
      data: {
        front: parsed.front || front,
        back: parsed.back || back,
        model,
        usage: {
          inputTokens: message.usage?.input_tokens,
          outputTokens: message.usage?.output_tokens,
        },
      },
    });
  } catch (error) {
    console.error('Error improving card:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to improve card',
    });
  }
});

// POST /api/ai/convert-to-multiple-choice - Convert a flashcard to multiple choice
router.post('/convert-to-multiple-choice', async (req: Request, res: Response) => {
  try {
    const { front, back } = req.body;

    if (!front?.trim()) {
      res.status(400).json({
        success: false,
        error: 'Card front (question) is required',
      });
      return;
    }

    if (!back?.trim()) {
      res.status(400).json({
        success: false,
        error: 'Card back (answer) is required',
      });
      return;
    }

    const client = getAnthropic();

    if (!client) {
      // Return mock multiple choice conversion
      res.json({
        success: true,
        data: {
          front,
          back,
          cardType: 'multiple_choice',
          options: [back, 'Option B', 'Option C', 'Option D'],
          model: 'mock',
        },
      });
      return;
    }

    // Use Haiku for fast conversion
    const model = MODELS.HAIKU;

    const systemPrompt = `You are an expert educator converting a flashcard into a multiple choice question.

## Task
Given a flashcard with a question (front) and correct answer (back), generate 3 plausible but INCORRECT options to create a 4-option multiple choice question.

## Requirements for Wrong Options
- Make wrong options plausible and educational (not obviously wrong)
- Wrong options should test common misconceptions or related but incorrect concepts
- All options should be similar in length and style
- Avoid obviously wrong answers (like "None of the above" or joke answers)
- Wrong options should NOT be correct or partially correct

## Response Format
Return ONLY a valid JSON object:
{
  "front": "the question (can be rephrased slightly to work better as multiple choice)",
  "back": "the correct answer",
  "options": ["correct answer", "wrong option 1", "wrong option 2", "wrong option 3"]
}

IMPORTANT: The correct answer MUST be the first option in the array. It will be shuffled on the client side.`;

    const userPrompt = `Convert this flashcard to multiple choice:

Question: ${front.trim()}
Correct Answer: ${back.trim()}

Generate 3 plausible wrong options and return as JSON.`;

    const message = await client.messages.create({
      model,
      max_tokens: 512,
      messages: [
        { role: 'user', content: userPrompt },
      ],
      system: systemPrompt,
    });

    const content = message.content[0];
    if (content.type !== 'text' || !content.text) {
      res.status(500).json({
        success: false,
        error: 'No response from AI',
      });
      return;
    }

    const parsed = parseClaudeJSON(content.text);

    res.json({
      success: true,
      data: {
        front: parsed.front || front,
        back: parsed.back || back,
        cardType: 'multiple_choice',
        options: parsed.options || [back, 'Option B', 'Option C', 'Option D'],
        model,
      },
    });
  } catch (error) {
    console.error('Error converting to multiple choice:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to convert to multiple choice',
    });
  }
});

// POST /api/ai/explain-concept - Get detailed explanation for a card concept
router.post('/explain-concept', async (req: Request, res: Response) => {
  try {
    const { question, answer, followUpQuestion } = req.body;

    if (!question && !answer) {
      res.status(400).json({
        success: false,
        error: 'Question or answer is required',
      });
      return;
    }

    const client = getAnthropic();

    if (!client) {
      res.json({
        success: true,
        data: {
          explanation: 'This is a detailed explanation of the concept. In a production environment, this would be generated by AI.',
          model: 'mock',
        },
      });
      return;
    }

    const isFollowUp = !!followUpQuestion?.trim();

    const systemPrompt = isFollowUp
      ? `You are a concise tutor answering a follow-up question.

Original flashcard:
Q: "${question || 'N/A'}"
A: "${answer || 'N/A'}"

Answer the follow-up question directly in 1-2 short paragraphs.
Rules: Be accurate, NO markdown formatting, plain text only.`
      : `You are a concise tutor explaining a flashcard concept.

Flashcard:
Q: "${question || 'N/A'}"
A: "${answer || 'N/A'}"

Give a helpful explanation in 2-3 short paragraphs covering:
- Why this answer is correct
- Key context or examples
- One common misconception

Rules:
- Be accurate and factual
- NO markdown formatting - plain text only
- Keep it concise but educational`;

    const userPrompt = isFollowUp
      ? `Student's follow-up question: ${followUpQuestion.trim()}`
      : `Please explain this concept in detail.`;

    const message = await client.messages.create({
      model: MODELS.HAIKU, // Use Haiku for faster responses
      max_tokens: 800,
      messages: [
        { role: 'user', content: userPrompt },
      ],
      system: systemPrompt,
    });

    const content = message.content[0];
    if (content.type !== 'text' || !content.text) {
      res.status(500).json({
        success: false,
        error: 'No response from AI',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        explanation: content.text,
        model: MODELS.SONNET,
        usage: {
          inputTokens: message.usage?.input_tokens,
          outputTokens: message.usage?.output_tokens,
        },
      },
    });
  } catch (error) {
    console.error('Error explaining concept:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to explain concept',
    });
  }
});

// POST /api/ai/generate-from-concept - Generate cards from an existing concept
router.post('/generate-from-concept', async (req: Request, res: Response) => {
  try {
    const { sourceQuestion, sourceAnswer, focusArea, count = 3 } = req.body;

    if (!sourceQuestion || !sourceAnswer) {
      res.status(400).json({
        success: false,
        error: 'Source question and answer are required',
      });
      return;
    }

    const cardCount = Math.min(Math.max(parseInt(count, 10) || 3, 1), 20);
    const client = getAnthropic();

    if (!client) {
      // Return mock cards if no API key
      const mockCards = Array.from({ length: cardCount }, (_, i) => ({
        front: `Question ${i + 1} about: ${focusArea || sourceQuestion}`,
        back: `Answer ${i + 1} related to the concept.`,
        cardType: 'flashcard',
      }));
      res.json({
        success: true,
        data: { cards: mockCards, model: 'mock' },
      });
      return;
    }

    const systemPrompt = `You are an expert educator creating flashcards to help students learn.

The student is studying this concept:
Original Question: "${sourceQuestion}"
Original Answer: "${sourceAnswer}"

They want ${cardCount} new flashcard(s) focusing on: "${focusArea || 'General overview of this concept'}"

Create ${cardCount} high-quality flashcards that:
- Explore different aspects of this concept based on the focus area
- Have clear, specific questions
- Have accurate, educational answers
- Don't duplicate the original question
- Are factually accurate (don't make up information)

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{"cards":[{"front":"question text","back":"answer text","cardType":"flashcard"}]}`;

    const message = await client.messages.create({
      model: MODELS.HAIKU,
      max_tokens: 1500,
      messages: [
        { role: 'user', content: `Generate ${cardCount} flashcards as specified.` },
      ],
      system: systemPrompt,
    });

    const content = message.content[0];
    if (content.type !== 'text' || !content.text) {
      res.status(500).json({
        success: false,
        error: 'No response from AI',
      });
      return;
    }

    // Parse the JSON response
    let cards: GeneratedCard[];
    try {
      const parsed = JSON.parse(content.text.trim());
      cards = parsed.cards || [];
    } catch (parseError) {
      // Try to extract JSON from the response
      const jsonMatch = content.text.match(/\{[\s\S]*"cards"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        cards = parsed.cards || [];
      } else {
        throw new Error('Failed to parse AI response');
      }
    }

    res.json({
      success: true,
      data: {
        cards,
        model: MODELS.HAIKU,
        usage: {
          inputTokens: message.usage?.input_tokens,
          outputTokens: message.usage?.output_tokens,
        },
      },
    });
  } catch (error) {
    console.error('Error generating cards from concept:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate cards',
    });
  }
});

// POST /api/ai/extract-occlusion-label - Extract label from an occluded region using vision
router.post('/extract-occlusion-label', async (req: Request, res: Response) => {
  try {
    const { imageBase64, occlusionRegion } = req.body;

    if (!imageBase64) {
      res.status(400).json({
        success: false,
        error: 'Image is required',
      });
      return;
    }

    if (!occlusionRegion || typeof occlusionRegion.x !== 'number') {
      res.status(400).json({
        success: false,
        error: 'Occlusion region is required (x, y, width, height as percentages)',
      });
      return;
    }

    const client = getAnthropic();

    if (!client) {
      // Return mock label if no API key
      res.json({
        success: true,
        data: {
          label: 'Sample Label',
          confidence: 'low' as const,
        },
      });
      return;
    }

    // Prepare image for Claude
    let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg';
    let base64Data = imageBase64;

    if (imageBase64.startsWith('data:')) {
      const match = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        mediaType = match[1] as typeof mediaType;
        base64Data = match[2];
      }
    }

    const { x, y, width, height } = occlusionRegion;

    const systemPrompt = `You are an expert at analyzing images and identifying text or concepts within specific regions.

## Task
Look at the highlighted region of the image (approximately at position ${x.toFixed(1)}%, ${y.toFixed(1)}% with size ${width.toFixed(1)}% x ${height.toFixed(1)}% of the image).

Your goal is to identify what text, label, or concept appears in or near that region.

## Guidelines
- If there's text in the region, extract it exactly as written
- If there's a labeled part of a diagram, identify what it represents
- If it's an anatomical, scientific, or technical diagram, use the correct terminology
- Keep the label concise (1-5 words typically)
- If you can't identify anything meaningful, respond with an empty label

## Response Format
Return ONLY valid JSON:
{"label": "the identified text or concept", "confidence": "high" | "medium" | "low"}

Confidence levels:
- high: Clear text or well-known labeled element
- medium: Somewhat visible or context-dependent
- low: Unclear or making an educated guess`;

    const message = await client.messages.create({
      model: MODELS.HAIKU, // Use Haiku for fast, simple extraction
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64Data },
            },
            {
              type: 'text',
              text: `What text or label is in the region at approximately (${x.toFixed(1)}%, ${y.toFixed(1)}%) with size (${width.toFixed(1)}% x ${height.toFixed(1)}%)? Return JSON only.`,
            },
          ],
        },
      ],
      system: systemPrompt,
    });

    const content = message.content[0];
    if (content.type !== 'text' || !content.text) {
      res.json({
        success: true,
        data: { label: '', confidence: 'low' as const },
      });
      return;
    }

    const parsed = parseClaudeJSON(content.text);

    res.json({
      success: true,
      data: {
        label: parsed.label || '',
        confidence: parsed.confidence || 'low',
      },
    });
  } catch (error) {
    console.error('Error extracting occlusion label:', error);
    // On error, return empty label (non-blocking)
    res.json({
      success: true,
      data: { label: '', confidence: 'low' as const },
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
