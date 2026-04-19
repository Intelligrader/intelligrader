const generationConfig = {
  "question": "string",
  "student_answer": "string",
  "rubric": "string",
  "max_score": 4,
  "temperature": 0.2,
  "top_p": 0.9,
  "model": "string"
};

export { model, generationConfig };

export async function getModelResponse(sessionId, userQuery) {
  const response = await fetch('https://peral.one/grade-saq', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      "question": "N/A",
      "student_answer": userQuery,
      "rubric": "N/A",
      "max_score": 4,
      "temperature": 0.2,
      "top_p": 0.9,
      "model": "intelligrader-saq-qwen"
    }),
  });

  if (!response.ok) {
    console.error(response);
    throw new Error('Failed to get response from FastAPI');
  }

  return await response.json();
}