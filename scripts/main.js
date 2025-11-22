const MODULE_ID = "wfrp4e-zero-wounds-prone";
const LOCAL = MODULE_ID; // per comodità

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
    // Default: per PNG/mostri solo GM
    default: "gmOnly"
  });
});

// Hook per intercettare quando un attore sta per essere aggiornato
Hooks.on("preUpdateActor", async function (actor, changes, options, userId) {
  try {
    if (!game.settings.get(MODULE_ID, "enableModule")) return;

    // Recupera il nuovo valore di Ferite (se è effettivamente in cambiamento)
    const newWounds = foundry.utils.getProperty(changes, "system.status.wounds.value");
    if (newWounds === undefined) return;

    const oldWounds = foundry.utils.getProperty(actor, "system.status.wounds.value") ?? 0;

    // Ci interessa solo il passaggio da >0 a <=0
    if (oldWounds > 0 && newWounds <= 0) {
      handleZeroWounds(actor);
    }
  } catch (err) {
    console.error(`[${MODULE_ID}] Error in preUpdateActor:`, err);
  }
});

async function handleZeroWounds(actor) {
  const isPC = actor.type === "character";
  const isNPC = !isPC;

  if (isPC && !game.settings.get(MODULE_ID, "enablePC")) return;
  if (isNPC && !game.settings.get(MODULE_ID, "enableNPC")) return;

  const settingKey = isPC ? "pcRecipients" : "npcRecipients";
  const recipientMode = game.settings.get(MODULE_ID, settingKey);

  const whisper = getRecipients(actor, recipientMode);

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

function getRecipients(actor, mode) {
  // Restituisce una lista di userId o undefined per "tutti"
  if (mode === "everyone") return undefined;

  const gmUsers = ChatMessage.getWhisperRecipients("GM");
  const gmIds = gmUsers.map(u => u.id);

  if (mode === "gmOnly") {
    return gmIds;
  }

  if (mode === "owners") {
    const owners = game.users.filter(u => actor.testUserPermission(u, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER));
    const ownerIds = owners.map(u => u.id);

    // Se non è owned da nessuno (classico PNG/mostro), torna solo al GM
    if (!ownerIds.length) return gmIds;

    const all = new Set([...ownerIds, ...gmIds]);
    return Array.from(all);
  }

  // Fallback
  return gmIds;
}

// Listener per il click sul pulsante in chat
Hooks.on("renderChatMessage", function (message, html, data) {
  if (!message.flags?.[MODULE_ID]?.actorUuid) return;

  html.find(".apply-prone-zero-wounds").on("click", async (event) => {
    event.preventDefault();
    const uuid = message.flags[MODULE_ID].actorUuid;

    try {
      const doc = await fromUuid(uuid);
      const actor = doc instanceof Actor ? doc : doc?.actor;

      if (!actor) {
        ui.notifications.error(game.i18n.localize(`${LOCAL}.notifications.actorNotFound`));
        return;
      }

      // WFRP4e: applica condizione "Prone" usando l'API attuale
      if (typeof actor.addCondition === "function") {
        await actor.addCondition("prone");
      } else {
        ui.notifications.warn(game.i18n.localize(`${LOCAL}.notifications.noAddCondition`));
      }

    } catch (err) {
      console.error(`[${MODULE_ID}] Error applying Prone:`, err);
      ui.notifications.error(game.i18n.localize(`${LOCAL}.notifications.errorApplying`));
    }
  });
});
