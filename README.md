# DeployHub

A cloud-based web application deployment platform inspired by modern deployment platforms such as Vercel.

DeployHub accepts a Git repository URL, queues the deployment as an asynchronous job, builds the application inside an isolated Docker environment, stores the resulting build output in object storage, and serves the deployed application.

> **Status:** In active development

## Architecture

```text
                         ┌──────────────────┐
                         │     Frontend     │
                         └────────┬─────────┘
                                  │
                                  │ repoUrl
                                  ▼
                         ┌──────────────────┐
                         │  Upload Service  │
                         │                  │
                         │ Generate ID      │
                         │ Create Job       │
                         │ Queue Job        │
                         └────────┬─────────┘
                                  │
                                  │ { id, repoUrl }
                                  ▼
                         ┌──────────────────┐
                         │      Redis       │
                         │                  │
                         │   buildQueue     │
                         │   deployment     │
                         │     status       │
                         └────────┬─────────┘
                                  │
                                  │ Consume Job
                                  ▼
                         ┌──────────────────┐
                         │  Build Service   │
                         └────────┬─────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │     Docker Container    │
                    │                         │
                    │     Clone Repository    │
                    │     Install Dependencies│
                    │     Run Build           │
                    └────────────┬────────────┘
                                 │
                                 │ Build Output
                                 ▼
                         ┌──────────────────┐
                         │   Cloudflare R2  │
                         │                  │
                         │ Deployment Files │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │ Request Handler  │
                         └────────┬─────────┘
                                  │
                                  ▼
                                Users
```

## Project Structure

```text
deployhub/

├── frontend/
│
├── upload-service/
│   ├── src/
│   │   ├── index.ts
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

## Architecture Overview

DeployHub is designed as a service-oriented deployment pipeline.

Each service has a specific responsibility:

### Upload Service

Responsible for accepting deployment requests and creating deployment jobs.

The upload service:

- Receives a Git repository URL
- Generates a unique deployment ID
- Creates a deployment job
- Pushes the job to the Redis build queue
- Tracks the initial deployment status
- Provides a deployment status endpoint

The upload service does **not** clone repositories or perform builds.

### Build Service

The build service consumes deployment jobs from Redis.

For each job, it will:

- Receive the deployment ID and repository URL
- Create an isolated Docker container
- Clone the repository inside the container
- Install project dependencies
- Run the application's build command
- Collect the resulting build output
- Upload the build output to Cloudflare R2
- Update the deployment status
- Clean up the build environment

### Docker Build Environment

User application code is executed inside isolated Docker containers.

The container provides an isolated environment containing:

- Repository files
- Runtime dependencies
- Build tools
- Temporary build filesystem
- Network and process isolation

The repository is cloned inside the container rather than being permanently stored on the host machine.

After the build completes, the container can be removed.

### Cloudflare R2

Cloudflare R2 is used as persistent object storage for deployment output.

The intended storage structure is:

```text
deploy-hub/

└── <deployment-id>/

    ├── index.html
    ├── assets/
    │   ├── app.js
    │   └── style.css
    └── ...
```

Source repositories are not intended to be permanently stored in R2.

Only the resulting deployable build output is stored.

### Request Handler

The request handler will be responsible for serving deployed applications.

It will eventually:

- Receive incoming deployment requests
- Resolve deployment IDs
- Retrieve deployment files from R2
- Serve static assets
- Route requests to the appropriate deployment

## Current Implementation

### Upload Service

The upload service currently handles:

- Receiving a Git repository URL
- Generating a unique deployment ID
- Creating a deployment job
- Pushing deployment jobs to Redis
- Tracking deployment status
- Providing a deployment status endpoint

A deployment job has the following structure:

```json
{
  "id": "abc123",
  "repoUrl": "https://github.com/username/project"
}
```

The job is serialized and stored in the Redis build queue.

### Deployment Flow

```text
Git Repository URL
        |
        v
POST /deploy
        |
        v
Generate Deployment ID
        |
        v
Create Deployment Job
        |
        | { id, repoUrl }
        v
Redis buildQueue
        |
        v
Build Service
        |
        v
Docker Container
        |
        ├── Clone Repository
        ├── Install Dependencies
        └── Run Build
                 |
                 v
           Build Output
                 |
                 v
            Cloudflare R2
                 |
                 v
          Request Handler
                 |
                 v
               Users
