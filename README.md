# CompanionPal 🌿

> **An intelligent, accessible, and caring daily companion for older adults, powered by the Google Gemini API.**

---

## 5-Line Summary
1. **Built For Seniors**: Designed specifically for older adults who feel overwhelmed or excluded by modern fast-paced, high-tech interfaces.
2. **Everyday Confidence**: Turns confusing letters and bills into plain language, screens suspicious calls and SMS messages for scams, and gives gentle step-by-step guidance.
3. **Warm & Dignified**: "The Living Room Morning Paper" design aesthetic features large 20px+ readable text, soothing high-contrast colors (WCAG AAA), and voice read-aloud.
4. **Proactive Care**: Organizes daily reminders for medicines, doctor visits, and calls with family, accompanied by an intelligent morning briefing.
5. **Real GenAI Only**: Every single answer is generated live by Google Gemini with strict server-side validation—zero canned answers and zero silent fallbacks.

---

## Demo Login Credentials
For demonstration and reviewer access, the server provides two pre-configured accounts:

| Role | Username | Password |
| :--- | :--- | :--- |
| **Account 1 (Senior User)** | `senior.demo` | `Comfort#2026` |
| **Account 2 (Family Helper)** | `family.demo` | `Helper#2026` |

*Note: These credentials are dummy demonstration accounts stored only in server environment variables and never exposed in front-end client code.*

---

## Core Features
1. **Explain This**: Paste any confusing bill, clinic notice, prescription note, or official letter. Receives a plain-language summary (Grade-6 reading level) with what it says, what to do next, and any deadlines.
2. **Is This a Scam?**: Paste a suspicious phone call description, WhatsApp message, or SMS. The model returns a verified verdict (**Looks Safe**, **Be Careful**, or **Likely Scam**), simple reasons, and safe next actions.
3. **Step-by-Step Help**: Ask how to do any task (e.g. "How to make a video call on WhatsApp"). The model delivers numbered steps shown one at a time with large Previous and Next buttons.
4. **My Day**: Manage medicines, appointments, and family calls. Reminders are privately stored in your browser's `localStorage` (separated per user). One click generates a warm, personalized morning briefing with weather and wellness nudges.
5. **Just Chat**: A warm, patient conversation companion that listens without rush, remembers the conversation, and always offers to explain or repeat.

---

## Accessibility & Senior-Friendly UX
- **A+ / A- Font Size Controls**: Scales text dynamically up to 140%.
- **High Contrast Toggle**: Switches with one click between soothing parchment mode and stark black/yellow high-contrast mode.
- **Voice Dictation (Microphone)**: Speak instead of typing using the browser's built-in Web Speech API.
- **Read Aloud (Speaker)**: Listen to any explanation with an adjustable gentle and slow reading speed option.
- **Large Touch Targets**: All buttons are 56px or taller with bold outlines and distinct icons.
- **Contextual Adaptation**: Seamlessly handles currency and regional references for India (₹ rupees, power cut SMS, KYC, Aadhaar), the US ($ dollars, IRS, Medicare), the UK (£ pounds, NHS), and globally.

---

## How to Run Locally

