# WebKit storage regression — v0.3.1

This is validation-only code. It does not modify CANVAS production files, Microsoft configuration, OneDrive data, or Pages deployment.

## Evidence before the repeat

GitHub Actions run `36501336880`, source commit `307964d1079c08d526a7c8654dda1ba8eb6f126b`, passed all ten isolated storage scenarios in each of Chromium and WebKit on Ubuntu 24.04 and macOS 15.

The diagnostic deliberately remains separate from acceptance results:

- macOS Playwright WebKit, two distinct persistent profile paths under the same OS home: raw OPFS data from A was visible to B, although localStorage remained separated. This reproduces the symptom without SQLite or ZERO ONE code. It does not establish a Safari/iPhone cross-user exposure.
- Synthetic per-device OS homes plus persistent profile paths isolated both raw OPFS and SQLite. The acceptance test uses the same origin, account scope and database file name on both devices, tests A/B writes in both directions, and reopens B with its original directories. The application does not rename databases or clear data to obtain a pass.
- Playwright 1.63.0 WebKit `setOffline(true)` rejects navigation even when a minimal service worker returns a literal HTML response. The same test with the origin server genuinely stopped succeeds. This matches upstream issue https://github.com/microsoft/playwright/issues/42775 and the open, unmerged PR https://github.com/microsoft/playwright/pull/42894 at review time. The browser engine has NOT been patched by this project.
- The replacement availability test stops the actual origin server and all connections, verifies a network-only request fails, reloads the cached app from the service worker, verifies an uncached browser request fails, and writes/reads actual SQLite records with the server still unavailable. This tests origin/network unavailability, not the OS airplane-mode flag or `navigator.onLine === false`.
- Worker crash recovery has its own two acknowledged writes and exact before/after equality, independent of the offline test. A failed setup in one test cannot masquerade as data loss in the next.

## Required repeated acceptance

This documentation commit triggers another clean CI run of the unchanged ten-scenario suite on both operating systems. Do not mark the repeat passed until artifacts from that actual run have been inspected.

No failed case is skipped or converted into a pass. The original probe and the raw diagnostic failures remain available. Read `fixed-results.json` for product storage requirements and `diagnostic.json` for tool/environment behavior separately.

## Remaining limits

A passing storage probe is not full PRACTICE UI acceptance, real Microsoft Graph authentication/synchronization, physical Windows/iPhone testing, Safari profile testing, or browser quota/eviction validation. Main remains unchanged.
