import { QueryClient } from "@tanstack/react-query";

function shouldRetry(failureCount, error) {
  const message = String(error?.message || "").toLowerCase();
  if (
    message.includes("session expired") ||
    message.includes("invalid credentials") ||
    message.includes("forbidden")
  ) {
    return false;
  }
  return failureCount < 2;
}

function retryDelay(attemptIndex) {
  return 350 * (attemptIndex + 1);
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: shouldRetry,
      retryDelay,
    },
  },
});

export const queryKeys = {
  dashboardSummary: (scope = "guest") => ["dashboard", "summary", scope],
  walletMe: (scope = "guest") => ["wallet", "me", scope],
  walletLedger: (scope = "guest") => ["wallet", "ledger", scope],
  transferAccounts: (scope = "guest") => ["wallet", "transfer-accounts", scope],
  dataPlans: (scope = "guest") => ["data", "plans", scope],
  transactionsMe: (scope = "guest") => ["transactions", "me", scope],
  notificationsBroadcast: (scope = "guest") => ["notifications", "broadcast", scope],
  reportsMe: (scope = "guest") => ["transactions", "reports", "me", scope],
};
