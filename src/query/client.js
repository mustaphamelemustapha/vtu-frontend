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
  dashboardSummary: ["dashboard", "summary"],
  walletMe: ["wallet", "me"],
  walletLedger: ["wallet", "ledger"],
  transferAccounts: ["wallet", "transfer-accounts"],
  dataPlans: ["data", "plans"],
  transactionsMe: ["transactions", "me"],
  notificationsBroadcast: ["notifications", "broadcast"],
  reportsMe: ["transactions", "reports", "me"],
};
