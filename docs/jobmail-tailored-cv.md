# JobMail tailored-CV bridge

## Contract

`POST /api/integrations/jobmail/resume/generate` starts a request. The server
requires the configured `JOBMAIL_INTEGRATION_SECRET` and accepts:

```json
{
  "accountId": "ChamathDilshanC",
  "targetRole": "Senior Frontend Engineer",
  "targetCompany": "Example Labs",
  "jobDescription": "Optional posting text"
}
```

The POST response is `{ "requestId": "uuid" }`. Then
`GET /api/integrations/jobmail/resume/generate?requestId=...&accountId=...`
returns the request state. Running requests include progress metadata. A
completed request returns a validated PDF payload; failed requests return a
safe error state without exposing GitHub or resume-data credentials.

The route is intentionally server-to-server. The browser-facing JobMail app
never calls GitHub and never receives `JOBMAIL_INTEGRATION_SECRET` or
`JOBMAIL_GITHUB_TOKEN`.

## Processing flow

1. Authenticate the shared secret with a timing-safe comparison.
2. Validate the UUID request ID, bounded target-role/company/job-description
   fields, and the `ALLOWED_GITHUB_USERNAME` account boundary.
3. Dispatch `resume-core/.github/workflows/generate-jobmail-resume.yml` with
   the request context.
4. Poll the workflow and download only its matching short-lived artifact.
5. Require a PDF content signature and enforce the 5 MB response limit.
6. Return the artifact to JobMail, which attaches it to the current email.

The workflow operates on an isolated copy of the private resume data. The
canonical `resume-data` repository and Drive PDF are never modified by this
request.

## Deployment checklist

- Set `JOBMAIL_INTEGRATION_SECRET` in DevResume Admin and JobMail to the same
  high-entropy value.
- Set `JOBMAIL_GITHUB_TOKEN` only in the DevResume Admin server environment.
  Use a fine-grained token scoped to the minimum `resume-core` Actions dispatch
  and artifact/download operations required by the deployment.
- Ensure `RESUME_REPO_OWNER`, `RESUME_REPO_NAME`, and `RESUME_DATA_REPO_NAME`
  point to the intended private repositories.
- Keep the existing `RESUME_DATA_PAT` and `GDRIVE_FILE_ID` configuration in
  `resume-core`; no new client-side secret is needed.
- Test a successful run, a failed run, an expired artifact, and a request from
  an unlinked account before enabling production traffic.

## Security boundaries

- Use HTTPS between JobMail and DevResume Admin.
- Do not log request role/company/job-description content or PDF bytes in
  production unless explicitly redacted.
- Do not expose any of these variables through `NEXT_PUBLIC_*` values.
- Keep artifact retention short and avoid storing generated PDFs in MongoDB or
  the canonical resume repository.
