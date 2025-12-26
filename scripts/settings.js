const MODULE_ID = "wfrp4e-zero-wounds-prone";
const PREFIX = MODULE_ID;

Hooks.once("init", function () {

  /* --------------------------------------------- */
  /* GENERAL SETTINGS                              */
  /* --------------------------------------------- */

  game.settings.register(MODULE_ID, "enableModule", {
    name: `${PREFIX}.settings.enableModule.name`,
    hint: `${PREFIX}.settings.enableModule.hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  /* --------------------------------------------- */
  /* PCs SETTINGS                                  */
  /* --------------------------------------------- */

  game.settings.register(MODULE_ID, "enablePC", {
    name: `${PREFIX}.settings.enablePC.name`,
    hint: `${PREFIX}.settings.enablePC.hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "pcProneMode", {
    name: `${PREFIX}.settings.pcProneMode.name`,
    hint: `${PREFIX}.settings.pcProneMode.hint`,
    scope: "world",
    config: true,
    type: String,
    default: "chat",
    choices: {
      disabled: `${PREFIX}.settings.mode.disabled`,
      chat: `${PREFIX}.settings.mode.chat`,
      auto: `${PREFIX}.settings.mode.auto`
    }
  });

  game.settings.register(MODULE_ID, "pcProneAutoNotify", {
    name: `${PREFIX}.settings.pcProneAutoNotify.name`,
    hint: `${PREFIX}.settings.pcProneAutoNotify.hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "pcUnconsciousMode", {
    name: `${PREFIX}.settings.pcUnconsciousMode.name`,
    hint: `${PREFIX}.settings.pcUnconsciousMode.hint`,
    scope: "world",
    config: true,
    type: String,
    default: "chat",
    choices: {
      disabled: `${PREFIX}.settings.mode.disabled`,
      chat: `${PREFIX}.settings.mode.chat`,
      auto: `${PREFIX}.settings.mode.auto`
    }
  });

  game.settings.register(MODULE_ID, "pcUnconsciousAutoNotify", {
    name: `${PREFIX}.settings.pcUnconsciousAutoNotify.name`,
    hint: `${PREFIX}.settings.pcUnconsciousAutoNotify.hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "pcWakeMode", {
    name: `${PREFIX}.settings.pcWakeMode.name`,
    hint: `${PREFIX}.settings.pcWakeMode.hint`,
    scope: "world",
    config: true,
    type: String,
    default: "chat",
    choices: {
      disabled: `${PREFIX}.settings.mode.disabled`,
      chat: `${PREFIX}.settings.mode.chat`,
      auto: `${PREFIX}.settings.mode.auto`
    }
  });

  game.settings.register(MODULE_ID, "pcWakeAutoNotify", {
    name: `${PREFIX}.settings.pcWakeAutoNotify.name`,
    hint: `${PREFIX}.settings.pcWakeAutoNotify.hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  /* ------------------------------------------ */
  /* PCs: DEATH (GM ONLY)                       */
  /* ------------------------------------------ */

  game.settings.register(MODULE_ID, "pcDeathMode", {
    name: `${PREFIX}.settings.pcDeathMode.name`,
    hint: `${PREFIX}.settings.pcDeathMode.hint`,
    scope: "world",
    config: true,
    type: String,
    default: "auto",
    choices: {
      disabled: `${PREFIX}.settings.mode.disabled`,
      chat: `${PREFIX}.settings.mode.chat`,
      auto: `${PREFIX}.settings.mode.auto`
    }
  });

  game.settings.register(MODULE_ID, "pcDeathAutoNotify", {
    name: `${PREFIX}.settings.pcDeathAutoNotify.name`,
    hint: `${PREFIX}.settings.pcDeathAutoNotify.hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "pcDeathAllowFate", {
    name: `${PREFIX}.settings.pcDeathAllowFate.name`,
    hint: `${PREFIX}.settings.pcDeathAllowFate.hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  /* --------------------------------------------- */
  /* NPC SETTINGS                                  */
  /* --------------------------------------------- */

  game.settings.register(MODULE_ID, "enableNPC", {
    name: `${PREFIX}.settings.enableNPC.name`,
    hint: `${PREFIX}.settings.enableNPC.hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "npcProneMode", {
    name: `${PREFIX}.settings.npcProneMode.name`,
    hint: `${PREFIX}.settings.npcProneMode.hint`,
    scope: "world",
    config: true,
    type: String,
    default: "chat",
    choices: {
      disabled: `${PREFIX}.settings.mode.disabled`,
      chat: `${PREFIX}.settings.mode.chat`,
      auto: `${PREFIX}.settings.mode.auto`
    }
  });

  game.settings.register(MODULE_ID, "npcProneAutoNotify", {
    name: `${PREFIX}.settings.npcProneAutoNotify.name`,
    hint: `${PREFIX}.settings.npcProneAutoNotify.hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "npcUnconsciousMode", {
    name: `${PREFIX}.settings.npcUnconsciousMode.name`,
    hint: `${PREFIX}.settings.npcUnconsciousMode.hint`,
    scope: "world",
    config: true,
    type: String,
    default: "chat",
    choices: {
      disabled: `${PREFIX}.settings.mode.disabled`,
      chat: `${PREFIX}.settings.mode.chat`,
      auto: `${PREFIX}.settings.mode.auto`
    }
  });

  game.settings.register(MODULE_ID, "npcUnconsciousAutoNotify", {
    name: `${PREFIX}.settings.npcUnconsciousAutoNotify.name`,
    hint: `${PREFIX}.settings.npcUnconsciousAutoNotify.hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "npcWakeMode", {
    name: `${PREFIX}.settings.npcWakeMode.name`,
    hint: `${PREFIX}.settings.npcWakeMode.hint`,
    scope: "world",
    config: true,
    type: String,
    default: "chat",
    choices: {
      disabled: `${PREFIX}.settings.mode.disabled`,
      chat: `${PREFIX}.settings.mode.chat`,
      auto: `${PREFIX}.settings.mode.auto`
    }
  });

  game.settings.register(MODULE_ID, "npcWakeAutoNotify", {
    name: `${PREFIX}.settings.npcWakeAutoNotify.name`,
    hint: `${PREFIX}.settings.npcWakeAutoNotify.hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  /* ------------------------------------------ */
  /* NPCs: DEATH (GM ONLY)                      */
  /* ------------------------------------------ */

  game.settings.register(MODULE_ID, "npcDeathMode", {
    name: `${PREFIX}.settings.npcDeathMode.name`,
    hint: `${PREFIX}.settings.npcDeathMode.hint`,
    scope: "world",
    config: true,
    type: String,
    default: "auto",
    choices: {
      disabled: `${PREFIX}.settings.mode.disabled`,
      chat: `${PREFIX}.settings.mode.chat`,
      auto: `${PREFIX}.settings.mode.auto`
    }
  });

  game.settings.register(MODULE_ID, "npcDeathAutoNotify", {
    name: `${PREFIX}.settings.npcDeathAutoNotify.name`,
    hint: `${PREFIX}.settings.npcDeathAutoNotify.hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  /* --------------------------------------------- */
  /* RECIPIENT SETTINGS                            */
  /* --------------------------------------------- */

  game.settings.register(MODULE_ID, "pcRecipientsMain", {
    name: `${PREFIX}.settings.pcRecipientsMain.name`,
    hint: `${PREFIX}.settings.pcRecipientsMain.hint`,
    scope: "world",
    config: true,
    type: String,
    default: "ownersGM",
    choices: {
      gm: `${PREFIX}.settings.recipients.gm`,
      ownersGM: `${PREFIX}.settings.recipients.ownersGM`,
      everyone: `${PREFIX}.settings.recipients.everyone`
    }
  });

  game.settings.register(MODULE_ID, "pcRecipientsWake", {
    name: `${PREFIX}.settings.pcRecipientsWake.name`,
    hint: `${PREFIX}.settings.pcRecipientsWake.hint`,
    scope: "world",
    config: true,
    type: String,
    default: "ownersGM",
    choices: {
      gm: `${PREFIX}.settings.recipients.gm`,
      ownersGM: `${PREFIX}.settings.recipients.ownersGM`,
      everyone: `${PREFIX}.settings.recipients.everyone`
    }
  });

  game.settings.register(MODULE_ID, "npcRecipients", {
    name: `${PREFIX}.settings.npcRecipients.name`,
    hint: `${PREFIX}.settings.npcRecipients.hint`,
    scope: "world",
    config: true,
    type: String,
    default: "gm",
    choices: {
      gm: `${PREFIX}.settings.recipients.gm`,
      ownersGM: `${PREFIX}.settings.recipients.ownersGM`,
      everyone: `${PREFIX}.settings.recipients.everyone`
    }
  });
});
