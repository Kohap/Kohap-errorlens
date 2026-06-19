#!/usr/bin/env python3
"""Build an ErrorLens Markdown report from structured findings JSON."""

from __future__ import annotations

import argparse
import datetime as dt
import json
from pathlib import Path
from typing import Any


SEVERITY_ORDER = {
    "Critical": 0,
    "High": 1,
    "Medium": 2,
    "Low": 3,
    "Informational": 4,
}


def as_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item) for item in value if str(item).strip()]
    text = str(value).strip()
    return [text] if text else []


def line_items(items: list[str], empty: str = "Not provided.") -> str:
    if not items:
        return f"- {empty}"
    return "\n".join(f"- {item}" for item in items)


def numbered(items: list[str], empty: str = "Not provided.") -> str:
    if not items:
        return f"1. {empty}"
    return "\n".join(f"{index}. {item}" for index, item in enumerate(items, start=1))


def severity_counts(findings: list[dict[str, Any]]) -> dict[str, int]:
    counts = {severity: 0 for severity in SEVERITY_ORDER}
    for finding in findings:
        severity = str(finding.get("severity", "Informational")).title()
        if severity not in counts:
            severity = "Informational"
        counts[severity] += 1
    return counts


def normalize_finding(finding: dict[str, Any], index: int) -> dict[str, Any]:
    severity = str(finding.get("severity", "Informational")).title()
    if severity not in SEVERITY_ORDER:
        severity = "Informational"
    return {
        "id": str(finding.get("id") or f"EL-{index:03d}"),
        "title": str(finding.get("title") or "Untitled finding"),
        "severity": severity,
        "status": str(finding.get("status") or "Open"),
        "chain": str(finding.get("chain") or "Unspecified"),
        "area": str(finding.get("area") or "Unspecified"),
        "owner": str(finding.get("owner") or "Unassigned"),
        "description": str(finding.get("description") or "Not provided."),
        "impact": str(finding.get("impact") or "Not provided."),
        "steps": as_list(finding.get("steps")),
        "evidence": as_list(finding.get("evidence")),
        "affected": as_list(finding.get("affected")),
        "recommendation": str(finding.get("recommendation") or "Not provided."),
        "verification": as_list(finding.get("verification")),
        "notes": str(finding.get("developer_notes") or finding.get("notes") or "").strip(),
    }


def build_report(data: dict[str, Any]) -> str:
    project = str(data.get("project") or "Target dApp")
    site_url = str(data.get("site_url") or "Not provided")
    date = str(data.get("date") or dt.date.today().isoformat())
    chains = as_list(data.get("chains"))
    scope = as_list(data.get("scope"))
    assumptions = as_list(data.get("assumptions"))
    positives = as_list(data.get("positive_observations"))
    gaps = as_list(data.get("test_gaps"))

    raw_findings = data.get("findings") or []
    findings = [normalize_finding(item, idx) for idx, item in enumerate(raw_findings, start=1)]
    findings.sort(key=lambda item: (SEVERITY_ORDER[item["severity"]], item["id"]))
    counts = severity_counts(findings)

    lines = [
        f"# ErrorLens Security Report: {project}",
        "",
        f"- Site: {site_url}",
        f"- Date: {date}",
        f"- Chains: {', '.join(chains) if chains else 'Not provided'}",
        f"- Findings: {len(findings)}",
        "",
        "## Executive Summary",
        "",
        str(data.get("summary") or "No executive summary provided."),
        "",
        "## Scope",
        "",
        line_items(scope),
        "",
        "## Assumptions",
        "",
        line_items(assumptions, "No special assumptions provided."),
        "",
        "## Severity Summary",
        "",
        "| Severity | Count |",
        "| --- | ---: |",
    ]

    for severity in SEVERITY_ORDER:
        lines.append(f"| {severity} | {counts[severity]} |")

    lines.extend(["", "## Findings", ""])

    if not findings:
        lines.extend(["No findings were provided.", ""])
    else:
        for finding in findings:
            lines.extend(
                [
                    f"### {finding['id']} - {finding['title']}",
                    "",
                    f"- Severity: {finding['severity']}",
                    f"- Status: {finding['status']}",
                    f"- Chain: {finding['chain']}",
                    f"- Area: {finding['area']}",
                    f"- Owner: {finding['owner']}",
                    "",
                    "#### Description",
                    "",
                    finding["description"],
                    "",
                    "#### Impact",
                    "",
                    finding["impact"],
                    "",
                    "#### Reproduction Steps",
                    "",
                    numbered(finding["steps"]),
                    "",
                    "#### Evidence",
                    "",
                    line_items(finding["evidence"]),
                    "",
                    "#### Affected Components",
                    "",
                    line_items(finding["affected"]),
                    "",
                    "#### Recommendation",
                    "",
                    finding["recommendation"],
                    "",
                    "#### Verification Plan",
                    "",
                    numbered(finding["verification"], "Re-run the reproduction steps and confirm the issue no longer occurs."),
                    "",
                ]
            )
            if finding["notes"]:
                lines.extend(["#### Developer Notes", "", finding["notes"], ""])

    lines.extend(
        [
            "## Positive Observations",
            "",
            line_items(positives, "No positive observations provided."),
            "",
            "## Test Gaps and Follow-Up Checks",
            "",
            line_items(gaps, "No test gaps provided."),
            "",
        ]
    )
    return "\n".join(lines).rstrip() + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description="Build an ErrorLens Markdown security report.")
    parser.add_argument("--input", required=True, help="Path to findings JSON.")
    parser.add_argument("--output", help="Path to write Markdown. Prints to stdout if omitted.")
    args = parser.parse_args()

    data = json.loads(Path(args.input).read_text(encoding="utf-8"))
    report = build_report(data)

    if args.output:
        Path(args.output).write_text(report, encoding="utf-8")
    else:
        print(report, end="")


if __name__ == "__main__":
    main()
