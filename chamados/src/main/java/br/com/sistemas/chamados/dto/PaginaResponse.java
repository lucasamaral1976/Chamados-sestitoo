package br.com.sistemas.chamados.dto;

import java.util.List;
import org.springframework.data.domain.Page;

public record PaginaResponse<T>(List<T> content, int page, int size,
        long totalElements, int totalPages, boolean last) {
    public static <T> PaginaResponse<T> de(Page<T> pagina) {
        return new PaginaResponse<>(pagina.getContent(), pagina.getNumber(), pagina.getSize(),
                pagina.getTotalElements(), pagina.getTotalPages(), pagina.isLast());
    }
}
