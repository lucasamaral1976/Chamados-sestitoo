package br.com.sistemas.chamados.dto;

import br.com.sistemas.chamados.entity.Prioridade;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record ChamadoRequest(
        @NotBlank(message = "Título é obrigatório")
        @Size(max = 150, message = "Título deve ter no máximo 150 caracteres") String titulo,
        @NotBlank(message = "Descrição é obrigatória")
        @Size(max = 5000, message = "Descrição deve ter no máximo 5000 caracteres") String descricao,
        @NotNull(message = "Prioridade é obrigatória") Prioridade prioridade,
        @NotNull(message = "Cliente é obrigatório") @Positive(message = "Cliente deve ter ID positivo") Long clienteId,
        @NotNull(message = "Categoria é obrigatória") @Positive(message = "Categoria deve ter ID positivo") Long categoriaId,
        @Positive(message = "Técnico deve ter ID positivo") Long tecnicoId
) { }
