# 🔑 Project Credentials & Operations Manual

> [!WARNING]
> **보안 주의**: 이 파일에는 민감한 비밀번호와 키가 포함되어 있습니다. GitHub에 `public`으로 올릴 경우 해킹 위험이 있으니 주의하세요. (팀원 공유용으로만 사용)

## 1. 🌐 Hosting (배포 서버)

### Frontend (화면)
- **Platform**: Vercel
- **URL**: [https://dinner-planner-nine.vercel.app](https://dinner-planner-nine.vercel.app)
- **Repository**: [GitHub - dinner-planner](https://github.com/ivolovesyj/dinner-planner)
- **계정**: GitHub 계정 연동됨

### Backend (서버)
- **Platform**: Fly.io
- **App Name**: `gooddinner`
- **Dashbaord**: [https://fly.io/apps/gooddinner](https://fly.io/apps/gooddinner)
- **Deploy Command**: 
  ```bash
  fly deploy
  ```

---

## 2. 🗄️ Database (데이터베이스)

- **Platform**: MongoDB Atlas (Free Tier)
- **Region**: Seoul (AWS)
- **Cluster Name**: Cluster0
- **User (Admin)**: `minjune990515_db_user`
- **Password**: `4VUv1Sl62HOZ0oL4`
- **Connection String (URI)**:
  ```text
  mongodb+srv://minjune990515_db_user:4VUv1Sl62HOZ0oL4@cluster0.2bhzfgg.mongodb.net/dinner_planner?appName=Cluster0
  ```

---

## 3. 📊 Analytics (방문자 통계)

- **Platform**: Google Analytics 4 (GA4)
- **Service Name**: 뭐먹을래 웹
- **Measurement ID**: `G-BKTFZRLZYM`
- **Dashboard**: [analytics.google.com](https://analytics.google.com)

---

## 4. 🛠️ How to Deploy (업데이트 방법)

코드를 수정한 뒤에는 아래 두 가지를 진행해야 적용됩니다.

### Frontend 업데이트 (GA4, 디자인, 기능 등)
```bash
git add .
git commit -m "변경 내용 적기"
git push
```
-> **자동으로 Vercel이 배포함 (약 1분 소요)**

### Backend 업데이트 (DB 구조 변경, API 로직 등)
```bash
fly deploy
```
-> **Fly.io 서버가 껐다 켜지며 적용됨 (약 1~2분 소요)**
