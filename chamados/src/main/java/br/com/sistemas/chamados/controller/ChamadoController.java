package br.com.sistemas.chamados.controller;

import java.net.URI;
import br.com.sistemas.chamados.dto.AlterarStatusRequest;
import br.com.sistemas.chamados.dto.AtribuirTecnicoRequest;
import br.com.sistemas.chamados.dto.ChamadoRequest;
import br.com.sistemas.chamados.dto.ChamadoResponse;
import br.com.sistemas.chamados.dto.PaginaResponse;
import br.com.sistemas.chamados.entity.Prioridade;
import br.com.sistemas.chamados.entity.StatusChamado;
import br.com.sistemas.chamados.service.ChamadoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.ResponseStatus;

@RestController
@RequestMapping("/chamados")
@Tag(name = "Chamados")
public class ChamadoController {
    private final ChamadoService service;

    public ChamadoController(ChamadoService service) { this.service = service; }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Abrir chamado")
    public ResponseEntity<ChamadoResponse> criar(@Valid @RequestBody ChamadoRequest dto) {
        ChamadoResponse criado = service.criar(dto);
        return ResponseEntity.created(URI.create("/chamados/" + criado.id())).body(criado);
    }

    @GetMapping
    @Operation(summary = "Consultar chamados com filtros e paginação")
    public PaginaResponse<ChamadoResponse> listar(@RequestParam(required = false) StatusChamado status,
            @RequestParam(required = false) Prioridade prioridade, @RequestParam(required = false) Long clienteId,
            @ParameterObject @PageableDefault(size = 20, sort = "id", direction = Sort.Direction.DESC) Pageable pageable) {
        return service.listar(status, prioridade, clienteId, pageable);
    }

    @GetMapping("/{id}")
    public ChamadoResponse buscar(@PathVariable Long id) { return service.buscar(id); }

    @PutMapping("/{id}")
    public ChamadoResponse atualizar(@PathVariable Long id, @Valid @RequestBody ChamadoRequest dto) {
        return service.atualizar(id, dto);
    }

    @PatchMapping("/{id}/atribuir")
    @Operation(summary = "Atribuir técnico a chamado aberto")
    public ChamadoResponse atribuir(@PathVariable Long id, @Valid @RequestBody AtribuirTecnicoRequest dto) {
        return service.atribuir(id, dto.tecnicoId());
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Alterar status; ao fechar, registrar data de fechamento")
    public ChamadoResponse alterarStatus(@PathVariable Long id, @Valid @RequestBody AlterarStatusRequest dto) {
        return service.alterarStatus(id, dto.status());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        service.excluir(id);
        return ResponseEntity.noContent().build();
    }
}
