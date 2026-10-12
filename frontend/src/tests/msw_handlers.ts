import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Aligning with backend/main.py and models.py
const handlers = [
  http.get('http://localhost:8000/api/history', () => {
    return HttpResponse.json({
      history: [
        {
          id: 1,
          version_id: 1,
          title: 'Test Prompt',
          content: 'Hello World',
          model_used: 'gemini',
          created_at: new Date().toISOString(),
          evaluation_score: 85,
          json_schema: null
        }
      ]
    });
  }),
  
  http.post('http://localhost:8000/api/run', async () => {
    return HttpResponse.json({
      content: 'Mocked LLM Response',
      model: 'mock-model',
      usage: { total_tokens: 100 }
    });
  }),

  http.post('http://localhost:8000/api/save', async () => {
    return HttpResponse.json({
      version_id: 42,
      message: "Prompt version saved successfully"
    });
  }),

  http.post('http://localhost:8000/api/batch', async () => {
    return HttpResponse.json({
      total: 1,
      successful: 1,
      failed: 0,
      results: [
        {
          input: { text: "hello" },
          output: "Mocked Batch Output",
          status: "success"
        }
      ]
    });
  }),
];

export const server = setupServer(...handlers);
