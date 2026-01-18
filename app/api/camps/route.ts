import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET() {
  const dataPath = path.join(process.cwd(), "data", "fcpa-camps-enriched.json");
  const data = await fs.readFile(dataPath, "utf-8");
  const campsData = JSON.parse(data);

  return NextResponse.json(campsData["2026 FCPA Camps"]);
}
