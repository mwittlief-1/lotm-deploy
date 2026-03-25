#!/usr/bin/env ruby

require_relative "opsV03ControlPlane"

backlog = OpsV03ControlPlane.backlog
active_claims = OpsV03ControlPlane.active_claims_from_backlog(backlog)

payload = {
  active_claims: active_claims,
  first_ready_by_lane: OpsV03ControlPlane.first_ready_by_lane(backlog),
  first_claimable_by_lane: OpsV03ControlPlane.first_claimable_by_lane(backlog, active_claims),
  current_task_id_expected: OpsV03ControlPlane.expected_current_task_id(backlog, active_claims)
}

if ARGV.include?("--json")
  puts JSON.pretty_generate(payload)
else
  puts JSON.pretty_generate(payload)
end
