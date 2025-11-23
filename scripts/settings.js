const MODULE_ID = "wfrp4e-zero-wounds-prone";
const LOCAL = MODULE_ID;

Hooks.once("init", function () {

  /* --------------------------------------------- */
  /* BLOCCO: IMPOSTAZIONI GENERALI                  */
  /* --------------------------------------------- */
  game.settings.register(MODULE_ID, "headerGeneral", {
    name: `${LOCAL}.settings.headerGeneral`,
    scope: "world",
    config: true,
    type: String,
    default: "",
  });

  game.settings.register(MODULE_ID, "enableModule", {
    name: `${LOCAL}.settings.enableModule.name`,
    hint: `${LOCAL}.settings.enableModule.hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });


  /* --------------------------------------------- */
  /* BLOCCO: PLAYER CHARACTERS                      */
  /* --------------------------------------------- */
  game.settings.register(MODULE_ID, "headerPC", {
    name: `${LOCAL}.settings.headerPC`,
    scope: "world",
    config: true,
    type: String,
    default: "",
  });

  // Abilitazione eventi PG
  game.settings.register(MODULE_ID, "enablePC", {
    name: `${LOCAL}.settings.enablePC.name`,
    hint: `${LOCAL}.settings.enablePC.hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  // PG – modalità PRONO
  game.settings.register(MODULE_ID, "pcProneMode", {
    name: `${LOCAL}.settings.pcProneMode.name`,
    hint: `${LOCAL}.settings.pcProneMode.hint`,
    scope: "world",
    config: true,
    type: String,
    choices: {
      disabled: `${LOCAL}.settings.mode.disabled`,
      chat: `${LOCAL}.settings.mode.chat`,
      auto: `${LOCAL}.settings.mode.auto`
    },
    default: "chat"
  });

  game.settings.register(MODULE_ID, "pcProneAutoNotify", {
    name: `${LOCAL}.settings.pcProneAutoNotify.name`,
    hint: `${LOCAL}.settings.pcProneAutoNotify.hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  // PG – modalità PRIVO DI SENSI
  game.settings.register(MODULE_ID, "pcUnconsciousMode", {
    name: `${LOCAL}.settings.pcUnconsciousMode.name`,
    hint: `${LOCAL}.settings.pcUnconsciousMode.hint`,
    scope: "world",
    config: true,
    type: String,
    choices: {
      disabled: `${LOCAL}.settings.mode.disabled`,
      chat: `${LOCAL}.settings.mode.chat`,
      auto: `${LOCAL}.settings.mode.auto`
    },
    default: "chat"
  });

  game.settings.register(MODULE_ID, "pcUnconsciousAutoNotify", {
    name: `${LOCAL}.settings.pcUnconsciousAutoNotify.name`,
    hint: `${LOCAL}.settings.pcUnconsciousAutoNotify.hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  // PG – modalità RISVEGLIO
  game.settings.register(MODULE_ID, "pcWakeMode", {
    name: `${LOCAL}.settings.pcWakeMode.name`,
    hint: `${LOCAL}.settings.pcWakeMode.hint`,
    scope: "world",
    config: true,
    type: String,
    choices: {
      disabled: `${LOCAL}.settings.mode.disabled`,
      chat: `${LOCAL}.settings.mode.chat`,
      auto: `${LOCAL}.settings.mode.auto`
    },
    default: "chat"
  });

  game.settings.register(MODULE_ID, "pcWakeAutoNotify", {
    name: `${LOCAL}.settings.pcWakeAutoNotify.name`,
    hint: `${LOCAL}.settings.pcWakeAutoNotify.hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });


  /* --------------------------------------------- */
  /* BLOCCO: NPC / MOSTRI                           */
  /* --------------------------------------------- */
  game.settings.register(MODULE_ID, "headerNPC", {
    name: `${LOCAL}.settings.headerNPC`,
    scope: "world",
    config: true,
    type: String,
    default: "",
  });

  // Abilitazione eventi NPC
  game.settings.register(MODULE_ID, "enableNPC", {
    name: `${LOCAL}.settings.enableNPC.name`,
    hint: `${LOCAL}.settings.enableNPC.hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  // PNG – modalità PRONO
  game.settings.register(MODULE_ID, "npcProneMode", {
    name: `${LOCAL}.settings.npcProneMode.name`,
    hint: `${LOCAL}.settings.npcProneMode.hint`,
    scope: "world",
    config: true,
    type: String,
    choices: {
      disabled: `${LOCAL}.settings.mode.disabled`,
      chat: `${LOCAL}.settings.mode.chat`,
      auto: `${LOCAL}.settings.mode.auto`
    },
    default: "chat"
  });

  game.settings.register(MODULE_ID, "npcProneAutoNotify", {
    name: `${LOCAL}.settings.npcProneAutoNotify.name`,
    hint: `${LOCAL}.settings.npcProneAutoNotify.hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  // PNG – modalità PRIVO DI SENSI
  game.settings.register(MODULE_ID, "npcUnconsciousMode", {
    name: `${LOCAL}.settings.npcUnconsciousMode.name`,
    hint: `${LOCAL}.settings.npcUnconsciousMode.hint`,
    scope: "world",
    config: true,
    type: String,
    choices: {
      disabled: `${LOCAL}.settings.mode.disabled`,
      chat: `${LOCAL}.settings.mode.chat`,
      auto: `${LOCAL}.settings.mode.auto`
    },
    default: "chat"
  });

  game.settings.register(MODULE_ID, "npcUnconsciousAutoNotify", {
    name: `${LOCAL}.settings.npcUnconsciousAutoNotify.name`,
    hint: `${LOCAL}.settings.npcUnconsciousAutoNotify.hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  // PNG – modalità RISVEGLIO
  game.settings.register(MODULE_ID, "npcWakeMode", {
    name: `${LOCAL}.settings.npcWakeMode.name`,
    hint: `${LOCAL}.settings.npcWakeMode.hint`,
    scope: "world",
    config: true,
    type: String,
    choices: {
      disabled: `${LOCAL}.settings.mode.disabled`,
      chat: `${LOCAL}.settings.mode.chat`,
      auto: `${LOCAL}.settings.mode.auto`
    },
    default: "chat"
  });

  game.settings.register(MODULE_ID, "npcWakeAutoNotify", {
    name: `${LOCAL}.settings.npcWakeAutoNotify.name`,
    hint: `${LOCAL}.settings.npcWakeAutoNotify.hint`,
    scope: "world`,
    config: true,
    type: Boolean,
    default: true
  });


  /* --------------------------------------------- */
  /* BLOCCO: DESTINATARI                           */
  /* --------------------------------------------- */
  game.settings.register(MODULE_ID, "headerRecipients", {
    name: `${LOCAL}.settings.headerRecipients`,
    scope: "world",
    config: true,
    type: String,
    default: "",
  });

  // Destinatari PG → Prono + Privo di sensi
  game.settings.register(MODULE_ID, "pcRecipientsMain", {
    name: `${LOCAL}.settings.pcRecipientsMain.name`,
    hint: `${LOCAL}.settings.pcRecipientsMain.hint`,
    scope: "world",
    config: true,
    type: String,
    choices: {
      gmOnly: `${LOCAL}.settings.recipients.gmOnly`,
      owners: `${LOCAL}.settings.recipients.owners`,
      everyone: `${LOCAL}.settings.recipients.everyone`
    },
    default: "gmOnly"
  });

  // Destinatari PG → Risveglio
  game.settings.register(MODULE_ID, "pcRecipientsWake", {
    name: `${LOCAL}.settings.pcRecipientsWake.name`,
    hint: `${LOCAL}.settings.pcRecipientsWake.hint`,
    scope: "world",
    config: true,
    type: String,
    choices: {
      gmOnly: `${LOCAL}.settings.recipients.gmOnly`,
      owners: `${LOCAL}.settings.recipients.owners`,
      everyone: `${LOCAL}.settings.recipients.everyone`
    },
    default: "gmOnly"
  });

  // Destinatari PNG → unico
  game.settings.register(MODULE_ID, "npcRecipients", {
    name: `${LOCAL}.settings.npcRecipients.name`,
    hint: `${LOCAL}.settings.npcRecipients.hint`,
    scope: "world",
    config: true,
    type: String,
    choices: {
      gmOnly: `${LOCAL}.settings.recipients.gmOnly`,
      owners: `${LOCAL}.settings.recipients.owners`,
      everyone: `${LOCAL}.settings.recipients.everyone`
    },
    default: "gmOnly"
  });

});
