#!/usr/bin/env ruby

require "json"
require "optparse"

require_relative "opsV03ControlPlane"

options = {
  task_id: "",
  root: OpsV03ControlPlane::ROOT,
  backlog_path: OpsV03ControlPlane::BACKLOG_PATH,
  runtime_contract_path: OpsV03ControlPlane::RUNTIME_CONTRACT_PATH,
  require_completed: false,
  json: false
}

OptionParser.new do |opts|
  opts.banner = "Usage: ruby scripts/opsV03IntakeAudit.rb --task TASK_ID [options]"

  opts.on("--task TASK_ID", "Task id to audit") { |value| options[:task_id] = value.to_s }
  opts.on("--root PATH", "Repo root override for report-path resolution") { |value| options[:root] = File.expand_path(value) }
  opts.on("--backlog PATH", "Backlog YAML override") { |value| options[:backlog_path] = File.expand_path(value) }
  opts.on("--runtime-contract PATH", "Runtime contract YAML override") { |value| options[:runtime_contract_path] = File.expand_path(value) }
  opts.on("--require-completed", "Fail unless delivery_state is completed") { options[:require_completed] = true }
  opts.on("--json", "Print JSON output") { options[:json] = true }
end.parse!(ARGV)

def blank_string?(value)
  value.nil? || value.to_s.strip.empty?
end

def extract_metadata(content, label)
  match = content.match(/^\*\*#{Regexp.escape(label)}:\*\*\s*(.+?)\s*$/)
  match ? match[1].strip : ""
end

def extract_section(content, title)
  match = content.match(/^## #{Regexp.escape(title)}\n(.*?)(?=^## |\z)/m)
  match ? match[1] : ""
end

def extract_section_field(section_text, label)
  lines = section_text.lines
  index = lines.index do |line|
    line.match?(/^- #{Regexp.escape(label)}:\s*(.*)$/)
  end
  return "" if index.nil?

  inline_match = lines[index].match(/^- #{Regexp.escape(label)}:\s*(.*)$/)
  inline_value = inline_match[1].to_s.strip
  return inline_value unless inline_value.empty?

  nested_lines = []
  cursor = index + 1
  while cursor < lines.length
    line = lines[cursor]
    break if line.match?(/^## /)
    break if line.match?(/^- [^ ].*:\s*/)

    stripped = line.strip
    unless stripped.empty?
      nested_lines << stripped.sub(/\A-\s+/, "").strip
    end
    cursor += 1
  end

  nested_lines.reject(&:empty?).join("\n")
end

errors = []
warnings = []

if blank_string?(options[:task_id])
  errors << "missing required --task TASK_ID"
end

backlog = nil
runtime_contract = nil
task = nil
task_packet = {}
report_path = ""
report_content = ""
delivery_state = ""

unless errors.any?
  begin
    backlog = OpsV03ControlPlane.load_yaml(options[:backlog_path])
  rescue SystemExit => e
    errors << e.message
  end

  begin
    runtime_contract = OpsV03ControlPlane.load_yaml(options[:runtime_contract_path])
  rescue SystemExit => e
    errors << e.message
  end
end

unless errors.any?
  task = OpsV03ControlPlane.find_task(backlog, options[:task_id])
  errors << "unknown task id #{options[:task_id].inspect}" if task.nil?
end

unless errors.any?
  lane_acceptance = runtime_contract.dig("control_plane_rules", "lane_acceptance") || {}
  task_packet_fields = Array(lane_acceptance["task_packet_fields"])
  allowed_delivery_states = Array(lane_acceptance["allowed_delivery_states"])
  required_report_metadata = Array(lane_acceptance["required_report_metadata"])
  required_report_sections = Array(lane_acceptance["required_report_sections"])
  required_report_fields = lane_acceptance["required_report_fields"].is_a?(Hash) ? lane_acceptance["required_report_fields"] : {}

  task_packet_fields.each do |field|
    value = task[field]
    missing =
      if value.is_a?(Array)
        value.empty?
      elsif value.is_a?(Hash)
        value.empty?
      else
        blank_string?(value)
      end
    errors << "#{task['id']}: missing or empty task packet field #{field}" if missing
    task_packet[field] = !missing
  end

  report_path = task.dig("handoff", "report_path").to_s
  errors << "#{task['id']}: missing handoff.report_path" if blank_string?(report_path)

  unless blank_string?(report_path)
    absolute_report_path = File.join(options[:root], report_path)
    if File.exist?(absolute_report_path)
      report_content = File.read(absolute_report_path)
    else
      errors << "#{task['id']}: missing handoff report at #{report_path}"
    end
  end

  if report_content != ""
    required_report_metadata.each do |label|
      value = extract_metadata(report_content, label)
      errors << "#{task['id']}: report is missing metadata #{label}" if blank_string?(value)
      if label == "Task ID" && value != task["id"]
        errors << "#{task['id']}: report Task ID metadata must equal #{task['id']}"
      end
    end

    required_report_sections.each do |title|
      section = extract_section(report_content, title)
      errors << "#{task['id']}: report is missing section #{title}" if blank_string?(section)
    end

    required_report_fields.each do |title, labels|
      section = extract_section(report_content, title)
      next if blank_string?(section)

      Array(labels).each do |label|
        value = extract_section_field(section, label)
        errors << "#{task['id']}: report section #{title} is missing field #{label}" if blank_string?(value)
        delivery_state = value if title == "Delivery state" && label == "state"
      end
    end

    unless blank_string?(delivery_state)
      unless allowed_delivery_states.include?(delivery_state)
        errors << "#{task['id']}: report delivery state #{delivery_state.inspect} must be one of #{allowed_delivery_states.join(', ')}"
      end
      if options[:require_completed] && delivery_state != "completed"
        errors << "#{task['id']}: delivery state must be completed for acceptance intake"
      elsif delivery_state != "completed"
        warnings << "#{task['id']}: delivery state is #{delivery_state}; handoff is structurally valid but not claimable"
      end
    end
  end
end

payload = {
  ok: errors.empty?,
  task_id: options[:task_id],
  report_path: report_path,
  delivery_state: delivery_state,
  claimable: delivery_state == "completed" && errors.empty?,
  packet_fields_present: task_packet,
  warnings: warnings,
  errors: errors
}

if options[:json]
  puts JSON.pretty_generate(payload)
else
  status = errors.empty? ? "PASS" : "FAIL"
  puts "ops:v0.3:intake-audit #{status}"
  puts "- task_id: #{payload[:task_id]}"
  puts "- report_path: #{payload[:report_path]}" unless blank_string?(payload[:report_path])
  puts "- delivery_state: #{payload[:delivery_state]}" unless blank_string?(payload[:delivery_state])
  warnings.each { |warning| puts "- warning: #{warning}" }
  errors.each { |error| puts "- #{error}" }
end

exit(errors.empty? ? 0 : 1)
