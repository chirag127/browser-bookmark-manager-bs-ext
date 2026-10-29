# Manual Steps - Browser Bookmark Manager (BS-EXT)

**Manifest version:** Manifest V3 (MV3) for Chromium. Firefox port requires a separate manifest variant as described in section 6.

This file contains only the steps that require your manual action (accounts, credentials, store submissions, hosting settings). Everything else is already automated in the repository.

## 0. Prerequisites (one-time)

- GitHub account: `chirag127` (already used).
- Google account for Chrome Web Store (requires one-time **$5 USD** developer registration fee — payment card required by Google).
- Microsoft account (MSA) for Edge Add-ons (free, no fee).
- Mozilla account for Firefox Add-ons (AMO) (free, no fee).

Repository: https://github.com/chirag127/browser-bookmark-manager-bs-ext
Local extension folder: `browser-bookmark-manager-bs-ext/extension/` (or `dist/` after build)

---

## 1. Enable GitHub Pages (website)

The CI workflow deploys the static site automatically once Pages is enabled.

1. Open: https://github.com/chirag127/browser-bookmark-manager-bs-ext/settings/pages
2. Under **Build and deployment** → **Source**, select **GitHub Actions**.
3. Save. (No branch selection needed.)
4. Trigger a deploy by pushing to `main` (already done) or re-run the `CI` workflow:
   - https://github.com/chirag127/browser-bookmark-manager-bs-ext/actions
5. Verify the site at: https://chirag127.github.io/browser-bookmark-manager-bs-ext/
   - Expected: landing page loads, Privacy link works, no 404.
6. If 404, confirm the `pages` job in the workflow succeeded and the artifact path is `browser-bookmark-manager-bs-ext`.

Reference: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

---

## 2. Build release artifacts (local)

Run in the extension project folder:

```powershell
cd C:\ws\repos\own\public\bs-ext\browser-bookmark-manager-bs-ext
npm ci
npm run lint
npm test
npm run build
npm run validate:manifest
```

Artifacts:
- Unpacked extension: `dist/`
- Source ZIP (create manually): zip the `dist/` contents (not the folder itself) into `release/bs-ext-chrome-1.0.0.zip`.

Create ZIP (PowerShell):

```powershell
cd C:\ws\repos\own\public\bs-ext\browser-bookmark-manager-bs-ext
Compress-Archive -Path dist\* -DestinationPath release\bs-ext-chrome-1.0.0.zip -Force
```

---

## 3. Chrome Web Store submission

**Cost:** one-time $5 USD registration (payment card required by Google). No way around it for CWS.

### 3.1 Register developer account
1. Go to: https://chrome.google.com/webstore/devconsole/
2. Sign in with your Google account.
3. Accept the developer agreement and pay the $5 registration fee.
4. Complete identity verification if prompted.

Reference: https://developer.chrome.com/docs/webstore/register

### 3.2 Prepare the package
- ZIP of `dist/` contents (see step 2).
- Screenshots: 1280x800 or 640x400 PNG (at least 1).
- Icon: 128x128 PNG (already in `extension/assets/icon128.png`).
- Store listing text (copy-paste):

**Name:** Browser Bookmark Manager
**Short name:** BS-EXT
**Summary (132 chars max):**
Powerful recursive bookmark organization, sorting, duplicate detection, AI categorization, import/export, and backup.

**Description:**
Browser Bookmark Manager (BS-EXT) gives you complete control over your browser bookmarks. Features include recursive multi-key sorting with domain-aware grouping (public suffix handling), advanced search and filters, bulk operations with partial-failure reporting, duplicate detection with review, folder management (create/merge/split), a dedicated bookmark-bar migration wizard that never moves data automatically, optional AI categorization (Gemini, OpenRouter, Groq, Mistral, custom OpenAI-compatible endpoints), import/export (Netscape HTML, versioned JSON backups), recovery records, and a settings center. Local-first, privacy-conscious, no analytics by default. AI is opt-in and requires your own API key.

**Category:** Productivity
**Language:** English

### 3.3 Permission justifications (paste into review form)
- `bookmarks`: Required to read, create, move, rename, and remove bookmarks/folders on behalf of the user.
- `storage`: Required to store extension settings, metadata, search index, and recovery records locally.
- `tabs` / `activeTab` (optional): Used only to save the current page's URL/title when the user clicks "Save current page". Requested at runtime.
- Host permissions (optional): Used only when the user configures an AI provider or web research; requested at runtime.

