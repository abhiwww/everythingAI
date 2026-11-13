import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validation.js';
import { asyncHandler } from '../../middleware/error.js';
import { db } from '../../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../logger.js';

const router = Router();

/** POST /conversations */
router.post(
  '/',
  authenticate,
  [body('title').optional().isString()],
  validate,
  asyncHandler(async (req, res) => {
    const id = uuidv4();
    const customerId = req.user!.id;
    const title = req.body.title || 'New conversation';

    const result = await db().query(
      'INSERT INTO conversations (id, customer_id, title) VALUES ($1, $2, $3) RETURNING id, customer_id, title, created_at, updated_at',
      [id, customerId, title]
    );
    res.status(201).json({ conversation: result.rows[0] });
  })
);

/** GET /conversations/:id */
router.get(
  '/:id',
  authenticate,
  [param('id').isUUID()],
  validate,
  asyncHandler(async (req, res) => {
    const result = await db().query(
      'SELECT * FROM conversations WHERE id = $1 AND customer_id = $2',
      [req.params.id, req.user!.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'not_found', message: 'Conversation not found' });
      return;
    }
    res.json({ conversation: result.rows[0] });
  })
);

/** GET /conversations (list for customer) */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await db().query(
      'SELECT * FROM conversations WHERE customer_id = $1 ORDER BY updated_at DESC LIMIT 50',
      [req.user!.id]
    );
    res.json({ conversations: result.rows });
  })
);

/** POST /conversations/:id/messages */
router.post(
  '/:id/messages',
  authenticate,
  [
    param('id').isUUID(),
    body('content').isString().notEmpty().trim(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const conversationId = req.params.id;
    const customerId = req.user!.id;

    // Verify ownership
    const conv = await db().query(
      'SELECT id FROM conversations WHERE id = $1 AND customer_id = $2',
      [conversationId, customerId]
    );
    if (conv.rows.length === 0) {
      res.status(404).json({ error: 'not_found', message: 'Conversation not found' });
      return;
    }

    const customerMessageId = uuidv4();
    await db().query(
      'INSERT INTO messages (id, conversation_id, role, content, message_type, is_ai_generated) VALUES ($1, $2, $3, $4, $5, $6)',
      [customerMessageId, conversationId, 'customer', req.body.content, 'text', false]
    );

    // Delegate to AI orchestration (imported lazily to avoid circular deps)
    const { orchestrate } = await import('../../modules/ai/orchestrator.js');
    const assistantResponse = await orchestrate({
      conversationId,
      customerId,
      customerMessage: req.body.content,
    });

    await db().query(
      'UPDATE conversations SET updated_at = now() WHERE id = $1',
      [conversationId]
    );

    res.status(201).json({
      customerMessageId,
      assistant: assistantResponse,
    });
  })
);

/** GET /conversations/:id/messages */
router.get(
  '/:id/messages',
  authenticate,
  [param('id').isUUID()],
  validate,
  asyncHandler(async (req, res) => {
    const result = await db().query(
      'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT 100',
      [req.params.id]
    );
    res.json({ messages: result.rows });
  })
);

export default router;
