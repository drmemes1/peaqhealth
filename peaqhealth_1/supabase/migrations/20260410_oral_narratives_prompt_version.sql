-- Add prompt_version to oral_narratives cache so material prompt changes
-- automatically bypass stale cached rows without manual truncation.
-- See memory/project_oral_narrative_prompt_versioning.md for the convention.

alter table oral_narratives
  add column if not exists prompt_version text not null default 'v1';

alter table oral_narratives
  drop constraint if exists oral_narratives_user_id_collection_date_key;

alter table oral_narratives
  add constraint oral_narratives_user_id_collection_date_prompt_version_key
  unique (user_id, collection_date, prompt_version);
