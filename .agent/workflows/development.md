---
description: 뭐먹을래 서비스 개발 가이드라인 - 계층 구조 유지 및 안정성 확보
---

# 🍽️ 뭐먹을래 개발 가이드라인

이 프로젝트는 **계층형 아키텍처**를 따릅니다. 모든 수정/추가 작업 시 이 가이드를 준수해주세요.

---

## 📁 현재 구조

### 백엔드 (`server/`)
```
server/
├── index.js          ← 진입점 (수정 금지)
├── app.js            ← Express 설정
├── config/           ← 설정 파일
├── middleware/       ← 미들웨어
├── services/         ← 비즈니스 로직 (DB 접근)
├── controllers/      ← 요청 처리 (req/res)
├── routes/           ← API 라우트 정의
└── models/           ← Mongoose 스키마
```

### 프론트엔드 (`src/`)
```
src/
├── api/              ← API 호출 함수 (Promise 반환)
├── hooks/            ← Custom Hooks
├── constants/        ← 상수 (URL, 설정)
├── components/
│   ├── common/       ← 공통 UI
│   ├── room/         ← Room 관련
│   ├── restaurant/   ← Restaurant 관련
│   ├── ladder/       ← Ladder 게임
│   ├── admin/        ← 관리자 대시보드
│   └── layout/       ← Footer, Header 등
├── utils/            ← 유틸리티 함수
└── App.jsx           ← 메인 컴포넌트
```

---

## ✅ 새 API 엔드포인트 추가 체크리스트

1. **Service 생성/수정** (`server/services/`)
   - 비즈니스 로직 작성, Model 접근

2. **Controller 생성/수정** (`server/controllers/`)
   - Service 호출, req/res 처리

3. **Route 추가** (`server/routes/`)
   - 엔드포인트 정의, Controller 연결

4. **routes/index.js 업데이트**
   - 새 라우트 등록

5. **프론트엔드 API 함수 추가** (`src/api/`)
   - Promise 반환하는 함수 작성

---

## ✅ 새 프론트엔드 컴포넌트 추가 체크리스트

1. **도메인 폴더 결정**
   - 기존 도메인: `common/`, `room/`, `restaurant/`, `ladder/`, `admin/`, `layout/`
   - 새 도메인 필요시 폴더 생성

2. **컴포넌트 파일 생성**
   - `ComponentName.jsx`
   - `ComponentName.css` (스타일 분리)

3. **index.js export 추가**
   - 해당 도메인 폴더의 `index.js`에 export 추가

---

## ⚠️ 금지 사항

| ❌ 하지 말 것 | ✅ 대신 할 것 |
|--------------|--------------|
| API URL 하드코딩 | `constants/index.js`에서 `API_BASE_URL` 사용 |
| axios 직접 import | `api/client.js` 사용 |
| App.jsx에 로직 추가 | `hooks/`에 커스텀 훅 생성 |
| 컴포넌트에 API 호출 직접 작성 | `api/*.js` 함수 호출 |
| localStorage 키 직접 사용 | `STORAGE_KEYS` 상수 사용 |

---

## 🔧 환경변수

### 백엔드 (`.env`)
```
MONGO_URI=mongodb+srv://...
JWT_SECRET=...
PORT=8080
```

### 프론트엔드 (Vercel 환경변수)
```
VITE_API_URL=https://gooddinner.fly.dev
```

**주의:** Vercel 환경변수 변경 시 반드시 Redeploy 필요!

---

## 🚀 배포 절차

### 백엔드 (Fly.io)
```bash
cd /my_own_project/dinner_planner
~/.fly/bin/flyctl deploy
```

### 프론트엔드 (Vercel)
```bash
git add -A && git commit -m "설명" && git push origin main
# Vercel 자동 배포됨
```

### 배포 후 확인
```bash
# API 테스트
curl -s https://gooddinner.fly.dev/

# 배포된 URL 확인
curl -s https://dinner-planner-nine.vercel.app/ | grep -o 'assets/index-[^"]*\.js'
```
