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
 * Service contract for Screen content side-effects [V1_PLAN §3.2, D2].
 *
 * WHY HANDWRITTEN: getHtml()/getImage() FETCH the artifact bytes from
 * the signed download URL — network IO + binary handling the codegen
 * pipeline cannot express. The URL accessors (getHtmlUrl/getImageUrl)
 * remain generated, cache-aware bindings.
 */

/**
 * The COMPLETE set of members the handwritten Screen extension adds beyond
 * the generated class. It is both (a) implemented by the screen-ext class
 * and (b) declaration-merged onto the generated Screen type (via the
 * domain-map `publicInterface`), so the generated `Screen` type and the
 * exported `Screen` type are structurally identical — a consumer can assign
 * `screen.edit().first` / `variants().screens[0]` to a `Screen` without the
 * type splitting. Anything screen-ext adds publicly MUST be declared here.
 */
export interface ScreenContentSpec {
  /**
   * Fetch the screen's HTML content.
   * @throws StitchError NOT_FOUND when the screen has no HTML artifact,
   *         NETWORK_ERROR when the signed URL fetch fails.
   */
  getHtml(): Promise<string>;

  /**
   * Fetch the screen's screenshot bytes (typically PNG).
   * @throws StitchError NOT_FOUND when the screen has no screenshot,
   *         NETWORK_ERROR when the signed URL fetch fails.
   */
  getImage(): Promise<Uint8Array>;

  /** Typed accessor for the screen's display title (from cached data). */
  readonly title: string | undefined;
}
