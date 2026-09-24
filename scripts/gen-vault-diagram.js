import sharp from "sharp";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const isDark = false; // blog theme is light by default

const colors = {
  bg: "#ffffff",
  surface: "#ffffff",
  surfaceBorder: "#d6dee9",
  surfaceSoft: "#f4f7fb",
  text: "#0b1726",
  muted: "#5b6b82",
  accent: "#2563eb",
  accent2: "#7c3aed",
  github: "#24292f",
  githubPanel: "#f6f8fa",
  vault: "#ffc439",
  vaultPanel: "#fff7e0",
  aws: "#ff9900",
  awsPanel: "#fff4e0",
  arrow: "#334155",
  trustLine: "#9aa6b8",
};

const W = 1400;
const H = 820;

// ---------- helpers ----------

function svgElem(open, close) {
  return `${open}${close}`;
}

function panel(x, y, w, h, fill, stroke, radius = 18, shadow = true) {
  const shadowDef =
    shadow &&
    `<defs>
        <filter id="panelShadow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#0b1726" flood-opacity="0.08"/>
        </filter>
      </defs>`;
  const shadowAttr = shadow ? ` filter="url(#panelShadow)"` : "";
  return `
    ${shadowDef}
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" ry="${radius}"
          fill="${fill}" stroke="${stroke}" stroke-width="1.5"${shadowAttr}/>`;
}

function label(x, y, text, size = 22, weight = 600, color = colors.text, align = "middle") {
  return `<text x="${x}" y="${y}" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${align}">${text}</text>`;
}

function sublabel(x, y, text, size = 16, color = colors.muted) {
  return `<text x="${x}" y="${y}" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        font-size="${size}" font-weight="500" fill="${color}" text-anchor="middle">${text}</text>`;
}

function nodeBox(cx, cy, w, h, title, subtitle, panelFill, panelStroke, titleColor, accentLeft = false) {
  const x = cx - w / 2;
  const y = cy - h / 2;

  let leftAccent = "";
  if (accentLeft) {
    leftAccent = `<rect x="${x}" y="${y + 14}" width="6" height="${h - 28}" rx="3" fill="${colors.accent2}"/>`;
  }

  return `
      ${panel(x, y, w, h, panelFill, panelStroke)}
      ${leftAccent}
      ${label(cx, cy - 6, title, 25, 700, titleColor)}
      ${sublabel(cx, cy + 26, subtitle, 16)}`;
}

function arrow(x1, y1, x2, y2, labelText, dashed = false, labelOffset = 0) {
  const dash = dashed ? ' stroke-dasharray="8 8"' : "";
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  return `
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${colors.arrow}" stroke-width="2.4"
            stroke-linecap="round" marker-end="url(#arrowhead)"${dash}/>
      <text x="${midX}" y="${midY + 30 + labelOffset}" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
            font-size="15" font-weight="600" fill="${colors.muted}" text-anchor="middle">${labelText}</text>`;
}

function arrowRight(x1, y1, x2, y2, labelText, dashed = false) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const sx = x1 + ux * 26;
  const sy = y1 + uy * 26;
  const ex = x2 - ux * 26;
  const ey = y2 - uy * 26;
  const dash = dashed ? ' stroke-dasharray="8 8"' : "";
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2 + 30;
  return `
      <line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" stroke="${colors.arrow}" stroke-width="2.4"
            stroke-linecap="round" marker-end="url(#arrowhead)"${dash}/>
      <text x="${midX}" y="${midY}" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
            font-size="15" font-weight="600" fill="${colors.muted}" text-anchor="middle">${labelText}</text>`;
}

function bigArrow(x1, y1, x2, y2, labelText) {
  const dash = "";
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2 + 34;
  return `
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${colors.accent}" stroke-width="3.2"
            stroke-linecap="round" marker-end="url(#arrowheadAccent)"/>
      <text x="${midX}" y="${midY}" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
            font-size="18" font-weight="700" fill="${colors.accent}" text-anchor="middle">${labelText}</text>`;
}

// ---------- header / footer ----------

