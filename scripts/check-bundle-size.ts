#!/usr/bin/env bun
// Copyright 2026 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * Bundle-size gate [V1_PLAN §3.8].
 *
 * Bundles the ROOT entry (externals excluded) and fails if it regresses
 * past the budget. Guards specifically against the tool-definitions
 * JSON (~2K lines) leaking back into the root graph — it belongs only
 * behind the /tools, /ai, and /adk subpaths.
 */

import { resolve } from "node:path";

const ROOT_DIR = resolve(import.meta.dir, "..");
const ENTRY = resolve(ROOT_DIR, "packages/sdk/dist/src/index.js");
// Root-entry budget. Raise CONSCIOUSLY, in a reviewed diff.
const BUDGET_KB = 120;

const result = await Bun.build({
  entrypoints: [ENTRY],
  target: "node",
  minify: true,
  external: ["@modelcontextprotocol/sdk", "cheerio", "zod", "ai", "@google/adk", "@google/genai"],
});

if (!result.success) {
  console.error("❌ Bundle failed:", result.logs.join("\n"));
  process.exit(1);
}

const bytes = result.outputs[0] ? (await result.outputs[0].arrayBuffer()).byteLength : 0;
const kb = Math.round(bytes / 1024);
console.log(`📦 Root entry bundle: ${kb} KB (budget ${BUDGET_KB} KB)`);

const text = await result.outputs[0].text();
// Probe with catalog-ONLY content: the longest tool description exists
// solely in tool-definitions.ts (tool names/props also appear in
// generated method bodies, so they are NOT reliable markers).
const manifest = JSON.parse(
  await Bun.file(
    resolve(ROOT_DIR, "packages/sdk/generated/tools-manifest.json"),
  ).text(),
);
const longestDescription: string = manifest
  .map((t: any) => t.description ?? "")
  .sort((a: string, b: string) => b.length - a.length)[0];
const probe = longestDescription.slice(0, 60);
if (probe.length >= 30 && text.includes(probe)) {
  console.error(
    "❌ tool-definitions JSON detected in the ROOT bundle. " +
      "It must stay behind the /tools, /ai, /adk subpaths.",
  );
  process.exit(1);
}

if (kb > BUDGET_KB) {
  console.error(`❌ Root bundle ${kb} KB exceeds budget ${BUDGET_KB} KB.`);
  process.exit(1);
}
console.log("✅ Bundle size within budget; tool catalog not in root graph.");
