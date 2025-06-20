import puppeteer from "puppeteer";
import fs from "fs";
import { MINECRAFT_NET_URL, VALID_BDS_TYPES } from "./config";

/**
 * Scrapes Minecraft.net's Bedrock page by actually running its JS.
 * Returns the version string like "1.21.84.1".
 */
export async function lookupLatestVersion(
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