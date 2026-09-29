package com.depa.consent.controller;

import com.depa.consent.dto.OrganizationResponse;
import com.depa.consent.service.OrganizationService;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;

import java.util.List;

@Controller
@PreAuthorize("isAuthenticated()")
public class OrganizationGraphqlController {

    private final OrganizationService organizationService;

    public OrganizationGraphqlController(OrganizationService organizationService) {
        this.organizationService = organizationService;
    }

    @QueryMapping
    public List<OrganizationResponse> getAllOrganizations() {
        return organizationService.getAllOrganizations();
    }

    @QueryMapping
    public OrganizationResponse getOrganizationByCode(@Argument String code) {
        return new OrganizationResponse(organizationService.getOrganizationEntityByCode(code));
    }
}
