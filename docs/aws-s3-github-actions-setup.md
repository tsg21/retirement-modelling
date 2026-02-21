# Deploying `app/` to S3 from GitHub Actions

This project can deploy the Vite build output (`app/dist/`) to a public S3 bucket whenever code is pushed to `main`.

## 1) AWS setup

### A. Create an S3 bucket for static hosting
1. Open **S3 → Create bucket**.
2. Choose a globally unique bucket name (example: `retirement-modelling-prod-site`).
3. Uncheck **Block all public access** and acknowledge the warning.
4. Create the bucket.

### B. Enable static website hosting
1. Open the bucket → **Properties**.
2. Under **Static website hosting**, click **Edit**.
3. Enable hosting and set:
   - Index document: `index.html`
   - Error document: `index.html` (recommended for SPA routing)
4. Save changes.

### C. Add a bucket policy for public read
Replace `YOUR_BUCKET_NAME` and apply this in **Permissions → Bucket policy**:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
    }
  ]
}
```

### D. Create an IAM role for GitHub OIDC
1. Go to **IAM → Identity providers** and create OIDC provider (if not already present):
   - Provider URL: `https://token.actions.githubusercontent.com`
   - Audience: `sts.amazonaws.com`
2. Go to **IAM → Roles → Create role**.
3. Trusted entity type: **Web identity**.
4. Identity provider: `token.actions.githubusercontent.com`
5. Audience: `sts.amazonaws.com`
6. Use this trust policy (replace `YOUR_GITHUB_ORG` and `YOUR_REPO`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::YOUR_AWS_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR_GITHUB_ORG/YOUR_REPO:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

### E. Attach least-privilege permissions to the role
Attach a policy (replace `YOUR_BUCKET_NAME`) that lets Actions upload/delete deployment assets:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
    }
  ]
}
```

## 2) GitHub repo setup

In **GitHub → Settings → Secrets and variables → Actions**:

### Repository secrets
- `AWS_ROLE_TO_ASSUME`: Full ARN of the IAM role created above.

### Repository variables
- `AWS_REGION`: AWS region for the bucket (example: `eu-west-2`).
- `S3_BUCKET`: Target bucket name.

## 3) Deployment behavior

The workflow at `.github/workflows/deploy-s3.yml`:
- triggers on push to `main`
- installs dependencies in `app/`
- builds the Vite app
- assumes the AWS role via OIDC
- syncs `app/dist/` to `s3://$S3_BUCKET` with `--delete`

After the first successful run, your site should be available at:
`http://YOUR_BUCKET_NAME.s3-website-<region>.amazonaws.com`

(Or behind CloudFront, if you later add a CDN.)
