import { PDFDocument } from "pdf-lib";
import Anthropic from "@anthropic-ai/sdk";
import { readFile, writeFile, mkdir } from "fs/promises";
import { basename, dirname, join } from "path";

const client = new Anthropic();
const CONCURRENCY = 10;

const SYSTEM_PROMPT = `You are an expert at extracting structured information from summer camp brochures.
Your task is to extract camp descriptions and convert them to clean, semantic markdown.

For each camp you find on the page, extract:
- Camp name (as a heading)
- Age range
- Dates and times
- Location
- Fee/cost
- Description of activities

Format the output as clean markdown. Use headings, bullet points, and proper formatting.
If a page contains no camp information (e.g., it's a cover page, table of contents, or general info),
summarize what the page contains briefly.

Be thorough and capture all camps listed on the page.`;

class Semaphore {
  private permits: number;
  private queue: (() => void)[] = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }
    return new Promise((resolve) => this.queue.push(resolve));
  }

  release(): void {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.permits++;
    }
  }
}

async function processPageWithClaude(
  pdfBytes: Uint8Array,
  pageNum: number
): Promise<string> {
  const base64Pdf = Buffer.from(pdfBytes).toString("base64");

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64Pdf,
            },
          },
          {
            type: "text",
            text: `Extract all summer camp information from this PDF page (page ${pageNum}). Convert to clean, semantic markdown.`,
          },
        ],
      },
    ],
    system: SYSTEM_PROMPT,
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock ? textBlock.text : "";
}

async function splitPdfToMarkdown(inputPath: string, outputDir?: string) {
  const pdfBytes = await readFile(inputPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pageCount = pdfDoc.getPageCount();

  const baseName = basename(inputPath, ".pdf");
  const outDir = outputDir || join(dirname(inputPath), `${baseName}-pages`);

  await mkdir(outDir, { recursive: true });

  console.log(
    `Processing ${inputPath} (${pageCount} pages) with Claude API...`
  );
  console.log(`Concurrency: ${CONCURRENCY}\n`);

  const semaphore = new Semaphore(CONCURRENCY);
  const results: { pageNum: number; markdown: string }[] = [];
  let completed = 0;

  const tasks = Array.from({ length: pageCount }, async (_, i) => {
    const pageNum = i + 1;

    // Create single-page PDF
    const newPdf = await PDFDocument.create();
    const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
    newPdf.addPage(copiedPage);
    const newPdfBytes = await newPdf.save();

    // Save individual page PDF
    const pdfPath = join(outDir, `${baseName}-page-${pageNum}.pdf`);
    await writeFile(pdfPath, newPdfBytes);

    // Acquire semaphore before API call
    await semaphore.acquire();

    try {
      const pageMarkdown = await processPageWithClaude(
        new Uint8Array(newPdfBytes),
        pageNum
      );

      // Save individual page markdown
      const mdPath = join(outDir, `${baseName}-page-${pageNum}.md`);
      const fullPageMarkdown = `# Page ${pageNum}\n\n${pageMarkdown}`;
      await writeFile(mdPath, fullPageMarkdown);

      results.push({ pageNum, markdown: fullPageMarkdown });
      completed++;
      console.log(`  ✓ Page ${pageNum}/${pageCount} (${completed} completed)`);
    } finally {
      semaphore.release();
    }
  });

  await Promise.all(tasks);

  // Sort by page number and combine
  results.sort((a, b) => a.pageNum - b.pageNum);
  const combinedPath = join(outDir, `${baseName}-combined.md`);
  await writeFile(
    combinedPath,
    results.map((r) => r.markdown).join("\n\n---\n\n")
  );

  console.log(`\nDone!`);
  console.log(`  - ${pageCount} individual PDFs`);
  console.log(`  - ${pageCount} individual markdown files`);
  console.log(`  - Combined markdown: ${combinedPath}`);
}

const inputFile = process.argv[2];
const outputDir = process.argv[3];

if (!inputFile) {
  console.error("Usage: bun scripts/split-pdf.ts <input.pdf> [output-dir]");
  process.exit(1);
}

splitPdfToMarkdown(inputFile, outputDir).catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
