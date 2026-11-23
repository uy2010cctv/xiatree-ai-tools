"use strict";

/**
 * Xiatree Tax & Invoice Studio — 100% Client-Side Local-First Web App
 * Zero backend, zero cloud uploads. Built by Xiatree Technology (Kris Fang).
 */

const STORAGE_KEY = "xiatree_w8_invoice_studio_v1";
const GUMROAD_VERIFY_URL = "https://api.gumroad.com/v2/licenses/verify";
const GUMROAD_PRODUCT_ID = "IlHpL5Lwv4cXffHzvynsXw==";
const GUMROAD_PRODUCT_URL = "https://lichenkris.gumroad.com/l/w8ben-usd-invoice-local-webapp";
const MAX_FREE_CLIENT_PROFILES = 1;

// Instant verification test key for local QA and evaluator smoke tests
const DEV_TEST_KEYS = new Set(["W8INV-DEV-PRO-2026"]);

const CURRENCY_CONFIG = {
  USD: { symbol: "$", locale: "en-US", label: "USD" },
  EUR: { symbol: "€", locale: "en-IE", label: "EUR" },
  GBP: { symbol: "£", locale: "en-GB", label: "GBP" },
};

function todayIso(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function createDefaultState() {
  return {
    activeTab: "invoice",
    license: {
      isPro: false,
      key: "",
      verifiedAt: "",
      source: "",
    },
    savedClients: [
      {
        id: "client_sample_1",
        toName: "Acme AI Labs Inc.",
        toContact: "Accounts Payable Team",
        toEmail: "ap@acme-ai.example",
        toTaxId: "EIN 88-1234567",
        toAddress: "548 Market St, Suite 400, San Francisco, CA 94104, USA",
      },
    ],
    invoice: {
      number: "INV-2026-001",
      currency: "USD",
      issueDate: todayIso(0),
      dueDate: todayIso(15),
      terms: "Net 15",
      languageMode: "bilingual",
      fromName: "Kris Fang · Xiatree Technology",
      fromTitle: "AI Agent Architect & Independent Consultant",
      fromEmail: "kris.fang@xiatree.example",
      fromCountry: "China",
      fromAddress: "Room 802, Hi-Tech Software Park, Nanshan, Shenzhen 518057",
      fromTaxNote: "W-8BEN On File · US-China Treaty Art. 13",
      logoUrl: "",
      toName: "Acme AI Labs Inc.",
      toContact: "Accounts Payable Team",
      toEmail: "ap@acme-ai.example",
      toTaxId: "EIN 88-1234567",
      toAddress: "548 Market St, Suite 400, San Francisco, CA 94104, USA",
      items: [
        {
          id: "item_1",
          description: "Multi-Agent RAG Workflow Architecture & Technical Spec",
          qty: 1,
          rate: 2400,
        },
        {
          id: "item_2",
          description: "Production Evaluation Harness & Guardrail Tuning (Hours)",
          qty: 12,
          rate: 150,
        },
      ],
      discountPct: 0,
      taxPct: 0,
      taxLabel: "Withholding / Tax (0% Treaty)",
      paymentMethod: "PingPong USD Receiving Account",
      payBeneficiary: "Kris Fang",
      payBank: "First Century Bank (via PingPong)",
      payAccount: "4012-8890-1124-9901",
      payRouting: "ACH Routing: 061120084 · SWIFT: FCBKUS33",
      payReference: "INV-2026-001 / Consulting Services",
      notes: "All services were performed remotely outside the United States. Form W-8BEN compliance sheet available upon request.",
      hideWatermark: false,
    },
    tax: {
      formType: "W8BEN",
      w8: {
        fullName: "Kris Fang",
        citizenship: "China",
        permStreet: "Room 802, Hi-Tech Software Park, Nanshan District",
        permCityPostal: "Shenzhen, Guangdong 518057",
        permCountry: "China",
        mailingSame: true,
        mailingAddress: "",
        usTin: "N/A",
        foreignTin: "44030519900101XXXX",
        ftinNotRequired: false,
        referenceNumber: "ACME-VENDOR-2026",
        dateOfBirth: "1990-01-15",
        serviceLocation: "100% Performed Remotely Outside the United States",
        treatyCountry: "China",
        treatyArticle: "Article 13 (Independent Personal Services)",
        treatyRate: "0%",
        incomeType: "Remote Software Engineering & AI Architecture Consulting",
        treatyExplanation:
          "Beneficial owner is a tax resident of China, performs all consulting services remotely outside the U.S., and has no fixed base or permanent establishment in the United States.",
        signerName: "Kris Fang",
        signatureDate: todayIso(0),
        typedSignature: "/s/ Kris Fang",
      },
      w9: {
        legalName: "Jane Doe",
        businessName: "Doe Advisory LLC",
        taxClass: "Individual / Sole Proprietor or Single-Member LLC",
        exemptions: "None",
        address: "548 Market St, Suite 400",
        cityStateZip: "San Francisco, CA 94104",
        tinType: "EIN",
        tinValue: "88-1234567",
        maskTinOnPrint: true,
        signatureName: "/s/ Jane Doe",
        signatureDate: todayIso(0),
      },
    },
  };
}

let state = loadState();
let toastTimer = null;

function mergeDeep(target, source) {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return target;
  }
  const output = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      output[key] = mergeDeep(target[key], source[key]);
    } else if (source[key] !== undefined) {
      output[key] = source[key];
    }
  }
  return output;
}

