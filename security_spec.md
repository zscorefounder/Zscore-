# Security Specification - Z-Score Portfolio

## Data Invariants
1. `thumbnails`, `bts`, `hero_thumbnails`, and `posts` can only be created, updated, or deleted by the authorized admin (`shansarkarbhai@gmail.com`).
2. `comments` can be created by any signed-in user or anonymously (if supported), but for this app, we'll restrict it to authorized users or public creation with rate limiting (best effort in rules). Actually, since the app has a `CommentsSection`, I should check how it works.

## "Dirty Dozen" Payloads (Expected to be REJECTED for non-admins)

1. **Identity Spoofing**: Attempting to create a thumbnail as a non-admin.
2. **Resource Poisoning**: Large string (1MB) in `title` field.
3. **Privilege Escalation**: Attempting to delete a thumbnail as a guest.
4. **Invalid Path**: Writing to a collection not in the blueprint.
5. **Type Poisoning**: Sending a boolean for `title`.
6. **Immutable Field Change**: Changing `createdAt` on an update.
7. **Phantom Field**: Adding `isAdmin: true` to a comment or thumbnail.
8. **Rate Limit Bypass**: Rapidly posting comments (handled by `request.time`).
9. **ID Hijacking**: Using a reserved ID for a new document.
10. **State Corruption**: Updating a finished case study status to something invalid.
11. **Guest Deletion**: A guest trying to delete any document.
12. **PII Leakage**: Trying to read user data if it existed.

## Test Runner (firestore.rules.test.ts) preview
[I will implement the actual rules now]
