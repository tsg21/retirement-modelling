# 20. PR preview deployments via S3 + CloudFront

## Scope
- [x] Update deployment workflow to publish pull request builds to preview infrastructure without affecting production deploys.
- [x] Use a dedicated preview S3 bucket and path prefix matching PR number (`/<pr>/`).
- [x] Add pull request lifecycle handling to clean up preview artifacts when PR closes.
- [x] Add PR comment output with preview URL (`http://preview.retirementplanner.timgage.co.uk/<pr>/`).

## Validation
- [x] Run `npm test` from `app/`.
- [x] Run `npm run lint` from `app/`.

## Status
✅ Complete

## Notes
- Production deployment remains `push` to `main` and uses the existing production bucket.
- Preview deployments run on PR open/sync/reopen events and upload to `s3://$S3_PREVIEW_BUCKET/<pr>/`.
- Preview cleanup runs on PR close and removes `s3://$S3_PREVIEW_BUCKET/<pr>/`.
- A PR comment is posted/updated with the canonical preview URL.
