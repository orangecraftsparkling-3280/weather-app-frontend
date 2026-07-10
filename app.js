// ==========================================
// 1. DATA LAYER (通信を担当)
// ==========================================
class WeatherRepository {
  async fetchRawData() {
    const response = await fetch(
      "https://www.jma.go.jp/bosai/forecast/data/forecast/130000.json",
    );
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

  async execute() {
    const rawData = await this.weatherRepository.fetchRawData();

    const areaName = rawData[0].publishingOffice;
    const timeSeries = rawData[0].timeSeries[0];

    const dates = timeSeries.timeDefines;
    const weathers = timeSeries.areas[0].weathers;

    // ここでおさらいした map 操作！(引数に一時的なあだ名をつけて展開)
    const formattedForecast = dates.map((date, index) => {
      return {
        date: new Date(date).toLocaleDateString("ja-JP"),
        weather: weathers[index],
      };
    });

    return {
      office: areaName,
      forecasts: formattedForecast,
    };
  }
}

// ==========================================
// 3. PRESENTATION LAYER (UI・ボタンのイベント監視を担当)
// ==========================================
class WeatherPresenter {
  constructor(getWeatherUseCase) {
    this.getWeatherUseCase = getWeatherUseCase;
    this.btn = document.getElementById("fetch-btn");
    this.btn.addEventListener("click", () => this.handleFetchClick());
  }

  async handleFetchClick() {
    console.log("① [UI] ボタンがクリックされました。");
    try {
      const result = await this.getWeatherUseCase.execute();
      console.log(`③ [UI] 発表元: ${result.office}`);
      console.table(result.forecasts); // コンソールに綺麗な表を出す
    } catch (error) {
      console.error("UIエラー表示:", error.message);
    }
  }
}

// ==========================================
// ⚙️ 依存注入 (Dependency Injection) とアプリ起動
// ==========================================
const repository = new WeatherRepository();
const useCase = new GetTokyoWeatherUseCase(repository);
const presenter = new WeatherPresenter(useCase);

console.log("② [System] アプリの初期化が完了しました。");
