import { afterEach, describe, expect, it, vi } from "vitest";
import { SingaporeWeatherClient } from "./weather.js";

const twoHourForecast = {
  code: 0,
  data: {
    area_metadata: [
      {
        name: "Bishan",
        label_location: { latitude: 1.35, longitude: 103.839 },
      },
      {
        name: "Bedok",
        label_location: { latitude: 1.321, longitude: 103.924 },
      },
    ],
    items: [
      {
        update_timestamp: "2026-10-05T12:00:00+08:00",
        valid_period: { text: "12 pm to 2 pm" },
        forecasts: [
          { area: "Bishan", forecast: "Fair (Day)" },
          { area: "Bedok", forecast: "Cloudy" },
        ],
      },
    ],
  },
};

function stationReading(value: number) {
  return {
    code: 0,
    data: {
      stations: [
        { id: "NEAR", location: { latitude: 1.35, longitude: 103.84 } },
        { id: "FAR", location: { latitude: 1.4, longitude: 103.9 } },
      ],
      readings: [
        {
          timestamp: "2026-10-05T12:01:00+08:00",
          data: [
            { stationId: "FAR", value: value + 100 },
            { stationId: "NEAR", value },
          ],
        },
      ],
    },
  };
}

const twentyFourHourForecast = {
  code: 0,
  data: {
    records: [
      {
        general: { temperature: { low: 25, high: 32 } },
        periods: [
          {
            timePeriod: { text: "12 pm to 2 pm" },
            regions: { central: { text: "Fair" } },
          },
          {
            timePeriod: { text: "2 pm to 4 pm" },
            regions: { central: { text: "Cloudy" } },
          },
        ],
      },
    ],
  },
};

const fourDayForecast = {
  items: [
    {
      forecasts: [
        {
          date: "2026-10-05",
          forecast: "Fair",
          temperature: { low: 25, high: 32 },
        },
        {
          date: "2026-10-06",
          forecast: "Cloudy",
          temperature: { low: 24, high: 31 },
        },
      ],
    },
  ],
};

