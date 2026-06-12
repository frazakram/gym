# NotebookLM Marketing Video — Source Bundle

This folder contains everything you need to feed into NotebookLM to generate a high-quality marketing walkthrough video for the app.

## How to use

1. Open [notebooklm.google.com](https://notebooklm.google.com) and create a new notebook.
2. Upload these five files as **Sources** (in any order):
   - `01-product-brief.md`
   - `02-feature-deep-dive.md`
   - `03-target-user-and-voice.md`
   - `04-walkthrough-script.md`
   - `05-competitive-positioning.md`
3. Open `06-notebooklm-prompt.md` and copy the prompt block.
4. In NotebookLM, click **Studio → Video Overview → Customize**, and paste the prompt.
5. Generate. Wait 2–5 minutes.
6. Download the MP4.
7. Open it in CapCut and follow the post-production checklist at the bottom of `06-notebooklm-prompt.md`.

## Important: app name

All five source files use **"Repsy"** as a placeholder name. If you pick a different name (Atlas, Akhara, Forj, etc.), do a find-and-replace across all six markdown files before uploading. Search for `Repsy` (case-sensitive) and replace with your chosen name.

## What each file does

| File | Role |
|------|------|
| `01-product-brief.md` | One-page strategic overview. The "what & why" of the app. |
| `02-feature-deep-dive.md` | Each feature framed as a benefit, not a spec. Gives NotebookLM the language to describe features without going technical. |
| `03-target-user-and-voice.md` | Who you're talking to + how to talk to them. Critical for tone. |
| `04-walkthrough-script.md` | Suggested scene-by-scene narrative spine for the video. |
| `05-competitive-positioning.md` | Why Repsy is different from competitors. Helps NotebookLM avoid generic "fitness app" framing. |
| `06-notebooklm-prompt.md` | The exact custom-instructions prompt to paste into NotebookLM's Video Overview generator. |
