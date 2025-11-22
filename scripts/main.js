const MODULE_ID = "wfrp4e-zero-wounds-prone";
const LOCAL = MODULE_ID;

/* --------------------------------------------- */
/* UTILITIES                                     */
/* --------------------------------------------- */

// Restituisce l'UUID corretto token→attore o attore→token
function resolveTokenDocument(actor, options) {
  // Caso 1: update via tokenId
  if (options?.tokenId && canvas?.tokens) {
    const t = canvas.tokens.get(options.tokenId);
    if (t) return t.document ?? t;
  }

  // Caso 2: update da TokenDocument parent
  if (options?.parent && options.parent.documentName === "Token") {
    return options.parent;
  }

  // Caso 3: options.token esiste
  if (options?.token) {
    const tok = options.token;
    if (tok.document) return tok.document;
    return tok;
  }

  // Caso 4: combatti → prendi token del combattente
  if (game.combat) {
    const c = game.combat.combatants.find(x => x.actor?.id === actor.id);
    if (c?.token) {
      return c.token;
    }
  }

  // Caso 5: fallback → primo token attivo
  const tokens = actor.getActiveTokens(true, true);
  if (tokens.length) {
    return tokens[0].document ?? tokens[0];
  }

  return null;
}

// Nome da mostrare → tokenName o actorName
function getDisplayName(actor, tokenDoc) {
  if (tokenDoc?.name) return tokenDoc.name;
  return actor.name;
}

// A chi mandare i messaggi
function getRecipients(actor, mode) {
  if (mode === "everyone") return undefined;

  const gmUsers = ChatMessage.getWhisperRecipients("GM");
  const gmIds = gmUsers.map(u => u.id);

  if (mode === "gmOnly") return gmIds;

  if (mode === "owners") {
    const owners = game.users.filter(u =>
      actor.testUserPermission(
        u,
        CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
      )
    );
    const ownerIds = owners.map(u => u.id);
    if (!ownerIds.length) return gmIds;

    const full = new Set([...ownerIds, ...gmIds]);
    return Array.from(full);
  }

  return gmIds;
}

// Costruisce tag condizione in stile WFRP4e
function makeConditionTag(condKey) {
  // Esempio condKey: "Prone", "Unconscious"
  const id = WFRP4E.Conditions[condKey];          // "prone"
  const name = WFRP4E.ConditionName[condKey];     // "Prono"
  return `<a class="condition-chat" data-cond="${id}">${name}</a>`;
}

/* --------------------------------------------- */
/* PREUPDATE: controlla scendere a 0 o risalire  */
/* --------------------------------------------- */

Hooks.on("preUpdateActor", async function (actor, changes, options, userId) {
  if (!game.settings.get(MODULE_ID, "enableModule")) return;

  const newWounds = foundry.utils.getProperty(changes, "system.status.wounds.value");
  if (newWounds === undefined) return;

  const oldWounds = actor.system.status.wounds.value;
  const tokenDoc = resolveTokenDocument(actor, options);

  // >0 → <=0
  if (oldWounds > 0 && newWounds <= 0) {
    await onZeroWounds(actor, tokenDoc);
    await startUnconsciousTimer(actor, tokenDoc);
  }

  // <=0 → >=1
  if (oldWounds <= 0 && newWounds >= 1) {
    await clearUnconsciousTimer(actor);
  }
});

/* --------------------------------------------- */
/* PRONE (0 WOUNDS)                              */
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
  await actor.addCondition("prone");
}

async function sendPronePrompt(actor, tokenDoc, whisper) {
  const condTag = makeConditionTag("Prone");
  const displayName = getDisplayName(actor, tokenDoc);
  const msg = game.i18n.format(`${LOCAL}.chat.message`, { actorName: displayName });

  const content = `
  <div>
    <p>${msg} ${condTag}</p>
    <button class="apply-prone-zero-wounds">${game.i18n.localize(`${LOCAL}.chat.button`)}</button>
  </div>
  `;

  await sendMessage(actor, tokenDoc, content, whisper);
}

async function sendProneAuto(actor, tokenDoc, whisper) {
  const condTag = makeConditionTag("Prone");
  const displayName = getDisplayName(actor, tokenDoc);
  const msg = game.i18n.format(`${LOCAL}.chat.message`, { actorName: displayName });

  const content = `<div><p>${msg} ${condTag}</p></div>`;
  await sendMessage(actor, tokenDoc, content, whisper);
}

/* --------------------------------------------- */
/* UNCONSCIOUS TIMER (BR ROUNDS)                 */
/* --------------------------------------------- */

