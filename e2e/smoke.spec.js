import { expect, test } from "@playwright/test";

function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function installApiMocks(page) {
  const state = {
    walletBalance: 5000,
    pendingFund: null,
    ledger: [],
    transactions: [
      {
        id: 1,
        reference: "TX_BOOT_1",
        tx_type: "DATA",
        amount: "500.00",
        status: "SUCCESS",
        network: "mtn",
        data_plan_code: "1001",
        external_reference: "BOOT_EXT_1",
        failure_reason: null,
      },
    ],
    plans: [
      {
        id: 1,
        network: "mtn",
        plan_code: "1001",
        plan_name: "MTN 1GB",
        data_size: "1GB",
        validity: "30d",
        price: "429.00",
      },
      {
        id: 2,
        network: "glo",
        plan_code: "206",
        plan_name: "Glo 1GB",
        data_size: "1GB",
        validity: "30d",
        price: "399.00",
      },
    ],
    nextId: 2,
  };

  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("vtu_onboarded", "true");
  });

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api\/v1/, "");

    if (method === "POST" && path === "/auth/login") {
      return json(route, {
        access_token: "access-token-e2e",
        refresh_token: "refresh-token-e2e",
        token_type: "bearer",
      });
    }

    if (method === "POST" && path === "/auth/refresh") {
      return json(route, {
        access_token: "access-token-e2e-refresh",
        refresh_token: "refresh-token-e2e-refresh",
        token_type: "bearer",
      });
    }

    if (method === "GET" && path === "/auth/me") {
      return json(route, {
        id: 99,
        email: "user@example.com",
        full_name: "Test User",
        role: "user",
      });
    }

    if (method === "GET" && path === "/wallet/me") {
      return json(route, {
        balance: state.walletBalance.toFixed(2),
        is_locked: false,
      });
    }

    if (method === "GET" && path === "/wallet/ledger") {
      return json(route, state.ledger);
    }

    if (method === "POST" && path === "/wallet/fund") {
      const payload = request.postDataJSON();
      const amount = Number(payload?.amount || 0);
      state.pendingFund = {
        reference: `FUND_E2E_${Date.now()}`,
        amount,
      };
      return json(route, {
        status: true,
        data: {
          reference: state.pendingFund.reference,
        },
      });
    }

    if (method === "GET" && path === "/wallet/paystack/verify") {
      const reference =
        url.searchParams.get("reference") ||
        state.pendingFund?.reference ||
        `FUND_E2E_${Date.now()}`;
      if (state.pendingFund) {
        state.walletBalance += state.pendingFund.amount;
        state.ledger.unshift({
          id: state.nextId++,
          amount: state.pendingFund.amount.toFixed(2),
          entry_type: "credit",
          reference,
          description: "Wallet funding via Paystack",
        });
        state.transactions.unshift({
          id: state.nextId++,
          reference,
          tx_type: "WALLET_FUND",
          amount: state.pendingFund.amount.toFixed(2),
          status: "SUCCESS",
          network: null,
          data_plan_code: null,
          external_reference: "PAYSTACK_E2E",
          failure_reason: null,
        });
        state.pendingFund = null;
      }
      return json(route, { status: "success" });
    }

    if (method === "GET" && path === "/data/plans") {
      return json(route, state.plans);
    }

    if (method === "POST" && path === "/data/purchase") {
      const payload = request.postDataJSON();
      const plan = state.plans.find((item) => item.plan_code === payload?.plan_code);
      const amount = Number(plan?.price || 0);
      const reference = `DATA_E2E_${Date.now()}`;
      state.walletBalance = Math.max(0, state.walletBalance - amount);
      state.transactions.unshift({
        id: state.nextId++,
        reference,
        tx_type: "DATA",
        amount: amount.toFixed(2),
        status: "SUCCESS",
        network: plan?.network || null,
        data_plan_code: plan?.plan_code || null,
        external_reference: "AMIGO_E2E",
        failure_reason: null,
      });
      return json(route, {
        reference,
        status: "success",
      });
    }

    if (method === "GET" && path === "/transactions/me") {
      return json(route, state.transactions);
    }

    return json(route, { detail: `Unhandled mock route: ${method} ${path}` }, 404);
  });
}

async function login(page) {
  await page.goto("/app/");
  await page.getByRole("textbox", { name: "Email" }).fill("user@example.com");
  await page.locator('input[type="password"][placeholder="Password"]').fill("Password123!");
  await page.getByRole("button", { name: /^Login$/ }).click();
  await expect(page.getByText("Wallet Balance")).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await installApiMocks(page);
});

test("login smoke", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/\/app\/?$/);
  await expect(page.getByText("Hi, Test User")).toBeVisible();
});

test("wallet funding smoke", async ({ page }) => {
  await login(page);
  await page.locator("aside.nav").getByRole("link", { name: "Wallet" }).click();
  await expect(page).toHaveURL(/\/app\/wallet$/);

  await page.getByLabel("Amount (₦)").fill("2500");
  await page.getByRole("button", { name: "Pay with Paystack" }).click();
  await page.getByRole("button", { name: "Verify Paystack Payment" }).click();

  await expect(page.getByText("Wallet Funded")).toBeVisible();
  await expect(page.getByText("Your payment was successful.")).toBeVisible();
});

test("data purchase smoke", async ({ page }) => {
  await login(page);
  await page.locator("aside.nav").getByRole("link", { name: "Buy Data" }).click();
  await expect(page).toHaveURL(/\/app\/data$/);

  await page.getByLabel("Phone Number").fill("08012345678");
  await page.getByRole("button", { name: /MTN 1GB/i }).first().click();
  await page.getByRole("button", { name: "Confirm & Buy" }).click();

  await expect(page.getByText("Data Purchase Successful")).toBeVisible();
  await page.getByRole("button", { name: "View Receipt" }).click();

  await expect(page).toHaveURL(/\/app\/transactions$/);
  await expect(page.getByText(/DATA_E2E_/)).toBeVisible();
});
