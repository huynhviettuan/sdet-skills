// Generated 1:1 from OpenAPI components.schemas — Swagger Petstore - OpenAPI 3.0 3.0.4 (specs/petstore.json, tag `pet`).
// Regenerate; don't hand-edit.

/** pet status in the store */
export type PetStatus = 'available' | 'pending' | 'sold';

export type Category = {
    id?: number;
    name?: string;
};

export type Tag = {
    id?: number;
    name?: string;
};

export type Pet = {
    id?: number;
    name: string;
    category?: Category;
    photoUrls: string[];
    tags?: Tag[];
    status?: PetStatus;
};
