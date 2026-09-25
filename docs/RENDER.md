# Deploying Constant on Render

Constant is prepared for a Render Blueprint deployment.

## What Render holds

Two runtime secrets exist:

- `CONSTANT_ADMIN_PASSWORD`: chosen by the operator
- `CONSTANT_SESSION_SECRET`: generated automatically by Render from `render.yaml`

Neither value belongs in GitHub.

The Render service is public at the network layer, but the Constant application itself redirects unauthenticated visitors to a password gate. Company API endpoints require an authenticated session.

## First deployment

1. In Render, choose **New → Blueprint**.
2. Connect the GitHub repository `Blockamoto/constant`.
3. Render reads the root `render.yaml`.
4. When prompted for `CONSTANT_ADMIN_PASSWORD`, enter a long, unique password.
5. Leave `CONSTANT_SESSION_SECRET` to Render. The Blueprint declares `generateValue: true`.
6. Create/apply the Blueprint.
7. Wait for the build and health check to pass.
8. Open the generated `*.onrender.com` URL.
9. Constant should show the login screen. Sign in with the admin password from step 4.

## Existing manually-created Render service

If a Constant web service already exists instead of a Blueprint:

1. Open that service in Render.
2. Go to **Environment**.
3. Add `CONSTANT_ADMIN_PASSWORD` with a long unique value.
4. Add `CONSTANT_SESSION_SECRET` with at least 32 random characters.
5. Set `NODE_ENV=production`.
6. Make sure the build command is `npm test`.
7. Make sure the start command is `npm start`.
8. Set the health check path to `/healthz`.
9. Redeploy the latest commit from `main`.

## Security behaviour

- The password itself never enters repository state.
- Successful login creates an HttpOnly, SameSite=Strict cookie.
- On Render, the cookie is Secure and therefore travels only over HTTPS.
- Sessions expire after 12 hours.
- Repeated failed logins are rate-limited in memory.
- API responses and authenticated pages use `no-store`.
- The server emits a restrictive Content Security Policy and denies framing.
- `/healthz` is the only intentionally unauthenticated service endpoint and contains no company data.
- If the required secrets are missing, `/healthz` returns 503 so the deployment fails closed.

## Sensitive company records

Authentication and encryption solve different problems.

The login gate keeps casual/public visitors out of the dashboard. It does not make plaintext secrets safe to commit.

For now:

- public/non-sensitive operational state may remain in `data/`
- credentials and decryption keys live only in Render secrets
- private records should not be added to the repository as plaintext

When Constant gains persistent private company data, add an encrypted storage layer explicitly. Until then, no sensitive payload should be put into Git history just because the dashboard itself is authenticated.
