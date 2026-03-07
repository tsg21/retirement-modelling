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
- **Hosting targets:**
  - Production: public AWS S3 bucket behind existing production domain.
  - Preview: separate public AWS S3 bucket fronted by CloudFront and mapped to `preview.retirementplanner.timgage.co.uk`.
- **CI/CD:** GitHub Actions workflow handles both production and pull request preview lifecycle.
- **Build stage:** Run `npm ci` and `npm run build` from `app/`, producing static assets in `app/dist/`.
- **Production deploy stage:** On pushes to `main`, sync `app/dist/` to the production bucket root via AWS CLI (`aws s3 sync --delete`).
- **Preview deploy stage:** On pull request open/sync/reopen, sync `app/dist/` to `s3://<preview-bucket>/<pr-number>/` so each PR has a dedicated URL path (`http://preview.retirementplanner.timgage.co.uk/<pr>/`).
- **Preview cleanup stage:** On pull request close, remove `s3://<preview-bucket>/<pr-number>/` to avoid stale previews and excess storage.
- **PR UX:** Workflow posts/updates a pull request comment with the preview URL for reviewers.
- **AWS auth model:** GitHub OIDC role assumption (`aws-actions/configure-aws-credentials`) instead of long-lived IAM keys.
- **Required GitHub secrets/variables:** AWS region, production bucket, preview bucket, and IAM role ARN with least-privilege access to both buckets.

## Privacy & Data
All data remains local to the user's machine.
