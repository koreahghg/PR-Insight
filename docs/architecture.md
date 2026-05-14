# CodePulse 시스템 아키텍처

## 1. 시스템 개요

CodePulse는 GitHub PR이 생성·업데이트될 때 자동으로 AI 코드 리뷰를 수행하고, 결과를 PR 코멘트로 남기는 시스템이다.

```
GitHub → Webhook → Server → AI Engine → GitHub
```

---

## 2. 컴포넌트 구성

```mermaid
graph TB
  subgraph GitHub
    GH_PR[Pull Request]
    GH_WH[Webhook 발송]
    GH_API[GitHub REST API]
    GH_CMT[PR Comment]
  end

  subgraph Backend["Backend (Express)"]
    WH_HANDLER[Webhook Handler<br/>/api/webhooks/github]
    WH_VALIDATOR[Signature Validator<br/>HMAC-SHA256]
    EVENT_ROUTER[Event Router<br/>PR opened/synchronize]
    DIFF_FETCHER[Diff Fetcher<br/>GitHub API Client]
    AI_ENGINE[AI Review Engine<br/>Claude API]
    REVIEW_FORMATTER[Review Formatter]
    COMMENT_POSTER[Comment Poster<br/>GitHub API Client]
  end

  subgraph Frontend["Frontend (React + Vite)"]
    DASHBOARD[Dashboard]
    HISTORY[Review History]
    SETTINGS[Settings]
  end

  subgraph External
    CLAUDE[Claude API<br/>Anthropic]
  end

  GH_PR -->|PR 이벤트 발생| GH_WH
  GH_WH -->|POST /api/webhooks/github| WH_HANDLER
  WH_HANDLER --> WH_VALIDATOR
  WH_VALIDATOR -->|검증 통과| EVENT_ROUTER
  EVENT_ROUTER -->|PR opened/synchronize| DIFF_FETCHER
  DIFF_FETCHER -->|GET /repos/.../pulls/.../files| GH_API
  GH_API --> DIFF_FETCHER
  DIFF_FETCHER --> AI_ENGINE
  AI_ENGINE -->|diff + context| CLAUDE
  CLAUDE -->|review response| AI_ENGINE
  AI_ENGINE --> REVIEW_FORMATTER
  REVIEW_FORMATTER --> COMMENT_POSTER
  COMMENT_POSTER -->|POST /repos/.../issues/.../comments| GH_API
  GH_API --> GH_CMT

  DASHBOARD --> HISTORY
  DASHBOARD --> SETTINGS
```

---

## 3. 각 컴포넌트 역할

### 3.1 GitHub (외부)

| 컴포넌트 | 역할 |
|---|---|
| **Pull Request** | 코드 변경 요청 단위. 리뷰 대상 |
| **Webhook 발송** | PR 이벤트(opened, synchronize, reopened) 발생 시 등록된 URL로 HTTP POST |
| **GitHub REST API** | PR diff 조회, 코멘트 작성에 사용 |
| **PR Comment** | AI 리뷰 결과가 최종적으로 표시되는 위치 |

### 3.2 Backend

| 컴포넌트 | 역할 |
|---|---|
| **Webhook Handler** | GitHub에서 오는 POST 요청 수신 진입점 |
| **Signature Validator** | `X-Hub-Signature-256` 헤더로 요청 위변조 검증 |
| **Event Router** | `X-GitHub-Event` 헤더와 `action` 필드로 처리할 이벤트 필터링 |
| **Diff Fetcher** | GitHub API를 통해 변경된 파일 목록과 patch(diff) 수집 |
| **AI Review Engine** | diff와 컨텍스트를 프롬프트로 구성하여 Claude API 호출 |
| **Review Formatter** | AI 응답을 GitHub Markdown 형식의 코멘트로 변환 |
| **Comment Poster** | 완성된 리뷰를 GitHub PR에 코멘트로 게시 |

### 3.3 Frontend

| 컴포넌트 | 역할 |
|---|---|
| **Dashboard** | 리뷰 현황 및 시스템 상태 조회 |
| **Review History** | 과거 AI 리뷰 이력 조회 |
| **Settings** | Webhook 연결, AI 모델 설정, 리뷰 옵션 관리 |
