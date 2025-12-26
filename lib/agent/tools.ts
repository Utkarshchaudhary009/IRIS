import { tool } from "ai";
import { z } from "zod";

// ============================================
// Built-in Tools for ToolLoopAgent
// ============================================

/**
 * Get the current date and time
 */
export const getDateTime = tool({
    description: "Get the current date and time in ISO format",
    parameters: z.object({
        timezone: z
            .string()
            .optional()
            .describe("Optional timezone (e.g., 'America/New_York', 'Asia/Kolkata')"),
    }),
    execute: async ({ timezone }) => {
        const now = new Date();
        const options: Intl.DateTimeFormatOptions = {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            timeZoneName: "short",
        };

        if (timezone) {
            options.timeZone = timezone;
        }

        return {
            iso: now.toISOString(),
            formatted: now.toLocaleString("en-US", options),
            timestamp: now.getTime(),
        };
    },
});

/**
 * Get weather information for a location (example tool from docs)
 */
export const getWeather = tool({
    description: "Get the current weather at a location",
    parameters: z.object({
        latitude: z.number().describe("Latitude of the location"),
        longitude: z.number().describe("Longitude of the location"),
        city: z.string().describe("City name for display purposes"),
    }),
    execute: async ({ latitude, longitude, city }) => {
        try {
            const response = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weathercode,relativehumidity_2m&timezone=auto`
            );

            if (!response.ok) {
                throw new Error("Weather API request failed");
            }

            const weatherData = await response.json();

            return {
                city,
                temperature: weatherData.current.temperature_2m,
                unit: "°C",
                weatherCode: weatherData.current.weathercode,
                humidity: weatherData.current.relativehumidity_2m,
                description: getWeatherDescription(weatherData.current.weathercode),
            };
        } catch (error) {
            return {
                error: `Failed to get weather for ${city}`,
                city,
            };
        }
    },
});

/**
 * Calculate a mathematical expression
 */
export const calculate = tool({
    description: "Perform a mathematical calculation",
    parameters: z.object({
        expression: z
            .string()
            .describe("Mathematical expression to evaluate (e.g., '2 + 2', '10 * 5')"),
    }),
    execute: async ({ expression }) => {
        try {
            // Safe evaluation using Function constructor with limited scope
            // Only allows basic math operations
            const sanitized = expression.replace(/[^0-9+\-*/().%\s]/g, "");
            if (sanitized !== expression.trim()) {
                return { error: "Invalid characters in expression" };
            }

            // Using indirect eval through Function for basic math
            const result = new Function(`return ${sanitized}`)();

            return {
                expression,
                result: Number(result),
            };
        } catch (error) {
            return {
                error: `Failed to calculate: ${expression}`,
                expression,
            };
        }
    },
});

/**
 * Search the web using a search query (placeholder - can be connected to actual search API)
 */
export const searchWeb = tool({
    description: "Search the web for information. Use this when you need to find current information.",
    parameters: z.object({
        query: z.string().describe("The search query"),
    }),
    execute: async ({ query }) => {
        // This is a placeholder - in production, connect to a search API like Exa, Serper, etc.
        return {
            message: "Web search is not configured. Please set up a search API integration.",
            query,
            results: [],
        };
    },
});

// ============================================
// Tool Registry
// ============================================

export const builtinTools = {
    getDateTime,
    getWeather,
    calculate,
    searchWeb,
};

export type BuiltinToolName = keyof typeof builtinTools;

// ============================================
// Helper Functions
// ============================================

function getWeatherDescription(code: number): string {
    const descriptions: Record<number, string> = {
        0: "Clear sky",
        1: "Mainly clear",
        2: "Partly cloudy",
        3: "Overcast",
        45: "Foggy",
        48: "Depositing rime fog",
        51: "Light drizzle",
        53: "Moderate drizzle",
        55: "Dense drizzle",
        61: "Slight rain",
        63: "Moderate rain",
        65: "Heavy rain",
        71: "Slight snow",
        73: "Moderate snow",
        75: "Heavy snow",
        77: "Snow grains",
        80: "Slight rain showers",
        81: "Moderate rain showers",
        82: "Violent rain showers",
        85: "Slight snow showers",
        86: "Heavy snow showers",
        95: "Thunderstorm",
        96: "Thunderstorm with slight hail",
        99: "Thunderstorm with heavy hail",
    };

    return descriptions[code] || "Unknown";
}
