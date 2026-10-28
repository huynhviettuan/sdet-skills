package com.example.qa.api.models.pet;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Query parameters of operation findPetsByTags ({@code explode: true}: one {@code tags=} per value). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FindPetsByTagsQuery {
    private List<String> tags;
}