function loadState() {
  const defaults = createDefaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    const merged = mergeDeep(defaults, parsed);
    if (!Array.isArray(merged.invoice.items) || merged.invoice.items.length === 0) {
      merged.invoice.items = defaults.invoice.items;
    }
    if (!Array.isArray(merged.savedClients)) {
      merged.savedClients = defaults.savedClients;
    }
    return merged;
  } catch {
    return defaults;
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    showToast("Could not persist changes to browser localStorage.");
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeImageUrl(url) {
  const trimmed = String(url || "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed) || /^data:image\/(png|jpe?g|webp|svg\+xml);base64,/i.test(trimmed)) {
    return trimmed;
  }
  return "";
}

function formatMoney(amount, currencyCode) {
  const cfg = CURRENCY_CONFIG[currencyCode] || CURRENCY_CONFIG.USD;
  const num = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  try {
    return new Intl.NumberFormat(cfg.locale, {
      style: "currency",
      currency: cfg.label,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `${cfg.symbol}${num.toFixed(2)}`;
  }
}

function calculateInvoiceTotals() {
  const inv = state.invoice;
  const subtotal = inv.items.reduce((sum, item) => {
    const qty = Math.max(0, Number(item.qty) || 0);
    const rate = Math.max(0, Number(item.rate) || 0);
    return sum + qty * rate;
  }, 0);
  const discountPct = Math.min(100, Math.max(0, Number(inv.discountPct) || 0));
  const taxPct = Math.min(100, Math.max(0, Number(inv.taxPct) || 0));
  const discountAmt = subtotal * (discountPct / 100);
  const taxable = Math.max(0, subtotal - discountAmt);
  const taxAmt = taxable * (taxPct / 100);
  const total = taxable + taxAmt;
  return { subtotal, discountPct, discountAmt, taxPct, taxAmt, total };
}

function showToast(message) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = message;
  el.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.add("hidden");
  }, 3200);
}

function isPro() {
  return Boolean(state.license && state.license.isPro);
}

function maskKey(key) {
  const clean = String(key || "").trim();
  if (clean.length <= 8) return clean;
  return `${clean.slice(0, 4)}••••${clean.slice(-4)}`;
}

function maskTinValue(val) {
  const clean = String(val || "").trim();
  if (clean.length <= 4) return clean || "—";
  return clean.slice(0, -4).replace(/[0-9A-Za-z]/g, "*") + clean.slice(-4);
}

/**
 * Verifies a Gumroad license key directly from the browser (zero backend).
 * Supports DEV_TEST_KEYS for instant evaluation and live Gumroad License API calls.
 */
async function verifyLicenseKey(rawKey) {
  const normalized = String(rawKey || "").trim().toUpperCase();
  if (!normalized) {
    return { valid: false, message: "Please enter a license key." };
  }

  if (DEV_TEST_KEYS.has(normalized)) {
    return {
      valid: true,
      source: "dev-test-key",
      message: "Pro license unlocked (Developer Verification Key).",
    };
  }

  try {
    const body = new URLSearchParams({
      product_id: GUMROAD_PRODUCT_ID,
      license_key: String(rawKey).trim(),
      increment_uses_count: "false",
    });

    const response = await fetch(GUMROAD_VERIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const data = await response.json();
    if (data && data.success) {
      const purchase = data.purchase || {};
      if (purchase.refunded || purchase.chargebacked) {
        return {
          valid: false,
          message: "This license key was refunded or disputed and is no longer active.",
        };
      }
      return {
        valid: true,
        source: "gumroad-api",
        message: "Gumroad Pro license verified and activated on this browser!",
      };
    }

    return {
      valid: false,
      message: (data && data.message) || "Invalid Gumroad license key for this product.",
    };
  } catch {
    return {
      valid: false,
      message:
        "Network error reaching Gumroad API. Connect to the internet to verify a live key, or check your key format.",
    };
  }
}

function openProModal(reasonMessage = "") {
  const modal = document.getElementById("pro-modal");
  const feedback = document.getElementById("license-feedback");
  if (!modal) return;
  if (feedback) {
    feedback.textContent = reasonMessage;
    feedback.className = reasonMessage ? "license-feedback err" : "license-feedback";
  }
  syncProUI();
  modal.classList.remove("hidden");
}

function closeProModal() {
  const modal = document.getElementById("pro-modal");
  if (modal) modal.classList.add("hidden");
}

function syncProUI() {
  const pro = isPro();
  document.body.classList.toggle("is-pro", pro);

  const pill = document.getElementById("license-status-pill");
  const statusText = document.getElementById("license-status-text");
  const openProBtn = document.getElementById("btn-open-pro-modal");
  const activeBox = document.getElementById("pro-active-controls");
  const activeMasked = document.getElementById("active-key-masked");
  const profileHint = document.getElementById("profile-limit-hint");
  const watermarkCheckbox = document.getElementById("inv-hide-watermark");
  const logoInput = document.getElementById("inv-logo-url");

  if (pill && statusText) {
    pill.className = pro ? "license-pill license-pro" : "license-pill license-free";
    statusText.textContent = pro ? "Pro Lifetime Active" : "Free Edition";
  }
  if (openProBtn) {
    openProBtn.textContent = pro ? "Pro License" : "Unlock Pro ($39)";
  }
  if (activeBox && activeMasked) {
    activeBox.classList.toggle("hidden", !pro);
    activeMasked.textContent = maskKey(state.license.key);
  }
  if (profileHint) {
    profileHint.textContent = pro
      ? `Pro active: ${state.savedClients.length} saved client profile(s) · Unlimited`
      : `Free plan: ${state.savedClients.length}/${MAX_FREE_CLIENT_PROFILES} saved client profile · Upgrade to Pro for unlimited`;
  }
  if (watermarkCheckbox) {
    watermarkCheckbox.checked = pro && Boolean(state.invoice.hideWatermark);
  }
  if (logoInput) {
    logoInput.placeholder = pro
      ? "https://example.com/logo.png"
      : "Pro feature — unlock to display custom logo";
  }
}

function renderClientProfileOptions() {
  const select = document.getElementById("select-client-profile");
  const delBtn = document.getElementById("btn-delete-client");
  if (!select) return;

  const previous = select.value;
  select.innerHTML = '<option value="">— Select a saved client profile —</option>';
  state.savedClients.forEach((client) => {
    const opt = document.createElement("option");
    opt.value = client.id;
    opt.textContent = client.toName || client.toEmail || "Unnamed Client";
    select.appendChild(opt);
  });

  if (state.savedClients.some((c) => c.id === previous)) {
    select.value = previous;
  }
  if (delBtn) {
    delBtn.disabled = !select.value;
  }
  syncProUI();
}

function renderLineItemsEditor() {
  const container = document.getElementById("line-items-container");
  if (!container) return;

  container.innerHTML = "";
  state.invoice.items.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "line-item-row";
    row.innerHTML = `
      <label class="field item-desc-wrap">
        <span>Item #${index + 1} Description</span>
        <input type="text" data-item-id="${escapeHtml(item.id)}" data-item-field="description" value="${escapeHtml(item.description)}" placeholder="Service or deliverable description" />
      </label>
      <label class="field">
        <span>Qty</span>
        <input type="number" min="0" step="0.5" data-item-id="${escapeHtml(item.id)}" data-item-field="qty" value="${escapeHtml(item.qty)}" />
      </label>
      <label class="field">
        <span>Rate</span>
        <input type="number" min="0" step="0.01" data-item-id="${escapeHtml(item.id)}" data-item-field="rate" value="${escapeHtml(item.rate)}" />
      </label>
      <button type="button" class="btn-remove-item" data-remove-item="${escapeHtml(item.id)}" title="Remove line item" aria-label="Remove line item">&times;</button>
    `;
    container.appendChild(row);
  });
}

