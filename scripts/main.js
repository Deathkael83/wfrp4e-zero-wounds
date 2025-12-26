const MODULE_ID = "wfrp4e-zero-wounds-prone";
const LOCAL = MODULE_ID;

function getDisplayName(actor, tokenDoc) {
  return tokenDoc?.name ?? actor?.name ?? "Unknown";
}

async function resolveTokenDocument(actor) {
  const placeable = canvas?.tokens?.placeables?.find(t => t.actor === actor);
  if (placeable) return placeable.document;
  return null;
}

function getRecipients(actor, recipientsSetting) {
  const gms = game.users.filter(u => u.isGM && u.active).map(u => u.id);

  if (recipientsSetting === "gm") return gms;

  const ownerIds = game.users
    .filter(u => u.active && actor?.testUserPermission(u, "OWNER"))
    .map(u => u.id);

  if (recipientsSetting === "ownersGM") {
    return Array.from(new Set([...ownerIds, ...gms]));
  }

  return null; // everyone
}

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

  // remove WFRP "Apply ..." button, keep only the clickable link text
  const btn = div.querySelector("button");
  if (btn) btn.remove();

  return div.innerHTML.trim();
}

/* --------------------------------------------- */
/* LISTENERS: PRE-UPDATE ACTOR                   */
/* --------------------------------------------- */

Hooks.on("preUpdateActor", async (actor, changes, options, userId) => {
  if (!game.settings.get(MODULE_ID, "enableModule")) return;

  const woundsBefore = actor.system.status.wounds.value;
  const woundsAfter = foundry.utils.getProperty(changes, "system.status.wounds.value");

  if (woundsAfter === undefined) return;

  // dropped to 0
  if (woundsBefore >= 1 && woundsAfter <= 0) {
    await onZeroWounds(actor);
  }

  // regained to >= 1
  if (woundsBefore <= 0 && woundsAfter >= 1) {
    await onRegainConscious(actor);
  }
});

/* --------------------------------------------- */
/* ZERO WOUNDS ENTRY POINT                       */
/* --------------------------------------------- */

async function onZeroWounds(actor) {
  const tokenDoc = await resolveTokenDocument(actor);
  if (!tokenDoc) return;

  const isPC = actor.type === "character";
  if (isPC && !game.settings.get(MODULE_ID, "enablePC")) return;
  if (!isPC && !game.settings.get(MODULE_ID, "enableNPC")) return;

  await applyProne(actor);

  const recipients = isPC
    ? game.settings.get(MODULE_ID, "pcRecipientsMain")
    : game.settings.get(MODULE_ID, "npcRecipients");

  const whisper = getRecipients(actor, recipients);

  const proneMode = isPC
    ? game.settings.get(MODULE_ID, "pcProneMode")
    : game.settings.get(MODULE_ID, "npcProneMode");

  const proneNotify = isPC
    ? game.settings.get(MODULE_ID, "pcProneAutoNotify")
    : game.settings.get(MODULE_ID, "npcProneAutoNotify");

  if (proneMode === "chat") {
    await sendPronePrompt(actor, tokenDoc, whisper);
  } else if (proneMode === "auto" && proneNotify) {
    await sendProneAuto(actor, tokenDoc, whisper);
  }

  await startUnconsciousTimer(actor, tokenDoc);
}

async function applyProne(actor) {
  try {
    await actor.addCondition("prone");
  } catch (err) {
    console.error(`[${MODULE_ID}] applyProne`, err);
  }
}

async function sendPronePrompt(actor, tokenDoc, whisper) {
  const name = getDisplayName(actor, tokenDoc);
  const msg = game.i18n.format(`${LOCAL}.chat.prone`, { actorName: name });
  const tag = await makeConditionTagHTML("prone");

  const btn = game.i18n.localize(`${LOCAL}.chat.applyProne`);
  const html = `
  <div class="zwp-message">
    <p>${msg} ${tag}</p>
    <div class="zwp-buttons">
      <a class="zwp-button apply-prone-zero-wounds">${btn}</a>
    </div>
  </div>`;

  await sendMessage(actor, tokenDoc, html, whisper);
}

