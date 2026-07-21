import { describe, it, expect } from "vitest";
import { WeatherService } from "./weatherService.js";

describe("WeatherService", () => {
  const service = new WeatherService();

  describe("getWeatherDescription", () => {
    it("正しい天気説明文を返すこと (code: 0 -> 快晴)", () => {
      expect(service.getWeatherDescription(0)).toBe("快晴");
    });

    it("正しい天気説明文を返すこと (code: 61 -> 小雨)", () => {
      expect(service.getWeatherDescription(61)).toBe("小雨");
    });

    it("未知のコードの場合はデフォルト値を返すこと", () => {
      expect(service.getWeatherDescription(999)).toBe("気象情報");
    });
  });

  describe("getWeatherIcon", () => {
    it("正しい天気アイコンを返すこと (code: 0 -> ☀️)", () => {
      expect(service.getWeatherIcon(0)).toBe("☀️");
    });

    it("正しい天気アイコンを返すこと (code: 95 -> ⛈️)", () => {
      expect(service.getWeatherIcon(95)).toBe("⛈️");
    });

    it("未知のコードの場合はデフォルトアイコンを返すこと", () => {
      expect(service.getWeatherIcon(999)).toBe("❓");
    });
  });
});
