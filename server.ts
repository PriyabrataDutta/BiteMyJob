import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODEL_ID = 'gemini-3.5-flash-lite';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

interface AnalyzeJdBody {
  company?: string;
  role?: string;
  contactName?: string;
  stage?: string;
  jobDescription?: string;
}

interface ParsedJdInsights {
  skills: string[];
  interviewQuestions: string[];
  followUpDraft: string;
}

function formatGeminiError(err: unknown): { status: number; message: string } {
  const rawMessage = err instanceof Error ? err.message : String(err);
  if (rawMessage.includes('API_KEY_INVALID') || rawMessage.includes('PERMISSION_DENIED') || rawMessage.includes('403')) {
    return {
      status: 403,
      message: 'Gemini API key is missing or unauthorized. Please check Settings > Secrets.',
    };
  }
  if (rawMessage.includes('RESOURCE_EXHAUSTED') || rawMessage.includes('429')) {
    return {
      status: 429,
      message: 'Gemini API rate limit reached. Please wait a moment and try again.',
    };
  }
  if (rawMessage.includes('NOT_FOUND') || rawMessage.includes('404')) {
    return {
      status: 404,
      message: `Requested model (${MODEL_ID}) was not found or is unavailable.`,
    };
  }
  return {
    status: 500,
    message: rawMessage || 'Failed to analyze job description with Gemini.',
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.post('/api/analyze-jd', async (req: Request, res: Response) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        res.status(500).json({
          error: 'GEMINI_API_KEY is not configured on the server. Check Settings > Secrets.',
        });
        return;
      }

      const body = (req.body ?? {}) as AnalyzeJdBody;
      const jobDescription = typeof body.jobDescription === 'string' ? body.jobDescription.trim() : '';

      if (jobDescription.length < 20) {
        res.status(400).json({
          error: 'Please paste a job description (at least 20 characters) before analyzing.',
        });
        return;
      }

      const trimmedJd = jobDescription.slice(0, 20000);
      const company = typeof body.company === 'string' && body.company.trim() ? body.company.trim() : 'the company';
      const role = typeof body.role === 'string' && body.role.trim() ? body.role.trim() : 'this role';
      const contactName =
        typeof body.contactName === 'string' && body.contactName.trim()
          ? body.contactName.trim()
          : '';
      const stage = typeof body.stage === 'string' && body.stage.trim() ? body.stage.trim() : 'Applied';

      const prompt = [
        `Candidate application context:`,
        `- Company: ${company}`,
        `- Role: ${role}`,
        `- Current stage: ${stage}`,
        contactName ? `- Recruiter/Contact name: ${contactName}` : `- Recruiter/Contact name: Hiring Team`,
        ``,
        `Job Description:`,
        trimmedJd,
      ].join('\n');

      const response = await ai.models.generateContent({
        model: MODEL_ID,
        contents: prompt,
        config: {
          systemInstruction:
            'You are an expert career coach and technical recruiter assistant. Given a job description and application context, return structured JSON with: (1) "skills": 5 to 8 concise key required skills or competencies extracted directly from the job description; (2) "interviewQuestions": exactly 3 insightful, role-specific interview questions the candidate should prepare to answer based on the responsibilities in the JD; (3) "followUpDraft": a concise, polished recruiter follow-up note (3 to 5 sentences, plain text, no placeholder brackets except [Your Name] at sign-off) tailored to the company, role, contact name, and key priorities from the JD.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              skills: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '5 to 8 concise required skills extracted from the job description.',
              },
              interviewQuestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Exactly 3 tailored interview questions based on the job description.',
              },
              followUpDraft: {
                type: Type.STRING,
                description: 'A concise, warm, professional recruiter follow-up note.',
              },
            },
            required: ['skills', 'interviewQuestions', 'followUpDraft'],
          },
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        res.status(502).json({ error: 'Gemini returned an empty response. Please try again.' });
        return;
      }

      const parsed = JSON.parse(rawText) as Partial<ParsedJdInsights>;
      const skills = Array.isArray(parsed.skills)
        ? parsed.skills.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).slice(0, 10)
        : [];
      const interviewQuestions = Array.isArray(parsed.interviewQuestions)
        ? parsed.interviewQuestions
            .filter((q): q is string => typeof q === 'string' && q.trim().length > 0)
            .slice(0, 3)
        : [];
      const followUpDraft =
        typeof parsed.followUpDraft === 'string' ? parsed.followUpDraft.trim() : '';

      res.json({
        skills,
        interviewQuestions,
        followUpDraft,
        analyzedAt: new Date().toISOString(),
      });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  const isProd =
    process.env.NODE_ENV === 'production' || process.env.npm_lifecycle_event === 'start';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`BiteMyJob server running on http://0.0.0.0:${port}`);
  });
}

startServer();
