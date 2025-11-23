const MODULE_ID = "wfrp4e-zero-wounds-prone";
const LOCAL = MODULE_ID;

Hooks.once("init", function () {
  console.log(`[${MODULE_ID}] Init settings`);

  // Abilita / disabilita completamente la funzione
  game.settings.register(MODULE_ID, "enableModule", {
    name: game.i18n.localize(`${LOCAL}.settings.enableModule.name`),
    hint: game.i18n.localize(`${LOCAL}.settings.enableModule.hint`),
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  // Impostazioni PG
  game.settings.register(MODULE_ID, "enablePC", {
    name: game.i18n.localize(`${LOCAL}.settings.enablePC.name`),
    hint: game.i18n.localize(`${LOCAL}.settings.enablePC.hint`),
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "pcRecipients", {
    name: game.i18n.localize(`${LOCAL}.settings.pcRecipients.name`),
    hint: game.i18n.localize(`${LOCAL}.settings.pcRecipients.hint`),
    scope: "world",
    config: true,
    type: String,
    choices: {
      "gmOnly": game.i18n.localize(`${LOCAL}.recipients.gmOnly`),
      "owners": game.i18n.localize(`${LOCAL}.recipients.owners`),
      "everyone": game.i18n.localize(`${LOCAL}.recipients.everyone`)
    },
    default: "owners"
  });

  // Impostazioni PNG / Mostri
  game.settings.register(MODULE_ID, "enableNPC", {
    name: game.i18n.localize(`${LOCAL}.settings.enableNPC.name`),
    hint: game.i18n.localize(`${LOCAL}.settings.enableNPC.hint`),
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "npcRecipients", {
    name: game.i18n.localize(`${LOCAL}.settings.npcRecipients.name`),
    hint: game.i18n.localize(`${LOCAL}.settings.npcRecipients.hint`),
    scope: "world",
    config: true,
    type: String,
    choices: {
      "gmOnly": game.i18n.localize(`${LOCAL}.recipients.gmOnly`),
      "owners": game.i18n.localize(`${LOCAL}.recipients.owners`),
      "everyone": game.i18n.localize(`${LOCAL}.recipients.everyone`)
    },
    // default: PNG/mostri solo GM
    default: "gmOnly"
  });

  // Modalità per Prono a 0 Ferite: disattivato / chat / automatico
  game.settings.register(MODULE_ID, "proneMode", {
    name: game.i18n.localize(`${LOCAL}.settings.proneMode.name`),
    hint: game.i18n.localize(`${LOCAL}.settings.proneMode.hint`),
    scope: "world",
    config: true,
    type: String,
    choices: {
      "disabled": game.i18n.localize(`${LOCAL}.mode.disabled`),
      "chat": game.i18n.localize(`${LOCAL}.mode.chat`),
      "auto": game.i18n.localize(`${LOCAL}.mode.auto`)
    },
    default: "chat"
  });

  // Notifica in chat per Prono automatico
  game.settings.register(MODULE_ID, "proneAutoNotify", {
    name: game.i18n.localize(`${LOCAL}.settings.proneAutoNotify.name`),
    hint: game.i18n.localize(`${LOCAL}.settings.proneAutoNotify.hint`),
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  // Modalità per Privo di sensi dopo BR Round: disattivato / chat / automatico
  game.settings.register(MODULE_ID, "unconsciousMode", {
    name: game.i18n.localize(`${LOCAL}.settings.unconsciousMode.name`),
    hint: game.i18n.localize(`${LOCAL}.settings.unconsciousMode.hint`),
    scope: "world",
    config: true,
    type: String,
    choices: {
      "disabled": game.i18n.localize(`${LOCAL}.mode.disabled`),
      "chat": game.i18n.localize(`${LOCAL}.mode.chat`),
      "auto": game.i18n.localize(`${LOCAL}.mode.auto`)
    },
    default: "chat"
  });

  // Notifica in chat per Privo di sensi automatico
  game.settings.register(MODULE_ID, "unconsciousAutoNotify", {
    name: game.i18n.localize(`${LOCAL}.settings.unconsciousAutoNotify.name`),
    hint: game.i18n.localize(`${LOCAL}.settings.unconsciousAutoNotify.hint`),
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
  
// Modalità risveglio (rimozione Privo di sensi quando le Ferite tornano ≥ 1)
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

// Notifica in chat anche in modalità auto
game.settings.register(MODULE_ID, "wakeAutoNotify", {
  name: `${LOCAL}.settings.wakeAutoNotify.name`,
  hint: `${LOCAL}.settings.wakeAutoNotify.hint`,
  scope: "world",
  config: true,
  type: Boolean,
  default: true
  });
});
