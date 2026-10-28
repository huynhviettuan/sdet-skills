package com.example.qa.api.models.pet;

import com.fasterxml.jackson.annotation.JsonValue;

/** Generated from components.schemas.Pet.properties.status (enum). */
public enum PetStatus {
    AVAILABLE("available"),
    PENDING("pending"),
    SOLD("sold");

    private final String value;

    PetStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String value() {
        return value;
    }
}
