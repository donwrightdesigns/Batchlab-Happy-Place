# Firestore Security Specification - BATCH LAB

## Data Invariants
1.  **User Isolation**: Users MUST only access their own data folder (`/users/{userId}`).
2.  **ID Integrity**: All document IDs MUST be alphanumeric and bounded in size.
3.  **Content Limits**: Prompts, instructions, and titles MUST have strict size limits to prevent database bloating.
4.  **No Public Read**: There is no public or cross-user data in this application.
5.  **Relational Integrity**: Enhancements and Batches must belong to the logged-in user who created them.

## The Dirty Dozen Payloads

| ID | Attack Vector | Target Path | Malicious Payload | Expected Result |
|---|---|---|---|---|
| 1 | Identity Spoofing | `/users/victim_id` | `{ "uid": "victim_id", "email": "attacker@evil.com" }` | PERMISSION_DENIED |
| 2 | Shadow Field (Ghost Key) | `/users/me/enhancements/1` | `{ "id": "1", "timestamp": 123, "prompt": "ok", "is_admin": true }` | PERMISSION_DENIED |
| 3 | Denial of Wallet (Large String) | `/users/me/settings/system` | `{ "instruction": "A" * 1000000 }` | PERMISSION_DENIED |
| 4 | ID Poisoning | `/users/me/batches/../../../system/keys` | `{ ... }` | PERMISSION_DENIED |
| 5 | Cross-User Batch Hijack | `/users/victim/batches/1` | `{ ... }` | PERMISSION_DENIED |
| 6 | Terminal State Bypass | `/users/me/enhancements/1` | (Update already completed status to error) | PERMISSION_DENIED |
| 7 | Resource Poisoning (ID) | `/users/me/enhancements/VERY_LONG_ID_JUNK...` | `{ ... }` | PERMISSION_DENIED |
| 8 | Enum Poisoning | `/users/me/enhancements/1` | `{ "status": "malicious_status" }` | PERMISSION_DENIED |
| 9 | PII Scraping | `/users/victim` | (List query on /users) | PERMISSION_DENIED |
| 10 | Sync Vulnerability | `/users/me/batches/1` | (Create batch with thumbnails too large) | PERMISSION_DENIED |
| 11 | Immutable Field Bypass | `/users/me/enhancements/1` | (Change createdAt/timestamp on update) | PERMISSION_DENIED |
| 12 | Query Scraping | `/users/victim/enhancements` | (List query as different user) | PERMISSION_DENIED |
