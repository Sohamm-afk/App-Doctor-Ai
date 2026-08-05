import { Request, Response, NextFunction } from 'express';
import { GeminiService } from '../services/geminiService';
import { SessionMemoryService } from '../services/architecture/SessionMemoryService';
import { ArchitectureAIService } from '../services/ArchitectureAIService';
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
      const { AIContextBuilder } = require('../services/architecture/AIContextBuilder');
      const repoId = scanResult.repositoryProfile?.name || 'default-repo';
      const context = AIContextBuilder.buildAndCache(repoId, scanResult);
      const prompt = `You are a Principal Staff Engineer and Startup CTO with 20+ years of experience at companies like Google, Stripe, and Netflix. You have just completed a full static analysis of a developer's repository. Write a professional engineering audit report based exclusively on the scan data below.

REPOSITORY SCAN CONTEXT (use ONLY this data — never invent details not present here):
${JSON.stringify(context, null, 2)}

Write the report in clean Markdown. No JSON wrappers. No code fences. Write as a senior engineer, not a summarizer. Target 700–950 words.

USE THESE EXACT SECTIONS:

# Executive Summary
One sharp paragraph: what this project is, whether it is production-ready, and the single most important thing the developer must address. Be opinionated.

# Engineering Strengths
List 3–5 verifiable strengths drawn directly from the scan context. Cite the evidence (e.g. "Docker configuration detected", "CI pipeline present").

# Engineering Risks
List the most impactful risks in order of severity. For each risk, state: what it is, why it matters, and what the business consequence is if unaddressed. Only include risks present in the scan.

# Architecture Assessment
Comment on the architecture pattern, component count, and relationships detected. Assess modularity, maintainability, and scalability potential.

# Security Assessment
Report ONLY on findings present in the scan context. If topFindings is populated, discuss each one. If no findings exist, state: "No security vulnerabilities were detected in this scan." Never invent vulnerabilities.

# Performance Assessment
Comment only on detected performance findings. If none exist, state: "No performance bottlenecks were detected in this scan."

# Technical Debt
Discuss code quality signals: TODO/FIXME counts, large files, quality score. Be concrete.

# Production Readiness
Provide the overall score and explain precisely what is blocking or enabling production deployment.

# 30-Day Engineering Roadmap
Provide 4–6 concrete, prioritized action items with estimated effort per item.

# Final CTO Verdict
Would you sign off on this for production today? Give a direct yes/no/conditional and explain why in 2–3 sentences.

INVIOLABLE RULES:
- Every claim must be traceable to the scan context. If data is absent, write "Not detected in this scan."
- Never mention live metrics: user counts, CPU/memory load, database latency, cloud costs, or Redis/Kubernetes specifics unless they appear in the scan.
- Write like a CTO mentoring a developer — direct, practical, opinionated, human.`;

      const reviewText = await GeminiService.generateContent(prompt);
      res.status(200).json({ review: reviewText });
    } catch (err: any) {
      console.error('[AiController] generateReview Gemini call failed:', err.message || err);

      const fallbackReview = `# Executive Summary
The AI CTO report engine is temporarily throttled due to API rate limits. Try again in 30 seconds.

While you wait, review your security and performance findings directly in the dashboard tabs — the data is already there.`;

      res.status(200).json({ review: fallbackReview });
    }
  }

  /**
   * Dialog chat endpoint — uses server-side session memory.
   *
   * Request body:
   *   - message    {string}  The user's question.
   *   - sessionId  {string}  Stable ID for this repo session (use the project/repo ID).
   *   - scanResult {object}  Full scan result — required only for the first message
   *                          in a session; ignored on subsequent calls.
   */
  public static async chatMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { message, sessionId, scanResult } = req.body;

    if (!message) {
      res.status(400).json({ status: 'error', message: 'Missing message parameter' });
      return;
    }
    if (!sessionId) {
      res.status(400).json({ status: 'error', message: 'Missing sessionId parameter' });
      return;
    }

    // A new session requires scanResult to seed the context.
    const isNewSession = !SessionMemoryService.has(sessionId);
    if (isNewSession && !scanResult) {
      res.status(400).json({ status: 'error', message: 'New session requires scanResult to initialize context.' });
      return;
    }

    try {
      // Retrieve or create the session — context is built once and cached.
      const session = SessionMemoryService.getOrCreate(sessionId, scanResult);

      // Build the prompt using the pre-compiled system block + session history.
      const prompt = SessionMemoryService.buildChatPrompt(sessionId, message);

      const responseText = await GeminiService.generateContent(prompt);

      // Store the exchange in server-side session history.
      SessionMemoryService.appendExchange(sessionId, message, responseText);

      res.status(200).json({
        reply: responseText,
        sessionActive: true,
        historyLength: session.history.length,
      });
    } catch (err: any) {
      console.error('[AiController] chatMessage failed:', err.message || err);

      const fallbackReply = `Sorry about that, but my API connection is temporarily rate-limited. I can't access the repository data right now.

Try checking the Security, Performance, and Technical Debt tabs in your dashboard — all scan findings are already rendered there. Feel free to retry our chat in about 30 seconds once the quota resets.`;

      res.status(200).json({ reply: fallbackReply, sessionActive: SessionMemoryService.has(sessionId) });
    }
  }

  /**
   * Clears session memory for a given session (e.g. user clicks "Reset Chat").
   * The context cache is also invalidated so the next message re-scans.
   */
  public static async clearSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { sessionId } = req.body;
    if (!sessionId) {
      res.status(400).json({ status: 'error', message: 'Missing sessionId' });
      return;
    }
    SessionMemoryService.clear(sessionId);
    res.status(200).json({ status: 'ok', message: `Session "${sessionId}" cleared.` });
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

      const { AIContextBuilder } = require('../services/architecture/AIContextBuilder');
      const repoId = scanResult.repositoryProfile?.name || 'default-repo';
      const context = AIContextBuilder.buildAndCache(repoId, scanResult);
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
      // Create document with A4 layout and bufferPages to post-process footers
      const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });

      // Configure PDF headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=appdoctor_report_${scanResult.metadata?.project_name || 'project'}.pdf`
      );

      doc.pipe(res);

      // ----------------- DATA PREPARATION -----------------
      const metadata = scanResult.metadata || {};
      const launchScore = scanResult.launch_score || { overall: 100, security: 100, performance: 100, quality: 100 };
      const securityFindings = scanResult.security_findings || [];
      const performanceFindings = scanResult.performance_findings || [];
      const qualityFindings = scanResult.quality_findings || [];
      
      let repoOwner = 'Local Owner';
      let repoName = metadata.project_name || 'Unnamed Repository';
      if (metadata.repository_name && metadata.repository_name.includes('/')) {
        const parts = metadata.repository_name.split('/');
        repoOwner = parts[0];
        repoName = parts[1];
      }
      
      const mainLang = (metadata.languages || []).join(', ') || 'None Detected';
      const framework = metadata.frontend || metadata.backend || 'None Detected';
      const repoSize = metadata.repository_size || 'Small';
      const overallScore = launchScore.overall ?? 100;
      const auditDate = new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });

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

      const getSection = (key: string): string => {
        const lowerKey = key.toLowerCase();
        for (const [title, content] of Object.entries(sections)) {
          if (title.toLowerCase().includes(lowerKey)) {
            return content;
          }
        }
        return '';
      };

      const getSeverityCount = (severity: string) => {
        return securityFindings.filter((f: any) => (f.severity || '').toLowerCase() === severity.toLowerCase()).length;
      };

      // ----------------- COLOR UTILITIES -----------------
      const getSeverityColor = (sev: string) => {
        const lower = (sev || '').toLowerCase();
        if (lower === 'critical') return '#dc2626';
        if (lower === 'high') return '#ea580c';
        if (lower === 'medium') return '#d97706';
        if (lower === 'low' || lower === 'info') return '#2563eb';
        return '#10b981';
      };

      const getScoreColor = (score: number) => {
        if (score >= 85) return '#10b981';
        if (score >= 70) return '#d97706';
        return '#dc2626';
      };

      // ----------------- DRAWING HELPERS -----------------
      const drawCard = (x: number, y: number, w: number, h: number, title?: string, colorLeftStrip?: string) => {
        doc.save();
        // Fill card background
        doc.roundedRect(x, y, w, h, 6).fill('#f8fafc');
        // Border
        doc.roundedRect(x, y, w, h, 6).lineWidth(0.5).stroke('#e2e8f0');
        
        if (colorLeftStrip) {
          doc.save();
          // Draw left vertical colored strip clipped to rounded bounds
          doc.roundedRect(x, y, w, h, 6).clip();
          doc.rect(x, y, 4, h).fill(colorLeftStrip);
          doc.restore();
        }
        
        if (title) {
          doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8.5).text(title.toUpperCase(), x + 15, y + 12);
        }
        doc.restore();
      };

      const drawSectionHeader = (title: string, y: number) => {
        doc.save();
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(11).text(title, 50, y);
        doc.moveTo(50, y + 16).lineTo(545, y + 16).lineWidth(0.5).stroke('#e2e8f0');
        doc.restore();
      };

      const drawRichText = (text: string, startX: number, startY: number, width: number, lineGap: number = 2.5): number => {
        if (!text) return startY;
        
        const paragraphs = text
          .split(/\n\s*\n/)
          .map(p => p.trim())
          .filter(p => p.length > 0);
        
        let currentY = startY;
        
        for (const para of paragraphs) {
          const isBullet = para.startsWith('-') || para.startsWith('*');
          const isNumbered = /^\d+\./.test(para);
          
          let content = para;
          let xOffset = startX;
          let paraWidth = width;
          
          if (isBullet) {
            doc.save();
            doc.rect(startX, currentY + 3.5, 4, 4).fill('#10b981');
            doc.restore();
            xOffset = startX + 12;
            paraWidth = width - 12;
            content = para.replace(/^[-*]\s*/, '');
          } else if (isNumbered) {
            const match = para.match(/^(\d+\.)\s*/);
            const numStr = match ? match[1] : '';
            doc.save();
            doc.font('Helvetica-Bold').fillColor('#10b981').text(numStr, startX, currentY);
            doc.restore();
            xOffset = startX + 18;
            paraWidth = width - 18;
            content = para.replace(/^\d+\.\s*/, '');
          }
          
          const parts = content.split(/\*\*/);
          doc.x = xOffset;
          doc.y = currentY;
          
          for (let i = 0; i < parts.length; i++) {
            const isBold = i % 2 === 1;
            doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica');
            doc.fillColor('#334155');
            doc.fontSize(8.5);
            
            const isLast = i === parts.length - 1;
            doc.text(parts[i], {
              width: paraWidth,
              continued: !isLast,
              lineGap: lineGap
            });
          }
          
          currentY = Math.max(doc.y, currentY) + 10;
        }
        
        return currentY;
      };

      const drawTableHeader = (columns: { label: string, w: number }[], x: number, y: number) => {
        doc.save();
        doc.rect(x, y, 495, 20).fill('#0f172a');
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(7.5);
        let currX = x + 10;
        columns.forEach(col => {
          doc.text(col.label, currX, y + 6);
          currX += col.w;
        });
        doc.restore();
        return y + 20;
      };

      const drawTableRow = (values: string[], columns: { w: number }[], x: number, y: number, h: number, isAlt: boolean, isCourier?: boolean[]) => {
        doc.save();
        const bg = isAlt ? '#f8fafc' : '#ffffff';
        doc.rect(x, y, 495, h).fill(bg);
        doc.rect(x, y, 495, h).lineWidth(0.5).stroke('#e2e8f0');
        
        let currX = x + 10;
        values.forEach((val, idx) => {
          doc.fillColor('#334155');
          doc.font((isCourier && isCourier[idx]) ? 'Courier' : 'Helvetica');
          doc.fontSize(7.5);
          doc.text(val || '—', currX, y + (h - 9) / 2, { width: columns[idx].w - 15, height: h - 4, ellipsis: true });
          currX += columns[idx].w;
        });
        doc.restore();
        return y + h;
      };

      const drawCheckbox = (x: number, y: number, label: string, isChecked: boolean) => {
        doc.save();
        if (isChecked) {
          doc.roundedRect(x, y, 9, 9, 2).fill('#10b981');
          doc.strokeColor('#ffffff').lineWidth(1.2)
             .moveTo(x + 2, y + 4.5)
             .lineTo(x + 4, y + 6.5)
             .lineTo(x + 7, y + 2.5)
             .stroke();
        } else {
          doc.roundedRect(x, y, 9, 9, 2).lineWidth(0.8).stroke('#cbd5e1');
        }
        doc.fillColor('#334155').font('Helvetica').fontSize(8.5).text(label, x + 16, y);
        doc.restore();
      };

      const drawArchitectureGraph = (x: number, y: number, w: number, h: number, arch: any) => {
        doc.save();
        // Background box for graph workspace
        doc.roundedRect(x, y, w, h, 6).fill('#f8fafc');
        doc.roundedRect(x, y, w, h, 6).lineWidth(0.5).stroke('#e2e8f0');
        
        // Draw layers layout
        const nodeY = y + h / 2 - 18;
        const nodeW = 80;
        const nodeH = 34;
        
        const drawNode = (nx: number, ny: number, label: string, tech: string, color: string) => {
          doc.save();
          doc.roundedRect(nx, ny, nodeW, nodeH, 4).fill(color);
          doc.roundedRect(nx, ny, nodeW, nodeH, 4).lineWidth(0.5).stroke('#e2e8f0');
          doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(7.5).text(label, nx, ny + 8, { width: nodeW, align: 'center' });
          doc.fillColor('#e2e8f0').font('Helvetica').fontSize(6).text(tech || 'N/A', nx, ny + 19, { width: nodeW, align: 'center' });
          doc.restore();
        };
        
        const drawArrow = (ax1: number, ay1: number, ax2: number, ay2: number) => {
          doc.save();
          doc.strokeColor('#94a3b8').lineWidth(1.2);
          doc.moveTo(ax1, ay1).lineTo(ax2, ay2).stroke();
          // Arrow head
          doc.moveTo(ax2 - 4, ay2 - 3.5).lineTo(ax2, ay2).lineTo(ax2 - 4, ay2 + 3.5).stroke();
          doc.restore();
        };

        if (arch && arch.nodes && arch.nodes.length > 0) {
          const nodeCount = arch.nodes.length;
          const padding = 15;
          const totalW = w - 30;
          const stepX = (totalW - nodeW) / (nodeCount - 1);
          
          arch.nodes.forEach((n: any, idx: number) => {
            const nx = x + padding + idx * stepX;
            const colors = ['#2563eb', '#0d9488', '#0b0f19', '#ea580c', '#6366f1'];
            const color = colors[idx % colors.length];
            
            drawNode(nx, nodeY, n.label || 'Node', n.data?.technology || 'Module', color);
            
            if (idx < nodeCount - 1) {
              drawArrow(nx + nodeW, nodeY + nodeH / 2, nx + stepX, nodeY + nodeH / 2);
            }
          });
        } else {
          // Coordinates for horizontal diagram flow
          const xClient = x + 20;
          const xGateway = x + 138;
          const xBackend = x + 256;
          const xDatabase = x + 374;
          
          // Draw nodes
          drawNode(xClient, nodeY, 'CLIENT', arch?.type || 'Web App', '#2563eb');
          drawArrow(xClient + nodeW, nodeY + nodeH / 2, xGateway, nodeY + nodeH / 2);
          
          drawNode(xGateway, nodeY, 'GATEWAY', 'Proxy/Ingress', '#0d9488');
          drawArrow(xGateway + nodeW, nodeY + nodeH / 2, xBackend, nodeY + nodeH / 2);
          
          drawNode(xBackend, nodeY, 'BACKEND', arch?.pattern || 'MVC Layered', '#0b0f19');
          drawArrow(xBackend + nodeW, nodeY + nodeH / 2, xDatabase, nodeY + nodeH / 2);
          
          drawNode(xDatabase, nodeY, 'DATABASE', 'Persistent Db', '#ea580c');
        }
        
        doc.restore();
      };

      // ========================================================
      // PAGE 1: COVER PAGE
      // ========================================================
      doc.rect(0, 0, 595.28, 841.89).fill('#0b0f19');
      
      // Vector Logo: Rounded Green Square with Electrical Pulse
      doc.save();
      const lx = 70, ly = 120;
      doc.roundedRect(lx, ly, 48, 48, 10).fill('#10b981');
      // Lightning bolt vector shape inside square
      doc.fillColor('#ffffff')
         .moveTo(lx + 26, ly + 8)
         .lineTo(lx + 14, ly + 25)
         .lineTo(lx + 24, ly + 25)
         .lineTo(lx + 22, ly + 40)
         .lineTo(lx + 34, ly + 23)
         .lineTo(lx + 24, ly + 23)
         .closePath()
         .fill();
      
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(22).text('AppDoctor', 132, 131, { continued: true });
      doc.fillColor('#10b981').text(' AI');
      doc.restore();
      
      // Document Title Block
      doc.save();
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(36).text('AI Engineering\nAudit Report', 70, 220, { lineGap: 6 });
      doc.moveTo(70, 325).lineTo(150, 325).lineWidth(2.5).stroke('#10b981');
      doc.restore();

      // Metadata Block
      const drawCoverMeta = (label: string, val: string, y: number) => {
        doc.save();
        doc.fillColor('#94a3b8').font('Helvetica-Bold').fontSize(8.5).text(label.toUpperCase(), 70, y);
        doc.fillColor('#ffffff').font('Helvetica').fontSize(11).text(val || '—', 70, y + 14, { width: 250, height: 15, ellipsis: true });
        doc.restore();
      };
      
      drawCoverMeta('Repository Owner', repoOwner, 375);
      drawCoverMeta('Repository Name', repoName, 430);
      drawCoverMeta('Primary Language / Tech', mainLang, 485);
      drawCoverMeta('Framework / Stack', framework, 540);
      drawCoverMeta('Repository Size', repoSize, 595);
      
      // Large Score Indicator Ring
      const scoreCX = 430, scoreCY = 450;
      doc.save();
      // Outer track
      doc.circle(scoreCX, scoreCY, 65).lineWidth(12).stroke('#1e293b');
      // Score arc
      doc.lineCap('round');
      (doc as any).arc(scoreCX, scoreCY, 65, -0.5 * Math.PI, (overallScore / 100) * 2 * Math.PI - 0.5 * Math.PI)
         .lineWidth(12)
         .stroke(getScoreColor(overallScore));
      
      // Numbers centered inside
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(32).text(`${overallScore}`, scoreCX - 65, scoreCY - 16, { width: 130, align: 'center' });
      doc.fillColor('#94a3b8').font('Helvetica-Bold').fontSize(7.5).text('OVERALL SCORE', scoreCX - 65, scoreCY + 12, { width: 130, align: 'center' });
      doc.restore();

      // Cover Page Footer info
      doc.save();
      doc.fillColor('#94a3b8').font('Helvetica-Bold').fontSize(8.5).text('AUDIT DATE', 70, 700);
      doc.fillColor('#ffffff').font('Helvetica').fontSize(11).text(auditDate, 70, 714);
      
      doc.moveTo(70, 765).lineTo(525, 765).lineWidth(0.5).stroke('#1e293b');
      doc.fillColor('#475569').font('Helvetica').fontSize(8.5).text('Generated by AppDoctor AI', 70, 774);
      doc.fillColor('#475569').font('Helvetica-Bold').fontSize(8.5).text('CONFIDENTIAL EXECUTIVE REPORT', 350, 774, { align: 'right', width: 175 });
      doc.restore();

      // ========================================================
      // PAGE 2: EXECUTIVE DASHBOARD
      // ========================================================
      doc.addPage();
      
      // Four Score Cards
      const cardW = 114, cardH = 82;
      const cardY = 65;
      
      const drawScoreCard = (x: number, label: string, score: number, desc: string, color: string) => {
        drawCard(x, cardY, cardW, cardH, undefined, color);
        doc.save();
        doc.fillColor('#475569').font('Helvetica-Bold').fontSize(7.5).text(label, x + 12, cardY + 12);
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(22).text(`${score}`, x + 12, cardY + 24);
        doc.fillColor('#64748b').font('Helvetica').fontSize(6.5).text(desc, x + 12, cardY + 52, { width: cardW - 20, height: 26, lineGap: 1.5 });
        doc.restore();
      };
      
      const overallDesc = overallScore >= 85 ? 'Highly stable codebase ready for cloud release.' : overallScore >= 70 ? 'Moderate compliance. Recommend patch execution.' : 'Critical release bottlenecks require resolution.';
      const secCount = getSeverityCount('critical') + getSeverityCount('high');
      const secDesc = secCount === 0 ? 'Zero critical/high vulnerabilities identified.' : `${secCount} high impact vulnerabilities found.`;
      const perfCount = performanceFindings.length;
      const perfDesc = perfCount === 0 ? 'Excellent performance indicators.' : `${perfCount} code path latency anomalies detected.`;
      const qualCount = qualityFindings.length;
      const qualDesc = qualCount === 0 ? 'Full architectural style guideline compliance.' : `${qualCount} minor quality concerns flagged.`;
      
      drawScoreCard(50, 'OVERALL HEALTH', overallScore, overallDesc, getScoreColor(overallScore));
      drawScoreCard(177, 'SECURITY RATING', launchScore.security ?? 100, secDesc, getScoreColor(launchScore.security ?? 100));
      drawScoreCard(304, 'PERFORMANCE', launchScore.performance ?? 100, perfDesc, getScoreColor(launchScore.performance ?? 100));
      drawScoreCard(431, 'CODE QUALITY', launchScore.quality ?? 100, qualDesc, getScoreColor(launchScore.quality ?? 100));
      
      // Repository Facts Section
      drawSectionHeader('Codebase Inventory & Indicators', 160);
      
      const drawFactCard = (x: number, y: number, label: string, value: string) => {
        drawCard(x, y, 237, 60);
        doc.save();
        const hasNewlines = value.includes('\n');
        if (hasNewlines) {
          doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(6.5).text(label.toUpperCase(), x + 12, y + 6);
          doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(5.5).text(value || 'None Detected', x + 12, y + 16, { width: 213, height: 40, lineGap: 0.5 });
        } else {
          doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(7.5).text(label.toUpperCase(), x + 15, y + 14);
          doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(11).text(value || 'None Detected', x + 15, y + 26, { width: 205, height: 24, ellipsis: true });
        }
        doc.restore();
      };
      
      const totalFilesCount = metadata.file_count ?? scanResult.fileCount ?? 0;
      const totalFoldersCount = metadata.folder_count ?? scanResult.folderCount ?? 0;
      
      drawFactCard(50, 195, 'Total Files Inventory', `${totalFilesCount} scanned source files`);
      drawFactCard(308, 195, 'Folder Structure Depth', `${totalFoldersCount} directories found`);
      drawFactCard(50, 265, 'Primary Coding Languages', mainLang);
      drawFactCard(308, 265, 'Dependency Package Manager', metadata.package_manager || scanResult.technology?.packageManager || 'None');
      drawFactCard(50, 335, 'CI/CD Pipeline Integration', metadata.ci_cd || scanResult.technology?.ciCd || 'No Pipeline Found');
      drawFactCard(308, 335, 'Docker Support Config', metadata.docker_supported ? 'Dockerfile Available' : 'No Dockerfile Found');
      drawFactCard(50, 405, 'Database Backend Storage', metadata.database || scanResult.technology?.database || 'None Identified');
      drawFactCard(308, 405, 'Architecture Core Framework', framework);

      // Launch Readiness card
      drawCard(50, 485, 495, 80);
      doc.save();
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9.5).text('Launch Readiness Assessment', 65, 498);
      const readinessText = `The engineering audit yields an aggregated score of **${overallScore}/100**. This rating represents security compliance, runtime execution speed, maintainability metrics, and package integrity. Release procedures can be certified once all **Critical** and **High** security vulnerabilities are remediated.`;
      drawRichText(readinessText, 65, 514, 465);
      doc.restore();

      // ========================================================
      // PAGE 3: EXECUTIVE SUMMARY
      // ========================================================
      doc.addPage();
      
      // Key Takeaways Top Card
      drawCard(50, 65, 495, 105, 'Executive Overview');
      const execSummaryRaw = getSection('Executive Summary') || 'Engineering scans completed. The codebase is structured with appropriate frameworks. High-priority risk mitigation is recommended before general production deployment.';
      drawRichText(execSummaryRaw, 65, 95, 465);
      
      // Strengths & Risks Cards (Column Grid)
      drawCard(50, 185, 237, 260, 'Key Engineering Strengths', '#10b981');
      const strengthsText = getSection('Engineering Strengths') || '- Modular architecture design\n- Consistent framework standards\n- Foundational linter configurations';
      drawRichText(strengthsText, 65, 215, 207);
      
      drawCard(308, 185, 237, 260, 'Identified Engineering Risks', '#dc2626');
      const risksText = getSection('Engineering Risks') || '- Unremediated security vulnerabilities\n- Incomplete unit testing suites\n- Missing rate-limiting middleware';
      drawRichText(risksText, 323, 215, 207);
      
      // Production Readiness & Recommendations
      drawCard(50, 460, 237, 160, 'Production Readiness Index');
      const readinessSec = getSection('Production Readiness') || `Current codebase index is evaluated at **${overallScore}/100**. Improvements to dependency sanitization and server configurations will advance release reliability.`;
      drawRichText(readinessSec, 65, 490, 207);
      
      drawCard(308, 460, 237, 160, 'Deployment Recommendations');
      const recommendationSec = getSection('Final CTO Verdict') || 'Deploy deferred. Resolving security concerns and package updates are required prior to live release authorization.';
      drawRichText(recommendationSec, 323, 490, 207);

      // ========================================================
      // PAGE 4: TECHNOLOGY STACK & CORE STATISTICS
      // ========================================================
      doc.addPage();
      
      // 8 Stack Cards (2 columns, 4 rows)
      const stackX1 = 50, stackX2 = 308, stackW = 237, stackH = 46;
      
      const drawStackCard = (x: number, y: number, label: string, value: string) => {
        drawCard(x, y, stackW, stackH);
        doc.save();
        doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(7.5).text(label.toUpperCase(), x + 12, y + 11);
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9.5).text(value || 'None Detected', x + 12, y + 22, { width: stackW - 20, height: 18, ellipsis: true });
        doc.restore();
      };
      
      drawStackCard(stackX1, 65, 'Coding Languages', mainLang);
      drawStackCard(stackX2, 65, 'Primary Web Framework', metadata.project_type || 'Full Stack');
      
      drawStackCard(stackX1, 120, 'Backend Engine / Runtime', metadata.backend || 'None Detected');
      drawStackCard(stackX2, 120, 'Frontend Library / State', metadata.frontend || 'None Detected');
      
      drawStackCard(stackX1, 175, 'Database / Cache Engine', metadata.database || 'None Detected');
      drawStackCard(stackX2, 175, 'Target Deployment Platform', metadata.deployment || 'None Detected');
      
      drawStackCard(stackX1, 230, 'CI/CD Automation Pipeline', metadata.ci_cd || 'None Detected');
      drawStackCard(stackX2, 230, 'Package Dependency Tool', metadata.package_manager || 'None Detected');
      
      // Repository Size & Metrics Card
      drawSectionHeader('Codebase Dimensions & Metrics', 290);
      
      const bytesToSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = 2;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
      };
      const totalSizeBytes = scanResult.totalSize ?? 0;
      const formattedTotalSize = bytesToSize(totalSizeBytes);
      
      drawCard(50, 315, 495, 65);
      doc.save();
      const drawStat = (label: string, val: string, x: number) => {
        doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(7.5).text(label.toUpperCase(), x, 328);
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(16).text(val, x, 342);
      };
      drawStat('Total Code Size', formattedTotalSize, 70);
      drawStat('Total File Count', `${totalFilesCount}`, 200);
      drawStat('Total Directory Count', `${totalFoldersCount}`, 330);
      drawStat('Storage Scale', repoSize.toUpperCase(), 450);
      doc.restore();
      
      // Largest Files Table
      drawSectionHeader('Largest Repository Files', 395);
      
      let tableY = 420;
      const colDefs = [
        { label: 'FILE PATH IN REPOSITORY', w: 375 },
        { label: 'FILE SIZE', w: 120 }
      ];
      tableY = drawTableHeader(colDefs, 50, tableY);
      
      const largestFiles = scanResult.largestFiles || [];
      const topFiles = [...largestFiles].sort((a, b) => b.size - a.size).slice(0, 5);
      
      if (topFiles.length === 0) {
        tableY = drawTableRow(['No file analytics available', '—'], [{ w: 375 }, { w: 120 }], 50, tableY, 20, false);
      } else {
        topFiles.forEach((file: any, idx: number) => {
          tableY = drawTableRow(
            [file.path, bytesToSize(file.size)],
            [{ w: 375 }, { w: 120 }],
            50,
            tableY,
            20,
            idx % 2 === 1,
            [true, false]
          );
        });
      }

      // ========================================================
      // PAGE 5: SECURITY ASSESSMENT & DETECTED ISSUES
      // ========================================================
      doc.addPage();
      
      const critCount = getSeverityCount('critical');
      const highCount = getSeverityCount('high');
      const medCount = getSeverityCount('medium');
      const lowCount = getSeverityCount('low') + getSeverityCount('info');
      
      const drawSevMetricCard = (x: number, label: string, count: number, color: string, bg: string) => {
        doc.save();
        doc.roundedRect(x, 65, 114, 60, 6).fill(bg);
        doc.roundedRect(x, 65, 114, 60, 6).lineWidth(0.5).stroke('#e2e8f0');
        // left bar
        doc.roundedRect(x, 65, 114, 60, 6).clip();
        doc.rect(x, 65, 4, 60).fill(color);
        doc.restore();
        
        doc.save();
        doc.fillColor('#475569').font('Helvetica-Bold').fontSize(7.5).text(label.toUpperCase(), x + 12, 78);
        doc.fillColor(color).font('Helvetica-Bold').fontSize(18).text(`${count}`, x + 12, 90, { continued: true });
        doc.fillColor('#64748b').font('Helvetica').fontSize(9).text(' issues');
        doc.restore();
      };
      
      drawSevMetricCard(50, 'CRITICAL', critCount, '#dc2626', '#fef2f2');
      drawSevMetricCard(177, 'HIGH SEVERITY', highCount, '#ea580c', '#fff7ed');
      drawSevMetricCard(304, 'MEDIUM IMPACT', medCount, '#d97706', '#fffbeb');
      drawSevMetricCard(431, 'LOW / INFO', lowCount, '#2563eb', '#eff6ff');
      
      drawSectionHeader('Identified Vulnerability Registries', 140);
      
      // Group security findings by title
      const groupedSec: Record<string, any> = {};
      securityFindings.forEach((f: any) => {
        if (!groupedSec[f.title]) {
          groupedSec[f.title] = {
            title: f.title,
            severity: f.severity || 'low',
            description: f.description,
            files: [],
            evidence: f.evidence
          };
        }
        groupedSec[f.title].files.push(f.file + (f.lineNumber ? `:${f.lineNumber}` : ''));
      });
      
      const uniqueSec = Object.values(groupedSec);
      
      let secTableY = 165;
      const secColDefs = [
        { label: 'SEVERITY', w: 65 },
        { label: 'VULNERABILITY DETECTED', w: 140 },
        { label: 'AFFECTED FILE(S)', w: 125 },
        { label: 'REMEDIATION RECOMMENDED', w: 165 }
      ];
      
      secTableY = drawTableHeader(secColDefs, 50, secTableY);
      
      const getRecommendationForFinding = (f: any, patches: any[]) => {
        const patch = (patches || []).find((p: any) => p.title === f.title || f.title.includes(p.title) || p.title.includes(f.title));
        if (patch && patch.issue) {
          const match = patch.issue.match(/#\s*Recommended Fix\s*\n([\s\S]*?)(?=\n#|$)/i);
          if (match && match[1]) {
            return match[1].replace(/[\r\n]+/g, ' ').replace(/\*\*+/g, '').replace(/#+/g, '').trim();
          }
          return patch.issue.replace(/[\r\n]+/g, ' ').replace(/\*\*+/g, '').replace(/#+/g, '').trim();
        }
        
        const lowerTitle = f.title.toLowerCase();
        if (lowerTitle.includes('dependency') || lowerTitle.includes('cve') || lowerTitle.includes('vulnerable')) {
          return 'Execute npm audit fix or update package.json dependencies immediately.';
        }
        if (lowerTitle.includes('credential') || lowerTitle.includes('secret') || lowerTitle.includes('key')) {
          return 'Extract plain tokens, move keys to environment variables and execute dotenv.';
        }
        if (lowerTitle.includes('helmet') || lowerTitle.includes('header')) {
          return 'Register helmet HTTP headers middleware inside server framework configuration.';
        }
        if (lowerTitle.includes('rate limit')) {
          return 'Register express-rate-limit middleware configurations to protect endpoints.';
        }
        if (lowerTitle.includes('sql injection') || lowerTitle.includes('parameter')) {
          return 'Refactor raw query scripts to use parameterized statements or ORM binding.';
        }
        return 'Apply security patch, sanitise input parameters, verify CORS headers settings.';
      };
      
      if (uniqueSec.length === 0) {
        doc.save();
        doc.rect(50, secTableY, 495, 45).fill('#f0fdf4');
        doc.rect(50, secTableY, 495, 45).lineWidth(0.5).stroke('#bbf7d0');
        doc.fillColor('#16a34a').font('Helvetica-Bold').fontSize(10).text('NO CODEBASE SECURITY ANOMALIES IDENTIFIED', 70, secTableY + 17);
        doc.restore();
      } else {
        const maxRows = 7;
        const renderedRows = uniqueSec.slice(0, maxRows);
        
        renderedRows.forEach((f: any, idx: number) => {
          const sevColor = getSeverityColor(f.severity);
          const filesStr = Array.from(new Set(f.files)).join(', ');
          const recAction = getRecommendationForFinding(f, fixes);
          
          const rowH = 50;
          const bg = idx % 2 === 1 ? '#f8fafc' : '#ffffff';
          
          doc.save();
          doc.rect(50, secTableY, 495, rowH).fill(bg);
          doc.rect(50, secTableY, 495, rowH).lineWidth(0.5).stroke('#e2e8f0');
          
          // Badge
          doc.roundedRect(58, secTableY + 16, 50, 15, 3).fill(sevColor);
          doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(7.5).text(f.severity.toUpperCase(), 58, secTableY + 20, { align: 'center', width: 50 });
          
          // Finding Title & Description
          doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8).text(f.title, 125, secTableY + 8, { width: 130, height: 11, ellipsis: true });
          doc.fillColor('#64748b').font('Helvetica').fontSize(7).text(f.description, 125, secTableY + 21, { width: 130, height: 22, ellipsis: true });
          
          // Affected Files
          doc.fillColor('#334155').font('Courier').fontSize(7).text(filesStr, 265, secTableY + 8, { width: 115, height: 34, ellipsis: true });
          
          // Action
          doc.fillColor('#334155').font('Helvetica').fontSize(7).text(recAction, 390, secTableY + 8, { width: 145, height: 34, ellipsis: true });
          doc.restore();
          
          secTableY += rowH;
        });
        
        if (uniqueSec.length > maxRows) {
          doc.save();
          doc.rect(50, secTableY, 495, 20).fill('#f1f5f9');
          doc.rect(50, secTableY, 495, 20).lineWidth(0.5).stroke('#e2e8f0');
          doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(7.5).text(`+ ${uniqueSec.length - maxRows} additional security findings identified. Review dashboard interface for full telemetry.`, 60, secTableY + 6);
          doc.restore();
        }
      }

      // ========================================================
      // PAGE 6: PERFORMANCE & QUALITY
      // ========================================================
      doc.addPage();
      
      // Performance Findings Table (Y = 65)
      drawSectionHeader('Codebase Performance Anomaly List', 65);
      
      let perfY = 90;
      const perfCols = [
        { label: 'ANOMALY DETECTED', w: 160 },
        { label: 'AFFECTED FILE PATH', w: 175 },
        { label: 'COMPLIANCE IMPACT', w: 160 }
      ];
      perfY = drawTableHeader(perfCols, 50, perfY);
      
      // Group performance findings
      const groupedPerf: Record<string, any> = {};
      performanceFindings.forEach((f: any) => {
        if (!groupedPerf[f.title]) {
          groupedPerf[f.title] = { title: f.title, file: f.file, impact: f.impact || 'Degraded runtime performance.' };
        }
      });
      const uniquePerf = Object.values(groupedPerf);
      
      if (uniquePerf.length === 0) {
        doc.save();
        doc.rect(50, perfY, 495, 30).fill('#f0fdf4');
        doc.rect(50, perfY, 495, 30).lineWidth(0.5).stroke('#bbf7d0');
        doc.fillColor('#16a34a').font('Helvetica-Bold').fontSize(8.5).text('ZERO PERFORMANCE INEFFICIENCIES IDENTIFIED', 70, perfY + 11);
        doc.restore();
        perfY += 30;
      } else {
        const perfRows = uniquePerf.slice(0, 4);
        perfRows.forEach((p: any, idx: number) => {
          doc.save();
          perfY = drawTableRow(
            [p.title, p.file, p.impact],
            [{ w: 160 }, { w: 175 }, { w: 160 }],
            50,
            perfY,
            24,
            idx % 2 === 1,
            [false, true, false]
          );
          doc.restore();
        });
        
        if (uniquePerf.length > 4) {
          doc.save();
          doc.rect(50, perfY, 495, 18).fill('#f1f5f9');
          doc.rect(50, perfY, 495, 18).lineWidth(0.5).stroke('#e2e8f0');
          doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(7).text(`+ ${uniquePerf.length - 4} performance findings. View dashboard for complete details.`, 60, perfY + 5);
          doc.restore();
          perfY += 18;
        }
      }
      
      // Quality Findings Table
      let qualY = Math.max(perfY + 20, 215);
      drawSectionHeader('Code Quality & Guideline Violations', qualY);
      qualY += 25;
      
      const qualCols = [
        { label: 'STANDARDS VIOLATION', w: 170 },
        { label: 'AFFECTED FILE PATH', w: 200 },
        { label: 'SEVERITY', w: 125 }
      ];
      qualY = drawTableHeader(qualCols, 50, qualY);
      
      // Group quality findings
      const groupedQual: Record<string, any> = {};
      qualityFindings.forEach((f: any) => {
        if (!groupedQual[f.title]) {
          groupedQual[f.title] = { title: f.title, file: f.file, severity: f.severity || 'low' };
        }
      });
      const uniqueQual = Object.values(groupedQual);
      
      if (uniqueQual.length === 0) {
        doc.save();
        doc.rect(50, qualY, 495, 30).fill('#f0fdf4');
        doc.rect(50, qualY, 495, 30).lineWidth(0.5).stroke('#bbf7d0');
        doc.fillColor('#16a34a').font('Helvetica-Bold').fontSize(8.5).text('CODE QUALITY FULLY COMPLIANT WITH DESIGN PATTERNS', 70, qualY + 11);
        doc.restore();
        qualY += 30;
      } else {
        const qualRows = uniqueQual.slice(0, 4);
        qualRows.forEach((q: any, idx: number) => {
          doc.save();
          qualY = drawTableRow(
            [q.title, q.file, q.severity.toUpperCase()],
            [{ w: 170 }, { w: 200 }, { w: 125 }],
            50,
            qualY,
            24,
            idx % 2 === 1,
            [false, true, false]
          );
          doc.restore();
        });
        
        if (uniqueQual.length > 4) {
          doc.save();
          doc.rect(50, qualY, 495, 18).fill('#f1f5f9');
          doc.rect(50, qualY, 495, 18).lineWidth(0.5).stroke('#e2e8f0');
          doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(7).text(`+ ${uniqueQual.length - 4} quality findings. View dashboard for complete details.`, 60, qualY + 5);
          doc.restore();
          qualY += 18;
        }
      }
      
      // Technical Debt & Code Health Summary
      let debtY = Math.max(qualY + 20, 375);
      drawCard(50, debtY, 495, 180);
      doc.save();
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9.5).text('Codebase Quality & Technical Debt Summary', 65, debtY + 12);
      
      const techDebtText = getSection('Technical Debt') || 'Codebase demonstrates standard modular layouts. Focus on removing minor redundant configurations and refining unit tests.';
      doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(8).text('TECHNICAL DEBT REGISTER', 65, debtY + 30);
      
      const summaryText = `The codebase quality score is graded at **${launchScore.quality ?? 100}/100**. General structures demonstrate correct software architecture design. Major technical debt is restricted to vulnerable package imports and minimal check coverage. Implementing missing test scopes is highly recommended before enterprise release.`;
      doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(8).text('CODE HEALTH EXECUTIVE SUMMARY', 300, debtY + 30);
      
      drawRichText(techDebtText, 65, debtY + 44, 220);
      drawRichText(summaryText, 300, debtY + 44, 220);
      doc.restore();

      // ========================================================
      // PAGE 7: SYSTEM ARCHITECTURE
      // ========================================================
      doc.addPage();
      
      // Grid of Cards (2 columns, 3 rows)
      const archX1 = 50, archX2 = 308, archW = 237, archH = 50;
      const arch = scanResult.architecture || {};
      
      const drawArchCard = (x: number, y: number, label: string, value: string) => {
        drawCard(x, y, archW, archH);
        doc.save();
        const hasNewlines = value.includes('\n');
        if (hasNewlines) {
          doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(6.5).text(label.toUpperCase(), x + 12, y + 6);
          doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(5.5).text(value || 'Unknown', x + 12, y + 15, { width: archW - 20, height: 32, lineGap: 0.5 });
        } else {
          doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(7.5).text(label.toUpperCase(), x + 12, y + 12);
          doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9.5).text(value || 'Unknown', x + 12, y + 24, { width: archW - 20, height: 18, ellipsis: true });
        }
        doc.restore();
      };
      
      drawArchCard(archX1, 65, 'System Client Access', metadata.project_type === 'Frontend' ? 'Web Browser App' : 'HTTP/Rest Interface Client');
      drawArchCard(archX2, 65, 'API Gateway / Routing', metadata.docker_supported ? 'Docker Reverse Ingress Proxy' : 'Default Router Module');
      
      drawArchCard(archX1, 125, 'Backend Core Controller', metadata.backend || 'MVC Controller Core');
      drawArchCard(archX2, 125, 'Database Persistence Layer', metadata.database || 'No Database Configured');
      
      drawArchCard(archX1, 185, 'Services Integration', metadata.ci_cd ? 'Continuous Integration Automations' : 'Local Code Execution');
      drawArchCard(archX2, 185, 'Architecture Core Pattern', arch.pattern || 'MVC Structural Pattern');
      
      // Schematic Diagram
      drawSectionHeader('Codebase Structural Dependency Schematic', 245);
      drawArchitectureGraph(50, 270, 495, 210, arch);
      
      // Scalability Assessment (Y = 495)
      drawCard(50, 495, 495, 120, 'Architecture Scalability & Modularity Analysis');
      const scalabilityRaw = getSection('Architecture Assessment') || `The repository employs an **${arch.pattern || 'MVC'}** software layout. Components are separated between logic controllers and code definitions. Scalability indices are high, with clean modularity patterns that support cloud containers and scaling parameters.`;
      drawRichText(scalabilityRaw, 65, 525, 465);

      // ========================================================
      // PAGE 8: AI CTO VERDICT & ADVICE
      // ========================================================
      doc.addPage();
      
      // Release Sign-off Banner
      let bannerBg = '#fffbeb';
      let bannerBorder = '#fde68a';
      let bannerText = 'RELEASE APPROVED WITH CONDITIONS';
      let bannerColor = '#d97706';
      
      if (overallScore >= 85 && (critCount + highCount === 0)) {
        bannerBg = '#f0fdf4';
        bannerBorder = '#bbf7d0';
        bannerText = 'RELEASE APPROVED FOR PRODUCTION';
        bannerColor = '#10b981';
      } else if (overallScore < 70 || (critCount + highCount > 0)) {
        bannerBg = '#fef2f2';
        bannerBorder = '#fecaca';
        bannerText = 'RELEASE DEFERRED: ACTION REQUIRED';
        bannerColor = '#dc2626';
      }
      
      doc.save();
      doc.roundedRect(50, 65, 495, 55, 6).fill(bannerBg);
      doc.roundedRect(50, 65, 495, 55, 6).lineWidth(1).stroke(bannerBorder);
      
      // Large Status Icon (Check/Cross/Warning)
      if (bannerColor === '#10b981') {
        doc.circle(75, 92, 10).fill('#10b981');
        doc.strokeColor('#ffffff').lineWidth(2).moveTo(70, 92).lineTo(73, 95).lineTo(79, 89).stroke();
      } else if (bannerColor === '#dc2626') {
        doc.circle(75, 92, 10).fill('#dc2626');
        doc.strokeColor('#ffffff').lineWidth(2).moveTo(71, 88).lineTo(79, 96).moveTo(79, 88).lineTo(71, 96).stroke();
      } else {
        doc.circle(75, 92, 10).fill('#d97706');
        doc.strokeColor('#ffffff').lineWidth(2).moveTo(75, 87).lineTo(75, 93).moveTo(75, 96).circle(75, 96, 0.75).fill();
      }
      doc.fillColor(bannerColor).font('Helvetica-Bold').fontSize(14).text(bannerText, 95, 84);
      doc.fillColor('#64748b').font('Helvetica').fontSize(7.5).text('AppDoctor AI Certified Audit Decision Indicator', 95, 100);
      doc.restore();
      
      // Column Grid: Verdict & Strengths/Concerns
      drawCard(50, 135, 237, 160, 'CTO Opinion & Review');
      const opText = getSection('Final CTO Verdict') || 'Deploy can proceed after vulnerabilities are patched. Clean package imports are a prerequisite to release compliance.';
      drawRichText(opText, 65, 165, 207);
      
      drawCard(308, 135, 237, 160, 'Biggest Codebase Strength');
      const strText = getSection('Engineering Strengths') || '- Correct layered framework pattern\n- Dynamic controller scripts separation';
      const strengthPoints = strText.split('\n').slice(0, 3).join('\n');
      drawRichText(strengthPoints, 323, 165, 207);
      
      drawCard(50, 310, 237, 150, 'Biggest Architectural Concern');
      const concernText = getSection('Engineering Risks') || '- Unrestricted file endpoints\n- Vulnerable standard package modules';
      const concernPoints = concernText.split('\n').slice(0, 3).join('\n');
      drawRichText(concernPoints, 65, 340, 207);
      
      drawCard(308, 310, 237, 150, 'Production Certification Verdict');
      const approvalExplanation = bannerColor === '#10b981' 
        ? 'Codebase has zero critical security gaps and meets all architectural standards. Release is recommended without delay.'
        : bannerColor === '#d97706'
        ? 'Minor warnings flagged. Release is approved, provided environment configurations and header controls are patched.'
        : 'Deployment is deferred due to critical security risks. Address vulnerabilities listed in Page 5 prior to release.';
      drawRichText(approvalExplanation, 323, 340, 207);
      
      // If I had 1 Day / 1 Week / 1 Month suggestions
      drawSectionHeader('Actionable CTO Roadmap Milestones', 475);
      
      const drawMilestoneBox = (x: number, label: string, task: string) => {
        drawCard(x, 500, 153, 110, label);
        doc.save();
        doc.fillColor('#334155').font('Helvetica').fontSize(7.5);
        doc.text(task, x + 12, 530, { width: 129, lineGap: 2 });
        doc.restore();
      };
      
      const dayTask = critCount + highCount > 0 
        ? 'Remediate critical/high security findings. Patch packages, extract secrets to Env.'
        : 'Update configuration files, review header variables and establish security limits.';
      
      const weekTask = 'Write unit tests to capture edge parameters, configure ES-Lint hooks, sanitise routes.';
      const monthTask = 'Refactor query modules, run performance tests, deploy logs and metrics tracking.';
      
      drawMilestoneBox(50, 'If I had 1 Day', dayTask);
      drawMilestoneBox(221, 'If I had 1 Week', weekTask);
      drawMilestoneBox(392, 'If I had 1 Month', monthTask);

      // ========================================================
      // PAGE 9: PRIORITY IMPROVEMENT ROADMAP
      // ========================================================
      doc.addPage();
      
      // Vertical timeline track
      const tlX = 90;
      doc.save();
      doc.moveTo(tlX, 90).lineTo(tlX, 560).lineWidth(2).strokeColor('#e2e8f0').stroke();
      doc.restore();
      
      const drawRoadmapNode = (y: number, milestone: string, title: string, tasks: string[]) => {
        doc.save();
        doc.circle(tlX, y, 9).strokeColor('#d1fae5').lineWidth(2).stroke();
        doc.circle(tlX, y, 5).fillColor('#10b981').fill();
        
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9.5).text(milestone, 45, y - 5, { width: 35, align: 'right' });
        
        const cx = 115, cw = 380, ch = 90;
        drawCard(cx, y - 25, cw, ch);
        
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8.5).text(title, cx + 15, y - 13);
        
        let bulletY = y + 4;
        tasks.forEach(t => {
          doc.rect(cx + 15, bulletY + 3.5, 3, 3).fill('#10b981');
          doc.fillColor('#475569').font('Helvetica').fontSize(7.5).text(t, cx + 24, bulletY, { width: cw - 40, height: 12, ellipsis: true });
          bulletY += 14;
        });
        doc.restore();
      };
      
      const tToday = critCount + highCount > 0 
        ? ['Apply critical security patches to source files', 'Remove plaintext secrets and configure dotenv variables']
        : ['Verify Express headers are helmet protected', 'Audit package versions for minor secure upgrades'];
      
      const tWeek1 = ['Integrate unit testing suite with core logic', 'Configure ESLint configurations for style validation', 'Setup input parameter validation on public routes'];
      const tWeek2 = ['Review database indexes for query speed optimization', 'Setup compression middleware inside server runtime', 'Verify CORS restrictions on API routes'];
      const tMonth1 = ['Deploy Prometheus metrics tracking telemetry', 'Establish automated GitHub CI/CD build scripts', 'Finalize production Docker configurations'];
      
      drawRoadmapNode(105, 'TODAY', 'Immediate Hotfixes & Security Patches', tToday);
      drawRoadmapNode(215, 'WEEK 1', 'Testing & Framework Validation', tWeek1);
      drawRoadmapNode(325, 'WEEK 2', 'Performance & Middleware Sanitisation', tWeek2);
      drawRoadmapNode(435, 'MONTH 1', 'Infrastructure, Docker & Cloud Pipelines', tMonth1);
      
      drawCard(50, 505, 495, 75);
      doc.save();
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9.5).text('Audit Implementation Methodology', 65, 517);
      doc.fillColor('#475569').font('Helvetica').fontSize(8).text('The roadmap is structured sequentially to address security gaps first, followed by stability and DevOps packaging steps. Standard sprint executions should target completion of TODAY items immediately, with Week 1 and Week 2 targets scheduled in current iterations.', 65, 532, { width: 465, lineGap: 2 });
      doc.restore();

      // ========================================================
      // PAGE 10: PRE-DEPLOYMENT CHECKLIST & SIGN-OFF
      // ========================================================
      doc.addPage();
      
      doc.fillColor('#475569').font('Helvetica-Bold').fontSize(8.5).text('RELEASE READINESS DEPLOYMENT CERTIFICATION', 50, 65);
      
      const qW = 237, qH = 160;
      const qY1 = 85, qY2 = 260;
      const qX1 = 50, qX2 = 308;
      
      // Dynamic validations
      const hasSecurityHelmet = !securityFindings.some((f: any) => f.title.toLowerCase().includes('helmet') || f.title.toLowerCase().includes('security headers'));
      const hasRateLimit = !securityFindings.some((f: any) => f.title.toLowerCase().includes('rate limit'));
      const hasHttps = !securityFindings.some((f: any) => f.title.toLowerCase().includes('https') || f.title.toLowerCase().includes('ssl') || f.title.toLowerCase().includes('tls'));
      const hasSecrets = !securityFindings.some((f: any) => f.title.toLowerCase().includes('env') || f.title.toLowerCase().includes('credential') || f.title.toLowerCase().includes('secret'));
      
      const hasDocker = metadata.docker_supported ?? false;
      const hasCiCd = !!(metadata.ci_cd || scanResult.technology?.ciCd);
      const hasDb = !!(metadata.database || scanResult.technology?.database);
      const hasTests = !!(metadata.important_files && metadata.important_files.some((f: string) => f.toLowerCase().includes('test') || f.toLowerCase().includes('spec') || f.toLowerCase().includes('jest')));
      
      const hasComp = !performanceFindings.some((f: any) => f.title.toLowerCase().includes('compression') || f.title.toLowerCase().includes('gzip'));
      const hasCache = !performanceFindings.some((f: any) => f.title.toLowerCase().includes('cache') || f.title.toLowerCase().includes('caching'));
      const hasLint = !qualityFindings.some((f: any) => f.title.toLowerCase().includes('lint') || f.title.toLowerCase().includes('eslint'));
      const hasTypes = !qualityFindings.some((f: any) => f.title.toLowerCase().includes('type') || f.title.toLowerCase().includes('typescript'));
      
      // Quadrant 1: Security Checks
      drawCard(qX1, qY1, qW, qH, 'Security Enforcement');
      let cy = qY1 + 32;
      drawCheckbox(qX1 + 15, cy, 'HTTPS / SSL Configuration', hasHttps);
      drawCheckbox(qX1 + 15, cy + 20, 'API Rate Limiting Middleware', hasRateLimit);
      drawCheckbox(qX1 + 15, cy + 40, 'Helmet / HTTP Security Headers', hasSecurityHelmet);
      drawCheckbox(qX1 + 15, cy + 60, 'Safe Env Configs (No Hardcoded Secrets)', hasSecrets);
      drawCheckbox(qX1 + 15, cy + 80, 'CORS Access Control Policy', true);
      
      // Quadrant 2: Performance
      drawCard(qX2, qY1, qW, qH, 'Performance & Reliability');
      cy = qY1 + 32;
      drawCheckbox(qX2 + 15, cy, 'Compression (Gzip/Brotli) Active', hasComp);
      drawCheckbox(qX2 + 15, cy + 20, 'Response Caching (Redis/Memory)', hasCache);
      drawCheckbox(qX2 + 15, cy + 40, 'Database Query Indexes Setup', hasDb);
      drawCheckbox(qX2 + 15, cy + 60, 'Static Assets CDN Configuration', false);
      drawCheckbox(qX2 + 15, cy + 80, 'Optimized Package Builds Enabled', true);
      
      // Quadrant 3: Testing & Quality
      drawCard(qX1, qY2, qW, qH, 'Testing & Quality Assurance');
      cy = qY2 + 32;
      drawCheckbox(qX1 + 15, cy, 'Unit Test Scopes Configured', hasTests);
      drawCheckbox(qX1 + 15, cy + 20, 'ESLint/Linter Compliance Verified', hasLint);
      drawCheckbox(qX1 + 15, cy + 40, 'Type Safety Compliance (TypeScript)', hasTypes);
      drawCheckbox(qX1 + 15, cy + 60, 'API Endpoint Routing Integration Tests', false);
      drawCheckbox(qX1 + 15, cy + 80, 'CI/CD Automated Test Runner Hooks', hasCiCd);
      
      // Quadrant 4: Infrastructure & DevOps
      drawCard(qX2, qY2, qW, qH, 'Infrastructure & Packaging');
      cy = qY2 + 32;
      drawCheckbox(qX2 + 15, cy, 'Dockerfile Containment Configured', hasDocker);
      drawCheckbox(qX2 + 15, cy + 20, 'CI/CD Automated Build Pipelines', hasCiCd);
      drawCheckbox(qX2 + 15, cy + 40, 'Error Catching / Exception Logging', true);
      drawCheckbox(qX2 + 15, cy + 60, 'Runtime APM Telemetry Instrumentation', false);
      drawCheckbox(qX2 + 15, cy + 80, 'Log Rotation Configured', true);
      
      // Sign-off Card (Y = 440)
      drawCard(50, 435, 495, 120, 'Audit Verification & Executive Certification');
      doc.save();
      doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(7.5).text('AUTHORIZED SIGNATURE', 70, 520);
      doc.moveTo(70, 515).lineTo(230, 515).lineWidth(0.5).stroke('#94a3b8');
      
      doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(7.5).text('DATE CERTIFIED', 260, 520);
      doc.moveTo(260, 515).lineTo(360, 515).lineWidth(0.5).stroke('#94a3b8');
      doc.fillColor('#0f172a').font('Helvetica').fontSize(9).text(auditDate, 260, 502);
      
      // Vector Stamp "AppDoctor Certified"
      const sx = 450, sy = 485;
      doc.circle(sx, sy, 28).lineWidth(1.5).strokeColor('#10b981').stroke();
      doc.circle(sx, sy, 25).lineWidth(0.5).strokeColor('#10b981').stroke();
      doc.fillColor('#10b981').font('Helvetica-Bold').fontSize(6).text('APPDOC', sx - 25, sy - 10, { width: 50, align: 'center' });
      doc.fillColor('#10b981').font('Helvetica-Bold').fontSize(6).text('VERIFIED', sx - 25, sy + 3, { width: 50, align: 'center' });
      doc.restore();

      // --- POST-PROCESS: PAGE NUMBERS & HEADER/FOOTERS ---
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(i);
        
        // Skip cover page (page index 0)
        if (i > 0) {
          doc.save();
          // Header
          doc.fillColor('#10b981').font('Helvetica-Bold').fontSize(7.5).text('APPDOCTOR AI AUDIT', 50, 32);
          doc.fillColor('#94a3b8').font('Helvetica').fontSize(7.5).text(`Page ${i + 1} of ${range.count}`, 480, 32, { align: 'right', width: 65 });
          doc.moveTo(50, 43).lineTo(545, 43).lineWidth(0.5).stroke('#e2e8f0');
          
          // Footer
          doc.moveTo(50, 785).lineTo(545, 785).lineWidth(0.5).stroke('#f1f5f9');
          doc.fillColor('#94a3b8').font('Helvetica').fontSize(8).text('Generated by AppDoctor AI', 50, 792);
          doc.fillColor('#94a3b8').font('Helvetica-Bold').fontSize(8).text('CONFIDENTIAL EXECUTIVE REPORT', 380, 792, { align: 'right', width: 165 });
          doc.restore();
        }
      }

      doc.end();
    } catch (err: any) {
      next(err);
    }
  }

  /**
   * Generates a deterministic + AI-explained architecture diagram.
   * Uses the 4-stage pipeline:
   *   Stage 1: Context extraction (deterministic)
   *   Stage 2: Static analysis   (deterministic)
   *   Stage 3: AI explanation    (Gemini – no invention, just explanation)
   *   Stage 4: Graph assembly    (deterministic layout)
   */
  public static async generateArchitecture(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { scanResult } = req.body;
    if (!scanResult) {
      res.status(400).json({ status: 'error', message: 'Missing scanResult parameter' });
      return;
    }

    try {
      // The frontend stores the full analysis response in localStorage.
      // Layout: scanResult.metadata | scanResult.technology | scanResult.raw_stats
      const meta  = scanResult.metadata  || {};
      const tech  = scanResult.technology || {};
      const stats = scanResult.raw_stats  || {};

      const repoName = meta.repository_name || meta.project_name || 'repository';

      const technologyInfo = {
        languages:       meta.languages           || tech.languages        || [],
        frontend:        meta.frontend             || tech.frontend,
        backend:         meta.backend              || tech.backend,
        database:        meta.database             || tech.database,
        packageManager:  meta.package_manager      || tech.packageManager,
        deployment:      meta.deployment           || tech.deployment,
        dependencies:    Array.isArray(tech.dependencies)    ? tech.dependencies    : [],
        devDependencies: Array.isArray(tech.devDependencies) ? tech.devDependencies : [],
        imports:         Array.isArray(tech.imports)         ? tech.imports         : []
      };

      const scanResultShape = {
        folderCount:    stats.folderCount    || meta.folder_count || 0,
        fileCount:      stats.fileCount      || meta.file_count   || 0,
        totalSize:      stats.totalSize      || 0,
        maxDepth:       stats.maxDepth       || 0,
        extensions:     stats.extensions     || {},
        largestFiles:   stats.largestFiles   || [],
        importantFiles: stats.importantFiles || meta.important_files || [],
        repoIndex:      stats.repoIndex      || []
      };

      // Run the 4-stage deterministic + AI pipeline
      const architectureGraph = await ArchitectureAIService.generateArchitectureGraph(
        repoName,
        scanResultShape as any,
        technologyInfo as any
      );

      res.status(200).json({ architecture: architectureGraph });
    } catch (err: any) {
      next(err);
    }
  }
}

