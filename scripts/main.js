const MODULE_ID = "wfrp4e-zero-wounds-prone";
const LOCAL = MODULE_ID;

/* --------------------------------------------- */
/* UTILITIES                                     */
/* --------------------------------------------- */

// Nome da mostrare → tokenName o actorName
function getDisplayName(actor, tokenDoc) {
  if (tokenDoc?.name) return tokenDoc.name;
  return actor.name;
}

// Recupera TokenDocument per questo actor
function resolveTokenDocument(actor, options) {
  // 1) tokenId esplicito nelle options
  if (options?.tokenId && canvas?.tokens) {
    const t = canvas.tokens.get(options.tokenId);
    if (t) return t.document ?? t;
  }

  // 2) parent è un TokenDocument
  if (options?.parent && options.parent.documentName === "Token") {
    return options.parent;
  }

  // 3) options.token
  if (options?.token) {
    const tok = options.token;
    return tok.document ?? tok;
  }

  // 4) token con actor *identico* (fondamentale per token non linkati)
  if (canvas?.tokens) {
    const placeable = canvas.tokens.placeables.find(t => t.actor === actor);
    if (placeable) return placeable.document ?? placeable;
  }

  // 5) se in combattimento, prova via combatant (fallback)
  if (game.combat) {
    const combatant = game.combat.combatants.find(c => {
      if (!c.actor) return false;
      if (c.actor === actor) return true;
      if (c.actor.uuid && actor.uuid && c.actor.uuid === actor.uuid) return true;
      if (c.actor.id === actor.id) return true;
      return false;
    });
    if (combatant?.token) return combatant.token;
  }

  // 6) token attivi per questo actor (ultimo fallback)
  const tokens = actor.getActiveTokens(true, true);
  if (tokens.length) return tokens[0].document ?? tokens[0];

  // 7) nulla trovato
  return null;
}

// Destinatari chat
function getRecipients(actor, mode) {
  if (mode === "everyone") return undefined;
  const gmUsers = ChatMessage.getWhisperRecipients("GM");
  const gmIds = gmUsers.map(u => u.id);
  if (mode === "gmOnly") return gmIds;

  if (mode === "owners") {
    const owners = game.users.filter(u =>
      actor.testUserPermission(u, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)
    );
    const ownerIds = owners.map(u => u.id);
    if (!ownerIds.length) return gmIds;
    const full = new Set([...ownerIds, ...gmIds]);
    return Array.from(full);
  }
  return gmIds;
}

// Crea un tag @Condition[...] usando il NOME localizzato della condizione,
// così il sistema mostra il testo nella lingua corrente e, al click,
// posta la descrizione in chat senza aggiungere pulsanti di "Apply".
function makeConditionTag(condKey) {
  // condKey: "prone", "unconscious", ecc. (sempre minuscolo)
  let name = condKey;

  // Prova prima dal namespace globale WFRP4E (dove spesso c'è ConditionName)
  if (typeof WFRP4E !== "undefined") {
    const capKey = condKey.charAt(0).toUpperCase() + condKey.slice(1); // "Prone"
    if (WFRP4E.ConditionName && WFRP4E.ConditionName[capKey]) {
      name = WFRP4E.ConditionName[capKey];
    }
  }

  // Fallback: prova da CONFIG.WFRP4E (alcune versioni usano conditionNames)
  const cfg = CONFIG.WFRP4E || {};
  const names = cfg.conditionNames || cfg.ConditionName || {};
  if (names[condKey]) {
    name = names[condKey];
  } else {
    const capKey = condKey.charAt(0).toUpperCase() + condKey.slice(1);
    if (names[capKey]) {
      name = names[capKey];
    }
  }

  // Ultimo fallback: capitalizza la chiave (giusto per non mostrare tutto minuscolo)
  if (!name || name === condKey) {
    name = condKey.charAt(0).toUpperCase() + condKey.slice(1);
  }

  // Questo formato produce esattamente il comportamento che hai descritto:
  // tag localizzato, niente pulsante "Apply", click = descrizione in chat.
  return `@Condition[${name}]`;
}


/* --------------------------------------------- */
/* PREUPDATE ACTOR – unico punto di ingresso     */
/* --------------------------------------------- */

