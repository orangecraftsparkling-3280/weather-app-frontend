class WeatherService {
  async getCurrentWeather(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code&timezone=Asia%2FTokyo`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("API通信エラー");
    return await response.json();
  }

  async getAddress(lat, lon) {
    try {
      const url = `https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=${lat}&lon=${lon}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.results) {
        return data.results.muniNm || data.results.lv01Nm || "場所不明";
      }
      return null;
    } catch (e) {
      console.error("住所取得エラー:", e);
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
      48: "霧（霧氷）",
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
      82: "激しいにわか雨",
      95: "雷雨",
    };
    return descriptions[code] || "☁️ 気象情報";
  }

  getWeatherIcon(code) {
    const icons = {
      0: "☀️",
      1: "🌤️",
      2: "⛅",
      3: "☁️",
      45: "🌫️",
      48: "🌫️",
      51: "🌦️",
      53: "🌧️",
      55: "🌧️",
      61: "🌦️",
      63: "🌧️",
      65: "🌧️",
      71: "❄️",
      73: "❄️",
      75: "❄️",
      80: "🌦️",
      81: "🌧️",
      82: "⛈️",
      95: "⛈️",
    };
    return icons[code] || "❓";
  }
}

class WeatherApp {
  constructor() {
    this.service = new WeatherService();
    this.bodyEl = document.getElementById("app-body");
    this.select = document.getElementById("location-select");
    this.fetchBtn = document.getElementById("fetch-btn");
    this.geoBtn = document.getElementById("geo-btn");
    this.locationDisplay = document.getElementById("current-location-display");

    this.init();
    this.fetchBtn.addEventListener("click", () => this.handleSelect());
    this.geoBtn.addEventListener("click", () => this.handleGeolocation());
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

  async updateUI(lat, lon) {
    try {
      const data = await this.service.getCurrentWeather(lat, lon);
      const curr = data.current;
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
      document.getElementById("weather-icon").textContent =
        this.service.getWeatherIcon(curr.weather_code);
      // 【追加】ここで背景を更新する
      this.updateBackgroundEffect(curr.weather_code);
    } catch (error) {
      alert("情報の取得に失敗しました");
    }
  }

  updateBackgroundEffect(code) {
    // 既存の背景関連のクラスをすべて削除
    this.bodyEl.className =
      "min-h-screen flex items-center justify-center p-4 transition-all duration-1000";

    // Tailwindのクラスを直接付与
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

  handleSelect() {
    const selectedOption = this.select.options[this.select.selectedIndex];
    const [lat, lon] = selectedOption.value.split(",");

    this.updateUI(lat, lon);
    this.locationDisplay.textContent = `現在の表示：${selectedOption.text}`;
  }

  async handleGeolocation() {
    if (!navigator.geolocation)
      return alert("ブラウザが位置情報に対応していません。");

    this.geoBtn.textContent = "⏳ 取得中...";
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        // asyncを追加
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        this.updateUI(lat, lon);

        // APIを呼び出して住所を取得
        const address = await this.service.getAddress(lat, lon);

        // 住所が取れたら市町村名を表示、取れなければ緯度経度を表示
        const locationText = address
          ? address
          : `緯度:${lat.toFixed(2)}, 経度:${lon.toFixed(2)}`;
        this.locationDisplay.textContent = `現在の表示：${locationText}`;

        this.geoBtn.textContent = "📍 現在地";
      },
      () => {
        alert("位置情報の取得に失敗しました。");
        this.geoBtn.textContent = "📍 現在地";
      },
    );
  }
}

document.addEventListener("DOMContentLoaded", () => new WeatherApp());
