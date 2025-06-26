import puppeteer from "puppeteer";
import fs from "fs";
import { MINECRAFT_NET_URL, VALID_BDS_TYPES, CACHE_DURATION_MS } from "./config";

// Cache structure
interface CacheEntry {
  version: string;
  timestamp: number;
  refreshing?: boolean;
}

interface CacheStore {
  [key: string]: CacheEntry;
}

// Global cache store
const versionCache: CacheStore = {};

// Helper function to generate cache key
function getCacheKey(bdsType: "win" | "linux", bdsPreview: boolean): string {
  return `${bdsType}-${bdsPreview ? 'preview' : 'stable'}`;
}

// Check if cache entry is still valid
function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < CACHE_DURATION_MS;
}

// Get cached version if available and valid
export function getCachedVersion(bdsType: "win" | "linux", bdsPreview: boolean): string | null {
  const key = getCacheKey(bdsType, bdsPreview);
  const entry = versionCache[key];
  
  if (!entry) {
    return null;
  }
  
  // Always return cached version if it exists (even if expired)
  // This ensures we serve from cache while background refresh happens
  return entry.version;
}

// Set version in cache
function setCachedVersion(bdsType: "win" | "linux", bdsPreview: boolean, version: string): void {
  const key = getCacheKey(bdsType, bdsPreview);
  versionCache[key] = {
    version,
    timestamp: Date.now(),
    refreshing: false
  };
  console.log(`✅ Cached version ${version} for ${key}`);
}

// Background refresh logic
async function refreshCacheEntry(bdsType: "win" | "linux", bdsPreview: boolean): Promise<void> {
  const key = getCacheKey(bdsType, bdsPreview);
  const entry = versionCache[key];
  
  // Prevent multiple concurrent refreshes
  if (entry?.refreshing) {
    console.log(`🔄 Cache refresh already in progress for ${key}`);
    return;
  }
  
  // Mark as refreshing
  if (entry) {
    entry.refreshing = true;
  }
  
  try {
    console.log(`🔄 Background refreshing cache for ${key}...`);
    const newVersion = await lookupLatestVersionInternal(bdsType, bdsPreview);
    setCachedVersion(bdsType, bdsPreview, newVersion);
    console.log(`✅ Background refresh completed for ${key}: ${newVersion}`);
  } catch (error) {
    console.error(`❌ Background refresh failed for ${key}:`, error);
    // Don't update cache on error, keep serving the old cached version
    if (entry) {
      entry.refreshing = false;
    }
  }
}

// Check if cache needs refresh and trigger background refresh if needed
export function checkAndRefreshCache(bdsType: "win" | "linux", bdsPreview: boolean): void {
  const key = getCacheKey(bdsType, bdsPreview);
  const entry = versionCache[key];
  
  if (!entry || !isCacheValid(entry)) {
    console.log(`🕒 Cache expired or missing for ${key}, triggering background refresh`);
    // Don't await - this runs in background
    refreshCacheEntry(bdsType, bdsPreview).catch(err => {
      console.error(`Background refresh error for ${key}:`, err);
    });
  }
}

// Initialize cache on startup
export async function initializeCache(): Promise<void> {
  console.log("🚀 Initializing version cache on startup...");
  
  const combinations = [
    { type: "win" as const, preview: false },
    { type: "win" as const, preview: true },
    { type: "linux" as const, preview: false },
    { type: "linux" as const, preview: true }
  ];
  
  // Initialize all combinations in parallel
  const initPromises = combinations.map(async ({ type, preview }) => {
    try {
      console.log(`📥 Fetching initial version for ${type} ${preview ? 'preview' : 'stable'}...`);
      const version = await lookupLatestVersionInternal(type, preview);
      setCachedVersion(type, preview, version);
    } catch (error) {
      console.error(`❌ Failed to initialize cache for ${type} ${preview ? 'preview' : 'stable'}:`, error);
    }
  });
  
  await Promise.all(initPromises);
  console.log("✅ Cache initialization completed");
}

