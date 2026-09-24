# Pre-migration regression fixtures

This directory preserves the original vanilla JavaScript page, controllers, and HTTP
harness so the existing behavioral tests can continue to protect the domain logic.
These files are **not served or imported by Next.js**. The application UI lives in
`app/` and `components/`; API route handlers live in `app/api/`.

Current browser coverage is in `e2e/`. Current API boundary coverage is in
`tests/next-api.test.js`. Domain and provider tests continue to use `src/` directly.
