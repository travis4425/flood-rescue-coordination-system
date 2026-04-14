const { z } = require('zod');

exports.loginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(1).max(100)
});

exports.changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8).max(100)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Mật khẩu phải có ít nhất 1 chữ hoa, 1 chữ thường, 1 số')
});