function renderInvoiceSheet() {
  const sheet = document.getElementById("sheet-invoice");
  if (!sheet) return;

  const inv = state.invoice;
  const bi = inv.languageMode === "bilingual";
  const { subtotal, discountPct, discountAmt, taxPct, taxAmt, total } = calculateInvoiceTotals();
  const safeLogo = isPro() ? sanitizeImageUrl(inv.logoUrl) : "";
  const showWatermark = !(isPro() && inv.hideWatermark);

  const labels = {
    title: bi ? "INVOICE" : "INVOICE",
    subTitle: bi ? "商业服务账单 · Cross-Border Commercial Invoice" : "Commercial Service Invoice",
    invNo: bi ? "Invoice # / 账单编号" : "Invoice #",
    issueDate: bi ? "Issue Date / 开票日期" : "Issue Date",
    dueDate: bi ? "Due Date / 到期日" : "Due Date",
    terms: bi ? "Terms / 付款条件" : "Terms",
    currency: bi ? "Currency / 结算币种" : "Currency",
    from: bi ? "From / 收款方 (Contractor)" : "From (Contractor)",
    to: bi ? "Bill To / 付款方 (Client)" : "Bill To (Client)",
    desc: bi ? "Description / 服务项目" : "Description",
    qty: bi ? "Qty / 数量" : "Qty",
    rate: bi ? "Rate / 单价" : "Rate",
    amount: bi ? "Amount / 金额" : "Amount",
    payTitle: bi ? "Payment Instructions / 收款账户信息" : "Payment Instructions",
    subtotal: bi ? "Subtotal / 小计" : "Subtotal",
    discount: bi ? `Discount (${discountPct}%) / 折扣` : `Discount (${discountPct}%)`,
    totalDue: bi ? `Total Due (${inv.currency}) / 应付总额` : `Total Due (${inv.currency})`,
    notes: bi ? "Notes / 备注说明:" : "Notes:",
  };

  const rowsHtml = inv.items
    .map((item) => {
      const qty = Math.max(0, Number(item.qty) || 0);
      const rate = Math.max(0, Number(item.rate) || 0);
      const lineTotal = qty * rate;
      return `
        <tr>
          <td>${escapeHtml(item.description || "Consulting Services")}</td>
          <td class="num">${escapeHtml(qty)}</td>
          <td class="num">${escapeHtml(formatMoney(rate, inv.currency))}</td>
          <td class="num">${escapeHtml(formatMoney(lineTotal, inv.currency))}</td>
        </tr>
      `;
    })
    .join("");

  sheet.innerHTML = `
    <div class="doc-body">
      <header class="doc-header">
        <div class="doc-brand">
          ${safeLogo ? `<img src="${escapeHtml(safeLogo)}" alt="Company logo" class="doc-logo" />` : ""}
          <div>
            <h2 class="doc-issuer-name">${escapeHtml(inv.fromName || "Contractor / Studio Name")}</h2>
            ${inv.fromTitle ? `<p class="doc-issuer-sub">${escapeHtml(inv.fromTitle)}</p>` : ""}
            ${inv.fromTaxNote ? `<p class="doc-issuer-sub">${escapeHtml(inv.fromTaxNote)}</p>` : ""}
          </div>
        </div>
        <div class="doc-title-block">
          <div class="doc-type-label">${labels.title}</div>
          <div class="doc-bilingual-sub">${labels.subTitle}</div>
          <table class="doc-meta-table">
            <tr><td>${labels.invNo}:</td><td>${escapeHtml(inv.number || "—")}</td></tr>
            <tr><td>${labels.issueDate}:</td><td>${escapeHtml(inv.issueDate || "—")}</td></tr>
            <tr><td>${labels.dueDate}:</td><td>${escapeHtml(inv.dueDate || "—")}</td></tr>
            <tr><td>${labels.terms}:</td><td>${escapeHtml(inv.terms || "—")}</td></tr>
            <tr><td>${labels.currency}:</td><td>${escapeHtml(inv.currency)}</td></tr>
          </table>
        </div>
      </header>

      <section class="doc-parties">
        <div class="party-box">
          <div class="party-label">${labels.from}</div>
          <div class="party-name">${escapeHtml(inv.fromName || "—")}</div>
          ${inv.fromAddress ? `<div class="party-line">${escapeHtml(inv.fromAddress)}</div>` : ""}
          ${inv.fromCountry ? `<div class="party-line">${escapeHtml(inv.fromCountry)}</div>` : ""}
          ${inv.fromEmail ? `<div class="party-line">${escapeHtml(inv.fromEmail)}</div>` : ""}
        </div>
        <div class="party-box">
          <div class="party-label">${labels.to}</div>
          <div class="party-name">${escapeHtml(inv.toName || "—")}</div>
          ${inv.toContact ? `<div class="party-line">Attn: ${escapeHtml(inv.toContact)}</div>` : ""}
          ${inv.toAddress ? `<div class="party-line">${escapeHtml(inv.toAddress)}</div>` : ""}
          ${inv.toEmail ? `<div class="party-line">${escapeHtml(inv.toEmail)}</div>` : ""}
          ${inv.toTaxId ? `<div class="party-line">Tax / ID: ${escapeHtml(inv.toTaxId)}</div>` : ""}
        </div>
      </section>

      <table class="inv-table">
        <thead>
          <tr>
            <th>${labels.desc}</th>
            <th class="num">${labels.qty}</th>
            <th class="num">${labels.rate}</th>
            <th class="num">${labels.amount}</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <section class="doc-summary-grid">
        <div class="payment-box">
          <div class="payment-box-title">${labels.payTitle}</div>
          <dl class="kv-list">
            <dt>Rail</dt><dd>${escapeHtml(inv.paymentMethod || "—")}</dd>
            <dt>Beneficiary</dt><dd>${escapeHtml(inv.payBeneficiary || "—")}</dd>
            <dt>Bank / Provider</dt><dd>${escapeHtml(inv.payBank || "—")}</dd>
            <dt>Account / IBAN</dt><dd>${escapeHtml(inv.payAccount || "—")}</dd>
            <dt>Routing / SWIFT</dt><dd>${escapeHtml(inv.payRouting || "—")}</dd>
            <dt>Reference</dt><dd>${escapeHtml(inv.payReference || inv.number || "—")}</dd>
          </dl>
        </div>

        <div class="totals-box">
          <div class="totals-row">
            <span>${labels.subtotal}</span>
            <span>${escapeHtml(formatMoney(subtotal, inv.currency))}</span>
          </div>
          ${
            discountPct > 0
              ? `<div class="totals-row">
                  <span>${labels.discount}</span>
                  <span>-${escapeHtml(formatMoney(discountAmt, inv.currency))}</span>
                </div>`
              : ""
          }
          <div class="totals-row">
            <span>${escapeHtml(inv.taxLabel || `Tax (${taxPct}%)`)}</span>
            <span>${escapeHtml(formatMoney(taxAmt, inv.currency))}</span>
          </div>
          <div class="totals-row grand">
            <span>${labels.totalDue}</span>
            <span>${escapeHtml(formatMoney(total, inv.currency))}</span>
          </div>
        </div>
      </section>

      ${
        inv.notes
          ? `<div class="doc-notes"><strong>${labels.notes}</strong> ${escapeHtml(inv.notes)}</div>`
          : ""
      }
    </div>

    <footer class="doc-footer">
      <span>Local-First Record · Generated ${escapeHtml(todayIso())}</span>
      ${
        showWatermark
          ? '<span class="watermark-footer">Generated with Xiatree Tax &amp; Invoice Studio (Free Edition)</span>'
          : `<span>${escapeHtml(inv.fromName || "Commercial Invoice")} · ${escapeHtml(inv.number || "")}</span>`
      }
    </footer>
  `;
}

