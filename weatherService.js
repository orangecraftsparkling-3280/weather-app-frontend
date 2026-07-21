export class WeatherService {
  apiBaseUrl = "http://localhost/api";

  async getWeather(lat, lon) {
    return await this.getCurrentWeather(lat, lon);
  }

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
        console.error("登録失敗:", errorData);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error("通信エラー:", error);
      return null;
    }
  }

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
