import { test, expect as baseExpect } from "@playwright/test";
import { signInGoogle } from "./auth-helper";
const expect = baseExpect.configure({ timeout: 20000 });
test.setTimeout(60000);
test.beforeEach(() => {
  if (process.env.E2E_FIREBASE !== "true")
    throw Error("Use isolated Firebase emulators.");
});
async function ready(page: import("@playwright/test").Page) {
  await page.goto("/#landing");
  await expect(
    page.getByRole("heading", { name: "Know more. Go further.", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

test("student-first landing has genuine examples and no private reads or overflow", async ({
  page,
}, info) => {
  const reads: string[] = [],
    errors: string[] = [];
  page.on("request", (request) => {
    if (/:8080|procedureCommunity|\/api\/procedures/.test(request.url()))
      reads.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await ready(page);
  await expect(
    page.getByRole("button", { name: "Continue with Google", exact: true }),
  ).toBeEnabled();
  expect(
    await page.evaluate(() => document.fonts.check('16px "Instrument Serif"')),
  ).toBe(true);
  expect(reads).toEqual([]);
  for (const { width, height } of [
    { width: 320, height: 640 },
    { width: 393, height: 851 },
    { width: 600, height: 800 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1280, height: 720 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize({ width, height });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const chips = await page.locator(".index-company").evaluateAll((nodes) =>
      nodes.map((node) => {
        const box = node.getBoundingClientRect();
        return { left: box.left, right: box.right, height: box.height };
      }),
    );
    for (const chip of chips) {
      expect(chip.height).toBeGreaterThanOrEqual(44);
      expect(chip.left).toBeGreaterThanOrEqual(0);
      expect(chip.right).toBeLessThanOrEqual(width);
    }
    if (width >= 1000) {
      const cta = await page
        .getByRole("button", { name: "Continue with Google", exact: true })
        .boundingBox();
      expect(cta!.y + cta!.height).toBeLessThan(height - 28);
    }
  }
  expect(errors).toEqual([]);
  await page.setViewportSize(
    info.project.name === "mobile"
      ? { width: 393, height: 851 }
      : { width: 1440, height: 900 },
  );
});

test("company and batch routes preserve the Google sign-in destination", async ({
  page,
}) => {
  await ready(page);
  await page
    .getByRole("button", { name: "Explore Amazon India", exact: true })
    .click();
  await expect(
    page
      .getByRole("group", { name: "Select archive batch" })
      .getByRole("button", { name: "2025", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("link", {
      name: "Open Amazon India placement records",
      exact: true,
    }),
  ).toHaveAttribute("href", "#2025/company/amazon-india");
  await page
    .getByRole("button", { name: "Explore JPMorgan Chase & Co.", exact: true })
    .click();
  const link = page.getByRole("link", {
    name: "Open JPMorgan Chase & Co. placement records",
    exact: true,
  });
  await expect(link).toHaveAttribute(
    "href",
    "#2026/company/jp_morgan_chase_co",
  );
  await link.click();
  await expect(
    page.getByText(/take you back to the page you opened/),
  ).toBeVisible();
  await signInGoogle(page, false);
  await expect(page).toHaveURL(/#2026\/company\/jp_morgan_chase_co$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Morgan");
  await expect(page.locator(".opportunity-index")).toHaveCount(0);
});

test("keyboard, source controls and three product stories work without exposing contacts", async ({
  page,
}) => {
  await ready(page);
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  await page.getByRole("link", { name: "Explore", exact: true }).click();
  await expect(page.locator("#archive-overview")).toBeFocused();
  const batch = page
    .getByRole("group", { name: "Preview placement batch" })
    .getByRole("button", { name: "2025" });
  await batch.focus();
  await page.keyboard.press("Enter");
  await expect(batch).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("link", { name: "Explore placement statistics" }),
  ).toHaveAttribute("href", "#2025/overview");
  await page
    .getByRole("button", { name: "The interview", exact: false })
    .click();
  await expect(page.locator("#experience-detail")).toContainText(
    "Get past the job description.",
  );
  await expect(
    page.getByRole("link", { name: "Read firsthand experiences" }),
  ).toHaveAttribute("href", "#procedures");
  await page
    .getByRole("button", { name: "Find seniors at Barclays", exact: true })
    .click();
  await expect(page.locator(".lp-contact-caption")).toContainText("Barclays");
  await expect(
    page.getByRole("link", { name: "Find available profiles" }),
  ).toHaveAttribute("href", "#2026/company/barclays");
  await expect(page.locator('a[href*="linkedin.com"]')).toHaveCount(0);
  await page.getByText("Sources & privacy", { exact: false }).click();
  await expect(page.getByText(/no affiliation or endorsement/)).toBeVisible();
  await expect(page).toHaveURL(/#landing$/);
});

test("reduced motion and save-data retain the diagram without downloading Three.js", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const modules: string[] = [];
  page.on("request", (request) => {
    if (/ArchiveScene|three[._-]/i.test(request.url()))
      modules.push(request.url());
  });
  await ready(page);
  await page
    .getByRole("button", { name: "Explore Amazon India", exact: true })
    .click();
  await expect(page.locator(".index-poster")).toBeVisible();
  await expect(page.locator(".index-world canvas")).toHaveCount(0);
  await expect(page.locator(".ps-landing")).toHaveAttribute(
    "data-motion",
    "off",
  );
  expect(modules).toEqual([]);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: { saveData: true },
    }),
  );
  await page.reload();
  await expect(page.getByRole("heading", { name: /Know more/ })).toBeVisible();
  await expect(page.locator(".ps-landing")).toHaveAttribute(
    "data-motion",
    "off",
  );
  await page
    .getByRole("button", { name: "Explore Barclays", exact: true })
    .click();
  await expect(page.locator(".index-world canvas")).toHaveCount(0);
  expect(modules).toEqual([]);
});

test("WebGL or logo failure leaves a usable themed fallback", async ({
  page,
}) => {
  await page.route("**/company-logos/jpmorgan.svg", (route) => route.abort());
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    (window as any).graphicsAttempts = 0;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: any,
      ...args: any[]
    ) {
      if (type === "webgl2" || type === "webgl") {
        (window as any).graphicsAttempts++;
        return null;
      }
      return original.apply(this, [type, ...args] as any);
    } as any;
  });
  await ready(page);
  await expect
    .poll(() => page.evaluate(() => (window as any).graphicsAttempts))
    .toBeGreaterThan(0);
  await expect(
    page.getByRole("button", {
      name: "Explore JPMorgan Chase & Co.",
      exact: true,
    }),
  ).toContainText("JPMorgan");
  await expect(page.locator(".opportunity-index")).not.toHaveClass(
    /is-rendered/,
  );
  await expect(page.locator(".index-poster")).toHaveCSS("opacity", "1");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page
    .getByRole("button", { name: "Explore Amazon India", exact: true })
    .click();
  await expect(
    page.getByRole("link", {
      name: "Open Amazon India placement records",
      exact: true,
    }),
  ).toHaveAttribute("href", "#2025/company/amazon-india");
});

test("pause stops all page motion and context loss restores the static diagram", async ({
  page,
}) => {
  await ready(page);
  await expect(page.locator(".opportunity-index")).toHaveClass(/is-rendered/);
  await page
    .getByRole("button", { name: "Pause archive animation", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Play archive animation", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".ps-landing")).toHaveAttribute(
    "data-motion",
    "off",
  );
  await expect(page.locator(".field-packet").first()).toHaveCSS(
    "animation-name",
    "none",
  );
  await page
    .getByRole("button", { name: "Explore Barclays", exact: true })
    .click();
  await expect(
    page.getByRole("link", {
      name: "Open Barclays placement records",
      exact: true,
    }),
  ).toHaveAttribute("href", "#2026/company/barclays");
  await page
    .locator(".index-world canvas")
    .dispatchEvent("webglcontextlost", { cancelable: true });
  await expect(page.locator(".opportunity-index")).not.toHaveClass(
    /is-rendered/,
  );
  await expect(page.locator(".index-poster")).toHaveCSS("opacity", "1");
});

test("Google popup cancellation leaves the CTA ready to retry", async ({
  page,
}) => {
  await ready(page);
  const pending = page.waitForEvent("popup");
  await page
    .getByRole("button", { name: "Continue with Google", exact: true })
    .click();
  const popup = await pending;
  await popup.waitForURL(/9099\/emulator\/auth\/handler/);
  await popup.locator("button").first().waitFor({ state: "visible" });
  await popup.close();
  await expect(page.getByRole("alert")).toContainText(
    /cancel|closed|try again/i,
  );
  await expect(
    page.getByRole("button", { name: "Continue with Google", exact: true }),
  ).toBeEnabled();
});

test("delayed headline fonts retain the mobile line count", async ({
  page,
}) => {
  await page.setViewportSize({ width: 393, height: 851 });
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/fonts/instrument-serif/*.woff2", async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await page.goto("/#landing", { waitUntil: "domcontentloaded" });
    const heading = page.getByRole("heading", {
      name: "Know more. Go further.",
      exact: true,
    });
    await expect(heading).toBeVisible();
    const before = await heading.boundingBox();
    release();
    await page.evaluate(() => document.fonts.ready);
    const after = await heading.boundingBox();
    expect(Math.abs(before!.height - after!.height)).toBeLessThan(1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    release();
  }
});

test("persisted dark theme carries across landing, login and protected authentication", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("theme-initialized")) {
      localStorage.setItem("placement-theme", "dark");
      sessionStorage.setItem("theme-initialized", "true");
    }
  });
  await ready(page);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const paper = await page
    .locator(".ps-landing")
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(paper).toBe("rgb(16, 20, 17)");
  await page.getByRole("link", { name: /^Sign in/ }).click();
  await expect(
    page.getByRole("heading", { name: "Your next chapter. A clearer start." }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page.getByRole("button", { name: "Continue with Google", exact: true }),
  ).toBeEnabled();
  await page.screenshot({
    path: `artifacts/v2-login-dark-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(
    await page.evaluate(() => localStorage.getItem("placement-theme")),
  ).toBe("light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.goto("/#2026/companies");
  await expect(page.getByText(/take you back/)).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("hero and login fit short laptop viewports at default scale in both themes", async ({
  page,
}) => {
  await ready(page);
  for (const theme of ["light", "dark"]) {
    await page.evaluate((value) => {
      localStorage.setItem("placement-theme", value);
      window.dispatchEvent(
        new StorageEvent("storage", { key: "placement-theme" }),
      );
    }, theme);
    for (const size of [
      { width: 1280, height: 720 },
      { width: 1366, height: 768 },
      { width: 1536, height: 864 },
      { width: 1920, height: 1080 },
    ]) {
      await page.setViewportSize(size);
      await page.evaluate(() => scrollTo(0, 0));
      const rect = await page
        .getByRole("button", { name: "Continue with Google", exact: true })
        .boundingBox();
      expect(rect!.y).toBeGreaterThan(0);
      expect(rect!.y + rect!.height + 26).toBeLessThan(size.height);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
  await page.goto("/#login");
  for (const size of [
    { width: 320, height: 640 },
    { width: 393, height: 851 },
    { width: 768, height: 1024 },
    { width: 1366, height: 768 },
  ]) {
    await page.setViewportSize(size);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("button", { name: "Continue with Google", exact: true }),
    ).toBeVisible();
  }
});
