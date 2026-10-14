// GENERATED — run npm run build:zed; do not edit
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// zed/server/src/lsp.ts
var path3 = __toESM(require("path"));
var import_url2 = require("url");

// src/bddOptions.ts
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var import_url = require("url");

// src/simpleYaml.ts
function parseSimpleYaml(text) {
  const result = {};
  let currentListKey = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const noComment = stripComment(rawLine);
    if (noComment.trim() === "") continue;
    const listItem = /^\s*-\s*(.+)$/.exec(noComment);
    if (listItem && currentListKey) {
      const existing = result[currentListKey];
      const value = unquote(listItem[1].trim());
      if (Array.isArray(existing)) existing.push(value);
      else result[currentListKey] = [value];
      continue;
    }
    const kv = /^([A-Za-z_][\w]*):\s*(.*)$/.exec(noComment);
    if (kv) {
      const key = kv[1];
      const value = kv[2].trim();
      if (value === "") {
        result[key] = [];
        currentListKey = key;
      } else if (value.startsWith("[") && value.endsWith("]")) {
        const inner = value.slice(1, -1).trim();
        result[key] = inner === "" ? [] : inner.split(",").map((v) => unquote(v.trim()));
        currentListKey = null;
      } else {
        result[key] = unquote(value);
        currentListKey = null;
      }
    }
  }
  return result;
}
function stripComment(line) {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === "'" && !inDouble) inSingle = !inSingle;
    else if (c === '"' && !inSingle) inDouble = !inDouble;
    else if (c === "#" && !inSingle && !inDouble) return line.slice(0, i);
  }
  return line;
}
function unquote(v) {
  if (v.startsWith("'") && v.endsWith("'") && v.length >= 2 || v.startsWith('"') && v.endsWith('"') && v.length >= 2) {
    return v.slice(1, -1);
  }
  return v;
}

// src/bddOptions.ts
var DEFAULT_STEP_FOLDER = "./step";
var DEFAULT_RELATIVE_TO_TEST = true;
var defaultOptions = {
  stepFolderName: DEFAULT_STEP_FOLDER,
  relativeToTestFolder: DEFAULT_RELATIVE_TO_TEST,
  externalSteps: []
};
function asString(v) {
  return typeof v === "string" ? v : void 0;
}
function asArray(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") return [v];
  return [];
}
function findOptions(featurePath, workspaceRoot, getDefaults2 = () => defaultOptions) {
  let options = getDefaults2();
  const roots = candidateRoots(featurePath, workspaceRoot);
  for (const root of roots) {
    const bddOptionsPath = path.join(root, "bdd_options.yaml");
    if (fs.existsSync(bddOptionsPath)) {
      try {
        const raw = parseSimpleYaml(fs.readFileSync(bddOptionsPath, "utf8"));
        options = mergeOptions(options, yamlToOptions(raw));
        break;
      } catch {
      }
    }
    const buildYamlPath = path.join(root, "build.yaml");
    if (fs.existsSync(buildYamlPath)) {
      try {
        const raw = fs.readFileSync(buildYamlPath, "utf8");
        const optionsBlock = extractBuildYamlOptions(raw);
        if (optionsBlock) {
          options = mergeOptions(
            options,
            yamlToOptions(parseSimpleYaml(optionsBlock))
          );
          break;
        }
      } catch {
      }
    }
  }
  return options;
}
function yamlToOptions(raw) {
  return {
    stepFolderName: asString(raw["stepFolderName"]) ?? DEFAULT_STEP_FOLDER,
    relativeToTestFolder: raw["relativeToTestFolder"] === void 0 ? DEFAULT_RELATIVE_TO_TEST : asString(raw["relativeToTestFolder"]) === "true",
    externalSteps: asArray(raw["externalSteps"])
  };
}
function extractBuildYamlOptions(buildYaml) {
  const re = /bdd_widget_test:[\s\S]*?options:\s*\n((?:[ \t]+[^\n]*\n?)*)/;
  const m = re.exec(buildYaml);
  return m ? m[1] : null;
}
function mergeOptions(a, b) {
  return {
    stepFolderName: a.stepFolderName !== DEFAULT_STEP_FOLDER ? a.stepFolderName : b.stepFolderName,
    relativeToTestFolder: a.relativeToTestFolder && b.relativeToTestFolder,
    externalSteps: [...a.externalSteps, ...b.externalSteps]
  };
}
function candidateRoots(featurePath, workspaceRoot) {
  const roots = [];
  let dir = path.dirname(featurePath);
  const stop = workspaceRoot ? path.resolve(workspaceRoot) : path.parse(featurePath).root;
  for (let guard = 0; guard < 64; guard++) {
    roots.push(dir);
    if (path.resolve(dir) === path.resolve(stop)) break;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  if (workspaceRoot && !roots.includes(path.resolve(workspaceRoot)))
    roots.push(path.resolve(workspaceRoot));
  return roots;
}
function stepFolderBaseDir(featurePath, options, workspaceRoot) {
  if (options.stepFolderName.startsWith("./") || options.stepFolderName.startsWith("../")) {
    return path.dirname(featurePath);
  }
  if (options.relativeToTestFolder) {
    const testDir = findEnclosingDir(path.dirname(featurePath), "test", workspaceRoot) ?? path.join(workspaceRoot ?? path.dirname(featurePath), "test");
    return testDir;
  }
  return workspaceRoot ?? path.dirname(featurePath);
}
function findEnclosingDir(start, name, stopAt) {
  let dir = start;
  const stop = stopAt ? path.resolve(stopAt) : void 0;
  for (let guard = 0; guard < 64; guard++) {
    if (fs.existsSync(path.join(dir, name)) && fs.statSync(path.join(dir, name)).isDirectory())
      return path.join(dir, name);
    if (stop && path.resolve(dir) === stop) return void 0;
    if (stop && path.resolve(dir).length < stop.length) return void 0;
    const parent = path.dirname(dir);
    if (parent === dir) return void 0;
    dir = parent;
  }
  return void 0;
}
function resolvePackageUri(uri, workspaceRoot) {
  if (!uri.startsWith("package:")) return uri;
  const rest = uri.slice("package:".length);
  const slash = rest.indexOf("/");
  if (slash <= 0) return void 0;
  const pkg = rest.slice(0, slash);
  const rel = rest.slice(slash + 1);
  const roots = workspaceRoot ? [workspaceRoot] : [];
  for (const root of roots) {
    const configPath = path.join(root, ".dart_tool", "package_config.json");
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
        const entry = config.packages?.find((p) => p.name === pkg);
        if (entry) {
          const rootUri = entry.rootUri.startsWith("file://") ? (0, import_url.fileURLToPath)(entry.rootUri) : path.resolve(root, entry.rootUri);
          return path.join(rootUri, "lib", rel);
        }
      } catch {
      }
    }
    for (const guess of [
      path.join(root, pkg, "lib", rel),
      path.join(root, "packages", pkg, "lib", rel)
    ]) {
      if (fs.existsSync(guess)) return guess;
    }
  }
  return void 0;
}

