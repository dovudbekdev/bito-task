import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, IJwtPayload, Public, Roles, UserRole } from '@common';
import {
  ChangePasswordDto,
  LoginDto,
  RefreshTokenDto,
  ResetPasswordDto,
  SwitchTenantDto,
} from '../dto';
import { AuthService } from '../services';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @ApiBearerAuth()
  @Get('logout')
  logout(@CurrentUser() user: IJwtPayload) {
    return this.authService.logout(user.userId);
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @Post('switch-tenant')
  switchTenant(
    @CurrentUser() actor: IJwtPayload,
    @Body() dto: SwitchTenantDto,
  ) {
    return this.authService.switchTenant(actor, dto);
  }

  @ApiBearerAuth()
  @Patch('password')
  changePassword(
    @CurrentUser() user: IJwtPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user, dto);
  }

  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Patch('password/:userId')
  resetPassword(
    @CurrentUser() actor: IJwtPayload,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.authService.resetPassword(actor, userId, dto);
  }
}
