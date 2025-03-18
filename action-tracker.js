// Action Tracker Module for Foundry VTT v12, D&D 5e v4+
// March 14, 2025 (updated with debug setting fix)

Hooks.once("init", () => {
  console.log("Action Tracker | Initializing for Foundry v12, D&D 5e v4+");

  game.settings.register("action-tracker", "resetTiming", {
    name: game.i18n.localize("ACTION-TRACKER.ResetTiming"),
    hint: game.i18n.localize("ACTION-TRACKER.ResetTimingHint"),
    scope: "world",
    config: true,
    type: String,
    choices: {
      "turnStart": "Start of Turn",
      "turnEnd": "End of Turn",
      "roundEnd": "End of Round"
    },
    default: "turnStart"
  });

  game.settings.register("action-tracker", "iconCount", {
    name: game.i18n.localize("ACTION-TRACKER.IconCount"),
    hint: game.i18n.localize("ACTION-TRACKER.IconCountHint"),
    scope: "world",
    config: true,
    type: Number,
    range: { min: 2, max: 5, step: 1 },
    default: 3,
    onChange: value => {
      canvas.tokens.placeables.forEach(token => {
        const flags = {};
        for (let i = 0; i < value; i++) {
          flags[`action${i}`] = { used: false };
        }
        token.document.update({ flags: { "action-tracker": flags } });
      });
    }
  });

  game.settings.register("action-tracker", "removeColorWhenUsed", {
    name: game.i18n.localize("ACTION-TRACKER.RemoveColorWhenUsed"),
    hint: game.i18n.localize("ACTION-TRACKER.RemoveColorWhenUsedHint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => {
      if (game.combat && ui.combat) ui.combat.render(true);
      if (ui.controls.hud?.token) ui.controls.hud.token.render(true);
    }
  });

  game.settings.register("action-tracker", "enableSounds", {
    name: game.i18n.localize("ACTION-TRACKER.EnableSounds"),
    hint: game.i18n.localize("ACTION-TRACKER.EnableSoundsHint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register("action-tracker", "showTrackerIcons", {
    name: game.i18n.localize("ACTION-TRACKER.ShowTrackerIcons"),
    hint: game.i18n.localize("ACTION-TRACKER.ShowTrackerIconsHint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => {
      if (game.combat && ui.combat) ui.combat.render(true);
    }
  });

  game.settings.register("action-tracker", "debug", {
    name: game.i18n.localize("ACTION-TRACKER.Debug"),
    hint: game.i18n.localize("ACTION-TRACKER.DebugHint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false // Off by default for production
  });

  const defaultIcons = [
    { image: "icons/svg/combat.svg", sound: "sounds/doors/wood/lock.ogg", text: "Action", tint: "#ff0000" },
    { image: "icons/svg/upgrade.svg", sound: "sounds/doors/wood/lock.ogg", text: "Bonus Action", tint: "#00ff00" },
    { image: "icons/svg/lightning.svg", sound: "sounds/doors/wood/lock.ogg", text: "Reaction", tint: "#fff700" },
    { image: "icons/svg/wing.svg", sound: "sounds/doors/wood/lock.ogg", text: "Move", tint: "#00b3ff" },
    { image: "icons/svg/acid.svg", sound: "sounds/doors/wood/lock.ogg", text: "Interact", tint: "#ff00ff" }
  ];

  for (let i = 0; i < 5; i++) {
    const def = defaultIcons[i] || { image: "icons/svg/mystery-man.svg", sound: "sounds/doors/wood/lock.ogg", text: `Action ${i + 1}`, tint: "#ffffff" };
    
    game.settings.register("action-tracker", `icon${i}Image`, {
      name: game.i18n.localize(`ACTION-TRACKER.Icon${i}Image`),
      hint: game.i18n.localize(`ACTION-TRACKER.Icon${i}ImageHint`),
      scope: "world",
      config: true,
      type: String,
      default: def.image,
      filePicker: "image"
    });

    game.settings.register("action-tracker", `icon${i}Sound`, {
      name: game.i18n.localize(`ACTION-TRACKER.Icon${i}Sound`),
      hint: game.i18n.localize(`ACTION-TRACKER.Icon${i}SoundHint`),
      scope: "world",
      config: true,
      type: String,
      default: def.sound,
      filePicker: "audio"
    });

    game.settings.register("action-tracker", `icon${i}Text`, {
      name: game.i18n.localize(`ACTION-TRACKER.Icon${i}Text`),
      hint: game.i18n.localize(`ACTION-TRACKER.Icon${i}TextHint`),
      scope: "world",
      config: true,
      type: String,
      default: def.text
    });

    game.settings.register("action-tracker", `icon${i}Tint`, {
      name: game.i18n.localize(`ACTION-TRACKER.Icon${i}Tint`),
      hint: game.i18n.localize(`ACTION-TRACKER.Icon${i}TintHint`),
      scope: "world",
      config: true,
      type: String,
      default: def.tint,
      onChange: () => {
        if (game.combat && ui.combat) ui.combat.render(true);
        if (ui.controls.hud?.token) ui.controls.hud.token.render(true);
      }
    });
  }

  Hooks.on("renderSettingsConfig", (app, html, data) => {
    const separators = [
      { before: "action-tracker.icon0Image", title: game.i18n.localize("ACTION-TRACKER.Icon1Settings") },
      { before: "action-tracker.icon1Image", title: game.i18n.localize("ACTION-TRACKER.Icon2Settings") },
      { before: "action-tracker.icon2Image", title: game.i18n.localize("ACTION-TRACKER.Icon3Settings") },
      { before: "action-tracker.icon3Image", title: game.i18n.localize("ACTION-TRACKER.Icon4Settings") },
      { before: "action-tracker.icon4Image", title: game.i18n.localize("ACTION-TRACKER.Icon5Settings") }
    ];

    separators.forEach(sep => {
      const setting = html.find(`[name="${sep.before}"]`).closest(".form-group");
      if (setting.length) {
        setting.before(`<h2 style="border-bottom: 1px solid #999; margin: 10px 0; padding-bottom: 5px;">${sep.title}</h2>`);
      }
    });

    for (let i = 0; i < 5; i++) {
      const tintInput = html.find(`[name="action-tracker.icon${i}Tint"]`);
      if (tintInput.length) {
        const value = game.settings.get("action-tracker", `icon${i}Tint`);
        tintInput.replaceWith(`
          <color-picker name="action-tracker.icon${i}Tint" value="${value}">
            <input type="text" placeholder="">
            <input type="color">
          </color-picker>
        `);
      }
    }
  });

  Hooks.once("ready", () => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "modules/action-tracker/action-tracker.css";
    document.head.appendChild(link);
    if (game.settings.get("action-tracker", "debug")) {
      console.log("Action Tracker | CSS forced load");
    }
  });
});

// SVG caching for performance
const svgCache = new Map();
async function getSvgElement(image, tint, used, removeColor, size = "20px") {
  if (!svgCache.has(image)) {
    try {
      const response = await fetch(image);
      if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
      const svgText = await response.text();
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
      svgCache.set(image, svgDoc.documentElement.cloneNode(true));
    } catch (e) {
      if (game.settings.get("action-tracker", "debug")) {
        console.warn(`Action Tracker | Failed to load SVG (${image}) - using fallback`, e);
      }
      const fallback = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      fallback.innerHTML = `<rect width="16" height="16" fill="${tint}" />`;
      svgCache.set(image, fallback);
    }
  }
  const svg = svgCache.get(image).cloneNode(true);
  svg.setAttribute("width", size);
  svg.setAttribute("height", size);
  svg.classList.toggle("used", used);
  svg.style.borderColor = used && removeColor ? "#ffffff" : tint;
  svg.querySelectorAll("path, circle, rect").forEach(el => {
    el.setAttribute("fill", used && removeColor ? "#ffffff" : tint);
  });
  return svg;
}

Hooks.on("preCreateToken", (tokenDoc, data, options, userId) => {
  const iconCount = game.settings.get("action-tracker", "iconCount");
  const flags = {};
  for (let i = 0; i < iconCount; i++) {
    flags[`action${i}`] = { used: false };
  }
  tokenDoc.updateSource({ flags: { "action-tracker": flags } });
});

Hooks.on('updateToken', (tokenDoc, updates) => {
  if (updates.flags?.['action-tracker'] && game.combat && ui.combat) {
    ui.combat.render(true);
    if (ui.controls.hud?.token?.object?.document === tokenDoc) {
      ui.controls.hud.token.render(true);
    }
  }
});

Hooks.on("renderTokenHUD", async (hud, html, data) => {
  const token = hud.object;
  if (game.settings.get("action-tracker", "debug")) {
    console.log(`Action Tracker | Rendering HUD for ${token.name}`);
  }

  const inCombat = game.combat?.combatants.some(c => c.tokenId === token.id);
  if (!inCombat) {
    if (game.settings.get("action-tracker", "debug")) {
      console.log(`Action Tracker | ${token.name} not in combat - skipping icons`);
    }
    return;
  }

  const actionBar = document.createElement("div");
  actionBar.className = "action-tracker";

  const iconCount = game.settings.get("action-tracker", "iconCount");
  const enableSounds = game.settings.get("action-tracker", "enableSounds");
  const removeColor = game.settings.get("action-tracker", "removeColorWhenUsed");

  for (let i = 0; i < iconCount; i++) {
    const image = game.settings.get("action-tracker", `icon${i}Image`);
    const text = game.settings.get("action-tracker", `icon${i}Text`);
    const sound = game.settings.get("action-tracker", `icon${i}Sound`);
    let tint = game.settings.get("action-tracker", `icon${i}Tint`);
    const used = token.document.getFlag("action-tracker", `action${i}`)?.used || false;

    if (!tint.match(/^#[0-9A-Fa-f]{6}$/)) tint = "#ffffff";

    const dotWrapper = document.createElement("div");
    dotWrapper.className = "action-dot-wrapper";

    const svgElement = await getSvgElement(image, tint, used, removeColor);

    const tooltip = document.createElement("span");
    tooltip.className = "action-tooltip";
    tooltip.textContent = text;
    dotWrapper.appendChild(svgElement);
    dotWrapper.appendChild(tooltip);

    dotWrapper.addEventListener("click", async (event) => {
      event.stopPropagation();
      event.preventDefault();
      if (game.settings.get("action-tracker", "debug")) {
        console.log(`Action Tracker | Clicked HUD dot ${i} for ${token.name}`);
      }
      const newState = !used;
      await token.document.setFlag("action-tracker", `action${i}.used`, newState);
      svgElement.classList.toggle("used", newState);
      if (removeColor) {
        const newColor = newState ? "#ffffff" : tint;
        svgElement.querySelectorAll("path, circle, rect").forEach(el => {
          el.setAttribute("fill", newColor);
        });
        svgElement.style.borderColor = newColor;
      }
      if (enableSounds) AudioHelper.play({ src: sound, volume: 0.5 });
      if (game.combat && ui.combat) ui.combat.render(true);
      if (ui.controls.hud?.token?.object === token) ui.controls.hud.token.render(true);
    });

    dotWrapper.addEventListener("mouseover", () => {
      svgElement.style.transform = "scale(1.2)";
    });
    dotWrapper.addEventListener("mouseout", () => {
      svgElement.style.transform = "scale(1)";
    });

    actionBar.appendChild(dotWrapper);
  }

  const middleCol = html.find(".col.middle")[0];
  if (middleCol) {
    middleCol.prepend(actionBar);
    if (game.settings.get("action-tracker", "debug")) {
      console.log(`Action Tracker | Action bar prepended to middle column`);
    }
  } else {
    if (game.settings.get("action-tracker", "debug")) {
      console.warn(`Action Tracker | Middle column not found, appending to root`);
    }
    html[0].prepend(actionBar);
  }
});

function getIconState(combatant, actionIndex) {
  let tokenDoc;
  if (combatant.token) {
    tokenDoc = combatant.token;
  } else {
    const token = canvas.tokens.get(combatant.tokenId);
    tokenDoc = token?.document;
  }
  if (!tokenDoc) {
    if (game.settings.get("action-tracker", "debug")) {
      console.warn(`Action Tracker | No token document for combatant ${combatant.id || combatant.name || 'unknown'}`);
    }
    return { used: false };
  }
  return tokenDoc.getFlag("action-tracker", `action${actionIndex}`) || { used: false };
}

Hooks.on("renderCombatTracker", async (tracker, html, data) => {
  if (game.settings.get("action-tracker", "debug")) {
    console.log("Action Tracker | Rendering Combat Tracker");
  }

  if (!data?.combat) {
    if (game.settings.get("action-tracker", "debug")) {
      console.log("Action Tracker | No active combat - skipping tracker icons");
    }
    return;
  }

  const showTrackerIcons = game.settings.get("action-tracker", "showTrackerIcons");
  if (!showTrackerIcons) {
    if (game.settings.get("action-tracker", "debug")) {
      console.log("Action Tracker | Tracker icons disabled in settings - skipping");
    }
    return;
  }

  const iconCount = game.settings.get("action-tracker", "iconCount");
  const removeColor = game.settings.get("action-tracker", "removeColorWhenUsed");
  const enableSounds = game.settings.get("action-tracker", "enableSounds");

  for (const combatant of data.combat.combatants) {
    if (!combatant?.tokenId) {
      if (game.settings.get("action-tracker", "debug")) {
        console.warn(`Action Tracker | Combatant ${combatant?.name || 'unknown'} has no tokenId - skipping`);
      }
      continue;
    }

    const combatantLi = html.find(`li.combatant[data-combatant-id="${combatant.id}"]`);
    if (!combatantLi.length) {
      if (game.settings.get("action-tracker", "debug")) {
        console.warn(`Action Tracker | No LI found for combatant ${combatant.id}`);
      }
      continue;
    }

    const nameElement = combatantLi.find(".token-name");
    if (!nameElement.length) {
      if (game.settings.get("action-tracker", "debug")) {
        console.warn(`Action Tracker | No .token-name found for combatant ${combatant.id}`);
      }
      continue;
    }

    const existingIconBar = combatantLi.find(".action-tracker-icons");
    if (existingIconBar.length) existingIconBar.remove();

    const iconBar = document.createElement("div");
    iconBar.className = "action-tracker-icons";

    for (let i = 0; i < iconCount; i++) {
      const image = game.settings.get("action-tracker", `icon${i}Image`);
      const text = game.settings.get("action-tracker", `icon${i}Text`);
      const sound = game.settings.get("action-tracker", `icon${i}Sound`);
      let tint = game.settings.get("action-tracker", `icon${i}Tint`);
      const { used } = getIconState(combatant, i);

      if (!tint.match(/^#[0-9A-Fa-f]{6}$/)) tint = "#ffffff";

      const svgElement = await getSvgElement(image, tint, used, removeColor, "16px");

      const wrapper = document.createElement("div");
      wrapper.className = "action-dot-wrapper-tracker";
      wrapper.style.cursor = "pointer";
      wrapper.setAttribute("data-tooltip", text);
      wrapper.appendChild(svgElement);

      wrapper.addEventListener("click", async (event) => {
        event.stopPropagation();
        event.preventDefault();
        const tokenDoc = combatant.token || canvas.tokens.get(combatant.tokenId)?.document;
        if (!tokenDoc) {
          if (game.settings.get("action-tracker", "debug")) {
            console.warn(`Action Tracker | No token document for ${combatant.name || combatant.id} on click`);
          }
          return;
        }
        if (game.settings.get("action-tracker", "debug")) {
          console.log(`Action Tracker | Clicked tracker dot ${i} for ${tokenDoc.name}`);
        }
        const newState = !used;
        await tokenDoc.setFlag("action-tracker", `action${i}.used`, newState);
        svgElement.classList.toggle("used", newState);
        if (removeColor) {
          const newColor = newState ? "#ffffff" : tint;
          svgElement.querySelectorAll("path, circle, rect").forEach(el => {
            el.setAttribute("fill", newColor);
          });
          svgElement.style.borderColor = newColor;
        }
        if (enableSounds) AudioHelper.play({ src: sound, volume: 0.5 });
        if (game.combat && ui.combat) ui.combat.render(true);
      });

      iconBar.appendChild(wrapper);
    }

    nameElement.after(iconBar);
  }
});

Hooks.on("updateCombat", (combat, update, options, userId) => {
  const resetTiming = game.settings.get("action-tracker", "resetTiming");
  const currentToken = combat.combatant?.token?.object;

  if (game.settings.get("action-tracker", "debug")) {
    console.log(`Action Tracker | updateCombat: turn: ${update.turn}, round: ${update.round}, currentToken: ${currentToken?.name || 'none'}`);
  }

  if (!currentToken || !currentToken.document) {
    if (game.settings.get("action-tracker", "debug")) {
      console.warn("Action Tracker | No valid current token for reset");
    }
    return;
  }

  if (resetTiming === "turnStart" && update.turn !== undefined) {
    resetActions(currentToken);
  } else if (resetTiming === "turnEnd" && update.turn !== undefined && combat.previous.turn !== undefined) {
    const previousToken = combat.previous.token?.object;
    if (previousToken && previousToken.document) resetActions(previousToken);
    else if (game.settings.get("action-tracker", "debug")) {
      console.warn("Action Tracker | No valid previous token for turnEnd reset");
    }
  } else if (resetTiming === "roundEnd" && update.round !== undefined && update.turn === 0) {
    combat.combatants.forEach(c => {
      const token = c.token?.object;
      if (token && token.document) resetActions(token);
      else if (game.settings.get("action-tracker", "debug")) {
        console.warn(`Action Tracker | Invalid token in combatant: ${c.name}`);
      }
    });
  }
});

Hooks.on("deleteCombat", (combat, options, userId) => {
  if (game.settings.get("action-tracker", "debug")) {
    console.log("Action Tracker | Combat ended - resetting all icons");
  }
  combat.combatants.forEach(c => {
    const token = canvas.tokens.get(c.tokenId);
    if (token && token.document) resetActions(token);
    else if (game.settings.get("action-tracker", "debug")) {
      console.warn(`Action Tracker | No token found for combatant ${c.name} on combat end`);
    }
  });
});

function resetActions(token) {
  const iconCount = game.settings.get("action-tracker", "iconCount");
  const flags = {};
  for (let i = 0; i < iconCount; i++) {
    flags[`action${i}`] = { used: false };
  }
  token.document.update({ flags: { "action-tracker": flags } });
  if (game.settings.get("action-tracker", "debug")) {
    console.log(`Action Tracker | Reset icons for ${token.name}`);
  }
  if (game.combat && ui.combat) ui.combat.render(true);
  if (ui.controls.hud?.token?.object === token) ui.controls.hud.token.render(true);
}

function hueFromHex(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h;
  if (max === min) h = 0;
  else if (max === r) h = (60 * ((g - b) / (max - min)) + 360) % 360;
  else if (max === g) h = 60 * ((b - r) / (max - min)) + 120;
  else h = 60 * ((r - g) / (max - min)) + 240;
  return h;
}