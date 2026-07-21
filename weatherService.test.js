// @vitest-environment jsdom
import { describe, it, test, expect, beforeEach, vi } from "vitest";
import { WeatherService } from "./weatherService.js";
import WeatherApp from "./app.js";

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

describe("重複登録・連打防止のテスト", () => {
  let mockWeatherService;
  let app;

  beforeEach(() => {
    // DOMのクリアと再セットアップ
    document.body.innerHTML = `
      <select id="location-select"></select>
      <button id="geo-btn">現在地</button>
      <div id="location-name"></div>
    `;

    mockWeatherService = {
      getLocations: vi.fn().mockResolvedValue([]),
      registerLocation: vi.fn().mockResolvedValue({ status: "success" }),
      getAddress: vi.fn().mockResolvedValue("東京都"),
      getCurrentWeather: vi
        .fn()
        .mockResolvedValue({ current: {}, daily: {}, hourly: {} }),
    };

    // new WeatherApp の中で initEvents() が走り、geo-btn にイベントがバインドされる
    app = new WeatherApp(mockWeatherService);
  });

  test("1. 重複する地名がDBから返ってきた場合、セレクトボックスに重複して追加されないこと", async () => {
    // JAPAN_LOCATIONS の "東京" と重複するデータをモックとして返却
    mockWeatherService.getLocations.mockResolvedValue([
      { city_name: "東京", latitude: 35.6895, longitude: 139.6917 },
      { city_name: "横浜", latitude: 35.4437, longitude: 139.638 },
    ]);

    await app.initLocations();

    const select = document.getElementById("location-select");
    const options = Array.from(select.querySelectorAll("option"));
    const tokyoOptions = options.filter((opt) =>
      opt.textContent.includes("東京"),
    );

    // 「東京」は主要都市リストとDB返却値で重複しても 1つ だけ存在する
    expect(tokyoOptions.length).toBe(1);
  });

  test("2. 現在地ボタン連打時、処理完了までボタンが disabled になり、二重リクエストが走らないこと", () => {
    const geoBtn = document.getElementById("geo-btn");

    navigator.geolocation = {
      getCurrentPosition: vi.fn((success) => {
        // 処理実行中に disabled になっていることをチェック
        expect(geoBtn.disabled).toBe(true);

        setTimeout(() => {
          success({ coords: { latitude: 35.68, longitude: 139.76 } });
        }, 100);
      }),
    };

    // 1回目クリック（app.js の initEvents で登録されたリスナーが発火）
    geoBtn.click();

    // 2回目クリック（連打：disabled ガードに引っかかりスルーされるべき）
    geoBtn.click();

    // getCurrentPosition は 1 回しか呼ばれないこと
    expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
  });
});

describe("堅牢化・例外処理テスト", () => {
  let mockWeatherService;
  let app;

  beforeEach(() => {
    document.body.innerHTML = `
      <select id="location-select">
        <option value="">選択してください</option>
      </select>
      <button id="geo-btn">現在地</button>
      <div id="location-name"></div>
    `;

    mockWeatherService = {
      getLocations: vi.fn().mockResolvedValue([]),
      registerLocation: vi.fn().mockResolvedValue({ status: "success" }),
      getAddress: vi.fn().mockResolvedValue("東京都"),
      getCurrentWeather: vi
        .fn()
        .mockResolvedValue({ current: {}, daily: {}, hourly: {} }),
    };

    // テストログが汚れるのを防ぎつつ検証できるようにスパイ化
    vi.spyOn(window, "alert").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    app = new WeatherApp(mockWeatherService);
  });

  test("位置情報の取得拒否・エラー時、アラートが表示されボタンの disabled が復元されること", async () => {
    const geoBtn = document.getElementById("geo-btn");

    navigator.geolocation = {
      getCurrentPosition: vi.fn((success, error) => {
        // 位置情報拒否（PERMISSION_DENIED）などのエラーを再現
        error({ code: 1, message: "User denied Geolocation" });
      }),
    };

    await app.getCurrentLocationWeather();

    // ユーザーへアラートが出ているか
    expect(window.alert).toHaveBeenCalled();
    // エラー後もボタンが活性状態（disabled: false）に戻っているか
    expect(geoBtn.disabled).toBe(false);
  });

  test("APIエラー発生時、例外をキャッチしてボタンの disabled が正しく復元されること", async () => {
    const geoBtn = document.getElementById("geo-btn");

    // WeatherService の通信エラーをモック
    mockWeatherService.getCurrentWeather.mockRejectedValue(
      new Error("500 Internal Server Error"),
    );

    // 回避策: async コールバックの完了（Promiseの解決）を待ってから検証できるようにする
    let asyncCallbackPromise;
    navigator.geolocation = {
      getCurrentPosition: vi.fn((success) => {
        // コールバックが返す Promise を保持しておく
        asyncCallbackPromise = success({
          coords: { latitude: 35.68, longitude: 139.76 },
        });
      }),
    };

    app.getCurrentLocationWeather();

    // 非同期コールバックの完了を確実に待つ
    await asyncCallbackPromise;

    // console.error でエラーハンドリングされているか
    expect(console.error).toHaveBeenCalled();
    // 通信エラーが起きても連打防止ガードが解除されているか
    expect(geoBtn.disabled).toBe(false);
  });

  test("ドロップダウン変更時、選択された地域の座標で fetchWeather が発火すること", async () => {
    const select = document.getElementById("location-select");
    const targetData = JSON.stringify({
      lat: 35.6895,
      lon: 139.6917,
      name: "東京",
    });

    // オプションの挿入
    select.innerHTML += `<option value='${targetData}'>東京</option>`;

    // fetchWeather メソッドをスパイ化
    const fetchWeatherSpy = vi
      .spyOn(app, "fetchWeather")
      .mockImplementation(() => Promise.resolve());

    // セレクトボックスの値を変更して change イベントを送信
    select.value = targetData;
    select.dispatchEvent(new Event("change"));

    // 正しい引数で呼ばれたか確認
    expect(fetchWeatherSpy).toHaveBeenCalledWith(35.6895, 139.6917, "東京");
  });
});
