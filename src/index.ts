import express from "express";
import { isValidBdsType, lookupLatestVersion, parsePreviewParam } from "./utils";
import { VALID_BDS_TYPES } from "./config";

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

    const version = await lookupLatestVersion(type, parsedPreview);
    res.json({ 
      version,
      type,
      preview: parsedPreview
    });
  } catch (err: any) {
    console.error("Error looking up version:", err);
    res.status(500).json({ 
      error: "Internal server error",
      message: err.message || "Failed to lookup version"
    });
  }
});

// Add a health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Add a help endpoint with API documentation
app.get("/", (req, res) => {
  res.json({
    message: "Bedrock Dedicated Server Version Lookup API",
    endpoints: {
      "GET /version/:type/:preview": {
        description: "Get the latest BDS version",
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
        ]
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
    availableEndpoints: ["/", "/version/:type/:preview", "/health"]
  });
});

app.listen(port, () =>
  console.log(`🟢 API listening at http://localhost:${port}`)
);
