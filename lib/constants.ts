// Phase 1 has no auth — every user-scoped row is keyed to this fixed id
// so a real auth system can be dropped in later without a schema change.
export const LOCAL_USER_ID = "local-user";
