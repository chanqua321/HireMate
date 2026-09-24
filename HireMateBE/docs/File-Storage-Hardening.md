# File storage hardening (pre-deployment)

## Current file inventory

| File | Previous persistence/read/delete | API |
| --- | --- | --- |
| Uploaded CV PDF/DOCX | `private-uploads/cv/{userId}` (older uploads may be in `wwwroot/uploads/cv/{userId}`); read and deleted by `CvService` | `POST /api/Cv/upload`, `GET /api/Cv/{id}/download`, `GET /api/Cv/{id}/preview`, `DELETE /api/Cv/{id}` |
| Wizard-generated CV PDF | `wwwroot/uploads/cv/{userId}`; generated again from `WizardAnswersJson` when missing | `POST /api/Cv/wizard`, same owner-scoped download/preview/delete endpoints; template change can re-render |
| Wizard HTML sidecar | Old generated CVs may have `.html` beside PDF; it was a debug cache, not a public API | No direct endpoint; legacy sidecar is removed on CV delete where present |
| Avatar | `UserAccount.AvatarUrl` is a Google URL; wizard CV also accepts an avatar data URI/URL in its JSON/PDF. No backend avatar upload or file persistence | Auth/profile and CV wizard data, no avatar file endpoint |
| Interview voice | Request stream is buffered in memory and sent to speech-to-text. Audio is not saved as a file; transcript/answer is business data | `POST /api/Interview/...` voice endpoint |
| Temporary files | Local storage writes a unique `.tmp` file in its private root, then atomically replaces the target and removes the temporary file on failure | Internal only |

## Contract and configuration

New CV records store opaque logical keys in the existing `CvDocument.StoragePath` column, such as `users/{userId:N}/cv/{cvId:N}/original.pdf` and `.../generated.pdf`. No migration or schema change is needed. User filenames and display names never form directory paths. The authenticated CV service checks `CvDocument.UserId` before passing the key to storage. Files remain behind the owner-scoped download/preview API; `/uploads` is denied by static-file middleware.

Development/Testing: `FileStorage__Provider=Local` (or omit the provider) and optionally set `FileStorage__RootPath` to an **absolute private directory outside `wwwroot`**. The development-only default is `{ContentRootPath}/private-files`. This directory is ignored by Git and Docker builds. Treat a container's local filesystem as temporary unless a persistent volume is mounted.

Production: startup **fails deliberately** until a persistent object-storage implementation is registered. There is no AWS SDK, bucket, key, URL, S3/EFS resource, or production credential in this phase. Do not set `Provider=Local` in production and expect persistence. Before AWS deployment, implement the same `IFileStorageService` contract using a durable provider, configure its credentials through environment/secret management, and replace the production guard with provider registration. Test actual read/write/delete and restart persistence in the target environment.

Existing absolute paths under `wwwroot/uploads/cv/{userId}` and `private-uploads/cv/{userId}` are accepted only when they match the configured legacy root and the authenticated owner's directory. They are **not automatically migrated**. Files left on a previous server are unavailable on a new host until copied to durable storage by a separate, verified migration plan. A regenerated wizard PDF is written under a new logical key; its old missing path is not reused.

Database delete commits first, then storage delete runs. If storage deletion fails, the response includes `storageCleanupRequired=true` and logs the CV id/key for operator cleanup. This is an unavoidable non-transactional boundary without a durable cleanup queue. A failed database create attempts to remove its newly saved object and logs cleanup failure. No destructive migration is performed.
