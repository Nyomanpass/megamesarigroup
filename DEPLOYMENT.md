# Deploy Production ke VPS

Panduan ini menjalankan 4 container:

- `reverse-proxy`: Nginx depan di port `80`, routing domain
- `frontend`: React build production + Nginx internal
- `backend`: Node/Express di network internal Docker
- `mysql`: MySQL 8 dengan data persisten

Domain production:

- Frontend: `system.bomborastudio.id`
- Backend/API: `api.bomborastudio.id`

Di DNS domain, arahkan kedua subdomain ini ke IP VPS:

```text
system.bomborastudio.id  A  IP-VPS
api.bomborastudio.id     A  IP-VPS
```

## 1. Siapkan file environment

Jangan commit file environment production. File `.env.prod` berisi password dan secret server.

Copy contoh env production:

```bash
cp .env.prod.example .env.prod
```

Edit `.env.prod`:

```env
MYSQL_ROOT_PASSWORD=password-root-yang-kuat
DB_USER=megamesari_user
DB_PASS=password-db-yang-kuat
JWT_SECRET=random-secret-panjang
JWT_EXPIRES=1d
CLIENT_ORIGIN=http://system.bomborastudio.id
CLIENT_ORIGINS=http://system.bomborastudio.id
VITE_API_URL=http://api.bomborastudio.id/api
VITE_UPLOADS_URL=http://api.bomborastudio.id/uploads
EMAIL_USER=email@gmail.com
EMAIL_PASS=app-password-email
```

Kalau sudah pakai HTTPS, ubah menjadi:

```env
CLIENT_ORIGIN=https://system.bomborastudio.id
CLIENT_ORIGINS=https://system.bomborastudio.id,http://system.bomborastudio.id
VITE_API_URL=https://api.bomborastudio.id/api
VITE_UPLOADS_URL=https://api.bomborastudio.id/uploads
```

## 2. Upload project ke VPS

Contoh dengan `scp` dari komputer lokal:

```bash
scp -r megamesarigroup user@IP-VPS:/home/user/
```

Atau clone dari Git repository jika project sudah ada di Git.

## 3. Jalankan Docker Compose production

Masuk ke folder project di VPS:

```bash
cd /home/user/megamesarigroup
```

Build dan start:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

Cek container:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
```

Cek log:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f
```

Setelah running, buka:

```text
http://system.bomborastudio.id
http://api.bomborastudio.id
```

## 4. Import database

File `megamesarigroup.sql` otomatis di-import hanya saat volume MySQL pertama kali dibuat.

Kalau container MySQL sudah pernah jalan dan ingin import ulang manual:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T mysql mysql -u megamesari_user -p megamesarigroup < megamesarigroup.sql
```

Masukkan password sesuai `DB_PASS`.

## 5. Update aplikasi

Setelah ada perubahan kode:

```bash
git pull
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

## 6. Stop aplikasi

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml down
```

Jangan hapus volume kecuali memang mau reset database dan upload:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml down -v
```
