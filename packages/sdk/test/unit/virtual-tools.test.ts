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
 * De-mocked tests for the proxy's virtual-tool seam.
 *
 * Unlike proxy.test.ts (which tests handler ROUTING with a mocked
 * Project), these tests exercise the real Project + EntityManager +
 * envelope-parsing path — the exact seam where two shipped bugs hid:
 *   1. new Project(client, id) left projectId undefined
 *   2. dummyClient returned raw MCP envelopes, so error responses
 *      silently read as "0 screens, success".
 */

import { describe, it, expect, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { StitchError } from "../../src/spec/errors.js";
import { EntityManager } from "../../src/entity-manager.js";

const { mockForward } = vi.hoisted(() => ({ mockForward: vi.fn() }));

vi.mock("../../src/proxy/client.js", async () => {
  const actual = await vi.importActual("../../src/proxy/client.js");
  return { ...actual, forwardToStitch: mockForward };
});

import {
  createProject,
  handleVirtualTool,
  isVirtualTool,
  virtualTools,
} from "../../src/proxy/virtual-tools.js";

describe("virtual-tools (real construction path)", () => {
  it("REGRESSION: createProject hydrates projectId via the identity map", () => {
    const client: any = { callTool: vi.fn() };
    client.entities = new EntityManager(client);

    const project = createProject("p-123", client);
    expect(project.projectId).toBe("p-123");
    expect(project.id).toBe("p-123");
  });

  it("REGRESSION: an isError envelope from the server throws instead of silently succeeding", async () => {
    mockForward.mockResolvedValue({
      isError: true,
      content: [{ type: "text", text: "Project not found" }],
    });

    const ctx = { config: { apiKey: "k", url: "https://example.com" } };
    await expect(
      handleVirtualTool(
        "download_assets",
        { projectId: "p-404", outputDir: join(tmpdir(), "never-created") },
        ctx,
      ),
    ).rejects.toThrow(StitchError);
  });

  it("parses structuredContent envelopes into payloads (0 screens → clean success)", async () => {
    mockForward.mockResolvedValue({
      content: [],
      structuredContent: { screens: [] },
    });

    const outputDir = mkdtempSync(join(tmpdir(), "stitch-vt-test-"));
    try {
      const ctx = { config: { apiKey: "k", url: "https://example.com" } };
      const result = await handleVirtualTool(
        "download_assets",
        { projectId: "p-1", outputDir },
        ctx,
      );
      expect(result.content[0].text).toContain(outputDir);
    } finally {
      rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it("routing derives from the single virtualTools registry", async () => {
    expect(virtualTools.map((t) => t.name)).toContain("download_assets");
    expect(isVirtualTool("download_assets")).toBe(true);
    expect(isVirtualTool("not_a_tool")).toBe(false);
    await expect(
      handleVirtualTool("not_a_tool", {}, { config: {} }),
    ).rejects.toThrow(/Unknown virtual tool/);
  });
});
