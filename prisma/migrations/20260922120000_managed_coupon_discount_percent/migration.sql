ALTER TABLE "ManagedCoupon"
ADD COLUMN "discountPercent" INTEGER NOT NULL DEFAULT 100;

ALTER TABLE "ManagedCoupon"
ADD CONSTRAINT "ManagedCoupon_discountPercent_check"
CHECK ("discountPercent" BETWEEN 1 AND 100);
