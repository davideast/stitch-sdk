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
import { ScreenContentHandler } from "./content-handler.js";

export class Screen extends GeneratedScreen implements ScreenContentSpec {
  /**
   * Fetch the screen's HTML content.
   * For just the download URL, use getHtmlUrl().
   */
  async getHtml(): Promise<string> {
    const url = await this.getHtmlUrl();
    const handler = new ScreenContentHandler();
    const result = await handler.fetchArtifact({
      url,
      label: `HTML for screen ${this.screenId}`,
    });
    if (!result.success) {
      throw new StitchError({
        code: result.error.code,
        message: result.error.message,
        recoverable: result.error.recoverable,
      });
    }
    return result.response.text();
  }

  /**
   * Fetch the screen's screenshot bytes (typically PNG).
   * For just the download URL, use getImageUrl().
   */
  async getImage(): Promise<Uint8Array> {
    const url = await this.getImageUrl();
    const handler = new ScreenContentHandler();
    const result = await handler.fetchArtifact({
      url,
      label: `screenshot for screen ${this.screenId}`,
    });
    if (!result.success) {
      throw new StitchError({
        code: result.error.code,
        message: result.error.message,
        recoverable: result.error.recoverable,
      });
    }
    return new Uint8Array(await result.response.arrayBuffer());
  }
}

EntityManager.registerImplementation("Screen", Screen);
