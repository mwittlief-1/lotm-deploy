#!/usr/bin/env node

import process from "node:process";

function argumentsByName(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (!name?.startsWith("--") || !value) {
      throw new Error(`Expected --name value arguments; received ${argv.join(" ")}.`);
    }
    values.set(name.slice(2), value);
  }
  return values;
}

function required(value, name) {
  const result = value?.trim();
  if (!result) throw new Error(`${name} is required.`);
  return result;
}

const values = argumentsByName(process.argv.slice(2));
const deploymentUrl = new URL(
  required(values.get("deployment-url"), "--deployment-url"),
);
if (
  deploymentUrl.protocol !== "https:" ||
  deploymentUrl.username ||
  deploymentUrl.password ||
  !deploymentUrl.hostname.endsWith(".vercel.app")
) {
  throw new Error("--deployment-url must be a credential-free HTTPS Vercel deployment URL.");
}

const token = required(process.env.VERCEL_TOKEN, "VERCEL_TOKEN");
const projectId = required(process.env.VERCEL_PROJECT_ID, "VERCEL_PROJECT_ID");
const orgId = required(process.env.VERCEL_ORG_ID, "VERCEL_ORG_ID");
const inspectionUrl = new URL(
  `/v13/deployments/${encodeURIComponent(deploymentUrl.hostname)}`,
  "https://api.vercel.com",
);
inspectionUrl.searchParams.set("teamId", orgId);

const response = await fetch(inspectionUrl, {
  headers: { authorization: `Bearer ${token}` },
  redirect: "error",
  signal: AbortSignal.timeout(30_000),
});
if (!response.ok) {
  throw new Error(`Vercel deployment inspection failed with HTTP ${response.status}.`);
}
const deployment = await response.json();
if (deployment?.projectId !== projectId) {
  throw new Error("Deployment does not belong to the configured CourtOS Vercel project.");
}
if (deployment?.readyState !== "READY") {
  throw new Error(`Deployment is not READY (received ${String(deployment?.readyState)}).`);
}

process.stdout.write(
  `${JSON.stringify(
    {
      schema_version: "courtos_vercel_deployment_verification_v1",
      deployment_url: deploymentUrl.origin,
      deployment_id: deployment.id,
      project_id: deployment.projectId,
      ready_state: deployment.readyState,
      verdict: "pass",
    },
    null,
    2,
  )}\n`,
);
