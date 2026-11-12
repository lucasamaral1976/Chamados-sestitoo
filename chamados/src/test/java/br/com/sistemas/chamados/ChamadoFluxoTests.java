package br.com.sistemas.chamados;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import br.com.sistemas.chamados.dto.ChamadoRequest;
import br.com.sistemas.chamados.entity.*;
import br.com.sistemas.chamados.repository.*;
import br.com.sistemas.chamados.service.ChamadoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ChamadoFluxoTests {
    @Autowired MockMvc mvc;
    @Autowired ChamadoService service;
    @Autowired ChamadoRepository chamados;
    @Autowired ClienteRepository clientes;
    @Autowired CategoriaRepository categorias;
    @Autowired TecnicoRepository tecnicos;
    @Autowired ComentarioRepository comentarios;
    Cliente cliente;
    Categoria categoria;
    Tecnico tecnico;

    @BeforeEach
    void preparar() {
        cliente = clientes.save(new Cliente("Ana", "ana@exemplo.com", null));
        categoria = categorias.save(new Categoria("Rede", "Acesso"));
        tecnico = tecnicos.save(new Tecnico("Joao", "joao@exemplo.com", Perfil.TECNICO));
    }

    private Chamado criar(String titulo, Prioridade prioridade) {
        return chamados.saveAndFlush(new Chamado(titulo, "Descricao", prioridade, cliente, categoria, null));
    }

    private String json(String titulo) {
        return """
                {"titulo":"%s","descricao":"Descricao","prioridade":"ALTA","clienteId":%d,"categoriaId":%d}
                """.formatted(titulo, cliente.getId(), categoria.getId());
    }

    @Test
    void criacaoDefineStatusEDataAutomaticamente() throws Exception {
        String body = json("Sem internet").strip().replace("}",
                ",\"status\":\"FECHADO\",\"dataAbertura\":\"2000-01-01T00:00:00\"}");
        mvc.perform(post("/chamados").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("ABERTO"))
                .andExpect(jsonPath("$.dataAbertura").exists()).andExpect(jsonPath("$.dataFechamento").isEmpty())
                .andExpect(jsonPath("$.tecnicoId").isEmpty());
        assertThat(chamados.findAll().getFirst().getDataAbertura().getYear()).isGreaterThan(2000);
    }

    @Test
    void atualizaBuscaEExcluiChamadoComComentarios() throws Exception {
        Chamado chamado = criar("Sem internet", Prioridade.ALTA);
        comentarios.saveAndFlush(new Comentario("Teste", "Ana", chamado));
        String rota = "/chamados/" + chamado.getId();
        mvc.perform(put(rota).contentType(MediaType.APPLICATION_JSON).content(json("Resolucao em andamento")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.titulo").value("Resolucao em andamento"));
        mvc.perform(get(rota)).andExpect(status().isOk()).andExpect(jsonPath("$.titulo").value("Resolucao em andamento"));
        mvc.perform(delete(rota)).andExpect(status().isNoContent()).andExpect(content().string(""));
        chamados.flush();
        assertThat(comentarios.findByChamadoIdOrderByDataAscIdAsc(chamado.getId())).isEmpty();
        mvc.perform(get(rota)).andExpect(status().isNotFound());
    }

    @ParameterizedTest
    @ValueSource(strings = {"clienteId", "categoriaId", "tecnicoId"})
    void rejeitaRelacionamentoInexistente(String campo) throws Exception {
        String body = json("Teste");
        if (campo.equals("tecnicoId")) {
            body = body.strip().replace("}", ",\"tecnicoId\":999999999}");
        } else {
            long atual = campo.equals("clienteId") ? cliente.getId() : categoria.getId();
            body = body.replace("\"" + campo + "\":" + atual, "\"" + campo + "\":999999999");
        }
        mvc.perform(post("/chamados").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.status").value(404));
        assertThat(chamados.count()).isZero();
    }

    @Test
    void atribuiTecnicoEPreservaAtribuicaoQuandoOutroNaoExiste() throws Exception {
        Chamado chamado = criar("Teste", Prioridade.ALTA);
        String rota = "/chamados/" + chamado.getId() + "/atribuir";
        mvc.perform(patch(rota).contentType(MediaType.APPLICATION_JSON)
                .content("{\"tecnicoId\":" + tecnico.getId() + "}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.tecnicoId").value(tecnico.getId().intValue()));
        mvc.perform(patch(rota).contentType(MediaType.APPLICATION_JSON).content("{\"tecnicoId\":999999999}"))
                .andExpect(status().isNotFound());
        assertThat(chamados.findById(chamado.getId()).orElseThrow().getTecnico().getId()).isEqualTo(tecnico.getId());
    }

    @Test
    void percorreStatusEPreencheFechamento() throws Exception {
        Chamado chamado = criar("Teste", Prioridade.ALTA);
        String rota = "/chamados/" + chamado.getId() + "/status";
        for (String estado : new String[] {"EM_ATENDIMENTO", "AGUARDANDO_CLIENTE", "FECHADO"}) {
            mvc.perform(patch(rota).contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"" + estado + "\"}"))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.status").value(estado));
        }
        Chamado fechado = chamados.findById(chamado.getId()).orElseThrow();
        assertThat(fechado.getDataFechamento()).isNotNull().isAfterOrEqualTo(fechado.getDataAbertura());
    }

    @ParameterizedTest
    @ValueSource(strings = {"PUT", "ATRIBUIR", "STATUS", "COMENTARIO", "DELETE"})
    void fechadoNaoAceitaAlteracoes(String operacao) throws Exception {
        Chamado chamado = criar("Original", Prioridade.ALTA);
        chamado.alterarStatus(StatusChamado.FECHADO);
        chamados.flush();
        var fechamento = chamado.getDataFechamento();
        String rota = "/chamados/" + chamado.getId();
        var requisicao = switch (operacao) {
            case "PUT" -> put(rota).content(json("Alterado"));
            case "ATRIBUIR" -> patch(rota + "/atribuir").content("{\"tecnicoId\":" + tecnico.getId() + "}");
            case "STATUS" -> patch(rota + "/status").content("{\"status\":\"ABERTO\"}");
            case "COMENTARIO" -> post(rota + "/comentarios").content("{\"texto\":\"Teste\",\"autor\":\"Ana\"}");
            default -> delete(rota);
        };
        mvc.perform(requisicao.contentType(MediaType.APPLICATION_JSON)).andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));
        assertThat(chamados.findById(chamado.getId()).orElseThrow().getTitulo()).isEqualTo("Original");
        assertThat(chamado.getDataFechamento()).isEqualTo(fechamento);
        assertThat(comentarios.count()).isZero();
    }

    @Test
    void statusRepetidoERejeitado() throws Exception {
        Chamado chamado = criar("Teste", Prioridade.ALTA);
        mvc.perform(patch("/chamados/" + chamado.getId() + "/status").contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"ABERTO\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void filtrosCombinadosPaginacaoEOrdenacaoFuncionam() throws Exception {
        criar("B", Prioridade.ALTA);
        criar("A", Prioridade.ALTA);
        criar("Baixa", Prioridade.BAIXA);
        Chamado fechado = criar("Fechado", Prioridade.ALTA);
        fechado.alterarStatus(StatusChamado.FECHADO);
        Cliente outro = clientes.save(new Cliente("Outro", "outro@exemplo.com", null));
        chamados.saveAndFlush(new Chamado("Outro cliente", "Descricao", Prioridade.ALTA, outro, categoria, null));
        mvc.perform(get("/chamados").param("status", "ABERTO").param("prioridade", "ALTA")
                .param("clienteId", cliente.getId().toString()).param("page", "1").param("size", "1").param("sort", "titulo,asc"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.totalPages").value(2)).andExpect(jsonPath("$.content[0].titulo").value("B"))
                .andExpect(jsonPath("$.page").value(1));
        mvc.perform(get("/clientes/" + cliente.getId() + "/chamados"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(4));
        mvc.perform(get("/clientes/999999999/chamados")).andExpect(status().isNotFound());
    }

    @Test
    void comentarioTemDataAutorEVinculoCorretos() throws Exception {
        Chamado chamado = criar("Teste", Prioridade.MEDIA);
        String rota = "/chamados/" + chamado.getId() + "/comentarios";
        mvc.perform(post(rota).contentType(MediaType.APPLICATION_JSON).content("{\"texto\":\"Verificando\",\"autor\":\"Joao\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.data").exists())
                .andExpect(jsonPath("$.autor").value("Joao")).andExpect(jsonPath("$.chamadoId").value(chamado.getId().intValue()));
        mvc.perform(get(rota)).andExpect(status().isOk()).andExpect(jsonPath("$[0].texto").value("Verificando"));
        mvc.perform(post(rota).contentType(MediaType.APPLICATION_JSON).content("{\"texto\":\"\",\"autor\":\"\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/chamados/999999999/comentarios")).andExpect(status().isNotFound());
    }

    @Test
    void documentacaoOpenApiIncluiNovasRotas() throws Exception {
        mvc.perform(get("/v3/api-docs")).andExpect(status().isOk())
                .andExpect(jsonPath("$.info.title").value("Sistema de chamados"))
                .andExpect(jsonPath("$.paths['/chamados'].post.responses['201']").exists())
                .andExpect(jsonPath("$.paths['/chamados/{id}'].delete.responses['204']").exists())
                .andExpect(jsonPath("$.paths['/chamados/{id}/atribuir'].patch").exists())
                .andExpect(jsonPath("$.paths['/chamados/{id}/status'].patch").exists())
                .andExpect(jsonPath("$.paths['/chamados/{chamadoId}/comentarios'].post").exists());
    }

    @ParameterizedTest
    @ValueSource(strings = {"status=INVALIDO", "prioridade=INVALIDA", "sort=inexistente,asc", "clienteId=-1"})
    void filtroInvalidoRetorna400(String filtro) throws Exception {
        mvc.perform(get("/chamados?" + filtro)).andExpect(status().isBadRequest());
    }
}
