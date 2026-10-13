# Apex Robotics — team website

FIRST® Tech Challenge Team 36674 · Tracy, California · BIOBUZZ™ 2026–27.

Next.js 16 + React 19 + Tailwind 4 + three.js. Every page is static.

## Run it on your computer

```bash
npm install        # first time only
npm run dev        # open http://localhost:3000
```

Pages reload as you save. Stop the server with Ctrl+C.

## Where to change things

All the text and numbers live in `src/content/`. Each file starts with a comment explaining how to edit it.

| To change… | Edit |
|---|---|
| Team name, links, email, socials, navigation | `src/content/site.ts` (the safest file to edit) |
| Members, roles, bios, photos | `src/content/team.ts` |
| Robot specs, home-page story chapters | `src/content/robot.ts` |
| Outreach log | `src/content/outreach.ts` |
| Sponsor tiers and signed sponsors | `src/content/sponsors.ts` |
| Links page | `src/content/links.ts` |
| Code page (pipeline, excerpts, stack) | `src/content/code.ts` |
| BIOBUZZ game facts | `src/content/season.ts` (re-check after each Team Update) |

## Common jobs

**Add a member's photo**
1. Put the original photo at `public/team/<slug>-full.jpg`, and a 4:5 crop centred on the face at `public/team/<slug>.jpg`. The slug is the one in `team.ts`, e.g. `sehej-ahuja`.
2. In `team.ts`, add `photo: { src: "/team/<slug>.jpg", full: "/team/<slug>-full.jpg", focal: [50, 42] }` to that member.
3. Set `consent: true` only after the coach confirms a signed *FIRST* Consent & Release form for this season. Until then the site shows the "PHOTO PENDING" plate.
4. Run `npm run portraits`. This makes the black-and-white engraved version the site uses.

**Write a bio:** replace the member's `bio` text in `team.ts`, then delete `bioPending: true`.

**Show "First L." instead of full names:** in `site.ts`, set `privacy.nameFormat` to `"initial"`.

**Add the real robot CAD:** export it as `public/models/apex-r1.glb`, then restart `npm run dev`. Follow `docs/ROBOT-MODEL.md`: Onshape exports GLB directly, and Fusion 360 goes STEP → Onshape → GLB. Run `npm run model:check` to see which parts the site found. The home page, Meet the Robot and CAD all switch to your model automatically.

**Add a sponsor:** add them to `sponsors` in `sponsors.ts`, with their permission to show the logo. Never put a student's personal email on the site; use a team inbox in `site.links.email`.

**Log outreach:** add an entry in `outreach.ts`. Use the official *FIRST* Outreach Terms, and count reach on the low side.

## Before you publish

```bash
npm run typecheck   # must report no errors
npm run lint        # no errors (a few warnings in vendored UI components are expected)
npm run build       # every route should show ○ (static)
npm run shots       # optional: screenshots of every page in scripts/shots/all
```

## Hosting

Deploy on Vercel. Set `NEXT_PUBLIC_SITE_URL` to the site's public address, so share previews and the sitemap use the right domain.

## Design notes

- The visual system ("Engraved Instrument": graphite plus BIOBUZZ yellow `#F7E326`; Hubot Sans / Mona Sans / Martian Mono) is described in `docs/design/DESIGN_SPEC.md`.
- Animations come from the shared kit in `src/components/motion/`. Keep the look minimal: add motion, not clutter.
- *FIRST* branding rules: write *FIRST*® in italics (use the `<Mark>` component), and write BIOBUZZ™ in capitals. Never animate or recolour official logos.

## Credits

UI components adapted from [Cult UI](https://cult-ui.com) (MIT), [Watermelon UI](https://ui.watermelon.sh) (MIT) and [Skiper UI](https://skiper-ui.com) (attribution required; keep the file headers). Fonts: Hubot Sans, Mona Sans (GitHub) and Martian Mono (Evil Martians), all under the OFL. The robot code is at [github.com/aaaravM/ApexFTC2026---36674](https://github.com/aaaravM/ApexFTC2026---36674).
