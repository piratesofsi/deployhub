````markdown
# DeployHub 🚀

A cloud-based web application deployment platform inspired by modern deployment platforms like Vercel.

DeployHub allows users to provide a Git repository URL and prepares the application for deployment through a distributed deployment pipeline.

> 🚧 **Project Status:** Under active development

---

## 🏗️ Architecture

DeployHub is being built as a service-oriented deployment platform.

```text
                     ┌─────────────────┐
                     │    Frontend     │
                     └────────┬────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │ Request Handler │
                     └────────┬────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │ Upload Service  │
                     └──────┬─────┬────┘
                            │     │
                     Clone  │     │ Upload
                            │     ▼
                            │  ┌─────────────┐
                            │  │ Cloudflare  │
                            │  │     R2      │
                            │  └─────────────┘
                            │
                            ▼
                     ┌─────────────────┐
                     │      Redis      │
                     │   Build Queue   │
                     └────────┬────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │  Build Service  │
                     └────────┬────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │     Deployed    │
                     │      App        │
                     └─────────────────┘
````

---

## 📁 Project Structure

```text
deployhub/
│
├── frontend/              # Deployment dashboard (planned)
│
├── upload-service/        # Handles repository upload pipeline
│   ├── src/
│   │   ├── index.ts
│   │   ├── file.ts
│   │   ├── r2.ts
│   │   └── utils.ts
│   ├── package.json
│   ├── package-lock.json
│   └── tsconfig.json
│
├── build-service/         # Builds submitted applications (planned)
│
├── request-handler/       # Serves deployed applications (planned)
│
├── .gitignore
└── README.md
```

---

## ⚙️ Current Implementation

### Upload Service

The upload service currently supports:

* Accepting a Git repository URL through `/deploy`
* Generating a unique deployment ID
* Cloning repositories using `simple-git`
* Recursively traversing repository files
* Uploading files to Cloudflare R2
* Storing deployment IDs in a Redis build queue
* Tracking deployment status using Redis hashes
* Checking deployment status through `/status`

### Current Flow

```text
GitHub Repository
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
Traverse Files
       │
       ▼
Upload Files → Cloudflare R2
       │
       ▼
Push Deployment ID → Redis
       │
       ▼
Store Status → Redis
```

---

## 🛠️ Tech Stack

### Backend

* Node.js
* TypeScript
* Express.js
* simple-git

### Storage

* Cloudflare R2
* AWS SDK for JavaScript (S3-compatible API)

### Queue & State

* Redis

### Frontend

* React
* TypeScript
* Tailwind CSS

> Frontend implementation is planned.

---

## 🚀 Upload Service

### Installation

```bash
cd upload-service
npm install
```

### Environment Variables

Create a `.env` file inside `upload-service`:

```env
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=deploy-hub
```

Do **not** commit your `.env` file.

### Run

```bash
npm run dev
```

The service runs on:

```text
http://localhost:3000
```

---

## 📡 API

### Deploy

```http
POST /deploy
```

Request:

```json
{
  "repoUrl": "https://github.com/username/project"
}
```

Response:

```json
{
  "id": "im299"
}
```

The deployment ID is used to identify the deployment throughout the pipeline.

---

### Check Deployment Status

```http
GET /status?id=<deployment-id>
```

Example:

```http
GET /status?id=im299
```

Response:

```json
{
  "status": "uploaded"
}
```

---

## ☁️ Cloudflare R2

Deployment source files are stored in Cloudflare R2 using the deployment ID as an object-key prefix.

Example:

```text
deploy-hub/
└── im299/
    ├── index.html
    ├── package.json
    ├── style.css
    └── src/
        └── app.js
```

This allows multiple deployments to coexist independently.

---

## 🔄 Redis

Redis is currently used for two purposes.

### Build Queue

Deployment IDs are pushed into a Redis List:

```text
buildQueue → [deployment-id]
```

### Deployment Status

Deployment states are stored in a Redis Hash:

```text
status
├── im299 → uploaded
├── abc123 → building
└── xyz789 → deployed
```

The build service will consume deployment IDs from the queue and update their status as the deployment progresses.

---

## 🗺️ Roadmap

* [x] Git repository upload
* [x] Repository file traversal
* [x] Cloudflare R2 integration
* [x] Redis connection
* [x] Redis build queue
* [x] Deployment status tracking
* [ ] Build worker
* [ ] Application build pipeline
* [ ] Build logs
* [ ] Request handler
* [ ] Deployment URLs
* [ ] Deployment history
* [ ] Frontend dashboard
* [ ] Custom deployment domains
* [ ] Improved error handling
* [ ] Production deployment

---

## 🎯 Goal

The goal of DeployHub is to understand and implement the core concepts behind modern cloud deployment platforms, including:

* Service-oriented architecture
* Asynchronous job processing
* Message queues
* Object storage
* Build workers
* Deployment isolation
* Build status tracking
* Application routing
* Cloud infrastructure

---

## 📌 Project Status

DeployHub is currently under active development.

The **upload-service and initial Redis/R2 pipeline are functional**, while the build, routing, and frontend services are being developed.

```
```