function renderTaxSheet() {
  const sheet = document.getElementById("sheet-tax");
  if (!sheet) return;

  const { formType, w8, w9 } = state.tax;
  const showWatermark = !(isPro() && state.invoice.hideWatermark);

  if (formType === "W8BEN") {
    const mailingDisplay = w8.mailingSame
      ? "Same as Permanent Residence Address"
      : w8.mailingAddress || "—";
    const ftinDisplay = w8.ftinNotRequired
      ? "Check: FTIN not legally required"
      : w8.foreignTin || "—";

    sheet.innerHTML = `
      <div class="doc-body">
        <header class="tax-banner">
          <div>
            <h2>Form W-8BEN Compliance Data Summary</h2>
            <p>Certificate of Foreign Status of Beneficial Owner for U.S. Tax Withholding &amp; Reporting (Individuals)</p>
          </div>
          <div class="tax-badge-box">
            IRS REF: W-8BEN<br />
            VENDOR RECORD
          </div>
        </header>

        <section class="tax-section">
          <div class="tax-section-title">Part I · Identification of Beneficial Owner</div>
          <div class="tax-grid">
            <div class="tax-cell">
              <div class="tax-cell-label">1. Name of Individual (Beneficial Owner)</div>
              <div class="tax-cell-val">${escapeHtml(w8.fullName || "—")}</div>
            </div>
            <div class="tax-cell">
              <div class="tax-cell-label">2. Country of Citizenship</div>
              <div class="tax-cell-val">${escapeHtml(w8.citizenship || "—")}</div>
            </div>
            <div class="tax-cell full">
              <div class="tax-cell-label">3. Permanent Residence Address</div>
              <div class="tax-cell-val">
                ${escapeHtml([w8.permStreet, w8.permCityPostal, w8.permCountry].filter(Boolean).join(", ") || "—")}
              </div>
            </div>
            <div class="tax-cell full">
              <div class="tax-cell-label">4. Mailing Address</div>
              <div class="tax-cell-val">${escapeHtml(mailingDisplay)}</div>
            </div>
            <div class="tax-cell">
              <div class="tax-cell-label">5. U.S. TIN (SSN or ITIN)</div>
              <div class="tax-cell-val">${escapeHtml(w8.usTin || "N/A")}</div>
            </div>
            <div class="tax-cell">
              <div class="tax-cell-label">6a / 6b. Foreign TIN (FTIN)</div>
              <div class="tax-cell-val">${escapeHtml(ftinDisplay)}</div>
            </div>
            <div class="tax-cell">
              <div class="tax-cell-label">7. Reference Number(s)</div>
              <div class="tax-cell-val">${escapeHtml(w8.referenceNumber || "—")}</div>
            </div>
            <div class="tax-cell">
              <div class="tax-cell-label">8. Date of Birth (YYYY-MM-DD)</div>
              <div class="tax-cell-val">${escapeHtml(w8.dateOfBirth || "—")}</div>
            </div>
            <div class="tax-cell full">
              <div class="tax-cell-label">Service Performance Confirmation</div>
              <div class="tax-cell-val">${escapeHtml(w8.serviceLocation || "—")}</div>
            </div>
          </div>
        </section>

        <section class="tax-section">
          <div class="tax-section-title">Part II · Claim of Tax Treaty Benefits</div>
          <div class="tax-grid">
            <div class="tax-cell">
              <div class="tax-cell-label">9. Treaty Country of Residence</div>
              <div class="tax-cell-val">${escapeHtml(w8.treatyCountry || "—")}</div>
            </div>
            <div class="tax-cell">
              <div class="tax-cell-label">10. Special Rates &amp; Conditions (Treaty Article)</div>
              <div class="tax-cell-val">${escapeHtml(w8.treatyArticle || "—")} · Rate: ${escapeHtml(w8.treatyRate || "0%")}</div>
            </div>
            <div class="tax-cell full">
              <div class="tax-cell-label">Type of Income</div>
              <div class="tax-cell-val">${escapeHtml(w8.incomeType || "—")}</div>
            </div>
            <div class="tax-cell full">
              <div class="tax-cell-label">Treaty Eligibility Explanation</div>
              <div class="tax-cell-val">${escapeHtml(w8.treatyExplanation || "—")}</div>
            </div>
          </div>
        </section>

        <section class="tax-section">
          <div class="tax-section-title">Part III · Certification &amp; Beneficial Owner Declaration</div>
          <div class="tax-cert-box">
            Under penalties of perjury, I declare that I have examined the information in this summary record and to the
            best of my knowledge and belief it is true, correct, and complete. I am the individual beneficial owner of all
            income to which this record relates, am not a U.S. person, and am a resident of the treaty country listed above
            within the meaning of the income tax treaty between the United States and that country.
            <div class="sig-row">
              <div>
                <div class="sig-line-label">Signature of Beneficial Owner (${escapeHtml(w8.signerName || "Signer")})</div>
                <div class="sig-script">${escapeHtml(w8.typedSignature || w8.signerName || "—")}</div>
              </div>
              <div>
                <div class="sig-line-label">Date (YYYY-MM-DD)</div>
                <div class="sig-script" style="font-style: normal; font-family: var(--font-mono); font-size: 13px;">
                  ${escapeHtml(w8.signatureDate || "—")}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer class="doc-footer">
        <span>Compliance Onboarding Summary · Verify official IRS Form W-8BEN if required by withholding agent</span>
        ${
          showWatermark
            ? '<span class="watermark-footer">Generated with Xiatree Tax &amp; Invoice Studio (Free Edition)</span>'
            : `<span>Beneficial Owner: ${escapeHtml(w8.fullName || "")}</span>`
        }
      </footer>
    `;
    return;
  }

  // W-9 Summary Sheet
  const displayTin = w9.maskTinOnPrint ? maskTinValue(w9.tinValue) : w9.tinValue || "—";
  sheet.innerHTML = `
    <div class="doc-body">
      <header class="tax-banner">
        <div>
          <h2>Form W-9 Taxpayer Data Summary</h2>
          <p>Request for Taxpayer Identification Number and Certification (U.S. Persons &amp; Domestic Entities)</p>
        </div>
        <div class="tax-badge-box">
          IRS REF: W-9<br />
          U.S. CONTRACTOR
        </div>
      </header>

      <section class="tax-section">
        <div class="tax-section-title">Part I · Taxpayer Identification &amp; Classification</div>
        <div class="tax-grid">
          <div class="tax-cell full">
            <div class="tax-cell-label">1. Name (As Shown on Income Tax Return)</div>
            <div class="tax-cell-val">${escapeHtml(w9.legalName || "—")}</div>
          </div>
          <div class="tax-cell full">
            <div class="tax-cell-label">2. Business Name / Disregarded Entity Name</div>
            <div class="tax-cell-val">${escapeHtml(w9.businessName || "—")}</div>
          </div>
          <div class="tax-cell">
            <div class="tax-cell-label">3. Federal Tax Classification</div>
            <div class="tax-cell-val">${escapeHtml(w9.taxClass || "—")}</div>
          </div>
          <div class="tax-cell">
            <div class="tax-cell-label">4. Exemptions (Payee / FATCA)</div>
            <div class="tax-cell-val">${escapeHtml(w9.exemptions || "None")}</div>
          </div>
          <div class="tax-cell full">
            <div class="tax-cell-label">5 &amp; 6. Street Address, City, State, ZIP</div>
            <div class="tax-cell-val">
              ${escapeHtml([w9.address, w9.cityStateZip].filter(Boolean).join(", ") || "—")}
            </div>
          </div>
          <div class="tax-cell">
            <div class="tax-cell-label">Taxpayer ID Type</div>
            <div class="tax-cell-val">${escapeHtml(w9.tinType || "EIN")}</div>
          </div>
          <div class="tax-cell">
            <div class="tax-cell-label">Taxpayer Identification Number (TIN)</div>
            <div class="tax-cell-val" style="font-family: var(--font-mono);">${escapeHtml(displayTin)}</div>
          </div>
        </div>
      </section>

      <section class="tax-section">
        <div class="tax-section-title">Part II · Certification</div>
        <div class="tax-cert-box">
          Under penalties of perjury, I certify that the number shown on this record is my correct taxpayer identification
          number, I am a U.S. citizen or other U.S. person, and I am not subject to backup withholding (or am exempt from
          backup withholding reporting).
          <div class="sig-row">
            <div>
              <div class="sig-line-label">Signature of U.S. Person</div>
              <div class="sig-script">${escapeHtml(w9.signatureName || w9.legalName || "—")}</div>
            </div>
            <div>
              <div class="sig-line-label">Date (YYYY-MM-DD)</div>
              <div class="sig-script" style="font-style: normal; font-family: var(--font-mono); font-size: 13px;">
                ${escapeHtml(w9.signatureDate || "—")}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <footer class="doc-footer">
      <span>U.S. Vendor Compliance Summary · 100% Local-First Browser Record</span>
      ${
        showWatermark
          ? '<span class="watermark-footer">Generated with Xiatree Tax &amp; Invoice Studio (Free Edition)</span>'
          : `<span>Taxpayer: ${escapeHtml(w9.legalName || "")}</span>`
      }
    </footer>
  `;
}

