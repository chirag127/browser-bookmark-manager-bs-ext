# Architecture

## Overview

BS-EXT is a Manifest V3 browser extension with a service worker, popup, options page, and full-page dashboard. Browser bookmarks are the source of truth; extension metadata stored in chrome.storage.local.

## Mermaid

```mermaid
flowchart TD
    U[User] --> P[Popup]
    U --> D[Dashboard]
    P --> A[App Services]
    D --> A
    A --> BA[Browser Adapter]
    A --> SE[Search & Sort]
    A --> DUP[Duplicate Detection]
    A --> AI[Optional AI]
    BA --> BM[Native Bookmarks]
    A --> ST[Local Storage]
```

## Data flow / privacy

```mermaid
flowchart TD
    B[Local Bookmarks] --> L[Local Rules]
    L --> R[Results]
    L --> C{AI enabled & approved?}
    C -->|No| R
    C -->|Yes| F[Data minimization]
    F --> P[AI Provider]
    P --> V[Validate]
    V --> Q[Preview]
    Q -->|Approve| O[Apply]
```
