# Resource Matcher — AI-Powered Resource Allocation Tool

Match open project demands to the right people on your roster using AI.

---

## Prerequisites

Install these once on your machine before running the app:

| Tool | Version | Download |
|------|---------|----------|
| Python | 3.10 or higher | https://www.python.org/downloads/ |
| Node.js | 18 or higher | https://nodejs.org/ |
| pip | bundled with Python | — |

---

## One-Time Setup

### Step 1 — Install Python

Use Homebrew (recommended):

```
brew install python
```

Verify the installation:

```
python3 --version
```

If the version still shows an old version (e.g. 3.9.x), update your PATH so your terminal uses the Homebrew-installed Python:

```
echo 'export PATH="/opt/homebrew/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
python3 --version
```

It should now show Python 3.14.x or higher.

Verify pip is also available:

```
pip3 --version
```

---

### Step 2 — Install Node.js

Use Homebrew:

```
brew install node
```

Verify:

```
node --version
npm --version
```

You should see v18 or higher for Node.js.

---

### Step 3 — Install Backend Dependencies

Navigate to the backend folder and create a virtual environment first (required on macOS with Homebrew Python):

```
cd resource-matcher/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

You should see `(venv)` at the start of your terminal prompt when the virtual environment is active.

> **Important:** Every time you open a new Terminal to run the backend, you must activate the virtual environment again with `source venv/bin/activate` before starting the server.

---

### Step 4 — Install Frontend Dependencies

```
cd ../frontend
npm install
```

Note: Any warnings about vulnerabilities or install scripts are normal and will not affect the app.

---

## Running the App

You need **two terminals open at the same time**.

**Terminal 1 — Backend**

```
cd resource-matcher/backend
source venv/bin/activate
uvicorn main:app --reload
```

Leave this running. You should see: `Uvicorn running on http://127.0.0.1:8000`

**Terminal 2 — Frontend**

```
cd resource-matcher/frontend
npm run dev
```

Leave this running. You should see: `Local: http://localhost:5173`

**Then open your browser and go to:**

```
http://localhost:5173
```

---

## Configuring the App (First Run)

### Step 1 — Get a free Groq API key
1. Go to https://console.groq.com
2. Sign up for a free account
3. Click **API Keys** → **Create API Key**
4. Copy the key (starts with `gsk_...`)

### Step 2 — Enter the API key in the app
1. On the home page, paste your key into the **Groq API Key** field
2. Click **Save**
3. The key is stored locally and remembered across restarts — you only need to do this once

### Step 3 — Upload your files
1. Upload your **HC Roster** CSV (the resource/headcount report)
2. Upload your **Demands List** CSV (the open demands extract)
3. Both files are remembered — you only need to re-upload when the data changes

### Step 4 — Match resources
1. Click **Browse Demands**
2. Pick any open demand
3. Click **Match Resources** — the AI will rank the best candidates with explanations

---

## File Format Requirements

### HC Roster CSV
Must include these columns (exact names):
- `Personnel No`, `Name`, `Level`
- `Primary Skill`, `Skill (Secondary)`
- `Proficiency (Latest Cycle)`
- `Name of Employment Status` (used to filter Active only)
- `Activity Category` (used to detect bench/available)
- `Roll Off Date`, `Schedulable as of`
- `Resource Location`, `Home Loc`, `Email Address`
- `Project`, `Sum of FTE`

### Demands CSV
Must include these columns:
- `RRD Number`, `Project`, `Engagement Name`, `Client`
- `Primary Skill`, `Additional Skills`
- `Management Level`, `Management Level Flex`
- `Demand Status` (Active/Open rows are shown)
- `Requested Start Date`, `Expected Fulfillment Date`
- `Source Location`, `Project Role`

---

## Troubleshooting

**`zsh: command not found: python`**
→ Use `python3` instead. macOS no longer ships with `python` as a command.

**`externally-managed-environment` error when running pip**
→ You must use a virtual environment. See Step 3 in One-Time Setup above.

**`(venv)` not showing in terminal**
→ You need to activate the virtual environment. Run `source venv/bin/activate` from inside the `backend` folder before starting the server.

**"Groq API key not set"**
→ Go back to the home page and re-enter your API key. Each team member needs their own free Groq key.

**"Both files must be uploaded first"**
→ Upload the Roster and Demands CSV on the home page before matching.

**"Request too large"**
→ You are on the free tier (8,000 tokens/min limit). The app already limits candidates to 12 per match. This usually resolves by waiting a minute and clicking Try again.

**Matching fails repeatedly**
→ Check that the backend terminal is still running (Terminal 1). Restart it if needed. Make sure the virtual environment is activated before running uvicorn.

**CSV upload fails with encoding error**
→ The app supports UTF-8, Latin-1, and Windows-1252 encoded files. If it still fails, open the file in Excel and Save As → CSV UTF-8.

---

## Notes

- Each team member needs their own Groq API key (free at console.groq.com)
- Uploaded files and API keys are stored locally in `backend/data/` — not shared across machines
- The app runs entirely on your local machine — no data is sent anywhere except to Groq's API for AI matching
- Free tier Groq accounts have an 8,000 tokens/minute limit — sufficient for normal usage
- The virtual environment (`venv` folder) is created inside `backend/` and must be activated each time you open a new terminal
