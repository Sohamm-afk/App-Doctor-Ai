import { Request, Response, NextFunction } from 'express';
import { GeminiService } from '../services/geminiService';
import { ContextBuilderService } from '../services/contextBuilderService';
import PDFDocument from 'pdfkit';

export class AiController {
  /**
   * Generates the structured 8-section AI CTO Review report.
   */
  public static async generateReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { scanResult } = req.body;
    if (!scanResult) {
      res.status(400).json({ status: 'error', message: 'Missing scanResult parameter' });
      return;
    }

    try {
      const context = ContextBuilderService.build(scanResult);
      const prompt = `You are a former Google Staff Engineer and Startup CTO conducting a professional engineering audit.
Analyze the following repository scan context:
${JSON.stringify(context, null, 2)}

Write a professional engineering audit report in Markdown. Do not include JSON wrappers or markdown code blocks (like \`\`\`markdown) in your response, just return the raw markdown report text.
Write naturally like a senior engineer, not a JSON summarizer. Keep the report around 600-900 words.

Use these sections exactly:

# Executive Summary
Provide a concise overview of the repository.

# Engineering Strengths
List 3-6 strengths.

# Engineering Risks
List the most important technical risks.

# Architecture Assessment
Discuss scalability, maintainability, modularity and architecture quality.

# Security Assessment
Discuss only the detected security findings. Do not invent vulnerabilities. If there are no findings, state that clearly.

# Performance Assessment
Comment on performance based only on detected findings. If there are no findings, state that clearly.

# Technical Debt
Describe maintainability concerns.

# Production Readiness
Give a score out of 100 and explain why.

# 30-Day Improvement Roadmap
Provide prioritized recommendations.

# Final CTO Verdict
Answer: Would you approve this project for production? Why?

CRITICAL LIMITATIONS & RULES:
- Never invent technologies.
- Never invent databases.
- Never invent vulnerabilities.
- Base every statement strictly on the repository context.
- Do not invent, guess, or estimate details regarding live concurrent users, runtime telemetry (e.g. CPU/memory load), database response times, live cloud billing costs, Kubernetes scaling thresholds, or Redis recommendations. If these metrics are mentioned or requested, state them explicitly as "Not Determined".`;

      const reviewText = await GeminiService.generateContent(prompt);
      res.status(200).json({ review: reviewText });
    } catch (err: any) {
      next(err);
    }
  }

  /**
   * Dialog chat endpoint to answer questions with codebase context and history.
   */
  public static async chatMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { message, history, scanResult } = req.body;
    if (!message || !scanResult) {
      res.status(400).json({ status: 'error', message: 'Missing message or scanResult parameters' });
      return;
    }

    try {
      const context = ContextBuilderService.build(scanResult);
      const prompt = `You are the AI CTO of AppDoctor AI. Answer the user's questions about their repository based strictly on the following repository analysis payload:
${JSON.stringify(context, null, 2)}

Previous chat conversation history:
${JSON.stringify(history || [])}

User question: ${message}

Provide a helpful, highly technical, and concise response. Avoid code syntax errors.
CRITICAL: Never simulate, invent, or guess details about concurrent users, live cloud billing, database response times, runtime telemetry (CPU/memory load), Kubernetes scaling capacity, or Redis caching. If these topics are asked and not explicitly found in the scanned files, output "Not Determined". Use Markdown.`;

      const responseText = await GeminiService.generateContent(prompt);
      res.status(200).json({ reply: responseText });
    } catch (err: any) {
      next(err);
    }
  }

  public static async generateFixes(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { scanResult } = req.body;
    if (!scanResult) {
      res.status(400).json({ status: 'error', message: 'Missing scanResult parameter' });
      return;
    }

    try {
      const context = ContextBuilderService.build(scanResult);
      const prompt = `You are a Senior Software Engineer auditing repository issues.
Analyze the following repository context, findings, and technologies:
${JSON.stringify(context, null, 2)}

Generate a list of automated One-Click Fixes to resolve the detected security or quality findings in this repository.
Return ONLY a JSON array matching this exact TypeScript structure (no markdown wrapper, raw JSON only):
interface FixPatch {
  id: string;
  title: string;
  issue: string; // A structured Markdown response for the specific finding being remediated.
  severity: 'critical' | 'high' | 'medium' | 'low';
  filePath: string;
  diff: string; // Unified git diff format showing the exact replacement code (use - for deleted lines, + for added lines, space for context)
}

For EACH fix in the array, the \`issue\` string MUST be formatted as a structured Markdown response with exactly these sections:

# Issue
Brief explanation of the detected problem.

# Why It Matters
Explain the security, performance, or maintainability impact.

# Recommended Fix
Explain the preferred solution.

# Code Example
Generate production-ready code tailored to the detected framework and language.
If the framework is:
- Express -> Express solution
- NestJS -> NestJS solution
- React -> React solution
- Next.js -> Next.js solution
- Vue -> Vue solution
- Python -> Python solution
Do not generate generic code. Tailor the code syntax to the exact project technology and language.

# Best Practices
Provide 3-5 best practices.

# References
Mention official documentation (without inventing URLs).

Rules:
- Never invent vulnerabilities.
- Base everything on the repository context and the selected finding.
- Tailor every fix to the detected technology stack.
- Produce clean Markdown inside the \`issue\` field.
- CRITICAL: Never generate fixes or recommendations for live scaling, Redis cache, Kubernetes, CPU/memory telemetry, or billing cost fixes.`;

      const responseJson = await GeminiService.generateContent(prompt, true);
      let fixes = [];
      try {
        fixes = JSON.parse(responseJson);
      } catch (parseErr) {
        console.error('[AiController] Failed to parse fixes JSON from Gemini, returning fallback:', responseJson);
        // Fallback cleanup if Gemini wrapped it in markdown quotes despite generationConfig
        const cleaned = responseJson.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
        fixes = JSON.parse(cleaned);
      }

      res.status(200).json({ fixes });
    } catch (err: any) {
      next(err);
    }
  }

  /**
   * Exports a detailed repository report as a PDF using PDFKit.
   */
  public static async exportPdfReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { scanResult, review, fixes } = req.body;
    if (!scanResult) {
      res.status(400).json({ status: 'error', message: 'Missing scanResult parameter' });
      return;
    }

    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });

      // Configure PDF headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=appdoctor_report_${scanResult.metadata?.project_name || 'project'}.pdf`
      );

      doc.pipe(res);

      // --- PAGE 1: TITLE & METADATA ---
      doc.fontSize(26).fillColor('#1e293b').text('APPDOCTOR AI AUDIT REPORT', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#64748b').text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown(2);

      // Metadata card
      doc.rect(50, doc.y, 495, 120).fillAndStroke('#f8fafc', '#e2e8f0');
      doc.fillColor('#1e293b');
      doc.fontSize(14).text('Repository Specifications', 65, doc.y + 15);
      doc.fontSize(10).fillColor('#475569');
      doc.moveDown(0.8);
      doc.text(`Project Name: ${scanResult.metadata?.project_name || 'Unnamed Repository'}`);
      doc.text(`Repository: ${scanResult.metadata?.repository_name || '—'}`);
      doc.text(`Languages Discovered: ${(scanResult.metadata?.languages || []).join(', ') || '—'}`);
      doc.text(`Total Files Checked: ${scanResult.metadata?.file_count || 0} files in ${scanResult.metadata?.folder_count || 0} directories`);
      doc.text(`Overall Launch Score: ${scanResult.launch_score?.overall ?? 100} / 100`);

      // Page Break
      doc.addPage();

      // --- PAGE 2: SECURITY FINDINGS ---
      doc.fontSize(18).fillColor('#1e293b').text('Security Assessment', 50, doc.y);
      doc.moveDown(1);
      const security = scanResult.security_findings || [];
      if (security.length === 0) {
        doc.fontSize(11).fillColor('#15803d').text('No security issues detected.');
      } else {
        security.forEach((s: any, idx: number) => {
          doc.fontSize(12).fillColor('#b91c1c').text(`[#${idx + 1}] ${s.title} (${s.severity.toUpperCase()})`);
          doc.fontSize(9).fillColor('#475569');
          doc.text(`File: ${s.file} : line ${s.lineNumber}`);
          doc.fontSize(10).fillColor('#1e293b').text(`Description: ${s.description}`);
          if (s.evidence) {
            doc.fontSize(9).fillColor('#0f172a').font('Courier').text(`Evidence: ${s.evidence}`);
            doc.font('Helvetica');
          }
          doc.moveDown(1);
        });
      }

      // --- PAGE 3: PERFORMANCE AND QUALITY ---
      doc.addPage();
      doc.fontSize(18).fillColor('#1e293b').text('Performance & Quality Audit', 50, doc.y);
      doc.moveDown(1);

      doc.fontSize(14).text('Performance Findings');
      doc.moveDown(0.5);
      const perf = scanResult.performance_findings || [];
      if (perf.length === 0) {
        doc.fontSize(11).fillColor('#15803d').text('No performance bottlenecks detected.');
      } else {
        perf.forEach((p: any) => {
          doc.fontSize(11).fillColor('#d97706').text(`- ${p.title} (Impact: ${p.impact || 'Medium'})`);
          doc.fontSize(9).fillColor('#475569').text(`File: ${p.file}`);
          doc.fontSize(10).fillColor('#1e293b').text(`Description: ${p.description}`);
          doc.moveDown(0.5);
        });
      }

      doc.moveDown(1.5);
      doc.fontSize(14).text('Quality Findings');
      doc.moveDown(0.5);
      const qual = scanResult.quality_findings || [];
      if (qual.length === 0) {
        doc.fontSize(11).fillColor('#15803d').text('No quality checks violations identified.');
      } else {
        qual.forEach((q: any) => {
          doc.fontSize(11).fillColor('#2563eb').text(`- ${q.title}`);
          doc.fontSize(9).fillColor('#475569').text(`File: ${q.file}`);
          doc.fontSize(10).fillColor('#1e293b').text(`Description: ${q.description}`);
          doc.moveDown(0.5);
        });
      }

      // --- PAGE 4: AI CTO REVIEW REPORT ---
      if (review) {
        doc.addPage();
        doc.fontSize(18).fillColor('#1e293b').text('AI CTO Strategic Review', 50, doc.y);
        doc.moveDown(1);
        doc.fontSize(10).fillColor('#1e293b').text(review);
      }

      // --- PAGE 5: REMEDIATION PATCHES ---
      if (fixes && fixes.length > 0) {
        doc.addPage();
        doc.fontSize(18).fillColor('#1e293b').text('Automated Remediation Patches', 50, doc.y);
        doc.moveDown(1);
        fixes.forEach((f: any) => {
          doc.fontSize(12).fillColor('#047857').text(`Fix: ${f.title}`);
          doc.fontSize(9).fillColor('#475569').text(`Targets Issue: ${f.issue} (${f.filePath})`);
          doc.moveDown(0.5);
          if (f.diff) {
            doc.fontSize(8).fillColor('#111827').font('Courier').text(f.diff);
            doc.font('Helvetica');
          }
          doc.moveDown(1);
        });
      }

      doc.end();
    } catch (err: any) {
      next(err);
    }
  }
}