// src/gherkin/dialects.json
var dialects_default = {
  af: {
    name: "Afrikaans",
    native: "Afrikaans",
    feature: ["Funksie", "Besigheid Behoefte", "Vermo\xEB"],
    rule: ["Re\xEBl", "Reel"],
    background: ["Agtergrond"],
    scenario: ["Voorbeeld", "Situasie"],
    scenarioOutline: ["Situasie Uiteensetting"],
    examples: ["Voorbeelde"],
    given: ["* ", "Gegewe "],
    when: ["* ", "Wanneer "],
    then: ["* ", "Dan "],
    and: ["* ", "En "],
    but: ["* ", "Maar "]
  },
  am: {
    name: "Armenian",
    native: "\u0570\u0561\u0575\u0565\u0580\u0565\u0576",
    feature: ["\u0556\u0578\u0582\u0576\u056F\u0581\u056B\u0578\u0576\u0561\u056C\u0578\u0582\u0569\u0575\u0578\u0582\u0576", "\u0540\u0561\u057F\u056F\u0578\u0582\u0569\u0575\u0578\u0582\u0576"],
    rule: ["Rule"],
    background: ["\u053F\u0578\u0576\u057F\u0565\u0584\u057D\u057F"],
    scenario: ["\u0555\u0580\u056B\u0576\u0561\u056F", "\u054D\u0581\u0565\u0576\u0561\u0580"],
    scenarioOutline: ["\u054D\u0581\u0565\u0576\u0561\u0580\u056B \u056F\u0561\u057C\u0578\u0582\u0581\u057E\u0561\u0581\u0584\u0568"],
    examples: ["\u0555\u0580\u056B\u0576\u0561\u056F\u0576\u0565\u0580"],
    given: ["* ", "\u0534\u056B\u0581\u0578\u0582\u0584 "],
    when: ["* ", "\u0535\u0569\u0565 ", "\u0535\u0580\u0562 "],
    then: ["* ", "\u0531\u057A\u0561 "],
    and: ["* ", "\u0535\u057E "],
    but: ["* ", "\u0532\u0561\u0575\u0581 "]
  },
  amh: {
    name: "Amharic",
    native: "\u12A0\u121B\u122D\u129B",
    feature: ["\u1235\u122B", "\u12E8\u1270\u1348\u1208\u1308\u12CD \u1235\u122B", "\u12E8\u121A\u1348\u1208\u1308\u12CD \u12F5\u122D\u130A\u1275"],
    rule: ["\u1205\u130D"],
    background: ["\u1245\u12F5\u1218 \u1201\u1294\u1273", "\u1218\u1290\u123B", "\u1218\u1290\u123B \u1200\u1233\u1265"],
    scenario: ["\u121D\u1233\u120C", "\u1201\u1293\u1274"],
    scenarioOutline: ["\u1201\u1293\u1274 \u12DD\u122D\u12DD\u122D", "\u1201\u1293\u1274 \u12A0\u1265\u1290\u1275"],
    examples: ["\u121D\u1233\u120C\u12CE\u127D", "\u1201\u1293\u1274\u12CE\u127D"],
    given: ["* ", "\u12E8\u1270\u1230\u1320 "],
    when: ["* ", "\u1218\u127C "],
    then: ["* ", "\u12A8\u12DA\u12EB "],
    and: ["* ", "\u12A5\u1293 "],
    but: ["* ", "\u130D\u1295 "]
  },
  an: {
    name: "Aragonese",
    native: "Aragon\xE9s",
    feature: ["Caracteristica"],
    rule: ["Rule"],
    background: ["Antecedents"],
    scenario: ["Eixemplo", "Caso"],
    scenarioOutline: ["Esquema del caso"],
    examples: ["Eixemplos"],
    given: ["* ", "Dau ", "Dada ", "Daus ", "Dadas "],
    when: ["* ", "Cuan "],
    then: ["* ", "Alavez ", "Allora ", "Antonces "],
    and: ["* ", "Y ", "E "],
    but: ["* ", "Pero "]
  },
  ar: {
    name: "Arabic",
    native: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629",
    feature: ["\u062E\u0627\u0635\u064A\u0629"],
    rule: ["Rule"],
    background: ["\u0627\u0644\u062E\u0644\u0641\u064A\u0629"],
    scenario: ["\u0645\u062B\u0627\u0644", "\u0633\u064A\u0646\u0627\u0631\u064A\u0648"],
    scenarioOutline: ["\u0633\u064A\u0646\u0627\u0631\u064A\u0648 \u0645\u062E\u0637\u0637"],
    examples: ["\u0627\u0645\u062B\u0644\u0629"],
    given: ["* ", "\u0628\u0641\u0631\u0636 "],
    when: ["* ", "\u0645\u062A\u0649 ", "\u0639\u0646\u062F\u0645\u0627 "],
    then: ["* ", "\u0627\u0630\u0627\u064B ", "\u062B\u0645 "],
    and: ["* ", "\u0648 "],
    but: ["* ", "\u0644\u0643\u0646 "]
  },
  ast: {
    name: "Asturian",
    native: "asturianu",
    feature: ["Carauter\xEDstica"],
    rule: ["Rule"],
    background: ["Antecedentes"],
    scenario: ["Exemplo", "Casu"],
    scenarioOutline: ["Esbozu del casu"],
    examples: ["Exemplos"],
    given: ["* ", "D\xE1u ", "Dada ", "Daos ", "Daes "],
    when: ["* ", "Cuando "],
    then: ["* ", "Ent\xF3s "],
    and: ["* ", "Y ", "Ya "],
    but: ["* ", "Peru "]
  },
  az: {
    name: "Azerbaijani",
    native: "Az\u0259rbaycanca",
    feature: ["\xD6z\u0259llik"],
    rule: ["Rule"],
    background: ["Ke\xE7mi\u015F", "Kontekst"],
    scenario: ["N\xFCmun\u0259", "Ssenari"],
    scenarioOutline: ["Ssenarinin strukturu"],
    examples: ["N\xFCmun\u0259l\u0259r"],
    given: ["* ", "Tutaq ki ", "Verilir "],
    when: ["* ", "\u018Fg\u0259r ", "N\u0259 vaxt ki "],
    then: ["* ", "O halda "],
    and: ["* ", "V\u0259 ", "H\u0259m "],
    but: ["* ", "Amma ", "Ancaq "]
  },
  be: {
    name: "Belarusian",
    native: "\u0411\u0435\u043B\u0430\u0440\u0443\u0441\u043A\u0430\u044F",
    feature: ["\u0424\u0443\u043D\u043A\u0446\u044B\u044F\u043D\u0430\u043B\u044C\u043D\u0430\u0441\u0446\u044C", "\u0424\u0456\u0447\u0430"],
    rule: ["\u041F\u0440\u0430\u0432\u0456\u043B\u044B"],
    background: ["\u041A\u0430\u043D\u0442\u044D\u043A\u0441\u0442"],
    scenario: ["\u0421\u0446\u044D\u043D\u0430\u0440\u044B\u0439", "C\u0446\u044D\u043D\u0430\u0440"],
    scenarioOutline: ["\u0428\u0430\u0431\u043B\u043E\u043D \u0441\u0446\u044D\u043D\u0430\u0440\u044B\u044F", "\u0423\u0437\u043E\u0440 \u0441\u0446\u044D\u043D\u0430\u0440\u0430"],
    examples: ["\u041F\u0440\u044B\u043A\u043B\u0430\u0434\u044B"],
    given: ["* ", "\u041D\u044F\u0445\u0430\u0439 ", "\u0414\u0430\u0434\u0437\u0435\u043D\u0430 "],
    when: ["* ", "\u041A\u0430\u043B\u0456 "],
    then: ["* ", "\u0422\u0430\u0434\u044B "],
    and: ["* ", "I ", "\u0414\u044B ", "\u0422\u0430\u043A\u0441\u0430\u043C\u0430 "],
    but: ["* ", "\u0410\u043B\u0435 ", "\u0406\u043D\u0430\u043A\u0448 "]
  },
  bg: {
    name: "Bulgarian",
    native: "\u0431\u044A\u043B\u0433\u0430\u0440\u0441\u043A\u0438",
    feature: ["\u0424\u0443\u043D\u043A\u0446\u0438\u043E\u043D\u0430\u043B\u043D\u043E\u0441\u0442"],
    rule: ["\u041F\u0440\u0430\u0432\u0438\u043B\u043E"],
    background: ["\u041F\u0440\u0435\u0434\u0438\u0441\u0442\u043E\u0440\u0438\u044F"],
    scenario: ["\u041F\u0440\u0438\u043C\u0435\u0440", "\u0421\u0446\u0435\u043D\u0430\u0440\u0438\u0439"],
    scenarioOutline: ["\u0420\u0430\u043C\u043A\u0430 \u043D\u0430 \u0441\u0446\u0435\u043D\u0430\u0440\u0438\u0439"],
    examples: ["\u041F\u0440\u0438\u043C\u0435\u0440\u0438"],
    given: ["* ", "\u0414\u0430\u0434\u0435\u043D\u043E "],
    when: ["* ", "\u041A\u043E\u0433\u0430\u0442\u043E "],
    then: ["* ", "\u0422\u043E "],
    and: ["* ", "\u0418 "],
    but: ["* ", "\u041D\u043E "]
  },
  bm: {
    name: "Malay",
    native: "Bahasa Melayu",
    feature: ["Fungsi"],
    rule: ["Rule"],
    background: ["Latar Belakang"],
    scenario: ["Senario", "Situasi", "Keadaan"],
    scenarioOutline: [
      "Kerangka Senario",
      "Kerangka Situasi",
      "Kerangka Keadaan",
      "Garis Panduan Senario"
    ],
    examples: ["Contoh"],
    given: ["* ", "Diberi ", "Bagi "],
    when: ["* ", "Apabila "],
    then: ["* ", "Maka ", "Kemudian "],
    and: ["* ", "Dan "],
    but: ["* ", "Tetapi ", "Tapi "]
  },
  bs: {
    name: "Bosnian",
    native: "Bosanski",
    feature: ["Karakteristika"],
    rule: ["Rule"],
    background: ["Pozadina"],
    scenario: ["Primjer", "Scenariju", "Scenario"],
    scenarioOutline: ["Scenariju-obris", "Scenario-outline"],
    examples: ["Primjeri"],
    given: ["* ", "Dato "],
    when: ["* ", "Kada "],
    then: ["* ", "Zatim "],
    and: ["* ", "I ", "A "],
    but: ["* ", "Ali "]
  },
  ca: {
    name: "Catalan",
    native: "catal\xE0",
    feature: ["Caracter\xEDstica", "Funcionalitat"],
    rule: ["Rule"],
    background: ["Rerefons", "Antecedents"],
    scenario: ["Exemple", "Escenari"],
    scenarioOutline: ["Esquema de l'escenari"],
    examples: ["Exemples"],
    given: ["* ", "Donat ", "Donada ", "At\xE8s ", "Atesa "],
    when: ["* ", "Quan "],
    then: ["* ", "Aleshores ", "Cal "],
    and: ["* ", "I "],
    but: ["* ", "Per\xF2 "]
  },
  cs: {
    name: "Czech",
    native: "\u010Cesky",
    feature: ["Po\u017Eadavek"],
    rule: ["Pravidlo"],
    background: ["Pozad\xED", "Kontext"],
    scenario: ["P\u0159\xEDklad", "Sc\xE9n\xE1\u0159"],
    scenarioOutline: ["N\xE1\u010Drt Sc\xE9n\xE1\u0159e", "Osnova sc\xE9n\xE1\u0159e"],
    examples: ["P\u0159\xEDklady"],
    given: ["* ", "Pokud ", "Za p\u0159edpokladu "],
    when: ["* ", "Kdy\u017E "],
    then: ["* ", "Pak "],
    and: ["* ", "A tak\xE9 ", "A "],
    but: ["* ", "Ale "]
  },
  "cy-GB": {
    name: "Welsh",
    native: "Cymraeg",
    feature: ["Arwedd"],
    rule: ["Rule"],
    background: ["Cefndir"],
    scenario: ["Enghraifft", "Scenario"],
    scenarioOutline: ["Scenario Amlinellol"],
    examples: ["Enghreifftiau"],
    given: ["* ", "Anrhegedig a "],
    when: ["* ", "Pryd "],
    then: ["* ", "Yna "],
    and: ["* ", "A "],
    but: ["* ", "Ond "]
  },
  da: {
    name: "Danish",
    native: "dansk",
    feature: ["Egenskab"],
    rule: ["Regel"],
    background: ["Baggrund"],
    scenario: ["Eksempel", "Scenarie"],
    scenarioOutline: ["Abstrakt Scenario"],
    examples: ["Eksempler"],
    given: ["* ", "Givet "],
    when: ["* ", "N\xE5r "],
    then: ["* ", "S\xE5 "],
    and: ["* ", "Og "],
    but: ["* ", "Men "]
  },
  de: {
    name: "German",
    native: "Deutsch",
    feature: ["Funktionalit\xE4t", "Funktion"],
    rule: ["Rule", "Regel"],
    background: [
      "Grundlage",
      "Hintergrund",
      "Voraussetzungen",
      "Vorbedingungen"
    ],
    scenario: ["Beispiel", "Szenario"],
    scenarioOutline: ["Szenariogrundriss", "Szenarien"],
    examples: ["Beispiele"],
    given: ["* ", "Angenommen ", "Gegeben sei ", "Gegeben seien "],
    when: ["* ", "Wenn "],
    then: ["* ", "Dann "],
    and: ["* ", "Und "],
    but: ["* ", "Aber "]
  },
  el: {
    name: "Greek",
    native: "\u0395\u03BB\u03BB\u03B7\u03BD\u03B9\u03BA\u03AC",
    feature: ["\u0394\u03C5\u03BD\u03B1\u03C4\u03CC\u03C4\u03B7\u03C4\u03B1", "\u039B\u03B5\u03B9\u03C4\u03BF\u03C5\u03C1\u03B3\u03AF\u03B1"],
    rule: ["Rule"],
    background: ["\u03A5\u03C0\u03CC\u03B2\u03B1\u03B8\u03C1\u03BF"],
    scenario: ["\u03A0\u03B1\u03C1\u03AC\u03B4\u03B5\u03B9\u03B3\u03BC\u03B1", "\u03A3\u03B5\u03BD\u03AC\u03C1\u03B9\u03BF"],
    scenarioOutline: ["\u03A0\u03B5\u03C1\u03B9\u03B3\u03C1\u03B1\u03C6\u03AE \u03A3\u03B5\u03BD\u03B1\u03C1\u03AF\u03BF\u03C5", "\u03A0\u03B5\u03C1\u03AF\u03B3\u03C1\u03B1\u03BC\u03BC\u03B1 \u03A3\u03B5\u03BD\u03B1\u03C1\u03AF\u03BF\u03C5"],
    examples: ["\u03A0\u03B1\u03C1\u03B1\u03B4\u03B5\u03AF\u03B3\u03BC\u03B1\u03C4\u03B1", "\u03A3\u03B5\u03BD\u03AC\u03C1\u03B9\u03B1"],
    given: ["* ", "\u0394\u03B5\u03B4\u03BF\u03BC\u03AD\u03BD\u03BF\u03C5 "],
    when: ["* ", "\u038C\u03C4\u03B1\u03BD "],
    then: ["* ", "\u03A4\u03CC\u03C4\u03B5 "],
    and: ["* ", "\u039A\u03B1\u03B9 "],
    but: ["* ", "\u0391\u03BB\u03BB\u03AC "]
  },
  em: {
    name: "Emoji",
    native: "\u{1F600}",
    feature: ["\u{1F4DA}"],
    rule: ["Rule"],
    background: ["\u{1F4A4}"],
    scenario: ["\u{1F952}", "\u{1F4D5}"],
    scenarioOutline: ["\u{1F4D6}"],
    examples: ["\u{1F4D3}"],
    given: ["* ", "\u{1F610}"],
    when: ["* ", "\u{1F3AC}"],
    then: ["* ", "\u{1F64F}"],
    and: ["* ", "\u{1F602}"],
    but: ["* ", "\u{1F614}"]
  },
  en: {
    name: "English",
    native: "English",
    feature: ["Feature", "Business Need", "Ability"],
    rule: ["Rule"],
    background: ["Background"],
    scenario: ["Example", "Scenario"],
    scenarioOutline: ["Scenario Outline", "Scenario Template"],
    examples: ["Examples", "Scenarios"],
    given: ["* ", "Given "],
    when: ["* ", "When "],
    then: ["* ", "Then "],
    and: ["* ", "And "],
    but: ["* ", "But "]
  },
  "en-Scouse": {
    name: "Scouse",
    native: "Scouse",
    feature: ["Feature"],
    rule: ["Rule"],
    background: ["Dis is what went down"],
    scenario: ["The thing of it is"],
    scenarioOutline: ["Wharrimean is"],
    examples: ["Examples"],
    given: ["* ", "Givun ", "Youse know when youse got "],
    when: ["* ", "Wun ", "Youse know like when "],
    then: ["* ", "Dun ", "Den youse gotta "],
    and: ["* ", "An "],
    but: ["* ", "Buh "]
  },
  "en-au": {
    name: "Australian",
    native: "Australian",
    feature: ["Pretty much"],
    rule: ["Rule"],
    background: ["First off"],
    scenario: ["Awww, look mate"],
    scenarioOutline: ["Reckon it's like"],
    examples: ["You'll wanna"],
    given: ["* ", "Y'know "],
    when: ["* ", "It's just unbelievable "],
    then: ["* ", "But at the end of the day I reckon "],
    and: ["* ", "Too right "],
    but: ["* ", "Yeah nah "]
  },
  "en-lol": {
    name: "LOLCAT",
    native: "LOLCAT",
    feature: ["OH HAI"],
    rule: ["Rule"],
    background: ["B4"],
    scenario: ["MISHUN"],
    scenarioOutline: ["MISHUN SRSLY"],
    examples: ["EXAMPLZ"],
    given: ["* ", "I CAN HAZ "],
    when: ["* ", "WEN "],
    then: ["* ", "DEN "],
    and: ["* ", "AN "],
    but: ["* ", "BUT "]
  },
  "en-old": {
    name: "Old English",
    native: "Englisc",
    feature: ["Hwaet", "Hw\xE6t"],
    rule: ["Rule"],
    background: ["Aer", "\xC6r"],
    scenario: ["Swa"],
    scenarioOutline: ["Swa hwaer swa", "Swa hw\xE6r swa"],
    examples: ["Se the", "Se \xFEe", "Se \xF0e"],
    given: ["* ", "Thurh ", "\xDEurh ", "\xD0urh "],
    when: [
      "* ",
      "B\xE6\xFEsealf ",
      "B\xE6\xFEsealfa ",
      "B\xE6\xFEsealfe ",
      "Ciric\xE6w ",
      "Ciric\xE6we ",
      "Ciric\xE6wa "
    ],
    then: ["* ", "Tha ", "\xDEa ", "\xD0a ", "Tha the ", "\xDEa \xFEe ", "\xD0a \xF0e "],
    and: ["* ", "Ond ", "7 "],
    but: ["* ", "Ac "]
  },
  "en-pirate": {
    name: "Pirate",
    native: "Pirate",
    feature: ["Ahoy matey!"],
    rule: ["Rule"],
    background: ["Yo-ho-ho"],
    scenario: ["Heave to"],
    scenarioOutline: ["Shiver me timbers"],
    examples: ["Dead men tell no tales"],
    given: ["* ", "Gangway! "],
    when: ["* ", "Blimey! "],
    then: ["* ", "Let go and haul "],
    and: ["* ", "Aye "],
    but: ["* ", "Avast! "]
  },
  "en-tx": {
    name: "Texas",
    native: "Texas",
    feature: ["This ain\u2019t my first rodeo", "All gussied up"],
    rule: ["Rule "],
    background: ["Lemme tell y'all a story"],
    scenario: ["All hat and no cattle"],
    scenarioOutline: [
      "Serious as a snake bite",
      "Busy as a hound in flea season"
    ],
    examples: ["Now that's a story longer than a cattle drive in July"],
    given: ["Fixin' to ", "All git out "],
    when: ["Quick out of the chute "],
    then: ["There\u2019s no tree but bears some fruit "],
    and: ["Come hell or high water "],
    but: ["Well now hold on, I'll you what "]
  },
  eo: {
    name: "Esperanto",
    native: "Esperanto",
    feature: ["Trajto"],
    rule: ["Regulo"],
    background: ["Fono"],
    scenario: ["Ekzemplo", "Scenaro", "Kazo"],
    scenarioOutline: ["Konturo de la scenaro", "Skizo", "Kazo-skizo"],
    examples: ["Ekzemploj"],
    given: ["* ", "Donita\u0135o ", "Komence "],
    when: ["* ", "Se "],
    then: ["* ", "Do "],
    and: ["* ", "Kaj "],
    but: ["* ", "Sed "]
  },
  es: {
    name: "Spanish",
    native: "espa\xF1ol",
    feature: ["Caracter\xEDstica", "Necesidad del negocio", "Requisito"],
    rule: ["Regla", "Regla de negocio"],
    background: ["Antecedentes"],
    scenario: ["Ejemplo", "Escenario"],
    scenarioOutline: ["Esquema del escenario"],
    examples: ["Ejemplos"],
    given: ["* ", "Dado ", "Dada ", "Dados ", "Dadas "],
    when: ["* ", "Cuando "],
    then: ["* ", "Entonces "],
    and: ["* ", "Y ", "E "],
    but: ["* ", "Pero "]
  },
  et: {
    name: "Estonian",
    native: "eesti keel",
    feature: ["Omadus"],
    rule: ["Reegel"],
    background: ["Taust"],
    scenario: ["Juhtum", "Stsenaarium"],
    scenarioOutline: ["Raamjuhtum", "Raamstsenaarium"],
    examples: ["Juhtumid"],
    given: ["* ", "Eeldades "],
    when: ["* ", "Kui "],
    then: ["* ", "Siis "],
    and: ["* ", "Ja "],
    but: ["* ", "Kuid "]
  },
  fa: {
    name: "Persian",
    native: "\u0641\u0627\u0631\u0633\u06CC",
    feature: ["\u0648\u06CC\u0698\u06AF\u06CC", "\u0642\u0627\u0628\u0644\u06CC\u062A"],
    rule: ["\u0642\u0627\u0646\u0648\u0646"],
    background: ["\u0632\u0645\u06CC\u0646\u0647", "\u067E\u06CC\u0634 \u0632\u0645\u06CC\u0646\u0647", "\u0645\u0642\u062F\u0645\u0627\u062A"],
    scenario: ["\u0645\u062B\u0627\u0644", "\u0633\u0646\u0627\u0631\u06CC\u0648"],
    scenarioOutline: ["\u0627\u0644\u06AF\u0648\u06CC \u0633\u0646\u0627\u0631\u06CC\u0648"],
    examples: ["\u0646\u0645\u0648\u0646\u0647 \u0647\u0627"],
    given: ["* ", "\u0628\u0627 \u0641\u0631\u0636 ", "\u0641\u0631\u0636 \u06A9\u0646\u06CC\u062F ", "\u0628\u0627 \u062F\u0631 \u0646\u0638\u0631 \u06AF\u0631\u0641\u062A\u0646 "],
    when: ["* ", "\u0647\u0646\u06AF\u0627\u0645\u06CC ", "\u0648\u0642\u062A\u06CC "],
    then: ["* ", "\u0622\u0646\u06AF\u0627\u0647 ", "\u0633\u067E\u0633 ", "\u0627\u0646\u062A\u0638\u0627\u0631 \u0645\u06CC \u0631\u0648\u062F "],
    and: ["* ", "\u0648 "],
    but: ["* ", "\u0627\u0645\u0627 "]
  },
  fi: {
    name: "Finnish",
    native: "suomi",
    feature: ["Ominaisuus"],
    rule: ["Rule"],
    background: ["Tausta"],
    scenario: ["Tapaus"],
    scenarioOutline: ["Tapausaihio"],
    examples: ["Tapaukset"],
    given: ["* ", "Oletetaan "],
    when: ["* ", "Kun "],
    then: ["* ", "Niin "],
    and: ["* ", "Ja "],
    but: ["* ", "Mutta "]
  },
  fr: {
    name: "French",
    native: "fran\xE7ais",
    feature: ["Fonctionnalit\xE9"],
    rule: ["R\xE8gle"],
    background: ["Contexte"],
    scenario: ["Exemple", "Sc\xE9nario"],
    scenarioOutline: ["Plan du sc\xE9nario", "Plan du Sc\xE9nario"],
    examples: ["Exemples"],
    given: [
      "* ",
      "Soit ",
      "Sachant que ",
      "Sachant qu'",
      "Sachant ",
      "Etant donn\xE9 que ",
      "Etant donn\xE9 qu'",
      "Etant donn\xE9 ",
      "Etant donn\xE9e ",
      "Etant donn\xE9s ",
      "Etant donn\xE9es ",
      "\xC9tant donn\xE9 que ",
      "\xC9tant donn\xE9 qu'",
      "\xC9tant donn\xE9 ",
      "\xC9tant donn\xE9e ",
      "\xC9tant donn\xE9s ",
      "\xC9tant donn\xE9es "
    ],
    when: ["* ", "Quand ", "Lorsque ", "Lorsqu'"],
    then: ["* ", "Alors ", "Donc "],
    and: ["* ", "Et que ", "Et qu'", "Et "],
    but: ["* ", "Mais que ", "Mais qu'", "Mais "]
  },
  ga: {
    name: "Irish",
    native: "Gaeilge",
    feature: ["Gn\xE9"],
    rule: ["Riail"],
    background: ["C\xFAlra"],
    scenario: ["Sampla", "C\xE1s"],
    scenarioOutline: ["C\xE1s Achomair"],
    examples: ["Sampla\xED"],
    given: [
      "* ",
      "Cuir i gc\xE1s go ",
      "Cuir i gc\xE1s nach ",
      "Cuir i gc\xE1s gur ",
      "Cuir i gc\xE1s n\xE1r "
    ],
    when: ["* ", "Nuair a ", "Nuair nach ", "Nuair ba ", "Nuair n\xE1r "],
    then: ["* ", "Ansin "],
    and: ["* ", "Agus "],
    but: ["* ", "Ach "]
  },
  gj: {
    name: "Gujarati",
    native: "\u0A97\u0AC1\u0A9C\u0AB0\u0ABE\u0AA4\u0AC0",
    feature: ["\u0AB2\u0A95\u0ACD\u0AB7\u0AA3", "\u0AB5\u0ACD\u0AAF\u0ABE\u0AAA\u0ABE\u0AB0 \u0A9C\u0AB0\u0AC2\u0AB0", "\u0A95\u0ACD\u0AB7\u0AAE\u0AA4\u0ABE"],
    rule: ["\u0AA8\u0ABF\u0AAF\u0AAE"],
    background: ["\u0AAC\u0AC7\u0A95\u0A97\u0ACD\u0AB0\u0ABE\u0A89\u0AA8\u0ACD\u0AA1"],
    scenario: ["\u0A89\u0AA6\u0ABE\u0AB9\u0AB0\u0AA3", "\u0AB8\u0ACD\u0AA5\u0ABF\u0AA4\u0ABF"],
    scenarioOutline: ["\u0AAA\u0AB0\u0ABF\u0AA6\u0ACD\u0AA6\u0AB6\u0ACD\u0AAF \u0AB0\u0AC2\u0AAA\u0AB0\u0AC7\u0A96\u0ABE", "\u0AAA\u0AB0\u0ABF\u0AA6\u0ACD\u0AA6\u0AB6\u0ACD\u0AAF \u0AA2\u0ABE\u0A82\u0A9A\u0ACB"],
    examples: ["\u0A89\u0AA6\u0ABE\u0AB9\u0AB0\u0AA3\u0ACB"],
    given: ["* ", "\u0A86\u0AAA\u0AC7\u0AB2 \u0A9B\u0AC7 "],
    when: ["* ", "\u0A95\u0ACD\u0AAF\u0ABE\u0AB0\u0AC7 "],
    then: ["* ", "\u0AAA\u0A9B\u0AC0 "],
    and: ["* ", "\u0A85\u0AA8\u0AC7 "],
    but: ["* ", "\u0AAA\u0AA3 "]
  },
  gl: {
    name: "Galician",
    native: "galego",
    feature: ["Caracter\xEDstica"],
    rule: ["Rule"],
    background: ["Contexto"],
    scenario: ["Exemplo", "Escenario"],
    scenarioOutline: ["Esbozo do escenario"],
    examples: ["Exemplos"],
    given: ["* ", "Dado ", "Dada ", "Dados ", "Dadas "],
    when: ["* ", "Cando "],
    then: ["* ", "Ent\xF3n ", "Logo "],
    and: ["* ", "E "],
    but: ["* ", "Mais ", "Pero "]
  },
  he: {
    name: "Hebrew",
    native: "\u05E2\u05D1\u05E8\u05D9\u05EA",
    feature: ["\u05EA\u05DB\u05D5\u05E0\u05D4"],
    rule: ["\u05DB\u05DC\u05DC"],
    background: ["\u05E8\u05E7\u05E2"],
    scenario: ["\u05D3\u05D5\u05D2\u05DE\u05D0", "\u05EA\u05E8\u05D7\u05D9\u05E9"],
    scenarioOutline: ["\u05EA\u05D1\u05E0\u05D9\u05EA \u05EA\u05E8\u05D7\u05D9\u05E9"],
    examples: ["\u05D3\u05D5\u05D2\u05DE\u05D0\u05D5\u05EA"],
    given: ["* ", "\u05D1\u05D4\u05D9\u05E0\u05EA\u05DF "],
    when: ["* ", "\u05DB\u05D0\u05E9\u05E8 "],
    then: ["* ", "\u05D0\u05D6 ", "\u05D0\u05D6\u05D9 "],
    and: ["* ", "\u05D5\u05D2\u05DD "],
    but: ["* ", "\u05D0\u05D1\u05DC "]
  },
  hi: {
    name: "Hindi",
    native: "\u0939\u093F\u0902\u0926\u0940",
    feature: ["\u0930\u0942\u092A \u0932\u0947\u0916"],
    rule: ["\u0928\u093F\u092F\u092E"],
    background: ["\u092A\u0943\u0937\u094D\u0920\u092D\u0942\u092E\u093F"],
    scenario: ["\u092A\u0930\u093F\u0926\u0943\u0936\u094D\u092F"],
    scenarioOutline: ["\u092A\u0930\u093F\u0926\u0943\u0936\u094D\u092F \u0930\u0942\u092A\u0930\u0947\u0916\u093E"],
    examples: ["\u0909\u0926\u093E\u0939\u0930\u0923"],
    given: ["* ", "\u0905\u0917\u0930 ", "\u092F\u0926\u093F ", "\u091A\u0942\u0902\u0915\u093F "],
    when: ["* ", "\u091C\u092C ", "\u0915\u0926\u093E "],
    then: ["* ", "\u0924\u092C ", "\u0924\u0926\u093E "],
    and: ["* ", "\u0914\u0930 ", "\u0924\u0925\u093E "],
    but: ["* ", "\u092A\u0930 ", "\u092A\u0930\u0928\u094D\u0924\u0941 ", "\u0915\u093F\u0928\u094D\u0924\u0941 "]
  },
  hr: {
    name: "Croatian",
    native: "hrvatski",
    feature: ["Osobina", "Mogu\u0107nost", "Mogucnost"],
    rule: ["Rule"],
    background: ["Pozadina"],
    scenario: ["Primjer", "Scenarij"],
    scenarioOutline: ["Skica", "Koncept"],
    examples: ["Primjeri", "Scenariji"],
    given: ["* ", "Zadan ", "Zadani ", "Zadano ", "Ukoliko "],
    when: ["* ", "Kada ", "Kad "],
    then: ["* ", "Onda "],
    and: ["* ", "I "],
    but: ["* ", "Ali "]
  },
  ht: {
    name: "Creole",
    native: "krey\xF2l",
    feature: ["Karakteristik", "Mak", "Fonksyonalite"],
    rule: ["Rule"],
    background: ["Kont\xE8ks", "Istorik"],
    scenario: ["Senaryo"],
    scenarioOutline: [
      "Plan senaryo",
      "Plan Senaryo",
      "Senaryo deskripsyon",
      "Senaryo Deskripsyon",
      "Dyagram senaryo",
      "Dyagram Senaryo"
    ],
    examples: ["Egzanp"],
    given: ["* ", "Sipoze ", "Sipoze ke ", "Sipoze Ke "],
    when: ["* ", "L\xE8 ", "Le "],
    then: ["* ", "L\xE8 sa a ", "Le sa a "],
    and: ["* ", "Ak ", "Epi ", "E "],
    but: ["* ", "Men "]
  },
  hu: {
    name: "Hungarian",
    native: "magyar",
    feature: ["Jellemz\u0151"],
    rule: ["Szab\xE1ly"],
    background: ["H\xE1tt\xE9r"],
    scenario: ["P\xE9lda", "Forgat\xF3k\xF6nyv"],
    scenarioOutline: ["Forgat\xF3k\xF6nyv v\xE1zlat"],
    examples: ["P\xE9ld\xE1k"],
    given: ["* ", "Amennyiben ", "Adott "],
    when: ["* ", "Majd ", "Ha ", "Amikor "],
    then: ["* ", "Akkor "],
    and: ["* ", "\xC9s "],
    but: ["* ", "De "]
  },
  id: {
    name: "Indonesian",
    native: "Bahasa Indonesia",
    feature: ["Fitur"],
    rule: ["Rule", "Aturan"],
    background: ["Dasar", "Latar Belakang"],
    scenario: ["Skenario"],
    scenarioOutline: ["Skenario konsep", "Garis-Besar Skenario"],
    examples: ["Contoh", "Misal"],
    given: ["* ", "Dengan ", "Diketahui ", "Diasumsikan ", "Bila ", "Jika "],
    when: ["* ", "Ketika "],
    then: ["* ", "Maka ", "Kemudian "],
    and: ["* ", "Dan "],
    but: ["* ", "Tapi ", "Tetapi "]
  },
  is: {
    name: "Icelandic",
    native: "\xCDslenska",
    feature: ["Eiginleiki"],
    rule: ["Rule"],
    background: ["Bakgrunnur"],
    scenario: ["Atbur\xF0ar\xE1s"],
    scenarioOutline: ["L\xFDsing Atbur\xF0ar\xE1sar", "L\xFDsing D\xE6ma"],
    examples: ["D\xE6mi", "Atbur\xF0ar\xE1sir"],
    given: ["* ", "Ef "],
    when: ["* ", "\xDEegar "],
    then: ["* ", "\xDE\xE1 "],
    and: ["* ", "Og "],
    but: ["* ", "En "]
  },
  it: {
    name: "Italian",
    native: "italiano",
    feature: ["Funzionalit\xE0", "Esigenza di Business", "Abilit\xE0"],
    rule: ["Regola"],
    background: ["Contesto"],
    scenario: ["Esempio", "Scenario"],
    scenarioOutline: ["Schema dello scenario"],
    examples: ["Esempi"],
    given: ["* ", "Dato ", "Data ", "Dati ", "Date "],
    when: ["* ", "Quando "],
    then: ["* ", "Allora "],
    and: ["* ", "E ", "Ed "],
    but: ["* ", "Ma "]
  },
  ja: {
    name: "Japanese",
    native: "\u65E5\u672C\u8A9E",
    feature: ["\u30D5\u30A3\u30FC\u30C1\u30E3", "\u6A5F\u80FD"],
    rule: ["\u30EB\u30FC\u30EB"],
    background: ["\u80CC\u666F"],
    scenario: ["\u30B7\u30CA\u30EA\u30AA"],
    scenarioOutline: [
      "\u30B7\u30CA\u30EA\u30AA\u30A2\u30A6\u30C8\u30E9\u30A4\u30F3",
      "\u30B7\u30CA\u30EA\u30AA\u30C6\u30F3\u30D7\u30EC\u30FC\u30C8",
      "\u30C6\u30F3\u30D7\u30EC",
      "\u30B7\u30CA\u30EA\u30AA\u30C6\u30F3\u30D7\u30EC"
    ],
    examples: ["\u4F8B", "\u30B5\u30F3\u30D7\u30EB"],
    given: ["* ", "\u524D\u63D0"],
    when: ["* ", "\u3082\u3057"],
    then: ["* ", "\u306A\u3089\u3070"],
    and: ["* ", "\u4E14\u3064", "\u304B\u3064"],
    but: ["* ", "\u7136\u3057", "\u3057\u304B\u3057", "\u4F46\u3057", "\u305F\u3060\u3057"]
  },
  jv: {
    name: "Javanese",
    native: "Basa Jawa",
    feature: ["Fitur"],
    rule: ["Rule"],
    background: ["Dasar"],
    scenario: ["Skenario"],
    scenarioOutline: ["Konsep skenario"],
    examples: ["Conto", "Contone"],
    given: ["* ", "Nalika ", "Nalikaning "],
    when: ["* ", "Manawa ", "Menawa "],
    then: ["* ", "Njuk ", "Banjur "],
    and: ["* ", "Lan "],
    but: ["* ", "Tapi ", "Nanging ", "Ananging "]
  },
  ka: {
    name: "Georgian",
    native: "\u10E5\u10D0\u10E0\u10D7\u10E3\u10DA\u10D8",
    feature: ["\u10D7\u10D5\u10D8\u10E1\u10D4\u10D1\u10D0", "\u10DB\u10DD\u10D7\u10EE\u10DD\u10D5\u10DC\u10D0"],
    rule: ["\u10EC\u10D4\u10E1\u10D8"],
    background: ["\u10D9\u10DD\u10DC\u10E2\u10D4\u10E5\u10E1\u10E2\u10D8"],
    scenario: ["\u10DB\u10D0\u10D2\u10D0\u10DA\u10D8\u10D7\u10D0\u10D3", "\u10DB\u10D0\u10D2\u10D0\u10DA\u10D8\u10D7\u10D8", "\u10DB\u10D0\u10D2", "\u10E1\u10EA\u10D4\u10DC\u10D0\u10E0\u10D8"],
    scenarioOutline: [
      "\u10E1\u10EA\u10D4\u10DC\u10D0\u10E0\u10D8\u10E1 \u10DC\u10D8\u10DB\u10E3\u10E8\u10D8",
      "\u10E1\u10EA\u10D4\u10DC\u10D0\u10E0\u10D8\u10E1 \u10E8\u10D0\u10D1\u10DA\u10DD\u10DC\u10D8",
      "\u10DC\u10D8\u10DB\u10E3\u10E8\u10D8",
      "\u10E8\u10D0\u10D1\u10DA\u10DD\u10DC\u10D8"
    ],
    examples: ["\u10DB\u10D0\u10D2\u10D0\u10DA\u10D8\u10D7\u10D4\u10D1\u10D8"],
    given: ["* ", "\u10DB\u10DD\u10EA\u10D4\u10DB\u10E3\u10DA\u10D8 ", "\u10DB\u10DD\u10EA\u10D4\u10DB\u10E3\u10DA\u10D8\u10D0 ", "\u10D5\u10D7\u10E5\u10D5\u10D0\u10D7 "],
    when: ["* ", "\u10E0\u10DD\u10D3\u10D4\u10E1\u10D0\u10EA ", "\u10E0\u10DD\u10EA\u10D0 ", "\u10E0\u10DD\u10D2\u10DD\u10E0\u10EA \u10D9\u10D8 ", "\u10D7\u10E3 "],
    then: ["* ", "\u10DB\u10D0\u10E8\u10D8\u10DC "],
    and: ["* ", "\u10D3\u10D0 ", "\u10D0\u10E1\u10D4\u10D5\u10D4 "],
    but: ["* ", "\u10DB\u10D0\u10D2\u10E0\u10D0\u10DB ", "\u10D7\u10E3\u10DB\u10EA\u10D0 "]
  },
  kn: {
    name: "Kannada",
    native: "\u0C95\u0CA8\u0CCD\u0CA8\u0CA1",
    feature: ["\u0CB9\u0CC6\u0C9A\u0CCD\u0C9A\u0CB3"],
    rule: ["Rule"],
    background: ["\u0CB9\u0CBF\u0CA8\u0CCD\u0CA8\u0CC6\u0CB2\u0CC6"],
    scenario: ["\u0C89\u0CA6\u0CBE\u0CB9\u0CB0\u0CA3\u0CC6", "\u0C95\u0CA5\u0CBE\u0CB8\u0CBE\u0CB0\u0CBE\u0C82\u0CB6"],
    scenarioOutline: ["\u0CB5\u0CBF\u0CB5\u0CB0\u0CA3\u0CC6"],
    examples: ["\u0C89\u0CA6\u0CBE\u0CB9\u0CB0\u0CA3\u0CC6\u0C97\u0CB3\u0CC1"],
    given: ["* ", "\u0CA8\u0CBF\u0CD5\u0CA1\u0CBF\u0CA6 "],
    when: ["* ", "\u0CB8\u0CCD\u0CA5\u0CBF\u0CA4\u0CBF\u0CAF\u0CA8\u0CCD\u0CA8\u0CC1 "],
    then: ["* ", "\u0CA8\u0C82\u0CA4\u0CB0 "],
    and: ["* ", "\u0CAE\u0CA4\u0CCD\u0CA4\u0CC1 "],
    but: ["* ", "\u0C86\u0CA6\u0CB0\u0CC6 "]
  },
  ko: {
    name: "Korean",
    native: "\uD55C\uAD6D\uC5B4",
    feature: ["\uAE30\uB2A5"],
    rule: ["\uADDC\uCE59"],
    background: ["\uBC30\uACBD"],
    scenario: ["\uC2DC\uB098\uB9AC\uC624"],
    scenarioOutline: ["\uC2DC\uB098\uB9AC\uC624 \uAC1C\uC694"],
    examples: ["\uC608"],
    given: ["* ", "\uC870\uAC74 ", "\uBA3C\uC800 "],
    when: ["* ", "\uB9CC\uC77C ", "\uB9CC\uC57D "],
    then: ["* ", "\uADF8\uB7EC\uBA74 "],
    and: ["* ", "\uADF8\uB9AC\uACE0 "],
    but: ["* ", "\uD558\uC9C0\uB9CC ", "\uB2E8 "]
  },
  lt: {
    name: "Lithuanian",
    native: "lietuvi\u0173 kalba",
    feature: ["Savyb\u0117"],
    rule: ["Rule"],
    background: ["Kontekstas"],
    scenario: ["Pavyzdys", "Scenarijus"],
    scenarioOutline: ["Scenarijaus \u0161ablonas"],
    examples: ["Pavyzd\u017Eiai", "Scenarijai", "Variantai"],
    given: ["* ", "Duota "],
    when: ["* ", "Kai "],
    then: ["* ", "Tada "],
    and: ["* ", "Ir "],
    but: ["* ", "Bet "]
  },
  lu: {
    name: "Luxemburgish",
    native: "L\xEBtzebuergesch",
    feature: ["Funktionalit\xE9it"],
    rule: ["Rule"],
    background: ["Hannergrond"],
    scenario: ["Beispill", "Szenario"],
    scenarioOutline: ["Plang vum Szenario"],
    examples: ["Beispiller"],
    given: ["* ", "ugeholl "],
    when: ["* ", "wann "],
    then: ["* ", "dann "],
    and: ["* ", "an ", "a "],
    but: ["* ", "awer ", "m\xE4 "]
  },
  lv: {
    name: "Latvian",
    native: "latvie\u0161u",
    feature: ["Funkcionalit\u0101te", "F\u012B\u010Da"],
    rule: ["Rule"],
    background: ["Konteksts", "Situ\u0101cija"],
    scenario: ["Piem\u0113rs", "Scen\u0101rijs"],
    scenarioOutline: ["Scen\u0101rijs p\u0113c parauga"],
    examples: ["Piem\u0113ri", "Paraugs"],
    given: ["* ", "Kad "],
    when: ["* ", "Ja "],
    then: ["* ", "Tad "],
    and: ["* ", "Un "],
    but: ["* ", "Bet "]
  },
  "mk-Cyrl": {
    name: "Macedonian",
    native: "\u041C\u0430\u043A\u0435\u0434\u043E\u043D\u0441\u043A\u0438",
    feature: ["\u0424\u0443\u043D\u043A\u0446\u0438\u043E\u043D\u0430\u043B\u043D\u043E\u0441\u0442", "\u0411\u0438\u0437\u043D\u0438\u0441 \u043F\u043E\u0442\u0440\u0435\u0431\u0430", "\u041C\u043E\u0436\u043D\u043E\u0441\u0442"],
    rule: ["Rule"],
    background: ["\u041A\u043E\u043D\u0442\u0435\u043A\u0441\u0442", "\u0421\u043E\u0434\u0440\u0436\u0438\u043D\u0430"],
    scenario: ["\u041F\u0440\u0438\u043C\u0435\u0440", "\u0421\u0446\u0435\u043D\u0430\u0440\u0438\u043E", "\u041D\u0430 \u043F\u0440\u0438\u043C\u0435\u0440"],
    scenarioOutline: ["\u041F\u0440\u0435\u0433\u043B\u0435\u0434 \u043D\u0430 \u0441\u0446\u0435\u043D\u0430\u0440\u0438\u0458\u0430", "\u0421\u043A\u0438\u0446\u0430", "\u041A\u043E\u043D\u0446\u0435\u043F\u0442"],
    examples: ["\u041F\u0440\u0438\u043C\u0435\u0440\u0438", "\u0421\u0446\u0435\u043D\u0430\u0440\u0438\u0458\u0430"],
    given: ["* ", "\u0414\u0430\u0434\u0435\u043D\u043E ", "\u0414\u0430\u0434\u0435\u043D\u0430 "],
    when: ["* ", "\u041A\u043E\u0433\u0430 "],
    then: ["* ", "\u0422\u043E\u0433\u0430\u0448 "],
    and: ["* ", "\u0418 "],
    but: ["* ", "\u041D\u043E "]
  },
  "mk-Latn": {
    name: "Macedonian (Latin)",
    native: "Makedonski (Latinica)",
    feature: ["Funkcionalnost", "Biznis potreba", "Mozhnost"],
    rule: ["Rule"],
    background: ["Kontekst", "Sodrzhina"],
    scenario: ["Scenario", "Na primer"],
    scenarioOutline: ["Pregled na scenarija", "Skica", "Koncept"],
    examples: ["Primeri", "Scenaria"],
    given: ["* ", "Dadeno ", "Dadena "],
    when: ["* ", "Koga "],
    then: ["* ", "Togash "],
    and: ["* ", "I "],
    but: ["* ", "No "]
  },
  ml: {
    name: "Malayalam",
    native: "\u0D2E\u0D32\u0D2F\u0D3E\u0D33\u0D02",
    feature: ["\u0D38\u0D35\u0D3F\u0D36\u0D47\u0D37\u0D24"],
    rule: ["\u0D28\u0D3F\u0D2F\u0D2E\u0D02"],
    background: ["\u0D2A\u0D36\u0D4D\u0D1A\u0D3E\u0D24\u0D4D\u0D24\u0D32\u0D02"],
    scenario: ["\u0D30\u0D02\u0D17\u0D02"],
    scenarioOutline: ["\u0D38\u0D3E\u0D39\u0D1A\u0D30\u0D4D\u0D2F\u0D24\u0D4D\u0D24\u0D3F\u0D28\u0D4D\u0D31\u0D46 \u0D30\u0D42\u0D2A\u0D30\u0D47\u0D16"],
    examples: ["\u0D09\u0D26\u0D3E\u0D39\u0D30\u0D23\u0D19\u0D4D\u0D19\u0D7E"],
    given: ["* ", "\u0D28\u0D7D\u0D15\u0D3F\u0D2F\u0D24\u0D4D"],
    when: ["\u0D0E\u0D2A\u0D4D\u0D2A\u0D47\u0D3E\u0D7E"],
    then: ["* ", "\u0D2A\u0D3F\u0D28\u0D4D\u0D28\u0D46"],
    and: ["* ", "\u0D12\u0D2A\u0D4D\u0D2A\u0D02"],
    but: ["* ", "\u0D2A\u0D15\u0D4D\u0D37\u0D47"]
  },
  mn: {
    name: "Mongolian",
    native: "\u043C\u043E\u043D\u0433\u043E\u043B",
    feature: ["\u0424\u0443\u043D\u043A\u0446", "\u0424\u0443\u043D\u043A\u0446\u0438\u043E\u043D\u0430\u043B"],
    rule: ["Rule"],
    background: ["\u0410\u0433\u0443\u0443\u043B\u0433\u0430"],
    scenario: ["\u0421\u0446\u0435\u043D\u0430\u0440"],
    scenarioOutline: ["\u0421\u0446\u0435\u043D\u0430\u0440\u044B\u043D \u0442\u04E9\u043B\u04E9\u0432\u043B\u04E9\u0433\u04E9\u04E9"],
    examples: ["\u0422\u0443\u0445\u0430\u0439\u043B\u0431\u0430\u043B"],
    given: ["* ", "\u04E8\u0433\u04E9\u0433\u0434\u0441\u04E9\u043D \u043D\u044C ", "\u0410\u043D\u0445 "],
    when: ["* ", "\u0425\u044D\u0440\u044D\u0432 "],
    then: ["* ", "\u0422\u044D\u0433\u044D\u0445\u044D\u0434 ", "\u04AE\u04AF\u043D\u0438\u0439 \u0434\u0430\u0440\u0430\u0430 "],
    and: ["* ", "\u041C\u04E9\u043D ", "\u0422\u044D\u0433\u044D\u044D\u0434 "],
    but: ["* ", "\u0413\u044D\u0445\u0434\u044D\u044D ", "\u0425\u0430\u0440\u0438\u043D "]
  },
  mr: {
    name: "Marathi",
    native: "\u092E\u0930\u093E\u0920\u0940",
    feature: ["\u0935\u0948\u0936\u093F\u0937\u094D\u091F\u094D\u092F", "\u0938\u0941\u0935\u093F\u0927\u093E"],
    rule: ["\u0928\u093F\u092F\u092E"],
    background: ["\u092A\u093E\u0930\u094D\u0936\u094D\u0935\u092D\u0942\u092E\u0940"],
    scenario: ["\u092A\u0930\u093F\u0926\u0943\u0936\u094D\u092F"],
    scenarioOutline: ["\u092A\u0930\u093F\u0926\u0943\u0936\u094D\u092F \u0930\u0942\u092A\u0930\u0947\u0916\u093E"],
    examples: ["\u0909\u0926\u093E\u0939\u0930\u0923"],
    given: ["* ", "\u091C\u0930", "\u0926\u093F\u0932\u0947\u0932\u094D\u092F\u093E \u092A\u094D\u0930\u092E\u093E\u0923\u0947 "],
    when: ["* ", "\u091C\u0947\u0935\u094D\u0939\u093E "],
    then: ["* ", "\u092E\u0917 ", "\u0924\u0947\u0935\u094D\u0939\u093E "],
    and: ["* ", "\u0906\u0923\u093F ", "\u0924\u0938\u0947\u091A "],
    but: ["* ", "\u092A\u0923 ", "\u092A\u0930\u0902\u0924\u0941 "]
  },
  ne: {
    name: "Nepali",
    native: "\u0928\u0947\u092A\u093E\u0932\u0940",
    feature: ["\u0938\u0941\u0935\u093F\u0927\u093E", "\u0935\u093F\u0936\u0947\u0937\u0924\u093E"],
    rule: ["\u0928\u093F\u092F\u092E"],
    background: ["\u092A\u0943\u0937\u094D\u0920\u092D\u0942\u092E\u0940"],
    scenario: ["\u092A\u0930\u093F\u0926\u0943\u0936\u094D\u092F"],
    scenarioOutline: ["\u092A\u0930\u093F\u0926\u0943\u0936\u094D\u092F \u0930\u0942\u092A\u0930\u0947\u0916\u093E"],
    examples: ["\u0909\u0926\u093E\u0939\u0930\u0923", "\u0909\u0926\u093E\u0939\u0930\u0923\u0939\u0930\u0941"],
    given: ["* ", "\u0926\u093F\u0907\u090F\u0915\u094B ", "\u0926\u093F\u090F\u0915\u094B ", "\u092F\u0926\u093F "],
    when: ["* ", "\u091C\u092C "],
    then: ["* ", "\u0924\u094D\u092F\u0938\u092A\u091B\u093F ", "\u0905\u0928\u0940 "],
    and: ["* ", "\u0930 ", "\u0905\u0928\u093F "],
    but: ["* ", "\u0924\u0930 "]
  },
  nl: {
    name: "Dutch",
    native: "Nederlands",
    feature: ["Functionaliteit"],
    rule: ["Regel"],
    background: ["Achtergrond"],
    scenario: ["Voorbeeld", "Scenario"],
    scenarioOutline: ["Abstract Scenario"],
    examples: ["Voorbeelden"],
    given: ["* ", "Gegeven ", "Stel "],
    when: ["* ", "Als ", "Wanneer "],
    then: ["* ", "Dan "],
    and: ["* ", "En "],
    but: ["* ", "Maar "]
  },
  no: {
    name: "Norwegian",
    native: "norsk",
    feature: ["Egenskap"],
    rule: ["Regel"],
    background: ["Bakgrunn"],
    scenario: ["Eksempel", "Scenario"],
    scenarioOutline: ["Scenariomal", "Abstrakt Scenario"],
    examples: ["Eksempler"],
    given: ["* ", "Gitt "],
    when: ["* ", "N\xE5r "],
    then: ["* ", "S\xE5 "],
    and: ["* ", "Og "],
    but: ["* ", "Men "]
  },
  pa: {
    name: "Panjabi",
    native: "\u0A2A\u0A70\u0A1C\u0A3E\u0A2C\u0A40",
    feature: ["\u0A16\u0A3E\u0A38\u0A40\u0A05\u0A24", "\u0A2E\u0A41\u0A39\u0A3E\u0A02\u0A26\u0A30\u0A3E", "\u0A28\u0A15\u0A36 \u0A28\u0A41\u0A39\u0A3E\u0A30"],
    rule: ["Rule"],
    background: ["\u0A2A\u0A3F\u0A1B\u0A4B\u0A15\u0A5C"],
    scenario: ["\u0A09\u0A26\u0A3E\u0A39\u0A30\u0A28", "\u0A2A\u0A1F\u0A15\u0A25\u0A3E"],
    scenarioOutline: ["\u0A2A\u0A1F\u0A15\u0A25\u0A3E \u0A22\u0A3E\u0A02\u0A1A\u0A3E", "\u0A2A\u0A1F\u0A15\u0A25\u0A3E \u0A30\u0A42\u0A2A \u0A30\u0A47\u0A16\u0A3E"],
    examples: ["\u0A09\u0A26\u0A3E\u0A39\u0A30\u0A28\u0A3E\u0A02"],
    given: ["* ", "\u0A1C\u0A47\u0A15\u0A30 ", "\u0A1C\u0A3F\u0A35\u0A47\u0A02 \u0A15\u0A3F "],
    when: ["* ", "\u0A1C\u0A26\u0A4B\u0A02 "],
    then: ["* ", "\u0A24\u0A26 "],
    and: ["* ", "\u0A05\u0A24\u0A47 "],
    but: ["* ", "\u0A2A\u0A30 "]
  },
  pl: {
    name: "Polish",
    native: "polski",
    feature: ["W\u0142a\u015Bciwo\u015B\u0107", "Funkcja", "Aspekt", "Potrzeba biznesowa"],
    rule: ["Zasada", "Regu\u0142a"],
    background: ["Za\u0142o\u017Cenia"],
    scenario: ["Przyk\u0142ad", "Scenariusz"],
    scenarioOutline: ["Szablon scenariusza"],
    examples: ["Przyk\u0142ady"],
    given: ["* ", "Zak\u0142adaj\u0105c ", "Maj\u0105c ", "Zak\u0142adaj\u0105c, \u017Ce "],
    when: ["* ", "Je\u017Celi ", "Je\u015Bli ", "Gdy ", "Kiedy "],
    then: ["* ", "Wtedy "],
    and: ["* ", "Oraz ", "I "],
    but: ["* ", "Ale "]
  },
  pt: {
    name: "Portuguese",
    native: "portugu\xEAs",
    feature: ["Funcionalidade", "Caracter\xEDstica", "Caracteristica"],
    rule: ["Regra"],
    background: ["Contexto", "Cen\xE1rio de Fundo", "Cenario de Fundo", "Fundo"],
    scenario: ["Exemplo", "Cen\xE1rio", "Cenario"],
    scenarioOutline: [
      "Esquema do Cen\xE1rio",
      "Esquema do Cenario",
      "Delinea\xE7\xE3o do Cen\xE1rio",
      "Delineacao do Cenario"
    ],
    examples: ["Exemplos", "Cen\xE1rios", "Cenarios"],
    given: ["* ", "Dado ", "Dada ", "Dados ", "Dadas "],
    when: ["* ", "Quando "],
    then: ["* ", "Ent\xE3o ", "Entao "],
    and: ["* ", "E "],
    but: ["* ", "Mas "]
  },
  ro: {
    name: "Romanian",
    native: "rom\xE2n\u0103",
    feature: ["Functionalitate", "Func\u021Bionalitate", "Func\u0163ionalitate"],
    rule: ["Rule"],
    background: ["Context"],
    scenario: ["Exemplu", "Scenariu"],
    scenarioOutline: ["Structura scenariu", "Structur\u0103 scenariu"],
    examples: ["Exemple"],
    given: [
      "* ",
      "Date fiind ",
      "Dat fiind ",
      "Dat\u0103 fiind",
      "Dati fiind ",
      "Da\u021Bi fiind ",
      "Da\u0163i fiind "
    ],
    when: ["* ", "Cand ", "C\xE2nd "],
    then: ["* ", "Atunci "],
    and: ["* ", "Si ", "\u0218i ", "\u015Ei "],
    but: ["* ", "Dar "]
  },
  ru: {
    name: "Russian",
    native: "\u0440\u0443\u0441\u0441\u043A\u0438\u0439",
    feature: [
      "\u0424\u0443\u043D\u043A\u0446\u0438\u044F",
      "\u0424\u0443\u043D\u043A\u0446\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u043E\u0441\u0442\u044C",
      "\u0424\u0443\u043D\u043A\u0446\u0438\u043E\u043D\u0430\u043B",
      "\u0421\u0432\u043E\u0439\u0441\u0442\u0432\u043E",
      "\u0424\u0438\u0447\u0430"
    ],
    rule: ["\u041F\u0440\u0430\u0432\u0438\u043B\u043E"],
    background: ["\u041F\u0440\u0435\u0434\u044B\u0441\u0442\u043E\u0440\u0438\u044F", "\u041A\u043E\u043D\u0442\u0435\u043A\u0441\u0442"],
    scenario: ["\u041F\u0440\u0438\u043C\u0435\u0440", "\u0421\u0446\u0435\u043D\u0430\u0440\u0438\u0439"],
    scenarioOutline: ["\u0421\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0430 \u0441\u0446\u0435\u043D\u0430\u0440\u0438\u044F", "\u0428\u0430\u0431\u043B\u043E\u043D \u0441\u0446\u0435\u043D\u0430\u0440\u0438\u044F"],
    examples: ["\u041F\u0440\u0438\u043C\u0435\u0440\u044B", "\u0417\u043D\u0430\u0447\u0435\u043D\u0438\u044F"],
    given: ["* ", "\u0414\u043E\u043F\u0443\u0441\u0442\u0438\u043C ", "\u0414\u0430\u043D\u043E ", "\u041F\u0443\u0441\u0442\u044C "],
    when: ["* ", "\u041A\u043E\u0433\u0434\u0430 ", "\u0415\u0441\u043B\u0438 "],
    then: ["* ", "\u0422\u043E ", "\u0417\u0430\u0442\u0435\u043C ", "\u0422\u043E\u0433\u0434\u0430 "],
    and: ["* ", "\u0418 ", "\u041A \u0442\u043E\u043C\u0443 \u0436\u0435 ", "\u0422\u0430\u043A\u0436\u0435 "],
    but: ["* ", "\u041D\u043E ", "\u0410 ", "\u0418\u043D\u0430\u0447\u0435 "]
  },
  sk: {
    name: "Slovak",
    native: "Slovensky",
    feature: ["Po\u017Eiadavka", "Funkcia", "Vlastnos\u0165"],
    rule: ["Rule"],
    background: ["Pozadie"],
    scenario: ["Pr\xEDklad", "Scen\xE1r"],
    scenarioOutline: ["N\xE1\u010Drt Scen\xE1ru", "N\xE1\u010Drt Scen\xE1ra", "Osnova Scen\xE1ra"],
    examples: ["Pr\xEDklady"],
    given: ["* ", "Pokia\u013E ", "Za predpokladu "],
    when: ["* ", "Ke\u010F ", "Ak "],
    then: ["* ", "Tak ", "Potom "],
    and: ["* ", "A ", "A tie\u017E ", "A taktie\u017E ", "A z\xE1rove\u0148 "],
    but: ["* ", "Ale "]
  },
  sl: {
    name: "Slovenian",
    native: "Slovenski",
    feature: [
      "Funkcionalnost",
      "Funkcija",
      "Mo\u017Enosti",
      "Moznosti",
      "Lastnost",
      "Zna\u010Dilnost"
    ],
    rule: ["Rule"],
    background: ["Kontekst", "Osnova", "Ozadje"],
    scenario: ["Primer", "Scenarij"],
    scenarioOutline: [
      "Struktura scenarija",
      "Skica",
      "Koncept",
      "Oris scenarija",
      "Osnutek"
    ],
    examples: ["Primeri", "Scenariji"],
    given: ["Dano ", "Podano ", "Zaradi ", "Privzeto "],
    when: ["Ko ", "Ce ", "\u010Ce ", "Kadar "],
    then: ["Nato ", "Potem ", "Takrat "],
    and: ["In ", "Ter "],
    but: ["Toda ", "Ampak ", "Vendar "]
  },
  "sr-Cyrl": {
    name: "Serbian",
    native: "\u0421\u0440\u043F\u0441\u043A\u0438",
    feature: ["\u0424\u0443\u043D\u043A\u0446\u0438\u043E\u043D\u0430\u043B\u043D\u043E\u0441\u0442", "\u041C\u043E\u0433\u0443\u045B\u043D\u043E\u0441\u0442", "\u041E\u0441\u043E\u0431\u0438\u043D\u0430"],
    rule: ["\u041F\u0440\u0430\u0432\u0438\u043B\u043E"],
    background: ["\u041A\u043E\u043D\u0442\u0435\u043A\u0441\u0442", "\u041E\u0441\u043D\u043E\u0432\u0430", "\u041F\u043E\u0437\u0430\u0434\u0438\u043D\u0430"],
    scenario: ["\u0421\u0446\u0435\u043D\u0430\u0440\u0438\u043E", "\u041F\u0440\u0438\u043C\u0435\u0440"],
    scenarioOutline: ["\u0421\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0430 \u0441\u0446\u0435\u043D\u0430\u0440\u0438\u0458\u0430", "\u0421\u043A\u0438\u0446\u0430", "\u041A\u043E\u043D\u0446\u0435\u043F\u0442"],
    examples: ["\u041F\u0440\u0438\u043C\u0435\u0440\u0438", "\u0421\u0446\u0435\u043D\u0430\u0440\u0438\u0458\u0438"],
    given: ["* ", "\u0417\u0430 \u0434\u0430\u0442\u043E ", "\u0417\u0430 \u0434\u0430\u0442\u0435 ", "\u0417\u0430 \u0434\u0430\u0442\u0438 "],
    when: ["* ", "\u041A\u0430\u0434\u0430 ", "\u041A\u0430\u0434 "],
    then: ["* ", "\u041E\u043D\u0434\u0430 "],
    and: ["* ", "\u0418 "],
    but: ["* ", "\u0410\u043B\u0438 "]
  },
  "sr-Latn": {
    name: "Serbian (Latin)",
    native: "Srpski (Latinica)",
    feature: ["Funkcionalnost", "Mogu\u0107nost", "Mogucnost", "Osobina"],
    rule: ["Pravilo"],
    background: ["Kontekst", "Osnova", "Pozadina"],
    scenario: ["Scenario", "Primer"],
    scenarioOutline: ["Struktura scenarija", "Skica", "Koncept"],
    examples: ["Primeri", "Scenariji"],
    given: ["* ", "Za dato ", "Za date ", "Za dati "],
    when: ["* ", "Kada ", "Kad "],
    then: ["* ", "Onda "],
    and: ["* ", "I "],
    but: ["* ", "Ali "]
  },
  sv: {
    name: "Swedish",
    native: "Svenska",
    feature: ["Egenskap"],
    rule: ["Regel"],
    background: ["Bakgrund"],
    scenario: ["Scenario"],
    scenarioOutline: ["Abstrakt Scenario", "Scenariomall"],
    examples: ["Exempel"],
    given: ["* ", "Givet "],
    when: ["* ", "N\xE4r "],
    then: ["* ", "S\xE5 "],
    and: ["* ", "Och "],
    but: ["* ", "Men "]
  },
  ta: {
    name: "Tamil",
    native: "\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD",
    feature: ["\u0B85\u0BAE\u0BCD\u0B9A\u0BAE\u0BCD", "\u0BB5\u0BA3\u0BBF\u0B95 \u0BA4\u0BC7\u0BB5\u0BC8", "\u0BA4\u0BBF\u0BB1\u0BA9\u0BCD"],
    rule: ["Rule"],
    background: ["\u0BAA\u0BBF\u0BA9\u0BCD\u0BA9\u0BA3\u0BBF"],
    scenario: ["\u0B89\u0BA4\u0BBE\u0BB0\u0BA3\u0BAE\u0BBE\u0B95", "\u0B95\u0BBE\u0B9F\u0BCD\u0B9A\u0BBF"],
    scenarioOutline: ["\u0B95\u0BBE\u0B9F\u0BCD\u0B9A\u0BBF \u0B9A\u0BC1\u0BB0\u0BC1\u0B95\u0BCD\u0B95\u0BAE\u0BCD", "\u0B95\u0BBE\u0B9F\u0BCD\u0B9A\u0BBF \u0BB5\u0BBE\u0BB0\u0BCD\u0BAA\u0BCD\u0BAA\u0BC1\u0BB0\u0BC1"],
    examples: ["\u0B8E\u0B9F\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1\u0B95\u0BCD\u0B95\u0BBE\u0B9F\u0BCD\u0B9F\u0BC1\u0B95\u0BB3\u0BCD", "\u0B95\u0BBE\u0B9F\u0BCD\u0B9A\u0BBF\u0B95\u0BB3\u0BCD", "\u0BA8\u0BBF\u0BB2\u0BC8\u0BAE\u0BC8\u0B95\u0BB3\u0BBF\u0BB2\u0BCD"],
    given: ["* ", "\u0B95\u0BC6\u0BBE\u0B9F\u0BC1\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F "],
    when: ["* ", "\u0B8E\u0BAA\u0BCD\u0BAA\u0BC7\u0BBE\u0BA4\u0BC1 "],
    then: ["* ", "\u0B85\u0BAA\u0BCD\u0BAA\u0BC6\u0BBE\u0BB4\u0BC1\u0BA4\u0BC1 "],
    and: ["* ", "\u0BAE\u0BC7\u0BB2\u0BC1\u0BAE\u0BCD ", "\u0BAE\u0BB1\u0BCD\u0BB1\u0BC1\u0BAE\u0BCD "],
    but: ["* ", "\u0B86\u0BA9\u0BBE\u0BB2\u0BCD "]
  },
  te: {
    name: "Telugu",
    native: "\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41",
    feature: ["\u0C17\u0C41\u0C23\u0C2E\u0C41"],
    rule: ["Rule"],
    background: ["\u0C28\u0C47\u0C2A\u0C25\u0C4D\u0C2F\u0C02"],
    scenario: ["\u0C09\u0C26\u0C3E\u0C39\u0C30\u0C23", "\u0C38\u0C28\u0C4D\u0C28\u0C3F\u0C35\u0C47\u0C36\u0C02"],
    scenarioOutline: ["\u0C15\u0C25\u0C28\u0C02"],
    examples: ["\u0C09\u0C26\u0C3E\u0C39\u0C30\u0C23\u0C32\u0C41"],
    given: ["* ", "\u0C1A\u0C46\u0C2A\u0C4D\u0C2A\u0C2C\u0C21\u0C3F\u0C28\u0C26\u0C3F "],
    when: ["* ", "\u0C08 \u0C2A\u0C30\u0C3F\u0C38\u0C4D\u0C25\u0C3F\u0C24\u0C3F\u0C32\u0C4B "],
    then: ["* ", "\u0C05\u0C2A\u0C4D\u0C2A\u0C41\u0C21\u0C41 "],
    and: ["* ", "\u0C2E\u0C30\u0C3F\u0C2F\u0C41 "],
    but: ["* ", "\u0C15\u0C3E\u0C28\u0C3F "]
  },
  th: {
    name: "Thai",
    native: "\u0E44\u0E17\u0E22",
    feature: ["\u0E42\u0E04\u0E23\u0E07\u0E2B\u0E25\u0E31\u0E01", "\u0E04\u0E27\u0E32\u0E21\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E17\u0E32\u0E07\u0E18\u0E38\u0E23\u0E01\u0E34\u0E08", "\u0E04\u0E27\u0E32\u0E21\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16"],
    rule: ["Rule"],
    background: ["\u0E41\u0E19\u0E27\u0E04\u0E34\u0E14"],
    scenario: ["\u0E40\u0E2B\u0E15\u0E38\u0E01\u0E32\u0E23\u0E13\u0E4C"],
    scenarioOutline: ["\u0E2A\u0E23\u0E38\u0E1B\u0E40\u0E2B\u0E15\u0E38\u0E01\u0E32\u0E23\u0E13\u0E4C", "\u0E42\u0E04\u0E23\u0E07\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E02\u0E2D\u0E07\u0E40\u0E2B\u0E15\u0E38\u0E01\u0E32\u0E23\u0E13\u0E4C"],
    examples: ["\u0E0A\u0E38\u0E14\u0E02\u0E2D\u0E07\u0E15\u0E31\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07", "\u0E0A\u0E38\u0E14\u0E02\u0E2D\u0E07\u0E40\u0E2B\u0E15\u0E38\u0E01\u0E32\u0E23\u0E13\u0E4C"],
    given: ["* ", "\u0E01\u0E33\u0E2B\u0E19\u0E14\u0E43\u0E2B\u0E49 "],
    when: ["* ", "\u0E40\u0E21\u0E37\u0E48\u0E2D "],
    then: ["* ", "\u0E14\u0E31\u0E07\u0E19\u0E31\u0E49\u0E19 "],
    and: ["* ", "\u0E41\u0E25\u0E30 "],
    but: ["* ", "\u0E41\u0E15\u0E48 "]
  },
  tlh: {
    name: "Klingon",
    native: "tlhIngan",
    feature: ["Qap", "Qu'meH 'ut", "perbogh", "poQbogh malja'", "laH"],
    rule: ["Rule"],
    background: ["mo'"],
    scenario: ["lut"],
    scenarioOutline: ["lut chovnatlh"],
    examples: ["ghantoH", "lutmey"],
    given: ["* ", "ghu' noblu' ", "DaH ghu' bejlu' "],
    when: ["* ", "qaSDI' "],
    then: ["* ", "vaj "],
    and: ["* ", "'ej ", "latlh "],
    but: ["* ", "'ach ", "'a "]
  },
  tr: {
    name: "Turkish",
    native: "T\xFCrk\xE7e",
    feature: [
      "\xD6zellik",
      "\u0130\u015F Gereksinimi",
      "Gereksinim",
      "\u0130\u015Flev",
      "Kullan\u0131c\u0131 Hikayesi",
      "Yetenek",
      "Teknik Gereksinim"
    ],
    rule: ["Kural", "\u0130\u015F Kural\u0131", "Kaide", "H\xFCk\xFCm", "Madde"],
    background: [
      "Ge\xE7mi\u015F",
      "Arka Plan",
      "\xD6n Ko\u015Ful",
      "\xD6nko\u015Ful",
      "\xD6nceki Durum",
      "Giri\u015F",
      "Mukaddime",
      "Mevcut Durum"
    ],
    scenario: ["\xD6rnek", "Senaryo", "Durum", "Vaka"],
    scenarioOutline: ["Senaryo tasla\u011F\u0131", "Senaryo \u015Fablonu"],
    examples: ["\xD6rnekler", "De\u011Ferler"],
    given: [
      "* ",
      "Mevcut ",
      "\xD6nceden ",
      "Ge\xE7mi\u015Fte ",
      "Daha \xF6nce ",
      "Halihaz\u0131rda ",
      "Zaten ",
      "Sistemde ",
      "Diyelim ki ",
      "Varsayal\u0131m ki ",
      "Farz edelim ki ",
      "Kabul edelim ki ",
      "Ba\u015Flang\u0131\xE7ta ",
      "Varsay\u0131lan olarak ",
      "Biliniyor ki "
    ],
    when: ["* ", "E\u011Fer ", "E\u011Fer ki ", "Ne zaman ", "Ne zaman ki ", "\u015Eayet "],
    then: [
      "* ",
      "Beklenen ",
      "O zaman ",
      "Sonu\xE7 olarak ",
      "B\xF6ylece ",
      "Bunun \xFCzerine ",
      "Bu durumda ",
      "O takdirde ",
      "\u015Eu halde ",
      "Netice itibariyle ",
      "Buna binaen "
    ],
    and: [
      "* ",
      "Ve ",
      "Hem de ",
      "Bir de ",
      "Ayr\u0131ca ",
      "\u0130laveten ",
      "Buna ek olarak "
    ],
    but: [
      "* ",
      "Fakat ",
      "Ama ",
      "Ancak ",
      "Yaln\u0131z ",
      "Lakin ",
      "Me\u011Fer ki ",
      "Buna mukabil ",
      "Aksi halde "
    ]
  },
  tt: {
    name: "Tatar",
    native: "\u0422\u0430\u0442\u0430\u0440\u0447\u0430",
    feature: ["\u041C\u04E9\u043C\u043A\u0438\u043D\u043B\u0435\u043A", "\u04AE\u0437\u0435\u043D\u0447\u04D9\u043B\u0435\u043A\u043B\u0435\u043B\u0435\u043A"],
    rule: ["Rule"],
    background: ["\u041A\u0435\u0440\u0435\u0448"],
    scenario: ["\u0421\u0446\u0435\u043D\u0430\u0440\u0438\u0439"],
    scenarioOutline: ["\u0421\u0446\u0435\u043D\u0430\u0440\u0438\u0439\u043D\u044B\u04A3 \u0442\u04E9\u0437\u0435\u043B\u0435\u0448\u0435"],
    examples: ["\u04AE\u0440\u043D\u04D9\u043A\u043B\u04D9\u0440", "\u041C\u0438\u0441\u0430\u043B\u043B\u0430\u0440"],
    given: ["* ", "\u04D8\u0439\u0442\u0438\u043A "],
    when: ["* ", "\u04D8\u0433\u04D9\u0440 "],
    then: ["* ", "\u041D\u04D9\u0442\u0438\u0497\u04D9\u0434\u04D9 "],
    and: ["* ", "\u04BA\u04D9\u043C ", "\u0412\u04D9 "],
    but: ["* ", "\u041B\u04D9\u043A\u0438\u043D ", "\u04D8\u043C\u043C\u0430 "]
  },
  uk: {
    name: "Ukrainian",
    native: "\u0423\u043A\u0440\u0430\u0457\u043D\u0441\u044C\u043A\u0430",
    feature: ["\u0424\u0443\u043D\u043A\u0446\u0456\u043E\u043D\u0430\u043B"],
    rule: ["Rule"],
    background: ["\u041F\u0435\u0440\u0435\u0434\u0443\u043C\u043E\u0432\u0430"],
    scenario: ["\u041F\u0440\u0438\u043A\u043B\u0430\u0434", "\u0421\u0446\u0435\u043D\u0430\u0440\u0456\u0439"],
    scenarioOutline: ["\u0421\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0430 \u0441\u0446\u0435\u043D\u0430\u0440\u0456\u044E"],
    examples: ["\u041F\u0440\u0438\u043A\u043B\u0430\u0434\u0438"],
    given: ["* ", "\u041F\u0440\u0438\u043F\u0443\u0441\u0442\u0438\u043C\u043E ", "\u041F\u0440\u0438\u043F\u0443\u0441\u0442\u0438\u043C\u043E, \u0449\u043E ", "\u041D\u0435\u0445\u0430\u0439 ", "\u0414\u0430\u043D\u043E "],
    when: ["* ", "\u042F\u043A\u0449\u043E ", "\u041A\u043E\u043B\u0438 "],
    then: ["* ", "\u0422\u043E ", "\u0422\u043E\u0434\u0456 "],
    and: ["* ", "\u0406 ", "\u0410 \u0442\u0430\u043A\u043E\u0436 ", "\u0422\u0430 "],
    but: ["* ", "\u0410\u043B\u0435 "]
  },
  ur: {
    name: "Urdu",
    native: "\u0627\u0631\u062F\u0648",
    feature: ["\u0635\u0644\u0627\u062D\u06CC\u062A", "\u06A9\u0627\u0631\u0648\u0628\u0627\u0631 \u06A9\u06CC \u0636\u0631\u0648\u0631\u062A", "\u062E\u0635\u0648\u0635\u06CC\u062A"],
    rule: ["Rule"],
    background: ["\u067E\u0633 \u0645\u0646\u0638\u0631"],
    scenario: ["\u0645\u0646\u0638\u0631\u0646\u0627\u0645\u06C1"],
    scenarioOutline: ["\u0645\u0646\u0638\u0631 \u0646\u0627\u0645\u06D2 \u06A9\u0627 \u062E\u0627\u06A9\u06C1"],
    examples: ["\u0645\u062B\u0627\u0644\u06CC\u06BA"],
    given: ["* ", "\u0627\u06AF\u0631 ", "\u0628\u0627\u0644\u0641\u0631\u0636 ", "\u0641\u0631\u0636 \u06A9\u06CC\u0627 "],
    when: ["* ", "\u062C\u0628 "],
    then: ["* ", "\u067E\u06BE\u0631 ", "\u062A\u0628 "],
    and: ["* ", "\u0627\u0648\u0631 "],
    but: ["* ", "\u0644\u06CC\u06A9\u0646 "]
  },
  uz: {
    name: "Uzbek",
    native: "\u0423\u0437\u0431\u0435\u043A\u0447\u0430",
    feature: ["\u0424\u0443\u043D\u043A\u0446\u0438\u043E\u043D\u0430\u043B"],
    rule: ["Rule"],
    background: ["\u0422\u0430\u0440\u0438\u0445"],
    scenario: ["\u0421\u0446\u0435\u043D\u0430\u0440\u0438\u0439"],
    scenarioOutline: ["\u0421\u0446\u0435\u043D\u0430\u0440\u0438\u0439 \u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0430\u0441\u0438"],
    examples: ["\u041C\u0438\u0441\u043E\u043B\u043B\u0430\u0440"],
    given: ["* ", "Belgilangan "],
    when: ["* ", "\u0410\u0433\u0430\u0440 "],
    then: ["* ", "\u0423\u043D\u0434\u0430 "],
    and: ["* ", "\u0412\u0430 "],
    but: ["* ", "\u041B\u0435\u043A\u0438\u043D ", "\u0411\u0438\u0440\u043E\u043A ", "\u0410\u043C\u043C\u043E "]
  },
  vi: {
    name: "Vietnamese",
    native: "Ti\u1EBFng Vi\u1EC7t",
    feature: ["T\xEDnh n\u0103ng"],
    rule: ["Quy t\u1EAFc"],
    background: ["B\u1ED1i c\u1EA3nh"],
    scenario: ["T\xECnh hu\u1ED1ng", "K\u1ECBch b\u1EA3n"],
    scenarioOutline: ["Khung t\xECnh hu\u1ED1ng", "Khung k\u1ECBch b\u1EA3n"],
    examples: ["D\u1EEF li\u1EC7u"],
    given: ["* ", "Bi\u1EBFt ", "Cho "],
    when: ["* ", "Khi "],
    then: ["* ", "Th\xEC "],
    and: ["* ", "V\xE0 "],
    but: ["* ", "Nh\u01B0ng "]
  },
  "zh-CN": {
    name: "Chinese simplified",
    native: "\u7B80\u4F53\u4E2D\u6587",
    feature: ["\u529F\u80FD"],
    rule: ["Rule", "\u89C4\u5219"],
    background: ["\u80CC\u666F"],
    scenario: ["\u573A\u666F", "\u5267\u672C"],
    scenarioOutline: ["\u573A\u666F\u5927\u7EB2", "\u5267\u672C\u5927\u7EB2"],
    examples: ["\u4F8B\u5B50"],
    given: ["* ", "\u5047\u5982", "\u5047\u8BBE", "\u5047\u5B9A"],
    when: ["* ", "\u5F53"],
    then: ["* ", "\u90A3\u4E48"],
    and: ["* ", "\u800C\u4E14", "\u5E76\u4E14", "\u540C\u65F6"],
    but: ["* ", "\u4F46\u662F"]
  },
  "zh-TW": {
    name: "Chinese traditional",
    native: "\u7E41\u9AD4\u4E2D\u6587",
    feature: ["\u529F\u80FD"],
    rule: ["Rule"],
    background: ["\u80CC\u666F"],
    scenario: ["\u5834\u666F", "\u5287\u672C"],
    scenarioOutline: ["\u5834\u666F\u5927\u7DB1", "\u5287\u672C\u5927\u7DB1"],
    examples: ["\u4F8B\u5B50"],
    given: ["* ", "\u5047\u5982", "\u5047\u8A2D", "\u5047\u5B9A"],
    when: ["* ", "\u7576"],
    then: ["* ", "\u90A3\u9EBC"],
    and: ["* ", "\u800C\u4E14", "\u4E26\u4E14", "\u540C\u6642"],
    but: ["* ", "\u4F46\u662F"]
  }
};

