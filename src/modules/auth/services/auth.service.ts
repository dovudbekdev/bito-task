import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AllConfigType } from '@config';
import { IJwtPayload } from '@common';
import { UserService } from '../../user/services';
import {
  ChangePasswordDto,
  LoginDto,
  RefreshTokenDto,
  ResetPasswordDto,
} from '../dto';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.userService.findByLogin(dto.login);

    if (!user) {
      throw new UnauthorizedException('Invalid login or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid login or password');
    }

    const tokens = await this.generateTokens(user.id, user.login, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        login: user.login,
        role: user.role,
      },
    };
  }

  async logout(userId: number): Promise<void> {
    await this.userService.updateRefreshToken(userId, null);
  }

  async refresh(dto: RefreshTokenDto) {
    const jwtConfig = this.configService.get('jwt', { infer: true })!;

    let payload: IJwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<IJwtPayload>(dto.refreshToken, {
        secret: jwtConfig.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.userService.findByIdWithSecrets(payload.userId);

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const isRefreshTokenValid = await bcrypt.compare(
      dto.refreshToken,
      user.refreshToken,
    );

    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.generateTokens(user.id, user.login, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        login: user.login,
        role: user.role,
      },
    };
  }

  async changePassword(actor: IJwtPayload, dto: ChangePasswordDto) {
    const user = await this.userService.findByIdWithSecrets(actor.userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    await this.userService.updatePassword(actor.userId, dto.newPassword);

    return { message: 'Password updated successfully' };
  }

  async resetPassword(
    actor: IJwtPayload,
    targetUserId: number,
    dto: ResetPasswordDto,
  ) {
    const targetUser = await this.userService.findById(targetUserId);

    if (!targetUser) {
      throw new UnauthorizedException('User not found');
    }

    try {
      this.userService.assertCanManage(actor, targetUser);
    } catch {
      throw new ForbiddenException('You are not allowed to reset this user password');
    }

    await this.userService.updatePassword(targetUserId, dto.newPassword);

    return { message: 'Password reset successfully' };
  }

  private async generateTokens(userId: number, login: string, role: IJwtPayload['role']) {
    const jwtConfig = this.configService.get('jwt', { infer: true })!;
    const payload: IJwtPayload = { userId, login, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: jwtConfig.accessSecret,
        expiresIn: jwtConfig.accessExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
      }),
      this.jwtService.signAsync(payload, {
        secret: jwtConfig.refreshSecret,
        expiresIn: jwtConfig.refreshExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(userId: number, refreshToken: string): Promise<void> {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);
    await this.userService.updateRefreshToken(userId, hashedRefreshToken);
  }
}
