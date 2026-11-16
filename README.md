# Monode
Example application using the Monad Execution Events SDK

> [!WARNING]
> This repository contains example code to demonstrate Monad features and concepts. The examples illustrate how to use the features, in their simplest form.
>
> These implementations are educational examples, and have not been tested or audited. They are likely to have significant errors and security vulnerabilities. They should not be relied on for any purpose. Do not use the code in this example in a production environment without completing your own audits and application of best practices.

![App](public/app.gif)
## Resources

- [Live App](https://node.monad.xyz)
- [Blog Post](https://blog.monad.xyz/blog/execution-events-sdk)
- [Documentation](https://docs.monad.xyz/execution-events)

## How to Run

### 1. Run the Backend

Navigate to the backend directory and run the server on the full node:

```bash
cd backend
cargo run --bin backend -- --server-addr 0.0.0.0:<SERVER_PORT>
```

Replace `<SERVER_PORT>` with your desired port number (e.g., 8080).

> **_NOTE:_** By default, the backend runs in **restricted** mode, which requires clients to subscribe to the events specified in `backend/restricted_filters.json`. To disable this behavior, set the `ALLOW_UNRESTRICTED_FILTERS` environment variable to a non-empty value before spawning the backend process.

### 2. Configure the Frontend

Edit the `.env` file in the frontend directory to set the WebSocket URL:

```
NEXT_PUBLIC_EVENTS_WS_URL="ws://<SERVER_ADDR>:<SERVER_PORT>"
```

Replace `<SERVER_ADDR>` with your server address and `<SERVER_PORT>` with the port you used in step 1.

#### Optional: fallback endpoint

To keep the dashboard live when the primary backend is down, point the frontend at a second backend:

```
NEXT_PUBLIC_EVENTS_WS_FALLBACK_URL="wss://<FALLBACK_ADDR>:<FALLBACK_PORT>"
```

The frontend switches to the other endpoint when the current one:

- does not open within 5 seconds
- errors or closes
- stays open but sends no message for 10 seconds (a stalled backend)

It stays on whichever endpoint is working and only tries the other one after the next failure. Each switch waits a random delay of up to 1 second, so clients dropped together by a backend restart don't all reconnect at the same instant. Once both endpoints have failed, that window doubles on each pass, up to 30 seconds. Failover logic lives in `frontend/lib/resilient-websocket.ts`.

The origins of both URLs are added to the `connect-src` Content Security Policy in `frontend/next.config.ts` at build time, so a new endpoint only needs the env var. Rebuild after changing either URL.

### 3. Run the Frontend

Navigate to the frontend directory and start the development server:

```bash
cd frontend
pnpm dev
```
