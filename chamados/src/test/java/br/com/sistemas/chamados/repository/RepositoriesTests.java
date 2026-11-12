package br.com.sistemas.chamados.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import br.com.sistemas.chamados.entity.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

@DataJpaTest
class RepositoriesTests {
    @Autowired ClienteRepository clientes;
    @Autowired CategoriaRepository categorias;
    @Autowired TecnicoRepository tecnicos;
    @Autowired ChamadoRepository chamados;
    @Autowired ComentarioRepository comentarios;
    @Autowired TestEntityManager manager;

    @Test
    void salvaClienteEConsultaEmailExcluindoProprioId() {
        Cliente cliente = clientes.saveAndFlush(new Cliente("Ana", "ana@exemplo.com", "47999999999"));
        assertThat(clientes.existsByEmail("ana@exemplo.com")).isTrue();
        assertThat(clientes.existsByEmailAndIdNot("ana@exemplo.com", cliente.getId())).isFalse();
        assertThat(clientes.existsByEmailAndIdNot("ana@exemplo.com", 999L)).isTrue();
    }

    @Test
    void bancoRejeitaEmailDuplicadoDeCliente() {
        clientes.saveAndFlush(new Cliente("Ana", "ana@exemplo.com", null));
        assertThatThrownBy(() -> clientes.saveAndFlush(new Cliente("Outra", "ana@exemplo.com", null)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void consultaCategoriaSemDiferenciarMaiusculas() {
        Categoria categoria = categorias.saveAndFlush(new Categoria("Rede", "Acesso"));
        assertThat(categorias.existsByNomeIgnoreCase("REDE")).isTrue();
        assertThat(categorias.existsByNomeIgnoreCaseAndIdNot("rede", categoria.getId())).isFalse();
        assertThat(categorias.existsByNomeIgnoreCaseAndIdNot("rede", 999L)).isTrue();
    }

    @Test
    void bancoRejeitaNomeDuplicadoDeCategoria() {
        categorias.saveAndFlush(new Categoria("Rede", null));
        assertThatThrownBy(() -> categorias.saveAndFlush(new Categoria("Rede", "Outra")))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void perfilDoTecnicoFicaSalvoComoTexto() {
        Tecnico tecnico = tecnicos.saveAndFlush(new Tecnico("Joao", "joao@exemplo.com", Perfil.ADMIN));
        Object perfil = manager.getEntityManager().createNativeQuery("select perfil from tecnicos where id = :id")
                .setParameter("id", tecnico.getId()).getSingleResult();
        assertThat(perfil).isEqualTo("ADMIN");
        assertThat(tecnicos.existsByEmailAndIdNot("joao@exemplo.com", tecnico.getId())).isFalse();
    }

    @Test
    void bancoRejeitaEmailDuplicadoDeTecnico() {
        tecnicos.saveAndFlush(new Tecnico("Joao", "joao@exemplo.com", Perfil.TECNICO));
        assertThatThrownBy(() -> tecnicos.saveAndFlush(new Tecnico("Outro", "joao@exemplo.com", Perfil.ADMIN)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void persisteChamadoComDatasEnumsERelacionamentos() {
        Cliente cliente = clientes.save(new Cliente("Ana", "ana@exemplo.com", null));
        Categoria categoria = categorias.save(new Categoria("Rede", null));
        Tecnico tecnico = tecnicos.save(new Tecnico("Joao", "joao@exemplo.com", Perfil.TECNICO));
        Chamado salvo = chamados.saveAndFlush(new Chamado("Sem internet", "Rede indisponivel", Prioridade.ALTA,
                cliente, categoria, tecnico));
        manager.clear();
        Chamado encontrado = chamados.findById(salvo.getId()).orElseThrow();
        assertThat(encontrado.getStatus()).isEqualTo(StatusChamado.ABERTO);
        assertThat(encontrado.getDataAbertura()).isNotNull();
        assertThat(encontrado.getDataFechamento()).isNull();
        assertThat(encontrado.getCliente().getEmail()).isEqualTo("ana@exemplo.com");
        assertThat(encontrado.getCategoria().getNome()).isEqualTo("Rede");
        assertThat(encontrado.getTecnico().getId()).isEqualTo(tecnico.getId());
        Object prioridade = manager.getEntityManager().createNativeQuery("select prioridade from chamados where id = :id")
                .setParameter("id", salvo.getId()).getSingleResult();
        assertThat(prioridade).isEqualTo("ALTA");
    }

    @Test
    void combinaFiltrosComPaginacaoEOrdenacao() {
        Cliente cliente = clientes.save(new Cliente("Ana", "ana@exemplo.com", null));
        Categoria categoria = categorias.save(new Categoria("Rede", null));
        chamados.save(new Chamado("A", "Descricao", Prioridade.ALTA, cliente, categoria, null));
        chamados.save(new Chamado("B", "Descricao", Prioridade.ALTA, cliente, categoria, null));
        chamados.save(new Chamado("C", "Descricao", Prioridade.BAIXA, cliente, categoria, null));
        Specification<Chamado> filtro = (raiz, consulta, builder) -> builder.and(
                builder.equal(raiz.get("cliente").get("id"), cliente.getId()),
                builder.equal(raiz.get("prioridade"), Prioridade.ALTA),
                builder.equal(raiz.get("status"), StatusChamado.ABERTO));
        var pagina = chamados.findAll(filtro, PageRequest.of(1, 1, Sort.by("titulo").descending()));
        assertThat(pagina.getTotalElements()).isEqualTo(2);
        assertThat(pagina.getTotalPages()).isEqualTo(2);
        assertThat(pagina.getContent()).extracting(Chamado::getTitulo).containsExactly("A");
    }

    @Test
    void comentarioPertenceAoChamadoEListaEmOrdem() {
        Cliente cliente = clientes.save(new Cliente("Ana", "ana@exemplo.com", null));
        Categoria categoria = categorias.save(new Categoria("Rede", null));
        Chamado primeiro = chamados.save(new Chamado("A", "Descricao", Prioridade.MEDIA, cliente, categoria, null));
        Chamado segundo = chamados.save(new Chamado("B", "Descricao", Prioridade.MEDIA, cliente, categoria, null));
        comentarios.save(new Comentario("Primeiro", "Ana", primeiro));
        comentarios.save(new Comentario("Segundo", "Joao", primeiro));
        comentarios.saveAndFlush(new Comentario("Outro chamado", "Ana", segundo));
        manager.clear();
        var lista = comentarios.findByChamadoIdOrderByDataAscIdAsc(primeiro.getId());
        assertThat(lista).extracting(Comentario::getTexto).containsExactly("Primeiro", "Segundo");
        assertThat(lista.getFirst().getData()).isNotNull();
        assertThat(lista.getFirst().getChamado().getId()).isEqualTo(primeiro.getId());
    }

    @Test
    void chaveEstrangeiraProtegeClienteComChamado() {
        Cliente cliente = clientes.save(new Cliente("Ana", "ana@exemplo.com", null));
        Categoria categoria = categorias.save(new Categoria("Rede", null));
        chamados.saveAndFlush(new Chamado("A", "Descricao", Prioridade.ALTA, cliente, categoria, null));
        manager.clear();
        assertThatThrownBy(() -> { clientes.deleteById(cliente.getId()); clientes.flush(); })
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
