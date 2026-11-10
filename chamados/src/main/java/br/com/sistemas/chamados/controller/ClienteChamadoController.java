package br.com.sistemas.chamados.controller;

import br.com.sistemas.chamados.dto.ChamadoResponse;
import br.com.sistemas.chamados.dto.PaginaResponse;
import br.com.sistemas.chamados.service.ChamadoService;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/clientes/{clienteId}/chamados")
public class ClienteChamadoController {
    private final ChamadoService service;

    public ClienteChamadoController(ChamadoService service) { this.service = service; }

    @GetMapping
    public PaginaResponse<ChamadoResponse> listar(@PathVariable Long clienteId,
            @ParameterObject @PageableDefault(size = 20, sort = "id") Pageable pageable) {
        return service.listarPorCliente(clienteId, pageable);
    }
}
