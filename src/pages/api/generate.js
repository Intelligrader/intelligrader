const API_BASE_URL = (process.env.INTELLIGRADER_API_BASE_URL || 'https://peral.one').replace(/\/+$/, '');

const RUBRICS_BY_TYPE = {
  DBQ: 'Score using APUSH DBQ style criteria: thesis, contextualization, evidence from documents, outside evidence, sourcing, and complexity. Give concise, actionable feedback.',
  LEQ: 'Score using APUSH LEQ style criteria: thesis, contextualization, evidence, and analysis/reasoning. Give concise, actionable feedback.',
  SAQ: 'Score using APUSH SAQ style criteria: directly answers the prompt with accurate historical evidence and reasoning. Give concise, actionable feedback.',
};

const MAX_SCORE_BY_TYPE = {
  DBQ: 7,
  LEQ: 6,
  SAQ: 3,
};

function parseLegacyPrompt(prompt) {
  if (!prompt || typeof prompt !== 'string') {
    return null;
  }

  const match = prompt.match(/^Grade this APUSH\s+([A-Za-z]+):\s*([\s\S]*)$/i);
  if (!match) {
    return null;
  }

  return {
    questionType: match[1]?.toUpperCase() || 'SAQ',
    studentAnswer: (match[2] || '').trim(),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const {
    questionType,
    studentAnswer,
    question,
    rubric,
    maxScore,
    temperature,
    topP,
    model,
    prompt,
  } = req.body || {};

  const legacy = parseLegacyPrompt(prompt);
  const resolvedQuestionType = (questionType || legacy?.questionType || 'SAQ').toUpperCase();
  const resolvedStudentAnswer = (studentAnswer || legacy?.studentAnswer || '').trim();

  if (!resolvedStudentAnswer) {
    return res.status(400).json({ message: 'studentAnswer is required' });
  }

  const resolvedMaxScore = Number.isInteger(maxScore)
    ? maxScore
    : (MAX_SCORE_BY_TYPE[resolvedQuestionType] || 4);

  try {
    const upstreamResponse = await fetch(`${API_BASE_URL}/grade-saq`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: (question || `APUSH ${resolvedQuestionType} response`).trim(),
        student_answer: resolvedStudentAnswer,
        rubric: (rubric || RUBRICS_BY_TYPE[resolvedQuestionType] || RUBRICS_BY_TYPE.SAQ).trim(),
        max_score: resolvedMaxScore,
        temperature: typeof temperature === 'number' ? temperature : 0.2,
        top_p: typeof topP === 'number' ? topP : 0.9,
        model: typeof model === 'string' && model.trim() ? model.trim() : null,
      }),
    });

    if (!upstreamResponse.ok) {
      const errorBody = await upstreamResponse.text();
      return res.status(upstreamResponse.status).json({
        message: 'Intelligrader API request failed',
        error: errorBody,
      });
    }

    const result = await upstreamResponse.json();
    const formattedResponse = `Score: ${result.score}/${result.max_score}\n\nFeedback:\n${result.feedback}`;

    res.status(200).json({
      response: formattedResponse,
      score: result.score,
      max_score: result.max_score,
      feedback: result.feedback,
      model_used: result.model_used,
      tokens_used: result.tokens_used,
    });
  } catch (error) {
    console.error('Error during Intelligrader API request:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}