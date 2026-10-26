# 🐰 Mochi v1000000 — Ten Lakh, Really Final

**Project #01 of the 100+ AI Projects series — by Aryan Kumar Shah — FINAL**

## Login / Logout — true reel mixture, ultimate level
Reel 1 (code_zenith.ai): split card, glowing teal border, diagonal black/teal split, Register side with teal WELCOME! panel + form, Login side with form + teal WELCOME BACK! panel.
Reel 2 (_code_and_chill_): dark translucent Sign in card, Email + Password with eye + Forgot?, pill Log in button that runs away until you earn it — empty dodges, one field half speed, both fields snap home and lock in bright teal, never disabled, Tab stops it, Enter always submits.
Mochi's mixture, original code (no copied code): split teal + white card with bunny on the teal side, WELCOME! on Sign Up / WELCOME BACK! on Login, plus the Runaway button above, plus Guest / Google demo / Forgot local reset from before, all fitting perfectly on phone and laptop:
- Login / Sign Up tabs in one card, not two pages
- Email + password with show/hide eye, Remember me, inline validation (valid email, password min 6)
- Continue with Google button (demo on this phone — no real Google OAuth, no data leaves your phone)
- Continue as Guest — no account needed, keeping the old no-login promise
- Forgot password: local reset code shown on this phone only (no server, no email sent), enter code + new password to reset
- Profile chip in the header (your name after login, Guest otherwise) + Logout button
- Logout: confirms, ends only the login session, chats/notes stay on your phone, returns to login screen
- Session persistence: if you logged in before, Mochi skips login next time

Honest limit: this is a local login for a static GitHub Pages app — there is no real server, no real Google login, and no real email password reset. It is perfect for a personal / demo app, and it never sends your password anywhere. A real multi-user login would need a backend server (Firebase / Supabase) later.

## Gaps filled in v1000000
- Login / logout / profile / guest / forgot / social demo (above)
- Perfect fit: login card max 440px centred, chat max 760px, buttons wrap, no overflow on small phones, bunny image 512x512
- All v100000 kept: Deep Think, photo upload + Gemini vision (with your own free key), writing, coding, search + images, memory, voice, study, notes, New Chat, export
- Stable: static CDN, service-worker cache v1000000, per-user Gemini quota, parallel search with timeout + fallback

Just upload and it works — same repo, same live link.
