const { Redis } = require("@upstash/redis");
const { chromium } = require("playwright");

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const redis = new Redis({ 
    url: process.env.REDIS_URL, 
    token: process.env.REDIS_TOKEN 
});

(async () => {
  console.log("Starting GitHub Action Refresh...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto("https://oozrev.fit/");

    await page.getByRole("textbox", { name: "Username", exact: true })
      .fill(process.env.USER_NAME);

    await page.getByRole("textbox", { name: "Password", exact: true })
      .fill(process.env.USER_PASS);

    await page.getByRole("button", { name: "Log In" }).click();

    await wait(5000);

    await page.goto("https://oozrev.fit/catalog");
    await wait(20000);

    const cookies = await context.cookies("https://oozrev.fit/catalog");

    const roblosecurity = cookies.find(c => c.name === ".ROBLOSECURITY")?.value;
    const rbxcsrf4 = cookies.find(c => c.name === "rbxcsrf4")?.value;

    const DatatoStore = {};
    if (roblosecurity) DatatoStore["ROBLO"] = roblosecurity;
    // if (rbxcsrf4) DatatoStore["RBXCSRF4"] = rbxcsrf4;

    if (Object.keys(DatatoStore).length > 0) {
      await redis.mset(DatatoStore);
      console.log("Updated Redis with keys", Object.keys(DatatoStore));
    } else {
      console.log("No cookies.");
    }

  } catch (e) {
    console.error("Error:", e);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
