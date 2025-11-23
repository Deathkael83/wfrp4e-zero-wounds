const MODULE_ID = "wfrp4e-zero-wounds-prone";
const LOCAL = MODULE_ID;

/* --------------------------------------------- */
/* UTILITIES                                     */
/* --------------------------------------------- */

function getDisplayName(actor, tokenDoc) {
  if (tokenDoc?.name) return tokenDoc.name;
  return actor.name;
}

function resolveTokenDocument(actor, options) {
  if (options?.tokenId && canvas?.tokens) {
    const t = canvas.tokens.get(options.tokenId);
    if (t) return t.document ?? t;
  }

  if (options?.parent?.documentName === "Token") return options.parent;

  if (options?.token) return options.token.document ?? options.token;

  if (canvas?.tokens) {
    const placeable = canvas.tokens.placeables.find(t => t.actor === actor);
    if (placeable) return placeable.document ?? placeable;
  }

  if (game.combat) {
    const c = game.combat.combatants.find(cx => {
      if (!cx.actor) return false;
      if (cx.actor === actor) return true;
      if (cx.actor.uuid && actor.uuid && cx.actor.uuid === actor.uuid) return true;
      if (cx.actor.id === actor.id) return true;
      return false;
    });
    if (c?.token) return c.token;
  }

  const tokens = actor.getActiveTokens(true, true);
  if (tokens.length) return tokens[0].document ?? tokens[0];

  return null;
}

function getRecipients(actor, mode) {
  if (mode === "everyone") return undefined;
  const gms = ChatMessage.getWhisperRecipients("GM").map(u => u.id);

  if (mode === "gmOnly") return gms;

  if (mode === "owners") {
    const owners = game.users.filter(u =>
      actor.testUserPermission(u, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)
    );
    const ownerIds = owners.map(u => u.id);
    if (!ownerIds.length) return gms;
    return Array.from(new Set([...ownerIds, ...gms]));
  }

  return gms;
}

/* --------------------------------------------- */
/* TAG CONDIZIONE (NO APPLY)                     */
/* --------------------------------------------- */

