/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/only-throw-error */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
// src/claims/claims.service.ts
import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateClaimDto, UpdateClaimDto } from './dto/claims.dto';
import { ClaimResponseDto } from './dto/claims_response.dto';

@Injectable()
export class ClaimsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async createClaim(
    userId: string,
    claimData: CreateClaimDto,
  ): Promise<ClaimResponseDto> {
    // 1. Create the base claim entry
    const { data: claim, error: claimError } = await this.supabaseService.client
      .from('claims')
      .insert([{ ...claimData, client_id: userId }])
      .select()
      .single();

    if (claimError || !claim) throw claimError;

    try {
      // 2. Atomically create the 1:1 Chat Thread bound exclusively to this Claim ID
      const { data: thread, error: threadError } =
        await this.supabaseService.client
          .from('chat_threads')
          .insert({
            claim_id: claim.id,
            complaint_title: `Claim Discussion - Thread`,
            complaint_description:
              claimData.details || 'Initial claim setup documentation.',
          })
          .select()
          .single();

      if (threadError || !thread) throw threadError;

      // 3. Automatically seed the initial first chat message inside the new thread context
      const { error: msgError } = await this.supabaseService.client
        .from('chat_messages')
        .insert({
          thread_id: thread.id,
          sender_id: userId,
          sender_role: 'client',
          message: claimData.details || 'Initial claim created.',
        });

      if (msgError) throw msgError;
    } catch (transactionRollbackErr) {
      // Clean up orphaned base claim if nested child seed processes error out
      await this.supabaseService.client
        .from('claims')
        .delete()
        .eq('id', claim.id);
      throw transactionRollbackErr;
    }

    return claim;
  }

  async getClaims(): Promise<any[]> {
    // 1. Fetch raw claims ledger entries
    const { data: claims, error: claimsError } =
      await this.supabaseService.client.from('claims').select('*');

    if (claimsError || !claims) {
      throw new BadRequestException(
        `Failed to retrieve claims: ${claimsError?.message}`,
      );
    }
    if (claims.length === 0) return [];

    // Extract unique client IDs to query profile metadata efficiently
    const clientIds = [
      ...new Set(claims.map((c) => c.client_id).filter(Boolean)),
    ];

    // 2. Query the custom public metadata fields (like full_name)
    const { data: profiles, error: profilesError } =
      await this.supabaseService.client
        .from('profiles')
        .select('id, full_name')
        .in('id', clientIds);

    if (profilesError) {
      throw new BadRequestException(
        `Failed to retrieve profiles: ${profilesError.message}`,
      );
    }

    // 3. Query secure auth identities directly via the Admin Auth Management API
    // Note: This requires your Supabase client initialization to use your SERVICE_ROLE_KEY
    const { data: authData, error: authError } =
      await this.supabaseService.adminClient.auth.admin.listUsers();

    if (authError) {
      throw new BadRequestException(
        `Failed to retrieve secure auth data: ${authError.message}`,
      );
    }

    // 4. Transform auth users list into an accessible lookup dictionary mapping
    const authMap = new Map(authData.users.map((u) => [u.id, u.email]));

    // Transform custom metadata profiles into a lookup dictionary mapping
    const profileMap = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);

    // 5. Construct the integrated payloads to match frontend interfaces exactly
    return claims.map((claim: ClaimResponseDto) => {
      const userId = claim.clientId;
      return {
        ...claim,
        profiles: {
          id: userId,
          full_name: profileMap.get(userId) || 'Anonymous Client',
          email: authMap.get(userId) || 'No registered account email',
        },
      };
    });
  }
  async getClaimsByClientId(clientId: string): Promise<any[]> {
    // 1. Fetch claims specifically for the provided client ID
    const { data: claims, error: claimsError } =
      await this.supabaseService.client
        .from('claims')
        .select('*')
        .eq('client_id', clientId);

    if (claimsError) {
      throw new BadRequestException(
        `Failed to retrieve claims for client ${clientId}: ${claimsError.message}`,
      );
    }
    if (!claims || claims.length === 0) return [];

    // 2. Fetch the profile metadata for the single client
    const { data: profile, error: profileError } =
      await this.supabaseService.client
        .from('profiles')
        .select('id, full_name')
        .eq('id', clientId)
        .single();

    if (profileError) {
      throw new BadRequestException(
        `Failed to retrieve profile for client ${clientId}: ${profileError.message}`,
      );
    }

    // 3. Fetch the auth identity directly via Admin Auth API
    const { data: authData, error: authError } =
      await this.supabaseService.adminClient.auth.admin.getUserById(clientId);

    if (authError) {
      throw new BadRequestException(
        `Failed to retrieve secure auth data for client ${clientId}: ${authError.message}`,
      );
    }

    // 4. Construct the integrated payload
    const clientProfile = {
      id: clientId,
      full_name: profile?.full_name || 'Anonymous Client',
      email: authData.user?.email || 'No registered account email',
    };

    return claims.map((claim) => ({
      ...claim,
      profiles: clientProfile,
    }));
  }

  async updateClaim(
    claimId: string,
    user: { id: string; role: string },
    updateData: UpdateClaimDto,
  ) {
    if (user.role !== 'admin') {
      const { data, error } = await this.supabaseService.client
        .from('claims')
        .select('client_id')
        .eq('id', claimId)
        .single();

      if (error || !data) throw new ForbiddenException();
      if (data.client_id !== user.id) throw new ForbiddenException();
    }

    const { data, error } = await this.supabaseService.client
      .from('claims')
      .update(updateData)
      .eq('id', claimId)
      .select();
    if (error) throw error;
    return data;
  }

  async deleteClaim(claimId: string, user: { id: string; role: string }) {
    if (user.role !== 'admin') {
      const { data, error } = await this.supabaseService.client
        .from('claims')
        .select('client_id')
        .eq('id', claimId)
        .single();

      if (error || !data) throw new ForbiddenException();
      if (data.client_id !== user.id) throw new ForbiddenException();
    }

    const { error } = await this.supabaseService.client
      .from('claims')
      .delete()
      .eq('id', claimId);
    if (error) throw error;
    return { deleted: true };
  }
}
