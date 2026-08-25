import type { ContactRoleType } from "@prisma/client";

import { ContactRepository } from "@/lib/repositories/contact-repository";

export interface CreateContactInput {
  name: string;
  roleType?: ContactRoleType | null;
  organization?: string | null;
  email?: string | null;
  phone?: string | null;
  profileUrl?: string | null;
  notes?: string | null;
}

export interface UpdateContactInput {
  name?: string;
  roleType?: ContactRoleType | null;
  organization?: string | null;
  email?: string | null;
  phone?: string | null;
  profileUrl?: string | null;
  notes?: string | null;
}

export class ContactService {
  constructor(private readonly repository: ContactRepository) {}

  async create(ownerId: string, input: CreateContactInput) {
    return this.repository.create(ownerId, input);
  }

  async getById(ownerId: string, contactId: string) {
    return this.repository.getById(ownerId, contactId);
  }

  async update(ownerId: string, contactId: string, input: UpdateContactInput) {
    return this.repository.update(ownerId, contactId, input);
  }

  async addToOpportunity(
    ownerId: string,
    opportunityId: string,
    contactId: string,
  ) {
    return this.repository.addToOpportunity(ownerId, opportunityId, contactId);
  }

  async removeFromOpportunity(
    ownerId: string,
    opportunityId: string,
    contactId: string,
  ) {
    return this.repository.removeFromOpportunity(
      ownerId,
      opportunityId,
      contactId,
    );
  }

  async getForOpportunity(ownerId: string, opportunityId: string) {
    return this.repository.getForOpportunity(ownerId, opportunityId);
  }
}
