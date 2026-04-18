#!/usr/bin/env ruby

require_relative "opsV03ControlPlane"

backlog = OpsV03ControlPlane.backlog
latest = OpsV03ControlPlane.latest
branch_policy = OpsV03ControlPlane.branch_policy
gates = OpsV03ControlPlane.gates
runtime_contract = OpsV03ControlPlane.runtime_contract

errors = []
warnings = []

errors << "backlog.yaml must stay on version 2" unless backlog["version"] == 2
errors << "progress/latest.yaml must stay on version 2" unless latest["version"] == 2

unless runtime_contract.dig("control_plane_rules", "backlog_version") == 2
  errors << "runtime-contract.yaml control_plane_rules.backlog_version must be 2"
end

unless runtime_contract.dig("control_plane_rules", "scheduler_mode") == "lane_parallel"
  errors << "runtime-contract.yaml must declare scheduler_mode=lane_parallel"
end

lane_acceptance = runtime_contract.dig("control_plane_rules", "lane_acceptance") || {}
errors << "runtime-contract.yaml must declare lane_acceptance.intake_audit_required=true" unless lane_acceptance["intake_audit_required"] == true
errors << "runtime-contract.yaml must declare lane_acceptance.require_completed_for_acceptance=true" unless lane_acceptance["require_completed_for_acceptance"] == true
%w[task_packet_fields allowed_delivery_states required_report_metadata required_report_sections required_report_fields].each do |field|
  value = lane_acceptance[field]
  missing =
    if value.is_a?(Array) || value.is_a?(Hash)
      value.empty?
    else
      OpsV03ControlPlane.blank?(value)
    end
  errors << "runtime-contract.yaml must declare lane_acceptance.#{field}" if missing
end

lane_handoff = branch_policy.dig("rules", "lane_handoff") || {}
errors << "branch-policy.yaml must declare lane_handoff.report_required=true" unless lane_handoff["report_required"] == true
errors << "branch-policy.yaml must declare lane_handoff.intake_audit_command" if OpsV03ControlPlane.blank?(lane_handoff["intake_audit_command"])
errors << "branch-policy.yaml must declare lane_handoff.required_packet_fields" if Array(lane_handoff["required_packet_fields"]).empty?
errors << "branch-policy.yaml must declare lane_handoff.report_template" if OpsV03ControlPlane.blank?(lane_handoff["report_template"])

releases = Array(backlog["releases"])
epics = Array(backlog["epics"])
tasks = Array(backlog["tasks"])
index = OpsV03ControlPlane.item_index(backlog)
release_ids = releases.map { |release| release["id"] }
epic_ids = epics.map { |epic| epic["id"] }
task_ids = tasks.map { |task| task["id"] }
all_ids = epic_ids + task_ids
duplicates = all_ids.group_by(&:itself).select { |_id, values| values.length > 1 }.keys
duplicates.each { |id| errors << "duplicate id detected: #{id}" }

canonical_lanes = Array(branch_policy.dig("rules", "canonical_lane_branches"))
canonical_lanes = OpsV03ControlPlane::CANONICAL_LANES if canonical_lanes.empty?
gate_names = Array(gates["gates"]).map { |name, _config| name }
claimed_tasks = {}

epics.each do |epic|
  errors << "#{epic['id']}: epics must set executable=false" unless epic["executable"] == false
end

