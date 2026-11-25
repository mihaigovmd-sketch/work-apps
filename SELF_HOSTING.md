# Self-Hosting Daily Notes & Calendar (Synology NAS & Docker)

This application can be self-hosted on your local network, Synology NAS (DSM Container Manager / Docker), Raspberry Pi, or any VPS.

## 🚀 Quick Start with Docker Compose

1. Clone or download this project to your machine or Synology NAS:
   ```bash
   git clone <repository-url> daily-notes
   cd daily-notes
   ```

2. Start the container:
   ```bash
   docker compose up -d
   ```

3. Open your browser:
   ```
   http://localhost:3000
   ```
   Or on your local network:
   ```
   http://<your-server-ip>:3000
   ```

---

## 🖥️ Running on Synology NAS (Container Manager)

1. Open **Synology DSM** and open **Container Manager**.
2. Go to **Project** and click **Create**.
3. Set the Project Name to `daily-notes`.
4. Choose the folder where you uploaded this project (e.g., `/docker/daily-notes`).
5. Select "Use existing docker-compose.yml" and click **Done**.
6. Container Manager will build and run the app. Access it at `http://<synology-nas-ip>:3000`.

---

## 🔐 Google OAuth for Custom Domains or Synology DDNS

When self-hosting on your own domain (e.g., `https://notes.yourdomain.synology.me` or `http://192.168.1.100:3000`):

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Navigate to **APIs & Services** > **Credentials**.
3. Under **OAuth 2.0 Client IDs**, edit your Web client.
4. Under **Authorized JavaScript origins**, add your domain:
   - `http://192.168.1.100:3000` (for local IP)
   - `https://notes.yourdomain.com` (for reverse proxy/domain)
5. Click **Save**.

Your self-hosted instance will now authenticate directly with your Google account, Google Drive "Daily Notes" folder, and Google Calendar!