function pageMeta() {
  return `
    <defs>
      <marker id="arrowhead" viewBox="0 0 10 10" refX="9" refY="5"
              markerWidth="9" markerHeight="9" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="${colors.arrow}"/>
      </marker>
      <marker id="arrowheadAccent" viewBox="0 0 10 10" refX="9" refY="5"
              markerWidth="10" markerHeight="10" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="${colors.accent}"/>
      </marker>

      <linearGradient id="headerGrad" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0%" stop-color="#2563eb"/>
        <stop offset="100%" stop-color="#7c3aed"/>
      </linearGradient>

      <linearGradient id="bgGrid" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#f4f7fb" stop-opacity="0.55"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </linearGradient>

      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#dbe3ee" stroke-width="1"/>
      </pattern>
    </defs>

    <rect x="0" y="0" width="${W}" height="${H}" fill="${colors.bg}"/>
    <rect x="0" y="0" width="${W}" height="${H}" fill="url(#bgGrid)"/>
    <rect x="0" y="0" width="${W}" height="60" fill="url(#headerGrad)"/>
    <rect x="0" y="58" width="${W}" height="4" fill="#ffffff" opacity="0.9"/>

    <text x="60" y="36" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
          font-size="20" font-weight="700" fill="#ffffff">GitHub Actions + HashiCorp Vault + AWS STS</text>
    <text x="62" y="56" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
          font-size="13" font-weight="500" fill="#ffffff" opacity="0.85">Short-lived AWS credentials for CI/CD, no long-lived access keys</text>

    <text x="${W - 60}" y="36" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
          font-size="14" font-weight="600" fill="#ffffff" text-anchor="end" opacity="0.85">Architecture Diagram</text>
`;
}

// ---------- TITLE BLOCK for standalone poster style ----------

function titleBlock() {
  return `
    <rect x="60" y="60" width="${W - 120}" height="96" rx="18" fill="${colors.surfaceSoft}" stroke="${colors.surfaceBorder}"/>
    <text x="100" y="106" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
          font-size="34" font-weight="800" fill="${colors.text}">GitHub Actions → OIDC → Vault → AWS STS</text>
    <text x="100" y="138" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
          font-size="18" font-weight="500" fill="${colors.muted}">Short-lived AWS credentials issued per workflow run</text>
`;
}

// ---------- Component layout ----------

function layout(compass) {
  // Vertical main flow
  const centerX = 700;
  const ghY = 250;
  const oidcY = 392;
  const vaultY = 534;
  const awsY = 676;

  const nodeW = 360;
  const nodeH = 120;

  const ghX = centerX;
  const oidcX = centerX;
  const vaultX = centerX;
  const awsX = centerX;

  // Vault wider, with two subpanels
  const vaultW = 540;
  const vaultH = 130;
  const vaultInnerY = vaultY - vaultH / 2;
  const vaultLeft = vaultX - vaultW / 2;
  const vaultRight = vaultX + vaultW / 2;
  const dividerX = vaultX;

  // AWS panel
  const awsW = 520;
  const awsH = 130;

  return {
    ghX,
    ghY,
    oidcX,
    oidcY,
    vaultX,
    vaultY,
    vaultW,
    vaultH,
    vaultLeft,
    vaultRight,
    dividerX,
    vaultInnerY,
    awsX,
    awsY,
    awsW,
    awsH,
  };
}

// ---------- Diagram 1: clean reference architecture (compact) ----------