tasks.each do |task|
  task_id = task["id"] || "<missing-id>"

  %w[id title release parent_epic status priority tranche change_type category phase lane_branch deps requires_integrator blocked_reason allowed_paths forbidden_paths required_gates requires_golden_change claim done_conditions escalation_triggers handoff].each do |field|
    errors << "#{task_id}: missing task field #{field}" unless task.key?(field)
  end

  errors << "#{task_id}: unknown release #{task['release'].inspect}" unless release_ids.include?(task["release"])
  errors << "#{task_id}: unknown parent_epic #{task['parent_epic'].inspect}" unless epic_ids.include?(task["parent_epic"]) || task["change_type"] == "external_checkpoint"
  errors << "#{task_id}: invalid lane_branch #{task['lane_branch'].inspect}" unless canonical_lanes.include?(task["lane_branch"])

  claim = task["claim"]
  unless claim.is_a?(Hash)
    errors << "#{task_id}: claim must be present as a hash"
    next
  end

  errors << "#{task_id}: claim keys must equal #{OpsV03ControlPlane::CLAIM_KEYS.join(', ')}" unless claim.keys.sort == OpsV03ControlPlane::CLAIM_KEYS.sort
  errors << "#{task_id}: invalid claim.status #{claim['status'].inspect}" unless OpsV03ControlPlane::CLAIM_STATUS_VALUES.include?(claim["status"])

  if claim["status"] == "unclaimed"
    OpsV03ControlPlane::CLAIM_KEYS.drop(1).each do |field|
      errors << "#{task_id}: unclaimed tasks must leave claim.#{field} blank" if OpsV03ControlPlane.present?(claim[field])
    end
  else
    OpsV03ControlPlane::CLAIM_KEYS.drop(1).each do |field|
      errors << "#{task_id}: claimed tasks must set claim.#{field}" unless OpsV03ControlPlane.present?(claim[field])
    end
    lane = task["lane_branch"]
    errors << "#{task_id}: multiple claimed tasks detected for lane #{lane}" if claimed_tasks.key?(lane)
    claimed_tasks[lane] = task_id
  end

  Array(task["deps"]).each do |dep|
    errors << "#{task_id}: unknown dep #{dep.inspect}" unless index.key?(dep)
  end

  Array(task["required_gates"]).each do |gate_name|
    errors << "#{task_id}: unknown required gate #{gate_name.inspect}" unless gate_names.include?(gate_name)
  end

  Array(task["allowed_paths"]).each do |path_pattern|
    errors << "#{task_id}: normalize legacy path #{path_pattern.inspect}" if OpsV03ControlPlane::LEGACY_PATH_REWRITES.key?(path_pattern)
    errors << "#{task_id}: unknown allowed_path #{path_pattern.inspect}" unless OpsV03ControlPlane.known_path?(path_pattern)
  end

  Array(task["forbidden_paths"]).each do |path_pattern|
    errors << "#{task_id}: normalize legacy forbidden_path #{path_pattern.inspect}" if OpsV03ControlPlane::LEGACY_PATH_REWRITES.key?(path_pattern)
    errors << "#{task_id}: unknown forbidden_path #{path_pattern.inspect}" unless OpsV03ControlPlane.known_path?(path_pattern)
  end

  if Array(task["allowed_paths"]).any? { |path_pattern| path_pattern == "src/sim/turn.ts" || path_pattern.start_with?("src/sim/phases/") }
    unless task["requires_integrator"] == true && task["lane_branch"] == "codex/v0.3-refactor-kickoff"
      errors << "#{task_id}: integrator-only surfaces require requires_integrator=true on codex/v0.3-refactor-kickoff"
    end
  end

  if task["lane_branch"] == "codex/v0.3-lane-world-topology" && task["id"] != "V03-XMAP-001"
    errors << "#{task_id}: world/topology tasks must depend on V03-XMAP-001" unless Array(task["deps"]).include?("V03-XMAP-001")
    if task["status"] == "ready" && !OpsV03ControlPlane.topology_unlocked?(backlog)
      errors << "#{task_id}: world/topology tasks cannot be ready before V03-XMAP-001 is done"
    end
  end
end

active_claims = latest.fetch("active_claims", {})
backlog_active_claims = OpsV03ControlPlane.active_claims_from_backlog(backlog)
errors << "progress/latest.yaml active_claims must mirror claimed tasks in backlog" unless active_claims == backlog_active_claims

current_task_id = latest.dig("cursor", "current_task_id").to_s
errors << "progress/latest.yaml cursor.current_task_id must reference a task, not an epic" if epic_ids.include?(current_task_id)
errors << "progress/latest.yaml cursor.current_task_id references unknown task #{current_task_id.inspect}" if OpsV03ControlPlane.present?(current_task_id) && !task_ids.include?(current_task_id)

expected_current_task_id = OpsV03ControlPlane.expected_current_task_id(backlog, active_claims)
unless current_task_id == expected_current_task_id
  errors << "progress/latest.yaml cursor.current_task_id must equal #{expected_current_task_id.inspect}"
end

first_ready_by_lane = OpsV03ControlPlane.first_ready_by_lane(backlog)
first_claimable_by_lane = OpsV03ControlPlane.first_claimable_by_lane(backlog, active_claims)
ready_epic_ids = epics.select { |epic| epic["status"] == "ready" }.map { |epic| epic["id"] }
warnings << "epics remain informational even when ready: #{ready_epic_ids.join(', ')}" unless ready_epic_ids.empty?

summary = {
  active_claims: active_claims,
  first_ready_by_lane: first_ready_by_lane,
  first_claimable_by_lane: first_claimable_by_lane,
  current_task_id: current_task_id
}

if ARGV.include?("--json")
  puts JSON.pretty_generate({
    ok: errors.empty?,
    summary: summary,
    warnings: warnings,
    errors: errors
  })
  exit(errors.empty? ? 0 : 1)
end

if errors.empty?
  puts "ops:v0.3:validate PASS"
  puts "- current_task_id: #{summary[:current_task_id]}"
  puts "- active_claims: #{summary[:active_claims].keys.sort.join(', ')}"
  puts "- first_claimable_by_lane: #{summary[:first_claimable_by_lane].map { |lane, task_id| "#{lane}=#{task_id}" }.join(', ')}"
  warnings.each { |warning| puts "- warning: #{warning}" }
  exit(0)
end

puts "ops:v0.3:validate FAIL"
errors.each { |error| puts "- #{error}" }
warnings.each { |warning| puts "- warning: #{warning}" }
exit(1)
