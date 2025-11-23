# Changelog

## 1.2.0 – Full Settings Overhaul & Stability Improvements
- Added complete separation of PC and NPC logic for:
  - Prone handling
  - Unconscious handling
  - Wake-up handling
- Added independent mode selection (Disabled / Chat Prompt / Automatic) for:
  - PCs: Prone, Unconscious, Wake-up
  - NPCs: Prone, Unconscious, Wake-up
- Added separate auto-notification toggles for each condition type.
- Added dedicated recipient controls:
  - PCs: Prone/Unconscious recipients
  - PCs: Wake-up recipients
  - NPCs: unified recipients
- Reworked token resolution system:
  - Correct handling of non-linked tokens
  - Correct handling of duplicated names (e.g. Citizen 1, Citizen 2)
  - Correct behavior in and out of combat
- Fixed condition tagging:
  - Now uses localized condition names
  - Removed unwanted “Apply Condition” buttons
  - Added enriched condition tags compatible with WFRP4e
- Added Wake-up automation and associated chat prompts.
- Added full EN/IT localization for every setting and message.
- Cleaned internal code structure and split main/settings into separate modules.
- Improved chat flags to ensure correct reference to token or actor.
- Added manifest headers and optional section dividers for settings UI.
- General performance and reliability improvements.

## 1.1.8 – Internal Development Build (Unreleased)
- Various internal adjustments during restructuring.
- Not published as a stable release.

## 1.1.7 – Stability Fixes
- Improved actor handling when reaching 0 Wounds.
- Minor corrections to chat output.
- Fixed an issue with chat buttons not applying the correct condition.
- Initial cleanup to prepare for future expansions.

## 1.1.6 – Condition Application Adjustments
- Improved Prone/Unconscious application flow.
- Fixed issues where NPCs did not correctly apply Prone.

## 1.1.5 – Token Resolution Improvements
- Enhanced support for non-linked tokens.
- Fixed naming issues in chat messages.

## 1.1.0 – Added Unconscious Timer
- Added automatic “fall Unconscious after TB rounds at 0 Wounds”.
- Added chat notification for Unconscious events.

## 1.0.0 – Initial Release
- Basic Prone detection at 0 Wounds.
- Chat button to apply Prone.
- Initial NPC/PC compatibility.

