# Stajyer Takip CRM

Stajyerlerin iş takibini yapabileceğiniz, Vercel üzerinde çalışan bir CRM paneli.
Admin ve stajyer rolleri, iş atama/onay akışı, aktivite logları ve uygulama içi
bildirimler içerir.

## Teknolojiler

- [Next.js 15](https://nextjs.org) (App Router, TypeScript)
- [Auth.js v5](https://authjs.dev) (Credentials provider, JWT oturum)
- [Prisma](https://www.prisma.io) + [Neon Postgres](https://neon.tech) (Vercel Marketplace)
- [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) (ekran görüntüsü yükleme)
- [Tailwind CSS](https://tailwindcss.com) + [next-themes](https://github.com/pacocoursey/next-themes)

## Özellikler

| Modül | Admin | Stajyer |
|-------|:-----:|:-------:|
| Giriş (`/login`) | ✓ | ✓ |
| İşler (`/isler`) | İş atar, onaylar, revize ister | Kendi işlerini görür, başlar, teslim eder |
| Stajyerler (`/stajyerler`) | Oluşturur, siler, son girişleri görür | — |
| Loglar (`/loglar`) | Tüm aktiviteleri görür | — |
| Ayarlar (`/ayarlar`) | Aydınlık/karanlık tema | Aydınlık/karanlık tema |

İş akışı: **Atandı → İşe Başladım → Teslim Edildi → (Onay / Revize)**.
Revize istenirse not eklenir ve iş tekrar stajyere döner. Her durum değişiminde
ilgili kullanıcıya sağ üstteki zilden bildirim gider.

## Yerel Kurulum

1. Bağımlılıkları yükleyin:

```bash
npm install
```

2. `.env.example` dosyasını `.env` olarak kopyalayıp doldurun:

```bash
cp .env.example .env
```

En azından `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `ADMIN_EMAIL`,
`ADMIN_PASSWORD` ve `BLOB_READ_WRITE_TOKEN` değerlerini girin.
`AUTH_SECRET` üretmek için:

```bash
openssl rand -base64 32
```

3. Veritabanı şemasını oluşturun ve ilk admini ekleyin:

```bash
npm run db:push
npm run db:seed
```

4. Geliştirme sunucusunu başlatın:

```bash
npm run dev
```

`http://localhost:3000` adresinden `ADMIN_EMAIL` / `ADMIN_PASSWORD` ile giriş yapın.

## Vercel'e Dağıtım

1. Bu projeyi GitHub deposuna gönderin:

```bash
git init
git add .
git commit -m "İlk sürüm: Stajyer Takip CRM"
git branch -M main
git remote add origin https://github.com/atillakesicioglu/stajyertakipcrm.git
git push -u origin main
```

2. [Vercel](https://vercel.com) panelinden projeyi içe aktarın (Import Project).

3. **Storage** sekmesinden Vercel Marketplace üzerinden ekleyin:
   - **Neon Postgres** → `DATABASE_URL` ve `DIRECT_URL` otomatik tanımlanır.
   - **Vercel Blob** → `BLOB_READ_WRITE_TOKEN` otomatik tanımlanır. *(Önerilir;
     eklemezseniz ekran görüntüleri yine yüklenir, ancak veritabanında saklanır.)*

4. Ortam değişkenlerini ekleyin: `AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`,
   `ADMIN_NAME`.

5. İlk dağıtımdan sonra şemayı production veritabanına uygulayın ve admini ekleyin
   (yerelden, production `.env` ile):

```bash
npm run db:deploy   # veya: npx prisma migrate deploy
npm run db:seed
```

> Not: `npm run build` komutu otomatik olarak `prisma generate` çalıştırır.
> Neon, serverless ortam için havuzlanmış (`DATABASE_URL`) ve doğrudan
> (`DIRECT_URL`) bağlantıları sağlar; Prisma migration `DIRECT_URL` kullanır.

## Komutlar

| Komut | Açıklama |
|-------|----------|
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` | Production derlemesi (önce `prisma generate`) |
| `npm run db:push` | Şemayı veritabanına uygula (migration'sız) |
| `npm run db:migrate` | Geliştirme migration'ı oluştur |
| `npm run db:deploy` | Production migration'larını uygula |
| `npm run db:seed` | İlk admin kullanıcısını oluştur |
| `npm run db:studio` | Prisma Studio (veri görüntüleyici) |

### Mail Gönderimi (Admin SMTP)

Her admin `/ayarlar` sayfasından kendi SMTP bilgilerini (sunucu, port, kullanıcı, şifre) tanımlar.
**Test et** ile bağlantı doğrulanır, **Kaydet** ile kalıcı hale getirilir.

Görev atandığında mail, adminin kaydettiği SMTP hesabından stajyerin kayıt e-postasına (`User.email`) gider.
Ek env değişkeni gerekmez; SMTP şifresi veritabanında `AUTH_SECRET` ile şifrelenerek saklanır.
