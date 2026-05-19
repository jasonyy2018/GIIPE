import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  // 从命令行参数获取用户信息
  const args = process.argv.slice(2);
  
  // 默认值
  let email = 'admin@giip.info';
  let username = 'admin';
  let password = 'admin123';
  let firstName = 'System';
  let lastName = 'Administrator';

  // 解析命令行参数
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) {
      email = args[i + 1];
      i++;
    } else if (args[i] === '--username' && args[i + 1]) {
      username = args[i + 1];
      i++;
    } else if (args[i] === '--password' && args[i + 1]) {
      password = args[i + 1];
      i++;
    } else if (args[i] === '--firstName' && args[i + 1]) {
      firstName = args[i + 1];
      i++;
    } else if (args[i] === '--lastName' && args[i + 1]) {
      lastName = args[i + 1];
      i++;
    }
  }

  try {
    // 检查用户是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log(`用户 ${email} 已存在，正在更新...`);
      
      // 更新密码和角色
      const hashedPassword = await bcrypt.hash(password, 10);
      const updatedUser = await prisma.user.update({
        where: { email },
        data: {
          password: hashedPassword,
          role: UserRole.ADMIN,
          isActive: true,
          firstName,
          lastName,
        },
      });

      console.log('✅ 管理员账号已更新！');
      console.log(`邮箱: ${updatedUser.email}`);
      console.log(`用户名: ${updatedUser.username}`);
      console.log(`角色: ${updatedUser.role}`);
      console.log(`密码: ${password}`);
    } else {
      // 创建新用户
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await prisma.user.create({
        data: {
          username,
          email,
          password: hashedPassword,
          role: UserRole.ADMIN,
          firstName,
          lastName,
          isActive: true,
          emailVerified: true, // 管理员账号默认已验证
        },
      });

      console.log('✅ 管理员账号创建成功！');
      console.log(`邮箱: ${newUser.email}`);
      console.log(`用户名: ${newUser.username}`);
      console.log(`角色: ${newUser.role}`);
      console.log(`密码: ${password}`);
    }
  } catch (error) {
    console.error('❌ 创建管理员账号失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();

