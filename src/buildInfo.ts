import rawBuildInfo from "../docs/BUILD_INFO.json";

type BuildInfoRecord = {
  app_version?: string;
  sim_version?: string;
  code_fingerprint?: string;
  build_time_utc?: string;
  created_at_utc?: string;
  notes?: string;
};

export const BUILD_INFO = rawBuildInfo as BuildInfoRecord;
