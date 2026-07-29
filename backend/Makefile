.PHONY: help install install-dev sync lint format check test test-unit test-integration test-e2e test-cov run clean clean-all clean-venv docker-build docker-run

IMAGE ?= custom_data_toolkit:latest
PORT ?= 8000
WORKERS ?= 1

help: ## Display this help.
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

install: ## Install runtime dependencies.
	uv sync

install-dev: ## Install all dependencies.
	uv sync --group dev --group test

sync: ## Sync dependencies.
	uv sync --group dev --group test

lint: ## Run Ruff lint.
	uv run ruff check .

format: ## Format code with Ruff.
	uv run ruff format .

check: lint test ## Run quality checks.

test: ## Run all tests.
	uv run pytest

test-unit: ## Run unit tests.
	uv run pytest tests/unit

test-integration: ## Run integration tests.
	uv run pytest tests/integration

test-e2e: ## Run E2E tests.
	uv run pytest tests/e2e

test-cov: ## Run tests with coverage.
	uv run pytest --cov=src/custom_data_toolkit --cov-report=html

run: ## Run the development server.
	uv run uvicorn custom_data_toolkit.main:app --host 0.0.0.0 --port $(PORT) --workers $(WORKERS)



clean: ## Remove build artifacts.
	rm -rf dist *.egg-info .ruff_cache .pytest_cache htmlcov

clean-all: clean clean-venv ## Remove all generated artifacts.

clean-venv: ## Remove virtual environment.
	rm -rf .venv
