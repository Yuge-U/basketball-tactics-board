# PRACTICE v0.3.1 — recheck 2026-09-29

## Verified this turn

Storage workflow run 36503049222: 10/10 per Chromium and WebKit, on Ubuntu 24.04 and macOS 15. Downloaded result JSONs and artifact SHA-256 checks confirmed.

PRACTICE actual UI workflow run 36504272625, commit 524d7b49c611e4b1632ca5ad565660b196e2140d: 9/9 per Chromium and WebKit on both operating systems. Both reports record 18 executed, 18 passed, errors=[], and both CI jobs completed successfully.

UI scenarios: actual WASM/OPFS initialization; form entry and two-item save; reload and exact item names/time; second-tab rejection; reflection stored separately; timer start/pause; independent synthetic-device storage; origin server stopped then service-worker reload and existing plan display; 390px layout overflow check. This is not exhaustive testing of every app function.

Local shared-code regression: 150/150 passed, skipped=0, failure=0. JavaScript syntax: 31 checked, no failures. Dependencies match the existing vendor lock.

## Changes and provenance

The first UI run 36504042609 failed. Corrected the TEST code: wait for asynchronous detail rendering before checking count; check fieldset.disabled plus actual input isDisabled, rather than fieldset isDisabled alone. Added an element-existence precondition and failure on uncaught page errors. Expected two item names/time are now also checked.

Product runtime is unchanged. For compact CI transport, JS comments were removed with Acorn and executable AST equivalence checked. Downloaded final artifacts were compared again with the original: 15 product scripts have matching AST and 6 other product files match bytes per OS. The updated test AST also matches the comment-preserving distribution. Original comments remain in the user ZIP.

## Network and scope

The assistant container still fails to resolve registry.npmjs.org (curl exit 6). User switching to an iPhone client does not establish that this separate environment changed. GitHub CI successfully fetched and verified public dependencies and ran the UI. No measurement of the user's actual iPhone network was performed.

Known WebKit setOffline(true) diagnostic errors remain recorded. Origin-server-unavailability tests are not identical to airplane mode or navigator.onLine=false. Browser test profiles and OS homes are isolated to model distinct devices; normal Safari/iPhone behavior is not certified by this result.

Not tested: real Microsoft sign-in, user's OneDrive synchronization, physical iPhone/PC handoff, iPhone homescreen mode, airplane mode, long lock/resume and every app feature. No HTTPS lab site has been deployed.

Only isolated branch lab/practice-browser-v03 was changed. main remains 0a1537578ffaa94297782acd4994e5f86674c800. Existing CANVAS/TERMINOLOGY runtime, Pages, Microsoft registration and personal OneDrive data were not modified.

Evidence: runs 36503049222 and 36504272625; UI Linux artifact SHA256 5abc7278ff838e335fbfd280380f2c88539bd3a7f282795ff752b9c1d31e5fcc; UI macOS artifact SHA256 1954bd0efcec70eaf4ac7e1061f5cba897853e73614e59621bcdd13cdc54ce04.