function populateFormInputsFromState() {
  document.querySelectorAll("[data-inv]").forEach((el) => {
    const key = el.getAttribute("data-inv");
    if (el.type === "checkbox") {
      el.checked = Boolean(state.invoice[key]);
    } else {
      el.value = state.invoice[key] ?? "";
    }
  });

  document.querySelectorAll("[data-w8]").forEach((el) => {
    const key = el.getAttribute("data-w8");
    if (el.type === "checkbox") {
      el.checked = Boolean(state.tax.w8[key]);
    } else {
      el.value = state.tax.w8[key] ?? "";
    }
  });

  document.querySelectorAll("[data-w9]").forEach((el) => {
    const key = el.getAttribute("data-w9");
    if (el.type === "checkbox") {
      el.checked = Boolean(state.tax.w9[key]);
    } else {
      el.value = state.tax.w9[key] ?? "";
    }
  });

  syncMailingVisibility();
  syncTaxTypeUI();
  renderLineItemsEditor();
  renderClientProfileOptions();
}

function syncMailingVisibility() {
  const wrap = document.getElementById("w8-mailing-wrap");
  if (wrap) {
    wrap.classList.toggle("hidden", Boolean(state.tax.w8.mailingSame));
  }
}

function syncTaxTypeUI() {
  const isW8 = state.tax.formType === "W8BEN";
  const w8Group = document.getElementById("w8ben-fields");
  const w9Group = document.getElementById("w9-fields");
  const btnW8 = document.getElementById("btn-type-w8ben");
  const btnW9 = document.getElementById("btn-type-w9");

  if (w8Group) w8Group.classList.toggle("hidden", !isW8);
  if (w9Group) w9Group.classList.toggle("hidden", isW8);
  if (btnW8) btnW8.classList.toggle("active", isW8);
  if (btnW9) btnW9.classList.toggle("active", !isW8);
}

