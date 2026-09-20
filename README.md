# DeployHub

A cloud-based web application deployment platform inspired by modern deployment platforms such as Vercel.

DeployHub accepts a Git repository URL, queues the deployment as an asynchronous job, builds the application inside an isolated Docker environment, stores the resulting deployment files in Cloudflare R2, and serves the deployed application through a custom request handler.

> **Status:** Core static deployment pipeline is functional

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
                    │                         │
                    │     package.json?       │
                    │       /       \         │
                    │      yes       no       │
                    │       |         |       │
                    │  npm install   Static   │
                    │  npm run      Copy      │
                    │  build        Files     │
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

├── upload-service/
│   ├── src/
│   │   ├── index.ts
│   │   └── utils.ts
│   ├── package.json
│   ├── package-lock.json
│   └── tsconfig.json

├── build-service/
│   ├── src/
│   │   ├── index.ts
│   │   └── r2.ts
│   ├── Dockerfile
│   ├── package.json
│   ├── package-lock.json
│   └── tsconfig.json

├── request-handler/
│   ├── src/
│   │   ├── index.ts
│   │   └── r2.ts
│   ├── package.json
│   ├── package-lock.json
│   └── tsconfig.json

├── .gitignore
└── README.md
```

## Architecture Overview

DeployHub is designed as a service-oriented deployment pipeline.

Each service has a specific responsibility.

### Upload Service

Responsible for accepting deployment requests and creating deployment jobs.

The upload service:

* Receives a Git repository URL
* Generates a unique deployment ID
* Creates a deployment job
* Pushes the job to the Redis build queue
* Tracks the initial deployment status
* Provides a deployment status endpoint

The upload service does **not** clone repositories or perform builds.

### Build Service

The build service consumes deployment jobs from Redis.

For each job, it:

* Receives the deployment ID and repository URL
* Creates an isolated Docker container
* Clones the repository inside the container
* Detects whether the project is an npm-based project or a static project
* Installs project dependencies for npm-based projects
* Runs the application's build command for npm-based projects
* Copies static project files for projects without a `package.json`
* Collects the resulting deployment output
* Uploads the deployment output to Cloudflare R2
* Cleans up the build environment

### Docker Build Environment

User application code is executed inside isolated Docker containers.

The container provides:

* Repository files
* Runtime dependencies
* Build tools
* Temporary build filesystem
* Process isolation

The repository is cloned inside the container rather than being permanently stored on the host machine.

After the build completes, the container is removed.

### Cloudflare R2

Cloudflare R2 is used as persistent object storage for deployment output.

The storage structure is:

```text
output/

└── <deployment-id>/

    ├── index.html
    ├── style.css
    ├── script.js
    ├── assets/
    │   ├── app.js
    │   └── style.css
    └── ...
```

Source repositories are not permanently stored in R2.

Only the resulting deployable files are stored.

### Request Handler

The request handler is responsible for serving deployed applications.

It:

* Receives incoming deployment requests
* Resolves deployment IDs
* Retrieves deployment files from R2
* Serves static assets
* Sets appropriate MIME types
* Routes requests to the appropriate deployment
* Rewrites asset paths for applications that use root-relative asset paths

## Current Implementation

### Upload Service

The upload service currently handles:

* Receiving a Git repository URL
* Generating a deployment ID
* Creating a deployment job
* Pushing deployment jobs to Redis
* Tracking deployment status
* Providing a deployment status endpoint

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
        |
        ├── Detect Project Type
        |
        ├── npm install + npm run build
        |       OR
        └── Copy Static Files

                 |

                 v

           Deployment Output

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

## Project Type Detection

The Build Service currently supports two types of projects.

### npm-Based Projects

If the repository contains a `package.json`, the Build Service treats it as an npm-based project.

The build process is:

```text
Repository

    |

    v

package.json detected

    |

    v

npm install

    |

    v

npm run build

    |

    v

dist/
```

This allows projects such as React/Vite applications and other JavaScript applications with a build script to be deployed.

### Static HTML/CSS/JavaScript Projects

If the repository does not contain a `package.json`, DeployHub treats it as a static project.

For example:

```text
project/

