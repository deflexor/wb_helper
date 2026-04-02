ALTER TABLE app_config_audit
    RENAME COLUMN old_value_json TO old_value;

ALTER TABLE app_config_audit
    RENAME COLUMN new_value_json TO new_value;
