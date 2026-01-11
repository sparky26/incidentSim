# Zero to Hero: The Reliability Twin Learner's Guide

Welcome! If you've never fixed a server crash at 3 AM or don't know what "SRE" stands for, **you are in the right place**.

This guide is designed to teach you **Incident Management** using the Reliability Twin. We will use real-life analogies to make complex concepts simple.

---

## Part 1: What are we actually doing?

Imagine you own a **high-end restaurant**. 
*   **The System**: Your kitchen. It has ovens (Services), ingredients (Dependencies), and chefs (Workers).
*   **The Incident**: The oven catches fire on a Friday night.
*   **The Goal**: Put out the fire and serve food again as fast as possible.

**Reliability Engineering** is the art of designing your kitchen so that:
1.  Fires happen less often.
2.  When fires *do* happen, the sprinklers go off automatically (Detection).
3.  The staff knows exactly what to do (Response).

The **Reliability Twin** acts like a "Flight Simulator" for your restaurant. You can create disasters (fires, food poisoning, power outages) and see if your imaginary staff can handle it, *without* burning down your real kitchen.

---

## Part 2: The Core Building Blocks (And their Real-Life Twins)

We build our world using "Blocks". Here is your full translation dictionary.

### 1. System Blocks (The Kitchen)
These occupy the "Physical" layer of your world.

*   **Service**: **The Oven**.
    *   *What it is*: The core thing that does work (e.g., your Website, API, Database).
    *   **Properties**:
        *   `Base Failure Rate`: How often does it break spontaneously? (Old ovens verify break more).
        *   `Recovery Rate`: If it breaks, how likely is it to fix itself? (Does "turning it off and on again" work?)
*   **Dependency**: **The Gas Line**.
    *   *What it is*: Something your service needs to function.
    *   **Properties**:
        *   `Type`: **Hard** (No gas = No cooking) vs **Soft** (No dishwasher = Slow cooking).
        *   `Impact`: If the gas is low, does the oven stop working completely (1.0) or just cook slowly (0.5)?
*   **Vendor**: **The Vegetable Supplier**.
    *   *What it is*: A service you pay for but don't control (e.g., AWS, Stripe).
    *   **Properties**:
        *   `Outage Probability`: How reliable is this supplier?
        *   `SLA Response Time`: The "Service Level Agreement". If they mess up, they promise to fix it within X minutes. You just have to wait.
*   **Traffic**: **The Customers**.
    *   *What it is*: The load on your system.
    *   **Properties**:
        *   `Baseline Request Rate`: Normal Friday night crowd.
        *   `Spike Probability`: Chance of a busload of tourists arriving suddenly.
        *   `Spike Multiplier`: How big is that busload? (5x normal traffic?)
*   **Deployment**: **New Menu Day**.
    *   *What it is*: Changing the code/rules of the system.
    *   **Properties**:
        *   `Risk`: Probability this new menu burns the kitchen down.
        *   `Canary`: Testing the menu on just Table 1 before giving it to everyone. Reduces the "blast radius" of a bad change.
        *   `Automated`: Do robots change the menu? Faster, but if it's wrong, it spreads instantly.
        *   `Frequency`: How often do you change the menu?

### 2. Detection (The Smoke Alarms)
If a tree falls in the forest and no one hears it, does it matter?

*   **Signal**: **The Temperature Sensor**.
    *   *What it is*: Monitors the health of a Service.
    *   **Properties**:
        *   `Metric`: What are we watching? (Latency = Speed, Errors = Burnt Food).
        *   `Detection Delay`: How long does the sensor take to notice the fire?
        *   `Signal Noise`: (Important!) How often does it cry wolf? If this is low, the sensor beeps when someone lights a birthday candle.
*   **Alert Rule**: **The Siren Logic**.
    *   *What it is*: Decides when to wake up a human.
    *   **Properties**:
        *   `Threshold`: "If temp > 500°F..."
        *   `Duration`: "...for more than 5 minutes." (Prevents waking people for a 1-second spike).