async function makeConditionTagHTML(condKey) {
  const cap = condKey.charAt(0).toUpperCase() + condKey.slice(1);
  const i18nKey = `WFRP4E.ConditionName.${cap}`;

  let name = game.i18n.localize(i18nKey);
  if (!name || name === i18nKey) name = cap;

  const enriched = await TextEditor.enrichHTML(`@Condition[${name}]`, {
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
/* LISTENERS: PRE-UPDATE ACTOR                   */
/* --------------------------------------------- */

Hooks.on("preUpdateActor", async (actor, changes, options, userId) => {
  if (!game.settings.get(MODULE_ID, "enableModule")) return;

  const newW = foundry.utils.getProperty(changes, "system.status.wounds.value");
  if (newW === undefined) return;

  const oldW = actor.system.status.wounds.value ?? 0;
  const tokenDoc = resolveTokenDocument(actor, options);

  // 0 ferite → Prono + timer Privo di sensi
  if (oldW > 0 && newW <= 0) {
    await onZeroWounds(actor, tokenDoc);
    await startUnconsciousTimer(actor, tokenDoc);
  }

  // ritorno a ferite positive → risveglio
  if (oldW <= 0 && newW >= 1) {
    await onRegainConscious(actor, tokenDoc);
    await clearUnconsciousTimer(actor);
  }
});

/* --------------------------------------------- */
/* PRONO                                         */
/* --------------------------------------------- */

async function onZeroWounds(actor, tokenDoc) {
  const isPC = actor.type === "character";

  if (isPC && !game.settings.get(MODULE_ID, "enablePC")) return;
  if (!isPC && !game.settings.get(MODULE_ID, "enableNPC")) return;

  const mode = isPC
    ? game.settings.get(MODULE_ID, "pcProneMode")
    : game.settings.get(MODULE_ID, "npcProneMode");

  if (mode === "disabled") return;

  const recipients = isPC
    ? game.settings.get(MODULE_ID, "pcRecipientsMain")
    : game.settings.get(MODULE_ID, "npcRecipients");

  const whisper = getRecipients(actor, recipients);

  if (mode === "chat") {
    await sendPronePrompt(actor, tokenDoc, whisper);
  } else if (mode === "auto") {
    await applyProne(actor);
    const notify = isPC
      ? game.settings.get(MODULE_ID, "pcProneAutoNotify")
      : game.settings.get(MODULE_ID, "npcProneAutoNotify");

    if (notify) await sendProneAuto(actor, tokenDoc, whisper);
  }
}

async function applyProne(actor) {
  try {
    await actor.addCondition("prone");
  } catch (err) {
    console.error(`[${MODULE_ID}] applyProne error`, err);
  }
}

async function sendPronePrompt(actor, tokenDoc, whisper) {
  const name = getDisplayName(actor, tokenDoc);
  const msg = game.i18n.format(`${LOCAL}.chat.message`, { actorName: name });
  const tag = await makeConditionTagHTML("prone");

  const content = `
    <div>
      <p>${msg} ${tag}</p>
      <button class="apply-prone-zero-wounds">
        ${game.i18n.localize(`${LOCAL}.chat.button`)}
      </button>
    </div>`;

  await sendMessage(actor, tokenDoc, content, whisper);
}

async function sendProneAuto(actor, tokenDoc, whisper) {
  const name = getDisplayName(actor, tokenDoc);
  const msg = game.i18n.format(`${LOCAL}.chat.message`, { actorName: name });
  const tag = await makeConditionTagHTML("prone");
  await sendMessage(actor, tokenDoc, `<div><p>${msg} ${tag}</p></div>`, whisper);
}

/* --------------------------------------------- */
/* TIMER PRIVO DI SENSI                           */
/* --------------------------------------------- */

async function startUnconsciousTimer(actor, tokenDoc) {
  if (!tokenDoc) return;
  const modePC  = game.settings.get(MODULE_ID, "pcUnconsciousMode");
  const modeNPC = game.settings.get(MODULE_ID, "npcUnconsciousMode");
  const mode = actor.type === "character" ? modePC : modeNPC;
  if (mode === "disabled") return;

  if (!game.combat) return;

  await tokenDoc.setFlag(MODULE_ID, "zeroWTimer", {
    combatId: game.combat.id,
    round: game.combat.round,
    tokenId: tokenDoc.id
  });
}

async function clearUnconsciousTimer(actor) {
  const tokens = actor.getActiveTokens(true, true);
  for (const t of tokens) {
    try {
      await t.document.unsetFlag(MODULE_ID, "zeroWTimer");
    } catch {}
  }
}
/* --------------------------------------------- */
/* UPDATE COMBAT – CHECK PRIVO DI SENSI           */
/* --------------------------------------------- */

Hooks.on("updateCombat", async (combat, changed) => {
  if (!game.settings.get(MODULE_ID, "enableModule")) return;
  if (changed.round === undefined) return;

  for (const c of combat.combatants) {
    const actor = c.actor;
    const tokenDoc = c.token;
    if (!actor || !tokenDoc) continue;

    const info = await tokenDoc.getFlag(MODULE_ID, "zeroWTimer");
    if (!info) continue;
    if (info.combatId !== combat.id) continue;

    const delta = combat.round - info.round;
    const tb = actor.system.characteristics.t.bonus;
    const wounds = actor.system.status.wounds.value;

    if (wounds >= 1 || tb <= 0) {
      await tokenDoc.unsetFlag(MODULE_ID, "zeroWTimer");
      continue;
    }

    if (delta >= tb) {
      await onUnconscious(actor, tokenDoc, tb);
      await tokenDoc.unsetFlag(MODULE_ID, "zeroWTimer");
    }
  }
});

/* --------------------------------------------- */
/* PRIVO DI SENSI                                 */
/* --------------------------------------------- */

async function onUnconscious(actor, tokenDoc, tb) {
  const isPC = actor.type === "character";

  const mode = isPC
    ? game.settings.get(MODULE_ID, "pcUnconsciousMode")
    : game.settings.get(MODULE_ID, "npcUnconsciousMode");

  if (mode === "disabled") return;

  const recipients = isPC
    ? game.settings.get(MODULE_ID, "pcRecipientsMain")
    : game.settings.get(MODULE_ID, "npcRecipients");

  const whisper = getRecipients(actor, recipients);

  if (mode === "chat") {
    await sendUnconsciousPrompt(actor, tokenDoc, whisper, tb);
  } else if (mode === "auto") {
    await applyUnconscious(actor);

    const notify = isPC
      ? game.settings.get(MODULE_ID, "pcUnconsciousAutoNotify")
      : game.settings.get(MODULE_ID, "npcUnconsciousAutoNotify");

    if (notify) await sendUnconsciousAuto(actor, tokenDoc, whisper, tb);
  }
}

async function applyUnconscious(actor) {
  try {
    await actor.addCondition("unconscious");
  } catch (err) {
    console.error(`[${MODULE_ID}] applyUnconscious error`, err);
  }
}

async function sendUnconsciousPrompt(actor, tokenDoc, whisper, tb) {
  const name = getDisplayName(actor, tokenDoc);
  const msg = game.i18n.format(`${LOCAL}.chat.unconscious`, {
    actorName: name,
    tb
  });
  const tag = await makeConditionTagHTML("unconscious");

  const content = `
    <div>
      <p>${msg} ${tag}</p>
      <button class="apply-unconscious-zero-wounds">
        ${game.i18n.localize(`${LOCAL}.chat.unconsciousButton`)}
      </button>
    </div>`;

  await sendMessage(actor, tokenDoc, content, whisper);
}

async function sendUnconsciousAuto(actor, tokenDoc, whisper, tb) {
  const name = getDisplayName(actor, tokenDoc);
  const msg = game.i18n.format(`${LOCAL}.chat.unconscious`, { actorName: name, tb });
  const tag = await makeConditionTagHTML("unconscious");

  await sendMessage(actor, tokenDoc, `<div><p>${msg} ${tag}</p></div>`, whisper);
}

/* --------------------------------------------- */
/* RISVEGLIO                                      */
/* --------------------------------------------- */

async function onRegainConscious(actor, tokenDoc) {
  if (!actor.hasCondition("unconscious")) return;

  const isPC = actor.type === "character";

  const mode = isPC
    ? game.settings.get(MODULE_ID, "pcWakeMode")
    : game.settings.get(MODULE_ID, "npcWakeMode");

  if (mode === "disabled") return;

  const recipients = isPC
    ? game.settings.get(MODULE_ID, "pcRecipientsWake")
    : game.settings.get(MODULE_ID, "npcRecipients");

  const whisper = getRecipients(actor, recipients);

  if (mode === "chat") {
    await sendWakePrompt(actor, tokenDoc, whisper);
  } else if (mode === "auto") {
    await removeUnconscious(actor);

    const notify = isPC
      ? game.settings.get(MODULE_ID, "pcWakeAutoNotify")
      : game.settings.get(MODULE_ID, "npcWakeAutoNotify");

    if (notify) await sendWakeAuto(actor, tokenDoc, whisper);
  }
}

async function removeUnconscious(actor) {
  try {
    if (actor.hasCondition("unconscious")) {
      await actor.removeCondition("unconscious");
    }
  } catch (err) {
    console.error(`[${MODULE_ID}] removeUnconscious error`, err);
  }
}

async function sendWakePrompt(actor, tokenDoc, whisper) {
  const name = getDisplayName(actor, tokenDoc);
  const msg = game.i18n.format(`${LOCAL}.chat.wake`, { actorName: name });
  const tag = await makeConditionTagHTML("unconscious");

  const content = `
    <div>
      <p>${msg} ${tag}</p>
      <button class="remove-unconscious-zero-wounds">
        ${game.i18n.localize(`${LOCAL}.chat.wakeButton`)}
      </button>
    </div>`;

  await sendMessage(actor, tokenDoc, content, whisper);
}

async function sendWakeAuto(actor, tokenDoc, whisper) {
  const name = getDisplayName(actor, tokenDoc);
  const msg = game.i18n.format(`${LOCAL}.chat.wake`, { actorName: name });
  const tag = await makeConditionTagHTML("unconscious");

  await sendMessage(actor, tokenDoc, `<div><p>${msg} ${tag}</p></div>`, whisper);
}

/* --------------------------------------------- */
/* SEND MESSAGE                                   */
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
/* CHAT BUTTON HANDLERS                           */
/* --------------------------------------------- */

Hooks.on("renderChatMessage", async (message, html) => {
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
});
