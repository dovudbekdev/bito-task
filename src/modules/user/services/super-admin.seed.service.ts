import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '@config';
import { UserRole } from '@common';
import { UserService } from './user.service';

@Injectable()
export class SuperAdminSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SuperAdminSeedService.name);

  constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const superAdminCount = await this.userService.countByRole(UserRole.SUPER_ADMIN);

    if (superAdminCount > 0) {
      return;
    }

    const adminConfig = this.configService.get('admin', { infer: true })!;

    await this.userService.createSeedUser({
      name: 'Super Admin',
      login: adminConfig.superAdminLogin!,
      password: adminConfig.superAdminPassword!,
      role: UserRole.SUPER_ADMIN,
    });

    this.logger.log('Super admin seeded successfully');
  }
}
