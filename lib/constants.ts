// Phase 1 has no auth — every user-scoped row is keyed to this fixed id
// so a real auth system can be dropped in later without a schema change.
export const LOCAL_USER_ID = "local-user";

// Reserved practice-route slug meaning "mix questions from every subject"
// rather than one specific subject — never a real Subject.slug value.
export const ASSORTED_SLUG = "assorted";
