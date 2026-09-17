# DeployHub

A cloud-based web application deployment platform inspired by modern platforms such as Vercel.

DeployHub accepts a Git repository URL, processes the application through a distributed deployment pipeline, builds it, and serves the resulting application.

> **Status:** In active development

---

## Table of Contents

- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Current Implementation](#current-implementation)
- [Deployment Flow](#deployment-flow)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Upload Service](#upload-service)
    - [Installation](#installation)
    - [Environment Variables](#environment-variables)
    - [Running the Service](#running-the-service)
- [API Reference](#api-reference)
  - [Deploy Repository](#1-deploy-repository)
  - [Get Deployment Status](#2-get-deployment-status)
- [Storage & State Management](#storage--state-management)
  - [Cloudflare R2 Storage Format](#cloudflare-r2-storage-format)
  - [Redis Architecture](#redis-architecture)
- [Roadmap](#roadmap)
- [Objective](#objective)

---

## Architecture

```text
                         ┌──────────────────┐
                         │     Frontend     │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │ Request Handler  │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │  Upload Service  │
                         └───────┬───┬──────┘
                                 │   │
                     Clone       │   │ Upload
                                 │   ▼
                                 │ ┌──────────────┐
                                 │ │ Cloudflare R2│
                                 │ └──────────────┘
                                 │
                                 ▼
                         ┌──────────────────┐
                         │      Redis       │
                         │   Build Queue    │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │  Build Service   │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │ Deployed Output  │
                         └──────────────────┘
