# WFRP4e – Zero Wounds

![Foundry VTT Compatibility](https://img.shields.io/badge/Foundry_VTT-13-orange)
![System: WFRP4e](https://img.shields.io/badge/System-WFRP4e-blue)
![License: MIT](https://img.shields.io/badge/License-MIT-green)
![Status: Stable](https://img.shields.io/badge/Status-Stable-brightgreen)
![Languages](https://img.shields.io/badge/Localization-EN%20%7C%20IT%20%7C%20FR%20%7C%20ES%20%7C%20DE%20%7C%20PT--BR-purple)
![Latest Release](https://img.shields.io/github/v/release/Deathkael83/wfrp4e-zero-wounds-prone)
![Downloads](https://img.shields.io/github/downloads/Deathkael83/wfrp4e-zero-wounds-prone/total)
![GitHub Stars](https://img.shields.io/github/stars/Deathkael83/wfrp4e-zero-wounds-prone?style=social)

This module automates and enhances how WFRP4e handles characters and creatures reaching **0 Wounds**, falling **Prone**, becoming **Unconscious**, and waking up again after recovering Wounds.

It is designed to be configurable, non-intrusive, system-friendly, and fully compatible with both PC and NPC workflows.

---

## ✦ Features

### **Automatic or Chat-Prompt Handling**
When a character reaches **0 Wounds**, the module can:

• Show a **chat message** with a button to apply *Prone*  
• Apply *Prone* **automatically**, optionally sending a notification  
• Stay inactive (disabled)

The same logic applies to:

• Becoming **Unconscious** after TB Rounds at 0 Wounds  
• **Waking up** when Wounds rise above 0  

Each effect (Prone, Unconscious, Wake Up) can be configured **independently** for PCs and NPCs.

---

## ✦ Separate Settings for PCs and NPCs

Players and NPCs/Creatures each have:

• Independent enable/disable toggles  
• Independent modes for Prone / Unconscious / Wake Up  
• Independent “auto-apply notification” toggles  
• Independent recipient settings  

NPCs use simplified controls while still supporting all effects.

---

## ✦ Recipient Control

Choose who receives chat messages:

• **GM only**  
• **Owners + GM**  
• **Everyone**  

PCs have separate recipient control for:

• Prone / Unconscious  
• Wake Up  

NPCs use a single recipient option.

---

## ✦ Clean, Localized Condition Tags

The module inserts non-interactive, localized condition tags (e.g. *Prone*, *Prono*, *À Terre*) without triggering the WFRP4e system’s default “Apply Condition” chat button.

---

## ✦ Combat-Safe Token Handling

Handles non-linked and duplicated NPC names such as:

• *Citizen 1*  
• *Citizen 2*  

Token resolution is based on **document identity**, preventing cross-target bugs even during combat.

---

## ✦ Settings Overview

The module creates three clean configuration blocks:

1. **Player Characters (PCs)**  
2. **NPCs / Creatures**  
3. **Recipients**  

Each mode (Prone / Unconscious / Wake) has separate behaviour, separate auto notifications, and separate recipients where applicable.

---

## ✦ Compatibility

• **WFRP4e system v7.1.1+**  
• Fully compatible with Foundry VTT **v13**  
• No prototype overrides  
• No core patches  
• Designed to coexist with other automation modules  

---

## ✦ Installation

### **Foundry VTT**
Use the manifest URL from the latest release.

### **The Forge**
Upload the module or link your GitHub repository. The manifest is detected automatically.

---

## ✦ Known Limitations

• Condition tags do not include the default “Apply Condition” button by design  
• Requires the WFRP4e system to load before the module initializes  

---

## ✦ License

Released under the **MIT License**.  
See `LICENSE` for details.

---

## ✦ Credits

Created for tables wanting cleaner automation of 0-Wound behaviour in WFRP4e.

Feedback, suggestions and pull requests are welcome.

