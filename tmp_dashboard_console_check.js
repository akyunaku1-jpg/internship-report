const puppeteer = require("puppeteer");

function shortStack(stack) {
  if (!stack) return "";
  return String(stack).split("\n").slice(0, 8).join("\n");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForStable(page, ms = 2500) {
  await Promise.race([
    page.waitForNetworkIdle({ idleTime: 700, timeout: ms }).catch(() => {}),
    sleep(ms),
  ]);
}

async function clickByText(page, regex) {
  const handle = await page.evaluateHandle((patternSource, patternFlags) => {
    const pattern = new RegExp(patternSource, patternFlags);
    const nodes = Array.from(document.querySelectorAll("a, button, [role='button'], input[type='submit']"));
    return nodes.find((el) => {
      const text = (el.textContent || el.value || "").trim();
      return pattern.test(text);
    }) || null;
  }, regex.source, regex.flags);
  const el = handle.asElement();
  if (!el) return false;
  await el.click().catch(() => {});
  return true;
}

async function fillAuthForm(page, email, password) {
  const emailSelector = 'input[type="email"], input[name*="email" i], input[id*="email" i]';
  const passwordSelector = 'input[type="password"], input[name*="password" i], input[id*="password" i]';
  const hasEmail = await page.$(emailSelector);
  const passwords = await page.$$(passwordSelector);
  if (!hasEmail || !passwords.length) return false;

  await page.focus(emailSelector).catch(() => {});
  await page.click(emailSelector, { clickCount: 3 }).catch(() => {});
  await page.keyboard.press("Backspace").catch(() => {});
  await page.type(emailSelector, email).catch(() => {});

  for (let i = 0; i < passwords.length; i += 1) {
    const selector = `(${passwordSelector})`;
    const passEl = passwords[i];
    await passEl.click({ clickCount: 3 }).catch(() => {});
    await page.keyboard.press("Backspace").catch(() => {});
    await passEl.type(password).catch(() => {});
    if (i > 0) {
      await sleep(80);
    }
  }
  return true;
}

async function fillRegisterForm(page, name, email, password) {
  const nameSelector = 'input[placeholder*="name" i], input[name*="name" i], input[id*="name" i], input[type="text"]';
  const emailSelector = 'input[type="email"], input[name*="email" i], input[id*="email" i]';
  const passwordSelector = 'input[type="password"], input[name*="password" i], input[id*="password" i]';

  const nameEl = await page.$(nameSelector);
  const emailEl = await page.$(emailSelector);
  const passEls = await page.$$(passwordSelector);
  if (!nameEl || !emailEl || passEls.length < 2) return false;

  await nameEl.click({ clickCount: 3 }).catch(() => {});
  await page.keyboard.press("Backspace").catch(() => {});
  await nameEl.type(name).catch(() => {});

  await emailEl.click({ clickCount: 3 }).catch(() => {});
  await page.keyboard.press("Backspace").catch(() => {});
  await emailEl.type(email).catch(() => {});

  for (const passEl of passEls.slice(0, 2)) {
    await passEl.click({ clickCount: 3 }).catch(() => {});
    await page.keyboard.press("Backspace").catch(() => {});
    await passEl.type(password).catch(() => {});
    await sleep(80);
  }
  return true;
}

async function detectBlank(page) {
  return page.evaluate(() => {
    const body = document.body;
    if (!body) return { isBlank: true, visibleTextChars: 0, contentNodeCount: 0 };

    const text = (body.innerText || "").replace(/\s+/g, " ").trim();
    const nodes = Array.from(document.querySelectorAll("main, section, article, div, p, h1, h2, h3, h4, h5, h6"));
    const visibleNodes = nodes.filter((el) => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    });
    const isBlank = text.length === 0 || visibleNodes.length === 0;
    return {
      isBlank,
      visibleTextChars: text.length,
      contentNodeCount: visibleNodes.length,
      bg: window.getComputedStyle(body).backgroundColor,
    };
  });
}

async function main() {
  const base = "https://internship-report-phi.vercel.app";
  const testName = "QA Automation";
  const testEmail = `qa+${Date.now()}@mailinator.com`;
  const testPassword = "T3st!Passw0rd#2026";
  const browser = await puppeteer.launch({ headless: "new", defaultViewport: { width: 1365, height: 900 } });
  const page = await browser.newPage();
  const events = [];
  const steps = [];

  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const loc = msg.location ? msg.location() : null;
    events.push({
      kind: "console.error",
      text: msg.text ? msg.text() : String(msg),
      url: page.url(),
      location: loc && loc.url ? `${loc.url}:${loc.lineNumber ?? 0}:${loc.columnNumber ?? 0}` : "",
    });
  });

  page.on("pageerror", (err) => {
    events.push({
      kind: "pageerror",
      text: err.message,
      url: page.url(),
      stack: shortStack(err.stack),
    });
  });

  let navError = null;
  try {
    await page.goto(base, { waitUntil: "domcontentloaded", timeout: 60000 });
    await waitForStable(page, 4000);
    steps.push(`Opened ${base}`);
  } catch (err) {
    navError = String(err.message || err);
    steps.push(`Navigation failed at base URL: ${navError}`);
  }

  if (!navError) {
    const onAuth = await page.$('input[type="email"], input[type="password"]');
    if (onAuth) {
      steps.push("Auth form detected on initial load");

      const clickedRegister = await clickByText(page, /register|sign up|create account|new account/i);
      if (clickedRegister) {
        steps.push("Clicked register/sign-up entry point");
        await waitForStable(page, 3500);
        const filledRegister = await fillRegisterForm(page, testName, testEmail, testPassword);
        if (filledRegister) {
          steps.push(`Filled dedicated register form with ${testEmail}`);
          await clickByText(page, /create account|register|sign up|continue|submit/i);
          await waitForStable(page, 4500);
          steps.push("Submitted registration form (best effort)");
        } else {
          steps.push("Could not identify dedicated register form fields");
        }
      } else {
        steps.push("No explicit register/sign-up link found; trying current auth form");
      }

      await page.goto(base, { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
      await waitForStable(page, 3000);
      steps.push("Returned to login page after register attempt");

      const filledForLogin = await fillAuthForm(page, testEmail, testPassword);
      if (filledForLogin) {
        steps.push("Filled auth form for login using same test credentials");
        await clickByText(page, /log in|login|sign in|continue|submit/i);
        await waitForStable(page, 5000);
        steps.push("Submitted login form (best effort)");
        if (page.url().includes("/dashboard")) {
          steps.push(`Reached dashboard route after login: ${page.url()}`);
        }
      } else {
        steps.push("Could not identify login form after registration attempt");
      }
    } else {
      steps.push("No auth form detected on landing page");
    }
  }

  await page.goto(`${base}/dashboard`, { waitUntil: "domcontentloaded", timeout: 60000 }).catch((err) => {
    steps.push(`Navigation to /dashboard failed: ${String(err.message || err)}`);
  });
  await waitForStable(page, 6000);
  steps.push(`Navigated to ${page.url()}`);

  const blank = await detectBlank(page);
  const title = await page.title().catch(() => "");
  await page.screenshot({ path: "tmp_dashboard_after_login.png", fullPage: true }).catch(() => {});
  await browser.close();

  process.stdout.write(JSON.stringify({
    base,
    dashboardUrl: `${base}/dashboard`,
    finalUrl: page.url(),
    title,
    testAccount: {
      email: testEmail,
      password: testPassword,
    },
    steps,
    navError,
    blankCheck: blank,
    errors: events,
  }, null, 2));
}

main().catch((err) => {
  process.stderr.write(String(err?.stack || err));
  process.exit(1);
});
