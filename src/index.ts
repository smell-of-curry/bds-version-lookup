import express from "express";
import { isValidBdsType, lookupLatestVersion, parsePreviewParam, initializeCache, getCachedVersion } from "./utils";
import { VALID_BDS_TYPES, CACHE_DURATION_MS } from "./config";

const app = express();
const port = process.env.PORT || 3000;

// Middleware for JSON parsing
app.use(express.json());

app.get("/version/:type/:preview", async (req: any, res: any) => {
  try {
    const { type, preview } = req.params;

    // Validate type parameter
    if (!type || !isValidBdsType(type)) {
      return res.status(400).json({
        error: "Invalid type parameter",
        message: `Type must be one of: ${VALID_BDS_TYPES.join(", ")}`,
        received: type
      });
    }

    // Validate preview parameter
    const parsedPreview = parsePreviewParam(preview);
    if (parsedPreview === null) {
      return res.status(400).json({
        error: "Invalid preview parameter",
        message: "Preview must be 'true', 'false', '1', or '0'",
        received: preview
      });
    }

    // Check if we have cached data before lookup
    const cachedVersion = getCachedVersion(type, parsedPreview);
    const isFromCache = cachedVersion !== null;

    const version = await lookupLatestVersion(type, parsedPreview);
    res.json({ 
      version,
      type,
      preview: parsedPreview,
      cached: isFromCache,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error("Error looking up version:", err);
    res.status(500).json({ 
      error: "Internal server error",
      message: err.message || "Failed to lookup version"
    });
  }
});

// Add cache status endpoint
app.get("/cache/status", (req, res) => {
  const combinations = [
    { type: "win", preview: false },
    { type: "win", preview: true },
    { type: "linux", preview: false },
    { type: "linux", preview: true }
  ];

  const cacheStatus = combinations.map(({ type, preview }) => {
    const cachedVersion = getCachedVersion(type as "win" | "linux", preview);
    return {
      type,
      preview,
      cached: cachedVersion !== null,
      version: cachedVersion || null
    };
  });

  res.json({
    cacheDurationMs: CACHE_DURATION_MS,
    cacheDurationHours: CACHE_DURATION_MS / (1000 * 60 * 60),
    entries: cacheStatus,
    timestamp: new Date().toISOString()
  });
});

// Add a health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Add a help endpoint with API documentation
app.get("/", (req, res) => {
  res.json({
    message: "Bedrock Dedicated Server Version Lookup API",
    caching: {
      enabled: true,
      duration: `${CACHE_DURATION_MS / (1000 * 60 * 60)} hours`,
      strategy: "Background refresh - cached responses served while refreshing in background"
    },
    endpoints: {
      "GET /version/:type/:preview": {
        description: "Get the latest BDS version (cached for 6 hours with background refresh)",
        parameters: {
          type: {
            required: true,
            values: VALID_BDS_TYPES,
            example: "win"
          },
          preview: {
            required: true,
            values: ["true", "false", "1", "0"],
            example: "false"
          }
        },
        examples: [
          "/version/win/false - Windows stable version",
          "/version/win/true - Windows preview version",
          "/version/linux/false - Linux stable version",
          "/version/linux/true - Linux preview version"
        ],
        response: {
          fields: [
            "version - The version string",
            "type - The requested type (win/linux)",
            "preview - Whether preview version was requested",
            "cached - Whether this response came from cache",
            "timestamp - Response timestamp"
          ]
        }
      },
      "GET /cache/status": {
        description: "View current cache status for all version combinations",
        response: {
          fields: [
            "cacheDurationMs - Cache duration in milliseconds",
            "cacheDurationHours - Cache duration in hours",
            "entries - Array of cache entries with their status",
            "timestamp - Response timestamp"
          ]
        }
      },
      "GET /health": "Health check endpoint"
    }
  });
});

// Handle 404s - must be last
app.use((req: any, res: any) => {
  res.status(404).json({
    error: "Not found",
    message: `Endpoint ${req.method} ${req.originalUrl} not found`,
    availableEndpoints: ["/", "/version/:type/:preview", "/cache/status", "/health"]
  });
});

app.listen(port, async () => {
  console.log(`🟢 API listening at http://localhost:${port}`);
  
  // Initialize cache on startup
  try {
    await initializeCache();
  } catch (error) {
    console.error("❌ Failed to initialize cache on startup:", error);
    console.log("⚠️  Server will continue running but cache may be empty initially");
  }
});
