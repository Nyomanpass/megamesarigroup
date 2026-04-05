-- Database queries untuk testing
-- Lihat semua user
SELECT * FROM Users;

-- Lihat refresh tokens
SELECT * FROM RefreshTokens;

-- Update user status
-- UPDATE Users SET status = 'verified' WHERE email = 'test@email.com';

-- Delete OTP (jika stuck)
-- DELETE FROM OTPs WHERE user_id = 1;

-- Clear login logs
-- DELETE FROM LoginLogs WHERE createdAt < DATE_SUB(NOW(), INTERVAL 7 DAY);