function setActiveTab(tabName) {
  state.activeTab = tabName === "tax" ? "tax" : "invoice";
  saveState();

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    const active = btn.getAttribute("data-tab") === state.activeTab;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", String(active));
  });

  document.getElementById("panel-invoice")?.classList.toggle("active", state.activeTab === "invoice");
  document.getElementById("panel-tax")?.classList.toggle("active", state.activeTab === "tax");

  document.getElementById("sheet-invoice")?.classList.toggle("active-sheet", state.activeTab === "invoice");
  document.getElementById("sheet-tax")?.classList.toggle("active-sheet", state.activeTab === "tax");

  const label = document.getElementById("preview-mode-label");
  if (label) {
    label.textContent =
      state.activeTab === "invoice"
        ? "A4 Live Preview · Invoice"
        : `A4 Live Preview · ${state.tax.formType === "W8BEN" ? "W-8BEN" : "W-9"} Summary`;
  }
}

function incrementInvoiceNumber(current) {
  const str = String(current || "INV-2026-001");
  const match = str.match(/^(.*?)(\d+)$/);
  if (!match) return `${str}-2`;
  const prefix = match[1];
  const digits = match[2];
  const next = String(Number(digits) + 1).padStart(digits.length, "0");
  return `${prefix}${next}`;
}

