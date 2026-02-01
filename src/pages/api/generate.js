// filepath: /Users/dev/Documents/GitHub/AI-FRQ-Grader/src/pages/api/generate.js
import { getModelResponse } from '../../../lib/api';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { session_id, user_query } = req.body;

  try {
    const result = await getModelResponse(session_id, user_query);
    res.status(200).json({ response: result.response, follow_ups_left: result.follow_ups_left });
  } catch (error) {
    console.error('Error during FastAPI request:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}