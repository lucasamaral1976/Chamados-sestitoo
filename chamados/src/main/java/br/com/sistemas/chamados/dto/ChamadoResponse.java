package br.com.sistemas.chamados.dto;

import java.time.LocalDateTime;
import br.com.sistemas.chamados.entity.Chamado;
import br.com.sistemas.chamados.entity.Prioridade;
import br.com.sistemas.chamados.entity.StatusChamado;

public record ChamadoResponse(Long id, String titulo, String descricao, LocalDateTime dataAbertura,
        LocalDateTime dataFechamento, Prioridade prioridade, StatusChamado status,
        Long clienteId, Long categoriaId, Long tecnicoId) {
    public static ChamadoResponse de(Chamado chamado) {
        return new ChamadoResponse(chamado.getId(), chamado.getTitulo(), chamado.getDescricao(),
                chamado.getDataAbertura(), chamado.getDataFechamento(), chamado.getPrioridade(), chamado.getStatus(),
                chamado.getCliente().getId(), chamado.getCategoria().getId(),
                chamado.getTecnico() == null ? null : chamado.getTecnico().getId());
    }
}
