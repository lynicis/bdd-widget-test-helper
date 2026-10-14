import { describe, expect, it } from "vitest";
import {
  camelize,
  examplePlaceholders,
  genericParameterType,
  getStepFilename,
  parseRawStepLine,
  predefinedSteps,
  removeDiacritics,
  stepIdentifier,
  underscore,
} from "../../naming";

describe("naming (ported from bdd_widget_test)", () => {
  it("maps ASCII step text to method and file names", () => {
    expect(stepIdentifier("the app is running")).toBe("theAppIsRunning");
    expect(getStepFilename("the app is running")).toBe("the_app_is_running");
  });

  it("folds diacritics (upstream diacritics_test.dart)", () => {
    expect(getStepFilename("los diacríticos son útil")).toBe(
      "los_diacriticos_son_util",
    );
    expect(removeDiacritics("Özellik")).toBe("Ozellik");
  });

  it("strips <placeholders> before naming (scenario outlines)", () => {
    expect(stepIdentifier("there are <start> cucumbers")).toBe(
      "thereAreCucumbers",
    );
    expect(
      examplePlaceholders("there are <start> cucumbers and <end> left"),
    ).toEqual(["start", "end"]);
  });

  it("splits {parameters} out of the step name", () => {
    expect(stepIdentifier("I see {'0'} text")).toBe("iSeeText");
    expect(getStepFilename("I see {'0'} text")).toBe("i_see_text");
    expect(parseRawStepLine("I see {1} users")).toEqual(["I see  users", "1"]);
    expect(stepIdentifier("I see {1} users")).toBe("iSeeUsers");
    expect(stepIdentifier("the price is {3.14} dollars")).toBe(
      "thePriceIsDollars",
    );
    expect(stepIdentifier("flag is {true}")).toBe("flagIs");
  });
  it("keeps nested braces inside a parameter", () => {
    // note: full nested-brace case exercised in Dart upstream; here the simple split
    expect(parseRawStepLine("I run {a{b}c} now")).toEqual([
      "I run  now",
      "a{b}c",
    ]);
  });

  it("rejects steps that name no usable identifier", () => {
    expect(stepIdentifier("アプリが起動している")).toBeNull();
    expect(stepIdentifier("2FA is on")).toBeNull();
    expect(stepIdentifier("_debug mode is on")).toBeNull();
    expect(stepIdentifier("{5}")).toBeNull();
  });

  it("types parameters like GenericStep", () => {
    expect(genericParameterType("true")).toBe("bool");
    expect(genericParameterType("false")).toBe("bool");
    expect(genericParameterType("42")).toBe("num");
    expect(genericParameterType("3.14")).toBe("num");
    expect(genericParameterType("'text'")).toBe("String");
    expect(genericParameterType('"text"')).toBe("String");
    expect(genericParameterType("foo")).toBe("dynamic");
  });

  it("handles Turkish step text", () => {
    expect(stepIdentifier("uygulama çalışıyor")).toBe("uygulamaCalisiyor");
    expect(getStepFilename("uygulama çalışıyor")).toBe("uygulama_calisiyor");
    expect(stepIdentifier("Özellik başlıyor")).toBe("ozellikBasliyor");
  });

  it("camelizes and underscores like string_utils.dart", () => {
    expect(camelize("The_app_is_running")).toBe("theAppIsRunning");
    expect(underscore("theAppIsRunning")).toBe("the_app_is_running");
    expect(underscore("theScreenMatchesGolden")).toBe(
      "the_screen_matches_golden",
    );
  });

  it("knows the built-in steps", () => {
    expect(predefinedSteps.has("theAppIsRunning")).toBe(true);
    expect(predefinedSteps.has("iSeeText")).toBe(true);
    expect(predefinedSteps.has("theScreenMatchesGolden")).toBe(true);
    expect(predefinedSteps.has("iDoNotExist")).toBe(false);
    expect(predefinedSteps.size).toBe(20);
  });
});