// src/featureParser.ts
var languagePattern = /^\s*#\s*language\s*:\s*([a-zA-Z\-_]+)\s*$/;
function dialectFor(code) {
  if (!code) return void 0;
  return dialects_default[code];
}
function parseFeature(contents) {
  const lines = contents.split(/\r?\n/);
  const language = detectLanguage(lines);
  const dialect = dialectFor(language) ?? dialectFor("en");
  const stepKeywords = [
    ["given", dialect.given],
    ["when", dialect.when],
    ["then", dialect.then],
    ["and", dialect.and],
    ["but", dialect.but]
  ];
  const steps = [];
  let inDocString = false;
  let docStringFence = "";
  let lastEffective;
  const blockOpeners = [
    ...dialect.feature,
    ...dialect.rule,
    ...dialect.background,
    ...dialect.scenario,
    ...dialect.scenarioOutline,
    ...dialect.examples,
    "After:"
  ];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trimEnd();
    if (inDocString) {
      if (line.trim().startsWith(docStringFence)) inDocString = false;
      continue;
    }
    if (line.trim().startsWith('"""') || line.trim().startsWith("```")) {
      inDocString = true;
      docStringFence = line.trim().slice(0, 3);
      continue;
    }
    if (matchesBlockOpener(line, blockOpeners)) {
      lastEffective = void 0;
    }
    const step = matchStep(line, i, stepKeywords, lastEffective);
    if (step) {
      lastEffective = step.keyword;
      steps.push(step);
    }
  }
  return { steps, language };
}
function detectLanguage(lines) {
  for (const line of lines.slice(0, 10)) {
    const m = languagePattern.exec(line);
    if (m) return m[1];
  }
  return void 0;
}
function matchesBlockOpener(line, openers) {
  const t = line.trim();
  for (const opener of openers) {
    if (t.startsWith(opener)) return true;
  }
  return false;
}
function matchStep(line, lineIndex, keywords, previousEffective) {
  const trimmed = line.trimStart();
  if (trimmed.startsWith("#") || trimmed.startsWith("|") || trimmed.startsWith("@"))
    return void 0;
  const indent = line.length - trimmed.length;
  let best;
  for (const [keyword, spellings] of keywords) {
    for (const spelling of spellings) {
      const withSpace = spelling.endsWith(" ") ? spelling : spelling + " ";
      if (trimmed.startsWith(withSpace)) {
        if (!best || withSpace.length > best.spelling.length)
          best = { keyword, spelling: withSpace };
      }
    }
  }
  if (!best) return void 0;
  const keywordText = best.spelling.trim();
  const rest = trimmed.slice(best.spelling.length);
  const text = rest.trim();
  if (text.length === 0) return void 0;
  const textStart = indent + best.spelling.length + (rest.length - rest.trimStart().length);
  const effective = (best.keyword === "and" || best.keyword === "but") && previousEffective !== void 0 ? previousEffective : best.keyword;
  return {
    line: lineIndex,
    text,
    keyword: effective,
    keywordText,
    textStart,
    textEnd: indent + trimmed.length,
    hasDataTable: false
    // filled in by withDataTables
  };
}
function withDataTables(steps, contents) {
  const lines = contents.split(/\r?\n/);
  return steps.map((s) => {
    let j = s.line + 1;
    while (j < lines.length && lines[j].trim() === "") j++;
    const hasDataTable = j < lines.length && lines[j].trimStart().startsWith("|");
    return { ...s, hasDataTable };
  });
}

