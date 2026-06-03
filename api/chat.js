const OpenAI = require('openai');
const admin = require('firebase-admin');

const openaiApiKey = process.env.OPENAI_API_KEY;
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!admin.apps.length && serviceAccount) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccount)),
    });
  } catch {
    // Firebase init failed — will proceed without Firestore
  }
}

function decodeJwtPayload(token) {
  try {
    const payload = token.split('.')[1];
    const decoded = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function respond(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

const ALLOWED_MODELS = ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'];

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return respond(res, 405, { message: 'Method Not Allowed' });
  }

  if (!openaiApiKey) {
    return respond(res, 500, { message: 'OpenAI API key missing from configuration.' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!token) {
    return respond(res, 401, { message: 'Authentication required.' });
  }

  const jwtPayload = decodeJwtPayload(token);
  const uid = jwtPayload?.user_id || jwtPayload?.sub || null;
  const userEmail = jwtPayload?.email || null;

  let body = {};
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString();
    if (raw) body = JSON.parse(raw);
  } catch {
    return respond(res, 400, { message: 'Invalid request body.' });
  }

  const { messages, model: requestedModel = 'gpt-4o-mini' } = body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return respond(res, 400, { message: 'No messages provided.' });
  }

  const model = ALLOWED_MODELS.includes(requestedModel) ? requestedModel : 'gpt-4o-mini';

  // Fetch user's StudyRoad context from Firestore
  let studyContext = 'No saved study roadmap available yet.';
  if (admin.apps.length && uid) {
    try {
      const db = admin.firestore();
      const userDoc = await db.collection('users').doc(uid).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        const plan = data?.plan;
        const profile = data?.planProfile;

        if (plan) {
          const studyDays = plan.study || plan.schedule || plan.roadmap || [];
          const scheduleSummary = Array.isArray(studyDays)
            ? studyDays.map(d => `  - ${d.day}: ${d.label || d.description || 'Study block'}`).join('\n')
            : 'Not available';
          const tips = Array.isArray(plan.tips) ? plan.tips.join(', ') : '';

          studyContext = `
USER STUDY PROFILE:
- Subject: ${profile?.subject || 'not specified'}
- Goal: ${profile?.goal || 'study smarter'}
- Deadline: ${profile?.examDate || profile?.deadline || 'not specified'}
- Available time: ${profile?.studyHours || 'not specified'} hours/week

STUDY ROADMAP:
${scheduleSummary}

ROADMAP SUMMARY:
${plan.summary || 'No summary available.'}

${plan.personalNote ? `PERSONAL NOTE:\n${plan.personalNote}` : ''}

${tips ? `KEY TIPS:\n${tips}` : ''}`.trim();
        }
      }
    } catch {
      // Non-fatal — proceed without saved study context
    }
  }

  const greeting = userEmail ? `The user's email is ${userEmail}.` : '';

  const systemPrompt = `You are a personal AI study coach for StudyRoad. You help users plan study sessions, understand difficult topics, prepare for exams, and stay focused. You may have access to the user's saved study roadmap and profile.

${greeting}

${studyContext}

Be concise, motivating, and practical. When answering questions about the user's plan, refer to the specific details above. If the user asks about a specific study day, topic, deadline, or task, give detailed guidance based on their roadmap. If they ask something outside your knowledge, say so honestly. Always keep your tone supportive, clear, and motivating.`;

  // SSE streaming response
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  try {
    const openai = new OpenAI({ apiKey: openaiApiKey });
    const stream = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.slice(-20),
      ],
      max_tokens: 800,
      temperature: 0.7,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) {
        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch {
    try {
      res.write(`data: ${JSON.stringify({ error: 'Could not reach the AI service. Please try again.' })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } catch {}
  }
};
