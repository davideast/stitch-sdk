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

import { Project } from "../project-ext.js";
import { VirtualToolDefinition } from "../spec/client.js";
import { forwardToStitch } from "./client.js";
import { parseToolResult } from "../client.js";
import { EntityManager } from "../entity-manager.js";

/**
 * Create a Project handle bound to a client, via the identity map.
 * Exported for tests: direct `new Project(client, id)` does NOT hydrate
 * projectId (that regression broke this tool silently once already).
 */
export function createProject(projectId: string, client: any): Project {
  return client.entities.resolve(Project, ["projectId"], { projectId });
}

export const downloadAssetsTool: VirtualToolDefinition = {
  name: "download_assets",
  description: "Download screens and assets to a local directory",
  source: "sdk",
  inputSchema: {
    type: "object",
    properties: {
      projectId: { type: "string", description: "Project ID" },
      outputDir: { type: "string", description: "Output directory" },
    },
    required: ["projectId", "outputDir"],
  },
  execute: async (client, args) => {
    const { projectId, outputDir } = args;
    const project = createProject(projectId, client);
    await project.downloadAssets(outputDir);
    return {
      content: [{ type: "text", text: `Assets downloaded to ${outputDir}` }],
    };
  },
};

/** Single registry: listTools, routing, and shadow-detection all derive from it. */
export const virtualTools: VirtualToolDefinition[] = [downloadAssetsTool];

export async function handleVirtualTool(
  name: string,
  args: any,
  ctx: any,
): Promise<any> {
  // Minimal client adapter over the proxy transport. callTool must return
  // the PARSED tool payload (same contract as StitchToolClient.callTool):
  // forwardToStitch yields the raw MCP envelope, and isError envelopes
  // must throw instead of silently reading as empty results.
  const proxyClient: any = {
    callTool: async (toolName: string, toolArgs: any) => {
      const envelope = await forwardToStitch(ctx.config, "tools/call", {
        name: toolName,
        arguments: toolArgs,
      });
      return parseToolResult(envelope, toolName);
    },
  };
  proxyClient.entities = new EntityManager(proxyClient);

  const tool = virtualTools.find((t) => t.name === name);
  if (!tool) {
    throw new Error(`Unknown virtual tool: ${name}`);
  }
  return tool.execute(proxyClient, args);
}

export function isVirtualTool(name: string): boolean {
  return virtualTools.some((t) => t.name === name);
}