async function startUnconsciousTimer(actor, tokenDoc) {
  if (!tokenDoc) return;

  const mode = game.settings.get(MODULE_ID, "unconsciousMode");
  if (mode === "disabled") return;

  if (!game.combat) return;

  await tokenDoc.setFlag(MODULE_ID, "zeroWoundsInfo", {
    combatId: game.combat.id,
    round: game.combat.round,
    tokenId: tokenDoc.id
  });
}

async function clearUnconsciousTimer(actor) {
  for (const t of actor.getActiveTokens(true, true)) {
    await t.document.unsetFlag(MODULE_ID, "zeroWoundsInfo").catch(() => {});
  }
}

Hooks.on("updateCombat", async function (combat, changed, options, userId) {
  if (!game.settings.get(MODULE_ID, "enableModule")) return;
  if (game.settings.get(MODULE_ID, "unconsciousMode") === "disabled") return;
  if (changed.round === undefined) return;

  const currentRound = combat.round;

  for (const c of combat.combatants) {
    const actor = c.actor;
    const tokenDoc = c.token;
    if (!actor || !tokenDoc) continue;

    const flag = await tokenDoc.getFlag(MODULE_ID, "zeroWoundsInfo");
    if (!flag) continue;
    if (flag.combatId !== combat.id) continue;
    if (flag.tokenId !== tokenDoc.id) continue;

    const delta = currentRound - flag.round;

    const tb = actor.system.characteristics.t.bonus || 0;
    const wounds = actor.system.status.wounds.value;

    if (wounds >= 1) {
      await tokenDoc.unsetFlag(MODULE_ID, "zeroWoundsInfo").catch(() => {});
      continue;
    }

    if (delta >= tb) {
      await onUnconscious(actor, tokenDoc, tb);
      await tokenDoc.unsetFlag(MODULE_ID, "zeroWoundsInfo").catch(() => {});
    }
  }
});

/* --------------------------------------------- */
/* UNCONSCIOUS                                   */
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
  await actor.addCondition("unconscious");
}

async function sendUnconsciousPrompt(actor, tokenDoc, whisper, tb) {
  const condTag = makeConditionTag("Unconscious");
  const displayName = getDisplayName(actor, tokenDoc);
  const msg = game.i18n.format(`${LOCAL}.chat.unconscious`, { actorName: displayName, tb });

  const content = `
  <div>
    <p>${msg} ${condTag}</p>
    <button class="apply-unconscious-zero-wounds">${game.i18n.localize(`${LOCAL}.chat.unconsciousButton`)}</button>
  </div>
  `;

  await sendMessage(actor, tokenDoc, content, whisper);
}

async function sendUnconsciousAuto(actor, tokenDoc, whisper, tb) {
  const condTag = makeConditionTag("Unconscious");
  const displayName = getDisplayName(actor, tokenDoc);
  const msg = game.i18n.format(`${LOCAL}.chat.unconscious`, { actorName: displayName, tb });

  const content = `<div><p>${msg} ${condTag}</p></div>`;
  await sendMessage(actor, tokenDoc, content, whisper);
}

/* --------------------------------------------- */
/* SEND MESSAGE + HANDLER                        */
/* --------------------------------------------- */

async function sendMessage(actor, tokenDoc, content, whisper) {
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
}

/* --------------------------------------------- */
/* CHAT BUTTONS + CONDITION TAGS                 */
/* --------------------------------------------- */

Hooks.on("renderChatMessage", function (message, html, data) {
  const flags = message.flags?.[MODULE_ID];
  if (!flags) return;

  const { actorUuid, tokenUuid } = flags;

  // --- Bottone PRONE ---
  html.find(".apply-prone-zero-wounds").on("click", async evt => {
    evt.preventDefault();
    const token = tokenUuid ? await fromUuid(tokenUuid) : null;
    const actor = token?.actor ?? (await fromUuid(actorUuid));
    if (!actor) return;
    await applyProne(actor);
  });

  // --- Bottone UNCONSCIOUS ---
  html.find(".apply-unconscious-zero-wounds").on("click", async evt => {
    evt.preventDefault();
    const token = tokenUuid ? await fromUuid(tokenUuid) : null;
    const actor = token?.actor ?? (await fromUuid(actorUuid));
    if (!actor) return;
    await applyUnconscious(actor);
  });

  // --- Tag condizione ---
  html.find(".condition-chat").on("click", evt => {
    const cond = evt.currentTarget.dataset.cond;
    if (game.wfrp4e?.utility?.postCondition) {
      game.wfrp4e.utility.postCondition(cond);
    }
  });
});
