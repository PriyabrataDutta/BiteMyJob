import { JobApplication, JobDescriptionInsights } from '../types/application';

export async function analyzeJobDescription(
  application: Pick<JobApplication, 'company' | 'role' | 'contactName' | 'stage'>,
  jobDescription: string
): Promise<JobDescriptionInsights> {
  const response = await fetch('/api/analyze-jd', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      company: application.company,
      role: application.role,
      contactName: application.contactName,
      stage: application.stage,
      jobDescription,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    skills?: string[];
    interviewQuestions?: string[];
    followUpDraft?: string;
    analyzedAt?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error || 'Unable to analyze job description right now.');
  }

  return {
    skills: Array.isArray(payload.skills) ? payload.skills : [],
    interviewQuestions: Array.isArray(payload.interviewQuestions)
      ? payload.interviewQuestions
      : [],
    followUpDraft: typeof payload.followUpDraft === 'string' ? payload.followUpDraft : '',
    analyzedAt: payload.analyzedAt || new Date().toISOString(),
  };
}
