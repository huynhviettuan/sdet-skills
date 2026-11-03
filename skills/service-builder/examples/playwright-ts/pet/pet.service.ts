import { type Pet, type PetStatus } from '@models/pet/pet.interface';
import { type ServiceResponse } from '@models/requests/request.type';
import { BaseService } from '@services/base.service';

/**
 * Generated 1:1 from OpenAPI tag `pet` — Swagger Petstore - OpenAPI 3.0 3.0.4 (specs/petstore.json).
 * One method per operation, in spec order; method name = operationId. Regenerate from the spec instead of renaming.
 * Paths are the spec paths verbatim; the server URL (incl. `/api/v3`) is `API_DOMAIN`.
 * Auth (`api_key` header / `petstore_auth`) is set once by the service fixture, never held here.
 */
export class PetService extends BaseService {
    /**
     * @operationId updatePet
     * PUT /pet
     */
    async updatePet(body: Pet): Promise<ServiceResponse<Pet>> {
        return this.send<Pet>('put', { uri: '/pet', body });
    }

    /**
     * @operationId addPet
     * POST /pet
     */
    async addPet(body: Pet): Promise<ServiceResponse<Pet>> {
        return this.send<Pet>('post', { uri: '/pet', body });
    }

    /**
     * @operationId findPetsByStatus
     * GET /pet/findByStatus
     */
    async findPetsByStatus(options: { query: { status: PetStatus } }): Promise<ServiceResponse<Pet[]>> {
        return this.send<Pet[]>('get', { uri: '/pet/findByStatus', params: options.query });
    }

    /**
     * @operationId findPetsByTags
     * GET /pet/findByTags
     * `tags` is sent as repeated keys (`?tags=a&tags=b`, spec `explode: true`) by `normalizeParams`.
     */
    async findPetsByTags(options: { query: { tags: string[] } }): Promise<ServiceResponse<Pet[]>> {
        return this.send<Pet[]>('get', { uri: '/pet/findByTags', params: options.query });
    }

    /**
     * @operationId getPetById
     * GET /pet/{petId}
     */
    async getPetById(petId: number): Promise<ServiceResponse<Pet>> {
        return this.send<Pet>('get', { uri: this.pathOf('/pet/{petId}', { petId }) });
    }

    /**
     * @operationId updatePetWithForm
     * POST /pet/{petId}
     */
    async updatePetWithForm(
        petId: number,
        options?: { query?: { name?: string; status?: string } }
    ): Promise<ServiceResponse<Pet>> {
        return this.send<Pet>('post', { uri: this.pathOf('/pet/{petId}', { petId }), params: options?.query });
    }

    /**
     * @operationId deletePet
     * DELETE /pet/{petId}
     */
    async deletePet(petId: number, options?: { headers?: { api_key?: string } }): Promise<ServiceResponse<void>> {
        return this.send<void>('delete', { uri: this.pathOf('/pet/{petId}', { petId }), headers: options?.headers });
    }

    /**
     * @operationId uploadFile
     * POST /pet/{petId}/uploadImage
     * @skipped request body is application/octet-stream; BaseService sends JSON or multipart only, and no case in docs/test-cases/pet.md needs it
     */
}
