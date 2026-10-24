# Same-origin Next.js API

All routes belong to the same Next.js app. No frontend API URL or CORS setup is needed. Responses are JSON with `Cache-Control: no-store`. Write requests use JSON bodies and the same origin as the site.

| Method | Route | Body / access |
| --- | --- | --- |
| GET | `/api/state` | Public shared `GameState` |
| GET | `/api/health` | Public readiness; 200 `{"ok":true}` or 500 |
| POST | `/api/staff/verify` | `{pin}`; 200 sets HttpOnly staff cookie; 401 incorrect; 429 throttled |
| GET | `/api/staff/session` | `{authenticated:boolean}` |
| DELETE | `/api/staff/session` | Clears staff cookie |
| POST | `/api/teams/verify` | `{teamId,pin}`; 200 sets HttpOnly team cookie; 401 incorrect; 429 throttled |
| GET | `/api/teams/session` | `{teamId:number|null}` |
| DELETE | `/api/teams/session` | Clears team cookie |
| GET | `/api/qr?cp=1` | Staff cookie; `{cp,token,expiresInMs,windowMs}` |
| POST | `/api/checkins` | `{teamId,target,source,token?}`; corresponding team cookie + QR token, or staff cookie |
| POST | `/api/game/start` | Staff cookie; returns state, preserves existing start time |
| DELETE | `/api/checkins/last?teamId=1` | Staff cookie; returns state after removing last step |
| POST | `/api/reset` | Staff cookie; deletes check-ins and clears start time |

`target` is the number 1–5 or the string `SALLE`. `source` must be `team` or `staff`. Only staff can validate `SALLE`. The database supplies timestamps, step numbers and UUIDs. Invalid check-ins return 409 with `{ok:false,reason}`; accepted check-ins return `{ok:true,checkin}`. Invalid payloads return 400, staff authentication failures 401, cross-site writes 403, login throttling 429 with `Retry-After`, and unexpected failures 500 without disclosing configuration.

There are no raw PIN headers and no API endpoint exposing stored PINs. The browser sends PINs only during login. For types, see `src/types.ts`.