async function sendProneAuto(actor, tokenDoc, whisper) {
  const name = getDisplayName(actor, tokenDoc);
  const msg = game.i18n.format(`${LOCAL}.chat.prone`, { actorName: name });
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
    tokenId: tokenDoc.id,
    unconsciousApplied: false,
    deathResolved: false,
    deathPaused: false,
    deathDelay: 0
  });
}

async function clearUnconsciousTimer(tokenDoc) {
  if (!tokenDoc) return;
  await tokenDoc.unsetFlag(MODULE_ID, "zeroWTimer");
}

async function onUnconscious(actor, tokenDoc, tb) {
  const isPC = actor.type === "character";

  const recipients = isPC
    ? game.settings.get(MODULE_ID, "pcRecipientsMain")
    : game.settings.get(MODULE_ID, "npcRecipients");

  const whisper = getRecipients(actor, recipients);

  const mode = isPC
    ? game.settings.get(MODULE_ID, "pcUnconsciousMode")
    : game.settings.get(MODULE_ID, "npcUnconsciousMode");

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
    console.error(`[${MODULE_ID}] applyUnconscious`, err);
  }
}

async function sendUnconsciousPrompt(actor, tokenDoc, whisper, tb) {
  const name = getDisplayName(actor, tokenDoc);
  const msg = game.i18n.format(`${LOCAL}.chat.unconscious`, { actorName: name, tb });
  const tag = await makeConditionTagHTML("unconscious");

  const btn = game.i18n.localize(`${LOCAL}.chat.applyUnconscious`);
  const html = `
  <div class="zwp-message">
    <p>${msg} ${tag}</p>
    <div class="zwp-buttons">
      <a class="zwp-button apply-unconscious-zero-wounds">${btn}</a>
    </div>
  </div>`;

  await sendMessage(actor, tokenDoc, html, whisper);
}

async function sendUnconsciousAuto(actor, tokenDoc, whisper, tb) {
  const name = getDisplayName(actor, tokenDoc);
  const msg = game.i18n.format(`${LOCAL}.chat.unconscious`, { actorName: name, tb });
  const tag = await makeConditionTagHTML("unconscious");
  await sendMessage(actor, tokenDoc, `<div><p>${msg} ${tag}</p></div>`, whisper);
}

/* --------------------------------------------- */
/* WAKE UP / REMOVE UNCONSCIOUS                  */
/* --------------------------------------------- */

async function onRegainConscious(actor) {
  const tokenDoc = await resolveTokenDocument(actor);
  if (!tokenDoc) return;

  await clearUnconsciousTimer(tokenDoc);

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
    await actor.removeCondition("unconscious");
  } catch (err) {
    console.error(`[${MODULE_ID}] removeUnconscious`, err);
  }
}

async function sendWakePrompt(actor, tokenDoc, whisper) {
  const name = getDisplayName(actor, tokenDoc);
  const msg = game.i18n.format(`${LOCAL}.chat.wake`, { actorName: name });
  const tag = await makeConditionTagHTML("unconscious");

  const btn = game.i18n.localize(`${LOCAL}.chat.removeUnconscious`);
  const html = `
  <div class="zwp-message">
    <p>${msg} ${tag}</p>
    <div class="zwp-buttons">
      <a class="zwp-button remove-unconscious-zero-wounds">${btn}</a>
    </div>
  </div>`;

  await sendMessage(actor, tokenDoc, html, whisper);
}

async function sendWakeAuto(actor, tokenDoc, whisper) {
  const name = getDisplayName(actor, tokenDoc);
  const msg = game.i18n.format(`${LOCAL}.chat.wake`, { actorName: name });
  const tag = await makeConditionTagHTML("unconscious");
  await sendMessage(actor, tokenDoc, `<div><p>${msg} ${tag}</p></div>`, whisper);
}

/* --------------------------------------------- */
/* TIMER MORTE (DOPO PRIVO DI SENSI)             */
/* --------------------------------------------- */

function getGMRecipients() {
  return game.users.filter(u => u.isGM && u.active).map(u => u.id);
}

