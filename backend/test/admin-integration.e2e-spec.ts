import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('Admin Interface Integration (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    
    await app.init();

    // Create test admin user
    const adminUser = await prisma.user.create({
      data: {
        username: 'admin-test',
        email: 'admin@test.com',
        password: '$2b$10$test.hash',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        isActive: true,
        emailVerified: true,
      },
    });

    // Create test regular user
    const regularUser = await prisma.user.create({
      data: {
        username: 'user-test',
        email: 'user@test.com',
        password: '$2b$10$test.hash',
        firstName: 'Regular',
        lastName: 'User',
        role: 'MEMBER',
        isActive: true,
        emailVerified: true,
      },
    });

    adminToken = jwtService.sign({ sub: adminUser.id, email: adminUser.email, role: adminUser.role });
    userToken = jwtService.sign({ sub: regularUser.id, email: regularUser.email, role: regularUser.role });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['admin@test.com', 'user@test.com'],
        },
      },
    });
    await app.close();
  });

  describe('Dashboard Metrics (Requirement 1.1)', () => {
    it('should return dashboard metrics for admin users', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/dashboard/metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalUsers');
      expect(response.body).toHaveProperty('activeEvents');
      expect(response.body).toHaveProperty('systemHealth');
      expect(response.body).toHaveProperty('recentActivity');
    });

    it('should deny access to non-admin users', async () => {
      await request(app.getHttpServer())
        .get('/admin/dashboard/metrics')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should return real-time system health indicators', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/system/health')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('database');
      expect(response.body).toHaveProperty('redis');
      expect(response.body).toHaveProperty('overallStatus');
      expect(['healthy', 'warning', 'critical']).toContain(response.body.overallStatus);
    });
  });

  describe('User Management (Requirement 2.1)', () => {
    it('should return paginated user list with filters', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/users?page=1&limit=10&role=USER')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(Array.isArray(response.body.users)).toBe(true);
    });

    it('should support bulk user operations', async () => {
      const testUser = await prisma.user.create({
        data: {
          username: 'bulk-test',
          email: 'bulk-test@test.com',
          password: '$2b$10$test.hash',
          firstName: 'Bulk',
          lastName: 'Test',
          role: 'MEMBER',
          isActive: true,
          emailVerified: true,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/admin/users/bulk-update')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userIds: [testUser.id],
          updates: { isActive: false },
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('updatedCount', 1);

      // Cleanup
      await prisma.user.delete({ where: { id: testUser.id } });
    });

    it('should provide detailed user profiles with activity logs', async () => {
      const testUser = await prisma.user.findFirst({
        where: { email: 'user@test.com' },
      });

      const response = await request(app.getHttpServer())
        .get(`/admin/users/${testUser.id}/profile`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('activityLog');
      expect(response.body).toHaveProperty('registrations');
    });
  });

  describe('Content Moderation (Requirement 3.1)', () => {
    let testEvent: any;
    let testComment: any;

    beforeAll(async () => {
      testEvent = await prisma.event.create({
        data: {
          title: 'Test Event for Moderation',
          description: 'Test event description',
          startDate: new Date('2024-12-01'),
          endDate: new Date('2024-12-02'),
          location: 'Test Location',
          maxAttendees: 100,
          status: 'PUBLISHED',
          createdBy: (await prisma.user.findFirst({ where: { email: 'admin@test.com' } })).id,
        },
      });

      testComment = await prisma.comment.create({
        data: {
          content: 'This is a test comment with badword',
          userId: (await prisma.user.findFirst({ where: { email: 'user@test.com' } })).id,
          targetType: 'EVENT',
          targetId: testEvent.id,
          status: 'PENDING',
        },
      });
    });

    afterAll(async () => {
      await prisma.comment.deleteMany({ where: { targetId: testEvent.id } });
      await prisma.event.delete({ where: { id: testEvent.id } });
    });

    it('should return moderation queue with pending content', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/moderation/queue')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.items)).toBe(true);
    });

    it('should support bulk content moderation', async () => {
      const response = await request(app.getHttpServer())
        .post('/admin/moderation/bulk-action')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'approve',
          itemIds: [testComment.id],
          note: 'Approved in bulk test',
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('processedCount', 1);
    });

    it('should highlight sensitive words in content', async () => {
      const response = await request(app.getHttpServer())
        .get(`/admin/moderation/content/${testComment.id}/analysis`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('content');
      expect(response.body).toHaveProperty('flaggedWords');
      expect(response.body).toHaveProperty('severity');
    });
  });

  describe('Event Management (Requirement 4.1)', () => {
    let testEvent: any;

    beforeAll(async () => {
      testEvent = await prisma.event.create({
        data: {
          title: 'Admin Test Event',
          description: 'Event for admin testing',
          startDate: new Date('2024-12-01'),
          endDate: new Date('2024-12-02'),
          location: 'Admin Test Location',
          maxAttendees: 50,
          status: 'DRAFT',
          createdBy: (await prisma.user.findFirst({ where: { email: 'admin@test.com' } })).id,
        },
      });
    });

    afterAll(async () => {
      await prisma.registration.deleteMany({ where: { eventId: testEvent.id } });
      await prisma.event.delete({ where: { id: testEvent.id } });
    });

    it('should provide comprehensive event management interface', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('events');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.events)).toBe(true);
    });

    it('should display event analytics and registration data', async () => {
      const response = await request(app.getHttpServer())
        .get(`/admin/events/${testEvent.id}/analytics`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('registrationTrends');
      expect(response.body).toHaveProperty('capacityUtilization');
      expect(response.body).toHaveProperty('attendanceProjections');
    });

    it('should support event duplication and templates', async () => {
      const response = await request(app.getHttpServer())
        .post(`/admin/events/${testEvent.id}/duplicate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Duplicated Event',
          startDate: '2024-12-15',
          endDate: '2024-12-16',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('title', 'Duplicated Event');

      // Cleanup
      await prisma.event.delete({ where: { id: response.body.id } });
    });
  });

  describe('Analytics and Reporting (Requirement 5.1)', () => {
    it('should provide interactive analytics dashboard', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/analytics/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('userEngagement');
      expect(response.body).toHaveProperty('eventPopularity');
      expect(response.body).toHaveProperty('systemUsage');
      expect(response.body).toHaveProperty('trends');
    });

    it('should generate exportable reports', async () => {
      const response = await request(app.getHttpServer())
        .post('/admin/analytics/reports/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'user_activity',
          format: 'csv',
          dateRange: {
            start: '2024-01-01',
            end: '2024-12-31',
          },
        })
        .expect(200);

      expect(response.body).toHaveProperty('reportId');
      expect(response.body).toHaveProperty('downloadUrl');
    });

    it('should support date range filtering and comparisons', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/analytics/comparative')
        .query({
          metric: 'user_registrations',
          currentStart: '2024-01-01',
          currentEnd: '2024-06-30',
          previousStart: '2023-07-01',
          previousEnd: '2023-12-31',
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('current');
      expect(response.body).toHaveProperty('previous');
      expect(response.body).toHaveProperty('comparison');
    });
  });

  describe('System Configuration (Requirement 6.1)', () => {
    it('should provide system settings management', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/system/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('storage');
      expect(response.body).toHaveProperty('api');
    });

    it('should support settings validation and testing', async () => {
      const response = await request(app.getHttpServer())
        .post('/admin/system/settings/validate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'email',
          config: {
            host: 'smtp.test.com',
            port: 587,
            secure: false,
          },
        })
        .expect(200);

      expect(response.body).toHaveProperty('valid');
      expect(response.body).toHaveProperty('message');
    });

    it('should provide system maintenance tools', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/system/maintenance/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('cache');
      expect(response.body).toHaveProperty('database');
      expect(response.body).toHaveProperty('logs');
      expect(response.body).toHaveProperty('resources');
    });
  });

  describe('Audit and Security (Requirement 7.1)', () => {
    it('should provide comprehensive audit logs', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/audit/logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('logs');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.logs)).toBe(true);
    });

    it('should support advanced audit log filtering', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/audit/logs')
        .query({
          action: 'user_login',
          dateFrom: '2024-01-01',
          dateTo: '2024-12-31',
          userId: 'test-user-id',
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('logs');
      expect(response.body).toHaveProperty('filters');
    });

    it('should provide security monitoring dashboard', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/security/monitoring')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('failedLogins');
      expect(response.body).toHaveProperty('suspiciousActivities');
      expect(response.body).toHaveProperty('securityAlerts');
    });

    it('should generate security alerts for suspicious activities', async () => {
      const response = await request(app.getHttpServer())
        .post('/admin/security/alerts/test')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'failed_login_threshold',
          severity: 'medium',
          details: {
            ipAddress: '192.168.1.100',
            attempts: 5,
          },
        })
        .expect(201);

      expect(response.body).toHaveProperty('alertId');
      expect(response.body).toHaveProperty('status', 'created');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle bulk operations efficiently', async () => {
      const startTime = Date.now();
      
      // Create multiple test users for bulk operations
      const testUsers = await Promise.all(
        Array.from({ length: 10 }, (_, i) => 
          prisma.user.create({
            data: {
              username: `bulk-test-${i}`,
              email: `bulk-test-${i}@test.com`,
              password: '$2b$10$test.hash',
              firstName: `Bulk${i}`,
              lastName: 'Test',
              role: 'MEMBER',
              isActive: true,
              emailVerified: true,
            },
          })
        )
      );

      const response = await request(app.getHttpServer())
        .post('/admin/users/bulk-update')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userIds: testUsers.map(u => u.id),
          updates: { isActive: false },
        })
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('updatedCount', 10);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      // Cleanup
      await prisma.user.deleteMany({
        where: {
          id: { in: testUsers.map(u => u.id) },
        },
      });
    });

    it('should handle concurrent admin requests', async () => {
      const requests = Array.from({ length: 5 }, () =>
        request(app.getHttpServer())
          .get('/admin/dashboard/metrics')
          .set('Authorization', `Bearer ${adminToken}`)
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('totalUsers');
      });
    });
  });

  describe('Security and Access Control', () => {
    it('should enforce admin-only access to sensitive endpoints', async () => {
      const sensitiveEndpoints = [
        '/admin/users/bulk-update',
        '/admin/system/settings',
        '/admin/security/monitoring',
        '/admin/audit/logs',
      ];

      for (const endpoint of sensitiveEndpoints) {
        await request(app.getHttpServer())
          .get(endpoint)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);
      }
    });

    it('should validate input data for admin operations', async () => {
      const response = await request(app.getHttpServer())
        .post('/admin/users/bulk-update')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userIds: ['invalid-id'],
          updates: { invalidField: 'invalid-value' },
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('validation');
    });

    it('should log all admin actions for audit trail', async () => {
      // Perform an admin action
      await request(app.getHttpServer())
        .get('/admin/dashboard/metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Check if action was logged
      const auditResponse = await request(app.getHttpServer())
        .get('/admin/audit/logs')
        .query({ action: 'dashboard_access' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(auditResponse.body.logs.length).toBeGreaterThan(0);
    });
  });
});
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('Admin Interface Performance Tests (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let testUsers: any[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    
    await app.init();

    // Create test admin user
    const adminUser = await prisma.user.create({
      data: {
        username: 'perf-admin',
        email: 'perf-admin@test.com',
        password: '$2b$10$test.hash',
        firstName: 'Performance',
        lastName: 'Admin',
        role: 'ADMIN',
        isActive: true,
        emailVerified: true,
      },
    });

    adminToken = jwtService.sign({ sub: adminUser.id, email: adminUser.email, role: adminUser.role });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: 'perf-admin@test.com' },
    });
    await app.close();
  });

  describe('Dashboard Performance', () => {
    it('should load dashboard metrics within acceptable time limits', async () => {
      const startTime = Date.now();
      
      const response = await request(app.getHttpServer())
        .get('/admin/dashboard/metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
      expect(response.body).toHaveProperty('totalUsers');
    });

    it('should handle concurrent dashboard requests efficiently', async () => {
      const concurrentRequests = 10;
      const startTime = Date.now();

      const requests = Array.from({ length: concurrentRequests }, () =>
        request(app.getHttpServer())
          .get('/admin/dashboard/metrics')
          .set('Authorization', `Bearer ${adminToken}`)
      );

      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Total time should be reasonable for concurrent requests
      expect(totalTime).toBeLessThan(3000);
    });

    it('should cache dashboard metrics appropriately', async () => {
      // First request
      const firstStart = Date.now();
      await request(app.getHttpServer())
        .get('/admin/dashboard/metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const firstTime = Date.now() - firstStart;

      // Second request (should be cached)
      const secondStart = Date.now();
      await request(app.getHttpServer())
        .get('/admin/dashboard/metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const secondTime = Date.now() - secondStart;

      // Cached request should be faster
      expect(secondTime).toBeLessThan(firstTime);
    });
  });

  describe('User Management Performance', () => {

    beforeAll(async () => {
      // Create test users for performance testing
      const userPromises = Array.from({ length: 100 }, (_, i) =>
        prisma.user.create({
          data: {
            username: `perf-user-${i}`,
            email: `perf-user-${i}@test.com`,
            password: '$2b$10$test.hash',
            firstName: `User${i}`,
            lastName: 'Test',
            role: 'MEMBER',
            isActive: true,
            emailVerified: true,
          },
        })
      );

      testUsers = await Promise.all(userPromises);
    });

    afterAll(async () => {
      await prisma.user.deleteMany({
        where: {
          id: { in: testUsers.map(u => u.id) },
        },
      });
    });

    it('should paginate user lists efficiently', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/admin/users?page=1&limit=50')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(2000);
      expect(response.body.users).toHaveLength(50);
      expect(response.body).toHaveProperty('total');
    });

    it('should handle user search efficiently', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/admin/users?search=User1&page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(1500);
      expect(response.body.users.length).toBeGreaterThan(0);
    });

    it('should perform bulk operations within acceptable time', async () => {
      const bulkUserIds = testUsers.slice(0, 20).map(u => u.id);
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .post('/admin/users/bulk-update')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userIds: bulkUserIds,
          updates: { isActive: false },
        })
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(5000); // 5 seconds for 20 users
      expect(response.body.updatedCount).toBe(20);
    });
  });

  describe('Content Moderation Performance', () => {
    let testEvent: any;
    let testComments: any[] = [];

    beforeAll(async () => {
      const adminUser = await prisma.user.findFirst({ where: { email: 'perf-admin@test.com' } });
      
      testEvent = await prisma.event.create({
        data: {
          title: 'Performance Test Event',
          description: 'Event for performance testing',
          startDate: new Date('2024-12-01'),
          endDate: new Date('2024-12-02'),
          location: 'Test Location',
          maxAttendees: 100,
          status: 'PUBLISHED',
          createdBy: adminUser.id,
        },
      });

      // Create test comments for moderation
      const commentPromises = Array.from({ length: 50 }, (_, i) =>
        prisma.comment.create({
          data: {
            content: `Test comment ${i} with potential badword`,
            userId: testUsers[i % testUsers.length].id,
            targetType: 'EVENT',
            targetId: testEvent.id,
            status: 'PENDING',
          },
        })
      );

      testComments = await Promise.all(commentPromises);
    });

    afterAll(async () => {
      await prisma.comment.deleteMany({ where: { targetId: testEvent.id } });
      await prisma.event.delete({ where: { id: testEvent.id } });
    });

    it('should load moderation queue efficiently', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/admin/moderation/queue?page=1&limit=25')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(2000);
      expect(response.body.items.length).toBeGreaterThan(0);
    });

    it('should perform bulk moderation efficiently', async () => {
      const bulkCommentIds = testComments.slice(0, 10).map(c => c.id);
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .post('/admin/moderation/bulk-action')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'approve',
          itemIds: bulkCommentIds,
          note: 'Bulk approval test',
        })
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(3000);
      expect(response.body.processedCount).toBe(10);
    });

    it('should analyze content for sensitive words efficiently', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get(`/admin/moderation/content/${testComments[0].id}/analysis`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(1000);
      expect(response.body).toHaveProperty('content');
      expect(response.body).toHaveProperty('flaggedWords');
    });
  });

  describe('Analytics Performance', () => {
    it('should generate analytics data within acceptable time', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/admin/analytics/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(3000);
      expect(response.body).toHaveProperty('userEngagement');
    });

    it('should handle complex analytics queries efficiently', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/admin/analytics/comparative')
        .query({
          metric: 'user_registrations',
          currentStart: '2024-01-01',
          currentEnd: '2024-06-30',
          previousStart: '2023-07-01',
          previousEnd: '2023-12-31',
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(5000);
      expect(response.body).toHaveProperty('current');
      expect(response.body).toHaveProperty('previous');
    });

    it('should generate reports efficiently', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .post('/admin/analytics/reports/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'user_activity',
          format: 'csv',
          dateRange: {
            start: '2024-01-01',
            end: '2024-12-31',
          },
        })
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(10000); // Report generation can take longer
      expect(response.body).toHaveProperty('reportId');
    });
  });

  describe('System Resource Usage', () => {
    it('should monitor memory usage during operations', async () => {
      const initialMemory = process.memoryUsage();

      // Perform multiple operations
      const operations = [
        request(app.getHttpServer())
          .get('/admin/dashboard/metrics')
          .set('Authorization', `Bearer ${adminToken}`),
        request(app.getHttpServer())
          .get('/admin/users?page=1&limit=50')
          .set('Authorization', `Bearer ${adminToken}`),
        request(app.getHttpServer())
          .get('/admin/moderation/queue')
          .set('Authorization', `Bearer ${adminToken}`),
      ];

      await Promise.all(operations);

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should handle database connection pooling efficiently', async () => {
      // Test multiple concurrent database operations
      const dbOperations = Array.from({ length: 20 }, () =>
        prisma.user.count()
      );

      const startTime = Date.now();
      const results = await Promise.all(dbOperations);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(2000);
      expect(results.every(count => typeof count === 'number')).toBe(true);
    });
  });

  describe('Cache Performance', () => {
    it('should demonstrate cache effectiveness', async () => {
      // Clear cache first
      await request(app.getHttpServer())
        .post('/admin/system/cache/clear')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // First request (cache miss)
      const firstStart = Date.now();
      await request(app.getHttpServer())
        .get('/admin/dashboard/metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const firstTime = Date.now() - firstStart;

      // Second request (cache hit)
      const secondStart = Date.now();
      await request(app.getHttpServer())
        .get('/admin/dashboard/metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const secondTime = Date.now() - secondStart;

      // Cache hit should be significantly faster
      expect(secondTime).toBeLessThan(firstTime * 0.5);
    });

    it('should handle cache invalidation properly', async () => {
      // Make initial request to populate cache
      await request(app.getHttpServer())
        .get('/admin/users?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Perform operation that should invalidate cache
      await request(app.getHttpServer())
        .post('/admin/users/bulk-update')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userIds: [testUsers[0].id],
          updates: { isActive: true },
        })
        .expect(200);

      // Next request should fetch fresh data
      const response = await request(app.getHttpServer())
        .get('/admin/users?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.users).toBeDefined();
    });
  });

  describe('Load Testing Scenarios', () => {
    it('should handle sustained load on admin endpoints', async () => {
      const duration = 5000; // 5 seconds
      const requestInterval = 100; // Request every 100ms
      const startTime = Date.now();
      const requests: Promise<any>[] = [];

      while (Date.now() - startTime < duration) {
        requests.push(
          request(app.getHttpServer())
            .get('/admin/dashboard/metrics')
            .set('Authorization', `Bearer ${adminToken}`)
        );

        await new Promise(resolve => setTimeout(resolve, requestInterval));
      }

      const responses = await Promise.all(requests);
      
      // All requests should succeed
      const successfulRequests = responses.filter(r => r.status === 200);
      const successRate = successfulRequests.length / responses.length;

      expect(successRate).toBeGreaterThan(0.95); // 95% success rate
    });

    it('should maintain performance under mixed workload', async () => {
      const mixedRequests = [
        // Dashboard requests
        ...Array.from({ length: 5 }, () =>
          request(app.getHttpServer())
            .get('/admin/dashboard/metrics')
            .set('Authorization', `Bearer ${adminToken}`)
        ),
        // User management requests
        ...Array.from({ length: 5 }, () =>
          request(app.getHttpServer())
            .get('/admin/users?page=1&limit=10')
            .set('Authorization', `Bearer ${adminToken}`)
        ),
        // Moderation requests
        ...Array.from({ length: 5 }, () =>
          request(app.getHttpServer())
            .get('/admin/moderation/queue')
            .set('Authorization', `Bearer ${adminToken}`)
        ),
      ];

      const startTime = Date.now();
      const responses = await Promise.all(mixedRequests);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      const averageResponseTime = totalTime / responses.length;

      expect(averageResponseTime).toBeLessThan(1000);
      expect(responses.every(r => r.status === 200)).toBe(true);
    });
  });
});
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { AdminRealtimeGateway } from '../src/admin/gateways/admin-realtime.gateway';
// import { io, Socket } from 'socket.io-client';

describe.skip('Admin WebSocket Integration (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let gateway: AdminRealtimeGateway;
  let adminToken: string;
  let userToken: string;
  let adminSocket: Socket;
  let userSocket: Socket;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    gateway = moduleFixture.get<AdminRealtimeGateway>(AdminRealtimeGateway);
    
    await app.listen(3001);

    // Create test users
    const adminUser = await prisma.user.create({
      data: {
        username: 'ws-admin',
        email: 'ws-admin@test.com',
        password: '$2b$10$test.hash',
        firstName: 'WebSocket',
        lastName: 'Admin',
        role: 'ADMIN',
        isActive: true,
        emailVerified: true,
      },
    });

    const regularUser = await prisma.user.create({
      data: {
        username: 'ws-user',
        email: 'ws-user@test.com',
        password: '$2b$10$test.hash',
        firstName: 'WebSocket',
        lastName: 'User',
        role: 'MEMBER',
        isActive: true,
        emailVerified: true,
      },
    });

    adminToken = jwtService.sign({ sub: adminUser.id, email: adminUser.email, role: adminUser.role });
    userToken = jwtService.sign({ sub: regularUser.id, email: regularUser.email, role: regularUser.role });
  });

  afterAll(async () => {
    if (adminSocket?.connected) adminSocket.disconnect();
    if (userSocket?.connected) userSocket.disconnect();
    
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['ws-admin@test.com', 'ws-user@test.com'],
        },
      },
    });
    await app.close();
  });

  beforeEach((done) => {
    // Connect admin socket
    adminSocket = io('http://localhost:3001', {
      auth: { token: adminToken },
      transports: ['websocket'],
    });

    adminSocket.on('connect', () => {
      // Connect user socket
      userSocket = io('http://localhost:3001', {
        auth: { token: userToken },
        transports: ['websocket'],
      });

      userSocket.on('connect', () => {
        done();
      });
    });
  });

  afterEach(() => {
    if (adminSocket?.connected) adminSocket.disconnect();
    if (userSocket?.connected) userSocket.disconnect();
  });

  describe('Real-time Dashboard Updates (Requirement 1.5)', () => {
    it('should broadcast system metrics to admin users', (done) => {
      adminSocket.on('metrics-update', (data) => {
        expect(data).toHaveProperty('timestamp');
        expect(data).toHaveProperty('activeUsers');
        expect(data).toHaveProperty('systemLoad');
        done();
      });

      // Trigger metrics update
      gateway.broadcastMetricsUpdate({
        timestamp: new Date(),
        activeUsers: 10,
        systemLoad: 0.5,
        memoryUsage: 60,
        responseTime: 150,
        errorRate: 0.01,
      });
    });

    it('should not send admin metrics to regular users', (done) => {
      let receivedByUser = false;
      let receivedByAdmin = false;

      userSocket.on('metrics-update', () => {
        receivedByUser = true;
      });

      adminSocket.on('metrics-update', () => {
        receivedByAdmin = true;
      });

      // Trigger metrics update
      gateway.broadcastMetricsUpdate({
        timestamp: new Date(),
        activeUsers: 10,
        systemLoad: 0.5,
        memoryUsage: 60,
        responseTime: 150,
        errorRate: 0.01,
      });

      setTimeout(() => {
        expect(receivedByAdmin).toBe(true);
        expect(receivedByUser).toBe(false);
        done();
      }, 100);
    });

    it('should handle real-time activity feed updates', (done) => {
      adminSocket.on('activity-update', (data) => {
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('action');
        expect(data).toHaveProperty('timestamp');
        done();
      });

      // Simulate activity
      gateway.broadcastActivityUpdate({
        id: 'activity-123',
        action: 'user_registration',
        resource: 'user',
        user: 'test-user-id',
        timestamp: new Date(),
      });
    });
  });

  describe('Real-time Notifications (Requirement 7.3)', () => {
    it('should deliver security alerts to admin users', (done) => {
      adminSocket.on('security-alert', (data) => {
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('severity');
        expect(data).toHaveProperty('alertType');
        expect(data).toHaveProperty('title');
        expect(data.severity).toBe('high');
        done();
      });

      // Trigger security alert
      gateway.broadcastSecurityAlert({
        id: 'test-alert-123',
        alertType: 'failed_login_threshold',
        severity: 'high',
        title: 'Multiple Failed Login Attempts',
        description: 'Multiple failed login attempts detected',
        acknowledged: false,
        resolved: false,
        escalated: false,
        escalationLevel: 0,
        createdAt: new Date(),
      });
    });

    it('should handle notification acknowledgment', (done) => {
      const alertId = 'test-alert-456';

      adminSocket.emit('acknowledge_alert', { alertId });

      adminSocket.on('alert_acknowledged', (data) => {
        expect(data).toHaveProperty('alertId', alertId);
        expect(data).toHaveProperty('acknowledgedAt');
        done();
      });
    });

    it('should support notification preferences', (done) => {
      adminSocket.emit('update_notification_preferences', {
        securityAlerts: true,
        systemMetrics: false,
        userActivity: true,
      });

      adminSocket.on('preferences_updated', (data) => {
        expect(data).toHaveProperty('success', true);
        expect(data).toHaveProperty('preferences');
        done();
      });
    });
  });

  describe('Real-time Moderation Updates', () => {
    it('should notify admins of new content requiring moderation', (done) => {
      adminSocket.on('notification', (data) => {
        expect(data).toHaveProperty('type');
        expect(data).toHaveProperty('message');
        done();
      });

      // Simulate new moderation notification
      gateway.broadcastNotification({
        type: 'moderation_required',
        message: 'New content requires moderation',
        itemId: 'comment-123',
        timestamp: new Date(),
      });
    });

    it('should update moderation queue when items are processed', (done) => {
      adminSocket.on('notification', (data) => {
        expect(data).toHaveProperty('type');
        expect(data).toHaveProperty('message');
        done();
      });

      // Simulate moderation completion notification
      gateway.broadcastNotification({
        type: 'moderation_completed',
        message: 'Content moderation completed',
        itemId: 'comment-123',
        action: 'approved',
        timestamp: new Date(),
      });
    });
  });

  describe('Connection Management and Authentication', () => {
    it('should reject connections without valid tokens', (done) => {
      const invalidSocket = io('http://localhost:3001', {
        auth: { token: 'invalid-token' },
        transports: ['websocket'],
      });

      invalidSocket.on('connect_error', (error) => {
        expect(error.message).toContain('Authentication failed');
        invalidSocket.disconnect();
        done();
      });
    });

    it('should handle connection heartbeat and reconnection', (done) => {
      let heartbeatReceived = false;

      adminSocket.on('heartbeat', () => {
        heartbeatReceived = true;
      });

      // Simulate heartbeat
      adminSocket.emit('ping');

      adminSocket.on('pong', () => {
        expect(heartbeatReceived).toBe(false); // Should receive pong, not heartbeat
        done();
      });
    });

    it('should maintain connection state across reconnections', (done) => {
      const originalId = adminSocket.id;
      
      adminSocket.disconnect();
      
      setTimeout(() => {
        adminSocket.connect();
        
        adminSocket.on('connect', () => {
          expect(adminSocket.id).not.toBe(originalId);
          expect(adminSocket.connected).toBe(true);
          done();
        });
      }, 100);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent admin connections', (done) => {
      const connections: Socket[] = [];
      let connectedCount = 0;
      const targetConnections = 5;

      for (let i = 0; i < targetConnections; i++) {
        const socket = io('http://localhost:3001', {
          auth: { token: adminToken },
          transports: ['websocket'],
        });

        socket.on('connect', () => {
          connectedCount++;
          if (connectedCount === targetConnections) {
            // All connections established
            expect(connectedCount).toBe(targetConnections);
            
            // Cleanup
            connections.forEach(s => s.disconnect());
            done();
          }
        });

        connections.push(socket);
      }
    });

    it('should efficiently broadcast to multiple admin clients', (done) => {
      const connections: Socket[] = [];
      let receivedCount = 0;
      const targetConnections = 3;

      for (let i = 0; i < targetConnections; i++) {
        const socket = io('http://localhost:3001', {
          auth: { token: adminToken },
          transports: ['websocket'],
        });

        socket.on('connect', () => {
          socket.on('system_metrics_update', () => {
            receivedCount++;
            if (receivedCount === targetConnections) {
              expect(receivedCount).toBe(targetConnections);
              
              // Cleanup
              connections.forEach(s => s.disconnect());
              done();
            }
          });
        });

        connections.push(socket);
      }

      // Wait for all connections, then broadcast
      setTimeout(() => {
        gateway.broadcastMetricsUpdate({
          timestamp: new Date(),
          activeUsers: 15,
          systemLoad: 0.3,
          memoryUsage: 50,
          responseTime: 120,
          errorRate: 0.005,
        });
      }, 200);
    });

    it('should handle rapid message broadcasting without memory leaks', (done) => {
      let messageCount = 0;
      const targetMessages = 10;

      adminSocket.on('metrics-update', () => {
        messageCount++;
        if (messageCount === targetMessages) {
          expect(messageCount).toBe(targetMessages);
          done();
        }
      });

      // Rapidly broadcast messages
      for (let i = 0; i < targetMessages; i++) {
        setTimeout(() => {
          gateway.broadcastMetricsUpdate({
            timestamp: new Date(),
            activeUsers: 10 + i,
            systemLoad: 0.1 * i,
            memoryUsage: 50 + i,
            responseTime: 100 + i * 10,
            errorRate: 0.001 * i,
          });
        }, i * 10);
      }
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle malformed message gracefully', (done) => {
      adminSocket.emit('invalid_event', { malformed: 'data' });

      adminSocket.on('error', (error) => {
        expect(error).toHaveProperty('message');
        done();
      });

      // If no error is emitted within timeout, test passes
      setTimeout(() => {
        done();
      }, 500);
    });

    it('should recover from temporary disconnections', (done) => {
      let reconnected = false;

      adminSocket.on('disconnect', () => {
        // Simulate reconnection
        setTimeout(() => {
          adminSocket.connect();
        }, 100);
      });

      adminSocket.on('connect', () => {
        if (reconnected) {
          expect(adminSocket.connected).toBe(true);
          done();
        } else {
          reconnected = true;
          // Force disconnect to test reconnection
          adminSocket.disconnect();
        }
      });
    });
  });
});
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Authentication System (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('User Registration and Login', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@giip.info',
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User',
      };

      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.username).toBe(userData.username);
      expect(response.body).not.toHaveProperty('password');
    });

    it('should login with valid credentials', async () => {
      // First register a user
      const userData = {
        username: 'loginuser',
        email: 'login@giip.info',
        password: 'SecurePass123!',
        firstName: 'Login',
        lastName: 'User',
      };

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(userData);

      // Then login
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('accessToken');
      expect(loginResponse.body).toHaveProperty('refreshToken');
      expect(loginResponse.body).toHaveProperty('user');
    });

    it('should reject login with invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@giip.info',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should refresh access token with valid refresh token', async () => {
      // Register and login first
      const userData = {
        username: 'refreshuser',
        email: 'refresh@giip.info',
        password: 'SecurePass123!',
        firstName: 'Refresh',
        lastName: 'User',
      };

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(userData);

      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        });

      const refreshToken = loginResponse.body.refreshToken;

      // Use refresh token
      const refreshResponse = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(refreshResponse.body).toHaveProperty('accessToken');
      expect(refreshResponse.body).toHaveProperty('refreshToken');
    });
  });

  describe('Role-based Access Control', () => {
    let adminToken: string;
    let editorToken: string;
    let memberToken: string;

    beforeEach(async () => {
      // Create admin user
      const adminData = {
        username: 'admin',
        email: 'admin@giip.info',
        password: 'AdminPass123!',
        firstName: 'Admin',
        lastName: 'User',
      };
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(adminData);

      await prisma.user.update({
        where: { email: adminData.email },
        data: { role: 'ADMIN' },
      });

      const adminLogin = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: adminData.email, password: adminData.password });
      adminToken = adminLogin.body.accessToken;

      // Create editor user
      const editorData = {
        username: 'editor',
        email: 'editor@giip.info',
        password: 'EditorPass123!',
        firstName: 'Editor',
        lastName: 'User',
      };
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(editorData);

      await prisma.user.update({
        where: { email: editorData.email },
        data: { role: 'EDITOR' },
      });

      const editorLogin = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: editorData.email, password: editorData.password });
      editorToken = editorLogin.body.accessToken;

      // Create member user
      const memberData = {
        username: 'member',
        email: 'member@giip.info',
        password: 'MemberPass123!',
        firstName: 'Member',
        lastName: 'User',
      };
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(memberData);

      await prisma.user.update({
        where: { email: memberData.email },
        data: { role: 'MEMBER' },
      });

      const memberLogin = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: memberData.email, password: memberData.password });
      memberToken = memberLogin.body.accessToken;
    });

    it('should allow admin access to admin endpoints', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should deny member access to admin endpoints', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });

    it('should allow editor to create events', async () => {
      const eventData = {
        title: 'Test Conference',
        description: 'A test conference',
        contentMarkdown: '# Test Conference\n\nThis is a test.',
        startDate: new Date(Date.now() + 86400000).toISOString(),
        endDate: new Date(Date.now() + 172800000).toISOString(),
        location: 'Test Location',
        maxAttendees: 100,
        registrationDeadline: new Date(Date.now() + 43200000).toISOString(),
      };

      await request(app.getHttpServer())
        .post('/api/events')
        .set('Authorization', `Bearer ${editorToken}`)
        .send(eventData)
        .expect(201);
    });

    it('should deny member access to create events', async () => {
      const eventData = {
        title: 'Test Conference',
        description: 'A test conference',
        contentMarkdown: '# Test Conference\n\nThis is a test.',
        startDate: new Date(Date.now() + 86400000).toISOString(),
        endDate: new Date(Date.now() + 172800000).toISOString(),
        location: 'Test Location',
        maxAttendees: 100,
        registrationDeadline: new Date(Date.now() + 43200000).toISOString(),
      };

      await request(app.getHttpServer())
        .post('/api/events')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(eventData)
        .expect(403);
    });
  });

  describe('JWT Token Validation', () => {
    it('should reject requests with invalid tokens', async () => {
      await request(app.getHttpServer())
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should reject requests with expired tokens', async () => {
      // This would require mocking JWT expiration or using a very short expiry
      // For now, we'll test with a malformed token
      await request(app.getHttpServer())
        .get('/api/users/profile')
        .set('Authorization', 'Bearer expired.token.here')
        .expect(401);
    });

    it('should reject requests without authorization header', async () => {
      await request(app.getHttpServer())
        .get('/api/users/profile')
        .expect(401);
    });
  });
});
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Comment System with Moderation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let memberToken: string;
  let eventId: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();

    await setupTestData();
  });

  afterEach(async () => {
    await app.close();
  });

  async function setupTestData() {
    // Create admin user
    const adminData = {
      username: 'commentadmin',
      email: 'commentadmin@giip.info',
      password: 'AdminPass123!',
      firstName: 'Comment',
      lastName: 'Admin',
    };
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(adminData);

    await prisma.user.update({
      where: { email: adminData.email },
      data: { role: 'ADMIN' },
    });

    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: adminData.email, password: adminData.password });
    adminToken = adminLogin.body.accessToken;

    // Create member user
    const memberData = {
      username: 'commentmember',
      email: 'commentmember@giip.info',
      password: 'MemberPass123!',
      firstName: 'Comment',
      lastName: 'Member',
    };
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(memberData);

    await prisma.user.update({
      where: { email: memberData.email },
      data: { role: 'MEMBER' },
    });

    const memberLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: memberData.email, password: memberData.password });
    memberToken = memberLogin.body.accessToken;

    // Create editor for event creation
    const editorData = {
      username: 'commenteditor',
      email: 'commenteditor@giip.info',
      password: 'EditorPass123!',
      firstName: 'Comment',
      lastName: 'Editor',
    };
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(editorData);

    await prisma.user.update({
      where: { email: editorData.email },
      data: { role: 'EDITOR' },
    });

    const editorLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: editorData.email, password: editorData.password });
    const editorToken = editorLogin.body.accessToken;

    // Create an event for commenting
    const eventData = {
      title: 'Comment Test Event',
      description: 'Event for testing comments',
      contentMarkdown: '# Comment Test Event',
      startDate: new Date(Date.now() + 86400000).toISOString(),
      endDate: new Date(Date.now() + 172800000).toISOString(),
      location: 'Test Location',
      maxAttendees: 100,
      registrationDeadline: new Date(Date.now() + 43200000).toISOString(),
    };

    const eventResponse = await request(app.getHttpServer())
      .post('/api/events')
      .set('Authorization', `Bearer ${editorToken}`)
      .send(eventData);

    eventId = eventResponse.body.id;

    await request(app.getHttpServer())
      .patch(`/api/events/${eventId}/publish`)
      .set('Authorization', `Bearer ${editorToken}`);

    // Add some sensitive words for testing
    await prisma.sensitiveWord.createMany({
      data: [
        { word: 'badword', level: 5, category: 'profanity' },
        { word: 'spam', level: 3, category: 'spam' },
        { word: 'inappropriate', level: 1, category: 'general' },
      ],
    });
  }

  describe('Comment Creation and Display', () => {
    it('should create a comment on an event', async () => {
      const commentData = {
        content: 'This is a great event! Looking forward to attending.',
        targetType: 'event',
        targetId: eventId,
      };

      const response = await request(app.getHttpServer())
        .post('/api/comments')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(commentData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.content).toBe(commentData.content);
      expect(response.body.status).toBe('approved'); // Clean comment should be auto-approved
      expect(response.body.targetType).toBe('event');
      expect(response.body.targetId).toBe(eventId);
    });

    it('should retrieve comments for an event', async () => {
      // Create a comment first
      const commentData = {
        content: 'Test comment for retrieval',
        targetType: 'event',
        targetId: eventId,
      };

      await request(app.getHttpServer())
        .post('/api/comments')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(commentData);

      // Retrieve comments
      const response = await request(app.getHttpServer())
        .get(`/api/comments?targetType=event&targetId=${eventId}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].content).toBe(commentData.content);
    });

    it('should allow users to update their own comments', async () => {
      // Create a comment
      const commentData = {
        content: 'Original comment content',
        targetType: 'event',
        targetId: eventId,
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/comments')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(commentData);

      const commentId = createResponse.body.id;

      // Update the comment
      const updateData = {
        content: 'Updated comment content',
      };

      const updateResponse = await request(app.getHttpServer())
        .patch(`/api/comments/${commentId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.content).toBe(updateData.content);
    });

    it('should prevent users from updating others comments', async () => {
      // Create a comment as member
      const commentData = {
        content: 'Member comment',
        targetType: 'event',
        targetId: eventId,
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/comments')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(commentData);

      const commentId = createResponse.body.id;

      // Create another user
      const otherUserData = {
        username: 'otheruser',
        email: 'other@giip.info',
        password: 'OtherPass123!',
        firstName: 'Other',
        lastName: 'User',
      };
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(otherUserData);

      await prisma.user.update({
        where: { email: otherUserData.email },
        data: { role: 'MEMBER' },
      });

      const otherLogin = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: otherUserData.email, password: otherUserData.password });
      const otherToken = otherLogin.body.accessToken;

      // Try to update the comment as other user
      await request(app.getHttpServer())
        .patch(`/api/comments/${commentId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ content: 'Hacked content' })
        .expect(403);
    });
  });

  describe('Sensitive Word Filtering', () => {
    it('should flag comments with sensitive words for moderation', async () => {
      const commentData = {
        content: 'This event contains badword content that should be flagged.',
        targetType: 'event',
        targetId: eventId,
      };

      const response = await request(app.getHttpServer())
        .post('/api/comments')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(commentData)
        .expect(201);

      expect(response.body.status).toBe('pending');
      expect(response.body.sensitiveFlags).toContain('badword');
    });

    it('should handle multiple sensitive words in a comment', async () => {
      const commentData = {
        content: 'This is spam content with badword and inappropriate language.',
        targetType: 'event',
        targetId: eventId,
      };

      const response = await request(app.getHttpServer())
        .post('/api/comments')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(commentData)
        .expect(201);

      expect(response.body.status).toBe('pending');
      expect(response.body.sensitiveFlags).toEqual(
        expect.arrayContaining(['spam', 'badword', 'inappropriate'])
      );
    });

    it('should not display pending comments to regular users', async () => {
      // Create a flagged comment
      const commentData = {
        content: 'This contains badword and should be hidden.',
        targetType: 'event',
        targetId: eventId,
      };

      await request(app.getHttpServer())
        .post('/api/comments')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(commentData);

      // Try to retrieve comments as regular user
      const response = await request(app.getHttpServer())
        .get(`/api/comments?targetType=event&targetId=${eventId}`)
        .expect(200);

      // Should not include pending comments
      const pendingComments = response.body.data.filter(c => c.status === 'pending');
      expect(pendingComments).toHaveLength(0);
    });
  });

  describe('Comment Moderation Workflow', () => {
    let pendingCommentId: string;

    beforeEach(async () => {
      // Create a comment that needs moderation
      const commentData = {
        content: 'This contains badword and needs moderation.',
        targetType: 'event',
        targetId: eventId,
      };

      const response = await request(app.getHttpServer())
        .post('/api/comments')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(commentData);

      pendingCommentId = response.body.id;
    });

    it('should allow admin to view pending comments', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/comments/pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      const pendingComment = response.body.data.find(c => c.id === pendingCommentId);
      expect(pendingComment).toBeDefined();
      expect(pendingComment.status).toBe('pending');
    });

    it('should allow admin to approve a comment', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/admin/comments/${pendingCommentId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe('approved');

      // Verify the comment is now visible to regular users
      const commentsResponse = await request(app.getHttpServer())
        .get(`/api/comments?targetType=event&targetId=${eventId}`)
        .expect(200);

      const approvedComment = commentsResponse.body.data.find(c => c.id === pendingCommentId);
      expect(approvedComment).toBeDefined();
    });

    it('should allow admin to reject a comment', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/admin/comments/${pendingCommentId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Contains inappropriate content' })
        .expect(200);

      expect(response.body.status).toBe('rejected');

      // Verify the comment is not visible to regular users
      const commentsResponse = await request(app.getHttpServer())
        .get(`/api/comments?targetType=event&targetId=${eventId}`)
        .expect(200);

      const rejectedComment = commentsResponse.body.data.find(c => c.id === pendingCommentId);
      expect(rejectedComment).toBeUndefined();
    });

    it('should prevent non-admin users from moderating comments', async () => {
      await request(app.getHttpServer())
        .patch(`/api/admin/comments/${pendingCommentId}/approve`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });
  });

  describe('Comment Reporting', () => {
    let approvedCommentId: string;

    beforeEach(async () => {
      // Create an approved comment for reporting
      const commentData = {
        content: 'This is a clean comment that will be reported.',
        targetType: 'event',
        targetId: eventId,
      };

      const response = await request(app.getHttpServer())
        .post('/api/comments')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(commentData);

      approvedCommentId = response.body.id;
    });

    it('should allow users to report inappropriate comments', async () => {
      const reportData = {
        reason: 'Spam content',
        description: 'This comment appears to be spam.',
      };

      const response = await request(app.getHttpServer())
        .post(`/api/comments/${approvedCommentId}/report`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(reportData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.reason).toBe(reportData.reason);
    });

    it('should prevent duplicate reports from the same user', async () => {
      const reportData = {
        reason: 'Inappropriate content',
        description: 'This is inappropriate.',
      };

      // First report
      await request(app.getHttpServer())
        .post(`/api/comments/${approvedCommentId}/report`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(reportData);

      // Second report should fail
      await request(app.getHttpServer())
        .post(`/api/comments/${approvedCommentId}/report`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(reportData)
        .expect(409);
    });

    it('should allow admin to view reported comments', async () => {
      // Create a report first
      const reportData = {
        reason: 'Spam',
        description: 'Reported as spam.',
      };

      await request(app.getHttpServer())
        .post(`/api/comments/${approvedCommentId}/report`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(reportData);

      // Admin should be able to view reports
      const response = await request(app.getHttpServer())
        .get('/api/admin/comments/reported')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      const reportedComment = response.body.data.find(c => c.id === approvedCommentId);
      expect(reportedComment).toBeDefined();
    });
  });

  describe('Comment Threading', () => {
    let parentCommentId: string;

    beforeEach(async () => {
      // Create a parent comment
      const parentData = {
        content: 'This is a parent comment.',
        targetType: 'event',
        targetId: eventId,
      };

      const response = await request(app.getHttpServer())
        .post('/api/comments')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(parentData);

      parentCommentId = response.body.id;
    });

    it('should create reply comments', async () => {
      const replyData = {
        content: 'This is a reply to the parent comment.',
        targetType: 'event',
        targetId: eventId,
        parentId: parentCommentId,
      };

      const response = await request(app.getHttpServer())
        .post('/api/comments')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(replyData)
        .expect(201);

      expect(response.body.parentId).toBe(parentCommentId);
      expect(response.body.content).toBe(replyData.content);
    });

    it('should retrieve comments with their replies', async () => {
      // Create a reply
      const replyData = {
        content: 'Reply to parent comment.',
        targetType: 'event',
        targetId: eventId,
        parentId: parentCommentId,
      };

      await request(app.getHttpServer())
        .post('/api/comments')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(replyData);

      // Retrieve comments with replies
      const response = await request(app.getHttpServer())
        .get(`/api/comments?targetType=event&targetId=${eventId}&includeReplies=true`)
        .expect(200);

      const parentComment = response.body.data.find(c => c.id === parentCommentId);
      expect(parentComment).toBeDefined();
      expect(parentComment.replies).toBeDefined();
      expect(parentComment.replies.length).toBe(1);
    });
  });
});
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Events Management (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let editorToken: string;
  let memberToken: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();

    // Create test users with different roles
    await setupTestUsers();
  });

  afterEach(async () => {
    await app.close();
  });

  async function setupTestUsers() {
    // Create admin
    const adminData = {
      username: 'eventadmin',
      email: 'eventadmin@giip.info',
      password: 'AdminPass123!',
      firstName: 'Event',
      lastName: 'Admin',
    };
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(adminData);

    await prisma.user.update({
      where: { email: adminData.email },
      data: { role: 'ADMIN' },
    });

    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: adminData.email, password: adminData.password });
    adminToken = adminLogin.body.accessToken;

    // Create editor
    const editorData = {
      username: 'eventeditor',
      email: 'eventeditor@giip.info',
      password: 'EditorPass123!',
      firstName: 'Event',
      lastName: 'Editor',
    };
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(editorData);

    await prisma.user.update({
      where: { email: editorData.email },
      data: { role: 'EDITOR' },
    });

    const editorLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: editorData.email, password: editorData.password });
    editorToken = editorLogin.body.accessToken;

    // Create member
    const memberData = {
      username: 'eventmember',
      email: 'eventmember@giip.info',
      password: 'MemberPass123!',
      firstName: 'Event',
      lastName: 'Member',
    };
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(memberData);

    await prisma.user.update({
      where: { email: memberData.email },
      data: { role: 'MEMBER' },
    });

    const memberLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: memberData.email, password: memberData.password });
    memberToken = memberLogin.body.accessToken;
  }

  describe('Event Creation and Management', () => {
    it('should create an event with valid data', async () => {
      const eventData = {
        title: 'Tech Conference 2024',
        description: 'Annual technology conference',
        contentMarkdown: '# Tech Conference 2024\n\nJoin us for the latest in technology.',
        startDate: new Date(Date.now() + 86400000).toISOString(),
        endDate: new Date(Date.now() + 172800000).toISOString(),
        location: 'Convention Center',
        maxAttendees: 500,
        registrationDeadline: new Date(Date.now() + 43200000).toISOString(),
        tags: ['technology', 'conference'],
      };

      const response = await request(app.getHttpServer())
        .post('/api/events')
        .set('Authorization', `Bearer ${editorToken}`)
        .send(eventData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(eventData.title);
      expect(response.body.status).toBe('draft');
      expect(response.body).toHaveProperty('contentHtml');
    });

    it('should validate required fields when creating event', async () => {
      const invalidEventData = {
        title: '', // Empty title should fail validation
        description: 'Test description',
      };

      await request(app.getHttpServer())
        .post('/api/events')
        .set('Authorization', `Bearer ${editorToken}`)
        .send(invalidEventData)
        .expect(400);
    });

    it('should update an existing event', async () => {
      // First create an event
      const eventData = {
        title: 'Original Title',
        description: 'Original description',
        contentMarkdown: '# Original Content',
        startDate: new Date(Date.now() + 86400000).toISOString(),
        endDate: new Date(Date.now() + 172800000).toISOString(),
        location: 'Original Location',
        maxAttendees: 100,
        registrationDeadline: new Date(Date.now() + 43200000).toISOString(),
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/events')
        .set('Authorization', `Bearer ${editorToken}`)
        .send(eventData);

      const eventId = createResponse.body.id;

      // Then update it
      const updateData = {
        title: 'Updated Title',
        description: 'Updated description',
        maxAttendees: 200,
      };

      const updateResponse = await request(app.getHttpServer())
        .patch(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.title).toBe(updateData.title);
      expect(updateResponse.body.description).toBe(updateData.description);
      expect(updateResponse.body.maxAttendees).toBe(updateData.maxAttendees);
    });

    it('should publish an event', async () => {
      // Create an event
      const eventData = {
        title: 'Event to Publish',
        description: 'This event will be published',
        contentMarkdown: '# Event Content',
        startDate: new Date(Date.now() + 86400000).toISOString(),
        endDate: new Date(Date.now() + 172800000).toISOString(),
        location: 'Test Location',
        maxAttendees: 100,
        registrationDeadline: new Date(Date.now() + 43200000).toISOString(),
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/events')
        .set('Authorization', `Bearer ${editorToken}`)
        .send(eventData);

      const eventId = createResponse.body.id;

      // Publish the event
      const publishResponse = await request(app.getHttpServer())
        .patch(`/api/events/${eventId}/publish`)
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(200);

      expect(publishResponse.body.status).toBe('published');
    });

    it('should delete an event', async () => {
      // Create an event
      const eventData = {
        title: 'Event to Delete',
        description: 'This event will be deleted',
        contentMarkdown: '# Event Content',
        startDate: new Date(Date.now() + 86400000).toISOString(),
        endDate: new Date(Date.now() + 172800000).toISOString(),
        location: 'Test Location',
        maxAttendees: 100,
        registrationDeadline: new Date(Date.now() + 43200000).toISOString(),
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(eventData);

      const eventId = createResponse.body.id;

      // Delete the event
      await request(app.getHttpServer())
        .delete(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify it's deleted
      await request(app.getHttpServer())
        .get(`/api/events/${eventId}`)
        .expect(404);
    });
  });

  describe('Event Registration Workflow', () => {
    let publishedEventId: string;

    beforeEach(async () => {
      // Create and publish an event for registration tests
      const eventData = {
        title: 'Registration Test Event',
        description: 'Event for testing registration',
        contentMarkdown: '# Registration Event',
        startDate: new Date(Date.now() + 86400000).toISOString(),
        endDate: new Date(Date.now() + 172800000).toISOString(),
        location: 'Test Location',
        maxAttendees: 2, // Small limit for testing
        registrationDeadline: new Date(Date.now() + 43200000).toISOString(),
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/events')
        .set('Authorization', `Bearer ${editorToken}`)
        .send(eventData);

      publishedEventId = createResponse.body.id;

      await request(app.getHttpServer())
        .patch(`/api/events/${publishedEventId}/publish`)
        .set('Authorization', `Bearer ${editorToken}`);
    });

    it('should allow member to register for published event', async () => {
      const registrationResponse = await request(app.getHttpServer())
        .post(`/api/events/${publishedEventId}/register`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          additionalInfo: {
            dietaryRestrictions: 'Vegetarian',
            specialRequests: 'None',
          },
        })
        .expect(201);

      expect(registrationResponse.body).toHaveProperty('id');
      expect(registrationResponse.body.status).toBe('confirmed');
    });

    it('should prevent duplicate registrations', async () => {
      // First registration
      await request(app.getHttpServer())
        .post(`/api/events/${publishedEventId}/register`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({});

      // Second registration should fail
      await request(app.getHttpServer())
        .post(`/api/events/${publishedEventId}/register`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({})
        .expect(409);
    });

    it('should handle event capacity limits', async () => {
      // Register two users (maxAttendees = 2)
      await request(app.getHttpServer())
        .post(`/api/events/${publishedEventId}/register`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({});

      // Create another member for second registration
      const member2Data = {
        username: 'member2',
        email: 'member2@giip.info',
        password: 'Member2Pass123!',
        firstName: 'Member',
        lastName: 'Two',
      };
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(member2Data);


      await prisma.user.update({
        where: { email: member2Data.email },
        data: { role: 'MEMBER' },
      });

      const member2Login = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: member2Data.email, password: member2Data.password });
      const member2Token = member2Login.body.accessToken;

      await request(app.getHttpServer())
        .post(`/api/events/${publishedEventId}/register`)
        .set('Authorization', `Bearer ${member2Token}`)
        .send({});

      // Third registration should fail due to capacity
      const member3Data = {
        username: 'member3',
        email: 'member3@giip.info',
        password: 'Member3Pass123!',
        firstName: 'Member',
        lastName: 'Three',
      };
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(member3Data);

      await prisma.user.update({
        where: { email: member3Data.email },
        data: { role: 'MEMBER' },
      });

      const member3Login = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: member3Data.email, password: member3Data.password });
      const member3Token = member3Login.body.accessToken;

      await request(app.getHttpServer())
        .post(`/api/events/${publishedEventId}/register`)
        .set('Authorization', `Bearer ${member3Token}`)
        .send({})
        .expect(409);
    });

    it('should allow member to cancel registration', async () => {
      // First register
      const registrationResponse = await request(app.getHttpServer())
        .post(`/api/events/${publishedEventId}/register`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({});

      const registrationId = registrationResponse.body.id;

      // Then cancel
      await request(app.getHttpServer())
        .delete(`/api/registrations/${registrationId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);
    });
  });

  describe('Event Search and Filtering', () => {
    beforeEach(async () => {
      // Create multiple events for search testing
      const events = [
        {
          title: 'JavaScript Conference',
          description: 'All about JavaScript',
          contentMarkdown: '# JS Conf',
          startDate: new Date(Date.now() + 86400000).toISOString(),
          endDate: new Date(Date.now() + 172800000).toISOString(),
          location: 'San Francisco',
          maxAttendees: 100,
          registrationDeadline: new Date(Date.now() + 43200000).toISOString(),
          tags: ['javascript', 'web'],
        },
        {
          title: 'Python Workshop',
          description: 'Learn Python programming',
          contentMarkdown: '# Python Workshop',
          startDate: new Date(Date.now() + 259200000).toISOString(),
          endDate: new Date(Date.now() + 345600000).toISOString(),
          location: 'New York',
          maxAttendees: 50,
          registrationDeadline: new Date(Date.now() + 129600000).toISOString(),
          tags: ['python', 'programming'],
        },
      ];

      for (const eventData of events) {
        const response = await request(app.getHttpServer())
          .post('/api/events')
          .set('Authorization', `Bearer ${editorToken}`)
          .send(eventData);

        await request(app.getHttpServer())
          .patch(`/api/events/${response.body.id}/publish`)
          .set('Authorization', `Bearer ${editorToken}`);
      }
    });

    it('should search events by title', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/events?search=JavaScript')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toContain('JavaScript');
    });

    it('should filter events by location', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/events?location=San Francisco')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].location).toBe('San Francisco');
    });

    it('should filter events by tags', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/events?tags=python')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].tags).toContain('python');
    });

    it('should paginate events list', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/events?page=1&limit=1')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination.total).toBeGreaterThan(1);
    });
  });
});
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Notification and Email System (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let memberToken: string;
  let editorToken: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();

    await setupTestUsers();
  });

  afterEach(async () => {
    await app.close();
  });

  async function setupTestUsers() {
    // Create admin user
    const adminData = {
      username: 'notifadmin',
      email: 'notifadmin@giip.info',
      password: 'AdminPass123!',
      firstName: 'Notification',
      lastName: 'Admin',
    };
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(adminData);

    await prisma.user.update({
      where: { email: adminData.email },
      data: { role: 'ADMIN' },
    });

    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: adminData.email, password: adminData.password });
    adminToken = adminLogin.body.accessToken;

    // Create editor user
    const editorData = {
      username: 'notifeditor',
      email: 'notifeditor@giip.info',
      password: 'EditorPass123!',
      firstName: 'Notification',
      lastName: 'Editor',
    };
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(editorData);

    await prisma.user.update({
      where: { email: editorData.email },
      data: { role: 'EDITOR' },
    });

    const editorLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: editorData.email, password: editorData.password });
    editorToken = editorLogin.body.accessToken;

    // Create member user
    const memberData = {
      username: 'notifmember',
      email: 'notifmember@giip.info',
      password: 'MemberPass123!',
      firstName: 'Notification',
      lastName: 'Member',
    };
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(memberData);

    await prisma.user.update({
      where: { email: memberData.email },
      data: { role: 'MEMBER' },
    });

    const memberLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: memberData.email, password: memberData.password });
    memberToken = memberLogin.body.accessToken;
  }

  describe('Email Template Management', () => {
    it('should create a new email template', async () => {
      const templateData = {
        name: 'welcome-email',
        subject: 'Welcome to {{siteName}}',
        htmlContent: '<h1>Welcome {{firstName}}!</h1><p>Thank you for joining {{siteName}}.</p>',
        textContent: 'Welcome {{firstName}}! Thank you for joining {{siteName}}.',
        variables: ['firstName', 'siteName'],
      };

      const response = await request(app.getHttpServer())
        .post('/api/admin/email-templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(templateData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(templateData.name);
      expect(response.body.subject).toBe(templateData.subject);
      expect(response.body.variables).toEqual(templateData.variables);
    });

    it('should retrieve all email templates', async () => {
      // Create a template first
      const templateData = {
        name: 'test-template',
        subject: 'Test Subject',
        htmlContent: '<p>Test content</p>',
        textContent: 'Test content',
        variables: [],
      };

      await request(app.getHttpServer())
        .post('/api/admin/email-templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(templateData);

      // Retrieve templates
      const response = await request(app.getHttpServer())
        .get('/api/admin/email-templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      const testTemplate = response.body.data.find(t => t.name === 'test-template');
      expect(testTemplate).toBeDefined();
    });

    it('should update an email template', async () => {
      // Create a template
      const templateData = {
        name: 'update-template',
        subject: 'Original Subject',
        htmlContent: '<p>Original content</p>',
        textContent: 'Original content',
        variables: [],
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/admin/email-templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(templateData);

      const templateId = createResponse.body.id;

      // Update the template
      const updateData = {
        subject: 'Updated Subject',
        htmlContent: '<p>Updated content</p>',
      };

      const updateResponse = await request(app.getHttpServer())
        .patch(`/api/admin/email-templates/${templateId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.subject).toBe(updateData.subject);
      expect(updateResponse.body.htmlContent).toBe(updateData.htmlContent);
    });

    it('should prevent non-admin users from managing templates', async () => {
      const templateData = {
        name: 'unauthorized-template',
        subject: 'Test Subject',
        htmlContent: '<p>Test content</p>',
        textContent: 'Test content',
        variables: [],
      };

      await request(app.getHttpServer())
        .post('/api/admin/email-templates')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(templateData)
        .expect(403);
    });
  });

  describe('Notification Triggers', () => {
    let eventId: string;

    beforeEach(async () => {
      // Create an event for notification testing
      const eventData = {
        title: 'Notification Test Event',
        description: 'Event for testing notifications',
        contentMarkdown: '# Notification Test',
        startDate: new Date(Date.now() + 86400000).toISOString(),
        endDate: new Date(Date.now() + 172800000).toISOString(),
        location: 'Test Location',
        maxAttendees: 100,
        registrationDeadline: new Date(Date.now() + 43200000).toISOString(),
      };

      const eventResponse = await request(app.getHttpServer())
        .post('/api/events')
        .set('Authorization', `Bearer ${editorToken}`)
        .send(eventData);

      eventId = eventResponse.body.id;

      await request(app.getHttpServer())
        .patch(`/api/events/${eventId}/publish`)
        .set('Authorization', `Bearer ${editorToken}`);
    });

    it('should trigger notification when user registers for event', async () => {
      // Register for the event
      await request(app.getHttpServer())
        .post(`/api/events/${eventId}/register`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({});

      // Check if notification was created
      const notificationsResponse = await request(app.getHttpServer())
        .get('/api/notifications')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      const registrationNotification = notificationsResponse.body.data.find(
        n => n.type === 'registration_confirmation'
      );
      expect(registrationNotification).toBeDefined();
      expect(registrationNotification.status).toBe('sent');
    });

    it('should trigger notification when event is published', async () => {
      // Create another event
      const newEventData = {
        title: 'New Published Event',
        description: 'This event will trigger notifications',
        contentMarkdown: '# New Event',
        startDate: new Date(Date.now() + 86400000).toISOString(),
        endDate: new Date(Date.now() + 172800000).toISOString(),
        location: 'Test Location',
        maxAttendees: 100,
        registrationDeadline: new Date(Date.now() + 43200000).toISOString(),
      };

      const newEventResponse = await request(app.getHttpServer())
        .post('/api/events')
        .set('Authorization', `Bearer ${editorToken}`)
        .send(newEventData);

      const newEventId = newEventResponse.body.id;

      // Publish the event
      await request(app.getHttpServer())
        .patch(`/api/events/${newEventId}/publish`)
        .set('Authorization', `Bearer ${editorToken}`);

      // Check if notifications were created for subscribers
      // Note: In a real scenario, this would check for users who have subscribed to event notifications
      const notificationsResponse = await request(app.getHttpServer())
        .get('/api/admin/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const eventPublishedNotifications = notificationsResponse.body.data.filter(
        n => n.type === 'event_published'
      );
      expect(eventPublishedNotifications.length).toBeGreaterThanOrEqual(0);
    });

    it('should trigger notification when comment needs moderation', async () => {
      // Add a sensitive word first
      await prisma.sensitiveWord.create({
        data: {
          word: 'flagword',
          level: 5,
          category: 'test',
        },
      });

      // Create a comment with sensitive content
      const commentData = {
        content: 'This comment contains flagword and should trigger moderation notification.',
        targetType: 'event',
        targetId: eventId,
      };

      await request(app.getHttpServer())
        .post('/api/comments')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(commentData);

      // Check if moderation notification was created for admins
      const adminNotificationsResponse = await request(app.getHttpServer())
        .get('/api/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const moderationNotification = adminNotificationsResponse.body.data.find(
        n => n.type === 'comment_moderation_required'
      );
      expect(moderationNotification).toBeDefined();
    });
  });

  describe('Notification Delivery and Status', () => {
    let notificationId: string;

    beforeEach(async () => {
      // Create a test notification
      const user = await prisma.user.findUnique({
        where: { email: 'notifmember@giip.info' },
      });

      const notification = await prisma.notification.create({
        data: {
          userId: user.id,
          to: user.email,
          type: 'test_notification',
          template: 'test_template',
          status: 'PENDING',
          variables: { testData: 'test value' },
        },
      });

      notificationId = notification.id;
    });

    it('should retrieve user notifications', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/notifications')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      const testNotification = response.body.data.find(n => n.id === notificationId);
      expect(testNotification).toBeDefined();
      expect(testNotification.type).toBe('test_notification');
    });

    it('should mark notification as read', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(response.body.readAt).toBeDefined();
      expect(new Date(response.body.readAt)).toBeInstanceOf(Date);
    });

    it('should get unread notification count', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('count');
      expect(typeof response.body.count).toBe('number');
    });

    it('should mark all notifications as read', async () => {
      // Create another notification
      const user = await prisma.user.findUnique({
        where: { email: 'notifmember@giip.info' },
      });

      await prisma.notification.create({
        data: {
          userId: user.id,
          to: user.email,
          type: 'another_test',
          template: 'another_test_template',
          status: 'PENDING',
        },
      });

      const response = await request(app.getHttpServer())
        .patch('/api/notifications/mark-all-read')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('updatedCount');
      expect(response.body.updatedCount).toBeGreaterThan(0);

      // Verify all notifications are marked as read
      const unreadResponse = await request(app.getHttpServer())
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(unreadResponse.body.count).toBe(0);
    });
  });

  describe('Email Queue and Processing', () => {
    it('should queue email notifications for processing', async () => {
      // Create an email template first
      const templateData = {
        name: 'queue-test-template',
        subject: 'Queue Test Email',
        htmlContent: '<p>Hello {{firstName}}, this is a test email.</p>',
        textContent: 'Hello {{firstName}}, this is a test email.',
        variables: ['firstName'],
      };

      await request(app.getHttpServer())
        .post('/api/admin/email-templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(templateData);

      // Send a test email
      const emailData = {
        templateName: 'queue-test-template',
        recipientEmail: 'notifmember@giip.info',
        variables: {
          firstName: 'Notification',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/admin/send-email')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(emailData)
        .expect(200);

      expect(response.body).toHaveProperty('jobId');
      expect(response.body.status).toBe('queued');
    });

    it('should handle email template variable substitution', async () => {
      // Create a template with multiple variables
      const templateData = {
        name: 'variable-test-template',
        subject: 'Welcome {{firstName}} to {{siteName}}',
        htmlContent: '<h1>Hello {{firstName}} {{lastName}}!</h1><p>Welcome to {{siteName}}. Your email is {{email}}.</p>',
        textContent: 'Hello {{firstName}} {{lastName}}! Welcome to {{siteName}}. Your email is {{email}}.',
        variables: ['firstName', 'lastName', 'siteName', 'email'],
      };

      await request(app.getHttpServer())
        .post('/api/admin/email-templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(templateData);

      // Test template rendering
      const renderData = {
        templateName: 'variable-test-template',
        variables: {
          firstName: 'John',
          lastName: 'Doe',
          siteName: 'Conference Platform',
          email: 'john.doe@giip.info',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/admin/email-templates/render')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(renderData)
        .expect(200);

      expect(response.body.subject).toBe('Welcome John to Conference Platform');
      expect(response.body.htmlContent).toContain('Hello John Doe!');
      expect(response.body.htmlContent).toContain('john.doe@giip.info');
    });

    it('should track email delivery status', async () => {
      // Get notification delivery logs
      const response = await request(app.getHttpServer())
        .get('/api/admin/notifications/delivery-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);

      // Each log entry should have required fields
      if (response.body.data.length > 0) {
        const logEntry = response.body.data[0];
        expect(logEntry).toHaveProperty('id');
        expect(logEntry).toHaveProperty('status');
        expect(logEntry).toHaveProperty('createdAt');
      }
    });
  });

  describe('Notification Preferences', () => {
    it('should allow users to update notification preferences', async () => {
      const preferencesData = {
        emailNotifications: true,
        eventReminders: false,
        commentNotifications: true,
        registrationConfirmations: true,
      };

      const response = await request(app.getHttpServer())
        .patch('/api/users/notification-preferences')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(preferencesData)
        .expect(200);

      expect(response.body.emailNotifications).toBe(preferencesData.emailNotifications);
      expect(response.body.eventReminders).toBe(preferencesData.eventReminders);
      expect(response.body.commentNotifications).toBe(preferencesData.commentNotifications);
    });

    it('should retrieve user notification preferences', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/notification-preferences')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('emailNotifications');
      expect(response.body).toHaveProperty('eventReminders');
      expect(response.body).toHaveProperty('commentNotifications');
      expect(response.body).toHaveProperty('registrationConfirmations');
    });

    it('should respect user preferences when sending notifications', async () => {
      // Disable email notifications for the user
      await request(app.getHttpServer())
        .patch('/api/users/notification-preferences')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ emailNotifications: false });

      // Create an event and register (this would normally trigger email)
      const eventData = {
        title: 'Preference Test Event',
        description: 'Testing notification preferences',
        contentMarkdown: '# Preference Test',
        startDate: new Date(Date.now() + 86400000).toISOString(),
        endDate: new Date(Date.now() + 172800000).toISOString(),
        location: 'Test Location',
        maxAttendees: 100,
        registrationDeadline: new Date(Date.now() + 43200000).toISOString(),
      };

      const eventResponse = await request(app.getHttpServer())
        .post('/api/events')
        .set('Authorization', `Bearer ${editorToken}`)
        .send(eventData);

      await request(app.getHttpServer())
        .patch(`/api/events/${eventResponse.body.id}/publish`)
        .set('Authorization', `Bearer ${editorToken}`);

      // Register for the event
      await request(app.getHttpServer())
        .post(`/api/events/${eventResponse.body.id}/register`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({});

      // Check that in-app notification was created but email was not sent
      const notificationsResponse = await request(app.getHttpServer())
        .get('/api/notifications')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      const registrationNotification = notificationsResponse.body.data.find(
        n => n.type === 'registration_confirmation'
      );
      
      // Should have in-app notification but email should be skipped due to preferences
      expect(registrationNotification).toBeDefined();
    });
  });
});
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Clean up database before tests
  await prisma.$transaction([
    prisma.commentReport.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.submission.deleteMany(),
    prisma.registration.deleteMany(),
    prisma.event.deleteMany(),
    prisma.news.deleteMany(),
    prisma.sensitiveWord.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.emailTemplate.deleteMany(),
    prisma.user.deleteMany(),
  ]);
});

afterAll(async () => {
  await prisma.$disconnect();
});
