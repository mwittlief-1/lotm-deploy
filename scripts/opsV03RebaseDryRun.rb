#!/usr/bin/env ruby

require_relative "opsV03ControlPlane"

backlog = OpsV03ControlPlane.backlog
payload = {
  ready_tasks: OpsV03ControlPlane.rebase_dry_run(backlog)
}

if ARGV.include?("--json")
  puts JSON.pretty_generate(payload)
else
  puts JSON.pretty_generate(payload)
end
