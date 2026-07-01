-- Stajyerlerin şifresiz oluşturulabilmesi için passwordHash alanını opsiyonel yap
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;
