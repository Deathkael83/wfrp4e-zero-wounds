const MODULE_ID = "wfrp4e-zero-wounds-prone";
const LOCAL = MODULE_ID;

// Hook per intercettare quando un attore sta per essere aggiornato
Hooks.on("preUpdateActor", async function (actor, changes, options, userId) {
  try {
    if (!game.settings.get(MODULE_ID, "enableModule")) return;

    const newWounds = foundry.utils.getProperty(changes, "system.status.wounds.value");
    if (newWounds === undefined) return;

    const oldWounds = foundry.utils.getProperty(actor, "system.status.wounds.value") ?? 0;

    // Determina un token "primario" associato all'attore
    const tokenDoc = getPrimaryTokenDocument(actor);

    // Da >0 a <=0 → caduto a 0 Ferite
    if (oldWounds > 0 && newWounds <= 0) {
      await handleZeroWounds(actor, tokenDoc);      // Prono
      await markZeroWoundsRound(actor, tokenDoc);   // timer Privo di sensi
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
async function handleZeroWounds(actor, tokenDoc) {
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
    await sendPronePrompt(actor, tokenDoc, whisper);
  } else if (mode === "auto") {
    await applyProne(actor);
    const notify = game.settings.get(MODULE_ID, "proneAutoNotify");
    if (notify) {
      await sendProneAutoMessage(actor, tokenDoc, whisper);
    }
  }
}

async function sendPronePrompt(actor, tokenDoc, whisper) {
  const displayName = getDisplayName(actor, tokenDoc);
  const baseText = game.i18n.format(`${LOCAL}.chat.message`, { actorName: displayName });
  const condTag = getConditionTag("prone");
  const msgText = `${baseText} ${condTag}`;

  const content = `
  <div class="wfrp4e-zero-wounds-prone">
    <p>${msgText}</p>
    <button type="button" class="apply-prone-zero-wounds">
      ${game.i18n.localize(`${LOCAL}.chat.button`)}
    </button>
  </div>
  `;

  const speaker = ChatMessage.getSpeaker({ token: tokenDoc, actor });

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

async function sendProneAutoMessage(actor, tokenDoc, whisper) {
  const displayName = getDisplayName(actor, tokenDoc);
  const baseText = game.i18n.format(`${LOCAL}.chat.message`, { actorName: displayName });
  const condTag = getConditionTag("prone");
  const msgText = `${baseText} ${condTag}`;

  const content = `
  <div class="wfrp4e-zero-wounds-prone">
    <p>${msgText}</p>
  </div>
  `;

  const speaker = ChatMessage.getSpeaker({ token: tokenDoc, actor });

  const messageData = {
    user: game.user.id,
    speaker,
    content,
    type: CONST.CHAT_MESSAGE_TYPES.OTHER
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
// → ora salvato sul TOKEN, non sull'attore, così funziona anche per PNG/mostri non linkati
async function markZeroWoundsRound(actor, tokenDoc) {
  const mode = game.settings.get(MODULE_ID, "unconsciousMode");
  if (mode === "disabled") return;

  const combat = game.combat;
  if (!combat) return; // fuori combattimento, niente Round

  if (!tokenDoc) tokenDoc = getPrimaryTokenDocument(actor);
  if (!tokenDoc) return;

  const round = combat.round || 1;

  await tokenDoc.setFlag(MODULE_ID, "zeroWoundsInfo", {
    combatId: combat.id,
    round,
    tokenId: tokenDoc.id
  });
}

async function clearZeroWoundsRound(actor) {
  // puliamo tutti i token attivi dell'attore
  const tokens = actor.getActiveTokens(true, true);
  for (const t of tokens) {
    const doc = t.document ?? t;
    await doc.unsetFlag(MODULE_ID, "zeroWoundsInfo").catch(() => {});
  }
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
      const tokenDoc = c.token;
      if (!actor || !tokenDoc) continue;

      const info = await tokenDoc.getFlag(MODULE_ID, "zeroWoundsInfo");
      if (!info) continue;
      if (info.combatId !== combat.id) continue;
      if (info.tokenId && info.tokenId !== tokenDoc.id) continue;

      const startRound = info.round || 1;
      const deltaRounds = currentRound - startRound;

      let tb = foundry.utils.getProperty(actor, "system.characteristics.t.bonus");
      tb = Number(tb) || 0;

      const wounds = foundry.utils.getProperty(actor, "system.status.wounds.value") ?? 0;

      if (tb <= 0) {
        await tokenDoc.unsetFlag(MODULE_ID, "zeroWoundsInfo").catch(() => {});
        continue;
      }

      if (wounds >= 1) {
        // È stato curato, pulizia di sicurezza
        await tokenDoc.unsetFlag(MODULE_ID, "zeroWoundsInfo").catch(() => {});
        continue;
      }

      // Se sono passati almeno TB Round a 0 Ferite → Privo di sensi (a seconda della modalità)
      if (deltaRounds >= tb) {
        const isPC = actor.type === "character";
        const settingKey = isPC ? "pcRecipients" : "npcRecipients";
        const recipientMode = game.settings.get(MODULE_ID, settingKey);
        const whisper = getRecipients(actor, recipientMode);

        if (mode === "chat") {
          await sendUnconsciousPrompt(actor, tokenDoc, whisper, tb);
        } else if (mode === "auto") {
          await applyUnconscious(actor);
          const notify = game.settings.get(MODULE_ID, "unconsciousAutoNotify");
          if (notify) {
            await sendUnconsciousAutoMessage(actor, tokenDoc, whisper, tb);
          }
        }

        await tokenDoc.unsetFlag(MODULE_ID, "zeroWoundsInfo").catch(() => {});
      }
    }
  } catch (err) {
    console.error(`[${MODULE_ID}] Error in updateCombat:`, err);
  }
});

async function sendUnconsciousPrompt(actor, tokenDoc, whisper, tb) {
  const displayName = getDisplayName(actor, tokenDoc);
  const baseText = game.i18n.format(`${LOCAL}.chat.unconscious`, {
    actorName: displayName,
    tb
  });
  const condTag = getConditionTag("unconscious");
  const msgText = `${baseText} ${condTag}`;

  const content = `
  <div class="wfrp4e-zero-wounds-prone">
    <p>${msgText}</p>
    <button type="button" class="apply-unconscious-zero-wounds">
      ${game.i18n.localize(`${LOCAL}.chat.unconsciousButton`)}
    </button>
  </div>
  `;

  const speaker = ChatMessage.getSpeaker({ token: tokenDoc, actor });

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

async function sendUnconsciousAutoMessage(actor, tokenDoc, whisper, tb) {
  const displayName = getDisplayName(actor, tokenDoc);
  const baseText = game.i18n.format(`${LOCAL}.chat.unconscious`, {
    actorName: displayName,
    tb
  });
  const condTag = getConditionTag("unconscious");
  const msgText = `${baseText} ${condTag}`;

  const content = `
  <div class="wfrp4e-zero-wounds-prone">
    <p>${msgText}</p>
  </div>
  `;

  const speaker = ChatMessage.getSpeaker({ token: tokenDoc, actor });

  const messageData = {
    user: game.user.id,
    speaker,
    content,
    type: CONST.CHAT_MESSAGE_TYPES.OTHER
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

// Token helper: token primario per un attore
function getPrimaryTokenDocument(actor) {
  // Preferisci un token nel combattimento attivo
  if (game.combat) {
    const combatant = game.combat.combatants.find(c => c.actor && c.actor.id === actor.id && c.token);
    if (combatant?.token) return combatant.token;
  }

  const tokens = actor.getActiveTokens(true, true);
  if (tokens.length) {
    return tokens[0].document ?? tokens[0];
  }

  return null;
}

function getDisplayName(actor, tokenDoc) {
  if (tokenDoc?.name) return tokenDoc.name;
  return actor.name;
}

// Genera il "tag condizione" cliccabile / tooltip
function getConditionTag(key) {
  const label = game.i18n.localize(`${LOCAL}.condition.${key}`);
  const escape = foundry.utils?.escapeHTML ?? (s => s);
  const safeLabel = escape(label);
  return `<span class="wfrp4e-condition-tag" data-condition="${key}" title="${safeLabel}">[${safeLabel}]</span>`;
}

// Listener per i bottoni in chat + tag condizione
Hooks.on("renderChatMessage", function (message, html, data) {
  if (message.flags?.[MODULE_ID]?.actorUuid) {
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
  }

  // Tag della condizione cliccabile: posta la condizione in chat
  html.find(".wfrp4e-condition-tag").on("click", (event) => {
    const key = event.currentTarget.dataset.condition;
    if (game.wfrp4e?.utility?.postCondition) {
      game.wfrp4e.utility.postCondition(key);
    }
  });
});
