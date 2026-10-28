package com.example.qa.api.models.pet;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Query parameters of operation updatePetWithForm. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdatePetWithFormQuery {
    private String name;
    private String status;
}