├── index.html
├── style.css
├── script.js
└── assets/
```

The project files are copied into:

```text
dist/

├── index.html
├── style.css
├── script.js
└── assets/
```

No build command is required.

This allows simple HTML, CSS, and JavaScript projects to be deployed directly.

## Tech Stack

### Backend

* Node.js
* TypeScript
* Express.js
* Redis

### Build Infrastructure

* Docker
* Docker containers
* Git
* npm

### Storage

* Cloudflare R2
* AWS SDK for JavaScript

Cloudflare R2 is accessed through its S3-compatible API.

### Queue and State Management

Redis is used as the communication and state layer between deployment services.

Redis provides:

* Deployment job queues
* Deployment status tracking
* Communication between services

### Frontend

* React
* TypeScript
* Tailwind CSS

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
PORT=3000
```

Do not commit `.env` files or expose credentials.

### Running the Service

```bash
npm run dev
```

The service runs on:

```text
http://localhost:3000
```

## Build Service

### Installation

```bash
cd build-service
npm install
```

### Environment Variables

Create a `.env` file inside `build-service`:

```env
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=deploy-hub
```

Do not commit `.env` files or expose your R2 credentials.

### Running the Service

```bash
npm run dev
```

The Build Service waits for deployment jobs from Redis.

## Request Handler

### Installation

```bash
cd request-handler
npm install
```

### Environment Variables

Create a `.env` file inside `request-handler`:

```env
PORT=4000

R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=deploy-hub
```

Do not commit `.env` files or expose your R2 credentials.

### Running the Service

```bash
npm run dev
```

The Request Handler runs on:

```text
http://localhost:4000
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

The request only queues the deployment.

Repository cloning and application building are handled by the Build Service.

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

Current deployment status tracking is implemented using Redis.

Possible deployment states include:

```text
queued
building
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

The build service consumes jobs from the queue.

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

The current build pipeline is:

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

Detect Project Type

    |

    ├── package.json exists
    │
    ├── npm install
    │
    └── npm run build
    |
    └── OR
        |
        └── Copy Static Files

    |

    v

Collect Deployment Output

    |

    v

Upload Output to R2

    |

    v

Destroy Container
```

The source repository and temporary dependencies only need to exist during the build process.

## Docker Builder

The build environment is created using:

```dockerfile
FROM node:22

RUN apt-get update && apt-get install -y git

WORKDIR /app
```

Build the image with:

```bash
docker build -t deployhub-builder .
```

The image provides Node.js, npm, and Git for application builds.

## Request Handler and Static Files

The Request Handler serves files from R2 based on the deployment ID.

For example:

```text
http://localhost:4000/t59yp/index.html
```

maps to:

```text
output/t59yp/index.html
```

Similarly:

```text
http://localhost:4000/t59yp/style.css
```

maps to:

```text
output/t59yp/style.css
```

The Request Handler currently supports common static file types:

```text
.html
.css
.js
.json
.png
.jpg
.jpeg
.svg
.ico
.webp
```

The corresponding `Content-Type` header is returned to the browser.

## Asset Path Handling

Applications built with tools such as Vite can generate root-relative asset paths.

For example:

```html
<link rel="stylesheet" href="/assets/index.css">
```

When DeployHub serves the application under a deployment ID such as:

```text
/t59yp
```

the browser would normally request:

```text
/assets/index.css
```

instead of:

```text
/t59yp/assets/index.css
```

The Request Handler currently rewrites asset paths in `index.html`.

```text
/assets/index.css
```

becomes:

```text
/t59yp/assets/index.css
```

The browser then requests the deployment-specific asset path, which is mapped to:

```text
output/t59yp/assets/index.css
```

in R2.

This allows Vite-built applications to work with the current path-based deployment architecture.

## Example Deployment

A deployment starts with a GitHub repository:

```text
https://github.com/user/project.git
```

The repository URL is sent to the Upload Service.

```text
GitHub Repository

        |

        v

Upload Service

        |

        v

Redis Queue

        |

        v

Build Service

        |

        v

Docker Container
```

The Build Service detects the project type.

### npm Project

```text
package.json detected

        |

        v

