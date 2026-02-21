# Technical Approach

## Architecture

Webapp with no backend to start with.

## Tech Stack

- **Frontend:** TypeScript and React
- **Build tool:** Vite — fast dev server with HMR, React + TypeScript template
- **UI components:** shadcn/ui (Radix primitives + Tailwind CSS) — accessible, customisable components copied into the project
- **Charts:** Visx — low-level D3 primitives as React components, giving full control over stacked area charts, fan charts, and custom overlays
- **Data storage:** Browser local storage

## Deployment
- **Hosting target:** Public AWS S3 bucket configured for static website hosting.
- **CI/CD:** GitHub Actions workflow triggered on pushes to `main`.
- **Build stage:** Run `npm ci` and `npm run build` from `app/`, producing static assets in `app/dist/`.
- **Deploy stage:** Sync `app/dist/` to S3 via AWS CLI (`aws s3 sync --delete`) so removed files are cleaned up.
- **AWS auth model:** GitHub OIDC role assumption (`aws-actions/configure-aws-credentials`) instead of long-lived IAM keys.
- **Required GitHub secrets/variables:** AWS region and destination bucket name; IAM role ARN with least-privilege access to the target bucket.

## Privacy & Data
All data remains local to the user's machine.