```

## Tech Stack

### Backend

- Node.js
- TypeScript
- Express.js
- Redis
- simple-git

### Build Infrastructure

- Docker
- Docker containers
- Git

### Storage

- Cloudflare R2
- AWS SDK for JavaScript

Cloudflare R2 is accessed through its S3-compatible API.

### Queue and State Management

Redis is used as the communication and state layer between deployment services.

Redis provides:

- Deployment job queues
- Deployment status tracking
- Communication between services

### Frontend

- React
- TypeScript
- Tailwind CSS

The frontend is planned and currently under development.

## Upload Service

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

Do not commit `.env` or expose your R2 credentials.

### Running the Service

```bash
npm run dev
```

The service runs on:

```text
http://localhost:3000
```

## API

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
  "id": "abc123"
}
```

The deployment ID is used throughout the deployment pipeline to identify a specific deployment.

The request only queues the deployment. Repository cloning and application building are handled by the build service.

### Deployment Status

```http
GET /status?id=<deployment-id>
```

Example:

```http
GET /status?id=abc123
```

Response:

```json
{
  "response": "queued"
}
```

Deployment states will eventually include states such as:

```text
queued
building
built
deployed
failed
```

## Redis

Redis acts as the communication and state layer between the deployment services.

### Build Queue

Deployment jobs are stored in a Redis List named `buildQueue`.

Example:

```text
buildQueue

┌─────────────────────────────────────────────────────────┐
│ {"id":"abc123","repoUrl":"https://github.com/user/app"} │
│ {"id":"xyz789","repoUrl":"https://github.com/user/web"} │
└─────────────────────────────────────────────────────────┘
```

The upload service adds jobs to the queue.

The build service will consume jobs from the queue.

### Deployment Status

Deployment states are stored in a Redis Hash named `status`.

Example:

```text
status

abc123  -> queued
xyz789  -> building
pqr456  -> deployed
```

The status can be retrieved through the `/status` endpoint.

## Build Pipeline

The planned build pipeline is:

```text
Redis Job
    |
    v
Build Service
    |
    v
Create Docker Container
    |
    v
Clone Repository
    |
    v
Install Dependencies
    |
    v
Run Build Command
    |
    v
Collect Build Output
    |
    v
Upload Output to R2
    |
    v
Update Deployment Status
    |
    v
Destroy Container
```

The source repository and temporary dependencies only need to exist during the build process.

## Scalability

DeployHub uses asynchronous job processing to separate deployment requests from application builds.

The upload service does not perform resource-intensive builds. Instead, it places deployment jobs into Redis and immediately returns a deployment ID.

This allows build workers to operate independently.

Multiple build service instances can consume jobs from the same queue:

```text
                    Redis
                 buildQueue
                     |
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
   Build Worker  Build Worker  Build Worker
        │            │            │
     Docker       Docker       Docker
   Container     Container     Container
```

This architecture allows build capacity to be increased independently of the API layer.

The current implementation is intended as a learning-focused foundation and is not yet production-ready.

## Roadmap

- [x] Git repository URL handling
- [x] Deployment ID generation
- [x] Redis integration
- [x] Redis deployment queue
- [x] Deployment status tracking
- [x] Upload service
- [ ] Build service
- [ ] Redis job consumer
- [ ] Docker-based isolated builds
- [ ] Application build pipeline
- [ ] Build output upload to R2
- [ ] Build logs
- [ ] Build failure handling
- [ ] Container cleanup
- [ ] Request handler
- [ ] Deployment URLs
- [ ] Deployment history
- [ ] Frontend dashboard
- [ ] Custom deployment domains
- [ ] Production deployment
- [ ] Monitoring and observability

## Objective

The project focuses on understanding the architecture and engineering concepts behind modern cloud deployment platforms.

Key areas include:

- Service-oriented architecture
- Asynchronous job processing
- Redis-based queues
- Worker architecture
- Docker-based build isolation
- Object storage
- Build pipelines
- Deployment status tracking
- Application routing
- Cloud infrastructure
- Scalable service design

## Project Status

DeployHub is currently under active development.

The upload service and initial Redis-based deployment pipeline are functional.

The next stage is implementing the build service, Redis job consumer, and Docker-based isolated build environment.

The request handler, frontend, deployment routing, and production infrastructure will be developed as the project progresses.