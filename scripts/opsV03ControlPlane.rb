#!/usr/bin/env ruby

require "json"
require "open3"
require "psych"

module OpsV03ControlPlane
  ROOT = File.expand_path("..", __dir__)
  OPS_DIR = File.join(ROOT, "ops", "v0.3")
  BACKLOG_PATH = File.join(OPS_DIR, "backlog.yaml")
  LATEST_PATH = File.join(OPS_DIR, "progress", "latest.yaml")
  OWNERSHIP_MAP_PATH = File.join(OPS_DIR, "ownership-map.yaml")
  BRANCH_POLICY_PATH = File.join(OPS_DIR, "branch-policy.yaml")
  GATES_PATH = File.join(OPS_DIR, "gates.yaml")
  RUNTIME_CONTRACT_PATH = File.join(OPS_DIR, "runtime-contract.yaml")

  CLAIM_KEYS = %w[status claimed_by claimed_at claim_expires_at run_id].freeze
  CLAIM_STATUS_VALUES = %w[unclaimed claimed].freeze
  CANONICAL_LANES = [
    "codex/v0.3-refactor-kickoff",
    "codex/v0.3-lane-tooling-qa",
    "codex/v0.3-lane-social-mechanics",
    "codex/v0.3-lane-engine-core",
    "codex/v0.3-lane-ui-experience",
    "codex/v0.3-lane-economy-fiscal",
    "codex/v0.3-lane-world-topology"
  ].freeze
  LEGACY_PATH_REWRITES = {
    "src/sim/relationshipEngine.ts" => ["src/sim/domains/people/relationshipEngine.ts"],
    "src/components/**" => ["src/App.tsx", "src/ui/**"],
    "docs/ui/**" => ["docs/ux/**"]
  }.freeze
  PLANNED_SURFACES = [
    "src/sim/domains/world/**",
    "src/sim/domains/realm/**"
  ].freeze

  module_function

  def load_yaml(path)
    Psych.safe_load(File.read(path), aliases: false)
  rescue Psych::SyntaxError => e
    abort("ops:v0.3 control-plane YAML parse error in #{path}: #{e.message}")
  end

  def write_yaml(path, data)
    content = Psych.dump(data, line_width: -1)
    File.write(path, content.sub(/\A---\s*\n/, ""))
  end

  def backlog
    load_yaml(BACKLOG_PATH)
  end

  def latest
    load_yaml(LATEST_PATH)
  end

  def ownership_map
    load_yaml(OWNERSHIP_MAP_PATH)
  end

  def branch_policy
    load_yaml(BRANCH_POLICY_PATH)
  end

  def gates
    load_yaml(GATES_PATH)
  end

  def runtime_contract
    load_yaml(RUNTIME_CONTRACT_PATH)
  end

  def blank?(value)
    value.nil? || value == ""
  end

  def present?(value)
    !blank?(value)
  end

  def canonical_claim(existing = nil)
    claim = {
      "status" => "unclaimed",
      "claimed_by" => "",
      "claimed_at" => "",
      "claim_expires_at" => "",
      "run_id" => ""
    }

    return claim unless existing.is_a?(Hash)

    status = existing["status"]
    inferred_claimed = CLAIM_KEYS.drop(1).any? { |key| present?(existing[key]) }
    claim["status"] =
      if CLAIM_STATUS_VALUES.include?(status)
        status
      elsif inferred_claimed
        "claimed"
      else
        "unclaimed"
      end

    CLAIM_KEYS.drop(1).each do |key|
      claim[key] = existing[key].to_s if existing.key?(key)
    end

    claim
  end

  def normalize_path_list(path_list)
    normalized = []
    Array(path_list).each do |path_pattern|
      replacements = LEGACY_PATH_REWRITES.fetch(path_pattern, [path_pattern])
      replacements.each do |replacement|
        normalized << replacement unless normalized.include?(replacement)
      end
    end
    normalized
  end

  def normalize_backlog!(data)
    Array(data["epics"]).each do |epic|
      epic["executable"] = false
    end

    Array(data["tasks"]).each do |task|
      task["allowed_paths"] = normalize_path_list(task["allowed_paths"])
      task["forbidden_paths"] = normalize_path_list(task["forbidden_paths"])
      task["claim"] = canonical_claim(task["claim"])
    end
  end

  def item_index(data)
    index = {}
    (Array(data["epics"]) + Array(data["tasks"])).each do |item|
      index[item["id"]] = item
    end
    index
  end

  def find_task(data, task_id)
    Array(data["tasks"]).find { |task| task["id"] == task_id }
  end

  def done?(index, item_id)
    index.fetch(item_id, {})["status"] == "done"
  end

  def topology_checkpoint_id(data)
    Array(data["tasks"]).find { |task| task["change_type"] == "external_checkpoint" && task["lane_branch"] == "codex/v0.3-lane-world-topology" }&.fetch("id", nil) || "V03-XMAP-001"
  end

  def topology_unlocked?(data)
    checkpoint_id = topology_checkpoint_id(data)
    done?(item_index(data), checkpoint_id)
  end

  def task_ready_with_deps?(task, index)
    task["status"] == "ready" && Array(task["deps"]).all? { |dep| done?(index, dep) }
  end

  def task_lane_allowed?(task, data)
    return false if task["lane_branch"] == "codex/v0.3-lane-world-topology" && !topology_unlocked?(data)
    true
  end

  def active_claims_from_backlog(data)
    claims = {}
    Array(data["tasks"]).each do |task|
      next unless task.dig("claim", "status") == "claimed"

      claims[task["lane_branch"]] = {
        "task_id" => task["id"],
        "claimed_by" => task.dig("claim", "claimed_by").to_s,
        "claimed_at" => task.dig("claim", "claimed_at").to_s,
        "claim_expires_at" => task.dig("claim", "claim_expires_at").to_s,
        "run_id" => task.dig("claim", "run_id").to_s
      }
    end
    claims
  end

  def first_ready_by_lane(data)
    index = item_index(data)
    lanes = {}
    Array(data["tasks"]).each do |task|
      lane = task["lane_branch"]
      next if lanes.key?(lane)
      next unless task_ready_with_deps?(task, index)
      next unless task_lane_allowed?(task, data)

      lanes[lane] = task["id"]
    end
    lanes
  end

  def first_claimable_by_lane(data, active_claims = active_claims_from_backlog(data))
    index = item_index(data)
    lanes = {}
    Array(data["tasks"]).each do |task|
      lane = task["lane_branch"]
      next if lanes.key?(lane)
      next unless task_ready_with_deps?(task, index)
      next unless task_lane_allowed?(task, data)
      next unless task.dig("claim", "status") == "unclaimed"
      next if active_claims.key?(lane)

      lanes[lane] = task["id"]
    end
    lanes
  end

  def expected_current_task_id(data, active_claims = active_claims_from_backlog(data))
    index = item_index(data)
    Array(data["tasks"]).each do |task|
      next unless task_ready_with_deps?(task, index)
      next unless task_lane_allowed?(task, data)
      next unless task.dig("claim", "status") == "unclaimed"
      next if active_claims.key?(task["lane_branch"])

      return task["id"]
    end
    ""
  end

  def known_path?(path_pattern)
    return false if LEGACY_PATH_REWRITES.key?(path_pattern)

    clean = path_pattern.sub(%r{/[*][*]$}, "")
    return true if File.exist?(File.join(ROOT, clean))
    return true if PLANNED_SURFACES.include?(path_pattern)

    false
  end

  def report_path_exists?(task)
    report_path = task.dig("handoff", "report_path").to_s
    present?(report_path) && File.exist?(File.join(ROOT, report_path))
  end

  def output_paths(task)
    Array(task["outputs"]).map { |path| File.join(ROOT, path) }
  end

  def any_output_exists?(task)
    output_paths(task).any? { |path| File.exist?(path) }
  end

  def rebase_dry_run(data)
    Array(data["tasks"]).select { |task| task["status"] == "ready" }.map do |task|
      report_exists = report_path_exists?(task)
      output_exists = any_output_exists?(task)
      {
        "task_id" => task["id"],
        "lane_branch" => task["lane_branch"],
        "report_exists" => report_exists,
        "output_exists" => output_exists,
        "should_rebase" => false,
        "reason" => if report_exists || output_exists
                     "manual review required; artifact evidence exists but done_conditions are not auto-provable"
                   else
                     "artifact evidence missing"
                   end
      }
    end
  end

  def command_output(*cmd)
    stdout, status = Open3.capture2(*cmd, chdir: ROOT)
    status.success? ? stdout.strip : ""
  end

  def current_git_branch
    command_output("git", "branch", "--show-current")
  end

  def current_git_commit
    command_output("git", "rev-parse", "HEAD")
  end

  def node_version
    command_output("node", "-v")
  end

  def npm_version
    command_output("npm", "--version")
  end

  def normalize_progress!(progress, data)
    progress["version"] = 2
    progress["cursor"] ||= {}
    progress["cursor"]["last_completed_task_id"] ||= ""
    active_claims = active_claims_from_backlog(data)
    progress["active_claims"] = active_claims
    progress["cursor"]["current_task_id"] = expected_current_task_id(data, active_claims)
    progress["runtime"] ||= {}
    progress["runtime"]["node_version"] = node_version
    progress["runtime"]["npm_version"] = npm_version
    progress["runtime"]["git_branch"] = current_git_branch
    progress["runtime"]["git_commit"] = current_git_commit
    progress["runtime"]["ci_env"] ||= ""
    progress["runtime"]["vercel_env"] ||= ""
    progress["runtime"]["pr_url"] ||= ""
    progress["runtime"]["pr_status"] ||= ""
    progress["notes"] = build_progress_note(progress["cursor"]["current_task_id"], active_claims)
  end

  def build_progress_note(current_task_id, active_claims)
    claimed_summary =
      if active_claims.empty?
        "No active lane claims are currently recorded."
      else
        active_claims.map do |lane, claim|
          "#{lane} has #{claim['task_id']} claimed through #{claim['claim_expires_at']}"
        end.join(" ")
      end

    [
      "Imported canonical backlog has been normalized to repo-truth paths and canonical claims.",
      "Lane-parallel scheduling is active with current_task_id set to #{current_task_id.empty? ? '(none)' : current_task_id}.",
      claimed_summary,
      "World/topology automation remains blocked behind V03-XMAP-001."
    ].join(" ")
  end
end
