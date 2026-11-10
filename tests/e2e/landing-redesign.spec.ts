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

test("scroll chapters advance and reverse both stories while retaining manual control", async ({ page }, info) => {
  if (info.project.name === "desktop") await page.setViewportSize({ width: 1440, height: 1000 });
  await ready(page);
  await expect(page.locator('.lp-header .lp-index-link')).toHaveCount(0);
  await expect(page.locator('.lp-experiences')).toHaveAttribute('data-scroll-story', /pinned|inline/);
  await expect(page.locator('.lp-people')).toHaveAttribute('data-scroll-story', /pinned|manual/);
  const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.getByRole('button', { name: 'Pause archive animation', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(pageHeight);
  await page.getByRole('button', { name: 'Play archive animation', exact: true }).click();
  for (const [section, group] of [
    ['.lp-experiences', 'Explore hiring experiences'],
    ['.lp-people', 'Example questions for a senior'],
  ]) {
    const story = page.locator(section);
    await expect(story).toHaveAttribute('data-scroll-story', /pinned|inline|manual/);
    if (await story.getAttribute('data-scroll-story') === 'manual') {
      const controls = page.getByRole('group', { name: group }).getByRole('button');
      for (const index of [0, 1, 2]) {
        await controls.nth(index).click();
        await page.mouse.wheel(0, 40);
        await expect(controls.nth(index)).toHaveAttribute('aria-pressed', 'true');
      }
      continue;
    }
    const seek = async (progress: number) => {
      await story.evaluate((element, p) => {
        const style = getComputedStyle(element), box = element.getBoundingClientRect();
        let y;
        if ((element as HTMLElement).dataset.scrollStory === 'pinned') {
          y = scrollY + box.top + parseFloat(style.paddingTop) - parseFloat(style.getPropertyValue('--story-top')) + p * parseFloat(style.getPropertyValue('--story-runway'));
        } else {
          const focus = element.querySelector('[data-story-focus]')!.getBoundingClientRect();
          y = scrollY + focus.top - innerHeight * .75 + p * (focus.height + innerHeight * .25);
        }
        scrollTo({ top: y, behavior: 'instant' });
      }, progress);
    };
    const controls = page.getByRole('group', { name: group }).getByRole('button');
    for (const progress of [.1, .5, .9, .5, .1]) {
      await seek(progress);
      await expect(controls.nth(Math.floor(progress * 3))).toHaveAttribute('aria-pressed', 'true');
      if (await story.getAttribute('data-scroll-story') === 'pinned') {
        const pin = await story.locator('.lp-story-pin').boundingBox();
        expect(pin!.y).toBeGreaterThanOrEqual(100);
        expect(pin!.y + pin!.height).toBeLessThanOrEqual(page.viewportSize()!.height - 20);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await controls.nth(2).click();
    await expect(controls.nth(2)).toHaveAttribute('aria-pressed', 'true');
    await page.waitForTimeout(150);
    await expect(controls.nth(2)).toHaveAttribute('aria-pressed', 'true');
    await seek(.5);
    await expect(controls.nth(1)).toHaveAttribute('aria-pressed', 'true');
    await story.locator('.lp-story-pin').screenshot({ animations: 'disabled', path: `artifacts/scroll-story-${section.slice(1)}-${info.project.name}.png` });
  }
});

test("alumni card stays flat and fully visible throughout laptop scroll stages", async ({ page }, info) => {
  await ready(page);
  const sizes = info.project.name === 'desktop'
    ? [{ width: 1280, height: 720 }, { width: 1366, height: 768 }, { width: 1536, height: 730 }, { width: 1920, height: 916 }]
    : [{ width: 393, height: 851 }, { width: 320, height: 640 }];
  for (const size of sizes) {
    await page.setViewportSize(size);
    const story = page.locator('.lp-people');
    if (size.width < 1101) {
      await expect(story).toHaveAttribute('data-scroll-story', 'manual');
      const role = page.getByRole('button', { name: 'How did you get to this team?' });
      await role.click();
      await page.evaluate(() => scrollBy({ top: 100, behavior: 'instant' }));
      await expect(role).toHaveAttribute('aria-pressed', 'true');
      continue;
    }
    await expect(story).toHaveAttribute('data-scroll-story', 'pinned');
    let firstTop: number | undefined;
    for (const [index, progress] of [.1, .5, .9].entries()) {
      await story.evaluate((element, p) => {
        const style = getComputedStyle(element);
        scrollTo({ top: scrollY + element.getBoundingClientRect().top + parseFloat(style.paddingTop) - parseFloat(style.getPropertyValue('--story-top')) + p * parseFloat(style.getPropertyValue('--story-runway')), behavior: 'instant' });
      }, progress);
      await expect(page.getByRole('group', { name: 'Example questions for a senior' }).getByRole('button').nth(index)).toHaveAttribute('aria-pressed', 'true');
      const card = await page.locator('.lp-handoff').boundingBox();
      const link = await page.locator('.lp-handoff-ticket .lp-text-link').boundingBox();
      firstTop ??= card!.y;
      expect(Math.abs(card!.y - firstTop)).toBeLessThanOrEqual(1);
      expect(card!.y).toBeGreaterThanOrEqual(100);
      expect(card!.y + card!.height).toBeLessThanOrEqual(size.height - 20);
      expect(link!.y + link!.height).toBeLessThanOrEqual(size.height - 20);
      await expect(page.locator('.lp-handoff-ticket')).toHaveCSS('transform', 'none');
      await expect(page.locator('.lp-handoff-question [aria-live] p')).toHaveCSS('filter', 'none');
    }
  }
});

test("reduced motion keeps scroll stories in normal flow with manual steps", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ready(page);
  for (const selector of ['.lp-experiences', '.lp-people']) {
    await expect(page.locator(selector)).toHaveAttribute('data-scroll-story', 'off');
    await expect(page.locator(`${selector} .lp-story-pin`)).toHaveCSS('position', 'relative');
  }
  await page.getByRole('button', { name: 'What helped' }).click();
  await expect(page.locator('#experience-detail')).toContainText('Prepare with a little perspective.');
  await page.getByRole('button', { name: 'Could I ask you about your work?' }).click();
  await expect(page.locator('.lp-handoff-question [aria-live]')).toContainText('Could I ask you about your work?');
});

test("landing sign-in controls open Google directly without a login page", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page);
  for (const selector of [".lp-signin", ".google-button", ".lp-finale .lp-action-link"]) {
    const action = page.locator(selector);
    const popupEvent = page.waitForEvent("popup");
    await action.click();
    const popup = await popupEvent;
    await popup.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(/#landing$/);
    await expect(page.locator(".lp-login")).toHaveCount(0);
    await popup.close();
    await expect(page.getByRole("alert")).toContainText("Sign-in was cancelled");
    await expect(action).toBeEnabled();
  }
});

test("protected destinations survive direct Google sign-in from the landing page", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#2026/companies");
  await expect(page.getByRole("heading", { name: "Know more. Go further." })).toBeVisible();
  await expect(page.locator(".lp-login")).toHaveCount(0);
  await expect(page).toHaveURL(/#2026\/companies$/);
  await signInGoogle(page, false);
  await expect(page).toHaveURL(/#2026\/companies$/);
  await expect(page.locator(".ps-landing")).toHaveCount(0);
});

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
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
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

test("year-independent company controls preserve the Google sign-in destination", async ({
  page,
}) => {
  await ready(page);
  await page
    .getByRole("button", { name: "Explore Amazon India", exact: true })
    .click();
  await expect(
    page
      .locator(".opportunity-index")
      .getByRole("group", { name: "Select archive batch" }),
  ).toHaveCount(0);
  await expect(page.locator(".opportunity-index")).not.toContainText(
    /2025|2026/,
  );
  await expect(
    page.getByRole("button", { name: "Explore Amazon India", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".opportunity-index figcaption")).toHaveCount(0);
  await expect(page.locator(".opportunity-index a")).toHaveCount(0);
  await expect(page.locator(".lp-hero .lp-description")).toHaveCount(0);
  await expect(page.locator(".index-motion-icon")).toHaveText("");
  const link = page
    .locator(".lp-record-sheet")
    .getByRole("link", { name: /JPMorgan: Software Engineer/ });
  await expect(link).toHaveAttribute(
    "href",
    "#2026/company/jp_morgan_chase_co",
  );
  await link.click();
  await expect(
    page.getByText(/Sign in to continue to the page you opened/),
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
  await page.locator(".lp-hero-scroll").click();
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
    page.getByRole("link", { name: "Read the experience archive" }),
  ).toHaveAttribute("href", "#procedures");
  await page
    .getByRole("button", { name: "Find seniors at Barclays", exact: true })
    .click();
  await expect(page.locator(".lp-contact-caption")).toContainText("Barclays");
  await expect(
    page.getByRole("link", { name: "Find seniors at Barclays" }),
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
  // Start a separate visit so enabling motion cannot load the scene on the old page.
  await page.goto("about:blank");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: { saveData: true },
    }),
  );
  await page.goto("/#landing");
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
    page.getByRole("button", { name: "Explore Amazon India", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
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
    page.getByRole("button", { name: "Explore Barclays", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
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
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
  } finally {
    release();
  }
});

test("legacy login returns to landing and protected destinations keep the active theme", async ({
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
  await page.goto("/#login");
  await expect(page).toHaveURL(/#landing$/);
  await expect(
    page.getByRole("heading", { name: "Know more. Go further." }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page.getByRole("button", { name: "Continue with Google", exact: true }),
  ).toBeEnabled();
  await page.screenshot({
    path: `artifacts/direct-signin-dark-${info.project.name}.png`,
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
  await expect(page.getByText(/Sign in to continue to the page you opened/)).toBeVisible();
  await expect(page).toHaveURL(/#2026\/companies$/);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("landing and legacy login links fit short laptop viewports in both themes", async ({
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
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
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
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("button", { name: "Continue with Google", exact: true }),
    ).toBeVisible();
  }
});

test("pointer parallax never extends the document beyond its usable width", async ({
  page,
}) => {
  await ready(page);
  for (const theme of ["light", "dark"]) {
    await page.evaluate((value) => {
      localStorage.setItem("placement-theme", value);
      dispatchEvent(new StorageEvent("storage", { key: "placement-theme" }));
    }, theme);
    for (const size of [
      { width: 320, height: 640 },
      { width: 393, height: 851 },
      { width: 768, height: 1024 },
      { width: 1366, height: 768 },
      { width: 1920, height: 950 },
    ]) {
      await page.setViewportSize(size);
      for (const x of [2, size.width - 2]) {
        await page.mouse.move(x, Math.min(300, size.height - 10));
        await expect
          .poll(() =>
            page.evaluate(
              () =>
                document.documentElement.scrollWidth -
                document.documentElement.clientWidth,
            ),
          )
          .toBeLessThanOrEqual(0);
      }
      await page.locator(".lp-handoff").scrollIntoViewIfNeeded();
      await page.mouse.move(size.width - 2, size.height / 2);
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth,
          ),
        )
        .toBeLessThanOrEqual(0);
      await page.evaluate(() => scrollTo(0, 0));
    }
  }
});

test("record previews change companies, roles and reported CTC by batch", async ({
  page,
}) => {
  await ready(page);
  const preview = page.locator(".lp-record-sheet");
  await expect(preview.locator(".lp-record-role")).toHaveCount(3);
  await expect(preview).toContainText("Graduate Technology Trainee");
  await expect(preview).toContainText("54.88 LPA");
  const before = await preview.locator(".lp-record-company").allTextContents();
  await page
    .getByRole("group", { name: "Preview placement batch" })
    .getByRole("button", { name: "2025" })
    .click();
  const after = await preview.locator(".lp-record-company").allTextContents();
  expect(after).not.toEqual(before);
  await expect(preview).toContainText("Goldman Sachs");
  await expect(preview).toContainText("CrackedDevs");
  await expect(preview).toContainText("Software Engineer");
  await expect(preview).toContainText("51.72 LPA");
  await expect(preview).toContainText("30 LPA");
  await expect(preview).toContainText("24.16 LPA");
  await expect(preview.locator(".lp-inferred-mark")).toHaveCount(2);
  await expect(
    preview.getByRole("link", { name: /Google: Software Engineer, 51.72/ }),
  ).toHaveAttribute("href", "#2025/company/google");
  await expect(preview.locator(".lp-record-line")).toHaveCount(0);
});

test("senior directory is distinct from written experiences and its connection trace moves smoothly", async ({
  page,
}) => {
  await ready(page);
  await expect(page.locator('#experience-title')).toHaveText('The process.In their words.');
  await expect(page.locator('.lp-experience-heading')).toContainText('Written assessment and interview experiences');
  await expect(page.locator('#people-title')).toHaveText('Find a senior.Start a conversation.');
  await expect(page.locator('.lp-people .lp-section-copy')).toContainText('LinkedIn');
  await page
    .getByRole("button", { name: "Find seniors at Google", exact: true })
    .click();
  await expect(page.locator(".lp-contact-caption")).toContainText("Google");
  await expect(
    page.getByRole("link", { name: "Find seniors at Google" }),
  ).toHaveAttribute("href", "#2026/company/google");
  const question = page.getByRole("button", {
    name: "How did you get to this team?",
    exact: true,
  });
  await question.click();
  await expect(question).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".lp-handoff-question [aria-live]")).toContainText(
    "How did you get to this team?",
  );
  await expect(page.locator(".lp-handoff-route g.is-active")).toHaveCount(1);
  const trace = page.locator('.lp-handoff-route g.is-active .handoff-signal');
  await expect(trace).toHaveCSS('animation-duration', '3.2s');
  const offset = () => trace.evaluate(el => getComputedStyle(el).strokeDashoffset);
  const before = await offset();
  await expect.poll(offset).not.toBe(before);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(trace).toHaveCSS('animation-name', 'none');
  await expect(page.locator('a[href*="linkedin.com"]')).toHaveCount(0);
});

test("landing removes redundant helper copy and labels inferred preview roles honestly", async ({
  page,
}) => {
  await ready(page);
  for (const text of [
    "Free for students. Sign in with Google.",
    "Highest reported CTCs · off-campus records",
    "Roles & packages vary by hire.",
    "Explore available profiles after sign-in. Reach out on LinkedIn.",
    "Sign-in required. Profile availability varies.",
    "Your email and drafts stay private.",
  ])
    await expect(page.getByText(text, { exact: true })).toHaveCount(0);
  await page
    .getByRole("group", { name: "Preview placement batch" })
    .getByRole("button", { name: "2025" })
    .click();
  await expect(page.locator(".lp-inferred-mark")).toHaveCount(2);
  await page.goto("/#login");
  await expect(
    page.getByText("Your email and drafts stay private.", { exact: true }),
  ).toHaveCount(0);
});

test("closing Voronoi loads near the footer, responds to theme and pointer, and pauses", async ({
  page,
}, info) => {
  test.setTimeout(60000); // High-DPI shader readback can be slow on software GPUs.
  const requests: string[] = [],
    errors: string[] = [];
  page.on("request", (request) => {
    if (/VoronoiScene/.test(request.url())) requests.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await ready(page);
  await expect(page.locator(".lp-finale-canvas canvas")).toHaveCount(0);
  expect(requests).toEqual([]);
  await page.locator(".lp-finale").scrollIntoViewIfNeeded();
  await expect(page.locator(".lp-finale-pattern")).toHaveClass(/is-ready/);
  await expect(page.locator(".lp-finale-canvas canvas")).toHaveCount(1);
  const frame = () =>
    page
      .locator(".lp-finale-canvas")
      .evaluate((element: any) => element.paperShaderMount.getCurrentFrame());
  const before = await frame();
  await expect.poll(frame).toBeGreaterThan(before);
  const canvas = page.locator(".lp-finale-canvas canvas");
  // Inspect rendered pixels, not just the clock: a ticking uniform alone does
  // not prove that a background is visibly animated or responds to the cursor.
  const pixels = (fixedTime = false) => page.locator(".lp-finale-canvas")
    .evaluate((element: any, fixed) => {
      const shader = element.paperShaderMount, gl = shader.gl;
      shader.setFrame(fixed ? 68000 : shader.getCurrentFrame());
      const sample = new Uint8Array(128 * 128 * 4);
      gl.readPixels(Math.floor(gl.canvas.width * .75),
        Math.floor(gl.canvas.height * .45), 128, 128,
        gl.RGBA, gl.UNSIGNED_BYTE, sample);
      let hash = 2166136261;
      for (const value of sample) hash = Math.imul(hash ^ value, 16777619);
      return hash;
    }, fixedTime);
  const initialPixels = await pixels();
  await expect.poll(pixels).not.toBe(initialPixels);
  const box = await canvas.boundingBox();
  const restingPixels = await pixels(true);
  await page.mouse.move(box!.x + box!.width * 0.8, box!.y + box!.height * 0.5);
  await expect.poll(() => pixels(true)).not.toBe(restingPixels);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Pause background animation", exact: true })
    .click();
  const frozen = await frame();
  const frozenPixels = await pixels();
  await page.mouse.move(box!.x + box!.width * 0.15, box!.y + box!.height * 0.5);
  await page.waitForTimeout(150);
  expect(await frame()).toBe(frozen);
  expect(await pixels()).toBe(frozenPixels);
  await expect(page.locator(".ps-landing")).toHaveAttribute(
    "data-motion",
    "off",
  );
  await expect(
    page.getByRole("button", { name: "Find your perspective", exact: true }),
  ).toBeEnabled();
  const light = await canvas.screenshot();
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await page.locator(".lp-finale").scrollIntoViewIfNeeded();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const dark = await canvas.screenshot();
  expect(dark.equals(light)).toBe(false);
  await page.locator(".lp-finale").screenshot({
    path: `artifacts/voronoi-verified-${info.project.name}.png`,
  });
  await page
    .getByRole("button", { name: "Play background animation", exact: true })
    .click();
  await expect.poll(frame).toBeGreaterThan(frozen);
  await canvas.dispatchEvent("webglcontextlost", { cancelable: true });
  await expect(page.locator('.lp-finale-canvas canvas[data-renderer="canvas2d"]')).toHaveCount(1);
  await expect(page.locator(".lp-finale-pattern")).toHaveClass(/is-ready/);
  expect(errors).toEqual([]);
});

test("closing shader respects reduced motion and save-data without downloading GPU code", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const requests: string[] = [];
  page.on("request", (request) => {
    if (/VoronoiScene|paper-design/.test(request.url()))
      requests.push(request.url());
  });
  await ready(page);
  await page.locator(".lp-finale").scrollIntoViewIfNeeded();
  await expect(page.locator(".lp-finale-poster")).toBeVisible();
  await expect(page.locator(".lp-finale-canvas canvas")).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: "Pause background animation",
      exact: true,
    }),
  ).toHaveCount(0);
  expect(requests).toEqual([]);
  await page.goto("about:blank");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: { saveData: true },
    }),
  );
  await ready(page);
  await page.locator(".lp-finale").scrollIntoViewIfNeeded();
  await expect(page.locator(".lp-finale-canvas canvas")).toHaveCount(0);
  expect(requests).toEqual([]);
});

