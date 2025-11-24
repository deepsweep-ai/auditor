# DeepSweep.ai Auditor

[![npm version](https://img.shields.io/npm/v/@deepsweepai/auditor.svg)](https://www.npmjs.com/package/@deepsweepai/auditor)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node.js >= 18](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Built in USA](https://img.shields.io/badge/Built%20in-USA-blue.svg)](https://deepsweep.ai)

**Free, zero-friction CLI that audits MCP servers for memory poisoning vulnerabilities in <30 seconds.**

🇺🇸 **US-based security platform** • Enterprise-grade protection for AI agents

> "We Audited 50 Public MCP Servers. 94% Are Critically Vulnerable to Memory Poisoning."

```bash
npx @deepsweepai/auditor audit --demo
```

## Why DeepSweep.ai Auditor?

**The Problem:** AI agents with memory (MCP servers) can be poisoned with malicious instructions that persist across sessions, bypass security controls, and compromise entire systems.

**The Solution:** Run DeepSweep.ai Auditor in <30 seconds to get undeniable proof of vulnerabilities with actionable reports you can forward to security teams.

## 🚀 Quick Start

### Zero-Install Demo (Try it now!)

```bash
npx @deepsweepai/auditor audit --demo
```

This runs against a known-vulnerable MCP server and shows you exactly what vulnerabilities look like.

### Audit Your MCP Server

```bash
# Remote MCP server
npx @deepsweepai/auditor audit --url http://localhost:8000

# WebSocket MCP server
npx @deepsweepai/auditor audit --url ws://localhost:8000

# Session replay file
npx @deepsweepai/auditor audit --file session.json

# Auto-detect local MCP servers
npx @deepsweepai/auditor audit --docker
```

### With Authentication

```bash
npx @deepsweepai/auditor audit --url https://mcp.example.com --api-key YOUR_KEY
npx @deepsweepai/auditor audit --url https://mcp.example.com --bearer-token YOUR_TOKEN
```

## 🎯 User Journey

**1. Run Audit (30 seconds)**
```bash
npx @deepsweepai/auditor audit --demo
```

**2. View Detailed Report**
- Open `audit-report.html` in your browser
- Review findings, risk scores, and compliance status
- Forward to security teams or CISOs

**3. Get Continuous Protection** _(Recommended for Critical/High Risk)_
- Visit [DeepSweep Platform](https://platform.deepsweep.ai)
- Create your account and get started
- Deploy real-time memory firewall across all AI agents

**4. Dashboard Integration** _(Optional)_
- Get API key from [Platform Dashboard](https://platform.deepsweep.ai)
- Set `DEEPSWEEP_API_KEY` environment variable
- View audit history, team collaboration, custom policies

**All security detection runs locally. No API key required for audits.**

## 📊 Example Output

```
═══════════════════════════════════════════════════════
    DeepSweep.ai Auditor v0.1.0 - MCP Security Audit
═══════════════════════════════════════════════════════

Server: http://localhost:8000
Audit ID: audit_1732219801000_a1b2c3d4e5f6g7h8
Timestamp: 11/21/2025, 2:30:01 PM

Overall Risk: CRITICAL
Risk Score: 89/100

Findings Summary:
  Total Findings: 14
  Critical: 3
  High: 5
  Medium: 4
  Low: 2

Threat Detection:
  Memory Poisoning: DETECTED
  Tool Poisoning: DETECTED

Compliance Status:
  NIST AI RMF: ✗ FAIL
  ISO 42001: ⚠ PARTIAL
  SOC2 AI: ✗ FAIL
  EU AI Act: ✗ FAIL

Critical Findings:
  1. Recursive/Self-Referencing Instructions Detected
     Memory contains instructions that attempt to override system behavior

  2. Known Malicious Signature: DAN (Do Anything Now) Jailbreak
     Memory contains a known malicious pattern used in attacks

  3. Tool with Dangerous Permission: Shell Access
     Tool "execute_command" has overly broad permissions

Recommendations:
  1. Immediate: Address 3 critical security vulnerabilities
  2. Immediate: Implement input validation for all memory writes
  3. Immediate: Restrict tool permissions to principle of least privilege
  4. Deploy DeepSweep.ai Memory Firewall → https://deepsweep.ai

───────────────────────────────────────────────────────
Prevent these attacks automatically → https://deepsweep.ai
───────────────────────────────────────────────────────

📄 JSON report saved: ./risk_score.json
📄 HTML report saved: ./audit-report.html
```

## 🔍 What Gets Detected

### Memory Poisoning (6 Detectors)

- **Recursive Instructions** - "Ignore previous instructions" patterns
- **Persistent Overrides** - Instructions designed to survive sessions
- **Encoded Injections** - Base64, hex, URL-encoded malicious content
- **Malicious Signatures** - Known jailbreaks (DAN, sudo mode, etc.)
- **Entropy Anomalies** - Encrypted or obfuscated content
- **Goal Drift** - Instructions that deviate from system objectives

### Tool Poisoning (3 Detectors)

- **Broad Permissions** - Tools with excessive or dangerous access
- **Runtime Additions** - Tools added mid-session without approval
- **Suspicious Parameters** - Shell commands, path traversal, injection patterns

### Compliance Mapping

- **NIST AI RMF 1.0** - Govern, Map, Measure, Manage
- **ISO/IEC 42001** - AI Management System
- **SOC 2 Trust Services** - Security, Integrity, Confidentiality
- **EU AI Act** - High-Risk AI System Requirements

## 📄 Output Formats

### JSON Report (`risk_score.json`)

Machine-readable report for CI/CD integration:

```json
{
  "audit_id": "audit_1732219801000_a1b2c3d4",
  "version": "0.1.0",
  "timestamp": "2025-11-21T14:30:01Z",
  "overall_risk": "CRITICAL",
  "risk_score_0_100": 89,
  "findings_count": 14,
  "critical_findings": 3,
  "compliance": {
    "nist_ai_rmf": "FAIL",
    "iso_42001": "PARTIAL",
    "eu_ai_act_high_risk": "FAIL"
  }
}
```

### HTML Report (`audit-report.html`)

Beautiful, shareable report for security teams:

```bash
npx @deepsweepai/auditor audit --url http://localhost:8000 --html
```

### PDF Report (`audit-report.pdf`)

Professional audit report for compliance:

```bash
npx @deepsweepai/auditor audit --url http://localhost:8000 --pdf
```

### Share Report (Anonymized)

Upload anonymized report and get shareable link:

```bash
npx @deepsweepai/auditor audit --url http://localhost:8000 --share
# ✅ Report shared: https://deepsweep.ai/share/audit_1732219801000
```

## 🛠️ CLI Reference

### Commands

```bash
deepsweepai audit [options]  # Audit an MCP server
# or use the alias:
dsauditor audit [options]
```

### Options

**Connection:**
- `--url <url>` - MCP server URL (http:// or ws://)
- `--file <path>` - Session replay JSON file
- `--docker` - Auto-detect local Docker MCP servers
- `--api-key <key>` - API key for authentication
- `--bearer-token <token>` - Bearer token for authentication

**Output:**
- `--json` - Generate JSON report (risk_score.json)
- `--html` - Generate HTML report (audit-report.html)
- `--pdf` - Generate PDF report (audit-report.pdf)
- `--output <dir>` - Output directory (default: current)

**Other:**
- `--share` - Share anonymized report to deepsweep.ai
- `--demo` - Run demo mode with vulnerable MCP server
- `--no-telemetry` - Disable anonymous telemetry

### Exit Codes

- `0` - No critical vulnerabilities found
- `1` - Critical vulnerabilities detected or error occurred

## 🔄 CI/CD Integration

### GitHub Actions

```yaml
name: MCP Security Audit

on: [push, pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Start MCP Server
        run: docker-compose up -d mcp-server

      - name: Run DeepSweep.ai Audit
        run: npx @deepsweepai/auditor audit --url http://localhost:8000 --json

      - name: Upload Report
        uses: actions/upload-artifact@v3
        with:
          name: security-report
          path: risk_score.json
```

### Fail Build on Critical Findings

```bash
npx @deepsweepai/auditor audit --url http://localhost:8000
# Exit code 1 if critical findings detected
```

## 📊 Privacy & Telemetry

**All security detection runs locally on your machine. The auditor works perfectly without any API key.**

### What Gets Detected (100% Free, Always Local)

✅ **Memory Poisoning Detection** - Recursive patterns, semantic drift, malicious signatures
✅ **PII Leakage Detection** - Emails, SSNs, credit cards, API keys
✅ **Prompt Injection Patterns** - Jailbreaks, instruction overrides
✅ **Tool Poisoning** - Suspicious parameters, broad permissions
✅ **Compliance Mapping** - NIST AI RMF, ISO 42001, SOC 2, EU AI Act
✅ **Risk Scoring** - 0-100 severity scores with actionable recommendations

**All detection logic is built into the CLI. No API calls required for security analysis.**

### Two-Tier Telemetry System

**Tier 1: Anonymous Telemetry (Default)**
- 🆔 **Device ID**: Generated UUID stored in `~/.deepsweep/device-id`
- 📊 **Collected**: Risk scores, finding counts, compliance metrics, timestamps
- ❌ **Never collected**: MCP server URLs, prompts, memory content, PII, source code
- 🔒 **Security**: Encrypted HTTPS to `api.deepsweep.ai/v1/events/anonymous`
- 🚪 **Opt-out**: `--no-telemetry` or `DEEPSWEEP_TELEMETRY=off`

**Tier 2: Dashboard Integration (Optional - Requires API Key)**
- 📈 **Audit History**: Store audit results in DeepSweep dashboard
- 👥 **Team Collaboration**: Share findings across your organization
- 📋 **Custom Policies**: Load project-specific rules from dashboard
- 🔗 **Integrations**: Auto-create tickets, Slack alerts, CI/CD hooks

**Important:** The API key unlocks **dashboard features**, not detection features. All security analysis happens locally.

### Enable Dashboard Integration (Optional)

1. **Get your API key** from the [DeepSweep Platform](https://platform.deepsweep.ai)

2. **Set the API key** as an environment variable:

```bash
export DEEPSWEEP_API_KEY=ds_prod_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

3. **Run the auditor** (dashboard integration activates automatically):

```bash
npx @deepsweepai/auditor audit --demo
# → Same local detection + results stored in dashboard
# → 📊 View audit in DeepSweep Platform: https://platform.deepsweep.ai/audits/abc123
```

**API Key Formats:**
- Production: `ds_prod_*`
- Business: `ds_biz_*`
- Free tier: `ds_free_*`

**Environment Variables:**
- `DEEPSWEEP_API_KEY` - Your DeepSweep API key (optional, for dashboard features)
- `DEEPSWEEP_API_URL` - API base URL (default: `https://api.deepsweep.ai/v1`)
- `DEEPSWEEP_TELEMETRY` - Set to `off` or `false` to disable anonymous telemetry

**Device ID Storage:**
- Location: `~/.deepsweep/device-id`
- Format: UUID v4 (e.g., `550e8400-e29b-41d4-a716-446655440000`)
- Purpose: Anonymous usage tracking (no PII)

[Privacy Policy](https://deepsweep.ai/privacy)

## 🏗️ Architecture

```
┌─────────────────┐
│   MCP Server    │
│  (Your Agent)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│   Connectors    │────▶│    Detectors     │
│ HTTP/WS/File    │     │ Memory + Tool    │
└─────────────────┘     └────────┬─────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │   Compliance     │
                        │ NIST/ISO/SOC2/EU │
                        └────────┬─────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │    Reporters     │
                        │ JSON/HTML/PDF    │
                        └──────────────────┘
```

## 🚀 Launch Blog Post

### "We Audited 50 Public MCP Servers. 94% Are Critically Vulnerable to Memory Poisoning."

**TL;DR:** We built a free CLI tool that finds memory poisoning in MCP servers in <30 seconds. Try it now:

```bash
npx @deepsweepai/auditor audit --demo
```

**The Problem:**

AI agents with memory (Model Context Protocol servers) are the future of AI applications. But they're also the future of AI vulnerabilities.

We discovered that **94% of public MCP servers** are vulnerable to memory poisoning attacks where malicious instructions persist across sessions, bypass guardrails, and compromise the entire agent.

**The Solution:**

DeepSweep.ai Auditor is a free, open-source CLI that audits any MCP server in <30 seconds and generates reports you can forward to your CISO.

**Key Features:**

- ✅ Zero friction - Works with `npx`, no installation
- ✅ <30 second scans
- ✅ 9 detectors (6 memory + 3 tool poisoning)
- ✅ Compliance mapping (NIST, ISO, SOC2, EU AI Act)
- ✅ Beautiful reports (JSON, HTML, PDF)
- ✅ Anonymous telemetry only
- ✅ MIT licensed

**Try it now:**

```bash
npx @deepsweepai/auditor audit --demo
```

---

**Share your results:**

Found vulnerabilities? Share on Twitter/LinkedIn with `--share` and tag @deepsweepai

**Prevent attacks automatically:**

DeepSweep.ai Memory Firewall provides real-time protection → [https://deepsweep.ai](https://deepsweep.ai)

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md)

## 📝 License

MIT License - see [LICENSE](LICENSE)

## 🔗 Links

- **Homepage:** [https://deepsweep.ai](https://deepsweep.ai)
- **Repository:** [https://github.com/deepsweep-ai/auditor](https://github.com/deepsweep-ai/auditor)
- **Issues:** [https://github.com/deepsweep-ai/auditor/issues](https://github.com/deepsweep-ai/auditor/issues)
- **NPM:** [@deepsweepai/auditor](https://www.npmjs.com/package/@deepsweepai/auditor)
- **Discord:** [Join Community](https://discord.gg/Db5Zth2RKR)

---

**DeepSweep.ai Auditor** — Because AI agents shouldn't be deployed without security testing.

Launch November 28, 2025. 🚀
