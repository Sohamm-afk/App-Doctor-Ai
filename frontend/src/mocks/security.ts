import type { SecurityIssue } from '@/types';

export const MOCK_SECURITY_ISSUES: SecurityIssue[] = [
  {
    id: 'sec-001', projectId: 'proj-001',
    title: 'SQL Injection Vulnerability in Search Handler',
    description: 'User input is directly concatenated into SQL queries without parameterization, allowing attackers to manipulate database queries.',
    severity: 'critical', category: 'injection',
    filePath: 'src/api/search.ts', lineNumber: 42,
    cveId: 'CVE-2021-12345', cweId: 'CWE-89',
    remediation: 'Use parameterized queries or an ORM. Replace raw string concatenation with prepared statements.',
    status: 'open',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
  {
    id: 'sec-002', projectId: 'proj-001',
    title: 'Hardcoded JWT Secret in Environment File',
    description: 'A JWT signing secret is hardcoded in the codebase and committed to source control.',
    severity: 'critical', category: 'sensitive-data',
    filePath: '.env.example', lineNumber: 7,
    cweId: 'CWE-798',
    remediation: 'Move secrets to a secure secrets manager (AWS Secrets Manager, HashiCorp Vault). Rotate the key immediately.',
    status: 'in-progress',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
  },
  {
    id: 'sec-003', projectId: 'proj-001',
    title: 'Missing CSRF Protection on State-Changing Endpoints',
    description: 'POST, PUT, and DELETE endpoints do not validate CSRF tokens, making them vulnerable to cross-site request forgery.',
    severity: 'high', category: 'authentication',
    remediation: 'Implement CSRF middleware (e.g., csurf for Node.js). Add SameSite cookie attribute.',
    status: 'open',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
  },
  {
    id: 'sec-004', projectId: 'proj-001',
    title: 'Outdated Dependency: lodash@4.17.15',
    description: 'lodash version 4.17.15 has a known prototype pollution vulnerability.',
    severity: 'high', category: 'known-vulnerabilities',
    cveId: 'CVE-2020-8203',
    remediation: 'Upgrade lodash to >= 4.17.21.',
    status: 'open',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
  },
  {
    id: 'sec-005', projectId: 'proj-001',
    title: 'Reflected XSS in User Profile Page',
    description: 'User-supplied input is rendered in the DOM without sanitization.',
    severity: 'medium', category: 'xss',
    filePath: 'src/pages/Profile.tsx', lineNumber: 88,
    cweId: 'CWE-79',
    remediation: 'Sanitize all user input before rendering. Use DOMPurify or React\'s built-in escaping.',
    status: 'open',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
  {
    id: 'sec-006', projectId: 'proj-001',
    title: 'Verbose Error Messages Exposing Stack Traces',
    description: 'API error responses include full stack traces in production, leaking implementation details.',
    severity: 'low', category: 'logging',
    remediation: 'Configure error handler to return generic messages in production. Log full errors server-side only.',
    status: 'open',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
];

export function getMockSecurityIssues(projectId: string): SecurityIssue[] {
  return MOCK_SECURITY_ISSUES.filter((i) => i.projectId === projectId);
}
