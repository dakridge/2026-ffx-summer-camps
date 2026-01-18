import { readFile, writeFile } from "fs/promises";

const MARKDOWN_FILE = "data/sumer-camps-pages/sumer-camps-combined.md";
const CAMPS_JSON_FILE = "data/fcpa-camps.json";
const OUTPUT_FILE = "data/fcpa-camps-enriched.json";

interface CampDescription {
  name: string;
  description: string;
  codes: string[];
}

// Normalize camp title for fuzzy matching
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/-sp\b/gi, "") // Remove spring suffix
    .replace(/\s*\([^)]*\)\s*/g, "") // Remove parenthetical age ranges like "(7-14yrs)"
    .replace(/[^\w\s]/g, "") // Remove punctuation
    .replace(/\s+/g, " ") // Normalize whitespace
    .replace(/\b(new|camp|workshop)\b/gi, "") // Remove common words
    .trim();
}

// Simple similarity score (Jaccard index on words)
function similarity(a: string, b: string): number {
  const wordsA = new Set(normalizeTitle(a).split(" ").filter(w => w.length > 2));
  const wordsB = new Set(normalizeTitle(b).split(" ").filter(w => w.length > 2));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;

  return intersection / union;
}

function parseMarkdown(content: string): CampDescription[] {
  const camps: CampDescription[] = [];

  // Helper to extract camp info from a block
  function extractCampInfo(name: string, block: string): CampDescription | null {
    if (!name || name.startsWith("#")) return null;

    // Extract description - handle multiple formats
    let description = "";

    // Format 1: **Description:** on same line
    const descMatch1 = block.match(/\*\*Description:\*\*\s*([^\n]+(?:\n(?!\*\*|\||---|-\s\*\*|###)[^\n]+)*)/);
    if (descMatch1) {
      description = descMatch1[1].trim();
    }

    // Format 2: - **Description:** bullet point
    if (!description) {
      const descMatch2 = block.match(/-\s*\*\*Description:\*\*\s*([^\n]+(?:\n(?!\*\*|\||---|-\s\*\*|###)[^\n]+)*)/);
      if (descMatch2) {
        description = descMatch2[1].trim();
      }
    }

    if (!description) return null;

    // Extract codes from tables - look for pattern like | CODE.HERE |
    const codePattern = /\|\s*([A-Z0-9]{2,4}\.[A-Z0-9]{4})\s*\|/gi;
    const codes: string[] = [];
    let match;
    while ((match = codePattern.exec(block)) !== null) {
      codes.push(match[1].toUpperCase());
    }

    // Also extract codes from bullet format: - **Code:** XXX
    const bulletCodePattern = /-\s*\*\*Code:\*\*\s*([A-Z0-9]{2,4}\.[A-Z0-9]{4})/gi;
    while ((match = bulletCodePattern.exec(block)) !== null) {
      codes.push(match[1].toUpperCase());
    }

    return { name, description, codes };
  }

  // Split by ## headings first
  const h2Blocks = content.split(/^## /gm).slice(1);

  for (const h2Block of h2Blocks) {
    const lines = h2Block.split("\n");
    const h2Name = lines[0]?.trim();

    // Check if this block has ### subsections with their own descriptions
    const h3Sections = h2Block.split(/^### /gm);

    // First part is the main ## section content (before any ###)
    const mainContent = h3Sections[0];
    const mainCamp = extractCampInfo(h2Name, mainContent);
    if (mainCamp) {
      camps.push(mainCamp);
    }

    // Process ### subsections
    for (let i = 1; i < h3Sections.length; i++) {
      const h3Block = h3Sections[i];
      const h3Lines = h3Block.split("\n");
      const h3Name = h3Lines[0]?.trim();

      const subCamp = extractCampInfo(h3Name, h3Block);
      if (subCamp) {
        camps.push(subCamp);
      }
    }
  }

  return camps;
}

async function main() {
  console.log("Reading markdown file...");
  const markdown = await readFile(MARKDOWN_FILE, "utf-8");

  console.log("Parsing camp descriptions...");
  const descriptions = parseMarkdown(markdown);

  // Build code -> description lookup
  const codeToDescription = new Map<string, { name: string; description: string }>();
  for (const camp of descriptions) {
    for (const code of camp.codes) {
      codeToDescription.set(code, { name: camp.name, description: camp.description });
    }
  }

  // Build name -> description lookup for fuzzy matching
  const nameToDescription = new Map<string, string>();
  for (const camp of descriptions) {
    // Use normalized name as key, but also keep original for exact matches
    nameToDescription.set(camp.name.toLowerCase(), camp.description);
    nameToDescription.set(normalizeTitle(camp.name), camp.description);
  }

  console.log(`Found ${descriptions.length} camp descriptions with ${codeToDescription.size} unique codes`);

  // Read camps JSON
  console.log("Reading camps JSON...");
  const campsData = JSON.parse(await readFile(CAMPS_JSON_FILE, "utf-8"));

  // Enrich camps
  let matchedByCode = 0;
  let matchedByName = 0;
  let unmatched = 0;
  const unmatchedCamps: { title: string; catalogId: string }[] = [];

  for (const sheetName of Object.keys(campsData)) {
    const sheet = campsData[sheetName];
    if (!sheet.camps) continue;

    for (const camp of sheet.camps) {
      const catalogId = camp.catalogId?.toUpperCase();
      const title = camp.title as string;

      // Try matching by code first
      if (catalogId && codeToDescription.has(catalogId)) {
        const info = codeToDescription.get(catalogId)!;
        camp.description = info.description;
        matchedByCode++;
        continue;
      }

      // Try exact name match
      if (nameToDescription.has(title.toLowerCase())) {
        camp.description = nameToDescription.get(title.toLowerCase())!;
        matchedByName++;
        continue;
      }

      // Try normalized name match
      const normalizedTitle = normalizeTitle(title);
      if (nameToDescription.has(normalizedTitle)) {
        camp.description = nameToDescription.get(normalizedTitle)!;
        matchedByName++;
        continue;
      }

      // Try fuzzy matching with similarity threshold
      let bestMatch: { name: string; description: string; score: number } | null = null;
      for (const desc of descriptions) {
        const score = similarity(title, desc.name);
        if (score > 0.6 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { name: desc.name, description: desc.description, score };
        }
      }

      if (bestMatch) {
        camp.description = bestMatch.description;
        matchedByName++;
        continue;
      }

      unmatched++;
      if (unmatchedCamps.length < 30) {
        unmatchedCamps.push({ title, catalogId });
      }
    }
  }

  console.log(`\nResults:`);
  console.log(`  Matched by code: ${matchedByCode} camps`);
  console.log(`  Matched by name: ${matchedByName} camps`);
  console.log(`  Total matched: ${matchedByCode + matchedByName} camps`);
  console.log(`  Unmatched: ${unmatched} camps`);

  if (unmatchedCamps.length > 0) {
    console.log(`\nSample unmatched camps:`);
    unmatchedCamps.forEach(c => console.log(`  - ${c.title}`));
  }

  // Write enriched JSON
  console.log(`\nWriting enriched JSON to ${OUTPUT_FILE}...`);
  await writeFile(OUTPUT_FILE, JSON.stringify(campsData, null, 2));

  console.log("Done!");
}

main().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