// Main lookup function that uses cache
export async function lookupLatestVersion(
  bdsType: "win" | "linux",
  bdsPreview: boolean
): Promise<string> {
  // Check if we have a cached version
  const cachedVersion = getCachedVersion(bdsType, bdsPreview);
  
  if (cachedVersion) {
    // Trigger background refresh if needed (non-blocking)
    checkAndRefreshCache(bdsType, bdsPreview);
    console.log(`📦 Serving cached version for ${bdsType} ${bdsPreview ? 'preview' : 'stable'}: ${cachedVersion}`);
    return cachedVersion;
  }
  
  // No cached version available, fetch directly
  console.log(`🔍 No cached version available, fetching directly for ${bdsType} ${bdsPreview ? 'preview' : 'stable'}...`);
  const version = await lookupLatestVersionInternal(bdsType, bdsPreview);
  setCachedVersion(bdsType, bdsPreview, version);
  return version;
}

/**
 * Internal function that does the actual scraping (renamed from original lookupLatestVersion)
 * Scrapes Minecraft.net's Bedrock page by actually running its JS.
 * Returns the version string like "1.21.84.1".
 */
async function lookupLatestVersionInternal(
  bdsType: "win" | "linux",
  bdsPreview: boolean
): Promise<string> {
  console.log(`Starting version lookup for ${bdsType} ${bdsPreview ? 'preview' : 'stable'}`);
  
  console.log("Launching Puppeteer browser...");
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    headless: true,
  });
  const page = await browser.newPage();
  await page.setUserAgent("smell-of-curry/bds-manager");
  await page.setExtraHTTPHeaders({ "accept-language": "*" });
  console.log("Browser launched and page configured");

  // 1) Load the page
  console.log(`Navigating to ${MINECRAFT_NET_URL}...`);
  await page.goto(MINECRAFT_NET_URL, { waitUntil: "networkidle2" });
  console.log("Page loaded successfully");

  // 2) Compute which card (1 = Windows, 2 = Linux) and which input (0=Stable, 1=Preview)
  const card = bdsType === "win" ? 1 : 2;
  const input = bdsPreview ? 1 : 0;
  console.log(`Using card ${card} (${bdsType}) and input ${input} (${bdsPreview ? 'preview' : 'stable'})`);

  // 3) Click the correct radio
  const radio = `#MC_RadioGroupA_Server_${card}_input_${input}`;
  console.log(`Clicking radio button: ${radio}`);
  await page.click(radio);
  console.log("Radio button clicked");

  // 4) Agree to EULA if it's present
  const eula = `#MC_CheckboxA_Server_${card} input[type=checkbox]`;
  console.log(`Checking for EULA checkbox: ${eula}`);
  if (await page.$(eula)) {
    console.log("EULA checkbox found, clicking it");
    await page.click(eula);
  } else {
    console.error("No EULA checkbox found");
  }

  // 5) Wait for the download button to become enabled, then grab href
  const button = `#MC_Download_Server_${card}`;
  console.log(`Waiting for download button to become enabled: ${button}`);
  try {
    await page.waitForFunction(
      (b) => document.querySelector(b)?.getAttribute("href") !== "#",
      { timeout: 10000 },
      button
    );
    console.log("Download button is now enabled");
  } catch (e) {
    console.error(
      "Error: Timed out waiting for the download link to become available."
    );
    fs.writeFileSync("dist/page.html", await page.content());
    console.error("Saved page contents to dist/page.html for debugging.");
    await browser.close();
    throw e;
  }

  console.log("Extracting download link...");
  const href = await page.$eval(button, (a) => (a as HTMLAnchorElement).href);
  console.log(`Download link found: ${href}`);
  
  console.log("Closing browser...");
  await browser.close();

  if (!href) {
    const errorMsg = `No download link found for ${bdsType} ${
      bdsPreview ? "preview" : "stable"
    }`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // 6) Extract version from the URL
  console.log("Extracting version from URL...");
  const m = href.match(/bedrock-server-(\d+\.\d+\.\d+\.\d+)\.zip$/);
  if (!m?.[1]) {
    const errorMsg = `Failed to parse version from URL: ${href}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
  
  console.log(`Successfully extracted version: ${m[1]}`);
  return m[1];
}

// Helper function to validate type parameter
export function isValidBdsType(
  type: string
): type is (typeof VALID_BDS_TYPES)[number] {
  return VALID_BDS_TYPES.includes(type as (typeof VALID_BDS_TYPES)[number]);
}

// Helper function to validate preview parameter
export function parsePreviewParam(preview: string): boolean | null {
  const lower = preview.toLowerCase();
  if (lower === "true" || lower === "1") return true;
  if (lower === "false" || lower === "0") return false;
  return null;
}