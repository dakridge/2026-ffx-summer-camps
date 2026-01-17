import { rmSync, mkdirSync, cpSync } from "fs";

// Clean dist directory
rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });
mkdirSync("dist/api", { recursive: true });

// Build the frontend
const result = await Bun.build({
  entrypoints: ["./index.html"],
  outdir: "./dist",
  minify: true,
  sourcemap: "none",
});

if (!result.success) {
  console.error("Build failed:");
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

// Copy the camps data as static JSON for the API
const campsData = await Bun.file("data/fcpa-camps.json").json();
await Bun.write("dist/api/camps.json", JSON.stringify(campsData["2026 FCPA Camps"]));

console.log("Build complete! Output in dist/");
