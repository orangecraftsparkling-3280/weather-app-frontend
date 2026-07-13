class WeatherService {
  async getCurrentWeather(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia%2FTokyo`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("API通信エラー");
    return await response.json();
  }

  async getAddress(lat, lon) {
    try {
      const response = await fetch(
        `https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=${lat}&lon=${lon}`,
      );
      const data = await response.json();
      return data.results ? data.results.muniNm || data.results.lv01Nm : null;
    } catch {
      return null;
    }
  }

  getWeatherDescription(code) {
    const descriptions = {
      0: "快晴",
      1: "晴れ",
      2: "晴れ時々曇り",
      3: "曇り",
      45: "霧",
      48: "霧",
      51: "小雨",
      53: "雨",
      55: "強い雨",
      61: "小雨",
      63: "雨",
      65: "激しい雨",
      71: "小雪",
      73: "雪",
      75: "大雪",
      80: "にわか雨",
      81: "にわか雨",
      82: "激しい雨",
      95: "雷雨",
      96: "雷雨",
      99: "激しい雷雨",
    };
    return descriptions[code] || "気象情報";
  }

  getWeatherIcon(code) {
    const icons = {
      0: "☀️", // 快晴
      1: "🌤️", // 晴れ
      2: "⛅", // 晴れ時々曇り
      3: "☁️", // 曇り
      45: "🌫️",
      48: "🌫️", // 霧
      51: "🌦️",
      53: "🌧️",
      55: "🌧️", // 小雨・雨・強い雨
      61: "🌦️",
      63: "🌧️",
      65: "🌧️", // 雨
      71: "❄️",
      73: "❄️",
      75: "❄️", // 雪
      80: "🌦️",
      81: "🌧️",
      82: "⛈️", // にわか雨
      95: "⛈️",
      96: "⛈️",
      99: "⛈️", // 雷雨
    };
    return icons[code] || "❓";
  }
}

class WeatherApp {
  constructor() {
    this.service = new WeatherService();
    this.bodyEl = document.getElementById("app-body");
    this.select = document.getElementById("location-select");
    this.geoBtn = document.getElementById("geo-btn");
    this.locationDisplay = document.getElementById("location-name");

    this.init();
    this.select.addEventListener("change", () => this.handleSelect());
    this.geoBtn.addEventListener("click", () => this.handleGeolocation());
  }

  // 日付フォーマット用ヘルパー
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      month: "numeric",
      day: "numeric",
      weekday: "short",
    });
  }

  // 今日の日付をセットするメソッド
  updateTodayDate() {
    const todayDateEl = document.getElementById("today-date");
    if (todayDateEl) {
      todayDateEl.textContent = this.formatDate(new Date());
    }
  }

  init() {
    if (typeof JAPAN_LOCATIONS !== "undefined") {
      JAPAN_LOCATIONS.forEach((loc) => {
        const opt = document.createElement("option");
        opt.value = `${loc.lat},${loc.lon}`;
        opt.textContent = loc.name;
        this.select.appendChild(opt);
      });
    }
  }

  handleSelect() {
    const selectedOption = this.select.options[this.select.selectedIndex];
    if (!selectedOption.value) return;
    const [lat, lon] = selectedOption.value.split(",");
    this.updateUI(lat, lon);
    this.locationDisplay.textContent = selectedOption.text;
  }

  async updateUI(lat, lon) {
    try {
      const data = await this.service.getCurrentWeather(lat, lon);
      const { current: curr, daily } = data;

      // 日付の更新
      this.updateTodayDate();

      this.updateBackgroundEffect(curr.weather_code);

      document.getElementById("weather").textContent =
        this.service.getWeatherDescription(curr.weather_code);
      document.getElementById("temperature").textContent =
        `${curr.temperature_2m}°C`;
      document.getElementById("humidity").textContent =
        `${curr.relative_humidity_2m}%`;
      document.getElementById("apparent-temp").textContent =
        `${curr.apparent_temperature}°C`;
      document.getElementById("wind-speed").textContent =
        `${curr.wind_speed_10m} km/h`;
      document.getElementById("weather-icon").textContent =
        this.service.getWeatherIcon(curr.weather_code);

      const listEl = document.getElementById("forecast-list");
      listEl.innerHTML = daily.time
        .map(
          (date, i) => `
        <div class="flex items-center justify-between px-4 py-2 bg-white/30 rounded-xl">
          <span class="font-bold">${this.formatDate(date)}</span>
          <span class="text-xl">${this.service.getWeatherIcon(daily.weather_code[i])}</span>
          <span class="text-sm">${daily.temperature_2m_max[i]}° / ${daily.temperature_2m_min[i]}°</span>
        </div>
      `,
        )
        .join("");
    } catch {
      alert("取得失敗");
    }
  }
  updateBackgroundEffect(code) {
    // 既存の背景関連のクラスをすべてリセット
    this.bodyEl.className =
      "min-h-screen flex items-center justify-center p-4 transition-all duration-1000";

    // 天気コードに基づいてクラスを付与
    if (code === 0 || code === 1)
      this.bodyEl.classList.add(
        "bg-gradient-to-br",
        "from-yellow-100",
        "to-yellow-400",
      );
    else if (code === 2 || code === 3)
      this.bodyEl.classList.add(
        "bg-gradient-to-br",
        "from-slate-200",
        "to-slate-500",
      );
    else if (code >= 51 && code <= 65)
      this.bodyEl.classList.add(
        "bg-gradient-to-br",
        "from-blue-200",
        "to-blue-600",
      );
    else if (code >= 71 && code <= 77)
      this.bodyEl.classList.add(
        "bg-gradient-to-br",
        "from-sky-100",
        "to-blue-200",
      );
    else if (code >= 95)
      this.bodyEl.classList.add(
        "bg-gradient-to-br",
        "from-purple-300",
        "to-indigo-900",
      );
    else
      this.bodyEl.classList.add(
        "bg-gradient-to-br",
        "from-blue-100",
        "to-indigo-200",
      );
  }
  async handleGeolocation() {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      this.updateUI(pos.coords.latitude, pos.coords.longitude);
      const addr = await this.service.getAddress(
        pos.coords.latitude,
        pos.coords.longitude,
      );
      this.locationDisplay.textContent = addr || "現在地";
    });
  }
}
document.addEventListener("DOMContentLoaded", () => new WeatherApp());