function diagram1() {
  const L = layout();    const { ghX, ghY, oidcX, oidcY, vaultX, vaultY, vaultW, vaultH, vaultLeft, vaultRight, dividerX, awsX, awsY, awsW, awsH } =
    L;

  let body = "";

  // Trust boundary around vault
  body +=
    `<rect x="${vaultLeft - 40}" y="${vaultY - vaultH/2 - 30}" width="${vaultW + 80}" height="${vaultH + 60}" rx="26" fill="none" stroke="${colors.trustLine}" stroke-width="1.5" stroke-dasharray="10 8" opacity="0.85"/>`;
  body +=
    `<text x="${vaultLeft - 26}" y="${vaultY - vaultH/2 - 10}" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="15" font-weight="600" fill="${colors.muted}">Trust boundary: Vault control plane</text>`;

  // GitHub Actions panel
  body += nodeBox(
    ghX,
    ghY,
    430,
    110,
    "GitHub Actions Workflow",
    "Workflow run · Repository · Branch · Environment",
    colors.githubPanel,
    colors.surfaceBorder,
    colors.github,
    true
  );

  // OIDC token panel (flow element, not a system boundary)
  body +=
    `<rect x="${oidcX - 200}" y="${oidcY - 58}" width="400" height="96" rx="22" fill="${colors.surfaceSoft}" stroke="${colors.accent}" stroke-width="1.5"/>`;
  body +=
    `<text x="${oidcX}" y="${oidcY - 8}" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="26" font-weight="800" fill="${colors.accent}">OIDC Token</text>`;
  body += sublabel(oidcX, oidcY + 20, "GitHub → signed JWT · repo, ref, environment, job");

  // Vault outer panel
  body += panel(vaultLeft, vaultY - vaultH/2, vaultW, vaultH, colors.vaultPanel, colors.surfaceBorder);

  // Vault divider
  body +=
    `<rect x="${dividerX - 1}" y="${vaultY - vaultH/2 + 14}" width="2" height="${vaultH - 28}" fill="${colors.surfaceBorder}"/>`;

  // Vault left: auth
  body += nodeBox(
    vaultX - 115,
    vaultY,
    220,
    92,
    "Vault",
    "JWT/OIDC Auth Method",
    "transparent",
    "transparent",
    colors.text,
    false
  );
  body += label(vaultX - 115, vaultY - 28, "Authenticates", 15, 600, colors.muted, "middle");
  body += label(vaultX - 115, vaultY + 48, "workflow identity", 15, 600, colors.muted, "middle");

  // Vault right: AWS secrets engine
  body += nodeBox(
    vaultX + 115,
    vaultY,
    220,
    92,
    "Vault",
    "AWS Secrets Engine",
    "transparent",
    "transparent",
    colors.text,
    false
  );
  body += label(vaultX + 115, vaultY - 28, "Issues temporary", 15, 600, colors.muted, "middle");
  body += label(vaultX + 115, vaultY + 48, "AWS credentials", 15, 600, colors.muted, "middle");

  // AWS panel
  body += nodeBox(
    awsX,
    awsY,
    awsW,
    awsH,
    "AWS Account",
    "IAM role · STS temporary credentials · Least-privilege access",
    colors.awsPanel,
    colors.surfaceBorder,
    colors.aws,
    true
  );

  body +=
    `<text x="${awsX}" y="${awsY + 64}" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="15" font-weight="600" fill="${colors.muted}">Access Key ID  ·  Secret Access Key  ·  Session Token</text>`;

  // arrows
  body += arrowRight(ghX + 215, ghY, oidcX - 200, oidcY, "1. Workflow starts");
  body += arrowRight(oidcX + 200, oidcY, vaultX - vaultW/2 + 10, vaultY - 20, "2. Auth with OIDC token");
  body += arrowRight(vaultX - 10, vaultY + vaultH/2 - 20, awsX - awsW/2 + 10, awsY - 20, "3. Temporary AWS credentials");
  body +=
    arrowRight(awsX + awsW/2 - 10, awsY, awsX + awsW/2 + 120, awsY, "4. Access AWS resources", false);

  // bottom note
  body +=
    `<rect x="60" y="${awsY + 110}" width="${W - 120}" height="56" rx="16" fill="${colors.surfaceSoft}" stroke="${colors.surfaceBorder}"/>`;
  body +=
    `<text x="100" y="${awsY + 140}" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="16" font-weight="600" fill="${colors.text}">Key controls</text>`;
  body +=
    `<text x="100" y="${awsY + 166}" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="15" fill="${colors.muted}">Authentication: Vault · Authorization: AWS IAM · Credentials: short-lived · Access: least privilege</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      ${pageMeta()}
      ${body}
    </svg>`;
}

