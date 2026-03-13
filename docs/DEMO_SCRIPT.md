# NeuroVault - Demo Video Script

**Target length:** 3 minutes or less
**Format:** Screen recording with voiceover

---

## [0:00 - 0:15] HOOK

**Screen:** Landing page (animated EEG waveform background)

**Voiceover:**
> "Brain data is the most sensitive data on earth. Today, sharing it means exposing it. NeuroVault changes that."

**Action:** Slow scroll down the landing page, showing the hero section and tagline.

---

## [0:15 - 0:30] PROBLEM

**Screen:** Slide (`slide-2-problem.html`) or text overlay

**Voiceover:**
> "BCI research needs shared neural datasets, but brain data reveals mental states, conditions, even identity. Researchers can't collaborate without privacy."

**Action:** Show the problem slide for 10-15 seconds. Keep it simple.

---

## [0:30 - 1:00] UPLOAD DEMO

**Screen:** Live app - Upload page (`/upload`)

**Voiceover:**
> "Watch: a contributor uploads real EEG recordings from a motor imagery experiment."

**Action - step by step:**
1. Click "Upload" in navbar
2. Select an EDF file - show the file picker
3. EEG waveform preview appears with channel list and metadata
4. Set access conditions using the Access Condition Builder (pick "Wallet Address" or "NFT Gate")
5. Click Encrypt - show the Lit Protocol encryption step
6. Upload to Filecoin - show the Storacha upload progress
7. CID generated - highlight the content-addressed hash
8. Register on Flow - show the on-chain registration confirmation

**Call out (text overlay or voiceover):**
> "Encrypted with Lit Protocol. Stored on Filecoin. Licensed on Flow."

**Tips:**
- Have an EDF file ready before recording
- Use a simple access condition (single wallet address) to keep it quick
- Pause briefly on each step so viewers can read the UI

---

## [1:00 - 1:30] EXPLORE & ACCESS DEMO

**Screen:** Live app - Explore page (`/explore`)

**Voiceover:**
> "Now a researcher searches for motor imagery data."

**Action - step by step:**
1. Navigate to Explore page
2. Type a natural language query: "motor imagery EEG with at least 16 channels"
3. NEAR AI matching runs - show the loading state
4. Results appear ranked by relevance score
5. Click on a dataset - show the detail view with EEG preview
6. Click "Purchase Access" - show the FLOW payment flow
7. Lit Protocol verifies conditions - show decryption
8. EEG waveforms display in the viewer
9. (Optional) Show ML classification results

**Call out (text overlay or voiceover):**
> "NEAR AI matches the request. Flow handles payment. Lit Protocol verifies access. All decentralized."

**Tips:**
- Have a dataset already uploaded so search returns results
- If using demo mode, the flow will work without real blockchain keys

---

## [1:30 - 2:00] DASHBOARD & IMPACT

**Screen:** Live app - Dashboard (`/dashboard`) then Profile (`/profile`)

**Voiceover:**
> "The contributor earns automatically. Every contribution is tracked."

**Action:**
1. Show the Dashboard - stats row (datasets, earnings, licenses, impact score)
2. Scroll to the earnings chart - show the trend line
3. Show the datasets table
4. Navigate to Profile page
5. Show the "As Contributor" tab with earnings breakdown
6. Show the "As Researcher" tab with active licenses

**Call out (text overlay or voiceover):**
> "Fair compensation for data contributors, on-chain and transparent."

---

## [2:00 - 2:30] ARCHITECTURE

**Screen:** Architecture diagram (`slide-3-architecture.html` or `/architecture.svg`)

**Voiceover:**
> "NeuroVault integrates 5 Protocol Labs ecosystem technologies."

**Action:** Show the architecture diagram. Highlight each component as you mention it:

1. **Storacha / Filecoin** - "Decentralized, content-addressed storage for encrypted EEG data"
2. **Lit Protocol** - "Threshold encryption with programmable access conditions"
3. **Flow** - "On-chain registry, 30-day licenses, automatic contributor payments"
4. **NEAR** - "AI-powered dataset matching with on-chain scoring transparency"
5. **World ID** - "Proof-of-personhood to prevent Sybil attacks"

**Call out (text overlay or voiceover):**
> "Each solves a real architectural need - not surface-level integration."

---

## [2:30 - 2:50] VISION

**Screen:** Landing page or closing slide (`slide-4-close.html`)

**Voiceover:**
> "As BCIs go mainstream, neural data sovereignty becomes critical. NeuroVault is the infrastructure layer for that future."

**Action:** Show the landing page scrolled to the vision section, or the closing slide.

---

## [2:50 - 3:00] CLOSE

**Screen:** Closing slide (`slide-4-close.html`) with logo and links

**Voiceover:**
> "NeuroVault - Neurotech Track, Fresh Code. Built for PL Genesis: Frontiers of Collaboration."

**Action:** Show for 10 seconds:
- GitHub: `github.com/imanishbarnwal/NeuroVault`
- Team: Manish Barnwal (@imanishbarnwal)

---

## Pre-Recording Checklist

- [ ] Have a sample EDF file ready for the upload demo
- [ ] App running locally at `localhost:3000` (or deployed URL)
- [ ] Browser window sized to 1920x1080 or 1280x720
- [ ] Close unnecessary tabs and notifications
- [ ] Test the full flow once before recording
- [ ] Prepare slides in `public/slides/` directory
- [ ] Architecture SVG available at `public/architecture.svg`

## Recording Tips

- Record at 1080p minimum
- Use a clean browser (no extensions visible)
- Keep mouse movements smooth and deliberate
- Pause 1-2 seconds on each major UI state change
- Record voiceover separately for cleaner audio (optional)
- Use zoom/crop in editing to highlight important UI elements