async function updateZeroWTimer(tokenDoc, patch) {
  const cur = (await tokenDoc.getFlag(MODULE_ID, "zeroWTimer")) || {};
  const next = { ...cur, ...patch };
  await tokenDoc.setFlag(MODULE_ID, "zeroWTimer", next);
  return next;
}

function getDeathSettings(actor) {
  const isPC = actor.type === "character";
  return {
    isPC,
    mode: game.settings.get(MODULE_ID, isPC ? "pcDeathMode" : "npcDeathMode"),
    notify: game.settings.get(MODULE_ID, isPC ? "pcDeathAutoNotify" : "npcDeathAutoNotify"),
    allowMayWait: isPC && game.settings.get(MODULE_ID, "pcDeathAllowFate")
  };
}

async function applyDead(actor) {
  try {
    await actor.addCondition("dead");
  } catch (err) {
    console.error(`[${MODULE_ID}] applyDead`, err);
  }
}

async function onDeathThreshold(actor, tokenDoc, tb) {
  const { mode, notify, allowMayWait } = getDeathSettings(actor);
  if (mode === "disabled") return;

  const whisper = getGMRecipients();
  const name = getDisplayName(actor, tokenDoc);
  const msg = game.i18n.format(`${LOCAL}.chat.death`, { actorName: name, tb });
  const tag = await makeConditionTagHTML("dead");

  if (mode === "auto") {
    await applyDead(actor);
    await updateZeroWTimer(tokenDoc, { deathResolved: true, deathPaused: true, deathDelay: 0 });

    if (notify) {
      await sendMessage(actor, tokenDoc, `<div><p>${msg} ${tag}</p></div>`, whisper);
    }
    return;
  }

  await sendDeathPrompt(actor, tokenDoc, whisper, tb, allowMayWait);
}

async function sendDeathPrompt(actor, tokenDoc, whisper, tb, allowMayWait) {
  const name = getDisplayName(actor, tokenDoc);
  const msg = game.i18n.format(`${LOCAL}.chat.death`, { actorName: name, tb });
  const tag = await makeConditionTagHTML("dead");
  const tokenUuid = tokenDoc?.uuid ?? "";
  const actorUuid = actor?.uuid ?? "";

  const btnApply = game.i18n.localize(`${LOCAL}.chat.deathApply`);
  const btnDelay = game.i18n.localize(`${LOCAL}.chat.deathDelay`);
  const btnPause = game.i18n.localize(`${LOCAL}.chat.deathPause`);
  const btnMayWait = game.i18n.localize(`${LOCAL}.chat.deathMayWait`);

  const mayWaitBtn = allowMayWait
    ? `<a class="zwp-button death-may-wait-zero-wounds" data-token-uuid="${tokenUuid}" data-actor-uuid="${actorUuid}">${btnMayWait}</a>`
    : "";

  const html = `
  <div class="zwp-message">
    <p>${msg} ${tag}</p>
    <div class="zwp-buttons">
      <a class="zwp-button apply-dead-zero-wounds" data-token-uuid="${tokenUuid}" data-actor-uuid="${actorUuid}">${btnApply}</a>
      <a class="zwp-button delay-dead-zero-wounds" data-token-uuid="${tokenUuid}" data-actor-uuid="${actorUuid}">${btnDelay}</a>
      <a class="zwp-button pause-dead-zero-wounds" data-token-uuid="${tokenUuid}" data-actor-uuid="${actorUuid}">${btnPause}</a>
      ${mayWaitBtn}
    </div>
  </div>`;

  await sendMessage(actor, tokenDoc, html, whisper);
}

async function deathMayWait(actor, tokenDoc) {
  try {
    if (!game.user.isGM) return;
    if (!actor || actor.type !== "character") return;
    if (!tokenDoc) return;

    const candidates = [
      "system.details.fate.value",
      "system.details.fate.current",
      "system.details.fate",
      "system.status.fate.value",
      "system.fate.value",
      "system.fate"
    ];

    let path = null;
    let value = null;
    for (const p of candidates) {
      const v = foundry.utils.getProperty(actor, p);
      if (typeof v === "number") { path = p; value = v; break; }
    }

    if (path === null || typeof value !== "number" || value <= 0) {
      ui.notifications.info(game.i18n.localize(`${LOCAL}.chat.deathNoFate`));
      return;
    }

    await actor.update({ [path]: value - 1 });

    await removeAllBleeding(actor);

    // block death (remain unconscious/stable, do not heal wounds, do not remove unconscious)
    await updateZeroWTimer(tokenDoc, { deathResolved: true, deathPaused: true, deathDelay: 0 });
  } catch (err) {
    console.error(`[${MODULE_ID}] deathMayWait`, err);
  }
}