test("closing shader failure uses moving interactive cells without WebGL", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    (window as any).graphicsAttempts = 0;
    (window as any).closingGraphicsAttempts = 0;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: any,
      ...args: any[]
    ) {
      if (type === "webgl2" || type === "webgl") {
        (window as any).graphicsAttempts++;
        if (this.parentElement?.classList.contains("lp-finale-canvas"))
          (window as any).closingGraphicsAttempts++;
        return null;
      }
      return original.apply(this, [type, ...args] as any);
    } as any;
  });
  await ready(page);
  await page.locator(".lp-finale").scrollIntoViewIfNeeded();
  await expect
    .poll(() => page.evaluate(() => (window as any).closingGraphicsAttempts))
    .toBeGreaterThan(0);
  await expect(page.locator(".lp-finale-pattern")).toHaveClass(/is-ready/);
  const canvas = page.locator('.lp-finale-canvas canvas[data-renderer="canvas2d"]');
  await expect(canvas).toHaveCount(1);
  const pixels = () => canvas.evaluate((element: HTMLCanvasElement) => element.toDataURL());
  const initial = await pixels();
  await expect.poll(pixels).not.toBe(initial);
  const box = await canvas.boundingBox();
  await page.mouse.move(box!.x + box!.width * .8, box!.y + box!.height * .5);
  await page.getByRole("button", { name: "Pause background animation", exact: true }).click();
  const frozen = await pixels();
  await page.waitForTimeout(150);
  expect(await pixels()).toBe(frozen);
  await page.getByRole("button", { name: "Play background animation", exact: true }).click();
  await expect.poll(pixels).not.toBe(frozen);
  await expect(
    page.getByRole("button", { name: "Find your perspective", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
});

test("floating navigation ignores scroll jitter and reveals after deliberate upward travel", async ({
  page,
}) => {
  await ready(page);
  const header = page.locator(".lp-header");
  await expect(header).toHaveCSS("position", "sticky");
  expect(
    parseFloat(
      await header.evaluate(
        (element) => getComputedStyle(element).borderRadius,
      ),
    ),
  ).toBeGreaterThanOrEqual(16);
  await page.evaluate(() => scrollTo(0, 600));
  await expect(header).toHaveAttribute("data-collapsed", "true");
  await expect
    .poll(async () => {
      const box = await header.boundingBox();
      return box!.y + box!.height;
    })
    .toBeLessThanOrEqual(0);
  await page.evaluate(() => scrollBy(0, -1));
  await page.waitForTimeout(100);
  await expect(header).toHaveAttribute("data-collapsed", "true");
  for (const delta of [-8, 6, -5, 7]) {
    await page.evaluate((value) => scrollBy({ top: value, behavior: "instant" }), delta);
    await page.waitForTimeout(40);
    await expect(header).toHaveAttribute("data-collapsed", "true");
  }
  const viewport = page.viewportSize()!;
  await page.setViewportSize({ ...viewport, height: viewport.height - 30 });
  await expect(header).toHaveAttribute("data-collapsed", "true");
  await page.evaluate(() => scrollBy(0, -80));
  await expect(header).toHaveAttribute("data-collapsed", "false");
  await expect(header).toHaveCSS("opacity", "1");
  const shown = await header.boundingBox();
  expect(shown!.y).toBeGreaterThanOrEqual(10);
  await page.evaluate(() => scrollBy({ top: 10, behavior: "instant" }));
  await page.waitForTimeout(100);
  await expect(header).toHaveAttribute("data-collapsed", "false");
  await page.evaluate(() => scrollBy(0, 100));
  await expect(header).toHaveAttribute("data-collapsed", "true");
  await page.keyboard.press("Tab");
  await expect(header).toHaveAttribute("data-collapsed", "false");
  await page.locator(".lp-hero-scroll").click();
  await expect(page.locator("#archive-overview")).toBeFocused();
  await expect
    .poll(async () => {
      const title = await page
        .getByRole("heading", {
          name: "The full picture. Not just the headline.",
        })
        .boundingBox();
      const nav = await header.boundingBox();
      return title!.y - nav!.y - nav!.height;
    })
    .toBeGreaterThanOrEqual(8);
  for (const size of [
    { width: 320, height: 640 },
    { width: 393, height: 851 },
    { width: 768, height: 1024 },
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(size);
    await page.evaluate(() => new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    ));
    await page.evaluate(() => {
      (document.activeElement as HTMLElement)?.blur();
      scrollTo({ top: 0, behavior: "instant" });
    });
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    // Resizing a sticky layout can apply a delayed browser scroll-anchor correction.
    await expect.poll(() => page.evaluate(async () => {
      scrollTo({ top: 0, behavior: "instant" });
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      return scrollY;
    })).toBe(0);
    expect(
      await page
        .locator(".ps-landing")
        .evaluate((element) => element.getBoundingClientRect().top),
    ).toBe(0);
    const nav = await header.boundingBox();
    expect(nav!.x).toBeGreaterThan(0);
    expect(nav!.x + nav!.width).toBeLessThan(size.width);
    await expect(page.getByRole("button", { name: /^Sign in/ })).toBeVisible();
  }
});

test("experience section is restrained in both themes and authentic JPMC logos remain visible", async ({
  page,
}, info) => {
  await ready(page);
  const selector = 'img[src="/company-logos/jpmorgan.svg"]';
  await expect(page.locator(selector)).toHaveCount(3);
  await expect(page.locator(".lp-experiences")).not.toContainText(/beta/i);
  for (const theme of ["light", "dark"]) {
    if (theme === "dark") {
      await page.evaluate(() => scrollBy(0, -90));
      await page.getByRole("button", { name: "Switch to dark mode" }).click();
    }
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await page.locator(".lp-experiences").scrollIntoViewIfNeeded();
    const result = await page.locator(".lp-experiences").evaluate((element) => {
      const rgb = (value: string) =>
        value
          .match(/[\d.]+/g)!
          .slice(0, 3)
          .map(Number);
      const background = rgb(
        getComputedStyle(element.querySelector(".lp-experience-heading")!)
          .backgroundColor,
      );
      const foreground = rgb(
        getComputedStyle(
          element.querySelector(
            ".lp-experience-heading>p:not(.lp-section-label)",
          )!,
        ).color,
      );
      const lum = (channels: number[]) =>
        channels
          .map((channel) => {
            const v = channel / 255;
            return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
          })
          .reduce(
            (sum, v, index) => sum + v * [0.2126, 0.7152, 0.0722][index],
            0,
          );
      const a = lum(background),
        b = lum(foreground);
      return {
        spread: Math.max(...background) - Math.min(...background),
        contrast: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
      };
    });
    expect(result.spread).toBeLessThan(65);
    expect(result.contrast).toBeGreaterThanOrEqual(4.5);
    await page
      .getByRole("button", { name: "The interview", exact: false })
      .click();
    await expect(page.locator("#experience-detail")).toContainText(
      "Get past the job description.",
    );
    await page.screenshot({
      path: `artifacts/floating-nav-${theme}-${info.project.name}.png`,
    });
    for (const image of await page.locator(selector).all()) {
      await image.scrollIntoViewIfNeeded();
      await expect(image).toBeVisible();
      expect(
        await image.evaluate((node: HTMLImageElement) => node.naturalWidth),
      ).toBeGreaterThan(0);
      const box = await image.boundingBox();
      expect(box!.width).toBeGreaterThan(40);
      await expect(image).toHaveCSS("object-fit", "contain");
    }
  }
});

test("scroll navigation respects reduced motion and the notebook works at phone widths", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page);
  const header = page.locator(".lp-header");
  await expect(header).toHaveCSS("transition-duration", "0s");
  await page.evaluate(() => scrollTo(0, 600));
  await expect(header).toHaveAttribute("data-collapsed", "true");
  await page.evaluate(() => scrollBy(0, -80));
  await expect(header).toHaveAttribute("data-collapsed", "false");
  for (const width of [320, 393, 600, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator(".lp-experiences").scrollIntoViewIfNeeded();
    await expect(
      page.getByRole("button", { name: "What helped", exact: false }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "What helped", exact: false })
      .click();
    await expect(page.locator("#experience-detail")).toContainText(
      "Prepare with a little perspective.",
    );
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
  }
  await expect(page.locator(".lp-experiences")).not.toContainText(
    "process.Learn",
  );
});

test("Voronoi canvas has native-or-better edge resolution on desktop and retina phones", async ({
  page,
}) => {
  await ready(page);
  for (const size of [
    { width: 1920, height: 1080 },
    { width: 393, height: 851 },
  ]) {
    await page.setViewportSize(size);
    await page.locator(".lp-finale").scrollIntoViewIfNeeded();
    await expect(page.locator(".lp-finale-pattern")).toHaveClass(/is-ready/);
    await expect
      .poll(() =>
        page
          .locator(".lp-finale-canvas canvas")
          .evaluate((canvas: HTMLCanvasElement) => {
            const box = canvas.getBoundingClientRect();
            return Math.min(
              canvas.width / box.width,
              canvas.height / box.height,
            );
          }),
      )
      .toBeGreaterThanOrEqual(1.4);
  }
});
