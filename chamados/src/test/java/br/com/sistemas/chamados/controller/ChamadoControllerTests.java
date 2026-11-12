package br.com.sistemas.chamados.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.time.LocalDateTime;
import java.util.List;
import br.com.sistemas.chamados.dto.*;
import br.com.sistemas.chamados.entity.*;
import br.com.sistemas.chamados.exception.ChamadoFechadoException;
import br.com.sistemas.chamados.exception.RecursoNaoEncontradoException;
import br.com.sistemas.chamados.service.ChamadoService;
import br.com.sistemas.chamados.service.ComentarioService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest({ChamadoController.class, ClienteChamadoController.class, ComentarioController.class})
class ChamadoControllerTests {
    @Autowired MockMvc mvc;
    @MockitoBean ChamadoService service;
    @MockitoBean ComentarioService comentarios;

    private static final String VALIDO = """
            {"titulo":"Sem internet","descricao":"Rede caiu","prioridade":"ALTA","clienteId":1,"categoriaId":2}
            """;

    private ChamadoResponse resposta() {
        return new ChamadoResponse(1L, "Sem internet", "Rede caiu", LocalDateTime.now(), null,
                Prioridade.ALTA, StatusChamado.ABERTO, 1L, 2L, null);
    }

    @Test
    void criaChamadoComLocation() throws Exception {
        when(service.criar(any())).thenReturn(resposta());
        mvc.perform(post("/chamados").contentType(MediaType.APPLICATION_JSON).content(VALIDO))
                .andExpect(status().isCreated()).andExpect(header().string("Location", "/chamados/1"))
                .andExpect(jsonPath("$.status").value("ABERTO"));
    }

    @Test
    void validaCamposObrigatorios() throws Exception {
        mvc.perform(post("/chamados").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.detalhes").isNotEmpty());
        verifyNoInteractions(service);
    }

    @Test
    void relacionamentoAusenteRetorna404() throws Exception {
        when(service.criar(any())).thenThrow(new RecursoNaoEncontradoException("Cliente não encontrado"));
        mvc.perform(post("/chamados").contentType(MediaType.APPLICATION_JSON).content(VALIDO))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void encaminhaFiltrosPaginacaoEOrdenacao() throws Exception {
        when(service.listar(any(), any(), any(), any()))
                .thenReturn(new PaginaResponse<>(List.of(resposta()), 1, 5, 6, 2, true));
        mvc.perform(get("/chamados").param("status", "ABERTO").param("prioridade", "ALTA")
                .param("clienteId", "1").param("page", "1").param("size", "5").param("sort", "titulo,asc"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.page").value(1));
        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(service).listar(eq(StatusChamado.ABERTO), eq(Prioridade.ALTA), eq(1L), captor.capture());
        assertThat(captor.getValue().getPageNumber()).isEqualTo(1);
        assertThat(captor.getValue().getPageSize()).isEqualTo(5);
        assertThat(captor.getValue().getSort().getOrderFor("titulo").isAscending()).isTrue();
    }

    @Test
    void statusDesconhecidoOuAusenteRetorna400() throws Exception {
        mvc.perform(patch("/chamados/1/status").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
        mvc.perform(patch("/chamados/1/status").contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"INVALIDO\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.status").value(400));
        verifyNoInteractions(service);
    }

    @Test
    void chamadoFechadoRetorna409() throws Exception {
        when(service.atribuir(1L, 2L)).thenThrow(new ChamadoFechadoException(1L));
        mvc.perform(patch("/chamados/1/atribuir").contentType(MediaType.APPLICATION_JSON)
                .content("{\"tecnicoId\":2}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.status").value(409));
    }

    @Test
    void listaChamadosDoCliente() throws Exception {
        when(service.listarPorCliente(eq(1L), any()))
                .thenReturn(new PaginaResponse<>(List.of(resposta()), 0, 20, 1, 1, true));
        mvc.perform(get("/clientes/1/chamados")).andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].clienteId").value(1));
    }

    @Test
    void criaEListaComentarios() throws Exception {
        var comentario = new ComentarioResponse(1L, "Verificando", LocalDateTime.now(), "Joao", 1L);
        when(comentarios.criar(eq(1L), any())).thenReturn(comentario);
        when(comentarios.listar(1L)).thenReturn(List.of(comentario));
        mvc.perform(post("/chamados/1/comentarios").contentType(MediaType.APPLICATION_JSON)
                .content("{\"texto\":\"Verificando\",\"autor\":\"Joao\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.chamadoId").value(1));
        mvc.perform(get("/chamados/1/comentarios")).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].texto").value("Verificando"));
    }
}
