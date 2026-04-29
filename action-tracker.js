// Action Tracker Module for Foundry VTT v14, D&D 5e v4+

const ACTION_TRACKER_DEFAULT_ICONS = [
  { image: "icons/svg/combat.svg", sound: "sounds/doors/wood/lock.ogg", text: "Action", tint: "#ff0000" },
  { image: "icons/svg/upgrade.svg", sound: "sounds/doors/wood/lock.ogg", text: "Bonus Action", tint: "#00ff00" },
  { image: "icons/svg/lightning.svg", sound: "sounds/doors/wood/lock.ogg", text: "Reaction", tint: "#fff700" },
  { image: "icons/svg/wing.svg", sound: "sounds/doors/wood/lock.ogg", text: "Move", tint: "#00b3ff" },
  { image: "icons/svg/acid.svg", sound: "sounds/doors/wood/lock.ogg", text: "Interact", tint: "#ff00ff" }
];

function getDefaultIconDefinition(index) {
  return ACTION_TRACKER_DEFAULT_ICONS[index] || {
    image: "icons/svg/mystery-man.svg",
    sound: "sounds/doors/wood/lock.ogg",
    text: `Action ${index + 1}`,
    tint: "#ffffff"
  };
}

function getDefaultIconTint(index) {
  return getDefaultIconDefinition(index).tint;
}

function areAllIconTintsBlack() {
  return ACTION_TRACKER_DEFAULT_ICONS.every((_, i) => game.settings.get("action-tracker", `icon${i}Tint`) === "#000000");
}

function getIconTint(index) {
  const fallback = getDefaultIconTint(index);
  const value = game.settings.get("action-tracker", `icon${index}Tint`);
  return areAllIconTintsBlack() ? fallback : normalizeHexColor(value, fallback);
}

function getHookRoot(html) {
  return html instanceof HTMLElement ? html : html?.[0] ?? null;
}

function normalizeResetTiming(value) {
  return value === "roundEnd" ? "roundEnd" : "turnStart";
}

function getActionTrackerSettingsExport() {
  return {
    module: "action-tracker",
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    settings: {
      resetTiming: normalizeResetTiming(game.settings.get("action-tracker", "resetTiming")),
      iconCount: game.settings.get("action-tracker", "iconCount"),
      removeColorWhenUsed: game.settings.get("action-tracker", "removeColorWhenUsed"),
      enableSounds: game.settings.get("action-tracker", "enableSounds"),
      showTrackerIcons: game.settings.get("action-tracker", "showTrackerIcons"),
      debug: game.settings.get("action-tracker", "debug"),
      icons: ACTION_TRACKER_DEFAULT_ICONS.map((_, i) => ({
        image: game.settings.get("action-tracker", `icon${i}Image`),
        sound: game.settings.get("action-tracker", `icon${i}Sound`),
        text: game.settings.get("action-tracker", `icon${i}Text`),
        tint: getIconTint(i)
      }))
    }
  };
}

