package br.com.sistemas.chamados.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.List;
import br.com.sistemas.chamados.dto.*;
import br.com.sistemas.chamados.entity.Perfil;
import br.com.sistemas.chamados.exception.RecursoNaoEncontradoException;
import br.com.sistemas.chamados.exception.RegraNegocioException;
import br.com.sistemas.chamados.service.CategoriaService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(CategoriaController.class)
class CategoriaControllerTests {
    @Autowired MockMvc mvc;
    @MockitoBean CategoriaService service;

    private static final String VALIDO = """
            {"nome":"Rede","descricao":"Acesso"}
            """;

    @Test
    void criaComLocationEListaDTOs() throws Exception {
        var resposta = new CategoriaResponse(1L, "Rede", "Acesso");
        when(service.criar(any())).thenReturn(resposta);
        when(service.listar()).thenReturn(List.of(resposta));
        mvc.perform(post("/categorias").contentType(MediaType.APPLICATION_JSON).content(VALIDO))
                .andExpect(status().isCreated()).andExpect(header().string("Location", "/categorias/1"))
                .andExpect(jsonPath("$.id").value(1));
        mvc.perform(get("/categorias")).andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(1));
    }

    @Test
    void rejeitaDadosInvalidosAntesDeChamarService() throws Exception {
        mvc.perform(post("/categorias").contentType(MediaType.APPLICATION_JSON).content("""
                {"nome":""}
                """))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.detalhes").isNotEmpty());
        verifyNoInteractions(service);
    }

    @Test
    void recursoAusenteRetorna404Padronizado() throws Exception {
        when(service.buscar(999L)).thenThrow(new RecursoNaoEncontradoException("Recurso não encontrado"));
        mvc.perform(get("/categorias/999")).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404)).andExpect(jsonPath("$.momento").exists());
    }

    @Test
    void duplicidadeRetorna409() throws Exception {
        when(service.criar(any())).thenThrow(new RegraNegocioException("Registro duplicado"));
        mvc.perform(post("/categorias").contentType(MediaType.APPLICATION_JSON).content(VALIDO))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.erro").value("Registro duplicado"));
    }

    @Test
    void atualizaEExcluiComStatusCorreto() throws Exception {
        when(service.atualizar(eq(1L), any())).thenReturn(new CategoriaResponse(1L, "Rede", "Acesso"));
        mvc.perform(put("/categorias/1").contentType(MediaType.APPLICATION_JSON).content(VALIDO))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(1));
        mvc.perform(delete("/categorias/1")).andExpect(status().isNoContent()).andExpect(content().string(""));
        verify(service).excluir(1L);
    }
}