// src/diacritics.generated.ts
var DIACRITIC_SINGLE = {
  "\xA0": " ",
  A: "A",
  "\u24B6": "A",
  \uFF21: "A",
  \u00C0: "A",
  \u00C1: "A",
  \u00C2: "A",
  \u1EA6: "A",
  \u1EA4: "A",
  \u1EAA: "A",
  \u1EA8: "A",
  \u00C3: "A",
  \u0100: "A",
  \u0102: "A",
  \u1EB0: "A",
  \u1EAE: "A",
  \u1EB4: "A",
  \u1EB2: "A",
  \u0226: "A",
  \u01E0: "A",
  \u00C4: "A",
  \u01DE: "A",
  \u1EA2: "A",
  \u00C5: "A",
  \u01FA: "A",
  \u01CD: "A",
  \u0200: "A",
  \u0202: "A",
  \u1EA0: "A",
  \u1EAC: "A",
  \u1EB6: "A",
  \u1E00: "A",
  \u0104: "A",
  "\u023A": "A",
  "\u2C6F": "A",
  B: "B",
  "\u24B7": "B",
  \uFF22: "B",
  \u1E02: "B",
  \u1E04: "B",
  \u1E06: "B",
  "\u0243": "B",
  \u0182: "B",
  \u0181: "B",
  C: "C",
  "\u24B8": "C",
  \uFF23: "C",
  \u0106: "C",
  \u0108: "C",
  \u010A: "C",
  \u010C: "C",
  \u00C7: "C",
  \u1E08: "C",
  \u0187: "C",
  "\u023B": "C",
  "\uA73E": "C",
  D: "D",
  "\u24B9": "D",
  \uFF24: "D",
  \u1E0A: "D",
  \u010E: "D",
  \u1E0C: "D",
  \u1E10: "D",
  \u1E12: "D",
  \u1E0E: "D",
  \u0110: "D",
  \u018B: "D",
  \u018A: "D",
  \u0189: "D",
  "\uA779": "D",
  E: "E",
  "\u24BA": "E",
  \uFF25: "E",
  \u00C8: "E",
  \u00C9: "E",
  \u00CA: "E",
  \u1EC0: "E",
  \u1EBE: "E",
  \u1EC4: "E",
  \u1EC2: "E",
  \u1EBC: "E",
  \u0112: "E",
  \u1E14: "E",
  \u1E16: "E",
  \u0114: "E",
  \u0116: "E",
  \u00CB: "E",
  \u1EBA: "E",
  \u011A: "E",
  \u0204: "E",
  \u0206: "E",
  \u1EB8: "E",
  \u1EC6: "E",
  \u0228: "E",
  \u1E1C: "E",
  \u0118: "E",
  \u1E18: "E",
  \u1E1A: "E",
  \u0190: "E",
  \u018E: "E",
  F: "F",
  "\u24BB": "F",
  \uFF26: "F",
  \u1E1E: "F",
  \u0191: "F",
  "\uA77B": "F",
  G: "G",
  "\u24BC": "G",
  \uFF27: "G",
  \u01F4: "G",
  \u011C: "G",
  \u1E20: "G",
  \u011E: "G",
  \u0120: "G",
  \u01E6: "G",
  \u0122: "G",
  \u01E4: "G",
  \u0193: "G",
  "\uA7A0": "G",
  "\uA77D": "G",
  "\uA77E": "G",
  H: "H",
  "\u24BD": "H",
  \uFF28: "H",
  \u0124: "H",
  \u1E22: "H",
  \u1E26: "H",
  \u021E: "H",
  \u1E24: "H",
  \u1E28: "H",
  \u1E2A: "H",
  \u0126: "H",
  "\u2C67": "H",
  "\u2C75": "H",
  "\uA78D": "H",
  I: "I",
  "\u24BE": "I",
  \uFF29: "I",
  \u00CC: "I",
  \u00CD: "I",
  \u00CE: "I",
  \u0128: "I",
  \u012A: "I",
  \u012C: "I",
  \u0130: "I",
  \u00CF: "I",
  \u1E2E: "I",
  \u1EC8: "I",
  \u01CF: "I",
  \u0208: "I",
  \u020A: "I",
  \u1ECA: "I",
  \u012E: "I",
  \u1E2C: "I",
  \u0197: "I",
  J: "J",
  "\u24BF": "J",
  \uFF2A: "J",
  \u0134: "J",
  "\u0248": "J",
  K: "K",
  "\u24C0": "K",
  \uFF2B: "K",
  \u1E30: "K",
  \u01E8: "K",
  \u1E32: "K",
  \u0136: "K",
  \u1E34: "K",
  \u0198: "K",
  "\u2C69": "K",
  "\uA740": "K",
  "\uA742": "K",
  "\uA744": "K",
  "\uA7A2": "K",
  L: "L",
  "\u24C1": "L",
  \uFF2C: "L",
  \u013F: "L",
  \u0139: "L",
  \u013D: "L",
  \u1E36: "L",
  \u1E38: "L",
  \u013B: "L",
  \u1E3C: "L",
  \u1E3A: "L",
  \u0141: "L",
  "\u023D": "L",
  "\u2C62": "L",
  "\u2C60": "L",
  "\uA748": "L",
  "\uA746": "L",
  "\uA780": "L",
  M: "M",
  "\u24C2": "M",
  \uFF2D: "M",
  \u1E3E: "M",
  \u1E40: "M",
  \u1E42: "M",
  "\u2C6E": "M",
  \u019C: "M",
  N: "N",
  "\u24C3": "N",
  \uFF2E: "N",
  \u01F8: "N",
  \u0143: "N",
  \u00D1: "N",
  \u1E44: "N",
  \u0147: "N",
  \u1E46: "N",
  \u0145: "N",
  \u1E4A: "N",
  \u1E48: "N",
  "\u0220": "N",
  \u019D: "N",
  "\uA790": "N",
  "\uA7A4": "N",
  O: "O",
  "\u24C4": "O",
  \uFF2F: "O",
  \u00D2: "O",
  \u00D3: "O",
  \u00D4: "O",
  \u1ED2: "O",
  \u1ED0: "O",
  \u1ED6: "O",
  \u1ED4: "O",
  \u00D5: "O",
  \u1E4C: "O",
  \u022C: "O",
  \u1E4E: "O",
  \u014C: "O",
  \u1E50: "O",
  \u1E52: "O",
  \u014E: "O",
  \u022E: "O",
  \u0230: "O",
  \u00D6: "O",
  \u022A: "O",
  \u1ECE: "O",
  \u0150: "O",
  \u01D1: "O",
  \u020C: "O",
  \u020E: "O",
  \u01A0: "O",
  \u1EDC: "O",
  \u1EDA: "O",
  \u1EE0: "O",
  \u1EDE: "O",
  \u1EE2: "O",
  \u1ECC: "O",
  \u1ED8: "O",
  \u01EA: "O",
  \u01EC: "O",
  \u00D8: "O",
  \u01FE: "O",
  \u0186: "O",
  \u019F: "O",
  "\uA74A": "O",
  "\uA74C": "O",
  Q: "Q",
  "\u24C6": "Q",
  \uFF31: "Q",
  "\uA756": "Q",
  "\uA758": "Q",
  "\u024A": "Q",
  R: "R",
  "\u24C7": "R",
  \uFF32: "R",
  \u0154: "R",
  \u1E58: "R",
  \u0158: "R",
  \u0210: "R",
  \u0212: "R",
  \u1E5A: "R",
  \u1E5C: "R",
  \u0156: "R",
  \u1E5E: "R",
  "\u024C": "R",
  "\u2C64": "R",
  "\uA75A": "R",
  "\uA7A6": "R",
  "\uA782": "R",
  S: "S",
  "\u24C8": "S",
  \uFF33: "S",
  "\u1E9E": "S",
  \u015A: "S",
  \u1E64: "S",
  \u015C: "S",
  \u1E60: "S",
  \u0160: "S",
  \u1E66: "S",
  \u1E62: "S",
  \u1E68: "S",
  \u0218: "S",
  \u015E: "S",
  "\u2C7E": "S",
  "\uA7A8": "S",
  "\uA784": "S",
  T: "T",
  "\u24C9": "T",
  \uFF34: "T",
  \u1E6A: "T",
  \u0164: "T",
  \u1E6C: "T",
  \u021A: "T",
  \u0162: "T",
  \u1E70: "T",
  \u1E6E: "T",
  \u0166: "T",
  \u01AC: "T",
  \u01AE: "T",
  "\u023E": "T",
  "\uA786": "T",
  U: "U",
  "\u24CA": "U",
  \uFF35: "U",
  \u00D9: "U",
  \u00DA: "U",
  \u00DB: "U",
  \u0168: "U",
  \u1E78: "U",
  \u016A: "U",
  \u1E7A: "U",
  \u016C: "U",
  \u00DC: "U",
  \u01DB: "U",
  \u01D7: "U",
  \u01D5: "U",
  \u01D9: "U",
  \u1EE6: "U",
  \u016E: "U",
  \u0170: "U",
  \u01D3: "U",
  \u0214: "U",
  \u0216: "U",
  \u01AF: "U",
  \u1EEA: "U",
  \u1EE8: "U",
  \u1EEE: "U",
  \u1EEC: "U",
  \u1EF0: "U",
  \u1EE4: "U",
  \u1E72: "U",
  \u0172: "U",
  \u1E76: "U",
  \u1E74: "U",
  "\u0244": "U",
  V: "V",
  "\u24CB": "V",
  \uFF36: "V",
  \u1E7C: "V",
  \u1E7E: "V",
  \u01B2: "V",
  "\uA75E": "V",
  "\u0245": "V",
  X: "X",
  "\u24CD": "X",
  \uFF38: "X",
  \u1E8A: "X",
  \u1E8C: "X",
  Y: "Y",
  "\u24CE": "Y",
  \uFF39: "Y",
  \u1EF2: "Y",
  \u00DD: "Y",
  \u0176: "Y",
  \u1EF8: "Y",
  \u0232: "Y",
  \u1E8E: "Y",
  \u0178: "Y",
  \u1EF6: "Y",
  \u1EF4: "Y",
  \u01B3: "Y",
  "\u024E": "Y",
  "\u1EFE": "Y",
  Z: "Z",
  "\u24CF": "Z",
  \uFF3A: "Z",
  \u0179: "Z",
  \u1E90: "Z",
  \u017B: "Z",
  \u017D: "Z",
  \u1E92: "Z",
  \u1E94: "Z",
  \u01B5: "Z",
  \u0224: "Z",
  "\u2C7F": "Z",
  "\u2C6B": "Z",
  "\uA762": "Z",
  a: "a",
  "\u24D0": "a",
  \uFF41: "a",
  \u1E9A: "a",
  \u00E0: "a",
  \u00E1: "a",
  \u00E2: "a",
  \u1EA7: "a",
  \u1EA5: "a",
  \u1EAB: "a",
  \u1EA9: "a",
  \u00E3: "a",
  \u0101: "a",
  \u0103: "a",
  \u1EB1: "a",
  \u1EAF: "a",
  \u1EB5: "a",
  \u1EB3: "a",
  \u0227: "a",
  \u01E1: "a",
  \u00E4: "a",
  \u01DF: "a",
  \u1EA3: "a",
  \u00E5: "a",
  \u01FB: "a",
  \u01CE: "a",
  \u0201: "a",
  \u0203: "a",
  \u1EA1: "a",
  \u1EAD: "a",
  \u1EB7: "a",
  \u1E01: "a",
  \u0105: "a",
  "\u2C65": "a",
  \u0250: "a",
  \u0251: "a",
  b: "b",
  "\u24D1": "b",
  \uFF42: "b",
  \u1E03: "b",
  \u1E05: "b",
  \u1E07: "b",
  \u0180: "b",
  \u0183: "b",
  \u0253: "b",
  c: "c",
  "\u24D2": "c",
  \uFF43: "c",
  \u0107: "c",
  \u0109: "c",
  \u010B: "c",
  \u010D: "c",
  \u00E7: "c",
  \u1E09: "c",
  \u0188: "c",
  "\u023C": "c",
  "\uA73F": "c",
  "\u2184": "c",
  d: "d",
  "\u24D3": "d",
  \uFF44: "d",
  \u1E0B: "d",
  \u010F: "d",
  \u1E0D: "d",
  \u1E11: "d",
  \u1E13: "d",
  \u1E0F: "d",
  \u0111: "d",
  \u018C: "d",
  \u0256: "d",
  \u0257: "d",
  "\uA77A": "d",
  e: "e",
  "\u24D4": "e",
  \uFF45: "e",
  \u00E8: "e",
  \u00E9: "e",
  \u00EA: "e",
  \u1EC1: "e",
  \u1EBF: "e",
  \u1EC5: "e",
  \u1EC3: "e",
  \u1EBD: "e",
  \u0113: "e",
  \u1E15: "e",
  \u1E17: "e",
  \u0115: "e",
  \u0117: "e",
  \u00EB: "e",
  \u1EBB: "e",
  \u011B: "e",
  \u0205: "e",
  \u0207: "e",
  \u1EB9: "e",
  \u1EC7: "e",
  \u0229: "e",
  \u1E1D: "e",
  \u0119: "e",
  \u1E19: "e",
  \u1E1B: "e",
  "\u0247": "e",
  \u025B: "e",
  \u01DD: "e",
  f: "f",
  "\u24D5": "f",
  \uFF46: "f",
  \u1E1F: "f",
  \u0192: "f",
  "\uA77C": "f",
  g: "g",
  "\u24D6": "g",
  \uFF47: "g",
  \u01F5: "g",
  \u011D: "g",
  \u1E21: "g",
  \u011F: "g",
  \u0121: "g",
  \u01E7: "g",
  \u0123: "g",
  \u01E5: "g",
  \u0260: "g",
  "\uA7A1": "g",
  "\u1D79": "g",
  "\uA77F": "g",
  h: "h",
  "\u24D7": "h",
  \uFF48: "h",
  \u0125: "h",
  \u1E23: "h",
  \u1E27: "h",
  \u021F: "h",
  \u1E25: "h",
  \u1E29: "h",
  \u1E2B: "h",
  \u1E96: "h",
  \u0127: "h",
  "\u2C68": "h",
  "\u2C76": "h",
  \u0265: "h",
  i: "i",
  "\u24D8": "i",
  \uFF49: "i",
  \u00EC: "i",
  \u00ED: "i",
  \u00EE: "i",
  \u0129: "i",
  \u012B: "i",
  \u012D: "i",
  \u00EF: "i",
  \u1E2F: "i",
  \u1EC9: "i",
  \u01D0: "i",
  \u0209: "i",
  \u020B: "i",
  \u1ECB: "i",
  \u012F: "i",
  \u1E2D: "i",
  \u0268: "i",
  \u0131: "i",
  j: "j",
  "\u24D9": "j",
  \uFF4A: "j",
  \u0135: "j",
  \u01F0: "j",
  "\u0249": "j",
  k: "k",
  "\u24DA": "k",
  \uFF4B: "k",
  \u1E31: "k",
  \u01E9: "k",
  \u1E33: "k",
  \u0137: "k",
  \u1E35: "k",
  \u0199: "k",
  "\u2C6A": "k",
  "\uA741": "k",
  "\uA743": "k",
  "\uA745": "k",
  "\uA7A3": "k",
  l: "l",
  "\u24DB": "l",
  \uFF4C: "l",
  \u0140: "l",
  \u013A: "l",
  \u013E: "l",
  \u1E37: "l",
  \u1E39: "l",
  \u013C: "l",
  \u1E3D: "l",
  \u1E3B: "l",
  \u017F: "l",
  \u0142: "l",
  \u019A: "l",
  \u026B: "l",
  "\u2C61": "l",
  "\uA749": "l",
  "\uA781": "l",
  "\uA747": "l",
  m: "m",
  "\u24DC": "m",
  \uFF4D: "m",
  \u1E3F: "m",
  \u1E41: "m",
  \u1E43: "m",
  \u0271: "m",
  \u026F: "m",
  n: "n",
  \u00F1: "n",
  "\u24DD": "n",
  \uFF4E: "n",
  \u01F9: "n",
  \u0144: "n",
  \u1E45: "n",
  \u0148: "n",
  \u1E47: "n",
  \u0146: "n",
  \u1E4B: "n",
  \u1E49: "n",
  \u019E: "n",
  \u0272: "n",
  \u0149: "n",
  "\uA791": "n",
  "\uA7A5": "n",
  "\u0509": "n",
  "\u07C0": "o",
  o: "o",
  "\u24DE": "o",
  \uFF4F: "o",
  \u00F2: "o",
  \u00F3: "o",
  \u00F4: "o",
  \u1ED3: "o",
  \u1ED1: "o",
  \u1ED7: "o",
  \u1ED5: "o",
  \u00F5: "o",
  \u1E4D: "o",
  \u022D: "o",
  \u1E4F: "o",
  \u014D: "o",
  \u1E51: "o",
  \u1E53: "o",
  \u014F: "o",
  \u022F: "o",
  \u0231: "o",
  \u00F6: "o",
  \u022B: "o",
  \u1ECF: "o",
  \u0151: "o",
  \u01D2: "o",
  \u020D: "o",
  \u020F: "o",
  \u01A1: "o",
  \u1EDD: "o",
  \u1EDB: "o",
  \u1EE1: "o",
  \u1EDF: "o",
  \u1EE3: "o",
  \u1ECD: "o",
  \u1ED9: "o",
  \u01EB: "o",
  \u01ED: "o",
  \u00F8: "o",
  \u01FF: "o",
  \u0254: "o",
  "\uA74B": "o",
  "\uA74D": "o",
  \u0275: "o",
  q: "q",
  "\u24E0": "q",
  \uFF51: "q",
  "\u024B": "q",
  "\uA757": "q",
  "\uA759": "q",
  r: "r",
  "\u24E1": "r",
  \uFF52: "r",
  \u0155: "r",
  \u1E59: "r",
  \u0159: "r",
  \u0211: "r",
  \u0213: "r",
  \u1E5B: "r",
  \u1E5D: "r",
  \u0157: "r",
  \u1E5F: "r",
  "\u024D": "r",
  \u027D: "r",
  "\uA75B": "r",
  "\uA7A7": "r",
  "\uA783": "r",
  s: "s",
  "\u24E2": "s",
  \uFF53: "s",
  \u00DF: "s",
  \u015B: "s",
  \u1E65: "s",
  \u015D: "s",
  \u1E61: "s",
  \u0161: "s",
  \u1E67: "s",
  \u1E63: "s",
  \u1E69: "s",
  \u0219: "s",
  \u015F: "s",
  "\u023F": "s",
  "\uA7A9": "s",
  "\uA785": "s",
  \u1E9B: "s",
  t: "t",
  "\u24E3": "t",
  \uFF54: "t",
  \u1E6B: "t",
  \u1E97: "t",
  \u0165: "t",
  \u1E6D: "t",
  \u021B: "t",
  \u0163: "t",
  \u1E71: "t",
  \u1E6F: "t",
  \u0167: "t",
  \u01AD: "t",
  \u0288: "t",
  "\u2C66": "t",
  "\uA787": "t",
  u: "u",
  "\u24E4": "u",
  \uFF55: "u",
  \u00F9: "u",
  \u00FA: "u",
  \u00FB: "u",
  \u0169: "u",
  \u1E79: "u",
  \u016B: "u",
  \u1E7B: "u",
  \u016D: "u",
  \u00FC: "u",
  \u01DC: "u",
  \u01D8: "u",
  \u01D6: "u",
  \u01DA: "u",
  \u1EE7: "u",
  \u016F: "u",
  \u0171: "u",
  \u01D4: "u",
  \u0215: "u",
  \u0217: "u",
  \u01B0: "u",
  \u1EEB: "u",
  \u1EE9: "u",
  \u1EEF: "u",
  \u1EED: "u",
  \u1EF1: "u",
  \u1EE5: "u",
  \u1E73: "u",
  \u0173: "u",
  \u1E77: "u",
  \u1E75: "u",
  \u0289: "u",
  v: "v",
  "\u24E5": "v",
  \uFF56: "v",
  \u1E7D: "v",
  \u1E7F: "v",
  \u028B: "v",
  "\uA75F": "v",
  \u028C: "v",
  w: "w",
  "\u24E6": "w",
  \uFF57: "w",
  \u1E81: "w",
  \u1E83: "w",
  \u0175: "w",
  \u1E87: "w",
  \u1E85: "w",
  \u1E98: "w",
  \u1E89: "w",
  "\u2C73": "w",
  x: "x",
  "\u24E7": "x",
  \uFF58: "x",
  \u1E8B: "x",
  \u1E8D: "x",
  y: "y",
  "\u24E8": "y",
  \uFF59: "y",
  \u1EF3: "y",
  \u00FD: "y",
  \u0177: "y",
  \u1EF9: "y",
  \u0233: "y",
  \u1E8F: "y",
  \u00FF: "y",
  \u1EF7: "y",
  \u1E99: "y",
  \u1EF5: "y",
  \u01B4: "y",
  "\u024F": "y",
  "\u1EFF": "y",
  z: "z",
  "\u24E9": "z",
  \uFF5A: "z",
  \u017A: "z",
  \u1E91: "z",
  \u017C: "z",
  \u017E: "z",
  \u1E93: "z",
  \u1E95: "z",
  \u01B6: "z",
  \u0225: "z",
  "\u0240": "z",
  "\u2C6C": "z",
  "\uA763": "z"
};
var DIACRITIC_MULTI = {
  "\uA732": "AA",
  \u00C6: "AE",
  \u01FC: "AE",
  \u01E2: "AE",
  "\uA734": "AO",
  "\uA736": "AU",
  "\uA738": "AV",
  "\uA73A": "AV",
  "\uA73C": "AY",
  \u01F1: "DZ",
  \u01C4: "DZ",
  \u01F2: "Dz",
  \u01C5: "Dz",
  \u01C7: "LJ",
  \u01C8: "Lj",
  \u01CA: "NJ",
  \u01CB: "Nj",
  \u01A2: "OI",
  "\uA74E": "OO",
  \u0222: "OU",
  \u00DE: "Th",
  "\uA728": "TZ",
  "\uA760": "VY",
  "\uA733": "aa",
  \u00E6: "ae",
  \u01FD: "ae",
  \u01E3: "ae",
  "\uA735": "ao",
  "\uA737": "au",
  "\uA739": "av",
  "\uA73B": "av",
  "\uA73D": "ay",
  \u01F3: "dz",
  \u01C6: "dz",
  \uFB00: "ff",
  \uFB01: "fi",
  \uFB02: "fl",
  \uFB03: "ffi",
  \uFB04: "ffl",
  \u0195: "hv",
  \u01C9: "lj",
  \u01CC: "nj",
  \u0152: "oe",
  \u0153: "oe",
  \u01A3: "oi",
  \u0223: "ou",
  "\uA74F": "oo",
  \u00DF: "ss",
  \u00FE: "th",
  "\uA729": "tz",
  "\uA761": "vy"
};

