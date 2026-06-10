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
 * Handwritten extension of the generated Screen class [V1_PLAN §3.2].
 *
 * getHtml()/getImage() return CONTENT (what the names promise) by
 * fetching the signed download URL. The generated, cache-aware URL
 * accessors are getHtmlUrl()/getImageUrl().
 *
 * Registered as the canonical "Screen" implementation so every
 * EntityManager.resolve — including generated self-references like
 * edit() returning Screens — produces this class.
 */

import { Screen as GeneratedScreen } from "../generated/src/screen.js";
import { StitchError } from "./spec/errors.js";
import { EntityManager } from "./entity-manager.js";
import type { ScreenContentSpec } from "./spec/content.js";

async function fetchArtifact(url: string, what: string): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new StitchError({
      code: "NETWORK_ERROR",
      message: `Failed to fetch ${what}: ${err instanceof Error ? err.message : String(err)}`,
      recoverable: true,
    });
  }
  if (!res.ok) {
    throw new StitchError({
      code: res.status === 404 ? "NOT_FOUND" : "NETWORK_ERROR",
      // Signed URLs expire — a 403 here usually means "refetch the screen"
      message: `Failed to fetch ${what}: HTTP ${res.status} (signed URLs expire; re-fetch the screen for a fresh URL)`,
      recoverable: res.status !== 404,
    });
  }
  return res;
}

export class Screen extends GeneratedScreen implements ScreenContentSpec {
  /**
   * Typed accessor for the screen's display title (from cached response
   * data). `data` itself is `unknown` — narrow it or use accessors.
   */
  get title(): string | undefined {
    return (this.data as any)?.title;
  }

  /**
   * Fetch the screen's HTML content.
   * For just the download URL, use getHtmlUrl().
   */
  async getHtml(): Promise<string> {
    const url = await this.getHtmlUrl();
    const res = await fetchArtifact(url, `HTML for screen ${this.screenId}`);
    return res.text();
  }

  /**
   * Fetch the screen's screenshot bytes (typically PNG).
   * For just the download URL, use getImageUrl().
   */
  async getImage(): Promise<Uint8Array> {
    const url = await this.getImageUrl();
    const res = await fetchArtifact(
      url,
      `screenshot for screen ${this.screenId}`,
    );
    return new Uint8Array(await res.arrayBuffer());
  }
}

EntityManager.registerImplementation("Screen", Screen);