Hooks.on("preUpdateActor", async function (actor, changes, options, userId) {
  try {
    if (!game.settings.get(MODULE_ID, "enableModule")) return;

    const newWounds = foundry.utils.getProperty(changes, "system.status.wounds.value");
    if (newWounds === undefined) return;

    const oldWounds = foundry.utils.getProperty(actor, "system.status.wounds.value") ?? 0;
    const tokenDoc = resolveTokenDocument(actor, options);

    // >0 → <=0 (cade a 0 Ferite)
    if (oldWounds > 0 && newWounds <= 0) {
      await onZeroWounds(actor, tokenDoc);
      await startUnconsciousTimer(actor, tokenDoc);
    }

    // <=0 → >=1 (risale ad almeno 1 Ferita)
    if (oldWounds <= 0 && newWounds >= 1) {
      await onRegainConscious(actor, tokenDoc);
      await clearUnconsciousTimer(actor);
    }
  } catch (err) {
    console.error(`[${MODULE_ID}] preUpdateActor error:`, err);
  }
});

/* --------------------------------------------- */
/* PRONE A 0 FERITE                              */
/* --------------------------------------------- */

async function onZeroWounds(actor, tokenDoc) {
  const isPC = actor.type === "character";
  if (isPC && !game.settings.get(MODULE_ID, "enablePC")) return;
  if (!isPC && !game.settings.get(MODULE_ID, "enableNPC")) return;

  const mode = game.settings.get(MODULE_ID, "proneMode");
  if (mode === "disabled") return;

  const settingKey = isPC ? "pcRecipients" : "npcRecipients";
  const whisper = getRecipients(actor, game.settings.get(MODULE_ID, settingKey));

  if (mode === "chat") {
    await sendPronePrompt(actor, tokenDoc, whisper);
  } else if (mode === "auto") {
    await applyProne(actor);
    if (game.settings.get(MODULE_ID, "proneAutoNotify")) {
      await sendProneAuto(actor, tokenDoc, whisper);
    }
  }
}

async function applyProne(actor) {
  try {
    await actor.addCondition("prone");
  } catch (err) {
    console.error(`[${MODULE_ID}] applyProne error:`, err);
  }
}

async function sendPronePrompt(actor, tokenDoc, whisper) {
  const displayName = getDisplayName(actor, tokenDoc);
  const baseMsg = game.i18n.format(`${LOCAL}.chat.message`, { actorName: displayName });
  const condTag = makeConditionTag("prone");
  const msg = `${baseMsg} ${condTag}`;

  const content = `
  <div>
    <p>${msg}</p>
    <button class="apply-prone-zero-wounds">
      ${game.i18n.localize(`${LOCAL}.chat.button`)}
    </button>
  </div>`;

  await sendMessage(actor, tokenDoc, content, whisper);
}

async function sendProneAuto(actor, tokenDoc, whisper) {
  const displayName = getDisplayName(actor, tokenDoc);
  const baseMsg = game.i18n.format(`${LOCAL}.chat.message`, { actorName: displayName });
  const condTag = makeConditionTag("prone");
  const msg = `${baseMsg} ${condTag}`;

  const content = `<div><p>${msg}</p></div>`;
  await sendMessage(actor, tokenDoc, content, whisper);
}

/* --------------------------------------------- */
/* TIMER PRIVO DI SENSI                          */
/* --------------------------------------------- */

async function startUnconsciousTimer(actor, tokenDoc) {
  try {
    if (!tokenDoc) return;
    if (game.settings.get(MODULE_ID, "unconsciousMode") === "disabled") return;
    if (!game.combat) return;

    await tokenDoc.setFlag(MODULE_ID, "zeroWoundsInfo", {
      combatId: game.combat.id,
      round: game.combat.round,
      tokenId: tokenDoc.id
    });
  } catch (err) {
    console.error(`[${MODULE_ID}] startUnconsciousTimer error:`, err);
  }
}

async function clearUnconsciousTimer(actor) {
  try {
    const tokens = actor.getActiveTokens(true, true);
    if (!tokens || !tokens.length) return;

    for (const t of tokens) {
      if (!t) continue;
      const doc = t.document ?? t;
      if (!doc || typeof doc.unsetFlag !== "function") continue;
      await doc.unsetFlag(MODULE_ID, "zeroWoundsInfo").catch(() => {});
    }
  } catch (err) {
    console.error(`[${MODULE_ID}] clearUnconsciousTimer error:`, err);
  }
}

