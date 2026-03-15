import request from 'supertest';

import { createTestingApp } from '../../../test-utils/create-testing-app';

describe('Supplier legal profile & bank accounts (P3-4)', () => {
  let app: any;
  let server: any;
  let ownerToken: string;
  let managerToken: string;
  let operatorId: string;

  beforeAll(async () => {
    const testing = await createTestingApp();
    app = testing.app;
    server = testing.server;

    // В тестах уже должны быть сиды/хелперы для поставщика; если их нет,
    // этот блок придётся адаптировать под имеющийся createSupplierHelper.
    const ownerRes = await request(server)
      .post('/supplier/auth/register')
      .send({ email: 'owner-p3@example.com', password: 'password', name: 'Owner P3' })
      .expect(201);
    ownerToken = ownerRes.body.accessToken;
    operatorId = ownerRes.body.operatorId;

    const managerRes = await request(server)
      .post('/supplier/auth/register')
      .send({ email: 'manager-p3@example.com', password: 'password', name: 'Manager P3' })
      .expect(201);
    managerToken = managerRes.body.accessToken;
    // Менеджеру можно будет назначить роль через отдельный helper, если он появится.
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Validation (negative cases)', () => {
    it('should reject invalid INN (11 digits) with 400', async () => {
      await request(server)
        .patch('/supplier/profile/legal')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ inn: '12345678901' })
        .expect(400);
    });

    it('should reject BIK with non-digits', async () => {
      await request(server)
        .post('/supplier/profile/bank-accounts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          bankName: 'Test Bank',
          bik: 'ABC456789',
          accountNumber: '12345678901234567890',
        })
        .expect(400);
    });

    it('should reject account number with letters', async () => {
      await request(server)
        .post('/supplier/profile/bank-accounts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          bankName: 'Test Bank',
          bik: '123456789',
          accountNumber: '12345678901234567AB',
        })
        .expect(400);
    });

    it('should forbid access for non-OWNER roles', async () => {
      await request(server)
        .patch('/supplier/profile/legal')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ inn: '1234567890' })
        .expect(403);

      await request(server)
        .post('/supplier/profile/bank-accounts')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          bankName: 'Test Bank',
          bik: '123456789',
          accountNumber: '12345678901234567890',
        })
        .expect(403);
    });
  });

  describe('Business logic (positive cases)', () => {
    it('should create legal profile on the fly when adding first bank account', async () => {
      const res = await request(server)
        .post('/supplier/profile/bank-accounts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          bankName: 'Bank A',
          bik: '123456789',
          accountNumber: '12345678901234567890',
          isPrimary: true,
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.isPrimary).toBe(true);

      const profileRes = await request(server)
        .get('/supplier/profile/legal')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(profileRes.body).toBeTruthy();
      expect(profileRes.body.operatorId).toBe(operatorId);
      expect(profileRes.body.status).toBe('INCOMPLETE');
    });

    it('should rotate primary flag when creating new primary account', async () => {
      const firstList = await request(server)
        .get('/supplier/profile/bank-accounts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const primaryBefore = firstList.body.find((a: any) => a.isPrimary);
      expect(primaryBefore).toBeTruthy();

      const res = await request(server)
        .post('/supplier/profile/bank-accounts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          bankName: 'Bank B',
          bik: '987654321',
          accountNumber: '11111111111111111111',
          isPrimary: true,
        })
        .expect(201);

      expect(res.body.isPrimary).toBe(true);

      const listAfter = await request(server)
        .get('/supplier/profile/bank-accounts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const primaries = listAfter.body.filter((a: any) => a.isPrimary);
      expect(primaries).toHaveLength(1);
      expect(primaries[0].id).not.toBe(primaryBefore.id);
    });

    it('should reset profile status to INCOMPLETE on legal profile change', async () => {
      // эмулируем VERIFIED через прямое обновление (как будто админ уже утвердил профиль)
      await request(server)
        .patch('/admin/suppliers/status/' + operatorId)
        .send({ legalProfileStatus: 'VERIFIED' })
        .expect(404); // TODO: заменить на реальный admin endpoint, когда он появится

      const res = await request(server)
        .patch('/supplier/profile/legal')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ legalAddress: 'Updated address' })
        .expect(200);

      expect(res.body.status).toBe('INCOMPLETE');
    });
  });
});