// src/naming.ts
function removeDiacritics(text) {
  let out = "";
  for (const ch of text) {
    const single = DIACRITIC_SINGLE[ch];
    if (single !== void 0) {
      out += single;
    } else {
      const multi = DIACRITIC_MULTI[ch];
      out += multi !== void 0 ? multi : ch;
    }
  }
  return out;
}
var _DIGIT = 1;
var _LOWER = 2;
var _UNDERSCORE = 4;
var _UPPER = 8;
var _ALPHA = _LOWER | _UPPER;
var _ALPHA_NUM = _ALPHA | _DIGIT;
function asciiType(ch) {
  if (ch.length === 1) {
    const c = ch.charCodeAt(0);
    if (c < 128) {
      if (c >= 97 && c <= 122) return _LOWER;
      if (c >= 65 && c <= 90) return _UPPER;
      if (c >= 48 && c <= 57) return _DIGIT;
      if (c === 95) return _UNDERSCORE;
    }
  }
  return 0;
}
function underscore(input) {
  let sb = "";
  let separate = false;
  for (const s of Array.from(input)) {
    const type = asciiType(s);
    if (separate && type & _UPPER) {
      sb += "_" + s.toLowerCase();
      separate = true;
    } else {
      sb += s.toLowerCase();
      separate = (type & _ALPHA_NUM) !== 0 || (type & _UNDERSCORE) !== 0 && separate;
    }
  }
  return sb;
}
function camelize(input) {
  const string = input.toLowerCase();
  let sb = "";
  let capitalize = true;
  let isBeginning = true;
  let remove = false;
  for (const s of Array.from(string)) {
    const type = asciiType(s);
    if (capitalize && type & _ALPHA) {
      sb += isBeginning ? s : s.toUpperCase();
      capitalize = false;
      remove = true;
      isBeginning = false;
    } else {
      if (type & _UNDERSCORE) {
        if (!remove) {
          sb += s;
          remove = true;
        }
        capitalize = true;
      } else {
        if (type & _ALPHA_NUM) {
          capitalize = false;
          remove = true;
        } else {
          capitalize = true;
          remove = false;
          isBeginning = true;
        }
        sb += s;
      }
    }
  }
  return sb;
}
function parseRawStepLine(stepLine) {
  const name = [];
  const parameters = [];
  let parameter = [];
  let bracketsNesting = 0;
  for (const c of stepLine) {
    if (c === "{") {
      bracketsNesting++;
      if (bracketsNesting === 1) continue;
    }
    if (c === "}") {
      bracketsNesting--;
      if (bracketsNesting === 0) {
        parameters.push(parameter.join(""));
        parameter = [];
        continue;
      }
    }
    if (bracketsNesting === 0) name.push(c);
    else parameter.push(c);
  }
  return [name.join(""), ...parameters];
}
var examplesRegExp = /<(.*?)>/gi;
var charactersAndNumbersRegExp = /[^\w\s\d]+/g;
var repeatingSpacesRegExp = /\s+/g;
function camelizedString(input) {
  const text = removeDiacritics(input).replace(examplesRegExp, "").replace(charactersAndNumbersRegExp, "").replace(repeatingSpacesRegExp, " ").trim().replace(/ /g, "_");
  return camelize(text);
}
var unusableStart = /^[\d_]/;
function stepIdentifier(stepText) {
  const candidate = camelizedString(parseRawStepLine(stepText)[0]);
  return candidate.length > 0 && !unusableStart.test(candidate) ? candidate : null;
}
function getStepFilename(stepText) {
  const identifier = stepIdentifier(stepText);
  return identifier === null ? null : underscore(identifier);
}
function genericParameterType(parameter) {
  if (parameter === "true" || parameter === "false") return "bool";
  if (parameter !== "" && !isNaN(Number(parameter))) return "num";
  if (parameter.startsWith('"') && parameter.endsWith('"') || parameter.startsWith("'") && parameter.endsWith("'")) {
    return "String";
  }
  return "dynamic";
}
function examplePlaceholders(stepLine) {
  const names = /* @__PURE__ */ new Set();
  for (const m of stepLine.matchAll(/<(.*?)>/g)) names.add(m[1]);
  return [...names];
}
function scaffoldStepDart(rawLine, hasDataTable) {
  const parts = parseRawStepLine(rawLine);
  const identifier = stepIdentifier(rawLine);
  const params = parts.slice(1);
  const placeholders = examplePlaceholders(rawLine);
  const paramList = [
    ...params.map((p, i) => `, ${genericParameterType(p)} param${i + 1}`),
    ...placeholders.map((p) => `, dynamic ${p}`),
    ...hasDataTable ? [", bdd.DataTable dataTable"] : []
  ].join("");
  const dataTableImport = hasDataTable ? "import 'package:bdd_widget_test/data_table.dart' as bdd;\n" : "";
  return `${dataTableImport}import 'package:flutter_test/flutter_test.dart';

/// Usage: ${rawLine}
Future<void> ${identifier}(WidgetTester tester${paramList}) async {
  throw UnimplementedError();
}
`;
}
var predefinedSteps = /* @__PURE__ */ new Set([
  "theAppIsRunning",
  "iDismissThePage",
  "iDontSeeIcon",
  "iDontSeeRichText",
  "iDontSeeText",
  "iDontSeeWidget",
  "iEnterIntoInputField",
  "iSeeDisabledElevatedButton",
  "iSeeEnabledElevatedButton",
  "iSeeExactlyWidgets",
  "iSeeIcon",
  "iSeeMultipleTexts",
  "iSeeMultipleWidgets",
  "iSeeRichText",
  "iSeeText",
  "iSeeWidget",
  "iTapIcon",
  "iTapText",
  "iWait",
  "theScreenMatchesGolden"
]);

