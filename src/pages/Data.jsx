import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch, getActiveAuthScope, getProfile } from "../services/api";
import { saveBeneficiary } from "../services/beneficiaries";
import { buildReceiptShareText, shareReceiptCapture, shareReceiptCaptureOnWhatsApp } from "../services/receiptShare";
import { useToast } from "../context/toast.jsx";
import { queryKeys } from "../query/client.js";
import Button from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";

const RESULT_PREFS_KEY = "vtu_data_result_prefs";
const DELIVERED_HINTS = ["success", "successful", "delivered", "gifted", "completed"];
const DATA_PLANS_CACHE_KEY = "axisvtu_data_plans_cache_v3";
const DATA_PLANS_CACHE_TTL_MS = 10 * 60 * 1000;
const DATA_WALLET_CACHE_KEY = "axisvtu_data_wallet_cache_v1";
const PLAN_KEYWORD_BLOCKLIST = [
  "night",
  "social",
  "weekend",
  "daily",
  "awoof",
  "bonus",
  "router",
  "mifi",
  "youtube",
  "unlimited",
];
const CURATED_MAX_PER_NETWORK = 8;

export default function Data() {
  const MIN_PURCHASE_LOADING_MS = 1200;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState([]);
  const [phone, setPhone] = useState("");
  const [network, setNetwork] = useState("all");
  const [ported, setPorted] = useState(false);
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recommended");
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [refreshingPlans, setRefreshingPlans] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState(null);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [wallet, setWallet] = useState(null);
  const [plansError, setPlansError] = useState("");
  const [walletError, setWalletError] = useState("");
  const [resultPrefs, setResultPrefs] = useState({ save_beneficiary: true });
  const receiptCaptureRef = useRef(null);
  const purchaseLockRef = useRef(false);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const profile = getProfile();
  const cacheScope = getActiveAuthScope();
  const scopedPlansCacheKey = `${DATA_PLANS_CACHE_KEY}:${cacheScope || "guest"}`;
  const scopedWalletCacheKey = `${DATA_WALLET_CACHE_KEY}:${cacheScope || "guest"}`;
  const recipientCacheKey = `vtu_last_recipient:${cacheScope || "guest"}`;

  const parseSize = (value) => {
    if (!value) return null;
    const str = String(value).toLowerCase();
    const num = parseFloat(str);
    if (Number.isNaN(num)) return null;
    if (str.includes("mb")) return num / 1024;
    return num;
  };

  const sanitizePlanText = (value) =>
    String(value || "")
      .replace(/\(\s*direct\s+data\s*\)/gi, "")
      .replace(/\bdirect\s+data\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim()
      .replace(/^\-\s*/, "")
      .replace(/\s*\-$/, "");

  const normalizePlanItem = (plan) => ({
    ...(plan || {}),
    plan_name: sanitizePlanText(plan?.plan_name),
    data_size: sanitizePlanText(plan?.data_size),
  });

  const planPrice = (plan) => {
    const value = Number(plan?.price);
    return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
  };

  const planLabel = (plan) =>
    `${String(plan?.plan_name || "")} ${String(plan?.data_size || "")} ${String(plan?.validity || "")}`.toLowerCase();

  const validityDays = (plan) => {
    const raw = String(plan?.validity || plan?.plan_name || "").toLowerCase();
    const match = raw.match(/(\d+)\s*(day|days|month|months|week|weeks|d)/i);
    if (!match) return null;
    const amount = Number(match[1]);
    if (!Number.isFinite(amount)) return null;
    const unit = String(match[2] || "").toLowerCase();
    if (unit.startsWith("month")) return amount * 30;
    if (unit.startsWith("week")) return amount * 7;
    return amount;
  };

  const curatePlans = (rows) => {
    const input = (Array.isArray(rows) ? rows : []).map(normalizePlanItem);
    if (!input.length) return [];

    const grouped = new Map();
    for (const item of input) {
      const networkKey = String(item?.network || "").toLowerCase().trim() || "unknown";
      if (!grouped.has(networkKey)) grouped.set(networkKey, []);
      grouped.get(networkKey).push(item);
    }

    const curated = [];
    for (const [, networkPlans] of grouped) {
      const clean = networkPlans.filter((plan) => {
        const label = planLabel(plan);
        const noisy = PLAN_KEYWORD_BLOCKLIST.some((keyword) => label.includes(keyword));
        const validDays = validityDays(plan);
        const tooShort = Number.isFinite(validDays) && validDays < 7;
        return !noisy && !tooShort;
      });

      const source = clean.length >= 4 ? clean : networkPlans;
      source.sort((a, b) => planPrice(a) - planPrice(b));
      curated.push(...source.slice(0, CURATED_MAX_PER_NETWORK));
    }

    return curated;
  };

  const networkClass = (value) => {
    const raw = String(value || "").toLowerCase();
    if (!raw) return "";
    if (raw === "9mobile") return "network-9mobile";
    return raw.replace(/[^a-z0-9_-]/g, "-");
  };

  const inferProviderLabel = (provider, networkValue) => {
    const key = String(provider || "").trim().toLowerCase();
    if (key === "clubkonnect") return "Clubkonnect";
    if (key === "vtpass") return "VTPass";
    if (key === "amigo") return "Amigo";

    const net = String(networkValue || "").trim().toLowerCase();
    if (net === "mtn" || net === "glo") return "Amigo";
    if (net === "airtel" || net === "9mobile" || net === "etisalat" || net === "t2") return "Clubkonnect";
    return "Provider";
  };

  const saveRecipient = (next) => {
    try {
      localStorage.setItem(recipientCacheKey, JSON.stringify(next));
    } catch {
      // ignore storage errors (private mode, quota, etc.)
    }
  };

  const readJsonCache = (key) => {
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch {
      return null;
    }
  };

  const writeJsonCache = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore storage errors
    }
  };

  const loadPlans = async ({ forceRefresh = false } = {}) => {
    setPlansError("");
    if (forceRefresh) {
      queryClient.invalidateQueries({ queryKey: queryKeys.dataPlans(cacheScope) });
    }
    const cached = readJsonCache(scopedPlansCacheKey);
    const cachedRows = Array.isArray(cached?.plans) ? cached.plans : [];
    const hasCached = cachedRows.length> 0;
    const isFresh =
      hasCached &&
      Number.isFinite(Number(cached?.cached_at)) &&
      Date.now() - Number(cached.cached_at) < DATA_PLANS_CACHE_TTL_MS;

    if (hasCached) {
      setPlans(curatePlans(cachedRows));
      setLoadingPlans(false);
    } else {
      setLoadingPlans(true);
    }

    if (isFresh && !forceRefresh) {
      return;
    }

    setRefreshingPlans(true);
    try {
      const data = await queryClient.fetchQuery({
        queryKey: queryKeys.dataPlans(cacheScope),
        queryFn: () => apiFetch("/data/plans", { _suppressRetryToast: true }),
        staleTime: DATA_PLANS_CACHE_TTL_MS,
      });
      const curated = curatePlans(data);
      setPlans(curated);
      writeJsonCache(scopedPlansCacheKey, {
        plans: curated,
        cached_at: Date.now(),
      });
    } catch (err) {
      const msg = err?.message || "Failed to load data plans.";
      if (!hasCached) {
        setPlansError(msg);
        showToast(msg, "error");
      } else if (forceRefresh) {
        showToast("Using cached plans. Refresh failed.", "warning");
      }
    } finally {
      setLoadingPlans(false);
      setRefreshingPlans(false);
    }
  };

  const loadWallet = async () => {
    setWalletError("");
    const cached = readJsonCache(scopedWalletCacheKey);
    if (cached && typeof cached === "object") {
      setWallet(cached);
    }
    try {
      const data = await queryClient.fetchQuery({
        queryKey: queryKeys.walletMe(cacheScope),
        queryFn: () => apiFetch("/wallet/me", { _suppressRetryToast: true }),
        staleTime: 45 * 1000,
      });
      setWallet(data);
      writeJsonCache(scopedWalletCacheKey, data);
    } catch (err) {
      const msg = err?.message || "Failed to load wallet balance.";
      setWalletError(msg);
      if (!cached) showToast(msg, "error");
    }
  };

  useEffect(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem(RESULT_PREFS_KEY) || "{}");
      setResultPrefs({
        save_beneficiary: prefs?.save_beneficiary !== false,
      });
    } catch {
      setResultPrefs({ save_beneficiary: true });
    }
  }, []);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(recipientCacheKey) || "null");
      if (stored && typeof stored === "object") {
        if (typeof stored.phone === "string") setPhone(stored.phone);
        if (typeof stored.ported === "boolean") setPorted(stored.ported);
      }
    } catch {
      // ignore
    }
    try {
      const qpPhone = searchParams.get("phone");
      const qpPorted = searchParams.get("ported");
      const qpNetwork = String(searchParams.get("network") || "").trim().toLowerCase();
      if (qpPhone) {
        const nextPorted = qpPorted === "1" || qpPorted === "true";
        setPhone(qpPhone);
        setPorted(nextPorted);
        saveRecipient({ phone: qpPhone, ported: nextPorted });
      }
      if (qpNetwork && ["all", "mtn", "glo", "airtel", "9mobile"].includes(qpNetwork)) {
        setNetwork(qpNetwork);
      }
    } catch {
      // ignore
    }
    loadPlans();
    loadWallet();
  }, [cacheScope, queryClient, searchParams, recipientCacheKey]);

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const normalizePhone = (value) => String(value || "").replace(/\D/g, "");
  const normalizePlanCode = (value) => String(value || "").split(":").pop();

  const updateResultPref = (key, value) => {
    const next = { ...resultPrefs, [key]: !!value };
    setResultPrefs(next);
    try {
      localStorage.setItem(RESULT_PREFS_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  };

  const toStatusKey = (value) => String(value || "").toLowerCase();
  const isDeliveredMessage = (value) => {
    const msg = String(value || "").toLowerCase();
    if (!msg) return false;
    return DELIVERED_HINTS.some((hint) => msg.includes(hint));
  };

  const pollTransactionByReference = async (reference, maxAttempts = 6) => {
    const target = String(reference || "").trim();
    if (!target) return null;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        const rows = await apiFetch("/transactions/me", { _suppressRetryToast: true });
        const tx = (Array.isArray(rows) ? rows : []).find((item) => String(item?.reference || "") === target);
        if (tx) {
          const status = toStatusKey(tx?.status);
          if (["success", "failed", "refunded"].includes(status)) return tx;
        }
      } catch {
        // ignore poll errors and continue
      }
      await sleep(1000 * (attempt + 1));
    }
    return null;
  };

  const startPendingReconciliation = ({ reference, chosenPlan, recipientPhone }) => {
    if (!reference) return;
    (async () => {
      const tx = await pollTransactionByReference(reference, 6);
      if (!tx) return;
      const mapped = mapTransactionToResult(tx, chosenPlan, recipientPhone);
      setPurchaseResult(mapped);
      if (toStatusKey(mapped.status) === "success") {
        setMessage("");
        showToast("Purchase confirmed successful.", "success");
      } else if (toStatusKey(mapped.status) === "failed" || toStatusKey(mapped.status) === "refunded") {
        showToast(mapped.failure_reason || "Purchase did not complete.", "warning");
      }
      loadWallet();
    })();
  };

  const startRecentReconciliation = ({ chosenPlan, planCode, recipientPhone, maxAttempts = 8 }) => {
    (async () => {
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const tx = await findMatchingRecentTransaction({ chosenPlan, planCode, recipientPhone });
        if (tx) {
          const mapped = mapTransactionToResult(tx, chosenPlan, recipientPhone);
          setPurchaseResult(mapped);
          if (toStatusKey(mapped.status) === "success") {
            setMessage("");
            showToast("Purchase confirmed successful.", "success");
          } else if (toStatusKey(mapped.status) === "pending") {
            setMessage("Purchase submitted. Verifying final status...");
            showToast("Purchase submitted and is pending confirmation.", "info");
          } else {
            showToast(mapped.failure_reason || "Purchase did not complete.", "warning");
          }
          loadWallet();
          return;
        }
        await sleep(900 * (attempt + 1));
      }
      showToast("Still verifying purchase status. Check History shortly.", "warning");
    })();
  };
  const isTransientPurchaseError = (error) => {
    const msg = String(error?.message || "").toLowerCase();
    if (!msg) return false;
    if (msg.includes("insufficient balance") || msg.includes("plan not found") || msg.includes("unsupported network")) {
      return false;
    }
    return (
      msg.includes("service is busy") ||
      msg.includes("request timed out") ||
      msg.includes("network") ||
      msg.includes("failed to fetch") ||
      msg.includes("temporarily unavailable") ||
      msg.includes("502") ||
      msg.includes("503") ||
      msg.includes("504")
    );
  };

  const mapTransactionToResult = (tx, chosenPlan, fallbackPhone) => {
    const status = toStatusKey(tx?.status || "pending");
    return {
      ok: status !== "failed" && status !== "refunded",
      reference: tx?.reference || `AXIS-${Date.now()}`,
      status,
      created_at: tx?.created_at || new Date().toISOString(),
      test_mode: false,
      plan: chosenPlan,
      plan_code: tx?.data_plan_code || chosenPlan?.plan_code || "—",
      validity: chosenPlan?.validity || "",
      network: tx?.network || chosenPlan?.network || "",
      recipient: tx?.meta?.recipient_phone || fallbackPhone || "",
      amount: Number(tx?.amount ?? chosenPlan?.price ?? 0),
      ported,
      failure_reason: tx?.failure_reason || "",
      provider_message: "",
      provider: inferProviderLabel("", tx?.network || chosenPlan?.network || ""),
    };
  };

  const findMatchingRecentTransaction = async ({ chosenPlan, planCode, recipientPhone }) => {
    const targetPlan = normalizePlanCode(planCode);
    const targetPhone = normalizePhone(recipientPhone);
    const targetAmount = Number(chosenPlan?.price || 0);
    const targetNetwork = String(chosenPlan?.network || network || "").toLowerCase();

    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const rows = await apiFetch("/transactions/me", { _suppressRetryToast: true });
        const now = Date.now();
        const candidates = (Array.isArray(rows) ? rows : [])
          .filter((tx) => String(tx?.tx_type || "").toLowerCase() === "data")
          .filter((tx) => {
            const createdAt = Date.parse(tx?.created_at || "");
            if (!Number.isFinite(createdAt)) return false;
            return now - createdAt <= 15 * 60 * 1000;
          })
          .sort((a, b) => Date.parse(b?.created_at || 0) - Date.parse(a?.created_at || 0));

        let best = null;
        let bestScore = -1;
        for (const tx of candidates) {
          let score = 0;
          const txPlan = normalizePlanCode(tx?.data_plan_code);
          const txPhone = normalizePhone(tx?.meta?.recipient_phone);
          const txAmount = Number(tx?.amount || 0);
          const txNetwork = String(tx?.network || "").toLowerCase();

          if (txPlan && targetPlan && txPlan === targetPlan) score += 4;
          if (txPhone && targetPhone && (txPhone.endsWith(targetPhone.slice(-10)) || targetPhone.endsWith(txPhone.slice(-10)))) score += 5;
          if (txNetwork && targetNetwork && txNetwork === targetNetwork) score += 3;
          if (Math.abs(txAmount - targetAmount) < 0.01) score += 2;
          if (now - Date.parse(tx?.created_at || 0) <= 2 * 60 * 1000) score += 1;

          if (score> bestScore) {
            best = tx;
            bestScore = score;
          }
        }
        if (best && bestScore>= 4) return best;
      } catch {
        // ignore and continue polling
      }
      await sleep(700 * (attempt + 1));
    }
    return null;
  };

  const buy = async (planCode) => {
    if (purchaseLockRef.current) return;
    setMessage("");
    const startedAt = Date.now();
    try {
      if (!phone) {
        setFieldError("Enter a valid phone number.");
        showToast("Enter a valid phone number.", "error");
        return;
      }
      purchaseLockRef.current = true;
      setFieldError("");
      const chosenPlan = plans.find((p) => p.plan_code === planCode) || null;
      setSelected(null);
      setLoading(true);
      const res = await apiFetch("/data/purchase", {
        method: "POST",
        body: JSON.stringify({
          plan_code: planCode,
          phone_number: phone,
          ported_number: ported,
          network: String(chosenPlan?.network || network || "").toLowerCase() || undefined,
        }),
      });
      const apiStatus = toStatusKey(res.status || "success");
      const inferredSuccess = apiStatus === "pending" && isDeliveredMessage(res.message);
      const resolvedStatus = inferredSuccess ? "success" : (apiStatus || "success");
      const reference = res.reference || `AXIS-${Date.now()}`;
      const resolvedNetwork = String(res.network || chosenPlan?.network || "");
      setPurchaseResult({
        ok: !["failed", "refunded"].includes(resolvedStatus),
        reference,
        status: resolvedStatus,
        created_at: res.created_at || new Date().toISOString(),
        test_mode: !!res.test_mode,
        plan: chosenPlan,
        plan_code: res.plan_code || chosenPlan?.plan_code || planCode,
        validity: chosenPlan?.validity || "",
        network: resolvedNetwork,
        recipient: phone,
        amount: Number(chosenPlan?.price || 0),
        ported,
        failure_reason:
          ["failed", "refunded"].includes(resolvedStatus)
            ? String(res.failure_reason || res.message || "").trim()
            : "",
        provider_message: res.message || "",
        provider: inferProviderLabel(res.provider, resolvedNetwork),
      });
      const failureReasonText = String(res.failure_reason || res.message || "").toLowerCase();
      if (failureReasonText.includes("invalid_dataplan")) {
        await loadPlans({ forceRefresh: true });
      }
      if (resultPrefs.save_beneficiary) {
        saveBeneficiary("data", {
          label: phone,
          subtitle: `${String(chosenPlan?.network || network || "any").toUpperCase()} • ${ported ? "Ported" : "Standard"}`,
          fields: {
            phone,
            ported,
            preferred_network: String(chosenPlan?.network || network || "").toLowerCase(),
          },
        });
      }
      loadWallet();
      if (resolvedStatus === "success") {
        showToast("Purchase successful.", "success");
      } else if (resolvedStatus === "pending") {
        showToast("Purchase submitted. Confirming status...", "info");
        startPendingReconciliation({ reference, chosenPlan, recipientPhone: phone });
      } else {
        showToast("Purchase submitted with unresolved status.", "warning");
      }
    } catch (err) {
      const chosenPlan = plans.find((p) => p.plan_code === planCode) || null;
      if (isTransientPurchaseError(err)) {
        setMessage("Purchase submitted. Verifying final status...");
        const matchedTx = await findMatchingRecentTransaction({
          chosenPlan,
          planCode,
          recipientPhone: phone,
        });
        if (matchedTx) {
          const mapped = mapTransactionToResult(matchedTx, chosenPlan, phone);
          setPurchaseResult(mapped);
          loadWallet();
          if (toStatusKey(mapped.status) === "success") {
            showToast("Purchase successful.", "success");
          } else if (toStatusKey(mapped.status) === "pending") {
            showToast("Purchase submitted and is pending confirmation.", "info");
            startPendingReconciliation({
              reference: mapped.reference,
              chosenPlan,
              recipientPhone: phone,
            });
          } else {
            showToast(mapped.failure_reason || "Purchase failed and has been updated in history.", "warning");
          }
          setMessage("");
          return;
        }
        setPurchaseResult({
          ok: true,
          reference: `AXIS-PENDING-${Date.now()}`,
          status: "pending",
          created_at: new Date().toISOString(),
          test_mode: false,
          plan: chosenPlan,
          plan_code: chosenPlan?.plan_code || planCode,
          validity: chosenPlan?.validity || "",
          network: chosenPlan?.network || "",
          recipient: phone,
          amount: Number(chosenPlan?.price || 0),
          ported,
          failure_reason: "",
          provider_message: "Network unstable. Verifying purchase status...",
          provider: inferProviderLabel("", chosenPlan?.network || ""),
        });
        showToast("Purchase submitted. Verifying status...", "info");
        startRecentReconciliation({
          chosenPlan,
          planCode,
          recipientPhone: phone,
          maxAttempts: 10,
        });
        return;
      }
      setMessage(err.message);
      if (String(err?.message || "").toLowerCase().includes("invalid_dataplan")) {
        await loadPlans({ forceRefresh: true });
      }
      setPurchaseResult({
        ok: false,
        reference: `AXIS-ATTEMPT-${Date.now()}`,
        status: "failed",
        created_at: new Date().toISOString(),
        test_mode: false,
        plan: chosenPlan,
        plan_code: chosenPlan?.plan_code || planCode,
        validity: chosenPlan?.validity || "",
        network: chosenPlan?.network || "",
        recipient: phone,
        amount: Number(chosenPlan?.price || 0),
        ported,
        failure_reason: err?.message || "Data purchase failed.",
        provider_message: "",
        provider: inferProviderLabel("", chosenPlan?.network || ""),
      });
      showToast(err.message || "Purchase failed.", "error");
    } finally {
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_PURCHASE_LOADING_MS) {
        await new Promise((resolve) => setTimeout(resolve, MIN_PURCHASE_LOADING_MS - elapsed));
      }
      setLoading(false);
      purchaseLockRef.current = false;
    }
  };

  const downloadReceipt = async () => {
    if (!purchaseResult || !receiptCaptureRef.current) return;
    setDownloadBusy(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(receiptCaptureRef.current, {
        scale: 2,
        backgroundColor: "#f4f7fb",
        useCORS: true,
        logging: false,
      });
      const imageData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const maxWidth = pageWidth - margin * 2;
      const maxHeight = pageHeight - margin * 2;
      const ratio = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
      const renderWidth = canvas.width * ratio;
      const renderHeight = canvas.height * ratio;
      const x = (pageWidth - renderWidth) / 2;
      const y = margin;
      pdf.addImage(imageData, "PNG", x, y, renderWidth, renderHeight, undefined, "FAST");

      const safeReference = String(purchaseResult.reference || "data").replace(/[^a-zA-Z0-9_-]/g, "_");
      pdf.save(`axisvtu-data-receipt-${safeReference}.pdf`);
      showToast("Receipt downloaded successfully.", "success");
    } catch {
      showToast("Failed to download receipt. Please try again.", "error");
    } finally {
      setDownloadBusy(false);
    }
  };

  const shareText = () =>
    buildReceiptShareText({
      title: "Data Purchase Receipt",
      reference: purchaseResult?.reference,
      status: resultStatusLabel(purchaseResult?.status),
      amount: purchaseResult?.amount,
      fields: receiptFields(purchaseResult).slice(0, 8),
    });

  const shareReceipt = async () => {
    if (!purchaseResult || !receiptCaptureRef.current) return;
    const safeReference = String(purchaseResult.reference || "data").replace(/[^a-zA-Z0-9_-]/g, "_");
    const result = await shareReceiptCapture({
      sourceNode: receiptCaptureRef.current,
      title: "AxisVTU Data Receipt",
      text: shareText(),
      fileName: `axisvtu-data-receipt-${safeReference}.png`,
    });
    if (!result.ok) {
      showToast("Unable to share receipt.", "error");
      return;
    }
    showToast(
      result.mode === "native_file" ? "Receipt image shared." : "Receipt image prepared.",
      "success"
    );
  };

  const shareReceiptWhatsApp = async () => {
    if (!purchaseResult || !receiptCaptureRef.current) return;
    const safeReference = String(purchaseResult.reference || "data").replace(/[^a-zA-Z0-9_-]/g, "_");
    const result = await shareReceiptCaptureOnWhatsApp({
      sourceNode: receiptCaptureRef.current,
      title: "AxisVTU Data Receipt",
      text: shareText(),
      fileName: `axisvtu-data-receipt-${safeReference}.png`,
    });
    if (!result.ok) {
      showToast("Unable to open WhatsApp.", "error");
      return;
    }
    showToast(
      result.mode === "native_file" ? "Choose WhatsApp to send the receipt image." : "Receipt image downloaded and WhatsApp opened.",
      "success"
    );
  };

  const filtered = plans.filter((plan) => {
    const matchesNetwork = network === "all" ? true : (plan.network || "").toLowerCase() === network;
    const haystack = `${plan.plan_name} ${plan.data_size} ${plan.validity}`.toLowerCase();
    const matchesQuery = query ? haystack.includes(query.toLowerCase()) : true;
    return matchesNetwork && matchesQuery;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "price_low") return Number(a.price) - Number(b.price);
    if (sort === "price_high") return Number(b.price) - Number(a.price);
    if (sort === "data_high") {
      const aVal = parseSize(a.data_size) || 0;
      const bVal = parseSize(b.data_size) || 0;
      return bVal - aVal;
    }
    return 0;
  });

  const formatAmount = (value) => {
    const num = Number(value ?? 0);
    if (Number.isNaN(num)) return String(value ?? "0.00");
    return num.toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDateTime = (value) => {
    if (!value) return "—";
    try {
      return new Date(value).toLocaleString("en-NG", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return String(value);
    }
  };

  const resultStatusKey = (value) => String(value || "").toLowerCase();
  const resultStatusLabel = (value) => {
    const key = resultStatusKey(value);
    if (key === "success") return "Success";
    if (key === "pending") return "Pending";
    if (key === "failed") return "Failed";
    if (key === "refunded") return "Refunded";
    return String(value || "—");
  };

  const receiptFields = (result) => {
    if (!result) return [];
    return [
      { label: "Network", value: result.network ? String(result.network).toUpperCase() : "—" },
      { label: "Plan", value: result.plan?.plan_name || "—" },
      { label: "Plan Code", value: result.plan_code || "—" },
      { label: "Validity", value: result.validity || "—" },
      { label: "Recipient", value: result.recipient || "—" },
      { label: "Ported Number", value: result.ported ? "Yes" : "No" },
      { label: "Status", value: resultStatusLabel(result.status) },
      { label: "Reference", value: result.reference || "—" },
      { label: "Failure Reason", value: result.failure_reason || "—" },
    ];
  };

  return (
    <div className="page data-page">
      <section className="section">
        <Card className="data-recipient-card">
          <h3>Recipient</h3>
          <div className="form-grid">
            <label>
              Phone Number
              <input
                data-testid="data-phone-input"
                placeholder="08012345678"
                value={phone}
                onChange={(e) => {
                  const nextPhone = e.target.value;
                  setPhone(nextPhone);
                  saveRecipient({ phone: nextPhone, ported });
                }}
              />
            </label>
            <label>
              Network
              <select value={network} onChange={(e) => setNetwork(e.target.value)}>
                <option value="all">All Networks</option>
                <option value="mtn">MTN</option>
                <option value="glo">Glo</option>
                <option value="airtel">Airtel</option>
                <option value="9mobile">9mobile</option>
              </select>
            </label>
          </div>
          {fieldError && <div className="error">{fieldError}</div>}
        </Card>
      </section>

      <section className="section">
        <div className="section-head data-section-head">
          <h3>Data Plans</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="muted">{sorted.length} plans</div>
            <Button variant="ghost" type="button"
              onClick={() => loadPlans({ forceRefresh: true })}
              disabled={refreshingPlans}>
              {refreshingPlans ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>
        {(plansError || walletError) && (
          <div className="notice">
            {plansError || walletError}
          </div>
        )}
        <Card className="data-catalog-toolbar">
        <div className="tab-row">
          {[
            { id: "all", label: "All" },
            { id: "mtn", label: "MTN" },
            { id: "glo", label: "Glo" },
            { id: "airtel", label: "Airtel" },
            { id: "9mobile", label: "9mobile" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              className={`pill tab ${network === item.id ? "active" : ""}`}
              onClick={() => setNetwork(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        <div className="filter-bar">
          <input
            placeholder="Search plans (e.g. 1GB, 30d)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="recommended">Recommended</option>
            <option value="price_high">Price: High to Low</option>
            <option value="data_high">Data: High to Low</option>
          </select>
        </div>
        </Card>
        <div className="plan-grid">
          {loadingPlans && Array.from({ length: 6 }).map((_, idx) => (
            <Card className="plan-card skeleton" key={`s-${idx}`}>
              <div className="skeleton-line w-40" />
              <div className="skeleton-line w-60" />
              <div className="skeleton-line w-80" />
            </Card>
          ))}
          {!loadingPlans && sorted.length === 0 && (
            <Card className="empty">No plans found. Try another network or search term.</Card>
          )}
          {!loadingPlans && sorted.map((plan) => (
            <button
              type="button"
              className="card plan-card data-plan-card"
              data-testid={`data-plan-${String(plan.plan_code || "").replace(/[^a-zA-Z0-9_-]/g, "-")}`}
              key={plan.plan_code}
              onClick={() => setSelected(plan)}>
              <div className="plan-top">
                <span className={`badge ${networkClass(plan.network)}`}>
                  <span className={`logo ${networkClass(plan.network)}`} />
                  {plan.network?.toUpperCase()}
                </span>
                <span className="plan-cap">{plan.data_size}</span>
              </div>
              <div className="plan-name">{plan.plan_name}</div>
              <div className="plan-meta">
                <span>Validity {plan.validity}</span>
                <span className="price">₦ {plan.price}</span>
              </div>
              <div className="plan-foot">
                <span className="pill">Tap to buy</span>
              </div>
            </button>
          ))}
        </div>
        {message && <div className="notice">{message}</div>}
      </section>

      {selected && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-head">
              <div>
                <div className="label">Confirm Purchase</div>
                <h3>{selected.plan_name}</h3>
              </div>
              <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
            </div>
            <div className="modal-body">
              <div className="list-card">
                <div>
                  <div className="list-title">Recipient</div>
                  <div className="muted">{phone || "No number entered"}</div>
                </div>
                <div className="list-meta">
                  <div className="value">₦ {selected.price}</div>
                  <span className="pill">{selected.validity}</span>
                </div>
              </div>
              <div className="receipt-grid">
                <div>
                  <div className="label">Network</div>
                  <div>{selected.network?.toUpperCase()}</div>
                </div>
                <div>
                  <div className="label">Ported</div>
                  <div>{ported ? "Yes" : "No"}</div>
                </div>
                <div>
                  <div className="label">Wallet Balance</div>
                  <div>₦ {wallet?.balance || "0.00"}</div>
                </div>
                <div>
                  <div className="label">Plan Code</div>
                  <div>{selected.plan_code}</div>
                </div>
              </div>
              {wallet && Number(wallet.balance) < Number(selected.price) && (
                <div className="notice">
                  Insufficient balance. Please fund your wallet to continue.
                </div>
              )}
            </div>
            <div className="modal-actions">
              <Button variant="ghost" onClick={() => setSelected(null)}>Cancel</Button>
              <Button data-testid="data-confirm-buy"
                disabled={loading || (wallet && Number(wallet.balance) < Number(selected.price))}
                onClick={() => buy(selected.plan_code)}>
                {loading ? "Processing..." : "Confirm & Buy"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="purchase-loading-screen" role="status" aria-live="polite">
          <div className="purchase-loading-card">
            <div className="purchase-loading-ring">
              <span />
              <span />
              <span />
            </div>
            <div className="purchase-loading-title">Processing Data Purchase</div>
            <div className="purchase-loading-sub">Please wait while we contact the provider and verify response.</div>
            <div className="purchase-loading-marquee">
              <div className="purchase-loading-track">
                <span>Connecting</span>
                <span>Validating</span>
                <span>Submitting</span>
                <span>Confirming</span>
                <span>Connecting</span>
                <span>Validating</span>
                <span>Submitting</span>
                <span>Confirming</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {purchaseResult && (
        <div
          className="success-screen data-result-screen"
          role="dialog"
          aria-live="polite"
          aria-modal="true"
          data-testid="data-result-screen">
          <div className="data-result-shell">
            <div className="data-result-head">
              <Button variant="ghost" type="button" onClick={() => setPurchaseResult(null)}>
                Back
              </Button>
              <Button variant="ghost" type="button" data-testid="data-result-history" onClick={() => navigate("/transactions")}>
                History
              </Button>
            </div>

            <div
              className={`data-result-icon ${
                resultStatusKey(purchaseResult.status) === "success"
                  ? "success"
                  : resultStatusKey(purchaseResult.status) === "pending"
                    ? "pending"
                    : "failed"
              }`}>
              {resultStatusKey(purchaseResult.status) === "success" ? "✓" : resultStatusKey(purchaseResult.status) === "pending" ? "…" : "!"}
            </div>

            <h2 className="data-result-title" data-testid="data-result-title">
              {resultStatusKey(purchaseResult.status) === "success"
                ? "Purchase Successful"
                : resultStatusKey(purchaseResult.status) === "pending"
                  ? "Purchase Pending"
                  : "Purchase Failed"}
            </h2>

            <div className="data-result-receipt">
              <div className="data-result-receipt-top">
                <div className="data-result-receipt-name">Transfer Receipt</div>
                <span className={`pill ${resultStatusKey(purchaseResult.status)}`}>{resultStatusLabel(purchaseResult.status)}</span>
              </div>

              <div className="data-result-receipt-rows">
                <div className="data-result-row">
                  <span>Time</span>
                  <strong>{formatDateTime(purchaseResult.created_at)}</strong>
                </div>
                <div className="data-result-row">
                  <span>Sender Name</span>
                  <strong>{profile?.full_name || profile?.email || "AxisVTU User"}</strong>
                </div>
                <div className="data-result-row">
                  <span>Provider</span>
                  <strong>{inferProviderLabel(purchaseResult.provider, purchaseResult.network)}</strong>
                </div>
                <div className="data-result-row">
                  <span>Data Capacity</span>
                  <strong>{purchaseResult?.plan?.data_size || purchaseResult?.plan?.plan_name || "—"}</strong>
                </div>
                <div className="data-result-row">
                  <span>Network</span>
                  <strong>{purchaseResult.network ? String(purchaseResult.network).toUpperCase() : "—"}</strong>
                </div>
                <div className="data-result-row">
                  <span>Receiver Phone</span>
                  <strong>{purchaseResult.recipient || "—"}</strong>
                </div>
                <div className="data-result-row">
                  <span>Amount</span>
                  <strong>₦ {formatAmount(purchaseResult.amount)}</strong>
                </div>
                <div className="data-result-row">
                  <span>Reference</span>
                  <strong>{purchaseResult.reference || "—"}</strong>
                </div>
              </div>
            </div>

            {!!purchaseResult.failure_reason && (
              <div className="notice" style={{ marginTop: 12 }}>
                {purchaseResult.failure_reason}
              </div>
            )}
            {purchaseResult.test_mode && (
              <div className="notice" style={{ marginTop: 12 }}>
                Simulation mode is enabled. This purchase was not sent to live provider.
              </div>
            )}

            <div className="data-result-switches">
              <div className="data-result-switch-row">
                <div>
                  <div className="data-result-switch-title">Beneficiaries</div>
                  <div className="muted">Auto-save recipients for quick buy</div>
                </div>
                <button
                  type="button"
                  className={`toggle-switch ${resultPrefs.save_beneficiary ? "on" : ""}`}
                  onClick={() => updateResultPref("save_beneficiary", !resultPrefs.save_beneficiary)}
                  aria-label="Toggle beneficiaries auto save">
                  <span />
                </button>
              </div>
            </div>

            <div className="data-result-actions">
              <Button variant="ghost" onClick={downloadReceipt} disabled={downloadBusy}>
                {downloadBusy ? "Preparing..." : "Download Receipt"}
              </Button>
              <Button variant="ghost" onClick={shareReceipt}>Share</Button>
              <Button variant="ghost" onClick={shareReceiptWhatsApp}>WhatsApp</Button>
              <Button data-testid="data-result-dismiss" onClick={() => setPurchaseResult(null)}>Dismiss</Button>
            </div>
          </div>

          <div className="receipt-capture-layer" aria-hidden="true">
            <div className="receipt-sheet" ref={receiptCaptureRef}>
              <div className="receipt-sheet-header">
                <img src="/brand/axisvtu-logo.png" alt="AxisVTU" />
                <div>
                  <div className="label">AxisVTU Purchase Receipt</div>
                  <h4>Data Purchase</h4>
                </div>
                <span className={`pill ${resultStatusKey(purchaseResult.status)}`}>
                  {resultStatusLabel(purchaseResult.status)}
                </span>
              </div>

              <div className="receipt-sheet-total">
                <div className="label">Amount</div>
                <div className="value">₦ {formatAmount(purchaseResult.amount)}</div>
              </div>

              <div className="receipt-sheet-grid">
                <div>
                  <div className="label">Reference</div>
                  <div>{purchaseResult.reference || "—"}</div>
                </div>
                <div>
                  <div className="label">Date</div>
                  <div>{formatDateTime(purchaseResult.created_at)}</div>
                </div>
                {receiptFields(purchaseResult).map((item, idx) => (
                  <div key={`${item.label}-${idx}`}>
                    <div className="label">{item.label}</div>
                    <div>{item.value}</div>
                  </div>
                ))}
              </div>

              <div className="receipt-sheet-footer">
                <div>Generated by AxisVTU</div>
                <div>{new Date().toLocaleString("en-NG")}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