### 1. Prerequisites
- Node.js (version 18 or later)
- A free Gemini API key from [Google AI Studio](https://aistudio.google.com/)

### 2. Setup
Clone or navigate to the project directory:
```bash
cd companion-pal
```

Open the `.env` file and paste your Gemini API key:
```ini
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
DEMO_USER_1=senior.demo
DEMO_PASS_1=Comfort#2026
DEMO_USER_2=family.demo
DEMO_PASS_2=Helper#2026
SESSION_SECRET=companionpal_super_secure_session_secret_2026_elderly_care_access
PORT=3000
```

### 3. Start the Server
```bash
npm start
```
Open your browser and visit: **http://localhost:3000**

---

## How to Run the Automated End-to-End Tests
To run the automated test suite against the server and verify all 16 security and AI checks:
```bash
npm test
```
The test suite verifies:
- AI endpoint returns 401 Unauthorized without a valid session.
- Wrong credentials are rejected with friendly, non-revealing messages.
- Both demo accounts successfully log in and receive signed HttpOnly session cookies.
- All 5 AI features make real, live calls to Gemini and return valid responses.
- Structured JSON outputs for Scam Detection and Step-by-Step Help are strictly validated.
- Different inputs produce distinct responses (proving they are not canned).
- Edge cases (empty input, oversized input, session invalidation on logout).
- `/api/health` connectivity check.

---

## Step-by-Step for Non-Tech Users (Deployment to Vercel)
Follow these 8 simple numbered steps to put CompanionPal live on the internet:

1. **Get your free Gemini API key**: Visit [aistudio.google.com](https://aistudio.google.com/), sign in with your Google account, click the blue button **Get API key**, and copy the long key shown on screen.
2. **Create a free GitHub account**: Go to [github.com](https://github.com/), create an account if you do not have one, click the **+** icon in the top-right corner, and click **New repository**. Name it `companion-pal` and click **Create repository**.
3. **Upload project files**: On your new repository page, click **uploading an existing file**, drag and drop all the files from this `companion-pal` folder into the box (do not upload `.env` or `node_modules`), and click **Commit changes**.
4. **Sign in to Vercel**: Go to [vercel.com](https://vercel.com/), click **Sign Up**, choose **Continue with GitHub**, and authorize Vercel.
5. **Import your repository**: On the Vercel dashboard, click **Add New...** then **Project**, find `companion-pal` in the list, and click **Import**.
6. **Add your Environment Variables**: Under the **Environment Variables** section on the Vercel screen, add these 6 entries one by one:
   - `GEMINI_API_KEY`: *(paste the key from Step 1)*
   - `DEMO_USER_1`: `senior.demo`
   - `DEMO_PASS_1`: `Comfort#2026`
   - `DEMO_USER_2`: `family.demo`
   - `DEMO_PASS_2`: `Helper#2026`
   - `SESSION_SECRET`: `companionpal_live_production_secret_key_2026`
7. **Deploy and open the live website**: Click the blue **Deploy** button. When the confetti appears, click on your live link (`https://companion-pal-....vercel.app`).
8. **Test your new website**: Click **Use Account 1** to fill the demo login, click **Log In to CompanionPal**, and try any of the 5 big buttons!

### How to Update the Site Later
Whenever you want to change wording or colors, simply click on the file on `github.com`, click the pencil icon to edit, and click **Commit changes**. Vercel will automatically detect your change and update your live website in under a minute.

---

## If Something Goes Wrong (Checklist)

1. **"Gemini API key is not configured" or AI fails to answer**:
   - *Fix*: Check that `GEMINI_API_KEY` was added in Vercel under **Settings > Environment Variables** without any accidental spaces around the key. If you just added it, click **Redeploy**.
2. **Login says "That did not match" even with demo credentials**:
   - *Fix*: Ensure `DEMO_USER_1`, `DEMO_PASS_1`, `DEMO_USER_2`, and `DEMO_PASS_2` match the exact capitalization shown in this guide (`senior.demo` / `Comfort#2026`). Also ensure `SESSION_SECRET` is set.
3. **Free-tier Gemini rate limit warning (Too many requests)**:
   - *Fix*: Google Gemini's free tier allows 15 requests per minute. If you test very rapidly, wait 30 seconds and click the button again.

---

## How to Customize CompanionPal

### 1. Changing the AI's Tone or Reading Level
Open `api/_shared/gemini.js` and edit `SYSTEM_PROMPT_BASE`:
- To make it even simpler, change `"Grade-6 reading level"` to `"Grade-4 reading level"`.
- To adapt to other regional languages (e.g. Hindi, Spanish, Tamil), add a sentence like: *"If the user writes in Hindi or another language, answer warmly in that same language."*

### 2. Changing the Color Palette
Open `public/css/style.css` and edit the `:root` block:
- Change `--bg` to adjust the background parchment tint.
- Change `--primary` (currently slate teal `#1B524B`) to your preferred soothing primary color (e.g., navy `#1A3A5A` or forest green `#1E4E2B`).
- Change `--accent` (currently warm terracotta `#B3532F`).

### 3. Changing the Fonts
Open `public/css/style.css` and replace the `@import url(...)` at line 8 with your preferred Google Font pairing, then update `font-family` on `body` (for text) and `h1, h2, h3` (for headings).
