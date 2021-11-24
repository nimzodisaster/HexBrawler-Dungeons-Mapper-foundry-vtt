import { Dungeon } from "./dungeon.js";
import { DungeonDraw } from "./dungeondraw.js";
import { DungeonLayer } from "./dungeonlayer.js";
import { themes } from "./themes.js";
import { ThemeSheet } from "./themesheet.js";

/**
 * Sheet for dungeon config/settings.
 * 
 * @extends {FormApplication}
 */
export class ConfigSheet extends FormApplication {

  constructor(activeTab = "settings") {
    super()
    this._tabs[0].active = activeTab;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "dd-config-sheet",
      classes: ["sheet"],
      template: "modules/dungeon-draw/templates/config-sheet.html",
      width: 480,
      height: 770,
      tabs: [{navSelector: ".tabs", contentSelector: "form", initial: "position"}]
    });
  }

  /** @override */
  get title() {
    return game.i18n.localize("DD.ConfigSheetTitle");
  }

  /** @override */
  getData() {
    let config = canvas.dungeon.dungeon?.state().config;
    if (!config) {
      config = Dungeon.defaultConfig();
    }
    const customThemes = this.getCustomThemes();
    const customThemeKeys = Object.keys(customThemes).sort();
    const themeKeys = Object.keys(themes).sort();
    return {
      config,
      customThemes,
      customThemeKeys,
      themes,
      themeKeys,
    }
  }

  /* -------------------------------------------- */

  getCustomThemes() {
    try {
      const customThemesString = game.settings.get(DungeonDraw.MODULE_NAME, "customThemes");
      return JSON.parse(customThemesString);
    } catch(e) {
      console.log(e);
      return {};
    }
  }

  saveCustomThemes(customThemes) {
    const themesString = JSON.stringify(customThemes);
    game.settings.set(DungeonDraw.MODULE_NAME, "customThemes", themesString);
  }

  /* -------------------------------------------- */

  /** @override */
  async _updateObject(event, formData) {
    // TODO: handle customThemeName vs. config better
    delete formData.customThemeName;
    canvas.dungeon.dungeon?.setConfig(formData);
  }

  /* -------------------------------------------- */

  /** @override */
  async close(options) {
    await super.close(options);
    if (this.preview) {
      this.preview.removeChildren();
      this.preview = null;
    }
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find('button[name="resetDefault"]').click(this._onResetDefaults.bind(this));
    html.find('.dd-theme-name').click(this._onThemeNameClick.bind(this));
    html.find('.dd-save-as-theme-button').click(this._onSaveAsThemeClick.bind(this));
    html.find('.dd-theme-edit').click(this._onEditThemeClick.bind(this));
    html.find('.dd-theme-copy').click(this._onCopyThemeClick.bind(this));
    html.find('.dd-theme-delete').click(this._onDeleteThemeClick.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Reset the user Drawing configuration settings to their default values
   * @param {PointerEvent} event      The originating mouse-click event
   * @protected
   */
  _onResetDefaults(event) {
    event.preventDefault();
    canvas.dungeon.dungeon?.setConfig(Dungeon.defaultConfig());
    canvas.dungeon.dungeon.refresh();
    this.render();
  }

  async _onThemeNameClick(event) {
    event.preventDefault();
    const themeRow = $(event.currentTarget).parent(".dd-theme-row");
    const themeKey = themeRow.data("theme");
    const isCustom = themeRow.data("themetype") === "custom";
    let theme;
    if (isCustom) {
      const customThemes = this.getCustomThemes();
      theme = customThemes[themeKey];
    } else {
      theme = themes[themeKey];
    }
    const newConfig = {...theme.config};
    await canvas.dungeon.dungeon?.setConfig(newConfig);
    if (game.user.isGM) {
      // need GM privs to update scene
      await canvas.scene.update({
        backgroundColor: newConfig.sceneBackgroundColor,
        gridAlpha: newConfig.sceneGridAlpha,
        gridColor: newConfig.sceneGridColor,
      })
    }
    this.render();
  }

  async _onSaveAsThemeClick(event) {
    event.preventDefault();
    const input = $(event.currentTarget).closest(".form-fields").children(".saveAsThemeName");
    const saveAsThemeName = input.val();
    const formData = this._getSubmitData();
    // TODO: handle saveAsThemeName better
    delete formData.saveAsThemeName;
    const customThemes = this.getCustomThemes();
    customThemes[saveAsThemeName] = {
      name: saveAsThemeName,
      config: formData
    };
    this.saveCustomThemes(customThemes);
    this._tabs[0].active = "themes";    
    this.render();    
  }

  async _onEditThemeClick(event) {
    event.preventDefault();
    const themeRow = $(event.currentTarget).closest(".dd-theme-row");
    const themeKey = themeRow.data("theme");
    new ThemeSheet(themeKey).render(true)
  }

  async _onCopyThemeClick(event) {
    event.preventDefault();
    const themeRow = $(event.currentTarget).closest(".dd-theme-row");
    const themeKey = themeRow.data("theme");
    const customThemes = this.getCustomThemes();
    const oldTheme = customThemes[themeKey];
    const newTheme = JSON.parse(JSON.stringify(oldTheme));
    // deal with possible name collisions
    let num = 1;
    let newName;
    while (true) {
      newName = `${oldTheme.name} (${num})`;
      if (newName in customThemes) {
        num++;
      } else {
        break;        
      }
    }
    newTheme.name = newName;
    customThemes[newName] = newTheme;
    this.saveCustomThemes(customThemes);
    this.render();
  }

  async _onDeleteThemeClick(event) {
    event.preventDefault();
    const themeRow = $(event.currentTarget).closest(".dd-theme-row");
    const themeKey = themeRow.data("theme");
    const customThemes = this.getCustomThemes();
    delete customThemes[themeKey];
    this.saveCustomThemes(customThemes);
    this.render();
  }  
}