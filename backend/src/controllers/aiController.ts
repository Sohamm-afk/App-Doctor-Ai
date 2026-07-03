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
      const prompt = `You are the permanent CTO of AppDoctor AI, a seasoned engineering executive with over 20 years of experience building large-scale software systems at companies like Google, Microsoft, and Stripe. You are mentoring the developer of this project directly.

Below is the compressed repository scan context:
${JSON.stringify(context, null, 2)}

And here is the previous chat conversation history:
${JSON.stringify(history || [])}

User's question/request:
"${message}"

Write your response following these strict rules:
1. Speak naturally and conversationally. Do NOT sound like an AI assistant (ChatGPT/Gemini) or an automated audit report.
2. Never begin your answer with phrases like "The analysis shows...", "The repository contains...", "Based on the repository analysis...", "The scan indicates...", or "Our findings...". Speak directly as a human CTO (e.g., "If this were my project...", "If I were leading this engineering team...", "I'd fix this before worrying about anything else.", "I wouldn't lose sleep over this.", "This is actually a good sign.", "Here's what I'd do next.").
3. Be opinionated. Do not simply describe findings; prioritize them, explain real-world tradeoffs, and recommend what to tackle first.
4. Speak like a mentor. Avoid sounding like documentation or a textbook.
5. Never repeat numerical scores unless the user explicitly asks you to. Instead, explain what the launch score actually means for their release capability.
6. If the user asks "Is this production ready?", answer like a CTO approving or delaying a release (e.g. "I'd approve this release.", "I'd delay this release.", "I'd ship it after fixing these two issues.").
7. If the user asks "What should I fix first?", return a concrete, ordered action plan.
8. End every single answer with exactly one helpful next step (e.g., "Once you've fixed that, ask me to review the architecture again.", "After those changes I'd review the deployment strategy.", "We can then look at scalability."). Never end abruptly.
9. Avoid unnecessary Markdown formatting. Do NOT use **bold markers** or ## headers. Use short paragraphs. Use bullets only when highly useful.
10. Never hallucinate. Never invent databases, frameworks, libraries, or vulnerabilities not present in the scan context.
11. Be confident. Avoid words like "might", "possibly", or "it appears" unless genuine technical uncertainty exists.
12. Keep answers concise. Keep default length around 100-250 words. Do not give long explanations unless requested.`;

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
      const securityFindings = scanResult.security_findings || [];
      const qualityFindings = scanResult.quality_findings || [];
      
      const allFindings = [
        ...securityFindings.map((f: any) => ({ ...f, type: 'security' })),
        ...qualityFindings.map((f: any) => ({ ...f, type: 'quality' }))
      ];

      // Group findings by title
      const groupsMap = new Map<string, any[]>();
      allFindings.forEach((finding) => {
        const title = finding.title;
        if (!groupsMap.has(title)) {
          groupsMap.set(title, []);
        }
        groupsMap.get(title)!.push(finding);
      });

      // Filter and prioritize production files over test/example/doc files
      const isTestOrExampleFile = (filePath: string) => {
        const lower = filePath.toLowerCase();
        return lower.includes('test') || lower.includes('example') || lower.includes('doc') || lower.includes('fixture');
      };

      const groupedList: any[] = [];
      groupsMap.forEach((findings, title) => {
        // Prioritize production source files
        findings.sort((a, b) => {
          const aTest = isTestOrExampleFile(a.file || '');
          const bTest = isTestOrExampleFile(b.file || '');
          if (aTest && !bTest) return 1;
          if (!aTest && bTest) return -1;
          return 0;
        });

        const primaryFinding = findings[0];
        const affectedFiles = Array.from(new Set(findings.map((f) => f.file).filter(Boolean)));

        groupedList.push({
          title,
          severity: primaryFinding.severity || 'low',
          occurrences: findings.length,
          affectedFiles,
          primaryFile: primaryFinding.file || 'package.json',
          findingsDetails: findings.map((f) => ({
            file: f.file,
            lineNumber: f.lineNumber,
            evidence: f.evidence,
            description: f.description
          }))
        });
      });

      if (groupedList.length === 0) {
        res.status(200).json({ fixes: [] });
        return;
      }

      // Sort groups by severity: critical, high, medium, low
      const severityWeight = { critical: 4, high: 3, medium: 2, low: 1, info: 1 };
      groupedList.sort((a, b) => {
        const aW = (severityWeight as any)[a.severity.toLowerCase()] || 0;
        const bW = (severityWeight as any)[b.severity.toLowerCase()] || 0;
        return bW - aW;
      });

      const context = ContextBuilderService.build(scanResult);
      const prompt = `You are a Senior Software Engineer auditing repository issues.
Analyze the following repository context and technologies:
${JSON.stringify(context, null, 2)}

We have grouped the codebase findings by title. Here is the list of unique finding groups:
${JSON.stringify(groupedList, null, 2)}

Generate a list of automated One-Click Fixes, one for each unique finding group.
Return ONLY a JSON array matching this exact TypeScript structure (no markdown wrapper, raw JSON only):
interface FixPatch {
  id: string; // Unique index identifier (e.g. "fix-0", "fix-1")
  title: string; // The exact finding title of the group
  issue: string; // A structured Markdown response explaining the unified fix for all occurrences in this group.
  severity: 'critical' | 'high' | 'medium' | 'low'; // The group's severity
  filePath: string; // The primary file path of the group (primaryFile)
  diff: string; // One unified git diff format showing the exact replacement code for the primary file
  occurrences: number; // The exact group occurrences count
  affectedFiles: string[]; // The list of affected files in the group (groupedList[i].affectedFiles)
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
      // Create document with buffer pages allowed for footers
      const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });

      // Configure PDF headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=appdoctor_report_${scanResult.metadata?.project_name || 'project'}.pdf`
      );

      doc.pipe(res);

      // Parse review sections if available
      const parseSections = (markdown: string): Record<string, string> => {
        const sections: Record<string, string> = {};
        if (!markdown) return sections;
        const matches = markdown.split(/(?=^#+\s+)/m);
        matches.forEach(chunk => {
          const match = chunk.match(/^#+\s+(.+)$/m);
          if (match) {
            const title = match[1].trim();
            const content = chunk.slice(match[0].length).trim();
            sections[title] = content;
          }
        });
        return sections;
      };
      const sections = parseSections(review || '');

      // Helper for severity color codes
      const getSeverityColor = (sev: string) => {
        const lower = (sev || '').toLowerCase();
        if (lower === 'critical') return '#dc2626';
        if (lower === 'high') return '#ea580c';
        if (lower === 'medium') return '#d97706';
        return '#2563eb';
      };

      // --- PAGE 1: COVER PAGE ---
      doc.rect(50, 50, 495, 742).fill('#0f172a');
      
      // Title Block
      doc.fillColor('#38bdf8').fontSize(13).text('APPDOCTOR AI AUDIT REPORT', 90, 150);
      doc.fillColor('#ffffff').fontSize(26).text('Executive Engineering Audit', 90, 175, { width: 400 });
      doc.moveTo(90, 240).lineTo(505, 240).stroke('#38bdf8');

      // Metadata section
      doc.fillColor('#94a3b8').fontSize(9).text('PROJECT NAME', 90, 275);
      doc.fillColor('#ffffff').fontSize(11).text(scanResult.metadata?.project_name || 'Unnamed Repository', 90, 290);

      doc.fillColor('#94a3b8').fontSize(9).text('REPOSITORY', 90, 335);
      doc.fillColor('#ffffff').fontSize(11).text(scanResult.metadata?.repository_name || '—', 90, 350);

      doc.fillColor('#94a3b8').fontSize(9).text('PRIMARY LANGUAGE / TECH', 90, 395);
      doc.fillColor('#ffffff').fontSize(11).text((scanResult.metadata?.languages || []).join(', ') || '—', 90, 410);

      doc.fillColor('#94a3b8').fontSize(9).text('OVERALL LAUNCH SCORE', 90, 455);
      doc.fillColor('#38bdf8').fontSize(24).text(`${scanResult.launch_score?.overall ?? 100} / 100`, 90, 470);

      doc.fillColor('#94a3b8').fontSize(9).text('AUDIT TIMESTAMP', 90, 535);
      doc.fillColor('#ffffff').fontSize(11).text(new Date().toLocaleString(), 90, 550);

      // --- PAGE 2: EXECUTIVE SUMMARY & LAUNCH BREAKDOWN ---
      doc.addPage();
      doc.fontSize(18).fillColor('#0f172a').text('1. Executive Summary', 50, 60);
      doc.moveDown(0.8);
      
      const summaryContent = sections['Executive Summary'] || 'Repository scans completed successfully. The audit indicates the project has valid dependencies and is prepared for code lifecycle evaluation.';
      doc.fontSize(10).fillColor('#334155').text(summaryContent, { align: 'justify', lineGap: 3 });

      doc.moveDown(2);
      doc.fontSize(14).fillColor('#0f172a').text('Launch Score Breakdown', 50, doc.y);
      doc.moveDown(0.8);

      const drawProgressBar = (y: number, label: string, score: number, color: string) => {
        doc.fillColor('#475569').fontSize(9).text(label, 50, y + 1);
        doc.rect(170, y, 280, 8).fill('#e2e8f0');
        doc.rect(170, y, 2.8 * score, 8).fill(color);
        doc.fillColor('#0f172a').fontSize(9).text(`${score}/100`, 465, y);
      };

      const scoreY = doc.y;
      drawProgressBar(scoreY, 'Overall Score', scanResult.launch_score?.overall ?? 100, '#0f172a');
      drawProgressBar(scoreY + 25, 'Security Score', scanResult.launch_score?.security ?? 100, getSeverityColor('critical'));
      drawProgressBar(scoreY + 50, 'Performance Score', scanResult.launch_score?.performance ?? 100, getSeverityColor('medium'));
      drawProgressBar(scoreY + 75, 'Quality Score', scanResult.launch_score?.quality ?? 100, getSeverityColor('low'));

      doc.y = scoreY + 110;

      // --- PAGE 3: TECHNOLOGY STACK TABLE ---
      doc.addPage();
      doc.fontSize(18).fillColor('#0f172a').text('2. Technology Stack & Frameworks', 50, 60);
      doc.moveDown(1.5);

      const drawTableRow = (y: number, label: string, value: string) => {
        doc.rect(50, y, 160, 22).fillAndStroke('#f8fafc', '#e2e8f0');
        doc.rect(210, y, 335, 22).stroke('#e2e8f0');
        doc.fillColor('#475569').fontSize(9).text(label, 60, y + 6);
        doc.fillColor('#0f172a').fontSize(9).text(value || 'None Detected', 220, y + 6);
      };

      let tableY = doc.y;
      drawTableRow(tableY, 'Languages Discovered', (scanResult.metadata?.languages || []).join(', '));
      drawTableRow(tableY + 22, 'Frontend Framework', scanResult.metadata?.technology?.frontend);
      drawTableRow(tableY + 44, 'Backend Framework', scanResult.metadata?.technology?.backend);
      drawTableRow(tableY + 66, 'Database Engine', scanResult.metadata?.technology?.database);
      drawTableRow(tableY + 88, 'Package Manager', scanResult.metadata?.technology?.packageManager);
      drawTableRow(tableY + 110, 'Deployment Target', scanResult.metadata?.technology?.deployment);
      drawTableRow(tableY + 132, 'CI/CD Pipeline', scanResult.metadata?.technology?.ciCd);

      doc.y = tableY + 180;

      // --- PAGE 4: SECURITY FINDINGS ---
      doc.addPage();
      doc.fontSize(18).fillColor('#0f172a').text('3. Security Assessment', 50, 60);
      doc.moveDown(0.8);

      if (sections['Security Assessment']) {
        doc.fontSize(9.5).fillColor('#334155').text(sections['Security Assessment'], { lineGap: 2 });
        doc.moveDown(1.5);
      }

      const security = scanResult.security_findings || [];
      if (security.length === 0) {
        doc.fontSize(10).fillColor('#16a34a').text('No security vulnerabilities identified in code paths.');
      } else {
        security.forEach((s: any, idx: number) => {
          const sevColor = getSeverityColor(s.severity);
          doc.rect(50, doc.y, 50, 13).fill(sevColor);
          doc.fillColor('#ffffff').fontSize(7.5).text(s.severity.toUpperCase(), 50, doc.y + 3, { align: 'center', width: 50 });
          doc.fillColor('#0f172a').fontSize(11).text(s.title, 110, doc.y - 11);
          doc.fontSize(8.5).fillColor('#475569').text(`File: ${s.file} : Line ${s.lineNumber}`, 50, doc.y + 4);
          doc.fontSize(9.5).fillColor('#334155').text(`Description: ${s.description}`, 50, doc.y + 4);
          if (s.evidence) {
            doc.fontSize(8.5).fillColor('#0f172a').font('Courier').text(`Evidence: ${s.evidence}`, 50, doc.y + 4);
            doc.font('Helvetica');
          }
          doc.moveDown(1);
        });
      }

      // --- PAGE 5: PERFORMANCE FINDINGS ---
      doc.addPage();
      doc.fontSize(18).fillColor('#0f172a').text('4. Performance Assessment', 50, 60);
      doc.moveDown(0.8);

      if (sections['Performance Assessment']) {
        doc.fontSize(9.5).fillColor('#334155').text(sections['Performance Assessment'], { lineGap: 2 });
        doc.moveDown(1.5);
      }

      const perf = scanResult.performance_findings || [];
      if (perf.length === 0) {
        doc.fontSize(10).fillColor('#16a34a').text('No performance bottlenecks detected.');
      } else {
        perf.forEach((p: any) => {
          doc.rect(50, doc.y, 50, 13).fill(getSeverityColor('medium'));
          doc.fillColor('#ffffff').fontSize(7.5).text('MEDIUM', 50, doc.y + 3, { align: 'center', width: 50 });
          doc.fillColor('#0f172a').fontSize(11).text(p.title, 110, doc.y - 11);
          doc.fontSize(8.5).fillColor('#475569').text(`File: ${p.file}`, 50, doc.y + 4);
          doc.fontSize(9.5).fillColor('#334155').text(`Description: ${p.description}`, 50, doc.y + 4);
          doc.moveDown(0.8);
        });
      }

      // --- PAGE 6: CODE QUALITY & DEBT ---
      doc.addPage();
      doc.fontSize(18).fillColor('#0f172a').text('5. Code Quality & Technical Debt', 50, 60);
      doc.moveDown(0.8);

      if (sections['Technical Debt']) {
        doc.fontSize(9.5).fillColor('#334155').text(sections['Technical Debt'], { lineGap: 2 });
        doc.moveDown(1.5);
      }

      const qual = scanResult.quality_findings || [];
      if (qual.length === 0) {
        doc.fontSize(10).fillColor('#16a34a').text('No code quality violations or maintainability concerns found.');
      } else {
        qual.forEach((q: any) => {
          doc.rect(50, doc.y, 50, 13).fill(getSeverityColor('low'));
          doc.fillColor('#ffffff').fontSize(7.5).text('LOW', 50, doc.y + 3, { align: 'center', width: 50 });
          doc.fillColor('#0f172a').fontSize(11).text(q.title, 110, doc.y - 11);
          doc.fontSize(8.5).fillColor('#475569').text(`File: ${q.file}`, 50, doc.y + 4);
          doc.fontSize(9.5).fillColor('#334155').text(`Description: ${q.description}`, 50, doc.y + 4);
          doc.moveDown(0.8);
        });
      }

      // --- PAGE 7: ARCHITECTURE ASSESSMENT ---
      doc.addPage();
      doc.fontSize(18).fillColor('#0f172a').text('6. Architecture Overview', 50, 60);
      doc.moveDown(1);
      
      const archContent = sections['Architecture Assessment'] || 'No architectural limitations identified. The modules represent correct decoupled layers.';
      doc.fontSize(9.5).fillColor('#334155').text(archContent, { lineGap: 3 });

      // --- PAGE 8: ROADMAP & VERDICT ---
      doc.addPage();
      doc.fontSize(18).fillColor('#0f172a').text('7. AI CTO Verdict & Priority Roadmap', 50, 60);
      doc.moveDown(1);

      doc.fontSize(13).fillColor('#0f172a').text('CTO Release Verdict');
      doc.moveDown(0.4);
      const verdictContent = sections['Final CTO Verdict'] || 'I recommend deploying after addressing any Critical or High security findings.';
      doc.fontSize(9.5).fillColor('#334155').text(verdictContent, { lineGap: 2 });

      doc.moveDown(1.5);
      doc.fontSize(13).fillColor('#0f172a').text('30-Day Improvement Roadmap');
      doc.moveDown(0.4);
      const roadmapContent = sections['30-Day Improvement Roadmap'] || '1. Remediate top security alerts.\n2. Fix codebase quality warnings.';
      doc.fontSize(9.5).fillColor('#334155').text(roadmapContent, { lineGap: 2 });

      // --- POST-PROCESS: PAGE NUMBERS & HEADER/FOOTERS ---
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(i);
        
        // Skip header/footer on cover page
        if (i > 0) {
          // Draw thin line header
          doc.fontSize(7.5).fillColor('#94a3b8').text('AppDoctor AI Executive Engineering Audit', 50, 30);
          doc.moveTo(50, 42).lineTo(545, 42).stroke('#e2e8f0');

          // Draw footer
          doc.fontSize(7.5).fillColor('#94a3b8').text('Generated by AppDoctor AI', 50, 800);
          doc.text(`Page ${i + 1} of ${range.count}`, 480, 800, { align: 'right', width: 65 });
        }
      }

      doc.end();
    } catch (err: any) {
      next(err);
    }
  }
}
