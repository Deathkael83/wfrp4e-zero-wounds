const MODULE_ID = "wfrp4e-zero-wounds-prone";
const LOCAL = MODULE_ID;

function getDisplayName(actor, tokenDoc) {
  return tokenDoc?.name ?? actor?.name ?? "Unknown";
}

async function resolveTokenDocument(actor) {
  const cvs = globalThis.canvas;
  const placeable = cvs?.tokens?.placeables?.find(t => t.actor === actor);
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
  if (!game.user.isGM) return;
  try {
    if (!game.settings.get(MODULE_ID, "enableModule")) return;

    const woundsBefore = actor?.system?.status?.wounds?.value;
    const woundsAfter = foundry.utils.getProperty(changes, "system.status.wounds.value");

    if (woundsBefore === undefined || woundsAfter === undefined) return;

    // dropped to 0 (or below)
    if (woundsBefore >= 1 && woundsAfter <= 0) {
      await onZeroWounds(actor);
    }

    // regained to >= 1
    if (woundsBefore <= 0 && woundsAfter >= 1) {
      await onRegainConscious(actor);
    }
  } catch (err) {
    console.error(`[${MODULE_ID}] preUpdateActor`, err);
  }
});


Hooks.on("updateActor", async (actor, changes) => {
  if (!game.user.isGM) return;
  try {
    if (!game.settings.get(MODULE_ID, "enableModule")) return;

    // If unconscious was added externally (manual or other automation), still warn.
    const touched = foundry.utils.getProperty(changes, "effects") !== undefined ||
                    foundry.utils.getProperty(changes, "system.conditions") !== undefined ||
                    foundry.utils.getProperty(changes, "flags.wfrp4e.conditions") !== undefined;
    if (!touched) return;

    if (!actor?.hasCondition?.("unconscious")) return;

    const tokenDoc = await resolveTokenDocument(actor);
    if (!tokenDoc) return;

    await maybeSendCritDeathWarning(actor, tokenDoc);
  } catch (err) {
    console.error(`[${MODULE_ID}] updateActor`, err);
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

  const recipients = isPC
    ? game.settings.get(MODULE_ID, "pcRecipientsMain")
    : game.settings.get(MODULE_ID, "npcRecipients");

  const whisper = getRecipients(actor, recipients);

  /* ------------------------------
   * PRONE (respect mode)
   * ------------------------------ */
  const proneMode = isPC
    ? game.settings.get(MODULE_ID, "pcProneMode")
    : game.settings.get(MODULE_ID, "npcProneMode");

  const proneNotify = isPC
    ? game.settings.get(MODULE_ID, "pcProneAutoNotify")
    : game.settings.get(MODULE_ID, "npcProneAutoNotify");

  if (proneMode === "chat") {
    await sendPronePrompt(actor, tokenDoc, whisper);
  } else if (proneMode === "auto") {
    await applyProne(actor);
    if (proneNotify) await sendProneAuto(actor, tokenDoc, whisper);
  } // disabled => do nothing

  // Start unconscious timer if configured (it will no-op if combat missing or mode disabled)
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
  const msg = game.i18n.format(`${LOCAL}.chat.pronePrompt`, { actorName: name });
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
  const msg = game.i18n.format(`${LOCAL}.chat.proneAuto`, { actorName: name });
  const tag = await makeConditionTagHTML("prone");
  await sendMessage(actor, tokenDoc, `<div><p>${msgAuto} ${tag}</p></div>`, whisper);
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
    await markLastUnconsciousApplied(tokenDoc);

    const notify = isPC
      ? game.settings.get(MODULE_ID, "pcUnconsciousAutoNotify")
      : game.settings.get(MODULE_ID, "npcUnconsciousAutoNotify");

    // Order matters: announce unconscious first, then (optionally) warn about crit-death risk.
    if (notify) await sendUnconsciousAuto(actor, tokenDoc, whisper, tb);

    await maybeSendCritDeathWarning(actor, tokenDoc);
  }
}

async function applyUnconscious(actor) {
  try {
    await actor.addCondition("unconscious");
  } catch (err) {
    console.error(`[${MODULE_ID}] applyUnconscious`, err);
  }
}

async function markLastUnconsciousApplied(tokenDoc) {
  try {
    const combatId = game.combat?.id ?? null;
    const round = game.combat?.round ?? null;
    if (!tokenDoc || !combatId || round === null) return;
    await tokenDoc.setFlag(MODULE_ID, "lastUnconsciousApplied", { combatId, round });
  } catch (err) {
    console.error(`[${MODULE_ID}] markLastUnconsciousApplied`, err);
  }
}

async function sendUnconsciousPrompt(actor, tokenDoc, whisper, tb) {
  const name = getDisplayName(actor, tokenDoc);
  const msg = game.i18n.format(`${LOCAL}.chat.unconsciousAuto`, { actorName: name, tb });
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
  const msg = game.i18n.format(`${LOCAL}.chat.unconsciousPrompt`, { actorName: name, tb });
  const tag = await makeConditionTagHTML("unconscious");
  await sendMessage(actor, tokenDoc, `<div><p>${msgAuto} ${tag}</p></div>`, whisper);
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
  const msg = game.i18n.format(`${LOCAL}.chat.wakeAuto`, { actorName: name });
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
  const msg = game.i18n.format(`${LOCAL}.chat.wakePrompt`, { actorName: name });
  const tag = await makeConditionTagHTML("unconscious");
  await sendMessage(actor, tokenDoc, `<div><p>${msgAuto} ${tag}</p></div>`, whisper);
}

/* --------------------------------------------- */
/* TIMER MORTE (DOPO PRIVO DI SENSI)             */
/* --------------------------------------------- */

function getGMRecipients() {
  return game.users.filter(u => u.isGM && u.active).map(u => u.id);
}

function getCriticalCount(actor) {
  // In WFRP4e, Critical Wounds are embedded Items shown in the "Critici" list.
  // Different system versions expose them differently; prefer itemTypes when available.
  const byType = actor?.itemTypes?.critical;
  if (Array.isArray(byType)) return byType.length;

  // Fallback: count embedded items whose type matches "critical" variants.
  const items = actor?.items?.contents ?? actor?.items ?? [];
  let count = 0;
  for (const it of items) {
    const t = (it?.type ?? "").toLowerCase();
    if (t === "critical" || t === "criticalwound" || t === "critical-wound" || t === "crit") count += 1;
  }
  return count;
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


function getCritWarnSettings(actor) {
  const isPC = actor.type === "character";
  return {
    isPC,
    enabled: game.settings.get(MODULE_ID, isPC ? "pcCritDeathWarnOnUnconscious" : "npcCritDeathWarnOnUnconscious"),
    recipients: game.settings.get(MODULE_ID, isPC ? "pcCritDeathWarnRecipients" : "npcCritDeathWarnRecipients")
  };
}

async function maybeSendCritDeathWarning(actor, tokenDoc) {
  try {
    if (!actor || !tokenDoc) return;

    const { enabled, recipients } = getCritWarnSettings(actor);
    if (!enabled) return;

    const tb = actor.system?.characteristics?.t?.bonus ?? 0;
    const wounds = actor.system?.status?.wounds?.value ?? 0;

    if (tb <= 0) return;
    if (wounds > 0) return;
    if (!actor.hasCondition?.("unconscious")) return;
    if (actor.hasCondition?.("dead")) return;

    const critCount = getCriticalCount(actor);
    if (critCount <= tb) return;

    // spam guard: once per combat round per token
    const combatId = game.combat?.id ?? null;
    const round = game.combat?.round ?? 0;
    const guardKey = combatId ? `warn:${combatId}:${round}:${tokenDoc.id}` : null;

    if (guardKey) {
      const cur = (await tokenDoc.getFlag(MODULE_ID, "critDeathWarnKey")) ?? null;
      if (cur === guardKey) return;
      await tokenDoc.setFlag(MODULE_ID, "critDeathWarnKey", guardKey);
    }

    const whisper = getRecipients(actor, recipients);
    const name = getDisplayName(actor, tokenDoc);
    const msg = game.i18n.format(`${LOCAL}.chat.deathCritWarn`, { actorName: name, critCount, tb });

    await sendMessage(actor, tokenDoc, `<div class="zwp-message"><p>${msg}</p></div>`, whisper);
  } catch (err) {
    console.error(`[${MODULE_ID}] maybeSendCritDeathWarning`, err);
  }
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
    await sendPublicPCDeathAnnouncement(actor, tokenDoc, "applied");

    if (notify) {
      await sendMessage(actor, tokenDoc, `<div><p>${msgAuto} ${tag}</p></div>`, whisper);
    }
    return;
  }

  await sendDeathPrompt(actor, tokenDoc, whisper, msgPrompt, tag, allowMayWait);
}

async function onDeathCritThreshold(actor, tokenDoc, tb, critCount) {
  const { mode, notify, allowMayWait } = getDeathSettings(actor);
  if (mode === "disabled") return;

  const whisper = getGMRecipients();
  const name = getDisplayName(actor, tokenDoc);
  const msgPrompt = game.i18n.format(`${LOCAL}.chat.deathCrit`, { actorName: name, critCount, tb });
  const msgAuto = game.i18n.format(`${LOCAL}.chat.deathCritAuto`, { actorName: name, critCount, tb });
  const tag = await makeConditionTagHTML("dead");

  if (mode === "auto") {
    await applyDead(actor);
    await updateZeroWTimer(tokenDoc, { deathResolved: true, deathPaused: true, deathDelay: 0 });
    await sendPublicPCDeathAnnouncement(actor, tokenDoc, "applied");
    if (notify) {
      await sendMessage(actor, tokenDoc, `<div><p>${msgAuto} ${tag}</p></div>`, whisper);
    }
    return;
  }

  await sendDeathPrompt(actor, tokenDoc, whisper, msgPrompt, tag, allowMayWait);
}

async function sendDeathPrompt(actor, tokenDoc, whisper, msg, tag, allowMayWait) {
  const tokenUuid = tokenDoc?.uuid ?? "";
  const actorUuid = actor?.uuid ?? "";

  const btnApply = game.i18n.localize(`${LOCAL}.chat.deathApply`);
  const btnPause = game.i18n.localize(`${LOCAL}.chat.deathPause`);
  const btnMayWait = game.i18n.localize(`${LOCAL}.chat.deathMayWait`);
  const waitNext = game.i18n.localize(`${LOCAL}.chat.deathWaitNextRound`);

  const mayWaitBtn = allowMayWait
    ? `<a class="zwp-button death-may-wait-zero-wounds" data-token-uuid="${tokenUuid}" data-actor-uuid="${actorUuid}">${btnMayWait}</a>`
    : "";

  const html = `
  <div class="zwp-message">
    <p>${msg} ${tag}</p>
    <div class="zwp-buttons">
      <a class="zwp-button apply-dead-zero-wounds" data-token-uuid="${tokenUuid}" data-actor-uuid="${actorUuid}">${btnApply}</a>
      ${mayWaitBtn}
      <a class="zwp-button pause-dead-zero-wounds" data-token-uuid="${tokenUuid}" data-actor-uuid="${actorUuid}">${btnPause}</a>
    </div>
    <div class="zwp-note">${waitNext}</div>
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
    await sendPublicPCDeathAnnouncement(actor, tokenDoc, "mayWait");
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
  if (!game.user.isGM) return;
  try {
    if (!game.settings.get(MODULE_ID, "enableModule")) return;
    if (changed.round === undefined) return;

    for (const c of combat.combatants) {
    const actor = c.actor;
    const tokenDoc = c.token;
    if (!actor || !tokenDoc) continue;

    const tb = actor.system.characteristics.t.bonus;
    const wounds = actor.system.status.wounds.value;

    // ----------------------------
    // ZERO-WOUND TIMER (Prone/Unconscious workflow)
    // ----------------------------
    const info = await tokenDoc.getFlag(MODULE_ID, "zeroWTimer");
    if (info && info.combatId === combat.id) {
      const delta = combat.round - info.round;

      // stop tracking if healed or invalid TB
      if (wounds >= 1 || tb <= 0) {
        await tokenDoc.unsetFlag(MODULE_ID, "zeroWTimer");
      } else {
        // Unconscious at TB rounds (only once)
        if (!info.unconsciousApplied && delta >= tb) {
          await onUnconscious(actor, tokenDoc, tb);
          await updateZeroWTimer(tokenDoc, { unconsciousApplied: true, unconsciousAppliedRound: combat.round });
        }

        // Remove unconscious prompt when healed above 0
        if (info.unconsciousApplied && wounds >= 1) {
          await onWakeUp(actor, tokenDoc);
          await tokenDoc.unsetFlag(MODULE_ID, "zeroWTimer");
        }
      }
    }

    // ----------------------------
    // DEATH BY CRITICALS (end of round check)
    // This must work even if the token never got a zeroWTimer flag (e.g. actor set to 0 manually).
    // ----------------------------
    if (tb <= 0) continue;

    // Only when at 0 wounds and unconscious
    if (wounds > 0) {
      // clear spam guard when not eligible
      const di = await tokenDoc.getFlag(MODULE_ID, "zeroWTimer");
      if (di?.deathCritPromptRound) {
        await updateZeroWTimer(tokenDoc, { deathCritPromptRound: 0 });
      }
      continue;
    }

    const isUnconscious = actor.hasCondition?.("unconscious");
    if (!isUnconscious) continue;

    // If unconscious was applied this same round, only warn; do not trigger death prompt until the next round.
    const lastUnc = await tokenDoc.getFlag(MODULE_ID, "lastUnconsciousApplied");
    if (lastUnc?.combatId === combat.id && lastUnc?.round === combat.round) continue;

    const zwInfo = await tokenDoc.getFlag(MODULE_ID, "zeroWTimer");
    if (zwInfo?.combatId === combat.id && zwInfo?.unconsciousAppliedRound === combat.round) continue;


    const critCount = getCriticalCount(actor);
    if (critCount <= tb) {
      // not over threshold, clear spam guard
      const di = await tokenDoc.getFlag(MODULE_ID, "zeroWTimer");
      if (di?.deathCritPromptRound) {
        await updateZeroWTimer(tokenDoc, { deathCritPromptRound: 0 });
      }
      continue;
    }

    const deathInfo = await tokenDoc.getFlag(MODULE_ID, "zeroWTimer") || {};
    if (deathInfo.deathPaused || deathInfo.deathResolved) continue;

    // Avoid re-posting multiple times in the same round
    if (deathInfo.deathCritPromptRound === combat.round) continue;
    await updateZeroWTimer(tokenDoc, { deathCritPromptRound: combat.round });

      await onDeathCritThreshold(actor, tokenDoc, tb, critCount);
    }
  } catch (err) {
    console.error(`[${MODULE_ID}] updateCombat`, err);
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



async function sendPublicPCDeathAnnouncement(actor, tokenDoc, kind) {
  try {
    if (!actor || actor.type !== "character") return;
    if (!game.settings.get(MODULE_ID, "pcDeathPublicMessage")) return;

    const name = getDisplayName(actor, tokenDoc);
    const key = kind === "mayWait" ? `${LOCAL}.chat.publicDeathMayWait` : `${LOCAL}.chat.publicDeathApplied`;
    const msg = game.i18n.format(key, { actorName: name });

    const speaker = ChatMessage.getSpeaker({ token: tokenDoc, actor });
    await ChatMessage.create({
      user: game.user.id,
      speaker,
      content: `<div class="zwp-public"><p>${msg}</p></div>`,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER
    });
  } catch (err) {
    console.error(`[${MODULE_ID}] sendPublicPCDeathAnnouncement`, err);
  }
}


/* --------------------------------------------- */
/* CHAT BUTTON HANDLERS                          */
/* --------------------------------------------- */

Hooks.on("renderChatMessage", async (message, html) => {
  try {
    const jq = globalThis.jQuery;
    const $ = globalThis.$;
    const $html = (jq && html instanceof jq) ? html : ($ ? $(html) : null);
    if (!$html) return;

    const flags = message.flags?.[MODULE_ID];
    if (!flags) return;

  const { actorUuid, tokenUuid } = flags;

  async function resolve() {
    const token = tokenUuid ? await fromUuid(tokenUuid) : null;
    const actor = token?.actor ?? (await fromUuid(actorUuid));
    return { token, actor };
  }

  // Delegate handlers so they survive re-renders, and work whether `html` is jQuery or an HTMLElement.
  $html.off("click.zwp");

    $html.on("click.zwp", ".apply-prone-zero-wounds", async evt => {
    evt.preventDefault();
    const { actor } = await resolve();
    if (actor) await applyProne(actor);
  });

  $html.on("click.zwp", ".apply-unconscious-zero-wounds", async evt => {
    evt.preventDefault();
    const { token, actor } = await resolve();
    if (actor) await applyUnconscious(actor);
    if (token) await markLastUnconsciousApplied(token);
    if (actor && token) await maybeSendCritDeathWarning(actor, token);
  });

  $html.on("click.zwp", ".remove-unconscious-zero-wounds", async evt => {
    evt.preventDefault();
    const { actor } = await resolve();
    if (actor) await removeUnconscious(actor);
  });

  /* ------------------------------ */
  /* DEATH (GM ONLY)                */
  /* ------------------------------ */

    $html.on("click.zwp", ".apply-dead-zero-wounds", async evt => {
    evt.preventDefault();
    if (!game.user.isGM) return;
    const { token, actor } = await resolve();
    if (!actor || !token) return;
    await applyDead(actor);
    await updateZeroWTimer(token, { deathResolved: true, deathPaused: true, deathDelay: 0 });
    await sendPublicPCDeathAnnouncement(actor, token, "applied");
  });

    $html.on("click.zwp", ".pause-dead-zero-wounds", async evt => {
    evt.preventDefault();
    if (!game.user.isGM) return;
    const { token, actor } = await resolve();
    if (!token || !actor) return;

    await updateZeroWTimer(token, { deathResolved: true, deathPaused: true, deathDelay: 0 });

    // GM-only confirmation to avoid silent no-op
    const name = getDisplayName(actor, token);
    const msg = game.i18n.format(`${LOCAL}.chat.deathAvoided`, { actorName: name });
    await sendMessage(actor, token, `<div class="zwp-message"><p>${msg}</p></div>`, getGMRecipients());
  });

  $html.on("click.zwp", ".death-may-wait-zero-wounds", async evt => {
    evt.preventDefault();
    if (!game.user.isGM) return;
    const { token, actor } = await resolve();
    if (!actor || !token) return;
    await deathMayWait(actor, token);
  });
  } catch (err) {
    console.error(`[${MODULE_ID}] renderChatMessage`, err);
  }
});