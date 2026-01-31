# WFRP4e – Zero Wounds

![Foundry VTT Compatibility](https://img.shields.io/badge/Foundry_VTT-13-orange)
![System: WFRP4e](https://img.shields.io/badge/System-WFRP4e-blue)
![License: MIT](https://img.shields.io/badge/License-MIT-green)
![Status: Stable](https://img.shields.io/badge/Status-Stable-brightgreen)
![Languages](https://img.shields.io/badge/Localization-EN%20%7C%20IT%20%7C%20FR%20%7C%20ES%20%7C%20DE%20%7C%20PT--BR-purple)
![Latest Release](https://img.shields.io/github/v/release/Deathkael83/wfrp4e-zero-wounds-prone)
![Downloads](https://img.shields.io/github/downloads/Deathkael83/wfrp4e-zero-wounds-prone/total)
![GitHub Stars](https://img.shields.io/github/stars/Deathkael83/wfrp4e-zero-wounds-prone?style=social)

This module automates and enhances how WFRP4e handles characters and creatures reaching **0 Wounds**, falling **Prone**, becoming **Unconscious**, waking up again after recovering Wounds, and (from v1.3.0) handling **Death**.

It is designed to be configurable, non-intrusive, system-friendly, and fully compatible with both PC and NPC workflows.

---

## ✦ Features

### **Automatic or Chat-Prompt Handling**
When a character reaches **0 Wounds**, the module can:

• Show a **chat message** with a button to apply *Prone*  
• Apply *Prone* **automatically**, optionally sending a notification  
• Stay inactive (disabled)

The same logic applies to:

• Becoming **Unconscious** after a number of Rounds equal to Toughness Bonus  
• **Waking up** when Wounds rise above 0  

Each effect (**Prone**, **Unconscious**, **Wake Up**) can be configured **independently** for PCs and NPCs.

Automatic modes always use **factual wording** (falls, loses, **Dies**).  
Chat prompts always use **conditional wording** (may fall, may lose).

---

### **Death Handling (v1.3.0)**
When a character is **Unconscious** at **0 Wounds** and has **Critical Wounds greater than their Toughness Bonus**, the module can handle death separately for PCs and NPCs:

• **Disabled**: the module never applies Death  
• **Chat Prompt**: the GM receives a decision prompt  
  *(Apply Death / Avoid Death; PCs also: “Death May Wait”)*  
• **Automatic**: Death is applied automatically

Optional **warning messages** can be enabled when a character becomes Unconscious while already exceeding the Critical Wounds threshold.

Death-related prompts are **always GM-only**.

---

## ✦ Separate Settings for PCs and NPCs

Player Characters and NPCs/Creatures have **independent settings**, including:

• Enable / Disable toggles  
• Independent modes for Prone / Unconscious / Wake Up  
• Independent Death handling modes  
• Independent notification options  

NPCs support the same effects with their own independent configuration.

---

## ✦ Recipient Control

Chat message recipients can be configured as:

• **GM only**  
• **Owners + GM**  
• **Everyone**

Recipient options are configurable per feature where applicable.

GM-only messages are always created by the **GM client**, ensuring players never see GM-only prompts.

---

## ✦ Clean, Localized Condition Tags

The module inserts non-interactive, localized condition tags  
(e.g. *Prone*, *Prono*, *À Terre*) without triggering the WFRP4e system’s default  
“Apply Condition” chat buttons.

---

## ✦ Combat-Safe Token Handling

Correctly handles non-linked tokens and duplicated NPC names such as:

• *Citizen 1*  
• *Citizen 2*  

Token resolution is based on **document identity**, preventing cross-target issues during combat.

---

## ✦ Settings Overview

The module provides three clear configuration sections:

1. **Player Characters (PCs)**  
2. **NPCs / Creatures**  
3. **Recipients**

Each feature has its own behaviour mode, notification settings, and recipient options where applicable.

---

## ✦ Compatibility

• **Foundry VTT v13**  
• **WFRP4e system v7+** (verified up to v9.x)  
• No prototype overrides  
• No core patches  
• Designed to coexist with other automation modules

---

## ✦ Installation

### **Foundry VTT**
Install using the manifest URL from the latest GitHub release.

### **The Forge**
Upload the module or link your GitHub repository. The manifest is detected automatically.

---

## ✦ Known Limitations

• Condition tags intentionally omit the default “Apply Condition” button  
• Requires the WFRP4e system to load before module initialization  
• Round-based checks require Combat to be active (Combat Tracker running)

---

## ✦ License

Released under the **MIT License**.  
See `LICENSE` for details.

---

## ✦ Credits

Created for tables seeking clear, controlled automation of 0-Wound behaviour in **WFRP4e**.

Feedback, suggestions, and pull requests are welcome.
