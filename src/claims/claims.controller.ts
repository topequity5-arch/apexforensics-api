/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { RolesGuard } from '../auth/roles.guard';
import { ClaimsService } from './claims.service';
import type { AuthenticatedRequest } from '../auth/interface/authenticated-request.interface';
import { CreateClaimDto, UpdateClaimDto } from './dto/claims.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('claims')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

  @Post()
  async create(@Req() req: AuthenticatedRequest, @Body() body: CreateClaimDto) {
    return this.claimsService.createClaim(req.user.id, body);
  }

  @Get()
  async findAll() {
    return this.claimsService.getClaims();
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: UpdateClaimDto,
  ) {
    return this.claimsService.updateClaim(id, req.user, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.claimsService.deleteClaim(id, req.user);
  }
}
