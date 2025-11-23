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
  if (options?.tokenId && canvas?.tokens) {
    const t = canvas.tokens.get(options.tokenId);
    if (t) return t.document ?? t;
  }

  if (options?.parent && options.parent.documentName === "Token") {
    return options.parent;
  }

  if (options?.token) {
    const tok = options.token;
    return tok.document ?? tok;
  }

  if (canvas?.tokens) {
    const placeable = canvas.tokens.placeables.find(t => t.actor === actor);
    if (placeable) return placeable.document ?? placeable;
  }

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

  const tokens = actor.getActiveTokens(true, true);
  if (tokens.length) return tokens[0].document ?? tokens[0];

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

/* --------------------------------------------- */
/* TAG CONDIZIONE – VERSIONE DEFINITIVA NO APPLY */
/* --------------------------------------------- */

// Restituisce HTML arricchito della condizione, senza il pulsante Apply
async function makeConditionTagHTML(condKey) {
  const capKey = condKey.charAt(0).toUpperCase() + condKey.slice(1);
  const i18nKey = `WFRP4E.ConditionName.${capKey}`;

  let localized = game.i18n.localize(i18nKey);
  if (!localized || localized === i18nKey) localized = capKey;

  const enriched = await TextEditor.enrichHTML(`@Condition[${localized}]`, {
    async: true,
    secrets: false
  });

  const div = document.createElement("div");
  div.innerHTML = enriched;

  const btn = div.querySelector("button");
  if (btn) btn.remove();

  return div.innerHTML.trim();
}

/* --------------------------------------------- */
/* PREUPDATE ACTOR                               */
/* --------------------------------------------- */

Hooks.on("preUpdateActor", async function (actor, changes, options, userId) {
  try {
    if (!game.settings.get(MODULE_ID, "enableModule")) return;

    const newWounds = foundry.utils.getProperty(changes, "system.status.wounds.value");
    if (newWounds === undefined) return;

    const oldWounds = foundry.utils.getProperty(actor, "system.status.wounds.value") ?? 0;
    const tokenDoc = resolveTokenDocument(actor, options);

    if (oldWounds > 0 && newWounds <= 0) {
      await onZeroWounds(actor, tokenDoc);
      await startUnconsciousTimer(actor, tokenDoc);
    }

    if (oldWounds <= 0 && newWounds >= 1) {
      await onRegainConscious(actor, tokenDoc);
      await clearUnconsciousTimer(actor);
    }
  } catch (err) {
    console.error(`[${MODULE_ID}] preUpdateActor error:`, err);
  }
});

/* --------------------------------------------- */
/* PRONE A 0 FERITE                               */
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
  const tag = await makeConditionTagHTML("prone");

  const content = `
  <div>
    <p>${baseMsg} ${tag}</p>
    <button class="apply-prone-zero-wounds">${game.i18n.localize(`${LOCAL}.chat.button`)}</button>
  </div>`;

  await sendMessage(actor, tokenDoc, content, whisper);
}

async function sendProneAuto(actor, tokenDoc, whisper) {
  const displayName = getDisplayName(actor, tokenDoc);
  const baseMsg = game.i18n.format(`${LOCAL}.chat.message`, { actorName: displayName });
  const tag = await makeConditionTagHTML("prone");
  const content = `<div><p>${baseMsg} ${tag}</p></div>`;
  await sendMessage(actor, tokenDoc, content, whisper);
}

/* --------------------------------------------- */
/* TIMER PRIVO DI SENSI                           */
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
/* UPDATE COMBAT – PRIVO DI SENSI                 */
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
/* PRIVO DI SENSI                                 */
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
  const tag = await makeConditionTagHTML("unconscious");

  const content = `
  <div>
    <p>${baseMsg} ${tag}</p>
    <button class="apply-unconscious-zero-wounds">
      ${game.i18n.localize(`${LOCAL}.chat.unconsciousButton`)}
    </button>
  </div>`;

  await sendMessage(actor, tokenDoc, content, whisper);
}

async function sendUnconsciousAuto(actor, tokenDoc, whisper, tb) {
  const displayName = getDisplayName(actor, tokenDoc);
  const baseMsg = game.i18n.format(`${LOCAL}.chat.unconscious`, { actorName: displayName, tb });
  const tag = await makeConditionTagHTML("unconscious");

  const content = `<div><p>${baseMsg} ${tag}</p></div>`;
  await sendMessage(actor, tokenDoc, content, whisper);
}

/* --------------------------------------------- */
/* RISVEGLIO DA PRIVO DI SENSI                    */
/* --------------------------------------------- */

async function onRegainConscious(actor, tokenDoc) {
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
  const tag = await makeConditionTagHTML("unconscious");

  const content = `
  <div>
    <p>${baseMsg} ${tag}</p>
    <button class="remove-unconscious-zero-wounds">
      ${game.i18n.localize(`${LOCAL}.chat.wakeButton`)}
    </button>
  </div>`;

  await sendMessage(actor, tokenDoc, content, whisper);
}

async function sendWakeAuto(actor, tokenDoc, whisper) {
  const displayName = getDisplayName(actor, tokenDoc);
  const baseMsg = game.i18n.format(`${LOCAL}.chat.wake`, { actorName: displayName });
  const tag = await makeConditionTagHTML("unconscious");

  const content = `<div><p>${baseMsg} ${tag}</p></div>`;
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
/* CHAT BUTTON HANDLERS                          */
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