const airQualityPayloads = {
  psi: {
    code: 0,
    data: {
      regionMetadata: [
        {
          name: "central",
          labelLocation: { latitude: 1.35, longitude: 103.84 },
        },
      ],
      items: [
        {
          timestamp: "2026-10-05T12:00:00+08:00",
          readings: { psi_twenty_four_hourly: { central: 42 } },
        },
      ],
    },
  },
  pm25: {
    code: 0,
    data: {
      items: [
        {
          timestamp: "2026-10-05T12:00:00+08:00",
          readings: { pm25_one_hourly: { central: 9 } },
        },
      ],
    },
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SingaporeWeatherClient current conditions", () => {
  it("retries a rate-limited API request once after its reset delay", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response("{}", { status: 429, headers: { "Retry-After": "0" } }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(twoHourForecast), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await new SingaporeWeatherClient({
      rateLimitRetryDelayMs: 0,
    }).fetchLatestForecastPayload();

    expect(result).toEqual(twoHourForecast);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("combines the nearest-area forecast with readings from the nearest stations", async () => {
    const payloads: Record<string, unknown> = {
      "two-hr-forecast": twoHourForecast,
      "air-temperature": stationReading(31.2),
      "relative-humidity": stationReading(74),
      rainfall: stationReading(0.6),
      "wind-speed": stationReading(8),
      "wind-direction": stationReading(225),
      uv: {
        code: 0,
        data: {
          records: [
            {
              updatedTimestamp: "2026-10-05T12:00:00+08:00",
              index: [{ hour: "2026-10-05T12:00:00+08:00", value: 7 }],
            },
          ],
        },
      },
      psi: airQualityPayloads.psi,
      pm25: airQualityPayloads.pm25,
      "twenty-four-hr-forecast": twentyFourHourForecast,
      "4-day-weather-forecast": fourDayForecast,
    };
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const endpoint = new URL(String(input)).pathname
        .split("/")
        .at(-1) as string;
      return new Response(JSON.stringify(payloads[endpoint]), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const snapshot = await new SingaporeWeatherClient().getCurrentWeather(
      1.35,
      103.84,
    );

    expect(snapshot).toMatchObject({
      condition: "Fair (Day)",
      area: "Bishan",
      valid_period_text: "12 pm to 2 pm",
      temperature_c: 31.2,
      humidity_percent: 74,
      rainfall_mm: 0.6,
      wind_speed_knots: 8,
      wind_direction_degrees: 225,
      uv_index: 7,
      psi_twenty_four_hourly: 42,
      pm25_one_hourly: 9,
      air_quality_region: "central",
      forecast_low_c: 25,
      forecast_high_c: 32,
      forecast_periods: [
        { label: "12 pm to 2 pm", forecast: "Fair" },
        { label: "2 pm to 4 pm", forecast: "Cloudy" },
      ],
      daily_forecast: [
        {
          date: "2026-10-05",
          forecast: "Fair",
          temperature_low_c: 25,
          temperature_high_c: 32,
        },
        {
          date: "2026-10-06",
          forecast: "Cloudy",
          temperature_low_c: 24,
          temperature_high_c: 31,
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledTimes(11);
    expect(fetchMock.mock.calls.map(([input]) => String(input))).toEqual(
      expect.arrayContaining([
        "https://api-open.data.gov.sg/v2/real-time/api/two-hr-forecast",
        "https://api-open.data.gov.sg/v2/real-time/api/air-temperature",
        "https://api-open.data.gov.sg/v2/real-time/api/relative-humidity",
        "https://api-open.data.gov.sg/v2/real-time/api/rainfall",
        "https://api-open.data.gov.sg/v2/real-time/api/wind-speed",
        "https://api-open.data.gov.sg/v2/real-time/api/wind-direction",
        "https://api-open.data.gov.sg/v2/real-time/api/uv",
        "https://api-open.data.gov.sg/v2/real-time/api/psi",
        "https://api-open.data.gov.sg/v2/real-time/api/pm25",
        "https://api-open.data.gov.sg/v2/real-time/api/twenty-four-hr-forecast",
        "https://api.data.gov.sg/v1/environment/4-day-weather-forecast",
      ]),
    );
  });

  it("keeps available conditions when an individual readings endpoint fails", async () => {
    const payloads: Record<string, unknown> = {
      "two-hr-forecast": twoHourForecast,
      "air-temperature": stationReading(31.2),
      "relative-humidity": stationReading(74),
      "wind-speed": stationReading(8),
      "wind-direction": stationReading(225),
      uv: {
        code: 0,
        data: { records: [{ index: [{ value: 7 }] }] },
      },
      psi: airQualityPayloads.psi,
      pm25: airQualityPayloads.pm25,
      "twenty-four-hr-forecast": twentyFourHourForecast,
      "4-day-weather-forecast": fourDayForecast,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (input) => {
        const endpoint = new URL(String(input)).pathname
          .split("/")
          .at(-1) as string;
        if (endpoint === "rainfall") return new Response("{}", { status: 503 });
        return new Response(JSON.stringify(payloads[endpoint]), {
          status: 200,
        });
      }),
    );

    const snapshot = await new SingaporeWeatherClient().getCurrentWeather(
      1.35,
      103.84,
    );

    expect(snapshot.condition).toBe("Fair (Day)");
    expect(snapshot.temperature_c).toBe(31.2);
    expect(snapshot.humidity_percent).toBe(74);
    expect(snapshot.rainfall_mm).toBeNull();
    expect(snapshot.wind_speed_knots).toBe(8);
    expect(snapshot.wind_direction_degrees).toBe(225);
    expect(snapshot.uv_index).toBe(7);
    expect(snapshot.psi_twenty_four_hourly).toBe(42);
    expect(snapshot.pm25_one_hourly).toBe(9);
    expect(snapshot.forecast_periods).toHaveLength(2);
    expect(snapshot.daily_forecast).toHaveLength(2);
  });
});