/* --------------------------------------------- */
/* UPDATE COMBAT – controlla svenimento          */
/* --------------------------------------------- */

Hooks.on("updateCombat", async function (combat, changed, options, userId) {
  try {
    if (!game.settings.get(MODULE_ID, "enableModule")) return;
    if (game.settings.get(MODULE_ID, "unconsciousMode") === "disabled") return;
    if (changed.round === undefined) return;

    const currentRound = combat.round;

    for (const c of combat.combatants) {
      const actor = c.actor;
      const tokenDoc = c.token;
      if (!actor || !tokenDoc) continue;

      const info = await tokenDoc.getFlag(MODULE_ID, "zeroWoundsInfo");
      if (!info) continue;
      if (info.combatId !== combat.id) continue;
      if (info.tokenId !== tokenDoc.id) continue;

      const delta = currentRound - info.round;
      const tb = actor.system.characteristics.t.bonus;
      const wounds = actor.system.status.wounds.value;

      if (wounds >= 1 || tb <= 0) {
        await tokenDoc.unsetFlag(MODULE_ID, "zeroWoundsInfo").catch(() => {});
        continue;
      }

      if (delta >= tb) {
        await onUnconscious(actor, tokenDoc, tb);
        await tokenDoc.unsetFlag(MODULE_ID, "zeroWoundsInfo").catch(() => {});
      }
    }
  } catch (err) {
    console.error(`[${MODULE_ID}] updateCombat error:`, err);
  }
});

/* --------------------------------------------- */
/* PRIVO DI SENSI                                */
/* --------------------------------------------- */

async function onUnconscious(actor, tokenDoc, tb) {
  const isPC = actor.type === "character";
  if (isPC && !game.settings.get(MODULE_ID, "enablePC")) return;
  if (!isPC && !game.settings.get(MODULE_ID, "enableNPC")) return;

  const mode = game.settings.get(MODULE_ID, "unconsciousMode");

  const settingKey = isPC ? "pcRecipients" : "npcRecipients";
  const whisper = getRecipients(actor, game.settings.get(MODULE_ID, settingKey));

  if (mode === "chat") {
    await sendUnconsciousPrompt(actor, tokenDoc, whisper, tb);
  } else if (mode === "auto") {
    await applyUnconscious(actor);
    if (game.settings.get(MODULE_ID, "unconsciousAutoNotify")) {
      await sendUnconsciousAuto(actor, tokenDoc, whisper, tb);
    }
  }
}

async function applyUnconscious(actor) {
  try {
    await actor.addCondition("unconscious");
  } catch (err) {
    console.error(`[${MODULE_ID}] applyUnconscious error:`, err);
  }
}

async function sendUnconsciousPrompt(actor, tokenDoc, whisper, tb) {
  const displayName = getDisplayName(actor, tokenDoc);
  const baseMsg = game.i18n.format(`${LOCAL}.chat.unconscious`, { actorName: displayName, tb });
  const condTag = makeConditionTag("unconscious");
  const msg = `${baseMsg} ${condTag}`;

  const content = `
  <div>
    <p>${msg}</p>
    <button class="apply-unconscious-zero-wounds">
      ${game.i18n.localize(`${LOCAL}.chat.unconsciousButton`)}
    </button>
  </div>`;

  await sendMessage(actor, tokenDoc, content, whisper);
}

async function sendUnconsciousAuto(actor, tokenDoc, whisper, tb) {
  const displayName = getDisplayName(actor, tokenDoc);
  const baseMsg = game.i18n.format(`${LOCAL}.chat.unconscious`, { actorName: displayName, tb });
  const condTag = makeConditionTag("unconscious");
  const msg = `${baseMsg} ${condTag}`;

  const content = `<div><p>${msg}</p></div>`;
  await sendMessage(actor, tokenDoc, content, whisper);
}

/* --------------------------------------------- */
/* RISVEGLIO DA PRIVO DI SENSI                   */
/* --------------------------------------------- */

