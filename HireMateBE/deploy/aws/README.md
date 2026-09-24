# Single-server AWS demo deployment

Target: Ubuntu 24.04 x86_64, 4 GB RAM, Lightsail Singapore, one instance.
Use `compose.yaml` in this directory; do not use the development Compose file.

Create a private `.env` next to compose.yaml (ignored by Git). Required variables:
`MSSQL_SA_PASSWORD`, `JWT_KEY`, `FRONTEND_URL` (HTTPS origin, no trailing slash),
`API_PUBLIC_URL` (HTTPS API host). Generate unique database and JWT secrets on the server.
Add the application's AI, SMTP, Google and payment settings with their .NET double-underscore
names to this file. Do not publish the file or paste its contents into chat.

Run `docker compose -f compose.yaml up -d --build` from this directory.
SQL Server Express is private to the Docker network. API binds only to localhost:5080;
configure an HTTPS reverse proxy before allowing public application traffic.
Create the database fresh only after agreeing the data migration plan.

Both containers use `TZ=Asia/Ho_Chi_Minh`. Business invoice dates use Vietnam time explicitly;
database timestamps, JWT expiry and payment expiry remain UTC instants.

Database and CV data use named volumes. Never run `docker compose down -v` on deployed data.
Replacing containers preserves volumes; deleting the Lightsail instance does not.
Back up both volumes and verify CV access after container recreation before release.
Existing local CV files and absolute paths require a separate migration.

Cost target: $24/month server, $96 for four full months before extras. Snapshots, external AI,
traffic overage and other AWS services are not included in this estimate. Lightsail stopped
instances continue to incur charges. Monitor remaining credit and exclude credits from
gross-usage budget alerts so credit consumption is visible.

Deployment is not complete until HTTPS, CORS, authentication, CV persistence and payment
callbacks have been verified against the real frontend. Change the demo admin password
before exposing the application publicly.
