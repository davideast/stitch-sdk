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
 * Result container for generative operations (generate / edit /
 * variants / apply) [V1_PLAN §3.1, amended].
 *
 * Stitch returns MANY screens per generation (across multiple output
 * components). Projecting a single screen out of that response silently
 * dropped the rest — the original 1.0-blocking bug. A Generation always
 * carries ALL screens plus the raw response, so future response
 * enrichment (progress updates, feedback) is additive, not breaking.
 *
 * `first` is a convenience for the most common single-screen flow. It
 * is NOT server-designated significance — screen order is the response
 * order (which is why this is not named `primary`).
 */
export class Generation<TItem, TRaw = unknown> implements Iterable<TItem> {
  // Constructed only by generated methods, which throw on an empty response
  // BEFORE calling this — so `first` is always present in practice. A
  // consumer who hand-constructs an empty Generation gets `first === undefined`.
  constructor(
    /** Every screen produced by the operation, across all output components. */
    public readonly screens: readonly TItem[],
    /** The full tool response (typed), incl. fields the SDK doesn't model. */
    public readonly raw: TRaw,
  ) {}

  /**
   * The first screen of the response. Generated methods guarantee a
   * non-empty Generation (an empty response throws at the call site),
   * so this is always present.
   */
  get first(): TItem {
    return this.screens[0];
  }

  /** Number of screens produced. */
  get length(): number {
    return this.screens.length;
  }

  [Symbol.iterator](): Iterator<TItem> {
    return this.screens[Symbol.iterator]();
  }
}