### 3.4 Upload and submit
1. Developer Dashboard → **New item** → upload the ZIP.
2. Fill **Store listing** tab (name, summary, description, category, language, screenshots, icon).
3. Fill **Privacy** tab:
   - Single purpose: bookmark management.
   - Permission justifications (above).
   - Data usage: select "This extension does not collect or use user data" for core; AI features transmit only user-selected fields to the provider the user configures, using the user's own API key.
   - Privacy policy URL: https://chirag127.github.io/browser-bookmark-manager-bs-ext/privacy.html
4. Fill **Distribution** tab: set regions (All regions or selected).
5. Click **Submit for review**.
6. Wait for review (typically 1–3 days). Check status in dashboard.

Reference: https://developer.chrome.com/docs/webstore/publish

---

## 4. Microsoft Edge Add-ons submission

**Cost:** free. No fee.

### 4.1 Register
1. Go to: https://partner.microsoft.com/dashboard/microsoftedge/overview
2. Sign in with a Microsoft account (MSA). Work accounts are not supported for submission.
3. Complete developer registration (no payment).

Reference: https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/create-dev-account

### 4.2 Submit
1. Partner Center → **Microsoft Edge** → **Overview** → **Create new extension**.
2. Upload the same ZIP (MV3 compatible; no manifest changes needed).
3. Fill listing: name, description, category, screenshots, icon, privacy policy URL.
4. Provide permission justifications (same as Chrome).
5. Submit. Review typically 1–7 days.

Reference: https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension

---

## 5. Firefox Add-ons (AMO) submission

**Cost:** free. No fee. Requires a Firefox-compatible build (not produced yet — see section 6).

### 5.1 Register
1. Go to: https://addons.mozilla.org/developers/
2. Sign in / create a Mozilla account.
3. Accept developer agreement.

### 5.2 Submit (after Firefox build exists)
1. Developer Hub → **Submit a New Add-on** → **On this site** (listed) or **On your own** (unlisted/self-hosted).
2. Upload the Firefox ZIP.
3. Fill metadata, categories, screenshots, privacy policy URL.
4. Submit for review.

Reference: https://extensionworkshop.com/documentation/publish/submitting-an-add-on/

---

## 6. Firefox build (not yet produced)

The current architecture is Chromium-first. To add Firefox:

1. Create a separate manifest variant `manifest.firefox.json` with:
   - `browser_specific_settings.gecko.id` (e.g. `bs-ext@chirag127`).
   - Remove `optional_host_permissions` if unsupported; use `permissions` with host patterns.
   - Use `background.scripts` instead of `service_worker` if needed (Firefox supports service_worker in recent versions, but verify).
2. Replace `chrome.*` API calls with `browser.*` (or use `webextension-polyfill`).
3. Build a separate ZIP.
4. Test in Firefox via `about:debugging` → Load Temporary Add-on.
5. Submit to AMO.

Note: `browser.storage.local`, `browser.bookmarks.*` are supported. `chrome.commands` maps to `browser.commands`. Verify `chrome.runtime.openOptionsPage`.

---

## 7. CI secrets (optional, for automated store publishing)

Not required for manual submission. If you later want automation, add these as repository secrets
(Settings → Secrets and variables → Actions):

- `CHROME_EXTENSION_ID`
- `CHROME_CLIENT_ID`
- `CHROME_CLIENT_SECRET`
- `CHROME_REFRESH_TOKEN`
- `EDGE_PRODUCT_ID`
- `EDGE_CLIENT_ID`
- `EDGE_CLIENT_SECRET`
- `AMO_JWT_ISSUER`
- `AMO_JWT_SECRET`

Reference workflows: https://github.com/marketplace/actions/chrome-webstore-upload

---

## 8. Local extension testing

Chrome/Edge:
1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode**.
3. Click **Load unpacked** → select `browser-bookmark-manager-bs-ext/dist/` (or `extension/`).
4. Verify dashboard opens, bookmarks load, search/sort work.

Firefox (temporary):
1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on** → select `manifest.json`.

---

## 9. Update checklist after any change

```powershell
cd C:\ws\repos\own\public\bs-ext\browser-bookmark-manager-bs-ext
npm ci
npm run lint
npm test
npm run build
npm run validate:manifest
```

Then commit in the child repo, push, and update the parent submodule pointer:

```powershell
cd C:\ws\repos\own\public\bs-ext
git add -A
git commit -m "feat: <description>"
git push origin main
cd C:\ws
git add repos/own/public/bs-ext
git commit -m "chore: update bs-ext submodule pointer"
git push origin main
```

---

## 10. Verification URLs

