#!/usr/bin/env bun
/**
 * Standalone Mechanical Issue Ledger Runner
 *
 * Verifies architectural invariants across target source files, enforces
 * standing rules, writes atomic verification receipts, and tracks burndown progress.
 *
 * Usage:
 *   bun scripts/ledger.ts [--dir=<path>] [--commit-fixes] [--init]
 *   node --loader tsx scripts/ledger.ts [--dir=<path>] [--commit-fixes]
 */

import fs from "node:fs";
import path from "node:path";

export interface IssueTarget {
  file: string;
  enclosingSymbol?: string;
  secondaryFile?: string;
  anchor?: {
    contextBefore?: string;
    targetSnippet?: string;
    contextAfter?: string;
  };
}

export interface IssueOracle {
  type: "invariants" | "ast" | "unit_test";
  forbiddenPatterns: string[];
  requiredPatterns?: string[];
}

export interface IssueLedgerEntry {
  $schema?: string;
  id: string;
  title: string;
  screenshot?: string;
  rule: string;
  target: IssueTarget;
  violation: {
    problem: string;
    expectedSolution: string;
  };
  oracle: IssueOracle;
}

export interface IssueFixedEntry {
  $schema?: string;
  issueId: string;
  status: "VERIFIED_FIXED";
  fixedAt: string;
  file: string;
  enclosingSymbol?: string;
  verification: {
    oracleType: string;
    forbiddenPatternsAbsent: string[];
    requiredPatternsPresent?: string[];
    verifiedBy: string;
  };
}

const REPO_ROOT = process.cwd();

function resolveLedgerDir(): string | null {
  const targetDirArg =
    process.argv.find((a) => a.startsWith("--dir="))?.split("=")[1] ||
    process.argv.find((a) => a.startsWith("--ledger="))?.split("=")[1] ||
    process.env.LEDGER_DIR ||
    process.env.LEDGER_NAME;

  if (targetDirArg) {
    const directPath = path.resolve(REPO_ROOT, targetDirArg);
    if (fs.existsSync(directPath)) return directPath;

    const underDotLedger = path.resolve(REPO_ROOT, ".ledger", targetDirArg);
    if (fs.existsSync(underDotLedger)) return underDotLedger;

    const underIgnored = path.resolve(REPO_ROOT, "ignored/.ledger", targetDirArg);
    if (fs.existsSync(underIgnored)) return underIgnored;

    return directPath;
  }

  const standardBases = [
    path.join(REPO_ROOT, ".ledger"),
    path.join(REPO_ROOT, "ignored/.ledger"),
  ];

  for (const base of standardBases) {
    if (!fs.existsSync(base)) continue;

    // Check if base itself has issue json files
    const directFiles = fs.readdirSync(base).filter(
      (f) => f.endsWith(".json") && !f.endsWith(".fixed.json") && f !== "rules.json"
    );
    if (directFiles.length > 0) return base;

    // Check for child subdirectories (batches)
    const subdirs = fs
      .readdirSync(base, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => path.join(base, d.name));

    if (subdirs.length > 0) {
      // Pick latest modified directory
      subdirs.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
      return subdirs[0];
    }
  }

  return null;
}

export function runOracle(issue: IssueLedgerEntry): { passed: boolean; failureReasons: string[] } {
  const targetPath = path.join(REPO_ROOT, issue.target.file);
  if (!fs.existsSync(targetPath)) {
    return { passed: false, failureReasons: [`Target file not found: ${issue.target.file}`] };
  }

  const primaryContent = fs.readFileSync(targetPath, "utf8");
  let secondaryContent = "";
  if (issue.target.secondaryFile) {
    const secPath = path.join(REPO_ROOT, issue.target.secondaryFile);
    if (fs.existsSync(secPath)) {
      secondaryContent = fs.readFileSync(secPath, "utf8");
    }
  }

  const combinedContent = primaryContent + "\n" + secondaryContent;
  const failureReasons: string[] = [];

  for (const forbidden of issue.oracle.forbiddenPatterns) {
    if (combinedContent.includes(forbidden)) {
      failureReasons.push(`Forbidden pattern '${forbidden}' is still present in ${issue.target.file}`);
    }
  }

  if (issue.oracle.requiredPatterns) {
    for (const required of issue.oracle.requiredPatterns) {
      if (!combinedContent.includes(required)) {
        failureReasons.push(`Required pattern '${required}' is missing from ${issue.target.file}`);
      }
    }
  }

  return { passed: failureReasons.length === 0, failureReasons };
}

