import type { ChatMessage, ChatSession, SuggestedAction } from '@/types';

export const MOCK_SUGGESTED_PROMPTS: string[] = [
  'What are the top 3 security risks in my project?',
  'Is my application ready to launch?',
  'How can I reduce my cloud costs by 30%?',
  'Explain the architecture bottlenecks you found.',
  'What technical debt should I prioritize?',
  'Generate an executive summary report.',
  'Which dependencies need immediate updates?',
];

export const MOCK_SUGGESTED_ACTIONS: SuggestedAction[] = [
  { id: 'action-security', label: 'View Security Issues', icon: 'Shield',   action: 'navigate:security'     },
  { id: 'action-report',   label: 'Generate Report',      icon: 'FileText', action: 'generate:report'       },
  { id: 'action-arch',     label: 'View Architecture',    icon: 'GitBranch',action: 'navigate:architecture' },
  { id: 'action-deploy',   label: 'Check Deploy Readiness',icon: 'Rocket',  action: 'check:deploy'          },
];

export const MOCK_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-001',
    role: 'assistant',
    content: "Hello! I'm your AI CTO. I've analyzed your E-Commerce Platform and I'm ready to help. Here's what I found at a glance:\n\n- 🔴 2 Critical security vulnerabilities requiring immediate attention\n- ⚡ API response times are 40% above baseline\n- 💰 Estimated $521/month in potential cloud savings\n- 📊 Launch Score: 74/100 — Launch with caution\n\nWhat would you like to dive into first?",
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    metadata: { actions: MOCK_SUGGESTED_ACTIONS },
  },
];

export const MOCK_CHAT_SESSION: ChatSession = {
  id: 'session-001',
  projectId: 'proj-001',
  title: 'E-Commerce Platform Analysis',
  messages: MOCK_CHAT_MESSAGES,
  createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  updatedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
};
