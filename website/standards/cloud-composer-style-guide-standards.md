# Cloud Composer DAG Style Guide

## 1. Introduction

This document outlines the standards and best practices for developing, deploying, and managing Directed Acyclic Graphs (DAGs) within Google Cloud Composer environments. Adhering to this guide ensures consistency, reliability, and maintainability.

---

## 2. File Naming and Structure

### 2.1. DAG File Naming

- Use lowercase letters, numbers, and underscores (`_`).
- Follow the pattern: `<team_or_domain>_<project_or_source>_<workflow_description>.py`
  - Example: `marketing_google_ads_daily_sync.py`
  - Example: `data_science_customer_churn_prediction_train.py`
- The filename should clearly indicate the DAG's purpose.

### 2.2. Directory Structure

dags/
├── team_a/
│   ├── project_x/
│   │   ├── dag_file_1.py
│   │   └── dag_file_2.py
│   └── common/  # Shared utilities/hooks for team_a
│       └── operators/


- Group DAGs by team, project, or logical domain.
- Store reusable custom operators/hooks/sensors in `plugins/` (if using Airflow 1 style) or within the `dags/` folder structure (Airflow 2+).
- Keep SQL scripts separate from Python DAG files, preferably in a dedicated `sql/` directory, organized similarly to DAGs. Load them using Jinja templating.

---

## 3. DAG Definition

### 3.1. Imports

- Follow PEP 8 import ordering:
  1. Standard library imports (e.g., `datetime`, `os`)
  2. Third-party imports (e.g., `pendulum`, `airflow`)
  3. Local application/library imports (e.g., custom hooks/operators)
- Import modules explicitly (e.g., `import datetime`, `from airflow.operators.bash import BashOperator`).
- Avoid wildcard imports (`from module import *`).

### 3.2. Default Arguments (`default_args`)

- Define a `default_args` dictionary for common task parameters.
- **Required `default_args`:**
  - `owner`: Team or individual responsible (e.g., `'data-engineering-team'`).
  - `start_date`: Use `pendulum` for timezone-aware, unambiguous start dates. Example: `pendulum.datetime(2023, 1, 1, tz="UTC")`.
  - `email_on_failure`: `True` or `False`.
  - `email_on_retry`: `False` (usually).
  - `retries`: Sensible default (e.g., `1` or `2`).
  - `retry_delay`: Use `datetime.timedelta`. Example: `timedelta(minutes=5)`.
- **Recommended `default_args`:**
  - `depends_on_past`: Usually `False`, unless strict sequential processing is needed.
  - `email`: List of emails or distribution list for alerts.

```python
import pendulum
from datetime import timedelta

default_args = {
    'owner': 'data-platform-team',
    'depends_on_past': False,
    'start_date': pendulum.datetime(2023, 10, 26, tz="UTC"),
    'email': ['data-alerts@example.com'],
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 1,
    'retry_delay': timedelta(minutes=5),
}
```

### 3.3. DAG Instantiation

- **`dag_id`**: Must be unique across all DAGs. Should match the filename without the `.py` extension.
- **`default_args`**: Assign the defined `default_args` dictionary.
- **`description`**: Provide a clear, concise description of the DAG's purpose.
- **`schedule_interval`**:
  - Use cron presets (`@daily`, `@hourly`, `@once`) or cron expressions (`'0 5 * * *'`).
  - Use `None` for externally triggered DAGs.
  - Document the schedule clearly (e.g., `# Runs daily at 5 AM UTC`).
- **`catchup=False`**: Set explicitly to `False` unless historical runs are intentionally required. This prevents unexpected backfills.
- **`tags`**: Use tags for filtering and organizing DAGs in the UI (e.g., `['marketing', 'google-ads', 'daily']`).

```python
from airflow import DAG

with DAG(
    dag_id='marketing_google_ads_daily_sync',
    default_args=default_args,
    description='Sync daily Google Ads performance data to BigQuery',
    schedule_interval='0 6 * * *',  # Daily at 6 AM UTC
    catchup=False,
    tags=['marketing', 'google-ads', 'daily', 'bigquery'],
) as dag:
    # Task definitions go here
    pass
```
### 4.1. Task IDs (`task_id`)

- Use clear, descriptive, lowercase names with underscores.
- Should indicate the action and subject (e.g., `extract_ads_data`, `transform_users_table`, `load_summary_to_bq`).
- Keep them concise but understandable.
- Must be unique within the DAG.

### 4.2. Operators

- Prefer official Airflow providers and built-in operators where available (e.g., `GCSToBigQueryOperator`, `BashOperator`, `DataflowSubmitJobOperator`).
- Use the `PythonOperator` for custom Python logic, but keep the callable functions:
  - Focused on a single task.
  - Importable or defined clearly within the DAG file (for simple functions).
  - Testable independently.
- Be mindful of Python dependencies – ensure they are installed on Composer workers.
- Use the `BashOperator` with caution. Prefer operators that interact directly with services. If using `BashOperator`:
  - Keep scripts simple.
  - Parameterize scripts using Jinja templating.
  - Ensure required binaries/tools are available on workers.
  - Be mindful of security implications (avoid running arbitrary user input).
- Consider custom operators for complex, reusable logic involving multiple steps or external systems.

### 4.3. Parameters and Idempotency

- Parameterize tasks using Jinja templating with Airflow Variables, Macros (`{{ ds }}`, `{{ execution_date }}`), and Connections.
- Avoid hardcoding:
  - Configuration (paths, table names, connection IDs).
  - Secrets (API keys).
  - Environment specifics.
- Design tasks to be idempotent: Running a task multiple times with the same input should produce the same result. This is crucial for retries and backfills.

```python
from airflow.providers.google.cloud.transfers.gcs_to_bigquery import GCSToBigQueryOperator

load_data_to_bq = GCSToBigQueryOperator(
    task_id='load_ads_data_to_bq',
    bucket='my-landing-bucket',
    source_objects=['google_ads_data/{{ ds_nodash }}/ads_performance.csv'],
    destination_project_dataset_table='my-project.marketing_staging.google_ads_performance_${{ ds_nodash }}',
    schema_fields=None,  # Or provide schema
    autodetect=True,
    write_disposition='WRITE_TRUNCATE',  # Ensures idempotency
    source_format='CSV',
    skip_leading_rows=1,
    create_disposition='CREATE_IF_NEEDED',
    gcp_conn_id='google_cloud_default',  # Use Airflow Connection ID
)
```