function scaffoldInit() {
  const targetBase = path.join(REPO_ROOT, ".ledger");
  const defaultBatch = path.join(targetBase, "refactor-01");
  fs.mkdirSync(defaultBatch, { recursive: true });

  const rulesPath = path.join(targetBase, "rules.json");
  if (!fs.existsSync(rulesPath)) {
    const defaultRules = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: ".ledger/rules.json",
      title: "Standing Architectural Rules & Ledger Schema",
      description: "Standing rules and verification contracts governing codebase refactors and issues.",
      type: "object",
      required: ["id", "title", "rule", "target", "violation", "oracle"],
      properties: {
        id: { type: "string", pattern: "^[a-z0-9]+(-[a-z0-9]+)*$" },
        title: { type: "string" },
        rule: {
          type: "string",
          enum: [
            "NO_SILENT_ERROR_SWALLOWING",
            "REQUIRE_NAMED_BOOLEANS",
            "NO_BOOLEAN_COERCION_CHAINS",
            "STORE_CENTRALIZATION_NO_BYPASS",
            "ELIMINATE_DEAD_CODE",
            "ATOMIC_FILE_OPERATIONS"
          ]
        },
        target: {
          type: "object",
          required: ["file"],
          properties: {
            file: { type: "string" },
            secondaryFile: { type: "string" },
            enclosingSymbol: { type: "string" },
            anchor: {
              type: "object",
              properties: {
                contextBefore: { type: "string" },
                targetSnippet: { type: "string" },
                contextAfter: { type: "string" }
              }
            }
          }
        },
        violation: {
          type: "object",
          required: ["problem", "expectedSolution"],
          properties: {
            problem: { type: "string" },
            expectedSolution: { type: "string" }
          }
        },
        oracle: {
          type: "object",
          required: ["type", "forbiddenPatterns"],
          properties: {
            type: { type: "string", enum: ["invariants", "ast", "unit_test"] },
            forbiddenPatterns: { type: "array", items: { type: "string" } },
            requiredPatterns: { type: "array", items: { type: "string" } }
          }
        }
      },
      $defs: {
        standingRules: {
          NO_SILENT_ERROR_SWALLOWING: {
            id: "NO_SILENT_ERROR_SWALLOWING",
            summary: "Catch blocks must log, rethrow, or handle errors explicitly.",
            antiPatterns: ["catch {}", "catch (_) {}"],
            remediation: "Handle expected errors explicitly or rethrow with contextual error wrapping."
          },
          REQUIRE_NAMED_BOOLEANS: {
            id: "REQUIRE_NAMED_BOOLEANS",
            summary: "Replace nested or compound conditions with self-documenting const is... booleans.",
            antiPatterns: ["if (a && b || !c && d)"],
            remediation: "Extract compound expressions into named const booleans."
          }
        }
      }
    };
    fs.writeFileSync(rulesPath, JSON.stringify(defaultRules, null, 2), "utf8");
    console.log(`✅ Created default rules at ${path.relative(REPO_ROOT, rulesPath)}`);
  }

  const sampleIssuePath = path.join(defaultBatch, "01-sample-issue.json");
  if (!fs.existsSync(sampleIssuePath)) {
    const sampleIssue: IssueLedgerEntry = {
      $schema: "../rules.json",
      id: "sample-issue",
      title: "Sample architectural invariant verification",
      rule: "REQUIRE_NAMED_BOOLEANS",
      target: {
        file: "README.md",
        enclosingSymbol: "root"
      },
      violation: {
        problem: "Sample problem description demonstrating mechanical verification.",
        expectedSolution: "Sample solution asserting required file content."
      },
      oracle: {
        type: "invariants",
        forbiddenPatterns: ["TODO_FORBIDDEN_STRING"],
        requiredPatterns: []
      }
    };
    fs.writeFileSync(sampleIssuePath, JSON.stringify(sampleIssue, null, 2), "utf8");
    console.log(`✅ Created sample issue at ${path.relative(REPO_ROOT, sampleIssuePath)}`);
  }

  console.log(`\n🎉 Ledger initialized at ${path.relative(REPO_ROOT, defaultBatch)}`);
  console.log(`Run: bun scripts/ledger.ts --dir=${path.relative(REPO_ROOT, defaultBatch)}`);
}

