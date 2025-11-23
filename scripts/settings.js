const MODULE_ID = "wfrp4e-zero-wounds-prone";
const LOCAL = MODULE_ID;

Hooks.once("init", function () {

  // Abilitazione modulo
  game.settings.register(MODULE_ID, "enableModule", {
    name: `${LOCAL}.settings.enableModule.name`,
    hint: `${LOCAL}.settings.enableModule.hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  // Abilitazione per PG
  game.settings.register(MODULE_ID, "enablePC", {
    name: `${LOCAL}.settings.enablePC.name`,
    hint: `${LOCAL}.settings.enablePC.hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  // Abilitazione per PNG / Mostri
  game.settings.register(MODULE_ID, "enableNPC", {
    name: `${LOCAL}.settings.enableNPC.name`,
    hint: `${LOCAL}.settings.enableNPC.hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  // Modalità messaggi / auto per Prono a 0 Ferite
  game.settings.register(MODULE_ID, "proneMode", {
    name: `${LOCAL}.settings.proneMode.name`,
    hint: `${LOCAL}.settings.proneMode.hint`,
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

  // Notifica in modalità auto per Prono
  game.settings.register(MODULE_ID, "proneAutoNotify", {
    name: `${LOCAL}.settings.proneAutoNotify.name`,
    hint: `${LOCAL}.settings.proneAutoNotify.hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  // Modalità messaggi / auto per Privo di sensi
  game.settings.register(MODULE_ID, "unconsciousMode", {
    name: `${LOCAL}.settings.unconsciousMode.name`,
    hint: `${LOCAL}.settings.unconsciousMode.hint`,
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

  // Notifica in modalità auto per Privo di sensi
  game.settings.register(MODULE_ID, "unconsciousAutoNotify", {
    name: `${LOCAL}.settings.unconsciousAutoNotify.name`,
    hint: `${LOCAL}.settings.unconsciousAutoNotify.hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  // Modalità messaggi / auto per RISVEGLIO da Privo di sensi
  game.settings.register(MODULE_ID, "wakeMode", {
    name: `${LOCAL}.settings.wakeMode.name`,
    hint: `${LOCAL}.settings.wakeMode.hint`,
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

  // Notifica in modalità auto per RISVEGLIO
  game.settings.register(MODULE_ID, "wakeAutoNotify", {
    name: `${LOCAL}.settings.wakeAutoNotify.name`,
    hint: `${LOCAL}.settings.wakeAutoNotify.hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  // Destinatari messaggi per PG
  game.settings.register(MODULE_ID, "pcRecipients", {
    name: `${LOCAL}.settings.pcRecipients.name`,
    hint: `${LOCAL}.settings.pcRecipients.hint`,
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

  // Destinatari messaggi per PNG / Mostri
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
