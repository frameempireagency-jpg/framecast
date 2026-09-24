// Instant mode uploads while you record and hands back a share link, which
// needs the FrameCast web server. Frame Empire has not deployed one yet:
// framecast.frameempire.co.uk has no DNS record (checked 2026-09-24). With
// Instant on, a new user picked it in onboarding, pressed record, was asked
// to log in, and landed on "site can't be reached". So this build records in
// Studio mode only, straight to the person's own disk, and Instant comes
// back by building with VITE_INSTANT_MODE=true once the server exists.
export const INSTANT_ENABLED = import.meta.env.VITE_INSTANT_MODE === "true";