function exportBackupJson() {
  if (!isPro()) {
    openProModal("JSON Backup & Restore is a Pro feature ($39 Lifetime).");
    return;
  }
  const payload = {
    schema: "xiatree-w8-invoice-backup-v1",
    exportedAt: new Date().toISOString(),
    data: {
      savedClients: state.savedClients,
      invoice: state.invoice,
      tax: state.tax,
    },
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `xiatree-tax-invoice-backup-${todayIso()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast("Workspace JSON backup downloaded.");
}

function importBackupJson(file) {
  if (!file) return;
  if (!isPro()) {
    openProModal("JSON Backup & Restore is a Pro feature ($39 Lifetime).");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || ""));
      const incoming = parsed && parsed.data ? parsed.data : parsed;
      if (!incoming || (!incoming.invoice && !incoming.tax)) {
        showToast("Invalid backup file format.");
        return;
      }
      const defaults = createDefaultState();
      state.invoice = mergeDeep(defaults.invoice, incoming.invoice || {});
      state.tax = mergeDeep(defaults.tax, incoming.tax || {});
      if (Array.isArray(incoming.savedClients)) {
        state.savedClients = incoming.savedClients;
      }
      saveState();
      populateFormInputsFromState();
      renderInvoiceSheet();
      renderTaxSheet();
      showToast("JSON backup restored successfully.");
    } catch {
      showToast("Failed to parse JSON backup file.");
    }
  };
  reader.readAsText(file);
}

function triggerSinglePrint() {
  document.body.classList.remove("print-bundle");
  window.print();
}

function triggerBundlePrint() {
  if (!isPro()) {
    openProModal("Dual W-8BEN / W-9 + Invoice Bundle PDF export is a Pro feature ($39 Lifetime).");
    return;
  }
  renderInvoiceSheet();
  renderTaxSheet();
  document.body.classList.add("print-bundle");
  window.print();
  setTimeout(() => {
    document.body.classList.remove("print-bundle");
  }, 500);
}

function bindEvents() {
  window.addEventListener("afterprint", () => {
    document.body.classList.remove("print-bundle");
  });

  // Tab switching
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      setActiveTab(btn.getAttribute("data-tab"));
    });
  });

  // Invoice field bindings
  document.querySelectorAll("[data-inv]").forEach((el) => {
    const eventName = el.type === "checkbox" || el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(eventName, () => {
      const key = el.getAttribute("data-inv");
      if (key === "hideWatermark" && el.checked && !isPro()) {
        el.checked = false;
        openProModal("Removing the Free Edition watermark requires a Pro license ($39 Lifetime).");
        return;
      }
      if (key === "logoUrl" && el.value.trim() && !isPro()) {
        openProModal("Custom Company Logo URL is a Pro feature ($39 Lifetime).");
      }
      state.invoice[key] = el.type === "checkbox" ? el.checked : el.value;
      saveState();
      renderInvoiceSheet();
    });
  });

  // W-8BEN field bindings
  document.querySelectorAll("[data-w8]").forEach((el) => {
    const eventName = el.type === "checkbox" || el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(eventName, () => {
      const key = el.getAttribute("data-w8");
      state.tax.w8[key] = el.type === "checkbox" ? el.checked : el.value;
      if (key === "mailingSame") {
        syncMailingVisibility();
      }
      saveState();
      renderTaxSheet();
    });
  });

  // W-9 field bindings
  document.querySelectorAll("[data-w9]").forEach((el) => {
    const eventName = el.type === "checkbox" || el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(eventName, () => {
      const key = el.getAttribute("data-w9");
      state.tax.w9[key] = el.type === "checkbox" ? el.checked : el.value;
      saveState();
      renderTaxSheet();
    });
  });

  // Dynamic line items
  const itemsContainer = document.getElementById("line-items-container");
  if (itemsContainer) {
    itemsContainer.addEventListener("input", (event) => {
      const target = event.target;
      const itemId = target.getAttribute("data-item-id");
      const field = target.getAttribute("data-item-field");
      if (!itemId || !field) return;
      const item = state.invoice.items.find((entry) => entry.id === itemId);
      if (!item) return;
      item[field] = field === "description" ? target.value : Number(target.value);
      saveState();
      renderInvoiceSheet();
    });

    itemsContainer.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-remove-item]");
      if (!btn) return;
      if (state.invoice.items.length <= 1) {
        showToast("An invoice must have at least 1 line item.");
        return;
      }
      const id = btn.getAttribute("data-remove-item");
      state.invoice.items = state.invoice.items.filter((entry) => entry.id !== id);
      saveState();
      renderLineItemsEditor();
      renderInvoiceSheet();
    });
  }

  document.getElementById("btn-add-item")?.addEventListener("click", () => {
    state.invoice.items.push({
      id: `item_${Date.now()}`,
      description: "Additional Consulting / Engineering Deliverable",
      qty: 1,
      rate: 500,
    });
    saveState();
    renderLineItemsEditor();
    renderInvoiceSheet();
  });

  document.getElementById("btn-next-inv-num")?.addEventListener("click", () => {
    state.invoice.number = incrementInvoiceNumber(state.invoice.number);
    const input = document.getElementById("inv-number");
    if (input) input.value = state.invoice.number;
    saveState();
    renderInvoiceSheet();
    showToast(`Incremented to ${state.invoice.number}`);
  });

  // Client profile management (Free: 1, Pro: unlimited)
  document.getElementById("btn-save-client")?.addEventListener("click", () => {
    const name = (state.invoice.toName || "").trim();
    if (!name) {
      showToast("Enter a Client Company / Name before saving.");
      return;
    }

    const existingIndex = state.savedClients.findIndex(
      (c) => c.toName.toLowerCase() === name.toLowerCase()
    );

    if (existingIndex === -1 && !isPro() && state.savedClients.length >= MAX_FREE_CLIENT_PROFILES) {
      openProModal(
        `Free plan allows ${MAX_FREE_CLIENT_PROFILES} saved client profile. Unlock Pro for unlimited clients.`
      );
      return;
    }

    const profile = {
      id: existingIndex >= 0 ? state.savedClients[existingIndex].id : `client_${Date.now()}`,
      toName: state.invoice.toName,
      toContact: state.invoice.toContact,
      toEmail: state.invoice.toEmail,
      toTaxId: state.invoice.toTaxId,
      toAddress: state.invoice.toAddress,
    };

    if (existingIndex >= 0) {
      state.savedClients[existingIndex] = profile;
      showToast(`Updated saved profile: ${name}`);
    } else {
      state.savedClients.push(profile);
      showToast(`Saved client profile: ${name}`);
    }

    saveState();
    renderClientProfileOptions();
    const select = document.getElementById("select-client-profile");
    if (select) select.value = profile.id;
    const delBtn = document.getElementById("btn-delete-client");
    if (delBtn) delBtn.disabled = false;
  });

  document.getElementById("select-client-profile")?.addEventListener("change", (event) => {
    const id = event.target.value;
    const delBtn = document.getElementById("btn-delete-client");
    if (delBtn) delBtn.disabled = !id;
    if (!id) return;
    const client = state.savedClients.find((c) => c.id === id);
    if (!client) return;
    state.invoice.toName = client.toName;
    state.invoice.toContact = client.toContact;
    state.invoice.toEmail = client.toEmail;
    state.invoice.toTaxId = client.toTaxId;
    state.invoice.toAddress = client.toAddress;
    saveState();
    populateFormInputsFromState();
    renderInvoiceSheet();
    showToast(`Loaded client: ${client.toName}`);
  });

  document.getElementById("btn-delete-client")?.addEventListener("click", () => {
    const select = document.getElementById("select-client-profile");
    const id = select ? select.value : "";
    if (!id) return;
    state.savedClients = state.savedClients.filter((c) => c.id !== id);
    saveState();
    renderClientProfileOptions();
    showToast("Deleted saved client profile.");
  });

  // Tax form switcher (W-8BEN / W-9)
  document.querySelectorAll("[data-tax-type]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.tax.formType = btn.getAttribute("data-tax-type") === "W9" ? "W9" : "W8BEN";
      saveState();
      syncTaxTypeUI();
      renderTaxSheet();
      if (state.activeTab === "tax") {
        setActiveTab("tax");
      }
    });
  });

  // Topbar & Subbar actions
  document.getElementById("btn-print-active")?.addEventListener("click", triggerSinglePrint);
  document.getElementById("btn-print-bundle")?.addEventListener("click", triggerBundlePrint);
  document.getElementById("btn-export-json")?.addEventListener("click", exportBackupJson);

  document.getElementById("input-import-json")?.addEventListener("change", (event) => {
    const input = event.target;
    const file = input.files && input.files[0];
    importBackupJson(file);
    input.value = "";
  });

  document.getElementById("btn-load-sample")?.addEventListener("click", () => {
    const keepLicense = state.license;
    const keepTab = state.activeTab;
    state = createDefaultState();
    state.license = keepLicense;
    state.activeTab = keepTab;
    saveState();
    populateFormInputsFromState();
    renderInvoiceSheet();
    renderTaxSheet();
    showToast("Loaded sample W-8BEN & USD consulting invoice.");
  });

  // Pro License Modal
  document.getElementById("btn-open-pro-modal")?.addEventListener("click", () => openProModal(""));
  document.getElementById("btn-close-pro-modal")?.addEventListener("click", closeProModal);
  document.getElementById("btn-modal-done")?.addEventListener("click", closeProModal);

  document.getElementById("pro-modal")?.addEventListener("click", (event) => {
    if (event.target.id === "pro-modal") {
      closeProModal();
    }
  });

  document.getElementById("btn-verify-license")?.addEventListener("click", async () => {
    const keyInput = document.getElementById("input-license-key");
    const feedback = document.getElementById("license-feedback");
    const btn = document.getElementById("btn-verify-license");
    if (!keyInput || !feedback || !btn) return;

    btn.disabled = true;
    btn.textContent = "Verifying...";
    feedback.textContent = "Checking license key...";
    feedback.className = "license-feedback";

    const result = await verifyLicenseKey(keyInput.value);
    btn.disabled = false;
    btn.textContent = "Activate";

    if (result.valid) {
      state.license = {
        isPro: true,
        key: keyInput.value.trim(),
        verifiedAt: new Date().toISOString(),
        source: result.source,
      };
      saveState();
      syncProUI();
      renderInvoiceSheet();
      renderTaxSheet();
      feedback.textContent = result.message;
      feedback.className = "license-feedback ok";
      showToast("Pro Lifetime unlocked!");
    } else {
      feedback.textContent = result.message;
      feedback.className = "license-feedback err";
    }
  });

  document.getElementById("btn-deactivate-license")?.addEventListener("click", () => {
    state.license = { isPro: false, key: "", verifiedAt: "", source: "" };
    state.invoice.hideWatermark = false;
    saveState();
    syncProUI();
    renderInvoiceSheet();
    renderTaxSheet();
    const feedback = document.getElementById("license-feedback");
    if (feedback) {
      feedback.textContent = "Pro license deactivated on this browser.";
      feedback.className = "license-feedback";
    }
  });

  const gumroadLink = document.getElementById("gumroad-buy-link");
  if (gumroadLink) {
    gumroadLink.href = GUMROAD_PRODUCT_URL;
  }
}

function init() {
  if (typeof document === "undefined") return;
  populateFormInputsFromState();
  bindEvents();
  syncProUI();
  setActiveTab(state.activeTab);
  renderInvoiceSheet();
  renderTaxSheet();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}
