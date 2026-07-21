import { WeatherService } from "./weatherService.js";
import { JAPAN_LOCATIONS } from "./locations.js";

class WeatherApp {
  constructor() {
    this.weatherService = new WeatherService();
    this.initElements();
    this.initLocations();
    this.initEvents();
  }

  initElements() {
    this.locationSelect = document.getElementById("location-select");
    this.geoBtn = document.getElementById("geo-btn");
    this.locationName = document.getElementById("location-name");
    this.weatherEl = document.getElementById("weather");
    this.temperatureEl = document.getElementById("temperature");
    this.humidityEl = document.getElementById("humidity");
    this.apparentTempEl = document.getElementById("apparent-temp");
    this.windSpeedEl = document.getElementById("wind-speed");
    this.hourlyForecastEl = document.getElementById("hourly-forecast");
    this.forecastListEl = document.getElementById("forecast-list");
    this.todayDateEl = document.getElementById("today-date");
    this.weatherIconEl = document.getElementById("weather-icon");
    this.bodyEl = document.getElementById("app-body") || document.body;
  }

  /**
   * 1. JAPAN_LOCATIONS（固定リスト）と Laravel DB の登録済み地点を読込
   */
  async initLocations() {
    if (!this.locationSelect) return;

    // 初期化
    this.locationSelect.innerHTML =
      '<option value="">地域を選択してください</option>';

    // --- 主要都市（固定リスト）---
    const fixedGroup = document.createElement("optgroup");
    fixedGroup.label = "主要都市";
    JAPAN_LOCATIONS.forEach((loc) => {
      const option = document.createElement("option");
      option.value = JSON.stringify({
        lat: loc.lat,
        lon: loc.lon,
        name: loc.name,
      });
      option.textContent = loc.name;
      fixedGroup.appendChild(option);
    });
    this.locationSelect.appendChild(fixedGroup);

    // --- Laravel DB（API）からの登録済み地点取得 ---
    try {
      const savedLocations = await this.weatherService.getLocations();
      if (Array.isArray(savedLocations) && savedLocations.length > 0) {
        const dbGroup = document.createElement("optgroup");
        dbGroup.label = "保存済み地点";
        savedLocations.forEach((loc) => {
          const option = document.createElement("option");
          const name = loc.city_name || loc.name || "名称不明";
          const lat = loc.latitude || loc.lat;
          const lon = loc.longitude || loc.lon;

          option.value = JSON.stringify({ lat, lon, name });
          option.textContent = `★ ${name}`;
          dbGroup.appendChild(option);
        });
        this.locationSelect.appendChild(dbGroup);
      }
    } catch (error) {
      console.warn("地点リスト取得失敗:", error);
    }
  }

  initEvents() {
    if (this.locationSelect) {
      this.locationSelect.addEventListener("change", (e) => {
        if (!e.target.value) return;
        const loc = JSON.parse(e.target.value);
        this.fetchWeather(loc.lat, loc.lon, loc.name);
      });
    }

    if (this.geoBtn) {
      this.geoBtn.addEventListener("click", () => {
        this.getCurrentLocationWeather();
      });
    }
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
    if (this.todayDateEl) {
      this.todayDateEl.textContent = this.formatDate(new Date());
    }
  }

  async fetchWeather(lat, lon, name) {
    try {
      if (this.locationName) {
        this.locationName.textContent = `${name} の天気情報を取得中...`;
      }
      const data = await this.weatherService.getCurrentWeather(lat, lon);
      this.updateUI(data, name);
    } catch (error) {
      console.error("天気取得エラー:", error);
      if (this.locationName) {
        this.locationName.textContent = "天気情報の取得に失敗しました";
      }
    }
  }

  /**
   * 2. 現在地取得・国土地理院APIで市町村名取得・Laravelへ保存
   */
  getCurrentLocationWeather() {
    if (!navigator.geolocation) {
      alert("お使いのブラウザは位置情報取得に対応していません");
      return;
    }

    if (this.locationName) {
      this.locationName.textContent = "現在地を取得中...";
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        let placeName = "現在地";

        // 国土地理院API (getAddress) で市町村名を取得
        try {
          const addressName = await this.weatherService.getAddress(lat, lon);
          if (addressName) {
            placeName = addressName;
          }
        } catch (geoErr) {
          console.warn("地名取得エラー（「現在地」として続行します）:", geoErr);
        }

        // 天気を取得して描画
        await this.fetchWeather(lat, lon, placeName);

        // Laravel DB へ登録 (cityName, countryCode, lat, lon)
        try {
          const result = await this.weatherService.registerLocation(
            placeName,
            "JP",
            lat,
            lon,
          );
          if (result) {
            console.log("登録成功:", result);
            // セレクトボックスを再読込して★付きで反映
            await this.initLocations();
          }
        } catch (dbErr) {
          console.warn("保存エラー:", dbErr);
        }
      },
      (error) => {
        console.error(error);
        alert("位置情報の取得に失敗しました。権限を確認してください。");
        if (this.locationName) {
          this.locationName.textContent = "場所を選択してください";
        }
      },
    );
  }

  updateUI(data, name) {
    try {
      const { current: curr, daily, hourly } = data;

      if (this.locationName) this.locationName.textContent = name;
      this.updateTodayDate();
      this.updateBackgroundEffect(curr.weather_code);

      if (this.weatherEl) {
        this.weatherEl.textContent = this.weatherService.getWeatherDescription(
          curr.weather_code,
        );
      }
      if (this.temperatureEl) {
        this.temperatureEl.textContent = `${curr.temperature_2m}°C`;
      }
      if (this.humidityEl) {
        this.humidityEl.textContent = `${curr.relative_humidity_2m}%`;
      }
      if (this.apparentTempEl) {
        this.apparentTempEl.textContent = `${curr.apparent_temperature}°C`;
      }
      if (this.windSpeedEl) {
        this.windSpeedEl.textContent = `${curr.wind_speed_10m} km/h`;
      }
      if (this.weatherIconEl) {
        this.weatherIconEl.textContent = this.weatherService.getWeatherIcon(
          curr.weather_code,
        );
      }

      if (this.forecastListEl && daily) {
        this.forecastListEl.innerHTML = daily.time
          .map(
            (date, i) => `
          <div class="flex items-center justify-between px-4 py-2 bg-white/30 rounded-xl">
            <span class="font-bold">${this.formatDate(date)}</span>
            <span class="text-xl">${this.weatherService.getWeatherIcon(daily.weather_code[i])}</span>
            <span class="text-sm">${daily.temperature_2m_max[i]}° / ${daily.temperature_2m_min[i]}°</span>
          </div>
        `,
          )
          .join("");
      }

      if (this.hourlyForecastEl && hourly) {
        this.hourlyForecastEl.innerHTML = hourly.time
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
      }
    } catch (error) {
      console.error("UI描画エラー:", error);
      alert("画面表示に失敗しました");
    }
  }

  updateBackgroundEffect(code) {
    if (!this.bodyEl) return;
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
}

document.addEventListener("DOMContentLoaded", () => new WeatherApp());
