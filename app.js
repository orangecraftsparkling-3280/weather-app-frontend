// ==========================================
// 1. DATA LAYER (通信を担当)
// ==========================================
class WeatherRepository {
  async fetchRawData() {
    // 🌐 パラメーターの current に「wind_direction_10m」を新しく追加しました！
    const url =
      "https://api.open-meteo.com/v1/forecast?latitude=35.6785&longitude=139.6823&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code&timezone=Asia%2FTokyo";

    const response = await fetch(url);
    if (!response.ok) throw new Error("データの取得に失敗しました");
    return await response.json();
  }
}

// ==========================================
// 2. DOMAIN LAYER (データ加工・配列操作を担当)
// ==========================================
class GetTokyoWeatherUseCase {
  constructor(weatherRepository) {
    this.weatherRepository = weatherRepository;
  }

  // WMO気象コードを日本語に変換
  #translateWeatherCode(code) {
    if (code === 0) return "☀️ 晴れ";
    if ([1, 2, 3].includes(code)) return "🌤️ 晴れときどき曇り";
    if ([45, 48].includes(code)) return "🌫️ 霧";
    if ([51, 53, 55, 56, 57].includes(code)) return "🌧️ 霧雨";
    if ([61, 63, 65, 66, 67].includes(code)) return "☔ 雨";
    if ([71, 73, 75, 77].includes(code)) return "❄️ 雪";
    if ([80, 81, 82].includes(code)) return "🌦️ にわか雨";
    if ([85, 86].includes(code)) return "🌨️ にわか雪";
    if ([95, 96, 99].includes(code)) return "⚡ 雷雨";
    return "❓ 不明";
  }

  // 💡 角度（0〜360度）を16方位の文字列に変換するヘルパー関数
  #convertDegreeToDirection(degree) {
    const directions = [
      "北 ⬇️",
      "北北東 ↙️",
      "北東 ↙️",
      "東北東 ↙️",
      "東 ⬅️",
      "東南東 ↖️",
      "南東 ↖️",
      "南南東 ↖️",
      "南 ⬆️",
      "南南西 ↗️",
      "南西 ↗️",
      "西南西 ↗️",
      "西 ➡️",
      "西北西 ↘️",
      "北西 ↘️",
      "北北西 ↘️",
    ];
    // 360度を16等分（22.5度ずつ）して、どの方位に一番近いか計算
    const index = Math.round(degree / 22.5) % 16;
    return directions[index];
  }

  async execute() {
    const rawData = await this.weatherRepository.fetchRawData();
    const current = rawData.current;

    return {
      timezone: rawData.timezone,
      temperature: `${current.temperature_2m}°C`,
      humidity: `${current.relative_humidity_2m}%`,
      windSpeed: `${current.wind_speed_10m} km/h`,
      weatherText: this.#translateWeatherCode(current.weather_code),
      // 💡 ここで風向きの角度を方位（文字列）に変換して追加
      windDirection: this.#convertDegreeToDirection(current.wind_direction_10m),
    };
  }
}

// ==========================================
// 3. PRESENTATION LAYER (UI・画面への表示を担当)
// ==========================================
class WeatherPresenter {
  constructor(getWeatherUseCase) {
    this.getWeatherUseCase = getWeatherUseCase;
    this.btn = document.getElementById("fetch-btn");

    // UIパーツの取得
    this.weatherEl = document.getElementById("weather");
    this.tempEl = document.getElementById("temperature");
    this.humidityEl = document.getElementById("humidity");
    this.windEl = document.getElementById("wind-speed");
    // 💡 HTML側に風向きを表示する場所（id="wind-direction"）を追加する想定です
    this.windDirEl = document.getElementById("wind-direction");

    this.btn.addEventListener("click", () => this.handleFetchClick());
  }

  async handleFetchClick() {
    console.log("① [UI] ボタンがクリックされました。");
    try {
      this.btn.textContent = "取得中...";
      const result = await this.getWeatherUseCase.execute();

      console.log(`③ [UI] 風向き: ${result.windDirection}`);

      // HTMLの画面上のテキストを書き換える
      if (this.weatherEl) this.weatherEl.textContent = result.weatherText;
      if (this.tempEl) this.tempEl.textContent = result.temperature;
      if (this.humidityEl) this.humidityEl.textContent = result.humidity;
      if (this.windEl) this.windEl.textContent = result.windSpeed;
      if (this.windDirEl) this.windDirEl.textContent = result.windDirection; // 💡追加
    } catch (error) {
      console.error("UIエラー表示:", error.message);
      alert("天気データの取得に失敗しました。");
    } finally {
      this.btn.textContent = "天気情報を取得";
    }
  }
}

// ==========================================
// ⚙️ 依存注入 (Dependency Injection) とアプリ起動
// ==========================================
const repository = new WeatherRepository();
const useCase = new GetTokyoWeatherUseCase(repository);
const presenter = new WeatherPresenter(useCase);

console.log("② [System] 風向き対応アプリの初期化が完了しました。");
