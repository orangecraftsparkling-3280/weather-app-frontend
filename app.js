// LaravelバックエンドのベースURL
const API_BASE_URL = "http://localhost/api";

class WeatherService {
  // Docker環境に合わせたAPIのベースURL
  apiBaseUrl = "http://localhost/api";

  async getCurrentWeather(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code&hourly=temperature_2m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia%2FTokyo`;
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

  // Laravelへの登録メソッド（緯度・経度も送信するように対応）
  async registerLocation(cityName, countryCode = "JP", lat, lon) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/locations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          city_name: cityName,
          country_code: countryCode,
          latitude: lat,
          longitude: lon,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Laravelへの登録失敗:", errorData);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error("通信エラー:", error);
      return null;
    }
  }

  // Laravelから登録済みの場所リストを取得するメソッド
  async getLocations() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/locations`, {
        headers: {
          Accept: "application/json",
        },
      });
      if (!response.ok) throw new Error("場所リストの取得失敗");
      return await response.json();
    } catch (error) {
      console.error("場所リスト取得エラー:", error);
      return [];
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
      96: "⛈️",
      99: "⛈️",
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

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      month: "numeric",
      day: "numeric",
      weekday: "short",
    });
  }

  updateTodayDate() {
    const todayDateEl = document.getElementById("today-date");
    if (todayDateEl) {
      todayDateEl.textContent = this.formatDate(new Date());
    }
  }

  // 初期化処理でLaravelのデータも読み込む
  async init() {
    // 1. 選択肢を一度クリア
    this.select.innerHTML = '<option value="">地域を選択してください</option>';

    // 2. 既存のローカル配列（JAPAN_LOCATIONS）があればセレクトボックスに追加
    if (typeof JAPAN_LOCATIONS !== "undefined") {
      JAPAN_LOCATIONS.forEach((loc) => {
        this.addLocationOption(loc.name, `${loc.lat},${loc.lon}`);
      });
    }

    // 3. LaravelのDBに保存されている場所リストを取得して追加
    console.log("Laravelから登録済みの場所を読み込んでいます...");
    const dbLocations = await this.service.getLocations();

    if (dbLocations.length > 0) {
      // 区切り線用のダミー option を挟む
      const divider = document.createElement("option");
      divider.disabled = true;
      divider.textContent = "── お気に入り・履歴 ──";
      this.select.appendChild(divider);

      // データベースから取得したデータを追加（valueに緯度,経度を仕込む）
      dbLocations.forEach((loc) => {
        const latLonValue = `${loc.latitude},${loc.longitude}`;
        this.addLocationOption(loc.city_name, latLonValue, "db-location");
      });
    }
  }

  // セレクトボックスに選択肢を追加する共通ヘルパーメソッド
  addLocationOption(text, value, className = "") {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = text;
    if (className) opt.className = className;
    this.select.appendChild(opt);
    return opt;
  }

  // セレクトボックス選択時の処理（すべて緯度経度から天気を引けるようになりました）
  async handleSelect() {
    const selectedOption = this.select.options[this.select.selectedIndex];
    if (!selectedOption.value) return;

    const [lat, lon] = selectedOption.value.split(",");
    this.updateUI(lat, lon);
    this.locationDisplay.textContent = selectedOption.text;
  }

  async updateUI(lat, lon) {
    try {
      const data = await this.service.getCurrentWeather(lat, lon);
      const { current: curr, daily, hourly } = data;

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

      const hourlyEl = document.getElementById("hourly-forecast");
      hourlyEl.innerHTML = hourly.time
        .slice(0, 24)
        .map((time, i) => {
          const hour = new Date(time).getHours();
          return `
          <div class="flex flex-col items-center min-w-[60px] p-2 bg-white/20 rounded-xl">
            <span class="text-xs">${hour}:00</span>
            <span class="font-bold">${hourly.temperature_2m[i]}°C</span>
          </div>
        `;
        })
        .join("");
    } catch {
      alert("取得失敗");
    }
  }

  updateBackgroundEffect(code) {
    const hour = new Date().getHours();
    const isNight = hour >= 19 || hour < 5;

    let gradient = "";
    if (code === 0 || code === 1) gradient = "from-yellow-100 to-yellow-400";
    else if (code === 2 || code === 3) gradient = "from-slate-200 to-slate-500";
    else if (code >= 51 && code <= 65) gradient = "from-blue-200 to-blue-600";
    else if (code >= 71 && code <= 77) gradient = "from-sky-100 to-blue-200";
    else if (code >= 95) gradient = "from-purple-300 to-indigo-900";
    else gradient = "from-blue-100 to-indigo-200";

    this.bodyEl.className = `min-h-screen flex items-center justify-center p-4 transition-all duration-1000 bg-gradient-to-br ${gradient}`;

    if (isNight) {
      this.bodyEl.classList.add("brightness-50");
    } else {
      this.bodyEl.classList.remove("brightness-50");
    }
  }

  // 現在地取得・登録時の処理
  async handleGeolocation() {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      this.updateUI(lat, lon);

      const addr = await this.service.getAddress(lat, lon);
      const cityName = addr || "現在地";
      this.locationDisplay.textContent = cityName;

      if (addr) {
        // ★ すでにセレクトボックスの中に、同じ地名の選択肢が存在するかチェック
        const isAlreadyRegistered = Array.from(this.select.options).some(
          (opt) => opt.textContent === cityName,
        );

        if (isAlreadyRegistered) {
          console.log(
            `「${cityName}」はすでに登録済みのため、サーバーへの登録をスキップします。`,
          );
          // すでにリストにあるので、その値（緯度,経度）を選択状態にする
          this.select.value = `${lat},${lon}`;
          return; // ここで処理を終了（POST送信しない）
        }

        console.log(`「${cityName}」を登録します...`);
        // 第3・第4引数に経緯度を渡して登録要請
        const result = await this.service.registerLocation(
          cityName,
          "JP",
          lat,
          lon,
        );
        if (result) {
          console.log("登録が成功しました:", result);

          await this.init();

          // 新しく登録された地点を選択状態にする
          this.select.value = `${lat},${lon}`;
        } else {
          console.warn("登録に失敗しました");
        }
      }
    });
  }
}
document.addEventListener("DOMContentLoaded", () => new WeatherApp());