*   **Escalation**: **The Emergency Contact List**.
    *   *What it is*: If nobody responds after X minutes, call the backup person. Then the VP. Then the CEO.
    *   **Properties**:
        *   `Steps`: A list like ["Junior Engineer @ 5min", "Senior @ 15min", "VP @ 30min"]

### 3. Humans (The Staff)
The heroes who fix things.

*   **OnCall**: **The Schedule**.
    *   *What it is*: Determines WHO gets the pager.
    *   **Properties**:
        *   `Schedule ID`: "primary" vs "backup" (Who's on duty tonight?)
        *   `Handover Protocol`: When Shift A leaves and Shift B arrives, do they talk? (**Strong**) or just wave goodbye? (**Weak**). Weak handovers lead to "Context Loss" (Shift B doesn't know the oven is broken).
*   **Responder**: **The Firefighter/Chef**.
    *   *What it is*: The person doing the work.
    *   **Properties**:
        *   `Base Response Time`: How fast do they pick up the phone?
        *   `Fatigue Sensitivity`: How quickly do they get tired? Tired people work slower.
        *   `Shift Length`: Creating a scenario with 24-hour shifts? Expect disasters.
*   **Commander**: **The Head Chef**.
    *   *What it is*: Doesn't cook, but coordinates.
    *   **Properties**:
        *   `Experience Level`: A veteran calm commander makes the team 20% faster.
        *   `Coordination Bonus`: The speed boost they give to others.
*   **Comm Channel**: **The Walkie-Talkies**.
    *   *What it is*: Where the team talks (Slack, Zoom).
    *   **Properties**:
        *   `Latency`: Laggy radios delay instructions.
        *   `Context Loss Probability`: "Static". Messages getting lost or misunderstood.

### 4. Process (The Manuals)
*   **Runbook**: **The "In Case of Fire" Poster**.
    *   *What it is*: Instructions for the incident.
    *   **Properties**:
        *   `Quality`: A clear, step-by-step list (1.0) vs a coffee-stained napkin (0.1). High quality = fast diagnosis.
        *   `Is Outdated`: If the manual says "Call Bob" but Bob quit 2 years ago, that's bad.
        *   `Automated`: A button that runs the fix automatically.

### 5. Mitigation (The Fix)
*   **Action**: **The Fire Extinguisher**.
    *   *What it is*: The specific task performed to resolve the incident.
    *   **Properties**:
        *   `Required Skill`: You need "Plumbing" skills to fix the sink.
        *   `Duration Mean`: How long does it take to deploy?
        *   `Success Probability`: Does hitting it with a hammer work? (Maybe 90% of the time).
        *   `Is Rollback`: The "Undo" button. Reverts the system to yesterday's state.

---

## Part 3: How Blocks Talk to Each Other (The Flow)

This is the most important part. Let's trace a single incident from start to finish to see how properties cascade.

### The Story: "The Oven Catches Fire"

**Step 1: The System Breaks**
*   Block: **Service** (The Oven)
*   What happens: The oven spontaneously breaks because of its `Base Failure Rate` (0.001 = 0.1% chance per minute).
*   **Output**: The Service is now in a "DOWN" state. It emits a signal to anything connected to it.

**Step 2: Detection Sees It**
*   Block: **Signal** (Temperature Sensor)
*   What happens: The Signal is connected to the Service. It "listens" for failures.
    *   The `Detection Delay` property kicks in. If you set this to 5 minutes, the sensor takes 5 minutes to notice.
    *   **But wait!** The `Signal Noise` matters. If it's 0.5 (noisy), the sensor might cry wolf even when nothing is wrong (False Alarm). Or it might miss the real fire.
*   **Output**: After the delay, if it's not a false alarm, the Signal sends "SIGNAL_DETECTED" to the Alert Rule.

**Step 3: The Alert Decides**
*   Block: **Alert Rule** (The Siren)
*   What happens: The Alert Rule gets the "SIGNAL_DETECTED" message.
    *   It checks: Is the metric above `Threshold`? (e.g., Temp > 500°F?)
    *   It waits for `Duration` minutes. If the problem persists for 5 minutes, THEN it fires the alert.
*   **Output**: "ALERT_FIRED" is sent to the OnCall schedule.

**Step 4: Who Gets Paged?**
*   Block: **OnCall** (The Schedule)
*   What happens: The OnCall block looks at its `Schedule ID`. If you set this to "primary", it pages the primary responder.
    *   If you have an **Escalation** block connected, and the primary doesn't respond in X minutes, it escalates to the backup.
*   **Output**: "PAGE_SENT" is sent to the Responder.

**Step 5: The Human Wakes Up**
*   Block: **Responder** (Jane the Chef)
*   What happens: Jane gets the page.
    *   **Property effects**:
        *   Jane's `Base Response Time` is 10 minutes. That's how long it takes her to acknowledge.
        *   **But!** If a **Runbook** is connected to the Alert Rule, and its `Quality` is 0.9, Jane's response time is HALVED (because she knows exactly what to do).
        *   **But!** If Jane's `Fatigue Sensitivity` is high and she's been paged 10 times tonight (false alarms), she's tired. Her response time INCREASES.
        *   **But!** If Jane's `Shift Length` is 8 hours and she's been working for 9 hours, a **Handover** event triggers. A new, fresh responder takes over, but there's a 30-minute delay and possible "Context Loss" (if `Handover Protocol` is weak).
*   **Output**: After the response time (modified by Runbook, Fatigue, Handovers), Jane sends "PAGE_ACKNOWLEDGED".

**Step 6: The Fix**
*   Block: **Action** (Press the Reset Button)
*   What happens: Jane is connected to an Action block.
    *   The Action checks: Does Jane have the `Required Skill`? If the Action needs "Electrical" skills and Jane only has "Cooking" skills, this might fail.
    *   The Action takes `Duration Mean` minutes to complete (e.g., 15 minutes).
    *   The Action has a `Success Probability`. If it's 0.9, there's a 10% chance pressing the button doesn't work.
*   **Output**: If successful, "SERVICE_RECOVERED" is sent back to the Service. The oven is fixed!

### The Chain Reaction (Summary)
```
Service (breaks)
  ↓ [Base Failure Rate determines WHEN]
Signal (detects after delay)
  ↓ [Detection Delay + Signal Noise determine HOW FAST and IF]
Alert Rule (fires after threshold met)
  ↓ [Threshold + Duration determine WHEN to alert]
OnCall (pages person)
  ↓ [Schedule ID determines WHO]
Responder (acknowledges)
  ↓ [Response Time modified by Runbook Quality, Fatigue, Shift Length]
Action (executes fix)
  ↓ [Duration + Success Probability + Skill Match determine IF it works]
Service (recovers)
```

**Key Insight**: Every property you change ripples through the chain.
*   Lower `Detection Delay`? Faster alert.
*   Higher `Runbook Quality`? Faster response.
*   Longer `Shift Length`? More fatigue, slower response.

---

## Part 4: Building "The Perfect Storm" Scenario

Let's build a realistic scenario step-by-step. I'll show you **exactly** which blocks connect to which, in order.

**The Scenario**: "The 5 PM Friday Traffic Spike with a Bad Vendor and a Tired Responder"

---

### The Complete Connection Map (Build in This Order):

**Step 1: The System (What Can Break)**
1.  Drag **Traffic** onto the canvas (top-left).
2.  Drag **Vendor** onto the canvas (top-center).
3.  Drag **Service** onto the canvas (top-right).
4.  **Connect**: Traffic → Service (Traffic drives load to your app)
5.  **Connect**: Vendor → Service (Your app depends on the payment API)

*At this point you have: Traffic and Vendor both feeding into Service*

---

**Step 2: The Detection (How We Know It's Broken)**
6.  Drag **Signal** below Service.
7.  Drag **Alert Rule** below Signal.
8.  **Connect**: Service → Signal (Signal monitors the Service)
9.  **Connect**: Signal → Alert Rule (Alert Rule listens to the Signal)

*Now your detection pipeline is: Service → Signal → Alert Rule*

---

**Step 3: The Human Response (Who Fixes It)**
10. Drag **Runbook** to the left of Alert Rule (same row).
11. Drag **OnCall** below Alert Rule.
12. Drag **Responder** below OnCall.
13. Drag **Commander** to the left of Responder (same row).
14. **Connect**: Runbook → Alert Rule (Attach instructions to the alert)
15. **Connect**: Alert Rule → OnCall (Alert pages the schedule)
16. **Connect**: OnCall → Responder (OnCall wakes up the human)
17. **Connect**: Commander → Responder (Commander coordinates the responder)

*Your response chain is: Alert Rule → OnCall → Responder (with Runbook + Commander support)*

---

**Step 4: The Fix (What Action Resolves It)**
18. Drag **Action** below Responder.
19. **Connect**: Responder → Action (Responder executes the action)
20. **Connect**: Action → Service (Action fixes the Service - **close the loop!**)

*The fix loop is: Responder → Action → Service (recovery)*

---

### The Final Picture (All Connections)
```
         Traffic ──┐
                   ├──→ Service ──→ Signal ──→ Alert Rule ──→ OnCall ──→ Responder ──→ Action ──┐
         Vendor ───┘                               ↑                         ↑               │
                                                   │                         │               │
                                              Runbook                   Commander            │
                                                                                              │
                                                                    (loops back) ←────────────┘
```

---

### Configure the Properties (The "What Ifs")

Now click each block and set these properties to create chaos:

1.  **Traffic**: Set `Spike Probability` = **0.8** (High chance of spike)
2.  **Vendor**: Set `Outage Probability` = **0.01** (Vendor is unreliable)
3.  **Service**: Leave defaults
4.  **Signal**: Set `Signal to Noise Ratio` = **0.6** (Noisy! False alarms)
5.  **Alert Rule**: Leave defaults
6.  **Runbook**: Set `Quality` = **0.3** (Bad documentation)
7.  **OnCall**: Set `Handover Protocol` = **"weak"** (Poor handoffs)
8.  **Responder**: Set `Shift Length Hours` = **2** (Frequent handovers), `Fatigue Sensitivity` = **0.5** (Gets tired easily)
9.  **Commander**: Set `Experience Level` = **10** (You need a veteran here!)
10. **Action**: Set `Success Probability` = **0.7** (Sometimes the fix doesn't work)

---

### Run the Simulation

Click **Run Simulation**. Watch the results.

**What You Should See**:
*   **High MTTR** (probably 60+ minutes): Because of bad Runbook, noisy Signal, frequent handovers
*   **Low Success Rate** (maybe 70-80%): Because Action sometimes fails
*   **High variance (P90 vs Avg)**: Some runs get lucky, others get 3 handovers in a row

**The Experiment**:
*   Now change Runbook `Quality` to **0.9**. Re-run. MTTR should drop by ~30%.
*   Change Signal `Signal to Noise` to **0.95**. Re-run. Responder fatigue decreases (fewer false alarms).
*   Change Responder `Shift Length` to **8**. Re-run. Fewer handovers = faster recovery.

---

---

## Glossary of Terms

*   **MTTR**: "Mean Time To Recovery". The average time from "It's Broken" to "It's Fixed".
*   **SLA**: "Service Level Agreement". A promise to fix things within a certain time.
*   **Canary**: A bird miners used to carry. If the bird died, the air was bad. In software, it means testing on a small group first.
*   **Blast Radius**: How many people get hurt if this explodes?
*   **Context Loss**: Forgetting what happened because you weren't told during a shift change.

---
*Happy Simulating!*