- Repo: https://github.com/chirag127/browser-bookmark-manager-bs-ext
- Website (after Pages enabled): https://chirag127.github.io/browser-bookmark-manager-bs-ext/
- Privacy policy: https://chirag127.github.io/browser-bookmark-manager-bs-ext/privacy.html
- Chrome Developer Dashboard: https://chrome.google.com/webstore/devconsole/
- Edge Partner Center: https://partner.microsoft.com/dashboard/microsoftedge/overview
- Firefox Developer Hub: https://addons.mozilla.org/developers/


# Store Assets Guide — Browser Bookmark Manager (BS-EXT)

This document lists every image/icon required by each store, what we generated, and what NOT to upload.

Generated assets live in: `browser-bookmark-manager-bs-ext/store-assets/`
Extension icons live in: `browser-bookmark-manager-bs-ext/extension/assets/`

---

## Browser support matrix

| Browser | Engine | Manifest | Status | Notes |
|---|---|---|---|---|
| Google Chrome | Chromium | MV3 | Supported (primary) | Full feature set |
| Microsoft Edge | Chromium | MV3 | Supported | Same package as Chrome |
| Brave | Chromium | MV3 | Supported | Same package |
| Opera | Chromium | MV3 | Supported | Same package (Opera Add-ons optional) |
| Vivaldi | Chromium | MV3 | Supported | Same package |
| Firefox | Gecko | MV3* | Not yet (port needed) | Requires `browser.*` API + gecko id; see MANUAL_STEPS §6 |
| Safari | WebKit | — | Not supported | Different extension model (not planned) |
| Mobile browsers | — | — | Not supported | Desktop only |

\* Firefox supports MV3 in recent versions but needs a separate build.

---

## Upload cost per platform

| Platform | Registration cost | Listing fee | Notes |
|---|---|---|---|
| Chrome Web Store | **$5 USD one-time** (payment card required by Google) | Free | Mandatory for any CWS developer |
| Microsoft Edge Add-ons | Free | Free | Microsoft account (MSA) required |
| Firefox AMO | Free | Free | Mozilla account required |
| Opera Add-ons | Free | Free | Optional; same Chromium package |
| GitHub Pages (website) | Free | Free | No card required |

---

## Icons (in extension ZIP)

Required inside the extension package (manifest `icons`):

| Size | File | Purpose |
|---|---|---|
| 16x16 | `extension/assets/icon16.png` | Toolbar / favicon |
| 32x32 | `extension/assets/icon32.png` | Windows taskbar |
| 48x48 | `extension/assets/icon48.png` | Extension management page |
| 128x128 | `extension/assets/icon128.png` | Store listing + install dialog |

We also generated: 64, 96, 256 (for Firefox/Opera) in the same folder. Extra sizes are harmless.

Format: PNG, square, no transparency issues (opaque background recommended). Do NOT use SVG for store icons (Chrome requires PNG in ZIP; SVG allowed in manifest for some contexts but PNG is safest).

---

## Chrome Web Store — upload requirements

### Required
- ZIP of `dist/` contents (extension package).
- 128x128 icon (inside ZIP, referenced by manifest).
- At least **1 screenshot**: 1280x800 OR 640x400, PNG/JPEG, **no padding, square corners**, no alpha.
- Up to 5 screenshots.
- Short description ≤ 132 characters.
- Privacy policy URL.

### Optional (recommended)
- Small promo tile: **440x280** PNG/JPEG.
- Marquee promo tile: **1400x560** PNG/JPEG.
- YouTube video link.

### What NOT to upload to CWS
- Source maps with secrets, `.env`, `node_modules/`, `tests/`, `scripts/`, `dist/` (upload the *contents* of dist, not the folder).
- More than 5 screenshots.
- Images with rounded corners or padding (store adds its own).
- Trademarked third-party logos without permission.

Generated files:
- `store-assets/screenshot-1280x800.png`
- `store-assets/screenshot-640x400.png`
- `store-assets/promo-440x280.png`
- `store-assets/promo-1400x560.png`
- `store-assets/icon-128.png`, `icon-256.png`, `icon-512.png`

Reference: https://developer.chrome.com/docs/webstore/images

---

## Microsoft Edge Add-ons — upload requirements

Same as Chrome (Chromium package). Image requirements:
- Icon 128x128 (in ZIP).
- Screenshots: 1280x800 or 640x400 (min 1, max 10).
- Optional small tile 440x280, large tile 1400x560.
- Privacy policy URL.

Use the same generated assets. No separate build needed.

Reference: https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension

---

## Firefox AMO — upload requirements

