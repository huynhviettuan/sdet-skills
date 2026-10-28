package com.example.qa.api.models.pet;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Query parameters of operation findPetsByStatus. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FindPetsByStatusQuery {
    private PetStatus status;
}