// ---------- Diagram 2: polished flow + policy (horizontal lanes) ----------

function diagram2() {
  const L = layout();    const { ghX, ghY, oidcX, oidcY, vaultX, vaultY, vaultW, vaultH, vaultLeft, vaultRight, dividerX, awsX, awsY, awsW, awsH } =
    L;

  let body = "";

  // Lanes / stage headers
  const laneY = [ghY - 70, oidcY - 70, vaultY - 70, awsY - 70];
  const laneLabels = ["GitHub Actions", "OIDC Token", "HashiCorp Vault", "AWS"];
  const laneAccents = [colors.github, colors.accent, colors.vault, colors.aws];

  laneLabels.forEach((label, i) => {
    const y = laneY[i];
    body += `<rect x="60" y="${y}" width="150" height="40" rx="20" fill="${laneAccents[i]}" opacity="0.12" stroke="${laneAccents[i]}" stroke-width="1.2"/>`;
    body +=
      `<text x="135" y="${y + 26}" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="17" font-weight="700" fill="${laneAccents[i]}" text-anchor="middle">${label}</text>`;
  });

  // GitHub Actions panel
  body += nodeBox(
    ghX,
    ghY,
    430,
    110,
    "GitHub Actions Workflow",
    "OIDC-enabled workflow run",
    colors.githubPanel,
    colors.surfaceBorder,
    colors.github,
    true
  );

  // OIDC token panel
  body +=
    `<rect x="${oidcX - 210}" y="${oidcY - 60}" width="420" height="100" rx="22" fill="${colors.surfaceSoft}" stroke="${colors.accent}" stroke-width="1.5"/>`;
  body +=
    `<text x="${oidcX}" y="${oidcY - 8}" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="26" font-weight="800" fill="${colors.accent}">OIDC Token</text>`;
  body +=
    `<text x="${oidcX}" y="${oidcY + 22}" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="15" font-weight="500" fill="${colors.muted}" text-anchor="middle">Signed JWT from GitHub</text>`;
  body +=
    `<text x="${oidcX}" y="${oidcY + 48}" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="14" font-weight="500" fill="${colors.muted}" text-anchor="middle">repo  ·  ref  ·  environment  ·  job</text>`;

  // Vault outer panel + trust boundary
  body +=
    `<rect x="${vaultLeft - 50}" y="${vaultY - vaultH/2 - 36}" width="${vaultW + 100}" height="${vaultH + 72}" rx="28" fill="none" stroke="${colors.trustLine}" stroke-width="1.5" stroke-dasharray="10 8" opacity="0.85"/>`;
  body +=
    `<text x="${vaultLeft - 36}" y="${vaultY - vaultH/2 - 14}" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="15" font-weight="600" fill="${colors.muted}">Trust boundary</text>`;

  body += panel(vaultLeft, vaultY - vaultH/2, vaultW, vaultH, colors.vaultPanel, colors.surfaceBorder);

  // Vault divider
  body +=
    `<rect x="${dividerX - 1}" y="${vaultY - vaultH/2 + 14}" width="2" height="${vaultH - 28}" fill="${colors.surfaceBorder}"/>`;

  // Vault left: auth
  body += nodeBox(
    vaultX - 115,
    vaultY,
    220,
    92,
    "Vault",
    "JWT / OIDC Auth",
    "transparent",
    "transparent",
    colors.text
  );
  body +=
    `<text x="${vaultX - 115}" y="${vaultY - 28}" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="14" font-weight="600" fill="${colors.muted}" text-anchor="middle">Verifies workflow identity</text>`;
  body +=
    `<text x="${vaultX - 115}" y="${vaultY + 12}" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="14" font-weight="600" fill="${colors.muted}" text-anchor="middle">Applies auth policy</text>`;
  body +=
    `<text x="${vaultX - 115}" y="${vaultY + 44}" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="14" font-weight="600" fill="${colors.muted}" text-anchor="middle">repo · branch · environment</text>`;

  // Vault right: AWS secrets engine
  body += nodeBox(
    vaultX + 115,
    vaultY,
    220,
    92,
    "Vault",
    "AWS Secrets Engine",
    "transparent",
    "transparent",
    colors.text
  );
  body +=
    `<text x="${vaultX + 115}" y="${vaultY - 28}" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="14" font-weight="600" fill="${colors.muted}" text-anchor="middle">Federates to AWS</text>`;
  body +=
    `<text x="${vaultX + 115}" y="${vaultY + 12}" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="14" font-weight="600" fill="${colors.muted}" text-anchor="middle">STS temporary credentials</text>`;
  body +=
    `<text x="${vaultX + 115}" y="${vaultY + 44}" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="14" font-weight="600" fill="${colors.muted}" text-anchor="middle">Access Key · Secret · Session Token</text>`;

  // AWS panel
  body += nodeBox(
    awsX,
    awsY,
    awsW,
    awsH,
    "AWS Account",
    "IAM role with least-privilege permissions",
    colors.awsPanel,
    colors.surfaceBorder,
    colors.aws,
    true
  );

  // small permission chips
  const chips = ["Deploy app", "Push to ECR", "Update ECS", "Manage S3"];
  const chipW = 110;
  const chipH = 32;
  const totalChipW = chips.length * chipW - 18;
  let cx = awsX - totalChipW / 2;
  chips.forEach((c) => {
    body +=
      `<rect x="${cx}" y="${awsY + 74}" width="${chipW}" height="${chipH}" rx="16" fill="${colors.surface}" stroke="${colors.surfaceBorder}"/>`;
    body +=
      `<text x="${cx + chipW/2}" y="${awsY + 95}" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="14" font-weight="600" fill="${colors.text}" text-anchor="middle">${c}</text>`;
    cx += chipW;
  });

  // arrows
  body += arrowRight(ghX + 215, ghY, oidcX - 210, oidcY, "1. Workflow starts");
  body += arrowRight(oidcX + 210, oidcY, vaultLeft + 10, vaultY - 18, "2. Auth request + OIDC token");
  body += arrowRight(vaultRight - 10, vaultY - 18, awsX - awsW/2 + 10, awsY - 20, "3. Temporary AWS credentials");
  body +=
    arrowRight(awsX + awsW/2 - 10, awsY, awsX + awsW/2 + 140, awsY, "4. Access AWS resources", false);

  // bottom note blocks
  const noteY = awsY + 110;
  const noteW = (W - 120 - 30) / 2;
  body +=
    `<rect x="60" y="${noteY}" width="${noteW}" height="58" rx="16" fill="${colors.surfaceSoft}" stroke="${colors.surfaceBorder}"/>`;
  body +=
    `<text x="92" y="${noteY + 30}" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="16" font-weight="700" fill="${colors.text}">Authentication</text>`;
  body +=
    `<text x="92" y="${noteY + 54}" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="15" fill="${colors.muted}">Vault decides who can obtain credentials</text>`;

  body +=
    `<rect x="${60 + noteW + 30}" y="${noteY}" width="${noteW}" height="58" rx="16" fill="${colors.surfaceSoft}" stroke="${colors.surfaceBorder}"/>`;
  body +=
    `<text x="${60 + noteW + 62}" y="${noteY + 30}" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="16" font-weight="700" fill="${colors.text}">Authorization</text>`;
  body +=
    `<text x="${60 + noteW + 62}" y="${noteY + 54}" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="15" fill="${colors.muted}">AWS IAM decides what credentials can do</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      ${pageMeta()}
      ${body}
    </svg>`;
}

// ---------- render ----------

async function render(name, svg) {
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  const out = join(process.cwd(), "public", "images", name);
  mkdirSync(join(process.cwd(), "public", "images"), { recursive: true });
  writeFileSync(out, buf);
  console.log("wrote", out, buf.length, "bytes");
}

const svg1 = diagram1();
const svg2 = diagram2();

await render("github-action-vault-diagram-v1.png", svg1);
await render("github-action-vault-diagram-v2.png", svg2);
