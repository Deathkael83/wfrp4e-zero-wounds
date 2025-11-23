# WFRP4e – Zero Wounds: Prone & Unconscious

![Foundry VTT Compatibility](https://img.shields.io/badge/Foundry_VTT-12%20%7C%2013-orange)
![System: WFRP4e](https://img.shields.io/badge/System-WFRP4e-blue)
![License: MIT](https://img.shields.io/badge/License-MIT-green)
![Status: Stable](https://img.shields.io/badge/Status-Stable-brightgreen)
![Languages: EN/IT](https://img.shields.io/badge/Localization-EN%20%7C%20IT-purple)
![Latest Release](https://img.shields.io/github/v/release/Deathkael83/wfrp4e-zero-wounds-prone)
![Downloads](https://img.shields.io/github/downloads/Deathkael83/wfrp4e-zero-wounds-prone/total)
![Foundry Verified](https://img.shields.io/badge/Verified%20For-FoundryVTT%2012%2F13-orange)
![GitHub Stars](https://img.shields.io/github/stars/Deathkael83/wfrp4e-zero-wounds-prone?style=social)

This module automates and enhances how WFRP4e handles characters and creatures reaching **0 Wounds**, falling **Prone**, becoming **Unconscious**, and waking up again when they recover Wounds.

It is designed to be fully configurable, non-intrusive, system-compatible, and respectful of both PC and NPC workflows.

---

## ✦ Features

### **1. Automatic or Chat-Prompt Handling**
When a character reaches **0 Wounds**, the module can:

- Display a **chat message** with a button to apply *Prone*  
- Apply *Prone* **automatically**, optionally sending a notification  
- Do nothing (disabled)

The same applies to:

- Falling **Unconscious** after TB Rounds at 0 Wounds  
- **Waking up** when Wounds rise above 0

Each state (Prone, Unconscious, Wake Up) can be controlled **independently**.

---

## ✦ Fully Separate Settings for PCs and NPCs

Player Characters and NPCs/Monsters each have:

- Independent **enable/disable** toggles  
- Independent **Prone / Unconscious / Wake Up** modes  
- Independent **notification on auto-apply** toggles  
- Independent **recipient settings**

---

## ✦ Recipient Control

You decide who receives chat messages:

- **GM only**
- **Owners + GM**
- **Everyone**

PCs have separate recipient settings for:
- Prone / Unconscious  
- Wake Up  

NPCs have a single recipient control.

---

## ✦ Smart Condition Tagging

The module displays condition names using WFRP4e’s built-in localization, and inserts clean, non-interactive condition tags (without the system’s default “Apply condition” button).

---

## ✦ Combat-Safe Behaviour

NPCs with non-linked or duplicated names (e.g. *Citizen 1*, *Citizen 2*) are handled safely:

- Token resolution uses strict document identity  
- Works inside and outside combat  
- No bleed-over between different tokens

---

## ✦ Settings Overview

The module adds the following configuration groups:

- **General Settings**  
- **Player Characters (PCs)**  
- **NPCs / Creatures**  
- **Recipients**  

Everything can be enabled, disabled, or set to chat/automatic mode independently.

---

## ✦ Installation

### **Foundry VTT**
Install directly by adding the manifest URL in the module installation screen.

### **The Forge**
The module is fully compatible. Upload or link your repository and The Forge will detect the manifest automatically.

---

## ✦ Compatibility

- **WFRP4e Core v7.1.1+**  
- Should work with all major WFRP4e automation and utility modules  
- No core overrides, no prototype patching

---

## ✦ Known Limitations

- Condition tags intentionally remove the built-in “Apply” button  
- Requires the WFRP4e system to be loaded before initialization

---

## ✦ License

This module is released under the **MIT License**.  
See `LICENSE` for details.

---

## ✦ Credits

Developed for use in advanced WFRP4e campaigns requiring finer control over 0-Wound states and combat automation.

Feedback, suggestions, and pull requests are welcome.

