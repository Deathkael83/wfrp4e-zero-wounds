const MODULE_ID = "wfrp4e-zero-wounds-prone";
const PREFIX = MODULE_ID;

Hooks.once("init", function () {

  /* --------------------------------------------- */
  /* GENERAL SETTINGS                              */
  /* --------------------------------------------- */

  game.settings.register(MODULE_ID, "enableModule", {
    name: game.i18n.localize(`${PREFIX}.settings.enableModule.name`),
    hint: game.i18n.localize(`${PREFIX}.settings.enableModule.hint`),
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  /* --------------------------------------------- */
  /* PLAYER CHARACTERS (PCs)                       */
  /* --------------------------------------------- */

  game.settings.register(MODULE_ID, "enablePC", {
    name: game.i18n.localize(`${PREFIX}.settings.enablePC.name`),
    hint: game.i18n.localize(`${PREFIX}.settings.enablePC.hint`),
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "pcProneMode", {
    name: game.i18n.localize(`${PREFIX}.settings.pcProneMode.name`),
    hint: game.i18n.localize(`${PREFIX}.settings.pcProneMode.hint`),
    scope: "world",
    config: true,
    type: String,
    choices: {
      disabled: game.i18n.localize(`${PREFIX}.settings.mode.disabled`),
      chat: game.i18n.localize(`${PREFIX}.settings.mode.chat`),
      auto: game.i18n.localize(`${PREFIX}.settings.mode.auto`)
    },
    default: "chat"
  });

  game.settings.register(MODULE_ID, "pcProneAutoNotify", {
    name: game.i18n.localize(`${PREFIX}.settings.pcProneAutoNotify.name`),
    hint: game.i18n.localize(`${PREFIX}.settings.pcProneAutoNotify.hint`),
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "pcUnconsciousMode", {
    name: game.i18n.localize(`${PREFIX}.settings.pcUnconsciousMode.name`),
    hint: game.i18n.localize(`${PREFIX}.settings.pcUnconsciousMode.hint`),
    scope: "world",
    config: true,
    type: String,
    choices: {
      disabled: game.i18n.localize(`${PREFIX}.settings.mode.disabled`),
      chat: game.i18n.localize(`${PREFIX}.settings.mode.chat`),
      auto: game.i18n.localize(`${PREFIX}.settings.mode.auto`)
    },
    default: "chat"
  });

  game.settings.register(MODULE_ID, "pcUnconsciousAutoNotify", {
    name: game.i18n.localize(`${PREFIX}.settings.pcUnconsciousAutoNotify.name`),
    hint: game.i18n.localize(`${PREFIX}.settings.pcUnconsciousAutoNotify.hint`),
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "pcWakeMode", {
    name: game.i18n.localize(`${PREFIX}.settings.pcWakeMode.name`),
    hint: game.i18n.localize(`${PREFIX}.settings.pcWakeMode.hint`),
    scope: "world",
    config: true,
    type: String,
    choices: {
      disabled: game.i18n.localize(`${PREFIX}.settings.mode.disabled`),
      chat: game.i18n.localize(`${PREFIX}.settings.mode.chat`),
      auto: game.i18n.localize(`${PREFIX}.settings.mode.auto`)
    },
    default: "chat"
  });

  game.settings.register(MODULE_ID, "pcWakeAutoNotify", {
    name: game.i18n.localize(`${PREFIX}.settings.pcWakeAutoNotify.name`),
    hint: game.i18n.localize(`${PREFIX}.settings.pcWakeAutoNotify.hint`),
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  /* --------------------------------------------- */
  /* NPCs / CREATURES                              */
  /* --------------------------------------------- */

  game.settings.register(MODULE_ID, "enableNPC", {
    name: game.i18n.localize(`${PREFIX}.settings.enableNPC.name`),
    hint: game.i18n.localize(`${PREFIX}.settings.enableNPC.hint`),
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "npcProneMode", {
    name: game.i18n.localize(`${PREFIX}.settings.npcProneMode.name`),
    hint: game.i18n.localize(`${PREFIX}.settings.npcProneMode.hint`),
    scope: "world",
    config: true,
    type: String,
    choices: {
      disabled: game.i18n.localize(`${PREFIX}.settings.mode.disabled`),
      chat: game.i18n.localize(`${PREFIX}.settings.mode.chat`),
      auto: game.i18n.localize(`${PREFIX}.settings.mode.auto`)
    },
    default: "chat"
  });

  game.settings.register(MODULE_ID, "npcProneAutoNotify", {
    name: game.i18n.localize(`${PREFIX}.settings.npcProneAutoNotify.name`),
    hint: game.i18n.localize(`${PREFIX}.settings.npcProneAutoNotify.hint`),
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "npcUnconsciousMode", {
    name: game.i18n.localize(`${PREFIX}.settings.npcUnconsciousMode.name`),
    hint: game.i18n.localize(`${PREFIX}.settings.npcUnconsciousMode.hint`),
    scope: "world",
    config: true,
    type: String,
    choices: {
      disabled: game.i18n.localize(`${PREFIX}.settings.mode.disabled`),
      chat: game.i18n.localize(`${PREFIX}.settings.mode.chat`),
      auto: game.i18n.localize(`${PREFIX}.settings.mode.auto`)
    },
    default: "chat"
  });

  game.settings.register(MODULE_ID, "npcUnconsciousAutoNotify", {
    name: game.i18n.localize(`${PREFIX}.settings.npcUnconsciousAutoNotify.name`),
    hint: game.i18n.localize(`${PREFIX}.settings.npcUnconsciousAutoNotify.hint`),
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "npcWakeMode", {
    name: game.i18n.localize(`${PREFIX}.settings.npcWakeMode.name`),
    hint: game.i18n.localize(`${PREFIX}.settings.npcWakeMode.hint`),
    scope: "world",
    config: true,
    type: String,
    choices: {
      disabled: game.i18n.localize(`${PREFIX}.settings.mode.disabled`),
      chat: game.i18n.localize(`${PREFIX}.settings.mode.chat`),
      auto: game.i18n.localize(`${PREFIX}.settings.mode.auto`)
    },
    default: "chat"
  });

  game.settings.register(MODULE_ID, "npcWakeAutoNotify", {
    name: game.i18n.localize(`${PREFIX}.settings.npcWakeAutoNotify.name`),
    hint: game.i18n.localize(`${PREFIX}.settings.npcWakeAutoNotify.hint`),
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  /* --------------------------------------------- */
  /* MESSAGE RECIPIENTS                            */
  /* --------------------------------------------- */

  game.settings.register(MODULE_ID, "pcRecipientsMain", {
    name: game.i18n.localize(`${PREFIX}.settings.pcRecipientsMain.name`),
    hint: game.i18n.localize(`${PREFIX}.settings.pcRecipientsMain.hint`),
    scope: "world",
    config: true,
    type: String,
    choices: {
      gmOnly: game.i18n.localize(`${PREFIX}.settings.recipients.gmOnly`),
      owners: game.i18n.localize(`${PREFIX}.settings.recipients.owners`),
      everyone: game.i18n.localize(`${PREFIX}.settings.recipients.everyone`)
    },
    default: "gmOnly"
  });

  game.settings.register(MODULE_ID, "pcRecipientsWake", {
    name: game.i18n.localize(`${PREFIX}.settings.pcRecipientsWake.name`),
    hint: game.i18n.localize(`${PREFIX}.settings.pcRecipientsWake.hint`),
    scope: "world",
    config: true,
    type: String,
    choices: {
      gmOnly: game.i18n.localize(`${PREFIX}.settings.recipients.gmOnly`),
      owners: game.i18n.localize(`${PREFIX}.settings.recipients.owners`),
      everyone: game.i18n.localize(`${PREFIX}.settings.recipients.everyone`)
    },
    default: "gmOnly"
  });

  game.settings.register(MODULE_ID, "npcRecipients", {
    name: game.i18n.localize(`${PREFIX}.settings.npcRecipients.name`),
    hint: game.i18n.localize(`${PREFIX}.settings.npcRecipients.hint`),
    scope: "world",
    config: true,
    type: String,
    choices: {
      gmOnly: game.i18n.localize(`${PREFIX}.settings.recipients.gmOnly`),
      owners: game.i18n.localize(`${PREFIX}.settings.recipients.owners`),
      everyone: game.i18n.localize(`${PREFIX}.settings.recipients.everyone`)
    },
    default: "gmOnly"
  });

});

/* --------------------------------------------- */
/* SECTION HEADERS IN SETTINGS UI                */
/* --------------------------------------------- */

Hooks.on("renderSettingsConfig", (app, html, data) => {

  // Header sopra il blocco dei PG
  $('<div>')
    .addClass('form-group group-header')
    .html(game.i18n.localize("wfrp4e-zero-wounds-prone.settings.headerPC"))
    .insertBefore($('[name="wfrp4e-zero-wounds-prone.enablePC"]').parents('div.form-group:first'));

  // Header sopra il blocco dei PNG / Mostri
  $('<div>')
    .addClass('form-group group-header')
    .html(game.i18n.localize("wfrp4e-zero-wounds-prone.settings.headerNPC"))
    .insertBefore($('[name="wfrp4e-zero-wounds-prone.enableNPC"]').parents('div.form-group:first'));

  // Header sopra il blocco Destinatari
  $('<div>')
    .addClass('form-group group-header')
    .html(game.i18n.localize("wfrp4e-zero-wounds-prone.settings.headerRecipients"))
    .insertBefore($('[name="wfrp4e-zero-wounds-prone.pcRecipientsMain"]').parents('div.form-group:first'));

});

