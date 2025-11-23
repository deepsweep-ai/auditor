import { writeFile } from 'fs/promises';
import Handlebars from 'handlebars';
import type { AuditReport } from '../types/index.js';

const HTML_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DeepSweep.ai Audit Report - {{audit_id}}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f7fa;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 24px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        .header h1 { font-size: 32px; margin-bottom: 10px; }
        .header p { opacity: 0.9; font-size: 14px; }
        .content { padding: 40px; }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .summary-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        .summary-card h3 {
            font-size: 14px;
            color: #666;
            text-transform: uppercase;
            margin-bottom: 8px;
        }
        .summary-card .value {
            font-size: 28px;
            font-weight: bold;
            color: #333;
        }
        .risk-critical { color: #dc3545; border-left-color: #dc3545; }
        .risk-high { color: #fd7e14; border-left-color: #fd7e14; }
        .risk-medium { color: #ffc107; border-left-color: #ffc107; }
        .risk-low { color: #28a745; border-left-color: #28a745; }
        .section {
            margin-bottom: 40px;
        }
        .section h2 {
            font-size: 24px;
            margin-bottom: 20px;
            color: #333;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
        }
        .compliance-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }
        .compliance-item {
            padding: 15px;
            border-radius: 8px;
            background: #f8f9fa;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }
        .badge-pass { background: #d4edda; color: #155724; }
        .badge-partial { background: #fff3cd; color: #856404; }
        .badge-fail { background: #f8d7da; color: #721c24; }
        .finding {
            background: #f8f9fa;
            border-left: 4px solid #ccc;
            padding: 20px;
            margin-bottom: 15px;
            border-radius: 4px;
        }
        .finding-critical { border-left-color: #dc3545; }
        .finding-high { border-left-color: #fd7e14; }
        .finding-medium { border-left-color: #ffc107; }
        .finding-low { border-left-color: #28a745; }
        .finding h3 {
            font-size: 18px;
            margin-bottom: 8px;
            color: #333;
        }
        .finding .meta {
            font-size: 12px;
            color: #666;
            margin-bottom: 10px;
        }
        .finding .description {
            margin-bottom: 10px;
            color: #555;
        }
        .finding .recommendation {
            background: #e3f2fd;
            padding: 10px;
            border-radius: 4px;
            margin-top: 10px;
            font-size: 14px;
        }
        .recommendations {
            background: #fff9e6;
            border: 1px solid #ffe082;
            border-radius: 8px;
            padding: 20px;
        }
        .recommendations ul {
            list-style: none;
            padding-left: 0;
        }
        .recommendations li {
            padding: 8px 0;
            padding-left: 24px;
            position: relative;
        }
        .recommendations li:before {
            content: "→";
            position: absolute;
            left: 0;
            color: #ffa000;
            font-weight: bold;
        }
        .footer {
            background: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #dee2e6;
        }
        .footer .cta {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 30px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
            margin-top: 15px;
        }
        .footer .cta:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
    </style>

    <!-- Google Analytics GA4 -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-JLEYLBCSB9"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());

        // Configure GA4 with custom dimensions
        gtag('config', 'G-JLEYLBCSB9', {
            'custom_map': {
                'dimension1': 'risk_level',
                'dimension2': 'findings_count',
                'dimension3': 'report_source'
            }
        });

        // Track report viewed event
        gtag('event', 'report_viewed', {
            'risk_level': '{{overall_risk}}',
            'findings_count': {{findings_count}},
            'critical_findings': {{critical_findings}},
            'report_source': 'html_export'
        });
    </script>
</head>
<body>
    <!-- CTA Click Tracking -->
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // Track CTA button clicks
            const ctaButton = document.querySelector('.footer .cta');
            if (ctaButton) {
                ctaButton.addEventListener('click', function(e) {
                    gtag('event', 'cta_click', {
                        'risk_level': '{{overall_risk}}',
                        'button_text': e.target.innerText,
                        'destination_url': e.target.href,
                        'event_category': 'conversion',
                        'event_label': 'firewall_cta'
                    });
                });
            }
        });
    </script>
    <div class="container">
        <div class="header">
            <h1>DeepSweep.ai Auditor Report</h1>
            <p>MCP Server Security Audit</p>
        </div>

        <div class="content">
            <div class="summary">
                <div class="summary-card risk-{{overall_risk_class}}">
                    <h3>Overall Risk</h3>
                    <div class="value">{{overall_risk}}</div>
                </div>
                <div class="summary-card">
                    <h3>Risk Score</h3>
                    <div class="value">{{risk_score_0_100}}/100</div>
                </div>
                <div class="summary-card">
                    <h3>Total Findings</h3>
                    <div class="value">{{findings_count}}</div>
                </div>
                <div class="summary-card risk-critical">
                    <h3>Critical</h3>
                    <div class="value">{{critical_findings}}</div>
                </div>
            </div>

            <div class="section">
                <h2>Audit Information</h2>
                <p><strong>Server:</strong> {{mcp_server_url}}</p>
                <p><strong>Audit ID:</strong> {{audit_id}}</p>
                <p><strong>Timestamp:</strong> {{timestamp}}</p>
                <p><strong>Memory Poisoning:</strong> {{#if memory_poisoning_detected}}<span style="color: #dc3545;">DETECTED</span>{{else}}<span style="color: #28a745;">None</span>{{/if}}</p>
                <p><strong>Tool Poisoning:</strong> {{#if tool_poisoning_detected}}<span style="color: #dc3545;">DETECTED</span>{{else}}<span style="color: #28a745;">None</span>{{/if}}</p>
            </div>

            <div class="section">
                <h2>Compliance Status</h2>
                <div class="compliance-grid">
                    <div class="compliance-item">
                        <span>NIST AI RMF</span>
                        <span class="badge badge-{{compliance.nist_ai_rmf_class}}">{{compliance.nist_ai_rmf}}</span>
                    </div>
                    <div class="compliance-item">
                        <span>ISO 42001</span>
                        <span class="badge badge-{{compliance.iso_42001_class}}">{{compliance.iso_42001}}</span>
                    </div>
                    <div class="compliance-item">
                        <span>SOC2 AI</span>
                        <span class="badge badge-{{compliance.soc2_ai_class}}">{{compliance.soc2_ai}}</span>
                    </div>
                    <div class="compliance-item">
                        <span>EU AI Act</span>
                        <span class="badge badge-{{compliance.eu_ai_act_high_risk_class}}">{{compliance.eu_ai_act_high_risk}}</span>
                    </div>
                </div>
            </div>

            {{#if critical_findings_list}}
            <div class="section">
                <h2>Critical Findings</h2>
                {{#each critical_findings_list}}
                <div class="finding finding-critical">
                    <h3>{{title}}</h3>
                    <div class="meta">Severity: CRITICAL | Category: {{category}}</div>
                    <div class="description">{{description}}</div>
                    <div class="recommendation"><strong>Recommendation:</strong> {{recommendation}}</div>
                </div>
                {{/each}}
            </div>
            {{/if}}

            {{#if recommendations}}
            <div class="section">
                <h2>Recommendations</h2>
                <div class="recommendations">
                    <ul>
                        {{#each recommendations}}
                        <li>{{this}}</li>
                        {{/each}}
                    </ul>
                </div>
            </div>
            {{/if}}
        </div>

        <div class="footer">
            <p><strong>{{deepsweep_promo}}</strong></p>
            <a href="https://deepsweep.ai/firewall?ref=cli&risk={{overall_risk}}&source=html-report" class="cta">Start Free Trial → DeepSweep Memory Firewall</a>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">🇺🇸 US-based security platform • Built in America • Enterprise-grade protection</p>
        </div>
    </div>
</body>
</html>
`;

export async function generateHTMLReport(
  report: AuditReport,
  outputPath: string
): Promise<void> {
  const template = Handlebars.compile(HTML_TEMPLATE);

  const data = {
    ...report,
    overall_risk_class: report.overall_risk.toLowerCase(),
    critical_findings_list: report.findings.filter((f) => f.severity === 'CRITICAL'),
    compliance: {
      nist_ai_rmf: report.compliance.nist_ai_rmf,
      nist_ai_rmf_class: report.compliance.nist_ai_rmf.toLowerCase(),
      iso_42001: report.compliance.iso_42001,
      iso_42001_class: report.compliance.iso_42001.toLowerCase(),
      soc2_ai: report.compliance.soc2_ai,
      soc2_ai_class: report.compliance.soc2_ai.toLowerCase(),
      eu_ai_act_high_risk: report.compliance.eu_ai_act_high_risk,
      eu_ai_act_high_risk_class: report.compliance.eu_ai_act_high_risk.toLowerCase(),
    },
  };

  const html = template(data);
  await writeFile(outputPath, html, 'utf-8');
}
