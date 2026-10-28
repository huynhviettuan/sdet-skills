// Generated 1:1 from OpenAPI components.schemas — Swagger Petstore - OpenAPI 3.0 1.0.28 (specs/petstore.json).
// Regenerate; don't hand-edit.

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
