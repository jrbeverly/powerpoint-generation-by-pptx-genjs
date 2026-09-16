# Presentation Generation System — local developer tooling.

SHELL := /bin/bash
NPM ?= npm

.DEFAULT_GOAL := help

.PHONY: help install build lint test run visual visual-update validate

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-10s %s\n", $$1, $$2}'

install: ## Install pinned dependencies via npm ci
	$(NPM) ci

node_modules: package-lock.json ## Install pinned dependencies when node_modules is missing
	$(NPM) ci

build: node_modules ## Compile TypeScript into dist/
	$(NPM) run build

lint: node_modules ## Lint sources (ESLint) and check formatting (Prettier)
	$(NPM) run lint

test: node_modules ## Run unit tests (Vitest)
	$(NPM) test

run: build ## Generate dist/full-sprint.pptx from the full sample through the CLI
	$(NPM) start -- samples/full-sprint.json dist/full-sprint.pptx

visual: node_modules ## Compare the all-archetype deck with committed PNG baselines
	$(NPM) run visual

visual-update: node_modules ## Regenerate committed PNG baselines after visual review
	$(NPM) run visual:update

validate: build lint test run ## Full local validation, as invoked by CI
