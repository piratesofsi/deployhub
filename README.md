```markdown
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

```

---

## Project Structure

```text
deployhub/
│
├── frontend/
│
├── upload-service/
│   ├── src/
│   │   ├── index.ts
│   │   ├── file.ts
│   │   ├── r2.ts
│   │   └── utils.ts
│   ├── package.json
│   ├── package-lock.json
│   └── tsconfig.json
│
├── build-service/
│
├── request-handler/
│
├── .gitignore
└── README.md

```

---

## Current Implementation

### Upload Service

The upload service currently handles:

* Receiving a Git repository URL
* Generating a unique deployment ID
* Cloning the repository using `simple-git`
* Recursively traversing repository files
* Uploading source files to Cloudflare R2
* Adding deployments to a Redis build queue
* Tracking deployment status using Redis
* Providing a deployment status endpoint

---

## Deployment Flow

```text
Git Repository
      │
      ▼
POST /deploy
      │
      ▼
Generate Deployment ID
      │
      ▼
Clone Repository
      │
      ▼
Traverse Repository
      │
      ▼
Upload Files to Cloudflare R2
      │
      ▼
Add Deployment ID to Redis Queue
      │
      ▼
Store Deployment Status

```

---

## Tech Stack

### Backend

* **Node.js**
* **TypeScript**
* **Express.js**
* **simple-git**

### Storage

* **Cloudflare R2**
* **AWS SDK for JavaScript** (*Cloudflare R2 is accessed through its S3-compatible API*)

### Queue and State Management

* **Redis** (Used for deployment queues and deployment status tracking)

### Frontend

* **React**
* **TypeScript**
* **Tailwind CSS** (*Currently under development*)

---

## Getting Started

### Upload Service

#### Installation

```bash
cd upload-service
npm install

```

#### Environment Variables

Create a `.env` file inside the `upload-service` directory:

```env
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=deploy-hub

```

> **Warning:** Do not commit `.env` or expose your R2 credentials.

#### Running the Service

```bash
npm run dev

```

The service runs on: [http://localhost:3000](http://localhost:3000)

---

## API Reference

### 1. Deploy Repository

Initiates a deployment pipeline for a remote Git repository.

* **Endpoint:** `POST /deploy`
* **Headers:** `Content-Type: application/json`

**Request Body:**

```json
{
  "repoUrl": "[https://github.com/username/project](https://github.com/username/project)"
}

```

**Response:**

```json
{
  "id": "im299"
}

```

> The deployment ID is used throughout the pipeline to identify a specific deployment.

---

### 2. Get Deployment Status

Retrieves the current status of a deployment.

* **Endpoint:** `GET /status`
* **Query Parameters:** `id=<deployment-id>`

**Example Request:**

```text
GET /status?id=im299

```

**Response:**

```json
{
  "status": "uploaded"
}

```

---

## Storage & State Management

### Cloudflare R2 Storage Format

Source files are stored using the deployment ID as an object-key prefix:

```text
deploy-hub/
└── im299/
    ├── index.html
    ├── package.json
    ├── style.css
    └── src/
        └── app.js

```

This ensures different deployments maintain isolated file spaces.

---

### Redis Architecture

Redis acts as the communication and state layer between distributed deployment services.

#### Build Queue

Deployment IDs are pushed into a Redis List named `buildQueue`:

```text
buildQueue
    │
    ├── im299
    ├── abc123
    └── xyz789

```

The build service consumes deployment IDs from this queue sequentially for processing.

#### Deployment Status

Deployment states are stored in a Redis Hash named `status`:

```text
im299   -> uploaded
abc123  -> building
xyz789  -> deployed

```

Status updates can be retrieved using the `/status` API endpoint.

---

## Roadmap

* [x] Git repository cloning
* [x] Recursive file traversal
* [x] Cloudflare R2 integration
* [x] Redis integration
* [x] Deployment queue
* [x] Deployment status tracking
* [ ] Build service
* [ ] Application build pipeline
* [ ] Build logs
* [ ] Request handler
* [ ] Deployment URLs
* [ ] Deployment history
* [ ] Frontend dashboard
* [ ] Custom deployment domains
* [ ] Error handling and cleanup
* [ ] Production deployment

---

## Objective

The project is focused on understanding the core architecture and engineering concepts behind modern cloud deployment platforms, including:

* Service-oriented architecture
* Asynchronous job processing
* Redis-based queues
* Object storage
* Build workers
* Deployment isolation
* Build status tracking
* Application routing
* Cloud infrastructure

---

## Project Status

DeployHub is currently under active development. The upload service, Cloudflare R2 integration, and initial Redis pipeline are fully functional. The build service, request handler, and frontend dashboard are currently in active development.

```

```
