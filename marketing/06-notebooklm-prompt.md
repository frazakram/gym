# NotebookLM — Custom Prompt and Post-Production Guide

## How to use this file

1. Open NotebookLM with all five source files (`01` through `05`) already uploaded.
2. Click **Studio** in the right panel.
3. Click **Video Overview**.
4. Click **Customize**.
5. Copy the prompt block below and paste it into the customization field.
6. Click **Generate**. Wait two to five minutes.
7. Download the MP4 when ready.

---

## The prompt to paste (v2 — simpler, more reliable)

NotebookLM's Video Overview tends to fail or produce poor output when the customization prompt is too long or heavy on negative ("do not") instructions. This v2 prompt is short, positive, and lets NotebookLM do what it's actually good at.

```
Create a short marketing walkthrough video for Repsy, an AI personal trainer app made for Indian gym-goers.

Focus on these four features in this order:
1. Show your gym in a photo, the AI detects your equipment
2. Upload a body photo, the AI analyzes your composition
3. Tap one button, get a complete weekly workout routine in 10 seconds
4. Every Sunday, a weekly report with a muscle activation heatmap and a personal note from your AI coach

Tone: warm, confident, conversational. Talk directly to the viewer using "you" and "your". Sound like a smart friend, not a salesperson.

Audience: urban Indian gym-goers, age 24 to 35, who have tried other fitness apps and been disappointed by generic plans.

Style: clean visual slides, one headline per slide, single narrator voice. End with a call to action: free for 7 days.
```

That's it. Paste exactly that. NotebookLM works much better with positive guidance than long lists of restrictions.

---

## If v2 also fails — troubleshooting checklist

Try these in order:

### 1. Reduce sources
NotebookLM Video Overview has practical limits. If you uploaded all five markdown files, the model may be hitting size or complexity caps. Try this:
- Remove `02-feature-deep-dive.md` and `05-competitive-positioning.md`
- Keep only `01-product-brief.md`, `03-target-user-and-voice.md`, and `04-walkthrough-script.md`
- Regenerate

### 2. Remove the customization prompt entirely
First try generating with NO customization at all — just the default Video Overview button. If that succeeds, you know your sources work and it's the prompt that's failing. Then incrementally add back instructions.

### 3. Try the Audio Overview first
If video keeps failing, generate the **Audio Overview** (podcast format) first. It's NotebookLM's most mature feature and almost never fails. You can then use the audio as the voiceover layer in CapCut, and build your own visuals around it. This is actually how a lot of people use NotebookLM for marketing — they only care about the AI voiceover, and they build their own visuals.

### 4. Check source content
- Make sure every uploaded markdown file is under 50KB
- Make sure none of them contain unusual characters or formatting
- Try removing the tables in `05-competitive-positioning.md` — markdown tables sometimes confuse Video Overview

### 5. Try at a different time
NotebookLM Video Overview is in active development and the backend is occasionally rate-limited or temporarily broken. If three attempts fail, wait an hour and try again. Check the [NotebookLM status page](https://notebooklm.google.com) or their subreddit for outage reports.

### 6. Fallback: use Audio Overview + your own slides
- Generate the Audio Overview
- Download the MP3
- In CapCut, create a sequence of your screen recordings
- Lay the MP3 over them as the soundtrack
- Trim screen recordings to match the audio timing

This is the **most reliable** path and arguably better than what Video Overview produces, because every visual is your real app instead of NotebookLM's generic slides.

---

## The prompt for Audio Overview (if you go that route)

```
Create a 90-second marketing walkthrough audio narration for Repsy, an AI personal trainer app for Indian gym-goers.

Use a single warm, confident narrator (not the two-host podcast format).

Cover these features, in this order:
1. Take a photo of your gym, the AI detects your equipment
2. Upload a body photo, the AI analyzes your composition
3. Tap one button, get a personalized weekly routine in 10 seconds
4. Every Sunday, get a muscle activation heatmap report with an AI coach note

Speak directly to the viewer in second person. End with: "Free for 7 days. Available on Play Store and App Store."
```

---

---

## After the video is generated

### Step 1: Trim aggressively

NotebookLM tends to over-explain. Open the MP4 in CapCut (free) and cut anywhere the pacing drags. Target final length: 60 to 90 seconds.

### Step 2: Replace generic slides with real screen recordings

For each feature mentioned in the voiceover, replace NotebookLM's auto-generated slide with a real screen recording of that feature in the app. Record these in advance:

- **Onboarding form** — goal, level, equipment selection
- **Gym photo upload** — full flow including the detection overlay
- **Body composition analysis** — upload through results
- **Routine generation** — tap the button, watch the weekly grid populate
- **Weekly report scroll** — heatmap, donut chart, AI coach note
- **Workout completion** — tapping exercises off during a session

Capture at 2x resolution using CleanShot X (macOS) or the built-in screen recorder. Hide your real account name and data — use a clean demo account.

### Step 3: Add a music bed

Pull a track from CapCut's free library, the YouTube Audio Library, or Artlist if you have a subscription. Sit it under the voiceover at roughly 15 percent volume. Search terms that work: "cinematic electronic build," "uplifting tech ambient," "modern fitness instrumental."

### Step 4: Add brand bookends

- **Intro card (2 seconds):** Repsy logo on a clean navy background. Fade in.
- **Outro card (3 seconds):** Logo, tagline ("Your trainer, generated."), Play Store and App Store badges, URL.

Use [Jitter.video](https://jitter.video) for animated logo reveals. Free tier is enough.

### Step 5: Burn in captions

85 percent of social video is watched muted. In CapCut, click **Captions → Auto-generate** and clean up the resulting text. Style: large, white, bottom-third, with a subtle shadow.

### Step 6: Export

- **For Reels, Shorts, Play Store preview:** 1080×1920, 30fps, MP4
- **For landing page hero:** 1920×1080, 30fps, MP4
- **For paid ads:** export both 9:16 and 1:1 (square)

### Step 7: Distribute

- Upload to Instagram Reels, YouTube Shorts, and your Play Store listing as a promo video
- Embed the horizontal cut on your landing page above the fold
- Use the 30-second cut-down for paid Meta and Google Ads campaigns

---

## Quality checklist before publishing

- [ ] Voiceover is clear and audible over the music
- [ ] Every feature claim has a screen recording showing that feature
- [ ] No NotebookLM watermark visible
- [ ] Captions are accurate and well-timed
- [ ] Logo intro and outro are present
- [ ] App Store and Play Store URLs are visible in the final frame
- [ ] Total length is between 60 and 90 seconds
- [ ] Tested on mobile — the most important text is legible at phone-screen size