async function onRegainConscious(actor, tokenDoc) {
  // Serve avere davvero la condizione
  if (!actor.hasCondition || !actor.hasCondition("unconscious")) return;

  const isPC = actor.type === "character";
  if (isPC && !game.settings.get(MODULE_ID, "enablePC")) return;
  if (!isPC && !game.settings.get(MODULE_ID, "enableNPC")) return;

  const mode = game.settings.get(MODULE_ID, "wakeMode");
  if (mode === "disabled") return;

  const settingKey = isPC ? "pcRecipients" : "npcRecipients";
  const whisper = getRecipients(actor, game.settings.get(MODULE_ID, settingKey));

  if (mode === "chat") {
    await sendWakePrompt(actor, tokenDoc, whisper);
  } else if (mode === "auto") {
    await removeUnconscious(actor);
    if (game.settings.get(MODULE_ID, "wakeAutoNotify")) {
      await sendWakeAuto(actor, tokenDoc, whisper);
    }
  }
}

async function removeUnconscious(actor) {
  try {
    if (actor.hasCondition && actor.hasCondition("unconscious")) {
      await actor.removeCondition("unconscious");
    }
  } catch (err) {
    console.error(`[${MODULE_ID}] removeUnconscious error:`, err);
  }
}

async function sendWakePrompt(actor, tokenDoc, whisper) {
  const displayName = getDisplayName(actor, tokenDoc);
  const baseMsg = game.i18n.format(`${LOCAL}.chat.wake`, { actorName: displayName });
  const condTag = makeConditionTag("unconscious");
  const msg = `${baseMsg} ${condTag}`;

  const content = `
  <div>
    <p>${msg}</p>
    <button class="remove-unconscious-zero-wounds">
      ${game.i18n.localize(`${LOCAL}.chat.wakeButton`)}
    </button>
  </div>`;

  await sendMessage(actor, tokenDoc, content, whisper);
}

async function sendWakeAuto(actor, tokenDoc, whisper) {
  const displayName = getDisplayName(actor, tokenDoc);
  const baseMsg = game.i18n.format(`${LOCAL}.chat.wake`, { actorName: displayName });
  const condTag = makeConditionTag("unconscious");
  const msg = `${baseMsg} ${condTag}`;

  const content = `<div><p>${msg}</p></div>`;
  await sendMessage(actor, tokenDoc, content, whisper);
}

/* --------------------------------------------- */
/* INVIO MESSAGGI                                */
/* --------------------------------------------- */

async function sendMessage(actor, tokenDoc, content, whisper) {
  try {
    const speaker = ChatMessage.getSpeaker({ token: tokenDoc, actor });

    const data = {
      user: game.user.id,
      speaker,
      content,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER,
      flags: {
        [MODULE_ID]: {
          actorUuid: actor.uuid,
          tokenUuid: tokenDoc?.uuid ?? null
        }
      }
    };

    if (whisper) data.whisper = whisper;
    await ChatMessage.create(data);
  } catch (err) {
    console.error(`[${MODULE_ID}] sendMessage error:`, err);
  }
}

/* --------------------------------------------- */
/* CHAT HANDLERS                                 */
/* --------------------------------------------- */

Hooks.on("renderChatMessage", async function (message, html, data) {
  try {
    const flags = message.flags?.[MODULE_ID];
    if (!flags) return;

    const { actorUuid, tokenUuid } = flags;

    html.find(".apply-prone-zero-wounds").on("click", async evt => {
      evt.preventDefault();
      const token = tokenUuid ? await fromUuid(tokenUuid) : null;
      const actor = token?.actor ?? (await fromUuid(actorUuid));
      if (actor) await applyProne(actor);
    });

    html.find(".apply-unconscious-zero-wounds").on("click", async evt => {
      evt.preventDefault();
      const token = tokenUuid ? await fromUuid(tokenUuid) : null;
      const actor = token?.actor ?? (await fromUuid(actorUuid));
      if (actor) await applyUnconscious(actor);
    });

    html.find(".remove-unconscious-zero-wounds").on("click", async evt => {
      evt.preventDefault();
      const token = tokenUuid ? await fromUuid(tokenUuid) : null;
      const actor = token?.actor ?? (await fromUuid(actorUuid));
      if (actor) await removeUnconscious(actor);
    });
  } catch (err) {
    console.error(`[${MODULE_ID}] renderChatMessage error:`, err);
  }
});
