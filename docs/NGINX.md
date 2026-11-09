# nginx setup guide: Focus list

nginx is already installed and set up (login + HTTPS) on one PC. The Focus list app runs on **another PC** in the same local network. This guide connects them.

```
Internet ──443──▶ nginx PC (login + HTTPS) ──LAN──▶ app PC :3001 ──▶ mongo (Docker)
```

In this guide (replace with your values):

| Name | Example | Meaning |
| --- | --- | --- |
| `APP_PC_IP` | `192.168.1.50` | Local IP of the PC that runs the app |
| `NGINX_PC_IP` | `192.168.1.10` | Local IP of the PC that runs nginx |
| `tasks.example.com` | | Domain (or the existing site) where the app should open |

Give the app PC a **fixed local IP** (DHCP reservation in the router). If its IP changes, nginx loses the app.

---

## Part A: on the app PC

### 1. Settings

In the project folder:

```bash
cp .env.docker.example .env
```

Edit `.env`:

```env
MONGODB_URI=mongodb://mongo:27017
MONGODB_DB=focus-list
APP_USER=me
APP_PASSWORD=
APP_PORT=APP_PC_IP:3001
```

- `APP_PORT=192.168.1.50:3001` (the app PC's own IP): the app listens only on the local network, not on every interface.
- `APP_PASSWORD` stays empty: nginx does the login.

### 2. Start

```bash
docker compose up -d --build
```

```bash
docker compose ps
```

`app` and `mongo` must be `healthy`.

### 3. Allow only nginx to connect (firewall)

Without this, every device in the local network can open the app **without login**.

Ubuntu/Debian with `ufw`:

```bash
sudo ufw allow from NGINX_PC_IP to any port 3001 proto tcp
sudo ufw deny 3001/tcp
```

Note: Docker can bypass `ufw` for published ports. Test it (step C) from a third device. If it is still open, add a rule in Docker's chain:

```bash
sudo iptables -I DOCKER-USER -p tcp --dport 3001 ! -s NGINX_PC_IP -j DROP
```

(To keep this rule after reboot: `sudo apt install iptables-persistent`, then `sudo netfilter-persistent save`.)

### 4. Router

Do **not** forward port 3001 to the app PC. Only the nginx PC gets ports from the internet.

---

## Part B: on the nginx PC

### 1. Test the connection

```bash
curl http://APP_PC_IP:3001/api/health
```

Expected: `{"ok":true}`. If not: check Part A (app running, `APP_PORT`, firewall).

### 2. Add the app to nginx

Open the existing site config for the domain (for example `/etc/nginx/sites-available/<site>`). Inside the `server { ... }` block that already has HTTPS and the login, add:

```nginx
location / {
    # keep your existing login lines here (auth_basic / auth_request / ...)

    proxy_pass http://APP_PC_IP:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    client_max_body_size 1m;
    proxy_connect_timeout 5s;
    proxy_read_timeout 30s;
}
```

If the login is set for the whole `server` block (not inside a `location`), it already covers this `location`. Nothing more to add.

**The app must be at the root (`/`) of a domain or subdomain.** It does not work under a path like `example.com/tasks/` without a code change. Best: a subdomain, for example `tasks.example.com`, with its own `server` block (copy the HTTPS + login lines from the existing site, and get a certificate: `sudo certbot --nginx -d tasks.example.com`).

### 3. Reload

```bash
sudo nginx -t
```

```bash
sudo systemctl reload nginx
```

---

## Part C: final checks

| Check | Where | Expected |
| --- | --- | --- |
| App runs | app PC: `docker compose ps` | `app`, `mongo` are `healthy` |
| nginx reaches app | nginx PC: `curl http://APP_PC_IP:3001/api/health` | `{"ok":true}` |
| Login asked | browser: `https://tasks.example.com` | Login prompt, then the app |
| No login = blocked | `curl -I https://tasks.example.com/api/data` | `401` (or your login page) |
| Other LAN devices blocked | third device: `curl -m 5 http://APP_PC_IP:3001` | timeout / refused |
| Reload works | open `https://tasks.example.com/projects`, press F5 | Projects page, not 404 |

---

## Updates and data (app PC)

- Update: `git pull`, then `docker compose up -d --build`. nginx needs no change.
- Data is in the Docker volume `mongo-data`. **Never** run `docker compose down -v` (deletes the database).
- Backup: `docker compose exec mongo mongodump --archive > backup.archive`
- Restore: `docker compose exec -T mongo mongorestore --archive < backup.archive`

## Troubleshooting

| Problem | Likely cause | Fix |
| --- | --- | --- |
| `502 Bad Gateway` | nginx cannot reach the app | On nginx PC: `curl http://APP_PC_IP:3001/api/health`. Check app is running, IP, firewall |
| `504 Gateway Timeout` | Firewall drops nginx | Check the `ufw` / `DOCKER-USER` rule allows `NGINX_PC_IP` |
| Works, then stops after a few days | App PC got a new IP | Set a DHCP reservation, update `APP_PORT` and `proxy_pass` |
| `docker compose up` fails: "cannot assign requested address" | `APP_PORT` IP is not this PC's IP | Check with `ip -4 addr`, fix `APP_PORT` |
| `404` on `/projects` after reload | Request does not reach the app | `location /` must `proxy_pass` everything |
| "Could not load your data" | MongoDB not ready | `docker compose logs mongo`, wait for `healthy` |
