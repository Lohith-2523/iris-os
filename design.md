# Design — Iris OS

This file records the existing Iris OS system and the approved authentication-page variant. It does not replace workspace-level product styles.

## Genre

Modern-minimal enterprise software with restrained graphite, titanium, silver, and porcelain surfaces.

## Macrostructure families

- Authentication pages: Split Studio — full-height supplied video at left, abstract porcelain orbit and functional form at right.
- Application pages: retain the existing Iris OS workspace shell and domain-specific layouts.
- Content pages: retain the existing typographic and reporting structures.

## Theme

- Paper: cool porcelain, expressed through `--color-auth-paper`.
- Ink: cool graphite, expressed through `--color-auth-ink`.
- Accent: monochrome; focus is a restrained cool graphite signal.
- Video treatment: supplied footage with a translucent dark-grey overlay.

## Typography

- Display: Clash Display, weight 700, upright.
- Body: Sansation, weight 400.
- Mono: Geist Mono for compact system labels only.

## Spacing and motion

- Four-point named spacing scale in `tokens.css`.
- Motion is limited to video opacity and control transforms.
- Reduced-motion users receive a static graphite video panel and no media download.

## Authentication performance contract

- The form and logo render before the video is requested.
- Desktop video loading begins during browser idle time with `preload="none"`.
- The video fills the fixed authentication viewport at every size where motion is allowed.
- The versioned local asset is served with immutable one-year caching.

## Shared requirements

- Login and signup share one auth shell and the same control states.
- Existing Supabase authentication, bootstrap, OAuth, validation, and redirects remain unchanged.
- The right-side porcelain orbit may change dimensions responsively, but the form must remain readable at 320, 375, 414, and 768 px widths.
