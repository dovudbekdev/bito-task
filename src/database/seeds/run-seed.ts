import { AppDataSource } from '../data-source';
import { SeedService } from './seed.service';

async function runSeed(): Promise<void> {
  await AppDataSource.initialize();

  try {
    const seedService = new SeedService(AppDataSource);
    await seedService.run();
  } finally {
    await AppDataSource.destroy();
  }
}

runSeed().catch((error: unknown) => {
  console.error('Seed xatolik bilan yakunlandi:', error);
  process.exit(1);
});
