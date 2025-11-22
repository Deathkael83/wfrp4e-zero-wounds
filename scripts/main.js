const MODULE_ID = "wfrp4e-zero-wounds-prone";
const LOCAL = MODULE_ID; // per comodità con le chiavi di localizzazione

Hooks.once("init", function () {
  console.log(`[${MODULE_ID}] Init`);

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
});

// Hook per intercettare quando un attore sta per essere aggiornato
Hooks.on("preUpdateActor", async function (actor, changes, options, userId) {
  try {
    if (!game.settings.get(MODULE_ID, "enableModule")) return;

    const newWounds = foundry.utils.getProperty(changes, "system.status.wounds.value");
    if (newWounds === undefined) return;

    const oldWounds = foundry.utils.getProperty(actor, "system.status.wounds.value") ?? 0;

    // Da >0 a <=0 → caduto a 0 Ferite
    if (oldWounds > 0 && newWounds <= 0) {
      await handleZeroWounds(actor);        // Prono
      await markZeroWoundsRound(actor);     // timer Privo di sensi
    }

    // Da <=0 a >=1 → curato almeno a 1 Ferita, azzera il timer per Privo di sensi
    if (oldWounds <= 0 && newWounds >= 1) {
      await clearZeroWoundsRound(actor);
    }
  } catch (err) {
    console.error(`[${MODULE_ID}] Error in preUpdateActor:`, err);
  }
});

// Gestione logica a 0 Ferite (Prono)
async function handleZeroWounds(actor) {
  const isPC = actor.type === "character";
  const isNPC = !isPC;

  if (isPC && !game.settings.get(MODULE_ID, "enablePC")) return;
  if (isNPC && !game.settings.get(MODULE_ID, "enableNPC")) return;

  const mode = game.settings.get(MODULE_ID, "proneMode");
  if (mode === "disabled") return;

  const settingKey = isPC ? "pcRecipients" : "npcRecipients";
  const recipientMode = game.settings.get(MODULE_ID, settingKey);
  const whisper = getRecipients(actor, recipientMode);

  if (mode === "chat") {
    await sendPronePrompt(actor, whisper);
  } else if (mode === "auto") {
    await applyProne(actor);
  }
}

async function sendPronePrompt(actor, whisper) {
  const actorName = actor.name;
  const msgText = game.i18n.format(`${LOCAL}.chat.message`, { actorName });
  const btnText = game.i18n.localize(`${LOCAL}.chat.button`);

  const content = `
  <div class="wfrp4e-zero-wounds-prone">
    <p>${msgText}</p>
    <button type="button" class="apply-prone-zero-wounds">
      ${btnText}
    </button>
  </div>
  `;

  const speaker = ChatMessage.getSpeaker({ actor });

  const messageData = {
    user: game.user.id,
    speaker,
    content,
    type: CONST.CHAT_MESSAGE_TYPES.OTHER,
    flags: {
      [MODULE_ID]: {
        actorUuid: actor.uuid
      }
    }
  };

  if (whisper && whisper.length) {
    messageData.whisper = whisper;
  }

  await ChatMessage.create(messageData);
}

async function applyProne(actor) {
  try {
    if (typeof actor.addCondition === "function") {
      await actor.addCondition("prone");
    } else {
      ui.notifications.warn(game.i18n.localize(`${LOCAL}.notifications.noAddCondition`));
    }
  } catch (err) {
    console.error(`[${MODULE_ID}] Error applying Prone:`, err);
    ui.notifications.error(game.i18n.localize(`${LOCAL}.notifications.errorApplying`));
  }
}

// Flag per gestire il conteggio dei Round a 0 Ferite (Privo di sensi)
async function markZeroWoundsRound(actor) {
  const mode = game.settings.get(MODULE_ID, "unconsciousMode");
  if (mode === "disabled") return;

  const combat = game.combat;
  if (!combat) return; // fuori combattimento, niente Round

  const round = combat.round || 1;

  await actor.setFlag(MODULE_ID, "zeroWoundsInfo", {
    combatId: combat.id,
    round
  });
}

async function clearZeroWoundsRound(actor) {
  await actor.unsetFlag(MODULE_ID, "zeroWoundsInfo").catch(() => {});
}

