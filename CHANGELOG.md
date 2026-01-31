# Changelog

## 1.3.0 – Death Handling, GM-Only Logic & Message Coherence
### Changed
- Refined Prone / Unconscious / Wake-Up messaging to clearly distinguish:
  - Automatic mode = factual wording (falls, loses, <b>Dies</b>)
  - Chat Prompt mode = conditional wording (may fall, may lose)
- Death handling is now tied to Critical Wounds compared to Toughness Bonus, with GM-controlled outcomes when enabled.

### Added
- Configurable Death mode for PCs and NPCs: Disabled / Chat Prompt / Automatic.
- Optional warning message when a character becomes Unconscious while already exceeding the Critical Wounds threshold (Crit > TB).
- Optional public announcement (PC only) when the GM applies Death or uses “Death Can Wait”.

### Fixed
- Fixed GM-only chat events being authored by players (and therefore visible to them).
- Fixed death/warning spam after Death was already applied.
- Improved stability of combat/round-based checks and token resolution in edge cases.
- Restored and preserved settings UI headers and overall settings clarity.

## 1.2.0 – Full Overhaul, Multi-Language & UI Improvements
- Renamed module to **WFRP4e – Zero Wounds** for clarity and consistency.
- Added full multi-language support:
  - **English, Italian, French, Spanish, German, Portuguese (Brazil)**
- Complete rewrite of the settings interface:
  - Added section headers (PC, NPC, Recipients) with clean UI separation.
  - Rebuilt headers using injected `.form-group.group-header` blocks for maximum compatibility.
- Full separation of PC and NPC logic for:
  - Prone handling
  - Unconscious handling (TB rounds at 0 Wounds)
  - Wake-Up handling (when Wounds > 0)
- Independent mode selection for each condition type:
  - **Disabled / Chat Prompt / Automatic**
  - Standalone settings for PCs and NPCs.
- Added auto-notification toggles for every automated condition.
- Added recipient controls:
  - PCs: separate recipients for Prone/Unconscious and Wake-Up
  - NPCs: unified recipients
- Token resolution improvements:
  - Correct handling of non-linked tokens
  - Stable behaviour with duplicated names (e.g. Citizen 1, Citizen 2)
  - Correct identification both inside and outside combat
- Condition tagging improvements:
  - Localized condition names per user language
  - Removed unwanted “Apply Condition” buttons in chat
  - Added safe enriched tags compatible with WFRP4e
- Improved chat message flow and formatting:
  - Ensured spacing before condition tags
  - Cleaned wake-up, unconscious and prone messages
- Major internal refactor:
  - Split scripts into `main.js` and `settings.js`
  - Cleaned outdated logic and obsolete checks
  - Improved flag usage and state tracking
- General stability, performance and safety improvements.

## 1.1.7 – Stability & Chat Improvements
- Improved handling of actors reaching 0 Wounds in edge cases.
- Fixed cases where chat messages referenced the wrong token.
- Corrected behaviour where some NPCs did not apply Prone.
- Refined chat button actions for more reliable condition handling.
- Minor cleanup in preparation for the 1.2.0 rewrite.

## 1.1.6 – Condition Application Adjustments
- Improved Prone/Unconscious application workflow.
- Fixed issues where NPCs did not correctly apply Prone.

## 1.1.5 – Token Resolution Improvements
- Enhanced support for non-linked tokens.
- Fixed naming issues in chat messages.

## 1.1.0 – Added Unconscious Timer
- Added automatic Unconscious application after Toughness Bonus rounds at 0 Wounds.
- Added chat notification for Unconscious events.

## 1.0.0 – Initial Release
- Basic Prone detection at 0 Wounds.
- Chat button to apply Prone.
- Initial PC/NPC compatibility.
