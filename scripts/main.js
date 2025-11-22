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

// Recupera TokenDocument affidabile
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
  if (game.combat) {
    const c = game.combat.combatants.find(x => x.actor?.id === actor.id && x.token);
    if (c?.token) return c.token;
  }
  const tokens = actor.getActiveTokens(true, true);
  if (tokens.length) return tokens[0].document ?? tokens[0];
  return null;
}

// Destinatari chat
function getRecipients(actor, mode) {
  if (mode === "everyone") return undefined;
  const gmUsers = ChatMessage.getWhisperRecipients("GM");
  const
