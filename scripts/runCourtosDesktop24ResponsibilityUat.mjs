import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { _electron as electron } from "playwright-core";

const responsibilities = [
  "office_post_appointments",
  "household_stores_provisioning_procurement",
  "adult_kin_support",
  "education_formation",
  "household_service_care",
  "marriage_dynasty_stewardship",
  "patronage_hospitality_gifts",
  "manor_stewardship",
  "estate_fabric_maintenance_oversight",
  "works_project_supervision",
  "franchise_operations",
  "portfolio_oversight",
  "house_fiscal_administration",
  "manor_fiscal_administration",
  "revenue_right_administration_collection",
  "reception_intake",
  "records_archives",
  "correspondence_dispatch",
  "security_asset_protection",
  "martial_readiness_training",
  "martial_stores_horse_capacity",
  "external_relations_representation",
  "household_observance_chaplaincy",
  "church_rights_institutional_affairs",
];
const householdSceneKey = {
  household_stores_provisioning_procurement: "stores",
  adult_kin_support: "adult_kin",
  education_formation: "education",
  household_service_care: "service_care",
};

const appBundle = path.resolve(process.argv[2] ?? process.env.COURTOS_DESKTOP_APP ?? "");
const executablePath = path.join(appBundle, "Contents", "MacOS", "Merecross");
if (!fs.existsSync(executablePath)) throw new Error(`Desktop executable not found: ${executablePath}`);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "merecross-24-responsibility-"));
let app;
try {
  app = await electron.launch({ executablePath, args: [`--user-data-dir=${profile}`], timeout: 90_000 });
  const page = await app.firstWindow({ timeout: 90_000 });
  page.setDefaultTimeout(45_000);
  const houseCommand = "merecross://app/courtos-home.html?place=house_command";
  const results = [];
  for (const [index, responsibility] of responsibilities.entries()) {
    await page.goto(houseCommand, { waitUntil: "domcontentloaded" });
    const register = page.locator(".uat-house-command-register button");
    await register.first().waitFor({ state: "visible" });
    if (await register.count() !== 24) throw new Error("House Command does not expose exactly 24 responsibilities.");
    await register.nth(index).click();
    const surface = responsibility === "office_post_appointments"
      ? page.locator(".uat-house-command-appointments")
      : responsibility === "manor_stewardship"
        ? page.getByRole("region", { name: "Manor Stewardship" })
        : page.locator(
          `[data-responsibility="${householdSceneKey[responsibility] ?? responsibility}"]`,
        );
    await surface.waitFor({ state: "visible" });
    const sourceError = surface.getByText("Source record unavailable", { exact: true });
    if (await sourceError.count() && await sourceError.first().isVisible()) {
      throw new Error(`${responsibility} failed its packaged source projection.`);
    }
    if (householdSceneKey[responsibility]) {
      await surface.getByRole("button", { name: "Review assignment basis" }).click();
    }
    const assignment = householdSceneKey[responsibility]
      ? page.getByRole("region", { name: "Assignment planning draft" })
      : surface.getByRole("region", { name: "Assignment planning draft" });
    await assignment.waitFor({ state: "visible" });
    results.push({ responsibility, verdict: "pass" });
  }
  process.stdout.write(`${JSON.stringify({ schema_version: "courtos_desktop_24_responsibility_uat_v1", results }, null, 2)}\n`);
} finally {
  if (app) await app.close().catch(() => undefined);
  fs.rmSync(profile, { recursive: true, force: true });
}