async function removeAllBleeding(actor) {
  try {
    let safety = 50;
    while (safety-- > 0 && actor.hasCondition("bleeding")) {
      await actor.removeCondition("bleeding");
    }
  } catch (err) {
    console.error(`[${MODULE_ID}] removeAllBleeding`, err);
  }
}

/* --------------------------------------------- */
/* UPDATE COMBAT – CHECK PRIVO DI SENSI + MORTE   */
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

    // Unconscious at TB rounds (only once)
    if (!info.unconsciousApplied && delta >= tb) {
      await onUnconscious(actor, tokenDoc, tb);
      await updateZeroWTimer(tokenDoc, { unconsciousApplied: true });
    }

    // Death at 2*TB rounds (GM-controlled), unless paused/resolved
    const deathInfo = await tokenDoc.getFlag(MODULE_ID, "zeroWTimer") || {};
    if (deathInfo.deathResolved) continue;
    if (deathInfo.deathPaused) continue;

    let delay = Number(deathInfo.deathDelay ?? 0);
    if (delay > 0) {
      await updateZeroWTimer(tokenDoc, { deathDelay: delay - 1 });
      continue;
    }

    if (delta >= (tb * 2)) {
      await onDeathThreshold(actor, tokenDoc, tb);
    }
  }
});

/* --------------------------------------------- */
/* CHAT MESSAGE SENDER                           */
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
/* CHAT BUTTON HANDLERS                          */
/* --------------------------------------------- */

Hooks.on("renderChatMessage", async (message, html) => {
  const flags = message.flags?.[MODULE_ID];
  if (!flags) return;

  const { actorUuid, tokenUuid } = flags;

  async function resolve() {
    const token = tokenUuid ? await fromUuid(tokenUuid) : null;
    const actor = token?.actor ?? (await fromUuid(actorUuid));
    return { token, actor };
  }

  html.find(".apply-prone-zero-wounds").on("click", async evt => {
    evt.preventDefault();
    const { actor } = await resolve();
    if (actor) await applyProne(actor);
  });

  html.find(".apply-unconscious-zero-wounds").on("click", async evt => {
    evt.preventDefault();
    const { actor } = await resolve();
    if (actor) await applyUnconscious(actor);
  });

  html.find(".remove-unconscious-zero-wounds").on("click", async evt => {
    evt.preventDefault();
    const { actor } = await resolve();
    if (actor) await removeUnconscious(actor);
  });

  /* ------------------------------ */
  /* DEATH (GM ONLY)                */
  /* ------------------------------ */

  html.find(".apply-dead-zero-wounds").on("click", async evt => {
    evt.preventDefault();
    if (!game.user.isGM) return;
    const { token, actor } = await resolve();
    if (!actor || !token?.document) return;
    await applyDead(actor);
    await updateZeroWTimer(token.document, { deathResolved: true, deathPaused: true, deathDelay: 0 });
  });

  html.find(".delay-dead-zero-wounds").on("click", async evt => {
    evt.preventDefault();
    if (!game.user.isGM) return;
    const { token } = await resolve();
    if (!token?.document) return;
    await updateZeroWTimer(token.document, { deathDelay: 1 });
  });

  html.find(".pause-dead-zero-wounds").on("click", async evt => {
    evt.preventDefault();
    if (!game.user.isGM) return;
    const { token } = await resolve();
    if (!token?.document) return;
    await updateZeroWTimer(token.document, { deathPaused: true, deathDelay: 0 });
  });

  html.find(".death-may-wait-zero-wounds").on("click", async evt => {
    evt.preventDefault();
    if (!game.user.isGM) return;
    const { token, actor } = await resolve();
    if (!actor || !token?.document) return;
    await deathMayWait(actor, token.document);
  });
});
