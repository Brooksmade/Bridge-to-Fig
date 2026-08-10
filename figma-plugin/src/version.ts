/**
 * Version constants for Bridge to Fig protocol handshake.
 * Keep in sync with shared/types/version.ts — the runtime handshake catches drift.
 *
 * PROTOCOL_VERSION — bump on breaking wire-format changes.
 * MIN_PROTOCOL_VERSION — oldest protocol version we can still talk to.
 * APP_VERSION — cosmetic; shown in update banners.
 */
export const PROTOCOL_VERSION = 1;
export const MIN_PROTOCOL_VERSION = 1;
export const APP_VERSION = '1.0.1';