// src/stepIndex.ts
var fs2 = __toESM(require("fs"));
var path2 = __toESM(require("path"));
var StepIndex = class {
  constructor(workspaceRoot, getDefaults2 = () => defaultOptions, watchFolder) {
    this.workspaceRoot = workspaceRoot;
    this.getDefaults = getDefaults2;
    this.watchFolder = watchFolder;
  }
  workspaceRoot;
  getDefaults;
  watchFolder;
  index = /* @__PURE__ */ new Map();
  disposers = [];
  indexedRoots = /* @__PURE__ */ new Set();
  listeners = /* @__PURE__ */ new Set();
  onDidChange = (cb) => {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  };
  fire() {
    for (const cb of [...this.listeners]) cb();
  }
  /** Looks up a step by its filename stem (e.g. `i_see_text`). */
  lookup(fileStem, featurePath) {
    const entries = (this.index.get(`${fileStem}.dart`) ?? []).filter(
      (e) => fs2.existsSync(e.filePath)
    );
    if (entries.length === 0) return void 0;
    let best = entries[0];
    let bestDist = Infinity;
    for (const e of entries) {
      const d = path2.relative(
        path2.dirname(featurePath),
        path2.dirname(e.filePath)
      );
      const dist = d.split(path2.sep).filter((p) => p !== ".").length;
      if (dist < bestDist) {
        bestDist = dist;
        best = e;
      }
    }
    return best;
  }
  /** Indexes the step folder(s) for a feature file, if not done yet. */
  ensureIndexed(featurePath) {
    const options = findOptions(
      featurePath,
      this.workspaceRoot,
      this.getDefaults
    );
    const baseDir = stepFolderBaseDir(featurePath, options, this.workspaceRoot);
    const stepFolder = path2.resolve(baseDir, options.stepFolderName);
    const rootKey = stepFolder;
    if (this.indexedRoots.has(rootKey)) return;
    this.indexFolder(stepFolder);
    this.indexedRoots.add(rootKey);
    this.watch(stepFolder);
    this.fire();
  }
  /** Adds a single file to the index (used after scaffolding a new step). */
  add(filePath) {
    this.addFile(filePath);
    this.fire();
  }
  /** Full rebuild of everything indexed so far. */
  rebuild() {
    const roots = [...this.indexedRoots];
    this.index.clear();
    this.indexedRoots.clear();
    for (const r of roots) {
      this.indexedRoots.add(r);
      this.indexFolder(r);
    }
    this.fire();
  }
  /** Resolves where a NEW step file for a feature would be created. */
  targetPathForNewStep(featurePath) {
    const options = findOptions(
      featurePath,
      this.workspaceRoot,
      this.getDefaults
    );
    const baseDir = stepFolderBaseDir(featurePath, options, this.workspaceRoot);
    return { folder: path2.resolve(baseDir, options.stepFolderName), options };
  }
  /** An external step (package: uri) that matches the file name, if any. */
  findExternalStep(fileStem, featurePath) {
    const options = findOptions(
      featurePath,
      this.workspaceRoot,
      this.getDefaults
    );
    const file = `${fileStem}.dart`;
    const external = options.externalSteps.find(
      (l) => l.endsWith(file) || l.includes(`/${file}`)
    );
    if (!external) return void 0;
    const resolved = resolvePackageUri(external, this.workspaceRoot);
    if (resolved && fs2.existsSync(resolved)) {
      return {
        filePath: resolved,
        functionLine: findFunctionLine(resolved, camelize(fileStem))
      };
    }
    return void 0;
  }
  indexFolder(stepFolder) {
    for (const entry of walk(stepFolder)) {
      this.addFile(entry);
    }
  }
  addFile(filePath) {
    if (!filePath.endsWith(".dart")) return;
    const base = path2.basename(filePath);
    const list = this.index.get(base) ?? [];
    if (!list.some((e) => e.filePath === filePath)) {
      list.push({
        filePath,
        functionLine: findFunctionLine(
          filePath,
          camelize(base.replace(/\.dart$/, ""))
        )
      });
      this.index.set(base, list);
    }
  }
  removeFile(filePath) {
    const base = path2.basename(filePath);
    const list = this.index.get(base);
    if (!list) return;
    const remaining = list.filter((e) => e.filePath !== filePath);
    if (remaining.length === 0) this.index.delete(base);
    else this.index.set(base, remaining);
  }
  watch(stepFolder) {
    if (!this.watchFolder) return;
    const dispose = this.watchFolder(stepFolder, {
      add: (p) => {
        this.addFile(p);
        this.fire();
      },
      remove: (p) => {
        this.removeFile(p);
        this.fire();
      }
    });
    this.disposers.push(dispose);
  }
  dispose() {
    for (const d of this.disposers) d();
    this.disposers = [];
    this.listeners.clear();
  }
};
function* walk(dir) {
  let entries;
  try {
    entries = fs2.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const p = path2.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.isFile()) yield p;
  }
}
function findFunctionLine(filePath, identifier) {
  try {
    const content = fs2.readFileSync(filePath, "utf8");
    const lines = content.split(/\r?\n/);
    const re = new RegExp(
      `Future<\\s*void\\s*>\\s*${escapeRegExp(identifier)}\\s*\\(`
    );
    for (let i = 0; i < lines.length; i++) {
      if (re.test(lines[i])) return i + 1;
    }
  } catch {
  }
  return void 0;
}
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// src/stepResolver.ts
function resolveStep(stepText, featurePath, index2) {
  const identifier = stepIdentifier(stepText);
  if (identifier === null) return { kind: "unnamed" };
  const fileStem = getStepFilename(stepText);
  if (fileStem === null) return { kind: "unnamed" };
  if (predefinedSteps.has(identifier)) {
    return { kind: "builtin", identifier };
  }
  index2.ensureIndexed(featurePath);
  const existing = index2.lookup(fileStem, featurePath);
  if (existing) return { kind: "existing", entry: existing, identifier };
  const external = index2.findExternalStep(fileStem, featurePath);
  if (external) return { kind: "external", entry: external, identifier };
  const { folder } = index2.targetPathForNewStep(featurePath);
  return { kind: "missing", folder, fileStem, identifier };
}
function stepDefinitionLocation(resolution) {
  if (resolution.kind === "existing" || resolution.kind === "external") {
    return {
      filePath: resolution.entry.filePath,
      line: resolution.entry.functionLine ?? 1
    };
  }
  return void 0;
}
function unresolvedSteps(text, featurePath, index2) {
  const steps = withDataTables(parseFeature(text).steps, text);
  const diagnostics = [];
  for (const step of steps) {
    const resolution = resolveStep(step.text, featurePath, index2);
    if (resolution.kind === "unnamed") {
      diagnostics.push({
        line: step.line,
        startCol: step.textStart,
        endCol: step.textEnd,
        message: `Step '${step.text.trim()}' produces no valid Dart identifier: rename the step.`
      });
    } else if (resolution.kind === "missing") {
      diagnostics.push({
        line: step.line,
        startCol: step.textStart,
        endCol: step.textEnd,
        message: `Step file not found: ${resolution.fileStem}.dart (expected in ${resolution.folder}). Use "Create step file" to scaffold it.`
      });
    }
  }
  return diagnostics;
}