### Package
- ZIP of extension files (same structure; needs `browser_specific_settings.gecko.id` for MV3).
- Source code ZIP may be required if code is minified/obfuscated (ours is not minified, but provide source anyway for safety).

### Images
- Icon: 32x32, 64x64, 128x128 (AMO scales). Provide 256 for high-DPI.
- Screenshots: recommended 1280x800 or 1920x1080; min 320x240; max 3840x2160.
- No specific promo tile required; AMO uses icon + screenshots.

### What NOT to upload to AMO
- Minified code without source.
- Remote code (AMO policy prohibits).
- Executable binaries.

Generated: reuse `store-assets/screenshot-1280x800.png` and `icon-128.png`/`icon-256.png`.

Reference: https://extensionworkshop.com/documentation/publish/submitting-an-add-on/

---

## Opera Add-ons — upload requirements (optional)

- Same Chromium package.
- Icon 256x256 recommended.
- Screenshots 1280x800.
- Use `store-assets/icon-256.png`.

Reference: https://dev.opera.com/extensions/publishing-guidelines/

---

## Image design guidelines (all stores)

1. **Screenshots must show the actual UI** — replace generated mockups with real captures before final submission. Mockups are placeholders.
2. **No misleading imagery** — do not fabricate user counts, ratings, or testimonials.
3. **Readable text** — minimum 14px equivalent; high contrast.
4. **Consistent branding** — navy (#1e3a8a) + blue (#2563eb) palette, white bookmark icon.
5. **No third-party trademarks** without permission.
6. **Privacy policy link** must be live before submission.
7. **Icons:** keep simple; recognizable at 16px.

---

## What to upload vs. not upload (summary)

| Upload | Do NOT upload |
|---|---|
| `dist/*` contents zipped | `node_modules/`, `tests/`, `scripts/`, `.git/` |
| `icon16/32/48/128.png` (in ZIP) | Source maps with secrets |
| Screenshots (store dashboard) | `.env` files |
| Privacy policy URL | API keys / credentials |
| Short + full description | Fake testimonials / user counts |
| Promo tiles (optional) | Unlicensed third-party assets |

---

## File naming convention for final submission ZIPs

- `bs-ext-chrome-1.0.0.zip` — Chrome/Edge/Opera/Brave/Vivaldi
- `bs-ext-firefox-1.0.0.zip` — Firefox (when ported)
- `bs-ext-source-1.0.0.zip` — source code for AMO review
---

# Part II — All Browser Extension Stores: Links, Accounts, and Upload Steps

This section covers **every** major extension store where this extension can be published, with direct links and step-by-step upload instructions.

---

## A. Google Chrome Web Store (CWS)

- Developer dashboard: https://chrome.google.com/webstore/devconsole/
- Publish docs: https://developer.chrome.com/docs/webstore/publish
- Image requirements: https://developer.chrome.com/docs/webstore/images
- Registration: https://developer.chrome.com/docs/webstore/register
- Review/updates blog: https://developer.chrome.com/blog/cws-review-updates-2026

**Account cost:** one-time $5 USD (payment card required by Google).

**Steps to create & upload:**
1. Open https://chrome.google.com/webstore/devconsole/ → sign in with Google account.
2. Pay the $5 registration fee if not already registered.
3. Click **New item**.
4. Upload the ZIP (`bs-ext-chrome-1.0.0.zip`).
5. **Store listing tab:** name, summary (≤132 chars), description, category (Productivity), language, screenshots (1280x800 or 640x400, 1–5), icon (128x128 from ZIP), optional promo tiles (440x280, 1400x560).
6. **Privacy tab:** single purpose = bookmark management; permission justifications (see MANUAL_STEPS §3.3); privacy policy URL = https://chirag127.github.io/browser-bookmark-manager-bs-ext/privacy.html; data usage disclosures.
7. **Distribution tab:** regions.
8. Click **Submit for review**.
9. Monitor status in dashboard. Review: ~1–3 days.

**Manifest:** MV3 (`manifest_version: 3`). Already set.

---

## B. Microsoft Edge Add-ons

- Developer portal: https://partner.microsoft.com/dashboard/microsoftedge/overview
- Registration: https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/create-dev-account
- Publish guide: https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension
- Submission states: https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/submission-states

**Account cost:** Free. Microsoft account (MSA) required (Outlook/Live/Hotmail). Work accounts not accepted.

**Steps to create & upload:**
1. Open https://partner.microsoft.com/dashboard/microsoftedge/overview → sign in with MSA.
2. Complete developer registration (no fee).
3. Click **Create new extension**.
4. Upload the same Chromium ZIP.
5. Fill listing: name, description, category, screenshots (1280x800 or 640x400, 1–10), icon, privacy policy URL.
6. Permission justifications (same as Chrome).
7. Submit. Review: ~1–7 days.

**Manifest:** MV3. Same package as Chrome — no changes needed.

---

## C. Firefox Add-ons (AMO)

- Developer hub: https://addons.mozilla.org/developers/
- Submit new add-on: https://addons.mozilla.org/developers/addon/submit/
- Submitting guide: https://extensionworkshop.com/documentation/publish/submitting-an-add-on/
- Porting Chrome guide: https://extensionworkshop.com/documentation/develop/porting-a-google-chrome-extension/
- MV3 migration: https://extensionworkshop.com/documentation/develop/manifest-v3-migration-guide/
- Source code submission: https://extensionworkshop.com/documentation/publish/source-code-submission/

**Account cost:** Free. Mozilla account required.

**Steps to create & upload (after Firefox build exists):**
1. Open https://addons.mozilla.org/developers/ → sign in / create Mozilla account.
2. Accept developer agreement.
3. Go to https://addons.mozilla.org/developers/addon/submit/.
4. Choose **On this site** (listed) or **On your own** (self-distributed).
5. Upload the Firefox ZIP.
6. If code is minified, also upload source code ZIP + build instructions.
7. Fill metadata: name, summary, description (Markdown supported), categories, tags, screenshots (1280x800 recommended), icon (128x128/256).
8. Set license, privacy policy URL.
9. Submit for review.

**Manifest:** Requires `browser_specific_settings.gecko.id` and `browser.*` API usage. See MANUAL_STEPS §6 (Firefox build).

---

## D. Opera Add-ons

- Developer portal: https://addons.opera.com/developer/
- Publishing guidelines: https://dev.opera.com/extensions/publishing-guidelines/

**Account cost:** Free.

**Steps:**
1. Open https://addons.opera.com/developer/ → create account.
2. Upload the Chromium ZIP (same as Chrome).
3. Fill listing, screenshots (1280x800), icon (256x256 recommended).
4. Submit for review.

**Manifest:** MV3. Same package as Chrome.

---

## E. Brave / Vivaldi / other Chromium browsers

These browsers install extensions from the **Chrome Web Store**. No separate store submission needed. Once published on CWS, users on Brave/Vivaldi can install directly.

- Brave: https://brave.com/ (uses CWS)
- Vivaldi: https://vivaldi.com/ (uses CWS)

---

## F. Safari (Apple) — NOT supported

- Safari extensions use a different model (Xcode + Apple Developer Program, $99/year).
- Not planned for this project. If needed later: https://developer.apple.com/safari/extensions/

---

## G. Naver Whale Store (optional, Korea)

- Developer: https://store.whale.naver.com/developers
- Uses Chromium extensions. Free.

---

## H. GitHub (source + website) — already done

- Repository: https://github.com/chirag127/browser-bookmark-manager-bs-ext
- Website: https://chirag127.github.io/browser-bookmark-manager-bs-ext/ (enable Pages — see MANUAL_STEPS §1)
- Releases: https://github.com/chirag127/browser-bookmark-manager-bs-ext/releases (create a release + attach ZIPs)

**Create a GitHub Release (copy-paste):**
1. Open https://github.com/chirag127/browser-bookmark-manager-bs-ext/releases/new
2. Tag: `v1.0.0`, target: `main`, title: `v1.0.0`
3. Description: paste CHANGELOG.md contents.
4. Attach `bs-ext-chrome-1.0.0.zip` (and source zip).
5. Click **Publish release**.

---

## Quick reference: where to upload what

| Artifact | Upload to |
|---|---|
| `bs-ext-chrome-1.0.0.zip` | CWS, Edge Add-ons, Opera Add-ons, GitHub Releases |
| `bs-ext-firefox-1.0.0.zip` | AMO, GitHub Releases (when ported) |
| `bs-ext-source-1.0.0.zip` | AMO (source code submission) |
| `store-assets/*.png` | Store dashboards (screenshots/promo) — NOT in extension ZIP |
| `extension/assets/icon*.png` | Inside extension ZIP (manifest icons) |
| `index.html` / `privacy.html` | GitHub Pages (auto-deployed) |

---

## What NOT to upload anywhere

- `node_modules/`, `tests/`, `scripts/`, `.git/`
- `.env` or any file with API keys
- Source maps containing secrets
- Fake testimonials, user counts, or ratings
- Unlicensed third-party logos/icons
- More screenshots than the store allows (CWS max 5, Edge max 10)
