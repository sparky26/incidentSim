# Incident Response & Reliability Twin - User Guide

Welcome to the Reliability Twin! This tool allows you to simulate incident scenarios to understand how your system and team respond to failures.

## 1. Getting Started
The canvas is your workspace. You can drag and drop blocks from the **Sidebar** on the left to build your scenario.

### Block Categories
- **System**: Represents your infrastructure (Services, Databases, Vendors).
- **Detection**: Monitoring tools that catch failures (Signals, Alerts).
- **Human**: The people who respond (OnCall, Responders, Commanders).
- **Mitigation**: Actions taken to fix the issue (Rollbacks, Scala-ups).

## 2. Building a Scenario
A typical incident flow looks like this:
1.  **Service Fails** -> Emits a **Signal** (e.g., Error Rate).
2.  **Signal** triggers an **Alert Rule**.
3.  **Alert Rule** pages an **OnCall** schedule.
4.  **OnCall** wakes up a **Responder**.
5.  **Responder** performs an **Action** (e.g., Rollback).
6.  **Action** fixes the **Service**.

**How to Connect:**
- Drag a line from the *bottom* handle of one block to the *top* handle of another.
- Connect logical flows (Service -> Signal -> Alert -> Human -> Action -> Service).

## 3. Configuring Blocks
Click on any block to open the **Inspector** panel on the right.
- **Service**: Set `Base Failure Rate` (probability per minute).
- **Alert**: Set `Threshold` and `Duration`.
- **Responder**: Set `Skill Tags` and `Fatigue Sensitivity`.

*Tip: Hover over any property name in the Inspector to see a detailed explanation.*

## 4. Running the Simulation
1.  Click **Run Simulation** in the top header.
2.  The engine will run 100+ Monte Carlo iterations.
3.  **Results Panel** will appear showing:
    - **MTTR (Mean Time To Recovery)**: Average time to fix the issue.
    - **Success Rate**: Percentage of runs where the incident was resolved.
    - **Duration Distribution**: A histogram of how long incidents lasted.

## 5. Templates
Use the dropdown in the header to load pre-built scenarios:
- **Bad Deploy at Night**: Simulates a tired junior dev fixing a bad deploy.
- **Vendor Outage**: Simulates a dependency failure outside your control.

## 6. Interpreting Results
- **High MTTR?** Try adding more responders or automation.
- **Low Success Rate?** Your responders might lack the required skills for the mitigation action.
- **High Variance (P90 vs Avg)?** Sign of an unstable process; sometimes it's fast, sometimes it's disastrous.