function main() {
  if (process.argv.includes("--init")) {
    scaffoldInit();
    return;
  }

  const ledgerDir = resolveLedgerDir();
  if (!ledgerDir || !fs.existsSync(ledgerDir)) {
    console.error("❌ Ledger directory not found.");
    console.error("Provide a directory with --dir=<path> or initialize with --init:");
    console.error("  bun scripts/ledger.ts --init");
    process.exit(1);
  }

  const shouldWriteReceipts = process.argv.includes("--commit-fixes");
  const allFiles = fs.readdirSync(ledgerDir);
  const issueFiles = allFiles.filter(
    (f) => f.endsWith(".json") && !f.endsWith(".fixed.json") && f !== "rules.json"
  );

  if (issueFiles.length === 0) {
    console.log(`No issue specifications found in ${ledgerDir}`);
    process.exit(0);
  }

  let fixedCount = 0;
  let regressedCount = 0;
  let openCount = 0;

  const ledgerLabel = path.basename(ledgerDir).toUpperCase();
  console.log("\n========================================================");
  console.log(`            ${ledgerLabel} ISSUE BURNDOWN LEDGER`);
  console.log("========================================================\n");

  for (const filename of issueFiles.sort()) {
    const fullPath = path.join(ledgerDir, filename);
    const fixedPath = fullPath.replace(/\.json$/, ".fixed.json");
    const issueData = JSON.parse(fs.readFileSync(fullPath, "utf8")) as IssueLedgerEntry;

    const oracleResult = runOracle(issueData);

    if (oracleResult.passed) {
      if (shouldWriteReceipts) {
        const receipt: IssueFixedEntry = {
          $schema: "https://json-schema.org/draft/2020-12/schema",
          issueId: issueData.id,
          status: "VERIFIED_FIXED",
          fixedAt: new Date().toISOString(),
          file: issueData.target.file,
          enclosingSymbol: issueData.target.enclosingSymbol,
          verification: {
            oracleType: issueData.oracle.type,
            forbiddenPatternsAbsent: issueData.oracle.forbiddenPatterns,
            requiredPatternsPresent: issueData.oracle.requiredPatterns,
            verifiedBy: "scripts/ledger.ts"
          }
        };
        try {
          const fd = fs.openSync(
            fixedPath,
            fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY,
            0o600
          );
          fs.writeFileSync(fd, JSON.stringify(receipt, null, 2), "utf8");
          fs.closeSync(fd);
        } catch (writeErr: unknown) {
          const isEexist =
            typeof writeErr === "object" &&
            writeErr !== null &&
            (writeErr as { code?: string }).code === "EEXIST";
          if (!isEexist) {
            throw writeErr;
          }
        }
      }
      fixedCount++;
      console.log(` ✅ [FIXED]     ${issueData.id}`);
      console.log(`    File:       ${issueData.target.file}`);
      console.log(`    Proof:      All forbidden patterns absent & required patterns verified\n`);
    } else {
      const hasFixedReceipt = fs.existsSync(fixedPath);
      if (hasFixedReceipt) {
        regressedCount++;
        console.log(` ⚠️  [REGRESSED] ${issueData.id}`);
        console.log(`    File:       ${issueData.target.file}`);
        console.log(`    Errors:     ${oracleResult.failureReasons.join("; ")}\n`);
      } else {
        openCount++;
        console.log(` ❌ [OPEN]      ${issueData.id}`);
        console.log(`    File:       ${issueData.target.file}`);
        console.log(`    Issue:      ${issueData.title}`);
        console.log(`    Pending:    ${oracleResult.failureReasons[0]}\n`);
      }
    }
  }

  const total = issueFiles.length;
  const pct = total > 0 ? Math.round((fixedCount / total) * 100) : 0;
  const barFilled = Math.round((pct / 100) * 30);
  const bar = "█".repeat(barFilled) + "░".repeat(30 - barFilled);

  console.log("--------------------------------------------------------");
  console.log(` Progress: [${bar}] ${pct}% (${fixedCount}/${total} resolved)`);
  console.log(` Summary:  ${fixedCount} Fixed | ${openCount} Open | ${regressedCount} Regressed`);
  console.log("--------------------------------------------------------\n");

  if (openCount > 0 || regressedCount > 0) {
    process.exit(1);
  }
}

main();
