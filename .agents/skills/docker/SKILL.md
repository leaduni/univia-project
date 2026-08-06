---
name: docker
description: Best practices for Docker and Docker Compose in this project. Use when creating, reviewing, or debugging Dockerfiles, docker-compose.yml files, or containerized services (backend API, Judge0 code execution engine). Covers image hygiene, multi-stage builds, Compose networking, volumes, environment handling, and health checks.
---

## What I do

Guide Dockerfile and Docker Compose authoring and review so containers are small, reproducible, debuggable, and match the project's existing infrastructure (FastAPI backend + Judge0).

## When to use me

Use this skill whenever you are writing or editing a `Dockerfile`, `docker-compose.yml`, `.dockerignore`, or container entrypoint in this repo. Also use it when troubleshooting "it works locally but not in Docker" issues.

## Project context

- `backend/Dockerfile` + `backend/docker-compose.yml`: FastAPI app (see `requirements.txt`).
- `motor_ejecucion_codigo/judge0/docker-compose.yml` + `judge0.conf`: Judge0 code execution engine (multi-service Compose: server, workers, db, redis, executor).

## Dockerfile rules

- Use a pinned base image (avoid `:latest`) and prefer slim variants to reduce attack surface and size.
- Use multi-stage builds when the app needs a build step (dependencies → runtime). Copy only artifacts needed at runtime.
- Install dependencies with checksums or lockfiles where available; do not install with `--no-cache`-less package managers without pinning.
- Run as a non-root user when possible (`USER` directive) unless the image's functionality requires root (Judge0 executor).
- Keep the layer cache healthy: copy `requirements.txt`/`package.json` before source code, then install, then copy the rest.
- Set explicit `EXPOSE` and document `ENV` vars. Do not bake secrets into images — read from env at runtime.
- Use `CMD` with exec form (`["..."]`) instead of shell form where practical.

## docker-compose rules

- Prefer the Compose v2 schema; keep service names aligned with existing infra (`db`, `redis`, `server`, `worker`, `executor`).
- Use `${VAR:-default}` for env values; load secrets via `.env` referenced from compose, never commit real secrets.
- Set explicit `depends_on` with `condition: service_healthy` (not just service_started) when services must wait for readiness.
- Use named volumes for persistent data (DB, Judge0 submissions) instead of bind mounts unless hot-reload is needed.
- Restrict published ports to what is actually consumed; bind DB/redis to internal networks only.
- Add health checks (`healthcheck:`) for every long-running service; matching the app's health endpoint where one exists.

## Debugging checklist

1. Rebuild with `--no-cache` to rule out stale layers: `docker compose build --no-cache`.
2. Check logs: `docker compose logs -f <service>`.
3. Inspect env leaks: `docker compose config` shows the resolved environment without starting anything.
4. Verify the container can reach peers by service name (Compose DNS), not `localhost`.
5. Confirm resource limits (Judge0: cpu/limits for workers) match `judge0.conf`.

## Local-first verification

Before finishing a change, run:

```bash
docker compose config
docker compose build
docker compose up -d
docker compose ps
```
