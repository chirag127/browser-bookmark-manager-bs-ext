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