npm install

        |

        v

npm run build

        |

        v

dist/
```

### Static Project

```text
No package.json

        |

        v

Copy Project Files

        |

        v

dist/
```

The resulting files are uploaded to R2:

```text
output/<deployment-id>/
```

The deployment can then be accessed through the Request Handler:

```text
http://localhost:4000/<deployment-id>
```

Example:

```text
http://localhost:4000/t59yp
```

## Tested Deployments

The current pipeline has been tested with both build-based and static projects.

### React/Vite

A React/Vite project was successfully:

* Cloned from GitHub
* Installed with npm
* Built inside Docker
* Extracted from `dist`
* Uploaded to R2
* Served through the Request Handler
* Rendered correctly in the browser with CSS and assets

### Static HTML/CSS/JavaScript

A plain static project containing:

```text
index.html
style.css
script.js
assets/
```

was successfully:

* Cloned from GitHub
* Detected as a static project
* Copied into `dist`
* Uploaded to R2
* Served through the Request Handler
* Rendered correctly in the browser

## Supported Project Types

### Static Websites

DeployHub supports static websites containing:

* HTML
* CSS
* JavaScript
* Images
* JSON
* Other static assets

Example:

```text
project/

├── index.html
├── style.css
├── script.js
└── assets/
```

### npm-Based Applications

DeployHub supports npm-based projects containing a `package.json` and a compatible build script.

Examples include:

* React
* Vite
* Other JavaScript applications with a build command

Example:

```text
project/

├── package.json
├── src/
└── ...
```

## Scalability

DeployHub uses asynchronous job processing to separate deployment requests from application builds.

The upload service does not perform resource-intensive builds.

Instead, it places deployment jobs into Redis and immediately returns a deployment ID.

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

## Current Limitations

DeployHub currently focuses on static deployments.

The current architecture does not run persistent backend servers from deployed repositories.

Applications requiring:

```text
Express servers
Node.js APIs
Python servers
PHP applications
Server-side rendering
Persistent processes
```

are not currently supported as deployed runtime applications.

The current system builds or prepares static deployment output and serves those files through the Request Handler.

## Roadmap

* [x] Git repository URL handling
* [x] Deployment ID generation
* [x] Redis integration
* [x] Redis deployment queue
* [x] Deployment status tracking
* [x] Upload service
* [x] Build service
* [x] Redis job consumer
* [x] Docker-based isolated builds
* [x] Application build pipeline
* [x] Static HTML/CSS/JavaScript deployment
* [x] npm-based project deployment
* [x] Build output upload to R2
* [x] Request handler
* [x] Deployment URLs
* [x] Static asset serving
* [x] MIME type handling
* [x] Asset path rewriting
* [x] Container cleanup
* [x] Temporary build file cleanup
* [ ] Improved deployment status updates
* [ ] Build logs
* [ ] Build failure handling
* [ ] Build retries
* [ ] Build timeouts
* [ ] Docker resource limits
* [ ] Deployment history
* [ ] Frontend dashboard
* [ ] Custom deployment domains
* [ ] Production deployment
* [ ] Monitoring and observability
* [ ] Server-side application support

## Objective

The project focuses on understanding the architecture and engineering concepts behind modern cloud deployment platforms.

Key areas include:

* Service-oriented architecture
* Asynchronous job processing
* Redis-based queues
* Worker architecture
* Docker-based build isolation
* Object storage
* Build pipelines
* Static deployment
* Deployment status tracking
* Application routing
* Cloud infrastructure
* Scalable service design

## Project Status

DeployHub currently has a functional end-to-end static deployment pipeline.

The system has successfully deployed:

* React/Vite applications
* Plain HTML/CSS/JavaScript applications

The current pipeline is:

```text
GitHub Repository
        ↓
Upload Service
        ↓
Redis Queue
        ↓
Docker Build Service
        ↓
Project Detection
        ↓
Build / Static File Copy
        ↓
Cloudflare R2
        ↓
Request Handler
        ↓
Browser
```

The core static deployment architecture is functional.

The next stage is improving reliability, deployment status handling, build failure handling, production infrastructure, and eventually supporting server-side applications.