function downloadActionTrackerSettings() {
  const data = getActionTrackerSettingsExport();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `action-tracker-settings-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  ui.notifications.info(game.i18n.localize("ACTION-TRACKER.ExportSuccess"));
}

function validateImportedActionTrackerSettings(data) {
  if (!data || data.module !== "action-tracker" || typeof data.settings !== "object") {
    throw new Error(game.i18n.localize("ACTION-TRACKER.ImportInvalidFile"));
  }

  const settings = data.settings;
  const normalized = {};

  if (typeof settings.resetTiming === "string") normalized.resetTiming = normalizeResetTiming(settings.resetTiming);
  if (Number.isInteger(settings.iconCount) && settings.iconCount >= 2 && settings.iconCount <= 5) {
    normalized.iconCount = settings.iconCount;
  }

  for (const key of ["removeColorWhenUsed", "enableSounds", "showTrackerIcons", "debug"]) {
    if (typeof settings[key] === "boolean") normalized[key] = settings[key];
  }

  if (!Array.isArray(settings.icons)) {
    throw new Error(game.i18n.localize("ACTION-TRACKER.ImportInvalidIcons"));
  }

  normalized.icons = settings.icons.slice(0, ACTION_TRACKER_DEFAULT_ICONS.length).map((icon, i) => {
    if (!icon || typeof icon !== "object") {
      throw new Error(game.i18n.format("ACTION-TRACKER.ImportInvalidIcon", { index: i + 1 }));
    }

    const fallback = getDefaultIconDefinition(i);
    return {
      image: typeof icon.image === "string" ? icon.image : fallback.image,
      sound: typeof icon.sound === "string" ? icon.sound : fallback.sound,
      text: typeof icon.text === "string" ? icon.text : fallback.text,
      tint: normalizeHexColor(icon.tint, fallback.tint)
    };
  });

  return normalized;
}

async function importActionTrackerSettings(data) {
  const settings = validateImportedActionTrackerSettings(data);

  for (const [key, value] of Object.entries(settings)) {
    if (key === "icons") continue;
    await game.settings.set("action-tracker", key, value);
  }

  for (let i = 0; i < settings.icons.length; i++) {
    const icon = settings.icons[i];
    await game.settings.set("action-tracker", `icon${i}Image`, icon.image);
    await game.settings.set("action-tracker", `icon${i}Sound`, icon.sound);
    await game.settings.set("action-tracker", `icon${i}Text`, icon.text);
    await game.settings.set("action-tracker", `icon${i}Tint`, icon.tint);
  }

  ui.notifications.info(game.i18n.localize("ACTION-TRACKER.ImportSuccess"));
}

function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      try {
        resolve(JSON.parse(reader.result));
      } catch (e) {
        reject(e);
      }
    });
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsText(file);
  });
}

function addImportExportControls(app, root) {
  const firstSetting = root.querySelector(`[name="action-tracker.resetTiming"]`)?.closest(".form-group");
  if (!firstSetting || firstSetting.previousElementSibling?.classList?.contains("action-tracker-settings-tools")) return;

  const tools = document.createElement("div");
  tools.className = "action-tracker-settings-tools";

  const title = document.createElement("h2");
  title.textContent = game.i18n.localize("ACTION-TRACKER.ImportExportSettings");

  const actions = document.createElement("div");
  actions.className = "action-tracker-settings-tools-actions";

  const exportButton = document.createElement("button");
  exportButton.type = "button";
  exportButton.innerHTML = `<i class="fa-solid fa-file-export"></i> ${game.i18n.localize("ACTION-TRACKER.ExportSettings")}`;
  exportButton.addEventListener("click", () => downloadActionTrackerSettings());

  const importButton = document.createElement("button");
  importButton.type = "button";
  importButton.innerHTML = `<i class="fa-solid fa-file-import"></i> ${game.i18n.localize("ACTION-TRACKER.ImportSettings")}`;

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "application/json,.json";
  fileInput.hidden = true;
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    fileInput.value = "";
    if (!file) return;

    try {
      const data = await readJsonFile(file);
      await importActionTrackerSettings(data);
      app.render(true);
    } catch (e) {
      console.error("Action Tracker | Failed to import settings", e);
      ui.notifications.error(e.message || game.i18n.localize("ACTION-TRACKER.ImportFailed"));
    }
  });

  importButton.addEventListener("click", () => fileInput.click());

  actions.append(exportButton, importButton, fileInput);
  tools.append(title, actions);
  firstSetting.before(tools);
}

Hooks.once("init", () => {
  console.log("Action Tracker | Initializing for Foundry v14, D&D 5e v4+");

  game.settings.register("action-tracker", "resetTiming", {
    name: game.i18n.localize("ACTION-TRACKER.ResetTiming"),
    hint: game.i18n.localize("ACTION-TRACKER.ResetTimingHint"),
    scope: "world",
    config: true,
    type: String,
    choices: {
      "turnStart": "Start of Turn",
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
    onChange: async value => {
      const updates = canvas?.tokens?.placeables?.map(token => {
        const flags = {};
        for (let i = 0; i < value; i++) {
          flags[`action${i}`] = { used: false };
        }
        return token.document.update({ flags: { "action-tracker": flags } });
      }) ?? [];

      const results = await Promise.allSettled(updates);
      const failures = results.filter(result => result.status === "rejected");
      if (failures.length && game.settings.get("action-tracker", "debug")) {
        console.warn(`Action Tracker | Failed to update ${failures.length} token(s) after icon count change`, failures);
      }
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

  game.settings.register("action-tracker", "restoredDefaultTintsV14", {
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

  for (let i = 0; i < 5; i++) {
    const def = getDefaultIconDefinition(i);
    
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
    const root = getHookRoot(html);
    if (!root) return;

    addImportExportControls(app, root);

    const separators = [
      { before: "action-tracker.icon0Image", title: game.i18n.localize("ACTION-TRACKER.Icon1Settings") },
      { before: "action-tracker.icon1Image", title: game.i18n.localize("ACTION-TRACKER.Icon2Settings") },
      { before: "action-tracker.icon2Image", title: game.i18n.localize("ACTION-TRACKER.Icon3Settings") },
      { before: "action-tracker.icon3Image", title: game.i18n.localize("ACTION-TRACKER.Icon4Settings") },
      { before: "action-tracker.icon4Image", title: game.i18n.localize("ACTION-TRACKER.Icon5Settings") }
    ];

    separators.forEach(sep => {
      const setting = root.querySelector(`[name="${sep.before}"]`)?.closest(".form-group");
      if (setting && setting.previousElementSibling?.dataset?.actionTrackerSeparator !== sep.before) {
        const heading = document.createElement("h2");
        heading.dataset.actionTrackerSeparator = sep.before;
        heading.textContent = sep.title;
        heading.style.borderBottom = "1px solid #999";
        heading.style.margin = "10px 0";
        heading.style.paddingBottom = "5px";
        setting.before(heading);
      }
    });

    for (let i = 0; i < 5; i++) {
      const tintInput = root.querySelector(`[name="action-tracker.icon${i}Tint"]`);
      if (tintInput) {
        const value = getIconTint(i);
        const wrapper = document.createElement("div");
        wrapper.className = "action-tracker-color-setting";

        const colorInput = document.createElement("input");
        colorInput.type = "color";
        colorInput.value = value;
        colorInput.setAttribute("aria-label", game.i18n.localize(`ACTION-TRACKER.Icon${i}Tint`));

        const textInput = document.createElement("input");
        textInput.type = "text";
        textInput.name = `action-tracker.icon${i}Tint`;
        textInput.value = value;
        textInput.placeholder = value;
        textInput.pattern = "#[0-9A-Fa-f]{6}";

        colorInput.addEventListener("input", () => {
          textInput.value = colorInput.value;
        });

        textInput.addEventListener("input", () => {
          const value = normalizeHexColor(textInput.value, null);
          if (value) colorInput.value = value;
        });

        wrapper.append(colorInput, textInput);
        tintInput.replaceWith(wrapper);
      }
    }
  });

  Hooks.once("ready", async () => {
    if (game.settings.get("action-tracker", "resetTiming") === "turnEnd") {
      await game.settings.set("action-tracker", "resetTiming", "turnStart");
      if (game.settings.get("action-tracker", "debug")) {
        console.log("Action Tracker | Migrated legacy reset timing to Start of Turn");
      }
    }

    if (!game.settings.get("action-tracker", "restoredDefaultTintsV14")) {
      if (areAllIconTintsBlack()) {
        for (let i = 0; i < ACTION_TRACKER_DEFAULT_ICONS.length; i++) {
          await game.settings.set("action-tracker", `icon${i}Tint`, getDefaultIconTint(i));
        }
        if (game.settings.get("action-tracker", "debug")) {
          console.log("Action Tracker | Restored default icon tint colors");
        }
      }

      await game.settings.set("action-tracker", "restoredDefaultTintsV14", true);
    }

    if (game.settings.get("action-tracker", "debug")) {
      console.log("Action Tracker | Ready");
    }
  });
});

// SVG caching for performance
const svgCache = new Map();

function normalizeHexColor(value, fallback = "#ffffff") {
  return typeof value === "string" && value.match(/^#[0-9A-Fa-f]{6}$/) ? value : fallback;
}

async function playActionSound(src) {
  if (!src) return;

  try {
    const helper = globalThis.foundry?.audio?.AudioHelper ?? globalThis.AudioHelper;
    if (helper?.play) {
      await helper.play({ src, volume: 0.5 }, false);
      return;
    }

    const audio = new Audio(src);
    audio.volume = 0.5;
    await audio.play();
  } catch (e) {
    if (game.settings.get("action-tracker", "debug")) {
      console.warn(`Action Tracker | Failed to play sound (${src})`, e);
    }
  }
}

async function getSvgElement(image, tint, used, removeColor, size = "20px") {
  tint = normalizeHexColor(tint);

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
    const tint = getIconTint(i);
    const used = token.document.getFlag("action-tracker", `action${i}`)?.used || false;

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
      const currentUsed = token.document.getFlag("action-tracker", `action${i}`)?.used || false;
      const newState = !currentUsed;
      await token.document.setFlag("action-tracker", `action${i}.used`, newState);
      svgElement.classList.toggle("used", newState);
      if (removeColor) {
        const newColor = newState ? "#ffffff" : tint;
        svgElement.querySelectorAll("path, circle, rect").forEach(el => {
          el.setAttribute("fill", newColor);
        });
        svgElement.style.borderColor = newColor;
      }
      if (enableSounds) await playActionSound(sound);
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

  const root = getHookRoot(html);
  if (!root) return;

  const middleCol = root.querySelector(".col.middle");
  if (middleCol) {
    middleCol.prepend(actionBar);
    if (game.settings.get("action-tracker", "debug")) {
      console.log(`Action Tracker | Action bar prepended to middle column`);
    }
  } else {
    if (game.settings.get("action-tracker", "debug")) {
      console.warn(`Action Tracker | Middle column not found, appending to root`);
    }
    root.prepend(actionBar);
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
  const root = getHookRoot(html);
  if (!root) return;

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

    const combatantLi = root.querySelector(`li.combatant[data-combatant-id="${combatant.id}"]`);
    if (!combatantLi) {
      if (game.settings.get("action-tracker", "debug")) {
        console.warn(`Action Tracker | No LI found for combatant ${combatant.id}`);
      }
      continue;
    }

    const nameElement = combatantLi.querySelector(".token-name");
    if (!nameElement) {
      if (game.settings.get("action-tracker", "debug")) {
        console.warn(`Action Tracker | No .token-name found for combatant ${combatant.id}`);
      }
      continue;
    }

    combatantLi.querySelector(".action-tracker-icons")?.remove();

    const iconBar = document.createElement("div");
    iconBar.className = "action-tracker-icons";

    for (let i = 0; i < iconCount; i++) {
      const image = game.settings.get("action-tracker", `icon${i}Image`);
      const text = game.settings.get("action-tracker", `icon${i}Text`);
      const sound = game.settings.get("action-tracker", `icon${i}Sound`);
      const tint = getIconTint(i);
      const { used } = getIconState(combatant, i);

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
        const currentUsed = tokenDoc.getFlag("action-tracker", `action${i}`)?.used || false;
        const newState = !currentUsed;
        await tokenDoc.setFlag("action-tracker", `action${i}.used`, newState);
        svgElement.classList.toggle("used", newState);
        if (removeColor) {
          const newColor = newState ? "#ffffff" : tint;
          svgElement.querySelectorAll("path, circle, rect").forEach(el => {
            el.setAttribute("fill", newColor);
          });
          svgElement.style.borderColor = newColor;
        }
        if (enableSounds) await playActionSound(sound);
        if (game.combat && ui.combat) ui.combat.render(true);
      });

      iconBar.appendChild(wrapper);
    }

    nameElement.after(iconBar);
  }
});

Hooks.on("updateCombat", async (combat, update, options, userId) => {
  const resetTiming = normalizeResetTiming(game.settings.get("action-tracker", "resetTiming"));
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
    await resetActions(currentToken);
  } else if (resetTiming === "roundEnd" && update.round !== undefined && update.turn === 0) {
    const resets = combat.combatants.map(c => {
      const token = c.token?.object;
      if (token && token.document) return resetActions(token);
      if (game.settings.get("action-tracker", "debug")) {
        console.warn(`Action Tracker | Invalid token in combatant: ${c.name}`);
      }
      return undefined;
    });
    await Promise.allSettled(resets.filter(Boolean));
  }
});

Hooks.on("deleteCombat", async (combat, options, userId) => {
  if (game.settings.get("action-tracker", "debug")) {
    console.log("Action Tracker | Combat ended - resetting all icons");
  }
  const resets = combat.combatants.map(c => {
    const token = canvas.tokens.get(c.tokenId);
    if (token && token.document) return resetActions(token);
    if (game.settings.get("action-tracker", "debug")) {
      console.warn(`Action Tracker | No token found for combatant ${c.name} on combat end`);
    }
    return undefined;
  });
  await Promise.allSettled(resets.filter(Boolean));
});

async function resetActions(token) {
  const iconCount = game.settings.get("action-tracker", "iconCount");
  const flags = {};
  for (let i = 0; i < iconCount; i++) {
    flags[`action${i}`] = { used: false };
  }
  await token.document.update({ flags: { "action-tracker": flags } });
  if (game.settings.get("action-tracker", "debug")) {
    console.log(`Action Tracker | Reset icons for ${token.name}`);
  }
  if (game.combat && ui.combat) ui.combat.render(true);
  if (ui.controls.hud?.token?.object === token) ui.controls.hud.token.render(true);
}
