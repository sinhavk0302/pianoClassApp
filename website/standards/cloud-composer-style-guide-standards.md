# Cloud Composer DAG Style Guide

## 1. Introduction

This document outlines the standards and best practices for developing, deploying, and managing Directed Acyclic Graphs (DAGs) within Google Cloud Composer environments. Adhering to this guide ensures consistency, improves readability, simplifies maintenance, and enhances the reliability of our data pipelines.

## 2. File Naming and Structure

### 2.1. DAG File Naming

*   Use lowercase letters, numbers, and underscores (`_`).
*   Follow the pattern: `<team_or_domain>_<project_or_source>_<workflow_description>.py`
    *   Example: `marketing_google_ads_daily_sync.py`
    *   Example: `data_science_customer_churn_prediction_train.py`
*   The filename should clearly indicate the DAG's purpose.

### 2.2. Directory Structure

Organize DAGs and related files within the Composer GCS bucket (`dags/` folder) logically. A recommended structure:

dags/ ├── team_a/ │ ├── project_x/ │ │ ├── dag_file_1.py │ │ └── dag_file_2.py │ └── common/ # Shared utilities/hooks for team_a │ └── operators/ │ └── custom_operator.py ├── team_b/ │ └── project_y/ │ └── dag_file_3.py ├── common_utils/ # Utilities shared across all teams │ └── hooks/ │ └── custom_hook.py ├── sql/ # Store SQL scripts separately │ └── project_x/ │ ├── transform_data.sql │ └── load_summary.sql ├── tests/ # DAG validation and unit tests │ └── team_a/ │ └── project_x/ │ └── test_dag_file_1.py └── requirements.txt # If managing PyPI packages outside Composer UI


*   Group DAGs by team, project, or logical domain.
*   Store reusable custom operators/hooks/sensors in `plugins/` (if using Airflow 1 style) or within the `dags/` folder structure (Airflow 2+).
*   Keep SQL scripts separate from Python DAG files, preferably in a dedicated `sql/` directory, organized similarly to DAGs. Load them using Jinja templating.

## 3. DAG Definition

### 3.1. Imports

*   Follow PEP 8 import ordering:
    1.  Standard library imports (e.g., `datetime`, `os`)
    2.  Third-party imports (e.g., `pendulum`, `airflow`)
    3.  Local application/library imports (e.g., custom hooks/operators)
*   Import modules explicitly (e.g., `import datetime`, `from airflow.operators.bash import BashOperator`).
*   Avoid wildcard imports (`from module import *`).

### 3.2. Default Arguments (`default_args`)

*   Define a `default_args` dictionary for common task parameters.
*   **Required `default_args`:**
    *   `owner`: Team or individual responsible (e.g., `'data-engineering-team'`).
    *   `start_date`: Use `pendulum` for timezone-aware, unambiguous start dates. Example: `pendulum.datetime(2023, 1, 1, tz="UTC")`.
    *   `email_on_failure`: `True` or `False`.
    *   `email_on_retry`: `False` (usually).
    *   `retries`: Sensible default (e.g., `1` or `2`).
    *   `retry_delay`: Use `datetime.timedelta`. Example: `timedelta(minutes=5)`.
