package br.com.sistemas.chamados.service;

import java.util.List;
import br.com.sistemas.chamados.dto.ComentarioRequest;
import br.com.sistemas.chamados.dto.ComentarioResponse;
import br.com.sistemas.chamados.entity.Chamado;
import br.com.sistemas.chamados.entity.Comentario;
import br.com.sistemas.chamados.repository.ComentarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ComentarioService {
    private final ComentarioRepository repository;
    private final ChamadoService chamados;

    public ComentarioService(ComentarioRepository repository, ChamadoService chamados) {
        this.repository = repository;
        this.chamados = chamados;
    }

    @Transactional
    public ComentarioResponse criar(Long chamadoId, ComentarioRequest dto) {
        Chamado chamado = chamados.buscarEntity(chamadoId);
        chamados.garantirAberto(chamado);
        return ComentarioResponse.de(repository.save(new Comentario(dto.texto(), dto.autor(), chamado)));
    }

    @Transactional(readOnly = true)
    public List<ComentarioResponse> listar(Long chamadoId) {
        chamados.buscarEntity(chamadoId);
        return repository.findByChamadoIdOrderByDataAscIdAsc(chamadoId).stream()
                .map(ComentarioResponse::de).toList();
    }
}
