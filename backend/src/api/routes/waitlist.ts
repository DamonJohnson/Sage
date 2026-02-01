import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const getSupabase = () => {
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseServiceKey);
};

// POST /api/waitlist - Add email to waitlist
router.post('/', async (req: Request, res: Response) => {
  const { email, source = 'landing_page', referrer } = req.body;

  // Validate email
  if (!email || !email.includes('@')) {
    return res.status(400).json({
      success: false,
      error: 'Valid email is required',
    });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const supabase = getSupabase();

    if (!supabase) {
      console.warn('Supabase not configured, skipping database save');
      // Still trigger webhook if configured
      await triggerMakeWebhook({ email: normalizedEmail, source, referrer });
      return res.json({
        success: true,
        message: 'Added to waitlist',
      });
    }

    // Check if email already exists
    const { data: existing } = await supabase
      .from('waitlist')
      .select('id')
      .eq('email', normalizedEmail)
      .single();

    if (existing) {
      return res.json({
        success: true,
        message: 'Already on waitlist',
        alreadyExists: true,
      });
    }

    // Insert into Supabase
    const { error } = await supabase.from('waitlist').insert({
      email: normalizedEmail,
      source,
      referrer: referrer || null,
    });

    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }

    // Trigger Make webhook for automation (email + Google Sheets backup)
    await triggerMakeWebhook({ email: normalizedEmail, source, referrer });

    res.json({
      success: true,
      message: 'Added to waitlist',
    });
  } catch (error) {
    console.error('Error adding to waitlist:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to join waitlist. Please try again.',
    });
  }
});

// GET /api/waitlist/count - Get waitlist count (for spots remaining display)
router.get('/count', async (_req: Request, res: Response) => {
  try {
    const supabase = getSupabase();

    if (!supabase) {
      // Return mock count if Supabase not configured
      return res.json({
        success: true,
        data: { count: 373, spotsRemaining: 127, totalSpots: 500 },
      });
    }

    const { count, error } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true });

    if (error) {
      throw error;
    }

    const totalSpots = 500;
    const currentCount = count || 0;
    const spotsRemaining = Math.max(0, totalSpots - currentCount);

    res.json({
      success: true,
      data: {
        count: currentCount,
        spotsRemaining,
        totalSpots,
      },
    });
  } catch (error) {
    console.error('Error getting waitlist count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get waitlist count',
    });
  }
});

// Trigger Make webhook for automation
async function triggerMakeWebhook(data: {
  email: string;
  source?: string;
  referrer?: string;
}) {
  const webhookUrl = process.env.MAKE_WEBHOOK_URL;

  if (!webhookUrl) {
    console.log('Make webhook not configured, skipping');
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: data.email,
        source: data.source || 'landing_page',
        referrer: data.referrer || '',
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      console.error('Make webhook failed:', response.status);
    }
  } catch (error) {
    console.error('Error triggering Make webhook:', error);
    // Don't throw - webhook failure shouldn't break the signup
  }
}

export default router;
