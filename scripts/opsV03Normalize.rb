#!/usr/bin/env ruby

require_relative "opsV03ControlPlane"

backlog = OpsV03ControlPlane.backlog
latest = OpsV03ControlPlane.latest

OpsV03ControlPlane.normalize_backlog!(backlog)
OpsV03ControlPlane.normalize_progress!(latest, backlog)

OpsV03ControlPlane.write_yaml(OpsV03ControlPlane::BACKLOG_PATH, backlog)
OpsV03ControlPlane.write_yaml(OpsV03ControlPlane::LATEST_PATH, latest)

puts "ops:v0.3:normalize OK"
puts "- current_task_id: #{latest.dig('cursor', 'current_task_id')}"
puts "- active_claims: #{latest.fetch('active_claims', {}).keys.sort.join(', ')}"
