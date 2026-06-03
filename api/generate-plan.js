const OpenAI = require('openai');
const admin = require('firebase-admin');

const openaiApiKey = process.env.OPENAI_API_KEY;
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

// Initialize Firebase Admin (shared across invocations)
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

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return respond(res, 405, { message: 'Method Not Allowed' });
  }

  if (!openaiApiKey) {
    return respond(res, 500, { message: 'OpenAI API key missing from configuration.' });
  }

  // Auth
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!token) {
    return respond(res, 401, { message: 'Authentication required.' });
  }

  const jwtPayload = decodeJwtPayload(token);
  const uid = jwtPayload?.user_id || jwtPayload?.sub || null;
  if (!uid) {
    return respond(res, 401, { message: 'Invalid token.' });
  }

  // Parse body
  let body = {};
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString();
    if (raw) body = JSON.parse(raw);
  } catch {
    return respond(res, 400, { message: 'Invalid request body.' });
  }

  const {
    goal, activityLevel, gender, age, weight, height,
    workoutFrequency, workoutTime, workoutDuration, workoutSplit,
    skipLegs, dietaryPreference, currentDiet, extraInfo,
  } = body;

  if (!goal || !activityLevel || !gender || !age || !weight || !height) {
    return respond(res, 400, { message: 'Missing required fields: goal, activityLevel, gender, age, weight, height.' });
  }

  // ─── Calculate BMR (Mifflin-St Jeor) and TDEE ───
  const bmrMale = 10 * weight + 6.25 * height - 5 * age + 5;
  const bmrFemale = 10 * weight + 6.25 * height - 5 * age - 161;
  const bmr = gender === 'male' ? bmrMale : gender === 'female' ? bmrFemale : (bmrMale + bmrFemale) / 2;

  const activityMultipliers = {
    'sedentary': 1.2,
    'lightly-active': 1.375,
    'moderately-active': 1.55,
    'very-active': 1.725,
    'athlete': 1.9,
  };
  const tdee = Math.round(bmr * (activityMultipliers[activityLevel] || 1.55));

  const goalAdjustments = {
    'lose-weight': -400,
    'build-muscle': 300,
    'get-fitter': 0,
    'boost-endurance': -100,
  };
  const targetCalories = tdee + (goalAdjustments[goal] || 0);

  // ─── Macro targets ───
  const proteinTarget = goal === 'build-muscle' ? Math.round(weight * 2.2) : Math.round(weight * 1.6);
  const fatTarget = Math.round(targetCalories * 0.25 / 9); // ~25% of cals from fat
  const carbTarget = Math.round((targetCalories - proteinTarget * 4 - fatTarget * 9) / 4);

  // ─── Goal description ───
  const goalDescriptions = {
    'lose-weight': 'fat loss with a caloric deficit, focusing on cardio and compound movements, high protein to preserve muscle',
    'build-muscle': 'muscle hypertrophy with a caloric surplus, focusing on progressive overload and strength training, high protein intake',
    'get-fitter': 'overall fitness improvement with balanced cardio and strength, moderate calorie intake',
    'boost-endurance': 'cardiovascular endurance with a slight deficit, focusing on aerobic training, balanced macros',
  };
  const goalDesc = goalDescriptions[goal] || 'overall fitness improvement';

  // ─── Workout split mapping ───
  const splitDescriptions = {
    'push-pull-legs': 'Push/Pull/Legs split — push days (chest, shoulders, triceps), pull days (back, biceps), leg days (quads, hamstrings, glutes, calves). Rotate across the week.',
    'arnold-split': 'Arnold split — Day A: chest + back, Day B: shoulders + arms, Day C: legs. Emphasize supersets and high volume.',
    'upper-lower': 'Upper/Lower split — alternate upper-body days (chest, back, shoulders, arms) and lower-body days (quads, hamstrings, glutes, calves).',
    'full-body': 'Full Body — each session trains all major muscle groups with compound lifts. Great for moderate frequency.',
    'bro-split': 'Bro split — dedicate each day to one muscle group: chest, back, shoulders, arms, legs. High volume per muscle.',
  };
  const splitDesc = splitDescriptions[workoutSplit] || 'a balanced training split appropriate for the user\'s frequency';

  // ─── Build contextual flags ───
  const freqDays = parseInt(workoutFrequency) || 4;
  const sessionMin = parseInt(workoutDuration) || 60;
  const skipLegsFlag = skipLegs === true;
  const hasCurrentDiet = currentDiet && typeof currentDiet === 'string' && currentDiet.trim().length > 0;
  const hasDietPref = dietaryPreference && dietaryPreference !== 'no-preference';
  const hasExtraInfo = extraInfo && typeof extraInfo === 'string' && extraInfo.trim().length > 0;

  // ─── System prompt ───
  const systemPrompt = `You are an elite-level personal trainer and sports nutritionist creating a deeply personalized, world-class fitness and nutrition plan. Return ONLY valid JSON (no markdown, no backticks, no explanation outside the JSON).

═══ OUTPUT SCHEMA ═══
{
  "training": [
    {
      "day": "Monday",
      "label": "Push Day — Chest & Shoulders Focus",
      "description": "A vivid 2-3 sentence motivational description of today's session. Explain WHY these exercises were chosen for this day and how they fit the overall program arc. Be energetic and specific.",
      "exercises": [
        {
          "name": "Barbell Bench Press",
          "sets": 4,
          "reps": "8-10",
          "rest": "90s",
          "note": "Short coaching cue or reason, e.g. 'Focus on controlled eccentric — 3 sec down'"
        }
      ]
    }
  ],
  "nutrition": [
    {
      "day": "Monday",
      "description": "1-2 sentences describing the nutritional strategy for this day and why it pairs with the workout.",
      "meals": {
        "breakfast": "Detailed meal with portions, e.g. '2 whole eggs + 3 egg whites scrambled with spinach & feta (350 kcal)'",
        "lunch": "Detailed meal with portions",
        "dinner": "Detailed meal with portions",
        "snacks": "1-2 snacks with portions"
      },
      "kcal": 2200,
      "macros": { "protein": 160, "carbs": 220, "fat": 65 }
    }
  ],
  "summary": "A 3-4 sentence motivational and personalized summary that references the user's specific stats, goal, chosen split, and lifestyle. Make them feel seen.",
  "dailyCalories": ${targetCalories},
  "dailyMacros": { "protein": ${proteinTarget}, "carbs": ${carbTarget}, "fat": ${fatTarget} },
  "tips": ["tip1", "tip2", "tip3", "tip4", "tip5"],
  "personalNote": "2-3 sentences addressing the user's specific situation, extra info, injuries, or lifestyle factors. Always present."
}

═══ TRAINING RULES ═══
- Schedule EXACTLY ${freqDays} training days across Mon-Sun. Remaining days are rest/active recovery.
- For rest days, include them in the training array with "label": "Rest Day" or "Active Recovery", a motivational description encouraging recovery, and an empty exercises array [].
- Follow this split: ${splitDesc}
- Each session should fit within ~${sessionMin} minutes (adjust volume accordingly: fewer sets for shorter sessions, more for longer).${workoutTime ? `\n- The user prefers working out in the ${workoutTime} — reference this in tips if relevant (e.g. pre-workout nutrition timing).` : ''}
${skipLegsFlag
    ? `- IMPORTANT: The user explicitly wants to SKIP all dedicated leg training (they get leg work from other sports). Do NOT include any leg-focused exercises (squats, leg press, lunges, leg curls, leg extensions, calf raises, Romanian deadlifts targeting legs). Replace leg days with extra upper body, core, or cardio work. In the personalNote, acknowledge this choice.`
    : '- Include leg training as part of the split. Never skip leg day.'}
- Use real, specific exercise names (not generic). Include barbell, dumbbell, cable, and bodyweight variations.
- Vary exercises meaningfully across the week — no copy-paste days.
- For every exercise, include a short "note" with a coaching cue, form tip, or explanation of why it's included.
- Each day's "description" must be vivid, motivational, and explain the purpose of that session in the overall program.

═══ NUTRITION RULES ═══
- Target: ${targetCalories} kcal/day | Protein: ${proteinTarget}g | Carbs: ${carbTarget}g | Fat: ${fatTarget}g
- Every day MUST include all four meal keys: breakfast, lunch, dinner, snacks — never omit any.
- Each meal must list specific foods with approximate portions/weights AND approximate kcal per meal in parentheses.
- Each nutrition day MUST include a "macros" object with protein, carbs, and fat values in grams. These should roughly add up to the daily targets (small variations across days are fine).${hasDietPref ? `\n- STRICT dietary restriction: ${dietaryPreference}. Every single meal must comply — no exceptions. Do not include any foods that violate this restriction.` : ''}
${hasCurrentDiet
    ? `- CRITICAL — The user described their current eating habits: "${currentDiet.trim()}"\n  Base the meal plan on this. Keep familiar foods and meal patterns where possible — improve portions, swap in healthier alternatives, and optimize macros, but do NOT throw out their routine entirely. The plan should feel like an upgraded version of what they already eat, not a foreign diet.`
    : '- No current diet was provided — create a practical, easy-to-follow meal plan with common foods.'}
- Vary meals across the 7 days. At least 4-5 different breakfasts, lunches, and dinners throughout the week.
- Each day's nutrition "description" should explain the eating strategy for that day (e.g. higher carbs on heavy training days, lighter on rest days).

═══ PERSONALIZATION ═══
${hasExtraInfo ? `- The user shared additional context: "${extraInfo.trim()}"\n  Factor this into the plan: adjust exercises around injuries, acknowledge other sports, adapt scheduling. Reference this in the personalNote.` : '- No extra info was provided.'}
- The "summary" should be warm, motivational, and reference the user's specific numbers (age, weight, goal, split choice).
- The "personalNote" must always be present and address the user's unique situation.
- Generate 5 actionable, specific tips (not generic). At least 2 should directly reference the user's profile or preferences.
- Make the overall plan feel like it was handcrafted by a world-class coach who truly listened.`;

  const userPrompt = `Create my complete 7-day fitness plan.

PROFILE:
- Goal: ${goal}
- Gender: ${gender}, Age: ${age}, Weight: ${weight}kg, Height: ${height}cm
- Activity level: ${activityLevel}
- Target: ${targetCalories} kcal/day | ${proteinTarget}g protein | ${carbTarget}g carbs | ${fatTarget}g fat

WORKOUT PREFERENCES:
- Frequency: ${freqDays} days/week
- Session duration: ~${sessionMin} minutes${workoutTime ? `\n- Preferred time: ${workoutTime}` : ''}
- Training split: ${workoutSplit || 'your recommendation'}
- Skip leg training: ${skipLegsFlag ? 'YES — I get enough leg work from other activities' : 'No — include legs'}

DIET:${hasDietPref ? `\n- Dietary restriction: ${dietaryPreference}` : '\n- No specific dietary restrictions'}${hasCurrentDiet ? `\n- What I currently eat on an average day: ${currentDiet.trim()}` : ''}

${hasExtraInfo ? `EXTRA CONTEXT:\n${extraInfo.trim()}` : ''}`;

  try {
    const openai = new OpenAI({ apiKey: openaiApiKey });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 8000,
      temperature: 0.8,
    });

    const raw = response.choices[0]?.message?.content || '';

    // Parse the JSON response
    let plan;
    try {
      // Strip any markdown code fences if present
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      plan = JSON.parse(cleaned);
    } catch {
      return respond(res, 500, { message: 'AI returned invalid format. Please try again.' });
    }

    // Save to Firestore if available
    if (admin.apps.length) {
      try {
        const db = admin.firestore();
        await db.collection('users').doc(uid).set({
          plan,
          planProfile: {
            goal, activityLevel, gender, age, weight, height,
            workoutFrequency: freqDays, workoutTime, workoutDuration: sessionMin,
            workoutSplit, skipLegs: skipLegsFlag, dietaryPreference,
            currentDiet: currentDiet || null, extraInfo: extraInfo || null,
            targetCalories, proteinTarget, carbTarget, fatTarget,
          },
          planGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      } catch {
        // Non-fatal — plan still returned to client
      }
    }

    return respond(res, 200, { plan });
  } catch (error) {
    return respond(res, 500, { message: 'Could not generate your plan. Please try again.' });
  }
};