*   **Recommended `default_args`:**
    *   `depends_on_past`: Usually `False`, unless strict sequential processing is needed.
    *   `email`: List of emails or distribution list for alerts.

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
### 3.3. DAG Instantiation
dag_id: Must be unique across all DAGs. Should match the filename without the .py extension.
default_args: Assign the defined default_args dictionary.
description: Provide a clear, concise description of the DAG's purpose.
schedule_interval:
Use cron presets (@daily, @hourly, @once) or cron expressions ('0 5 * * *').
Use None for externally triggered DAGs.
Document the schedule clearly (e.g., # Runs daily at 5 AM UTC).
catchup=False: Set explicitly to False unless historical runs are intentionally required. This prevents unexpected backfills.
tags: Use tags for filtering and organizing DAGs in the UI (e.g., ['marketing', 'google-ads', 'daily']).
from airflow import DAG

with DAG(
    dag_id='marketing_google_ads_daily_sync',
    default_args=default_args,
    description='Sync daily Google Ads performance data to BigQuery',
    schedule_interval='0 6 * * *', # Daily at 6 AM UTC
    catchup=False,
    tags=['marketing', 'google-ads', 'daily', 'bigquery'],
) as dag:
    # Task definitions go here
    pass

## 4. Task Definition
### 4.1. Task IDs (task_id)
Use clear, descriptive, lowercase names with underscores.
Should indicate the action and subject (e.g., extract_ads_data, transform_users_table, load_summary_to_bq).
Keep them concise but understandable.
Must be unique within the DAG.
### 4.2. Operators
Prefer official Airflow providers and built-in operators where available (e.g., GCSToBigQueryOperator, BashOperator, DataflowSubmitJobOperator).
Use the PythonOperator for custom Python logic, but keep the callable functions:
Focused on a single task.
Importable or defined clearly within the DAG file (for simple functions).
Testable independently.
Be mindful of Python dependencies – ensure they are installed on Composer workers.
Use the BashOperator with caution. Prefer operators that interact directly with services. If using BashOperator:
Keep scripts simple.
Parameterize scripts using Jinja templating.
Ensure required binaries/tools are available on workers.
Be mindful of security implications (avoid running arbitrary user input).
Consider custom operators for complex, reusable logic involving multiple steps or external systems.
### 4.3. Parameters and Idempotency
Parameterize tasks using Jinja templating with Airflow Variables, Macros ({{ ds }}, {{ execution_date }}), and Connections.
Avoid hardcoding: Configuration (paths, table names, connection IDs), secrets (API keys), environment specifics.
Design tasks to be idempotent: Running a task multiple times with the same input should produce the same result. This is crucial for retries and backfills.
Example: Use WRITE_TRUNCATE or MERGE statements instead of simple INSERT for loading data. Check if data already exists before processing.

from airflow.providers.google.cloud.transfers.gcs_to_bigquery import GCSToBigQueryOperator

load_data_to_bq = GCSToBigQueryOperator(
    task_id='load_ads_data_to_bq',
    bucket='my-landing-bucket',
    source_objects=['google_ads_data/{{ ds_nodash }}/ads_performance.csv'],
    destination_project_dataset_table='my-project.marketing_staging.google_ads_performance_${{ ds_nodash }}',
    schema_fields=None, # Or provide schema
    autodetect=True,
    write_disposition='WRITE_TRUNCATE', # Ensures idempotency
    source_format='CSV',
    skip_leading_rows=1,
    create_disposition='CREATE_IF_NEEDED',
    gcp_conn_id='google_cloud_default', # Use Airflow Connection ID
)

5. Task Dependencies
Use the bitshift operators (>>, <<) for setting dependencies clearly and visually.
Use set_upstream() / set_downstream() methods for more complex dependency scenarios if needed.
Use airflow.utils.helpers.chain() for linear sequences.
Use airflow.utils.helpers.cross_downstream() for fan-in/fan-out patterns.
Ensure the dependency structure reflects the actual workflow logic. Visualize it in the Airflow UI Graph View.
task_1 = BashOperator(...)
task_2a = PythonOperator(...)
task_2b = GCSToBigQueryOperator(...)
task_3 = DataflowSubmitJobOperator(...)

# Define dependencies
task_1 >> [task_2a, task_2b] >> task_3

## 6. Variables and Connections
DO NOT hardcode credentials, API keys, file paths, or configuration in DAG code.
Use Airflow Connections to store connection details (host, schema, login, password, extra config like GCP key paths/JSON). Access them via conn_id parameters in operators or using Hooks.
Use Airflow Variables for other configuration values (e.g., file paths, table names, API endpoints, thresholds). Access them via Jinja templating ({{ var.value.my_variable }}) in operator parameters or Variable.get() within PythonOperator (use sparingly at the top level due to performance).
Use a consistent naming convention for Variables and Connections (e.g., gcp_data_project_id, api_source_x_credentials).
Leverage Secrets Managers (like Google Secret Manager) as the Airflow Secrets Backend for enhanced security, especially for sensitive credentials.

7. Code Quality
PEP 8: Follow PEP 8 Python style guidelines. Use linters (e.g., flake8, pylint) and formatters (e.g., black) integrated into your development workflow.
Comments: Add comments to explain complex logic, business rules, or non-obvious decisions (# Why, not what). Keep comments up-to-date.
Docstrings: Add docstrings to the DAG itself (in the description parameter) and to any custom Python functions or operators, explaining their purpose, arguments, and return values.
Modularity: Break down complex Python logic into smaller, reusable, testable functions.
Avoid Top-Level Code: Minimize code execution directly within the DAG file outside of task definitions. Heavy computations or external calls at the top level slow down DAG parsing by the Scheduler.
8. Testing
DAG Validation: Use the Airflow CLI to parse and check DAGs for syntax errors and basic structure issues: airflow dags test <dag_id> <execution_date> or airflow dags list-import-errors.
Unit Testing: Write unit tests for custom Python functions used in PythonOperator and for custom Hooks/Operators. Use libraries like pytest.
Integration Testing: Consider testing task interactions, possibly using a local Airflow setup (e.g., Docker) or a dedicated development Composer environment. Test interactions with external services (databases, APIs) where feasible.
9. Error Handling and Alerting
Retries: Configure appropriate retries and retry_delay (see Default Arguments).
Alerting:
Use email_on_failure=True and configure email settings.
Implement custom alerting (Slack, PagerDuty, etc.) using on_failure_callback / on_success_callback / sla_miss_callback DAG or task parameters, pointing to Python functions that send notifications.
Leverage specific operators for alerting if available (e.g., SlackWebhookOperator).
SLAs: Define Service Level Agreements (sla parameter in DAG or tasks) to get alerts if tasks miss their expected completion time.
10. Performance and Optimization
Idempotency: Critical for reliable retries and backfills.
Task Granularity: Break down long-running tasks into smaller, more manageable units. This improves parallelism, fault isolation, and debugging.
Parallelism: Configure Composer environment (core.parallelism) and DAG (max_active_runs, concurrency) / task (pool, max_active_tis_per_dag) concurrency settings appropriately to balance throughput and resource usage. Avoid overwhelming source/destination systems.
Resource Management: Be mindful of the resources (CPU, memory) consumed by tasks, especially within PythonOperator or BashOperator. Choose appropriate worker sizes if necessary (though Composer auto-scales).
Efficient Operators: Use operators optimized for specific tasks (e.g., GCSToBigQueryOperator is generally more efficient than reading from GCS and writing to BQ within a PythonOperator).
11. Security
Connections & Secrets: Use Airflow Connections with a Secrets Backend (e.g., Google Secret Manager) for sensitive information. Avoid storing secrets directly in Airflow Variables or code.
Service Account Permissions: Follow the principle of least privilege for the Composer environment's service account and any service accounts used via connections. Grant only the necessary IAM roles on GCP resources.
Code Security: Be cautious with BashOperator and PythonOperator code. Avoid executing untrusted input. Sanitize parameters.
Network Security: Configure Composer environment networking (e.g., Private IP, VPC Peering, Firewall rules) according to organizational security policies.
12. Version Control
Store all DAG code, SQL scripts, tests, and related configuration in a Git repository.
Use meaningful commit messages.
Use branching strategies (e.g., Gitflow) for development and releases.
Integrate CI/CD practices for automated testing and deployment of DAGs to the Composer bucket.
