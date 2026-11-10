package br.com.sistemas.chamados.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record AtribuirTecnicoRequest(
        @NotNull(message = "Técnico é obrigatório") @Positive(message = "Técnico deve ter ID positivo") Long tecnicoId
) { }