// Controllo a ogni cambio di Round per la caduta Privo di sensi
Hooks.on("updateCombat", async function (combat, changed, options, userId) {
  try {
    if (!game.settings.get(MODULE_ID, "enableModule")) return;

    const mode = game.settings.get(MODULE_ID, "unconsciousMode");
    if (mode === "disabled") return;

    // Ci interessa solo quando cambia il Round
    if (typeof changed.round === "undefined") return;

    const currentRound = combat.round || 1;

    for (const c of combat.combatants) {
      const actor = c.actor;
      if (!actor) continue;

      const info = await actor.getFlag(MODULE_ID, "zeroWoundsInfo");
      if (!info) continue;
      if (info.combatId !== combat.id) continue;

      const startRound = info.round || 1;
      const deltaRounds = currentRound - startRound;

      const tb = foundry.utils.getProperty(actor, "system.characteristics.t.bonus") ?? 0;
      const wounds = foundry.utils.getProperty(actor, "system.status.wounds.value") ?? 0;

      if (tb <= 0) continue;
      if (wounds >= 1) {
        // È stato curato, pulizia di sicurezza
        await clearZeroWoundsRound(actor);
        continue;
      }

      // Se sono passati almeno TB Round a 0 Ferite → Privo di sensi (a seconda della modalità)
      if (deltaRounds >= tb) {
        const isPC = actor.type === "character";
        const settingKey = isPC ? "pcRecipients" : "npcRecipients";
        const recipientMode = game.settings.get(MODULE_ID, settingKey);
        const whisper = getRecipients(actor, recipientMode);

        if (mode === "chat") {
          await sendUnconsciousPrompt(actor, whisper);
        } else if (mode === "auto") {
          await applyUnconscious(actor);
        }

        await clearZeroWoundsRound(actor);
      }
    }
  } catch (err) {
    console.error(`[${MODULE_ID}] Error in updateCombat:`, err);
  }
});

async function sendUnconsciousPrompt(actor, whisper) {
  const actorName = actor.name;
  const msgText = game.i18n.format(`${LOCAL}.chat.unconscious`, { actorName });
  const btnText = game.i18n.localize(`${LOCAL}.chat.unconsciousButton`);

  const content = `
  <div class="wfrp4e-zero-wounds-prone">
    <p>${msgText}</p>
    <button type="button" class="apply-unconscious-zero-wounds">
      ${btnText}
    </button>
  </div>
  `;

  const speaker = ChatMessage.getSpeaker({ actor });

  const messageData = {
    user: game.user.id,
    speaker,
    content,
    type: CONST.CHAT_MESSAGE_TYPES.OTHER,
    flags: {
      [MODULE_ID]: {
        actorUuid: actor.uuid
      }
    }
  };

  if (whisper && whisper.length) {
    messageData.whisper = whisper;
  }

  await ChatMessage.create(messageData);
}

async function applyUnconscious(actor) {
  try {
    if (typeof actor.addCondition === "function") {
      await actor.addCondition("unconscious");
    } else {
      ui.notifications.warn(game.i18n.localize(`${LOCAL}.notifications.noAddCondition`));
    }
  } catch (err) {
    console.error(`[${MODULE_ID}] Error applying Unconscious:`, err);
    ui.notifications.error(game.i18n.localize(`${LOCAL}.notifications.errorApplying`));
  }
}

// Calcolo destinatari (GM / proprietari / tutti)
function getRecipients(actor, mode) {
  // undefined = messaggio visibile a tutti
  if (mode === "everyone") return undefined;

  const gmUsers = ChatMessage.getWhisperRecipients("GM");
  const gmIds = gmUsers.map(u => u.id);

  if (mode === "gmOnly") {
    return gmIds;
  }

  if (mode === "owners") {
    const owners = game.users.filter(u =>
      actor.testUserPermission(u, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)
    );
    const ownerIds = owners.map(u => u.id);

    // Nessun owner → solo GM
    if (!ownerIds.length) return gmIds;

    const all = new Set([...ownerIds, ...gmIds]);
    return Array.from(all);
  }

  // Fallback paranoico
  return gmIds;
}

// Listener per i bottoni in chat
Hooks.on("renderChatMessage", function (message, html, data) {
  if (!message.flags?.[MODULE_ID]?.actorUuid) return;

  const uuid = message.flags[MODULE_ID].actorUuid;

  // Bottone: Applica Prono
  html.find(".apply-prone-zero-wounds").on("click", async (event) => {
    event.preventDefault();
    try {
      const doc = await fromUuid(uuid);
      const actor = doc instanceof Actor ? doc : doc?.actor;

      if (!actor) {
        ui.notifications.error(game.i18n.localize(`${LOCAL}.notifications.actorNotFound`));
        return;
      }

      await applyProne(actor);

    } catch (err) {
      console.error(`[${MODULE_ID}] Error applying Prone from chat:`, err);
      ui.notifications.error(game.i18n.localize(`${LOCAL}.notifications.errorApplying`));
    }
  });

  // Bottone: Applica Privo di sensi
  html.find(".apply-unconscious-zero-wounds").on("click", async (event) => {
    event.preventDefault();
    try {
      const doc = await fromUuid(uuid);
      const actor = doc instanceof Actor ? doc : doc?.actor;

      if (!actor) {
        ui.notifications.error(game.i18n.localize(`${LOCAL}.notifications.actorNotFound`));
        return;
      }

      await applyUnconscious(actor);

    } catch (err) {
      console.error(`[${MODULE_ID}] Error applying Unconscious from chat:`, err);
      ui.notifications.error(game.i18n.localize(`${LOCAL}.notifications.errorApplying`));
    }
  });
});
