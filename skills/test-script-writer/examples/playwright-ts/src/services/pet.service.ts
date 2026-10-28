import { URLSearchParams } from 'node:url';

import { type Pet, type PetStatus } from '@models/pet/pet.interface';
import { type ServiceResponse } from '@models/requests/request.type';
import { BaseService } from '@services/base.service';

/**
 * Generated 1:1 from OpenAPI tag `pet` — Swagger Petstore - OpenAPI 3.0 1.0.28 (specs/petstore.json).
 * One method per operation; method name = operationId. Regenerate from the spec instead of renaming.
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
     * `tags` is `explode: true`: one `tags=` pair per value. BaseService joins plain arrays with commas, which this
     * server reads as a single tag (it returns []), so the query is built as URLSearchParams.
     */
    async findPetsByTags(options: { query: { tags: string[] } }): Promise<ServiceResponse<Pet[]>> {
        const params = new URLSearchParams(options.query.tags.map((tag) => ['tags', tag]));
        return this.send<Pet[]>('get', { uri: '/pet/findByTags', params });
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
     * @skipped not needed by the example cases (docs/test-cases/pet.md)
     */

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
     * @skipped request body is application/octet-stream; not needed by the example cases
     */
}
