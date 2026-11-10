package br.com.sistemas.chamados.service;

import java.util.Set;
import br.com.sistemas.chamados.dto.ChamadoRequest;
import br.com.sistemas.chamados.dto.ChamadoResponse;
import br.com.sistemas.chamados.dto.PaginaResponse;
import br.com.sistemas.chamados.entity.Chamado;
import br.com.sistemas.chamados.entity.Cliente;
import br.com.sistemas.chamados.entity.Categoria;
import br.com.sistemas.chamados.entity.Tecnico;
import br.com.sistemas.chamados.entity.Prioridade;
import br.com.sistemas.chamados.entity.StatusChamado;
import br.com.sistemas.chamados.exception.ChamadoFechadoException;
import br.com.sistemas.chamados.exception.ParametroInvalidoException;
import br.com.sistemas.chamados.exception.RecursoNaoEncontradoException;
import br.com.sistemas.chamados.exception.RegraNegocioException;
import br.com.sistemas.chamados.repository.ChamadoRepository;
import br.com.sistemas.chamados.repository.ClienteRepository;
import br.com.sistemas.chamados.repository.CategoriaRepository;
import br.com.sistemas.chamados.repository.TecnicoRepository;
import br.com.sistemas.chamados.repository.ComentarioRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ChamadoService {
    private final ChamadoRepository repository;
    private final ClienteRepository clientes;
    private final CategoriaRepository categorias;
    private final TecnicoRepository tecnicos;
    private final ComentarioRepository comentarios;

    public ChamadoService(ChamadoRepository repository, ClienteRepository clientes,
            CategoriaRepository categorias, TecnicoRepository tecnicos, ComentarioRepository comentarios) {
        this.repository = repository;
        this.clientes = clientes;
        this.categorias = categorias;
        this.tecnicos = tecnicos;
        this.comentarios = comentarios;
    }

    @Transactional
    public ChamadoResponse criar(ChamadoRequest dto) {
        Chamado chamado = new Chamado(dto.titulo(), dto.descricao(), dto.prioridade(),
                buscarCliente(dto.clienteId()), buscarCategoria(dto.categoriaId()), buscarTecnicoOpcional(dto.tecnicoId()));
        return ChamadoResponse.de(repository.save(chamado));
    }

    @Transactional(readOnly = true)
    public ChamadoResponse buscar(Long id) {
        return ChamadoResponse.de(buscarEntity(id));
    }

    @Transactional(readOnly = true)
    public PaginaResponse<ChamadoResponse> listar(StatusChamado status, Prioridade prioridade,
            Long clienteId, Pageable pageable) {
        Set<String> campos = Set.of("id", "titulo", "dataAbertura", "dataFechamento", "prioridade", "status");
        if (pageable.getSort().stream().anyMatch(ordem -> !campos.contains(ordem.getProperty()))) {
            throw new ParametroInvalidoException("Campo de ordenação inválido");
        }
        Specification<Chamado> filtro = (raiz, consulta, builder) -> builder.conjunction();
        if (status != null) {
            filtro = filtro.and((raiz, consulta, builder) -> builder.equal(raiz.get("status"), status));
        }
        if (prioridade != null) {
            filtro = filtro.and((raiz, consulta, builder) -> builder.equal(raiz.get("prioridade"), prioridade));
        }
        if (clienteId != null) {
            if (clienteId <= 0) {
                throw new ParametroInvalidoException("Cliente deve ter ID positivo");
            }
            filtro = filtro.and((raiz, consulta, builder) -> builder.equal(raiz.get("cliente").get("id"), clienteId));
        }
        return PaginaResponse.de(repository.findAll(filtro, pageable).map(ChamadoResponse::de));
    }

    @Transactional(readOnly = true)
    public PaginaResponse<ChamadoResponse> listarPorCliente(Long clienteId, Pageable pageable) {
        buscarCliente(clienteId);
        return listar(null, null, clienteId, pageable);
    }

    @Transactional
    public ChamadoResponse atualizar(Long id, ChamadoRequest dto) {
        Chamado chamado = buscarEntity(id);
        garantirAberto(chamado);
        chamado.setCliente(buscarCliente(dto.clienteId()));
        chamado.setCategoria(buscarCategoria(dto.categoriaId()));
        chamado.setTecnico(buscarTecnicoOpcional(dto.tecnicoId()));
        chamado.setTitulo(dto.titulo());
        chamado.setDescricao(dto.descricao());
        chamado.setPrioridade(dto.prioridade());
        return ChamadoResponse.de(chamado);
    }

    @Transactional
    public ChamadoResponse atribuir(Long id, Long tecnicoId) {
        Chamado chamado = buscarEntity(id);
        garantirAberto(chamado);
        chamado.setTecnico(buscarTecnicoOpcional(tecnicoId));
        return ChamadoResponse.de(chamado);
    }

    @Transactional
    public ChamadoResponse alterarStatus(Long id, StatusChamado status) {
        Chamado chamado = buscarEntity(id);
        garantirAberto(chamado);
        if (chamado.getStatus() == status) {
            throw new RegraNegocioException("Chamado já está com o status " + status);
        }
        chamado.alterarStatus(status);
        return ChamadoResponse.de(chamado);
    }

    @Transactional
    public void excluir(Long id) {
        Chamado chamado = buscarEntity(id);
        garantirAberto(chamado);
        comentarios.deleteByChamadoId(id);
        repository.delete(chamado);
    }

    public Chamado buscarEntity(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Chamado " + id + " não encontrado"));
    }

    public void garantirAberto(Chamado chamado) {
        if (chamado.getStatus() == StatusChamado.FECHADO) {
            throw new ChamadoFechadoException(chamado.getId());
        }
    }

    private Cliente buscarCliente(Long id) {
        return clientes.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Cliente " + id + " não encontrado"));
    }

    private Categoria buscarCategoria(Long id) {
        return categorias.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Categoria " + id + " não encontrada"));
    }

    private Tecnico buscarTecnicoOpcional(Long id) {
        if (id == null) { return null; }
        return tecnicos.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Técnico " + id + " não encontrado"));
    }
}
