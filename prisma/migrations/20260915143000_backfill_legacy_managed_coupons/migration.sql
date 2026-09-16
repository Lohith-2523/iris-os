-- Backfill installations where the superadmin tables were created before the
-- legacy coupon catalog was added to the original migration.
INSERT INTO "ManagedCoupon" ("id", "label", "codeSalt", "codeDigest", "codeHint", "plan", "enabled", "startsAt", "createdAt", "updatedAt") VALUES
  ('standard', 'Legacy standard access', 'b34b34a089f593b19a526313b093286a', 'f3f1465d91fbba35b91313da6eb6d2ca192d0aca5634cb9a30fa2fe5697a6eff', 'Legacy code', 'ANY', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sgrl', 'Legacy SGRL access', '6e41a792a1e972bb47ba4d3f78f70d5d', '9980ded5c40d2381a54668480c8a30e23842bc343074a2eb1df14125df58a8d4', 'Legacy code', 'ANY', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sls', 'Legacy SLS access', '2ccdfc86a019e827fd302509db47dbf8', 'a2ffc5cebb40a639075b6561b386dc84005e2ee3465718de98f541e272065696', 'Legacy code', 'ANY', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
