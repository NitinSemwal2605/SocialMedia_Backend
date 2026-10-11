import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect } from 'vitest';
import { PrismaService } from './prisma.service.js';

describe('PrismaService', () => {
  it('should be defined and expose client, orm and sql surfaces', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    const service = module.get<PrismaService>(PrismaService);
    expect(service).toBeDefined();
    expect(service.client).toBeDefined();
    expect(service.orm).toBeDefined();
    expect(service.sql).toBeDefined();
  });
});
