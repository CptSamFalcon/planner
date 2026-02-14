# Hosting Bass Canyon Planner on CasaOS

Yes — you can use **GitHub** as the source for the code and deploy from there. Two ways to run the app on CasaOS are below.

---

## Using GitHub

1. **Put the project on GitHub**  
   Create a repo and push this project (from your machine):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/bass-canyon-planner.git
   git push -u origin main
   ```

2. **On your CasaOS server** (SSH in or use a terminal on the machine), clone and run:
   ```bash
   cd /path/you/want
   git clone https://github.com/YOUR_USERNAME/bass-canyon-planner.git planner
   cd planner
   docker compose up -d --build
   ```
   Then open **http://\<server-ip\>:3080**.

**Updates:** When you push changes to GitHub, on the server run `git pull` in the project folder, then `docker compose up -d --build` again. Your data stays in the Docker volume.

---

## Option A: Deploy with Docker Compose (recommended)

CasaOS can run Compose apps. Get the project on the server (e.g. clone from GitHub as above, or copy the folder).

### 1. Build and run with Compose

From the project folder on the server:

```bash
cd /path/to/planner
docker compose up -d --build
```

- First run will build the image and start the container. Data is stored in the volume `bass-canyon-planner-data`.
- App URL: **http://\<server-ip\>:3080**

### 2. (Optional) Add it as a Compose app in CasaOS

If your CasaOS has a **Compose** or **Docker Compose** section:

1. Create a new Compose app.
2. Set the **Path** to the project folder (e.g. `/path/to/planner` or the path where you uploaded the files).
3. Use the existing `docker-compose.yml` (CasaOS may detect it automatically), or paste in the same content.
4. Deploy/Start the stack.

Port **3080** and volume **bass-canyon-planner-data** are already set in `docker-compose.yml`.

---

## Option B: Deploy from a pre-built image

Build the image once (on your dev machine or a build server), push it to Docker Hub, then add it in CasaOS as a custom app.

### 1. Build and push the image

On a machine that has the project and Docker:

```bash
cd /path/to/planner
docker build -t YOUR_DOCKERHUB_USER/bass-canyon-planner:latest .
docker push YOUR_DOCKERHUB_USER/bass-canyon-planner:latest
```

Replace `YOUR_DOCKERHUB_USER` with your Docker Hub username.

### 2. Add the app in CasaOS

1. In CasaOS, open **App Store** (or **Apps**).
2. Click **Add App** / **Custom App** / **Install a customized app** (wording may vary).
3. Use:
   - **Image:** `YOUR_DOCKERHUB_USER/bass-canyon-planner:latest`
   - **Port:** `3080` (map container port 3080 to host, e.g. `3080:3080`)
   - **Volume:** Add a volume so data persists:
     - **Container path:** `/app/data`
     - **Source:** e.g. a named volume or a host path like `bass-canyon-planner-data` (CasaOS often creates a volume for you if you name it).
4. Save and start the container.

### 3. Open the app

In a browser: **http://\<casaos-server-ip\>:3080**

---

## Port and firewall

- The app listens on **3080** inside the container.
- If you can’t reach it from another device, check:
  - CasaOS/firewall allows TCP **3080**.
  - Your router doesn’t block that port if you’re connecting from outside your network.

---

## Data and updates

- **Data:** SQLite database and any app data live in the Docker volume mapped to `/app/data`. Don’t delete that volume if you want to keep your data.
- **Updates:**  
  - **Option A:** Pull the latest project, then run `docker compose up -d --build` again.  
  - **Option B:** Build and push a new image, then in CasaOS recreate/update the container with the new image (keep the same `/app/data` volume).

---

## Quick reference

| Item        | Value        |
|------------|--------------|
| App URL    | `http://<server-ip>:3080` |
| Container port | 3080     |
| Data path in container | `/app/data` |
| Compose project name | `bass-canyon-planner` (from `docker-compose.yml`) |
