# Repsy — Feature Deep-Dive

This document describes every user-facing feature as a benefit, not a technical spec. Use the language here in marketing materials.

---

## Feature 1: AI Routine Generation

**What the user does:** Opens the app, picks their goal (lose fat, build muscle, get stronger, general fitness), picks their experience level, picks their equipment situation (home, full gym, hotel gym), and optionally uploads a photo of their actual gym.

**What happens in ten seconds:** A complete seven-day workout routine appears. Real exercises. Real sets and reps. A logical split — push/pull/legs for advanced lifters, upper/lower for intermediates, full body for beginners. Rest days where they actually make sense.

**Why it's different:** This is not "pick a template and rename it your plan." This is a custom routine generated for one person, one goal, one body, one gym. The AI considers experience level, available equipment, body composition, and the user's recent training history.

**The wow moment:** Watching the weekly grid fill in, day by day, with real exercises and real numbers. In under ten seconds.

---

## Feature 2: Gym Equipment Detection

**What the user does:** Takes a photo of their gym, or uploads one from their gallery.

**What happens:** The AI identifies every piece of equipment visible — squat rack, cable machine, hex bar, kettlebells, dumbbells, leg press, anything — and ensures every exercise recommended uses only equipment that actually exists in that gym.

**Why this matters:** The number-one reason gym plans fail is the user opening day three and thinking "I don't have that machine." Influencer PDFs assume you have everything. Generic apps recommend exercises with no awareness of context. Repsy literally sees your gym and works around it.

**The wow moment:** Watching the AI label your gym photo with detected equipment, then knowing your plan was built around exactly what's there.

---

## Feature 3: Body Composition Analysis

**What the user does:** Uploads a front photo and a side photo of their body. Privately. Only they see it.

**What happens:** The AI analyzes body proportions, identifies muscle groups that look underdeveloped relative to others, flags posture or balance issues, and feeds all of this into the routine generator so volume is distributed intelligently.

**Why this matters:** Most apps treat every user as a blank slate. Your plan should know that your legs are smaller than your upper body, or that your shoulders need more direct work. Repsy actually reads your body and adjusts.

**Privacy:** Photos are encrypted at rest using AES-256-GCM field-level encryption and are never shared, sold, or used to train models.

---

## Feature 4: Workout Tracking

**What the user does:** During their workout, taps to mark each exercise complete.

**What happens:** The app tracks exercise-level completion, day-level completion, current streak, longest streak, and XP. All of this data feeds into the weekly report engine and the AI coach note.

**Why this matters:** Tracking isn't an afterthought. Every checkmark is the data that powers the weekly report and the AI coach note. Nothing the user logs is wasted.

---

## Feature 5: Weekly Muscle Activation Heatmap (Premium)

**What the user does:** Every Sunday, opens their weekly progress report.

**What happens:** A full-body SVG heatmap shows which muscles got worked, how hard, in which proportion. A push/pull/legs/core donut chart visualizes balance. A top-trained-muscles list ranks the week's emphasis. A day-by-day breakdown shows exactly what happened.

**Why this matters:** This answers the question every gym-goer secretly worries about: "Did I actually train my whole body this week, or did I just hit chest and arms again?" Visual, immediate, honest.

**The wow moment:** Seeing your body light up in red and orange where you trained — and the cool blue gaps where you didn't.

---

## Feature 6: AI Coach Note (Premium)

**What the user does:** Scrolls down their weekly report.

**What happens:** A short paragraph appears — written by the AI based on this week's data. It acknowledges what they did, calls out any imbalance ("you skipped pull work this week"), and suggests one specific action for next week.

**Why this matters:** It feels like having a coach who actually paid attention. Not a generic notification. Not a streak congratulation. A specific, personal reflection that changes every week based on what actually happened.

---

## Feature 7: Trend and Streak Tracking

**What the user does:** Looks at the trend sparkline and streak ring on the weekly report.

**What happens:** Eight-week completion trendline. Current streak counter. Longest-ever streak. Visual proof of momentum, or visual evidence of where it broke and needs to restart.

**Why this matters:** Long-term motivation comes from seeing the line go up.

---

## Feature 8: AI Diet Plans

**What the user does:** Opens the diet tab and generates a meal plan.

**What happens:** A personalized weekly meal plan appears. Macros calculated for the user's goal. Indian meals included — dal, roti, sabzi, idli, dosa, rajma, all of it. Caloric targets that adjust as the user's body changes.

**Why this matters:** Most diet apps were built for the American user. They suggest oatmeal and chicken breast. Repsy speaks Indian food.

---

## Feature 9: Personal Coach Booking

**What the user does:** Wants human accountability, opens the coach tab, browses verified personal coaches, books a session.

**What happens:** Coaches in the platform are vetted. The user can browse profiles, see specialties, book sessions, and pay through the app.

**Why this matters:** AI handles the majority of users. For the ones who want a human, Repsy doesn't push them out of the app to find one — coaches are built in.