// zed/server/src/lsp.ts
var SERVER_NAME = "bdd-widget-test";
var SECTION = "bddWidgetTestHelper";
function asRecord(value) {
  return value !== null && typeof value === "object" ? value : {};
}
function mergeSettings(base, raw) {
  const o = asRecord(raw);
  const next = { ...base };
  if (typeof o.stepFolderName === "string")
    next.stepFolderName = o.stepFolderName;
  if (typeof o.relativeToTestFolder === "boolean")
    next.relativeToTestFolder = o.relativeToTestFolder;
  if (Array.isArray(o.externalSteps))
    next.externalSteps = o.externalSteps.filter(
      (x) => typeof x === "string"
    );
  if (typeof o.showUnresolvedStepWarnings === "boolean")
    next.showUnresolvedStepWarnings = o.showUnresolvedStepWarnings;
  return next;
}
var rootPath = process.cwd();
var settings = {};
var index = new StepIndex(rootPath);
function getDefaults() {
  return {
    stepFolderName: settings.stepFolderName ?? defaultOptions.stepFolderName,
    relativeToTestFolder: settings.relativeToTestFolder ?? defaultOptions.relativeToTestFolder,
    externalSteps: settings.externalSteps ?? []
  };
}
function makeIndex() {
  index.dispose();
  index = new StepIndex(rootPath, getDefaults);
}
var onConfig;
var documents = /* @__PURE__ */ new Map();
var buf = Buffer.alloc(0);
process.stdin.on("data", (chunk) => {
  buf = Buffer.concat([buf, chunk]);
  while (true) {
    const idx = buf.indexOf("\r\n\r\n");
    if (idx < 0) break;
    const m = /Content-Length: (\d+)/.exec(buf.subarray(0, idx).toString());
    if (!m) {
      buf = buf.subarray(idx + 4);
      continue;
    }
    const len = parseInt(m[1], 10);
    if (buf.length < idx + 4 + len) break;
    const raw = buf.subarray(idx + 4, idx + 4 + len).toString();
    buf = buf.subarray(idx + 4 + len);
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch (e) {
      console.error(`[${SERVER_NAME}] bad JSON:`, e);
      continue;
    }
    if (msg.id === 1 && (msg.result !== void 0 || msg.error !== void 0)) {
      const cb = onConfig;
      onConfig = void 0;
      cb?.(msg.result);
      continue;
    }
    handle(msg).catch(
      (e) => console.error(`[${SERVER_NAME}] handler error:`, e)
    );
  }
});
function send(obj) {
  const json = JSON.stringify(obj);
  process.stdout.write(
    `Content-Length: ${Buffer.byteLength(json)}\r
\r
${json}`
  );
}
function reply(id, result) {
  send({ jsonrpc: "2.0", id, result });
}
function replyError(id, code, message) {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}
function notify(method, params) {
  send({ jsonrpc: "2.0", method, params });
}
function uriToPath(uri) {
  try {
    return (0, import_url2.fileURLToPath)(uri);
  } catch {
    return uri.replace(/^file:\/\//, "");
  }
}
function pathToUri(p) {
  return (0, import_url2.pathToFileURL)(p).href;
}
function isFeature(uri) {
  return uri.endsWith(".feature");
}
function toRange(d) {
  return {
    start: { line: d.line, character: d.startCol },
    end: { line: d.line, character: d.endCol }
  };
}
function diagnosticsOf(uri) {
  const text = documents.get(uri);
  if (text === void 0 || !isFeature(uri)) return [];
  if (settings.showUnresolvedStepWarnings === false) return [];
  return unresolvedSteps(text, uriToPath(uri), index).map((d) => ({
    severity: 2,
    // warning
    range: toRange(d),
    message: d.message,
    source: SERVER_NAME
  }));
}
function publishDiagnostics(uri) {
  if (!isFeature(uri)) return;
  notify("textDocument/publishDiagnostics", {
    uri,
    diagnostics: diagnosticsOf(uri)
  });
}
function stepsOf(uri) {
  const text = documents.get(uri) ?? "";
  return withDataTables(parseFeature(text).steps, text);
}
async function handle(msg) {
  const id = msg.id;
  const params = asRecord(msg.params);
  switch (msg.method) {
    case "initialize": {
      if (typeof params.rootUri === "string")
        rootPath = uriToPath(params.rootUri);
      settings = mergeSettings(settings, params.initializationOptions);
      makeIndex();
      reply(id, {
        capabilities: {
          textDocumentSync: 1,
          // full
          definitionProvider: true,
          codeActionProvider: { codeActionKinds: ["quickfix"] }
        },
        serverInfo: { name: SERVER_NAME }
      });
      return;
    }
    case "initialized": {
      onConfig = (result) => {
        const s = Array.isArray(result) ? result[0] : result;
        settings = mergeSettings(settings, s);
        makeIndex();
        for (const uri of documents.keys()) publishDiagnostics(uri);
      };
      send({
        jsonrpc: "2.0",
        id: 1,
        method: "workspace/configuration",
        params: {
          items: [{ scopeUri: pathToUri(rootPath), section: SECTION }]
        }
      });
      return;
    }
    case "textDocument/didOpen": {
      const td = asRecord(params.textDocument);
      const uri = td.uri;
      documents.set(uri, td.text);
      index.rebuild();
      publishDiagnostics(uri);
      return;
    }
    case "textDocument/didChange": {
      const uri = asRecord(params.textDocument).uri;
      const changes = Array.isArray(params.contentChanges) ? params.contentChanges : [];
      const last = asRecord(changes[changes.length - 1]);
      if (last.range === void 0 && typeof last.text === "string")
        documents.set(uri, last.text);
      publishDiagnostics(uri);
      return;
    }
    case "textDocument/didSave": {
      const uri = asRecord(params.textDocument).uri;
      if (typeof params.text === "string") documents.set(uri, params.text);
      index.rebuild();
      publishDiagnostics(uri);
      return;
    }
    case "textDocument/didClose": {
      const uri = asRecord(params.textDocument).uri;
      documents.delete(uri);
      notify("textDocument/publishDiagnostics", { uri, diagnostics: [] });
      return;
    }
    case "textDocument/definition": {
      const uri = asRecord(params.textDocument).uri;
      const position = asRecord(params.position);
      const lineNo = position.line;
      const step = stepsOf(uri).find((s) => s.line === lineNo);
      if (!step) return reply(id, null);
      const loc = stepDefinitionLocation(
        resolveStep(step.text, uriToPath(uri), index)
      );
      if (!loc) return reply(id, null);
      reply(id, {
        uri: pathToUri(loc.filePath),
        range: {
          start: { line: loc.line - 1, character: 0 },
          end: { line: loc.line - 1, character: 0 }
        }
      });
      return;
    }
    case "textDocument/codeAction": {
      const uri = asRecord(params.textDocument).uri;
      const range = asRecord(params.range);
      const startLine = asRecord(range.start).line;
      const endLine = asRecord(range.end).line;
      const diagnostics = diagnosticsOf(uri);
      const actions = [];
      for (const step of stepsOf(uri).filter(
        (s) => s.line >= startLine && s.line <= endLine
      )) {
        const resolution = resolveStep(step.text, uriToPath(uri), index);
        if (resolution.kind !== "missing") continue;
        const newUri = pathToUri(
          path3.join(resolution.folder, `${resolution.fileStem}.dart`)
        );
        actions.push({
          title: "Create step file",
          kind: "quickfix",
          diagnostics: diagnostics.filter(
            (d) => d.range.start.line === step.line
          ),
          edit: {
            documentChanges: [
              {
                kind: "create",
                uri: newUri,
                options: { ignoreIfExists: true }
              },
              {
                textDocument: { uri: newUri, version: null },
                edits: [
                  {
                    range: {
                      start: { line: 0, character: 0 },
                      end: { line: 0, character: 0 }
                    },
                    newText: scaffoldStepDart(step.text, step.hasDataTable)
                  }
                ]
              }
            ]
          }
        });
      }
      reply(id, actions);
      return;
    }
    case "workspace/didChangeConfiguration": {
      const raw = asRecord(params.settings);
      settings = mergeSettings(settings, SECTION in raw ? raw[SECTION] : raw);
      makeIndex();
      for (const uri of documents.keys()) publishDiagnostics(uri);
      return;
    }
    case "shutdown": {
      reply(id, null);
      return;
    }
    case "exit": {
      process.exit(0);
      return;
    }
    default: {
      if (id !== void 0)
        replyError(id, -32601, `Method not found: ${msg.method}`);
    }
  }
}
console.error(`[${SERVER_NAME}] LSP server started`);
